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


============================================================
## SECTION 2 — MECHANICS SSOT (docs/data/damage-calculation.md)
============================================================

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


============================================================
## SECTION 2b — MECHANICS SSOT (docs/data/game-mechanics.md)
============================================================

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


============================================================
## SECTION 3 — GROUND TRUTH: unit kit prose + base stats (data/characters.json -> characters.miranda)
============================================================

{
  "slug": "miranda",
  "name": "Miranda",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/xv-66/wc-38/6202adb5b62786c389c4612cde9008ea.png",
  "weapon": "SMG",
  "burst": "I",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Fire",
  "manufacturer": "Elysion",
  "normalAttackMultiplier": 10.8,
  "coreAttackMultiplier": 250,
  "ammo": 120,
  "reloadFrames": 107,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 5.7,
  "burstGaugePerShot": 0.1,
  "treasure": true,
  "nicknames": [
    "tmiranda"
  ],
  "skills": {
    "skill1": "■ Activates after landing 30 normal attack(s). Affects all allies.\nHit Rate ▲ 5.44% for 5 sec.\n■ Activates after landing 30 normal attack(s). Affects all allies with a Submachine Gun.\nHit Rate ▲ 3.79% for 5 sec.\n■ Activates after landing 30 normal attack(s). Affects self.\nATK ▲ 50.06% for 5 sec.",
    "skill2": "■ Activates when entering Full Burst. Affects all allies.\nCritical Damage ▲ 32.99% for 10 sec.\n■ Activates when entering Full Burst. Affects self.\nCritical Rate ▲ 30.1% for 10 sec.\nAttack Damage ▲ 23.7% for 10 sec.\n■ Activates when entering Full Burst. Affects 1 ally unit(s) with the highest final ATK (except the skill user; including the skill user if there are not enough allies). \nCritical Rate ▲ 85.42% for 1 round(s).",
    "burst": "■ Affects 2 ally unit(s) with the highest final ATK (except the skill user; including the skill user if there are not enough allies). \nATK ▲ 40.4% for 10 sec. \nCritical Damage ▲ 56.23% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "role": {
    "weapon": {
      "shot_id": 1003201,
      "shot_detail": {
        "id": 1003201,
        "damage": 1080,
        "max_ammo": 120,
        "shake_id": 1,
        "ShakeType": "Fire_SMG",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Energy",
        "camera_work": "camera_work_01",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 143,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "SMG",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 1440,
        "name_localkey": "Submachine Gun",
        "prefer_target": "TargetAR",
        "reload_bullet": 10000,
        "counter_enermy": "Energy_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 25000,
        "end_rate_of_fire": 1440,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 119,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 1000,
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
        "end_accuracy_circle_scale": 110,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 110,
        "target_burst_energy_pershot": 2000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 110,
        "auto_start_accuracy_circle_scale": 110
      },
      "bonusrange_max": 35,
      "bonusrange_min": 15
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step1",
      "burst_apply_delay": 1,
      "change_burst_step": "Step2"
    },
    "skillDetails": {
      "skill1_id": 2032101,
      "skill2_id": 2032201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2032101,
        "icon": "icn_skill_stataccuracycircle_01",
        "group_id": 20321,
        "skill_level": 1,
        "name_localkey": "Health Up!",
        "next_level_id": 2032102,
        "level_up_cost_id": 10102,
        "description_localkey": "■ Activates after landing {description_value_01} normal attack(s). Affects all allies.\n<color=#00AEFF>Hit Rate ▲ {description_value_02}% for {description_value_03} sec.</color>\n■ Activates after landing {description_value_04} normal attack(s). Affects all allies with a Submachine Gun.\n<color=#00AEFF>Hit Rate ▲ {description_value_05}% for {description_value_06} sec.</color>",
        "description_value_list": [
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
          {
            "description_value": [
              "3.31",
              "3.55",
              "3.78",
              "4.02",
              "4.26",
              "4.49",
              "4.73",
              "4.97",
              "5.2",
              "5.44"
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
          {
            "description_value": [
              "2.09",
              "2.28",
              "2.47",
              "2.66",
              "2.85",
              "3.03",
              "3.22",
              "3.41",
              "3.6",
              "3.79"
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
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2032201,
        "icon": "icn_skill_criticaldamage_01",
        "group_id": 20322,
        "skill_level": 1,
        "name_localkey": "Wake Up!",
        "next_level_id": 2032202,
        "level_up_cost_id": 10202,
        "description_localkey": "■ Activates at the beginning of Full Burst. Affects all allies. <color=#00AEFF>Critical Damage ▲ {description_value_01}% for {description_value_02} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "19.49",
              "20.99",
              "22.49",
              "23.99",
              "25.49",
              "26.99",
              "28.49",
              "29.99",
              "31.49",
              "32.99"
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
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1032301,
      "ulti_skill_detail": {
        "id": 1032301,
        "icon": "icn_skill_c032_ult",
        "group_id": 10323,
        "shake_id": 4,
        "skill_type": "SetBuff",
        "attack_type": "Fire",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "TimeSec",
        "name_localkey": "Powering Up!",
        "next_level_id": 1032302,
        "prefer_target": "HighAttackLastSelf",
        "resource_name": "c032_ulti",
        "duration_value": 1000,
        "skill_cooltime": 2000,
        "level_up_cost_id": 10302,
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
            "skill_value": 10000,
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
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "description_localkey": "■ Affects {description_value_01} ally unit(s) with the highest <word_group=10025>final</word_group> ATK (includes the skill user if there are not enough allies). \n<color=#00AEFF>ATK ▲ {description_value_02}% for {description_value_03} sec. \nCritical Damage ▲ {description_value_04}% for {description_value_05} sec.</color>",
        "description_value_list": [
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
              "23.87",
              "25.71",
              "27.55",
              "29.38",
              "31.22",
              "33.06",
              "34.89",
              "36.73",
              "38.57",
              "40.4"
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
              "33.22",
              "35.78",
              "38.34",
              "40.89",
              "43.45",
              "46.01",
              "48.56",
              "51.12",
              "53.67",
              "56.23"
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
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          0
        ],
        "after_hurt_function_id_list": [
          103230101
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
      "grow_grade": 203202,
      "grade_core_id": 1,
      "stat_enhance_id": 5303,
      "stat_enhance_detail": {
        "id": 5303,
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
      "piece_id": 5100032,
      "piece_detail": {
        "id": 5100032,
        "class": "Supporter",
        "order": 3200,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 32,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Miranda's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 203201,
      "class": "Supporter",
      "order": 10005,
      "name_code": 5017,
      "corporation": "ELYSION",
      "resource_id": 32,
      "name_localkey": "Miranda",
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
    "hp": 15000,
    "atk": 500,
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
    "resourceId": 32
  }
}

============================================================
## SECTION 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)
============================================================

{
  "slug": "miranda",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ after landing 30 normal attack(s) → allies",
      "disposition": "FAITHFUL",
      "scope": "Generic Hit Rate buff (stat hitRatePct 5.44) — not attack-category-scoped; its damage effect flows only through the engine's hit-rate→core path (hrCoreMult).",
      "durationSemantics": "durationSec: 5 — literal seconds. Cadence math: SMG at ~20 rounds/s lands 30 hits in ~1.5s, so the 5s buff refreshes near-continuously; uptime should survive the ~1.78s reload (107f) without lapsing.",
      "triggerIdentity": "hitCount count:30 — counts Miranda's own LANDED normal rounds (hitsPerShot 1, so rounds == pulls). No FB gate; accrues in and out of Full Burst.",
      "targetSet": "allies (all, including self).",
      "nearestWrongModel": "Passive/always-on or interval-based buff (or first-fire at t=0), instead of a hit-counter that only starts paying after the 30th landed round and lapses if firing stops.",
      "distinguishingAssertion": "No buffApply with stat hitRatePct value 5.44 exists before Miranda's 30th shot event (~frame 90); the first buffApply frame follows the 30th shot, and re-applies (refresh:true) recur every ~30 shots thereafter — red under passive/interval (t=0 or fixed-clock application).",
      "inertness": "Must not fire during Miranda's reload window faster than her actual shot count allows; zero applications if Miranda never fires.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ 30 normal attacks → allies with a Submachine Gun",
      "disposition": "FAITHFUL",
      "scope": "Second, weapon-scoped Hit Rate buff (hitRatePct 3.79) stacking on top of the 5.44 line for SMG holders only.",
      "durationSemantics": "durationSec: 5, same near-permanent refresh cadence as the sibling line.",
      "triggerIdentity": "Same hitCount count:30 block family; fires together with the all-allies line.",
      "targetSet": "alliesOfWeapon weapon:'SMG' (Miranda herself is SMG, so she holds 5.44 + 3.79 = 9.23 total).",
      "nearestWrongModel": "Unscoped all-allies target — silently granting the extra 3.79 hit rate (i.e. extra core rate) to a non-SMG carry, or collapsing both lines into one 9.23 all-allies buff.",
      "distinguishingAssertion": "In controlComp with a non-SMG carry, buffApply events with value 3.79 have targetSlug ONLY for SMG-weapon units (Miranda; none of liter/crown/helm/carry unless SMG); the carry receives value 5.44 applications but never 3.79 — red under the unscoped/merged model.",
      "inertness": "A non-SMG carry's core rate must not move when this line alone is zeroed; only SMG holders' hit rate changes.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ 30 normal attacks → self: ATK ▲ 50.06%",
      "disposition": "FAITHFUL",
      "scope": "Generic self ATK stat (atkPct), unscoped by attack category.",
      "durationSemantics": "durationSec: 5, near-permanent uptime given the ~1.5s trigger cadence.",
      "triggerIdentity": "Same hitCount count:30 trigger.",
      "targetSet": "self only.",
      "nearestWrongModel": "Target widened to allies (over-crediting the carry with +50% ATK — a huge board error), or stat mis-keyed as attackDamagePct.",
      "distinguishingAssertion": "Every buffApply with stat atkPct value 50.06 from skill1 has targetIdx === Miranda's slot (casterIdx === targetIdx); the carry's totals(res)[carry] is IDENTICAL when this effect is deleted via withPatchedOverride — red if allies-targeted (carry damage would jump) or if the value leaks into attackDamagePct dilution.",
      "inertness": "Carry and helm damage must NOT move from this line; it only scales Miranda's own (small, supporter) output.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ entering Full Burst → allies: Crit DMG ▲32.99%",
      "disposition": "FAITHFUL",
      "scope": "Generic critDamagePct, all attack categories.",
      "durationSemantics": "durationSec: 10 — spans the full 10s FB window.",
      "triggerIdentity": "fullBurstEnter — ANY team Full Burst, not gated on Miranda casting (she is B1 so the distinction is invisible in a comp where she is the sole B1; still must be keyed fullBurstEnter).",
      "targetSet": "allies (all, including self).",
      "nearestWrongModel": "Keyed to burstCast (Miranda's own cast, landing pre-FB) — same count in a sole-B1 comp but wrong timing/frame, and diverges if a second B1 exists; or self-only targeting.",
      "distinguishingAssertion": "A buffApply with stat critDamagePct value 32.99 occurs at (same frame as) every fullBurstStart event and targets all 5 slots — red under burstCast keying (apply frame precedes fullBurstStart) or self-only targeting.",
      "inertness": "Must apply once per FB entry, not per burst stage cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ entering Full Burst → self: Crit Rate ▲30.1%",
      "disposition": "FAITHFUL",
      "scope": "Generic critRatePct — self only. NOT critRateNormalPct (no 'of normal attacks' scoping in the prose).",
      "durationSemantics": "durationSec: 10.",
      "triggerIdentity": "fullBurstEnter, same block as the Attack Damage line below.",
      "targetSet": "self only.",
      "nearestWrongModel": "Target widened to allies — handing the carry +30.1 crit rate every FB is the highest-leverage possible misread of this kit.",
      "distinguishingAssertion": "buffApply stat critRatePct value 30.1 has targetIdx === Miranda's slot exclusively; the carry's damage-event crit rates inside FB are unchanged when this effect is deleted — red under allies targeting.",
      "inertness": "Carry/helm crit rolls must NOT move from this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ entering Full Burst → self: Attack Damage ▲23.7%",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket) on self — must NOT be encoded as atkPct.",
      "durationSemantics": "durationSec: 10.",
      "triggerIdentity": "fullBurstEnter (same block as the 30.1 crit-rate line).",
      "targetSet": "self only.",
      "nearestWrongModel": "Stat mis-keyed as atkPct (wrong bucket — ATK multiplies differently than Damage-Up dilution), or target widened to allies.",
      "distinguishingAssertion": "buffApply stat attackDamagePct value 23.7 with targetIdx === Miranda only, applied at each fullBurstStart — red if the same value appears under stat atkPct or on any other targetIdx.",
      "inertness": "No ally receives this; Miranda's out-of-FB damage unchanged by it (10s window only).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ FB enter → 1 ally, highest final ATK: CR ▲85.42% 1 round",
      "disposition": "FAITHFUL",
      "scope": "Generic critRatePct on the recipient — but effectively a one-shot crit guarantee-ish spike.",
      "durationSemantics": "'for 1 round(s)' = ROUND COUNT: durationShots: 1, NOT durationSec: 1. Expires right after the HOLDER fires 1 round (their next single bullet post-apply crits at +85.42, the one after does not). No time expiry unless combined.",
      "triggerIdentity": "fullBurstEnter (any team FB).",
      "targetSet": "alliesTopAtk count:1, excludeSelf:true, byFinalAtk:true — the prose literally says 'highest FINAL ATK', which per the A3 rule requires live effectiveAtk ranking, not staticAtk; 'including the skill user if there are not enough allies' is a fallback that never fires in a 5-unit comp.",
      "nearestWrongModel": "durationSec: 1 (the canonical rounds-vs-seconds misread — an SMG recipient would get ~20 boosted rounds instead of 1; an SR recipient roughly the same 1, hiding the bug on slow carries); secondary: byFinalAtk omitted (static-ATK ranking picks a different recipient once ATK buffs are live), or excludeSelf dropped (Miranda self-targets).",
      "distinguishingAssertion": "The buffApply with stat critRatePct value 85.42 carries durationShots === 1 (field present on the event) and targetIdx !== casterIdx; counting the recipient's damage events whose crit roll includes the +85.42 window yields EXACTLY 1 round per FB entry — red under durationSec:1 (a fast-firing recipient shows ~15–20 boosted rounds) and red if targetIdx === Miranda.",
      "inertness": "Exactly one round per FB benefits; the recipient's second post-apply round must NOT carry the spike; Miranda must never be the recipient in a full comp.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ 2 allies, highest final ATK: ATK ▲40.4% 10s",
      "disposition": "FAITHFUL",
      "scope": "Generic atkPct on the two recipients.",
      "durationSemantics": "durationSec: 10 — literal seconds (contrast with skill2's round-count line).",
      "triggerIdentity": "burstCast — the burst block has NO 'Activates when…' clause, so it fires when MIRANDA casts her Burst I (cd 20s), pre-FB timing. NOT fullBurstEnter.",
      "targetSet": "alliesTopAtk count:2, excludeSelf:true, byFinalAtk:true ('highest final ATK', explicit except-self with the same never-fires fallback).",
      "nearestWrongModel": "Keyed to fullBurstEnter — over-fires on rotations where a different B1 completes the chain (invisible in a sole-B1 fixture, diverges in a two-B1 comp); secondary: static-ATK ranking (byFinalAtk omitted) picking recipients before live buffs are counted, or including Miranda in the pool.",
      "distinguishingAssertion": "buffApply events with stat atkPct value 40.4 have casterIdx === Miranda and occur only on frames where a burstCast event for Miranda fired (never on an FB entry she didn't burst into); exactly 2 distinct targetIdx per cast, neither equal to casterIdx — red under fullBurstEnter keying in a comp with a second B1, and red if Miranda appears among the recipients.",
      "inertness": "Fires only on Miranda's own casts; in a comp where another B1 takes a rotation, that rotation gets NO application.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ same 2 allies: Critical Damage ▲56.23% 10s",
      "disposition": "FAITHFUL",
      "scope": "Generic critDamagePct, second effect in the same burst block (same trigger/target resolution — both effects must land on the SAME two recipients).",
      "durationSemantics": "durationSec: 10.",
      "triggerIdentity": "burstCast (same block as the ATK line).",
      "targetSet": "Same alliesTopAtk count:2, excludeSelf:true, byFinalAtk:true.",
      "nearestWrongModel": "Splitting the two effects into separately-resolved blocks so the ATK line's own buff re-ranks 'final ATK' and the crit-damage line lands on a different pair; or all-allies widening.",
      "distinguishingAssertion": "Per Miranda burstCast, the buffApply pair {atkPct 40.4, critDamagePct 56.23} shares identical targetIdx sets (exactly 2, excluding Miranda) — red if the two stats ever land on different recipients or on >2 targets.",
      "inertness": "Non-recipient allies (the 2 lowest-final-ATK non-Miranda units) must NOT move from the burst.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:hitCount30-allies-hitRate-5.44",
    "skill1:hitCount30-SMG-allies-hitRate-3.79",
    "skill1:hitCount30-self-atk-50.06",
    "skill2:fbEnter-allies-critDmg-32.99",
    "skill2:fbEnter-self-critRate-30.1",
    "skill2:fbEnter-self-attackDamage-23.7",
    "skill2:fbEnter-top1FinalAtk-critRate-85.42-1round",
    "burst:cast-top2FinalAtk-atk-40.4",
    "burst:cast-top2FinalAtk-critDmg-56.23"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Every line is encodable in the existing schema — I expect zero UNMODELED text; any non-empty unmodeled field in the shipped override needs justification. The three shared-prior misreads I most expect the driver to have made: (1) skill2's 'for 1 round(s)' encoded as durationSec:1 instead of durationShots:1 — the single highest-risk line; a slow-firing carry masks the bug, so the distinguishing assertion must use the durationShots field on the buffApply event, not a timing observation. (2) byFinalAtk omitted on the three 'highest FINAL ATK' targets (skill2 block 3, burst) — the prose says FINAL, so live-effectiveAtk ranking is required per the owner's literal-word rule; static ranking can pick a different recipient once Miranda's own ATK/crit buffs are live, and the burst's own atkPct 40.4 must not re-rank its sibling critDamagePct effect (both effects in one block, one target resolution). (3) The SMG-scoped 3.79 Hit Rate line merged into the all-allies 5.44 line (or both left unscoped) — the test needs a non-SMG carry in the fixture so the scoping is observable. Also verify skill1's trigger is hitCount (landed rounds), not interval/passive: at ~20 rounds/s the 30-hit threshold refreshes every ~1.5s making the buffs near-permanent, which makes a passive misread almost damage-invisible — the distinguishing assertion must therefore anchor on the FIRST application frame (after shot 30, ~t≈1.5s, never t=0) and on application count tracking shot count. Hit Rate's damage consequence rides the hrCoreMult core-lift path (CALIBRATED ⚑ slope, HRCORE-gated) — the buff VALUES are kit-literal (DATAMINED) but any assertion on damage movement from the hit-rate lines is conditional on HRCORE being live; assert on buffApply events, not damage deltas, to stay gate-independent. Fixture note: Miranda is Burst I — she replaces liter in controlComp or the comp needs B2+B3 retained so FBs actually chain; a two-B1 variant comp is the discriminating fixture for burstCast-vs-fullBurstEnter on the burst block.",
  "model": "claude-fable-5"
}


============================================================
## SECTION 5 — S5 BLIND TEST (claude-opus-5, written from kit prose alone)

CONVERGENCE vs DRIVER OVERRIDE: 15 assertions PASSED / 2 skipped (blind self-declared gaps: exact 5s/10s window length needs apply-frame the buffApply payload does not expose; byFinalAtk-vs-static ranking not constructible blind) / 0 FAILED. Burst non-vacuity passed (miranda casts her Burst I in the two-B1 controlComp fixture).
============================================================

/**
 * miranda — SMG / Fire / Supporter / Burst I. BLIND kit-spec pin (written from the kit prose
 * alone; the driver's override, tests and reasoning were NOT consulted).
 *
 * KIT (literal):
 *   S1 — three blocks, each 'Activates after landing 30 normal attack(s)':
 *        a) all allies              Hit Rate     +5.44%  for 5 sec
 *        b) all allies with an SMG  Hit Rate     +3.79%  for 5 sec
 *        c) self                    ATK         +50.06%  for 5 sec
 *   S2 — three blocks, each 'Activates when entering Full Burst':
 *        a) all allies              Crit Damage +32.99%  for 10 sec
 *        b) self                    Crit Rate    +30.1%  for 10 sec
 *                                   Attack Dmg   +23.7%  for 10 sec
 *        c) 1 ally with the highest FINAL ATK, except self:
 *                                   Crit Rate   +85.42%  for 1 ROUND
 *   BURST — no activation clause => own burst cast. 2 allies with the highest FINAL ATK,
 *           except self:            ATK          +40.4%  for 10 sec
 *                                   Crit Damage +56.23%  for 10 sec
 *
 * FIXTURE: controlComp('miranda', true) = liter (B1) / crown (B2) / miranda / helm (B3).
 *   miranda is BURST I, so she contends with liter for stage 1 — whether she ever casts is a
 *   property of the fixture, asserted explicitly (non-vacuity) rather than assumed. Full Bursts
 *   are driven by helm (B3) either way, so every skill2 assertion is exercised regardless.
 *
 * TRAPS THIS FILE PINS:
 *   - TRIGGER IDENTITY: S1 is hitCount(30) — not shotFired, not interval, not lastBullet.
 *   - TRIGGER IDENTITY: S2 is fullBurstEnter (ANY team FB) — not miranda's own burstCast.
 *   - SCOPE: S1b is weapon-scoped (SMG allies only), S1c / S2b are self-only.
 *   - DURATION SEMANTICS: S2c is 'for 1 round(s)' = durationShots 1, NEVER durationSec 1.
 *   - TARGET SET: S2c / burst exclude self and take the top-final-ATK allies.
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

const SLUG = 'miranda';

type Ev = SimEvent & Record<string, any>;

function run(opts: any): { res: any; events: Ev[] } {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        events.push(ev as Ev);
      },
    },
  } as any);
  return { res, events };
}

/** Slot accessor that tolerates both override shapes (Block[] or CharacterSkills.blocks). */
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

/** Locate a block STRUCTURALLY by the kit magnitude it carries (no index assumptions). */
function blockWithBuff(ov: any, slot: 'skill1' | 'skill2' | 'burst', value: number): any {
  const found = slotBlocks(ov, slot).find((b: any) =>
    (b.effects ?? []).some(
      (e: any) => e.kind === 'buff' && Math.abs((e.value ?? NaN) - value) < 1e-6,
    ),
  );
  if (!found) {
    throw new Error(
      '[' + SLUG + '] no ' + slot + ' block carries buff value ' + value + ' — the kit prose says it must',
    );
  }
  return found;
}

function buffOf(blk: any, value: number): any {
  return (blk.effects ?? []).find(
    (e: any) => e.kind === 'buff' && Math.abs((e.value ?? NaN) - value) < 1e-6,
  );
}

const applies = (evs: Ev[], stat: string, value: number) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && Math.abs((e.value ?? NaN) - value) < 1e-6,
  );

const targetsOf = (evs: Ev[]) => Array.from(new Set(evs.map((e) => e.targetSlug)));
const teamTotal = (res: any) => Object.values(totals(res)).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Hoisted runs (each runComp is a full 180s sim). 5 runs total.
// ---------------------------------------------------------------------------
const OV = withPatchedOverride(SLUG, () => {}) as any; // committed override, untouched clone

const BASE = run(controlComp(SLUG, true));
const ROSTER = Object.keys(totals(BASE.res));
const FB = BASE.events.filter((e) => e.kind === 'fullBurstStart').length;
const S1_ACTIVATIONS = applies(BASE.events, 'atkPct', 50.06).length;

// Nearest-wrong for the S1 trigger: any other cadence. Doubling the hit threshold must halve
// the activation count; a shotFired/interval keying would not respond at all.
const CF_HITCOUNT_X2 = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of slotBlocks(ov, 'skill1')) {
        if (b.trigger?.kind === 'hitCount') b.trigger.count = (b.trigger.count ?? 30) * 2;
      }
    }),
  },
});

// Nearest-wrong for S1c: a permanent (untimed) self ATK buff. Collapsing the window to 0.5s must
// cost miranda damage while leaving every teammate byte-identical (self scope).
const CF_S1_ATK_SHORT = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      buffOf(blockWithBuff(ov, 'skill1', 50.06), 50.06).durationSec = 0.5;
    }),
  },
});

