# S7 RECONCILING-JUDGE PACKET — `anis` (Anis, base) — kit-autonomy gauntlet 2026-08-04

You are the RECONCILING JUDGE for one unit. Read the contract below, then the evidence sections IN ORDER, and return the binding verdict JSON described by the contract.

---

## SECTION 1 — JUDGE CONTRACT (RECONCILING-JUDGE.md)

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

---

## SECTION 2 — MECHANICS SSOT (damage formula + game mechanics)

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

---

## SECTION 3 — GROUND TRUTH: the unit kit prose + datamined fields (data/characters.json → characters.anis)

EXACT SLUG: `anis` = BASE Anis (RL/Iron Defender, Burst II). Variants `anis-star` (RL/Electric Burst I) and `anis-sparkling-summer` (SG/Electric B3) are DIFFERENT units.

```json
{
  "slug": "anis",
  "name": "Anis",
  "weapon": "RL",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Defender",
  "element": "Iron",
  "manufacturer": "Tetra",
  "ammo": 6,
  "reloadFrames": 142,
  "chargeFrames": 60,
  "normalAttackMultiplier": 65.02,
  "coreAttackMultiplier": 200,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "burstGaugePerShot": 3.55,
  "skills": {
    "skill1": "■ Activates when attacked 40 time(s). Affects self.\nDEF ▲ 120% for 10 sec.",
    "skill2": "■ Affects self and 2 allies with the highest final ATK (except the skill user). \nDEF ▲ 80% for 5 sec. \nEqually shares damage taken for 10 sec.",
    "burst": "■ Affects enemies within attack range.\nDeals 156.73% of final ATK as damage.\nDEF ▼ 32% for 5 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": 30,
    "burst": 20
  },
  "baseStats": {
    "hp": 12650,
    "atk": 360,
    "def": 97,
    "core": {
      "hp": 200,
      "atk": 200,
      "def": 200
    },
    "grade": {
      "hp": 2300,
      "atk": 18,
      "def": 90,
      "ratio": 200
    },
    "critRate": 15,
    "maxLevel": 1200,
    "critDamage": 150,
    "resourceId": 12
  }
}
```

KEY GROUND-TRUTH FACTS for adjudication:
- skillCooldownsSec.skill2 = 30 (datamined skill-2 cooldown; the kit PROSE carries no number for the S2 cadence).
- burstCooldownSec = 20 (burst cooldown — a DIFFERENT field from skillCooldownsSec.skill2).
- The sim basis: immortal partless boss (boss DEF fixed constant 140, subtracted per hit), 180s, no incoming damage modeled, no HP pool.

---

## SECTION 4 — S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind)

