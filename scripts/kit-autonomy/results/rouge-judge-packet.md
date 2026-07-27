=== S7 RECONCILING-JUDGE PACKET — unit rouge (Rouge) ===
Binding cross-family judge. Grade the DRIVER's artifacts against the blind roles + ground truth per the contract below.

==================== PART 1: JUDGE CONTRACT ====================

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

==================== PART 2: MECHANICS SSOT ====================
--- docs/data/damage-calculation.md (damage formula + Max-HP->ATK ruling) ---

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

--- docs/data/game-mechanics.md (burst rotation / CDR / positional mechanics) ---

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

==================== PART 3: GROUND TRUTH (kit prose + base stats) ====================
Unit: Rouge (rouge)
Weapon/Class/Element/Burst: SR / Supporter / Electric / Burst I, cd 20s
Base stats: hp 15000, atk 500, def 84, critRate 15, critDamage 150
Ammo 6, reloadFrames 161, chargeFrames 60, hitsPerShot 1, normalAttackMultiplier 71.07, chargeMultiplier 250, burstGaugePerShot 2.9

skill1:
■ Activates when attacking with Full Charge for 8 time(s). Affects all allies.
Max HP ▲ 5% of the skill user's Max HP without restoring HP, lasts for 5 sec.
Cooldown of Burst Skill ▼ 7 sec.

skill2:
■ Activates when assigned to the back row in battle. Affects self and 2 allies on both sides.
Sword Coin: Attack Damage ▲ 6.65% continuously.
■ Activates when attacking with Full Charge for 30 time(s). Affects self and 2 allies on both sides when in Sword Coin status.
Shield Coin: Damage Taken ▼15.2% continuously.
■ Activates when using Burst Skill for 5 time(s). Affects all allies when in Shield Coin status.
Double Sword Coin: Max HP ▲ 15.08% of the skill user's Max HP continuously.

burst:
■ Affects all allies.
ATK ▲ 15.07% of the skill user's ATK for 10 sec.
■ Activates when in Sword Coin status. Affects all allies.
Max HP ▲ 10.15% of the skill user's Max HP without restoring HP, lasts for 10 sec.
■ Activates when in Shield Coin status. Affects all allies.
Max HP ▲ 20.1% of the skill user's Max HP for 10 sec.
■ Activates when in Double Sword Coin status. Affects all allies.
Max HP ▲ 30.02% of the skill user's Max HP without restoring HP, lasts for 10 sec.

