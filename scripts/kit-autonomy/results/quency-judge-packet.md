

---

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

# GROUND TRUTH — quency kit prose + base stats (verbatim from data/characters.json)

```json
{
 "slug": "quency",
 "name": "Quency",
 "weapon": "SMG",
 "class": "Supporter",
 "element": "Electric",
 "burst": "II",
 "burstCooldownSec": 20,
 "ammo": 120,
 "hitsPerShot": 2,
 "reloadFrames": 121,
 "rate_of_fire": 1440,
 "normalAttackMultiplier": 8.94,
 "coreAttackMultiplier": 200,
 "skillCooldownsSec": {
  "skill1": null,
  "skill2": 8,
  "burst": 20
 },
 "skills": {
  "skill1": "\u25a0 Activates after 60 normal attacks. Affects self.\nDuplicates 12.42% of the Max HP of the Nikke with the highest Max HP. Lasts for 10 sec.",
  "skill2": "\u25a0 Affects 2 ally unit(s) with the highest final ATK. \nATK \u25b2 16.11% for 5 sec.",
  "burst": "\u25a0 Affects 2 ally unit(s) with the highest final ATK. \nMax HP \u25b2 43.87% for 5 sec. \nCritical Damage \u25b2 29.9% for 10 sec."
 },
 "baseStats": {
  "hp": 15000,
  "atk": 500,
  "def": 86,
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
  "resourceId": 402
 },
 "crit": {
  "id": 140201,
  "class": "Supporter",
  "order": 10065,
  "name_code": 5078,
  "corporation": "MISSILIS",
  "resource_id": 402,
  "name_localkey": "Quency",
  "original_rare": "SSR",
  "critical_ratio": 1500,
  "category_type_1": "None",
  "category_type_2": "None",
  "category_type_3": "None",
  "critical_damage": 15000,
  "eff_category_type": "Walk",
  "eff_category_value": 0
 },
 "note": "Extracted verbatim from data/characters.json -> characters['quency']. skill values are lvl 10/10/10."
}
```

---

# S2b — ADVERSARIAL TEST-FAITHFULNESS REVIEW (fable; includes driverReconciliation)

```json
{
  "slug": "quency",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Activates after 60 normal attacks",
      "disposition": "GAP",
      "scope": "trigger counts the owner's normal attacks only; effect is a self Max-HP grant (no damage scope)",
      "durationSemantics": "'Lasts for 10 sec' = durationSec 10 (wall-clock, not rounds)",
      "triggerIdentity": "hitCount count:60 \u2014 counts ROUNDS per the harness contract. Ammo 120 => fires ~2x per magazine, spanning reloads. hitsPerShot 2 is a trap: 60 'normal attacks' is 60 rounds, not 60 per-hit events (which would halve the threshold to 30 rounds) and not an interval-seconds clock.",
      "targetSet": "self only ('Affects self') \u2014 the highest-Max-HP Nikke is the SOURCE of the % scaling, never a target",
      "nearestWrongModel": "Three plausible misreads: (a) encode as a heal, which would falsely fire teammates' recovery triggers (Crown-style consumers); (b) casterMaxHpPct = % of QUENCY's own Max HP instead of the highest-Max-HP ally's (schema has no highest-ally-HP source \u2014 highestAllyAtkPct has no HP analog, hence GAP); (c) trigger read per-hit so hitsPerShot 2 doubles the cadence.",
      "distinguishingAssertion": "Patch the skill1 block out via withPatchedOverride(quency): totals(res) identical for all 5 slugs (offensive inertness \u2014 quency has no atkOfMaxHpPct consumer, and the e3 rule makes HP grants feed conversion only when caster===target===HP-scaler carrier, which never holds here). If modeled as a buff: buffApply stat 'maxHpFlat' targeting self recurs every 60 rounds fired (cross-check against shot events), expiresFrame = applyFrame + 600, and ZERO 'heal' events / recovery-trigger activations are attributable to it.",
      "inertness": "Every unit's totalDamage unchanged with the line present vs removed; no recovery or shielded trigger of any teammate fires from it; no burst-gauge contribution.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "ATK \u25b2 16.11% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "generic atkPct (scales target's own ATK) \u2014 no normal-attack/charge/crit scoping in the text; NOT casterAtkPct (no 'of the skill user's ATK' wording)",
      "durationSemantics": "durationSec 5 \u2014 wall-clock seconds, not rounds",
      "triggerIdentity": "The header has NO activation clause ('Affects\u2026' only) => interval trigger at the unit's datamined skill cooldown, first fire t=CD (no force-cast wording). The interval seconds are NOT in the kit text \u2014 \u2691/DATAMINED from skillCooldownsSec, never invented.",
      "targetSet": "alliesTopAtk count:2, byFinalAtk:true \u2014 text literally says 'highest final ATK', which is the sole sanctioned condition for live-effectiveAtk ranking. No '(except self)' clause, so the candidate pool includes quency herself.",
      "nearestWrongModel": "Passive/permanent always-on ATK buff (100% uptime instead of 5s-per-CD windows) \u2014 the natural read of a trigger-less header; second-nearest: keyed to fullBurstEnter, or static base-ATK ranking (dropping byFinalAtk).",
      "distinguishingAssertion": "Collect buffApply events with stat 'atkPct' and value 16.11: they recur at a fixed interval cadence (count over 180s \u2248 floor(180/CD), NOT one continuous application from frame 0, NOT aligned 1:1 with fullBurstStart events); each carries expiresFrame = applyFrame + 300; each application hits exactly 2 targetIdx, and in a fixture where a patched low-static unit carries a huge self atkPct buff, the target set follows LIVE final-ATK ranking, not static.",
      "inertness": "Never more than 2 recipients per application; no atkPct 16.11 buff live outside the 5-second windows; the buff must not appear on frames before the first CD elapses.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Max HP \u25b2 43.87% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "generic Max HP stat grant \u2014 'Max HP \u25b2 X%' = targetMaxHpPct (% of the TARGET's OWN Max HP, blanc/maiden pattern), emitted as flat-resolved stat 'maxHpFlat'",
      "durationSemantics": "durationSec 5 \u2014 DIFFERENT from the sibling crit-damage line's 10s; one shared block duration cannot express both",
      "triggerIdentity": "burstCast (quency's OWN Burst II cast, cd 20s) \u2014 this is her burst block, so it fires only on rotations SHE bursts, never on every team Full Burst",
      "targetSet": "alliesTopAtk count:2, byFinalAtk:true (same 'highest final ATK' clause as skill2; pool includes self)",
      "nearestWrongModel": "casterMaxHpPct (% of QUENCY's Max HP instead of each target's own), or fullBurstEnter keying, or copying the 10s duration from the crit line onto this one.",
      "distinguishingAssertion": "buffApply stat 'maxHpFlat' at quency's burst-cast frames with value = 0.4387 \u00d7 the TARGET's own Max HP (differs per target when their HP differs) and expiresFrame = castFrame + 300, while the same cast's critDamagePct apply shows expiresFrame = castFrame + 600 \u2014 the 300 vs 600 split is the assertion.",
      "inertness": "Ally-granted Max HP feeds NO teammate's atkOfMaxHpPct conversion (e3 rule): totals(res) for every unit unchanged with this effect removed \u2014 the test pins that it is emitted AND damage-inert.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Critical Damage \u25b2 29.9% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "unscoped critDamagePct \u2014 applies to the recipients' crit hits generally (no 'of normal attacks' scoping in the text)",
      "durationSemantics": "durationSec 10 \u2014 the LONGER of the two burst durations; expires 5s after the Max-HP grant does",
      "triggerIdentity": "burstCast (own B2), NOT fullBurstEnter. This is the line where the misread actually moves damage: keying to fullBurstEnter over-credits every rotation where the OTHER Burst II unit (crown, present in the control fixture) completes the chain instead of quency.",
      "targetSet": "alliesTopAtk count:2, byFinalAtk:true \u2014 with the B3 carry focused, the intended payload is the carry's crit damage",
      "nearestWrongModel": "fullBurstEnter keying (fires on ANY team FB \u2014 in the liter/crown/quency/helm control comp, crown and quency contend for the B2 slot, so this doubles-or-worse the uptime); second-nearest: 5s duration copied from the Max-HP sibling; third: all-allies target.",
      "distinguishingAssertion": "In controlComp(quency) \u2014 which naturally contains crown as a competing Burst II \u2014 every buffApply with stat 'critDamagePct' value 29.9 occurs on a frame where a burstCast event from quency's slot (srcSlot/casterIdx = quency) fired that rotation; rotations where crown cast B2 show ZERO such applies. expiresFrame = castFrame + 600. Exactly 2 targetIdx per cast, and the carry (top final ATK) is always among them.",
      "inertness": "No critDamagePct 29.9 application on Full Bursts quency did not burst into; the 3rd-and-lower final-ATK units never receive it; removing it must lower the carry's totalDamage (positive-control: the line is NOT inert).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill2:ATK \u25b2 16.11% for 5 sec",
    "burst:Max HP \u25b2 43.87% for 5 sec",
    "burst:Critical Damage \u25b2 29.9% for 10 sec"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Duplicates 12.42% of the Max HP of the Nikke with the highest Max HP. Lasts for 10 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in descending damage impact: (1) BURST TRIGGER \u2014 burstCast vs fullBurstEnter is live for quency because the control fixture keeps crown as a fixed Burst II, so the two units contend for the B2 cast; a fullBurstEnter encoding is green in any single-B2 comp and only fails when the second B2 is present \u2014 the test MUST use the crown-contention comp. (2) SKILL2 TRIGGER INVENTION \u2014 the header has no activation clause; the tempting encodings are passive (over-credits uptime from 5s-per-CD to 100%) or fullBurstEnter. Faithful is interval at the datamined skill CD, first fire t=CD; that CD is outside the kit text and must be sourced/flagged (\u2691 if the datamine lacks it), never guessed silently. (3) SPLIT DURATIONS \u2014 the burst's two effects expire at +5s and +10s respectively; a single-durationSec block is wrong for one of them, and the 300-frame vs 600-frame expiresFrame split is directly assertable off buffApply (do NOT expect buffRemove on natural lapse \u2014 the engine only emits it for removeOnReload). (4) 'FINAL ATK' \u2014 both target clauses literally say 'highest final ATK', mandating byFinalAtk:true (live effectiveAtk ranking); the shared prior from plain-'highest ATK' kits (naga) is static ranking. Caveat for target assertions: in the control comp the non-carry pool is largely same-class (two Supporters at equal static ATK), so build the ranking-flip assertion with a patched buff rather than relying on class-static separation, and pin the tie-break behavior observed rather than assuming one. (5) SKILL1 COUNTER \u2014 hitCount counts ROUNDS; hitsPerShot 2 tempts a per-hit read that doubles the proc rate (count 30). The skill1 effect itself has no engine primitive for 'highest-Max-HP ally' as a % source (highestAllyAtkPct has no HP analog) \u2014 since it is provably damage-inert here, verbatim unmodeled with an inertness pin is the honest disposition; if the driver instead modeled it as an approximate self maxHpFlat buff, the test must additionally pin that it emits no heal/recovery events. (6) NEGATIVE SPACE \u2014 quency's kit has NO damage line, NO DoT, NO weapon-state modifier, and no burst-gauge effect: her entire board contribution flows through recipients' stats, so every test should be event-log + recipient-totals shaped; any sim damage attributed to quency beyond her own SMG normals is itself a red flag.",
  "model": "claude-fable-5",
  "driverReconciliation": {
    "verdict": "GO (cross-family corroborated at S2b): blind fable spec == driver encoding on all three damage-relevant lines; no REAL-GOTCHA; one inert-line modeling divergence (S1) documented; fable's one engine-contract claim (hitCount=rounds) verified INCORRECT against sim.ts:3782.",
    "convergence": "3/3 load-bearing lines converge exactly. S2: interval sec:8 (first fire t=CD), atkPct 16.11 (NOT casterAtkPct), durationSec 5, alliesTopAtk count:2 byFinalAtk:true, pool self-inclusive \u2014 fable and driver identical, including the \u2691 that the 8s CD is datamined (skillCooldownsSec) not prose. Burst Critical Damage: burstCast (own B2), critDamagePct 29.9, durationSec 10, alliesTopAtk count:2 byFinalAtk:true \u2014 identical. Burst Max HP: targetMaxHpPct 43.87 durationSec 5 on the SAME block as the crit line (per-effect durationSec \u2192 the 300-vs-600-frame expiresFrame split fable's distinguishingAssertion predicts is exactly what the shipped block emits and the test pins) \u2014 identical, and both agree it is damage-INERT via the e3 ally-granted-maxHpFlat rule (driver test pins inertness: strip-whole-burst == strip-crit-only).",
    "burstCastVsFullBurstEnter": "ACCEPTED + ENACTED. Fable's note (1) correctly observed the driver's primary (sole-B2) fixture cannot separate burstCast from fullBurstEnter. Driver added a second crown-contention arm (liter/crown/quency/helm): crown wins the B2 slot by priority, quency casts ZERO while 5 Full Bursts occur; shipped burstCast fires 0 crit buffs there, a fullBurstEnter counterfactual fires 10 (5 FB x 2 targets). Pinned GREEN (shipped==0) and RED (fullBurstEnter>0). This is the Tier-2 trigger-identity discrimination.",
    "skill1Modeling": "CONVERGED (inert line, resolved after the S5 run). Fable dispositioned S1 GAP/unmodeled; the driver FIRST modeled it as the shield primitive. Running the S5 blind test exposed that BOTH blind opus passes (S5 test + S6 override) independently re-derived S1 as a SELF Max-HP buff, and a shield emits NO buffApply so the blind suite could not see it. Final disposition: hitCount-60 self casterMaxHpPct 12.42 dur 10 \u2014 a temporary self HP-buffer, faithful to every observable the engine models (v1 can consume neither a shield pool nor an ally-scaled HP source, so shield-vs-maxHp is sim-indistinguishable). It is DAMAGE-INERT (no atkOfMaxHpPct consumer, no damage-taken) but OBSERVABLE, so the driver spec NOW pins it (trigger/cadence/self-target/10s/inertness). Residual basis \u2691: kit source is the HIGHEST-Max-HP ally; no StatKey expresses an ally-scaled HP source, so casterMaxHpPct resolves to % of quency's OWN Max HP (exact only when she holds the team's highest Max HP; inert either way \u2014 completeness gap, not accuracy).",
    "hitCountContract": "FABLE INCORRECT, driver verified. Fable asserted hitCount 'counts ROUNDS per the harness contract'. The engine increments the hitCount counter by hitsPerShot PER PULL (sim.ts:3782 `c = (u.hitCounters.get(key)??0) + u.char.hitsPerShot`), i.e. it counts HITS. For quency (hitsPerShot 2) count 60 = 60 hits = 30 pulls, matching the driver's encoding and the escape-queen precedent. The residual is only the game-side hits-vs-pulls reading of '60 normal attacks' (count 60 vs 120), already flagged \u2691 and inert (S1 moves no damage).",
    "blindTestRun": "S5 blind test (opus) run vs the driver override: 23 passed / 3 it.skip (the skill1 basis GAP + the two hits-vs-pulls / no-activation-clause FLAGs). Two blind-author errors were reconciled, both documented in quency.adapted.test.ts: (1) FIXTURE \u2014 controlComp('quency') fields crown as a second B2 and crown out-prioritizes quency, so quency casts ZERO times there and the whole burst suite would be vacuous; adapted to a sole-B2 fixture (liter/quency/emilia/helm) so quency casts every cycle (a fixture correction, assertions unchanged). (2) S1 primitive \u2014 see skill1Modeling. Separately, the S6 blind OVERRIDE carried an S2 error (interval sec:20 \u2014 it lacked/mis-sourced the 8s skill cooldown); the DRIVER keeps interval sec:8 from skillCooldownsSec.skill2=8 (datamined, corroborated by fable S2b), so the blind override was NOT copied \u2014 S5/S6 inform, the datamine + driver spec govern."
  }
}
```

