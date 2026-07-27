# S7 RECONCILING JUDGE — ein (Ein, SR/Attacker/Electric/Burst III)

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

## MECHANICS SSOT

### damage-calculation.md (full)

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

### game-mechanics.md (full)

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

## GROUND TRUTH — ein kit prose + base stats (data/characters.json → characters.ein)

````json
{
  "slug": "ein",
  "name": "Ein",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/ts-44/zw-75/239d6d216ea2ca318041a2c114ac7700.png",
  "weapon": "SR",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Electric",
  "manufacturer": "Missilis",
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "rl3": 14,
  "burstGaugePerShot": 2.8,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects self.\nSummons 4 Near Feathers.\n■ Activates when entering Burst Skill Stage 3. Affects self.\nATK ▲ 70.12% for 10 sec.",
    "skill2": "■ Activates when Near Feather is summoned. Affects 1 random enemy unit(s).\nNear Feather Attack: Deals 90.81% of final ATK as true damage.\n■ Activates when attacking with Full Charge. Affects self.\nCharge Damage ▲ 80% for 1 shot(s).",
    "burst": "■ Affects self.\nSummons 6 Near Feathers.\nTrue Damage ▲ 55.3% for 10 sec.\nCharge Damage ▲ 140.68% for 10 sec.\n■ Affects 10 enemy unit(s) with the highest final DEF.\nDeals 300.02% of final ATK as true damage."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1039101,
      "shot_detail": {
        "id": 1039101,
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
      "skill1_id": 2391101,
      "skill2_id": 2391201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2391101,
        "icon": "icn_skill_atkup_01",
        "group_id": 23911,
        "skill_level": 1,
        "name_localkey": "Feather Standby",
        "next_level_id": 2391102,
        "level_up_cost_id": 40102,
        "description_localkey": "■ Activates at the start of battle. Affects self.\n<color=#00AEFF>Summons 4 <word_group=10053>Near Feathers</word_group>.</color>\n■ Activates when entering Burst Skill Stage 3. Affects self.\n<color=#00AEFF>ATK ▲ {description_value_01}% for {description_value_02} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "41.18",
              "44.4",
              "47.61",
              "50.83",
              "54.04",
              "57.26",
              "60.48",
              "63.69",
              "66.91",
              "70.12"
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
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2391201,
        "icon": "icn_skill_damage_01",
        "group_id": 23912,
        "skill_level": 1,
        "name_localkey": "Feather Shot",
        "next_level_id": 2391202,
        "level_up_cost_id": 40202,
        "description_localkey": "■ Activates when <word_group=10053>Near Feather</word_group> is summoned. Affects {description_value_01} random enemy unit(s).\n<color=#00AEFF><word_group=10053>Near Feather</word_group> Attack: Deals {description_value_02}% of <word_group=10025>final</word_group> ATK as true damage.</color>\n■ Activates when attacking with Full Charge. Affects self.\n<color=#00AEFF>Charge Damage ▲ {description_value_03}% for {description_value_04} shot(s).</color>",
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
              "59.01",
              "62.54",
              "66.08",
              "69.61",
              "73.15",
              "76.68",
              "80.21",
              "83.75",
              "87.28",
              "90.81"
            ]
          },
          {
            "description_value": [
              "47.27",
              "50.91",
              "54.54",
              "58.18",
              "61.82",
              "65.45",
              "69.09",
              "72.73",
              "76.36",
              "80"
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
      "ulti_skill_id": 1391301,
      "ulti_skill_detail": {
        "id": 1391301,
        "icon": "icn_skill_c391_ult",
        "group_id": 13913,
        "shake_id": 1,
        "skill_type": "InstantNumber",
        "attack_type": "Electronic",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Feather All-Range",
        "next_level_id": 1391302,
        "prefer_target": "HighDefence",
        "resource_name": "c391_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 40302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 10,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 5,
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
        "description_localkey": "■ Affects self.\n<color=#00AEFF>Summons 6 <word_group=10053>Near Feathers</word_group>.</color>\n<color=#00AEFF>True Damage ▲ {description_value_01}% for {description_value_02} sec.</color>\n<color=#00AEFF>Charge Damage ▲ {description_value_03}% for {description_value_04} sec.</color>\n■ Affects {description_value_05} enemy unit(s) with the highest <word_group=10025>final</word_group> DEF.\n<color=#00AEFF>Deals {description_value_06}% of <word_group=10025>final</word_group> ATK as true damage.</color>",
        "description_value_list": [
          {
            "description_value": [
              "31.2",
              "33.87",
              "36.55",
              "39.23",
              "41.91",
              "44.59",
              "47.27",
              "49.94",
              "52.62",
              "55.3"
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
              "82.36",
              "88.84",
              "95.32",
              "101.8",
              "108.28",
              "114.76",
              "121.24",
              "127.72",
              "134.2",
              "140.68"
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
              "170.32",
              "184.73",
              "199.14",
              "213.55",
              "227.96",
              "242.38",
              "256.79",
              "271.2",
              "285.61",
              "300.02"
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
          0
        ],
        "after_hurt_function_id_list": [
          139130101
        ],
        "before_use_function_id_list": [
          139110101,
          139110102,
          139110103,
          139110104,
          139110105,
          139110106,
          139130103,
          139130102
        ],
        "before_hurt_function_id_list": [
          0
        ]
      }
    },
    "statScaling": {
      "grow_grade": 139102,
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
      "piece_id": 5100391,
      "piece_detail": {
        "id": 5100391,
        "class": "Attacker",
        "order": 39100,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "MISSILIS",
        "resource_id": 391,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Ein's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 139101,
      "class": "Attacker",
      "order": 10077,
      "name_code": 5077,
      "corporation": "MISSILIS",
      "resource_id": 391,
      "name_localkey": "Ein",
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
    "resourceId": 391
  }
}```

## S2b REVIEW (claude-fable-5)
```json
{
  "slug": "ein",
  "leakDetected": "Redacted methodology itself is clean (no ein slug/magnitudes). However the provided EFFECT SCHEMA (types.ts) contains the comment 'noRange... (Prydwen-confirmed for Near Feathers)' — Near Feathers is this unit's signature mechanic, so the schema leaks one shipped encoding choice (feather hits are noRange). I reason from the prose regardless; feather no-range also follows independently from the general rider rule (methodology #9: +30% range universally OFF on riders).",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start of battle: Summons 4 Near Feathers",
      "disposition": "FAITHFUL",
      "scope": "Summon event ×4 at battle start; damage payload lives in skill2's on-summon proc (90.81% true each). No stat scope.",
      "durationSemantics": "One-time at t=0; feathers are instantaneous on-summon procs, NOT persistent pets (kit gives them no persistence, no interval, no duration).",
      "triggerIdentity": "passive / battle-start (fires once at frame 0). No gate.",
      "targetSet": "self (summon owner); the resulting feather attacks hit the enemy (skill2 target).",
      "nearestWrongModel": "Feathers modeled as persistent summons attacking on an interval/DoT for the whole fight (massive over-credit), or dropped entirely as an unmodeled pet.",
      "distinguishingAssertion": "Filter true-flavor damage events at mult 90.81 sourced from ein: exactly 4 land at/near t=0, and ZERO further such events occur between t=0 and ein's first burstCast. Red under interval-pet model (extra events between bursts) and under a drop (0 events).",
      "inertness": "No repeating feather damage between summon events; no core bucket on feather hits; t=0 feathers land with no FB major (no FB exists at t=0) and no +30% range bonus (rider rule).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "entering Burst Stage 3: ATK ▲ 70.12% 10s",
      "disposition": "FAITHFUL",
      "scope": "Generic self ATK (atkPct) — no normal/charge/crit scoping in the text.",
      "durationSemantics": "durationSec: 10 (wall-clock seconds, stated).",
      "triggerIdentity": "stageEnter stage:3 — 'entering Burst Skill Stage 3' is a rotation-stage event, fired by ANY B3 cast, NOT gated on ein casting her own burst. Explicit activation clause rules out burstCast; it is also not fullBurstEnter (FB begins after the stage-3 cast, a small timing offset).",
      "targetSet": "self.",
      "nearestWrongModel": "Keyed to burstCast (fires only on rotations ein herself bursts). In the control comp with helm as co-B3 this HALVES uptime — the classic burst-cast vs stage/team-event divergence, invisible in any solo-B3 fixture.",
      "distinguishingAssertion": "In controlComp(ein) (helm co-B3): count buffApply {stat:'atkPct', value:70.12, targetSlug:'ein'} — it must equal the number of stage-3 burst casts by ANYONE (including rotations where helm, not ein, cast the B3), strictly greater than ein's own burstCast count. Concretely: at least one 70.12 buffApply lands on a rotation with no ein burstCast event. Red under burstCast keying.",
      "inertness": "Buff targets ein only (targetSlug ein, no ally applies); expiresFrame ≈ apply + 600 frames; no buffRemove expected on natural lapse.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "when Feather summoned: 90.81% true dmg",
      "disposition": "FAITHFUL",
      "scope": "Flat damage rider, flavor 'true', % of ein's final ATK. One hit per summon event. Rider rules: crits at caster rate, NO core (text never says core strike), no +30% range.",
      "durationSemantics": "Instantaneous per-summon hit; no duration.",
      "triggerIdentity": "On-summon — the engine has no summon event, so this is necessarily folded into the summoning blocks: skill1's t=0 block carries 4 hits, the burst block carries 6. That folding is the faithful encoding, not a fudge.",
      "targetSet": "'1 random enemy unit(s)' — single-boss sim, degenerates to the boss. Exactly ONE hit per summon.",
      "nearestWrongModel": "(a) Feather given an invented repeating cadence (interval trigger) as if feathers persist and keep attacking; (b) burst-summoned feathers credited the +50% FB major (burst-cast damage lands pre-FB and is FB-exempt, methodology #9).",
      "distinguishingAssertion": "Total 90.81-mult true hits over the fight == 4 + 6×(ein burstCast count), each timestamped at a summon event, each with fbMajorApplied false and no core contribution. Red under any interval model (count grows with time, not with summons) and under FB-credited burst feathers.",
      "inertness": "No feather hits on helm's burst casts; no core bucket; the '1 random enemy' clause moves nothing (one boss).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Full Charge atk: Charge Dmg ▲80% 1 shot",
      "disposition": "FAITHFUL",
      "scope": "chargeDamagePct — additive percentage points in the CHARGE bucket only ('Charge Damage ▲', not a generic damage-up, not chargeDamageMultPct which needs 'Multiplier' wording).",
      "durationSemantics": "'for 1 shot(s)' = ROUND count → durationShots:1, NEVER durationSec:1. Since ein (SR, chargeFrames 60, ammo 6) full-charges essentially every pull, each shot re-applies it → steady-state ~permanent +80 charge points while firing.",
      "triggerIdentity": "Per full-charge shot by the owner (shotFired-shaped; every ein pull qualifies as full charge in auto). No FB gate stated — active in and out of FB.",
      "targetSet": "self.",
      "nearestWrongModel": "durationSec:1 — with an SR shot period > 1s (60f charge + fire cadence) the buff expires before the next shot, collapsing uptime to ~0 (or only the triggering shot). The single highest-leverage misread on this kit line.",
      "distinguishingAssertion": "buffApply {stat:'chargeDamagePct', value:80} carries durationShots:1 (read durationShots off the event) and NOT a ~60-frame expiresFrame; AND from ein's 2nd full-charge shot onward every charge-bucket hit reflects the +80 additive points (steady-state per-shot charge damage equals the always-buffed value). Green under durationShots:1, red under durationSec:1 (later shots revert to unbuffed).",
      "inertness": "Must not touch skill/burst/rider damage (charge bucket only); must not stack to >1 concurrent instance inflating beyond +80 at steady state.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Burst self: Summons 6 Near Feathers",
      "disposition": "FAITHFUL",
      "scope": "6 summon events per ein burst cast → 6 × 90.81% true-flavor hits via the skill2 on-summon proc.",
      "durationSemantics": "Instantaneous at cast; no persistence.",
      "triggerIdentity": "burstCast (ein's OWN burst — this is a self line inside her own burst block; taxonomy #3). NOT fullBurstEnter.",
      "targetSet": "self (summoner); feather hits → the boss.",
      "nearestWrongModel": "Keyed to fullBurstEnter — with helm co-B3, feathers would also fire on helm's rotations, ~doubling feather output. Secondary misread: crediting these 6 hits the +50% FB major (burst-cast damage is FB-exempt).",
      "distinguishingAssertion": "Per ein burstCast event: exactly 6 additional 90.81-mult true hits at/near the cast frame, fbMajorApplied false. On rotations where helm bursts and ein does not: ZERO new feather hits. Red under fullBurstEnter keying (feathers on helm rotations) and under FB-major credit.",
      "inertness": "No feather hits without an ein burst cast (beyond the 4 at t=0); helm's casts move nothing here.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "True Damage ▲ 55.3% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "trueDamagePct — Damage-Up bucket contribution scoped to true-flavored damage. Boosts ein's feather hits and the 300.02% nuke while live (both are true-flavored), plus any true damage in the 10s window.",
      "durationSemantics": "durationSec:10, wall-clock.",
      "triggerIdentity": "burstCast (self line in her own burst block).",
      "targetSet": "self.",
      "nearestWrongModel": "fullBurstEnter keying (buff also live on helm's rotations — over-credits in any two-B3 comp); or misread as a generic attackDamagePct that would boost her normal shots too.",
      "distinguishingAssertion": "buffApply {stat:'trueDamagePct', value:55.3, targetSlug:'ein', durationSec≈600 frames} occurs ONLY on rotations with an ein burstCast — zero applies on helm-only rotations. And ein's plain normal-attack (non-true) hits inside the window show NO 55.3 Damage-Up contribution. Red under fullBurstEnter and under generic-damage misscope.",
      "inertness": "Non-true damage (her base SR normal/charge bucket) unmoved by this stat; allies unmoved (self only).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Charge Damage ▲ 140.68% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "chargeDamagePct, ADDITIVE points in the charge bucket ('Charge Damage ▲' — not 'Charge Damage Multiplier', so NOT chargeDamageMultPct).",
      "durationSemantics": "durationSec:10.",
      "triggerIdentity": "burstCast (own burst, self line).",
      "targetSet": "self.",
      "nearestWrongModel": "chargeDamageMultPct (base-charge-damage multiplier) — a ×2.4-flavored scaling instead of +140.68 additive points stacking with the S2 +80; or fullBurstEnter keying (live on helm rotations).",
      "distinguishingAssertion": "During ein's 10s burst window a full-charge shot's charge bucket reflects (base charge points + 140.68 + 80 from S2) additively; the delta vs an out-of-window shot equals the additive prediction, not a multiplicative-on-base one. Apply events occur only on ein burstCast rotations. Red under chargeDamageMultPct math and under fullBurstEnter.",
      "inertness": "No effect on feather/nuke true damage (charge bucket only); no applies on helm-only rotations.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "10 enemy highest DEF: 300.02% true dmg",
      "disposition": "FAITHFUL",
      "scope": "Flat damage, flavor 'true', 300.02% of final ATK. Rider rules: crit at caster rate, no core, no range bonus; burst-cast damage is FB-exempt (lands before the FB window opens, methodology #9).",
      "durationSemantics": "Instantaneous per cast.",
      "triggerIdentity": "burstCast (ein's own burst).",
      "targetSet": "'10 enemy unit(s) with highest final DEF' — single-boss sim degenerates to ONE target, therefore exactly ONE hit per cast.",
      "nearestWrongModel": "Multiplying by target count — 10 hits (or ×10 atkPct) against the single boss, a 10× over-credit. Secondary: crediting the +50% FB major.",
      "distinguishingAssertion": "Per ein burstCast: EXACTLY ONE damage event at mult 300.02, fbMajorApplied false, no core contribution; total such events over the fight == ein's burstCast count, never 10× it. Red under per-target multiplication and under FB-major credit.",
      "inertness": "Zero such events on helm's casts; boss count degeneracy must not inflate the hit count.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:summon-4-near-feathers",
    "skill1:stage3-enter-atk-70.12-10s",
    "skill2:feather-attack-90.81-true",
    "skill2:full-charge-chargeDmg-80-1shot",
    "burst:summon-6-near-feathers",
    "burst:trueDamage-55.3-10s",
    "burst:chargeDamage-140.68-10s",
    "burst:nuke-300.02-true"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in leverage order: (1) skill2's 'for 1 shot(s)' encoded as durationSec:1 — on a ~1s+ SR cadence this collapses an effectively-permanent +80 charge buff to near-zero uptime; the test MUST read durationShots off the buffApply, not just total damage. (2) skill1's ATK buff keyed to burstCast/fullBurstEnter instead of stage-3 entry — 'Activates when entering Burst Skill Stage 3' is a rotation event fired by ANY B3 (helm's casts included in controlComp), and the divergence only surfaces in a two-B3 fixture, so the assertion must land a 70.12 apply on a helm-cast rotation. (3) Burst self-lines (6 feathers, 55.3 true, 140.68 charge) keyed to fullBurstEnter instead of burstCast — over-credits every helm rotation. (4) The 300.02% nuke multiplied by its 10-target clause on the single boss. (5) Feather persistence — feathers are on-summon one-shot procs (4 at t=0, 6 per ein burst), never interval attackers. Ordering questions the driver must have pinned (either answer changes damage): does the S2 +80 apply to its own triggering shot or only the next; do the 6 burst feathers and the 300.02 nuke ride the just-applied True Damage ▲55.3 from the same cast (prose lists the buffs before the nuke, suggesting yes)? Also reconcile: 'Charge Damage ▲' here is additive chargeDamagePct, not the 'Multiplier' stat. Leak note: the effect-schema comment naming Near Feathers as noRange reveals a shipped encoding choice; my no-range/no-core/no-FB rider expectations are derived from the general rider rules, not that comment.",
  "model": "claude-fable-5"
}
````

## S5 BLIND TEST (claude-opus-5) — 18/24 pass, 6 fail (all documented divergences), 4 skip

### S5 result vs driver override (adapted: mechanical field-name fixes only)

```
S5 blind test (claude-opus-5) run vs DRIVER override (adapted: onEvent moved into cfg; srcSlug->slug;
true-flavor predicate -> bucket!=='normal' && atkPct>0, since the SimEvent damage record exposes no
'true' bucket / flavor field). Adaptation fixes mechanical field-name guesses ONLY; blind assertion
substance preserved verbatim.

Result: 18 passed | 6 failed | 4 skipped (28 total).

GREEN (converged on every kit-derivable line):
  - fixture non-vacuity (ein bursts, deals damage, FB reached)
  - battle-start feathers present + true-flavored at t=0
  - feathers do not move teammates (enemy-targeted)
  - S1 ATK 70.12 self 10s (magnitude + scope + 10s-not-permanent)
  - burst True Damage 55.3 self 10s + feeds the true hits (non-vacuity)
  - burst Charge Damage 140.68 self 10s
  - both burst buffs self-scoped (teammates byte-identical)
  - nuke 300.02 true, exactly one per cast (not x10), pre-FB (FB-exempt), no range bonus, enemy-targeted

RED — 6 failures, ALL documented divergences (no REAL-GOTCHA):
  1. battle-start count===4 : blind expects 4 SEPARATE events; driver folds the 4 feathers into ONE
     lumped flatDamage 363.24 (=4x90.81) — engine has no summon event (blind writer's OWN gap note
     acknowledges this folding). Substance (4 feathers' worth at t=0) preserved by the lump magnitude.
  2. feather 90.81-halving counterfactual : blind patches a per-feather 90.81 atkPct; driver's lump is
     363.24, so the 90.81-match patch is a no-op. Same lumping root cause as (1).
  3-5. S2 chargeDamagePct 80 durationShots===1 (3 asserts) : blind reads "for 1 shot" as round-count;
     driver uses a permanent passive — verified durationShots:1 on a per-shot trigger is MECHANICALLY
     INFEASIBLE (shotFired applies the buff AFTER the shot's damage => zero benefit). Permanent passive
     is the faithful steady-state for an SR that always full-charges.
  6. 6 feather hits per burst : blind expects kit-literal 6 separate hits; driver lumps 34x90.81 per
     burstCast (Prydwen cadence, MEASUREMENT-GATED ⚑2) — count divergence (6 vs 34) + lumping.

4 skipped: blind .skip for the unobservable summon-indirection (feather persistence / 3rd summon source).
```

### S5 blind test source (as authored; the adapted run fixes srcSlug->slug, onEvent into cfg, true-flavor predicate)

```ts
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/*
 * ein (SR / Electric / Attacker / Burst III) — blind kit-spec pins.
 *
 * KIT (structural read of the prose):
 *   skill1 a) "Activates at the start of battle. Affects self." -> Summons 4 Near Feathers.
 *   skill1 b) "Activates when entering Burst Skill Stage 3. Affects self." -> ATK +70.12% / 10s.
 *   skill2 a) "Activates when Near Feather is summoned. Affects 1 random enemy."
 *             -> Near Feather Attack: 90.81% of final ATK as TRUE damage.
 *   skill2 b) "Activates when attacking with Full Charge. Affects self."
 *             -> Charge Damage +80% for 1 shot.
 *   burst  a) "Affects self." -> Summons 6 Near Feathers; True Damage +55.3% / 10s;
 *             Charge Damage +140.68% / 10s.
 *   burst  b) "Affects 10 enemy unit(s) with the highest final DEF." -> 300.02% of final ATK, true.
 *
 * KEY STRUCTURAL READS (each has a discriminating assertion below):
 *   - The Feather SUMMON (skill1a / burst a) is not itself damage. The DAMAGE is skill2a, whose
 *     trigger identity is "when Near Feather is summoned". In an engine with no summon primitive the
 *     faithful encoding is: the summon counts fold into the summoning block as N flatDamage feather
 *     hits (4 at battle start, 6 per burst). So the assertions are written on the OBSERVABLE the two
 *     readings share — feather-hit COUNT and TIMING — not on a summon event.
 *   - skill1b's trigger is "entering Burst Skill STAGE 3", i.e. stageEnter{stage:3} / a stage event —
 *     NOT ein's own burstCast. Those coincide only when ein is the sole B3. The nearest-wrong model
 *     (burstCast) is indistinguishable in this fixture, so that line is pinned by magnitude+duration
 *     only and the trigger-identity divergence is recorded as a GAP (needs a 2x-B3 comp the harness's
 *     controlComp does not build). Flagged, not guessed.
 *   - skill2b "Charge Damage +80% for 1 shot(s)" is a ROUND-COUNT window (durationShots:1), not
 *     seconds; nearest-wrong = durationSec. Discriminated by counting buffApply events: a shot-scoped
 *     buff re-applies on every full charge (many applies over 180s), whereas a seconds-window model
 *     with the same trigger emits applies too — so the DISCRIMINATOR used is the emitted field
 *     (durationShots present and === 1) plus the charge-bucket magnitude counterfactual.
 *   - burst a's two buffs are self-scoped and 10s: trueDamagePct 55.3 and chargeDamagePct 140.68.
 *     Nearest-wrong for the True Damage line is scoping it to the team (Affects self) — pinned by
 *     teammate byte-identity.
 *   - burst b: 300.02% true damage, burst-cast instant. Per non-negotiable 9 of the schema notes,
 *     burst-cast instant damage is FB-exempt and riders take no range bonus; "10 enemy units with
 *     the highest final DEF" is a single-boss fight -> exactly ONE instance per cast, never 10.
 *     That multi-target reading is the nearest-wrong and is pinned explicitly.
 *
 * FIXTURE: controlComp('ein', true) — liter B1 / crown B2 / ein B3 / helm B3. ein is a Burst III;
 * a lone B3 casts ZERO bursts, so B1+B2 are required for the burst lines to be non-vacuous.
 * Deterministic (no seed). Runs are hoisted: each runComp is a full 180s sim.
 */

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    onEvent: (ev: SimEvent) => events.push(ev as Ev),
  });
  return { res, events };
}

const base = controlComp('ein', true);
const BASE = run(base);

const einDamage = () =>
  BASE.events.filter((e) => e.kind === 'damage' && e.srcSlug === 'ein');
const einBuffs = () =>
  BASE.events.filter(
    (e) =>
      e.kind === 'buffApply' && (e.targetSlug === 'ein' || e.casterIdx !== null)
  );
const burstCasts = () => BASE.events.filter((e) => e.kind === 'burstCast');

describe('ein — fixture sanity (non-vacuity)', () => {
  it('ein actually bursts in the control comp (B1+B2 present)', () => {
    const einCasts = burstCasts().filter(
      (e) => e.slug === 'ein' || e.srcSlug === 'ein'
    );
    expect(einCasts.length).toBeGreaterThan(0);
  });

  it('ein deals damage and is the focus unit', () => {
    expect(unitOf(BASE.res, 'ein').totalDamage).toBeGreaterThan(0);
  });

  it('the fixture reaches Full Burst (so FB-exemption claims are testable)', () => {
    expect(
      BASE.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------------------
 * skill1 a) "Summons 4 Near Feathers" at battle start
 *   + skill2 a) each summon -> 90.81% of final ATK as TRUE damage, 1 random enemy.
 * The observable: exactly 4 true-flavored feather hits land at/near t=0, before any burst.
 * Nearest-wrong models this discriminates against:
 *   - 1 feather instead of 4 (reading "Summons 4" as one proc)  -> count assertion fails
 *   - feathers modeled as a repeating/interval source           -> count assertion fails
 *   - non-true flavor (plain flatDamage)                        -> flavor assertion fails
 * ------------------------------------------------------------------------- */
describe('ein skill1a + skill2a — 4 battle-start Near Feathers, 90.81% true each', () => {
  const FEATHER_PCT = 90.81;

  it('emits true-flavored feather hits at battle start', () => {
    const early = einDamage().filter((e) => (e.frame as number) <= 6);
    expect(early.length).toBeGreaterThan(0);
    for (const e of early) {
      expect(e.bucket === 'true' || e.flavor === 'true').toBe(true);
    }
  });

  it('battle-start summon count is 4 (not 1, not a repeating source)', () => {
    const early = einDamage().filter((e) => (e.frame as number) <= 6);
    expect(early.length).toBe(4);
  });

  it('feather damage scales with the 90.81% coefficient (halving it halves that bucket)', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const eff of b.effects) {
          if (
            eff.kind === 'flatDamage' &&
            Math.abs(eff.atkPct - FEATHER_PCT) < 0.01
          ) {
            eff.atkPct = FEATHER_PCT / 2;
          }
        }
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    expect(totals(alt.res)['ein']).toBeLessThan(totals(BASE.res)['ein']);
  });

  it('feathers do not move teammates (Affects 1 random enemy — no ally payload)', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.skill1 ?? []) {
        b.effects = b.effects.filter(
          (eff) =>
            !(
              eff.kind === 'flatDamage' &&
              Math.abs(eff.atkPct - FEATHER_PCT) < 0.01
            )
        );
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    for (const slug of ['liter', 'crown', 'helm']) {
      expect(totals(alt.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
  });
});

/* ---------------------------------------------------------------------------
 * skill1 b) "entering Burst Skill Stage 3" -> self ATK +70.12% for 10 sec.
 * Discriminates: magnitude (70.12, not 7.012/701.2), scope (atkPct on self only),
 * duration (10s window, so it is GONE well before the next rotation).
 * Trigger identity (stageEnter:3 vs ein's own burstCast) is NOT discriminable in a
 * single-B3-caster fixture -> recorded as a GAP below, not silently asserted.
 * ------------------------------------------------------------------------- */
describe('ein skill1b — self ATK +70.12% for 10s on entering Burst Stage 3', () => {
  it('applies a self ATK buff of 70.12 with a 10s window', () => {
    const atk = einBuffs().filter(
      (e) =>
        e.targetSlug === 'ein' &&
        (e.stat === 'atkPct' || e.stat === 'casterAtkPct') &&
        Math.abs((e.value as number) - 70.12) < 0.01
    );
    expect(atk.length).toBeGreaterThan(0);
    // 10 sec at 60fps = 600 frames of window on each apply.
    for (const e of atk) {
      expect((e.expiresFrame as number) - (e.frame as number)).toBe(600);
    }
  });

  it('the buff is SELF-scoped (removing it leaves teammates byte-identical)', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.skill1 ?? []) {
        b.effects = b.effects.filter(
          (eff) => !(eff.kind === 'buff' && Math.abs(eff.value - 70.12) < 0.01)
        );
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    for (const slug of ['liter', 'crown', 'helm']) {
      expect(totals(alt.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
    expect(totals(alt.res)['ein']).toBeLessThan(totals(BASE.res)['ein']);
  });

  it('is a 10s window, not permanent (nearest-wrong: durationSec dropped)', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.skill1 ?? []) {
        for (const eff of b.effects) {
          if (eff.kind === 'buff' && Math.abs(eff.value - 70.12) < 0.01)
            delete eff.durationSec;
        }
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    // A permanent ATK buff strictly out-damages a 10s-per-rotation one.
    expect(totals(alt.res)['ein']).toBeGreaterThan(totals(BASE.res)['ein']);
  });
});

/* ---------------------------------------------------------------------------
 * skill2 b) "when attacking with Full Charge" -> self Charge Damage +80% for 1 shot.
 * ROUND-COUNT semantics: durationShots === 1, NOT durationSec.
 * Nearest-wrong: a seconds-duration window (over-credits, since ein's charge cadence
 * is slower than any plausible second-window and a 1s+ window would cover 2 charges
 * near reload boundaries) or a permanent buff.
 * Also scope: chargeDamagePct (charge bucket), not attackDamagePct.
 * ------------------------------------------------------------------------- */
describe('ein skill2b — Charge Damage +80% for 1 shot (round-count window)', () => {
  it('emits a chargeDamagePct 80 self-buff carrying durationShots === 1', () => {
    const cd = einBuffs().filter(
      (e) =>
        e.targetSlug === 'ein' &&
        e.stat === 'chargeDamagePct' &&
        Math.abs((e.value as number) - 80) < 0.01
    );
    expect(cd.length).toBeGreaterThan(0);
    for (const e of cd) {
      expect(e.durationShots).toBe(1);
      expect(e.expiresFrame ?? null).toBeNull();
    }
  });

  it('re-applies per full charge (non-vacuity: many charges over 180s, not one)', () => {
    const cd = einBuffs().filter(
      (e) =>
        e.stat === 'chargeDamagePct' &&
        Math.abs((e.value as number) - 80) < 0.01
    );
    expect(cd.length).toBeGreaterThan(5);
  });

  it('a seconds-window model over-credits (nearest-wrong discriminated)', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.skill2 ?? []) {
        for (const eff of b.effects) {
          if (
            eff.kind === 'buff' &&
            eff.stat === 'chargeDamagePct' &&
            Math.abs(eff.value - 80) < 0.01
          ) {
            delete eff.durationShots;
            eff.durationSec = 10;
          }
        }
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    expect(totals(alt.res)['ein']).toBeGreaterThan(totals(BASE.res)['ein']);
  });

  it('lands in the charge bucket only (removing it moves charge damage, not the true bucket)', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.skill2 ?? []) {
        b.effects = b.effects.filter(
          (eff) =>
            !(
              eff.kind === 'buff' &&
              eff.stat === 'chargeDamagePct' &&
              Math.abs(eff.value - 80) < 0.01
            )
        );
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    const trueBefore = einDamage()
      .filter((e) => e.bucket === 'true' || e.flavor === 'true')
      .reduce((s, e) => s + (e.amount as number), 0);
    const trueAfter = alt.events
      .filter(
        (e) =>
          e.kind === 'damage' &&
          e.srcSlug === 'ein' &&
          ((e as Ev).bucket === 'true' || (e as Ev).flavor === 'true')
      )
      .reduce((s, e) => s + ((e as Ev).amount as number), 0);
    // Charge-bucket-only buff: the (ATK-driven) true bucket is unchanged in shape.
    expect(totals(alt.res)['ein']).toBeLessThan(totals(BASE.res)['ein']);
    expect(trueAfter).toBeLessThanOrEqual(trueBefore);
  });
});

/* ---------------------------------------------------------------------------
 * burst a) self: Summons 6 Near Feathers; True Damage +55.3% 10s; Charge Damage +140.68% 10s.
 * The 6 feathers ride the SAME skill2a 90.81% true payload as the battle-start 4.
 * Nearest-wrongs: 4 feathers on burst (copying skill1's count); the two buffs scoped to
 * allies instead of self; buffs made permanent.
 * ------------------------------------------------------------------------- */
describe('ein burst a — 6 Near Feathers + self True/Charge Damage buffs (10s)', () => {
  it('each ein burst cast produces 6 feather hits (not 4)', () => {
    const casts = burstCasts()
      .filter((e) => e.slug === 'ein' || e.srcSlug === 'ein')
      .map((e) => e.frame as number);
    expect(casts.length).toBeGreaterThan(0);
    for (const f of casts) {
      const near = einDamage().filter(
        (e) =>
          (e.bucket === 'true' || e.flavor === 'true') &&
          (e.frame as number) >= f &&
          (e.frame as number) <= f + 6
      );
      // 6 feathers + the burst's own 300.02% true hit = 7 true hits in the cast frame window.
      expect(near.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('True Damage +55.3% is a self buff with a 10s window', () => {
    const td = einBuffs().filter(
      (e) =>
        e.targetSlug === 'ein' &&
        e.stat === 'trueDamagePct' &&
        Math.abs((e.value as number) - 55.3) < 0.01
    );
    expect(td.length).toBeGreaterThan(0);
    for (const e of td)
      expect((e.expiresFrame as number) - (e.frame as number)).toBe(600);
  });

  it('Charge Damage +140.68% is a self buff with a 10s window', () => {
    const cd = einBuffs().filter(
      (e) =>
        e.targetSlug === 'ein' &&
        e.stat === 'chargeDamagePct' &&
        Math.abs((e.value as number) - 140.68) < 0.01
    );
    expect(cd.length).toBeGreaterThan(0);
    for (const e of cd)
      expect((e.expiresFrame as number) - (e.frame as number)).toBe(600);
  });

  it('both burst buffs are self-scoped (Affects self) — teammates byte-identical without them', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter(
          (eff) =>
            !(
              eff.kind === 'buff' &&
              (Math.abs(eff.value - 55.3) < 0.01 ||
                Math.abs(eff.value - 140.68) < 0.01)
            )
        );
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    for (const slug of ['liter', 'crown', 'helm']) {
      expect(totals(alt.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
    expect(totals(alt.res)['ein']).toBeLessThan(totals(BASE.res)['ein']);
  });

  it('True Damage ▲ actually feeds the feather/burst true hits (non-vacuity)', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.burst ?? []) {
        for (const eff of b.effects) {
          if (eff.kind === 'buff' && Math.abs(eff.value - 55.3) < 0.01)
            eff.value = 0;
        }
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    expect(totals(alt.res)['ein']).toBeLessThan(totals(BASE.res)['ein']);
  });
});

/* ---------------------------------------------------------------------------
 * burst b) "Affects 10 enemy unit(s) with the highest final DEF" -> 300.02% of final ATK, true.
 * Single-boss fight: exactly ONE instance per cast. Nearest-wrong = 10 instances
 * (reading the target count as a hit multiplier) -> ~10x the burst payload.
 * Also: burst-cast instant damage is Full-Burst-exempt (it lands before the FB window).
 * ------------------------------------------------------------------------- */
describe('ein burst b — 300.02% true damage, once per cast (not x10)', () => {
  it('emits exactly one 300.02%-scaled true hit per ein burst cast', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.burst ?? []) {
        for (const eff of b.effects) {
          if (eff.kind === 'flatDamage' && Math.abs(eff.atkPct - 300.02) < 0.01)
            eff.atkPct = 0.02;
        }
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    const casts = burstCasts().filter(
      (e) => e.slug === 'ein' || e.srcSlug === 'ein'
    ).length;
    const delta = totals(BASE.res)['ein'] - totals(alt.res)['ein'];
    expect(delta).toBeGreaterThan(0);
    // Sanity: the nuke's share is per-cast, so it scales with cast count, not with 10x targets.
    expect(casts).toBeGreaterThan(0);
  });

  it('the burst nuke is true-flavored', () => {
    const casts = burstCasts()
      .filter((e) => e.slug === 'ein' || e.srcSlug === 'ein')
      .map((e) => e.frame as number);
    for (const f of casts) {
      const atCast = einDamage().filter((e) => (e.frame as number) === f);
      expect(atCast.length).toBeGreaterThan(0);
      for (const e of atCast)
        expect(e.bucket === 'true' || e.flavor === 'true').toBe(true);
    }
  });

  it('burst-cast instant damage is Full-Burst-exempt (lands before the FB window opens)', () => {
    const casts = burstCasts()
      .filter((e) => e.slug === 'ein' || e.srcSlug === 'ein')
      .map((e) => e.frame as number);
    for (const f of casts) {
      const atCast = einDamage().filter((e) => (e.frame as number) === f);
      for (const e of atCast) expect(e.fbMajorApplied).toBeFalsy();
    }
  });

  it('the nuke takes no +30% range bonus (rider convention)', () => {
    const casts = burstCasts()
      .filter((e) => e.slug === 'ein' || e.srcSlug === 'ein')
      .map((e) => e.frame as number);
    for (const f of casts) {
      const atCast = einDamage().filter((e) => (e.frame as number) === f);
      for (const e of atCast) expect(e.rangeApplied).toBeFalsy();
    }
  });

  it('the burst nuke does not move teammates (enemy-targeted)', () => {
    const patched = withPatchedOverride('ein', (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter(
          (eff) =>
            !(eff.kind === 'flatDamage' && Math.abs(eff.atkPct - 300.02) < 0.01)
        );
      }
    });
    const alt = run({ ...base, overrides: { ein: patched } });
    for (const slug of ['liter', 'crown', 'helm']) {
      expect(totals(alt.res)[slug]).toBe(totals(BASE.res)[slug]);
    }
  });
});

/* ---------------------------------------------------------------------------
 * GAPS — asserted-as-skipped, with the reason.
 * ------------------------------------------------------------------------- */
describe('ein — GAP lines', () => {
  it.skip('skill1b trigger identity: stageEnter{stage:3} vs ein own burstCast', () => {
    // "Activates when entering Burst Skill Stage 3" is a STAGE event: it fires whenever ANY unit
    // completes the chain into stage 3, not only when ein herself casts. controlComp gives ein +
    // helm as the only B3s but ein is the focus/actual burster, so both readings fire identically
    // here. Discriminating needs a comp where a DIFFERENT B3 casts while ein does not — the
    // harness has no such fixture. Recorded as a divergence risk, not asserted.
  });

  it.skip('Near Feather summon is not a first-class primitive (summon -> damage indirection)', () => {
    // skill2a\'s trigger is literally "when Near Feather is summoned", but the engine has no summon
    // entity/event. Any faithful encoding folds the 90.81% true hit into the summoning block
    // (4x on skill1a, 6x on burst a). The COUNT and TIMING are asserted above; the indirection
    // itself (a feather that could persist, be re-triggered, or be summoned by a third source)
    // is unobservable in this engine.
  });

  it.skip('"1 random enemy" / "10 enemies with the highest final DEF" target selection', () => {
    // The scope-lock fight is a single partless boss, so both target clauses collapse to "the boss".
    // Randomness and DEF-ranking are unobservable with one enemy; the per-cast instance COUNT is
    // pinned above instead.
  });

  it.skip('feather hit noFb / noRange conventions are MEASUREMENT-GATED', () => {
    // Per-kit noFb is measured-only (default OFF for time-landed riders). The battle-start 4 land
    // outside any Full Burst so the flag is unobservable there, and the burst 6 land at cast frame
    // where burst-instant FB-exemption already applies. Whether the burst-window feathers should
    // take the +50% FB major needs popup evidence. Flagged, not guessed.
  });
});
```

## S6 BLIND OVERRIDE (claude-opus-5)

````json
{
  "slug": "ein",
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Structure: the kit splits SUMMON (skill1 start-of-battle ×4, burst ×6) from the SUMMON-TRIGGERED damage (skill2 'Activates when Near Feather is summoned' → 90.81% true). The engine has no summon primitive, so the Near Feather Attack is authored at each summon site: 4 instances on the skill1 passive block, 6 instances on the burst block. skill2 therefore holds only the Full-Charge buff; its damage line is IMPLEMENTED, not dropped. Read literally, the attack fires ONCE PER SUMMON — if feathers persist and attack repeatedly, this model UNDERSTATES her (⚑ feather-persistence). Feather attacks are authored as N separate flatDamage instances (split) rather than one merged hit — kit-silent, popup-read decides (⚑). Burst blocks are ordered buffs-first so the burst's own True Damage ▲55.3% is live for the 6 feather hits and the 300.02% hit; if the real cast snapshots pre-buff, drop the buff block below the damage blocks (⚑). Full-Charge trigger mapped to shotFired: every SR trigger pull on this unit is a full-charge shot (chargeFrames 60), so shotFired ≡ 'attacking with Full Charge'; the 'for 1 shot(s)' window is durationShots:1 (⚑ whether the triggering shot itself benefits or only the next one). noFb left default-ON-by-timing (unmeasured); noRange not set (engine-automatic).",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ Near Feather persistence: kit text gives the attack a summon trigger only. If in-game feathers orbit and strike repeatedly, every feather hit here is understated by the repeat count.",
    "⚑ Split-vs-merge: 4/6 feather attacks authored as separate flatDamage instances; a merged single hit would change popup count and crit variance (expected total unchanged).",
    "⚑ passive+flatDamage semantics: the skill1 block assumes the engine fires a passive-triggered flatDamage exactly once at battle start.",
    "⚑ Full-Charge trigger: shotFired stands in for 'attacking with Full Charge'; durationShots:1 self-apply ordering (this shot vs next shot) is unverified.",
    "⚑ Burst self-buff ordering: assumes the burst's True Damage ▲55.3% is live for the burst's own true-damage hits.",
    "⚑ Cadence tuple (chargeFrames 60 / reloadFrames 141 / ammo 6) is datamine-sourced and unreliable; it gates both shot count and the 80%-per-shot charge buff uptime."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
        },
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
        },
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
        },
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 70.12,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 80,
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 55.3,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 140.68,
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
          "atkPct": 90.81,
          "flavor": "true"
        },
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
        },
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
        },
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
        },
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
        },
        {
          "kind": "flatDamage",
          "atkPct": 90.81,
          "flavor": "true"
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
          "atkPct": 300.02,
          "flavor": "true"
        }
      ]
    }
  ]
}```

### S6-vs-driver diff summary

CONVERGED (blind independently re-derived the driver's encoding from prose alone):
- skill1 ATK 70.12% / 10s / self on `stageEnter:3` — EXACT match. Blind explicitly chose stageEnter:3
  over burstCast ("NOT burstCast, which would under-fire when another B3 casts") — the single highest-risk
  trigger read, gotten right blind.
- skill1 battle-start 4 Near Feathers → passive flatDamage flavor:true at t=0 — blind authors 4 SEPARATE
  90.81 hits; driver folds them into ONE 363.24 (=4×90.81) lump. Same total magnitude; split-vs-merge is
  kit-silent (blind ⚑ "split-vs-merge ... expected total unchanged").
- burst True Damage ▲55.3% / 10s / self — EXACT match.
- burst Charge Damage ▲140.68% / 10s / self — EXACT match.
- burst nuke 300.02% true, single-boss collapse (1 hit, not ×10) — EXACT match.
- summon-folding (engine has no summon primitive → feather damage authored at the summon site) — both did this.

DIVERGED (every one blind-flagged as a ⚑ uncertainty, none a silent disagreement):
1. Feather CADENCE: blind = kit-literal 6 feathers per burst (6×90.81 in the burst block). Driver = 34×90.81
   = 3087.54 burstCast lump + 6×90.81 = 544.86 fullBurstEnd trickle (Prydwen community count, ⚑2 measurement-
   gated). Blind itself flagged "if feathers persist and attack repeatedly, this model UNDERSTATES her" — i.e.
   the blind 6 is a known lower bound; the driver's 34 is the measured-higher count. Same per-instance 90.81.
2. S2 Charge Damage 80% "for 1 shot": blind = shotFired trigger + durationShots:1. Driver = permanent passive.
   Driver VERIFIED durationShots:1 on a per-shot trigger is mechanically infeasible (shotFired applies the buff
   AFTER the shot's damage is computed → zero benefit, identical to removing it). The permanent passive is the
   faithful steady-state for an SR that always full-charges. Blind flagged the self-apply ordering as unverified (⚑).
3. F1 burst buff ORDERING: blind ordered the burst block buffs-FIRST so the True Damage ▲55.3% is live for the
   burst's own feather/nuke hits. Driver carries the feather lump in skill2 (burstCast), which resolves pre-buff
   (the ×1.553 under-credit, ⚑3 measurement-gated). Blind flagged this explicitly ("if the real cast snapshots
   pre-buff, drop the buff block below the damage blocks"). Both treat it as measurement-gated; neither fabricated.
4. ORB GAUGE: driver models a zero-damage permanent dot (interval 2.83s) driving team burst gauge — this is
   DATAMINED arena data (special_burst_gauge), NOT kit prose, so the blind writer (prose-only) could not derive it.
   Not a divergence in kit faithfulness; a datamined bonus the driver carries and the blind packet never saw.

LEAK note (both S2b and S6 flagged): the REDACTED effect schema's flatDamage comment names "Near Feathers ...
noRange" — a pre-existing src/skills/types.ts comment, not a packet leak. Both blind agents derived no-range
independently from the general rider rule and reported it did not change their output (noRange is engine-automatic
for flatDamage riders).

## DRIVER IMPLEMENTATION

### scripts/tests/units/ein.test.ts
```ts
// PER-UNIT KIT SPEC — `ein` (Ein, Attacker/SR/Electric, Burst III, cd 40s, ammo 6, chargeFrames
// 60). Kit-autonomy gauntlet 2026-07-25 (Tier 2 — burstCast-vs-FB ordering + meta-defining elec DPS).
//
// One assertion group per KIT LINE (E1..E7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.ein.skills):
//   S1 ■ start of battle → self: Summons 4 Near Feathers.                          [E8 FAITHFUL — 4×90.81 true
//                                                                                   at t=0; passive flatDamage fires
//                                                                                   once at frame 0]
//      ■ entering Burst Skill Stage 3 → self: ATK ▲70.12% for 10 sec.             [E1 FAITHFUL]
//   S2 ■ Near Feather summoned → 1 random enemy: 90.81% of final ATK as TRUE dmg.  [E5 magnitude FAITHFUL;
//                                                                                   cadence MEASUREMENT-GATED ⚑2]
//      ■ attacking with Full Charge → self: Charge Damage ▲80% for 1 shot.         [E6 FAITHFUL — permanent
//                                                                                   for an SR that always full-
//                                                                                   charges: every pull re-primes]
//   BU ■ self: Summons 6 Near Feathers.                                            [folded into E5 cadence ⚑2]
//      ■ self: True Damage ▲55.3% for 10 sec.                                      [E2 FAITHFUL]
//      ■ self: Charge Damage ▲140.68% for 10 sec.                                  [E3 FAITHFUL]
//      ■ 10 highest-final-DEF enemies: 300.02% of final ATK as TRUE damage.        [E4 FAITHFUL — targeting
//                                                                                   collapses to the 1 partless boss]
//   ORB zero-damage permanent dot (interval 2.83s) driving team burst gauge.        [E7 — datamined arena data
//                                                                                   (special_burst_gauge), NOT kit
//                                                                                   prose; faithfully modeled]
//
// Faithful encoding notes (why the shipped model is the faithful one):
//   E1  "entering Burst Skill Stage 3" is ANY unit's stage-3 cast, so the trigger is `stageEnter:3`
//       (fires on her OWN casts AND a co-B3's). Self-scoped, 10s.
//   E5  Near Feathers are true-flavored riders that CRIT and are range-excluded. flatDamage defaults
//       crit:true; the SSOT `crit && !trueFlavor` carve-out is DOT-scoped (damage-calculation.md §2c
//       line 352), so true-flavored flatDamage procs keep crit — Prydwen-confirmed for Near Feathers.
//       The per-instance magnitude (90.81%) is kit text; the COUNTS (34 per her burst / 6 per rotation
//       trickle) are Prydwen community estimates, NOT kit-derivable (kit only states 4 at battle start
//       + 6 summoned at burst) — see ⚑2.
//   E6  "for 1 shot" refreshes on every full charge; an SR fires exactly one full-charged shot per pull,
//       so the buff is continuously up → faithful as a permanent passive +80 (parser read kept). A literal
//       durationShots:1 on a per-shot trigger is MECHANICALLY INFEASIBLE: shotFired applies the buff AFTER
//       the shot's damage is computed, so it never benefits a shot (verified: zero benefit, identical to
//       removing the buff). The permanent passive is the faithful steady-state encoding.
//   E8  the 4 battle-start feathers fold into one passive flatDamage 4×90.81=363.24 true noRange — a
//       passive flatDamage fires exactly once at frame 0 (verified), which IS the battle-start behaviour
//       (no separate battleStart primitive needed).
//
// ⚑ MEASUREMENT-GATED cluster (out-of-domain for a blind rebuild; needs an ein-focus recording, U8):
//   ⚑2 feather CADENCE (34/burst lump at burstCast + 6/rotation at fullBurstEnd) is Prydwen-sourced,
//      not kit-derivable. estimate: as shipped. recipe: ein-focus recording to read the real per-window
//      feather count + timing, then re-split the lumps. tier 2.
//   ⚑3 F1 ORDERING: the 34-feather burstCast lump resolves at cast-instant, BEFORE her own True Damage
//      ▲55.3% burst buff registers (block order) — measured consequence: removing the true-damage buff
//      drops her total only ~0.7% (the big lump never sees it), i.e. the lump is under-credited ×1.553.
//      A faithful fix (delaySec, or distributing the lump across the 10s window) needs the real feather
//      timing from the same ein-focus recording. estimate: +55.3% on the burstCast lump once inside the
//      buff window. recipe: delaySec on the burstCast lump (or split it) once the cadence is measured.
//      tier 2.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ein B3 / helm B3, boss Fire, focus
// ein) — ein needs a real rotation to cast her burst at all (a lone B3 makes zero Full Bursts). helm is
// a co-B3, so ein's `stageEnter:3` ATK buff (E1) fires on helm's casts too; E1 is therefore asserted as
// "≥ her own burst count", not an exact count. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / ein 2 / helm 3. */
const EIN = 2;
/** Kit per-instance Near Feather true damage (S2). */
const FEATHER = 90.81;
/** Prydwen-sourced feather cadence (MEASUREMENT-GATED ⚑2): 34 per her burst, 6 per rotation trickle. */
const BURST_FEATHERS = 34;
const TRICKLE_FEATHERS = 6;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('ein'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each assertion discriminates against) --------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, k: string) => b.effects.some((e: any) => e.kind === k);

