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

# SECTION 2 — MECHANICS SSOT (the damage-formula + mechanics source of truth)

## docs/data/damage-calculation.md

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

## docs/data/game-mechanics.md

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

# SECTION 3 — GROUND TRUTH: the unit's kit prose + base stats (data/characters.json → characters.neon)

EXACT SLUG: `neon` — the BASE Neon (SG / Supporter / Fire / Burst I, Elysion). She is NOT
`neon-blue-ocean` (MG/Water Burst III) and NOT `neon-vision-eye` (RL/Electric Burst III).

{
"slug": "neon",
"name": "Neon",
"imageUrl": "https://sg-tools-cdn.blablalink.com/lb-98/xk-79/2d06454c4a653fc63999b1c4cd3ee0be.png",
"weapon": "SG",
"burst": "I",
"burstCooldownSec": 20,
"class": "Supporter",
"element": "Fire",
"manufacturer": "Elysion",
"normalAttackMultiplier": 224.5,
"coreAttackMultiplier": 200,
"ammo": 9,
"reloadFrames": 129,
"chargeFrames": 0,
"chargeMultiplier": 0,
"hitsPerShot": 10,
"rl3": 27,
"releaseDate": "2022-11-04",
"burstGaugePerShot": 4.5,
"treasure": false,
"skills": {
"skill1": "■ Activates when killing an enemy. Affects 2 ally unit(s) with the highest final ATK.\nCritical Rate ▲ 3.56% for 5 sec.",
"skill2": "■ Activates at the beginning of Full Burst. Affects all allies. Critical Rate ▲ 45.93% for 2 shots.",
"burst": "■ Affects 1 enemy unit(s) with the highest final DEF.\nDeals 528.97% of final ATK as Burst Skill damage. \n■ Affects all allies with a Shotgun.\nMax Ammunition Capacity ▲ 3 round(s) for 10 sec."
},
"skillCooldownsSec": {
"skill1": null,
"skill2": null,
"burst": 20
},
"role": {
"weapon": {
"shot_id": 1001101,
"shot_detail": {
"id": 1001101,
"damage": 22450,
"max_ammo": 9,
"shake_id": 2,
"ShakeType": "Fire_SG",
"fire_type": "Instant",
"zoom_rate": 0,
"input_type": "DOWN",
"shot_count": 10,
"ShakeWeight": 120,
"attack_type": "Bio",
"camera_work": "camera_work_02",
"charge_time": 0,
"penetration": 0,
"reload_time": 60,
"shot_timing": "Concurrence",
"spot_radius": 0,
"weapon_type": "SG",
"is_targeting": true,
"muzzle_count": 1,
"rate_of_fire": 90,
"name_localkey": "Shotgun",
"prefer_target": "Front",
"reload_bullet": 3300,
"counter_enermy": "Energy_Type",
"multi_aim_range": 0,
"spot_last_delay": 20,
"core_damage_rate": 20000,
"end_rate_of_fire": 90,
"spot_first_delay": 20,
"center_shot_count": 0,
"reload_start_ammo": 8,
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
"end_accuracy_circle_scale": 250,
"auto_accuracy_change_speed": 0,
"rate_of_fire_change_pershot": 0,
"start_accuracy_circle_scale": 250,
"target_burst_energy_pershot": 9000,
"auto_accuracy_change_pershot": 0,
"auto_end_accuracy_circle_scale": 250,
"auto_start_accuracy_circle_scale": 250
},
"bonusrange_max": 25,
"bonusrange_min": 0
},
"burstMeta": {
"burst_duration": 1000,
"use_burst_skill": "Step1",
"burst_apply_delay": 1,
"change_burst_step": "Step2"
},
"skillDetails": {
"skill1_id": 2011101,
"skill2_id": 2011201,
"skill1_table": "StateEffect",
"skill2_table": "StateEffect",
"skill1_detail": {
"id": 2011101,
"icon": "icn_skill_statcritical_01",
"group_id": 20111,
"skill_level": 1,
"name_localkey": "Neon's Special Bullet",
"next_level_id": 2011102,
"level_up_cost_id": 10102,
"description_localkey": "■ Activates when killing an enemy. Affects {description_value_01} ally unit(s) with the highest <word_group=10025>final</word_group> ATK.\n<color=#00AEFF>Critical Rate ▲ {description_value_02}% for {description_value_03} sec.</color>",
"description_value_list": [
{
"description_value": [
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2"
]
},
{
"description_value": [
"1.78",
"1.97",
"2.17",
"2.37",
"2.57",
"2.77",
"2.96",
"3.16",
"3.36",
"3.56"
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
"id": 2011201,
"icon": "icn_skill_statcritical_01",
"group_id": 20112,
"skill_level": 1,
"name_localkey": "Viva Firepower!",
"next_level_id": 2011202,
"level_up_cost_id": 10202,
"description_localkey": "■ Activates at the beginning of Full Burst. Affects all allies. <color=#00AEFF> Critical Rate ▲ {description_value_01}% for {description_value_02} shots.</color>",
"description_value_list": [
{
"description_value": [
"22.96",
"25.52",
"28.07",
"30.62",
"33.17",
"35.72",
"38.28",
"40.83",
"43.38",
"45.93"
]
},
{
"description_value": [
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2",
"2"
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
"info_description_localkey": "Skill 2"
},
"ulti_skill_id": 1011301,
"ulti_skill_detail": {
"id": 1011301,
"icon": "icn_skill_c011_ult",
"group_id": 10113,
"shake_id": 1,
"skill_type": "InstantNumber",
"attack_type": "Fire",
"skill_level": 1,
"counter_type": "Metal_Type",
"duration_type": "TimeSec",
"name_localkey": "Firepower Rules!",
"next_level_id": 1011302,
"prefer_target": "HighDefence",
"resource_name": "c011_ulti",
"duration_value": 0,
"skill_cooltime": 2000,
"level_up_cost_id": 10302,
"skill_value_data": [
{
"skill_value": 19836,
"skill_value_type": "Percent"
},
{
"skill_value": 1,
"skill_value_type": "Integer"
},
{
"skill_value": 20,
"skill_value_type": "Integer"
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
2000,
2000,
2000,
2000,
2000,
2000,
2000,
2000,
2000,
2000
],
"description_localkey": "■ Affects {description_value_01} enemy unit(s) with the highest <word_group=10025>final</word_group> DEF.\n<color=#00AEFF>Deals {description_value_02}% of <word_group=10025>final</word_group> ATK as Burst Skill damage.</color> \n■ Affects all allies with a Shotgun.\n<color=#00AEFF>Max Ammunition Capacity ▲ {description_value_03} round(s) for {description_value_04} sec.</color>",
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
"198.36",
"235.1",
"271.83",
"308.57",
"345.3",
"382.04",
"418.77",
"455.51",
"492.24",
"528.97"
]
},
{
"description_value": [
"3",
"3",
"3",
"3",
"3",
"3",
"3",
"3",
"3",
"3"
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
{}
],
"prefer_target_condition": "IncludeNoneTargetLast",
"info_description_localkey": "Burst Skill",
"after_use_function_id_list": [
101130101
],
"after_hurt_function_id_list": [
0
],
"before_use_function_id_list": [
0
],
"before_hurt_function_id_list": [
0
]
}
},
"statScaling": {
"grow_grade": 201102,
"grade_core_id": 101,
"stat_enhance_id": 3304,
"stat_enhance_detail": {
"id": 3304,
"core_hp": 200,
"grade_hp": 2300,
"core_attack": 200,
"grade_ratio": 200,
"core_defence": 200,
"grade_attack": 18,
"grade_defence": 90,
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
100001
],
"element_details": [
{
"id": 100001,
"element": "Fire",
"group_id": 5000001,
"element_icon": "icn_element_fire",
"weak_element_id": 200001,
"element_desc_localekey": "Injects Code: H.S.T.A. to all wind-type enemies, dealing 10% additional damage.",
"element_name_localekey": "Fire",
"element_code_name_localekey": "Code: H.S.T.A."
}
]
},
"piece": {
"piece_id": 5100011,
"piece_detail": {
"id": 5100011,
"class": "Supporter",
"order": 1100,
"use_id": 0,
"use_type": "None",
"item_rare": "SR",
"item_type": "Piece",
"stack_max": 9999999,
"use_value": 0,
"corporation": "ELYSION",
"resource_id": 11,
"item_sub_type": "CharacterPiece",
"name_localkey": "Neon's Spare Body",
"use_limit_count": false,
"inventory_filter": [
"etc"
],
"description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
}
},
"meta": {
"id": 201101,
"class": "Supporter",
"order": 30004,
"name_code": 3002,
"corporation": "ELYSION",
"resource_id": 11,
"name_localkey": "Neon",
"original_rare": "SR",
"critical_ratio": 1500,
"category_type_1": "None",
"category_type_2": "None",
"category_type_3": "None",
"critical_damage": 15000,
"eff_category_type": "Walk",
"eff_category_value": 0
}
},
"generatorSupported": false,
"simSupported": false,
"baseStats": {
"hp": 11500,
"atk": 450,
"def": 86,
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
"resourceId": 11
}
}

---

# SECTION 4 — S2b test-faithfulness review (blind claude-fable-5, converged with driver on all 4 lines)

{
"slug": "neon",
"leakDetected": null,
"spec": [
{
"slot": "skill1",
"kitLine": "Activates when killing an enemy",
"disposition": "UNMODELED",
"scope": "Generic Critical Rate (no normal-attack/charge scoping in the text)",
"durationSemantics": "durationSec: 5 (wall-clock 'for 5 sec')",
"triggerIdentity": "On-kill trigger. The sim has NO kill event and the scope-lock raid boss is immortal/partless — this trigger can never fire in-sim. No engine TriggerDef expresses it; structurally inert at scope.",
"targetSet": "alliesTopAtk count:2, byFinalAtk:true ('highest FINAL ATK' — the literal-word rule sets byFinalAtk only because the text says final)",
"nearestWrongModel": "Encoding it as an active buff anyway — e.g. an interval or passive critRatePct 3.56 self/ally buff 'to approximate kill procs' — which over-credits a line that produces zero activations against a boss that never dies.",
"distinguishingAssertion": "Run controlComp with neon; collect buffApply events: NO buffApply with stat critRatePct and value 3.56 ever appears in the full 180s log. Additionally, totals(res) is bit-identical when the override is patched to strip any skill1 block (withPatchedOverride(neon, o => { o.skill1 = [] })) — the slot must be damage-inert.",
"inertness": "Skill1 must move nothing: no buffApply, no damage delta on any unit, no gauge delta.",
"evidenceTier": "DATAMINED",
"loadBearing": false
},
{
"slot": "skill2",
"kitLine": "Activates at the beginning of Full Burst",
"disposition": "FAITHFUL",
"scope": "Generic critRatePct — the text does NOT say 'of normal attacks', so it is the unscoped stat (skill/burst hits crit-eligible too), not critRateNormalPct.",
"durationSemantics": "'for 2 shots' is a ROUND/SHOT count → durationShots: 2, per-HOLDER (each ally's own next 2 rounds), spanning reloads, with NO time expiry (no durationSec). This is the taxonomy's #2 trap verbatim.",
"triggerIdentity": "fullBurstEnter — 'at the beginning of Full Burst' fires on ANY team Full Burst, every rotation, regardless of who cast which stage. NOT burstCast (neon is B1; keying to her own cast would fire pre-FB and at the wrong times).",
"targetSet": "allies, all-including-self ('Affects all allies', no except-self clause) — {kind:'allies'} with no excludeSelf.",
"nearestWrongModel": "durationSec: 2 instead of durationShots: 2. For a slow-cadence SG holder 2 seconds ≈ 2 shots so the error hides, but for a fast-cadence holder (MG/SMG teammate) a 2-second window covers dozens of rounds vs the kit's exactly 2 — massive over-credit. Secondary misread: keying to burstCast (only rotations neon herself bursts).",
"distinguishingAssertion": "At each fullBurstStart, a buffApply with stat critRatePct, value 45.93 appears for EVERY living ally (targetIdx spanning all 5 slots) carrying durationShots === 2 and no meaningful expiresFrame-based 2s lapse. Faithful-green/wrong-red: for a fast-firing holder, count damage events with elevated crit rate after FB entry — exactly the next 2 rounds benefit; under durationSec:2 the count is cadence×2s ≫ 2. Also assert the buff re-applies at EVERY fullBurstStart (one per rotation), not only on rotations neon casts B1.",
"inertness": "No crit lift outside the 2-round windows; the buff must not persist as a permanent passive.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Deals 528.97% of final ATK as Burst Skill",
"disposition": "FAITHFUL",
"scope": "One instant burst-bucket damage instance; no core ('core strike' not stated); crit per the engine's burst-hit convention.",
"durationSemantics": "Instant hit, no duration.",
"triggerIdentity": "burstCast — the damage line sits in her OWN burst block; it fires ONLY on rotations neon actually casts Burst I (cd 20s). Per the measured timing rule, burst-cast damage lands BEFORE the Full Burst window opens → no +50% FB major, no FB-entry auras.",
"targetSet": "enemy ('1 enemy unit with the highest final DEF' — trivially the single boss).",
"nearestWrongModel": "Applying the +50% Full Burst major to the hit (or keying it to fullBurstEnter so it lands inside FB and on rotations another B1 casts). Either over-credits ~50% on ~9 casts.",
"distinguishingAssertion": "Every burstCast damage event from neon's slot with mult 528.97 has bucket 'burst', inFullBurst === false and fbMajorApplied === false, and the count of such events equals neon's actual B1 cast count in the rotation log (not the team's FB count).",
"inertness": "Zero instances on rotations where another Burst I unit (e.g. liter in controlComp) takes the B1 cast instead of neon.",
"evidenceTier": "DATAMINED",
"loadBearing": true
},
{
"slot": "burst",
"kitLine": "Max Ammunition Capacity ▲ 3 round(s)",
"disposition": "FAITHFUL",
"scope": "Weapon-state modifier — this IS damage (taxonomy #6): +3 max ammo on a 9-round SG = 12-round magazines during the window → fewer reloads → more shots fired.",
"durationSemantics": "durationSec: 10 (wall-clock 'for 10 sec'). CRITICAL: '3 round(s)' here is the VALUE'S unit (a flat +3 rounds of capacity), NOT a duration — do not read it as durationShots.",
"triggerIdentity": "burstCast (rides her own Burst I cast, same block family as the damage line).",
"targetSet": "alliesOfWeapon weapon:'SG', INCLUDING self ('all allies with a Shotgun', no except-self; neon is SG so she self-benefits). Weapon-typed, class/element-blind.",
"nearestWrongModel": "maxAmmoPct 3 (a 3% capacity scale ≈ +0 rounds after flooring — silently inert) instead of maxAmmoFlat 3; or targeting all allies unconditionally so non-SG units get the capacity too.",
"distinguishingAssertion": "On each neon burst cast, buffApply events with stat maxAmmoFlat, value 3, durationSec-consistent expiresFrame (~600 frames) appear ONLY on SG-wielding units (neon + any SG carry); liter/crown (non-SG) receive NONE. Faithful-green/wrong-red: during the 10s window an SG holder's reload events space out at 12 shots per magazine (count shot events between consecutive reload events === 12), reverting to 9 after expiry; under maxAmmoPct 3 the spacing stays 9 (red).",
"inertness": "Non-SG allies' magazine size and reload cadence must not move; outside the 10s windows SG magazines are exactly 9.",
"evidenceTier": "DATAMINED",
"loadBearing": true
}
],
"loadBearingSet": [
"skill2:critRatePct 45.93 for 2 shots @ fullBurstEnter (allies)",
"burst:flatDamage 528.97% burst bucket @ burstCast (pre-FB, no +50%)",
"burst:maxAmmoFlat +3 for 10s @ burstCast (SG allies incl. self)"
],
"unmodeledVerbatim": {
"skill1": [
"Activates when killing an enemy. Affects 2 ally unit(s) with the highest final ATK.",
"Critical Rate ▲ 3.56% for 5 sec."
],
"skill2": [],
"burst": []
},
"notes": "Three reconciliation points. (1) FIXTURE HAZARD — neon is Burst I, but controlComp(carry) seats the carry in the B3 slot with liter fixed at B1: a naive controlComp(neon) makes her compete with liter for every B1 cast under first-ready/slot-order selection, so burst-line assertions may silently see zero neon casts. The tests must either verify neon actually wins B1 casts in the fixture (count her burstCast events > 0 as a precondition) or build a custom comp replacing liter; skill2 assertions are immune (fullBurstEnter fires regardless of who cast B1). (2) EXPECTED SHARED-PRIOR MISREAD — skill2's 'for 2 shots' as durationSec:2. On SG-heavy comps the two encodings nearly coincide (~1 shot/sec), so a board-fit test won't catch it; only a per-round event-count assertion on a fast-cadence holder discriminates. Demand the durationShots===2 field assertion, not a totals-level check. (3) burst '▲ 3 round(s)' must be maxAmmoFlat (the theme-14 flat-round stat), not maxAmmoPct — a 3% read is de-facto inert and a totals assertion against the faithful reload-spacing shift catches it. Skill1 is structurally dead at scope (no kill events vs an immortal boss) and belongs verbatim in unmodeled; any active encoding of it is over-credit.",
"model": "claude-fable-5"
}

---

# SECTION 5 — S5 blind test (blind claude-opus-5) + its result vs the DRIVER override

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

- neon — Neon (SG / Fire / Supporter / Burst I), cd 20s, ammo 9, 10 pellets/shot.
-
- KIT (ground truth, read literally):
- skill1: "Activates when killing an enemy. Affects 2 ally unit(s) with the highest final ATK.
-            Critical Rate ▲ 3.56% for 5 sec."
- skill2: "Activates at the beginning of Full Burst. Affects all allies.
-            Critical Rate ▲ 45.93% for 2 shots."
- burst : "Affects 1 enemy unit(s) with the highest final DEF. Deals 528.97% of final ATK as
-            Burst Skill damage."
-         + "Affects all allies with a Shotgun. Max Ammunition Capacity ▲ 3 round(s) for 10 sec."
-
- FIXTURE: controlComp('neon', true) — liter B1 / crown B2 / neon (carry, focus) / helm B3.
- neon is Burst I; the control comp already supplies B1/B2/B3 coverage so full bursts actually
- occur (a comp that cannot chain makes ZERO full bursts and every FB-keyed assertion below
- would be vacuous). The fixed-B3 slot (helm) is kept because helm's S1 carries
- critRateNormalPct — a DIFFERENT stat key from neon's unscoped critRatePct — so it cannot
- collide with, mask, or forge any of neon's critRatePct events. Non-vacuity of the FB path is
- asserted explicitly (fullBurstStart count > 0) before any FB-keyed claim is read.
-
- WHY EACH ASSERTION DISCRIMINATES — the four questions per line:
- scope: both crit lines are UNSCOPED "Critical Rate ▲" → stat 'critRatePct', NOT
-          'critRateNormalPct'. The nearest-wrong model (scoping to normal attacks only) is caught
-          by asserting the emitted stat key literally, and by a counterfactual that swaps the key
-          and moves the board.
- duration semantics: skill2 says "for 2 shots" — a ROUND count → durationShots: 2, NEVER
-          durationSec: 2. The nearest-wrong model (2 seconds of wall clock) is a DIFFERENT window
-          length; the test pins durationShots === 2 on the event and asserts a seconds-encoded
-          clone diverges in total damage. skill1 says "for 5 sec" → durationSec: 5.
- trigger identity: skill2 is "at the beginning of Full Burst" → fullBurstEnter (fires on ANY
-          team Full Burst — NOT burstCast, which would fire pre-FB and lose the +50% FB major).
-          The test asserts every skill2 apply frame coincides with a fullBurstStart frame, which a
-          burstCast keying provably cannot satisfy (a Burst I cast lands strictly before the FB
-          window opens). skill1 is "when killing an enemy" — the scope-lock boss is a single
-          immortal raid boss that never dies, so this trigger CANNOT fire; it is a GAP.
- target set: skill2 "all allies" → 4 distinct targetSlugs incl. neon herself. burst crit line —
-          n/a. burst ammo line "all allies with a Shotgun" → alliesOfWeapon SG (weapon-typed,
-          class-blind, self included); asserted by checking every maxAmmoFlat recipient is an SG
-          wielder and that non-SG allies are untouched.
-
- INERTNESS: neon's burst nuke must live in the BURST bucket only and must not move teammates'
- totals; the ammo grant must not touch non-SG allies.
-
- RUNS ARE HOISTED — each runComp is a full 180 s sim. 6 runs total.
  */

// ---------------------------------------------------------------------------
// Hoisted runs
// ---------------------------------------------------------------------------

function run(opts: ReturnType<typeof controlComp>) {
const events: SimEvent[] = [];
const res = runComp({ ...opts, onEvent: (ev: SimEvent) => events.push(ev) });
return { res, events };
}

const BASE = run(controlComp('neon', true));

// Counterfactual A — skill2 crit re-scoped to normal attacks only (nearest-wrong SCOPE).
const CF_SCOPED = run({
...controlComp('neon', true),
overrides: {
neon: withPatchedOverride('neon', (ov) => {
for (const b of ov.skill2!.blocks) {
for (const e of b.effects) {
if (e.kind === 'buff' && e.stat === 'critRatePct') {
(e as { stat: string }).stat = 'critRateNormalPct';
}
}
}
}),
},
});

// Counterfactual B — skill2 "2 shots" re-read as "2 seconds" (nearest-wrong DURATION SEMANTICS).
const CF_SECONDS = run({
...controlComp('neon', true),
overrides: {
neon: withPatchedOverride('neon', (ov) => {
for (const b of ov.skill2!.blocks) {
for (const e of b.effects) {
if (e.kind === 'buff' && e.stat === 'critRatePct') {
delete (e as { durationShots?: number }).durationShots;
(e as { durationSec?: number }).durationSec = 2;
}
}
}
}),
},
});

// Counterfactual C — skill2 re-keyed to burstCast (nearest-wrong TRIGGER IDENTITY).
const CF_BURSTCAST = run({
...controlComp('neon', true),
overrides: {
neon: withPatchedOverride('neon', (ov) => {
for (const b of ov.skill2!.blocks) {
if (b.trigger.kind === 'fullBurstEnter') {
(b as { trigger: { kind: string } }).trigger = { kind: 'burstCast' };
}
}
}),
},
});

// Counterfactual D — burst nuke removed (isolates the 528.97% damage line).
const CF_NO_NUKE = run({
...controlComp('neon', true),
overrides: {
neon: withPatchedOverride('neon', (ov) => {
for (const b of ov.burst!.blocks) {
b.effects = b.effects.filter((e) => e.kind !== 'flatDamage');
}
ov.burst!.blocks = ov.burst!.blocks.filter((b) => b.effects.length > 0);
}),
},
});

// Counterfactual E — burst SG ammo grant removed (isolates the weapon-state line).
const CF_NO_AMMO = run({
...controlComp('neon', true),
overrides: {
neon: withPatchedOverride('neon', (ov) => {
for (const b of ov.burst!.blocks) {
b.effects = b.effects.filter(
(e) => !(e.kind === 'buff' && e.stat === 'maxAmmoFlat'),
);
}
ov.burst!.blocks = ov.burst!.blocks.filter((b) => b.effects.length > 0);
}),
},
});

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type DamageEv = Extract<SimEvent, { kind: 'damage' }>;

const buffApplies = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const damages = (evs: SimEvent[]) =>
evs.filter((e): e is DamageEv => e.kind === 'damage');

const NEON_IDX = 2; // controlComp slot order: liter / crown / carry / helm — carry is the focus (middle).

// neon's crit grants: unscoped critRatePct cast BY neon. helm carries critRateNormalPct (a
// different stat key), so this filter cannot pick up a teammate's buff.
const neonCrit = (evs: SimEvent[]) =>
buffApplies(evs).filter(
(e) => e.stat === 'critRatePct' && e.casterIdx === NEON_IDX,
);

const fbStartFrames = (evs: SimEvent[]) =>
new Set(
evs.filter((e) => e.kind === 'fullBurstStart').map((e) => (e as { frame: number }).frame),
);

// ---------------------------------------------------------------------------

describe('neon — fixture is non-vacuous', () => {
it('the control comp actually enters Full Burst (else every FB assertion below is vacuous)', () => {
expect(fbStartFrames(BASE.events).size).toBeGreaterThan(0);
});

it('neon is in the comp and deals damage', () => {
expect(unitOf(BASE.res, 'neon').totalDamage).toBeGreaterThan(0);
});
});

describe('neon skill1 — "killing an enemy" → 2 highest-final-ATK allies, Critical Rate ▲3.56% / 5 s', () => {
// GAP: the scope-lock fight is a single immortal raid boss that is never killed, so the
// activation clause can never be satisfied. The block is authored for kit completeness and is
// structurally inert. There is no engine trigger for "on enemy kill" and nothing to observe.
it.skip(
'GAP — on-kill trigger is unreachable at scope lock (immortal partless boss, nothing ever dies); ' +
'no engine trigger kind expresses "when killing an enemy", so the 3.56%/5 s grant is unobservable',
() => {},
);

it('emits NO 3.56% crit grant during the fight (the kill trigger never fires)', () => {
const kill = neonCrit(BASE.events).filter(
(e) => Math.abs(e.value - 3.56) < 1e-6,
);
expect(kill).toHaveLength(0);
});
});

describe('neon skill2 — FB entry, all allies, Critical Rate ▲45.93% for 2 SHOTS', () => {
const applies = () =>
neonCrit(BASE.events).filter((e) => Math.abs(e.value - 45.93) < 1e-6);

it('fires at all (non-vacuity: the 45.93% grant is actually applied)', () => {
expect(applies().length).toBeGreaterThan(0);
});

it('SCOPE — the grant is UNSCOPED critRatePct, not critRateNormalPct', () => {
// Kit says plain "Critical Rate ▲", so it must lift skill/burst crit too. The nearest-wrong
// model scopes it to normal attacks; that key would emit nothing under this filter...
expect(applies().length).toBeGreaterThan(0);
// ...and it is not merely a naming difference: re-scoping moves the board.
expect(totals(CF_SCOPED.res)['neon']).not.toBeCloseTo(
totals(BASE.res)['neon'],
6,
);
});

it('DURATION SEMANTICS — durationShots === 2 (a ROUND count), never a 2-second window', () => {
for (const e of applies()) {
expect(e.durationShots).toBe(2);
}
// A 2-second re-read is a genuinely different window: the whole-comp damage must diverge.
const sum = (r: ReturnType<typeof runComp>) =>
Object.values(totals(r)).reduce((a, b) => a + b, 0);
expect(sum(CF_SECONDS.res)).not.toBeCloseTo(sum(BASE.res), 6);
});

it('TRIGGER IDENTITY — every application lands exactly on a fullBurstStart frame (FB-enter, not burst-cast)', () => {
const fbFrames = fbStartFrames(BASE.events);
for (const e of applies()) {
expect(fbFrames.has((e as unknown as { frame: number }).frame)).toBe(true);
}
// A burstCast keying fires strictly BEFORE the FB window opens (neon is Burst I), so the
// buffed shots fall outside Full Burst and the totals must differ.
expect(totals(CF_BURSTCAST.res)['neon']).not.toBeCloseTo(
totals(BASE.res)['neon'],
6,
);
});

it('TARGET SET — "all allies": every comp member incl. neon receives it, once per FB', () => {
const fbCount = fbStartFrames(BASE.events).size;
const perSlug = new Map<string, number>();
for (const e of applies()) {
perSlug.set(e.targetSlug, (perSlug.get(e.targetSlug) ?? 0) + 1);
}
expect(perSlug.size).toBe(Object.keys(totals(BASE.res)).length);
expect(perSlug.has('neon')).toBe(true); // "all allies" includes self — no excludeSelf
for (const n of perSlug.values()) {
expect(n).toBe(fbCount);
}
});
});

describe('neon burst — 528.97% of final ATK as Burst Skill damage', () => {
it('lands in the BURST bucket, once per neon burst cast', () => {
const casts = BASE.events.filter(
(e) => e.kind === 'burstCast' && (e as { slot?: number }).slot === NEON_IDX,
).length;
expect(casts).toBeGreaterThan(0);
const nuke = damages(BASE.events).filter(
(d) => d.srcSlot === NEON_IDX && d.bucket === 'burst',
);
expect(nuke.length).toBe(casts);
});

it('is FB-exempt — a burst cast resolves before the Full Burst window opens (no +50% major)', () => {
for (const d of damages(BASE.events).filter(
(x) => x.srcSlot === NEON_IDX && x.bucket === 'burst',
)) {
expect(d.fbMajorApplied).toBe(false);
}
});

it('DISCRIMINATES — removing the 528.97% line strictly lowers ONLY neon, teammates byte-identical', () => {
const base = totals(BASE.res);
const cf = totals(CF_NO_NUKE.res);
expect(cf['neon']).toBeLessThan(base['neon']);
for (const slug of Object.keys(base)) {
if (slug === 'neon') continue;
expect(cf[slug]).toBeCloseTo(base[slug], 6);
}
});

it('INERTNESS — the nuke never lands in the normal/charge/skill buckets', () => {
const strayBuckets = damages(BASE.events)
.filter((d) => d.srcSlot === NEON_IDX)
.map((d) => d.bucket);
expect(strayBuckets).toContain('burst');
expect(strayBuckets).toContain('normal');
expect(strayBuckets).not.toContain('charge'); // neon has chargeFrames 0 — no charge shots exist
});

it('"1 enemy with the highest final DEF" is scope-trivial (single partless boss) — one hit, not N', () => {
const casts = BASE.events.filter(
(e) => e.kind === 'burstCast' && (e as { slot?: number }).slot === NEON_IDX,
).length;
const nuke = damages(BASE.events).filter(
(d) => d.srcSlot === NEON_IDX && d.bucket === 'burst',
);
expect(nuke.length).toBe(casts); // never a multiple of casts — no per-enemy fan-out
});
});

describe('neon burst — "all allies with a Shotgun": Max Ammunition ▲3 rounds for 10 s', () => {
const ammo = () =>
buffApplies(BASE.events).filter(
(e) => e.stat === 'maxAmmoFlat' && e.casterIdx === NEON_IDX,
);

it('fires at all, granting FLAT 3 rounds (maxAmmoFlat, not maxAmmoPct)', () => {
expect(ammo().length).toBeGreaterThan(0);
for (const e of ammo()) {
expect(e.value).toBe(3);
}
});

it('TARGET SET — weapon-typed, class-blind: neon (SG) receives it; non-SG allies do NOT', () => {
const recipients = new Set(ammo().map((e) => e.targetSlug));
expect(recipients.has('neon')).toBe(true); // no excludeSelf in the kit text
// Every recipient must be an SG wielder. Any non-SG recipient means the target set was
// mis-encoded as `allies` (or alliesOfClass Supporter) instead of alliesOfWeapon SG.
for (const slug of recipients) {
const weapon = unitOf(BASE.res, slug).weapon;
expect(weapon).toBe('SG');
}
});

it('DURATION — a 10 s wall-clock window (durationSec), NOT a round count', () => {
for (const e of ammo()) {
expect(e.durationShots).toBeUndefined();
expect(e.expiresFrame).toBeGreaterThan(0);
}
});

it('IS DAMAGE — an ammo grant gates shots fired: removing it moves an SG holder\u2019s total', () => {
// Weapon-state modifiers are damage (failure-mode taxonomy #6). neon fires 9 rounds per
// magazine with a 129-frame reload; +3 rounds for 10 s across her own burst window means
// strictly more shots inside Full Burst, so her total must fall when the grant is removed.
expect(totals(CF_NO_AMMO.res)['neon']).toBeLessThan(totals(BASE.res)['neon']);
});

it('INERTNESS — removing the ammo grant leaves every non-SG teammate byte-identical', () => {
const base = totals(BASE.res);
const cf = totals(CF_NO_AMMO.res);
for (const slug of Object.keys(base)) {
if (unitOf(BASE.res, slug).weapon === 'SG') continue;
expect(cf[slug]).toBeCloseTo(base[slug], 6);
}
});
});

describe('neon — no invented mechanics (⚑ discipline)', () => {
it('grants exactly TWO distinct crit magnitudes at most (3.56 / 45.93) — nothing else', () => {
const vals = new Set(neonCrit(BASE.events).map((e) => e.value));
for (const v of vals) {
expect([3.56, 45.93]).toContain(v);
}
});

it('carries no DoT, no weapon swap, no pierce, no stored hits (kit text has none)', () => {
const kinds = new Set(
damages(BASE.events)
.filter((d) => d.srcSlot === NEON_IDX)
.map((d) => d.bucket),
);
expect(kinds.has('charge')).toBe(false);
// Only normal + burst channels exist for this kit.
for (const k of kinds) {
expect(['normal', 'burst']).toContain(k);
}
});
});

### S5 result vs the DRIVER override (scripts/kit-autonomy/blind/neon.blind-run.txt)

Run via `.vitest.blind.config.mts` on the ADAPTED variant (`neon.adapted.test.ts` — 6 mechanical,
mechanics-only fixes documented in its header: harness import path; onEvent moved into cfg; override
slots are plain block arrays not `.blocks` wrappers; damage.srcSlot is a kit-line NAME not a unit
index ('d.srcSlot === NEON_IDX' -> "d.slug === 'neon'"); burstCast events carry unitIdx not slot;
durationShots:null vs undefined. NO assertion semantics changed — same adaptation class as epinel
2026-08-03).

**Result: 18 passed | 2 failed | 1 skipped (21 total). The skip is the blind author's own intentional
GAP-skip of the unreachable on-kill trigger. Driver classification of the 2 failures — both BLIND-TEST
ARTIFACTS, neither a REAL-GOTCHA:**

1. 'SCOPE — the grant is UNSCOPED critRatePct, not critRateNormalPct' — the EVENT-LEVEL scope pin
   PASSED (the grant's stat IS critRatePct; applies().length > 0 under a stat==='critRatePct' filter).
   Only the blind author's TOTALS-level cross-check failed (diff exactly 0): it assumed re-scoping the
   buff would move neon's OWN total, but neon's burst nuke lands on her burstCast frame — BEFORE the
   Full Burst window opens, hence before her own S2 buff exists (shotsLeft-lapsed by then) — so her
   nuke never sits inside her own S2 window and scoped-vs-unscoped cannot move her personal total in
   ANY fixture where she is the B1. The scope distinction is real and is carried by teammates'
   skill/burst riders + the stat-key pin, not by neon's own total. Artifact of the blind test's
   discrimination choice, not a faithfulness issue.
2. 'INERTNESS — removing the ammo grant leaves every non-SG teammate byte-identical' — failed by
   66,076 damage on a non-SG teammate (~0.076% of 87.4M). Cause: the +3-round window makes neon+naga
   fire EXTRA REAL SHOTS, and every real shot pumps the SHARED team burst gauge (4.5/shot) — so the
   grant legitimately shifts Full-Burst timing for the whole team. The TARGET-SET pin PASSED (every
   recipient is an SG wielder, neon included, no non-SG recipient), so the buff itself is correctly
   scoped; the byte-identity premise ignored the shared-gauge channel. Artifact, not a gotcha.

All 18 passing assertions verify the driver encoding: non-vacuous FBs; no 3.56% grant ever emitted
(kill trigger dead at scope); 45.93 unscoped grants with durationShots===2 landing exactly on
fullBurstStart frames for every comp member once per FB; burstCast-vs-FB-enter timing; nuke in the
burst bucket once per cast with fbMajorApplied===false; nuke removal lowers only neon; maxAmmoFlat
value 3, 10s wall-clock expiry, SG-only recipients, and removing it lowers neon's total.

---

# SECTION 6 — S6 blind override (blind claude-opus-5) + short diff vs the driver override

{
"slug": "neon",
"skill1": [],
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
"stat": "critRatePct",
"value": 45.93,
"durationShots": 2
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
"atkPct": 528.97
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
"stat": "maxAmmoFlat",
"value": 3,
"durationSec": 10
}
]
}
],
"unmodeled": {
"skill1": [
"Activates when killing an enemy. Affects 2 ally unit(s) with the highest final ATK. Critical Rate ▲ 3.56% for 5 sec."
],
"skill2": [],
"burst": [
"Affects 1 enemy unit(s) with the highest final DEF. (single-target selection — the scope-lock fight has one boss, so the DEF-ranked selector is a no-op)"
]
},
"caveats": [
"skill1 is entirely inert at scope lock: its trigger is an enemy KILL and the raid boss is never killed during the 180s fight. There is also no on-kill TriggerDef in the schema. If a future fight profile includes killable adds, this line becomes live: 2 highest-final-ATK allies (alliesTopAtk count:2, byFinalAtk:true — the text says 'final ATK'), critRatePct 3.56 for 5 sec.",
"⚑ skill2 duration semantics: 'for 2 shots' is modeled as a ROUND count (durationShots:2) per the round-count convention, NOT 2 seconds. Unverified whether the in-game counter decrements per trigger pull or per pellet/hit for a SG holder; durationShots decrements per round fired (1 per pull for a SG), which is the assumed reading.",
"⚑ skill2 is unscoped Critical Rate (no 'of normal attacks' clause) → critRatePct, so it feeds skill/burst crit as well as normals. Modeled literally from the text.",
"Burst damage is burst-cast (lands before the Full Burst window opens) so it takes no +50% FB major — this is engine-automatic for burstCast timing, not flagged via noFb.",
"No noFb / noRange set anywhere: noRange is engine-automatic, and per-kit noFb is measured-only."
],
"note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Neon (neon), SG/Fire/Supporter/Burst I. Modeled: S2 team-wide unscoped Critical Rate ▲45.93% on Full-Burst entry with a 2-ROUND duration; burst single-target 528.97% of final ATK plus Max Ammunition ▲3 flat rounds for 10s to all Shotgun allies (self included — neon is SG). S1 is deliberately unmodeled: it is gated on killing an enemy, which never occurs against the partless raid boss, and the schema carries no on-kill trigger. The burst's 'highest final DEF' enemy selector is a no-op in a single-boss fight. maxAmmoFlat is a weapon-state modifier and therefore a damage line (it gates shots fired per magazine across the 10s window for every SG on the team), not a skippable utility grant.",
"hasPierce": false
}

### Short diff vs the driver override (src/skills/overrides/neon.json)

**STRUCTURALLY IDENTICAL on all three modeled blocks** (byte-for-byte same trigger/target/effects):
skill2: fullBurstEnter -> allies -> buff critRatePct 45.93 durationShots 2
burst[0]: burstCast -> enemy -> flatDamage 528.97
burst[1]: burstCast -> alliesOfWeapon SG -> buff maxAmmoFlat 3 durationSec 10
and the SAME skill1 treatment: empty slot + the kill-gated line verbatim in unmodeled.skill1.
Non-structural differences only:
(a) their unmodeled.skill1 flattens the prose's embedded newline to a space (whitespace-only);
(b) they add an extra DOCUMENTATION entry in unmodeled.burst noting the 'highest final DEF' selector
is a no-op vs the single partless boss (the driver documents the same collapse in the note);
(c) note/caveats framing (their caveats carry the same two flags as the driver's — the
durationShots-vs-seconds reading and the unscoped-crit reading — plus the pre-FB nuke timing);
(d) a hasPierce:false field and the packet's PARSER-BASELINE banner (packet convention).
Independent convergence: the blind S6 author also flagged skill1 as deliberately-not-encoded (no
on-kill TriggerDef, immortal boss) with the same future-recipe (alliesTopAtk count:2 byFinalAtk:true).

---

# SECTION 7 — DRIVER implementation under judgment

## scripts/tests/units/neon.test.ts (driver spec — 22 assertions, all GREEN)

// PER-UNIT KIT SPEC — `neon` (Neon — the BASE SG/Supporter/Fire/Burst I, Elysion, cd 20s,
// ammo 9, reloadFrames 129, hitsPerShot 10 (pellets), normalMult 224.5, baseCrit 15/150).
// EXACT SLUG: `neon`. The slug-disambiguation lint's AMBIGUOUS-base advisory fires on the bare
// name by design (the base unit's display name is "Neon" with no variant colon, so the lint
// cannot distinguish base from variant) and is explicitly resolved on this slug (S0): this spec
// is about neon (SG/Fire), NOT neon-blue-ocean (MG/Water Burst III, "nbo") and NOT
// neon-vision-eye (RL/Electric Burst III, "nve") — anis/milk precedent for the same advisory.
// Kit-autonomy gauntlet 2026-08-04, test-first, FROM SCRATCH (no prior override;
// simSupported:false flipped by this gauntlet). 9 runs: base + 8 counterfactual/reference
// patches (s1Passive, noS2, s2SecBased, s2BurstCast, noNuke, noAmmo, ammoAllies, ammoSelf).
//
// Kit (blablalink prose, data/characters.json → characters.neon.skills, SL10):
// S1 ■ killing an enemy → 2 allies with the highest FINAL ATK:
// Critical Rate ▲3.56% for 5 sec [N1 gap]
// S2 ■ beginning of Full Burst → all allies:
// Critical Rate ▲45.93% for 2 shots [N2]
// BU ■ 1 enemy with the highest FINAL DEF:
// 528.97% of final ATK as Burst Skill damage [N3]
// ■ all allies with a Shotgun:
// Max Ammunition Capacity ▲3 round(s) for 10 sec [N4]
//
// Model + dispositions (line inventory — all 4 lines accounted):
// N1 UNMODELED. The trigger is an enemy KILL. The engine has no kill event (grep-verified:
// no kill primitive in src/engine — the scope-lock boss is immortal, there are no adds),
// so the line can NEVER fire in any sim run and contributes exactly zero damage.
// Encoding it (e.g. a passive critRatePct 3.56 on alliesTopAtk) would fabricate a buff
// the sim's world cannot produce — that nearest-wrong model is the counterfactual N1
// discriminates against. Verbatim in unmodeled.skill1 + ⚑ (out-of-domain: world model;
// in real multi-add content kills are frequent, so in-game the top-2-final-ATK pair runs
// +3.56% crit at near-full uptime; here zero). epinel/volume precedent for the class.
// N2 fullBurstEnter → allies → critRatePct 45.93, durationShots 2. "Activates at the
// beginning of Full Burst" = fullBurstEnter — fires only when a Full Burst ACTUALLY
// opens. In this fixture helm (B3, 40s CD) gates the chain, so neon casts her B1 9×
// but only 5 Full Bursts open: fullBurstEnter-vs-burstCast is therefore pinned by BOTH
// timing (the buff lands on the fullBurstStart frame) AND count (5 grant-waves vs 9
// casts). "For 2 shots" = the engine's round-count duration
// (types.ts durationShots): each holder's OWN next 2 shots carry the buff, then it dies
// (sim.ts round-count expiry: the Nth shot still carries the buff, it lapses right
// after). Plain "Critical Rate" → the unscoped critRatePct (volume precedent: lifts
// skill/burst buckets too, no normal-only scoping in the prose). The durationSec-misread
// counterfactual (10s window instead of 2 shots) over-damages and is pinned RED.
// N3 burstCast → enemy → flatDamage 528.97. Burst bucket; the cast lands BEFORE the Full
// Burst window opens, so the nuke never takes the +50% FB major (verified fact
// 2026-07-13; epinel/milk precedent, pinned via fbMajorApplied). "1 enemy with the
// highest final DEF" collapses to the single partless boss. Keyed to HER casts only —
// she is the fixture's only B1, so this is the same event count as FBs; the cast-timing
// (pre-FB) pin is the load-bearing one.
// N4 burstCast → alliesOfWeapon SG → maxAmmoFlat 3, durationSec 10. "All allies with a
// Shotgun" = the weapon-typed target (tove precedent — same shape, video-confirmed
// there); neon herself IS SG and is included. maxAmmoFlat adds FLAT rounds on top of
// the percent scaling in maxAmmo() (theme 14) — the correct primitive for "▲ N round(s)"
// (maxAmmoPct would mis-scale per ally's base mag). Observable: during the 10s window
// the SG allies' magazine cap is 9+3=12, so shots report ammoAfter up to 11 (> the
// base-8 ceiling). The target set {neon, naga} (both SG) vs helm (SR, excluded) pins
// alliesOfWeapon-vs-allies AND alliesOfWeapon-vs-self in one fixture.
//
// Fixture: slugs [neon, naga, helm] — neon B1 20s / naga B2 20s / helm B3 40s, boss Fire.
// Slot order: neon 0 / naga 1 / helm 2. The chain opens every ~40s (helm-gated), neon casts on
// every Full Burst, and the two SG allies make the SG-only ammo targeting observable. helm is
// the non-SG control: she must NOT receive the ammo buff. helm also carries critRateNormalPct
// (normal-scoped team crit) — every crit-rate assertion here is a DIFFERENTIAL (buffed vs
// contemporaneous unbuffed shots) so her contribution cancels. Deterministic (no seed);
// event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
data,
runComp,
totals,
unitOf,
withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: neon 0 / naga 1 / helm 2. */
const NEON = 0;
const NAGA = 1;
const HELM = 2;

const FIXTURE = {
slugs: ['neon', 'naga', 'helm'],
bossElement: 'Fire' as const,
};

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
const events: SimEvent[] = [];
const res = runComp({
...FIXTURE,
overrides,
cfg: { onEvent: (e) => events.push(e) },
});
return { res, events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
b.effects.some((e: any) => e.kind === kind);

/** N1 counterfactual: the kill-gated S1 misread as an always-on top-2-final-ATK crit buff

- (fabricates a buff the sim's immortal-boss world can never produce). */
  const neonS1Passive = withPatchedOverride('neon', (ov) => {
  if (ov.skill1.length !== 0) {
  throw new Error('neon skill1 blocks must be empty — fixture is stale');
  }
  ov.skill1 = [
  {
  slot: 'skill1',
  trigger: { kind: 'passive' },
  target: { kind: 'alliesTopAtk', count: 2, byFinalAtk: true },
  effects: [{ kind: 'buff', stat: 'critRatePct', value: 3.56 }],
  },
  ];
  });

/** N2 reference: the S2 FB-start crit line removed entirely (liveness baseline). */
const neonNoS2 = withPatchedOverride('neon', (ov) => {
const before = ov.skill2.length;
ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critRatePct'));
if (ov.skill2.length === before) {
throw new Error('neon S2 crit block missing — fixture is stale');
}
});

/** N2 counterfactual: "for 2 shots" misread as a 10s wall-clock window (permanent-FB uptime). */
const neonS2SecBased = withPatchedOverride('neon', (ov) => {
const b = ov.skill2.find((x: any) => hasStat(x, 'critRatePct'));
if (!b || b.trigger?.kind !== 'fullBurstEnter') {
throw new Error('neon S2 fullBurstEnter crit block missing — fixture is stale');
}
const e = b.effects.find((x: any) => x.stat === 'critRatePct');
delete e.durationShots;
e.durationSec = 10;
});

/** N2 counterfactual: "at the beginning of Full Burst" misread as neon's OWN burst cast.

- helm (40s) gates the chain, so she casts 9× but only 5 FBs open — this over-fires. */
  const neonS2BurstCast = withPatchedOverride('neon', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b) {
  throw new Error('neon S2 crit block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
  });

/** N3 reference: the burst nuke removed. */
const neonNoNuke = withPatchedOverride('neon', (ov) => {
const before = ov.burst.length;
ov.burst = ov.burst.filter((b: any) => !hasKind(b, 'flatDamage'));
if (ov.burst.length === before) {
throw new Error('neon burst nuke block missing — fixture is stale');
}
});

/** N4 reference: the SG ammo line removed. */
const neonNoAmmo = withPatchedOverride('neon', (ov) => {
const before = ov.burst.length;
ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'maxAmmoFlat'));
if (ov.burst.length === before) {
throw new Error('neon burst ammo block missing — fixture is stale');
}
});

/** N4 counterfactual A: "allies with a Shotgun" misread as ALL allies (helm would be buffed). */
const neonAmmoAllies = withPatchedOverride('neon', (ov) => {
const b = ov.burst.find((x: any) => hasStat(x, 'maxAmmoFlat'));
if (!b || b.target?.kind !== 'alliesOfWeapon') {
throw new Error('neon burst ammo block missing — fixture is stale');
}
b.target = { kind: 'allies' };
});

/** N4 counterfactual B: the SG filter collapsed to SELF ONLY (naga would be excluded). */
const neonAmmoSelf = withPatchedOverride('neon', (ov) => {
const b = ov.burst.find((x: any) => hasStat(x, 'maxAmmoFlat'));
if (!b) {
throw new Error('neon burst ammo block missing — fixture is stale');
}
b.target = { kind: 'self' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Passive = run({ neon: neonS1Passive });
const noS2 = run({ neon: neonNoS2 });
const s2SecBased = run({ neon: neonS2SecBased });
const s2BurstCast = run({ neon: neonS2BurstCast });
const noNuke = run({ neon: neonNoNuke });
const noAmmo = run({ neon: neonNoAmmo });
const ammoAllies = run({ neon: neonAmmoAllies });
const ammoSelf = run({ neon: neonAmmoSelf });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
evs.filter((e): e is Damage => e.kind === 'damage');
const shots = (evs: SimEvent[]) =>
evs.filter((e): e is Shot => e.kind === 'shot');
const neonBuffs = (evs: SimEvent[], stat: string) =>
buffs(evs).filter((b) => b.casterIdx === NEON && b.stat === stat);
const neonShots = (evs: SimEvent[]) =>
shots(evs).filter((s) => s.slug === 'neon');
const neonCasts = (evs: SimEvent[]) =>
evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'neon');
const fbStarts = (evs: SimEvent[]) =>
evs.filter((e) => e.kind === 'fullBurstStart');
const neonNukes = (evs: SimEvent[]) =>
dmg(evs).filter((d) => d.slug === 'neon' && d.srcSlot === 'burst');
const teamTotal = (t: Record<string, number>) =>
Object.values(t).reduce((a, b) => a + b, 0);

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('neon') as any;
if (!shipped) {
throw new Error('neon has no override on disk — fixture is stale');
}

/** The kit's logical lines, rebuilt from characters.json prose: each "■" bullet merged with its

- indented effect lines. The SSOT comparison target for the verbatim pins. _/
  const kitLines = (slot: 'skill1' | 'skill2' | 'burst'): string[] =>
  data.characters.neon.skills[slot]
  .split(/\n(?=■)/)
  .map((l) => l.replace(/^■\s_/, '').replace(/\n/g, ' ').trim());

describe('neon — fixture sanity (non-vacuity)', () => {
it('neon fires her SG continuously across many magazines', () => {
// Zero shots would make every round-count / ammo claim trivially true.
expect(neonShots(base.events).length).toBeGreaterThan(100);
});

it('the comp actually bursts: neon casts her BI on every Full Burst', () => {
expect(neonCasts(base.events).length).toBeGreaterThanOrEqual(2);
expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(2);
// She is the only B1: every Full Burst opens on one of her casts (the FB start lands a
// beat after her B1 cast, once the B2/B3 chain resolves).
const castFrames = neonCasts(base.events).map((c) => c.frame);
for (const fb of fbStarts(base.events)) {
expect(
castFrames.some((f) => fb.frame - f >= 0 && fb.frame - f < 5 * FPS)
).toBe(true);
}
// …but helm (B3, 40s CD) gates the chain, so neon ALSO casts on rotations that cannot
// complete (9 casts vs 5 FBs in 180s) — that asymmetry is exactly what makes the N2
// fullBurstEnter-vs-burstCast COUNT discrimination possible.
expect(neonCasts(base.events).length).toBeGreaterThan(
fbStarts(base.events).length
);
});

it('neon deals weapon damage', () => {
expect(unitOf(base.res, 'neon').totalDamage).toBeGreaterThan(0);
});
});

describe('N1 — S1 kill-triggered crit buff is honestly UNMODELED (no kills at scope)', () => {
it('neon originates no crit buff other than her S2 FB-start grant', () => {
// Her originated stats are exactly the S2 crit grant + the burst ammo grant — nothing
// else (no kill-fed 3.56 crit line, no proxy).
const own = buffs(base.events)
.filter((b) => b.casterIdx === NEON)
.map((b) => b.stat);
expect(own.length).toBeGreaterThan(0);
expect([...new Set(own)].sort()).toEqual(['critRatePct', 'maxAmmoFlat']);
// Every crit-family grant she originates is the 45.93 S2 line (no 3.56 anywhere).
const critValues = new Set(
buffs(base.events)
.filter((b) => b.casterIdx === NEON && b.stat.startsWith('crit'))
.map((b) => b.value)
);
expect([...critValues]).toEqual([45.93]);
});

it('the full S1 line sits verbatim in unmodeled.skill1 (checked vs characters.json)', () => {
// The prose carries an embedded newline between its two sentences; the verbatim record
// keeps it, so flatten whitespace on both sides before the containment check.
const documented = ((shipped.unmodeled?.skill1 ?? []) as string[])
.join(' ')
.replace(/\s+/g, ' ');
expect(documented).toContain(kitLines('skill1')[0]);
expect(shipped.skill1).toEqual([]);
});

it('DISCRIMINATING: an always-on top-2-final-ATK crit buff (the kill-line misread) inflates the team', () => {
expect(teamTotal(s1Passive.totals)).toBeGreaterThan(teamTotal(base.totals));
});
});

describe('N2 — S2 Full-Burst-start team crit: +45.93% for exactly 2 shots per ally', () => {
const grants = neonBuffs(base.events, 'critRatePct');

it('applies the exact kit magnitude, once per Full Burst, on the FB-start frame', () => {
const fbs = fbStarts(base.events);
// One grant PER ALLY per FB (the buffApply event fires per target).
expect(grants.length).toBe(fbs.length * FIXTURE.slugs.length);
expect([...new Set(grants.map((b) => b.value))]).toEqual([45.93]);
const fbFrames = new Set(fbs.map((f) => f.frame));
for (const g of grants) {
expect(fbFrames.has(g.frame)).toBe(true);
}
});

it('targets ALL allies and rides the round-count duration (2 shots, no wall-clock expiry)', () => {
expect(grants.length).toBeGreaterThan(0);
for (const g of grants) {
expect(g.durationShots).toBe(2);
expect(g.expiresFrame).toBeNull();
}
const targets = new Set(grants.map((g) => g.targetIdx));
expect([...targets].sort()).toEqual([NEON, NAGA, HELM]);
});

it('DISCRIMINATING: fullBurstEnter, NOT burstCast — the count diverges (helm gates the chain)', () => {
// neon casts 9× in 180s (20s CD) but only 5 Full Bursts open (helm's 40s CD): an
// own-cast keying would over-fire the crit grant on the 4 incomplete rotations.
const burstCastGrants = neonBuffs(s2BurstCast.events, 'critRatePct');
expect(burstCastGrants.length).toBe(
neonCasts(base.events).length * FIXTURE.slugs.length
);
expect(burstCastGrants.length).toBeGreaterThan(grants.length);
expect(grants.length).toBe(
fbStarts(base.events).length * FIXTURE.slugs.length
);
});

it('is consumed by EXACTLY 2 shots per FB window (differential crit rate, helm-cancelling)', () => {
// helm contributes her own normal-scoped crit buff with a different window, so the run
// carries up to 4 rate levels: {base, base+helm, base+neon, base+helm+neon}. The buffed
// levels are EXACTLY those a full 0.4593 above another observed level; within each FB
// window exactly 2 of neon's normal hits sit on a buffed level.
const normals = dmg(base.events).filter(
(d) => d.slug === 'neon' && d.srcSlot === 'normal' && d.critEligible
);
const levels = [...new Set(normals.map((h) => Math.round(h.critRate * 1e6)))];
const buffed = new Set(
levels.filter((r) =>
levels.some((l) => Math.abs(r - 0.4593 * 1e6 - l) < 1)
)
);
expect(buffed.size).toBeGreaterThanOrEqual(1);
let windows = 0;
for (const fb of fbStarts(base.events) as Array<
Extract<SimEvent, { kind: 'fullBurstStart' }> >) {
const inWindow = normals.filter(
(h) => h.inFullBurst && h.frame >= fb.frame && h.frame < fb.endFrame
);
if (inWindow.length < 3) {
continue; // a degenerate window cannot discriminate
}
windows++;
const buffedHits = inWindow.filter((h) =>
buffed.has(Math.round(h.critRate * 1e6))
);
expect(buffedHits.length).toBe(2);
}
expect(windows).toBeGreaterThanOrEqual(2);
});

it('is LIVE: removing it lowers her total (the FB-window crit lift is not decorative)', () => {
expect(base.totals.neon).toBeGreaterThan(noS2.totals.neon);
});

it('DISCRIMINATING: a 10s wall-clock misread (instead of 2 shots) over-damages her', () => {
expect(s2SecBased.totals.neon).toBeGreaterThan(base.totals.neon);
});
});

describe('N3 — burst nuke: 528.97% of final ATK, once per OWN cast, pre-FB', () => {
const nukes = neonNukes(base.events);
const casts = neonCasts(base.events);

it('fires once per own burst cast at the kit magnitude, in the burst bucket', () => {
expect(casts.length).toBeGreaterThanOrEqual(2);
expect(nukes.length).toBe(casts.length);
expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([528.97]);
expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
});

it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
expect(nukes.filter((d) => d.fbMajorApplied).length).toBe(0);
expect(nukes.filter((d) => d.inFullBurst).length).toBe(0);
});

it('DISCRIMINATING: removing the nuke zeroes her burst-bucket damage', () => {
expect(neonNukes(noNuke.events).length).toBe(0);
expect(base.totals.neon).toBeGreaterThan(noNuke.totals.neon);
});
});

describe('N4 — burst ammo grant: +3 rounds for 10s, SHOTGUN allies only', () => {
const grants = neonBuffs(base.events, 'maxAmmoFlat');
const casts = neonCasts(base.events);

it('fires once per own cast (per SG target), value 3, 10s wall-clock duration', () => {
// One buffApply per target: the two SG allies (neon + naga) each receive it per cast.
expect(grants.length).toBe(casts.length * 2);
expect([...new Set(grants.map((g) => g.value))]).toEqual([3]);
for (const g of grants) {
expect(g.expiresFrame! - g.frame).toBe(10 * FPS);
expect(g.durationShots).toBeNull();
}
});

it('targets exactly the SG allies: neon + naga, and NOT helm (SR)', () => {
const targets = new Set(grants.map((g) => g.targetIdx));
expect([...targets].sort()).toEqual([NEON, NAGA]);
expect(grants.some((g) => g.targetIdx === HELM)).toBe(false);
});

it('is LIVE: SG magazines run past the base 9-round cap inside the window (ammoAfter up to 11)', () => {
// ammoAfter = rounds LEFT after the pull, so a 12-round cap surfaces as ammoAfter 11 —
// strictly above the base-8 ceiling of an unbuffed 9-round SG magazine.
const maxInWindow = (evs: SimEvent[], slug: string) => {
let max = -1;
for (const c of neonCasts(evs)) {
for (const s of shots(evs).filter(
(x) => x.slug === slug && x.frame >= c.frame && x.frame < c.frame + 10 * FPS
)) {
max = Math.max(max, s.ammoAfter);
}
}
return max;
};
expect(maxInWindow(base.events, 'neon')).toBe(11);
expect(maxInWindow(base.events, 'naga')).toBe(11);
// Without the grant the cap stays 9 (ammoAfter never exceeds 8).
expect(maxInWindow(noAmmo.events, 'neon')).toBeLessThanOrEqual(8);
expect(maxInWindow(noAmmo.events, 'naga')).toBeLessThanOrEqual(8);
});

it('DISCRIMINATING: an all-allies misread buffs helm too; a self-only misread drops naga', () => {
const alliesTargets = new Set(
neonBuffs(ammoAllies.events, 'maxAmmoFlat').map((g) => g.targetIdx)
);
expect([...alliesTargets].sort()).toEqual([NEON, NAGA, HELM]);
const selfTargets = new Set(
neonBuffs(ammoSelf.events, 'maxAmmoFlat').map((g) => g.targetIdx)
);
expect([...selfTargets]).toEqual([NEON]);
});
});

describe('N5 — structure + documentation: nothing dropped, nothing fabricated', () => {
it('skill1 is empty; skill2 carries exactly one block: the fullBurstEnter crit grant', () => {
expect(shipped.skill1).toEqual([]);
expect(shipped.skill2.length).toBe(1);
const b = shipped.skill2[0];
expect(b.trigger).toEqual({ kind: 'fullBurstEnter' });
expect(b.target).toEqual({ kind: 'allies' });
expect(b.effects).toEqual([
{ kind: 'buff', stat: 'critRatePct', value: 45.93, durationShots: 2 },
]);
});

it('burst carries exactly two blocks: the 528.97 nuke + the SG ammo grant', () => {
expect(shipped.burst.length).toBe(2);
const nuke = shipped.burst.find((b: any) => hasKind(b, 'flatDamage'));
expect(nuke.trigger).toEqual({ kind: 'burstCast' });
expect(nuke.target).toEqual({ kind: 'enemy' });
expect(nuke.effects).toEqual([{ kind: 'flatDamage', atkPct: 528.97 }]);
const ammo = shipped.burst.find((b: any) => hasStat(b, 'maxAmmoFlat'));
expect(ammo.trigger).toEqual({ kind: 'burstCast' });
expect(ammo.target).toEqual({ kind: 'alliesOfWeapon', weapon: 'SG' });
expect(ammo.effects).toEqual([
{ kind: 'buff', stat: 'maxAmmoFlat', value: 3, durationSec: 10 },
]);
});

it('the modeled lines are NOT in unmodeled; no `ignored` block anywhere', () => {
const s2 = kitLines('skill2')[0];
const nukeLine = kitLines('burst').find((l) => l.includes('Burst Skill damage'));
const ammoLine = kitLines('burst').find((l) => l.includes('Max Ammunition Capacity'));
expect(nukeLine).toBeDefined();
expect(ammoLine).toBeDefined();
const documented = [
...((shipped.unmodeled?.skill1 ?? []) as string[]),
...((shipped.unmodeled?.skill2 ?? []) as string[]),
...((shipped.unmodeled?.burst ?? []) as string[]),
].join(' ');
expect(documented).not.toContain(s2.slice(0, 40));
expect(documented).not.toContain('528.97');
expect(shipped.ignored).toBeUndefined();
const kinds = [...shipped.skill1, ...shipped.skill2, ...shipped.burst]
.flatMap((b: any) => b.effects.map((e: any) => e.kind))
.filter((k: string) => k === 'ignored');
expect(kinds).toEqual([]);
});
});

## src/skills/overrides/neon.json (driver override)

{
"note": "Neon (slug `neon`) — the BASE Neon: SG / Supporter / Fire / Burst I, Elysion, cd 20s, ammo 9, reloadFrames 129, hitsPerShot 10 (pellets), normalMult 224.5, baseCrit 15/150. EXACT SLUG: the slug-disambiguation lint's AMBIGUOUS-base advisory fires on the bare name by design (the base display name is 'Neon' with no variant colon) and is resolved on this slug — she is NOT neon-blue-ocean (MG/Water Burst III, 'nbo') and NOT neon-vision-eye (RL/Electric Burst III, 'nve'). FROM-SCRATCH kit-autonomy build (no prior override; simSupported:false flipped by this gauntlet). Kit-autonomy gauntlet 2026-08-04: test-first spec scripts/tests/units/neon.test.ts (N1-N5, event-log pins + 8 counterfactual/reference patches), cross-family S2b claude-fable-5 converged on all 4 lines with zero divergences. MODEL — SKILL2 'Viva Firepower!' ('Activates at the beginning of Full Burst. Affects all allies. Critical Rate ▲ 45.93% for 2 shots'): fullBurstEnter → allies (all incl. self) → critRatePct 45.93, durationShots 2, NO durationSec. 'At the beginning of Full Burst' = fullBurstEnter — fires only when a Full Burst ACTUALLY opens, regardless of who cast which stage; NOT burstCast: helm (B3, 40s CD) gates the fixture's chain, so neon casts her B1 9× in 180s but only 5 Full Bursts open — an own-cast keying over-fires the grant on the 4 incomplete rotations (pinned by both timing — the buff lands on the fullBurstStart frame — and the 5-vs-9 count split). 'For 2 shots' = the engine's round-count duration (durationShots): each holder's OWN next 2 rounds carry the buff, then it lapses right after the 2nd (sim.ts round-count expiry); no wall-clock expiry. Plain 'Critical Rate' → the unscoped critRatePct, NOT critRateNormalPct (volume precedent: the prose carries no normal-attack qualifier, so skill/burst hits are lifted too). BURST 'Firepower Rules!' line 1 ('Affects 1 enemy unit(s) with the highest final DEF. Deals 528.97% of final ATK as Burst Skill damage'): burstCast → enemy → flatDamage 528.97 (burst bucket). The cast lands BEFORE the Full Burst window opens, so the nuke never takes the +50% FB major (verified fact 2026-07-13; fbMajorApplied false pinned). 'Highest final DEF' collapses to the single partless boss. BURST line 2 ('Affects all allies with a Shotgun. Max Ammunition Capacity ▲ 3 round(s) for 10 sec'): burstCast → alliesOfWeapon SG (incl. self — neon IS SG, no except-self clause) → maxAmmoFlat 3, durationSec 10. maxAmmoFlat is the theme-14 flat-rounds primitive ('▲ N round(s)' — maxAmmoPct would mis-scale per ally's base mag: 3% of 9 rounds rounds to +0); tove precedent (same shape: alliesOfWeapon SG + maxAmmoFlat, video-confirmed there). '3 round(s)' is the VALUE's unit, not a duration — the duration is the wall-clock 10s. Observable: SG magazines run 9→12 inside the window (ammoAfter up to 11). SKILL1 'Neon's Special Bullet' is UNMODELED — see ⚑1. BURST-ELIGIBILITY: every modeled line is Full-Burst-gated — in a team that cannot chain B1→B2→B3 her kit contributes plain SG fire only. NO `ignored` blocks. All magnitudes (3.56, 45.93, 528.97, 3 rounds, 5s, 10s, 2 shots) are kit-literal SL10 → DATAMINED; nothing calibrated. ⚑ FLAGS: ⚑1 (skill1 'Neon's Special Bullet', UNMODELED — out-of-domain: world model). The trigger is an enemy KILL; the engine has no kill event (grep-verified: no kill primitive in src/engine) and the scope-lock fight is one immortal partless boss with no adds, so the crit grant can never fire and contributes exactly zero in ANY sim run — deliberately NOT encoded as an always-on/interval proxy (that would fabricate a buff the sim's world cannot produce; the nearest-wrong counterfactual is pinned RED by the spec test). ESTIMATE: in real multi-add content kills are frequent, so in-game the 2 highest-final-ATK allies run +3.56% crit at near-full uptime (5s refresh vs frequent kills); at scope the value is 0. RECIPE: if enemy-death/adds are ever modeled, fire on the kill credit → target alliesTopAtk count 2 byFinalAtk → critRatePct 3.56 durationSec 5 (the prose says 'highest FINAL ATK' → byFinalAtk per the A3 literal-word rule; self is eligible, no except-self clause). TIER: out-of-domain (world model), not a value estimate. epinel/volume precedent for the class. ⚑2 (cadence tuple, standard): ammo 9 / reloadFrames 129 / RoF 90 rpm are datamine fields, unverified on video for this unit; they set the magazine cycle (~6s mag + ~2.15s reload) and therefore both the timing of the maxAmmoFlat window uptake and how fast the durationShots 2 budget is spent. Recipe: focused solo scope-lock video — count rounds per 10s window + the mag-empty→first-shot gap.",
"unmodeled": {
"skill1": [
"Activates when killing an enemy. Affects 2 ally unit(s) with the highest final ATK.\nCritical Rate ▲ 3.56% for 5 sec."
],
"skill2": [],
"burst": []
},
"skill1": [],
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
"stat": "critRatePct",
"value": 45.93,
"durationShots": 2
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
"atkPct": 528.97
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
"stat": "maxAmmoFlat",
"value": 3,
"durationSec": 10
}
]
}
]
}
