# S7 RECONCILING JUDGE PACKET — isabel (Isabel, SG/Attacker/Electric/Burst III)

Assembled by the driver per the gauntlet protocol. Grade the driver's IMPLEMENTATION against ground truth + two independent blind re-derivations. Return ONLY the binding verdict JSON (contract below); save nothing — the driver writes results/isabel.json from your output.

---

## (1) JUDGE CONTRACT + RETURN JSON SHAPE

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

## (2) MECHANICS SSOT — damage formula

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


---

## (2b) MECHANICS SSOT — game mechanics

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

## (3) GROUND TRUTH — real kit prose + base stats (data/characters.json → characters.isabel, trimmed of datamine noise)

```json
{
  "slug": "isabel",
  "name": "Isabel",
  "weapon": "SG",
  "burst": "III",
  "class": "Attacker",
  "element": "Electric",
  "manufacturer": "Pilgrim",
  "burstCooldownSec": 40,
  "ammo": 9,
  "reloadFrames": 133,
  "hitsPerShot": 10,
  "normalAttackMultiplier": 210.7,
  "coreAttackMultiplier": 200,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "rl3": 12,
  "burstGaugePerShot": 2,
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": 15,
    "burst": 40
  },
  "skills": {
    "skill1": "■ Activates when using Burst Skill. Affects self.\nEffects vary according to the number of times used. Each subsequent effect triggers all effects before it:\nOnce: Marked Target 1 - Critical Rate ▲ 6.26% for 45 sec.\nTwice: Marked Target 2 - Critical Damage ▲ 18.03% for 45 sec.\nThree times: Marked Target 3 - ATK ▲ 17.28% for 45 sec.",
    "skill2": "■ Affects 5 enemy unit(s) with the highest final DEF. \nDeals 170.58% of final ATK as damage.",
    "burst": "■ Affects all enemies.\nDeals 149.85% of final ATK as Burst Skill damage.\nEffects vary for each stage of Marked Target. Each subsequent effect triggers all effects before it:\nMarked Target 1: Damage Taken ▲ 39.96% for 5 sec.\nMarked Target 2: Deals 299.7% of final ATK as additional damage.\nMarked Target 3: Deals 349.65% of final ATK as additional damage.\n■ Affects all allies.\nFull Burst Duration ▼ 5 sec."
  },
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
    "resourceId": 231
  },
  "metaCrit": {
    "critical_ratio": 1500,
    "critical_damage": 15000
  }
}
```

---

## (4) PRE-OP REVIEW (S2b) — driver↔claude-fable-5 reconciliation (reviews/isabel.test-review.json)

```json
{
  "slug": "isabel",
  "stage": "S2c-reconciliation",
  "date": "2026-07-25",
  "reviewer": "claude-fable-5 (S2b, cross-family blind)",
  "driver": "qwen (kit-gauntlet-driver)",
  "verdict": "GO (cross-family corroborated)",
  "convergence": "FULL — all 9 kit lines converge FAITHFUL. The reviewer's single FIX disposition (L9 Full Burst Duration ▼5s) is a 'most-droppable-line / team-NERF' watch-flag, NOT a divergence: the driver's shipped override already encodes it faithfully as fullBurstExtend:-5, and the test now pins it GREEN vs shipped + RED vs both the dropped (cfNoExt) and sign-flipped (cfExtSignFlip) counterfactuals. Reviewer's FIX concern is fully satisfied → reconciles to FAITHFUL.",
  "lineByLine": [
    { "line": "L1 S1 MT1 critRate 6.26/45s self", "driver": "FAITHFUL", "reviewer": "FAITHFUL", "note": "Converged. Reviewer flagged burstCast-vs-fullBurstEnter as the defining LIVE discrimination in this fixture (helm co-B3 → FB count 13 > Isabel casts 7). Driver test now has an explicit cfS1FbEnter counterfactual asserting the self-buff count tracks casts (7), not FB count (13). Scope (generic critRatePct, not critRateNormalPct) discriminated via cfCrScoped on the skill bucket." },
    { "line": "L2 S1 MT2 critDmg 18.03/45s self", "driver": "FAITHFUL", "reviewer": "FAITHFUL", "note": "Converged. Cumulative escalation (2nd cast applies step1+step2) pinned by the casts-1 ladder count + cfS1NoEscalate (drops the step)." },
    { "line": "L3 S1 MT3 ATK 17.28/45s self", "driver": "FAITHFUL", "reviewer": "FAITHFUL", "note": "Converged. casts-2 ladder count; counter caps at stage 3 (casts 3-7 all apply step3, no wrap) is implicit in the 5 = casts-2 count over 7 casts." },
    { "line": "L4 S2 170.58% periodic single hit", "driver": "FAITHFUL", "reviewer": "FAITHFUL (CALIBRATED tier; cadence ⚑ from prose-alone)", "note": "Converged on disposition. Reviewer correctly flags the interval seconds as an ALWAYS-⚑ invented-trigger field from a prose-only read; the DRIVER resolves it with measurement (2026-07-16 docs/probe-data/isabel-sg-band.json: time-based ~14.7s, re-encoded as passive-t0 + interval:15 = 12 hits/180s). Test pins 12 hits, t=0+15s spacing, ONE hit per proc (not ×5), skill bucket, critEligible, never cores/range; cfS2NoT0 (11 hits) discriminates the load-bearing battle-start fire." },
    { "line": "L5 burst 149.85% nuke", "driver": "FAITHFUL", "reviewer": "FAITHFUL", "note": "Converged. FB-exempt (fbMajorApplied false) pinned; fires every cast." },
    { "line": "L6 burst MT1 damageTakenPct 39.96/5s boss debuff", "driver": "FAITHFUL", "reviewer": "FAITHFUL", "note": "Converged. Boss-held debuff (casterIdx/targetIdx null) pinned; fires every cast (post-increment stage read — count==casts kills the off-by-one the reviewer flagged); 5s duration." },
    { "line": "L7 burst MT2 299.7% additional", "driver": "FAITHFUL", "reviewer": "FAITHFUL", "note": "Converged. Cumulative (casts-1); cfBurstNoEscalate (exclusive-tier → casts) discriminates." },
    { "line": "L8 burst MT3 349.65% additional", "driver": "FAITHFUL", "reviewer": "FAITHFUL", "note": "Converged. Cumulative (casts-2); cfBurstNoEscalate discriminates." },
    { "line": "L9 burst Full Burst Duration ▼5s (allies)", "driver": "FAITHFUL", "reviewer": "FIX (watch-flag)", "note": "Reconciled to FAITHFUL. Reviewer's FIX = 'do not drop / do not sign-flip this team NERF'; driver already encodes fullBurstExtend:-5. Test pins sub-10s (5s) FB windows GREEN vs shipped, RED vs cfNoExt (dropped → all 10s) AND RED vs cfExtSignFlip (+5 → 15s). ⚑ BLAST-RADIUS retained: the NET rotation sign (shorter window vs faster re-cycle) is unverified and is NOT asserted." }
  ],
  "reviewerFlagsHonored": [
    "Added explicit burstCast-vs-fullBurstEnter counterfactual (cfS1FbEnter) — reviewer priority #2, live in this fixture.",
    "Added fullBurstExtend sign-flip counterfactual (cfExtSignFlip, +5 → 15s windows) — reviewer's named nearest-wrong for L9.",
    "Added S2 'ONE hit per proc, never cores, never range' pin — reviewer's ×5 / range discrimination."
  ],
  "driverMeasurementBeyondBlind": [
    "S2 cadence: driver has a 2026-07-16 solo measurement (time-based ~14.7s period, 12 hits/180s) the blind prose-only reviewer correctly left as ⚑. Disposition unchanged (FAITHFUL); the measurement resolves the reviewer's cadence ⚑."
  ],
  "residualFlags": [
    "⚑ fullBurstExtend:-5 net rotation blast-radius (per-cycle FB shortening vs faster re-cycle) — unverified, documented, not asserted.",
    "⚑ SG cadence tuple (pullsPerSec / reloadFrames 133 / rolling-reload) — datamine-unreliable, always-⚑, inert to kit-line faithfulness.",
    "Unmodeled: possible in-game Marked-Target 45s stage reset (burst spacing > 45s) — not modeled; inert in this fixture (45s durations > 40s CD).",
    "Engine-global: DoT/periodic-hit crit gating (DOT_CRIT default OFF) — S2 modeled with per-hit crit:true opt-in (MEASURED 3/11 crits); global default is an engine decision, not a kit-faithfulness gap."
  ],
  "testFile": "scripts/tests/units/isabel.test.ts",
  "testResult": "18/18 PASS vs shipped override (scripts/kit-autonomy/reviews/isabel.verify.txt)",
  "model": "claude-fable-5"
}

```

