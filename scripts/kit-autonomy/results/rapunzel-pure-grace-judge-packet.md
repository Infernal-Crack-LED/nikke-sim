# S7 RECONCILING JUDGE — CONTRACT (return the JSON it specifies)
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

# MECHANICS SSOT — docs/data/damage-calculation.md

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


---

# MECHANICS SSOT — docs/data/game-mechanics.md

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

# GROUND TRUTH — Rapunzel: Pure Grace (slug `rapunzel-pure-grace`), from data/characters.json

```json
{
 "slug": "rapunzel-pure-grace",
 "name": "Rapunzel: Pure Grace",
 "weapon": "SR",
 "burst": "I",
 "burstCooldownSec": 20,
 "class": "Defender",
 "element": "Iron",
 "manufacturer": "Pilgrim",
 "normalAttackMultiplier": 69.04,
 "coreAttackMultiplier": 200,
 "ammo": 6,
 "reloadFrames": 141,
 "chargeFrames": 60,
 "chargeMultiplier": 250,
 "hitsPerShot": 1,
 "burstGaugePerShot": 2.8,
 "skills": {
  "skill1": "\u25a0 Activates at the start of battle. Affects self.\nCreates a shared Shield equal to 20.59% of the skill user's final Max HP that protects all allies from damage. This effect is continuous.\n\u25a0 Activates when using Burst Skill. Affects self.\nCreates a shared Shield equal to 20.59% of the skill user's final Max HP that protects all allies from damage. This effect is continuous.\n\u25a0 Activates only when Full Charge is maintained for more than 1 sec while a Shield is set in front of this unit. Affects all allies.\nAttack Damage \u25b2 10.41% continuously.",
  "skill2": "\u25a0 Activates when attacking with Full Charge. Affects self.\nRecovers 2% of the skill user's final Max HP.\n\u25a0 Activates only when Full Charge is maintained for more than 1 sec while a Shield is set in front of this unit. Affects self.\nCurrent HP \u25bc 2% every 1 sec continuously.\nRestores Shield HP equal to 3.16% of the skill user's final Max HP every 1 sec continuously.",
  "burst": "\u25a0 Affects self.\nMax HP \u25b2 10.13% for 10 sec.\n\u25a0 Affects all allies.\nAttack Damage \u25b2 15.24% for 10 sec."
 },
 "baseStats": {
  "hp": 16500,
  "atk": 400,
  "def": 92,
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
  "resourceId": 226
 }
}
```

---

# S2b CROSS-FAMILY TEST REVIEW (claude-fable-5)

