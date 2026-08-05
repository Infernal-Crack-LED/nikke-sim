# S7 RECONCILING-JUDGE PACKET — unit `power` (Power)

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

## SECTION 2 — MECHANICS SSOT (formula + mechanics docs, verbatim)

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


---

## SECTION 3 — GROUND TRUTH: the unit's kit prose + base stats (data/characters.json, verbatim)

```json
{
  "slug": "power",
  "name": "Power",
  "weapon": "RL",
  "burst": "III",
  "class": "Attacker",
  "element": "Fire",
  "manufacturer": "Abnormal",
  "burstCooldownSec": 40,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "burstGaugePerShot": 1.4,
  "skills": {
    "skill1": "■ Activates when attacking with Full Charge. Affects self.\nBlood Fiend: ATK ▲ 6.4%, stacks up to 5 time(s) and lasts for 3 sec.",
    "skill2": "■ Activates after 18 normal attacks if Blood Fiend is at max stacks. Affects self.\nExplosion Radius ▲ 38.61% for 10 sec.\nReloads 100% of the magazine. Activates 1 time(s) per battle.",
    "burst": "■ Affects the 1 enemy unit(s) with the highest final ATK.\nDeals 1584% of final ATK as Burst Skill damage.\n■ Activates when Blood Fiend is at max stacks. Affects the same target(s).\nDeals 1584% of final ATK as additional damage."
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 88,
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
    "resourceId": 801
  }
}
```

---

## SECTION 4 — S2b cross-family test-faithfulness review (claude-fable-5, verbatim)

```json
{
  "slug": "power",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Blood Fiend: ATK ▲ 6.4%, 5 stacks, 3 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic self ATK (atkPct) — not scoped to normal/charge damage; the CHARGE scoping is on the TRIGGER (full-charge attack), not the stat.",
      "durationSemantics": "Wall-clock 3 sec, refreshed on each application (standard stack-refresh); maxStacks 5. NOT rounds, NOT permanent. With ammo 6 / reloadFrames 141 (~2.35s) the stack survives a normal reload, so steady state is 5 stacks with an opening ramp over the first ~5 full-charge shots.",
      "triggerIdentity": "Per full-charge attack by self. On an auto-firing RL (chargeFrames 60) every pull is a full charge, so this is effectively per-shot (shotFired) — but the trigger is the CHARGE SHOT, not hitCount and not passive.",
      "targetSet": "self",
      "nearestWrongModel": "Encoding it as a passive atkPct 32% (5 × 6.4%) always-on buff — instant-to-max at t=0 with no expiry — because steady state is near-permanent max stacks. Over-credits the opening ramp and any lapse window; also erases the per-application refresh semantics.",
      "distinguishingAssertion": "cfg.onEvent buffApply stream for stat 'atkPct' targeting power: FIRST application occurs at/after the first shot event (never frame 0), with stacks:1, and stacks climb 1→5 across the first 5 shots; each buffApply carries expiresFrame ≈ applyFrame + 180 (3 s at 60 fps). A passive encoding emits stacks 5 (or a single 32% apply) at frame 0 with no expiresFrame — RED.",
      "inertness": "Must not buff allies (no buffApply with targetSlug ≠ power) and must not apply to a comp where power is absent.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Explosion Radius ▲ 38.61% for 10 sec",
      "disposition": "UNMODELED",
      "scope": "Explosion radius (AoE size), self. Not a damage stat, not projectileExplosionPct (that is explosion DAMAGE — encoding radius as that stat is the classic mis-map).",
      "durationSemantics": "10 sec wall-clock — but moot at scope: the scope-lock boss is single-target/partless and hit location never changes damage, so radius size moves zero damage.",
      "triggerIdentity": "Same block as the reload line: after 18 normal attacks with Blood Fiend at max stacks, once per battle.",
      "targetSet": "self",
      "nearestWrongModel": "Mapping 'Explosion Radius ▲ 38.61%' onto projectileExplosionPct (a Damage-Up-bucket damage stat) — a plausible RL-kit misread that manufactures a +38.61% damage window that does not exist.",
      "distinguishingAssertion": "No buffApply with stat 'projectileExplosionPct' (or any damage-bucket stat) is emitted around the 18th-attack trigger, and power's per-shot damage mult is IDENTICAL on the shots immediately before vs during the 10 s window (holding S1 stacks constant at 5). Any damage delta attributable to this line is RED. The verbatim line must appear in the override's unmodeled.skill2.",
      "inertness": "Total damage for all 5 units must be invariant to this line's presence.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Reloads 100% of magazine; 1/battle",
      "disposition": "FAITHFUL",
      "scope": "Weapon-state effect (taxonomy trap 6: reload/ammo lines ARE damage — this refunds a full magazine and skips one ~141-frame reload, adding real shots).",
      "durationSemantics": "Instant, ONE TIME PER BATTLE — 'Activates 1 time(s) per battle' is a hard once-latch on the whole block, not a cooldown and not recurring.",
      "triggerIdentity": "hitCount count:18 (counts ROUNDS; RL hitsPerShot 1 → 18 pulls, i.e. during the 3rd magazine), gated on Blood Fiend at max stacks at trigger time. Given 3 s stack duration vs 2.35 s reload, the gate is satisfied at attack 18 in continuous fire, but the gate must still be encoded/checked at trigger time, not assumed.",
      "targetSet": "self (instantReload fraction 1 on power only)",
      "nearestWrongModel": "A RECURRING every-18-attacks instant reload (dropping 'Activates 1 time(s) per battle') — refunds a magazine every 3 magazines for the whole 180 s fight, skipping ~a dozen reloads and massively over-crediting shot count.",
      "distinguishingAssertion": "In the event log, power's ammo refills to max WITHOUT a reload event exactly once, immediately after her 18th round; her 36th round (and every later magazine boundary) IS followed by a normal reload event with the full ~141-frame gap. Recurring encoding shows a second gapless refill at round 36 — RED. Also assert her total shot count exceeds the no-skill2 baseline by roughly one reload's worth of shots, not N reloads' worth.",
      "inertness": "No ally's ammo/reload timeline changes; no second activation ever.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1584% of final ATK as Burst dmg",
      "disposition": "FAITHFUL",
      "scope": "Burst-skill flat damage, 1584% of power's FINAL ATK (so S1's live stacks feed it at cast). Single enemy target (highest final ATK — trivially the sole boss at scope).",
      "durationSemantics": "Instant hit per burst cast; no duration.",
      "triggerIdentity": "burstCast (power's OWN burst, cd 40 s) — NOT fullBurstEnter. Burst-cast damage lands BEFORE the Full Burst window opens: no +50% FB major, no FB-entry auras (repo-verified fact).",
      "targetSet": "enemy (1 highest final ATK)",
      "nearestWrongModel": "Letting the hit ride the Full Burst +50% (encoding on fullBurstEnter, or flatDamage without the FB exemption) — over-credits every burst by ×1.5.",
      "distinguishingAssertion": "Each of power's burst-bucket damage events has mult consistent with 1584% and carries inFullBurst:false / fbMajorApplied:false (and rangeApplied:false per the rider-range rule). A fullBurstEnter/FB-inclusive encoding emits fbMajorApplied:true — RED. Count of these events equals power's measured burst-cast count for the comp.",
      "inertness": "Lands in the burst bucket only; never cores (no 'core strike' text).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Max stacks → 1584% additional dmg",
      "disposition": "FAITHFUL",
      "scope": "A second 1584%-of-final-ATK instance on the same target, conditional — doubles the burst to 3168% only when the condition holds.",
      "durationSemantics": "Instant, per qualifying cast; no duration.",
      "triggerIdentity": "Same burstCast event, GATED on Blood Fiend being at max stacks (5) AT CAST TIME. This is a stack-threshold gate on her own S1 buff — not unconditional, and not a separate fullBurstEnter effect.",
      "targetSet": "enemy (same target as line 1)",
      "nearestWrongModel": "Unconditional doubling (a single 3168% hit or an ungated second 1584% on every cast) — the steady-state near-permanence of 5 stacks makes the gate look free, but a cast arriving during the opening ramp, right after a stack lapse, or in a rotation where she wasn't firing (chain delays / boss transition) must pay single damage. Second-nearest: keying the rider to fullBurstEnter, which both mistimes it into the FB window (+50%) and fires it on rotations another B3 bursts.",
      "distinguishingAssertion": "With the gate FORCED unsatisfied at cast (via withPatchedOverride stripping S1's stack blocks so Blood Fiend can never reach 5), power's burst cast emits exactly ONE 1584% burst-bucket instance; with S1 intact and 5 live stacks at cast, exactly TWO — both pre-FB (fbMajorApplied:false). An ungated model emits two in the stripped run — RED.",
      "inertness": "The additional hit must not appear on team Full Bursts power did not cast, and must not take the FB +50%.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Blood Fiend ATK stack buff",
    "skill2:one-time 100% magazine reload",
    "burst:1584% burst-skill damage",
    "burst:conditional additional 1584% at max stacks"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Explosion Radius ▲ 38.61% for 10 sec."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to reconcile against the driver: (1) S1 flattened to a permanent passive +32% ATK — steady state hides the ramp and the refresh semantics; the assertion pins first-apply timing and expiresFrame. (2) S2's 'Activates 1 time(s) per battle' silently dropped, turning one reload refund into a recurring every-18-rounds refund — the single highest-damage-swing trap in this kit; assert the round-36 boundary reloads normally. (3) Explosion Radius pattern-matched to projectileExplosionPct because both are RL-flavored 'explosion' stats — radius is scope-inert (partless boss, location never changes damage) and belongs verbatim in unmodeled. (4) Burst rider ungated or keyed to fullBurstEnter — must be burstCast-gated on 5 live stacks and FB-exempt (pre-FB landing, no +50%). Cadence note: chargeFrames 60 + ammo 6 means the 18th round arrives mid-3rd-magazine around ~20+ s in continuous fire; a test asserting the reload skip should locate it by round index, not wall-clock. All magnitudes are kit-literal (DATAMINED); no ⚑ estimates are required by this kit except the usual cadence tuple if the tests pin absolute timing.",
  "model": "claude-fable-5"
}

```

