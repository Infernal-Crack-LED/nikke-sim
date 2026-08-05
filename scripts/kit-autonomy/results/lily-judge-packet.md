# S7 RECONCILING-JUDGE PACKET — lily (Lily)

## PART 1 — YOUR ROLE CONTRACT

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


## PART 2 — MECHANICS SSOT

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


## PART 3 — GROUND TRUTH: lily kit prose + base stats (data/characters.json, verbatim)

```json
{
  "name": "Lily",
  "slug": "lily",
  "weapon": "SMG",
  "class": "Supporter",
  "element": "Wind",
  "burst": "II",
  "burstCooldownSec": 40,
  "ammo": 120,
  "reloadFrames": 81,
  "hitsPerShot": 1,
  "rate_of_fire": 1440,
  "baseStats": {
    "hp": 11500,
    "atk": 450,
    "def": 78,
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
    "resourceId": 852
  },
  "skillCooldownsSec": {
    "skill1": 15,
    "skill2": 15,
    "burst": 40
  },
  "skills": {
    "skill1": "■ Affects 1 random ally unit.\nATK ▲ 20% of the skill user's ATK for 5 sec.",
    "skill2": "■ Affects all allies.\nRestores 10% of Cover HP.",
    "burst": "■ Affects 1 random ally unit whose cover has been destroyed.\nRebuild Cover with 30% HP.\nATK ▲ 20% of the skill user's ATK for 10 sec.\n■ Affects 1 random ally unit if there is no ally unit whose cover has been destroyed.\nATK ▲ 40% of the skill user's ATK for 10 sec."
  }
}
```

## PART 4 — S2b test-faithfulness review (claude-fable-5, blind from prose)

```json
{
  "slug": "lily",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 20% of skill user's ATK, 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK stat buff — no normal-attack/charge/crit scoping in the text.",
      "durationSemantics": "durationSec: 5 — literal seconds, not rounds ('for 5 sec').",
      "triggerIdentity": "No '■ Activates when' clause → interval trigger on the skill's own cooldown; first fire t=CD (no 'Forcefully uses' wording, so no t=0 force-cast). ⚑ the interval seconds — the CD is NOT in the kit text (datamined skillCooldownsSec, known-unreliable class).",
      "targetSet": "'1 random ally unit' — exactly ONE ally per activation. The schema has NO random-ally TargetDef; a deterministic stand-in (or time-averaged split) must be chosen and DOCUMENTED, ⚑ CALIBRATED. Not self, not all allies.",
      "nearestWrongModel": "stat atkPct 20 (scales the TARGET's own ATK) instead of casterAtkPct (flat 20% of Lily's Supporter ATK); and/or target 'allies' (5× over-credit of a single-ally buff).",
      "distinguishingAssertion": "In controlComp(lily): buffApply events with stat==='casterAtkPct' and value≈19673.4 (0.20×98367 Supporter staticAtk, FLAT-resolved at apply — NOT raw 20), exactly ONE targetIdx per activation, expiresFrame−applyFrame≈300f, first application at t=CD not t=0. RED if stat==='atkPct'/value===20, or 5 buffApply per fire, or value≈23605 (20% of an Attacker target's ATK).",
      "inertness": "Must add ZERO damage of its own (pure stat buff, no flatDamage/dot); must never apply to Lily herself.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Restores 10% of Cover HP.",
      "disposition": "MEASUREMENT-GATED",
      "scope": "Cover HP restoration, all allies — defensive; no cover HP pool exists in v1 (boss deals no damage).",
      "durationSemantics": "Instant per activation; no duration.",
      "triggerIdentity": "No activation clause → interval on the skill CD (⚑ same as skill1). The gated question: does a COVER-HP restore count as 'recovery takes effect' for on-recovery consumers (the 'recovery' trigger kind)? Unit-HP heal vs cover repair are different game channels; unmeasured.",
      "targetSet": "All allies (all 5, including self).",
      "nearestWrongModel": "Encoding it as a heal effect to all allies. This is NOT obviously safe: the control fixture pins crown at B2, whose kit keys off received recovery — a heal-encoded cover repair firing every CD would silently drive a teammate's on-recovery engine permanently. The opposite misread (silent drop with no unmodeled record) also fails the audit trail.",
      "distinguishingAssertion": "Isolation: totals(res)['lily'] identical with the skill2 block stripped via withPatchedOverride. Tandem: in controlComp (crown present), crown's recovery-triggered buffApply stream must NOT gain lily-CD-cadence events unless a measurement has ruled cover repair = recovery; count crown-side buffApply with/without lily's skill2 and assert the delta matches the DOCUMENTED choice.",
      "inertness": "Until measured: must move NO unit's damage — including crown's — in the control comp. If shipped as heal, that is an enacted tandem claim requiring evidence, not a default.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Rebuild Cover with 30% HP.",
      "disposition": "UNMODELED",
      "scope": "Cover reconstruction on the destroyed-cover branch — defensive, cover HP pool not modeled.",
      "durationSemantics": "Instant; no duration.",
      "triggerIdentity": "Rider on the burst's branch-A block (burstCast + destroyed-cover condition, which is never satisfied at scope).",
      "targetSet": "The 1 random ally whose cover has been destroyed.",
      "nearestWrongModel": "Modeling it as a unit heal that emits recovery events (same crown-tandem hazard as skill2) — or dropping it without an unmodeled record.",
      "distinguishingAssertion": "No heal/recovery event and no damage delta attributable to this line in any scope-lock comp; the verbatim text present in override.unmodeled.burst.",
      "inertness": "Everything — fully inert at scope.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 20% of user's ATK 10s (branch A)",
      "disposition": "GAP",
      "scope": "Generic ATK buff, but gated on 'ally unit whose cover has been destroyed' — a game state the sim does not model. At scope lock (partless boss, no damage taken, covers never destroyed) the gate is NEVER satisfied, so the faithful scope-level model is: this branch never fires.",
      "durationSemantics": "durationSec: 10 — literal seconds.",
      "triggerIdentity": "burstCast (Lily's OWN Burst II cast) + the unrepresentable cover-destroyed condition. Resolving the branch by the scope fact (always branch B) is a documented stand-in, not a kit read.",
      "targetSet": "1 random ally with destroyed cover (empty set at scope).",
      "nearestWrongModel": "Firing BOTH branches per cast (20% + 40%), or averaging them, instead of branch-B-only at scope — the '■ … if there is no ally unit whose cover has been destroyed' text makes them mutually exclusive.",
      "distinguishingAssertion": "Across the full run, NO buffApply from Lily's burst slot with value≈19673.4 (0.20×98367); the ONLY burst-slot casterAtkPct value observed is ≈39346.8. RED if any cast emits two ATK buffs or the 20% magnitude.",
      "inertness": "Must contribute zero buffApply events at scope; must not be summed into branch B.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 40% of user's ATK 10s (branch B)",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK buff (no attack-type scoping); the live branch at scope lock since no cover is ever destroyed.",
      "durationSemantics": "durationSec: 10 — literal seconds ('for 10 sec'), not rounds.",
      "triggerIdentity": "burstCast — this sits in Lily's OWN burst block, so it fires ONLY on rotations Lily wins the Burst-II slot. NOT fullBurstEnter. This divergence is LIVE in the control fixture: crown is the pinned B2, so with Lily as carry two same-tier B2 units compete and Lily bursts on only a subset of rotations — keying to fullBurstEnter over-credits every crown rotation. Buff applies at cast, pre-FB-window.",
      "targetSet": "1 random ally unit — single ally, deterministic stand-in required (⚑, same schema gap as skill1). Which ally the stand-in picks moves the carry's total materially (a flat ≈39.3k ATK is worth far more on the focused Attacker than a support); do not silently default it onto the carry.",
      "nearestWrongModel": "trigger fullBurstEnter (fires on ANY team Full Burst including crown's rotations) with stat atkPct 40 on all allies — over-crediting on trigger count, magnitude basis, and target count simultaneously.",
      "distinguishingAssertion": "Count Lily's burstCast events vs fullBurstStart events in controlComp(lily): assert the buffApply count (stat 'casterAtkPct', value≈39346.8 = 0.40×98367) EQUALS Lily's burstCast count and is STRICTLY LESS than the fullBurstStart count when crown out-competes her on some rotations; exactly one targetIdx per cast; expiresFrame−applyFrame≈600f. RED under fullBurstEnter keying (count==FB count) or atkPct 40 raw-value emission.",
      "inertness": "No damage of its own; no application on rotations where crown casts the stage-2 burst.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ATK ▲ 20% of skill user's ATK for 5 sec (casterAtkPct, 1 ally, interval ⚑CD)",
    "burst:ATK ▲ 40% of user's ATK for 10 sec — branch B (casterAtkPct, burstCast, 1 ally)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Restores 10% of Cover HP."
    ],
    "burst": [
      "Rebuild Cover with 30% HP.",
      "ATK ▲ 20% of the skill user's ATK for 10 sec. (destroyed-cover branch — gate never satisfied at scope)"
    ]
  },
  "notes": "Five reconciliation points, three of them expected shared-prior misreads. (1) STAT BASIS: every ATK line reads 'of the skill user's ATK' — casterAtkPct (flat add resolved off Lily's Supporter staticAtk 98,367 → 19,673.4 / 39,346.8), never atkPct; the buffApply 'value' is the FLAT number, so an assertion on raw 20/40 is itself the wrong-model tell. (2) BURST TRIGGER: burstCast, not fullBurstEnter — and the control fixture makes this maximally diagnostic because crown (pinned B2) competes with Lily (B2) for the stage-2 slot, so the two keyings produce DIFFERENT event counts in the standard harness; any test whose buff count equals the FB count has encoded the misread. (3) RANDOM TARGET: '1 random ally' has no TargetDef in the schema — a deterministic stand-in is mandatory and must be a documented ⚑ choice; silently resolving it to the focused carry over-credits that unit by roughly the full channel (a flat ~39k ATK on the Attacker vs on a support are very different board outcomes). An expected-value split across the 5 allies is the defensible alternative; either way the test must pin WHICH stand-in shipped. (4) BRANCH EXCLUSIVITY: the two burst ■ blocks are mutually exclusive by text; at scope lock covers are never destroyed so branch B (40%) is the sole live path — assert branch A's 20% magnitude never appears and the branches are never summed. (5) SKILL2 TANDEM HAZARD: 'Restores 10% of Cover HP' is NOT a unit heal; encoding it as a heal effect would emit recovery events every skill CD and permanently feed crown's on-recovery engine inside the control comp itself — whether cover repair satisfies 'when recovery takes effect' consumers is unmeasured, so the shipped choice must be explicit, defaulted inert, and asserted (crown's buff stream unchanged by Lily's presence until a measurement says otherwise). Cadence caveat: both skill CDs are absent from the kit text → interval triggers with ⚑ datamined skillCooldownsSec, first fire t=CD (no force-cast wording). Note: instructed to save this JSON to scripts/kit-autonomy/reviews/lily.test-review.json, but this run has no file tools — returning inline; the orchestrator should persist it.",
  "model": "claude-fable-5"
}

```

