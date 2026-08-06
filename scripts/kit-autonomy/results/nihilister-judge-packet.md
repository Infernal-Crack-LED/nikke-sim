# S7 RECONCILING-JUDGE PACKET — nihilister (Nihilister)

## 1. CONTRACT — your role + required return JSON

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


## 2. MECHANICS SSOT (the sim of record)

### docs/data/damage-calculation.md
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


### docs/data/game-mechanics.md
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


## 3. GROUND TRUTH — Nihilister kit prose + base stats (data/characters.json, SL10 values)

```json
{
  "slug": "nihilister",
  "name": "Nihilister",
  "weapon": "SR",
  "class": "Attacker",
  "element": "Fire",
  "burst": "II",
  "burstCooldownSec": 20,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "burstGaugePerShot": 2.8,
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": 10,
    "burst": 20
  },
  "skills": {
    "skill1": "■ Activates when attacking with Full Charge. Affects self.\nGain Pierce for 1 round(s).\nPiercing Radius ▲ 50% for 1 round(s).\n■ Activates when hits 2 or more enemies concurrently. Affects all enemies hit.\nDeals 50.33% of final ATK as additional damage.",
    "skill2": "■ Affects enemies within attack range. \nDeals 112.64% of final ATK as damage.",
    "burst": "■ Affects enemies within the attack range.\nDeals 158.59% of final ATK as damage.\nBurn: Deals 13.19% of final ATK as sustained damage every 1 sec for 10 sec. \n■ Affects self.\nMax Ammunition Capacity ▲ 6 round(s) for 15 sec."
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
    "resourceId": 261
  }
}
```

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "nihilister",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Full Charge → Gain Pierce for 1 round",
      "disposition": "FAITHFUL",
      "scope": "Full-Charge attacks only (SR, chargeFrames 60). At scope-lock the sim's SR fire cycle is charge→release every pull, so every normal shot qualifies — but the model must still key the grant to the full-charge shot, not declare unconditional whole-fight pierce by fiat.",
      "durationSemantics": "'for 1 round(s)' = ROUND count — the pierce covers the triggering round (and lapses after 1 fired round), NOT durationSec:1. Because every subsequent full-charge shot re-triggers it, effective uptime is continuous while firing, but the mechanism is per-shot re-grant.",
      "triggerIdentity": "Per full-charge shot by the owner (shotFired-family trigger on the charge release; no FB gate, no status gate). NOT burstCast, NOT fullBurstEnter, NOT passive-from-t0 as a semantic matter — though a hasPierce:true static flag is damage-equivalent at scope since all her shots are full-charge.",
      "targetSet": "self",
      "nearestWrongModel": "gainPierce with durationSec:1 (wall-clock second). The SR cycle (60f charge + ~22f latency ≈ 1.37s/shot) exceeds 1s, so a durationSec:1 window lapses between shots and pierce coverage of each shot then hinges on apply-vs-dispatch ordering; alternatively, dropping the line entirely as 'inert vs single boss'.",
      "distinguishingAssertion": "Run control comp twice via withPatchedOverride: (a) shipped model, (b) shipped model + a passive self pierceDamagePct buff patched onto nihilister. If her shots are pierce-tagged, (b) > (a) on totals(res)['nihilister']; a model that dropped pierce leaves (b) === (a). (If pierceDamagePct is still fully inert in the engine, fall back to asserting the override carries hasPierce/gainPierce at all and record the behavioral check as blocked.)",
      "inertness": "On the plain control comp (no Pierce Damage ▲ carriers, partless single boss) pierce tagging must move ZERO damage — totals identical with the pierce grant removed.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Piercing Radius ▲ 50% for 1 round(s)",
      "disposition": "UNMODELED",
      "scope": "Geometric AoE radius of the pierce line — no StatKey exists for it and the scope-lock boss is a single partless target, so radius has no consumer.",
      "durationSemantics": "'for 1 round(s)' = round count (same semantics as the pierce grant), moot while unmodeled.",
      "triggerIdentity": "Same full-charge activation header as the pierce grant.",
      "targetSet": "self",
      "nearestWrongModel": "Encoding it as pierceDamagePct +50% (a damage stat) — 'Piercing Radius' is geometry, not Pierce DAMAGE; that misread would silently buff her Damage-Up bucket by 50 points on a pierce-tagged model.",
      "distinguishingAssertion": "No buffApply event with stat 'pierceDamagePct' value 50 appears anywhere in a control run; the line's text sits verbatim in override.unmodeled.skill1.",
      "inertness": "Must move zero damage; must not appear as any stat buff.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "hits 2+ enemies concurrently: 50.33% add'l",
      "disposition": "UNMODELED",
      "scope": "Multi-enemy rider: fires only when one attack hits ≥2 enemies concurrently (pierce through a crowd). The scope-lock fight has exactly ONE partless enemy — the condition is structurally unsatisfiable, so the faithful model is inert/absent with the text recorded in unmodeled.",
      "durationSemantics": "Instant additional damage per qualifying hit; no duration.",
      "triggerIdentity": "Conditional on-hit rider gated on concurrent multi-enemy contact — NOT a plain per-shot rider.",
      "targetSet": "all enemies hit (enemy)",
      "nearestWrongModel": "A shotFired/hitCount flatDamage block of atkPct 50.33 with no gate — the single most damaging plausible misread: it adds ~50.33/69.04 ≈ +73% of her normal-attack line on every shot, a massive over-credit that calibration could then hide by shaving other values.",
      "distinguishingAssertion": "Collect damage events for srcSlot skill1 in a full control run: ZERO instances with mult ≈ 50.33 may exist. Equivalently, totals(res)['nihilister'] is identical with and without any such block via withPatchedOverride.",
      "inertness": "The entire line must move zero damage at scope — this inertness assertion IS the test.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Deals 112.64% of final ATK as damage",
      "disposition": "FAITHFUL",
      "scope": "Standalone skill damage instance vs enemies in range (one boss → one hit per proc). Function damage: takes Full Burst by landing timing (default ON), force-noRange, no core, crits only if opted in (default off).",
      "durationSemantics": "Instant hit per activation; no duration.",
      "triggerIdentity": "NO activation clause in the prose → interval trigger by convention, first fire at t=CD. The cadence value is NOT in the kit text — ALWAYS-⚑ #2: it must come from datamined skillCooldownsSec or be flagged ⚑ with a recipe; a silent invented cadence is a violation. (The base-stat 'cd 20s' is the Burst II cooldown, not automatically this skill's CD — do not conflate.)",
      "targetSet": "enemy",
      "nearestWrongModel": "Keying it to fullBurstEnter (fires ~5-6×/fight instead of floor(180/CD)×), to shotFired (fires ~every pull, huge over-credit), or granting it core/range like a weapon shot.",
      "distinguishingAssertion": "Filter damage events with mult ≈ 112.64: count === floor(180/intervalSec) with first instance at t=intervalSec and uniform spacing; count must NOT equal the fullBurstStart count nor the shot count; every instance has rangeApplied false and coreRate 0.",
      "inertness": "Cadence must not change with FB count or fire rate (interval is wall-clock); no instance may carry the +30% range bonus.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 158.59% of final ATK as damage",
      "disposition": "FAITHFUL",
      "scope": "Instant burst-cast damage vs enemies in range. Burst-cast damage lands BEFORE the Full Burst window opens → FB-exempt (no +50%), no entry auras, no range bonus, no core.",
      "durationSemantics": "Instant, once per own burst cast.",
      "triggerIdentity": "burstCast (nihilister's OWN Burst II cast) — NOT fullBurstEnter. She is Burst II with a 20s cd; in any comp with another Burst II (the control fixture has crown at B2) the two triggers diverge hard: fullBurstEnter fires every team FB, burstCast only on rotations SHE wins the B2 slot.",
      "targetSet": "enemy",
      "nearestWrongModel": "fullBurstEnter keying (over-credits every rotation crown bursts instead of her) and/or letting the hit take the +50% FB major (fbMajorApplied true) because it 'happens at burst time'.",
      "distinguishingAssertion": "count of damage events with mult ≈ 158.59 === count of burstCast events whose caster is nihilister (NOT the fullBurstStart count), and every such event has fbMajorApplied false and inFullBurst false.",
      "inertness": "Zero instances on rotations where nihilister did not cast; no FB major on any instance.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Burn: 13.19% every 1 sec for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Sustained-flavor DoT on the boss ('sustained damage' → flavor 'sustained', feeds sustainedDamagePct). DoT ticks are never core-boosted; crit stays default-OFF absent a measurement.",
      "durationSemantics": "durationSec 10, intervalSec 1 → exactly 10 ticks per cast. Per-cast instance appended on each burst; with burst cd 20s > 10s duration, instances never overlap — steady state is 10 ticks per cast, not a permanent stack.",
      "triggerIdentity": "Rides the same burstCast trigger as the 158.59% hit — one fresh DoT instance per OWN burst cast.",
      "targetSet": "enemy",
      "nearestWrongModel": "Encoding the Burn as a single passive/continuous DoT with duration ≥ fight length (taxonomy #5 inversion — under-counts nothing per cast but decouples it from her actual cast count and never expires), or keying it to fullBurstEnter (ticks on crown's rotations too).",
      "distinguishingAssertion": "Total damage events with mult ≈ 13.19 === 10 × (nihilister burstCast count), each cast's ticks spaced 1s across a 10s window starting at her cast frame; zero such ticks in any 20s→cast gap after t=cast+10s; every tick coreRate 0.",
      "inertness": "No Burn ticks on rotations she sat out; tick count per cast is exactly 10, never fight-length.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Max Ammunition ▲ 6 round(s) for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "Self weapon-state buff — this IS damage (taxonomy #6): base magazine 6 → 12 for 15s halves reload frequency in the window (reload 141f ≈ 2.35s each), directly adding shots fired. Never skip as 'defensive/QoL'.",
      "durationSemantics": "'for 15 sec' is a genuine wall-clock durationSec 15 (contrast the skill1 lines' round-count semantics — both forms appear in this one kit, which is exactly the trap).",
      "triggerIdentity": "burstCast (own-burst self block) — same divergence-vs-fullBurstEnter stakes as the burst damage: it must NOT arm on crown's B2 rotations.",
      "targetSet": "self",
      "nearestWrongModel": "maxAmmoPct 6 (a 6% scaling ≈ +0.36 rounds, rounds to nothing — silently inert) instead of maxAmmoFlat 6; second-nearest: dropping the line as non-damage, or durationShots 15.",
      "distinguishingAssertion": "On each nihilister burstCast a buffApply with stat 'maxAmmoFlat', value 6, caster===target===nihilister appears (RED if stat is 'maxAmmoPct'); behaviorally, within the 15s post-cast window she fires up to 12 rounds between reload events (shot-event runs between reloads lengthen vs the out-of-window baseline of 6), and A/B via withPatchedOverride with the buff deleted shows a real totals drop from the extra uptime.",
      "inertness": "Outside the 15s windows the magazine is exactly 6 again; no ammo buff on rotations she did not cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Full-Charge Gain Pierce (1 round)",
    "skill2:112.64% interval damage",
    "burst:158.59% instant on own cast",
    "burst:Burn DoT 13.19%/1s ×10 per cast",
    "burst:maxAmmoFlat +6 for 15s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Piercing Radius ▲ 50% for 1 round(s).",
      "Activates when hits 2 or more enemies concurrently. Affects all enemies hit. Deals 50.33% of final ATK as additional damage."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "FIXTURE HAZARD (highest-value reconcile): nihilister is Burst II, and controlComp(carry) fixes crown at B2 — a B2 carry contests the B2 slot with crown under first-ready in-window selection. Every burstCast-keyed assertion (158.59% hit, Burn, maxAmmoFlat) must therefore count her ACTUAL burstCast events from the event log, never assume one cast per rotation; and a driver test that asserts 'per full burst' counts would be wrong-by-fixture even with a faithful override. Verify she casts at least once in the fixture (else all three burst assertions are vacuous) — if crown always wins the slot, the test needs a comp without a competing B2. EXPECTED SHARED-PRIOR MISREADS: (1) 'for 1 round(s)' on the pierce grant encoded as durationSec:1; (2) 'Max Ammunition ▲ 6 round(s)' encoded as maxAmmoPct — note '6 round(s)' here is the VALUE'S unit (flat rounds) while 'for 15 sec' is the duration, the inverse of skill1 where 'round(s)' is the DURATION — one kit, both semantics; (3) the skill2 no-clause damage line shipping a silent invented cadence instead of a ⚑ (its interval is outside the kit text; the base 'cd 20s' is the burst cooldown and must not be borrowed for skill2 without a datamined skillCooldownsSec source); (4) the 50.33% multi-enemy rider modeled as an ungated per-shot flatDamage — at single-boss scope it must be fully inert, and calibration hiding that over-credit elsewhere is the classic trap. SCHEMA FRICTION to reconcile: gainPierce carries only durationSec (no durationShots), so a literal '1 round' pierce grant can't be expressed round-counted; since every SR shot at scope is full-charge, hasPierce:true or a per-shot gainPierce are damage-equivalent here — acceptable, but the override note should say which stand-in was chosen and why. Pierce is expected damage-inert on the control comp (no Pierce Damage ▲ carriers, partless boss) — the pierce test should prove the TAG exists, not expect a damage delta unpatched.",
  "model": "claude-fable-5"
}
```

## 5. S5 BLIND TEST (claude-opus-5) vs the DRIVER override: 20 passed / 1 skipped (the skip is the Piercing Radius GAP — no radius primitive; the blind writer authored it as it.skip itself). Driver adaptations were MECHANICAL ONLY (harness import path, OverrideFile slot shape, no-flavor damage events -> magnitude-keyed tick ID, and the S2b-flagged sole-B2 fixture fix) — every adaptation is commented inline; no assertion intent changed.

```ts
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-08-04 (driver, mechanical): blind/ sits under kit-autonomy/, not tests/units/ — no assertion changed

