# S7 RECONCILING-JUDGE PACKET — ludmilla-winter-owner (Ludmilla: Winter Owner)

You are the BINDING reconciling judge for ONE unit's kit-autonomy gauntlet. Read the contract below, then the materials, then return the verdict JSON the contract specifies. This is a MG/Water/Attacker/Burst III VARIANT of base Ludmilla (base is SMG/Water) — never conflate them.

===== (1) CONTRACT + RETURN JSON SHAPE =====

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

===== (2) MECHANICS SSOT — docs/data/damage-calculation.md =====

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

===== (2b) MECHANICS SSOT — docs/data/game-mechanics.md =====

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

===== (3) GROUND TRUTH — kit prose + base stats (data/characters.json → characters['ludmilla-winter-owner']) =====
{
"slug": "ludmilla-winter-owner",
"name": "Ludmilla: Winter Owner",
"weapon": "MG",
"burst": "III",
"class": "Attacker",
"element": "Water",
"burstCooldownSec": 40,
"normalAttackMultiplier": 5.86,
"coreAttackMultiplier": 200,
"ammo": 300,
"reloadFrames": 201,
"hitsPerShot": 1,
"burstGaugePerShot": 0.05,
"skills": {
"skill1": "■ Activates when landing 60 normal attack(s). Affects the target.\nDamage Taken ▲ 12.56% for 3 sec.\nDeals 158.43% of final ATK as additional damage.\n■ Activates when landing 60 normal attack(s). Affects self.\nReloads 20 round(s) of ammunition.",
"skill2": "■ Activates when hitting the Core for 60 time(s). Affects the target.\nDeals 109.64% of final ATK as additional damage. \n■ Activates at the beginning of Full Burst. Affects self.\nCritical Rate ▲ 14.6% for 10 sec.",
"burst": "■ Affects self. \nATK ▲ 62.54% for 10 sec.\nReload Speed ▲ 67.2% for 20 sec."
},
"baseStats": {
"hp": 13500,
"atk": 600,
"def": 75,
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
"resourceId": 194
}
}

===== (4) S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5) =====
{
"slug": "ludmilla-winter-owner",
"stage": "S2c-reconciliation",
"date": "2026-07-26",
"reviewerModel": "claude-fable-5",
"driverModel": "qwen",
"leakDetected": null,
"reconciliation": {
"converged": true,
"summary": "Blind claude-fable-5 re-derivation converges with the driver on EVERY kit line — dispositions, triggers, target sets, durations, and the nearest-wrong counterfactuals all match. No REAL-GOTCHA. The reviewer independently named the same traps the driver's test pins: (1) skill2's counter must count CORE hits (hitCount 63 = 60/0.95 proxy + requiresCore), the single biggest swing — driver pins floor(shots/63)=137 vs naive floor(shots/60)=144 AND coreHitRate:0 -> 0 riders; (2) the +20-round refill is damage (weapon-state), not droppable defensive — driver pins fewer reloads + strictly more shots vs the effect removed; (3) Damage Taken is a BOSS-held debuff (casterIdx null / targetIdx null) that benefits the team, not a self buff — driver pins targetIdx null + mult.taken reaching 1.1256; (4) trigger-identity split: skill2 crit is fullBurstEnter (fires on helm-led FBs, count==fbStarts 11 != her 6 casts) while BOTH burst buffs are burstCast (count==her 6 casts) — driver pins both directions in the 2xB3 control comp; (5) the two burst buffs carry different durations (ATK 10s / Reload Speed 20s) — driver pins both expiresFrames. Reviewer additionally flagged the rider core:true nearest-wrong; driver added inertness pins (coreEligible false, coreRate 0, rangeApplied false) on both riders and re-ran GREEN.",
"lineByLine": [
{
"line": "S1 — every 60 normal hits -> boss Damage Taken +12.56% / 3s",
"driver": "FAITHFUL (hitCount 60, target enemy, damageTakenPct 12.56/3s; boss debuff casterIdx/targetIdx null; mult.taken reaches 1.1256)",
"reviewer": "FAITHFUL, load-bearing (boss DEBUFF benefits all five units; hitCount:60; expiresFrame-apply===180; must lapse across her reloads)",
"agree": true
},
{
"line": "S1 — every 60 normal hits -> 158.43% final ATK additional damage",
"driver": "FAITHFUL (flatDamage 158.43, skill bucket, crit-eligible, NOT core, no range; cadence floor(shots/60)=144)",
"reviewer": "FAITHFUL, load-bearing (flatDamage % of her final ATK, crits at caster rate, NO core, no range, FB by timing; nearest-wrong core:true)",
"agree": true
},
{
"line": "S1 — every 60 normal hits -> self Reloads 20 rounds",
"driver": "FAITHFUL (instantReload fraction 0.0667 = 20/300, self; fewer reload-to-max + strictly more shots vs removed)",
"reviewer": "FAITHFUL, load-bearing (instantReload fraction 20/300, NOT maxAmmoFlat / NOT fraction:1; stretches 300-belt to ~450 shots; reload events stay >0)",
"agree": true
},
{
"line": "S2 — every 60 CORE hits -> 109.64% final ATK additional damage",
"driver": "FAITHFUL-with-flag (hitCount 63 = round(60/0.95 MG core rate) + requiresCore; cadence floor(shots/63)=137; naive-60 -> 144; coreHitRate:0 -> 0)",
"reviewer": "FAITHFUL, load-bearing (hitCount + requiresCore:true; proc count === floor(coreHits/60) < floor(totalHits/60); exactly 0 at zero core exposure; THE key trap)",
"agree": true,
"note": "Both agree the encoding is faithful to the kit's 'core hits' intent via the engine's flat MG core rate; the 63-vs-63 core-rate proxy and the requiresCore gate are both pinned. The 0.95 MG core rate itself is an engine-owned unmeasured estimate (flagged in override note), so the pin is cadence-relative, not a hardcoded proc count."
},
{
"line": "S2 — beginning of Full Burst -> self Crit Rate +14.6% / 10s",
"driver": "FAITHFUL (fullBurstEnter, self, critRatePct 14.6/10s; count==fbStarts 11 != her 6 casts; lifts normal crit 0.15->0.296)",
"reviewer": "FAITHFUL, load-bearing (GENERIC critRatePct, fullBurstEnter = ANY team FB incl. helm-led; nearest-wrong burstCast under-credits helm-led FBs; expires ~600f)",
"agree": true
},
{
"line": "Burst — self ATK +62.54% / 10s",
"driver": "FAITHFUL (burstCast, self, atkPct 62.54/10s; count==her 6 casts)",
"reviewer": "FAITHFUL, load-bearing (atkPct self, burstCast NOT fullBurstEnter; count===her burstCast count; never on allies; absent on helm-led rotations)",
"agree": true
},
{
"line": "Burst — self Reload Speed +67.2% / 20s",
"driver": "FAITHFUL (burstCast, self, reloadSpeedPct 67.2/20s; distinct 20s vs ATK 10s; load-bearing: removing it costs ~1900 shots)",
"reviewer": "FAITHFUL, load-bearing (reloadSpeedPct self, 20s = DOUBLE the ATK window; nearest-wrong duration collapsed to 10s; shortened reload in t in (cast+10s, cast+20s))",
"agree": true
}
],
"verdict": "GO",
"verdictBasis": "All 7 kit lines accounted for (all FAITHFUL, one with a documented engine-core-rate proxy flag), dispositions converge cross-family, no REAL-GOTCHA, leak check clean, discrimination strong (driver test GREEN vs shipped and RED vs the exact counterfactuals the reviewer independently named). Inert UNMODELED set is empty (every line maps to an existing primitive)."
}
}