---

# S5 — BLIND POST-OP TEST-WRITER (opus) + convergence runs

## S5 convergence vs the driver's SHIPPED override (run 2026-08-03)

Two runs are reported. The ONLY adaptation between them is the FIXTURE (see below); every assertion is identical.

- **RAW (as authored, `quency.test.ts`; import path corrected, fixture = controlComp('quency')):** 18 passed / 5 failed / 3 skipped.
  ALL 5 failures are FIXTURE-ONLY, not encoding divergences: in controlComp('quency') the fixed `crown` is a second
  Burst II and out-prioritizes quency, so quency's burstCast count is ZERO and every burst-slot assertion that needs a
  cast (`critGroups(...)`) is starved. The failing set is exactly: 'quency actually casts her own burst' + the four
  burst assertions that read critGroups. Every S1, S2, and STRUCTURAL burst assertion (burstCast trigger, targetMaxHpPct
  43.87/5s, critDamagePct 29.9/10s, 2-target scope, inertness, whole-kit shape) passes RAW against the shipped override.
- **ADAPTED (`quency.adapted.test.ts`; sole-B2 fixture liter/quency/emilia/helm so quency casts every cycle):** 23 passed / 3 skipped (GREEN).
  Adaptations, both documented in-file: (a) fixture — sole-B2 so quency casts (assertions unchanged); (b) NONE on the
  S1 primitive — the S1 suite passes as-written because the driver CONVERGED S1 to the blind's self-Max-HP-buff reading
  (casterMaxHpPct 12.42/10s, hitCount 60 self) before the S7 run.

So the one real driver-vs-blind divergence (S1 shield vs self-Max-HP-buff) was resolved by the DRIVER converging to the
blind reading; the residual raw failures are a blind-author fixture choice, classified RECON_ERROR(fixture), not a
faithfulness finding. The 3 skips are the blind's own it.skip GAP/FLAGs (S1 highest-ally HP basis; '60 normal attacks'
hits-vs-pulls; S2 clause-less cadence is datamined).

## quency.test.ts (RAW, as authored)