---

## SECTION 5 — S5 BLIND TEST (claude-opus-5, written from kit prose alone) + its result vs the DRIVER override

The blind test was extracted to scripts/kit-autonomy/blind/power.test.ts. The ONLY driver edit was a
mechanical import-path fix (blind/ sits under scripts/kit-autonomy/, so the harness import is
'../../tests/lib/harness.js' — precedent: tia.test.ts 2026-07-28; no assertion touched).

Result of `npx vitest run scripts/kit-autonomy/blind/power.test.ts` against the DRIVER override:
**8 passed | 3 failed | 3 skipped (honest blind GAPs)**. Full failure detail + driver adjudication:

1. FAIL "moves no teammate (ATK-only change cannot shift the rotation)" — noS1 (clears skill1) changes
   liter/crown totals. DRIVER ADJUDICATION: WRONG-PREMISE (test). In the driver encoding the bloodFiend
   resource pool that S2's resourceGate reads is incremented by a skill1 block; clearing skill1 kills the
   gate, so S2's one-time reload-skip stops firing, which phase-shifts the shot timeline by ~172f. The
   180s cutoff boundary then lands differently: base fires 103 shots / 4 casts, noS1 fires 104 / 5 casts —
   the 5th cast (~3168% ≈ +12.5M) lands frame ~10842 in noS1 but misses the horizon in base. Measured
   totals: liter 64.34M→65.02M, crown 109.25M→104.84M (cutoff phase), power 131.6M→102.7M (real: −32% ATK
   ramp + lost S2 + lost late cast). The test's isolation premise ("skill1 changes ATK only — never shot
   count") is false for ANY encoding that houses the stack-gate proxy in S1; the premise would only hold
   for an encoding that drops the gate entirely.
2. FAIL "the free full-magazine reload adds fire time, and only ONE of them" — expected base.total >
   noS2.total; measured 131.57M < 144.13M (3-unit comp: liter/crown/power, power sole B3). DRIVER
   ADJUDICATION: WRONG-PREMISE (test) / cutoff-phase artifact. The reload-skip is strictly ≥0 over an
   unbounded horizon, but it phase-shifts the reload cycle by ~172f; at EXACTLY 180s in this comp the
   shifted phase puts base mid-reload at the horizon while noS2 fires one extra late shot AND lands a 5th
   burst cast (casts: base 4 @ frames 642/3156/5744/8352 period ~2550f → cast 5 ≈ frame 10842 > 10800;
   noS2's phase lands cast 5 inside). 144.13−131.57 = 12.56M ≈ exactly one 3168%-of-final-ATK double
   nuke. In the driver's 4-unit fixture (liter/crown/power/helm) the same line is net-positive (+1.05M).
   The kit line is encoded faithfully (one instantReload at hit 18, gated, once per battle); the sign flip
   is a fixed-horizon phase artifact, not an encoding error.
3. FAIL "lands TWO burst-bucket instances per cast" — burstHits.length === 0. DRIVER ADJUDICATION:
   WRONG-PREMISE (test event-shape). The blind reader filters damage events by numeric casterIdx
   (idxOf returns ev.srcSlot only if typeof 'number'; damage events carry srcSlot as the STRING
   'burst'/'skill2' and have no casterIdx field — the correct key is e.slug === 'power'). With a corrected
   reader, the driver override emits burst-bucket instances for power at 2× the cast count in this comp:
   all 4 casts (frames 642/3156/5744/8352) are max-stacked (stacks reach 5 at frame ~395), so each
   double-fires — 8 instances vs 4 fbStarts, exactly 2×fbStarts. Note the test's premise "two per cast"
   is itself only true because the 3-unit comp's first FB opens late (frame 664); in the 4-unit control
   comp power's first cast (frame 322, after only 4 full charges) is genuinely below max stacks and the
   kit-faithful outcome is ONE instance on cast 1 — the driver test pins that.

The 3 skipped tests are the blind author's own honest GAPs (damage-amount field name unknown; crit/core
field names unknown; the max-stacks gate "cannot be discriminated shape-agnostically" — the author
independently concluded the engine has no buff-stack gate and a resource mirror is the nearest primitive).

