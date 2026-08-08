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

# S7 JUDGE PACKET — `nero` (assembled by the driver per the gauntlet contract; full artifacts, in order)

## 2. Mechanics SSOT (read these first — they are the ground rules both sides are graded against)

### 2a. docs/data/damage-calculation.md (FULL)

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


### 2b. docs/data/game-mechanics.md (FULL)

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


## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json → characters['nero'])

```json
{
  "slug": "nero",
  "name": "Nero",
  "weapon": "SMG",
  "class": "Defender",
  "element": "Fire",
  "burst": "II",
  "burstCooldownSec": 20,
  "normalAttackMultiplier": 8.39,
  "coreAttackMultiplier": 200,
  "ammo": 120,
  "reloadFrames": 99,
  "hitsPerShot": 1,
  "burstGaugePerShot": 0.1,
  "weaponDatamine": {
    "rate_of_fire": 1440,
    "max_ammo": 120,
    "reload_time": 130,
    "charge_time": 0,
    "weapon_type": "SMG",
    "fire_type": "Instant"
  },
  "skills": {
    "skill1": "■ Activates when recovery takes effect. Affects the target who cast the skill with recovery effect on Nero.\nDamage Taken ▼ 14.14% for 5 sec.\n■ Activates when recovery takes effect. Affects self.\nCat's Repayment: Damage Taken ▼ 8.43%, stacks up to 5 time(s) and lasts for 5 sec.",
    "skill2": "■ There is a 30% chance of activating when attacked. Affects the target.\nDamage Taken ▲ 8.26% for 5 sec.\n■ There is a 30% chance of activating when attacked in Grumpy Cat status. Affects the target.\nDeals 158.05% of final ATK as damage.\n■ Activates at the start of battle. Affects self.\nMax HP ▲ 60.28% continuously.",
    "burst": "■ Affects the 1 enemy unit(s) with the highest remaining HP.\nDeals 1104.91% of final ATK as Burst Skill damage.\n■ Affects self.\nAttract: Taunts all enemies for 15 sec.\n■ Activates when Cat's Repayment is at max stacks. Affects self.\nGrumpy Cat: Incoming healing ▲ 60.08% for 15 sec."
  },
  "baseStats": {
    "hp": 16500,
    "atk": 400,
    "def": 95,
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
    "resourceId": 380
  },
  "meta_crit": {
    "critRate": 1500,
    "critDamage": 15000
  }
}
```

## 4. S2b pre-op adversarial test review (claude-fable-5; includes driver reconciliation under the `reconciliation` key)

