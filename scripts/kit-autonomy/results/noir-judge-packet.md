# RECONCILING-JUDGE PACKET — noir (Noir)

## SECTION 1 — RECONCILING-JUDGE CONTRACT

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

---

## SECTION 2 — MECHANICS SSOT

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

## SECTION 3 — GROUND TRUTH (kit prose + base stats)

UNIT: Noir (slug: noir)
Weapon: SG | Class: Attacker | Element: Wind | Burst: III | burstCooldownSec: 40
ammo: 9 | reloadFrames: 62 | hitsPerShot: 10 | normalAttackMultiplier: 204.6 | coreAttackMultiplier: 200
baseStats: {"hp":13500,"atk":600,"def":86,"core":{"hp":200,"atk":200,"def":200},"grade":{"hp":3000,"atk":20,"def":100,"ratio":200},"critRate":15,"maxLevel":1200,"critDamage":150,"resourceId":271}

KIT PROSE:
skill1: ■ Activates when above 70% HP. Affects all allies.
ATK ▲ 14.08% of the skill user's ATK constantly.
skill2: ■ Activates when entering Full Burst. Affects all allies.
Max Ammunition Capacity ▲ 5 round(s) for 10 sec.
Reload 39.88% magazine(s).
burst: ■ Affects all enemies.
Deals 351.64% of final ATK as Burst Skill damage.
■ Affects all allies with a Shotgun.
Hit Rate ▲ 13.93% for 10 sec.
Damage to Interruption Parts ▲ 23.23% for 10 sec.
■ Activates with an ally from the same squad still on the battlefield. Affects all allies.
Hit Rate ▲ 11.61% for 30 sec.
Damage to Interruption Parts ▲ 19.36% for 30 sec.

---