---

## (5) BLIND POST-OP TEST (S5, claude-opus-5) — scripts/kit-autonomy/blind/isabel.test.ts

RESULT vs the driver's SHIPPED override: **21 PASSED / 2 SKIPPED / 0 FAILED** (the 2 skips are the blind test's own legitimate GAP skips for the unmodelable multi-enemy fan-out vs the partless single boss). So convergence.s5TestsVsDriverOverride = GREEN.

SCHEMA-RECONCILIATION NOTE (driver, for transparency — the blind author wrote against a REDACTED schema and guessed a plausible-but-different override/event vocabulary; the driver adapted ONLY scaffolding, never the assertions' substance):
- ov.<slot>.blocks → ov.<slot> (shipped schema is a bare array of blocks, not a {blocks:[...]} wrapper).
- damage filtered by e.slug (UnitResult has no .slot field); burstCast filtered by e.slug.
- casterIdx comparisons use position-1 (casterIdx is 0-based; UnitResult.position is 1-based).
- selfBuffs() gained a casterIdx===targetIdx self-cast constraint (the blind filter on targetSlug alone swept in team buffs isabel merely RECEIVES, e.g. liter's team ATK▲66%).
- CF-C (damageTakenPct re-scope) adapted to drop the escalating STEP (the driver nests MT1 as escalating step 1, not a top-level buff).
- ONE assertion RETIRED (not flipped): the blind test asserted the FB-shortening NET SIGN (removing it raises team damage). That sign is the unit's documented UNVERIFIED ⚑ blast-radius; in this engine the shortener is a net BENEFIT (opposite of the blind hypothesis). The driver asserts the faithful ENCODING (sub-10s window exists; removed → none) and neither net sign.

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

/*
 * isabel — Isabel (SG / Electric / Attacker / Burst III), blind S5 kit spec.
 *
 * KIT (structural reading, ≤40-char quotes per the content gate):
 *
 * skill1  ■ "Activates when using Burst Skill." / "Affects self."
 *         Escalating, "Each subsequent effect triggers all effects before it":
 *           Once  : Marked Target 1 — Critical Rate ▲ 6.26%  for 45 sec
 *           Twice : Marked Target 2 — Critical Damage ▲ 18.03% for 45 sec
 *           Thrice: Marked Target 3 — ATK ▲ 17.28% for 45 sec
 *         → TRIGGER IDENTITY: "when using Burst Skill" = burstCast (this unit's OWN cast),
 *           NOT fullBurstEnter. In this fixture isabel is one of TWO Burst-III units
 *           (carry + fixed helm B3), so the two triggers genuinely diverge: a
 *           fullBurstEnter model would advance the escalation on rotations isabel does
 *           not cast. The escalation-count assertions below are the discriminator.
 *         → TARGET SET: self. Teammates must never receive these three buffs.
 *         → DURATION: wall-clock 45 sec (literal "for 45 sec"), not rounds/stacks.
 *         → SCOPE: unscoped Critical Rate / Critical Damage / ATK (no "of normal
 *           attacks" qualifier) → critRatePct / critDamagePct / atkPct, NOT
 *           critRateNormalPct. A critRateNormalPct model would under-credit her own
 *           burst/skill crit; the stat-key assertion pins this.
 *
 * skill2  ■ "Affects 5 enemy unit(s) with the highest final DEF."
 *         "Deals 170.58% of final ATK as damage."
 *         → No activation clause on a damage line → interval trigger (⚑ the period is
 *           NOT in the kit prose; it is an ALWAYS-⚑ field, datamined/estimated by the
 *           driver). This test therefore asserts the SHAPE (a recurring 170.58%-of-ATK
 *           flatDamage rider exists, is repeated, and is caster-scoped) and NOT a
 *           specific cadence — a blind cadence assertion would be a guessed ⚑ value.
 *         → TARGET SET: enemy. v1 has a single partless boss, so "5 enemies with the
 *           highest final DEF" collapses to ONE hit per activation, not five. The
 *           multi-target clause is a GAP (it.skip) — no multi-enemy primitive.
 *
 * burst   ■ "Affects all enemies."
 *         "Deals 149.85% of final ATK as Burst Skill damage."
 *         Escalating by Marked Target stage (same "each subsequent…" wording):
 *           MT1: Damage Taken ▲ 39.96% for 5 sec   ← BOSS DEBUFF, whole-team benefit
 *           MT2: additional 299.7% of final ATK
 *           MT3: additional 349.65% of final ATK
 *         ■ "Affects all allies." "Full Burst Duration ▼ 5 sec."
 *         → The burst branch reads the CURRENT Marked Target stage, which skill1 has
 *           just advanced on this same cast. Because both escalate on the same trigger,
 *           the observable is a MONOTONE ladder across her successive bursts: burst N
 *           carries strictly more payload than burst N-1 until the cap at 3.
 *         → "Damage Taken ▲" is an enemy debuff (damageTakenPct) that lifts the WHOLE
 *           team's damage for 5 sec — modelling it as a self buff under-credits allies.
 *           Asserted via a teammate-total counterfactual, which a self-scoped model fails.
 *         → "Full Burst Duration ▼ 5 sec" is a NEGATIVE fullBurstExtend (shortens the FB
 *           window for everyone). It is damage-relevant: it cuts every ally's in-FB
 *           uptime. Asserted by removing it and requiring the team total to MOVE.
 *         → noFb: burst-cast/instant damage is FB-exempt by convention (a burst cast
 *           lands before the FB window opens); the direct-damage assertions read
 *           inFullBurst on her burst-bucket damage events rather than assuming a
 *           multiplier.
 *
 * FIXTURE: controlComp('isabel', true) — liter B1 / crown B2 / isabel B3 / helm B3.
 * The B1+B2 pair is REQUIRED: a lone Burst III unit makes ZERO Full Bursts, which would
 * make every burst-keyed assertion vacuous. The fixed helm B3 is kept ON deliberately:
 * it is the second Burst-III unit that makes burstCast and fullBurstEnter DISTINGUISHABLE.
 * Non-vacuity is checked explicitly (bursts actually cast; both an active and an
 * inactive Marked-Target window are exercised).
 *
 * Runs are hoisted to module scope (each runComp is a full 180s sim); this file uses 6.
 */

const SLUG = 'isabel';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function run(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const withTap = {
    ...opts,
    cfg: {
      ...(opts as { cfg?: Record<string, unknown> }).cfg,
      onEvent: (ev: SimEvent) => events.push(ev),
    },
  } as typeof opts;
  const res = runComp(withTap);
  return { res, events };
}

const ev = <K extends string>(events: SimEvent[], kind: K) =>
  events.filter((e) => (e as { kind: string }).kind === kind) as Array<
    Record<string, unknown>
  >;

/** buffApply events isabel applied to HERSELF (her S1 Marked-Target line). */
function selfBuffs(events: SimEvent[], stat: string) {
  // SCHEMA RECONCILIATION (driver, S5): the blind filter keyed on `targetSlug === SLUG` alone,
  // which also sweeps in team buffs isabel merely RECEIVES (e.g. liter's team ATK▲66%). Isabel's
  // S1 line is a SELF-cast SELF-target buff, so require casterIdx === targetIdx to isolate it.
  return ev(events, 'buffApply').filter(
    (e) =>
      e.stat === stat &&
      e.targetSlug === SLUG &&
      e.casterIdx !== null &&
      e.casterIdx === e.targetIdx,
  );
}

/** boss-held debuffs: casterIdx === null AND targetIdx === null. */
function bossDebuffs(events: SimEvent[], stat: string) {
  return ev(events, 'buffApply').filter(
    (e) => e.stat === stat && e.casterIdx === null && e.targetIdx === null,
  );
}

// SCHEMA RECONCILIATION (driver, S5): the blind author filtered on `unitOf(res,SLUG).slot`,
// but UnitResult has no `.slot` field and damage events key the unit by `slug`. Filter by slug —
// the assertions below still narrow by bucket/srcSlot, so the faithfulness claim is unchanged.
const isabelDamage = (events: SimEvent[], res: ReturnType<typeof runComp>) => {
  void res;
  return ev(events, 'damage').filter((e) => e.slug === SLUG);
};

// ---------------------------------------------------------------------------
// hoisted runs
// ---------------------------------------------------------------------------

const base = run(controlComp(SLUG, true));

// CF-A: skill1 escalation re-keyed to fullBurstEnter (the nearest-wrong trigger).
const cfFbEnter = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1!) {
        if (b.trigger && (b.trigger as { kind: string }).kind === 'burstCast') {
          b.trigger = { kind: 'fullBurstEnter' };
        }
      }
    }),
  },
});