{
  "slug": "anis",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ Activates when attacked 40 time(s)",
      "disposition": "UNMODELED",
      "scope": "Generic self stat (DEF ▲ 120%), not damage-scoped; self DEF is offensively inert (defPct is inert in v1).",
      "durationSemantics": "10 sec wall-clock — genuine seconds, no 'round(s)' wording anywhere in this kit.",
      "triggerIdentity": "Incoming-hit counter: the unit being ATTACKED 40 times. No TriggerDef kind exists for received hits, and the v1 scope models no incoming boss damage at all — the trigger is unrepresentable, not merely unmeasured.",
      "targetSet": "Self only.",
      "nearestWrongModel": "Misreading 'attacked 40 time(s)' as the unit's OWN attacks — a hitCount:40 trigger (which counts rounds SHE fires) applying defPct 120 on her own shot cadence; or an unflagged interval approximation of boss attack cadence.",
      "distinguishingAssertion": "The event log contains NO buffApply with stat 'defPct' value 120 keyed to anis's own shot/hit count at any point in the fight; totals(res) for all four units are bit-identical with the skill1 line present vs stripped via withPatchedOverride.",
      "inertness": "Must move zero damage for every unit in the comp under any encoding (self DEF feeds nothing).",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "DEF ▲ 80% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic stat buff (defPct) — damage-inert today, but taxonomy rule 4/7 says DEF/HP grant lines are kept as real buffs, never silently dropped (future consumer/scaler).",
      "durationSemantics": "5 sec wall-clock.",
      "triggerIdentity": "The ■ header has NO 'Activates when' clause → interval trigger at the unit's datamined skill cooldown per the no-activation-clause convention; first fire at t=CD (no 'Forcefully uses' wording). The interval seconds are NOT in this packet — ALWAYS-⚑ cadence.",
      "targetSet": "Self AND alliesTopAtk{count:2, excludeSelf:true, byFinalAtk:true}. 'highest final ATK' is literal → byFinalAtk (live effectiveAtk ranking) is REQUIRED; 'except the skill user' → exclude-then-take-2 from the candidate pool; 'self and' adds anis on top of the two.",
      "nearestWrongModel": "Omitting byFinalAtk (static-ATK ranking — plain-'highest ATK' kits keep static, so a driver pattern-matching on that prior drops the flag), or dropping the self application, or failing to exclude anis from the top-2 pool.",
      "distinguishingAssertion": "Each firing emits buffApply events with stat 'defPct' value 80 to exactly 3 target indices: anis plus the 2 allies with highest LIVE effectiveAtk at apply time. Green under byFinalAtk, red under static ranking on any apply frame where a caster-ATK buff (e.g. the B1's) has reordered live ATK relative to static class ATK (Attacker 118,027 > Supporter 98,367 > Defender 78,707).",
      "inertness": "Damage totals must NOT change whether this block is present or absent (defPct inert) — the assertion is buffApply presence/targeting, never a damage delta.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Equally shares damage taken for 10 sec",
      "disposition": "UNMODELED",
      "scope": "Defensive damage-redistribution among the 3 targets; no incoming-damage/HP-pool model exists at scope (immortal boss, nobody takes damage).",
      "durationSemantics": "10 sec wall-clock (note: a DIFFERENT duration from the 5 sec DEF line in the same block — one block cannot carry both durations on one effect).",
      "triggerIdentity": "Same interval trigger as the DEF line (no activation clause).",
      "targetSet": "Same self + 2 highest-final-ATK allies.",
      "nearestWrongModel": "Pattern-matching 'damage taken' onto the damageTakenPct StatKey — which in this engine is a BOSS debuff (positive = boss takes MORE) — thereby converting a defensive share into a spurious team-wide damage BUFF.",
      "distinguishingAssertion": "The event log contains NO buffApply with stat 'damageTakenPct' sourced from anis's skill2 (filter by stat+value 10 or any value with casterIdx = anis's slot); team damage totals identical with the line present vs stripped.",
      "inertness": "Zero damage movement for all units; the line lives verbatim in the override's unmodeled.skill2.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Deals 156.73% of final ATK as damage",
      "disposition": "FAITHFUL",
      "scope": "One instant function-damage hit, burst bucket. Riders default: no core, crit only if opted in (kit says nothing → default off), noRange forced on riders, and burst-cast damage is ALWAYS FB-exempt — it lands before the Full Burst window opens, so no +50% major and no FB-entry auras.",
      "durationSemantics": "Instant, no duration.",
      "triggerIdentity": "burstCast — fires ONLY on rotations anis herself casts her Burst II. NOT fullBurstEnter. This is the packet's sharpest divergence: the control fixture carries a second Burst II unit (crown), and first-ready in-window selection means anis does NOT cast on every rotation.",
      "targetSet": "Enemy ('enemies within attack range' = the single partless boss → exactly one damage instance per cast; no per-enemy multiplication).",
      "nearestWrongModel": "Keying to fullBurstEnter — the hit then fires on EVERY team Full Burst including rotations where crown takes the B2 slot, over-crediting by the ratio of total FBs to anis-cast FBs; secondary misread: letting the hit take the +50% Full Burst major (inFullBurst/fbMajorApplied true).",
      "distinguishingAssertion": "count(damage events, srcSlot 'burst', caster anis, mult 156.73) === count(burstCast events with caster anis), and is STRICTLY LESS THAN count(fullBurstStart events) whenever crown wins at least one B2 selection; every such damage event has inFullBurst === false, fbMajorApplied === false, rangeApplied === false.",
      "inertness": "Zero burst-bucket damage from anis in any rotation where she never casts; the hit's own multiplier decomposition takes no core and no range bonus.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "DEF ▼ 32% for 5 sec",
      "disposition": "GAP",
      "scope": "A stat debuff on the BOSS — this is the kit's ONLY team-damage-relevant line. The damage formula subtracts boss DEF, so −32% boss DEF raises EVERY attacker's per-hit damage during the window. It is emphatically NOT 'defensive/inert' like the kit's self/ally DEF ▲ lines.",
      "durationSemantics": "5 sec wall-clock from cast landing.",
      "triggerIdentity": "burstCast (rides her own burst; same burstCast-not-fullBurstEnter identity as the damage line).",
      "targetSet": "Enemy (boss). Boss-held debuffs emit buffApply with casterIdx===null and targetIdx===null — filterable only by stat+value.",
      "nearestWrongModel": "Two live traps: (a) skipping it as 'defensive' by prior-matching on DEF-line inertness — silently deleting the kit's one team buff; (b) fudging it as damageTakenPct 32 — a flat ×-multiplier is NOT DEF-shred arithmetic (the true per-hit gain is 0.32·DEF/(finalATK−DEF), different for every attacker's ATK), so the fold mis-credits unless boss DEF happens to satisfy the equivalence.",
      "distinguishingAssertion": "Today (no boss-DEF primitive in the effect schema — StatKey has no bossDef entry and damageTakenPct is a multiplier bucket): the override must carry this line verbatim in unmodeled.burst, AND the event log must contain NO buffApply with stat 'damageTakenPct' or 'defPct' attributable to anis's burst (green = documented gap; red = silent drop OR silent damageTakenPct fudge). If a boss-DEF primitive lands later: per-hit damage of ALL units inside [cast, cast+5s] rises vs a stripped-line control, and the rise is ATK-dependent, not a uniform ×1.32.",
      "inertness": "Under the current schema it must move nothing; once modeled, only hits landing inside the 5-second post-cast windows move, and only on rotations anis actually cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill2:DEF ▲ 80% → self + 2 highest-FINAL-ATK allies (buffApply presence/targeting, damage-inert)",
    "burst:Deals 156.73% of final ATK (burstCast-keyed, FB-exempt, no-range, no-core)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "■ Activates when attacked 40 time(s). Affects self.",
      "DEF ▲ 120% for 10 sec."
    ],
    "skill2": [
      "Equally shares damage taken for 10 sec."
    ],
    "burst": [
      "DEF ▼ 32% for 5 sec."
    ]
  },
  "notes": "Where I expect a shared-prior misread, ranked: (1) burst 'DEF ▼ 32%' — the reflex that DEF lines are defensive/inert is TRUE for the kit's self/ally DEF ▲ lines and FALSE here; an enemy DEF shred is a team-wide offensive debuff (formula subtracts boss DEF). The schema has no boss-DEF primitive (GAP, not MISSING), so the correct ship is verbatim-unmodeled + no silent damageTakenPct fudge; if a conversion is attempted anyway it is per-attacker-ATK-dependent and must be ⚑ CALIBRATED with the boss-DEF value cited. (2) burstCast vs fullBurstEnter on both burst lines — the control fixture's crown is a co-Burst-II, so first-ready selection makes the two keyings numerically diverge in the standard comp; assert damage-event count === anis burstCast count, not FB count. (3) skill1 'when attacked' misread as own-attack hitCount (which counts rounds SHE fires) — the faithful reading is unrepresentable (no incoming-damage model), so the whole skill1 belongs in unmodeled, asserted inert. (4) skill2 'Equally shares damage taken' misencoded via the damageTakenPct StatKey, which is a BOSS debuff here — that fudge would spuriously BUFF team damage. (5) skill2 target needs all three of: byFinalAtk:true (kit literally says 'final ATK'), excludeSelf:true on the pool, plus a self application ('self and 2 allies'). ⚑ open: skill2's interval cadence (datamined skill CD) is not in this packet — cadence tuple is an ALWAYS-⚑ field; first-fire t=CD per the no-activation-clause convention. Duration semantics carry no traps in this kit (all three durations are genuine seconds; note skill2's two effects carry DIFFERENT durations, 5s and 10s, so they cannot share one effect entry).",
  "model": "claude-fable-5"
}

---

## SECTION 5 — S5 BLIND TEST (claude-opus-5, blind, prose-only) + result vs the DRIVER override

RESULT vs driver override: GREEN. The pristine artifact below is written for scripts/tests/units/ ; to RUN it vs the driver override a structural-only ADAPTED copy was made (scripts/kit-autonomy/blind/anis.adapted.test.ts, ADAPTED-COPY banner documents each fix: harness import path; onEvent under cfg; FIXTURE FIX — the pristine controlComp seats crown, a co-Burst-II that starves anis to 0 casts (the pre-registered B2 trap; the pristine file s own sanity check anticipates it), swapped to the sole-B2 comp liter/anis/helm/ada; damage events keyed by slug not numeric srcSlot; tally pair crown→ada comp membership; durationShots null vs undefined event shape). Adapted run: **14 passed, 3 skipped (the blind test s own honest it.skip GAPs: enemy-DEF-down primitive, attacked-cluster, damage-share — all three map to lines the driver documents UNMODELED), 0 failed.**