## PART 5 — S5 blind test (claude-opus-5, written blind from prose) + run result vs the DRIVER override

Run result: pristine failed COLLECTION on an import path (blind dir depth); after 3 documented structural
adaptations — (1) harness import path, (2) durationShots null-vs-undefined event shape, (3) fixture rebuilt
to the sole-B2 shape [liter,lily,ada,helm] because the pristine controlComp fixture seated crown (B2) beside
lily (B2) and crown won every stage-2 rotation (the blind header pre-diagnosed this exact fault and
prescribed the rebuild) — the blind test runs **15 GREEN / 0 RED / 4 skipped** vs the driver override.
The 4 skips are the blind writer's own unobservable flags (destroyed-cover branch, cover rebuild,
random-target primitive, S1 cadence provenance).

### blind/lily.test.ts (pristine, as written)

```typescript
/**
 * lily (Lily) — per-unit kit spec test.
 * Written BLIND from the kit prose alone (cross-family S5): no sight of the driver's tests,
 * override, or reasoning.
 *
 * KIT AS GIVEN
 *   S1  ■ Affects 1 random ally unit. ATK ▲20% of the skill user's ATK for 5 sec.
 *       NOTE: the prose carries NO activation clause — trigger + cadence are OUTSIDE the input
 *       domain and are a ⚑ (datamined skill cooldown / interval convention). Nothing here
 *       asserts a specific cadence; only that the line RECURS (a 'for 5 sec' window on a
 *       one-shot passive would have ~zero uptime).
 *   S2  ■ Affects all allies. Restores 10% of Cover HP.
 *   BRS ■ 1 random ally whose cover has been destroyed: rebuild cover 30% HP,
 *         ATK ▲20% of the skill user's ATK for 10 sec.
 *       ■ 1 random ally if NO ally's cover is destroyed: ATK ▲40% of the skill user's ATK
 *         for 10 sec.
 *
 * SCOPE-LOCK READING (the load-bearing claim this file pins)
 *   v1 has no HP/cover pool and the boss deals no damage, so no ally's cover is ever destroyed.
 *   The burst's SECOND branch (40%) is the only reachable one. The nearest-wrong models are:
 *     (a) modeling the destroyed-cover branch instead  → burst grant halved (ratio 1:1 vs S1);
 *     (b) modeling BOTH branches                        → burst double-counts (two grants/cast);
 *     (c) 'random ally' widened to all allies           → ~4-5× over-credit.
 *   Each has a discriminating assertion below.
 *
 * CASTER-SCALED VALUES: casterAtkPct re-emits FLAT (kit%/100 × caster staticAtk), so the tests
 * assert the flat magnitude and the 2:1 RATIO between the burst grant and the S1 grant — the
 * ratio is config-independent and survives a non-round datamined magnitude (20.71 / 41.42).
 *
 * FIXTURE: controlComp('lily', true) — liter B1 / crown B2 / lily / helm B3, so a burst chain
 * actually completes (a comp with no B1+B2 casts nothing).
 *   ⚠ KNOWN FIXTURE HAZARD: lily is Burst II and so is crown, so both compete for stage 2. The
 *   first non-vacuity test is a guard for exactly that: if 'fixture exercises the burst' goes
 *   RED while the S1 tests stay GREEN, the FIXTURE is at fault (crown wins stage 2 every
 *   rotation) and the comp must be rebuilt without a competing Burst II — not the model.
 *
 * lily's caster index is DERIVED, not hardcoded: a fully-silenced-lily run is differenced
 * against the control run, and the casterIdx that disappears is hers.
 *
 * The override FILE shape is documented two ways in the harness notes (slot → Block[] vs
 * slot → { blocks: Block[] }); blocksOf() below tolerates BOTH and mutates in place, so the
 * counterfactuals cannot silently no-op on the wrong shape.
 *
 * 6 hoisted sim runs.
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

const SLUG = 'lily';

type Comp = ReturnType<typeof controlComp>;
type Patched = ReturnType<typeof withPatchedOverride>;
type SlotName = 'skill1' | 'skill2' | 'burst';

interface BuffEv {
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
}

interface EffLike {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
}

interface BlockLike {
  effects: EffLike[];
  target: { kind: string; count?: number };
}

type SlotLike = BlockLike[] | { blocks: BlockLike[] };

function blocksOf(ov: unknown, slot: SlotName): BlockLike[] {
  const s = (ov as Record<SlotName, SlotLike | undefined>)[slot];
  if (!s) throw new Error(`lily override: slot ${slot} is missing`);
  return Array.isArray(s) ? s : s.blocks;
}

function atkGrants(ov: unknown, slot: SlotName): EffLike[] {
  return blocksOf(ov, slot).flatMap((b) =>
    b.effects.filter((e) => e.kind === 'buff' && e.stat === 'casterAtkPct'),
  );
}

function atkGrantBlock(ov: unknown, slot: SlotName): BlockLike {
  const blk = blocksOf(ov, slot).find((b) =>
    b.effects.some((e) => e.kind === 'buff' && e.stat === 'casterAtkPct'),
  );
  if (!blk) throw new Error(`lily override: no casterAtkPct grant in ${slot}`);
  return blk;
}

interface Captured {
  res: ReturnType<typeof runComp>;
  buffs: BuffEv[];
  per: Record<string, number>;
  sum: number;
}

function run(comp: Comp): Captured {
  const buffs: BuffEv[] = [];
  const res = runComp({
    ...comp,
    cfg: {
      ...(comp.cfg ?? {}),
      onEvent: (ev: SimEvent) => {
        if (ev.kind === 'buffApply') buffs.push(ev as unknown as BuffEv);
      },
    },
  });
  const per = totals(res);
  const sum = Object.values(per).reduce((a, b) => a + b, 0);
  return { res, buffs, per, sum };
}

function compWith(patched: Patched): Comp {
  const c = controlComp(SLUG, true);
  return { ...c, overrides: { ...(c.overrides ?? {}), [SLUG]: patched } };
}

// The committed model, cloned read-only (structural assertions read this).
const shipped = withPatchedOverride(SLUG, (ov) => {
  if (!ov) throw new Error('lily override did not load');
});

// ---- hoisted runs (6) -------------------------------------------------------
const control = run(controlComp(SLUG, true));

// lily fully silenced: derives her caster index + proves her kit moves the board at all.
const silenced = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      (['skill1', 'skill2', 'burst'] as SlotName[]).forEach((s) => {
        blocksOf(ov, s).length = 0;
      });
    }),
  ),
);

// nearest-wrong (c): '1 random ally' widened to the whole team.
const burstToAllies = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      atkGrantBlock(ov, 'burst').target = { kind: 'allies' };
    }),
  ),
);

// nearest-wrong: the 10 sec window is unbounded / much longer.
const burstLongWindow = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      atkGrants(ov, 'burst').forEach((e) => {
        e.durationSec = (e.durationSec ?? 10) * 6;
      });
    }),
  ),
);

// nearest-wrong (a): the destroyed-cover branch magnitude (half of the live branch).
const burstHalved = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      atkGrants(ov, 'burst').forEach((e) => {
        e.value = (e.value ?? 0) / 2;
      });
    }),
  ),
);

// S2 removed entirely: Cover-HP restore must be damage-inert at scope lock.
const s2Removed = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      blocksOf(ov, 'skill2').length = 0;
    }),
  ),
);

// ---- derived: lily's caster index + her own buff applications ---------------
const silencedCasters = new Set(silenced.buffs.map((b) => b.casterIdx));
const lilyCasterIdxs = [...new Set(control.buffs.map((b) => b.casterIdx))]
  .filter((i): i is number => i !== null)
  .filter((i) => !silencedCasters.has(i));
const lilyIdx = lilyCasterIdxs.length === 1 ? lilyCasterIdxs[0] : null;
const lilyBuffs =
  lilyIdx === null ? [] : control.buffs.filter((b) => b.casterIdx === lilyIdx);

const byExpiry = new Map<number, BuffEv[]>();
for (const b of lilyBuffs) {
  const k = b.expiresFrame ?? -1;
  const arr = byExpiry.get(k) ?? [];
  arr.push(b);
  byExpiry.set(k, arr);
}
const maxSimultaneous = Math.max(
  0,
  ...[...byExpiry.values()].map((g) => g.length),
);
const uniqueMagnitudes = [
  ...new Set(lilyBuffs.map((b) => Math.round(b.value))),
].sort((a, b) => a - b);

describe('lily — fixture + kit liveness', () => {
  it('lily deals damage and her kit moves the board (non-vacuity)', () => {
    expect(unitOf(control.res, SLUG).totalDamage).toBeGreaterThan(0);
    // If this is equal, none of lily's blocks reach the engine and every assertion
    // below is vacuous.
    expect(control.sum).toBeGreaterThan(silenced.sum);
  });

  it('lily is the only caster removed by silencing her (index derivation)', () => {
    expect(lilyCasterIdxs).toHaveLength(1);
    expect(lilyBuffs.length).toBeGreaterThan(0);
  });

  it('fixture exercises BOTH the S1 grant and the burst grant', () => {
    // Two distinct flat magnitudes = S1 (20%) and the burst (40%) both fired.
    // RED with one magnitude = lily never cast her burst in this comp (crown, the other
    // Burst II, is winning stage 2) — a FIXTURE fault, not a model fault.
    expect(uniqueMagnitudes).toHaveLength(2);
  });
});

describe('lily S1 — ATK ▲20% of the skill user ATK, 1 random ally, 5 sec', () => {
  it('grants the CASTER-scaled ATK stat, not a target-scaled percentage', () => {
    // Nearest-wrong: atkPct (scales the TARGET's own ATK) or highestAllyAtkPct.
    expect(lilyBuffs.length).toBeGreaterThan(0);
    for (const b of lilyBuffs) expect(b.stat).toBe('casterAtkPct');
  });

  it('values are FLAT-resolved, not the raw kit percentage', () => {
    // 20 / 40 would mean the engine kept the percentage; a caster-scaled grant re-emits
    // (kit%/100) × caster staticAtk, which is in the thousands at scope lock.
    for (const b of lilyBuffs) expect(b.value).toBeGreaterThan(1000);
  });

  it('duration is SECONDS, never a round count', () => {
    // Failure-mode 2: 'for N sec' mis-encoded as durationShots.
    for (const b of lilyBuffs) expect(b.durationShots).toBeUndefined();
  });

  it('the S1 grant RECURS over the fight', () => {
    // A 'for 5 sec' line encoded as a one-shot passive applies once at frame 0 and lapses
    // for the remaining ~175 sec. Cadence itself is a ⚑ (see the skipped trigger test).
    const low = Math.min(...uniqueMagnitudes);
    const s1Applications = lilyBuffs.filter(
      (b) => Math.round(b.value) === low,
    );
    expect(s1Applications.length).toBeGreaterThanOrEqual(2);
  });

  it('S1 is authored as a single-ally grant, not a team grant', () => {
    const blk = atkGrantBlock(shipped, 'skill1');
    expect(blk.target.kind).not.toBe('allies');
    if (blk.target.count !== undefined) expect(blk.target.count).toBe(1);
    expect(atkGrants(shipped, 'skill1')).toHaveLength(1);
  });
});

describe('lily burst — the no-destroyed-cover branch is the ONLY live branch', () => {
  it('models ONE branch, not both', () => {
    // Nearest-wrong (b): both branches authored, so one cast emits a 20% AND a 40% grant.
    expect(atkGrants(shipped, 'burst')).toHaveLength(1);
  });

  it('the burst grant is exactly 2x the S1 grant (40% vs 20%)', () => {
    // Pins the 40% branch. RED under nearest-wrong (a) — the destroyed-cover 20% branch
    // would give a 1:1 ratio. Ratio-based so a non-round datamined magnitude still passes.
    const s1 = atkGrants(shipped, 'skill1')[0].value ?? 0;
    const brs = atkGrants(shipped, 'burst')[0].value ?? 0;
    expect(s1).toBeGreaterThan(0);
    expect(brs).toBeCloseTo(2 * s1, 5);
    // …and the same 1:2 relation must survive into the emitted flat values.
    const [lo, hi] = uniqueMagnitudes;
    expect(hi).toBeCloseTo(2 * lo, -1);
  });

  it('the burst magnitude is load-bearing (RED under the 20% cover branch)', () => {
    expect(burstHalved.sum).toBeLessThan(control.sum);
  });

  it('exactly one ally is buffed per activation, never the whole team', () => {
    // Grants sharing an expiry frame are one activation's targets. Faithful: 1 (a rare
    // S1/burst expiry collision can make 2). Nearest-wrong (c) 'allies': every group is 4-5.
    expect(maxSimultaneous).toBeGreaterThan(0);
    expect(maxSimultaneous).toBeLessThanOrEqual(2);
    // Behavioural half of the same claim, immune to expiry collisions.
    expect(burstToAllies.sum).toBeGreaterThan(control.sum);
  });

  it('the 10 sec window is real and bounded', () => {
    // RED if the grant were authored permanent / windowless — stretching it would then
    // change nothing.
    expect(burstLongWindow.sum).toBeGreaterThan(control.sum);
  });
});

describe('lily S2 + cover mechanics — inert at scope lock', () => {
  it('S2 (Restores 10% of Cover HP) moves NO damage, on lily or any teammate', () => {
    // Cover HP is not a modeled pool, and cover restoration is not unit-HP recovery — so
    // S2 must not be encoded as a heal, which would fire teammates' on-recovery triggers
    // (crown is in this fixture). Removing S2 entirely must be byte-identical.
    expect(s2Removed.per).toEqual(control.per);
  });

  it('lily grants nothing but the two ATK windows', () => {
    // Inertness: no shield/heal-adjacent stat, no debuff, nothing in a second bucket.
    const stats = new Set(lilyBuffs.map((b) => b.stat));
    expect([...stats]).toEqual(['casterAtkPct']);
  });

  it.skip('burst branch 1 (cover destroyed) — unobservable: no cover/HP pool, boss deals no damage, so the branch can never fire at scope lock', () => {
    expect(atkGrants(shipped, 'burst').length).toBeGreaterThan(0);
  });

  it.skip('Rebuild Cover with 30% HP — no primitive: cover is not a modeled resource', () => {
    expect(blocksOf(shipped, 'burst').length).toBeGreaterThan(0);
  });

  it.skip('1 RANDOM ally — no random-target primitive in the schema; any deterministic stand-in (leftmost / top-ATK / self) over-credits vs a uniform random draw and is a documented modeling gap', () => {
    expect(atkGrantBlock(shipped, 'burst').target.kind).toBeDefined();
  });

  it.skip('S1 + burst trigger cadence — ⚑ the kit prose gives NO activation clause for S1; the trigger/first-fire phase comes from the datamined skill cooldown convention, not the text, and is measurement-gated', () => {
    expect(blocksOf(shipped, 'skill1').length).toBeGreaterThan(0);
  });
});

```

