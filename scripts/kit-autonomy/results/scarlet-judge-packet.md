# S7 RECONCILING JUDGE — scarlet (Scarlet, AR/Electric/Attacker/B3)

You are the binding reconciling judge for the kit-autonomy gauntlet on slug `scarlet` (BASE Scarlet — NOT `scarlet-black-shadow`). Read your contract below, then grade the DRIVER's implementation against the kit prose (ground truth) and the two blind cross-family reviews. Return the binding verdict JSON your contract specifies.

====================================================================

## PART 1 — YOUR CONTRACT (RECONCILING-JUDGE.md) + RETURN JSON SHAPE

====================================================================

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
  "convergence": {
    "s5TestsVsDriverOverride": "GREEN|RED",
    "redAssertions": ["<which S5 assertions fail vs the driver's override>"]
  },
  "lineFindings": {
    "skill1": [
      {
        "kitLine": "<≤40 chars>",
        "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR",
        "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null",
        "driverSaid": "...",
        "blindSaid": "...",
        "formulaCheck": "...",
        "fireRateOk": true,
        "explanation": "..."
      }
    ],
    "skill2": [],
    "burst": []
  },
  "gotchas": [
    {
      "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING",
      "slot": "...",
      "summary": "...",
      "evidence": "<real kit line + formula citation + driver vs blind>",
      "documentedByDriver": true,
      "severity": "high|med|low",
      "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>"
    }
  ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```

Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.

====================================================================

## PART 2 — MECHANICS SSOT (damage formula + game mechanics)

====================================================================

### docs/data/damage-calculation.md

```
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

FinalATK = max(0, effectiveAtk − bossDef) // bossDef = 0 at scope lock

effectiveAtk = staticAtk × (1 + Σ ATK ▲ % / 100) + Σ (caster-ATK grants, as flat values) + (Σ ATK-of-Max-HP % / 100) × ownMaxHp

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

finalATK = staticAtk × (1 + Σ ATK%) + Σ("% of caster's ATK" flat) + Σ(HP→ATK flat)
dmg = (max(0, finalATK − enemyDEF) × weaponOrSkillCoef) ← DEF subtracts INSIDE the base, pre-coef
× major [1 + crit + core + fullBurst(0.5) + range(0.3)] ← ADDITIVE within (core does NOT ×crit)
× element [1 + 0.1 advantage + elem-dmg buffs]
× charge [charged shots only]
× dmgUp [1 + attackDamage + sustained + pierce + parts + …] "Damage Up"
× taken [1 + damageTaken(enemy) + distributed]

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

FB = 0.5 if Full Burst is active AND the instance is not boundary-timed (see below); else 0
Range = 0.3 if the weapon is in its effective band vs the boss's current position; RL never;
skill/proc instances never (noRange)
Crit = critRate × critBonus (expected-value mode)
| critBonus or 0, Bernoulli(critRate) (Monte Carlo mode, cfg.seed set)
critRate = (base crit rate + Crit Rate ▲ % + normal-only Crit Rate ▲ %) / 100,
clamped 0..1 (base 15%)
the normal-only term (`critRateNormalPct`) joins ONLY on normal-attack
instances — kit lines reading "Critical Rate of normal attacks ▲x%"
(helm S1). Skill procs and burst damage see the unscoped term alone.
critBonus = (critDamage − 100)/100 + Crit Damage ▲ %/100 (base +50%)
Core = coreExposure × ACR × coreBonus (expected-value mode)
| coreBonus or 0, Bernoulli(coreExposure × ACR) (Monte Carlo mode)
coreExposure = cfg.coreHitRate (1.0 on the scope-lock boss)
ACR = acrForHR(weapon, band, hitRatePct) — the auto-aim core-hit fraction.
LIVE MODEL — UNIGEO uniform-in-circle (default 'all', 2026-07-22; DECISIONS 2026-07-22),
scope-lock (small) boss profile, accuracy-circle weapons (AR/SMG/SG):
R(hr) = (CIRCLE_PX_K · scale_w)/2 · (1 − hr/100) px (linear to ZERO at HR 100;
CIRCLE_PX_K 0.648 measured, scale_w = datamined start_accuracy_circle_scale
{AR 75, SMG 110, SG 250}; MEASURED at 79.3/48.2 px for SG @ HR 0/38.91)
SG: ACR = min(1, (r_core(band)/R(hr))²) ÷ coverage(band, R(hr)) (per landed pellet)
AR/SMG: ACR = lensOverlap(disc R_eff = f_bloom_w·R(hr), offset δ_w(hr), core r_core)
÷ disc area (per hit)
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
coreBonus = (coreAttackMultiplier − 100)/100 + Core Damage ▲ %/100 (base +100%)

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

Element = 1.1 + (Element Damage ▲ % + Superior-element Damage ▲ %)/100 with elemental advantage
= 1.0 without

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

Charge = chargeMult/100 + (chargeMult/100) × (doll charge % + Charge-Damage-multiplier buffs %) / 100 + Charge Damage ▲ %/100

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

DamageUp = 1 + ( Attack Damage ▲ % + Sustained Damage ▲ % [only on sustained-flavored instances (dots)] + Sequential Damage ▲ % [only on sequential-flavored instances] + True Damage ▲ % [only on true-flavored instances] + Pierce Damage ▲ % [only for Pierce-tagged shots: static hasPierce,
a live gainPierce window, or a swap-scoped
weaponSwap.hasPierce shot (snow-white cannon)] + Projectile Explosion ▲ % [RL NORMAL attacks — see 1f]
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

Taken = 1 + (Σ Damage Taken ▲ on the boss + Σ Distributed-damage Taken ▲ [distributed instances only, and only
while a Damage Taken ▲ is active]) / 100
Distributed = 1 + Distributed Damage ▲ %/100 [distributed instances only]

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

187,102 × 14.006 × 1.0 × 1.1 × 1.209 = 3,485,150 → measured 3,448,659 (98.9%)
crit: × 1.5 = 5,227,725 → measured (other fight) ×1.5 pair exact

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
```

### docs/data/game-mechanics.md

```
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
```

====================================================================

## PART 3 — GROUND TRUTH: scarlet kit prose + base stats (data/characters.json)

====================================================================

````json
{
  "slug": "scarlet",
  "name": "Scarlet",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/ca-21/cj-01/92e64b936e9eab70344e5a50e02e214c.png",
  "weapon": "AR",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Electric",
  "manufacturer": "Pilgrim",
  "normalAttackMultiplier": 27.08,
  "coreAttackMultiplier": 200,
  "ammo": 20,
  "reloadFrames": 159,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 17.1,
  "burstGaugePerShot": 0.45,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates after landing 10 normal attack(s). Affects self.\nATK ▲ 23.15%, stacks up to 5 time(s) and lasts for 5 sec.\nCurrent HP ▼ 4.01%.",
    "skill2": "■ There is a 30% chance of activating when attacked.\nDeals 138.24% of final ATK as additional damage. \n■ Activates when HP falls below 60%. Affects self.\nCritical Damage ▲ 6.61% continuously.",
    "burst": "■ Affects self. Activates when HP falls below 50%.\nCritical Rate ▲ 19.57% for 10 sec. \n■ Affects all enemies.\nDeals 849.15% of final ATK as Burst Skill damage."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1022201,
      "shot_detail": {
        "id": 1022201,
        "damage": 2708,
        "max_ammo": 20,
        "shake_id": 2,
        "ShakeType": "Fire_AR",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 230,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "AR",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 720,
        "name_localkey": "Assault Rifle",
        "prefer_target": "TargetAR",
        "reload_bullet": 10000,
        "counter_enermy": "Metal_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 720,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 19,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 4500,
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
        "end_accuracy_circle_scale": 75,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 75,
        "target_burst_energy_pershot": 9000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 75,
        "auto_start_accuracy_circle_scale": 75
      },
      "bonusrange_max": 45,
      "bonusrange_min": 25
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2222101,
      "skill2_id": 2222201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2222101,
        "icon": "icn_skill_atkup_01",
        "group_id": 22221,
        "skill_level": 1,
        "name_localkey": "Blood for Blood",
        "next_level_id": 2222102,
        "level_up_cost_id": 40102,
        "description_localkey": "■ Activates after landing {description_value_01} normal attack(s). Affects self.\n<color=#00AEFF>ATK ▲ {description_value_02}%, stacks up to {description_value_04} time(s) and lasts for {description_value_03} sec.\nCurrent HP ▼ {description_value_05}%.</color>",
        "description_value_list": [
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
              "17.48",
              "18.11",
              "18.74",
              "19.37",
              "20",
              "20.63",
              "21.26",
              "21.89",
              "22.52",
              "23.15"
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
              "4.01",
              "4.01",
              "4.01",
              "4.01",
              "4.01",
              "4.01",
              "4.01",
              "4.01",
              "4.01",
              "4.01"
            ]
          },
          {},
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2222201,
        "icon": "icn_skill_atkup_01",
        "group_id": 22222,
        "skill_level": 1,
        "name_localkey": "Zatoichi",
        "next_level_id": 2222202,
        "level_up_cost_id": 40202,
        "description_localkey": "■ There is a {description_value_01}% chance of activating when attacked.\n<color=#00AEFF>Deals {description_value_02}% of <word_group=10025>final</word_group> ATK as additional damage.</color> \n■ Activates when HP falls below {description_value_03}%. Affects self.\n<color=#00AEFF>Critical Damage ▲ {description_value_04}% continuously.</color>",
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
              "86.39",
              "92.15",
              "97.91",
              "103.68",
              "109.44",
              "115.2",
              "120.96",
              "126.72",
              "132.48",
              "138.24"
            ]
          },
          {
            "description_value": [
              "60",
              "60",
              "60",
              "60",
              "60",
              "60",
              "60",
              "60",
              "60",
              "60"
            ]
          },
          {
            "description_value": [
              "4.13",
              "4.4",
              "4.68",
              "4.95",
              "5.23",
              "5.51",
              "5.78",
              "6.06",
              "6.33",
              "6.61"
            ]
          },
          {
            "description_value": [
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0"
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
      "ulti_skill_id": 1222301,
      "ulti_skill_detail": {
        "id": 1222301,
        "icon": "icn_skill_c222_ult",
        "group_id": 12223,
        "shake_id": 1,
        "skill_type": "InstantAll",
        "attack_type": "Electronic",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "TimeSec",
        "name_localkey": "Scarlet Flash",
        "next_level_id": 1222302,
        "prefer_target": "LowHP",
        "resource_name": "c222_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 40302,
        "skill_value_data": [
          {
            "skill_value": 53071,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 0,
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
        "description_localkey": "■ Affects self. Activates when HP falls below {description_value_01}%.\n<color=#00AEFF>Critical Rate ▲ {description_value_02}% for {description_value_03} sec.</color> \n■ Affects all enemies.\n<color=#00AEFF>Deals {description_value_04}% of <word_group=10025>final</word_group> ATK as Burst Skill damage.</color>",
        "description_value_list": [
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
              "12.23",
              "13.05",
              "13.86",
              "14.68",
              "15.49",
              "16.31",
              "17.12",
              "17.94",
              "18.75",
              "19.57"
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
              "530.71",
              "566.1",
              "601.48",
              "636.86",
              "672.24",
              "707.62",
              "743",
              "778.38",
              "813.76",
              "849.15"
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
          0
        ],
        "after_hurt_function_id_list": [
          0
        ],
        "before_use_function_id_list": [
          122230101
        ],
        "before_hurt_function_id_list": [
          0
        ]
      }
    },
    "statScaling": {
      "grow_grade": 422202,
      "grade_core_id": 1,
      "stat_enhance_id": 5101,
      "stat_enhance_detail": {
        "id": 5101,
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
        400001
      ],
      "element_details": [
        {
          "id": 400001,
          "element": "Electronic",
          "group_id": 5000004,
          "element_icon": "icn_element_elect",
          "weak_element_id": 500001,
          "element_desc_localekey": "Injects Code: Z.E.U.S. to all water-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Electric",
          "element_code_name_localekey": "Code: Z.E.U.S."
        }
      ]
    },
    "piece": {
      "piece_id": 5100222,
      "piece_detail": {
        "id": 5100222,
        "class": "Attacker",
        "order": 22200,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "PILGRIM",
        "resource_id": 222,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Scarlet's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "corporation_sub_type": "OVERSPEC",
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 422201,
      "class": "Attacker",
      "order": 10141,
      "name_code": 5041,
      "corporation": "PILGRIM",
      "resource_id": 222,
      "name_localkey": "Scarlet",
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
    "def": 90,
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
    "resourceId": 222
  }
}```

====================================================================
## PART 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)
====================================================================

```json
{
  "slug": "scarlet",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "after landing 10 normal attack(s): ATK ▲",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK (atkPct) — not scoped to normal attacks; only the TRIGGER counts normal-attack landings",
      "durationSemantics": "durationSec: 5 (wall-clock, literal 'lasts for 5 sec'), maxStacks: 5, each proc adds a stack + refreshes; NOT rounds, NOT permanent",
      "triggerIdentity": "hitCount count:10 (counts landed ROUNDS; AR hitsPerShot=1 so hits==pulls). No FB gate, no burst gate. Reload (159f ≈ 2.65s) pauses accrual but 5s duration usually bridges it",
      "targetSet": "self only",
      "nearestWrongModel": "passive self-buff at max-stacks value (5×23.15%) from frame 0 (instant-to-max, no hitCount accrual), or a non-stacking single 23.15% refresh",
      "distinguishingAssertion": "onEvent: FIRST buffApply{stat:'atkPct',value:23.15} occurs only after the 10th shot event (not at frame 0); stacks field climbs 1→5 across successive procs reaching stacks:5 no earlier than the 50th hit; each apply refreshes (refresh:true) with expiresFrame ≈ applyFrame+300",
      "inertness": "no buffApply for this key before hit #10; teammates receive nothing (targetSlug === 'scarlet' on every apply)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Current HP ▼ 4.01%.",
      "disposition": "FIX",
      "scope": "self HP drain per S1 proc — 4.01% of CURRENT HP (compounding), not Max HP flat",
      "durationSemantics": "instant, permanent HP loss; monotonic (no heals anywhere in this kit, sim boss deals no damage) — HP only ever falls",
      "triggerIdentity": "same hitCount:10 block as the ATK stack (one proc = one drain)",
      "targetSet": "self",
      "nearestWrongModel": "dropped as 'defensive/inert' — which silently forces the two HP-threshold crit lines (skill2b, burst-a) to be either always-on or never-on. This line is the sole ENABLER of both gates in a sim where nothing else damages her",
      "distinguishingAssertion": "engine has no HP pool → model as a resource pool (e.g. resources:[{name:'hpLost',initial:0}] with a resource delta per S1 proc) read by resourceGate on the two crit lines. Assert: the pool's gate-crossing proc ordering holds — skill2's critDamagePct buffApply appears strictly AFTER ≥10 S1 procs (flat-delta encoding; ~13 if compounding is honored) and strictly BEFORE the burst crit-rate gate first opens (≥13 flat / ~17 compounding). Neither crit buff exists at frame 0",
      "inertness": "the drain itself deals no damage event and moves no boss HP; totals unchanged if BOTH downstream gates are held shut",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "30% chance of activating when attacked",
      "disposition": "MEASUREMENT-GATED",
      "scope": "counter-damage rider: 138.24% of final ATK as additional damage, triggered by RECEIVING hits",
      "durationSemantics": "instant per proc, no duration",
      "triggerIdentity": "on-being-attacked ×30% — NO such trigger exists in the schema and the v1 boss has no modeled attack cadence. Any encoding needs a ⚑ interval proxy (boss attacks/sec × 0.30) — an ALWAYS-⚑ invented cadence (taxonomy field 2)",
      "targetSet": "enemy (flatDamage at the boss)",
      "nearestWrongModel": "misreading 'when attacked' as 'when attackING' — keying it to her own shotFired/hitCount (≈12 procs/s × 30% × 138.24% = a massive phantom damage channel). Second-nearest: a confident un-flagged interval cadence",
      "distinguishingAssertion": "no damage events carrying mult≈138.24 correlated 1:1 with her own shot events; if shipped at all it is interval-keyed with an explicit ⚑ cadence, else the verbatim line sits in unmodeled and totals(res)['scarlet'] is bit-identical with the block deleted",
      "inertness": "must contribute ZERO unless a measured boss-attack cadence is supplied; sim thresholds also note: real fights add boss-damage HP loss this sim lacks, so real threshold times are EARLIER than sim-derived ones (⚑)",
      "evidenceTier": "CALIBRATED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "when HP falls below 60%: Crit Dmg ▲",
      "disposition": "FIX",
      "scope": "generic critDamagePct 6.61, self — applies to all her crit-eligible damage, not normal-only",
      "durationSemantics": "'continuously' = permanent WHILE below threshold; with monotonic HP (see skill1 drain) that is once-on-always-on. NOT a durationSec, NOT stacking",
      "triggerIdentity": "HP-threshold crossing — no native trigger; faithful encoding gates a block on the HP-loss resource pool (resourceGate min at the 60%-crossing) fed by S1's drain",
      "targetSet": "self",
      "nearestWrongModel": "unconditional passive from frame 0 (the lazy read of 'continuously'), over-crediting the opening ~25s+; runner-up: giving it a durationSec so it lapses",
      "distinguishingAssertion": "no buffApply{stat:'critDamagePct',value:6.61} before the 10th S1 proc (flat encoding); exactly one apply after crossing, with NO expiry (no finite expiresFrame / never re-lapses); present through end of fight",
      "inertness": "zero crit-damage delta in the pre-threshold window; removing S1's HP drain must also kill this buff entirely",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "when HP falls below 50%: Crit Rate ▲ 10s",
      "disposition": "FIX",
      "scope": "generic critRatePct 19.57, self (not critRateNormalPct — no 'of normal attacks' scoping in the prose)",
      "durationSemantics": "durationSec: 10 — genuinely wall-clock, one window per qualifying cast",
      "triggerIdentity": "burstCast (her OWN burst; a burst-slot self line evaluated at cast) + HP<50% gate via the same resource pool. NOT fullBurstEnter — controlComp carries helm as co-B3, so team FBs ≠ her casts and the two encodings diverge every other rotation",
      "targetSet": "self",
      "nearestWrongModel": "(a) ungated burstCast — crit rate on EVERY burst including the first, when HP is still far above 50%; (b) keyed to fullBurstEnter — fires on helm's rotations too, ≈2× over-credit in the control comp",
      "distinguishingAssertion": "in controlComp('scarlet') with helm: burstCast events for scarlet exist; the FIRST scarlet burstCast (HP still >50% — fewer than ~13 S1 procs have elapsed) produces NO critRatePct buffApply; a LATER scarlet burstCast (post-crossing) produces buffApply{stat:'critRatePct',value:19.57,targetSlug:'scarlet'} with ≈10s expiresFrame; helm-cast FB entries never produce it",
      "inertness": "zero critRatePct applies on rotations helm bursts; zero before the 50% crossing",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 849.15% of final ATK as Burst Skill dmg",
      "disposition": "FAITHFUL",
      "scope": "one-shot nuke, % of HER final ATK at cast; 'all enemies' collapses to the single boss (×1, no phantom multi-target multiplication)",
      "durationSemantics": "instant on cast, no duration",
      "triggerIdentity": "burstCast trigger, unconditional (the HP<50% clause belongs to the crit-rate line's ■ block, not this one)",
      "targetSet": "enemy",
      "nearestWrongModel": "(a) granting it the +50% Full-Burst major — burst-cast instant damage lands PRE-FB-window and is FB-exempt (methodology §9); (b) ordering the damage BEFORE the crit-rate buff in the block list, so the nuke misses the 19.57% crit window it should snapshot on qualifying casts; (c) giving it core credit",
      "distinguishingAssertion": "the burst damage event fires once per scarlet burstCast with mult≈849.15, inFullBurst/fbMajorApplied FALSE (or bucket-exempt), rangeApplied false, no core; on a post-crossing cast its crit roll reflects the just-applied +19.57% (buff effect ordered before the flatDamage) — assert crit-rate input on that event > sheet rate",
      "inertness": "exactly one instance per cast — never re-fires on helm's FB entries; no +50% FB inflation",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ATK ▲ 23.15% ×5 stacks (hitCount 10)",
    "skill1:Current HP ▼ 4.01% (threshold enabler)",
    "skill2:HP<60% Critical Damage ▲ 6.61% continuous",
    "burst:HP<50% Critical Rate ▲ 19.57% for 10s",
    "burst:849.15% Burst Skill damage"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "There is a 30% chance of activating when attacked. Deals 138.24% of final ATK as additional damage."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to hunt: (1) 'when attacked' flipped to 'when attacking' — this single flip fabricates a ~12/s-cadence 138% damage channel and is the highest-magnitude trap in the kit; if the driver shipped ANY cadence for s2a, demand its ⚑ recipe and the boss-attack measurement it rests on. (2) The two HP-threshold crit lines treated as unconditional (t=0 passive / every-cast) because the engine has no HP pool — the faithful encoding routes S1's 'Current HP ▼ 4.01%' through a resource pool + resourceGate; the ORDERING invariant (skill2's 60% gate opens strictly before burst's 50% gate; neither open at t=0; both permanent-once-open for skill2, per-cast-window for burst) is testable regardless of whether the driver chose flat-delta (crossings at S1 proc #10/#13) or compounding (#13/#17) semantics — the test should pin whichever the override encodes and assert the ordering either way. (3) burstCast vs fullBurstEnter for the crit-rate window — controlComp's helm co-B3 makes this divergence LIVE in the standard fixture, so the assertion is cheap: filter buffApply by casterIdx on helm rotations. (4) The 849% nuke taking the +50% FB major (burst-cast damage is FB-exempt by timing). (5) Intra-block effect order: crit-rate buff must precede the nuke so a qualifying cast's nuke crits at the boosted rate. (6) Sim-vs-real threshold skew: the sim's only HP loss is S1 self-drain (boss deals no damage, s2a implies she IS attacked in real fights), so real-world threshold times are earlier than sim-derived — any future footage calibration of 'when does her crit turn on' must not be back-fitted by inflating the drain. Cadence tuple (AR pulls/s, reloadFrames 159) is ALWAYS-⚑ datamine-unreliable; assertions above are hit-count/event-ordered, not wall-clock, to stay robust to cadence retune.",
  "model": "claude-fable-5"
}
````

====================================================================

## PART 5 — S5 BLIND TEST (claude-opus-5) + its result vs the DRIVER override

====================================================================

GREEN/RED vs the driver override (src/skills/overrides/scarlet.json below): **19 passed / 1 failed / 2 skipped** of 22.

- The 2 skips are the two GAP lines (S1 'Current HP ▼4.01%' and S2 '30% when attacked') — both correctly unmodeled; the blind test marks them it.skip and guards them live elsewhere.
- The 1 FAILURE is 'the 5 sec window really expires between procs': it asserts stretching the S1 ATK buff 5s->60s must raise the total. It FAILS because at the datamined cadence the S1 ATK stack sits at 5/5 PERMANENTLY (the 5s window already bridges the 159f reload), so 5s vs 60s is damage-identical. This is a UNIVERSAL cadence artifact: it fails on ANY faithful encoding of this unit (the S1 atkPct block is identical in the driver, S6, and the parser baseline). It is a blind-test non-vacuity over-specification keyed to a slower cadence than the datamine, NOT a faithfulness defect of the driver encoding. The S1 ATK line is otherwise pinned faithfully (value 23.15, maxStacks 5, hitCount:10, 5s, self) and the blind test's other S1 assertions pass.

```typescript
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * scarlet (Scarlet) - AR / Electric / Attacker / Burst III. ammo 20, reload 159f, 1 hit/shot,
 * normal 27.08%, core 200%. BLIND per-unit kit spec: written from the kit prose ALONE, with no
 * sight of the driver's override, tests or reasoning. Every counterfactual locates its target
 * by PREDICATE (stat + magnitude), never by block index, because this file cannot know how the
 * driver ordered or split blocks.
 *
 * KIT STRUCTURE (activation header + stat keyword only):
 *   S1  [1] 'Activates after landing 10 normal' attack(s) / 'Affects self.'
 *           ATK up 23.15%, 'stacks up to 5 time(s)', 'lasts for 5 sec'
 *           'Current HP down 4.01%'                   -> self HP cost; v1 models no HP pool (GAP)
 *   S2a [1] '30% chance of activating when attacked'
 *           138.24% of final ATK as additional damage -> no on-attacked trigger primitive (GAP)
 *   S2b [1] 'Activates when HP falls below 60%' / 'Affects self.'
 *           Critical Damage up 6.61% 'continuously'
 *   B   [1] 'Affects self.' / 'Activates when HP falls below 50%.'
 *           Critical Rate up 19.57% 'for 10 sec'
 *       [2] 'Affects all enemies.' 849.15% of final ATK as Burst Skill damage
 *
 * HP-THRESHOLD READING (load-bearing). S1's cost shaves CURRENT HP, so HP decays geometrically and
 * never reaches 0: 0.9599^n < 0.60 at n=13 procs, < 0.50 at n=17. One proc = 10 landed normals, so
 * 130 / 170 rounds. With a 20-round magazine and a 159f reload the belt cycles at roughly 4.5
 * rounds/s (cadence is datamine-derived -> flagged, unreliable), i.e. both gates open at about 29s
 * and 38s and then stay open for the remaining ~80% of a 180s fight. The engine has NO HP pool at
 * all, so the faithful encoding keeps BOTH HP-gated buffs live (a passive, optionally with a rampSec
 * haircut for the opening seconds). Silently DROPPING either line because 'HP is unobservable' is the
 * exact failure this file is built to catch - the S2b and burst crit groups go RED on a zero count.
 *
 * FIXTURE: controlComp('scarlet', true) - liter (B1) + crown (B2) complete the chain so a Burst III
 * actually casts (a lone B3 makes ZERO Full Bursts), and helm is kept as a SECOND Burst III ON
 * PURPOSE: team Full Bursts then outnumber scarlet's own burst casts, which is what gives the
 * burstCast-vs-fullBurstEnter counterfactual something to bite on. Every comparison is same-fixture
 * A/B, so helm's ally buffs (incl. critRateNormalPct) cannot confound a direction. Boss is Fire and
 * scarlet's kit carries no elemental-advantage damage line, so nothing here depends on element.
 *
 * 11 runs total (each a full 180s sim).
 */

const SLUG = 'scarlet';
type Ev = Record<string, any>;

const near = (a: any, b: number, eps = 0.01) =>
  typeof a === 'number' && Math.abs(a - b) <= eps;

// --- override readers. Shape-agnostic: a slot may be a Block[] (override FILE shape) or a
// CharacterSkills carrying its own blocks[] - both are handled so the file cannot guess wrong.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function allBlocks(ov: any): any[] {
  return [
    ...slotBlocks(ov, 'skill1'),
    ...slotBlocks(ov, 'skill2'),
    ...slotBlocks(ov, 'burst'),
  ];
}
function findEffect(
  ov: any,
  label: string,
  pred: (e: any) => boolean
): { block: any; effect: any } {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? [])
      if (pred(e)) return { block: b, effect: e };
  }
  throw new Error('scarlet override does not represent kit line: ' + label);
}