```ts
/**
 * quency (Quency) — SMG / Electric / Supporter / Burst II — BLIND kit spec test (S5).
 *
 * EXACT-SLUG GUARD: this is `quency` (SMG/Electric/Supporter/Burst II), NOT
 * `quency-escape-queen`. Burst stage II is taken from the packet's base stats.
 *
 * KIT (structure; prose quoted <=40 chars):
 *   skill1  "Activates after 60 normal attacks." Affects self.
 *           Duplicates 12.42% of the Max HP of the highest-Max-HP Nikke, 10 sec.
 *   skill2  Affects 2 ally unit(s) with the highest final ATK — ATK ▲ 16.11%, 5 sec.
 *   burst   Affects 2 ally unit(s) with the highest final ATK —
 *           Max HP ▲ 43.87% for 5 sec ; Critical Damage ▲ 29.9% for 10 sec.
 *
 * Quency carries ZERO damage lines. Every assertion below is buff identity, target
 * set, duration, or INERTNESS; any damage her override produces is invented (the
 * whole-kit block asserts no damage-producing effect kind exists in any slot).
 *
 * FIXTURE: controlComp('quency', true) — liter (B1) / crown (B2) / quency / helm (B3).
 *   Quency is Burst II and shares the stage-2 slot with crown, so she casts only on
 *   rotations where crown is on cooldown. The burst suite therefore OPENS with an
 *   explicit non-vacuity assertion that her burst fired at all; if that fails the
 *   fixture, not the override, is the finding.
 *
 * DURATIONS are read off buffApply.expiresFrame — the engine emits NO buffRemove on
 * natural time-lapse. Two techniques:
 *   - RELATIVE: Critical Damage (10 s) and Max HP (5 s) leave the SAME cast frame, so
 *     expiresFrame(crit) - expiresFrame(hp) must be exactly 300 frames. Authoring both
 *     at 10 s (or both at 5 s) collapses the delta -> RED.
 *   - ABSOLUTE: re-run with the duration patched by +D and require the FIRST apply's
 *     expiresFrame to move by exactly D*60. A wrong authored duration shifts the
 *     baseline and breaks the delta. Every patched run is damage-only, so the rotation
 *     timeline (gauge is per-shot, damage-independent) is byte-identical.
 *
 * SHAPE NOTE: the packet documents two CONFLICTING override shapes (slot -> Block[]
 * vs slot -> { blocks: Block[] }). blocksOf() resolves either, and all mutation is
 * in-place on nested objects, so the counterfactuals hold under both shapes.
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

/* eslint-disable @typescript-eslint/no-explicit-any */

const SLUG = 'quency';
const FPS = 60;

// Both caster- and target-scaled Max HP grants surface as flat HP on buffApply.
const HP_STATS = new Set([
  'maxHpFlat',
  'maxHpPct',
  'casterMaxHpPct',
  'targetMaxHpPct',
]);

const DAMAGE_KINDS = new Set([
  'flatDamage',
  'dot',
  'hitRepeat',
  'storedHit',
  'stackedNuke',
  'weaponSwap',
]);

type Ev = SimEvent & Record<string, any>;
type Opts = ReturnType<typeof controlComp>;

function run(opts: Opts) {
  const events: Ev[] = [];
  const o = opts as any;
  const res = runComp({
    ...o,
    cfg: { ...(o.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  } as any);
  return { res, events };
}

/** Resolves a slot to its Block[] under EITHER documented override shape. */
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}

const allBlocks = (ov: any): any[] =>
  ([] as any[]).concat(
    blocksOf(ov, 'skill1'),
    blocksOf(ov, 'skill2'),
    blocksOf(ov, 'burst'),
  );

function compWith(mutate: (ov: any) => void): Opts {
  const ov = withPatchedOverride(SLUG, mutate as any);
  const b = controlComp(SLUG, true) as any;
  return { ...b, overrides: { ...(b.overrides ?? {}), [SLUG]: ov } } as Opts;
}

/** Untouched clone of the committed override (withPatchedOverride never writes disk). */
const OV: any = withPatchedOverride(SLUG, () => {});

function setBuffDuration(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pick: (e: any) => boolean,
  sec: number,
) {
  for (const b of blocksOf(ov, slot))
    for (const e of b.effects ?? [])
      if (e.kind === 'buff' && pick(e)) e.durationSec = sec;
}

function dropEffects(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pick: (e: any) => boolean,
) {
  for (const b of blocksOf(ov, slot))
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e: any) => !pick(e));
}

const applies = (evs: Ev[]) => evs.filter((e) => e.kind === 'buffApply');

const withStat = (evs: Ev[], stat: string, value?: number) =>
  applies(evs).filter(
    (e) =>
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) < 1e-6),
  );

// casterIdx === null AND targetIdx === null are boss-held debuffs — excluded.
const hpApplies = (evs: Ev[]) =>
  applies(evs).filter((e) => HP_STATS.has(String(e.stat)) && e.casterIdx !== null);

/** skill1 is the kit's ONLY self-targeted Max HP grant. */
const selfHpApplies = (evs: Ev[]) =>
  hpApplies(evs).filter((e) => e.targetSlug === SLUG);

function groupBy(xs: Ev[], key: (e: Ev) => string): Ev[][] {
  const m = new Map<string, Ev[]>();
  for (const x of xs) {
    const k = key(x);
    const g = m.get(k);
    if (g) g.push(x);
    else m.set(k, [x]);
  }
  return [...m.values()];
}

const targetsOf = (g: Ev[]) => g.map((e) => String(e.targetSlug)).sort();

// Critical Damage 29.9% is unique to quency's burst — one group per cast
// (all targets of a cast share the same expiresFrame).
const critGroups = (evs: Ev[]) =>
  groupBy(withStat(evs, 'critDamagePct', 29.9), (e) => String(e.expiresFrame));

const s2Groups = (evs: Ev[]) =>
  groupBy(withStat(evs, 'atkPct', 16.11), (e) => String(e.expiresFrame));

const teamTotal = (res: any) =>
  Object.values(totals(res)).reduce((a: number, b: any) => a + Number(b), 0);

// ---------------------------------------------------------------- hoisted runs (9)
const base = run(controlComp(SLUG, true));

const s1Dur20 = run(
  compWith((ov) => setBuffDuration(ov, 'skill1', (e) => HP_STATS.has(e.stat), 20)),
);
const s1Count120 = run(
  compWith((ov) => {
    for (const b of blocksOf(ov, 'skill1'))
      if (b.trigger && typeof b.trigger.count === 'number') b.trigger.count = 120;
  }),
);
const s1Gone = run(compWith((ov) => dropEffects(ov, 'skill1', () => true)));

const s2Dur10 = run(
  compWith((ov) => setBuffDuration(ov, 'skill2', (e) => e.stat === 'atkPct', 10)),
);
const s2Zero = run(
  compWith((ov) => {
    for (const b of blocksOf(ov, 'skill2'))
      for (const e of b.effects ?? [])
        if (e.kind === 'buff' && e.stat === 'atkPct') e.value = 0;
  }),
);

const bCritDur15 = run(
  compWith((ov) =>
    setBuffDuration(ov, 'burst', (e) => e.stat === 'critDamagePct', 15),
  ),
);
const bCritGone = run(
  compWith((ov) =>
    dropEffects(ov, 'burst', (e) => e.kind === 'buff' && e.stat === 'critDamagePct'),
  ),
);
const bHpGone = run(
  compWith((ov) =>
    dropEffects(ov, 'burst', (e) => e.kind === 'buff' && HP_STATS.has(e.stat)),
  ),
);

describe('quency — fixture sanity (non-vacuity)', () => {
  it('quency fires her SMG in the control comp (skill1 hit counter can accrue)', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('quency actually casts her own burst despite sharing stage 2 with crown', () => {
    // If this is 0 every burst-slot assertion below would be vacuous.
    expect(critGroups(base.events).length).toBeGreaterThanOrEqual(1);
  });
});

describe('quency skill1 — "Activates after 60 normal attacks", self, 10 sec', () => {
  it('is a SELF-targeted hitCount:60 block (not an interval/passive, not ally-scoped)', () => {
    const bs = blocksOf(OV, 'skill1');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      expect(b.target?.kind).toBe('self');
      expect(b.trigger?.kind).toBe('hitCount');
      expect(b.trigger?.count).toBe(60);
    }
  });

  it('grants 12.42% Max HP for 10 sec (magnitude + duration authored literally)', () => {
    const hp = blocksOf(OV, 'skill1')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && HP_STATS.has(e.stat));
    expect(hp.length).toBe(1);
    expect(hp[0].value).toBeCloseTo(12.42, 6);
    expect(hp[0].durationSec).toBe(10);
  });

  it('re-fires many times over the fight (nearest-wrong: a one-shot passive)', () => {
    // A `passive` self-grant applies once at frame 0; a hit-count trigger on a
    // 120-round SMG re-applies dozens of times across 180 s.
    expect(selfHpApplies(base.events).length).toBeGreaterThanOrEqual(3);
  });

  it('the threshold is 60 hits — doubling it to 120 halves the activations', () => {
    const a = selfHpApplies(base.events).length;
    const b = selfHpApplies(s1Count120.events).length;
    expect(b).toBeGreaterThanOrEqual(1);
    expect(a).toBeGreaterThan(b);
    // Nearest-wrong count:120 ("attacks" read as trigger pulls) would make `a` equal `b`.
    expect(Math.abs(a - 2 * b)).toBeLessThanOrEqual(3);
  });

  it('lasts exactly 10 sec (first apply expiresFrame shifts by 600f when patched to 20 s)', () => {
    const b0 = selfHpApplies(base.events)[0];
    const p0 = selfHpApplies(s1Dur20.events)[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number.isFinite(Number(b0.expiresFrame))).toBe(true);
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(10 * FPS);
  });

  it('is damage-INERT — quency has no HP->ATK consumer, so removing it moves nothing', () => {
    // RED if the grant were mis-encoded as an ATK/damage buff, or if it leaked into
    // any damage bucket. Teammates must be byte-identical too.
    expect(totals(s1Gone.res)).toEqual(totals(base.res));
  });

  it.skip('GAP: basis is "the Nikke with the highest Max HP", not the caster — no StatKey exists', () => {
    // The schema has highestAllyAtkPct for ATK but NO highest-ally Max HP analogue.
    // caster/targetMaxHpPct on a self target is exact ONLY when quency herself holds
    // the team's highest Max HP. Unassertable without the missing primitive.
  });

  it.skip('FLAG: "60 normal attacks" — rounds vs trigger pulls (hitsPerShot 2)', () => {
    // Engine convention: hitCount counts ROUNDS, so 60 = half a 120-round magazine
    // (30 pulls). If the kit means 60 PULLS the threshold is 120. Not prose-decidable.
  });
});

describe('quency skill2 — 2 highest-final-ATK allies, ATK ▲ 16.11% for 5 sec', () => {
  it('targets exactly 2 allies ranked by FINAL ATK, self not excluded', () => {
    const bs = blocksOf(OV, 'skill2');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      expect(b.target?.kind).toBe('alliesTopAtk');
      expect(b.target?.count).toBe(2);
      // Kit says "highest FINAL ATK" literally -> live-ATK ranking (A3 rule).
      expect(b.target?.byFinalAtk).toBe(true);
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('is a plain ATK% buff, NOT a caster-scaled flat ATK grant', () => {
    const raw = withStat(base.events, 'atkPct', 16.11);
    expect(raw.length).toBeGreaterThanOrEqual(2);
    const qIdx = critGroups(base.events)[0]?.[0]?.casterIdx;
    const flat = applies(base.events).filter(
      (e) =>
        e.casterIdx === qIdx &&
        (e.stat === 'casterAtkPct' || e.stat === 'highestAllyAtkPct'),
    );
    // casterAtkPct/highestAllyAtkPct re-emit as a FLAT ATK number; the kit line has no
    // "of the skill user's ATK" wording, so quency must emit none.
    expect(flat).toEqual([]);
  });

  it('hits exactly 2 distinct allies per activation and repeats over the fight', () => {
    const gs = s2Groups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(2); // rules out a one-shot/passive encoding
    for (const g of gs) {
      expect(g.length).toBe(2);
      expect(new Set(targetsOf(g)).size).toBe(2); // RED under target {kind:'allies'} (4 units)
    }
  });

  it('lasts exactly 5 sec (first apply expiresFrame shifts by 300f when patched to 10 s)', () => {
    const b0 = s2Groups(base.events)[0]?.[0];
    const p0 = s2Groups(s2Dur10.events)[0]?.[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(5 * FPS);
  });

  it('the ATK buff actually moves team damage (zeroing it strictly lowers the total)', () => {
    expect(teamTotal(base.res)).toBeGreaterThan(teamTotal(s2Zero.res));
  });

  it.skip('FLAG: skill2 carries NO activation clause — cadence is outside the prose', () => {
    // No "Activates when/after ..." text. Repo convention for a clause-free skill line
    // is interval{sec: datamined skill cooldown}, and that cooldown is NOT in this
    // packet (the given "cd 20s" is the BURST cooldown). Trigger identity and cadence
    // are therefore a ⚑ — measurement/datamine-gated, not blind-assertable.
  });
});

describe('quency burst — 2 highest-final-ATK allies: Max HP ▲ 43.87%/5s, Crit DMG ▲ 29.9%/10s', () => {
  it('fires on her OWN burst cast and targets the same 2 highest-final-ATK allies', () => {
    const bs = blocksOf(OV, 'burst');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      // Nearest-wrong: fullBurstEnter — it would fire on rotations another stage-2/3
      // unit completes, over-crediting a burst quency never cast.
      expect(b.trigger?.kind).toBe('burstCast');
      expect(b.target?.kind).toBe('alliesTopAtk');
      expect(b.target?.count).toBe(2);
      expect(b.target?.byFinalAtk).toBe(true);
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('encodes "Max HP ▲ 43.87%" as the TARGET\'s own Max HP, not the caster\'s', () => {
    const eff = blocksOf(OV, 'burst')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && HP_STATS.has(e.stat));
    expect(eff.length).toBe(1);
    // "Max HP ▲ X%" is targetMaxHpPct per the schema; casterMaxHpPct is the
    // "X% of the skill user's Max HP" wording, which this line does not use.
    expect(eff[0].stat).toBe('targetMaxHpPct');
    expect(eff[0].value).toBeCloseTo(43.87, 6);
    expect(eff[0].durationSec).toBe(5);
  });

  it('grants Critical Damage ▲ 29.9% for 10 sec to exactly 2 distinct allies per cast', () => {
    const gs = critGroups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(1);
    for (const g of gs) {
      expect(g.length).toBe(2);
      expect(new Set(targetsOf(g)).size).toBe(2);
    }
    const eff = blocksOf(OV, 'burst')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && e.stat === 'critDamagePct');
    expect(eff.length).toBe(1);
    expect(eff[0].durationSec).toBe(10);
  });

  it('the two riders carry DIFFERENT windows: Max HP expires 300f before Crit DMG', () => {
    // Both leave the same cast frame, so expiresFrame(crit) - expiresFrame(hp) = 300.
    // RED under the common nearest-wrong of giving both riders one shared duration.
    const hp = hpApplies(base.events);
    const gs = critGroups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(1);
    for (const g of gs) {
      const want = Number(g[0].expiresFrame) - 5 * FPS;
      const batch = hp.filter((e) => Number(e.expiresFrame) === want);
      expect(batch.length).toBe(2);
      expect(targetsOf(batch)).toEqual(targetsOf(g)); // same 2 allies as the crit rider
    }
  });

  it('Critical Damage runs exactly 10 sec (patching to 15 s shifts expiry by 300f)', () => {
    const b0 = critGroups(base.events)[0]?.[0];
    const p0 = critGroups(bCritDur15.events)[0]?.[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(5 * FPS);
  });

  it('the Critical Damage rider actually moves team damage', () => {
    expect(teamTotal(base.res)).toBeGreaterThan(teamTotal(bCritGone.res));
  });

  it('the ally Max HP grant is damage-INERT (ally-granted Max HP feeds no ATK conversion)', () => {
    expect(totals(bHpGone.res)).toEqual(totals(base.res));
  });
});

describe('quency — whole-kit shape', () => {
  it('authors all three slots', () => {
    expect(blocksOf(OV, 'skill1').length).toBeGreaterThanOrEqual(1);
    expect(blocksOf(OV, 'skill2').length).toBeGreaterThanOrEqual(1);
    expect(blocksOf(OV, 'burst').length).toBeGreaterThanOrEqual(1);
  });

  it('invents NO damage: the kit has zero damage lines, so no damage-producing effect exists', () => {
    const bad = allBlocks(OV)
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => DAMAGE_KINDS.has(String(e.kind)))
      .map((e: any) => e.kind);
    expect(bad).toEqual([]);
  });

  it('carries no ignored/unsupported effect blocks (skips belong in `note`/`unmodeled`)', () => {
    const bad = allBlocks(OV)
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'ignored' || e.kind === 'unsupported')
      .map((e: any) => e.kind);
    expect(bad).toEqual([]);
  });
});

```

