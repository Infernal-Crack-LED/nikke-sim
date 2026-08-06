# S7 RECONCILING JUDGE — yuni (kit-autonomy gauntlet 2026-08-05)

You are the binding cross-family judge for the `yuni` gauntlet. Section 1 is your contract (read it first; return EXACTLY the JSON shape it specifies). Sections 2–3 are the mechanics SSOT + GROUND TRUTH. Section 4 is the S2b test-faithfulness review (claude-fable-5). Section 5 is the S5 BLIND TEST (claude-opus-5) with its result vs the driver override. Section 6 is the S6 BLIND OVERRIDE (claude-opus-5) with a diff vs the driver. Section 7 is the DRIVER implementation (test + override) you are judging.

---
## 1. CONTRACT — RECONCILING-JUDGE.md

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
## 2. MECHANICS SSOT — docs/data/damage-calculation.md

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

---
## 2b. MECHANICS SSOT — docs/data/game-mechanics.md

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
## 3. GROUND TRUTH — yuni kit prose + base stats (data/characters.json, trimmed)

```json
{
  "slug": "yuni",
  "name": "Yuni",
  "weapon": "RL",
  "class": "Defender",
  "element": "Fire",
  "burst": "II",
  "burstCooldownSec": 20,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 90,
  "chargeMultiplier": 350,
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "burstGaugePerShot": 1.4,
  "skills": {
    "skill1": "■ Affects all allies. Activates when entering Full Burst.\nCharge Speed ▲ 8.97% for 10 sec.",
    "skill2": "■ Activates when attacking with Full Charge. Affects all allies.\nDEF ▲ 2.77% for 10 sec. \nRestores 2.77% of attack damage as HP over 10 sec. \nMax Ammunition Capacity ▲ 1 round(s) for 5 sec.",
    "burst": "■ Affects enemies within attack range. \nDeals 348.73% of final ATK as damage. \nImmobilizes the target(s) for 5 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "baseStats": {
    "hp": 16500,
    "atk": 400,
    "def": 107,
    "critRate": 15,
    "critDamage": 150
  }
}
```

---
## 4. S2b TEST-FAITHFULNESS REVIEW (model: claude-fable-5)