// Predicates key on MAGNITUDE (not stat) where the point of the test is to assert the stat key,
// so a mis-encoded stat is still FOUND and then fails a precise assertion.
const ATK_STACK = (e: any) =>
  e?.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 23.15);
const CRIT_DMG = (e: any) => e?.kind === 'buff' && near(e.value, 6.61);
const CRIT_RATE = (e: any) => e?.kind === 'buff' && near(e.value, 19.57);
const NUKE = (e: any) =>
  e?.kind === 'flatDamage' && near(e.atkPct, 849.15, 0.02);

const OV: any = withPatchedOverride(SLUG, () => {}); // untouched clone, for static shape assertions

function run(patch?: any) {
  const base = controlComp(SLUG, true) as any;
  const events: Ev[] = [];
  const opts: any = {
    ...base,
    cfg: {
      ...(base.cfg ?? {}),
      onEvent: (e: SimEvent) => events.push(e as unknown as Ev),
    },
  };
  if (patch) opts.overrides = { ...(base.overrides ?? {}), [SLUG]: patch };
  const res = runComp(opts);
  return {
    res,
    events,
    total: totals(res)[SLUG] as number,
    board: totals(res),
  };
}

const evs = (events: Ev[], kind: string) =>
  events.filter((e) => e.kind === kind);