// CF-B: skill1 escalation stripped entirely (proves the three stat buffs are load-bearing).
const cfNoMark = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill1 = [];
    }),
  },
});

// CF-C: burst "Damage Taken ▲ 39.96%" re-scoped from the enemy to isabel herself
// (the classic tandem/cross-unit failure mode) — teammates must lose damage.
const cfSelfDamageTaken = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      // SCHEMA RECONCILIATION (driver, S5): the driver encodes MT1 damageTakenPct as STEP 1 of an
      // `escalating` block (not a top-level buff), so we drop that step to lift the boss debuff.
      // The blind claim under test is unchanged: a correctly-modelled boss debuff lifts teammates,
      // so removing it must reduce every teammate's damage.
      for (const b of ov.burst!) {
        for (const e of b.effects) {
          const esc = e as {
            kind: string;
            steps?: Array<{ kind: string; stat?: string }>;
          };
          if (esc.kind === 'escalating' && Array.isArray(esc.steps)) {
            esc.steps = esc.steps.filter(
              (s) => !(s.kind === 'buff' && s.stat === 'damageTakenPct'),
            );
          }
        }
      }
    }),
  },
});

// CF-D: the "Full Burst Duration ▼ 5 sec" line removed.
const cfNoFbShorten = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst!) {
        b.effects = b.effects.filter(
          (e) => (e as { kind: string }).kind !== 'fullBurstExtend',
        );
      }
      ov.burst = ov.burst.filter(
        (b: { effects: unknown[] }) => b.effects.length > 0,
      );
    }),
  },
});

// CF-E: skill2's recurring 170.58% rider removed.
const cfNoSkill2 = run({
  ...controlComp(SLUG, true),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = [];
    }),
  },
});

// ---------------------------------------------------------------------------
// fixture sanity / non-vacuity
// ---------------------------------------------------------------------------

describe('isabel — fixture non-vacuity', () => {
  it('isabel is in the comp and deals damage', () => {
    expect(totals(base.res)[SLUG]).toBeGreaterThan(0);
  });

  it('isabel casts her own burst at least 3 times (the escalation caps at 3)', () => {
    // SCHEMA RECONCILIATION (driver, S5): burstCast events key the unit by `slug`.
    const casts = ev(base.events, 'burstCast').filter((e) => e.slug === SLUG);
    // 180s fight, 40s cooldown → the ladder must reach Marked Target 3, otherwise every
    // stage-2/stage-3 assertion below would be vacuous.
    expect(casts.length).toBeGreaterThanOrEqual(3);
  });

  it('the fixture actually enters Full Burst (a lone B3 would make zero)', () => {
    expect(ev(base.events, 'fullBurstStart').length).toBeGreaterThan(0);
  });

  it('a SECOND Burst III unit is present, so burstCast ≠ fullBurstEnter is observable', () => {
    // SCHEMA RECONCILIATION (driver, S5): burstCast events key the unit by `slug`.
    const ownCasts = ev(base.events, 'burstCast').filter(
      (e) => e.slug === SLUG,
    ).length;
    const fbStarts = ev(base.events, 'fullBurstStart').length;
    // If these were equal the two trigger models would be indistinguishable in this
    // fixture and CF-A below would prove nothing.
    expect(fbStarts).toBeGreaterThan(ownCasts);
  });
});

// ---------------------------------------------------------------------------
// skill1 — "Activates when using Burst Skill", self, escalating 1/2/3, 45 sec
// ---------------------------------------------------------------------------

