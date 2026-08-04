# S7 — RECONCILING JUDGE packet for `sora`

## 1. YOUR CONTRACT

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

> Section headings use roman numerals since 2026-08-03 — the old letter labels collided with a one-letter unit slug under the packet leak-check word-boundary regex.

**I. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's
SHIPPED override (mentally trace, or note what a run would show): **GREEN = convergence; any RED = a
divergence to classify.** A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK
evidence (every agent is the same model — convergence proves stability, not correctness).

**II. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:

- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket,
  trigger timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a
  `⚑` (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` (line nowhere — not block,
  config, or `unmodeled`) → `ENGINE`/`FIDELITY` (encoded but the engine routes/executes it so behavior differs
  from the kit wording, or the downstream effect is modeled rather than the named mechanic) → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.

**III. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over
the 180s fight (the DBG side-effect check), not merely be present. A modeled line that doesn't activate is a
REAL-GOTCHA. (A block whose only observable is a consumer's reaction needs a fixture that strips the unit's
other sources of that signal — note if the driver's fixture fails to isolate.)

**IV. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the
S2d matrix / S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.

**V. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the
prose + formula (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.

**VI. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as
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


## 2. MECHANICS SSOT (the sim's ground rules)

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

**Delayed BLOCKS, distinct from flighted damage (2026-08-03):** a separate `delaySec` sits on the
BLOCK rather than on a flat-damage effect, and delays the whole block — every effect kind, buffs
included. It exists for kit lines whose activation condition is only satisfied a fixed time after
the observable event that causes it: Flora's "when either adjacent ally reaches max HP" fires 2
seconds after Burst Stage 2 entry, because her own skill 1 hands those allies a 2-second Max HP
grant there and they return to max HP when it expires (DECISIONS 2026-08-03). The block's gates and
its `everyN` counter are evaluated when the TRIGGER fires — that is the state the kit line's
activation clause reads — while targets and effect values resolve at LANDING; a landing frame past
the end of the fight never applies, and an absent or zero value is a strict no-op.

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
  (owner-confirmed the gate is real). The same-squad primitive is `teamHas.sameSquad`
  (2026-08-02): some OTHER ally shares the owner's squad per the curated map
  `src/data/squads.ts`; fails closed for unmapped owners. Blanc's (`blanc`) S2
  burst-CDR is gated on it (squad = noir+rouge; noir's `.slugs` spelling predates the
  primitive and migrates to it).

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
inert. Same-squad gates ("with an ally from the same squad on the battlefield") are
static team-composition checks, exact at scope lock where no ally ever dies. The
primitive is `teamHas.sameSquad`: squad membership is curated in `src/data/squads.ts`
(characters.json has no squad axis) and the gate fails closed for unmapped owners.
Squad of Blanc `blanc` / Noir `noir` / Rouge `rouge` — owner-confirmed 2026-08-02
(extending the 2026-07-20 Noir ruling; the bunny/maid units are a DIFFERENT squad, a
common misread): Blanc's S2 burst-CDR is gated on it. Noir's same-squad burst line
still uses the older `teamHas.slugs:['blanc','rouge']` spelling (same extension,
migration pending). M.M.R. (Tia `tia` / Naga `naga` / Marciana `marciana`,
owner-confirmed 2026-08-02) is seeded in the map; no gate consumes it yet.

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


## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json → characters.sora)

```json
{
  "slug": "sora",
  "name": "Sora",
  "weapon": "RL",
  "class": "Supporter",
  "element": "Wind",
  "burst": "I",
  "burstCooldownSec": 40,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "hitsPerShot": 1,
  "burstGaugePerShot": 1.4,
  "manufacturer": "Elysion",
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 98,
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
    "resourceId": 532
  },
  "skills": {
    "skill1": "\u25a0 Activates at the start of battle. Affects self.\nOutgoing healing \u25b2 35.2% continuously.",
    "skill2": "\u25a0 Activates when an ally or self destroys an enemy's part. Affects all allies.\nStorage: Stores excess healing received by the skill user, up to 5.36% of their Max HP. Stacks up to 5 time(s) and lasts for 15 sec.\nATK \u25b2 23.74% of the skill user's ATK for 15 sec.",
    "burst": "\u25a0 Affects all allies.\nRecovers 52.27% of the skill user's final Max HP as HP.\nRemoves 1 debuff(s)."
  }
}
```

## 4. S2b cross-family test-faithfulness review (claude-fable-5)

```json
{
  "slug": "sora",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ start of battle / Outgoing healing ▲ 35.2%",
      "disposition": "UNMODELED",
      "scope": "Healing effectiveness only — modifies the magnitude of heals Sora casts. Not a damage stat, not scoped to any attack category.",
      "durationSemantics": "\"continuously\" = permanent passive, whole fight. No rounds, no stacks.",
      "triggerIdentity": "passive (activates at battle start, always on).",
      "targetSet": "self only.",
      "nearestWrongModel": "Encoding it as a live damage stat (attackDamagePct 35.2 or atkPct 35.2 on self) because 'Outgoing ▲' pattern-matches a generic buff — or granting it to allies. Either over-credits massively. A subtler misread: assuming heal MAGNITUDE matters to teammates' on-recovery triggers (it does not — the engine models recovery EVENTS, not HP amounts, so a bigger heal fires the same triggers).",
      "distinguishingAssertion": "In a comp with sora as B1, filter buffApply events with casterIdx === sora's index: NO buffApply carrying any damage-relevant StatKey (atkPct/attackDamagePct/etc.) may originate from skill1, and totals(res)[<each slug>] must be identical when skill1's line is stripped via withPatchedOverride('sora', o => { o.skill1 = [] }). Green under faithful (inert, recorded in unmodeled); red under nearest-wrong (a 35.2% damage buffApply appears and totals move).",
      "inertness": "Must move ZERO damage for every unit in the comp; must not change the count or timing of recovery events emitted by Sora's burst heal.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "■ when ally/self destroys an enemy's part",
      "disposition": "UNMODELED",
      "scope": "Trigger header for both skill2 effect lines. Gates everything below it.",
      "durationSemantics": "n/a (trigger clause).",
      "triggerIdentity": "Part-destruction event. The engine's TriggerDef has NO part-destroy kind, and the scope-lock boss is PARTLESS (partsDamagePct is documented 'parsed but inert in v1 — no parts on the boss'). This trigger is structurally unreachable in v1: it can never fire.",
      "targetSet": "all allies (per header).",
      "nearestWrongModel": "Substituting a reachable trigger to 'make the kit live' — keying the block to fullBurstEnter, interval, or hitCount so the ATK buff applies anyway. Any substitute trigger converts a dead line into a permanent ~23.74%-of-caster-ATK team grant: a large over-credit with no kit basis.",
      "distinguishingAssertion": "Covered by the skill2 ATK-line assertion below (no casterAtkPct buffApply from Sora, ever).",
      "inertness": "The whole skill2 block must be inert at scope lock — no buffApply, no resource events, no damage movement attributable to skill2.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Storage: stores excess healing, 5.36% Max HP",
      "disposition": "UNMODELED",
      "scope": "A stored-healing/overheal pool on the skill user — defensive resource, no damage consumer anywhere in this kit.",
      "durationSemantics": "Stacks up to 5, each lasting 15 sec — stack semantics with a per-stack wall-clock timer. NOT rounds.",
      "triggerIdentity": "Same unreachable part-destruction trigger as the header.",
      "targetSet": "Pool is held by the skill user (self); the header's 'all allies' applies to the block, but the storage text names the skill user.",
      "nearestWrongModel": "Modeling it as a 'shield' effect on a live trigger, which would fire allies' 'shielded' triggers and open teammates' requiresShielded gates — a phantom cross-unit activation channel (taxonomy #4 in reverse: inventing a tandem feed that doesn't exist at scope because the trigger never fires).",
      "distinguishingAssertion": "No shield-kind events and no 'shielded'-triggered buffApply chains originate from Sora across a full 180s run; a teammate with a shield-gated kit line must behave identically with Sora present vs replaced.",
      "inertness": "Must not open any requiresShielded/shielded pathway on any ally; zero damage movement.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 23.74% of the skill user's ATK, 15 sec",
      "disposition": "UNMODELED",
      "scope": "Generic ATK grant (flat add scaled off CASTER's ATK — the casterAtkPct shape, not atkPct), to all allies.",
      "durationSemantics": "'for 15 sec' — genuine durationSec 15, wall-clock. Not rounds, not stacks (the ATK line itself states no stack count; the 5-stack clause belongs to the Storage line).",
      "triggerIdentity": "Gated on the unreachable part-destruction trigger — never fires vs the partless scope-lock boss.",
      "targetSet": "all allies (including self).",
      "nearestWrongModel": "Two-layer misread: (1) making it live via a substitute trigger (fullBurstEnter/interval) — grants every ally ≈0.2374 × Sora's staticAtk flat ATK for 15s windows, moving the whole team's damage; (2) encoding it as atkPct 23.74 (scales each TARGET's own ATK) instead of casterAtkPct — wrong shape even if it were live, over-crediting high-ATK carries since Sora is a Supporter with low static ATK.",
      "distinguishingAssertion": "Across a full run with sora as B1, assert there is NO buffApply with stat 'casterAtkPct' whose casterIdx is Sora's slot (and no atkPct ≈ 23.74 from her either). Green under faithful (the line lives in unmodeled, block absent or unreachable); red under BOTH nearest-wrong variants (a buffApply appears with value ≈ 0.2374 × sora staticAtk, flat-resolved per the harness rule, or raw 23.74 under atkPct).",
      "inertness": "Team totals must be identical with Sora's skill2 present vs stripped; the carry's damage must not move at all.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Recovers 52.27% of skill user's Max HP",
      "disposition": "FAITHFUL",
      "scope": "A heal — no damage of its own, but it is the kit's ONE live cross-unit channel: taxonomy #4 forbids skipping heals on isolation because on-recovery consumers (Crown's 'when recovery takes effect') feed off the EVENT.",
      "durationSemantics": "Instant single heal per burst cast — ticks:1 (default), no HoT wording ('every 1 sec for N sec' is absent).",
      "triggerIdentity": "burstCast (Sora's OWN burst — she is Burst I, cd 40s, so this fires on every rotation she opens). NOT fullBurstEnter: the heal must land on her cast, pre-FB-window, not on any team FB she didn't initiate — though as sole B1 in a fixture the two coincide, the encoding still matters for multi-B1 generality.",
      "targetSet": "all allies (including self).",
      "nearestWrongModel": "Skipping the heal entirely as 'defensive, no damage modeled' — the classic taxonomy-#4 trap. This silently kills every recovery-triggered teammate buff. Secondary misread: modeling HP magnitude and concluding it inert while forgetting the heal effect-kind exists precisely to emit recovery events.",
      "distinguishingAssertion": "Build a comp with sora in the B1 slot + crown B2 + a B3 carry (note: controlComp() pins liter as B1, so the test must construct CompOptions with sora replacing liter). Assert: (a) after each sora burstCast event, buffApply events attributable to crown's recovery-triggered kit line appear (filter by stat+key, casterIdx === crown's slot); (b) totals with Sora's burst heal stripped via withPatchedOverride are strictly LOWER for the team than with it present (crown's recovery-fed contribution disappears). Green under faithful (heal effect kind:'heal', target allies, trigger burstCast); red under nearest-wrong (no recovery events, crown's consumers never fire off Sora's burst).",
      "inertness": "The heal itself must add zero direct damage (no damage event with srcSlot burst from this effect); its whole footprint is the recovery events it emits.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Removes 1 debuff(s)",
      "disposition": "UNMODELED",
      "scope": "Ally debuff-cleanse. The v1 boss deals no damage and applies no debuffs to allies — there is nothing to remove.",
      "durationSemantics": "Instant, per cast.",
      "triggerIdentity": "Same burstCast as the heal line.",
      "targetSet": "all allies.",
      "nearestWrongModel": "Reading 'Removes 1 debuff' as dispelling the BOSS's beneficial-status or as stripping boss-held debuffs the TEAM applied (damageTakenPct debuffs are boss-held team ASSETS — removing those would be actively wrong and damage-negative).",
      "distinguishingAssertion": "Boss-held debuffs applied by teammates (buffApply with casterIdx===null && targetIdx===null, e.g. a damageTakenPct carrier) must persist unchanged across Sora's burst casts — no removal, no re-application gap.",
      "inertness": "Must not touch any boss-held debuff window or any ally buff.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "burst:Recovers 52.27% of skill user's Max HP as HP (heal → recovery events, tandem channel)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Outgoing healing ▲ 35.2% continuously."
    ],
    "skill2": [
      "■ Activates when an ally or self destroys an enemy's part. Affects all allies.",
      "Storage: Stores excess healing received by the skill user, up to 5.36% of their Max HP. Stacks up to 5 time(s) and lasts for 15 sec.",
      "ATK ▲ 23.74% of the skill user's ATK for 15 sec."
    ],
    "burst": [
      "Removes 1 debuff(s)."
    ]
  },
  "notes": "Sora is a near-total scope-lock null: her ONLY live mechanic is the burst heal's recovery-event emission (tandem with on-recovery consumers — Crown, who sits in the standard control comp, is the natural probe). Expected shared-prior misreads to check the driver against: (1) skipping the burst heal as 'defensive' — taxonomy #4's exact trap, and the single load-bearing line; (2) resurrecting skill2 on a substitute trigger (fullBurstEnter/interval) because a fully-dead skill 'feels wrong' — the part-destruction trigger has no engine primitive AND the scope-lock boss is partless, so total inertness IS the faithful model; (3) shape error on the ATK line if ever modeled: it is casterAtkPct (23.74% of SORA's supporter-tier ATK, flat-resolved at apply per the harness rule), not atkPct on each target; (4) skill1's outgoing-healing stat has no StatKey and no damage consumer — and heal MAGNITUDE is irrelevant to recovery triggers (events, not amounts), so it stays inert even in tandem comps. Fixture note: sora is Burst I — controlComp() hard-pins liter as B1, so her test comp must be hand-built (sora B1 / crown B2 / carry B3) or bursts will mis-attribute; a lone-B3-style zero-FB failure isn't the risk here, but liter-vs-sora B1 substitution is. All magnitudes are kit-literal (DATAMINED); no ⚑ fields are needed since no cadence/trigger invention is required — the faithful override is one burstCast heal block plus a complete unmodeled record.",
  "model": "claude-fable-5"
}