```json
{
  "slug": "nero",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "recovery \u2192 healer: Dmg Taken \u25bc14.14%",
      "disposition": "UNMODELED",
      "scope": "Defensive stat on an ALLY (the unit who cast the heal on Nero) \u2014 not a boss stat, not a damage stat; offensively inert at scope (boss deals no damage to units in v1).",
      "durationSemantics": "5 sec wall-clock (genuine durationSec; no round wording).",
      "triggerIdentity": "recovery \u2014 fires when Nero RECEIVES a heal (a 'heal' effect targets her). Requires a healer in comp (helm's heal in controlComp drives it).",
      "targetSet": "The HEALER (the ally whose recovery effect landed on Nero) \u2014 note the schema has NO 'heal caster' TargetDef kind; even if someone wanted to model it, the target is inexpressible. Correct handling is unmodeled-with-verbatim-record.",
      "nearestWrongModel": "Reading 'Damage Taken \u25bc' as the boss-debuff stat damageTakenPct with a negative/positive value on the enemy \u2014 the taxonomy trains 'Damage Taken \u25b2 = boss debuff', so the \u25bc-on-ally inverse is the natural misread; that would MOVE team damage.",
      "distinguishingAssertion": "No buffApply with stat 'damageTakenPct' and |value| \u2248 14.14 appears anywhere in the event log (in particular none with casterIdx===null/targetIdx===null, the boss-held-debuff signature); totals(res) for every slug identical with skill1 present vs the line conceptually absent.",
      "inertness": "Must move zero damage for every unit in the comp.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Cat's Repayment: DT \u25bc8.43% \u00d75, 5s",
      "disposition": "FIX",
      "scope": "Self-targeted stacking named status. The Damage Taken \u25bc STAT is defensive/inert, but the STACK COUNT is load-bearing: burst line 3 (Grumpy Cat) is gated on 'Cat's Repayment at max stacks', and Grumpy Cat gates skill2's 158.05% damage rider. Skipping this line as 'defensive' kills a whole damage chain \u2014 taxonomy trap #4/#6 (never skip heal/def lines on isolation).",
      "durationSemantics": "Each application lasts 5 sec wall-clock; stacks up to 5. NOT permanent, NOT rounds. If heal cadence is sparser than the 5s window, stacks decay and max-stacks is never reached \u2014 the model must let stacks lapse, not latch.",
      "triggerIdentity": "recovery \u2014 one stack per heal event Nero receives. A heal-over-time with ticks:N emits N recovery events, so a ticking healer ramps stacks fast; a single instant heal gives 1 stack. Trigger is NOT interval, NOT shotFired.",
      "targetSet": "self.",
      "nearestWrongModel": "Two plausible misreads: (a) drop the line entirely as defensive \u2192 Grumpy Cat gate can never be evaluated / silently always-open or always-closed; (b) model stacks as permanent (no 5s lapse) \u2192 max stacks reached from any 5 lifetime heals, over-crediting the Grumpy Cat window in sparse-heal comps.",
      "distinguishingAssertion": "Filter buffApply events for the Cat's Repayment key: stacks field increments 1\u21925 only across recovery events within rolling 5s windows, maxStacks===5, and expiresFrame \u2248 applyFrame+300. In a comp where Nero receives fewer than 5 heals inside any 5s window, no burst cast opens a Grumpy Cat window (zero 158.05% skill-damage events all fight) \u2014 RED under the permanent-stacks misread, GREEN under faithful.",
      "inertness": "The DT\u25bc stat value itself must move zero damage; only the stack-count gate may have downstream effect.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "30% when attacked: DT \u25b28.26% 5s",
      "disposition": "MEASUREMENT-GATED",
      "scope": "'Affects the target' = the ATTACKER = the boss. Damage Taken \u25b2 on the boss is a TEAM-WIDE offensive debuff (taxonomy #4) \u2014 this line is live damage for the whole comp, not defense.",
      "durationSemantics": "5 sec wall-clock per proc; re-procs refresh. Effective value is an uptime question driven by boss attack cadence \u00d7 30%.",
      "triggerIdentity": "when ATTACKED \u2014 Nero is hit by the boss. The schema has NO attacked/damage-taken trigger kind, and the v1 sim models no boss-to-unit attacks; any enactment needs an \u2691 interval proxy whose sec is (boss attack cadence vs Nero, amplified by her 15s taunt) \u00d7 30% expected value \u2014 that cadence is an ALWAYS-\u2691 field (kit-silent), measured-only. Until measured: record, don't enact silently.",
      "targetSet": "enemy (boss-held debuff \u2014 buffApply with casterIdx===null AND targetIdx===null).",
      "nearestWrongModel": "Keying the trigger to Nero's OWN offense \u2014 shotFired or hitCount ('when attacking' misread of 'when attacked') \u00d7 30%. An SMG at ~20 pulls/s would proc this near-continuously, pinning the boss at permanent +8.26% Damage Taken and over-crediting the entire team.",
      "distinguishingAssertion": "If unmodeled: zero buffApply events with stat 'damageTakenPct' value 8.26 exist. If modeled via \u2691 interval: the count of such applies over 180s equals the interval arithmetic and is INDEPENDENT of Nero's shot count \u2014 patch her cadence/ammo via withPatchedOverride and assert the apply count is unchanged (RED under the shotFired misread, whose apply count scales with shots).",
      "inertness": "Under the shipped (gated) reading, team totals must not silently carry a near-permanent 8.26% boss debuff.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "30% attacked in Grumpy Cat: 158.05%",
      "disposition": "MEASUREMENT-GATED",
      "scope": "A flat damage rider (skill bucket, % of final ATK) \u2014 no core (text says nothing about core strike), crits only if measured, noRange per rider default. STATUS-GATED: only while Nero is in Grumpy Cat.",
      "durationSemantics": "Instant hit per proc; the GATE window is Grumpy Cat's 15 sec.",
      "triggerIdentity": "when attacked (same missing primitive as skill2 line 1) AND self-status gate 'in Grumpy Cat status'. Grumpy Cat exists only for 15s after a Nero burst cast that had Cat's Repayment at 5 stacks \u2014 so the rider's live window is burst-anchored AND stack-conditional. Cadence inside the window is the same \u2691 boss-attack-rate estimate.",
      "targetSet": "enemy (the attacker).",
      "nearestWrongModel": "Dropping the Grumpy Cat gate \u2014 modeling it as an ungated 30%-per-attack (or per-shot) proc live the whole fight. Secondary misread: gating on 'any Full Burst' (fullBurstEnter windows) instead of Nero's OWN burstCast + max-stacks condition.",
      "distinguishingAssertion": "Every skill-bucket damage event with mult \u2248 158.05 falls inside [t_cast, t_cast+15s] of a Nero burstCast event whose preceding Cat's Repayment buffApply showed stacks===5; assert ZERO such events before her first qualifying burst and ZERO in windows following a <5-stack burst. GREEN under faithful, RED under both the ungated and the fullBurstEnter misreads.",
      "inertness": "No 158.05% events outside Grumpy Cat windows; none at all if max stacks is never reached.",
      "evidenceTier": "CALIBRATED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "start of battle: Max HP \u25b260.28% cont.",
      "disposition": "FAITHFUL",
      "scope": "Self Max HP stat. Offensively inert for Nero (her kit has no HP\u2192ATK scaler), but the stat is KEPT per taxonomy #7 (a future consumer \u2014 e.g. a teammate's highestAllyMaxHpPct ranker \u2014 can read it).",
      "durationSemantics": "'continuously' = permanent, no expiry. NOT durationSec.",
      "triggerIdentity": "'Activates at the start of battle' = passive (t=0, always on).",
      "targetSet": "self (targetMaxHpPct \u2014 % of the TARGET'S own Max HP; self-cast so caster===target and it would feed her own atkOfMaxHpPct if she ever gained one).",
      "nearestWrongModel": "Dropping the line because it moves no damage today \u2014 losing the stat for cross-unit HP-ranking consumers; or emitting it as a timed buff.",
      "distinguishingAssertion": "A buffApply with stat 'maxHpFlat' (flat-resolved: \u2248 0.6028 \u00d7 Nero's static maxHp) exists at/near frame 0 with no finite expiry, targeting Nero; totals(res)['nero'] identical with the line present vs removed (inertness half).",
      "inertness": "Zero damage movement for every unit in the control comp.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "1104.91% Burst Skill dmg, highest HP",
      "disposition": "FAITHFUL",
      "scope": "One instant hit, burst bucket, 1104.91% of final ATK, single enemy (partless scope-lock boss \u2014 'highest remaining HP' target selection collapses to the boss).",
      "durationSemantics": "Instant on cast.",
      "triggerIdentity": "burstCast \u2014 Nero's OWN burst (she is Burst II, 20s cd). Fires only on rotations SHE is the selected B2, and burst-cast damage lands PRE-Full-Burst: no +50% FB major, no FB-entry auras (rule 9 / verified fact).",
      "targetSet": "enemy.",
      "nearestWrongModel": "Letting the nuke take the +50% Full Burst bonus (fbMajorApplied true) because it 'happens at burst time'; or keying it to fullBurstEnter so it fires on rotations where the OTHER B2 (crown in the control fixture) casts.",
      "distinguishingAssertion": "For every damage event with bucket 'burst' and mult \u2248 1104.91 from Nero's slot: inFullBurst===false and fbMajorApplied===false, and its frame coincides with a Nero burstCast event (count of nukes === count of her own burstCast events, NOT the comp's fullBurstStart count).",
      "inertness": "No nuke on rotations where Nero did not cast; no FB major on any nuke.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attract: Taunts all enemies for 15 sec",
      "disposition": "UNMODELED",
      "scope": "Taunt/aggro \u2014 no boss-targeting or incoming-attack model exists at scope; zero damage primitive.",
      "durationSemantics": "15 sec (irrelevant while unmodeled).",
      "triggerIdentity": "burstCast rider.",
      "targetSet": "enemy (all).",
      "nearestWrongModel": "Inventing a mechanic for it (e.g. a boss debuff). Its only legitimate role is as the \u2691 RATIONALE that Nero's 'when attacked' cadence is elevated during the 15s post-burst \u2014 an estimate input, never a block.",
      "distinguishingAssertion": "No buff/damage/status event attributable to Attract exists; removing the line changes no total.",
      "inertness": "Fully inert.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "max Cat's Repayment: Grumpy Cat 60.08%",
      "disposition": "FIX",
      "scope": "Self status 'Grumpy Cat' + Incoming Healing \u25b2 stat. The healing-amount STAT is inert (sim heals carry no HP amount), but the named STATUS is load-bearing: it is the gate for skill2's 158.05% rider. Must be modeled as a 15s self-status window even though its stat does nothing.",
      "durationSemantics": "15 sec wall-clock from the qualifying burst cast.",
      "triggerIdentity": "burstCast (her OWN burst) + a conditional gate 'Cat's Repayment is at max stacks' evaluated at cast time. NOT fullBurstEnter, NOT unconditional. Note the schema has no buff-stack gate primitive (resourceGate reads named resources, which have no duration/lapse) \u2014 encoding Cat's Repayment as a resource pool must still reproduce the 5s stack lapse, or the gate over-opens; this is the subtlest encoding hazard in the kit.",
      "targetSet": "self.",
      "nearestWrongModel": "Grumpy Cat granted on EVERY burst cast regardless of stack count (dropping the max-stacks condition), or keyed to any team Full Burst \u2014 either way the 158.05% rider window over-opens massively.",
      "distinguishingAssertion": "In a fixture where Nero's incoming-heal cadence provably cannot stack Cat's Repayment to 5 inside a 5s window, her burst casts open ZERO Grumpy Cat windows (no Grumpy-Cat-gated events all fight); in a fixture with a ticking healer that does reach 5 stacks pre-cast, exactly the post-cast 15s windows go live. GREEN faithful / RED under the unconditional-grant misread.",
      "inertness": "The Incoming Healing \u25b2 60.08% value must move zero damage directly; only the status gate has downstream effect.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Cat's Repayment stacking status (gate feeder)",
    "skill2:Max HP \u25b260.28% passive (kept-stat)",
    "burst:1104.91% burst nuke",
    "burst:Grumpy Cat status window (max-stacks-gated)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Activates when recovery takes effect. Affects the target who cast the skill with recovery effect on Nero. Damage Taken \u25bc 14.14% for 5 sec.",
      "(within Cat's Repayment) the Damage Taken \u25bc 8.43% stat value itself \u2014 defensive, inert; only the stack count is consumed"
    ],
    "skill2": [
      "There is a 30% chance of activating when attacked. Affects the target. Damage Taken \u25b2 8.26% for 5 sec. \u2014 measurement-gated: no attacked-trigger primitive; boss attack cadence is \u2691 measured-only",
      "There is a 30% chance of activating when attacked in Grumpy Cat status. Affects the target. Deals 158.05% of final ATK as damage. \u2014 measurement-gated: same missing trigger; window gate must still be tested if enacted"
    ],
    "burst": [
      "Attract: Taunts all enemies for 15 sec.",
      "(within Grumpy Cat) Incoming healing \u25b2 60.08% \u2014 heal amounts unmodeled; only the status window is consumed"
    ]
  },
  "notes": "Reconcile these five points. (1) FIXTURE VALIDITY IS THE FIRST ASSERTION: Nero is Burst II, but controlComp(carry) seats the carry in the B3 slot with crown already at B2 \u2014 a Nero-as-carry fixture either never lets her burst (crown wins the B2 pick) or needs an explicit comp where Nero occupies/wins B2. Every burst-anchored test (nuke count, Grumpy Cat windows) silently passes-vacuous if she casts zero bursts; assert her burstCast count > 0 before anything else. (2) The entire offensive identity of this kit outside the burst nuke hangs on a trigger primitive the engine does not have ('when attacked') \u2014 expect the driver to have either measurement-gated both skill2 procs (correct) or invented an interval/shotFired proxy (must be \u2691-flagged with the boss-attack-cadence recipe, and the shotFired variant is flatly wrong: 'attacked' \u2260 'attacking'). (3) Expected shared-prior misread #1: skipping the whole S1/Cat's-Repayment chain as 'defensive, no damage' \u2014 it is the gate feeder for the only conditional damage in the kit. (4) Expected shared-prior misread #2: Grumpy Cat granted unconditionally or on fullBurstEnter; the faithful gate is own-burstCast + Cat's-Repayment===5-stacks-at-cast, and the 5s stack lapse means heal CADENCE (helm's heal ticks reaching Nero) decides whether the gate ever opens \u2014 a test must exercise both a reaching and a non-reaching heal pattern. (5) Encoding hazard: no buff-stack gate exists in the schema; a resource-pool encoding of Cat's Repayment has no native 5s lapse, so whatever encoding shipped must be tested specifically for stack EXPIRY, not just accrual. All magnitudes are kit-literal (DATAMINED); the only \u2691 values are the two proc cadences (boss attack rate \u00d7 30%, taunt-amplified), which are measured-only.",
  "model": "claude-fable-5",
  "reconciliation": {
    "driver": "qwen (gauntlet driver, 2026-08-04)",
    "reviewer": "claude-fable-5 (S2b, leakDetected null)",
    "converged": [
      "N6 burst nuke: burstCast (own cast only), 1104.91 kit-literal, lands pre-FB so never takes the +50% major; nearest-wrong = level-1 975.31 or fullBurstEnter keying. Both test and review pin count===own-casts + fbMajorApplied false.",
      "N5 Max HP: passive (battle start = always-on), self, 'continuously' = no expiry; targetMaxHpPct own-% basis; offensively inert (no HP->ATK conversion in kit) but KEPT (taxonomy #7 \u2014 a teammate highestAllyMaxHpPct ranker could read her raised live Max HP). Test pins exact flat vs an independent static basis + byte-equal totals under removal.",
      "FIXTURE VALIDITY (reviewer note 1): nero must not be seated behind crown for the B2 pick. Driver fixture ['liter','nero','helm'] makes nero the SOLE B2 (aria-probed starvation phenomenon) and asserts casts >= 5 + nukes === casts before any burst-anchored assertion \u2014 no vacuous pass.",
      "N3/N4: the schema has NO 'attacked' trigger and v1 models no boss-to-unit attacks; a shotFired/hitCount proxy would be flatly wrong ('attacked' != 'attacking'). Record, don't enact: both lines carried verbatim in unmodeled with a measurement-gated recipe (boss attack cadence x 30%, taunt-amplified)."
    ],
    "diverged": [
      "N2 (Cat's Repayment stacks) + N8 (Grumpy Cat status): reviewer disposition FIX/load-bearing (the chain gates N4's 158.05% rider; asked for a stack-lapse model + reaching/non-reaching heal fixtures). DRIVER RULING \u2014 UNMODELED, chain damage-dead in v1, enacted as residual: (a) the chain's terminal effect N4 requires the same absent 'attacked' trigger \u2014 even a perfectly modeled stack+status chain can emit ZERO damage/gauge events; (b) N8's own effect (Incoming healing up-arrow) has no StatKey carrier and heals are event-only (no HP amount), so the status window is unobservable; (c) the schema has no stack-count gate (noRetriggerWhileActive gates on activity, not stack count), so any Grumpy Cat encoding would be the unconditional/fullBurstEnter grant the reviewer itself names nearest-wrong #2; (d) modeling the 5s stack lapse would enact kit-silent semantics (refresh vs lapse timing, gate evaluation instant) for zero observables \u2014 fabrication risk, not faithfulness. All six lines are carried VERBATIM in unmodeled with the activation recipe for the day the engine gains incoming attacks (S7 to adjudicate)."
    ]
  }
}
```

