# kit-autonomy — S7 RECONCILING JUDGE PACKET: crow

## PART 1 — YOUR ROLE & RETURN CONTRACT (RECONCILING-JUDGE.md)

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

## PART 2a — MECHANICS SSOT: docs/data/damage-calculation.md

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

## PART 2b — MECHANICS SSOT: docs/data/game-mechanics.md

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

## PART 3 — GROUND TRUTH: kit prose + base stats + engine facts

### Unit identity (data/characters.json → characters.crow)

- slug `crow` / name Crow — SMG / Defender / Fire / Burst III, burst CD 40s. No variants exist (only `crow` and the unrelated `crown`).
- ammo 120, reloadFrames 121, hitsPerShot 2, rate_of_fire 1440 (engine frame-quantizes to 20 shots/s), normalAttackMultiplier 11.18, coreAttackMultiplier 250, burstGaugePerShot 0.1.
- baseStats: hp 16500 / atk 400 / def 95, critRate 15%, critDamage 150%.

### Kit prose (verbatim, max-level values)

- skill1 ("Killing Time"): "■ Affects all enemies. Activates when entering Full Burst.\nATK ▼ 19.93% for 10 sec."
- skill2 ("Daredevil"): "■ Activates when the last bullet hits the target. Affects the target.\nDeals 89.09% of final ATK as additional damage. \n■ Activates when the last bullet hits the target. Affects self.\nDEF ▲ 12.72% for 5 sec."
- burst ("The Terrorist"): "■ Affects the enemy with the highest final ATK.\nDeals 915.75% of final ATK as Burst Skill damage."
- Level-1 values (for nearest-wrong magnitude checks): S1 11.77%, S2 rider 52.65%, S2 DEF 7.52%, burst 541.12%.

### Engine facts relevant to the divergences below (sighted, from src/engine/sim.ts + src/types.ts)

1. `lastBullet` trigger: fires when a unit's magazine is fired dry (ammo reaches 0 on a shot — sim.ts:3930) or when a consumeAmmo effect empties it. Once per magazine cycle.
2. `fullBurstEnter` trigger: fires for EVERY unit on EVERY team Full Burst entry (sim.ts:2872), not only on rotations the unit herself bursts.
3. `burstCast` trigger: fires on the unit's OWN burst cast. Burst-slot flatDamage keyed to burstCast is FB-exempt (engine `skillNoFb` applies it); a verified project fact (2026-07-13) is that burst-cast damage lands BEFORE the Full Burst window opens, so it never takes the +50% FB major.
4. ENEMY-BUFF CHANNEL (the crux of the S1 divergence): for blocks with `target: {kind:'enemy'}`, the engine admits ONLY `damageTakenPct` / `distributedDamagePct` with value > 0. Every other enemy-targeted buff — explicitly ATK▼ and DEF▼ — is dropped at dispatch (sim.ts:2295 comment: "other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0") and emits NO buffApply. The sim's basis is one immortal, partless, DEF=0 boss that deals no damage (no HP pools, no incoming-damage model).
5. flatDamage ("function damage") conventions (measured 2026-07-13, U1/U10): crits at the caster's rate by default, NEVER cores unless `core:true` is authored, NEVER takes the +30% range bonus (noRange), FB applies by actual proc timing for skill slots. Lands in the `skill` bucket with srcSlot of the owning slot; burst-slot instances land in the `burst` bucket.
6. `defPct` is a real StatKey but deliberately INERT in v1 ("self DEF doesn't affect own damage — Endurance cube", types.ts:60). The boss deals no damage, so self DEF has no observable in the DPS sim.
7. Skill damage instances (flatDamage procs included) feed weapon-base burst gauge (`skillGauge`, sim.ts:2447) — so removing a rider can shift FB timing by ~1 frame and move teammates' totals ~1e-5 relative.
8. Fixture used by both test files: controlComp('crow') = liter (B1) / crown (B2) / crow (B3) / helm (B3, the SR/Water Helm), boss Fire, focus crow, 180s, deterministic (no seed). helm shares the B3 slot with crow, so crow casts every other Full Burst (5 casts in the observed run); crow's SMG cycles a magazine every ~8s (≈22 last-bullet events per fight). crown also grants crow a defPct 37.44 buff (different caster/magnitude) — readers asserting crow's own DEF line must scope by caster.

## PART 4 — S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5) + DRIVER RECONCILIATION