===== (5) S5 BLIND TEST (claude-opus-5, written from kit prose alone) + ITS RESULT VS THE DRIVER OVERRIDE =====

RUN RESULT vs the driver's shipped override: 23 passed / 5 failed / 1 skipped (29 total).
DRIVER CLASSIFICATION OF THE 5 FAILURES (judge: confirm or overturn each):
F1 'S1a emits a boss-held debuff' -> durationShots expected undefined, got null. CONVENTION (engine emits durationShots:null for timed buffs; blind test expected JS-undefined). NOT a faithfulness issue.
F2 'S1a rider is self-sourced only' -> teammatesIdentical(noS1Rider) expected true, got false. OVER-STRICT: removing the rider drops LWO total -18.6% (it IS her damage), helm stays BYTE-identical, FB count (11) and her casts (6) unchanged; only liter/crown shift 0.03%/0.002% via frame-level timing coupling. The rider is correctly self-sourced; byte-identical-teammates is too strong for a frame-coupled sim.
F3 'S1b refill raises her damage' -> noReload.self (846006321) expected < base.self (845997158) but was +0.001% HIGHER. OVER-STRICT DIRECTION: the refill's robust observable is fewer reload-to-max (18 vs 26) and strictly more shots (8652 vs 8639); net total-damage sign is rotation-alignment noise at 0.001%. The line is live and faithful (instantReload fraction 0.0667).
F4 'S2a rider is self-sourced only' -> same as F2 (teammatesIdentical over-strict). NOT a faithfulness issue.
F5 'Burst ATK durationShots' -> expected undefined, got null. CONVENTION (same as F1). NOT a faithfulness issue.
DRIVER CONCLUSION: 0 REAL-GOTCHA. All 5 are blind-test over-strictness / null-vs-undefined convention. The 23 passing assertions independently corroborate every kit line's trigger/target/magnitude/duration.

