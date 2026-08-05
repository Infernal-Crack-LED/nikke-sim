
# S7 RECONCILING-JUDGE PACKET — unit `quiry` (Quiry)

Assembly (driver, 2026-08-04): (I) judge contract; (II) mechanics SSOT; (III) GROUND TRUTH — kit prose + base stats
(data/characters.json → characters.quiry); (IV) S2b test-faithfulness review (claude-fable-5); (V) S5 blind test
(claude-opus-5) + its result vs the driver override; (VI) S6 blind override (claude-opus-5) + diff vs driver;
(VII) driver implementation (scripts/tests/units/quiry.test.ts + src/skills/overrides/quiry.json).

---

## I. JUDGE CONTRACT (scripts/kit-autonomy/RECONCILING-JUDGE.md)

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

## II. MECHANICS SSOT

### IIa. docs/data/damage-calculation.md

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


### IIb. docs/data/game-mechanics.md

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

## III. GROUND TRUTH — quiry kit prose + base stats (data/characters.json)

```json
{
  "slug": "quiry",
  "name": "Quiry",
  "weapon": "RL",
  "class": "Supporter",
  "element": "Wind",
  "burst": "II",
  "burstCooldownSec": 60,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "hitsPerShot": 1,
  "burstGaugePerShot": 1.4,
  "skills": {
    "skill1": "■ Activates when hitting a target with Full Charge. Affects the target.\nATK ▼ 8.94% of the skill user's ATK for 3 sec.\n■ Activates when attacking with Full Charge. Affects 2 Defender ally unit(s).\nATK ▲ 5.81% of the skill user's ATK for 3 sec.",
    "skill2": "■ Activates at the start of battle. Affects 2 Defender ally unit(s).\nMax HP ▲ 11.63% continuously.",
    "burst": "■ Affects all allies.\n Recovers 6.96% of the skill user's final Max HP every 1 sec for 10 sec.\n■ Affects all Defender allies.\nCritical Rate ▲ 19.9% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 98,
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
    "resourceId": 33
  }
}
```

Driver context (facts established through the engine, for orientation — grade the ARTIFACTS, not this prose):
- quiry is RL; the engine dispatches EVERY RL shot as a full charge (sim.ts; bay precedent).
- The engine models NO enemy ATK / incoming damage: an enemy-targeted buff only takes effect for
  damageTakenPct / distributedDamagePct > 0 (sim.ts applyEffect enemy branch, commented).
- casterAtkPct resolves at APPLY time to (value/100) × caster.staticAtk (a flat ATK add); targetMaxHpPct
  resolves per target to (value/100) × target.maxHp and lands as maxHpFlat; effectiveAtk's e3 rule counts
  only OWN-kit maxHpFlat (casterIdx === self) toward atkOfMaxHpPct conversions (video-measured 2026-07-13).
- heal effects carry NO HP amount; they emit recovery events (ticks × intervalSec) that fire targets'
  'recovery' triggers. buffApply events carry expiresFrame/durationShots as null (not undefined) when absent.

---

## IV. S2b TEST-FAITHFULNESS REVIEW (model: claude-fable-5 — independent, prose-only)

```json
{
  "slug": "quiry",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "hit w/ Full Charge → ATK ▼ 8.94%",
      "disposition": "UNMODELED",
      "scope": "Full-charge hits only; the effect is an ATK reduction ON THE ENEMY (scaled by caster's ATK)",
      "durationSemantics": "3 sec wall-clock (durationSec 3) — but moot, see disposition",
      "triggerIdentity": "on-HIT with full charge (per landed full-charge shot)",
      "targetSet": "the target (enemy/boss)",
      "nearestWrongModel": "Encoding it as an ally/self ATK buff (misreading ▼ target), or inventing an enemy-ATK stat that leaks into a damage bucket (e.g. mis-mapping to damageTakenPct, which would over-credit the whole team)",
      "distinguishingAssertion": "With quiry patched in, NO buffApply carries a stat/value pair derived from 8.94% (flat ≈ 0.0894×98367 ≈ 8794) at any point, and totals(res) for every unit are identical with the line present vs stripped via withPatchedOverride — the line must appear only in unmodeled.skill1",
      "inertness": "Everything — v1 boss deals no damage and the schema has no enemy-ATK stat; this line must move zero damage and emit zero buffApply events. Any movement means it was mis-mapped (most dangerously to damageTakenPct).",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "atk w/ Full Charge → 2 Defender ATK ▲",
      "disposition": "FAITHFUL",
      "scope": "Fires per full-charge attack (on-ATTACK, not on-hit — sibling line says 'hitting', this says 'attacking'); RL with chargeFrames 60 full-charges every pull, so encoding = per trigger pull",
      "durationSemantics": "3 sec wall-clock (durationSec 3, no 'round(s)' wording). CRITICAL: quiry's shot cycle is ~1.37s (60f charge + 22f release) so uptime is continuous while firing, but reload (141f ≈ 2.35s) + next charge ≈ 3.7s between last shot of a magazine and first apply of the next — the buff genuinely LAPSES ~0.7s per magazine",
      "triggerIdentity": "shotFired (every pull = full charge on this RL); no fbGate, no everyN",
      "targetSet": "2 Defender-class allies — alliesOfClass cls:'Defender' (never self: quiry is a Supporter; never non-Defenders)",
      "nearestWrongModel": "A passive/permanent encoding (buff applied once at t=0, never lapsing across reloads), OR stat atkPct 5.81 (scaling the TARGET's own ATK) instead of casterAtkPct (flat 5.81% of QUIRY's ATK), OR target 'allies' unscoped",
      "distinguishingAssertion": "Filter buffApply for stat 'casterAtkPct' with flat value ≈ 0.0581×98367 ≈ 5715 (Supporter static ATK — NOT the raw 5.81): one apply per quiry shot event with expiresFrame − applyFrame = 180; targetSlug is the Defender (crown in the control fixture) and NEVER liter/helm/self; and there exists a window during each reload where no instance is active (expiresFrame of the magazine's last apply < applyFrame of the next). RED under passive (single apply, frame 0), RED under atkPct (value 5.81, target-scaled), RED under unscoped allies",
      "inertness": "Non-Defender allies' effectiveAtk must not move; quiry's own damage must not move (she is not a Defender); no applies during reload gaps",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "start of battle → Max HP ▲ 11.63%",
      "disposition": "FAITHFUL",
      "scope": "Unconditional stat grant, no attack-type scoping",
      "durationSemantics": "'continuously' = permanent (no durationSec)",
      "triggerIdentity": "passive (active from frame 0; 'Activates at the start of battle' = setup-time, not an event trigger)",
      "targetSet": "2 Defender-class allies (alliesOfClass 'Defender'); NOT self, NOT all allies",
      "nearestWrongModel": "casterMaxHpPct (% of QUIRY's Max HP granted to targets) instead of targetMaxHpPct (% of each TARGET's OWN Max HP) — 'Max HP ▲ X%' with no 'of the skill user' clause is target-own per the blanc/maiden precedent; or dropping the line entirely as 'defensive, inert'",
      "distinguishingAssertion": "At frame 0 a buffApply with stat 'maxHpFlat' lands on the Defender ally with value = 0.1163 × THAT TARGET's static maxHp (crown's, not quiry's — the two differ, which is exactly what separates targetMaxHpPct from casterMaxHpPct); no such apply on non-Defenders. AND totals(res) for every unit are identical with vs without the block (ally-granted Max HP does not feed a teammate's atkOfMaxHpPct per the e3 rule) — the buff must EXIST yet move zero damage",
      "inertness": "All damage totals (offensively inert at scope — but the block must still be present as a future-consumer stat grant, taxonomy #7; deleting it is a FIX-tier omission, not a free skip)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Recovers 6.96% ... every 1 sec for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Heal-over-time; magnitude (% of skill user's final Max HP) is display-only — the engine models no HP amounts on 'heal' — but the EVENT CADENCE is load-bearing",
      "durationSemantics": "10 ticks at 1s intervals — heal effect with ticks:10, intervalSec:1; NOT a single instant heal, NOT durationSec on a buff",
      "triggerIdentity": "burstCast (no activation clause in a burst block = fires when QUIRY casts her burst; NOT fullBurstEnter — quiry is Burst II and the control fixture already contains another B2 (crown), so the two encodings genuinely diverge: fullBurstEnter would fire her heal on rotations CROWN bursts)",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "TANDEM TRAP: ticks:1 default (one instant recovery event) instead of ticks:10 — crown's 'when recovery takes effect' consumers then fire once per burst instead of being re-fed for 10s; second misread: keying to fullBurstEnter, over-firing on crown's rotations",
      "distinguishingAssertion": "On a rotation where quiry casts (burstCast event with her srcSlot), each ally receives 10 recovery events spaced ~60 frames apart, and crown's recovery-triggered buffApply chain refreshes across the full 10s window (multiple applies, not one). On a rotation where crown takes B2 instead, quiry emits ZERO recovery events. RED under ticks:1 (single event per cast) and RED under fullBurstEnter (events on crown's rotations)",
      "inertness": "Rotations where quiry does not burst; no direct damage from the heal itself (heal carries no damage)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Defender allies Crit Rate ▲ 19.9% 10s",
      "disposition": "FAITHFUL",
      "scope": "Unscoped Critical Rate (generic critRatePct — no 'of normal attacks' clause, so critRateNormalPct would be an over-narrowing)",
      "durationSemantics": "10 sec wall-clock (durationSec 10; expiresFrame − applyFrame = 600)",
      "triggerIdentity": "burstCast (same reasoning as the heal line — fires only on quiry's own casts; with crown co-B2 in the fixture, fullBurstEnter is the divergent over-crediting misread)",
      "targetSet": "all Defender-class allies (alliesOfClass 'Defender') — NOT all allies, NOT self",
      "nearestWrongModel": "Target 'allies' unscoped (hands the carry B3 +19.9% crit — a large over-credit on the focus unit), or fullBurstEnter (crit uptime on every FB regardless of who bursts)",
      "distinguishingAssertion": "buffApply stat 'critRatePct' value 19.9, durationSec-derived expiry of 600 frames, targetSlug ∈ Defenders only (crown), emitted only on frames where quiry's burstCast fired; the carry B3 and liter NEVER receive it, and no apply occurs on rotations quiry sat out. RED under unscoped-allies (carry receives it → carry damage moves) and RED under fullBurstEnter (applies on crown's rotations)",
      "inertness": "Non-Defender crit rates and damage — in particular the focus carry's damage events must show unchanged crit rate whether this block is present or stripped",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:full-charge → 2 Defender casterAtkPct 5.81 / 3s",
    "skill2:passive → 2 Defender targetMaxHpPct 11.63 continuous",
    "burst:burstCast → all-allies heal ticks:10 intervalSec:1",
    "burst:burstCast → Defender critRatePct 19.9 / 10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "ATK ▼ 8.94% of the skill user's ATK for 3 sec. (enemy ATK debuff — defensive; boss deals no damage in v1 and the schema has no enemy-ATK stat)"
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Three places I expect a shared-prior misread. (1) VACUOUS-GREEN FIXTURE RISK: quiry is Burst II and controlComp already fixes crown at B2 — first-ready in-window selection means one of them may never cast, so every burstCast-keyed test could pass vacuously (zero events asserted-present would fail, but inertness-style tests would 'pass') or the driver may have silently swapped the fixture. The tests MUST first assert quiry actually emits burstCast events in the comp used, and the burstCast-vs-fullBurstEnter distinction is only exercised if BOTH B2s get rotations — verify the fixture produces at least one rotation for each. (2) TARGET-COUNT GAP: the schema's alliesOfClass has NO count field, so '2 Defender ally unit(s)' cannot be capped at 2 — inert in the control fixture (exactly one Defender, crown) but a real divergence on any 3-Defender team; the review expects this recorded as a caveat/GAP note, not silently ignored. (3) FLAT-RESOLUTION ASSERTIONS: both caster-scaled values are emitted flat (casterAtkPct → 0.0581×98367 ≈ 5715 flat ATK; targetMaxHpPct → 'maxHpFlat' = 0.1163×TARGET's static maxHp) — a test asserting the raw 5.81/11.63 on the buffApply value is asserting the WRONG model and would go green under a mis-encoded atkPct. Also: no buffRemove fires on timed expiry, so the S1 reload-lapse assertion must be written off expiresFrame arithmetic, not paired remove events; and the S1 pair's 'hitting' (on-hit, enemy) vs 'attacking' (on-attack, allies) wording difference is real in prose but collapses to the same per-shot cadence in-sim (no miss model for RL body shots) — the ally line must not inherit any hit/core gate (no requiresCore).",
  "model": "claude-fable-5"
}

```