```json
{
  "slug": "rapunzel-pure-grace",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start of battle: shared Shield 20.59%",
      "disposition": "FAITHFUL",
      "scope": "shield creation, not a stat buff; 20.59% of the SKILL USER's final Max HP (own-HP scaler, taxonomy #7)",
      "durationSemantics": "'continuous' = no durationSec (permanent at scope; boss damage unmodeled, nothing breaks shields)",
      "triggerIdentity": "passive (start-of-battle, t=0) — NOT interval, NOT burstCast",
      "targetSet": "prose header says 'Affects self' but the effect text says the shared Shield 'protects all allies' — the shield event must reach ALL allies (fires every ally's 'shielded' trigger), not self only",
      "nearestWrongModel": "shield targeted self-only per the '■ Affects self' header, so ally 'shielded' triggers (e.g. a naga-style shield-gate teammate) never fire; or the line skipped entirely as 'defensive, no damage' (taxonomy #4 trap)",
      "distinguishingAssertion": "with a synthetic 'shielded'-triggered marker buff patched onto a NON-rapunzel ally via withPatchedOverride, the marker's buffApply appears at frame 0 — green under allies-targeted shield, red under self-only or missing shield. Additionally, patching the shield blocks OUT of her override must kill her own requiresShielded-gated skill1 10.41 buff (the gate feeder test)",
      "inertness": "the shield itself moves zero damage directly (no HP pool at scope); totals must be unchanged by the shield block alone in a comp with no shield-consumers",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "when using Burst Skill: shared Shield",
      "disposition": "FAITHFUL",
      "scope": "same shield re-creation, 20.59% of own final Max HP",
      "durationSemantics": "'continuous' = no durationSec; each cast refreshes/replaces",
      "triggerIdentity": "burstCast — 'when using Burst Skill' is THIS unit casting her own Burst I, NOT any team Full Burst",
      "targetSet": "shield event to all allies (same shared-shield reading as the start-of-battle line)",
      "nearestWrongModel": "keyed to fullBurstEnter — fires on EVERY team Full Burst including rotations where the other B1 (liter in the control comp) bursts instead of her; over-fires ally 'shielded' triggers. Second-nearest: dropped as redundant with the t=0 shield (inert at scope but loses the re-fired shielded events)",
      "distinguishingAssertion": "count of shield-driven 'shielded' marker applications after t=0 equals the count of burstCast events with srcSlot === her slot, and is strictly less than the fullBurstStart count in a comp where liter also casts B1 — green under burstCast, red under fullBurstEnter",
      "inertness": "no direct damage; must not add or move totals in a consumer-free comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge >1 sec + Shield: Atk Dmg 10.41%",
      "disposition": "MEASUREMENT-GATED",
      "scope": "attackDamagePct (Damage Up bucket) — generic Attack Damage, applies to allies' all damage; NOT atkPct, NOT charge-scoped despite the Full-Charge wording (the charge condition is on the CASTER's state, the buff itself is unscoped)",
      "durationSemantics": "'continuously' = active while the maintain-condition holds; no fixed durationSec. Uptime is the open question, not duration",
      "triggerIdentity": "state-condition, not an event: 'Full Charge maintained for MORE THAN 1 sec' AND 'a Shield is set in front of this unit' (requiresShielded gate; her own continuous shield self-satisfies it). CRITICAL: her SR reaches full charge in 60 frames (1 s) and the sim's fire policy releases at full charge + 22 f latency — under fire-at-full-charge she may NEVER literally maintain full charge >1 s, so the faithful uptime is a firing-policy question. ⚑ uptime must be estimated/measured (buff-icon uptime in focus footage), never silently assumed 100%",
      "targetSet": "ALL allies (including self) — the header says 'Affects all allies'",
      "nearestWrongModel": "an unconditional always-on passive team buff (drops both the shield gate and the >1 s-hold condition) — over-credits the whole team's damage by up to 10.41% Damage-Up dilution-adjusted; the opposite misread (never-active because the sim never overholds, modeled as fully dropped) under-credits",
      "distinguishingAssertion": "buffApply events with stat 'attackDamagePct', value 10.41, targeting all 5 targetIdx values, casterIdx === her slot; AND under withPatchedOverride removing her shield-creating blocks, those buffApply events disappear (gate proven live) — green under gated model, red under unconditional passive. The uptime fraction itself carries a ⚑ pin",
      "inertness": "with the shield blocks patched out, team totals must fall by exactly the 10.41 contribution (gate-coupled); it must contribute nothing before her shield exists (never before frame 0 — trivially satisfied here)",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "attacking with Full Charge: recover 2% HP",
      "disposition": "FAITHFUL",
      "scope": "heal, 2% of own final Max HP; no damage",
      "durationSemantics": "instant per activation",
      "triggerIdentity": "per full-charge shot — shotFired on an SR whose every normal shot is a full-charge attack under the sim's charge model (fbGate none). On-attack, not interval",
      "targetSet": "self — the heal event reaches only her, so only HER 'recovery' triggers can fire",
      "nearestWrongModel": "skipped as 'defensive, no damage' (taxonomy #4 — heal lines drive teammate/self 'recovery' consumers); or mis-targeted to allies, which would wrongly fire ally recovery triggers (Crown-style consumers) she cannot actually feed",
      "distinguishingAssertion": "with a synthetic recovery-triggered marker buff patched onto HER OWN override, the marker fires once per shot event with srcSlot === her slot; with the same marker patched onto a different ally, it must NEVER fire — green under self-targeted heal, red under skipped or ally-targeted",
      "inertness": "zero damage movement in any comp lacking a recovery-consumer on rapunzel-pure-grace herself; totals identical with the block patched out in the control comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "gated: Current HP ▼ 2% every 1 sec",
      "disposition": "UNMODELED",
      "scope": "self HP drain — pure HP economy, no damage stat",
      "durationSemantics": "1 s tick while the same maintain-condition holds",
      "triggerIdentity": "same state-condition as skill1 line 3 (Full Charge >1 s + shielded)",
      "targetSet": "self",
      "nearestWrongModel": "encoded as a DoT on the BOSS (a 'Current HP ▼' misread as enemy damage) — that would invent damage from a self-cost line",
      "distinguishingAssertion": "no damage events with srcSlot === her slot in any 'dot'/skill bucket attributable to this line; her damage total contains only weapon + burst-line contributions",
      "inertness": "must move ZERO damage for any unit; belongs verbatim in unmodeled.skill2",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "gated: restore Shield HP 3.16% every 1 sec",
      "disposition": "UNMODELED",
      "scope": "shield-HP restoration — no shield HP pool exists at scope (boss deals no damage, shields never deplete)",
      "durationSemantics": "1 s tick while condition holds",
      "triggerIdentity": "same maintain-condition gate",
      "targetSet": "self (the shield in front of her)",
      "nearestWrongModel": "modeled as a repeating 'shield' EFFECT every 1 s — which would re-fire every ally's 'shielded' trigger once per second, massively over-crediting any shield-synergy teammate",
      "distinguishingAssertion": "in a comp with a shielded-trigger consumer ally, that consumer's trigger count matches only the discrete shield CASTS (t=0 + her burst casts), never a 1 Hz tick train — green under unmodeled/restore-as-non-event, red under repeating shield effect",
      "inertness": "zero damage; zero extra shielded-trigger firings; verbatim in unmodeled.skill2",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "self: Max HP ▲ 10.13% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "self Max HP stat (maxHpPct / maxHpFlat-resolved). She has no atkOfMaxHpPct conversion, so it is offensively inert TODAY — keep the stat buff anyway (taxonomy #7, future consumer). Note it also briefly raises the base of her own %-of-Max-HP shield/heal values if those recompute at cast",
      "durationSemantics": "durationSec 10 — wall-clock, correctly seconds (no 'round(s)' wording)",
      "triggerIdentity": "burstCast (her own Burst I block)",
      "targetSet": "self only",
      "nearestWrongModel": "dropped entirely as inert; or target widened to allies. Also the emitted-event trap: harness emits Max HP grants under stat 'maxHpFlat' as a FLAT HP number, not 10.13",
      "distinguishingAssertion": "on each of her burstCast events, one buffApply with stat 'maxHpFlat', targetIdx === casterIdx === her slot, value ≈ 0.1013 × her final Max HP, expiresFrame = cast frame + 600 — green under faithful, red under dropped/ally-targeted",
      "inertness": "team damage totals unchanged when this block is patched out (no HP→ATK consumer in the comp)",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "all allies: Atk Dmg ▲ 15.24% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket, additive/diluted with other Damage-Up sources incl. her own 10.41 line — assert additive stacking, not multiplicative)",
      "durationSemantics": "durationSec 10, wall-clock",
      "triggerIdentity": "burstCast — fires ONLY on rotations SHE casts Burst I. With liter (also B1) in the control comp, first-ready-in-window selection means some rotations may go to liter; burst-cast vs fullBurstEnter genuinely diverge here",
      "targetSet": "all allies including self",
      "nearestWrongModel": "keyed to fullBurstEnter — fires on EVERY team Full Burst regardless of which B1 cast, over-crediting the team on liter-cast rotations; also note the 20 s burst cd vs the rotation period decides real uptime",
      "distinguishingAssertion": "count of buffApply events (stat 'attackDamagePct', value 15.24) equals the count of burstCast events with srcSlot === her slot × 5 targets, and is NOT equal to fullBurstStart count × 5 whenever the rotation log shows a Full Burst she did not open — green under burstCast, red under fullBurstEnter",
      "inertness": "no applications on rotations where her burstCast is absent; buff must lapse at +600 frames (read expiresFrame off buffApply — no buffRemove is emitted on natural expiry)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:shield-start-of-battle",
    "skill1:shield-on-burst-cast",
    "skill1:atkDmg-10.41-shield+hold-gated",
    "burst:atkDmg-15.24-allies-10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Current HP ▼ 2% every 1 sec continuously.",
      "Restores Shield HP equal to 3.16% of the skill user's final Max HP every 1 sec continuously."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to reconcile: (1) THE BIG ONE — skill1's 10.41% team Attack Damage is gated on 'Full Charge maintained for MORE THAN 1 sec while shielded'. Her SR reaches full charge at chargeFrames 60 = exactly 1 s and the sim fires at full charge + 22 f release latency, so a literal reading gives ~0% uptime while the lazy reading (always-on passive) gives 100%. Neither extreme is proven; uptime is a ⚑ requiring a buff-icon/focus recording. A driver who ships it as an ungated passive with no ⚑ has silently taken the over-credit branch. (2) Both 'when using Burst Skill' lines (shield refresh, and the burst slot's own buffs) are burstCast, never fullBurstEnter — and this distinction is LIVE in the control comp because liter is a competing B1. (3) The shield's '■ Affects self' header conflicts with 'protects all allies' body text — the shared shield must fire ALL allies' shielded triggers; self-only is the header-echo trap. (4) The shield blocks are load-bearing even though shields move no damage: they FEED her own requiresShielded gate on the 10.41 line, so patching them out must kill that buff. (5) Skill2's shield-HP restore must NOT be encoded as a repeating 'shield' effect (would spam ally shielded triggers at 1 Hz). (6) All magnitudes are kit-literal (DATAMINED); the only CALIBRATED ⚑ is the hold-condition uptime. (7) Defender static ATK 78,707 at scope; her personal damage is small — the two team Attack Damage lines are where the board sensitivity lives.",
  "model": "claude-fable-5"
}

```

---

# S5 BLIND TEST (claude-opus-5) — written from kit prose alone

Run vs the DRIVER override: **16 passed | 2 skipped (honest unobservable gaps: heal AMOUNT, shield-HP restore) | 0 failed** (vitest, deterministic).