Driver reconciliation: FULL CONVERGENCE, leakDetected null. The reviewer's per-line spec agreed with the driver on all four lines: S1 UNMODELED-verbatim (enemy ATK▼ has no sim channel; reviewer's own nearest-wrong was "upgrading" it to a boss damageTakenPct amp — forbidden), S2 rider lastBullet flatDamage 89.09 (once per magazine, never per shot; never cores, never ranges), S2 self defPct 12.72/5s (faithful, engine-inert), burst burstCast 915.75 (never fullBurstEnter; the fixture's helm co-B3 makes that divergence observable). The driver adopted two reviewer-suggested pins: (a) rider never-cores/never-range assertions, (b) burst nuke count strictly less than the team fullBurstStart count (helm takes rotations). The reviewer's note independently predicted the exact divergence S5 later produced (its note (1): skill1 enemy ATK▼ must NOT be "upgraded" so the line "does something").

```json
{
  "slug": "crow",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "All enemies: ATK ▼ 19.93% for 10 sec",
      "disposition": "UNMODELED",
      "scope": "Enemy stat debuff (boss ATK down) — purely defensive; the sim's boss deals no damage and no StatKey expresses enemy ATK, so it cannot move any team damage.",
      "durationSemantics": "durationSec 10 — genuine wall-clock seconds ('for 10 sec'), not rounds.",
      "triggerIdentity": "fullBurstEnter — 'Activates when entering Full Burst' fires on ANY team Full Burst, not only rotations crow bursts (no burstCast gating in the text).",
      "targetSet": "enemy (all enemies = the single boss at scope lock).",
      "nearestWrongModel": "Mis-encoding the enemy ATK ▼ as a team-benefiting boss debuff — i.e. damageTakenPct +19.93 on the boss for 10s per FB — which would inflate the WHOLE team's damage every Full Burst. The text is ATK ▼ (what the boss deals), not 'Damage Taken ▲' (what the boss receives).",
      "distinguishingAssertion": "Run controlComp(crow) twice: shipped override vs withPatchedOverride stripping every skill1 block. totals() must be IDENTICAL for all 5 slugs, and the event log must contain NO buffApply with stat 'damageTakenPct' sourced from crow's skill1. A damageTakenPct buffApply with value ≈19.93, or any totals delta, is RED (the nearest-wrong encoding).",
      "inertness": "Must move zero damage for every unit in the comp; must not emit damageTakenPct. Belongs verbatim in the override's unmodeled.skill1.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Last bullet hits: 89.09% ATK add'l dmg",
      "disposition": "FAITHFUL",
      "scope": "A flat-damage function rider — scales off crow's final ATK; per the function-damage rules it takes FB by timing (noFb default OFF/absent), is force-excluded from the +30% range bonus (noRange), crits at caster sheet rate, and gets NO core (text does not say core strike).",
      "durationSemantics": "Instant per activation — no duration.",
      "triggerIdentity": "lastBullet — 'Activates when the last bullet hits the target' is the per-magazine trigger (fires once per 120-round magazine cycle, i.e. once per reload-start), NOT per shot and NOT per hit.",
      "targetSet": "enemy ('Affects the target').",
      "nearestWrongModel": "Keying the rider to shotFired or hitCount (every pull / every N hits) instead of lastBullet — with ammo 120 at SMG cadence that over-fires the proc by roughly two orders of magnitude (≈120 procs per magazine instead of 1). Secondary misread: interval trigger, or marking the hit core:true.",
      "distinguishingAssertion": "In controlComp(crow), count crow-sourced 'damage' events in the skill bucket carrying mult ≈ 0.8909 (or filter by the rider's atkPct). The count must EQUAL the number of crow 'reload' events (± the final partial magazine, since the rider fires at magazine exhaustion which coincides with reload-start) — roughly the 180s fight divided by (magazine time + ~2s reload), on the order of ~20, NOT on the order of thousands (shotFired misread). Each such event must have core rate 0 and rangeApplied false; inFullBurst may be true when the last bullet lands inside FB (FB-by-timing is correct).",
      "inertness": "Must not scale with hit count within a magazine; must contribute zero core-bucket damage; must not fire during a reload-locked window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Last bullet hits: self DEF ▲ 12.72% 5s",
      "disposition": "FAITHFUL",
      "scope": "Self DEF stat buff — defPct exists in the StatKey schema and is deliberately inert in v1 (self DEF never feeds own damage). Keep the buff for kit completeness / future consumers rather than dropping it (taxonomy: never skip DEF/HP lines on isolation — a teammate 'when DEF up' consumer could exist).",
      "durationSemantics": "durationSec 5 — wall-clock seconds, refreshed each magazine's last bullet.",
      "triggerIdentity": "lastBullet, same activation as the damage rider — one block or two blocks on the same trigger; NOT interval, NOT reload-completion.",
      "targetSet": "self ('Affects self') — caster-slot overwrite on refresh.",
      "nearestWrongModel": "Either dropping the line silently (no buffApply, nothing in unmodeled — a silent drop), or mis-targeting it to allies, or — worst — mis-encoding DEF ▲ as a damage-relevant stat (e.g. atkPct 12.72 self), which would add a real ~13% ATK uptime buff the kit does not grant.",
      "distinguishingAssertion": "Event log must show a buffApply with stat 'defPct', value 12.72, targetSlug 'crow', casterIdx === targetIdx (self), following each crow reload cycle. RED if the buffApply carries stat 'atkPct' (damage-moving misread) or targets allies. Inertness leg: withPatchedOverride removing ONLY this buff must leave totals() bitwise identical for all units (defPct is engine-inert).",
      "inertness": "Zero damage movement for crow and all teammates — a totals() delta from this line means it was encoded as a damage stat.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Highest final ATK enemy: 915.75% Burst",
      "disposition": "FAITHFUL",
      "scope": "Burst Skill damage — lands in the burst bucket. Per the measured convention, burst-cast instant damage lands BEFORE the Full Burst window opens: no +50% FB major, no entry auras (FB-exempt always). Crits at caster rate; no core (text says nothing about core strike); no range bonus on the instant-damage path.",
      "durationSemantics": "Instant, once per crow burst cast (cd 40s).",
      "triggerIdentity": "burstCast — crow's OWN burst cast, never fullBurstEnter. These diverge exactly when another Burst III unit shares the team (the control fixture includes helm as the fixed co-B3): fullBurstEnter would fire crow's 915.75% nuke on rotations helm bursts, over-crediting every alternating rotation.",
      "targetSet": "enemy — 'the enemy with the highest final ATK' collapses to the single boss at scope lock (target-selection clause is scope-trivial).",
      "nearestWrongModel": "Keying the nuke to fullBurstEnter (fires on EVERY team FB including helm's rotations — roughly doubles burst-slot damage in the control comp), and/or letting it take the +50% Full Burst bonus (fbMajorApplied true), which the burst-lands-pre-FB rule forbids.",
      "distinguishingAssertion": "In controlComp(crow) with the fixed helm co-B3: (a) the count of crow-sourced 'damage' events in the burst bucket must EQUAL the count of crow 'burstCast' events and be STRICTLY LESS than the count of 'fullBurstStart' events (helm takes some rotations); (b) every such event must have fbMajorApplied === false and inFullBurst === false (cast resolves pre-FB). RED under fullBurstEnter keying (counts equal FB count) or under FB-major application.",
      "inertness": "Must NOT fire on Full Bursts chained by helm's burst; must NOT receive the +50% FB major or entry auras; must not core.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill2:lastBullet-89.09%-flatDamage-rider",
    "skill2:lastBullet-self-defPct-12.72-5s",
    "burst:burstCast-915.75%-burst-nuke"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "■ Affects all enemies. Activates when entering Full Burst. ATK ▼ 19.93% for 10 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to reconcile: (1) skill1 enemy ATK ▼ silently 'upgraded' to a damageTakenPct boss debuff so the line 'does something' — it is a defensive debuff and must stay unmodeled/inert; assert zero totals movement. (2) skill2 rider cadence: lastBullet fires once per 120-round magazine (~20 procs/fight), so any encoding whose proc count scales with shots-per-magazine is the nearest-wrong; also note SMG hitsPerShot 2 is irrelevant to lastBullet (magazine-keyed, not hit-keyed) — a hitCount misread would additionally double-count via the 2-hit shots. (3) burst nuke keyed to fullBurstEnter or given the +50% FB major — the control fixture's fixed helm B3 slot makes this divergence directly observable (crow burst-bucket event count vs fullBurstStart count). (4) All four magnitudes (19.93 / 89.09 / 12.72 / 915.75) are kit-literal → DATAMINED; the only ⚑-class quantity in this kit is the SMG cadence tuple itself (owned by base stats, not by any kit line). No stacks, rounds, swaps, or resource pools anywhere in the kit — duration semantics are all plain seconds.",
  "model": "claude-fable-5"
}
```

## PART 5 — S5 BLIND TEST (claude-opus-5) + green/red count vs driver override

The pristine blind artifact (blind/crow.test.ts) could not even collect against the shipped harness: it imported the harness from a wrong path and patched overrides through a `ov.<slot>.blocks` shape that does not exist (the slot IS the block array). The driver produced blind/crow.adapted.test.ts (shown below) with 8 documented structural corrections — every one marked `ADAPT #n` inline, assertion INTENT unchanged (ade-agent-bunny precedent).

RESULT vs the DRIVER override: **20 GREEN / 3 RED / 3 skipped** (26 total).
The 3 RED are ALL in the S1 describe and are the honest S5-vs-driver divergence you must rule on:

1. "emits a boss-held ATK-down buffApply at each Full Burst entry" — S5 expects the encoded enemy ATK▼ to emit one buffApply per FB entry; the driver override leaves S1 UNMODELED, and per engine fact #4 (PART 3) the engine drops enemy ATK▼ at dispatch — no buffApply is possible even if the block were authored.
2. "DISCRIMINATES: it is an ENEMY debuff, not a team ATK buff" — counterfactual patches crow's skill1 blocks (there are none) so it observes no delta.
3. "DISCRIMINATES: trigger is fullBurstEnter, not burstCast" — same root cause (no S1 blocks to patch).
   Note the split between the two opus blinds: S5 (test writer) assumed S1 encodable as a boss-held debuff; S6 (override writer, PART 6) independently ruled S1 unmodelable for the same reason the driver did. S1 INERTNESS ("removing skill1 leaves totals byte-identical") is GREEN.

```typescript
// ADAPTED COPY (driver reconciliation, 2026-08-04): pristine blind artifact preserved at
// blind/crow.test.ts. Structural corrections to blind-writer assumptions that were unverifiable
// from the redacted packet — assertion INTENT unchanged in every case:
//   1. harness import path: ../lib/harness.js -> ../../tests/lib/harness.js (harness lives in scripts/tests/lib/)
//   2. override shape: ov.<slot>!.blocks -> ov.<slot> (the slot IS the block array in the shipped schema)
//   3. crowIdx read `base.units` (fixture OPTIONS object) — the SimResult carries .units
//   4. S2a cadence readers: scoped to crow (comp-mates also reload / emit skill2-bucket damage)
//   5. S2a teammate-inertness: byte-equality -> 0.1% relative (skill damage feeds weapon-base burst
//      gauge, so removing the rider shifts FB timing ~1 frame; an ally-facing buff would move %)
//   6. S2b defPct readers: scoped to casterIdx === crow (crown grants crow a different defPct buff)
//   7. durationShots: the engine emits null (not undefined) when there is no round-count budget
//   8. burst readers: scoped to crow (helm, the fixed co-B3, also casts a burst nuke)
// NOTE: the S1 describe asserts a boss-held ATK-down buffApply — the driver override leaves S1
// UNMODELED (engine drops enemy ATK-down at dispatch, sim.ts:2295; exia precedent). Those assertions
// are the honest S5-vs-driver divergence left INTACT for the S7 reconciling judge.
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
 * crow — Crow (SMG/Fire/Defender/Burst III), blind kit spec test.
 *
 * KIT (ground truth, read literally):
 *   skill1: "Affects all enemies. Activates when entering Full Burst."
 *           ATK v 19.93% for 10 sec.
 *     -> trigger fullBurstEnter (team-wide FB entry, NOT ownBurstGate: the text
 *        says "entering Full Burst", not "when using Burst Skill"), target enemy,
 *        a BOSS-HELD debuff. In v1 the boss's ATK is not a damage input, so this
 *        line is offensively INERT — but it must still be encoded (completeness),
 *        and it must NOT be mis-encoded as a self/ally atkPct buff (the nearest-
 *        wrong model, which would ADD ~19.93% ATK to the team instead of being a
 *        no-op on the enemy).
 *
 *   skill2 (two blocks, SAME activation clause):
 *     a) "Activates when the last bullet hits the target. Affects the target."
 *        Deals 89.09% of final ATK as additional damage.
 *          -> trigger lastBullet, target enemy, flatDamage atkPct 89.09.
 *             Per-MAGAZINE (ammo 120, reload 121f), NOT per-shot.
 *     b) "Activates when the last bullet hits the target. Affects self."
 *        DEF ^ 12.72% for 5 sec.
 *          -> trigger lastBullet, target self, buff defPct (INERT for damage by
 *             schema note: "self DEF doesn't affect own damage"), 5 sec.
 *
 *   burst: "Affects the enemy with the highest final ATK."
 *          Deals 915.75% of final ATK as Burst Skill damage.
 *     -> trigger burstCast, target enemy (single boss == "the enemy with the
 *        highest final ATK"), flatDamage atkPct 915.75 in the burst bucket.
 *        Burst-cast damage lands BEFORE Full Burst opens (verified project fact),
 *        so it is FB-exempt by timing.
 *
 * FIXTURE: controlComp('crow', true) — Crow is Burst III, so a lone-B3 comp makes
 * ZERO full bursts; the control comp's B1+B2 make her burst actually cast and make
 * fullBurstEnter fire. Deterministic (no seed). Boss is Fire in controlComp; Crow is
 * Fire, so no elemental advantage is in play (a wash for these structural asserts).
 *
 * DISCRIMINATION STRATEGY: every FAITHFUL line gets an assertion that is GREEN under
 * the literal reading and RED under the nearest-wrong model built with
 * withPatchedOverride (a self-buff mis-scope for S1, a shotFired mis-trigger for S2a,
 * a fullBurstEnter mis-trigger for the burst). Inertness assertions pin that
 * teammates are byte-identical and that damage lands in the right bucket only.
 *
 * FLAGGED (⚑ — outside the input domain, NOT asserted as fact):
 *   - cadence tuple (pullsPerSec for the SMG) is datamine-unreliable; every
 *     magazine-count assertion below is written as a RANGE, never an exact count.
 *   - hitsPerShot 2 means "rounds" consumed per trigger pull is 2, so 120 ammo is
 *     ~60 pulls; the exact lastBullet count over 180s is cadence-dependent -> range.
 */

const SLUG = 'crow';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  });
  return { res, events };
}

const base = controlComp(SLUG, true);

// ---- hoisted runs (each is a full 180s sim) -------------------------------

const BASE = run(base);

// S1 nearest-wrong: the enemy ATK-down mis-encoded as a TEAM ATK buff of the same
// magnitude (the classic "debuff read as buff" scope error).
const S1_ASBUFF = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) {
        b.target = { kind: 'allies' };
        for (const e of b.effects) {
          if (e.kind === 'buff') {
            e.stat = 'atkPct';
            e.value = Math.abs(e.value);
          }
        }
      }
    }),
  },
});

// S1 nearest-wrong #2: keyed to burstCast instead of fullBurstEnter.
const S1_BURSTCAST = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1) b.trigger = { kind: 'burstCast' };
    }),
  },
});

// S2a nearest-wrong: the 89.09% rider fired per TRIGGER PULL instead of per MAGAZINE.
const S2A_PERSHOT = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill2) {
        if (b.effects.some((e) => e.kind === 'flatDamage')) {
          b.trigger = { kind: 'shotFired' };
        }
      }
    }),
  },
});

// S2a removed entirely — proves the rider is load-bearing (non-vacuity).
const S2A_OFF = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = ov.skill2.filter(
        (b) => !b.effects.some((e) => e.kind === 'flatDamage')
      );
    }),
  },
});

// Burst nearest-wrong: the 915.75% nuke keyed to fullBurstEnter instead of burstCast,
// which would illegitimately collect the +50% Full Burst major.
const BURST_FBENTER = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst) b.trigger = { kind: 'fullBurstEnter' };
    }),
  },
});

// Burst removed — non-vacuity for the burst bucket.
const BURST_OFF = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      ov.burst = ov.burst.filter(
        (b) => !b.effects.some((e) => e.kind === 'flatDamage')
      );
    }),
  },
});

// ---- helpers -------------------------------------------------------------

// ADAPT #3: `base` is the fixture OPTIONS object (no .units) — the result carries .units.
const crowIdx = (res: ReturnType<typeof runComp>) =>
  unitOf(res, SLUG) &&
  res.units.findIndex((u: { slug: string }) => u.slug === SLUG);

const evs = (r: typeof BASE, kind: string) =>
  r.events.filter((e) => e.kind === kind);

const crowDamage = (r: typeof BASE) =>
  evs(r, 'damage').filter(
    (e) =>
      (e as { srcSlug?: string }).srcSlug === SLUG ||
      (e as { srcSlot?: string }).srcSlot !== undefined
  );

const teammates = (res: ReturnType<typeof runComp>) => {
  const t = totals(res);
  const out: Record<string, number> = {};
  for (const k of Object.keys(t)) if (k !== SLUG) out[k] = t[k];
  return out;
};

describe('crow — fixture sanity (non-vacuity preconditions)', () => {
  it('the control comp actually casts bursts and enters Full Burst', () => {
    // A lone Burst III makes ZERO full bursts; controlComp(_, true) supplies B1/B2.
    expect(evs(BASE, 'fullBurstStart').length).toBeGreaterThan(0);
    const casts = evs(BASE, 'burstCast');
    expect(casts.length).toBeGreaterThan(0);
    // Crow herself must cast — the burst line's assertions depend on it.
    expect(
      casts.some(
        (e) =>
          (e as { slug?: string }).slug === SLUG ||
          (e as { targetSlug?: string }).targetSlug === SLUG ||
          JSON.stringify(e).includes(SLUG)
      )
    ).toBe(true);
  });

  it('crow is in the comp and deals damage', () => {
    expect(totals(BASE.res)[SLUG]).toBeGreaterThan(0);
  });

  it('crow reloads at least twice, so lastBullet is genuinely exercised', () => {
    // ammo 120 / hitsPerShot 2 => ~60 pulls per magazine; reload 121 frames.
    // ⚑ cadence is datamine-unreliable, so this is a RANGE, not an exact count.
    expect(evs(BASE, 'reload').length).toBeGreaterThanOrEqual(2);
  });
});

describe('crow skill1 — "Affects all enemies. Activates when entering Full Burst." ATK v19.93% / 10s', () => {
  it('emits a boss-held ATK-down buffApply at each Full Burst entry', () => {
    // Boss-held debuffs emit buffApply with casterIdx === null AND targetIdx === null,
    // so they are filtered by stat + value, not by index.
    const bossHeld = evs(BASE, 'buffApply').filter(
      (e) =>
        (e as { casterIdx?: number | null }).casterIdx === null &&
        (e as { targetIdx?: number | null }).targetIdx === null
    );
    const atkDown = bossHeld.filter(
      (e) => Math.abs(Number((e as { value: number }).value) + 19.93) < 1e-6
    );
    const fbStarts = evs(BASE, 'fullBurstStart').length;
    expect(fbStarts).toBeGreaterThan(0);
    // One application per FB entry (the line has no everyN / no own-burst gate).
    expect(atkDown.length).toBe(fbStarts);
  });

  it('DISCRIMINATES: it is an ENEMY debuff, not a team ATK buff — mis-scoping it inflates the whole comp', () => {
    // Nearest-wrong: same magnitude applied to allies as atkPct. Under the faithful
    // reading the line is offensively inert at scope (boss ATK is not a damage input),
    // so the mis-scoped model must move the board and the faithful one must not.
    const t0 = totals(BASE.res);
    const t1 = totals(S1_ASBUFF.res);
    expect(t1[SLUG]).toBeGreaterThan(t0[SLUG]);
    // and it leaks onto teammates too — the tell-tale of the buff mis-scope
    const m0 = teammates(BASE.res);
    const m1 = teammates(S1_ASBUFF.res);
    expect(Object.keys(m0).some((k) => m1[k] > m0[k])).toBe(true);
  });

  it("DISCRIMINATES: trigger is fullBurstEnter (any team FB), not burstCast (only crow's own rotations)", () => {
    const faithful = evs(BASE, 'buffApply').filter(
      (e) =>
        (e as { casterIdx?: number | null }).casterIdx === null &&
        Math.abs(Number((e as { value: number }).value) + 19.93) < 1e-6
    ).length;
    const wrong = evs(S1_BURSTCAST, 'buffApply').filter(
      (e) =>
        (e as { casterIdx?: number | null }).casterIdx === null &&
        Math.abs(Number((e as { value: number }).value) + 19.93) < 1e-6
    ).length;
    // burstCast fires only on rotations crow herself bursts, and PRE-FB; the counts
    // and/or frames must differ from the FB-entry keying.
    expect(faithful).toBeGreaterThan(0);
    expect(faithful).not.toBe(wrong);
  });

  it('INERTNESS: the ATK-down moves NO damage at scope (boss ATK is not a sim input)', () => {
    // Removing the whole skill1 slot must leave every unit byte-identical.
    const noS1 = run({
      ...base,
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          ov.skill1 = [];
        }),
      },
    });
    expect(totals(noS1.res)).toEqual(totals(BASE.res));
  });
});

describe('crow skill2a — "when the last bullet hits the target" -> 89.09% of final ATK', () => {
  it('fires once per magazine, matching the reload count (not once per shot)', () => {
    // ADAPT #4: scope to CROW — the comp's other units also reload and also emit
    // skill2-bucket damage; the assertion intent is crow's own magazine cadence.
    const reloads = evs(BASE, 'reload').filter(
      (e) => (e as { slug?: string }).slug === SLUG
    ).length;
    const riders = evs(BASE, 'damage').filter(
      (e) =>
        (e as { slug?: string }).slug === SLUG &&
        (e as { bucket?: string }).bucket === 'skill' &&
        (e as { srcSlot?: string }).srcSlot === 'skill2'
    );
    expect(riders.length).toBeGreaterThan(0);
    // lastBullet fires at magazine end; allow +-1 for a partial final magazine at
    // the 180s cutoff. ⚑ exact count is cadence-dependent (datamine-unreliable).
    expect(Math.abs(riders.length - reloads)).toBeLessThanOrEqual(1);
  });

  it('DISCRIMINATES: per-MAGAZINE, not per-PULL — the shotFired mis-trigger fires ~an order of magnitude more often', () => {
    const faithful = evs(BASE, 'damage').filter(
      (e) =>
        (e as { srcSlot?: string }).srcSlot === 'skill2' &&
        (e as { bucket?: string }).bucket === 'skill'
    ).length;
    const wrong = evs(S2A_PERSHOT, 'damage').filter(
      (e) =>
        (e as { srcSlot?: string }).srcSlot === 'skill2' &&
        (e as { bucket?: string }).bucket === 'skill'
    ).length;
    // ~60 pulls per magazine => the wrong model must be many times larger.
    expect(wrong).toBeGreaterThan(faithful * 5);
    expect(totals(S2A_PERSHOT.res)[SLUG]).toBeGreaterThan(
      totals(BASE.res)[SLUG]
    );
  });

  it("NON-VACUITY: removing the rider strictly lowers crow's total (the fixture exercises it)", () => {
    expect(totals(S2A_OFF.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('lands in the SKILL bucket and never cores or takes range (a flat rider, not a normal attack)', () => {
    const riders = evs(BASE, 'damage').filter(
      (e) =>
        (e as { srcSlot?: string }).srcSlot === 'skill2' &&
        (e as { bucket?: string }).bucket === 'skill'
    );
    expect(riders.length).toBeGreaterThan(0);
    for (const r of riders) {
      // riders take no +30% range bonus (engine force-sets noRange on function damage)
      expect((r as { rangeApplied?: boolean }).rangeApplied).toBeFalsy();
      // no core unless the kit says "core strike damage" — this line does not
      expect(Number((r as { coreRate?: number }).coreRate ?? 0)).toBe(0);
    }
  });

  it("INERTNESS: the rider moves no teammate's damage", () => {
    // ADAPT #5: strict byte-equality is unsound here — skill damage feeds weapon-base
    // burst gauge (sim.ts skillGauge), so removing the rider shifts FB timing by ~1 frame
    // and teammates' totals move ~1e-5 relative. Intent: NO ally-facing buff, which would
    // move teammates by double-digit percents, not 1e-5. Compare at 0.1% relative.
    const m0 = teammates(BASE.res);
    const m1 = teammates(S2A_OFF.res);
    for (const k of Object.keys(m0)) {
      expect(Math.abs(m1[k] - m0[k]) / m0[k]).toBeLessThan(1e-3);
    }
  });
});

describe('crow skill2b — "when the last bullet hits the target. Affects self." DEF ^12.72% / 5s', () => {
  it('emits a SELF defPct buffApply on the same lastBullet trigger', () => {
    // ADAPT #6: scope to buffs CAST BY CROW — crown also grants a defPct buff onto crow
    // (different caster, different magnitude); the intent is crow's own S2b line.
    const defBuffs = evs(BASE, 'buffApply').filter(
      (e) =>
        (e as { stat?: string }).stat === 'defPct' &&
        (e as { targetSlug?: string }).targetSlug === SLUG &&
        (e as { casterIdx?: number | null }).casterIdx === crowIdx(BASE.res)
    );
    expect(defBuffs.length).toBeGreaterThan(0);
    for (const b of defBuffs) {
      expect(Number((b as { value: number }).value)).toBeCloseTo(12.72, 6);
      // self-targeted: caster and target are the same unit
      expect((b as { casterIdx?: number | null }).casterIdx).not.toBeNull();
      expect((b as { casterIdx?: number }).casterIdx).toBe(
        (b as { targetIdx?: number }).targetIdx
      );
    }
  });

  it('shares the lastBullet cadence with the 89.09% rider (same activation clause)', () => {
    // ADAPT #6 (as above): crow-cast defPct only; crow-sourced riders only.
    const defBuffs = evs(BASE, 'buffApply').filter(
      (e) =>
        (e as { stat?: string }).stat === 'defPct' &&
        (e as { targetSlug?: string }).targetSlug === SLUG &&
        (e as { casterIdx?: number | null }).casterIdx === crowIdx(BASE.res)
    ).length;
    const riders = evs(BASE, 'damage').filter(
      (e) =>
        (e as { slug?: string }).slug === SLUG &&
        (e as { srcSlot?: string }).srcSlot === 'skill2' &&
        (e as { bucket?: string }).bucket === 'skill'
    ).length;
    expect(defBuffs).toBe(riders);
  });

  it('INERTNESS: defPct is offensively inert — removing it changes no damage anywhere', () => {
    const noDef = run({
      ...base,
      overrides: {
        [SLUG]: withPatchedOverride(SLUG, (ov) => {
          for (const b of ov.skill2) {
            b.effects = b.effects.filter(
              (e) => !(e.kind === 'buff' && e.stat === 'defPct')
            );
          }
          ov.skill2 = ov.skill2.filter((b) => b.effects.length > 0);
        }),
      },
    });
    expect(totals(noDef.res)).toEqual(totals(BASE.res));
  });

  it('carries a 5-second window, not a permanent grant', () => {
    // ADAPT #6 (as above): crow-cast defPct only.
    const first = evs(BASE, 'buffApply').find(
      (e) =>
        (e as { stat?: string }).stat === 'defPct' &&
        (e as { targetSlug?: string }).targetSlug === SLUG &&
        (e as { casterIdx?: number | null }).casterIdx === crowIdx(BASE.res)
    );
    expect(first).toBeDefined();
    const exp = Number((first as { expiresFrame: number }).expiresFrame);
    const frame = Number((first as { frame: number }).frame ?? 0);
    // 5 sec at 60fps = 300 frames. There is no buffRemove on natural lapse, so the
    // window is read off expiresFrame.
    expect(exp - frame).toBe(300);
    // and it is NOT a round-count duration
    // ADAPT #7: the engine emits durationShots: null (not undefined) when there is none.
    expect(
      (first as { durationShots?: number | null }).durationShots
    ).toBeNull();
  });
});

describe('crow burst — "the enemy with the highest final ATK" -> 915.75% of final ATK', () => {
  it('emits one burst-bucket instance per crow burst cast', () => {
    // ADAPT #8: scope to CROW — helm (the fixed B3) also casts a burst nuke, and the
    // count range below is about crow's own casts (cd 40s, shared B3 slot).
    const bursts = evs(BASE, 'damage').filter(
      (e) =>
        (e as { slug?: string }).slug === SLUG &&
        (e as { bucket?: string }).bucket === 'burst' &&
        (e as { srcSlot?: string }).srcSlot === 'burst'
    );
    expect(bursts.length).toBeGreaterThan(0);
    // Crow's cd is 40s over a 180s fight -> a handful of casts. ⚑ the exact count is
    // rotation arithmetic, not a kit fact, so this is a RANGE.
    expect(bursts.length).toBeGreaterThanOrEqual(3);
    expect(bursts.length).toBeLessThanOrEqual(6);
  });

  it('burst damage is FB-EXEMPT by timing (the cast lands before Full Burst opens)', () => {
    // ADAPT #8 (as above): crow-sourced burst damage only.
    const bursts = evs(BASE, 'damage').filter(
      (e) =>
        (e as { slug?: string }).slug === SLUG &&
        (e as { bucket?: string }).bucket === 'burst' &&
        (e as { srcSlot?: string }).srcSlot === 'burst'
    );
    for (const b of bursts) {
      expect((b as { fbMajorApplied?: boolean }).fbMajorApplied).toBeFalsy();
    }
  });

  it('DISCRIMINATES: keyed to burstCast, not fullBurstEnter — the wrong keying collects the +50% FB major', () => {
    const wrong = evs(BURST_FBENTER, 'damage').filter(
      (e) =>
        (e as { bucket?: string }).bucket === 'burst' &&
        (e as { srcSlot?: string }).srcSlot === 'burst'
    );
    expect(
      wrong.some((e) => (e as { fbMajorApplied?: boolean }).fbMajorApplied)
    ).toBe(true);
    expect(totals(BURST_FBENTER.res)[SLUG]).toBeGreaterThan(
      totals(BASE.res)[SLUG]
    );
  });

  it("NON-VACUITY: removing the burst nuke strictly lowers crow's total", () => {
    expect(totals(BURST_OFF.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('INERTNESS: the burst nuke is single-target enemy damage — no teammate is moved', () => {
    expect(teammates(BURST_OFF.res)).toEqual(teammates(BASE.res));
  });
});

describe('crow — cross-line inertness / no invented mechanics', () => {
  it('crow grants NO ally offensive buff (her kit has no ally-facing line)', () => {
    const allyBuffs = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as { targetSlug?: string }).targetSlug !== undefined &&
        (e as { targetSlug?: string }).targetSlug !== SLUG &&
        (e as { casterIdx?: number | null }).casterIdx === crowIdx(BASE.res)
    );
    expect(allyBuffs).toHaveLength(0);
  });

  it('crow declares no weapon swap, no pierce, no DoT — nothing the kit text does not state', () => {
    const kinds = new Set(
      BASE.events
        .filter((e) => e.kind === 'damage')
        .map((e) => String((e as { bucket?: string }).bucket))
    );
    // only normal / skill / burst buckets appear for crow's kit
    for (const k of kinds) {
      expect(['normal', 'core', 'skill', 'burst']).toContain(k);
    }
  });
});

describe.skip('crow — GAPS (unobservable / outside the input domain)', () => {
  it.skip('S1 boss ATK-down magnitude is unverifiable: v1 models no boss offense, so 19.93% has no observable consequence', () => {
    // GAP: the engine has no boss-ATK consumer. The line is encoded for completeness
    // and asserted only via its buffApply event + a strict damage-inertness check.
  });

  it.skip('SMG cadence tuple (pulls/sec) is datamine-unreliable — no exact shot/magazine count is asserted', () => {
    // GAP (ALWAYS-⚑ #1): rate_of_fire is a known-unreliable datamine field, and the
    // effective rate is frame-quantized (60/ceil(60/nominal)). Every count assertion
    // above is therefore a range or a relative comparison, never an exact number.
  });

  it.skip('"the enemy with the highest final ATK" is untestable at scope — the fight has exactly one enemy', () => {
    // GAP: single-boss scope collapses the target-selection clause to target:enemy.
    // A multi-enemy fixture would be needed to discriminate the selection rule.
  });
});
```

## PART 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver

DIFF vs the driver override (src/skills/overrides/crow.json, PART 7b): the four enactable decisions are BLOCK-FOR-BLOCK IDENTICAL —
skill1: [] with S1 recorded verbatim in unmodeled (S6 split the prose into two strings; the driver keeps it as one — cosmetic only);
skill2: [lastBullet -> enemy flatDamage 89.09, lastBullet -> self defPct 12.72 durationSec 5];
burst: [burstCast -> enemy flatDamage 915.75].
S6's own audit arrived at the S1 ruling independently: "the schema's only enemy-facing stat is damageTakenPct (a different mechanic)... Recorded verbatim in unmodeled rather than encoded as an inert block." Its only ⚑ is the SMG cadence tuple (lastBullet proc COUNT per fight — datamine-sourced, unverified), which the driver test file also handles by asserting cadence-invariant frame-pairing instead of absolute counts. No semantic disagreements.

````json
{
  "slug": "crow",
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 89.09
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 12.72,
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
          "atkPct": 915.75
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Affects all enemies. Activates when entering Full Burst.",
      "ATK ▼ 19.93% for 10 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1 is an ENEMY ATK ▼ (all enemies, 10 s, on Full Burst entry). It is a boss-offense debuff, not a team buff: at scope lock the boss deals no modeled damage and nobody has an HP pool, so it moves zero damage. It is also not expressible as a live block — the schema's only enemy-facing stat is damageTakenPct (a different mechanic) and target {kind:'enemy'} resolves to no entity. Recorded verbatim in unmodeled rather than encoded as an inert block.",
    "skill2's DEF ▲ 12.72% is modeled as defPct, which is documented inert in v1 (self DEF does not affect own damage). Kept for kit completeness / future consumers; it contributes nothing to damage today.",
    "⚑ The 89.09% rider's REAL magnitude is set by how often lastBullet fires, i.e. by the SMG cadence + 120-round magazine + hitsPerShot 2 + reloadFrames 121 — all datamine-sourced and unverified here. Every number in the blocks is kit-literal; the per-fight proc COUNT is not.",
    "The burst hit is authored on burstCast, so it lands pre-Full-Burst by engine timing (no +50% major, no FB entry auras) per the verified burst-cast rule. noFb is deliberately NOT set — the exemption comes from cast timing, not from a per-kit flag.",
    "The 89.09% and 915.75% hits carry no 'core strike' wording, so neither is core-flagged; crit eligibility is left to the engine's flat-damage-rider default rather than asserted per-kit."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Crow (SMG/Fire/Defender/Burst III, 40 s CD, 120 ammo, hitsPerShot 2). Kit is short and almost entirely literal: S1 is an enemy ATK ▼ 19.93%/10 s on Full Burst entry — defensive-only at scope lock and left unmodeled (verbatim in unmodeled.skill1). S2 is two lastBullet-triggered lines off the same activation clause: a 89.09%-of-final-ATK rider on the target (flatDamage, no core, engine-default range/FB handling) and a self DEF ▲ 12.72%/5 s (defPct, inert in v1, kept for completeness). Burst is a single 915.75%-of-final-ATK hit on the highest-final-ATK enemy — one boss at scope lock, so target enemy; authored on burstCast, therefore pre-FB by timing. No stacks, no weapon swap, no DoT, no mode gates, no pierce. The only unmeasured quantity driving output is the lastBullet proc rate (magazine cadence)."
}```

## PART 7a — DRIVER IMPLEMENTATION: scripts/tests/units/crow.test.ts

```typescript
// PER-UNIT KIT SPEC — `crow` (Crow, Defender/SMG/Fire, Burst III, cd 40s, ammo 120,
// hitsPerShot 2, ROF 1440). Kit-autonomy gauntlet 2026-08-04 (test-first FROM-SCRATCH build).
// NOTE: there was NO shipped override before this gauntlet (simSupported was false), so the
// harness cannot even load her until src/skills/overrides/crow.json exists. The override was
// authored as the faithful encoding under test; every assertion below PINS a kit line GREEN vs
// that override and RED vs the nearest-wrong counterfactual (withPatchedOverride), so the file
// discriminates exactly as a verification gauntlet would.
//
// Kit (blablalink prose, data/characters.json → characters.crow.skills), max level:
//   S1 ■ entering Full Burst → all enemies: ATK ▼ 19.93% for 10 sec.        [UNMODELED — no channel]
//   S2 ■ last bullet hits the target → the target:
//        89.09% of final ATK as additional damage.                          [C1]
//      ■ last bullet hits the target → self:
//        DEF ▲ 12.72% for 5 sec.                                            [C2]
//   BU ■ the enemy with the highest final ATK:
//        915.75% of final ATK as Burst Skill damage.                        [C3]
//
// Modeling posture (see the override note + caveats for the full story):
//   * S1 is UNMODELED (verbatim in `unmodeled`): the engine's enemy-buff channel admits only
//     damageTakenPct/distributedDamagePct > 0 — an enemy ATK▼ is dropped at dispatch
//     (src/engine/sim.ts:2295) and the immortal DEF=0 boss deals no damage, so the line moves
//     nothing. C4 proves the skip damage-neutral (marciana/diesel precedent), never fudges it.
//   * The S2 lines ride the engine's `lastBullet` trigger (magazine fired dry — sim.ts:3930),
//     the exact kit condition ('when the LAST bullet hits'). The rider is a bare flatDamage
//     (crit-eligible, skill bucket, srcSlot skill2 — engine rider convention, helm H6). The
//     DEF▲ is defPct, faithfully encoded but damage-inert in v1 (self DEF never feeds own
//     damage — diesel/sakura/bay precedent); C2 pins the inertness instead of assuming it.
//   * The burst is burstCast -> enemy flatDamage 915.75. 'The enemy with the highest final
//     ATK' collapses to the single scope-lock boss ({kind:'enemy'} documented stand-in;
//     exia/novel precedent). The cast lands BEFORE the Full Burst window opens, so the nuke
//     never takes the +50% FB major (verified fact 2026-07-13).
//
// Nearest-wrong counterfactuals (each assertion must fail under these, or it gates nothing):
//   C1  shotFired trigger — 'additional damage on ANY hit' instead of the last-bullet gate.
//   C2  atkPct misread — DEF▲ read as ATK▲ (would turn an inert line damage-bearing).
//   C3  fullBurstEnter keying — nuke lands at FB entry (wrong frame and/or rides the major),
//       and the level-1 magnitude 541.12 against the max-level 915.75.
//   C4  the S1 line enacted anyway — must be byte-identical (proves nothing was dropped that
//       the sim could observe).
//
// Fixture: controlComp('crow') — liter (B1) / crown (B2) / crow (B3) / helm (B3), boss Fire,
// focus crow. helm shares the B3 slot, so crow casts every other Full Burst (~4 casts / 180s);
// her SMG (20 shots/s quantized off 1440 RPM, ammo 120, reload 121f) cycles a magazine every
// ~8s, so the last-bullet lines fire ~20+ times — ample cadence for both C1 and C2.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / crow 2 / helm 3. */
const CROW = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('crow'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const crowShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'crow');
const crowCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'crow');
/** S2a rider: last-bullet additional damage (srcSlot 'skill2', skill bucket). */
const riders = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'crow' && d.srcSlot === 'skill2');
/** S2b DEF▲ applications (self-held defPct at the kit magnitude). */
const defApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === CROW && b.stat === 'defPct' && b.value === 12.72
  );