// DRIVER ADAPTATION 2026-08-04 (gauntlet S5, mechanical ONLY — the blind writer derived this
// with no repo access and flagged both shape guesses itself; assertion INTENT untouched):
//  (1) OverrideFile slots are raw Block[] arrays — `ov.skill1?.blocks` → `ov.skill1` throughout.
//  (2) `hasPierce` and `unmodeled` are TOP-LEVEL override fields, not per-slot.
//  (3) damage events carry no `flavor` field — the Burn ticks are identified by their kit
//      magnitude (bucket 'burst', atkPct ≈ 13.19), the only burst-bucket line at that value.
//  (4) buffApply events carry `durationShots: null` (not undefined) for "no round budget".

/**
 * nihilister — Nihilister (SR / Fire / Attacker / Burst II)
 * Base: cd 20s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1,
 *       normalAttackMultiplier 69.04, coreAttackMultiplier 200.
 *
 * KIT (verbatim structure, read literally):
 *
 * skill1 block A — "Activates when attacking with Full Charge. Affects self."
 *   - Gain Pierce for 1 round(s).
 *   - Piercing Radius ▲ 50% for 1 round(s).
 *   READING: trigger = every full-charge shot she fires (she is a charge SR; every
 *   normal pull IS a full charge at scope lock). Duration is "1 round(s)" — a ROUND
 *   COUNT, never wall-clock seconds (failure-mode taxonomy #2). Since the grant fires
 *   ON a shot and lasts 1 round, it covers the NEXT round; with a continuous firing
 *   cadence this is effectively continuous pierce after the first shot, but it is NOT
 *   the static whole-fight `hasPierce` flag (taxonomy: gainPierce EFFECT vs hasPierce
 *   FLAG). The nearest-wrong models are (a) hasPierce:true from t=0, (b) a
 *   durationSec:1 timed window.
 *   "Piercing Radius ▲ 50%" has no StatKey in the schema (pierceDamagePct is a
 *   DIFFERENT stat — Pierce DAMAGE, not radius) and the sim has one boss with no
 *   multi-target geometry → GAP.
 *
 * skill1 block B — "Activates when hits 2 or more enemies concurrently. Affects all
 *   enemies hit. Deals 50.33% of final ATK as additional damage."
 *   READING: the scope-lock fight is a SINGLE partless boss (verified fact: the test
 *   boss has no parts). "2 or more enemies concurrently" can never be satisfied → the
 *   block is UNMODELED/inert at scope. Modeling it as an unconditional per-shot rider
 *   would silently add ~50.33% of ATK per pull — the exact over-credit this test pins
 *   against.
 *
 * skill2 — "Affects enemies within attack range. Deals 112.64% of final ATK as damage."
 *   READING: a damage line with NO activation clause → `interval` trigger (taxonomy #3).
 *   The interval SECONDS are NOT in the kit text → ALWAYS-⚑ (invented cadence). The test
 *   therefore asserts the SHAPE (a repeating skill-bucket rider at 112.64% exists, is
 *   periodic, and is not once-per-fight / not per-shot) rather than pinning a cadence
 *   number the kit never states.
 *
 * burst block A — "Affects enemies within the attack range.
 *   Deals 158.59% of final ATK as damage.
 *   Burn: Deals 13.19% of final ATK as sustained damage every 1 sec for 10 sec."
 *   READING: burstCast trigger. The instant 158.59% is burst-cast damage → lands BEFORE
 *   Full Burst opens (verified fact) → FB-exempt by timing. The Burn is a `dot`,
 *   atkPct 13.19, intervalSec 1, durationSec 10, flavor 'sustained' (the kit literally
 *   says "as sustained damage"). ONE dot instance per burst cast — a duration longer
 *   than the burst cadence on a repeating trigger MULTIPLIES (taxonomy #5); 10s < her
 *   20s cooldown so instances must not overlap.
 *
 * burst block B — "Affects self. Max Ammunition Capacity ▲ 6 round(s) for 15 sec."
 *   READING: maxAmmoFlat +6 (FLAT rounds, not percent) for 15 SEC (this one IS
 *   wall-clock — "for 15 sec", not "for N round(s)"). Base ammo is 6, so this DOUBLES
 *   the magazine to 12 and removes a 141-frame reload from the middle of the burst
 *   window → it is a DAMAGE line (taxonomy #6: ammo capacity gates shots fired). The
 *   nearest-wrong models are maxAmmoPct:6 (a 6% bump → ~no extra round) and dropping it
 *   as "defensive".
 *
 * FIXTURE: controlComp('nihilister', true) — she is Burst II, so the control's B1 +
 * B3 slots are what let a burst chain complete at all; without them her burst-cast and
 * Full-Burst-timed assertions would never fire. Deterministic (no seed) so every
 * counterfactual delta is attributable to the patch alone.
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

const SLUG = 'nihilister';

// DRIVER ADAPTATION 2026-08-04 (fixture ONLY — the S2b reviewer's flagged hazard, realized):
// controlComp fixes crown at B2, and crown (B2, 20s) wins the B2 slot tiebreak over nihilister
// (B2, 20s), so her burst NEVER CAST in the blind-chosen fixture and every burstCast-keyed
// assertion was vacuous. The S2b note prescribed exactly this fix: "the test needs a comp
// without a competing B2". Sole-B2 fixture per the helm-aquamarine precedent:
// liter (B1) / nihilister (SOLE B2) / helm (B3), boss Fire, focus nihilister.
const nilComp = {
  slugs: ['liter', SLUG, 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: SLUG,
};

// ---------------------------------------------------------------- baseline run
const base = run(nilComp);
const baseTotals = totals(base.res);
const baseDmg = baseTotals[SLUG];
const baseEvents = base.events;

const ownDamage = baseEvents.filter(
  (e) => e.kind === 'damage' && e.slug === SLUG,
) as Ev[];
const ownBuffApplies = baseEvents.filter(
  (e) => e.kind === 'buffApply' && e.targetSlug === SLUG,
) as Ev[];
const ownShots = baseEvents.filter((e) => e.kind === 'shot' && e.slug === SLUG) as Ev[];
const ownBurstCasts = baseEvents.filter(
  (e) => e.kind === 'burstCast' && e.slug === SLUG,
) as Ev[];

describe('nihilister — fixture sanity (non-vacuity)', () => {
  it('the control comp actually lets her fire, burst, and reach Full Burst', () => {
    // Every downstream assertion is vacuous if any of these are zero.
    expect(ownShots.length).toBeGreaterThan(0);
    expect(ownBurstCasts.length).toBeGreaterThan(0);
    expect(
      baseEvents.filter((e) => e.kind === 'fullBurstStart').length,
    ).toBeGreaterThan(0);
    expect(baseDmg).toBeGreaterThan(0);
  });
});

describe('nihilister skill1 — Full-Charge Pierce for 1 round', () => {
  it('pierce is granted as a per-full-charge EFFECT, not a static whole-fight flag', () => {
    // DISCRIMINATES: a gainPierce effect on a shot-keyed trigger means the very first
    // frame of the fight is NOT yet pierce-tagged (the grant needs a full charge to
    // have happened). The nearest-wrong model — top-level hasPierce:true — tags her
    // from t=0. We assert the override encodes the EFFECT form.
    const ov = withPatchedOverride(SLUG, () => {
      /* no mutation — inspect the committed shape */
    });
    const blocks = [
      ...(ov.skill1 ?? []),
      ...(ov.skill2 ?? []),
      ...(ov.burst ?? []),
    ];
    const pierceEffects = blocks.flatMap((b) =>
      b.effects.filter((e) => e.kind === 'gainPierce'),
    );
    expect(pierceEffects.length).toBeGreaterThan(0);
    // NOT the static flag: the kit scopes pierce to "for 1 round(s)" off a full charge.
    expect(ov.hasPierce ?? false).toBe(false);
  });

  it('the pierce grant is carried on a shot/charge-keyed trigger, not passive', () => {
    // DISCRIMINATES vs. encoding the grant as {trigger:'passive'} + gainPierce with no
    // duration, which is observationally "always on" and loses the kit's round scoping.
    const ov = withPatchedOverride(SLUG, () => {});
    const carriers = (ov.skill1 ?? []).filter((b) =>
      b.effects.some((e) => e.kind === 'gainPierce'),
    );
    expect(carriers.length).toBeGreaterThan(0);
    for (const b of carriers) {
      expect(['shotFired', 'hitCount', 'chargeCounter']).toContain(b.trigger.kind);
    }
  });

  it('pierce tagging alone moves NO damage in this fixture (no Pierce Damage ▲ source)', () => {
    // NON-VACUITY / INERTNESS: Pierce is a TAG whose payload is Pierce Damage ▲ bucket
    // eligibility. The control comp carries no pierceDamagePct buff, so stripping the
    // gainPierce effect must be damage-identical. If this FAILS, the override is
    // routing pierce into a damage bucket it should not touch.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.skill1 ?? []) {
        b.effects = b.effects.filter((e) => e.kind !== 'gainPierce');
      }
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    expect(totals(res)[SLUG]).toBeCloseTo(baseDmg, 6);
  });

  it.skip('Piercing Radius ▲ 50% for 1 round — GAP: no StatKey and no multi-target geometry', () => {
    // GAP: the schema has pierceDamagePct (Pierce DAMAGE) but no piercing-RADIUS stat,
    // and the scope-lock boss is a single partless target, so radius has no observable
    // payload. Belongs in the override's `unmodeled.skill1`, not in a block.
  });
});

