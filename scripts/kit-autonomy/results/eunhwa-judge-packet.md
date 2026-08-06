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

# GROUND TRUTH — eunhwa (Eunhwa, the BASE unit — NOT eunhwa-tactical-upgrade) kit prose + base stats (data/characters.json, verbatim)

{
  "slug": "eunhwa",
  "name": "Eunhwa",
  "weapon": "SR",
  "class": "Attacker",
  "element": "Fire",
  "burst": "II",
  "burstCooldownSec": 20,
  "ammo": 6,
  "reloadFrames": 161,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "normalAttackMultiplier": 71.07,
  "coreAttackMultiplier": 200,
  "hitsPerShot": 1,
  "burstGaugePerShot": 2.9,
  "skills": {
    "skill1": "■ Affects self. Activates after firing the last round. \nCharge Damage ▲ 37.28% for 2 shots. \nCharge Speed ▲ 15.53% for 2 rounds.",
    "skill2": "■ Activates after firing the last bullet. Affects the target.\nDEF ▼ 29% for 5 sec.",
    "burst": "■ Affects 10 enemy unit(s) with the highest final ATK. \nDeals 85.62% of final ATK as damage.\nDEF ▼ 2.43% for 15 sec.\n■ Affects all allies. \nCritical Rate ▲ 4.65% for 15 sec."
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 76,
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
    "resourceId": 92
  },
  "burstMeta": {
    "burst_duration": 1000,
    "use_burst_skill": "Step2",
    "burst_apply_delay": 1,
    "change_burst_step": "Step3"
  }
}

# S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind) — scripts/kit-autonomy/reviews/eunhwa.test-review.json

{
  "slug": "eunhwa",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Charge Damage ▲ 37.28% for 2 shots",
      "disposition": "FAITHFUL",
      "scope": "Charge-bucket only (chargeDamagePct, additive percentage points in the charge bucket) — NOT generic attackDamagePct and NOT chargeDamageMultPct (the kit says plain 'Charge Damage ▲', not 'Charge Damage Multiplier').",
      "durationSemantics": "ROUND count — 'for 2 shots' = durationShots: 2, expiring right after the holder's 2nd subsequent shot. NEVER durationSec. Critically: the trigger is last-round (reload start) and reloadFrames=161 ≈ 2.68 s, so a durationSec:2 encoding expires MID-RELOAD before a single shot benefits — the line becomes 100% inert.",
      "triggerIdentity": "lastBullet ('Activates after firing the last round') — per-magazine, ammo 6, so once per ~8.7 s cycle (6×60f charge + 161f reload). No FB gate, no status gate.",
      "targetSet": "self only ('Affects self').",
      "nearestWrongModel": "durationSec: 2 instead of durationShots: 2 — the buff silently dies during the 2.68 s reload and never touches a shot (fully inert); secondary misread: encoding as chargeDamageMultPct or generic attackDamagePct.",
      "distinguishingAssertion": "Filter buffApply events for stat==='chargeDamagePct', value===37.28, casterIdx===targetIdx===eunhwa's slot: each must carry durationShots===2, and each must be applied at a reload-start (lastBullet) frame. Then assert the first TWO post-reload shots' damage events carry the boosted charge bucket while the 3rd+ do not; additionally, withPatchedOverride stripping this effect must REDUCE eunhwa's total (under the nearest-wrong durationSec:2 the strip is a no-op — RED).",
      "inertness": "Must not buff any ally, must not touch the 3rd–6th shots of a magazine, must not persist permanently.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Charge Speed ▲ 15.53% for 2 rounds",
      "disposition": "FAITHFUL",
      "scope": "chargeSpeedPct — a WEAPON-STATE modifier (taxonomy #6): it shortens the 60-frame full-charge time on the next 2 shots, so it changes shots fired over the fight. It is damage; 'skip, defensive/QoL' is wrong.",
      "durationSemantics": "ROUND count — 'for 2 rounds' = durationShots: 2. Same reload-crossing logic as the Charge Damage line: durationSec:2 < the 2.68 s reload → inert.",
      "triggerIdentity": "lastBullet (same '■ after firing the last round' header as line 1 — one block, two effects).",
      "targetSet": "self only.",
      "nearestWrongModel": "durationSec: 2 (expires mid-reload, inert); or dropping the line entirely as a non-damage utility stat.",
      "distinguishingAssertion": "buffApply stat==='chargeSpeedPct', value===15.53, durationShots===2, self-targeted, at each reload-start. Behaviorally: the inter-shot interval of the first 2 shots of magazines after the first reload must be SHORTER than the baseline 60-frame charge cadence (read shot-event frame deltas); total shot count over 180 s must strictly EXCEED a run with the effect stripped via withPatchedOverride. Under the nearest-wrong (durationSec:2) shot timing is identical to the stripped run — RED.",
      "inertness": "Shots 3–6 of each magazine keep the unmodified 60-frame charge; no ally cadence changes.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "DEF ▼ 29% for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Boss DEF reduction — an ENEMY debuff that raises the whole TEAM's damage through the boss-DEF term of the formula (taxonomy #4: an enemy-directed ▼ is a team benefit, not a self stat). Not self defPct (which is inert), not damageTakenPct (a different named stat).",
      "durationSemantics": "Wall-clock durationSec: 5 — genuine seconds here ('for 5 sec'). The load-bearing subtlety is UPTIME: the magazine cycle is ~8.7 s, so the debuff is live ~57% of the time, never permanent.",
      "triggerIdentity": "lastBullet ('Activates after firing the last bullet') — once per magazine, on eunhwa's own reload start.",
      "targetSet": "enemy ('Affects the target') — boss-held; per the harness note the buffApply arrives with casterIdx===null AND targetIdx===null, filter by stat+value.",
      "nearestWrongModel": "Modeling it as passive/permanent boss DEF ▼ (over-credits the ~43% downtime, roughly doubling effective uptime); or mis-scoping 'the target' to self (inert self defPct); or skipping it as 'DEF is defensive'.",
      "distinguishingAssertion": "Boss-held buffApply (casterIdx===null, targetIdx===null) with the DEF-down stat at value −29 (or 29 per engine sign convention) must appear ONLY at eunhwa's last-bullet frames with expiresFrame === applyFrame + 300; assert there EXIST frames between magazines where no instance is live (gap between expiresFrame and the next apply). A passive/permanent encoding shows one t=0 apply or zero-gap coverage — RED. Also assert TEAM total damage (not just eunhwa's) drops when the effect is stripped.",
      "inertness": "No effect on any ally's buff list; no application on frames where eunhwa did not empty her magazine.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 85.62% of final ATK as damage",
      "disposition": "FAITHFUL",
      "scope": "One flatDamage hit, atkPct 85.62, burst bucket. The '10 enemy unit(s) with the highest final ATK' target collapses to exactly ONE hit on the single partless scope-lock boss — never ×10.",
      "durationSemantics": "Instant, no duration.",
      "triggerIdentity": "burstCast (her OWN Burst-II cast, cd 20 s) — NOT fullBurstEnter. Burst-cast damage lands BEFORE the Full Burst window opens, so it is FB-exempt (no +50%, no entry auras) and takes no range bonus per the rider defaults.",
      "targetSet": "enemy (boss).",
      "nearestWrongModel": "Multiplying the hit ×10 for '10 enemy units'; or letting the hit take the +50% Full Burst major (fbMajorApplied true); or keying to fullBurstEnter so it fires on rotations where crown (the fixture's other Burst II) chains instead of eunhwa.",
      "distinguishingAssertion": "Per eunhwa burstCast event, EXACTLY ONE damage event with srcSlot===burst-slot, mult===85.62, inFullBurst===false / fbMajorApplied===false, rangeApplied===false. Count of these damage events over the fight === count of eunhwa's burstCast events (never the team's fullBurstStart count, which diverges because crown shares her tier in controlComp).",
      "inertness": "Zero of these hits on Full Bursts chained by crown's Burst-II cast; no +50% or range bonus on any of them.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "DEF ▼ 2.43% for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "Second boss DEF debuff, same enemy-DEF channel as skill2 but a DISTINCT buff key (different slot/value) — the two must coexist and stack, not overwrite each other.",
      "durationSemantics": "durationSec: 15 (genuine seconds). With her ~20 s burst cooldown this is ~75% uptime when she casts every rotation — not permanent.",
      "triggerIdentity": "burstCast (rides the same '■ Affects 10 enemy unit(s)' burst block as the damage line) — not fullBurstEnter, for the same crown-divergence reason.",
      "targetSet": "enemy (boss-held: casterIdx===null / targetIdx===null on the event).",
      "nearestWrongModel": "Keying to fullBurstEnter (over-credits on crown-chained FBs); or letting it share/overwrite the skill2 DEF-down key so only one of the two DEF debuffs is ever live; or reading it as damageTakenPct.",
      "distinguishingAssertion": "Boss-held buffApply at value 2.43 appears ONLY on frames carrying an eunhwa burstCast event, with expiresFrame === applyFrame + 900; assert a frame window where BOTH the 29% (skill2) and 2.43% instances are simultaneously live (distinct keys). Under fullBurstEnter keying, an apply appears on a crown-chained FB with no eunhwa burstCast that frame — RED.",
      "inertness": "No applies on Full Bursts eunhwa did not burst into; must not displace the skill2 29% instance.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Critical Rate ▲ 4.65% for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "GENERIC critRatePct — the kit says plain 'Critical Rate', with no 'of normal attacks' scoping, so critRateNormalPct would UNDER-credit skill/burst crit here (the inverse of the helm trap).",
      "durationSemantics": "durationSec: 15.",
      "triggerIdentity": "burstCast — this is a second '■' block inside her OWN burst, so it fires only on rotations SHE bursts. This is the packet's sharpest burstCast-vs-fullBurstEnter divergence: controlComp fields crown, a same-tier Burst II, so team Full Bursts can chain through crown on rotations where eunhwa's 20 s cooldown or selection passes her over — fullBurstEnter keying over-credits exactly there.",
      "targetSet": "allies, ALL including self ('Affects all allies' — no except-self clause, so no excludeSelf flag).",
      "nearestWrongModel": "trigger fullBurstEnter (buff granted on every team FB including crown-chained ones); secondary misreads: excludeSelf true, or scoping to critRateNormalPct.",
      "distinguishingAssertion": "Every buffApply with stat==='critRatePct', value===4.65, casterIdx===eunhwa's index must land on a frame with an eunhwa burstCast event, must cover ALL FIVE unit indices as targets (including targetIdx===casterIdx, the self-inclusion check), with expiresFrame === applyFrame + 900. Assert the count of these apply-batches === eunhwa's burstCast count, NOT the fullBurstStart count. Under fullBurstEnter, a crown-chained FB with no eunhwa cast produces a batch — RED; under excludeSelf, the self-target apply is missing — RED.",
      "inertness": "No crit-rate applies on crown-chained Full Bursts; skill/burst-bucket crit must move under the buff (it is NOT normal-attack-scoped).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Charge Damage ▲ 37.28% for 2 shots",
    "skill1:Charge Speed ▲ 15.53% for 2 rounds",
    "skill2:DEF ▼ 29% for 5 sec",
    "burst:Deals 85.62% of final ATK as damage",
    "burst:DEF ▼ 2.43% for 15 sec",
    "burst:Critical Rate ▲ 4.65% for 15 sec"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Three places I expect a shared-prior misread. (1) BOTH skill1 durations are ROUND counts ('2 shots' / '2 rounds' → durationShots:2), and the trap is unusually sharp here: the trigger is reload-start and reloadFrames=161 ≈ 2.68 s > 2 s, so a durationSec:2 encoding expires mid-reload and makes skill1 SILENTLY, TOTALLY inert — a strip-the-effect A/B (withPatchedOverride) is the cheapest red/green discriminator and every skill1 test should include one. (2) burstCast vs fullBurstEnter is live in this exact fixture: eunhwa is Burst II and controlComp fields crown (also Burst II), so team FBs can chain through crown on rotations eunhwa sits out; all three burst-block effects (nuke, 2.43% DEF ▼, 4.65% crit) must count against eunhwa's burstCast events, never fullBurstStart count. (3) Skill2's 29% boss DEF ▼ has ~57% natural uptime (5 s window per ~8.7 s magazine cycle: 6 shots × 60f charge + 161f reload) — a passive/permanent encoding over-credits ~1.7×; assert coverage GAPS exist between magazines. Also verify the two DEF-down instances (29% skill2, 2.43% burst) coexist under distinct keys rather than same-key overwriting, and that the burst nuke is exactly ONE hit (single boss, never ×10) landing FB-exempt. Engine-support caveat for the driver to reconcile sighted: the schema comments mark defPct 'inert in v1' in the SELF context — confirm the engine actually consumes boss-held DEF ▼ in the damage formula; if it does not, both DEF lines are honestly GAP (engine limitation), not silently-dropped, and belong in unmodeled/note with the team-damage impact flagged.",
  "model": "claude-fable-5"
}