```

Driver reconciliation: # S2c reconciliation — sora (driver vs claude-fable-5 S2b review)

CONVERGENCE (6/6 lines):
- skill1 outgoing-healing 35.2%: UNMODELED (both) — heal amounts unmodeled; fable adds the
  useful refinement that heal MAGNITUDE is irrelevant to recovery triggers (events, not amounts).
- skill2 part-destroy trigger + storage + ATK 23.74: UNMODELED (both) — no part-destroyed
  event primitive, partless scope boss; fable independently names the SAME nearest-wrong
  (substitute trigger materializing a passive casterAtkPct grant) and the shape note
  (casterAtkPct not atkPct, if ever live). Driver's materialized-Atk counterfactual uses
  casterAtkPct per this shape.
- burst heal 52.27% final Max HP: FAITHFUL (both) — burstCast (NOT fullBurstEnter), allies,
  instant ticks:1 heal; the kit's only load-bearing line; fable flags the taxonomy-#4 trap
  (skipping it as 'defensive') which the driver's live-consumer assertions close.
- burst cleanse: UNMODELED (both) — no ally debuffs exist in v1.

DIVERGENCES (ruled driver-side, documented):
1. FIXTURE — fable proposes sora/crown/carry; driver uses sora(B1)/folkwang-bare(B2)/asuka(B3).
   Rationale: asuka's S1 recovery consumer is SELF-targeted (exactly one buffApply per recovery
   landing — no per-holder multiplicity), and bare-folkwang + lifesteal-stripped asuka make sora
   the SOLE recovery source. crown is itself a recovery consumer AND carries a hitCount-860
   self-heal (needs patching out; snow-crane precedent chose the same isolation path). The
   driver fixture subsumes fable's design with stricter source isolation.
2. UNMODELED SPLIT — fable splits skill2 into 3 verbatim entries (trigger header / storage /
   ATK line), skill1 as the value line only. Driver adopts fable's granular skill2 split but
   keeps skill1 as the FULL prose line (the activation clause is part of the same kit line).
   Both forms are verbatim substrings; the test asserts containment dynamically.

VERDICT: GO (cross-family) — no REAL-GOTCHA; both families agree the faithful override is one
burstCast/allies/heal block plus a complete verbatim unmodeled record.


## 5. S5 blind test suite (claude-opus-5) + result vs the DRIVER override

Result: **12 passed / 2 skipped, 0 failed (GREEN)** — after ONE mechanical adaptation
(import path depth `../lib/harness.js` → `../../tests/lib/harness.js`; the blind packet's
path is wrong for the blind/ directory). The 2 skips are the blind model's OWN declared GAPs:
skill1's outgoing-healing magnitude (no StatKey, heal amounts unmodeled) and the burst cleanse
(no ally-debuff model) — exactly the driver's UNMODELED lines K1/K4. Notably the blind suite's
tandem assertions fired green in a controlComp fixture WITH liter as a competing Burst I
(tracer confirmed sora still casts; recovery sensor on crown saw one landing per sora cast).

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * sora (RL / Wind / Supporter / Burst I) - BLIND kit spec test.
 *
 * Written from the kit prose alone (S5 post-op); the shipped override, the driver's tests
 * and the driver's reasoning were never read.
 *
 * KIT (paraphrased, short quotes only)
 *   skill1  start of battle, self:  'Outgoing healing' +35.2%, continuous.
 *   skill2  activates when an ally or self destroys an enemy PART, all allies:
 *             - a healing 'Storage' capped at 5.36% of Max HP, 5 stacks, 15 sec
 *             - ATK +23.74% 'of the skill user's ATK' for 15 sec  -> casterAtkPct
 *   burst   all allies: recovers 52.27% of the caster's final Max HP; removes 1 debuff.
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *  1. skill1's stat is a HEALING MAGNITUDE. No StatKey expresses it and the engine's `heal`
 *     effect models no HP amount, so the faithful disposition is GAP. The live risk is
 *     mis-encoding 35.2 as a damage stat, so the test asserts sora grants no damage-relevant
 *     stat buff at all, and that 35.2 appears in no skill1 buff effect.
 *  2. skill2's activation clause is PART DESTRUCTION. The scope-lock boss is partless and the
 *     trigger vocabulary has no part-destroy kind, so the entire block must be BEHAVIOURALLY
 *     INERT. Every nearest-wrong model (re-keying to passive / fullBurstEnter / burstCast /
 *     hitCount) puts a team-wide casterAtkPct on the board, so 'emptying skill2 changes
 *     nothing' goes red under all of them. A synthetic passive-keyed clone of the same grant
 *     proves the check is not vacuous - wired up, it DOES move the board.
 *  3. the burst is a heal + a cleanse: no damage of its own, and its only observable channel
 *     is a teammate's `recovery` trigger. The test injects a recovery SENSOR onto crown (an
 *     atkPct buff on a {kind:'recovery'} trigger) so the tandem reading does not depend on
 *     crown's real kit, and runs it in the helm-free comp so the fixed B3's own heals cannot
 *     pre-satisfy the sensor. The nearest-wrong model - encoding 52.27% as a casterMaxHpPct
 *     grant instead of a heal - fires no recovery trigger and is caught structurally too.
 *
 * FIXTURES
 *   controlComp('sora', true)  - liter B1 / crown B2 / sora / helm B3: skill1 + skill2 work.
 *   controlComp('sora', false) - helm dropped: burst-heal tandem (helm's heals would confound
 *                                the recovery sensor).
 *   sora is a Burst I unit sitting in the carry slot alongside liter, so whether she ever
 *   casts her burst is a FIXTURE fact, not a kit fact - a tracer burst hit measures it
 *   explicitly, and the tandem assertion only runs once that is established.
 *
 * ASSUMPTION: scope-lock config (no cube), so the only self-targeted buffApply events sora
 * can emit are kit-sourced.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'sora';
const S1_HEAL_PCT = 35.2;
const STORAGE_MAXHP_PCT = 5.36;
const S2_ATK_PCT = 23.74;
const S2_DURATION_SEC = 15;
const BURST_HEAL_MAXHP_PCT = 52.27;
const SENTINEL_STAT = 'critDamagePct';
const SENTINEL_VALUE = 7.77;

const DAMAGE_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
  'critRatePct',
  'critRateNormalPct',
  'critDamagePct',
  'coreDamagePct',
  'elementDamagePct',
  'chargeDamagePct',
  'chargeDamageMultPct',
  'attackDamagePct',
  'sustainedDamagePct',
  'sequentialDamagePct',
  'sequentialMultPct',
  'trueDamagePct',
  'damageTakenPct',
  'extraHitDamagePct',
  'normalAttackPct',
  'elemAdvantageDamagePct',
]);

type Slot = 'skill1' | 'skill2' | 'burst';
type AnyBlock = Record<string, any>;

/** The override FILE is slot-keyed; tolerate both `ov[slot]: Block[]` and `ov[slot].blocks`. */
function readSlot(ov: any, slot: Slot): AnyBlock[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? (s as AnyBlock[]) : ((s.blocks ?? []) as AnyBlock[]);
}
function writeSlot(ov: any, slot: Slot, blocks: AnyBlock[]): void {
  const s = ov?.[slot];
  if (s && !Array.isArray(s)) s.blocks = blocks;
  else ov[slot] = blocks;
}

interface BuffApplyLike {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string;
}
const buffApplies = (evs: SimEvent[]): BuffApplyLike[] =>
  (evs as unknown as BuffApplyLike[]).filter((e) => e.kind === 'buffApply');

function withEvents<T>(opts: T, sink: SimEvent[]): T {
  const o = opts as unknown as { cfg?: Record<string, unknown> };
  o.cfg = { ...(o.cfg ?? {}), onEvent: (ev: SimEvent) => sink.push(ev) };
  return opts;
}
function withOverrides<T>(opts: T, map: Record<string, unknown>): T {
  const o = opts as unknown as { overrides?: Record<string, unknown> };
  o.overrides = { ...(o.overrides ?? {}), ...map };
  return opts;
}

const effectsOf = (blocks: AnyBlock[]): AnyBlock[] =>
  blocks.flatMap((b) => ((b.effects ?? []) as AnyBlock[]));
const near = (a: unknown, b: number): boolean =>
  typeof a === 'number' && Math.abs(a - b) < 1e-4;

// ------------------------------------------------------------------ hoisted runs (7)

const controlEvents: SimEvent[] = [];
const control = runComp(withEvents(controlComp(SLUG, true), controlEvents));

// One clone captures the authored structure AND yields the heal-stripped counterfactual.
let ovSkill1: AnyBlock[] = [];
let ovSkill2: AnyBlock[] = [];
let ovBurst: AnyBlock[] = [];
const healOff = withPatchedOverride(SLUG, (ov: any) => {
  ovSkill1 = readSlot(ov, 'skill1');
  ovSkill2 = readSlot(ov, 'skill2');
  ovBurst = readSlot(ov, 'burst');
  writeSlot(
    ov,
    'burst',
    ovBurst.map((b) => ({
      ...b,
      effects: ((b.effects ?? []) as AnyBlock[]).filter((e) => e.kind !== 'heal'),
    })),
  );
});

const s2Empty = withPatchedOverride(SLUG, (ov: any) => {
  writeSlot(ov, 'skill2', []);
});

// The same ATK grant, deliberately re-keyed to the nearest-wrong trigger, plus a
// uniquely-valued sentinel buff whose casterIdx identifies sora's slot in this comp.
const s2Passive = withPatchedOverride(SLUG, (ov: any) => {
  writeSlot(ov, 'skill2', [
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [
        { kind: 'buff', stat: 'casterAtkPct', value: S2_ATK_PCT },
        { kind: 'buff', stat: SENTINEL_STAT, value: SENTINEL_VALUE },
      ],
    },
  ]);
});

const burstTracer = withPatchedOverride(SLUG, (ov: any) => {
  writeSlot(ov, 'burst', [
    ...readSlot(ov, 'burst'),
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'flatDamage', atkPct: 1000 }],
    },
  ]);
});

// A recovery SENSOR: makes any heal that reaches crown observable as damage, independent
// of whatever crown's real on-recovery line happens to grant.
const crownSensor = withPatchedOverride('crown', (ov: any) => {
  writeSlot(ov, 'skill1', [
    ...readSlot(ov, 'skill1'),
    {
      slot: 'skill1',
      trigger: { kind: 'recovery' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'atkPct', value: 100 }],
    },
  ]);
});

const s2EmptyRes = runComp(
  withOverrides(controlComp(SLUG, true), { [SLUG]: s2Empty }),
);
const s2PassiveEvents: SimEvent[] = [];
const s2PassiveRes = runComp(
  withEvents(
    withOverrides(controlComp(SLUG, true), { [SLUG]: s2Passive }),
    s2PassiveEvents,
  ),
);

const noHelmPlain = runComp(controlComp(SLUG, false));
const noHelmTracer = runComp(
  withOverrides(controlComp(SLUG, false), { [SLUG]: burstTracer }),
);
const sensorHealOn = runComp(
  withOverrides(controlComp(SLUG, false), { crown: crownSensor }),
);
const sensorHealOff = runComp(
  withOverrides(controlComp(SLUG, false), {
    crown: crownSensor,
    [SLUG]: healOff,
  }),
);

const sentinel = buffApplies(s2PassiveEvents).find(
  (e) => e.stat === SENTINEL_STAT && near(e.value, SENTINEL_VALUE),
);
const soraIdx = sentinel?.casterIdx ?? null;
const soraBuffs = buffApplies(controlEvents).filter(
  (e) => soraIdx !== null && e.casterIdx === soraIdx,
);

const soraCastsBurst =
  unitOf(noHelmTracer, SLUG).totalDamage > unitOf(noHelmPlain, SLUG).totalDamage;

// ------------------------------------------------------------------ skill1

describe('sora skill1 - outgoing healing +35.2% (self, continuous)', () => {
  it.skip('scales healing output by 35.2% - GAP: no outgoing-healing StatKey, and the `heal` effect carries no HP amount in v1, so the magnitude is unobservable', () => {
    // Intentionally unimplementable at scope. Recorded so the line is not silently dropped.
  });

  it('does not encode the 35.2% healing line as a stat buff', () => {
    const buffs = effectsOf(ovSkill1).filter((e) => e.kind === 'buff');
    // Nearest-wrong: 35.2 parked on atkPct / attackDamagePct / any damage stat because the
    // healing stat has no home. That would credit sora with a permanent self damage buff.
    expect(buffs.filter((e) => near(e.value, S1_HEAL_PCT))).toHaveLength(0);
  });
});

// ------------------------------------------------------------------ skill2

describe('sora skill2 - part-destroy trigger, ATK +23.74% of caster ATK / 15s', () => {
  it('sentinel run identifies sora\u2019s caster slot (index derivation for the runtime checks)', () => {
    expect(typeof soraIdx).toBe('number');
  });

  it('the part-destroy trigger never fires: emptying skill2 leaves the board byte-identical', () => {
    // The scope-lock boss is PARTLESS and no part-destroy trigger kind exists, so the whole
    // block must be inert. RED under every nearest-wrong re-key (passive / fullBurstEnter /
    // burstCast / hitCount), each of which puts a team-wide casterAtkPct on the board.
    expect(totals(s2EmptyRes)).toEqual(totals(control));
  });

  it('non-vacuity: the same ATK grant keyed passive DOES move the board', () => {
    const sum = (t: Record<string, number>): number =>
      Object.values(t).reduce((a, b) => a + b, 0);
    expect(sum(totals(s2PassiveRes))).toBeGreaterThan(sum(totals(control)));
    // ...and it reaches teammates, not just sora (target: all allies).
    expect(totals(s2PassiveRes)['crown']).toBeGreaterThan(totals(control)['crown']);
  });

  it('the ATK grant is caster-scaled (of the skill user\u2019s ATK), never target-scaled', () => {
    const buffs = effectsOf(ovSkill2).filter((e) => e.kind === 'buff');
    // Nearest-wrong: atkPct 23.74 (scales each ally\u2019s OWN ATK) instead of casterAtkPct
    // (a flat add of 23.74% of sora\u2019s ATK). Different magnitude on every teammate.
    expect(buffs.filter((e) => e.stat === 'atkPct' && near(e.value, S2_ATK_PCT))).toHaveLength(0);
    const casterScaled = buffs.filter((e) => e.stat === 'casterAtkPct');
    for (const b of casterScaled) {
      expect(near(b.value, S2_ATK_PCT)).toBe(true);
      expect(b.durationSec).toBe(S2_DURATION_SEC);
      expect(b.durationShots).toBeUndefined();
    }
  });

  it('the healing Storage (5.36% Max HP, 5 stacks) is not encoded as a Max HP grant', () => {
    // It is a heal-overflow reservoir, not a Max HP buff; v1 has no HP pool, so it is
    // unmodellable. Nearest-wrong: casterMaxHpPct/targetMaxHpPct 5.36 (a real, permanent
    // stat grant that can feed an atkOfMaxHpPct consumer).
    const buffs = [...effectsOf(ovSkill1), ...effectsOf(ovSkill2), ...effectsOf(ovBurst)].filter(
      (e) => e.kind === 'buff',
    );
    expect(buffs.filter((e) => near(e.value, STORAGE_MAXHP_PCT))).toHaveLength(0);
  });

  it('sora puts no damage-relevant stat buff on the board in the control fight', () => {
    expect(typeof soraIdx).toBe('number');
    const damaging = soraBuffs.filter((e) => DAMAGE_STATS.has(e.stat ?? ''));
    expect(damaging.map((e) => `${e.stat}=${e.value}`)).toEqual([]);
    expect(soraBuffs.filter((e) => near(e.value, S1_HEAL_PCT))).toHaveLength(0);
  });
});

// ------------------------------------------------------------------ burst

describe('sora burst - heal all allies 52.27% of caster final Max HP, cleanse 1', () => {
  it('is a heal to all allies on her own burst cast', () => {
    const healBlocks = ovBurst.filter((b) =>
      ((b.effects ?? []) as AnyBlock[]).some((e) => e.kind === 'heal'),
    );
    expect(healBlocks.length).toBeGreaterThan(0);
    for (const b of healBlocks) {
      // Trigger identity: her own burst cast, not full-burst entry (she is Burst I - keying
      // to fullBurstEnter would fire on any team FB, including rotations she sat out).
      expect(b.trigger?.kind).toBe('burstCast');
      // Target set: 'Affects all allies' includes self.
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf).toBeFalsy();
    }
  });

  it('deals no damage of its own', () => {
    const dmg = effectsOf(ovBurst).filter((e) =>
      ['flatDamage', 'dot', 'hitRepeat', 'storedHit', 'weaponSwap'].includes(e.kind),
    );
    expect(dmg.map((e) => e.kind)).toEqual([]);
  });

  it('the 52.27% is a heal, not a Max HP grant', () => {
    // Nearest-wrong: casterMaxHpPct 52.27 on allies. That emits a permanent maxHpFlat buff
    // (feeding HP-scaling ATK consumers) and fires NO recovery trigger - the opposite of a heal.
    const buffs = effectsOf(ovBurst).filter((e) => e.kind === 'buff');
    expect(
      buffs.filter(
        (e) =>
          ['casterMaxHpPct', 'targetMaxHpPct', 'maxHpPct'].includes(e.stat ?? '') &&
          near(e.value, BURST_HEAL_MAXHP_PCT),
      ),
    ).toHaveLength(0);
  });

  it('fixture non-vacuity: sora actually casts her Burst I in the helm-free control comp', () => {
    // A tracer hit on her burstCast. RED here means the fixture cannot exercise her burst
    // (she is a Burst I sharing stage 1 with liter) - a FIXTURE finding, not a kit divergence.
    expect(soraCastsBurst).toBe(true);
  });

  it.runIf(soraCastsBurst)(
    'the burst heal actually reaches teammates (recovery sensor on crown)',
    () => {
      // Sensor = an atkPct buff on a {kind:'recovery'} trigger, self-targeted on crown. In the
      // helm-free comp sora is the only healer, so crown\u2019s damage rises only if sora\u2019s burst
      // emits a real recovery event to allies. RED if the heal is missing, self-only, or
      // encoded as a stat buff instead of a heal.
      expect(totals(sensorHealOn)['crown']).toBeGreaterThan(totals(sensorHealOff)['crown']);
    },
  );

  it.skip('removes 1 debuff - GAP: the sim models no ally debuffs, so the cleanse has no observable payload', () => {
    // Recorded so the line is not silently dropped.
  });
});

```

