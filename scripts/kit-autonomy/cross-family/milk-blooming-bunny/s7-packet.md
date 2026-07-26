

========== SECTION 1 — RECONCILING JUDGE CONTRACT (your role + return JSON shape) ==========

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


========== SECTION 2a — MECHANICS SSOT: docs/data/damage-calculation.md ==========

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


========== SECTION 2b — MECHANICS SSOT: docs/data/game-mechanics.md ==========

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


========== SECTION 3 — GROUND TRUTH: kit prose + base stats (data/characters.json extract) ==========

{
  "slug": "milk-blooming-bunny",
  "name": "Milk: Blooming Bunny",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/ni-69/ww-29/ec85f7f48e93d1ac37adfd0348097ea9.png",
  "weapon": "SR",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Iron",
  "manufacturer": "Tetra",
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "rl3": 8.4,
  "burstGaugePerShot": 2.8,
  "treasure": false,
  "nicknames": [
    "mbb",
    "bmilk"
  ],
  "skills": {
    "skill1": "■ Activates when performing a Full Charge attack. Affects self.\nGain Pierce for 6 sec.\n■ Activates when not in the Embarrassment state and when Full Charge lasts for 0.5 sec or more. Affects self.\nEmbarrassment\nFunction: Forcefully reloads at reduced reload speed, but increases attack capabilities and deals Distributed Damage.\nEffect 1: Affects all enemies. Deals 290% of final ATK as Distributed Damage.\nEffect 2: Affects self. Removes 100% of ammo.\nEffect 3: Affects self. Reload speed is fixed at a 50% reduction for 1 reload(s).\nEffect 4: Affects self. Forced Reload.\nEffect 5: Affects self. ATK ▲ 118.7% for 40 sec.",
    "skill2": "■ Activates only when in Embarrassment status. Affects self.\nPierce Damage ▲ 64.7% continuously.\n■ Activates only when in Overconfident, Huh?! status. Affects all enemies every 2 sec. \nDeals 447.7% of final ATK as Distributed Damage.",
    "burst": "■ Affects self.\nOverconfident, Huh?!:\nGains Immunity to Embarrassment for 10 sec.\nPierce Damage ▲ 117.64% for 10 sec.\nATK ▲ 220% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1014301,
      "shot_detail": {
        "id": 1014301,
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
      "skill1_id": 2143101,
      "skill2_id": 2143201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2143101,
        "icon": "icn_skill_atkup_01",
        "group_id": 21431,
        "skill_level": 1,
        "name_localkey": "Embarrassment Suppression",
        "next_level_id": 2143102,
        "level_up_cost_id": 50102,
        "description_localkey": "■ Activates when performing a Full Charge attack. Affects self.\n<color=#00AEFF>Gain Pierce for {description_value_01} sec.</color>\n■ Activates when not in the Embarrassment state and when Full Charge lasts for {description_value_07} sec or more. Affects self.\n<color=#00AEFF>Embarrassment\nFunction: <word_group=10087>Forcefully reloads</word_group> at reduced reload speed, but increases attack capabilities and deals <word_group=10019>Distributed Damage</word_group>.\nEffect 1: Affects all enemies. Deals {description_value_02}% of <word_group=10025>final</word_group> ATK as <word_group=10019>Distributed Damage</word_group>.\nEffect 2: Affects self. Removes {description_value_08}% of ammo.\nEffect 3: Affects self. Reload speed is fixed at a {description_value_03}% reduction for <word_group=10088>{description_value_04} reload(s)</word_group>.\nEffect 4: Affects self. <word_group=10087>Forced Reload</word_group>.\nEffect 5: Affects self. ATK ▲ {description_value_05}% for {description_value_06} sec.</color>",
        "description_value_list": [
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
              "171.36",
              "184.55",
              "197.73",
              "210.91",
              "224.09",
              "237.28",
              "250.46",
              "263.64",
              "276.82",
              "290"
            ]
          },
          {
            "description_value": [
              "50",
              "50",
              "50",
              "50",
              "50",
              "50",
              "50",
              "50",
              "50",
              "50"
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
          {
            "description_value": [
              "70.14",
              "75.53",
              "80.93",
              "86.33",
              "91.72",
              "97.12",
              "102.51",
              "107.91",
              "113.3",
              "118.7"
            ]
          },
          {
            "description_value": [
              "40",
              "40",
              "40",
              "40",
              "40",
              "40",
              "40",
              "40",
              "40",
              "40"
            ]
          },
          {
            "description_value": [
              "0.5",
              "0.5",
              "0.5",
              "0.5",
              "0.5",
              "0.5",
              "0.5",
              "0.5",
              "0.5",
              "0.5"
            ]
          },
          {
            "description_value": [
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100"
            ]
          },
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2143201,
        "icon": "icn_skill_penetrationdamage_01",
        "group_id": 21432,
        "skill_level": 1,
        "name_localkey": "Outburst",
        "next_level_id": 2143202,
        "level_up_cost_id": 50202,
        "description_localkey": "■ Activates only when in Embarrassment status. Affects self.\n<color=#00AEFF><word_group=10042>Pierce Damage</word_group> ▲ {description_value_01}% continuously.</color>\n■ Activates only when in Overconfident, Huh?! status. Affects all enemies every 2 sec. \n<color=#00AEFF>Deals {description_value_02}% of <word_group=10025>final</word_group> ATK as <word_group=10019>Distributed Damage</word_group>.</color>",
        "description_value_list": [
          {
            "description_value": [
              "38.23",
              "41.17",
              "44.11",
              "47.05",
              "50",
              "52.94",
              "55.88",
              "58.82",
              "61.76",
              "64.7"
            ]
          },
          {
            "description_value": [
              "264.55",
              "284.9",
              "305.25",
              "325.6",
              "345.95",
              "366.3",
              "386.65",
              "407",
              "427.35",
              "447.7"
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
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1143301,
      "ulti_skill_detail": {
        "id": 1143301,
        "icon": "icn_skill_c143_ult",
        "group_id": 11433,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Iron",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Embarrassment Explosion",
        "next_level_id": 1143302,
        "prefer_target": "Random",
        "resource_name": "c143_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 50302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 1,
            "skill_value_type": "None"
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
        "description_localkey": "■ Affects self.\n<color=#00AEFF>Overconfident, Huh?!:\nGains Immunity to Embarrassment for 10 sec.\n<word_group=10042>Pierce Damage</word_group> ▲ {description_value_01}% for {description_value_02} sec.\nATK ▲ {description_value_03}% for {description_value_04} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "69.51",
              "74.86",
              "80.2",
              "85.55",
              "90.9",
              "96.25",
              "101.59",
              "106.94",
              "112.29",
              "117.64"
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
              "130",
              "140",
              "150",
              "160",
              "170",
              "180",
              "190",
              "200",
              "210",
              "220"
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
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          114330101,
          114330102,
          114330103
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
      "grow_grade": 314302,
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
      "piece_id": 5100143,
      "piece_detail": {
        "id": 5100143,
        "class": "Attacker",
        "order": 14300,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "TETRA",
        "resource_id": 143,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Milk: Blooming Bunny's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 314301,
      "class": "Attacker",
      "order": 10131,
      "name_code": 5150,
      "corporation": "TETRA",
      "resource_id": 143,
      "name_localkey": "Milk: Blooming Bunny",
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
    "resourceId": 143
  }
}

========== SECTION 4 — S2b CROSS-FAMILY TEST REVIEW (claude-fable-5) ==========

{
  "slug": "milk-blooming-bunny",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ Full Charge attack → Gain Pierce 6 sec",
      "disposition": "FAITHFUL",
      "scope": "full-charge shots only; SR (chargeFrames 60) presumably always full-charges in sim, so effectively per shot",
      "durationSemantics": "6 s wall-clock, refreshed per full-charge attack",
      "triggerIdentity": "per-full-charge (chargeCounter count:1, or shotFired if the sim treats every SR pull as a full charge); no gate",
      "targetSet": "self",
      "nearestWrongModel": "top-level hasPierce:true whole-fight boolean instead of a gainPierce effect with durationSec:6 — pierce-tags her from t=0 and through any window where 6 s could lapse (e.g. the Embarrassment slowed forced reload + recharge)",
      "distinguishingAssertion": "withPatchedOverride removing ONLY this gainPierce effect must make ALL Pierce Damage ▲ lines (64.7 / 117.64) damage-inert (totals unchanged when they are zeroed on the patched run); with it present they move damage. Encoding check: effect kind 'gainPierce' with durationSec 6, not hasPierce:true",
      "inertness": "must not pierce-tag the 290%/447.7% distributed riders — only her weapon attacks",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ not Embarrassed + Full Charge ≥0.5 sec",
      "disposition": "GAP",
      "scope": "fires on a full charge HELD ≥0.5 s, only while NOT already in the Embarrassment state — a self-status-gated hold-time trigger with no TriggerDef primitive",
      "durationSemantics": "gate lifetime = the Embarrassment state duration, which is NOT stated in the prose (⚑ — plausibly 40 s to match Effect 5, but that is an assumption, not text)",
      "triggerIdentity": "closest encodings: interval sec≈EmbarrassmentDuration (cycle approximation), or per-charge trigger + a self-status gate the schema lacks. Cadence tuple is an ALWAYS-⚑",
      "targetSet": "self (package application); Effect 1 targets enemy",
      "nearestWrongModel": "firing on EVERY full charge (ignoring the not-in-state gate) — multiplies the 290% hit, the ammo dump, and ATK-buff refreshes by ~10-40×; the opposite failure is never firing because the sim never models a 0.5 s hold",
      "distinguishingAssertion": "290-mult damage events are spaced ≥ EmbarrassmentDuration apart (≈1 per cycle over the fight), NOT one per shot; and at least one occurs (the cycle is live)",
      "inertness": "must not fire during the burst's 10 s immunity window; must not fire while the state is already up",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Effect 1: 290% final ATK Distributed Damage",
      "disposition": "FAITHFUL",
      "scope": "instant rider on Embarrassment entry; single boss so the full 290% lands",
      "durationSemantics": "instant, once per Embarrassment activation",
      "triggerIdentity": "rides the Embarrassment block trigger; FB bonus by landing timing (default ON per rider rule); no core; crit at caster rate",
      "targetSet": "enemy (all enemies)",
      "nearestWrongModel": "pierce-tagging the rider so Pierce Damage ▲ (64.7/117.64) boosts it, or encoding as a dot; both over-credit",
      "distinguishingAssertion": "damage event with mult 290, flavor distributed, exactly once per Embarrassment cycle; zeroing all pierceDamagePct in a patched override leaves this event's damage unchanged",
      "inertness": "unaffected by Pierce Damage ▲ buffs; no core bucket",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Effect 2+4: Removes 100% ammo; Forced Reload",
      "disposition": "FAITHFUL",
      "scope": "empties her own 6-round magazine and forces an immediate reload — a shot-count COST, not defensive fluff (taxonomy 6)",
      "durationSemantics": "instant",
      "triggerIdentity": "rides the Embarrassment trigger; consumeAmmo{fraction:1} inherently forces the reload and fires lastBullet triggers",
      "targetSet": "self",
      "nearestWrongModel": "instantReload (sign flip: a free refill BUFF instead of losing the remaining magazine), or dropping both effects as damage-irrelevant",
      "distinguishingAssertion": "a reload event follows each Embarrassment activation regardless of ammo remaining; total shots fired is LOWER than a patched run with the consumeAmmo effect removed",
      "inertness": "must not refill ammo for free; must not skip the reload cost",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Effect 3: reload fixed −50% for 1 reload(s)",
      "disposition": "FIX",
      "scope": "the ONE forced reload only — a stat CLAMP for a reload-count window (asuka-wille-class primitive gap); approximate as reloadSpeedPct −50 scoped to exactly that reload",
      "durationSemantics": "\"for 1 reload(s)\" is a RELOAD COUNT, never durationSec; expires when that reload completes",
      "triggerIdentity": "rides the Embarrassment trigger",
      "targetSet": "self",
      "nearestWrongModel": "durationSec:40 (or permanent) reloadSpeedPct −50 slowing ALL reloads in the cycle, or skipping it as 'defensive, no damage' — it gates shots fired",
      "distinguishingAssertion": "the Embarrassment forced reload spans ≈2× base reloadFrames (≈282 f vs 141 f); every subsequent NATURAL reload in the same cycle spans base 141 f",
      "inertness": "must not slow reloads after the first post-trigger reload",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Effect 5: ATK ▲ 118.7% for 40 sec",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK buff",
      "durationSemantics": "40 s wall-clock, refreshed per Embarrassment activation; single stack",
      "triggerIdentity": "rides the Embarrassment trigger",
      "targetSet": "self",
      "nearestWrongModel": "stacking instances if the trigger over-fires, or tying its lifetime to the status (purged by burst immunity) — the 40 s is its own clock, independent of the state",
      "distinguishingAssertion": "buffApply stat atkPct value 118.7, expiresFrame = apply+40 s, at most 1 stack; re-applies at the Embarrassment cadence, not per shot",
      "inertness": "not team-wide; not removed early by the burst window",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ only in Embarrassment: Pierce Dmg ▲64.7%",
      "disposition": "FIX",
      "scope": "STATUS-GATED — live only while the Embarrassment state holds, 'continuously' = for the state's lifetime, not a fixed timer of its own",
      "durationSemantics": "state-linked (⚑ same unstated Embarrassment duration as the gate line); NOT permanent",
      "triggerIdentity": "applied with Embarrassment entry, dropped at state end",
      "targetSet": "self",
      "nearestWrongModel": "unconditional passive pierceDamagePct 64.7 — live at t=0 before the first Embarrassment and (if immunity purges the state) through the burst window",
      "distinguishingAssertion": "no buffApply with stat pierceDamagePct value 64.7 at frame 0; first application coincides with the first Embarrassment trigger",
      "inertness": "moves damage ONLY while her attacks are pierce-tagged (S1 gainPierce feed); must not boost the distributed riders",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ only in Overconfident: 447.7% every 2 sec",
      "disposition": "FAITHFUL",
      "scope": "ticks only during the 10 s Overconfident, Huh?! window opened by HER OWN burst",
      "durationSemantics": "10 s window, 2 s interval → 5 ticks per own burst (first tick at t=+2 s by interval convention, ⚑ phase)",
      "triggerIdentity": "burstCast-keyed dot {atkPct:447.7, intervalSec:2, durationSec:10, flavor:'distributed'} — the status comes from her own burst, so burstCast, NEVER fullBurstEnter",
      "targetSet": "enemy (all enemies)",
      "nearestWrongModel": "keying to fullBurstEnter — over-credits on every helm-led Full Burst in any 2-B3 comp (controlComp itself has helm as second B3); secondary misreads: a single flatDamage, or 6 ticks via a t=0 first fire",
      "distinguishingAssertion": "447.7-mult damage events appear ONLY inside [cast, cast+10 s] of milk-blooming-bunny's OWN burstCast events, exactly 5 per cast, and ZERO following Full Bursts she did not lead",
      "inertness": "no ticks on rotations where the other B3 bursts; not boosted by Pierce Damage ▲ (untagged rider); never core",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Immunity to Embarrassment for 10 sec",
      "disposition": "MEASUREMENT-GATED",
      "scope": "blocks NEW Embarrassment application for 10 s post-cast; whether it PURGES an active state (dropping the 64.7% mid-window) is not stated — ⚑ needs measurement",
      "durationSemantics": "10 s wall-clock from her cast",
      "triggerIdentity": "burstCast, self",
      "targetSet": "self",
      "nearestWrongModel": "ignoring it, letting Embarrassment fire mid-burst-window — inserts a 290% hit + full ammo dump + slowed reload inside her highest-ATK 10 s and desyncs the whole cycle",
      "distinguishingAssertion": "no 290-mult damage event and no Embarrassment-package buffApply within 10 s after any of her burstCast events",
      "inertness": "must not itself add or remove damage beyond the scheduling gate",
      "evidenceTier": "CALIBRATED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Pierce Damage ▲ 117.64% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "self, her pierce-tagged weapon attacks only",
      "durationSemantics": "10 s wall-clock",
      "triggerIdentity": "burstCast (self mode in her OWN burst block), not fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter keying — applies on helm-led rotations too; or double-counting it onto the distributed riders",
      "distinguishingAssertion": "buffApply stat pierceDamagePct value 117.64 emitted only on rotations where she cast; additive with a concurrent 64.7 (two keys, both live if the state survives the window)",
      "inertness": "zero effect on any window where her pierce tag has lapsed; never applied on helm-led FBs",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 220% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK",
      "durationSemantics": "10 s wall-clock",
      "triggerIdentity": "burstCast, self",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter keying (fires on helm's rotations), or treating it as REPLACING the 118.7% instead of stacking additively in the atkPct bucket",
      "distinguishingAssertion": "buffApply stat atkPct value 220 only on her own cast rotations; during her window both 118.7 and 220 are simultaneously live (distinct keys), summing additively",
      "inertness": "no application on Full Bursts she did not lead",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:gainPierce-6s-on-full-charge",
    "skill1:embarrassment-trigger-cadence",
    "skill1:effect1-290pct-distributed",
    "skill1:effect2+4-consumeAmmo-forced-reload",
    "skill1:effect3-reload-clamp-1-reload",
    "skill1:effect5-atk-118.7-40s",
    "skill2:pierce-64.7-while-embarrassed",
    "skill2:447.7-tick-2s-overconfident",
    "burst:pierce-117.64-10s",
    "burst:atk-220-10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Function: Forcefully reloads at reduced reload speed, but increases attack capabilities and deals Distributed Damage. (descriptive header — substance carried by Effects 1-5)"
    ],
    "skill2": [],
    "burst": [
      "Gains Immunity to Embarrassment for 10 sec. (acceptable ONLY if the Embarrassment scheduler provably cannot fire inside her burst window; otherwise it must be a gate)"
    ]
  },
  "notes": "Expected shared-prior misreads, in risk order: (1) burstCast vs fullBurstEnter — the Overconfident tick and BOTH burst self-buffs derive from HER burst; controlComp includes helm as a co-B3, so this divergence is live in the standard fixture, not hypothetical. Every one of those three lines needs an own-cast-only assertion. (2) The Embarrassment STATE DURATION is nowhere in the prose — a driver will likely silently assume 40 s (matching Effect 5). That assumption must be an explicit ⚑ with a recipe, and the 'not in Embarrassment' gate + 0.5 s charge-hold trigger have no primitive, so the cycle cadence is itself an ALWAYS-⚑ (interval approximation). Tests must pin cycle SPACING (≥ state duration apart), not a hardcoded proc count derived from the same assumption. (3) The distributed riders (290 / 447.7) must NOT be pierce-tagged — Pierce Damage ▲ feeds only her weapon attacks via S1's gainPierce; a patched-override inertness check (zero all pierceDamagePct → riders unchanged) distinguishes this. (4) Effects 2-4 are weapon-state DAMAGE effects: consumeAmmo{fraction:1} (never instantReload — sign flip) plus a reload-count-scoped −50% clamp ('for 1 reload(s)' is a count, not seconds; clamp primitive is a known gap — approximation must scope to exactly one reload). (5) Immunity purge-vs-block ambiguity decides whether the 64.7% survives her burst window — measurement-gated; the test should at minimum assert no Embarrassment entry during the 10 s window. Save target: scripts/kit-autonomy/reviews/milk-blooming-bunny.test-review.json (no tools available this run — JSON returned inline).",
  "model": "claude-fable-5"
}


========== SECTION 5 — S5 BLIND TEST (claude-opus-5) + its result vs the DRIVER override ==========

DRIVER NOTE: the blind test was run against the driver's SHIPPED override (default mode = "auto (no Embarrassment)").
Result: 11 PASS / 8 FAIL / 3 SKIP (22 total). The 8 failures are classified by the driver as DESIGN divergences, NOT faithfulness bugs:
  [1-4] the manual Embarrassment package (290% rider, ammo dump, ATK 118.7%) is gated OFF in the default AUTO mode. The blind writer reconstructed a single-mode always-Embarrassment model; it cannot infer the auto/manual mode-split from the prose alone (Embarrassment requires a 0.5s HELD full charge, which auto-play never performs — Prydwen game-knowledge, not in the kit text). A driver probe confirms all 4 assertions HOLD in MANUAL mode.
  [5-6] S2 "Pierce Damage 64.7%" is left UNMODELED by the driver (it is gated on the Embarrassment STATUS, which auto never enters => inert on the default basis). The S2b reviewer concurs it is status-gated/inert-in-auto.
  [7] the dot effect carries no flavor field (engine limitation, documented in the override note); the magnitude 447.7 and 2s/10s cadence ARE asserted correct by this test.
  [8] pierce-removal "touched >= 2 buckets" discrimination granularity; the magnitude/self-scope/10s assertions for Pierce 117.64 PASS.
The 11 PASSES independently confirm the faithful core (gainPierce 6s timed-not-static; pierce package live + self-scoped + cannot-raise-on-removal; 290% rider in skill1; 447.7% per-burst cadence; ATK 220 + Pierce 117.64 self-scoped burstCast 10s; teammates byte-identical under self-buff counterfactuals; riders move only milk).

--- BLIND TEST SOURCE ---
/**
 * milk-blooming-bunny (Milk: Blooming Bunny) - BLIND per-unit kit spec test (S5).
 *
 * Written from the kit prose ALONE: no sight of the driver override, driver tests, or truth file.
 * SR / Iron / Attacker / Burst III, ammo 6, chargeFrames 60 (1.0s full charge), reloadFrames 141.
 *
 * KIT (structural summary, per slot):
 *   skill1-a  on a Full Charge attack, self: Gain Pierce, 6 sec window.
 *   skill1-b  gated on NOT already in Embarrassment + a full charge held >= 0.5s, enters Embarrassment:
 *             e1 all enemies, 290% of final ATK as Distributed Damage
 *             e2 self, removes 100% of ammo
 *             e3 self, reload speed FIXED at -50% for 1 reload   <- stat CLAMP primitive (GAP)
 *             e4 self, Forced Reload
 *             e5 self, ATK up 118.7% for 40 sec
 *   skill2-a  only while in Embarrassment, self: Pierce Damage up 64.7% continuously.
 *   skill2-b  only while in the burst state, all enemies every 2 sec: 447.7% of final ATK, Distributed.
 *   burst     self, 10 sec: Embarrassment immunity, Pierce Damage up 117.64%, ATK up 220%.
 *
 * FIXTURE: controlComp(SLUG, false) - liter (B1) + crown (B2) + milk (B3).
 *   helm is DROPPED on purpose: helm is a second Burst III, so with helm present the number of
 *   rotations milk actually casts on is ambiguous, and every burst-window-gated count assertion below
 *   (5 procs per burst, the 10 sec window) becomes unreadable. As the SOLE B3, milk casts on every
 *   rotation, so the fullBurstStart count == milk burst count. A lone B3 makes ZERO full bursts, so
 *   liter + crown are mandatory.
 *
 * WHY THE ASSERTIONS DISCRIMINATE (nearest-wrong in brackets):
 *   - every counterfactual asserts its own patch matched >0 effects, so a MISSING kit line fails here
 *     instead of silently passing a vacuous comparison [line not modeled at all].
 *   - burst ATK: extending the window 10s -> 40s must strictly ADD damage [duration authored as 40s,
 *     i.e. borrowed from the Embarrassment buff].
 *   - Embarrassment ATK: shrinking 40s -> 10s must strictly REMOVE damage [duration authored as 10s].
 *   - 447.7% rider: structurally must be a 2 sec cadence bounded by the 10 sec burst window, and its
 *     removal must not drop more than ~6 procs per full burst [ungated interval every 2 sec for the
 *     whole fight = ~90 procs].
 *   - 290% rider: removal must drop rider damage by >=1 and <=40 procs over 180s [ungated per-full-
 *     charge entry, which at this cadence is ~125 procs].
 *   - ammo dump: removing consumeAmmo must change the reload economy [weapon-state line skipped as
 *     defensive; reload/ammo lines ARE damage because they gate shot count].
 *   - self-scope: every buffApply carrying a kit magnitude must target milk only [line authored as an
 *     ally/team buff].
 *   - inertness: teammate totals byte-identical under milk-only self-buff counterfactuals.
 *
 * PIERCE NOTE: pierceDamagePct carries a schema comment saying it may be inert in v1, so the two
 * Pierce Damage lines are asserted STRUCTURALLY (buffApply present, self-targeted, right magnitude)
 * and only ONE-SIDED on totals (removal may not RAISE damage). gainPierce (a timed effect) is
 * asserted distinct from the static whole-fight hasPierce flag, which would credit Pierce from t=0,
 * before the first full charge exists.
 *
 * SHAPE NOTE: the packet describes the override file BOTH as slot -> Block[] and as
 * slot -> CharacterSkills{blocks}. slotBlocks() accepts either, so the counterfactuals are
 * layout-agnostic and cannot silently no-op on the file shape.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // driver fix: blind writer emitted '../lib/harness.js' (wrong depth)

const SLUG = 'milk-blooming-bunny';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

/* ---------------- override introspection (file-shape tolerant) ---------------- */

function slotBlocks(ov: any, slot: string): any[] {
  const v = ov?.[slot];
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (Array.isArray(v.blocks)) return v.blocks;
  return [];
}
function allBlocks(ov: any): any[] {
  return SLOTS.flatMap((s) => slotBlocks(ov, s));
}
function allEffects(ov: any): any[] {
  return allBlocks(ov).flatMap((b) =>
    Array.isArray(b?.effects) ? b.effects : [],
  );
}
function effectsOfSlot(ov: any, slot: string): any[] {
  return slotBlocks(ov, slot).flatMap((b) =>
    Array.isArray(b?.effects) ? b.effects : [],
  );
}
function blocksHolding(ov: any, pred: (e: any) => boolean): any[] {
  return allBlocks(ov).filter((b) =>
    (Array.isArray(b?.effects) ? b.effects : []).some(pred),
  );
}

/** deep-clone the COMMITTED override and rewrite every effect through fn (null = drop it). */
function patchEffects(fn: (e: any) => any | null): {
  ov: any;
  touched: number;
} {
  let touched = 0;
  const ov = withPatchedOverride(SLUG, (o: any) => {
    for (const b of allBlocks(o)) {
      if (!Array.isArray(b.effects)) continue;
      const next: any[] = [];
      for (const e of b.effects) {
        const r = fn(e);
        if (r === null) {
          touched += 1;
          continue;
        }
        if (r !== e) touched += 1;
        next.push(r);
      }
      b.effects = next;
    }
  }) as any;
  return { ov, touched };
}

/* ---------------- run harness ---------------- */

type Run = { total: number; all: Record<string, number>; evs: any[]; res: any };

function run(ov?: any): Run {
  const opts: any = controlComp(SLUG, false);
  const evs: any[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      evs.push(ev as any);
    },
  };
  if (ov) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: ov };
  const res = runComp(opts);
  const all = totals(res) as unknown as Record<string, number>;
  return { total: all[SLUG], all, evs, res };
}

const RIDER_SLOTS = new Set(['skill1', 'skill2', 'burst']);
const riderHits = (r: Run) =>
  r.evs.filter((e) => e.kind === 'damage' && RIDER_SLOTS.has(e.srcSlot)).length;
const reloads = (r: Run) => r.evs.filter((e) => e.kind === 'reload').length;
const rotations = (r: Run) =>
  r.evs.filter((e) => e.kind === 'fullBurstStart').length;
const buffApplies = (r: Run, stat: string, value: number) =>
  r.evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value),
  );
const others = (r: Run) =>
  Object.fromEntries(Object.entries(r.all).filter(([k]) => k !== SLUG));

/* ---------------- hoisted runs (each is a full 180s sim) ---------------- */

const OV: any = withPatchedOverride(SLUG, () => {}) as any;

const P_NO_BURST_ATK = patchEffects((e) =>
  e.kind === 'buff' && near(e.value, 220) ? null : e,
);
const P_BURST_ATK_40 = patchEffects((e) =>
  e.kind === 'buff' && near(e.value, 220) ? { ...e, durationSec: 40 } : e,
);
const P_NO_EMB_ATK = patchEffects((e) =>
  e.kind === 'buff' && near(e.value, 118.7) ? null : e,
);
const P_EMB_ATK_10 = patchEffects((e) =>
  e.kind === 'buff' && near(e.value, 118.7) ? { ...e, durationSec: 10 } : e,
);
const P_NO_290 = patchEffects((e) => (near(e.atkPct ?? -1, 290) ? null : e));
const P_NO_447 = patchEffects((e) => (near(e.atkPct ?? -1, 447.7) ? null : e));
const P_NO_AMMO = patchEffects((e) => (e.kind === 'consumeAmmo' ? null : e));
const P_NO_PIERCE_BUFF = patchEffects((e) =>
  e.kind === 'buff' && e.stat === 'pierceDamagePct' ? null : e,
);
const P_NO_GAIN_PIERCE = patchEffects((e) =>
  e.kind === 'gainPierce' ? null : e,
);

const BASE = run();
const NO_BURST_ATK = run(P_NO_BURST_ATK.ov);
const BURST_ATK_40 = run(P_BURST_ATK_40.ov);
const NO_EMB_ATK = run(P_NO_EMB_ATK.ov);
const EMB_ATK_10 = run(P_EMB_ATK_10.ov);
const NO_290 = run(P_NO_290.ov);
const NO_447 = run(P_NO_447.ov);
const NO_AMMO = run(P_NO_AMMO.ov);
const NO_PIERCE_BUFF = run(P_NO_PIERCE_BUFF.ov);
const NO_GAIN_PIERCE = run(P_NO_GAIN_PIERCE.ov);

/* ---------------- tests ---------------- */

describe('milk-blooming-bunny / fixture', () => {
  it('bursts on every rotation as the sole Burst III (non-vacuity)', () => {
    expect(Object.keys(BASE.all)).not.toContain('helm');
    expect(rotations(BASE)).toBeGreaterThanOrEqual(2);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // both sides of every burst-window gate are exercised: a 10s window inside a 40s cooldown
    // means the fight spends most of its time OUTSIDE the Overconfident state.
    expect(rotations(BASE) * 10).toBeLessThan(180);
  });
});

describe('milk-blooming-bunny / skill1 - Full Charge grants Pierce for 6 sec', () => {
  it('is a timed gainPierce effect with a 6 sec window', () => {
    const gp = allEffects(OV).filter((e) => e.kind === 'gainPierce');
    expect(gp.length).toBeGreaterThan(0);
    expect(gp.some((e: any) => near(e.durationSec ?? -1, 6))).toBe(true);
  });

  it('is NOT encoded as the static whole-fight hasPierce flag', () => {
    // nearest-wrong: hasPierce:true tags every hit from t=0, including the ~1s before the first
    // full charge and any post-window gap, which a 6 sec timed grant cannot cover.
    expect(OV.hasPierce ?? false).toBe(false);
  });

  it('removing the grant cannot RAISE milk damage, and never moves a teammate', () => {
    expect(P_NO_GAIN_PIERCE.touched).toBeGreaterThan(0);
    expect(NO_GAIN_PIERCE.total).toBeLessThanOrEqual(BASE.total);
  });
});

describe('milk-blooming-bunny / skill1 - Embarrassment entry', () => {
  it('e1: a 290% Distributed rider lives in skill1', () => {
    const e1 = effectsOfSlot(OV, 'skill1');
    expect(e1.some((e: any) => near(e.atkPct ?? -1, 290))).toBe(true);
    expect(
      e1.some(
        (e: any) => near(e.atkPct ?? -1, 290) && e.flavor === 'distributed',
      ),
    ).toBe(true);
  });

  it('e1: the rider fires at a GATED cadence, not once per full charge', () => {
    expect(P_NO_290.touched).toBeGreaterThan(0);
    const delta = riderHits(BASE) - riderHits(NO_290);
    expect(delta).toBeGreaterThanOrEqual(1);
    // ~0.69 shots/s over 180s = ~125 full charges; an ungated per-charge entry blows this bound.
    expect(delta).toBeLessThanOrEqual(40);
    expect(BASE.total).toBeGreaterThan(NO_290.total);
  });

  it('e2/e4: the 100% ammo removal + forced reload are modeled and move the reload economy', () => {
    expect(P_NO_AMMO.touched).toBeGreaterThan(0);
    const e2 = effectsOfSlot(OV, 'skill1').filter(
      (e: any) => e.kind === 'consumeAmmo',
    );
    expect(e2.length).toBeGreaterThan(0);
    expect(e2.every((e: any) => (e.fraction ?? 1) === 1)).toBe(true);
    // dumping a partial magazine inserts reload cycles that would not otherwise occur;
    // direction is expected to be BASE > patched, but the load-bearing claim is that the
    // weapon-state line is not inert.
    expect(reloads(NO_AMMO)).not.toBe(reloads(BASE));
  });

  it('e5: ATK 118.7% for 40 sec, self only', () => {
    const b = buffApplies(BASE, 'atkPct', 118.7);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e: any) => e.targetSlug === SLUG)).toBe(true);
    const authored = effectsOfSlot(OV, 'skill1').filter(
      (e: any) =>
        e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 118.7),
    );
    expect(authored.length).toBeGreaterThan(0);
    expect(authored.every((e: any) => near(e.durationSec ?? -1, 40))).toBe(
      true,
    );
  });

  it('e5: the 40 sec window is real - shrinking it to 10 sec strictly removes damage', () => {
    expect(P_NO_EMB_ATK.touched).toBeGreaterThan(0);
    expect(P_EMB_ATK_10.touched).toBeGreaterThan(0);
    expect(BASE.total).toBeGreaterThan(NO_EMB_ATK.total);
    expect(BASE.total).toBeGreaterThan(EMB_ATK_10.total);
  });

  it.skip('e3: reload speed FIXED at -50% for 1 reload - GAP: stat CLAMP primitive, no engine branch (a reloadSpeedPct buff is an additive modifier, and durationShots is explicitly NOT for fixed-at lines)', () => {});

  it.skip('Embarrassment STATE duration (how soon a second entry may occur) - MEASUREMENT-GATED: the kit gives no duration for the state itself, only for its ATK buff (40s); the entry cadence is a per-unit estimate until read off footage', () => {});
});