## 5. S5 BLIND test (claude-opus-5, written prose-only with no knowledge of the driver's encoding) — plus its observed result vs the DRIVER override

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

/**
 * nero — Nero (SMG/Fire/Defender/Burst II), blind kit spec.
 *
 * KIT (ground truth, read literally):
 *   skill1a  "Activates when recovery takes effect. Affects the target who cast the skill
 *            with recovery effect on Nero." -> Damage Taken ▼14.14% for 5 sec.
 *   skill1b  "Activates when recovery takes effect. Affects self."
 *            Cat's Repayment: Damage Taken ▼8.43%, up to 5 stacks, 5 sec.
 *   skill2a  30% chance when attacked -> target: Damage Taken ▲8.26% for 5 sec.
 *   skill2b  30% chance when attacked in Grumpy Cat status -> target: 158.05% of final ATK.
 *   skill2c  "Activates at the start of battle. Affects self." Max HP ▲60.28% continuously.
 *   burst1   1 enemy with highest remaining HP: 1104.91% of final ATK as Burst Skill damage.
 *   burst2   self: Attract — taunts all enemies for 15 sec.
 *   burst3   "Activates when Cat's Repayment is at max stacks. Affects self."
 *            Grumpy Cat: Incoming healing ▲60.08% for 15 sec.
 *
 * FIXTURE: controlComp('nero', true) — Nero is Burst II, so she needs a B1 ahead of her and a
 * B3 behind her for the chain to complete and Full Bursts to occur at all. The control comp
 * supplies liter(B1)/crown(B2)/carry(B3)/helm(B3); passing 'nero' as the carry places her in
 * the B3 carry slot, so the fixture is built explicitly rather than via the carry shorthand
 * where the assertion depends on her actually casting a Burst II. All runs are hoisted — each
 * runComp is a full 180 s sim.
 *
 * WHY THE ASSERTIONS DISCRIMINATE — the central trap on this unit:
 * Nero is a Defender whose kit is almost entirely MITIGATION. Four of her nine lines move
 * "Damage Taken", but in two OPPOSITE directions with two DIFFERENT target sets:
 *   - skill1a/skill1b are ▼ on an ALLY (the healer, and self). That is incoming-damage
 *     reduction. The v1 boss deals no damage, so it is offensively inert.
 *   - skill2a is ▲ on THE TARGET (the enemy). That is the classic boss debuff the whole team
 *     rides.
 * The engine has ONE stat key for both spellings: `damageTakenPct`, documented as "debuff on the
 * boss (positive = boss takes more)". So the nearest-wrong model for skill1 is to encode the
 * ally-side ▼14.14%/▼8.43% as `damageTakenPct` at all — with a negative value it would make the
 * boss take LESS (team-wide damage loss), and with a sign flip it would hand the team a free
 * +14% amp off a purely defensive line. The skill1 tests therefore assert BOTH that Nero emits
 * no boss-scoped damageTakenPct, and that patching one in MOVES the board — i.e. the assertion
 * is non-vacuous and the mis-encoding is genuinely reachable.
 */

const NERO = 'nero';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev as Ev) },
  });
  return { res, events };
}

const base = controlComp(NERO, true);

// ---------------------------------------------------------------- hoisted runs
const { res: baseRes, events: baseEvents } = run(base);

const buffApplies = baseEvents.filter((e) => e.kind === 'buffApply');
const damages = baseEvents.filter((e) => e.kind === 'damage');
const neroIdx = baseRes.units.findIndex((u) => u.slug === NERO);
const neroDamages = damages.filter((e) => e.srcSlot === neroIdx);

describe('nero — fixture sanity (non-vacuity for everything below)', () => {
  it('nero is in the comp and deals damage', () => {
    expect(neroIdx).toBeGreaterThanOrEqual(0);
    expect(unitOf(baseRes, NERO).totalDamage).toBeGreaterThan(0);
  });

  it('nero actually casts her Burst II at least twice (burst assertions are reachable)', () => {
    const casts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e.slot === neroIdx || e.srcSlot === neroIdx),
    );
    expect(casts.length).toBeGreaterThanOrEqual(2);
  });

  it('the fight reaches Full Burst (so FB-timed riders are exercised)', () => {
    expect(baseEvents.filter((e) => e.kind === 'fullBurstStart').length).toBeGreaterThanOrEqual(2);
  });
});

