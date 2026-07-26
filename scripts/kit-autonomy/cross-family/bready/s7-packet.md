# S7 RECONCILING JUDGE PACKET - unit `bready` (Bready)
# Assembled by the Qwen driver per the gauntlet protocol. NOT de-contaminated (the judge grades the
# driver's artifacts). Binding verdict JSON => scripts/kit-autonomy/results/bready.json.

## (1) JUDGE CONTRACT
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


## (2) MECHANICS SSOT
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


## (3) GROUND TRUTH - kit prose + base stats (data/characters.json -> characters.bready)
```json
{
  "slug": "bready",
  "name": "Bready",
  "weapon": "SR",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Water",
  "manufacturer": "Tetra",
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "burstGaugePerShot": 2.8,
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
    "resourceId": 520
  },
  "skills": {
    "skill1": "\u25a0 Activates when entering Full Burst. Affects self.\nATK \u25b2 70.01% for 10 sec.\n\u25a0 Activates when gaining a buff that increases sustained damage. Affects self.\nLingering Taste: Charge Speed \u25bc 20% for 50 sec. This effect cannot be removed.\nCancels Recommended Taste.\n\u25a0 Activates when gaining a buff that increases distributed damage while not in a state of increased sustained damage. Affects self.\nRecommended Taste: Charge Speed \u25bc 20% for 50 sec. This effect cannot be removed.\nCancels Lingering Taste.",
    "skill2": "\u25a0 Activates after landing 3 Full Charge attack(s) while in Lingering Taste status. Affects the target.\nDamage Taken \u25b2 10.2% for 5 sec.\nAftertaste: Deals  150.04% of final ATK as sustained damage every 1 sec for 5 sec.\n\u25a0 Activates when hitting a target with Full Charge while in Recommended Taste status. Affects self.\nAttack Damage \u25b2 60.01% for 5 sec.\n\u25a0 Activates when hitting a target with Full Charge while in Recommended Taste status. Affects all enemies.\nDeals 265.07% of final ATK as distributed damage.",
    "burst": "\u25a0 Affects self.\nAttack Damage \u25b2 60.19% for 10 sec.\n\u25a0 Activates when in Lingering Taste status. Affects self.\nAftertaste Effect \u25b2 349.8% for 10 sec.\n\u25a0 Activates when in Recommended Taste status. Affects self.\nATK \u25b2 70.09% for 10 sec."
  }
}
```

## (4) S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)
```json
{
  "slug": "bready",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ entering Full Burst: ATK ▲ 70.01%",
      "disposition": "FAITHFUL",
      "scope": "generic ATK (atkPct), no attack-type scoping",
      "durationSemantics": "durationSec 10 (wall-clock), refreshed each FB entry",
      "triggerIdentity": "fullBurstEnter — 'when entering Full Burst' = ANY team FB, not burstCast",
      "targetSet": "self only",
      "nearestWrongModel": "Keyed to burstCast so it only fires on rotations bready herself bursts — under-credits in the control comp where helm is co-B3 and takes alternate rotations",
      "distinguishingAssertion": "controlComp('bready') with helm co-B3: count of buffApply {stat:'atkPct', value:70.01, targetSlug:'bready'} === count of fullBurstStart events (green); under burstCast it is ~half the fullBurstStart count (red)",
      "inertness": "No ally ever receives atkPct 70.01; no application outside an FB-entry frame",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ gain sustained-dmg buff → Lingering",
      "disposition": "FIX",
      "scope": "self state machine + self chargeSpeedPct -20 while Lingering Taste held",
      "durationSemantics": "50 sec, 'cannot be removed', re-applied per trigger — effectively continuous while the taste is held; NOT rounds",
      "triggerIdentity": "'when gaining a buff that increases sustained damage' — a buff-GAIN trigger with NO TriggerDef kind in the schema; faithful encoding is a mode gate (modes: lingering/recommended) since taste entry depends on which flavor of team buff arrives",
      "targetSet": "self only",
      "nearestWrongModel": "Dropping Charge Speed ▼ 20% as 'defensive, no damage' (taxonomy #6 — charge speed gates shot count on an SR), or sign-flipping ▼ into +20 speed, or hard-coding Lingering always-on regardless of team",
      "distinguishingAssertion": "With Lingering mode active: buffApply {stat:'chargeSpeedPct', value:-20, targetSlug:'bready'} exists, AND bready's shot-event count over the fight is LOWER than under withPatchedOverride removing the chargeSpeed effect (charge 60f → 75f); red if the debuff is absent or positive",
      "inertness": "Must never be active simultaneously with Recommended Taste ('Cancels Recommended Taste'); never touches allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ gain distributed buff, no sustained →Rec",
      "disposition": "FIX",
      "scope": "self state machine + self chargeSpeedPct -20 while Recommended Taste held",
      "durationSemantics": "50 sec, unremovable, re-applied — continuous while held",
      "triggerIdentity": "buff-gain trigger gated on 'while NOT in a state of increased sustained damage' — Lingering has PRIORITY over Recommended; no schema trigger kind → mode gate",
      "targetSet": "self only",
      "nearestWrongModel": "Allowing both tastes concurrently (double chargeSpeed -20 and BOTH skill2 effect families live at once), or inverting the priority so a distributed buff overrides an existing Lingering state",
      "distinguishingAssertion": "At no frame do a Recommended-family event (distributed-flavor flatDamage mult 265.07) and a Lingering-family event (sustained Aftertaste tick mult 150.04) both originate from bready within the same taste window; exactly one chargeSpeedPct -20 instance is held at a time",
      "inertness": "Zero Recommended-family procs while Lingering is held",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ 3 Full Charges in Lingering → target",
      "disposition": "FAITHFUL",
      "scope": "Full Charge attacks only (counter counts landed full charges, i.e. ROUNDS for this SR, never pellets/ticks)",
      "durationSemantics": "Damage Taken ▲ 10.2%: durationSec 5. Aftertaste: dot atkPct 150.04, intervalSec 1, durationSec 5 → exactly 5 ticks per instance; each 3-charge proc appends an INDEPENDENT instance (engine never dedups)",
      "triggerIdentity": "chargeCounter/hitCount count:3 on full charges, mode-gated Lingering; on-hit (landing), not on-pull",
      "targetSet": "the target (BOSS) for BOTH effects — Damage Taken ▲ is a boss debuff benefiting the whole team, not a self buff",
      "nearestWrongModel": "Two traps: (a) encoding Damage Taken ▲ 10.2% as a SELF attackDamagePct buff (taxonomy #4); (b) encoding Aftertaste as one continuous fight-length DoT, or leaving a long durationSec on the repeating 3-charge trigger so instances multiply (taxonomy #5)",
      "distinguishingAssertion": "Every 3rd bready full-charge in Lingering emits buffApply {stat:'damageTakenPct', value:10.2, casterIdx:null, targetIdx:null} (boss-held); each Aftertaste instance yields exactly 5 sustained-flavor damage events at mult 150.04 then stops; teammates' totals() rise vs a patched override with the debuff deleted (team-wide benefit)",
      "inertness": "Zero procs while in Recommended Taste or tasteless; DoT ticks never exceed 5 per instance; no self-targeted damageTakenPct ever appears",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ FC hit in Recommended: Atk Dmg ▲60.01%",
      "disposition": "FAITHFUL",
      "scope": "Attack Damage = attackDamagePct (Damage-Up bucket), NOT atkPct",
      "durationSemantics": "durationSec 5, refreshed per full-charge hit — effectively permanent uptime while firing (SR cadence ~1.25s < 5s)",
      "triggerIdentity": "per full-charge HIT (on-hit each shot), mode-gated Recommended",
      "targetSet": "self only",
      "nearestWrongModel": "Writing it as atkPct 60.01 (wrong bucket — no dilution vs Damage-Up dilution, compounds differently with the burst's attackDamagePct 60.19), or leaving it ungated so it also runs in Lingering",
      "distinguishingAssertion": "In Recommended: buffApply {stat:'attackDamagePct', value:60.01, targetSlug:'bready'} recurs once per bready shot; in Lingering mode the count is ZERO; red if the stat key is atkPct",
      "inertness": "Zero applications in Lingering/tasteless; never applied to allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ FC hit in Recommended: 265.07% distrib",
      "disposition": "FAITHFUL",
      "scope": "rider on every full-charge hit; 'all enemies' collapses to the single boss",
      "durationSemantics": "instant flatDamage per proc, no duration",
      "triggerIdentity": "per full-charge HIT, mode-gated Recommended; flatDamage atkPct 265.07 flavor 'distributed', noRange:true (universal rider rule), crit at caster rate, NO core, FB by landing timing (noFb default OFF)",
      "targetSet": "enemy",
      "nearestWrongModel": "Firing it in both tastes (or tasteless), or granting it core (text lacks 'core strike'), or force-setting noFb:true without measurement",
      "distinguishingAssertion": "In Recommended: distributed-flavor damage events from bready at mult 265.07 === bready's shot count, each with core rate 0 and rangeApplied false; in Lingering the count is ZERO",
      "inertness": "No distributed rider events in Lingering; no core bucket on any rider hit",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ self: Attack Damage ▲ 60.19% 10s",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage-Up bucket), unconditional line of her own burst",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast — a self line in the unit's OWN burst block with no activation clause fires on HER cast only, NOT fullBurstEnter",
      "targetSet": "self only",
      "nearestWrongModel": "Keyed to fullBurstEnter so it also fires on helm's rotations — over-credits ~2× in any co-B3 comp (the classic burstCast/fullBurstEnter swap)",
      "distinguishingAssertion": "count of buffApply {stat:'attackDamagePct', value:60.19} === count of burstCast events by bready (green); === count of fullBurstStart events (red)",
      "inertness": "Never applies on rotations where the other B3 bursts",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ in Lingering: Aftertaste Eff ▲349.8%",
      "disposition": "FIX",
      "scope": "scoped to HER Aftertaste damage specifically — a named-effect multiplier, not a generic sustained-damage team stat",
      "durationSemantics": "durationSec 10 from her burst cast",
      "triggerIdentity": "burstCast + Lingering gate ('Activates when in Lingering Taste status' checked at cast)",
      "targetSet": "self only",
      "nearestWrongModel": "Two-layer trap: (a) fullBurstEnter keying; (b) encoding as additive sustainedDamagePct 349.8 in the shared Damage-Up bucket, where it is DILUTED by crown/liter-style Damage-Up and would also boost any other sustained source — the prose reads as a multiplier on the Aftertaste effect itself (tick ≈ 150.04×4.498 ≈ 674.9%). The additive-vs-multiplicative choice is a ⚑ the driver must state, not silently pick",
      "distinguishingAssertion": "For 10s after bready's OWN burst in Lingering, Aftertaste tick damage values rise vs pre-burst ticks by the encoded factor (under a true multiplier: ratio ≈ 4.498 independent of other buffs; under additive Damage-Up: ratio shrinks as other Damage-Up is present); ZERO change in Recommended mode; no effect on rotations she does not burst",
      "inertness": "No Aftertaste boost in Recommended/tasteless; no boost to her charge-shot or distributed damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ in Recommended: ATK ▲ 70.09% 10s",
      "disposition": "FAITHFUL",
      "scope": "generic atkPct",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast + Recommended gate",
      "targetSet": "self only",
      "nearestWrongModel": "Applying regardless of taste, or fullBurstEnter keying — AND value-collision with skill1's 70.01: an assertion filtering loosely on ~70 conflates the two lines",
      "distinguishingAssertion": "buffApply {stat:'atkPct', value:70.09} appears ONLY at bready burstCast frames while in Recommended (exact-value filter distinguishes it from the FB-enter 70.01); zero occurrences in Lingering",
      "inertness": "Absent in Lingering mode; absent on other units' burst rotations",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:FB-enter ATK 70.01",
    "skill1:Lingering entry + chargeSpeed -20",
    "skill1:Recommended entry + chargeSpeed -20",
    "skill2:3-charge Lingering DT 10.2 + Aftertaste dot 150.04",
    "skill2:Recommended FC-hit attackDamage 60.01",
    "skill2:Recommended FC-hit distributed 265.07",
    "burst:attackDamage 60.19",
    "burst:Lingering Aftertaste Effect 349.8",
    "burst:Recommended ATK 70.09"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "This effect cannot be removed. (both Taste lines — no dispel exists in the sim; inert)",
      "Cancels Recommended Taste. / Cancels Lingering Taste. (dynamic mid-fight taste SWITCHING is unmodeled if the override encodes tastes as static user-selected modes)"
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "THE load-bearing modeling decision is taste ENTRY: 'when gaining a buff that increases sustained/distributed damage' has no TriggerDef kind, and entry is strictly TEAM-dependent — nothing in bready's own kit bootstraps a taste (her burst's Aftertaste Effect ▲ only fires when ALREADY Lingering, and dealing distributed damage is not 'gaining a buff'). In controlComp (liter/crown/helm) no one plausibly grants sustainedDamagePct or distributedDamagePct, so a literal encoding leaves her TASTELESS with skill2 and burst lines 2-3 all dead. Expect the shipped override to declare modes:['recommended','lingering'] (or similar) with a documented default; the driver must state which taste is default and WHY, and tests must exercise BOTH modes via withPatchedOverride/mode selection — a single-mode test suite cannot cover 6 of the 9 lines. Expected shared-prior misreads to check hardest: (1) Charge Speed ▼ 20% skipped as non-damage — it stretches the SR charge 60f→75f and cuts shot count (weapon-state modifiers ARE damage); (2) Damage Taken ▲ 10.2% encoded as a self buff instead of a boss debuff; (3) Aftertaste Effect ▲ 349.8% flattened into additive Damage-Up (sustainedDamagePct) when the prose reads as a named-effect multiplier on the 150.04% tick — whichever the driver picks must be an explicit ⚑ with the dilution consequence stated; (4) the 70.01 (S1 FB-enter) vs 70.09 (burst Recommended) near-collision — assertions must filter on exact value AND trigger context or they silently pass under a line swap; (5) Aftertaste DoT must append a fresh 5-tick instance per 3-charge proc, never a deduped/continuous DoT. Cadence sanity: ammo 6, charge 1s (1.25s in-taste), reload 141f≈2.35s → an Aftertaste proc roughly every ~3.75-4s of Lingering fire, ~2 procs per magazine; assertions on proc counts should tolerate reload gaps. No unit-name or magnitude leak detected in the redacted methodology (examples name other units only).",
  "model": "claude-fable-5"
}

```

