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


# GROUND TRUTH — Soda (slug `soda`) kit prose + base data (from data/characters.json)

{
  "slug": "soda",
  "name": "Soda",
  "weapon": "MG", "burst": "I", "burstCooldownSec": 20, "class": "Supporter",
  "element": "Fire", "manufacturer": "Tetra",
  "normalAttackMultiplier": 5.57, "coreAttackMultiplier": 200,
  "ammo": 300, "reloadFrames": 171, "chargeFrames": 0, "hitsPerShot": 1,
  "rl3": 3.55, "burstGaugePerShot": 0.05, "treasure": false,
  "skills": {
    "skill1": "■ Activates after 180 normal attack(s). Affects self.\nMaid Spirit: Max HP ▲ 13%, stacks up to 5 time(s) and lasts for 10 sec.",
    "skill2": "■ Affects all allies.\nRestores HP equal to 3.23% of the skill user's final Max HP.\n■ Activates when Maid Spirit is at max stacks. Affects all allies.\nRestores HP equal to 12.71% of the skill user's final Max HP.",
    "burst": "■ Affects 2 enemy unit(s) randomly.\nDeals 321.28% of final ATK as damage.\nStun for 1 sec.\n■ Affects all Fire Code allies.\nStack count of buffs ▲ 1."
  },
  "skillCooldownsSec": { "skill1": null, "skill2": 12, "burst": 20 },
  "skillNames (datamine)": { "skill1": "Spotless Chair", "skill2": "Squeaky Clean Floor", "burst": "Spring Cleaning" },
  "baseStats": { "hp": 15000, "atk": 500, "def": 84, "critRate": 15, "critDamage": 150 },
  "note": "MG fire cadence: the engine drives MG through its measured wind-up ladder to a terminal 60 rounds/s (docs/nikke-mg-windup-model.md); the datamined rate_of_fire 60 is the wind-up START rung. simSupported was false before this gauntlet (FROM-SCRATCH unit). The sim is single-target (one partless boss; no enemy entity, no HP pool, no enemy behaviour)."
}


# S2b REVIEW (claude-fable-5, scripts/kit-autonomy/reviews/soda.test-review.json)