# S5 BLIND TEST (claude-opus-5, authored from kit prose alone) — as EXECUTED (adapted copy)

The RAW blind file is scripts/kit-autonomy/blind/eunhwa.test.ts (kept verbatim). The copy below is the ADAPTED one actually executed; every adaptation is a documented DRIVER ADAPTATION block (A1 fixture: the raw controlComp seats crown, a same-CD Burst II LEFT of eunhwa, who monopolizes stage 2 so eunhwa never casts — probe: liter 9 / crown 9 / ada 5 / eunhwa 0 casts over 180s; adapted to the B2-free liter/eunhwa/ada comp. A2 import path. A3 the two DEF▼ groups: the engine's enemy-buff dispatch admits ONLY damageTakenPct/distributedDamagePct — every other enemy debuff, incl. defPct, is dropped at dispatch with NO event (sim.ts: 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0'; cfg.bossDef is the flat constant 140 that no debuff scales), so the raw spec's boss-held defPct buffApply assertions are unobservable under ANY honest encoding; the adapted group pins the engine-honest treatment: verbatim unmodeled record + zero boss debuffs + a damageTakenPct-laundering counterfactual that proves the pin has teeth. A4 shotCount scoped to eunhwa. A5 buffApply.durationShots is typed null, not undefined.)

RESULT vs the DRIVER override: **15 passed, 2 skipped (both pre-declared structural GAPs by the blind author: DEF-down damage payload unobservable; 10-target fan-out unobservable vs one boss), 0 failed.**