```json
{
  "slug": "yuni",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Charge Speed ▲ 8.97% for 10 sec",
      "disposition": "GAP",
      "scope": "Charge-cycle speed only — a WEAPON-STATE modifier (taxonomy 6), not a damage bucket and not a fire-rate change. It shortens the full-charge wind-up for any charge-weapon holder (Yuni herself: chargeFrames 90 → ~82.6 at 8.97%, ~7.4 frames/charge) and is strictly inert for non-charge allies.",
      "durationSemantics": "durationSec: 10, wall-clock. Re-applied (refreshed, not stacked) on every subsequent team Full Burst; no round count, no stacks, no until-reload.",
      "triggerIdentity": "fullBurstEnter — 'Activates when entering Full Burst' fires on ANY team Full Burst, regardless of whether Yuni cast her own Burst II. No ownBurstGate, no fbGate, no everyN.",
      "targetSet": "allies (all allies, self INCLUDED — no 'except self' clause). Caster-slot keyed, so it overwrites only Yuni's own prior instance.",
      "nearestWrongModel": "Two plausible misreads, both damaging. (i) NO chargeSpeedPct StatKey exists in the schema, so the line gets folded into a damage stat — chargeDamagePct: 8.97 — converting a shot-count effect into +8.97 additive percentage points of charge-bucket damage for the whole team (wrong in kind, and far larger than the true effect), or silently substituted with attackSpeedPct/fireRatePct, which is a different kit stat on a different engine path. (ii) Re-keyed to burstCast (Yuni's own B2 cast), which under-fires on every rotation another Burst II completes the chain.",
      "distinguishingAssertion": "Two assertions. (a) Trigger identity: buffApply count for this stat+key === fullBurstStart event count, in a comp where Yuni is NOT the bursting unit at her stage — green under fullBurstEnter, red under burstCast (zero applications). (b) Kind-of-effect: during the 10s post-FB window, consecutive shot-event frame deltas for a charge-weapon holder SHRINK by ~8.2% (90 → ~82.6 frames for Yuni) while every damage event's charge-bucket mult is byte-identical to the unbuffed run — green under a real charge-speed primitive, red under chargeDamagePct (mult moves, shot spacing does not).",
      "inertness": "Must move NO per-shot damage magnitude — every damage event's mult/crit/core/rangeApplied must be unchanged; the ONLY delta is shot timing and therefore shot COUNT. Must be inert for non-charge-weapon allies (no change to their shot frames).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "DEF ▲ 2.77% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic DEF, unscoped. Engine-inert for damage (defPct is documented inert in v1 — self DEF does not affect own damage), but per taxonomy 7 it is KEPT as a stat buff for kit completeness and any future consumer.",
      "durationSemantics": "durationSec: 10, wall-clock, refreshed on each full charge (so effectively continuous while Yuni is firing — the trigger repeats at ~1.5s).",
      "triggerIdentity": "'Activates when attacking with Full Charge' — for a charge weapon every trigger pull IS a full charge, so shotFired is the faithful encoding (fires on Yuni's own shots only). No fbGate, no everyN, no core requirement.",
      "targetSet": "allies (all allies, self included).",
      "nearestWrongModel": "chargeCounter{count:1} on the skill2 header. That primitive advances a PHASE counter per full charge and dispatches effects[P] one at a time, so the three sibling lines (DEF / lifesteal / ammo) would fire round-robin — one per charge — instead of all three on every charge. Roughly a 3× under-application of each line, and it desynchronises their windows. Secondary misread: `passive` (always-on from t=0, ignoring that Yuni must actually be firing).",
      "distinguishingAssertion": "For a fixed shot count N by Yuni, assert buffApply counts are equal across all three skill2 stats and each === N (one application of EVERY line per full charge) — green under shotFired, red under chargeCounter (counts split ~N/3 each and interleave). Additionally assert the first application frame > 0 (not frame 0), which kills the `passive` misread.",
      "inertness": "Must move zero damage. Assert totals(res) for every unit is bit-identical with this effect present vs removed (defPct is inert), so its presence can never be justified by a damage delta.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Restores 2.77% of attack damage as HP",
      "disposition": "MISSING",
      "scope": "A lifesteal granted to all allies: each ally converts a fraction of its OWN attack damage to HP for the window. No HP pool exists in v1, so the magnitude (2.77%) is unmodellable and irrelevant — what is load-bearing is the RECOVERY CHANNEL it opens (taxonomy 4: never skip heal/shield/lifesteal lines on isolation; the control fixture contains crown, whose on-recovery consumer this line feeds).",
      "durationSemantics": "The kit's 'over 10 sec' is the lifesteal WINDOW, not a heal-tick count. Encoded as a heal effect emitting recovery event(s) per activation; since the activating trigger itself repeats every ~1.5s (6 ammo × ~90-frame charge, 141-frame reload), continuity comes from the TRIGGER, not from a long tick chain.",
      "triggerIdentity": "shotFired (full-charge attack), same header as its two siblings — on-fire, not on-hit-count, not fullBurstEnter.",
      "targetSet": "allies (all allies, self included) — each recipient's own 'recovery' trigger must fire, so cross-unit consumers (crown-style 'when recovery takes effect') go live.",
      "nearestWrongModel": "Dropped entirely as 'defensive / no HP pool → inert', leaving every teammate's on-recovery consumer dark for the whole fight. The mirror-image over-model is equally wrong: heal{ticks:10, intervalSec:1} on a trigger that re-fires every ~1.5s, which MULTIPLIES (taxonomy 5) — ~10 recovery events per charge × ~40 charges ≈ 400 emissions, over-firing the consumer by an order of magnitude.",
      "distinguishingAssertion": "Count recovery-driven applications on a teammate with an on-recovery consumer: assert exactly ONE recovery emission per Yuni full charge (recovery-consumer buffApply count === Yuni shot count, within refresh semantics) — red at 0 (line dropped) and red at ~10× (tick-chain multiplication). Second assertion: in a comp with a recovery consumer, totals(res)[consumer] must DIFFER between override-with-heal and override-without — this line is provably not inert.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Max Ammunition Capacity ▲ 1 round(s)",
      "disposition": "FIX",
      "scope": "Weapon-state modifier on ALL allies' magazine size (taxonomy 6 — it gates shots fired between reloads and shifts lastBullet frequency for every teammate). The magnitude is a FLAT +1 round, per recipient, independent of that recipient's base capacity.",
      "durationSemantics": "durationSec: 5 — deliberately SHORTER than its two siblings' 10 sec. The '1 round(s)' token is the ammo AMOUNT, not a duration; there is no durationShots semantics on this line at all.",
      "triggerIdentity": "shotFired (full-charge attack), same header as its siblings.",
      "targetSet": "allies (all allies, self included).",
      "nearestWrongModel": "Two independent traps. (i) DURATION: reading 'for N round(s)' reflexively as durationShots and authoring durationShots: 1 (or durationShots:1 + durationSec:5), which expires the buff after one round instead of after 5 seconds. (ii) MAGNITUDE UNIT: the schema exposes only percentage maxAmmoPct, so +1 round gets converted using YUNI's magazine (1/6 → 16.67%) and applied team-wide — an ally holding a large magazine then gains many rounds instead of one (e.g. ~+20 on a 120-round belt), inflating shots-between-reloads and suppressing that ally's lastBullet cadence.",
      "distinguishingAssertion": "(a) Duration: read expiresFrame off the buffApply and assert it === triggerFrame + 5s worth of frames, and assert durationShots is absent/undefined — red under the durationShots:1 misread (buff gone after one round) and red under a copy-pasted 10s. (b) Flat-vs-percent: for an ally whose base magazine differs from 6, assert the effective maxAmmo delta is exactly +1 round, and assert that ally's reload-event count over the fight changes by the amount a +1-round magazine predicts — red under maxAmmoPct:16.67, which grants a capacity-proportional bonus and visibly reduces reload count on the large-magazine ally.",
      "inertness": "Must not change per-shot damage magnitude, crit/core rates, or charge timing — only magazine size, and hence shot count and reload/lastBullet cadence. Must be inert for a teammate whose reloads never bind inside the 5s window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 348.73% of final ATK as damage",
      "disposition": "FAITHFUL",
      "scope": "Instant burst-cast damage on the boss, % of Yuni's FINAL ATK (so it snapshots her live buff state at cast). Function damage: it is NOT a normal attack, takes no core unless the text says 'core strike' (it does not), and takes no +30% range bonus.",
      "durationSemantics": "Instantaneous — no duration, no ticks, no delay (the prose gives no flight time, so no delaySec should be invented).",
      "triggerIdentity": "burstCast (Yuni's OWN Burst II cast) — never fullBurstEnter. Per the repo's verified fact, burst-cast damage lands BEFORE Full Burst begins, so it takes neither the +50% FB major nor any FB-entry aura.",
      "targetSet": "enemy ('Affects enemies within attack range'; single partless boss at scope lock, so the area clause is scope-trivial).",
      "nearestWrongModel": "Keyed to fullBurstEnter and/or credited the Full-Burst major — a ~1.5× over-credit on the burst bucket. Adjacent misreads: core:true (plausible for a rocket visually striking the core, but unsupported by the text — the ×200 coreAttackMultiplier belongs to her NORMAL attack, not this rider) and rangeOk/range-eligible.",
      "distinguishingAssertion": "On the burst-bucket damage event assert fbMajorApplied === false, inFullBurst === false, rangeApplied === false, core rate === 0, and that the event frame precedes the fullBurstStart frame of that rotation — green under burst-cast-pre-FB, red under a fullBurstEnter encoding (event lands inside the window with fbMajorApplied true). Then assert the raw damage equals 348.73% of Yuni's effective ATK at cast with no further multiplier.",
      "inertness": "Must fire exactly once per Yuni burst cast and never on a rotation she does not cast; must add nothing to the normal or charge buckets.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Immobilizes the target(s) for 5 sec",
      "disposition": "UNMODELED",
      "scope": "Boss crowd control. There is no enemy entity in the sim (enemy targets resolve to an empty set) and the schema's `stun` primitive describes a NIKKE being unable to fire/charge/reload — it is not a boss-movement freeze. The only channel by which boss immobilisation could touch damage is the boss RANGE/movement script, which is a MEASURED constant.",
      "durationSemantics": "5 sec if it were modelled; irrelevant at scope lock.",
      "triggerIdentity": "burstCast, alongside the damage line.",
      "targetSet": "enemy.",
      "nearestWrongModel": "Encoding it as `stun` (which would wrongly target/penalise an ally-side entity), or — far worse — pinning the boss's range band for 5 sec to 'model' the immobilise, which silently overwrites a MEASURED constant (the boss range script) with an invented one and would move damage on every graded comp.",
      "distinguishingAssertion": "Assert the line is present verbatim in override.unmodeled.burst, and assert boss-range behaviour is untouched: every damage event's rangeApplied/band-derived multiplier across the fight is identical with and without Yuni in the comp (beyond her own damage rows) — red the moment anyone models the immobilise as a movement freeze.",
      "inertness": "Zero damage movement anywhere; zero change to boss range/band multipliers; no ally-side stun.",
      "evidenceTier": "COMMUNITY",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:Charge Speed ▲ 8.97% for 10 sec (fullBurstEnter → allies)",
    "skill2:DEF ▲ 2.77% for 10 sec (shotFired/full-charge → allies)",
    "skill2:Restores 2.77% of attack damage as HP over 10 sec (recovery channel → allies)",
    "skill2:Max Ammunition Capacity ▲ 1 round(s) for 5 sec (flat +1, 5s)",
    "burst:Deals 348.73% of final ATK as damage (burstCast, pre-FB, no core, no range)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Immobilizes the target(s) for 5 sec."
    ]
  },
  "notes": "Five things the driver must reconcile. (1) SCHEMA GAP — the StatKey union in the packet contains NO charge-speed stat, yet skill1's only effect is Charge Speed ▲. Every available encoding is wrong in kind: chargeDamagePct/chargeDamageMultPct are damage buckets, attackSpeedPct and fireRatePct are different kit stats on different engine paths. I expect the shared-prior misread here to be a damage-bucket fold, because it is the only encoding that produces a visible number. If the engine really has no charge-time primitive, this line is a GAP to declare, not a stat to approximate — and the distinguishing test is shot-event SPACING, not damage. (2) FLAT-vs-PERCENT AMMO — maxAmmoPct is percentage-only but the kit grants a flat +1 round to ALL ALLIES. Converting via Yuni's own 6-round magazine (16.67%) over-grants every large-magazine teammate; this is the single largest silent damage error in the kit and it is invisible in a fixture where nobody's reloads bind. Test it on an ally with a magazine far from 6. (3) 'round(s)' IS A MAGNITUDE, NOT A DURATION — 'Max Ammunition Capacity ▲ 1 round(s) for 5 sec' will attract a durationShots:1 encoding from anyone primed on the round-count rule; the duration is 5 sec and it is the ONLY skill2 line that is not 10 sec, so a copy-paste of the sibling window is the other likely defect. (4) THE HEAL IS NOT INERT — the control fixture contains crown, an on-recovery consumer, so dropping the lifesteal line as 'defensive' changes a teammate's damage. But the recovery CADENCE is genuinely outside the input domain (⚑): Yuni full-charges roughly every 1.5s, so a ticks:10 heal multiplies to ~400 emissions. I recommend one recovery emission per full charge, with the ⚑ stated and a recipe (count a recovery-consumer's proc rate against footage) rather than a guessed tick chain. (5) FIXTURE HAZARD — Yuni is Burst II, but controlComp(carry) seats the carry in the B3 slot with crown already at B2. As written, a burst-block test may assert on damage from a cast that never happens (vacuous green or spurious red). Assert a burstCast event exists BEFORE asserting burst damage, and expect to need TWO fixtures: one seating Yuni at B2 (displacing crown) to exercise the burst block, and the crown-bearing default to exercise the recovery channel — the two requirements are in direct tension and cannot be satisfied by one comp. Also note the intra-kit feedback loop: skill1's charge speed accelerates Yuni's OWN charge cycle, which raises the fire rate of skill2's trigger — so skill2 application counts should rise inside the 10s post-FB window. That coupling is a useful second-order check that skill1 is on the timing path and not the damage path. Cadence tuple (pullsPerSec / reloadFrames 141 / chargeFrames 90) remains a datamine-unreliable ⚑ throughout.",
  "model": "claude-fable-5"
}
```

---
## 5. S5 BLIND TEST (model: claude-opus-5) + RESULT vs the driver override

RESULT: the pristine suite below was run vs the driver override (Section 7) after STRUCTURAL-ONLY adaptation (documented below). **17 GREEN / 2 RED / 2 skipped (GAP notes).**

ADAPTATIONS (structural only — assertion intent untouched):
1. harness import path (blind/ → scripts/tests/lib/harness.js).
2. FIXTURE FIX (B2-starvation, measured rupee 2026-08-04): the blind author seated controlComp(yuni), which puts crown (B2) beside yuni (B2) — the unit under test then casts ZERO bursts, failing the blind suite's own non-vacuity check. Adapted main fixture: liter/yuni/ada/helm (yuni sole B2), forced-neutral boss, focus yuni.
3. override slots are block arrays (no `.blocks`); slot index from `slugs.indexOf`; buffApply events key on casterIdx+stat (no `slot` field); damage events key the unit by `slug`.
4. recovery channel: SimEvent has no heal/recovery kinds — observed via crown's "when recovery takes effect" block in a dedicated crown-bearing comp (crown's own hitCount self-heal stripped for attribution).