## SECTION 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "noir",
  "stage": "S2b/S2c cross-family test-faithfulness review",
  "reviewerModel": "claude-fable-5",
  "date": "2026-07-25",
  "leakDetected": "Possible partial leak: the effect-schema's teamHas.slugs comment cites an owner ruling that \"an ally from the same squad\" is satisfied by blanc or rouge — that clause is verbatim this unit's burst gate, so the gate's resolution leaked via the schema doc. Derived the spec from the prose anyway; the correct source for the squadmate slugs is data/characters.json squad field, not the leaked example.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 14.08% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "generic ATK stat, not normal-attack-scoped; 'above 70% HP' gate is trivially always-true in v1 (boss deals no damage)",
      "durationSemantics": "permanent ('constantly'); no durationSec, no rounds",
      "triggerIdentity": "passive (always active from frame 0)",
      "targetSet": "allies (all allies, self included)",
      "nearestWrongModel": "stat atkPct 14.08 (scales each TARGET's own ATK) instead of casterAtkPct (flat add = 14.08% of noir's ATK) — the classic caster-scaled misread; secondarily, modeling the 70%-HP clause as a real toggle",
      "distinguishingAssertion": "buffApply for this key carries stat 'casterAtkPct' with the SAME flat value ≈ 0.1408×unitOf(res,'noir').staticAtk on every ally (harness note: casterAtkPct emits FLAT ATK, not the raw 14.08); under atkPct the emitted value would be 14.08 and per-ally contribution would scale with each ally's own base ATK",
      "inertness": "present at t=0 and never lapses; must not toggle with FB entry or burst casts",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Max Ammunition Capacity ▲ 5 round(s) for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "weapon-state modifier (taxonomy #6 — this IS damage: it gates shots fired / lastBullet cadence); '5 round(s)' is the MAGNITUDE in flat rounds, not a duration",
      "durationSemantics": "10 wall-clock seconds (durationSec 10); NOT durationShots",
      "triggerIdentity": "fullBurstEnter — literal 'when entering Full Burst', fires on ANY team FB including rotations the co-B3 completes",
      "targetSet": "allies (all)",
      "nearestWrongModel": "maxAmmoPct value 5 (a 5% scale ≈ +0.45 rounds on noir's 9-round mag instead of +5 flat); or re-keying to burstCast so the buff skips FBs where the other B3 bursts; or reading '5 round(s)' as durationShots",
      "distinguishingAssertion": "on EVERY fullBurstStart a buffApply stat 'maxAmmoFlat' value 5 durationSec≈10 hits all 4 allies (including rotations where helm, not noir, casts B3); a reload inside the window refills noir to 14, one after expiry refills to 9",
      "inertness": "after the 10 s window, magazine capacity returns to base; no capacity change outside FB entries",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Reload 39.88% magazine(s)",
      "disposition": "FAITHFUL",
      "scope": "instant partial magazine refill (weapon-state; skips reload downtime → shot-count damage)",
      "durationSemantics": "instantaneous one-shot effect, no duration",
      "triggerIdentity": "fullBurstEnter (same block as the capacity line)",
      "targetSet": "allies (all)",
      "nearestWrongModel": "reloadSpeedPct ▲39.88% buff ('Reload' misread as reload-SPEED), or instantReload fraction 1.0 (full refill instead of 0.3988)",
      "distinguishingAssertion": "at FB start each ally's ammo jumps by ≈39.88% of max (clamped to max) with NO buffApply of stat reloadSpeedPct anywhere in the log; a mid-magazine noir gains ~3.6 rounds (of base 9), not a full refill",
      "inertness": "reload ANIMATION duration (reloadFrames 62) unchanged — no reloadSpeedPct present",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 351.64% of final ATK as Burst Skill",
      "disposition": "FAITHFUL",
      "scope": "instant burst-bucket hit on the boss ('all enemies' = the single boss); no core unless text says core strike (it doesn't)",
      "durationSemantics": "instant, once per cast (cd 40s)",
      "triggerIdentity": "burstCast — fires ONLY on rotations noir herself bursts, never on the co-B3's rotations",
      "targetSet": "enemy",
      "nearestWrongModel": "granting the +50% Full-Burst major to the hit (burst-cast damage lands PRE-FB-window and is FB-exempt per rule 9), or keying it to fullBurstEnter so it fires on every team FB regardless of who cast",
      "distinguishingAssertion": "exactly one damage event with mult 351.64 per noir burstCast event, carrying fbMajorApplied false and no core bucket; ZERO such events on rotations where helm casts the B3 instead",
      "inertness": "no 351.64 hit on any rotation noir sits out",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "[SG allies] Hit Rate ▲ 13.93% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct — SG core-hit lift via the hrCoreMult path (HRCORE-gated); NOT a generic damage or accuracy no-op",
      "durationSemantics": "10 s (matches the FB window)",
      "triggerIdentity": "burstCast (self burst block; a fullBurstEnter mis-key would fire it on the co-B3's rotations too)",
      "targetSet": "alliesOfWeapon SG — in controlComp(noir,helm) that is noir ALONE (liter/crown/helm are not SG)",
      "nearestWrongModel": "target 'allies' unscoped (buffApply lands on non-SG units), or dropping the line as 'accuracy-only, no damage' — Hit Rate is damage via core rate on SG",
      "distinguishingAssertion": "buffApply stat hitRatePct value 13.93 targets ONLY SG wielders — helm (SR co-B3) receives none — and noir's core-bucket damage during the 10 s window exceeds a withPatchedOverride control with the effect deleted (HRCORE default-on)",
      "inertness": "zero buffApply of this key on helm/liter/crown; zero effect with HRCORE=0",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "[SG allies] Dmg to Interruption Parts ▲ 23.23%",
      "disposition": "FAITHFUL",
      "scope": "parts-only damage → partsDamagePct, parsed-but-inert in v1 (scope-lock boss is partless)",
      "durationSemantics": "10 s",
      "triggerIdentity": "burstCast",
      "targetSet": "alliesOfWeapon SG",
      "nearestWrongModel": "encoding as attackDamagePct (generic Damage-Up) — a +23.23% Damage-Up for 10 s every burst would be a large over-credit on the carry",
      "distinguishingAssertion": "totals(res) identical when this effect is deleted via withPatchedOverride (partless-boss inertness), and any buffApply carries stat partsDamagePct, never attackDamagePct",
      "inertness": "must move ZERO damage on the partless scope-lock boss",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "[same-squad ally] Hit Rate ▲ 11.61% for 30 sec",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct to the whole team (non-SG holders inert for core but the buff must still land — future consumers)",
      "durationSemantics": "30 s vs cd 40 s ⇒ ~75% uptime when the gate is met; NOT permanent, NOT 10 s",
      "triggerIdentity": "burstCast + static composition gate: 'with an ally from the same squad still on the battlefield' → teamHas {slugs:<noir's squadmates from characters.json>}; the 'still on the battlefield' alive-check is trivially true in v1 (no deaths)",
      "targetSet": "allies (ALL allies, distinct from the SG-only block)",
      "nearestWrongModel": "dropping the squad gate entirely (block fires in EVERY comp — over-credits controlComp and every graded comp lacking a squadmate); secondarily merging it into the SG block (SG-only 13.93+11.61) or copying the 10 s duration",
      "distinguishingAssertion": "in controlComp('noir') — no squadmate present — ZERO buffApply with stat hitRatePct value 11.61 occurs and totals match a control with the block deleted; a comp that adds a same-squad ally shows the buffApply on ALL allies (including non-SG helm) with a ~30 s expiresFrame",
      "inertness": "fully inert in any comp with no same-squad ally aboard — including the standard control fixture",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "[same-squad] Dmg to Interruption Parts ▲ 19.36%",
      "disposition": "FAITHFUL",
      "scope": "partsDamagePct, parsed-but-inert (partless boss)",
      "durationSemantics": "30 s",
      "triggerIdentity": "burstCast + the same teamHas squad gate as the paired Hit Rate line",
      "targetSet": "allies (all)",
      "nearestWrongModel": "attackDamagePct generic Damage-Up (compounds with the squad-gate drop into a double over-credit), or losing the squad gate",
      "distinguishingAssertion": "with a squadmate comp, buffApply carries stat partsDamagePct value 19.36 (never attackDamagePct) and deleting the effect leaves totals(res) unchanged on the partless boss",
      "inertness": "zero damage movement on the partless boss in ANY comp; zero buffApply without a squadmate",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:casterAtkPct-14.08-allies-passive",
    "skill2:maxAmmoFlat-5-10s-fullBurstEnter",
    "skill2:instantReload-0.3988-fullBurstEnter",
    "burst:flatDamage-351.64-burstCast-noFbMajor",
    "burst:hitRatePct-13.93-10s-SG-only",
    "burst:partsDamagePct-23.23-10s-SG-inert",
    "burst:hitRatePct-11.61-30s-squadGate-allies",
    "burst:partsDamagePct-19.36-30s-squadGate-inert"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Activates when above 70% HP (condition clause — unbindable in v1: boss deals no damage, so always satisfied; document, don't model a toggle)"
    ],
    "skill2": [],
    "burst": [
      "still on the battlefield (alive-check half of the squad clause — trivially true in v1, no deaths; the squad-MEMBERSHIP half must still gate)"
    ]
  },
  "reviewerNotes": "Expected shared-prior misreads to reconcile, in priority order: (1) skill1 encoded as atkPct instead of casterAtkPct — the emitted buffApply value must be a FLAT ATK number identical across allies, not the raw 14.08. (2) The burst's squad gate dropped or hardcoded-open: controlComp contains no noir squadmate, so the faithful model makes the 11.61/19.36 block COMPLETELY INERT in the standard fixture — a driver whose tests only run controlComp can green-light an ungated (over-crediting) model; the distinguishing test needs a squadmate-added comp. Squadmate slugs must come from characters.json squad data (see leakDetected). (3) skill2 keyed to burstCast instead of fullBurstEnter — diverges precisely because the control fixture carries a co-B3 (helm): fullBurstEnter fires on helm's rotations too. (4) Both 'Damage to Interruption Parts' lines mis-bucketed as attackDamagePct — must be partsDamagePct and provably damage-inert on the partless boss. (5) ORDERING AMBIGUITY the driver must pin: at the same FB-enter instant, is the 39.88% refill computed against base max 9 (~3.6 rounds) or the already-buffed 14 (~5.6 rounds)? The prose orders capacity-then-reload; assert whichever the engine does and document it — this is a real shots-fired divergence. (6) 'Reload 39.88% magazine(s)' is an instant partial refill (instantReload fraction 0.3988), never a reloadSpeedPct buff. Whole-picture: ammo 9 / reloadFrames 62 means the FB-enter ammo package materially extends fire uptime — these weapon-state lines are damage, not skippable utility. Hit-Rate→core conversion slope is the engine's calibrated hrCoreMult (⚑ measured-only per ALWAYS-⚑ #7); the 13.93/11.61 magnitudes themselves are kit-datamined.",
  "driverReconciliation": {
    "verdict": "GO",
    "realGotcha": false,
    "convergence": "All 8 load-bearing lines FAITHFUL; reviewer nearest-wrongs (atkPct, burstCast-trigger, maxAmmoPct, ungated teamHas, all-allies scoping, attackDamagePct-vs-partsDamagePct) match driver counterfactuals 1:1.",
    "driverFixturesStronger": [
      "N3 SG-scoping uses 2 SG (noir+guilty) + 2 non-SG (liter/crown) allies — cleaner alliesOfWeapon discrimination than reviewer noir-alone controlComp",
      "N5 gate tested with an explicit comp B (rouge/blanc/noir/guilty) proving the gate FIRES with a same-squad ally, plus the ungated counterfactual in comp A"
    ],
    "leakAssessment": "leakDetected is a SCHEMA-DOC leak (types-redacted.ts teamHas.slugs example cites blanc/rouge), NOT a test/spec leak. Reviewer derived the squad gate from kit prose independently and concluded it must be real (FAITHFUL, load-bearing). The driver test verifies the gate via comp A (inert) vs comp B (blanc present, fires) — substantively independent of the leaked example.",
    "niceToHaveDeferred": [
      "N2b could additionally assert NO reloadSpeedPct buff appears (vs the Reload->reload-speed misread); the structural pin already confirms instantReload encoding",
      "S2 refill ordering (39.88% vs base 9 vs raised 14 cap) is documented in the override note but not behaviourally pinned — ammo snap is silent (sim.ts:2105 emits no event)"
    ]
  }
}
```

---

## SECTION 5 — S5 BLIND TEST (claude-opus-5) + result vs driver override

S5 BLIND TEST vs DRIVER OVERRIDE: 22 tests total = 19 PASSED / 3 SKIPPED (documented v1 gaps: >70%HP gate, 10s-window length, FB-exemption attribution) / 0 FAILED. GREEN — the blind test independently corroborates the driver override.

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

/**
 * noir (Noir) — SG / Wind / Attacker / Burst III, ammo 9, hitsPerShot 10, cd 40s.
 *
 * BLIND kit-spec test: written from the kit prose alone (no sight of noir's committed
 * override, of the driver's tests, or of any truth file).
 *
 * WHAT THE KIT SAYS (structure + magnitudes; quotes kept short)
 *   skill1  header: "Activates when above 70% HP" + all allies
 *           ATK ▲ 14.08% *of the skill user's ATK*, constantly.
 *   skill2  header: "Activates when entering Full Burst" + all allies
 *           Max Ammunition Capacity ▲ 5 round(s) for 10 sec.
 *           Reload 39.88% magazine(s).
 *   burst   block A: all enemies — 351.64% of final ATK as Burst Skill damage.
 *           block B: "all allies with a Shotgun" — Hit Rate ▲ 13.93% (10s),
 *                    Damage to Interruption Parts ▲ 23.23% (10s).
 *           block C: "an ally from the same squad" gate + all allies —
 *                    Hit Rate ▲ 11.61% (30s), Interruption Parts ▲ 19.36% (30s).
 *
 * FIXTURE — controlComp('noir', true) = liter (B1) / crown (B2) / noir (B3 carry) / helm (B3).
 *   - B1 + B2 are mandatory: a lone B3 chains ZERO Full Bursts and every burst assertion
 *     below would be vacuous.
 *   - Two B3s on 40s cooldowns and a ~20s rotation means noir bursts on roughly every OTHER
 *     Full Burst. That gap is what separates "fires on the team's Full Burst" (skill2) from
 *     "fires when noir casts her own burst" (the burst slot).
 *   - noir is the comp's only shotgun (liter SMG / crown RL / helm SR), so "all allies with a
 *     Shotgun" is separable from "all allies" by the buffApply target set alone.
 *   - NO squad-mate is on the field, so burst block C's team gate must be CLOSED here; its
 *     entire observable signature is that lifting the gate changes the run.
 *
 * HOW EACH ASSERTION DISCRIMINATES is stated per `it`. Unit attribution of buffApply events is
 * done by DIFFING against a counterfactual run rather than by guessing a caster-id field, so
 * teammates that carry the same stat cannot contaminate a reading.
 *
 * 9 hoisted 180s runs.
 */

type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';

const ALLIES = ['liter', 'crown', 'noir', 'helm'] as const;
const TEAMMATES = ['liter', 'crown', 'helm'] as const;

// The override FILE is slot-keyed; tolerate both the raw Block[] slot shape and a
// CharacterSkills-per-slot shape so the patch helpers cannot silently no-op.
const slotBlocks = (ov: any, slot: Slot): any[] => {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s;
  if (s && Array.isArray(s.blocks)) return s.blocks;
  return [];
};
const setSlotBlocks = (ov: any, slot: Slot, blocks: any[]): void => {
  if (Array.isArray(ov?.[slot])) ov[slot] = blocks;
  else if (ov?.[slot] && Array.isArray(ov[slot].blocks))
    ov[slot].blocks = blocks;
};
const effectsOf = (b: any): any[] =>
  Array.isArray(b?.effects) ? b.effects : [];

const run = (patched?: unknown) => {
  const base: any = controlComp('noir', true);
  const events: Ev[] = [];
  const opts: any = {
    ...base,
    overrides: {
      ...(base.overrides ?? {}),
      ...(patched ? { noir: patched } : {}),
    },
    cfg: {
      ...(base.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  };
  const res = runComp(opts);
  return { res, events, t: totals(res) as Record<string, number> };
};

const buffs = (evs: Ev[], stat: string, value?: number): Ev[] =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) < 1e-6)
  );

// ---- counterfactual overrides (in-memory clones; committed JSON untouched) -----------------
const pNoS1 = withPatchedOverride('noir', (ov: any) =>
  setSlotBlocks(ov, 'skill1', [])
);
const pNoS2 = withPatchedOverride('noir', (ov: any) =>
  setSlotBlocks(ov, 'skill2', [])
);
const pNoReload = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'skill2'))
    b.effects = effectsOf(b).filter((e) => e.kind !== 'instantReload');
});
const pS2AsBurstCast = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'skill2')) b.trigger = { kind: 'burstCast' };
});
const pUngated = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'burst')) delete b.teamHas;
});
const pNoSgHitRate = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'burst'))
    b.effects = effectsOf(b).filter(
      (e) =>
        !(
          e.kind === 'buff' &&
          e.stat === 'hitRatePct' &&
          Math.abs(Number(e.value) - 13.93) < 1e-6
        )
    );
});
const pNoParts = withPatchedOverride('noir', (ov: any) => {
  for (const slot of ['skill1', 'skill2', 'burst'] as Slot[])
    for (const b of slotBlocks(ov, slot))
      b.effects = effectsOf(b).filter(
        (e) => !(e.kind === 'buff' && e.stat === 'partsDamagePct')
      );
});
const pNoNuke = withPatchedOverride('noir', (ov: any) => {
  for (const b of slotBlocks(ov, 'burst'))
    for (const e of effectsOf(b)) if (e.kind === 'flatDamage') e.atkPct = 0;
});

// ---- hoisted runs --------------------------------------------------------------------------
const base = run();
const offS1 = run(pNoS1);
const offS2 = run(pNoS2);
const offReload = run(pNoReload);
const s2Wrong = run(pS2AsBurstCast);
const ungated = run(pUngated);
const offSgHr = run(pNoSgHitRate);
const offParts = run(pNoParts);
const noNuke = run(pNoNuke);

const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;

describe('noir — fixture sanity', () => {
  it('noir is in the comp, fires, and the comp chains multiple Full Bursts', () => {
    expect(unitOf(base.res, 'noir').totalDamage).toBeGreaterThan(0);
    expect(base.events.some((e) => e.kind === 'shot')).toBe(true);
    // Non-vacuity for every burst/FB assertion below.
    expect(fbStarts).toBeGreaterThan(1);
  });
});

describe('noir S1 — all allies, ATK ▲ 14.08% of the skill user\u2019s ATK, constantly', () => {
  const baseCA = buffs(base.events, 'casterAtkPct');
  const offCA = buffs(offS1.events, 'casterAtkPct');

  const byValue = (evs: Ev[]) => {
    const m = new Map<number, string[]>();
    for (const e of evs) {
      const k = Math.round(Number(e.value) * 1e4) / 1e4;
      m.set(k, [...(m.get(k) ?? []), String(e.targetSlug)]);
    }
    return m;
  };
  const baseG = byValue(baseCA);
  const offG = byValue(offCA);
  // Attribution by DIFF: whichever caster-scaled value vanishes when noir's skill1 is emptied
  // is noir's — immune to a teammate that also grants a caster-scaled ATK buff.
  const noirVals = [...baseG.keys()].filter((v) => !offG.has(v));

  it('emits exactly one caster-scaled ATK grant, and it is noir\u2019s (vanishes with S1)', () => {
    expect(noirVals).toHaveLength(1);
  });

  it('targets ALL FOUR allies including self, exactly once each (a passive, not trigger-keyed)', () => {
    const tgts = baseG.get(noirVals[0])!;
    expect(new Set(tgts).size).toBe(4); // RED under target self / alliesOfWeapon / topAtk-N
    expect(tgts).toHaveLength(4); // RED under a fullBurstEnter/burstCast re-key (would re-apply per rotation)
    expect(new Set(tgts).has('noir')).toBe(true); // no "except self" in the header
  });

  it('is CASTER-scaled: flat-resolved at apply time, not a raw 14.08% self-scaling buff', () => {
    // casterAtkPct re-emits as flat ATK; a 14.08 on the wire would mean the nearest-wrong
    // encoding (plain atkPct, scaling each ally\u2019s OWN ATK).
    expect(noirVals[0]).toBeGreaterThan(100);
    expect(Math.abs(noirVals[0] - 14.08)).toBeGreaterThan(1);
    expect(buffs(base.events, 'atkPct', 14.08)).toHaveLength(0);
  });

  it('is live BEFORE the first shot ("constantly", not gated behind a trigger)', () => {
    const lastApply = base.events.reduce(
      (acc, e, i) =>
        e.kind === 'buffApply' &&
        e.stat === 'casterAtkPct' &&
        Math.abs(Number(e.value) - noirVals[0]) < 1e-3
          ? i
          : acc,
      -1
    );
    const firstShot = base.events.findIndex((e) => e.kind === 'shot');
    expect(lastApply).toBeGreaterThan(-1);
    expect(firstShot).toBeGreaterThan(-1);
    expect(lastApply).toBeLessThan(firstShot);
  });

  it('moves EVERY ally\u2019s damage (team-wide), not just noir\u2019s', () => {
    for (const s of ALLIES) expect(offS1.t[s]).toBeLessThan(base.t[s]);
  });

  it.skip('the ">70% HP" activation gate is unobservable in v1 (immortal boss, no HP pool) — modeled as permanently satisfied', () => {
    // No primitive can distinguish "gate always true" from "no gate" while nothing takes damage.
  });
});

describe('noir S2 — on entering Full Burst, all allies: Max Ammo ▲ 5 (10s) + 39.88% reload', () => {
  const ammo = buffs(base.events, 'maxAmmoFlat', 5);

  it('applies to all four allies on EVERY team Full Burst entry', () => {
    expect(ammo.length).toBeGreaterThan(0);
    expect(new Set(ammo.map((e) => e.targetSlug)).size).toBe(4); // "Affects all allies"
    expect(ammo).toHaveLength(fbStarts * 4); // one apply per ally per FB entry
  });

  it('is FULL-BURST-ENTER keyed, not burst-cast keyed (the nearest-wrong trigger under-fires)', () => {
    // noir bursts on only ~half the Full Bursts (helm covers the rest), so re-keying the block
    // to her own burstCast must strictly reduce the number of applications.
    const wrong = buffs(s2Wrong.events, 'maxAmmoFlat', 5);
    expect(wrong.length).toBeLessThan(ammo.length);
  });

  it('"▲ 5 round(s) for 10 sec" is a 5-round MAGNITUDE on a seconds clock, not a round-count window', () => {
    for (const e of ammo) {
      expect(Number(e.value)).toBe(5); // maxAmmoFlat 5, not a % encoding
      expect(e.durationShots == null).toBe(true); // RED if "5 round(s)" was read as durationShots
      expect(Number.isFinite(Number(e.expiresFrame))).toBe(true); // timed, not permanent
    }
  });

  it('the slot is load-bearing damage for noir AND for teammates (ally-wide ammo + reload)', () => {
    expect(offS2.t['noir']).toBeLessThan(base.t['noir']);
    const moved = TEAMMATES.filter((s) => offS2.t[s] !== base.t[s]);
    expect(moved.length).toBeGreaterThan(0); // RED if the slot were scoped to self
  });

  it('the 39.88% magazine reload on its own adds noir damage (weapon-state = damage)', () => {
    // Isolates "Reload 39.88% magazine(s)" from the ammo-capacity buff: dropping only the
    // instantReload must cost shots. RED if the reload line was skipped as "defensive".
    expect(offReload.t['noir']).toBeLessThan(base.t['noir']);
  });

  it.skip('the exact 10s length of the Max-Ammo window is not directly assertable', () => {
    // No buff is co-applied at the same frame to difference expiresFrame against, and buffApply
    // carries no absolute frame on the public event surface. Load-bearing-ness is covered above.
  });
});

describe('noir burst — 351.64% nuke, shotgun-scoped 10s buffs, squad-gated 30s buffs', () => {
  const hr13 = buffs(base.events, 'hitRatePct', 13.93);
  const hr11 = buffs(base.events, 'hitRatePct', 11.61);
  const parts23 = buffs(base.events, 'partsDamagePct', 23.23);
  const parts19 = buffs(base.events, 'partsDamagePct', 19.36);

  it('the 351.64% burst nuke pays real damage and touches NOBODY else', () => {
    expect(noNuke.t['noir']).toBeLessThan(base.t['noir']);
    for (const s of TEAMMATES) expect(noNuke.t[s]).toBe(base.t[s]); // enemy-targeted: inert on allies
  });

  it('Hit Rate ▲ 13.93% is SHOTGUN-scoped: a strict subset of allies that includes noir', () => {
    expect(hr13.length).toBeGreaterThan(0);
    const tg = new Set(hr13.map((e) => e.targetSlug));
    expect(tg.has('noir')).toBe(true); // no "except self"
    expect(tg.size).toBeLessThan(4); // RED under the nearest-wrong "all allies" target
  });

  it('the shotgun block keys off NOIR\u2019s own burst cast, not any team Full Burst', () => {
    // helm also bursts, so a fullBurstEnter mis-key would fire on her rotations too.
    expect(hr13.length).toBeLessThan(fbStarts);
  });

  it('Hit Rate ▲ 13.93% is load-bearing for noir and inert for the non-shotgun teammates', () => {
    expect(offSgHr.t['noir']).toBeLessThan(base.t['noir']); // hit rate lifts core rate
    for (const s of TEAMMATES) expect(offSgHr.t[s]).toBe(base.t[s]);
  });

  it('Interruption-Part Damage ▲ 23.23% rides the same block but MOVES NOTHING (v1 boss has no parts)', () => {
    expect(parts23).toHaveLength(hr13.length); // same trigger, same target set
    for (const s of ALLIES) expect(offParts.t[s]).toBe(base.t[s]); // parsed-but-inert, byte-identical
  });

  it('the same-squad block is CLOSED with no squad-mate on the field', () => {
    // controlComp has no blanc/rouge-style squad-mate, so neither 30s rider may fire.
    expect(hr11).toHaveLength(0);
    expect(parts19).toHaveLength(0);
  });

  it('...and OPENS to all four allies, paying damage, once the team gate is lifted (gate non-vacuity)', () => {
    const open11 = buffs(ungated.events, 'hitRatePct', 11.61);
    expect(open11.length).toBeGreaterThan(0);
    expect(new Set(open11.map((e) => e.targetSlug)).size).toBe(4); // "Affects all allies", not SG-scoped
    expect(ungated.t['noir']).toBeGreaterThan(base.t['noir']);
  });

  it('the squad-gated riders run 30s against the shotgun riders\u2019 10s (same cast, differenced)', () => {
    const first11 = buffs(ungated.events, 'hitRatePct', 11.61)[0];
    const first13 = buffs(ungated.events, 'hitRatePct', 13.93)[0];
    expect(first11).toBeTruthy();
    expect(first13).toBeTruthy();
    // Both blocks fire on the same burst cast, so the expiry gap is exactly (30−10)s × 60fps.
    expect(
      Math.round(Number(first11.expiresFrame) - Number(first13.expiresFrame))
    ).toBe(1200);
  });

  it.skip('the burst nuke\u2019s Full-Burst exemption is not assertable through the public harness surface', () => {
    // damage events carry inFullBurst / fbMajorApplied but no ally attribution field the blind
    // packet documents, so noir\u2019s burst-slot hits cannot be isolated from teammate damage here.
  });
});
```