/**
 * eunhwa — BLIND kit spec (cross-family S5 post-op; written from the kit prose alone,
 * with no sight of the driver's override, tests, or reasoning).
 *
 * KIT (SR / Fire / Attacker / Burst II, cd 20s, ammo 6, chargeFrames 60, hitsPerShot 1,
 *      normalAttackMultiplier 71.07, coreAttackMultiplier 200):
 *
 *   skill1  "Affects self. Activates after firing the last round."
 *             Charge Damage ▲ 37.28% for 2 shots
 *             Charge Speed  ▲ 15.53% for 2 rounds
 *   skill2  "Activates after firing the last bullet. Affects the target."
 *             DEF ▼ 29% for 5 sec
 *   burst   "Affects 10 enemy unit(s) with the highest final ATK."
 *             Deals 85.62% of final ATK as damage
 *             DEF ▼ 2.43% for 15 sec
 *           "Affects all allies."
 *             Critical Rate ▲ 4.65% for 15 sec
 *
 * READING (the four questions):
 *   scope     — nothing is scoped to normal attacks. "Critical Rate ▲" is generic critRatePct,
 *               NOT critRateNormalPct; "Charge Damage ▲" is additive chargeDamagePct, NOT the
 *               chargeDamageMultPct primitive (that one is worded "Charge Damage Multiplier").
 *   duration  — S1 is ROUND-COUNTED ("for 2 shots" / "for 2 rounds") => durationShots: 2 on both,
 *               so the window spans the reload that immediately follows the last bullet and covers
 *               the first two rounds of the next magazine. S2 (5 sec) and both burst lines (15 sec)
 *               are wall-clock => durationSec, with durationShots undefined.
 *   trigger   — S1 and S2 share ONE activation clause ("after firing the last round/bullet")
 *               => lastBullet on both: once per magazine, never once per trigger pull.
 *   target    — S1 self; S2 the enemy (boss-held debuff, targetIdx === null); burst line 1 the
 *               enemy; burst line 2 "all allies" with NO except-self clause => eunhwa included.
 *
 * SHAPE DEFENSIVENESS: the packet describes the override file two ways (slot -> Block[] and
 * slot -> { blocks: Block[] }), so blocksOf() accepts both. A wrong guess would silently turn every
 * counterfactual into a no-op — green-on-nothing, the worst failure available to a blind test.
 *
 * SIGN CONVENTION: value filters match on |value|, because the kit text fixes the MAGNITUDE and
 * DIRECTION of a ▼ debuff but not its encoding sign. Direction is asserted where it is unambiguous
 * (▲ buffs must be positive) and left to the counterfactuals otherwise.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * DRIVER ADAPTATIONS (2026-08-05 — fixture plumbing + observability ONLY; every asserted INTENT
 * of the blind spec is preserved; raw file kept verbatim at blind/eunhwa.test.ts):
 *
 *  (A1) FIXTURE — the raw spec's controlComp('eunhwa', true) seats crown (Burst II, cd 20, LEFT
 *       of eunhwa): the engine's first-ready pick breaks equal-CD ties leftmost and the ~20s chain
 *       interval leaves crown always-ready, so crown monopolizes stage 2 and eunhwa NEVER casts
 *       (probe: liter 9 / crown 9 / ada 5 / eunhwa 0 casts over 180s) — the burst group would fail
 *       as a FIXTURE gap, not as a spec violation. Adapted to the B2-free comp the blind gap note
 *       itself prescribes: liter (B1) / eunhwa (B2) / ada (B3), forced-neutral boss, focus eunhwa
 *       (SR charge weapon ⇒ ×2.5 gauge ⇒ she casts every chain). eunhwa is SSR rarity (SR is her
 *       weapon CLASS), so the plain scope-lock ceiling applies — no unitLimits.
 *  (A2) IMPORT PATH — '../lib/harness.js' does not exist from scripts/kit-autonomy/blind/;
 *       the harness lives at scripts/tests/lib/harness.js. Plumbing only.
 *  (A3) S2 + BURST DEF▼ GROUPS — the raw spec asserts boss-held `defPct` buffApply events for the
 *       two DEF▼ lines. ENGINE FACT (verified in sim.ts, not assumed): the enemy-buff dispatch
 *       admits ONLY damageTakenPct/distributedDamagePct into enemyBuffs; every other enemy debuff
 *       (ATK▼, DEF▼) hits `break` with NO applyBuff and NO buffApply event (sim.ts "other enemy
 *       debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0"), and the boss's DEF contribution
 *       is the flat constant cfg.bossDef=140 that no debuff scales. So an enemy-targeted defPct
 *       block is unenactable AND unobservable — no honest encoding can emit the events the raw
 *       assertions demand. The S2b reviewer (claude-fable-5) anticipated exactly this: "if it does
 *       not consume them, both DEF lines are honestly GAP (engine limitation), not silently-dropped,
 *       and belong in unmodeled/note". The driver override (exia precedent) records both lines
 *       VERBATIM in `unmodeled`. The adapted assertions pin THAT honest treatment instead: zero
 *       boss-held buffApply events anywhere in the fight (nothing laundered into damageTakenPct)
 *       and the verbatim unmodeled record — with the same discrimination the raw spec intended:
 *       a damageTakenPct laundering (the nearest wrong model) emits boss debuffs and goes RED here.
 *       The cadence/expiry assertions of the raw S2 group (last-bullet cadence, 5s-not-rounds,
 *       shared 15s cast window) had NO observable referent under any honest encoding and are
 *       absorbed into the unmodeled-record pin; their intent (these lines are skipped deliberately
 *       with full provenance, not silently dropped) is asserted directly.
 *  (A4) shotCount() scoped to eunhwa's own shots (the raw helper counted every unit's shots; the
 *       assertion's intent — her charge speed buys HER shots — is preserved and made stricter).
 *  (A5) EVENT SHAPE — the buffApply event types durationShots as `number | null` (src/types.ts);
 *       the raw spec's `toBeUndefined()` on wall-clock buffs is `toBeNull()` here. Same meaning.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'eunhwa';

type Slot = 'skill1' | 'skill2' | 'burst';
type Opts = ReturnType<typeof controlComp>;

interface BuffApplyEv {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
}

interface LooseEffect {
  kind: string;
  stat?: string;
  atkPct?: number;
}

interface LooseBlock {
  trigger: { kind: string };
  target: { kind: string };
  effects: LooseEffect[];
}

/** Accepts BOTH documented override shapes: slot -> Block[] and slot -> { blocks: Block[] }. */
function blocksOf(ov: unknown, slot: Slot): LooseBlock[] {
  const raw = (ov as Record<string, unknown>)[slot];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as LooseBlock[];
  const nested = (raw as { blocks?: unknown }).blocks;
  return Array.isArray(nested) ? (nested as LooseBlock[]) : [];
}

// DRIVER ADAPTATION (A1): the B2-free comp — liter (B1) / eunhwa (B2) / ada (B3), boss forced
// neutral, camera focus eunhwa so her SR fills gauge and she casts every chain.
function adaptedComp(): Opts {
  return {
    slugs: ['liter', SLUG, 'ada'],
    bossElement: null,
    focusSlug: SLUG,
  } as unknown as Opts;
}

function run(opts: Opts): { res: ReturnType<typeof runComp>; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const o = opts as Opts & { cfg?: Record<string, unknown> };
  const res = runComp({
    ...o,
    cfg: { ...(o.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as Opts);
  return { res, events };
}

function compWith(patched: unknown): Opts {
  const c = adaptedComp() as Opts & {
    overrides?: Record<string, unknown>;
  };
  return { ...c, overrides: { ...(c.overrides ?? {}), [SLUG]: patched } } as Opts;
}

function dropEffects(slot: Slot, pred: (e: LooseEffect) => boolean): unknown {
  return withPatchedOverride(SLUG, (ov) => {
    for (const b of blocksOf(ov, slot)) b.effects = b.effects.filter((e) => !pred(e));
  });
}

function scaleBurstHit(factor: number): unknown {
  return withPatchedOverride(SLUG, (ov) => {
    for (const b of blocksOf(ov, 'burst'))
      for (const e of b.effects)
        if (e.kind === 'flatDamage' && typeof e.atkPct === 'number') e.atkPct *= factor;
  });
}

const buffApplies = (events: SimEvent[]): BuffApplyEv[] =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyEv[];

const byStat = (events: SimEvent[], stat: string, absValue?: number): BuffApplyEv[] =>
  buffApplies(events).filter(
    (e) =>
      e.stat === stat &&
      (absValue === undefined || Math.abs(Math.abs(e.value) - absValue) < 1e-6),
  );

// DRIVER ADAPTATION (A4): scoped to eunhwa's own shots.
const shotCount = (events: SimEvent[]): number =>
  events.filter(
    (e) => e.kind === 'shot' && (e as { slug?: string }).slug === SLUG,
  ).length;

const uniq = (xs: number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);
const frames = (evs: BuffApplyEv[]): number[] => uniq(evs.map((e) => e.expiresFrame ?? -1));
const dmg = (m: Record<string, number>, slug: string): number => m[slug] ?? 0;

// ---- hoisted runs (each is a full 180s sim) --------------------------------
const base = run(adaptedComp());
const baseTotals = totals(base.res);
const comp = Object.keys(baseTotals);
const allies = comp.filter((s) => s !== SLUG);
const allySum = (m: Record<string, number>): number =>
  allies.reduce((a, s) => a + dmg(m, s), 0);

const noChargeDmg = run(
  compWith(dropEffects('skill1', (e) => e.stat === 'chargeDamagePct')),
);
const noChargeSpeed = run(
  compWith(dropEffects('skill1', (e) => e.stat === 'chargeSpeedPct')),
);
// nearest-wrong trigger identity: per trigger pull instead of per magazine.
const perShotS1 = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      for (const b of blocksOf(ov, 'skill1')) b.trigger = { kind: 'shotFired' };
    }),
  ),
);
// half / double keep the burst hit's IMPACT COUNT identical, so burst-gauge and therefore the
// whole rotation are byte-identical across all three runs — the deltas isolate magnitude alone.
const halfBurstHit = run(compWith(scaleBurstHit(0.5)));
const dblBurstHit = run(compWith(scaleBurstHit(2)));
const noBurstCrit = run(compWith(dropEffects('burst', (e) => e.stat === 'critRatePct')));
// DRIVER ADAPTATION (A3): the laundering counterfactual for the two DEF▼ lines — the nearest
// wrong model is re-encoding them as boss damageTakenPct (a different mechanic the kit never
// grants). The shipped override must emit ZERO boss debuffs; this run proves the pin has teeth.
const s2Laundered = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = [
        {
          slot: 'skill2',
          trigger: { kind: 'lastBullet' },
          target: { kind: 'enemy' },
          effects: [
            { kind: 'buff', stat: 'damageTakenPct', value: 29, durationSec: 5 },
          ],
        },
      ];
    }),
  ),
);