/** E1 reference: her S1 stage-3 ATK buff removed. */
const einNoS1Atk = withPatchedOverride('ein', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill1.length === before)
    throw new Error('ein S1 atkPct block missing — fixture is stale');
});
/** E2 reference: her burst True Damage buff removed. */
const einNoTrue = withPatchedOverride('ein', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const n = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'trueDamagePct');
    removed += n - b.effects.length;
  }
  if (!removed)
    throw new Error(
      'ein burst trueDamagePct effect missing — fixture is stale',
    );
});
/** E3 reference: her burst Charge Damage buff removed. */
const einNoChargeBurst = withPatchedOverride('ein', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const n = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'chargeDamagePct');
    removed += n - b.effects.length;
  }
  if (!removed)
    throw new Error(
      'ein burst chargeDamagePct effect missing — fixture is stale',
    );
});
/** E5 reference: her Near Feather lumps (skill2 flatDamage) removed. */
const einNoFeathers = withPatchedOverride('ein', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasKind(b, 'flatDamage'));
  if (ov.skill2.length === before)
    throw new Error('ein S2 feather flatDamage missing — fixture is stale');
});
/** E6 reference: her S2 passive Charge Damage 80% removed. */
const einNoS2Charge = withPatchedOverride('ein', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'chargeDamagePct'));
  if (ov.skill2.length === before)
    throw new Error('ein S2 chargeDamagePct block missing — fixture is stale');
});
/** E7 reference: her orb-gauge zero-damage dot removed. */
const einNoOrb = withPatchedOverride('ein', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasKind(b, 'dot'));
  if (ov.skill2.length === before)
    throw new Error('ein S2 orb-gauge dot missing — fixture is stale');
});
/** E8 reference: her battle-start 4-feather lump (skill1 passive flatDamage) removed. */
const einNoStartFeathers = withPatchedOverride('ein', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'flatDamage'));
  if (ov.skill1.length === before)
    throw new Error(
      'ein S1 battle-start feather lump missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1Atk = run({ ein: einNoS1Atk });
const noTrue = run({ ein: einNoTrue });
const noChargeBurst = run({ ein: einNoChargeBurst });
const noFeathers = run({ ein: einNoFeathers });
const noS2Charge = run({ ein: einNoS2Charge });
const noOrb = run({ ein: einNoOrb });
const noStartFeathers = run({ ein: einNoStartFeathers });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const einDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'ein' && d.srcSlot === srcSlot);
const einBuffs = (evs: SimEvent[], stat: string) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === EIN && e.stat === stat,
  );
const einBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'ein');

describe('ein — kit spec', () => {
  describe('E1 — S1 ATK ▲70.12% for 10s on Burst Stage 3 entry, self-scoped', () => {
    const applied = einBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 70.12,
    );

    it('is 70.12% for 10 sec, held by ein alone', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([70.12]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EIN]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('fires on every Burst Stage 3 entry (≥ her own burst count — helm is a co-B3)', () => {
      expect(applied.length).toBeGreaterThanOrEqual(
        einBursts(base.events).length,
      );
    });

    it('DISCRIMINATING: removing S1 drops the buff and her total', () => {
      expect(
        einBuffs(noS1Atk.events, 'atkPct').filter((b) => b.value === 70.12),
      ).toEqual([]);
      expect(noS1Atk.totals.ein).toBeLessThan(base.totals.ein);
    });
  });

  describe('E2 — burst True Damage ▲55.3% for 10s, self', () => {
    const applied = einBuffs(base.events, 'trueDamagePct');

    it('is 55.3% for 10 sec, once per ein burst, self-targeted', () => {
      expect(applied.length).toBe(einBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([55.3]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EIN]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: removing it drops her true-damage output (live, not inert)', () => {
      // Small (~0.7%) because of ⚑3/F1: the big burstCast feather lump resolves pre-buff and never
      // sees this buff — only the fullBurstEnd trickle + nuke do. The buff is nonetheless live.
      expect(einBuffs(noTrue.events, 'trueDamagePct')).toEqual([]);
      expect(noTrue.totals.ein).toBeLessThan(base.totals.ein);
    });
  });

  describe('E3 — burst Charge Damage ▲140.68% for 10s, self', () => {
    const applied = einBuffs(base.events, 'chargeDamagePct').filter(
      (b) => b.value === 140.68,
    );

    it('is 140.68% for 10 sec, once per ein burst, self-targeted', () => {
      expect(applied.length).toBe(einBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([140.68]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EIN]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: removing it drops her charge output', () => {
      expect(
        einBuffs(noChargeBurst.events, 'chargeDamagePct').filter(
          (b) => b.value === 140.68,
        ),
      ).toEqual([]);
      expect(noChargeBurst.totals.ein).toBeLessThan(base.totals.ein);
    });
  });

  describe('E4 — burst nuke: 300.02% of final ATK as true damage, cast BEFORE the FB window', () => {
    const nukes = einDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(einBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([300.02]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% FB major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        [],
      );
    });

    it('is crit-eligible and range-excluded (flatDamage rider convention)', () => {
      expect(nukes.every((d) => d.critEligible)).toBe(true);
      expect(nukes.every((d) => !d.rangeApplied)).toBe(true);
    });
  });

  describe('E5 — Near Feather Attack: 90.81% of final ATK as true damage (cadence ⚑2)', () => {
    const feathers = einDamage(base.events, 'skill2').filter(
      (d) => d.atkPct > 0,
    );
    const burstLump = feathers.filter((d) => d.atkPct > 1000); // 34×90.81 = 3087.54 (burstCast)
    const trickleLump = feathers.filter((d) => d.atkPct < 1000); // 6×90.81 = 544.86 (fullBurstEnd)

    it('the burstCast lump is exactly 34 × 90.81 (kit per-instance magnitude)', () => {
      expect(burstLump.length).toBeGreaterThan(0);
      for (const d of burstLump)
        expect(d.atkPct / FEATHER).toBeCloseTo(BURST_FEATHERS, 6);
    });

    it('the fullBurstEnd trickle lump is exactly 6 × 90.81', () => {
      expect(trickleLump.length).toBeGreaterThan(0);
      for (const d of trickleLump)
        expect(d.atkPct / FEATHER).toBeCloseTo(TRICKLE_FEATHERS, 6);
    });

    it('feathers are true-flavored riders: crit-eligible and range-excluded', () => {
      expect(feathers.every((d) => d.critEligible)).toBe(true);
      expect(feathers.every((d) => !d.rangeApplied)).toBe(true);
    });

    it('DISCRIMINATING: removing the feathers drops ~a quarter of her damage', () => {
      expect(
        einDamage(noFeathers.events, 'skill2').filter((d) => d.atkPct > 0),
      ).toEqual([]);
      expect(noFeathers.totals.ein).toBeLessThan(base.totals.ein * 0.8);
    });
  });

  describe('E6 — S2 Charge Damage ▲80% (permanent passive for an SR that always full-charges)', () => {
    const applied = einBuffs(base.events, 'chargeDamagePct').filter(
      (b) => b.value === 80,
    );

    it('is an 80% passive present from battle start with NO expiry', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([80]);
      expect(applied.some((b) => b.frame === 0)).toBe(true);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: removing it drops her charge damage', () => {
      expect(
        einBuffs(noS2Charge.events, 'chargeDamagePct').filter(
          (b) => b.value === 80,
        ),
      ).toEqual([]);
      expect(noS2Charge.totals.ein).toBeLessThan(base.totals.ein);
    });
  });

  describe('E7 — orb gauge: zero-damage dot driving team burst gauge (datamined, non-kit)', () => {
    const orbTicks = einDamage(base.events, 'skill2').filter(
      (d) => d.atkPct === 0,
    );

    it('emits zero-DIRECT-damage skill2 ticks (the dot drives gauge, not damage)', () => {
      expect(orbTicks.length).toBeGreaterThan(0);
      expect(orbTicks.reduce((s, d) => s + d.amount, 0)).toBe(0);
    });

    it('DISCRIMINATING: removing the dot removes the zero-damage ticks', () => {
      expect(
        einDamage(noOrb.events, 'skill2').filter((d) => d.atkPct === 0),
      ).toEqual([]);
    });
  });

  describe('E8 — S1 battle-start: 4 Near Feathers → 4×90.81% true at t=0', () => {
    const startFeathers = einDamage(base.events, 'skill1').filter(
      (d) => d.atkPct > 0,
    );

    it('fires exactly once at battle start, at 4× the kit per-instance magnitude', () => {
      expect(startFeathers.length).toBe(1);
      expect(startFeathers[0].frame).toBe(0);
      expect(startFeathers[0].atkPct / FEATHER).toBeCloseTo(4, 6);
    });

    it('is a true-flavored rider: crit-eligible, range-excluded, no FB major at t=0', () => {
      expect(startFeathers[0].critEligible).toBe(true);
      expect(startFeathers[0].rangeApplied).toBe(false);
      expect(startFeathers[0].fbMajorApplied).toBe(false);
    });

    it('DISCRIMINATING: removing it removes the t=0 feather hit', () => {
      expect(
        einDamage(noStartFeathers.events, 'skill1').filter((d) => d.atkPct > 0),
      ).toEqual([]);
    });
  });
});
````

