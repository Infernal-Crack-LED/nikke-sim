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


# GROUND TRUTH — Vesti (slug `vesti`) kit prose + base data (from data/characters.json)

```json
{
  "slug": "vesti",
  "name": "Vesti",
  "weapon": "RL",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Water",
  "manufacturer": "Elysion",
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "chargeMultiplier": 250,
  "ammo": 6,
  "reloadFrames": 142,
  "chargeFrames": 60,
  "hitsPerShot": 1,
  "rl3": 16.8,
  "burstGaugePerShot": 1.4,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates when performing a Full Charge attack. Affects self.\nExplosion Radius ▲ 15.01% for 10 sec.",
    "skill2": "■ Activates when using Burst Skill. Affects self.\nEffects vary according to the number of times used. Each subsequent effect triggers all effects before it:\nOnce: Survival Instinct 1 - ATK ▲ 5.35% for 45 sec.\nTwice: Survival Instinct 2 - Critical Damage ▲ 22.34% for 45 sec.\nThree times: Survival Instinct 3 - Critical Rate ▲ 15.51% for 45 sec.",
    "burst": "■ Affects self.\nDeploys two Missile Containers that deal 15.56% of final ATK as damage to the enemy with the lowest remaining HP every 1 sec for 18 sec.\n■ Affects all enemies.\nEffects vary for each stage of Survival Instinct. Each subsequent effect triggers all effects before it:\nSurvival Instinct 1: Deals 210.62% of final ATK as additional damage.\nSurvival Instinct 2: Deals 247.25% of final ATK as additional damage.\nSurvival Instinct 3: Deals 302.19% of final ATK as additional damage.\n■ Affects all allies.\nFull Burst Duration ▼ 5 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "skillNames (datamine)": {
    "skill1": "Dreams Do Come True",
    "skill2": "Survival Instinct",
    "burst": "Justifiable Defense"
  },
  "burst datamine (ulti_skill skill_value_data)": [
    {
      "skill_value": 919,
      "skill_value_type": "Percent"
    },
    {
      "skill_value": 60,
      "skill_value_type": "Integer"
    },
    {
      "skill_value": 1009102,
      "skill_value_type": "Integer"
    },
    {
      "skill_value": 2,
      "skill_value_type": "Integer"
    },
    {
      "skill_value": 25,
      "skill_value_type": "Integer"
    }
  ],
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 88,
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
    "resourceId": 91
  },
  "note": "RL charge weapon: every pull is a full charge (chargeFrames 60, chargeMultiplier 250). The sim is single-target (one partless boss; no enemy entity, no HP pool, no enemy behaviour). simSupported was false before this gauntlet (FROM-SCRATCH unit)."
}
```


# S2b REVIEW (claude-fable-5, scripts/kit-autonomy/reviews/vesti.test-review.json)

```json
{
  "slug": "vesti",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill2",
      "kitLine": "■ when using Burst Skill · SI 1/2/3",
      "disposition": "FAITHFUL",
      "scope": "Generic (unscoped) stat buffs: ATK ▲5.35%, Critical Damage ▲22.34%, Critical Rate ▲15.51% — no normal-attack/charge/crit-only scoping in the prose.",
      "durationSemantics": "Wall-clock: 'for 45 sec' each — durationSec 45, no round count. Each re-application refreshes all prior steps ('each subsequent effect triggers all effects before it').",
      "triggerIdentity": "burstCast — 'Activates when using Burst Skill' is her OWN burst cast, NOT fullBurstEnter. Escalating counter = number of her own casts (kind:'escalating', steps 1..N on Nth activation).",
      "targetSet": "self",
      "nearestWrongModel": "Keyed to fullBurstEnter: Survival Instinct advances on EVERY team Full Burst, so with a second Burst III in the comp (controlComp has helm) she reaches SI3 in ~3 rotations even when she casts only half of them — over-credits the buffs AND the burst nuke's stage.",
      "distinguishingAssertion": "count(buffApply stat:'atkPct' value:5.35 targetSlug:'vesti') === count of vesti's own burstCast events, strictly less than count of fullBurstStart events in a two-B3 comp; 1st cast emits atkPct only, 2nd cast emits atkPct 5.35 AND critDamagePct 22.34, 3rd+ additionally critRatePct 15.51.",
      "inertness": "Zero Survival Instinct buffApply events before her first own burst cast; a Full Burst chained by the other Burst III must add no SI application and advance no stage.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "two Missile Containers · every 1 sec 18 sec",
      "disposition": "FAITHFUL",
      "scope": "Function damage (15.56% of final ATK per tick); not a normal attack — no core, no +30% range on riders; crit off by default (opt-in measured-only).",
      "durationSemantics": "18 ticks per container at intervalSec 1 for durationSec 18 — a per-cast DoT instance, NOT a permanent passive (burst CD 40s > 18s, so no overlap between casts).",
      "triggerIdentity": "burstCast (deployed by her burst), target 'enemy'. dot encoding: one fresh instance per cast; TWO containers = 2× the tick stream (2 dot effects of 15.56, or one at 31.12).",
      "targetSet": "enemy ('the enemy with the lowest remaining HP' — scope-trivial with a single boss).",
      "nearestWrongModel": "ONE container modeled instead of two (18 ticks/cast instead of 36 — exactly half the damage), or the line collapsed to a single instant flatDamage 15.56% at cast.",
      "distinguishingAssertion": "Per vesti burst cast, the event log shows 2 tick-damage events per second for 18 s (36 instances) in the burst bucket, per-tick mult 15.56% of final ATK — cast total 560.16% ATK-equivalent, not 280.08% and not a single hit.",
      "inertness": "Ticks never carry core; no container ticks exist before her first burst cast; tick count per cast is exactly 36 (no residual instance stacking across casts).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "SI1 210.62 / SI2 247.25 / SI3 302.19",
      "disposition": "FAITHFUL",
      "scope": "Instant additional damage, % of final ATK; rider rules — no core, noRange; burst-cast damage is FB-EXEMPT (lands before the Full Burst window opens).",
      "durationSemantics": "Instantaneous per cast; magnitude is stage-CUMULATIVE ('each subsequent effect triggers all effects before it'): cast 1 = 210.62%, cast 2 = 210.62+247.25 = 457.87%, cast 3+ = 760.06%.",
      "triggerIdentity": "burstCast + escalating(flatDamage steps), sharing the SAME own-cast counter as skill2's Survival Instinct — the stage is the number of her burst uses, not FB count.",
      "targetSet": "enemy ('all enemies' — single boss at scope).",
      "nearestWrongModel": "Current-stage-only (3rd cast deals 302.19% alone — under-credits ~60%), or full 760.06% from the first cast (over-credits), or the hit taking the +50% Full Burst major.",
      "distinguishingAssertion": "Summed burst additional-damage instances at her 1st cast = 210.62% ATK, 2nd = 457.87%, 3rd = 760.06%, each event with fbMajorApplied === false and inFullBurst false (pre-FB landing).",
      "inertness": "No core bucket, no +30% range on these hits; stage must not advance on the other B3's rotations (mirrors the skill2 trigger assertion).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ all allies · Full Burst Duration ▼ 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Rotation-level: shortens the Full Burst WINDOW her cast opens — gates every unit's +50%-window uptime and the whole cycle cadence. This is damage-relevant (window/shot-economy modifier), not a skippable 'utility' line.",
      "durationSemantics": "A flat −5 s on that Full Burst's duration (10 s → ~5 s), applied per cast — not a timed buff.",
      "triggerIdentity": "Her burst cast, applied to the FB it initiates — fullBurstExtend with seconds: -5 (negative extend).",
      "targetSet": "allies / team-wide FB timer.",
      "nearestWrongModel": "Dropped entirely as a 'defensive/no-damage drawback' (the classic weapon-state-style skip), or sign-flipped into a +5 s extension.",
      "distinguishingAssertion": "On a rotation vesti bursts: fullBurstEnd − fullBurstStart ≈ 300 frames (~5 s), vs ~600 frames on a rotation the other Burst III casts; consequently the 180 s FB timeline (count + window lengths) differs measurably from a no-op model.",
      "inertness": "Must NOT lengthen any FB; must NOT shorten Full Bursts opened by the other Burst III's cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge · Explosion Radius ▲ 15.01%",
      "disposition": "UNMODELED",
      "scope": "Self, on performing a Full Charge attack; the stat is an AoE RADIUS, not a damage stat — zero extra hits against a single partless boss.",
      "durationSemantics": "10 s wall-clock (durationSec) — moot while unmodeled.",
      "triggerIdentity": "Per full-charge shot (shotFired/charge-gated) — moot while unmodeled.",
      "targetSet": "self",
      "nearestWrongModel": "Laundered into a damage stat — projectileExplosionPct 15.01 (Damage Up bucket) or attackDamagePct — because 'Explosion' pattern-matches the RL damage StatKey; that over-credits ~15% for a stat that adds no damage vs one boss.",
      "distinguishingAssertion": "No buffApply with ANY damage-affecting StatKey originates from skill1; emptying skill1's blocks changes vesti's total by exactly 0. The verbatim line appears in unmodeled.skill1.",
      "inertness": "Skill1 must move nothing — damage, gauge, rotation all identical with it removed.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill2:Survival Instinct escalating self-buffs (burstCast, cumulative, 45s)",
    "burst:two Missile Containers dot (36 ticks × 15.56% per cast)",
    "burst:Survival-Instinct-staged additional damage (cumulative 210.62/457.87/760.06)",
    "burst:Full Burst Duration ▼ 5 sec (negative fullBurstExtend on her cast)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Explosion Radius ▲ 15.01% for 10 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in order of likelihood: (1) 'Activates when using Burst Skill' keyed to fullBurstEnter — the control fixture pairs her with a second Burst III, so this over-advances Survival Instinct on rotations she never casts; every SI assertion must count HER burstCast events against fullBurstStart events. (2) The 'Full Burst Duration ▼ 5 sec' line silently dropped as a utility/drawback — it is the kit's biggest rotation lever (halves the +50% window on her rotations) and must be asserted via the FB start/end frame delta, not just a buffApply. (3) The container line halved (one container instead of two) or flattened to a single hit — pin the 36-events-per-cast tick count. (4) Escalation semantics: both skill2 and the burst nuke are CUMULATIVE ('each subsequent effect triggers all effects before it') — assert the 2nd cast deals 457.87%, not 247.25%, and applies BOTH stat buffs; also assert the two escalating tracks share one counter (the 2nd cast's nuke is stage 2 even while cast 1's buffs are still live). (5) Burst nuke FB-exemption: burst-cast instant damage lands pre-FB — fbMajorApplied must be false; a +50%-credited model is the over-credit to catch. Skill1's radius must stay out of projectileExplosionPct. 'Enemy with the lowest remaining HP' targeting is scope-trivial (single boss) and needs no stand-in machinery.",
  "model": "claude-fable-5"
}
```