const s1ChargeDmg = byStat(base.events, 'chargeDamagePct', 37.28);
const s1ChargeSpd = byStat(base.events, 'chargeSpeedPct', 15.53);
const bCrit = byStat(base.events, 'critRatePct', 4.65);

describe('eunhwa S1 — last-bullet self charge buffs', () => {
  it('grants Charge Damage 37.28% to SELF for 2 ROUNDS, once per magazine', () => {
    // Non-vacuity: 6 ammo over a 180s fight empties the magazine many times.
    expect(s1ChargeDmg.length).toBeGreaterThanOrEqual(6);
    for (const e of s1ChargeDmg) {
      expect(e.value).toBeGreaterThan(0); // an upward buff, never encoded negative
      expect(e.targetSlug).toBe(SLUG); // "Affects self"
      expect(e.targetIdx).not.toBeNull(); // an ally-held buff, not a boss-held one
      // RED under the nearest-wrong duration model (durationSec: 2 instead of 2 rounds),
      // which leaves durationShots undefined and expires the buff mid-reload.
      expect(e.durationShots).toBe(2);
    }
  });

  it('grants Charge Speed 15.53% to SELF for 2 ROUNDS', () => {
    expect(s1ChargeSpd.length).toBeGreaterThanOrEqual(6);
    for (const e of s1ChargeSpd) {
      expect(e.value).toBeGreaterThan(0);
      expect(e.targetSlug).toBe(SLUG);
      expect(e.durationShots).toBe(2);
    }
  });

  it('fires on the LAST BULLET, not on every trigger pull', () => {
    // With 6 rounds per magazine a shotFired trigger fires ~6x as often; >3x is the safe margin.
    const perShot = byStat(perShotS1.events, 'chargeDamagePct', 37.28).length;
    expect(perShot).toBeGreaterThan(s1ChargeDmg.length * 3);
  });

  it('both S1 lines ride the SAME activation (one trigger, two effects)', () => {
    expect(s1ChargeSpd.length).toBe(s1ChargeDmg.length);
  });

  it('Charge Damage is a live damage lever and is inert for teammates', () => {
    const t = totals(noChargeDmg.res);
    expect(dmg(baseTotals, SLUG)).toBeGreaterThan(dmg(t, SLUG));
    // Burst gauge is per-shot, not per-damage, so removing a damage buff cannot move the
    // rotation: every teammate must be byte-identical.
    for (const s of allies) expect(dmg(t, s)).toBe(dmg(baseTotals, s));
  });

  it('Charge Speed buys shots (a weapon-state modifier IS damage)', () => {
    // Shot count is monotone in charge speed with no full-burst-window confound.
    expect(shotCount(base.events)).toBeGreaterThan(shotCount(noChargeSpeed.events));
    expect(dmg(baseTotals, SLUG)).toBeGreaterThanOrEqual(
      dmg(totals(noChargeSpeed.res), SLUG),
    );
  });
});

describe('eunhwa S2 — last-bullet DEF ▼29% line (ADAPTED A3: engine has no enemy-DEF channel)', () => {
  it('is UNMODELED — recorded VERBATIM, not silently dropped', () => {
    const ov = loadOverride(SLUG) as {
      unmodeled?: { skill2?: string[] };
    };
    expect(
      (ov.unmodeled?.skill2 ?? []).join('\n'),
      'the skipped line must be recorded verbatim in unmodeled.skill2'
    ).toContain('DEF ▼ 29% for 5 sec.');
  });

  it('enacts NOTHING on the boss — and a damageTakenPct laundering would (discrimination)', () => {
    // sim.ts drops enemy ATK▼/DEF▼ at dispatch (only damageTakenPct/distributedDamagePct reach
    // enemyBuffs), and cfg.bossDef is a flat constant no debuff scales — so the honest encoding
    // emits ZERO boss-held buffApply events. A laundering into damageTakenPct would emit them:
    // that is the nearest wrong model, and this pair of assertions is RED under it.
    expect(
      buffApplies(base.events).filter((e) => e.targetIdx === null),
      'no boss-held buff may exist in the shipped run'
    ).toEqual([]);
    expect(
      buffApplies(s2Laundered.events).filter(
        (e) => e.targetIdx === null && e.stat === 'damageTakenPct',
      ).length,
      'the laundered counterfactual DOES emit boss debuffs — the pin has teeth'
    ).toBeGreaterThan(0);
  });

  it('no ally ever receives a DEF buff or debuff from this kit', () => {
    for (const e of byStat(base.events, 'defPct')) expect(e.targetIdx).toBeNull();
  });

  it.skip('GAP — DEF down has no observable damage payload (both the S2 29%/5s and the burst 2.43%/15s lines): types.ts documents defPct as inert in v1, and sim.ts drops enemy DEF▼ at dispatch, so neither the encoding events nor any damage effect are observable at scope lock', () => {});
});

describe('eunhwa burst — 85.62% hit, boss DEF 2.43%/15s (ADAPTED A3), ally Crit Rate 4.65%/15s', () => {
  it('NON-VACUITY: eunhwa actually casts her Burst II in the adapted comp', () => {
    // In the B2-free adapted comp she is the only stage-2 unit, so every chain is hers; if this
    // fails the whole burst group is untested rather than passing, which is the point of leading
    // with it.
    expect(bCrit.length).toBeGreaterThan(0);
    expect(frames(bCrit).length).toBeGreaterThanOrEqual(2);
  });

  it('Critical Rate 4.65% goes to ALL allies INCLUDING herself, for a timed window', () => {
    const targets = new Set(bCrit.map((e) => e.targetSlug));
    // RED under the nearest-wrong target model (allies excludeSelf, or self-only).
    expect(targets.has(SLUG)).toBe(true);
    for (const s of comp) expect(targets.has(s)).toBe(true);
    expect(bCrit.length).toBe(targets.size * frames(bCrit).length);
    for (const e of bCrit) {
      expect(e.value).toBeGreaterThan(0);
      expect(e.durationShots).toBeNull(); // ADAPTED (A5): 15 sec is wall-clock, not rounds
    }
  });

  it('the burst DEF ▼2.43% line is UNMODELED — recorded VERBATIM, not laundered', () => {
    // ADAPTED (A3): the raw spec's "both 15-sec burst lines share one cast window" and
    // "boss-held once per cast" assertions demanded defPct events the engine cannot emit
    // (enemy DEF▼ is dropped at dispatch — sim.ts). The honest treatment is the verbatim
    // unmodeled record + zero boss events (already pinned in the S2 group for BOTH DEF lines:
    // any boss-held buffApply anywhere in the fight would fail that pin).
    const ov = loadOverride(SLUG) as {
      unmodeled?: { burst?: string[] };
    };
    expect(
      (ov.unmodeled?.burst ?? []).join('\n'),
      'the skipped line must be recorded verbatim in unmodeled.burst'
    ).toContain('DEF ▼ 2.43% for 15 sec.');
  });

  it('the ally crit buff lifts the WHOLE team, not just eunhwa', () => {
    const t = totals(noBurstCrit.res);
    expect(dmg(baseTotals, SLUG)).toBeGreaterThan(dmg(t, SLUG)); // self is in the target set
    expect(allySum(baseTotals)).toBeGreaterThan(allySum(t)); // and so is everyone else
  });

  it('the 85.62%-of-final-ATK hit is live and scales LINEARLY with its atkPct', () => {
    const half = dmg(totals(halfBurstHit.res), SLUG);
    const on = dmg(baseTotals, SLUG);
    const dbl = dmg(totals(dblBurstHit.res), SLUG);
    const dHalf = on - half; // = 0.5 x (one fight of burst-hit damage)
    const dDbl = dbl - on; // = 1.0 x the same
    expect(dHalf).toBeGreaterThan(0); // RED if no flatDamage effect exists at all
    expect(dDbl / dHalf).toBeGreaterThan(1.9);
    expect(dDbl / dHalf).toBeLessThan(2.1);
  });

  it('burst hit magnitude never leaks into ally totals', () => {
    const t = totals(dblBurstHit.res);
    for (const s of allies) expect(dmg(t, s)).toBe(dmg(baseTotals, s));
  });

  it.skip('GAP — "Affects 10 enemy unit(s) with the highest final ATK": the scope-lock fight has a single partless boss, so target multiplicity is unobservable and a 1-target vs 10-target encoding cannot be discriminated from totals', () => {});
});
# S6 BLIND OVERRIDE (claude-opus-5, authored from kit prose alone) — scripts/kit-autonomy/blind/eunhwa.override.json