/**
 * anis (Anis) — RL / Iron / Defender / Burst II — kit spec test.
 *
 * Written BLIND from the kit prose alone (no sight of the shipped override, no sight of any
 * other author's tests). Structural summary of the kit:
 *
 *   skill1  trigger "when attacked 40 time(s)", self:      DEF ▲120% for 10 sec
 *   skill2  self + 2 allies with the highest FINAL ATK (except the skill user):
 *                                                          DEF ▲80% for 5 sec
 *                                                          + "Equally shares damage" 10 sec
 *   burst   enemies within attack range:                    156.73% of final ATK as damage
 *                                                          + DEF ▼32% for 5 sec
 *
 * WHAT THIS UNIT CAN MOVE IN v1
 * -----------------------------
 * Every DEF ▲ line is offensively inert (`defPct` is documented inert in types.ts — self DEF
 * does not affect own damage) and the damage-share line has no HP pool at scope lock (the
 * boss deals no damage). The ONE damage-bearing line in the whole kit is the burst's 156.73%
 * hit. That makes the interesting assertions here mostly NEGATIVE — what this kit must NOT
 * move — plus an exact pin on the single hit that it does.
 *
 * The enemy DEF ▼32% has NO primitive: StatKey carries no enemy-DEF-down key, and boss DEF is
 * a SUBTRACTIVE term in the formula. The nearest-wrong model folds it into `damageTakenPct`,
 * which is a different (multiplicative Damage-Taken bucket) mechanic and would lift the whole
 * team's damage. That fold is pinned out below.
 *
 * FIXTURE
 * -------
 * controlComp('anis', true) → liter (B1) / crown (B2) / anis (carry slot) / helm (B3).
 * anis is Burst II and crown is also Burst II, so crown CONTESTS her burst slot every
 * rotation. Every burst assertion is therefore guarded by an explicit non-vacuity check
 * ("fixture sanity"): if anis never casts, this file fails loudly instead of passing
 * vacuously. Deterministic (no seed).
 *
 * SLOT-SHAPE NOTE
 * ---------------
 * The harness docs describe the OverrideFile two ways — slot → Block[] and slot →
 * { blocks: Block[] }. The accessors below handle BOTH so a doc ambiguity cannot masquerade
 * as a kit failure.
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

type Rec = Record<string, unknown>;
type Ev = Rec & { kind: string };
type Opts = ReturnType<typeof controlComp>;
type Overrides = Opts['overrides'];
type SlotName = 'skill1' | 'skill2' | 'burst';

const SLUG = 'anis';
const BURST_ATK_PCT = 156.73;

// --- override accessors (tolerate both documented file shapes) ---------------
function slotBlocks(ov: Rec, slot: SlotName): Rec[] {
  const cur = ov[slot];
  if (Array.isArray(cur)) return cur as Rec[];
  const nested = (cur as Rec | undefined)?.blocks;
  return Array.isArray(nested) ? (nested as Rec[]) : [];
}

function setSlotBlocks(ov: Rec, slot: SlotName, blocks: Rec[]): void {
  const cur = ov[slot];
  if (cur && !Array.isArray(cur) && typeof cur === 'object') {
    (cur as Rec).blocks = blocks;
  } else {
    ov[slot] = blocks;
  }
}

function effectsOf(blocks: Rec[]): Rec[] {
  return blocks.flatMap((b) =>
    Array.isArray(b.effects) ? (b.effects as Rec[]) : [],
  );
}

function patch(mutate: (ov: Rec) => void): Overrides {
  const patched = withPatchedOverride(SLUG, (ov) => mutate(ov as unknown as Rec));
  return { [SLUG]: patched } as Overrides;
}

// --- run helper --------------------------------------------------------------
function run(overrides?: Overrides): {
  res: ReturnType<typeof runComp>;
  events: Ev[];
} {
  const events: Ev[] = [];
  const opts = {
    ...controlComp(SLUG, true),
    onEvent: (ev: SimEvent) => events.push(ev as unknown as Ev),
  };
  if (overrides) {
    opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  }
  return { res: runComp(opts), events };
}

// --- hoisted runs (5 total; each is a full 180s sim) -------------------------
const base = run();

// counterfactual: anis's two defensive skills deleted entirely.
const noDefLines = run(
  patch((ov) => {
    setSlotBlocks(ov, 'skill1', []);
    setSlotBlocks(ov, 'skill2', []);
  }),
);

// counterfactual: the burst's damage line removed.
const noBurstHit = run(
  patch((ov) => {
    for (const b of slotBlocks(ov, 'burst')) {
      if (Array.isArray(b.effects)) {
        b.effects = (b.effects as Rec[]).filter((e) => e.kind !== 'flatDamage');
      }
    }
  }),
);

// counterfactual: the burst hit forced to core.
const burstHitCores = run(
  patch((ov) => {
    for (const e of effectsOf(slotBlocks(ov, 'burst'))) {
      if (e.kind === 'flatDamage') e.core = true;
    }
  }),
);

// counterfactual: the burst hit's atkPct pinned to the kit-stated 156.73.
const burstHitPinned = run(
  patch((ov) => {
    for (const e of effectsOf(slotBlocks(ov, 'burst'))) {
      if (e.kind === 'flatDamage') e.atkPct = BURST_ATK_PCT;
    }
  }),
);

// --- event helpers -----------------------------------------------------------
const buffApplies = (r: { events: Ev[] }): Ev[] =>
  r.events.filter((e) => e.kind === 'buffApply');
const damages = (r: { events: Ev[] }): Ev[] =>
  r.events.filter((e) => e.kind === 'damage');

let idxCache: number | undefined;
function resolveAnisSlot(): number {
  // Any ally buff that lands on anis reveals her team-slot index; damage events are then
  // attributable via srcSlot. (Boss-held debuffs carry targetIdx === null and are skipped.)
  const hit = buffApplies(base).find(
    (e) => e.targetSlug === SLUG && typeof e.targetIdx === 'number',
  );
  if (!hit) {
    throw new Error(
      'fixture: no ally buff ever targeted anis — cannot resolve her team-slot index',
    );
  }
  return hit.targetIdx as number;
}
const anisSlot = (): number => (idxCache ??= resolveAnisSlot());
const anisBurstHits = (): Ev[] =>
  damages(base).filter(
    (e) => e.bucket === 'burst' && e.srcSlot === anisSlot(),
  );

const def = (value: number): Ev[] =>
  buffApplies(base).filter((e) => e.stat === 'defPct' && e.value === value);

const tally = (evs: Ev[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const e of evs) {
    const s = e.targetSlug as string;
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
};

// =============================================================================
describe('anis — fixture sanity (non-vacuity)', () => {
  it('anis is in the comp, deals damage, and actually casts her Burst II', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(
      anisBurstHits().length,
      'anis landed no burst-bucket hit — either crown (also Burst II) wins the burst slot ' +
        'every rotation, which makes every burst assertion below vacuous and demands a ' +
        "different fixture, or the damage event's srcSlot is not the team-slot index",
    ).toBeGreaterThan(0);
  });
});

describe('skill1 — "when attacked 40 time(s)" → self DEF ▲120% / 10 sec', () => {
  // The activation is a damage-taken counter. The scope-lock boss deals no damage to the
  // team and the engine has no attacked/damage-taken trigger primitive, so the condition is
  // never satisfiable here. Nearest-wrong: re-keying it to `passive` or `interval` so the
  // (inert) buff is emitted anyway — that would show up as defPct=120 applications.
  it('never fires at scope lock: no DEF ▲120% is ever applied to anyone', () => {
    expect(def(120)).toHaveLength(0);
  });
});

describe('skill2 — self + 2 highest-final-ATK allies: DEF ▲80% / 5 sec', () => {
  it('the line is modeled at all (an inert stat is still kept, per schema policy)', () => {
    expect(
      def(80).length,
      'no DEF ▲80% application observed — skill2 stat line MISSING from the model',
    ).toBeGreaterThan(0);
  });

  // Target-set arithmetic, robust to liter/crown swapping places in the live-ATK ranking:
  // each activation must cover anis + helm + exactly one Supporter, so counts must satisfy
  // helm == anis and (liter + crown) == anis and total == 3 x anis.
  // helm is the Attacker (class ATK 118,027) vs liter/crown Supporters (98,367), so helm is
  // the top-ATK ally under BOTH static and final-ATK ranking.
  // Nearest-wrong models this kills: target `allies` (total = 4x), a missing excludeSelf
  // (anis consumes a slice slot, leaving one ally), or dropping the "self and" half (anis = 0).
  it('covers exactly self + 2 allies, never the whole team', () => {
    const t = tally(def(80));
    const a = t[SLUG] ?? 0;
    expect(a, 'anis herself is never granted the buff — the "self and" half is missing').toBeGreaterThan(0);
    expect(t.helm ?? 0).toBe(a);
    expect((t.liter ?? 0) + (t.crown ?? 0)).toBe(a);
    expect(def(80).length).toBe(3 * a);
  });

  it('lasts 5 SECONDS — not 5 rounds, and not permanently', () => {
    for (const e of def(80)) {
      expect(e.durationShots).toBeUndefined();
      expect(typeof e.expiresFrame).toBe('number');
      expect(Number.isFinite(e.expiresFrame as number)).toBe(true);
    }
  });

  it('recurs over the fight — a cooldown skill, not a one-shot aura', () => {
    // >= 2 activations x 3 targets. A `passive` one-shot at t=0 yields exactly 3.
    expect(def(80).length).toBeGreaterThanOrEqual(6);
  });
});

describe('anis inertness — the defensive kit moves NO damage', () => {
  // DEF ▲ is inert (defPct) and "Equally shares damage taken" has no HP pool at scope lock.
  // Deleting skill1 + skill2 touches no damage and no gauge, so every unit's total must be
  // byte-identical. Nearest-wrong this kills: encoding either line as an offensive stat
  // (atkPct / damageTakenPct / attackDamagePct) to "make the unit do something".
  it('deleting skill1 + skill2 changes no unit\u2019s total damage', () => {
    expect(totals(noDefLines.res)).toEqual(totals(base.res));
  });
});

describe('burst — 156.73% of final ATK to enemies within attack range', () => {
  it('the hit exists and is the kit\u2019s only damage-bearing line', () => {
    expect(totals(noBurstHit.res)[SLUG]).toBeLessThan(totals(base.res)[SLUG]);
  });

  it('is exactly 156.73% — pinning atkPct to the kit value is a no-op', () => {
    // Exact-equality pin: any other shipped magnitude moves totals.
    expect(totals(burstHitPinned.res)).toEqual(totals(base.res));
  });

  it('lands pre-Full-Burst (no +50% major) and takes no +30% range bonus', () => {
    const hits = anisBurstHits();
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) {
      expect(h.fbMajorApplied).toBe(false);
      expect(h.rangeApplied).toBe(false);
    }
  });

  it('does not core (the kit never says core strike)', () => {
    // Forcing core:true must INCREASE anis damage; equality would mean core was already on.
    expect(totals(burstHitCores.res)[SLUG]).toBeGreaterThan(totals(base.res)[SLUG]);
  });
});

describe('burst — DEF ▼32% / 5 sec on the enemy', () => {
  it('is NOT folded into damageTakenPct (a different, multiplicative mechanic)', () => {
    // DEF ▼ is subtractive in the damage formula; damageTakenPct is a multiplicative bucket
    // that would lift EVERY unit's damage, not just relieve the DEF term.
    const folded = buffApplies(base).filter(
      (e) => e.stat === 'damageTakenPct' && e.value === 32,
    );
    expect(folded).toHaveLength(0);
  });

  it.skip('GAP: no enemy-DEF-down primitive — StatKey has no enemy DEF key, so the line cannot be modeled without a new stat + a boss-DEF hook', () => {});
});

describe('skill1 / skill2 unmodelable payloads', () => {
  it.skip('GAP: "Activates when attacked 40 time(s)" — no damage-taken/attacked trigger primitive, and the scope-lock boss deals no damage', () => {});
  it.skip('GAP: "Equally shares damage taken for 10 sec" — no HP pool / no incoming damage modeled at scope lock', () => {});
});

describe('override structure — claims this fixture cannot discriminate behaviourally', () => {
  const shipped = withPatchedOverride(SLUG, () => {}) as unknown as Rec;

  it('the burst hit is keyed to burstCast (not fullBurstEnter) and targets the enemy', () => {
    const carriers = slotBlocks(shipped, 'burst').filter((b) =>
      (Array.isArray(b.effects) ? (b.effects as Rec[]) : []).some(
        (e) => e.kind === 'flatDamage',
      ),
    );
    expect(carriers.length, 'no burst block carries a flatDamage effect').toBeGreaterThan(0);
    for (const b of carriers) {
      expect((b.trigger as Rec).kind).toBe('burstCast');
      expect((b.target as Rec).kind).toBe('enemy');
    }
  });

  it('skill2 ranks allies by FINAL ATK and excludes the skill user', () => {
    // The kit says "highest final ATK" → byFinalAtk: true. In this comp the static and
    // final-ATK orderings agree (helm is top either way), so only the authoring discriminates.
    const tops = slotBlocks(shipped, 'skill2')
      .map((b) => b.target as Rec | undefined)
      .filter((t): t is Rec => t?.kind === 'alliesTopAtk');
    expect(tops.length, 'skill2 has no alliesTopAtk target block').toBeGreaterThan(0);
    for (const t of tops) {
      expect(t.count).toBe(2);
      expect(t.excludeSelf).toBe(true);
      expect(t.byFinalAtk).toBe(true);
    }
  });
});

---

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5, blind, prose-only) + diff vs driver override

DIFF vs the driver override (src/skills/overrides/anis.json):
1. skill2 trigger interval: S6 sec:20 vs driver sec:30. S6 flags this explicitly as a KIT-SILENT estimate ("the 20s figure is the unit s datamined [burst] cooldown (cd 20s), which is the only cadence number available" — the prose-only packet did not carry skillCooldownsSec). The driver uses skillCooldownsSec.skill2 = 30, present in the ground truth above.
2. S6 adds explicit noFb:true + noRange:true to the burst flatDamage; the driver carries no flags. Behaviourally IDENTICAL: burst-cast damage is auto-FB-exempt in the engine, and rangeApplied=false was observed on every driver nuke instance (the S5 blind suite asserts it).
3. Everything else is IDENTICAL: skill1 [] (attacked-cluster unmodelable); skill2 split into self + alliesTopAtk{count:2, excludeSelf:true, byFinalAtk:true} defPct 80/5s; burst burstCast → enemy flatDamage 156.73; the same three unmodeled lines verbatim.

{
  "slug": "anis",
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 20
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 80,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 20
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
          "stat": "defPct",
          "value": 80,
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
          "atkPct": 156.73,
          "noFb": true,
          "noRange": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates when attacked 40 time(s). Affects self.",
      "DEF ▲ 120% for 10 sec."
    ],
    "skill2": [
      "Equally shares damage taken for 10 sec."
    ],
    "burst": [
      "DEF ▼ 32% for 5 sec."
    ]
  },
  "caveats": [
    "⛑ skill2 trigger is KIT-SILENT (no activation clause) — modeled as interval at the datamined 20s skill cooldown, first fire t=20s. Both the cadence and the first-fire phase are unmeasured conventions.",
    "⛑ skill1 is entirely unmodeled: 'attacked 40 time(s)' is an INCOMING-hit counter and the v1 boss deals no damage to units, so the trigger can never be satisfied; there is also no TriggerDef for incoming hits (hitCount counts the OWNER'S OUTGOING rounds — a different mechanic). Its payload is defPct, documented inert in v1, so the omission is damage-neutral today.",
    "⛑ burst DEF ▼ 32% has no engine channel. Boss DEF reduction acts inside the (ATK − DEF) term and is NOT the same mechanic as damageTakenPct (Damage Up bucket); substituting damageTakenPct would mis-credit the whole team by an unknown factor that depends on the boss DEF constant. Left unmodeled pending a boss-DEF-reduction primitive — this is the single largest offensive omission in this kit.",
    "⛑ skill2's DEF ▲ 80% is modeled as TWO blocks (self + 2 top-ATK allies) because excludeSelf removes the owner from the alliesTopAtk pool; the kit's 'Affects self and 2 allies ... (except the skill user)' reads as self PLUS 2 others, i.e. 3 recipients.",
    "defPct is documented inert in v1 (self DEF does not affect own damage), so every DEF ▲ block here is offensively zero-damage; they are authored for kit completeness and for any future consumer/scaler."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⛑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Anis (RL/Iron/Defender/Burst II) is a near-pure defensive kit: the ONLY damage line in the whole kit is the burst's 156.73% of final ATK. S1 (DEF ▲ 120% on an incoming-attack counter) and S2's DEF ▲ 80% are inert at scope (defPct does not feed own damage); S2's damage-share and the burst's DEF ▼ 32% have no engine channel. Burst damage is authored FB-exempt (noFb) and range-exempt per the burst-cast convention — a burst cast resolves before the Full Burst window opens. Expect this unit's simulated damage to be dominated by her base RL normal attacks (charge weapon, 60 charge frames, ammo 6) rather than by kit effects.",
  "hasPierce": false
}
---

## SECTION 7 — DRIVER IMPLEMENTATION (test + override under judgment)

### 7a. scripts/tests/units/anis.test.ts (driver spec — 23 tests, all GREEN: see reviews/anis.verify.txt)

// PER-UNIT KIT SPEC — `anis` (Anis, Tetra RL Defender, Iron, Burst II, cd 20s, ammo 6,
// chargeFrames 60 / reloadFrames 142, normalMult 65.02 / coreMult 200 / chargeMult 250,
// critRate 15 / critDamage 150, burstGaugePerShot 3.55). Kit-autonomy gauntlet 2026-08-04;
// test-first line-by-line spec.
//
// EXACT SLUG: `anis` = BASE Anis (RL/Iron Defender, Burst II) — never conflated with
// `anis-star` (RL/Electric Burst I) or `anis-sparkling-summer` (SG/Electric Supporter B3).
//
// GREENFIELD NOTE: anis shipped with NO override (simSupported:false) — before this gauntlet
// the unit could not sim at all (resolveSkills throws for prose-without-override). The usual
// "RED vs shipped override" half is therefore degenerate: the pre-override state is "does not
// run". The substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN
// vs the faithful encoding AND the nearest-wrong model (patched via withPatchedOverride)
// provably fails it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.anis.skills, lvl-10 values):
//   S1 "D.H. Formation"
//      ■ attacked 40 times → self: DEF ▲120% for 10 sec                          [N3a UNMODELED]
//   S2 "C.H. Formation" (skillCooldownsSec.skill2 = 30)
//      ■ self + 2 highest-FINAL-ATK allies (except user): DEF ▲80% for 5 sec     [N1]
//      ■ (same targets): equally shares damage taken for 10 sec                  [N3b UNMODELED]
//   BU "Pinpoint Missile" (burst, cd 20s)
//      ■ enemies within attack range: 156.73% of final ATK as damage             [N2]
//      ■ (same targets): DEF ▼32% for 5 sec                                      [N3c UNMODELED]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   N1  scope — the kit names self + the 2 highest-FINAL-ATK allies; with 4 units in the comp
//       that is exactly 3 of 4 holders per firing and NEVER liter (a Supporter's ~98k ATK sits
//       below two Attackers at ~118k). Three nearest-wrong models each provably fail: an
//       all-allies scope reaches 4 holders including liter; a dropped self-block reaches only 2
//       and never anis; and a burstCast re-key rides her ~20s cast frames instead of the 30s
//       interval grid (the datamined skill CD). INERT canary: defPct moves no damage in v1
//       (types.ts — self DEF has no offensive consumer), so removal is byte-identical; if DEF
//       ever gains a consumer this fails loudly and the line must be re-judged.
//   N2  a burst CAST lands BEFORE the Full Burst window opens (burst-cast damage is auto
//       FB-exempt, verified fact 2026-07-13), so the 156.73% nuke must never take the +50%
//       major; removal empties her burst bucket (she has no other burst line). The SL1 datamine
//       magnitude 68.57 is the wrong-skill-level nearest-wrong.
//   N3a the sim has NO incoming-damage model (immortal boss) and NO attacked-N trigger, so S1
//       can never fire; pinned as an EMPTY skill1 + zero defPct-120 applications. The
//       nearest-wrong model — hitCount 40 counting hits she DEALS (an RL at ~1 pull/s reaches
//       40 around t≈50s) — provably produces defPct-120 applications, so the empty-log
//       assertion is one that mis-modeling fails.
//   N3b there is no damage-redistribution primitive (no incoming damage to share; bay
//       precedent) — pinned structurally: every shipped S2 effect is a defPct buff.
//   N3c the engine explicitly drops enemy DEF▼ debuffs: boss DEF enters the formula only as
//       the FIXED cfg.bossDef subtraction (sim.ts), so the line is unenactable AND negligible
//       (32% of the 140-DEF scope-lock boss ≈ 45 ATK against ~100k effective ≈ 0.04%). The
//       nearest-wrong encoding — damageTakenPct 32 (a boss-taken amplifier) — would over-credit
//       the WHOLE team by ~32% during the window; the counterfactual run proves exactly that
//       inflation, and the shipped run carries no damageTakenPct application from her (viper /
//       cocoa / marciana precedent).
//
// UNMODELED ⚑s (inert here; estimate + recipe + tier in the override note/unmodeled):
//   S1 attacked-cluster — out-of-domain (incoming-damage subsystem; maiden/yulha precedent).
//   S2 damage-share   — out-of-domain (no redistribution primitive; bay precedent).
//   BU DEF▼32%        — unenactable + negligible (cfg.bossDef fixed; NOT damageTakenPct).
//
// Fixture (deterministic — no seed; event-log over totals where a line is scoping/timing-
// sensitive): COMP ['liter','anis','helm','ada'] — liter (B1, 20s) opens the chain, anis is
// the SOLE B2 (casts every FB cycle; the controlComp seats crown, a second B2 with a 20s cd
// that wins every same-stage selection and would starve anis to zero casts — the fixture trap
// this gauntlet's task note pre-registers; the STARVED comp below IS that probe), helm + ada
// (both B3, 40s) ALTERNATE the stage-3 slot so a Full Burst opens every ~20s. Boss Fire
// (neutral for Iron — her ×1.10 major is Electric-only), focus anis (RL = charge weapon, ×2.5
// gauge on focus). ~8 Full Bursts / anis casts in 180s; S2 fires at t=30/60/90/120/150.
//
// SECOND COMP (cast-starvation lever, aria precedent): STARVED ['liter','crown','anis','helm']
// — crown takes every stage-2 slot while FBs still open (~40s cycle on helm alone), so anis
// casts ZERO bursts: her burstCast nuke (N2) must be SILENT there while her interval S2 (N1)
// keeps firing on the battle clock. The STARVED comp also FLIPS her S2 target set: the top-2
// final ATK of {liter, crown, helm} are helm + liter (Supporter ~98k beats Defender ~78k), so
// the holders become {anis, helm, liter} — proving the byFinalAtk ranking is LIVE per-comp,
// not a static slot list.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixtures ---------------------------------------------------------------------------------
const COMP = ['liter', 'anis', 'helm', 'ada'];
const ANIS = 1; // anis's slot in COMP
/** The starvation probe: crown (B2, 20s) seats the stage-2 slot ahead of anis on every
 *  rotation — the controlComp-style trap for a Burst II unit under test. */