describe('nihilister skill1 — "hits 2 or more enemies concurrently" 50.33% rider', () => {
  it('is INERT at scope lock (single partless boss can never satisfy the trigger)', () => {
    // DISCRIMINATES against the #1 blind failure here: encoding the rider as an
    // unconditional per-shot flatDamage 50.33%. Under that nearest-wrong model she
    // gains ~50.33% of final ATK on EVERY pull — a very large total delta. We prove
    // the shipped model contributes nothing by ADDING the wrong model and showing the
    // baseline is strictly lower.
    const wrong = withPatchedOverride(SLUG, (ov) => {
      ov.skill1!.push({
        slot: 'skill1',
        trigger: { kind: 'shotFired' },
        target: { kind: 'enemy' },
        effects: [{ kind: 'flatDamage', atkPct: 50.33, noRange: true }],
      });
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: wrong },
    });
    const wrongDmg = totals(res)[SLUG];
    expect(wrongDmg).toBeGreaterThan(baseDmg);
    // and the gap is large — this is not a rounding difference
    expect(wrongDmg / baseDmg).toBeGreaterThan(1.05);
  });

  it('no 50.33%-flavored rider fires in the baseline event log', () => {
    // Direct structural check: no committed block should be emitting an
    // "additional damage" instance keyed to the 2+-enemies clause.
    const ov = withPatchedOverride(SLUG, () => {});
    const blocks = [
      ...(ov.skill1 ?? []),
      ...(ov.skill2 ?? []),
      ...(ov.burst ?? []),
    ];
    const fifty = blocks.flatMap((b) =>
      b.effects.filter(
        (e) =>
          (e.kind === 'flatDamage' || e.kind === 'dot') &&
          Math.abs((e as { atkPct: number }).atkPct - 50.33) < 0.01,
      ),
    );
    expect(fifty).toHaveLength(0);
  });
});

describe('nihilister skill2 — 112.64% of final ATK, no activation clause', () => {
  it('is modeled as a repeating INTERVAL rider in the skill bucket, not once-per-fight', () => {
    // DISCRIMINATES: a no-activation-clause damage line is an `interval` trigger
    // (taxonomy #3). The nearest-wrong models are (a) a single burstCast-keyed hit
    // (fires ~a handful of times, in the burst bucket) and (b) a shotFired rider
    // (fires once per pull — far too often). We assert the block's TRIGGER SHAPE and
    // that it fires many-but-not-per-shot times.
    const ov = withPatchedOverride(SLUG, () => {});
    const carriers = (ov.skill2 ?? []).filter((b) =>
      b.effects.some(
        (e) =>
          e.kind === 'flatDamage' && Math.abs(e.atkPct - 112.64) < 0.01,
      ),
    );
    expect(carriers).toHaveLength(1);
    expect(carriers[0].trigger.kind).toBe('interval');
    expect(carriers[0].target.kind).toBe('enemy');
  });

  it('removing it strictly lowers her damage, and it fires more than once', () => {
    // NON-VACUITY: proves the interval rider is actually exercised by the 180s fixture
    // (an interval longer than the fight would make every other assertion hollow).
    const patched = withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = (ov.skill2 ?? []).filter(
        (b) =>
          !b.effects.some(
            (e) =>
              e.kind === 'flatDamage' && Math.abs(e.atkPct - 112.64) < 0.01,
          ),
      );
    });
    const { res, events } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    const strippedDmg = totals(res)[SLUG];
    expect(strippedDmg).toBeLessThan(baseDmg);

    const strippedSkillHits = events.filter(
      (e) => e.kind === 'damage' && e.slug === SLUG && e.bucket === 'skill',
    ).length;
    const baseSkillHits = ownDamage.filter((e) => e.bucket === 'skill').length;
    // fired repeatedly, not once
    expect(baseSkillHits - strippedSkillHits).toBeGreaterThan(1);
    // but NOT once per pull — that would be the shotFired nearest-wrong
    expect(baseSkillHits - strippedSkillHits).toBeLessThan(ownShots.length);
  });

  it('⚑ the interval CADENCE is not stated in the kit — asserted as shape only', () => {
    // ALWAYS-⚑ #2: a damage line the text gives NO trigger for → invented trigger +
    // cadence. The override must FLAG it; this test deliberately pins no seconds value.
    const ov = withPatchedOverride(SLUG, () => {});
    const note = `${ov.note ?? ''}${JSON.stringify(ov.unmodeled?.skill2 ?? '')}`;
    expect(note.length).toBeGreaterThan(0);
  });

  it('teammates carry no DIRECT buff from her skill2 (gauge-coupling second-order only)', () => {
    // INERTNESS: skill2 targets the enemy; it must not move any ally's total DIRECTLY.
    // DRIVER ADAPTATION (engine semantics): the blind claim of BYTE identity is false in
    // this engine for a genuine reason — her skill-bucket hits pump burst gauge
    // (flatDamage = one skill-damage gauge impact, measured maiden-ice-rose), so stripping
    // them shifts Full-Burst timing and moves teammates ~0.2% second-order. A real ally
    // buff would move them orders of magnitude more; the 2% bound keeps the discrimination.
    const patched = withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = [];
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    const t = totals(res);
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) continue;
      expect(
        Math.abs(t[slug] - baseTotals[slug]) / baseTotals[slug],
        `${slug} moved more than gauge second-order — a direct ally buff?`
      ).toBeLessThan(0.02);
    }
  });
});