---

## V. S5 BLIND TEST (model: claude-opus-5, written from prose alone) + RESULT VS DRIVER OVERRIDE

### V.1 Run results (driver-executed, deterministic)

- PRISTINE (blind/quiry.test.ts, UNMODIFIED): 5 passed / 13 failed / 3 skipped — ALL 13 reds trace to ONE
  blind-side wiring bug: the onEvent sink was attached to a top-level comp key and only copied into cfg when
  the comp exposed a cfg key (controlComp does not), so the event log stayed empty. Totals-based assertions
  still ran (and the S1/S2 inertness/totals ones passed).
- ADAPTED (blind/quiry.adapted.test.ts — the SAME file with exactly ONE mechanical correction: wire
  opts.cfg.onEvent unconditionally; assertion intent unchanged): 11 passed / 7 failed / 3 skipped.
  Classification of the 7 reds (driver analysis, judge may re-derive):
  1. 'lasts 3 wall-clock seconds' — checks b.durationShots === undefined; the engine emits durationShots:null
     (= 'no round budget', the very semantics asserted). NULL-VS-UNDEFINED blind-side type artifact.
  2. 'is continuous' — checks expiresFrame === undefined || > 10000; engine emits expiresFrame:null
     (= no wall-clock expiry). NULL-VS-UNDEFINED blind-side type artifact.
  3-7. The ENTIRE burst group (ticks:10 / allies-target / casts-at-all / Defender-only / 10s-window):
     quiry casts 0× in the blind's controlComp fixture (liter/crown/quiry/helm) — crown (B2, cd 20) wins
     every stage-II slot over quiry (B2, cd 60 in synced data). Empirically probed: burstCasts 0, zero
     critRatePct applications. The blind test's OWN non-vacuity guard ('casts at all in this fixture') flags
     exactly this. The burst lines are independently pinned by the driver test Q3/Q4 (fixture where quiry is
     the SOLE B2 → 4 casts, every assertion green) and by the S6 override convergence below.
- 0 REAL-GOTCHA surfaced by the blind test.

### V.2 The pristine blind test source