==================== PART 4: S2b TEST-FAITHFULNESS REVIEW (claude-fable-5) ====================
{
"slug": "rouge",
"leakDetected": null,
"spec": [
{
"slot": "skill1",
"kitLine": "Full Charge 8x → Max HP ▲5% caster, 5s",
"disposition": "FAITHFUL",
"scope": "Buff applies on a full-charge attack counter; the grant itself is a generic Max HP stat (no attack-type scope).",
"durationSemantics": "durationSec: 5 — wall-clock, explicitly 'lasts for 5 sec'. Repeats every 8 full charges (refreshing).",
"triggerIdentity": "chargeCounter count:8 (repeating every-8 full-charge attacks; SR at chargeFrames 60 full-charges every shot, so ≈ every 8 rounds, spanning reloads). NOT interval, NOT once-per-battle.",
"targetSet": "All allies (including self).",
"nearestWrongModel": "targetMaxHpPct (5% of each TARGET's own Max HP) instead of casterMaxHpPct, and/or omitting durationSec so the grant is permanent.",
"distinguishingAssertion": "Every buffApply for this key has stat 'maxHpFlat' with the IDENTICAL flat value = 0.05 × rouge's final Max HP on all 5 targetIdx (not per-target-scaled), with expiresFrame ≈ apply+5s; application count over the run ≈ floor(fullChargeShots/8).",
"inertness": "Removing only this Max-HP effect must move NO unit's totalDamage (ally-granted Max HP never feeds atkOfMaxHpPct; rouge has no HP→ATK scaler).",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill1",
"kitLine": "Cooldown of Burst Skill ▼ 7 sec",
"disposition": "FAITHFUL",
"scope": "Burst-cooldown reduction, unscoped to attack type; rides the same 8-full-charge trigger as the Max HP grant.",
"durationSemantics": "Instantaneous CD reduction event (burstCdr seconds:7), not a timed buff — no durationSec at all.",
"triggerIdentity": "Same chargeCounter count:8 block. NOT oncePerBattle, NOT a passive aura, NOT fillGauge.",
"targetSet": "All allies (every unit's burst cooldown, including rouge's own 20s CD).",
"nearestWrongModel": "Once-per-battle CDR, self-only CDR, or encoding as fillGauge (gauge %) instead of burstCdr (cooldown seconds) — each collapses her Liter-style rotation acceleration.",
"distinguishingAssertion": "In a long run, successive rouge burstCast timestamps are spaced < 20s (her own base CD) once she is firing — ≈ 20s minus 7s per ~12s of charging; and the effect recurs (2nd, 3rd applications observable), vs exactly-20s spacing under the nearest-wrong. Team-wide: removing this one effect via withPatchedOverride must REDUCE the fullBurstStart count over 180s.",
"inertness": "With the effect removed, burst spacing reverts to each unit's base CD — nothing else about her damage moves.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "back row → Sword Coin: Attack Damage ▲6.65%",
"disposition": "FAITHFUL",
"scope": "Generic Attack Damage (Damage Up bucket, attackDamagePct) — applies to all the holders' damage, not a normal-attack-scoped stat.",
"durationSemantics": "'continuously' = permanent passive (no durationSec), active from t=0. NOT a timed buff.",
"triggerIdentity": "passive, conditioned on back-row assignment — a positional condition the engine has no row primitive for. Faithful stand-in: assume the Supporter is back-row (⚑ documented assumption), so trigger {kind:'passive'}. Do NOT invent a combat trigger.",
"targetSet": "selfAndAdjacent sides:2 ('self and 2 allies on both sides') — POSITIONAL, up to 5 units only if rouge is centered; an edge slot reaches only 3 units.",
"nearestWrongModel": "target {kind:'allies'} (position-blind, always all 5), or dropping the whole block as 'unexpressable back-row condition' (MISSING).",
"distinguishingAssertion": "buffApply attackDamagePct value 6.65 present at t≈0 on rouge and adjacent slots; with rouge placed in an END slot, a unit ≥3 slots away receives NO such buffApply and its totalDamage is unchanged vs a no-rouge-S2 patch — red under the all-allies misread, red-in-reverse under the dropped-block misread.",
"inertness": "Non-adjacent units' damage must NOT move from this line when rouge is edge-slotted.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "skill2",
"kitLine": "Full Charge 30x → Shield Coin: Dmg Taken ▼15.2%",
"disposition": "UNMODELED",
"scope": "Defensive: allies take 15.2% less damage — v1 boss deals no damage, so the EFFECT is inert. The Shield Coin STATUS it confers is a gate consumed by skill2 block 3 and burst rider 3, so the status transition itself must still be tracked (resource-pool encoding).",
"durationSemantics": "'continuously' = permanent once activated (~30 full charges ≈ 40–50s in at her ~1s charge + 6-ammo/161f reload economy).",
"triggerIdentity": "chargeCounter count:30, gated on targets already holding Sword Coin.",
"targetSet": "selfAndAdjacent sides:2, further gated 'when in Sword Coin status'.",
"nearestWrongModel": "Encoding Damage Taken ▼ as a boss damageTakenPct DEBUFF (sign/side flip → team deals +15.2%!) — the taxonomy-4 trap inverted: this is an ALLY defensive buff, not a boss debuff.",
"distinguishingAssertion": "NO damage event's Damage-Up bucket changes when this block activates; boss carries no buffApply with value 15.2 (no casterIdx:null/targetIdx:null debuff apply). The only observable is the coin-state resource crossing that later arms burst rider 3.",
"inertness": "Total damage of every unit identical with the ▼15.2% effect present vs absent (status tracking retained).",
"evidenceTier": "DATAMINED",
"loadBearing": false
},
{
"slot": "skill2",
"kitLine": "Burst Skill 5x → Double Sword: MaxHP ▲15.08%",
"disposition": "FAITHFUL",
"scope": "Generic Max HP grant, caster-scaled ('of the skill user's Max HP').",
"durationSemantics": "'continuously' = permanent once granted.",
"triggerIdentity": "burstCast (rouge's OWN burst uses) with everyN:5 — 'when using Burst Skill' is her own cast counter, NOT fullBurstEnter and NOT team burst count. Gated on targets in Shield Coin status.",
"targetSet": "All allies, 'when in Shield Coin status'.",
"nearestWrongModel": "Counting TEAM Full Bursts (fullBurstEnter everyN:5 — fires ~5 rotations in regardless of rouge casting) instead of rouge's own 5th burstCast; or 'for 5 time(s)' misread as durationSec:5.",
"distinguishingAssertion": "The maxHpFlat buffApply (value = 0.1508 × rouge Max HP, no expiresFrame) first appears at rouge's 5th burstCast event — count rouge-srcSlot burstCast events before it: exactly 5. Red if it appears at the 5th fullBurstStart when rouge skipped a cast (not possible for a lone B1, so ALSO assert: never before ~5 rotations).",
"inertness": "Zero totalDamage movement from the grant itself (ally Max HP feeds no scaler here).",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "ATK ▲15.07% of skill user's ATK, 10 sec",
"disposition": "FAITHFUL",
"scope": "Unconditional burst component — the only coin-ungated line in her burst.",
"durationSemantics": "durationSec: 10.",
"triggerIdentity": "burstCast (B1; she casts every rotation as the comp's Burst I). Instant on-cast buff — lands PRE-FB by cast timing.",
"targetSet": "All allies.",
"nearestWrongModel": "stat 'atkPct' value 15.07 (scaling each TARGET's own ATK — massively over-credits a high-ATK carry) instead of casterAtkPct; rouge is a low-ATK SR Supporter so caster-scaled is much smaller.",
"distinguishingAssertion": "buffApply carries stat 'casterAtkPct' with a FLAT value = 0.1507 × rouge.staticAtk (identical number on all 5 targets, small relative to the carry's ATK) — red if stat is 'atkPct'/value 15.07 or if the flat value tracks each target's own ATK.",
"inertness": "Buff must lapse at +10s (expiresFrame), not persist to the next rotation.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Sword Coin: MaxHP ▲10.15% no-restore, 10s",
"disposition": "FAITHFUL",
"scope": "Coin-state-gated burst rider, tier 1 (Sword).",
"durationSemantics": "durationSec: 10; 'without restoring HP' → pure Max HP, NO heal/recovery event.",
"triggerIdentity": "burstCast + coin-state gate (resourceGate at Sword tier).",
"targetSet": "All allies.",
"nearestWrongModel": "Emitting a heal event alongside the Max HP grant (the no-restore clause dropped) — spuriously feeding Crown's on-recovery consumers every rotation from fight start.",
"distinguishingAssertion": "During Sword-Coin-phase bursts: maxHpFlat buffApply (0.1015 × rouge HP) present, but NO recovery-triggered buffApply appears on crown attributable to rouge's cast — red under the heal misread.",
"inertness": "crown's recovery-driven buffs must NOT proc off this rider.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Shield Coin: Max HP ▲20.1%, 10s (restores)",
"disposition": "MISSING",
"scope": "Coin-state-gated burst rider, tier 2 (Shield). CRITICAL: this is the ONLY Max-HP line in the whole kit WITHOUT the 'without restoring HP' clause — by contrast with its four siblings, it RESTORES HP, i.e. it is a heal.",
"durationSemantics": "durationSec: 10 on the Max HP stat; the restore is an instant heal event at cast.",
"triggerIdentity": "burstCast + Shield-tier coin gate (active ≈ after 30 full charges, mid-fight onward).",
"targetSet": "All allies.",
"nearestWrongModel": "Modeling it identically to the tier-1/tier-3 riders (maxHpFlat only, no heal) — the shared-prior copy-paste misread. That silently deletes a TANDEM channel: a heal to all allies fires every on-recovery trigger (crown's 'when recovery takes effect' engine) on every rouge burst once Shield Coin is up.",
"distinguishingAssertion": "In Shield-Coin-phase rotations, rouge's burstCast is followed by heal→recovery events on all allies and crown's recovery-triggered buffApply fires; in Sword-Coin-phase rotations it does not. Red under the no-heal misread (crown's recovery consumers stay silent all fight from rouge).",
"inertness": "Before Shield Coin activates (< ~30 full charges), this rider must contribute nothing.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Double Sword: MaxHP ▲30.02% no-restore, 10s",
"disposition": "FAITHFUL",
"scope": "Coin-state-gated burst rider, tier 3 (Double Sword).",
"durationSemantics": "durationSec: 10; explicitly no-restore → no heal event.",
"triggerIdentity": "burstCast + Double-Sword-tier coin gate (active only after rouge's 5th burst cast AND the Shield tier was reached).",
"targetSet": "All allies.",
"nearestWrongModel": "Firing this rider CUMULATIVELY with tiers 1–2 every late-fight burst (if coins are modeled as coexisting) vs exclusively (highest tier only) — and/or adding a heal it doesn't have.",
"distinguishingAssertion": "After Double Sword is armed, a single rouge burstCast emits the 0.3002 × rouge-HP maxHpFlat apply; assert the per-cast rider multiplicity matches the chosen coin-exclusivity model and that NO recovery event accompanies this tier. (Which multiplicity is correct is measurement-gated — see notes.)",
"inertness": "Zero damage movement; no crown recovery proc from this tier.",
"evidenceTier": "DATAMINED",
"loadBearing": true
}
],
"loadBearingSet": [
"skill1:MaxHP-5%-5s (caster-scaled flat, expiry semantics)",
"skill1:burstCdr-7s-per-8-full-charges (rotation engine — the kit's biggest damage lever)",
"skill2:SwordCoin-attackDamagePct-6.65-positional-passive",
"skill2:DoubleSword-grant-on-own-5th-burstCast",
"burst:casterAtkPct-15.07-10s",
"burst:SwordCoin-rider-no-heal",
"burst:ShieldCoin-rider-WITH-heal (crown recovery tandem)",
"burst:DoubleSword-rider-no-heal"
],
"unmodeledVerbatim": {
"skill1": [],
"skill2": [
"Shield Coin: Damage Taken ▼15.2% continuously (defensive — v1 boss deals no damage; the Shield Coin STATUS itself must still be tracked as the gate for skill2 block 3 and burst rider 3)"
],
"burst": []
},
"notes": "Three reconciliation points the driver must answer. (1) COIN EXCLUSIVITY (⚑ MEASUREMENT-GATED): the prose is silent on whether upgrading Sword→Shield→Double Sword REPLACES the prior coin or COEXISTS. This is load-bearing through the only offensive coin effect: if Shield Coin replaces Sword Coin at ~30 full charges, the team LOSES the 6.65% Attack Damage mid-fight; the lazy model (permanent passive from t=0 forever) is exactly the shared-prior misread I expect both families to make. It also decides burst-rider multiplicity (one rider per cast vs stacking tiers). Tests must pin whichever model is chosen and ⚑ it. (2) THE HEAL ASYMMETRY: four of five Max-HP lines say 'without restoring HP'; the Shield-Coin burst rider alone omits the clause — read literally (per the literal-word rule) it restores HP and must emit a heal, arming on-recovery consumers (crown is in the control comp), turning an 'inert Max HP kit' partially live. Expect the drivers to copy-paste the no-restore encoding across all four riders. (3) TRIGGER ARITHMETIC: 'attacking with Full Charge for N time(s)' is a repeating per-N full-charge counter (chargeCounter), and 'when using Burst Skill for 5 time(s)' counts ROUGE'S OWN casts (burstCast everyN:5), never team Full Bursts. Secondary: skill1's CDR must be burstCdr seconds:7 to ALL allies, recurring — not fillGauge, not self-only, not once-per-battle; her S2 aura target is POSITIONAL (selfAndAdjacent sides:2), distinguishable by edge-slotting her; the back-row condition has no engine primitive — passive with a documented ⚑ back-row assumption is the faithful stand-in, and dropping the block entirely (MISSING) is the other failure branch. All magnitudes are kit-literal (DATAMINED); no CALIBRATED values are needed anywhere in this kit. I could not write scripts/kit-autonomy/reviews/rouge.test-review.json (no tools in this environment) — the JSON above is the complete artifact.",
"model": "claude-fable-5"
}

==================== PART 5: S5 BLIND TEST (claude-opus-5) + result vs driver override ====================
// blind/rouge.test.ts (pristine). ADAPTED copy (3 structural fixes, intent unchanged) is GREEN vs driver override: 23 passed, 3 skipped GAPs.
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