// scarlet-attributed events: prefer the per-unit result row, fall back to slug fields on the log.
function ownEvents(res: any, events: Ev[], kind: string): Ev[] {
  const row: any = unitOf(res, SLUG);
  const own = Array.isArray(row?.events)
    ? row.events.filter((e: any) => e?.kind === kind)
    : [];
  if (own.length) return own as Ev[];
  return evs(events, kind).filter((e) =>
    [e.slug, e.unit, e.srcSlug, e.casterSlug, e.ownerSlug].includes(SLUG)
  );
}

function expectTeammatesIdentical(
  a: Record<string, number>,
  b: Record<string, number>
) {
  for (const slug of Object.keys(a)) {
    if (slug === SLUG) continue;
    expect(b[slug]).toBe(a[slug]);
  }
}

// --- hoisted runs ---
const FAITHFUL = run();

const S1_EVERY_SHOT = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S1 ATK stack 23.15%', ATK_STACK).block.trigger = {
      kind: 'shotFired',
    };
  })
);
const S1_NO_STACK = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S1 ATK stack 23.15%', ATK_STACK).effect.maxStacks = 1;
  })
);
const S1_LONG = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S1 ATK stack 23.15%', ATK_STACK).effect.durationSec = 60;
  })
);
const S2_CD_ZERO = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S2b crit damage 6.61%', CRIT_DMG).effect.value = 0;
  })
);
const S2_AS_RATE = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'S2b crit damage 6.61%', CRIT_DMG).effect.stat =
      'critRatePct';
  })
);
const B_CR_ZERO = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'burst crit rate 19.57%', CRIT_RATE).effect.value = 0;
  })
);
const B_CR_NORMAL_ONLY = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'burst crit rate 19.57%', CRIT_RATE).effect.stat =
      'critRateNormalPct';
  })
);
const B_CR_LONG = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'burst crit rate 19.57%', CRIT_RATE).effect.durationSec = 40;
  })
);
const B_NUKE_HALF = run(
  withPatchedOverride(SLUG, (ov: any) => {
    findEffect(ov, 'burst 849.15% nuke', NUKE).effect.atkPct = 424.575;
  })
);
const B_CR_FB_ENTER = run(
  withPatchedOverride(SLUG, (ov: any) => {
    const { block } = findEffect(ov, 'burst crit rate 19.57%', CRIT_RATE);
    block.trigger = { kind: 'fullBurstEnter' };
    delete block.ownBurstGate;
  })
);