describe('nero skill1a — healer-side Damage Taken ▼14.14% (defensive, GAP)', () => {
  /*
   * The line targets "the target who cast the skill with recovery effect on Nero" — an ALLY.
   * A Damage Taken ▼ on an ally is incoming-damage mitigation; the v1 boss deals no damage, so
   * it moves nothing. The discriminating claim is NEGATIVE and precise: nero must not emit a
   * boss-scoped damageTakenPct at all. Boss-held debuffs are identified by
   * casterIdx === null && targetIdx === null per the harness contract.
   */
  it('emits NO boss-scoped Damage Taken debuff (the ▼ is ally mitigation, not an enemy amp)', () => {
    const bossDebuffs = buffApplies.filter(
      (e) => e.stat === 'damageTakenPct' && e.casterIdx === null && e.targetIdx === null,
    );
    expect(bossDebuffs).toHaveLength(0);
  });

  it('emits no negative damageTakenPct anywhere (a ▼ encoded as the boss stat would cut team damage)', () => {
    const negative = buffApplies.filter(
      (e) => e.stat === 'damageTakenPct' && (e.value as number) < 0,
    );
    expect(negative).toHaveLength(0);
  });

  it('NON-VACUITY: injecting the mis-encoded ▼14.14% as a boss debuff DOES move the board', () => {
    // Nearest-wrong model: author skill1a as `damageTakenPct` on the enemy. If that were inert,
    // the negative assertions above would prove nothing. It is not inert — it must move totals,
    // which is exactly why mis-encoding this line is dangerous rather than harmless.
    const patched = withPatchedOverride(NERO, (ov) => {
      ov.skill1!.blocks.push({
        slot: 'skill1',
        trigger: { kind: 'passive' },
        target: { kind: 'enemy' },
        effects: [{ kind: 'buff', stat: 'damageTakenPct', value: -14.14 }],
      });
    });
    const wrong = runComp({ ...base, overrides: { [NERO]: patched } });
    const teamBefore = Object.values(totals(baseRes)).reduce((a, b) => a + b, 0);
    const teamAfter = Object.values(totals(wrong)).reduce((a, b) => a + b, 0);
    expect(teamAfter).toBeLessThan(teamBefore * 0.999);
  });
});

describe("nero skill1b — Cat's Repayment ▼8.43% ×5 / 5 sec (defensive, GAP; gates the burst)", () => {
  /*
   * Self-targeted mitigation stacks on a `recovery` trigger. Offensively inert for the same
   * reason as skill1a, and doubly unreachable at scope lock: Nero's own kit contains no `heal`
   * effect, so nothing in a Nero-only reading ever fires her recovery trigger. The stack pool is
   * still load-bearing — it is the stated gate for the burst's Grumpy Cat line — so the test
   * pins WHY it cannot be exercised rather than asserting a stack count that would be fiction.
   */
  it('nero emits no heal effect of her own (her recovery trigger is ally-fed, not self-fed)', () => {
    const heals = baseEvents.filter(
      (e) => (e.kind === 'heal' || e.kind === 'recovery') && e.srcSlot === neroIdx,
    );
    expect(heals).toHaveLength(0);
  });

  it.skip("GAP: Cat's Repayment stack count is unobservable — mitigation stats have no damage-side consumer, and no committed comp pairs nero with a healer whose heal cadence is measured", () => {});
});

describe('nero skill2a — target Damage Taken ▲8.26% / 5 sec, 30% when attacked (GAP: no trigger)', () => {
  /*
   * This one IS a genuine boss debuff and would benefit the whole team — but its trigger is
   * "when attacked", and the v1 boss deals no damage to anyone. There is no `attacked` TriggerDef
   * in the schema, so the line has no faithful encoding: any trigger chosen for it (passive,
   * interval, shotFired) is an INVENTED cadence that would silently amp the entire team. The
   * assertion is that no such invention shipped.
   */
  it('does NOT ship an invented always-on +8.26% boss debuff', () => {
    const amps = buffApplies.filter(
      (e) => e.stat === 'damageTakenPct' && Math.abs((e.value as number) - 8.26) < 0.01,
    );
    expect(amps).toHaveLength(0);
  });

  it.skip('GAP: "30% chance when attacked" has no trigger primitive (no `attacked` kind) and the scope-lock boss deals no damage — the 8.26% team amp is unreachable and must not be faked with passive/interval', () => {});
});

describe('nero skill2b — 158.05% of final ATK, 30% when attacked in Grumpy Cat (GAP)', () => {
  /*
   * Real damage, but doubly gated: on the same unavailable "when attacked" trigger AND on Grumpy
   * Cat status, which itself requires Cat's Repayment at max stacks (skill1b), which requires
   * incoming heals. Two unmodelable conditions stacked. Nearest-wrong: encoding it as a bare
   * shotFired/interval flatDamage, which would hand a Defender a phantom damage stream.
   */
  it('no 158.05% flat-damage rider fires (both gates are unmodelable; an ungated encoding is invented damage)', () => {
    // Her skill bucket must contain no instance carrying the 158.05% signature. Read structurally
    // off the damage events rather than off totals, so a small rider can't hide inside SMG chip.
    const riders = neroDamages.filter(
      (e) => e.bucket === 'skill' && Math.abs(((e.mult as Record<string, number>)?.atkPct ?? 0) - 158.05) < 0.01,
    );
    expect(riders).toHaveLength(0);
  });

  it('nero deals NO skill-bucket damage at all (her entire skill1/skill2 is defensive)', () => {
    const skillDmg = neroDamages
      .filter((e) => e.bucket === 'skill')
      .reduce((a, e) => a + ((e.amount as number) ?? 0), 0);
    expect(skillDmg).toBe(0);
  });

  it.skip('GAP: requires both an `attacked` trigger and a Grumpy-Cat status gate fed by ally heals — neither is reachable at scope lock', () => {});
});

describe('nero skill2c — Max HP ▲60.28% continuously (FAITHFUL, offensively inert)', () => {
  /*
   * "Activates at the start of battle" + "continuously" => a `passive` self-buff, NOT a
   * burstCast/fullBurstEnter keyed one and NOT a timed window. Per schema rule 7 the grant is
   * kept even though Nero has no atkOfMaxHpPct scaler — a self-granted Max HP feeds a future
   * consumer, and dropping it would be a silent loss of kit surface.
   *
   * Self Max HP ▲% is `targetMaxHpPct` (% of the TARGET's own Max HP) with target self — NOT
   * `casterMaxHpPct` (% of the CASTER's Max HP granted outward). For a self-grant the two
   * coincide numerically, so the discriminator is the emitted stat/target, not the value.
   */
  it('applies the self Max HP grant exactly once, at battle start, and never refreshes', () => {
    const hpGrants = buffApplies.filter(
      (e) =>
        (e.stat === 'targetMaxHpPct' || e.stat === 'maxHpFlat') &&
        e.targetSlug === NERO &&
        e.casterIdx === neroIdx,
    );
    expect(hpGrants.length).toBe(1);
    expect(hpGrants[0].frame ?? 0).toBeLessThanOrEqual(1);
  });

  it('the grant is permanent — no expiry frame (nearest-wrong: a 5 s or 15 s window borrowed from her other lines)', () => {
    const hpGrants = buffApplies.filter(
      (e) =>
        (e.stat === 'targetMaxHpPct' || e.stat === 'maxHpFlat') &&
        e.targetSlug === NERO,
    );
    for (const g of hpGrants) {
      expect(g.expiresFrame == null || (g.expiresFrame as number) > 180 * 60).toBe(true);
      expect(g.durationShots).toBeUndefined();
    }
  });

  it('grants Max HP to nero ONLY — it is "Affects self", not a team grant', () => {
    const leaked = buffApplies.filter(
      (e) =>
        (e.stat === 'targetMaxHpPct' || e.stat === 'casterMaxHpPct' || e.stat === 'maxHpFlat') &&
        e.casterIdx === neroIdx &&
        e.targetSlug !== NERO,
    );
    expect(leaked).toHaveLength(0);
  });

  it('INERTNESS: removing the Max HP grant changes no unit\'s damage (nero has no HP→ATK scaler)', () => {
    const patched = withPatchedOverride(NERO, (ov) => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        const cs = ov[slot];
        if (!cs) continue;
        for (const b of cs.blocks) {
          b.effects = b.effects.filter(
            (e) =>
              !(
                e.kind === 'buff' &&
                (e.stat === 'targetMaxHpPct' || e.stat === 'casterMaxHpPct' || e.stat === 'maxHpPct')
              ),
          );
        }
      }
    });
    const without = runComp({ ...base, overrides: { [NERO]: patched } });
    expect(totals(without)).toEqual(totals(baseRes));
  });
});