THE 2 RED ASSERTIONS (both the SAME root cause — a redacted-schema artifact, NOT a kit misread):
- "grants Max Ammunition ▲1 round for 5 sec" filters `stat === 'maxAmmoPct'` → 0 events (shipped uses the theme-14 FLAT primitive `maxAmmoFlat`; the engine StatKey union passed to the blind author was redacted and they guessed percent).
- "the +1 round is REAL DAMAGE — stripping it moves yuni own total" strips `maxAmmoPct` effects (none exist) → totals identical. NOTE: the blind author's OWN percent model is self-contradictory — maxAmmo() = round(base×(1+pct/100)) + flat, so maxAmmoPct 1 computes round(6×1.01)=6 and NEVER extends any magazine; under it the ammo line is inert and this same assertion would still fail. The flat primitive is the only encoding that makes the blind author's own damage claim true.
- Both skipped GAP notes (Immobilize unobservable; "no chargeSpeedPct StatKey") are blind-side schema beliefs; the engine DOES have chargeSpeedPct (sim.ts subtractive charge formula, anis-star precedent).

PRISTINE BLIND TEST SOURCE:

```ts
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
 * yuni — Yuni (RL/Fire/Defender/Burst II), blind kit spec test.
 *
 * KIT (read literally, ≤40-char quotes):
 *   skill1: "Affects all allies. Activates when entering Full Burst."
 *           Charge Speed ▲ 8.97% for 10 sec.
 *   skill2: "Activates when attacking with Full Charge. Affects all allies."
 *           DEF ▲ 2.77% for 10 sec.
 *           Restores 2.77% of attack damage as HP over 10 sec.
 *           Max Ammunition Capacity ▲ 1 round(s) for 5 sec.
 *   burst:  "Affects enemies within attack range."
 *           Deals 348.73% of final ATK as damage.
 *           Immobilizes the target(s) for 5 sec.
 *
 * FIXTURE: controlComp('yuni', true) — yuni is Burst II, so the fixture's
 * B1 + B3 slots are what make a full rotation cast at all; the fixed-B3 flag
 * stays true because we need real Full Bursts to exist for the skill1
 * fullBurstEnter trigger to be non-vacuous. Deterministic (no seed).
 *
 * WHY EACH ASSERTION DISCRIMINATES:
 *  - skill1 trigger identity: fullBurstEnter fires on ANY team Full Burst.
 *    The nearest-wrong model is burstCast (fires only on rotations yuni
 *    herself bursts). In this fixture yuni is the sole B2 so she casts every
 *    rotation, which would make the two indistinguishable by COUNT alone —
 *    so we discriminate on the buffApply FRAME ORDER instead: a
 *    fullBurstEnter application must land at-or-after the fullBurstStart
 *    frame, a burstCast application strictly before it.
 *  - skill1 target set: "all allies" with no except-self clause → every
 *    comp member receives it, including yuni. The nearest-wrong models are
 *    self-only and allies{excludeSelf}; both are caught by counting
 *    distinct targetSlugs per application event.
 *  - skill2 trigger identity: "attacking with Full Charge" is a per-charge
 *    owner trigger, NOT fullBurstEnter and NOT passive. yuni charges far
 *    more often than the team full-bursts, so an application COUNT well
 *    above the fullBurstStart count refutes an FB-keyed model; >0 refutes
 *    passive-once.
 *  - skill2 ammo line is a WEAPON-STATE modifier (theme 6): +1 round on a
 *    6-round magazine is a real shot-economy change, so removing it must
 *    move yuni's own damage. The nearest-wrong model is "defensive, skip".
 *  - burst: 348.73% is a burst-cast instant, which is Full-Burst-exempt
 *    (a burst cast lands before the FB window opens). We assert the burst
 *    bucket is non-zero and that its damage events carry inFullBurst=false /
 *    no FB major, which is exactly what the nearest-wrong model (a rider
 *    keyed to fullBurstEnter, taking the +50%) would violate.
 *
 * INERTNESS: skill1/skill2 are ally-wide BUFFS, not damage — patching the
 * burst's own 348.73% line must not move any TEAMMATE's total.
 */

const SLUG = 'yuni';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const base = controlComp(SLUG, true);

// ---- hoisted runs (each is a full 180s sim) ----
const BASE = run(base);

// Counterfactual A: strip the skill1 charge-speed grant entirely.
const noS1 = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      if (ov.skill1) ov.skill1.blocks = [];
    }),
  },
});

// Counterfactual B: strip the skill2 max-ammo line only (keep DEF + heal).
const noAmmo = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      if (!ov.skill2) return;
      for (const b of ov.skill2.blocks) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'maxAmmoPct'),
        );
      }
      ov.skill2.blocks = ov.skill2.blocks.filter((b) => b.effects.length > 0);
    }),
  },
});

// Counterfactual C: strip the skill2 heal (the tandem/on-recovery channel).
const noHeal = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      if (!ov.skill2) return;
      for (const b of ov.skill2.blocks) {
        b.effects = b.effects.filter((e) => e.kind !== 'heal');
      }
      ov.skill2.blocks = ov.skill2.blocks.filter((b) => b.effects.length > 0);
    }),
  },
});

// Counterfactual D: zero the burst's 348.73% damage line.
const noBurstDmg = run({
  ...base,
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov) => {
      if (!ov.burst) return;
      for (const b of ov.burst.blocks) {
        b.effects = b.effects.filter((e) => e.kind !== 'flatDamage');
      }
      ov.burst.blocks = ov.burst.blocks.filter((b) => b.effects.length > 0);
    }),
  },
});

const fbStartFrames = BASE.events
  .filter((e) => e.kind === 'fullBurstStart')
  .map((e) => e.frame as number);

const applies = BASE.events.filter((e) => e.kind === 'buffApply');
const yuniIdx = base.units.findIndex((u: { slug: string }) => u.slug === SLUG);
const fromYuni = applies.filter((e) => e.casterIdx === yuniIdx);

describe('yuni — fixture sanity (non-vacuity)', () => {
  it('the comp actually reaches Full Burst, so FB-keyed lines are exercised', () => {
    expect(fbStartFrames.length).toBeGreaterThan(0);
  });

  it('yuni is in the comp and deals damage (charge weapon actually fires)', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('yuni casts her own burst (Burst II slot is live)', () => {
    const casts = BASE.events.filter(
      (e) => e.kind === 'burstCast' && e.slot === yuniIdx,
    );
    expect(casts.length).toBeGreaterThan(0);
  });
});

describe('yuni skill1 — Charge Speed ▲8.97%/10s to all allies on Full Burst entry', () => {
  const chargeBuffs = fromYuni.filter(
    (e) => e.key !== undefined && String(e.slot ?? 'skill1') === 'skill1',
  );

  it('fires on FULL-BURST ENTRY, not on burst cast (frame ordering discriminates)', () => {
    // Nearest-wrong: trigger burstCast. A burstCast application lands BEFORE
    // the fullBurstStart frame of its rotation; fullBurstEnter lands at/after.
    expect(chargeBuffs.length).toBeGreaterThan(0);
    for (const ev of chargeBuffs) {
      const f = ev.frame as number;
      const enclosing = fbStartFrames.filter((s) => s <= f);
      expect(enclosing.length).toBeGreaterThan(0);
      expect(f).toBeGreaterThanOrEqual(enclosing[enclosing.length - 1]);
    }
  });

  it('fires once per Full Burst (not per shot, not once per battle)', () => {
    const frames = new Set(chargeBuffs.map((e) => e.frame as number));
    expect(frames.size).toBe(fbStartFrames.length);
  });

  it('reaches ALL allies including yuni herself (no except-self)', () => {
    // Nearest-wrong: target self, or allies{excludeSelf}. Both change the
    // distinct-target count for a single application frame.
    const firstFrame = Math.min(...chargeBuffs.map((e) => e.frame as number));
    const atFirst = chargeBuffs.filter((e) => e.frame === firstFrame);
    const targets = new Set(atFirst.map((e) => e.targetSlug as string));
    expect(targets.size).toBe(base.units.length);
    expect(targets.has(SLUG)).toBe(true);
  });

  it('carries a 10 sec wall-clock window (expiresFrame ≈ apply + 600f)', () => {
    // "for 10 sec" is seconds, NOT rounds (taxonomy #2). durationShots must
    // be absent; expiresFrame must sit ~600 frames out at 60fps.
    const ev = chargeBuffs[0];
    expect(ev.durationShots ?? null).toBeNull();
    expect((ev.expiresFrame as number) - (ev.frame as number)).toBe(600);
  });

  it('charge-speed grant is NOT damage-inert — removing it moves the team', () => {
    // A charge-speed modifier gates shots fired (taxonomy #6), so the
    // nearest-wrong "defensive, skip" model is refuted by any movement.
    const a = totals(BASE.res);
    const b = totals(noS1.res);
    const moved = Object.keys(a).some((s) => a[s] !== b[s]);
    expect(moved).toBe(true);
  });
});

describe('yuni skill2 — full-charge riders to all allies', () => {
  const s2 = fromYuni.filter((e) => String(e.slot ?? '') === 'skill2');

  it('is triggered by yuni FULL CHARGES, not by Full Burst entry', () => {
    // Nearest-wrong: fullBurstEnter. yuni charges many times per FB window,
    // so the application count must exceed the full-burst count outright.
    const frames = new Set(s2.map((e) => e.frame as number));
    expect(frames.size).toBeGreaterThan(fbStartFrames.length);
  });

  it('is not a passive — first application is after t=0', () => {
    // Non-vacuity: proves the inactive case exists before the first charge.
    const first = Math.min(...s2.map((e) => e.frame as number));
    expect(first).toBeGreaterThan(0);
  });

  it('grants DEF ▲2.77% for 10 sec to all allies', () => {
    const def = s2.filter((e) => e.stat === 'defPct');
    expect(def.length).toBeGreaterThan(0);
    expect(def[0].value).toBeCloseTo(2.77, 5);
    expect((def[0].expiresFrame as number) - (def[0].frame as number)).toBe(600);
    const f0 = def[0].frame as number;
    const targets = new Set(
      def.filter((e) => e.frame === f0).map((e) => e.targetSlug as string),
    );
    expect(targets.size).toBe(base.units.length);
  });

  it('grants Max Ammunition ▲1 round for 5 sec (a 5s window, not 10s)', () => {
    // Duration discriminates: the DEF/heal lines are 10 sec, this one is 5.
    // A model that copies the 10s window onto the ammo line fails here.
    const ammo = s2.filter((e) => e.stat === 'maxAmmoPct');
    expect(ammo.length).toBeGreaterThan(0);
    expect((ammo[0].expiresFrame as number) - (ammo[0].frame as number)).toBe(300);
    const f0 = ammo[0].frame as number;
    const targets = new Set(
      ammo.filter((e) => e.frame === f0).map((e) => e.targetSlug as string),
    );
    expect(targets.size).toBe(base.units.length);
  });

  it('the +1 round is REAL DAMAGE — stripping it moves yuni own total', () => {
    // Nearest-wrong: "ammo capacity is defensive, skip". +1 on a 6-round
    // magazine changes shots-per-reload-cycle, so totals must move.
    expect(totals(noAmmo.res)[SLUG]).not.toBe(totals(BASE.res)[SLUG]);
  });

  it('emits recovery events for the HoT (the tandem channel), all allies', () => {
    // "Restores X of attack damage as HP over 10 sec" is a heal-over-time:
    // it must emit REPEATED recovery events (ticks), not one instant event,
    // so an on-recovery consumer stays refreshed across the window.
    // Nearest-wrong: skip the heal because no HP pool is modeled.
    const heals = BASE.events.filter((e) => e.kind === 'heal' || e.kind === 'recovery');
    expect(heals.length).toBeGreaterThan(0);
  });

  it('the heal is a live channel — stripping it is observable on the team', () => {
    const a = totals(BASE.res);
    const b = totals(noHeal.res);
    const same = Object.keys(a).every((s) => a[s] === b[s]);
    // Alone, with no on-recovery consumer in the control comp, the heal may
    // be damage-inert; the CLAIM under test is only that the event exists,
    // which the previous assertion pins. Record the inertness explicitly so
    // a future consumer flips this to a real signal.
    expect(typeof same).toBe('boolean');
  });
});

describe('yuni burst — 348.73% of final ATK, enemies in range', () => {
  it('produces burst-bucket damage', () => {
    expect(totals(noBurstDmg.res)[SLUG]).toBeLessThan(totals(BASE.res)[SLUG]);
  });

  it('the burst hit is FULL-BURST EXEMPT (lands before the FB window opens)', () => {
    // Nearest-wrong: keying the 348.73% to fullBurstEnter, which would take
    // the +50% FB major. Verified fact: burst-cast damage lands before Full
    // Burst begins (no +50%, no entry auras).
    const burstHits = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst' && e.slot === yuniIdx,
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const h of burstHits) {
      expect(h.fbMajorApplied).toBe(false);
    }
  });

  it('does NOT core (no "core strike" wording in the kit line)', () => {
    const burstHits = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst' && e.slot === yuniIdx,
    );
    for (const h of burstHits) {
      expect(h.coreRate ?? 0).toBe(0);
    }
  });

  it('is INERT on teammates (a self burst nuke, not an ally buff)', () => {
    const a = totals(BASE.res);
    const b = totals(noBurstDmg.res);
    for (const s of Object.keys(a)) {
      if (s === SLUG) continue;
      expect(b[s]).toBe(a[s]);
    }
  });

  it.skip('Immobilizes the target(s) for 5 sec — GAP: no enemy entity', () => {
    // resolveTargets({kind:"enemy"}) returns [] and the scope-lock boss has
    // no modeled movement/attack loop, so a 5s immobilize has no observable
    // payload. Not a MISSING line — an unobservable one. Record in
    // `unmodeled.burst` rather than inventing a consumer.
  });

  it.skip('Charge Speed ▲8.97% exact magnitude — GAP: no chargeSpeedPct StatKey', () => {
    // The schema has no charge-speed stat; the nearest live primitive is
    // attackSpeedPct (charge-time scaler). Whether 8.97% charge speed maps
    // 1:1 onto attackSpeedPct is a MODELING choice, not a kit fact — ⚑.
    // The trigger/target/duration assertions above are magnitude-independent
    // and hold under either mapping.
  });
});

```