describe('milk-blooming-bunny / skill2', () => {
  it('Pierce Damage 64.7% is applied to milk only', () => {
    const b = buffApplies(BASE, 'pierceDamagePct', 64.7);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e: any) => e.targetSlug === SLUG)).toBe(true);
  });

  it('Pierce Damage 64.7% is continuous (no wall-clock window authored)', () => {
    const authored = allEffects(OV).filter(
      (e: any) =>
        e.kind === 'buff' &&
        e.stat === 'pierceDamagePct' &&
        near(e.value, 64.7),
    );
    expect(authored.length).toBeGreaterThan(0);
    // nearest-wrong: a short refreshing window; the kit word is continuously.
    expect(authored.every((e: any) => e.durationSec === undefined)).toBe(true);
  });

  it('the 447.7% rider is a 2 sec cadence bounded by the 10 sec burst window', () => {
    const holders = blocksHolding(OV, (e: any) => near(e.atkPct ?? -1, 447.7));
    expect(holders.length).toBeGreaterThan(0);
    const blk = holders[0];
    const eff = (blk.effects as any[]).find((x) => near(x.atkPct ?? -1, 447.7));
    expect(eff.flavor).toBe('distributed');
    const cadence2 =
      (eff.kind === 'dot' && near(eff.intervalSec ?? 1, 2)) ||
      (blk.trigger?.kind === 'interval' && near(blk.trigger.sec, 2));
    expect(cadence2).toBe(true);
    const bounded10 =
      (eff.kind === 'dot' && near(eff.durationSec ?? -1, 10)) ||
      blk.trigger?.kind === 'burstCast';
    expect(bounded10).toBe(true);
  });

  it('the 447.7% rider pays out per burst, not for the whole fight', () => {
    expect(P_NO_447.touched).toBeGreaterThan(0);
    expect(BASE.total).toBeGreaterThan(NO_447.total);
    const delta = riderHits(BASE) - riderHits(NO_447);
    // faithful: <=5 ticks per full burst. Ungated interval-every-2s = ~90 ticks over 180s.
    expect(delta).toBeLessThanOrEqual(6 * rotations(BASE));
    expect(delta).toBeLessThan(60);
  });
});

