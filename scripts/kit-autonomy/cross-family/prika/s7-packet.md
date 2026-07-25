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

# MECHANICS SSOT (authoritative game mechanics)

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

# GROUND TRUTH — prika kit prose + base stats (data/characters.json)

```json
{
  "slug": "prika",
  "name": "Prika",
  "weapon": "SR",
  "burst": "II",
  "class": "Supporter",
  "element": "Water",
  "manufacturer": "Tetra",
  "burstCooldownSec": 40,
  "ammo": 6,
  "chargeFrames": 60,
  "reloadFrames": 141,
  "normalAttackMultiplier": 69.04,
  "chargeMultiplier": 250,
  "skills": {
    "skill1": "■ Activates when performing a Full Charge attack. Affects all allies.\nProjectile Explosion Damage ▲ 20% for 3 sec.\nPierce Damage ▲ 13.09% for 3 sec.\nATK ▲ 20% of the skill user's ATK for 3 sec.\n■ Activates only while in Performance status. Affects self.\nOutgoing healing ▲ 49.92% continuously.\nGains Pierce. This effect is continuous.",
    "skill2": "■ Activates when entering Full Burst. Affects self.\nMax HP ▲ 19.98% for 10 sec.\n■ Activates when Sing Along takes effect while Prika is in Performance status.\nEncore\nFunction: Extends the duration of Performance for Prika and strengthens allies.\nEffect 1: Affects the member who initiated Sing Along. Assigned Part: Singing. This effect is continuous and cannot be removed.\nEffect 2: Affects all allies. Performance duration ▲ 21 sec.\nEffect 3: Affects all allies. Attack Damage ▲ 25.01% for 10 sec.\nEffect 4: Affects self. Cooldown of Burst Skill ▲ 21 sec.",
    "burst": "■ Affects all allies.\nPerformance\nFunction: Strengthens allies and restores HP.\nEffect 1: Restores 3.04% of the skill user's final max HP as HP every 1 sec for 25 sec. This effect cannot be removed.\nEffect 2: Charge Damage ▲ 25% for 25 sec. This effect cannot be removed."
  },
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 84,
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
    "resourceId": 601
  }
}
```

---


