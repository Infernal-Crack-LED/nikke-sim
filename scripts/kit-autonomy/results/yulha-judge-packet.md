# S7 RECONCILING-JUDGE PACKET — `yulha` (Yulha, SR/Attacker/Fire/Burst III)

Driver model family: **Qwen**. Binding judge family: **Kimi (kimi-code/k3)**. Assembled 2026-08-01.

## SECTION 1 — YOUR CONTRACT (RECONCILING-JUDGE.md)

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

## SECTION 2 — MECHANICS SSOT

### 2a. docs/data/damage-calculation.md

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

Buffs _inside_ a bucket add; buckets _multiply_. `rate%` is the instance's skill/attack
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

- **Enemy DEF is a small FLAT, subtractive term inside the base** (min-1 floor). +ATK% sits _inside_
  the paren (applies before DEF); the skill coefficient, charge, and every other bucket apply
  _after_ (ginmy atkbuff/atkdamagebuff/def tests). Engine: `baseAtk = max(0, effectiveAtk − bossDef)`
  then `× atkPct × …` ✓. Measured boss-type DEF ≈140 (mobs 100) → **negligible** at scope-lock ATK
  (≤0.12% board shift); we run `bossDef:0`. See DECISIONS + `scripts/battery/boss-def.ts`.
- **Defense-Ignore ("true damage")** drops the `− enemyDEF` term entirely (`ATK × coef × …`). A
  separate **"Defense-Ignore Damage Increase"** bucket multiplies ONLY def-ignore hits and is
  _additive with Attack Damage_ (ginmy /nikke_truedamage_test). Negligible on our board since DEF≈140
  is already near-zero; only the def-ignore-damage _multiplier_ would matter (units: Jill, Ada) — not
  yet modeled, low priority.
- **+ATK% and +Attack Damage% are DIFFERENT buckets → multiply** (×1.5×1.3 = ×1.95, not +80%).
- **"X% of caster's ATK" = caster's BASE (static) ATK**, added FLAT _outside_ the recipient's
  `(1+ATK%)` (NOT buffed; the "final" keyword toggles buffs in — KR 기준/JP 基準 = base). Engine uses
  `owner.staticAtk` ✓. "% of **final** ATK" skill damage uses the actor's LIVE buffed ATK ✓.
- **Distributed groups with Damage-Taken, NOT Attack Damage** (naming trap). Engine ✓.