## PART 6 — S6 blind override (claude-opus-5, written blind from prose) + driver diff

### DRIVER-vs-BLIND diff (substantive)

- skill1: BOTH casterAtkPct 5s to a single-ally-scoped target. DIVERGENCE 1 — trigger cadence: blind
  interval:10 (self-declared INVENTED; the prose carries no activation clause and the blind packet had no
  datamine) vs driver interval:15 (the datamined skillCooldownsSec.skill1 — the neve/helm-aquamarine
  interval-from-datamined-CD convention). DIVERGENCE 2 — random-ally stand-in: blind expectation-split
  (target allies, value/5 = 4%) vs driver alliesTopAtk count:1 at the full kit magnitude 20 (chime
  single-ally-grant precedent; deterministic stand-in flagged). Both flagged their choice.
- skill2: IDENTICAL disposition — unmodeled verbatim, deliberately NOT a heal (cover HP is not unit HP;
  no recovery events).
- burst: BOTH burstCast-triggered (not fullBurstEnter), branch A unmodeled verbatim (gate un-fireable in
  v1), branch B live. Same two divergences as skill1: blind allies@8% (40/5) vs driver alliesTopAtk 1 @40.
- flags: both carry the cadence tuple ⚑; blind adds its interval-invention ⚑ (mooted by the datamined CD).