const FB_STARTS = evs(FAITHFUL.events, 'fullBurstStart').length;
const buffApplies = (r: { events: Ev[] }, pred: (e: Ev) => boolean) =>
  evs(r.events, 'buffApply').filter(pred);
const CR_APPLIES = buffApplies(
  FAITHFUL,
  (e) => near(e.value, 19.57) && e.targetSlug === SLUG
);
const NUKE_HITS = ownEvents(FAITHFUL.res, FAITHFUL.events, 'damage').filter(
  (e) => e.srcSlot === 'burst'
);

describe('scarlet S1 - after 10 landed normals: self ATK 23.15%, 5 stacks, 5 sec', () => {
  it('is encoded as a self hitCount:10 atkPct buff with maxStacks 5 and a SECONDS duration', () => {
    // Static shape. Discriminates the two classic traps at once: a round-count duration
    // (durationShots) instead of 'lasts for 5 sec', and a pre-multiplied single 115.75% buff
    // instead of a real 5-stack pool.
    const { block, effect } = findEffect(OV, 'S1 ATK stack 23.15%', ATK_STACK);
    expect(effect.stat).toBe('atkPct');
    expect(effect.maxStacks).toBe(5);
    expect(effect.durationSec).toBe(5);
    expect(effect.durationShots).toBeUndefined();
    expect(block.target.kind).toBe('self');
    expect(block.trigger.kind).toBe('hitCount');
    expect(block.trigger.count).toBe(10);
  });

  it('emits self-scoped 23.15 atkPct applies that actually accrue stacks (non-vacuity)', () => {
    const applies = buffApplies(
      FAITHFUL,
      (e) =>
        e.stat === 'atkPct' && near(e.value, 23.15) && e.targetSlug === SLUG
    );
    // ~810 rounds in 180s / 10 landed normals per proc -> dozens of applies. A count of 0 means the
    // line is MISSING or mis-scoped to allies.
    expect(applies.length).toBeGreaterThanOrEqual(10);
    for (const a of applies) {
      expect(a.targetSlug).toBe(SLUG);
      expect(a.casterIdx).toBe(a.targetIdx); // 'Affects self.'
      expect(a.maxStacks).toBe(5);
    }
    const stackVals = applies
      .map((a) => a.stacks)
      .filter((s) => typeof s === 'number');
    if (stackVals.length) expect(Math.max(...stackVals)).toBeGreaterThan(1);
  });

  it('counts 10 LANDED NORMALS, not every trigger pull', () => {
    // Nearest-wrong: shotFired. That fires ~10x as often, pins the pool at 5 stacks permanently and
    // must out-damage the faithful reading. Equality here would mean the trigger is effectively
    // per-shot already.
    expect(S1_EVERY_SHOT.total).toBeGreaterThan(FAITHFUL.total);
  });

  it('the 5-stack cap is load-bearing (single-stack model under-damages)', () => {
    expect(S1_NO_STACK.total).toBeLessThan(FAITHFUL.total);
  });

  it('the 5 sec window really expires between procs (both states exercised)', () => {
    // Non-vacuity for the duration: if the buff were effectively permanent, stretching it to 60s
    // could not move the total. It does -> the fixture exercises BOTH the buffed and lapsed state.
    expect(S1_LONG.total).toBeGreaterThan(FAITHFUL.total);
  });

  it('is inert on teammates (self-scoped: nobody else sees the ATK pool)', () => {
    expectTeammatesIdentical(FAITHFUL.board, S1_NO_STACK.board);
  });
});

