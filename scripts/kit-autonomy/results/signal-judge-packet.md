# KIT-AUTONOMY S7 — RECONCILING JUDGE PACKET — unit `signal`
Assembled by the driver (Qwen) per scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md. You are the BINDING
judge. Grade the driver's artifacts against the kit prose + the mechanics SSOT; do not re-run sims.

## 1. YOUR CONTRACT (RECONCILING-JUDGE.md)

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


## 2. MECHANICS SSOT — read these two docs; they are the formula/game-model source of truth

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


## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json, lvl 10)

```json
{
  "slug": "signal",
  "name": "Signal",
  "weapon": "SMG",
  "class": "Attacker",
  "element": "Fire",
  "burst": "II",
  "burstCooldownSec": 20,
  "manufacturer": "Elysion",
  "normalAttackMultiplier": 8.1,
  "coreAttackMultiplier": 200,
  "ammo": 120,
  "reloadFrames": 81,
  "chargeFrames": 0,
  "hitsPerShot": 1,
  "burstGaugePerShot": 0.1,
  "releaseDate": "2022-11-04",
  "rarity": "SSR",
  "skills": {
    "skill1": "\u25a0 Activates after landing 60 normal attack(s). Affects the target(s).\nDEF \u25bc 5.94% for 5 sec. \nATK \u25bc 5.94% for 5 sec.",
    "skill2": "\u25a0 Affects self. Activates when entering Full Burst.\nRecover 44.08% of attack damage as HP over 10 sec.",
    "burst": "\u25a0 Affects enemies within attack range.\nDeals 229.22% of final ATK as damage.\nDEF \u25bc 12.34% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 78,
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
    "resourceId": 22
  }
}
```

NOTE the lvl-10 magnitudes are DATAMINED (description_value tables at index 9): S1 = 60 hits / 5.94 / 5s
/ 5.94 / 5s; S2 = 44.08 / 10s; burst = 229.22 / 12.34 / 10s. Signal is a BASE unit (no variant shares
the name) — SSR rarity, plain scope-lock ceiling applies.

## 4. S2b CROSS-FAMILY TEST REVIEW (claude-fable-5, pre-op)

```json
{
  "slug": "signal",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "after landing 60 normal attack(s): DEF ▼",
      "disposition": "FAITHFUL",
      "scope": "Counts NORMAL-ATTACK hits only — skill/burst damage instances, DoT ticks, and any rider hits must NOT advance the 60-hit counter. SMG hitsPerShot=1, so rounds == hits == pulls here (the AR/MG rounds-vs-pulls divergence is moot, but the trigger must still be authored as hitCount, which counts rounds).",
      "durationSemantics": "durationSec: 5 — wall-clock seconds, refreshed on each re-trigger (same caster+slot key overwrite). NOT durationShots. At SMG effective cadence (~20 rounds/s ⚑ datamine-unreliable), 60 rounds ≈ 3s, so continuous fire refreshes the 5s window before lapse → near-permanent uptime while firing; the only lapse risk is a reload gap plus trigger-rebuild exceeding 5s (mag 120 @ ~20/s = ~6s, reload 81f ≈ 1.35s → refresh at ~10.4s beats the ~11s expiry; assert it does NOT lapse under continuous fire, and that the counter is cumulative across reloads).",
      "triggerIdentity": "hitCount count:60 on the owner's normal attacks. No FB gate, no status gate, no everyN beyond the count itself. First fire is EARNED (~3s in), never t=0.",
      "targetSet": "enemy (the boss) — 'Affects the target(s)'. Boss-held debuff: buffApply with casterIdx===null AND targetIdx===null; filter by stat+value. Benefits the WHOLE TEAM's damage (a boss debuff is never a self buff — taxonomy 4).",
      "nearestWrongModel": "Encoding DEF ▼ as damageTakenPct 5.94 (a multiplicative 'takes more damage' debuff) instead of a boss-DEF reduction — the two diverge everywhere because DEF is a subtractive term in the damage formula, so a 5.94% DEF cut moves damage far less than a 5.94% damage-taken multiplier. Secondary misread: interval {sec:60} instead of hitCount 60.",
      "distinguishingAssertion": "Event log: first buffApply for the DEF-down (stat defPct — NOT damageTakenPct — value 5.94, casterIdx===null) appears only after 60 owner normal-attack shot events (~3s), with zero applications at t=0; re-applications every subsequent 60 rounds refresh it. Damage delta from toggling the line ON (withPatchedOverride removing it) must equal the boss-DEF-term reduction for ALL FOUR units' totals, not a flat ×1.0594 on anyone.",
      "inertness": "Zero buffApply before the 60th round; skill/burst/DoT damage events must not advance the counter (patch the burst off → counter cadence unchanged); no unit's totals move by a flat 5.94% multiplier.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▼ 5.94% for 5 sec.",
      "disposition": "UNMODELED",
      "scope": "Boss OFFENSE reduction — the boss deals no damage at scope (no HP pool, nobody takes hits), so this line has no damage-side consumer.",
      "durationSemantics": "5 sec wall-clock, same refresh cadence as the DEF line if modeled.",
      "triggerIdentity": "Same hitCount:60 trigger as the sibling DEF line (one ■ header covers both effect sentences).",
      "targetSet": "enemy (boss).",
      "nearestWrongModel": "Applying ATK ▼ to SELF or to allies (reading 'the target(s)' as the buff recipient pool) — an ally-scoped atkPct −5.94 would visibly DEPRESS team damage; or modeling it as a live boss stat that somehow feeds a damage term.",
      "distinguishingAssertion": "totals() for every unit are bit-identical with this effect present vs stripped (withPatchedOverride); no buffApply with stat atkPct and a negative value ever targets a unit slot (targetIdx must never be 0..3 for this line).",
      "inertness": "Must move ZERO damage for all four units; must never appear as an ally/self debuff.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Recover 44.08% of attack damage as HP",
      "disposition": "UNMODELED",
      "scope": "Lifesteal-style HP recovery over 10s, SELF only. No HP pool consequence at scope (boss deals no damage). If encoded at all for completeness, it is a heal effect (ticks:10, intervalSec:1) emitting recovery events to SIGNAL — and only Signal's own 'recovery' triggers would fire (she has none), so it is damage-inert even in heal-synergy comps unless a teammate heals off HER (they don't; recovery triggers fire on the RECIPIENT).",
      "durationSemantics": "over 10 sec — a heal-over-time window, NOT a buff duration.",
      "triggerIdentity": "fullBurstEnter — 'when entering Full Burst' fires on ANY team Full Burst, including rotations where the OTHER Burst II unit (not Signal) cast stage 2. This is the correct WIDER trigger; do not narrow it to burstCast.",
      "targetSet": "self.",
      "nearestWrongModel": "THE trap on this kit: parsing '44.08% of attack damage' as an attackDamagePct 44.08 BUFF (Damage Up bucket) on FB entry — converting a defensive lifesteal into a massive recurring team-tier damage steroid. A model carrying buffApply{stat:'attackDamagePct', value:44.08} is catastrophically over-credited.",
      "distinguishingAssertion": "Across a full run, NO buffApply with stat attackDamagePct (or atkPct/sustainedDamagePct) valued 44.08 ever appears from Signal's skill2; totals() for all units are identical with skill2 stripped via withPatchedOverride. If the driver encoded it as a heal for completeness: heal-driven recovery events target Signal only, first at each fullBurstStart (any caster), and totals still do not move.",
      "inertness": "Zero damage movement for every unit; zero recovery events targeting anyone but Signal; fires per team FB, not only per Signal-cast rotation (if encoded).",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Deals 229.22% of final ATK as damage.",
      "disposition": "FAITHFUL",
      "scope": "One instant burst-slot damage instance per cast, 229.22% of Signal's FINAL ATK (buffed at cast). Lands in the burst bucket. No core (text never says core strike); crit per the engine's rider convention; no +30% range bonus (riders are universally range-OFF).",
      "durationSemantics": "Instant — no duration.",
      "triggerIdentity": "burstCast — Signal's OWN Burst II cast. Verified timing fact: burst-cast damage lands BEFORE Full Burst begins → no +50% FB major, no FB-entry auras snapshot into it (FB-exempt by timing, taxonomy 9). Fires ONLY on rotations Signal is the stage-2 caster.",
      "targetSet": "enemy (boss); 'enemies within attack range' is AoE flavor — single boss at scope.",
      "nearestWrongModel": "Two compounding misreads: (a) keying to fullBurstEnter so it fires on rotations the OTHER Burst II unit casts (over-fires whenever a same-tier competitor exists — exactly the burstCast≠fullBurstEnter trap); (b) letting the hit take the +50% Full Burst major because 'bursts happen at FB time'.",
      "distinguishingAssertion": "Every damage event with mult 229.22 has srcSlot === Signal's slot, bucket 'burst', inFullBurst === false AND fbMajorApplied === false, rangeApplied === false — and the COUNT of such events equals the count of Signal's own burstCast events, NOT the count of fullBurstStart events (in a comp with a second Burst II, these two counts diverge; assert against burstCast).",
      "inertness": "No 229.22% instance on rotations where the other Burst II unit cast stage 2; no instance ever carries the FB +50% or the range +30%.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "DEF ▼ 12.34% for 10 sec.",
      "disposition": "FAITHFUL",
      "scope": "Boss DEF reduction — team-wide damage benefit via the DEF term, same channel question as skill1's DEF line. Stacks WITH skill1's 5.94% DEF ▼ (different slot key → both live simultaneously; they never overwrite each other).",
      "durationSemantics": "durationSec: 10, wall-clock, from the cast frame. With Signal's 20s burst cooldown, expect ~50% uptime at best on Signal-cast rotations — a near-permanent encoding is wrong.",
      "triggerIdentity": "burstCast (rides the same cast as the 229.22% hit). Only on Signal-cast rotations.",
      "targetSet": "enemy (boss) — boss-held buffApply, casterIdx===null, targetIdx===null.",
      "nearestWrongModel": "durationSec 10 silently extended/refreshed by team FBs (fullBurstEnter keying), giving whole-fight uptime; or damageTakenPct 12.34 substituted for the DEF reduction (same subtractive-vs-multiplicative confusion as skill1).",
      "distinguishingAssertion": "buffApply for stat defPct value 12.34 (casterIdx===null) occurs exactly once per SIGNAL burstCast with expiresFrame = castFrame + 600; no application on rotations the other Burst II unit casts; toggling the line moves all four units' totals only during the 10s post-cast windows (damage delta consistent with a DEF-term cut, not ×1.1234 anywhere).",
      "inertness": "Absent on non-Signal rotations; expires at 10s (no refresh from team FB events); never stacks by overwriting skill1's separate 5.94% key.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:DEF ▼ 5.94% (hitCount 60)",
    "burst:Deals 229.22% of final ATK",
    "burst:DEF ▼ 12.34% for 10 sec"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "ATK ▼ 5.94% for 5 sec."
    ],
    "skill2": [
      "Recover 44.08% of attack damage as HP over 10 sec."
    ],
    "burst": []
  },
  "notes": "Three reconciliation points. (1) FIXTURE HAZARD: Signal is Burst II, but controlComp(carry) seats the carry in the B3 slot beside crown (B2) — with two Burst II units the stage-2 cast alternates/competes under first-ready selection, and helm must carry stage 3 for FBs to happen at all. The driver's tests MUST establish which rotations Signal actually casts (count her burstCast events) before asserting her burst-line cadence; a test that assumes she casts every rotation is wrong in this fixture, and a burst keyed to fullBurstEnter would falsely pass a per-rotation count. (2) ENEMY-DEF CHANNEL: both DEF ▼ lines require a live boss-DEF reduction path. The schema's defPct comment covers only SELF DEF ('inert in v1'); if the engine has no enemy-DEF consumer, the faithful dispositions become GAP and the driver must declare that openly — silently substituting damageTakenPct with the raw kit percentages is the shared-prior fudge I most expect, and it is numerically wrong because DEF is subtractive in the damage formula. (3) SKILL2 MISPARSE: '44.08% of attack damage as HP' is the single most dangerous line — a parser pattern-matching 'attack damage 44.08%' into an attackDamagePct buff on FB entry would inflate the whole kit; the inertness assertion (totals identical with skill2 stripped) is mandatory even though the line is defensive. Magnitudes are all kit-literal (DATAMINED); the only ⚑ in play is the SMG cadence tuple feeding the 60-hit trigger's expected timing, which the tests should treat as approximate (assert ordering/counting, not exact frames).",
  "model": "claude-fable-5"
}

```