```typescript
/**
 * power (Power) — RL/Fire/Attacker/Burst III — BLIND kit spec (S5, written from kit prose alone).
 *
 * KIT (what the text says)
 *   skill1  "…when attacking with Full Charge. Affects self."
 *           Blood Fiend: ATK ▲ 6.4%, up to 5 stacks, 3 sec.
 *   skill2  "…after 18 normal attacks if Blood Fiend is at max stacks. Affects self."
 *           Explosion Radius ▲ 38.61% / 10 sec  +  "Reloads 100% of the magazine"  +  1x per battle.
 *   burst   1584% of final ATK on the single target; a SECOND 1584% instance gated on max stacks.
 *
 * WHOLE-PICTURE (why the kit's own numbers hang together — this picked the assertions)
 *   ammo 6, chargeFrames 60 (1.00s), release latency 22f, reloadFrames 141 (2.35s).
 *   In-magazine shot interval ~82f = 1.37s < 3s  -> stacks accrue 1..5, capping on shot 5 of 6.
 *   Magazine gap (reload + recharge) ~201-223f = 3.35-3.7s > 3s -> Blood Fiend LAPSES at every
 *   reload and rebuilds from 1. And 18 normal attacks = exactly 3 magazines, i.e. the skill2
 *   threshold lands on a shot where the pool is already at max — the kit is self-consistent.
 *   FLAG: this rests on the datamined cadence tuple (rate_of_fire / reloadFrames are the known-
 *   unreliable fields). The lapse assertion is the one that fails first if that tuple is wrong.
 *
 * FIXTURE  controlComp('power', false) — liter B1 + crown B2 still make the chain, so the B3 carry
 *   casts (a lone B3 makes ZERO full bursts). The fixed B3 slot is dropped DELIBERATELY: it is also
 *   a Burst III and would compete with power for the stage-3 cast, making "how many times did power
 *   actually cast" nondeterministic. With it out, power is the sole B3, so every fullBurstStart is
 *   preceded by exactly one power burst cast — that identity is what the burst test counts against.
 *
 * SHAPE-AGNOSTIC COUNTERFACTUALS: the packet documents an override slot as Block[] in one place and
 *   as CharacterSkills{blocks} in another, so every mutation goes through blocksOf()/clearSlot(),
 *   which handle both. power's slot index is DERIVED from her own self-buff event
 *   (casterIdx === targetIdx), never assumed from comp order.
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

const SLUG = 'power';

type Ev = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';

function idxOf(ev: Ev): number | undefined {
  if (typeof ev.srcSlot === 'number') return ev.srcSlot;
  if (typeof ev.casterIdx === 'number') return ev.casterIdx;
  return undefined;
}

function blocksOf(slot: any): any[] {
  if (Array.isArray(slot)) return slot;
  if (slot && Array.isArray(slot.blocks)) return slot.blocks;
  return [];
}

function clearSlot(ov: any, slot: Slot): void {
  if (Array.isArray(ov[slot])) ov[slot] = [];
  else if (ov[slot] && Array.isArray(ov[slot].blocks)) ov[slot].blocks = [];
}

function eachBuff(ov: any, slot: Slot, fn: (eff: any) => void): void {
  for (const b of blocksOf(ov[slot])) {
    for (const e of b.effects ?? []) if (e.kind === 'buff') fn(e);
  }
}

function run(patched?: unknown) {
  const opts: any = controlComp(SLUG, false);
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  const events: Ev[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as Ev);
    },
  };
  const res = runComp(opts);
  return { res, events, total: totals(res)[SLUG] ?? 0 };
}

const isAtkStat = (s: unknown) => s === 'atkPct' || s === 'casterAtkPct';

// ---- hoisted runs (5 full 180s sims) ----
const base = run();
const noS1 = run(
  withPatchedOverride(SLUG, (ov: any) => {
    clearSlot(ov, 'skill1');
  }),
);
const shortBf = run(
  withPatchedOverride(SLUG, (ov: any) => {
    eachBuff(ov, 'skill1', (e) => {
      if (isAtkStat(e.stat)) e.durationSec = 0.05;
    });
  }),
);
const uncapBf = run(
  withPatchedOverride(SLUG, (ov: any) => {
    eachBuff(ov, 'skill1', (e) => {
      if (isAtkStat(e.stat)) e.maxStacks = 50;
    });
  }),
);
const noS2 = run(
  withPatchedOverride(SLUG, (ov: any) => {
    clearSlot(ov, 'skill2');
  }),
);

// Blood Fiend applies: SELF-cast (casterIdx === targetIdx) ATK buff on power. The self-cast filter
// is what separates it from liter's / crown's ally ATK buffs, which also land on power as atkPct.
const bf = base.events.filter(
  (e) =>
    e.kind === 'buffApply' &&
    e.targetSlug === SLUG &&
    e.casterIdx != null &&
    e.casterIdx === e.targetIdx &&
    isAtkStat(e.stat),
);
const powerIdx = bf.length ? (bf[0].casterIdx as number) : -1;
const powerDamage = base.events.filter(
  (e) => e.kind === 'damage' && idxOf(e) === powerIdx,
);
const burstHits = powerDamage.filter((e) =>
  String(e.bucket ?? '').toLowerCase().includes('burst'),
);
const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;

describe('power — fixture sanity', () => {
  it('power is in the comp, deals damage, and the fixture actually bursts', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(base.total).toBeGreaterThan(0);
    // Non-vacuity for every gated line below: both skill2 (18 attacks) and the burst rider need
    // max stacks, and the burst test needs at least one cast.
    expect(fbStarts).toBeGreaterThan(0);
    expect(powerIdx).toBeGreaterThanOrEqual(0);
  });
});

describe('power — skill1 Blood Fiend (ATK 6.4%, 5 stacks, 3 sec, self)', () => {
  it('applies a self-only stacking ATK buff capped at 5 stacks', () => {
    // Discriminates: an uncapped model (no maxStacks), and a wrong magnitude (e.g. 6.4 authored as
    // the 32% max-stack total, or a x10 typo).
    expect(bf.length).toBeGreaterThan(5);
    for (const e of bf) {
      expect(e.targetSlug).toBe(SLUG);
      expect(e.maxStacks ?? 1).toBe(5);
      // atkPct keeps its raw percentage; casterAtkPct is flat-resolved at apply time, so only the
      // percentage form is magnitude-checkable from the event (self-cast makes the two equivalent).
      if (e.stat === 'atkPct') expect(e.value).toBeCloseTo(6.4, 3);
    }
    expect(Math.max(...bf.map((e) => (e.stacks ?? 1) as number))).toBe(5);
  });

  it('grants nothing to allies — the whole kit is self/enemy scoped', () => {
    // Discriminates the SCOPE nearest-wrong: "Affects self" mis-encoded as target allies.
    const toOthers = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        idxOf(e) === powerIdx &&
        e.targetSlug != null &&
        e.targetSlug !== SLUG,
    );
    expect(toOthers).toHaveLength(0);
  });

  it('lapses across the reload gap and rebuilds from 1 stack (3 sec, not 10)', () => {
    // The 3 sec window is SHORTER than the ~3.35-3.7s magazine gap, so the pool must reset every
    // magazine. Under the nearest-wrong long-duration reading (10 sec) the buff never lapses:
    // exactly ONE apply would carry stacks === 1, and the first expiresFrame would sit past 600.
    const fromScratch = bf.filter((e) => (e.stacks ?? 1) === 1);
    expect(fromScratch.length).toBeGreaterThan(1);
    expect(bf[0].expiresFrame).toBeGreaterThan(120);
    expect(bf[0].expiresFrame).toBeLessThan(500);
  });

  it('is damage-positive and bounded by 5 x 6.4% = 32%', () => {
    // Upper bound is the arithmetic ceiling of the line: even permanently max-stacked it cannot
    // lift a pure-ATK-scaling kit past 1.32x. Catches an over-credited magnitude or an
    // always-on-at-max encoding of a buff the kit makes lapse.
    expect(base.total).toBeGreaterThan(noS1.total);
    expect(base.total / noS1.total).toBeGreaterThan(1.02);
    expect(base.total / noS1.total).toBeLessThan(1.33);
  });

  it('duration and stack cap are both load-bearing', () => {
    expect(shortBf.total).toBeLessThan(base.total);
    expect(uncapBf.total).toBeGreaterThan(base.total);
  });

  it('moves no teammate (ATK-only change cannot shift the rotation)', () => {
    // Burst gauge is per-shot, and skill1 changes ATK only — never shot count — so removing it
    // must leave every other unit byte-identical. (The skill2 counterfactual below deliberately
    // does NOT get this assertion: a free reload changes shots fired, hence gauge, hence timing.)
    const a = totals(base.res);
    const b = totals(noS1.res);
    for (const slug of Object.keys(a)) {
      if (slug !== SLUG) expect(b[slug]).toBe(a[slug]);
    }
  });
});

describe('power — skill2 (18 normal attacks at max stacks, once per battle)', () => {
  it('the free full-magazine reload adds fire time, and only ONE of them', () => {
    // "Reloads 100% of the magazine" is shot economy, not a defensive line: it skips one 141-frame
    // reload (~2.35s of a 180s fight, ~+1-2%). The upper bound is the discriminator for
    // "Activates 1 time(s) per battle": a hitCount:18 block with no once-per-battle gate fires
    // ~5x over the fight (~100 shots / 18), which lands near +7% — outside this band.
    expect(base.total).toBeGreaterThan(noS2.total);
    expect(base.total / noS2.total).toBeLessThan(1.04);
  });

  it('Explosion Radius is not encoded as a damage stat', () => {
    // Explosion RADIUS is area coverage, not damage per hit, and the boss is a single target with
    // no AoE modeled — so it is deliberately unmodeled. The nearest-wrong is folding 38.61% into a
    // Damage-Up stat (projectileExplosionPct is the tempting one — "only RL kits carry it"), which
    // would silently credit ~+2% for a line the kit never made a damage line.
    const dmgStats = new Set([
      'projectileExplosionPct',
      'attackDamagePct',
      'elementDamagePct',
      'trueDamagePct',
      'sustainedDamagePct',
      'chargeDamagePct',
      'chargeDamageMultPct',
      'critDamagePct',
      'coreDamagePct',
    ]);
    const bogus = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        idxOf(e) === powerIdx &&
        dmgStats.has(e.stat as string) &&
        Math.abs(((e.value as number) ?? 0) - 38.61) < 0.5,
    );
    expect(bogus).toHaveLength(0);
  });
});

describe('power — burst (1584% + a max-stack-gated second 1584%)', () => {
  it('lands TWO burst-bucket instances per cast', () => {
    // power is the sole Burst III in this fixture, so #casts === #fullBurstStart. The faithful
    // reading emits two damage instances per cast; the nearest-wrong (rider dropped, or the two
    // 1584% lines collapsed into one 1584% line) emits exactly one per cast.
    expect(burstHits.length).toBe(2 * fbStarts);
    expect(burstHits.length).toBeGreaterThanOrEqual(2);
  });

  it('burst-cast damage never takes the +50% Full Burst major', () => {
    // Verified fact: burst-cast damage lands BEFORE Full Burst begins. Both 1584% components are
    // parts of the same cast, so neither may carry the FB major.
    for (const e of burstHits) expect(Boolean(e.fbMajorApplied)).toBe(false);
  });

  it.skip('the two components are equal in magnitude (same 1584%, same frame, same buff state)', () => {
    // GAP: the harness cheat-sheet documents bucket / srcSlot / crit+core rates / inFullBurst /
    // fbMajorApplied / rangeApplied / mult on a damage event, but NOT the field holding the damage
    // amount. Guessing a name here would either false-RED or assert vacuously on 0s.
  });

  it.skip('burst hits do not core and do not take the +30% range bonus', () => {
    // GAP: the kit says nothing about core strike, and riders are engine-forced no-range — but the
    // exact crit/core-rate field names on a damage event are not in the blind packet.
  });

  it.skip('the second 1584% is GATED on max Blood Fiend stacks', () => {
    // GAP (modeling + testing). The schema has no block gate that reads a BUFF stack count; the
    // nearest primitive is mirroring stacks into a named resource + resourceGate{min:5}, which does
    // not decay with the 3 sec window. In practice the gate is satisfied at every cast (5 stacks are
    // reached on shot 5 of every magazine, long before the first burst), so an always-on encoding
    // and a gated encoding are behaviourally identical at scope lock — this asserts nothing today.
    // Discriminating it would need stacks forced below 5 at cast time, which is not reachable
    // shape-agnostically without knowing how the stack pool was authored.
  });
});

```