## 6. S6 blind override (claude-opus-5) + diff vs the DRIVER override

DIFF (driver vs blind):
- skill1: IDENTICAL ([]).
- burst: IDENTICAL semantics — burstCast → allies → heal (blind writes explicit ticks:1 = engine default).
- skill2: THE ONE DIVERGENCE. Driver: [] with all three skill2 lines VERBATIM in unmodeled
  (repo precedent: diesel-winter-sweets / ark-ranger-black / cocoa all treat part-gated lines so).
  Blind: one block with trigger {kind:'unsupported', raw:"Activates when an ally or self destroys
  an enemy's part"} → allies → casterAtkPct 23.74/15s. BEHAVIORALLY IDENTICAL (an `unsupported`
  trigger never fires in sim.ts — grep confirms zero engine handling — and the scope boss is
  partless), but the driver form is the repo convention and is what the driver's structural test
  pins; the blind model's own flag text agrees the line is INERT at scope and that any firing
  trigger would fabricate uptime. Ruling: blind-side style divergence, not a faithfulness issue.
- unmodeled: driver carries skill1 full line (1 entry), skill2 (3 entries: trigger header /
  storage / ATK line), burst "Removes 1 debuff(s)."; blind carries the same lines (its split is
  equivalent; both are verbatim prose).