// Nearest-wrong for S1a: scoping the team Hit Rate buff to self. Teammates must move.
const CF_S1_HR_SELF = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      blockWithBuff(ov, 'skill1', 5.44).target = { kind: 'self' };
    }),
  },
});

// Nearest-wrong for S2c: reading 'for 1 round(s)' as one wall-clock second.
const CF_ROUNDS_TO_SEC = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      const e = buffOf(blockWithBuff(ov, 'skill2', 85.42), 85.42);
      delete e.durationShots;
      e.durationSec = 1;
    }),
  },
});

// ---------------------------------------------------------------------------

describe('miranda — fixture sanity', () => {
  it('the control comp actually fights and full-bursts', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(ROSTER).toContain(SLUG);
    expect(ROSTER.length).toBe(4);
    // Non-vacuity for every skill2 assertion below.
    expect(FB).toBeGreaterThan(0);
  });
});

describe("miranda S1 — 'Activates after landing 30 normal attack(s)'", () => {
  // Trigger identity, read literally: a hit-count gate on landed normal attacks.
  it('all three skill1 blocks are keyed to hitCount 30', () => {
    const triggers = slotBlocks(OV, 'skill1').map((b: any) => b.trigger);
    expect(triggers.length).toBe(3);
    for (const t of triggers) {
      expect(t.kind).toBe('hitCount');
      expect(t.count).toBe(30);
    }
  });

  // Behavioural half of the same claim: RED under shotFired (thousands of fires over 180s),
  // RED under interval/lastBullet (no response to the threshold), GREEN only for hitCount(30).
  it('doubling the hit threshold halves the activation count', () => {
    const cf = applies(CF_HITCOUNT_X2.events, 'atkPct', 50.06).length;
    expect(S1_ACTIVATIONS).toBeGreaterThan(10);
    expect(S1_ACTIVATIONS).toBeLessThan(400); // a shotFired keying would be in the thousands
    expect(cf).toBeGreaterThan(0);
    expect(cf / S1_ACTIVATIONS).toBeGreaterThan(0.35);
    expect(cf / S1_ACTIVATIONS).toBeLessThan(0.65);
  });

  // Target sets. 5.44 is unscoped (everyone); 3.79 is weapon-scoped (SMG only, self included).
  it('Hit Rate 5.44% reaches every ally, 3.79% only the SMG allies', () => {
    const hrAll = applies(BASE.events, 'hitRatePct', 5.44);
    const hrSmg = applies(BASE.events, 'hitRatePct', 3.79);

    expect(targetsOf(hrAll).sort()).toEqual([...ROSTER].sort());
    expect(hrAll.length).toBe(S1_ACTIVATIONS * ROSTER.length);

    const smg = targetsOf(hrSmg);
    expect(smg).toContain(SLUG); // miranda is an SMG unit, so self is inside the scope
    expect(smg).not.toContain('helm'); // helm is SR — RED if the block is modelled as plain 'allies'
    for (const s of smg) expect(targetsOf(hrAll)).toContain(s); // SMG set is a subset of the all set
    expect(hrSmg.length).toBe(S1_ACTIVATIONS * smg.length);
    expect(hrSmg.length).toBeLessThan(hrAll.length);
  });

  // The Hit Rate grant is a LIVE channel (hrCoreMult) and it really is a team grant:
  // re-scoping it to self must move somebody else's damage while leaving miranda's untouched.
  it('re-scoping the 5.44% Hit Rate buff to self moves teammates, not miranda', () => {
    const base = totals(BASE.res);
    const cf = totals(CF_S1_HR_SELF.res);
    const moved = ROSTER.filter((s) => s !== SLUG && cf[s] !== base[s]);
    expect(moved.length).toBeGreaterThan(0);
    expect(cf[SLUG]).toBe(base[SLUG]); // her own Hit Rate is unchanged by the re-scope
  });

  it('ATK 50.06% is self-only and time-bounded', () => {
    const atk = applies(BASE.events, 'atkPct', 50.06);
    expect(atk.length).toBeGreaterThan(0);
    expect(targetsOf(atk)).toEqual([SLUG]); // inertness: no teammate ever receives it

    // Shrinking the window costs miranda damage => the buff is genuinely timed, not permanent.
    const base = totals(BASE.res);
    const cf = totals(CF_S1_ATK_SHORT.res);
    expect(cf[SLUG]).toBeLessThan(base[SLUG]);
  });

  it('the self ATK window is inert for every teammate', () => {
    const base = totals(BASE.res);
    const cf = totals(CF_S1_ATK_SHORT.res);
    for (const s of ROSTER) {
      if (s === SLUG) continue;
      expect(cf[s]).toBe(base[s]); // byte-identical
    }
  });
});