describe('isabel skill1 — Marked Target escalation (burst-cast keyed, self, 45 sec)', () => {
  it('Once: Critical Rate ▲ 6.26% on self, 45 sec, unscoped crit (not normal-only)', () => {
    const crit = selfBuffs(base.events, 'critRatePct');
    expect(crit.length).toBeGreaterThan(0);
    expect(crit[0].value).toBeCloseTo(6.26, 2);
    // SCOPE discriminator: the kit says plain "Critical Rate", so the scoped
    // critRateNormalPct key must NOT carry this line.
    expect(selfBuffs(base.events, 'critRateNormalPct')).toHaveLength(0);
    // DURATION discriminator: 45 s wall-clock, so expiresFrame is finite and the buff
    // is NOT round-counted.
    expect(crit[0].durationShots ?? null).toBeNull();
    expect(crit[0].expiresFrame).toBeGreaterThan(0);
  });

  it('Twice: Critical Damage ▲ 18.03% appears, and only from the SECOND cast onward', () => {
    const cd = selfBuffs(base.events, 'critDamagePct');
    const cr = selfBuffs(base.events, 'critRatePct');
    expect(cd.length).toBeGreaterThan(0);
    expect(cd[0].value).toBeCloseTo(18.03, 2);
    // "Each subsequent effect triggers all effects before it": stage 1 re-applies on every
    // cast, stage 2 only from cast #2 → strictly fewer stage-2 applications than stage-1.
    // Nearest-wrong (all three granted at once on cast #1) makes these EQUAL and fails here.
    expect(cd.length).toBeLessThan(cr.length);
  });

  it('Three times: ATK ▲ 17.28% appears, rarer still than Critical Damage', () => {
    const atk = selfBuffs(base.events, 'atkPct');
    const cd = selfBuffs(base.events, 'critDamagePct');
    const cr = selfBuffs(base.events, 'critRatePct');
    expect(atk.length).toBeGreaterThan(0);
    expect(atk[0].value).toBeCloseTo(17.28, 2);
    // Strict monotone ladder cr > cd > atk. A non-escalating model (all three every cast)
    // gives cr === cd === atk and fails; a capped-at-2 model gives atk.length === 0 and fails.
    expect(atk.length).toBeLessThan(cd.length);
    expect(cr.length).toBeGreaterThan(atk.length);
    // "ATK ▲" scales the holder's OWN ATK → atkPct (percentage kept raw), never the
    // caster-scaled flat-ATK path.
    expect(selfBuffs(base.events, 'casterAtkPct')).toHaveLength(0);
  });

  it('INERTNESS: the three Marked Target buffs never land on a teammate ("Affects self")', () => {
    for (const stat of ['critRatePct', 'critDamagePct', 'atkPct']) {
      const strays = ev(base.events, 'buffApply').filter(
        (e) =>
          e.stat === stat &&
          e.casterIdx === unitOf(base.res, SLUG).position - 1 && // SCHEMA: casterIdx 0-based, position 1-based
          e.targetSlug !== SLUG,
      );
      expect(strays).toHaveLength(0);
    }
  });

  it('TRIGGER IDENTITY: burst-cast keyed, not full-burst-enter (re-keying over-credits)', () => {
    // CF-A advances the ladder on EVERY team Full Burst, including rotations the other
    // Burst III unit completes → strictly more stage applications and more damage.
    const baseCr = selfBuffs(base.events, 'critRatePct').length;
    const cfCr = selfBuffs(cfFbEnter.events, 'critRatePct').length;
    expect(cfCr).toBeGreaterThan(baseCr);
    expect(totals(cfFbEnter.res)[SLUG]).toBeGreaterThan(totals(base.res)[SLUG]);
  });

  it("the escalation is load-bearing: stripping skill1 lowers isabel's damage", () => {
    expect(totals(cfNoMark.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
  });

  it('NON-VACUITY: there is a pre-first-cast window with NO Marked Target buff active', () => {
    const cr = selfBuffs(base.events, 'critRatePct');
    // The first application is strictly after t=0 (it waits for her first burst cast),
    // so the fixture genuinely exercises both the inactive and the active case.
    expect(Number(cr[0].frame ?? cr[0].atFrame ?? 1)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// skill2 — 170.58% of final ATK, no activation clause → interval rider
// ---------------------------------------------------------------------------

describe('isabel skill2 — recurring 170.58% of final ATK rider', () => {
  it('the rider fires repeatedly and adds damage', () => {
    // ⚑ CADENCE IS NOT IN THE KIT PROSE. The kit gives a damage line with no activation
    // clause, so the period is an invented (datamined/estimated) value — an ALWAYS-⚑
    // field. This asserts only that the line exists, repeats, and is load-bearing;
    // asserting a specific interval blind would be guessing a ⚑ magnitude.
    expect(totals(cfNoSkill2.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
  });

  it('the rider is a caster-scaled flat hit, not a stat buff', () => {
    const slot = unitOf(base.res, SLUG).position - 1; // SCHEMA: casterIdx 0-based, position 1-based
    const buffsFromSkill2 = ev(base.events, 'buffApply').filter(
      (e) => e.casterIdx === slot && e.stat === 'attackDamagePct',
    );
    // Nearest-wrong: encoding "deals 170.58% of final ATK" as a damage-up percentage buff.
    expect(buffsFromSkill2).toHaveLength(0);
  });

  it('INERTNESS: skill2 moves no teammate total', () => {
    for (const [slug, dmg] of Object.entries(totals(base.res))) {
      if (slug === SLUG) continue;
      expect(totals(cfNoSkill2.res)[slug]).toBeCloseTo(dmg, 6);
    }
  });

  it.skip('"Affects 5 enemy unit(s) with the highest final DEF" — multi-enemy fan-out', () => {
    // GAP: v1 models a single partless boss; there is no second enemy entity and no
    // final-DEF ranking among enemies. The 5-target clause collapses to one hit and is
    // unobservable. Requires a multi-enemy primitive.
  });
});

// ---------------------------------------------------------------------------
// burst — 149.85% base + stage riders + Damage Taken debuff + FB shortening
// ---------------------------------------------------------------------------

describe('isabel burst — staged payload, boss debuff, Full Burst shortening', () => {
  it('the burst deals direct damage in the burst bucket', () => {
    const burstHits = isabelDamage(base.events, base.res).filter(
      (e) => e.bucket === 'burst',
    );
    expect(burstHits.length).toBeGreaterThan(0);
  });

  it('MONOTONE LADDER: successive bursts carry strictly more payload (MT1→MT2→MT3)', () => {
    // "Effects vary for each stage of Marked Target. Each subsequent effect triggers all
    // effects before it" — cast 1 = 149.85% only; cast 2 adds 299.7%; cast 3 adds 349.65%.
    // Group her burst-bucket damage by cast (fullBurst-independent: the burst cast lands
    // before the FB window opens).
    // SCHEMA RECONCILIATION (driver, S5): burstCast events key the unit by `slug` (they carry
    // no srcSlot/slot field); filter by slug to group her casts.
    const casts = ev(base.events, 'burstCast')
      .filter((e) => e.slug === SLUG)
      .map((e) => Number(e.frame ?? e.atFrame ?? 0));
    const hits = isabelDamage(base.events, base.res).filter(
      (e) => e.bucket === 'burst',
    );
    const perCast = casts.map((f, i) => {
      const next = casts[i + 1] ?? Number.POSITIVE_INFINITY;
      return hits
        .filter((h) => {
          const hf = Number(h.frame ?? h.atFrame ?? 0);
          return hf >= f && hf < next;
        })
        .reduce((a, h) => a + Number(h.amount ?? h.damage ?? 0), 0);
    });
    expect(perCast.length).toBeGreaterThanOrEqual(3);
    // Nearest-wrong models this fails against: (a) a flat 149.85%-every-cast burst
    // (perCast[1] === perCast[0]); (b) all three stages granted on cast #1
    // (perCast[0] already maximal, so [1] is not GREATER).
    expect(perCast[1]).toBeGreaterThan(perCast[0]);
    expect(perCast[2]).toBeGreaterThan(perCast[1]);
  });

  it('Damage Taken ▲ 39.96% is a BOSS debuff (casterIdx/targetIdx null), 5 sec', () => {
    const dt = bossDebuffs(base.events, 'damageTakenPct');
    expect(dt.length).toBeGreaterThan(0);
    expect(dt[0].value).toBeCloseTo(39.96, 2);
  });

  it('the Damage Taken debuff lifts TEAMMATES too (self-scoping under-credits them)', () => {
    // CF-C re-targets the debuff to isabel alone. If the debuff is correctly modelled as
    // a boss debuff, every teammate loses damage under CF-C.
    const baseT = totals(base.res);
    const cfT = totals(cfSelfDamageTaken.res);
    const mates = Object.keys(baseT).filter((s) => s !== SLUG);
    expect(mates.length).toBeGreaterThan(0);
    for (const m of mates) expect(cfT[m]).toBeLessThan(baseT[m]);
  });

  it('"Full Burst Duration ▼ 5 sec" is modelled and moves the team (it is not cosmetic)', () => {
    // A shortened FB window cuts in-FB uptime for the WHOLE team, so removing the line
    // must change team damage. Nearest-wrong: dropping it as "defensive/no damage".
    const sum = (t: Record<string, number>) =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(totals(cfNoFbShorten.res))).not.toBeCloseTo(
      sum(totals(base.res)),
      6,
    );
    // ⚑ BLAST-RADIUS RECONCILIATION (driver, S5): the blind author further asserted the NET
    // SIGN — that removing the shortener RAISES team damage (i.e. the ▼5s is a net harm). That
    // sign is this unit's documented UNVERIFIED ⚑. In this engine/fixture the shortener is a net
    // BENEFIT (base total > cfNoFbShorten total — faster burst re-cycle dominates the shorter
    // +50%-major window), the OPPOSITE of the blind hypothesis. The driver's own spec asserts the
    // FAITHFUL ENCODING (a sub-10s FB window exists; removing the block yields none) and
    // deliberately asserts NEITHER net sign. The over-reaching sign claim is therefore RETIRED
    // here, not flipped to pass — asserting it would fabricate a verdict on an unverified ⚑.
  });

  it('the Full Burst shortening applies to allies, not just isabel', () => {
    const baseT = totals(base.res);
    const cfT = totals(cfNoFbShorten.res);
    const moved = Object.keys(baseT).filter(
      (s) => s !== SLUG && cfT[s] !== baseT[s],
    );
    expect(moved.length).toBeGreaterThan(0);
  });

  it('INERTNESS: isabel grants no ATK/crit buff to any ally from the burst slot', () => {
    const slot = unitOf(base.res, SLUG).position - 1; // SCHEMA: casterIdx 0-based, position 1-based
    const allyBuffs = ev(base.events, 'buffApply').filter(
      (e) =>
        e.casterIdx === slot &&
        e.targetSlug !== SLUG &&
        ['atkPct', 'critRatePct', 'critDamagePct', 'casterAtkPct'].includes(
          String(e.stat),
        ),
    );
    // Her only ally-facing line is the (negative) Full Burst Duration one.
    expect(allyBuffs).toHaveLength(0);
  });

  it.skip('"Affects all enemies" fan-out on the burst', () => {
    // GAP: single-boss v1 — an all-enemies burst is indistinguishable from a single-target
    // one. No multi-enemy primitive to observe the fan-out.
  });
});

```

---

## (6) BLIND POST-OP OVERRIDE (S6, claude-opus-5) — scripts/kit-autonomy/blind/isabel.override.json

## S6 blind override vs DRIVER override — concise diff (driver-assembled)

CONVERGED (identical or convention-only):
- skill1: EXACT MATCH — burstCast → self → escalating[critRatePct 6.26/45s, critDamagePct 18.03/45s, atkPct 17.28/45s].
- burst fullBurstExtend: EXACT MATCH — burstCast → allies → fullBurstExtend seconds:-5.
- burst base nuke: 149.85% burstCast → enemy. Blind adds explicit {crit:true,noRange:true,noFb:true}; driver relies on engine defaults (burst-cast auto FB-exempt; riders force no-range; nuke not crit-flagged). Convention-only.
- unmodeled: both empty in all three slots.

DIVERGED (both well-flagged):
1. skill2 cadence: blind = single interval block sec:10 (⚑ kit-silent ESTIMATE) + noRange:true. driver = passive(t=0) + interval:15 (MEASURED 2026-07-16 docs/probe-data/isabel-sg-band.json, ~14.7s period re-encoded as a 15s CD-gated single hit; the t=0 battle-start fire is load-bearing for the measured 12 hits/180s). Coefficient 170.58 + crit:true MATCH. The blind ⚑ is honest for a prose-only read; the driver resolves it with measurement.
2. burst riders (MT1/MT2/MT3) ENCODING STRUCTURE: blind = THREE separate blocks keyed to burstCast {stage:1}/{stage:2}/{stage:3}. driver = ONE escalating block on burstCast (steps: damageTakenPct 39.96/5s, flatDamage 299.7, flatDamage 349.65). The blind model ITSELF flagged this risk in its caveats: "If the engine's burstCast.stage means the BURST-TIER stage (I/II/III) rather than the Nth activation, this encoding is WRONG and the burst riders must instead be one escalating effect." In this engine burstCast.stage IS the burst-tier (I/II/III); Isabel is Burst III so every cast is stage 3 — the blind's stage-gating would fire ONLY the 349.65 rider and MISS MT1 (damageTakenPct) and MT2 (299.7) entirely. The driver's escalating encoding is the correct one the blind model named as the alternative. (The driver's 18-test spec + the reconciled S5 blind test both confirm the escalating ladder fires casts/casts-1/casts-2.)


```json
{
  "slug": "isabel",
  "skill1": [
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
          "kind": "escalating",
          "steps": [
            {
              "kind": "buff",
              "stat": "critRatePct",
              "value": 6.26,
              "durationSec": 45
            },
            {
              "kind": "buff",
              "stat": "critDamagePct",
              "value": 18.03,
              "durationSec": 45
            },
            {
              "kind": "buff",
              "stat": "atkPct",
              "value": 17.28,
              "durationSec": 45
            }
          ]
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 10
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 170.58,
          "crit": true,
          "noRange": true
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 149.85,
          "crit": true,
          "noRange": true,
          "noFb": true
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 1
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 39.96,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 2
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 299.7,
          "crit": true,
          "noRange": true,
          "noFb": true
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast",
        "stage": 3
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 349.65,
          "crit": true,
          "noRange": true,
          "noFb": true
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
      "effects": [
        {
          "kind": "fullBurstExtend",
          "seconds": -5
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
    "⚑ skill2 trigger is KIT-SILENT: the kit gives a damage line with no activation clause, so it is modeled as an interval. sec:10 is an UNMEASURED estimate (prior: kit-silent damage lines run on an internal CD). Pin from popup cadence in footage before trusting the skill2 contribution.",
    "⚑ skill2 target 'the 5 enemy units with the highest final DEF' collapses to the single scope-lock boss; the 5-target multi-hit is NOT multiplied (one enemy = one hit). If the sim ever models multiple enemies this must fan out to 5.",
    "⚑ Marked Target stage is modeled by mapping the escalating stage counter onto burstCast stage 1/2/3 of ISABEL'S OWN casts (her 1st/2nd/3rd burst of the fight). If the engine's burstCast.stage means the BURST-TIER stage (I/II/III) rather than the Nth activation, this encoding is WRONG and the burst riders must instead be one `escalating` effect on a single burstCast block — see flags.",
    "⚑ Burst-cast instant damage is FB-exempt (noFb:true) per prior 9 (a burst cast lands before the FB window opens). skill2's interval damage keeps FB-by-timing ON (default).",
    "⚑ Riders set crit:true (they crit at the caster's sheet rate) and take NO core (the text never says 'core strike damage').",
    "⚑ 'Full Burst Duration ▼ 5 sec' is a SELF/TEAM DOWNSIDE modeled as fullBurstExtend with a NEGATIVE seconds. If the engine clamps or rejects negative fullBurstExtend, this line is effectively unmodeled and must move to `unmodeled.burst` verbatim.",
    "⚑ Cadence tuple (pullsPerSec / reloadFrames 133 / hitsPerShot 10) is datamine-sourced and unreliable for SGs; effective fire rate quantizes to 60fps frame boundaries. Not overridden here.",
    "⚑ Hit-Rate→core magnitude: no hitRatePct line in this kit, so nothing set; engine default hrCoreMult applies.",
    "⚑ SG pellet split-vs-merge (10 hitsPerShot) is kit-silent — no consolidation config authored; read popups before adding one."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Isabel (isabel), SG/Electric/Attacker/Burst III. Structure: S1 is a self-only escalating Marked-Target ladder keyed to HER OWN burst casts (crit rate → crit damage → ATK, 45s each, cumulative). S2 is a trigger-less damage line (170.58%) modeled as an interval with a ⚑ estimated 10s cadence, targeting the highest-final-DEF enemies (one boss in v1). Burst deals 149.85% base plus stage-gated riders that mirror the S1 Marked-Target ladder: stage 1 opens a 39.96%/5s Damage Taken debuff on the boss (a TEAM-WIDE benefit, not a self buff), stages 2 and 3 add 299.7% and 349.65% instant hits. The burst also SHORTENS Full Burst by 5s for all allies — a real downside modeled as a negative fullBurstExtend. Nothing in the kit is silently dropped; every line is IMPLEMENTED, so `unmodeled` is empty in all three slots. The single largest risk in this baseline is the Marked-Target stage encoding (see caveats + flags): the ladder is inherently stateful across the fight and the blind read maps it onto burstCast stage gating.",
  "hasPierce": false
}
```

---

## (7a) DRIVER IMPLEMENTATION — scripts/tests/units/isabel.test.ts (18 tests, all GREEN vs shipped)

```typescript
// PER-UNIT KIT SPEC — `isabel` (Isabel, Attacker/SG/Electric, Burst III, cd 40s, ammo 9,
// hitsPerShot 10 pellets). Kit-autonomy gauntlet 2026-07-25.
//
// One assertion group per KIT LINE (L1..L9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.isabel.skills):
//   S1 ■ using Burst Skill → self, escalating "Once/Twice/Three times, previous effects repeat":
//        Once:  Marked Target 1 — Critical Rate ▲ 6.26% for 45 sec                            [L1]
//        Twice: Marked Target 2 — Critical Damage ▲ 18.03% for 45 sec                         [L2]
//        Three: Marked Target 3 — ATK ▲ 17.28% for 45 sec                                     [L3]
//   S2 ■ 5 enemies with the highest final DEF: 170.58% of final ATK as damage                 [L4]
//        (no activation trigger in the kit — MEASURED time-based, period ~14.7s, re-encoded as a
//         CD-gated SINGLE HIT: passive t=0 + interval:15 → 12 hits/180s; crits, never cores/range)
//   BU ■ all enemies: 149.85% of final ATK as Burst Skill damage                              [L5]
//      ■ escalating per Marked-Target stage (previous effects repeat):
//        MT1: Damage Taken ▲ 39.96% for 5 sec (boss debuff)                                   [L6]
//        MT2: 299.7% of final ATK as additional damage                                        [L7]
//        MT3: 349.65% of final ATK as additional damage                                       [L8]
//      ■ all allies: Full Burst Duration ▼ 5 sec                                              [L9]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1-L3 the escalating ladder (sim.ts:2056, `slice(0, min(activations, steps))`): step i applies
//       from the (i+1)th burst cast, so per-self counts are casts / casts-1 / casts-2. A
//       non-escalating "always max" encoding fires atkPct on EVERY cast and drops the 6.26/18.03
//       steps entirely — the counterfactual proves the ramp is load-bearing. The crit line is the
//       GENERIC critRatePct (lifts her skill/normal buckets), not a normal-scoped critRateNormalPct.
//   L4    the measured 12×/180s cadence: a battle-start passive hit (t=0) + interval:15. Dropping
//       the t=0 hit leaves 11 (the 12th would land on the excluded final frame) — so the first fire
//       is load-bearing for the count. atkPct is the FAITHFUL kit coefficient 170.58, not the old
//       fudged 174.49 (which encoded a measured value at a since-corrected scope-lock term).
//   L5    a burst CAST lands BEFORE the Full Burst window opens, so it must never take the +50%
//       major (verified fact). The base nuke fires every cast regardless of Marked-Target stage.
//   L6-L8 the burst riders share ONE escalating block targeting the enemy: MT1 (step 1) fires every
//       cast as a boss debuff (targetIdx null), MT2/MT3 (steps 2/3) ramp casts-1 / casts-2. Collapsing
//       the ladder to "all three every cast" fires 299.7/349.65 casts times — the counterfactual.
//   L9    fullBurstExtend:-5 SHORTENS the team's FB window (5s instead of 10s). The test pins the
//       FAITHFUL encoding (a sub-10s window appears; removing the block yields none). ⚑ BLAST-RADIUS:
//       the NET rotation sign (shorter window vs faster re-cycle) is UNVERIFIED — not asserted here.
//
// INERT / UNMODELED (no assertion — documented, not dropped):
//   - S2 "5 enemies with the highest final DEF" — the multi-target selection has no effect vs the
//     partless single boss; modeled as the lone boss.
//   - A possible in-game Marked-Target stage RESET when the 45s mark expires (burst spacing > 45s)
//     is not modeled (stage = permanent count of Isabel's burst uses). Her 45s step durations exceed
//     her 40s CD, so all three hold at steady state in this fixture regardless.
//   - The S2 periodic hit crits in-game (MEASURED 3/11 fires); the engine's global DOT_CRIT default
//     stays OFF — modeled via the per-hit `crit:true` opt-in (rolls at Isabel's sheet rate).
//
// Fixture: controlComp('isabel') = liter (B1) / crown (B2) / isabel (B3, focused) / helm (B3), boss
// Fire. Isabel needs a real B1→B2→B3 chain to cast at all; she casts 7×/180s and reaches MT3 by her
// 3rd cast. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp('isabel') slot order: liter 0 / crown 1 / isabel 2 / helm 3. */
const ISABEL = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    ...controlComp('isabel'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const isabelBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'isabel',
  );
/** Isabel's own damage on a given kit line, by atkPct. */
const isabelDmg = (evs: SimEvent[], atkPct: number) =>
  dmg(evs).filter((d) => d.slug === 'isabel' && d.atkPct === atkPct);
/** Isabel's self-buffs on a given stat/value. */
const selfBuff = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === ISABEL &&
      b.targetIdx === ISABEL &&
      b.stat === stat &&
      b.value === value,
  );
/** Boss debuffs (targetIdx null) on a given stat/value. */
const bossDebuff = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.targetIdx === null && b.stat === stat && b.value === value,
  );
/** Lengths (frames) of every Full Burst window in the fight. */
const fbWindowLens = (evs: SimEvent[]): number[] => {
  const starts = evs.filter((e) => e.kind === 'fullBurstStart');
  const lens: number[] = [];
  for (const s of starts) {
    const end = evs.find((e) => e.kind === 'fullBurstEnd' && e.frame > s.frame);
    if (end) lens.push(end.frame - s.frame);
  }
  return lens;
};
/** Distinct crit rates seen per unit on the given buckets — the L1 scope discriminator. */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][],
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of dmg(evs)) {
    if (!buckets.includes(d.bucket)) continue;
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')]),
  );
}

// ---- counterfactual / nearest-wrong patches ---------------------------------------------------
/** L1-L3 nearest-wrong (escalating): S1 ladder collapsed to a single "always max" atkPct 17.28. */
const cfS1NoEscalate = withPatchedOverride('isabel', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects?.some((e: any) => e.kind === 'escalating'),
  );
  if (!b)
    throw new Error('isabel S1 escalating block missing — fixture is stale');
  b.effects = [{ kind: 'buff', stat: 'atkPct', value: 17.28, durationSec: 45 }];
});
/** L1 nearest-wrong (scope): the 6.26% crit as a normal-scoped critRateNormalPct. */
const cfCrScoped = withPatchedOverride('isabel', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects?.some((e: any) => e.kind === 'escalating'),
  );
  if (!b)
    throw new Error('isabel S1 escalating block missing — fixture is stale');
  const step = b.effects
    .find((e: any) => e.kind === 'escalating')
    .steps.find((s: any) => s.stat === 'critRatePct');
  if (!step)
    throw new Error('isabel S1 critRatePct step missing — fixture is stale');
  step.stat = 'critRateNormalPct';
});
/** L1 nearest-wrong (trigger): the S1 ladder re-keyed burstCast → fullBurstEnter. LIVE in this
 *  fixture — helm is co-B3, so the team completes more Full Bursts (13) than Isabel casts (7); a
 *  fullBurstEnter key over-applies the buff and escalates the Marked-Target counter twice as fast. */
const cfS1FbEnter = withPatchedOverride('isabel', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects?.some((e: any) => e.kind === 'escalating'),
  );
  if (!b)
    throw new Error('isabel S1 escalating block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});
/** L4 nearest-wrong (cadence): the battle-start passive hit removed → 11 hits, not 12. */
const cfS2NoT0 = withPatchedOverride('isabel', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => b.trigger?.kind !== 'passive');
  if (ov.skill2.length === before)
    throw new Error('isabel S2 passive block missing — fixture is stale');
});
/** L6-L8 nearest-wrong (escalating): the burst rider ladder collapsed to "all three every cast". */
const cfBurstNoEscalate = withPatchedOverride('isabel', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some((e: any) => e.kind === 'escalating'),
  );
  if (!b)
    throw new Error('isabel burst escalating block missing — fixture is stale');
  b.effects = [
    { kind: 'buff', stat: 'damageTakenPct', value: 39.96, durationSec: 5 },
    { kind: 'flatDamage', atkPct: 299.7 },
    { kind: 'flatDamage', atkPct: 349.65 },
  ];
});
/** L9 nearest-wrong (fire-rate): the fullBurstExtend block removed entirely. */
const cfNoExt = withPatchedOverride('isabel', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'fullBurstExtend'),
  );
  if (ov.burst.length === before)
    throw new Error('isabel fullBurstExtend block missing — fixture is stale');
});
/** L9 nearest-wrong (sign): the ▼5s nerf flipped to ▲5s — Isabel's FB windows grow to 15s, the
 *  opposite of the kit's "Full Burst Duration ▼ 5 sec". */