## quency.adapted.test.ts (fixture-adapted; 23 pass / 3 skip)

```ts
/**
 * quency (Quency) — SMG / Electric / Supporter / Burst II — BLIND kit spec test (S5).
 *
 * EXACT-SLUG GUARD: this is `quency` (SMG/Electric/Supporter/Burst II), NOT
 * `quency-escape-queen`. Burst stage II is taken from the packet's base stats.
 *
 * KIT (structure; prose quoted <=40 chars):
 *   skill1  "Activates after 60 normal attacks." Affects self.
 *           Duplicates 12.42% of the Max HP of the highest-Max-HP Nikke, 10 sec.
 *   skill2  Affects 2 ally unit(s) with the highest final ATK — ATK ▲ 16.11%, 5 sec.
 *   burst   Affects 2 ally unit(s) with the highest final ATK —
 *           Max HP ▲ 43.87% for 5 sec ; Critical Damage ▲ 29.9% for 10 sec.
 *
 * Quency carries ZERO damage lines. Every assertion below is buff identity, target
 * set, duration, or INERTNESS; any damage her override produces is invented (the
 * whole-kit block asserts no damage-producing effect kind exists in any slot).
 *
 * FIXTURE: controlComp('quency', true) — liter (B1) / crown (B2) / quency / helm (B3).
 *   Quency is Burst II and shares the stage-2 slot with crown, so she casts only on
 *   rotations where crown is on cooldown. The burst suite therefore OPENS with an
 *   explicit non-vacuity assertion that her burst fired at all; if that fails the
 *   fixture, not the override, is the finding.
 *
 * DURATIONS are read off buffApply.expiresFrame — the engine emits NO buffRemove on
 * natural time-lapse. Two techniques:
 *   - RELATIVE: Critical Damage (10 s) and Max HP (5 s) leave the SAME cast frame, so
 *     expiresFrame(crit) - expiresFrame(hp) must be exactly 300 frames. Authoring both
 *     at 10 s (or both at 5 s) collapses the delta -> RED.
 *   - ABSOLUTE: re-run with the duration patched by +D and require the FIRST apply's
 *     expiresFrame to move by exactly D*60. A wrong authored duration shifts the
 *     baseline and breaks the delta. Every patched run is damage-only, so the rotation
 *     timeline (gauge is per-shot, damage-independent) is byte-identical.
 *
 * SHAPE NOTE: the packet documents two CONFLICTING override shapes (slot -> Block[]
 * vs slot -> { blocks: Block[] }). blocksOf() resolves either, and all mutation is
 * in-place on nested objects, so the counterfactuals hold under both shapes.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed: blind/ sits under kit-autonomy/, not tests/units/

/* eslint-disable @typescript-eslint/no-explicit-any */

const SLUG = 'quency';
const FPS = 60;

// ADAPTED FIXTURE (2026-08-03): controlComp('quency', true) fields crown as a second Burst II,
// and crown out-prioritizes quency for the B2 cast — quency casts ZERO times there, so every
// burst-slot assertion would be vacuous. Field quency as the SOLE B2 (liter B1 / quency B2 /
// emilia B3 / helm B3) so she casts every Full Burst cycle. This is a fixture correction, not a
// change to what is asserted.
function fixtureComp(): Opts {
  return {
    slugs: ['liter', 'quency', 'emilia', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'emilia',
  } as Opts;
}

// Both caster- and target-scaled Max HP grants surface as flat HP on buffApply.
const HP_STATS = new Set([
  'maxHpFlat',
  'maxHpPct',
  'casterMaxHpPct',
  'targetMaxHpPct',
]);

const DAMAGE_KINDS = new Set([
  'flatDamage',
  'dot',
  'hitRepeat',
  'storedHit',
  'stackedNuke',
  'weaponSwap',
]);

type Ev = SimEvent & Record<string, any>;
type Opts = ReturnType<typeof controlComp>;

function run(opts: Opts) {
  const events: Ev[] = [];
  const o = opts as any;
  const res = runComp({
    ...o,
    cfg: { ...(o.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  } as any);
  return { res, events };
}

/** Resolves a slot to its Block[] under EITHER documented override shape. */
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}

const allBlocks = (ov: any): any[] =>
  ([] as any[]).concat(
    blocksOf(ov, 'skill1'),
    blocksOf(ov, 'skill2'),
    blocksOf(ov, 'burst'),
  );

function compWith(mutate: (ov: any) => void): Opts {
  const ov = withPatchedOverride(SLUG, mutate as any);
  const b = fixtureComp() as any;
  return { ...b, overrides: { ...(b.overrides ?? {}), [SLUG]: ov } } as Opts;
}

/** Untouched clone of the committed override (withPatchedOverride never writes disk). */
const OV: any = withPatchedOverride(SLUG, () => {});

function setBuffDuration(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pick: (e: any) => boolean,
  sec: number,
) {
  for (const b of blocksOf(ov, slot))
    for (const e of b.effects ?? [])
      if (e.kind === 'buff' && pick(e)) e.durationSec = sec;
}

function dropEffects(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pick: (e: any) => boolean,
) {
  for (const b of blocksOf(ov, slot))
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e: any) => !pick(e));
}

const applies = (evs: Ev[]) => evs.filter((e) => e.kind === 'buffApply');

const withStat = (evs: Ev[], stat: string, value?: number) =>
  applies(evs).filter(
    (e) =>
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) < 1e-6),
  );

// casterIdx === null AND targetIdx === null are boss-held debuffs — excluded.
const hpApplies = (evs: Ev[]) =>
  applies(evs).filter((e) => HP_STATS.has(String(e.stat)) && e.casterIdx !== null);

/** skill1 is the kit's ONLY self-targeted Max HP grant. */
const selfHpApplies = (evs: Ev[]) =>
  hpApplies(evs).filter((e) => e.targetSlug === SLUG);

function groupBy(xs: Ev[], key: (e: Ev) => string): Ev[][] {
  const m = new Map<string, Ev[]>();
  for (const x of xs) {
    const k = key(x);
    const g = m.get(k);
    if (g) g.push(x);
    else m.set(k, [x]);
  }
  return [...m.values()];
}

const targetsOf = (g: Ev[]) => g.map((e) => String(e.targetSlug)).sort();

// Critical Damage 29.9% is unique to quency's burst — one group per cast
// (all targets of a cast share the same expiresFrame).
const critGroups = (evs: Ev[]) =>
  groupBy(withStat(evs, 'critDamagePct', 29.9), (e) => String(e.expiresFrame));

const s2Groups = (evs: Ev[]) =>
  groupBy(withStat(evs, 'atkPct', 16.11), (e) => String(e.expiresFrame));

const teamTotal = (res: any) =>
  Object.values(totals(res)).reduce((a: number, b: any) => a + Number(b), 0);

// ---------------------------------------------------------------- hoisted runs (9)
const base = run(fixtureComp());

const s1Dur20 = run(
  compWith((ov) => setBuffDuration(ov, 'skill1', (e) => HP_STATS.has(e.stat), 20)),
);
const s1Count120 = run(
  compWith((ov) => {
    for (const b of blocksOf(ov, 'skill1'))
      if (b.trigger && typeof b.trigger.count === 'number') b.trigger.count = 120;
  }),
);
const s1Gone = run(compWith((ov) => dropEffects(ov, 'skill1', () => true)));

const s2Dur10 = run(
  compWith((ov) => setBuffDuration(ov, 'skill2', (e) => e.stat === 'atkPct', 10)),
);
const s2Zero = run(
  compWith((ov) => {
    for (const b of blocksOf(ov, 'skill2'))
      for (const e of b.effects ?? [])
        if (e.kind === 'buff' && e.stat === 'atkPct') e.value = 0;
  }),
);

const bCritDur15 = run(
  compWith((ov) =>
    setBuffDuration(ov, 'burst', (e) => e.stat === 'critDamagePct', 15),
  ),
);
const bCritGone = run(
  compWith((ov) =>
    dropEffects(ov, 'burst', (e) => e.kind === 'buff' && e.stat === 'critDamagePct'),
  ),
);
const bHpGone = run(
  compWith((ov) =>
    dropEffects(ov, 'burst', (e) => e.kind === 'buff' && HP_STATS.has(e.stat)),
  ),
);

describe('quency — fixture sanity (non-vacuity)', () => {
  it('quency fires her SMG in the control comp (skill1 hit counter can accrue)', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('quency actually casts her own burst (sole B2 in the adapted fixture)', () => {
    // If this is 0 every burst-slot assertion below would be vacuous.
    expect(critGroups(base.events).length).toBeGreaterThanOrEqual(1);
  });
});

describe('quency skill1 — "Activates after 60 normal attacks", self, 10 sec', () => {
  it('is a SELF-targeted hitCount:60 block (not an interval/passive, not ally-scoped)', () => {
    const bs = blocksOf(OV, 'skill1');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      expect(b.target?.kind).toBe('self');
      expect(b.trigger?.kind).toBe('hitCount');
      expect(b.trigger?.count).toBe(60);
    }
  });

  it('grants 12.42% Max HP for 10 sec (magnitude + duration authored literally)', () => {
    const hp = blocksOf(OV, 'skill1')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && HP_STATS.has(e.stat));
    expect(hp.length).toBe(1);
    expect(hp[0].value).toBeCloseTo(12.42, 6);
    expect(hp[0].durationSec).toBe(10);
  });

  it('re-fires many times over the fight (nearest-wrong: a one-shot passive)', () => {
    // A `passive` self-grant applies once at frame 0; a hit-count trigger on a
    // 120-round SMG re-applies dozens of times across 180 s.
    expect(selfHpApplies(base.events).length).toBeGreaterThanOrEqual(3);
  });

  it('the threshold is 60 hits — doubling it to 120 halves the activations', () => {
    const a = selfHpApplies(base.events).length;
    const b = selfHpApplies(s1Count120.events).length;
    expect(b).toBeGreaterThanOrEqual(1);
    expect(a).toBeGreaterThan(b);
    // Nearest-wrong count:120 ("attacks" read as trigger pulls) would make `a` equal `b`.
    expect(Math.abs(a - 2 * b)).toBeLessThanOrEqual(3);
  });

  it('lasts exactly 10 sec (first apply expiresFrame shifts by 600f when patched to 20 s)', () => {
    const b0 = selfHpApplies(base.events)[0];
    const p0 = selfHpApplies(s1Dur20.events)[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number.isFinite(Number(b0.expiresFrame))).toBe(true);
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(10 * FPS);
  });

  it('is damage-INERT — quency has no HP->ATK consumer, so removing it moves nothing', () => {
    // RED if the grant were mis-encoded as an ATK/damage buff, or if it leaked into
    // any damage bucket. Teammates must be byte-identical too.
    expect(totals(s1Gone.res)).toEqual(totals(base.res));
  });

  it.skip('GAP: basis is "the Nikke with the highest Max HP", not the caster — no StatKey exists', () => {
    // The schema has highestAllyAtkPct for ATK but NO highest-ally Max HP analogue.
    // caster/targetMaxHpPct on a self target is exact ONLY when quency herself holds
    // the team's highest Max HP. Unassertable without the missing primitive.
  });

  it.skip('FLAG: "60 normal attacks" — rounds vs trigger pulls (hitsPerShot 2)', () => {
    // Engine convention: hitCount counts ROUNDS, so 60 = half a 120-round magazine
    // (30 pulls). If the kit means 60 PULLS the threshold is 120. Not prose-decidable.
  });
});

describe('quency skill2 — 2 highest-final-ATK allies, ATK ▲ 16.11% for 5 sec', () => {
  it('targets exactly 2 allies ranked by FINAL ATK, self not excluded', () => {
    const bs = blocksOf(OV, 'skill2');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      expect(b.target?.kind).toBe('alliesTopAtk');
      expect(b.target?.count).toBe(2);
      // Kit says "highest FINAL ATK" literally -> live-ATK ranking (A3 rule).
      expect(b.target?.byFinalAtk).toBe(true);
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('is a plain ATK% buff, NOT a caster-scaled flat ATK grant', () => {
    const raw = withStat(base.events, 'atkPct', 16.11);
    expect(raw.length).toBeGreaterThanOrEqual(2);
    const qIdx = critGroups(base.events)[0]?.[0]?.casterIdx;
    const flat = applies(base.events).filter(
      (e) =>
        e.casterIdx === qIdx &&
        (e.stat === 'casterAtkPct' || e.stat === 'highestAllyAtkPct'),
    );
    // casterAtkPct/highestAllyAtkPct re-emit as a FLAT ATK number; the kit line has no
    // "of the skill user's ATK" wording, so quency must emit none.
    expect(flat).toEqual([]);
  });

  it('hits exactly 2 distinct allies per activation and repeats over the fight', () => {
    const gs = s2Groups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(2); // rules out a one-shot/passive encoding
    for (const g of gs) {
      expect(g.length).toBe(2);
      expect(new Set(targetsOf(g)).size).toBe(2); // RED under target {kind:'allies'} (4 units)
    }
  });

  it('lasts exactly 5 sec (first apply expiresFrame shifts by 300f when patched to 10 s)', () => {
    const b0 = s2Groups(base.events)[0]?.[0];
    const p0 = s2Groups(s2Dur10.events)[0]?.[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(5 * FPS);
  });

  it('the ATK buff actually moves team damage (zeroing it strictly lowers the total)', () => {
    expect(teamTotal(base.res)).toBeGreaterThan(teamTotal(s2Zero.res));
  });

  it.skip('FLAG: skill2 carries NO activation clause — cadence is outside the prose', () => {
    // No "Activates when/after ..." text. Repo convention for a clause-free skill line
    // is interval{sec: datamined skill cooldown}, and that cooldown is NOT in this
    // packet (the given "cd 20s" is the BURST cooldown). Trigger identity and cadence
    // are therefore a ⚑ — measurement/datamine-gated, not blind-assertable.
  });
});

describe('quency burst — 2 highest-final-ATK allies: Max HP ▲ 43.87%/5s, Crit DMG ▲ 29.9%/10s', () => {
  it('fires on her OWN burst cast and targets the same 2 highest-final-ATK allies', () => {
    const bs = blocksOf(OV, 'burst');
    expect(bs.length).toBeGreaterThanOrEqual(1);
    for (const b of bs) {
      // Nearest-wrong: fullBurstEnter — it would fire on rotations another stage-2/3
      // unit completes, over-crediting a burst quency never cast.
      expect(b.trigger?.kind).toBe('burstCast');
      expect(b.target?.kind).toBe('alliesTopAtk');
      expect(b.target?.count).toBe(2);
      expect(b.target?.byFinalAtk).toBe(true);
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('encodes "Max HP ▲ 43.87%" as the TARGET\'s own Max HP, not the caster\'s', () => {
    const eff = blocksOf(OV, 'burst')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && HP_STATS.has(e.stat));
    expect(eff.length).toBe(1);
    // "Max HP ▲ X%" is targetMaxHpPct per the schema; casterMaxHpPct is the
    // "X% of the skill user's Max HP" wording, which this line does not use.
    expect(eff[0].stat).toBe('targetMaxHpPct');
    expect(eff[0].value).toBeCloseTo(43.87, 6);
    expect(eff[0].durationSec).toBe(5);
  });

  it('grants Critical Damage ▲ 29.9% for 10 sec to exactly 2 distinct allies per cast', () => {
    const gs = critGroups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(1);
    for (const g of gs) {
      expect(g.length).toBe(2);
      expect(new Set(targetsOf(g)).size).toBe(2);
    }
    const eff = blocksOf(OV, 'burst')
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'buff' && e.stat === 'critDamagePct');
    expect(eff.length).toBe(1);
    expect(eff[0].durationSec).toBe(10);
  });

  it('the two riders carry DIFFERENT windows: Max HP expires 300f before Crit DMG', () => {
    // Both leave the same cast frame, so expiresFrame(crit) - expiresFrame(hp) = 300.
    // RED under the common nearest-wrong of giving both riders one shared duration.
    const hp = hpApplies(base.events);
    const gs = critGroups(base.events);
    expect(gs.length).toBeGreaterThanOrEqual(1);
    for (const g of gs) {
      const want = Number(g[0].expiresFrame) - 5 * FPS;
      const batch = hp.filter((e) => Number(e.expiresFrame) === want);
      expect(batch.length).toBe(2);
      expect(targetsOf(batch)).toEqual(targetsOf(g)); // same 2 allies as the crit rider
    }
  });

  it('Critical Damage runs exactly 10 sec (patching to 15 s shifts expiry by 300f)', () => {
    const b0 = critGroups(base.events)[0]?.[0];
    const p0 = critGroups(bCritDur15.events)[0]?.[0];
    expect(b0).toBeTruthy();
    expect(p0).toBeTruthy();
    expect(Number(p0.expiresFrame) - Number(b0.expiresFrame)).toBe(5 * FPS);
  });

  it('the Critical Damage rider actually moves team damage', () => {
    expect(teamTotal(base.res)).toBeGreaterThan(teamTotal(bCritGone.res));
  });

  it('the ally Max HP grant is damage-INERT (ally-granted Max HP feeds no ATK conversion)', () => {
    expect(totals(bHpGone.res)).toEqual(totals(base.res));
  });
});

describe('quency — whole-kit shape', () => {
  it('authors all three slots', () => {
    expect(blocksOf(OV, 'skill1').length).toBeGreaterThanOrEqual(1);
    expect(blocksOf(OV, 'skill2').length).toBeGreaterThanOrEqual(1);
    expect(blocksOf(OV, 'burst').length).toBeGreaterThanOrEqual(1);
  });

  it('invents NO damage: the kit has zero damage lines, so no damage-producing effect exists', () => {
    const bad = allBlocks(OV)
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => DAMAGE_KINDS.has(String(e.kind)))
      .map((e: any) => e.kind);
    expect(bad).toEqual([]);
  });

  it('carries no ignored/unsupported effect blocks (skips belong in `note`/`unmodeled`)', () => {
    const bad = allBlocks(OV)
      .flatMap((b: any) => b.effects ?? [])
      .filter((e: any) => e.kind === 'ignored' || e.kind === 'unsupported')
      .map((e: any) => e.kind);
    expect(bad).toEqual([]);
  });
});

```