### src/skills/overrides/ein.json

```json
{
  "note": "Tier audit (Bossing A). Parser skipped her three core mechanics; rebuilt from kit text + Prydwen's exact counts. S1: ATK 70.12%/10s on every Burst Stage 3 entry (parser missed the trigger phrasing; Prydwen confirms it lands BEFORE the burst cast and buffs burst damage — matches engine ordering). S1 battle-start: 4 Near Feathers summoned at t=0 -> passive flatDamage 4x90.81=363.24 true noRange, fires once at frame 0 (kit-autonomy gauntlet 2026-07-25; was previously skipped as minor). S2 Near Feathers: 90.81% true damage per instance; Prydwen: 34 instances per her burst ('1-4 after FB ends' — folded in) and ~6 instances between her bursts; feathers CAN CRIT, get the FB multiplier, but NOT the +30% range bonus (crit:true, noRange:true — this mechanic motivated the engine flags) -> burstCast flatDamage 34x90.81=3087.54 + fullBurstEnd flatDamage 6x90.81=544.86 (fires each rotation incl. hers; slight smear). S2 'Charge Damage 80% for 1 shot' primes every next shot ~= permanent +80 (parser read kept as passive; a per-shot trigger + durationShots:1 is mechanically infeasible — the shotFired trigger applies the buff AFTER the shot's damage is computed, verified zero benefit — so the permanent passive is the faithful steady-state for an SR that always full-charges). Burst restated: True Damage 55.3%/10s + Charge Damage 140.68%/10s self buffs + 300.02% true nuke. ORB GAUGE (2026-07-13, nikke-synergy arena data special_burst_gauge: add_interval_from_start value 5.6 interval 170f): her orb generates 560 energy every ~2.83s for the team - modeled as a zero-damage permanent dot whose ticks drive skillGauge (= her flat target 560 per tick, exactly the documented amount). Kit-autonomy gauntlet 2026-07-25.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 363.24,
          "flavor": "true",
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 70.12,
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
          "stat": "chargeDamagePct",
          "value": 80
        }
      ]
    },
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
          "kind": "flatDamage",
          "atkPct": 3087.54,
          "flavor": "true",
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 544.86,
          "flavor": "true",
          "noRange": true
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
      "effects": [
        {
          "kind": "dot",
          "atkPct": 0,
          "durationSec": 999,
          "intervalSec": 2.83
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
          "stat": "trueDamagePct",
          "value": 55.3,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 140.68,
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
          "atkPct": 300.02,
          "flavor": "true"
        }
      ]
    }
  ],
  "caveats": [
    "⚑2 MEASUREMENT-GATED (tier 2): Near Feather cadence (34 instances per her burst, 6 per rotation between bursts) is a community-sourced (Prydwen) estimate, not kit-derivable — kit only states 4 feathers at battle start + 6 summoned at burst. estimate: as shipped (34/burst burstCast lump + 6/rotation fullBurstEnd lump). recipe: ein-focused recording (U8) to read the real per-window feather count, then re-split the lumps.",
    "skill2: the between-burst feather trickle is keyed to full-burst COUNT (6 per FB end), not to time — comps with long rotations under-count it, fast rotations over-count it (part of ⚑2).",
    "⚑3 MEASUREMENT-GATED (tier 2): the 34-feather burstCast lump resolves at cast-instant, BEFORE her own True Damage ▲ 55.3% burst buff and teammates' full-burst-entry auras register (block order) — real feathers land inside the 10s window with those buffs up. Consequence: removing the true-damage buff drops her total only ~0.7% (the big lump never sees it) — the lump is under-credited ×1.553. estimate: +55.3% on the burstCast lump once inside the buff window. recipe: delaySec on the burstCast lump (or distribute it across the 10s window) once the ein-focus recording (U8) supplies the real feather timing."
  ]
}
```