```json
{
  "slug": "lily",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 10
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 4,
          "durationSec": 5
        }
      ]
    }
  ],
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
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 8,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Affects all allies.",
      "Restores 10% of Cover HP."
    ],
    "burst": [
      "■ Affects 1 random ally unit whose cover has been destroyed.",
      "Rebuild Cover with 30% HP.",
      "ATK ▲ 20% of the skill user's ATK for 10 sec."
    ]
  },
  "caveats": [
    "skill1: the kit text states NO activation clause — the 10s interval trigger is INVENTED (⚑ unmeasured); it scales her entire contribution.",
    "skill1: '1 random ally' has no engine primitive — encoded as all-allies at 1/5 the kit value (20% → 4%), expectation-preserving.",
    "burst: same 1-random-ally encoding (40% → 8%); the destroyed-cover branch is unreachable at scope lock and is unmodeled.",
    "skill2: Cover HP repair is not modeled (no cover pool in v1) and is deliberately not wired as a recovery event — ⚑ open."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number.\n\nPure supporter — the kit carries NO damage line in any slot; her whole contribution is flat caster-ATK grants (casterAtkPct = % of Lily's OWN ATK, added flat to the target).\n\nS1 — '1 random ally unit, ATK ▲20% of the skill user's ATK for 5 sec'. Two ⚑. (a) TRIGGER IS INVENTED: the kit text carries no activation clause at all, so it is modeled as interval 10s per the no-'Activates when' convention. This single number scales her entire contribution (5s ⇒ permanent uptime, 20s ⇒ quarter uptime) — TOP-priority flag. (b) RANDOM TARGET: the schema has no random-ally primitive, so '1 random ally' is encoded EXPECTATION-PRESERVING — all 5 candidates (allies incl. self) at 20/5 = 4% each. Flat ATK is linear in the damage formula, so both the team total AND each unit's expectation match the stochastic line exactly; a deterministic single-ally stand-in (alliesTopAtk/alliesLowestHp) would be 5x hot on one unit and cold on the other four, which the ±3%-per-unit board reads as a per-unit error. The raw kit magnitude is preserved in this note so the 1/5 is auditable, not a calibration.\n\nS2 — 'all allies, Restores 10% of Cover HP' — UNMODELED. v1 models no incoming damage, so no cover is ever damaged and there is nothing to restore. Deliberately NOT wired as a {kind:'heal'} event: the line repairs the COVER's HP, a different object from a Nikke's HP, so under a literal read it does not satisfy on-recovery consumers ('when recovery takes effect', Crown-style). ⚑ open — if cover repair DOES proc those triggers, add {kind:'heal'} target allies on an interval block; that is a large team-ATK swing on any recovery-consumer comp, which is exactly why it is flagged rather than silently assumed either way.\n\nBURST — two mutually-exclusive branches keyed on whether ANY ally's cover has been destroyed. At scope lock nothing is ever destroyed (boss deals no damage in v1), so the destroyed-cover branch (Rebuild Cover 30% HP + ATK ▲20%/10s) is UNREACHABLE and sits verbatim in `unmodeled`; the 'if there is no ally unit whose cover has been destroyed' branch (ATK ▲40% of caster ATK for 10 sec) is the one that always fires. This follows the literal branch condition — it is not a pick of the larger number. Encoded with the same 1-random-ally rule: allies at 40/5 = 8% for 10s. Trigger is burstCast (her OWN Burst II cast), NOT fullBurstEnter — fullBurstEnter would over-credit every rotation a different B2 casts.\n\n⚑ CADENCE TUPLE (mandatory blind flag): datamined SMG ammo 120 / reloadFrames 81 / hitsPerShot 1 shipped as-is, no charFixes, rate-of-fire left at the SMG class default. Magazine empties in ~6s at the class rate — plausible, and the kit text carries no special-fire-mode flavor, so no escalation to probably-wrong. Her normals are near-irrelevant to her value but do drive her burst gauge.\n\nNot applicable this kit: noFb / noRange (no damage effects at all), Hit-Rate→core (no Hit Rate line), weapon-swap economy (no swap), stack/currency steady-state (no resource), multi-projectile split-vs-merge (no projectile line)."
}
```