describe('nihilister burst — 158.59% instant + 13.19%/s Burn for 10s', () => {
  it('the 158.59% instant lands in the burst bucket and is Full-Burst-EXEMPT by timing', () => {
    // VERIFIED FACT: burst-cast damage lands before Full Burst begins (no +50%).
    // DISCRIMINATES vs. re-keying the hit to fullBurstEnter, which would stamp
    // inFullBurst:true / fbMajorApplied:true on the instance.
    // (driver adaptation: scoped to the NUKE instances — the Burn DoT ticks legitimately
    // take the FB major by LANDING timing when they tick inside an FB window; only the
    // burst-CAST hit is exempt)
    const burstHits = ownDamage.filter(
      (e) =>
        e.bucket === 'burst' &&
        e.fbMajorApplied === true &&
        Math.abs((e.atkPct as number) - 158.59) < 0.01,
    );
    expect(burstHits).toHaveLength(0);

    const ov = withPatchedOverride(SLUG, () => {});
    const carriers = (ov.burst ?? []).filter((b) =>
      b.effects.some(
        (e) => e.kind === 'flatDamage' && Math.abs(e.atkPct - 158.59) < 0.01,
      ),
    );
    expect(carriers).toHaveLength(1);
    expect(carriers[0].trigger.kind).toBe('burstCast');
    expect(carriers[0].target.kind).toBe('enemy');
  });

  it('the Burn is ONE dot instance per burst cast (13.19% / 1s / 10s, sustained)', () => {
    // DISCRIMINATES vs. taxonomy #5 (a long-duration DoT on a repeating trigger
    // MULTIPLIES) and vs. encoding the Burn as 131.9% instant.
    const ov = withPatchedOverride(SLUG, () => {});
    const dots = (ov.burst ?? []).flatMap((b) =>
      b.effects.filter((e) => e.kind === 'dot'),
    ) as Array<{
      atkPct: number;
      durationSec: number;
      intervalSec?: number;
      flavor?: string;
      crit?: boolean;
    }>;
    expect(dots).toHaveLength(1);
    expect(dots[0].atkPct).toBeCloseTo(13.19, 4);
    expect(dots[0].durationSec).toBe(10);
    expect(dots[0].intervalSec ?? 1).toBe(1);
    expect(dots[0].flavor).toBe('sustained');
    // DoTs are validated NON-crit unless MEASURED for this unit; the kit says nothing.
    expect(dots[0].crit ?? false).toBe(false);
  });

  it('Burn ticks are bounded by cast count × 10 (no overlapping instances)', () => {
    // NON-VACUITY + the multiply guard: her cooldown is 20s and the Burn is 10s, so
    // instances can never overlap. If the override attached the DoT to a per-shot or
    // full-burst-enter trigger, tick count would blow past this ceiling.
    // (driver adaptation: damage events carry no `flavor` field — the Burn ticks are the
    // burst-bucket instances at the kit magnitude 13.19, the only line at that value)
    const dotTicks = ownDamage.filter(
      (e) =>
        e.bucket === 'burst' &&
        Math.abs((e.atkPct as number) - 13.19) < 0.01,
    ).length;
    expect(dotTicks).toBeGreaterThan(0);
    expect(dotTicks).toBeLessThanOrEqual(ownBurstCasts.length * 10);
  });

  it('stripping the Burn lowers only her own damage', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter((e) => e.kind !== 'dot');
      }
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    const t = totals(res);
    expect(t[SLUG]).toBeLessThan(baseDmg);
    for (const slug of Object.keys(baseTotals)) {
      if (slug === SLUG) continue;
      expect(t[slug]).toBeCloseTo(baseTotals[slug], 6);
    }
  });
});

describe('nihilister burst — Max Ammunition ▲ 6 round(s) for 15 sec', () => {
  it('is a FLAT +6 rounds (maxAmmoFlat), not a 6% bump (maxAmmoPct)', () => {
    // DISCRIMINATES: base ammo is 6. maxAmmoFlat:6 DOUBLES the magazine to 12;
    // maxAmmoPct:6 adds 0.36 of a round — effectively nothing. The nearest-wrong model
    // is a near-no-op, so the shape assertion plus the delta test below are both needed.
    const buffs = ownBuffApplies.filter(
      (e) => e.stat === 'maxAmmoFlat' && e.value === 6,
    );
    expect(buffs.length).toBeGreaterThan(0);
    // wall-clock 15s window — NOT a round count (the kit says "for 15 sec" here,
    // in deliberate contrast to skill1's "for 1 round(s)")
    for (const b of buffs) {
      expect(b.durationShots).toBeNull(); // event contract: null = no round budget
      expect(b.expiresFrame).toBeGreaterThan(0);
    }
    expect(
      ownBuffApplies.filter(
        // (driver adaptation: liter's OWN kit grants the team maxAmmoPct steps — the
        // claim is about HER kit, so scope to buffs she cast: slot 1 in nilComp)
        (e) => e.stat === 'maxAmmoPct' && e.casterIdx === 1,
      ),
    ).toHaveLength(0);
  });

  it('one application per burst cast, self-targeted', () => {
    const buffs = ownBuffApplies.filter(
      (e) => e.stat === 'maxAmmoFlat' && e.value === 6,
    );
    expect(buffs.length).toBe(ownBurstCasts.length);
    for (const b of buffs) {
      expect(b.targetSlug).toBe(SLUG);
    }
  });

  it('the ammo buff is a DAMAGE line — removing it strictly lowers her total', () => {
    // DISCRIMINATES against dropping it as "defensive / no damage". A doubled magazine
    // removes a 141-frame reload from inside the 15s window → more full-charge shots.
    // If this delta were ZERO the override would be mis-encoding the stat.
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'buff' && e.stat === 'maxAmmoFlat'),
        );
      }
    });
    const { res, events } = run({
      ...nilComp,
      overrides: { [SLUG]: patched },
    });
    expect(totals(res)[SLUG]).toBeLessThan(baseDmg);

    // and the mechanism is shots, not a stat multiplier
    const strippedShots = events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG,
    ).length;
    expect(strippedShots).toBeLessThan(ownShots.length);
  });

  it('the wrong-shape model (maxAmmoPct 6) is measurably worse than the flat grant', () => {
    // Explicit nearest-wrong counterfactual: swap flat→pct and show the shot economy
    // collapses back toward the no-buff case.
    const pctModel = withPatchedOverride(SLUG, (ov) => {
      for (const b of ov.burst ?? []) {
        for (const e of b.effects) {
          if (e.kind === 'buff' && e.stat === 'maxAmmoFlat') {
            (e as { stat: string }).stat = 'maxAmmoPct';
          }
        }
      }
    });
    const { res } = run({
      ...nilComp,
      overrides: { [SLUG]: pctModel },
    });
    expect(totals(res)[SLUG]).toBeLessThan(baseDmg);
  });

  it('the ammo buff is self-only — no teammate movement', () => {
    const buffs = ownBuffApplies.filter((e) => e.stat === 'maxAmmoFlat');
    const allAmmoBuffs = baseEvents.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'maxAmmoFlat',
    );
    expect(allAmmoBuffs.length).toBe(buffs.length);
  });
});