# S5 BLIND TEST (claude-opus-5, scripts/kit-autonomy/blind/vesti.test.ts)

STATUS vs the DRIVER override: GREEN — 23 passed, 1 skipped (the skip is the blind author's own GAP annotation: S1 Explosion Radius has no engine primitive and is damage-inert at scope lock). Adapted file (mechanical import-path fix only) at scripts/kit-autonomy/blind/vesti.adapted.test.ts.

```ts
/**
 * vesti (RL / Water / Attacker / Burst III — burst CD 40s, ammo 6, charge 60f) — KIT SPEC.
 *
 * BLIND author: written from the kit prose alone (no sight of the shipped override, the driver's
 * tests, or any truth file). Each assertion states what the kit TEXT requires and the
 * nearest-wrong model it goes RED under.
 *
 * WHAT THE KIT SAYS (structure verbatim, payloads as read):
 *   S1  "Activates when performing a Full Charge attack. Affects self."
 *         Explosion Radius ▲ 15.01% for 10 sec.
 *   S2  "Activates when using Burst Skill. Affects self."  — escalating and CUMULATIVE
 *       ("Each subsequent effect triggers all effects before it"):
 *         Survival Instinct 1  ATK ▲ 5.35%             for 45 sec
 *         Survival Instinct 2  Critical Damage ▲ 22.34% for 45 sec
 *         Survival Instinct 3  Critical Rate ▲ 15.51%   for 45 sec
 *   BURST
 *     a) self       — two Missile Containers, 15.56% of final ATK every 1 sec for 18 sec
 *     b) all enemies— escalating by Survival Instinct stage, same CUMULATIVE sentence:
 *                      SI1 210.62% / SI2 247.25% / SI3 302.19% of final ATK as extra damage
 *     c) all allies — Full Burst Duration ▼ 5 sec
 *
 * FIXTURES (2 base runs + 2 counterfactuals = 4 sims)
 *   `solo`     = controlComp('vesti', false) → liter (B1) / crown (B2) / vesti (B3).
 *                vesti is the SOLE Burst III, so she casts on every rotation — the only way to
 *                climb to Survival Instinct 3 inside 180s and observe all three ladder rungs.
 *                The fixed-B3 `helm` slot is dropped here so her crit/ATK auras cannot confound
 *                the rung readings.
 *   `withHelm` = controlComp('vesti', true) → adds `helm`, a SECOND Burst III. Some Full Bursts
 *                are then opened by helm, not vesti. That gap is the whole trigger-identity test
 *                (taxonomy #3): keying S2 to full-burst-ENTER instead of vesti's own burst CAST
 *                over-credits by exactly the helm-opened rotations. The test asserts the gap is
 *                non-zero first, so the discrimination cannot be vacuous.
 *
 * READING NOTES (declared, not hidden)
 *   ⚑ (a) split-vs-merge: "two Missile Containers that deal 15.56% ... every 1 sec" is read
 *     PER CONTAINER, so the per-second payload is 2 × 15.56 = 31.12% of final ATK. English is
 *     genuinely ambiguous here (taxonomy #5, kit-silent multi-projectile), so that magnitude gets
 *     its OWN named test — a divergence there is one isolated line, not a poisoned file. The
 *     cadence/duration assertions hold under either reading.
 *   ⚑ (b) cumulative-vs-replace: the burst rider carries the SAME "each subsequent effect triggers
 *     all effects before it" sentence as S2, where cumulative is unarguable (three different
 *     stats stack). Read literally, SI3 therefore deals 210.62 + 247.25 + 302.19 = 760.06%.
 *     Nearest-wrong = tiers REPLACE (302.19% alone at SI3).
 *   ⚑ stage alignment: both S2 and the burst rider key off the same cast, so cast N sees stage
 *     min(N,3) INCLUDING that cast (cast 1 → SI1). Asserted directly off the rider's atkPct.
 *   (c) is asserted on the measured Full Burst WINDOW LENGTH, not on a damage direction: a
 *     shorter Full Burst is not unambiguously a nerf, since the rotation restarts sooner and the
 *     fight can fit MORE (shorter) windows. Direction is left to the board, length is structural.
 *   crit-eligibility of the burst rider is NOT asserted — whether a flat-damage rider crits is an
 *     engine-wide policy (RIDERCRIT), not a vesti kit line, so pinning it here would test the
 *     engine under this unit's name.
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

const SLUG = 'vesti';
const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;

/** Float compare for kit magnitudes (one hundredth of a percentage point). */
const near = (a: number, b: number): boolean => Math.abs(a - b) < 5e-3;

function run(opts: Parameters<typeof runComp>[0]) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (e: SimEvent) => events.push(e) },
  });
  return { res, events };
}

// ---- override slot access -------------------------------------------------------------
// The override FILE is slot-keyed; a slot is a Block[] (harness `bareWeaponOverride` builds
// exactly that shape). The `.blocks` fallback keeps the counterfactuals working if a slot is
// ever carried as a CharacterSkills wrapper instead — a counterfactual that silently patched
// nothing would turn a nearest-wrong test into a false GREEN, which is the failure to avoid.
const blocksOf = (ov: any, slot: string): any[] => {
  const s = ov?.[slot];
  if (Array.isArray(s)) {
    return s;
  }
  if (s && Array.isArray(s.blocks)) {
    return s.blocks;
  }
  return [];
};
const setBlocks = (ov: any, slot: string, blocks: any[]): void => {
  if (ov[slot] && !Array.isArray(ov[slot]) && Array.isArray(ov[slot].blocks)) {
    ov[slot].blocks = blocks;
  } else {
    ov[slot] = blocks;
  }
};

/** The committed override, unmutated — read-only inspection of the authored prose. */
const OVERRIDE = withPatchedOverride(SLUG, () => {});

// ---- runs (hoisted — each is a full 180s sim) ------------------------------------------
const solo = run(controlComp(SLUG, false));
const withHelm = run(controlComp(SLUG, true));

/** Nearest-wrong for S2: the three rungs land TOGETHER on every cast (no escalation). */
const flatLadder = run({
  ...controlComp(SLUG, false),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      setBlocks(ov, 'skill2', [
        {
          slot: 'skill2',
          trigger: { kind: 'burstCast' },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'atkPct', value: 5.35, durationSec: 45 },
            { kind: 'buff', stat: 'critDamagePct', value: 22.34, durationSec: 45 },
            { kind: 'buff', stat: 'critRatePct', value: 15.51, durationSec: 45 },
          ],
        },
      ]);
    }),
  },
});

/** Nearest-wrong for the burst's (c): the Full Burst Duration ▼5s line is dropped. */
const noShorten = run({
  ...controlComp(SLUG, false),
  overrides: {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of blocksOf(ov, 'burst')) {
        b.effects = (b.effects ?? []).filter(
          (e: any) => e.kind !== 'fullBurstExtend'
        );
      }
    }),
  },
});

// ---- projections ----------------------------------------------------------------------
type DamageEv = Extract<SimEvent, { kind: 'damage' }>;
type BuffEv = Extract<SimEvent, { kind: 'buffApply' }>;
type CastEv = Extract<SimEvent, { kind: 'burstCast' }>;
type FbEv = Extract<SimEvent, { kind: 'fullBurstStart' }>;

const casts = (evs: SimEvent[]): CastEv[] =>
  evs.filter((e): e is CastEv => e.kind === 'burstCast' && e.slug === SLUG);
const buffs = (evs: SimEvent[]): BuffEv[] =>
  evs.filter((e): e is BuffEv => e.kind === 'buffApply');
const fbWindows = (evs: SimEvent[]): FbEv[] =>
  evs.filter(
    (e): e is FbEv => e.kind === 'fullBurstStart' && e.endFrame <= FIGHT_FRAMES
  );

const soloCasts = casts(solo.events);
/** vesti's BURST-SLOT damage instances — srcSlot names the kit line, bucket does not. */
const soloBurstDmg = solo.events.filter(
  (e): e is DamageEv =>
    e.kind === 'damage' && e.slug === SLUG && e.srcSlot === 'burst'
);

/** atkPct multiset of everything the burst slot lands ON the cast frame — the rider. */
const riderPcts = (k: number): number[] =>
  soloBurstDmg
    .filter((e) => e.frame === soloCasts[k].frame)
    .map((e) => e.atkPct)
    .sort((a, b) => a - b);

/** Burst-slot damage landing AFTER the cast frame and before the next cast — the containers. */
const containerTicks = (k: number): DamageEv[] => {
  const from = soloCasts[k].frame;
  const to = Math.min(
    soloCasts[k + 1]?.frame ?? FIGHT_FRAMES + 1,
    from + 30 * FPS
  );
  return soloBurstDmg.filter((e) => e.frame > from && e.frame < to);
};

// =======================================================================================
describe('vesti — fixture sanity (non-vacuity)', () => {
  it('vesti casts her burst at least 3 times, so Survival Instinct 3 is reachable', () => {
    expect(soloCasts.length).toBeGreaterThanOrEqual(3);
  });

  it('event attribution is sound: burst-slot damage is a strict subset of her total', () => {
    const sum = soloBurstDmg.reduce((a, e) => a + e.amount, 0);
    expect(sum).toBeGreaterThan(0);
    expect(sum).toBeLessThan(unitOf(solo.res, SLUG).totalDamage);
  });
});

// =======================================================================================
describe('vesti — S1 Explosion Radius (GAP: no primitive, damage-inert at scope lock)', () => {
  it.skip('GAP — "Explosion Radius ▲ 15.01% for 10 sec" on Full Charge: the effect schema has no explosion-radius / AoE primitive, and hit AREA cannot move damage against the single, partless scope-lock boss. Modelling it needs an area mechanic the engine does not have.', () => {});

  it('does NOT launder explosion radius into a damage stat', () => {
    // Nearest-wrong: encoding radius as projectileExplosionPct / attackDamagePct 15.01,
    // which would silently hand an RL carry a real Damage-Up buff the kit never grants.
    const laundered = buffs(solo.events).filter((e) => near(e.value, 15.01));
    expect(laundered).toEqual([]);
  });

  it('records the line rather than silently dropping it', () => {
    // No-silent-drops: the text must survive somewhere in the authored override prose.
    expect(JSON.stringify(OVERRIDE)).toMatch(/explosion radius/i);
  });
});

// =======================================================================================
describe('vesti — S2 Survival Instinct ladder (escalating, own burst cast, self)', () => {
  const rung = (stat: string, v: number, upToFrame: number): BuffEv[] =>
    buffs(solo.events).filter(
      (e) => e.stat === stat && near(e.value, v) && e.frame <= upToFrame
    );

  it('cast 1 grants ONLY Survival Instinct 1 (ATK ▲5.35%)', () => {
    const f = soloCasts[0].frame;
    expect(rung('atkPct', 5.35, f).length).toBe(1);
    expect(rung('critDamagePct', 22.34, f).length).toBe(0);
    expect(rung('critRatePct', 15.51, f).length).toBe(0);
  });

  it('cast 2 adds Survival Instinct 2 (Crit DMG ▲22.34%) and replays rung 1', () => {
    const f = soloCasts[1].frame;
    expect(rung('atkPct', 5.35, f).length).toBe(2);
    expect(rung('critDamagePct', 22.34, f).length).toBe(1);
    expect(rung('critRatePct', 15.51, f).length).toBe(0);
  });

  it('cast 3 adds Survival Instinct 3 (Crit Rate ▲15.51%) and replays rungs 1-2', () => {
    const f = soloCasts[2].frame;
    expect(rung('atkPct', 5.35, f).length).toBe(3);
    expect(rung('critDamagePct', 22.34, f).length).toBe(2);
    expect(rung('critRatePct', 15.51, f).length).toBe(1);
  });

  it('NEAREST-WRONG: a non-escalating ladder fires all three rungs on cast 1', () => {
    // Proves the fixture can SEE the wrong model — without this the tests above could pass
    // on any encoding that merely happens to be quiet early.
    const f = casts(flatLadder.events)[0].frame;
    const early = buffs(flatLadder.events).filter(
      (e) => e.stat === 'critRatePct' && near(e.value, 15.51) && e.frame <= f
    );
    expect(early.length).toBe(1);
    expect(totals(flatLadder.res)[SLUG]).not.toBe(totals(solo.res)[SLUG]);
  });

  it('every rung lasts 45 sec', () => {
    for (const [stat, v] of [
      ['atkPct', 5.35],
      ['critDamagePct', 22.34],
      ['critRatePct', 15.51],
    ] as const) {
      const applies = buffs(solo.events).filter(
        (e) => e.stat === stat && near(e.value, v)
      );
      expect(applies.length).toBeGreaterThan(0);
      for (const e of applies) {
        expect(e.expiresFrame).not.toBeNull();
        expect((e.expiresFrame as number) - e.frame).toBe(45 * FPS);
        expect(e.durationShots).toBeNull(); // seconds, not a round count (taxonomy #2)
      }
    }
  });

  it('INERTNESS: the ladder is self-only — no teammate ever holds a rung', () => {
    for (const [stat, v] of [
      ['atkPct', 5.35],
      ['critDamagePct', 22.34],
      ['critRatePct', 15.51],
    ] as const) {
      const holders = new Set(
        buffs(withHelm.events)
          .filter((e) => e.stat === stat && near(e.value, v))
          .map((e) => e.targetSlug)
      );
      expect([...holders]).toEqual([SLUG]);
    }
  });

  it('TRIGGER IDENTITY: keyed to vesti’s OWN burst cast, not team Full Burst entry', () => {
    const fbCount = withHelm.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const myCasts = casts(withHelm.events).length;
    // Non-vacuity: helm must actually open some Full Bursts, else the two triggers agree
    // and this fixture proves nothing.
    expect(myCasts).toBeGreaterThan(0);
    expect(fbCount).toBeGreaterThan(myCasts);

    const rung1 = buffs(withHelm.events).filter(
      (e) =>
        e.stat === 'atkPct' && near(e.value, 5.35) && e.targetSlug === SLUG
    );
    expect(rung1.length).toBe(myCasts); // fullBurstEnter would give fbCount — over-credit
  });
});

// =======================================================================================
describe('vesti — burst a) two Missile Containers (15.56% every 1 sec for 18 sec)', () => {
  it('ticks once per second for 18 seconds after the cast', () => {
    const frames = [...new Set(containerTicks(0).map((e) => e.frame))].sort(
      (a, b) => a - b
    );
    expect(frames.length).toBe(18);
    frames.forEach((f, i) => {
      expect(f - soloCasts[0].frame).toBe(FPS * (i + 1));
    });
  });

  it('does NOT multiply across casts (one instance per cast, 40s CD > 18s window)', () => {
    // Taxonomy #5: the engine appends an independent DoT instance per fire and never dedups,
    // so a duration longer than the re-trigger period would stack containers invisibly.
    const second = [...new Set(containerTicks(1).map((e) => e.frame))];
    expect(second.length).toBe(18);
  });

  it('⚑ per-tick payload is TWO containers: 2 × 15.56% = 31.12% of final ATK', () => {
    // ⚑ kit-silent split-vs-merge. Nearest-wrong: 15.56% total (one container’s worth),
    // which halves ~560% of final ATK per burst. Encoding-agnostic: one merged dot at 31.12
    // or two dots at 15.56 both pass; a single 15.56 does not.
    const byFrame = new Map<number, number>();
    for (const e of containerTicks(0)) {
      byFrame.set(e.frame, (byFrame.get(e.frame) ?? 0) + e.atkPct);
    }
    expect(byFrame.size).toBe(18);
    for (const v of byFrame.values()) {
      expect(v).toBeCloseTo(31.12, 2);
    }
  });

  it('container ticks never core (no “core strike” wording in the kit line)', () => {
    for (const e of containerTicks(0)) {
      expect(e.coreEligible).toBe(false);
    }
  });
});

// =======================================================================================
describe('vesti — burst b) Survival Instinct rider (all enemies, cumulative)', () => {
  it('rider scales by stage and is CUMULATIVE across stages', () => {
    // Nearest-wrong (tiers REPLACE): [210.62] / [247.25] / [302.19].
    expect(riderPcts(0)).toEqual([210.62]);
    expect(riderPcts(1)).toEqual([210.62, 247.25]);
    expect(riderPcts(2)).toEqual([210.62, 247.25, 302.19]);
  });

  it('stage is INCLUSIVE of the cast that granted it (cast 1 → SI1, not SI0)', () => {
    // Nearest-wrong (stage read PRE-cast): cast 1 lands nothing at all.
    expect(riderPcts(0).length).toBe(1);
  });

  it('rider is burst-cast damage: it does NOT take the +50% Full Burst major', () => {
    // Taxonomy #9: a burst cast lands before the Full Burst window opens.
    const atCast = soloBurstDmg.filter((e) =>
      soloCasts.some((c) => c.frame === e.frame)
    );
    expect(atCast.length).toBeGreaterThan(0);
    for (const e of atCast) {
      expect(e.fbMajorApplied).toBe(false);
    }
  });

  it('rider takes no core and no range bonus (rider convention)', () => {
    for (const e of soloBurstDmg.filter((x) => x.frame === soloCasts[2].frame)) {
      expect(e.coreEligible).toBe(false);
      expect(e.rangeApplied).toBe(false);
    }
  });

  it('INERTNESS: the rider is vesti’s alone — no teammate emits burst-slot damage from it', () => {
    const foreign = withHelm.events.filter(
      (e) =>
        e.kind === 'damage' &&
        e.slug !== SLUG &&
        e.srcSlot === 'burst' &&
        [210.62, 247.25, 302.19].some((p) => near(e.atkPct, p))
    );
    expect(foreign).toEqual([]);
  });
});

// =======================================================================================
describe('vesti — burst c) Full Burst Duration ▼ 5 sec (all allies)', () => {
  it('every Full Burst she opens runs ~5s, not the default ~10s', () => {
    const w = fbWindows(solo.events);
    expect(w.length).toBeGreaterThanOrEqual(3);
    for (const x of w) {
      expect((x.endFrame - x.frame) / FPS).toBeCloseTo(5, 0);
    }
  });

  it('NEAREST-WRONG: dropping the line restores ~10s windows and moves the board', () => {
    const w = fbWindows(noShorten.events);
    expect(w.length).toBeGreaterThanOrEqual(3);
    for (const x of w) {
      expect((x.endFrame - x.frame) / FPS).toBeCloseTo(10, 0);
    }
    // Direction is deliberately unasserted: a shorter window is not obviously a nerf,
    // because the rotation restarts sooner and can fit more Full Bursts.
    expect(totals(noShorten.res)[SLUG]).not.toBe(totals(solo.res)[SLUG]);
  });

  it('the shortening reaches the whole team, not just vesti', () => {
    // "Affects all allies": every ally's in-FB damage must live inside the 5s windows.
    const w = fbWindows(solo.events);
    const inFb = solo.events.filter(
      (e): e is DamageEv => e.kind === 'damage' && e.inFullBurst
    );
    expect(inFb.length).toBeGreaterThan(0);
    expect(new Set(inFb.map((e) => e.slug)).size).toBeGreaterThan(1);
    for (const e of inFb) {
      expect(
        w.some((x) => e.frame >= x.frame && e.frame <= x.endFrame)
      ).toBe(true);
    }
  });
});
```


# S6 BLIND OVERRIDE (claude-opus-5, scripts/kit-autonomy/blind/vesti.override.json)

DIFF vs the DRIVER override (driver = src/skills/overrides/vesti.json):
- CONVERGED: S2 Survival Instinct = ONE escalating block on burstCast -> self (atkPct 5.35 / critDamagePct 22.34 / critRatePct 15.51, each durationSec 45); burst riders = ONE escalating block on burstCast -> enemy with flatDamage steps 210.62 / 247.25 / 302.19 (cumulative, same-cast-inclusive); Full Burst Duration -5s = burstCast -> allies -> fullBurstExtend seconds:-5; S1 = UNMODELED verbatim (no explosion-radius primitive, inert at scope lock).
- DIVERGED (1 substantive): MISSILE CONTAINER COUNT — blind authored ONE dot block (15.56% of final ATK / intervalSec 1 / durationSec 18 = one container's worth, 280.08% per deployment) vs driver TWO dot blocks (one per container: 2 x 15.56% per second = 560.16% per deployment). The driver's per-container reading rests on (a) the prose's plural subject "two Missile Containers that deal 15.56% ... every 1 sec", (b) the datamine ulti_skill skill_value_data carrying the container count 2 as a separate Integer alongside the per-instance damage Percent, (c) the S2b reviewer naming "ONE container modeled instead of two" the nearest-wrong model, and (d) the S5 blind test independently asserting 2 x 15.56 = 31.12% per volley frame. (2 cosmetic): blind riders carry explicit crit:true (equivalent to the engine flatDamage crit-on default the driver relies on); blind unmodeled.skill1 splits the line into two array entries.

```json
{
  "slug": "vesti",
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            {
              "kind": "buff",
              "stat": "atkPct",
              "value": 5.35,
              "durationSec": 45
            },
            {
              "kind": "buff",
              "stat": "critDamagePct",
              "value": 22.34,
              "durationSec": 45
            },
            {
              "kind": "buff",
              "stat": "critRatePct",
              "value": 15.51,
              "durationSec": 45
            }
          ]
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
          "kind": "dot",
          "atkPct": 15.56,
          "durationSec": 18,
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
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            {
              "kind": "flatDamage",
              "atkPct": 210.62,
              "crit": true
            },
            {
              "kind": "flatDamage",
              "atkPct": 247.25,
              "crit": true
            },
            {
              "kind": "flatDamage",
              "atkPct": 302.19,
              "crit": true
            }
          ]
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
          "kind": "fullBurstExtend",
          "seconds": -5
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "■ Activates when performing a Full Charge attack. Affects self.",
      "Explosion Radius ▲ 15.01% for 10 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ Missile Containers split-vs-merge: modeled as ONE 15.56%/s DoT for 18 s. If each of the two containers ticks independently the true rate is 31.12%/s (2× under-credit today). Kit-silent — popup-read required.",
    "⚑ Both escalating blocks read 'Each subsequent effect triggers all effects before it' CUMULATIVELY (engine `escalating` semantics): the 3rd burst deals 210.62+247.25+302.19 = 760.06% and holds all three Survival Instinct buffs. A replace-not-stack reading of the DAMAGE tiers would give 302.19% only — untested.",
    "⚑ Survival Instinct stage counter assumed to (a) increment once per OWN burst cast, (b) cap at stage 3 and stay there for the rest of the fight, (c) never reset. Kit text states none of these.",
    "⚑ 'Full Burst Duration ▼ 5 sec' encoded as fullBurstExtend seconds:-5 on all allies. Whether the engine accepts a NEGATIVE extend (and whether the shortening applies to the FB this cast opens or the next one) is unverified — this is the single largest team-wide term in the kit, so verify before trusting any comp total.",
    "⚑ crit:true set on the burst tier damage per the rider-crit prior (function-damage riders crit at the caster's sheet rate); DoT ticks left non-crit per the default-OFF DoT-crit rule. Neither is measured for this unit.",
    "⚑ noFb NOT set on any effect (default-OFF, measured-only). Burst-cast damage is expected to land pre-FB by TIMING; if the engine instead credits it inside the FB window these hits are over-credited by +50%.",
    "⚑ RL cadence tuple (pullsPerSec / reloadFrames 142 / chargeFrames 60) is datamined and known-unreliable; not overridden here.",
    "Explosion Radius ▲ has no StatKey and is geometry, not damage — deliberately unmodeled, NOT mapped to projectileExplosionPct (Projectile Explosion DAMAGE is a different stat; mapping it would fabricate damage)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. vesti — RL/Water/Attacker/Burst III, 40 s CD, 6 ammo, 60-frame full charge. Modeled: (skill2) own-burst-cast escalating self-buff chain, Survival Instinct 1/2/3 = ATK ▲5.35% → Crit DMG ▲22.34% → Crit Rate ▲15.51%, each 45 s, cumulative; (burst) an 18 s / 1 s-interval 15.56%-of-final-ATK DoT from the deployed Missile Containers, an escalating instant-damage tier keyed to the same Survival Instinct count (210.62 / 247.25 / 302.19%), and a team-wide Full Burst Duration ▼5 s encoded as a negative fullBurstExtend. Deliberately unmodeled: skill1's Explosion Radius ▲15.01% (a projectile-geometry stat with no schema StatKey and no damage path against the single partless scope-lock boss). Trigger fidelity: every block keys to burstCast ('when using Burst Skill' / effects living in her own burst block), never fullBurstEnter — keying these to team Full Burst would over-fire in any multi-Burst-III comp. Her 45 s buff windows exceed her 40 s cooldown, so stages overlap and refresh on the same caster-slot key."
}
```


# DRIVER IMPLEMENTATION

## Driver spec test (scripts/tests/units/vesti.test.ts) — GREEN 22/22

```ts
// PER-UNIT KIT SPEC — `vesti` (Vesti, Elysion RL Attacker, Water, Burst III, cd 40s, ammo 6,
// reloadFrames 142, chargeFrames 60, chargeMultiplier 250, normalMult 61.3 / coreMult 200,
// critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-08-05; test-first line-by-line spec. Tier 2 encoding
// (two burstCast-keyed escalating usage counters, fullBurstExtend sign, dot cadence,
// burstCast-vs-fullBurstEnter keying).
//
// P0 DISAMBIGUATION: this is BASE `vesti` (RL/Water, resource_id 91) — NOT `vesti-tactical
// -upgrade` (RL/Fire, aka vtu/vestitu). The slug-disambiguation lint flags the shared base
// name (advisory); every artifact keys `characters['vesti']`.
//
// GREENFIELD NOTE: vesti shipped with NO override (simSupported:false) — before this gauntlet
// the unit could not sim at all (resolveSkills throws for prose-without-override). The usual
// "RED vs shipped override" half is degenerate: the pre-override state is "does not run". The
// substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the
// faithful encoding AND the nearest-wrong model (patched via withPatchedOverride) provably
// fails it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.vesti.skills, lvl-10 values):
//   S1 — ■ when performing a Full Charge attack → self:
//        Explosion Radius ▲ 15.01% for 10 sec                              [V1 UNMODELED]
//   S2 "Survival Instinct" — ■ when using Burst Skill → self, effects escalate with the
//   number of times used (each later effect triggers all before it):
//        Once:   ATK ▲ 5.35% for 45 sec                                    [V2a]
//        Twice:  Critical Damage ▲ 22.34% for 45 sec                       [V2b]
//        Thrice: Critical Rate ▲ 15.51% for 45 sec                         [V2c]
//   BU "Justifiable Defense"
//      ■ self: deploys TWO Missile Containers that deal 15.56% of final ATK to the enemy
//        with the lowest remaining HP every 1 sec for 18 sec               [V3]
//      ■ all enemies, effects vary for each Survival Instinct stage (each later effect
//        triggers all before it):
//        SI1: 210.62% of final ATK as additional damage                    [V4a]
//        SI2: 247.25% of final ATK as additional damage                    [V4b]
//        SI3: 302.19% of final ATK as additional damage                    [V4c]
//      ■ all allies: Full Burst Duration ▼ 5 sec                           [V5]
//
// UNMODELED lines (carried VERBATIM in the override's `unmodeled`; reasons here):
//   V1 — "Explosion Radius ▲" has NO stat in the effect schema and is damage-inert vs the
//        single partless scope-lock boss (splash radius moves no damage) — the
//        vesti-tactical-upgrade burst carries the identical residual for the same reason.
//        Nearest-wrong counterfactual: projectileExplosionPct 15.01 — a REAL Damage-Up stat
//        that would silently credit +15% explosion-flavored damage on her charge shots; the
//        V1 group pins its absence.
//
// Encoding (isabel / sin precedents):
//   V2  = ONE `escalating` block on burstCast → self: Nth own cast applies steps 1..N, so
//         cast 1 = ATK only, cast 2 = ATK+CD, cast 3+ = all three. Each step gets a DISTINCT
//         buff key, so the three coexist and SUM once SI3 is reached (45s > 40s CD, so steps
//         never lapse between her casts in a sustained fight).
//   V3  = TWO `dot` blocks (one per container — the prose's plural subject "two Missile
//         Containers that deal 15.56% ... every 1 sec" is the per-container reading; the
//         combined-15.56% alternative is HALF this and is the named counterfactual), each
//         atkPct 15.56 / intervalSec 1 / durationSec 18 → 18 ticks per container at
//         cast+1s..cast+18s (sim.ts dot path: first tick at cast+interval, ticks while
//         frame <= endFrame), landing in the burst bucket with FB-by-landing-timing.
//   V4  = ONE `escalating` block on burstCast → enemy with three flatDamage steps: Nth cast
//         deals steps 1..min(N,3) — cast 1 includes SI1's 210.62 (the SI stage granted by the
//         SAME cast; S2 fires "when using Burst Skill", before the burst damage resolves —
//         skill2-slot blocks dispatch before burst-slot blocks). Burst-cast damage lands
//         BEFORE the Full Burst window opens → never takes the +50% FB major.
//   V5  = fullBurstExtend seconds:-5 on burstCast → allies (isabel's "Full Burst Time ▼ 5
//         sec" encoding, exact precedent). Her OWN window shrinks to 5s; windows opened by
//         another B3 (helm in this fixture) stay 10s. ⚑ rotation blast-radius (net sign of
//         FB shortening in the engine's rotation model) carried from the isabel residual.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   V2  nearest-wrong = INSTANT-MAX (all three stats from cast 1 — patched as three
//       unconditional buff blocks): the critRate buff would apply on ALL casts instead of
//       from the 3rd, and totals move. The per-cast frame pins (buff frames == her burstCast
//       frames, counts casts / casts−1 / casts−2) also kill fullBurstEnter keying (which
//       would fire on ALL ~20s FB entries — liter/crown/helm-cast ones included — roughly
//       doubling the application count) and non-cumulative readings (cast 3 applies all
//       THREE stats on one frame).
//   V3  nearest-wrong = ONE container (18 ticks per deployment instead of 36, half the
//       missile damage — exactly the combined-reading alternative), and the level-1
//       magnitude 9.19. The lattice pins (ticks on the cast+60f lattice, 2 per lattice
//       frame, 18 distinct frames per full window) also kill a wrong interval/duration
//       (e.g. borrowing S1's 10s) and a mis-bucketed encoding (skill bucket).
//   V4  nearest-wrong = INSTANT-MAX riders (all three on cast 1) and the level-1 magnitude
//       124.45. The per-cast multiset pin discriminates the two remaining misreadings
//       WITHOUT a patch: STAGE-ONLY (cast N deals only step N) fails cast 3's all-three
//       multiset, and PRE-CAST STAGE (cast N reads the stage before this cast's SI grant)
//       fails cast 1's [210.62] multiset (it would deal nothing on cast 1).
//   V5  nearest-wrong = the +5 sign flip (15s windows on her casts instead of 5s). The
//       10s pin on helm-opened windows proves the shortening is keyed to HER casts, not a
//       global FB rewrite.
//
// Fixture (deterministic — no seed; event-log over totals): the 720-kit-audit CONTROL COMP
// ['liter','crown','vesti','helm'] — liter (B1, 20s) + crown (B2) open every chain, vesti
// (B3, 40s) and helm (B3, 40s) ALTERNATE the stage-3 slot (each casts every second Full
// Burst ≈ every 40s, so vesti reaches her 3rd cast inside 180s and the SI3 steady state is
// observable). Boss Fire (vesti's ×1.1 Water major), focus vesti.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixture ----------------------------------------------------------------------------------
const COMP = ['liter', 'crown', 'vesti', 'helm'];
const VESTI = 2; // vesti's slot in COMP

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Fire',
    focusSlug: 'vesti',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------
const isEscalating = (b: any) =>
  b.effects.some((e: any) => e.kind === 'escalating');
const isDot = (b: any) => b.effects.some((e: any) => e.kind === 'dot');

/** V3 reference: both missile containers removed (proves the line is live). */
const vestiNoMissiles = withPatchedOverride('vesti', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !isDot(b));
  if (ov.burst.length !== before - 2) {
    throw new Error('vesti burst expected exactly two dot blocks — fixture is stale');
  }
});