S5 spec/gaps as returned (verbatim):

```json
{
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Activates when attacking w/ Full Charge",
      "disposition": "FAITHFUL",
      "assertion": "Self-cast buffApply events (casterIdx===targetIdx) recur >5 times across the fight, one per full-charge shot. RL always full-charges (chargeFrames 60), so a per-shot trigger and a per-full-charge trigger coincide; nearest-wrong is a non-per-shot trigger (interval/lastBullet), which cannot produce the observed apply cadence or the 1..5 stack ramp."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 6.4%, stacks up to 5 time(s)",
      "disposition": "FAITHFUL",
      "assertion": "Every apply carries maxStacks===5, observed max stacks===5, and value 6.4 when the stat is the raw-percentage atkPct. Fails under an uncapped model, a magnitude typo, or a buff authored at the 32% max-stack total. Backed by the bounded ratio test: base/no-skill1 must sit in (1.02, 1.33) — 1.32 is the arithmetic ceiling of 5x6.4% on a pure-ATK-scaling kit."
    },
    {
      "slot": "skill1",
      "kitLine": "lasts for 3 sec",
      "disposition": "FAITHFUL",
      "assertion": "More than one apply carries stacks===1 (the pool lapses and rebuilds), and the FIRST apply's expiresFrame sits in (120, 500). The magazine gap is reload 141f + recharge ~82f = ~3.7s > 3s, so a faithful 3s window MUST lapse every magazine; the nearest-wrong 10s reading never lapses (a single stacks===1 apply) and puts the first expiresFrame past 600. Patching durationSec to 0.05 must reduce total damage."
    },
    {
      "slot": "skill1",
      "kitLine": "Affects self.",
      "disposition": "FAITHFUL",
      "assertion": "No buffApply cast by power targets any other slug, and removing skill1 leaves every teammate's total byte-identical (an ATK-only change cannot move per-shot burst gauge, hence cannot shift the rotation). Fails under an allies-scoped mis-encoding."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates after 18 normal attacks",
      "disposition": "FAITHFUL",
      "assertion": "Covered indirectly by the bounded uplift test. 18 normal attacks = exactly 3 magazines of 6, so it fires once mid-fight; the exact trigger frame is not asserted (no frame stamp available blind)."
    },
    {
      "slot": "skill2",
      "kitLine": "if Blood Fiend is at max stacks",
      "disposition": "GAP",
      "assertion": "it.skip. No schema gate reads a BUFF stack count (nearest primitive: mirror stacks into a resource + resourceGate{min:5}, which does not decay with the 3s window). Non-discriminating at scope lock anyway: 5 stacks are reached on shot 5 of every magazine, so the gate is already satisfied when the 18th attack lands."
    },
    {
      "slot": "skill2",
      "kitLine": "Explosion Radius ▲ 38.61% for 10 sec",
      "disposition": "UNMODELED",
      "assertion": "No buffApply cast by power carries a Damage-Up-bucket stat with value ~38.61. Explosion radius is area coverage, not per-hit damage, and the boss is single-target with no AoE modeled. Fails under the tempting nearest-wrong of folding it into projectileExplosionPct (or any Damage-Up stat), which would silently credit ~+2%."
    },
    {
      "slot": "skill2",
      "kitLine": "Reloads 100% of the magazine",
      "disposition": "FAITHFUL",
      "assertion": "base.total > (skill2 removed).total — a skipped 141-frame reload is shot economy, worth ~+1-2% over 180s. Fails under the 'defensive/no damage' skip, which yields an exactly equal total."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates 1 time(s) per battle.",
      "disposition": "FAITHFUL",
      "assertion": "base/no-skill2 < 1.04. A hitCount:18 block with no once-per-battle gate fires ~5x over ~100 shots, saving ~13s of reload (~+7%) — outside the band. This bound IS the once-per-battle discriminator."
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1584% of final ATK",
      "disposition": "FAITHFUL",
      "assertion": "power is the sole Burst III in the fixture, so #casts === #fullBurstStart; burst-bucket damage events from power's slot index must number exactly 2 x fullBurstStart. Fails at 1x under the missing-rider / collapsed-into-one-line nearest-wrong."
    },
    {
      "slot": "burst",
      "kitLine": "Activates when Blood Fiend at max",
      "disposition": "GAP",
      "assertion": "it.skip — same missing primitive as the skill2 gate, and behaviourally identical to an always-on encoding at scope lock (stacks are always maxed by cast time). Forcing stacks < 5 at cast is not reachable shape-agnostically blind."
    },
    {
      "slot": "burst",
      "kitLine": "additional damage (2nd 1584%)",
      "disposition": "FAITHFUL",
      "assertion": "Same 2x-per-cast count assertion; magnitude equality is it.skip (the damage-amount field name is not in the blind packet)."
    },
    {
      "slot": "burst",
      "kitLine": "Affects 1 enemy w/ highest final ATK",
      "disposition": "FAITHFUL",
      "assertion": "Trivially satisfied — single-target boss; target enemy. No assertion beyond the burst-bucket attribution."
    },
    {
      "slot": "burst",
      "kitLine": "(engine rule) burst-cast is FB-exempt",
      "disposition": "FAITHFUL",
      "assertion": "Every power burst-bucket damage event has fbMajorApplied falsy — burst-cast damage lands before the Full Burst window opens (verified fact). Fails under a model that keys the damage to fullBurstEnter instead of the cast, which would take the +50% major."
    }
  ],
  "fixtures": "controlComp('power', false) for all five runs. liter B1 + crown B2 still form the chain so the Burst III carry casts (a lone B3 makes ZERO full bursts). The fixed B3 slot is dropped deliberately: it is ALSO a Burst III and would compete with power for the stage-3 cast, breaking the #casts === #fullBurstStart identity the burst test relies on and adding ally buffs that muddy the ratio bands. Runs (5 x 180s, deterministic, no seed): shipped; skill1 cleared; skill1 buff durationSec -> 0.05; skill1 buff maxStacks -> 50; skill2 cleared. All counterfactuals go through shape-tolerant helpers (slot as Block[] OR CharacterSkills{blocks}), and power's slot index is derived from her own self-buff event rather than assumed from comp order.",
  "gaps": [
    "it.skip 'the two components are equal in magnitude' — the harness cheat-sheet lists bucket/srcSlot/crit+core rates/inFullBurst/fbMajorApplied/rangeApplied/mult on a damage event but NOT the damage-amount field name; guessing would false-RED or assert vacuously on zeros.",
    "it.skip 'burst hits do not core and do not take the +30% range bonus' — crit/core-rate field names on a damage event are unverified blind; the claim itself follows from the kit text (no core-strike wording) plus the engine's force-no-range on riders.",
    "it.skip 'the second 1584% is GATED on max Blood Fiend stacks' — the schema has no block gate reading a buff's stack count (nearest: mirrored resource + resourceGate{min:5}, which does not decay with the 3s window), AND the gate is satisfied at every cast at scope lock, so no assertion can discriminate gated from always-on without forcing stacks < 5.",
    "skill2's exact 18-normal-attack trigger frame is not asserted (no reliable frame stamp on events blind); only the once-per-battle magnitude bound is.",
    "FLAG (cadence tuple, datamine-unreliable): the lapse-and-rebuild assertion and the ~+1-2% free-reload band both rest on chargeFrames 60 / release latency 22f / reloadFrames 141. If the effective cadence differs materially, those two are the first assertions to move — they are stated as bands, not point values, for that reason."
  ]
}
```

