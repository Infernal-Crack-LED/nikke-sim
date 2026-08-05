# S7 RECONCILING-JUDGE PACKET — emma (Emma, BASE — MG/Fire/Supporter/Burst I)

Unit slug: `emma`. NOT emma-tactical-upgrade (the variant). Driver date: 2026-08-05.

---
## 1. YOUR CONTRACT (role template)

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
## 2. MECHANICS SSOT (the formula + engine ground rules)

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
  if ally grants fed it). "Live Max HP" here and below is the single engine reader `liveMaxHp`
  (base + own-kit maxHpFlat buffs, honoring expiry/stacks/ramp).
- **"ATK ▲ X% of the skill user's final Max HP"** granted to OTHERS (maxwell-ordinary-mechanic
  S2, `atkOfCasterMaxHpPct`) converts at application time to a FLAT add of the caster's live
  Max HP × X — uniform across all targets, one snapshot per application; the caster's own-kit
  Max HP stacks feed the basis (the e3 scope above), ally-granted Max HP on the caster does not
  (owner ruling 2026-08-04: the kit line is caster-scaled; the earlier target-own resolution was
  a misread).
- **"% of Max HP" damage terms** (stackedNuke hpPct — maiden-ice-rose's burst "10% of the skill
  user's FINAL Max HP") read live Max HP at cast, same e3 scope (2026-08-04; the base-Max-HP
  read was a documented residual, kit text says "final").

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
              OWN core rate independent of aim/range — a consolidated pellet bullet (dorothy-S,
              `coreRate`). These pass `coreOverride` so `acr` is that rate, not `acrFor(weapon,
              band)`. (Rapi: Red Hood's attached-rocket EXPLOSIONS consumed this path 2026-07-16
              (`storedHit.core` 0.33) but were re-ruled core-INELIGIBLE 2026-08-04 — skill damage;
              owner footage ruling, DECISIONS.)
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
aim/range-independent, does NOT core (skill damage — owner footage ruling 2026-08-04 overturning the
2026-07-16 ~1/3 read), and crits at the caster's sheet rate
(`storedHit.crit` — removes the stored-hit path's default crit-OFF exemption so the release crits like
every other hit; consistency, DECISIONS 2026-07-16). The rocket ATTACH is launchWeapon delivery:
it CORES at the band-table rate, crits, and generates burst gauge like any skill hit — so the
in-FB cadence subtly shifts Full Burst timing (a second-order coupling, DECISIONS 2026-07-16).
Two 2026-08-04 owner rulings: the ▼60 in-window threshold is scoped to the 10s window of her OWN
Stage-3 cast (`countInFbStage`, not any FB window), and her Stage-3 cast self-buffs Projectile
Attachment Damage ▲421.2% for 10s (restored — the 2026-07-14 measured-inert verdict overturned;
DECISIONS ATTACHMENT REWORK).

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
               + Projectile Explosion ▲ %  [explosion-flavored hits, plus RL NORMAL attacks — see 1f]
               + Projectile Attachment ▲ % [attachment-flavored hits — see 1f]
               ) / 100