---

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver

S6 BLIND OVERRIDE vs DRIVER OVERRIDE — diff:
IDENTICAL: S1 casterAtkPct 14.08 / passive / allies. S2 fullBurstEnter / maxAmmoFlat 5 (10s) + instantReload 0.3988 / allies (blind groups both effects in one block, driver uses two blocks — functionally identical). Burst flatDamage 351.64 / burstCast / enemy. Burst alliesOfWeapon SG / hitRatePct 13.93 + partsDamagePct 23.23 / 10s. Burst teamHas-gated / hitRatePct 11.61 + partsDamagePct 19.36 / allies / 30s.
DIFF 1 (cosmetic/redundant): blind sets noFb:true + crit:true on the burst flatDamage; driver sets neither. The engine auto-exempts burst-cast damage from the +50% FB major (driver N4 measured fbMajorApplied 0/5 WITHOUT noFb), so noFb:true is behaviorally redundant. blind writer flagged this for adjudication.
DIFF 2 (flagged blind data gap, NOT a modeling disagreement): blind teamHas.slugs:[] (honestly inert — blind to data/characters.json squad fields) vs driver teamHas.slugs:[blanc,rouge]. The gate STRUCTURE (teamHas on the 11.61/19.36 all-ally 30s block) is identical; blind flagged the empty list with recipe "populate from characters.json squad data", which the driver did (blanc+rouge are noir s Rabbit Twins squadmates).