---
## 6. S6 BLIND OVERRIDE (model: claude-opus-5) + DIFF vs the driver override

DIFF SUMMARY: structurally IDENTICAL to the driver override on skill2 (shotFired → allies → [defPct 2.77/10s, heal ticks:10 intervalSec:1, maxAmmoFlat 1/5s]), burst (burstCast → enemy → flatDamage 348.73), and unmodeled.burst ("Immobilizes the target(s) for 5 sec." verbatim). ONE divergence: skill1 stat key — blind `attackSpeedPct` 8.97/10s vs driver `chargeSpeedPct` 8.97/10s. The blind author flagged this itself ("⚑ stat-key mapping … if attackSpeedPct does not shorten chargeFrames in the engine, this line is effectively inert"): the live engine has a dedicated chargeSpeedPct consumed by the SUBTRACTIVE charge formula (needed = round(chargeFrames×(1−cs/100))); whether attackSpeedPct also feeds charge time is for you to weigh against the SSOT docs, but the driver encoding is the engine-native charge-speed channel.

```json
{
  "slug": "yuni",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackSpeedPct",
          "value": 8.97,
          "durationSec": 10
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 2.77,
          "durationSec": 10
        },
        {
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
        },
        {
          "kind": "buff",
          "stat": "maxAmmoFlat",
          "value": 1,
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
          "atkPct": 348.73
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Immobilizes the target(s) for 5 sec."
    ]
  },
  "caveats": [
    "⚑ S1 Charge Speed ▲8.97%: the schema exposes no dedicated charge-speed StatKey; encoded as attackSpeedPct (nearest weapon-state primitive). If attackSpeedPct does not shorten chargeFrames in the engine, this line is effectively inert and must move to `unmodeled` or gain a charge-speed StatKey — it is a shots-fired (damage) line, not a defensive one.",
    "⚑ S2 trigger: 'when attacking with Full Charge' encoded as shotFired, assuming every RL pull on a charge weapon (chargeFrames 90) is a full charge. Uncharged/tap fires would over-fire this block.",
    "⚑ S2 lifesteal is a %-of-damage-dealt continuous effect; the heal primitive models no HP pool, so it is encoded as 10 recovery events (1/s) purely to keep teammates' on-recovery triggers live. Recovery-event COUNT is an authoring choice, not a kit value.",
    "⚑ S2 Max Ammunition ▲1 round uses a flat-rounds StatKey (maxAmmoFlat). A percentage encoding is not usable: the buff targets ALL allies, so +1 round on a 6-round RL magazine (+16.67%) would grant an MG ally ~+50 rounds. If no flat-rounds StatKey exists in the live schema, this line must move to `unmodeled` rather than be approximated by maxAmmoPct.",
    "Burst 348.73% is left FB-eligible-by-timing (no noFb set) and no explicit crit/core/noRange fields — burst-cast damage resolves on the engine's own pre-Full-Burst cast timing, riders take no range bonus automatically, and the kit text carries no core-strike wording."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Yuni (RL/Fire/Defender/Burst II) is a full-team support: S1 grants a team Charge Speed window on every Full Burst entry; S2 fires off her own full-charge shots and grants the team DEF, a 10s attack-damage lifesteal, and +1 magazine round for 5s; her burst is a single instant AoE hit for 348.73% of final ATK plus a 5s immobilize. The DEF grant is offensively inert at scope but retained per the keep-the-stat rule; the lifesteal is retained because it drives teammates' on-recovery triggers. The burst immobilize is unmodeled: the sim has no enemy entity and the boss range/movement script is a fixed measured constant."
}
```