--- S5 blind test source ---
/**

- ludmilla-winter-owner - BLIND kit-spec test (kit-autonomy S5 post-op).
-
- Written from the kit prose ALONE (MG/Water/Attacker/Burst III, ammo 300,
- reloadFrames 201, hitsPerShot 1, normalAttackMultiplier 5.86). No sight of the
- driver's override, tests, or reasoning.
-
- KIT, reduced to its structural minimum:
- S1a every 60 normal-attack hits -> enemy: Damage Taken +12.56% for 3s, +158.43% ATK hit
- S1b every 60 normal-attack hits -> self: reload 20 rounds
- S2a every 60 CORE hits -> enemy: +109.64% ATK hit
- S2b at the beginning of Full Burst -> self: Critical Rate +14.6% for 10s
- B own burst cast -> self: ATK +62.54% for 10s, Reload Speed +67.2% for 20s
-
- FIXTURE: controlComp(SLUG, true) - liter B1 / crown B2 / ludmilla B3 / helm B3.
- B1+B2 are mandatory: a lone Burst III unit makes ZERO full bursts, so every
- burst-keyed line would be vacuous. helm is KEPT as the second B3 on purpose -
- ludmilla therefore does not necessarily cast on every rotation, which is what
- lets 'fires on every Full Burst' (S2b) discriminate fullBurstEnter from
- burstCast. helm's own crit line uses the critRateNormalPct key, a different
- stat, so it cannot collide with the value-filtered assertions below.
-
- DISCRIMINATION STRATEGY (two independent layers per line):
- 1.  STRUCTURAL - trigger identity, target set, threshold, stat key and duration
-      semantics are asserted against a CLONE of the shipped override, captured
-      through withPatchedOverride's mutate callback (no fs access needed). A wrong
-      trigger kind, a scoped-vs-generic crit key, or a round-count duration fails here.
- 2.  COUNTERFACTUAL - every line also gets a run with that one effect removed or its
-      magnitude changed. The faithful model must be observably different from the
-      nearest-wrong one, so no assertion can be satisfied by an inert block.
- INERTNESS - self-scoped lines (crit, ATK, both flat riders) must leave every
-      teammate byte-identical; the enemy-scoped Damage Taken debuff must NOT (it is a
-      boss debuff the whole team eats - failure-mode taxonomy #4). Reload-economy
-      lines are deliberately NOT asserted inert: they change shot count, hence burst
-      gauge, hence the team's whole rotation.

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

const SLUG = 'ludmilla-winter-owner';

type Ev = SimEvent & Record<string, any>;
type Ov = Record<string, any>;

const SLOTS: Array<'skill1' | 'skill2' | 'burst'> = ['skill1', 'skill2', 'burst'];

// The override FILE is slot-keyed; a slot is either a Block[] or a CharacterSkills
// carrying its own blocks[]. Both shapes are handled so a shape guess cannot void
// the whole test file.
const blocksOf = (ov: Ov, slot: string): any[] => {
const s: any = ov?.[slot];
if (!s) return [];
return Array.isArray(s) ? s : Array.isArray(s.blocks) ? s.blocks : [];
};
const allBlocks = (ov: Ov): any[] => SLOTS.flatMap((s) => blocksOf(ov, s));
const eff = (b: any): any[] => (Array.isArray(b?.effects) ? b.effects : []);

const near = (a: any, b: number) => typeof a === 'number' && Math.abs(a - b) < 1e-6;
const isBuff = (e: any, stat: string, value?: number) =>
e?.kind === 'buff' && e.stat === stat && (value === undefined || near(e.value, value));
const isFlat = (e: any, atkPct: number) => e?.kind === 'flatDamage' && near(e.atkPct, atkPct);
const isInstantReload = (e: any) => e?.kind === 'instantReload';

const blockWith = (ov: Ov, pred: (e: any) => boolean) =>
allBlocks(ov).find((b) => eff(b).some(pred));
const effectWith = (ov: Ov, pred: (e: any) => boolean) =>
allBlocks(ov).flatMap(eff).find(pred);
const slotWith = (ov: Ov, pred: (e: any) => boolean) =>
SLOTS.find((s) => blocksOf(ov, s).some((b) => eff(b).some(pred)));

// ---------------------------------------------------------------------------
// shipped override snapshot (structural layer)
// ---------------------------------------------------------------------------
let shipped: Ov = {};
withPatchedOverride(SLUG, (ov: any) => {
shipped = JSON.parse(JSON.stringify(ov));
});

// ---------------------------------------------------------------------------
// counterfactual patches - each records how many effects/blocks it actually bit,
// so a MISSING line fails loudly instead of producing a silently-identical run.
// ---------------------------------------------------------------------------
const dropWhere = (ov: Ov, pred: (e: any) => boolean) => {
let n = 0;
for (const b of allBlocks(ov)) {
const before = eff(b).length;
b.effects = eff(b).filter((e: any) => !pred(e));
n += before - b.effects.length;
}
return n;
};

let nDropDt = 0;
const pNoDamageTaken = withPatchedOverride(SLUG, (ov: any) => {
nDropDt = dropWhere(ov, (e) => isBuff(e, 'damageTakenPct', 12.56));
});

let nLongDt = 0;
const pLongDamageTaken = withPatchedOverride(SLUG, (ov: any) => {
for (const b of allBlocks(ov))
for (const e of eff(b))
if (isBuff(e, 'damageTakenPct', 12.56)) {
e.durationSec = 30;
nLongDt++;
}
});

let nThresh = 0;
const pDoubleThreshold = withPatchedOverride(SLUG, (ov: any) => {
for (const b of allBlocks(ov)) {
if (!eff(b).some((e: any) => isBuff(e, 'damageTakenPct', 12.56))) continue;
if (b.trigger?.kind === 'hitCount' && typeof b.trigger.count === 'number') {
b.trigger.count *= 2;
nThresh++;
}
}
});

let nNoS1Rider = 0;
const pNoS1Rider = withPatchedOverride(SLUG, (ov: any) => {
nNoS1Rider = dropWhere(ov, (e) => isFlat(e, 158.43));
});

let nNoS2Rider = 0;
const pNoS2Rider = withPatchedOverride(SLUG, (ov: any) => {
nNoS2Rider = dropWhere(ov, (e) => isFlat(e, 109.64));
});

let nNoReload = 0;
const pNoInstantReload = withPatchedOverride(SLUG, (ov: any) => {
nNoReload = dropWhere(ov, isInstantReload);
});

let nFullReload = 0;
const pFullReload = withPatchedOverride(SLUG, (ov: any) => {
for (const b of allBlocks(ov))
for (const e of eff(b))
if (isInstantReload(e)) {
e.fraction = 1;
nFullReload++;
}
});

let nNoCrit = 0;
const pNoCrit = withPatchedOverride(SLUG, (ov: any) => {
nNoCrit = dropWhere(ov, (e) => isBuff(e, 'critRatePct', 14.6));
});

let nCritAllies = 0;
const pCritAllies = withPatchedOverride(SLUG, (ov: any) => {
for (const b of allBlocks(ov))
if (eff(b).some((e: any) => isBuff(e, 'critRatePct', 14.6))) {
b.target = { kind: 'allies' };
nCritAllies++;
}
});

let nNoBurstAtk = 0;
const pNoBurstAtk = withPatchedOverride(SLUG, (ov: any) => {
nNoBurstAtk = dropWhere(ov, (e) => isBuff(e, 'atkPct', 62.54));
});

let nNoBurstReload = 0;
const pNoBurstReload = withPatchedOverride(SLUG, (ov: any) => {
nNoBurstReload = dropWhere(ov, (e) => isBuff(e, 'reloadSpeedPct', 67.2));
});

// ---------------------------------------------------------------------------
// runs (hoisted - each is a full 180s sim)
// ---------------------------------------------------------------------------
const collect = (patched?: any) => {
const events: Ev[] = [];
const opts: any = controlComp(SLUG, true);
opts.cfg = {
...(opts.cfg ?? {}),
onEvent: (ev: SimEvent) => {
events.push(ev as Ev);
},
};
if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
const res = runComp(opts);
const all = totals(res);
return { res, events, all, self: all[SLUG] };
};

const base = collect();
const rNoDt = collect(pNoDamageTaken);
const rLongDt = collect(pLongDamageTaken);
const rThresh = collect(pDoubleThreshold);
const rNoS1Rider = collect(pNoS1Rider);
const rNoS2Rider = collect(pNoS2Rider);
const rNoReload = collect(pNoInstantReload);
const rFullReload = collect(pFullReload);
const rNoCrit = collect(pNoCrit);
const rCritAllies = collect(pCritAllies);
const rNoBurstAtk = collect(pNoBurstAtk);
const rNoBurstReload = collect(pNoBurstReload);

const others = Object.keys(base.all).filter((s) => s !== SLUG);
const teammatesIdentical = (r: { all: Record<string, number> }) =>
others.every((s) => r.all[s] === base.all[s]);
const someTeammateMoved = (r: { all: Record<string, number> }) =>
others.some((s) => r.all[s] !== base.all[s]);

const buffApplies = (evs: Ev[], stat: string, value?: number, target?: string) =>
evs.filter(
(e) =>
e.kind === 'buffApply' &&
e.stat === stat &&
(value === undefined || near(e.value, value)) &&
(target === undefined || e.targetSlug === target),
);

const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;
// Her own burst casts, counted via the self ATK buff her burst block applies -
// a well-specified buffApply, unlike guessing the burstCast event's slug field.
const herBursts = buffApplies(base.events, 'atkPct', 62.54, SLUG).length;

describe('ludmilla-winter-owner - fixture sanity (non-vacuity)', () => {
it('wires cfg.onEvent and produces damage', () => {
expect(base.events.length).toBeGreaterThan(0);
expect(base.self).toBeGreaterThan(0);
expect(unitOf(base.res, SLUG).totalDamage).toBeCloseTo(base.self, 6);
});

it('the override declares all three skill slots', () => {
for (const s of SLOTS) expect(blocksOf(shipped, s).length).toBeGreaterThan(0);
});

it('the comp actually full-bursts and she actually casts', () => {
// Both burst-keyed lines below would be vacuous without these.
expect(fbStarts).toBeGreaterThanOrEqual(2);
expect(herBursts).toBeGreaterThanOrEqual(1);
// helm shares the B3 slot, so herBursts <= fbStarts; whenever it is strictly
// less, the S2b equality assertion genuinely separates fullBurstEnter from burstCast.
expect(herBursts).toBeLessThanOrEqual(fbStarts);
});
});

describe('S1a - every 60 normal hits: Damage Taken +12.56% for 3s (enemy)', () => {
const b = blockWith(shipped, (e) => isBuff(e, 'damageTakenPct', 12.56));

it('is a hitCount:60 trigger aimed at the enemy', () => {
// Nearest-wrong: shotFired (counts pulls, not landed hits), interval, or a
// self/allies target (Damage Taken is a BOSS debuff, never a self buff).
expect(b).toBeDefined();
expect(b.trigger?.kind).toBe('hitCount');
expect(b.trigger?.count).toBe(60);
expect(b.target?.kind).toBe('enemy');
});

it('lasts 3 wall-clock seconds, not N rounds', () => {
// Failure-mode taxonomy #2: 'for 3 sec' is seconds; durationShots would be wrong.
const e = eff(b).find((x: any) => isBuff(x, 'damageTakenPct', 12.56));
expect(e.durationSec).toBe(3);
expect(e.durationShots).toBeUndefined();
});

it('emits a boss-held debuff many times over the fight', () => {
const applies = buffApplies(base.events, 'damageTakenPct', 12.56);
// Boss-held debuffs carry casterIdx === null AND targetIdx === null.
expect(applies.length).toBeGreaterThanOrEqual(5);
for (const a of applies) {
expect(a.casterIdx).toBeNull();
expect(a.targetIdx).toBeNull();
expect(a.durationShots).toBeUndefined();
}
});

it('is a TEAM-WIDE debuff: removing it moves teammates too', () => {
// Discriminates the faithful enemy-scoped debuff from a self-only ATK-ish buff:
// under the wrong model her teammates would be byte-identical.
expect(nDropDt).toBeGreaterThan(0);
expect(rNoDt.self).toBeLessThan(base.self);
expect(someTeammateMoved(rNoDt)).toBe(true);
});

it('the 3s window is load-bearing (stretching it raises team damage)', () => {
// Non-vacuity for the duration: a 3s window covers only a slice of the fight,
// so 3 -> 30 must be observably better. Under a 'permanent debuff' model the
// two runs would be identical.
expect(nLongDt).toBeGreaterThan(0);
expect(rLongDt.self).toBeGreaterThan(base.self);
expect(someTeammateMoved(rLongDt)).toBe(true);
});

it('the 60-hit threshold actually drives the proc rate', () => {
// Doubling the threshold must roughly halve the procs. Slightly worse than half
// because the S1b reload procs halve too (fewer rounds -> fewer hits), hence the
// generous lower band rather than an exact ratio.
expect(nThresh).toBeGreaterThan(0);
const baseProcs = buffApplies(base.events, 'damageTakenPct', 12.56).length;
const halfProcs = buffApplies(rThresh.events, 'damageTakenPct', 12.56).length;
expect(halfProcs).toBeGreaterThanOrEqual(1);
expect(halfProcs).toBeLessThan(baseProcs);
expect(halfProcs * 2).toBeGreaterThan(baseProcs * 0.7);
});
});

describe('S1a - the +158.43% of final ATK rider', () => {
const b = blockWith(shipped, (e) => isFlat(e, 158.43));

it('rides the same 60-normal-hit / enemy activation', () => {
expect(b).toBeDefined();
expect(slotWith(shipped, (e) => isFlat(e, 158.43))).toBe('skill1');
expect(b.trigger?.kind).toBe('hitCount');
expect(b.trigger?.count).toBe(60);
expect(b.target?.kind).toBe('enemy');
expect(b.requiresCore).toBeFalsy(); // this half of S1 is NOT core-gated
});

it('is real damage and is self-sourced only', () => {
// Discriminates a live rider from a declared-but-inert one, and proves it feeds
// no shot/gauge channel (teammates must be byte-identical).
expect(nNoS1Rider).toBeGreaterThan(0);
expect(rNoS1Rider.self).toBeLessThan(base.self);
expect(teammatesIdentical(rNoS1Rider)).toBe(true);
});
});

describe('S1b - every 60 normal hits: reload 20 rounds (self)', () => {
const b = blockWith(shipped, isInstantReload);
const e = effectWith(shipped, isInstantReload);

it('is a self-targeted hitCount:60 partial refill, not a full reload', () => {
// 20 of a 300-round belt = fraction ~0.0667. A missing fraction means a FULL
// magazine refill - the nearest-wrong model, and a large over-credit on an MG.
expect(b).toBeDefined();
expect(b.trigger?.kind).toBe('hitCount');
expect(b.trigger?.count).toBe(60);
expect(b.target?.kind).toBe('self');
expect(typeof e.fraction).toBe('number');
expect(e.fraction).toBeGreaterThan(0.04);
expect(e.fraction).toBeLessThan(0.11);
});

it('the refill measurably raises her damage (reload economy IS damage)', () => {
// Taxonomy #6: weapon-state / ammo lines gate shot count. Removing the refill
// must cost damage; the runs would be identical if the line were skipped.
expect(nNoReload).toBeGreaterThan(0);
expect(rNoReload.self).toBeLessThan(base.self);
});

it('20 rounds is strictly weaker than a full belt refill', () => {
// Discriminates the magnitude: under fraction:1 she would gain much more uptime.
expect(nFullReload).toBeGreaterThan(0);
expect(rFullReload.self).toBeGreaterThan(base.self);
});

// No teammate-inertness assertion here on purpose: changing her shot count changes
// burst-gauge generation, which legitimately shifts the whole team's rotation.
});

describe('S2a - every 60 CORE hits: +109.64% of final ATK (enemy)', () => {
const b = blockWith(shipped, (e) => isFlat(e, 109.64));

it('exists in skill2 and targets the enemy', () => {
expect(b).toBeDefined();
expect(slotWith(shipped, (e) => isFlat(e, 109.64))).toBe('skill2');
expect(b.target?.kind).toBe('enemy');
});

it('is core-conditioned, not a plain 60-normal-hit clone of S1a', () => {
// Core hits are a strict SUBSET of normal hits, so a faithful model must either
// gate on core (requiresCore) or raise the threshold above 60 to account for the
// core rate. The nearest-wrong model - hitCount:60 with no core conditioning at
// all - makes S2a fire exactly as often as S1a and over-credits it.
const coreGated = b.requiresCore === true;
const rarer = b.trigger?.kind === 'hitCount' && (b.trigger?.count ?? 0) > 60;
expect(coreGated || rarer).toBe(true);
});

it('cannot fire more often than the un-gated 60-normal-hit line', () => {
// Cheap corollary of the subset relation, checked on the shipped structure.
const s1 = blockWith(shipped, (e) => isBuff(e, 'damageTakenPct', 12.56));
if (b.trigger?.kind === 'hitCount' && s1?.trigger?.kind === 'hitCount') {
expect(b.trigger.count).toBeGreaterThanOrEqual(s1.trigger.count);
}
});

it('is real damage and is self-sourced only', () => {
expect(nNoS2Rider).toBeGreaterThan(0);
expect(rNoS2Rider.self).toBeLessThan(base.self);
expect(teammatesIdentical(rNoS2Rider)).toBe(true);
});

it.skip('fires once per 60 CORE hits at the measured core rate', () => {
// GAP: the engine has no core-hit counter - hitCount counts landed rounds, and
// requiresCore is only an exposure gate. The faithful threshold is 60/coreRate,
// whose magnitude is Hit-Rate->core derived and MEASUREMENT-GATED (always-flag
// field #7). Unassertable blind; recorded rather than guessed.
});
});

describe('S2b - Full Burst start: Critical Rate +14.6% for 10s (self)', () => {
const b = blockWith(shipped, (e) => isBuff(e, 'critRatePct', 14.6));

it('is fullBurstEnter + self, with no own-burst gate', () => {
// Trigger identity (taxonomy #3): the text says 'at the beginning of Full Burst',
// i.e. ANY team Full Burst - not burstCast (own-cast only, and pre-FB), and not
// ownBurstGate:'cast', which would silently drop the rotations helm completes.
expect(b).toBeDefined();
expect(b.trigger?.kind).toBe('fullBurstEnter');
expect(b.target?.kind).toBe('self');
expect(b.ownBurstGate).toBeUndefined();
});

it('is GENERIC crit rate for 10 seconds, not normal-attack-scoped', () => {
// The kit line is a bare 'Critical Rate' - critRateNormalPct would under-credit
// her burst and both flat riders.
const e = eff(b).find((x: any) => isBuff(x, 'critRatePct', 14.6));
expect(e.durationSec).toBe(10);
expect(e.durationShots).toBeUndefined();
expect(buffApplies(base.events, 'critRateNormalPct', 14.6).length).toBe(0);
});

it('applies on EVERY Full Burst, only ever to herself', () => {
const applies = buffApplies(base.events, 'critRatePct', 14.6);
expect(applies.length).toBe(fbStarts);
for (const a of applies) expect(a.targetSlug).toBe(SLUG);
});

it('is load-bearing damage and inert on teammates', () => {
expect(nNoCrit).toBeGreaterThan(0);
expect(rNoCrit.self).toBeLessThan(base.self);
expect(teammatesIdentical(rNoCrit)).toBe(true);
});

it('the self scope is load-bearing (an allies-scoped model moves the team)', () => {
// Non-vacuity for 'Affects self': under the nearest-wrong allies target the
// teammates gain crit rate and their totals move.
expect(nCritAllies).toBeGreaterThan(0);
expect(someTeammateMoved(rCritAllies)).toBe(true);
});
});

describe('Burst - self: ATK +62.54% for 10s, Reload Speed +67.2% for 20s', () => {
const atkBlock = blockWith(shipped, (e) => isBuff(e, 'atkPct', 62.54));
const rsBlock = blockWith(shipped, (e) => isBuff(e, 'reloadSpeedPct', 67.2));

it('both buffs hang off her own burst cast, self-targeted', () => {
expect(atkBlock).toBeDefined();
expect(rsBlock).toBeDefined();
expect(atkBlock.trigger?.kind).toBe('burstCast');
expect(rsBlock.trigger?.kind).toBe('burstCast');
expect(atkBlock.target?.kind).toBe('self');
expect(rsBlock.target?.kind).toBe('self');
expect(slotWith(shipped, (e) => isBuff(e, 'atkPct', 62.54))).toBe('burst');
expect(slotWith(shipped, (e) => isBuff(e, 'reloadSpeedPct', 67.2))).toBe('burst');
});

it('ATK is self-scaling atkPct at the raw kit percentage', () => {
// 'ATK up 62.54%' scales her OWN ATK -> atkPct keeps the raw percentage.
// casterAtkPct (the nearest-wrong key) would re-emit as a flat ATK number instead.
const applies = buffApplies(base.events, 'atkPct', 62.54, SLUG);
expect(applies.length).toBeGreaterThanOrEqual(1);
expect(applies[0].casterIdx).toBe(applies[0].targetIdx);
expect(applies[0].durationShots).toBeUndefined();
});

it('the two windows differ by exactly 10s (10s ATK vs 20s reload speed)', () => {
// Both are applied on the same cast frame, so the expiresFrame delta is exactly
// (20 - 10) * 60 = 600 frames. A copy-paste 10s/10s or 20s/20s model fails here,
// and so does a permanent (no-expiry) model.
const atk = buffApplies(base.events, 'atkPct', 62.54, SLUG)[0];
const rs = buffApplies(base.events, 'reloadSpeedPct', 67.2, SLUG)[0];
expect(atk).toBeDefined();
expect(rs).toBeDefined();
expect(rs.expiresFrame - atk.expiresFrame).toBe(600);
});

it('the ATK buff is real and inert on teammates', () => {
expect(nNoBurstAtk).toBeGreaterThan(0);
expect(rNoBurstAtk.self).toBeLessThan(base.self);
expect(teammatesIdentical(rNoBurstAtk)).toBe(true);
});

it('the Reload Speed buff is real damage (it buys shots on a 201-frame reload)', () => {
// Taxonomy #6 again: reload speed is never a defensive no-op. No teammate
// inertness claim - her shot count feeds burst gauge and may shift the rotation.
expect(nNoBurstReload).toBeGreaterThan(0);
expect(rNoBurstReload.self).toBeLessThan(base.self);
});
});

===== (6) S6 BLIND OVERRIDE (claude-opus-5, written from kit prose alone) + DIFF VS DRIVER OVERRIDE =====

LEAK FLAG (self-reported by S6 author): PARTIAL — METADATA ONLY. The harness preamble (git status) named the driver's in-flight FILENAMES (override/test/review/extract/progress) but NO file CONTENTS, magnitudes, encodings, verdicts, or reasoning were visible, and the author opened none (no tools). Judge: rule whether filename-level knowledge voids independence. Driver note: the blind author chose a DIFFERENT S2a core-rate proxy (200 vs driver 63) and independently flagged it as unmeasured — evidence it did NOT copy the driver override.

DIFF (blind vs driver), line by line:
S1a damageTakenPct 12.56/3s + flatDamage 158.43, hitCount 60, enemy: IDENTICAL (blind adds explicit crit:true; driver relies on engine rider crit default — same behaviour).
S1b instantReload fraction 0.0667, hitCount 60, self: IDENTICAL.
S2a flatDamage 109.64, enemy: DIVERGENT TRIGGER ENCODING. Driver = hitCount 63 + requiresCore:true (60 core hits / 0.95 engine flat MG core rate, gated inert at zero core exposure). Blind = hitCount 200, NO requiresCore (60 / ~0.30 ASSUMED core rate, explicitly flagged unmeasured; blind author notes 'if requiresCore is a fight-level core-exposure gate, the correct encoding is count + requiresCore:true'). The engine's requiresCore IS a fight-level gate (sim.ts: 'if (block.requiresCore && cfg.coreHitRate <= 0) return;'), and the engine's flat MG core rate is 0.95 — so the driver encoding is the engine-grounded one; the blind 200 is an explicit guess at an engine-internal parameter the blind author could not know. Both agree on the KIT semantics (60 core hits -> 109.64% rider) and both flag the core-rate as unmeasured.
S2b fullBurstEnter self critRatePct 14.6/10s: IDENTICAL.
Burst burstCast self atkPct 62.54/10s + reloadSpeedPct 67.2/20s: IDENTICAL.
unmodeled: both EMPTY (every line modeled).
AGREEMENT: 6 of 7 lines byte-identical in structure + all kit-literal magnitudes; the 7th (S2a) diverges only on the one engine-internal core-rate parameter, in the direction the engine grounds.

--- S6 blind override ---
{
"slug": "ludmilla-winter-owner",
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 60
},
"target": {
"kind": "enemy"
},
"effects": [
{
"kind": "buff",
"stat": "damageTakenPct",
"value": 12.56,
"durationSec": 3
},
{
"kind": "flatDamage",
"atkPct": 158.43,
"crit": true
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 60
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "instantReload",
"fraction": 0.0667
}
]
}
],
"skill2": [
{
"slot": "skill2",
"trigger": {
"kind": "hitCount",
"count": 200
},
"target": {
"kind": "enemy"
},
"effects": [
{
"kind": "flatDamage",
"atkPct": 109.64,
"crit": true
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
"value": 14.6,
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
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "atkPct",
"value": 62.54,
"durationSec": 10
},
{
"kind": "buff",
"stat": "reloadSpeedPct",
"value": 67.2,
"durationSec": 20
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
"⚑ skill2 rider cadence: the kit trigger is 60 CORE hits, but the schema has no core-hit counter. Encoded as hitCount count 200 normal hits = 60 ÷ ~0.30 assumed MG core rate. The real core rate sets this cadence 1:1 — a 0.20 rate means 300, a 0.45 rate means 133. UNMEASURED.",
"⚑ skill2 rider deliberately does NOT set requiresCore, to avoid double-discounting on top of the count conversion. If requiresCore is a per-activation core-hit check rather than a fight-level core-exposure gate, the correct encoding is count 60 + requiresCore:true instead.",
"⚑ skill1 partial reload: 'Reloads 20 round(s)' encoded as instantReload fraction 0.0667 (= 20/300, the BASE belt). Any Max-Ammo increase (cube/OL/ally maxAmmoPct or maxAmmoFlat) makes this refill MORE than the kit's 20 rounds; a flat-round primitive would be faithful.",
"⚑ instantReload semantics assumed ADDITIVE (tops the belt up by fraction×max, capped at max), not 'set the belt to fraction×max'. If the engine sets rather than adds, this line becomes a damage LOSS instead of a gain.",
"⚑ MG cadence tuple: pulls/sec is not supplied, and reloadFrames 201 is a datamine field on the known-unreliable list. Every hitCount cadence here (and the value of the 67.2% Reload Speed buff) is downstream of the real shots/sec and the MG wind-up ladder.",
"⚑ Both flat riders: noFb is UNSET (Full Burst by timing, the default) and crit:true is set (riders crit at the caster's sheet rate). Both are project conventions, not measurements on this unit. Neither rider sets core — the kit text says 'additional damage', not 'core strike damage'.",
"Damage Taken ▲ 12.56% is a BOSS debuff (whole-team benefit, not a self buff), and it lasts only 3 s against a ~60-normal-hit refresh cadence — expect low duty-cycle uptime, so its board footprint is team-wide but small and cadence-sensitive.",
"skill1's two ■ headers both read 'landing 60 normal attack(s)'. Modeled as two independent hitCount:60 blocks; whether the game runs ONE shared counter feeding both, or two, is kit-silent (damage-identical either way at hitsPerShot 1, but it matters if a future ammo/uptime change desynchronizes them)."
],
"note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. MG/Water/Attacker/Burst III, 40 s burst CD, 300-round belt, hitsPerShot 1. Skill 1: a 60-normal-hit counter drives (a) a boss-side Damage Taken ▲ 12.56% / 3 s debuff plus a 158.43%-of-final-ATK rider, and (b) a self partial reload of 20 rounds. Skill 2: a 60-CORE-hit 109.64% rider (encoded as a normal-hit count via an assumed core rate — see caveats), plus a self Critical Rate ▲ 14.6% / 10 s on Full Burst ENTRY (team FB-enter as the text states, NOT own-burst-gated). Burst: self ATK ▲ 62.54% / 10 s and Reload Speed ▲ 67.2% / 20 s — the reload buff is modeled because reload speed gates shots fired and is therefore damage, and its 20 s duration deliberately outlasts the 10 s ATK window. Crit Rate is unscoped in the prose ('Critical Rate ▲'), so it is generic critRatePct, not critRateNormalPct. Nothing in the kit is skipped: all three unmodeled arrays are empty. No Pierce, no elemental-advantage damage buff (Water vs a Fire boss is the clean ×1.10), no stacks, no weapon swap, no DoT, no heal/shield, no gauge manipulation, no burst-eligibility change."
}
===== (7) DRIVER IMPLEMENTATION (under judgment) =====

--- driver test: scripts/tests/units/ludmilla-winter-owner.test.ts (13/13 GREEN vs shipped) ---
// PER-UNIT KIT SPEC — `ludmilla-winter-owner` (Ludmilla: Winter Owner, Attacker/MG/Water,
// Burst III, cd 40s, ammo 300, reloadFrames 201, hitsPerShot 1). Kit-autonomy gauntlet
// 2026-07-26. NOTE: this is the MG Water VARIANT — base `ludmilla` is a different unit
// (SMG/Water); every assertion keys on the full slug, never the bare "Ludmilla".
//
// One assertion group per KIT LINE (L1..L5 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against) — never to supply the encoding under
// test. Runs are deterministic (no seed); assertions are event-log relations, not totals.
//
// Kit (blablalink prose, data/characters.json → characters['ludmilla-winter-owner'].skills):
// S1 ■ every 60 normal attacks → the target: Damage Taken ▲12.56% for 3 sec [L1a]
// + 158.43% of final ATK as additional damage [L1b]
// ■ every 60 normal attacks → self: Reloads 20 round(s) of ammunition [L2]
// S2 ■ every 60 CORE hits → the target: 109.64% of final ATK as additional damage [L3]
// ■ at the beginning of Full Burst → self: Critical Rate ▲14.6% for 10 sec [L4]
// BU ■ self: ATK ▲62.54% for 10 sec + Reload Speed ▲67.2% for 20 sec [L5]
//
// Disposition: L1a/L1b/L2/L4/L5 FAITHFUL (pinned GREEN vs shipped, RED vs counterfactual).
// L3 FAITHFUL-with-⚑: the kit trigger is "hitting the Core for 60 time(s)" but the engine
// has no core-hit-count trigger, so it is PROXIED as hitCount 63 = round(60 / 0.95), the
// engine's flat MG core rate, gated requiresCore:true (inert at zero core exposure). The
// 63-vs-naive-60 discrimination and the requiresCore gate are both pinned below.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
// L1a damageTakenPct must be a BOSS debuff (targetIdx null) at exactly 12.56 / 3s that
// actually amplifies her hits (mult.taken reaches 1.1256) — a self buff or a wrong
// magnitude/duration fails.
// L1b the 158.43% rider lands on the hitCount-60 cadence (count === floor(shots/60)), in the
// skill bucket, crit-eligible (engine rider convention; kit says plain "additional
// damage"). A per-shot or per-burst trigger fails the cadence pin.
// L2 the 20-round top-up is an ammo-economy line: with it she reloads-to-max FEWER times and
// fires STRICTLY more shots over 180s. Remove it and reloads rise / shots fall.
// L3 count 63 (core-rate proxy), NOT the naive 60: floor(shots/63)=137 ≠ floor(shots/60)=144.
// And requiresCore is live: at coreHitRate 0 the rider count collapses to 0.
// L4 fires on EVERY team Full Burst entry (count === fullBurstStarts, not burstCasts) — the
// "beginning of Full Burst" wording is team-FB-entry, self-scoped, 14.6 / 10s, and it lifts
// her normal-attack crit rate (0.15 → 0.296).
// L5 burstCast self-buff: ATK 62.54 / 10s AND Reload Speed 67.2 / 20s (distinct durations).
// The reload-speed half is load-bearing: remove it and she fires ~1900 fewer shots.
//
// Inert / out-of-domain (documented, NOT asserted): the datamined MG cadence tuple
// (pullsPerSec / wind-up / reloadFrames 201) and the engine's flat 0.95 MG core rate are
// ⚑ unmeasured estimates (see override note) — they set the emergent shot COUNT, so pins are
// cadence-relative (floor(shots/N)), never absolute. No HP/shield/parts/gauge lines in this kit.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / lwo B3 / helm B3, boss Fire,
// focus lwo) — she needs a real rotation to cast her burst and to enter Full Burst at all.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CARRY = 'ludmilla-winter-owner';
const SLUGS = (controlComp(CARRY) as { slugs: string[] }).slugs;
/** controlComp slot order: liter 0 / crown 1 / ludmilla-winter-owner 2 / helm 3. */
const LWO = SLUGS.indexOf(CARRY);

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;