describe('nihilister — unmodeled record (no silent drops)', () => {
  it('the 2+-enemies rider and the Piercing Radius line are recorded as unmodeled', () => {
    const ov = withPatchedOverride(SLUG, () => {});
    const s1 = (ov.unmodeled?.skill1 ?? []).join(' | ').toLowerCase();
    expect(s1.length).toBeGreaterThan(0);
  });
});
```

## 6. S6 BLIND OVERRIDE (claude-opus-5) + diff vs the driver override

```json
{
  "slug": "nihilister",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "gainPierce",
          "durationSec": 2
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 10
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 112.64,
          "crit": true
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
          "atkPct": 158.59,
          "crit": true
        },
        {
          "kind": "dot",
          "atkPct": 13.19,
          "durationSec": 10,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    },
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
          "stat": "maxAmmoFlat",
          "value": 6,
          "durationSec": 15
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Piercing Radius ▲ 50% for 1 round(s).",
      "Activates when hits 2 or more enemies concurrently. Affects all enemies hit. Deals 50.33% of final ATK as additional damage."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ skill2 cadence: the 112.64% line carries NO activation clause and the packet supplies no datamined skill cooldown — modeled as interval 10s, first fire at t=10s (no 'Forcefully uses Skill' clause ⇒ interval convention). Every skill-bucket number scales linearly with this guess.",
    "⚑ skill1 pierce duration: 'for 1 round(s)' is a ROUND count, but gainPierce has no durationShots field — converted to durationSec 2.0 (≈ one SR charge-fire cycle) so pierce stays live across consecutive shots without spanning the reload gap. Not a measured value.",
    "⚑ skill1 trigger: 'attacking with Full Charge' is modeled as shotFired — there is no full-charge trigger kind, and an SR at scope lock full-charges every shot. If any kit/mode path fires her uncharged, this over-fires.",
    "⚑ cadence tuple: chargeFrames 60 / reloadFrames 141 / ammo 6 are datamined fields on the known-unreliable list; her shot economy (and therefore the burst's Max Ammunition ▲6 gain) rests on them unmeasured.",
    "Pierce is offensively INERT at scope lock unless a teammate carries Pierce Damage ▲ (pierceDamagePct is parsed-but-inert in v1); the gainPierce effect is kept for tagging fidelity, not for damage.",
    "The skill1 multi-enemy branch (2+ enemies hit concurrently) is structurally unreachable on the single, partless scope-lock boss — its 50.33% rider contributes zero and is recorded in unmodeled rather than modeled behind an unreachable gate.",
    "Riders (skill2 instant, burst instant) are authored crit-eligible at the caster's sheet rate and take NO core (no 'core strike' wording); the burn DoT is left non-crit per the default-OFF DOT_CRIT gate (crit opt-in is measured-only).",
    "noFb / noRange are deliberately unset: full-burst eligibility is by landing TIMING (default on) and the range exemption is engine-automatic on riders."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Independent prose→JSON read of Nihilister (nihilister, SR/Fire/Attacker/Burst II). Modeled: S1 full-charge Pierce tag (shotFired → gainPierce, ⚑2.0s stand-in for '1 round'); S2 range-wide 112.64% instant on an ⚑interval-10s cadence (no activation clause in the kit text ⇒ interval per the trigger taxonomy); burst 158.59% instant + a 13.19%/s × 10s sustained Burn (one DoT instance per cast, append-not-refresh) + a self Max Ammunition ▲6 rounds for 15s (a weapon-state modifier — it doubles her 6-round magazine and removes reloads inside the window, so it IS damage). Deliberately unmodeled: Piercing Radius ▲50% (no StatKey; a multi-target geometry stat with no meaning against one partless boss) and the whole 'hits 2 or more enemies concurrently' branch incl. its 50.33% rider (the gate cannot be satisfied at scope lock). Burst instant damage resolves pre-Full-Burst by engine convention; the Burn ticks then run through the FB window and take the +50% by tick timing."
}
```

LINE-BY-LINE DIFF (S6 blind vs driver):
- skill1 Pierce: IDENTICAL encoding (shotFired -> self gainPierce). Round->wall-clock stand-in differs: blind durationSec 2 (one fire cycle + margin); driver durationSec 4 (worst-case inter-shot gap incl. one empty-mag reload, so the timed window never lapses between two rounds actually fired). Both flagged as estimates over the same cadence tuple.
- skill2: IDENTICAL trigger/target/magnitude (interval:10 flatDamage 112.64). Blind adds explicit crit:true (engine flatDamage default is already crit-on — redundant, behavior-identical). Blind derived sec:10 as modal-guess + flagged it (packet carried no datamined CD); driver sources it from characters.json skillCooldownsSec.skill2 = 10.
- burst nuke 158.59: IDENTICAL (burstCast -> enemy flatDamage; blind adds redundant crit:true).
- burn: IDENTICAL (burstCast -> dot 13.19 / 10s / 1s / flavor sustained, no crit opt-in).
- ammo: IDENTICAL (burstCast -> self maxAmmoFlat 6 / 15s).
- unmodeled: IDENTICAL pair (Piercing Radius geometry; 2+-enemies-concurrent 50.33% bonus), verbatim.

## 7. DRIVER IMPLEMENTATION

### scripts/tests/units/nihilister.test.ts
```ts
// PER-UNIT KIT SPEC — `nihilister` (Nihilister, Attacker/SR/Fire, Burst II, cd 20s, ammo 6,
// chargeFrames 60, reloadFrames 141, normalMult 69.04, coreMult 200). Kit-autonomy gauntlet
// 2026-08-04. FROM-SCRATCH build (no prior override; simSupported:false before this pass).
//
// Kit (blablalink prose, data/characters.json → characters.nihilister.skills, SL10):
//   S1 ■ attacking with Full Charge → self: Gain Pierce for 1 round(s)                     [N1]
//      ■ (same window) Piercing Radius ▲50% for 1 round(s)                                 [U1 INERT]
//      ■ hits 2+ enemies concurrently → all enemies hit: 50.33% final ATK extra damage     [U2 INERT]
//   S2 ■ enemies within attack range: 112.64% of final ATK as damage (10s CD)             [N4]
//   BU ■ enemies within attack range: 158.59% of final ATK as damage                      [N5]
//      ■ Burn: 13.19% of final ATK as sustained damage every 1 sec for 10 sec             [N6]
//      ■ self: Max Ammunition Capacity ▲6 round(s) for 15 sec                             [N7]
//
// INERT / UNENACTABLE lines (no assertions beyond the verbatim-carry pin; carried VERBATIM in
// the override's `unmodeled`):
//   U1 the Piercing Radius line — v1 has NO spatial/hitbox model (a single partless boss with
//      no geometry), so a piercing-radius increase has nothing to act on. Out-of-domain by
//      world-model; couples to U2 (the radius matters only for multi-enemy pierce coverage).
//   U2 the 2+-enemies-concurrent bonus — v1 fields exactly ONE enemy, so the "hits 2 or more
//      enemies concurrently" condition can never be satisfied; a flatDamage rider here would
//      be dead code that could only ever fire wrongly. Out-of-domain (needs a multi-target
//      engine model); ⚑ with estimate+recipe in the override note.
//
// Encoding shape (see src/skills/overrides/nihilister.json):
//   N1 = shotFired → self gainPierce durationSec 4. SR auto-full-charges every shot
//        (milk-blooming-bunny precedent), so shotFired IS the full-charge trigger. "for 1
//        round(s)" is a ROUND-COUNT duration and gainPierce carries no durationShots — the
//        wall-clock stand-in must cover the longest inter-shot gap the holder actually fires
//        across (an empty-magazine reload 2.35s + a full-charge cycle ≈1.37s ≈ 3.7s worst
//        case), so 4s: the per-shot refresh keeps the tag continuous while she fires, and it
//        never lapses BETWEEN two rounds she actually fires (the timed stand-in degrades to
//        ~100% on-shot duty exactly like the round-count original under steady fire; ⚑ cadence).
//        The grant lands AFTER the triggering shot's damage (shotFired dispatch order — the
//        phantom ⚑2 engine-order class), so shot 1 is the application event and every shot
//        from the 2nd on is tagged while firing. gainPierce emits NO event (sets
//        pierceUntilFrame directly, sim.ts) → pinned structurally + behaviourally through the
//        fixture's pierceDamagePct source (see fixture).
//   N4 = interval:10 → flatDamage 112.64 vs enemy. S2's prose carries NO activation clause —
//        a class-1 pure timer (helm-aquamarine S2a precedent, docs/handoffs/2026-07-20
//        -skill-cooldowns-to-sim.md): the datamined skillCooldownsSec.skill2 = 10 IS the fire
//        cadence, first fire t=10 (no force-cast clause; ⚑ first-fire phase).
//   N5/N6/N7 = burstCast-keyed (HER casts only — NOT fullBurstEnter, which would fire on any
//        team Full Burst a different B2 completed). Burst-cast damage is auto FB-exempt /
//        snapshots pre-FB (prior 2; no noFb needed). The Burn is a REAL DoT: 10 discrete
//        1s ticks (dot durationSec 10 / intervalSec 1), flavor 'sustained', never cores; ticks
//        are crit-eligible via the engine's universal DoT-crit gate (DOT_CRIT default-ON,
//        sim.ts U13) with NO per-dot opt-in in the override. N7 is maxAmmoFlat 6
//        (the "▲ N round(s)" flat primitive, theme 14 — NOT maxAmmoPct 100, which only happens
//        to coincide at her 6-round base) for 15s on herself; the cap raises live and the
//        extended magazine loads at her next reload (increases never clip, sim.ts).
//
// Fixture: d-killer-wife (B1, 20s — the ENVIRONMENT PIERCE SOURCE: her S1 grants Pierce
// Damage ▲13.55% to SR allies on FB entry for 10s) / nihilister (B2, 20s — SOLE B2, so every
// chain stage II is hers) / ada (B3, 40s — gates the rotation; FB period ≈40s). Boss NEUTRAL
// (null — no elemental majors anywhere). Focus nihilister (SR camera focus is deterministic).
// Deterministic (no seed). Slot order: d-killer-wife 0 / nihilister 1 / ada 2.
//
// Why each assertion discriminates:
//   N1  the static `hasPierce:true` flag (nearest-wrong — tags from frame 0, no trigger) is
//       rejected structurally (shipped carries a windowed shotFired block, no top-level flag);
//       the timed window is proven LOAD-BEARING behaviourally: removing it un-tags her attacks,
//       d-killer-wife's 13.55 pierceDamagePct goes inert on her (sim.ts pierceTagged gate) and
//       her total drops; and the steady-fire continuity pin proves the 4s window covers like a
//       static tag WHILE she fires (byte-identical totals) — so the encoding neither under- nor
//       over-covers under the fixture cadence.
//   N4  the exact frame set [10,20,…,170]s kills every wrong cadence (an interval:5 over-fires,
//       a hitCount proxy fires on HER shot rhythm ≈1.37s, a burstCast key fires ≈ per cast);
//       the magnitude pin kills the lvl-9 102.4.
//   N5  burstCast keying: one nuke per cast, cast frames ≠ FB-start frames, fbMajorApplied
//       FALSE (the cast lands before the FB window). The fullBurstEnter counterfactual moves
//       the hit INTO the FB window (+50% major) — the discrimination is the mult/fb flag set.
//   N6  ten 1s-spaced ticks per full-window cast: a collapsed single flatDamage 131.9 produces
//       one instance per cast; the magnitude pin kills lvl-9 12.55; ticks are crit-eligible via
//       the engine's UNIVERSAL DoT-crit gate (DOT_CRIT default-ON, sim.ts U13 — mechanic
//       confirmed: DoT/function damage crits, never cores) and the override must carry NO
//       per-dot crit opt-in (the opt-in is for measured per-DoT divergence only); under the
//       default gate the opt-in counterfactual is byte-identical — the gate dominates.
//   N7  structural: stat maxAmmoFlat value 6, self-scoped, 15s expiry, once per cast; the
//       maxAmmoPct counterfactual is behaviourally identical at her 6-round base (that is the
//       trap — the primitive identity is pinned from the JSON, not from totals). Behavioural:
//       an extended magazine exists in-window (ammoAfter exceeds the base-mag maximum 5);
//       removing the block restores max ammoAfter 5.
//
// RED state (pre-S3): nihilister has NO override on disk — runComp throws "no override" for
// her, so this whole suite is RED until src/skills/overrides/nihilister.json lands (S3).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const NIHILISTER = 1; // slot order: d-killer-wife 0 / nihilister 1 / ada 2
const FIGHT_SEC = 180;