---

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5, written from kit prose alone) + diff vs the DRIVER override

```json
{
  "slug": "power",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "chargeCounter",
        "count": 1
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 6.4,
          "durationSec": 3,
          "maxStacks": 5,
          "rampSec": 6
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 18
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 38.61,
          "durationSec": 10
        },
        {
          "kind": "instantReload"
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
          "atkPct": 1584,
          "noFb": true,
          "noRange": true
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
          "atkPct": 1584,
          "noFb": true,
          "noRange": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Activates 1 time(s) per battle.",
      "Activates after 18 normal attacks if Blood Fiend is at max stacks."
    ],
    "burst": [
      "Affects the 1 enemy unit(s) with the highest final ATK.",
      "Activates when Blood Fiend is at max stacks."
    ]
  },
  "caveats": [
    "⚑ skill1 trigger: kit says 'Activates when attacking with Full Charge' — modeled as chargeCounter count:1 (every full charge). If the engine's RL charge cycle differs from one-charge-per-pull, the stack ramp rate is wrong.",
    "⚑ skill1 rampSec 6 is an UNMEASURED estimate: 5 stacks × 3 sec each with a ~1.2s charge+fire cycle means max stacks are reachable and holdable, but the opening seconds run below cap. Value chosen as ~5 charge cycles.",
    "⚑ skill1 stack STEADY-STATE is the load-bearing unknown: 3 sec duration vs the RL charge cadence decides whether 5 stacks are sustainable at all. If a full-charge cycle exceeds 3 sec, stacks can never exceed 1 and both the skill2 and burst gates NEVER open.",
    "⚑ skill2 'once per battle' is NOT modeled — the engine has no per-battle-cap primitive on a hitCount trigger, so this block re-fires every 18 normal attacks. This OVER-CREDITS both the explosion-radius buff and the free reload. A `everyN` gate cannot express a hard one-shot cap either. Flagged, not fudged.",
    "⚑ skill2 'if Blood Fiend is at max stacks' gate is NOT modeled — there is no resourceGate on a buff-stack count (stacks are a buff property, not a declared resource). The block therefore fires unconditionally at 18 normal attacks. Over-credits when stacks are below cap.",
    "⚑ skill2 'Explosion Radius ▲ 38.61%' mapped to projectileExplosionPct. Explosion RADIUS is a geometry/AoE stat, not literally a damage percentage; against a single partless boss a radius increase may be entirely INERT in reality. Mapping to the RL-only Damage-Up bucket is the closest schema fit but may over-credit by the full 38.61%.",
    "⚑ burst second block's 'Activates when Blood Fiend is at max stacks' gate is NOT modeled (same stack-gate limitation). Modeled as unconditional, which over-credits any burst cast below max stacks.",
    "⚑ burst target 'the 1 enemy unit with the highest final ATK' collapses to the single boss at scope lock — modeled as plain enemy, no behavioural difference here.",
    "⚑ Both burst hits set noFb: burst-cast damage lands before the Full Burst window opens (verified project fact), so the +50% major does not apply. noRange follows the rider convention.",
    "⚑ Cadence tuple (chargeFrames 60, reloadFrames 141, ammo 6) is datamined and unreliable; the whole stack-uptime model rests on it."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Power is an RL/Fire/Attacker Burst III. S1 'Blood Fiend' is a self ATK stack (6.4%/stack, 5 stacks, 3s) built by full-charge attacks — modeled as a chargeCounter self-buff with a ramp haircut. S2 is a one-per-battle explosion-radius window plus a full instant reload, gated on max Blood Fiend stacks after 18 normal attacks; the once-per-battle cap and the max-stack gate are BOTH unexpressible in the current schema and are flagged, not approximated. Burst is 1584% of final ATK as burst damage plus a second 1584% instance gated on max stacks; both authored FB-exempt per the burst-cast-lands-pre-FB rule. The load-bearing open question is whether the RL full-charge cadence can sustain 5 stacks against a 3-second per-stack duration — every gated component in this kit hangs off it.",
  "hasPierce": false
}
```

S6 audit + flags as returned (verbatim):