describe("miranda S2 — 'Activates when entering Full Burst'", () => {
  // Keyed to the TEAM Full Burst, not to miranda's own cast: the count must track fullBurstStart
  // exactly. A burstCast keying diverges (miranda is a B1 sharing stage 1 with liter).
  it('Crit Damage 32.99% lands on every ally once per Full Burst', () => {
    const cd = applies(BASE.events, 'critDamagePct', 32.99);
    expect(cd.length).toBe(FB * ROSTER.length);
    expect(targetsOf(cd).sort()).toEqual([...ROSTER].sort());
  });

  it('Crit Rate 30.1% and Attack Damage 23.7% are self-only, once per Full Burst', () => {
    const cr = applies(BASE.events, 'critRatePct', 30.1);
    const ad = applies(BASE.events, 'attackDamagePct', 23.7);
    expect(cr.length).toBe(FB);
    expect(ad.length).toBe(FB);
    expect(targetsOf(cr)).toEqual([SLUG]);
    expect(targetsOf(ad)).toEqual([SLUG]);
  });

  // Target set: exactly ONE ally, never the caster.
  it('Crit Rate 85.42% goes to exactly one non-self ally per Full Burst', () => {
    const cr = applies(BASE.events, 'critRatePct', 85.42);
    expect(cr.length).toBe(FB);
    for (const ev of cr) expect(ev.targetSlug).not.toBe(SLUG);
  });

  // DURATION SEMANTICS: 'for 1 round(s)' is a ROUND count on the holder, not one second.
  it("the 85.42% buff carries a ROUND duration (durationShots 1), not seconds", () => {
    const cr = applies(BASE.events, 'critRatePct', 85.42);
    expect(cr.length).toBeGreaterThan(0);
    for (const ev of cr) expect(ev.durationShots).toBe(1);
  });

  it('modelling the round duration as one second changes the outcome', () => {
    expect(teamTotal(CF_ROUNDS_TO_SEC.res)).not.toBe(teamTotal(BASE.res));
  });
});