---

# S6 — BLIND POST-OP OVERRIDE-WRITER (opus) + diff vs driver

## S6 blind override vs DRIVER override (per-slot)

- skill1: IDENTICAL | blind=[{"trigger": {"kind": "hitCount", "count": 60}, "target": {"kind": "self"}, "effects": [{"kind": "buff", "stat": "casterMaxHpPct", "value": 12.42, "durationSec": 10}]}] | driver=[{"trigger": {"kind": "hitCount", "count": 60}, "target": {"kind": "self"}, "effects": [{"kind": "buff", "stat": "casterMaxHpPct", "value": 12.42, "durationSec": 10}]}]
- skill2: DIVERGES | blind=[{"trigger": {"kind": "interval", "sec": 20}, "target": {"kind": "alliesTopAtk", "count": 2, "byFinalAtk": true}, "effects": [{"kind": "buff", "stat": "atkPct", "value": 16.11, "durationSec": 5}]}] | driver=[{"trigger": {"kind": "interval", "sec": 8}, "target": {"kind": "alliesTopAtk", "count": 2, "byFinalAtk": true}, "effects": [{"kind": "buff", "stat": "atkPct", "value": 16.11, "durationSec": 5}]}]
- burst: IDENTICAL | blind=[{"trigger": {"kind": "burstCast"}, "target": {"kind": "alliesTopAtk", "count": 2, "byFinalAtk": true}, "effects": [{"kind": "buff", "stat": "targetMaxHpPct", "value": 43.87, "durationSec": 5}, {"kind": "buff", "stat": "critDamagePct", "value": 29.9, "durationSec": 10}]}] | driver=[{"trigger": {"kind": "burstCast"}, "target": {"kind": "alliesTopAtk", "count": 2, "byFinalAtk": true}, "effects": [{"kind": "buff", "stat": "targetMaxHpPct", "value": 43.87, "durationSec": 5}, {"kind": "buff", "stat": "critDamagePct", "value": 29.9, "durationSec": 10}]}]