```

The flavor gates mean a "Sustained Damage ▲" buff does nothing for a unit with no dot, etc.

### 1f. Projectile flavor routing (DamageUp addition)

Projectile Explosion ▲ % / Projectile Attachment ▲ % compose ADDITIVELY into the DamageUp
bucket (1e), flavor-scoped: an attachment hit reads ONLY Projectile Attachment ▲, an explosion
hit ONLY Projectile Explosion ▲. Applies to explosion/attachment-_flavored_ hits (Rapi: Red
Hood's projectiles, Anis: Star's stars). For plain rocket-launcher NORMAL attacks the Projectile
Explosion buff applies too (also DamageUp) — MEASURED exactly (the buff-independent
rocket/proc popup ratio test, 1.2491 = prediction to four digits). Owner popup ruling
2026-08-04: a non-crit CORE Rapi:RH attach during her B3 window hit 5,057,974 in the
control+carry recording — the additive composition reproduces it (−0.24%/+1.1% across buff
states); the prior own-multiplicative-bucket model over-credited ~×1.6 (her hot read). This
OVERTURNS the validation-era own-bucket rule. The event `projFactor` field is now a flavor
MARKER (1 = unflavored), not a factor in the damage product.

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
(so instant burst-cast attacks land before it — no +50%). After it ends, generation unlocks IMMEDIATELY
and the next chain opens the moment the refilled gauge is full — there is NO post-FB chain-open lock
(owner ruling 2026-08-04, overturning the earlier fixed ~2.5-3s `POST_FB_CHAIN_DELAY_FRAMES` block: the
observed gap was natural refill-from-zero, ~3-4s for a good team, compounded by video-offset confound;
`ROTMODEL=floor` keeps the old block as an opt-in A/B arm). Casts are
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
  gap is why instant burst-cast attacks land before Full Burst begins (no +50%). After FB ends there
  is NO chain-open lock (owner ruling 2026-08-04, overturning the earlier "~2.5-3s post-FB block"
  read): gauge generation is locked during FB and unlocks immediately at FB-end, and the next chain
  opens the moment the refilled bar is full — good teams take ~3-4s of natural generation to rebuild
  from zero, which is what the old bar-anatomy reads mistook for a fixed delay (the recordings also
  start before the 3:00 clock, so video timestamps ≠ fight time). The fixed block survives only as
  the opt-in `ROTMODEL=floor` A/B arm (`POST_FB_CHAIN_DELAY_FRAMES` = 150f). **Fight start:** ~8f (`FIGHT_DELAY_FRAMES`
  0.133s) before the first bullet (bullet lands at 0.133s; the earlier 1s was a timer-framing confound —
  the 3:00 timer reads 2:59:999 at elapsed 0; there is NO multi-second opening phase — the boss is
  hittable from 3:00). The chain timing + natural gauge refill pace high-generation teams.
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
- Auto burst priority is **first-ready, with waiting** (owner ruling 2026-07-21,
  DECISIONS): inside a timed stage window the chain waits for the stage-filling unit
  whose cooldown ends SOONEST (tie → leftmost) rather than handing the cast to a
  lower-priority ready unit. This replaced the old strict-leftmost wait, which let the
  leftmost slot MONOPOLIZE equal-cooldown alternation (a 40-team random battery: ~1/3 of
  comps differed, all first-ready correcting a leftmost monopoly/skip; graded board
  byte-neutral). `B3_LEFTMOST=1` restores the old strict-leftmost pick. (A round-robin
  was tried earlier and rejected — bench B3s cast where real fights never pick them.)
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
  first-ready-with-waiting rule would stall the chain and hand it consecutive casts. Not a
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
(measured: the 3-unit battery fight's 40s rotation). Auto-burst picks the FIRST-READY
unit of the wanted stage — inside a timed stage window the filler whose cooldown ends
soonest (tie → leftmost); `B3_LEFTMOST=1` restores the old strict-leftmost pick
(DECISIONS 2026-07-21). Burst cooldowns
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
## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json, SL10)

```json
{
  "slug": "emma",
  "name": "Emma",
  "weapon": "MG",
  "class": "Supporter",
  "element": "Fire",
  "burst": "I",
  "burstCooldownSec": 40,
  "ammo": 300,
  "reloadFrames": 171,
  "hitsPerShot": 1,
  "normalAttackMultiplier": 5.57,
  "coreAttackMultiplier": 200,
  "burstGaugePerShot": 0.05,
  "manufacturer": "Elysion",
  "releaseDate": "2022-11-04",
  "skills": {
    "skill1": "■ There is a 5% chance to activate when attacked. Affects all allies.\nRecovers 10.77% of the skill user's final Max HP as HP.",
    "skill2": "■ Activates when above 90% HP. Affects all allies.\nIncoming healing ▲ 13.33% continuously.",
    "burst": "■ Affects all allies.\nRecover HP equal to 39.6% of the skill user's final Max HP.\nRecover 39.6% of attack damage as HP over 5 sec."
  },
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 84,
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
    "resourceId": 90
  }
}```

---
## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind)

```json
{
  "slug": "emma",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "5% chance to activate when attacked",
      "disposition": "UNMODELED",
      "scope": "Heal proc — not attack-scoped; fires off INCOMING attacks on emma, not her own fire cycle.",
      "durationSemantics": "Instant one-shot heal per proc; no duration.",
      "triggerIdentity": "\"when attacked\" = on receiving a boss hit, 5% roll. The engine has NO incoming-attack trigger (TriggerDef has no on-damaged kind) and the v1 boss deals no modeled damage — the trigger is unrepresentable, not merely defensive.",
      "targetSet": "All allies (including self) receive the heal; the amount scales off the SKILL USER's final Max HP.",
      "nearestWrongModel": "Approximating it as {kind:'interval'} with an invented boss-attack-rate × 5% cadence (an ALWAYS-⚑ invented trigger+cadence), emitting periodic recovery events that feed crown's on-recovery consumer in every controlComp fixture — manufacturing team damage from a fabricated proc rate. Second-nearest: silently dropping the line without an unmodeled record.",
      "distinguishingAssertion": "Zero heal/recovery events attributable to emma's skill1 across the full run: every recovery event received by crown must be traceable to a real modeled heal source (emma's burstCast heals, crown's own kit), never to an interval-keyed emma block; totals(res) for all four teammates identical with skill1 present vs stripped via withPatchedOverride.",
      "inertness": "skill1 must move NOTHING — no damage, no recovery events, no gauge; the line lives verbatim in override.unmodeled.skill1.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Recovers 10.77% of user's final Max HP",
      "disposition": "UNMODELED",
      "scope": "Heal amount rider on the unrepresentable trigger above.",
      "durationSemantics": "Instant.",
      "triggerIdentity": "Inherits the when-attacked 5% proc — same unrepresentable trigger.",
      "targetSet": "All allies; amount = 10.77% of CASTER's (emma's) final Max HP, not each target's.",
      "nearestWrongModel": "Encoding the magnitude anyway as a casterMaxHpPct/maxHpFlat BUFF (a Max-HP grant) instead of a heal — a stat grant would be a permanently-applied buffApply, visible in the event log and potentially feeding a future HP-scaler, where the kit gives a transient HP recovery.",
      "distinguishingAssertion": "No buffApply with stat 'maxHpFlat' sourced from emma's skill1 slot on any target; ally Max-HP-derived values (e.g. any atkOfMaxHpPct consumer) unchanged with emma present vs absent.",
      "inertness": "No Max-HP buffApply events from skill1; no change to any teammate's HP-scaled ATK.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when above 90% HP",
      "disposition": "UNMODELED",
      "scope": "Condition gate on the incoming-healing buff below.",
      "durationSemantics": "\"continuously\" = maintained passive while the condition holds; at scope lock nobody takes damage, so >90% HP is ALWAYS true — condition-trivial, equivalent to passive.",
      "triggerIdentity": "HP-threshold condition; engine has no HP-pool gate, but since the condition is always satisfied in v1, {kind:'passive'} is the condition-faithful shape IF the effect were modelable.",
      "targetSet": "All allies (including self).",
      "nearestWrongModel": "Treating the >90%-HP clause as un-satisfiable in a sim with no HP pool and marking the line dead-by-gate — inverted: with no incoming damage everyone sits at 100%, so the gate is trivially OPEN, not closed.",
      "distinguishingAssertion": "None needed at runtime (effect below is inert either way); the override's note/unmodeled record must state the gate is trivially satisfied at scope, not the reason for omission — the omission reason is the missing stat primitive.",
      "inertness": "No block-level gate machinery (resourceGate/requiresShielded/etc.) misused to fake an HP threshold.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Incoming healing ▲ 13.33% continuously",
      "disposition": "UNMODELED",
      "scope": "A healing-TAKEN amplifier on allies — modifies heal AMOUNTS, which the engine does not model (heal effects carry no HP quantity); it does NOT create heals.",
      "durationSemantics": "Continuous maintained passive (uptime 100% given the trivially-open >90% gate).",
      "triggerIdentity": "Passive stat buff. Critically NOT a heal: it never fires anyone's 'recovery' trigger by itself.",
      "targetSet": "All allies including self.",
      "nearestWrongModel": "Encoding it as kind:'heal' (misreading \"healing … continuously\" as a heal-over-time) — that would emit recovery events every tick for the whole fight and keep crown's on-recovery buff permanently refreshed, a large team over-credit. Second-nearest: mapping to some existing StatKey (there is no incoming-healing StatKey in the schema) and shipping a phantom buffApply.",
      "distinguishingAssertion": "With emma in controlComp, the count of recovery events crown receives while emma's burst is on cooldown and no other heal source fired is ZERO — crown's recovery-triggered buffApply timestamps must cluster only after real heal casts, never continuously; and no buffApply from emma's skill2 slot appears in the event log at all.",
      "inertness": "Skill2 must emit zero events of any kind; stripping it via withPatchedOverride changes no unit's total. Line recorded verbatim in unmodeled.skill2.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Recover HP equal to 39.6% of user's Max HP",
      "disposition": "FAITHFUL",
      "scope": "Instant team heal on burst cast. The AMOUNT is unmodeled by engine design (heal carries no HP quantity) — the EVENT is the modeled payload, because it drives teammates' 'recovery' triggers (crown sits in every controlComp fixture, so this line is live in every test).",
      "durationSemantics": "Instant, ticks:1 (default).",
      "triggerIdentity": "{kind:'burstCast'} — this sits in emma's OWN burst block, so it fires only on rotations EMMA casts Burst I. It is NOT fullBurstEnter: emma contends for the B1 slot with liter in controlComp, so the two triggers genuinely diverge — fullBurstEnter would fire the heal on every team FB including every liter-led rotation. Burst-cast effects land pre-FB-window (no +50%, irrelevant for a heal but relevant to event timing assertions).",
      "targetSet": "{kind:'allies'} — all allies INCLUDING self (\"Affects all allies\", no except-self clause).",
      "nearestWrongModel": "Keying the heal to {kind:'fullBurstEnter'} — with liter (another B1) in the fixture, that over-fires crown's on-recovery consumer on every full burst regardless of who cast B1, over-crediting crown/team damage on every liter rotation.",
      "distinguishingAssertion": "Collect burstCast events by srcSlot and heal-driven recovery consequences on crown (her recovery-triggered buffApply): every emma-sourced recovery burst must coincide (same frame) with a burstCast event from emma's slot, and NO emma-sourced recovery event may coincide with a fullBurstStart whose preceding B1 cast was liter's. If liter wins every B1 rotation (plausible given her shorter CD), the faithful model produces ZERO emma heals while the nearest-wrong model produces one per FB — maximally separated.",
      "inertness": "Emma's own totalDamage is unaffected by this line (a heal deals no damage); the boss-side event log gains no damage instances from emma's burst slot beyond gauge/rotation effects.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Recover 39.6% of attack damage as HP, 5 sec",
      "disposition": "FIX",
      "scope": "Team lifesteal window: for 5s after emma's burst, allies recover HP proportional to damage they deal. Amount unmodeled (no HP pool); the load-bearing payload is that recovery events keep flowing across the 5s window — refreshing on-recovery consumers (crown) for the window, not just at the cast instant.",
      "durationSemantics": "5-second window, wall-clock (durationSec-shaped, kit says \"over 5 sec\" — not rounds, not stacks).",
      "triggerIdentity": "{kind:'burstCast'} same block as the instant heal; the window's recovery events are damage-coupled in-game, approximated as {kind:'heal', ticks:5, intervalSec:1} since allies fire continuously at scope (every second of the window contains ally damage). The tick-count approximation is a ⚑ convention, not kit-stated cadence.",
      "targetSet": "All allies including self.",
      "nearestWrongModel": "Collapsing it into the instant heal (a single ticks:1 recovery event at cast) — crown's on-recovery buff then gets exactly one refresh per emma burst instead of ~5 over the window, under-crediting her uptime; the symmetric over-read is a fight-length heal-over-time (\"continuously\"-style, duration ≥ 180s) that keeps crown permanently refreshed.",
      "distinguishingAssertion": "After each emma burstCast, emma-sourced recovery events on crown span the [cast, cast+5s] window (≥2 distinct frames within 5s) and NONE occur later than cast+5s before the next emma cast — green under ticks:5/5s, red both under a single-instant collapse (only 1 frame) and under a permanent HoT (events at cast+10s+).",
      "inertness": "No recovery events outside emma's burst-anchored 5s windows; no damage instance is created by this line (it is not a hitRepeat/lifesteal-damage — it converts damage TO healing, never healing to damage).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "burst:instant-team-heal-39.6pct-caster-maxhp",
    "burst:lifesteal-window-5s-recovery-ticks"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "There is a 5% chance to activate when attacked. Affects all allies.",
      "Recovers 10.77% of the skill user's final Max HP as HP."
    ],
    "skill2": [
      "Activates when above 90% HP. Affects all allies.",
      "Incoming healing ▲ 13.33% continuously."
    ],
    "burst": [
      "Heal AMOUNTS (39.6% of caster final Max HP; 39.6% of attack damage) — engine heal effects carry no HP quantity; only the recovery EVENTS are modeled."
    ]
  },
  "notes": "The shared-prior trap for emma is 'pure defensive healer → empty override, everything inert'. That is wrong in exactly one place, and it is in every fixture: controlComp fixes crown at B2, and crown carries an on-recovery consumer, so emma's burst heals are tandem-load-bearing team damage (failure-mode taxonomy #4). The three things the driver must get right: (1) trigger identity burstCast, NOT fullBurstEnter — this is not academic here because liter (another Burst I) is in the standard fixture, so the two readings diverge on every rotation; note also that as a B1 unit contending with liter's shorter cooldown, emma may cast rarely or never in controlComp — a test must first assert emma's burstCast events actually occur (or force them, e.g. patching liter out / a custom comp), else a burstCast-keyed heal is vacuously green; (2) the 5s lifesteal window must produce recovery events ACROSS the window (multi-tick heal), not one instant event and not a permanent HoT; (3) skill2's 'Incoming healing ▲ … continuously' is a heal-TAKEN amplifier with no engine StatKey — it must emit ZERO events, and the nearest-wrong encoding (kind:'heal' misread from 'continuously') would permanently refresh crown and is the single worst over-credit available in this kit. Skill1's 'when attacked' trigger has no engine primitive and the v1 boss deals no damage — any interval-cadence approximation is an invented ⚑ trigger feeding crown from fabricated events; the line belongs verbatim in unmodeled. All magnitudes are kit-literal (DATAMINED); nothing in this kit needs a CALIBRATED value. Emma is Fire vs the Fire control boss — no elemental-advantage interaction to model, and as a Supporter her static ATK basis is the 98,367 class anchor if any future consumer reads it.",
  "model": "claude-fable-5"
}
```

---
## 5. S5 BLIND TEST (claude-opus-5) + its result vs the DRIVER override

Run command: vitest over scripts/kit-autonomy/blind/emma.adapted.test.ts (identical source; only the harness import path adapted). Result vs the driver override: **9 PASS / 5 FAIL / 3 SKIP** (of 17).

The 5 failures, verbatim:
1. 'DISCRIMINATES against the passive-heal mis-read' — expected 0 > 0. Counts events of kind 'heal'/'recovery'; NO such SimEvent kinds exist (the log's only kinds: shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/fullBurstEnd). Its counterfactual patch also writes ov.skill1.blocks on an ARRAY override shape (no-op). Recon artifact.
2. 'recoveries occur, and every one of them is at or after a burst cast' — recoveryFrames collected from nonexistent 'heal'/'recovery' event kinds → empty. Recon artifact.
3. 'the HoT emits MULTIPLE recovery events per burst, spread over ~5 sec' — same nonexistent event kinds. Recon artifact.
4. 'the heal targets ALL allies, not just self' — same nonexistent event kinds (no targetSlug/targetIdx to read). Recon artifact.
5. 'the burst is damage-inert' — filters damage events by a nonexistent 'srcSlug' field (the engine's damage event carries 'slug'), so the filter matches EVERY unit's burst damage; the 5 instances it caught are helm's (slug 'helm', unitIdx 3). emma's own burst-bucket damage is zero (proven by the driver E1 byte-equality + the passing totals assertions here). Recon artifact.

The 9 passes independently confirm: fixture non-vacuity (emma casts ≥2, ≥2 Full Bursts, weapon damage > 0), skill1 inertness (totals unchanged with S1 stripped; no pre-burst recoveries), skill2 inertness (totals unchanged with S2 stripped; no offensive buffApply from emma), no boss debuff, no weapon-state modifier, whole-kit totals inertness.

Blind test source:
```typescript
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/*
 * emma — Emma (MG/Fire/Supporter/Burst I), blind spec test written from kit prose alone.
 *
 * KIT (verbatim structure, quoted short):
 *   skill1: "■ There is a 5% chance to activate when attacked. Affects all allies."
 *           "Recovers 10.77% of the skill user's final Max HP as HP."
 *   skill2: "■ Activates when above 90% HP. Affects all allies."
 *           "Incoming healing ▲ 13.33% continuously."
 *   burst:  "■ Affects all allies."
 *           "Recover HP equal to 39.6% of the skill user's final Max HP."
 *           "Recover 39.6% of attack damage as HP over 5 sec."
 *
 * WHOLE-KIT READ: Emma is a pure sustain unit. Every single line is a HEAL or a
 * heal-amplifier. There is NO damage line, NO ATK/crit/core/element buff, NO weapon-state
 * modifier (no reload/ammo/fire-rate/charge/swap), and NO boss debuff anywhere in the kit.
 * The ONLY sim-relevant payload is the `heal` effect's RECOVERY EVENT, which fires teammates'
 * `recovery` triggers (the tandem/cross-unit rule: a heal inert alone can drive an ally's
 * "on recovery" damage buff — Crown is the canonical consumer). The HP amounts themselves are
 * unmodeled by design (v1 has no HP pool; the boss deals no damage).
 *
 * FIXTURE: controlComp('emma', true) — the standard control comp. Emma is Burst I, so she
 * occupies the B1 slot herself; the fixture still supplies the B2 + B3 units needed for the
 * chain to complete, so her burst actually casts and Full Bursts actually happen. Deterministic
 * (no seed), so event logs and totals are byte-comparable across runs.
 *
 * WHY THE ASSERTIONS DISCRIMINATE — the nearest-wrong models this file is built to fail under:
 *   (a) skill1 keyed to `passive` or `shotFired` instead of a proc that cannot fire at scope
 *       lock. "when attacked" is a DEFENSIVE trigger; the scope-lock boss deals no damage to
 *       the team, so the condition is NEVER satisfied. Encoding it as an always-on/per-shot
 *       recovery emitter would spray recovery events across the whole fight and over-credit any
 *       on-recovery consumer by orders of magnitude. Asserted as an EVENT-COUNT bound, and
 *       discriminated against a patched `passive`+`heal` counterfactual.
 *   (b) burst line 1 keyed to fullBurstEnter instead of burstCast. Trigger identity: the block
 *       lives in Emma's OWN burst slot with no "entering Full Burst" clause, so it is a
 *       burst-cast effect — it fires on rotations EMMA bursts, not on any team Full Burst.
 *       Discriminated by comparing recovery-event frames against burstCast frames.
 *   (c) burst line 2 ("over 5 sec") collapsed into a single instant heal. It is a heal-over-time:
 *       under the `heal` effect's ticks/intervalSec contract it must emit MULTIPLE recovery
 *       events spread over a 5s window, because each tick is what keeps an on-recovery consumer
 *       refreshed. One event = a wrong duty cycle for every downstream consumer.
 *   (d) skill2 "Incoming healing ▲" mis-encoded as a generic offensive stat (attackDamagePct /
 *       atkPct). Scope: it modifies HEALING RECEIVED, not damage. There is no incoming-healing
 *       StatKey in the schema and no HP pool to amplify, so it is a GAP — and critically it must
 *       be OFFENSIVELY INERT. Asserted by comparing Emma's comp against a variant with her whole
 *       skill2 emptied: total damage must be byte-identical for EVERY unit.
 *   (e) any line silently granting damage. A whole-kit inertness assertion pins that no buffApply
 *       Emma casts carries an offensive stat.
 *
 * NON-VACUITY: the fixture is asserted to actually exercise the active case — Emma casts her
 * burst at least twice and at least one Full Burst occurs — before any "fires on burst" claim is
 * read. Without that, an assertion that "recoveries only happen at burst frames" would pass
 * trivially on an empty log.
 *
 * RUN BUDGET: 4 full 180s sims, all hoisted to module scope.
 */

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const SLUG = 'emma';