describe('miranda burst — 2 top-final-ATK allies, except self', () => {
  const atk = applies(BASE.events, 'atkPct', 40.4);
  const cdm = applies(BASE.events, 'critDamagePct', 56.23);

  // NON-VACUITY. miranda is BURST I and shares stage 1 with liter in controlComp; if this fails,
  // the control fixture never lets her cast and the burst spec below is untested (a FIXTURE
  // finding, not necessarily an override defect).
  it('miranda actually casts her burst in the control comp', () => {
    expect(cdm.length).toBeGreaterThan(0);
  });

  it('each cast grants ATK 40.4% and Crit Damage 56.23% to the same two allies', () => {
    expect(atk.length).toBe(cdm.length);
    expect(cdm.length % 2).toBe(0);
    for (let i = 0; i < cdm.length; i += 2) {
      const pair = [cdm[i].targetSlug, cdm[i + 1].targetSlug];
      expect(new Set(pair).size).toBe(2); // two DISTINCT allies, not one ally twice
      expect(pair).not.toContain(SLUG); // except the skill user
    }
    expect(targetsOf(atk).sort()).toEqual(targetsOf(cdm).sort());
  });

  it('the burst grants never land on miranda herself', () => {
    for (const ev of atk) expect(ev.targetSlug).not.toBe(SLUG);
    // and they are strictly a 2-of-3 slice of the roster, never the whole team
    expect(targetsOf(cdm).length).toBeLessThanOrEqual(ROSTER.length - 1);
  });
});