- rouge (Rouge) — SR/Electric/Supporter/Burst I. Blind per-unit kit spec test.
-
- KIT (structural read, from prose):
- skill1: [full-charge x8, all allies] Max HP +5% of CASTER Max HP (no heal), 5 sec
-                                       Burst Skill cooldown -7 sec
- skill2: [back-row formation, self + 2 adjacent] Sword Coin: Attack Damage +6.65% continuously
-          [full-charge x30, self + 2 adjacent, requires Sword Coin] Shield Coin: Damage Taken -15.2% cont.
-          [burst cast x5, all allies, requires Shield Coin] Double Sword Coin: Max HP +15.08% of caster cont.
- burst: [all allies] ATK +15.07% of the SKILL USER's ATK, 10 sec
-          [in Sword Coin] Max HP +10.15% of caster (no heal), 10 sec
-          [in Shield Coin] Max HP +20.1% of caster, 10 sec
-          [in Double Sword Coin] Max HP +30.02% of caster (no heal), 10 sec
-
- FIXTURE: controlComp('rouge', true) — liter B1 / crown B2 / rouge / helm B3.
- rouge is Burst I, so she casts in the B1 slot every rotation and the chain still
- completes (crown B2 + helm B3) — bursts genuinely fire, which every burst-keyed
- assertion below depends on. helm=true is kept because helm is the B3 that closes
- the chain; her buffs are read-around by filtering events on casterIdx/stat.
-
- WHY EACH ASSERTION DISCRIMINATES:
- - The burst ATK line says "of the skill user's ATK" => casterAtkPct, which the
- harness FLAT-RESOLVES at apply time. Asserting the emitted flat value equals
- 0.1507 x rouge.staticAtk fails under the nearest-wrong model (plain atkPct 15.07,
- which would emit the raw percentage and scale each TARGET's own ATK).
- - Sword Coin is "Attack Damage" => attackDamagePct (Damage Up bucket), NOT atkPct.
- The counterfactual swaps the stat and the run diverges.
- - Sword Coin targets "self and 2 allies on both sides" => selfAndAdjacent, NOT all
- allies. In a 4-slot comp with rouge at index 2 that still leaves one ally outside
- the window; the counterfactual widening to allies changes that ally's total.
- - Sword Coin is formation-gated on the BACK ROW. v1 has no row axis, so this is
- flagged (see gaps) — the test pins that the block is authored as an always-on
- passive and documents the assumption rather than silently asserting a row.
- - The 8-full-charge / 30-full-charge triggers are chargeCounter, NOT hitCount:
- the text says "attacking with Full Charge for N time(s)", i.e. N FULL CHARGES,
- and rouge is a charge SR (chargeFrames 60). Counting trigger pulls instead
- would over-fire; the cadence assertion below bounds the observed count.
- - Every Max HP line grants a % of the CASTER's Max HP to ALLIES. Per the schema's
- e3 rule, ally-granted Max HP does NOT feed a teammate's atkOfMaxHpPct, and no
- unit in this comp carries atkOfMaxHpPct — so these lines are OFFENSIVELY INERT.
- They are asserted present in the event log (encoded, not dropped) AND asserted
- damage-inert by a counterfactual that deletes them.
- - Damage Taken -15.2% is a DEFENSIVE self/ally buff, not a boss "Damage Taken +"
- debuff. The test asserts it never lands on the boss (casterIdx===null path) and
- never carries a positive damageTakenPct that would inflate team damage.
  */

const SLUG = 'rouge';
const FIGHT_SEC = 180;

type Ev = SimEvent & Record<string, any>;

function run(overrides?: Record<string, any>) {
const events: Ev[] = [];
const opts: any = controlComp(SLUG, true);
opts.onEvent = (ev: Ev) => events.push(ev);
if (overrides) opts.overrides = overrides;
const res = runComp(opts);
return { res, events };
}

function buffs(events: Ev[], stat: string) {
return events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
}

// ---------------------------------------------------------------- hoisted runs
const base = run();
const baseTotals = totals(base.res);
const rouge = unitOf(base.res, SLUG);

// Counterfactual A: burst ATK line re-keyed to plain atkPct (nearest-wrong reading of
// "ATK \u25b2 15.07% of the skill user's ATK").
const cfAtkPct = run({
[SLUG]: withPatchedOverride(SLUG, (ov: any) => {
for (const b of ov.burst ?? []) {
for (const e of b.effects ?? []) {
if (e.kind === 'buff' && e.stat === 'casterAtkPct') e.stat = 'atkPct';
}
}
}),
});

// Counterfactual B: Sword Coin re-keyed to atkPct (wrong bucket for "Attack Damage").
const cfSwordBucket = run({
[SLUG]: withPatchedOverride(SLUG, (ov: any) => {
for (const b of ov.skill2 ?? []) {
for (const e of b.effects ?? []) {
if (e.kind === 'buff' && e.stat === 'attackDamagePct') e.stat = 'atkPct';
}
}
}),
});

// Counterfactual C: Sword Coin widened from selfAndAdjacent to all allies.
const cfSwordTargets = run({
[SLUG]: withPatchedOverride(SLUG, (ov: any) => {
for (const b of ov.skill2 ?? []) {
const hasSword = (b.effects ?? []).some(
(e: any) => e.kind === 'buff' && e.stat === 'attackDamagePct',
);
if (hasSword) b.target = { kind: 'allies' };
}
}),
});

// Counterfactual D: burst ATK buff deleted entirely (proves the line is load-bearing).
const cfNoBurstAtk = run({
[SLUG]: withPatchedOverride(SLUG, (ov: any) => {
for (const b of ov.burst ?? []) {
b.effects = (b.effects ?? []).filter(
(e: any) => !(e.kind === 'buff' && e.stat === 'casterAtkPct'),
);
}
}),
});

// Counterfactual E: every Max-HP grant stripped from all three slots (inertness probe).
const cfNoMaxHp = run({
[SLUG]: withPatchedOverride(SLUG, (ov: any) => {
for (const slot of ['skill1', 'skill2', 'burst'] as const) {
for (const b of ov[slot] ?? []) {
b.effects = (b.effects ?? []).filter(
(e: any) =>
!(
e.kind === 'buff' &&
(e.stat === 'casterMaxHpPct' ||
e.stat === 'maxHpFlat' ||
e.stat === 'targetMaxHpPct')
),
);
}
}
}),
});

// Counterfactual F: burst CDR removed (skill1's "Cooldown of Burst Skill \u25bc 7 sec").
const cfNoCdr = run({
[SLUG]: withPatchedOverride(SLUG, (ov: any) => {
for (const slot of ['skill1', 'skill2', 'burst'] as const) {
for (const b of ov[slot] ?? []) {
b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'burstCdr');
}
}
}),
});

// Counterfactual G: Damage Taken \u25bc re-signed as a positive boss debuff (the classic
// "Damage Taken \u25b2 is a boss debuff" confusion applied to a \u25bc defensive line).
const cfDamageTakenSign = run({
[SLUG]: withPatchedOverride(SLUG, (ov: any) => {
for (const b of ov.skill2 ?? []) {
for (const e of b.effects ?? []) {
if (e.kind === 'buff' && e.stat === 'damageTakenPct' && e.value < 0) {
e.value = Math.abs(e.value);
b.target = { kind: 'enemy' };
}
}
}
}),
});

describe('rouge — fixture sanity (non-vacuity)', () => {
it('rouge is in the comp and the comp actually deals damage', () => {
expect(rouge.totalDamage).toBeGreaterThan(0);
expect(Object.keys(baseTotals).length).toBeGreaterThanOrEqual(4);
for (const slug of Object.keys(baseTotals)) {
expect(baseTotals[slug]).toBeGreaterThan(0);
}
});

it('bursts genuinely cast and full bursts genuinely occur', () => {
// Non-vacuity for every burst-keyed and full-burst-keyed assertion below.
const casts = base.events.filter((e) => e.kind === 'burstCast');
const fbs = base.events.filter((e) => e.kind === 'fullBurstStart');
expect(casts.length).toBeGreaterThan(0);
expect(fbs.length).toBeGreaterThan(0);
// rouge is Burst I: she must be among the casters, or her burst block never fires.
expect(casts.some((e) => e.targetSlug === SLUG || e.slug === SLUG)).toBe(true);
});

it('rouge fires charge shots, so the full-charge counters are reachable', () => {
const shots = base.events.filter(
(e) => e.kind === 'shot' && (e.slug === SLUG || e.targetSlug === SLUG),
);
// 180s at SR cadence with chargeFrames 60 and ammo 6 => tens of charges.
// The 8-charge tier must be reachable many times; the 30-charge tier at least once.
expect(shots.length).toBeGreaterThanOrEqual(30);
});
});