- S6 flags field agrees with driver residuals: part-destruction trigger absent, boss partless,
  line inert at scope, no substitute trigger acceptable.

```json
{
  "slug": "sora",
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "unsupported",
        "raw": "Activates when an ally or self destroys an enemy's part"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 23.74,
          "durationSec": 15
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
          "ticks": 1
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Outgoing healing \u25b2 35.2% continuously."
    ],
    "skill2": [
      "Storage: Stores excess healing received by the skill user, up to 5.36% of their Max HP. Stacks up to 5 time(s) and lasts for 15 sec."
    ],
    "burst": [
      "Removes 1 debuff(s)."
    ]
  },
  "caveats": [
    "\u26d1 skill2's ATK \u25b2 23.74% (casterAtkPct, all allies, 15s) is her ONLY damage-relevant line and its literal activation clause is 'an ally or self destroys an enemy's part'. The scope-lock boss is PARTLESS, so on the graded fight this trigger never fires and the buff is INERT \u2014 authored as an `unsupported` trigger rather than re-keyed to a firing trigger, because re-keying would fabricate uptime the kit does not grant. If a real fight shows the buff live, re-key per the recipe in flags.",
    "\u26d1 skill1 Outgoing healing \u25b2 35.2% has no StatKey and no consumer (heals carry no HP amount in v1); it is a magnitude scaler on an unmodeled quantity, so it is unmodeled rather than inert-but-present.",
    "\u26d1 The burst heal amount (52.27% of caster final Max HP) is recorded in prose only \u2014 the `heal` effect models the RECOVERY EVENT, not an HP amount, which is what teammates' `recovery` triggers consume. Tandem value is entirely via those consumers.",
    "\u26d1 Burst trigger keyed `burstCast` (this is her OWN burst block, Burst I, cd 40s) \u2014 the heal lands at cast, pre-Full-Burst, per the burst-cast timing rule."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u26d1 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Sora (RL/Wind/Supporter/Burst I) is a HEAL-SIDE support: S1 scales her own outgoing healing, S2 converts a part-destruction event into a team ATK \u25b2 23.74% of her ATK for 15s plus an excess-healing storage pool, and her burst is a full-team heal + 1 debuff cleanse. Modeled today: the S2 team ATK grant (casterAtkPct, all allies, 15s) and the burst team heal as a recovery-event emitter that fires allies' `recovery` triggers. The S2 grant's kit trigger is part-destruction, which has no engine primitive and cannot fire on the partless scope-lock boss, so the block carries an `unsupported` trigger and is inert at scope \u2014 faithful to the kit rather than re-keyed to make it live. Deliberately unmodeled: outgoing-healing magnitude (no consumer for a heal amount), the excess-healing Storage pool (no HP pool), and debuff removal (no ally debuff pool)."
}
```