```json
{
  "slug": "soda",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ after 180 normal attack(s) → self",
      "disposition": "FAITHFUL",
      "scope": "Normal-attack counter only (MG rounds; hitsPerShot 1 so pulls == rounds). The Max HP magnitude is a plain stat, not attack-scoped.",
      "durationSemantics": "durationSec: 10 (literal 'lasts for 10 sec' — wall-clock, NOT rounds), maxStacks: 5, refresh-on-reapply. Not permanent, not until-reload.",
      "triggerIdentity": "hitCount count:180 (repeating cumulative-hit counter — fires at 180, 360, 540, …). NOT interval, NOT shotFired.",
      "targetSet": "self only",
      "nearestWrongModel": "A passive/instant-to-max self buff (5 stacks live from t=0, or no durationSec so stacks never lapse) — which silently makes the skill2 max-stacks gate near-permanently satisfied instead of marginal.",
      "distinguishingAssertion": "Filter buffApply stat:'maxHpFlat' targetSlug:'soda': ZERO events before soda's 180th round has fired (correlate with shot events / reloads); each apply carries maxStacks:5 and expiresFrame ≈ applyFrame+600; stacks climbs 1→2→… only as further 180-round thresholds accrue. RED under passive/permanent encodings.",
      "inertness": "Max HP moves no damage directly (Supporter, no atkOfMaxHpPct consumer in her kit) — totals(res)['soda'] must be unchanged when the buff is patched out; only skill2b's gate cadence may move.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Restores HP equal to 3.23% … Max HP",
      "disposition": "FIX",
      "scope": "A heal, not damage — but per the tandem rule it is NOT skippable: heal effects emit recovery events that fire teammates' 'recovery' triggers (crown is in the control fixture and is exactly such a consumer).",
      "durationSemantics": "Instant single heal event per activation (ticks:1 default).",
      "triggerIdentity": "⚑ NO activation clause in the prose → interval trigger with a cadence NOT in the kit text. The interval seconds are an ALWAYS-⚑ field (datamined skill CD required); shipping a silent guess is wrong — must be flagged with recipe.",
      "targetSet": "allies (all, including self)",
      "nearestWrongModel": "Dropped entirely as 'defensive, no damage' (taxonomy trap 4) — killing the recovery-event feed to on-recovery consumers like crown.",
      "distinguishingAssertion": "Run controlComp with crown present: crown's recovery-gated buffApply events occur at soda's skill2 cadence; re-run with withPatchedOverride('soda', o => { o.skill2 = []; }) and those crown buffApply events drop/thin. GREEN only if the heal block exists and targets all allies. (heal/recovery are not onEvent kinds — the downstream consumer's buffApply IS the observable.)",
      "inertness": "Must add zero damage of its own — no damage events with soda srcSlot skill; soda's own total unchanged by the heal block in a comp with no recovery consumer.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ when Maid Spirit is at max stacks",
      "disposition": "FIX",
      "scope": "Second, larger heal (12.71% of caster Max HP) — same tandem relevance as skill2a.",
      "durationSemantics": "Instant heal event per qualifying activation.",
      "triggerIdentity": "Gated on skill1's stack state: fires only while/when Maid Spirit == 5 stacks. Natural encoding: a resource pool mirroring Maid Spirit stacks + resourceGate {min:5} on the heal block (or the max-stack apply event itself as the trigger). NOT an independent ungated interval.",
      "targetSet": "allies (all)",
      "nearestWrongModel": "Ungated — a second interval heal that fires regardless of stack state (over-crediting recovery-event cadence to on-recovery consumers), or conversely a gate wired to a stack pool that never reaches 5 so the line is silently dead.",
      "distinguishingAssertion": "With withPatchedOverride('soda', o => { o.skill1 = []; }) (no Maid Spirit stacks ever), the 12.71%-block's downstream recovery-consumer buffApply events must VANISH while the 3.23% block's persist. RED under the ungated misread (events persist) and detects the dead-gate misread in the baseline run (zero events ever despite stacks reaching 5).",
      "inertness": "No damage events; no effect on any unit's totals absent a recovery consumer.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ 2 enemy unit(s) randomly → 321.28%",
      "disposition": "FAITHFUL",
      "scope": "Instant burst-cast damage, % of final ATK. Solo-raid boss is ONE enemy: a '2 random enemy units' selection lands ONE instance on the single boss — distinct-unit selection, not two hits on the same target.",
      "durationSemantics": "Instant, per burst cast.",
      "triggerIdentity": "burstCast (soda's OWN Burst I cast) — never fullBurstEnter. Burst-cast damage lands PRE-FB: no +50% Full Burst major, no FB-entry auras (measured house rule; burst-cast/instant damage is always FB-exempt).",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "Two stacked wrongs to distinguish: (a) doubling to 2×321.28% because the prose says '2 units' (one boss = one instance); (b) letting the hit ride the +50% FB bonus / keying it to fullBurstEnter (any team FB) instead of her own cast.",
      "distinguishingAssertion": "Per soda burstCast event, EXACTLY ONE damage event with mult 321.28 in the burst bucket, with inFullBurst false / fbMajorApplied false; count of these damage events == count of soda's burstCast events (never 2× per cast, never fired on FBs she didn't cast).",
      "inertness": "Zero such damage events on rotations where soda does not cast (e.g. when the other Burst I unit takes the slot).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Stun for 1 sec.",
      "disposition": "UNMODELED",
      "scope": "Enemy-targeted crowd control.",
      "durationSemantics": "1 sec.",
      "triggerIdentity": "Rides the burst cast.",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "Applying the stun EffectDef anyway (it exists for ALLY-side disable — 'target can't fire/charge/reload'); on the boss it has no entity to act on (resolveTargets enemy → []) and any encoding is dead weight or a mis-target.",
      "distinguishingAssertion": "No engine-visible observable exists or should exist: no buffApply, no shot-cadence change on any unit attributable to this line. Belongs verbatim in unmodeled.burst.",
      "inertness": "Must move nothing — all five units' totals identical with the line present vs absent.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "■ all Fire Code allies: Stack count ▲ 1",
      "disposition": "GAP",
      "scope": "A meta-effect: increments the STACK COUNT of already-held stackable buffs on Fire-element allies by 1 (capped at each buff's maxStacks). It is not itself a stat buff.",
      "durationSemantics": "Instant one-shot increment per burst cast; the incremented buff keeps its own duration.",
      "triggerIdentity": "burstCast (her own burst), target alliesOfElement Fire.",
      "targetSet": "alliesOfElement element:'Fire' (soda herself qualifies — her own Maid Spirit is the obvious in-kit recipient).",
      "nearestWrongModel": "Encoding it as a generic stat buff on Fire allies (a phantom atkPct/maxHpPct application), or as a fresh full application of Maid Spirit that REFRESHES duration/re-arms windows rather than incrementing an existing instance's stack count.",
      "distinguishingAssertion": "The effect schema has NO stack-increment EffectDef — so the faithful v1 disposition is unmodeled-verbatim. Assertion: on soda's burstCast, ZERO new buffApply events targeting Fire allies from her burst slot (phantom-buff detector). If a future primitive lands: soda's live Maid Spirit stacks jump +1 (e.g. 3→4) at cast WITHOUT a reset of expiresFrame.",
      "inertness": "With no engine primitive, the line must move no totals and emit no events; it must not be silently dropped from the record either.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:Maid Spirit 180-hit Max-HP stack buff",
    "skill2:3.23% caster-Max-HP heal (all allies, ⚑ interval)",
    "skill2:12.71% heal gated on Maid Spirit max stacks",
    "burst:321.28% burst-cast damage on the boss"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Stun for 1 sec.",
      "Stack count of buffs ▲ 1."
    ]
  },
  "notes": "Three things the driver must reconcile. (1) BURST ELIGIBILITY IN THE FIXTURE: soda is Burst I and controlComp fixes liter in B1 — with two B1 units, first-ready in-window selection decides who casts, so the burst-damage assertions are only meaningful if the test first proves soda's burstCast events actually occur (count them; if liter always wins the slot, the comp must be arranged so soda casts). A test that asserts burst damage without confirming she ever casts is vacuously green under a missing burst block. (2) MAX-STACKS REACHABILITY IS EMERGENT AND MARGINAL — a shared-prior misread hotspot: 5 stacks needs the 180-round counter to re-fire within each 10s window across a 300-round belt and a 171-frame (~2.85s) reload, plus MG wind-up; whether the skill2b gate EVER opens must be read off the engine's actual cadence, not assumed either way. The distinguishing tests above are constructed to detect both the never-fires and the always-fires encodings. (3) The skill2a cadence is an ALWAYS-⚑ field (no activation clause in the prose): the interval seconds must be flagged with a datamined-CD recipe, never shipped as a silent guess. Also note the heal magnitudes (3.23%/12.71% of caster final Max HP) are inherently amount-less in the engine's heal primitive — the observable is the recovery EVENT feed (crown-class consumers), which is why skill1's Max-HP buff stays in the model as a documented future-consumer stat even though it moves no damage today.",
  "model": "claude-fable-5"
}

```

# S5 BLIND TEST (claude-opus-5, scripts/kit-autonomy/blind/soda.test.ts)