describe('rouge burst — ATK \u25b2 15.07% of the skill user\u2019s ATK, 10 sec, all allies', () => {
it('emits a caster-scaled (FLAT-resolved) ATK buff, not a raw 15.07 percentage', () => {
const evs = buffs(base.events, 'casterAtkPct');
expect(evs.length).toBeGreaterThan(0);
// FLAT-resolved: value = 0.1507 x rouge.staticAtk. The nearest-wrong model (atkPct)
// would emit the literal 15.07 instead, so this bound discriminates directly.
for (const e of evs) {
expect(e.value).toBeGreaterThan(15.07);
}
});

it('lasts 10 sec (expiresFrame is ~600 frames past apply), not permanent', () => {
const e = buffs(base.events, 'casterAtkPct')[0];
expect(e.expiresFrame).toBeDefined();
expect(e.expiresFrame).toBeLessThan(FIGHT_SEC * 60);
expect(e.durationShots).toBeUndefined(); // seconds, not ROUNDS
});

it('reaches ALL allies (every comp member receives it)', () => {
const hit = new Set(
buffs(base.events, 'casterAtkPct')
.map((e) => e.targetSlug)
.filter(Boolean),
);
for (const slug of Object.keys(baseTotals)) {
expect(hit.has(slug)).toBe(true);
}
});

it('is load-bearing: removing it lowers team damage', () => {
const off = totals(cfNoBurstAtk.res);
const sum = (t: Record<string, number>) =>
Object.values(t).reduce((a, b) => a + b, 0);
expect(sum(off)).toBeLessThan(sum(baseTotals));
});

it('RED under the nearest-wrong reading (plain atkPct instead of casterAtkPct)', () => {
const wrong = totals(cfAtkPct.res);
const sum = (t: Record<string, number>) =>
Object.values(t).reduce((a, b) => a + b, 0);
expect(sum(wrong)).not.toBeCloseTo(sum(baseTotals), 0);
});
});

describe('rouge skill2 — Sword Coin: Attack Damage \u25b2 6.65% continuously', () => {
it('is encoded in the Damage Up bucket (attackDamagePct), value 6.65', () => {
const evs = buffs(base.events, 'attackDamagePct').filter(
(e) => Math.abs(e.value - 6.65) < 1e-6,
);
expect(evs.length).toBeGreaterThan(0);
});

it('is CONTINUOUS: no time expiry and no round count', () => {
const e = buffs(base.events, 'attackDamagePct').find(
(x) => Math.abs(x.value - 6.65) < 1e-6,
)!;
expect(e.durationShots).toBeUndefined();
// "continuously" => either no expiry, or one past the end of the fight.
if (e.expiresFrame != null) {
expect(e.expiresFrame).toBeGreaterThanOrEqual(FIGHT_SEC * 60);
}
});

it('targets self + 2 adjacent, NOT all allies (widening changes the board)', () => {
const wide = totals(cfSwordTargets.res);
const sum = (t: Record<string, number>) =>
Object.values(t).reduce((a, b) => a + b, 0);
// In a 4-unit comp, selfAndAdjacent leaves exactly one ally uncovered, so widening
// to `allies` must raise the team total. If this ever goes GREEN-equal the target
// encoding is indistinguishable and the assertion is vacuous.
expect(sum(wide)).toBeGreaterThan(sum(baseTotals));
});

it('RED under the wrong bucket (atkPct instead of attackDamagePct)', () => {
const wrong = totals(cfSwordBucket.res);
const sum = (t: Record<string, number>) =>
Object.values(t).reduce((a, b) => a + b, 0);
expect(sum(wrong)).not.toBeCloseTo(sum(baseTotals), 0);
});
});

describe('rouge skill1 — Cooldown of Burst Skill \u25bc 7 sec', () => {
it('is encoded as a burstCdr effect worth 7 seconds', () => {
const ov = withPatchedOverride(SLUG, () => {}) as any;
const all = [...(ov.skill1 ?? []), ...(ov.skill2 ?? []), ...(ov.burst ?? [])];
const cdr = all
.flatMap((b: any) => b.effects ?? [])
.filter((e: any) => e.kind === 'burstCdr');
expect(cdr.length).toBeGreaterThan(0);
expect(cdr.some((e: any) => Math.abs(e.seconds - 7) < 1e-6)).toBe(true);
});

it('is load-bearing: removing it changes the rotation (burst-cast count)', () => {
const withCdr = base.events.filter((e) => e.kind === 'burstCast').length;
const without = cfNoCdr.events.filter((e) => e.kind === 'burstCast').length;
// CDR compresses the rotation => at least as many casts with it as without,
// and over a 180s fight the 7s cut must produce strictly more.
expect(withCdr).toBeGreaterThan(without);
});
});

describe('rouge — full-charge counters (8 / 30) are charge-keyed, not pull-keyed', () => {
it('the 8-charge tier fires repeatedly but far fewer times than rouge fires shots', () => {
const shots = base.events.filter(
(e) => e.kind === 'shot' && (e.slug === SLUG || e.targetSlug === SLUG),
).length;
// The skill1 Max-HP grant is the observable of the 8-charge trigger.
const fires = buffs(base.events, 'maxHpFlat').filter(
(e) => e.expiresFrame != null,
).length;
expect(fires).toBeGreaterThan(0);
// A hitCount:8 misread on trigger PULLS would fire ~shots/8 times; a chargeCounter
// on FULL CHARGES fires strictly less often. Bound it well under shots/8 x allies.
expect(fires).toBeLessThan(shots);
});

it('the 30-charge tier (Shield Coin) is reachable at least once in 180s', () => {
const shield = buffs(base.events, 'damageTakenPct');
// Non-vacuity for the Shield-Coin-gated burst branch: if this is 0, the
// Double-Sword-Coin chain can never open either and those assertions test nothing.
expect(shield.length).toBeGreaterThan(0);
});
});

describe('rouge skill2 — Shield Coin: Damage Taken \u25bc15.2% (defensive, ally-scoped)', () => {
it('is a NEGATIVE damageTakenPct on ALLIES, never a positive boss debuff', () => {
const evs = buffs(base.events, 'damageTakenPct');
expect(evs.length).toBeGreaterThan(0);
for (const e of evs) {
// \u25bc on allies => negative value; a boss debuff would be positive AND land with
// casterIdx===null && targetIdx===null.
expect(e.value).toBeLessThan(0);
expect(e.casterIdx === null && e.targetIdx === null).toBe(false);
}
});

it('is damage-INERT (the v1 boss deals no damage to allies)', () => {
// Encoded for completeness, but must move nothing.
const off = totals(cfDamageTakenSign.res);
// Flipping the sign AND re-pointing at the enemy turns a defensive line into a
// team-wide damage amp — if this were equal, the sign/target encoding would be
// untested. It must differ, proving the faithful (negative, ally) encoding is
// the one being exercised.
const sum = (t: Record<string, number>) =>
Object.values(t).reduce((a, b) => a + b, 0);
expect(sum(off)).toBeGreaterThan(sum(baseTotals));
});
});

describe('rouge — every Max HP grant (skill1 5%, S2 15.08%, burst 10.15/20.1/30.02%)', () => {
it('all four burst/skill Max-HP lines are ENCODED (flat-resolved maxHpFlat events)', () => {
const evs = buffs(base.events, 'maxHpFlat');
expect(evs.length).toBeGreaterThan(0);
// Caster-scaled => FLAT HP numbers, not the raw kit percentages.
for (const e of evs) {
expect(e.value).toBeGreaterThan(30.02);
}
});

it('they reach allies (caster-scaled ally grants, not self-only)', () => {
const hit = new Set(
buffs(base.events, 'maxHpFlat')
.map((e) => e.targetSlug)
.filter(Boolean),
);
expect(hit.size).toBeGreaterThan(1);
});

it('are OFFENSIVELY INERT: deleting every one of them moves ZERO damage', () => {
// e3 rule: ally-granted Max HP never feeds a teammate\u2019s atkOfMaxHpPct, and no
// unit in this comp carries that conversion. Byte-identical totals required.
const off = totals(cfNoMaxHp.res);
for (const slug of Object.keys(baseTotals)) {
expect(off[slug]).toBe(baseTotals[slug]);
}
});
});