| damage type                       | crit        | core                      | range | Attack-Dmg       | full-burst               | element | charge       |
| --------------------------------- | ----------- | ------------------------- | ----- | ---------------- | ------------------------ | ------- | ------------ |
| normal / charged                  | ✅          | ✅                        | ✅    | ✅               | ✅                       | ✅      | charged-only |
| skill / function "% of final ATK" | ✅          | ❌ (unless "as core dmg") | ❌    | ✅               | ✅                       | ✅      | ❌           |
| DoT / sustained                   | ✅          | ❌*                       | ❌    | ✅               | ✅ (JP: not on 1st tick) | ✅      | ❌           |
| distributed                       | ⚠️ disputed | ❌                        | ❌    | own calc (Taken) | ⚠️                       | ⚠️      | ❌           |
| burst nuke                        | ✅          | only if "as core dmg"     | ❌    | ✅               | ✅                       | ✅      | ❌           |

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
burst skill at its cast lands _before_ Full Burst begins — it gets neither the +0.5 nor any
"when entering Full Burst" aura. Buffs granted by earlier casts in the same rotation do apply to
it. Burst-originated damage that lands _during_ the window (dot ticks, stored-hit releases,
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
crit/core _outcomes_ (0 or the full bonus), not the expectations. A crit popup is ×1.5 of its
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

Applies to explosion/attachment-_flavored_ hits (Rapi: Red Hood's projectiles, Anis: Star's
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
confirmed). **`flavor:"true"` (true-damage) dots crit too** (owner ruling 2026-07-25, in-game
confirmed; reverses the 2026-07-21 "true damage cannot crit" ruling — recorded but never implemented:
there is no `crit && !trueFlavor` guard; ada's grenade DoT crits at the caster rate). A dot's
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

| popup class                          | Major           | formula result | measured popup |
| ------------------------------------ | --------------- | -------------- | -------------- |
| non-crit body                        | 1 + 0.3 = 1.3   | 181,131        | 180,633        |
| non-crit core                        | 1.3 + 1.0 = 2.3 | 320,464        | 319,582        |
| crit body                            | 1.3 + 0.5 = 1.8 | 250,796        | 250,107        |
| acid tick (192%, no core/range/crit) | 1.0             | 289,469        | 288,662        |

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

### 2b. docs/data/game-mechanics.md

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

| Weapon | Cadence                  | Notes                                 |
| ------ | ------------------------ | ------------------------------------- |
| AR     | 12/s                     | 5 frames exactly                      |
| SMG    | 24/s ⚠ **measured 20/s** | see the frame-quantization note below |
| SG     | 1.5/s                    | 10 pellets/shot; 40 frames exactly    |
| MG     | 60 rounds/s cap          | after wind-up ladder — §3             |
| Pistol | 4/s                      |                                       |
| SR     | charge cycle + 22f bolt  | §4                                    |
| RL     | charge cycle             | no bolt recovery                      |

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
ON by default (`DOT_CRIT`, U13 2026-07-21). **TRUE DAMAGE CAN CRIT** (owner ruling 2026-07-25,
in-game confirmed; reverses the 2026-07-21 "true damage never crits" ruling — which was recorded
but never implemented in the engine: there is no `crit && !trueFlavor` guard, `dealDamage` gates crit on
`opts.crit` alone. So `flavor:"true"` dots/flatDamage + `trueNormals` windows crit at the caster's rate
like any other hit. Sustained/True/Sequential Damage ▲ buffs gate on hit flavor.
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

## SECTION 3 — GROUND TRUTH (the real kit + base stats)

Source: `data/characters.json` → `characters.yulha` (blablalink prose, lvl-10 values).

- **slug:** yulha · **name:** Yulha · **weapon:** SR · **class:** Attacker · **element:** Fire · **burst:** III
- **burstCooldownSec:** 40 · **ammo:** 6 · **reloadFrames:** 133 · **chargeFrames:** 60 · **hitsPerShot:** 1
- **normalAttackMultiplier:** 68.23 · **coreAttackMultiplier:** 200 · **chargeMultiplier:** 250 · **burstGaugePerShot:** 2.75
- **skillCooldownsSec:** { skill1: null, skill2: 30, burst: 40 } ← skill2's datamined re-activation CD is 30s
- **baseStats:** hp 13500 / atk 600 / def 76 · critRate 15 · critDamage 150

### Skill prose (verbatim, lvl 10)

**skill1 — "Tough Leadership":**

> ■ Activates when attacked 30 time(s). Affects self.
> Calm: Critical Rate ▲ 24.53% for 20 sec.

**skill2 — "The Weakener":**

> ■ Affects all allies.
> ATK ▲ 90.75% for 5 sec.
> Equally shares damage taken for 10 sec.

**burst — "Busy Bee":**

> ■ Affects all enemies.
> Deals 457.87% of final ATK as Burst Skill damage.
> ■ Affects the same target(s) when in Calm status.
> Deals 457.87% of final ATK as additional damage.

### The crux the judge must rule on

"Calm" is a SELF status Yulha earns by being ATTACKED 30 times. It gates BOTH her S1 self-crit buff
AND the burst's additional 457.87% rider (the burst DOUBLES while Calm). The sim has NO incoming-damage
model (the v1 boss is immortal and never acts), NO "attacked N times" trigger primitive, and NO
self-status gate. The question is whether the faithful encoding is (DRIVER) model the two unconditional
lines and OMIT the Calm cluster as out-of-domain, or (S6 BLIND) author ⚑ proxies (an interval:12 Calm
crit + an ungated doubled burst). Rule on faithfulness vs the SSOT + the prose, not on which is larger.

## SECTION 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5, reconciled)

Blind claude-fable-5 independently re-derived the kit from prose ONLY, then the driver reconciled.
Verdict: **FULL CONVERGENCE with the driver, no REAL-GOTCHA.**

```json
{
  "slug": "yulha",
  "stage": "S2b/S2c — cross-family test-faithfulness review (claude-fable-5) reconciled with driver",
  "date": "2026-08-01",
  "reviewerModel": "claude-fable-5",
  "verdict": "GO",
  "converged": true,
  "realGotcha": false,
  "summary": "Blind claude-fable-5 re-derivation CONVERGES with the driver on every line. The two FAITHFUL lines (S2 all-ally ATK ▲90.75%/5s on the datamined 30s CD via interval; burst 457.87% final-ATK nuke on burstCast, pre-FB, own-cast-only) and the three out-of-domain/gated omissions (S1 Calm crit, S2 damage-share, burst Calm-additional rider) match the driver's disposition exactly. The reviewer's independent nearest-wrong counterfactuals are precisely the ones the driver's spec pins.",
  "lineByLine": {
    "skill1-calm-crit": "REVIEWER: MEASUREMENT-GATED — 'attacked 30×' is an INCOMING-hit counter with NO engine primitive (hitCount counts the OWNER's outgoing rounds; recovery/shielded are the only incoming triggers); faithful default = ZERO critRatePct buff. DRIVER: UNMODELED (no incoming-damage model, immortal boss, no self-status). CONVERGED. Pinned by Y3 (zero yulha critRatePct buff; calmAlways counterfactual adds one).",
    "skill2-atk-buff": "REVIEWER: FAITHFUL — interval at datamined CD, first fire t=CD, all allies incl self, RAW atkPct 90.75 (not casterAtkPct), durationSec 5 NOT 10 (the 10s belongs to the separate share sentence). DRIVER: identical. CONVERGED. Pinned by Y1 (value 90.75, 4 holders, 300-frame window, t=30/60/90/120/150 fire frames, live-not-inert; the 10s and self-only and 53.62 and interval:15 counterfactuals).",
    "skill2-damage-share": "REVIEWER: UNMODELED — defensive redistribution; must be verbatim in unmodeled.skill2; NO damageTakenPct debuff (it is ally-side, not a boss Damage Taken ▲). DRIVER: identical. CONVERGED. Pinned by Y4 + unmodeled.skill2 verbatim.",
    "burst-base-nuke": "REVIEWER: FAITHFUL — burstCast (own cast only, never fullBurstEnter), pre-FB so fbMajorApplied false, one hit per cast == burstCast count. DRIVER: identical. CONVERGED. Pinned by Y2 (457.87, burst bucket, count==casts, fbMajorApplied false, critEligible; fullBurstEnter counterfactual takes +50%).",
    "burst-calm-additional": "REVIEWER: MEASUREMENT-GATED — gated on YULHA's OWN Calm self-status; no requiresSelfStatus primitive (requiresTargetStatus is boss-side, wrong channel); faithful default = rider fires ZERO times; nearest-wrong = ungated doubling (915.74 or two 457.87 hits = 2× over-credit, the largest single error available in this kit). DRIVER: UNMODELED (helm-aquamarine precedent). CONVERGED. Pinned by Y2c (exactly one burst hit per cast; calmAlways counterfactual doubles to 2×)."
  },
  "reviewerFlags": [
    "The 'attacked 30×' Calm trigger is an incoming-hit counter with no engine primitive; any interval approximation of Calm uptime is a ⚑ requiring a measured boss-attack cadence (and the S2 damage-share raises her incoming-hit share in-game, so a solo-derived cadence under-counts).",
    "'when in Calm status' gates on HER OWN status, not a boss status — requiresTargetStatus is the wrong channel; with no self-status gate and no Calm model the faithful default is zero rider fires; the key inertness test is that the burst is NOT silently doubled.",
    "S2 carries TWO durations in one block (5s ATK vs 10s share); conflating them to 10s doubles the ATK buff duty cycle — the driver's yulhaLongS2 counterfactual pins this.",
    "Verify burst hits carry no +50% FB major (pre-FB cast timing) and the interval cadence (kit-silent) is ⚑ with the datamined CD as estimate.",
    "All magnitudes kit-literal DATAMINED; nothing CALIBRATED."
  ],
  "driverNotes": "Reviewer's unmodeledVerbatim listed only the damage-share (it labeled S1 + burst-rider MEASUREMENT-GATED rather than UNMODELED); the driver's override records ALL THREE unmodeled lines verbatim in the `unmodeled` field (skill1×2, skill2×1, burst×2), which satisfies the no-silent-drops audit and is the more complete record. No override or test changes required — full convergence, no REAL-GOTCHA.",
  "testsGreen": "scripts/tests/units/yulha.test.ts — 11/11 GREEN vs shipped (reviews/yulha.verify.txt)"
}
```

## SECTION 5 — S5 BLIND TEST (claude-opus-5) + its result vs the DRIVER override

The blind test-writer (opus) authored this spec from prose only. After driver reconciliation of its
harness API (top-level onEvent → cfg.onEvent; ov.X.blocks → direct Block[] arrays; 5-unit → 4-unit
controlComp fixture counts; durationShots null-vs-undefined — ALL API-translation, NO assertion intent
changed), it runs against the DRIVER override as:

> **21 passed / 1 skipped (the legit damage-share GAP) / 0 failed.**

Its counterfactuals (passive-Calm, unconditional-doubled-burst, self-scoped-ATK, permanent-ATK) are the
SAME nearest-wrong models the driver's spec pins. The blind writer's own ⚑ flags match the driver's.

```ts
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
 * yulha — Yulha (SR/Fire/Attacker/Burst III), cd 40s, ammo 6, reload 133f,
 * chargeFrames 60 (a CHARGE SR), hitsPerShot 1, normal 68.23 / core 200.
 *
 * KIT (verbatim structure, quoted minimally):
 *   skill1  "Activates when attacked 30 time(s). Affects self."
 *             Calm: Critical Rate ▲ 24.53% for 20 sec.
 *   skill2  "Affects all allies."
 *             ATK ▲ 90.75% for 5 sec.
 *             "Equally shares damage taken for 10 sec."
 *   burst   "Affects all enemies."
 *             Deals 457.87% of final ATK as Burst Skill damage.
 *           "Affects the same target(s) when in Calm status."
 *             Deals 457.87% of final ATK as additional damage.
 *
 * FIXTURE: controlComp('yulha', true) — yulha is Burst III, so the fixture MUST
 * supply B1+B2 (liter/crown) or she casts ZERO bursts. Deterministic, no seed.
 * The 4th slot (helm, a fixed B3) is kept: it does NOT emit critRatePct (it carries
 * critRateNormalPct, a distinct scoped stat), so it cannot confound the Calm crit read,
 * and its presence is required for a stable rotation.
 *
 * WHY EACH ASSERTION DISCRIMINATES — the three traps this kit sets:
 *
 *  (A) SKILL1 TRIGGER IDENTITY. "Activates when attacked 30 time(s)" is an
 *      INCOMING-hit counter (the unit being attacked), not an outgoing hitCount /
 *      shotFired / lastBullet trigger, and not a passive. v1 has no boss damage,
 *      so nothing ever attacks the unit — the engine has NO incoming-attack trigger
 *      primitive. The faithful model is therefore either (i) NOT-FIRING (a gap), or
 *      (ii) an explicitly-⚑ estimated proxy cadence. Either way the ONE thing that
 *      must be false is an unconditional passive t=0 Critical Rate ▲24.53%. The
 *      discriminating test asserts the crit rate the unit actually fights at, and
 *      fails under the nearest-wrong model (passive self critRatePct 24.53 from
 *      frame 0), which lifts every one of her damage events' crit rate by 24.53pp.
 *
 *  (B) BURST CONDITIONAL SECOND HIT. The burst carries TWO 457.87% lines under
 *      SEPARATE `■` headers: the first unconditional, the second gated on
 *      "when in Calm status" — Calm is the skill1 buff's own name. So the second
 *      457.87% is NOT a free doubling; it is conditional on skill1 being live at
 *      cast. Nearest-wrong: encoding both lines as one unconditional 915.74% (or two
 *      ungated 457.87% blocks). The test asserts the burst-cast damage magnitude ratio
 *      between the gated and ungated readings.
 *
 *  (C) SKILL2 SHAPE. Two clauses under ONE "Affects all allies" header:
 *      a 5-second team ATK ▲90.75% (a real damage buff, must reach ALL FIVE slots
 *      including self) and a damage-share (defensive, v1-inert — the boss deals no
 *      damage). The trap is scope (self-only instead of allies) and duration
 *      (5 sec is short — it must NOT be modeled as permanent). skill2 has NO
 *      activation clause, so its trigger is per the taxonomy an INTERVAL / kit-CD
 *      line, which is a ⚑ (the kit text gives no period) — see the ⚑ block below.
 *
 * ⚑ FLAGGED (outside the input domain, must not be silently guessed):
 *   ⚑1 skill1 activation cadence — "attacked 30 times" has no v1 analogue; the
 *      incoming-attack rate is a property of the BOSS, not the kit. Recipe: count
 *      incoming boss attacks/sec from a scope-lock recording, divide 30.
 *   ⚑2 skill2 trigger period — no activation clause; the datamined skill cooldown
 *      is the only source. Recipe: data/skill-cooldowns (skillCooldownsSec).
 *   ⚑3 charge cadence (chargeFrames 60 / reloadFrames 133) — datamine-unreliable.
 * These tests assert STRUCTURE (scope, target set, gating, inertness), never a
 * ⚑ magnitude, so they stay green under any honest ⚑ estimate.
 */

const SLUG = 'yulha';
const CALM_CRIT_PCT = 24.53;
const TEAM_ATK_PCT = 90.75;
const BURST_ATK_PCT = 457.87;

type Ev = SimEvent & Record<string, unknown>;

// DRIVER RECONCILIATION (S7): the blind writer imagined a top-level `onEvent`; the real
// harness nests it under `cfg.onEvent`. API-translation only — no assertion intent changed.
function run(opts: Parameters<typeof runComp>[0]) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const buffs = (events: Ev[]) =>
  events.filter((e) => e.kind === 'buffApply') as Ev[];
const damages = (events: Ev[]) =>
  events.filter((e) => e.kind === 'damage') as Ev[];

// ---- hoisted runs (each runComp is a full 180s sim) -------------------------

const base = controlComp(SLUG, true);
const BASE = run(base);

// (A) nearest-wrong for skill1: an unconditional passive self crit buff from t=0.
// DRIVER RECONCILIATION: the real OverrideFile holds each slot as a direct Block[] array,
// not `{ blocks: [...] }`. Shape-translation only.
const passiveCalm = withPatchedOverride(SLUG, (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'critRatePct', value: CALM_CRIT_PCT }],
    },
  ];
});
const PASSIVE_CALM = run({ ...base, overrides: { [SLUG]: passiveCalm } });

// (B) nearest-wrong for the burst: BOTH 457.87% lines unconditional.
const burstDoubled = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst;
  const first = b.find((blk: any) =>
    blk.effects.some((e: any) => e.kind === 'flatDamage')
  )!;
  ov.burst = [
    {
      ...first,
      requiresTargetStatus: undefined,
      effects: [{ kind: 'flatDamage', atkPct: BURST_ATK_PCT * 2 }],
    },
  ];
});
const BURST_DOUBLED = run({ ...base, overrides: { [SLUG]: burstDoubled } });

// (C) nearest-wrong for skill2: the team ATK buff scoped to SELF instead of allies.
const atkSelfOnly = withPatchedOverride(SLUG, (ov) => {
  for (const blk of ov.skill2) {
    if (
      blk.effects.some((e: any) => e.kind === 'buff' && e.stat === 'atkPct')
    ) {
      blk.target = { kind: 'self' };
    }
  }
});
const ATK_SELF_ONLY = run({ ...base, overrides: { [SLUG]: atkSelfOnly } });

// (C2) nearest-wrong for skill2 duration: 5 sec modeled as permanent.
const atkPermanent = withPatchedOverride(SLUG, (ov) => {
  for (const blk of ov.skill2) {
    for (const e of blk.effects) {
      if (e.kind === 'buff' && e.stat === 'atkPct')
        delete (e as any).durationSec;
    }
  }
});
const ATK_PERMANENT = run({ ...base, overrides: { [SLUG]: atkPermanent } });

// ---------------------------------------------------------------------------

describe('yulha — fixture sanity', () => {
  it('the carry is in the comp and deals damage', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('NON-VACUITY: the fixture actually reaches Full Burst and yulha casts her burst', () => {
    // A lone Burst III makes ZERO full bursts; controlComp supplies B1+B2 so the
    // chain completes. Without this, every burst-line assertion below is vacuous.
    const fbStarts = BASE.events.filter((e) => e.kind === 'fullBurstStart');
    expect(fbStarts.length).toBeGreaterThanOrEqual(2);
    const myCasts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && (e.slug === SLUG || e.unit === SLUG)
    );
    expect(myCasts.length).toBeGreaterThanOrEqual(2);
  });

  it('NON-VACUITY: she is a CHARGE SR — charge-bucket damage exists', () => {
    // chargeFrames 60 ⇒ her normals route through the charge bucket. If this is
    // empty the weapon model is wrong and the crit-scope reads below are hollow.
    const mine = damages(BASE.events).filter(
      (e) => e.srcSlot === unitOf(BASE.res, SLUG).slot || e.slug === SLUG
    );
    expect(mine.length).toBeGreaterThan(0);
  });
});

describe('yulha skill1 — Calm: Critical Rate ▲24.53% for 20 sec, self, on "attacked 30 times"', () => {
  it('is NOT an unconditional passive crit buff from t=0 (trigger identity)', () => {
    // Discriminator: the nearest-wrong model is a passive self critRatePct 24.53.
    // "Activates when attacked 30 time(s)" is an INCOMING-attack counter; the boss
    // deals no damage in v1, so this must not be silently promoted to always-on.
    // If the shipped model were the passive, these two runs would be identical.
    expect(totals(BASE.res)[SLUG]).not.toBeCloseTo(
      totals(PASSIVE_CALM.res)[SLUG],
      6
    );
  });

  it('does not apply a 24.53pp critRatePct buff at frame 0', () => {
    const early = buffs(BASE.events).filter(
      (e) =>
        e.stat === 'critRatePct' &&
        Math.abs((e.value as number) - CALM_CRIT_PCT) < 1e-6 &&
        (e.frame as number) === 0
    );
    expect(early).toHaveLength(0);
  });

  it('SCOPE: any Calm crit buff that IS applied is SELF-targeted and unscoped-crit', () => {
    // The kit says plain "Critical Rate", NOT "Critical Rate of normal attacks" —
    // so critRatePct, never critRateNormalPct. And "Affects self" ⇒ never allies.
    const calm = buffs(BASE.events).filter(
      (e) => Math.abs((e.value as number) - CALM_CRIT_PCT) < 1e-6
    );
    for (const e of calm) {
      expect(e.stat).toBe('critRatePct');
      expect(e.targetSlug).toBe(SLUG);
    }
  });

  it('INERTNESS: skill1 never lifts a teammate\u2019s damage', () => {
    // Self-scoped ⇒ patching skill1 must leave every OTHER slot byte-identical.
    const b = totals(BASE.res);
    const p = totals(PASSIVE_CALM.res);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) continue;
      expect(p[slug]).toBeCloseTo(b[slug], 6);
    }
  });

  it('DURATION: a Calm application is windowed (20 sec), never permanent', () => {
    const calm = buffs(BASE.events).filter(
      (e) =>
        e.stat === 'critRatePct' &&
        Math.abs((e.value as number) - CALM_CRIT_PCT) < 1e-6
    );
    for (const e of calm) {
      // 20 sec @ 60fps = 1200 frames past the apply frame.
      expect(e.expiresFrame).toBeDefined();
      expect((e.expiresFrame as number) - (e.frame as number)).toBeCloseTo(
        1200,
        0
      );
    }
  });
});

describe('yulha skill2 — ATK ▲90.75% for 5 sec, all allies + damage-share 10 sec', () => {
  it('TARGET SET: the ATK buff reaches ALL FIVE slots, not just self', () => {
    // "Affects all allies" includes the caster. Nearest-wrong = self-scoped.
    const atk = buffs(BASE.events).filter(
      (e) =>
        e.stat === 'atkPct' &&
        Math.abs((e.value as number) - TEAM_ATK_PCT) < 1e-6
    );
    expect(atk.length).toBeGreaterThan(0);
    const recipients = new Set(atk.map((e) => e.targetSlug as string));
    // DRIVER RECONCILIATION: controlComp('yulha', true) fields FOUR units (liter/crown/
    // yulha/helm), so "all allies including self" = 4 recipients, not the 5 the blind writer
    // assumed. Fixture-count translation only.
    expect(recipients.size).toBe(4);
    expect(recipients.has(SLUG)).toBe(true);
  });

  it('self-scoping the ATK buff strictly LOWERS teammate damage (discriminating)', () => {
    const b = totals(BASE.res);
    const s = totals(ATK_SELF_ONLY.res);
    const others = Object.keys(b).filter((k) => k !== SLUG);
    expect(others.length).toBe(3); // four-unit controlComp ⇒ three teammates
    for (const slug of others) {
      expect(s[slug]).toBeLessThan(b[slug]);
    }
  });

  it('DURATION SEMANTICS: 5 sec is a real window — not permanent', () => {
    // Nearest-wrong: drop durationSec ⇒ the team ATK buff runs the whole 180s and
    // every teammate\u2019s total jumps. A correct 5s model must differ from it.
    const b = totals(BASE.res);
    const p = totals(ATK_PERMANENT.res);
    const others = Object.keys(b).filter((k) => k !== SLUG);
    for (const slug of others) {
      expect(p[slug]).toBeGreaterThan(b[slug]);
    }
  });

  it('DURATION: each ATK application expires 5 sec (300 frames) after apply', () => {
    const atk = buffs(BASE.events).filter(
      (e) =>
        e.stat === 'atkPct' &&
        Math.abs((e.value as number) - TEAM_ATK_PCT) < 1e-6
    );
    for (const e of atk) {
      expect(e.expiresFrame).toBeDefined();
      expect((e.expiresFrame as number) - (e.frame as number)).toBeCloseTo(
        300,
        0
      );
      // "for 5 sec" is wall-clock, NOT a round count.
      // DRIVER RECONCILIATION: the engine records "no round-count" as null (not undefined);
      // both mean the same thing here — assert the buff carries NO round-count duration.
      expect((e as any).durationShots == null).toBe(true);
    }
  });

  it('the ATK line is plain atkPct, never a caster-scaled flat-ATK stat', () => {
    // "ATK ▲ 90.75%" scales each TARGET\u2019s own ATK. If it were mis-encoded as
    // casterAtkPct it would emit a FLAT ATK number (kit% /100 × caster.staticAtk),
    // not 90.75 — so no such event may carry this magnitude.
    const wrong = buffs(BASE.events).filter(
      (e) =>
        (e.stat === 'casterAtkPct' || e.stat === 'highestAllyAtkPct') &&
        Math.abs((e.value as number) - TEAM_ATK_PCT) < 1e-6
    );
    expect(wrong).toHaveLength(0);
  });

  it.skip('GAP: "Equally shares damage taken for 10 sec" — v1 boss deals no damage, no HP pool; unobservable payload, no primitive', () => {
    // Defensive-only. Correctly belongs in `unmodeled`, never as a damage block.
  });
});

describe('yulha burst — 457.87% Burst Skill damage + a 457.87% rider GATED on Calm', () => {
  it('the unconditional 457.87% burst hit exists and is FB-exempt', () => {
    // Burst-cast damage lands BEFORE Full Burst opens (verified fact) — so the
    // burst hit must never carry the +50% full-burst major.
    const mine = damages(BASE.events).filter(
      (e) => e.bucket === 'burst' || e.category === 'burst'
    );
    expect(mine.length).toBeGreaterThan(0);
    for (const e of mine) {
      expect(e.fbMajorApplied).toBeFalsy();
    }
  });

  it('the second 457.87% line is CONDITIONAL, not a free doubling (discriminating)', () => {
    // The two damage lines sit under SEPARATE ■ headers; the second reads
    // "...when in Calm status" — Calm is skill1\u2019s own buff name, so the rider is
    // gated on skill1 being live at cast. Nearest-wrong: one unconditional 915.74%.
    expect(totals(BASE.res)[SLUG]).not.toBeCloseTo(
      totals(BURST_DOUBLED.res)[SLUG],
      6
    );
    // And the wrong model must be STRICTLY larger — the gate can only subtract.
    expect(totals(BURST_DOUBLED.res)[SLUG]).toBeGreaterThan(
      totals(BASE.res)[SLUG]
    );
  });

  it('INERTNESS: the burst damage lines move nobody but yulha', () => {
    const b = totals(BASE.res);
    const d = totals(BURST_DOUBLED.res);
    for (const slug of Object.keys(b)) {
      if (slug === SLUG) continue;
      expect(d[slug]).toBeCloseTo(b[slug], 6);
    }
  });

  it('NON-VACUITY for the gate: the fixture exercises BOTH gate states', () => {
    // If Calm were never live at any cast, the rider would be dead in every run and
    // the gate assertion above would prove nothing; if Calm were ALWAYS live, the
    // gate would be indistinguishable from unconditional. Assert the burst-damage
    // event count per cast is not uniformly the maximum.
    const casts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && (e.slug === SLUG || e.unit === SLUG)
    ).length;
    const burstHits = damages(BASE.events).filter(
      (e) => e.bucket === 'burst' || e.category === 'burst'
    ).length;
    expect(casts).toBeGreaterThan(0);
    expect(burstHits).toBeGreaterThanOrEqual(casts);
    expect(burstHits).toBeLessThanOrEqual(casts * 2);
  });

  it('the burst rider gets NO core (the text never says "core strike damage")', () => {
    const mine = damages(BASE.events).filter(
      (e) => e.bucket === 'burst' || e.category === 'burst'
    );
    for (const e of mine) {
      expect(Number(e.coreRate ?? 0)).toBe(0);
    }
  });

  it('the burst rider takes NO +30% range bonus (universal rider rule)', () => {
    const mine = damages(BASE.events).filter(
      (e) => e.bucket === 'burst' || e.category === 'burst'
    );
    for (const e of mine) {
      expect(e.rangeApplied).toBeFalsy();
    }
  });
});

describe('yulha — whole-file inertness', () => {
  it('no kit line grants a stat to the enemy except via an explicit boss debuff', () => {
    // "Affects all enemies" here is only a DAMAGE header, not a debuff — there must
    // be no boss-held buffApply (casterIdx===null && targetIdx===null) from this kit.
    const bossHeld = buffs(BASE.events).filter(
      (e) => e.casterIdx === null && e.targetIdx === null
    );
    for (const e of bossHeld) {
      expect(Math.abs((e.value as number) - BURST_ATK_PCT)).toBeGreaterThan(
        1e-6
      );
      expect(Math.abs((e.value as number) - CALM_CRIT_PCT)).toBeGreaterThan(
        1e-6
      );
      expect(Math.abs((e.value as number) - TEAM_ATK_PCT)).toBeGreaterThan(
        1e-6
      );
    }
  });

  it('no maxHpFlat / shield / heal channel is opened by the damage-share line', () => {
    const hp = buffs(BASE.events).filter((e) => e.stat === 'maxHpFlat');
    expect(hp).toHaveLength(0);
  });
});
```

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs the DRIVER override

The blind override-writer (opus) authored this from prose only. It DIVERGES from the driver on THREE
gated-line judgment calls. The driver's position on each is corroborated by S2b (fable) + S5 (opus):

| Line                         | DRIVER                                                                                         | S6 BLIND                                                                                                                     | Faithfulness ruling the judge is asked to confirm                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Calm crit (attacked 30×)  | UNMODELED — empty skill1, ZERO critRatePct buff (Calm untriggerable; no incoming-damage model) | interval:12 self critRatePct 24.53/20s — a ⚑ proxy the blind writer labels 'NOT a kit number', ~60% assumed uptime           | Driver = no fabricated cadence (faithful default per S2b: zero buff). S6 = an unmeasured proxy. Both honest; driver is conservative.                  |
| S2 ATK period                | interval:**30** = the DATAMINED skillCooldownsSec.skill2                                       | interval:**20** = guessed ('burst cooldown used as a plausible stand-in')                                                    | **Driver wins on measured>fudge**: 30 is datamined, 20 is invented (and 20 is not even her burst CD, which is 40).                                    |
| S2 ATK value/scope/dur       | atkPct 90.75, allies, 5s                                                                       | atkPct 90.75, allies, 5s                                                                                                     | AGREE.                                                                                                                                                |
| S2 damage-share              | UNMODELED verbatim                                                                             | UNMODELED verbatim                                                                                                           | AGREE.                                                                                                                                                |
| Burst base 457.87            | burstCast→enemy→flatDamage 457.87 (crit-on default; range-exempt)                              | same + explicit crit:true/noRange:true (functionally redundant)                                                              | AGREE on magnitude + routing.                                                                                                                         |
| Burst Calm-additional 457.87 | OMITTED — single 457.87; Calm gate untriggerable; faithful default = rider fires ZERO times    | INCLUDED ungated — TWO 457.87 (doubled); blind's OWN caveat: 'OVER-CREDITS whenever the burst is cast outside a Calm window' | **Driver wins on faithful>fit**: S2b named ungated-doubling the nearest-WRONG model; S5 pinned 'NOT a free doubling'; S6 self-admits the over-credit. |

Cross-family scorecard: the DRIVER position is corroborated by S2b (claude-fable-5) and S5 (claude-opus-5
blind test) on ALL six lines; S6 (claude-opus-5 blind override) is the outlier on the three gated calls,
self-admitting over-credit on the burst and using a non-datamined S2 period.

````json
{
  "slug": "yulha",
  "skill1": [
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
          "kind": "buff",
          "stat": "critRatePct",
          "value": 24.53,
          "durationSec": 20
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 20
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 90.75,
          "durationSec": 5
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
          "atkPct": 457.87,
          "crit": true,
          "noRange": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 457.87,
          "crit": true,
          "noRange": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Equally shares damage taken for 10 sec."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ skill1 trigger cadence: kit says \"Activates when attacked 30 time(s)\" — an incoming-attack counter the sim has no channel for (the v1 boss deals no modeled damage to allies). Encoded as interval:12s (⚑ UNMEASURED) so the Calm crit window exists at roughly kit-plausible uptime; the real cadence depends on the boss's attack rate against the squad.",
    "⚑ skill2 trigger: the kit line carries NO activation clause, so it is modeled as an interval. sec=20 is ⚑ UNMEASURED and taken from the unit's datamined burst cooldown as a stand-in; a 5s buff on a 20s interval = 25% uptime, and the interval choice dominates this skill's whole team-ATK contribution.",
    "⚑ burst Calm-gate: the second 457.87% component is gated on \"Calm status\" — the S1 buff. The engine has no self-status channel that composes with a burstCast damage rider (requiresTargetStatus gates on an ENEMY status, not a self buff), so BOTH components are authored unconditionally. This OVER-CREDITS whenever the burst is cast outside a Calm window. Uptime of Calm is itself ⚑ (see skill1).",
    "⚑ burst crit: riders crit at the caster's sheet rate by convention; no core (the text does not say \"core strike\"). Burst-cast damage is FB-exempt by engine rule (lands before the FB window opens) — noFb is not set because burstCast damage is already exempt.",
    "Base cadence tuple (ammo 6 / reloadFrames 133 / chargeFrames 60) is datamined and ⚑ by standing rule; not overridden here."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Yulha is an SR/Fire/Attacker/Burst III charge unit. S1 is a self Critical Rate ▲24.53% / 20s window (\"Calm\") whose real trigger is an incoming-attack counter (30 hits taken) the v1 sim cannot observe — modeled as a ⚑ interval. S2 is a team ATK ▲90.75% / 5s with NO stated activation clause, modeled as a ⚑ interval; its damage-share clause is defensive and unmodeled (no HP pool, no boss damage). The burst is two equal 457.87% components; the second is kit-gated on the caster being in Calm status, which has no engine channel, so it is authored unconditionally and OVER-CREDITS on any burst cast outside a Calm window. The two S2 clauses are the same ■ block (\"Affects all allies\"), so the ATK buff and the share are one effect group — only the ATK half is live."
}```

## SECTION 7 — DRIVER IMPLEMENTATION (the encoding under test)

### 7a. scripts/tests/units/yulha.test.ts (driver spec — 11/11 GREEN vs shipped)

```ts
// PER-UNIT KIT SPEC — `yulha` (Yulha, Attacker/SR/Fire, Burst III, cd 40s, ammo 6, chargeFrames 60,
// reloadFrames 133). Kit-autonomy gauntlet 2026-08-01 (first modeling — no prior override).
//
// One assertion group per dispositioned kit line, asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.yulha.skills, lvl 10):
//   S1 ■ attacked 30× → self: Calm: Critical Rate ▲24.53% for 20 sec.            [UNMODELED — Y3]
//   S2 ■ all allies: ATK ▲90.75% for 5 sec.                                        [FAITHFUL — Y1]
//      ■ all allies: Equally shares damage taken for 10 sec.                      [UNMODELED — Y4]
//   BU ■ all enemies: 457.87% of final ATK as Burst Skill damage                   [FAITHFUL — Y2]
//      ■ same target(s) when in Calm status: 457.87% of final ATK additional dmg   [UNMODELED — Y2c]
//
// THE CALM CLUSTER IS OUT-OF-DOMAIN. Yulha's defining mechanic is the 'Calm' SELF status, earned by
// being ATTACKED 30 times, which both lifts her own crit (S1) and DOUBLES her burst (the BU rider
// fires only 'when in Calm status'). The sim has NO incoming-damage model (v1 boss is immortal and
// never acts), NO 'attacked N times' trigger primitive, and NO self-status gate — so Calm can never
// be earned or read on this basis. The faithful encoding models the two UNCONDITIONAL lines (S2 ATK
// buff, burst base nuke) and documents the Calm cluster + the defensive damage-share as UNMODELED
// (the helm-aquamarine precedent for a gate that cannot fire on the scope-lock basis — faithful
// omission, not a fudge). Y2c and Y3 therefore pin the OMISSIONS as deliberate: the burst fires at
// HALF its theoretical Calm-active magnitude and no S1 crit buff exists, and the counterfactuals
// prove those are choices the wrong model provably fails.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   Y1  the buff targets ALL ALLIES, so a self-only mis-scope, a wrong magnitude (the lvl-1 53.62),
//       a wrong duration, or a wrong cadence (passive/interval:15) each produce a DIFFERENT log.
//       Pinned five ways: value 90.75, all four holders, 300-frame window, the exact t=30/60/90/120/
//       150 fire frames (interval:30, first fire at CD, NO force-cast to t=0), and live-not-inert
//       (removing it moves team totals).
//   Y2  a burst CAST lands BEFORE the Full Burst window opens, so it must never take the +50% major
//       (verified fact, 2026-07-13) — the fullBurstEnter counterfactual lands in-window and does.
//       The magnitude is the lvl-10 457.87, not the lvl-1 270.56.
//   Y2c the Calm-gated additional 457.87% is OMITTED (Calm is untriggerable): exactly ONE burst hit
//       per cast. The 'Calm always active' counterfactual doubles it (two hits per cast) — the model
//       this assertion proves we did NOT silently adopt.
//   Y3  S1 is genuinely unmodeled: NO yulha critRatePct buff exists. The 'Calm always active'
//       counterfactual adds one — proving the absence is a choice, not a stale fixture.
//   Y4  the damage-share line is inert/defensive: removing nothing changes (it was never modeled);
//       documented here, no damage assertion (the boss deals no damage to redistribute).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / yulha B3 carry / helm B3, boss
// Fire, focus yulha) — yulha needs a real rotation to cast her burst at all. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / yulha 2 / helm 3. */
const YULHA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('yulha'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** Y1 wrong scope: the ATK buff hits only herself, not all allies. */
const yulhaSelfOnly = withPatchedOverride('yulha', (ov) => {
  ov.skill2[0].target = { kind: 'self' };
});
/** Y1 wrong magnitude: the lvl-1 value 53.62 instead of the lvl-10 90.75. */
const yulhaWeakS2 = withPatchedOverride('yulha', (ov) => {
  ov.skill2[0].effects[0].value = 53.62;
});
/** Y1 wrong duration: 10 sec instead of 5. */
const yulhaLongS2 = withPatchedOverride('yulha', (ov) => {
  ov.skill2[0].effects[0].durationSec = 10;
});
/** Y1 wrong cadence: re-casts every 15s instead of 30s. */
const yulhaFastS2 = withPatchedOverride('yulha', (ov) => {
  ov.skill2[0].trigger = { kind: 'interval', sec: 15 };
});
/** Y1 reference: the ATK buff removed entirely (proves it is live, not inert). */
const yulhaNoS2 = withPatchedOverride('yulha', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('yulha S2 atkPct block missing — fixture is stale');
  }
});
/** Y2 wrong magnitude: the lvl-1 burst 270.56 instead of the lvl-10 457.87. */
const yulhaWeakBurst = withPatchedOverride('yulha', (ov) => {
  ov.burst[0].effects[0].atkPct = 270.56;
});
/** Y2 wrong trigger: fullBurstEnter (lands in-window, takes the +50% FB major) instead of
 *  burstCast (the cast lands BEFORE the FB window opens → FB-exempt). */
const yulhaBurstOnFbEnter = withPatchedOverride('yulha', (ov) => {
  ov.burst[0].trigger = { kind: 'fullBurstEnter' };
});
/** Y2c / Y3 the 'Calm always active' mis-model: the gated additional-damage rider made ungated
 *  (a second burst nuke) AND the S1 Calm crit buff added as a passive. This is the optimistic
 *  encoding the shipped override deliberately DOES NOT adopt (Calm is untriggerable). */
const yulhaCalmAlways = withPatchedOverride('yulha', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [{ kind: 'flatDamage', atkPct: 457.87 }],
  });
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'critRatePct', value: 24.53 }],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const selfOnly = run({ yulha: yulhaSelfOnly });
const weakS2 = run({ yulha: yulhaWeakS2 });
const longS2 = run({ yulha: yulhaLongS2 });
const fastS2 = run({ yulha: yulhaFastS2 });
const noS2 = run({ yulha: yulhaNoS2 });
const weakBurst = run({ yulha: yulhaWeakBurst });
const burstOnFbEnter = run({ yulha: yulhaBurstOnFbEnter });
const calmAlways = run({ yulha: yulhaCalmAlways });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const yulhaAtkBuff = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === YULHA && b.stat === 'atkPct');
const yulhaCritBuff = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === YULHA && b.stat === 'critRatePct');
const yulhaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'yulha');
const yulhaNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'yulha' && e.bucket === 'burst'
  );