```typescript
/**
 * quiry (Quiry) — RL / Wind / Supporter / Burst II — kit spec test (written BLIND from kit prose).
 *
 * KIT (ground truth, structural summary):
 *   skill1 [a] on HITTING a target with Full Charge -> the target: ATK down 8.94% of the skill user ATK, 3 sec
 *   skill1 [b] on ATTACKING with Full Charge -> 2 Defender allies: ATK up 5.81% of the skill user ATK, 3 sec
 *   skill2     at the start of battle -> 2 Defender allies: Max HP up 11.63% continuously
 *   burst  [a] all allies: recovers 6.96% of the skill user final Max HP every 1 sec for 10 sec
 *   burst  [b] all Defender allies: Critical Rate up 19.9% for 10 sec
 *
 * FIXTURE — controlComp('quiry', true) = liter (B1) / crown (B2) / quiry (carry) / helm (B3).
 *   - quiry is Burst II and the fixture already carries a competing B2 (crown); the burst group
 *     asserts she casts 1..5 times over 180 s, which IS the non-vacuity check for both burst lines.
 *   - crown is the only Defender in the comp; liter / helm / quiry are the non-Defender bystanders.
 *     Every 'Defender ally' line therefore has one live target and three inert witnesses, which makes
 *     class-scoping falsifiable — but leaves the kit's '2 ... unit(s)' CAP unexercised (see gaps).
 *   - crown is also the fixture's on-recovery consumer, the ONLY observable channel for the burst
 *     heal: the event log has no heal/recovery kind, so the HoT is read through its consumer.
 *
 * METHOD — quiry-sourced buff events are isolated by DIFFING the event tally against a run with the
 * relevant slot emptied, instead of guessing her caster index; that survives any slot ordering.
 * Every counterfactual is built with withPatchedOverride (committed JSON untouched) and reports how
 * many blocks/effects it actually matched, asserted non-zero in the fixture-sanity test — a patch
 * that matched nothing would make its test vacuously green.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js' // path fixed 2026-08-04 (driver, mechanical): blind/ sits under kit-autonomy/, not tests/units/ — no assertion changed;

// ------------------------------------------------------------------ shapes

interface BuffEv {
  kind: 'buffApply';
  stat: string;
  key: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug: string;
  expiresFrame?: number;
  durationShots?: number;
}

type LooseEffect = {
  kind?: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  ticks?: number;
  intervalSec?: number;
};
type LooseBlock = {
  trigger?: { kind?: string };
  target?: { kind?: string; cls?: string; count?: number; excludeSelf?: boolean };
  effects?: LooseEffect[];
};
type LooseOverride = Record<string, unknown>;
type Slot = 'skill1' | 'skill2' | 'burst';

// The override FILE is slot-keyed; read it shape-agnostically (Block[] directly, or a slot object
// carrying its own blocks[]) so a wrong guess about the slot container cannot silently no-op a patch.
const slotBlocks = (ov: LooseOverride, slot: Slot): LooseBlock[] => {
  const s = ov[slot];
  if (Array.isArray(s)) return s as LooseBlock[];
  if (s && typeof s === 'object' && Array.isArray((s as { blocks?: unknown }).blocks)) {
    return (s as { blocks: LooseBlock[] }).blocks;
  }
  return [];
};

const setSlotBlocks = (ov: LooseOverride, slot: Slot, blocks: LooseBlock[]): void => {
  const s = ov[slot];
  if (s && !Array.isArray(s) && typeof s === 'object' && Array.isArray((s as { blocks?: unknown }).blocks)) {
    (s as { blocks: LooseBlock[] }).blocks = blocks;
    return;
  }
  ov[slot] = blocks;
};

// ------------------------------------------------------------------ event helpers

const buffsOf = (events: SimEvent[]): BuffEv[] =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];

// ally-facing applications only (boss-held debuffs carry casterIdx === null AND targetIdx === null)
const allyBuffs = (events: SimEvent[]): BuffEv[] =>
  buffsOf(events).filter((b) => b.targetIdx !== null);

const bossDebuffs = (events: SimEvent[]): BuffEv[] =>
  buffsOf(events).filter((b) => b.casterIdx === null && b.targetIdx === null);

const evKey = (b: BuffEv): string => `${b.stat}|${b.targetSlug}|${b.value}`;

type Tally = Map<string, { n: number; ev: BuffEv }>;

const tally = (bs: BuffEv[]): Tally => {
  const m: Tally = new Map();
  for (const b of bs) {
    const k = evKey(b);
    const cur = m.get(k);
    if (cur) cur.n += 1;
    else m.set(k, { n: 1, ev: b });
  }
  return m;
};

// keys whose count is HIGHER in `a` than in `b` — i.e. the applications the patched-out slot sourced
const onlyIn = (a: Tally, b: Tally): Tally => {
  const out: Tally = new Map();
  for (const [k, v] of a) {
    const d = v.n - (b.get(k)?.n ?? 0);
    if (d > 0) out.set(k, { n: d, ev: v.ev });
  }
  return out;
};

const dmg = (t: Record<string, number>, slug: string): number => t[slug] ?? 0;

const minExpiry = (bs: BuffEv[]): number =>
  bs.reduce(
    (acc, b) => Math.min(acc, b.expiresFrame ?? Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY,
  );

// ------------------------------------------------------------------ runner

const runQuiry = (overrides?: Record<string, unknown>) => {
  const events: SimEvent[] = [];
  const sink = (ev: SimEvent): void => {
    events.push(ev);
  };
  const src = controlComp('quiry', true) as unknown as Record<string, unknown>;
  const opts: Record<string, unknown> = { ...src, onEvent: sink };
  if (overrides) {
    opts.overrides = { ...((src.overrides as Record<string, unknown>) ?? {}), ...overrides };
  }
  // wire the sink to a nested cfg too when controlComp exposes one, so capture cannot silently no-op
  const cfg = src.cfg;
  if (cfg && typeof cfg === 'object') opts.cfg = { ...(cfg as object), onEvent: sink };
  const res = runComp(opts as Parameters<typeof runComp>[0]);
  return { res, events, tot: totals(res) };
};

const patch = (mutate: (ov: LooseOverride) => number) => {
  let hits = 0;
  const ov = withPatchedOverride('quiry', (o) => {
    hits = mutate(o as unknown as LooseOverride);
  });
  return { overrides: { quiry: ov }, hits };
};

// ------------------------------------------------------------------ effect predicates (override layer)

const isAtkGrant = (e: LooseEffect): boolean =>
  e.kind === 'buff' &&
  (e.stat === 'casterAtkPct' || e.stat === 'atkPct' || e.stat === 'highestAllyAtkPct') &&
  (e.value ?? 0) > 0;
const isMaxHpGrant = (e: LooseEffect): boolean =>
  e.kind === 'buff' && typeof e.stat === 'string' && /MaxHpPct$/i.test(e.stat);
const isCritGrant = (e: LooseEffect): boolean =>
  e.kind === 'buff' && (e.stat === 'critRatePct' || e.stat === 'critRateNormalPct');
const isHeal = (e: LooseEffect): boolean => e.kind === 'heal';

// ------------------------------------------------------------------ hoisted runs (10 x 180 s sims)

const DEFENDER = 'crown';
const NON_DEFENDERS = ['liter', 'helm', 'quiry'];

const base = runQuiry();

const s1EmptyPatch = patch((ov) => {
  const n = slotBlocks(ov, 'skill1').length;
  setSlotBlocks(ov, 'skill1', []);
  return n;
});
const s1Empty = runQuiry(s1EmptyPatch.overrides);

const s1AlliesPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'skill1')) {
    if ((b.effects ?? []).some(isAtkGrant)) {
      b.target = { kind: 'allies' };
      n += 1;
    }
  }
  return n;
});
const s1Allies = runQuiry(s1AlliesPatch.overrides);

const s1Dur10Patch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'skill1')) {
    for (const e of b.effects ?? []) {
      if (isAtkGrant(e)) {
        e.durationSec = 10;
        n += 1;
      }
    }
  }
  return n;
});
const s1Dur10 = runQuiry(s1Dur10Patch.overrides);

const s2EmptyPatch = patch((ov) => {
  const n = slotBlocks(ov, 'skill2').length;
  setSlotBlocks(ov, 'skill2', []);
  return n;
});
const s2Empty = runQuiry(s2EmptyPatch.overrides);

const s2CasterPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'skill2')) {
    for (const e of b.effects ?? []) {
      if (isMaxHpGrant(e)) {
        e.stat = 'casterMaxHpPct';
        n += 1;
      }
    }
  }
  return n;
});
const s2Caster = runQuiry(s2CasterPatch.overrides);

const healTick1Patch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (isHeal(e)) {
        e.ticks = 1;
        n += 1;
      }
    }
  }
  return n;
});
const healTick1 = runQuiry(healTick1Patch.overrides);

const healSelfPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'burst')) {
    const fx = b.effects ?? [];
    if (fx.some(isHeal) && !fx.some(isCritGrant)) {
      b.target = { kind: 'self' };
      n += 1;
    }
  }
  return n;
});
const healSelf = runQuiry(healSelfPatch.overrides);

const critAlliesPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'burst')) {
    const fx = b.effects ?? [];
    if (fx.some(isCritGrant) && !fx.some(isHeal)) {
      b.target = { kind: 'allies' };
      n += 1;
    }
  }
  return n;
});
const critAllies = runQuiry(critAlliesPatch.overrides);

const crit5sPatch = patch((ov) => {
  let n = 0;
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (isCritGrant(e)) {
        e.durationSec = 5;
        n += 1;
      }
    }
  }
  return n;
});
const crit5s = runQuiry(crit5sPatch.overrides);

// ------------------------------------------------------------------ derived isolations

const baseTally = tally(allyBuffs(base.events));
const s1QuiryOnly = onlyIn(baseTally, tally(allyBuffs(s1Empty.events)));
const s2QuiryOnly = onlyIn(baseTally, tally(allyBuffs(s2Empty.events)));

// the per-full-charge ATK grant is the only quiry-sourced key applied dozens of times
const s1GrantHit = [...s1QuiryOnly.values()].find((v) => v.n > 10);
const s1GrantEv = s1GrantHit ? s1GrantHit.ev : undefined;
const s2GrantHit = [...s2QuiryOnly.values()].find((v) => v.ev.stat === 'maxHpFlat');

const CRIT_VALUE = 19.9;
const critEvents = allyBuffs(base.events).filter(
  (b) => b.stat === 'critRatePct' && b.value === CRIT_VALUE,
);

describe('quiry — fixture sanity', () => {
  it('runs the intended comp and every counterfactual matched a real block', () => {
    expect(base.events.length).toBeGreaterThan(0);
    expect(unitOf(base.res, 'quiry').totalDamage).toBeGreaterThan(0);
    expect(dmg(base.tot, DEFENDER)).toBeGreaterThan(0);
    // if any of these is 0 the corresponding patch is a no-op and its test would be vacuous
    expect(s1EmptyPatch.hits).toBeGreaterThan(0);
    expect(s1AlliesPatch.hits).toBeGreaterThan(0);
    expect(s1Dur10Patch.hits).toBeGreaterThan(0);
    expect(s2EmptyPatch.hits).toBeGreaterThan(0);
    expect(s2CasterPatch.hits).toBeGreaterThan(0);
    expect(healTick1Patch.hits).toBeGreaterThan(0);
    expect(healSelfPatch.hits).toBeGreaterThan(0);
    expect(critAlliesPatch.hits).toBeGreaterThan(0);
    expect(crit5sPatch.hits).toBeGreaterThan(0);
  });
});

describe('quiry skill1 — ATK up 5.81% of the skill user ATK to Defender allies for 3 sec, per Full Charge', () => {
  it('is caster-scaled (flat ATK), not a target-own-ATK percentage', () => {
    // casterAtkPct re-emits as a FLAT ATK number; an atkPct model would emit the raw 5.81 instead
    expect(s1GrantEv?.stat).toBe('casterAtkPct');
    expect(s1GrantEv?.value ?? 0).toBeGreaterThan(100);
  });

  it('fires once per full-charge shot, not once per burst / full burst / battle', () => {
    // quiry cycles 6 charge shots (60f charge + release latency) then a 141f reload -> ~100 shots/180 s.
    // passive => 1 application; burstCast => ~3; fullBurstEnter => ~12. Only a per-shot trigger clears 50.
    expect(s1GrantHit?.n ?? 0).toBeGreaterThanOrEqual(50);
  });

  it('reaches the Defender ally only — no non-Defender receives it (nearest-wrong: target allies)', () => {
    const touchedBase = new Set(
      [...s1QuiryOnly.values()]
        .filter((v) => v.ev.stat === 'casterAtkPct')
        .map((v) => v.ev.targetSlug),
    );
    expect([...touchedBase]).toEqual([DEFENDER]);

    const alliesOnly = onlyIn(tally(allyBuffs(s1Allies.events)), tally(allyBuffs(s1Empty.events)));
    const touchedWrong = new Set(
      [...alliesOnly.values()]
        .filter((v) => v.ev.stat === 'casterAtkPct')
        .map((v) => v.ev.targetSlug),
    );
    // the nearest-wrong model sprays the same grant across the whole team
    expect(touchedWrong.size).toBeGreaterThan(1);
    expect(dmg(s1Allies.tot, 'helm')).toBeGreaterThan(dmg(base.tot, 'helm'));
  });

  it('lasts 3 wall-clock seconds — not N rounds, not the 10 s burst window', () => {
    const stat = s1GrantEv?.stat ?? '';
    const value = s1GrantEv?.value ?? -1;
    const pick = (evs: SimEvent[]): BuffEv[] =>
      allyBuffs(evs).filter((b) => b.stat === stat && b.value === value);

    expect(pick(base.events).every((b) => b.durationShots === undefined)).toBe(true);
    // first full charge lands ~f82 (60f charge + 22f release latency) -> 3 s expires ~f262;
    // a 5 s model expires >= f382, a 10 s model ~f682.
    const first = minExpiry(pick(base.events));
    expect(first).toBeGreaterThan(100);
    expect(first).toBeLessThan(340);
    // sensitivity: the same reading moves by exactly the duration delta under the wrong model
    expect(minExpiry(pick(s1Dur10.events))).toBeGreaterThan(first + 350);
  });

  it('actually moves the Defender ally damage (non-vacuity for the whole slot)', () => {
    expect(dmg(base.tot, DEFENDER)).toBeGreaterThan(dmg(s1Empty.tot, DEFENDER));
  });
});

describe('quiry skill1 — ATK down 8.94% on the target (defensive; inert at scope lock)', () => {
  it('never leaks onto an ally — no quiry-sourced negative buff exists', () => {
    expect([...s1QuiryOnly.values()].every((v) => v.ev.value > 0)).toBe(true);

    // the debuff magnitude shares the caster-ATK basis with the 5.81% grant, so it is computable
    const atkFlat = s1GrantEv?.value ?? 0;
    expect(atkFlat).toBeGreaterThan(0);
    const debuffFlat = (atkFlat / 5.81) * 8.94;
    const leaked = allyBuffs(base.events).some(
      (b) => Math.abs(Math.abs(b.value) - debuffFlat) < 1,
    );
    expect(leaked).toBe(false);
  });

  it('is not smuggled in as a boss-held Damage Taken debuff', () => {
    // an enemy ATK down is defensive; re-encoding it as damageTakenPct would credit the whole team
    const withS1 = [...tally(bossDebuffs(base.events)).entries()].map(([k, v]) => `${k}x${v.n}`).sort();
    const withoutS1 = [...tally(bossDebuffs(s1Empty.events)).entries()].map(([k, v]) => `${k}x${v.n}`).sort();
    expect(withS1).toEqual(withoutS1);
  });
});

describe('quiry skill2 — Max HP up 11.63% to Defender allies, continuously from battle start', () => {
  it('applies once at battle start (passive), to the Defender ally only', () => {
    expect(s2GrantHit).toBeDefined();
    expect(s2GrantHit?.ev.targetSlug).toBe(DEFENDER);
    // a per-shot / per-burst trigger identity would re-apply dozens of times
    expect(s2GrantHit?.n ?? 0).toBeLessThanOrEqual(5);
    expect(s2GrantHit?.n ?? 0).toBeGreaterThanOrEqual(1);
    const targets = new Set([...s2QuiryOnly.values()].map((v) => v.ev.targetSlug));
    for (const slug of NON_DEFENDERS) expect(targets.has(slug)).toBe(false);
  });

  it('is continuous — no time expiry and no round count', () => {
    expect(s2GrantHit?.ev.durationShots).toBeUndefined();
    const exp = s2GrantHit?.ev.expiresFrame;
    expect(exp === undefined || exp > 10_000).toBe(true);
  });

  it('scales off the TARGET own Max HP, not the skill user Max HP', () => {
    // kit says a bare 'Max HP up 11.63%' (targetMaxHpPct); the nearest-wrong reads it as
    // 'x% of the skill user Max HP' (casterMaxHpPct). crown (Defender) and quiry (Supporter) have
    // different Max HP, so the emitted flat maxHpFlat differs between the two bases.
    const patchedHit = [...onlyIn(tally(allyBuffs(s2Caster.events)), tally(allyBuffs(s2Empty.events))).values()].find(
      (v) => v.ev.stat === 'maxHpFlat',
    );
    expect(s2GrantHit?.ev.value ?? 0).toBeGreaterThan(0);
    expect(patchedHit?.ev.value ?? 0).toBeGreaterThan(0);
    expect(s2GrantHit?.ev.value).not.toBe(patchedHit?.ev.value);
  });

  it('moves no damage — ally-granted Max HP feeds no ATK conversion in this comp', () => {
    expect(s2Empty.tot).toEqual(base.tot);
  });
});

describe('quiry burst — recovers 6.96% of final Max HP every 1 sec for 10 sec, all allies', () => {
  it('is a ten-tick heal-over-time, not one instant heal', () => {
    // no heal/recovery event kind exists; the HoT is read through crown, the fixture on-recovery
    // consumer. ticks:10 refreshes her recovery-triggered buff ~10x per cast, ticks:1 exactly once.
    expect(base.events.length).toBeGreaterThan(healTick1.events.length);
    expect(buffsOf(base.events).length).toBeGreaterThan(buffsOf(healTick1.events).length);
  });

  it('targets allies, not just the skill user', () => {
    expect(buffsOf(base.events).length).toBeGreaterThan(buffsOf(healSelf.events).length);
  });

  it.skip('all-allies scope INCLUDING self is unobservable: the event log has no heal/recovery kind, and only crown carries an on-recovery trigger in this fixture — liter / helm / quiry receipt cannot be discriminated', () => {
    expect(true).toBe(true);
  });
});

describe('quiry burst — Critical Rate up 19.9% to all Defender allies for 10 sec', () => {
  it('casts at all in this fixture (non-vacuity: quiry is a Burst II competing with crown)', () => {
    // 60 s cooldown over a 180 s fight bounds her casts at 3; allow slack for chain timing
    expect(critEvents.length).toBeGreaterThanOrEqual(1);
    expect(critEvents.length).toBeLessThanOrEqual(5);
  });

  it('is UNSCOPED Critical Rate at the kit magnitude, not the normal-attack-scoped stat', () => {
    // the kit line says plain Critical Rate; critRateNormalPct would under-credit skill/burst crit
    expect(critEvents.every((b) => b.stat === 'critRatePct')).toBe(true);
    expect(critEvents.every((b) => b.value === CRIT_VALUE)).toBe(true);
    const normalScoped = allyBuffs(base.events).filter(
      (b) => b.stat === 'critRateNormalPct' && b.value === CRIT_VALUE,
    );
    expect(normalScoped).toHaveLength(0);
  });

  it('lands on Defender allies only (nearest-wrong: all allies)', () => {
    expect([...new Set(critEvents.map((b) => b.targetSlug))]).toEqual([DEFENDER]);
    // the wrong target set hands the same crit to the fixture attackers
    expect(dmg(critAllies.tot, 'helm')).toBeGreaterThan(dmg(base.tot, 'helm'));
    expect(dmg(critAllies.tot, 'liter')).toBeGreaterThan(dmg(base.tot, 'liter'));
  });

  it('runs the full 10 sec window (nearest-wrong: 5 sec)', () => {
    // the cast lands just before Full Burst, so a 10 s window covers the whole FB and a 5 s one
    // covers half of it — crown loses crit uptime under the short model
    expect(dmg(base.tot, DEFENDER)).toBeGreaterThan(dmg(crit5s.tot, DEFENDER));
  });
});

describe('quiry — schema gaps', () => {
  it.skip('the kit caps skill1 and skill2 at 2 Defender ally unit(s), but the TargetDef alliesOfClass carries no count field — the cap is inexpressible, and this fixture holds a single Defender (crown) so it is also unexercised. With 3+ Defenders the model would over-apply both lines', () => {
    expect(true).toBe(true);
  });

  it.skip('the skill1 ATK down on the target is unobservable in v1: resolveTargets({kind:enemy}) returns no entity and the boss deals no damage, so only its INERTNESS (asserted above) is testable, never its magnitude or its 3 sec window', () => {
    expect(true).toBe(true);
  });
});

```