// ---- hoisted runs -------------------------------------------------------

// 1. Baseline: Emma with her committed override.
const base = run(controlComp(SLUG, true));

// 2. Counterfactual: Emma's skill2 stripped to nothing. If skill2 is faithfully
//    modeled as an offensively-inert heal-amplifier (or an honest GAP), removing it
//    cannot move a single damage number.
const noSkill2Ov = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill2) ov.skill2.blocks = [];
});
const noSkill2 = run({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: noSkill2Ov },
});

// 3. Counterfactual: Emma's skill1 stripped. "5% chance when attacked" cannot fire at
//    scope lock (the boss deals no damage), so removing it must also be damage-inert AND
//    must not remove any recovery events — there should be none to remove.
const noSkill1Ov = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill1) ov.skill1.blocks = [];
});
const noSkill1 = run({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: noSkill1Ov },
});

// 4. Nearest-wrong for skill1: the same heal re-keyed to a `passive` trigger — the mis-read
//    that treats a defensive proc as an always-on emitter. This MUST produce a materially
//    different recovery-event profile than the faithful model; if it doesn't, the baseline is
//    already spraying recoveries.
const passiveS1Ov = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill1) {
    ov.skill1.blocks = [
      {
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'allies' },
        effects: [{ kind: 'heal', ticks: 1 }],
      },
    ];
  }
});
const passiveS1 = run({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: passiveS1Ov },
});