describe('nero burst1 — 1104.91% of final ATK as Burst Skill damage (FAITHFUL)', () => {
  /*
   * The only real damage in the whole kit. "Affects the 1 enemy unit(s) with the highest
   * remaining HP" is single-target selection against a single-boss fight — it resolves to the
   * boss, so the target clause carries no modeling content here.
   *
   * Two discriminators that matter:
   *  (a) It lands in the BURST bucket, not the skill bucket.
   *  (b) Burst-cast damage lands BEFORE the Full Burst window opens, so it must NOT take the
   *      +50% Full Burst major (schema rule 9: burst-cast/instant damage is always FB-exempt).
   *      The nearest-wrong model is an FB-boosted burst nuke, worth ~50% on her single largest
   *      damage source.
   */
  const burstHits = neroDamages.filter((e) => e.bucket === 'burst');

  it('emits one burst-bucket hit per burst cast', () => {
    const casts = baseEvents.filter(
      (e) => e.kind === 'burstCast' && (e.slot === neroIdx || e.srcSlot === neroIdx),
    );
    expect(burstHits.length).toBe(casts.length);
    expect(burstHits.length).toBeGreaterThanOrEqual(2);
  });

  it('the burst hit carries the 1104.91% coefficient', () => {
    for (const h of burstHits) {
      const atkPct = (h.mult as Record<string, number>)?.atkPct;
      if (atkPct != null) expect(Math.abs(atkPct - 1104.91)).toBeLessThan(0.01);
    }
  });

  it('burst damage does NOT take the +50% Full Burst major (it lands pre-FB)', () => {
    for (const h of burstHits) {
      expect(h.fbMajorApplied).toBeFalsy();
    }
  });

  it('burst damage is not core-flagged (the kit says no core strike)', () => {
    for (const h of burstHits) {
      expect((h.coreRate as number) ?? 0).toBe(0);
    }
  });

  it('DISCRIMINATING: halving the burst coefficient measurably drops nero\'s total', () => {
    const patched = withPatchedOverride(NERO, (ov) => {
      for (const b of ov.burst!.blocks) {
        for (const e of b.effects) {
          if (e.kind === 'flatDamage' && Math.abs(e.atkPct - 1104.91) < 0.01) e.atkPct = 552.455;
        }
      }
    });
    const halved = runComp({ ...base, overrides: { [NERO]: patched } });
    expect(totals(halved)[NERO]).toBeLessThan(totals(baseRes)[NERO]);
  });

  it('INERTNESS: nero\'s burst damage moves no teammate\'s total', () => {
    const patched = withPatchedOverride(NERO, (ov) => {
      for (const b of ov.burst!.blocks) {
        b.effects = b.effects.filter(
          (e) => !(e.kind === 'flatDamage' && Math.abs(e.atkPct - 1104.91) < 0.01),
        );
      }
    });
    const without = runComp({ ...base, overrides: { [NERO]: patched } });
    const a = totals(baseRes);
    const b = totals(without);
    for (const slug of Object.keys(a)) {
      if (slug === NERO) continue;
      expect(b[slug]).toBe(a[slug]);
    }
  });
});

describe('nero burst2 — Attract: taunts all enemies for 15 sec (GAP)', () => {
  it.skip('GAP: no taunt/aggro primitive exists and the scope-lock boss targets nobody — taunt is unmodelable and damage-neutral', () => {});
});

describe('nero burst3 — Grumpy Cat: incoming healing ▲60.08% for 15 sec (GAP)', () => {
  /*
   * Gated on Cat's Repayment at max stacks (skill1b, ally-heal-fed). Its payload is a HEALING
   * amplifier, and the engine models heals as bare recovery EVENTS with no HP amount — so even
   * if the gate were reachable, a 60.08% multiplier on "no amount" is unobservable. It matters
   * only as the enabler for skill2b's Grumpy-Cat-gated 158.05% rider, which is itself gated on
   * the unavailable "when attacked" trigger.
   */
  it('no incoming-healing amplifier is encoded as a damage-side stat', () => {
    const suspicious = buffApplies.filter(
      (e) => e.casterIdx === neroIdx && Math.abs(((e.value as number) ?? 0) - 60.08) < 0.01,
    );
    expect(suspicious).toHaveLength(0);
  });

  it.skip('GAP: heals carry no HP amount in the engine, so a healing-received multiplier has no observable payload; its only damage-side consumer (skill2b) is itself trigger-gapped', () => {});
});

