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

# MECHANICS SSOT (damage formula + game mechanics)

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

# GROUND TRUTH — Anchor (slug `anchor`) kit prose + base data (from data/characters.json)

DISAMBIGUATION: this is the BASE unit `anchor` (RL / Defender / Wind / Burst I, Elysion SR,
resource_id 351) — NOT the variant `anchor-innocent-maid` (RL / Water / Supporter / Burst II,
already gauntleted 2026-07-24). The slug-disambiguation lint fired on the shared base name;
resolved explicitly to slug=anchor, 2026-08-05.

## Kit prose (verbatim, max skill level)

skill1: "■ Activates when the last bullet hits the target. Affects the target.
Taunt for 5 sec. 
■ Activates when the last bullet hits the target. Affects self.
DEF ▲ 23.82% for 5 sec."

skill2: "■ Activates at the start of battle. Affects self.
When attacking an enemy projectile, damage dealt to that projectile ▲ 25.6% continuously."

burst: "■ Affects all enemies.
Deals 304.45% of final ATK as Burst Skill damage."

skillCooldownsSec: skill1 null (passive on last-bullet-hit), skill2 null (battle-start passive), burst 20.

## Base data

- weapon RL, class Defender, element Wind, burst I, burstCooldownSec 20, manufacturer Elysion, SR
- normalAttackMultiplier 61.3, coreAttackMultiplier 200, chargeMultiplier 250, chargeFrames 60
- ammo 6, reloadFrames 141, hitsPerShot 1, burstGaugePerShot 1.4
- baseStats: hp 12650 / atk 360 / def 97, critRate 15, critDamage 150
- simSupported was FALSE before this gauntlet (FROM-SCRATCH unit; no override existed)
- element note: Wind holds its +10% element advantage ONLY into Iron (weak_element_id mapping)

# S2b REVIEW (claude-fable-5, scripts/kit-autonomy/reviews/anchor.test-review.json)

```json
{
  "slug": "anchor",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ last bullet hits → Taunt for 5 sec",
      "disposition": "UNMODELED",
      "scope": "Defensive aggro control on the enemy; no damage component. v1 boss follows a fixed range script and deals no modeled damage, so taunt has no mechanical surface.",
      "durationSemantics": "durationSec 5 (literal seconds) — would apply if ever modeled.",
      "triggerIdentity": "lastBullet (per-magazine — RL ammo 6, so roughly one proc per 6 full-charge shots + reload cycle). 'hits the target' = on-hit, but the engine's lastBullet fires at last-bullet/reload-start, which is the correct available primitive.",
      "targetSet": "enemy (the target).",
      "nearestWrongModel": "Encoding taunt as a boss-facing effect that moves damage — a targetStatus window some rider could key on, or worse a damageTakenPct debuff standing in for 'aggro'. Second misread: merging this block with the following self-DEF block into one enemy-targeted block.",
      "distinguishingAssertion": "A run with the shipped override vs a run with skill1's taunt block removed (withPatchedOverride) produces IDENTICAL totals() for every slug, and the event log contains NO buffApply from anchor's skill1 targeting the boss (casterIdx===null/targetIdx===null boss-debuff shape must not appear with a skill1-attributable stat).",
      "inertness": "Must move zero damage for all five units; must not open any requiresTargetStatus window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "■ last bullet hits → DEF ▲ 23.82% 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic self DEF stat buff, no attack-type scoping. defPct is a declared StatKey the engine treats as damage-inert in v1 (self DEF never feeds own damage), but taxonomy rule 7 says keep the stat for future consumers — so it should be ENCODED, not dropped.",
      "durationSemantics": "durationSec 5 — kit says 'for 5 sec', true wall-clock, NOT rounds (no 'round(s)' wording).",
      "triggerIdentity": "lastBullet, self-block sibling of the taunt block (same activation header). NOT interval, NOT shotFired, NOT reload-complete.",
      "targetSet": "self only.",
      "nearestWrongModel": "Mis-targeting: reading 'DEF ▲' onto the TARGET (boss) — which in a sim with boss DEF in the formula would REDUCE all five units' damage — or granting it to allies. Secondary misread: keying it to a passive/interval instead of lastBullet.",
      "distinguishingAssertion": "Event log shows buffApply {stat:'defPct', value:23.82, casterIdx===targetIdx===anchor's slot} with first application only after anchor's 6th shot (magazine exhaustion), recurring per reload cycle; AND totals() for every slug is identical to a run with this block removed (defPct self is inert — the buff must exist in events yet move nothing).",
      "inertness": "Zero damage movement for all units; no boss-held buffApply (casterIdx null) with value 23.82 may appear.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ battle start → vs enemy projectile ▲25.6%",
      "disposition": "UNMODELED",
      "scope": "Damage buff scoped EXCLUSIVELY to hits on enemy projectiles (interception objects). The scope-lock boss is partless and the sim has no projectile entities — the scoped surface does not exist, so the buff is structurally inert.",
      "durationSemantics": "'continuously' = permanent passive from t=0, no expiry — but only within its (nonexistent) scope.",
      "triggerIdentity": "passive (start of battle), self.",
      "targetSet": "self; the SCOPE condition (attacking a projectile) is the gate, not the target set.",
      "nearestWrongModel": "The classic SCOPE trap: encoding it as a generic passive attackDamagePct 25.6 (or partsDamagePct treated as live), silently over-crediting ALL of anchor's boss damage by a Damage-Up-bucket 25.6 points for the whole fight.",
      "distinguishingAssertion": "No buffApply with value 25.6 in any damage-feeding stat appears in the event log; anchor's totalDamage with the shipped override equals a run with skill2's blocks emptied via withPatchedOverride (skill2 must be verbatim in unmodeled, not folded into a live stat).",
      "inertness": "Anchor's own damage and all ally damage unchanged by skill2's presence; no Damage-Up-bucket contribution.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Deals 304.45% final ATK as Burst Skill dmg",
      "disposition": "FAITHFUL",
      "scope": "One instant burst-bucket damage instance, 304.45% of anchor's FINAL ATK (buffed at cast). 'Affects all enemies' collapses to one hit on the single boss. No core wording → no core; crits at caster sheet rate per standard burst-hit handling.",
      "durationSemantics": "Instant, one instance per cast.",
      "triggerIdentity": "burstCast (anchor's OWN Burst-I cast, cd 20s) — NOT fullBurstEnter. Per the noFb timing rule, burst-cast damage lands BEFORE the Full Burst window opens: no +50% FB major, no FB-entry auras in its buff snapshot.",
      "targetSet": "enemy (the boss).",
      "nearestWrongModel": "Two plausible misreads: (a) keying to fullBurstEnter, so the hit fires on EVERY team Full Burst — over-credits whenever anchor's 20s cd or B1 competition (another B1 in the comp) makes her skip a rotation; (b) letting the hit take the +50% Full Burst major (fbMajorApplied true), inflating every cast ~1.5×.",
      "distinguishingAssertion": "Count of anchor-sourced burst-bucket damage events EQUALS the count of burstCast events with anchor's srcSlot (and is strictly LESS than fullBurstStart count if any rotation is cast by a competing B1); each such damage event carries inFullBurst:false and fbMajorApplied:false with mult consistent with atkPct 304.45. Assert the burstCast count is > 0 first — see notes on fixture B1 competition.",
      "inertness": "No burst-bucket damage on rotations anchor did not cast; no FB-major on any instance.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:DEF ▲ 23.82% self, lastBullet, 5 sec (event-present, damage-inert)",
    "burst:304.45% final ATK burst-bucket hit on own burstCast, FB-exempt"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Taunt for 5 sec."
    ],
    "skill2": [
      "When attacking an enemy projectile, damage dealt to that projectile ▲ 25.6% continuously."
    ],
    "burst": []
  },
  "notes": "FIXTURE TRAP (expected shared-prior misread): controlComp(carry) pins liter in the Burst-I slot, and anchor is HERSELF Burst I. Under first-ready in-window selection she competes with liter for every B1 cast and may cast ZERO bursts — making the burstCast-vs-fullBurstEnter distinguishing assertion VACUOUSLY green (0 events on both sides). The test must first assert anchor's burstCast count > 0, and if the shared fixture starves her, build an explicit comp where anchor is the only B1 (anchor B1 + crown B2 + a B3 + helm) so bursts actually cast — the harness itself warns a chain needs B1+B2+B3 present. Second reconcile point: the skill2 SCOPE trap is the highest-risk over-credit (a generic +25.6% Damage-Up passive is exactly the misread calibration would hide, since anchor is a Defender whose board reading nobody grades closely). Third: anchor has NO cadence ⚑ concerns beyond base data (RL, chargeFrames 60, ammo 6, reloadFrames 141 drive lastBullet frequency ≈ one proc per ~8.35s cycle: 6×1s charges + 2.35s reload) — if the driver asserted lastBullet cadence in wall-clock terms, verify it derives from these base stats, not an invented interval. Kit has no heal/shield/gauge lines, so no tandem consumers to preserve.",
  "model": "claude-fable-5"
}
```