function run(
overrides: Record<string, any> = {},
cfg: Record<string, any> = {},
) {
const events: SimEvent[] = [];
runComp({
...controlComp(CARRY),
overrides,
cfg: { onEvent: (e) => events.push(e), ...cfg },
});
return events;
}

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
/** L2 reference: her S1 20-round top-up removed. _/
const noInstantReload = withPatchedOverride(CARRY, (ov) => {
const before = ov.skill1.length;
ov.skill1 = ov.skill1.filter(
(b: any) => !b.effects.some((e: any) => e.kind === 'instantReload'),
);
if (ov.skill1.length === before)
throw new Error('lwo S1 instantReload block missing — fixture is stale');
});
/_* L3 counterfactual: the NAIVE reading "60 core hits = hitCount 60" (drops the ÷0.95 proxy). _/
const naiveS2Count = withPatchedOverride(CARRY, (ov) => {
const b = ov.skill2.find((x: any) =>
x.effects.some((e: any) => e.kind === 'flatDamage'),
);
if (!b) throw new Error('lwo S2 flatDamage block missing — fixture is stale');
b.trigger.count = 60;
});
/_* L4 reference: her FB-entry crit-rate line removed. _/
const noCrit = withPatchedOverride(CARRY, (ov) => {
const before = ov.skill2.length;
ov.skill2 = ov.skill2.filter(
(b: any) => !b.effects.some((e: any) => e.stat === 'critRatePct'),
);
if (ov.skill2.length === before)
throw new Error('lwo S2 critRatePct block missing — fixture is stale');
});
/_* L5 reference: her burst Reload Speed half removed (ATK half kept). */
const noReloadSpeed = withPatchedOverride(CARRY, (ov) => {
let removed = 0;
for (const b of ov.burst) {
const before = b.effects.length;
b.effects = b.effects.filter((e: any) => e.stat !== 'reloadSpeedPct');
removed += before - b.effects.length;
}
if (removed === 0)
throw new Error(
'lwo burst reloadSpeedPct effect missing — fixture is stale',
);
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noIR = run({ [CARRY]: noInstantReload });
const naive = run({ [CARRY]: naiveS2Count });
const noCritRun = run({ [CARRY]: noCrit });
const noRS = run({ [CARRY]: noReloadSpeed });
const core0 = run({}, { coreHitRate: 0 });

// ---- readers ----------------------------------------------------------------------------------
const lwoDamage = (evs: SimEvent[], srcSlot?: Damage['srcSlot']) =>
evs.filter(
(e): e is Damage =>
e.kind === 'damage' &&
e.slug === CARRY &&
(srcSlot === undefined || e.srcSlot === srcSlot),
);
const lwoShots = (evs: SimEvent[]) =>
evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === CARRY);
const lwoReloads = (evs: SimEvent[]) =>
evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === CARRY);
const lwoBursts = (evs: SimEvent[]) =>
evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === CARRY);
const fbStarts = (evs: SimEvent[]) =>
evs.filter((e) => e.kind === 'fullBurstStart');
const buffs = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** buffApply events caster-OR-debuff attributed to LWO's line for a stat (enemy debuffs carry casterIdx null). */
const lwoBuffs = (evs: SimEvent[], stat: string) =>
buffs(evs).filter(
(b) => b.stat === stat && (b.casterIdx === LWO || b.targetIdx === null),
);