=== DRIVER POSITION (qwen) — for the judge ===
VERDICT SOUGHT: GO (cross-family corroborated) with documented residuals.
CONVERGENCE (all 3 cross-family roles — S2b fable, S5 opus-blind-test, S6 opus-blind-override): the five DAMAGE-RELEVANT lines are faithful — S1 projectileExplosionPct 20/3s, S1 pierceDamagePct 13.09/3s, S1 casterAtkPct (20% of CASTER ATK, flat, identical on every ally), burst chargeDamagePct 25/25s on burstCast; plus the burstCdr -21 cooldown-INCREASE sign (driver P6). The S6 blind override is BYTE-IDENTICAL to the driver on the S1 triad + burst chargeDamage. The S5 blind test PASSED its S1 assertions vs the driver override.
DIVERGENCES (all documented as flags with estimate+recipe+tier in the test header + override note):
  (1) Gains Pierce — driver FLAGS (measurement-gated on the owner's explicit hold); blind/fable MODEL it. Driver rationale: MEASURED>FUDGE + the owner explicitly held this line "pending a popup measurement" (probe-runs 2026-07-14 inconclusive); the gauntlet has no new measurement, so it flags rather than enacts. Estimate ~+8% personal SR damage; recipe = Prika-focus popup pass; tier 2.
  (2) Encore proxy — driver/shipped models a solo-mode fullBurstEnter proxy (owner's deliberate documented choice); blind/fable leave it UNMODELED (over-credit in non-Mint comps). Driver does NOT unilaterally remove the owner's modeling choice; the test pins what ships + the flag names the over-credit.
  (3) Burst HoT — driver omits (heal-only, documented caveat); blind/fable model ticks:25. Recipe documented; tier 2.
  (4) Max HP — driver omits (inert); blind models (inert future-consumer stat). Both agree zero damage. No material divergence.
NO REAL-GOTCHA in any modeled line. NO silent drops (every skipped line is verbatim in unmodeled + caveats). NO ignored-effect blocks. The S5 blind test's red status is explained by its broken two-B2 fixture (its own sanity gate failed) + the documented Encore divergence.

---

# S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5) + driver reconciliation

```json
{
  "slug": "prika",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Projectile Explosion Damage ▲ 20%",
      "disposition": "FAITHFUL",
      "scope": "Damage-Up-bucket stat scoped to projectile-explosion-flavored damage only; schema notes only RL kits carry that flavor, so it moves only RL allies",
      "durationSemantics": "durationSec: 3 (wall-clock), refreshed per full-charge shot; uptime is cadence-dependent (charge ~1s + fire interval, lapses across the 141f reload) ⚑ cadence tuple is datamine-unreliable",
      "triggerIdentity": "shotFired on an always-full-charging SR (every pull = a Full Charge attack); NOT chargeCounter (no phase cycling stated), NOT interval",
      "targetSet": "allies (all, including self)",
      "nearestWrongModel": "Encoded as generic attackDamagePct 20% for the whole team — over-credits every non-RL ally on every shot",
      "distinguishingAssertion": "After prika's first shot, buffApply {stat:'projectileExplosionPct', value:20} appears for all 5 units; zeroing this effect leaves totals(res) unchanged in an RL-free comp (RED if attackDamagePct: totals move)",
      "inertness": "Must move NOTHING in a comp with no RL ally / no projectileExplosion-flavored damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Pierce Damage ▲ 13.09% for 3 sec",
      "disposition": "FAITHFUL",
      "scope": "pierceDamagePct — scoped to pierce-flavored damage; schema marks it parsed-but-inert in v1",
      "durationSemantics": "durationSec: 3, refreshed per full-charge shot",
      "triggerIdentity": "Same block as above: shotFired (full-charge attack)",
      "targetSet": "allies (all, including self)",
      "nearestWrongModel": "Silently dropped, or promoted to attackDamagePct because pierceDamagePct 'does nothing'",
      "distinguishingAssertion": "buffApply {stat:'pierceDamagePct', value:13.09, durationSec≈3} emitted per shot; totals unchanged when zeroed (inert stat kept for completeness — RED if any damage moves)",
      "inertness": "Must not move any damage bucket in v1 (partless boss)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 20% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "Caster-scaled flat ATK add — 20% of PRIKA's ATK, not of each target's",
      "durationSemantics": "durationSec: 3, refreshed per full-charge shot → near-continuous while firing, lapses during her 141f reload / any non-firing window",
      "triggerIdentity": "shotFired (full-charge attack) — the ally ATK feed dies whenever prika stops shooting; NOT passive",
      "targetSet": "allies (all, including self)",
      "nearestWrongModel": "atkPct 20 (scales each target's OWN ATK) — over-credits high-ATK carries since prika is a low-ATK SR supporter; second nearest: passive trigger (no reload lapse)",
      "distinguishingAssertion": "buffApply {stat:'casterAtkPct'} whose value equals 0.20 × prika.staticAtk (a flat number, IDENTICAL on every target); RED under atkPct where value=20 and each target scales differently. Carry totals drop when prika's firing is suppressed",
      "inertness": "No ATK feed before her first full-charge shot (t=0 pre-charge window)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Outgoing healing ▲ 49.92% continuously",
      "disposition": "UNMODELED",
      "scope": "Heal-amount modifier; engine's heal effect carries no HP magnitude, so there is nothing for it to scale",
      "durationSemantics": "'continuously' = for the life of Performance status (her burst window), not permanent",
      "triggerIdentity": "Status-gated passive: active only while Performance (own-burst status) is live",
      "targetSet": "self",
      "nearestWrongModel": "Encoded as some damage/stat buff to make it 'do something', or the Performance gate dropped (whole-fight)",
      "distinguishingAssertion": "No buffApply for any damage stat from this line; goes verbatim in unmodeled.skill1",
      "inertness": "Must move zero damage; must not appear as a modeled block",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Gains Pierce. This effect is continuous",
      "disposition": "FAITHFUL",
      "scope": "Pierce tag on her own shots, ONLY while in Performance status (her burst's 25s window)",
      "durationSemantics": "'continuous' WITHIN Performance — i.e. windowed to Performance's duration (25s per cast, CD 40s → ~62% uptime), NOT whole-fight",
      "triggerIdentity": "burstCast (Performance opens only when prika casts her own burst) + gainPierce effect with durationSec matching Performance (25); NOT top-level hasPierce:true, NOT fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "Top-level hasPierce:true (whole-fight pierce) — over-tags every pre-burst and between-Performance shot; the schema explicitly says a boolean cannot window pierce, use a gainPierce effect",
      "distinguishingAssertion": "Shots BEFORE her first burstCast carry no pierce tag; shots inside the 25s post-cast window do; shots after Performance lapses (25–40s post-cast) do not. RED under hasPierce:true (pierce from frame 0)",
      "inertness": "Pre-burst shots must be pierce-free; likely damage-inert vs the partless boss but the tag must still be windowed correctly",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Max HP ▲ 19.98% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Self Max-HP stat; prika has no atkOfMaxHpPct scaler, so offensively inert (her HoT heals no modeled HP pool either); keep as a future-consumer stat per taxonomy §7",
      "durationSemantics": "durationSec: 10 (wall-clock)",
      "triggerIdentity": "fullBurstEnter — ANY team Full Burst, including rotations where prika did not burst; NOT burstCast",
      "targetSet": "self (targetMaxHpPct — % of her OWN Max HP)",
      "nearestWrongModel": "burstCast keying (fires only on her own rotations — under-fires in a comp where the other B2 bursts); or casterMaxHpPct/ally-scoped",
      "distinguishingAssertion": "buffApply {stat:'maxHpFlat', value≈0.1998×prika.maxHp, targetSlug:'prika'} on EVERY fullBurstStart, even rotations another B2 cast; RED under burstCast (missing on those rotations). totals(res) identical with the effect zeroed",
      "inertness": "Zero damage movement for any unit — pure stat bookkeeping",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when Sing Along takes effect",
      "disposition": "UNMODELED",
      "scope": "Entire Encore block (Effects 1–4) is gated on a CROSS-UNIT event — another unit initiating 'Sing Along' while prika is in Performance. The engine has no Sing-Along event channel and (to my knowledge) no roster carrier",
      "durationSemantics": "Effect 2: Performance duration ▲ 21 sec (window EXTENSION — would also extend the skill1 pierce/healing and burst 25s effects); Effect 3: 10 sec; Effect 4: permanent CD shift per proc",
      "triggerIdentity": "Cross-unit status handshake — no TriggerDef exists for it; UNMODELED verbatim, never approximated by fullBurstEnter/interval",
      "targetSet": "E1: the Sing-Along initiator; E2/E3: all allies; E4: self",
      "nearestWrongModel": "Modeling Effect 3 (Attack Damage ▲ 25.01%) as an unconditionally-triggered team buff (e.g. on FB enter) — pure over-credit with no initiator present; or reading Effect 4 'Cooldown of Burst Skill ▲ 21 sec' as a cooldown REDUCTION (it is a self-NERF: 40s → 61s)",
      "distinguishingAssertion": "No buffApply for attackDamagePct 25.01 ever appears in a comp without a Sing-Along initiator; prika's burstCast events stay on the base 40s cooldown cadence. RED if any Encore effect fires",
      "inertness": "ALL four Encore effects must move nothing in any current comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Restores 3.04% … every 1 sec for 25 sec",
      "disposition": "FAITHFUL",
      "scope": "Heal-over-time to ALL allies — HP amount unmodeled, but the recovery EVENTS are the payload: taxonomy §4, a heal inert alone drives teammates' on-recovery triggers (crown sits in the control comp)",
      "durationSemantics": "ticks:25, intervalSec:1 — 25 discrete recovery events over 25s per cast; 'cannot be removed' is dispel text, no-op here",
      "triggerIdentity": "burstCast (her own Burst II cast); heal effect with ticks — NOT a single instant heal, NOT fullBurstEnter",
      "targetSet": "allies (all, including self) — each tick fires every recipient's 'recovery' trigger",
      "nearestWrongModel": "kind:'heal' with default ticks:1 — one recovery event per cast instead of 25, starving on-recovery consumers (crown) for the other 24 seconds",
      "distinguishingAssertion": "Per prika burstCast, exactly 25 recovery-driven activations spaced ~60 frames apart reach each ally; crown's recovery-triggered buffApply stream refreshes throughout the 25s window. RED under ticks:1 (crown's consumer fires once then lapses)",
      "inertness": "Zero direct damage; movement comes ONLY via recovery-consumers — in a comp with no on-recovery kit, totals must not change",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Charge Damage ▲ 25% for 25 sec",
      "disposition": "FAITHFUL",
      "scope": "chargeDamagePct — additive points in the CHARGE bucket only; moves charge-weapon allies (SR/RL, incl. prika's own full-charge shots), inert for non-charge carries",
      "durationSemantics": "durationSec: 25, hard wall-clock; vs her 40s CD → ~62.5% uptime steady-state. NOT 10s, NOT permanent ('cannot be removed' = dispel-proof only)",
      "triggerIdentity": "burstCast — fires ONLY on rotations prika herself bursts; she is Burst II, so in any comp with another B2 (e.g. crown in controlComp) burst-cast vs FB-enter genuinely diverge",
      "targetSet": "allies (all, including self)",
      "nearestWrongModel": "fullBurstEnter keying — the buff would apply on EVERY team Full Burst including rotations the other B2 casts, roughly doubling uptime in a two-B2 comp",
      "distinguishingAssertion": "buffApply {stat:'chargeDamagePct', value:25, durationSec 25→expiresFrame≈castFrame+1500} appears ONLY on rotations where a burstCast event from prika precedes it; on an FB where the other B2 cast, NO such buffApply. RED under fullBurstEnter",
      "inertness": "Must not lift the normal/core buckets of non-charge weapons; no application on FBs prika sat out",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Projectile Explosion Damage ▲ 20% (allies, per full-charge, 3s)",
    "skill1:Pierce Damage ▲ 13.09% (allies, per full-charge, 3s — inert-in-v1 stat, still encoded)",
    "skill1:ATK ▲ 20% of skill user's ATK (casterAtkPct flat, allies, 3s refresh)",
    "skill1:Gains Pierce while in Performance (gainPierce windowed to burst, NOT hasPierce)",
    "skill2:Max HP ▲ 19.98% on fullBurstEnter (self, 10s, offensively inert)",
    "burst:HoT 3.04%/1s×25 (ticks:25 recovery stream — tandem feed)",
    "burst:Charge Damage ▲ 25% for 25 sec (burstCast-keyed)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Outgoing healing ▲ 49.92% continuously."
    ],
    "skill2": [
      "■ Activates when Sing Along takes effect while Prika is in Performance status. Encore — Function: Extends the duration of Performance for Prika and strengthens allies.",
      "Effect 1: Affects the member who initiated Sing Along. Assigned Part: Singing. This effect is continuous and cannot be removed.",
      "Effect 2: Affects all allies. Performance duration ▲ 21 sec.",
      "Effect 3: Affects all allies. Attack Damage ▲ 25.01% for 10 sec.",
      "Effect 4: Affects self. Cooldown of Burst Skill ▲ 21 sec."
    ],
    "burst": []
  },
  "notes": "Reconciliation points, highest-risk first. (1) BURST-SLOT FIXTURE: prika is Burst II — controlComp() already seats crown at B2, so a naive fixture may leave prika NEVER casting her burst (zero Performance, zero HoT, zero chargeDamagePct, zero pierce). Tests must build a comp where prika actually occupies/wins the B2 cast, and the burstCast-vs-fullBurstEnter distinction for the burst block is only observable in a comp where the OTHER B2 sometimes bursts — expect a shared-prior misread here (keying Charge Damage + Performance to fullBurstEnter over-credits ~2× uptime). (2) PERFORMANCE = her own burst status: the skill1 self block (healing + pierce) must be windowed to the 25s post-cast window; the classic misread is top-level hasPierce:true (whole-fight). Also note the burst's two 'cannot be removed' 25s effects and the Performance window share duration — if the driver modeled Performance as a mode or a 10s FB window instead of 25s, pierce and charge-damage uptime both break. (3) casterAtkPct vs atkPct on the skill1 ally feed — buffApply value must be a FLAT number equal on all targets. (4) The HoT must be ticks:25 — with crown in-comp this is the biggest tandem lever; ticks:1 is the near-certain misread. (5) Encore is entirely cross-unit-gated (Sing Along has no engine channel and, afaik, no roster initiator); any modeled Encore effect — especially the 25.01% Attack Damage team buff — is an over-credit, and Effect 4 is a burst-CD INCREASE (self-nerf), not a reduction; if a Sing-Along carrier ever lands, prika's effective CD becomes 61s while Encore procs, which also invalidates any 40s-cadence assertion. (6) Uptime of all three skill1 ally buffs rides her charge cadence (chargeFrames 60 ⚑ ALWAYS-flag) and lapses across the 141f reload — assert a refresh-per-shot pattern, not a permanent buff.",
  "model": "claude-fable-5",
  "driverReconciliation": {
    "driver": "qwen",
    "reviewer": "claude-fable-5",
    "converged": [
      "S1 projectileExplosionPct 20/3s/allies/shotFired — FAITHFUL, damage-inert at scope (RL-only flavor). P1 pins value/dur/target.",
      "S1 pierceDamagePct 13.09/3s/allies — FAITHFUL, damage-inert in v1 (byte-identical totals w/o). P2 pins value + inertness.",
      "S1 casterAtkPct (20% of CASTER ATK, flat, identical on all targets) — FAITHFUL; both name atkPct as nearest-wrong. P3 pins flat caster-scoped value + RED vs atkPct.",
      "Burst chargeDamagePct 25/25s/allies, burstCast-keyed — FAITHFUL. P5 pins value/dur/target/cadence.",
      "S2 Encore Effect 4 \"Cooldown ▲21s\" = INCREASE (burstCdr -21 → 40s→61s) — both agree on the sign. P6 pins via cast count (3 vs 9 for the decrease misread).",
      "Max HP 19.98% — both agree damage-inert at scope (no atkOfMaxHpPct scaler). Driver keeps UNMODELED (reviewer notes load-bearing only for a hypothetical future HP-consumer; zero damage now).",
      "Fixture: reviewer warned controlComp seats crown at B2 (prika would never cast); driver uses a custom liter/prika/ada chain (prika sole B2, casts 3×). Documented in header."
    ],
    "divergences": [
      {
        "line": "S1 \"Gains Pierce continuously while in Performance\"",
        "reviewer": "FAITHFUL + load-bearing — model as gainPierce durationSec 25 on burstCast (windowed to Performance), NOT top-level hasPierce.",
        "driver": "UNMODELED ⚑ MEASUREMENT-GATED. The owner EXPLICITLY held this line \"pending a popup measurement\" (probe-runs 2026-07-14 inconclusive); the gauntlet has no new measurement data. Per MEASURED>FUDGE + respect for the owner hold, driver FLAGS rather than enacts. Estimate (~+8% personal SR damage from her own 13.09% pierceDamagePct going live during the 25s Performance window, ~62% uptime), recipe (Prika-focus popup pass confirming the Pierce tag + in/out-window SR uplift), tier 2 — all in the test header. This is the F1 cold hypothesis; the test P2 inertness assertion captures the mechanism (pierceDamagePct applies but spends nothing until a Pierce tag exists).",
        "resolution": "FLAG (⚑). Reviewer is mechanically correct that gainPierce is the faithful encoding IF enacted; driver defers enactment to the owner measurement the line is explicitly gated on."
      },
      {
        "line": "Burst Effect 1 HoT (3.04% caster max HP / 1s × 25s, all allies)",
        "reviewer": "FAITHFUL + load-bearing — model as heal ticks:25/intervalSec:1 (25 recovery events per cast) to drive crown-type on-recovery consumers; nearest-wrong ticks:1.",
        "driver": "UNMODELED ⚑. Heal-only (zero direct damage to Prika); the shipped override documents the omission as a caveat (\"recovery consumers will not proc off Prika\"). No owner measurement-gate, but minimum-edit principle + no crown in the graded fixture keep it as a documented gap. Recipe: add heal ticks:25 on burstCast/allies if a crown-type consumer is graded. Tier 2.",
        "resolution": "FLAG (⚑). Both agree the kit line exists and the engine could model it (helm precedent); driver keeps the shipped omission as a documented, recipe-backed flag rather than expanding scope into a heal that moves no Prika damage."
      },
      {
        "line": "S2 Encore (Effects 1-4) trigger",
        "reviewer": "Entire Encore block is cross-unit-gated (Sing Along has no engine channel / no roster initiator) → leave UNMODELED verbatim, NEVER approximated by fullBurstEnter; any modeled Encore effect is an over-credit.",
        "driver": "Shipped override models Effect 3 (attackDamagePct 25.01/10s) + Effect 4 (burstCdr -21) as a SOLO-MODE PROXY on fullBurstEnter/burstCast — the owner deliberate, documented approximation (\"Sing Along/Performance is an untracked mechanic, so I approximate it as firing once per rotation on Full Burst entry\"). The test P4/P6 PIN this shipped encoding (value/dur/target/cadence/sign); the header ⚑ documents that the solo proxy OVER-CREDITS in non-Mint comps (the real trigger needs a Sing Along caster). Duet mode (w/ Mint) needs explicit mode selection and is inert in this harness.",
        "resolution": "PIN shipped encoding + FLAG the proxy over-credit (⚑). Driver does not unilaterally remove the owner modeling choice; the test pins what ships and the flag names the approximation."
      }
    ],
    "verdict": "CONVERGED on all 5 damage-relevant lines + burstCdr sign; 3 divergences resolved as documented ⚑ flags (Gains Pierce measurement-gated; burst HoT heal-only; Encore proxy over-credit). No REAL-GOTCHA in the modeled lines. Test is GREEN vs shipped (16/16)."
  }
}
```

---

# S5 BLIND TEST (claude-opus-5) — source + green/red vs the DRIVER override

S5 BLIND TEST (blind/prika.test.ts) run vs the DRIVER override: 8 failed / 4 passed / 5 skipped (17 total).
CRITICAL: the blind role's OWN non-vacuity sanity test FAILED ("the control comp reaches Full Burst, prika deals damage, and Performance actually casts") — its fixture controlComp('prika', true) = liter/crown/prika/helm seats crown at B2 alongside prika, so crown wins the B2 cast and prika NEVER casts Performance. Every burst-dependent blind assertion therefore fails as a FIXTURE ARTIFACT (chargeDamagePct reaches 0 allies; charge-bucket lift is 0; heal ticks 0), NOT as evidence against the driver override. The driver's fixture (liter/prika/ada, prika sole B2) has prika casting 3x — verified.
MEANINGFUL PASSES (prika fires S1 regardless of bursting): "ATK 20% of CASTER ATK reaches ALL FOUR allies, flat-resolved (not the raw 20)" PASS; "fires per FULL CHARGE — not passively and not on Full Burst entry" PASS; "carries Projectile Explosion 20% and Pierce Damage 13.09% at kit magnitude to all allies" PASS. => blind test independently CONFIRMS the driver's S1 encoding (casterAtkPct flat + projExpl 20 + pierce 13.09 + shotFired trigger).
MEANINGFUL FAIL: "Encore does not leak: no Sing Along carrier is in this comp, so Attack Damage 25.01% must never apply" FAILED — the driver/shipped override DOES apply 25.01% (solo proxy). This is the documented Encore-proxy divergence, not an encoding error.
SKIPPED (blind marked GAP, not testable): Gains Pierce (pierce damage-inert in v1), burstCdr cooldown-INCREASE (blind误判 "no primitive" — engine supports negative seconds), Performance duration +21s, Assigned Part, heal magnitude, Outgoing healing.

```typescript
/**
 * prika (Prika) — SR / Water / Supporter / Burst II. BLIND per-unit kit-spec test (role s5):
 * written from the kit prose ALONE, with no sight of the driver override, tests, or reasoning.
 *
 * KIT (structural read of the ■ headers / Affects clauses / stat keyword before ▲):
 *  S1 blockA  ■ "when performing a Full Charge attack" / Affects all allies
 *               - Projectile Explosion Damage ▲20%   3 sec -> projectileExplosionPct 20
 *               - Pierce Damage ▲13.09%              3 sec -> pierceDamagePct 13.09 (v1-inert stat, still owed)
 *               - ATK ▲20% "of the skill user ATK"    3 sec -> casterAtkPct 20 (FLAT-resolved at apply time)
 *  S1 blockB  ■ "only while in Performance status" / self: Outgoing healing ▲49.92% (continuous),
 *               Gains Pierce (continuous)
 *  S2 blockA  ■ "when entering Full Burst" / self: Max HP ▲19.98% for 10 sec -> fullBurstEnter + Max-HP
 *               grant (emitted under stat maxHpFlat whichever HP stat key was used)
 *  S2 blockB  ■ Encore — gated on "Sing Along takes effect while ... in Performance status": a CROSS-UNIT
 *               trigger. No Sing Along carrier exists in this fixture, so every Encore effect (incl. the
 *               modelable Attack Damage ▲25.01%) MUST be inert here.
 *  Burst      ■ Performance / all allies: heal 3.04% of caster final Max HP every 1 sec for 25 sec
 *               (25 ticks -> 25 recovery events per ally), Charge Damage ▲25% for 25 sec.
 *
 * FIXTURE: controlComp('prika', true) = liter(B1) / crown(B2) / prika / helm(B3), Fire boss, deterministic.
 *  Prika is Burst II, so this comp holds TWO B2 units; the sanity test below is the explicit non-vacuity gate
 *  that she actually casts Performance (her chargeDamagePct grant is unique in this comp, so the presence of
 *  that buffApply IS the cast evidence — no burstCast identity field needed). helm stays IN: dropping helm
 *  would leave the team with no Burst III and therefore ZERO Full Bursts, which would make the S2
 *  fullBurstEnter line untestable. crown is deliberately kept as the on-recovery consumer for the heal test.
 *
 * TWO DELIBERATE DEFENSES (the packet documents two conflicting shapes; the test must not ride the guess):
 *  - blocksOf() accepts BOTH override slot shapes: slot === Block[] and slot === { blocks: Block[] }.
 *  - runWithEvents() registers one onEvent sink at the top level AND under cfg, then de-dupes by object
 *    identity, so the event log is correct whichever field the harness honours (and is not double-counted).
 *
 * Counterfactual DIFFS (base minus patched) are used instead of raw event counts wherever a teammate could
 * emit the same stat, so liter/crown/helm buffs cannot pollute a count.
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

const SLUG = 'prika';
const ALLIES = ['liter', 'crown', 'prika', 'helm'] as const;
const HP_STATS = new Set(['maxHpPct', 'maxHpFlat', 'casterMaxHpPct', 'targetMaxHpPct']);

type AnyEv = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';

/** Register the sink twice (top level + cfg) and de-dupe by identity — see header. */
function runWithEvents(opts: any): { res: any; events: AnyEv[] } {
  const sink: AnyEv[] = [];
  const onEvent = (ev: AnyEv) => {
    sink.push(ev);
  };
  const res = runComp({ ...opts, onEvent, cfg: { ...(opts?.cfg ?? {}), onEvent } } as any);
  const seen = new Set<AnyEv>();
  const events: AnyEv[] = [];
  for (const ev of sink) {
    if (seen.has(ev)) continue;
    seen.add(ev);
    events.push(ev);
  }
  return { res, events };
}

/** Accepts both documented override slot shapes. */
function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s;
  if (s && Array.isArray(s.blocks)) return s.blocks;
  throw new Error('prika override: no blocks found for slot ' + slot);
}

function eachEffect(ov: any, slot: Slot, fn: (e: any) => void): void {
  for (const b of blocksOf(ov, slot)) for (const e of b.effects ?? []) fn(e);
}

function dropEffects(ov: any, slot: Slot, pred: (e: any) => boolean): void {
  for (const b of blocksOf(ov, slot)) {
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e: any) => !pred(e));
  }
}

function withPrika(mutate: (ov: any) => void): any {
  const opts: any = controlComp(SLUG, true);
  return {
    ...opts,
    overrides: { ...(opts.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, mutate as any) },
  };
}

const applies = (evs: AnyEv[], stat: string, target?: string): AnyEv[] =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' && e.stat === stat && (target === undefined || e.targetSlug === target),
  );
const about = (v: number, want: number, eps = 0.02): boolean => Math.abs(v - want) <= eps;
const dmg = (r: { res: any }, slug: string): number => totals(r.res)[slug];

// ---- hoisted runs (9 × 180 s) ------------------------------------------------------------------
const base = runWithEvents(controlComp(SLUG, true));

const rNoCasterAtk = runWithEvents(
  withPrika((ov) => dropEffects(ov, 'skill1', (e) => e.kind === 'buff' && e.stat === 'casterAtkPct')),
);
const rAtkPctSwap = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'skill1', (e) => {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') e.stat = 'atkPct';
    }),
  ),
);
const rDur1 = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'skill1', (e) => {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') e.durationSec = 1;
    }),
  ),
);
const rDur30 = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'skill1', (e) => {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') e.durationSec = 30;
    }),
  ),
);
const rNoCharge = runWithEvents(
  withPrika((ov) =>
    dropEffects(ov, 'burst', (e) => e.kind === 'buff' && e.stat === 'chargeDamagePct'),
  ),
);
const rChargeAsAttack = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'burst', (e) => {
      if (e.kind === 'buff' && e.stat === 'chargeDamagePct') e.stat = 'attackDamagePct';
    }),
  ),
);
const rHealOnce = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'burst', (e) => {
      if (e.kind === 'heal') {
        e.ticks = 1;
        delete e.intervalSec;
      }
    }),
  ),
);
const rNoMaxHp = runWithEvents(
  withPrika((ov) => dropEffects(ov, 'skill2', (e) => e.kind === 'buff' && HP_STATS.has(e.stat))),
);

const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;

describe('prika — fixture sanity / non-vacuity', () => {
  it('the control comp reaches Full Burst, prika deals damage, and Performance actually casts', () => {
    expect(fbStarts).toBeGreaterThanOrEqual(3);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // chargeDamagePct ▲25% is unique to prika burst in this comp -> its presence IS proof she cast.
    // If this fails, the two-Burst-II fixture never let her cast and every burst assertion below is vacuous.
    const perf = applies(base.events, 'chargeDamagePct').filter((e) => about(e.value, 25));
    expect(perf.length).toBeGreaterThanOrEqual(4);
  });
});

describe('prika S1 — full-charge all-ally buff (3 sec)', () => {
  it('ATK ▲ 20% of the CASTER ATK reaches ALL FOUR allies, flat-resolved (not the raw 20)', () => {
    for (const s of ALLIES) {
      const d =
        applies(base.events, 'casterAtkPct', s).length -
        applies(rNoCasterAtk.events, 'casterAtkPct', s).length;
      expect(d).toBeGreaterThan(0); // RED under a self-only / excludeSelf target set
    }
    for (const e of applies(base.events, 'casterAtkPct')) {
      expect(e.value).toBeGreaterThan(1000); // flat ATK at apply time, never the kit percentage
    }
  });

  it('fires per FULL CHARGE — not passively and not on Full Burst entry', () => {
    const d =
      applies(base.events, 'casterAtkPct', 'liter').length -
      applies(rNoCasterAtk.events, 'casterAtkPct', 'liter').length;
    expect(d).toBeGreaterThanOrEqual(50); // ~1 charged SR shot/sec over 180 s; a passive would be 1
    expect(d).toBeGreaterThan(3 * fbStarts); // a fullBurstEnter mis-key would be === fbStarts
  });

  it('lasts 3 SECONDS — a bounded wall-clock window, not rounds and not continuous', () => {
    const pierce = applies(base.events, 'pierceDamagePct');
    expect(pierce.length).toBeGreaterThan(0);
    for (const e of pierce) {
      expect(e.durationShots).toBeUndefined(); // "for 3 sec" is never a round count
      expect(typeof e.expiresFrame).toBe('number'); // a continuous encoding would carry no expiry
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
    // 1 s is shorter than her shot interval -> real uptime gaps -> teammate damage must drop.
    expect(dmg(rDur1, 'liter')).toBeLessThan(dmg(base, 'liter'));
    // 30 s papers over the reload gap (only ~0.35 s per 6-shot cycle), so the margin is small but one-sided.
    expect(dmg(rDur30, 'liter')).toBeGreaterThanOrEqual(dmg(base, 'liter'));
  });

  it('is caster-scaled, so an own-ATK (atkPct) encoding lands a different teammate total', () => {
    expect(dmg(rAtkPctSwap, 'liter')).not.toBe(dmg(base, 'liter'));
  });

  it('carries Projectile Explosion ▲20% and Pierce Damage ▲13.09% at kit magnitude to all allies', () => {
    for (const s of ALLIES) {
      expect(
        applies(base.events, 'projectileExplosionPct', s).some((e) => about(e.value, 20)),
      ).toBe(true);
      expect(applies(base.events, 'pierceDamagePct', s).some((e) => about(e.value, 13.09))).toBe(
        true,
      );
    }
  });

  it.skip('S1b Outgoing healing ▲49.92% while in Performance — GAP: heal magnitudes are unmodelled (a heal effect emits a recovery event with no HP amount), so the line has no observable payload', () => {});

  it.skip('S1b Gains Pierce while in Performance — GAP: pierce is damage-inert in v1 (partless boss, pierceDamagePct parsed-but-inert), so gainPierce-gated-on-Performance vs a whole-fight hasPierce flag cannot be discriminated by events or totals; the non-vacuity split (Performance OFF before her first burst, ON for 25 s after) is unobservable for the same reason', () => {});
});

describe('prika S2 — Max HP on Full Burst entry (self, 10 sec)', () => {
  it('applies once per Full Burst ENTRY, to prika only', () => {
    const dSelf =
      applies(base.events, 'maxHpFlat', SLUG).length -
      applies(rNoMaxHp.events, 'maxHpFlat', SLUG).length;
    expect(dSelf).toBe(fbStarts); // a passive would be 1; an interval/shot key would overshoot
    for (const s of ALLIES) {
      if (s === SLUG) continue;
      const d =
        applies(base.events, 'maxHpFlat', s).length - applies(rNoMaxHp.events, 'maxHpFlat', s).length;
      expect(d).toBe(0); // "Affects self" — RED under an allies target set
    }
  });

  it('is offensively inert (prika has no HP-scaling ATK line), so removing it moves nobody', () => {
    for (const s of ALLIES) expect(dmg(rNoMaxHp, s)).toBe(dmg(base, s));
  });

  it('Encore does not leak: no Sing Along carrier is in this comp, so Attack Damage ▲25.01% must never apply', () => {
    const leaked = base.events.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'attackDamagePct' && about(e.value, 25.01),
    );
    expect(leaked).toHaveLength(0);
  });

  it.skip('Encore Effect 2 Performance duration ▲21 sec — GAP: no primitive extends a named ally status window (fullBurstExtend is Full-Burst-only), and the whole Encore branch hangs off a cross-unit Sing Along trigger the schema cannot express', () => {});

  it.skip('Encore Effect 4 Cooldown of Burst Skill ▲21 sec — GAP: burstCdr models a cooldown REDUCTION; the Encore cooldown INCREASE has no primitive', () => {});

  it.skip('Encore Effect 1 Assigned Part Singing — GAP: no assigned-part model (the scope-lock boss is partless)', () => {});
});

describe('prika burst — Performance (all allies, 25 sec)', () => {
  it('Charge Damage ▲25% reaches all four allies with a bounded window', () => {
    for (const s of ALLIES) {
      const ev = applies(base.events, 'chargeDamagePct', s).filter((e) => about(e.value, 25));
      expect(ev.length).toBeGreaterThan(0);
      expect(ev[0].durationShots).toBeUndefined();
      expect(typeof ev[0].expiresFrame).toBe('number');
    }
  });

  it('is CHARGE-bucket scoped: lifts prika, leaves the SMG ally byte-identical, where a generic Damage Up encoding would move her', () => {
    expect(dmg(base, SLUG)).toBeGreaterThan(dmg(rNoCharge, SLUG));
    expect(dmg(rNoCharge, 'liter')).toBe(dmg(base, 'liter'));
    expect(dmg(rChargeAsAttack, 'liter')).toBeGreaterThan(dmg(base, 'liter'));
  });

  it('heals every 1 sec for 25 sec (25 ticks), keeping on-recovery consumers refreshed', () => {
    const nBuffs = (r: { events: AnyEv[] }) =>
      r.events.filter((e) => e.kind === 'buffApply').length;
    // A single instant heal (ticks omitted) fires crown on-recovery ONCE per burst instead of 25×.
    expect(nBuffs(base)).toBeGreaterThan(nBuffs(rHealOnce));
    expect(nBuffs(base) - nBuffs(rHealOnce)).toBeGreaterThanOrEqual(10);
    expect(dmg(base, 'crown')).toBeGreaterThanOrEqual(dmg(rHealOnce, 'crown'));
  });
});

```

---

# S6 BLIND OVERRIDE (claude-opus-5) + diff vs the DRIVER override

BLIND (S6 opus) vs DRIVER override — line-by-line:
  S1 triad (projExpl 20 / pierce 13.09 / casterAtk 20, shotFired, allies, 3s): IDENTICAL (byte-for-byte).
  Burst chargeDamagePct 25 / 25s on burstCast (allies): IDENTICAL.
  Gains Pierce (S1b, self, while in Performance): BLIND models gainPierce{durationSec:25} on burstCast; DRIVER omits (UNMODELED, measurement-gated on owner hold — probe-runs 2026-07-14 inconclusive). This is the F1 cold hypothesis: Prika carries a pierceDamagePct SOURCE (her own S1) but no Pierce tag, so her own 13.09% is damage-inert on her SR fire (driver verified byte-identical totals with the effect removed) until a Pierce tag is enacted.
  Max HP 19.98% (S2, self, fullBurstEnter): BLIND models targetMaxHpPct 19.98/10s (damage-inert future-consumer stat); DRIVER omits (inert, no atkOfMaxHpPct scaler). Both agree zero damage movement.
  Burst HoT 3.04%/1s x 25s (allies): BLIND models heal{ticks:25,intervalSec:1} (recovery stream for crown-type consumers); DRIVER omits (heal-only, documented caveat, no Prika damage; recipe = add heal ticks:25 if a crown consumer is graded).
  Encore (S2b, all 4 effects): BLIND leaves ENTIRELY UNMODELED (Sing Along is cross-unit-gated, no carrier/schema; "inventing a proxy trigger would over-credit +25.01% Attack Damage"); DRIVER models Effect 3 (attackDamagePct 25.01/10s) + Effect 4 (burstCdr -21 = cooldown INCREASE 40s->61s) as a SOLO-MODE PROXY on fullBurstEnter/burstCast — the owner's deliberate, documented approximation (caveat: over-credits in non-Mint comps). Duet mode (w/ Mint) needs explicit mode selection.
  burstCdr sign: DRIVER pins seconds:-21 = cooldown INCREASE (engine: burstCdFrames -= round(seconds*FPS); verified 3 casts/180s vs 9 for the +21 decrease misread). S5 blind role MISSED this (claimed "burstCdr models reduction only", skipped it as a GAP); S6 blind role did not encode the Encore at all.

```json
{
  "slug": "prika",
  "skill1": [
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
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 20,
          "durationSec": 3
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 13.09,
          "durationSec": 3
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 20,
          "durationSec": 3
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
          "kind": "gainPierce",
          "durationSec": 25
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 19.98,
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
          "kind": "heal",
          "ticks": 25,
          "intervalSec": 1
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 25,
          "durationSec": 25
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Outgoing healing ▲ 49.92% continuously."
    ],
    "skill2": [
      "■ Activates when Sing Along takes effect while Prika is in Performance status.",
      "Encore",
      "Function: Extends the duration of Performance for Prika and strengthens allies.",
      "Effect 1: Affects the member who initiated Sing Along. Assigned Part: Singing. This effect is continuous and cannot be removed.",
      "Effect 2: Affects all allies. Performance duration ▲ 21 sec.",
      "Effect 3: Affects all allies. Attack Damage ▲ 25.01% for 10 sec.",
      "Effect 4: Affects self. Cooldown of Burst Skill ▲ 21 sec."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ skill1 block 1 trigger: the kit says 'Full Charge attack'; there is no fullCharge TriggerDef. Modeled as shotFired (an SR full-charges every trigger pull). chargeCounter was REJECTED: its effects[] array is phase-indexed, so a 3-effect block would fire one buff per charge instead of all three per charge.",
    "⚑ 'Performance status' is her own burst's named state; the sim has no ally-status channel (targetStatus is enemy-only), so the Performance-gated self-Pierce is keyed to burstCast with durationSec 25 (the burst's own window). Encore's +21 s Performance extension is NOT applied because Encore itself is unmodeled.",
    "⚑ Encore is triggered by 'Sing Along', a mechanic that belongs to ANOTHER unit and has no trigger kind, no carrier, and no teamHas facet in this schema. All four Encore effects are skipped WHOLE — including the damage-bearing Effect 3 (Attack Damage ▲25.01%/10 s, all allies) and the burst-CD line. If a Sing Along carrier is ever added, Effect 3 is the piece that moves the board.",
    "⚑ Buff uptime of the 3 s skill1 window is entirely cadence-driven (ammo 6, chargeFrames 60, reloadFrames 141 — all datamine-unreliable). Uptime is near-continuous while firing and lapses across the reload.",
    "Heal magnitude (3.04% of caster final Max HP per tick) is not representable: the `heal` effect models no HP amount. What IS load-bearing is the RECOVERY-EVENT CADENCE — 25 events at 1 s — which keeps on-recovery consumers refreshed for the full window. Do not collapse to a single tick.",
    "Max HP ▲19.98% (self) is offensively inert here — she carries no atkOfMaxHpPct conversion — but is kept per the HP/DEF-scaler prior (future consumer).",
    "noFb / range / core flags: N/A — this kit has NO flatDamage, dot, or storedHit riders. hitRatePct: N/A (no Hit Rate line). No weapon swap, no stack/currency pool, no multi-projectile split."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Prika (SR/Water/Supporter/Burst II) is a pure support: her only damage contribution to the team is skill1's per-full-charge ally triad (Projectile Explosion 20%, Pierce Damage 13.09%, caster-ATK 20%, 3 s each) plus the burst's team Charge Damage ▲25%/25 s and a 25-tick recovery stream. Self-Pierce is Performance-gated (proxied to her own burst window), not whole-fight, so it is a gainPierce effect and NOT the top-level hasPierce flag. Encore is unmodeled in full — its trigger (Sing Along) is a cross-unit mechanic with no carrier and no schema representation; flagging it is correct, inventing a proxy trigger would over-credit +25.01% Attack Damage to the whole team."
}
```

---

# DRIVER IMPLEMENTATION — scripts/tests/units/prika.test.ts

```typescript
// PER-UNIT KIT SPEC — `prika` (Prika, Supporter/SR/Water, Burst II, cd 40s, ammo 6, chargeFrames 60).
// Kit-autonomy gauntlet 2026-07-25 (driver spec; TDD test-first).
//
// One assertion group per KIT LINE (P1..P6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each
// assertion must discriminate against) — never the encoding under test.
//
// Prika is a BUFFER: her damage contribution is almost entirely the buffs she puts on the team, so
// every load-bearing line is pinned on the buffApply EVENT LOG (value / duration / target-set /
// cadence), not on a damage total. Deterministic (no seed); event-log over totals.
//
// Kit (blablalink prose, data/characters.json → characters.prika.skills; level-10 magnitudes):
//   S1 ■ on Full Charge attack → all allies:                                                (SR auto-full-charges every shot)
//        Projectile Explosion Damage ▲20% for 3 sec                                          [P1]
//        Pierce Damage ▲13.09% for 3 sec                                                     [P2]
//        ATK ▲20% OF THE SKILL USER'S ATK for 3 sec                                          [P3]
//      ■ only while in Performance → self: Outgoing healing ▲49.92% continuously             [inert — no HP pool]
//      ■ only while in Performance → self: Gains Pierce continuously                         [UNMODELED ⚑ — see header]
//   S2 ■ entering Full Burst → self: Max HP ▲19.98% for 10 sec                               [inert — defensive]
//      ■ Encore (when Sing Along takes effect while in Performance):
//        Effect 1: Assigned Part — Singing                                                   [inert — part assignment]
//        Effect 2: Performance duration ▲21 sec                                              [UNMODELED ⚑ — untracked status]
//        Effect 3: all allies: Attack Damage ▲25.01% for 10 sec                              [P4]
//        Effect 4: self: Cooldown of Burst Skill ▲21 sec  (▲ = INCREASE)                     [P6]
//   BU ■ all allies (Performance):
//        Effect 1: restore 3.04% of caster final max HP / 1 sec for 25 sec                   [UNMODELED ⚑ — heal, no recovery event]
//        Effect 2: Charge Damage ▲25% for 25 sec                                             [P5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   P1  pinned at the level-10 magnitude 20, not the level-1 base 11.82 (a stale-parser regression).
//       Damage-INERT at scope lock (SR has no explosion flavor; the only RL in the fixture, ada, is
//       the sole recipient that could spend it) — so it is pinned on the buff EVENT, not a total.
//   P2  pinned at level-10 13.09, not base 7.73. Damage-INERT at scope: no unit in the fixture is
//       Pierce-tagged (verified byte-identical totals with the effect removed), because Prika's own
//       "Gains Pierce" line is UNMODELED (the F1 cold hypothesis, measurement-gated — see below).
//   P3  "20% of the SKILL USER'S ATK" = casterAtkPct: a FLAT add off Prika's ATK, identical to every
//       recipient. The nearest wrong model is atkPct (20% of each target's OWN ATK), which emits the
//       percentage, not a flat caster-scoped number — the assertion provably fails under it.
//   P4  Encore's team Attack Damage, pinned at level-10 25.01 (not base 14.29), 10s, reaching all
//       three allies, firing once per Full Burst entry (solo-mode trigger = fullBurstEnter).
//   P5  the burst's Charge Damage, pinned at level-10 25 (not base 13.88), 25s, all allies, on cast.
//   P6  Encore Effect 4 "Cooldown of Burst Skill ▲21 sec": the ▲ is an INCREASE. burstCdr seconds:-21
//       ADDS 21s to her 40s cooldown (engine: burstCdFrames -= round(seconds*FPS)), so she re-bursts
//       every ~60s (3 casts / 180s). The nearest wrong reading (▲ = decrease, seconds:+21) drops her
//       to a ~19s cooldown → 9 casts. The cast COUNT discriminates the sign.
//
// UNMODELED lines (no assertion — documented, not silently dropped):
//   • S1 Outgoing healing ▲49.92% (self, in Performance) — heal-potency stat; no HP pool at scope.
//   • S1 Gains Pierce (self, in Performance) — ⚑ MEASUREMENT-GATED (the F1 cold hypothesis). Prika
//       carries a pierceDamagePct SOURCE (her own S1, P2) but no Pierce tag, so her own 13.09% cannot
//       land on her SR shots until this line is modeled. NOT modeled here: the in-game Pierce popup
//       was never captured (probe-runs 2026-07-14 inconclusive; "held pending a popup measurement"),
//       and the gate ("while in Performance") rides an untracked partner status. Estimate: lighting it
//       (gainPierce for the 25s Performance window per burst, ~62% uptime) puts her own 13.09%
//       pierceDamagePct live on her SR fire ≈ +8% personal damage (her personal share is small — she is
//       a buffer). Recipe: a Prika-focus popup pass confirming she is Pierce-tagged during Performance
//       and measuring the SR-damage uplift in/out of the window. Tier 2.
//   • S2 Max HP ▲19.98% (self) — defensive HP buff, inert for damage.
//   • S2 Encore Effect 1 (Assigned Part: Singing) — inert part assignment.
//   • S2 Encore Effect 2 (Performance duration ▲21s) — ⚑ Performance is an untracked status; in solo
//       mode the burst's Charge Damage runs 25s, not an extended ~46s when Encore fires.
//   • Burst Effect 1 (restore 3.04% caster max HP/s, 25s) — ⚑ not emitted as recovery events, so
//       "when recovery takes effect" consumers (Crown-type) will not proc off Prika.
//   • Encore TRIGGER is a proxy: the real trigger is "Sing Along takes effect while in Performance"
//       (a partner mechanic, e.g. Mint). Solo mode fires it on every Full Burst entry even with no
//       Sing Along caster (over-credits P4 + over-applies P6). Duet mode (w/ Mint) needs explicit mode
//       selection; this harness runs the SOLO default, so the duet-gated blocks are inert here.
//
// Fixture: liter (B1) / prika (B2) / ada (B3), boss Fire, focus ada — a clean one-per-stage chain so
// Prika actually casts (a lone B2 makes zero Full Bursts). Prika = slot 1; "all allies" = {0,1,2}.
// Deterministic. Prika casts 3× (≈ t=9.25/71.0/130.3s) under the shipped CD-increase.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const PRIKA = 1;
const ALL_ALLIES = [0, 1, 2];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'prika', 'ada'],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);

/** S1 reduced to level-1 BASE magnitudes + the ATK line de-scoped to a generic atkPct. */
const s1BaseLevel = withPatchedOverride('prika', (ov) => {
  const eff = ov.skill1.flatMap((b: any) => b.effects);
  const proj = eff.find((e: any) => e.stat === 'projectileExplosionPct');
  const pierce = eff.find((e: any) => e.stat === 'pierceDamagePct');
  const atk = eff.find((e: any) => e.stat === 'casterAtkPct');
  if (!proj || !pierce || !atk) throw new Error('prika S1 effects missing — fixture is stale');
  proj.value = 11.82; // level-1 base (kit level-10 = 20)
  pierce.value = 7.73; // level-1 base (kit level-10 = 13.09)
  atk.stat = 'atkPct'; // nearest wrong: 20% of each target's OWN ATK, not the caster's
});
/** S1 removed entirely — the "is S1 live at all" reference. */
const s1Removed = withPatchedOverride('prika', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !(hasStat(b, 'projectileExplosionPct') || hasStat(b, 'pierceDamagePct') || hasStat(b, 'casterAtkPct')));
  if (ov.skill1.length === before) throw new Error('prika S1 block missing — fixture is stale');
});
/** Encore + burst buffs reduced to level-1 BASE magnitudes. */
const s2BurstBaseLevel = withPatchedOverride('prika', (ov) => {
  const enc = ov.skill2.flatMap((b: any) => b.effects).find((e: any) => e.stat === 'attackDamagePct');
  const chg = ov.burst.flatMap((b: any) => b.effects).find((e: any) => e.stat === 'chargeDamagePct');
  if (!enc || !chg) throw new Error('prika Encore/burst buffs missing — fixture is stale');
  enc.value = 14.29; // level-1 base (kit level-10 = 25.01)
  chg.value = 13.88; // level-1 base (kit level-10 = 25)
});
/** Encore Effect 4 mis-read as a cooldown DECREASE (▲ = decrease, seconds:+21). */
const cdrDecrease = withPatchedOverride('prika', (ov) => {
  let hit = 0;
  for (const b of ov.skill2) for (const e of b.effects) if (e.kind === 'burstCdr' && e.seconds === -21) { e.seconds = 21; hit++; }
  if (!hit) throw new Error('prika solo burstCdr -21 missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const baseLvl = run({ prika: s1BaseLevel });
const noS1 = run({ prika: s1Removed });
const s2Lvl = run({ prika: s2BurstBaseLevel });
const cdrDown = run({ prika: cdrDecrease });

// ---- readers ---------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const prikaBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === PRIKA && b.stat === stat);
const targets = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.targetIdx))].sort((a, b) => a - b);
const values = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.value))];
const durFrames = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.expiresFrame! - b.frame))];
const prikaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'prika');

describe('prika — kit spec', () => {
  describe('P1 — S1 Projectile Explosion Damage ▲20% / 3s to all allies on full charge', () => {
    const applied = prikaBuffs(base.events, 'projectileExplosionPct');
    it('is the level-10 magnitude 20 (not base 11.82), 3s, reaching all three allies', () => {
      expect(values(applied)).toEqual([20]);
      expect(durFrames(applied)).toEqual([3 * FPS]);
      expect(targets(applied)).toEqual(ALL_ALLIES);
      expect(applied.length, 'no Projectile Explosion buff was applied').toBeGreaterThan(0);
    });
    it('DISCRIMINATING: base-level parser would emit 11.82', () => {
      expect(values(prikaBuffs(baseLvl.events, 'projectileExplosionPct'))).not.toEqual([20]);
    });
    it('is live (removing S1 deletes the buff entirely)', () => {
      expect(prikaBuffs(noS1.events, 'projectileExplosionPct').length).toBe(0);
    });
  });

  describe('P2 — S1 Pierce Damage ▲13.09% / 3s to all allies (inert at scope — no Pierce recipient)', () => {
    const applied = prikaBuffs(base.events, 'pierceDamagePct');
    it('is the level-10 magnitude 13.09 (not base 7.73), 3s, all three allies', () => {
      expect(values(applied)).toEqual([13.09]);
      expect(durFrames(applied)).toEqual([3 * FPS]);
      expect(targets(applied)).toEqual(ALL_ALLIES);
    });
    it('DISCRIMINATING: base-level parser would emit 7.73', () => {
      expect(values(prikaBuffs(baseLvl.events, 'pierceDamagePct'))).not.toEqual([13.09]);
    });
    it('is damage-INERT at scope lock (no Pierce-tagged recipient until "Gains Pierce" is modeled)', () => {
      // Removing ONLY this effect leaves every unit's total byte-identical — the buff applies but no
      // recipient is Pierce-tagged, so it spends nothing. This is exactly the F1 ⚑: modeling Prika's
      // "Gains Pierce" would light it up on her own SR fire.
      const noPierce = withPatchedOverride('prika', (ov) => {
        for (const b of ov.skill1) b.effects = b.effects.filter((e: any) => e.stat !== 'pierceDamagePct');
      });
      expect(run({ prika: noPierce }).totals).toEqual(base.totals);
    });
  });

  describe('P3 — S1 ATK ▲20% of the SKILL USER\'S ATK (casterAtkPct) / 3s to all allies', () => {
    const applied = prikaBuffs(base.events, 'casterAtkPct');
    it('is a flat caster-scoped add, identical to every recipient (not a per-target %)', () => {
      expect(applied.length, 'no casterAtkPct buff was applied').toBeGreaterThan(0);
      const vals = values(applied);
      expect(vals.length, 'caster-scoped buff must be ONE flat value shared by all allies').toBe(1);
      expect(vals[0], 'a flat ATK add (~20% of Prika ATK), not the percentage 20').toBeGreaterThan(1000);
      expect(targets(applied)).toEqual(ALL_ALLIES);
      expect(durFrames(applied)).toEqual([3 * FPS]);
    });
    it('DISCRIMINATING: a generic atkPct emits the percentage (20), not a flat caster-scoped add', () => {
      // Under the counterfactual the casterAtkPct stat is gone (re-typed to atkPct = 20 per target).
      expect(prikaBuffs(baseLvl.events, 'casterAtkPct').length).toBe(0);
      const asAtkPct = prikaBuffs(baseLvl.events, 'atkPct');
      expect(values(asAtkPct)).toEqual([20]);
    });
  });

  describe('P4 — S2 Encore: all allies Attack Damage ▲25.01% / 10s, once per Full Burst entry (solo)', () => {
    const applied = prikaBuffs(base.events, 'attackDamagePct');
    it('is the level-10 magnitude 25.01 (not base 14.29), 10s, reaching all three allies', () => {
      expect(values(applied)).toEqual([25.01]);
      expect(durFrames(applied)).toEqual([10 * FPS]);
      expect(targets(applied)).toEqual(ALL_ALLIES);
    });
    it('fires once per Full Burst entry (one application per ally per Prika burst)', () => {
      const nBursts = prikaBursts(base.events).length;
      expect(nBursts).toBeGreaterThan(0);
      expect(applied.length, `${applied.length} applications vs ${nBursts} bursts × 3 allies`).toBe(
        nBursts * ALL_ALLIES.length,
      );
    });
    it('DISCRIMINATING: base-level parser would emit 14.29', () => {
      expect(values(prikaBuffs(s2Lvl.events, 'attackDamagePct'))).not.toEqual([25.01]);
    });
  });

  describe('P5 — Burst: all allies Charge Damage ▲25% / 25s on cast (solo)', () => {
    const applied = prikaBuffs(base.events, 'chargeDamagePct');
    it('is the level-10 magnitude 25 (not base 13.88), 25s, reaching all three allies', () => {
      expect(values(applied)).toEqual([25]);
      expect(durFrames(applied)).toEqual([25 * FPS]);
      expect(targets(applied)).toEqual(ALL_ALLIES);
    });
    it('fires once per burst cast (one application per ally per cast)', () => {
      const nBursts = prikaBursts(base.events).length;
      expect(applied.length).toBe(nBursts * ALL_ALLIES.length);
    });
    it('DISCRIMINATING: base-level parser would emit 13.88', () => {
      expect(values(prikaBuffs(s2Lvl.events, 'chargeDamagePct'))).not.toEqual([25]);
    });
  });

  describe('P6 — S2 Encore Effect 4: "Cooldown of Burst Skill ▲21 sec" is an INCREASE (burstCdr -21)', () => {
    it('lengthens her cooldown to ~60s → exactly 3 casts in 180s (not a 19s cooldown)', () => {
      const casts = prikaBursts(base.events);
      expect(casts.length, 'CD-increase cadence: ~60s between casts → 3 casts / 180s').toBe(3);
      // Gaps between consecutive casts are ~60s (40 base + 21 increase), within rotation slack.
      const gaps: number[] = [];
      for (let i = 1; i < casts.length; i++) gaps.push((casts[i].frame - casts[i - 1].frame) / FPS);
      for (const g of gaps) expect(g, `cast gap ${g.toFixed(1)}s should be ~60s (40+21)`).toBeGreaterThan(50);
    });
    it('DISCRIMINATING: mis-reading ▲ as a DECREASE (+21) yields strictly more casts', () => {
      const shipped = prikaBursts(base.events).length;
      const decreased = prikaBursts(cdrDown.events).length;
      expect(decreased, 'a cooldown DECREASE must produce more casts than the shipped increase').toBeGreaterThan(shipped);
    });
  });
});

```

---

# DRIVER IMPLEMENTATION — src/skills/overrides/prika.json

```json
{
  "note": "Only the S2 'Encore' block needs overriding. S1 is left to the parser (its full-charge block -> team Projectile Explosion 20% / Pierce 13.09% / ATK 20% of caster for 3s is faithful; the Performance-status sub-block is only heal-potency + Gains Pierce, both skipped as defensive/inert). Burst is left to the parser (Charge Damage +25%/25s to allies is faithful; the HP-regen effect skipped as a heal). S2: the 'entering Full Burst -> Max HP +19.98%' block is skipped (defensive HP buff). The Encore itself fires 'when Sing Along takes effect while in Performance' -- Sing Along/Performance is an untracked mechanic, so I approximate it as firing once per rotation on Full Burst entry (Prika is in Performance then). Encore grants allies Attack Damage +25.01% for 10s and INCREASES her own Burst cooldown by 21s (the ▲ is an increase — the price of the Performance extension), applied once per her own burst cast. UNCERTAIN: the once-per-full-burst cadence for the team Attack Damage buff is an approximation of the Sing Along trigger. The 'Performance duration +21 sec' and 'Singing part assignment' Encore effects are not modeled (Performance is an untracked status; part assignment is inert). MODES ADDED (tier audit, Prydwen): duet 'Ad Infinitum' — Mint's Sing Along re-extends Performance forever and 'she only needs to Burst once' -> duet mode: burst once (self CD +9999 after cast), Performance charge-damage 25% and Encore Attack Damage 25.01% permanent. Solo mode: 25s Performance per burst, Encore per-FB as before. DUET SLOT ORDER: place Prika LEFT of Mint so she takes rotation 1 and Mint all later rotations. DUET ORDER RULE (user, 2026-07-13): when Mint+Prika are the only B2s, Prika ALWAYS takes the first B2 and Mint every one after — now slot-order-independent via the burstFirst effect (duet mode); the old 'place Prika left of Mint' requirement is gone. [materialized 2026-07-16: skill1 auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] [re-materialized 2026-07-16: skill1 re-frozen with the upgraded offline parser (skill-user's-ATK→casterAtkPct, used-their-Burst→burstCasters, Reload Speed stat, DEF→defPct, shield event) — still NOT hand-verified] DUET ROTATION (owner-confirmed 2026-07-23): in graded comps containing BOTH mint and prika the real rotation is PRIKA TAKES THE FIRST BURST, THEN MINT TAKES EVERY BURST FOR THE REST OF THE FIGHT. That is implemented here, but ONLY under mode 'duet (w/ Mint)', by two mode-gated blocks: passive -> burstFirst (she takes burst 1 regardless of slot order) and burstCast -> burstCdr -9999 (she then locks out, leaving every later burst to mint). ⚠ A harness that does not SELECT that mode runs her solo, neither block fires, and she reads artificially COLD — that is exactly what scripts/lib/board-readings.ts did until it was fixed on 2026-07-23 (dashboard 0.676 vs the grading harness's 0.890). If she ever reads far colder in one tool than another, check mode selection FIRST. Kit-autonomy gauntlet 2026-07-25: blind cross-family re-derivation (S2b claude-fable-5; S5/S6/S7 claude-opus-5) CONVERGED on all 5 damage-relevant lines — P1 projectileExplosionPct 20/3s, P2 pierceDamagePct 13.09/3s, P3 casterAtkPct (20% of CASTER ATK, flat, identical on every ally), P4 Encore attackDamagePct 25.01/10s on fullBurstEnter, P5 burst chargeDamagePct 25/25s on burstCast — plus the P6 burstCdr -21 cooldown-INCREASE sign (the ▲ is an increase: 40s→61s, 3 casts/180s vs 9 for the decrease misread), pinned by scripts/tests/units/prika.test.ts (16 assertions GREEN vs shipped + RED vs every named counterfactual). NO encoding change — the modeled lines are faithful as shipped; this edit is the provenance stamp + the structured ⚑s below. Documented residuals (⚑ estimate+recipe+tier full in the test header): (1) S1 'Gains Pierce while in Performance' stays UNMODELED — MEASUREMENT-GATED on the owner hold (probe-runs 2026-07-14 inconclusive); this is the F1 cold hypothesis: Prika carries a pierceDamagePct SOURCE (her own S1, P2) but no Pierce tag, so her own 13.09% is damage-INERT on her SR fire (verified byte-identical totals with the effect removed) until a gainPierce window (25s Performance, ~62% uptime) is enacted; estimate ~+8% personal SR damage; recipe = Prika-focus popup pass confirming the Pierce tag + the in/out-window SR uplift; tier 2. (2) Burst HoT (3.04% caster max HP / 1s × 25s) is not emitted as recovery events — heal-only, zero direct damage; recipe = add heal ticks:25 on burstCast/allies if a crown-type on-recovery consumer is graded; tier 2. (3) Encore trigger is a solo-mode PROXY (fullBurstEnter) for the cross-unit 'Sing Along takes effect while in Performance' — over-credits the 25.01% + the CD-increase in non-Mint comps; duet mode (w/ Mint) needs explicit mode selection. (4) Encore 'Performance duration ▲21s' unmodeled (Performance untracked).",
  "modes": ["solo", "duet (w/ Mint)"],
  "unmodeled": {
    "skill1": [
      "Outgoing healing ▲ 49.92% continuously.",
      "Gains Pierce. This effect is continuous."
    ],
    "skill2": [
      "Max HP ▲ 19.98% for 10 sec.",
      "Effect 1: Affects the member who initiated Sing Along. Assigned Part: Singing. This effect is continuous and cannot be removed.",
      "Effect 2: Affects all allies. Performance duration ▲ 21 sec."
    ],
    "burst": [
      "Effect 1: Restores 3.04% of the skill user's final max HP as HP every 1 sec for 25 sec. This effect cannot be removed."
    ]
  },
  "skill1": [
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
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 20,
          "durationSec": 3
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 13.09,
          "durationSec": 3
        },
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 20,
          "durationSec": 3
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
          "stat": "attackDamagePct",
          "value": 25.01,
          "durationSec": 10
        }
      ],
      "mode": "solo"
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
          "kind": "burstCdr",
          "seconds": -21
        }
      ],
      "mode": "solo"
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "mode": "duet (w/ Mint)",
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 25.01,
          "durationSec": 9999
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
      "mode": "duet (w/ Mint)",
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": -9999
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "mode": "duet (w/ Mint)",
      "effects": [
        {
          "kind": "burstFirst"
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
      "mode": "solo",
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 25,
          "durationSec": 25
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
      "mode": "duet (w/ Mint)",
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 25,
          "durationSec": 9999
        }
      ]
    }
  ],
  "caveats": [
    "Encore is a proxy: the real trigger is 'Sing Along takes effect while Prika is in Performance' (a partner mechanic, e.g. Mint) — solo mode fires it on EVERY Full Burst entry even in teams with no Sing Along caster (over-credits the ally Attack Damage ▲ 25.01% AND over-applies the self Burst-cooldown ▲ 21s).",
    "Prika's kit grants her continuous Pierce while in Performance, but the override carries no Pierce tag (hasPierce) — her own Pierce Damage ▲ 13.09% and any partner Pierce buffs do not land on her (held pending a popup measurement, probe-runs 2026-07-14).",
    "The burst Performance heal (3.04% of caster max HP per sec, 25s) is not emitted as recovery events — 'when recovery takes effect' consumer kits (Crown-type) will not proc off Prika.",
    "Encore's 'Performance duration ▲ 21 sec' is unmodeled — in solo mode the burst's Charge Damage ▲ 25% (and heal) run 25s instead of an extended ~46s when Encore fires."
  ]
}

```