{
  "slug": "eunhwa",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 37.28,
          "durationShots": 2
        },
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 15.53,
          "durationShots": 2
        }
      ]
    }
  ],
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
          "kind": "buff",
          "stat": "defPct",
          "value": -29,
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
          "atkPct": 85.62
        },
        {
          "kind": "buff",
          "stat": "defPct",
          "value": -2.43,
          "durationSec": 15
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
          "stat": "critRatePct",
          "value": 4.65,
          "durationSec": 15
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
    "⚑ durationShots=2 for both S1 buffs: the kit says 'for 2 shots' (Charge Damage) and 'for 2 round(s)' (Charge Speed). Both read as ROUND counts, not seconds; on a 6-round SR every round is a charged shot, so the two wordings collapse to the same window. Unmeasured whether the window covers 2 rounds of the NEXT magazine or is consumed partly by the triggering last bullet itself (engine decrements durationShots right after the firing shot's blocks dispatch).",
    "⚑ S2 enemy DEF ▼29% is authored as stat 'defPct' with a negative value on target 'enemy' — the only DEF StatKey in the schema, whose comment scopes inertness to SELF DEF. Whether the engine routes an enemy-side defPct into the boss-DEF subtraction is UNVERIFIED from the material available here; if it does not, this line is silently inert and needs an engine-side channel (or damageTakenPct as a proxy, which would be a different mechanic and is NOT used here).",
    "⚑ Burst flatDamage: crit/noFb/noRange left unset. Per methodology, riders crit at the caster's rate under the engine's global rider-crit path, burst-cast damage is Full-Burst-exempt by TIMING (it lands before the FB window opens), and no-range is engine-automatic. No per-kit noFb is set — that field is measured-only.",
    "Burst targeting 'Affects 10 enemy unit(s) with the highest final ATK' is scope-trivial: the raid fight has one boss entity, so it is modeled as target 'enemy'. The 10-target fan-out is untestable at scope lock and carries no sim consequence.",
    "⚑ Cadence tuple (chargeFrames 60, reloadFrames 161, ammo 6) comes from the datamine, which is known-unreliable for fire/reload timing. Shot count per magazine drives last-bullet frequency, which drives BOTH S1 and S2 uptime, so a cadence error propagates to every buff window here."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Eunhwa is a 6-round charge SR (Fire/Attacker/Burst II) whose whole kit hangs off the last-bullet trigger, so both non-burst skills fire once per magazine. S1 (self, on last round): Charge Damage ▲37.28% and Charge Speed ▲15.53%, both authored as ROUND-count windows (durationShots 2) so they span the reload into the next magazine — Charge Damage is additive in the charge bucket, Charge Speed shortens the 60-frame charge and therefore raises shots fired (a weapon-state modifier, not a skippable QoL line). S2 (enemy, on last bullet): DEF ▼29% for 5 sec, authored as a negative defPct on target enemy. Burst: a burst-cast hit for 85.62% of final ATK plus DEF ▼2.43% for 15 sec on the enemy, and Critical Rate ▲4.65% for 15 sec to all allies (self included). No weapon swap, no stack/currency pool, no DoT, no core-strike or Hit-Rate line, no formation/team gate, no mode. Every kit line is implemented; unmodeled is empty for all three slots.",
  "hasPierce": false
}
## SHORT DIFF — S6 blind override vs DRIVER override (src/skills/overrides/eunhwa.json)

SKILL1 — CONVERGENT (byte-equivalent semantics): both ship ONE block, trigger lastBullet, target self, effects [chargeDamagePct 37.28 durationShots 2, chargeSpeedPct 15.53 durationShots 2]. Identical trigger identity (per-magazine last bullet), identical round-count duration reading ("for 2 shots"/"for 2 rounds"), identical stat choice (additive chargeDamagePct, NOT chargeDamageMultPct).

BURST DAMAGE — CONVERGENT: both ship burstCast → enemy → flatDamage 85.62; both note the 10-highest-final-ATK fan-out collapses to the single boss; both leave FB-exemption to cast-timing (no noFb), crit at caster rate, no range.

BURST ALLY CRIT — CONVERGENT: both ship burstCast → allies (NO excludeSelf — "all allies" includes the caster) → critRatePct 4.65 / durationSec 15; both choose the UNSCOPED critRatePct (never critRateNormalPct).