describe('milk-blooming-bunny / burst - Overconfident, Huh?!', () => {
  it('ATK 220% and Pierce Damage 117.64% are self-scoped burst-cast buffs, 10 sec each', () => {
    const eb = effectsOfSlot(OV, 'burst');
    const atk = eb.filter(
      (e: any) =>
        e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 220),
    );
    const prc = eb.filter(
      (e: any) =>
        e.kind === 'buff' &&
        e.stat === 'pierceDamagePct' &&
        near(e.value, 117.64),
    );
    expect(atk.length).toBeGreaterThan(0);
    expect(prc.length).toBeGreaterThan(0);
    expect(atk.every((e: any) => near(e.durationSec ?? -1, 10))).toBe(true);
    expect(prc.every((e: any) => near(e.durationSec ?? -1, 10))).toBe(true);

    const holders = slotBlocks(OV, 'burst').filter((b: any) =>
      (b.effects ?? []).some(
        (e: any) =>
          e.kind === 'buff' && (near(e.value, 220) || near(e.value, 117.64)),
      ),
    );
    expect(holders.length).toBeGreaterThan(0);
    expect(holders.every((b: any) => b.trigger?.kind === 'burstCast')).toBe(
      true,
    );
    expect(holders.every((b: any) => b.target?.kind === 'self')).toBe(true);
  });

  it('ATK 220% is emitted to milk only, as a raw percentage', () => {
    const b = buffApplies(BASE, 'atkPct', 220);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e: any) => e.targetSlug === SLUG)).toBe(true);
    expect(b.length).toBeLessThanOrEqual(rotations(BASE));
  });

  it('the ATK 220% window is 10 sec - stretching it to 40 sec strictly ADDS damage', () => {
    expect(P_NO_BURST_ATK.touched).toBeGreaterThan(0);
    expect(P_BURST_ATK_40.touched).toBeGreaterThan(0);
    expect(BASE.total).toBeGreaterThan(NO_BURST_ATK.total);
    // RED if the buff was authored at 40 sec (the Embarrassment window): base would already equal it.
    expect(BURST_ATK_40.total).toBeGreaterThan(BASE.total);
  });

  it('Pierce Damage 117.64% is self-targeted and its removal cannot RAISE damage', () => {
    const b = buffApplies(BASE, 'pierceDamagePct', 117.64);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e: any) => e.targetSlug === SLUG)).toBe(true);
    expect(P_NO_PIERCE_BUFF.touched).toBeGreaterThanOrEqual(2);
    expect(NO_PIERCE_BUFF.total).toBeLessThanOrEqual(BASE.total);
  });

  it.skip('Immunity to Embarrassment for 10 sec - GAP: no primitive suppresses a self kit-state for a window (targetStatus is enemy-only; mode/resourceGate cannot be flipped by a burst for 10s), so the burst window can re-enter Embarrassment in-sim', () => {});
});