describe('miranda — gaps (not discriminable in this fixture)', () => {
  it.skip('the exact 5 sec / 10 sec windows', () => {
    // The S1 trigger re-fires roughly every 2s (30 rounds at SMG cadence), so a 5 sec window and
    // a permanent buff are behaviourally identical here; only the 0.5s counterfactual above
    // proves the window is honoured at all. Pinning the exact length needs a frame-stamped
    // buffApply (expiresFrame minus the apply frame), which the event payload does not expose.
  });

  it.skip("byFinalAtk vs static-ATK ranking for the 'highest final ATK' target set", () => {
    // 'highest FINAL ATK' must rank by live effectiveAtk, but in the control comp the live and
    // static orderings of the three non-miranda allies do not demonstrably diverge, and the
    // harness exposes no per-unit ATK accessor to build the discriminating case blind.
  });
});


============================================================
## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5, written from kit prose alone)

DIFF vs DRIVER OVERRIDE (note/caveats prose stripped, key-order normalized): SEMANTICALLY IDENTICAL. The blind writer independently re-derived BOTH driver fixes (the two S1 hitRatePct lines 5.44-allies/3.79-alliesOfWeapon-SMG, and the S2 85.42 durationShots:1 round-count), byFinalAtk on all three highest-final-ATK targets, burstCast-vs-fullBurstEnter, and empty unmodeled.
============================================================

{
  "slug": "miranda",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 5.44,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SMG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 3.79,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 50.06,
          "durationSec": 5
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
          "stat": "critDamagePct",
          "value": 32.99,
          "durationSec": 10
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
          "stat": "critRatePct",
          "value": 30.1,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 23.7,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesTopAtk",
        "count": 1,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 85.42,
          "durationShots": 1
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
        "kind": "alliesTopAtk",
        "count": 2,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 40.4,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 56.23,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ Hit Rate ▲5.44% (all allies) and ▲3.79% (SMG allies) map to hitRatePct, whose core-hit lift (sim.ts hrCoreMult) is a DERIVED magnitude, not a kit quantity — the damage consequence of both lines is unmeasured for this unit.",
    "⚑ Cadence/reload tuple is datamine-sourced (SMG; ammo 120, reloadFrames 107) and per modeling-priors is the #1 uniform-heat cause. SMG is also the one class where nominal rate does not divide 60fps evenly, so the effective rate differs from nominal — verify against an ammo-counter read before trusting any hitCount:30 proc frequency.",
    "⚑ hitCount:30 is keyed to LANDED normal attacks ('after landing 30'). The engine's hitCount fires on the owner's hits; if SMG landing fraction < 1 in-game, the real proc interval is longer than the sim's. Unmeasured.",
    "skill2 block 3 'for 1 round(s)' is encoded as durationShots:1 per the ROUND-count rule (expires after the HOLDER fires 1 round, spanning reloads) — NOT wall-clock. On a fast-firing holder this window is ~1 frame-interval and contributes almost nothing; a wall-clock misread would massively over-credit. Flagged for judge scrutiny, but the text is literal.",
    "'except the skill user; including the skill user if there are not enough allies' is encoded as excludeSelf:true. The fallback self-inclusion branch is not expressible in TargetDef and is moot on a full 5-unit team (there are always enough allies).",
    "'highest final ATK' is literal → byFinalAtk:true (live effectiveAtk ranking) on both the skill2 single-target block and the burst 2-target block, per the A3 literal-word rule.",
    "Every skill1/skill2 line is a stat buff with no damage rider, DoT, weapon-swap, heal/shield, gauge, ammo, or reload component — there is nothing in this kit for the FB-timing (noFb) or range rules to apply to, and no ⚑ is owed for them.",
    "Burst is keyed to burstCast (this unit's own Burst I cast), not fullBurstEnter — a Burst I buff block fires on the rotations THIS unit casts. skill2's three blocks say 'entering Full Burst' literally, so they are fullBurstEnter (any team Full Burst), not burstCast."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (BLIND-STUDY, VALUES-WITHHELD): no override, tests, DECISIONS, probe data, or board output consulted. Pure support kit — 7 kit lines, all stat buffs, zero damage riders, zero weapon-state modifiers, zero heal/shield/gauge lines, so `unmodeled` is empty for all three slots (no silent drops). The three load-bearing judgment calls: (1) skill1's three lines share ONE trigger ('after landing 30 normal attacks') but THREE distinct target sets (all allies / SMG allies / self), so they are three blocks, and the SMG-scoped Hit Rate stacks additively on top of the all-ally Hit Rate for SMG holders including this unit; (2) skill2's 'for 1 round(s)' crit-rate grant is a ROUND count (durationShots:1), never 1 second — a seconds misread would be a large over-credit; (3) skill2 uses fullBurstEnter (text: 'when entering Full Burst' — fires on ANY team Full Burst) while the burst slot uses burstCast, which is the burstCast-vs-fullBurstEnter fidelity split. Damage-relevant risk is concentrated in the two hitRatePct lines (derived core-lift magnitude) and in the SMG cadence that sets the hitCount:30 proc rate."
}

============================================================
## SECTION 7a — DRIVER IMPLEMENTATION: test (scripts/tests/units/miranda.test.ts)
============================================================