```json
{
  "slug": "noir",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 14.08
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
          "stat": "maxAmmoFlat",
          "value": 5,
          "durationSec": 10
        },
        {
          "kind": "instantReload",
          "fraction": 0.3988
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
          "atkPct": 351.64,
          "crit": true,
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
        "kind": "alliesOfWeapon",
        "weapon": "SG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 13.93,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 23.23,
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
        "kind": "allies"
      },
      "teamHas": {
        "slugs": []
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 11.61,
          "durationSec": 30
        },
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 19.36,
          "durationSec": 30
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
    "⚑ skill1 'Activates when above 70% HP' is modeled as an unconditional passive: v1 has no HP pool (immortal boss, nobody takes damage), so the >70% HP gate is always satisfied. Faithful for the scope-lock fight; would need an HP-state gate if incoming damage is ever modeled.",
    "⚑ burst group 3 'Activates with an ally from the same squad still on the battlefield' — I cannot determine Noir's squad membership from the kit text alone. Authored as teamHas.slugs with an EMPTY list (block currently inert). Fill the squadmate slugs in from data/characters.json before use, or drop the gate if the owner rules the graded comps always satisfy it.",
    "⚑ Both Hit Rate ▲ lines (13.93% / 11.61%) route through the hitRatePct→core-lift path, whose magnitude is a derived, measured-only conversion (sim.ts hrCoreMult). The kit percentages are verbatim; the resulting core-rate lift is NOT.",
    "partsDamagePct (23.23% / 19.36%) is parsed but inert in v1 — the scope-lock boss is partless. Kept as blocks (not unmodeled) so a future parts model picks them up.",
    "Burst damage (351.64%) is authored noFb:true per the schema rule that a burst cast lands before the Full-Burst window opens; core:false (the text does not say 'core strike damage'); crit:true at the caster's sheet rate.",
    "Noir is SG, so she is inside her own alliesOfWeapon:'SG' target set (no excludeSelf in the kit text)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the noir kit prose (S6 cross-family). skill1 = constant caster-scaled ATK aura to all allies, HP gate always-true in v1. skill2 = FB-enter team weapon-state package: +5 flat max ammo for 10s plus a 39.88%-magazine partial reload — both are damage-relevant (shot count), never skipped. burst = three groups: a 351.64% burst-cast nuke on the boss, a 10s SG-only Hit Rate + Parts package, and a 30s all-ally Hit Rate + Parts package gated on a same-squad ally (squadmate slugs UNKNOWN blind — gate authored empty/inert, see caveats). No ignored blocks. noFb set only on the burst-cast hit; noRange left to the engine."
}
```