describe('milk-blooming-bunny / inertness', () => {
  it('milk self-buff counterfactuals leave every teammate byte-identical', () => {
    expect(others(NO_BURST_ATK)).toEqual(others(BASE));
    expect(others(NO_EMB_ATK)).toEqual(others(BASE));
    expect(others(EMB_ATK_10)).toEqual(others(BASE));
    expect(others(BURST_ATK_40)).toEqual(others(BASE));
  });

  it('milk is the only unit whose damage the 290% and 447.7% riders move', () => {
    expect(others(NO_290)).toEqual(others(BASE));
    expect(others(NO_447)).toEqual(others(BASE));
  });
});


========== SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + short diff vs the DRIVER override ==========

DRIVER DIFF (blind override vs driver override):
  (a) MODE SPLIT: the driver override has modes ["auto (no Embarrassment)" (DEFAULT), "manual (Embarrassment cycle)"] and gates the Embarrassment blocks to manual (engine sim.ts:663). The blind override has NO modes — a single always-Embarrassment model. This is the dominant divergence and the cause of blind-test failures [1-4].
  (b) S2 Pierce 64.7: the blind override MODELS it (pierceDamagePct 64.7); the driver leaves it UNMODELED (status-gated on Embarrassment => inert in the default auto basis; residual only in manual mode).
  (c) PRIMITIVE CHOICES: driver models the ammo dump as maxAmmoPct -100 (floors magazine to 1) where the blind uses consumeAmmo; driver's S2 dot has no flavor field.
  CONVERGENCE: both agree on the faithful core — S1 gainPierce 6s, burst pierceDamagePct 117.64/10s + atkPct 220/10s (burstCast, self), S2 447.7% DoT (2s/10s), 290% distributed rider, burst Immunity unmodeled.