const STARVED = ['liter', 'crown', 'anis', 'helm'];
const ANIS_STARVED = 2; // anis's slot in STARVED

function runAt(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'anis',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}
const run = (overrides: Record<string, any> = {}) => runAt(COMP, overrides);

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------

const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** N1 reference: BOTH S2 DEF blocks removed (proves the buff channel is exactly inert). */
const anisNoDef = withPatchedOverride('anis', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'defPct'));
  if (ov.skill2.length !== before - 2) {
    throw new Error('anis S2 defPct blocks missing — fixture is stale');
  }
});

/** N1 nearest-wrong (scope): one UN-SCOPED all-allies DEF block instead of self + top-2. */
const anisAllAlliesDef = withPatchedOverride('anis', (ov) => {
  if (!ov.skill2.some((b: any) => hasStat(b, 'defPct'))) {
    throw new Error('anis S2 defPct blocks missing — fixture is stale');
  }
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'interval', sec: 30 },
      target: { kind: 'allies' },
      effects: [
        { kind: 'buff', stat: 'defPct', value: 80, durationSec: 5 },
      ],
    },
  ];
});

/** N1 nearest-wrong (self inclusion): only the top-2 block — the kit's "self and 2 allies"
 *  split drops her own share. */
const anisNoSelfDef = withPatchedOverride('anis', (ov) => {
  const top2 = ov.skill2.find(
    (b: any) => b.target?.kind === 'alliesTopAtk' && hasStat(b, 'defPct')
  );
  if (!top2) {
    throw new Error(
      'anis S2 alliesTopAtk defPct block missing — fixture is stale'
    );
  }
  ov.skill2 = [top2];
});