---

## VI. S6 BLIND OVERRIDE (model: claude-opus-5, written from prose alone) + DIFF VS DRIVER

### VI.1 Diff vs the driver override (driver-prepared, judge may re-derive from the two JSONs)

| line | driver | S6 blind | delta |
|---|---|---|---|
| S1 ally ATK grant | chargeCounter count:1 countInFb:1 → alliesOfClass Defender → casterAtkPct 5.81 durationSec:3 | shotFired → alliesOfClass Defender → casterAtkPct 5.81 durationSec:3 | TRIGGER ONLY: chargeCounter:1 vs shotFired — observationally IDENTICAL on an RL (every pull is a full charge; the engine advances chargeCounter only on charged shots). The blind author flagged it ('⚑ trigger proxy', believing no full-charge trigger kind exists). The driver's chargeCounter preserves the 'with Full Charge' identity if an uncharged-RL path ever appears. NOT a faithfulness divergence at scope. |
| S1 enemy ATK▼ | unmodeled verbatim (no enemy-ATK model; inert) | unmodeled verbatim (same reasoning; 'NOT a Damage Taken ▲ line') | identical disposition |
| S2 Max HP grant | passive → alliesOfClass Defender → targetMaxHpPct 11.63 (no duration) | identical | identical |
| Burst HoT | burstCast → allies → heal ticks:10 intervalSec:1; magnitude in unmodeled | burstCast → allies → heal ticks:10 intervalSec:1; magnitude noted | identical |
| Burst crit grant | burstCast → alliesOfClass Defender → critRatePct 19.9 durationSec:10 | identical | identical |
| count-2 cap | ⚑ (alliesOfClass has no count field) | ⚑ (same) | identical |