## (5) S5 BLIND TEST (claude-opus-5) + green/red count vs the DRIVER override
### blind/bready.test.ts
```ts
/**
 * bready - SR / Water / Attacker / Burst III (burst cd 40s, ammo 6, charge 60f, reload 141f).
 * BLIND kit-spec pins: authored from the kit prose ALONE (no sight of the driver override, the
 * driver tests, or any truth file). Every magnitude below is quoted from the prose.
 *
 * KIT
 *   S1a  entering Full Burst, self:            ATK +70.01% for 10 sec
 *   S1b  Lingering Taste:                      Charge Speed -20% for 50 sec, cannot be removed
 *   S1c  Recommended Taste:                    Charge Speed -20% for 50 sec, cannot be removed
 *        Both Tastes are entered by -gaining a buff that increases sustained / distributed
 *        damage-. The engine has NO such trigger primitive, so the pair can only be a MODE pair;
 *        these tests probe the two branches by REVERSING the override modes array (first = default).
 *   S2a  Lingering, after 3 Full Charges, target: Damage Taken +10.2% for 5 sec
 *        + Aftertaste 150.04% of final ATK as sustained damage every 1 sec for 5 sec
 *   S2b  Recommended, on Full Charge hit, self:   Attack Damage +60.01% for 5 sec
 *   S2c  Recommended, on Full Charge hit, enemies: 265.07% of final ATK, distributed
 *   Ba   burst, self, NO activation clause = burst-CAST: Attack Damage +60.19% for 10 sec
 *   Bb   burst, Lingering, self:               Aftertaste Effect +349.8% for 10 sec
 *   Bc   burst, Recommended, self:             ATK +70.09% for 10 sec
 *
 * FIXTURE  controlComp('bready', true) = liter B1 / crown B2 / bready B3 / helm B3.
 *   B1+B2 are mandatory (a lone B3 makes ZERO Full Bursts). The SECOND B3 (helm) is what makes the
 *   trigger-identity pins discriminating: with a 40s burst CD over a ~20-25s rotation bready cannot
 *   cast on every rotation, so her burstCast count < the fullBurstStart count. That gap is exactly
 *   what separates S1a (fullBurstEnter, fires on EVERY team Full Burst) from Ba (burst-cast, fires
 *   only on the rotations SHE casts) - the classic over-credit failure mode.
 *
 * METHOD  13 hoisted runs (each runComp is a full 180s sim). Structural pins read the override
 *   effect fields through withPatchedOverride (in-memory clone; the committed JSON is untouched);
 *   behavioural pins read buffApply events off cfg.onEvent plus per-slug totals. Every
 *   counterfactual records how many effects it actually removed or re-triggered, so no pin can
 *   pass vacuously against an override that never carried the line.
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

const SLUG = 'bready';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type Ev = SimEvent & Record<string, any>;
type Ov = any;

interface Run {
  evs: Ev[];
  res: ReturnType<typeof runComp>;
  total: number;
}

const near = (a: unknown, b: number, tol = 0.02) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

const blocksOf = (ov: Ov): any[] =>
  SLOTS.flatMap((s) => (Array.isArray(ov?.[s]) ? (ov[s] as any[]) : []));
const effectsOf = (ov: Ov): any[] =>
  blocksOf(ov).flatMap((b) => (Array.isArray(b?.effects) ? b.effects : []));

function dropEffects(ov: Ov, pred: (e: any) => boolean): any[] {
  const dropped: any[] = [];
  for (const b of blocksOf(ov)) {
    const keep: any[] = [];
    for (const e of b.effects ?? []) (pred(e) ? dropped : keep).push(e);
    b.effects = keep;
  }
  return dropped;
}

function retrigger(ov: Ov, pred: (e: any) => boolean, trigger: any): number {
  let n = 0;
  for (const b of blocksOf(ov)) {
    if ((b.effects ?? []).some(pred)) {
      b.trigger = trigger;
      n += 1;
    }
  }
  return n;
}

const reverseModes = (ov: Ov) => {
  if (Array.isArray(ov.modes) && ov.modes.length > 1) ov.modes = [...ov.modes].reverse();
};

// --- effect predicates (magnitudes straight off the prose) ---
const pFbAtk = (e: any) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 70.01);
const pBurstAtk = (e: any) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 70.09);
const pChargeSpeed = (e: any) => e.kind === 'buff' && e.stat === 'chargeSpeedPct';
const pDamageTaken = (e: any) => e.kind === 'buff' && e.stat === 'damageTakenPct';
const pDot = (e: any) => e.kind === 'dot';
const pFlat = (e: any) => e.kind === 'flatDamage';
const pRecAtkDmg = (e: any) =>
  e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 60.01);
const pBurstAtkDmg = (e: any) =>
  e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 60.19);
const pAftertaste = (e: any) => e.kind === 'buff' && near(e.value, 349.8, 0.5);

// --- event helpers ---
const evBuff = (evs: Ev[], stat: string, value?: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || near(e.value, value, 0.05)),
  );
const evSelfBuff = (evs: Ev[], stat: string, value?: number) =>
  evBuff(evs, stat, value).filter((e) => e.targetSlug === SLUG);
const evSelfByValue = (evs: Ev[], value: number) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.targetSlug === SLUG && near(e.value, value, 0.5),
  );
const nFb = (r: Run) => r.evs.filter((e) => e.kind === 'fullBurstStart').length;
const teamOf = (r: Run) => {
  const t = totals(r.res) as Record<string, number>;
  const out: Record<string, number> = {};
  for (const k of Object.keys(t)) if (k !== SLUG) out[k] = t[k];
  return out;
};
const teamSum = (r: Run) => Object.values(teamOf(r)).reduce((a, b) => a + b, 0);

function exec(mutate?: (ov: Ov) => void): Run {
  const evs: Ev[] = [];
  const push = (ev: SimEvent) => {
    evs.push(ev as Ev);
  };
  const opts: any = controlComp(SLUG, true);
  if (mutate) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, mutate) };
  }
  // the sim callback is documented as cfg.onEvent; set both spellings so the collector cannot
  // silently no-op. The instrumentation test below fails loudly if no events ever arrive.
  opts.onEvent = push;
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: push };
  const res = runComp(opts);
  return { evs, res, total: (totals(res) as Record<string, number>)[SLUG] };
}

// ---------- structural read (no sim) ----------
let modes: string[] | undefined;
let slotCounts: Record<string, number> = {};
let inv: { slot: string; block: any; effect: any }[] = [];
withPatchedOverride(SLUG, (ov: Ov) => {
  modes = ov.modes;
  for (const s of SLOTS) slotCounts[s] = Array.isArray(ov[s]) ? ov[s].length : -1;
  inv = blocksOf(ov).flatMap((b) =>
    (b.effects ?? []).map((e: any) => ({ slot: b.slot, block: b, effect: e })),
  );
});
const findE = (pred: (e: any) => boolean) => inv.filter((r) => pred(r.effect));
const NON_PER_SHOT = [
  'passive',
  'interval',
  'burstCast',
  'fullBurstEnter',
  'fullBurstEnd',
  'stageEnter',
  'bossElement',
];

// ---------- runs (13 x 180s sims) ----------
const base = exec();
const flipped = exec(reverseModes);

const lingeringInBase = evBuff(base.evs, 'damageTakenPct', 10.2).length > 0;
const asLingering = (ov: Ov) => {
  if (!lingeringInBase) reverseModes(ov);
};
const asRecommended = (ov: Ov) => {
  if (lingeringInBase) reverseModes(ov);
};
const ling = lingeringInBase ? base : flipped;
const rec = lingeringInBase ? flipped : base;

let nDropFbAtk = 0;
const cfNoFbAtk = exec((ov) => {
  nDropFbAtk = dropEffects(ov, pFbAtk).length;
});

let nReFbAtk = 0;
const cfFbAtkAsCast = exec((ov) => {
  nReFbAtk = retrigger(ov, pFbAtk, { kind: 'burstCast' });
});

let nDropCharge = 0;
const cfNoCharge = exec((ov) => {
  nDropCharge = dropEffects(ov, pChargeSpeed).length;
});

let nFlipCharge = 0;
const cfFastCharge = exec((ov) => {
  for (const e of effectsOf(ov)) {
    if (pChargeSpeed(e)) {
      e.value = Math.abs(e.value);
      nFlipCharge += 1;
    }
  }
});

let nDropBurstAtkDmg = 0;
const cfNoBurstAtkDmg = exec((ov) => {
  nDropBurstAtkDmg = dropEffects(ov, pBurstAtkDmg).length;
});

let nReBurstAtkDmg = 0;
const cfBurstAtkDmgAsFb = exec((ov) => {
  nReBurstAtkDmg = retrigger(ov, pBurstAtkDmg, { kind: 'fullBurstEnter' });
});

// Lingering-branch counterfactuals
let nDropDmgTaken = 0;
const cfNoDmgTaken = exec((ov) => {
  asLingering(ov);
  nDropDmgTaken = dropEffects(ov, pDamageTaken).length;
});

let nDropDot = 0;
const cfNoDot = exec((ov) => {
  asLingering(ov);
  nDropDot = dropEffects(ov, pDot).length;
});

let nDropDot2 = 0;
let nDropBoost = 0;
const cfNoDotNoBoost = exec((ov) => {
  asLingering(ov);
  nDropDot2 = dropEffects(ov, pDot).length;
  nDropBoost = dropEffects(ov, pAftertaste).length;
});

// Recommended-branch counterfactuals
let nDropRecAtkDmg = 0;
const cfNoRecAtkDmg = exec((ov) => {
  asRecommended(ov);
  nDropRecAtkDmg = dropEffects(ov, pRecAtkDmg).length;
});

let recFlatPcts: number[] = [];
const cfNoFlat = exec((ov) => {
  asRecommended(ov);
  recFlatPcts = dropEffects(ov, pFlat).map((e) => e.atkPct);
});

describe('bready - instrumentation and fixture sanity', () => {
  it('the fixture actually runs, bursts, and reports events', () => {
    expect(base.evs.length).toBeGreaterThan(0);
    expect(base.total).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // liter + crown + helm alongside her; helm is the second B3 the trigger pins rely on.
    expect(Object.keys(teamOf(base)).length).toBe(3);
    expect(nFb(base)).toBeGreaterThanOrEqual(3);
  });

  it('the override carries all three slots and no parser-only effect kinds', () => {
    for (const s of SLOTS) expect(slotCounts[s]).toBeGreaterThanOrEqual(1);
    expect(inv.length).toBeGreaterThan(0);
    expect(inv.some((r) => r.effect.kind === 'ignored')).toBe(false);
    expect(inv.some((r) => r.effect.kind === 'unsupported')).toBe(false);
  });
});

describe('bready S1a - ATK +70.01% for 10 sec on entering Full Burst', () => {
  it('is a 10s self ATK buff keyed to fullBurstEnter', () => {
    const hit = findE(pFbAtk);
    expect(hit.length).toBe(1);
    expect(hit[0].effect.durationSec).toBe(10);
    expect(hit[0].block.target.kind).toBe('self');
    expect(hit[0].block.trigger.kind).toBe('fullBurstEnter');
    const applies = evSelfBuff(base.evs, 'atkPct', 70.01);
    expect(applies.length).toBeGreaterThan(0);
    expect(applies.length).toBe(nFb(base));
  });

  it('fires on EVERY team Full Burst, not only on the rotations she casts', () => {
    // nearest-wrong: keyed to burstCast. With helm as a second B3 and a 40s CD she cannot cast
    // every rotation, so the wrong model applies the buff strictly fewer times.
    expect(nReFbAtk).toBe(1);
    const cf = evSelfBuff(cfFbAtkAsCast.evs, 'atkPct', 70.01).length;
    const baseline = evSelfBuff(base.evs, 'atkPct', 70.01).length;
    expect(cf).toBeGreaterThan(0);
    expect(cf).toBeLessThan(baseline);
  });

  it('is self-scoped: teammates are byte-identical without it', () => {
    expect(nDropFbAtk).toBe(1);
    expect(cfNoFbAtk.total).toBeLessThan(base.total);
    expect(teamOf(cfNoFbAtk)).toEqual(teamOf(base));
  });
});

describe('bready S1b/c - Taste: Charge Speed -20% for 50 sec on self', () => {
  it('both Taste branches carry a 20-point charge-speed shift for 50 sec on self', () => {
    const cs = findE(pChargeSpeed);
    expect(cs.length).toBeGreaterThanOrEqual(1);
    for (const r of cs) {
      expect(Math.abs(r.effect.value)).toBe(20);
      expect(r.effect.durationSec).toBe(50);
      expect(r.block.target.kind).toBe('self');
    }
    expect(evSelfBuff(base.evs, 'chargeSpeedPct').length).toBeGreaterThan(0);
  });

  it('the slowdown is a real weapon-state modifier and is signed DOWNWARD', () => {
    // charge speed gates shots fired, so it gates damage. Removing the debuff must RAISE her
    // damage; turning it into a +20% buff must raise it further. A sign-flipped model (encoded
    // as a charge-speed buff) inverts both inequalities.
    expect(nDropCharge).toBeGreaterThan(0);
    expect(nFlipCharge).toBeGreaterThan(0);
    expect(cfNoCharge.total).toBeGreaterThan(base.total);
    expect(cfFastCharge.total).toBeGreaterThan(cfNoCharge.total);
  });
});

describe('bready S2a - Lingering: 3 Full Charges -> Damage Taken +10.2% + Aftertaste DoT', () => {
  it('Damage Taken +10.2% for 5 sec is a boss debuff that lifts the whole team', () => {
    const dt = findE(pDamageTaken);
    expect(dt.length).toBe(1);
    expect(near(dt[0].effect.value, 10.2)).toBe(true);
    expect(dt[0].effect.durationSec).toBe(5);
    expect(dt[0].block.target.kind).toBe('enemy');
    const evs = evBuff(ling.evs, 'damageTakenPct', 10.2);
    expect(evs.length).toBeGreaterThan(3);
    expect(evs.every((e) => e.casterIdx === null && e.targetIdx === null)).toBe(true);
    // nearest-wrong: encoded as a self buff -> teammates would not move when it is removed.
    expect(nDropDmgTaken).toBe(1);
    expect(teamSum(cfNoDmgTaken)).toBeLessThan(teamSum(ling));
    expect(cfNoDmgTaken.total).toBeLessThan(ling.total);
  });

  it('Aftertaste is ONE 150.04%/sec sustained DoT of exactly 5 sec', () => {
    // the repeating-trigger DoT trap: a duration longer than 5s multiplies, because the engine
    // appends an independent instance per fire and never dedups.
    const dots = findE(pDot);
    expect(dots.length).toBe(1);
    expect(near(dots[0].effect.atkPct, 150.04, 0.05)).toBe(true);
    expect(dots[0].effect.durationSec).toBe(5);
    expect(dots[0].effect.intervalSec ?? 1).toBe(1);
    expect(dots[0].effect.flavor).toBe('sustained');
    expect(nDropDot).toBe(1);
    expect(cfNoDot.total).toBeLessThan(ling.total);
  });

  it('fires per 3 Full Charges - about a third as often as the per-charge Recommended rider', () => {
    const l = evBuff(ling.evs, 'damageTakenPct', 10.2).length;
    const r = evSelfBuff(rec.evs, 'attackDamagePct', 60.01).length;
    expect(l).toBeGreaterThan(3);
    expect(r).toBeGreaterThan(3);
    // both branches carry the same -20% charge speed, so the two runs fire near-identical charge
    // counts: a 1-per-3 trigger against a 1-per-1 trigger must sit near 3x. A per-charge model of
    // S2a lands at ~1x; a per-Full-Burst model lands far above 4.5x.
    expect(r).toBeGreaterThan(l * 2);
    expect(r).toBeLessThan(l * 4.5);
    const dt = findE(pDamageTaken)[0];
    expect(NON_PER_SHOT).not.toContain(dt.block.trigger.kind);
  });
});

describe('bready S2b/c - Recommended: per-Full-Charge rider', () => {
  it('Attack Damage +60.01% for 5 sec, self, once per Full Charge hit', () => {
    const hit = findE(pRecAtkDmg);
    expect(hit.length).toBe(1);
    expect(hit[0].effect.durationSec).toBe(5);
    expect(hit[0].block.target.kind).toBe('self');
    expect(NON_PER_SHOT).not.toContain(hit[0].block.trigger.kind);
    const applies = evSelfBuff(rec.evs, 'attackDamagePct', 60.01).length;
    expect(applies).toBeGreaterThan(0);
    // per-charge, not per-Full-Burst: she lands many charges per FB window.
    expect(applies).toBeGreaterThan(nFb(rec) * 3);
    expect(nDropRecAtkDmg).toBe(1);
    expect(cfNoRecAtkDmg.total).toBeLessThan(rec.total);
    expect(teamOf(cfNoRecAtkDmg)).toEqual(teamOf(rec));
  });

  it('265.07% of final ATK lands as DISTRIBUTED damage and is hers alone', () => {
    const fl = findE(pFlat);
    expect(fl.length).toBe(1);
    expect(near(fl[0].effect.atkPct, 265.07, 0.05)).toBe(true);
    expect(fl[0].effect.flavor).toBe('distributed');
    expect(NON_PER_SHOT).not.toContain(fl[0].block.trigger.kind);
    expect(recFlatPcts.some((p) => near(p, 265.07, 0.05))).toBe(true);
    expect(cfNoFlat.total).toBeLessThan(rec.total);
    expect(teamOf(cfNoFlat)).toEqual(teamOf(rec));
  });
});

describe('bready burst - 60.19% / 349.8% / 70.09%', () => {
  it('Ba Attack Damage +60.19% for 10 sec fires on HER cast, not on every Full Burst', () => {
    const hit = findE(pBurstAtkDmg);
    expect(hit.length).toBe(1);
    expect(hit[0].effect.durationSec).toBe(10);
    expect(hit[0].block.target.kind).toBe('self');
    expect(hit[0].block.trigger.kind).toBe('burstCast');
    const c = evSelfBuff(base.evs, 'attackDamagePct', 60.19).length;
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(nFb(base));
    // nearest-wrong: re-keyed to fullBurstEnter -> it applies on helm rotations too and
    // over-credits her damage.
    expect(nReBurstAtkDmg).toBe(1);
    const cf = evSelfBuff(cfBurstAtkDmgAsFb.evs, 'attackDamagePct', 60.19).length;
    expect(cf).toBe(nFb(cfBurstAtkDmgAsFb));
    expect(cf).toBeGreaterThan(c);
    expect(cfBurstAtkDmgAsFb.total).toBeGreaterThan(base.total);
  });

  it('Ba is self-scoped', () => {
    expect(nDropBurstAtkDmg).toBe(1);
    expect(cfNoBurstAtkDmg.total).toBeLessThan(base.total);
    expect(teamOf(cfNoBurstAtkDmg)).toEqual(teamOf(base));
  });

  it('Bb Aftertaste Effect +349.8% for 10 sec is scoped to the Aftertaste DoT only', () => {
    const b = findE(pAftertaste);
    expect(b.length).toBe(1);
    expect(b[0].effect.durationSec).toBe(10);
    expect(b[0].block.target.kind).toBe('self');
    // a generic bucket would also inflate her normal attacks and the distributed rider.
    expect(['atkPct', 'attackDamagePct', 'critDamagePct', 'elementDamagePct']).not.toContain(
      b[0].effect.stat,
    );
    expect(evSelfByValue(ling.evs, 349.8).length).toBeGreaterThan(0);
    // inertness: with the Aftertaste DoT deleted the boost must move NOTHING.
    expect(nDropDot2).toBe(1);
    expect(nDropBoost).toBe(1);
    expect(cfNoDotNoBoost.total).toBeCloseTo(cfNoDot.total, 3);
  });

  it('Bc ATK +70.09% for 10 sec is burst-cast keyed and Recommended-only', () => {
    const hit = findE(pBurstAtk);
    expect(hit.length).toBe(1);
    expect(hit[0].effect.durationSec).toBe(10);
    expect(hit[0].block.target.kind).toBe('self');
    expect(hit[0].block.trigger.kind).toBe('burstCast');
    expect(evSelfBuff(rec.evs, 'atkPct', 70.09).length).toBeGreaterThan(0);
    expect(evSelfBuff(ling.evs, 'atkPct', 70.09).length).toBe(0);
  });
});

describe('bready - Taste exclusivity', () => {
  it('the two Tastes are a mutually exclusive mode pair', () => {
    expect(Array.isArray(modes)).toBe(true);
    expect((modes ?? []).length).toBe(2);
  });

  it('exactly one Taste branch is live per run, and flipping the default swaps it', () => {
    // Lingering run: the S2a boss debuff fires and the Recommended rider never does.
    expect(evBuff(ling.evs, 'damageTakenPct', 10.2).length).toBeGreaterThan(0);
    expect(evSelfBuff(ling.evs, 'attackDamagePct', 60.01).length).toBe(0);
    // Recommended run: the mirror image.
    expect(evSelfBuff(rec.evs, 'attackDamagePct', 60.01).length).toBeGreaterThan(0);
    expect(evBuff(rec.evs, 'damageTakenPct', 10.2).length).toBe(0);
    // the burst branches follow their Taste.
    expect(evSelfByValue(ling.evs, 349.8).length).toBeGreaterThan(0);
    expect(evSelfByValue(rec.evs, 349.8).length).toBe(0);
    expect(ling.total).not.toBe(rec.total);
  });

  it.skip('GAP: -This effect cannot be removed- has no counterpart primitive', () => {
    // Nothing in the v1 engine strips a buff off an ally (buffRemove fires only for
    // removeOnReload), so buff-removal immunity is untestable and behaviourally inert.
  });

  it.skip('GAP: Taste ENTRY trigger (gaining a sustained / distributed damage buff)', () => {
    // No trigger primitive observes an incoming buff by the damage class it boosts, so the two
    // Tastes can only be a mode pair. WHICH Taste is the default is a modeling choice, not
    // derivable from the prose - flag, do not assert.
  });

  it.skip('GAP: -Cancels the other Taste- transition', () => {
    // Mutual cancellation is a state machine over the (untriggerable) entry conditions; a mode
    // pair encodes the exclusivity but not the in-fight switch, so there is nothing to observe.
  });

  it.skip('GAP: noFb / noRange / crit disposition of the Aftertaste DoT and the 265.07% rider', () => {
    // Per-kit noFb and DoT-crit are measurement-gated (popup reads), not derivable from prose.
  });
});

```
### S5 result vs driver override
Blind S5 test run UNMODIFIED against the DRIVER override (vitest): 22 tests => 7 passed / 11 failed / 4 skipped.
PASSED (7): fixture runs+bursts+reports events; override has all 3 slots & no parser-only kinds; S1a ATK 70.01 is fullBurstEnter; S1a fires on EVERY team Full Burst (not only her casts); S1a self-scoped (teammates byte-identical without it); Ba Attack Damage 60.19 fires on HER cast not every FB; Ba self-scoped.
FAILED (11) - driver root-cause (NEITHER a faithfulness error):
 (1) MODE ARITY: blind test assumes a 2-mode [lingering,recommended] pair and selects tastes via reverseModes() auto-detection (detects 'lingering' by presence of the DT 10.2 boss debuff in the default run). Driver ships modes ["auto","sustained","distributed"] (default "auto" = tasteless). reverseModes([auto,sustained,distributed]) = [distributed,sustained,auto] => default becomes "distributed", and "sustained" is NEVER selected. So the blind's "lingering" run is actually distributed-mode and its "recommended" run is tasteless-auto => every taste-gated line reads inert (expected 0 > 0). The mode-pair-length assert expects 2, gets 3.
 (2) CHARGE-SPEED MECHANISM: blind test asserts a chargeSpeedPct -20 self buffApply exists and that sign-flipping to +20 raises damage. Driver models the Taste down-20% as charFixes.chargeFrames 72 (a static charge-time increase; NO buffApply event). DRIVER IS PROVABLY CORRECT: src/engine/sim.ts:2559 computes cs = Math.min(100, Math.max(0, stat(u,'chargeSpeedPct',frame))) then needed = chargeFrames * (1 - cs/100). A negative chargeSpeedPct clamps to 0 => needed = chargeFrames (NO slowdown). The engine can only SPEED UP via chargeSpeedPct; a charge SLOWDOWN is expressible ONLY via charFixes.chargeFrames. The blind's expected chargeSpeedPct -20 buff would be inert (zero slowdown).