```

### Observed result — S5 blind test vs the DRIVER override (materialized into scripts/tests/units/ and run, then removed):

- **14 passed / 7 failed / 5 skipped (26 total).** Driver classification of the 7 failures (S7 to adjudicate):
  - 2 × **BLIND-FIXTURE ARTIFACT (starvation):** the blind seated nero as the carry in `controlComp('nero', true)` = liter/crown/**nero**/helm. Crown (B2, 20s cd, slot 1) wins every stage-2 pick over nero (slot 2, same 20s cd — slot-first selection, no alternation), so nero casts ZERO bursts in that fixture. The failed assertions are the non-vacuity guard ("casts >= 2": got 0) and the per-cast nuke count. The DRIVER fixture (`['liter','nero','helm']`, nero the SOLE B2) yields 8-9 casts and is pinned `casts >= 5` first — the starvation phenomenon was independently PROBED by the driver (aria precedent) and is named in the S2b review's note (1).
  - 5 × **RECON_ERROR (blind guessed a different override-file shape / event payload):** 4 failures iterate `ov.<slot>.blocks` — the real override shape is `{ <slot>: [blocks...] }` (no `.blocks` wrapper), so the blind's counterfactual patches throw `TypeError: ... is not iterable`; 1 failure asserts `expiresFrame === undefined` where the engine emits `null` for no-expiry buffs (the driver test pins `null`). None of these touch the shipped encoding's faithfulness.
  - **0 × REAL-GOTCHA** — no failure alleges the driver override does something the kit does not say.
- The 5 `it.skip`s are the blind's own GAP lines (no assertion shipped for unmodelable lines).
- Note for grading: the S5 author's `gaps` list (in s5-result.json) independently derives the SAME unmodeled ruling as the driver for all six Grumpy-Cat-chain lines (no `attacked` trigger, no chance primitive, no taunt primitive, no heal-amount payload, no healer TargetDef).

## 6. S6 BLIND override (claude-opus-5, prose-only) — plus a short diff vs the driver override

```json
{
  "slug": "nero",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "recovery"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 0,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "recovery"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 0,
          "durationSec": 5,
          "maxStacks": 5
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "maxHpPct",
          "value": 60.28
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
          "atkPct": 1104.91,
          "noFb": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates when recovery takes effect. Affects the target who cast the skill with recovery effect on Nero. Damage Taken \u25bc 14.14% for 5 sec.",
      "Activates when recovery takes effect. Affects self. Cat's Repayment: Damage Taken \u25bc 8.43%, stacks up to 5 time(s) and lasts for 5 sec."
    ],
    "skill2": [
      "There is a 30% chance of activating when attacked. Affects the target. Damage Taken \u25b2 8.26% for 5 sec.",
      "There is a 30% chance of activating when attacked in Grumpy Cat status. Affects the target. Deals 158.05% of final ATK as damage.",
      "Activates at the start of battle. Affects self. Max HP \u25b2 60.28% continuously."
    ],
    "burst": [
      "Affects self. Attract: Taunts all enemies for 15 sec.",
      "Activates when Cat's Repayment is at max stacks. Affects self. Grumpy Cat: Incoming healing \u25b2 60.08% for 15 sec."
    ]
  },
  "caveats": [
    "\u26d1 skill1 BOTH lines are SELF/ALLY damage-REDUCTION (Damage Taken \u25bc on a Nikke), not a boss debuff. The engine's damageTakenPct is an ENEMY-side debuff stat (positive = boss takes more); there is no defensive damage-taken channel at scope lock (the boss deals no damage). Both blocks are authored with value 0 so they are provably inert while still recording the recovery-trigger shape and stack structure; the real magnitudes (14.14% / 8.43% \u00d7 up to 5) live verbatim in unmodeled. Do NOT 'fix' these by writing the magnitudes in \u2014 a positive damageTakenPct here would fabricate a boss debuff the kit never grants.",
    "\u26d1 skill1 line 1's target is the ALLY WHO HEALED Nero (\"the target who cast the skill with recovery effect on Nero\") \u2014 a reverse-causal, healer-identity target set with no TargetDef in the schema (no 'healer'/'lastHealer' kind). Even the correct target is unexpressible; combined with the inert-stat problem above the line is fully unmodeled.",
    "\u26d1 Cat's Repayment stack count (max 5, 5 sec each) is the load-bearing GATE for the burst's Grumpy Cat line and for skill2's Grumpy-Cat-gated 158.05% rider \u2014 the whole kit chain is heal-driven. Nero receives no self-heal in her own kit, so the stack pool is entirely ally-sourced and UNKNOWABLE from kit text alone. No stack pool is modeled; the chain is therefore dark end-to-end.",
    "\u26d1 skill2's 30%-on-attacked proc rate has no engine expression \u2014 there is no 'when attacked' trigger (the scope-lock boss deals no damage to Nikkes, so the trigger can never fire even if it existed). BOTH skill2 riders (the 8.26% Damage Taken \u25b2 boss debuff, which WOULD be a real team damage gain, and the 158.05% flatDamage) are therefore dark. The 8.26% line is the single largest unmodeled OFFENSIVE loss in this kit.",
    "\u26d1 Attract (taunt) has no engine primitive and is scope-inert (no boss targeting model).",
    "\u26d1 Burst 1104.91% is authored noFb:true per the standing rule that burst-cast/instant damage lands before the Full Burst window opens. It is a plain single-target hit: no core (the text says no core strike), crit at the caster's sheet rate (engine default), no range (burst-cast riders are force-set no-range).",
    "\u26d1 Nero is a Burst II SMG Defender with essentially no offensive kit outside a single burst nuke. A sim total for her will be dominated by SMG normals + the burst hit; the modeled/unmodeled split above is a faithful reflection of that, not an omission."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u26d1 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Nero (nero) \u2014 SMG/Fire/Defender/Burst II, cd 20s, ammo 120, reload 99f, no charge, hitsPerShot 1, normal mult 8.39, core 200. MODELED: burst 1104.91% single-target flatDamage on burstCast (noFb per the pre-FB-landing rule); skill2's start-of-battle Max HP \u25b2 60.28% as a self maxHpPct passive (kept per the HP/DEF-scaler prior \u2014 offensively inert today, live for any future atkOfMaxHpPct consumer, and it is the unit's own Max HP so it would feed one). NOT MODELED, with reasons in caveats: both skill1 Damage-Taken-\u25bc lines (defensive self/ally mitigation \u2014 the schema's damageTakenPct is the enemy-side debuff stat, so they are authored at value 0 and are provably inert rather than silently inverted into a fake boss debuff; line 1 additionally targets the HEALER, a target set the schema cannot express), both 30%-on-attacked skill2 riders (no 'when attacked' trigger exists and the scope-lock boss deals no damage, so neither the 8.26% boss Damage Taken \u25b2 nor the 158.05% Grumpy-Cat-gated hit can ever fire), the burst taunt (no primitive, scope-inert), and the burst's Grumpy Cat incoming-healing \u25b2 60.08% (a healing-received multiplier with no HP pool at scope lock, gated on a Cat's Repayment stack pool that is entirely ally-heal-sourced and unmodeled). The kit is a heal-reactive defender chain: allies heal Nero \u2192 Cat's Repayment stacks \u2192 max stacks unlock Grumpy Cat \u2192 Grumpy Cat gates skill2's 158.05% rider. Nero self-heals nowhere in her own kit, so the entire chain's entry condition is external and cannot be derived from kit text. Highest-value measurement target: the skill2 8.26% Damage Taken \u25b2 boss debuff \u2014 it is the only line here that would move team damage, and it needs both an on-attacked trigger primitive and a proc-rate model.",
  "hasPierce": false
}
```

### Short diff — S6 blind override vs DRIVER override (src/skills/overrides/nero.json):

1. **BURST nuke: identical** (burstCast → enemy flatDamage 1104.91). The blind adds `noFb: true`; the driver omits it. Behaviorally identical: a burst-cast hit lands BEFORE the Full Burst window opens, so fbMajorApplied is false either way — the driver test pins that directly. NOT a divergence.
2. **Max HP line — STAT-KEY divergence:** blind ships `stat: "maxHpPct"` (passive self 60.28); driver ships `stat: "targetMaxHpPct"`. Engine fact (sim.ts): the `maxHpPct` → maxHpFlat conversion exists ONLY on the cube/OL-extras path (sim.ts:916); the skill-effect apply path converts `casterMaxHpPct`/`targetMaxHpPct`/`highestAllyMaxHpPct` → maxHpFlat (sim.ts:2325-2347) but NOT bare `maxHpPct` — so the blind's buff would apply raw and be consumed by NOTHING (liveMaxHp reads maxHpFlat only), making nero's live Max HP unchanged: an inert, unobservable encoding of a line the kit grants. The driver's `targetMaxHpPct` ("Max HP ▲ X%" — the schema's documented own-% carrier, blanc/maiden precedent) resolves to an observable maxHpFlat SELF-grant, pinned by the driver test against an independent static basis. Judge: which encoding is faithful?
3. **S1 blocks:** blind ships two value-0 placeholder blocks (recovery → self `damageTakenPct` 0 / 5s, second with maxStacks 5) as "provably inert structure recording the trigger shape"; driver ships `skill1: []` and carries both lines verbatim in `unmodeled`. Both are damage-neutral. Driver's position: `damageTakenPct` is the boss-debuff stat (positive = boss takes more) — a SELF-targeted instance of it is not the kit's mechanic at ANY value (the kit grants ally/healer mitigation), so a value-0 block records a shape the kit never grants; the verbatim-`unmodeled` record is the contract's home for it. The blind's own caveat says the real magnitudes live in unmodeled either way. Judge: placeholder-vs-record — which is the faithful carriage?
4. **Bookkeeping:** the blind also lists the Max HP line inside its own `unmodeled.skill2` while simultaneously modeling it (duplicate carriage). Minor.
5. **Everything else converges:** identical unmodeled chain + reasoning (chain dark end-to-end; 8.26% boss debuff named as the single largest unmodeled offensive loss; needs an on-attacked primitive), identical ⚑ cadence-tuple flag (datamine as-is), both note nero's near-zero offensive surface outside the nuke.

## 7. DRIVER implementation under test

### 7a. scripts/tests/units/nero.test.ts (7 assertions, ALL GREEN vs the shipped override — see reviews/nero.verify.txt)

```typescript
// PER-UNIT KIT SPEC — `nero` (Nero, Tetra SMG Defender, Fire, Burst II, cd 20s, ammo 120,
// reloadFrames 99, normalMult 8.39 / coreMult 200, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-08-04; test-first line-by-line spec. Tier 1 encoding.
//
// GREENFIELD NOTE: nero shipped with NO override (simSupported:false) — before this gauntlet the
// unit could not sim at all (resolveSkills throws for prose-without-override). The usual
// "RED vs shipped override" half is degenerate: the pre-override state is "does not run". The
// substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the
// faithful encoding AND the nearest-wrong model (patched via withPatchedOverride) provably fails
// it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.nero.skills, lvl-10 values):
//   S1 "Cat's Repayment"
//      ■ when recovery takes effect → the HEALER: Damage Taken ▼14.14% / 5s              [N1 UNMODELED]
//      ■ when recovery takes effect → self: Cat's Repayment stack, Damage Taken ▼8.43%,
//        stacks to 5, each stack lasts 5s                                                 [N2 UNMODELED]
//   S2 "Lil' Paw"
//      ■ 30% chance when attacked → the attacker: Damage Taken ▲8.26% / 5s               [N3 UNMODELED]
//      ■ 30% chance when attacked in Grumpy Cat status → the attacker:
//        158.05% of final ATK as damage                                                   [N4 UNMODELED]
//      ■ at the start of battle → self: Max HP ▲60.28% continuously                       [N5]
//   BU "Grumpy Cat"
//      ■ the highest-remaining-HP enemy: 1104.91% of final ATK as Burst Skill damage      [N6]
//      ■ self: Attract — taunts all enemies for 15 sec                                    [N7 UNMODELED]
//      ■ when Cat's Repayment is at max stacks → self: Grumpy Cat,
//        Incoming healing ▲60.08% for 15 sec                                              [N8 UNMODELED]
//
// UNMODELED lines (carried VERBATIM in the override's `unmodeled`; no assertion here):
//   N1/N2 — ally/self Damage-Taken-▼ are defensive; the v1 boss deals NO damage (no HP pool), so
//           damage taken is unobservable. N1 additionally targets "the target who cast the skill
//           with recovery effect" — no TargetDef resolves the HEALER of the recovery event that
//           fired the trigger. N2's stack count has no stack-count primitive; its only consumer
//           is the burst's status condition (N8), whose chain is damage-dead anyway.
//   N3/N4 — require an INCOMING-ATTACK event; the v1 boss deals no damage and the schema has
//           neither an 'attacked' trigger nor a chance primitive. (N3's boss-facing stat —
//           damageTakenPct — DOES exist in the schema; its trigger is unreachable, so nothing is
//           fabricated in its place.)
//   N7    — taunt/attract vs a partless boss that never attacks and has no ally-targeting AI:
//           zero in-domain surface (delta-ninja-thief Attract precedent).
//   N8    — its condition is N2 at 5 stacks (unmodeled) and its effect (incoming-healing ▲) moves
//           no damage (no HP pool; no heal-scaling stat anywhere in her kit); its only downstream
//           consumer is N4 (unreachable). The whole heal→stacks→Grumpy-Cat→counter chain is dead
//           for v1 damage.
//   FIXTURE NOTE: the comp deliberately includes helm (Treasure), whose full-charge pulls heal the
//   team — so nero's `recovery` trigger CONDITION genuinely occurs in-fight; N1/N2 stay silent
//   because no block ships for them, not because the trigger never fires.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N6  nearest-wrong = the level-1 magnitude 975.31 (vs shipped 1104.91). The removed-block
//       reference proves the nuke is LIVE (team totals move). The nuke fires on her OWN cast
//       (burstCast — "Affects the 1 enemy unit(s)..." is her Burst Skill's impact, helm H7
//       precedent), and a burst CAST lands BEFORE the Full Burst window opens, so it must never
//       take the +50% FB major.
//   N5  nearest-wrong = the level-1 value 38.68 (vs shipped 60.28). The engine converts the own-%
//       grant into a maxHpFlat SELF-grant (targetMaxHpPct → maxHpFlat; e3 rule feeds
//       atkOfMaxHpPct only when caster === target — nero has NO HP→ATK conversion, so the line is
//       offensively INERT). Pinned four ways: the exact flat value vs the STATIC Max HP read
//       from the block-removed run (independent basis), battle-start frame + no expiry
//       ("continuously"), SELF-scoping on the log (UnitResult.maxHp carries the static base, so
//       the live delta is not exposed on the result row), and byte-equal team totals under
//       removal (inertness canary — fails if the engine ever feeds her Max HP into her damage,
//       at which point the line must be re-judged).
//
// Fixture (deterministic — no seed; event-log over totals): ['liter','nero','helm'] — liter
// (B1, 20s) opens the chain, nero is the SOLE B2 (casts every Full Burst), helm (B3, 40s) closes
// it and doubles as the recovery source (FIXTURE NOTE). Boss Wind (nero's ×1.1 Fire major),
// focus nero.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

// ---- fixture ----------------------------------------------------------------------------------
const COMP = ['liter', 'nero', 'helm'];
const NERO = 1; // nero's slot in COMP

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Wind',
    focusSlug: 'nero',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** N6 reference: her burst nuke removed entirely (proves the line is live). */
const neroNoNuke = withPatchedOverride('nero', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length === before) {
    throw new Error('nero burst flatDamage block missing — fixture is stale');
  }
});