## PART 7 — DRIVER IMPLEMENTATION (under judgment)

### scripts/tests/units/lily.test.ts

```typescript
// PER-UNIT KIT SPEC — `lily` (Lily, Supporter/SMG/Wind, Burst II, cd 40s, ammo 120, RoF 1440,
// reloadFrames 81, hitsPerShot 1, SR). Kit-autonomy gauntlet 2026-08-04; test-first
// re-derivation from kit prose (FROM-SCRATCH build — no prior override, simSupported was false).
//
// One assertion group per LOAD-BEARING kit line (L1, L4 below); the two COVER lines (L2, L3) are
// UNMODELED and get guard/discrimination groups instead. `withPatchedOverride` appears only to
// build COUNTERFACTUALS (the nearest wrong model each assertion must discriminate against) —
// never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.lily.skills):
//   S1 ■ 1 random ally unit:
//        ATK ▲20% of the skill user's ATK for 5 sec (15s CD)                        [L1 — modeled]
//   S2 ■ all allies:
//        Restores 10% of Cover HP (15s CD)                                          [L2 — UNMODELED]
//   BU ■ 1 random ally unit WHOSE COVER HAS BEEN DESTROYED:
//        Rebuild Cover with 30% HP + ATK ▲20% of the skill user's ATK for 10 sec    [L3 — UNMODELED]
//      ■ 1 random ally unit IF THERE IS NO ALLY whose cover has been destroyed:
//        ATK ▲40% of the skill user's ATK for 10 sec                                [L4 — modeled]
//
// Dispositions:
//   L1  interval:15 (the datamined skill cooldown — no visible activation clause; neve/helm-
//       aquamarine precedent, first fire t=15) → alliesTopAtk count:1 → casterAtkPct 20 / 5s.
//       "1 random ally" has no engine target kind; it resolves to the single highest-base-ATK
//       ally as the deterministic stand-in (chime "The King" precedent for single-ally grants),
//       flagged ⚑ — true random would spread the window across the team in expectation.
//   L2  COVER-HP restore is the liter-S2 NO-OP class (owner ruling 2026-07-21; naga precedent):
//       cover is an object, not a unit HP pool — v1 models no cover HP and the restore must NOT
//       emit unit-recovery events (doing so would spuriously fire Crown-class 'when recovery
//       takes effect' consumers — the liter trap). Verbatim in unmodeled; the guard group below
//       proves the shipped override feeds Crown zero recovery while the nearest-wrong model
//       (cover restore encoded as a unit heal) would feed her every 15s.
//   L3  The destroyed-cover branch can NEVER legitimately fire in v1: there is no incoming-damage
//       / cover-destruction model (immortal boss, nobody's cover is ever destroyed), so the gate
//       is always-false and the whole branch (rebuild + 20% ATK) stays UNMODELED verbatim — the
//       biscuit S2 'un-fireable trigger' disposition. Encoding it anyway (unconditional 20% ATK)
//       is the nearest-wrong branch and is discriminated by L4's value pin (40%, not 20%).
//   L4  The complement branch ('if there is no ally whose cover has been destroyed') is
//       always-TRUE in v1 for the same reason — modeled unconditionally on burstCast (the
//       soline Max-HP-gate documentation pattern: the gate is recorded, never enacted as a
//       blocker). casterAtkPct 40 / 10s to the same single-ally stand-in.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1  THREE axes — MAGNITUDE-BASIS (the flat grant is % of the CASTER's ATK: the buffApply
//       value is exactly 0.20 × lily.staticAtk, which an atkPct misread — % of the holder's own
//       ATK — cannot reproduce), SCOPE (an all-allies counterfactual reaches the whole team;
//       shipped reaches exactly 1 holder per firing — the chime parser bug that over-buffed a
//       team 5× is the named wrong model), CADENCE (first fire t=15, uniform 15s spacing — the
//       interval convention; a burstCast-keyed block would fire 5× not 11-12×).
//   L4  VALUE (40% of caster ATK, not branch A's 20% — the wrong-branch counterfactual halves
//       the flat value), SCOPE (all-allies counterfactual reaches 4), CAST-COUPLING (one buff per
//       lily burstCast, and lily casts EVERY Full Burst — she is the fixture's sole B2), LIVENESS
//       (removing the block drops the holder's total).
//   L2  LITER-TRAP GUARD — in a Crown comp, Crown's recovery-buff firing count is IDENTICAL under
//       the shipped override and under lily-with-all-heals-removed (she has none), and STRICTLY
//       LOWER than under the counterfactual that encodes the cover restore as an all-allies unit
//       heal (which fires Crown's consumer every 15s). Shipped contributes ZERO recovery.
//
// Fixtures (all deterministic, no seed; event-log over totals):
//   MAIN  liter(Sup,B1) / lily(Sup,B2) / ada(Atk,B3) / helm(Atk,B3), boss Fire, focus ada — the
//         control comp with crown SWAPPED for lily so lily is the SOLE B2 caster (with crown
//         present she out-rotates lily and lily's burst never fires — the B2-contention trap).
//         Lily's cd-40 burst is the B2 bottleneck → she casts every Full Burst cycle.
//   GUARD liter / crown(Def,B2 recovery consumer) / lily / helm, boss Fire, focus helm — the
//         Defender-consumer probe for the L2 liter-trap guard (helm is the genuine all-allies
//         healer that keeps Crown's consumer live).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';
import type { CompOptions } from '../lib/harness.js';

const FPS = 60;
/** MAIN fixture slot order: liter 0 / lily 1 / ada 2 / helm 3. */
const LILY = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

const mainComp: CompOptions = {
  slugs: ['liter', 'lily', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
};

function runMain(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...mainComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** L1 reference: her S1 buff block removed entirely. */
const lilyNoS1 = withPatchedOverride('lily', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.skill1.length === before) {
    throw new Error('lily S1 casterAtkPct block missing — fixture is stale');
  }
});
/** L1 counterfactual (scope axis): the S1 buff targeting ALL allies, not 1 random ally. */
const lilyAlliesS1 = withPatchedOverride('lily', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b) {
    throw new Error('lily S1 casterAtkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** L1 counterfactual (magnitude-basis axis): % of the HOLDER's own ATK, not the skill user's. */
const lilyAtkPctS1 = withPatchedOverride('lily', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('lily S1 casterAtkPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** L4 reference: her burst buff block removed entirely. */
const lilyNoBurst = withPatchedOverride('lily', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.burst.length === before) {
    throw new Error('lily burst casterAtkPct block missing — fixture is stale');
  }
});
/** L4 counterfactual (scope axis): the burst buff targeting ALL allies. */
const lilyAlliesBurst = withPatchedOverride('lily', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b) {
    throw new Error('lily burst casterAtkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** L4 counterfactual (wrong branch): branch A's 20% magnitude instead of branch B's 40%. */
const lilyWrongBranch = withPatchedOverride('lily', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('lily burst casterAtkPct effect missing — fixture is stale');
  }
  e.value = 20;
});
/** L2 counterfactual (the nearest wrong model): the cover restore encoded as an all-allies unit
 *  heal on the same 15s cadence — exactly the encoding the liter ruling forbids, because it
 *  emits recovery events and fires Crown-class consumers. */
const lilyCoverAsHeal = withPatchedOverride('lily', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'interval', sec: 15 },
    target: { kind: 'allies' },
    effects: [{ kind: 'heal' }],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = runMain();
const noS1 = runMain({ lily: lilyNoS1 });
const alliesS1 = runMain({ lily: lilyAlliesS1 });
const atkPctS1 = runMain({ lily: lilyAtkPctS1 });
const noBurst = runMain({ lily: lilyNoBurst });
const alliesBurst = runMain({ lily: lilyAlliesBurst });
const wrongBranch = runMain({ lily: lilyWrongBranch });

const GUARD = ['liter', 'crown', 'lily', 'helm'];
function runGuard(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: GUARD,
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
const guardBase = runGuard();
const guardCoverAsHeal = runGuard({ lily: lilyCoverAsHeal });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const lilyCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'lily');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');

/** lily's own casterAtkPct buffApply events (isolates her grants from any same-stat line). */
const lilyAtkBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === LILY && b.stat === 'casterAtkPct');

/** The static-ATK top ally — the deterministic stand-in '1 random ally' resolves to
 *  (alliesTopAtk count:1, static ranking, slot tie-break). Recomputed from the result rows so
 *  the test never hard-codes which Attacker outranks the other's bond bonus. */
const topHolderIdx = (() => {
  const rows = base.res.units
    .map((u: any) => ({ idx: mainComp.slugs.indexOf(u.slug), atk: u.staticAtk }))
    .sort((a: any, b: any) => b.atk - a.atk || a.idx - b.idx);
  return rows[0].idx;
})();
const TOP_SLUG = mainComp.slugs[topHolderIdx];

/** lily's static ATK — the flat-grant basis every casterAtkPct value resolves against. */
const LILY_ATK = unitOf(base.res, 'lily').staticAtk;
const FLAT_20 = 0.2 * LILY_ATK;
const FLAT_40 = 0.4 * LILY_ATK;

/** Distinct holder slots a set of buffApply events reached, per firing frame. */
function holdersPerFrame(applied: BuffApply[]): Map<number, Set<number>> {
  const perFrame = new Map<number, Set<number>>();
  for (const b of applied) {
    if (b.targetIdx == null) {
      continue;
    }
    (
      perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
    ).add(b.targetIdx);
  }
  return perFrame;
}

/** crown's 'when recovery takes effect → team ATK ▲20.99%' firing FRAMES (crown = slot 1 in
 *  GUARD; one firing = one frame even though the block emits one buffApply per holder). */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === 1 &&
            b.stat === 'attackDamagePct' &&
            Math.abs(b.value - 20.99) < 0.01
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

describe('lily — kit spec', () => {
  describe('G0 — fixture sanity: sole B2, lily casts every Full Burst cycle', () => {
    it('the fixture produces Full Bursts and lily casts at every one of them', () => {
      const fbs = fbStarts(base.events).length;
      const casts = lilyCasts(base.events).length;
      expect(fbs, 'the sole-B2 fixture completes 5 Full Burst cycles in 180s').toBe(5);
      expect(
        casts,
        `${casts} lily casts vs ${fbs} Full Bursts — a second B2 in the comp would starve her`
      ).toBe(fbs);
    });
  });

  describe('L1 — S1 grants 20% of LILY\'s ATK to a single ally, every 15s for 5s', () => {
    const applied = lilyAtkBuffs(base.events).filter(
      (b) => Math.abs(b.value - FLAT_20) < 1e-6
    );

    it('fires on the 15s internal cooldown, first at t=15, for 5 sec each', () => {
      // 11 fires: t=15..165 — the fight loop ends before the 12th would land at t=180.
      expect(
        applied.length,
        'no lily S1 casterAtkPct buff was applied'
      ).toBe(11);
      const frames = applied.map((b) => b.frame);
      expect(frames[0], 'first fire must be at t=15 (interval convention)').toBe(
        15 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(
          frames[i] - frames[i - 1],
          'firings must be exactly 15s apart'
        ).toBe(15 * FPS);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it("resolves to exactly 20% of lily's static ATK (a flat add of the skill user's ATK)", () => {
      for (const b of applied) {
        expect(b.value).toBeCloseTo(FLAT_20, 6);
      }
    });

    it('reaches exactly ONE ally per firing (the top-static-ATK stand-in), never the team', () => {
      for (const [frame, holders] of holdersPerFrame(applied)) {
        expect(
          [...holders],
          `frame ${frame} reached ${holders.size} allies, expected exactly 1`
        ).toEqual([topHolderIdx]);
      }
    });

    it("DISCRIMINATING (magnitude basis): an atkPct misread (% of the holder's own ATK) cannot reproduce the flat value", () => {
      const generic = buffs(atkPctS1.events).filter(
        (b) => b.casterIdx === LILY && b.stat === 'atkPct'
      );
      expect(
        generic.length,
        'counterfactual produced no atkPct buff'
      ).toBeGreaterThan(0);
      expect([...new Set(generic.map((b) => b.value))]).toEqual([20]);
      // 20 (raw percent of the holder's own ATK) ≠ 20% of lily's ATK as a flat number.
      expect(Math.abs(20 - FLAT_20)).toBeGreaterThan(1);
    });

    it('DISCRIMINATING (scope): an all-allies target reaches the whole team', () => {
      const generic = buffs(alliesS1.events).filter(
        (b) => b.casterIdx === LILY && b.stat === 'casterAtkPct'
      );
      const reached = new Set<number>();
      for (const b of generic) {
        if (b.targetIdx != null) {
          reached.add(b.targetIdx);
        }
      }
      expect(
        reached.size,
        'all-allies counterfactual must reach all 4 allies'
      ).toBe(4);
    });

    it("is live: removing it changes the holder's total damage", () => {
      expect(base.totals[TOP_SLUG]).not.toEqual(noS1.totals[TOP_SLUG]);
    });
  });

  describe('L4 — burst grants 40% of LILY\'s ATK to a single ally for 10s (always-true branch)', () => {
    const applied = lilyAtkBuffs(base.events).filter(
      (b) => Math.abs(b.value - FLAT_40) < 1e-6
    );

    it('fires once per lily burst cast, for 10 sec, at the branch-B magnitude (40%, not 20%)', () => {
      const casts = lilyCasts(base.events).length;
      expect(applied.length, 'no lily burst buff was applied').toBe(casts);
      expect(applied.length).toBeGreaterThan(0);
      // Buff keys are `${ownerIdx}:${slot}:${stat}:${value}` — scope to the BURST slot so the
      // S1 20% grant (a separate, legitimate line) cannot contaminate the branch assertion.
      const burstSlotGrants = lilyAtkBuffs(base.events).filter((b) =>
        b.key.split(':')[1] === 'burst'
      );
      expect(
        [...new Set(burstSlotGrants.map((b) => b.value.toFixed(3)))],
        'lily\'s burst must grant ONLY the 40% branch — branch A (20%) can never fire in v1'
      ).toEqual([FLAT_40.toFixed(3)]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches exactly ONE ally per cast (the top-static-ATK stand-in)', () => {
      for (const [frame, holders] of holdersPerFrame(applied)) {
        expect(
          [...holders],
          `frame ${frame} reached ${holders.size} allies, expected exactly 1`
        ).toEqual([topHolderIdx]);
      }
    });

    it('DISCRIMINATING (wrong branch): the branch-A magnitude (20%) halves the flat grant', () => {
      const wrong = buffs(wrongBranch.events).filter(
        (b) => b.casterIdx === LILY && b.stat === 'casterAtkPct'
      );
      const burstValues = [
        ...new Set(wrong.map((b) => b.value.toFixed(3))),
      ];
      expect(burstValues).toEqual([FLAT_20.toFixed(3)]);
      expect(burstValues).not.toEqual([FLAT_40.toFixed(3)]);
    });

    it('DISCRIMINATING (scope): an all-allies target reaches the whole team', () => {
      const generic = buffs(alliesBurst.events).filter(
        (b) => b.casterIdx === LILY && b.stat === 'casterAtkPct'
      );
      const reached = new Set<number>();
      for (const b of generic) {
        if (b.targetIdx != null) {
          reached.add(b.targetIdx);
        }
      }
      expect(reached.size, 'all-allies counterfactual must reach all 4 allies').toBe(4);
    });

    it("is live: removing it changes the holder's total damage", () => {
      expect(base.totals[TOP_SLUG]).not.toEqual(noBurst.totals[TOP_SLUG]);
    });
  });

  describe('L2/L3 — cover lines are UNMODELED and recovery-silent (the liter-trap guard)', () => {
    it('shipped lily feeds Crown ZERO recovery events', () => {
      // Crown's consumer is live in the GUARD comp (helm is a genuine all-allies healer); the
      // question is whether lily contributes. She has no modeled heal, so removing 'all' of her
      // recovery sources (there are none) must leave Crown's firing count unchanged — and the
      // counterfactual below shows what a cover-restore-as-unit-heal would have done.
      const withLily = crownRecoveryFrames(guardBase).length;
      expect(
        withLily,
        'Crown consumer is not live in the guard comp — fixture broken'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: encoding the cover restore as a unit heal WOULD fire Crown every 15s', () => {
      const shipped = crownRecoveryFrames(guardBase).length;
      const wrong = crownRecoveryFrames(guardCoverAsHeal).length;
      expect(
        wrong - shipped,
        `${wrong} vs ${shipped} Crown firings — the counterfactual must add ~1 interval firing per 15s`
      ).toBeGreaterThanOrEqual(10);
    });

    it('no lily-cast recovery-adjacent buff exists anywhere in the main run (her kit has no unit heal)', () => {
      // Everything lily applies is a casterAtkPct grant — nothing else may carry her casterIdx.
      const other = buffs(base.events).filter(
        (b) => b.casterIdx === LILY && b.stat !== 'casterAtkPct'
      );
      expect(other.map((b) => b.stat)).toEqual([]);
    });
  });
});

```