---
## 7. DRIVER IMPLEMENTATION UNDER JUDGMENT

### 7a. scripts/tests/units/yuni.test.ts (27/27 GREEN)

```ts
// PER-UNIT KIT SPEC — `yuni` (Yuni — RL / Defender / Fire / Burst II, cd 20s, ammo 6,
// reloadFrames 141, chargeFrames 90, chargeMult 350, normalMult 61.3, SSR).
// Kit-autonomy gauntlet 2026-08-05 (test-first re-derivation).
//
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/yuni.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates
// exactly as a verification gauntlet would (mica/jackal precedent).
//
// Kit (blablalink prose, data/characters.json → characters.yuni.skills, lvl 10):
//   S1 ■ entering Full Burst → all allies:
//        Charge Speed ▲8.97% for 10 sec                                     [FAITHFUL — Y1]
//   S2 ■ attacking with Full Charge → all allies (RL always full-charges):
//        DEF ▲2.77% for 10 sec                                    [FAITHFUL-INERT — Y3]
//        Restores 2.77% of attack damage as HP over 10 sec                  [FAITHFUL — Y5]
//        Max Ammunition Capacity ▲1 round(s) for 5 sec                      [FAITHFUL — Y4]
//   BU ■ enemies within attack range (Burst II, cd 20s):
//        348.73% of final ATK as damage                                     [FAITHFUL — Y6]
//        Immobilizes the target(s) for 5 sec                              [UNMODELED — Y7]
//
// Yuni is a fire-element B2 DEFENDER. Her kit splits into four families:
//
//   • Y1 (S1) is a team charge-speed window keyed to FULL BURST ENTRY (never burstCast):
//     the FB window opens AFTER the casts land (probe 2026-08-05: stage casts precede
//     fullBurstStart by 22–52 frames; fullBurstEnter buffs apply exactly ON the
//     fullBurstStart frame), so the burstCast mis-keying moves every application off the
//     window frames — and chargeSpeedPct is the SUBTRACTIVE engine formula (sim.ts:
//     needed = round(chargeFrames×(1−cs/100)); anis-star precedent), so 8.97 shortens
//     her 90f RL charge to 82f and every charge-weapon ally's cadence in-window.
//   • Y2–Y5 (S2) fire on EVERY FULL-CHARGE ATTACK — for an RL that is every pull
//     (shotFired; helm/cinderella precedent: the full-charge rider keyed per shot because
//     RL/SR always full-charge). One block, three effects on the same activation frames:
//       – defPct 2.77/10s: FAITHFUL but damage-INERT in v1 (mica M5 / novel / poli
//         precedent — self/ally DEF never feeds damage dealt; byte-identical removal is
//         pinned, and the atkPct misread moves totals).
//       – heal (2.77% of attack damage OVER 10 SEC): the engine models no HP amount — a
//         heal emits recovery events to its targets (helm H8 precedent: the window's only
//         observable is on-recovery CONSUMER behaviour). "over 10 sec" = ticks:10 at 1s
//         (the helm burst-heal encoding); the tick CADENCE inside the window is an
//         approximation — only the window LENGTH and consumer refresh across it are
//         kit-literal. Observed in a dedicated fixture B through crown's "when recovery
//         takes effect" block (attackDamagePct 20.99), with crown's OWN hitCount heal
//         patched out (helm-test isolation) — fixture B cannot test burst-cast behaviour
//         anyway: crown (B2) wins every stage-2 slot, so yuni casts zero bursts there
//         (B2 starvation, rupee 2026-08-04) — which is exactly what makes the
//         burst-keyed-heal counterfactual starve to ~zero while the shot-keyed shipped
//         model keeps recovery firing all fight.
//       – maxAmmoFlat 1/5s: the theme-14 FLAT-round primitive (mica M4 precedent):
//         '▲ 1 round(s)' is a MAGNITUDE in flat rounds, NOT a percent and NOT a
//         durationShots round-count; maxAmmo() = round(base×(1+pct/100)) + flat, so the
//         nearest-wrong maxAmmoPct 1 computes round(6×1.01) = 6 and silently never
//         extends a magazine. LOAD-BEARING weapon-state modifier (hard rule 1 / prior 9):
//         extended magazines → fewer reloads → more firing uptime for the holders.
//   • Y6 (burst damage) is a standard burstCast flatDamage nuke (mica M6 / harran / milk
//     precedent): her OWN cast, never fullBurstEnter — as the SOLE B2 of fixture A she
//     casts every Full Burst so both keyings fire equal COUNTS; the discrimination is
//     TIMING: the cast lands BEFORE the Full Burst window opens, so the nuke never takes
//     the +50% FB major. 'Enemies within attack range' collapses to the single partless
//     boss.
//   • Y7 (burst Immobilize) has NO engine channel: the v1 boss never acts, so a
//     boss-targeted CC moves nothing — UNMODELED + ⚑ (the mica M7 / himeno precedent for
//     enemy-targeted lines the engine cannot consume). The nearest-wrong model is
//     laundering the CC into a boss damageTakenPct debuff (a different mechanic the kit
//     never grants — the boss taking MORE damage); the ABSENCE pins prove the shipped
//     override is not that model.
//
// Fixture A (everything burst-related): liter / yuni / ada / helm, forced-neutral boss
// (null), camera focus yuni (RL is a charge weapon ⇒ ×2.5 burst gauge). yuni is the SOLE
// B2 (20s CD covers stage II alone; liter B1 20s; ada + helm B3 40s alternate), so she
// casts every Full Burst — the B2-starvation trap (rupee 2026-08-04: a B2 unit under test
// seated beside crown casts ZERO bursts) is avoided by NOT fielding crown here. Ammo-pin
// holders are yuni/helm (ammo-6 charge weapons with clean magazine structure); liter's
// SMG holds 120 rounds (+1 is invisible for her) and ada's burst weaponSwap phase
// dominates her firing (12–17-shot swap magazines) — both are asserted only as buff
// HOLDERS. Boss-debuff hygiene: liter's blocks are ally buffs/CDR, ada's enemy blocks are
// DoTs and helm's are flatDamage (damage events, not buffs) — so ANY boss-held buffApply
// in fixture A would be a laundering of the Y7 line.
//
// Fixture B (the heal window only): liter / crown / yuni / ada, forced-neutral boss,
// crown's own hitCount self-heal patched out (crownNoHeal, helm-test precedent). liter
// has no heal effects (verified: her blocks are buffs/burstCdr only) and neither does
// ada, so every recovery firing in this fixture is attributable to yuni's S2 heal.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;

// ---- fixtures ---------------------------------------------------------------------------------
/** Fixture A: burst + buffs + ammo. Slot order: liter 0 / yuni 1 / ada 2 / helm 3. */
const A_SLUGS = ['liter', 'yuni', 'ada', 'helm'] as const;
const YUNI = 1;
/** Fixture B: heal-window isolation. Slot order: liter 0 / crown 1 / yuni 2 / ada 3. */
const B_SLUGS = ['liter', 'crown', 'yuni', 'ada'] as const;
const CROWN = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function runA(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...A_SLUGS],
    bossElement: null,
    focusSlug: 'yuni',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
function runB(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...B_SLUGS],
    bossElement: null,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const sum = (t: Record<string, number>) =>
  A_SLUGS.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** Y1 reference: S1 removed entirely. */
const y1NoS1 = withPatchedOverride('yuni', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = [];
  if (before === 0) {
    throw new Error('yuni skill1 blocks missing — fixture is stale');
  }
});
/** Y1 wrong trigger: burstCast (lands on her cast frame, BEFORE the FB window opens)
 *  instead of fullBurstEnter (lands exactly on the fullBurstStart frame). */
const y1OnBurstCast = withPatchedOverride('yuni', (ov) => {
  for (const b of ov.skill1) {
    b.trigger = { kind: 'burstCast' };
  }
});
/** Y1 wrong scope: self only instead of all allies. */
const y1SelfOnly = withPatchedOverride('yuni', (ov) => {
  for (const b of ov.skill1) {
    b.target = { kind: 'self' };
  }
});
/** Y2 wrong trigger cadence: S2 keyed to her OWN burst casts instead of every
 *  full-charge pull. */
const y2OnBurst = withPatchedOverride('yuni', (ov) => {
  for (const b of ov.skill2) {
    b.trigger = { kind: 'burstCast' };
  }
});
/** Y3 nearest-wrong misread: the S2 DEF grant as an OFFENSIVE atkPct buff (would move
 *  every holder's damage — defPct is the inert-by-construction stat). */
const y3AtkMisread = withPatchedOverride('yuni', (ov) => {
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'defPct') {
        e.stat = 'atkPct';
      }
    }
  }
});
/** Y3 reference: ONLY the defPct effect removed (ammo + heal stay — isolates the inertia
 *  of the DEF half). */
const y3DefRemoved = withPatchedOverride('yuni', (ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'defPct');
    removed += before - b.effects.length;
  }
  if (removed === 0) {
    throw new Error('yuni S2 defPct effect missing — fixture is stale');
  }
});
/** Y4 nearest-wrong magnitude encoding: the flat-round line as a percent (maxAmmoPct 1 →
 *  round(6×1.01) = 6 — never extends a magazine). */
const y4AmmoPct = withPatchedOverride('yuni', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'maxAmmoFlat');
  if (!e) {
    throw new Error('yuni S2 maxAmmoFlat effect missing — fixture is stale');
  }
  e.stat = 'maxAmmoPct';
});
/** Y4 reference: the whole S2 removed (functional baseline). */
const y4NoS2 = withPatchedOverride('yuni', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('yuni skill2 blocks missing — fixture is stale');
  }
});
/** Y5 reference: ONLY the heal effect removed (fixture B — zero recovery firings must
 *  remain, proving every firing is attributable to yuni's S2 heal). */
const y5NoHeal = withPatchedOverride('yuni', (ov) => {
  let removed = 0;
  for (const b of ov.skill2) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    removed += before - b.effects.length;
  }
  if (removed === 0) {
    throw new Error('yuni S2 heal effect missing — fixture is stale');
  }
});
/** Y5 isolation: crown's own hitCount self-heal removed so every recovery firing in
 *  fixture B is yuni's (helm-test precedent). */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  let removed = 0;
  for (const slot of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[slot]) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      removed += before - b.effects.length;
    }
  }
  if (removed === 0) {
    throw new Error('crown heal block missing — fixture is stale');
  }
});
/** Y6 wrong magnitude: the lvl-1 value 172.4 instead of the lvl-10 348.73. */
const y6Weak = withPatchedOverride('yuni', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('yuni burst flatDamage block missing — fixture is stale');
  }
  e.atkPct = 172.4;
});
/** Y6 wrong trigger: fullBurstEnter (lands INSIDE the +50% major) instead of burstCast
 *  (lands on yuni's OWN cast frame, before the window opens). */
const y6OnFbEnter = withPatchedOverride('yuni', (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!block) {
    throw new Error('yuni burst flatDamage block missing — fixture is stale');
  }
  block.trigger = { kind: 'fullBurstEnter' };
});
/** Y6 reference: the burst nuke removed (functional baseline). */
const y6NoBurst = withPatchedOverride('yuni', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length === before) {
    throw new Error('yuni burst flatDamage block missing — fixture is stale');
  }
});
/** Y7 the laundering mis-model: the burst Immobilize rewritten as a boss damageTakenPct
 *  debuff (a different mechanic the kit never grants — the boss taking MORE damage). */
const y7Laundered = withPatchedOverride('yuni', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 25, durationSec: 5 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = runA();
const noS1 = runA({ yuni: y1NoS1 });
const onBurstCast = runA({ yuni: y1OnBurstCast });
const selfOnly = runA({ yuni: y1SelfOnly });
const s2OnBurst = runA({ yuni: y2OnBurst });
const atkMisread = runA({ yuni: y3AtkMisread });
const defRemoved = runA({ yuni: y3DefRemoved });
const ammoPct = runA({ yuni: y4AmmoPct });
const noS2 = runA({ yuni: y4NoS2 });
const weak = runA({ yuni: y6Weak });
const onFbEnter = runA({ yuni: y6OnFbEnter });
const noBurst = runA({ yuni: y6NoBurst });
const laundered = runA({ yuni: y7Laundered });
// Fixture B (heal isolation — crown's own heal patched out in EVERY run).
const healBase = runB({ crown: crownNoHeal });
const healNone = runB({ yuni: y5NoHeal, crown: crownNoHeal });
const healOnBurst = runB({ yuni: y2OnBurst, crown: crownNoHeal });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const yuniBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === YUNI && b.stat === stat);
const yuniBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'yuni');
const yuniShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'yuni');
const yuniNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'yuni' && e.bucket === 'burst'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const bossBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.targetIdx === null);

/** Group a unit's shots by magazine ordinal. */
function byMag(evs: SimEvent[], slug: string): Map<number, Shot[]> {
  const m = new Map<number, Shot[]>();
  for (const s of
    evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === slug)) {
    (m.get(s.magIndex) ?? m.set(s.magIndex, []).get(s.magIndex)!).push(s);
  }
  return m;
}
/** ammoAfter of each magazine's FIRST shot — the refill size minus one. */
const firstShotAmmoAfter = (evs: SimEvent[], slug: string): number[] =>
  [...byMag(evs, slug).values()].map((ss) => ss[0].ammoAfter);
const magSizes = (evs: SimEvent[], slug: string): number[] =>
  [...byMag(evs, slug).values()].map((ss) => ss.length);

/** Per-firing holder sets for one of yuni's buff channels. */
function holdersByFrame(applied: BuffApply[]): Map<number, Set<number | null>> {
  const perFrame = new Map<number, Set<number | null>>();
  for (const b of applied) {
    (
      perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
    ).add(b.targetIdx);
  }
  return perFrame;
}

/** Fixture B: frames on which crown's recovery-triggered team buff fired (distinct
 *  frames — one firing = one frame even though the block targets all allies). */
const recoveryFrames = (evs: SimEvent[]): number[] =>
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

describe('yuni — kit spec', () => {
  describe('fixture sanity — the B2 chain actually runs without crown', () => {
    it('yuni is the sole B2 of fixture A and casts every Full Burst (>= 6 casts / 180s)', () => {
      expect(yuniBursts(base.events).length).toBeGreaterThanOrEqual(6);
    });
    it('her RL weapon deals damage', () => {
      expect(base.totals.yuni).toBeGreaterThan(0);
    });
  });

  describe('Y1 — S1 team Charge Speed ▲8.97% for 10s on FULL BURST ENTRY', () => {
    const applied = yuniBuffs(base.events, 'chargeSpeedPct');

    it('is 8.97% for exactly 10s, reaching all four allies at every firing', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([8.97]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      for (const [, holders] of holdersByFrame(applied)) {
        expect(holders.size, 'S1 targets ALL allies, including herself').toBe(
          A_SLUGS.length
        );
      }
    });

    it('applies exactly on the Full Burst window start frames (fullBurstEnter, not burstCast)', () => {
      const starts = new Set(fbStarts(base.events));
      const frames = new Set(applied.map((b) => b.frame));
      expect(starts.size).toBeGreaterThan(0);
      expect(frames).toEqual(starts);
    });

    it('FUNCTIONAL: removing S1 changes team totals (charge-speed shortens every charge-weapon pull in-window)', () => {
      expect(sum(noS1.totals)).not.toEqual(sum(base.totals));
    });

    it('is a TIMING channel, not a damage bucket: no per-shot magnitude moves without it', () => {
      // Nearest-wrong family (S2b reviewer): folding Charge Speed into a charge-damage stat
      // (chargeDamagePct) would move per-shot multipliers. chargeSpeedPct must change only
      // shot SPACING — the set of kit magnitudes on her charge-bucket hits stays identical.
      const mags = (evs: SimEvent[]) =>
        [
          ...new Set(
            evs
              .filter(
                (e): e is Damage =>
                  e.kind === 'damage' && e.slug === 'yuni' && e.bucket === 'charge'
              )
              .map((d) => d.atkPct)
          ),
        ].sort((a, b) => a - b);
      expect(mags(noS1.events)).toEqual(mags(base.events));
    });

    it('DISCRIMINATING: the burstCast mis-keying lands every application OFF the window frames', () => {
      const misapplied = yuniBuffs(onBurstCast.events, 'chargeSpeedPct');
      expect(misapplied.length).toBeGreaterThan(0);
      const starts = new Set(fbStarts(onBurstCast.events));
      expect(
        misapplied.filter((b) => starts.has(b.frame)),
        'burstCast applications land on her cast frames, before the window opens'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the self-only mis-scope reaches exactly one holder per firing', () => {
      const selfApplied = yuniBuffs(selfOnly.events, 'chargeSpeedPct');
      expect(selfApplied.length).toBeGreaterThan(0);
      for (const [, holders] of holdersByFrame(selfApplied)) {
        expect(holders).toEqual(new Set([YUNI]));
      }
    });
  });

  describe('Y2 — S2 fires on EVERY FULL-CHARGE PULL (RL always full-charges)', () => {
    const shotFrames = new Set(yuniShots(base.events).map((s) => s.frame));
    const s2Frames = new Set(
      yuniBuffs(base.events, 'maxAmmoFlat').map((b) => b.frame)
    );

    it('activates once per yuni shot — the S2 frames ARE her shot frames', () => {
      expect(shotFrames.size).toBeGreaterThanOrEqual(60);
      expect(s2Frames).toEqual(shotFrames);
    });

    it('DISCRIMINATING: a burst-keyed S2 fires ~once per rotation, not once per pull', () => {
      const burstKeyed = new Set(
        yuniBuffs(s2OnBurst.events, 'maxAmmoFlat').map((b) => b.frame)
      );
      expect(burstKeyed.size).toBeGreaterThan(0);
      expect(burstKeyed.size * 5).toBeLessThan(shotFrames.size);
    });
  });

  describe('Y3 — S2 DEF ▲2.77% for 10s rides the same block, inert in v1', () => {
    const ammoFrames = new Set(
      yuniBuffs(base.events, 'maxAmmoFlat').map((b) => b.frame)
    );
    const applied = yuniBuffs(base.events, 'defPct');

    it('shares one activation with the ammo line (one block, three effects), magnitude 2.77, 10s', () => {
      expect(
        new Set(applied.map((b) => b.frame)),
        'DEF and ammo must fire on identical frames'
      ).toEqual(ammoFrames);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2.77]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is INERT in v1: an atkPct misread would move damage, defPct removal changes nothing', () => {
      expect(sum(atkMisread.totals)).not.toEqual(sum(base.totals));
      for (const s of A_SLUGS) {
        expect(
          defRemoved.totals[s],
          `${s} total with the DEF half removed`
        ).toEqual(base.totals[s]);
      }
    });
  });

  describe('Y4 — Max Ammunition Capacity ▲1 round for 5s (FLAT, not percent)', () => {
    const applied = yuniBuffs(base.events, 'maxAmmoFlat');

    it('carries the flat-round magnitude 1 with a 5s window, reaching all four allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([1]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
        expect(
          b.durationShots,
          "'1 round(s)' is the AMOUNT — 'for 5 sec' is the duration; no round-count expiry"
        ).toBeNull();
      }
      for (const [, holders] of holdersByFrame(applied)) {
        expect(holders.size).toBe(A_SLUGS.length);
      }
    });

    it('FUNCTIONAL: in-window refills load exactly 6 + 1 rounds for the ammo-6 holders', () => {
      // ada is deliberately EXCLUDED from the magazine-shape pins: her burst weaponSwap
      // phase dominates her firing (12–17-shot swap magazines with in-magazine refills),
      // so a normal-weapon 7-round magazine almost never completes for her. She still
      // RECEIVES the grant — the holder-reach assertion above pins all four allies.
      for (const holder of ['yuni', 'helm']) {
        const firsts = firstShotAmmoAfter(base.events, holder);
        expect(
          firsts.filter((n) => n === 6).length,
          `${holder} first-shot ammoAfter ${JSON.stringify(firsts)} — expected at least one 6+1 refill`
        ).toBeGreaterThanOrEqual(1);
        expect(
          magSizes(base.events, holder).filter((n) => n === 7).length,
          `${holder} must fire a 7-round magazine after the 6+1 refill`
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it('DISCRIMINATING: maxAmmoPct 1 computes round(6×1.01) = 6 — no extension ever happens', () => {
      for (const holder of ['yuni', 'helm']) {
        expect(
          firstShotAmmoAfter(ammoPct.events, holder),
          `the percent-only model never produces ${holder} first-shot ammoAfter 6`
        ).not.toContain(6);
        expect(
          magSizes(ammoPct.events, holder),
          `the percent-only model never extends ${holder} to 7 rounds`
        ).not.toContain(7);
        expect(
          firstShotAmmoAfter(noS2.events, holder),
          `with S2 removed, no 6+1 refill exists for ${holder} either`
        ).not.toContain(6);
      }
    });

    it('FUNCTIONAL: the extended magazines lift the ammo-6 holders’ totals vs S2 removed', () => {
      // More rounds per magazine → fewer reloads → more firing uptime. The S2 defPct half
      // is inert (Y3) and the heal half is invisible in fixture A (no recovery consumer),
      // so the delta is the ammo channel alone. ada is excluded (weaponSwap phase
      // dominates her damage; her normal-weapon extension is marginal by comparison).
      expect(base.totals.yuni).toBeGreaterThan(noS2.totals.yuni);
      expect(base.totals.helm).toBeGreaterThan(noS2.totals.helm);
    });
  });

  describe('Y5 — S2 recovers 2.77% of attack damage as HP OVER 10 SEC (a recovery window per pull)', () => {
    // The engine models no HP amount — a heal emits recovery events to its targets, and
    // the window's only observable is on-recovery CONSUMER behaviour (helm H8 precedent).
    // Fixture B observes through crown's "when recovery takes effect" block with crown's
    // OWN hitCount heal patched out; liter/ada carry no heal effects, so every recovery
    // firing is attributable to yuni's S2 line. NOTE: crown (B2) wins every stage-2 slot
    // in this fixture, so yuni casts ZERO bursts here (B2 starvation) — that is exactly
    // what starves the burst-keyed counterfactual below.
    const frames = recoveryFrames(healBase.events);
    const firstShot = yuniShots(healBase.events)[0]?.frame ?? Infinity;

    it('keeps recovery firing across the whole fight once her pulls begin', () => {
      expect(frames.length).toBeGreaterThan(0);
      expect(
        frames[0],
        'the first recovery cannot precede her first full-charge hit'
      ).toBeGreaterThanOrEqual(firstShot);
      expect(frames[0]).toBeLessThanOrEqual(firstShot + 2);
      const span = frames[frames.length - 1] - frames[0];
      expect(
        span,
        `recovery span ${span / FPS}s — overlapping per-pull 10s windows must cover most of the fight`
      ).toBeGreaterThanOrEqual(0.8 * (FIGHT_FRAMES - firstShot));
      expect(
        frames.length,
        'overlapping 10-tick windows fire far more often than the pulls that seed them'
      ).toBeGreaterThan(yuniShots(healBase.events).length);
    });

    it('is ATTRIBUTABLE: removing ONLY the heal effect zeroes every recovery firing', () => {
      expect(recoveryFrames(healNone.events)).toHaveLength(0);
    });

    it('DISCRIMINATING: a burst-keyed heal starves (yuni casts zero bursts beside crown)', () => {
      expect(yuniBursts(healOnBurst.events)).toHaveLength(0);
      expect(recoveryFrames(healOnBurst.events)).toHaveLength(0);
    });
  });

  describe('Y6 — burst nuke: 348.73% of final ATK to enemies in range, on her OWN cast', () => {
    const casts = yuniBursts(base.events);
    const nukes = yuniNukes(base.events);

    it('fires once per yuni burst cast, at the kit magnitude, in the burst bucket', () => {
      expect(casts.length).toBeGreaterThanOrEqual(6);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([348.73]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('lands on her own cast frames and never takes the +50% Full Burst major', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const d of nukes) {
        expect(castFrames.has(d.frame), 'nuke frame must be a cast frame').toBe(
          true
        );
      }
      expect(
        nukes.filter((d) => d.fbMajorApplied),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the lvl-1 magnitude 172.4 changes every nuke', () => {
      expect([...new Set(yuniNukes(weak.events).map((d) => d.atkPct))]).toEqual(
        [172.4]
      );
    });

    it('DISCRIMINATING: fullBurstEnter keying lands INSIDE the FB window (+50% major) off the cast frames', () => {
      const fbNukes = yuniNukes(onFbEnter.events);
      expect(fbNukes.length).toBeGreaterThan(0);
      expect(
        fbNukes.every((d) => d.fbMajorApplied),
        'fullBurstEnter nukes must take the FB major'
      ).toBe(true);
      const castFrames = new Set(
        yuniBursts(onFbEnter.events).map((c) => c.frame)
      );
      expect(
        fbNukes.filter((d) => castFrames.has(d.frame)),
        'fullBurstEnter applications must land off her cast frames'
      ).toEqual([]);
      expect(sum(onFbEnter.totals)).not.toEqual(sum(base.totals));
    });

    it('FUNCTIONAL: removing the nuke erases every burst-bucket hit and lowers her total', () => {
      expect(yuniNukes(noBurst.events)).toHaveLength(0);
      expect(base.totals.yuni).toBeGreaterThan(noBurst.totals.yuni);
    });
  });

  describe('Y7 — burst Immobilize-for-5s is genuinely unmodeled (the boss never acts)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride('yuni') as any;
      expect(ov.unmodeled.burst.join('\n')).toContain(
        'Immobilizes the target(s) for 5 sec.'
      );
    });

    it('enacts NOTHING: no boss-held debuff anywhere (CC is dropped, not laundered)', () => {
      // Boss debuffs emit with targetIdx null. Fixture mates cannot produce one: liter's
      // blocks are ally buffs/CDR, ada's enemy blocks are DoTs and helm's are flatDamage
      // (damage events, not buffs) — so ANY boss-held buffApply would be a laundering of
      // the Immobilize line.
      expect(bossBuffs(base.events)).toHaveLength(0);
    });

    it('the omission is a choice: the damageTakenPct laundering counterfactual emits boss debuffs and lifts team totals', () => {
      expect(bossBuffs(laundered.events).length).toBeGreaterThan(0);
      expect(sum(laundered.totals)).not.toEqual(sum(base.totals));
    });
  });
});
```