/** N6 nearest-wrong: the level-1 magnitude 975.31 instead of 1104.91. */
const neroWrongNuke = withPatchedOverride('nero', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('nero burst flatDamage effect missing — fixture is stale');
  }
  e.atkPct = 975.31;
});

/** N5 reference: her Max HP line removed entirely (independent STATIC-Max-HP basis + inertness). */
const neroNoMaxHp = withPatchedOverride('nero', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'targetMaxHpPct'));
  if (ov.skill2.length === before) {
    throw new Error(
      'nero S2 targetMaxHpPct block missing — fixture is stale'
    );
  }
});

/** N5 nearest-wrong: the level-1 value 38.68 instead of 60.28. */
const neroWrongMaxHp = withPatchedOverride('nero', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'targetMaxHpPct');
  if (!e) {
    throw new Error(
      'nero S2 targetMaxHpPct effect missing — fixture is stale'
    );
  }
  e.value = 38.68;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noNuke = run({ nero: neroNoNuke });
const wrongNuke = run({ nero: neroWrongNuke });
const noMaxHp = run({ nero: neroNoMaxHp });
const wrongMaxHp = run({ nero: neroWrongMaxHp });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const neroBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'nero');

/** STATIC Max HP — the block-removed run carries no maxHpFlat buff, so its (live == static)
 *  Max HP is an independent basis for the flat-grant arithmetic below. */
const STATIC_HP = unitOf(noMaxHp.res, 'nero').maxHp;

describe('nero — kit spec', () => {
  describe('N6 — burst deals 1104.91% of final ATK to the enemy, once per own cast', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'nero' && d.srcSlot === 'burst'
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = neroBursts(base.events).length;
      expect(
        casts,
        'sole B2 on a ~20s chain — nero should cast every Full Burst'
      ).toBeGreaterThanOrEqual(5);
      expect(nukes.length).toBe(casts);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1104.91]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: the level-1 magnitude 975.31 is NOT what ships, and the nuke is live', () => {
      expect(base.totals).not.toEqual(wrongNuke.totals);
      expect(base.totals).not.toEqual(noNuke.totals);
    });
  });

  describe('N5 — battle-start self Max HP ▲60.28% continuously (offensively inert)', () => {
    // Engine convention: targetMaxHpPct → maxHpFlat, value = (60.28/100) × the TARGET's own
    // static Max HP (sim.ts applyBuff path — mirrored exactly below).
    const applied = buffs(base.events).filter(
      (b) => b.stat === 'maxHpFlat' && b.casterIdx === NERO && b.targetIdx === NERO
    );

    it('applies at battle start as a permanent SELF grant of 0.6028 × static Max HP', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([
        (60.28 / 100) * STATIC_HP,
      ]);
      expect(applied[0].frame).toBe(0);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        '"continuously" — a passive Max HP grant carries no timed expiry'
      ).toEqual([null]);
    });

    it('is SELF-scoped: no maxHpFlat grant touches any other unit', () => {
      // UnitResult.maxHp carries the STATIC base (sim.ts builds units off u.maxHp), so the
      // live-Max-HP delta is not exposed on the result row — pin the scope on the log instead:
      // every maxHpFlat application in the fight is nero's own, on nero alone.
      const all = buffs(base.events).filter((b) => b.stat === 'maxHpFlat');
      expect(all.length).toBeGreaterThan(0);
      expect(
        all.every((b) => b.casterIdx === NERO && b.targetIdx === NERO)
      ).toBe(true);
    });

    it('is offensively inert (no HP→ATK conversion in her kit): byte-equal team totals', () => {
      expect(base.totals).toEqual(noMaxHp.totals);
    });

    it('DISCRIMINATING: level-1 value 38.68 grants strictly less Max HP', () => {
      const wrong = buffs(wrongMaxHp.events).filter(
        (b) =>
          b.stat === 'maxHpFlat' && b.casterIdx === NERO && b.targetIdx === NERO
      );
      expect(wrong.length).toBeGreaterThan(0);
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([
        (38.68 / 100) * STATIC_HP,
      ]);
    });
  });
});