```json
{
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates when attacking w/ Full Charge",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger chargeCounter{count:1} — every full-charge attack advances the counter and fires the block"
    },
    {
      "slot": "skill1",
      "kitLine": "Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'self'}"
    },
    {
      "slot": "skill1",
      "kitLine": "Blood Fiend: ATK 6.4%",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff{stat:'atkPct', value:6.4} — self ATK scaling, unscoped (kit gives no normal/charge scope)"
    },
    {
      "slot": "skill1",
      "kitLine": "stacks up to 5 time(s)",
      "status": "IMPLEMENTED",
      "effectOrReason": "maxStacks:5"
    },
    {
      "slot": "skill1",
      "kitLine": "lasts for 3 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "durationSec:3 — wall-clock seconds, not rounds (text says 'sec')"
    },
    {
      "slot": "skill2",
      "kitLine": "Activates after 18 normal attacks",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger hitCount{count:18} — counts rounds, not pulls"
    },
    {
      "slot": "skill2",
      "kitLine": "if Blood Fiend is at max stacks",
      "status": "SKIPPED",
      "effectOrReason": "No schema primitive gates a block on a BUFF's stack count (resourceGate reads declared resource pools, not buff stacks). Block fires unconditionally — over-credits. ⚑ flagged."
    },
    {
      "slot": "skill2",
      "kitLine": "Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'self'}"
    },
    {
      "slot": "skill2",
      "kitLine": "Explosion Radius 38.61% for 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff{stat:'projectileExplosionPct', value:38.61, durationSec:10} — RL-only Damage-Up bucket; closest schema fit for an RL explosion stat. ⚑ radius≠damage."
    },
    {
      "slot": "skill2",
      "kitLine": "Reloads 100% of the magazine.",
      "status": "IMPLEMENTED",
      "effectOrReason": "instantReload{} (full refill) — a weapon-state modifier, NEVER skippable: it directly raises shots fired"
    },
    {
      "slot": "skill2",
      "kitLine": "Activates 1 time(s) per battle.",
      "status": "SKIPPED",
      "effectOrReason": "No once-per-battle primitive exists on a hitCount trigger (everyN is a modulo phase, not a hard cap). Block re-fires every 18 normal attacks — over-credits both effects. ⚑ flagged."
    },
    {
      "slot": "burst",
      "kitLine": "Affects the 1 enemy w/ highest final ATK",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'enemy'} — single partless boss at scope lock, so the ATK-ranked selection is degenerate"
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1584% as Burst Skill damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage{atkPct:1584, noFb:true, noRange:true} on burstCast — burst-cast damage lands pre-FB"
    },
    {
      "slot": "burst",
      "kitLine": "Activates when Blood Fiend at max stacks",
      "status": "SKIPPED",
      "effectOrReason": "Same buff-stack-gate limitation as skill2. Second damage block modeled unconditional — over-credits below-cap casts. ⚑ flagged."
    },
    {
      "slot": "burst",
      "kitLine": "Deals 1584% as additional damage",
      "status": "IMPLEMENTED",
      "effectOrReason": "second flatDamage{atkPct:1584, noFb:true, noRange:true} block on burstCast — separate instance, same target"
    }
  ],
  "flags": [
    {
      "field": "skill1[0].trigger",
      "estimate": "chargeCounter{count:1} — one stack per full-charge attack",
      "reasoning": "Kit says 'Activates when attacking with Full Charge'. No count is given, so every full charge is assumed to fire it. chargeCounter is the schema's full-charge phase counter; count:1 makes every charge a firing phase. An alternative encoding is shotFired with a charge gate, but the schema offers no such gate, so chargeCounter is the faithful vocabulary.",
      "recipe": "DBG_BUFFS on a solo Power run: count Blood Fiend buffApply events per magazine and compare against the shot count. One apply per pull confirms count:1."
    },
    {
      "field": "skill1[0].effects[0].rampSec",
      "estimate": "6 sec",
      "reasoning": "The buff is authored at per-stack magnitude with maxStacks:5, so the engine builds the stack naturally — but the ramp haircut prior still applies to the opening window where fewer than 5 stacks exist. 5 stacks × ~1.2s per charge cycle ≈ 6 s to reach cap from t=0. UNMEASURED.",
      "recipe": "Run with DBG_BUFFS and read the frame at which the 5th Blood Fiend stack first applies; set rampSec to that time in seconds, or drop rampSec entirely if the engine's own stack accrual already models the ramp (double-counting risk — verify before trusting)."
    },
    {
      "field": "skill1[0].effects[0].durationSec vs charge cadence",
      "estimate": "5 stacks sustainable IF a full-charge cycle is under 3 sec; chargeFrames 60 (=1 s) plus fire/recovery suggests yes",
      "reasoning": "This is the kit's LOAD-BEARING unknown. Blood Fiend expires 3 s after each stack. If the RL full-charge cycle (charge 60f = 1 s, plus release latency 22f and inter-shot recovery) totals under 3 s, stacks accumulate to 5 and hold with only reload gaps dropping them. If it exceeds 3 s, the unit NEVER reaches max stacks and BOTH the skill2 activation and the burst's second 1584% instance are permanently dead. The whole kit's magnitude hinges on this.",
      "recipe": "DBG_BUFFS + DBG_CD on a solo run: log Blood Fiend stack count over the fight and measure the fraction of frames at 5 stacks. Cross-check against a real focus recording by counting Power's charge shots between reloads."
    },
    {
      "field": "skill2[0] (once-per-battle cap)",
      "estimate": "Currently unbounded; true behaviour is ONE activation for the whole fight",
      "reasoning": "'Activates 1 time(s) per battle' is a hard cap the schema cannot express on a hitCount trigger. A 180 s fight at RL cadence fires far more than 18 normal attacks, so the block will re-fire many times — over-crediting both the 10 s explosion window (making it near-permanent) and, more seriously, the full instant reload (which fabricates shots). This is the single largest over-credit in this baseline.",
      "recipe": "Count reload events in a solo Power run with and without the skill2 block. The delta is the fabricated shot count. Fixing this needs either a new once-per-battle primitive or a resource pool initialized to 1 with a resourceGate{min:1} plus a resource{delta:-1} spend — the latter is expressible TODAY and should be preferred at enactment time."
    },
    {
      "field": "skill2[0].effects[0].stat",
      "estimate": "projectileExplosionPct 38.61 — possibly should be 0 (fully inert)",
      "reasoning": "'Explosion Radius' is an AoE GEOMETRY stat. Against the scope-lock partless single-target boss, a larger explosion radius may add exactly nothing (no extra targets, no extra parts to clip). The schema's projectileExplosionPct is an RL-only Damage-Up bucket entry, which is the nearest fit but semantically different (damage vs radius). Modeling it as damage could over-credit 38.61 Damage-Up points for 10 s per activation.",
      "recipe": "Compare a focus recording's Power popup values inside vs outside the 10 s window. Flat values = radius is inert on this boss, and the buff should be dropped to an unmodeled line. Elevated values = the radius genuinely maps to damage and the magnitude can be fit."
    },
    {
      "field": "burst[1] (max-stack gate)",
      "estimate": "Modeled unconditional; true behaviour is gated on 5 Blood Fiend stacks at cast time",
      "reasoning": "Doubles Power's burst damage (1584% → 3168%). If the unit reliably sits at max stacks going into a burst (likely, given a 3 s refresh on every charge), unconditional is a good approximation and the over-credit is near zero. If stacks lapse during the pre-burst reload or the burst-cast animation, the second instance should not fire and the model over-credits by a full 1584%.",
      "recipe": "DBG_BUFFS: log Blood Fiend stack count at each burstCast frame across a full 180 s run. If it is 5 at every cast, the unconditional model is validated by behaviour and the gate is moot; otherwise implement it as a resource mirror of the stack count with a resourceGate."
    },
    {
      "field": "burst[*].noFb",
      "estimate": "true (FB-exempt) for both instances",
      "reasoning": "Project-verified fact: burst-cast damage lands BEFORE Full Burst begins, so it takes no +50% major and no entry auras. Both 1584% instances key off burstCast, so both are exempt. This is a rule application, not a per-unit measurement — but it is listed because the second instance's timing (does the max-stack rider land with the cast, or a frame later inside the FB window?) is genuinely kit-silent.",
      "recipe": "Read a focus recording's two Power burst popups: if both carry identical magnitudes, both are pre-FB. A 1.5× ratio between them means the rider lands inside the window and its noFb should be dropped."
    },
    {
      "field": "cadence tuple (chargeFrames 60, reloadFrames 141, ammo 6)",
      "estimate": "Datamined values used as given",
      "reasoning": "Standing rule: datamined rate_of_fire / reloadFrames are known-unreliable and are ALWAYS ⚑. Power's entire stack-uptime model, the 18-normal-attack threshold timing, and the value of the free reload all depend on this tuple.",
      "recipe": "Count Power's ammo-counter transitions in a focus recording over a fixed window; derive effective charge-to-charge time and reload duration, and correct the datamined values before trusting any uptime figure."
    }
  ]
}
```

DRIVER DIFF (S6 blind vs driver):
- S1: both use chargeCounter count 1 → self atkPct 6.4 / maxStacks 5 / 3s. S6 ADDS rampSec 6 ON TOP of
  maxStacks (its own flag admits the double-ramp risk: "drop rampSec entirely if the engine's own stack
  accrual already models the ramp"); the driver uses the engine's discrete stack accrual alone (the kit is
  stepwise per charge, not linear). S6 puts both effects in ONE block; the engine's chargeCounter CYCLES a
  block's effects array one-per-charge, so a two-effect block applies the buff only on ODD charges and the
  second effect only on EVEN — the driver splits into two single-effect blocks.
- S2: DIVERGENT. S6 encodes Explosion Radius ▲38.61% as projectileExplosionPct 38.61/10s — a DAMAGE stat
  (Damage-Up bucket; "only RL kits carry it"), the exact mis-map the S2b review flagged as the trap;
  radius is AoE coverage and damage-inert vs one boss (driver: verbatim in unmodeled). S6 has NO max-stack
  gate on S2 and NO once-per-battle limit (recurring every 18 hits); driver: resourceGate{bloodFiend,min:5}
  + everyN 999/offset 1.
- Burst: both use two burstCast flatDamage 1584 blocks. S6's second block is UNCONDITIONAL (no gate) and
  sets explicit noFb/noRange (redundant: burstCast-triggered burst-slot flatDamage is already FB-exempt via
  skillNoFb/U10, riders are engine-forced noRange). Driver gates the second on resourceGate{bloodFiend,min:5}.
- Resources: S6 declares none; driver declares bloodFiend 0→5 as the gate proxy (⚑ documented: no expiry).

---

## SECTION 7 — DRIVER IMPLEMENTATION (the encoding under judgment)

### scripts/tests/units/power.test.ts (driver spec, 13 tests, all GREEN vs the shipped override)