# S5 BLIND TEST (claude-opus-5, scripts/kit-autonomy/blind/anchor.test.ts)

STATUS vs the DRIVER override: GREEN — 16 passed, 2 skipped (the 2 skips are the blind author's
own GAP annotations: taunt has no aggro/threat primitive and the scope-lock boss deals no damage;
skill2 has no enemy-projectile entity in the sim). The adapted file (mechanical fixes only:
harness import path re-rooted + durationShots null-tolerance, zero assertion changes) is at
scripts/kit-autonomy/blind/anchor.adapted.test.ts; the raw blind source follows. Notable: the
blind author chose a DIFFERENT fixture (controlComp('anchor', true) = liter B1 / crown B2 /
anchor / helm B3) and a different discrimination style (total-based: a fullBurstEnter-keyed nuke
takes the +50% FB major so its total is strictly higher even where instance counts tie; a
scaling pair up/down isolates the burst instance contribution) — an independent method that
converges on the same verdict.

```ts
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * anchor (Anchor) — per-unit kit spec test.
 *
 * Written BLIND from the kit prose alone (cross-family post-op spec pass) against the
 * shipped src/skills/overrides/anchor.json.
 *
 * KIT (RL / Wind / Defender / Burst I — 6 ammo, 141f reload, normal 61.3%, core 200%):
 *   skill1-a  "Activates when the last bullet hits the target. Affects the target."
 *             Taunt for 5 sec.                       -> GAP: no aggro/taunt primitive exists,
 *                                                       and the scope-lock boss deals no damage,
 *                                                       so the line is unobservable in v1.
 *   skill1-b  "Activates when the last bullet hits the target. Affects self."
 *             DEF ▲ 23.82% for 5 sec.                -> FAITHFUL: lastBullet / self / defPct,
 *                                                       seconds (not rounds), damage-inert in v1.
 *   skill2    "Activates at the start of battle. Affects self. When attacking an enemy
 *             projectile, damage dealt to that projectile ▲ 25.6% continuously."
 *                                                    -> GAP: there is no enemy-projectile entity;
 *                                                       the ONLY faithful model is board-inert.
 *   burst     "Affects all enemies. Deals 304.45% of final ATK as Burst Skill damage."
 *                                                    -> FAITHFUL: burstCast / enemy / flatDamage,
 *                                                       no core strike, pre-Full-Burst by timing.
 *
 * FIXTURE: controlComp('anchor', true) — liter (B1) / crown (B2) / anchor / helm (B3), boss Fire,
 * focus anchor, deterministic (no seed). The fixed B3 is required so bursts chain at all.
 * NOTE: anchor is herself a Burst I and therefore SHARES burst stage 1 with liter in this fixture,
 * so "does her burst ever cast here" is not free — the burst group below carries an explicit
 * NON-VACUITY assertion (a strictly positive burst contribution) that fails loudly, and points at
 * the fixture rather than at the model, if she never gets the stage.
 *
 * SHAPE TOLERANCE: the harness documentation describes the OverrideFile two ways (slot -> Block[]
 * and slot -> { blocks: Block[] }). Every read/patch below goes through blocksOf()/effectsOf() so
 * the spec is true under either shape and a counterfactual can never silently no-op.
 */

type Comp = Parameters<typeof runComp>[0];
type OverrideClone = ReturnType<typeof withPatchedOverride>;
type Slot = 'skill1' | 'skill2' | 'burst';
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

interface EffectLike {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  durationShots?: number;
  core?: boolean;
}
interface BlockLike {
  trigger?: { kind?: string };
  target?: { kind?: string };
  effects?: EffectLike[];
}
interface RunResult {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
}

const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

function blocksOf(ov: OverrideClone, slot: Slot): BlockLike[] {
  const raw = (ov as unknown as Record<string, unknown>)[slot];
  if (Array.isArray(raw)) return raw as BlockLike[];
  const nested = (raw as { blocks?: unknown } | undefined)?.blocks;
  return Array.isArray(nested) ? (nested as BlockLike[]) : [];
}
function effectsOf(ov: OverrideClone, slot: Slot): EffectLike[] {
  return blocksOf(ov, slot).flatMap((b) => b.effects ?? []);
}
function allEffects(ov: OverrideClone): EffectLike[] {
  return SLOTS.flatMap((s) => effectsOf(ov, s));
}

/** every prose surface an override may record an unmodeled kit line on */
function proseOf(ov: OverrideClone): string {
  const rec = ov as unknown as Record<string, unknown>;
  const parts: string[] = [];
  const collect = (u: unknown): void => {
    if (!u || typeof u !== 'object') return;
    for (const v of Object.values(u as Record<string, unknown>)) {
      if (Array.isArray(v)) parts.push(...v.map(String));
      else if (typeof v === 'string') parts.push(v);
    }
  };
  collect(rec.unmodeled);
  for (const slot of SLOTS) {
    const raw = rec[slot];
    if (raw && !Array.isArray(raw)) collect((raw as { unmodeled?: unknown }).unmodeled);
  }
  for (const key of ['note', 'caveats']) {
    const v = rec[key];
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) parts.push(...v.map(String));
  }
  return parts.join(' | ').toLowerCase();
}

function run(opts: Comp): RunResult {
  const events: SimEvent[] = [];
  const prevCfg = (opts as unknown as { cfg?: Record<string, unknown> }).cfg ?? {};
  const cfg = {
    ...prevCfg,
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  return { res: runComp({ ...opts, cfg } as Comp), events };
}

const FIXTURE = controlComp('anchor', true);
function withAnchor(patched: OverrideClone): Comp {
  const prev = (FIXTURE as unknown as { overrides?: Record<string, unknown> }).overrides ?? {};
  return { ...FIXTURE, overrides: { ...prev, anchor: patched } } as Comp;
}

const SHIPPED = withPatchedOverride('anchor', (ov) => {
  void ov;
});

const isDef = (e: EffectLike): boolean => e.kind === 'buff' && e.stat === 'defPct';

// ---- counterfactuals (each one is the NEAREST-WRONG model for exactly one kit line) ----
const defAsAtk = withPatchedOverride('anchor', (ov) => {
  for (const e of effectsOf(ov, 'skill1')) if (isDef(e)) e.stat = 'atkPct';
});
const defRemoved = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'skill1')) b.effects = (b.effects ?? []).filter((e) => !isDef(e));
});
const defAsPassive = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'skill1'))
    if ((b.effects ?? []).some(isDef)) b.trigger = { kind: 'passive' };
});
const defAsShotFired = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'skill1'))
    if ((b.effects ?? []).some(isDef)) b.trigger = { kind: 'shotFired' };
});
const skill2Stripped = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'skill2')) b.effects = [];
});
// sensitivity probe: proves a 25.6% Damage-Up buff on anchor WOULD move her total, so the
// "skill2 is board-inert" assertion is a real claim and not an artefact of a numb fixture.
const damageBuffProbe = withPatchedOverride('anchor', (ov) => {
  const target = blocksOf(ov, 'skill1')[0];
  if (target)
    target.effects = [
      ...(target.effects ?? []),
      { kind: 'buff', stat: 'attackDamagePct', value: 25.6 },
    ];
});
const scaleBurst = (ov: OverrideClone, k: number): void => {
  for (const e of effectsOf(ov, 'burst'))
    if (e.kind === 'flatDamage' && typeof e.atkPct === 'number') e.atkPct *= k;
};
const burstHalf = withPatchedOverride('anchor', (ov) => {
  scaleBurst(ov, 0.5);
});
const burstDouble = withPatchedOverride('anchor', (ov) => {
  scaleBurst(ov, 2);
});
const burstAtFbEnter = withPatchedOverride('anchor', (ov) => {
  for (const b of blocksOf(ov, 'burst'))
    if ((b.effects ?? []).some((e) => e.kind === 'flatDamage'))
      b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) ----
const BASE = run(FIXTURE);
const R_DEF_ATK = run(withAnchor(defAsAtk));
const R_DEF_OFF = run(withAnchor(defRemoved));
const R_DEF_PASSIVE = run(withAnchor(defAsPassive));
const R_DEF_SHOT = run(withAnchor(defAsShotFired));
const R_S2_OFF = run(withAnchor(skill2Stripped));
const R_DMG_PROBE = run(withAnchor(damageBuffProbe));
const R_B_HALF = run(withAnchor(burstHalf));
const R_B_DOUBLE = run(withAnchor(burstDouble));
const R_B_FBENTER = run(withAnchor(burstAtFbEnter));

const anchorTotal = (r: RunResult): number => totals(r.res).anchor;
const teammates = (r: RunResult): Record<string, number> => {
  const t: Record<string, number> = { ...totals(r.res) };
  delete t.anchor;
  return t;
};
const defApplies = (r: RunResult): BuffApply[] =>
  r.events
    .filter((e): e is BuffApply => e.kind === 'buffApply')
    .filter((e) => e.stat === 'defPct' && e.targetSlug === 'anchor');

describe('anchor — skill1: DEF ▲ 23.82% for 5 sec (self, on last bullet)', () => {
  it('is encoded as a self defPct buff of 23.82 for 5 sec on the lastBullet trigger', () => {
    const block = blocksOf(SHIPPED, 'skill1').find((b) => (b.effects ?? []).some(isDef));
    expect(block, 'skill1 must carry the DEF ▲ 23.82% self buff').toBeDefined();
    expect(block?.trigger?.kind).toBe('lastBullet');
    expect(block?.target?.kind).toBe('self');
    const eff = (block?.effects ?? []).find(isDef);
    expect(eff?.value).toBeCloseTo(23.82, 5);
    expect(eff?.durationSec).toBe(5);
  });

  it('fires once per magazine — not once per battle (discriminates vs a passive)', () => {
    const perMag = defApplies(BASE).length;
    const asPassive = defApplies(R_DEF_PASSIVE).length;
    // non-vacuity: the fixture really does exercise the trigger, many times over 180s
    expect(perMag).toBeGreaterThanOrEqual(5);
    // the nearest-wrong "start of battle" reading applies it once and never again
    expect(asPassive).toBeLessThanOrEqual(2);
    expect(perMag).toBeGreaterThan(asPassive);
  });

  it('fires once per magazine — not once per shot (discriminates vs shotFired, ammo 6)', () => {
    const perMag = defApplies(BASE).length;
    const perShot = defApplies(R_DEF_SHOT).length;
    expect(perMag).toBeGreaterThan(0);
    // 6-round magazine: a per-shot trigger fires ~6x as often. Band is cadence-free —
    // it only asserts the shipped model is the per-magazine one.
    expect(perShot / perMag).toBeGreaterThan(3);
    expect(perShot / perMag).toBeLessThan(10);
  });

  it('carries SECONDS semantics — not a round count, not permanent', () => {
    const applies = defApplies(BASE);
    expect(applies.length).toBeGreaterThan(0);
    for (const e of applies) {
      expect(e.durationShots).toBeUndefined(); // "for 5 sec", never "for N round(s)"
      expect(Number.isFinite(e.expiresFrame)).toBe(true); // never a permanent self buff
    }
  });

  it('is damage-inert as shipped, yet genuinely live (stat-swap moves the board)', () => {
    // inertness: self DEF changes no damage in v1 (nobody takes damage)
    expect(anchorTotal(R_DEF_OFF)).toBe(anchorTotal(BASE));
    expect(teammates(R_DEF_OFF)).toEqual(teammates(BASE));
    // non-vacuity: the same buff re-stated as ATK ▲ 23.82% DOES move her — so the inertness
    // above is a property of the STAT, not of a buff that never landed.
    expect(anchorTotal(R_DEF_ATK)).toBeGreaterThan(anchorTotal(BASE));
    // and it is self-scoped: teammates never see it under either encoding
    expect(teammates(R_DEF_ATK)).toEqual(teammates(BASE));
  });
});

describe('anchor — skill1: Taunt for 5 sec (the target)', () => {
  it.skip('GAP: taunt/aggro redirection has no engine primitive, and the scope-lock boss deals no damage — unobservable in v1', () => {
    // Requires an enemy aggro/threat model. Nothing to assert until one exists.
  });

  it('is not fabricated as a stun or any damage-bearing effect', () => {
    // A taunt is not a stun (stun suppresses the target\'s own actions); encoding it as one
    // would be an invented mechanic even though it happens to be inert on this boss.
    expect(allEffects(SHIPPED).some((e) => e.kind === 'stun')).toBe(false);
    expect(allEffects(SHIPPED).some((e) => e.kind === 'targetStatus')).toBe(false);
  });

  it('is recorded as a deliberate no-drop rather than silently omitted', () => {
    expect(proseOf(SHIPPED)).toContain('taunt');
  });
});

describe('anchor — skill2: damage to enemy projectiles ▲ 25.6% (start of battle, self)', () => {
  it.skip('GAP: the sim has no enemy-projectile entity, so intercept damage is out of the engine domain', () => {
    // Requires modeling boss projectiles as damageable targets. Not a v1 surface.
  });

  it('is not re-scoped into a generic or RL-flavored damage buff', () => {
    // The trap: "damage dealt to that projectile" reads like an RL line, so the nearest-wrong
    // model is projectileExplosionPct/attackDamagePct 25.6 — which boosts HER OWN rockets, a
    // completely different mechanic that would inflate every normal attack.
    const numeric = allEffects(SHIPPED).filter(
      (e) => e.value === 25.6 || e.atkPct === 25.6,
    );
    expect(numeric).toEqual([]);
    const s2Stats = effectsOf(SHIPPED, 'skill2').map((e) => e.stat);
    expect(s2Stats).not.toContain('projectileExplosionPct');
    expect(s2Stats).not.toContain('attackDamagePct');
    expect(s2Stats).not.toContain('atkPct');
  });

  it('leaves skill2 board-inert, and the check is non-vacuous', () => {
    // stripping skill2 entirely must change nothing at all
    expect(totals(R_S2_OFF.res)).toEqual(totals(BASE.res));
    // sensitivity: a 25.6% Damage-Up buff on anchor WOULD have moved her, so the equality
    // above is a real constraint on the model rather than a numb fixture.
    expect(anchorTotal(R_DMG_PROBE)).toBeGreaterThan(anchorTotal(BASE));
  });

  it('is recorded as a deliberate no-drop rather than silently omitted', () => {
    expect(proseOf(SHIPPED)).toContain('projectile');
  });
});

describe('anchor — burst: 304.45% of final ATK as Burst Skill damage (all enemies)', () => {
  it('is a burstCast flatDamage of 304.45% on the enemy, with no core strike', () => {
    const block = blocksOf(SHIPPED, 'burst').find((b) =>
      (b.effects ?? []).some((e) => e.kind === 'flatDamage'),
    );
    expect(block, 'burst must carry the 304.45% damage instance').toBeDefined();
    expect(block?.trigger?.kind).toBe('burstCast');
    expect(block?.target?.kind).toBe('enemy');
    const hits = (block?.effects ?? []).filter((e) => e.kind === 'flatDamage');
    expect(hits).toHaveLength(1); // one boss => one instance; "all enemies" is not a multiplier
    expect(hits[0]?.atkPct).toBeCloseTo(304.45, 5);
    expect(hits[0]?.core).not.toBe(true); // the kit never says "core strike damage"
  });

  it('actually fires in this fixture and scales exactly linearly with atkPct', () => {
    // Scaling (never removing) the hit keeps the impact COUNT — and therefore burst-gauge
    // generation, rotation and FB timing — byte-identical across all three runs, so the
    // deltas isolate the burst instance itself.
    const up = anchorTotal(R_B_DOUBLE) - anchorTotal(BASE); // = 1.0x the shipped contribution
    const down = anchorTotal(BASE) - anchorTotal(R_B_HALF); // = 0.5x the shipped contribution
    // NON-VACUITY: anchor is a Burst I sharing stage 1 with liter — this fails if she never casts.
    expect(down).toBeGreaterThan(0);
    expect(up / down).toBeCloseTo(2, 4);
  });

  it('does not take the Full Burst major — a burst cast lands before the window opens', () => {
    // Nearest-wrong: keying the damage to fullBurstEnter. That both over-fires (any team FB,
    // including rotations anchor never bursts on) and adds the +50% FB major.
    expect(anchorTotal(R_B_FBENTER)).toBeGreaterThan(anchorTotal(BASE));
  });

  it('burst magnitude is self-contained — teammates unmoved', () => {
    expect(teammates(R_B_DOUBLE)).toEqual(teammates(BASE));
    expect(teammates(R_B_HALF)).toEqual(teammates(BASE));
  });
});

describe('anchor — kit hygiene', () => {
  it('declares no whole-fight Pierce and no unmodelable effect kinds', () => {
    expect((SHIPPED as unknown as { hasPierce?: boolean }).hasPierce).not.toBe(true);
    const kinds = allEffects(SHIPPED).map((e) => e.kind);
    expect(kinds).not.toContain('ignored'); // validator rejects these; skips belong in `unmodeled`
    expect(kinds).not.toContain('unsupported');
  });

  it('models exactly three damage-relevant surfaces: the self DEF buff and the burst hit', () => {
    // Anchor is a Defender whose whole offensive footprint is her weapon + one burst nuke.
    // Anything else in the override is an invention this spec did not derive from the kit.
    const kinds = allEffects(SHIPPED).map((e) => e.kind).sort();
    for (const k of kinds) expect(['buff', 'flatDamage']).toContain(k);
    expect(allEffects(SHIPPED).filter((e) => e.kind === 'flatDamage')).toHaveLength(1);
  });
});
```