// ---- helpers ------------------------------------------------------------

const emmaIdx = (() => {
  const withIdx = base.events.find(
    (e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === SLUG,
  ) as { casterIdx?: number; slot?: number } | undefined;
  return withIdx?.casterIdx ?? withIdx?.slot ?? null;
})();

const burstCastFrames = base.events
  .filter((e) => e.kind === 'burstCast' && (e as { slug?: string }).slug === SLUG)
  .map((e) => Number((e as { frame?: number }).frame ?? 0));

const fullBurstFrames = base.events
  .filter((e) => e.kind === 'fullBurstStart')
  .map((e) => Number((e as { frame?: number }).frame ?? 0));

// recovery events attributable to Emma. The engine's heal effect emits a recovery-flavored
// event; we accept either an explicit 'heal'/'recovery' kind so the assertion does not hinge
// on one spelling, and filter by caster where the field is present.
const emmaRecoveries = base.events.filter((e) => {
  if (e.kind !== 'heal' && e.kind !== 'recovery') return false;
  const caster = (e as { casterIdx?: number | null; casterSlug?: string });
  if (caster.casterSlug !== undefined) return caster.casterSlug === SLUG;
  if (caster.casterIdx !== undefined && caster.casterIdx !== null && emmaIdx !== null) {
    return caster.casterIdx === emmaIdx;
  }
  return true;
});

const recoveryFrames = emmaRecoveries.map((e) => Number((e as { frame?: number }).frame ?? 0));

const OFFENSIVE_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
  'atkOfCasterMaxHpPct',
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
  'damageTakenPct',
  'trueDamagePct',
  'elemAdvantageDamagePct',
  'extraHitDamagePct',
  'normalAttackPct',
  'maxAmmoPct',
  'maxAmmoFlat',
  'reloadSpeedPct',
  'attackSpeedPct',
  'fireRatePct',
  'chargeSpeedPct',
  'burstGenPct',
  'hitRatePct',
  'pelletCountFlat',
]);

describe('emma — fixture non-vacuity', () => {
  it('the control comp actually casts Emma\'s burst and reaches Full Burst', () => {
    // Without this, every "fires on burst" assertion below would pass on an empty log.
    expect(burstCastFrames.length).toBeGreaterThanOrEqual(2);
    expect(fullBurstFrames.length).toBeGreaterThanOrEqual(2);
  });

  it('Emma is in the comp and deals her own weapon damage', () => {
    const emma = unitOf(base.res, SLUG);
    expect(emma.totalDamage).toBeGreaterThan(0);
  });
});

describe('emma skill1 — "5% chance to activate when attacked" (allies heal)', () => {
  // DISPOSITION: GAP / inert-at-scope. The trigger is DEFENSIVE — it requires the team to be
  // attacked. The scope-lock boss deals no damage to the team and the sim models no incoming
  // damage at all, so the activation condition is never satisfied. There is no "whenAttacked"
  // TriggerDef in the schema, which is consistent with it being unreachable.
  //
  // NEAREST-WRONG: keying it to `passive` (or `shotFired`) so it emits recoveries anyway.
  // That would over-credit any on-recovery consumer massively.

  it('emits no free-running recovery stream (the proc cannot fire at scope lock)', () => {
    // Whatever recoveries exist must be attributable to the burst, not to skill1. Concretely:
    // there must be no recovery in the long stretch before Emma's FIRST burst cast, which is
    // exactly where a mis-keyed passive/per-shot heal would show up.
    const firstBurst = burstCastFrames[0];
    const preBurstRecoveries = recoveryFrames.filter((f) => f < firstBurst);
    expect(preBurstRecoveries).toEqual([]);
  });

  it('removing skill1 entirely changes nothing (it is inert at scope lock)', () => {
    // Damage-inert for every unit...
    expect(totals(noSkill1.res)).toEqual(totals(base.res));
    // ...and it contributes no recovery events either.
    const noS1Recoveries = noSkill1.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery',
    ).length;
    const baseRecoveries = base.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery',
    ).length;
    expect(noS1Recoveries).toBe(baseRecoveries);
  });

  it('DISCRIMINATES against the passive-heal mis-read', () => {
    // The nearest-wrong model sprays a recovery every frame/tick from t=0. If the baseline were
    // already doing that, this counterfactual would be indistinguishable from it.
    const passiveRecoveries = passiveS1.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery',
    ).length;
    const baseRecoveries = base.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery',
    ).length;
    expect(passiveRecoveries).toBeGreaterThan(baseRecoveries);
  });
});

describe('emma skill2 — "Incoming healing ▲ 13.33% continuously" (all allies, >90% HP)', () => {
  // DISPOSITION: GAP. "Incoming healing" amplifies HEALING RECEIVED. There is no incoming-heal
  // StatKey in the schema, no HP pool, and no healing MAGNITUDE modeled (the `heal` effect emits
  // an event, not an amount) — so there is nothing for this to scale. The "above 90% HP" gate is
  // trivially always-true at scope lock (nobody takes damage), so the line is CONTINUOUSLY
  // active and CONTINUOUSLY inert.
  //
  // NEAREST-WRONG: encoding it as a generic offensive stat (attackDamagePct/atkPct 13.33) — a
  // team-wide +13.33% damage buff that the kit never grants. That is the failure this pins.

  it('is offensively inert — removing skill2 moves NO unit\'s damage', () => {
    expect(totals(noSkill2.res)).toEqual(totals(base.res));
  });

  it('grants no offensive stat to anyone', () => {
    const emmaOffensiveBuffs = base.events.filter((e) => {
      if (e.kind !== 'buffApply') return false;
      const b = e as { stat?: string; casterIdx?: number | null; casterSlug?: string };
      if (!b.stat || !OFFENSIVE_STATS.has(b.stat)) return false;
      if (b.casterSlug !== undefined) return b.casterSlug === SLUG;
      if (b.casterIdx !== undefined && b.casterIdx !== null && emmaIdx !== null) {
        return b.casterIdx === emmaIdx;
      }
      return false;
    });
    expect(emmaOffensiveBuffs).toEqual([]);
  });

  it.skip('GAP: "Incoming healing ▲ 13.33%" has no primitive — no incoming-heal StatKey, no HP pool, no heal magnitude modeled. Unobservable payload at scope lock; belongs in `unmodeled.skill2`.', () => {});

  it.skip('GAP: the "above 90% HP" activation gate is unobservable — the sim models no HP loss, so the gate is trivially always-true and has no inactive case to discriminate against.', () => {});
});

