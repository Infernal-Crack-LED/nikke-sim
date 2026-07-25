

===== SECTION 1 — RECONCILING-JUDGE CONTRACT (return JSON shape) =====

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



===== SECTION 2 — MECHANICS SSOT: docs/data/damage-calculation.md =====

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



===== SECTION 2b — MECHANICS SSOT: docs/data/game-mechanics.md =====

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



===== SECTION 3 — GROUND TRUTH: kit prose + base stats (data/characters.json -> characters.quency-escape-queen) =====

name: Quency: Escape Queen | weapon SMG | class Attacker | element Water | burst III (cd 40s)
ammo 120 | reloadFrames 81 | hitsPerShot 2 | normalAttackMultiplier 10.12 | coreAttackMultiplier 250 | burstGaugePerShot 0.074
rate_of_fire 1440rpm | muzzle_count 2 | reload_start_ammo 119
baseStats: {"hp":13500,"atk":600,"def":78,"core":{"hp":200,"atk":200,"def":200},"grade":{"hp":3000,"atk":20,"def":100,"ratio":200},"critRate":15,"maxLevel":1200,"critDamage":150,"resourceId":403}

SKILL PROSE:
skill1 (Secure Route):
■ Activates only when Explore Route Stage 1 is at max stacks. Affects self.
Distributed Damage ▲ 49.58% continuously.
■ Activates only when Explore Route Stage 2 is at max stacks. Affects self.
Damage dealt when attacking core ▲ 25.25% continuously.
■ Activates only when Explore Route Stage 3 is at max stacks. Affects self.
Critical Rate ▲ 16.73% continuously.

skill2 (Explore Route):
■ Activates after 2 normal attacks. Affects self.
Effects vary for each stage. Each subsequent effect triggers all effects before it:
Stage 1: Affects self.
Hit Rate ▲ 1.36%. Stacks up to 10 times and lasts for 2 sec.
ATK ▲ 2.45%. Stacks up to 10 times and lasts for 2 sec.
Stage 2: Activates when Explore Route Stage 1 is at max stacks. Affects self.
Hit Rate ▲ 2.71%. Stacks up to 10 times and lasts for 1 sec.
ATK ▲ 4.9%, stacks up to 10 time(s) and lasts for 1 sec.
Stage 3: Activates when Explore Route Stage 2 is at max stacks. Affects self.
Hit Rate ▲ 4.08%. Stacks up to 5 times and lasts for 0.5 sec.
ATK ▲ 7.36%. Stacks up to 5 times and lasts for 0.5 sec.

burst (The Great Thief):
■ Affects self.
Attack Damage ▲ 57.08% for 10 sec.
Reload Speed ▲ 25.87% for 10 sec.
■ Affects all enemies.
Deals 1736.31% of final ATK as Distributed Damage.


===== SECTION 4 — S2b PRE-OP REVIEW (claude-fable-5, reconciled by driver) =====