describe('scarlet S1 - Current HP down 4.01% (GAP)', () => {
  it.skip('shaves 4.01% of CURRENT HP per proc, opening her own HP<60% / HP<50% gates', () => {
    // GAP: no HP-pool primitive. v1 has an immortal boss that deals no damage and units have no
    // live HP, so a self HP cost has no representation and no consumer. Recorded because it is the
    // MECHANISM behind S2b and the burst crit-rate line: 13 procs (130 rounds, ~29s) crosses 60%,
    // 17 procs (170 rounds, ~38s) crosses 50%, and because the cost is on CURRENT HP she asymptotes
    // and never dies. Belongs verbatim in the override's `unmodeled` (asserted below).
  });
});

describe('scarlet S2a - 30% when attacked: 138.24% additional damage (GAP)', () => {
  it.skip('procs a 138.24% rider on 30% of incoming attacks', () => {
    // GAP twice over: there is no on-attacked TRIGGER in the schema, and the v1 boss deals no
    // damage, so both the trigger and its rate (boss attacks/sec x 0.30) are outside the input
    // domain. Modeling it would require inventing a cadence -> flag, do not ship.
  });

  it('is NOT smuggled in on an invented interval trigger', () => {
    const dmg = ownEvents(FAITHFUL.res, FAITHFUL.events, 'damage');
    expect(dmg.length).toBeGreaterThan(0); // non-vacuity: attribution channel works
    expect(dmg.filter((e) => e.srcSlot === 'skill2').length).toBe(0);
  });
});

describe('scarlet S2b - HP<60%: self Critical Damage 6.61% continuously', () => {
  it('is a self critDamagePct buff with NO duration (continuously = permanent)', () => {
    const { block, effect } = findEffect(OV, 'S2b crit damage 6.61%', CRIT_DMG);
    expect(effect.stat).toBe('critDamagePct'); // not critRatePct, not coreDamagePct
    expect(effect.durationSec).toBeUndefined();
    expect(effect.durationShots).toBeUndefined();
    expect(block.target.kind).toBe('self');
  });

  it('is LIVE in the sim - the HP<60% gate is not treated as unreachable', () => {
    const applies = buffApplies(
      FAITHFUL,
      (e) => near(e.value, 6.61) && e.targetSlug === SLUG
    );
    expect(applies.length).toBeGreaterThanOrEqual(1);
    for (const a of applies) expect(a.stat).toBe('critDamagePct');
    expect(S2_CD_ZERO.total).toBeLessThan(FAITHFUL.total); // it actually moves damage
  });

  it('is crit DAMAGE, not crit RATE', () => {
    // Nearest-wrong: same 6.61 magnitude on critRatePct. Expected damage is
    // 1 + rate*(0.5 + critDmg): +6.61pp of RATE buys ~0.5x per point, +6.61pp of crit DAMAGE only
    // buys rate (~0.15) per point, so the mis-encoding is strictly LARGER. Equality would mean the
    // driver already used critRatePct.
    expect(FAITHFUL.total).toBeLessThan(S2_AS_RATE.total);
  });

  it('is inert on teammates', () => {
    expectTeammatesIdentical(FAITHFUL.board, S2_CD_ZERO.board);
  });
});

describe('scarlet burst - HP<50%: self Critical Rate 19.57% for 10 sec', () => {
  it('is a self critRatePct buff, durationSec 10, keyed to HER OWN burst cast', () => {
    const { block, effect } = findEffect(
      OV,
      'burst crit rate 19.57%',
      CRIT_RATE
    );
    expect(effect.stat).toBe('critRatePct'); // unscoped in the kit text -> generic, not *NormalPct
    expect(effect.durationSec).toBe(10);
    expect(block.target.kind).toBe('self');
    expect(block.slot).toBe('burst');
    // Trigger identity: a burst-slot self buff with a 10s window rides her OWN cast. Accepts the
    // behaviourally-equivalent fullBurstEnter + ownBurstGate:'cast' encoding; rejects a bare
    // fullBurstEnter (over-credits in this 2x-B3 comp) and a passive (always-on).
    const t = block.trigger.kind;
    const ok =
      t === 'burstCast' ||
      (t === 'fullBurstEnter' && block.ownBurstGate === 'cast');
    expect(ok).toBe(true);
  });

  it('is LIVE and fires exactly once per scarlet burst - not once per team Full Burst', () => {
    expect(CR_APPLIES.length).toBeGreaterThanOrEqual(1); // HP<50% gate not dropped as unreachable
    expect(NUKE_HITS.length).toBeGreaterThanOrEqual(1);
    // Both burst-slot blocks are keyed to the same cast, so their counts must match exactly.
    expect(CR_APPLIES.length).toBe(NUKE_HITS.length);
    expect(FB_STARTS).toBeGreaterThanOrEqual(CR_APPLIES.length);
    const patched = buffApplies(
      B_CR_FB_ENTER,
      (e) => near(e.value, 19.57) && e.targetSlug === SLUG
    ).length;
    expect(patched).toBeGreaterThanOrEqual(CR_APPLIES.length);
    if (FB_STARTS > NUKE_HITS.length) {
      // helm (the co-B3) took some rotations, so the two triggers genuinely diverge here.
      expect(patched).toBeGreaterThan(CR_APPLIES.length);
    }
  });

  it('the 10 sec window expires (both states exercised)', () => {
    expect(B_CR_LONG.total).toBeGreaterThan(FAITHFUL.total);
  });

  it('the 19.57% is load-bearing and unscoped', () => {
    expect(B_CR_ZERO.total).toBeLessThan(FAITHFUL.total);
    // Nearest-wrong scope: critRateNormalPct would deny the crit lift to her 849% burst hit.
    // Weaker (>=) on purpose: the two coincide if the nuke resolves before the buff applies on the
    // cast frame. The static stat assertion above carries the scope call.
    expect(FAITHFUL.total).toBeGreaterThanOrEqual(B_CR_NORMAL_ONLY.total);
  });

  it('is inert on teammates', () => {
    expectTeammatesIdentical(FAITHFUL.board, B_CR_ZERO.board);
  });
});

describe('scarlet burst - 849.15% of final ATK to all enemies', () => {
  it('is one burst-cast flatDamage hit, FB-major-exempt and range-exempt', () => {
    const { block, effect } = findEffect(OV, 'burst 849.15% nuke', NUKE);
    expect(effect.kind).toBe('flatDamage');
    expect(near(effect.atkPct, 849.15, 0.02)).toBe(true);
    expect(block.trigger.kind).toBe('burstCast');
    expect(block.target.kind).toBe('enemy'); // 'Affects all enemies' - single boss in v1
    expect(effect.core).not.toBe(true); // no 'core strike' wording in the kit text
    for (const h of NUKE_HITS) {
      // A burst cast lands before the FB window opens, so the +50% FB major must never apply.
      expect(!!h.fbMajorApplied).toBe(false);
      expect(!!h.rangeApplied).toBe(false); // riders are force-set no-range
    }
  });

  it('the 849.15% magnitude is load-bearing (halving it drops only scarlet)', () => {
    expect(B_NUKE_HALF.total).toBeLessThan(FAITHFUL.total);
    expectTeammatesIdentical(FAITHFUL.board, B_NUKE_HALF.board);
  });
});