## 7. DRIVER IMPLEMENTATION under judgment

### src/skills/overrides/sora.json

```json
{
  "note": "Sora (slug sora) — RL / Supporter / Wind / Burst I, Elysion, cd 40s, ammo 6, chargeFrames 60, reloadFrames 141. FROM-SCRATCH kit-autonomy build 2026-08-04 (no prior override; baseline was bare weapon, simSupported false -> true). Sora is a pure healer/supporter: exactly ONE of her kit lines has any expression in a damage-dealt sim — the burst's team heal, and only as a RECOVERY EVENT (the engine models no HP amounts — sim.ts `case 'heal'` emits valueless recovery events — so the 52.27%-of-final-Max-HP magnitude is unrecordable; heal AMPLIFICATION is likewise unrecordable, and heal magnitude is irrelevant to on-recovery consumers, which fire off the EVENT). ENCODED: burst -> burstCast -> allies -> heal (ticks 1, instant): the kit's one load-bearing line — it feeds teammates' 'recovery'-triggered blocks (Crown/asuka-style consumers). Keyed burstCast, NOT fullBurstEnter: the heal lands on HER OWN cast (she is the Burst I opener); the cast precedes the Full Burst window (~82f in the probe fixture), and a fullBurstEnter keying would fire on team FBs she did not initiate in multi-B1 comps. skill1/skill2 are EMPTY BY CONSTRUCTION, not by omission — every line there is out-of-domain for cause: (K1) S1 'Outgoing healing ▲ 35.2%' modifies heal AMOUNTS, which do not exist in the sim — no stat, no channel, and no recovery-consumer reads an amount. (K2) S2 is gated on PART DESTRUCTION ('when an ally or self destroys an enemy's part'): the engine emits no part-destroyed event and the scope-lock boss is partless (sim.ts: 'partless test boss ... kept as a switch for part-ed boss support later'), so the trigger can never fire in scope — exactly as in game vs partless targets (diesel-winter-sweets / ark-ranger-black precedent). Its ATK line is casterAtkPct-shaped (23.74% of SORA's ATK) if ever modeled — NOT atkPct per target; materializing it on a substitute trigger is the nearest-wrong model the spec test discriminates. Its Storage line additionally needs an overheal pool v1 does not model. (K4) 'Removes 1 debuff(s)' — v1 models no ally debuffs (boss deals no damage, applies none), so there is nothing to remove (cocoa precedent). GAUGE: no data/gauge-per-shot.json row — accrual uses the RL modal fallback (sim.ts GAUGE_MODAL_BY_WEAPON, 280 energy/trigger x focus charge mult); no kit line modifies gauge. Kit-autonomy gauntlet 2026-08-04: cross-family S2b (claude-fable-5) converged 6/6 lines, no REAL-GOTCHA; the faithful override is one burstCast/allies/heal block plus a complete verbatim unmodeled record. Pinned in scripts/tests/units/sora.test.ts (fixture: sora B1 sole / folkwang-bare B2 / asuka B3 lifesteal-stripped — sora is the sole recovery source; asuka's self-targeted S1 consumer reads exactly one buffApply per landing). Structured residuals (estimate / recipe / tier): (R1) partDestroyed trigger primitive — UNMODELED K2 trigger/ATK/storage: estimate = Sora's entire in-game team contribution in PARTED fights (15s team ATK buff of 23.74% of her Supporter-tier ATK per part destroy — a few % of team damage across the windows) and exactly zero vs partless targets, so zero at scope today; recipe = a part-destroyed event in sim.ts + a parted scope-boss fixture, then encode S2 as partDestroyed -> allies -> casterAtkPct 23.74 / 15s (+ the storage block once R2 lands), popup footage of one parted fight to pin trigger count; Tier 2. (R2) overheal-storage resource — UNMODELED K2 Storage (5.36% Max HP per stack, 5 stacks, 15s): estimate = damage-neutral as worded (the prose names no consumption — stores only; survivability utility); recipe = HP-amount modeling + overheal detection + a per-caster storage pool (also unlocks K1's outgoing-healing amplifier, which only has something to scale once heal amounts exist); Tier 2. (R3) debuff cleanse — UNMODELED K4: estimate = zero (v1 allies are never debuffed); recipe = an ally-debuff model first (none planned while the boss deals no damage); Tier 2.",
  "unmodeled": {
    "skill1": [
      "■ Activates at the start of battle. Affects self.\nOutgoing healing ▲ 35.2% continuously."
    ],
    "skill2": [
      "■ Activates when an ally or self destroys an enemy's part. Affects all allies.",
      "Storage: Stores excess healing received by the skill user, up to 5.36% of their Max HP. Stacks up to 5 time(s) and lasts for 15 sec.",
      "ATK ▲ 23.74% of the skill user's ATK for 15 sec."
    ],
    "burst": [
      "Removes 1 debuff(s)."
    ]
  },
  "caveats": [
    "burst: the heal is event-only — the 52.27%-of-final-Max-HP magnitude is unrecordable in v1 (no HP amounts), and 'final Max HP' scaling has no carrier; the block's observable is the recovery events it emits to allies on her cast frame",
    "burst: keyed burstCast (her own Burst I cast), NOT fullBurstEnter — the cast precedes the Full Burst window and a FB-entry keying would misattribute team FBs another Burst I opened (multi-B1 generality)",
    "skill2: the part-destruction trigger has no engine primitive and the scope boss is partless, so the WHOLE slot is verbatim-unmodeled rather than proxied onto a reachable trigger — a substitute trigger would materialize a team ATK grant the kit never gives vs partless targets (spec-tested counterfactual)",
    "gauge: no gauge-per-shot.json row — RL modal fallback (280 energy/trigger x focus charge mult); her 40s-cd cast cadence in fixtures is gauge/CD-limited by that estimate, which rescales nothing kit-side (no kit line keys off her shots)"
  ],
  "skill1": [],
  "skill2": [],
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
          "kind": "heal"
        }
      ]
    }
  ]
}

```