```typescript
// PER-UNIT KIT SPEC — `power` (Power, Attacker/RL/Fire, Burst III, cd 40s, ammo 6,
// chargeFrames 60, reloadFrames 141 — Chainsaw Man collab). Kit-autonomy gauntlet 2026-08-03.
//
// One assertion group per KIT LINE (P1..P5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.power.skills):
//   S1 ■ attacking with Full Charge → self: Blood Fiend: ATK ▲6.4%, stacks to 5, lasts 3 sec  [P1]
//   S2 ■ after 18 normal attacks IF Blood Fiend at max stacks → self, ONCE PER BATTLE:
//        Explosion Radius ▲38.61% for 10 sec                                                    [P3]
//        Reloads 100% of the magazine                                                           [P2]
//   BU ■ highest-final-ATK enemy: 1584% of final ATK as Burst Skill damage                     [P4]
//      ■ IF Blood Fiend at max stacks → same target: 1584% of final ATK additional damage      [P4/P5]
//
// Encoding notes (why the spec is written this way):
//   * Every Power pull is a FULL CHARGE (RL charge 60f + 22f release recovery, no dump mode), so
//     her shot cadence is the full-charge cadence: 82f in-magazine, 172f across a natural reload.
//   * The "Blood Fiend at max stacks" condition is a STACK-GATE the engine has no buff-stack gate
//     primitive for; the override carries a `bloodFiend` resource pool (0→5, +1 per full charge,
//     two single-effect chargeCounter blocks — a multi-effect chargeCounter would CYCLE its
//     effects one per charge, not apply both) + a real maxStacks-5 / 3s ATK buff as the damage
//     line. The pool does NOT expire (no timer-decay primitive); the buff does (3s). At scope-lock
//     cadence her longest full-charge gap is the 172f (2.87s) reload boundary — under the 3s
//     expiry — so the proxy and the real buff never disagree inside a sim fight. ⚑ documented in
//     the override caveats, measurement-gated (a >3s fire pause would expose it).
//   * FIXTURE PROVIDES A REAL GATE-CLOSED CAST: camera-focused, liter/crown open the chain fast
//     enough that power's FIRST burst casts at ~5.4s, after only 4 full charges (stacks 4 < 5).
//     The kit-faithful outcome — and the shipped encoding — deals ONE nuke on that cast and TWO on
//     every later cast. A nearest-wrong unconditional double-nuke is caught by P4; P5 proves the
//     gate reads the pool (zero pool → every cast single, no reload-skip).
//   * P3 (Explosion Radius ▲38.61%) is UNMODELED on purpose: the sim fights ONE boss — there is
//     no AoE/multi-target axis for an explosion RADIUS to act on, so the line is damage-inert.
//     Nearest wrong: `projectileExplosionPct` (that is explosion DAMAGE, a Damage-Up bucket — a
//     different mechanic). No assertion here; the line lives verbatim in `unmodeled`.
//   * "Activates 1 time(s) per battle" = the everyN idiom (offset 1, N past any in-fight count).
//     Behaviorally, a REPEATED 18-hit refill tops up a non-empty magazine (capped) and nets only a
//     +1-round carryover per 18 hits — a small but STRICT total-damage delta near the 180s cutoff,
//     which is what P2's once-limit counterfactual asserts. The skip's LOCATION (hit 18, not
//     earlier) is pinned by the shot-gap signature against an early-trigger counterfactual.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / power B3 / helm B3, boss Fire,
// focus power) — power needs a real rotation to cast her burst at all. Deterministic (no seed);
// measured in-fight values: 111 shots, 6 casts at frames 322/2374/4367/6252/8075/9873, stacks
// max at frame 395 (shot 5), natural-reload gap 172f vs skipped gap 82f.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / power 2 / helm 3. */
const POWER = 2;

/** Measured on the deterministic fixture: one in-magazine charge cycle. */
const IN_MAG_GAP = 82;
/** Measured: 141f reload + charge cycle across a natural magazine boundary. */
const RELOAD_GAP = 172;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('power'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** P1 counterfactual: S1's stack line misread as a flat instant +32% (passive, no stacks, no
 *  expiry). The pool block is untouched, so the gate stays intact — this isolates the BUFF SHAPE. */
const powerFlatAtk = withPatchedOverride('power', (ov) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'buff' && e.stat === 'atkPct')
  );
  if (!b) {
    throw new Error('power S1 atkPct stack block missing — fixture is stale');
  }
  b.trigger = { kind: 'passive' };
  const buff = b.effects.find(
    (e: any) => e.kind === 'buff' && e.stat === 'atkPct'
  );
  buff.value = 32;
  buff.maxStacks = 1;
  delete buff.durationSec;
});
/** P2 counterfactual: S2 armed from the FIRST hit (threshold 1) instead of the 18th. The gate
 *  then opens on the 5th pull (pool hits 5 mid-pull, before the hitCount block dispatches), so
 *  the reload-skip migrates from the 6th boundary to right after shot 5. */
const powerEarlyTrigger = withPatchedOverride('power', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'instantReload')
  );
  if (!b) {
    throw new Error('power S2 reload block missing — fixture is stale');
  }
  b.trigger.count = 1;
});
/** P2 counterfactual: S2 with the once-per-battle limit removed — refills every 18 hits. Later
 *  refills top up a NON-EMPTY magazine (capped at 6), so each only nets a +1-round carryover:
 *  a small but strict total-damage gain near the 180s cutoff. */
const powerNoOnce = withPatchedOverride('power', (ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'instantReload')
  );
  if (!b) {
    throw new Error('power S2 reload block missing — fixture is stale');
  }
  delete b.everyN;
  delete b.everyNOffset;
});
/** P4 counterfactual: only the unconditional burst nuke survives. */
const powerSingleNuke = withPatchedOverride('power', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !b.resourceGate);
  if (ov.burst.length === before) {
    throw new Error(
      'power burst gated-nuke block (resourceGate) missing — fixture is stale'
    );
  }
});
/** P5 counterfactual: the bloodFiend pool never fills (S1 pool block removed) — the buff still
 *  stacks, so this isolates the GATE from the damage line. */
const powerNoPool = withPatchedOverride('power', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'resource')
  );
  if (ov.skill1.length === before) {
    throw new Error('power S1 resource block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const flatAtk = run({ power: powerFlatAtk });
const earlyTrigger = run({ power: powerEarlyTrigger });
const noOnce = run({ power: powerNoOnce });
const singleNuke = run({ power: powerSingleNuke });
const noPool = run({ power: powerNoPool });

// ---- readers ----------------------------------------------------------------------------------
const powerShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'power');
const powerBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'power'
  );
const powerNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'power' && e.bucket === 'burst'
  );
/** Power's OWN S1 Blood Fiend applies (liter also grants an atkPct team buff — filter by
 *  caster, not just stat). */
const fiendApplies = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' && e.casterIdx === POWER && e.stat === 'atkPct'
  );
/** Gap between shot n and shot n+1 (1-based n). */
const gapAfter = (evs: SimEvent[], n: number): number => {
  const shots = powerShots(evs);
  return shots[n].frame - shots[n - 1].frame;
};
/** Burst-bucket instances landing on a cast's frame. */
const nukesAt = (evs: SimEvent[], frame: number) =>
  powerNukes(evs).filter((d) => d.frame === frame);

describe('power — kit spec', () => {
  describe('P1 — S1 Blood Fiend: ATK ▲6.4% per full charge, stacks to 5, lasts 3 sec', () => {
    it('applies once per full-charge shot (not once, flat)', () => {
      const shots = powerShots(base.events).length;
      const applies = fiendApplies(base.events).length;
      expect(shots).toBeGreaterThan(0);
      expect(
        applies,
        `${applies} applies vs ${shots} full-charge shots — a passive encoding applies once`
      ).toBe(shots);
    });

    it('is 6.4% per stack, max 5 stacks, reaching max, self-scoped, with a 3 sec expiry', () => {
      const applies = fiendApplies(base.events);
      expect([...new Set(applies.map((b) => b.value))]).toEqual([6.4]);
      expect([...new Set(applies.map((b) => b.maxStacks))]).toEqual([5]);
      expect(
        Math.max(...applies.map((b) => b.stacks)),
        'stacks must actually climb to the 5-stack cap mid-fight'
      ).toBe(5);
      for (const b of applies) {
        expect(b.targetIdx).toBe(POWER); // self-scoped
        expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
      }
    });

    it('DISCRIMINATING: a flat instant +32% would apply once and over-credit power', () => {
      expect(fiendApplies(flatAtk.events).length).toBe(1);
      expect(
        flatAtk.totals.power,
        'flat +32% from t=0 must strictly out-damage the faithful 5x6.4% ramp'
      ).toBeGreaterThan(base.totals.power);
    });
  });

  describe('P2 — S2 Blood Explosion: reload 100% after 18 hits, ONCE per battle', () => {
    it('skips the natural reload right after the 18th hit', () => {
      // Shot 18 ends the third magazine: without the skip the gap to shot 19 carries the 141f
      // reload (172f measured); with it, a bare charge cycle (82f measured).
      expect(gapAfter(base.events, 6)).toBeGreaterThanOrEqual(RELOAD_GAP); // control boundary
      expect(gapAfter(base.events, 12)).toBeGreaterThanOrEqual(RELOAD_GAP); // control boundary
      expect(gapAfter(base.events, 18)).toBeLessThanOrEqual(IN_MAG_GAP);
    });

    it('DISCRIMINATING (timing): an arming threshold of 1 would skip right after shot 5', () => {
      // The pool reaches 5 mid-pull on shot 5 (S1 blocks dispatch before S2 within the pull), so
      // a threshold-1 block fires THERE — the skip migrates to the 6th boundary.
      expect(gapAfter(earlyTrigger.events, 6)).toBeLessThanOrEqual(IN_MAG_GAP);
      expect(gapAfter(base.events, 6)).toBeGreaterThanOrEqual(RELOAD_GAP);
    });

    it('DISCRIMINATING (once): refilling every 18 hits strictly out-damages once-per-battle', () => {
      // Later refills land on a non-empty magazine (capped), netting a +1-round carryover each —
      // the once-limit is what removes that gain.
      expect(noOnce.totals.power).toBeGreaterThan(base.totals.power);
      // And the one skip still happens at hit 18 in both (first activation identical).
      expect(gapAfter(noOnce.events, 18)).toBeLessThanOrEqual(IN_MAG_GAP);
    });

    it('DISCRIMINATING (gate): with the pool at zero the skip never happens', () => {
      expect(gapAfter(noPool.events, 18)).toBeGreaterThanOrEqual(RELOAD_GAP);
    });
  });

  // P3 — Explosion Radius ▲38.61% for 10 sec: UNMODELED — no AoE/multi-target axis in the sim
  // (one boss), so a radius cannot move any damage; the nearest wrong encoding
  // (projectileExplosionPct = explosion DAMAGE) would silently boost her RL hits. The line is
  // carried verbatim in the override's `unmodeled`; there is nothing to assert.

  describe('P4 — burst Blood Hammer: 1584% nuke, +1584% only at max stacks, pre-FB', () => {
    it('lands one 1584% nuke on EVERY cast', () => {
      const casts = powerBursts(base.events);
      expect(casts.length, 'fixture must cast power').toBeGreaterThan(3);
      for (const c of casts) {
        expect(nukesAt(base.events, c.frame).length).toBeGreaterThanOrEqual(1);
      }
      expect([...new Set(powerNukes(base.events).map((d) => d.atkPct))]).toEqual(
        [1584]
      );
    });

    it('the FIRST cast is single (stacks 4 < 5 at 5.4s), every later cast doubles', () => {
      const casts = powerBursts(base.events);
      const applies = fiendApplies(base.events);
      const maxedFrame = applies.find((b) => b.stacks === 5)!.frame;
      // The fixture's gate state, read off the buff itself:
      expect(casts[0].frame, 'first cast precedes max stacks').toBeLessThan(
        maxedFrame
      );
      expect(casts[1].frame, 'later casts follow max stacks').toBeGreaterThan(
        maxedFrame
      );
      // And the damage matches it:
      expect(nukesAt(base.events, casts[0].frame).length).toBe(1);
      for (const c of casts.slice(1)) {
        expect(nukesAt(base.events, c.frame).length).toBe(2);
      }
      expect(powerNukes(base.events).length).toBe(2 * casts.length - 1);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = powerNukes(base.events).filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: dropping the gated block leaves one nuke on every cast', () => {
      const casts = powerBursts(singleNuke.events).length;
      expect(powerNukes(singleNuke.events).length).toBe(casts);
    });
  });

  describe('P5 — the max-stacks gate is causally wired to the bloodFiend pool', () => {
    it('zeroing the pool drops the second nuke on every cast', () => {
      const casts = powerBursts(noPool.events);
      expect(casts.length).toBeGreaterThan(0);
      expect(
        powerNukes(noPool.events).length,
        'with the pool at 0 the stack-gated nuke must never fire'
      ).toBe(casts.length);
    });

    it('the S1 buff still stacks without the pool (gate isolated from the damage line)', () => {
      const applies = fiendApplies(noPool.events);
      expect(Math.max(...applies.map((b) => b.stacks))).toBe(5);
    });
  });
});

```