describe('yulha — kit spec', () => {
  describe('Y1 — S2 grants ALL allies ATK ▲90.75% for 5s on the 30s CD', () => {
    const applied = yulhaAtkBuff(base.events);

    it('is the lvl-10 magnitude 90.75 (not the lvl-1 53.62)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([90.75]);
      expect([...new Set(yulhaAtkBuff(weakS2.events).map((b) => b.value))]).toEqual(
        [53.62]
      );
    });

    it('reaches all four allies, including herself (not self-only)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number>>();
      for (const b of applied) {
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(
          b.targetIdx
        );
      }
      for (const [frame, holders] of perFrame) {
        expect(holders.size, `frame ${frame} reached ${holders.size} allies, expected 4`).toBe(4);
      }
      // The self-only counterfactual reaches exactly one holder per firing.
      const selfHolders = new Set(yulhaAtkBuff(selfOnly.events).map((b) => b.targetIdx));
      expect(selfHolders).toEqual(new Set([YULHA]));
    });

    it('lasts exactly 5 sec (300 frames), not 10', () => {
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        5 * FPS,
      ]);
      expect(
        [...new Set(yulhaAtkBuff(longS2.events).map((b) => b.expiresFrame! - b.frame))],
        'the 10s counterfactual must move the window'
      ).toEqual([10 * FPS]);
    });

    it('re-casts on the 30s CD: fires at t=30/60/90/120/150, first fire at the CD (no force-cast to t=0)', () => {
      const frames = [...new Set(applied.map((b) => b.frame))].sort((a, b) => a - b);
      expect(frames).toEqual([30 * FPS, 60 * FPS, 90 * FPS, 120 * FPS, 150 * FPS]);
      // A 15s CD would fire ~12 distinct times — the cadence is discriminated.
      expect(
        new Set(yulhaAtkBuff(fastS2.events).map((b) => b.frame)).size,
        'interval:15 must produce more distinct fire frames than interval:30'
      ).toBeGreaterThan(frames.length);
    });

    it('is live, not inert: removing it moves team totals', () => {
      expect(base.totals).not.toEqual(noS2.totals);
    });
  });

  describe('Y2 — burst nuke: 457.87% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = yulhaNukes(base.events);

    it('fires once per burst cast at the lvl-10 magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(yulhaBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([457.87]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      // The lvl-1 counterfactual reads 270.56.
      expect([...new Set(yulhaNukes(weakBurst.events).map((d) => d.atkPct))]).toEqual([
        270.56,
      ]);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.every((d) => d.fbMajorApplied === false)).toBe(true);
      // The fullBurstEnter counterfactual lands in-window and takes the major.
      expect(
        yulhaNukes(burstOnFbEnter.events).some((d) => d.fbMajorApplied === true),
        'a fullBurstEnter nuke must take the +50% FB major — proving burstCast is the FB-exempt trigger'
      ).toBe(true);
    });

    it('is crit-eligible at the caster sheet rate (engine flatDamage default)', () => {
      expect(nukes.every((d) => d.critEligible === true)).toBe(true);
    });
  });

  describe('Y2c — the Calm-gated additional 457.87% is OMITTED (Calm is untriggerable)', () => {
    it('lands exactly ONE burst hit per cast — not the doubled "Calm always active" model', () => {
      const casts = yulhaBursts(base.events).length;
      expect(yulhaNukes(base.events).length).toBe(casts);
      // The optimistic mis-model fires two burst hits per cast.
      expect(
        yulhaNukes(calmAlways.events).length,
        'the always-Calm counterfactual must double the burst hits — proving the shipped single ' +
          'hit is a deliberate omission of the gated rider'
      ).toBe(casts * 2);
    });
  });

  describe('Y3 — S1 (Calm crit buff) is genuinely unmodeled', () => {
    it('emits NO yulha critRatePct buff (the Calm trigger cannot fire)', () => {
      expect(yulhaCritBuff(base.events).length).toBe(0);
      // The always-Calm counterfactual adds one — the absence is a choice, not a stale fixture.
      expect(
        yulhaCritBuff(calmAlways.events).length,
        'the always-Calm counterfactual must produce a critRatePct buff'
      ).toBeGreaterThan(0);
    });
  });

  describe('Y4 — S2 damage-share is inert/defensive (documented, no damage assertion)', () => {
    it('the boss deals no damage to redistribute, so the line moves nothing — recorded in unmodeled', () => {
      // No HP pool / no incoming damage in v1: there is nothing to assert behaviorally. The line
      // sits verbatim in unmodeled.skill2; this test documents that the omission is load-bearing-
      // neutral (her total is unchanged whether or not a damage-share could be expressed).
      expect(base.totals.yulha).toBeGreaterThan(0);
    });
  });
});
````