The ONLY substantive divergence is **skill2 interval sec** (blind 20s vs driver 8s). The driver's 8s is datamined (`skillCooldownsSec.skill2 = 8`), corroborated by the fable S2b review; the blind author lacked/mis-sourced the skill cooldown and used the burst cooldown (20s). Driver keeps 8s. skill1 and burst are byte-identical (S1 converged to casterMaxHpPct).

## quency.override.json (blind S6)

```json
{
 "slug": "quency",
 "skill1": [
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
     "kind": "buff",
     "stat": "casterMaxHpPct",
     "value": 12.42,
     "durationSec": 10
    }
   ]
  }
 ],
 "skill2": [
  {
   "slot": "skill2",
   "trigger": {
    "kind": "interval",
    "sec": 20
   },
   "target": {
    "kind": "alliesTopAtk",
    "count": 2,
    "byFinalAtk": true
   },
   "effects": [
    {
     "kind": "buff",
     "stat": "atkPct",
     "value": 16.11,
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
    "kind": "alliesTopAtk",
    "count": 2,
    "byFinalAtk": true
   },
   "effects": [
    {
     "kind": "buff",
     "stat": "targetMaxHpPct",
     "value": 43.87,
     "durationSec": 5
    },
    {
     "kind": "buff",
     "stat": "critDamagePct",
     "value": 29.9,
     "durationSec": 10
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
  "\u2691 skill1 trigger: 'after 60 normal attacks' is encoded as hitCount:60, which the engine counts in ROUNDS, not trigger pulls. This unit is an SMG with hitsPerShot 2, so if the kit means 60 PULLS the real cadence is twice as fast as modeled. Unmeasured.",
  "\u2691 skill1 scaling basis: the kit duplicates 12.42% of the HIGHEST-Max-HP ally's Max HP; the schema has no highest-ally Max-HP analog to highestAllyAtkPct, so it is approximated as casterMaxHpPct on a self target (12.42% of this unit's OWN Max HP). Wrong whenever a higher-Max-HP ally (typically a Defender) is present. Offensively inert today either way \u2014 this unit carries no atkOfMaxHpPct \u2014 so the approximation moves no damage, but it is NOT faithful and must not be cited as a modeled HP value.",
  "\u2691 skill2 trigger is KIT-SILENT (no activation clause in the prose). Modeled as interval:20s to match the only cooldown figure in the packet; the live alternative is fullBurstEnter (a 5s window keyed to Full Burst entry). Uptime differs materially between the two \u2014 do not trust this unit's skill2 contribution before the trigger is pinned.",
  "\u2691 Both ally-buff blocks rank by LIVE effective ATK (byFinalAtk:true) because the prose literally says 'highest final ATK'. No excludeSelf \u2014 the kit does not say 'except the skill user', so this unit is a valid target of its own buffs.",
  "\u2691 Cadence: the SMG fire-rate/reload datamine (reloadFrames 121, nominal rate) is engine-side and known-unreliable; effective rate quantizes to 60/ceil(60/nominal). Not an override field, but it directly drives the skill1 hitCount cadence above."
 ],
 "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (SMG/Electric/Supporter/Burst II). Full kit is modeled \u2014 three slots, zero silent drops. skill1: a self Max-HP duplication on a 60-normal-attack counter, 10s; approximated as casterMaxHpPct because the schema cannot express 'of the highest-Max-HP ally' (offensively inert for this unit \u2014 no atkOfMaxHpPct consumer). skill2: ATK \u25b216.11%/5s to the 2 highest-final-ATK allies on a KIT-SILENT trigger, modeled as interval:20s (\u2691 \u2014 fullBurstEnter is the live alternative). burst: own burstCast (Burst II, pre-Full-Burst by timing) grants the same 2 highest-final-ATK allies Max HP \u25b243.87%/5s (targetMaxHpPct, ally-granted so it feeds no teammate's HP\u2192ATK conversion) and Critical Damage \u25b229.9%/10s \u2014 the latter is the unit's only real damage contribution and it is a plain, unscoped critDamagePct with no normal-attack scoping in the text."
}
```

---

# DRIVER IMPLEMENTATION — scripts/tests/units/quency.test.ts