# S6 BLIND OVERRIDE (claude-opus-5, scripts/kit-autonomy/blind/anchor.override.json)

DIFF vs the DRIVER override (driver = src/skills/overrides/anchor.json):
- skill1 block: BYTE-IDENTICAL semantics — trigger lastBullet, target self, buff defPct value
  23.82, durationSec 5 (same trigger, target, stat, magnitude, duration).
- skill2: both EMPTY ([]) — the blind author independently refused the scope trap (its caveat:
  "No projectile entity exists at scope lock, so it is unmodeled rather than encoded as a
  generic damage stat — encoding it generically would over-credit every hit") — the same
  rationale the driver and the S2b reviewer (claude-fable-5) gave.
- burst block: BYTE-IDENTICAL semantics — trigger burstCast, target enemy, flatDamage atkPct
  304.45, exactly ONE instance ("all enemies" is not a multiplier on the lone boss).
- unmodeled: SAME two lines carried verbatim (taunt; anti-projectile 25.6%) — the blind entries
  additionally quote each line's activation header; the driver entries quote the effect text.
- Presentation-only differences: the blind file carries a PARSER-BASELINE banner note, a "slug"
  key, and ⚑-flagged caveats (RL cadence tuple unverified; taunt-boss-position assumption; noFb
  left UNSET because burst-cast FB-exemption is engine cast-timing, not a per-kit flag — the
  driver relies on that same engine property and asserts it behaviorally: nukes never carry the
  FB major). No load-bearing divergence on any line.

```json
{
  "slug": "anchor",
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
          "stat": "defPct",
          "value": 23.82,
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 304.45
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates when the last bullet hits the target. Affects the target. Taunt for 5 sec."
    ],
    "skill2": [
      "Activates at the start of battle. Affects self. When attacking an enemy projectile, damage dealt to that projectile ▲ 25.6% continuously."
    ],
    "burst": []
  },
  "caveats": [
    "defPct is offensively inert in v1 (self DEF does not feed any damage bucket). The buff is KEPT per the do-not-skip-DEF/HP/heal rule so a future consumer or scaler sees it; it moves no damage today.",
    "⛑ The skill1 DEF window's uptime is driven entirely by last-bullet frequency, i.e. by the RL cadence tuple (ammo 6 / chargeFrames 60 / reloadFrames 141) — datamine-unreliable, unverified here. Inert while defPct is inert; becomes load-bearing the moment anything consumes DEF.",
    "⛑ Taunt is unmodeled: there is no aggro/threat entity in the sim and the boss range/movement script is a measured constant. If a taunt can alter boss position (and therefore the range band a shot lands in), this omission would be damage-relevant — currently assumed not to be.",
    "⛑ The skill2 anti-projectile Damage ▲ 25.6% is scoped to damage dealt TO an enemy projectile. No projectile entity exists at scope lock, so it is unmodeled rather than encoded as a generic damage stat — encoding it generically would over-credit every hit.",
    "⛑ noFb is NOT set on the burst hit: burst-cast damage is FB-exempt by cast TIMING (it resolves before the Full Burst window opens), which is an engine-level property rather than a per-kit flag; setting noFb here risks a double exemption. Unverified for this unit.",
    "This kit carries exactly ONE damage-bearing line (the burst). Any sim-vs-real magnitude gap on this unit therefore isolates to ATK/base-stat inputs, the RL cadence, or the burst multiplier — not to buff modeling."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⛑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Anchor (anchor) is RL/Wind/Defender/Burst I with a sparse, defence-flavoured kit: only the burst carries damage. skill1 = two last-bullet riders — a 5s enemy Taunt (unmodeled: no aggro/threat model; boss movement is a measured script) and a 5s self DEF ▲ 23.82% (modeled as a defPct self-buff on a lastBullet trigger; offensively inert in v1 but kept per the do-not-skip-DEF rule). skill2 = a battle-start passive raising damage dealt to enemy PROJECTILES by 25.6% — unmodeled, since no projectile entity exists at scope lock and a generic damage stat would over-credit every hit. burst = one instant 304.45%-of-final-ATK hit on burstCast/enemy; no core (the text does not say core strike), no noFb set (burst-cast damage is FB-exempt by cast timing, an engine property), crit left to the engine's rider default. No calibrated or invented values appear anywhere in this file."
}```

# DRIVER IMPLEMENTATION

S2d matrix: RED phase (empty skeleton — FROM-SCRATCH unit) captured 7 failed / 2 vacuous-green
(scripts/kit-autonomy/reviews/anchor.verify.txt); after the S3 encoding the driver spec is
GREEN 9/9. The driver spec uses TWO fixtures: the main soda-style comp (liter B1 / crown B2 /
ada B3 / anchor B1, boss Fire, focus ada) for all kit pins, plus a dedicated SOLO-B1 comp
(anchor / crown / ada) for the burstCast-vs-fullBurstEnter discriminator — in the main fixture
anchor's 4 casts coincide with the 4 team Full Bursts (ada's 40s CD limits both), so the two
keyings are count-indistinguishable there; as the sole B1 anchor casts 8x while the team still
completes only 4 Full Bursts, splitting the keyings 8-vs-4. Driver-discovered cadence fact: the
fixture's liter grants an escalating maxAmmoPct 45.17% team buff, stretching anchor's RL
magazine 6 → 8–9 rounds during its uptime — the S1 cadence pin therefore keys on the engine's
reload events (one per magazine depletion), not a shots÷6 division.