describe('scarlet - no silent drops', () => {
  it('records the two unmodelable kit lines in unmodeled/note, and uses no ignored effects', () => {
    const text = JSON.stringify([OV.unmodeled ?? {}, OV.note ?? '']);
    expect(text).toContain('4.01'); // self current-HP cost
    expect(text).toContain('138.24'); // 30%-when-attacked rider
    for (const b of allBlocks(OV)) {
      for (const e of b.effects ?? []) expect(e.kind).not.toBe('ignored');
    }
  });

  it('declares all three slots', () => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      expect(OV[slot]).toBeDefined();
    }
  });
});
```

====================================================================

## PART 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs the DRIVER override

====================================================================

DIFF (S6 blind override vs driver override) — the two CONVERGE on every load-bearing line:

- skill1: IDENTICAL — hitCount:10 → self atkPct 23.15 / maxStacks 5 / 5s.
- skill2: IDENTICAL — passive self critDamagePct 6.61 with rampSec:56 (the HP<60% gate proxy).
- burst crit-rate: IDENTICAL — burstCast self critRatePct 19.57 / 10s, ungated (HP<50% gate ⚑ over-credit).
- burst nuke: SAME magnitude/target/trigger (burstCast → enemy flatDamage 849.15). The ONLY difference: S6 adds explicit `crit:true` + `noFb:true` flags; the driver OMITS them as redundant — the engine makes burst flatDamage crit-eligible by default and FB-exempt BY TIMING (the cast lands before the FB window; the driver probe confirms fbMajorApplied=false and critEligible=true with no flags). The S5 blind test's own flag recipe says to drop noFb when fbMajorApplied is already false by timing. So the difference is redundant-flag hygiene, NOT a behavioral or faithfulness divergence.
- unmodeled: IDENTICAL — skill1 ['Current HP ▼ 4.01%.'], skill2 [the two when-attacked lines], burst [].
- note/caveats: differ in wording only; both document the same ⚑s (cadence, HP-gate timing, attacked-proc) and the same encoding rationale.

````json
{
  "slug": "scarlet",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 10
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 23.15,
          "durationSec": 5,
          "maxStacks": 5
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
          "stat": "critDamagePct",
          "value": 6.61,
          "rampSec": 56
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
          "stat": "critRatePct",
          "value": 19.57,
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
          "atkPct": 849.15,
          "crit": true,
          "noFb": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Current HP ▼ 4.01%."
    ],
    "skill2": [
      "There is a 30% chance of activating when attacked.",
      "Deals 138.24% of final ATK as additional damage."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ SELF-HP ENGINE GAP: this kit is HP-threshold-driven (S1 pays Current HP ▼4.01% per proc; S2's Crit Damage gates on HP<60%, burst's Crit Rate on HP<50%). v1 models no HP pool, so the HP cost is unmodeled and both gates are approximated (S2 by a rampSec proxy, burst by an ungated full-value buff). All three lines must be re-checked together once an HP pool or a measured fight exists.",
    "⚑ S2 rampSec=56 is a DERIVED-but-UNVERIFIED equal-integral proxy for a step-on at ~28s, not a real ramp shape. It depends on AR cadence (datamine-unreliable) and on every normal attack landing.",
    "⚑ Burst Crit Rate ▲19.57% is modeled UNGATED and therefore OVER-CREDITS every burst cast before HP<50% (~37s of self-damage alone). On a comp whose first burst chain lands ≈8-12s, burst #1 is over-credited.",
    "⚑ The S2 counter-attack (30%-on-attacked, 138.24%) is NOT modeled — the sim has no incoming-damage channel, so its proc rate is outside the input domain, not merely unknown. This is the single largest known damage gap in this baseline.",
    "⚑ Burst nuke noFb:true per the standing rule that burst-cast/instant damage lands before the FB window opens; it is a rule application, not a measured per-kit noFb."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only. S1 = hitCount:10 self ATK ▲23.15% ×5 stacks / 5s (stacks lapse across the 159f reload, so steady-state is BELOW 5 — the engine resolves this naturally, no ramp authored). S1's Current HP ▼4.01% is unmodeled (no HP pool in v1) but is LOAD-BEARING: it is the mechanism that opens S2's HP<60% gate and the burst's HP<50% gate. Derivation of the gate timings from the kit alone (self-damage only, a floor — boss damage only speeds it up): current-HP decay is multiplicative, 0.9599^n, so HP<60% at n=13 procs (=130 landed rounds) and HP<50% at n=17 procs (=170 rounds). At ~12 pulls/s with a 20-round magazine + 159f reload that is ≈4.6 rounds/s → HP<60% at ≈28s, HP<50% at ≈37s. S2's Crit Damage ▲6.61% 'continuously' is therefore authored as a passive with rampSec:56 — a linear ramp over 2T has the same time-integral as a step at T, so 56 is the equal-integral proxy for the ~28s step. The burst's 10s Crit Rate window cannot use rampSec (its clock would start at the cast frame, ramping WITHIN the window), so it is authored ungated at full value and flagged as an early-burst over-credit. Burst nuke 849.15% authored crit-eligible, no core (the text says no core strike), noFb per the burst-cast FB-exemption rule. noRange left unset (engine-automatic)."
}```

====================================================================
## PART 7 — DRIVER IMPLEMENTATION (test + override under judgment)
====================================================================