describe('emma burst — instant ally heal + 5s heal-over-time (all allies)', () => {
  // Line 1: "Recover HP equal to 39.6% of the skill user's final Max HP." — instant, all allies.
  // Line 2: "Recover 39.6% of attack damage as HP over 5 sec." — a heal-over-TIME window.
  //
  // TRIGGER IDENTITY (the discriminating question): the block sits in Emma's OWN burst slot with
  // NO "entering Full Burst" clause → burstCast, NOT fullBurstEnter. Emma is Burst I, so in this
  // fixture she casts on every rotation and the two frames sit close together — which is exactly
  // why the assertion is written against the burstCast frame ORDERING rather than a count match.
  //
  // TARGET SET: "Affects all allies" — allies INCLUDING self (no "except self" clause).
  //
  // DURATION SEMANTICS: "over 5 sec" is wall-clock, and under the `heal` effect contract a HoT
  // sets ticks:N (intervalSec default 1) so it emits N recovery events across the window. A
  // single instant event is the nearest-wrong model: it gives an on-recovery consumer one refresh
  // instead of five, collapsing the intended duty cycle.

  it('recoveries occur, and every one of them is at or after a burst cast', () => {
    expect(recoveryFrames.length).toBeGreaterThan(0);
    const firstBurst = burstCastFrames[0];
    for (const f of recoveryFrames) {
      expect(f).toBeGreaterThanOrEqual(firstBurst);
    }
  });

  it('the HoT emits MULTIPLE recovery events per burst, spread over ~5 sec', () => {
    // Nearest-wrong: the whole burst modeled as ONE instant heal → exactly one recovery per cast.
    // Faithful: instant heal + a ticking 5s HoT → several, and the last one lands meaningfully
    // after the cast frame.
    const firstBurst = burstCastFrames[0];
    const secondBurst = burstCastFrames[1] ?? Number.POSITIVE_INFINITY;
    const window = recoveryFrames.filter((f) => f >= firstBurst && f < secondBurst);
    expect(window.length).toBeGreaterThan(1);
    // The window must actually STRETCH — a burst of simultaneous events on the cast frame would
    // be a different (also wrong) model.
    const span = Math.max(...window) - Math.min(...window);
    expect(span).toBeGreaterThan(0);
    // "over 5 sec" at 60fps = 300 frames; allow the tick pattern to end anywhere inside it.
    expect(span).toBeLessThanOrEqual(300);
  });

  it('the heal targets ALL allies, not just self', () => {
    // "Affects all allies" with no exclude-self clause. A self-only mis-scope would produce
    // recovery events for exactly one target.
    const targets = new Set(
      emmaRecoveries
        .map((e) => (e as { targetSlug?: string; targetIdx?: number }).targetSlug
          ?? String((e as { targetIdx?: number }).targetIdx ?? ''))
        .filter((t) => t !== ''),
    );
    expect(targets.size).toBeGreaterThan(1);
  });

  it('the burst is damage-inert — Emma\'s kit has no damage line at all', () => {
    // Whole-kit invariant: a pure sustain kit must contribute ZERO burst-bucket damage.
    // If a future edit invents a flatDamage rider to "explain" a board gap, this goes red.
    const emmaBurstDamage = base.events.filter((e) => {
      if (e.kind !== 'damage') return false;
      const d = e as { bucket?: string; srcSlot?: string; srcSlug?: string };
      if (d.srcSlug !== undefined && d.srcSlug !== SLUG) return false;
      return d.srcSlot === 'burst';
    });
    expect(emmaBurstDamage).toEqual([]);
  });

  it.skip('GAP: the healed AMOUNT (39.6% of final Max HP; 39.6% of attack damage) is unobservable — the `heal` effect models no HP quantity, so neither magnitude can be asserted. Both belong in the override note as recorded-for-completeness values.', () => {});
});