/** V3 nearest-wrong: ONE container (the combined-15.56%-per-volley alternative reading). */
const vestiOneContainer = withPatchedOverride('vesti', (ov) => {
  const dots = ov.burst.filter((b: any) => isDot(b));
  if (dots.length !== 2) {
    throw new Error('vesti burst expected exactly two dot blocks — fixture is stale');
  }
  ov.burst = ov.burst.filter((b: any) => b !== dots[1]);
});

/** V3 nearest-wrong: the level-1 magnitude 9.19 instead of 15.56. */
const vestiWrongMissileMag = withPatchedOverride('vesti', (ov) => {
  for (const b of ov.burst.filter((b: any) => isDot(b))) {
    for (const e of b.effects.filter((x: any) => x.kind === 'dot')) {
      e.atkPct = 9.19;
    }
  }
});

/** V2 reference: the whole Survival Instinct escalation removed (proves the buffs are live). */
const vestiNoSiBuffs = withPatchedOverride('vesti', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isEscalating(b));
  if (ov.skill2.length !== before - 1) {
    throw new Error('vesti skill2 expected one escalating block — fixture is stale');
  }
});

/** V2 nearest-wrong (instant-max): all three SI stats from cast 1 (escalation stripped). */
const vestiInstantMaxSi = withPatchedOverride('vesti', (ov) => {
  const b = ov.skill2.find((x: any) => isEscalating(x));
  if (!b) {
    throw new Error('vesti skill2 escalating block missing — fixture is stale');
  }
  const steps = b.effects.find((e: any) => e.kind === 'escalating').steps;
  ov.skill2 = ov.skill2
    .filter((x: any) => x !== b)
    .concat(
      steps.map((s: any) => ({
        slot: 'skill2',
        trigger: { kind: 'burstCast' },
        target: { kind: 'self' },
        effects: [s],
      }))
    );
});