## 5. S5 BLIND TEST (claude-opus-5, authored from kit prose alone) — RESULT vs the driver override

RUN RESULT (driver-executed, deterministic expected-value sims): **7 passed, 7 failed, 5 skipped**.
The 5 skips are the blind author's OWN it.skip engine-gap declarations (enemy-DEF/ATK consumer absent,
lifesteal magnitude unobservable, range-exclusion field unreadable blind).

THE 7 REDS DECOMPOSE INTO TWO CLUSTERS — neither is a mechanical divergence in the driver's model:

CLUSTER A (5 REDs) — dead-encoding vs documented-UNMODELED POLICY: 'is authored as a hitCount:60 block',
'procs many times' (expects boss-debuff EVENTS), 'doubling the threshold halves the procs', 'debuff lands
on the boss only', and 'the 12.34% debuff fires once per signal burst'. All five expect the dead enemy
defPct/atkPct blocks to EXIST and EMIT. The driver ships them as verbatim UNMODELED + flags instead
(mica/ether/exia precedent — the engine drops enemy ATK-down/DEF-down at dispatch; encoding them is
noise, not faithfulness). DECISIVE: the blind suite's OWN mechanical assertions about these lines PASS
against the driver override — 'the skill1 shred moves NO damage' is GREEN (totals byte-identical with
the line toggled), exactly as the blind author's fudge-detector intended. The S6 blind override ENCODES
the dead blocks and its own audit admits they are engine-inert — so blind-vs-blind also agrees the
difference is policy, not mechanics.