### scripts/tests/units/sora.test.ts (driver spec suite — 12/12 GREEN vs the driver override)

```typescript
// PER-UNIT KIT SPEC — `sora` (Sora, RL/Supporter/Wind/Burst I, Elysion, cd 40s, ammo 6,
// chargeFrames 60, reloadFrames 141). Kit-autonomy gauntlet 2026-08-04. BASE unit (no variant).
// FROM-SCRATCH build: no prior override, simSupported false -> true.
//
// Sora is a pure healer/supporter — exactly ONE of her kit lines has any expression in a
// damage-dealt sim: the burst's team heal, and only as a RECOVERY EVENT (the engine models no
// HP amounts — sim.ts `case 'heal'` — so the 52.27%-of-final-Max-HP magnitude is unrecordable;
// the heal's observable is the on-recovery consumers it feeds). Everything else is
// out-of-domain, documented verbatim in `unmodeled`:
//
// Kit (data/characters.json → characters.sora.skills, SL10):
//   S1 ■ start of battle → self: Outgoing healing ▲35.2% continuously                  [K1 gap]
//   S2 ■ when an ally or self destroys an enemy's part → all allies:
//        Storage: stores excess healing received, ≤5.36% Max HP per stack, ≤5 stacks,
//        lasts 15 sec                                                                   [K2 gap]
//        ATK ▲23.74% of the skill user's ATK for 15 sec                                 [K2 gap]
//   BU ■ all allies: Recovers 52.27% of the skill user's final Max HP as HP            [K3 ✓]
//      ■ all allies: Removes 1 debuff(s)                                               [K4 gap]
//
// WHY EACH UNMODELED LINE IS UNMODELED (each has a nearest-wrong encoding the assertions must
// discriminate against):
//   K1  heal AMOUNTS do not exist in the sim (heal = valueless recovery event), so an
//       "outgoing healing ▲" multiplier has nothing to scale — no stat, no channel. Nearest
//       wrong: inflating her burst-heal magnitude by ×1.352 — impossible to express AND a
//       fudge (the engine carries no heal number anywhere).
//   K2  the S2 trigger is PART DESTRUCTION: the v1 boss is partless (sim.ts: "partless test
//       boss … kept as a switch for part-ed boss support later") and the engine emits no
//       part-destroyed event, so the line can never fire in scope — exactly as in game, where
//       part-gated kits do nothing vs partless targets. diesel-winter-sweets / ark-ranger-black
//       precedent: verbatim unmodeled + ⚑ recipe, NOT a proxy trigger. Nearest wrong:
//       MATERIALIZING the ATK line as a passive/permanent casterAtkPct 23.74 team buff — a
//       +ATK the kit never grants vs a partless boss. The overheal-storage line additionally
//       needs an HP/overheal pool that v1 does not model.
//   K4  debuff cleanse — the sim has no ally-debuff model (v1 boss deals no damage, applies no
//       debuffs; cocoa precedent), so there is nothing to remove; no primitive exists.
//
// WHY THE K3 ASSERTIONS DISCRIMINATE (the line is offensively inert, so TOTALS alone cannot
// discriminate — the evidence is the EVENT LOG read through a consumer):
//   K3a the burst heal fires a recovery landing on asuka's S1 consumer ("when recovery takes
//       effect" → self atkPct 96.98/25s) at EVERY sora burst cast, on the CAST frame — an
//       instant (ticks-1) heal. A heal-removed counterfactual zeros the consumer (the block is
//       live, not vacuous); a SELF-only target counterfactual also zeros it (asuka never
//       receives it — the kit says "Affects all allies"); a fullBurstEnter counterfactual moves
//       every landing from the cast frame to the FB-start frame (+82f, after the chain
//       completes — the cast precedes the window, helm H7 fact); a HoT/ticks>1 mis-encoding
//       would add landings BEYOND one per cast (count equality catches it).
//   K3b self-damage-neutrality: sora's own total is byte-identical with her kit zeroed
//       (bare weapon) — a healer's kit contributes nothing to her OWN damage. snow-crane M1 /
//       marciana CW1 shape. And the heal is live: it MOVES the consumer's total (asuka's
//       recovery self-buff lifts her own damage ~1.8×) — the inertness is hers alone.
//   K3c absence pin (anti-fabrication for K1/K2/K4): sora originates ZERO buffApply events —
//       every buff-granting line of her kit is unmodeled for cause. The counterfactual
//       materializing S2's ATK line as a passive casterAtkPct 23.74 team buff emits buffs and
//       moves team totals — the shipped absence is a real, falsifiable claim.
//   K3d structure + documentation: skill1/skill2 are EMPTY by construction (not by omission);
//       the burst is exactly one burstCast/allies/heal block; every unmodeled entry is VERBATIM
//       prose from characters.json (checked dynamically — never an `ignored` drop).
//
// FIXTURE. sora (B1, the SOLE Burst I) / folkwang (B2, forced BARE — her shipped override
// carries shields/heals that would contaminate the recovery channel) / asuka (B3, burst
// lifesteal patched OUT so sora is the SOLE recovery source). Boss Iron (Wind/Iron ×1.10 clean
// edge for sora, volume precedent), focus sora (×2.5 charge-weapon gauge → she is CD-limited:
// 5 casts over 180s, exactly every 40s; the chain holds ~30f per stage so FB-start lands +82f
// after her cast — probed, deterministic, no seed). asuka's S1 is a SELF-targeted consumer —
// exactly one buffApply per recovery landing on her (no per-holder multiplicity).
// Slot order: sora 0 / folkwang 1 / asuka 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  data,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUGS = ['sora', 'folkwang', 'asuka'];
/** Slot order: sora 0 / folkwang 1 / asuka 2. */
const SORA = 0;
const ASUKA = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

/** asuka's burst lifesteal removed → sora is the only recovery source in the fight. */
const asukaSoleConsumer = withPatchedOverride('asuka', (ov) => {
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length === before) {
      throw new Error('asuka burst heal missing — fixture is stale');
    }
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Iron',
    focusSlug: 'sora',
    overrides: {
      folkwang: bareWeaponOverride('folkwang'), // bare basis cell — no shields/heals
      asuka: asukaSoleConsumer,
      ...overrides,
    },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- counterfactuals (nearest-wrong encodings) ------------------------------------------------
/** K3a counterfactual: the heal removed entirely (a vacuous burst). Guard throws only once
 *  burst blocks exist (post-S3) but none carries the heal — during the RED phase the skeleton
 *  burst is empty and the strip is a documented no-op (the paired base>0 assertion still REDs). */
const soraNoHeal = withPatchedOverride('sora', (ov) => {
  const before = (ov.burst ?? []).flatMap((b: any) => b.effects).length;
  ov.burst = (ov.burst ?? []).map((b: any) => ({
    ...b,
    effects: b.effects.filter((e: any) => e.kind !== 'heal'),
  }));
  const after = (ov.burst ?? []).flatMap((b: any) => b.effects).length;
  if (before > 0 && after !== before - 1) {
    throw new Error('sora burst heal missing — fixture is stale');
  }
});
/** K3a counterfactual: the heal keyed to Full Burst entry instead of her own burst cast. */
const soraHealOnFbe = withPatchedOverride('sora', (ov) => {
  for (const b of ov.burst ?? []) {
    if (b.trigger?.kind === 'burstCast') {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});
/** K3a counterfactual: the heal scoped to SELF instead of all allies. */
const soraHealSelfOnly = withPatchedOverride('sora', (ov) => {
  for (const b of ov.burst ?? []) {
    if (b.effects.some((e: any) => e.kind === 'heal')) {
      b.target = { kind: 'self' };
    }
  }
});
/** K3c counterfactual: S2's part-gated ATK line MATERIALIZED as a passive team buff — the
 *  naive-parser misread (a +ATK the kit never grants vs a partless boss). */
const soraMaterializedAtk = withPatchedOverride('sora', (ov) => {
  if (ov.skill2?.length) {
    throw new Error('sora skill2 must be empty — fixture is stale');
  }
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [
        { kind: 'buff', stat: 'casterAtkPct', value: 23.74, durationSec: 15 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const bare = run({ sora: bareWeaponOverride('sora') });
const noHeal = run({ sora: soraNoHeal });
const fbeHeal = run({ sora: soraHealOnFbe });
const selfHeal = run({ sora: soraHealSelfOnly });
const materialized = run({ sora: soraMaterializedAtk });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const soraCasts = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'sora')
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbStarts = (evs: SimEvent[]) =>
  evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** asuka's S1 consumer landings — exactly one buffApply per recovery landing on her. */
const recoveryLandings = (evs: SimEvent[]) =>
  buffs(evs)
    .filter(
      (b) =>
        b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);
const soraOriginatedBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === SORA);

describe('sora — kit spec', () => {
  describe('K3 — the burst heals all allies (modeled as a recovery event)', () => {
    it('fixture sanity: sora casts her Burst I ≥4 times and every chain completes', () => {
      const casts = soraCasts(base.events);
      expect(casts.length).toBeGreaterThanOrEqual(4);
      expect(fbStarts(base.events).length).toBe(casts.length);
    });

    it('fires exactly one recovery landing on asuka per sora cast, on the CAST frame', () => {
      const casts = soraCasts(base.events);
      const landings = recoveryLandings(base.events);
      expect(landings.length).toBe(casts.length);
      expect(landings).toEqual(casts);
    });

    it('is live, not vacuous: removing the heal zeros the consumer', () => {
      expect(recoveryLandings(base.events).length).toBeGreaterThan(0);
      expect(recoveryLandings(noHeal.events)).toEqual([]);
    });

    it('targets ALL allies: a self-only heal never reaches asuka', () => {
      expect(recoveryLandings(selfHeal.events)).toEqual([]);
    });

    it('is keyed to burstCast, not fullBurstEnter (the cast precedes the FB window)', () => {
      const casts = soraCasts(base.events);
      const fbeLandings = recoveryLandings(fbeHeal.events);
      expect(fbeLandings.length).toBe(casts.length);
      expect(fbeLandings).not.toEqual(casts);
      expect(fbeLandings).toEqual(fbStarts(fbeHeal.events));
    });
  });

  describe('K3b — the kit is self-damage-neutral AND live on the consumer', () => {
    it("sora's own total is byte-identical with her kit zeroed (bare weapon)", () => {
      expect(base.totals.sora).toEqual(bare.totals.sora);
    });

    it("the heal MOVES the consumer's total (asuka's recovery self-buff)", () => {
      expect(base.totals.asuka).toBeGreaterThan(noHeal.totals.asuka);
    });
  });

  describe('K1/K2/K4 — absence pin: every buff line is unmodeled for cause', () => {
    it('sora originates ZERO buffApply events in the base fight', () => {
      expect(soraOriginatedBuffs(base.events)).toEqual([]);
    });

    it('DISCRIMINATING: materializing S2 ATK as a passive emits buffs and moves totals', () => {
      expect(soraOriginatedBuffs(materialized.events).length).toBeGreaterThan(
        0
      );
      expect(materialized.totals.asuka).not.toEqual(base.totals.asuka);
      expect(materialized.totals.folkwang).not.toEqual(base.totals.folkwang);
    });
  });

  describe('K3d — structure + verbatim documentation', () => {
    const ov = loadOverride('sora')!;
    const prose = data.characters.sora.skills;

    it('skill1/skill2 are empty by construction; burst is one heal block', () => {
      expect(ov.skill1).toEqual([]);
      expect(ov.skill2).toEqual([]);
      expect(ov.burst).toHaveLength(1);
      const b: any = ov.burst[0];
      expect(b.trigger).toEqual({ kind: 'burstCast' });
      expect(b.target).toEqual({ kind: 'allies' });
      expect(b.effects).toEqual([{ kind: 'heal' }]);
    });

    it('every unmodeled entry is VERBATIM prose of its own slot', () => {
      const un = (ov as any).unmodeled as Record<string, string[]>;
      expect(un.skill1.length).toBeGreaterThanOrEqual(1);
      expect(un.skill2.length).toBeGreaterThanOrEqual(1);
      expect(un.burst.length).toBeGreaterThanOrEqual(1);
      for (const line of un.skill1) {
        expect(prose.skill1).toContain(line);
      }
      for (const line of un.skill2) {
        expect(prose.skill2).toContain(line);
      }
      for (const line of un.burst) {
        expect(prose.burst).toContain(line);
      }
    });

    it('no `ignored` block anywhere; no heal magnitude fabricated in the ENCODING', () => {
      expect(JSON.stringify(ov)).not.toContain('"ignored"');
      // the 52.27% magnitude is unrecordable (heal = event-only) — it must not appear as an
      // encoded value on any block (the note/caveats may CITE it as documentation).
      const blocks = JSON.stringify([ov.skill1, ov.skill2, ov.burst]);
      expect(blocks).not.toContain('52.27');
      expect(blocks).not.toContain('"value"');
    });
  });
});

```

### Driver's run evidence

- RED phase (skeleton override, pre-S3): 6 failed / 6 passed — exactly the K3 modeled-line
  assertions RED, absence pins green (reviews/sora.verify.txt).
- GREEN phase (final override): 12/12 passed (reviews/sora.verify.txt, post-S3 section).
- validate-overrides: `✓ sora: valid | dmg 34.2M (8.6%) bursts 5`.
- Fixture probe facts (deterministic, no seed): sora casts at frames 508/2908/5308/7708/10108
  (CD-limited, every 40s; focus-sora RL gauge); fullBurstStart +82f after each cast; recovery
  landings on asuka's self-consumer exactly at cast frames; sora's own total 35,668,354.89
  byte-identical across shipped/bare/heal-removed/FBE/self-only variants (self-damage-neutral);
  zero sora-originated buffApply in every variant.

## JUDGE: return the binding verdict JSON per your contract (verdict / faithfulnessScore / gotchas /
discriminationOk / notes). All lines accounted: K1 heal-out UNMODELED, K2 part-gated lines
UNMODELED (trigger absent at scope), K3 burst heal MODELED (burstCast/allies/heal), K4 cleanse
UNMODELED. Residuals R1-R3 in the override note each carry estimate/recipe/tier (Tier 2).