/** V4 reference: the SI-staged additional-damage riders removed entirely. */
const vestiNoRiders = withPatchedOverride('vesti', (ov) => {
  const b = ov.burst.find((x: any) => isEscalating(x));
  if (!b) {
    throw new Error('vesti burst escalating rider block missing — fixture is stale');
  }
  ov.burst = ov.burst.filter((x: any) => x !== b);
});

/** V4 nearest-wrong (instant-max): all three riders on every cast, from cast 1. */
const vestiInstantMaxRiders = withPatchedOverride('vesti', (ov) => {
  const b = ov.burst.find((x: any) => isEscalating(x));
  if (!b) {
    throw new Error('vesti burst escalating rider block missing — fixture is stale');
  }
  const steps = b.effects.find((e: any) => e.kind === 'escalating').steps;
  ov.burst = ov.burst
    .filter((x: any) => x !== b)
    .concat(
      steps.map((s: any) => ({
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'enemy' },
        effects: [s],
      }))
    );
});

/** V4 nearest-wrong: the level-1 magnitude 124.45 instead of 210.62 for step 1. */
const vestiWrongRiderMag = withPatchedOverride('vesti', (ov) => {
  const b = ov.burst.find((x: any) => isEscalating(x));
  if (!b) {
    throw new Error('vesti burst escalating rider block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.kind === 'escalating').steps[0].atkPct = 124.45;
});

/** V5 nearest-wrong: the +5 sign flip (her windows GROW to 15s). */
const vestiSignFlipFb = withPatchedOverride('vesti', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'fullBurstExtend');
  if (!e) {
    throw new Error('vesti fullBurstExtend effect missing — fixture is stale');
  }
  e.seconds = 5;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noMissiles = run({ vesti: vestiNoMissiles });
const oneContainer = run({ vesti: vestiOneContainer });
const wrongMissileMag = run({ vesti: vestiWrongMissileMag });
const noSiBuffs = run({ vesti: vestiNoSiBuffs });
const instantMaxSi = run({ vesti: vestiInstantMaxSi });
const noRiders = run({ vesti: vestiNoRiders });
const instantMaxRiders = run({ vesti: vestiInstantMaxRiders });
const wrongRiderMag = run({ vesti: vestiWrongRiderMag });
const signFlipFb = run({ vesti: vestiSignFlipFb });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const vestiBursts = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'vesti')
    .sort((a, b) => a.frame - b.frame);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart').sort((a, b) => a.frame - b.frame);

const MISSILE_PCT = 15.56;
const RIDER_STEPS = [210.62, 247.25, 302.19];

/** Missile tick damage events: vesti's burst-slot hits at exactly the container magnitude. */
const missiles = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'vesti' && d.srcSlot === 'burst' && d.atkPct === MISSILE_PCT
  );