describe('rouge — teammate inertness / no over-reach', () => {
it('rouge\u2019s own damage is unaffected by the Max-HP lines', () => {
expect(unitOf(cfNoMaxHp.res, SLUG).totalDamage).toBe(rouge.totalDamage);
});

it('no unexpected stat channels are opened by this kit', () => {
// Rouge grants exactly: casterAtkPct, attackDamagePct, maxHpFlat, damageTakenPct.
// Anything else from rouge would be an invented mechanic.
const rougeStats = new Set(
base.events
.filter((e) => e.kind === 'buffApply' && e.casterSlug === SLUG)
.map((e) => e.stat),
);
for (const s of rougeStats) {
expect([
'casterAtkPct',
'attackDamagePct',
'maxHpFlat',
'damageTakenPct',
]).toContain(s);
}
});
});

describe('rouge — GAPs (no engine primitive)', () => {
it.skip('skill2 Sword Coin is gated on BACK-ROW assignment — v1 has no row axis', () => {
// "Activates when assigned to the back row in battle." The engine has a `formation`
// gate for noB1/hasB1 only; there is no row/position axis, so the block is authored
// as an unconditional passive. Assumption: the unit IS back row (the standard
// supporter placement). No assertion can discriminate until a row axis exists.
});

it.skip('coin TIER progression (Sword -> Shield -> Double Sword) is a status ladder', () => {
// Shield Coin requires Sword Coin status; Double Sword Coin requires Shield Coin.
// There is no self-status primitive (targetStatus is enemy-only), so the ladder is
// approximated by the ordering of the trigger thresholds (passive / 30 charges /
// 5 burst casts). A faithful model would need a self-status gate; the burst\u2019s
// three coin-gated branches inherit the same approximation. All four affected
// payloads are Max HP, which is offensively inert, so the approximation moves
// ZERO damage \u2014 the gap is completeness-only.
});

it.skip('\u201cwithout restoring HP\u201d distinguishes skill1/burst-b/burst-d from burst-c', () => {
// The 20.1% Shield-Coin branch omits the "without restoring HP" qualifier, implying
// it DOES heal \u2014 which would emit a `recovery` event and drive an on-recovery
// consumer (crown\u2019s "when recovery takes effect"). The kit text is ambiguous about
// whether that is a real heal or prose variance. \u26d1 FLAGGED: not modeled as a heal.
// Recipe: record a rouge+crown comp and check whether crown\u2019s on-recovery buff
// refreshes on rouge\u2019s burst. If it does, add a `heal` effect to that branch \u2014 it
// would be a TANDEM (cross-unit) damage source, not an inert defensive line.
});
});

==================== PART 6: S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver ====================
DRIVER vs S6 BLIND OVERRIDE — short diff:
CONVERGED (load-bearing offensive lines, byte-identical intent):