describe('emma — whole-kit inertness', () => {
  it('Emma\'s presence changes no teammate\'s damage through any stat channel', () => {
    // Combined counterfactual: with BOTH non-burst skills stripped, the whole board is unmoved.
    // This is the strongest form of the claim — Emma is a sustain unit whose only sim-visible
    // payload is the recovery EVENT (a tandem hook for on-recovery consumers, of which this
    // fixture contains none).
    expect(totals(noSkill1.res)).toEqual(totals(base.res));
    expect(totals(noSkill2.res)).toEqual(totals(base.res));
  });

  it('Emma applies no boss debuff', () => {
    // Boss-held debuffs emit buffApply with casterIdx === null AND targetIdx === null.
    // The kit contains no "Damage Taken ▲" or any enemy-facing line.
    const bossDebuffs = base.events.filter((e) => {
      if (e.kind !== 'buffApply') return false;
      const b = e as { casterIdx?: number | null; targetIdx?: number | null; stat?: string };
      return b.casterIdx === null && b.targetIdx === null && b.stat === 'damageTakenPct';
    });
    expect(bossDebuffs).toEqual([]);
  });

  it('Emma applies no weapon-state modifier (no reload/ammo/fire-rate line in the kit)', () => {
    const weaponStats = new Set([
      'reloadSpeedPct',
      'maxAmmoPct',
      'maxAmmoFlat',
      'fireRatePct',
      'attackSpeedPct',
      'chargeSpeedPct',
    ]);
    const weaponBuffs = base.events.filter((e) => {
      if (e.kind !== 'buffApply') return false;
      const b = e as { stat?: string; casterSlug?: string; casterIdx?: number | null };
      if (!b.stat || !weaponStats.has(b.stat)) return false;
      if (b.casterSlug !== undefined) return b.casterSlug === SLUG;
      if (b.casterIdx !== undefined && b.casterIdx !== null && emmaIdx !== null) {
        return b.casterIdx === emmaIdx;
      }
      return false;
    });
    expect(weaponBuffs).toEqual([]);
  });
});
```

---
## 6. S6 BLIND OVERRIDE (claude-opus-5) + diff vs the driver override

DIFF SUMMARY (driver vs blind): FUNCTIONALLY IDENTICAL. Both have skill1:[], skill2:[], and the same two burst blocks — burstCast→allies→heal ticks:1, and burstCast→allies→heal ticks:5 intervalSec:1. Both carry the same unmodeled sets (S1: the attacked-proc line; S2: the incoming-healing line; burst: empty). Only behavioral-neutral diffs: (a) the blind splits each unmodeled slot into two entries and drops the leading ■ marker; the driver keeps one verbatim entry per slot with the ■; (b) caveat wording differs (same content); (c) the blind result JSON carries its audit/flags outside the override. Zero behavioral difference.

S6 audit excerpt (per-line dispositions, blind-derived): skill1 5%-attacked → SKIPPED (no on-incoming-damage TriggerDef; boss deals no damage); skill1 10.77 heal → SKIPPED (payload of unfirable trigger; inventing a cadence would fabricate recovery events); skill2 >90% gate → SKIPPED (trivially satisfied but gated effect unrepresentable); skill2 13.33 incoming-healing → SKIPPED (no StatKey; heal amounts unmodeled); burst both lines → IMPLEMENTED identically.

S6 flags: [⚑ ticks:5/intervalSec:1 — the ONLY knob that changes anything measurable; recipe = count an on-recovery consumer's refresh popups across the 5s window] + [⚑ skill1 omitted — 0 activations at scope lock].

Blind override JSON:
```json
{
  "slug": "emma",
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
      "effects": [
        {
          "kind": "heal",
          "ticks": 5,
          "intervalSec": 1
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "There is a 5% chance to activate when attacked. Affects all allies.",
      "Recovers 10.77% of the skill user's final Max HP as HP."
    ],
    "skill2": [
      "Activates when above 90% HP. Affects all allies.",
      "Incoming healing ▲ 13.33% continuously."
    ],
    "burst": []
  },
  "caveats": [
    "Emma's entire kit is healing/heal-amplification. She carries NO damage line, NO ATK/crit/damage-bucket stat, and NO burst-CDR — at scope lock she is offensively inert EXCEPT as a source of `recovery` events for heal-synergy consumers (a teammate whose kit reads 'when recovery takes effect'). Her whole modeled value is therefore the burst's two recovery emissions; judge this override on TANDEM behaviour, not on her own damage.",
    "The engine's `heal` effect models NO HP amount (v1 has no HP pool and the boss deals no damage), so both burst percentages (39.6% of caster final Max HP; 39.6% of attack damage over 5 sec) are recorded for kit completeness only and move no number by themselves.",
    "⚑ burst HoT tick cadence (5 ticks @ 1 s) is an UNMEASURED convention — the kit says 'over 5 sec' and gives no tick rate. Tick COUNT is what drives an on-recovery consumer's refresh count, so this estimate is load-bearing for tandem comps.",
    "⚑ skill1 is unmodeled: TriggerDef has no 'when attacked' primitive and the v1 boss deals no damage to the team, so a 5%-on-incoming-attack heal has no derivable firing rate. Modeled activations = 0. If a real incoming-damage model ever lands, this becomes a recurring recovery source and must be revisited.",
    "⚑ skill2 is unmodeled: 'Incoming healing ▲ 13.33%' has no StatKey (no heal-magnitude channel exists) and heal amounts are not simulated. Its 'above 90% HP' gate is trivially TRUE at scope lock (nobody takes damage), so the only thing lost is the magnitude, not the condition.",
    "⚑ Base-weapon cadence (MG, 300 ammo, reloadFrames 171) comes from the datamine, which is unreliable for rate_of_fire/reloadFrames; the MG wind-up ladder is an engine-side measured constant. Nothing in this override touches it."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Emma (emma) is an MG/Fire/Supporter/Burst I pure healer. Modeled: her burst's two recovery lines, both as `heal` effects on burstCast → allies (self included; the text says plain 'all allies' with no exception clause) — an instant single-event heal for the flat 'Recover HP equal to 39.6% of final Max HP' line, and a 5-tick/1 s heal-over-time for the 'Recover 39.6% of attack damage as HP over 5 sec' line, so an on-recovery consumer stays refreshed across the window. Deliberately unmodeled: skill1 (no 'when attacked' trigger primitive; the scope-lock boss deals no damage, so the 5% proc has no derivable rate) and skill2 ('Incoming healing ▲' has no StatKey and heal magnitudes are not simulated). No damage, stat, weapon-state, gauge, or CDR effect exists anywhere in this kit, so no fbGate/noFb/range decision applies."
}
```

---
## 7. DRIVER IMPLEMENTATION (what you are judging)

### 7a. Driver unit test — scripts/tests/units/emma.test.ts (15/15 GREEN vs the shipped override; fixture: emma/liter/admi/asuka, boss Fire, focus asuka; asuka's burst lifesteal patched out so emma is the sole recovery source)

Calibrated rotation anatomy (deterministic, 180s): emma casts 5× (t≈7.1/44.8/85.2/117.1/167.4s); 4 Full Bursts (t≈8.5/56.0/97.7/148.2s) — 1 emma-led, 3 liter-led; 4 of emma's 5 casts stall without completing a chain (asuka's 40s B3 CD paces completion). burstCast vs fullBurstEnter diverge in BOTH directions (30 vs 24 recovery landings on asuka).

```typescript
// PER-UNIT KIT SPEC — `emma` (Emma, MG/Fire/Supporter/Burst I, Elysion, ammo 300,
// hitsPerShot 1, reloadFrames 171, burst CD 40s). Kit-autonomy gauntlet 2026-08-05
// (BASE unit — NOT emma-tactical-upgrade, the environment-setup Burst I variant;
// never the bare base name).
//
// Emma is a PURE HEALER and the MG clean-weapon basis cell (scripts/tests/lib/harness.ts
// CLEAN_WEAPON_TEAMS.b): her kit contributes NOTHING to her own damage. Every line is
// either a RECOVERY EVENT (the engine models a heal as an event that fires teammates'
// on-recovery consumers, NOT a number — there is no HP pool / survivability sim) or an
// out-of-domain sustain line with no engine primitive. Her personal damage is weapon-only;
// her board value is tandem (she refreshes recovery-consumer teammates such as
// Asuka/Crown to near-permanent self/team buffs).
//
// Kit (data/characters.json → characters.emma.skills, SL10):
//   S1 ■ 5% chance to activate when attacked → all allies: Recovers 10.77% of the skill
//      user's final Max HP as HP                                                    [E4 gap]
//   S2 ■ Activates when above 90% HP → all allies: Incoming healing ▲13.33%
//      continuously                                                                 [E4 gap]
//   BU ■ all allies: Recover HP equal to 39.6% of the skill user's final Max HP     [E2]
//      ■ all allies: Recover 39.6% of attack damage as HP over 5 sec               [E3]
//
// One assertion group per kit line (E1..E4), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against) and to ISOLATE a burst line whose
// effect is otherwise masked by the other — never to supply the encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (a test that cannot fail under the nearest wrong model
// gates nothing — and ALL of emma's lines are offensively inert, so TOTALS alone cannot
// discriminate; the load-bearing evidence is the EVENT LOG, read through a recovery
// CONSUMER):
//   E1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME
//       comp), and a heal→attackDamagePct counterfactual MOVES the team — so the inertness
//       is live, not a vacuous "nothing happens". (CW1's solo damage-neutrality pin in
//       clean-weapons.test.ts covers the bursts-off basis; this is the bursts-on, in-team
//       half.)
//   E2  the burst's instant heal is keyed to her OWN burst cast (burstCast), not
//       fullBurstEnter. The fixture fields TWO Burst I units (emma CD 40s + liter CD 20s)
//       and a 40s-CD Burst III, so the two keyings genuinely diverge IN BOTH DIRECTIONS
//       (calibrated anatomy, 180s: 5 emma casts — 1 opens a Full Burst, 4 stall before the
//       chain completes; 4 Full Bursts — 1 emma-led, 3 opened by liter). A fullBurstEnter
//       encoding heals on the 3 liter-led windows emma never cast in and DROPS her 4
//       stalled-chain casts: a different volley set, and a different firing count, than the
//       faithful model (her burst skill heals when SHE casts, chain completion irrelevant).
//       Isolating the instant line (HoT stripped) leaves recovery firings == her burstCast
//       count, exactly 1 per own cast.
//   E3  the burst's lifesteal line ("over 5 sec") is a 5-tick HoT cadence: asuka's recovery
//       consumer fires 5× per emma cast off that line alone; a ticks:1 counterfactual
//       collapses it to 1 per cast. Both lines together land 6 recoveries per cast.
//   E4  the two unmodelable lines (5%-on-attacked heal 10.77; incoming-healing 13.33) are
//       documented verbatim in `unmodeled`, never an `ignored` drop; emma originates ZERO
//       buffs of any kind (her only in-domain payload is recovery events); none of her kit
//       magnitudes appears as any buff value.
//
// FIXTURE. emma (B1, 40s) / liter (B1, 20s) / admi (B2, 20s) / asuka (B3 recovery
// consumer), boss Fire, focus asuka. Two B1s + a 40s-CD B3 so burstCast-vs-fullBurstEnter
// genuinely diverge (emma casts that stall without a Full Burst; liter-led windows emma
// never casts in — the E2 premise); liter and admi are recovery-silent (no heal effects,
// no recovery triggers, no shields). asuka's own burst lifesteal is patched OUT so emma is
// the SOLE recovery source — every landing of emma's heal on asuka fires asuka's S1 ("when
// recovery takes effect" → self atkPct 96.98), so counting asuka's self atkPct-96.98
// buffApply events counts emma's recovery landings on her. Deterministic (no seed). Slot
// order: emma 0 / liter 1 / admi 2 / asuka 3.
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

const SLUGS = ['emma', 'liter', 'admi', 'asuka'];
/** Slot order: emma 0 / liter 1 / admi 2 / asuka 3. */
const EMMA = 0;
const ASUKA = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

/** asuka's burst lifesteal removed → emma is the only recovery source in the fight. */
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
    bossElement: 'Fire',
    focusSlug: 'asuka',
    overrides: { asuka: asukaSoleConsumer, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactual / isolation patches (nearest-wrong models) -------------------------------
/** E2 counterfactual: both burst blocks re-keyed to fullBurstEnter (fires on EVERY Full
 *  Burst window, including the ones liter opens without emma). */
const emmaFullBurstEnter = withPatchedOverride('emma', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('emma burst missing — fixture is stale');
  }
  for (const b of ov.burst) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
/** E2 isolation: the HoT block stripped, leaving only the instant heal line. */
const emmaInstantOnly = withPatchedOverride('emma', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('emma burst missing — fixture is stale');
  }
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'heal' && (e.ticks ?? 1) > 1)
  );
  if (ov.burst.length === before) {
    throw new Error('emma burst HoT block missing — fixture is stale');
  }
});
/** E3 counterfactual: the lifesteal HoT collapsed to a single instant tick (nearest wrong
 *  reading of "over 5 sec"). */