/** N1 nearest-wrong (trigger): both blocks re-keyed to HER OWN burstCast. The kit carries a
 *  30s skill cooldown and no activation clause tied to her burst; the interval encoding fires
 *  at t=30/60/90/120/150, a burstCast encoding rides her ~20s cast frames instead. */
const anisBurstKeyedDef = withPatchedOverride('anis', (ov) => {
  const blocks = ov.skill2.filter((b: any) => hasStat(b, 'defPct'));
  if (blocks.length !== 2) {
    throw new Error('anis S2 defPct blocks missing — fixture is stale');
  }
  for (const b of blocks) {
    b.trigger = { kind: 'burstCast' };
  }
});

/** N2 reference: the burst nuke removed (proves it is her burst-bucket damage source). */
const anisNoNuke = withPatchedOverride('anis', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('anis burst flatDamage block missing — fixture is stale');
  }
});

/** N2 nearest-wrong: the SL1 datamine magnitude 68.57 instead of the SL10 156.73. */
const anisSl1Nuke = withPatchedOverride('anis', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('anis burst flatDamage effect missing — fixture is stale');
  }
  e.atkPct = 68.57;
});

/** N3a nearest-wrong: S1 modeled as a hitCount-40 counter over hits she DEALS (the sim's
 *  hitCounter) — the closest available trigger to "attacked 40 times", and the wrong source:
 *  an RL at ~1 pull/s reaches 40 dealt hits mid-fight, so this encoding WOULD emit
 *  defPct-120 applications that the faithful (untriggerable) line never can. */