const SHOTS_BASE = lwoShots(base).length;

describe('ludmilla-winter-owner — kit spec', () => {
describe('L1a — S1 boss Damage Taken ▲12.56% for 3s (every 60 normal hits)', () => {
const applied = lwoBuffs(base, 'damageTakenPct');

    it('is a BOSS debuff at the kit magnitude and 3s duration, on the 60-hit cadence', () => {
      expect(
        applied.length,
        'no damageTakenPct debuff applied',
      ).toBeGreaterThan(0);
      expect(applied.length, 'cadence = floor(shots/60)').toBe(
        Math.floor(SHOTS_BASE / 60),
      );
      expect([...new Set(applied.map((b) => b.value))]).toEqual([12.56]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'must target the boss (null)',
      ).toEqual([null]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '3 sec',
      ).toEqual([3 * FPS]);
    });

    it('actually amplifies her hits (mult.taken reaches 1.1256 while live)', () => {
      const taken = [
        ...new Set(lwoDamage(base).map((d) => d.mult.taken.toFixed(4))),
      ];
      expect(taken).toContain('1.1256');
      expect(
        lwoDamage(base).filter((d) => d.mult.taken > 1.001).length,
      ).toBeGreaterThan(0);
    });

});

describe('L1b — S1 158.43% additional-damage rider (every 60 normal hits)', () => {
const riders = lwoDamage(base, 'skill1');

    it('lands on the 60-hit cadence at the kit magnitude, skill bucket, crit-eligible', () => {
      expect(riders.length).toBe(Math.floor(SHOTS_BASE / 60));
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([158.43]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });

    it('is a plain additional-damage rider: crit-eligible but NOT a core strike, no range bonus', () => {
      // Nearest-wrong (reviewer): core:true — the kit says "additional damage", not core strike.
      expect(riders.every((d) => !d.coreEligible && d.coreRate === 0)).toBe(
        true,
      );
      expect(riders.every((d) => !d.rangeApplied)).toBe(true);
    });

});

describe('L2 — S1 self 20-round reload top-up (every 60 normal hits)', () => {
it('reduces reload-to-max count and never loses shots vs the top-up removed', () => {
const baseReloads = lwoReloads(base).length;
const irReloads = lwoReloads(noIR).length;
const irShots = lwoShots(noIR).length;
expect(
baseReloads,
`base ${baseReloads} reloads vs no-top-up ${irReloads}`,
).toBeLessThan(irReloads);
expect(
SHOTS_BASE,
`base ${SHOTS_BASE} shots vs no-top-up ${irShots}`,
).toBeGreaterThan(irShots);
});
});

describe('L3 — S2 109.64% core-hit rider (every 60 core hits → proxied hitCount 63, requiresCore)', () => {
const riders = lwoDamage(base, 'skill2');

    it('fires on the core-rate proxy cadence floor(shots/63), NOT the naive 60', () => {
      expect(riders.length).toBe(Math.floor(SHOTS_BASE / 63));
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([109.64]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      // Triggered BY core hits but itself a plain additional-damage rider (no core strike, no range).
      expect(
        riders.every(
          (d) => !d.coreEligible && d.coreRate === 0 && !d.rangeApplied,
        ),
      ).toBe(true);
    });

    it('DISCRIMINATING: the naive count-60 reading produces a different (wrong) count', () => {
      const naiveRiders = lwoDamage(naive, 'skill2');
      expect(naiveRiders.length).toBe(Math.floor(SHOTS_BASE / 60));
      expect(naiveRiders.length).not.toBe(riders.length);
    });

    it('DISCRIMINATING: requiresCore is live — zero core exposure silences the rider entirely', () => {
      expect(lwoDamage(core0, 'skill2').length).toBe(0);
      expect(riders.length).toBeGreaterThan(0);
    });

});

describe('L4 — S2 self Critical Rate ▲14.6% for 10s at the beginning of Full Burst', () => {
const applied = lwoBuffs(base, 'critRatePct').filter(
(b) => b.casterIdx === LWO,
);

    it('fires on EVERY team Full Burst entry (not only her own casts), self-scoped, 14.6 / 10s', () => {
      expect(applied.length, 'count must equal team FB entries').toBe(
        fbStarts(base).length,
      );
      expect(applied.length).not.toBe(lwoBursts(base).length); // 11 FB entries ≠ 6 of her casts
      expect([...new Set(applied.map((b) => b.value))]).toEqual([14.6]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'self-scoped',
      ).toEqual([LWO]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame! - b.frame))],
        '10 sec',
      ).toEqual([10 * FPS]);
    });

    it('DISCRIMINATING: removing it collapses her elevated normal-attack crit rates', () => {
      const critRates = (evs: SimEvent[]) =>
        [
          ...new Set(
            lwoDamage(evs)
              .filter((d) => d.bucket === 'normal')
              .map((d) => d.critRate.toFixed(4)),
          ),
        ].sort();
      expect(critRates(base)).toContain((0.15 + 0.146).toFixed(4)); // 0.2960 = base 15% + 14.6%
      expect(critRates(base)).not.toEqual(critRates(noCritRun));
    });

});

describe('L5 — burst self ATK ▲62.54% / 10s + Reload Speed ▲67.2% / 20s', () => {
const atk = lwoBuffs(base, 'atkPct').filter((b) => b.casterIdx === LWO);
const rs = lwoBuffs(base, 'reloadSpeedPct').filter(
(b) => b.casterIdx === LWO,
);

    it('both fire once per burst cast, self-scoped, at the kit magnitudes', () => {
      const casts = lwoBursts(base).length;
      expect(casts).toBeGreaterThan(0);
      expect(atk.length).toBe(casts);
      expect(rs.length).toBe(casts);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([62.54]);
      expect([...new Set(rs.map((b) => b.value))]).toEqual([67.2]);
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([LWO]);
      expect([...new Set(rs.map((b) => b.targetIdx))]).toEqual([LWO]);
    });

    it('the two halves have DISTINCT durations (ATK 10s, Reload Speed 20s)', () => {
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
      expect([...new Set(rs.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        20 * FPS,
      ]);
    });

    it('DISCRIMINATING: the Reload Speed half is load-bearing for her shot economy', () => {
      expect(
        SHOTS_BASE,
        `base ${SHOTS_BASE} shots vs no-reload-speed ${lwoShots(noRS).length}`,
      ).toBeGreaterThan(lwoShots(noRS).length);
    });

});
});