const emmaTicks1 = withPatchedOverride('emma', (ov) => {
  let found = false;
  for (const b of ov.burst ?? []) {
    for (const e of b.effects) {
      if (e.kind === 'heal' && (e.ticks ?? 1) > 1) {
        e.ticks = 1;
        found = true;
      }
    }
  }
  if (!found) {
    throw new Error('emma burst HoT heal missing — fixture is stale');
  }
});
/** E1 counterfactual: both burst heals re-encoded as a damage buff — the nearest wrong
 *  "make her burst do something offensive" model (must MOVE totals). */
const emmaHealAsDamage = withPatchedOverride('emma', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('emma burst missing — fixture is stale');
  }
  for (const b of ov.burst) {
    b.effects = [
      { kind: 'buff', stat: 'attackDamagePct', value: 39.6, durationSec: 10 },
    ];
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const bareInTeam = run({ emma: bareWeaponOverride('emma') });
const fullBurstEnter = run({ emma: emmaFullBurstEnter });
const instantOnly = run({ emma: emmaInstantOnly });
const ticks1 = run({ emma: emmaTicks1 });
const healAsDamage = run({ emma: emmaHealAsDamage });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** asuka's recovery consumer firings = her self atkPct-96.98 buff (one per recovery landing). */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
  ).length;
const emmaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'emma').length;
const fullBurstStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('emma') as any;
if (!shipped) {
  throw new Error('emma has no override on disk — fixture is stale');
}
const allBlocks = [...(shipped.burst ?? [])];

describe('emma — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: emma casts her Burst I and Full Bursts occur', () => {
    // Non-vacuity gate for every burst-keyed assertion below: a comp that never completes a
    // chain makes zero Full Bursts and would let the burst groups pass silently on empty sets.
    expect(emmaBursts(base.events)).toBeGreaterThan(0);
    expect(fullBurstStarts(base.events)).toBeGreaterThan(0);
  });

  it('burstCast and fullBurstEnter genuinely diverge here — the E2 discrimination premise', () => {
    // Two B1s + a 40s-CD B3: emma's cast count and the Full Burst count DISAGREE in both
    // directions — some FB windows are liter-led (emma never cast) and most emma casts stall
    // before the chain completes (asuka's B3 CD paces completion). Calibrated anatomy, 180s:
    // emma 5 casts (1 FB-led, 4 stalled) vs 4 Full Bursts (1 emma-led, 3 liter-led). If the
    // two counts ever matched, burstCast-vs-fullBurstEnter would be untestable here.
    expect(fullBurstStarts(base.events)).not.toBe(emmaBursts(base.events));
    expect(emmaBursts(base.events)).toBeGreaterThan(0);
    expect(fullBurstStarts(base.events)).toBeGreaterThan(0);
  });

  it('emma deals weapon damage (MG output) — inertness asserts are not vacuous zeros', () => {
    expect(unitOf(base.res, 'emma').totalDamage).toBeGreaterThan(0);
  });
});

describe('E1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // The MG clean-weapon basis cell (bursts-on, in-team half; CW1 pins the bursts-off solo
    // half): with emma's kit swapped for the empty kit, her own total must not move a point.
    expect(unitOf(base.res, 'emma').totalDamage).toBe(
      unitOf(bareInTeam.res, 'emma').totalDamage
    );
  });

  it('DISCRIMINATING: re-encoding the heals as a damage buff MOVES the team', () => {
    // Proves the E1 inertness claim is live, not a vacuous "nothing happens": a heal→
    // attackDamagePct swap is the nearest wrong "make the burst do something" model, and it
    // must change totals — i.e. the shipped inertness is one that model provably fails.
    expect(totals(healAsDamage.res)).not.toEqual(totals(base.res));
  });
});

describe('E2 — burst instant heal is keyed to her OWN burst cast (burstCast, not fullBurstEnter)', () => {
  it('isolating the instant line leaves recovery firings == emma\u2019s burstCast count', () => {
    // "Affects all allies. Recover HP equal to 39.6% ... final Max HP" fires on her cast.
    // With the HoT line stripped, the only recovery source is the instant heal — one landing
    // per ally per emma cast. (fullBurstEnter keying would fire one volley per FB window,
    // including the windows liter opens alone — pinned next.)
    expect(recoveryFirings(instantOnly.events)).toBe(
      emmaBursts(instantOnly.events)
    );
    expect(emmaBursts(instantOnly.events)).toBeGreaterThan(0);
  });

  it('DISCRIMINATING: fullBurstEnter keying heals a DIFFERENT volley set', () => {
    // The nearest wrong keying fires one volley (instant + 5 HoT ticks = 6 landings) per FULL
    // BURST window — 3 of the 4 are liter-led rotations emma never cast in — and DROPS her 4
    // stalled-chain casts (no Full Burst ever followed them). Her burst skill heals when SHE
    // casts, chain completion irrelevant: the shipped encoding must produce a strictly
    // different firing count than the window-keyed one.
    expect(recoveryFirings(fullBurstEnter.events)).toBe(
      6 * fullBurstStarts(fullBurstEnter.events)
    );
    expect(recoveryFirings(fullBurstEnter.events)).not.toBe(
      recoveryFirings(base.events)
    );
  });
});

describe('E3 — burst lifesteal line "over 5 sec" is a 5-tick recovery cadence', () => {
  it('both lines together land 6 recoveries per ally per emma cast', () => {
    // Instant heal (1) + lifesteal HoT (5 ticks over 5s) = 6 recovery landings per cast,
    // read through asuka's consumer. Exact multiple: no cast's HoT is truncated by the 180s
    // end in this fixture (calibrated; see the per-cast derivation).
    expect(recoveryFirings(base.events)).toBe(6 * emmaBursts(base.events));
  });

  it('DISCRIMINATING: a ticks:1 counterfactual collapses the cadence to 2 per cast', () => {
    // The nearest wrong reading of "over 5 sec" is one instant tick. It must produce exactly
    // one landing per line per cast (2), strictly fewer than the shipped 6 — proving the
    // 5-tick cadence is the one that fits the prose.
    expect(recoveryFirings(ticks1.events)).toBe(2 * emmaBursts(ticks1.events));
    expect(recoveryFirings(ticks1.events)).toBeLessThan(
      recoveryFirings(base.events)
    );
  });
});

describe('E4 — the two unmodelable lines are documented, not dropped or fabricated', () => {
  it('emma originates ZERO buffs — her only in-domain payload is recovery events', () => {
    // Her kit text has no ▲ damage stat for allies: S1/S2 are sustain lines without engine
    // primitives and the burst is pure recovery. Any buff carrying her slot index is an
    // invented offensive contribution.
    expect(
      buffs(base.events).filter((b) => b.casterIdx === EMMA)
    ).toHaveLength(0);
  });

  it('her kit magnitudes never appear as any buff value', () => {
    // 10.77 (S1 heal), 13.33 (incoming healing), 39.6 (burst) are recovery amounts or
    // unmodelable multipliers — none may surface as a buff stat value anywhere in the log.
    for (const v of [10.77, 13.33, 39.6]) {
      expect(buffs(base.events).some((b) => b.value === v)).toBe(false);
    }
  });

  it('both gap lines live verbatim in `unmodeled` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.skill1?.length).toBeGreaterThan(0);
    expect(shipped.unmodeled?.skill2?.length).toBeGreaterThan(0);
    expect(shipped.unmodeled.skill1.join(' ')).toContain('10.77');
    expect(shipped.unmodeled.skill1.join(' ')).toContain('5%');
    expect(shipped.unmodeled.skill2.join(' ')).toContain('13.33');
    expect(shipped.unmodeled.skill2.join(' ')).toContain('90%');
    expect((shipped as any).ignored).toBeUndefined();
  });
});