CLUSTER B (2 REDs) — FIXTURE ARTIFACT (competing Burst II): 'zeroing the 229.22% hit strictly lowers
signal damage' and 'forcing core:true strictly raises it' both see NO movement, because under
controlComp('signal', true) = [liter B1, crown B2, signal, helm B3] signal NEVER CASTS: crown (also
Burst II, same 20s CD) takes every stage-2 slot. Driver probe (burstCast events over a full 180s run):
{ liter: 10, crown: 10, helm: 5, signal: 0 } — signal's 85.05M total there is weapon-only. This is the
exact fixture-choice artifact a prior S7 judge already ruled on (batch precedent: 'the blind S5 fixture
(controlComp adds crown as a competing Burst II) is a fixture-choice artifact that vacates its own
burst/FB assertions — NOT a faithfulness signal. The driver's sole-B2 comp is the correct discriminating
fixture.'). The driver's spec runs a SOLE-B2 fixture [liter, signal, ada, asuka] where signal casts
every Full Burst and pins the nuke non-vacuously (fires once per cast at 229.22, burst bucket,
crit-eligible, never takes the FB major, removal lowers her total).

THE 7 GREENS include every mechanically load-bearing convergence: the fixture reaches Full Burst; the
skill1 shred moves no damage (fudge detector); skill2 keys on fullBurstEnter (any team FB), targets
self, is not a damage buff, emits no 44.08 anywhere, and is team-damage-inert; the burst is authored
burstCast/enemy with exactly one flatDamage at 229.22 and no core; and forcing noFb is a strict no-op.

TWO driver adaptations were required to make the raw file EXECUTABLE (zero assertion changes):
  1. harness import path (blind dir has no ../lib/harness — shared harness lives at
     scripts/tests/lib/harness.js; ../../tests/lib/harness.js from there).
  2. cfg.onEvent placement: run() passed onEvent at the TOP LEVEL of the runComp options; CompOptions
     threads it under `cfg` (the harness's documented path). Moved into cfg so the event log populates.
Both are marked in the adapted file's header (scripts/kit-autonomy/blind/signal.adapted.test.ts).
The RAW blind file follows:

```typescript
/**
 * signal — kit spec test (BLIND author: kit prose + harness/schema docs only;
 * no access to the driver's override, tests, or reasoning).
 *
 * KIT — Signal (`signal`), SMG / Fire / Attacker / Burst II, 120 ammo, 1 hit per shot.
 *   skill1: trigger 'after landing 60 normal attack(s)', target = the enemy;
 *           DEF -5.94% and ATK -5.94%, 5 sec each.
 *   skill2: self; trigger 'when entering Full Burst'; 44.08% lifesteal over 10 sec.
 *   burst:  enemies in range; 229.22% of final ATK as damage; DEF -12.34% for 10 sec.
 *
 * FIXTURE — controlComp('signal', true). Signal is a Burst II, so the fixed Burst III
 * slot is MANDATORY: without it the burst chain never completes, the fight has zero
 * Full Bursts, and both skill2's fullBurstEnter trigger and the burst window would be
 * vacuous. The fixture's other Burst II unit is also what makes the skill2 trigger
 * identity (fullBurstEnter vs burstCast) discriminable at all.
 *
 * LOAD-BEARING READINGS THIS FILE ENCODES
 *  - skill1 is a ROUND counter, not a magazine event: 60 landed normal attacks on a
 *    120-round SMG magazine is ~2 procs per magazine. Nearest-wrong models are
 *    lastBullet / hitCount:120 (half the procs) and shotFired (one per round).
 *  - skill2 keys on ENTERING Full Burst, i.e. ANY team Full Burst — not 'when using
 *    Burst Skill'. Signal shares Burst II with a fixture ally, so a burstCast key
 *    would systematically UNDER-fire.
 *  - The two DEF-down lines and the ATK-down line are ENEMY debuffs. The effect schema
 *    exposes no enemy-DEF consumer (`defPct` is documented as SELF DEF and inert;
 *    `damageTakenPct` is a different, multiplicative mechanic), so the shred is
 *    expected to be RECORDED on the boss debuff channel but damage-INERT. Re-encoding
 *    DEF-down as damageTakenPct would be a fudge; the inertness assertions catch it.
 *    If those assertions go RED, the driver credited the shred through some damage
 *    channel and that conversion needs measured justification, not a fit.
 *  - Burst-cast damage lands before the Full Burst window opens, so the 229.22% hit
 *    takes no +50% Full Burst major: patching noFb must be a strict no-op.
 *  - The kit never says 'core strike damage', so the burst hit is body-only: patching
 *    core:true must strictly RAISE signal's damage.
 *
 * SHAPE NOTE — the packet documents two shapes for an override slot (a bare Block[]
 * and a CharacterSkills carrying .blocks). blocksOf() normalises both so the
 * counterfactuals mutate the real array either way; withPatchedOverride clones, so the
 * committed JSON is never touched.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

type Slot = 'skill1' | 'skill2' | 'burst';
type AnyRec = Record<string, any>;

const SLUG = 'signal';

function blocksOf(ov: AnyRec, slot: Slot): AnyRec[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s as AnyRec[];
  if (s && Array.isArray((s as AnyRec).blocks)) return (s as AnyRec).blocks as AnyRec[];
  return [];
}

function effectsOf(ov: AnyRec, slot: Slot): AnyRec[] {
  return blocksOf(ov, slot).flatMap((b) => (b.effects ?? []) as AnyRec[]);
}

/** Read-only view of the committed override (an unmutated clone). */
const OV: AnyRec = withPatchedOverride(SLUG, () => {}) as unknown as AnyRec;

function comp(ov?: unknown): AnyRec {
  const base = controlComp(SLUG, true) as unknown as AnyRec;
  if (!ov) return base;
  return { ...base, overrides: { ...(base.overrides ?? {}), [SLUG]: ov } };
}

function run(opts: AnyRec) {
  const events: AnyRec[] = [];
  const res = runComp({
    ...opts,
    onEvent: (ev: SimEvent) => events.push(ev as unknown as AnyRec),
  } as Parameters<typeof runComp>[0]);
  return { res, events };
}

const near = (a: number, b: number) => Math.abs(Math.abs(a) - b) < 1e-6;

/** Boss-held debuffs are the only buffApply events with BOTH indices null. */
const bossDebuffs = (events: AnyRec[], value: number) =>
  events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.casterIdx === null &&
      e.targetIdx === null &&
      near(e.value, value),
  );

/** One proc = one application frame = one distinct expiry frame. */
const procCount = (events: AnyRec[], value: number) =>
  new Set(bossDebuffs(events, value).map((e) => e.expiresFrame)).size;

const appliesWithValue = (events: AnyRec[], value: number) =>
  events.filter((e) => e.kind === 'buffApply' && near(e.value, value));

// ---------------------------------------------------------------- counterfactuals
const P_S1_120 = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill1')) {
    if (b.trigger?.kind === 'hitCount') b.trigger.count = 120;
  }
});
const P_S1_INERT = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill1')) b.effects = [];
});
const P_S2_OFF = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill2')) b.effects = [];
});
const P_BURST_NODMG = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'flatDamage') e.atkPct = 0;
});
const P_BURST_CORE = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'flatDamage') e.core = true;
});
const P_BURST_NOFB = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'flatDamage') e.noFb = true;
});
const P_BURST_NODEBUFF = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'burst')) {
    b.effects = ((b.effects ?? []) as AnyRec[]).filter((e) => e.kind !== 'buff');
  }
});

// ------------------------------------------------------------------- hoisted runs
const BASE = run(comp());
const R_S1_120 = run(comp(P_S1_120));
const R_S1_INERT = run(comp(P_S1_INERT));
const R_S2_OFF = run(comp(P_S2_OFF));
const R_B_NODMG = run(comp(P_BURST_NODMG));
const R_B_CORE = run(comp(P_BURST_CORE));
const R_B_NOFB = run(comp(P_BURST_NOFB));
const R_B_NODEBUFF = run(comp(P_BURST_NODEBUFF));

const T_BASE = totals(BASE.res);

describe('signal — fixture sanity', () => {
  it('the control comp actually reaches Full Burst (else every FB-keyed claim is vacuous)', () => {
    const fbs = BASE.events.filter((e) => e.kind === 'fullBurstStart');
    expect(fbs.length).toBeGreaterThan(0);
    expect(T_BASE[SLUG]).toBeGreaterThan(0);
  });
});

describe('signal skill1 — 60-round hit counter, enemy DEF/ATK down 5.94% for 5 sec', () => {
  it('is authored as a hitCount:60 enemy-targeted block carrying the 5.94% / 5 sec debuff(s)', () => {
    const hc = blocksOf(OV, 'skill1').filter((b) => b.trigger?.kind === 'hitCount');
    // TRIGGER IDENTITY: a magazine-keyed (lastBullet) or per-shot (shotFired) author
    // fails here outright.
    expect(hc.length).toBeGreaterThan(0);
    expect(hc.some((b) => b.trigger.count === 60)).toBe(true);
    // TARGET SET: the kit says 'Affects the target(s)' — the enemy, never allies/self.
    for (const b of hc) expect(b.target?.kind).toBe('enemy');

    const at594 = hc
      .flatMap((b) => (b.effects ?? []) as AnyRec[])
      .filter((e) => e.kind === 'buff' && near(e.value, 5.94));
    expect(at594.length).toBeGreaterThan(0);
    // DURATION SEMANTICS: wall-clock seconds, not rounds/stacks.
    for (const e of at594) {
      expect(e.durationSec).toBe(5);
      expect(e.durationShots).toBeUndefined();
    }
    // NO SILENT DROP of the second (ATK down) line: modeled, or recorded as unmodeled.
    const atkDownRecorded =
      at594.length >= 2 ||
      ((OV.unmodeled?.skill1 ?? []) as string[]).some((s) => /ATK/i.test(s));
    expect(atkDownRecorded).toBe(true);
  });

  it('procs many times per fight and every 5.94% application is attributable to signal', () => {
    const procs = procCount(BASE.events, 5.94);
    // A passive / fullBurstEnter mis-key lands in single digits; a shotFired mis-key
    // lands in the thousands. A 120-round SMG at ~16 effective rounds/sec over 180s
    // gives ~40-60 procs at a 60-round threshold.
    expect(procs).toBeGreaterThan(10);
    expect(procs).toBeLessThan(500);
    // ATTRIBUTION: nothing else in the control comp emits a 5.94% boss debuff.
    expect(procCount(R_S1_INERT.events, 5.94)).toBe(0);
  });

  it('the threshold is a ROUND count — doubling it to 120 halves the procs', () => {
    const at60 = procCount(BASE.events, 5.94);
    const at120 = procCount(R_S1_120.events, 5.94);
    expect(at120).toBeGreaterThan(0);
    // Estimate-free discriminator. A magazine-keyed (lastBullet) or time-keyed model
    // is untouched by the count patch and lands at ratio ~1.0.
    const ratio = at60 / at120;
    expect(ratio).toBeGreaterThan(1.6);
    expect(ratio).toBeLessThan(2.6);
  });

  it('the debuff lands on the boss only — never on an ally or on self', () => {
    const all = appliesWithValue(BASE.events, 5.94);
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it('the skill1 shred moves NO damage (no enemy-DEF/ATK consumer exists)', () => {
    // Pins the modeling GAP and, in the same motion, is the fudge detector: if the
    // DEF-down were re-encoded as damageTakenPct (or any damage channel), team totals
    // would move here. A conversion like that needs measured justification.
    expect(totals(R_S1_INERT.res)).toEqual(T_BASE);
  });

  it.skip('GAP — the MAGNITUDE of enemy DEF -5.94% is unobservable: the schema has no enemy-DEF consumer (defPct is self-DEF and inert), so only the trigger/target/duration are testable', () => {
    // Needs an engine primitive for boss-DEF reduction plus a measured boss DEF value.
  });

  it.skip('GAP — enemy ATK -5.94% is structurally unobservable at scope lock: the boss deals no damage in v1, so an enemy ATK debuff has no consumer by construction', () => {
    // Record-only line; nothing to assert beyond its presence (covered structurally).
  });
});

describe('signal skill2 — self lifesteal on entering Full Burst', () => {
  it('keys on fullBurstEnter (any team Full Burst), targets self, and is not a damage buff', () => {
    const s2 = blocksOf(OV, 'skill2');
    const fbe = s2.filter((b) => b.trigger?.kind === 'fullBurstEnter');
    const recorded =
      fbe.length > 0 ||
      ((OV.unmodeled?.skill2 ?? []) as string[]).some((s) => /recover|HP/i.test(s));
    expect(recorded).toBe(true);
    // TRIGGER IDENTITY: 'entering Full Burst' is a team event. Keying it to the
    // owner's own cast under-fires whenever the other Burst II ally takes the stage.
    expect(s2.some((b) => b.trigger?.kind === 'burstCast')).toBe(false);
    for (const b of fbe) expect(b.target?.kind).toBe('self');
    // The classic mis-encode: lifesteal read as a 44.08% damage/ATK buff.
    for (const e of effectsOf(OV, 'skill2')) {
      expect(e.kind).not.toBe('flatDamage');
      expect(e.kind).not.toBe('hitRepeat');
      expect(e.kind).not.toBe('dot');
      if (e.kind === 'buff') expect(near(e.value, 44.08)).toBe(false);
    }
  });

  it('emits no 44.08% buff anywhere in the fight', () => {
    expect(appliesWithValue(BASE.events, 44.08).length).toBe(0);
  });

  it('is damage-inert for the whole team — the recovery is self-scoped', () => {
    // TARGET-SET discriminator: the control comp contains an on-recovery consumer
    // ally, so mis-targeting the heal to allies would move that ally's damage.
    expect(totals(R_S2_OFF.res)).toEqual(T_BASE);
  });

  it.skip('GAP — the 44.08% lifesteal amount is unobservable: v1 models no HP pool and cfg.onEvent has no recovery event kind, so only the trigger/target are testable', () => {
    // Would need an HP pool, or a teammate whose damage keys off receiving a heal.
  });
});

describe('signal burst — 229.22% of final ATK + enemy DEF -12.34% for 10 sec', () => {
  it('is authored as a burstCast enemy block carrying the 229.22% hit and the 12.34% / 10 sec debuff', () => {
    const b = blocksOf(OV, 'burst');
    expect(b.length).toBeGreaterThan(0);
    for (const blk of b) {
      expect(blk.trigger?.kind).toBe('burstCast');
      expect(blk.target?.kind).toBe('enemy');
    }
    const dmg = effectsOf(OV, 'burst').filter((e) => e.kind === 'flatDamage');
    expect(dmg.length).toBe(1);
    expect(dmg[0].atkPct).toBeCloseTo(229.22, 5);
    // Kit says nothing about core strike damage.
    expect(dmg[0].core ?? false).toBe(false);

    const def = effectsOf(OV, 'burst').filter(
      (e) => e.kind === 'buff' && near(e.value, 12.34),
    );
    const defRecorded =
      def.length > 0 ||
      ((OV.unmodeled?.burst ?? []) as string[]).some((s) => /DEF/i.test(s));
    expect(defRecorded).toBe(true);
    for (const e of def) {
      expect(e.durationSec).toBe(10);
      // A DEF cut is subtractive on the enemy's DEF; damageTakenPct is a separate,
      // multiplicative Damage-Taken bucket. Substituting one for the other is a fudge.
      expect(e.stat).not.toBe('damageTakenPct');
    }
  });

  it('the 229.22% hit is live and non-vacuous — zeroing it strictly lowers signal damage', () => {
    expect(totals(R_B_NODMG.res)[SLUG]).toBeLessThan(T_BASE[SLUG]);
  });

  it('the burst hit takes NO Full Burst major — forcing noFb is a strict no-op', () => {
    // Burst-cast damage resolves before the Full Burst window opens. A model that let
    // the nuke ride the +50% major would drop when noFb is forced on.
    expect(totals(R_B_NOFB.res)).toEqual(T_BASE);
  });

  it('the burst hit is body-only — forcing core:true strictly raises signal damage', () => {
    // Proves the shipped model does not already core (which the kit text never grants)
    // and that the core path is reachable, so the previous assertion is not vacuous.
    expect(totals(R_B_CORE.res)[SLUG]).toBeGreaterThan(T_BASE[SLUG]);
  });

  it('the 12.34% debuff fires once per signal burst, on the boss, and moves no damage', () => {
    const procs = procCount(BASE.events, 12.34);
    expect(procs).toBeGreaterThan(1);
    expect(procs).toBeLessThan(25);
    for (const e of bossDebuffs(BASE.events, 12.34)) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
    // ATTRIBUTION: removing signal's burst buff removes every 12.34% application.
    expect(procCount(R_B_NODEBUFF.events, 12.34)).toBe(0);
    // Same GAP + fudge detector as skill1.
    expect(totals(R_B_NODEBUFF.res)).toEqual(T_BASE);
  });

  it.skip('GAP — the MAGNITUDE of enemy DEF -12.34% is unobservable for the same reason as skill1: no enemy-DEF consumer, and boss DEF at scope lock is itself unmeasured', () => {
    // This is signal's whole team value; it is currently recorded but damage-inert.
  });

  it.skip('GAP — the +30% range bonus exclusion on the burst rider is engine-forced and not readable without pinning the damage-event field names, which a blind author must not guess', () => {
    // Testable sighted via the damage event's rangeApplied flag.
  });
});

```

## 6. S6 BLIND OVERRIDE (claude-opus-5, authored from kit prose alone) — + driver diff

DIFF vs the driver override (structural):
- skill1: blind = ENCODED hitCount:60 -> enemy -> defPct -5.94/5s + atkPct -5.94/5s, and its OWN audit
  flags the encoding 'engine-inert (no boss-DEF debuff channel)' / 'permanently 0 damage at scope lock'.
  The engine drops ALL enemy buffs at dispatch except damageTakenPct/distributedDamagePct > 0
  (sim.ts applyEffect), and these carry negative values, so the blocks can emit NOTHING — no buffApply,
  no total movement. Driver = skill1 [] with all three sentences VERBATIM in unmodeled.skill1 + flag 1
  (estimate + recipe + tier), the mica/ether/exia/himeno/eunhwa precedent for enemy ATK-down/DEF-down
  gaps. Behaviorally IDENTICAL; the divergence is documentation policy (dead blocks vs documented zero).
- skill2: IDENTICAL — fullBurstEnter -> self -> heal ticks:10 intervalSec:1 (blind: 'literal text, NOT
  burstCast'). Both record that the 44.08 magnitude is unmodeled by design (no HP pool).
- burst: blind = burstCast -> enemy -> flatDamage atkPct 229.22 (plus explicit crit:true — behaviorally
  the engine's default for flatDamage riders — and a dead enemy defPct -12.34/10s buff, same no-channel
  fate as skill1). Driver = burstCast -> enemy -> flatDamage 229.22 alone, with the DEF line VERBATIM in
  unmodeled.burst + flag 2. Nuke encoding IDENTICAL; the DEF-down is the same policy divergence.

The blind override JSON:

```json
{
  "slug": "signal",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 60
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": -5.94,
          "durationSec": 5
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": -5.94,
          "durationSec": 5
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
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
          "atkPct": 229.22,
          "crit": true
        },
        {
          "kind": "buff",
          "stat": "defPct",
          "value": -12.34,
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
    "ENEMY-TARGETED STAT LINES ARE ENCODED BUT ENGINE-INERT: resolveTargets({kind:'enemy'}) returns no entity, and the schema has no boss-DEF-debuff channel (defPct is documented as self-DEF, inert in v1). Both DEF \u25bc lines (skill1 5.94%, burst 12.34%) are REAL team-wide damage gains in game \u2014 they are recorded as blocks per the 'keep the stat buff even if inert' prior, not converted to damageTakenPct, because DEF-subtraction \u2192 damage is not a 1:1 percentage map and any conversion factor would be fabricated. Modeling gap, measurement-gated (boss-DEF battery).",
    "The enemy ATK \u25bc 5.94% line is defensive-only at scope lock (no incoming damage, no HP pool) and carries no tandem consumer; encoded for kit completeness, permanently 0 damage.",
    "skill2 is a self-lifesteal window with no HP pool in v1 \u2014 its ONLY live function is emitting `recovery` events for heal-synergy teammates ('when recovery takes effect'). The \u2691 tick count therefore changes a teammate's proc count, not this unit's damage.",
    "\u2691 burst flatDamage takes no explicit noFb: a burstCast-triggered hit resolves before the Full Burst window opens, so the engine's own timing already excludes the +50% major. noFb is left unset (default OFF, measured-only)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Signal (SMG/Fire/Attacker/Burst II, ammo 120, hitsPerShot 1). Three-line kit, no stacks, no weapon swap, no mode gates, no DoT. skill1 = a per-60-round enemy debuff pair (hitCount:60 counts ROUNDS, not trigger pulls \u2014 hitsPerShot 1 so rounds == pulls here); both riders are enemy-scoped and engine-inert (see caveats). skill2 = fullBurstEnter self-lifesteal, modeled as a 10-tick heal-over-time so on-recovery consumers stay fed; trigger is 'entering Full Burst' (any team FB), NOT burstCast \u2014 the kit text is literal. burst = a burstCast instant hit at 229.22% of final ATK (crit-eligible at the caster's sheet rate per the rider convention; no core \u2014 the text does not say core strike; noRange is engine-automatic and not set) plus a 10 sec enemy DEF \u25bc 12.34%. No line was silently dropped; unmodeled is empty because every kit line is represented as a block."
}
```

## 7. DRIVER IMPLEMENTATION (what ships if you rule GO)

### 7a. scripts/tests/units/signal.test.ts

```typescript
// PER-UNIT KIT SPEC — `signal` (Signal — SMG / Attacker / Fire / Burst II, cd 20s, ammo 120,
// reloadFrames 81, hitsPerShot 1, normalMult 8.1, SSR rarity). Kit-autonomy gauntlet
// 2026-08-05 (test-first re-derivation).
//
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/signal.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates
// exactly as a verification gauntlet would (mica/himeno precedent).
//
// Kit (blablalink prose, data/characters.json → characters.signal.skills, lvl 10):
//   S1 ■ after landing 60 normal attacks → the target(s):
//        DEF ▼ 5.94% for 5 sec.                                           [UNMODELED — G1]
//        ATK ▼ 5.94% for 5 sec.                                           [UNMODELED — G1]
//   S2 ■ self, when entering Full Burst:
//        Recover 44.08% of attack damage as HP over 10 sec.               [FAITHFUL — G3]
//   BU ■ enemies within attack range (Burst II, cd 20s):
//        229.22% of final ATK as damage                                   [FAITHFUL — G2]
//        DEF ▼ 12.34% for 10 sec.                                         [UNMODELED — G4]
//
// Signal is a fire-element B2 ATTACKER whose kit splits into three families:
//
//   • G1 (the whole S1 sentence) has NO engine channel: both halves are enemy-targeted
//     ATK▼/DEF▼ debuffs, and sim.ts admits only damageTakenPct/distributedDamagePct into
//     enemyBuffs — 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0'
//     (sim.ts dispatch; mica/ether/exia/himeno/eunhwa precedent). The hitCount:60 trigger
//     IS engine-native, but encoding it with dead effects would be noise, so the line ships
//     verbatim-unmodeled + ⚑ and the omission is pinned by ABSENCE (zero signal buffApply
//     events) against the damageTakenPct laundering counterfactual which DOES emit boss
//     debuffs and lift team totals.
//   • G3 (S2) is the kit's event channel: 'Activates when entering Full Burst' →
//     fullBurstEnter (NOT burstCast — her own B2 cast lands mid-chain, BEFORE the Full
//     Burst window opens; the discrimination is the recovery start offset, pinned against
//     the burstCast-keyed counterfactual). 'Recover 44.08% of attack damage as HP over
//     10 sec' is a heal-over-time: heal ticks:10 intervalSec:1, event-only by engine design
//     (no HP amount modeled — the 44.08% magnitude rides in caveats, not fudged; helm/milk/
//     biscuit precedent). OBSERVABILITY: the heal targets SIGNAL HERSELF, and the engine
//     emits no recovery SimEvent — a recovery event is only observable through the
//     RECIPIENT's own 'recovery'-triggered blocks (fireRecovery dispatches only the
//     target's blocks). The spec therefore instruments her with an INERT PROBE via
//     withPatchedOverride — a recovery-triggered self defPct 1 buff (defPct is damage-inert
//     in v1, so the probe moves nothing: pinned) — exactly the shield-probe pattern
//     ether.test.ts uses to observe shield events through a requiresShielded gate. The
//     probe's buffApply stream IS the recovery-event log: a faithful 10s window produces
//     ~10 firings per Full Burst cycle, starting strictly AFTER signal's cast frame.
//   • G2 (burst damage) is a standard burstCast flatDamage nuke (mica/milk/belorta
//     precedent): her OWN cast, never fullBurstEnter — as the SOLE B2 she casts every Full
//     Burst so both keyings fire equal COUNTS; the discrimination is TIMING: the cast lands
//     BEFORE the Full Burst window opens, so the nuke never takes the +50% FB major
//     (discriminate by the fbMajor flag, not the count). 'Enemies within attack range'
//     collapses to the single partless boss.
//   • G4 (burst DEF▼) has the same NO-channel fate as G1 (mica M7 precedent): verbatim
//     unmodeled + ⚑, pinned against a damageTakenPct laundering.
//
// Fixture: liter/signal/ada/asuka, forced-neutral boss (null), camera focus ada (the RL
// carry). The shape is biscuit's sole-B2 comp: signal is the SOLE Burst II (20s CD covers
// stage II alone; liter B1 20s; ada + asuka B3 40s alternate stage III), so she casts every
// Full Burst and no competing B2 (crown) vacates her burst/FB assertions. asuka (B3 — no
// stage collision) is a NON-HEALING partner: with her burst's instant self-heal filtered
// out of EVERY run (helm H8 isolation precedent), NO fixture mate delivers recovery to
// anyone — signal's own S2 is the only recovery source, so her probe stream is uncontaminated
// (a healing mate like helm — burst heal AND per-pull S1 heal, both all-ally — would
// saturate the channel). Boss-debuff hygiene: liter and asuka have NO enemy-targeted blocks
// and ada's are DoTs (damage events, not buffs), so ANY boss-held buffApply in this fixture
// would be a laundering of a G1/G4 ▼ line. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const SLUGS = ['liter', 'signal', 'ada', 'asuka'] as const;
/** slot order: liter 0 / signal 1 / ada 2 / asuka 3. */
const SIGNAL = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: null,
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const sum = (t: Record<string, number>) =>
  SLUGS.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- fixture isolation ------------------------------------------------------------------
/** asuka's burst block carries an instant self-heal; left in, it would emit recovery events
 *  and contaminate signal's probe stream. Filtered in EVERY run (helm H8 precedent). */
const asukaNoBurstHeal = withPatchedOverride('asuka', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    removed += before - b.effects.length;
  }
  if (removed === 0) {
    throw new Error('asuka burst heal effect missing — fixture is stale');
  }
});

/** G3 PROBE — the engine emits no recovery SimEvent, and signal's S2 heals HERSELF, so the
 *  recovery window is observable ONLY through her own 'recovery'-triggered blocks. Instrument
 *  her with an inert one: recovery → self defPct 1 / 2s (defPct is damage-inert in v1 — the
 *  probe's zero-footprint is itself pinned in G3). The probe block is instrumentation
 *  (withPatchedOverride's isolation role), never part of the encoding under test — the
 *  shipped override supplies the heal alone (ether's shield-probe pattern). */
const PROBE = {
  slot: 'skill1',
  trigger: { kind: 'recovery' },
  target: { kind: 'self' },
  effects: [{ kind: 'buff', stat: 'defPct', value: 1, durationSec: 2 }],
};
const withProbe = (ov: any) => {
  ov.skill1.push(JSON.parse(JSON.stringify(PROBE)));
  return ov;
};

// ---- counterfactual patches ---------------------------------------------------------------
/** G1 the laundering mis-model: the S1 DEF▼/ATK▼ pair (both 5.94%) rewritten as a boss
 *  damageTakenPct debuff on the every-60-hits counter (a different mechanic the kit never
 *  grants — the boss taking MORE damage). */
const g1Laundered = withPatchedOverride('signal', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 60 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 5.94, durationSec: 5 },
    ],
  });
});
/** G2 wrong magnitude: the lvl-1 value 114.61 instead of the lvl-10 229.22. */
const g2Weak = withPatchedOverride('signal', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('signal burst flatDamage block missing — fixture is stale');
  }
  e.atkPct = 114.61;
});
/** G2 wrong trigger: fullBurstEnter (lands at the FB window start, INSIDE the +50% major)
 *  instead of burstCast (lands on signal's OWN cast frame, before the window opens). */
const g2OnFbEnter = withPatchedOverride('signal', (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!block) {
    throw new Error('signal burst flatDamage block missing — fixture is stale');
  }
  block.trigger = { kind: 'fullBurstEnter' };
});
/** G2 reference: the burst nuke removed (functional baseline). */
const g2NoBurst = withPatchedOverride('signal', (ov) => {
  const before = ov.burst.length;
  ov.burst = [];
  if (before === 0) {
    throw new Error('signal burst blocks missing — fixture is stale');
  }
});
/** G3 wrong trigger: burstCast keying — the recovery window opens on her OWN cast frame
 *  (mid-chain, before the FB window), not when Full Burst begins. Probe included so the
 *  window is observable under the counterfactual too. */
const g3OnBurstCast = withPatchedOverride('signal', (ov) => {
  const block = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'heal')
  );
  if (!block) {
    throw new Error('signal S2 heal block missing — fixture is stale');
  }
  block.trigger = { kind: 'burstCast' };
  withProbe(ov);
});
/** G3 probe-only instrumented shipped model (the recovery-event log for the window shape). */
const g3Probed = withPatchedOverride('signal', withProbe);
/** G3 reference: the S2 heal removed, probe still armed (proves ONLY S2 feeds the probe). */
const g3NoS2 = withPatchedOverride('signal', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('signal skill2 blocks missing — fixture is stale');
  }
  withProbe(ov);
});
/** G4 the laundering mis-model: the burst DEF▼ rewritten as a boss damageTakenPct debuff. */
const g4Laundered = withPatchedOverride('signal', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 12.34, durationSec: 10 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim; asuka isolation in every run) ----------------
const runIsolated = (signalOverride?: any) =>
  run({
    asuka: asukaNoBurstHeal,
    ...(signalOverride ? { signal: signalOverride } : {}),
  });
const base = runIsolated();
const g1 = runIsolated(g1Laundered);
const weak = runIsolated(g2Weak);
const onFbEnter = runIsolated(g2OnFbEnter);
const noBurst = runIsolated(g2NoBurst);
const probed = runIsolated(g3Probed);
const onBurstCast = runIsolated(g3OnBurstCast);
const noS2Probed = runIsolated(g3NoS2);
const g4 = runIsolated(g4Laundered);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const signalBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'signal');
const signalNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'signal' && e.bucket === 'burst'
  );
/** The G3 probe's firing frames — one buffApply per recovery event delivered to signal
 *  (applyBuff emits on refresh too), i.e. the recovery-event log itself. */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  buffs(evs)
    .filter(
      (b) => b.casterIdx === SIGNAL && b.stat === 'defPct' && b.value === 1
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);

describe('signal — kit spec', () => {
  describe('fixture sanity — the B2 chain actually runs', () => {
    it('signal is the sole B2 and casts every Full Burst (>= 6 casts / 180s)', () => {
      expect(signalBursts(base.events).length).toBeGreaterThanOrEqual(6);
    });
    it('her SMG weapon deals damage on the plain scope-lock basis (SSR)', () => {
      expect(base.totals.signal).toBeGreaterThan(0);
    });
    it('the isolation holds: signal S2 is the ONLY recovery source in the fixture', () => {
      // Probe armed but S2 removed → zero firings: no fixture mate delivers recovery.
      expect(recoveryFrames(noS2Probed.events)).toEqual([]);
    });
  });

  describe('G1 — S1 (every 60 hits → enemy DEF▼5.94%/ATK▼5.94%, 5s) is genuinely unmodeled', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride('signal') as any;
      const joined = ov.unmodeled.skill1.join('\n');
      expect(joined).toContain('Activates after landing 60 normal attack(s)');
      expect(joined).toContain('DEF ▼ 5.94% for 5 sec.');
      expect(joined).toContain('ATK ▼ 5.94% for 5 sec.');
    });

    it('enacts NOTHING: signal emits no buff applications at all (S2 is a heal event, burst is flat damage)', () => {
      expect(
        buffs(base.events).filter((b) => b.casterIdx === SIGNAL),
        'no signal-cast buff may exist'
      ).toEqual([]);
    });

    it('DISCRIMINATING: a damageTakenPct laundering on the 60-hit counter emits boss debuffs and lifts team totals', () => {
      const bossDebuffs = buffs(g1.events).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(bossDebuffs.length).toBeGreaterThan(0);
      expect([...new Set(bossDebuffs.map((b) => b.value))]).toEqual([5.94]);
      expect(sum(g1.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('G2 — burst nuke: 229.22% of final ATK to enemies in attack range, on her OWN cast', () => {
    const casts = signalBursts(base.events);
    const nukes = signalNukes(base.events);

    it('fires once per signal burst cast, at the kit magnitude, in the burst bucket, crit-eligible', () => {
      expect(casts.length).toBeGreaterThanOrEqual(6);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([229.22]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
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

    it('DISCRIMINATING: the lvl-1 magnitude 114.61 changes every nuke', () => {
      expect([...new Set(signalNukes(weak.events).map((d) => d.atkPct))]).toEqual(
        [114.61]
      );
    });

    it('DISCRIMINATING: fullBurstEnter keying lands INSIDE the FB window (+50% major) off the cast frames', () => {
      const fbNukes = signalNukes(onFbEnter.events);
      expect(fbNukes.length).toBeGreaterThan(0);
      // As the sole B2 the counts coincide — the discrimination is TIMING, not count:
      // every fullBurstEnter nuke sits inside the window and takes the +50% major.
      expect(
        fbNukes.every((d) => d.fbMajorApplied),
        'fullBurstEnter nukes must take the FB major'
      ).toBe(true);
      const castFrames = new Set(
        signalBursts(onFbEnter.events).map((c) => c.frame)
      );
      expect(
        fbNukes.filter((d) => castFrames.has(d.frame)),
        'fullBurstEnter applications must land off her cast frames'
      ).toEqual([]);
      expect(sum(onFbEnter.totals)).not.toEqual(sum(base.totals));
    });

    it('FUNCTIONAL: removing the burst erases every nuke and lowers her total', () => {
      expect(signalNukes(noBurst.events)).toHaveLength(0);
      expect(base.totals.signal).toBeGreaterThan(noBurst.totals.signal);
    });
  });

  describe('G3 — S2: entering Full Burst → self recovery, 44.08% of attack damage over 10 sec', () => {
    // The engine heal carries no HP amount by design — the encodable substance is the
    // 10-SECOND RECOVERY-EVENT WINDOW (ticks:10 intervalSec:1). The heal targets signal
    // HERSELF and no recovery SimEvent exists, so the window is observed through her own
    // inert recovery PROBE (defPct 1 buffApply per delivered recovery). Only casts whose
    // full window fits inside the 180s fight are measurable.
    const casts = signalBursts(probed.events).filter(
      (c) => c.frame + 13 * FPS <= FIGHT_FRAMES
    );
    const frames = recoveryFrames(probed.events);

    it('has bursts with a complete window to measure', () => {
      expect(
        casts.length,
        'no signal burst has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
    });

    it('keeps recovery firing across the whole 10 sec after each Full Burst entry', () => {
      for (const cast of casts) {
        const inWindow = frames.filter(
          (f) => f > cast.frame && f <= cast.frame + 13 * FPS
        );
        const spanSec = inWindow.length
          ? (inWindow[inWindow.length - 1] - inWindow[0]) / FPS
          : 0;
        expect(
          inWindow.length,
          `FB after cast at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery ` +
            `firing(s) spanning ${spanSec.toFixed(1)}s — a single instant heal produces exactly 1`
        ).toBeGreaterThanOrEqual(8);
        expect(
          spanSec,
          'the window must span ~9-10s of ticks, not collapse to one frame'
        ).toBeGreaterThanOrEqual(8);
      }
    });

    it('opens strictly AFTER her own cast frame — the FB window, not her cast, keys the heal', () => {
      expect(casts.length).toBeGreaterThan(0);
      for (const cast of casts) {
        const first = frames.find((f) => f >= cast.frame);
        expect(
          first,
          `no recovery firing after cast at ${cast.sec.toFixed(2)}s`
        ).toBeDefined();
        expect(
          first,
          `recovery fired ON cast frame ${cast.frame} — burstCast keying, not fullBurstEnter`
        ).toBeGreaterThan(cast.frame);
      }
    });

    it('the probe is inert: instrumenting the channel moves no unit total by a point', () => {
      expect(probed.totals).toEqual(base.totals);
    });

    it('DISCRIMINATING: burstCast keying opens the window ON her cast frames', () => {
      const cfFrames = recoveryFrames(onBurstCast.events);
      const castFrames = new Set(
        signalBursts(onBurstCast.events).map((c) => c.frame)
      );
      // Every cast fires its heal instantly on its OWN frame under the counterfactual —
      // one recovery firing per cast frame (the shipped model has ZERO on-cast firings:
      // every shipped firing is strictly after its cast).
      expect(castFrames.size).toBeGreaterThan(0);
      expect(
        cfFrames.filter((f) => castFrames.has(f)),
        'burstCast-keyed recovery must fire exactly on every cast frame'
      ).toHaveLength(castFrames.size);
      expect(
        frames.filter((f) => casts.some((c) => c.frame === f)),
        'shipped recovery must never fire on a cast frame'
      ).toEqual([]);
    });

    it('FUNCTIONAL: removing S2 starves the armed probe (only S2 feeds it)', () => {
      expect(recoveryFrames(noS2Probed.events)).toEqual([]);
      expect(recoveryFrames(probed.events).length).toBeGreaterThan(0);
    });

    it('is damage-inert by construction: totals are byte-identical with the line removed', () => {
      expect(noS2Probed.totals).toEqual(probed.totals);
    });
  });

  describe('G4 — burst DEF ▼12.34% for 10s is genuinely unmodeled (no enemy-DEF channel)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride('signal') as any;
      expect(ov.unmodeled.burst.join('\n')).toContain(
        'DEF ▼ 12.34% for 10 sec.'
      );
    });

    it('enacts NOTHING: no boss debuff anywhere (DEF▼ is dropped, not laundered)', () => {
      // Boss debuffs emit with targetIdx null. Fixture mates cannot produce one: liter and
      // asuka have no enemy-targeted blocks and ada's are DoTs (damage events, not buffs) —
      // so ANY boss-held buffApply would be a laundering of a signal ▼ line.
      expect(
        buffs(base.events).filter((b) => b.targetIdx === null),
        'no boss-targeted debuff may exist'
      ).toEqual([]);
    });

    it('DISCRIMINATING: a damageTakenPct laundering emits boss debuffs and lifts team totals', () => {
      const bossDebuffs = buffs(g4.events).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(bossDebuffs.length).toBeGreaterThan(0);
      expect([...new Set(bossDebuffs.map((b) => b.value))]).toEqual([12.34]);
      expect(sum(g4.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('trigger + effect encoding — literal kit/datamine semantics', () => {
    it('S1 is EMPTY (the hitCount:60 trigger is engine-native but both ▼ effects have no channel)', () => {
      const ov = loadOverride('signal') as any;
      expect(ov.skill1).toEqual([]);
    });

    it('S2 is ONE fullBurstEnter self-heal block: ticks 10, intervalSec 1', () => {
      const ov = loadOverride('signal') as any;
      expect(ov.skill2.length).toBe(1);
      const block = ov.skill2[0];
      expect(block.trigger).toEqual({ kind: 'fullBurstEnter' });
      expect(block.target).toEqual({ kind: 'self' });
      expect(block.effects).toEqual([
        { kind: 'heal', ticks: 10, intervalSec: 1 },
      ]);
    });

    it('the burst is ONE flatDamage block keyed to her own cast', () => {
      const ov = loadOverride('signal') as any;
      expect(ov.burst.length).toBe(1);
      const block = ov.burst[0];
      expect(block.trigger).toEqual({ kind: 'burstCast' });
      expect(block.target).toEqual({ kind: 'enemy' });
      expect(block.effects).toEqual([
        { kind: 'flatDamage', atkPct: 229.22 },
      ]);
    });
  });
});

```

### 7b. src/skills/overrides/signal.json

```json
{
  "slug": "signal",
  "note": "signal (Signal — SMG / Attacker / Fire / Burst II, cd 20s, ammo 120, reloadFrames 81, hitsPerShot 1, normalMult 8.1, coreMult 200, burstGaugePerShot 0.1, Elysion, SSR, released 2022-11-04). BASE unit — no variant shares the name, slug-disambiguation lint clean. Kit-autonomy gauntlet 2026-08-05: FROM-SCRATCH build (no prior override / kit-status row; simSupported was false) — test-first re-derivation pinned by scripts/tests/units/signal.test.ts (groups G1-G4 + encoding pins; fixture liter/signal/ada/asuka, forced-neutral boss, focus ada: signal is the SOLE B2 [biscuit sole-B2 pattern — a competing B2 like crown would vacate her burst/FB assertions]; asuka [B3, no stage collision] is a NON-HEALING partner — her burst's instant self-heal is filtered out in every run [helm H8 isolation precedent] so no fixture mate delivers recovery to anyone and signal's own S2 is the fixture's only recovery source). The S2 self-heal is observed through signal's own inert recovery PROBE (a withPatchedOverride recovery-triggered defPct 1 block — the engine emits no recovery SimEvent and fireRecovery dispatches only the RECIPIENT's blocks, so a self-directed heal is observable only through the recipient's own recovery trigger; ether's shield-probe pattern), pinned inert on totals. Cross-family S2b (claude-fable-5) independently re-derived the kit and converged on every encodable line: the hitCount:60 trigger identity (cumulative normal-attack hits, first fire EARNED — never t=0), fullBurstEnter (NOT burstCast) on S2, burstCast + FB-exempt-by-cast-timing on the nuke, and the trap to avoid on S2 ('44.08% of attack damage as HP' is lifesteal-HoT, NEVER an attackDamagePct 44.08 buff). Its two conditional-FAITHFUL enemy-defPct dispositions carried their own escape clause — 'if the engine has no enemy-DEF consumer, the faithful dispositions become GAP and the driver must declare that openly' — and the condition verified FALSE in sim.ts applyEffect: enemyBuffs admits ONLY damageTakenPct/distributedDamagePct > 0; 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0', and cfg.bossDef is a flat per-hit subtraction no debuff scales. SKILL1 'Attack Signal' ('■ Activates after landing 60 normal attack(s). Affects the target(s). DEF ▼ 5.94% for 5 sec. ATK ▼ 5.94% for 5 sec.'): UNMODELED IN FULL (all three sentences verbatim in unmodeled.skill1). The hitCount:60 trigger IS engine-native, but BOTH effect halves have no sim channel (enemy ATK▼/DEF▼ dropped at dispatch — mica/ether/exia/himeno/eunhwa precedent), so encoding the live trigger with dead effects would be noise, not faithfulness; the omission is pinned by ABSENCE (zero signal-cast buffApply events) against the damageTakenPct-laundering counterfactual, which emits boss debuffs and lifts team totals. SKILL2 'Waiting for Signal' ('■ Affects self. Activates when entering Full Burst. Recover 44.08% of attack damage as HP over 10 sec.'): MODELED as the event channel — fullBurstEnter → self → heal ticks:10 intervalSec:1. TRIGGER IDENTITY: 'when entering Full Burst' = fullBurstEnter — ANY team Full Burst (the wider trigger; S2b concur), never burstCast: as the B2 her own cast lands mid-chain BEFORE the Full Burst window opens, and the unit test discriminates by the recovery start offset (every shipped firing strictly after her cast frame; the burstCast counterfactual fires exactly ON it). The lifesteal-style HoT carries no HP amount by engine design (no HP pool) — the 44.08% magnitude rides VERBATIM in unmodeled.skill2 ('magnitude only', milk K6 precedent); the modeled substance is the 10-SECOND RECOVERY-EVENT WINDOW (first tick at the FB-entry frame, nine more at 1s intervals), which fires the RECIPIENT's 'when recovery takes effect' blocks — signal herself here (self-targeted), observed via the unit test's inert probe; modeled for the event channel, NOT dropped as 'defensive' (helm H8 / milk K6 / biscuit precedent). INERT for her own damage; in a comp where a teammate's kit delivered recovery TO signal (none does — she is the source, not a sink) or where her own recovery blocks existed, the channel would be live. BURST 'Emergency Signal' ('■ Affects enemies within attack range. Deals 229.22% of final ATK as damage. DEF ▼ 12.34% for 10 sec.'): line 1 MODELED — burstCast → enemy → flatDamage 229.22 (burst bucket, crit-eligible by rider convention, no core, no range; 'enemies within attack range' collapses to the single scope-lock boss). FB-EXEMPT by cast timing: the burst cast lands before the Full Burst window opens, so the nuke never takes the +50% major (mica M6 / milk K5 / helm H7 precedent; pinned via fbMajorApplied + cast-frame identity; the fullBurstEnter counterfactual takes the major and moves totals). Line 2 UNMODELED (verbatim in unmodeled.burst) — ENGINE GAP, same no-channel fate as the S1 DEF▼ (mica M7 / ether ⚑2 / himeno / eunhwa precedent); the nearest-wrong damageTakenPct laundering is pinned RED. Burst gauge: no gauge line in the kit — burstGaugePerShot 0.1 is the datamine and the class-modal fallback applies. Cadence: SMG ammo 120 / reloadFrames 81 / RoF 1440 shipped datamine as-is (the cadence-tuple ⚑ was RETIRED by owner ruling 2026-07-25); no charFixes. SSR → plain scope-lock ceiling (copies 10 ⇒ 3★ + core 7). NO `ignored` blocks. EVIDENCE TIER: every modeled magnitude is SL10 kit-text-literal (DATAMINED): 229.22 (burst nuke); S2 is event-only (44.08 magnitude unmodeled by design). TIER 2: fullBurstEnter-vs-burstCast identity on the S2 heal (recovery start-offset discriminated), the FB-exempt nuke's burstCast timing (a B2 casting mid-chain), the 10s heal-event tandem channel, and two engine-gap ⚑ clusters on the unmodeled ▼ lines. ⚑ LIST: [⚑1] (ENGINE GAP, minor — the S1 cluster) hitCount:60 → enemy 'DEF ▼ 5.94% / ATK ▼ 5.94% for 5s': estimate = ~8.3 flat boss DEF (5.94% of the 140-DEF scope-lock boss) off every hit during the 5s window at near-permanent uptime (SMG ~24 hits/s ⇒ 60 hits ≈ 2.5s, so the counter refreshes well inside the 5s expiry while firing) — a small team-wide lift, honestly absent; the ATK▼ half is damage-ZERO in v1 (the boss never attacks — a survivability lever only in real fights). recipe = a boss-DEF-reduction debuff primitive feeding the subtractive DEF term (+ an incoming-boss-damage model before the ATK▼ half could mean anything), engine-core; NEVER launder into damageTakenPct (pinned RED). tier = engine gap, minor (mica ⚑2 / ether ⚑2 precedent). [⚑2] (ENGINE GAP, minor) the burst 'DEF ▼ 12.34% for 10s': estimate = ~17.3 flat boss DEF off every hit during the 10s window per 20s cycle (~50% uptime) — a small team-wide lift; comps read COLD by exactly that amount. recipe = the same debuff-scalable boss-DEF channel, enact together with mica's DEF▼13.32% and novel's DEF▼7.05% lines (same mechanic family); tier = engine gap, minor. Kit-autonomy gauntlet 2026-08-05.",
  "unmodeled": {
    "skill1": [
      "■ Activates after landing 60 normal attack(s). Affects the target(s).",
      "DEF ▼ 5.94% for 5 sec.",
      "ATK ▼ 5.94% for 5 sec."
    ],
    "skill2": [
      "Recover 44.08% of attack damage as HP over 10 sec. — magnitude only: the engine `heal` carries no HP amount by design (no HP pool); the 10-second recovery-event WINDOW is modeled (fullBurstEnter heal ticks:10 intervalSec:1)."
    ],
    "burst": [
      "DEF ▼ 12.34% for 10 sec."
    ]
  },
  "caveats": [
    "skill1: the whole 60-hit ▼ cluster (enemy DEF ▼5.94% / ATK ▼5.94% for 5s) is unmodeled — enemy ATK▼/DEF▼ has no sim channel (enemyBuffs admits only damageTakenPct/distributedDamagePct; bossDef is a flat constant; sim.ts drops them at dispatch), mica/ether/exia precedent. Honestly absent (⚑1), not a stale fixture — the unit test pins the zero against a damageTakenPct laundering on the hitCount:60 counter.",
    "skill2: the modeled heal is event-only — the 44.08%-of-attack-damage HP magnitude is NOT modeled (no HP pool by design); the 10-second recovery-event WINDOW IS modeled (ticks:10 intervalSec:1). The heal is SELF-targeted: recovery events are delivered to signal herself and fire only HER OWN 'recovery'-triggered blocks (fireRecovery dispatches the recipient's blocks; she has none — the unit test observes the window with an inert probe). Damage-inert by construction: totals are byte-identical with the line removed.",
    "burst: the DEF ▼12.34% / 10s enemy debuff is unmodeled — same no-channel fate as skill1's DEF▼ (⚑2); the unit test pins the zero against a damageTakenPct laundering. The modeled 229.22% nuke is FB-exempt by cast timing (a B2 cast lands before the Full Burst window opens)."
  ],
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
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
          "atkPct": 229.22
        }
      ]
    }
  ]
}

```

## 8. THE LITIGATED CLUSTERS — rule on each explicitly

LINE/CLUSTER 1 — the three enemy ▼ lines (S1 DEF-down 5.94/5s, S1 ATK-down 5.94/5s, burst DEF-down
12.34/10s). Driver: verbatim UNMODELED + two flags (estimate/recipe/tier each), skill1 = [], no boss
debuffs anywhere (pinned against a damageTakenPct laundering that WOULD move totals). S5 blind: expects
dead blocks + boss-debuff events (5 REDs above). S6 blind: ENCODES dead blocks (defPct/atkPct negative
values on the enemy) whose own audit declares engine-inert. ENGINE FACT (verify against the SSOT +
sim.ts): enemyBuffs admits only damageTakenPct/distributedDamagePct > 0; every other enemy buff is
dropped at dispatch ('other enemy debuffs (ATK-down, DEF-down) don't affect our damage with DEF=0');
cfg.bossDef is a flat per-hit subtraction no debuff scales. Is the driver's documented-zero treatment
faithful (your ruling binds), or must the dead encoding ship?

CLUSTER 2 — S2 trigger + channel. All three derivations CONVERGE: fullBurstEnter -> self -> heal
ticks:10 intervalSec:1, magnitude 44.08 unmodeled by design (no HP pool). Driver observes the window
through an inert recovery probe on signal herself (the engine emits no recovery SimEvent and
fireRecovery dispatches only the RECIPIENT's blocks — a self-heal is observable only through the
recipient's own recovery trigger; the probe is damage-inert, pinned). Rule on whether the probe
methodology + the window assertions (>=8 firings, >=8s span, start strictly after the cast frame,
burstCast-keyed counterfactual fires exactly ON the cast frames) faithfully pin the line.

CLUSTER 3 — burst nuke identity. All three CONVERGE: burstCast -> enemy -> flatDamage 229.22, burst
bucket, FB-exempt by cast timing (a B2 cast lands before the Full Burst window opens). Driver fixture
is sole-B2 (signal casts every cycle); blind fixture's competing-B2 artifact vacated its own burst
assertions (Cluster B above). Confirm or correct.

## 9. RETURN — your binding verdict