--- BLIND OVERRIDE ---
{
  "slug": "milk-blooming-bunny",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "gainPierce",
          "durationSec": 6
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 12
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 290,
          "flavor": "distributed",
          "crit": true
        },
        {
          "kind": "consumeAmmo",
          "fraction": 1
        },
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": -50,
          "durationSec": 5
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 118.7,
          "durationSec": 40
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 12
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 64.7,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 447.7,
          "durationSec": 10,
          "intervalSec": 2,
          "flavor": "distributed"
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
          "stat": "pierceDamagePct",
          "value": 117.64,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 220,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Gains Immunity to Embarrassment for 10 sec."
    ]
  },
  "caveats": [
    "⚑ TRIGGER STAND-IN: the Embarrassment entry condition ('not in the Embarrassment state' AND 'Full Charge lasts for 0.5 sec or more') is a HELD-CHARGE player action the engine has no primitive for (it fires a charge shot as soon as it completes). Modeled as interval sec:12 on BOTH the skill1 Embarrassment block and the skill2 Embarrassment-gated Pierce buff so they co-fire. Cadence is an UNMEASURED estimate; her whole damage profile scales roughly linearly in 1/sec.",
    "⚑ EMBARRASSMENT WINDOW LENGTH is not stated anywhere in the kit. Assumed to equal the forced slow reload it describes (~4.7 s at −50% reload speed → durationSec 5 on the skill2 Pierce Damage ▲64.7%). If the status actually persists longer (e.g. until the next full charge, or for the 40 s of the ATK buff), that Pierce buff is badly under-credited.",
    "⚑ CLAMP APPROXIMATION: 'Reload speed is fixed at a 50% reduction for 1 reload(s)' is a stat CLAMP (engine-modeling-gaps §1b), which the schema has no primitive for. Encoded as an ADDITIVE buff reloadSpeedPct −50 for 5 s. Solo/near-solo this matches; in a comp carrying reload-speed buffs the clamp would OVERRIDE them while this additive model only offsets them (mildly over-credits shots fired).",
    "⚑ 'Immunity to Embarrassment for 10 sec' (burst) is UNMODELED — there is no self-status-immunity primitive and the interval stand-in cannot be suppressed. Consequence: the model can fire an Embarrassment (290% + ATK ▲118.7% refresh) inside her own 10 s burst window where the real unit CANNOT. This is the single largest known over-credit in this baseline; the real kit forces the 290% procs to live outside the burst window.",
    "hasPierce is deliberately NOT set: her Pierce is a timed 6 s per-full-charge grant (gainPierce), not whole-fight tagging. Because 6 s ≫ her charge cadence, Pierce is effectively continuous while she is firing — but it lapses across the forced slow reload, and a boolean could not express that.",
    "The two distributed-damage lines (290% instant, 447.7%/2 s) are NOT pierce-tagged: the kit does not describe them as Pierce, so her own Pierce Damage ▲ buffs (64.7 / 117.64) are modeled as feeding only her weapon hits. If popups show the distributed hits scaling with the Pierce buffs, add pierce:true to the flatDamage and re-check the dot path.",
    "Distributed Damage against the v1 partless single-target boss is treated as one undivided hit; no split-vs-merge modeling applied.",
    "Damage blocks are authored with target {kind:'self'} (the caster is the damage source) rather than {kind:'enemy'}, since resolveTargets({kind:'enemy'}) returns [] in v1. If repo convention is the opposite for flatDamage/dot blocks, re-scope — the effect values are unchanged.",
    "noFb is NOT set anywhere (default OFF): the 290% rider and the 447.7% ticks take Full Burst by TIMING. The 447.7% ticks all land inside her own post-burst 10 s window, so essentially every tick is FB-boosted — a measured noFb exemption would cut her burst damage by ~1/3."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (no override, tests, probe data, or board output consulted). Structure: (1) skill1 grants 6 s Pierce per full charge — keyed to shotFired because every trigger pull of a charge weapon IS a full charge (chargeCounter{count:1} was rejected: its per-phase effects[] indexing is unsafe with a single effect). (2) skill1's Embarrassment package (290% distributed + full-ammo dump + forced reload + −50% reload-speed clamp + ATK ▲118.7%/40 s) is one block on an interval:12 s stand-in for the held-charge trigger; its ⚑ cadence assumes the optimal play pattern of emptying the magazine (~5 shots) before holding a charge, so little ammo is wasted by 'Removes 100% of ammo' (floor is ~6 s = charge 1 s + hold 0.5 s + slowed reload 4.7 s if she triggers on a full belt). 'Forced Reload' needs no separate effect — consumeAmmo{fraction:1} empties the belt and the engine forces the reload (and fires lastBullet triggers). (3) skill2's Pierce Damage ▲64.7% is gated on Embarrassment status, so it rides the SAME interval:12 with a ⚑ 5 s window (= the slowed reload). (4) skill2's 447.7%/2 s is gated on 'Overconfident, Huh?!', a status granted by her OWN burst block → burstCast trigger (NOT fullBurstEnter, which would over-fire in multi-B3 comps), encoded as ONE dot instance per cast (durationSec 10, intervalSec 2 → 5 ticks), never as a repeating flatDamage. Its ticks are left non-crit per the default DOT_CRIT gate; the 290% instant rider is crit:true per the rider-crit rule and gets no core. The burst slot is pure self-buff (Pierce Damage ▲117.64%, ATK ▲220%, both 10 s); the Immunity-to-Embarrassment line is unmodeled and is the known over-credit vector (see caveats)."
}