## Driver spec test (scripts/tests/units/anchor.test.ts) — GREEN 9/9

```ts
// PER-UNIT KIT SPEC — `anchor` (Anchor — the RL/Defender/Wind/Burst-I BASE unit, slug
// `anchor`; NOT anchor-innocent-maid, the RL/Water Supporter Burst-II variant. The
// disambiguation lint fired on the shared base name; resolved explicitly to slug=anchor
// (RL/Wind Defender), 2026-08-05). RL ammo 6, reloadFrames 141, chargeFrames 60,
// hitsPerShot 1, burstCooldownSec 20. Kit-autonomy gauntlet 2026-08-05 (test-first
// independent re-derivation). NOTE: this is a FROM-SCRATCH unit — there was no shipped
// override before this gauntlet (simSupported was false), so the harness cannot even load
// her until src/skills/overrides/anchor.json exists. The override was authored as an EMPTY
// SKELETON first (the "shipped" state these tests run RED against), then the faithful S3
// encoding lands GREEN — every assertion pins a kit line and the nearest-wrong
// counterfactual (withPatchedOverride) it must discriminate against.
//
// Kit (blablalink prose, data/characters.json → characters.anchor.skills), max level:
//   S1 ■ last bullet hits → the target: Taunt for 5 sec.                            [L1 UNMODELED]
//      ■ last bullet hits → self: DEF ▲ 23.82% for 5 sec.                           [A1]
//   S2 ■ battle start → self: when attacking an enemy projectile, damage dealt
//        to that projectile ▲ 25.6% continuously.                                   [L3 UNMODELED ⚑]
//   BU ■ all enemies: 304.45% of final ATK as Burst Skill damage.                   [A2]
//
// Modeling posture (full story lands in the override note at S3):
//   * S1 TAUNT: UNMODELED verbatim — enemy aggro manipulation; the sim has no enemy
//     behaviour model (the scope-lock boss deals no damage and has no targeting) and no
//     taunt primitive exists, so it is offensively inert by construction (the soda
//     1-sec-stun precedent).
//   * S1 DEF GRANT: lastBullet → self defPct 23.82, durationSec 5. defPct is
//     INERT-IN-V1 by engine design (self DEF never feeds own damage — the stat exists for
//     the Endurance-cube channel), so the line is event-pinned, not damage-pinned:
//     once per magazine cycle, magnitude, 5s duration, self scope — plus byte-identical
//     totals when the block is removed. Cadence note: the fixture's liter grants an
//     escalating maxAmmoPct 45.17% team buff on her own casts (5s uptime), so anchor's
//     RL magazine STRETCHES from 6 to 8–9 rounds under it — the pin therefore keys on the
//     engine's `reload` events (one per magazine depletion), not a shots÷6 division.
//   * S2 ANTI-PROJECTILE: UNMODELED verbatim, ⚑ OUT-OF-DOMAIN (engine-core) — the sim
//     fields no enemy-projectile entities (missile interception has no target domain in
//     any encoding the sim can field today), so the +25.6% modifier has nothing to act on.
//     Estimate zero; recipe + tier in the override note/caveats.
//   * BURST NUKE: burstCast → enemy flatDamage 304.45, exactly ONE instance — "Affects
//     all enemies" collapses onto the lone partless scope-lock boss (anis-sparkling-summer
//     / privaty-unkind-maid / soda precedent). burstCast-keyed, so the nuke lands BEFORE
//     the Full Burst window and never takes the +50% major (B1 casts at stage 1; helm H7
//     precedent).
//
// UNMODELED inert lines carry NO assertions (documented here + carried verbatim in the
// override's `unmodeled`): L1 taunt (5 sec), S2 +25.6% damage vs enemy projectiles.
//
// FIXTURES (both deterministic — no seed; event-log over totals):
//   MAIN: liter(B1) / crown(B2) / ada(B3) / anchor(B1), boss Fire (anchor is Wind →
//   neutral; Wind holds an advantage only into Iron), focus ada — the soda fixture:
//   anchor alternates Burst I casts with liter (~40s per anchor cast). ada's 40s CD
//   limits the team to 4 Full Bursts, and anchor happens to cast exactly 4 times — a
//   coincidence that makes burstCast-vs-fullBurstEnter COUNT-indistinguishable here,
//   which is what the dedicated SOLO comp below exists to break.
//   SOLO: anchor(B1) / crown(B2) / ada(B3), focus anchor — anchor is the ONLY B1, so
//   she casts on every ~20s gauge cycle (8 casts) while ada's 40s CD still limits the
//   team to 4 Full Bursts: her OWN-cast-keyed nukes (8) provably outnumber the
//   team-FB-keyed counterfactual (4) — the burstCast-vs-fullBurstEnter discriminator.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { data, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'ada', 'anchor'] as const;
/** MAIN comp slot order: liter 0 / crown 1 / ada 2 / anchor 3. */
const ANCHOR = 3;
/** SOLO comp: anchor is the only B1 (the fullBurstEnter discriminator fixture). */
const SOLO_SLUGS = ['anchor', 'crown', 'ada'] as const;
/** RL magazine size from characters.json (data-driven, not hand-typed). */
const AMMO = data.characters['anchor'].ammo;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type Reload = Extract<SimEvent, { kind: 'reload' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}
/** The SOLO-B1 comp (anchor the only B1) — the fullBurstEnter discriminator. */
function runSolo(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SOLO_SLUGS],
    bossElement: 'Fire',
    focusSlug: 'anchor',
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
const anchorShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'anchor');
const anchorCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'anchor');
/** anchor's magazine depletions — one `reload` event per emptied magazine. */
const anchorReloads = (evs: SimEvent[]) =>
  evs.filter((e): e is Reload => e.kind === 'reload' && e.slug === 'anchor');
/** anchor's S1 DEF-grant applications. */
const defApplies = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === ANCHOR && b.stat === 'defPct');
/** anchor's burst nukes. */
const anchorNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'anchor' && d.srcSlot === 'burst');

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) ----------
// PHASE-AWARE GUARD: anchor is FROM-SCRATCH — the RED phase runs against the empty skeleton,
// where there is no block to patch and a counterfactual is (correctly) identical to shipped.
// The helpers therefore throw only when the slot is NON-EMPTY but the block is absent (a
// genuinely stale fixture), and pass through on the empty skeleton (soda/quiry precedent).
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

/** A1 isolation: S1 removed entirely — the DEF grant is damage-inert, so totals must not move. */
const anchorNoS1 = withPatchedOverride('anchor', (ov) => {
  ov.skill1 = [];
});
/** A1 counterfactual: the DEF grant keyed to EVERY shot (shotFired) instead of the magazine's
 *  last bullet — applies ~6× as often. */
const anchorShotFiredS1 = withPatchedOverride('anchor', (ov) => {
  mutateBlock(
    ov,
    'skill1',
    (x: any) => x.effects.some((e: any) => e.stat === 'defPct'),
    (b: any) => {
      b.trigger = { kind: 'shotFired' };
    },
    'anchor S1 defPct block'
  );
});
/** A2 counterfactual: the nuke re-keyed to fullBurstEnter — fires on EVERY team Full Burst
 *  (liter also casts B1), not on anchor's own casts. */
const anchorFbEnterNuke = withPatchedOverride('anchor', (ov) => {
  mutateBlock(
    ov,
    'burst',
    (x: any) => x.effects.some((e: any) => e.kind === 'flatDamage'),
    (b: any) => {
      b.trigger = { kind: 'fullBurstEnter' };
    },
    'anchor burst nuke block'
  );
});
/** A2 counterfactual: the "Affects all enemies" misread as DOUBLE damage on the lone boss —
 *  a second identical nuke block. */
const anchorDoubledNuke = withPatchedOverride('anchor', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (b) {
    ov.burst.push(JSON.parse(JSON.stringify(b)));
    return;
  }
  if (ov.burst.length > 0) {
    throw new Error('anchor burst nuke block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1 = run({ anchor: anchorNoS1 });
const shotFiredS1 = run({ anchor: anchorShotFiredS1 });
const doubledNuke = run({ anchor: anchorDoubledNuke });
/** SOLO-B1 pair — the burstCast-vs-fullBurstEnter discriminator (see FIXTURES). */
const soloBase = runSolo();
const soloFbEnter = runSolo({ anchor: anchorFbEnterNuke });

// ---- derived (base-run) quantities -------------------------------------------------------------
const SHOT_COUNT = anchorShots(base.events).length;
const CAST_COUNT = anchorCasts(base.events).length;

describe('anchor — kit spec', () => {
  it('fixture sanity: anchor empties RL magazines and alternates Burst I casts with liter', () => {
    expect(SHOT_COUNT).toBeGreaterThan(2 * AMMO); // ≥3 magazine depletions
    expect(CAST_COUNT).toBeGreaterThanOrEqual(3);
  });

  describe('A1 — S1: last bullet hits → self DEF ▲23.82% for 5 sec', () => {
    const applied = defApplies(base.events);
    const RELOAD_COUNT = anchorReloads(base.events).length;

    it('fires once per magazine depletion — one application per reload, not per shot', () => {
      // liter's escalating maxAmmoPct stretches her magazine 6 → 8–9 rounds during its 5s
      // uptime, so shots÷ammo is NOT the cycle count; the engine's `reload` events are the
      // one-per-depletion marker.
      expect(applied.length).toBeGreaterThan(0);
      expect(RELOAD_COUNT).toBeGreaterThan(0);
      expect(applied.length).toBe(RELOAD_COUNT);
      expect(applied.length).toBeLessThan(SHOT_COUNT);
    });

    it('is 23.82% for 5 sec, held by anchor alone (self-scoped)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([23.82]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ANCHOR]);
    });

    it("is damage-INERT (defPct is inert-in-v1): removing S1 moves NO unit's total", () => {
      expect(base.totals).toEqual(noS1.totals);
    });

    it('DISCRIMINATING: a shotFired-keyed buff applies on every pull, not per magazine', () => {
      const cf = defApplies(shotFiredS1.events);
      expect(cf.length).toBe(SHOT_COUNT);
      expect(cf.length).toBeGreaterThan(applied.length);
    });
  });

  describe('A2 — burst: 304.45% of final ATK to all enemies, once per own cast, before FB', () => {
    const nukes = anchorNukes(base.events);

    it('fires once per anchor burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(CAST_COUNT);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([304.45]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
      expect([...new Set(nukes.map((d) => d.inFullBurst))]).toEqual([false]);
    });

    it('DISCRIMINATING (SOLO comp): burstCast-keyed fires on HER stalled-cycle casts too — fullBurstEnter-keyed only on team FBs', () => {
      // In the MAIN fixture anchor's 4 casts coincide with the 4 team Full Bursts (ada's
      // 40s CD limits both), so the two keyings are count-indistinguishable there. In the
      // SOLO comp anchor is the ONLY B1: she casts on every ~20s gauge cycle (8 casts) but
      // the team still only completes 4 Full Bursts — the keyings split 8-vs-4.
      const own = anchorNukes(soloBase.events);
      const cf = anchorNukes(soloFbEnter.events);
      const soloCasts = anchorCasts(soloBase.events).length;
      expect(soloCasts).toBeGreaterThan(4); // her casts outrun the FB windows
      expect(own.length).toBe(soloCasts); // burstCast-keyed: one nuke per own cast
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.length).toBeLessThan(own.length); // fullBurstEnter-keyed: one per team FB
    });

    it('DISCRIMINATING: "all enemies" is ONE instance on the lone boss — a doubled block doubles the hits', () => {
      const cf = anchorNukes(doubledNuke.events);
      expect(cf.length).toBe(2 * CAST_COUNT);
    });
  });
});
```