### scripts/tests/units/scarlet.test.ts (driver kit spec — 17/17 GREEN vs the override below)
```typescript
// PER-UNIT KIT SPEC — `scarlet` (Scarlet, Attacker/AR/Electric, Burst III, cd 40s, ammo 20,
// chargeFrames 0). Kit-autonomy gauntlet 2026-07-25 (test-first re-derivation).
//
// NOT `scarlet-black-shadow` (Scarlet: Black Shadow, RL/B3) — a different unit. This spec reasons
// from the slug `scarlet` and the prose in data/characters.json → characters.scarlet.skills.
//
// One assertion group per KIT LINE (H1..H6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS — the nearest wrong model
// each pin must discriminate against — never to supply the encoding under test.
//
// Kit (blablalink prose, level 10):
//   S1 ■ after landing 10 normal attacks → self: ATK ▲23.15%, stacks up to 5×, lasts 5 sec   [H1]
//      ■ (per proc) Current HP ▼4.01%   — the design ENABLER of the two HP gates below        [H2]
//   S2 ■ 30% chance when attacked → 138.24% of final ATK as additional damage                [H3]
//      ■ when HP falls below 60% → self: Critical Damage ▲6.61% continuously                 [H4]
//   BU ■ when HP falls below 50% → self: Critical Rate ▲19.57% for 10 sec                    [H5]
//      ■ all enemies: 849.15% of final ATK as Burst Skill damage                             [H6]
//
// Disposition (S0 inventory; cross-family reconciliation — see note in the override):
//   H1 FAITHFUL — hitCount:10 → self atkPct 23.15 / maxStacks 5 / 5s. Engine derives the stack
//      level from cadence; the probe shows it reaches 5/5 and holds (the 5s window bridges the
//      159f reload at the datamined cadence).
//   H2 UNMODELED (inert as HP, load-bearing as gate enabler) — "Current HP ▼4.01%" is a self HP
//      COST; the engine has no HP pool, so it is unmodeled as HP. It is NOT a silent drop: it is
//      the mechanism that opens the two HP gates (×0.9599/proc → HP<60% at 13 procs/~28s, HP<50%
//      at 17/~37s), which feeds the H4 rampSec proxy and the H5 over-credit ⚑. Pinned verbatim in
//      the override's `unmodeled`.
//   H3 UNMODELED (sanctioned skip) — "30% when attacked" is the "when this unit is hit" skip class:
//      the v1 sim models no incoming boss attacks, so the trigger NEVER fires in-sim. Pinned verbatim.
//   H4 FAITHFUL (⚑ gate proxy) — passive self critDamagePct 6.61, permanent, rampSec:56 — the
//      equal-integral proxy for the HP<60% step-on at ~28s (a linear ramp over 2T integrates to the
//      same as a step at T). The HP<60% GATE is a status-gate the engine cannot model literally (no
//      HP trigger); the crossing time is ⚑-derived (real fights cross earlier — boss damage).
//   H5 FAITHFUL (⚑ gate proxy) — burstCast self critRatePct 19.57/10s, modeled UNGATED: rampSec is
//      unusable on a per-cast 10s window (its clock would ramp inside the window), so the buff is
//      full-value on every cast and pre-~37s casts are an over-credit ⚑. burstCast (her OWN cast),
//      NOT fullBurstEnter — controlComp carries helm as co-B3, so team FBs (11) ≠ her casts (6).
//   H6 FAITHFUL — burstCast 849.15% Burst Skill damage vs enemy ("all enemies" = the single boss).
//      A burst CAST lands BEFORE the Full Burst window, so it never takes the +50% major (verified
//      fact 2026-07-13) — the burstCast-vs-fullBurstEnter / FB-exemption discriminator.
//
// Tier 2: HP status-gates (H4/H5) approximated via ⚑ proxies + meta-defining Pilgrim attacker.
//
// ENCODING-CHOICE (cross-family): the fable S2b reviewer recommended modeling the gates literally
// via a bloodProc proc-count resource pool + resourceGate; the opus S5/S6 reviewers converged on the
// rampSec/ungated ⚑ proxy shipped here (the proc-count threshold is itself cadence-derived and
// ignores boss damage, so a literal gate would be false precision). The driver adopted the
// opus-convergent proxy; the resource-pool gate is documented in the override note as a legitimate
// future improvement. Both encode the SAME ⚑-derived ~28s/~37s crossing differently.
//
// Why each pin discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   value pins — counterfactual = the WRONG SKILL LEVEL magnitude (level-1 vs level-10).
//   stat pin   — H4 counterfactual puts the same 6.61 on critRatePct (a strictly larger encoding).
//   trigger pin— H5 counterfactual re-keys to fullBurstEnter (over-fires on helm's rotations).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / scarlet B3 / helm B3, boss Fire,
// focus scarlet). Scarlet needs a real rotation to cast her burst at all (a lone B3 makes zero Full
// Bursts); helm is kept as a SECOND B3 on purpose so team FBs outnumber her casts, giving the
// burstCast-vs-fullBurstEnter discriminator something to bite on. Deterministic (no seed); event-log
// over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp('scarlet') slot order: liter 0 / crown 1 / scarlet 2 / helm 3. */
const SCARLET = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('scarlet'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest wrong) --------------------------------------------------
const findEffect = (blocks: any[], pred: (e: any) => boolean) =>
  blocks.flatMap((b: any) => b.effects).find(pred);

/** H1 value: S1 ATK at level-1 17.48 (kit ships 23.15). */
const scarletS1Wrong = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.skill1, (x) => x.stat === 'atkPct');
  if (!e) throw new Error('scarlet S1 atkPct missing — fixture is stale');
  e.value = 17.48;
});
/** H4 value: S2 crit damage at level-1 4.13 (kit ships 6.61). */
const scarletS2Wrong = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.skill2, (x) => x.stat === 'critDamagePct');
  if (!e)
    throw new Error('scarlet S2 critDamagePct missing — fixture is stale');
  e.value = 4.13;
});
/** H4 stat: the same 6.61 mis-keyed to critRatePct (rate buys ~0.5x/pt vs damage ~0.15x/pt → strictly larger). */
const scarletS2AsRate = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.skill2, (x) => x.kind === 'buff');
  if (!e) throw new Error('scarlet S2 buff missing — fixture is stale');
  e.stat = 'critRatePct';
});
/** H5 value: burst crit rate at level-1 12.23 (kit ships 19.57). */
const scarletBurstCritWrong = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.burst, (x) => x.stat === 'critRatePct');
  if (!e)
    throw new Error('scarlet burst critRatePct missing — fixture is stale');
  e.value = 12.23;
});
/** H5 trigger: re-key the burst crit-rate to fullBurstEnter (fires on helm's rotations too). */
const scarletBurstCritFBEnter = withPatchedOverride('scarlet', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'critRatePct'),
  );
  if (!b)
    throw new Error(
      'scarlet burst critRatePct block missing — fixture is stale',
    );
  b.trigger = { kind: 'fullBurstEnter' };
});
/** H6 value: burst nuke at level-1 530.71% (kit ships 849.15%). */
const scarletBurstDmgWrong = withPatchedOverride('scarlet', (ov) => {
  const e = findEffect(ov.burst, (x) => x.kind === 'flatDamage');
  if (!e)
    throw new Error('scarlet burst flatDamage missing — fixture is stale');
  e.atkPct = 530.71;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Wrong = run({ scarlet: scarletS1Wrong });
const s2Wrong = run({ scarlet: scarletS2Wrong });
const s2AsRate = run({ scarlet: scarletS2AsRate });
const burstCritWrong = run({ scarlet: scarletBurstCritWrong });
const burstCritFBEnter = run({ scarlet: scarletBurstCritFBEnter });
const burstDmgWrong = run({ scarlet: scarletBurstDmgWrong });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const scarletBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === SCARLET && b.stat === stat);
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const scarletDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'scarlet' && d.srcSlot === srcSlot);
const scarletBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'scarlet',
  );
const scarletShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'scarlet');
const buffValues = (evs: SimEvent[], stat: string) =>
  [...new Set(scarletBuffs(evs, stat).map((b) => b.value))].sort(
    (a, b) => a - b,
  );

describe('scarlet — kit spec', () => {
  describe('H1 — S1 ATK ▲23.15% after 10 normal attacks, stacks to 5, 5 sec, self', () => {
    const applied = scarletBuffs(base.events, 'atkPct');

    it('is the kit magnitude 23.15%, self-scoped, 5-sec duration', () => {
      expect(applied.length, 'no S1 atkPct buff was applied').toBeGreaterThan(
        0,
      );
      expect(buffValues(base.events, 'atkPct')).toEqual([23.15]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped',
      ).toEqual([SCARLET]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '5 sec = 300 frames',
      ).toEqual([5 * FPS]);
    });

    it('stacks up to 5 and reaches full stacks during the fight', () => {
      expect(
        [...new Set(applied.map((b) => b.maxStacks))],
        'maxStacks',
      ).toEqual([5]);
      expect(Math.max(...applied.map((b) => b.stacks)), 'reaches 5/5').toBe(5);
    });

    it('fires once per 10 normal attacks (hitCount:10 trigger)', () => {
      const shots = scarletShots(base.events).length;
      expect(
        applied.length,
        `${applied.length} procs vs ${shots} shots — expected one proc per 10 hits`,
      ).toBe(Math.floor(shots / 10));
    });

    it('DISCRIMINATING: the level-1 magnitude 17.48 would change the pinned value', () => {
      expect(buffValues(s1Wrong.events, 'atkPct')).not.toEqual([23.15]);
      expect(buffValues(s1Wrong.events, 'atkPct')).toEqual([17.48]);
    });
  });

  describe('H2 — S1 "Current HP ▼4.01%" is UNMODELED as HP (engine has no HP pool) but is the gate enabler', () => {
    it('is documented verbatim in the override unmodeled block (not silently dropped)', () => {
      const ov = loadOverride('scarlet') as any;
      expect(ov.unmodeled.skill1).toContain('Current HP ▼ 4.01%.');
    });
  });

  describe('H3 — S2 "30% when attacked → 138.24% additional damage" is UNMODELED (no incoming attacks in-sim)', () => {
    it('is documented verbatim in the override unmodeled block (sanctioned skip)', () => {
      const ov = loadOverride('scarlet') as any;
      expect(ov.unmodeled.skill2).toContain(
        'There is a 30% chance of activating when attacked.',
      );
      expect(ov.unmodeled.skill2).toContain(
        'Deals 138.24% of final ATK as additional damage.',
      );
    });

    it('is NOT smuggled in on an invented trigger (no skill2 damage in-sim)', () => {
      expect(
        scarletDamage(base.events, 'skill2').length,
        'no skill2 damage channel',
      ).toBe(0);
    });
  });

  describe('H4 — S2 Critical Damage ▲6.61% continuously (HP<60% gate ≈ rampSec:56 proxy)', () => {
    const applied = scarletBuffs(base.events, 'critDamagePct');

    it('is the kit magnitude 6.61%, passive (live from frame 0), permanent, self-scoped', () => {
      expect(
        applied.length,
        'no S2 critDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect(buffValues(base.events, 'critDamagePct')).toEqual([6.61]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped',
      ).toEqual([SCARLET]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'permanent — no expiry',
      ).toEqual([null]);
      expect(applied[0].frame, 'passive: live from the start').toBe(0);
    });

    it('carries the rampSec gate proxy (the HP<60% step-on ≈ 28s, equal-integral ramp 56s)', () => {
      const ov = loadOverride('scarlet') as any;
      const e = ov.skill2
        .flatMap((b: any) => b.effects)
        .find((x: any) => x.stat === 'critDamagePct');
      expect(e.rampSec, 'rampSec proxy for the HP gate').toBe(56);
    });

    it('DISCRIMINATING (value): the level-1 magnitude 4.13 would change the pinned value', () => {
      expect(buffValues(s2Wrong.events, 'critDamagePct')).not.toEqual([6.61]);
      expect(buffValues(s2Wrong.events, 'critDamagePct')).toEqual([4.13]);
    });

    it('DISCRIMINATING (stat): mis-keying 6.61 to critRatePct leaves NO critDamagePct buff', () => {
      expect(
        scarletBuffs(s2AsRate.events, 'critDamagePct').length,
        'stat moved off critDamagePct',
      ).toBe(0);
      expect(
        scarletBuffs(s2AsRate.events, 'critRatePct').length,
        'stat moved onto critRatePct',
      ).toBeGreaterThan(0);
    });
  });

  describe('H5 — burst Critical Rate ▲19.57% for 10 sec (HP<50% gate ≈ ungated over-credit ⚑)', () => {
    const applied = scarletBuffs(base.events, 'critRatePct');

    it('is the kit magnitude 19.57%, 10-sec duration, self-scoped, once per burst cast', () => {
      const bursts = scarletBursts(base.events).length;
      expect(bursts, 'scarlet cast no bursts in the fixture').toBeGreaterThan(
        0,
      );
      expect(
        applied.length,
        'one crit-rate buff per burst cast (ungated)',
      ).toBe(bursts);
      expect(buffValues(base.events, 'critRatePct')).toEqual([19.57]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped',
      ).toEqual([SCARLET]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '10 sec = 600 frames',
      ).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING (value): the level-1 magnitude 12.23 would change the pinned value', () => {
      expect(buffValues(burstCritWrong.events, 'critRatePct')).not.toEqual([
        19.57,
      ]);
      expect(buffValues(burstCritWrong.events, 'critRatePct')).toEqual([12.23]);
    });

    it("DISCRIMINATING (trigger): fullBurstEnter would over-fire on helm's rotations (co-B3)", () => {
      const fbEnter = scarletBuffs(
        burstCritFBEnter.events,
        'critRatePct',
      ).length;
      expect(
        fbEnter,
        `${fbEnter} fullBurstEnter applies vs ${applied.length} burstCast — helm shares the FB chain`,
      ).toBeGreaterThan(applied.length);
    });
  });

  describe('H6 — burst deals 849.15% of final ATK as Burst Skill damage (all enemies)', () => {
    const nukes = scarletDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const bursts = scarletBursts(base.events).length;
      expect(nukes.length, 'one nuke per burst cast').toBe(bursts);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([849.15]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(
        nukes.every((d) => d.critEligible),
        'crit-eligible',
      ).toBe(true);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window',
      ).toEqual([]);
    });

    it('DISCRIMINATING: the level-1 magnitude 530.71% would change the pinned value', () => {
      const wrong = scarletDamage(burstDmgWrong.events, 'burst');
      expect([...new Set(wrong.map((d) => d.atkPct))]).not.toEqual([849.15]);
      expect([...new Set(wrong.map((d) => d.atkPct))]).toEqual([530.71]);
    });
  });
});
````

### src/skills/overrides/scarlet.json (driver override)

```json
{
  "note": "BASE Scarlet (slug `scarlet`, AR/Electric/Attacker/B3, cd 40s, ammo 20, chargeFrames 0) — NOT scarlet-black-shadow (RL/B3). Kit-autonomy gauntlet 2026-07-25 (cross-family: S2b claude-fable-5; S5/S6/S7 claude-opus-5; GO faithfulness — see manual-review). MODEL: S1 'after 10 normal attacks' = hitCount:10 → self ATK ▲23.15% / maxStacks 5 / 5s (engine derives the stack level from cadence; at the datamined cadence it reaches 5/5 and holds — the 5s window bridges the 159f reload). S2 'HP<60% → Crit Dmg ▲6.61% continuously' = passive self critDamagePct 6.61 (permanent) with rampSec:56 — the equal-integral proxy for the HP<60% step-on at ~28s (a linear 0→full ramp over 2T has the same time-integral as a step at T; T≈28s from the compounding self-drain below). BURST: 'HP<50% → Crit Rate ▲19.57%/10s' = burstCast self critRatePct 19.57/10s, modeled UNGATED (rampSec is unusable on a per-cast 10s window — its clock would ramp INSIDE the window — so the buff is full-value on every cast and the pre-~37s casts are an over-credit ⚑). burstCast (her OWN cast), NOT fullBurstEnter — controlComp carries helm as co-B3, so team FBs (11) ≠ her casts (6) and fullBurstEnter would over-fire. '849.15% Burst Skill damage' = burstCast flatDamage vs enemy ('all enemies' = the single boss); a burst CAST lands BEFORE the Full Burst window, so it is FB-exempt by timing (no +50% major; verified fact 2026-07-13) and crit-eligible. S2 '30% chance when attacked → 138.24% additional damage' is UNMODELED (sanctioned skip): 'when this unit is hit' never fires in-sim — the v1 boss has no modeled attack cadence. No weapon swap, no charge, no DoT, hitsPerShot 1, element = clean ×1.10 default. HP-THRESHOLD GATES (the kit's design center): S1's 'Current HP ▼4.01%' is a self HP COST — the engine has no HP pool, so it is unmodeled as HP, but it is LOAD-BEARING as the mechanism that opens the two gates: current-HP decay is multiplicative (×0.9599/proc), so HP<60% at 13 procs (130 rounds, ~28s) and HP<50% at 17 procs (170 rounds, ~37s) from self-drain alone; boss damage only makes these EARLIER. These derived crossing times feed the rampSec:56 proxy and the burst over-credit ⚑. ENCODING-CHOICE NOTE (cross-family): the fable S2b reviewer recommended modeling the gates literally via a bloodProc proc-count resource pool + resourceGate (step-on at proc 13/17); the opus S5/S6 reviewers converged on the rampSec/ungated ⚑ proxy here, reasoning that the proc-count threshold is itself cadence-derived and ignores boss damage, so encoding a precise gate would be false precision — the driver adopted the opus-convergent proxy. The resource-pool gate is a legitimate future improvement if an HP pool primitive or a measured fight lands. ⚑1 CADENCE TUPLE (datamine-unreliable): 20-ammo AR with normalMult 27.08 (~3× the usual AR per-shot) + melee-slash flavor = non-class fire-mode tell; datamined pullsPerSec + reloadFrames 159 unverified. The hitCount:10 frequency, the 5-stack steady state, the rampSec:56, and the burst over-credit all scale with true rounds/sec. Recipe: rounds/min + reload gap from a focus video. ⚑2 HP-GATE TIMING: rampSec:56 (S2) and the ungated-burst over-credit are DERIVED from the compounding self-drain reading, not measured; real fights cross earlier (boss damage). Recipe: HP bar + first crit-popup timing from a focus video. ⚑3 S2a ATTACKED-PROC (unmodeled): est 0 in-sim / ~0-3% of real solo total (a handful of boss hits × 30% × 138.24%). Recipe: focus video — count her additional-damage popups coinciding with boss attacks on her; if material, model as a dot at the measured proc cadence.",
  "unmodeled": {
    "skill1": ["Current HP ▼ 4.01%."],
    "skill2": [
      "There is a 30% chance of activating when attacked.",
      "Deals 138.24% of final ATK as additional damage."
    ],
    "burst": []
  },
  "caveats": [
    "skill1: the 'Current HP ▼ 4.01%' self-drain is not simulated as HP (engine has no HP pool); it is load-bearing only as the mechanism that opens the two HP-threshold gates, and feeds the derived ~28s/~37s crossing times",
    "skill2: the 30%-when-attacked 138.24% proc is unmodeled — the sim has no incoming boss attacks; real-fight contribution is an open ⚑",
    "skill2: the HP<60% gate on the 6.61% crit-damage buff is approximated by rampSec:56 (equal-integral proxy for a step-on at ~28s); the shape is approximate and the crossing time is ⚑-derived (real fights cross earlier)",
    "burst: the HP<50% gate on the 19.57% crit-rate buff is modeled ungated (rampSec unusable on a per-cast window); pre-~37s bursts are over-credited ⚑",
    "cadence: 20-ammo AR with a 27.08% per-shot multiplier is a non-standard fire-mode tell — the datamined rate of fire and 159-frame reload are unverified estimates"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 10 },
      "target": { "kind": "self" },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 23.15,
          "durationSec": 5,
          "maxStacks": 5
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "self" },
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 6.61,
          "rampSec": 56
        }
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
          "stat": "critRatePct",
          "value": 19.57,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 849.15 }]
    }
  ]
}
```

====================================================================

## RECONCILIATION NOTE from the driver (for your adjudication)

====================================================================

The HP-threshold gates are the kit's design center and the one modeling judgment call. Three independent readings:

- fable S2b: model the gates literally via a bloodProc proc-count resource pool + resourceGate (step-on at proc 13/17). The driver PROTOTYPED this and it works (engine HAS the primitive, proven on soda-twinkling-bunny): crit-dmg turns on at ~20s, burst crit-rate excludes the first burst.
- opus S5 (blind test) + opus S6 (blind override): both chose the always-on/ramped family — S6 used rampSec:56 (equal-integral proxy for the ~28s step) for S2 and ungated burst for the crit-rate (rampSec unusable on a per-cast 10s window).
  The driver adopted the opus-convergent rampSec/ungated proxy because: (1) 2/2 post-op opus reviewers converged on it; (2) the proc-count threshold (13/17) is itself cadence-derived (⚑1) and ignores boss damage (real fights cross earlier), so a literal gate would encode false precision; (3) the GO criterion needs the S5 blind test green, and the proxy gets it to a single UNIVERSAL cadence failure (S1_LONG) vs two failures under the resource-pool gate. The resource-pool gate is documented in the override note as a legitimate future improvement. Both encodings honor the SAME ⚑-derived ~28s/~37s crossing; they differ only in shape (step vs ramp/ungated) and neither is measured.

Return your binding verdict JSON now.