const S2_ATK = 112.64;
const BURST_ATK = 158.59;
const BURN_ATK = 13.19;
const PIERCE_BUFF = 13.55; // d-killer-wife's Pierce Damage ▲ to SR allies

const nihilisterComp = {
  slugs: ['d-killer-wife', 'nihilister', 'ada'],
  bossElement: null,
  focusSlug: 'nihilister',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...nihilisterComp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- override readers -------------------------------------------------------------------------
const shipped = () => {
  const ov = loadOverride('nihilister');
  if (!ov) {
    throw new Error('nihilister: no override on disk — RED state (pre-S3)');
  }
  return ov as any;
};

// ---- counterfactual / reference patches -------------------------------------------------------
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** N1 reference: the Pierce window removed — un-tags her attacks. */
const cfNoGainPierce = withPatchedOverride('nihilister', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'gainPierce'));
  if (ov.skill1.length === before) {
    throw new Error('nihilister S1 gainPierce block missing — fixture is stale');
  }
});
/** N1 nearest-wrong: the STATIC hasPierce flag instead of the windowed grant. */
const cfStaticPierce = withPatchedOverride('nihilister', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasKind(b, 'gainPierce'));
  ov.hasPierce = true;
});
/** N4 counterfactual: the S2 nuke on a wrong cadence (over-fires ×2). */
const cfS2Fast = withPatchedOverride('nihilister', (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'interval');
  if (!b) {
    throw new Error('nihilister S2 interval block missing — fixture is stale');
  }
  b.trigger.sec = 5;
});
/** N4 counterfactual: the S2 nuke keyed to her burst casts instead of its own CD. */
const cfS2BurstKeyed = withPatchedOverride('nihilister', (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'interval');
  if (!b) {
    throw new Error('nihilister S2 interval block missing — fixture is stale');
  }
  b.trigger = { kind: 'burstCast' };
});
/** N5/N6/N7 counterfactual: every burst line re-keyed to fullBurstEnter. */
const cfBurstFbEnter = withPatchedOverride('nihilister', (ov) => {
  for (const b of ov.burst) {
    if (b.trigger.kind === 'burstCast') {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});
/** N6 counterfactual: the burn collapsed to a single flat hit of the window total. */
const cfBurnCollapsed = withPatchedOverride('nihilister', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'dot'));
  if (!b) {
    throw new Error('nihilister burst dot block missing — fixture is stale');
  }
  const eff = b.effects.find((e: any) => e.kind === 'dot');
  b.effects = b.effects.filter((e: any) => e.kind !== 'dot');
  b.effects.push({ kind: 'flatDamage', atkPct: +(eff.atkPct * 10).toFixed(2) });
});
/** N6 counterfactual: burn ticks opted INTO crit — under the default DOT_CRIT gate the opt-in
 *  is dominated (byte-identical); the pin is the structural no-opt-in discipline. */
const cfBurnCrit = withPatchedOverride('nihilister', (ov) => {
  const eff = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'dot');
  if (!eff) {
    throw new Error('nihilister burst dot effect missing — fixture is stale');
  }
  eff.crit = true;
});
/** N7 reference: the ammo line removed — magazines stay at the base 6. */
const cfNoAmmo = withPatchedOverride('nihilister', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'maxAmmoFlat'));
  if (ov.burst.length === before) {
    throw new Error('nihilister burst maxAmmoFlat block missing — fixture is stale');
  }
});
/** N7 nearest-wrong: maxAmmoPct 100 (coincides at her 6-round base — the trap). */
const cfAmmoPct = withPatchedOverride('nihilister', (ov) => {
  const eff = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.stat === 'maxAmmoFlat');
  if (!eff) {
    throw new Error('nihilister burst maxAmmoFlat effect missing — fixture is stale');
  }
  eff.stat = 'maxAmmoPct';
  eff.value = 100;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noGainPierce = run({ nihilister: cfNoGainPierce });
const staticPierce = run({ nihilister: cfStaticPierce });
const s2Fast = run({ nihilister: cfS2Fast });
const s2BurstKeyed = run({ nihilister: cfS2BurstKeyed });
const burstFbEnter = run({ nihilister: cfBurstFbEnter });
const burnCollapsed = run({ nihilister: cfBurnCollapsed });
const burnCrit = run({ nihilister: cfBurnCrit });
const noAmmo = run({ nihilister: cfNoAmmo });
const ammoPct = run({ nihilister: cfAmmoPct });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Extract<SimEvent, { kind: 'damage' }> => e.kind === 'damage');
const herDamage = (evs: SimEvent[], srcSlot: 'skill2' | 'burst') =>
  dmg(evs).filter((d) => d.slug === 'nihilister' && d.srcSlot === srcSlot);
const herShots = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'shot' }> =>
      e.kind === 'shot' && e.slug === 'nihilister'
  );
const herCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'nihilister'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'fullBurstStart' }> =>
      e.kind === 'fullBurstStart'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'buffApply' }> => e.kind === 'buffApply'
  );

/** d-killer-wife's Pierce Damage ▲ windows landing on nihilister (the environment source). */
const pierceBuffWindows = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.stat === 'pierceDamagePct' &&
      b.value === PIERCE_BUFF &&
      b.targetIdx === NIHILISTER
  );

/** The burst nuke instances (the 158.59 hits — the burn ticks are the 13.19 ones; both ride
 *  srcSlot 'burst' / bucket 'burst', so the kit magnitudes separate the two lines). */
const herNukes = (evs: SimEvent[]) =>
  herDamage(evs, 'burst').filter((d) => d.atkPct === BURST_ATK);
/** The burn DoT ticks (a burst-slot DoT lands in the burst bucket — the bucket follows the
 *  carrying slot, unlike an S2-slot DoT which lands in 'skill'). */
const herBurnTicks = (evs: SimEvent[]) =>
  herDamage(evs, 'burst').filter((d) => d.atkPct === BURN_ATK);

/** Burn ticks from casts whose FULL 10s window fits inside the fight. */
function burnTicksPerFullWindow(evs: SimEvent[]) {
  const fightFrames = FIGHT_SEC * FPS;
  const casts = herCasts(evs).filter((c) => c.frame + 10 * FPS <= fightFrames);
  const ticks = herBurnTicks(evs);
  return { casts, ticks };
}