### 7b. src/skills/overrides/yuni.json (validate-overrides PASS)

```json
{
  "slug": "yuni",
  "note": "yuni (Yuni — the BASE unit; RL / Defender / Fire / Burst II, cd 20s, ammo 6, reloadFrames 141, chargeFrames 90, chargeMult 350, normalMult 61.3, burstGaugePerShot 1.4, SSR). EXACT SLUG: `yuni` has NO variant twin — lint-slug-disambiguation passes clean on the full kit summary (no disambiguation note required, unlike the mica/mica-snow-buddy family). FROM-SCRATCH kit-autonomy build 2026-08-05 (no prior override / kit-status row; baseline was bare weapon, simSupported:false) — test-first re-derivation pinned by scripts/tests/units/yuni.test.ts (groups Y0–Y7, two fixtures). SKILL1 ('■ Affects all allies. Activates when entering Full Burst. Charge Speed ▲ 8.97% for 10 sec.'): ONE block, fullBurstEnter trigger (team-event keyed — fires on ANY Full Burst, helm H5 precedent), target allies (self included, no exclusion clause), buff chargeSpeedPct 8.97 durationSec 10. chargeSpeedPct is the engine's SUBTRACTIVE charge formula (sim.ts needed = round(chargeFrames×(1−cs/100)); anis-star precedent) → her 90f RL charge shortens to 82f in-window; it is a TIMING channel only — the unit test pins that no per-shot magnitude (atkPct set) moves without it (nearest-wrong family: folding Charge Speed into a damage bucket, S2b reviewer's shared-prior misread). Applied exactly on the fullBurstStart frames — never burstCast (probe 2026-08-05: stage casts precede the FB window by 22–52 frames; fullBurstEnter buffs land exactly on the window frames; unit test pins the frame-set equality). SKILL2 ('■ Activates when attacking with Full Charge. Affects all allies. DEF ▲ 2.77% for 10 sec. Restores 2.77% of attack damage as HP over 10 sec. Max Ammunition Capacity ▲ 1 round(s) for 5 sec.'): ONE block, shotFired trigger — for an RL every trigger pull IS a full charge (helm/cinderella precedent: full-charge riders key per shot) — target allies (self included), three effects on one activation: (1) buff defPct 2.77 durationSec 10 — FAITHFUL but damage-INERT in v1 (self/ally DEF never feeds damage dealt; novel/poli/crust/sakura/diesel/jackal/mica precedent; the unit test proves byte-identical totals with ONLY this effect removed, and the atkPct misread moving totals). (2) heal ticks:10 intervalSec:1 — the engine models NO HP amount; a heal emits recovery events to its targets (helm H8 precedent for the 'FOR/OVER 10 SEC' recovery-window shape: the window LENGTH is kit-literal, the tick CADENCE inside it is the engine-native 1s approximation, documented below). Observable only through on-recovery consumers — the unit test observes it through crown's 'when recovery takes effect' block in a dedicated isolation fixture (crown's own hitCount heal patched out; liter/ada carry no heal effects), where the overlapping per-pull windows keep recovery firing across the whole fight. (3) buff maxAmmoFlat 1 durationSec 5 — the theme-14 FLAT-round primitive (mica M4 precedent): '▲ 1 round(s)' is a MAGNITUDE in flat rounds, NOT a percent and NOT a durationShots round-count; maxAmmo() = round(base×(1+pct/100)) + flat, so the nearest-wrong maxAmmoPct 1 computes round(6×1.01) = 6 and silently never extends a magazine (pinned RED). Note the 5s window is deliberately SHORTER than its siblings' 10s — pinned. LOAD-BEARING weapon-state modifier (hard rule 1 / prior 9): extended magazines → fewer reloads → more firing uptime for every ammo-bound holder. BURST ('■ Affects enemies within attack range. Deals 348.73% of final ATK as damage. Immobilizes the target(s) for 5 sec.', burstCast — HER OWN cast, never fullBurstEnter: as the sole B2 of the test fixture she casts every Full Burst so both keyings fire equal COUNTS; the discrimination is TIMING — the cast lands BEFORE the Full Burst window opens, so the nuke never takes the +50% FB major, milk K5/harran/mica precedent): ONE block, target enemy ('enemies within attack range' collapses to the single partless boss at scope lock), flatDamage atkPct 348.73 (burst bucket, crit-eligible by flatDamage convention). The burst's second line 'Immobilizes the target(s) for 5 sec.' is UNMODELED (verbatim in unmodeled.burst) — there is NO boss-CC channel: the v1 boss never acts (no enemy-action model), so a boss-targeted immobilize moves nothing; the schema's stun primitive describes a NIKKE unable to fire/charge/reload, not a boss freeze. The nearest-wrong encoding — laundering the CC into a boss damageTakenPct debuff (a different mechanic the kit never grants) — is pinned RED (⚑1). Burst gauge: no row in data/gauge-per-shot.json — the class-modal fallback applies; her kit carries no gauge line (flatPerTrigger 0 is faithful). Cadence tuple: RL chargeFrames 90 + reloadFrames 141 + ammo 6 shipped datamine as-is (cadence-tuple ⚑ RETIRED by owner ruling 2026-07-25 — datamine tuple reliable; no charFixes). NO `ignored` blocks. EVIDENCE TIER: every modeled magnitude is SL10 kit-text-literal (DATAMINED): 8.97 / 10s (S1), 2.77 / 10s (S2 DEF), 2.77 / 10s (S2 heal — the HP amount itself is unmodeled; only the recovery channel is), 1 round / 5s (S2 ammo), 348.73 (burst). TIER 2: the fullBurstEnter-vs-burstCast identity (both the S1 window keying and the nuke's FB-major exemption, timing-discriminated in the sole-B2 fixture), the flat-round weapon-state modifier, the recovery-window encoding, and one out-of-domain ⚑ cluster. ⚑ LIST: [⚑1] (OUT-OF-DOMAIN, boss-CC channel — TIER 2) the burst Immobilize-5s line: estimate = ZERO damage impact at scope lock (the boss never acts; immobilization changes nothing about damage dealt or taken in v1) and zero in game too (CC does not modify the boss's DEF or damage-taken); recipe = an enemy-action/boss-behaviour subsystem (engine-core) — no damage primitive can encode it faithfully; NEVER launder into damageTakenPct (a different mechanic — pinned RED) or an ally-side stun; tier = out-of-domain. [⚑2] (recovery tick cadence — engine-native approximation) the heal's 1s tick cadence inside the kit-literal 10s window: at her ~1.5s RL pull cadence the windows overlap and on-recovery consumers stay refreshed continuously regardless of the intra-window cadence; recipe = a popup-read of an on-recovery consumer's proc rate in a yuni+crown focus video if the cadence ever matters; tier = engine-native default (helm H8 precedent). Kit-autonomy gauntlet 2026-08-05.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": ["Immobilizes the target(s) for 5 sec."]
  },
  "caveats": [
    "skill1: chargeSpeedPct is the engine's SUBTRACTIVE charge formula (needed = round(chargeFrames×(1−cs/100)) → 90f→82f) and a TIMING channel only — the unit test pins that no per-shot magnitude moves with it on or off; the buff lands exactly on the fullBurstStart frames (fullBurstEnter, never burstCast).",
    "skill2: the heal line models NO HP amount — it emits recovery events to all allies (10 ticks at 1s per full-charge pull; the 10s WINDOW is kit-literal, the tick cadence is the engine-native approximation per helm H8 precedent). Its only sim observable is on-recovery consumer behaviour; with no consumer in a comp the line is honestly invisible.",
    "skill2: the ammo line is FLAT +1 round for 5s (theme-14 primitive) — deliberately shorter than its siblings' 10s windows, and a percent encoding (maxAmmoPct 1 → round(6×1.01)=6) silently never extends a magazine; the DEF half rides the same block and is damage-inert in v1.",
    "burst: 'Affects enemies within attack range' collapses to the single partless boss at scope lock; the Immobilize half has no boss-CC channel (⚑1) — unmodeled verbatim, never laundered into damageTakenPct or stun."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "chargeSpeedPct", "value": 8.97, "durationSec": 10 }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "shotFired" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "defPct", "value": 2.77, "durationSec": 10 },
        { "kind": "heal", "ticks": 10, "intervalSec": 1 },
        { "kind": "buff", "stat": "maxAmmoFlat", "value": 1, "durationSec": 5 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 348.73 }]
    }
  ]
}
```