STATUS vs the DRIVER override: GREEN — 13 passed, 3 skipped (the 3 skips are the blind author's own GAP annotations: 2-random-enemies 1-vs-2-instance authoring choice, stun has no enemy entity, no stack-increment primitive). Adapted file (mechanical path/typing fixes only) at scripts/kit-autonomy/blind/soda.adapted.test.ts.

```ts
/**
 * soda — MG / Fire / Supporter / Burst I. BLIND kit spec test, written from the kit prose alone
 * (no sight of the driver override, the driver tests, or any truth file).
 *
 * KIT (paraphrased; quotes kept short)
 *  S1   'Activates after 180 normal attack(s)' — self. Maid Spirit: Max HP ▲13%, up to 5 stacks, 10 sec.
 *  S2a  all allies, restores HP = 3.23% of the skill user final Max HP. NO activation clause.
 *  S2b  'when Maid Spirit is at max stacks' — all allies, restores 12.71% of the user final Max HP.
 *  B    2 random enemies: 321.28% of final ATK, plus Stun 1 sec; all Fire Code allies: buff stack count ▲1.
 *
 * FIXTURES AND WHY
 *  - control = controlComp('soda', true) → liter B1 / crown B2 / soda / helm B3, Fire boss, focus soda.
 *    Heals carry no HP amount in this engine and emit no dedicated event kind, so a heal is observable
 *    ONLY through a consumer: crown carries an on-recovery block, so soda heals show up as a change in
 *    the run buffApply stream. That tandem channel is what the S2 group reads.
 *  - burst fixture: soda is Burst I and the control fixture already seats liter (also B1, earlier slot)
 *    so soda never casts her own burst there and every burst assertion would be vacuous. The burst group
 *    therefore appends an in-memory burstEligibility stage-3 block so she takes the B3 slot ahead of helm
 *    and actually casts. Both burst runs carry that same block, so every comparison is WITHIN the fixture
 *    and the added block cannot flatter the result.
 *
 * SLOT INDEX: resolved at runtime from a buffApply that targets soda (liter/crown buff all allies), so
 * no hard-coded team ordering is assumed.
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

// ------------------------------------------------------------------ event views
interface BuffApplyEv {
  kind: 'buffApply';
  stat: string;
  key?: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
}
interface DamageEv {
  kind: 'damage';
  bucket: string;
  srcSlot: number;
  inFullBurst?: boolean;
  fbMajorApplied?: boolean;
}

const buffApplies = (evs: SimEvent[]): BuffApplyEv[] =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyEv[];

// ------------------------------------------------------------- override access
// The loaded OverrideFile is slot-keyed; a slot is either a raw Block[] or a
// CharacterSkills carrying .blocks. Both are handled, and every patch below mutates
// the array IN PLACE so the shape question never matters.
type Slot = 'skill1' | 'skill2' | 'burst';
function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

// withPatchedOverride hands back a deep clone of the committed JSON — capturing it
// is a read of the shipped override (disk untouched).
let committed: any;
withPatchedOverride('soda', (ov: any) => {
  committed = ov;
});

// -------------------------------------------------------------------- the runner
function run(patch?: (ov: any) => void) {
  const evs: SimEvent[] = [];
  const push = (e: SimEvent) => {
    evs.push(e);
  };
  const opts = controlComp('soda', true) as any;
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: push };
  opts.onEvent = push;
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      soda: withPatchedOverride('soda', patch),
    };
  }
  const res = runComp(opts);
  return { res, evs, total: totals(res) as Record<string, number> };
}

const addBurstEligibility = (ov: any) => {
  blocksOf(ov, 'burst').push({
    slot: 'burst',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstEligibility', stage: 3 }],
  });
};

const stripBurstDamage = (ov: any) => {
  const bs = blocksOf(ov, 'burst');
  const kept = bs
    .map((b: any) => ({
      ...b,
      effects: (b.effects ?? []).filter(
        (e: any) =>
          e.kind !== 'flatDamage' &&
          e.kind !== 'hitRepeat' &&
          e.kind !== 'dot' &&
          e.kind !== 'storedHit',
      ),
    }))
    .filter((b: any) => b.effects.length > 0);
  bs.splice(0, bs.length, ...kept);
};

// ------------------------------------------------------------- runs (5, hoisted)
const base = run();
const doubled = run((ov) => {
  for (const b of blocksOf(ov, 'skill1'))
    for (const e of b.effects ?? [])
      if (e.kind === 'buff' && typeof e.value === 'number') e.value *= 2;
});
const noHeals = run((ov) => {
  blocksOf(ov, 'skill2').splice(0);
});
const burstFix = run(addBurstEligibility);
const burstFixNoDamage = run((ov) => {
  stripBurstDamage(ov);
  addBurstEligibility(ov);
});

const sodaIdx = (() => {
  const hit = buffApplies(base.evs).find(
    (e) => e.targetSlug === 'soda' && e.targetIdx !== null && e.targetIdx !== undefined,
  );
  if (!hit)
    throw new Error('fixture problem: no buffApply targeted soda, cannot resolve her slot index');
  return hit.targetIdx as number;
})();

function damageOf(res: any, evs: SimEvent[], idx: number): DamageEv[] {
  const all = evs.filter((e) => e.kind === 'damage') as unknown as DamageEv[];
  const mine = all.filter((e) => (e as any).srcSlot === idx);
  if (mine.length > 0) return mine;
  // fallback if srcSlot is not the team-slot index in this build
  const row: any = unitOf(res, 'soda');
  return ((row?.events ?? []) as any[]).filter((e) => e.kind === 'damage') as DamageEv[];
}

const spiritOf = (evs: SimEvent[]) =>
  buffApplies(evs).filter(
    (e) =>
      e.stat === 'maxHpFlat' &&
      e.targetSlug === 'soda' &&
      e.casterIdx === sodaIdx &&
      e.targetIdx === sodaIdx,
  );

// =============================================================================
describe('soda — override shape (no silent drops)', () => {
  it('declares all three skill slots with at least one block each', () => {
    expect(blocksOf(committed, 'skill1').length).toBeGreaterThan(0);
    expect(blocksOf(committed, 'skill2').length).toBeGreaterThan(0);
    expect(blocksOf(committed, 'burst').length).toBeGreaterThan(0);
  });

  it('records the burst lines it cannot model in unmodeled.burst', () => {
    // Stun on the boss has no enemy entity to land on, and there is no primitive that
    // raises another buff stack count — at least one of those two must be written down
    // rather than silently dropped.
    const um = committed?.unmodeled?.burst ?? [];
    expect(Array.isArray(um)).toBe(true);
    expect(um.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
describe('soda S1 — Maid Spirit: 180 normal attacks, self, Max HP ▲13%, 5 stacks, 10 sec', () => {
  const spirit = spiritOf(base.evs);

  it('fires on a hit-count cadence — not once at t=0, and not once per shot', () => {
    // Discriminates the trigger identity. A passive/self mis-model applies exactly once
    // (length 1); a shotFired mis-model applies thousands of times; hitCount:180 over an
    // MG belt economy (300 ammo, ~10 magazines in 180 s) lands roughly 10-20 times.
    expect(spirit.length).toBeGreaterThan(1);
    expect(spirit.length).toBeLessThan(40);
  });

  it('declares a 5-stack cap and never exceeds it', () => {
    expect(spirit[0].maxStacks).toBe(5);
    const peak = Math.max(...spirit.map((e) => e.stacks ?? 1));
    expect(peak).toBeGreaterThanOrEqual(1);
    expect(peak).toBeLessThanOrEqual(5);
  });

  it('is a 10-second timed window — not a round-count buff and not permanent', () => {
    // Taxonomy trap 2. durationShots set would mean the window was read as N rounds.
    expect(spirit[0].durationShots ?? undefined).toBeUndefined();
    // A permanent/whole-fight encoding parks expiresFrame past the end of the fight and
    // never advances; a real 10 s window re-arms 600 frames past each application.
    for (let i = 1; i < spirit.length; i++) {
      expect(spirit[i].expiresFrame as number).toBeGreaterThan(
        spirit[i - 1].expiresFrame as number,
      );
    }
    const last = spirit[spirit.length - 1];
    expect(last.expiresFrame as number).toBeLessThanOrEqual(180 * 60 + 601);
  });

  it('grants to self only — no teammate receives Max HP from soda', () => {
    const leaked = buffApplies(base.evs).filter(
      (e) => e.casterIdx === sodaIdx && e.targetIdx !== sodaIdx && e.stat === 'maxHpFlat',
    );
    expect(leaked).toHaveLength(0);
  });

  it('magnitude is caster-scaled, and the whole line is offensively inert', () => {
    // Doubling the authored percentage must exactly double the flat-resolved Max HP grant
    // (proves the emitted value is (kit%/100) x her own Max HP and is read from the override),
    // while moving ZERO damage anywhere: soda has no HP->ATK conversion and no unit in the
    // control comp scales off Max HP. Nearest-wrong: routing the line through an ATK-ish
    // stat, which would move her total here.
    const dbl = spiritOf(doubled.evs);
    expect(dbl.length).toBeGreaterThan(0);
    expect(dbl[0].value).toBeCloseTo(spirit[0].value * 2, 6);
    expect(doubled.total).toEqual(base.total);
  });
});

// =============================================================================
describe('soda S2 — ally heals (flat line, plus a max-stack-gated line)', () => {
  const healBlocks = blocksOf(committed, 'skill2').filter((b: any) =>
    (b.effects ?? []).some((e: any) => e.kind === 'heal'),
  );

  it('heals ALL allies, not self only', () => {
    // Target set question. Kit says Affects all allies for both lines.
    expect(healBlocks.length).toBeGreaterThanOrEqual(1);
    for (const b of healBlocks) {
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
  });

  it('models BOTH heal lines, with the second one conditioned', () => {
    // Nearest-wrong: encoding the 12.71% max-stack heal as a second unconditional heal on
    // the same cadence, which over-fires every on-recovery consumer in the team. Any real
    // condition counts (a resource/stack gate, an everyN proxy, or a distinct trigger).
    expect(healBlocks.length).toBeGreaterThanOrEqual(2);
    const conditioned = (b: any) =>
      Boolean(
        b.resourceGate ||
          b.everyN ||
          b.requiresTargetStatus ||
          b.fbGate ||
          b.ownBurstGate ||
          b.requiresCore ||
          b.swapGate,
      );
    const distinctTriggers = new Set(healBlocks.map((b: any) => JSON.stringify(b.trigger))).size;
    expect(healBlocks.some(conditioned) || distinctTriggers > 1).toBe(true);
  });

  it('the heals actually reach a consumer — removing S2 changes the run', () => {
    // Tandem check (taxonomy 4): a heal is inert on isolation but crown carries an
    // on-recovery block, so soda heals must show up downstream. If deleting every S2 block
    // changes nothing at all, the heal lines are either missing or wired to nothing.
    const withHeals = buffApplies(base.evs).length;
    const without = buffApplies(noHeals.evs).length;
    const changed =
      without !== withHeals || JSON.stringify(noHeals.total) !== JSON.stringify(base.total);
    expect(changed).toBe(true);
  });
});

// =============================================================================
describe('soda burst — 321.28% to 2 random enemies, stun 1 sec, Fire allies stack count ▲1', () => {
  const dmgWith = damageOf(burstFix.res, burstFix.evs, sodaIdx);
  const dmgWithout = damageOf(burstFixNoDamage.res, burstFixNoDamage.evs, sodaIdx);
  const bucketsWith = new Set(dmgWith.map((e) => e.bucket));
  const bucketsWithout = new Set(dmgWithout.map((e) => e.bucket));
  const removed = [...bucketsWith].filter((b) => !bucketsWithout.has(b));

  it('books the burst hit in its own bucket, separate from her MG normals', () => {
    // Non-vacuity plus bucket placement in one: exactly one damage bucket must vanish when
    // the burst damage effect is stripped. Zero buckets removed means she never cast (the
    // eligibility fixture failed) or the line is missing; more than one means the burst hit
    // is bleeding into the normal-attack bucket.
    expect(dmgWith.length).toBeGreaterThan(0);
    expect(removed).toHaveLength(1);
  });

  it('burst-cast damage is Full-Burst exempt', () => {
    // Verified project fact: burst-cast damage lands BEFORE Full Burst begins, so it never
    // takes the +50% major. Nearest-wrong: keying the damage to fullBurstEnter instead of
    // the owner cast, which would stamp fbMajorApplied on every instance.
    const burstDmg = dmgWith.filter((e) => e.bucket === removed[0]);
    expect(burstDmg.length).toBeGreaterThan(0);
    for (const e of burstDmg) expect(e.fbMajorApplied ?? false).toBe(false);
  });

  it('removing the burst damage effect lowers her total', () => {
    expect(burstFix.total['soda']).toBeGreaterThan(burstFixNoDamage.total['soda']);
  });

  it.skip('⚑ 2 enemy unit(s) randomly against a single-target boss: 1 instance or 2 per cast is a flagged authoring choice, and damage events carry no frame field to group instances per cast — the override note must state which reading it took', () => {});

  it.skip('GAP: Stun for 1 sec — the stun primitive targets a NIKKE and the sim has no enemy entity (enemy targets resolve to an empty set), so a boss stun has no observable', () => {});

  it.skip('GAP: all Fire Code allies Stack count of buffs ▲1 — no effect kind increments an existing buff stack count (maxStacks is per-buff and static), so the line has no primitive', () => {});
});

```

# S6 BLIND OVERRIDE (claude-opus-5, scripts/kit-autonomy/blind/soda.override.json)

DIFF vs the DRIVER override (driver = scripts/kit-autonomy/../../src/skills/overrides/soda.json):
- CONVERGED: S1 = hitCount 180 / self / Max HP 13% / maxStacks 5 / durationSec 10 (blind chose stat maxHpPct; driver chose the kit-literal targetMaxHpPct — both damage-inert for soda); S2 = two heal blocks targeting all allies with the second one conditioned; burst nuke = burstCast-keyed flatDamage on the enemy.
- DIVERGED (1) S2 cadence: blind interval 20s (INVENTED, self-flagged) vs driver interval 12s = datamined skillCooldownsSec.skill2; (2) rider gate: blind hitCount 900 (fires once per 900 hits, re-keyed to hit cadence) vs driver resourceGate {maidSpirit min:5} on the same 12s interval (fires every S2 tick while stacks are maxed, can re-close); (3) nuke multiplicity: blind 642.56 = 2x321.28 (both random picks onto the lone boss) vs driver single 321.28 instance (anis-sparkling-summer / privaty-unkind-maid single-boss-collapse precedent; S2b named 2x the nearest-wrong model); (4) Fire-ally stack-amp: blind unmodeled-verbatim (whole line) vs driver self-slice modeled (+1 maidSpirit pool per own cast, owner precedent: "the self-slice is the honest in-scope model") with the cross-ally slice flagged engine-core; (5) blind additionally authored crit:true + noRange:true + a stun effect on the enemy (no engine observable) where the driver keeps defaults and unmodels the stun.

```json
{
  "slug": "soda",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 180
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "maxHpPct",
          "value": 13,
          "durationSec": 10,
          "maxStacks": 5
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
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 900
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
          "atkPct": 642.56,
          "crit": true,
          "noRange": true
        },
        {
          "kind": "stun",
          "durationSec": 1
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Restores HP equal to 3.23% of the skill user's final Max HP.",
      "Restores HP equal to 12.71% of the skill user's final Max HP."
    ],
    "burst": [
      "Stack count of buffs ▲ 1."
    ]
  },
  "caveats": [
    "⚑ skill1 hitCount 180 counts ROUNDS, not trigger pulls — an MG at hitsPerShot 1 makes rounds == pulls here, so 180 rounds ≈ 180 shots; if hitsPerShot is ever >1 the cadence changes. Stack cadence (how fast 5 stacks accrue and whether the 10s window survives between refills) is UNMEASURED.",
    "⚑ skill1 Max HP ▲ 13% ×5 is offensively INERT at scope lock unless a teammate converts Max HP to ATK; it is modeled as maxHpPct (self) so a future atkOfMaxHpPct consumer sees it. It does NOT feed an ally's conversion (e3 rule).",
    "⚑ skill2 line 1 has NO activation clause in the kit text — trigger INVENTED as interval 20s (the unit's listed burst cooldown, the only cadence number the kit gives). This is a pure guess; the real cadence must be read from footage (count green heal popups per minute).",
    "⚑ skill2 line 2 fires 'when Maid Spirit is at max stacks' — modeled as hitCount 900 (5 × the 180-hit stack threshold, i.e. the shot count at which the 5th stack lands). This re-fires every 900 cumulative rounds, which is a crude proxy: the real line is a state gate on a decaying 5-stack pool, not a hit counter. If the stacks lapse (10s window) it should re-fire on each fresh climb to 5.",
    "⚑ Both skill2 heals are modeled as HP-less 'heal' events (the engine models no HP pool). Their only live effect is firing teammates' 'recovery' triggers (crown-style on-recovery consumers) — the 3.23%/12.71% magnitudes are recorded for completeness only.",
    "⚑ burst 321.28% 'Affects 2 enemy unit(s) randomly' — the scope-lock boss is a SINGLE partless target. Modeled as 642.56% (2 × 321.28) on the assumption both random picks resolve onto the one enemy. If the game instead lands only one instance on a solo target, this OVER-CREDITS by 2×. Recipe: focus-record Soda's burst and read the popup count/value (one 321% popup vs two).",
    "⚑ burst damage is burstCast-triggered, so it lands BEFORE the Full Burst window opens (verified fact: burst-cast damage takes no +50% FB major and no entry auras). noRange:true per the rider convention; crit:true at the caster's sheet rate; no core (the text says no core strike).",
    "⚑ burst 'Stack count of buffs ▲ 1' (all Fire Code allies) is NOT MODELED — the schema has no cross-unit stack-count primitive; it would need to add +1 stack to every stacking buff held by Fire allies, including Soda's own Maid Spirit. On a Fire-heavy team this is a real damage effect and this override under-credits it. Recipe: A/B a Fire comp with a stacking-buff carrier (e.g. a 5-stack ATK stacker) and compare their popup values with vs without Soda bursting.",
    "⚑ Stun 1s on the boss is recorded for kit completeness; the scope-lock boss's fire/movement script is not modeled as interruptible, so it is inert on damage."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Soda (soda) is an MG/Fire/Supporter/Burst I whose entire kit is sustain + a stack-count grant: S1 self-stacks Max HP (offensively inert at scope lock, kept as maxHpPct so a future HP→ATK consumer reads it), S2 is two heal lines whose only modeled effect is firing allies' on-recovery triggers, and the burst is a 321.28%×2-target instant hit plus a 1s stun and a +1 buff-stack-count grant to Fire allies. The burst's multi-target resolution against a single boss and the +1 stack-count line are the two load-bearing unknowns: the first is modeled optimistically (2× on one target) and the second is not modeled at all, so on a Fire-stacking team this override is directionally LOW on team damage and possibly HIGH on Soda's own burst. S2's first heal line carries no activation clause at all — its 20s interval is invented and must be pinned from footage before any tuning rests on it.",
  "hasPierce": false
}
```

# DRIVER IMPLEMENTATION

## Driver spec test (scripts/tests/units/soda.test.ts) — GREEN 20/20

```ts
// PER-UNIT KIT SPEC — `soda` (Soda — the MG/Supporter/Fire/Burst-I BASE unit, slug `soda`;
// NOT soda-twinkling-bunny, the SG/Iron variant. Disambiguation lint fired on the shared base
// name; resolved explicitly to slug=soda (MG/Fire), 2026-08-05). MG ammo 300, reloadFrames 171,
// burstCooldownSec 20, hitsPerShot 1. Kit-autonomy gauntlet 2026-08-05 (test-first
// re-derivation). NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this
// gauntlet (simSupported was false), so the harness cannot even load her until
// src/skills/overrides/soda.json exists. The override was authored as an EMPTY SKELETON first
// (the "shipped" state these tests run RED against), then the faithful S3 encoding lands GREEN —
// every assertion pins a kit line and the nearest-wrong counterfactual (withPatchedOverride) it
// must discriminate against.
//
// Kit (blablalink prose, data/characters.json → characters.soda.skills), max level:
//   S1 ■ after 180 normal attacks → self:
//        Maid Spirit: Max HP ▲ 13%, stacks up to 5 time(s), lasts 10 sec.              [SD1/SD2]
//   S2 ■ 12s-CD skill, all allies:
//        Restores HP equal to 3.23% of the skill user's final Max HP.                   [SD3]
//      ■ when Maid Spirit is at max stacks, all allies:
//        Restores HP equal to 12.71% of the skill user's final Max HP.                  [SD4]
//   BU ■ 2 random enemies: 321.28% of final ATK as damage. Stun for 1 sec.             [SD5 / stun UNMODELED]
//      ■ all Fire Code allies: Stack count of buffs ▲ 1.                               [SD6 self-slice / cross-ally ⚑]
//
// Modeling posture (full story lands in the override note at S3):
//   * S1 is a hit-count COUNTER (hitCount 180 — hitsPerShot 1, so hits == trigger pulls) granting
//     a SELF targetMaxHpPct 13% buff, maxStacks 5, durationSec 10. The kit's stackable Max HP is
//     additionally MIRRORS into a `maidSpirit` resource pool (+1 per proc) — the pool is the only
//     gate-able state in the engine, and S2's "Maid Spirit at max stacks" clause reads it
//     (resourceGate min:5). Pool is MONOTONIC (resources never decay) while the real stacks carry
//     a 10s per-stack expiry: divergence only possible in >10s firing gaps, which the sustained
//     MG fixture never produces — the same documented divergence class as soda-twinkling-bunny's
//     Golden-Chip pool (kit-status, 2026-07-17). The buff is damage-INERT for soda (she has no
//     atkOfMaxHpPct conversion) but is event-pinned, not dropped.
//   * S2's heals are the recovery EVENT channel only — the engine models no HP pool, so the
//     3.23% / 12.71%-of-final-Max-HP magnitudes ride verbatim in the override note, not fudged.
//     Observable through crown's "when recovery takes effect → all allies Attack Damage ▲20.99%/7s"
//     consumer (the fixture's consumer; crown's own hitCount-860 self-heal is stripped for
//     isolation, helm-test precedent). Hard rule 2: never drop a heal.
//   * The burst nuke collapses "2 random enemy unit(s)" onto the lone partless boss (anis-ss /
//     privaty-unkind-maid precedent), burstCast-keyed so it lands BEFORE the Full Burst window
//     and never takes the +50% major (B1 casts at stage 1; helm H7 precedent). The 1-sec STUN is
//     UNMODELED verbatim: enemy CC — the sim has no enemy behaviour model and the boss deals no
//     damage, so it is offensively inert by construction.
//   * "All Fire Code allies: Stack count of buffs ▲ 1": the SELF slice is modeled (soda is Fire
//     Code; her own stackable buff is Maid Spirit, so her burst adds +1 maidSpirit pool and one
//     Max-HP stack). The CROSS-ALLY slice — +1 stack onto each Fire ally's OWN stackable buffs —
//     is ⚑ OUT-OF-DOMAIN (engine-core): no engine primitive "bump each target's stackable buffs
//     by N" exists (pepper ⚑4 / mica-snow-buddy ⚑M5 precedent, kit-status line 5880 — "the
//     self-slice is the honest in-scope model").
//
// FIXTURE: liter(B1) / crown(B2) / ada(B3) / soda(B1), boss Fire (soda is Fire → neutral, no
// element major on her lines), focus ada. The control core minus helm, with soda as a SECOND
// Burst I (she alternates casts with liter, ~42s per soda cast) and crown as the recovery
// CONSUMER. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'crown', 'ada', 'soda'] as const;
/** slot order: liter 0 / crown 1 / ada 2 / soda 3. */
const CROWN = 1;
const SODA = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

/** crown's own hitCount-860 self-heal would fire her recovery consumer from HER kit — stripped
 *  so every recovery firing in the fight is attributable to soda's S2 (helm-test isolation). */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides: { crown: crownNoHeal, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const sodaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'soda');
const sodaCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'soda');

/** soda's Maid Spirit Max-HP stack applications (S1 hit-count procs + burst self-slice). */
const maidSpiritApplies = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === SODA && b.stat === 'maxHpFlat');

/** crown's recovery consumer: one buffApply per (recovery event × 4 allies). Distinct frames =
 *  distinct recovery FIRINGS; per-frame count = 4 × (recovery events that frame). */
const crownAdApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === CROWN &&
      b.stat === 'attackDamagePct' &&
      b.value === 20.99
  );
const perFrame = (applies: BuffApply[]) => {
  const m = new Map<number, number>();
  for (const b of applies) {
    m.set(b.frame, (m.get(b.frame) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, z) => a[0] - z[0]);
};

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) ----------
// PHASE-AWARE GUARD: soda is FROM-SCRATCH — the RED phase runs against the empty skeleton, where
// there is no block to patch and a counterfactual is (correctly) identical to shipped. The
// helpers therefore throw only when the slot is NON-EMPTY but the block is absent (a genuinely
// stale fixture), and pass through on the empty skeleton (quiry precedent).
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

/** SD1 counterfactual: the counter threshold halved (90) — a "180 normals" misread that fires
 *  twice as often. */
const sodaHalfThreshold = withPatchedOverride('soda', (ov) => {
  mutateBlock(
    ov,
    'skill1',
    (x: any) => x.trigger.kind === 'hitCount',
    (b: any) => {
      b.trigger.count = 90;
    },
    'soda S1 hitCount block'
  );
});
/** SD2 isolation: S1 removed entirely — Maid Spirit contributes nothing to damage. */
const sodaNoS1 = withPatchedOverride('soda', (ov) => {
  ov.skill1 = [];
});
/** SD2 counterfactual: hand soda an HP→ATK conversion she does NOT have — her own-kit maxHpFlat
 *  now feeds it, proving the inertness is her kit's property, not a dead engine channel. */
const sodaWithHpConversion = withPatchedOverride('soda', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'atkOfMaxHpPct', value: 10 }],
  });
});
/** SD3 counterfactual: the heal cadence doubled (6s interval instead of the 12s CD). */
const sodaS2Fast = withPatchedOverride('soda', (ov) => {
  for (const b of ov.skill2) {
    if (b.trigger.kind === 'interval') {
      b.trigger.sec = 6;
    }
  }
  if (ov.skill2.length === 0) {
    return; // skeleton phase
  }
});
/** SD3 isolation: S2 removed entirely — crown loses the recovery-driven Attack Damage uptime. */
const sodaNoS2 = withPatchedOverride('soda', (ov) => {
  ov.skill2 = [];
});
/** SD4 counterfactual: the "Maid Spirit at max stacks" gate dropped — the rider heal fires from
 *  the very first S2 tick. */
const sodaUngatedRider = withPatchedOverride('soda', (ov) => {
  mutateBlock(
    ov,
    'skill2',
    (x: any) => x.resourceGate?.name === 'maidSpirit',
    (b: any) => {
      delete b.resourceGate;
    },
    'soda S2 max-stack rider block'
  );
});
/** SD5 counterfactual: the nuke re-keyed to fullBurstEnter — fires on EVERY team Full Burst,
 *  not on soda's own casts. */
const sodaFbEnterNuke = withPatchedOverride('soda', (ov) => {
  mutateBlock(
    ov,
    'burst',
    (x: any) => x.effects.some((e: any) => e.kind === 'flatDamage'),
    (b: any) => {
      b.trigger = { kind: 'fullBurstEnter' };
    },
    'soda burst nuke block'
  );
});
/** SD6 counterfactual: the burst's self-slice (+1 Maid Spirit stack) removed. */
const sodaNoSelfSlice = withPatchedOverride('soda', (ov) => {
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'resource')
  );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const halfThreshold = run({ soda: sodaHalfThreshold });
const noS1 = run({ soda: sodaNoS1 });
const withHpConversion = run({ soda: sodaWithHpConversion });
const s2Fast = run({ soda: sodaS2Fast });
const noS2 = run({ soda: sodaNoS2 });
const ungatedRider = run({ soda: sodaUngatedRider });
const fbEnterNuke = run({ soda: sodaFbEnterNuke });
const noSelfSlice = run({ soda: sodaNoSelfSlice });

// ---- derived (base-run) quantities -------------------------------------------------------------
const SODA_MAX_HP = base.res.units[SODA].maxHp;
const SHOT_COUNT = sodaShots(base.events).length;
const CAST_COUNT = sodaCasts(base.events).length;

describe('soda — kit spec', () => {
  it('fixture sanity: soda fires an MG belt and alternates Burst I casts with liter', () => {
    expect(SHOT_COUNT).toBeGreaterThan(900); // ≥5 S1 proc opportunities
    expect(CAST_COUNT).toBeGreaterThanOrEqual(3);
  });

  describe('SD1 — S1 Maid Spirit: after 180 normals, self Max HP ▲13%, 5 stacks, 10s', () => {
    const applied = maidSpiritApplies(base.events);

    it('fires exactly once per 180 hits, plus one application per own burst cast (self-slice)', () => {
      expect(applied.length).toBe(Math.floor(SHOT_COUNT / 180) + CAST_COUNT);
    });

    it('is 13% of her own Max HP per stack, capped at 5 stacks, on a 10s duration', () => {
      expect(applied.length).toBeGreaterThan(0);
      const expected = (13 / 100) * SODA_MAX_HP;
      expect([...new Set(applied.map((b) => b.value))]).toEqual([expected]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
      expect(
        Math.max(...applied.map((b) => b.stacks)),
        'the pool saturates at the 5th proc mid-fight'
      ).toBe(5);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is self-scoped — no ally ever holds the Maid Spirit grant', () => {
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual(['soda']);
    });

    it('DISCRIMINATING: a halved threshold (90) fires twice as often', () => {
      const cf = maidSpiritApplies(halfThreshold.events);
      expect(cf.length).toBe(Math.floor(SHOT_COUNT / 90) + CAST_COUNT);
      expect(cf.length).toBeGreaterThan(applied.length);
    });
  });

  describe('SD2 — S1 is damage-INERT (soda has no HP-scaling ATK conversion)', () => {
    it("removing Maid Spirit entirely moves NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noS1.totals);
    });

    it('DISCRIMINATING: the channel is live — an HP→ATK converter she does not own WOULD feed', () => {
      expect(withHpConversion.totals['soda']).toBeGreaterThan(
        base.totals['soda']
      );
    });
  });

  describe('SD3 — S2: all allies recover every 12s (recovery-event channel only)', () => {
    // The heal carries no modeled HP amount — its ONLY observable is crown's recovery consumer.
    // 3.23%-of-final-Max-HP magnitude rides verbatim in the override note (no HP pool), never
    // fudged into a fake number.
    const frames = perFrame(crownAdApplies(base.events));

    it('fires at the 12s CD cadence: ticks at t=12,24,...,168 (14 ticks — the fight runs frames 0..10799, so the t=180 tick never dispatches)', () => {
      expect(frames.map(([f]) => f)).toEqual(
        Array.from({ length: 14 }, (_, i) => (i + 1) * 12 * FPS)
      );
    });

    it('each firing reaches ALL FOUR allies through crown (≥4 buffApply per tick frame)', () => {
      for (const [, n] of frames) {
        expect(n).toBeGreaterThanOrEqual(4);
      }
    });

    it('is LIVE: removing S2 zeros the recovery firings and drops team damage (crown AD uptime)', () => {
      expect(crownAdApplies(noS2.events).length).toBe(0);
      expect(noS2.totals['ada']).toBeLessThan(base.totals['ada']);
    });

    it('DISCRIMINATING: a 6s interval doubles the tick count to 29 (t=6..174 inside the frame budget)', () => {
      expect(perFrame(crownAdApplies(s2Fast.events)).length).toBe(29);
    });
  });

  describe('SD4 — S2 rider: the extra heal fires only at Maid Spirit max stacks', () => {
    const frames = perFrame(crownAdApplies(base.events));
    const ungated = perFrame(crownAdApplies(ungatedRider.events));

    it('the first tick (t=12s) is SINGLE: ≤720 hits + no burst by 12s cannot reach 5 stacks', () => {
      // MG terminal cadence is 60/s (the engine's MG constant), so <900 hits are possible by
      // t=12s, and soda's first burst casts well after — the pool is provably <5 at tick 1.
      expect(frames[0][1]).toBe(4);
    });

    it('once max stacks accrue, every later tick is DOUBLE (the rider joins the base heal)', () => {
      const doubledAt = frames.findIndex(([, n]) => n === 8);
      expect(doubledAt).toBeGreaterThan(0);
      for (const [, n] of frames.slice(doubledAt)) {
        expect(n).toBe(8);
      }
    });

    it('DISCRIMINATING: dropping the gate doubles the FIRST tick too', () => {
      expect(ungated[0][1]).toBe(8);
    });

    it('GATE DEPENDENCY (S2b): with no Maid Spirit stacks, the rider never joins — all ticks single', () => {
      // reviewer distinguisher: kill S1 → the 12.71% block's recovery feed VANISHES while the
      // 3.23% block's persists (every tick stays one recovery event = 4 buffApply). The burst
      // self-slice still feeds the pool (+1/cast), so this holds while soda casts <5 times.
      expect(CAST_COUNT).toBeLessThan(5);
      const noStacks = perFrame(crownAdApplies(noS1.events));
      expect(noStacks.length).toBe(14);
      for (const [, n] of noStacks) {
        expect(n).toBe(4);
      }
    });
  });

  describe('SD5 — burst: 321.28% of final ATK, once per own cast, before the FB window', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'soda' && d.srcSlot === 'burst'
    );

    it('fires once per soda burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(CAST_COUNT);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([321.28]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
      expect([...new Set(nukes.map((d) => d.inFullBurst))]).toEqual([false]);
    });

    it('DISCRIMINATING: a fullBurstEnter-keyed nuke fires on EVERY team FB, not her casts', () => {
      const cf = dmg(fbEnterNuke.events).filter(
        (d) => d.slug === 'soda' && d.srcSlot === 'burst'
      );
      expect(cf.length).toBeGreaterThan(nukes.length);
    });
  });

  describe('SD6 — burst: Fire-ally "buff stacks ▲1" SELF slice — +1 Maid Spirit stack per cast', () => {
    it('the stack count = hit procs + one per own burst (the self-slice lands on her own buff)', () => {
      const applied = maidSpiritApplies(base.events);
      expect(applied.length).toBe(Math.floor(SHOT_COUNT / 180) + CAST_COUNT);
    });

    it('DISCRIMINATING: without the self-slice, only hit procs apply stacks', () => {
      const cf = maidSpiritApplies(noSelfSlice.events);
      expect(cf.length).toBe(Math.floor(SHOT_COUNT / 180));
    });
  });
});

```

## Driver override (src/skills/overrides/soda.json)

```json
{
  "note": "Kit-autonomy gauntlet 2026-08-05 — Soda (slug `soda`; the MG/Supporter/Fire/Burst-I BASE unit, NOT soda-twinkling-bunny, the SG/Iron variant — disambiguation lint resolved explicitly 2026-08-05). FROM-SCRATCH unit (simSupported was false; the empty-skeleton RED state + test-first spec landed at S2a of this same gauntlet). Independently re-derived + pinned by a 20-assertion spec (scripts/tests/units/soda.test.ts, SD1–SD6); cross-family claude-fable-5 S2b converged on 5 of 6 lines (the 6th reconciled below). LINE DISPOSITIONS: (1) S1 'Maid Spirit: after 180 normal attacks, self Max HP ▲13%, 5 stacks, 10 sec' = hitCount 180 (hitsPerShot 1 → hits == pulls) → self targetMaxHpPct 13, maxStacks 5, durationSec 10, PLUS a +1 to the `maidSpirit` resource pool that MIRRORS the stack count. The buff is damage-INERT for soda (she has no atkOfMaxHpPct / atkOfCasterMaxHpPct conversion; the e3 self-feed channel is live in the engine but she carries no consumer — pinned inert + channel-live by SD2). (2) S2 (12s CD) 'all allies restore 3.23% of the skill user's final Max HP' + 'at Maid Spirit max stacks, restore 12.71%' = TWO recovery-event emitters on interval 12 (hard rule 2 — never drop a heal): the base heal unconditional, the rider heal gated resourceGate {maidSpirit, min:5}. The engine models NO HP pool, so the 3.23/12.71 magnitudes are deliberately NOT encoded as numbers (they ride in this note verbatim, not fudged); the observable is the recovery-event feed to on-recovery consumers (crown's 'when recovery takes effect → team Attack Damage ▲20.99%/7s' in the fixture), which is a REAL damage channel — removing S2 drops the team's crown-AD uptime (SD3). (3) Burst '321.28% of final ATK to 2 random enemies' = burstCast → enemy flatDamage 321.28, exactly ONE instance: the '2 random enemy unit(s)' selection collapses onto the lone partless scope-lock boss (anis-sparkling-summer / privaty-unkind-maid precedent), never doubled to 2×321.28. burstCast-keyed, so the nuke lands BEFORE the Full Burst window and never takes the +50% major (B1 casts at stage 1; helm H7 precedent). (4) Burst 'Stun for 1 sec' = UNMODELED verbatim: enemy crowd control — the sim has no enemy-behaviour model (the boss deals no damage and has no interrupt parts here), so it is offensively inert by construction. (5) Burst 'all Fire Code allies: Stack count of buffs ▲1' = SELF SLICE MODELED: soda is Fire Code and her only stackable buff is Maid Spirit, so her burst adds +1 maidSpirit pool (clamped at 5) and one Max-HP-stack application. The pool MUST count burst-added stacks or it would UNDER-count the real stack state the S2 rider gate reads. CROSS-ALLY SLICE ⚑ OUT-OF-DOMAIN (engine-core): '+1 stack onto each Fire ally's OWN stackable buffs' (the soda-type team amplifier) has no engine primitive ('bump each target's stackable buffs by N' does not exist — mica-snow-buddy ⚑M5 / pepper ⚑4 precedent; owner precedent kit-status: 'the self-slice is the honest in-scope model'). ESTIMATE: zero in any encoding the sim can field today (a function only of which stackable buffs the fielded Fire allies happen to carry; none in the graded fixture). RECIPE: an engine primitive that reads each target holder's live maxStacks buffs and adds N stacks. TIER: out-of-domain (engine-core). KNOWN APPROXIMATIONS (documented, not silent): (a) the maidSpirit pool is MONOTONIC (resources never decay) while the real stacks carry a 10s per-stack expiry — divergence only possible in >10s firing gaps, which sustained MG fire never produces; the same divergence class as soda-twinkling-bunny's Golden-Chip pool (kit-status 2026-07-17); (b) S2 cadence = interval 12 from the datamined skillCooldownsSec.skill2 (the prose carries no activation clause) with first fire at t=12 per engine convention — ⚑ phase, pin from footage if a consumer cadence is ever popup-read (snow-white interval precedent); (c) applyBuff refresh semantics mean a burst self-slice stack application refreshes the Maid Spirit 10s window (the engine's single-entry stack model; KR stacking rule). Kit-autonomy gauntlet 2026-08-05.",
  "resources": [{ "name": "maidSpirit", "initial": 0, "min": 0, "max": 5 }],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 180 },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "resource", "name": "maidSpirit", "delta": 1 },
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 13,
          "maxStacks": 5,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 12 },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "heal" }]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 12 },
      "target": { "kind": "allies" },
      "resourceGate": { "name": "maidSpirit", "min": 5 },
      "effects": [{ "kind": "heal" }]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 321.28 }]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "resource", "name": "maidSpirit", "delta": 1 },
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 13,
          "maxStacks": 5,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": ["Stun for 1 sec."]
  },
  "caveats": [
    "skill2: interval 12 is the datamined skillCooldownsSec.skill2 (the prose carries no activation clause); first-fire phase t=12 is the engine interval convention — ⚑ pin from footage if a recovery-consumer cadence is ever popup-read",
    "skill2: heal magnitudes 3.23% / 12.71% of the skill user's final Max HP are amount-less by engine design (no HP pool) — carried verbatim in the note, not fudged into fake numbers",
    "burst: '2 enemy unit(s) randomly' collapses to ONE instance on the lone partless boss (multi-enemy selection is out of the single-boss scope)",
    "burst: the CROSS-ALLY slice of 'all Fire Code allies: Stack count of buffs ▲1' is ⚑ OUT-OF-DOMAIN (engine-core) — no 'bump each target's stackable buffs by N' primitive (mica-snow-buddy ⚑M5 / pepper ⚑4 precedent); self-slice modeled via the maidSpirit pool",
    "skill1/burst: the maidSpirit pool is monotonic vs the real 10s per-stack expiry — divergence only in >10s firing gaps (soda-twinkling-bunny Golden-Chip precedent class)"
  ]
}

```