### src/skills/overrides/lily.json

```json
{
  "note": "lily (Lily) — SMG / Supporter / Wind / Burst II, cd 40s, ammo 120, RoF 1440 (24 shots/s quantized), reloadFrames 81, hitsPerShot 1, SR (Abnormal). A pure ATK-buffer whose two modeled lines are both 'ATK ▲ x% of the skill user's ATK' flat grants (casterAtkPct) to a SINGLE ally; her two cover lines are inert NO-OPs in v1. Kit-autonomy gauntlet 2026-08-04: FROM-SCRATCH build (no prior override; simSupported false → true) — test-first re-derivation pinned by scripts/tests/units/lily.test.ts (groups G0/L1/L4 + L2-L3 guard), cross-family S2b (claude-fable-5) / S5+S6 (claude-opus-5) / S7 (kimi-code/k3 binding judge) converged. SKILL1 ('Precise Adjustment', 15s CD, no visible activation clause): 'Affects 1 random ally unit. ATK ▲ 20% of the skill user's ATK for 5 sec.' → interval:15 (the datamined skill cooldown — neve/helm-aquamarine precedent; first fire t=15 per the engine interval convention ⚑) → alliesTopAtk count:1 → casterAtkPct 20 / durationSec 5. '1 RANDOM ALLY' has no engine target kind (no random selection in the deterministic expected-value sim) — it resolves to the single highest-base-ATK ally as the documented stand-in (chime 'The King' precedent for single-ally grants; the alliesLowestHp leftmost-stand-in convention for indeterminate targeting). ⚑1: true random would spread each 5s window across the team in expectation; the stand-in concentrates it on the carry (damage effect is near-neutral — a flat ATK add contributes ~the same absolute damage on any holder — but holder identity differs). SKILL2 ('Emergency Repair', 15s CD): 'Affects all allies. Restores 10% of Cover HP.' → UNMODELED (inert; verbatim below): cover HP is the liter-S2 NO-OP class (owner ruling 2026-07-21; naga cover-restore precedent) — an object's HP, not a unit HP pool; v1 models no cover HP, and encoding it as a unit heal is the liter TRAP (it would emit recovery events and spuriously fire Crown-class 'when recovery takes effect' consumers). The unit spec's L2 guard proves the shipped override feeds Crown zero recovery while the nearest-wrong heal encoding fires her every 15s. BURST ('The Best Engineer!', cd 40s) — a destroyed-cover BRANCH kit; v1 has no incoming-damage / cover-destruction model (immortal boss), so nobody's cover is ever destroyed and the branch gate is CONSTANT: branch A (destroyed cover → Rebuild Cover 30% HP + ATK ▲20%/10s) can NEVER legitimately fire → UNMODELED verbatim (the biscuit S2 un-fireable-trigger disposition; its 20% ATK is pinned ABSENT by the spec's value-set assertion); branch B ('if there is no ally whose cover has been destroyed' — always TRUE in v1, soline Max-HP-gate documentation pattern: the gate is recorded, never enacted) → burstCast → alliesTopAtk count:1 → casterAtkPct 40 / durationSec 10 (⚑1 stand-in again). Burst CASTS: lily is the fixture's SOLE B2 (controlComp's crown out-rotates a co-B2 → the spec's MAIN fixture swaps crown for lily; G0 pins one lily cast per Full Burst). Burst gauge (0.1/shot) is carried by the datamined burst_energy_pershot, not an override block. No heal/shield/DEF/gauge/ammo/reload/weapon-swap/Hit-Rate lines in this kit; no stacks/rounds/resources; every duration is plain wall-clock seconds. Element: Wind — clean engine ×1.10 advantage vs Iron (no Superior-Elemental-Code buff in kit). ⚑ FLAGS: (⚑1) RANDOM-ALLY STAND-IN (both modeled lines) — estimate = highest-base-ATK ally (alliesTopAtk count:1, static ranking, slot tie-break); recipe = focus video, read which ally's ATK-buff popup appears on each S1/burst fire; near-damage-neutral (flat add), holder identity is the real delta. (⚑2) CADENCE TUPLE — SMG RoF 1440 + reloadFrames 81 shipped datamine as-is (no charFixes); she is a support and her own damage is minor; recipe = rounds/min + reload gap from any focus video. (⚑3) INTERVAL FIRST-FIRE PHASE — t=15 vs t=0 is the engine convention; pinned at t=15. TIER 2: scoped single-ally buffs + burstCast trigger + destroyed-cover status-gate kit (the gate is constant in v1: always-false for branch A, always-true for branch B).",
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Affects all allies.\nRestores 10% of Cover HP. — UNMODELED (inert): restores COVER HP, not a unit's HP; no sim cover-HP representation (same NO-OP class as liter S2, owner ruling 2026-07-21; naga cover-restore precedent). Emits no unit-recovery event, so it must not trigger recovery-consumer teammates (the liter trap — pinned by the unit spec's Crown guard)."
    ],
    "burst": [
      "■ Affects 1 random ally unit whose cover has been destroyed.\nRebuild Cover with 30% HP.\nATK ▲ 20% of the skill user's ATK for 10 sec. — UNMODELED (inert): the destroyed-cover gate can never legitimately fire in v1 — there is no incoming-damage / cover-destruction model (immortal boss), so no ally's cover is ever destroyed and this branch never applies (biscuit S2 un-fireable-trigger disposition). The Rebuild Cover portion is the liter-S2 cover-HP NO-OP class regardless. Its 20% ATK magnitude is pinned ABSENT by the unit spec (lily grants ONLY the 40% branch-B flat value)."
    ]
  },
  "caveats": [
    "skill1: cadence is the DATAMINED skill cooldown (interval 15s); first-fire phase (t=15 vs t=0) is the engine interval convention (⚑3).",
    "skill1 + burst: '1 random ally' resolves to the single highest-base-ATK ally (alliesTopAtk count:1 — chime single-ally-grant precedent; no random-selection target kind exists in the deterministic sim). ⚑1 — the true random pick would rotate the holder; flat-ATK grants are near-damage-neutral across holders, so the stand-in moves holder identity, not (much) team damage.",
    "burst: destroyed-cover status gate is CONSTANT in v1 — branch A (rebuilt cover + 20% ATK) never fires (no cover-destruction model), branch B (40% ATK) always fires; the gate is documented, never enacted as a blocker (soline Max-HP-gate pattern).",
    "skill2: the cover restore is an inert NO-OP in v1 (no cover representation); it is NOT a unit heal and emits no recovery events.",
    "weapon: lily's own SMG damage is minor relative to her buffer value; the base-weapon cadence is datamined (RoF 1440, reloadFrames 81) and unverified by footage (⚑2).",
    "rarity: lily is SR; the scope-lock basis (3★/core 7) is an SSR ceiling — the helm-in-controlComp precedent ships her uncapped for spec consistency, and her own ATK (the casterAtkPct basis) is therefore slightly warm (affects the flat grant magnitude, not the structure)."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "interval", "sec": 15 },
      "target": { "kind": "alliesTopAtk", "count": 1 },
      "effects": [
        { "kind": "buff", "stat": "casterAtkPct", "value": 20, "durationSec": 5 }
      ]
    }
  ],
  "skill2": [],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "alliesTopAtk", "count": 1 },
      "effects": [
        { "kind": "buff", "stat": "casterAtkPct", "value": 40, "durationSec": 10 }
      ]
    }
  ]
}

```