/** Burst nuke instances. */
const nukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'crow' && d.srcSlot === 'burst');

// ---- counterfactual / isolation patches -------------------------------------------------------
/** C1 counterfactual: the rider fires on EVERY shot, not the last bullet (the ungated
 *  'additional damage on hit' misread). */
const crowRiderEveryShot = withPatchedOverride('crow', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b || b.trigger.kind !== 'lastBullet') {
    throw new Error('crow S2 rider block missing — fixture is stale');
  }
  b.trigger = { kind: 'shotFired' };
});
/** C2 isolation: the DEF▲ line removed — defPct is inert in v1, so this must move NO unit's
 *  total by a single point (proves inertness, not assumes it; novel N2 precedent). */
const crowNoDefBuff = withPatchedOverride('crow', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) =>
    !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('crow S2 defPct block missing — fixture is stale');
  }
});
/** C2 counterfactual: DEF▲ misread as ATK▲ (turns the inert line damage-bearing). */
const crowDefAsAtk = withPatchedOverride('crow', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('crow S2 defPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** C3 counterfactual: the nuke keyed to fullBurstEnter instead of her own burstCast. */
const crowNukeOnFbEnter = withPatchedOverride('crow', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b || b.trigger.kind !== 'burstCast') {
    throw new Error('crow burst nuke block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** C3 counterfactual: the level-1 magnitude (541.12) instead of the max-level kit value. */
const crowL1Nuke = withPatchedOverride('crow', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e || e.atkPct !== 915.75) {
    throw new Error('crow burst nuke effect missing — fixture is stale');
  }
  e.atkPct = 541.12;
});
/** C4 counterfactual: the UNMODELED S1 enemy ATK▼ enacted anyway through the only encoding
 *  available (enemy-targeted buff). The engine drops it at dispatch — totals must not move. */
const crowWithS1Debuff = withPatchedOverride('crow', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'fullBurstEnter' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'atkPct', value: -19.93, durationSec: 10 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const riderEveryShot = run({ crow: crowRiderEveryShot });
const noDefBuff = run({ crow: crowNoDefBuff });
const defAsAtk = run({ crow: crowDefAsAtk });
const nukeFbEnter = run({ crow: crowNukeOnFbEnter });
const l1Nuke = run({ crow: crowL1Nuke });
const withS1Debuff = run({ crow: crowWithS1Debuff });

describe('crow — kit spec', () => {
  it('fixture sanity: crow shares B3 with helm and casts every other Full Burst', () => {
    expect(crowCasts(base.events).length).toBeGreaterThanOrEqual(3);
  });

  describe('C1 — S2 rider: 89.09% of final ATK when the LAST bullet hits', () => {
    const hits = riders(base.events);
    const emptyShots = crowShots(base.events).filter(
      (s) => s.ammoAfter === 0
    );

    it('fires once per empty magazine (the last-bullet gate, both directions)', () => {
      expect(hits.length).toBeGreaterThanOrEqual(15);
      expect(hits.length, 'every dry shot produces exactly one rider').toBe(
        emptyShots.length
      );
      const riderFrames = hits.map((d) => d.frame).sort((a, b) => a - b);
      const dryFrames = emptyShots.map((s) => s.frame).sort((a, b) => a - b);
      expect(riderFrames, 'rider rides the dry shot frame').toEqual(dryFrames);
    });

    it('is the kit magnitude, skill bucket, crits but never cores and never takes range (function-damage rules)', () => {
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([89.09]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect([...new Set(hits.map((d) => d.critEligible))]).toEqual([true]);
      expect(
        [...new Set(hits.map((d) => d.coreEligible))],
        'text says nothing about core strike — function damage never cores (U1, 2026-07-13)'
      ).toEqual([false]);
      expect([...new Set(hits.map((d) => d.rangeApplied))]).toEqual([false]);
    });

    it('DISCRIMINATING: an ungated (every-shot) rider fires on every pull, not just the last bullet', () => {
      const all = riders(riderEveryShot.events);
      expect(all.length).toBe(crowShots(riderEveryShot.events).length);
      expect(all.length).toBeGreaterThan(hits.length * 5);
    });
  });

  describe('C2 — S2 self DEF ▲12.72% for 5s on the same last-bullet trigger', () => {
    const applies = defApplies(base.events);

    it('fires paired with the rider: same trigger, same frames', () => {
      const hits = riders(base.events);
      expect(applies.length).toBe(hits.length);
      const defFrames = applies.map((b) => b.frame).sort((a, b) => a - b);
      const riderFrames = hits.map((d) => d.frame).sort((a, b) => a - b);
      expect(defFrames).toEqual(riderFrames);
    });

    it('is self-scoped, 12.72%, a 5-second window', () => {
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([CROW]);
      for (const b of applies) {
        expect(b.expiresFrame! - b.frame, '5s duration').toBe(5 * FPS);
      }
    });

    it('is damage-INERT in v1 (self DEF never feeds own damage): removing it moves no total', () => {
      expect(base.totals).toEqual(noDefBuff.totals);
    });

    it('DISCRIMINATING: a DEF▲-as-ATK▲ misread WOULD move totals (the pin above bites)', () => {
      expect(defAsAtk.totals).not.toEqual(base.totals);
    });
  });

  describe('C3 — burst nuke: 915.75% of final ATK on HER cast, before the Full Burst window', () => {
    const hits = nukes(base.events);
    const casts = crowCasts(base.events);

    it('fires once per crow cast, at the max-level kit magnitude, in the burst bucket', () => {
      expect(hits.length).toBe(casts.length);
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([915.75]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('fires on HER casts only: strictly fewer than the team Full Burst count (helm takes rotations)', () => {
      const fbStarts = base.events.filter(
        (e) => e.kind === 'fullBurstStart'
      ).length;
      expect(hits.length).toBeLessThan(fbStarts);
    });

    it('lands on her own burstCast frames (stage 3), one instance per cast (single-target collapse)', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const d of hits) {
        expect(castFrames.has(d.frame), 'nuke rides her own cast').toBe(true);
        expect(casts.filter((c) => c.frame === d.frame).length).toBe(1);
      }
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(hits.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: a fullBurstEnter-keyed nuke fires on EVERY team Full Burst (incl. helm rotations)', () => {
      const moved = nukes(nukeFbEnter.events);
      const fbStarts = nukeFbEnter.events.filter(
        (e) => e.kind === 'fullBurstStart'
      ).length;
      expect(moved.length, 'one nuke per FB entry').toBe(fbStarts);
      expect(moved.length).toBeGreaterThan(nukes(base.events).length);
    });

    it('DISCRIMINATING: the level-1 magnitude is not the shipped value', () => {
      const l1 = nukes(l1Nuke.events);
      expect(l1.length).toBeGreaterThan(0);
      expect([...new Set(l1.map((d) => d.atkPct))]).toEqual([541.12]);
    });
  });

  describe('C4 — S1 enemy ATK▼ 19.93%/10s is UNMODELED and provably damage-neutral', () => {
    it('shipped emits no skill1 damage and no skill1 buffs from crow', () => {
      expect(
        dmg(base.events).filter(
          (d) => d.slug === 'crow' && d.srcSlot === 'skill1'
        )
      ).toEqual([]);
      expect(
        buffs(base.events).filter(
          (b) =>
            b.casterIdx === CROW &&
            (b.targetIdx === null || b.stat === 'atkPct')
        ),
        'crow applies no enemy debuff and no atkPct buff of any kind'
      ).toEqual([]);
    });

    it('enacting it anyway moves NOTHING (dropped at dispatch on the DEF=0 basis)', () => {
      expect(withS1Debuff.totals).toEqual(base.totals);
      expect(
        buffs(withS1Debuff.events).filter(
          (b) =>
            b.casterIdx === CROW && b.stat === 'atkPct' && b.value < 0
        ),
        'the dropped debuff must not even reach the enemy-buff list'
      ).toEqual([]);
    });
  });
});
````

## PART 7b — DRIVER IMPLEMENTATION: src/skills/overrides/crow.json

```json
{
  "note": "crow (Crow) — SMG / Defender / Fire / Burst III, cd 40s, ammo 120, hitsPerShot 2, ROF 1440 (20 shots/s quantized), reload 121f, normalMult 11.18, coreMult 250, base crit 15%/critDmg 150%. Kit-autonomy gauntlet 2026-08-04: FROM-SCRATCH build (no shipped override existed; simSupported was false) — test-first re-derivation pinned by scripts/tests/units/crow.test.ts (groups C1-C4), cross-family S2b (claude-fable-5) review converged on all four kit lines (leakDetected null). TIER 1: two damage lines (one lastBullet rider, one burst nuke), one inert self DEF buff, one unmodelable enemy debuff — no scoped buffs, no round counts, no status gates, nothing meta-defining among the modeled lines. SKILL1 ('Killing Time', fullBurstEnter -> all enemies ATK ▼19.93%/10s) is UNMODELED (verbatim in unmodeled): the engine's enemy-buff channel admits only damageTakenPct/distributedDamagePct > 0 — an enemy ATK▼ is dropped at dispatch (sim.ts:2295) and the immortal DEF=0 boss deals no damage, so the line moves nothing observable; the unit test proves the skip damage-neutral (C4: enacting it anyway leaves every unit's total byte-identical and emits no buffApply). exia precedent. SKILL2 ('Daredevil', both lines trigger 'when the last bullet hits the target' = the engine's lastBullet trigger, fired when the magazine is dry — sim.ts:3930; once per ~8s magazine cycle at her cadence): (a) the target takes 89.09% of final ATK as additional damage = lastBullet -> enemy flatDamage 89.09 — a function-damage rider: crits at caster rate, never cores (text states no core strike), never takes the +30% range bonus, FB by actual proc timing (engine U1 convention); bucket 'skill', srcSlot 'skill2'. (b) self DEF ▲12.72% for 5s = lastBullet -> self defPct 12.72/5s — FAITHFUL but INERT in v1 (self DEF never feeds own damage; defPct is the Endurance-cube channel — diesel/sakura/bay precedent); modeled, not dropped, and pinned inert by the unit test (byte-identical totals with the block removed). BURST ('The Terrorist'): 'the enemy with the highest final ATK' takes 915.75% of final ATK as Burst Skill damage = burstCast -> enemy flatDamage 915.75. The highest-final-ATK targeting clause collapses to the single scope-lock boss ({kind:'enemy'} documented stand-in — exia/novel precedent; v1 fields one immortal enemy, so the selection clause is scope-trivial). Burst CAST lands BEFORE the Full Burst window opens, so the nuke never takes the +50% FB major (verified fact 2026-07-13; engine skillNoFb applies it for burstCast-triggered burst blocks). Burst gauge (0.1/shot) is carried by the datamined burst_energy_pershot, not an override block. No stacks, rounds, swaps, or resource pools in this kit; every duration is plain wall-clock seconds. No ⚑: all four magnitudes (19.93 / 89.09 / 12.72 / 915.75) are kit-literal DATAMINED values; the only sim-approximation is the targeting-clause collapse, which moves no damage.",
  "unmodeled": {
    "skill1": [
      "■ Affects all enemies. Activates when entering Full Burst.\nATK ▼ 19.93% for 10 sec. — no sim channel: the enemy-buff path admits only damageTakenPct/distributedDamagePct > 0; enemy ATK▼ is dropped at dispatch (sim.ts:2295) and the immortal DEF=0 boss deals no damage, so the debuff moves nothing observable (exia precedent)"
    ],
    "skill2": [],
    "burst": []
  },
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "lastBullet" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 89.09 }]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "lastBullet" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "defPct", "value": 12.72, "durationSec": 5 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 915.75 }]
    }
  ],
  "caveats": [
    "skill1: the enemy ATK▼ line is game-real but unenactable in the DPS sim — dropped at dispatch on the DEF=0 basis (boss deals no damage); recorded verbatim in unmodeled and proven damage-neutral by the unit spec (C4)",
    "burst: 'the enemy with the highest final ATK' collapses to the single scope-lock boss — target selection is scope-trivial in the single-target sim (exia/novel precedent)",
    "skill2: the DEF▲ line is faithfully encoded but damage-inert in v1 (self DEF never feeds own damage); kept for kit completeness, pinned inert by the unit spec (C2)"
  ]
}
```