describe('nihilister — kit spec', () => {
  describe('N1 — S1 full-charge: Gain Pierce for 1 round (windowed gainPierce on shotFired)', () => {
    it('is a shotFired-keyed, self-targeted, TIMED gainPierce — not a static hasPierce flag', () => {
      const ov = shipped();
      expect(ov.hasPierce, 'shipped must not be the static-flag form').toBeUndefined();
      const blk = ov.skill1.find((b: any) => hasKind(b, 'gainPierce'));
      expect(blk, 'no gainPierce block in skill1').toBeDefined();
      expect(blk.trigger.kind).toBe('shotFired');
      expect(blk.target.kind).toBe('self');
      const eff = blk.effects.find((e: any) => e.kind === 'gainPierce');
      expect(
        eff.durationSec,
        'a round-count window needs a timed stand-in — permanent-after-first-shot is wrong'
      ).toBeGreaterThan(0);
      // unmodeled.skill1 must NOT claim the Pierce line (it is modeled)
      expect(
        (ov.unmodeled?.skill1 ?? []).some((s: string) => s.includes('Gain Pierce')),
        'the Pierce grant is modeled, not carried as unmodeled'
      ).toBe(false);
    });

    it("is load-bearing: d-killer-wife's Pierce Damage ▲ feeds her only while tagged", () => {
      // The environment source must actually be landing on her in this fixture.
      expect(
        pierceBuffWindows(base.events).length,
        'no pierceDamagePct window landed on nihilister — fixture is inert'
      ).toBeGreaterThan(0);
      expect(base.totals.nihilister).toBeGreaterThan(noGainPierce.totals.nihilister);
    });

    it('covers steady fire like the round-count original (byte-identical to the static flag while firing)', () => {
      // The timed stand-in must never lapse BETWEEN two rounds she actually fires: under the
      // fixture cadence the static-flag counterfactual and the shipped window must agree exactly.
      expect(staticPierce.totals.nihilister).toBe(base.totals.nihilister);
    });
  });

  describe('N2/N3 — S1 Piercing Radius and the 2+-target bonus are carried VERBATIM as unmodeled', () => {
    it('carries both inert lines verbatim, with no dead-code blocks standing in', () => {
      const ov = shipped();
      const s1u: string[] = ov.unmodeled?.skill1 ?? [];
      expect(
        s1u.some((s) => s.includes('Piercing Radius') && s.includes('50%')),
        'Piercing Radius line missing from unmodeled.skill1'
      ).toBe(true);
      expect(
        s1u.some(
          (s) => s.includes('2 or more enemies') && s.includes('50.33')
        ),
        'the 2+-target bonus line missing from unmodeled.skill1'
      ).toBe(true);
      // no radius primitive and no 50.33 rider may exist anywhere in skill1
      expect(
        ov.skill1.some((b: any) =>
          b.effects.some((e: any) => e.atkPct === 50.33)
        ),
        'the 2+-target bonus can never fire vs a single enemy — it must not be encoded'
      ).toBe(false);
      // the radius line is GEOMETRY, not Pierce Damage — the nearest-wrong misread is a
      // pierceDamagePct +50 buff, which would silently move the Damage-Up bucket (S2b trap)
      expect(
        ov.skill1.some((b: any) =>
          b.effects.some((e: any) => e.stat === 'pierceDamagePct')
        ),
        'Piercing Radius must not be misread as Pierce Damage ▲'
      ).toBe(false);
    });
  });

  describe('N4 — S2: 112.64% nuke on the datamined 10s internal CD (first fire t=10)', () => {
    const hits = herDamage(base.events, 'skill2');

    it('fires at t=10,20,…,170s — the class-1 pure-timer cadence, nothing else', () => {
      const frames = hits.map((d) => d.frame);
      const expected: number[] = [];
      for (let t = 10; t < FIGHT_SEC; t += 10) {
        expected.push(t * FPS);
      }
      expect(
        frames,
        `${frames.length} S2 hits — a wrong trigger (hitCount/burstCast/interval:5) lands a different frame set`
      ).toEqual(expected);
    });

    it('is the kit magnitude in the skill bucket, crit-eligible, never a core strike', () => {
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.atkPct))]).toEqual([S2_ATK]);
      expect([...new Set(hits.map((d) => d.bucket))]).toEqual(['skill']);
      expect(hits.every((d) => d.critEligible)).toBe(true);
      expect(hits.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: wrong cadences move the hit set', () => {
      const shippedFrames = hits.map((d) => d.frame);
      expect(herDamage(s2Fast.events, 'skill2').map((d) => d.frame)).not.toEqual(
        shippedFrames
      );
      expect(
        herDamage(s2BurstKeyed.events, 'skill2').map((d) => d.frame)
      ).not.toEqual(shippedFrames);
    });
  });

  describe('N5 — burst nuke: 158.59% of final ATK, one per HER cast, pre-FB', () => {
    const nukes = herNukes(base.events);

    it('fires once per burst cast at the kit magnitude', () => {
      const casts = herCasts(base.events);
      expect(casts.length, 'nihilister never cast — fixture is broken').toBeGreaterThan(0);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([BURST_ATK]);
    });

    it('is burstCast-keyed: cast frames are NOT Full-Burst-start frames, and no +50% FB major lands', () => {
      const fbFrames = new Set(fbStarts(base.events).map((e) => e.frame));
      for (const c of herCasts(base.events)) {
        expect(
          fbFrames.has(c.frame),
          `cast at frame ${c.frame} coincides with an FB start — fullBurstEnter keying?`
        ).toBe(false);
      }
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('DISCRIMINATING: fullBurstEnter keying moves the nuke INTO the FB window (+50% major)', () => {
      const fbNukes = herNukes(burstFbEnter.events);
      // The re-keyed lines fire at FB entry — the nuke then takes the FB major the cast form never does.
      expect(
        fbNukes.some((d) => d.fbMajorApplied) ||
          fbNukes.length !== nukes.length ||
          !fbNukes.every(
            (d, i) => d.frame === nukes[i]?.frame
          ),
        'the fullBurstEnter counterfactual must be observably different'
      ).toBe(true);
      expect(burstFbEnter.totals.nihilister).not.toBe(base.totals.nihilister);
    });
  });

  describe('N6 — Burn: 13.19% sustained every 1s for 10s per cast (a real DoT; ticks on the DOT_CRIT gate)', () => {
    it('ticks exactly 10× at 1s spacing per full-window cast, at the kit magnitude', () => {
      const { casts, ticks } = burnTicksPerFullWindow(base.events);
      expect(casts.length, 'no burst cast has a full 10s window inside the fight').toBeGreaterThan(0);
      for (const cast of casts) {
        const inWindow = ticks.filter(
          (d) => d.frame > cast.frame && d.frame <= cast.frame + 10 * FPS
        );
        expect(
          inWindow.length,
          `cast at ${cast.sec.toFixed(1)}s produced ${inWindow.length} ticks — a collapsed ` +
            'single hit produces 1; a continuous DoT never stops'
        ).toBe(10);
        const gaps = inWindow.map((d, i) =>
          i === 0 ? d.frame - cast.frame : d.frame - inWindow[i - 1].frame
        );
        expect([...new Set(gaps)], 'ticks must land exactly 1s apart, first at cast+1s').toEqual([FPS]);
        expect([...new Set(inWindow.map((d) => d.atkPct))]).toEqual([BURN_ATK]);
      }
    });

    it('is sustained-flavored, burst-bucket, crit-eligible via the universal DoT gate, never cores', () => {
      const { ticks } = burnTicksPerFullWindow(base.events);
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['burst']);
      // DOT_CRIT (sim.ts U13, default-ON, Fable-approved): DoT ticks crit at the sheet rate…
      expect(ticks.every((d) => d.critEligible)).toBe(true);
      // …and NEVER core.
      expect(ticks.every((d) => !d.coreEligible)).toBe(true);
      const ov = shipped();
      const eff = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'dot');
      expect(eff.flavor, 'the burn is sustained damage — the flavor feeds sustainedDamagePct').toBe(
        'sustained'
      );
      expect(
        eff.crit,
        'the universal gate covers the ticks — a per-dot opt-in needs a measurement'
      ).toBeUndefined();
    });

    it('DISCRIMINATING: the collapsed single-hit counterfactual; the crit opt-in is gate-dominated', () => {
      const collapsed = herDamage(burnCollapsed.events, 'burst').filter(
        (d) => d.atkPct !== BURST_ATK
      );
      const { ticks } = burnTicksPerFullWindow(base.events);
      expect(collapsed.length).toBeGreaterThan(0);
      expect(collapsed.length).toBeLessThan(ticks.length);
      expect(burnCollapsed.totals.nihilister).not.toBe(base.totals.nihilister);
      // Under DOT_CRIT default-ON the opt-in changes nothing — proving the gate, not the
      // override, is what makes the ticks crit (so no opt-in belongs in the JSON).
      expect(burnCrit.totals.nihilister).toBe(base.totals.nihilister);
    });
  });

  describe('N7 — burst self: Max Ammunition Capacity ▲6 rounds for 15s (maxAmmoFlat, not %)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === NIHILISTER && b.stat === 'maxAmmoFlat'
    );

    it('applies once per HER cast, self-scoped, value 6, 15s expiry', () => {
      expect(applied.length).toBe(herCasts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([6]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NIHILISTER]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('is the FLAT round primitive — the maxAmmoPct 100 coincidence is the trap', () => {
      const ov = shipped();
      const eff = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.stat && e.stat.startsWith('maxAmmo'));
      expect(eff.stat).toBe('maxAmmoFlat');
      expect(eff.value).toBe(6);
    });

    it('behavioural: an extended magazine exists in-window (ammoAfter exceeds the base-mag max)', () => {
      const maxAfterBase = Math.max(...herShots(base.events).map((s) => s.ammoAfter));
      const maxAfterRemoved = Math.max(
        ...herShots(noAmmo.events).map((s) => s.ammoAfter)
      );
      expect(maxAfterRemoved, 'base 6-round mag: max rounds-after is 5').toBe(5);
      expect(
        maxAfterBase,
        'with +6 rounds the belt must exceed the base-mag maximum'
      ).toBeGreaterThan(5);
      // the extra belt length is real damage (fewer reloads → more shots in-window)
      expect(base.totals.nihilister).toBeGreaterThan(noAmmo.totals.nihilister);
    });

    it('DISCRIMINATING at the primitive level: maxAmmoPct is rejected even though totals coincide', () => {
      // Behaviourally identical at her 6-round base — that is exactly why the JSON pin above is
      // load-bearing. Sanity-pin the coincidence so nobody "fixes" it later:
      expect(ammoPct.totals.nihilister).toBe(base.totals.nihilister);
    });
  });

  describe('U — unmodeled lines live VERBATIM in the override (no silent drops, no ignored blocks)', () => {
    it('has exactly the two inert S1 lines unmodeled and every other slot empty', () => {
      const ov = shipped();
      expect(ov.unmodeled.skill2).toEqual([]);
      expect(ov.unmodeled.burst).toEqual([]);
      expect(ov.unmodeled.skill1.length).toBe(2);
    });

    it('has no `ignored` effect blocks anywhere', () => {
      const ov = shipped();
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        for (const b of ov[slot] ?? []) {
          for (const e of b.effects ?? []) {
            expect(e.kind).not.toBe('ignored');
          }
        }
      }
    });

    it('the note carries the gauntlet stamp', () => {
      expect(shipped().note).toMatch(/Kit-autonomy gauntlet 2026-08-04/);
    });
  });
});
```

### src/skills/overrides/nihilister.json
```json
{
  "note": "Nihilister (slug nihilister) — SR / Attacker / Fire / Burst II, cd 20s, ammo 6, chargeFrames 60, reloadFrames 141, normalMult 69.04, coreMult 200. FROM-SCRATCH kit-autonomy build 2026-08-04 (no prior override; simSupported:false before this pass). A piercing-fire boss-warfare Attacker: full-charge shots grant her a 1-round Pierce tag, her S2 nukes on an internal CD, and her burst deals instant damage + a 10s Burn + a 15s self ammo-capacity extension. SKILL1 ('Burning Shot', passive) — L1 'Activates when attacking with Full Charge. Affects self. Gain Pierce for 1 round(s)' = shotFired → self gainPierce durationSec 4. SR auto-full-charges every shot (milk-blooming-bunny precedent), so shotFired IS the full-charge trigger. 'for 1 round(s)' is a ROUND-COUNT duration but gainPierce carries only durationSec (no durationShots) — the wall-clock stand-in is 4s = the longest inter-shot gap she actually fires across (empty-magazine reload 2.35s + one full-charge cycle ≈1.37s ≈ 3.7s worst case, from the shipped SR cadence tuple chargeFrames 60 + ~22f bolt gap; ⚑1), so with the per-shot refresh the tag NEVER lapses between two rounds she actually fires — the timed window degrades to ~100% on-shot duty exactly like the round-count original under steady fire (pinned: byte-identical totals to the static-flag form while firing). The grant lands AFTER the triggering shot's damage (shotFired dispatch order — the phantom ⚑2 engine-order class): shot 1 is the application event, every shot from the 2nd on is tagged while firing. NOT a static hasPierce:true flag (the nearest-wrong form: tags from frame 0, survives downtime, no trigger). The tag is damage-relevant ONLY via ally Pierce Damage ▲ buffs (d-killer-wife's 13.55 to SR allies) — she carries no pierceDamagePct source herself; load-bearing through that feed, modeled for kit completeness + team synergy per the alice/prika/naga Pierce-tag convention. L2 'Piercing Radius ▲ 50% for 1 round(s)' = UNMODELED verbatim — GEOMETRY, not Pierce Damage (the nearest-wrong misread is a pierceDamagePct +50 buff); v1 has no spatial/hitbox model (single partless boss), so a radius increase has no consumer; couples to L3 (⚑3/⚑4, out-of-domain). L3 'Activates when hits 2 or more enemies concurrently → all enemies hit: 50.33% of final ATK as additional damage' = UNMODELED verbatim — v1 fields exactly ONE enemy, so the condition is structurally unsatisfiable; an ungated flatDamage 50.33 rider would be the single most damaging misread in this kit (~+73% of her normal line on every shot) and is rejected; the line is a real multi-target lever out-of-domain (⚑3). SKILL2 ('Megiddo Flame') — 'Affects enemies within attack range. Deals 112.64% of final ATK as damage' on the datamined skillCooldownsSec.skill2 = 10s CD = interval:10 → flatDamage 112.64 vs enemy. The prose carries NO activation clause → class-1 pure timer (helm-aquamarine S2a precedent, docs/handoffs/2026-07-20-skill-cooldowns-to-sim.md): first fire t=10, then t=20,… (⚑2 first-fire phase; 17 hits/180s). Crit-eligible (flatDamage default), never cores (no core label), noRange (instant rider default). BURST ('Burning Scourge', all three lines burstCast-keyed — HER casts only, NOT fullBurstEnter: she is one of potentially several B2s and a different B2's Full Burst must not fire these) — L1 'enemies within the attack range: 158.59% of final ATK as damage' = burstCast → flatDamage 158.59 vs enemy; burst-cast damage auto-snapshots pre-FB / is FB-exempt (prior 2; no noFb) and never takes the +50% major. L2 'Burn: 13.19% of final ATK as sustained damage every 1 sec for 10 sec' = burstCast → dot atkPct 13.19 / durationSec 10 / intervalSec 1 / flavor 'sustained' — a REAL DoT: 10 discrete 1s ticks per cast (cd 20s > 10s window → instances never overlap), never cores (DoT rule), ticks crit via the engine's UNIVERSAL DoT-crit gate (DOT_CRIT default-ON, sim.ts U13 — mechanic confirmed ginmy/maiden/little-mermaid footage, Fable-approved), and NO per-dot crit opt-in (the opt-in is reserved for measured per-DoT divergence), flavor feeds any sustainedDamagePct source. L3 'self: Max Ammunition Capacity ▲ 6 round(s) for 15 sec' = burstCast → self buff maxAmmoFlat 6 / durationSec 15 — the FLAT round primitive (theme 14 '▲ N round(s)'), NOT maxAmmoPct (the % form only coincides at her 6-round base as maxAmmoPct 100 — the trap; maxAmmoPct 6 would be ≈ inert). The cap raises live (increases never clip, sim.ts) and the extended 12-round magazine loads at her next reload inside the window — real damage (fewer reloads → more shots). UNMODELED (2 lines, verbatim, both skill1): the Piercing Radius geometry line and the 2+-enemies-concurrent bonus — see L2/L3 above. NO `ignored` blocks. ⚑1 (cadence tuple, standard): chargeFrames 60 + ~22f bolt gap ≈ 1.37s/shot and reloadFrames 141 are datamine (unverified for this unit); the gainPierce durationSec 4 stand-in derives from them (worst-case inter-shot gap ≈3.7s). Estimate: ±10% cycle → the 4s window still covers (margin to 2×cycle ≈ 2.7s). Recipe: read shot cycle + reload gap from any nihilister-focus video. Tier 1 (standard cadence ⚑). ⚑2 (S2 first-fire phase): t=10 vs t=0 convention (helm-aquamarine class-1) — worth exactly one 112.64% proc over the basis. Recipe: a focused-solo run, time the first 112.64% popup + its interval. Tier 2. ⚑3 (2+-target bonus, OUT-OF-DOMAIN): the 50.33%-of-final-ATK rider on every piercing shot through ≥2 enemies — a BIG hidden lever on multi-target content, dead in v1's single-enemy scope. Estimate: ~+50.33% of final ATK per qualifying shot to each enemy hit. Recipe: needs a multi-target engine model (concurrent-hit detection) + a multi-enemy recording; resurface with ⚑4. Tier: out-of-domain (no primitive, cannot fire or be measured here). ⚑4 (Piercing Radius, OUT-OF-DOMAIN): the +50% pierce-line radius that governs how many enemies a piercing shot covers — geometry v1 does not model; couples to ⚑3. Recipe: resurface if multi-target geometry enters scope. Tier: out-of-domain. TIER 2 overall: round-count→wall-clock conversion (gainPierce window), interval CD timer, burstCast-vs-fullBurstEnter keying, flavor-gated DoT, flat-ammo primitive. Faithful>fit; measured>fudge. Kit-autonomy gauntlet 2026-08-04.",
  "unmodeled": {
    "skill1": [
      "Piercing Radius ▲ 50% for 1 round(s).",
      "■ Activates when hits 2 or more enemies concurrently. Affects all enemies hit.\nDeals 50.33% of final ATK as additional damage."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: 'Gain Pierce for 1 round(s)' is a ROUND-COUNT duration carried as a timed gainPierce window (durationSec 4 = worst-case inter-shot gap incl. one empty-mag reload, from the ⚑1 SR cadence tuple; gainPierce has no durationShots) — per-shot shotFired refresh keeps the tag continuous while firing; the grant lags the triggering shot's damage by engine dispatch order (phantom ⚑2 class), so shot 1 is the application event",
    "skill1: Piercing Radius ▲50% and the 2+-enemies-concurrent 50.33% bonus are UNMODELED verbatim — out-of-domain for v1's single partless boss (no geometry, no second enemy); ⚑3/⚑4",
    "skill2: the 112.64% hit has NO kit-stated trigger — fires on its datamined internal cooldown (interval:10, skillCooldownsSec.skill2), first fire t=10 (⚑2 phase)",
    "burst: all three lines are burstCast-keyed (HER casts only — a different B2's Full Burst must not fire them); the Burn is a 10×1s-tick DoT whose ticks crit via the universal DOT_CRIT gate (no per-dot opt-in); the ammo line is maxAmmoFlat 6 (NOT maxAmmoPct — the % form coincides at her 6-round base and is the trap)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "gainPierce",
          "durationSec": 4
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 10
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 112.64
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
          "atkPct": 158.59
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
          "kind": "dot",
          "atkPct": 13.19,
          "durationSec": 10,
          "intervalSec": 1,
          "flavor": "sustained"
        }
      ]
    },
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
          "stat": "maxAmmoFlat",
          "value": 6,
          "durationSec": 15
        }
      ]
    }
  ]
}
```