describe('structural pins (S2b-pre-registered traps, adopted at S2c)', () => {
  it('every burst block is keyed to burstCast, never fullBurstEnter', () => {
    // Load-bearing for a Burst-I unit beside another B1: fullBurstEnter over-fires on the
    // windows the other B1 opens. Asserted statically so it holds regardless of fixture.
    for (const b of allBlocks) {
      expect(b.trigger?.kind).toBe('burstCast');
    }
  });

  it('heal is the ONLY effect kind in the kit — no buff, no damage, no shield', () => {
    // A shield would emit shielded events and falsely satisfy teammates' requiresShielded
    // gates (asuka's S2); a buff/damage effect would move damage. Both are forbidden for a
    // clean-weapon healer whose entire payload is recovery events.
    const kinds = allBlocks.flatMap((b: any) => b.effects.map((e: any) => e.kind));
    expect(kinds.length).toBeGreaterThan(0);
    expect([...new Set(kinds)]).toEqual(['heal']);
  });

  it('every burst block targets all allies', () => {
    for (const b of allBlocks) {
      expect(b.target?.kind).toBe('allies');
    }
  });
});
```

### 7b. Driver override — src/skills/overrides/emma.json (validate-overrides clean; CW1 damage-neutrality GREEN with the override on disk; emma unit suite 15/15)

```json
{
  "slug": "emma",
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
      "effects": [
        {
          "kind": "heal",
          "ticks": 5,
          "intervalSec": 1
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "■ There is a 5% chance to activate when attacked. Affects all allies.\nRecovers 10.77% of the skill user's final Max HP as HP."
    ],
    "skill2": [
      "■ Activates when above 90% HP. Affects all allies.\nIncoming healing ▲ 13.33% continuously."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ HoT tick granularity: the burst's lifesteal line is stated 'over 5 sec' with NO per-second clause, so ticks:5/intervalSec:1 is an ESTIMATE (marciana's 'over 3 sec' precedent). Tick count is the only thing that block contributes (no HP pool), and it directly scales how many times a teammate's on-recovery consumer fires per emma burst — over-stating ticks over-credits that teammate.",
    "Heal MAGNITUDES (skill1 10.77% of the caster's final Max HP; burst 39.6% of the caster's final Max HP instant + 39.6% of attack damage lifesteal) are recorded here but NOT modeled: the 'heal' effect emits a recovery event with no HP amount, and v1 has no HP pool. Both burst lines are implemented for their TANDEM value only (they fire allies' 'recovery' triggers).",
    "skill1's 'when attacked' trigger has NO engine primitive (TriggerDef has no on-damaged kind) and the v1 boss never acts — the 5% proc can never fire at scope lock. An interval-cadence approximation would fabricate a proc rate from nothing; the line is omitted, not proxied (jackal/maiden/admi attacked-cluster precedent).",
    "skill2's 'above 90% HP' gate is trivially SATISFIED in v1 (no incoming damage ⇒ everyone sits at full HP), so the omission reason is NOT a dead gate — it is the missing incoming-healing stat primitive (no StatKey scales heal amounts the engine never quantifies). If an HP pool ever lands, the condition degenerates to a passive.",
    "Zero damage lines and zero weapon-state modifiers in the whole kit — emma is the MG clean-weapon basis cell (harness CLEAN_WEAPON_TEAMS.b): this override is proven damage-neutral vs the bare weapon (CW1 in clean-weapons.test.ts pins the bursts-off solo half; her unit test pins the bursts-on in-team half). Her entire board footprint is cross-unit: recovery events on her own Burst I casts."
  ],
  "note": "emma (Emma — MG / Supporter / Fire / Burst I, cd 40s, ammo 300, hitsPerShot 1, reloadFrames 171, Elysion). EXACT SLUG: `emma` — the BASE unit, NOT `emma-tactical-upgrade` (the environment-setup variant; never the bare base name). Kit-autonomy gauntlet 2026-08-05: FROM-SCRATCH build (no prior override / kit-status row; simSupported was false) — test-first re-derivation pinned by scripts/tests/units/emma.test.ts (groups E1–E4 + structural pins). Cross-family S2b (claude-fable-5) independently re-derived every line and converged on the exact encodings below (leakDetected null). Emma is a PURE HEALER and the MG clean-weapon basis unit: her kit contributes NOTHING to her own damage. MODELED (burst 'Altruism', both lines on her OWN burstCast — burstCast NOT fullBurstEnter: as a Burst I unit she shares stage 1 with any co-B1 (liter in her fixture), and fullBurstEnter would fire her heals on every Full Burst window including ones another B1 opened; pinned behaviorally + statically): (1) 'Recover HP equal to 39.6% of the skill user's final Max HP' → burstCast → allies → heal ticks:1 (one instant recovery landing per ally per cast); (2) 'Recover 39.6% of attack damage as HP over 5 sec' → burstCast → allies → heal ticks:5 intervalSec:1 — a 5-second recovery cadence across the lifesteal window (⚑ tick count estimated from 'over 5 sec'; the lifesteal MAGNITUDE is out-of-domain, the recovery EVENT cadence is the modeled payload, marciana 'over 3 sec' precedent). UNMODELED (verbatim in `unmodeled`): skill1 in full — '5% chance to activate when attacked → all allies recover 10.77% of the skill user's final Max HP' — the sim has NO incoming-damage model, NO attacked trigger primitive, and the v1 boss never acts, so the proc can never fire; an interval proxy would fabricate its cadence (jackal/maiden/admi attacked-cluster precedent, ⚑1). skill2 in full — 'above 90% HP → all allies Incoming healing ▲ 13.33% continuously' — no HP pool and no incoming-healing StatKey (heal effects carry no amount to amplify); the >90% gate is trivially OPEN at scope lock (nobody takes damage), so the line is omitted for the missing stat primitive, NOT because the gate is dead (⚑2). Heal amounts are recovery EVENTS, never numbers; both modeled lines are tandem-only (they refresh allies' 'recovery' triggers — e.g. asuka's self-ATK consumer). EVIDENCE TIER: every modeled magnitude is kit-text-literal (DATAMINED); the single estimated quantity is the lifesteal tick count. No `ignored` blocks. ⚑ LIST: [⚑1] (OUT-OF-DOMAIN, incoming-damage subsystem — TIER 2) the entire skill1 attacked-5% cluster (10.77%-final-Max-HP heal to all allies). estimate = zero damage impact at scope lock (never fires); in a real fight a Supporter taking steady boss hits would proc ~5% of the time (instant heal, no uptime stacking), refreshing on-recovery teammates intermittently. recipe = needs an attacked trigger primitive + a boss attack cadence/targeting model (neither exists in v1); a focus video reading emma's heal-popup cadence under fire would anchor the proc rate before any encoding. tier = out-of-domain (maiden/jackal/admi precedent). [⚑2] (OUT-OF-DOMAIN, heal-magnitude subsystem — TIER 2) skill2 'Incoming healing ▲ 13.33% continuously' + all heal AMOUNTS. estimate = zero damage impact (no heal is quantified, so nothing is amplified); if an HP pool ever lands it scales every recovery emma and her teammates receive by ×1.1333 while she is above 90% HP (≈ always). recipe = not measurable from damage popups at all — needs an HP/incoming-healing model first. [⚑3] (CADENCE CONVENTION — TIER 1) the lifesteal window's ticks:5/intervalSec:1 — shared convention with marciana's ticks:3; a frame-read of a recovery consumer's refresh cadence after an emma burst would pin it. Kit-autonomy gauntlet 2026-08-05."
}
```

---
## 8. ADDITIONAL DRIVER EVIDENCE

- clean-weapon guard: scripts/tests/units/clean-weapons.test.ts 27/27 GREEN with this override on disk — emma's override sims byte-identical to the bare weapon (CW1 third test, bursts-off solo basis). emma is one of the six CLEAN-WEAPON basis units (harness CLEAN_WEAPON_TEAMS.b, the MG cell).
- S2c reconciliation: driver adopted every trap fable pre-registered; driver-held (with precedent): full verbatim prose with ■ markers in unmodeled; heal-magnitude non-modeling documented in caveats (marciana precedent).
- No engine edits were made or needed (S4): heal + burstCast primitives suffice for every encodable line.