--- driver override: src/skills/overrides/ludmilla-winter-owner.json ---
{
"note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. — ludmilla-winter-owner (Ludmilla: Winter Owner, MG/Water/Attacker/B3), kit-parse AUTHOR wave 4. S1: every 60 normal hits → boss Damage Taken +12.56% (3s) + 158.43% flatDamage rider (FB-by-timing default, crits by engine default, no core — kit text says plain 'additional damage'), PLUS self 'Reloads 20 rounds' = instantReload fraction 0.0667 (20/300; engine adds ammo without interrupting fire — matches the in-game passive top-up; net mag ≈450 shots/cycle = 300/(1-1/3), fewer wind-up restarts). S2 proc: kit trigger is 'hitting the Core for 60 time(s)' — no core-hit-count trigger exists in types.ts, so PROXIED as hitCount 63 (⚑) = 60 ÷ 0.95, the engine's own flat MG core rate (acrFor HI; whole-picture-consistent with how the sim cores her normal hits — the prior materialized file's count 120 assumed 50% core, inconsistent with the engine's MG model), with requiresCore:true so the block is inert when core exposure is zero. S2 FB: 'beginning of Full Burst' → fullBurstEnter self Crit Rate +14.6% 10s (hard rule 6: fires on team FB entry regardless of burster — correct for this wording). Burst (burstCast, self): ATK +62.54% 10s + Reload Speed +67.2% 20s (kit-verified 67.2; reloadSpeedPct composes with reloadFrames 201 at sim.ts reloadFramesNeeded — hard rule 1, shot-count channel). No lines skipped — unmodeled empty. ⚑ LIST: (1) cadence tuple — MG pullsPerSec/wind-up + reloadFrames 201 datamined, unverified; (2) S2 hitCount 63 core-proxy — tied to the engine's flat HI 0.95 MG core rate (itself ⚑, not measured per-band): recompute if MG acr is ever refit per-band, and pin from footage (red CORE HIT popup fraction → count = round(60/coreRate)); (3) S1 20-round top-up economy — verify per-mag shot count ≈450 (=300/(1-1/3)) and that the in-game refill doesn't interrupt fire. Kit-autonomy gauntlet 2026-07-26: cross-family corroborated GO (S2b fable / S5+S6 opus / S7 kimi-k3 converged); all 7 kit lines FAITHFUL, scripts/tests/units/ludmilla-winter-owner.test.ts 13/13 GREEN; the S2 60-core-hit proxy (hitCount 63 + requiresCore) and the fullBurstEnter-vs-burstCast trigger split both pinned against independent blind re-derivations.",
"unmodeled": {
"skill1": [],
"skill2": [],
"burst": []
},
"caveats": [
"skill2: the '60 core hits' proc is proxied as every 63 normal hits (engine MG core rate 0.95) — unmeasured estimate",
"skill1: MG cadence tuple (fire rate / wind-up / reloadFrames 201) is datamined, unverified"
],
"skill1": [
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 60
},
"target": {
"kind": "enemy"
},
"effects": [
{
"kind": "buff",
"stat": "damageTakenPct",
"value": 12.56,
"durationSec": 3
},
{
"kind": "flatDamage",
"atkPct": 158.43
}
]
},
{
"slot": "skill1",
"trigger": {
"kind": "hitCount",
"count": 60
},
"target": {
"kind": "self"
},
"effects": [
{
"kind": "instantReload",
"fraction": 0.0667
}
]
}
],
"skill2": [
{
"slot": "skill2",
"trigger": {
"kind": "hitCount",
"count": 63
},
"target": {
"kind": "enemy"
},
"requiresCore": true,
"effects": [
{
"kind": "flatDamage",
"atkPct": 109.64
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
"value": 14.6,
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
"kind": "self"
},
"effects": [
{
"kind": "buff",
"stat": "atkPct",
"value": 62.54,
"durationSec": 10
},
{
"kind": "buff",
"stat": "reloadSpeedPct",
"value": 67.2,
"durationSec": 20
}
]
}
]
}