### VI.2 The blind override

```json
{
  "slug": "quiry",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "alliesOfClass",
        "cls": "Defender"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 5.81,
          "durationSec": 3
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesOfClass",
        "cls": "Defender"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 11.63
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfClass",
        "cls": "Defender"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 19.9,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "■ Activates when hitting a target with Full Charge. Affects the target. ATK ▼ 8.94% of the skill user's ATK for 3 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ skill1 ally buff is keyed to `shotFired` as a proxy for \"attacking with Full Charge\": quiry is a charge RL (chargeFrames 60) and the sim's charge model is assumed to full-charge every pull, so every trigger pull is a Full Charge attack. If any pull can be uncharged, this OVER-fires.",
    "⚑ \"Affects 2 Defender ally unit(s)\" — the schema's `alliesOfClass` carries no `count`, so both the skill1 ATK grant and the skill2 Max HP grant hit ALL Defender allies. Equivalent for teams with ≤2 Defenders; OVER-CREDITS a 3+-Defender team. Selection order among Defenders is also unspecified by the kit.",
    "⚑ Uptime of the 3 sec ally ATK buff is set by the datamined cadence tuple (ammo 6, chargeFrames 60, reloadFrames 141). At those values the 3 sec window is refreshed every full charge and outlasts the ~2.35 s reload, i.e. ~100% uptime — the buff's real value is therefore highly sensitive to a cadence datamine error.",
    "The skill1 ATK ▼ line is an ENEMY debuff (target = the hit target). The sim has no enemy entity and the boss deals no modeled damage at scope lock, so it is recorded unmodeled rather than authored as a no-op enemy-targeted block. It is NOT a Damage Taken ▲ line and carries no team damage benefit.",
    "The burst heal is authored for its TANDEM value only (no HP pool is modeled): 10 `recovery` events to all allies, which keep on-recovery consumers (e.g. crown) refreshed across the 10 s window.",
    "skill2 Max HP is an ALLY grant, so per the e3 scope rule it does NOT feed a teammate's atkOfMaxHpPct conversion — kept for kit completeness / future consumers.",
    "Both skill1 lines share one activation event but differ in wording — \"hitting a target\" (the debuff, requires a landed hit) vs \"attacking\" (the ally buff, fires on the attack). Only the ally buff is modeled, so the hit/attack distinction is currently unobservable."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. quiry (RL/Wind/Supporter/Burst II) is a pure Defender-focused support with NO damage lines in any slot: S1 grants Defender allies ATK ▲5.81% of quiry's ATK for 3 s per Full Charge attack (near-permanent uptime at the datamined cadence) and debuffs the target's ATK (unmodeled — enemy-scoped, defensive); S2 is a start-of-battle continuous Max HP ▲11.63% to Defender allies; burst is a 10-tick team heal-over-time plus Critical Rate ▲19.9% to all Defender allies for 10 s. All offensive value routes through Defender-class allies, so this unit is inert on a comp with no Defenders."
}
```

S6 audit/flags (verbatim):

```json
{
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates when hitting w/ Full Charge",
      "status": "IMPLEMENTED",
      "effectOrReason": "Read as the activation clause for both S1 branches; modeled via trigger {kind:'shotFired'} on the ally-buff block (charge-RL: every pull assumed a Full Charge). ⚑ trigger proxy."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▼ 8.94% of user's ATK, 3 sec",
      "status": "SKIPPED",
      "effectOrReason": "Enemy-targeted ATK debuff (\"Affects the target\"). resolveTargets({kind:'enemy'}) returns [] and the boss's ATK is not modeled (boss damage is out of scope), so it is purely defensive at scope lock. Recorded verbatim in unmodeled.skill1 — NOT a Damage Taken ▲ line, so it carries no team damage benefit."
    },
    {
      "slot": "skill1",
      "kitLine": "Affects 2 Defender ally unit(s)",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'alliesOfClass', cls:'Defender'}. ⚑ the count-2 cap is not expressible (alliesOfClass has no count field); quiry is a Supporter so self-inclusion is a non-issue."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 5.81% of user's ATK, 3 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff {stat:'casterAtkPct', value:5.81, durationSec:3} — \"of the skill user's ATK\" = flat add scaled off quiry's ATK, not the target's."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates at the start of battle",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'passive'} — start-of-battle + \"continuously\" = an always-on passive, no durationSec."
    },
    {
      "slot": "skill2",
      "kitLine": "Affects 2 Defender ally unit(s)",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'alliesOfClass', cls:'Defender'}; same ⚑ count-2 limitation as skill1."
    },
    {
      "slot": "skill2",
      "kitLine": "Max HP ▲ 11.63% continuously",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff {stat:'targetMaxHpPct', value:11.63} (plain \"Max HP ▲ X%\" = % of the TARGET's own Max HP). Ally-granted, so it does not feed a teammate's atkOfMaxHpPct — kept per the never-skip-HP/DEF rule."
    },
    {
      "slot": "burst",
      "kitLine": "Affects all allies",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'allies'} (no excludeSelf — \"all allies\" includes quiry)."
    },
    {
      "slot": "burst",
      "kitLine": "Recovers 6.96% Max HP /1s for 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "heal {ticks:10, intervalSec:1} on trigger {kind:'burstCast'}. No HP amount modeled (no HP pool at scope); the 10 recovery events are what matter — they drive teammates' 'recovery' triggers across the window."
    },
    {
      "slot": "burst",
      "kitLine": "Affects all Defender allies",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'alliesOfClass', cls:'Defender'} — \"all\", so no count cap here."
    },
    {
      "slot": "burst",
      "kitLine": "Critical Rate ▲ 19.9% for 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff {stat:'critRatePct', value:19.9, durationSec:10} on {kind:'burstCast'} — unscoped Critical Rate (the kit does NOT say \"of normal attacks\", so critRateNormalPct would under-credit)."
    }
  ],
  "flags": [
    {
      "field": "skill1[0].trigger",
      "estimate": "{kind:'shotFired'} — fires on every trigger pull",
      "reasoning": "The kit says \"when attacking with Full Charge\"; the schema has no full-charge trigger kind. quiry is an RL with chargeFrames 60, so under the standard charge-weapon model every pull is a Full Charge release and shotFired == full-charge count. chargeCounter{count:1} was rejected: it is a cycling per-phase counter, not a per-charge trigger. If the engine ever fires an uncharged RL shot, this over-fires the ally ATK buff.",
      "recipe": "Instrument a controlComp with quiry via cfg.onEvent: count 'shot' events and buffApply events with stat casterAtkPct value≈(5.81/100)×quiry.staticAtk over 180 s; they must be 1:1. Cross-check against a focus recording of quiry — count her visible full-charge releases in a 30 s window."
    },
    {
      "field": "skill1[0].target / skill2[0].target",
      "estimate": "all Defender allies (count-2 cap dropped)",
      "reasoning": "Kit says \"2 Defender ally unit(s)\" but TargetDef.alliesOfClass carries no count field (unlike alliesTopAtk / alliesLowestAtk). Dropping the cap is exact for teams with ≤2 Defenders and over-credits a 3+-Defender team by up to 50%. The kit also does not state the selection rule when >2 Defenders are present (leftmost? highest ATK?).",
      "recipe": "Run a 3-Defender comp and assert the number of distinct targetIdx values on the casterAtkPct buffApply events — 3 confirms the over-credit. Fixing it needs either a count field on alliesOfClass or a schema-level Defender+count target; the selection rule needs an in-game read of which two Defenders light up."
    },
    {
      "field": "base cadence tuple (pullsPerSec / chargeFrames 60 / reloadFrames 141 / ammo 6)",
      "estimate": "as datamined: 1 s charge, 6 rounds, ~2.35 s reload → ~100% uptime on the 3 s Defender ATK buff",
      "reasoning": "ALWAYS-⚑: rate_of_fire / reloadFrames are known-unreliable datamine fields, and here they are load-bearing for the ONLY continuously-refreshing offensive effect quiry has. The 3 s window survives the ~2.35 s reload gap only if reloadFrames 141 is right; a slower real reload would open dead time and cut the buff's effective value.",
      "recipe": "Frame-count one full magazine cycle in a quiry recording (first charge start → 6th release → next charge start) and compare against 6×(chargeFrames+release latency)+reloadFrames. Then assert uptime in-sim from buffApply expiresFrame gaps."
    },
    {
      "field": "burst[0].effects[0] (heal tick phase)",
      "estimate": "ticks:10, intervalSec:1, first tick on the cast frame (t=0)",
      "reasoning": "\"every 1 sec for 10 sec\" gives 10 ticks, but the kit does not say whether the first tick lands at cast or one second later. This is invisible for quiry herself (no HP modeled) but shifts a teammate's on-recovery consumer by up to 1 s — enough to move which side of a Full Burst boundary the first proc lands on.",
      "recipe": "Read a recording of quiry's burst with a heal-synergy partner (crown-style 'when recovery takes effect'): note the frame of the first green heal number relative to the burst banner. Confirm the engine's heal-tick phase in the same run via cfg.onEvent recovery timing."
    },
    {
      "field": "unmodeled.skill1 (enemy ATK ▼ 8.94%)",
      "estimate": "inert at scope lock — no damage impact",
      "reasoning": "The debuff reduces the boss's ATK, and the scope-lock boss deals no modeled damage (nobody takes damage, nobody dies). Modeling it as an enemy-targeted block would be a guaranteed no-op (resolveTargets({kind:'enemy'}) returns []), which is why it is recorded rather than authored. Flagged because the judgement \"purely defensive\" is a scope claim, not a kit claim — it would matter in any future survivability model.",
      "recipe": "None needed for damage validation. Re-open only if the sim ever models incoming boss damage; then it becomes a real enemy-stat channel and needs a schema primitive (there is none today)."
    }
  ]
}
```