{
  "slug": "quency-escape-queen",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Stage 1 max: Distributed Damage ▲ 49.58%",
      "disposition": "FAITHFUL",
      "scope": "Scoped to the caster's OWN distributed-damage hits only (stat distributedDamagePct). Her sole distributed hit is the burst nuke (1736.31% Distributed Damage) — so this line is a burst-nuke amplifier, NOT a normal-attack buff.",
      "durationSemantics": "'continuously' = active while the gate holds — a conditional passive, not a timed buff. The gate is dynamic: live only while Explore Route Stage 1 (the skill2 Stage-1 pool, max 10 stacks) is AT max; drops when stacks lapse (reload/downtime).",
      "triggerIdentity": "passive with a stack-threshold gate (resourceGate-style on the Stage-1 pool at 10/10). No activation clause beyond the stack condition.",
      "targetSet": "self",
      "nearestWrongModel": "Unconditional passive from t=0 (gate dropped), and/or encoded as generic attackDamagePct so it boosts ALL her damage instead of only the distributed-flavored burst nuke.",
      "distinguishingAssertion": "withPatchedOverride removing this line: ONLY the burst-cast damage event (bucket/flavor distributed, mult≈17.3631) shrinks by the ≈1.4958 factor; per-shot normal/core damage events are byte-identical. Additionally no buffApply{stat:'distributedDamagePct',value:49.58} may appear before the Stage-1 pool first reaches 10 stacks (≈20 rounds ≈1s of fire) — red if present at frame 0.",
      "inertness": "Normal-attack, core, and crit buckets must NOT move when this line is toggled; teammates' totals must not move (self-only).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Stage 2 max: core dmg ▲ 25.25%",
      "disposition": "FAITHFUL",
      "scope": "Core-hit bucket only (coreDamagePct) — 'Damage dealt when attacking core'. Not generic damage-up.",
      "durationSemantics": "'continuously' while Explore Route Stage 2 (skill2 Stage-2 pool, max 10 stacks) is at max; conditional passive, no timer.",
      "triggerIdentity": "passive gated on Stage-2 pool = 10/10. Note the escalation chain: Stage-2 stacks only build while Stage-1 is at max, so this gate opens strictly later than the 49.58% line.",
      "targetSet": "self",
      "nearestWrongModel": "Generic attackDamagePct (boosts non-core hits too), or ungated always-on passive crediting core damage from t=0.",
      "distinguishingAssertion": "buffApply{stat:'coreDamagePct',value:25.25} first appears strictly AFTER the distributedDamagePct 49.58 apply (chain order), never at frame 0; toggling the line moves ONLY the core bucket of her own damage events (non-core mult unchanged).",
      "inertness": "Non-core hit damage and the burst nuke (no core flag stated) must NOT move; allies must not move.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Stage 3 max: Critical Rate ▲ 16.73%",
      "disposition": "FAITHFUL",
      "scope": "GENERIC crit rate (critRatePct) — the prose has no 'of normal attacks' scoping, so it applies to any crit-eligible hit at her sheet rate. Nearest trap is the inverse of the usual: over-scoping it down to critRateNormalPct.",
      "durationSemantics": "'continuously' while Explore Route Stage 3 (skill2 Stage-3 pool, max 5 stacks) is at max. This is the TIGHTEST gate: 5 stacks each lasting 0.5s requires ≥5 trigger fires inside 0.5s (≈10 rounds/0.5s at every-2-rounds cadence) — exactly at SMG effective cadence, so uptime is marginal, not guaranteed. A steady-state 100%-uptime assumption is itself a nearest-wrong.",
      "triggerIdentity": "passive gated on Stage-3 pool = 5/5.",
      "targetSet": "self",
      "nearestWrongModel": "Always-on +16.73 crit from t=0 (ignoring that the 0.5s/5-stack gate may have <100% uptime and collapses every reload), or scoping to normal attacks only.",
      "distinguishingAssertion": "buffApply{stat:'critRatePct',value:16.73} never precedes the coreDamagePct 25.25 apply; after every reload event (magazine 120 spent) the buff must be re-earned (a fresh apply ≥ the re-ramp interval after firing resumes) — red under a permanent passive that shows exactly one apply for the whole fight.",
      "inertness": "Crit rate on damage events fired during reload-adjacent windows where the pool cannot be at max must NOT show the lift.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 1: Hit Rate ▲ 1.36%, x10, 2 sec",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct self-buff. In this engine Hit Rate feeds the HR→core lift (hrCoreMult, live by default) — it is a damage stat, not droppable as 'accuracy flavor'. The kit VALUE is stated; the HR→core conversion magnitude is the engine's ⚑ (measured-only) — do not invent a per-unit slope.",
      "durationSemantics": "Stacking buff: maxStacks 10, durationSec 2 (wall-clock seconds — 'lasts for 2 sec', NOT rounds). 2s > reload (81f ≈ 1.35s), so Stage-1 stacks SURVIVE a reload; this asymmetry vs Stage 2/3 is load-bearing.",
      "triggerIdentity": "hitCount count:2 — '■ Activates after 2 normal attacks'. hitCount counts ROUNDS; with hitsPerShot 2 the pull-vs-round-vs-hit ambiguity is the trap: counting per-HIT would double the cadence (fire every pull), counting per-PULL of 2 would halve it. Faithful read: 2 rounds.",
      "targetSet": "self",
      "nearestWrongModel": "Trigger shotFired (every pull) or hitCount counting the 2 hits/shot — doubling stack ramp speed; or durationSec long enough that stacks never lapse.",
      "distinguishingAssertion": "buffApply{stat:'hitRatePct',value:1.36} events arrive once per 2 rounds fired (apply count ≈ roundsFired/2, not roundsFired), stacks field climbing 1→10 then refresh:true at 10; expiresFrame−applyFrame ≈ 120 frames. Red under a per-pull trigger (apply count ≈ pulls) or a 1s/permanent duration.",
      "inertness": "No applies while reloading (no rounds fire); stacks present entering a reload must still be live when firing resumes (2s > 1.35s reload).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 1: ATK ▲ 2.45%, x10, 2 sec",
      "disposition": "FAITHFUL",
      "scope": "atkPct (scales her own ATK) self-buff, paired 1:1 with the Stage-1 Hit Rate stack (same trigger, same stack clock).",
      "durationSemantics": "maxStacks 10, durationSec 2. At cap: +24.5% ATK sustained while firing.",
      "triggerIdentity": "Same hitCount:2 block as the Stage-1 Hit Rate line — one trigger, two effects. Stage-1 effects fire on EVERY activation (the 'each subsequent effect triggers all effects before it' clause means higher stages ADD to, never replace, Stage 1).",
      "targetSet": "self",
      "nearestWrongModel": "casterAtkPct/flat encoding, or modeling the three stages as mutually exclusive modes (Stage 3 active ⇒ Stage 1/2 stop stacking) — the prose says subsequent stages trigger all prior effects, so at full escalation ALL THREE stack pools tick concurrently (+24.5% +49% +36.8% ATK ceiling).",
      "distinguishingAssertion": "Once Stage-2 applies begin, Stage-1 atkPct 2.45 applies CONTINUE at the same cadence (interleaved buffApply streams for values 2.45 AND 4.9 in the same window) — red under a replace/mode model where 2.45 applies cease.",
      "inertness": "Allies' ATK must not move (self-only); buffApply value must be the raw 2.45 (plain percentage stat), not flat-resolved.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 2: Hit Rate ▲ 2.71%, x10, 1 sec",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct self, second independent stack pool ('Explore Route Stage 2' — the pool that gates skill1's 25.25% core line at 10/10).",
      "durationSemantics": "maxStacks 10, durationSec 1. 1s < reload 1.35s ⇒ this pool COLLAPSES across every reload and must fully re-ramp (10 triggers = 20 rounds ≈ 1s of fire).",
      "triggerIdentity": "Same every-2-rounds activation, but gated: adds a Stage-2 stack only while the Stage-1 pool is at max (resourceGate/threshold on pool 1 = 10). Not a separate trigger cadence.",
      "targetSet": "self",
      "nearestWrongModel": "Ungated (Stage-2 stacks from t=0, opening skill1's core line ~1s early and keeping it through reloads), or durationSec:2 copied from Stage 1 letting the pool survive reloads.",
      "distinguishingAssertion": "First buffApply{stat:'hitRatePct',value:2.71} occurs only after ≥10 applies of value 1.36 (≥20 rounds); after each reload event the NEXT value-2.71 apply shows stacks:1 (pool reset) while Stage-1's next apply may show stacks>1. Red if 2.71 stacks persist across a reload.",
      "inertness": "skill1's coreDamagePct 25.25 must NOT be live during the post-reload re-ramp window while this pool is below 10.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 2: ATK ▲ 4.9%, x10, 1 sec",
      "disposition": "FAITHFUL",
      "scope": "atkPct self, paired with the Stage-2 Hit Rate stack (same block/pool clock).",
      "durationSemantics": "maxStacks 10, durationSec 1 (prose 'stacks up to 10 time(s) and lasts for 1 sec' — same semantics despite the phrasing wobble). Cap +49% ATK.",
      "triggerIdentity": "Same Stage-2 gated activation as above.",
      "targetSet": "self",
      "nearestWrongModel": "Stack cap misread as 5 (bleeding from Stage 3), or duration 2s.",
      "distinguishingAssertion": "buffApply stream for value 4.9 reaches stacks:10/maxStacks:10 with expiresFrame−applyFrame ≈ 60 frames — red at maxStacks:5 or ≈120 frames.",
      "inertness": "Must not apply before pool 1 caps; allies untouched.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 3: Hit Rate ▲ 4.08%, x5, 0.5 sec",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct self, third pool ('Explore Route Stage 3' — gates skill1's crit line at 5/5). NOTE the max-stack cap DROPS to 5 here.",
      "durationSemantics": "maxStacks 5, durationSec 0.5. At every-2-rounds cadence and SMG effective fire, holding 5 live stacks inside a 0.5s window is at the edge of feasibility — uptime of this pool (and hence the skill1 crit gate) is NOT trivially 100%; a model asserting full uptime needs the arithmetic shown.",
      "triggerIdentity": "Every-2-rounds activation gated on the Stage-2 pool at max (10). Chain: pool1@10 → pool2 builds; pool2@10 → pool3 builds.",
      "targetSet": "self",
      "nearestWrongModel": "maxStacks 10 / duration 1s copied from Stage 2 (inflating uptime of both this buff and the downstream 16.73% crit gate), or gating on pool-1-max instead of pool-2-max (skipping a chain link).",
      "distinguishingAssertion": "First buffApply{stat:'hitRatePct',value:4.08} strictly follows the 10th value-2.71 apply; maxStacks field = 5; expiresFrame−applyFrame ≈ 30 frames. Red under 10-cap or 1s duration.",
      "inertness": "skill1's critRatePct 16.73 must NOT be live in any frame where fewer than 5 Stage-3 stacks are concurrently unexpired.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Stage 3: ATK ▲ 7.36%, x5, 0.5 sec",
      "disposition": "FAITHFUL",
      "scope": "atkPct self, paired with the Stage-3 Hit Rate stack. Cap +36.8% ATK.",
      "durationSemantics": "maxStacks 5, durationSec 0.5.",
      "triggerIdentity": "Same Stage-3 gated activation.",
      "targetSet": "self",
      "nearestWrongModel": "Treating the three ATK lines as one merged pool (single stat stream at a blended value) rather than three concurrent independent pools with distinct caps/durations.",
      "distinguishingAssertion": "In a fully-escalated firing window the event log shows THREE concurrent atkPct buff keys (values 2.45, 4.9, 7.36) with distinct maxStacks (10/10/5) — red if only one merged key exists.",
      "inertness": "Total ATK lift ceiling ≈ +110.3% only while all three pools are capped; must decay stage-by-stage (3 first, then 2, then 1) across a reload, in that order.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 57.08% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket, additive with other damage-up sources) on self.",
      "durationSemantics": "durationSec 10, wall-clock.",
      "triggerIdentity": "burstCast — her OWN burst block, self mode. NOT fullBurstEnter: in any comp with a second B3 (the control fixture includes helm), a fullBurstEnter keying would fire this on rotations where the OTHER B3 bursts — classic over-credit.",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter trigger (fires every team FB regardless of who burst).",
      "distinguishingAssertion": "Count of buffApply{stat:'attackDamagePct',value:57.08} equals HER burstCast event count, not the fullBurstStart count, in controlComp(quency-escape-queen, helm) where the two B3s alternate.",
      "inertness": "Rotations where helm bursts must show NO 57.08 apply.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Reload Speed ▲ 25.87% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "reloadSpeedPct self. WEAPON-STATE modifier — this IS damage (taxonomy #6): 120-round SMG magazine + 81-frame reload means faster reloads add fired rounds; must not be skipped as 'defensive/QoL'.",
      "durationSemantics": "durationSec 10 from her burst cast.",
      "triggerIdentity": "burstCast, same block/window as the 57.08% line.",
      "targetSet": "self",
      "nearestWrongModel": "Dropped entirely as a no-damage utility line (the recurring dropped-reload-mechanic failure), or keyed to fullBurstEnter.",
      "distinguishingAssertion": "A reload event that starts inside her 10s burst window completes in ≈81/1.2587 ≈ 64 frames (more rounds fired per unit time); patching the line out reduces her totals(res)['quency-escape-queen'] — red if totals are identical with the line removed while a reload fell in-window.",
      "inertness": "Reloads outside the 10s window stay 81 frames; allies' reloads never change.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "1736.31% final ATK as Distributed Dmg",
      "disposition": "FAITHFUL",
      "scope": "flatDamage atkPct:1736.31, flavor:'distributed', target enemy (all enemies — single partless boss takes the full amount; distributed damage does not split further here). This is THE consumer of skill1's 49.58% distributedDamagePct — the two lines must be wired through the same flavor or skill1 goes silently inert.",
      "durationSemantics": "Instant one-shot per cast; no duration.",
      "triggerIdentity": "burstCast damage. Per convention, burst-cast instant damage is FB-EXEMPT (lands before the FB window opens) — expect noFb behavior; no core (text says nothing about core strike); crit eligibility unstated (default per engine convention; a crit:true choice is a ⚑ if asserted).",
      "targetSet": "enemy",
      "nearestWrongModel": "Nuke receives the +50% Full-Burst major (fbMajorApplied true / keyed to fullBurstEnter so it lands inside FB), and/or flavored generic so the 49.58% distributedDamagePct buff never touches it.",
      "distinguishingAssertion": "Exactly one damage event per HER burstCast with mult ≈ 17.3631, fbMajorApplied:false, and its magnitude scales by ×(1.4958) when the Stage-1 pool is at max at cast time vs not — red if fbMajorApplied:true or if toggling skill1's 49.58% leaves this event unchanged.",
      "inertness": "Event count = her burst count (2–3 casts at 40s cd in a ~180s fight), never the team FB count; no core bucket contribution.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:distributed-49.58-stage1max",
    "skill1:core-25.25-stage2max",
    "skill1:crit-16.73-stage3max",
    "skill2:hitrate-1.36-x10-2s",
    "skill2:atk-2.45-x10-2s",
    "skill2:hitrate-2.71-x10-1s",
    "skill2:atk-4.9-x10-1s",
    "skill2:hitrate-4.08-x5-0.5s",
    "skill2:atk-7.36-x5-0.5s",
    "burst:attackdamage-57.08-10s",
    "burst:reloadspeed-25.87-10s",
    "burst:nuke-1736.31-distributed"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Every line is encodable in the schema; nothing legitimately lands in unmodeled, so any driver 'unmodeled' entry needs strong justification. Expected shared-prior misreads to check hardest: (1) THE CHAIN — skill1's three 'continuously' lines are NOT unconditional passives; each is gated on a skill2 stack pool being AT max (10/10/5), the pools build sequentially (Stage N+1 stacks only while Stage N is capped), and pools 2/3 (1s/0.5s durations) collapse across the 1.35s reload while pool 1 (2s) survives it — an always-on encoding over-credits every reload trough and the whole opening ramp. If the driver approximated the gates with rampSec or steady-state uptime instead of live pools, the tests must still pin the reload-trough and t=0 behavior, and any uptime haircut is a ⚑ CALIBRATED estimate requiring the arithmetic. (2) 'Distributed Damage ▲ 49.58%' is distributedDamagePct scoped to her OWN distributed hits — its only consumer is the burst's 1736.31% distributed nuke; encoding it as generic damage-up moves her normal attacks (wrong) and encoding the nuke without flavor:'distributed' makes skill1 silently inert (also wrong). A test must couple the two lines. (3) Trigger cadence: 'after 2 normal attacks' with hitsPerShot:2 — hits vs rounds vs pulls changes the ramp rate ×2 either way; hitCount counts ROUNDS, so count:2 = every 2 rounds. (4) Burst self-buffs are burstCast, not fullBurstEnter — diverges in the control fixture because helm is a co-B3. (5) The nuke is FB-exempt (burst cast lands pre-FB); asserting fbMajorApplied:false is the cheap pin. (6) Reload Speed ▲ is a damage line (shot economy), not skippable. (7) Hit Rate stacks feed the engine's HR→core lift; the kit percentages are DATAMINED-true but the HR→core conversion slope is the engine's measured-only ⚑ — the tests should assert the hitRatePct buffApply stream (values/stacks/durations), not a hand-derived core-rate delta. (8) Stage-3 full uptime is marginal (5 stacks × 0.5s at a ~0.1s trigger cadence needs ~perfect fire continuity, 60fps-quantized SMG cadence sits right at the boundary) — treat claimed 100% uptime of the 16.73% crit gate as a hypothesis, not a fact.",
  "model": "claude-fable-5",
  "driverReconciliation": {
    "converged": true,
    "driverVsReviewer": "Driver and claude-fable-5 CONVERGE on all 12 kit lines FAITHFUL + load-bearing (identical load-bearing set), empty unmodeled. Shared discriminations all pinned in the driver test: (a) distributed coupling L1<->L12 — mult.distributed 1.4958 on the nuke, plainNuke==noDistrib (622M); (b) burstCast NOT fullBurstEnter — buff count == HER 6 casts, not the team FB count (helm co-B3); (c) FB-exempt nuke — fbMajorApplied:false; (d) Reload Speed is damage (L11 pinned, not skipped); (e) hitRatePct feeds HR->core — removing ONLY hit-rate stacks shifts the normal core-rate distribution and drops her total 672->544M; (f) stage caps x10/x10/x5 and durations 2s/1s/0.5s pinned structurally off buffApply.",
    "nuance": "S1 STAGE-GATE TIMING is a documented proxy, not a fabrication. Fable distinguishingAssertion would flag a frame-0 apply of distributedDamagePct as RED (faithful = gated on Stage-1 max ~1s of fire). The shipped override encodes L1 as a passive (frame-0 apply). RECONCILED faithful-in-effect: the only consumer of distributedDamagePct is the 1736.31% nuke, which first fires at frame 322 (~5.4s) — well after the Stage-1 pool builds (~1s) — and the 2s Stage-1 window outlasts the 1.35s reload, so the gate stays satisfied for every nuke thereafter. The frame-0 over-credit has ZERO observable effect on any damage instance. L2/L3 gate proxies (hitCount 20 dur 1s / hitCount 10 dur 0.5s) similarly approximate the Stage-2/3-max gates: magnitudes (25.25/16.73) and durations are exact datamine values and pinned; the gate TIMING is approximate (hit-counter carries over reloads -> slightly optimistic rebuild). No engine stack-count-gate primitive exists, so the real cascade gate is out-of-domain. Driver test pins magnitude/duration/self-target/liveness, NOT exact gate timing — consistent with fable note that any uptime haircut is a CALIBRATED estimate. Fable note (8) Stage-3 marginal uptime: driver test does NOT assert 100% uptime (asserts the crit buff fires + is live), consistent.",
    "flagsRaised": [
      "S1 stage-gate timing proxy (zero observable error on the nuke; ⚑ out-of-domain)",
      "S2 stage-unlock ordering not encoded — parallel build over-credits ramp/post-reload by ~0.4-0.8s (⚑2)",
      "HR->core conversion slope is engine-global measured-only ⚑ (kit hitRatePct magnitudes are DATAMINED-true)"
    ],
    "verdict": "GO at S2 level (cross-family corroborated); proceed to S5/S6/S7."
  }
}


===== SECTION 5 — S5 BLIND TEST (claude-opus-5, written from prose alone) + RESULT vs DRIVER override =====

RESULT: blind/quency-escape-queen.test.ts run UNMODIFIED (save the import-path adaptation noted in its header) against the driver SHIPPED override = GREEN: 16 passed | 5 skipped (the 5 skips are the blind’s honest it.skip gaps: stage-gate primitive, cascade ordering, stack-window duration, nuke core/FB/range flags, pulls-vs-rounds). No RED assertions.

--- blind test source ---
/**
 * quency-escape-queen -- Quency: Escape Queen (SMG / Water / Attacker / Burst III)
 * BLIND per-unit kit spec. Written from the kit prose ALONE: no sight of the driver
 * override, the driver tests, or any truth file.
 *
 * BASE: cd 40s, ammo 120, reloadFrames 81, hitsPerShot 2, normalAttackMultiplier 10.12,
 * coreAttackMultiplier 250 -- a high-cadence SMG, so every skill2 stack tier saturates
 * within ~1s of firing and re-ramps after each reload.
 *
 * KIT AS READ (structural):
 *   skill1 -- three continuous SELF passives, each gated on an Explore Route stage being
 *             at MAX STACKS (the stages are the skill2 stack tiers):
 *     A  stage-1 max -> Distributed Damage +49.58%  -> distributedDamagePct
 *     B  stage-2 max -> core damage +25.25%         -> coreDamagePct
 *     C  stage-3 max -> Critical Rate +16.73%       -> critRatePct. UNSCOPED: the line
 *        carries no normal-attack qualifier, so critRateNormalPct would be wrong.
 *   skill2 -- SELF, after 2 normal attacks, three cumulative stages (each stage also
 *             fires the ones before it):
 *     S1  hitRate +1.36% x10 / 2s    ATK +2.45% x10 / 2s
 *     S2  hitRate +2.71% x10 / 1s    ATK +4.9%  x10 / 1s   (needs stage-1 at max)
 *     S3  hitRate +4.08% x5  / 0.5s  ATK +7.36% x5  / 0.5s (needs stage-2 at max)
 *   burst -- SELF: Attack Damage +57.08% and Reload Speed +25.87%, both 10s;
 *            ALL ENEMIES: 1736.31% of final ATK as DISTRIBUTED damage. That flavor is
 *            what makes skill1-A a real consumer of her own burst, and it is the only
 *            distributed source in the fixture -- so the pairing is directly testable.
 *
 * FIXTURE: controlComp(SLUG, true) -- liter B1 / crown B2 / quency B3 / helm B3. A lone
 * B3 casts ZERO bursts, so B1+B2 are mandatory. helm is kept (standard fixture); every
 * assertion is a WITHIN-fixture counterfactual, so her constant contribution cancels.
 *
 * METHOD: counterfactuals are built with withPatchedOverride and mutate the clone
 * SLOT-AGNOSTICALLY -- each stat below appears in exactly one kit slot, so scanning all
 * three slots cannot over-reach, and the test stays robust to where the driver placed a
 * block. blocksOf() accepts both documented file shapes (slot: Block[] and
 * slot: {blocks: Block[]}). Every patch records how many effects it matched; a count of 0
 * means the kit line was never authored at all, asserted separately so a MISSING line is
 * never mis-read as an inert one.
 *
 * 13 hoisted runs (each a full 180s sim).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // DRIVER ADAPTATION: blind wrote '../lib/harness.js' (no such
// module); the live harness is scripts/tests/lib/harness.ts. Assertion INTENT unchanged — the
// blind writer used the real 2-arg withPatchedOverride / controlComp / totals API and the real
// event fields (.frame/.targetSlug/.casterIdx/.srcSlot/.stacks/.maxStacks), so NO other correction
// was needed. Its 5 it.skip gaps (stage-gate primitive, cascade ordering, stack-window duration,
// nuke core/FB/range flags, pulls-vs-rounds) are the blind's honest dispositions and match the
// driver's documented ⚑s; S7 adjudicates. Raw blind output: cross-family/quency-escape-queen/s5-result.json.

const SLUG = 'quency-escape-queen';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const DAMAGE_KINDS = new Set(['flatDamage', 'dot', 'storedHit']);

type Rec = Record<string, any>;

// The override FILE is slot-keyed; the two documented shapes are slot: Block[] and
// slot: { blocks: Block[] }. Accept both so the counterfactuals cannot silently no-op.
function blocksOf(ov: Rec, slot: string): Rec[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s as Rec[];
  return Array.isArray(s.blocks) ? (s.blocks as Rec[]) : [];
}

function eachBlock(ov: Rec, fn: (b: Rec, slot: string) => void): void {
  for (const slot of SLOTS) for (const b of blocksOf(ov, slot)) fn(b, slot);
}

function eachEffect(ov: Rec, fn: (e: Rec, b: Rec, slot: string) => void): void {
  eachBlock(ov, (b, slot) => {
    for (const e of (b.effects ?? []) as Rec[]) fn(e, b, slot);
  });
}

type Mutator = (ov: Rec) => number;

const zeroStat =
  (stat: string): Mutator =>
  (ov) => {
    let n = 0;
    eachEffect(ov, (e) => {
      if (e.kind === 'buff' && e.stat === stat) {
        e.value = 0;
        n += 1;
      }
    });
    return n;
  };

const setDuration =
  (stat: string, sec: number): Mutator =>
  (ov) => {
    let n = 0;
    eachEffect(ov, (e) => {
      if (e.kind === 'buff' && e.stat === stat) {
        e.durationSec = sec;
        n += 1;
      }
    });
    return n;
  };

// Remove (not zero) the burst damage payload, so its damage events disappear entirely
// and can be counted by difference.
const dropBurstDamage: Mutator = (ov) => {
  let n = 0;
  eachBlock(ov, (b, slot) => {
    if (slot !== 'burst') return;
    const before = ((b.effects ?? []) as Rec[]).length;
    b.effects = ((b.effects ?? []) as Rec[]).filter(
      (e) => !DAMAGE_KINDS.has(e.kind),
    );
    n += before - (b.effects as Rec[]).length;
  });
  return n;
};

const stripBurstDamageFlavor: Mutator = (ov) => {
  let n = 0;
  eachEffect(ov, (e, _b, slot) => {
    if (
      slot === 'burst' &&
      DAMAGE_KINDS.has(e.kind) &&
      e.flavor === 'distributed'
    ) {
      delete e.flavor;
      n += 1;
    }
  });
  return n;
};

const touched: Record<string, number> = {};

function patched(key: string, ...ms: Mutator[]): unknown {
  return withPatchedOverride(SLUG, (ov: any) => {
    let n = 0;
    for (const m of ms) n += m(ov as Rec);
    touched[key] = n;
  });
}

interface Run {
  total: number;
  events: SimEvent[];
  res: any;
}

function run(override?: unknown): Run {
  const events: SimEvent[] = [];
  const opts: any = controlComp(SLUG, true);
  if (override)
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: override };
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev),
  };
  const res: any = runComp(opts);
  return { total: totals(res)[SLUG], events, res };
}

// ---- hoisted runs (13 x 180s) ------------------------------------------------
const BASE = run();
const NO_DIST = run(patched('dist', zeroStat('distributedDamagePct')));
const NO_CORE = run(patched('core', zeroStat('coreDamagePct')));
const NO_CRIT = run(patched('crit', zeroStat('critRatePct')));
const NO_ATK = run(patched('atk', zeroStat('atkPct')));
const NO_HR = run(patched('hitRate', zeroStat('hitRatePct')));
const NO_AD = run(patched('attackDamage', zeroStat('attackDamagePct')));
const NO_RELOAD = run(patched('reloadSpeed', zeroStat('reloadSpeedPct')));
const NO_NUKE = run(patched('nuke', dropBurstDamage));
const PLAIN_NUKE = run(patched('flavor', stripBurstDamageFlavor));
const PLAIN_NUKE_NO_DIST = run(
  patched(
    'flavorDist',
    stripBurstDamageFlavor,
    zeroStat('distributedDamagePct'),
  ),
);
const AD_1S = run(patched('ad1', setDuration('attackDamagePct', 1)));
const AD_30S = run(patched('ad30', setDuration('attackDamagePct', 30)));

const PATCH_KEYS = [
  'dist',
  'core',
  'crit',
  'atk',
  'hitRate',
  'attackDamage',
  'reloadSpeed',
  'nuke',
  'flavor',
  'flavorDist',
  'ad1',
  'ad30',
];

// ---- event readers -----------------------------------------------------------
const buffApplies = (r: Run, stat: string, value: number): Rec[] =>
  (r.events as unknown as Rec[]).filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      Math.abs(Number(e.value) - value) < 1e-6,
  );

const selfBuffApplies = (r: Run, stat: string, value: number): Rec[] =>
  buffApplies(r, stat, value).filter((e) => e.targetSlug === SLUG);

const burstDamageEvents = (r: Run): number =>
  (r.events as unknown as Rec[]).filter(
    (e) => e.kind === 'damage' && e.srcSlot === 'burst',
  ).length;

const others = (r: Run): Record<string, number> => {
  const t: Rec = { ...totals(r.res) };
  delete t[SLUG];
  return t;
};

// Her burst self-buff is the only per-cast, kit-unique marker available, so its apply
// count IS her cast count (helm is the other B3 and never grants attackDamagePct 57.08).
const castCount = (): number =>
  selfBuffApplies(BASE, 'attackDamagePct', 57.08).length;

describe('quency-escape-queen -- harness wiring and non-vacuity', () => {
  it('the fixture runs, emits events, and deals damage', () => {
    expect(BASE.events.length).toBeGreaterThan(0);
    expect(BASE.total).toBeGreaterThan(0);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBe(BASE.total);
  });

  it('she actually casts her burst in this fixture', () => {
    // Non-vacuity guard for every burst assertion below: with helm as a second B3 the
    // rotation could in principle never hand her the stage-3 slot.
    expect(castCount()).toBeGreaterThanOrEqual(2);
  });

  it('every counterfactual matched at least one authored effect', () => {
    expect(Object.keys(touched).sort()).toEqual([...PATCH_KEYS].sort());
    for (const [k, v] of Object.entries(touched)) {
      // 0 = the kit line is absent from the override, not merely inert.
      expect(
        v,
        `patch ${k} matched no authored effect -- kit line MISSING`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('skill1 -- three continuous self gates', () => {
  it('A: Distributed Damage +49.58% is self-scoped and load-bearing', () => {
    const evs = selfBuffApplies(BASE, 'distributedDamagePct', 49.58);
    expect(evs.length).toBeGreaterThan(0);
    expect(
      buffApplies(BASE, 'distributedDamagePct', 49.58).every(
        (e) => e.targetSlug === SLUG,
      ),
    ).toBe(true);
    // Nearest-wrong: authored but never reaching a consumer (inert stat) -> equal totals.
    expect(NO_DIST.total).toBeLessThan(BASE.total);
    expect(others(NO_DIST)).toEqual(others(BASE));
  });

  it('A: it reaches her burst nuke via the distributed FLAVOR, not a generic bucket', () => {
    // With the flavor stripped, the distributed buff must become a no-op. If the driver
    // routed distributedDamagePct into a generic Damage-Up bucket instead, these diverge.
    expect(PLAIN_NUKE_NO_DIST.total).toBe(PLAIN_NUKE.total);
    // ...and the pairing is non-vacuous: unstripped, the same zeroing DOES move damage.
    expect(NO_DIST.total).not.toBe(BASE.total);
  });

  it('B: core damage +25.25% is self-scoped and load-bearing', () => {
    const evs = selfBuffApplies(BASE, 'coreDamagePct', 25.25);
    expect(evs.length).toBeGreaterThan(0);
    expect(
      buffApplies(BASE, 'coreDamagePct', 25.25).every(
        (e) => e.targetSlug === SLUG,
      ),
    ).toBe(true);
    expect(NO_CORE.total).toBeLessThan(BASE.total);
    expect(others(NO_CORE)).toEqual(others(BASE));
  });

  it('C: Critical Rate +16.73% is UNSCOPED crit, self-only, load-bearing', () => {
    const evs = selfBuffApplies(BASE, 'critRatePct', 16.73);
    expect(evs.length).toBeGreaterThan(0);
    // Nearest-wrong: critRateNormalPct (the normal-attack-scoped mechanic). Her line has
    // no such qualifier; matching by VALUE avoids colliding with helm ally crit grants.
    expect(buffApplies(BASE, 'critRateNormalPct', 16.73).length).toBe(0);
    expect(NO_CRIT.total).toBeLessThan(BASE.total);
    expect(others(NO_CRIT)).toEqual(others(BASE));
  });

  it('no skill1 gate leaks onto a teammate (all three lines say Affects self)', () => {
    for (const [stat, value] of [
      ['distributedDamagePct', 49.58],
      ['coreDamagePct', 25.25],
      ['critRatePct', 16.73],
    ] as [string, number][]) {
      for (const e of buffApplies(BASE, stat, value)) {
        expect(e.targetSlug, `${stat} ${value} applied off-self`).toBe(SLUG);
        expect(
          e.casterIdx,
          `${stat} ${value} looks like a boss debuff`,
        ).not.toBeNull();
      }
    }
  });
});

const LADDER: {
  stat: string;
  value: number;
  maxStacks: number;
  tier: string;
}[] = [
  { stat: 'hitRatePct', value: 1.36, maxStacks: 10, tier: 'S1' },
  { stat: 'atkPct', value: 2.45, maxStacks: 10, tier: 'S1' },
  { stat: 'hitRatePct', value: 2.71, maxStacks: 10, tier: 'S2' },
  { stat: 'atkPct', value: 4.9, maxStacks: 10, tier: 'S2' },
  { stat: 'hitRatePct', value: 4.08, maxStacks: 5, tier: 'S3' },
  { stat: 'atkPct', value: 7.36, maxStacks: 5, tier: 'S3' },
];

describe('skill2 -- after 2 normal attacks, three cumulative self stages', () => {
  it('all six stage magnitudes and stack caps are encoded literally', () => {
    // Nearest-wrong: collapsing the ladder into one pre-summed buff (110.3% ATK /
    // 61.1% Hit Rate at full stacks) -- that model has none of these six pairs.
    for (const L of LADDER) {
      const evs = selfBuffApplies(BASE, L.stat, L.value);
      expect(
        evs.length,
        `${L.tier} ${L.stat} ${L.value} never applied to self`,
      ).toBeGreaterThan(0);
      expect(evs[0].maxStacks, `${L.tier} ${L.stat} stack cap`).toBe(
        L.maxStacks,
      );
      const peak = Math.max(...evs.map((e) => Number(e.stacks ?? 0)));
      // At SMG cadence a tier refreshes far faster than its 2s/1s/0.5s window, so it must
      // saturate; allow 1 stack of slack for the 0.5s tier landing on its own expiry frame.
      expect(
        peak,
        `${L.tier} ${L.stat} never approaches its cap`,
      ).toBeGreaterThanOrEqual(L.maxStacks - 1);
    }
  });

  it('the ATK ladder is load-bearing and self-only', () => {
    for (const L of LADDER.filter((x) => x.stat === 'atkPct')) {
      expect(
        buffApplies(BASE, 'atkPct', L.value).every(
          (e) => e.targetSlug === SLUG,
        ),
      ).toBe(true);
    }
    expect(NO_ATK.total).toBeLessThan(BASE.total);
    expect(others(NO_ATK)).toEqual(others(BASE));
  });

  it('the Hit Rate ladder is load-bearing (hit rate lifts her core rate)', () => {
    for (const L of LADDER.filter((x) => x.stat === 'hitRatePct')) {
      expect(
        buffApplies(BASE, 'hitRatePct', L.value).every(
          (e) => e.targetSlug === SLUG,
        ),
      ).toBe(true);
    }
    // Nearest-wrong: dropping Hit Rate as defensive/inert -> zeroing it changes nothing.
    expect(NO_HR.total).toBeLessThan(BASE.total);
    expect(others(NO_HR)).toEqual(others(BASE));
  });

  it('the trigger fires on a normal-attack cadence, not a burst or interval cadence', () => {
    const n = selfBuffApplies(BASE, 'atkPct', 2.45).length;
    // 180s at SMG cadence (~20 pulls/s nominal, ~70% fire uptime around 81f reloads) gives
    // roughly 1.2k applications if the trigger counts 2 PULLS and ~2.5k if it counts 2
    // ROUNDS (hitsPerShot 2). Both sit inside this band; a burstCast/fullBurstEnter mis-key
    // (~4) or an interval mis-key (tens) falls far below it, a per-round trigger far above.
    expect(n).toBeGreaterThan(400);
    expect(n).toBeLessThan(6000);
  });
});

describe('burst -- self window plus the distributed nuke', () => {
  it('both self buffs are authored at kit magnitude, self-scoped, once per cast', () => {
    const ad = selfBuffApplies(BASE, 'attackDamagePct', 57.08);
    const rs = selfBuffApplies(BASE, 'reloadSpeedPct', 25.87);
    expect(ad.length).toBeGreaterThanOrEqual(2);
    // Both lines sit under the same Affects-self header, so they must co-fire.
    expect(rs.length).toBe(ad.length);
    expect(
      buffApplies(BASE, 'attackDamagePct', 57.08).every(
        (e) => e.targetSlug === SLUG,
      ),
    ).toBe(true);
    expect(
      buffApplies(BASE, 'reloadSpeedPct', 25.87).every(
        (e) => e.targetSlug === SLUG,
      ),
    ).toBe(true);
  });

  it('Attack Damage +57.08% is load-bearing and its 10s window is bounded', () => {
    expect(NO_AD.total).toBeLessThan(BASE.total);
    // Nearest-wrong 1: no durationSec (permanent) -> shrinking to 1s would still be
    // strictly worse, but widening to 30s could not IMPROVE on a permanent buff.
    expect(AD_1S.total).toBeLessThan(BASE.total);
    expect(AD_30S.total).toBeGreaterThan(BASE.total);
    expect(others(NO_AD)).toEqual(others(BASE));
  });

  it('Reload Speed +25.87% is DAMAGE -- it buys shots inside the window', () => {
    // Weapon-state modifiers gate shot count; a kit that drops reload speed as defensive
    // leaves this run byte-identical to base.
    expect(NO_RELOAD.total).toBeLessThan(BASE.total);
    // Teammate inertness deliberately NOT asserted here: changing her shot count changes
    // her burst-gauge contribution, which can legitimately shift the whole rotation.
  });

  it('the 1736.31% distributed nuke lands exactly once per burst cast', () => {
    const delta = burstDamageEvents(BASE) - burstDamageEvents(NO_NUKE);
    expect(delta).toBeGreaterThan(0);
    // Nearest-wrong: encoding the nuke as a dot or a per-shot rider -> delta >> casts.
    expect(delta).toBe(castCount());
    expect(NO_NUKE.total).toBeLessThan(BASE.total);
    expect(others(NO_NUKE)).toEqual(others(BASE));
  });
});

describe('gaps -- kit text this fixture cannot discriminate', () => {
  it.skip('skill1 gates only while the matching Explore Route stage is at MAX stacks', () => {
    // GAP: the engine has no at-max-stacks gate primitive. Any faithful encoding
    // (rampSec on a passive, or a resource + resourceGate) emits the same buffApply, so
    // the opening ramp and the post-reload flicker (81f reload > the 1s/0.5s tier windows)
    // are unobservable from the event stream. Recipe: expose per-frame buff state, or pin
    // the ramp from footage.
  });

  it.skip('skill2 stage 2 requires stage 1 at max, stage 3 requires stage 2 at max', () => {
    // GAP: same missing primitive. In steady state all three tiers are saturated, so the
    // prerequisite is damage-visible only during the ~1-2s opening ramp and after reloads.
  });

  it.skip('stack windows are 2s / 1s / 0.5s per tier', () => {
    // GAP: no buffRemove is emitted on natural lapse, and expiresFrame cannot be paired
    // with an apply frame from the documented event fields. Duration is therefore encoded
    // but unasserted; at SMG cadence it is near-inert except across reloads.
  });

  it.skip('the burst nuke is non-core, full-burst-exempt, and range-exempt', () => {
    // GAP: damage events carry no slug, so her own burst hit cannot be isolated from the
    // global stream to read core / fbMajorApplied / rangeApplied. Kit text gives no core
    // strike wording, and a burst cast lands before the FB window opens.
  });

  it.skip('2 normal attacks means 2 trigger pulls, not 2 rounds (hitsPerShot 2)', () => {
    // MEASUREMENT-GATED: both readings land inside the cadence band asserted above. The
    // 2x difference in stack-rebuild speed is only visible in the post-reload ramp.
    // Recipe: popup-count the first magazine after a reload against the ATK ladder.
  });
});



===== SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs DRIVER override =====

DIFF SUMMARY (blind vs driver — same 12 lines, same magnitudes; differs only in proxy MECHANISM):
- S1 stage gates: blind = passive + rampSec 6/10/14 (invented staircase, blind flags it); driver = passive (S1a) / hitCount 20 dur 1s (S1b) / hitCount 10 dur 0.5s (S1c) firing-tracking proxies. Both approximate the undefined “Explore Route Stage N at max stacks” gate; both documented as ⚑.
- S2 stacks: blind = PRE-SUMMED value (hitRatePct 13.6/27.1/20.4, atkPct 24.5/49.0/36.8 = perStack×maxStacks) + rampSec; driver = per-stack value (1.36/2.71/4.08, 2.45/4.9/7.36) + maxStacks (10/10/5) + durationSec (2/1/0.5). Driver models the real per-stack accrual + lapse/rebuild (probe: 3169 applies, stacks climb 1->cap); blind’s pre-summed ramp is coarser and the blind FLAGS it as an upper-bound over-credit.
- Nuke: blind = flatDamage 1736.31 distributed + explicit noFb:true/crit:true; driver = flatDamage 1736.31 distributed (FB-exempt via burstCast convention; probe confirms fbMajorApplied:false, mult.distributed 1.4958). Equivalent in effect.
- Both: reloadSpeedPct 25.87 is damage (not skippable); critRatePct 16.73 UNSCOPED (not critRateNormalPct); empty unmodeled. Same 6 ⚑ concerns (stack over-credit, stage-gate proxy, pulls-vs-rounds, HR->core slope, cadence datamine, noFb/crit convention).

--- blind override JSON ---
{
  "slug": "quency-escape-queen",
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
          "stat": "distributedDamagePct",
          "value": 49.58,
          "rampSec": 6
        }
      ]
    },
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
          "stat": "coreDamagePct",
          "value": 25.25,
          "rampSec": 10
        }
      ]
    },
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
          "value": 16.73,
          "rampSec": 14
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 2
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 13.6,
          "durationSec": 2,
          "rampSec": 6
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 24.5,
          "durationSec": 2,
          "rampSec": 6
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 2
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 27.1,
          "durationSec": 1,
          "rampSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 49,
          "durationSec": 1,
          "rampSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 2
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 20.4,
          "durationSec": 0.5,
          "rampSec": 14
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 36.8,
          "durationSec": 0.5,
          "rampSec": 14
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
          "stat": "attackDamagePct",
          "value": 57.08,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": 25.87,
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
          "atkPct": 1736.31,
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
      "Effects vary for each stage. Each subsequent effect triggers all effects before it:"
    ],
    "burst": []
  },
  "caveats": [
    "⚑ STACK STEADY-STATE (skill2, all three stages): each stage's buffs are authored at MAX-stacks magnitude (per-stack% × maxStacks) with a rampSec haircut, NOT as engine stacks. The kit's stack windows are shorter than the accrual time at any plausible SMG cadence for stages 2-3 (1s and 0.5s windows, trigger every 2 normal attacks), so true steady-state stacks are almost certainly BELOW cap. The max-stacks encoding is an UPPER BOUND and likely OVER-CREDITS stages 2-3. Recipe: log buffApply stacks/expiresFrame for stat hitRatePct+atkPct over a 90s solo run and re-author value = perStack × observed mean stacks.",
    "⚑ EXPLORE ROUTE STAGE MECHANIC IS KIT-SILENT: the prose gates skill1's three lines on 'Explore Route Stage N at max stacks' and skill2's stages 2/3 on the same, but never defines what Explore Route stacks are, how they accrue, or their caps. Stage 1's skill2 block (the only ungated one) is what BUILDS the ladder in-game; the higher stages presumably unlock as the lower stages saturate. Modeled here as always-on-after-ramp (rampSec staircase 6/10/14s) rather than as a real gate, which OVER-CREDITS early fight time and cannot express a stage that never reaches max. Recipe: read a solo recording's buff icons/timeline for when each stage's continuous buff first appears; convert to a resource pool + resourceGate if the accrual rule is recoverable.",
    "⚑ skill2 TRIGGER IDENTITY: 'Activates after 2 normal attacks' encoded as hitCount:2. hitCount counts ROUNDS, and this unit has hitsPerShot 2 — so hitCount:2 fires once per trigger pull, not once per 2 pulls. If the kit means 2 PULLS, the correct value is 4. Unresolved from prose. Recipe: count buffApply events per shot event in a solo run; 1:1 with shots ⇒ keep 2, 1:2 ⇒ use 4.",
    "⚑ HIT-RATE→CORE MAGNITUDE: hitRatePct feeds the engine's hrCoreMult conversion, which is a derived (unmeasured for this unit) lift. Total hitRatePct here is large at max-stacks encoding (13.6 + 27.1 + 20.4 = 61.1 pts) so any error in the conversion slope is amplified. Recipe: HRCORE=0 vs default A/B on a solo run; compare core-bucket share against a footage core-hit count.",
    "⚑ CADENCE TUPLE: SMG pullsPerSec / reloadFrames 81 / hitsPerShot 2 come from the datamine, a known-unreliable field. Every skill2 activation count and every sub-1s stack window depends on it. Recipe: ammo-counter read (shots/sec) from a solo recording, per the datamined-nominal-vs-effective rate rule (effective = 60/ceil(60/nominal)).",
    "⚑ BURST DISTRIBUTED NUKE noFb: set true per the standing rule that a burst-cast instant hit lands before the FB window opens. crit:true is the default rider convention (caster's sheet rate); no core (the text does not say core strike). Recipe: popup colour read on the burst frame — orange body ⇒ crit-eligible confirmed; compare magnitude against the pre-FB vs in-FB expectation to pin noFb.",
    "Burst self-buffs keyed to burstCast (they sit in THIS unit's own burst block and affect self), not fullBurstEnter — she is a lone Burst III, so in a multi-B3 comp fullBurstEnter would over-credit rotations she does not cast."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose (S6). Structure: skill1 = three continuous self-buffs each gated on an Explore Route stage being at max stacks — the stage mechanic is never defined in the prose, so they are modeled as passives with a staircase rampSec (6/10/14s) standing in for progressive stage saturation. skill2 = a three-stage ladder on a 2-normal-attack trigger; per the 'each subsequent effect triggers all effects before it' line, all three blocks are authored as independently active (the ladder is cumulative, not exclusive), each at per-stack% × maxStacks with the same staircase ramp. Stage 2/3 windows (1s / 0.5s) are shorter than plausible accrual time, so those are UPPER BOUNDS. burst = self Attack Damage + Reload Speed for 10s on burstCast, plus a 1736.31% distributed-flavored instant hit on the enemy (crit-eligible, FB-exempt). Reload Speed is retained as a real damage lever (shots fired), not skipped as defensive. Nothing here is calibrated to any board or footage."
}


===== SECTION 7 — DRIVER IMPLEMENTATION =====

--- driver test: scripts/tests/units/quency-escape-queen.test.ts (26 assertions, GREEN vs shipped) ---
// PER-UNIT KIT SPEC — `quency-escape-queen` (Quency: Escape Queen, "qeq" — Attacker/SMG/Water,
// Burst III, cd 40s, ammo 120, hitsPerShot 2, rate_of_fire 1440rpm = 24 pulls/s). Kit-autonomy
// gauntlet 2026-07-25. NOT the base `quency` (SMG/Electric) — a different unit; this spec reasons
// from the slug quency-escape-queen throughout.
//
// One assertion group per FAITHFUL kit line (L1..L12 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (data/characters.json → characters['quency-escape-queen'].skills, lvl 10/10/10):
//   S1 "Secure Route" — three self permanents, EACH gated on an Explore Route stage at max stacks:
//        ■ Stage 1 max → self: Distributed Damage ▲ 49.58% continuously          [L1 FAITHFUL]
//        ■ Stage 2 max → self: Damage dealt when attacking core ▲ 25.25% cont.   [L2 FAITHFUL*]
//        ■ Stage 3 max → self: Critical Rate ▲ 16.73% continuously               [L3 FAITHFUL*]
//   S2 "Explore Route" — after 2 normal attacks; cascade (each stage triggers all before it):
//        ■ Stage 1: self Hit Rate ▲ 1.36% (x10, 2s) + ATK ▲ 2.45% (x10, 2s)       [L4/L5 FAITHFUL]
//        ■ Stage 2 (gated S1 max): Hit Rate ▲ 2.71% (x10, 1s) + ATK ▲ 4.9% (x10,1s)[L6/L7 FAITHFUL]
//        ■ Stage 3 (gated S2 max): Hit Rate ▲ 4.08% (x5, 0.5s) + ATK ▲ 7.36% (x5,0.5s)[L8/L9 FAITHFUL]
//   BU "The Great Thief" — burstCast:
//        ■ self: Attack Damage ▲ 57.08% for 10 sec                               [L10 FAITHFUL]
//        ■ self: Reload Speed ▲ 25.87% for 10 sec                                [L11 FAITHFUL]
//        ■ all enemies: 1736.31% of final ATK as Distributed Damage              [L12 FAITHFUL]
//
// *L2/L3 magnitudes/durations/self-target are FAITHFUL and pinned. Their STAGE GATE is a
//  firing-tracking PROXY (hitCount 20 = 10 pulls for the stage-2-max gate; hitCount 10 = 5 pulls
//  for the stage-3-max gate), because the engine has no "activate when buff X is at N stacks"
//  trigger. The proxy is continuous-while-firing (the real gate is too, at 24 pulls/s) and lapses
//  on the stage window, so the magnitude/duration pin is the load-bearing faithfulness claim; the
//  exact gate TIMING is not pinned (⚑, out-of-domain — would need an engine stack-count gate).
//
// NOT PINNED (documented proxy, ⚑2): the S2 stage-UNLOCK ORDERING. The kit gates stage 2 behind
//  stage-1-max and stage 3 behind stage-2-max; the shipped override builds all six stacks in
//  PARALLEL from the first pull (one hitCount-2 block). This over-credits stage 2/3 during the
//  ~1s ramp and for ~0.4–0.8s after each reload rebuild — small at 24 pulls/s over 180s. The
//  magnitudes / durations / stack-CAPS (stage 1/2 x10, stage 3 x5) ARE faithful and pinned below;
//  only the unlock ordering is approximate. No engine primitive encodes the cascade order today.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1  distributedDamagePct is a DISTRIBUTED-bucket multiplier — it lifts ONLY distributed-flavor
//       damage (her burst nuke), never normals. Proven two ways: the nuke carries mult.distributed
//       1.4958 (= 1 + 0.4958) which collapses to 1.0 when the line is removed, while normals stay
//       1.0 throughout; and the nearest wrong model (a generic attackDamagePct) WOULD lift normals,
//       which the shipped model provably does not.
//   L2  coreDamagePct 25.25 is LIVE because her hit-rate stacks feed core rate (acrForHR) — core
//       hits land, so removing the line drops her total. A dead/innert coreDamagePct would not.
//   L3  critRatePct 16.73 lifts the resolved crit rate on normals; removing it collapses the top
//       crit-rate values (0.3173/0.4637 → 0.15/0.2964).
//   L4-L9 the six distinct stack values, their stack-CAPS (x10/x10/x5) and durations (2s/1s/0.5s)
//       are pinned structurally off the buffApply log; the ATK stacks are load-bearing (removing
//       S2 halves her total) and the hit-rate stacks are LIVE — they feed core rate, so removing
//       ONLY the hit-rate effects (keeping ATK) still drops her total and shifts the core-rate
//       distribution. A wrong cap (stage 3 x10) or a wrong duration would fail the structural pin.
//   L10/L11 burstCast self buffs: exact value + 10s duration + once per cast, self-scoped.
//   L12 the nuke is 1736.31% in the BURST bucket, distributed-flavored (mult.distributed 1.4958),
//       and FB-EXEMPT (burstCast lands before the Full Burst window → never takes the +50% major).
//       Stripping the distributed flavor drops it identically to removing L1 — the two are the two
//       halves of one distributed mechanic.
//
// Fixture: the control comp liter (B1) / crown (B2) / qeq (B3) / helm (B3), boss Fire (Water
// advantage), focus qeq. Two 40s Burst-III casters alternate the ~20s FB cycle, so qeq casts her
// burst ~6x over 180s — enough to exercise every burstCast line. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / qeq 2 / helm 3. */
const QEQ = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('quency-escape-queen'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);

/** L1 reference: her distributed-damage line removed entirely. */
const qeqNoDistrib = withPatchedOverride('quency-escape-queen', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'distributedDamagePct'));
  if (ov.skill1.length === before) throw new Error('qeq S1 distributedDamagePct block missing — fixture is stale');
});
/** L1 counterfactual: the same line as a GENERIC (unscoped) attack-damage buff. */
const qeqDistribAsAtkDmg = withPatchedOverride('quency-escape-queen', (ov) => {
  const e = ov.skill1.flatMap((b: any) => b.effects).find((x: any) => x.stat === 'distributedDamagePct');
  if (!e) throw new Error('qeq S1 distributedDamagePct effect missing — fixture is stale');
  e.stat = 'attackDamagePct';
});
/** L2 reference: her core-damage line removed. */
const qeqNoCore = withPatchedOverride('quency-escape-queen', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'coreDamagePct'));
  if (ov.skill1.length === before) throw new Error('qeq S1 coreDamagePct block missing — fixture is stale');
});
/** L3 reference: her crit-rate line removed. */
const qeqNoCrit = withPatchedOverride('quency-escape-queen', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before) throw new Error('qeq S1 critRatePct block missing — fixture is stale');
});
/** L4-L9 isolation: strip ONLY the hit-rate effects from S2, keeping the three ATK stacks. */
const qeqNoHitRate = withPatchedOverride('quency-escape-queen', (ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'hitRatePct');
    removed += before - b.effects.length;
  }
  if (removed !== 3) throw new Error('qeq S2 expected 3 hitRatePct effects — fixture is stale');
});
/** L4-L9 reference: her entire Explore Route block removed. */
const qeqNoS2 = withPatchedOverride('quency-escape-queen', (ov) => {
  if (!ov.skill2.length) throw new Error('qeq S2 block missing — fixture is stale');
  ov.skill2 = [];
});
/** L12 counterfactual: strip the distributed flavor from the nuke (plain burst damage). */
const qeqPlainNuke = withPatchedOverride('quency-escape-queen', (ov) => {
  let stripped = 0;
  for (const b of ov.burst) for (const e of b.effects) if (e.kind === 'flatDamage' && e.flavor === 'distributed') { delete e.flavor; stripped++; }
  if (!stripped) throw new Error('qeq burst distributed flatDamage missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDistrib = run({ 'quency-escape-queen': qeqNoDistrib });
const distribAsAtkDmg = run({ 'quency-escape-queen': qeqDistribAsAtkDmg });
const noCore = run({ 'quency-escape-queen': qeqNoCore });
const noCrit = run({ 'quency-escape-queen': qeqNoCrit });
const noHitRate = run({ 'quency-escape-queen': qeqNoHitRate });
const noS2 = run({ 'quency-escape-queen': qeqNoS2 });
const plainNuke = run({ 'quency-escape-queen': qeqPlainNuke });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const qeqDamage = (evs: SimEvent[], bucket: Damage['bucket']) =>
  dmg(evs).filter((d) => d.slug === 'quency-escape-queen' && d.bucket === bucket);
const qeqBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'quency-escape-queen');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs qeq applied to herself. */
const qeqBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === QEQ && b.targetIdx === QEQ && b.stat === stat && (value === undefined || b.value === value),
  );
const sum = (ds: Damage[]) => ds.reduce((a, d) => a + d.amount, 0);
const distinct = (xs: number[], dp = 4) => [...new Set(xs.map((x) => x.toFixed(dp)))].sort();

describe('quency-escape-queen — kit spec', () => {
  describe('L1 — S1 Distributed Damage ▲ 49.58% (passive permanent self; feeds the distributed nuke only)', () => {
    const applied = qeqBuffs(base.events, 'distributedDamagePct', 49.58);

    it('is a permanent self buff at the kit magnitude', () => {
      expect(applied.length, 'no distributedDamagePct buff was applied').toBeGreaterThan(0);
      for (const b of applied) expect(b.expiresFrame, 'passive must be permanent (no wall-clock expiry)').toBeNull();
    });

    it('lifts the distributed multiplier on her burst nuke to 1.4958 (= 1 + 0.4958)', () => {
      expect(distinct(qeqDamage(base.events, 'burst').map((d) => d.mult.distributed))).toEqual(['1.4958']);
    });

    it('collapses the nuke multiplier to 1.0 when the line is removed (the buff is live)', () => {
      expect(distinct(qeqDamage(noDistrib.events, 'burst').map((d) => d.mult.distributed))).toEqual(['1.0000']);
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(noDistrib.totals['quency-escape-queen']);
    });

    it('does NOT touch normal attacks (distributed-flavor only)', () => {
      expect(distinct(qeqDamage(base.events, 'normal').map((d) => d.mult.distributed))).toEqual(['1.0000']);
    });

    it('DISCRIMINATING: a generic attackDamagePct would lift normals, which the shipped model does not', () => {
      expect(sum(qeqDamage(distribAsAtkDmg.events, 'normal'))).toBeGreaterThan(sum(qeqDamage(base.events, 'normal')));
    });
  });

  describe('L2 — S1 Core Damage ▲ 25.25% (stage-2-max gate, proxied hitCount/1s, self)', () => {
    const applied = qeqBuffs(base.events, 'coreDamagePct', 25.25);

    it('is a self buff at the kit magnitude, 1s window, single stack', () => {
      expect(applied.length, 'no coreDamagePct buff was applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.maxStacks).toBe(1);
        expect(b.expiresFrame! - b.frame).toBe(1 * FPS);
      }
    });

    it('is LIVE — removing it drops her total (core hits land via the hit-rate→core-rate chain)', () => {
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(noCore.totals['quency-escape-queen']);
    });
  });

  describe('L3 — S1 Critical Rate ▲ 16.73% (stage-3-max gate, proxied hitCount/0.5s, self)', () => {
    const applied = qeqBuffs(base.events, 'critRatePct', 16.73);

    it('is a self buff at the kit magnitude, 0.5s window, single stack', () => {
      expect(applied.length, 'no critRatePct buff was applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.maxStacks).toBe(1);
        expect(b.expiresFrame! - b.frame).toBe(0.5 * FPS);
      }
    });

    it('is LIVE — removing it collapses the top resolved crit rates on normals', () => {
      const baseMax = Math.max(...qeqDamage(base.events, 'normal').map((d) => d.critRate));
      const noCritMax = Math.max(...qeqDamage(noCrit.events, 'normal').map((d) => d.critRate));
      expect(baseMax).toBeGreaterThan(noCritMax);
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(noCrit.totals['quency-escape-queen']);
    });
  });

  describe('L4-L9 — S2 Explore Route staged stacks (after 2 normal attacks; cascade)', () => {
    // [stat, value, maxStacks, durationSec] for each of the six faithful stack lines.
    const STACKS: [string, number, number, number][] = [
      ['atkPct', 2.45, 10, 2],   // L5 stage 1
      ['hitRatePct', 1.36, 10, 2], // L4 stage 1
      ['atkPct', 4.9, 10, 1],    // L7 stage 2
      ['hitRatePct', 2.71, 10, 1], // L6 stage 2
      ['atkPct', 7.36, 5, 0.5],  // L9 stage 3
      ['hitRatePct', 4.08, 5, 0.5], // L8 stage 3
    ];

    it.each(STACKS)('%s ▲ %p%% caps at x%p for %ps, self-scoped', (stat, value, maxStacks, durSec) => {
      const applied = qeqBuffs(base.events, stat, value);
      expect(applied.length, `no ${stat}@${value} buff was applied`).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.maxStacks).toBe(maxStacks);
        expect(b.expiresFrame! - b.frame).toBe(durSec * FPS);
      }
    });

    it('stage 3 caps at x5 while stages 1/2 cap at x10 (the cap is faithful, not a flat x10)', () => {
      expect(qeqBuffs(base.events, 'atkPct', 7.36)[0].maxStacks).toBe(5);
      expect(qeqBuffs(base.events, 'hitRatePct', 4.08)[0].maxStacks).toBe(5);
      expect(qeqBuffs(base.events, 'atkPct', 2.45)[0].maxStacks).toBe(10);
      expect(qeqBuffs(base.events, 'atkPct', 4.9)[0].maxStacks).toBe(10);
    });

    it('the ATK stacks are load-bearing — removing S2 roughly halves her total', () => {
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(noS2.totals['quency-escape-queen'] * 1.5);
    });

    it('the hit-rate stacks are LIVE — they feed core rate, so removing ONLY them still drops her total', () => {
      expect(base.totals['quency-escape-queen']).toBeGreaterThan(noHitRate.totals['quency-escape-queen']);
    });

    it('DISCRIMINATING: removing only the hit-rate stacks shifts the normal core-rate distribution', () => {
      expect(distinct(qeqDamage(base.events, 'normal').map((d) => d.coreRate))).not.toEqual(
        distinct(qeqDamage(noHitRate.events, 'normal').map((d) => d.coreRate)),
      );
    });
  });

  describe('L10 — burst Attack Damage ▲ 57.08% for 10 sec (burstCast, self)', () => {
    const applied = qeqBuffs(base.events, 'attackDamagePct', 57.08);
    const casts = qeqBursts(base.events);

    it('is the kit magnitude for 10s, self-scoped', () => {
      expect(casts.length, 'qeq never casts her burst').toBeGreaterThan(0);
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('fires once per burst cast', () => {
      expect([...new Set(applied.map((b) => b.frame))].length).toBe(casts.length);
    });
  });

  describe('L11 — burst Reload Speed ▲ 25.87% for 10 sec (burstCast, self)', () => {
    const applied = qeqBuffs(base.events, 'reloadSpeedPct', 25.87);
    const casts = qeqBursts(base.events);

    it('is the kit magnitude for 10s, once per cast, self-scoped', () => {
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect([...new Set(applied.map((b) => b.frame))].length).toBe(casts.length);
    });
  });

  describe('L12 — burst nuke: 1736.31% of final ATK as Distributed Damage (burstCast, all enemies)', () => {
    const nukes = qeqDamage(base.events, 'burst').filter((d) => d.srcSlot === 'burst');
    const casts = qeqBursts(base.events);

    it('lands once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts.length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1736.31]);
    });

    it('is distributed-flavored (takes the 1.4958 multiplier from L1)', () => {
      expect(distinct(nukes.map((d) => d.mult.distributed))).toEqual(['1.4958']);
    });

    it('is FB-exempt — the cast lands before the Full Burst window, so it never takes the +50% major', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual([]);
    });

    it('DISCRIMINATING: stripping the distributed flavor drops the nuke (== removing L1)', () => {
      expect(sum(nukes)).toBeGreaterThan(sum(qeqDamage(plainNuke.events, 'burst')));
      expect(distinct(qeqDamage(plainNuke.events, 'burst').map((d) => d.mult.distributed))).toEqual(['1.0000']);
    });
  });
});