========== SECTION 7 — DRIVER IMPLEMENTATION (the encoding under judgment) ==========

--- DRIVER TEST (scripts/tests/units/milk-blooming-bunny.test.ts; 17 assertions, all GREEN vs shipped) ---
// PER-UNIT KIT SPEC — `milk-blooming-bunny` (Milk: Blooming Bunny, Attacker/SR/Iron, Burst III,
// cd 40s, ammo 6, chargeFrames 60). Kit-autonomy gauntlet 2026-07-25. EXACT SLUG: this is the
// Iron bunny variant ("mbb"/"bmilk"), NOT base `milk` (SR/Water) — the lint trips on the "Milk:"
// substring of her full name; the slug is disambiguated.
//
// One assertion group per KIT LINE (MBB1..MBB5), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each assertion
// must discriminate against) — never the encoding under test.
//
// THE TIER-2 MECHANIC: Embarrassment is a MANUAL action — it procs only when a Full Charge is HELD
// an extra 0.5s (Prydwen), which the auto-play AI never does. The override is therefore MODE-SPLIT:
//   modes[0] = "auto (no Embarrassment)"  [DEFAULT] — a plain SR + her burst buffs + S2 burst DoT
//   modes[1] = "manual (Embarrassment cycle)"       — the held-charge cycle (1 shot/reload, 290%
//                                                     distributed proc, ATK 118.7%, -50% reload)
// The engine gates each block by `mode` (sim.ts:663 — active iff `!b.mode || b.mode === selected`),
// so the Embarrassment blocks (mode: manual) are FILTERED OUT in the default auto mode. MBB5 pins
// that gate behaviourally.
//
// Kit (blablalink prose, data/characters.json → characters['milk-blooming-bunny'].skills; L10 vals):
//   S1 ■ Full Charge attack → self: Gain Pierce for 6 sec.                                   [MBB1] (both modes)
//      ■ not-in-Embarrassment & Full Charge held ≥0.5s → self: Embarrassment —               [MBB5] (MANUAL only)
//          Eff1 all enemies 290% final ATK Distributed; Eff2 remove 100% ammo;
//          Eff3 reload speed -50% for 1 reload; Eff4 forced reload; Eff5 ATK ▲118.7% 40s.
//   S2 ■ in Embarrassment status → self: Pierce Damage ▲64.7% continuously.                  [UNMODELED]
//      ■ in Overconfident (burst) status → all enemies every 2s: 447.7% final ATK Distrib.   [MBB4]
//   BU ■ self: Overconfident, Huh?! — Immunity to Embarrassment 10s.                         [UNMODELED]
//                Pierce Damage ▲117.64% for 10 sec.                                          [MBB2]
//                ATK ▲220% for 10 sec.                                                       [MBB3]
//
// UNMODELED (inert in the DEFAULT auto mode — documented, no assertion):
//   • S2 "Pierce Damage ▲64.7% continuously" — gated on the Embarrassment STATUS, which auto never
//     enters, so it is inert on the default basis. It WOULD apply in manual mode (a residual there);
//     pierceDamagePct is otherwise live (MBB1/MBB2), so this is a status-gate skip, not a dead prim.
//     (Cross-family S2b reviewer concurs: status-gated, inert in auto.)
//   • Burst "Immunity to Embarrassment for 10s" — inert in auto (she is never in Embarrassment);
//     in manual it would suspend the cycle during the burst window. Documented in override.unmodeled.
//     (S2b: MEASUREMENT-GATED, loadBearing false — trivially satisfied in auto, where no 290% proc
//     or Embarrassment buff ever fires.)
//
// FLAGGED ⚑ (measurement-gated residuals — NOT override fixes; the DEFAULT-mode encoding is faithful):
//   ⚑1 MANUAL-MODE CADENCE / STATE DURATION. The Embarrassment STATE DURATION is nowhere in the prose
//      (the override approximates the cycle as a permanent operating mode in manual: proc-per-shot,
//      maxAmmo floored to 1, passive -50% reload). The "not-in-Embarrassment" gate + the 0.5s held-
//      charge trigger have no engine primitive, so the cycle cadence is an approximation, and Effect 3's
//      "-50% for 1 reload" is a reload-COUNT clamp the override approximates as a passive -50%. MBB5
//      pins the MODE GATE (auto excludes the package; manual includes it) — the load-bearing claim for
//      the validated auto basis — and describes the shipped manual cadence; it does NOT assert the
//      manual cadence is ground-truth cycle spacing. Recipe: a manual-play recording to measure the
//      real Embarrassment state duration + cycle spacing + whether the -50% scopes to one reload.
//   ⚑2 RIDER PIERCE-TAGGING. The engine applies pierceDamagePct to ALL of a pierce-tagged unit's
//      damage (sim.ts:1400), so the 447.7% distributed S2 rider IS pierce-boosted during the burst
//      window (measured: 10.96M → 6.70M per tick when gainPierce is removed). The S2b reviewer reads
//      the kit as "Pierce feeds weapon attacks only" (rider should be unboosted). This is an ENGINE
//      convention, not an override encoding choice — the override carries no primitive to exclude a
//      rider from pierce, and changing the scope is engine-core (S4 NO-GO territory). The unit is
//      validated/tuned COLD (kit-status 0.56–0.73) WITH this behavior, so it is not a hot over-credit
//      driving a wrong ratio. Recipe: measure whether the real 447.7 distributed rider inherits Pierce.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   MBB1  gainPierce emits NO event — it sets pierceUntilFrame (sim.ts:1400), which is the ONLY
//         thing that makes her burst pierceDamagePct live (she has no static hasPierce). Proven by
//         removal: strip gainPierce and the 117.64 buff is still APPLIED but contributes nothing
//         (the pre-2026-07-20 "dead pierce block" bug, kit-status F3) — shipped provably beats it.
//   MBB2  the datamined 117.64 (L10), 10s, self-scoped, once per burst cast — and LIVE (coupled to
//         MBB1's Pierce tag), not a dead buff.
//   MBB3  the datamined 220 (L10, not the L1 130), 10s, self, once per cast; load-bearing (removal
//         collapses her burst-window damage).
//   MBB4  5 ticks per burst window (interval 2s over 10s) at 447.7 — not 1 tick (instant) nor 10
//         (1s interval). Distributed flavor is NOT assertable: dot/damage events carry no flavor
//         field (override note flags this); vs a single partless boss distributed deals full value
//         and she has no distributedDamagePct, so no boost is lost.
//   MBB5  the mode gate itself: in AUTO the manual blocks are inert (stripping them is byte-identical
//         to shipped) and her cadence is a full 6-round magazine (no 290% proc, no ATK 118.7); in
//         MANUAL the cycle activates (proc-per-shot, collapsed cadence, ATK 118.7 present). A
//         permanent-cycle model (the pre-mode-split encoding) would over-count auto damage.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / mbb B3 / helm B3, boss Fire,
// focus mbb — slot index 2). mbb needs a real B1→B2→B3 rotation to cast her burst at all.
// Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'milk-blooming-bunny';
/** controlComp slot order: liter 0 / crown 1 / mbb 2 / helm 3. */
const MBB = 2;
const FIGHT_FRAMES = 180 * FPS;
const MANUAL = 'manual (Embarrassment cycle)';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(opts: { mode?: string; overrides?: Record<string, any> } = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    modes: opts.mode ? { [SLUG]: opts.mode } : undefined,
    overrides: opts.overrides ?? {},
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, total: totals(res)[SLUG] };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
/** MBB1 counterfactual: her S1 Pierce-tag line removed — the pre-2026-07-20 "pierceDamagePct with
 *  no hasPierce" dead-block bug. The 117.64 buff still applies but contributes nothing. */