const anisDealtHitS1 = withPatchedOverride('anis', (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'hitCount', count: 40 },
      target: { kind: 'self' },
      effects: [
        { kind: 'buff', stat: 'defPct', value: 120, durationSec: 10 },
      ],
    },
  ];
});

/** N3c nearest-wrong: the burst's enemy DEF▼32% folded into damageTakenPct (the boss-taken
 *  amplifier bucket) — wrong mechanic AND wrong direction-of-fit: it over-credits the whole
 *  team instead of lowering a fixed DEF subtraction the engine never feeds. */
const anisVulnBurst = withPatchedOverride('anis', (ov) => {
  ov.burst = [
    ...ov.burst,
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 32, durationSec: 5 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDef = run({ anis: anisNoDef });
const allAlliesDef = run({ anis: anisAllAlliesDef });
const noSelfDef = run({ anis: anisNoSelfDef });
const burstKeyedDef = run({ anis: anisBurstKeyedDef });
const noNuke = run({ anis: anisNoNuke });
const sl1Nuke = run({ anis: anisSl1Nuke });
const dealtHitS1 = run({ anis: anisDealtHitS1 });
const vulnBurst = run({ anis: anisVulnBurst });
const starved = runAt(STARVED);

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const anisCasts = (evs: SimEvent[]) =>
  casts(evs).filter((c) => c.slug === 'anis');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');

/** anis's defPct applications from her own S2 (slot differs between comps). */
const anisDefBuffs = (evs: SimEvent[], slot: number = ANIS) =>
  buffs(evs).filter(
    (b) => b.casterIdx === slot && b.stat === 'defPct' && b.value === 80
  );
const holdersAt = (bs: BuffApply[], frame: number): string[] =>
  [...new Set(bs.filter((b) => b.frame === frame).map((b) => b.targetSlug))]
    .sort();
const anisNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'anis' && d.srcSlot === 'burst');

describe('anis (base) — kit spec', () => {
  describe('fixture sanity', () => {
    it('anis is the sole B2 and casts her burst on every Full Burst cycle', () => {
      const cs = anisCasts(base.events);
      // ~20s FB cadence (liter 20s + anis 20s + helm/ada alternating the B3 slot) → ~8 casts;
      // the starvation trap (a second B2 seated beside her) would read 0 here.
      expect(cs.length).toBeGreaterThanOrEqual(6);
      expect([...new Set(cs.map((c) => c.stage))], 'anis is Burst II').toEqual(
        [2]
      );
    });

    it('the comp opens Full Bursts for the whole fight', () => {
      expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('N1 — S2 grants DEF ▲80% for 5s every 30s to self + the 2 highest-FINAL-ATK allies', () => {
    const applied = anisDefBuffs(base.events);
    const firingFrames = [...new Set(applied.map((b) => b.frame))].sort(
      (a, b) => a - b
    );

    it('fires on the 30s skill-CD grid from t=30 (interval cadence)', () => {
      expect(firingFrames).toEqual([30, 60, 90, 120, 150].map((s) => s * FPS));
    });

    it('is 80% for exactly 5 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([80]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('reaches exactly 3 of 4 units per firing: anis + helm + ada, never liter', () => {
      expect(firingFrames.length).toBeGreaterThan(0);
      for (const f of firingFrames) {
        expect(
          holdersAt(applied, f),
          `frame ${f} holder set`
        ).toEqual(['ada', 'anis', 'helm']);
      }
    });

    it('is INERT: removing both blocks changes NO unit\u2019s total by a single point (defPct is offensively inert in v1)', () => {
      expect(noDef.totals).toEqual(base.totals);
    });

    it('DISCRIMINATING (scope): an all-allies encoding reaches 4 holders including liter', () => {
      const wrong = anisDefBuffs(allAlliesDef.events);
      const wrongFrames = [...new Set(wrong.map((b) => b.frame))];
      expect(wrongFrames.length).toBeGreaterThan(0);
      for (const f of wrongFrames) {
        expect(holdersAt(wrong, f)).toEqual(['ada', 'anis', 'helm', 'liter']);
      }
    });

    it('DISCRIMINATING (self inclusion): a top-2-only encoding drops anis herself', () => {
      const wrong = anisDefBuffs(noSelfDef.events);
      const wrongFrames = [...new Set(wrong.map((b) => b.frame))];
      expect(wrongFrames.length).toBeGreaterThan(0);
      for (const f of wrongFrames) {
        const holders = holdersAt(wrong, f);
        expect(holders).toHaveLength(2);
        expect(holders).not.toContain('anis');
      }
    });

    it('DISCRIMINATING (trigger): a burstCast re-key rides her cast frames, not the 30s grid', () => {
      const wrong = anisDefBuffs(burstKeyedDef.events);
      const wrongFrames = [...new Set(wrong.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      const castFrames = anisCasts(base.events).map((c) => c.frame);
      expect(wrongFrames.length).toBeGreaterThanOrEqual(6);
      expect(wrongFrames.length).not.toBe(5);
      for (const f of wrongFrames) {
        expect(
          castFrames.some((cf) => Math.abs(cf - f) <= 2),
          `burst-keyed application at ${f} has no nearby anis cast`
        ).toBe(true);
      }
      // …and at least one of those frames is NOT on the 30s grid.
      expect(
        wrongFrames.some((f) => f % (30 * FPS) !== 0),
        'burst-cast frames should not all coincide with the interval grid'
      ).toBe(true);
    });
  });

  describe('N2 — burst deals 156.73% of final ATK, once per cast, BEFORE the Full Burst window', () => {
    const nukes = anisNukes(base.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(anisCasts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([156.73]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('is LIVE: removing it empties her burst bucket and lowers her total', () => {
      expect(anisNukes(noNuke.events)).toEqual([]);
      expect(noNuke.totals.anis).toBeLessThan(base.totals.anis);
    });

    it('DISCRIMINATING (magnitude): the SL1 datamine 68.57 is not the shipped value', () => {
      const wrong = anisNukes(sl1Nuke.events);
      expect([...new Set(wrong.map((d) => d.atkPct))]).toEqual([68.57]);
      expect([...new Set(nukes.map((d) => d.atkPct))]).not.toEqual([68.57]);
    });
  });

  describe('N3 — UNMODELED lines are absent, and their nearest-wrong encodings provably fail', () => {
    it('N3a S1: the shipped override carries NO skill1 blocks (attacked-40 is untriggerable)', () => {
      const ov = loadOverride('anis')!;
      expect(ov.skill1).toEqual([]);
    });

    it('N3a S1: no DEF-120 application ever appears in the log', () => {
      const fired = buffs(base.events).filter(
        (b) => b.casterIdx === ANIS && b.stat === 'defPct' && b.value === 120
      );
      expect(fired).toEqual([]);
    });

    it('N3a DISCRIMINATING: a hitCount-40 (hits DEALT) mis-model would emit DEF-120 applies', () => {
      const fired = buffs(dealtHitS1.events).filter(
        (b) => b.stat === 'defPct' && b.value === 120
      );
      expect(fired.length).toBeGreaterThan(0);
    });

    it('N3b S2 damage-share: every shipped S2 effect is a defPct buff (no redistribution primitive encoded)', () => {
      const ov = loadOverride('anis')!;
      const blocks: any[] = ov.skill2 as any[];
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) {
        for (const e of b.effects) {
          expect(e.kind).toBe('buff');
          expect(e.stat).toBe('defPct');
        }
      }
    });

    it('N3c burst DEF▼32%: no damageTakenPct application from anis in the shipped run', () => {
      const vulns = buffs(base.events).filter(
        (b) => b.casterIdx === ANIS && b.stat === 'damageTakenPct'
      );
      expect(vulns).toEqual([]);
    });

    it('N3c DISCRIMINATING: a damageTakenPct-32 encoding inflates every ally\u2019s total', () => {
      for (const slug of COMP) {
        expect(
          vulnBurst.totals[slug],
          `${slug} total under the vuln counterfactual`
        ).toBeGreaterThan(base.totals[slug]);
      }
    });
  });

  describe('the STARVED comp — cast-gated lines silent, interval lines live, ranking flips', () => {
    it('fixture: crown takes every stage-2 slot, anis casts nothing, FBs still open', () => {
      expect(anisCasts(starved.events).length).toBe(0);
      expect(
        casts(starved.events).filter((c) => c.slug === 'crown').length
      ).toBeGreaterThan(3);
      expect(fbStarts(starved.events).length).toBeGreaterThanOrEqual(3);
    });

    it('N2 is SILENT: no burst-bucket damage on rotations she did not cast', () => {
      expect(anisNukes(starved.events)).toEqual([]);
    });

    it('N1 STILL fires on the 30s battle clock (interval, not cast-keyed)', () => {
      const applied = anisDefBuffs(starved.events, ANIS_STARVED);
      const frames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames).toEqual([30, 60, 90, 120, 150].map((s) => s * FPS));
    });

    it('N1 holders FLIP with the comp: helm + liter now outrank crown (live byFinalAtk ranking)', () => {
      const applied = anisDefBuffs(starved.events, ANIS_STARVED);
      const frames = [...new Set(applied.map((b) => b.frame))];
      expect(frames.length).toBeGreaterThan(0);
      for (const f of frames) {
        // Supporter base ATK (~98k) beats Defender (~78k), so liter takes crown's slot.
        expect(
          holdersAt(applied, f),
          `frame ${f} holder set in the starved comp`
        ).toEqual(['anis', 'helm', 'liter']);
      }
    });
  });
});

### 7b. src/skills/overrides/anis.json (driver override)

{
  "note": "anis = Anis (BASE) — RL/Defender/Iron/Burst II, cd 20s, ammo 6, chargeFrames 60, reloadFrames 142, normalMult 65.02, coreMult 200, chargeMult 250, critRate 15 / critDamage 150, burstGaugePerShot 3.55, Tetra SR. Kit-autonomy gauntlet 2026-08-04 — first modeling (no prior override / kit-status row; simSupported was false). ⚠ EXACT SLUG: `anis` is the RL/Iron original (nicknames 'base anis') — NOT `anis-star` (RL/Electric Burst I) nor `anis-sparkling-summer` (SG/Electric Supporter Burst III); the slug-disambiguation lint's AMBIGUOUS-base guard was explicitly resolved on the slug. A near-pure TANK whose only damage line is her burst nuke: S1 is an attacked-counter self-DEF buff, S2 is a DEF buff + damage-taken share, and the burst's second line lowers enemy DEF — three survivability/offensive-DEF mechanics, two of which the sim's input domain cannot produce and one the engine cannot enact. || MODELED (2 lines): (S2-DEF) 'Affects self and 2 allies with the highest final ATK (except the skill user). DEF ▲ 80% for 5 sec' — no activation clause in the prose, so interval:30 per the no-activation-clause convention (datamined skillCooldownsSec.skill2 = 30; first fire t=30, fires t=30/60/90/120/150 on the 180s basis — maiden/milk precedent), encoded as TWO blocks per the soda-twinkling-bunny/mast pattern for 'self and 2 allies': (a) target self defPct 80 durationSec 5, (b) target alliesTopAtk{count:2, excludeSelf:true, byFinalAtk:true} defPct 80 durationSec 5. byFinalAtk is REQUIRED by the literal-word rule (A3, 2026-07-20): the prose says 'highest FINAL ATK' → live effectiveAtk ranking at apply time, not static; exclude-then-take-2 from the candidate pool. defPct is OFFENSIVELY INERT in v1 (types.ts: self DEF doesn't affect own damage — Endurance cube slot); the block is kept for kit completeness so a future DEF consumer reads it (bay/marciana precedent) and its application/targeting is pinned in the spec test. (BURST-NUKE) 'Affects enemies within attack range. Deals 156.73% of final ATK as damage' → burstCast → enemy → flatDamage 156.73 — her ONLY damage line. The single immortal boss is the only enemy ('within attack range' collapses to one instance per cast); burst-cast damage is auto FB-exempt and snapshots pre-FB (the B2 cast lands BEFORE the Full Burst window opens — verified fact 2026-07-13), so the nuke takes no +50% major; no core (text does not say 'core strike'); fires ONLY on rotations anis herself casts (a co-B2 seated beside her — e.g. crown in the controlComp — wins same-stage selection and starves this line; pinned by the spec's STARVED comp). || UNMODELED (3 lines, all VERBATIM in `unmodeled`, never an `ignored` drop — all out-of-domain or unenactable, ⚑ below): (S1) the ENTIRE attacked-40 cluster — the sim has NO incoming-damage model (v1 boss is immortal and never acts) and NO attacked-N trigger primitive, so the trigger is unrepresentable, not merely unmeasured; the DEF ▲120% it feeds is offensively inert regardless (maiden/yulha precedent for a gate that cannot fire on the scope-lock basis — faithful omission, not a fudge). (S2-SHARE) 'Equally shares damage taken for 10 sec' — no incoming damage to redistribute and no redistribution primitive (bay precedent); note the 10s duration differs from the co-targeted DEF line's 5s, so the two effects could not share one block even if the share were enactable. (BURST-DEFSHRED) 'DEF ▼ 32% for 5 sec' — the engine EXPLICITLY drops enemy DEF debuffs: boss DEF enters the formula only as the FIXED cfg.bossDef per-hit subtraction (sim.ts; NO buff/debuff channel feeds it), and the magnitude is negligible (32% of the 140-DEF scope-lock boss ≈ 44.8 ATK against ~118k effective ATK ≈ +0.04%/hit, only inside the 5s post-cast windows on anis-cast rotations). It is emphatically NOT damageTakenPct — that StatKey is a boss-taken AMPLIFIER bucket (a uniform multiplier, ≠ DEF-shred arithmetic, which is per-attacker 0.32·bossDef/(effectiveAtk−bossDef)); folding it would spuriously over-credit the WHOLE team by ~32% in-window (viper/cocoa/marciana precedent; the spec test proves the inflation under that counterfactual). This is nonetheless the kit's ONLY team-facing offensive contribution — her board reading reflects zero of it, honestly. || ⚑ LIST: [1] (OUT-OF-DOMAIN, incoming-damage subsystem) S1 'Activates when attacked 40 time(s) → self DEF ▲120%/10s'. estimate: in-game an SR Defender tanks regularly so the buff's real uptime is high, but DEF feeds nothing offensively in v1 → 0 damage impact under ANY encoding. recipe: needs an incoming-damage / attacked-count trigger primitive (neither exists); before any encoding, measure attacked-40 cadence from a real fight. tier: out-of-domain (maiden/yulha precedent). [2] (OUT-OF-DOMAIN, no redistribution primitive) S2 'Equally shares damage taken for 10 sec'. estimate: 0 damage impact (nobody takes damage at scope). recipe: needs incoming damage + a redistribution model; if it ever lands it must carry its OWN 10s duration (not the DEF line's 5s). tier: out-of-domain (bay precedent). [3] (UNENACTABLE + negligible, the one team-damage line) burst 'DEF ▼32%/5s'. estimate: +0.04%/hit in-window (44.8 ATK vs ~118k effective). recipe: if a boss-DEF-reduction primitive ever lands, per-hit gain = 0.32·bossDef/(effectiveAtk−bossDef) per attacker — NEVER a damageTakenPct fold. tier: 2. [4] (MANDATORY cadence tuple, datamine-unreliable) RL cadence: rate_of_fire 60 / chargeFrames 60 / reloadFrames 142 / ammo 6 shipped as-is from the datamine (no charFixes). estimate = datamine as-is; recipe = read the rocket cadence + reload gap from any focused anis video; tier = measurement-gated. Low-impact: her self-damage is one 156.73% nuke per 20s + RL normals. [5] (cadence) the S2 interval sec 30 is the datamined skillCooldownsSec.skill2 (the kit prose carries no number) — ⚑ cadence tuple (maiden precedent). || EVIDENCE TIER: both modeled magnitudes (80, 156.73) are SL10 kit-text-literal (DATAMINED); the 30s interval is the datamined skill CD. || TIER 2: scoped buff (alliesTopAtk byFinalAtk + self split), the burstCast-vs-fullBurstEnter/starvation lever (STARVED comp in the spec), and burstCast FB-exemption on the nuke. Cross-family: S2b claude-fable-5 independently CONVERGED on both FAITHFUL encodings (trigger identity, byFinalAtk, exclude-then-take-2 + self, burstCast FB-exempt nuke) and ALL three unmodeled mechanics, including the same nearest-wrong set (hitCount-40-on-dealt-hits for S1; damageTakenPct fudge for the share AND for the DEF shred; static-ATK ranking; dropped self application). Faithful>fit; measured>fudge. Kit-autonomy gauntlet 2026-08-04.",
  "kitDescription": "Anis is an Iron rocket-launcher Burst-II Defender whose kit is nearly all survivability: Skill 1 raises her own DEF after she has been attacked 40 times, and Skill 2 raises the DEF of herself and her two highest-final-ATK allies while sharing damage taken among them. In the sim (immortal boss, no incoming damage) only two lines fire: the Skill 2 DEF buff every 30s (offensively inert — self DEF feeds no damage in v1) and her burst's 156.73%-of-final-ATK nuke, her only damage line. Skill 1's attacked cluster, the damage-share, and the burst's enemy DEF-lower are documented but unmodeled — the first two need an incoming-damage model the sim deliberately lacks, and boss DEF is a fixed per-hit subtraction the engine cannot debuff (and the shred's magnitude is ~0.04% anyway).",
  "caveats": [
    "skill1: the entire attacked-40 cluster (self DEF ▲120%/10s) is UNMODELED — no incoming-damage model, no attacked-N trigger primitive; the boss never acts. Nearest-wrong (hitCount 40 on hits she DEALS) is pinned in the spec test and provably fails",
    "skill2: 'Equally shares damage taken for 10 sec' is UNMODELED — no redistribution primitive and no incoming damage to share (its 10s duration is distinct from the co-targeted DEF line's 5s)",
    "burst: 'DEF ▼ 32% for 5 sec' is UNMODELED — boss DEF is the fixed cfg.bossDef subtraction with no debuff channel; magnitude ~0.04%/hit; NOT damageTakenPct (that would over-credit the whole team ~32% in-window — pinned as a counterfactual in the spec test)",
    "skill2: the 30s interval cadence is the datamined skillCooldownsSec.skill2 (the kit prose carries no number) — ⚑ cadence tuple",
    "weapon: RL cadence tuple (rate_of_fire 60 / chargeFrames 60 / reloadFrames 142 / ammo 6) is an unmeasured datamine estimate"
  ],
  "unmodeled": {
    "skill1": [
      "Activates when attacked 40 time(s). Affects self.",
      "DEF ▲ 120% for 10 sec."
    ],
    "skill2": ["Equally shares damage taken for 10 sec."],
    "burst": ["DEF ▼ 32% for 5 sec."]
  },
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 30 },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "defPct", "value": 80, "durationSec": 5 }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 30 },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "effects": [
        { "kind": "buff", "stat": "defPct", "value": 80, "durationSec": 5 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 156.73 }]
    }
  ]
}

---

Adjudicate per the contract and return ONLY the verdict JSON.