```ts
/**
 * rapunzel-pure-grace — Rapunzel: Pure Grace (SR / Iron / Defender / Burst I; ammo 6, chargeFrames 60)
 * BLIND kit-spec test: written from the kit prose ALONE (no sight of the shipped override, the
 * driver's tests, or the driver's reasoning).
 *
 * KIT (structural read — `■` header + `Affects` clause + stat keyword before the arrow):
 *   skill1-a  start of battle, self            -> shared Shield = 20.59% of caster final Max HP, CONTINUOUS
 *   skill1-b  when using Burst Skill, self     -> the same shield again, CONTINUOUS
 *   skill1-c  full charge held >1s WHILE a shield is set, ALL ALLIES -> Attack Damage +10.41%, CONTINUOUS
 *   skill2-a  attacking with Full Charge, self -> recovers 2% of caster final Max HP (a heal => 'recovery')
 *   skill2-b  full charge held >1s WHILE shielded, self -> Current HP -2%/s and Shield HP +3.16%/s, CONTINUOUS
 *   burst-a   self                             -> Max HP +10.13% for 10 sec
 *   burst-b   all allies                       -> Attack Damage +15.24% for 10 sec
 *
 * WHY THE ASSERTIONS DISCRIMINATE
 *   - skill1-c is ALL ALLIES and CONTINUOUS: the coverage assertion (every slug in totals gets it)
 *     fails under the nearest-wrong self-only encoding; the expiresFrame assertion fails under a
 *     nearest-wrong timed ("for N sec") encoding.
 *   - skill1-c / skill2-b are literally gated on "while a Shield is set in front of this unit", and
 *     her own skill1-a shield is what satisfies it. Stripping the shield effects from her clone must
 *     therefore kill the 10.41% buff; it does NOT under the nearest-wrong ungated-passive encoding
 *     (numerically identical on this fixture, which is exactly why only a counterfactual can see it).
 *   - burst-a is SELF-scoped and (she carries no atkOfMaxHpPct) offensively inert: the byte-identical
 *     totals assertion fails under a nearest-wrong allies-wide or ATK-flavoured encoding.
 *   - burst-b is ALL ALLIES for 10s: coverage + a finite expiresFrame + a strict damage drop when removed.
 *
 * FIXTURE NOTES
 *   - controlComp(SLUG, true) = liter (B1) / crown (B2) / rapunzel (carry slot) / helm (B3).
 *     Rapunzel is BURST I, so she CONTENDS WITH LITER for stage 1 and may never cast in the control
 *     comp. Every burst assertion therefore runs on a fixture where an in-memory `burstFirst` effect
 *     is injected into her clone so she takes the stage-1 cast. The burst counterfactuals compare
 *     that same fixture against itself, so the rotation is apples-to-apples.
 *   - The engine models no HP pool and `cfg.onEvent` carries no heal/shield/recovery kind, so the
 *     shield magnitude, the 2% heal amount, the -2%/s drain and the +3.16%/s shield regen are NOT
 *     directly observable. They are pinned STRUCTURALLY on the override clone withPatchedOverride
 *     hands back, plus an `it.skip` recording the missing observable.
 *   - 6 hoisted runs.
 */
// ADAPTED (driver, mechanical only): (1) harness import path (blind/ -> scripts/tests/lib),
// (2) whole-kit-inertness filter e.srcSlot===RAP_IDX_BF -> e.slug===SLUG (srcSlot is a slot-name
// string in this repo, not a unit index). No assertion logic changed.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'rapunzel-pure-grace';
const S1_ATK = 10.41; // skill1-c Attack Damage, all allies, continuous
const BURST_ATK = 15.24; // burst-b Attack Damage, all allies, 10 sec
const SHIELD_PCT = 20.59; // skill1-a / skill1-b shared shield, % of caster final Max HP
const FIGHT_FRAMES = 180 * 60;

const near = (a: unknown, b: number) => typeof a === 'number' && Math.abs(a - b) < 1e-6;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type DamageEv = Extract<SimEvent, { kind: 'damage' }>;
const buffApplies = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const damages = (evs: SimEvent[]) => evs.filter((e): e is DamageEv => e.kind === 'damage');

// ---- override-clone pokers -------------------------------------------------
// Tolerant of both slot shapes (slot as Block[] vs slot as { blocks: Block[] }).
type EffLike = { kind?: string; [k: string]: unknown };
type BlkLike = {
  trigger?: { kind?: string };
  target?: { kind?: string };
  effects?: EffLike[];
  [k: string]: unknown;
};
type Slot = 'skill1' | 'skill2' | 'burst';

function slotBlocks(ov: unknown, slot: Slot): BlkLike[] {
  const raw = (ov as Record<string, unknown> | undefined)?.[slot];
  if (Array.isArray(raw)) return raw as BlkLike[];
  const nested = (raw as { blocks?: unknown } | undefined)?.blocks;
  return Array.isArray(nested) ? (nested as BlkLike[]) : [];
}
function effectsIn(ov: unknown, slot: Slot): EffLike[] {
  return slotBlocks(ov, slot).flatMap((b) => b.effects ?? []);
}
function blocksWithEffect(ov: unknown, slot: Slot, kind: string): BlkLike[] {
  return slotBlocks(ov, slot).filter((b) => (b.effects ?? []).some((e) => e.kind === kind));
}
function stripEffects(ov: unknown, slot: Slot, pred: (e: EffLike) => boolean): void {
  for (const b of slotBlocks(ov, slot)) {
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e) => !pred(e));
  }
}
// Rapunzel is Burst I and shares stage 1 with liter in controlComp; force her to take the cast.
function addBurstFirst(ov: unknown): void {
  slotBlocks(ov, 'skill1').push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstFirst' }],
  } as BlkLike);
}

// The unmutated clone — used for the structural pins on unobservable lines.
const OV: unknown = withPatchedOverride(SLUG, () => {});

const NO_S1_ATK = withPatchedOverride(SLUG, (ov) =>
  stripEffects(ov, 'skill1', (e) => e.kind === 'buff' && near(e.value, S1_ATK)),
);
const NO_SHIELD = withPatchedOverride(SLUG, (ov) =>
  stripEffects(ov, 'skill1', (e) => e.kind === 'shield'),
);
const BURST_FIRST = withPatchedOverride(SLUG, (ov) => addBurstFirst(ov));
const BF_NO_ALLY_ATK = withPatchedOverride(SLUG, (ov) => {
  addBurstFirst(ov);
  stripEffects(ov, 'burst', (e) => e.kind === 'buff' && near(e.value, BURST_ATK));
});
const BF_NO_SELF_HP = withPatchedOverride(SLUG, (ov) => {
  addBurstFirst(ov);
  stripEffects(
    ov,
    'burst',
    (e) => e.kind === 'buff' && String(e.stat ?? '').toLowerCase().includes('maxhp'),
  );
});

// ---- runs (hoisted) --------------------------------------------------------
type Run = {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
  t: Record<string, number>;
};
function run(patched?: ReturnType<typeof withPatchedOverride>): Run {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true);
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  opts.cfg = {
    ...opts.cfg,
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  const res = runComp(opts);
  return { res, events, t: totals(res) };
}

const R_BASE = run();
const R_NO_S1_ATK = run(NO_S1_ATK);
const R_NO_SHIELD = run(NO_SHIELD);
const R_BF = run(BURST_FIRST);
const R_BF_NO_ALLY = run(BF_NO_ALLY_ATK);
const R_BF_NO_SELF_HP = run(BF_NO_SELF_HP);

const SLUGS = Object.keys(R_BASE.t);
const idxFrom = (r: Run, v: number) =>
  buffApplies(r.events).find((e) => e.stat === 'attackDamagePct' && near(e.value, v))?.casterIdx ??
  null;
const RAP_IDX = idxFrom(R_BASE, S1_ATK);
const RAP_IDX_BF = idxFrom(R_BF, BURST_ATK) ?? idxFrom(R_BF, S1_ATK);

const atkBuffs = (r: Run, v: number) =>
  buffApplies(r.events).filter((e) => e.stat === 'attackDamagePct' && near(e.value, v));

describe('rapunzel-pure-grace — fixture sanity', () => {
  it('fires and the control comp is the expected 4-unit board', () => {
    expect(unitOf(R_BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(SLUGS.length).toBeGreaterThanOrEqual(4);
    expect(SLUGS).toContain(SLUG);
  });
});

describe('skill1-a / skill1-b — shared Shield 20.59% of final Max HP, continuous', () => {
  // No shield/heal event kind on cfg.onEvent and no HP pool in v1, so the shield is pinned
  // structurally. Two SEPARATE activations (start of battle + on Burst Skill) => two blocks.
  it('models BOTH shield activations at 20.59% of caster Max HP', () => {
    const shields = effectsIn(OV, 'skill1').filter((e) => e.kind === 'shield');
    expect(shields.length).toBeGreaterThanOrEqual(2);
    for (const s of shields) expect(near(s.maxHpPct, SHIELD_PCT)).toBe(true);
  });

  it('keys one shield to battle start and one to her own burst cast', () => {
    const kinds = new Set(
      blocksWithEffect(OV, 'skill1', 'shield').map((b) => String(b.trigger?.kind ?? '')),
    );
    // nearest-wrong: a single shield block (drops the burst re-shield), or keying the second to
    // fullBurstEnter (which would fire on ANY team full burst, over-crediting the gate below).
    expect(kinds.has('passive')).toBe(true);
    expect(kinds.has('burstCast')).toBe(true);
    expect(kinds.has('fullBurstEnter')).toBe(false);
  });

  it('the shield is CONTINUOUS, not a timed window', () => {
    for (const s of effectsIn(OV, 'skill1').filter((e) => e.kind === 'shield')) {
      const d = s.durationSec;
      expect(d == null || (typeof d === 'number' && d >= 180)).toBe(true);
    }
  });
});

describe('skill1-c — Attack Damage +10.41%, ALL ALLIES, continuous, shield-gated', () => {
  it('applies 10.41 attackDamagePct to EVERY ally (not self-only)', () => {
    const applies = atkBuffs(R_BASE, S1_ATK);
    expect(applies.length).toBeGreaterThan(0); // non-vacuity: the fixture exercises the active case
    const covered = new Set(applies.map((e) => e.targetSlug));
    for (const s of SLUGS) expect(covered.has(s)).toBe(true);
  });

  it('is CONTINUOUS — no finite in-fight expiry (vs the nearest-wrong 10 sec window)', () => {
    for (const e of atkBuffs(R_BASE, S1_ATK)) {
      const f = e.expiresFrame;
      expect(f == null || (typeof f === 'number' && f >= FIGHT_FRAMES)).toBe(true);
      expect(e.durationShots == null).toBe(true); // seconds/continuous, never a ROUND count
    }
  });

  it('is load-bearing: removing it drops EVERY unit on the board', () => {
    expect(atkBuffs(R_NO_S1_ATK, S1_ATK)).toHaveLength(0);
    for (const s of SLUGS) expect(R_NO_S1_ATK.t[s]).toBeLessThan(R_BASE.t[s]);
  });

  it('is GATED on a shield being set: stripping her shield kills the buff', () => {
    // "Activates only when Full Charge is maintained ... while a Shield is set in front of this
    // unit" — her own skill1-a shield is what satisfies it, so the two are numerically identical
    // on this fixture and ONLY the counterfactual separates the faithful requiresShielded gate
    // from the nearest-wrong ungated passive.
    expect(atkBuffs(R_NO_SHIELD, S1_ATK)).toHaveLength(0);
  });
});

describe('skill2-a — full-charge attack recovers 2% of final Max HP', () => {
  it('models a self heal on her full-charge attack (drives ally on-recovery kits)', () => {
    const healBlocks = blocksWithEffect(OV, 'skill2', 'heal');
    expect(healBlocks.length).toBeGreaterThan(0); // MISSING-line detector
    for (const b of healBlocks) {
      expect(b.target?.kind).toBe('self');
      // "when attacking with Full Charge" = per trigger pull for a charge SR — never `passive`,
      // never fullBurstEnter (which would fire on team bursts she took no shot for).
      expect(['shotFired', 'chargeCounter']).toContain(String(b.trigger?.kind ?? ''));
    }
  });

  it.skip('GAP: the 2%-of-Max-HP recovery amount is unobservable (no HP pool; no heal/recovery event kind on cfg.onEvent)', () => {});
});

describe('skill2-b — Current HP -2%/s and Shield HP +3.16%/s while shielded, continuous', () => {
  it('the self HP drain is NOT encoded as damage', () => {
    // nearest-wrong: reading "Current HP ▼ 2% every 1 sec" as a DoT / flat hit on the boss.
    const kinds = new Set(effectsIn(OV, 'skill2').map((e) => String(e.kind)));
    expect(kinds.has('dot')).toBe(false);
    expect(kinds.has('flatDamage')).toBe(false);
    expect(kinds.has('hitRepeat')).toBe(false);
    expect(kinds.has('storedHit')).toBe(false);
  });

  it.skip('GAP: shield-HP restoration (3.16%/s) is unobservable — v1 models no HP or shield pool, and nothing consumes shield HP', () => {});
});

describe('burst-a — self Max HP +10.13% for 10 sec', () => {
  it('applies a SELF-only flat Max HP grant with a finite window', () => {
    const hp = buffApplies(R_BF.events).filter(
      (e) => e.stat === 'maxHpFlat' && e.casterIdx === RAP_IDX_BF && e.targetIdx === RAP_IDX_BF,
    );
    expect(hp.length).toBeGreaterThan(0); // caster-scaled % re-emits FLAT, so assert the flat number
    for (const e of hp) {
      expect(Number(e.value)).toBeGreaterThan(0);
      expect(typeof e.expiresFrame).toBe('number');
      expect(Number(e.expiresFrame)).toBeLessThan(FIGHT_FRAMES); // 10 sec, not continuous
    }
  });

  it('is offensively INERT — removing it moves nobody (she carries no HP->ATK scaler)', () => {
    // nearest-wrong: encoding it allies-wide, or as an ATK/Attack-Damage buff, moves the board here.
    for (const s of SLUGS) expect(R_BF_NO_SELF_HP.t[s]).toBe(R_BF.t[s]);
  });
});

describe('burst-b — Attack Damage +15.24%, all allies, 10 sec', () => {
  it('non-vacuity: she actually casts her Burst I on the burstFirst fixture', () => {
    // If this is the only red test, the control comp is starving her stage-1 cast (liter is also
    // Burst I) and the fixture — not the override — is what needs changing.
    expect(atkBuffs(R_BF, BURST_ATK).length).toBeGreaterThan(0);
  });

  it('covers EVERY ally and expires inside the fight (10 sec, not continuous)', () => {
    const applies = atkBuffs(R_BF, BURST_ATK);
    const covered = new Set(applies.map((e) => e.targetSlug));
    for (const s of SLUGS) expect(covered.has(s)).toBe(true);
    for (const e of applies) {
      expect(typeof e.expiresFrame).toBe('number');
      expect(Number(e.expiresFrame)).toBeLessThan(FIGHT_FRAMES);
      expect(e.durationShots == null).toBe(true);
    }
  });

  it('is load-bearing: removing it drops every unit on the board', () => {
    expect(atkBuffs(R_BF_NO_ALLY, BURST_ATK)).toHaveLength(0);
    for (const s of SLUGS) expect(R_BF_NO_ALLY.t[s]).toBeLessThan(R_BF.t[s]);
  });
});

describe('whole-kit inertness — no invented damage', () => {
  it('her kit deals ZERO skill- or burst-bucket damage (every line is a shield/heal/buff)', () => {
    expect(RAP_IDX).not.toBeNull();
    const buckets = new Set(
      damages(R_BF.events)
        .filter((e) => e.slug === SLUG) // ADAPTED: srcSlot is a slot-name string in this repo; filter by the damage event slug instead
        .map((e) => String(e.bucket)),
    );
    expect(buckets.has('skill')).toBe(false);
    expect(buckets.has('burst')).toBe(false);
  });
});

```