// PER-UNIT KIT SPEC — `miranda` (Miranda (Treasure), Supporter/SMG/Fire, Burst I, cd 20s, ammo 120,
// fire rate 1440rpm). kit-autonomy gauntlet S2a (driver tests), 2026-07-25.
//
// One assertion group per KIT LINE (M1..M8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (treasure prose, data/characters.json → characters.miranda.skills; DB favorite-item prose
// matches this line-for-line since 2026-07-17):
//   S1 ■ after 30 normal attacks → all allies: Hit Rate ▲5.44% for 5 sec                    [M2 — FIX]
//      ■ after 30 normal attacks → all SMG-wielding allies: Hit Rate ▲3.79% for 5 sec        [M3 — FIX]
//      ■ after 30 normal attacks → self: ATK ▲50.06% for 5 sec                               [M1]
//   S2 ■ entering Full Burst → all allies: Critical Damage ▲32.99% for 10 sec                [M4]
//      ■ entering Full Burst → self: Critical Rate ▲30.1% + Attack Damage ▲23.7% for 10 sec  [M5]
//      ■ entering Full Burst → 1 highest-final-ATK ally (except self): Crit Rate ▲85.42% for 1 round [M6 — FIX]
//   BU ■ 2 highest-final-ATK allies (except self): ATK ▲40.4% for 10 sec                     [M7]
//      ■ 2 highest-final-ATK allies (except self): Critical Damage ▲56.23% for 10 sec        [M8]
//
// TWO FIXES this gauntlet makes to the previously-shipped (2026-07-17 reconciled) override:
//   (a) M2/M3 — the two S1 Hit Rate lines were dropped under "hard rule 4" PENDING CONE_DELTA
//       (override note: "re-evaluation queued (kit-audit plan 2026-07-20)"). CONE_DELTA landed
//       2026-07-19 and hitRatePct is now live-wired for accuracy-circle weapons (AR/SMG/SG); the
//       modernia gauntlet (2026-07-25) ships the identical stat. Hard rule 4 is "Hit Rate raises
//       the CORE-HIT rate, magnitude measured-only" — it PERMITS modeling the stat, it does not
//       forbid it. So both lines are now encoded (allies / alliesOfWeapon SMG, hitCount 30, 5s).
//       They are LOAD-BEARING on miranda herself: she is the only accuracy-circle unit in the
//       fixture (crown MG / ada RL / helm SR all keep the flat base core rate), so the +9.23%
//       (5.44 all + 3.79 SMG) lifts her OWN core fraction. The HR→core MAGNITUDE is derived
//       (acrForHR reticle regression; additive-in-pp composition UNVALIDATED R8) — flagged ⚑, the
//       same caveat modernia's hitRatePct carries.
//   (b) M6 — the "for 1 round(s)" crit snapshot was shipped as a wall-clock durationSec 1.5
//       ("one SR carry shot"). "1 round" is round-count language, identical to helm's "10 round(s)"
//       which is durationShots 10 (helm H9); the engine decrements shotsLeft on the HOLDER's shots
//       (sim.ts:2955), so durationShots 1 on the buffed ally = that ally's next ONE shot, which is
//       the literal mechanic for ANY carry cadence (1.5s is ~36 shots on an SMG — a 36× over-credit).
//       Re-encoded to durationShots 1, no wall-clock expiry. Duration semantics for rapid-fire
//       carries flagged ⚑ (recipe: count the buffed ally's crit-boosted shots per FB window).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  the self ATK line targets SELF only — counterfactual all-allies reaches 4 and moves the
//       carry total (the buff is large, 50.06%, and near-permanent at SMG cadence).
//   M2  hitRatePct to ALL allies reaches 4 holders; zeroing it drops miranda's own total (she is
//       the sole accuracy-circle consumer). Counterfactual stat-swap to atkPct is a different bucket.
//   M3  the SMG-scoped line reaches exactly ONE holder (miranda) — counterfactual all-allies reaches
//       4. Discriminated on TARGET COUNT, not damage: HR is inert on the 3 non-SMG allies anyway, so
//       the scoped vs unscoped damage is byte-identical here; the target set is the observable.
//   M4  team critDmg reaches all 4 on every one of the 9 FB windows; counterfactual self-only
//       reaches 1. fullBurstEnter (not burstCast) is the trigger — fires on EVERY team FB window.
//   M5  self critRate 30.1 + Attack Damage 23.7, both self-scoped. The AD line is attackDamagePct
//       (DamageUp bucket), NOT atkPct (base bucket) — counterfactual bucket-swap moves miranda damage.
//   M6  exactly ONE ally (the top-final-ATK, never miranda) at 85.42%, durationShots 1 with NO
//       wall-clock expiry. Counterfactual count 2 reaches 2; counterfactual durationSec 1.5 changes
//       the buffed ally's damage (many shots vs one).
//   M7  burst ATK 40.4% to exactly TWO allies (top-final-ATK, never miranda), per burst.
//       Counterfactual all-allies reaches 4 + moves total; counterfactual casterAtkPct (% of
//       miranda's LOW support ATK, not the target's own) collapses the buff and drops the carries.
//   M8  burst critDmg 56.23% to the same two allies, per burst (shares M7's block/target).
//
// Fixture (deterministic — no seed): miranda B1 / crown B2 / ada B3 / helm B3, boss Fire, focus ada.
// Miranda is the SOLE Burst I → casts every cycle (9 bursts / 9 FB windows over 180s). Top-final-ATK
// ally (count 1) = ada (slot 2); top-2 = ada + helm (slots 2,3); excludeSelf drops miranda (slot 0).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const ALLIES = 4;
const COMP = ['miranda', 'crown', 'ada', 'helm'];
const MIRANDA = 0;
const ADA = 2;
const HELM = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, t: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);

/** M1 counterfactual: the self ATK line retargeted to all allies. */
const mirandaSelfAtkToAllies = withPatchedOverride('miranda', (ov) => {
  const blk = (ov as any).skill1.find((b: any) => hasStat(b, 'atkPct'));
  if (!blk) throw new Error('miranda S1 atkPct block missing — fixture is stale');
  blk.target = { kind: 'allies' };
});
/** M2/M3 load-bearing reference: remove BOTH Hit Rate lines (best-effort — absent pre-S3 FIX). */
const mirandaNoHR = withPatchedOverride('miranda', (ov) => {
  (ov as any).skill1 = (ov as any).skill1.filter((b: any) => !hasStat(b, 'hitRatePct'));
});
/** M3 counterfactual: the SMG-scoped HR line retargeted to all allies (best-effort pre-S3). */
const mirandaSMGToAllAllies = withPatchedOverride('miranda', (ov) => {
  for (const b of (ov as any).skill1)
    if (hasStat(b, 'hitRatePct') && b.target?.kind === 'alliesOfWeapon')
      b.target = { kind: 'allies' };
});
/** M4 counterfactual: the team critDmg line retargeted to self only. */
const mirandaS2CritDmgSelf = withPatchedOverride('miranda', (ov) => {
  const blk = (ov as any).skill2.find(
    (b: any) => hasStat(b, 'critDamagePct') && b.target?.kind === 'allies',
  );
  if (!blk) throw new Error('miranda S2 allies critDamagePct block missing — fixture is stale');
  blk.target = { kind: 'self' };
});
/** M5 counterfactual: the self Attack Damage line bucket-swapped to atkPct (base, not DamageUp). */
const mirandaS2ADWrongBucket = withPatchedOverride('miranda', (ov) => {
  const e = (ov as any).skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'attackDamagePct');
  if (!e) throw new Error('miranda S2 attackDamagePct effect missing — fixture is stale');
  e.stat = 'atkPct';
});
/** M6 counterfactual: the 85.42 crit snapshot count bumped 1 → 2. */
const mirandaS2Crit85Count2 = withPatchedOverride('miranda', (ov) => {
  const blk = (ov as any).skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'critRatePct' && Math.abs(e.value - 85.42) < 0.01),
  );
  if (!blk) throw new Error('miranda S2 85.42 critRate block missing — fixture is stale');
  blk.target.count = 2;
});
/** M6 counterfactual: the round-count snapshot forced back to a 1.5s wall-clock window. */
const mirandaS2Crit85Seconds = withPatchedOverride('miranda', (ov) => {
  const e = (ov as any).skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'critRatePct' && Math.abs(x.value - 85.42) < 0.01);
  if (!e) throw new Error('miranda S2 85.42 critRate effect missing — fixture is stale');
  delete e.durationShots;
  e.durationSec = 1.5;
});
/** M7 counterfactual: the burst ATK line retargeted to all allies. */
const mirandaBurstAtkAllAllies = withPatchedOverride('miranda', (ov) => {
  const blk = (ov as any).burst.find((b: any) => hasStat(b, 'atkPct'));
  if (!blk) throw new Error('miranda burst atkPct block missing — fixture is stale');
  blk.target = { kind: 'allies' };
});
/** M7 counterfactual: the burst ATK line swapped to casterAtkPct (% of miranda's OWN low ATK). */
const mirandaBurstAtkCaster = withPatchedOverride('miranda', (ov) => {
  const e = (ov as any).burst.flatMap((b: any) => b.effects).find((x: any) => x.stat === 'atkPct');
  if (!e) throw new Error('miranda burst atkPct effect missing — fixture is stale');
  e.stat = 'casterAtkPct';
});
/** Load-bearing reference: miranda's whole kit zeroed. */
const mirandaDead = withPatchedOverride('miranda', (ov) => {
  (ov as any).skill1 = [];
  (ov as any).skill2 = [];
  (ov as any).burst = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noHR = run({ miranda: mirandaNoHR });
const smgToAll = run({ miranda: mirandaSMGToAllAllies });
const selfAtkAllies = run({ miranda: mirandaSelfAtkToAllies });
const s2CritDmgSelf = run({ miranda: mirandaS2CritDmgSelf });
const s2ADWrong = run({ miranda: mirandaS2ADWrongBucket });
const s2Crit85Count2 = run({ miranda: mirandaS2Crit85Count2 });
const s2Crit85Seconds = run({ miranda: mirandaS2Crit85Seconds });
const burstAtkAllies = run({ miranda: mirandaBurstAtkAllAllies });
const burstAtkCaster = run({ miranda: mirandaBurstAtkCaster });
const dead = run({ miranda: mirandaDead });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === MIRANDA);
const byStat = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter((b) => b.stat === stat && Math.abs(b.value - value) < 0.01);
const mirandaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'miranda').length;
const distinctTargets = (list: BuffApply[]) => new Set(list.map((b) => b.targetIdx));
const durationsSec = (list: BuffApply[]) =>
  new Set(list.map((b) => (b.expiresFrame! - b.frame) / FPS));