### src/skills/overrides/power.json (driver override)

```json
{
  "note": "power (Power — Chainsaw Man collab) — RL / Attacker / Fire / Burst III, cd 40s, ammo 6, chargeFrames 60, reloadFrames 141. Fresh build, kit-autonomy gauntlet 2026-08-03 (test-first: scripts/tests/units/power.test.ts). S1 'Blood Fiend' modeled as a per-full-charge self ATK stack buff (chargeCounter count 1 -> buff atkPct 6.4, maxStacks 5, durationSec 3 — one apply per full charge, stacks climb 1..5, expiry refreshes per apply, all stacks drop together on lapse = the engine's standard stack-buff semantics) as TWO single-effect blocks (the ATK buff + the bloodFiend pool increment): a multi-effect chargeCounter CYCLES its effects array one-per-charge instead of applying all of them, which would silently halve both the stack rate and the pool. Every Power pull IS a full charge (RL charge 60f + 22f release recovery, no dump mode), so the trigger cadence = her shot cadence; measured at scope lock the 3s expiry OUTLASTS her 172f (2.87s) reload boundary by 8 frames, so stacks persist across magazines once at cap. The kit's 'Blood Fiend at max stacks' condition (S2 activation + burst additional damage) is a STACK GATE the engine has no buff-stack gate primitive for, so the override mirrors the stack count into a `bloodFiend` resource pool (0->5, +1 per full charge, clamped) and reads it via resourceGate {min:5} — see caveats for the expiry-divergence ⚑ (pool never expires; the buff does at 3s; at scope-lock cadence her longest full-charge gap is the 2.35s reload < 3s, so the two never disagree inside a sim fight). S2 'Blood Explosion': the hit-18 max-stacks-gated activation is hitCount 18 + resourceGate, the once-per-battle limit is the everyN 999/offset 1 idiom (first gated activation only; no generic once-per-battle block field exists — burstCdr.oncePerBattle is effect-local), the reload line is instantReload fraction 1 (fires inside the 18th pull, before the ammo decrement, so the natural 141f reload is skipped exactly once). The S2 'Explosion Radius ▲38.61%' line is UNMODELED: the sim fights one boss — there is no AoE/multi-target axis for an explosion RADIUS to act on, damage-inert (the nearest-wrong encoding projectileExplosionPct is explosion DAMAGE, a different mechanic). Burst 'Blood Hammer': two burstCast flatDamage 1584 blocks on the (single, trivially highest-final-ATK) boss — the unconditional nuke + the max-stacks-gated additional damage; both resolve pre-FB (no +50% major on burst-cast damage, U10), crit at caster rate (U1), never core/range. BEHAVIORAL NOTE (pinned by the test): camera-focused behind liter/crown she casts her FIRST burst at ~5.4s, after only 4 full charges — stacks are 4 < 5, so the gate is genuinely CLOSED on cast 1 (one nuke) and open on every later cast (two nukes); that is the kit, not an encoding artifact. Pinned by scripts/tests/units/power.test.ts (P1..P5 incl. counterfactuals: flat-32% misread, early-arming threshold, no-once re-fire, single-nuke, pool-zero gate causality).",
  "resources": [
    {
      "name": "bloodFiend",
      "initial": 0,
      "min": 0,
      "max": 5
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Explosion Radius ▲ 38.61% for 10 sec."
    ],
    "burst": []
  },
  "caveats": [
    "skill1: the 'Blood Fiend at max stacks' condition is read from a `bloodFiend` resource pool (0→5, +1 per full charge), not from the buff itself — the engine has no buff-stack gate primitive. The pool does NOT expire; the real buff drops 3 sec after the last full charge. ⚑ estimate: zero divergence at scope-lock cadence — measured, her longest apply-to-apply gap in a sim fight is the 172f (2.87s) reload boundary, under the 3s expiry by 8 frames, so the pool and the buff never disagree in-fight; divergence only after a >3s fire pause. Recipe: a focused Power recording spanning a >3s fire pause (boss phase transition) — read the Blood Fiend icon expiry vs whether the next S2/burst still consumed the max-stacks condition. Tier: low (outside every graded comp's cadence).",
    "skill2: 'Activates 1 time(s) per battle' is encoded as everyN 999 / everyNOffset 1 — first gated activation only; no generic once-per-battle block field exists (burstCdr.oncePerBattle is effect-local).",
    "burst: 'the 1 enemy unit(s) with the highest final ATK' resolves to the single scope-lock boss (target enemy) — the sim has no multi-enemy axis to rank."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "chargeCounter",
        "count": 1
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 6.4,
          "maxStacks": 5,
          "durationSec": 3
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "chargeCounter",
        "count": 1
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "bloodFiend",
          "delta": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 18
      },
      "resourceGate": {
        "name": "bloodFiend",
        "min": 5
      },
      "everyN": 999,
      "everyNOffset": 1,
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "instantReload",
          "fraction": 1
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
          "atkPct": 1584
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "resourceGate": {
        "name": "bloodFiend",
        "min": 5
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1584
        }
      ]
    }
  ]
}

```

### Driver verification record (scripts/kit-autonomy/reviews/power.verify.txt)

```

 [32m✓[39m scripts/tests/units/power.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 14[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m13 passed[39m[22m[90m (13)[39m
[2m   Start at [22m 21:22:25
[2m   Duration [22m 345ms[2m (transform 75ms, setup 0ms, import 281ms, tests 14ms, environment 0ms)[22m


```