---

## VII. DRIVER IMPLEMENTATION

### VIIa. scripts/tests/units/quiry.test.ts (18 tests, ALL GREEN vs the shipped override; RED-phase evidence in reviews/quiry.verify.txt)

```typescript
// PER-UNIT KIT SPEC — `quiry` (Quiry, Supporter/RL/Wind, Burst II, cd 60s per the synced
// burstCooldownSec, ammo 6, chargeFrames 60, reloadFrames 141). Kit-autonomy gauntlet 2026-08-04
// (test-first re-derivation). NOTE: this
// is a FROM-SCRATCH unit — there was no shipped override before this gauntlet (simSupported was
// false), so the harness cannot even load her until src/skills/overrides/quiry.json exists. The
// override was authored as an EMPTY SKELETON first (the "shipped" state these tests run RED
// against), then the faithful S3 encoding lands GREEN — every assertion pins a kit line and the
// nearest-wrong counterfactual (withPatchedOverride) it must discriminate against.
//
// Kit (blablalink prose, data/characters.json → characters.quiry.skills), max level:
//   S1 ■ hitting a target with Full Charge → the target: ATK ▼ 8.94% of quiry's ATK, 3 sec.
//                                                  [UNMODELED — the engine models no enemy ATK]
//      ■ attacking with Full Charge → 2 Defender allies:
//        ATK ▲ 5.81% of the skill user's ATK for 3 sec.                            [Q1]
//   S2 ■ start of battle → 2 Defender allies: Max HP ▲ 11.63% continuously.        [Q2]
//   BU ■ all allies: recover 6.96% of quiry's final Max HP every 1 sec for 10 sec. [Q3]
//      ■ all Defender allies: Critical Rate ▲ 19.9% for 10 sec.                    [Q4]
//
// Modeling posture (full story in the override note):
//   * The S1 enemy ATK▼ debuff is UNMODELED: the engine has no enemy-ATK model (the boss deals no
//     damage; applyEffect's enemy branch accepts only damageTakenPct/distributedDamagePct > 0 —
//     "other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0", sim.ts). It is
//     offensively inert by construction, verbatim in unmodeled (mast/novel DEF▼ precedent).
//   * S1's ally ATK buff is a CASTER-ATK FLAT add ("5.81% OF THE SKILL USER'S ATK" — not the
//     target's own %): casterAtkPct resolves (5.81/100)×quiry.staticAtk at apply time. The kit
//     says plain "the skill user's ATK", not "final ATK", so the STATIC basis is the literal-word
//     reading (A3: only "final" gets the live basis).
//   * "2 Defender ally unit(s)" scope = alliesOfClass 'Defender' — the schema's class scope has no
//     count cap; exact while the team fields ≤2 Defenders (the fixture fields exactly 1), over-
//     grants to a 3rd Defender in tank-heavy teams (⚑ in the override note). Quiry is a
//     Supporter, so she never counts toward her own Defender scope.
//   * The burst heal is the recovery EVENT channel only: heal ticks:10 intervalSec:1 (the kit's
//     "every 1 sec for 10 sec" window, milk K6 / helm H8 precedent). No HP amount is modeled —
//     the 6.96%-of-final-Max-HP magnitude rides verbatim in unmodeled, not fudged. Observable
//     through asuka's "when recovery takes effect" self ATK consumer (the fixture's consumer).
//   * S2's Max HP grant arrives as an ALLY-granted maxHpFlat (casterIdx = quiry) — effectiveAtk's
//     e3 rule (VIDEO-MEASURED 2026-07-13) excludes ally grants from atkOfMaxHpPct conversions, so
//     it is damage-INERT on 2b even though 2b IS an HP-scaling kit (her own grants feed, quiry's
//     do not). Q2 pins both the inertness and that the basis is load-bearing (a SELF grant of the
//     same magnitude provably moves 2b's total).
//
// FIXTURE: liter(B1) / quiry(B2) / asuka(B3) / 2b(B3), boss Iron (quiry is Wind — clean ×1.10
// advantage), focus quiry. Custom comp (novel precedent): crown — the usual B2 of the control
// comp — would take the stage-II slot and leave quiry zero casts, so she is the SOLE Burst II
// here and casts every Full Burst. asuka doubles as the recovery CONSUMER (her S1 self ATK
// 96.98%/25s fires on every recovery she receives) and 2b as the sole DEFENDER recipient of the
// three class-scoped lines. Known fixture confound (measured into the Q3 thresholds): asuka's own
// burst lifesteal emits one self-recovery at each of HER casts (~1s after quiry's). Deterministic
// (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'quiry', 'asuka', '2b'] as const;
/** slot order: liter 0 / quiry 1 / asuka 2 / 2b 3. */
const QUIRY = 1;
const ASUKA = 2;
const TWOB = 3;
const FIGHT_FRAMES = 180 * FPS;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Iron',
    focusSlug: 'quiry',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const quiryShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'quiry');
const quiryCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'quiry');

/** asuka's "when recovery takes effect" self ATK buff — one buffApply per recovery event she
 *  receives (applications AND refreshes both log). The Q3 recovery-channel observable. */
const asukaRecoveryApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === ASUKA &&
      b.targetIdx === ASUKA &&
      b.stat === 'atkPct' &&
      b.value === 96.98
  );

/** Distinct crit rates per unit on a bucket — the Q4 discriminator. */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][]
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of dmg(evs)) {
    if (!buckets.includes(d.bucket)) {
      continue;
    }
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')])
  );
}

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) -----------
// PHASE-AWARE GUARD: quiry is FROM-SCRATCH — the RED phase runs against an empty skeleton
// override, where there is no block to patch and a counterfactual is (correctly) identical to
// the shipped state. `mutateBlock` therefore throws only when the slot is NON-EMPTY but the
// block is absent (a genuinely stale fixture), and passes through on the empty skeleton.
function mutateBlock(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  find: (b: any) => boolean,
  mutate: (b: any) => void,
  label: string
): void {
  const b = ov[slot].find(find);
  if (b) {
    mutate(b);
    return;
  }
  if (ov[slot].length > 0) {
    throw new Error(`${label} missing — fixture is stale`);
  }
}

/** Q1 counterfactual: the same line as a GENERIC all-allies own-% ATK buff (wrong basis AND
 *  wrong scope — the natural misparse of "ATK ▲ 5.81% ... allies"). */
const quiryGenericAtk = withPatchedOverride('quiry', (ov) => {
  mutateBlock(
    ov,
    'skill1',
    (x: any) => x.effects.some((e: any) => e.stat === 'casterAtkPct'),
    (b: any) => {
      if (b.trigger.kind !== 'chargeCounter') {
        throw new Error('quiry S1 trigger re-keyed — fixture is stale');
      }
      b.target = { kind: 'allies' };
      b.effects[0].stat = 'atkPct';
    },
    'quiry S1 casterAtkPct block'
  );
});
/** Q2 isolation: her S2 Max HP line removed — must move NO unit's total (e3: ally-granted Max HP
 *  does not feed a teammate's atkOfMaxHpPct conversion, even 2b's). */
const quiryNoS2 = withPatchedOverride('quiry', (ov) => {
  mutateBlock(
    ov,
    'skill2',
    (x: any) => x.effects.some((e: any) => e.stat === 'targetMaxHpPct'),
    () => {
      ov.skill2 = ov.skill2.filter(
        (b: any) => !b.effects.some((e: any) => e.stat === 'targetMaxHpPct')
      );
    },
    'quiry S2 targetMaxHpPct block'
  );
});
/** Q2 counterfactual: the SAME magnitude as 2b's OWN-kit grant — own maxHpFlat DOES feed her
 *  atkOfMaxHpPct conversion, so this provably moves her total where the shipped ally grant does
 *  not. Proves the caster-basis distinction is load-bearing, not cosmetic. */
const twoBSelfHp = withPatchedOverride('2b', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'targetMaxHpPct', value: 11.63 }],
  });
});
/** Q3 counterfactual: the burst heal collapsed to a single instant event (ticks omitted) — a
 *  one-shot model of a "every 1 sec for 10 sec" window. */
const quiryInstantHeal = withPatchedOverride('quiry', (ov) => {
  mutateBlock(
    ov,
    'burst',
    (x: any) => x.effects.some((e: any) => e.kind === 'heal'),
    (b: any) => {
      if (b.trigger.kind !== 'burstCast') {
        throw new Error('quiry burst heal trigger re-keyed — fixture is stale');
      }
      b.effects = b.effects.map((e: any) =>
        e.kind === 'heal' ? { kind: 'heal' } : e
      );
    },
    'quiry burst heal block'
  );
});
/** Q4 counterfactual: the crit-rate line unscoped to all allies (the class clause dropped). */
const quiryCritAllAllies = withPatchedOverride('quiry', (ov) => {
  mutateBlock(
    ov,
    'burst',
    (x: any) => x.effects.some((e: any) => e.stat === 'critRatePct'),
    (b: any) => {
      b.target = { kind: 'allies' };
    },
    'quiry burst critRatePct block'
  );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const genericAtk = run({ quiry: quiryGenericAtk });
const noS2 = run({ quiry: quiryNoS2 });
const selfHp = run({ '2b': twoBSelfHp });
const instantHeal = run({ quiry: quiryInstantHeal });
const critAllies = run({ quiry: quiryCritAllAllies });

// ---- derived (base-run) quantities -------------------------------------------------------------
const QUIRY_STATIC_ATK = base.res.units[QUIRY].staticAtk;
const TWOB_MAX_HP = base.res.units[TWOB].maxHp;

describe('quiry — kit spec', () => {
  it('fixture sanity: quiry is the sole Burst II and casts every Full Burst', () => {
    expect(quiryCasts(base.events).length).toBeGreaterThanOrEqual(3);
  });

  describe("Q1 — S1 full-charge attack: 2 Defender allies gain ATK = 5.81% of quiry's ATK, 3s", () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === QUIRY && b.stat === 'casterAtkPct'
    );

    it("is a flat CASTER-basis add (5.81% of quiry static ATK), not the target's own %", () => {
      expect(applied.length).toBeGreaterThan(0);
      const expected = (5.81 / 100) * QUIRY_STATIC_ATK;
      expect([...new Set(applied.map((b) => b.value))]).toEqual([expected]);
    });

    it('reaches ONLY the Defender-class ally (never asuka/liter/quiry herself)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([TWOB]);
    });

    it('fires on EVERY full charge — an RL fires every shot as a full charge', () => {
      expect(applied.length).toBe(quiryShots(base.events).length);
    });

    it('is a 3-second window, refreshed per shot', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
      }
    });

    it('LAPSES across the reload gap — a timed window, not a permanent/passive grant (S2b)', () => {
      // quiry's mag cycle (~6 shots at ~1.4s + 141f reload + next charge) leaves a >3s gap
      // between the last apply of one magazine and the first of the next, so the 3s buff
      // genuinely drops mid-fight. A passive/permanent encoding shows one frame-0 apply instead.
      const frames = applied.map((b) => b.frame).sort((a, z) => a - z);
      const gaps = frames.slice(1).map((f, i) => f - frames[i]);
      expect(
        Math.max(...gaps),
        'some inter-apply gap must exceed the 3s window (the reload lapse)'
      ).toBeGreaterThan(3 * FPS);
    });

    it('DISCRIMINATING: a generic all-allies own-% ATK buff reaches all four at value 5.81', () => {
      const generic = buffs(genericAtk.events).filter(
        (b) => b.casterIdx === QUIRY && b.stat === 'atkPct' && b.value === 5.81
      );
      expect(generic.length).toBeGreaterThan(0);
      expect(new Set(generic.map((b) => b.targetIdx)).size).toBe(SLUGS.length);
      // and the shipped flat basis is one the generic model provably fails to produce
      expect(
        buffs(genericAtk.events).filter(
          (b) => b.casterIdx === QUIRY && b.stat === 'casterAtkPct'
        )
      ).toEqual([]);
    });
  });

  describe('Q2 — S2 battle-start: Defender allies gain Max HP ▲11.63% continuously', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === QUIRY && b.stat === 'maxHpFlat'
    );

    it("applies at frame 0 to the Defender only, at 11.63% of the TARGET's own Max HP", () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([TWOB]);
      const expected = (11.63 / 100) * TWOB_MAX_HP;
      expect([...new Set(applied.map((b) => b.value))]).toEqual([expected]);
    });

    it('is continuous — no wall-clock expiry', () => {
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it("is damage-INERT by the e3 rule: removing it moves NO unit's total (even 2b, an HP scaler)", () => {
      expect(base.totals).toEqual(noS2.totals);
    });

    it("DISCRIMINATING: the same magnitude as 2b's OWN grant DOES feed her HP→ATK conversion", () => {
      // ally-granted (shipped) is inert; own-kit-granted (counterfactual) provably moves 2b —
      // the caster/target basis distinction is load-bearing, not cosmetic.
      expect(selfHp.totals['2b']).toBeGreaterThan(base.totals['2b']);
    });
  });

  describe('Q3 — burst: all allies recover every 1 sec for 10 sec (a 10-tick recovery window)', () => {
    // The heal carries no modeled HP amount — its ONLY observable is the recovery-event channel.
    // asuka's S1 ("when recovery takes effect → self ATK ▲96.98%/25s") logs one buffApply per
    // recovery she receives, so her applications ARE quiry's heal ticks as seen by a consumer.
    // Only casts whose FULL window fits inside the 180s fight are measurable — a late cast's
    // window is truncated by the fight end, a fixture property, not a kit property (helm H8).
    const casts = quiryCasts(base.events).filter(
      (c) => c.frame + 10 * FPS <= FIGHT_FRAMES
    );
    const frames = asukaRecoveryApplies(base.events).map((b) => b.frame);

    it('has bursts with a complete window to measure', () => {
      expect(
        casts.length,
        'no quiry burst has a full 10s window inside the fight'
      ).toBeGreaterThan(0);
    });

    it('keeps recovery firing across the whole 10 sec after each cast (10 ticks, 1s apart)', () => {
      for (const cast of casts) {
        const inWindow = frames.filter(
          (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
        );
        const spanSec = inWindow.length
          ? (inWindow[inWindow.length - 1] - cast.frame) / FPS
          : 0;
        // 10 quiry ticks at +0..+9s; asuka's own lifesteal may add ≤1 at her cast (~+1s) —
        // hence >= 10, not == 10.
        expect(
          inWindow.length,
          `burst at ${cast.sec.toFixed(2)}s produced ${inWindow.length} recovery firing(s) ` +
            `spanning ${spanSec.toFixed(1)}s — a single instant heal produces 1 (+≤1 lifesteal)`
        ).toBeGreaterThanOrEqual(10);
        expect(
          spanSec,
          'the window must reach ~9-10s, not collapse to the cast frame'
        ).toBeGreaterThanOrEqual(8);
        // burstCast-vs-fullBurstEnter timing pin (S2b): the first tick fires INLINE on her own
        // cast frame — a fullBurstEnter-keyed heal would first fire at the later stage-3
        // completion frame, strictly after quiry's stage-2 cast.
        expect(
          Math.min(...inWindow),
          'the first recovery tick lands on the cast frame itself'
        ).toBe(cast.frame);
      }
    });

    it('DISCRIMINATING: a one-shot heal never reaches the 10-firing window', () => {
      const oneShotFrames = asukaRecoveryApplies(instantHeal.events).map(
        (b) => b.frame
      );
      for (const cast of casts) {
        const inWindow = oneShotFrames.filter(
          (f) => f >= cast.frame && f <= cast.frame + 10 * FPS
        );
        expect(
          inWindow.length,
          'one-shot heal + at most one lifesteal firing'
        ).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Q4 — burst: all Defender allies gain Critical Rate ▲19.9% for 10 sec', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === QUIRY && b.stat === 'critRatePct'
    );
    const casts = quiryCasts(base.events);

    it('is 19.9% for 10 sec, one application per quiry cast, on her cast frames', () => {
      expect(applied.length).toBe(casts.length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([19.9]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const b of applied) {
        expect(castFrames.has(b.frame)).toBe(true);
      }
    });

    it('reaches ONLY the Defender-class ally', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([TWOB]);
    });

    it("is LIVE: 2b's crit rate inside a window is exactly +0.199 over her out-of-window rate", () => {
      const normals = dmg(base.events).filter(
        (d) => d.slug === '2b' && d.bucket === 'normal'
      );
      const windows = applied.map((b) => [b.frame, b.expiresFrame!] as const);
      const inWin = normals.filter((d) =>
        windows.some(([a, z]) => d.frame >= a && d.frame < z)
      );
      const outWin = normals.filter(
        (d) => !windows.some(([a, z]) => d.frame >= a && d.frame < z)
      );
      expect(inWin.length).toBeGreaterThan(0);
      expect(outWin.length).toBeGreaterThan(0);
      const baseRate = Math.min(...outWin.map((d) => d.critRate));
      expect(
        [...new Set(inWin.map((d) => d.critRate.toFixed(9)))],
        'every in-window 2b normal carries the lifted rate'
      ).toEqual([(baseRate + 0.199).toFixed(9)]);
    });

    it("DISCRIMINATING: unscoping the buff lifts EVERY unit's crit, not just the Defender", () => {
      const shipped = critRatesByUnit(base.events, ['normal', 'skill']);
      const unscoped = critRatesByUnit(critAllies.events, ['normal', 'skill']);
      const moved = [...SLUGS].filter((s) => unscoped[s] !== shipped[s]);
      // 2b is buffed identically under both encodings (same value/duration on her casts), so
      // she must NOT move — the delta is exactly the non-Defenders the shipped scope excludes.
      expect(
        moved,
        "the Defender's crit set is unchanged by unscoping"
      ).not.toContain('2b');
      expect(
        moved.length,
        'the unscoped buff must lift the non-Defenders the shipped scope excludes'
      ).toBeGreaterThanOrEqual(2);
    });
  });
});

```