---

## SECTION 7 — DRIVER IMPLEMENTATION (test + override under judgment)

### scripts/tests/units/noir.test.ts

```typescript
// PER-UNIT KIT SPEC — `noir` (Noir, Attacker/SG/Wind, Burst III, cd 40s, ammo 9, hitsPerShot 10).
// Kit-autonomy gauntlet 2026-07-25 (S2a, test-first).
//
// One assertion group per KIT LINE (N1..N6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.noir.skills):
//   S1 ■ above 70% HP → all allies: ATK ▲14.08% of the skill user's ATK constantly           [N1]
//   S2 ■ entering Full Burst → all allies: Max Ammunition Capacity ▲5 round(s) for 10 sec     [N2]
//                                          Reload 39.88% magazine(s)                          [N2b]
//   BU ■ all enemies: 351.64% of final ATK as Burst Skill damage                              [N4]
//      ■ all allies with a Shotgun: Hit Rate ▲13.93% / Dmg to Interruption Parts ▲23.23% 10s  [N3]
//      ■ with a same-squad ally on the battlefield → all allies:
//                 Hit Rate ▲11.61% / Dmg to Interruption Parts ▲19.36% for 30 sec             [N5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  casterAtkPct = a FLAT add of NOIR's ATK (resolves to 0.1408×staticAtk ≈ 16.8k), NOT a %
//       of each ally's own ATK. Nearest wrong: atkPct. Proven by the buffApply `stat`/`key`
//       (casterAtkPct, raw 14.08 in the key, flat value recorded) + the value being identical for
//       every ally (caster-flat) + a damage delta vs the atkPct counterfactual.
//   N2  trigger is `fullBurstEnter` (kit-literal "when entering Full Burst"), NOT `burstCast`.
//       Measured: the +5 grant lands on the Full-Burst-ENTRY frame (400), 22 frames AFTER noir's
//       burstCast frame (378). Nearest wrong: burstCast (the prior-10 model) lands it on the cast
//       frame. Target is ALL allies (kit "Affects all allies"), nearest wrong self-only.
//   N2b instantReload 0.3988 — the engine snaps ammo silently (sim.ts:2105 emits NO event), so
//       pinned structurally on the encoding AND behaviourally: stripping it perturbs the team's
//       realized reload cadence.
//   N3  the SG block targets `alliesOfWeapon SG` — measured it reaches ONLY the two SG allies
//       (noir+guilty), never the SMG/MG allies. Nearest wrong: `allies` (would buff liter+crown).
//   N4  a burst CAST lands BEFORE the Full Burst window opens, so it must never take the +50%
//       major (verified fact). Magnitude 351.64, burst bucket, once per cast.
//   N5  the 11.61/19.36 block is GATED on a same-squad ally (blanc/rouge) via `teamHas`. Measured:
//       INERT in a comp without one (no 11.61 buff at all), FIRES for all allies/30s with blanc.
//       Nearest wrong: ungated (would over-buff every comp). Owner-ruled real 2026-07-20.
//   N6  partsDamagePct is exactly inert against the partless scope-lock boss — byte-identical
//       totals for every unit, not "small" (mirrors the helm H4 pin).
//
// Inert / unmeasured (documented, NOT asserted): the in-game MAGNITUDE of hitRatePct → core/landing
// lift is unmeasured (override ⚑3; direction live via CONE_DELTA for SG recipients) — these tests
// pin the buff's PRESENCE/target/duration, not a damage delta from it. partsDamagePct is modeled
// but inert vs the partless boss (N6 proves the inertness). The S1 "above 70% HP" gate and the
// burst "still on the battlefield" clause are scope-trivial (nothing dies at scope lock) and are
// assumption-noted in the override, not encoded.
//
// Fixtures (deterministic, no seed):
//   COMP A = liter(SMG B1) / crown(MG B2) / noir(SG B3) / guilty(SG B2), boss Water, focus noir.
//            No same-squad ally ⇒ N5 gate inert; two SG allies ⇒ N3 scoping observable.
//   COMP B = rouge(SR B1) / blanc(AR B2) / noir(SG B3) / guilty(SG B2), boss Water, focus noir.
//            blanc present ⇒ N5 gate fires. noir is slot 2 in BOTH comps.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const NOIR = 2; // noir's slot in both comps
const COMP_A = ['liter', 'crown', 'noir', 'guilty'];
const COMP_B = ['rouge', 'blanc', 'noir', 'guilty'];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Water',
    focusSlug: 'noir',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual / reference patches -------------------------------------------------------
/** N1 encoding reference: S1 casterAtkPct → atkPct (% of each ally's OWN ATK, not noir's flat). */
const noirAtkPct = withPatchedOverride('noir', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error('noir S1 casterAtkPct effect missing — fixture is stale');
  e.stat = 'atkPct';
});
/** N2 trigger reference: S2 fullBurstEnter → burstCast (the prior-10 model). */
const noirBurstCastTrig = withPatchedOverride('noir', (ov) => {
  let n = 0;
  for (const b of ov.skill2)
    if (b.trigger.kind === 'fullBurstEnter') {
      b.trigger.kind = 'burstCast';
      n++;
    }
  if (n < 2)
    throw new Error('noir S2 fullBurstEnter blocks missing — fixture is stale');
});
/** N2 target reference: S2 maxAmmoFlat block all allies → self only. */
const noirSelfAmmo = withPatchedOverride('noir', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'maxAmmoFlat')
  );
  if (!b)
    throw new Error('noir S2 maxAmmoFlat block missing — fixture is stale');
  b.target = { kind: 'self' };
});
/** N2b reference: strip the S2 instantReload effect (leaves the maxAmmoFlat block intact). */
const noirNoInstantReload = withPatchedOverride('noir', (ov) => {
  const before = ov.skill2
    .flatMap((b: any) => b.effects)
    .filter((e: any) => e.kind === 'instantReload').length;
  for (const b of ov.skill2)
    b.effects = b.effects.filter((e: any) => e.kind !== 'instantReload');
  ov.skill2 = ov.skill2.filter((b: any) => b.effects.length > 0);
  if (before < 1)
    throw new Error('noir S2 instantReload effect missing — fixture is stale');
});
/** N3 scoping reference: burst SG block (hitRatePct 13.93) alliesOfWeapon SG → all allies. */
const noirAlliesAll = withPatchedOverride('noir', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'hitRatePct' && e.value === 13.93)
  );
  if (!b)
    throw new Error(
      'noir burst hitRatePct 13.93 block missing — fixture is stale'
    );
  b.target = { kind: 'allies' };
});
/** N5 gate reference: remove the teamHas gate from the 11.61 block (makes it always-active). */
const noirNoGate = withPatchedOverride('noir', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'hitRatePct' && e.value === 11.61)
  );
  if (!b)
    throw new Error(
      'noir burst hitRatePct 11.61 block missing — fixture is stale'
    );
  if (!b.teamHas)
    throw new Error('noir burst 11.61 teamHas gate missing — fixture is stale');
  delete b.teamHas;
});
/** N6 reference: strip every burst partsDamagePct effect (both the SG and the gated block). */
const noirNoParts = withPatchedOverride('noir', (ov) => {
  const before = ov.burst
    .flatMap((b: any) => b.effects)
    .filter((e: any) => e.stat === 'partsDamagePct').length;
  for (const b of ov.burst)
    b.effects = b.effects.filter((e: any) => e.stat !== 'partsDamagePct');
  ov.burst = ov.burst.filter((b: any) => b.effects.length > 0);
  if (before < 2)
    throw new Error(
      'noir burst partsDamagePct blocks missing — fixture is stale'
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(COMP_A);
const atkPct = run(COMP_A, { noir: noirAtkPct });
const burstCastTrig = run(COMP_A, { noir: noirBurstCastTrig });
const selfAmmo = run(COMP_A, { noir: noirSelfAmmo });
const noInstantReload = run(COMP_A, { noir: noirNoInstantReload });
const alliesAll = run(COMP_A, { noir: noirAlliesAll });
const noGate = run(COMP_A, { noir: noirNoGate });
const noParts = run(COMP_A, { noir: noirNoParts });
const compB = run(COMP_B);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const noirCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'noir'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FullBurstStart => e.kind === 'fullBurstStart');
const reloadFrames = (evs: SimEvent[]) =>
  evs
    .filter((e): e is Reload => e.kind === 'reload')
    .map((r) => `${r.slug}@${r.frame}`)
    .sort();
/** noir-cast buffApply by exact key (key carries the raw kit magnitude; value is the resolved stat). */
const noirBuff = (evs: SimEvent[], key: string) =>
  buffs(evs).filter((b) => b.casterIdx === NOIR && b.key === key);
const holders = (bs: BuffApply[]) => new Set(bs.map((b) => b.targetSlug));

const S1_KEY = `${NOIR}:skill1:casterAtkPct:14.08`;
const AMMO_KEY = `${NOIR}:skill2:maxAmmoFlat:5`;
const HR_SG_KEY = `${NOIR}:burst:hitRatePct:13.93`;
const HR_GATE_KEY = `${NOIR}:burst:hitRatePct:11.61`;

describe('noir — kit spec', () => {
  describe("N1 — S1 ATK ▲14.08% of NOIR's ATK to all allies, constantly (casterAtkPct)", () => {
    const applied = noirBuff(base.events, S1_KEY);
    const expectedFlat = 0.1408 * unitOf(base.res, 'noir').staticAtk;

    it("is a FLAT add of noir's ATK (value ≈ 0.1408×staticAtk, >> a percentage)", () => {
      expect(
        applied.length,
        'no S1 casterAtkPct buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual([
        'casterAtkPct',
      ]);
      for (const b of applied) {
        expect(
          b.value,
          'casterAtkPct must record a flat ATK grant, not the raw 14.08'
        ).toBeGreaterThan(1000);
        expect(b.value).toBeCloseTo(expectedFlat, 4);
      }
    });

    it('reaches all four allies with the SAME flat value (caster-flat signature), no expiry', () => {
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`
      ).toBe(4);
      expect(
        [...new Set(applied.map((b) => b.value))].length,
        'value must be identical for every ally'
      ).toBe(1);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('ENCODING: shipped logs casterAtkPct; the atkPct counterfactual logs atkPct (distinct mechanic)', () => {
      expect(noirBuff(base.events, S1_KEY).length).toBeGreaterThan(0);
      // The counterfactual moved the line off casterAtkPct entirely.
      expect(
        buffs(atkPct.events).filter(
          (b) =>
            b.casterIdx === NOIR &&
            b.key.startsWith(`${NOIR}:skill1:casterAtkPct`)
        ).length
      ).toBe(0);
      expect(
        buffs(atkPct.events).filter(
          (b) =>
            b.casterIdx === NOIR &&
            b.stat === 'atkPct' &&
            b.key.startsWith(`${NOIR}:skill1:`)
        ).length
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING + LIVE: casterAtkPct vs atkPct change ally damage differently', () => {
      // noir's ATK differs from her allies', so a flat caster add ≠ a per-target %; if S1 were inert
      // (or the two encodings equivalent) the totals would be byte-identical.
      expect(base.totals).not.toEqual(atkPct.totals);
    });
  });

  describe('N2 — S2 Max Ammunition Capacity ▲5 rounds / 10s to all allies on Full Burst entry', () => {
    const applied = noirBuff(base.events, AMMO_KEY);
    const ammoFrames = [...new Set(applied.map((b) => b.frame))].sort(
      (a, b) => a - b
    );
    const fbFrames = fbStarts(base.events).map((f) => f.frame);
    const castFrames = noirCasts(base.events).map((c) => c.frame);

    it('grants +5 max ammo to all four allies for 10 sec', () => {
      expect(
        applied.length,
        'no S2 maxAmmoFlat buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([5]);
      expect(
        holders(applied).size,
        `reached ${holders(applied).size} allies, expected 4`
      ).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('trigger is fullBurstEnter: every grant lands on a Full-Burst-ENTRY frame, not the cast frame', () => {
      expect(ammoFrames.length).toBeGreaterThan(0);
      for (const f of ammoFrames)
        expect(
          fbFrames,
          `maxAmmoFlat at frame ${f} is not an FB-entry frame`
        ).toContain(f);
      expect(
        ammoFrames[0],
        'first grant must coincide with the first FB entry'
      ).toBe(fbFrames[0]);
      expect(
        ammoFrames[0],
        'first grant must NOT be the burstCast frame'
      ).not.toBe(castFrames[0]);
    });

    it('DISCRIMINATING (trigger): a burstCast trigger lands the grant on the cast frame, before FB opens', () => {
      const cf = noirBuff(burstCastTrig.events, AMMO_KEY);
      const cfFrames = [...new Set(cf.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      const cfCast = noirCasts(burstCastTrig.events).map((c) => c.frame);
      const cfFb = fbStarts(burstCastTrig.events).map((f) => f.frame);
      expect(
        cfFrames[0],
        'counterfactual grant must land on the cast frame'
      ).toBe(cfCast[0]);
      expect(
        cfFrames[0],
        'counterfactual grant must precede FB entry'
      ).not.toBe(cfFb[0]);
    });

    it('DISCRIMINATING (target): "all allies" reaches 4; a self-only model reaches only noir', () => {
      const cf = noirBuff(selfAmmo.events, AMMO_KEY);
      expect([...holders(cf)]).toEqual(['noir']);
    });
  });

  describe('N2b — S2 Reload 39.88% magazine(s) to all allies on Full Burst entry (instantReload)', () => {
    it('encodes instantReload fraction 0.3988 on the fullBurstEnter S2 block, targeting all allies', () => {
      const ov: any = withPatchedOverride('noir', () => {});
      const blk = ov.skill2.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'instantReload')
      );
      expect(blk, 'no S2 instantReload block').toBeTruthy();
      expect(blk.trigger.kind).toBe('fullBurstEnter');
      expect(blk.target.kind).toBe('allies');
      expect(
        blk.effects.find((e: any) => e.kind === 'instantReload').fraction
      ).toBe(0.3988);
    });

    it("is live: stripping it perturbs the team's realized reload cadence (not byte-identical)", () => {
      // The 39.88% top-up at FB entry delays the allies' next magazine reload; the engine snaps ammo
      // silently (no reload event for the refill itself), so the observable is the shifted cadence.
      expect(reloadFrames(base.events)).not.toEqual(
        reloadFrames(noInstantReload.events)
      );
    });
  });

  describe('N3 — burst: Hit Rate ▲13.93% / Parts ▲23.23% for 10s to allies WITH A SHOTGUN only', () => {
    const applied = noirBuff(base.events, HR_SG_KEY);

    it('reaches ONLY the shotgun allies (noir+guilty), never the SMG/MG allies', () => {
      expect(
        applied.length,
        'no burst hitRatePct 13.93 buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([13.93]);
      expect([...holders(applied)].sort()).toEqual(['guilty', 'noir']);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: an "all allies" model would also buff the non-SG allies (liter+crown)', () => {
      const cf = noirBuff(alliesAll.events, HR_SG_KEY);
      expect(
        holders(cf).size,
        'all-allies counterfactual must reach all 4'
      ).toBe(4);
      expect([...holders(cf)].sort()).toEqual([
        'crown',
        'guilty',
        'liter',
        'noir',
      ]);
    });
  });

  describe('N4 — burst nuke: 351.64% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'noir' && d.srcSlot === 'burst'
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(noirCasts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([351.64]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });
  });

  describe('N5 — burst: same-squad-gated Hit Rate ▲11.61% / Parts ▲19.36% for 30s to all allies', () => {
    it('is INERT without a same-squad ally (comp A: no blanc/rouge) — no 11.61 buff at all', () => {
      expect(noirBuff(base.events, HR_GATE_KEY).length).toBe(0);
    });

    it('DISCRIMINATING (gate is real): removing teamHas makes it fire in comp A', () => {
      const cf = noirBuff(noGate.events, HR_GATE_KEY);
      expect(
        cf.length,
        'ungated counterfactual must apply the 11.61 buff'
      ).toBeGreaterThan(0);
      expect([...new Set(cf.map((b) => b.value))]).toEqual([11.61]);
      expect(holders(cf).size).toBe(4);
    });

    it('FIRES with blanc present (comp B): 11.61% to all four allies for 30 sec', () => {
      const applied = noirBuff(compB.events, HR_GATE_KEY);
      expect(
        applied.length,
        'no gated 11.61 buff with blanc present'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([11.61]);
      expect(holders(applied).size, 'gated block must reach all 4 allies').toBe(
        4
      );
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(30 * FPS);
    });
  });

  describe('N6 — burst partsDamagePct is exactly inert vs the partless scope-lock boss', () => {
    it("removing every partsDamagePct line changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noParts.totals);
    });
  });
});
```

### src/skills/overrides/noir.json

```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. || SLUG noir — Noir, SG / Burst III / Attacker / Wind, ammo 9, reloadFrames 62, hitsPerShot 10 (pellets), normalMult 204.6, burstCd 40s. AUTHOR-mode kit-parse 2026-07-16: re-derived from kit text, merged with the reviewed staging baseline (src/skills/overrides-baselines/noir.json), upgraded to the alliesOfWeapon target + unmodeled contract. ANCHOR STATUS: noir is the SG-landing-table calibration anchor (docs/probe-data/noir-solo-recon.json) — this override stays strictly KIT-FAITHFUL; all landing/pellet magnitudes live ENGINE-side (SG_LANDING_BY_BAND), never here. MODEL: S1 = passive team buff casterAtkPct 14.08 (of noir's ATK) to ALL allies; kit gate 'above 70% HP' assumed always-satisfied at scope lock (boss damage unmodeled) — recon corroborates constant uptime solo (effectiveAtk 134,645 = 118,027 x 1.1408). S2 (trigger fullBurstEnter — kit-literal 'when entering Full Burst', NOT burstCast, prior 10): (a) 'Max Ammunition Capacity ▲ 5 round(s) for 10 sec' = maxAmmoFlat 5 to ALL allies (kit-literal; enacted 2026-07-20 per the kit-audit ENACT-NOW item — the engine's flat-rounds path was already live; replaces the old self-only maxAmmoPct 55.56 proxy, which equalled the same 5 rounds on her 9-round belt, so HER behavior is unchanged and teammates now get their faithful +5). NOTE the same-trigger ordering with (b): the cap raise (a) is listed before the fractional reload (b), so (b)'s fraction refills against the RAISED cap during the 10s window; (b) 'Reload 39.88% magazine(s)' = instantReload fraction 0.3988 to ALL allies (a fraction refills each ally's own mag — per-unit-faithful; also prior-9). BURST (burstCast, 40s): (1) 351.64% flatDamage to enemy — burst-cast damage auto-snapshots pre-FB / FB-exempt in-engine; noFb NOT set (prior 2). (2) 'all allies with a Shotgun' → target alliesOfWeapon SG (new target; supersedes the baseline's self-only compromise and its ⚑ on scope): hitRatePct 13.93 + partsDamagePct 23.23, 10s. (3) 'Activates with an ally from the same squad still on the battlefield' → allies: hitRatePct 11.61 + partsDamagePct 19.36, 30s, NOW GATED teamHas:{slugs:[blanc,rouge]} (OWNER-RULED 2026-07-20: the gate is REAL — the buff does NOT appear without a same-squad teammate, satisfied by blanc or rouge; enacted with the new teamHas slug facet). 'Still on the battlefield' is scope-trivial (nothing dies at scope lock), so a static comp gate is exact. hitRatePct stays LIVE via CONE_DELTA for AR/SMG/SG recipients; partsDamagePct inert vs the partless boss. In both graded comps (PI/PI2 — no blanc/rouge) the block is now correctly inert. SKIPS: none — unmodeled arrays are empty; every kit line is a block. Two activation GATES are assumption-noted, not encoded: S1 HP>70% (always-on at scope lock) and the burst same-squad condition (⚑4). SOLO SANITY (recon): as a lone B3 she can never Full-Burst, so S2 and all burst blocks correctly never fire solo; only S1 applies — matches the engine's chain arithmetic, no special casing needed. ⚑1 CADENCE TUPLE (mandatory): pullsPerSec (SG class default ~1.5) / reloadFrames 62 / rolling-reload — datamine shipped; recon INDEPENDENTLY corroborates ~1.5 pulls/s and reload ~0.6-0.9s (62f ≈ 1.03s — minor tension on reload, recon MEASURED cadence is the trustworthy read); LOW priority, kept per protocol. Recipe: rounds/min + reload gap from any focus video. ⚑2 MAX-AMMO SCOPE: RESOLVED 2026-07-20 — modeled kit-literal (maxAmmoFlat 5 to ALL allies, 10s). Residual recipe (confirmation, not a blocker): focused teammate mag-length delta during noir's FB 10s window. ⚑3 HIT-RATE → core/landing magnitude (HARD RULE 4 — PROVEN direction, magnitude unmeasured): 13.93% (SG allies, 10s in FB) + 11.61% (allies, 30s). Estimate: small landing/core lift — recon shows near-all-pellet landing on the large boss already, so the marginal in-FB gain is likely small there. Recipe: HR-on vs HR-off per-mag running-counter deltas / core fraction on an HR-clean SG anchor. ⚑4 SAME-SQUAD GATE: RESOLVED 2026-07-20 — OWNER-CONFIRMED the gate is real (buff does NOT appear without a same-squad teammate); enacted as teamHas:{slugs:[blanc,rouge]} on burst block 3. ⚑5 MULTI-PROJECTILE (10 pellets, prior 5): split-vs-merge is engine-owned (SG landing bands) — recon measured ~all-pellet landing on the large boss; noir IS the anchor those bands are calibrated to; no override lever. || Kit-autonomy gauntlet 2026-07-25: all 8 kit lines re-derived test-first (scripts/tests/units/noir.test.ts, 18 pins GREEN vs shipped); cross-family S2b (claude-fable-5) converged GO, no REAL-GOTCHA. Kit-faithful; measurement/tuning status unchanged (parser-baseline banner retained).",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill2: Max Ammo +5 rounds now modeled kit-literal (maxAmmoFlat 5, ALL allies, 10s — enacted 2026-07-20; a focused-SG-teammate mag-length read remains the nice-to-have confirmation ⚑)",
    "burst: Hit Rate ▲ (13.93% SG-allies /10s, 11.61% allies /30s) modeled as hitRatePct — LIVE since CONE_DELTA (2026-07-19): feeds acrForHR core-hit fraction for AR/SMG/SG recipients (MG/SR/RL keep the flat table); in-game magnitude unmeasured (⚑)",
    "burst: the 11.61%/19.36% block is gated on a same-squad ally in the team (blanc or rouge — owner-ruled 2026-07-20, teamHas slug gate); inert in comps without one"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "buff", "stat": "casterAtkPct", "value": 14.08 }]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "maxAmmoFlat", "value": 5, "durationSec": 10 }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "instantReload", "fraction": 0.3988 }]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 351.64 }]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "alliesOfWeapon", "weapon": "SG" },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 13.93,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 23.23,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "teamHas": { "slugs": ["blanc", "rouge"] },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 11.61,
          "durationSec": 30
        },
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 19.36,
          "durationSec": 30
        }
      ]
    }
  ]
}
```