## Driver override (src/skills/overrides/anchor.json)

```json
{
  "note": "Kit-autonomy gauntlet 2026-08-05 — Anchor (slug `anchor`; the RL/Defender/Wind/Burst-I BASE unit, NOT anchor-innocent-maid, the RL/Water Supporter Burst-II variant — disambiguation lint resolved explicitly 2026-08-05). FROM-SCRATCH unit (simSupported was false; the empty-skeleton RED state + test-first spec landed at S2a of this same gauntlet). Independently re-derived + pinned by a 9-assertion spec (scripts/tests/units/anchor.test.ts, A1–A2); cross-family claude-fable-5 S2b converged on all four lines. LINE DISPOSITIONS: (1) S1 'Activates when the last bullet hits the target. Affects self. DEF ▲ 23.82% for 5 sec' = lastBullet → self defPct 23.82, durationSec 5. defPct is INERT-IN-V1 by engine design (self DEF never feeds own damage — the stat exists for the Endurance-cube channel), so the line is event-pinned, not damage-pinned: per-magazine cadence (RL ammo 6 — every 6th shot empties the magazine), magnitude 23.82, wall-clock 5s duration (prose 'for 5 sec', not rounds), self scope, plus byte-identical totals when the block is removed (A1). The trigger fires at magazine depletion (the engine's lastBullet primitive), the standing reading of 'the last bullet hits' (anis-sparkling-summer precedent). (2) S1 'Affects the target. Taunt for 5 sec' = UNMODELED verbatim: enemy aggro manipulation — the sim has no enemy-behaviour model (the scope-lock boss deals no damage and has no targeting) and no taunt primitive exists, so it is offensively inert by construction (soda 1-sec-stun precedent). (3) S2 'Activates at the start of battle. When attacking an enemy projectile, damage dealt to that projectile ▲ 25.6% continuously' = UNMODELED verbatim, ⚑ OUT-OF-DOMAIN (engine-core): the sim fields no enemy-projectile entities (missile interception), so the scoped modifier has no target domain in any encoding the sim can field today. ESTIMATE: zero in every fight the sim can run (the scope-lock boss has no interceptable projectiles; no projectile entities exist). RECIPE: an enemy-projectile entity model + a per-source conditional damage modifier keyed on target kind. TIER: out-of-domain (engine-core). S2b named the nearest-wrong model — a generic passive attackDamagePct/partsDamagePct 25.6 that would silently over-credit ALL of anchor's boss damage for the whole fight; rejected. (4) Burst '304.45% of final ATK as Burst Skill damage, affects all enemies' = burstCast → enemy flatDamage 304.45, exactly ONE instance: 'all enemies' collapses onto the lone partless scope-lock boss (anis-sparkling-summer / privaty-unkind-maid / soda precedent), never multiplied by enemy count. burstCast-keyed, so the nuke lands BEFORE the Full Burst window and never takes the +50% major (B1 casts at stage 1; helm H7 precedent); flatDamage procs crit by engine default. 'final ATK' = the standard flatDamage live-ATK resolution (helm/soda precedent). Kit-autonomy gauntlet 2026-08-05.",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "lastBullet" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "defPct", "value": 23.82, "durationSec": 5 }
      ]
    }
  ],
  "skill2": [],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 304.45 }]
    }
  ],
  "unmodeled": {
    "skill1": ["Taunt for 5 sec."],
    "skill2": [
      "When attacking an enemy projectile, damage dealt to that projectile ▲ 25.6% continuously."
    ],
    "burst": []
  },
  "caveats": [
    "skill1: the taunt half of S1 is unmodeled — enemy aggro manipulation; no taunt primitive and no enemy-behaviour model in the sim, offensively inert by construction",
    "skill1: the defPct grant is inert-in-v1 (self DEF never feeds own damage) — event-pinned at one application per magazine depletion (the RL magazine STRETCHES 6 -> 8-9 rounds under the fixture's liter escalating maxAmmoPct 45.17%; the pin keys on the engine's reload events, not a shots/ammo division), magnitude + duration + scope pinned, damage-neutral",
    "skill2: '+25.6% damage vs enemy projectiles' is ⚑ OUT-OF-DOMAIN (engine-core) — no enemy-projectile entities in the sim; estimate zero in every fight the sim can run; recipe: projectile entity model + scoped modifier",
    "burst: 'Affects all enemies' collapses to ONE instance on the lone partless boss (multi-enemy selection is out of the single-boss scope)"
  ]
}
```