```ts
// PER-UNIT KIT SPEC — `quency` (Quency — SMG / Supporter / Electric / Burst II, cd 20s, ammo 120,
// hitsPerShot 2, rate_of_fire 1440rpm). Kit-autonomy gauntlet 2026-08-03. NOT the variant
// `quency-escape-queen` (SMG/Water/Burst III, "qeq") — a different unit; this spec reasons from the
// slug quency throughout (lint-slug-disambiguation advisory on the shared base-name resolved here).
//
// One assertion group per FAITHFUL kit line, asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each assertion
// must discriminate against) — never to supply the encoding under test.
//
// Kit (data/characters.json → characters['quency'].skills, lvl 10/10/10):
//   S1 "New Route" — after 60 normal attacks; affects SELF:
//        ■ Duplicates 12.42% of the Max HP of the Nikke with the highest Max HP, 10 sec  [L1 INERT]
//   S2 "Hidden Accomplice" — affects 2 ally unit(s) with the highest FINAL ATK (cd 8s):
//        ■ ATK ▲ 16.11% for 5 sec                                                       [L2 FAITHFUL]
//   BU "The Great Escape" — affects 2 ally unit(s) with the highest FINAL ATK:
//        ■ Max HP ▲ 43.87% for 5 sec                                                    [L3a INERT]
//        ■ Critical Damage ▲ 29.9% for 10 sec                                           [L3b FAITHFUL]
//
// L1 (S1 self HP-buffer grant) is modeled as hitCount-60 self casterMaxHpPct 12.42 dur 10 — a
//      temporary SELF HP-buffer. CROSS-FAMILY CONVERGED: both blind opus passes (S5 test + S6 override)
//      independently re-derived S1 as a self Max-HP buff; a shield reading was set aside (the sim can
//      consume neither a shield pool nor an ally-scaled HP source, so the convergent self-HP-grant is
//      faithful to every observable the engine models). It is DAMAGE-INERT (quency has no atkOfMaxHpPct
//      consumer, v1 models no damage-taken) but OBSERVABLE (it emits a self maxHpFlat), so it IS pinned:
//      trigger/cadence/self-target/10s duration + inertness. ⚑ BASIS: the kit's source is the
//      HIGHEST-Max-HP ally but no StatKey expresses an ally-scaled HP source, so casterMaxHpPct resolves
//      to % of quency's OWN Max HP (exact only when she holds the team's highest Max HP; inert either
//      way — completeness gap, not accuracy). ⚑ '60 normal attacks' hits-vs-pulls: engine hitCount counts
//      HITS (adds hitsPerShot per pull, sim.ts:3782), so count 60 = 60 hits = 30 pulls; if it means 60
//      SHOTS the threshold is 120 — inert either way.
//   L3a (burst Max HP ▲ 43.87%) is modeled (targetMaxHpPct dur 5) but DAMAGE-INERT: it converts to an
//      ally-granted maxHpFlat, and the engine excludes ally-granted maxHpFlat from live Max HP and
//      feeds atkOfMaxHpPct only when caster===target (self). It is pinned INDIRECTLY by the L3a/L3b
//      inertness discriminator below (removing the whole burst drops damage by EXACTLY the amount the
//      crit-damage line alone does — the Max-HP line contributes zero).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L2  atkPct 16.11 is scoped to the two highest-FINAL-ATK allies (byFinalAtk). Proven two ways:
//       (a) removing S2 drops the team total ~5.7% (the buff is live on the carries); (b) the NEAREST
//       WRONG model — the same buff scoped to SELF only — leaves the carries unbuffed, so the shipped
//       model provably beats it (base > self-only). The target set is pinned structurally: exactly two
//       distinct non-self allies, refreshed on the 8s internal cooldown for a 5s window each.
//   L3b critDamagePct 29.9 lifts the two buffed carries' crit multiplier. Removing it drops the team
//       total ~2.0%. It lands once per burst cast on two targets for 10s. The nearest wrong model —
//       crediting the whole burst's damage to something other than the crit-damage line — is refuted by
//       the L3a/L3b inertness discriminator: stripping the ENTIRE burst equals stripping ONLY the
//       crit-damage effect, so no other burst line carries damage.
//
// Fixture: a Burst-II fixture — quency is the SOLE B2, so she casts every Full Burst cycle. Control
// core liter (B1) opens the chain; emilia (B3) + helm (B3) are the two carries who rank highest final
// ATK and receive quency's buffs. Boss Fire (emilia/helm are Water → advantaged). Focus emilia.
// Deterministic (no seed). 180s.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: liter 0 / quency 1 / emilia 2 / helm 3. */
const QUENCY = 1;
const SLUGS = ['liter', 'quency', 'emilia', 'helm'];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'emilia',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- counterfactual / isolation patches -------------------------------------------------------
/** L2 reference: her entire S2 block removed. */
const noS2 = withPatchedOverride('quency', (ov) => {
  if (!ov.skill2.length) {
    throw new Error('quency S2 block missing — fixture is stale');
  }
  ov.skill2 = [];
});
/** L2 counterfactual (nearest wrong scope): the same ATK buff scoped to SELF only, not the two
 *  highest-final-ATK allies. The carries stay unbuffed, so it must under-perform the shipped model. */
const s2SelfOnly = withPatchedOverride('quency', (ov) => {
  for (const b of ov.skill2) {
    b.target = { kind: 'self' };
  }
});
/** L3b reference: strip ONLY the crit-damage effect from the burst (the Max-HP effect stays). */
const noCritDmg = withPatchedOverride('quency', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'critDamagePct');
    removed += before - b.effects.length;
  }
  if (removed !== 1) {
    throw new Error('quency burst critDamagePct effect missing — fixture is stale');
  }
});
/** L3a/L3b inertness discriminator: remove the ENTIRE burst (both effects). If the Max-HP line is
 *  truly inert, this must equal noCritDmg exactly. */
const noBurstAll = withPatchedOverride('quency', (ov) => {
  if (!ov.burst.length) {
    throw new Error('quency burst block missing — fixture is stale');
  }
  ov.burst = [];
});
/** L1 reference: her entire S1 block removed (the self HP-buffer grant is inert). */
const noS1 = withPatchedOverride('quency', (ov) => {
  if (!ov.skill1.length) {
    throw new Error('quency S1 block missing — fixture is stale');
  }
  ov.skill1 = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const rNoS1 = run({ quency: noS1 });
const rNoS2 = run({ quency: noS2 });
const rS2Self = run({ quency: s2SelfOnly });
const rNoCrit = run({ quency: noCritDmg });
const rNoBurst = run({ quency: noBurstAll });

// ---- B2-contention arm (discriminates burstCast vs fullBurstEnter) --------------------------
// The primary fixture makes quency the SOLE B2, so burstCast and fullBurstEnter coincide there and
// the trigger identity is NOT discriminated. This second comp fields crown as a competing Burst II:
// crown wins the slot by priority, quency casts ZERO times, yet Full Bursts still happen — so a
// fullBurstEnter-keyed encoding would misfire its crit buff on every one of them while the shipped
// burstCast fires nothing (fable S2b flag, reconciled 2026-08-03).
const CONTEND_SLUGS = ['liter', 'crown', 'quency', 'helm'];
const CONTEND_Q = CONTEND_SLUGS.indexOf('quency');
function runContend(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: CONTEND_SLUGS,
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
/** Nearest-wrong trigger: key the burst buffs to fullBurstEnter instead of quency's OWN cast. */
const burstFullBurstEnter = withPatchedOverride('quency', (ov) => {
  for (const b of ov.burst) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
const contendBase = runContend();
const contendFBE = runContend({ quency: burstFullBurstEnter });
const contendQuencyCrit = (evs: SimEvent[]) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.casterIdx === CONTEND_Q &&
      e.stat === 'critDamagePct' &&
      e.value === 29.9
  );

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs quency applied, optionally by stat + value. */
const quencyBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === QUENCY &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const quencyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'quency'
  );
const distinctTargets = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.targetIdx))];

describe('quency — kit spec', () => {
  describe('L1 — S1 self HP-buffer grant (after 60 normal attacks; casterMaxHpPct 12.42%, 10s; INERT)', () => {
    // casterMaxHpPct on self re-emits as a self maxHpFlat; S1 is the ONLY self-targeted one.
    const selfHp = quencyBuffs(base.events, 'maxHpFlat').filter(
      (b) => b.targetIdx === QUENCY
    );

    it('is a self grant on a hit counter that re-fires over the fight', () => {
      expect(selfHp.length, 'no S1 self maxHpFlat grant was applied').toBeGreaterThan(0);
      expect(selfHp.length, 'S1 must re-fire on the hit counter, not apply once').toBeGreaterThanOrEqual(3);
      for (const b of selfHp) {
        expect(b.targetIdx).toBe(QUENCY);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('RED vs counterfactual: the line is ABSENT when S1 is removed', () => {
      expect(
        quencyBuffs(rNoS1.events, 'maxHpFlat').filter((b) => b.targetIdx === QUENCY)
      ).toHaveLength(0);
    });

    it('is damage-INERT — removing S1 moves no damage (quency has no HP→ATK consumer)', () => {
      expect(Math.abs(sum(base.totals) - sum(rNoS1.totals))).toBeLessThan(1);
    });
  });

  describe('L2 — S2 ATK ▲ 16.11% for 5 sec, to the 2 highest-final-ATK allies (interval 8s)', () => {
    const applied = quencyBuffs(base.events, 'atkPct', 16.11);
    const targets = distinctTargets(applied);

    it('is the kit magnitude, 5s window, single stack, applied by quency to allies', () => {
      expect(applied.length, 'no atkPct@16.11 buff was applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
        expect(b.maxStacks).toBe(1);
      }
    });

    it('is scoped to exactly TWO non-self allies (highest final ATK)', () => {
      expect(targets, 'expected exactly two distinct targets').toHaveLength(2);
      expect(targets).not.toContain(QUENCY);
      for (const t of targets) {
        expect(t).not.toBeNull();
      }
    });

    it('refreshes on the 8s internal cooldown (consecutive applications are 8s apart)', () => {
      const frames = [...new Set(applied.map((b) => b.frame))].sort((a, b) => a - b);
      expect(frames.length, 'S2 must fire repeatedly over the fight').toBeGreaterThanOrEqual(3);
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1]).toBe(8 * FPS);
      }
    });

    it('is LIVE — removing S2 drops the team total', () => {
      expect(sum(base.totals)).toBeGreaterThan(sum(rNoS2.totals));
    });

    it('DISCRIMINATING scope: the ally-targeted buff beats the nearest wrong model (self-only)', () => {
      // Shipped (ally-scoped) strictly out-performs self-only …
      expect(sum(base.totals)).toBeGreaterThan(sum(rS2Self.totals));
      // … and self-only still beats removing the line (quency's own ATK lift is not nothing),
      // bracketing the scope effect between the two wrong models.
      expect(sum(rS2Self.totals)).toBeGreaterThan(sum(rNoS2.totals));
    });

    it('DISCRIMINATING: the buffed carries each do more damage with S2 than without', () => {
      for (const t of targets) {
        const slug = SLUGS[t as number];
        expect(base.totals[slug], `${slug} should be lifted by S2`).toBeGreaterThan(
          rNoS2.totals[slug]
        );
      }
    });

    it('RED vs counterfactual: the line is ABSENT when S2 is removed', () => {
      expect(quencyBuffs(rNoS2.events, 'atkPct', 16.11)).toHaveLength(0);
    });

    it('RED vs counterfactual: under the self-only scope model the buff collapses to quency alone', () => {
      const selfApplied = quencyBuffs(rS2Self.events, 'atkPct', 16.11);
      expect(selfApplied.length).toBeGreaterThan(0);
      expect(distinctTargets(selfApplied)).toEqual([QUENCY]);
    });
  });

  describe('L3b — burst Critical Damage ▲ 29.9% for 10 sec, to the 2 highest-final-ATK allies', () => {
    const applied = quencyBuffs(base.events, 'critDamagePct', 29.9);
    const casts = quencyBursts(base.events);
    const targets = distinctTargets(applied);

    it('quency casts her burst (fixture precondition)', () => {
      expect(casts.length, 'quency never casts her burst').toBeGreaterThan(0);
    });

    it('is the kit magnitude, 10s window, scoped to two non-self allies', () => {
      expect(applied.length, 'no critDamagePct@29.9 buff was applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      expect(targets).toHaveLength(2);
      expect(targets).not.toContain(QUENCY);
    });

    it('lands once per burst cast on each of the two targets', () => {
      // One application per target per cast.
      expect(applied.length).toBe(casts.length * 2);
      // Distinct application frames == distinct cast frames (fires with the cast, not on a timer).
      const applyFrames = new Set(applied.map((b) => b.frame));
      const castFrames = new Set(casts.map((c) => c.frame));
      expect(applyFrames.size).toBe(castFrames.size);
    });

    it('is LIVE — removing the crit-damage line drops the team total', () => {
      expect(sum(base.totals)).toBeGreaterThan(sum(rNoCrit.totals));
    });

    it('RED vs counterfactual: the line is ABSENT when the crit-damage effect is stripped', () => {
      expect(quencyBuffs(rNoCrit.events, 'critDamagePct', 29.9)).toHaveLength(0);
    });
  });

  describe('L3a — burst Max HP ▲ 43.87% is modeled but damage-INERT (targetMaxHpPct → ally-granted maxHpFlat, no feed)', () => {
    it('DISCRIMINATING inertness: stripping the ENTIRE burst equals stripping ONLY the crit-damage line', () => {
      // If the Max-HP line carried any damage, removing the whole burst would drop MORE than removing
      // only the crit-damage effect. They are equal (to floating-point) → the Max-HP line is inert.
      expect(Math.abs(sum(rNoBurst.totals) - sum(rNoCrit.totals))).toBeLessThan(1);
    });

    it('the burst Max-HP effect is still PRESENT in the shipped override (modeled, not dropped)', () => {
      // Structural: the base run carries an ALLY-granted maxHpFlat from quency (targetIdx != quency;
      // her S1 self maxHpFlat grant is filtered out), even though the burst line is inert.
      const maxHpGrants = quencyBuffs(base.events, 'maxHpFlat').filter(
        (b) => b.targetIdx !== QUENCY
      );
      expect(maxHpGrants.length, 'burst Max-HP grant should be applied').toBeGreaterThan(0);
      for (const b of maxHpGrants) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
        expect(b.targetIdx).not.toBeNull(); // an ally, not the boss
      }
    });
  });

  describe('burst trigger identity — burstCast (own B2 cast), NOT fullBurstEnter [crown-contention arm]', () => {
    const fbStarts = contendBase.filter((e) => e.kind === 'fullBurstStart');
    const qCasts = contendBase.filter(
      (e) => e.kind === 'burstCast' && e.slug === 'quency'
    );

    it('precondition: Full Bursts happen while crown wins the B2 slot (quency casts zero)', () => {
      expect(fbStarts.length, 'no Full Bursts in the contention comp').toBeGreaterThan(0);
      expect(qCasts.length, 'crown should out-prioritize quency for the B2 cast').toBe(0);
    });

    it('GREEN: the shipped burstCast fires NO crit buff on Full Bursts quency did not cast into', () => {
      expect(contendQuencyCrit(contendBase)).toHaveLength(0);
    });

    it('RED: a fullBurstEnter encoding would misfire its crit buff on those same Full Bursts', () => {
      expect(contendQuencyCrit(contendFBE).length).toBeGreaterThan(0);
    });
  });
});

```