--- driver override: src/skills/overrides/quency-escape-queen.json ---
{
  "note": "Kit-autonomy gauntlet 2026-07-25: VALIDATED — all 12 kit lines FAITHFUL (magnitudes/durations/stack-caps exact vs datamine; cross-family corroborated S2b fable / S5/S6/S7 opus; GO). OUT-OF-DOMAIN ⚑ (none block GO): (a) S2 stage-UNLOCK ORDERING not encoded — the parallel build over-credits stage-2/3 by ~0.4–0.8s per ramp/post-reload rebuild (~0.5–1% of fight-total at 24 pulls/s); recipe: needs an engine stack-count-gate / cascade-order primitive to model the real stage-1→2→3 unlock; tier: engine-primitive (out-of-domain). (b) S1 stage-gate TIMING is proxied — S1a is a passive, faithful-IN-EFFECT because its only consumer (the 1736.31% distributed nuke) first fires ~5.4s, far later than the ~1s stage-1 build, and the 2s stage-1 window outlasts the 1.35s reload, so the frame-0 apply has zero observable effect on any damage instance; S1b (hitCount 20 / 1s) and S1c (hitCount 10 / 0.5s) carry exact magnitudes with approximate gate timing (the hit-counter carries over reloads → slightly optimistic rebuild); recipe: same engine stack-count-gate primitive; tier: engine-primitive. (c) HR→core conversion slope is engine-global measured-only (the kit hitRatePct magnitudes are DATAMINED-true). Builds on kit-parse AUTHOR pass 2026-07-16 (wave 4). KIT MACHINE: S2 (hitCount 2 = every pull at hitsPerShot 2) builds the Explore Route: stage-1 stacks (ATK 2.45 ×10, 2s + Hit Rate 1.36 ×10, 2s), stage-2 (ATK 4.9 ×10, 1s + HR 2.71 ×10, 1s; kit-gated on stage-1 max), stage-3 (ATK 7.36 ×5, 0.5s + HR 4.08 ×5, 0.5s; gated on stage-2 max). ENCODING: all six stacks on ONE hitCount-2 self block — the 'each subsequent effect triggers all effects before it' cascade means at stage 3 every activation applies all stages; the stage-unlock ORDERING is NOT encoded (⚑4: parallel build over-credits stage-2/3 by ~0.4–0.8s per ramp/post-reload rebuild — small at 24 pulls/s). Stack uptime is SELF-SIMULATED: stage-1 (2s) survives the 1.35s reload; stage-2 (1s) and stage-3 (0.5s) lapse each reload and rebuild on resume (engine buff refresh = re-apply per pull, distinct values = distinct co-stacking keys). Peak while firing: ATK +110.3%, Hit Rate +61.1% (hitRatePct LIVE since CONE_DELTA 2026-07-19 — feeds her SMG core rate via acrForHR; HARD RULE 4 — kept, ⚑5 in-game core-rate lift unmeasured). S1 = three Explore-Route-max-GATED self permanents, encoded as firing-tracking proxies rather than blind passives: S1a Distributed Damage 49.58 @stage-1 max → passive (2s stack window outlasts reload → effectively permanent; only boosts her distributed hits = the burst nuke); S1b core-dmg 25.25 @stage-2 max → hitCount 20 (=10 pulls = the 10-stack rebuild) dur 1s (mirrors the real gate: continuous while firing, lapses ~1s into reload, ~0.42s rebuild — ⚑3 proxy, hit-counter carries over reloads so rebuild is slightly optimistic); S1c crit 16.73 @stage-3 max → hitCount 10 (=5 pulls) dur 0.5s (same construction). BURST: burstCast self attackDamagePct 57.08 + reloadSpeedPct 25.87 (10s, prior 9 — reload speed = shot count) + 1736.31% distributed nuke on the boss (burstCast → auto-FB-exempt; S1a's +49.58 distributed bucket applies to it at cast — ⚑6 verify vs popup). ⚑1 MANDATORY cadence tuple: pullsPerSec 24 (datamined rate_of_fire 1440), reloadFrames 81, reload_start_ammo 119 (near-full rolling start — verify). ⚑2 'after 2 normal attacks' hits-vs-pulls ambiguity (count 2 hits = per pull; if it means 2 SHOTS use count 4 — steady-state insensitive, ramp-only). No noFb anywhere (prior 2 default); noRange automatic. Nothing skipped — unmodeled arrays empty by audit.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: the three Explore-Route-max gates are firing-tracking proxies (passive / hitCount-threshold), not a real stack-count gate — rebuild timing after reloads is approximate (⚑)",
    "skill2: stage-2/stage-3 stacks build in parallel with stage-1 (the kit's stage-unlock ordering is not encoded) — slight over-credit during ramp/post-reload (⚑)",
    "skill2: Hit Rate stacks modeled as hitRatePct — LIVE since CONE_DELTA (2026-07-19: feeds her SMG core rate via acrForHR); in-game magnitude of the core-rate lift unmeasured (⚑)",
    "all: cadence = datamined 24 pulls/s (SHOT rate = rate_of_fire 1440rpm/60). muzzle_count 2 → 48 bullets/s, but the shot damage SPLITS over the 2 bullets (nAM 10.12 = per-bullet 5.06 × 2 muzzles, already baked in), so throughput = 24 shots × 10.12 is self-consistent, NOT over-modeled (owner-confirmed 2026-07-19). reloadFrames 81 still raw datamine (⚑). Her flag-off HOT baseline is the kit (Explore-Route stage-2/3 parallel-build over-credit, ⚑2), not cadence — deferred to the kit audit."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "distributedDamagePct", "value": 49.58 }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 20 },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "coreDamagePct", "value": 25.25, "durationSec": 1, "maxStacks": 1 }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 10 },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "critRatePct", "value": 16.73, "durationSec": 0.5, "maxStacks": 1 }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "hitCount", "count": 2 },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 2.45, "durationSec": 2, "maxStacks": 10 },
        { "kind": "buff", "stat": "hitRatePct", "value": 1.36, "durationSec": 2, "maxStacks": 10 },
        { "kind": "buff", "stat": "atkPct", "value": 4.9, "durationSec": 1, "maxStacks": 10 },
        { "kind": "buff", "stat": "hitRatePct", "value": 2.71, "durationSec": 1, "maxStacks": 10 },
        { "kind": "buff", "stat": "atkPct", "value": 7.36, "durationSec": 0.5, "maxStacks": 5 },
        { "kind": "buff", "stat": "hitRatePct", "value": 4.08, "durationSec": 0.5, "maxStacks": 5 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "attackDamagePct", "value": 57.08, "durationSec": 10 },
        { "kind": "buff", "stat": "reloadSpeedPct", "value": 25.87, "durationSec": 10 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "flatDamage", "atkPct": 1736.31, "flavor": "distributed" }
      ]
    }
  ]
}