---

# S6 BLIND OVERRIDE (claude-opus-5) — written from kit prose alone

## Driver-vs-blind structural diff (driver's reconciliation read)
- IDENTICAL blocks (4/6): skill2 shotFired→self heal; burst burstCast→self targetMaxHpPct 10.13/10s; burst burstCast→allies attackDamagePct 15.24/10s; and the skill1-slot placement of BOTH shield activations with maxHpPct 20.59 (battle-start passive + burstCast).
- DIVERGENCE A — shield TARGET: driver `allies` vs blind `self`. The kit header says "Affects self" but the body says the SHARED shield "protects all allies from damage"; the S2b reviewer independently ruled this the header-echo trap — the shared shield must reach every ally (fires every ally's 'shielded' trigger). Driver tests SH1/SH2 read the shield through naga's real 'shielded' consumer and are RED under self-only. The blind model itself flagged the ambiguity.
- DIVERGENCE B — L3 trigger: driver `passive` vs blind `interval{sec:1}`, both + requiresShielded, both permanent (no durationSec). Behaviorally IDENTICAL at scope: the gate is self-supplied and always true (her own battle-start shield), so the interval re-evaluation only refreshes the same permanent buff. Both carry the same ⚑ on the unmodelable 'Full Charge maintained >1s' half (no charge-hold primitive; driver estimate ~100% real-play uptime = upper bound; blind estimate ~99% duty cycle, 'realistic hold-aware estimate could be materially lower').
- UNMODELED: both drop the SAME skill2 line (Current HP ▼ 2%/s + Shield HP restore 3.16%/s — no HP pool / shield-HP pool), verbatim.

```json
{
  "slug": "rapunzel-pure-grace",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 20.59
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 20.59
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 1
      },
      "target": {
        "kind": "allies"
      },
      "requiresShielded": true,
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.41
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 1
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
          "stat": "targetMaxHpPct",
          "value": 10.13,
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
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 15.24,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Current HP \u25bc 2% every 1 sec continuously.",
      "Restores Shield HP equal to 3.16% of the skill user's final Max HP every 1 sec continuously."
    ],
    "burst": []
  },
  "caveats": [
    "\u2691 skill1 team Attack Damage 10.41%: uptime assumed 100% from t=1s. The kit gates it on 'Full Charge maintained for more than 1 sec', which has NO engine analogue (no charge-hold state on a charge weapon \u2014 the sim charges and releases). Real uptime is bounded by how much of the fight she actually holds a completed charge; reload (141f datamined) and release windows break the hold. This is the OPTIMISTIC bound, not a measured value.",
    "Both shield lines are authored target `self`, following the literal 'Affects self' clause, even though the prose says the shield is shared and protects all allies. Self-targeting satisfies this kit's own requiresShielded gate; if the shared shield also fires ALLY `shielded` triggers in game, the target must widen to `allies`. Widening is the over-crediting direction, so the conservative read is shipped.",
    "'Current HP \u25bc 2% every 1 sec' and 'Restores Shield HP \u2026 every 1 sec' are unmodeled: v1 models no HP pool and no shield HP pool, and the boss deals no damage, so both are no-ops at scope. The shield restore is deliberately NOT re-emitted as a per-second `shield` effect \u2014 that would fire `shielded` triggers ~180\u00d7 over a fight and over-credit any shield-synergy consumer.",
    "This kit carries NO damage effects. Her contribution is her own weapon damage plus the two team Attack Damage buffs (10.41% continuous + 15.24% for 10s on her own burst), both additive in the Damage Up bucket and therefore diluted by other support buffs.",
    "Burst self Max HP \u25b2 10.13% is kept for kit completeness; it is offensively inert unless a Max-HP\u2192ATK conversion is present, and ally-granted Max HP does not feed a teammate's atkOfMaxHpPct."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. SR/Iron/Defender/Burst I charge weapon (ammo 6, chargeFrames 60, reloadFrames 141, hitsPerShot 1 \u2014 all datamined \u2691, cadence fields are the known-unreliable class). Offensive content is exactly two team Attack-Damage buffs: a continuous 10.41% (skill1, gated on the owner carrying a shield \u2014 self-supplied at battle start and re-supplied on her own burst cast) and a 15.24% burst-cast buff for 10 sec. Both shield lines are authored as `shield` effects with maxHpPct recorded for kit completeness (no shield HP pool at scope); they are load-bearing because they satisfy this kit's own requiresShielded gate and can drive shield-synergy consumers. The full-charge self-heal is emitted as a recovery event (no HP amount modeled) so on-recovery consumers (e.g. heal-gated ally buffs) fire per shot. \u2691 The 'Full Charge maintained for more than 1 sec' activation is modeled as an interval-1s permanent grant with 100% uptime after t=1s \u2014 see caveats; the true duty cycle is unmeasured. Trigger fidelity: 'when using Burst Skill' is keyed to burstCast (this unit's OWN cast), not fullBurstEnter."
}
```

---

# DRIVER IMPLEMENTATION — unit spec (scripts/tests/units/rapunzel-pure-grace.test.ts, 19/19 GREEN)

```ts
// PER-UNIT KIT SPEC — `rapunzel-pure-grace` (Rapunzel: Pure Grace, the SR/Defender/Iron/Burst-I
// OVERSPEC variant of the BASE Rapunzel — cd 20s, ammo 6, chargeFrames 60; NOT rapunzel/rapu).
// Kit-autonomy gauntlet 2026-08-03.
//
// Pure Grace is a SHIELD-ARCHETYPE tank/buffer: her whole kit hangs off a self-supplied shared
// shield. Damage-relevant footprint = exactly TWO Attack Damage lines (S1-c 10.41% permanent
// shield-gated team buff, burst 15.24% 10s team buff); everything else (shields, self-heal,
// self Max HP) is defensive/event-only in a DPS sim. The faithfulness core is therefore:
//   (a) the shield LINES are real events, not silently dropped — proven through a naga-type
//       'shielded' consumer (shield events fire her S1 coreDamagePct block), and
//   (b) the shield GATE on S1-c is real — the 10.41 buff must vanish when the shield blocks are
//       stripped (requiresShielded), i.e. the gate is self-supplied by her own kit, not cosmetic.
//
// Kit (blablalink prose, data/characters.json → characters['rapunzel-pure-grace'].skills):
//   S1 ■ start of battle → shared Shield = 20.59% of caster final Max HP, protects all allies, continuous [L1]
//      ■ on Burst Skill use → the same shared Shield (20.59%, continuous)                                   [L2]
//      ■ Full Charge maintained >1s while a Shield is set in front of her → all allies:                     [L3]
//        Attack Damage ▲10.41% continuously
//   S2 ■ attacking with Full Charge → self: recover 2% of caster final Max HP                              [L4]
//      ■ Full Charge maintained >1s while Shield set → self: Current HP ▼2%/s + restore Shield HP          [L5]
//        3.16% of caster final Max HP every 1s                     (UNMODELED — no HP pool / shield-HP pool)
//   BU ■ self: Max HP ▲10.13% for 10s                                                                      [L6]
//      ■ all allies: Attack Damage ▲15.24% for 10s                                                          [L7]
//
// Encoding (driver override src/skills/overrides/rapunzel-pure-grace.json):
//   L1  skill1 passive → allies → shield maxHpPct:20.59 (no durationSec = permanent; label precedent)
//   L2  burstCast → allies → shield maxHpPct:20.59
//   L3  skill1 passive + requiresShielded → allies → attackDamagePct 10.41 (no durationSec = permanent).
//       ⚑ CALIBRATED (S2b reconcile): the 'Full Charge maintained >1s' half has NO engine primitive —
//       her SR reaches full charge at chargeFrames 60 = exactly 1s and the sim fires at full charge,
//       so a literal read gives ~0% in-engine uptime while real play (hold-to-aim between shots,
//       shield self-supplied) is ~100%. Encoded always-on behind the shield gate = the UPTIME UPPER
//       BOUND, matching play. Estimate: ~100% real uptime (upper-bound encoding). Recipe: a
//       rapunzel-pure-grace focus recording, buff-icon uptime of the 10.41% Attack Damage vs the
//       shield icon. Tier: Tier-2 state gate. Shield half gated (requiresShielded, self-supplied);
//       label 'Delusion is permanent in the no-incoming-damage sim' precedent for the always-on half.
//   L4  shotFired → self → heal (event-only; SR = one full charge per pull, helm/liberalio precedent).
//       Self-targeted recovery events have NO consumer on her and no HP amount is modeled: damage-inert
//       — modeled for kit-completeness; pinned by the neutrality groups (no damage movement) and by the
//       crown-consumer target-scope pin (the heal reaches NO ally — an ally-widened mis-encoding would
//       fire crown's 'when recovery takes effect' block and move her 20.99 consumer frames).
//   L5  UNMODELED verbatim (no HP pool to drain, no shield-HP pool to restore; defensive, damage-inert).
//   L6  burstCast → self → targetMaxHpPct 10.13 durationSec:10 (label precedent) — inert: she has no
//       atkOfMaxHpPct conversion and v1 has no HP pool.
//   L7  burstCast → allies → attackDamagePct 15.24 durationSec:10.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   SH  the two shield lines are EVENTS: naga's S1 'shielded'-triggered coreDamagePct 85.17 block fires
//       once at frame 0 (L1 battle-start shield) and then exactly on rapunzel-pure-grace's OWN burstCast
//       frames (L2 re-shield). A dropped shield line fires nothing; a fullBurstEnter-keyed L2 would also
//       re-fire on liter's B1 casts (the fixture carries TWO Burst I units), breaking the frame-set match.
//   G   the gate is real: stripping ONLY the shield blocks kills the 10.41 buff entirely (requiresShielded
//       fails at frame 0 with no shield window) while an ungated passive encoding would keep it. Her own
//       shield supplies her own gate — the test proves self-supply, not just presence.
//   B   burst lines are keyed to HER burstCast (two-B1 discrimination vs fullBurstEnter, liter is the
//       decoy), reach exactly 5 holders, last exactly 600 frames; L7 moves the carry's damage, L6 is inert.
//   N   everything outside L3/L7 is byte-identical to the bare weapon (solo burst-on; bare team burst-off)
//       — a shield/heal/maxHp mis-encoding that secretly touched damage would move a total there. Solo
//       full-kit damage > bare proves L3 is live on HERSELF too ('all allies' includes the caster).
//
// Fixture: rapunzel-pure-grace 0 / liter 1 (B1 decoy) / crown 2 (B2) / naga 3 (B2 shield CONSUMER) /
// ada 4 (B3 carry, focused), boss Fire — a real rotation so she casts bursts. Crown's OWN burst shield
// (fused into her 36.24 attackDamagePct block) is stripped effect-only (crownNoShield) so
// rapunzel-pure-grace is the SOLE shield source and every naga 'shielded' firing is attributable to her.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'rapunzel-pure-grace';
/** Fixture slot order. */
const RPG = 0;
const CROWN = 2;
const NAGA = 3;
const ADA = 'ada';
const TEAM = [SLUG, 'liter', 'crown', 'naga', ADA] as const;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const realOverride = loadOverride(SLUG);
if (!realOverride) {
  throw new Error(`${SLUG}: no override on disk — fixture is stale`);
}

// ---- fixture isolation ---------------------------------------------------------------------
/** Strip crown's burst SHIELD EFFECT only (it is fused into her 36.24 attackDamagePct block — keep
 *  the buff, drop the emission) so rapunzel-pure-grace is the sole shield source in the fixture. */
const crownNoShield = withPatchedOverride('crown', (ov) => {
  let stripped = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'shield');
    stripped += before - b.effects.length;
  }
  if (stripped === 0) {
    throw new Error('crown burst shield effect missing — fixture is stale');
  }
});

// ---- counterfactual / isolation patches on the unit under test ------------------------------
const hasShield = (b: any) => b.effects.some((e: any) => e.kind === 'shield');
const hasEffectKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);
const hasStatValue = (b: any, stat: string, value: number) =>
  b.effects.some((e: any) => e.stat === stat && e.value === value);

/** G/SH counterfactual: BOTH shield lines removed (L1 battle-start passive + L2 on-burstCast;
 *  both live in the skill1 slot — the kit lines are skill1 prose). */
const rpgNoShields = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasShield(b));
  if (before - ov.skill1.length !== 2) {
    throw new Error(
      `${SLUG}: expected 2 shield blocks (battle-start + on-burst), found ${before - ov.skill1.length} — fixture is stale`
    );
  }
});
/** G isolation: only the 10.41 gated team buff removed (shields remain). */
const rpgNoL3 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !hasStatValue(b, 'attackDamagePct', 10.41)
  );
  if (ov.skill1.length === before) {
    throw new Error(`${SLUG} S1 10.41 attackDamagePct block missing — stale`);
  }
});
/** L4 isolation: the per-full-charge self-heal removed (proves its TARGET SCOPE through crown's
 *  natural recovery consumer — see L4 group). */
const rpgNoL4 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasEffectKind(b, 'heal'));
  if (ov.skill2.length === before) {
    throw new Error(`${SLUG} S2 self-heal block missing — fixture is stale`);
  }
});
/** B isolation: burst Max HP line removed. */
const rpgNoL6 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasStatValue(b, 'targetMaxHpPct', 10.13)
  );
  if (ov.burst.length === before) {
    throw new Error(`${SLUG} burst targetMaxHpPct block missing — stale`);
  }
});
/** B isolation: burst team Attack Damage line removed. */
const rpgNoL7 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasStatValue(b, 'attackDamagePct', 15.24)
  );
  if (ov.burst.length === before) {
    throw new Error(`${SLUG} burst 15.24 attackDamagePct block missing — stale`);
  }
});
/** N reference: BOTH damage lines (L3 + L7) removed — the defensive residue must be neutral. */
const rpgNoDamageBuffs = withPatchedOverride(SLUG, (ov) => {
  const s1 = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !hasStatValue(b, 'attackDamagePct', 10.41)
  );
  const bu = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasStatValue(b, 'attackDamagePct', 15.24)
  );
  if (ov.skill1.length === s1 || ov.burst.length === bu) {
    throw new Error(`${SLUG} damage-buff blocks missing — fixture is stale`);
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
function fixtureRun(rpgOverride: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...TEAM],
    bossElement: 'Fire',
    focusSlug: ADA,
    overrides: { crown: crownNoShield, [SLUG]: rpgOverride },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

const base = fixtureRun(realOverride);
const noShields = fixtureRun(rpgNoShields);
const noL3 = fixtureRun(rpgNoL3);
const noL4 = fixtureRun(rpgNoL4);
const noL6 = fixtureRun(rpgNoL6);
const noL7 = fixtureRun(rpgNoL7);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rpgShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const castsOf = (evs: SimEvent[], slug: string) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug);

/** Distinct frames crown's recovery consumer fired (attackDamagePct 20.99, casterIdx = crown). */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

/** Distinct frames naga's 'shielded' consumer fired (S1 coreDamagePct 85.17, casterIdx = naga). */
const nagaShieldFirings = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === NAGA &&
            b.stat === 'coreDamagePct' &&
            b.value === 85.17
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

const rpgBuffApplies = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === RPG && b.stat === stat && b.value === value
  );

// ===============================================================================================
// Fixture sanity
// ===============================================================================================
describe('fixture sanity', () => {
  it('rapunzel-pure-grace full-charges every pull and casts bursts', () => {
    const shots = rpgShots(base.events);
    const casts = castsOf(base.events, SLUG);
    expect(shots.length).toBeGreaterThan(50);
    expect(casts.length).toBeGreaterThanOrEqual(1);
    // SR = one full charge per trigger pull (helm/liberalio precedent): pin it so the
    // shotFired≈fullCharge read behind L4 is honest.
    expect(
      shots.filter((s) => s.charged).length,
      'an SR pull that is NOT a full charge would break the full-charge read'
    ).toBe(shots.length);
  });

  it('naga casts bursts too (second B2, keeps the rotation honest)', () => {
    expect(castsOf(base.events, 'naga').length).toBeGreaterThanOrEqual(1);
  });

  it('liter (the DECOY B1) casts at least once — the burstCast-vs-fullBurstEnter discriminations are live', () => {
    expect(
      castsOf(base.events, 'liter').length,
      'if liter never casts, the two-B1 keying tests below are vacuous'
    ).toBeGreaterThanOrEqual(1);
  });
});

// ===============================================================================================
// SH — the shield lines are real EVENTS (read through naga's 'shielded' consumer)
// ===============================================================================================
describe('SH — shared shields emit shield events (L1 battle-start, L2 on her burst)', () => {
  it('SH1 — L1: naga is shielded at battle start (frame 0 firing)', () => {
    const firings = nagaShieldFirings(base.events);
    expect(firings.length).toBeGreaterThan(0);
    expect(firings[0], 'the battle-start shared shield must land at frame 0').toBe(0);
  });

  it('SH2 — L2: every later firing sits exactly on one of HER burstCast frames', () => {
    const firings = nagaShieldFirings(base.events);
    const castFrames = new Set(castsOf(base.events, SLUG).map((c) => c.frame));
    const later = firings.filter((f) => f > 0);
    expect(later.length).toBeGreaterThan(0);
    for (const f of later) {
      expect(
        castFrames.has(f),
        `shield re-fire at frame ${f} has no ${SLUG} burstCast — a fullBurstEnter ` +
          'keying would leak liter\'s B1 casts, a dropped L2 would leave no re-fires'
      ).toBe(true);
    }
    // One re-shield per cast of HERS, no extras: the firing set is exactly {0} ∪ her cast frames.
    expect(new Set(firings)).toEqual(new Set([0, ...castFrames]));
  });

  it('SH3 — stripping both shield lines collapses the consumer to zero (sole source)', () => {
    expect(nagaShieldFirings(noShields.events).length).toBe(0);
  });

  it('SH4 — her permanent shield window keeps naga\'s requiresShielded burst branch live', () => {
    // Naga's burst carries TWO casterAtkPct branches: 16.18 unconditional + 31.02 requiresShielded
    // (both resolve to flat-ATK values at apply time, so read BRANCH COUNT, not the % literal).
    // With rapunzel-pure-grace's durationless (permanent) shield covering naga from frame 0, BOTH
    // branches must land on every naga cast — and stripping the shields must collapse to one.
    const nagaCasts = castsOf(base.events, 'naga');
    const branchValues = (evs: SimEvent[]) => {
      const perFrame = new Map<number, Set<number>>();
      for (const b of buffs(evs)) {
        if (b.casterIdx !== NAGA || b.stat !== 'casterAtkPct') {
          continue;
        }
        (
          perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(Math.round(b.value));
      }
      return perFrame;
    };
    const withShields = branchValues(base.events);
    expect(withShields.size).toBe(nagaCasts.length);
    for (const c of nagaCasts) {
      expect(
        withShields.get(c.frame)?.size,
        `naga cast at ${c.frame} must land BOTH burst branches while the shield window holds`
      ).toBe(2);
    }
    const stripped = branchValues(noShields.events);
    for (const c of castsOf(noShields.events, 'naga')) {
      expect(
        stripped.get(c.frame)?.size,
        'no shield window → the requiresShielded 31.02 branch must vanish'
      ).toBe(1);
    }
  });
});

// ===============================================================================================
// G — the 10.41 team buff is real AND genuinely shield-gated (L3)
// ===============================================================================================
describe('G — S1-c Attack Damage ▲10.41% is permanent, team-wide and shield-gated', () => {
  it('G1 — applies at frame 0 to ALL allies, with no expiry', () => {
    const applies = rpgBuffApplies(base.events, 'attackDamagePct', 10.41);
    expect(applies.length).toBe(TEAM.length);
    for (const b of applies) {
      expect(b.frame).toBe(0);
      expect(b.expiresFrame, 'a "continuous" line must carry no wall-clock expiry').toBeNull();
    }
    expect(new Set(applies.map((b) => b.targetIdx)).size).toBe(TEAM.length);
  });

  it('G2 — removing ONLY the shield blocks kills the buff (the gate is real, self-supplied)', () => {
    expect(rpgBuffApplies(noShields.events, 'attackDamagePct', 10.41).length).toBe(0);
  });

  it('G3 — it moves damage: carry and self both lose damage without it', () => {
    expect(noL3.totals[ADA]).toBeLessThan(base.totals[ADA]);
    expect(noL3.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
  });
});

// ===============================================================================================
// L4 — the per-full-charge self-heal: event-only, and SELF-targeted (crown-consumer pin)
// ===============================================================================================
describe('L4 — S2 self-heal is real, per-shot, and reaches NO ally', () => {
  it('crown\'s recovery consumer fires identically with and without L4 (the heal never reaches an ally)', () => {
    // Crown is the fixture's natural recovery consumer ("when recovery takes effect" → 20.99 team
    // Attack Damage). L4 targets SELF only, so it can never feed crown: an ally-widened mis-encoding
    // would add recovery firings to crown and move these frames. Her own kit carries no 'recovery'
    // trigger, so the self-recovery events are a downstream no-op — the neutrality groups (N) pin
    // that they move no damage.
    expect(crownRecoveryFrames(base.events)).toEqual(
      crownRecoveryFrames(noL4.events)
    );
    expect(crownRecoveryFrames(base.events).length).toBeGreaterThan(0);
  });
});

// ===============================================================================================
// B — burst lines: self Max HP ▲10.13% (L6, inert) + team Attack Damage ▲15.24% (L7, load-bearing)
// ===============================================================================================
describe('B — burst: L6 self Max HP (inert) and L7 team Attack Damage (load-bearing)', () => {
  const casts = castsOf(base.events, SLUG);

  it('B1 — L6: one maxHpFlat self-grant per cast, (10.13/100)×her maxHp, exactly 10s', () => {
    const l6 = buffs(base.events).filter(
      (b) => b.casterIdx === RPG && b.stat === 'maxHpFlat'
    );
    expect(l6.length).toBe(casts.length);
    const rpgMaxHp = base.res.units[RPG].maxHp;
    for (const b of l6) {
      expect(b.targetIdx, 'L6 affects self only').toBe(RPG);
      expect(b.value).toBeCloseTo((10.13 / 100) * rpgMaxHp, 6);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
    const castFrames = new Set(casts.map((c) => c.frame));
    for (const b of l6) {
      expect(
        castFrames.has(b.frame),
        'a fullBurstEnter keying would fire on liter\'s casts too'
      ).toBe(true);
    }
  });

  it('B2 — L7: every cast applies 15.24 to exactly 5 holders for exactly 10s', () => {
    const l7 = rpgBuffApplies(base.events, 'attackDamagePct', 15.24);
    expect(l7.length).toBeGreaterThan(0);
    const perFrame = new Map<number, number>();
    for (const b of l7) {
      perFrame.set(b.frame, (perFrame.get(b.frame) ?? 0) + 1);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
    for (const [frame, count] of perFrame) {
      expect(count, `frame ${frame} reached ${count} holders`).toBe(TEAM.length);
    }
    const castFrames = new Set(casts.map((c) => c.frame));
    expect(
      [...perFrame.keys()].every((f) => castFrames.has(f)),
      'L7 must be keyed to HER burstCast, not fullBurstEnter (liter is the decoy B1)'
    ).toBe(true);
    expect(perFrame.size, 'one application per cast of hers').toBe(casts.length);
  });

  it('B3 — L7 moves the carry\'s damage', () => {
    expect(noL7.totals[ADA]).toBeLessThan(base.totals[ADA]);
  });

  it('B4 — L6 is inert: removing it changes NO unit\'s damage', () => {
    expect(noL6.totals).toEqual(base.totals);
  });
});

// ===============================================================================================
// N — everything outside L3/L7 is damage-neutral (bare-weapon identity)
// ===============================================================================================
describe('N — defensive residue (shields/heal/Max HP) is byte-neutral', () => {
  // NOTE: a SOLO Burst-I unit DOES cast her burst (only a lone B3 can never complete a chain),
  // so the solo full kit carries L3 (permanent) PLUS L7's ~50% uptime (20s cd / 10s window) —
  // both are Damage-Up-bucket lifts on herself. N1a bounds the combined lift mechanically;
  // N1a-2 isolates L3 exactly by dividing it out against the noL3 solo run.
  const soloTotal = (ov: any) =>
    unitOf(
      runComp({
        slugs: [SLUG],
        bossElement: 'Iron',
        overrides: { [SLUG]: ov },
      }),
      SLUG
    ).totalDamage;

  it('N1a — solo full kit lifts her OWN damage (all allies includes the caster)', () => {
    const withKit = soloTotal(realOverride);
    const bare = soloTotal(bareWeaponOverride(SLUG));
    // L3 alone is ×1.1041; L7 uptime adds up to ~8% more — mechanical band, not a fit.
    expect(withKit / bare).toBeGreaterThan(1.1);
    expect(withKit / bare).toBeLessThan(1.25);
  });

  it('N1a-2 — solo: the L3 lift alone is exactly the Damage-Up bucket share', () => {
    // Per hit: with/without L3 the ratio is (1+d+0.1041)/(1+d), d = 0.1524 while L7 is up, 0
    // otherwise — always in [1.0907, 1.1041]. The aggregate must stay inside that band.
    const withKit = soloTotal(realOverride);
    const noL3Solo = soloTotal(rpgNoL3);
    expect(withKit / noL3Solo).toBeGreaterThan(1.09);
    expect(withKit / noL3Solo).toBeLessThan(1.105);
  });

  it('N1b — solo, bursts ON: the L3/L7-stripped kit is byte-identical to the bare weapon', () => {
    const withResidue = unitOf(
      runComp({
        slugs: [SLUG],
        bossElement: 'Iron',
        overrides: { [SLUG]: rpgNoDamageBuffs },
      }),
      SLUG
    ).totalDamage;
    const bare = unitOf(
      runComp({
        slugs: [SLUG],
        bossElement: 'Iron',
        overrides: { [SLUG]: bareWeaponOverride(SLUG) },
      }),
      SLUG
    ).totalDamage;
    expect(withResidue).toBe(bare);
    expect(withResidue).toBeGreaterThan(0);
  });

  it('N2 — bare team, bursts OFF: the residue moves NO ally damage', () => {
    const team = (rpg: any) =>
      totals(
        runComp({
          slugs: [SLUG, 'folkwang', 'claire'],
          bossElement: 'Iron',
          overrides: {
            [SLUG]: rpg,
            folkwang: bareWeaponOverride('folkwang'),
            claire: bareWeaponOverride('claire'),
          },
          cfg: { disableBursts: true },
        })
      );
    expect(team(rpgNoDamageBuffs)).toEqual(team(bareWeaponOverride(SLUG)));
  });
});

```

---

# DRIVER IMPLEMENTATION — override (src/skills/overrides/rapunzel-pure-grace.json)

```json
{
  "slug": "rapunzel-pure-grace",
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
          "kind": "shield",
          "maxHpPct": 20.59
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 20.59
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "requiresShielded": true,
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.41
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal"
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
          "stat": "targetMaxHpPct",
          "value": 10.13,
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
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 15.24,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Activates only when Full Charge is maintained for more than 1 sec while a Shield is set in front of this unit. Affects self.\nCurrent HP ▼ 2% every 1 sec continuously.\nRestores Shield HP equal to 3.16% of the skill user's final Max HP every 1 sec continuously."
    ],
    "burst": []
  },
  "caveats": [
    "skill1 SHARED SHIELDS (battle-start passive + on-burstCast re-shield): event/state only — the engine 'shield' effect carries NO shield-HP pool (v1 boss deals no damage). Each application emits a shielded event to ALL allies (fires their 'shielded' triggers, e.g. a naga-type consumer) and opens the target's shield-state window (shieldedUntilFrame); no durationSec = permanent at scope (label precedent). maxHpPct 20.59 (% of the CASTER's final Max HP) is recorded for kit-completeness only.",
    "The '■ Affects self' header on both shield lines conflicts with the body text 'shared Shield … that protects all allies' — encoded target ALLIES (the shared shield reaches every ally; self-only would be the header-echo trap and would never fire ally 'shielded' triggers).",
    "⚑ skill1 ATTACK DAMAGE ▲10.41% (all allies, 'continuously') is CALIBRATED on UPTIME, kit-literal on value/target/stat. Encoded passive (frame 0, no expiry = always-on) behind requiresShielded. The SHIELD half of the gate is real and SELF-SUPPLIED: her own battle-start shield opens her own shield window, so the gate passes at frame 0 — stripping her shield blocks kills the buff (proven in the unit spec, group G). The 'Full Charge maintained for more than 1 sec' half has NO engine primitive: her SR reaches full charge at chargeFrames 60 = exactly 1s and the sim fires at full charge, so a literal read gives ~0% in-engine uptime while real play (hold-to-aim between shots, shield self-supplied) is ~100%. ESTIMATE: ~100% real-play uptime; the always-on encoding is the upper bound and matches play. RECIPE: a rapunzel-pure-grace focus recording — compare the buff-icon uptime of the 10.41% Attack Damage grant against her shield icon. TIER: Tier-2 state gate (label 'Delusion is permanent in the no-incoming-damage sim' precedent for the always-on half).",
    "skill2 SELF-HEAL (2% of caster final Max HP per full-charge attack): trigger shotFired — SR = one full charge per trigger pull (helm/liberalio precedent), so 'attacking with Full Charge' fires once per shot. Event-only: the engine heal carries NO HP amount and the heal targets SELF — her own kit has no 'recovery' trigger, so the self-recovery events are a downstream no-op. Modeled for kit-completeness; the unit spec pins that it moves no damage (neutrality groups) and reaches NO ally (crown's recovery consumer fires identically with and without it).",
    "⚑ skill2 GATED HP-DRAIN / SHIELD-HP-RESTORE line is UNMODELED (verbatim in `unmodeled`): 'Current HP ▼ 2% every 1 sec' needs an HP pool to drain and 'Restores Shield HP equal to 3.16% …' needs a shield-HP pool — neither exists in a DPS sim (no incoming damage, shields never deplete). Defensive/damage-inert; ESTIMATE of board impact: zero damage. RECIPE: requires an HP-pool + shield-HP-pool model before it can be enacted. Deliberately NOT encoded as a repeating 1 Hz 'shield' effect — that would re-fire every ally's 'shielded' trigger once per second and massively over-credit shield-synergy teammates.",
    "burst SELF MAX HP ▲10.13% for 10s: targetMaxHpPct on self (own-Max-HP basis; label precedent), resolved by the engine to a maxHpFlat grant of (10.13/100)×her final Max HP. Offensively INERT: she has no atkOfMaxHpPct conversion and v1 has no HP pool — proven by totals-equality in the unit spec (group B4). Kit-completeness only.",
    "burst TEAM ATTACK DAMAGE ▲15.24% for 10s: her load-bearing damage line — attackDamagePct (Damage Up bucket) on all allies including self, keyed to HER OWN burstCast (never fullBurstEnter; the two-B1 fixture with liter as decoy pins the keying). The shield re-application on the same cast is a separate skill1-slot block (L2 — the line lives in the skill1 prose), matching the kit's line split.",
    "Damage footprint = exactly the two Attack Damage lines (S1 10.41% permanent gated team buff + burst 15.24% 10s team buff). Everything else (shields, self-heal, self Max HP) is defensive/event-only: the unit spec proves the residue byte-identical to the bare weapon whenever the damage lines are absent (groups N1/N2)."
  ],
  "note": "SHIELD-ARCHETYPE TANK/BUFFER (Rapunzel: Pure Grace, slug `rapunzel-pure-grace` — SR/Iron/Defender/Burst I cd 20s, ammo 6, chargeFrames 60; the OVERSPEC variant of the BASE Rapunzel `rapunzel`, RL/Iron/Supporter — a different unit). Her whole kit hangs off a self-supplied SHARED SHIELD: battle-start + on-burst shields (20.59% of caster final Max HP, event/state only, no shield-HP pool) and two Attack Damage lines — S1-c ▲10.41% to all allies 'continuously' behind the compound gate 'Shield set in front of her + Full Charge maintained >1s' (shield half encoded requiresShielded and SELF-SUPPLIED by her own battle-start shield; charge-hold half unmodelable — ⚑ CALIBRATED uptime ~100% real play, always-on upper bound, recipe = focus recording buff-icon uptime), and burst ▲15.24% to all allies for 10s. MODELED TODAY: (1) skill1 battle-start shared shield — passive → allies → shield maxHpPct 20.59 (permanent); (2) skill1 gated team Attack Damage — passive + requiresShielded → allies → attackDamagePct 10.41 (permanent); (3) skill2 per-full-charge self-heal — shotFired → self → heal (event-only, magnitude 2% of caster final Max HP NOT encoded — no HP pool; self-recovery events are a downstream no-op, her kit has no 'recovery' trigger); (4) skill1 on-burst-cast shared shield re-application — burstCast → allies → shield maxHpPct 20.59 (block lives in the skill1 slot, trigger burstCast — the kit line is skill1 prose activated by the burst); (5) burst self Max HP ▲10.13% 10s — targetMaxHpPct on self (inert: no atkOfMaxHpPct conversion, no HP pool); (6) burst team Attack Damage ▲15.24% 10s — attackDamagePct on all allies. DELIBERATELY UNMODELED (verbatim in `unmodeled`): the skill2 gated self line 'Current HP ▼ 2% every 1 sec continuously. Restores Shield HP equal to 3.16% of the skill user's final Max HP every 1 sec continuously.' — needs an HP pool to drain and a shield-HP pool to restore (⚑ zero damage impact; NOT a repeating shield effect, which would spam ally 'shielded' triggers at 1 Hz). EVIDENCE TIER: every modeled magnitude is kit-text-literal (DATAMINED); the single CALIBRATED convention is the L3 hold-condition uptime (⚑ above). Both burst-slot lines key on HER OWN burstCast, never fullBurstEnter. FAITHFULNESS CORE: the shield lines are proven real EVENTS through a naga-type 'shielded' consumer (frame-0 firing + re-fires exactly on her cast frames), the gate is proven live (strip shields → 10.41 buff vanishes), and the defensive residue is proven byte-neutral vs the bare weapon (scripts/tests/units/rapunzel-pure-grace.test.ts). Kit-autonomy gauntlet 2026-08-03."
}

```