SKIPPED (4, honest blind gaps): cleanse-immunity inert; taste ENTRY trigger has no primitive (mode pair only); mutual cancellation is a state machine over untriggerable entry; noFb/noRange/crit of DoT+rider measurement-gated.
Blind spec JSON (blind/bready.test-spec.json) CONVERGES with the driver on all 9 lines' magnitudes/triggers/targets/scopes/flavors; the default-taste choice is explicitly flagged by the blind as 'NOT derivable from the prose'.

## (6) S6 BLIND OVERRIDE (claude-opus-5) + diff vs the DRIVER override
### blind/bready.override.json
```json
{
  "slug": "bready",
  "modes": [
    "lingeringTaste",
    "recommendedTaste"
  ],
  "skill1": [
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
          "stat": "atkPct",
          "value": 70.01,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "mode": "lingeringTaste",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": -20
        }
      ]
    },
    {
      "slot": "skill1",
      "mode": "recommendedTaste",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": -20
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "mode": "lingeringTaste",
      "trigger": {
        "kind": "chargeCounter",
        "count": 3
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 10.2,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "mode": "lingeringTaste",
      "trigger": {
        "kind": "chargeCounter",
        "count": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "dot",
          "atkPct": 150.04,
          "durationSec": 5,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    },
    {
      "slot": "skill2",
      "mode": "recommendedTaste",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 60.01,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "mode": "recommendedTaste",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 265.07,
          "flavor": "distributed",
          "crit": true
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
          "value": 60.19,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "mode": "lingeringTaste",
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
          "value": 349.8,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "mode": "recommendedTaste",
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
          "value": 70.09,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "This effect cannot be removed."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "\u2691 TASTE STATE IS A MODE, NOT A TRIGGER. The engine has no 'gained a buff of flavor X' trigger, so Lingering Taste / Recommended Taste are modeled as selectable modes (default lingeringTaste). Real gating is team-dependent: an ally sustained-damage buff -> Lingering (priority), an ally distributed-damage buff with no sustained -> Recommended. A THIRD real state exists that this model cannot express: a team giving NEITHER flavor leaves her with NO taste, which makes all of skill2 and burst blocks 2-3 inert and removes the charge-speed penalty. On a generic ATK/Attack-Damage support comp that no-taste state is the likely truth.",
    "\u2691 Damage-bearing effects (dot, flatDamage) are authored with target self because resolveTargets({kind:'enemy'}) returns [] in this engine; only the damageTakenPct boss debuff uses target enemy. If the engine instead routes damage effects through an enemy-targeted block, move them.",
    "\u2691 'Aftertaste Effect \u25b2 349.8%' is mapped to sustainedDamagePct (Damage Up bucket, additive). This WIDENS scope from 'the Aftertaste DoT' to 'all sustained damage'; damage-equivalent here only because the skill2 Aftertaste DoT is her sole sustained-damage source and the buff is self-scoped. If she ever co-exists with another self sustained source, this over-credits.",
    "\u2691 DoT append-not-refresh: each 3-full-charge proc appends an independent 5s / 1s-tick instance. With the -20% charge-speed penalty plus reloads the proc interval is likely >= 5s, so overlap should be small \u2014 but the proc rate rides entirely on the unverified cadence tuple.",
    "Mutual exclusion ('Cancels Recommended/Lingering Taste') is implemented structurally by the mode gate (exactly one mode active), not by a cancel effect."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (no override/test/board access). Structure: skill1 = a team-FB ATK buff + the Taste status toggle (charge-speed self-debuff, identical -20% in either taste, modeled as a mode-gated passive); skill2 splits by taste \u2014 Lingering = every-3-full-charges boss Damage Taken debuff + a 150.04%/s sustained Aftertaste DoT; Recommended = per-full-charge self Attack Damage buff + a 265.07% distributed rider; burst = an unconditional Attack Damage buff plus one taste-gated branch each (Aftertaste amplification vs ATK). Charge Speed \u25bc20% is modeled as a real weapon-state (shot-count) modifier per the kit-parse hard rule, not skipped as defensive. FB-by-timing left ON everywhere (no noFb set); no core on the distributed rider (kit says nothing about core strikes); crit ON for the rider per the flat-damage-rider crit rule. Cadence (ammo 6 / chargeFrames 60 / reloadFrames 141) is datamined and drives the every-3-charge proc rate \u2014 it is the single largest source of error in this baseline."
}
```
### structured diff (driver vs blind)
```json
{
  "modes": {
    "driver": [
      "auto",
      "sustained",
      "distributed"
    ],
    "blind": [
      "lingeringTaste",
      "recommendedTaste"
    ]
  },
  "charFixes": {
    "driver": {
      "chargeFrames": 72
    },
    "blind": null
  },
  "note_on_charge_speed": "driver: charFixes.chargeFrames 72 (engine-correct; chargeSpeedPct clamps >=0 so a -20 buff is inert). blind: chargeSpeedPct -20 mode-gated self buff (would be INERT in this engine).",
  "note_on_modes": "driver: 3-mode [auto,sustained,distributed], default auto=tasteless. blind: 2-mode [lingeringTaste,recommendedTaste], default lingeringTaste. Blind flag recipe explicitly suggests adding a 3rd noTaste mode if measurement confirms = the driver auto.",
  "driver_blocks": {
    "skill1": [
      {
        "trigger": "fullBurstEnter",
        "target": "self",
        "mode": null,
        "effects": [
          [
            "buff",
            "atkPct",
            70.01
          ]
        ]
      }
    ],
    "skill2": [
      {
        "trigger": "hitCount",
        "target": "enemy",
        "mode": "sustained",
        "effects": [
          [
            "buff",
            "damageTakenPct",
            10.2
          ],
          [
            "dot",
            "sustained",
            150.04
          ]
        ]
      },
      {
        "trigger": "shotFired",
        "target": "self",
        "mode": "distributed",
        "effects": [
          [
            "buff",
            "attackDamagePct",
            60.01
          ]
        ]
      },
      {
        "trigger": "shotFired",
        "target": "enemy",
        "mode": "distributed",
        "effects": [
          [
            "flatDamage",
            "distributed",
            265.07
          ]
        ]
      }
    ],
    "burst": [
      {
        "trigger": "burstCast",
        "target": "self",
        "mode": null,
        "effects": [
          [
            "buff",
            "attackDamagePct",
            60.19
          ]
        ]
      },
      {
        "trigger": "burstCast",
        "target": "self",
        "mode": "sustained",
        "effects": [
          [
            "buff",
            "sustainedDamagePct",
            349.8
          ]
        ]
      },
      {
        "trigger": "burstCast",
        "target": "self",
        "mode": "distributed",
        "effects": [
          [
            "buff",
            "atkPct",
            70.09
          ]
        ]
      }
    ]
  },
  "blind_blocks": {
    "skill1": [
      {
        "trigger": "fullBurstEnter",
        "target": "self",
        "mode": null,
        "effects": [
          [
            "buff",
            "atkPct",
            70.01
          ]
        ]
      },
      {
        "trigger": "passive",
        "target": "self",
        "mode": "lingeringTaste",
        "effects": [
          [
            "buff",
            "chargeSpeedPct",
            -20
          ]
        ]
      },
      {
        "trigger": "passive",
        "target": "self",
        "mode": "recommendedTaste",
        "effects": [
          [
            "buff",
            "chargeSpeedPct",
            -20
          ]
        ]
      }
    ],
    "skill2": [
      {
        "trigger": "chargeCounter",
        "target": "enemy",
        "mode": "lingeringTaste",
        "effects": [
          [
            "buff",
            "damageTakenPct",
            10.2
          ]
        ]
      },
      {
        "trigger": "chargeCounter",
        "target": "self",
        "mode": "lingeringTaste",
        "effects": [
          [
            "dot",
            "sustained",
            150.04
          ]
        ]
      },
      {
        "trigger": "shotFired",
        "target": "self",
        "mode": "recommendedTaste",
        "effects": [
          [
            "buff",
            "attackDamagePct",
            60.01
          ]
        ]
      },
      {
        "trigger": "shotFired",
        "target": "self",
        "mode": "recommendedTaste",
        "effects": [
          [
            "flatDamage",
            "distributed",
            265.07
          ]
        ]
      }
    ],
    "burst": [
      {
        "trigger": "burstCast",
        "target": "self",
        "mode": null,
        "effects": [
          [
            "buff",
            "attackDamagePct",
            60.19
          ]
        ]
      },
      {
        "trigger": "burstCast",
        "target": "self",
        "mode": "lingeringTaste",
        "effects": [
          [
            "buff",
            "sustainedDamagePct",
            349.8
          ]
        ]
      },
      {
        "trigger": "burstCast",
        "target": "self",
        "mode": "recommendedTaste",
        "effects": [
          [
            "buff",
            "atkPct",
            70.09
          ]
        ]
      }
    ]
  }
}
```