const sum = (t: Record<string, number>) => COMP.reduce((a, s) => a + t[s], 0);

describe('miranda (Treasure) — kit spec', () => {
  describe('M1 — S1 self ATK ▲50.06% (hitCount 30 → self, 5s)', () => {
    const list = byStat(base.events, 'atkPct', 50.06);
    it('is self-scoped, 50.06%, for 5s, firing repeatedly at SMG cadence', () => {
      expect(list.length, 'no self ATK 50.06 buff applied').toBeGreaterThan(0);
      expect([...distinctTargets(list)], 'must be miranda only').toEqual([MIRANDA]);
      expect([...durationsSec(list)]).toEqual([5]);
      expect(list.length, 'near-permanent at ~1.5s per 30 hits').toBeGreaterThan(20);
    });
    it('DISCRIMINATES the target: all-allies reaches 4 and moves the carry total', () => {
      expect(distinctTargets(byStat(selfAtkAllies.events, 'atkPct', 50.06)).size).toBe(ALLIES);
      expect(sum(selfAtkAllies.t)).not.toBe(sum(base.t));
    });
  });

  describe('M2 — S1 Hit Rate ▲5.44% to ALL allies (hitCount 30, 5s) [FIX]', () => {
    const list = byStat(base.events, 'hitRatePct', 5.44);
    it('reaches all four allies, 5.44%, for 5s', () => {
      expect(list.length, 'no 5.44 Hit Rate buff applied — line still dropped').toBeGreaterThan(0);
      expect(distinctTargets(list).size, 'all allies').toBe(ALLIES);
      expect([...durationsSec(list)]).toEqual([5]);
    });
    it('is LOAD-BEARING: zeroing the Hit Rate lines drops miranda (the sole accuracy-circle unit)', () => {
      expect(base.t.miranda).toBeGreaterThan(noHR.t.miranda);
    });
  });

  describe('M3 — S1 Hit Rate ▲3.79% to SMG-wielding allies only (hitCount 30, 5s) [FIX]', () => {
    const list = byStat(base.events, 'hitRatePct', 3.79);
    it('reaches exactly the SMG ally (miranda), not the MG/RL/SR allies', () => {
      expect(list.length, 'no 3.79 Hit Rate buff applied — line still dropped').toBeGreaterThan(0);
      expect([...distinctTargets(list)], 'only miranda is SMG in this comp').toEqual([MIRANDA]);
    });
    it('DISCRIMINATES the weapon scope: retargeting to all allies reaches 4 holders', () => {
      expect(distinctTargets(byStat(smgToAll.events, 'hitRatePct', 3.79)).size).toBe(ALLIES);
    });
  });

  describe('M4 — S2 Critical Damage ▲32.99% to all allies (fullBurstEnter, 10s)', () => {
    const list = byStat(base.events, 'critDamagePct', 32.99);
    it('reaches all four allies on every FB window, for 10s', () => {
      const windows = mirandaBursts(base.events);
      expect(windows).toBeGreaterThan(0);
      expect(distinctTargets(list).size).toBe(ALLIES);
      expect(list.length, 'one application per ally per FB window').toBe(windows * ALLIES);
      expect([...durationsSec(list)]).toEqual([10]);
    });
    it('DISCRIMINATES the target: self-only reaches 1 holder', () => {
      expect(distinctTargets(byStat(s2CritDmgSelf.events, 'critDamagePct', 32.99)).size).toBe(1);
    });
  });

  describe('M5 — S2 self Critical Rate ▲30.1% + Attack Damage ▲23.7% (fullBurstEnter, 10s)', () => {
    const crit = byStat(base.events, 'critRatePct', 30.1);
    const ad = byStat(base.events, 'attackDamagePct', 23.7);
    it('both self-scoped, for 10s, on every FB window', () => {
      expect([...distinctTargets(crit)]).toEqual([MIRANDA]);
      expect([...distinctTargets(ad)]).toEqual([MIRANDA]);
      expect([...durationsSec(crit)]).toEqual([10]);
      expect([...durationsSec(ad)]).toEqual([10]);
    });
    it('DISCRIMINATES the bucket: Attack Damage is attackDamagePct, not atkPct (moves her damage)', () => {
      expect(s2ADWrong.t.miranda).not.toBe(base.t.miranda);
    });
  });

  describe('M6 — S2 Critical Rate ▲85.42% to 1 highest-final-ATK ally, "for 1 round" [FIX]', () => {
    const list = byStat(base.events, 'critRatePct', 85.42);
    it('buffs exactly ONE ally, never miranda (excludeSelf), at 85.42%', () => {
      expect(list.length, 'no 85.42 crit snapshot applied').toBeGreaterThan(0);
      expect(distinctTargets(list).size, 'alliesTopAtk count 1').toBe(1);
      expect([...distinctTargets(list)]).not.toContain(MIRANDA);
    });
    it('is a ROUND count (durationShots 1), with NO wall-clock expiry', () => {
      expect([...new Set(list.map((b) => b.durationShots))], '1 round → durationShots 1').toEqual([1]);
      expect(
        [...new Set(list.map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry',
      ).toEqual([null]);
    });
    it('is encoded alliesTopAtk/byFinalAtk/count 1/excludeSelf (structural pin)', () => {
      const ov = withPatchedOverride('miranda', () => {}) as any;
      const blk = ov.skill2.find((b: any) =>
        b.effects.some((e: any) => e.stat === 'critRatePct' && Math.abs(e.value - 85.42) < 0.01),
      );
      expect(blk.target).toEqual({
        kind: 'alliesTopAtk',
        byFinalAtk: true,
        count: 1,
        excludeSelf: true,
      });
      expect(blk.trigger).toEqual({ kind: 'fullBurstEnter' });
    });
    it('DISCRIMINATES the count: count 2 reaches two allies', () => {
      expect(distinctTargets(byStat(s2Crit85Count2.events, 'critRatePct', 85.42)).size).toBe(2);
    });
    it('DISCRIMINATES the duration: a 1.5s window changes the buffed carry\'s damage vs one shot', () => {
      expect(s2Crit85Seconds.t.ada).not.toBe(base.t.ada);
    });
  });

  describe('M7 — burst ATK ▲40.4% to 2 highest-final-ATK allies (burstCast, 10s)', () => {
    const list = byStat(base.events, 'atkPct', 40.4);
    it('buffs exactly TWO allies, never miranda, once per burst, for 10s', () => {
      const bursts = mirandaBursts(base.events);
      expect(bursts).toBeGreaterThan(0);
      expect(distinctTargets(list).size, 'alliesTopAtk count 2').toBe(2);
      expect([...distinctTargets(list)]).not.toContain(MIRANDA);
      expect(list.length, 'one application per ally per burst').toBe(bursts * 2);
      expect([...durationsSec(list)]).toEqual([10]);
    });
    it('DISCRIMINATES the count: all-allies reaches 4 and moves the total', () => {
      expect(distinctTargets(byStat(burstAtkAllies.events, 'atkPct', 40.4)).size).toBe(ALLIES);
      expect(sum(burstAtkAllies.t)).not.toBe(sum(base.t));
    });
    it('DISCRIMINATES the stat: atkPct (% of target OWN) ≠ casterAtkPct (% of miranda low ATK)', () => {
      expect(burstAtkCaster.t.ada).not.toBe(base.t.ada);
      expect(burstAtkCaster.t.helm).not.toBe(base.t.helm);
    });
  });

  describe('M8 — burst Critical Damage ▲56.23% to the same 2 allies (burstCast, 10s)', () => {
    const list = byStat(base.events, 'critDamagePct', 56.23);
    it('buffs exactly TWO allies, never miranda, once per burst, for 10s', () => {
      const bursts = mirandaBursts(base.events);
      expect(distinctTargets(list).size).toBe(2);
      expect([...distinctTargets(list)]).not.toContain(MIRANDA);
      expect(list.length).toBe(bursts * 2);
      expect([...durationsSec(list)]).toEqual([10]);
    });
    it('shares the burst block/target with M7 (structural pin)', () => {
      const ov = withPatchedOverride('miranda', () => {}) as any;
      const blk = ov.burst.find((b: any) => hasStat(b, 'critDamagePct'));
      expect(blk.target).toEqual({
        kind: 'alliesTopAtk',
        byFinalAtk: true,
        count: 2,
        excludeSelf: true,
      });
      expect(blk.trigger).toEqual({ kind: 'burstCast' });
    });
  });

  describe('kit contribution is damage-load-bearing (not inert)', () => {
    it("zeroing miranda's whole kit drops both carries", () => {
      expect(base.t.ada).toBeGreaterThan(dead.t.ada);
      expect(base.t.helm).toBeGreaterThan(dead.t.helm);
    });
  });

  describe('unmodeled lines (structural pins)', () => {
    it('every kit line is now modeled — all unmodeled slots empty after the FIX', () => {
      const ov = withPatchedOverride('miranda', () => {}) as any;
      expect(ov.unmodeled.skill1).toEqual([]);
      expect(ov.unmodeled.skill2).toEqual([]);
      expect(ov.unmodeled.burst).toEqual([]);
    });
  });
});


============================================================
## SECTION 7b — DRIVER IMPLEMENTATION: override (src/skills/overrides/miranda.json)
============================================================

{
  "note": "TREASURE KIT (user-provided screenshot 2026-07-13; base weapon row matches). CONFIRMED 2026-07-17: the DB sync now carries miranda's favorite-item prose and it MATCHES this screenshot-derived model line-for-line (self ATK 50.06; S2 ally critDmg 32.99 + self critRate 30.1/AD 23.7 + 1-topAtk critRate 85.42; burst 2-topAtk ATK 40.4/critDmg 56.23) — no change needed. [2026-07-17 EXCLUDE-SELF FIX] alliesTopAtk gained excludeSelf (was silently ignored) — both her S2 (1 top-ATK) and burst (2 top-ATK) targets now carry excludeSelf:true per kit ('except the skill user'). Board-neutral (she is a low-ATK support so top-N almost never included her anyway; not board-measured), but now faithful. Bossing S buffer. S1 (Phase 3): per 30 of her normal attacks — Hit Rate buffs unmodeled — hitRatePct is live for AR/SMG/SG via acrForHR, so the 3.79% SMG-ally line would lift SMG-ally core rate; re-evaluation queued (kit-audit plan 2026-07-20); SELF ATK 50.06%/5s at SMG cadence (~1.5s per 30 hits) = effectively permanent, modeled hitCount 30. S2 (Phase 2) on FB enter: allies Crit Damage 32.99%/10s; self Crit Rate 30.1 + Attack Damage 23.7/10s; 1 highest-ATK ally (except caster): Crit Rate 85.42% 'for 1 round' -> modeled as 1.5s (one SR carry shot; the famous Miranda crit-snapshot for RH/Alice). Burst (20s): 2 highest-ATK allies (except caster): ATK 40.4% + Crit Damage 56.23%/10s. alliesTopAtk excludeSelf:true (fixed 2026-07-17); she is a low-ATK support so top-2 rarely included her anyway. Kit-autonomy gauntlet 2026-07-25: two FIXES, both independently re-derived by the cross-family S2b reviewer (claude-fable-5, zero divergences). FIX-A: the two S1 Hit Rate lines (5.44 all allies / 3.79 SMG-wielding allies) were dropped under hard rule 4 PENDING CONE_DELTA (note 2026-07-17: 're-evaluation queued (kit-audit plan 2026-07-20)'); CONE_DELTA landed 2026-07-19 and hitRatePct is now live-wired for accuracy-circle weapons (AR/SMG/SG; modernia ships the identical stat 2026-07-25), so both are now encoded (hitCount 30, allies / alliesOfWeapon SMG, 5s) and removed from unmodeled. Hard rule 4 = 'Hit Rate raises the CORE-HIT rate, magnitude measured-only' — it PERMITS the stat, it does not forbid it. Load-bearing on miranda herself: she is the only accuracy-circle unit in the audit fixture (crown MG / ada RL / helm SR keep the flat base core rate), so +9.23% (5.44+3.79) lifts her OWN core fraction; the team value is the AR/SMG/SG consumer. ⚑ HR->core MAGNITUDE is derived (acrForHR reticle regression; additive-in-pp composition UNVALIDATED R8; HRCORE-gated) — same caveat modernia's hitRatePct carries; recipe: CORE HIT popup fraction inside vs outside the ~5s post-30-hit window in a Miranda focus video, on an AR/SMG/SG ally. FIX-B: the S2 '1 highest-final-ATK ally Crit Rate 85.42% for 1 round' line was shipped as durationSec 1.5 ('one SR carry shot'); 'for 1 round(s)' is round-count language identical to helm's '10 round(s)' (durationShots 10, helm H9), and the engine decrements shotsLeft on the HOLDER's shots (sim.ts:2955), so re-encoded durationShots 1 / no wall-clock expiry = the buffed ally's next ONE shot at +85.42 crit for ANY carry cadence (1.5s was ~36 shots on an SMG, a 36x over-credit; ~1 on an SR, which is why the fudge survived). ⚑ '1 round' durationShots semantics for rapid-fire carries is the literal model but the in-game round definition is unverified; recipe: count the buffed ally's crit-boosted shots per FB window in a focus video (expect exactly 1). Every kit line now modeled; unmodeled fully empty.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 5.44,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SMG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 3.79,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 50.06,
          "durationSec": 5
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
          "stat": "critDamagePct",
          "value": 32.99,
          "durationSec": 10
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
          "stat": "critRatePct",
          "value": 30.1,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 23.7,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesTopAtk",
        "byFinalAtk": true,
        "count": 1,
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 85.42,
          "durationShots": 1
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
        "kind": "alliesTopAtk",
        "byFinalAtk": true,
        "count": 2,
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 40.4,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 56.23,
          "durationSec": 10
        }
      ]
    }
  ]
}