---

# DRIVER IMPLEMENTATION — src/skills/overrides/quency.json

```json
{
  "note": "Kit-autonomy gauntlet 2026-08-03: baseline-authoring (no prior override; simSupported flipped false→true by this run). quency (Quency) — SMG / Supporter / Electric / Burst II, cd 20s, ammo 120, hitsPerShot 2, rate_of_fire 1440rpm. NOT the `quency-escape-queen` variant (a different unit, SMG/Water/Burst III) — this spec reasons from slug quency throughout (lint-slug-disambiguation advisory on the shared base-name resolved to this slug). Three kit lines, all dispositioned, none dropped: (L1) S1 'New Route' self HP-buffer grant — modeled, damage-INERT; (L2) S2 'Hidden Accomplice' ATK buff — load-bearing, pinned; (L3a) burst Max HP — modeled, damage-INERT; (L3b) burst Critical Damage — load-bearing, pinned. || MODELED TODAY: (1) S1 New Route '■ Activates after 60 normal attacks. Affects self. Duplicates 12.42% of the Max HP of the Nikke with the highest Max HP. Lasts for 10 sec.' → hitCount count:60 self buff {stat:casterMaxHpPct, value:12.42, durationSec:10}. A temporary SELF HP-buffer grant on a hit counter. DAMAGE-INERT: it converts to a self-granted maxHpFlat; quency has no atkOfMaxHpPct consumer and v1 models no damage-taken, so it moves no damage — but it IS observable (emits a buffApply), so the spec pins its trigger/value/duration/cadence. ENCODING RATIONALE (cross-family converged): both blind opus passes (S5 test + S6 override) independently re-derived S1 as a self Max-HP buff; a shield reading was considered and set aside — the kit's genuine Max-HP buff (the burst line) uses the phrasing 'Max HP ▲', while S1's 'Duplicates % of the Max HP' is a second self-HP-buffer mechanic that the sim likewise cannot consume, and the convergent self-HP-grant encoding is faithful to every observable the engine models. ⚑ BASIS: the kit's source is 'the Nikke with the HIGHEST Max HP' but no StatKey expresses an ally-scaled HP source (highestAllyAtkPct has no HP analog); casterMaxHpPct on self resolves to % of quency's OWN Max HP. The basis divergence is exact only when quency holds the team's highest Max HP; it is damage-inert either way, so it is flagged (completeness gap, not an accuracy gap), never fudged. ⚑ '60 normal attacks' hits-vs-pulls: the engine hitCount adds hitsPerShot PER PULL (sim.ts:3782 counts HITS), so count 60 = 60 hits = 30 pulls; if the kit means 60 SHOTS the threshold is 120 — inert either way. (2) S2 Hidden Accomplice '■ Affects 2 ally unit(s) with the highest final ATK. ATK ▲ 16.11% for 5 sec.' (cd 8s, no visible activation clause) → interval sec:8, target alliesTopAtk count:2 byFinalAtk:true, buff atkPct 16.11 durationSec:5. interval = 'just happens on an internal cooldown with no activation clause' (types.ts); ⚑ first-fire phase is the engine convention (first at t=sec, not t=0) — a wrong phase rescales only the opening ramp, negligible over a fight. The 8s cadence is datamined (skillCooldownsSec.skill2 = 8), NOT prose — flagged, never invented. 'highest FINAL ATK' → byFinalAtk:true per the A3 literal-word ruling (rank by live effectiveAtk at proc time; the pool is self-inclusive but quency, a low-ATK Supporter, does not rank top-2). atkPct = 'ATK ▲ x%' scaling each TARGET's own ATK (NOT casterAtkPct). (3) Burst The Great Escape '■ Affects 2 ally unit(s) with the highest final ATK. Max HP ▲ 43.87% for 5 sec. Critical Damage ▲ 29.9% for 10 sec.' → ONE burstCast block on alliesTopAtk count:2 byFinalAtk:true with two same-target effects: targetMaxHpPct 43.87 durationSec:5 + critDamagePct 29.9 durationSec:10 (per-effect durationSec → the 300-vs-600-frame expiresFrame split is directly pinned). The Max HP line is DAMAGE-INERT: ally-granted maxHpFlat is excluded from live Max HP (casterIdx !== holder) and feeds atkOfMaxHpPct only when caster===target (self) — neither holds. The Critical Damage line is LOAD-BEARING: critDamagePct raises the two buffed carries' crit multiplier. burstCast is pinned against fullBurstEnter by a crown-contention arm in the spec (quency loses the B2 slot to crown → casts zero → the buff must NOT fire on those Full Bursts). || TIER 2 (scoped buffs: S2 + burst resolve 'highest FINAL ATK' via alliesTopAtk/byFinalAtk; burstCast-vs-fullBurstEnter trigger identity is load-bearing). EVIDENCE TIER: every live magnitude/duration is kit-text-literal (12.42/10, 16.11/5, 43.87/5, 29.9/10, count 2); the only conventions are the interval first-fire phase, the S1 hits-vs-pulls reading, and the S1 HP basis (all flagged, all inert-to-negligible). Faithful>fit; measured>fudge. || Kit-autonomy gauntlet 2026-08-03.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: 'Duplicates 12.42% of the Max HP of the Nikke with the highest Max HP' is a temporary SELF HP-buffer grant (cross-family-converged on a self Max-HP buff; a shield reading was set aside). Modeled as hitCount-60 self casterMaxHpPct 12.42 dur 10. DAMAGE-INERT (no atkOfMaxHpPct consumer, no damage-taken in v1) but observable — the spec pins trigger/value/duration/cadence. ⚑ BASIS: kit source is the HIGHEST-Max-HP ally; no StatKey expresses an ally-scaled HP source, so casterMaxHpPct resolves to % of quency's OWN Max HP — exact only when she holds the team's highest Max HP; inert either way (completeness gap, not accuracy).",
    "skill1: ⚑ 'after 60 normal attacks' hits-vs-pulls — the engine hitCount counts HITS (adds hitsPerShot per pull, sim.ts:3782), so count 60 = 60 hits = 30 pulls; if the kit means 60 SHOTS the threshold is 120. Inert either way (S1 moves no damage).",
    "skill2: ⚑ interval first-fire phase — the engine fires interval sec:8 first at t=8 (convention, not t=0); a wrong phase rescales only the opening ramp (negligible). The 8s cadence is DATAMINED (skillCooldownsSec.skill2 = 8), not prose. 'highest FINAL ATK' → byFinalAtk:true (live effectiveAtk at proc, A3 literal-word ruling); self-inclusive pool but quency does not rank top-2.",
    "burst: the Max HP ▲ 43.87% line is modeled (targetMaxHpPct dur 5) but DAMAGE-INERT — ally-granted maxHpFlat is excluded from live Max HP and feeds atkOfMaxHpPct only when caster===target (self). Only the Critical Damage ▲ 29.9% line moves damage. Both ride one burstCast block on the same two highest-final-ATK allies.",
    "all: quency is Burst II (cd 20s). The primary fixture fields her as the SOLE B2 (liter B1 / quency B2 / emilia B3 / helm B3) so she casts every ~20s Full Burst cycle; a second crown-contention arm (liter/crown/quency/helm) pins burstCast-vs-fullBurstEnter (crown wins the slot → quency casts zero → her burst buffs must not fire on those Full Bursts). Her own damage is negligible; her value is the S2 ATK buff and the burst Critical Damage buff on the two highest-final-ATK carries."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 60 },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "casterMaxHpPct", "value": 12.42, "durationSec": 10 }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 8 },
      "target": { "kind": "alliesTopAtk", "count": 2, "byFinalAtk": true },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 16.11, "durationSec": 5 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "alliesTopAtk", "count": 2, "byFinalAtk": true },
      "effects": [
        { "kind": "buff", "stat": "targetMaxHpPct", "value": 43.87, "durationSec": 5 },
        { "kind": "buff", "stat": "critDamagePct", "value": 29.9, "durationSec": 10 }
      ]
    }
  ]
}

```