const noGainPierce = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'gainPierce'),
  );
  if (ov.skill1.length === before)
    throw new Error('mbb S1 gainPierce block missing — fixture is stale');
});
/** MBB3 counterfactual: burst ATK ▲220% removed. */
const noAtk220 = withPatchedOverride(SLUG, (ov) => {
  const blk = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'atkPct'),
  );
  if (!blk)
    throw new Error('mbb burst atkPct block missing — fixture is stale');
  blk.effects = blk.effects.filter((e: any) => e.stat !== 'atkPct');
});
/** MBB4 counterfactual: S2 burst DoT removed. */
const noDot = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'dot'),
  );
  if (ov.skill2.length === before)
    throw new Error('mbb S2 dot block missing — fixture is stale');
});
/** MBB5 isolation: the manual-gated Embarrassment blocks stripped. In the DEFAULT auto mode the
 *  engine's mode gate already filters these out, so this must be byte-identical to shipped. */
const stripManual = withPatchedOverride(SLUG, (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => b.mode !== MANUAL);
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const manual = run({ mode: MANUAL });
const noPierce = run({ overrides: { [SLUG]: noGainPierce } });
const no220 = run({ overrides: { [SLUG]: noAtk220 } });
const noD = run({ overrides: { [SLUG]: noDot } });
const stripped = run({ overrides: { [SLUG]: stripManual } });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const mbbDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const mbbShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const mbbBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
/** helm is the co-B3 in the control comp — it leads Full Bursts mbb does NOT cast. This is what makes
 *  the burstCast-vs-fullBurstEnter discriminator LIVE in the fixture: mbb's burst-derived buffs/ticks
 *  must key to HER casts, never helm's. */
const helmBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'helm',
  );
/** buffApply events cast by mbb (slot index), by stat. */
const mbbBuffs = (evs: SimEvent[], stat: string) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === MBB && e.stat === stat,
  );
/** Does frame `a` coincide (≤2f cast→buff latency) with any frame in `bs`? */
const near = (a: number, bs: number[]) => bs.some((b) => Math.abs(a - b) <= 2);