## (7) DRIVER IMPLEMENTATION
### scripts/tests/units/bready.test.ts
```ts
// PER-UNIT KIT SPEC — `bready` (Bready, Attacker/SR/Water, Burst III, cd 40s, ammo 6,
// chargeFrames 60 datamine). Kit-autonomy gauntlet 2026-07-25 (Tier 2).
//
// One assertion group per KIT LINE (H1..H10 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears ONLY to build the H2 charge-speed COUNTERFACTUAL (the
// nearest-wrong model — the debuff removed — that the shipped assertion must discriminate against);
// it never supplies the encoding under test.
//
// TASTE-MODE MACHINE. Bready's kit is gated on a mutually-exclusive "Taste" state. In game the taste
// is entered by GAINING a teammate's sustained-damage buff (→ Lingering Taste) or distributed-damage
// buff (→ Recommended Taste); the two cancel each other. The engine has NO buff-gain event primitive,
// so the taste is a user-selectable `modes` array on the override (["auto","sustained","distributed"],
// first = default). This spec therefore runs the unit in EACH mode and asserts every taste-gated line
// fires in its OWN mode and is INERT in the other — the mode gate is the heart of the discrimination.
//
// Kit (blablalink prose, data/characters.json → characters.bready.skills):
//   S1 ■ entering Full Burst → self: ATK ▲70.01% for 10 sec                              [H1] (UNCOND)
//      ■ gaining a sustained-dmg buff → Lingering Taste: Charge Speed ▼20%/50s, unremovable;
//        Cancels Recommended Taste                                                       [H2] (UNCOND payload / UNMODELED trigger)
//      ■ gaining a distributed-dmg buff (not sustained) → Recommended Taste: Charge Speed ▼20%/50s,
//        unremovable; Cancels Lingering Taste                                            [H2] (same payload / UNMODELED trigger)
//   S2 ■ after 3 Full Charge hits while Lingering → the target: Damage Taken ▲10.2%/5 sec [H3] (sustained)
//        Aftertaste: 150.04% of final ATK as sustained damage every 1 sec for 5 sec       [H4] (sustained)
//      ■ hitting with Full Charge while Recommended → self: Attack Damage ▲60.01%/5 sec   [H5] (distributed)
//      ■ hitting with Full Charge while Recommended → all enemies: 265.07% final ATK as
//        distributed damage                                                              [H6] (distributed)
//   BU ■ self: Attack Damage ▲60.19% for 10 sec                                          [H7] (UNCOND)
//      ■ while Lingering → self: Aftertaste Effect ▲349.8% for 10 sec (sustainedDamagePct)[H8] (sustained)
//      ■ while Recommended → self: ATK ▲70.09% for 10 sec                                 [H9] (distributed)
//   H10  structural: the default `auto` mode (= tasteless) leaves EVERY taste-gated line inert.
//
// UNMODELED (legitimately out-of-domain — verbatim in override.unmodeled.skill1, no assertion):
//   - the two taste-ENTRY trigger lines ("Activates when gaining a buff that increases sustained/
//     distributed damage") — the engine emits no buff-gain event, so the taste cannot be auto-derived
//     from the team's buff types; it is a manual mode instead.
//   - the two "Cancels …" lines — mutual exclusivity is enforced STRUCTURALLY by the single selected
//     mode (only one taste's blocks are live at a time), so there is nothing to simulate.
//   - the TASTELESS state's missing charge-speed debuff: charFixes.chargeFrames is UNCONDITIONAL, so a
//     team feeding neither buff type would still carry the 72-frame cycle (owner caveat; the sim cannot
//     represent "tasteless ⇒ no debuff"). H10 asserts the gated LINES go inert in `auto`, not the debuff.
//
// MEASUREMENT-GATED ⚑ (encoded faithfully, magnitude unmeasured — documented, NOT asserted exactly):
//   - H2 charge time 72 (subtractive 60×1.20) vs 75 (divisive 60/0.8) — only the DIRECTION is pinned.
//   - H4 Aftertaste DoT stack-vs-refresh / overlap depends on the unmeasured charge cadence.
//   - H8 "Aftertaste Effect ▲349.8%" is an ADDITIVE sustained Damage-Up bucket; a multiplicative
//     DoT-magnitude reading would be ~41% hotter in her window — unmeasured.
//   - the full cadence tuple (charge 72 / reload 141 / 22f bolt gap) is a datamine estimate.
//   - H6 distributed flavor is encoded (flavor:"distributed") but inert at ×1 in THIS fixture (no
//     distributed-damage amp present) — correct engine behavior, not a modeling gap.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   H1  fullBurstEnter, not burstCast: the buff must land on the Full Burst WINDOW-START frame, which is
//       ~22f AFTER her own burstCast frame (burst-apply delay). Asserted frame == fullBurstStart frame
//       AND != burstCast frame, so a burstCast encoding provably fails. Unconditional ⇒ fires in both modes.
//   H7  burstCast, not fullBurstEnter: the mirror of H1 — the buff lands on the burstCast frame, BEFORE
//       the window. Asserted frame == burstCast frame AND != fullBurstStart frame.
//   H3/H4/H5/H6/H8/H9  the mode gate: each taste-gated line is present in its own mode and ABSENT in the
//       other (the "absent" assertion is the built-in RED a wrong/ungated model fails).
//   H2  the debuff is live: shipped (72f) yields FEWER full-charge shots than the debuff-removed (60f)
//       counterfactual. Exact 72-vs-75 is measurement-gated, so no exact-value assertion.
//
// Fixture: liter (B1) / crown (B2) / bready (B3), boss Fire (Water-strong ⇒ elemental major on), focus
// bready (×2.5 burst gauge on the charge weapon) so her burst actually casts (5 casts / 180s). A lone
// B3 makes zero Full Bursts, so the control core is required to exercise any burst/FB-gated line.
// Deterministic (no seed); mode injected per-unit through prepareTeam (the shared runComp does not
// expose mode, so the runner is built locally here).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runSim } from '../../../src/engine/sim.js';
import { prepareTeam } from '../../../src/prepare.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { scopeLockCfg } from '../../lib/scope-lock.js';
import {
  data,
  deps,
  mult,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'bready'] as const;
/** slot order: liter 0 / crown 1 / bready 2. */
const BREADY = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

/** Run the fixture with bready in a chosen taste mode (and optional in-memory override patches). */
function runMode(mode: string, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const ov: Record<string, any> = {};
  for (const s of SLUGS) ov[s] = overrides[s] ?? loadOverride(s);
  const chars = SLUGS.map((s) => data.characters[s]);
  const prepared = prepareTeam(
    chars,
    SLUGS.map((s) => ({
      doll: false,
      ol: 'base5' as const,
      ...(s === 'bready' ? { mode } : {}),
    })),
    { overrides: ov, ...deps },
  );
  const cfg = scopeLockCfg([...SLUGS], 'Fire', {
    focusSlug: 'bready',
    onEvent: (e) => events.push(e),
  });
  const res = runSim(chars, mult, cfg, prepared);
  return { events, totals: totals(res) };
}

// ---- counterfactual (H2) ---------------------------------------------------------------------
/** Nearest-wrong model for the charge-speed debuff: the Taste ▼20% removed (cycle back to 60f). */
const breadyNoDebuff = withPatchedOverride('bready', (ov) => {
  if (ov.charFixes?.chargeFrames !== 72)
    throw new Error(
      'bready charFixes.chargeFrames 72 missing — fixture is stale',
    );
  ov.charFixes.chargeFrames = 60;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const sustained = runMode('sustained');
const distributed = runMode('distributed');
const auto = runMode('auto');
const noDebuff = runMode('sustained', { bready: breadyNoDebuff });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const breadyDmg = (
  evs: SimEvent[],
  srcSlot: Damage['srcSlot'],
  atkPct?: number,
) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'bready' &&
      d.srcSlot === srcSlot &&
      (atkPct === undefined || d.atkPct === atkPct),
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** A self buff bready cast on herself (casterIdx == targetIdx == BREADY). */
const selfBuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === BREADY &&
      b.targetIdx === BREADY &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
/** A debuff on the boss (targetIdx null). The engine does not attribute a caster to enemy debuffs. */
const bossDebuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.targetIdx === null &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
const breadyShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'bready');
const breadyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'bready',
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');
const frames = (evs: { frame: number }[]) =>
  evs.map((e) => e.frame).sort((a, b) => a - b);

describe('bready — kit spec', () => {
  describe('H1 — S1 FB-enter self ATK ▲70.01%/10s is fullBurstEnter (UNCONDITIONAL)', () => {
    const applied = selfBuff(sustained.events, 'atkPct', 70.01);

    it('lands on the Full Burst WINDOW-START frame, not her burstCast frame', () => {
      expect(applied.length, 'no S1 ATK buff applied').toBeGreaterThan(0);
      expect(frames(applied)).toEqual(frames(fbStarts(sustained.events)));
      expect(frames(applied)).not.toEqual(
        frames(breadyBursts(sustained.events)),
      );
    });

    it('is 70.01% self-scoped for 10 sec, once per Full Burst', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([70.01]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([BREADY]);
      expect(applied.length).toBe(fbStarts(sustained.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is UNCONDITIONAL — fires in both sustained and distributed modes', () => {
      expect(selfBuff(distributed.events, 'atkPct', 70.01).length).toBe(
        fbStarts(distributed.events).length,
      );
    });
  });

  describe('H2 — Taste Charge Speed ▼20% is a live, unconditional charge-time increase (charFixes 72f)', () => {
    it('fewer full-charge shots than the debuff-removed (60f) counterfactual', () => {
      const shipped = breadyShots(sustained.events).length;
      const removed = breadyShots(noDebuff.events).length;
      expect(
        shipped,
        `shipped ${shipped} shots vs debuff-removed ${removed} — the ▼20% must slow her cycle`,
      ).toBeLessThan(removed);
    });
    // Exact 72 (subtractive) vs 75 (divisive) is MEASUREMENT-GATED — deliberately no exact-value assert.
  });

  describe('H3 — S2 Lingering: boss Damage Taken ▲10.2%/5s after 3 full charges (sustained-gated)', () => {
    it('applies the boss debuff in sustained mode', () => {
      const debuffs = bossDebuff(sustained.events, 'damageTakenPct', 10.2);
      expect(
        debuffs.length,
        'no Damage Taken debuff in sustained mode',
      ).toBeGreaterThan(0);
      expect([...new Set(debuffs.map((b) => b.value))]).toEqual([10.2]);
      for (const b of debuffs) expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
    });

    it('is INERT in distributed mode (the mode gate)', () => {
      expect(
        bossDebuff(distributed.events, 'damageTakenPct', 10.2).length,
      ).toBe(0);
    });
  });

  describe('H4 — S2 Lingering: Aftertaste sustained DoT 150.04%/tick, 1s interval (sustained-gated)', () => {
    const ticks = breadyDmg(sustained.events, 'skill2', 150.04);

    it('ticks at the kit magnitude on a 1-second interval in sustained mode', () => {
      expect(
        ticks.length,
        'no Aftertaste DoT in sustained mode',
      ).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([150.04]);
      // Within a proc the ticks are exactly 60f (1s) apart; new procs restart the cadence, so check
      // the modal gap rather than every consecutive pair.
      const gaps = frames(ticks)
        .slice(1)
        .map((f, i) => f - frames(ticks)[i]);
      const modal = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
      expect(modal, 'modal tick gap should be 1s (60f)').toBe(1 * FPS);
    });

    it('is INERT in distributed mode (the mode gate)', () => {
      expect(breadyDmg(distributed.events, 'skill2', 150.04).length).toBe(0);
    });
  });

  describe('H5 — S2 Recommended: self Attack Damage ▲60.01%/5s per full charge (distributed-gated)', () => {
    it('refreshes on (nearly) every full-charge shot in distributed mode', () => {
      const applied = selfBuff(distributed.events, 'attackDamagePct', 60.01);
      const shots = breadyShots(distributed.events).length;
      expect(
        applied.length,
        'no Attack Damage self-buff in distributed mode',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60.01]);
      expect(
        applied.length,
        `${applied.length} applications vs ${shots} shots`,
      ).toBeGreaterThanOrEqual(shots * 0.9);
    });

    it('is INERT in sustained mode (the mode gate)', () => {
      expect(selfBuff(sustained.events, 'attackDamagePct', 60.01).length).toBe(
        0,
      );
    });
  });

  describe('H6 — S2 Recommended: 265.07% distributed rider to all enemies per full charge (distributed-gated)', () => {
    const riders = breadyDmg(distributed.events, 'skill2', 265.07);

    it('lands once per full-charge shot at the kit magnitude in distributed mode', () => {
      expect(
        riders.length,
        'no distributed rider in distributed mode',
      ).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([265.07]);
      expect(riders.length).toBe(breadyShots(distributed.events).length);
    });

    it('follows the rider convention: crit-eligible, NO core, NO range bonus', () => {
      // Text lacks "core strike" ⇒ coreEligible false; flatDamage riders are universal (noRange) ⇒
      // rangeApplied false; crit at caster rate ⇒ critEligible true. A wrong model granting core or
      // range provably fails these.
      expect([...new Set(riders.map((d) => d.critEligible))]).toEqual([true]);
      expect([...new Set(riders.map((d) => d.coreEligible))]).toEqual([false]);
      expect([...new Set(riders.map((d) => d.rangeApplied))]).toEqual([false]);
    });

    it('is INERT in sustained mode (the mode gate)', () => {
      expect(breadyDmg(sustained.events, 'skill2', 265.07).length).toBe(0);
    });
    // Distributed FLAVOR is encoded (flavor:"distributed") but inert at ×1 here — no distributed amp in
    // this fixture — so mult.distributed is not asserted (see header). FB major is taken by LANDING
    // timing (noFb default OFF), so fbMajorApplied legitimately varies and is not pinned.
  });

  describe('H7 — burst self Attack Damage ▲60.19%/10s is burstCast (UNCONDITIONAL)', () => {
    const applied = selfBuff(sustained.events, 'attackDamagePct', 60.19);

    it('lands on the burstCast frame, BEFORE the Full Burst window', () => {
      expect(
        applied.length,
        'no burst Attack Damage buff applied',
      ).toBeGreaterThan(0);
      expect(frames(applied)).toEqual(frames(breadyBursts(sustained.events)));
      expect(frames(applied)).not.toEqual(frames(fbStarts(sustained.events)));
    });

    it('is 60.19% self-scoped for 10 sec, once per burst cast', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([60.19]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([BREADY]);
      expect(applied.length).toBe(breadyBursts(sustained.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is UNCONDITIONAL — fires in both sustained and distributed modes', () => {
      expect(
        selfBuff(distributed.events, 'attackDamagePct', 60.19).length,
      ).toBe(breadyBursts(distributed.events).length);
    });
  });

  describe('H8 — burst Lingering: Aftertaste Effect ▲349.8%/10s → sustainedDamagePct (sustained-gated)', () => {
    it('applies 349.8% once per burst cast in sustained mode', () => {
      const applied = selfBuff(sustained.events, 'sustainedDamagePct', 349.8);
      expect(
        applied.length,
        'no Aftertaste Effect buff in sustained mode',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([349.8]);
      expect(applied.length).toBe(breadyBursts(sustained.events).length);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is INERT in distributed mode (the mode gate)', () => {
      expect(
        selfBuff(distributed.events, 'sustainedDamagePct', 349.8).length,
      ).toBe(0);
    });
    // ADDITIVE sustained Damage-Up bucket; a multiplicative DoT-magnitude reading is measurement-gated.
  });

  describe('H9 — burst Recommended: ATK ▲70.09%/10s (distributed-gated)', () => {
    it('applies 70.09% once per burst cast in distributed mode', () => {
      const applied = selfBuff(distributed.events, 'atkPct', 70.09);
      expect(
        applied.length,
        'no burst ATK buff in distributed mode',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([70.09]);
      expect(applied.length).toBe(breadyBursts(distributed.events).length);
    });

    it('is INERT in sustained mode (the mode gate)', () => {
      expect(selfBuff(sustained.events, 'atkPct', 70.09).length).toBe(0);
    });
  });

  describe('H10 — structural: the default `auto` (tasteless) mode leaves every taste-gated line inert', () => {
    it('deals NO skill2 damage and applies NO taste-gated buff in auto mode', () => {
      expect(breadyDmg(auto.events, 'skill2').length).toBe(0);
      expect(selfBuff(auto.events, 'sustainedDamagePct').length).toBe(0);
      expect(selfBuff(auto.events, 'atkPct', 70.09).length).toBe(0);
      expect(selfBuff(auto.events, 'attackDamagePct', 60.01).length).toBe(0);
      expect(bossDebuff(auto.events, 'damageTakenPct', 10.2).length).toBe(0);
    });

    it('still fires the UNCONDITIONAL lines (S1 FB-enter ATK + burst Attack Damage)', () => {
      expect(selfBuff(auto.events, 'atkPct', 70.01).length).toBe(
        fbStarts(auto.events).length,
      );
      expect(selfBuff(auto.events, 'attackDamagePct', 60.19).length).toBe(
        breadyBursts(auto.events).length,
      );
    });
    // The charge-speed debuff (charFixes) is UNCONDITIONAL and so still active in `auto` — the tasteless
    // state's missing-debuff cannot be represented (owner caveat); not asserted here.
  });
});

```
### src/skills/overrides/bready.json
```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. | Bready — Water SR, B3 Attacker, ammo 6 / reloadFrames 141 / chargeFrames 60 (datamine). TASTE MODE MACHINE (mutually exclusive): S1 enters Lingering Taste on GAINING a sustained-damage buff, Recommended Taste on gaining a distributed-damage buff while not sustained; each cancels the other; both apply an unremovable self Charge Speed ▼20% (50s, effectively permanent in her intended team). Which taste is live depends on what buff TYPE teammates feed her — NOT self-derivable → modeled as user-selectable `modes` [sustained, distributed] (identifiers name the buff TYPE that triggers each taste: sustained=Lingering Taste, distributed=Recommended Taste), DEFAULT sustained (her signature Aftertaste sustained-DoT identity + the burst's biggest line 349.8% is Lingering-gated). ⚑ BACKEND TODO: the taste is currently a manual user-selected mode — properly implementing it means auto-deriving the live taste from the team's actual buff types (+ the tasteless state + measured taste-line magnitudes), which is unmodeled (see NEXT INCREMENT). ⚑ MODE: a team providing NEITHER buff type leaves her tasteless — all taste-gated lines (S2 all 3, burst lines 2/3) inert AND no charge-speed debuff; the sim cannot represent that state (charFixes is unconditional) — pick the mode matching real teammates; taste-entry timing (first qualifying buff gain, not t=0) also unmodeled. CHARGE-SPEED DEBUFF: engine clamps chargeSpeedPct to >=0 (sim.ts:1522), so a −20% buff would silently drop ('modeled ≠ working') → modeled as charFixes.chargeFrames 72 = 60 × (1+0.20), matching the engine's SUBTRACTIVE-time CS convention (sim.ts:1523 needed = chargeFrames × (1 − cs/100)); ally +CS buffs still shorten from the 72 base. ⚑ 72 (subtractive) vs 75 (divisive 60/0.8) — measure in-taste charge time. LINGERING path: S2 after 3 full-charge hits (hitCount:3, hitsPerShot 1) → boss Damage Taken ▲10.2%/5s (TEAM-WIDE amp — blast radius: buffs every teammate's damage) + Aftertaste sustained DoT 150.04%/tick ×5 (1s interval), encoded as a REPEATING-trigger dot per kit-parse directive (stacks per proc if 3 charges land <5s; at est. ~1.57s/shot cycle the proc period ~4.7s ≈ dur 5 → mild overlap) — ⚑ stack-vs-refresh + overlap depends on real cadence. Burst 'Aftertaste Effect ▲349.8%/10s' → sustainedDamagePct 349.8 (additive Damage-Up bucket on sustained-flavor hits, sim.ts:801) — ⚑ semantics: additive with her 60.19 attackDamagePct gives ticks ×5.10 in her window; a multiplicative DoT-magnitude reading would give ×7.20 (~41% hotter). RECOMMENDED path: per full-charge hit (shotFired) → self Attack Damage ▲60.01%/5s (refreshes ≈ permanent while firing) + 265.07% distributed rider to all enemies (full value vs single boss — engine default, prior on distributed) + burst ATK ▲70.09%/10s. UNCONDITIONAL: S1 FB-enter self ATK ▲70.01%/10s (worded 'when entering Full Burst' → fullBurstEnter, fires on every team FB per hard rule 6); burst self Attack Damage ▲60.19%/10s (own-burst block → burstCast). RIDERS: FB by TIMING default (no noFb set); +30% range engine-universal-off (never set). SKIPPED (all in unmodeled.skill1): the two taste-ENTRY trigger lines (buff-gain events not simulated; folded into the mode system) + the two 'Cancels …' lines (mutual exclusivity enforced structurally by the mode gate). No heal/shield/DEF/parts lines in this kit; the weapon-state payload (charge speed) IS modeled. ⚑ CADENCE TUPLE (mandatory, datamine-unreliable): chargeFrames 60/reloadFrames 141/bolt gap 22f ON — NEVER set noBoltRecovery unmeasured (autofire vs bolt-gap = ~15–20% shot swing); recipe = bready-focus video: shot period, reload gap, autofire check. ⚑ DISTRIBUTED-RIDER FB: verify the 265.07% proc takes +50% by landing timing (in-FB vs out-FB popup). | Kit-autonomy gauntlet 2026-07-25: encoding validated cross-family (claude-fable-5 S2b review + opus S5/S6/S7 blind re-derivation converged); all 9 load-bearing lines FAITHFUL — S1 FB-enter ATK 70.01 (fullBurstEnter, uncond), charge-speed ▼20% as charFixes 72f (uncond payload; taste-entry triggers UNMODELED, no buff-gain primitive), S2 Lingering boss Damage Taken 10.2/5s + Aftertaste sustained DoT 150.04×5, S2 Recommended self Attack Damage 60.01/5s + 265.07% distributed rider (crit/no-core/no-range), burst Attack Damage 60.19 (burstCast, uncond), burst Lingering sustainedDamagePct 349.8, burst Recommended ATK 70.09 — each taste-gated line mode-gated (fires in its own taste, inert in the other; default `auto` = tasteless leaves all gated lines inert). Residual ⚑ unchanged (charge 72-vs-75, 349.8 additive-vs-multiplicative, DoT stack/cadence, taste auto-derivation) — all measurement-gated, not faithfulness errors.",
  "modes": ["auto", "sustained", "distributed"],
  "charFixes": {
    "chargeFrames": 72
  },
  "unmodeled": {
    "skill1": [
      "Activates when gaining a buff that increases sustained damage. Affects self.",
      "Cancels Recommended Taste.",
      "Activates when gaining a buff that increases distributed damage while not in a state of increased sustained damage. Affects self.",
      "Cancels Lingering Taste."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: which Taste is active is a user-selected mode (default: sustained = Lingering Taste; distributed = Recommended Taste) — the buff-gain entry triggers are not simulated; a team providing neither a sustained- nor a distributed-damage buff would leave her tasteless (all taste-gated lines inert), which the sim cannot represent",
    "skill1: the Taste Charge Speed ▼20% debuff is modeled as a permanent charge-time increase (60→72 frames; assumes she is always in a taste); 72 follows the engine's subtractive charge-speed convention — unmeasured (divisive would be 75)",
    "skill2: the Aftertaste DoT is encoded as repeating per-3-full-charge instances that stack when procs land <5s apart — stack-vs-refresh and overlap depend on the unmeasured charge cadence",
    "burst: 'Aftertaste Effect ▲349.8%' is modeled as an additive sustained-damage Damage-Up buff; a multiplicative DoT-magnitude reading would be ~41% hotter during her burst window — unmeasured",
    "skill1/skill2: full cadence tuple (charge time, reload 141f, 22-frame bolt gap vs autofire) is an unmeasured datamine estimate — ~15-20% shot-count swing"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 70.01, "durationSec": 10 }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "hitCount", "count": 3 },
      "target": { "kind": "enemy" },
      "mode": "sustained",
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 10.2,
          "durationSec": 5
        },
        {
          "kind": "dot",
          "atkPct": 150.04,
          "durationSec": 5,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "shotFired" },
      "target": { "kind": "self" },
      "mode": "distributed",
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 60.01,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "shotFired" },
      "target": { "kind": "enemy" },
      "mode": "distributed",
      "effects": [
        { "kind": "flatDamage", "atkPct": 265.07, "flavor": "distributed" }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 60.19,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "mode": "sustained",
      "effects": [
        {
          "kind": "buff",
          "stat": "sustainedDamagePct",
          "value": 349.8,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "mode": "distributed",
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 70.09, "durationSec": 10 }
      ]
    }
  ]
}

```