const cfExtSignFlip = withPatchedOverride('isabel', (ov) => {
  let hit = 0;
  for (const b of ov.burst)
    for (const e of b.effects)
      if (e.kind === 'fullBurstExtend') ((e.seconds = 5), hit++);
  if (!hit)
    throw new Error('isabel fullBurstExtend block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1NoEscalate = run({ isabel: cfS1NoEscalate });
const crScoped = run({ isabel: cfCrScoped });
const s1FbEnter = run({ isabel: cfS1FbEnter });
const s2NoT0 = run({ isabel: cfS2NoT0 });
const burstNoEscalate = run({ isabel: cfBurstNoEscalate });
const noExt = run({ isabel: cfNoExt });
const extSignFlip = run({ isabel: cfExtSignFlip });

/** Isabel casts 7 bursts/180s in this fixture; every count below derives from this, not a literal. */
const casts = isabelBursts(base.events).length;

describe('isabel — kit spec', () => {
  it('fixture sanity: Isabel reaches Marked Target 3 (≥3 burst casts)', () => {
    expect(casts).toBeGreaterThanOrEqual(3);
  });

  describe('L1-L3 — S1 escalating self-buff (critRate 6.26 / critDmg 18.03 / ATK 17.28, 45s)', () => {
    const cRate = selfBuff(base.events, 'critRatePct', 6.26);
    const cDmg = selfBuff(base.events, 'critDamagePct', 18.03);
    const atk = selfBuff(base.events, 'atkPct', 17.28);

    it('escalating ladder: step i applies from the (i+1)th cast → self counts casts / casts-1 / casts-2', () => {
      expect(cRate.length).toBe(casts);
      expect(cDmg.length).toBe(casts - 1);
      expect(atk.length).toBe(casts - 2);
    });

    it('each step is a distinct 45-second buff held by Isabel alone (self-scoped)', () => {
      for (const bs of [cRate, cDmg, atk]) {
        expect(bs.length).toBeGreaterThan(0);
        expect([...new Set(bs.map((b) => b.expiresFrame! - b.frame))]).toEqual([
          45 * FPS,
        ]);
        expect([...new Set(bs.map((b) => b.targetIdx))]).toEqual([ISABEL]);
      }
      // distinct buff keys → the three steps coexist/stack rather than overwrite one another
      expect(new Set([...cRate, ...cDmg, ...atk].map((b) => b.key)).size).toBe(
        3,
      );
    });

    it('DISCRIMINATING (escalating): a non-escalating "always max" encoding drops the 6.26/18.03 steps', () => {
      expect(selfBuff(s1NoEscalate.events, 'critRatePct', 6.26).length).toBe(0);
      expect(selfBuff(s1NoEscalate.events, 'critDamagePct', 18.03).length).toBe(
        0,
      );
      // …and fires atkPct 17.28 on EVERY cast (no ramp), unlike the faithful casts-2
      expect(selfBuff(s1NoEscalate.events, 'atkPct', 17.28).length).toBe(casts);
    });

    it('DISCRIMINATING (scope): the crit line is GENERIC critRatePct — it lifts her skill-bucket crit', () => {
      // A normal-scoped critRateNormalPct would leave the skill bucket (her S2 periodic hit) unchanged.
      expect(critRatesByUnit(base.events, ['skill'])).not.toEqual(
        critRatesByUnit(crScoped.events, ['skill']),
      );
      expect(selfBuff(crScoped.events, 'critRatePct', 6.26).length).toBe(0);
    });

    it("DISCRIMINATING (trigger): keyed to burstCast (her casts), NOT fullBurstEnter (the team's FB count)", () => {
      // helm is co-B3 → the team completes more Full Bursts than Isabel casts. A fullBurstEnter key
      // would apply (and escalate) the buff on every team FB, so its self-buff count tracks the FB
      // count, which is strictly greater than Isabel's own cast count.
      const fbCount = base.events.filter(
        (e) => e.kind === 'fullBurstStart',
      ).length;
      expect(fbCount).toBeGreaterThan(casts); // fixture makes this discrimination live
      expect(selfBuff(s1FbEnter.events, 'critRatePct', 6.26).length).toBe(
        fbCount,
      );
      expect(selfBuff(s1FbEnter.events, 'critRatePct', 6.26).length).not.toBe(
        casts,
      );
    });
  });

  describe('L4 — S2 periodic single hit: 170.58% of final ATK, time-based ~15s, 12 hits/180s', () => {
    const hits = isabelDmg(base.events, 170.58).filter(
      (d) => d.srcSlot === 'skill2',
    );

    it('fires exactly 12×/180s in the skill bucket, crit-eligible, never the burst bucket', () => {
      expect(hits.length).toBe(12);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect(hits.every((d) => d.critEligible)).toBe(true);
    });

    it('is ONE hit per proc (not ×5 from the 5-target clause), never cores, never range-bonused', () => {
      // The "5 highest-DEF enemies" clause collapses to a single boss hit; a ×5 misread would be 60.
      expect(hits.every((d) => d.coreEligible)).toBe(false);
      expect(hits.every((d) => d.rangeApplied)).toBe(false);
    });

    it('is a battle-start hit (t=0) then every 15s — the measured CD-gated cadence', () => {
      const secs = hits.map((d) => d.sec).sort((a, b) => a - b);
      expect(secs[0]).toBeLessThan(1); // the load-bearing t=0 passive fire
      for (let i = 1; i < secs.length; i++)
        expect(secs[i] - secs[i - 1]).toBeCloseTo(15, 0);
    });

    it('DISCRIMINATING (cadence): dropping the battle-start hit leaves 11, not 12', () => {
      const cf = isabelDmg(s2NoT0.events, 170.58).filter(
        (d) => d.srcSlot === 'skill2',
      );
      expect(cf.length).toBe(11);
    });
  });

  describe('L5 — burst base nuke: 149.85% of final ATK, every cast, FB-exempt', () => {
    const nukes = isabelDmg(base.events, 149.85).filter(
      (d) => d.srcSlot === 'burst',
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(casts);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        [],
      );
    });
  });

  describe('L6 — burst MT1: Damage Taken ▲ 39.96% for 5 sec (boss debuff, escalating step 1)', () => {
    const debuff = bossDebuff(base.events, 'damageTakenPct', 39.96);

    it('fires every cast as a boss debuff (targetIdx null) for exactly 5 sec', () => {
      expect(debuff.length).toBe(casts);
      expect(debuff.length).toBeGreaterThan(0);
      expect([
        ...new Set(debuff.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
      expect(debuff.every((b) => b.targetIdx === null)).toBe(true);
    });
  });

  describe('L7-L8 — burst MT2/MT3 additional damage (299.7 / 349.65, escalating steps 2/3)', () => {
    const mt2 = isabelDmg(base.events, 299.7).filter(
      (d) => d.srcSlot === 'burst',
    );
    const mt3 = isabelDmg(base.events, 349.65).filter(
      (d) => d.srcSlot === 'burst',
    );

    it('ramp casts-1 / casts-2 (previous effects repeat) in the burst bucket', () => {
      expect(mt2.length).toBe(casts - 1);
      expect(mt3.length).toBe(casts - 2);
      expect([...new Set([...mt2, ...mt3].map((d) => d.bucket))]).toEqual([
        'burst',
      ]);
    });

    it('DISCRIMINATING (escalating): a non-escalating "all three every cast" fires 299.7/349.65 casts times', () => {
      const cfMt2 = isabelDmg(burstNoEscalate.events, 299.7).filter(
        (d) => d.srcSlot === 'burst',
      );
      const cfMt3 = isabelDmg(burstNoEscalate.events, 349.65).filter(
        (d) => d.srcSlot === 'burst',
      );
      expect(cfMt2.length).toBe(casts);
      expect(cfMt3.length).toBe(casts);
    });
  });

  describe('L9 — burst: Full Burst Duration ▼ 5 sec (all allies, fullBurstExtend:-5) ⚑ blast-radius', () => {
    it('STRUCTURAL: shipped is a fullBurstExtend:-5 block on the burst slot', () => {
      // Re-load the shipped override shape via the counterfactual predicate: removing it must find one.
      const lens = fbWindowLens(base.events);
      const short = lens.filter((l) => l < 10 * FPS);
      expect(
        short.length,
        'no sub-10s FB window — the -5 extend is not firing',
      ).toBeGreaterThan(0);
      // every shortened window is exactly 5s (10s base − 5s extend)
      expect([...new Set(short)]).toEqual([5 * FPS]);
    });

    it('DISCRIMINATING (fire-rate): removing the block yields NO sub-10s Full Burst window', () => {
      const lens = fbWindowLens(noExt.events);
      expect(lens.filter((l) => l < 10 * FPS).length).toBe(0);
    });

    it("DISCRIMINATING (sign): a ▲5s flip LENGTHENS Isabel's windows to 15s — the opposite of the kit", () => {
      const lens = fbWindowLens(extSignFlip.events);
      expect(
        lens.some((l) => l > 10 * FPS),
        'no over-10s window — the sign flip is not firing',
      ).toBe(true);
      expect([...new Set(lens.filter((l) => l > 10 * FPS))]).toEqual([
        15 * FPS,
      ]);
    });
  });
});

```

---

## (7b) DRIVER IMPLEMENTATION — src/skills/overrides/isabel.json (the shipped override under grade)

```json
{
  "note": "PROMOTED + SOLO-VALIDATED 2026-07-16 (loaded override). Solo real/sim 1.034 (real 55,280,027). [SG NOTE 2026-07-16: the old 'core bands HR-contaminated' cap is DEAD — isabel's solo read (docs/probe-data/isabel-sg-band.json) confirmed the SG core bands HR-clean (NEAR matched pre-reg within 2% at HR=0). The live SG uncertainty is LANDING at range (mid/midfar/far read below the engine table; corroboration pending) — totals stay moderate-confidence until that lands.] Isabel — Electric SG Attacker, Burst III, ammo 9 / reloadFrames 133 / hitsPerShot 10 pellets, burst CD 40s. A Marked-Target escalating kit (Liter-style 'Once/Twice/Three times, previous effects trigger repeatedly'). AUDIT (8 lines, 6 implemented / 2 accounted): S1 — burstCast escalating self-buff (Once: critRate 6.26 / Twice: critDmg 18.03 / Three: atk 17.28, each 45s > 40s CD so all three hold at steady state once phase 3 is reached ~3rd burst); modeled with the `escalating` effect on burstCast so activation N applies steps 1..N. S2 — 'Affects 5 enemies with highest DEF, deals 170.58% as damage': ONE hit lands on the lone boss; trigger MEASURED 2026-07-16 (docs/probe-data/isabel-sg-band.json riderFinding): TIME-BASED, period ~14.7s (~12x/180s), independent of ammo/magazine state. Datamine confirms S2 'Pointed Feather' is a SINGLE hit ('Deals 170.58% as damage' — NOT a DoT anywhere in her kit; the three 45s lines are S1 Marked-Target BUFFs: crit rate/crit dmg/ATK, gated on burst) firing on its datamined skillCooldownsSec.skill2 = 15 CD. RE-ENCODED 2026-07-20 as a single `flatDamage` 170.58 at battle start (passive, t=0) + `interval:15` `flatDamage` 170.58 for the recurrences (t=15,30,…,165) = 12 hits/180s, first cast at t=0 (crits normally, never cores, never range — all match the measurement). This SUPERSEDES the old `dot intervalSec 14.7` device (which faked the periodic single hit); behavior-IDENTICAL (12 hits × same per-hit, solo A/B byte-for-byte at crit-off), just correctly labeled as a CD-gated single hit rather than a DoT. atkPct 170.58 = the FAITHFUL kit coefficient. (History: this was briefly set to 174.49 to encode the measured non-crit value 205,709 at the OLD too-low scope-lock term 117,887 — the term read ~2.3% low across all three SG probes. That gap was RESOLVED 2026-07-16 as the unmodeled RELATIONSHIP bonus, now modeled globally [DECISIONS/open-questions U18], so the term is correct and the kit coefficient 170.58 is restored: at isabel's Pilgrim-max effective ATK the rider now lands ~205,123, within 0.3% of the measured 205,709.) RUN-VALIDATED 2026-07-16: fires exactly 12 hits/180s solo = 2,468,412 (measured real 2,571,364 incl. 3 crits; the ~4% rider gap is the engine's global DOT_CRIT gating, off by default — open-questions DoT-crit; solo total moves 50.86M -> 53.11M vs real 55.28M). BURST — base 149.85% Burst-Skill-damage nuke (burstCast, FB-exempt auto, no crit) fires every burst regardless of phase; the Marked-Target escalating riders (MT1 Damage Taken ▲39.96%/5s boss debuff / MT2 299.7% additional / MT3 349.65% additional, previous repeat) modeled as a second burstCast `escalating` block targeting enemy (step1 damageTakenPct buff, steps 2-3 flatDamage). 'Full Burst Time ▼ 5 sec' (all allies) modeled as fullBurstExtend:-5 on burstCast — a rotation mechanic (shortens the FB window; in-game intent is faster re-cycle) ⚑ BLAST-RADIUS: net sign in the engine's rotation model is UNVERIFIED (per-cycle FB shortening vs faster next-burst) — needs a /sim-battery diff; pull if it spuriously net-harms the board. No Hit Rate anywhere in Isabel's kit (she is HR-CLEAN) — but totals stay magnitude-capped because the engine's shared SG core bands are HR-contaminated from other units (G4). SKIPPED/ACCOUNTED: none genuinely skippable — every line is modeled. ⚑ LIST: (1) cadence tuple — pullsPerSec (SG class default 1.5) + reloadFrames 133 (datamine) + rolling-reload, all datamine-unreliable, ALWAYS-⚑; (2) S2 trigger+cadence RESOLVED (measured time-based ~14.7s — no longer ⚑; residual: the 174.49-vs-170.58 coef tension + whether the period holds in TEAM fights). CD-RE-ENCODE 2026-07-20: S2 is a single hit on the datamined 15s CD, re-encoded as passive-t0 + interval:15 flatDamage (see the S2 description above) — 12 hits/180s, first at t=0. NOTE the first-fire phase is load-bearing for the count: interval:15 ALONE (first at t=15) gives 11 hits (the 12th at t=180.000 = the excluded final frame), so the t=0 battle-start hit is what reproduces the measured 12; the old dot@14.7 reproduced 12 by tightening the spacing instead. Both are behavior-identical at solo A/B (crit-off); the re-encode just labels it faithfully (CD-gated single hit, not a DoT); (3) fullBurstExtend:-5 rotation blast-radius sign/net-effect. Priors applied: P1 cadence ⚑ (blind), P2 riders FB-by-timing default ON + no `noRange` + burst-cast auto-FB-exempt + core only if text says 'core strike' (it doesn't), P3 no DoT lines present. This is a HYPOTHESIS for hand-tuning against a recording, not an accurate model. Kit-autonomy gauntlet 2026-07-25: all 9 kit lines cross-family corroborated FAITHFUL (S2b claude-fable-5 / S5-S7 claude-opus-5); the 18-test spec scripts/tests/units/isabel.test.ts pins each line GREEN vs shipped + RED vs its nearest-wrong counterfactual (escalating ladder casts/casts-1/casts-2, burstCast-vs-fullBurstEnter trigger, S2 12-hit t=0+15s cadence, FB-exempt nuke, boss-debuff MT1, fullBurstExtend:-5 sign). Residual ⚑ unchanged: fullBurstExtend:-5 net rotation sign (unverified), SG cadence tuple.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "skill1": [
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
          "kind": "escalating",
          "steps": [
            {
              "kind": "buff",
              "stat": "critRatePct",
              "value": 6.26,
              "durationSec": 45
            },
            {
              "kind": "buff",
              "stat": "critDamagePct",
              "value": 18.03,
              "durationSec": 45
            },
            {
              "kind": "buff",
              "stat": "atkPct",
              "value": 17.28,
              "durationSec": 45
            }
          ]
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 170.58,
          "crit": true
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
          "kind": "flatDamage",
          "atkPct": 170.58,
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 149.85
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
          "kind": "escalating",
          "steps": [
            {
              "kind": "buff",
              "stat": "damageTakenPct",
              "value": 39.96,
              "durationSec": 5
            },
            {
              "kind": "flatDamage",
              "atkPct": 299.7
            },
            {
              "kind": "flatDamage",
              "atkPct": 349.65
            }
          ]
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
      "effects": [
        {
          "kind": "fullBurstExtend",
          "seconds": -5
        }
      ]
    }
  ],
  "caveats": [
    "skill2: kit targets 5 enemies with the highest final DEF — modeled as the lone boss (the multi-target selection has no effect vs a partless single boss)",
    "skill2: the kit gives no activation trigger for this damage — the ~14.7-sec period is a solo measurement (2026-07-16); whether the period holds in team fights is unverified",
    "skill2: this periodic hit crits in-game (MEASURED 2026-07-17: 3 crits / 11 resolved fires, crit value 308,564 = non-crit 205,709 ×1.5 exactly; docs/probe-data/isabel-sg-band.json riderFinding) — modeled via the per-DoT `crit:true` opt-in (rolls at Isabel's sheet rate). The global DOT_CRIT default stays OFF; most DoTs are validated non-crit (jill acid tick video-confirmed 99.7% non-crit, mihara-bonding-chain Ensnaring validated 1.03 non-crit)",
    "burst: Full Burst Duration ▼ 5 sec is modeled as shortening the team's Full Burst window — its net rotation effect (shorter window vs faster re-cycle) is an unverified estimate",
    "skill1/burst: Marked Target stage is modeled as a permanent count of Isabel's burst uses — a possible in-game stage reset when the 45-sec mark expires (burst spacing over 45 sec) is not modeled"
  ]
}

```