- S1 burstCdr 7s to all allies every 8 Full Charges (both; the kit's dominant rotation lever).
- S2 Sword Coin attackDamagePct 6.65, passive, continuous (both).
- Burst casterAtkPct 15.07, all allies, 10s, burstCast (both; flat-resolved off rouge ATK).
- HP-scaling determination: every Max-HP grant is an INERT casterMaxHpPct ally grant (both agree; ally-granted Max HP does NOT feed atkOfMaxHpPct — SSOT damage-calculation.md:106).
- Both flag coin-exclusivity (measurement-gated) and the Shield-Coin burst-rider heal asymmetry.
  DIVERGENCES (all inert / structural / driver-favored):

1. selfAndAdjacent WIDTH: driver sides:2 (literal '2 allies on both sides' = 2 per side = up to 5) vs opus sides:1 (opus itself flags this as a ⚑ with sides:2 as the alternative). Driver reading is the literal one.
2. Full-charge trigger: driver hitCount{count:8/30} (a valid engine TriggerDef) vs opus chargeCounter (NOT in the engine TriggerDef union — opus flags 'if not, re-key to hitCount'). Driver uses the real primitive.
3. Burst coin-tier Max-HP riders (10.15/20.1/30.02): driver UNMODELED (coin-state-gated, engine tracks no coin state; documenting avoids fabricating per-tier cadence) vs opus MODELED via a top-level resources/coinStage resourceGate proxy (opus notes the proxy may be rejected by validate-overrides and is damage-neutral either way). Both inert.
4. Shield Coin 'Damage Taken ▼15.2%': driver models as inert negative ally damageTakenPct (engine supports ally-side damageTakenPct, inert — cf. moran.json) vs opus UNMODELED ('no ally damage-reduction stat'). Both inert; driver keeps it for kit-completeness with an inertness assertion.
5. S2 Double Sword Max HP 15.08: BOTH model (burstCast everyN:5, inert).
6. Shield-Coin burst-rider heal: driver documents as ⚑ (coin-state-gated, marginal) vs opus models a heal{ticks:1} (tandem read). Both flag it unmeasured; driver is conservative given the coin gate the engine cannot express.
   S5 BLIND TEST vs DRIVER OVERRIDE: pristine blind test (blind/rouge.test.ts) had 3 structural API guesses wrong (opts.onEvent vs cfg.onEvent; durationShots null-vs-undefined; controlComp slots rouge mid-comp masking the positional scope). The ADAPTED copy (blind/rouge.adapted.test.ts, assertion INTENT unchanged) is GREEN vs the driver override: 23 passed, 3 skipped (the 3 documented GAP it.skip blocks).
   --- blind/rouge.override.json ---
   {
   "slug": "rouge",
   "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Rouge (rouge, SR/Electric/Supporter/Burst I) carries ZERO damage lines — no flatDamage/dot/weaponSwap anywhere in the kit — so her whole contribution is (a) skill2 Sword Coin Attack Damage +6.65% to self+adjacent, (b) burst ATK +15.07% of HER ATK to all allies for 10s, and (c) the skill1 team burst-CDR 7s every 8 full charges, which is the single largest lever in the kit (it accelerates the whole team's rotation). Everything else is Max-HP / damage-taken bookkeeping that is offensively inert in v1 (ally-granted Max HP does not feed a teammate's atkOfMaxHpPct; the boss deals no damage). The three 'Coin' statuses are modeled as a monotonic resource pool `coinStage` (1=Sword from t=0, 2=Shield after 30 full charges, 3=Double Sword after her 5th burst while at Shield), read by resourceGate on the burst tiers — that is a STATE PROXY, not a kit-stated mechanic. ⚑ Coin exclusivity is the load-bearing unknown: this baseline assumes each 'continuously' status PERSISTS once granted (cumulative), so the 6.65% Attack Damage runs the whole fight; if the coins instead REPLACE each other, that buff dies at ~30 full charges and this override over-credits. ⚑ The burst's Shield-Coin tier is the ONLY Max-HP line that omits 'without restoring HP', so it is modeled as also emitting a recovery event (heal) — that is what wires it into an on-recovery consumer such as crown, and it is unmeasured. ⚑ The back-row activation condition has no representation in the engine (no row axis) and is assumed SATISFIED. See caveats.",
   "resources": [
   {
   "name": "coinStage",
   "initial": 1,
   "min": 0,
   "max": 3
   }
   ],
   "skill1": [
   {
   "slot": "skill1",
   "trigger": {
   "kind": "chargeCounter",
   "count": 8
   },
   "target": {
   "kind": "allies"
   },
   "effects": [
   {
   "kind": "buff",
   "stat": "casterMaxHpPct",
   "value": 5,
   "durationSec": 5
   }
   ]
   },
   {
   "slot": "skill1",
   "trigger": {
   "kind": "chargeCounter",
   "count": 8
   },
   "target": {
   "kind": "allies"
   },
   "effects": [
   {
   "kind": "burstCdr",
   "seconds": 7
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
   "kind": "selfAndAdjacent",
   "sides": 1
   },
   "effects": [
   {
   "kind": "buff",
   "stat": "attackDamagePct",
   "value": 6.65
   }
   ]
   },
   {
   "slot": "skill2",
   "trigger": {
   "kind": "chargeCounter",
   "count": 30
   },
   "target": {
   "kind": "self"
   },
   "resourceGate": {
   "name": "coinStage",
   "min": 1,
   "max": 1
   },
   "effects": [
   {
   "kind": "resource",
   "name": "coinStage",
   "delta": 1
   }
   ]
   },
   {
   "slot": "skill2",
   "trigger": {
   "kind": "burstCast"
   },
   "everyN": 5,
   "target": {
   "kind": "allies"
   },
   "resourceGate": {
   "name": "coinStage",
   "min": 2,
   "max": 2
   },
   "effects": [
   {
   "kind": "buff",
   "stat": "casterMaxHpPct",
   "value": 15.08
   },
   {
   "kind": "resource",
   "name": "coinStage",
   "delta": 1
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
   "kind": "buff",
   "stat": "casterAtkPct",
   "value": 15.07,
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
   "resourceGate": {
   "name": "coinStage",
   "min": 1
   },
   "effects": [
   {
   "kind": "buff",
   "stat": "casterMaxHpPct",
   "value": 10.15,
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
   "resourceGate": {
   "name": "coinStage",
   "min": 2
   },
   "effects": [
   {
   "kind": "buff",
   "stat": "casterMaxHpPct",
   "value": 20.1,
   "durationSec": 10
   },
   {
   "kind": "heal",
   "ticks": 1
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
   "resourceGate": {
   "name": "coinStage",
   "min": 3
   },
   "effects": [
   {
   "kind": "buff",
   "stat": "casterMaxHpPct",
   "value": 30.02,
   "durationSec": 10
   }
   ]
   }
   ],
   "unmodeled": {
   "skill1": [],
   "skill2": [
   "Shield Coin: Damage Taken ▼15.2% continuously."
   ],
   "burst": []
   },
   "caveats": [
   "⚑ COIN EXCLUSIVITY (only damage-relevant unknown): modeled CUMULATIVE — each 'continuously' status persists once granted, so Sword Coin's Attack Damage ▲6.65% runs the whole fight and the burst Max-HP tiers stack once coinStage=3 (min-gates). If the coins instead REPLACE one another (Sword→Shield→Double Sword ladder), the 6.65% ends at ~30 full charges (~45-50s) and the burst tiers become mutually exclusive (change the burst resourceGates to exact min/max pairs). Kit text carries no removal/upgrade clause, hence the cumulative default.",
   "⚑ BACK-ROW GATE DROPPED: 'Activates when assigned to the back row in battle' has no engine representation (no row/position axis, and no Block gate expresses it — `formation` only encodes noB1/hasB1). Assumed SATISFIED, so the Sword Coin block is a plain passive from t=0 and coinStage.initial=1. If the sim ever models placement, gate this block and set initial=0.",
   "⚑ TARGET WIDTH: 'self and 2 allies on both sides' read as selfAndAdjacent sides:1 (self + 1 ally each side = 3 units). Alternative reading is 2 per side (sides:2, 5 units). Only affects who receives the 6.65% Attack Damage (and the inert Shield/Double-Sword HP lines).",
   "⚑ FULL-CHARGE COUNTER ENCODING: 'attacking with Full Charge for N time(s)' modeled as `chargeCounter` with ONE effect per block — the two skill1 riders (Max HP, burst-CDR) are SPLIT into two single-effect blocks on purpose, because chargeCounter treats effects[P] as per-PHASE (a 2-effect block would fire them on alternating 8-charge cycles, not together). Verify the engine cycles a single-phase counter as 'every N charges'; if not, re-key to hitCount:{count:8} / {count:30} (an SR full-charges every shot, so hits ≈ full charges).",
   "⚑ RECOVERY EVENT ON THE SHIELD-COIN BURST TIER: three of the four Max-HP lines say 'without restoring HP'; the Shield-Coin burst tier (20.1%) does NOT, so it is modeled with a `heal` effect (ticks:1) to fire allies' `recovery` triggers (crown-style on-recovery consumers). This is a deliberate tandem read of a kit-text distinction, NOT a measured mechanic — it is the only place this override can add damage through a teammate.",
   "COIN STATE IS A PROXY: coinStage is not a kit-named currency; it exists solely so the burst tiers can be gated on Sword/Shield/Double-Sword status. On the 5th burst, slot ordering (skill2 blocks before burst blocks) may let the Double-Sword tier fire on the same cast that creates the status; in-game it more likely starts the FOLLOWING burst. Offensively inert either way.",
   "Shield Coin's 'Damage Taken ▼15.2%' on ALLIES is unmodeled: the schema's damageTakenPct is a BOSS debuff (positive = boss takes more), so there is no ally damage-reduction stat to hold it, and the v1 boss deals no damage. The status itself is still tracked (coinStage=2) so the downstream gates stay faithful.",
   "ALWAYS-⚑ items 5-7 are N/A here: the kit has no damage lines at all, so there is no noFb decision, no multi-projectile split/merge, no Hit-Rate→core magnitude, and no weapon-swap economy. noFb is not set anywhere; noRange is left to the engine.",
   "Top-level `resources` on an override file is assumed supported (soda-twinkling-bunny precedent). If validate-overrides rejects it, drop the resourceGates and apply all three burst Max-HP tiers ungated — damage-neutral, since every Max-HP grant here is offensively inert."
   ]
   }

==================== PART 7: DRIVER IMPLEMENTATION ====================
--- scripts/tests/units/rouge.test.ts (driver kit spec, 13 tests green) ---
// PER-UNIT KIT SPEC — `rouge` (Rouge), Supporter/SR/Electric, Burst I, cd 20s, ammo 6, chargeFrames
// 60. kit-autonomy gauntlet 2026-07-25 (driver). Tier 2: positional selfAndAdjacent buff + burstCast
// team ATK + coin-state status gates (absorbed — see UNMODELED).
//
// ⚠ EXACT SLUG `rouge` — the SR/Supporter/Electric/Burst-I coin support. There is no other "rouge"
// variant; never conflate with a similarly-named unit.
//
// Her kit is a COIN-STATE support: Sword Coin → Shield Coin (30 Full Charges) → Double Sword Coin
// (5 bursts in Shield Coin). The state machine is NOT tracked as engine state; its OFFENSIVE payload
// is exactly ONE permanent line (Sword Coin Attack Damage ▲6.65%) plus the burst's ATK grant. Every
// other line is a Max-HP grant or a Damage-Taken reduction.
//
// HP-SCALING DETERMINATION = OFFENSIVELY INERT. Every "Max HP ▲ X% of the skill user's Max HP" line
// is a `casterMaxHpPct` ally grant. Ally-granted Max HP does NOT feed a consumer's ATK=%-of-Max-HP
// conversion — the conversion counts the consumer's OWN Max HP only (MEASURED: cinderella focus
// video; SSOT docs/data/damage-calculation.md:106-107; engine enforces it via effectiveAtk
// casterIdx===self, src/engine/sim.ts:377). Rouge has no atkOfMaxHpPct line of her own, so even her
// self-grants feed nothing. The engine has no HP pool, so the grants move no damage at all. They are
// therefore documented VERBATIM in the override's `unmodeled` with NO assertion here (inert). The
// 2026-07-13 "Max-HP grants are OFFENSIVE for Cinderella" reading was REFUTED 2026-07-17 (e3 video).
//
// Kit (blablalink prose, data/characters.json → characters.rouge.skills, level 10):
// S1 ■ attacking with Full Charge ×8 → all allies: Cooldown of Burst Skill ▼7 sec [R3]
// ■ (same trigger) all allies: Max HP ▲5% of caster Max HP, no restore, 5 sec (INERT) [—]
// S2 ■ back row, self + 2 allies each side: Sword Coin Attack Damage ▲6.65% continuously [R1]
// ■ Full Charge ×30 in Sword Coin: Shield Coin Damage Taken ▼15.2% continuously (defensive)[—]
// ■ Burst ×5 in Shield Coin: Double Sword Coin Max HP ▲15.08% continuously (INERT) [—]
// BU ■ all allies: ATK ▲15.07% of caster ATK for 10 sec [R2]
// ■ Sword/Shield/Double Sword Coin: Max HP ▲10.15/20.1/30.02% of caster, 10s (INERT) [—]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
// R1 the Sword Coin Attack Damage buff is POSITIONAL ("self and 2 allies on both sides" =
// selfAndAdjacent sides:2), NOT all allies. With rouge in slot 0 of a 4-slot comp the buff
// reaches slots {0,1,2} and must NOT reach slot 3 — a generic all-allies encoding reaches all
// 4, so the held-target count is the discriminator. PIN value 6.65 (level-10), continuous.
// R2 casterAtkPct surfaces as a FLAT ATK grant (15.07% × caster staticAtk), NOT the raw 15.07 —
// discriminated by LINEAR SCALING: doubling the override magnitude (15.07→30.14) exactly
// doubles the applied value, proving 15.07 is operative. burstCast-triggered, all 4 allies,
// 10s window.
// R3 burstCdr emits no per-buff number to read directly, so it is pinned by its EFFECT on
// cadence: with the line removed, rouge (and the team) fit FEWER casts into 180s (the 20s CD
// is no longer shaved by 7s every 8 full charges).
//
// Fixture: rouge as the SOLE Burst I (rouge B1 / crown B2 / ada B3 / helm B3, boss Fire, focus ada)
// so the B1→B2→B3 chain runs and rouge casts. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const WINDOW = 10 * FPS; // 10 sec buff windows

/** Comp slot order: rouge 0 / crown 1 / ada 2 / helm 3. */
const COMP = ['rouge', 'crown', 'ada', 'helm'] as const;
const ROUGE = 0;
const CARRY = 'ada';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
const events: SimEvent[] = [];
const res = runComp({
slugs: [...COMP],
bossElement: 'Fire',
focusSlug: CARRY,
overrides,
cfg: { onEvent: (e) => events.push(e) },
});
return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong model each PIN must discriminate against) ----------
const hasStat = (b: any, stat: string) =>
b.effects.some((e: any) => e.stat === stat);

/** R1 reference: the Sword Coin Attack Damage block removed entirely. _/
const noSwordCoin = withPatchedOverride('rouge', (ov) => {
const before = ov.skill2.length;
ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'attackDamagePct'));
if (ov.skill2.length === before)
throw new Error('rouge S2 attackDamagePct block missing — fixture stale');
});
/_* R1 counterfactual: the same buff as a GENERIC all-allies buff (loses the positional scope). _/
const allAlliesSword = withPatchedOverride('rouge', (ov) => {
const b = ov.skill2.find((x: any) => hasStat(x, 'attackDamagePct'));
if (!b)
throw new Error('rouge S2 attackDamagePct block missing — fixture stale');
b.target = { kind: 'allies' };
});
/_* R2 reference: the burst caster-ATK block removed entirely. _/
const noBurstAtk = withPatchedOverride('rouge', (ov) => {
const before = ov.burst.length;
ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterAtkPct'));
if (ov.burst.length === before)
throw new Error('rouge burst casterAtkPct block missing — fixture stale');
});
/_* R2 counterfactual: double the burst caster-ATK magnitude (15.07 → 30.14). _/
const doubleBurstAtk = withPatchedOverride('rouge', (ov) => {
const e = ov.burst
.flatMap((b: any) => b.effects)
.find((x: any) => x.stat === 'casterAtkPct');
if (!e || e.value !== 15.07)
throw new Error('rouge burst casterAtkPct 15.07 missing — fixture stale');
e.value = 30.14;
});
/_* R3 reference: the S1 team burst-CDR block removed entirely. _/
const noCdr = withPatchedOverride('rouge', (ov) => {
const before = ov.skill1.length;
ov.skill1 = ov.skill1.filter(
(b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr'),
);
if (ov.skill1.length === before)
throw new Error('rouge S1 burstCdr block missing — fixture stale');
});
/_* INERT proof: strip EVERY inert stat (casterMaxHpPct grants + the Shield Coin Damage-Taken

- reduction) from all three slots. These are the ally-granted Max HP lines + the defensive
- Damage-Taken ▼ — all offensively inert (ally Max HP feeds no atkOfMaxHpPct; v1 boss deals no
- damage). Removing them must move NO unit's total by a single point. */
  const noInert = withPatchedOverride('rouge', (ov) => {
  const inert = new Set(['casterMaxHpPct', 'damageTakenPct']);
  let stripped = 0;
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
  for (const b of ov[slot] ?? []) {
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => !inert.has(e.stat));
  stripped += before - b.effects.length;
  }
  ov[slot] = (ov[slot] ?? []).filter((b: any) => b.effects.length > 0);
  }
  if (stripped === 0)
  throw new Error('rouge inert grants missing — fixture stale');
  });

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noSword = run({ rouge: noSwordCoin });
const allAllies = run({ rouge: allAlliesSword });
const noBurst = run({ rouge: noBurstAtk });
const dblBurst = run({ rouge: doubleBurstAtk });
const noCdrRun = run({ rouge: noCdr });
const inertRun = run({ rouge: noInert });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rougeBursts = (evs: SimEvent[]) =>
evs.filter(
(e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'rouge',
);
/** rouge-caster buffApply events for a given stat. */
const rougeBuff = (evs: SimEvent[], stat: string) =>
buffs(evs).filter((b) => b.casterIdx === ROUGE && b.stat === stat);

describe('rouge (Rouge) — kit spec [Tier 2, coin-state support]', () => {
it('fixture sanity: rouge casts her burst in the control rotation', () => {
expect(rougeBursts(base.events).length).toBeGreaterThan(0);
});

describe('R1 — S2 Sword Coin: Attack Damage ▲6.65%, POSITIONAL (self + 2 each side), continuous', () => {
const applied = rougeBuff(base.events, 'attackDamagePct');

    it('is exactly 6.65% with no wall-clock expiry (continuous)', () => {
      expect(
        applied.length,
        'no Sword Coin attackDamagePct applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([6.65]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'continuous',
      ).toEqual([null]);
    });

    it('reaches the POSITIONAL targets {0,1,2} and NOT the far slot 3', () => {
      const targets = new Set(applied.map((b) => b.targetIdx));
      // rouge in slot 0, selfAndAdjacent sides:2 → |idx-0|<=2 → {0,1,2}.
      expect(targets).toEqual(new Set([0, 1, 2]));
      expect(targets.has(3), 'slot 3 (helm) is out of positional range').toBe(
        false,
      );
    });

    it('DISCRIMINATING: a generic all-allies encoding would also reach slot 3', () => {
      const targets = new Set(
        rougeBuff(allAllies.events, 'attackDamagePct').map((b) => b.targetIdx),
      );
      expect(targets.size, 'all-allies reaches all 4').toBe(4);
      expect(targets.has(3)).toBe(true);
    });

    it('is LIVE: removing it drops the carried adjacent ally (ada, slot 2) damage', () => {
      expect(base.totals[CARRY]).toBeGreaterThan(noSword.totals[CARRY]);
    });

    it('DISCRIMINATING: the buff is absent when the block is removed', () => {
      expect(rougeBuff(noSword.events, 'attackDamagePct').length).toBe(0);
    });

});

describe('R2 — Burst: ATK ▲15.07% of caster ATK, all allies, 10s (burstCast)', () => {
const applied = rougeBuff(base.events, 'casterAtkPct');

    it('surfaces as a FLAT ATK grant from rouge, on all 4 allies, for 10 sec, once per cast', () => {
      expect(applied.length, 'no burst casterAtkPct applied').toBeGreaterThan(
        0,
      );
      expect(applied.length).toBe(rougeBursts(base.events).length * 4); // all 4 allies per cast
      expect(new Set(applied.map((b) => b.targetIdx)).size).toBe(4);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(WINDOW);
      const vals = [...new Set(applied.map((b) => b.value))];
      expect(vals.length).toBe(1);
      expect(vals[0]).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: the magnitude scales linearly with the kit value (15.07 is operative)', () => {
      const baseVal = applied[0].value;
      const dblVal = rougeBuff(dblBurst.events, 'casterAtkPct')[0]?.value;
      expect(
        dblVal,
        'doubled override produced no casterAtkPct buff',
      ).toBeDefined();
      expect(dblVal! / baseVal).toBeCloseTo(2, 5);
    });

    it('is LIVE: removing it drops the carried ally (ada) damage', () => {
      expect(base.totals[CARRY]).toBeGreaterThan(noBurst.totals[CARRY]);
    });

    it('DISCRIMINATING: the buff is absent when the block is removed', () => {
      expect(rougeBuff(noBurst.events, 'casterAtkPct').length).toBe(0);
    });

});

describe('R3 — S1: team Burst CDR ▼7s every 8 Full Charges (all allies)', () => {
// burstCdr shortens allies' burst cooldowns; it emits no per-buff number to read directly, so it
// is pinned by its EFFECT on cadence: with the line removed, rouge fits FEWER casts into 180s
// (her 20s CD is no longer shaved by 7s every 8 full charges).
it('removing the CDR strictly reduces her cast count over the fight', () => {
const baseBursts = rougeBursts(base.events).length;
const noCdrBursts = rougeBursts(noCdrRun.events).length;
expect(baseBursts).toBeGreaterThan(0);
expect(
noCdrBursts,
'CDR must let her cast more often than the raw 20s CD',
).toBeLessThan(baseBursts);
});
});

describe('INERT — Max-HP grants (casterMaxHpPct) + Shield Coin Damage-Taken ▼ move no damage', () => {
// S1 "Max HP ▲5% / 5s", S2 Double Sword "Max HP ▲15.08%", the burst coin-tier Max-HP grants
// (10.15/20.1/30.02%) and the Shield Coin "Damage Taken ▼15.2%" are encoded for kit-completeness
// (cross-family consensus) but are OFFENSIVELY INERT: ally-granted Max HP does NOT feed a
// consumer's atkOfMaxHpPct conversion (SSOT damage-calculation.md:106; engine casterIdx===self),
// the engine has no HP pool, and the v1 boss deals no damage. The proof is byte-identical totals
// with every inert stat stripped.
it('the inert grants ARE encoded (rouge emits maxHpFlat + a negative ally damageTakenPct)', () => {
const maxHp = buffs(base.events).filter(
(b) => b.casterIdx === ROUGE && b.stat === 'maxHpFlat',
);
expect(
maxHp.length,
'no casterMaxHpPct grant resolved to maxHpFlat',
).toBeGreaterThan(0);
expect(
new Set(maxHp.map((b) => b.targetIdx)).size,
'reaches allies',
).toBeGreaterThan(1);
const taken = buffs(base.events).filter(
(b) => b.casterIdx === ROUGE && b.stat === 'damageTakenPct',
);
expect(taken.length, 'no Shield Coin damageTakenPct').toBeGreaterThan(0);
for (const b of taken) expect(b.value).toBe(-15.2); // a reduction, never a positive boss amp
});

    it("PROOF: stripping every inert stat moves NO unit's total by a single point", () => {
      expect(inertRun.totals).toEqual(base.totals);
    });

});
});

--- src/skills/overrides/rouge.json (driver override) ---
{
"note": "Rouge — SR/Supporter/Electric/Burst I coin-state support (cd 20s). Kit-autonomy gauntlet 2026-07-25 (GO cross-family; fable S2b + opus S5/S6/S7 converged). HP-SCALING DETERMINATION = OFFENSIVELY INERT: every 'Max HP ▲ X% of the skill user's Max HP' line is a casterMaxHpPct ALLY grant. Ally-granted Max HP does NOT feed a consumer's ATK=%-of-Max-HP conversion — the conversion counts the consumer's OWN Max HP only (MEASURED cinderella e3 focus video; SSOT docs/data/damage-calculation.md:106-107; engine enforces via effectiveAtk casterIdx===self, src/engine/sim.ts:377). Rouge has no atkOfMaxHpPct line of her own, so even her self-grants feed nothing, and the engine has no HP pool — so the grants move no damage. They are MODELED as casterMaxHpPct effects for kit-completeness (cross-family consensus: fable S2b + opus S5 both encode them) and the unit test ASSERTS their inertness (deleting every one moves zero damage). The 2026-07-13 'Max-HP grants are OFFENSIVE for Cinderella' reading was REFUTED 2026-07-17 (e3 video: FB proc popups fit own-HP-only within 2%, would be ~28% higher if rouge's grants fed); the prior casterMaxHpPct timeline-average values (2.3/7.5/22/22.5/8.7) were artifacts of that refuted hypothesis and are replaced by the EXACT kit magnitudes. OFFENSIVE (3 load-bearing lines): (S1) burstCdr 7s to all allies every 8 Full Charges (hitCount 8; SR = 1 hit/charged pull) — the kit's biggest damage lever, accelerates the whole team rotation; (S2) Sword Coin Attack Damage ▲6.65% as a permanent passive selfAndAdjacent sides:2 ('self and 2 allies on both sides'; positional — an edge-slotted rouge reaches only 3 of 5); (Burst) ATK ▲15.07% of caster ATK to all allies for 10s on burstCast (casterAtkPct, flat-resolved). COIN-STATE MACHINE (Sword → Shield @30FC → Double Sword @5 own bursts in Shield) is NOT tracked as engine state; the coin-gated Max-HP grants + the Shield Coin Damage-Taken reduction are encoded on their nearest trigger (hitCount / burstCast / burstCast everyN:5) with the coin gate ⚑-documented — all are inert so the gate approximation moves no damage. ⚑ FLAGS (UNMEASURED): (1) COIN EXCLUSIVITY [measurement-gated, tier 2] — the prose is silent on whether upgrading Sword→Shield→Double Sword REPLACES the prior coin or COEXISTS. If Shield Coin REPLACES Sword Coin at ~30 Full Charges (~40-50s in), the team LOSES the 6.65% Attack Damage mid-fight (partial uptime ≈ first quarter); the shipped model is the 'continuously' = permanent-passive reading (full uptime). Estimate = permanent (full uptime); recipe = focus video, does the 6.65% Attack Damage buff persist on rouge's adjacent allies after Shield Coin activates? (2) SHIELD-COIN BURST RIDER HEAL ASYMMETRY [coin-state-gated + measurement-gated, tier 2] — four of five Max-HP lines say 'without restoring HP'; the Shield-Coin burst rider (Max HP ▲20.1%) ALONE omits that clause, so read literally it RESTORES HP and would emit a heal event arming on-recovery consumers (e.g. crown's 'when recovery takes effect' team ATK buff). It is gated on Shield Coin status (after ~30FC) which the engine cannot track, and the marginal impact is small (crown's recovery consumer is typically already saturated by her own heals); not modeled as a heal. Estimate = inert/no-heal; recipe = focus video with a recovery consumer, does rouge's burst proc crown's recovery buff once Shield Coin is up? (3) COIN-TIER GATING — the three per-tier burst Max-HP riders (10.15 Sword / 20.1 Shield / 30.02 Double Sword) are coin-state-gated and the engine tracks no coin state, so they are documented in unmodeled.burst rather than fired every cast (which would over-credit the cadence); the cleanly-triggerable inert grants that ARE encoded — S2 Double Sword 15.08 (burstCast everyN:5) and Shield Coin Damage-Taken ▼15.2% (hitCount 30) — carry an approximated coin gate (⚑); all are inert, so the gate approximation moves no damage. (4) back-row condition on S2 has no engine primitive — modeled as passive (rouge is an SR, always back row); documented assumption. All magnitudes are kit-literal (DATAMINED level-10); no calibrated values.",
"unmodeled": {
"skill1": [],
"skill2": [
"Coin-state progression itself (Sword Coin → Shield Coin at 30 Full Charges → Double Sword Coin at 5 own bursts in Shield Coin) is not tracked as engine state; the coin-gated lines are encoded on their nearest trigger with the gate approximated (all inert — see note flag 3)"
],
"burst": [
"Activates when in Sword Coin status. Affects all allies. Max HP ▲ 10.15% of the skill user's Max HP without restoring HP, lasts for 10 sec (casterMaxHpPct ALLY grant; offensively inert AND coin-state-gated — the engine tracks no coin state, so the per-tier burst rider cannot be gated precisely; documented rather than fired every cast, which would over-credit the cadence)",
"Activates when in Shield Coin status. Affects all allies. Max HP ▲ 20.1% of the skill user's Max HP for 10 sec (casterMaxHpPct ALLY grant, offensively inert, coin-state-gated; HEAL ASYMMETRY ⚑ — this rider ALONE omits 'without restoring HP', so literally it also restores HP and could arm on-recovery consumers, but it is Shield-Coin-gated which the engine cannot track and the marginal recovery-consumer impact is small — see note flag 2)",
"Activates when in Double Sword Coin status. Affects all allies. Max HP ▲ 30.02% of the skill user's Max HP without restoring HP, lasts for 10 sec (casterMaxHpPct ALLY grant; offensively inert, coin-state-gated)"
]
},
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 8
},
"target": {
"kind": "allies"
},
"effects": [
{
"kind": "burstCdr",
"seconds": 7
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 8
},
"target": {
"kind": "allies"
},
"effects": [
{
"kind": "buff",
"stat": "casterMaxHpPct",
"value": 5,
"durationSec": 5
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
"kind": "selfAndAdjacent",
"sides": 2
},
"effects": [
{
"kind": "buff",
"stat": "attackDamagePct",
"value": 6.65
}
]
},
{
"slot": "skill2",
"trigger": {
"kind": "hitCount",
"count": 30
},
"target": {
"kind": "selfAndAdjacent",
"sides": 2
},
"effects": [
{
"kind": "buff",
"stat": "damageTakenPct",
"value": -15.2
}
]
},
{
"slot": "skill2",
"trigger": {
"kind": "burstCast"
},
"everyN": 5,
"target": {
"kind": "allies"
},
"effects": [
{
"kind": "buff",
"stat": "casterMaxHpPct",
"value": 15.08
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
"kind": "buff",
"stat": "casterAtkPct",
"value": 15.07,
"durationSec": 10
}
]
}
]
}