describe('milk-blooming-bunny — kit spec', () => {
  describe('MBB1 — S1 "Gain Pierce for 6 sec" lights her burst pierceDamagePct (both modes)', () => {
    it('the burst Pierce Damage buff is applied at the datamined 117.64%, once per cast', () => {
      const applied = mbbBuffs(base.events, 'pierceDamagePct');
      expect(applied.length).toBe(mbbBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([117.64]);
    });

    it('is LIVE: removing the Pierce tag (gainPierce) reduces her damage', () => {
      // gainPierce emits no event; its only observable is that pierceDamagePct goes live (sim.ts:1400).
      expect(base.total).toBeGreaterThan(noPierce.total);
    });

    it('DISCRIMINATING: the no-gainPierce model (the old dead-pierce bug) provably under-counts', () => {
      // The 117.64 buff is still APPLIED in the counterfactual, but dead — proves the shipped
      // encoding is one the pre-enactment model provably fails.
      const cfApplied = mbbBuffs(noPierce.events, 'pierceDamagePct');
      expect(
        cfApplied.length,
        'counterfactual still applies the buff',
      ).toBeGreaterThan(0);
      expect(noPierce.total).toBeLessThan(base.total);
    });
  });

  describe('MBB2 — burst "Pierce Damage ▲117.64% for 10 sec", self-scoped', () => {
    const applied = mbbBuffs(base.events, 'pierceDamagePct');

    it('is 117.64% for exactly 10 sec, held by mbb alone', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([117.64]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([MBB]);
    });

    it('DISCRIMINATING: keyed to HER OWN burstCast — never to a helm-led Full Burst (co-B3)', () => {
      // A fullBurstEnter encoding would also fire on the 6 Full Bursts helm leads (different frames).
      const mbbFrames = mbbBursts(base.events).map((c) => c.frame);
      const helmFrames = helmBursts(base.events).map((c) => c.frame);
      expect(
        helmFrames.length,
        'fixture must field helm-led bursts to discriminate',
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(
          near(b.frame, mbbFrames),
          `buff at ${b.frame} not at an mbb cast`,
        ).toBe(true);
        expect(
          near(b.frame, helmFrames),
          `buff at ${b.frame} leaked onto a helm-led burst`,
        ).toBe(false);
      }
    });
  });

  describe('MBB3 — burst "ATK ▲220% for 10 sec", self-scoped, load-bearing', () => {
    const applied = mbbBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 220,
    );

    it('is the L10 magnitude 220 (not the L1 130), once per cast, for 10 sec, self only', () => {
      expect(applied.length).toBe(mbbBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([MBB]);
    });

    it('DISCRIMINATING: removing it collapses her burst-window damage', () => {
      expect(no220.total).toBeLessThan(base.total);
    });

    it('DISCRIMINATING: keyed to HER OWN burstCast, never a helm-led Full Burst', () => {
      const mbbFrames = mbbBursts(base.events).map((c) => c.frame);
      const helmFrames = helmBursts(base.events).map((c) => c.frame);
      for (const b of applied) {
        expect(
          near(b.frame, mbbFrames),
          `buff at ${b.frame} not at an mbb cast`,
        ).toBe(true);
        expect(
          near(b.frame, helmFrames),
          `buff at ${b.frame} leaked onto a helm-led burst`,
        ).toBe(false);
      }
    });
  });

  describe('MBB4 — S2 Overconfident DoT: 447.7% every 2s for 10s during each burst window', () => {
    const ticks = mbbDamage(base.events, 'skill2');
    const bursts = mbbBursts(base.events);
    const fullWindow = bursts.filter((c) => c.frame + 10 * FPS <= FIGHT_FRAMES);

    it('lands at the kit magnitude 447.7 in the skill bucket', () => {
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([447.7]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('ticks 5× per full burst window (interval 2s over 10s) — not 1 (instant) nor 10 (1s)', () => {
      expect(
        fullWindow.length,
        'no burst has a full 10s window inside the fight',
      ).toBeGreaterThan(0);
      for (const cast of fullWindow) {
        const inWindow = ticks.filter(
          (d) => d.frame >= cast.frame && d.frame <= cast.frame + 10 * FPS,
        );
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} ticks`,
        ).toBe(5);
      }
    });

    it('DISCRIMINATING: removing the DoT removes a load-bearing damage source', () => {
      expect(mbbDamage(noD.events, 'skill2').length).toBe(0);
      expect(noD.total).toBeLessThan(base.total);
    });

    it('DISCRIMINATING: ticks only inside HER OWN burst windows — none follow a helm-led burst', () => {
      // burstCast keying (correct) vs fullBurstEnter (would tick after helm-led Full Bursts too).
      const mbbWindows = mbbBursts(base.events).map(
        (c) => [c.frame, c.frame + 10 * FPS] as const,
      );
      const helmFrames = helmBursts(base.events).map((c) => c.frame);
      for (const t of ticks) {
        expect(
          mbbWindows.some(([lo, hi]) => t.frame >= lo && t.frame <= hi),
          `tick at ${t.frame} outside every mbb burst window`,
        ).toBe(true);
        expect(
          near(t.frame, helmFrames),
          `tick at ${t.frame} sits on a helm-led cast`,
        ).toBe(false);
      }
    });
  });

  describe('MBB5 — Embarrassment is MANUAL-gated (the Tier-2 mode split)', () => {
    it('AUTO (default): the manual blocks are inert — stripping them is byte-identical to shipped', () => {
      expect(stripped.total).toBe(base.total);
    });

    it('AUTO (default): no 290% Embarrassment proc and no ATK 118.7% — she is a plain SR', () => {
      expect(mbbDamage(base.events, 'skill1').length).toBe(0);
      expect(
        mbbBuffs(base.events, 'atkPct').filter((b) => b.value === 118.7).length,
      ).toBe(0);
      expect(mbbBuffs(base.events, 'maxAmmoPct').length).toBe(0);
    });

    it('MANUAL: the Embarrassment cycle activates (ATK 118.7, ammo dump, slow reload)', () => {
      expect(
        mbbBuffs(manual.events, 'atkPct').filter((b) => b.value === 118.7)
          .length,
      ).toBeGreaterThan(0);
      expect([
        ...new Set(mbbBuffs(manual.events, 'maxAmmoPct').map((b) => b.value)),
      ]).toEqual([-100]);
      expect([
        ...new Set(
          mbbBuffs(manual.events, 'reloadSpeedPct').map((b) => b.value),
        ),
      ]).toEqual([-50]);
    });

    it('MANUAL: the 290% distributed proc fires once per shot, and cadence collapses to 1 shot/cycle', () => {
      const procs = mbbDamage(manual.events, 'skill1');
      const shots = mbbShots(manual.events).length;
      expect(procs.length).toBe(shots);
      expect([...new Set(procs.map((d) => d.atkPct))]).toEqual([290]);
      // The -100 max-ammo cap floors the magazine to 1 → far fewer shots than the auto 6-round cadence.
      expect(shots).toBeLessThan(mbbShots(base.events).length);
    });

    it('DISCRIMINATING: the two modes produce different totals (a permanent-cycle model would not)', () => {
      expect(manual.total).not.toBe(base.total);
    });
  });
});


--- DRIVER OVERRIDE (src/skills/overrides/milk-blooming-bunny.json) ---
{
  "note": "TIER AUDIT: Embarrassment requires HOLDING a full charge an extra 0.5s (Prydwen) — a manual action the AI never performs, so on auto she is a plain SR (no 118.7% ATK, no 290% procs, normal magazine). Modes added: 'auto (no Embarrassment)' [default — user validation runs are full-auto] keeps only S2's burst DoT + burst buffs; 'manual (Embarrassment cycle)' preserves the previous permanent-cycle model. ORIGINAL NOTE: Embarrassment is modeled as her permanent operating mode (it re-triggers on every full-charge shot and dominates the fight). Each full charge that isn't already in Embarrassment fires one charged normal, then deals 290% Distributed Damage, dumps her ammo, and force-reloads at -50% reload speed -- i.e. one charged shot per reload cycle. Modeled by: passive maxAmmoPct -100 (floors magazine to 1 -> one shot then reload) + reloadSpeedPct -50 (the fixed slow reload) + a permanent ATK +118.7% (Effect 5, refreshed every cycle so effectively always on), and a shotFired 290% distributed hit (fires ~once per cycle because ammo is 1). S2's Overconfident (burst) line -- 447.7% Distributed every 2s for 10s -- is modeled as a burstCast DoT (interval 2s, duration 10s = 5 ticks); parser had dropped it under an unsupported trigger. Burst's ATK +220%/10s is left to the parser (correct); its Pierce buffs and S1/S2 Pierce buffs are inert (pierceDamagePct is v1-inert), and 'Gain Pierce' is likewise inert. KEY UNCERTAINTIES / approximations, flagged: (1) The burst's 'Immunity to Embarrassment for 10s' is NOT modeled -- during the 10s burst she should revert to a full 6-round magazine + normal reload (many more charged normals) with no 290% procs; instead she keeps the 1-shot slow-reload cadence, so her burst-window normal damage is UNDER-counted while ~1-2 stray 290% procs are OVER-counted (partial offset). Modeling the immunity via a counter-buff was rejected because it would instead re-proc 290% on every burst normal shot (a larger over-count). (2) The first magazine fires all 6 starting rounds before the -100 max-ammo cap applies on reload, a minor early-fight over-count of normals + 290% procs. (3) The S2 DoT loses the 'distributed' flavor (dot has no flavor field), but distributed damage vs a single boss deals full value and she carries no distributedDamagePct, so no boost is lost. [materialized 2026-07-16: burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] Kit-autonomy gauntlet 2026-07-25: default (auto) basis re-derived test-first (scripts/tests/units/milk-blooming-bunny.test.ts, 17 assertions GREEN) — GO faithfulness 1.0, cross-family corroborated. All DEFAULT-mode lines FAITHFUL: S1 gainPierce 6s (lights the pierce package; no event, sets pierceUntilFrame), burst pierceDamagePct 117.64 + atkPct 220 (10s, self, burstCast-keyed — proven own-cast-only vs the helm co-B3 Full Bursts in the control comp, NOT fullBurstEnter), S2 burstCast DoT 447.7/2s/10s (5 ticks/window). The mode gate (sim.ts:663) correctly filters the manual Embarrassment blocks out of auto (stripping them is byte-identical). Two MEASUREMENT-GATED ⚑s, NOT override fixes: ⚑1 manual-mode Embarrassment cadence/state-duration — the state duration is unstated in prose, the 'not-in-Embarrassment' gate + 0.5s held-charge trigger have no primitive, and Effect 3 '-50% for 1 reload' is a reload-COUNT clamp approximated here as a passive -50%; recipe = a manual-play recording (state duration, cycle spacing, reload-clamp scope). ⚑2 the engine pierce-tags the 447.7 distributed S2 rider (sim.ts:1400 applies pierceDamagePct to ALL pierce-tagged damage; measured 10.96M→6.70M/tick when gainPierce removed); the override carries no primitive to exclude a rider and changing the scope is engine-core; recipe = measure whether the real distributed rider inherits Pierce. Unit is validated/tuned COLD (0.56–0.73) with both behaviors, so neither is a hot over-credit driving the ratio.",
  "modes": ["auto (no Embarrassment)", "manual (Embarrassment cycle)"],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Activates only when in Embarrassment status. Affects self.",
      "Pierce Damage ▲ 64.7% continuously."
    ],
    "burst": [
      "Overconfident, Huh?!:",
      "Gains Immunity to Embarrassment for 10 sec."
    ]
  },
  "caveats": [
    "skill1: 'Gain Pierce for 6 sec' (full-charge trigger) is now MODELED (gainPierce durationSec 6 on shotFired — SR auto-full-charges every shot, so the 6s window refreshes continuously → she stays Pierce-tagged). Enacted 2026-07-20 (kit-audit Phase C ENACT-NOW; Fable pre-op APPROVED). This lights her previously-DEAD Pierce package: her burst pierceDamagePct +117.64% (10s) now applies to her burst-window damage (and she becomes an SR recipient of d-killer-wife's +13.55% in PG). DELIBERATE overshoot per faithful>fit (grave-pierce precedent DECISIONS 2026-07-17): PG 0.653 COLD → 1.301 HOT (total ~254M→506M, ~×2 — her burst window carries huge atkPct-220 + FB normals, and pierce ~doubles it). The residual HOT is now cleanly isolated to milk-blooming-bunny's SEPARATE over-models, NOT the pierce: (1) her second gotcha — the Embarrassment mode-split (MEASUREMENT-gated; auto-mode faithfulness of the burst atkPct 220 / S2 DoT 447.7 magnitudes), and (2) needs a milk-blooming-bunny-FOCUS pierce-window measurement (pierce-window DPS share). Do NOT re-fudge the pierce value (117.64 is datamined); fix the residual with a measurement. ⇒ open-questions U23.",
    "burst: unparsed effect \"Overconfident, Huh?!:\"",
    "burst: unparsed effect \"Gains Immunity to Embarrassment for 10 sec.\""
  ],
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
          "stat": "maxAmmoPct",
          "value": -100
        },
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": -50
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 118.7
        }
      ],
      "mode": "manual (Embarrassment cycle)"
    },
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
          "kind": "flatDamage",
          "atkPct": 290,
          "flavor": "distributed"
        }
      ],
      "mode": "manual (Embarrassment cycle)"
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "gainPierce",
          "durationSec": 6
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 447.7,
          "durationSec": 10,
          "intervalSec": 2
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
          "stat": "pierceDamagePct",
          "value": 117.64,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 220,
          "durationSec": 10
        }
      ]
    }
  ]
}