/** Missile-like events at ANY magnitude (counterfactual reads — the kit filter would hide a
 *  wrong magnitude). The burst bucket carries only container ticks + SI riders, so excluding
 *  the three rider steps isolates the missile line. */
const missileAny = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'vesti' && d.srcSlot === 'burst' && !RIDER_STEPS.includes(d.atkPct)
  );

/** SI rider damage events: vesti's burst-slot hits at any of the three staged magnitudes. */
const riders = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'vesti' && d.srcSlot === 'burst' && RIDER_STEPS.includes(d.atkPct)
  );

/** Rider-like events at ANY magnitude (counterfactual reads) — the burst bucket minus the
 *  container ticks. */
const riderAny = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'vesti' && d.srcSlot === 'burst' && d.atkPct !== MISSILE_PCT
  );

/** Group a deployment's tick events off their cast frame (ticks land cast+60f .. cast+1080f). */
const deploymentOf = (hits: Damage[], castFrame: number) =>
  hits.filter((d) => d.frame > castFrame && d.frame <= castFrame + 18 * FPS);

describe('vesti — kit spec', () => {
  it('fixture sanity: advantaged, ≥3 own casts (SI3 reachable), alternating B3 with helm', () => {
    expect(unitOf(base.res, 'vesti').advantaged).toBe(true);
    const casts = unitOf(base.res, 'vesti').burstCasts;
    expect(casts, 'needs ≥3 casts so the SI3 steady state is observable').toBeGreaterThanOrEqual(3);
    expect(unitOf(base.res, 'helm').burstCasts).toBeGreaterThanOrEqual(1);
    expect(base.res.fullBursts).toBeGreaterThanOrEqual(6);
  });

  describe('V2 — Survival Instinct: burst-use escalation of ATK / Crit Damage / Crit Rate (45s each)', () => {
    const casts = vestiBursts(base.events);
    const castFrames = casts.map((c) => c.frame);
    const si = (evs: SimEvent[], stat: string) =>
      buffs(evs)
        .filter((b) => b.casterIdx === VESTI && b.targetIdx === VESTI && b.stat === stat)
        .sort((a, b) => a.frame - b.frame);

    it('SI1 (ATK ▲5.35%) applies on EVERY own burst cast, at the cast frame, for 45s', () => {
      const applied = si(base.events, 'atkPct');
      expect(applied.length).toBe(casts.length);
      expect(applied.map((b) => b.frame)).toEqual(castFrames);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([5.35]);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([45 * FPS]);
    });

    it('SI2 (Crit Damage ▲22.34%) applies from the 2nd cast on, cumulative', () => {
      const applied = si(base.events, 'critDamagePct');
      expect(applied.length).toBe(casts.length - 1);
      expect(applied.map((b) => b.frame)).toEqual(castFrames.slice(1));
      expect([...new Set(applied.map((b) => b.value))]).toEqual([22.34]);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([45 * FPS]);
    });

    it('SI3 (Crit Rate ▲15.51%) applies from the 3rd cast on, cumulative', () => {
      const applied = si(base.events, 'critRatePct');
      expect(applied.length).toBe(casts.length - 2);
      expect(applied.map((b) => b.frame)).toEqual(castFrames.slice(2));
      expect([...new Set(applied.map((b) => b.value))]).toEqual([15.51]);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([45 * FPS]);
    });

    it('is CUMULATIVE: the 3rd cast applies all three stats on one frame', () => {
      expect(casts.length).toBeGreaterThanOrEqual(3);
      const atCast3 = buffs(base.events).filter(
        (b) => b.casterIdx === VESTI && b.frame === castFrames[2]
      );
      expect([...new Set(atCast3.map((b) => b.stat))].sort()).toEqual(
        ['atkPct', 'critDamagePct', 'critRatePct'].sort()
      );
    });

    it('is keyed to HER burstCast (not fullBurstEnter): applications never outnumber her casts', () => {
      // fullBurstEnter keying would fire on every ~20s FB entry (incl. liter/crown/helm-cast
      // ones) — roughly double. The exact-frame pins above already force equality with her
      // cast frames; this pins the COUNT gap vs the ~2x FB cadence explicitly.
      expect(base.res.fullBursts).toBeGreaterThan(casts.length);
      expect(si(base.events, 'atkPct').length).toBe(casts.length);
    });

    it('is damage-RELEVANT: removing the escalation strictly lowers her total', () => {
      expect(base.totals.vesti).toBeGreaterThan(noSiBuffs.totals.vesti);
    });

    it('DISCRIMINATING: instant-max grants Crit Rate on ALL casts (and moves totals)', () => {
      const wrong = si(instantMaxSi.events, 'critRatePct');
      expect(wrong.length).toBe(vestiBursts(instantMaxSi.events).length);
      expect(instantMaxSi.totals).not.toEqual(base.totals);
    });
  });

  describe('V3 — two Missile Containers: 15.56% of final ATK each, every 1s for 18s per cast', () => {
    const casts = vestiBursts(base.events);
    const hits = missiles(base.events);

    it('every deployment ticks on the cast+60f lattice, 2 containers per lattice frame', () => {
      expect(hits.length).toBeGreaterThan(0);
      for (const c of casts) {
        const dep = deploymentOf(hits, c.frame);
        expect(dep.length, `deployment at ${c.frame / FPS}s`).toBeGreaterThan(0);
        // lattice: every tick frame is cast + k*60 (1 <= k <= 18)
        for (const d of dep) {
          expect((d.frame - c.frame) % FPS).toBe(0);
          expect(d.frame - c.frame).toBeGreaterThanOrEqual(FPS);
          expect(d.frame - c.frame).toBeLessThanOrEqual(18 * FPS);
        }
        // exactly TWO container hits per occupied lattice frame
        const perFrame = new Map<number, number>();
        for (const d of dep) {
          perFrame.set(d.frame, (perFrame.get(d.frame) ?? 0) + 1);
        }
        for (const [, n] of perFrame) {
          expect(n, 'two containers fire per volley').toBe(2);
        }
      }
    });

    it('a FULL 18s window produces 18 volleys = 36 hits (first deployment is always complete)', () => {
      const dep = deploymentOf(hits, casts[0].frame);
      expect(dep.length).toBe(36);
      const frames = [...new Set(dep.map((d) => d.frame))].sort((a, b) => a - b);
      expect(frames.length).toBe(18);
      expect(frames[0]).toBe(casts[0].frame + FPS);
      expect(frames[17]).toBe(casts[0].frame + 18 * FPS);
    });

    it('lands in the burst bucket with the kit magnitude, from vesti alone', () => {
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([MISSILE_PCT]);
    });

    it('follows FB-by-landing-timing: ticks inside an FB window take the +50% major', () => {
      // Engine convention for burst-placed dots (sim.ts skillNoFb): no cast-time exemption,
      // FB by landing. Her 5s windows guarantee some ticks land in-FB.
      expect(hits.some((d) => d.fbMajorApplied)).toBe(true);
      expect(hits.every((d) => d.fbMajorApplied === d.inFullBurst)).toBe(true);
    });

    it('is damage-RELEVANT: removing both containers strictly lowers her total', () => {
      expect(base.totals.vesti).toBeGreaterThan(noMissiles.totals.vesti);
    });

    it('DISCRIMINATING: one container halves the volley count; level-1 9.19 is NOT what ships', () => {
      const oneHits = missiles(oneContainer.events);
      const firstDep = deploymentOf(oneHits, vestiBursts(oneContainer.events)[0].frame);
      expect(firstDep.length).toBe(18);
      const perFrame = new Map<number, number>();
      for (const d of firstDep) {
        perFrame.set(d.frame, (perFrame.get(d.frame) ?? 0) + 1);
      }
      for (const [, n] of perFrame) {
        expect(n).toBe(1);
      }
      expect(oneContainer.totals.vesti).toBeLessThan(base.totals.vesti);
      expect([...new Set(missileAny(wrongMissileMag.events).map((d) => d.atkPct))]).toEqual([9.19]);
      expect(wrongMissileMag.totals).not.toEqual(base.totals);
    });
  });

  describe('V4 — SI-staged burst additional damage: cumulative riders incl. the same-cast stage', () => {
    const casts = vestiBursts(base.events);
    const hits = riders(base.events);

    it('cast N deals steps 1..min(N,3) — cast 1 includes SI1 (same-cast stage), cast 3+ all three', () => {
      expect(hits.length).toBeGreaterThan(0);
      casts.forEach((c, i) => {
        const atCast = hits.filter((d) => d.frame === c.frame).map((d) => d.atkPct).sort((a, b) => a - b);
        const expected = RIDER_STEPS.slice(0, Math.min(i + 1, 3)).sort((a, b) => a - b);
        expect(atCast, `cast ${i + 1} riders`).toEqual(expected);
      });
    });

    it('lands in the burst bucket and NEVER takes the +50% FB major (cast resolves before FB opens)', () => {
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['burst']);
      expect(hits.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('is damage-RELEVANT: removing the riders strictly lowers her total', () => {
      expect(base.totals.vesti).toBeGreaterThan(noRiders.totals.vesti);
    });

    it('DISCRIMINATING: instant-max deals all three on cast 1; level-1 124.45 is NOT what ships', () => {
      const wrongCasts = vestiBursts(instantMaxRiders.events);
      const cast1 = riders(instantMaxRiders.events)
        .filter((d) => d.frame === wrongCasts[0].frame)
        .map((d) => d.atkPct);
      expect(cast1.sort((a, b) => a - b)).toEqual([...RIDER_STEPS].sort((a, b) => a - b));
      expect(instantMaxRiders.totals).not.toEqual(base.totals);
      const wrongMag = riderAny(wrongRiderMag.events).map((d) => d.atkPct);
      expect(wrongMag).toContain(124.45);
      expect(wrongMag).not.toContain(210.62);
    });
  });

  describe('V5 — Full Burst Duration ▼ 5 sec on HER casts (allies), not a global rewrite', () => {
    // PREFB engine convention: the FB window OPENS 22 frames after the B3 cast
    // (FB_PRE_DELAY_FRAMES, frame-measured), so the opener is the last stage-3 burstCast at or
    // before the window start — NOT a same-frame match.
    const openerSlug = (evs: SimEvent[], fbFrame: number): string | null => {
      const prior = evs.filter(
        (e): e is BurstCast => e.kind === 'burstCast' && e.stage === 3 && e.frame <= fbFrame
      );
      return prior.length ? prior[prior.length - 1].slug : null;
    };

    it('every FB window vesti opens lasts exactly 5s; every other window lasts 10s', () => {
      const starts = fbStarts(base.events);
      expect(starts.length).toBeGreaterThanOrEqual(6);
      let vestiOpened = 0;
      for (const s of starts) {
        const dur = s.endFrame - s.frame;
        if (openerSlug(base.events, s.frame) === 'vesti') {
          expect(dur, `vesti-opened FB at ${s.frame / FPS}s`).toBe(5 * FPS);
          vestiOpened++;
        } else {
          expect(dur, `non-vesti FB at ${s.frame / FPS}s`).toBe(10 * FPS);
        }
      }
      expect(vestiOpened).toBeGreaterThanOrEqual(1);
    });

    it('DISCRIMINATING: the +5 sign flip grows her windows to 15s', () => {
      const wrongStarts = fbStarts(signFlipFb.events);
      const herDurations = wrongStarts
        .filter((s) => openerSlug(signFlipFb.events, s.frame) === 'vesti')
        .map((s) => s.endFrame - s.frame);
      expect(herDurations.length).toBeGreaterThanOrEqual(1);
      expect([...new Set(herDurations)]).toEqual([15 * FPS]);
    });
  });

  describe('V1 — Explosion Radius ▲15.01% is faithfully UNMODELED (no radius stat exists)', () => {
    it('ABSENCE CANARY: no projectileExplosionPct application from vesti (the nearest-wrong stat)', () => {
      expect(
        buffs(base.events).filter(
          (b) => b.casterIdx === VESTI && b.stat === 'projectileExplosionPct'
        )
      ).toEqual([]);
    });

    it('no explosion-radius-flavored buff of any kind comes from vesti', () => {
      expect(
        buffs(base.events).filter(
          (b) => b.casterIdx === VESTI && /radius/i.test(b.stat)
        )
      ).toEqual([]);
    });
  });
});
```

## Driver override (src/skills/overrides/vesti.json) — validate-overrides PASS

```json
{
  "note": "vesti (Vesti) — Elysion RL ATTACKER, Water, Burst III, cd 40s, ammo 6, reloadFrames 142, chargeFrames 60, chargeMultiplier 250, normalMult 61.3 / coreMult 200, critRate 15 / critDamage 150. P0 DISAMBIGUATION: this is BASE `vesti` (RL/Water, resource_id 91) — NOT `vesti-tactical-upgrade` (RL/Fire, aka vtu/vestitu); the slug-disambiguation lint flags the shared base name (advisory, exit 0) and every artifact keys `characters['vesti']`. Kit-autonomy gauntlet 2026-08-05: GREENFIELD build (no shipped override existed; simSupported was false) — test-first re-derivation (scripts/tests/units/vesti.test.ts, groups V2/V3/V4/V5 + V1 absence canaries + counterfactual discrimination). A burst-use ESCALATING carry: her damage lives in the Survival-Instinct-staged burst riders + the twin missile containers, both keyed to her own burst casts (≈ every 40s alongside a co-B3). || MODELED TODAY: (S2 'Survival Instinct') 'Activates when using Burst Skill. Effects vary according to the number of times used. Each subsequent effect triggers all effects before it: Once ATK ▲5.35% / Twice Critical Damage ▲22.34% / Three times Critical Rate ▲15.51%, each for 45 sec' = ONE `escalating` block on burstCast → self with three buff steps (atkPct 5.35 / critDamagePct 22.34 / critRatePct 15.51, durationSec 45): the Nth OWN cast applies steps 1..N (isabel Marked-Target precedent), each step a DISTINCT buff key so all three coexist and SUM from cast 3 (45s > 40s CD → steps never lapse between her casts in a sustained fight). burstCast = her OWN casts only — NOT fullBurstEnter (a co-B3's rotation must not advance her stage; pinned in the spec). (BURST line 1 'two Missile Containers') 'Deploys two Missile Containers that deal 15.56% of final ATK as damage to the enemy with the lowest remaining HP every 1 sec for 18 sec' = TWO `dot` blocks, one PER CONTAINER (the prose's plural subject 'two Missile Containers that deal 15.56% ... every 1 sec' is the per-container reading — the combined-15.56%-per-volley alternative is HALF this and is the spec's named counterfactual), each atkPct 15.56 / intervalSec 1 / durationSec 18 → 18 ticks per container at cast+1s..cast+18s (sim.ts dot path: first tick at cast+interval, ticks while frame <= endFrame) = 36 hits / 560.16% ATK-equivalent per deployment, burst bucket, noRange (dot path hardcodes), never cores, crit OFF (DOT_CRIT default — unmeasured for this carrier, ⚑ below), FB-by-landing-timing (burst-placed dots are not cast-FB-exempt — sim.ts skillNoFb; her own 5s windows guarantee in-FB ticks). Burst CD 40s > 18s window → deployments never overlap. 'Enemy with the lowest remaining HP' targeting is scope-trivial at single-boss (exia precedent). (BURST line 2 SI-staged riders) 'Affects all enemies. Effects vary for each stage of Survival Instinct. Each subsequent effect triggers all effects before it: SI1 210.62% / SI2 247.25% / SI3 302.19% of final ATK as additional damage' = ONE `escalating` block on burstCast → enemy with three flatDamage steps: the Nth cast deals steps 1..min(N,3) — CUMULATIVE and SAME-CAST-INCLUSIVE (cast 1 deals 210.62: S2 fires 'when using Burst Skill', and skill2-slot blocks dispatch BEFORE burst-slot blocks, so the SI stage granted by the cast is the stage the burst reads). Burst-cast damage lands BEFORE the Full Burst window opens → never takes the +50% FB major (verified fact); instant riders keep noRange:true + no core (flatDamage defaults). (BURST line 3) 'Affects all allies. Full Burst Duration ▼ 5 sec.' = burstCast → allies → fullBurstExtend seconds:-5 — isabel's 'Full Burst Time ▼ 5 sec' encoding exactly: the FB window HER cast opens shrinks to 5s (fullBurstExtend applies to the live window her cast just set); windows opened by another B3's cast stay 10s. A rotation mechanic (halves the +50% window on her rotations), damage-relevant, NOT a skippable utility line. || UNMODELED (verbatim in `unmodeled`, reason here): (S1) 'Activates when performing a Full Charge attack. Explosion Radius ▲ 15.01% for 10 sec.' — 'Explosion Radius' is an AoE RADIUS, not a damage stat: no radius stat exists in the schema and it is damage-INERT vs the single partless scope-lock boss (splash radius moves no damage) — the vesti-tactical-upgrade burst carries the identical residual for the identical reason. Nearest-wrong counterfactual: projectileExplosionPct 15.01 (a REAL Damage-Up stat that would silently credit +15% explosion-flavored damage); the spec pins its absence. || TIER 2 encoding (two burstCast-keyed escalating usage counters, fullBurstExtend sign, dot cadence, burstCast-vs-fullBurstEnter keying). || ⚑ FLAGS: (⚑1 CADENCE TUPLE, mandatory) RL charge cadence (chargeFrames 60 / reloadFrames 142 / ammo 6) shipped at datamine-synced values; drives her pull count, gauge contribution, and full-charge count. Estimate = datamine as-is. Recipe = rounds/min + reload gap from any focused vesti video. Tier: low. (⚑2 MISSILE CRIT, unmeasured) the container ticks ride the engine's DoT-crit default OFF (DOT_CRIT gate; most DoTs validated non-crit, opt-in measured-only — isabel/jill/mihara precedent); in-game the missiles APPEAR to crit but no popup read exists for this carrier. Estimate: if they crit at her sheet rate (~15-30% with SI3), missiles are worth ≈ critRate × (critMult−1) ≈ +8-15% of the missile line (≈ +2-4% of her total). Recipe: popup-read a missile volley for orange crit bodies on a vesti focus video; on confirmation add crit:true to both dot blocks. Tier: 2. (⚑3 MISSILE CONTAINER COUNT, prose-literal ruling) the two-container reading (2 × 15.56%/s = 560.16% per deployment) is the prose-literal one and matches the datamine's explicit container-count value 2 (ulti_skill skill_value_data); the combined-volley alternative (280.08%) is exactly half and is the spec's oneContainer counterfactual — no footage exists to discriminate further. Recipe: count missile popups in one 18s window on a vesti focus video (36 vs 18). Tier: 2. (⚑4 FB-DURATION BLAST RADIUS, carried from isabel) the net rotation sign of fullBurstExtend:-5 in the engine's rotation model (per-cycle FB shortening vs faster next-cycle) is UNVERIFIED — needs a /sim-battery diff; pull if it spuriously net-harms the board. Tier: 2. || EVIDENCE TIER: every magnitude/duration/trigger is kit-text-literal (DATAMINED lvl-10); the only estimates are the ⚑ flags above. Faithful > fit; measured > fudge. || Kit-autonomy gauntlet 2026-08-05: cross-family S2b (claude-fable-5) test review CONVERGED on all 5 lines (4 FAITHFUL + V1 UNMODELED, leakDetected null); reviewer's shared-prior trap list (fullBurstEnter keying, FB-line drop, container halving, escalation cumulativity, nuke FB-exemption) is exactly what the spec's counterfactuals discriminate.",
  "unmodeled": {
    "skill1": [
      "■ Activates when performing a Full Charge attack. Affects self.\nExplosion Radius ▲ 15.01% for 10 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: 'Explosion Radius ▲15.01% for 10s' is UNMODELED — no explosion-radius stat exists in the schema and radius is damage-inert vs the single partless boss (vesti-tactical-upgrade carries the identical residual for its burst radius line). The nearest-wrong encoding (projectileExplosionPct 15.01) is pinned absent by the spec",
    "burst: the missile containers are modeled as TWO dots (one per container, prose-literal + datamine container-count 2) — 36 ticks × 15.56% = 560.16% ATK-equivalent per deployment; the combined-volley alternative is exactly half (⚑3, popup-count recipe). Ticks ride the DoT conventions: never core, noRange, crit OFF until measured (⚑2), FB-by-landing-timing (burst-placed dots are not cast-FB-exempt)",
    "burst: the SI-staged riders are cumulative AND same-cast-inclusive — cast 1 deals 210.62% (the SI stage granted by that same cast; skill2-slot blocks dispatch before burst-slot blocks); cast 3+ deals all three steps = 760.06%. Burst-cast damage lands before the Full Burst window opens → never takes the +50% major",
    "burst: 'Full Burst Duration ▼ 5 sec' = fullBurstExtend:-5 on her OWN casts (isabel precedent) — her windows run 5s, co-B3-opened windows stay 10s. Net rotation blast-radius sign unverified (⚑4, carried from isabel)"
  ],
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            { "kind": "buff", "stat": "atkPct", "value": 5.35, "durationSec": 45 },
            { "kind": "buff", "stat": "critDamagePct", "value": 22.34, "durationSec": 45 },
            { "kind": "buff", "stat": "critRatePct", "value": 15.51, "durationSec": 45 }
          ]
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "dot", "atkPct": 15.56, "durationSec": 18, "intervalSec": 1 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "dot", "atkPct": 15.56, "durationSec": 18, "intervalSec": 1 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "escalating",
          "steps": [
            { "kind": "flatDamage", "atkPct": 210.62 },
            { "kind": "flatDamage", "atkPct": 247.25 },
            { "kind": "flatDamage", "atkPct": 302.19 }
          ]
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "fullBurstExtend", "seconds": -5 }]
    }
  ]
}
```