```

### 7b. src/skills/overrides/nero.json (the shipped encoding; validate-overrides passes)

```json
{
  "note": "nero (Nero) — Tetra SMG DEFENDER, Fire, Burst II, cd 20s, ammo 120, reloadFrames 99, normalMult 8.39 / coreMult 200, critRate 15 / critDamage 150. Kit-autonomy gauntlet 2026-08-04: GREENFIELD build (no shipped override existed; simSupported was false) — test-first re-derivation (scripts/tests/units/nero.test.ts, groups N5/N6 + counterfactual discrimination). A TANK whose offensive surface in the v1 DPS sim is exactly TWO lines: her burst nuke (1104.91% of final ATK, Burst Skill damage on the highest-remaining-HP enemy — single partless boss → `enemy`) and a battle-start self Max HP ▲60.28% (continuous). Everything else is defensive / requires incoming attacks, which v1 does not model. || MODELED TODAY: (1) BURST line 1 → burstCast-keyed flatDamage 1104.91 on `enemy` — her OWN cast only ('Affects the 1 enemy unit(s)...' is her Burst Skill's impact; burstCast, NOT fullBurstEnter: a competing B2 could open chains she does not cast — same precedent as aria/claire own-cast keying). Burst-cast damage lands BEFORE the Full Burst window opens, so it correctly never takes the +50% FB major (pinned in the test). 'Highest remaining HP' target selection collapses to the single scope-lock boss (v1 has no HP pool to rank). (2) SKILL2 line 3 'Activates at the start of battle. Affects self. Max HP ▲ 60.28% continuously.' → passive self targetMaxHpPct 60.28, NO durationSec ('continuously' = permanent — passive without durationSec is always-on). Engine converts targetMaxHpPct → maxHpFlat SELF-grant (own-% basis; e3 rule: feeds atkOfMaxHpPct only caster===target — nero has NO HP→ATK conversion, so the line is offensively INERT today, but the stat is KEPT per the keep-inert-stats rule: her raised live Max HP is readable by future cross-unit consumers, e.g. a teammate's highestAllyMaxHpPct ranker). Inertness pinned as a canary in the test (byte-equal totals under removal). || DELIBERATELY UNMODELED — THE GRUMPY-CAT CHAIN (verbatim in `unmodeled`; this is the kit's defining mechanic and the record is explicit, not a silent skip): S1's two lines (heal → healer Damage Taken ▼14.14%/5s; heal → self Cat's Repayment stacks, Damage Taken ▼8.43% ×5, 5s each), S2's two attacked-procs (30% when attacked → attacker Damage Taken ▲8.26%/5s; 30% when attacked in Grumpy Cat → 158.05% final ATK counter), burst line 2 (Attract: taunt all enemies 15s), burst line 3 (Cat's Repayment at max stacks → self Grumpy Cat, Incoming healing ▲60.08%/15s). RULING (driver, S2c; S2b claude-fable-5 diverged — wanted stacks+status modeled as load-bearing — reconciliation in scripts/kit-autonomy/reviews/nero.test-review.json): the chain is DAMAGE-DEAD in v1 for four independent reasons — (a) its terminal damage effect (the 158.05% counter) and its only boss-facing debuff (the 8.26% Damage Taken ▲) both require a 'when ATTACKED' trigger: the v1 boss deals NO damage and the schema has NO attacked trigger and NO chance primitive — this is an engine-CAPABILITY gap, not a footage gap (a shotFired/hitCount proxy is flatly wrong: 'attacked' ≠ 'attacking'); (b) the Grumpy Cat status's own effect (Incoming healing ▲) has no StatKey carrier and heals are event-only (no HP amount), so the status window would be unobservable; (c) the schema has no stack-count gate, so any Grumpy Cat encoding would degenerate into the unconditional/fullBurstEnter grant (the nearest-wrong model); (d) modeling the 5s stack lapse would enact kit-silent semantics for zero observables — fabrication risk, not faithfulness. When the engine gains incoming attacks, the recipe is: stack-counted Cat's Repayment (recovery-triggered, maxStacks 5, per-stack 5s lapse) → burstCast-gated Grumpy Cat status window (15s, condition stacks===5 at cast) → attacked×30% procs (counter 158.05% skill bucket; boss damageTakenPct 8.26/5s). N1's healer-targeted Damage Taken ▼ additionally has no 'heal caster' TargetDef, and ally/self Damage-Taken-▼ lines remain defensive even with incoming attacks (survivability — outside the DPS-sim domain). N7 taunt/attract has zero in-domain surface vs a partless boss with no ally-targeting AI (delta-ninja-thief Attract precedent). || FIXTURE NOTE: the test comp ['liter','nero','helm'] seats nero as the SOLE B2 (a 20s-cd B2 like crown would starve her to zero casts under same-stage slot-first selection — the aria-probed phenomenon) and includes helm (Treasure) whose full-charge pulls heal the team, so nero's `recovery` trigger CONDITION genuinely occurs in-fight; S1 stays silent because no block ships for it, not because the trigger never fires. || EVIDENCE TIER: both modeled values are kit-text-literal (DATAMINED lvl-10); the only estimates are the ⚑ cadences below. || TIER 1 encoding (two blocks: burstCast nuke + passive stat; no scoped buffs, no round counts, no status gate AMONG THE MODELED LINES — the kit's status gate lives entirely in the unmodeled residual, where it cannot be encoded wrong because it is not encoded). ⚑ FLAGS: (⚑1 CADENCE TUPLE, mandatory) SMG rate of fire (datamine rate_of_fire 1440 = 24/s instant SMG) + ammo 120 (empties in 5s) + reloadFrames 99 shipped datamine as-is (no charFixes; no odd-fire-mode text tell → NOT escalated). Estimate = datamine as-is. Recipe = rounds/min + reload gap from any focused nero video. (⚑2 OUT-OF-DOMAIN, incoming-attack cluster — TIER 3) the six unmodeled lines move zero damage in v1 (boss deals no damage, no HP pool): estimate = zero impact at scope lock; recipe = the activation sequence above, gated on the engine modeling boss attacks; the two proc CADENCES (boss attack rate × 30%, taunt-amplified during the 15s Attract window) are measured-only from a nero focus recording once that exists. Faithful > fit; measured > fudge. || Kit-autonomy gauntlet 2026-08-04: cross-family S2b (claude-fable-5) review — converged on N5/N6/N3/N4 + fixture validity; diverged on the stack/status chain (driver ruling above, adjudicated by S7).",
  "unmodeled": {
    "skill1": [
      "Activates when recovery takes effect. Affects the target who cast the skill with recovery effect on Nero. Damage Taken ▼ 14.14% for 5 sec.",
      "Activates when recovery takes effect. Affects self. Cat's Repayment: Damage Taken ▼ 8.43%, stacks up to 5 time(s) and lasts for 5 sec."
    ],
    "skill2": [
      "There is a 30% chance of activating when attacked. Affects the target. Damage Taken ▲ 8.26% for 5 sec.",
      "There is a 30% chance of activating when attacked in Grumpy Cat status. Affects the target. Deals 158.05% of final ATK as damage."
    ],
    "burst": [
      "Affects self. Attract: Taunts all enemies for 15 sec.",
      "Activates when Cat's Repayment is at max stacks. Affects self. Grumpy Cat: Incoming healing ▲ 60.08% for 15 sec."
    ]
  },
  "caveats": [
    "burst: the 1104.91% nuke is burstCast-keyed (her OWN cast) and lands pre-Full-Burst — it never takes the +50% FB major; 'highest remaining HP' collapses to the single partless boss",
    "skill2: Max HP ▲60.28% is a passive self maxHpFlat grant (targetMaxHpPct → own-% basis), permanent ('continuously'), offensively INERT (no HP→ATK conversion in her kit) but kept — her raised live Max HP is readable by cross-unit consumers (highestAllyMaxHpPct rankers)",
    "THE GRUMPY-CAT CHAIN (S1 stacks → burst Grumpy Cat status → S2 attacked-procs) is carried verbatim in `unmodeled`: the v1 boss deals no damage, the schema has no 'attacked' trigger / chance primitive / stack-count gate / incoming-healing stat, so the chain has ZERO in-domain observables; activation recipe recorded in the note (engine-capability-gated, TIER 3)",
    "skill1: nero's `recovery` trigger condition DOES occur in comps with a healer (helm's full-charge pulls in the test fixture) — S1 ships no blocks, so nothing fires; this is the unmodeled ruling, not a missing trigger"
  ],
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 60.28
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
          "atkPct": 1104.91
        }
      ]
    }
  ]
}

```