DEF▼ LINES (S2 29%/5s, burst 2.43%/15s) — DIVERGENT, and the divergence is fully documented on BOTH sides. The blind author shipped enemy-targeted `defPct -29 / -2.43` blocks with an explicit self-flag: "Whether the engine routes an enemy-side defPct into the boss-DEF subtraction is UNVERIFIED from the material available here; if it does not, this line is silently inert ... Encoding it as damageTakenPct instead would be a fudge (a different mechanic)". Its OWN recipe: "Sighted check (no fight needed): grep the engine for the defPct consumer". The DRIVER ran exactly that sighted check: sim.ts applyEffect — `if (block.target.kind === 'enemy')` admits ONLY damageTakenPct/distributedDamagePct into enemyBuffs; every other enemy debuff hits `break` with no applyBuff and no event ("other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0"), and the boss DEF contribution is cfg.bossDef = 140, a flat constant no debuff scales. So the blind blocks are silently inert exactly as the blind author feared. The driver therefore records both lines VERBATIM in unmodeled (the S2b reviewer's explicit contingency: "if it does not consume them, both DEF lines are honestly GAP (engine limitation), not silently-dropped, and belong in unmodeled/note"; exia precedent), with zero-boss-debuff pins in BOTH spec tests (driver + adapted blind) and a damageTakenPct-laundering counterfactual proving the absence is deliberate. Verdict-relevant fact: the two encodings are DAMAGE-IDENTICAL in sim domain (the blind blocks dispatch to nothing), so the divergence is provenance hygiene, not behavior.

S6-FLAG RESOLUTION (durationShots consumption): the blind author's open sub-question — "whether the triggering last bullet itself consumes one of the two" rounds — is resolved BEHAVIORALLY by the driver spec: scripts/tests/units/eunhwa.test.ts pins that exactly the first TWO shots of the NEXT magazine carry the boosted charge bucket (the triggering shot does not consume the budget); the adapted blind test's durationShots===2 / lastBullet-cadence assertions corroborate.

NOTE/PROVENANCE: the blind file carries a PARSER-BASELINE note and a cadence ⚑ (datamined ammo/charge/reload) — same cadence basis as the driver (characters.json, no charFixes); neither side invents numbers.

# DRIVER IMPLEMENTATION — scripts/tests/units/eunhwa.test.ts (19/19 green)

// PER-UNIT KIT SPEC — `eunhwa` (Eunhwa, Attacker/SR/Fire, Burst II, cd 20s, ammo 6,
// chargeFrames 60, reloadFrames 161, chargeMultiplier 250). Kit-autonomy gauntlet 2026-08-05.
// BASE UNIT — never the variant eunhwa-tactical-upgrade (aka eunwhatu); P0 disambiguation.
// SSR rarity despite the SR weapon class → the plain scope-lock ceiling (copies 10 ⇒ 3★ +
// core 7) is reachable in game; no unitLimits needed (unlike SR-rarity units, belorta).
//
// One assertion group per KIT LINE (S1a, S1b, S2, B1, B2, B3 below), asserted against the
// SHIPPED override loaded from disk. `withPatchedOverride` appears only to build
// COUNTERFACTUALS (the nearest wrong model each assertion must discriminate against) —
// never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.eunhwa.skills):
//   S1 ■ self, after firing the last round:
//        Charge Damage ▲37.28% for 2 shots                                             [S1a]
//        Charge Speed ▲15.53% for 2 rounds                                             [S1b]
//   S2 ■ the target, after firing the last bullet: DEF ▼29% for 5 sec                  [S2]
//   BU ■ the 10 enemy unit(s) with the highest final ATK:
//        85.62% of final ATK as damage                                                 [B1]
//        DEF ▼2.43% for 15 sec                                                         [B2]
//      ■ all allies: Critical Rate ▲4.65% for 15 sec                                   [B3]
//
// Dispositions:
//   S1a/S1b FAITHFUL — lastBullet trigger ("after firing the last round" = the reload-start
//       convention, engine fires lastBullet on the frame the mag runs dry), self buff,
//       ROUND-COUNT windows: "for 2 shots" / "for 2 rounds" are durationShots 2 with NO
//       wall-clock expiry, so the window survives the 161f reload and expires right after
//       her 2nd shot of the next magazine (Tier-2 round-count discrimination).
//   S2  UNMODELED (pinned by ABSENCE): the sim runs a DEF=0 enemy basis and the engine's
//       enemy-buff channel admits only damageTakenPct/distributedDamagePct — enemy DEF▼ is
//       dropped at dispatch (sim.ts; exia precedent), so there is nothing to enact. The line
//       is recorded VERBATIM in the override's unmodeled.skill2. Nearest wrong model:
//       laundering the DEF▼ into damageTakenPct (a different mechanic — the boss taking more
//       damage) would fabricate a ~29% team lift the kit never grants; the ABSENCE pins prove
//       the shipped override is not that model. The lastBullet trigger of this line is part of
//       the skipped sentence (an enemy-targeted lastBullet effect has no channel either).
//   B1  FAITHFUL — burstCast flatDamage 85.62 ("the 10 enemy unit(s) with the highest final
//       ATK" collapses to the single immortal boss — multi-target selection is inert in the
//       single-target sim, exia precedent). The cast lands BEFORE the Full Burst window, so it
//       must never take the +50% FB major (engine auto-exempts burstCast damage); it crits at
//       the caster rate (U1 rider convention).
//   B2  UNMODELED (pinned by ABSENCE): same DEF=0 basis as S2 — recorded VERBATIM in
//       unmodeled.burst.
//   B3  FAITHFUL — burstCast-keyed critRatePct 4.65 to ALL allies (self included — the kit
//       says "all allies", never "other allies"), 15s wall-clock window. Tier-2
//       burstCast-vs-fullBurstEnter discrimination: the buff is granted by HER burst skill, so
//       it must apply on HER casts only — not on every Full Burst the team opens (fixture A
//       runs a second Burst II who leads the FB cycles, so the two keyings produce different
//       frames and different cast/FB counts).
//
// Fixtures (both deterministic — no seed; event-log over totals):
//   A (rotation): liter (B1) / delta (B2, 40s) / eunhwa (B2, 20s) / ada (B3, 40s), forced-
//       neutral boss (null), camera focus eunhwa (SR charge weapon ⇒ ×2.5 burst gauge). Delta
//       sits LEFT of eunhwa, so delta wins every B2 tie and leads the FB cycles on her 40s CD
//       (ada's 40s CD gates FBs to the same cycles); eunhwa casts on the ALTERNATE chains.
//       Her cast frames are therefore always distinct from every Full Burst start frame — the
//       burstCast-vs-fullBurstEnter discriminator. Delta's kit is self-only (no ally buffs, no
//       boss debuffs), so nothing else touches the crit/charge observations.
//   B (solo window): liter / eunhwa / ada, same basis — she is the ONLY Burst II, so she casts
//       every chain and her 15s buff windows have clean 5s gaps for functional observation
//       (per-shot crit-rate delta, charge duty cycle, charge-cycle shortening).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture A slot order: liter 0 / delta 1 / eunhwa 2 / ada 3. */
const EUNHWA_A = 2;
const TEAM_SIZE_A = 4;
/** Fixture B slot order: liter 0 / eunhwa 1 / ada 2. */
const EUNHWA_B = 1;
const EUNHWA = 'eunhwa';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function runA(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['liter', 'delta', EUNHWA, 'ada'],
    bossElement: null,
    focusSlug: EUNHWA,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
function runB(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['liter', EUNHWA, 'ada'],
    bossElement: null,
    focusSlug: EUNHWA,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === EUNHWA);
/** The last bullet of each magazine (ammoAfter 0) — the S1/S2 activation moment. */
const lastBullets = (evs: SimEvent[]) =>
  shots(evs).filter((s) => s.ammoAfter === 0);
const casts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === EUNHWA
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** Her S1 self-buff applications for one stat. */
const s1Buffs = (evs: SimEvent[], stat: string, slot: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === slot && b.targetIdx === slot && b.stat === stat
  );
/** Her burst-skill crit buff applications. */
const critBuffs = (evs: SimEvent[], slot: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === slot && b.stat === 'critRatePct'
  );

// ---- counterfactual patches -------------------------------------------------------------------
/** S1 counterfactual: the nearest wrong model — both S1 lines as ONE permanent passive buff
 *  (no lastBullet keying, no round-count expiry). Over-credits every shot of the fight. */
const eunhwaS1Passive = withPatchedOverride(EUNHWA, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.map((b: any) => ({
    ...b,
    trigger: { kind: 'passive' },
    effects: b.effects.map((e: any) => {
      const { durationShots, ...rest } = e;
      return rest;
    }),
  }));
  if (ov.skill1.length !== before || before === 0) {
    throw new Error('eunhwa skill1 blocks missing — fixture is stale');
  }
});
/** B1 counterfactual: the burst nuke REMOVED entirely (a bare-baseline burst). */
const eunhwaNoNuke = withPatchedOverride(EUNHWA, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length === before) {
    throw new Error('eunhwa burst flatDamage block missing — fixture is stale');
  }
});
/** B3 counterfactual: the crit buff keyed to fullBurstEnter instead of burstCast — applies on
 *  EVERY Full Burst the team opens, not on her casts. */
const eunhwaCritOnFbEnter = withPatchedOverride(EUNHWA, (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'critRatePct')
  );
  if (!block) {
    throw new Error('eunhwa burst critRatePct block missing — fixture is stale');
  }
  block.trigger = { kind: 'fullBurstEnter' };
});
/** S2 counterfactual: the nearest wrong encoding — laundering the DEF▼ into a boss
 *  damageTakenPct debuff (a different mechanic the kit never grants). */