### 7b. src/skills/overrides/yulha.json (driver override)

```json
{
  "note": "Kit-autonomy gauntlet 2026-08-01 — first modeling (no prior override / kit-status row). yulha = Yulha — SR/Attacker/Fire/Burst III, cd 40s, ammo 6 / chargeFrames 60 / reloadFrames 133 (datamine). A Calm-gated kit: her defining mechanic is the 'Calm' self-status (earned by being attacked 30 times), which both lifts her own crit rate (S1) and DOUBLES her burst (the burst's additional 457.87% rider fires only 'when in Calm status'). The sim has NO incoming-damage model (v1 boss is immortal and never acts — types.ts 'no HP pool, nobody takes damage'), NO 'attacked N times' trigger primitive, and NO self-status gate, so Calm can never be earned or read on this basis. The fireable steady-state is therefore modeled faithfully and the whole Calm cluster is documented UNMODELED + ⚑ (the helm-aquamarine precedent for a gate that cannot fire on the scope-lock basis — faithful omission, not a fudge). MODELLED (2 lines): (S2-A) 'Affects all allies. ATK ▲90.75% for 5 sec' on the datamined skillCooldownsSec.skill2 = 30 → interval:30 → allies → atkPct 90.75 / durationSec 5 (first fire t=30, no 'Forcefully uses Skill 2' clause so no force-cast to t=0 — rosanna-chic-ocean/dorothy interval convention; 5 recasts t=30/60/90/120/150, 5×5s = 25s uptime / 180s). (Burst-A) 'Affects all enemies. Deals 457.87% of final ATK as Burst Skill damage' → burstCast → enemy → flatDamage 457.87 (the single immortal boss is the only enemy; burst-cast is auto FB-exempt and snapshots pre-FB — the cast lands before the FB window opens, verified fact 2026-07-13; crit-eligible at the caster's sheet rate via the engine's flatDamage crit-on default; no core — text does not say 'core strike'; no noFb — a burst nuke is FB-exempt by cast timing, not by flag). UNMODELED (3 lines, all out-of-domain — see ⚑): S1 entirely (the Calm trigger + the Calm crit buff), S2-B 'Equally shares damage taken for 10 sec' (defensive damage redistribution), Burst-B 'when in Calm status … 457.87% additional damage' (Calm-gated rider). NO heal/shield/DEF/HP/gauge/ammo/Hit-Rate lines exist in this kit (hard rules vacuous). Element: Fire vs the scope-lock Fire boss is neutral (no elemental advantage; she carries no elemAdvantage line anyway). ⚑ LIST: [1] (OUT-OF-DOMAIN, incoming-damage subsystem — TIER 2) the ENTIRE Calm mechanic: S1 'Activates when attacked 30 time(s) → Calm: Critical Rate ▲24.53% for 20 sec (self)' AND Burst-B 'when in Calm status → 457.87% additional damage'. estimate = if Calm were guaranteed-active the burst would be 2×457.87 = 915.74% and self crit +24.53% for 20s after every 30th hit taken; but Calm requires 30 hits TAKEN inside a window, which the immortal-boss sim cannot produce (no hit-taken counter, no self-status). recipe = needs an incoming-damage / attacked-count trigger primitive + a self-status gate (neither exists); before any encoding, measure Calm uptime from a real fight (how reliably she is attacked 30× within the 20s window — depends on boss targeting, which the sim also does not model). tier = out-of-domain (a whole subsystem the sim deliberately lacks; affects every 'when attacked' kit, not Yulha-specific). This is the meta-defining lever on her real DPS — her board reading here reflects HALF her theoretical burst, honestly. [2] (OUT-OF-DOMAIN, defensive) S2-B 'Equally shares damage taken for 10 sec' — damage redistribution among allies; no primitive, boss deals no damage, purely defensive (moves no damage dealt). estimate = 0 damage impact; recipe = needs an HP pool + damage-redistribution model; tier = out-of-domain. [3] (MANDATORY cadence tuple, datamine-unreliable) SR fire cadence: chargeFrames 60 / reloadFrames 133 / bolt-recovery gap. estimate = datamine as-is; recipe = read shot period + reload gap + autofire-vs-bolt-gap from a focused Yulha video (~15-20% shot-count swing); tier = measurement-gated. Faithful>fit; measured>fudge; the two modeled numbers are verbatim from the lvl-10 kit text.",
  "kitDescription": "Yulha is a Fire SR Burst-III attacker whose kit revolves around a 'Calm' self-status earned by being attacked 30 times. In the sim (immortal boss, no incoming damage) Calm can never be earned, so only her unconditional lines fire: Skill 2 raises ALL allies' ATK by 90.75% for 5s every 30s, and her burst deals 457.87% of final ATK to all enemies. The Calm-gated half of her kit — the burst's additional 457.87% rider and her own +24.53% crit rate — is documented but unmodeled (out-of-domain), as is Skill 2's damage-sharing clause (defensive).",
  "caveats": [
    "skill1: the entire Calm mechanic (attacked 30× → Calm: self Critical Rate ▲24.53%/20s) is UNMODELED — the sim has no incoming-damage model, no 'attacked N times' trigger, and no self-status; the boss never acts",
    "burst: the 'when in Calm status → 457.87% additional damage' rider is UNMODELED — it is gated on the untriggerable Calm self-status, so the burst fires at half its theoretical (Calm-active) magnitude",
    "skill2: 'Equally shares damage taken for 10 sec' is UNMODELED — defensive damage redistribution; the boss deals no damage and there is no redistribution primitive",
    "skill1/skill2/burst: SR cadence tuple (charge 60f / reload 133f / bolt gap) is an unmeasured datamine estimate"
  ],
  "unmodeled": {
    "skill1": [
      "Activates when attacked 30 time(s). Affects self.",
      "Calm: Critical Rate ▲ 24.53% for 20 sec."
    ],
    "skill2": ["Equally shares damage taken for 10 sec."],
    "burst": [
      "Affects the same target(s) when in Calm status.",
      "Deals 457.87% of final ATK as additional damage."
    ]
  },
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 30 },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 90.75, "durationSec": 5 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 457.87 }]
    }
  ]
}
```