### VIIb. src/skills/overrides/quiry.json (shipped)

```json
{
  "note": "quiry (Quiry) — RL / Supporter / Wind / Burst II, cd 60s (synced burstCooldownSec), ammo 6, chargeFrames 60, reloadFrames 141, Missilis. Kit-autonomy gauntlet 2026-08-04: FROM-SCRATCH build (no prior override existed; simSupported was false) — test-first re-derivation (scripts/tests/units/quiry.test.ts, groups Q1-Q4). She is a Defender-facing support: her offensive surface is a per-full-charge caster-ATK flat buff for Defender-class allies + a Defender-only burst crit-rate window; the rest is sustain (recovery channel) and an enemy ATK debuff v1 cannot consume. || MODELED: (Q1, S1 line 2 'Activates when attacking with Full Charge. Affects 2 Defender ally unit(s). ATK ▲ 5.81% of the skill user's ATK for 3 sec.') → chargeCounter count:1 countInFb:1 (RL: every shot dispatches charged — bay precedent; chargeCounter, not shotFired, per the 'with Full Charge' trigger identity — milk K4 precedent) → alliesOfClass 'Defender' → buff casterAtkPct 5.81 durationSec:3. CASTER BASIS: 'of the skill user's ATK' = flat add (5.81/100)×quiry.staticAtk at apply time; the prose says plain 'the skill user's ATK', NOT 'final ATK', so the static basis is the literal-word reading (A3: only 'final' gets the live basis). Quiry is a Supporter → never inside her own Defender scope. The 3s window genuinely LAPSES each magazine (141f reload + next charge ≈ 3.35s > 3s gap between the last apply of one mag and the first of the next — pinned by Q1; S2b independently re-derived the lapse). (Q2, S2 'Activates at the start of battle. Affects 2 Defender ally unit(s). Max HP ▲ 11.63% continuously.') → passive → alliesOfClass 'Defender' → buff targetMaxHpPct 11.63, NO durationSec ('continuously' = never expires; a duration-less passive is always-on). 'Max HP ▲ X%' with no 'of the skill user' clause = the TARGET's OWN % (targetMaxHpPct — blanc/maiden precedent; casterMaxHpPct is the DISTINCT '% of the skill user's Max HP' basis). Resolves per-target to maxHpFlat (11.63/100)×target.maxHp at frame 0; an ALLY grant (casterIdx = quiry) → e3 rule (VIDEO-MEASURED 2026-07-13): ally-granted Max HP does NOT feed a teammate's atkOfMaxHpPct conversion — damage-inert even on an HP-scaling Defender (Q2 pins both: removing the block moves no total; the same magnitude as 2b's OWN grant provably moves hers). (Q3, burst line 1 'Affects all allies. Recovers 6.96% of the skill user's final Max HP every 1 sec for 10 sec.') → burstCast → allies → heal ticks:10 intervalSec:1 — 'every 1 sec for 10 sec' = a 10-tick recovery WINDOW that keeps on-recovery consumers refreshed across it (milk K6 / helm H8 precedent; the one-shot collapse is the tandem trap). Magnitude rides in unmodeled (engine heal carries no HP amount by design — no HP pool), not fudged. TRIGGER IDENTITY burstCast, not fullBurstEnter: no activation clause in a burst slot = fires when QUIRY casts; as the fixture's sole B2 the two encodings agree on COUNT but differ on TIMING (Q3 pins the first tick to her cast frame). (Q4, burst line 2 'Affects all Defender allies. Critical Rate ▲ 19.9% for 10 sec.') → burstCast → alliesOfClass 'Defender' → buff critRatePct 19.9 durationSec:10 — UNSCOPED Critical Rate (no 'of normal attacks' clause → critRateNormalPct would be an over-narrowing; helm H1 distinguishes the two mechanics). || DELIBERATELY UNMODELED (verbatim in `unmodeled`): S1 line 1 'Activates when hitting a target with Full Charge. Affects the target. ATK ▼ 8.94% of the skill user's ATK for 3 sec.' — enemy ATK debuff: the engine models NO enemy ATK (v1 boss deals no damage; applyEffect's enemy branch accepts only damageTakenPct/distributedDamagePct > 0 — 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0', sim.ts). Offensively inert by construction; the nearest-wrong mapping (damageTakenPct) would over-credit the whole team (mast/novel DEF▼ precedent; S2b re-derived the identical disposition). Burst heal magnitude '6.96% of the skill user's final Max HP' — heal carries no HP amount (magnitude only; the window IS modeled). || ⚑ LIST: (1) CADENCE TUPLE (mandatory, datamine-unreliable): pullsPerSec / reloadFrames 141 / rolling-reload shipped at the datamine-synced base values; NOT escalated (6-shot RL at class charge rate — no revolver/mag-dump/charge-flavor tell). Estimate = datamine. Recipe: read rounds/min + the reload gap from any quiry focus video. Tier: low for team damage — drives only her own shot count, i.e. the Q1 buff refresh cadence, which saturates uptime while she fires regardless. (2) TARGET-COUNT CAP: 'Affects 2 Defender ally unit(s)' — the schema's alliesOfClass has NO count field, so the scope grants EVERY Defender-class ally: exact while the team fields ≤2 Defenders (every standard tank comp; the fixture fields exactly 1), an over-grant to a 3rd Defender only in 3-tank comps. Estimate = no divergence on any meta team (quiry is fielded with 1-2 tanks). Recipe: A/B a 3-Defender team, or popup-read the Defender buff icons in a quiry focus. Tier: low. || EVIDENCE TIER: all four live encodings are kit-text-literal magnitudes/durations/triggers (DATAMINED L10); the only estimates are the two ⚑s above. TIER 2 (Defender-class-scoped buffs ×3, burstCast-vs-fullBurstEnter trigger identity, count-cap elision, recovery-window shape). Faithful>fit; measured>fudge. Kit-autonomy gauntlet 2026-08-04.",
  "unmodeled": {
    "skill1": [
      "■ Activates when hitting a target with Full Charge. Affects the target. ATK ▼ 8.94% of the skill user's ATK for 3 sec. — enemy ATK debuff: the engine models no enemy ATK (v1 boss deals no damage; the enemy-buff branch accepts only damageTakenPct/distributedDamagePct > 0), offensively inert by construction."
    ],
    "skill2": [],
    "burst": [
      "■ Affects all allies. Recovers 6.96% of the skill user's final Max HP every 1 sec for 10 sec. — magnitude only: the engine `heal` carries no HP amount by design (no HP pool); the 10-second recovery-event WINDOW is modeled (burst heal ticks:10 intervalSec:1)."
    ]
  },
  "caveats": [
    "skill1/skill2/burst: 'Affects 2 Defender ally unit(s)' is modeled as alliesOfClass 'Defender' — the schema has no count cap; exact at ≤2 Defenders, over-grants a 3rd Defender in 3-tank comps (⚑2)",
    "skill1: the enemy ATK▼ line is unmodeled — the engine models no enemy ATK (boss deals no damage); offensively inert by construction, carried verbatim in unmodeled",
    "burst: the heal carries no HP amount — recovery-event window only (ticks:10 intervalSec:1); the 6.96%-of-final-Max-HP magnitude is unmodeled, not fudged"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "chargeCounter", "count": 1, "countInFb": 1 },
      "target": { "kind": "alliesOfClass", "cls": "Defender" },
      "effects": [
        { "kind": "buff", "stat": "casterAtkPct", "value": 5.81, "durationSec": 3 }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "alliesOfClass", "cls": "Defender" },
      "effects": [{ "kind": "buff", "stat": "targetMaxHpPct", "value": 11.63 }]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "heal", "ticks": 10, "intervalSec": 1 }]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "alliesOfClass", "cls": "Defender" },
      "effects": [
        { "kind": "buff", "stat": "critRatePct", "value": 19.9, "durationSec": 10 }
      ]
    }
  ]
}

```