const eunhwaS2Laundered = withPatchedOverride(EUNHWA, (ov) => {
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'lastBullet' },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 29, durationSec: 5 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const baseA = runA();
const baseB = runB();
const noCritB = runB({
  [EUNHWA]: withPatchedOverride(EUNHWA, (ov) => {
    const before = ov.burst.length;
    ov.burst = ov.burst.filter(
      (b: any) => !b.effects.some((e: any) => e.stat === 'critRatePct')
    );
    if (ov.burst.length === before) {
      throw new Error('eunhwa burst critRatePct block missing — fixture is stale');
    }
  }),
});
const s1PassiveB = runB({ [EUNHWA]: eunhwaS1Passive });
const launderedB = runB({ [EUNHWA]: eunhwaS2Laundered });
const fbEnterA = runA({ [EUNHWA]: eunhwaCritOnFbEnter });
const noNukeA = runA({ [EUNHWA]: eunhwaNoNuke });

// ---- derived observations ---------------------------------------------------------------------
/** Group her shots by magazine ordinal. */
function byMag(evs: SimEvent[]): Map<number, Shot[]> {
  const m = new Map<number, Shot[]>();
  for (const s of shots(evs)) {
    (m.get(s.magIndex) ?? m.set(s.magIndex, []).get(s.magIndex)!).push(s);
  }
  return m;
}
const chargeOf = (s: Shot, evs: SimEvent[]): number => {
  const d = dmg(evs).find(
    (x) =>
      x.slug === EUNHWA &&
      x.srcSlot === 'normal' &&
      x.frame === s.frame
  );
  if (!d) {
    throw new Error(`no normal damage event for shot at frame ${s.frame}`);
  }
  return d.mult.charge;
};
const normalCritRates = (evs: SimEvent[], slug: string): string[] =>
  [
    ...new Set(
      dmg(evs)
        .filter((d) => d.slug === slug && d.bucket === 'normal')
        .map((d) => d.critRate.toFixed(9))
    ),
  ].sort();

describe('eunhwa — kit spec', () => {
  describe('S1a/S1b — last-round self buffs: Charge Damage ▲37.28% + Charge Speed ▲15.53%, 2 rounds', () => {
    const cdApplies = s1Buffs(baseB, 'chargeDamagePct', EUNHWA_B);
    const csApplies = s1Buffs(baseB, 'chargeSpeedPct', EUNHWA_B);
    const dryFires = lastBullets(baseB);

    it('fire once per magazine dry-fire (lastBullet), not per shot and not once at t=0', () => {
      expect(dryFires.length).toBeGreaterThan(3);
      expect(cdApplies.length).toBe(dryFires.length);
      expect(csApplies.length).toBe(dryFires.length);
    });

    it('apply on the exact frame the magazine runs dry', () => {
      const dryFrames = new Set(dryFires.map((s) => s.frame));
      for (const b of [...cdApplies, ...csApplies]) {
        expect(
          dryFrames.has(b.frame),
          `buffApply at frame ${b.frame} has no matching last-bullet shot`
        ).toBe(true);
      }
    });

    it('are ROUND-COUNT windows (2 shots) with no wall-clock expiry', () => {
      expect([...new Set(cdApplies.map((b) => b.value))]).toEqual([37.28]);
      expect([...new Set(csApplies.map((b) => b.value))]).toEqual([15.53]);
      expect([...new Set(cdApplies.map((b) => b.durationShots))]).toEqual([2]);
      expect([...new Set(csApplies.map((b) => b.durationShots))]).toEqual([2]);
      expect(
        [...new Set([...cdApplies, ...csApplies].map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry'
      ).toEqual([null]);
    });

    it('boost ONLY the first 2 shots of the next magazine (duty cycle, not always-on)', () => {
      const mags = byMag(baseB);
      let checkedMags = 0;
      for (const [mag, magShots] of mags) {
        if (mag === 0 || magShots.length < 3) {
          continue; // first mag predates any dry-fire; short last mag has no full pattern
        }
        const charges = magShots.map((s) => chargeOf(s, baseB));
        const base = charges[2]; // 3rd shot is always outside the 2-shot window
        const boosted = charges.filter((c) => c > base);
        expect(
          boosted.length,
          `mag ${mag}: ${boosted.length} boosted shots, expected exactly 2`
        ).toBe(2);
        expect(
          charges.slice(0, 2).every((c) => c > base),
          `mag ${mag}: the boosted shots must be the FIRST two of the magazine`
        ).toBe(true);
        // chargeDamagePct is additive percentage points INSIDE the charge bucket:
        // (250 + 37.28) / 250 — the kit magnitude, not a fitted number.
        expect(boosted[0] / base).toBeCloseTo(287.28 / 250, 9);
        checkedMags++;
      }
      expect(checkedMags).toBeGreaterThan(3);
    });

    it('SHORTEN the charge cycle by exactly round(60 × 15.53/100) = 9 frames for 2 rounds', () => {
      const mags = byMag(baseB);
      let checkedMags = 0;
      for (const [mag, magShots] of mags) {
        if (mag === 0 || magShots.length < 3) {
          continue;
        }
        const buffedGap = magShots[1].frame - magShots[0].frame; // both shots in-window
        const plainGap = magShots[2].frame - magShots[1].frame; // out of window
        expect(
          plainGap - buffedGap,
          `mag ${mag}: charge speed must shorten the in-window cycle by 9f (51f vs 60f)`
        ).toBe(9);
        checkedMags++;
      }
      expect(checkedMags).toBeGreaterThan(3);
    });

    it('DISCRIMINATING: a permanent passive would boost EVERY shot (incl. magazine 0)', () => {
      // Passive counterfactual: one t=0 application per stat (not one per dry-fire)...
      expect(s1PassiveB.length).toBeGreaterThan(0);
      const passiveCd = s1Buffs(s1PassiveB, 'chargeDamagePct', EUNHWA_B);
      expect(passiveCd.length, 'passive fires once, not per magazine').toBe(1);
      // ...and EVERY shot boosted, starting with magazine 0 (the shipped model never does).
      const mags = byMag(s1PassiveB);
      const mag0 = mags.get(0)!;
      const charges0 = mag0.map((s) => chargeOf(s, s1PassiveB));
      expect(
        new Set(charges0).size,
        'passive model boosts magazine 0 uniformly — shipped leaves it unboosted'
      ).toBe(1);
      const m1 = mags.get(1)!;
      const charges1 = m1.map((s) => chargeOf(s, s1PassiveB));
      expect(
        charges1.every((c) => c === charges1[0]),
        'passive model has no 2-shot duty cycle'
      ).toBe(true);
      // Magazine-0 charge cycle is NOT shortened under the shipped round-count model
      // (no dry-fire has happened yet, so no window was ever granted)...
      const magsBase = byMag(baseB);
      const b0 = magsBase.get(0)!;
      expect(b0[1].frame - b0[0].frame).toBe(b0[2].frame - b0[1].frame);
      // ...but IS shortened under the passive counterfactual — uniformly, from the very
      // first charge (the discrimination: a passive buff is live before any reload).
      const p0 = mags.get(0)!;
      expect(
        p0[1].frame - p0[0].frame,
        'passive model: magazine 0 is uniformly buffed'
      ).toBe(p0[2].frame - p0[1].frame);
      expect(p0[1].frame - p0[0].frame).toBeLessThan(
        b0[1].frame - b0[0].frame
      );
    });
  });

  describe('S2 — DEF ▼29% for 5 sec on the last-bullet target is UNMODELED (DEF=0 basis)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride(EUNHWA) as any;
      expect(ov.unmodeled.skill2.join('\n')).toContain('DEF ▼ 29% for 5 sec.');
    });

    it('enacts NOTHING: no skill2 damage, no boss debuff anywhere in her fixtures', () => {
      expect(
        dmg(baseA).filter((d) => d.slug === EUNHWA && d.srcSlot === 'skill2'),
        'skill2 must produce no damage instances'
      ).toEqual([]);
      // Boss debuffs emit with targetIdx null (casterIdx null — the enemyBuffs channel
      // carries no caster attribution). No fixture mate applies one either (liter/delta
      // have no enemy-targeted blocks; ada's are DoTs, not buffs), so ANY boss-held
      // buffApply would be a laundering of one of her two DEF▼ lines.
      for (const evs of [baseA, baseB]) {
        expect(
          buffs(evs).filter((b) => b.targetIdx === null),
          'no boss-targeted debuff may exist (DEF▼ is dropped, not laundered)'
        ).toEqual([]);
      }
    });

    it('DISCRIMINATING: a damageTakenPct laundering would emit boss debuffs', () => {
      const laundered = buffs(launderedB).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(
        laundered.length,
        'the laundered model emits boss debuffs — the shipped model must not'
      ).toBeGreaterThan(0);
      expect([...new Set(laundered.map((b) => b.value))]).toEqual([29]);
    });
  });

  describe('B1 — burst nuke: 85.62% of final ATK, once per cast, before the FB window', () => {
    const nukes = dmg(baseA).filter(
      (d) => d.slug === EUNHWA && d.srcSlot === 'burst'
    );
    const herCasts = casts(baseA);

    it('casts her burst at all in the rotation fixture', () => {
      expect(herCasts.length).toBeGreaterThan(2);
    });

    it('fires one burst-bucket hit per cast at the kit magnitude', () => {
      expect(nukes.length).toBe(herCasts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([85.62]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('lands on the cast frame and never takes the +50% FB major', () => {
      const castFrames = herCasts.map((c) => c.frame).sort((a, b) => a - b);
      expect(nukes.map((d) => d.frame).sort((a, b) => a - b)).toEqual(
        castFrames
      );
      expect(
        nukes.filter((d) => d.fbMajorApplied),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: removing the nuke leaves zero burst damage from her', () => {
      expect(
        dmg(noNukeA).filter((d) => d.slug === EUNHWA && d.srcSlot === 'burst')
          .length
      ).toBe(0);
    });
  });

  describe('B2 — burst DEF ▼2.43% for 15 sec is UNMODELED (DEF=0 basis)', () => {
    it('is recorded VERBATIM in the override unmodeled block', () => {
      const ov = loadOverride(EUNHWA) as any;
      expect(ov.unmodeled.burst.join('\n')).toContain('DEF ▼ 2.43% for 15 sec.');
    });
    // Enactment absence is shared with S2: the S2 group's "no boss debuff from her" assertion
    // covers BOTH DEF▼ lines (neither may surface as a damageTakenPct laundering).
  });

  describe('B3 — burst grants ALL allies Critical Rate ▲4.65% for 15 sec, on HER cast', () => {
    const applied = critBuffs(baseA, EUNHWA_A);
    const herCasts = casts(baseA);
    const fbFrames = new Set(fbStarts(baseA).map((e) => e.frame));

    it('applies once per HER cast — not once per Full Burst the team opens', () => {
      expect(applied.length).toBe(TEAM_SIZE_A * herCasts.length);
      // Her casts land on the alternate (non-FB) chains in this fixture — so a
      // fullBurstEnter-keyed model would apply on entirely different frames.
      for (const b of applied) {
        expect(
          herCasts.some((c) => c.frame === b.frame),
          `crit buff at frame ${b.frame} is not on one of her cast frames`
        ).toBe(true);
        expect(
          fbFrames.has(b.frame),
          `crit buff at frame ${b.frame} must not sit on a Full Burst start frame`
        ).toBe(false);
      }
    });

    it('reaches all four allies, including herself, for exactly 15 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([4.65]);
      const perCast = new Map<number, Set<number>>();
      for (const b of applied) {
        (
          perCast.get(b.frame) ?? perCast.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx!);
      }
      expect(perCast.size).toBe(herCasts.length);
      for (const [frame, holders] of perCast) {
        expect(
          holders,
          `frame ${frame} reached ${holders.size} allies, expected all ${TEAM_SIZE_A}`
        ).toEqual(new Set([0, 1, 2, 3]));
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('DISCRIMINATING: a fullBurstEnter keying lands on FB frames, not her cast frames', () => {
      const onFb = critBuffs(fbEnterA, EUNHWA_A);
      expect(onFb.length).toBeGreaterThan(0);
      const herCastFrames = new Set(casts(fbEnterA).map((c) => c.frame));
      expect(
        onFb.filter((b) => herCastFrames.has(b.frame)).length,
        'fullBurstEnter applications miss her cast frames entirely in this fixture'
      ).toBe(0);
    });

    it('FUNCTIONAL: the buff is live — her crit rate moves by exactly 4.65 ppt in-window', () => {
      const rates = normalCritRates(baseB, EUNHWA).map(Number);
      expect(
        rates.length,
        'she must have both in-window and out-of-window normal shots'
      ).toBe(2);
      expect(rates[1] - rates[0]).toBeCloseTo(0.0465, 9);
    });

    it('FUNCTIONAL: every ally takes the crit lift, in every bucket (unscoped critRatePct)', () => {
      for (const slug of ['liter', EUNHWA, 'ada']) {
        expect(
          normalCritRates(baseB, slug),
          `${slug} normal-bucket crit must move when her buff is removed`
        ).not.toEqual(normalCritRates(noCritB, slug));
      }
    });
  });
});

# DRIVER IMPLEMENTATION — src/skills/overrides/eunhwa.json

{
  "note": "Eunhwa (slug eunhwa — the BASE unit; never the variant eunhwa-tactical-upgrade, aka eunwhatu — P0 disambiguation) — Elysion Fire SR Attacker, Burst II, 20s CD, 6-round SR (71.07% normal / 250% full charge, 60f charge / 161f reload). FROM-SCRATCH kit-autonomy build 2026-08-05 (no prior override; baseline was bare weapon, simSupported:false). SKILL1 'Ready and Able' ('Affects self. Activates after firing the last round.'): ONE block, trigger lastBullet (the engine fires it on the frame the magazine runs dry — the reload-start convention), target self, two effects: Charge Damage ▲37.28% (chargeDamagePct — additive percentage points INSIDE the charge bucket, 250 → 287.28) and Charge Speed ▲15.53% (chargeSpeedPct — shortens the 60f charge cycle by (1 − cs/100) = 51f), BOTH with durationShots:2 and NO durationSec — 'for 2 shots' / 'for 2 rounds' are ROUND counts. The round-count encoding is load-bearing in an unusually sharp way: the trigger is reload-START and the reload is 161f ≈ 2.68s, so a durationSec:2 encoding would expire MID-RELOAD before a single shot benefits (silently, totally inert) — the unit test discriminates both the always-on passive AND the timed counterfactuals. As encoded, each dry-fire grants the window to exactly the first two full charges of the next magazine (~2/6 duty cycle), and the window survives the reload because a shots-only budget has no wall-clock expiry. SKILL2 'Achilles' Heel' ('Activates after firing the last bullet. Affects the target. DEF ▼ 29% for 5 sec.'): UNMODELED — see unmodeled/caveats (no enemy-DEF channel; dropped at dispatch). BURST 'Turning the Tide': block 1 — burstCast flatDamage 85.62 vs the enemy ('the 10 enemy unit(s) with the highest final ATK' collapses to the single immortal boss — multi-target selection is inert in the single-target sim, exia precedent; one hit, never ×10); the cast lands BEFORE the Full Burst window opens, so the hit is auto-exempt from the +50% FB major and crits at the caster rate (U1 rider convention). Block 2 — burstCast critRatePct 4.65 for 15s to ALL allies INCLUDING self (the kit says 'Affects all allies', never 'other allies' — no excludeSelf). GENERIC critRatePct, not critRateNormalPct: the kit says plain 'Critical Rate', with no 'of normal attacks' scoping, so it lifts every bucket (the inverse of the helm trap). burstCast-keyed, NOT fullBurstEnter: the buff is granted by HER burst skill, so it applies on her casts only — a Tier-2 discrimination the unit test pins against a second Burst II in the rotation. 15s window vs 20s CD ⇒ ~75% uptime when she casts every eligible chain. The burst's 'DEF ▼ 2.43% for 15 sec' rider is UNMODELED — same DEF basis as skill2 (see caveats). Cross-family: S2b claude-fable-5, S5/S6 claude-opus-5, S7 kimi-code/k3. Kit-autonomy gauntlet 2026-08-05.",
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Activates after firing the last bullet. Affects the target.\nDEF ▼ 29% for 5 sec. — no sim channel: the enemy-buff path admits only damageTakenPct/distributedDamagePct and the boss's DEF is the flat constant cfg.bossDef=140 that no debuff scales, so an enemy DEF▼ moves nothing (sim.ts drops it at dispatch; exia precedent). The whole sentence is skipped — an enemy-targeted lastBullet effect has no channel either."
    ],
    "burst": [
      "DEF ▼ 2.43% for 15 sec. — no sim channel: enemy DEF▼ is dropped at dispatch on the constant-bossDef basis (sim.ts 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0'); same basis as the skill2 DEF▼ line"
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "lastBullet" },
      "target": { "kind": "self" },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeDamagePct",
          "value": 37.28,
          "durationShots": 2
        },
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 15.53,
          "durationShots": 2
        }
      ]
    }
  ],
  "skill2": [],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 85.62 }]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 4.65,
          "durationSec": 15
        }
      ]
    }
  ],
  "caveats": [
    "skill1: both S1 buffs are lastBullet-keyed ROUND-COUNT windows (durationShots 2, no wall-clock expiry) — granted on the frame the magazine runs dry, they survive the 161f reload and cover exactly the first two full charges of the next magazine, then lapse right after the 2nd shot's dispatch (the Nth shot still benefits, then the buff drops at 0 — the standard round-count shape).",
    "skill1: the nearest-wrong encoding is durationSec:2 — the trigger is reload-start and the reload lasts ~2.68s, so a 2-second timed window expires MID-RELOAD and the line goes silently, totally inert (0 shots ever buffed). scripts/tests/units/eunhwa.test.ts pins the round-count shape behaviorally (duty cycle + 9-frame charge-cycle shortening + magazine-0 untouched).",
    "skill2: 'DEF ▼ 29% for 5 sec' (last-bullet target) is game-real but unenactable — the engine's enemy-buff channel admits only damageTakenPct/distributedDamagePct (sim.ts drops enemy ATK▼/DEF▼ at dispatch) and the boss's DEF contribution is the flat constant cfg.bossDef=140, which no debuff scales. Recorded verbatim in unmodeled; the nearest-wrong laundering (damageTakenPct 29) would fabricate a ~29% team lift the kit never grants, and the spec test pins its absence.",
    "burst: the 85.62% nuke is burstCast-keyed — pre-FB by engine timing (auto-exempt from the +50% FB major), crits at the caster rate, never cores, never gets the range bonus; 'the 10 enemy unit(s) with the highest final ATK' collapses to one hit on the single partless boss (multi-target selection out of domain, exia precedent).",
    "burst: 'DEF ▼ 2.43% for 15 sec' is unmodelable on the same constant-bossDef basis as skill2 (recorded verbatim in unmodeled) — in game it would be a minor multiplicative team lift at ~75% uptime; in sim domain its contribution is exactly 0.",
    "burst: the critRatePct 4.65 buff is keyed to HER burstCast (not fullBurstEnter) — with a second Burst II in the team the two keyings diverge on rotations the other B2 chains; the spec test pins application frames to her casts. Window 15s vs CD 20s ⇒ ~75% team uptime when she casts every eligible chain (the 5s gap is real, not an encoding artifact)."
  ]
}
