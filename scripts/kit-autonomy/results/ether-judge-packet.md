====================================================================================================
S7 RECONCILING-JUDGE PACKET — `ether` (Ether, SG/Defender/Electric/Burst I, base unit)
Driver: Qwen (kit-autonomy gauntlet 2026-08-05). Judge: kimi-code/k3 (binding).
This unit was built FROM SCRATCH (no prior override; simSupported was false).
====================================================================================================

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
```markdown
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

```

### 2b. docs/data/game-mechanics.md
```markdown
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

```



## 3. GROUND TRUTH — the unit's kit prose + base stats (data/characters.json, lvl 10)

```json
{
  "slug": "ether",
  "name": "Ether",
  "weapon": "SG",
  "class": "Defender",
  "element": "Electric",
  "burst": "I",
  "burstCooldownSec": 40,
  "manufacturer": "Missilis",
  "normalAttackMultiplier": 214.3,
  "ammo": 9,
  "reloadFrames": 141,
  "hitsPerShot": 10,
  "burstGaugePerShot": 2,
  "releaseDate": "2022-11-04",
  "rarity": "SR",
  "skills": {
    "skill1": "■ Affects 1 allies with the lowest remaining HP. \nDamage Taken ▼ 52.5% for 5 sec.",
    "skill2": "■ Affects 3 enemy unit(s) with the highest final DEF.\nDeals 56.32% of final ATK as damage. \n■ Affects the same enemy unit(s). Activates during Full Burst.\nDEF ▼ 9.38% for 6 sec.",
    "burst": "■ Affects 3 ally unit(s) with the lowest remaining HP.\nCreates a Shield equal to 96% of the the skill user's final Max HP for 5 sec."
  },
  "skillCooldownsSec": {
    "skill1": 15,
    "skill2": 13,
    "burst": 40
  },
  "baseStats": {
    "hp": 12650,
    "atk": 360,
    "def": 95,
    "core": {
      "hp": 200,
      "atk": 200,
      "def": 200
    },
    "grade": {
      "hp": 2300,
      "atk": 18,
      "def": 90,
      "ratio": 200
    },
    "critRate": 15,
    "maxLevel": 1200,
    "critDamage": 150,
    "resourceId": 291
  }
}
```

NOTE the raw description_value tables live inside `skills.skillDetails` above: S1 = 1 ally / 52.5 / 5s;
S2 = 3 enemies / 56.32 / 9.38 / 6s; burst = 3 allies / 96 / 5s. All lvl-10 magnitudes are DATAMINED.



## 4. S2b CROSS-FAMILY TEST REVIEW (claude-fable-5, pre-op)

```json
{
  "slug": "ether",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Damage Taken ▼ 52.5% for 5 sec",
      "disposition": "UNMODELED",
      "scope": "Defensive damage-taken reduction on ONE ally; no attack-type scoping.",
      "durationSemantics": "durationSec 5 — literal seconds, not rounds.",
      "triggerIdentity": "No activation clause on the ■ header → interval trigger by convention (datamined skillCooldownsSec, first fire t=CD, ⚑). Irrelevant while unmodeled.",
      "targetSet": "alliesLowestHp count:1 (self-inclusive candidate pool; v1 stand-in = leftmost ally, documented). NOT the enemy.",
      "nearestWrongModel": "Sign/target inversion: 'Damage Taken' pattern-matched to the damageTakenPct BOSS-debuff stat (positive = boss takes more), turning a defensive ally buff into a +52.5% team damage window. Second-nearest: encoding it as any live offensive stat instead of recording it unmodeled.",
      "distinguishingAssertion": "In a comp with ether, filter buffApply events: expect ZERO with stat 'damageTakenPct' (including boss-held casterIdx===null events) attributable to a value of 52.5. And totals(res) for every unit must be identical when skill1 is emptied via withPatchedOverride('ether', o => { o.skill1 = [] }) — green under faithful (unmodeled ⇒ no delta), red under the boss-debuff misread (large team-wide delta).",
      "inertness": "This line must move NO unit's damage — no damage events, no offensive buffApply, no gauge. It also fires no 'recovery'/'shielded' consumer (it is neither a heal nor a shield effect), so tandem exemption does not apply.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Deals 56.32% of final ATK as damage",
      "disposition": "FAITHFUL",
      "scope": "Function damage (skill bucket) off ether's final ATK; not tied to normals/charge/crit-only. Rider conventions: noRange forced ON, no core, crit at caster's sheet rate (RIDERCRIT), FB +50% by landing timing (noFb default OFF).",
      "durationSemantics": "Instant hit per activation — no duration.",
      "triggerIdentity": "Damage line with NO activation clause → interval trigger (kind:'interval'), cadence from datamined skillCooldownsSec, first fire t=CD per convention. The cadence tuple is an ALWAYS-⚑ field (not in kit text) — must ship flagged with recipe, never as a silent constant.",
      "targetSet": "'3 enemy unit(s) with the highest final DEF' — target enemy; the sim's single partless boss collapses this to ONE recipient. The '3' is multi-target spread, NOT a hit multiplier.",
      "nearestWrongModel": "Multiplying by target count: encoding 3× hits on the one boss (168.96% per activation) because the header says 3 enemy units. Second-nearest: inventing a hit/shot-keyed trigger (shotFired/hitCount) instead of interval, tying cadence to her SG pull rate.",
      "distinguishingAssertion": "Per interval activation, exactly ONE skill-bucket damage event from ether's srcSlot, with mult consistent with atkPct 56.32 (single instance) — red under the 3× misread (either three events per fire or a tripled mult). Also assert the first fire lands at t≈CD, not t=0 and not on a per-shot cadence (event count over 180s ≈ floor(180/CD), decoupled from her shot count).",
      "inertness": "Must not appear in the normal/charge buckets, must not core, must not take the +30% range bonus (rangeApplied false on these events).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "DEF ▼ 9.38% for 6 sec (during Full Burst)",
      "disposition": "GAP",
      "scope": "Enemy DEF reduction — a team-wide damage increase via the boss-DEF term of the formula, NOT a self/ally stat. The schema's defPct is self-DEF and explicitly inert; there is no enemy-DEF StatKey, so a faithful encoding needs either a new primitive or a derived damageTakenPct-equivalent conversion (⚑ CALIBRATED, from the known boss DEF constant).",
      "durationSemantics": "durationSec 6 — literal seconds ('for 6 sec'), refreshable on each qualifying activation.",
      "triggerIdentity": "'Affects the same enemy unit(s). Activates during Full Burst.' → a RIDER on the skill2 interval damage, gated fbGate:'inFb' — it applies when the skill2 hit lands during Full Burst. It is NOT fullBurstEnter: the clause conditions the skill's own activation, it is not an FB-entry event of its own.",
      "targetSet": "Same enemy as the damage line → the boss (boss-held debuff; buffApply with casterIdx===null AND targetIdx===null per harness note).",
      "nearestWrongModel": "Keying it to fullBurstEnter — the debuff then applies at EVERY team FB start with 6s uptime per FB, decoupled from the skill2 interval cadence (over-credits whenever CD and FB windows don't coincide). Second-nearest: encoding as the inert self defPct (silently drops a live team-wide effect), or as an ally 'DEF buff'.",
      "distinguishingAssertion": "Every boss-held debuff application attributable to this line (filter by stat+value, casterIdx===null) must be frame-coincident with a skill2 interval damage event that has inFullBurst===true — and there must be NO application at a fullBurstStart frame that lacks a coincident skill2 fire. Green under fbGate-on-interval, red under fullBurstEnter keying. Additionally, if the interval fire lands OUTSIDE FB, assert no debuff application follows it.",
      "inertness": "No debuff outside Full Burst; no effect on ether's own DEF stat; ally units receive no buffApply from this line.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Shield = 96% of user's final Max HP, 5 sec",
      "disposition": "FAITHFUL",
      "scope": "Shield grant — no HP pool at scope, but MUST be encoded as a 'shield' effect (kind:'shield', maxHpPct:96, durationSec:5) because it fires recipients' 'shielded' triggers and opens requiresShielded gates (tandem rule: never skip shield lines on isolation).",
      "durationSemantics": "durationSec 5 — literal seconds; bounds the requiresShielded window on recipients.",
      "triggerIdentity": "burstCast — ether's OWN Burst I cast (cd 40s), never fullBurstEnter. She is a B1: in a comp where she is the sole B1, this fires once per rotation SHE opens.",
      "targetSet": "alliesLowestHp count:3 (v1 stand-in: leftmost 3 allies, documented; the Max-HP basis is the CASTER's final Max HP — casterMaxHpPct semantics — not each target's own).",
      "nearestWrongModel": "Skipping the whole line as 'defensive, no damage' — which silently kills any shield-synergy teammate (a 'shielded'-trigger or requiresShielded-gated kit gets zero uptime with ether on the team). Second-nearest: basis flip to the TARGET's Max HP (targetMaxHpPct-style) instead of the caster's 96%.",
      "distinguishingAssertion": "On each of ether's burstCast events, assert shield events are emitted to exactly 3 ally targets with durationSec 5 — and in a comp pairing ether with a requiresShielded/shielded-trigger consumer (patched-in via withPatchedOverride if no roster carrier is convenient), assert the consumer's gated block activates within the 5s post-cast window and NOT outside it. Green under the shield encoding, red under the skip.",
      "inertness": "No direct damage, no gauge fill, no offensive stat on recipients from this line itself; nothing fires on OTHER units' bursts (burstCast ≠ stageEnter).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill2:Deals 56.32% of final ATK as damage",
    "skill2:DEF ▼ 9.38% for 6 sec (during Full Burst)",
    "burst:Shield = 96% of user's final Max HP, 5 sec"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Damage Taken ▼ 52.5% for 5 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Three things the driver must reconcile. (1) FIXTURE SHAPE: ether is Burst I — controlComp(carry) seats the carry at B3, so she cannot be the carry there; tests need a custom CompOptions with ether IN the B1 slot (replacing liter) plus a B2 and a real B3, or her burstCast/shield lines never fire. And her 40s burst cooldown is double a standard B1's — in a sole-B1 comp the FB cadence stretches to her CD, so full-burst counts will differ materially from a liter baseline; assert rotation still chains rather than assuming liter-like FB counts. (2) EXPECTED SHARED-PRIOR MISREADS, in order of likelihood: skill1's 'Damage Taken ▼' inverted into the boss damageTakenPct debuff (the taxonomy-4 trap runs both directions — here the wrong direction manufactures +52.5% team damage); the skill2 DEF ▼ keyed to fullBurstEnter instead of fbGate:'inFb' on the interval rider; and the 3-enemy header read as a 3× hit multiplier on the single boss. (3) SCHEMA GAP: there is no enemy-DEF StatKey — if the driver modeled DEF ▼ at all it is via a derived conversion (must be ⚑ CALIBRATED with the recipe stated, e.g. equivalent damage-taken uplift from the known boss DEF constant) or it must appear verbatim in unmodeled with the gap named; a silent drop OR a silent precise constant both fail. The skill2 interval cadence is an ALWAYS-⚑ field (no trigger text) — a shipped unflagged cadence is a violation regardless of whether the number is right.",
  "model": "claude-fable-5"
}

```



## 5. S5 BLIND TEST (claude-opus-5, authored from kit prose alone) — RESULT vs the driver override

RUN RESULT (driver-executed, deterministic expected-value sims): **17 passed, 3 skipped, 0 failed**.
The 3 skips are the blind author's OWN it.skip engine-gap declarations: (a) S2b enemy-DEF-reduction —
no primitive exists; (b)+(c) shield tandem/target-set observability — no shield event on the bus in
ITS fixture (the driver's fixtures B/C cover both via asuka's requiresShielded probe).
TWO driver adaptations were required to make the raw file EXECUTABLE (zero assertion changes):
  1. casterOf(): damage events carry their owner in unitIdx (the raw helper read srcSlot-as-number /
     casterIdx, which never match a damage event — every rider assertion would have silently read 0).
  2. run(): controlComp() exposes no cfg key, so the blind onEvent wiring never reached runSim;
     the adaptation threads onEvent via opts.cfg (the harness's documented path).
Both are marked in the file header and inline. The adapted file is
scripts/kit-autonomy/blind/ether.adapted.test.ts; the RAW blind file follows:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ether — BLIND kit spec (S5 cross-family post-op; authored from kit prose ALONE).
 *
 * BASE: SG / Electric / Defender / Burst I, cd 40s, ammo 9, reloadFrames 141,
 * hitsPerShot 10, normalAttackMultiplier 214.3, coreAttackMultiplier 200.
 *
 * KIT LINES AS READ (structural; fragments quoted short):
 *
 * skill1 — header targets '1 allies with the lowest' HP; payload 'Damage Taken ▼ 52.5%' 5 sec.
 *   ALLY damage-reduction. No StatKey expresses ally DR: `damageTakenPct` is the BOSS-side
 *   debuff (positive = boss takes MORE), `defPct` is self-DEF and inert. At scope lock the boss
 *   deals no damage and no unit has an HP pool, and no trigger in the vocabulary keys off
 *   damage-taken, so the line is offensively INERT — disposition UNMODELED. The nearest-wrong is
 *   folding it into `damageTakenPct` on the boss, which would inflate the WHOLE team; that is
 *   what the anti-fudge + board-inertness assertions below refute.
 *
 * skill2a — header targets '3 enemy unit(s) with the highest' final DEF; payload
 *   'Deals 56.32% of final ATK' as damage. NO activation clause ⇒ `interval` trigger by
 *   convention. ⚑ THE PERIOD IS NOT IN THE KIT TEXT — it is outside the input domain, so this
 *   test asserts only that the cadence is interval-SHAPED (repeats, and is far slower than a
 *   per-shot/per-hit trigger); it deliberately does NOT pin a specific instance count. The boss
 *   is single-target, so '3 enemy units' collapses to ONE instance per fire — a ×3 fold is the
 *   nearest-wrong and is refuted by the ABSOLUTE magnitude assertion (implied atkPct ≈ 56.32,
 *   not 168.96). Rider conventions: no +30% range bonus, no core (text says no 'core strike'),
 *   FB-eligible by landing timing (per-kit noFb is measured-only, default OFF).
 *
 * skill2b — 'Affects the same enemy unit(s)' + 'Activates during Full Burst';
 *   payload 'DEF ▼ 9.38%' 6 sec. Trigger identity = fullBurstEnter (team FB, NOT own burstCast).
 *   NO primitive exists for enemy-DEF reduction (defPct is self-DEF/inert; damageTakenPct is a
 *   different mechanic with a different magnitude) ⇒ GAP (it.skip) plus a live anti-fudge
 *   assertion that 9.38 never surfaces as a damage-moving boss debuff.
 *
 * burst — header targets '3 ally unit(s) with the lowest' HP; payload creates a Shield worth
 *   '96% of the ... final Max HP' for 5 sec. Trigger = burstCast (Burst I, cd 40s), effect
 *   `shield{maxHpPct:96,durationSec:5}`, target alliesLowestHp{count:3}. It must NOT be dropped
 *   (it fires teammates' `shielded` triggers / opens `requiresShielded` gates), and it must NOT
 *   be encoded as a Max-HP GRANT (the nearest-wrong: maxHpFlat / casterMaxHpPct would feed an
 *   atkOfMaxHpPct consumer and manufacture damage). Its payload is unobservable in this fixture
 *   (no shield event kind on the onEvent bus, no shield-consuming teammate) ⇒ the cross-unit and
 *   target-set assertions are it.skip with reasons.
 *
 * FIXTURE: controlComp('ether', true) — liter (B1) / crown (B2) / carry slot / helm (B3).
 * ether is Burst I, so liter COMPETES for stage 1; the burst group therefore carries an explicit
 * non-vacuity assertion that ether actually casts (if it fails, the fixture — not the model — is
 * the finding). Deterministic (no seed). Every run is a full 180s sim, so all 5 runs are hoisted
 * and shared across the file.
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

const SLUG = 'ether';
const RIDER_PCT = 56.32;
const DEF_DOWN_PCT = 9.38;
const DR_PCT = 52.5;
// a tiny non-zero probe value: keeps the damage instance (and its burst-gauge impact) alive so
// the rotation is byte-identical across the magnitude runs, unlike a hard 0.
const EPS = 0.001;
const UNIT_PCT = 1;

type AnyEv = SimEvent & Record<string, any>;

// The override FILE is slot-keyed; the two documented shapes are `{skill1: Block[]}` and
// `{skill1: {blocks: Block[]}}`. Resolve either, and always MUTATE THE RETURNED ARRAY in place
// so the patch lands whichever shape is real.
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : ((s.blocks as any[]) ?? []);
}
function allBlocks(ov: any): any[] {
  return [
    ...blocksOf(ov, 'skill1'),
    ...blocksOf(ov, 'skill2'),
    ...blocksOf(ov, 'burst'),
  ];
}
function eachFlatDamage(ov: any, fn: (e: any) => void): number {
  let n = 0;
  for (const b of allBlocks(ov)) {
    for (const e of (b?.effects as any[]) ?? []) {
      if (e?.kind === 'flatDamage') {
        fn(e);
        n += 1;
      }
    }
  }
  return n;
}

function run(overrides?: Record<string, any>) {
  const opts: any = controlComp(SLUG, true);
  const events: AnyEv[] = [];
  const onEvent = (e: AnyEv) => {
    events.push(e);
  };
  opts.onEvent = onEvent;
  if (opts.cfg) opts.cfg.onEvent = onEvent;
  if (overrides) opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  const res = runComp(opts);
  return { res, events, tot: totals(res) as Record<string, number> };
}

const kind = (evs: AnyEv[], k: string) => evs.filter((e) => (e as any).kind === k);
const casterOf = (e: AnyEv): number => {
  const a = e as any;
  if (typeof a.srcSlot === 'number') return a.srcSlot;
  if (typeof a.casterIdx === 'number') return a.casterIdx;
  if (typeof a.slot === 'number') return a.slot;
  return -1;
};
const near = (a: number, b: number, tol = 0.005) => Math.abs(a - b) <= tol;

// ether emits no buffs of her own, so her slot index is resolved from a buff she RECEIVES
// (liter/crown buff the squad). Asserted non-negative below, so a failure is loud.
function slotOf(evs: AnyEv[], slug: string): number {
  for (const e of evs) {
    const a = e as any;
    if (a.kind === 'buffApply' && a.targetSlug === slug && typeof a.targetIdx === 'number') {
      return a.targetIdx;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// hoisted counterfactual overrides + runs (5 × 180s sims)
// ---------------------------------------------------------------------------
let epsPatched = 0;
let unitPatched = 0;
let corePatched = 0;

const ovEps = withPatchedOverride(SLUG, (o: any) => {
  epsPatched = eachFlatDamage(o, (e) => {
    e.atkPct = EPS;
  });
});
const ovUnit = withPatchedOverride(SLUG, (o: any) => {
  unitPatched = eachFlatDamage(o, (e) => {
    e.atkPct = UNIT_PCT;
  });
});
const ovCore = withPatchedOverride(SLUG, (o: any) => {
  corePatched = eachFlatDamage(o, (e) => {
    e.core = true;
  });
});
const ovNoDef = withPatchedOverride(SLUG, (o: any) => {
  blocksOf(o, 'skill1').length = 0;
  blocksOf(o, 'burst').length = 0;
});

const base = run();
const eps = run({ [SLUG]: ovEps });
const unit = run({ [SLUG]: ovUnit });
const cored = run({ [SLUG]: ovCore });
const noDef = run({ [SLUG]: ovNoDef });

const ETHER = slotOf(base.events, SLUG);
const riderHits = base.events.filter(
  (e) =>
    (e as any).kind === 'damage' &&
    (e as any).bucket === 'skill' &&
    casterOf(e) === ETHER,
);
const fbCount = (r: { events: AnyEv[] }) => kind(r.events, 'fullBurstStart').length;
const mates = () => Object.keys(base.tot).filter((s) => s !== SLUG);

describe('ether — fixture validity (non-vacuity)', () => {
  it('wires the event bus and resolves ether in the comp', () => {
    expect(base.events.length).toBeGreaterThan(0);
    expect(ETHER).toBeGreaterThanOrEqual(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('reaches Full Burst, so FB-timing and FB-gated readings are exercised', () => {
    expect(fbCount(base)).toBeGreaterThan(0);
  });

  it('ether fires her SG (normal bucket is live)', () => {
    const normals = base.events.filter(
      (e) =>
        (e as any).kind === 'damage' &&
        (e as any).bucket === 'normal' &&
        casterOf(e) === ETHER,
    );
    expect(normals.length).toBeGreaterThan(0);
  });

  it('the flatDamage rider exists to be patched (guards no-op counterfactuals)', () => {
    // If these are 0 every magnitude counterfactual below is a silent no-op — i.e. skill2a is
    // MISSING from the model, which is exactly what this assertion surfaces.
    expect(epsPatched).toBeGreaterThanOrEqual(1);
    expect(unitPatched).toBe(epsPatched);
    expect(corePatched).toBe(epsPatched);
  });
});

describe('ether skill2a — 56.32% of final ATK, single instance, interval-shaped', () => {
  it('lands repeating skill-bucket damage from ether', () => {
    // Discriminates FAITHFUL vs MISSING (a dropped damage line yields zero instances).
    expect(riderHits.length).toBeGreaterThan(0);
  });

  it('fires on an interval-shaped cadence, not per-shot and not once-only', () => {
    // The kit gives NO activation clause ⇒ interval. ⚑ the PERIOD is not in the kit text, so the
    // exact count is not asserted. >=2 refutes a one-shot/burstCast reading; <=60 over 180s
    // (slower than once per 3s) refutes a shotFired/hitCount reading — ether's SG fires far more
    // often than that.
    expect(riderHits.length).toBeGreaterThanOrEqual(2);
    expect(riderHits.length).toBeLessThanOrEqual(60);
  });

  it('implies atkPct 56.32 in ABSOLUTE terms (refutes the ×3 three-enemy fold)', () => {
    // Rider contribution is linear in atkPct and the gauge impact is per-instance (unchanged),
    // so two probe magnitudes recover the shipped percentage outright: a model that credits all
    // 3 header targets against the single-target boss implies ~168.96 and fails here.
    const cBase = base.tot[SLUG] - eps.tot[SLUG];
    const cUnit = unit.tot[SLUG] - eps.tot[SLUG];
    expect(cBase).toBeGreaterThan(0);
    expect(cUnit).toBeGreaterThan(0);
    const impliedPct = (cBase / cUnit) * (UNIT_PCT - EPS) + EPS;
    expect(impliedPct).toBeGreaterThan(RIDER_PCT * 0.99);
    expect(impliedPct).toBeLessThan(RIDER_PCT * 1.01);
  });

  it('keeps the rotation identical across magnitude probes (linearity is valid)', () => {
    // Validity guard for the assertion above: if changing atkPct moved the burst rotation, the
    // two-point extrapolation would not be measuring magnitude.
    expect(fbCount(eps)).toBe(fbCount(base));
    expect(fbCount(unit)).toBe(fbCount(base));
    expect(riderHits.length).toBe(
      eps.events.filter(
        (e) =>
          (e as any).kind === 'damage' &&
          (e as any).bucket === 'skill' &&
          casterOf(e) === ETHER,
      ).length,
    );
  });

  it('takes NO +30% range bonus (rider convention)', () => {
    // Nearest-wrong: a rider authored without noRange, which silently inflates every instance.
    expect(riderHits.length).toBeGreaterThan(0);
    expect(riderHits.every((e) => (e as any).rangeApplied === false)).toBe(true);
  });

  it('is core-INELIGIBLE (the kit never says core strike)', () => {
    // Behavioural discriminator, field-name independent: flipping core:true on the SAME rider
    // must ADD damage. If it does not, the shipped model already cores (or the rider is absent).
    expect(cored.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]);
  });

  it('is Full-Burst eligible by landing timing, and exercises both states', () => {
    // Non-vacuity: the fixture must produce in-FB AND out-of-FB instances, else the FB claim is
    // untested. Nearest-wrong: noFb:true (per-kit noFb is measured-only, default OFF).
    const inFb = riderHits.filter((e) => (e as any).inFullBurst === true);
    const outFb = riderHits.filter((e) => (e as any).inFullBurst !== true);
    expect(inFb.length).toBeGreaterThan(0);
    expect(outFb.length).toBeGreaterThan(0);
    expect(inFb.every((e) => (e as any).fbMajorApplied === true)).toBe(true);
    expect(outFb.every((e) => (e as any).fbMajorApplied !== true)).toBe(true);
  });

  it('moves ONLY ether — no teammate damage rides the rider', () => {
    for (const slug of mates()) {
      expect(eps.tot[slug]).toBe(base.tot[slug]);
    }
  });
});

describe('ether skill2b — boss DEF ▼ 9.38% for 6 sec, during Full Burst', () => {
  it.skip('reduces the boss final DEF by 9.38% for 6s on Full Burst entry — GAP: no enemy-DEF-reduction primitive exists (StatKey defPct is SELF DEF and inert in v1; damageTakenPct is a different mechanic with a different magnitude). Needs an enemyDefPct stat + a boss-DEF term consumer before it can be modeled or asserted.', () => {
    expect(true).toBe(true);
  });

  it('is NOT fudged into a damage-moving boss debuff', () => {
    // The tempting wrong model is damageTakenPct +9.38 (boss takes more) standing in for DEF ▼.
    // Boss-held debuffs carry casterIdx === null, so this filters by stat + value, not by caster.
    const fudged = kind(base.events, 'buffApply').filter((e) => {
      const a = e as any;
      return (
        (a.stat === 'damageTakenPct' || casterOf(e) === ETHER || a.casterIdx === ETHER) &&
        (near(Math.abs(a.value ?? 0), DEF_DOWN_PCT) || near(Math.abs(a.value ?? 0), DR_PCT))
      );
    });
    expect(fudged).toEqual([]);
  });
});

describe('ether skill1 — ally Damage Taken ▼ 52.5% for 5 sec (defensive)', () => {
  it('grants ether no damage-moving buff to anyone', () => {
    // Whole-kit anti-fudge: ether has ZERO offensive buff lines, so any offensive stat sourced
    // from her slot is invented. Catches the DR-as-damageTakenPct and shield-as-MaxHP folds both.
    const offensive = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'atkOfMaxHpPct',
      'atkOfCasterMaxHpPct',
      'attackDamagePct',
      'critRatePct',
      'critRateNormalPct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'damageTakenPct',
      'trueDamagePct',
      'sustainedDamagePct',
      'maxHpFlat',
      'casterMaxHpPct',
      'targetMaxHpPct',
      'highestAllyMaxHpPct',
      'hitRatePct',
      'burstGenPct',
    ]);
    const fromEther = kind(base.events, 'buffApply').filter(
      (e) => casterOf(e) === ETHER && offensive.has((e as any).stat),
    );
    expect(fromEther.map((e) => (e as any).stat)).toEqual([]);
  });

  it('both defensive lines are board-inert at scope lock', () => {
    // Emptying skill1 (ally DR) and burst (shield) must move NOTHING: the boss deals no damage,
    // no unit has an HP pool, and no unit in this comp carries a `shielded` trigger or a
    // requiresShielded gate. Byte-identical totals — for ether AND every teammate.
    for (const slug of Object.keys(base.tot)) {
      expect(noDef.tot[slug]).toBe(base.tot[slug]);
    }
    expect(fbCount(noDef)).toBe(fbCount(base));
  });
});

describe('ether burst — Shield 96% of caster final Max HP, 5 sec, 3 lowest-HP allies', () => {
  it('ether actually casts her Burst I in this fixture (non-vacuity)', () => {
    // ether is Burst I and controlComp seats liter (also B1), which competes for stage 1. If this
    // is 0 the burst group cannot be exercised at all — a FIXTURE finding, not a model finding.
    const casts = kind(base.events, 'burstCast').filter(
      (e) => casterOf(e) === ETHER || (e as any).slug === SLUG,
    );
    expect(casts.length).toBeGreaterThan(0);
  });

  it('the shield is NOT encoded as a Max HP grant', () => {
    // Nearest-wrong: `shield{maxHpPct:96}` mis-modeled as casterMaxHpPct / maxHpFlat on allies.
    // That is not merely cosmetic — a Max HP grant feeds an atkOfMaxHpPct consumer and would
    // manufacture ATK out of a purely defensive line.
    const hpGrants = kind(base.events, 'buffApply').filter((e) => {
      const a = e as any;
      return (
        casterOf(e) === ETHER &&
        ['maxHpFlat', 'casterMaxHpPct', 'targetMaxHpPct', 'highestAllyMaxHpPct', 'maxHpPct'].includes(
          a.stat,
        )
      );
    });
    expect(hpGrants).toEqual([]);
  });

  it.skip('the shield fires a teammate `shielded` trigger / opens a requiresShielded gate — GAP: no shield event kind exists on the onEvent bus and controlComp seats no shield-consuming unit, so the tandem payload is unobservable here. Needs a fixture with a shield-gated ally.', () => {
    expect(true).toBe(true);
  });

  it.skip('the shield covers exactly the 3 lowest-remaining-HP allies (alliesLowestHp count 3) — GAP: shield application emits no observable event and v1 has no HP pool (lowest-HP resolves to a documented leftmost-N stand-in), so the target set cannot be discriminated behaviourally.', () => {
    expect(true).toBe(true);
  });
});

```



## 6. S6 BLIND OVERRIDE (claude-opus-5, authored from kit prose alone) — + driver diff

DIFF vs the driver override (structural):
- skill1: IDENTICAL intent — both [] with the S1 line unmodeled (blind's unmodeled text drops the ■ marker).
- skill2a rider: blind = interval **sec:10** (the blind author INVENTED the period — its own ⚑ admits
  'trigger identity AND cadence both invented'; the DATAMINED skillCooldownsSec.skill2 is 13) + explicit
  crit:true/noRange:true (behaviorally identical to the engine's bare instant-rider defaults).
  Driver = interval sec:13 (datamined CD), bare rider defaults.
- skill2b DEF▼: blind = ENCODED as fullBurstEnter → enemy → defPct value:-9.38/6s. The engine's defPct
  is a SELF/ally DEF stat that is inert in v1 AND applyBuff drops enemy-side DEF debuffs at dispatch
  (the S5 blind author explicitly refused this encoding: 'encoding it there would be a fudge, not an
  approximation'). Driver = VERBATIM UNMODELED + ⚑2 (estimate ~0.03% team + recipe + tier), the
  novel/mast Sea-Breeze precedent for enemy-DEF-reduction gaps.
- burst: IDENTICAL — burstCast → alliesLowestHp count:3 → shield maxHpPct 96 / durationSec 5.

The blind override JSON:

```json
{
  "slug": "ether",
  "skill1": [],
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
          "atkPct": 56.32,
          "crit": true,
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": -9.38,
          "durationSec": 6
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
        "kind": "alliesLowestHp",
        "count": 3
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 96,
          "durationSec": 5
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Affects 1 allies with the lowest remaining HP. Damage Taken \u25bc 52.5% for 5 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "\u2691 skill2 damage line carries NO activation clause in the kit text \u2014 trigger identity is INVENTED (interval). If the real trigger is fullBurstEnter/hitCount/lastBullet, both cadence and FB-uptime are wrong.",
    "\u2691 skill2 interval sec:10 is an UNMEASURED estimate. The unit's datamined cd 40s is the BURST cooldown, not a skill cooldown; no skill CD is in the input domain.",
    "\u2691 skill2 DEF \u25bc 9.38% is authored as a defPct buff of -9.38 on the enemy. The schema documents defPct as inert in v1 (self DEF does not affect own damage) \u2014 whether an enemy-targeted negative defPct actually reduces boss DEF in the damage formula is UNVERIFIED from the schema alone; if inert, this line is silently dropping a real team-wide damage lever.",
    "\u2691 skill2 \"Affects 3 enemy unit(s) with the highest final DEF\" \u2014 v1 has ONE boss, so the count-3 targeting collapses to a single application. No multi-target scaling is modeled.",
    "\u2691 skill2 damage rider FB handling: left at engine default (FB by timing, ON) per methodology; noFb is measured-only and NOT set.",
    "\u2691 burst shield is offensively inert in isolation (no HP pool at scope lock) but is retained because it emits shield events that fire teammates' `shielded` triggers and satisfy `requiresShielded` gates.",
    "\u2691 burst trigger keyed burstCast (this unit's own Burst I cast), not fullBurstEnter \u2014 a shield created by the unit's own burst block fires on rotations THIS unit bursts."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Ether is an SG/Electric/Defender/Burst I support: S1 is a pure ally damage-mitigation line (no damage path at scope lock, unmodeled); S2 carries the only damage in the kit (56.32% of final ATK, trigger kit-silent) plus an FB-gated enemy DEF \u25bc 9.38%/6s; the burst is a 96%-of-caster-Max-HP shield to the 3 lowest-HP allies, retained for shield-synergy tandem effects rather than for its own (unmodeled) HP pool."
}
```



## 7. DRIVER IMPLEMENTATION (what ships if you rule GO)

### 7a. scripts/tests/units/ether.test.ts (22 tests, ALL GREEN)

```typescript
// PER-UNIT KIT SPEC — `ether` (Ether — SG / Defender / Electric / Burst I, cd 40s, ammo 9,
// hitsPerShot 10, reloadFrames 141, normalAttackMultiplier 214.3, burstGaugePerShot 2,
// Missilis, original_rare SR, released 2022-11-04). Kit-autonomy gauntlet 2026-08-05
// (test-first re-derivation). ⚠ EXACT SLUG: `ether` — the base Missilis SG Defender;
// NOT a variant (no other unit carries her name — the slug-disambiguation lint passes clean).
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/ether.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates exactly
// as a verification gauntlet would (jackal/novel precedent).
//
// Kit (blablalink prose, data/characters.json → characters.ether.skills, lvl 10):
//   S1 "Corrosive Bullets" (cd 15s)
//      ■ 1 ally, lowest remaining HP:
//        Damage Taken ▼52.5% for 5 sec                                       [UNMODELED — E3]
//   S2 "Prognostic Response Experiment" (cd 13s)
//      ■ 3 enemies with the highest final DEF (NO activation clause):
//        Deals 56.32% of final ATK as damage                                  [FAITHFUL — E1]
//      ■ same enemies. Activates during Full Burst:
//        DEF ▼9.38% for 6 sec                                                [UNMODELED — E4]
//   BU "Colossal Single Cell" (B1, cd 40s)
//      ■ 3 allies, lowest remaining HP:
//        Shield = 96% of the skill user's final Max HP for 5 sec              [FAITHFUL — E2]
//
// ETHER IS A TANK/SHIELDER; HER KIT IS MOSTLY OUT-OF-DOMAIN FOR A DAMAGE SIM. Two of the
// four kit lines are modeled; the other two are documented omissions:
//
//   • E1 (S2a) is her ONLY damage line: a 56.32%-of-final-ATK skill hit on a 13s auto-cast.
//     TRIGGER IDENTITY = interval:13. The damage block's ■ header carries NO activation
//     clause and the datamined skillCooldownsSec.skill2 = 13 — the CD-bearing auto-cast
//     shape the schema's interval guidance exists for ('kit lines that "just happen" on an
//     internal cooldown with no visible activation clause'; novel's interval:10 precedent).
//     Two structural facts settle it against a fullBurstEnter (whole-slot) reading:
//       (a) PROSE CONVENTION — an activation clause attaches to the ■ block whose header
//           carries it. ada's S2 heads its FB-keyed block with 'Activates during Full Burst'
//           (shipped fullBurstEnter) and kurumi's likewise; ether's FB clause sits in the
//           SECOND block's header ('■ Affects the same enemy unit(s). Activates during Full
//           Burst.'), governing the DEF▼ line alone.
//       (b) THE DATAMINED CD — ada/kurumi, whose skill2s ARE purely FB-keyed, have CD null.
//           An FB cycle is >=20s, so ether's 13s CD is meaningful ONLY on a CD-driven
//           activation path. (The driver's initial fullBurstEnter derivation was overturned
//           by these facts + the convergent cross-family blind re-derivations — S2b fable-5,
//           S5/S6 opus-5 all independently read interval.)
//     First-fire phase t=13 (vs t=0) is the engine interval convention (⚑ in the override;
//     neve/snow-white/novel precedent). The '3 enemies with the highest final DEF' targeting
//     clause collapses to the single scope-lock boss ({kind:'enemy'} documented stand-in —
//     v1 fields one immortal enemy; novel precedent); it is a multi-target SPREAD, NOT a ×3
//     hit multiplier (pinned by the two-point magnitude probe). Bare flatDamage rider
//     defaults: crit-eligible, no core, skill bucket, FB-major by landing timing (the
//     interval activations land both in and out of the FB window — both states pinned).
//   • E2 (burst) is a shield event + window: no shield HP pool is modeled (v1 boss deals no
//     damage), exactly like snow-crane's FB shield — the encoded substance is the SHIELDED
//     event + each target's shield-state window (shieldedUntilFrame), which fire teammates'
//     'shielded' triggers / requiresShielded gates. maxHpPct 96 is %-of-CASTER final Max HP
//     (the schema's documented reading of 'of the skill user's final Max HP'). Target is
//     alliesLowestHp count:3 — v1 has no HP pool, so 'lowest remaining HP' resolves to the
//     leftmost-3 documented stand-in (types.ts TargetDef comment; ⚑ in the override).
//     Trigger identity is burstCast (HER cast — she is Burst I, so the cast opens the chain
//     and the shield is up ~1-2s later when Full Burst begins; a fullBurstEnter keying would
//     over-cover rotations led by ANOTHER Burst I — pinned in fixture B).
//   • E3 (S1) is ally-side damage mitigation — out-of-domain: v1 models no ally HP pool and
//     no incoming boss damage, so it can never move anything (sakura-suzuhara S2 is the
//     identical kit line and the binding precedent). The boss-facing damageTakenPct channel
//     is the WRONG direction AND target — encoding it there (as +52.5 or −52.5) would
//     manufacture a phantom team damage change on S1's 15s cadence, so it is NOT used; the
//     nearest-wrong +52.5 amp counterfactual is pinned RED below.
//   • E4 (S2b) is an enemy DEF reduction — the engine has no dynamic enemy-DEF-reduction
//     primitive (applyBuff ignores enemy ATK▼/DEF▼; cfg.bossDef is a fixed per-hit
//     subtraction; damageTakenPct is a separate bucket — novel/mast Sea-Breeze precedent).
//     At the 140-DEF scope-lock boss this is 9.38% × 140 ≈ 13.1 flat DEF ≈ ~0.03% team
//     damage — minor, not load-bearing. The nearest-wrong damageTakenPct +9.38 misread is
//     pinned RED below (it would lift team totals on every FB entry).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   E1  the rider fires 13× per 180s battle, on the 13s interval frames (t = 13k), at 56.32
//       (the lvl-1 24.64 is wrong), bucket 'skill', srcSlot 'skill2', with FB-major applied
//       exactly to the instances landing inside an FB window. A fullBurstEnter keying fires
//       only on FB-start frames (~4× — it loses every out-of-FB CD activation and makes the
//       13s CD meaningless); a burstCast keying lands on her cast frames; a two-point
//       magnitude probe recovers the shipped percentage outright, refuting the ×3 fold.
//   E2  shape pin (burstCast / alliesLowestHp:3 / shield 96%/5s) + inertia pin (removal is
//       byte-identical: a shield moves no damage in v1) + BEHAVIORAL trigger/scope pins via
//       asuka's requiresShielded FB-enter probe (fixtures B/C): burstCast keying shields only
//       the FBs ether cast INTO (gate-passes == her cast count, strictly fewer than the FB
//       count under a second Burst I); fullBurstEnter keying shields every FB (gate-passes ==
//       FB count). Scope: count:3 leaves a slot-4 asuka UNSHIELDED (0 gate passes) where an
//       all-allies encoding shields her (gate-passes == ether's cast count).
//   E3  zero buffs originate from ether at baseline; the +52.5 boss-channel misread applies
//       the debuff on a 15s cadence and lifts team totals — the shipped zero is a choice.
//   E4  zero boss debuffs are applied at baseline; the +9.38 damageTakenPct misread applies
//       per FB entry and lifts team totals — the shipped zero is a choice.
//
// FIXTURES. Deterministic (no seed); event-log over totals (totals only in the
// damage-movement arms). Boss Fire in all three (Electric vs Fire is neutral).
//   A (MAIN): [ether, crown, ada, helm], focus ether. One caster per burst stage; ether is
//      the SOLE B1 (40s CD — the chain waits for her, so Full Bursts run every ~40s and she
//      casts every one of them; alice-wonderland-bunny/sakura-suzuhara precedent for the
//      40s-solo-B1 cadence). The interval rider is comp-independent (battle-time keyed), so
//      its cadence pins hold on any fixture.
//   B (shield TRIGGER identity): [ether, liter, asuka, admi, ada]. Two Burst Is — ether
//      (40s, slot 0) alternates with liter (20s, slot 1), so the comp makes ~2× more Full
//      Bursts than ether casts (emma's double-B1 precedent). asuka sits INSIDE the leftmost-3
//      shield scope (slot 2): her S2-1 is an FB-enter self elemAdvantageDamagePct-30.02 with
//      requiresShielded, so counting those buffApply events reads the shield state at every
//      FB entry (snow-crane's M3 probe). admi is the recovery-silent, shield-less B2; ada
//      alternates B3 with asuka. liter/admi/ada/helm carry NO shield effects (crown — the
//      only fixture regular with one — is deliberately excluded).
//   C (shield SCOPE): [ether, liter, admi, ada, asuka] — same chain support, but asuka is
//      slot 4, OUTSIDE the leftmost-3: never shielded at baseline (0 gate passes), shielded
//      by the all-allies counterfactual.
// SR CEILING NOTE: ether is original_rare SR, but the fixture runs her on the plain
// scope-lock basis (copies:10 ⇒ 3★/core 7) — the sakura-suzuhara precedent (SR, gauntlet
// 2026-08-04, no unitLimits). Her assertions are event-structural, not magnitude ratios,
// so the SSR-ceiling stats move no verdict.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'ether';
/** datamined skillCooldownsSec.skill2 — the interval period. */
const S2_CD_SEC = 13;
const S2_FIRES_180S = Math.floor(180 / S2_CD_SEC); // 13 fires: t = 13, 26, …, 169

/** Fixture A slot order: ether 0 / crown 1 / ada 2 / helm 3. */
const SLUGS_A = [SLUG, 'crown', 'ada', 'helm'] as const;
const ETHER_A = 0;
/** Fixture B slot order: ether 0 / liter 1 / asuka 2 / admi 3 / ada 4. */
const SLUGS_B = [SLUG, 'liter', 'asuka', 'admi', 'ada'] as const;
const ASUKA_B = 2;
/** Fixture C slot order: ether 0 / liter 1 / admi 2 / ada 3 / asuka 4. */
const SLUGS_C = [SLUG, 'liter', 'admi', 'ada', 'asuka'] as const;
const ASUKA_C = 4;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;

function runA(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS_A],
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
function runProbe(slugs: readonly string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [...slugs],
    bossElement: 'Fire',
    focusSlug: SLUG,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

const sum = (t: Record<string, number>, slugs: readonly string[]) =>
  slugs.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** E1 nearest-wrong trigger: fullBurstEnter (the whole-slot FB reading — fires only on
 *  FB-start frames, losing every out-of-FB CD activation; the 13s CD becomes meaningless). */
const e1OnFbEnter = withPatchedOverride(SLUG, (ov) => {
  ov.skill2[0].trigger = { kind: 'fullBurstEnter' };
});
/** E1 wrong trigger: burstCast (her own cast frames) instead of the interval auto-cast. */
const e1OnBurstCast = withPatchedOverride(SLUG, (ov) => {
  ov.skill2[0].trigger = { kind: 'burstCast' };
});
/** E1 wrong magnitude: the lvl-1 value 24.64 instead of the lvl-10 56.32. */
const e1Weak = withPatchedOverride(SLUG, (ov) => {
  ov.skill2[0].effects[0].atkPct = 24.64;
});
/** E1 ×3 fold misread: the '3 enemy unit(s)' header counted as a hit MULTIPLIER on the
 *  single boss (168.96 per activation instead of one 56.32 instance). */
const e1TripleFold = withPatchedOverride(SLUG, (ov) => {
  ov.skill2[0].effects[0].atkPct = 56.32 * 3;
});
/** E1 reference: the rider removed entirely (her own skill-damage contribution). */
const e1Removed = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = [];
  if (before === 0) {
    throw new Error('ether skill2 rider missing — fixture is stale');
  }
});
/** E3 nearest-wrong: the S1 ally mitigation mis-encoded on the boss-facing damageTakenPct
 *  channel (+52.5 = boss takes MORE — a phantom team amp on S1's 15s cadence). */
const e3BossChannel = withPatchedOverride(SLUG, (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'interval', sec: 15 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 52.5, durationSec: 5 },
    ],
  });
});
/** E4 nearest-wrong: the S2b enemy DEF▼ mis-encoded as the boss-facing damageTakenPct debuff
 *  (+9.38 per Full Burst entry). */
const e4BossChannel = withPatchedOverride(SLUG, (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'fullBurstEnter' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 9.38, durationSec: 6 },
    ],
  });
});
/** E2 reference: the shield block removed entirely (inertia proof — a shield moves no damage
 *  in v1). */
const e2Removed = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = [];
  if (before === 0) {
    throw new Error('ether burst shield block missing — fixture is stale');
  }
});
/** E2 wrong trigger: fullBurstEnter (lands at every chain completion, including FBs led by
 *  another Burst I) instead of burstCast (HER cast only). */
const e2OnFbEnter = withPatchedOverride(SLUG, (ov) => {
  ov.burst[0].trigger = { kind: 'fullBurstEnter' };
});
/** E2 wrong scope: all allies instead of the 3 allies with the lowest remaining HP. */
const e2AllAllies = withPatchedOverride(SLUG, (ov) => {
  ov.burst[0].target = { kind: 'allies' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const baseA = runA();
const a1OnFbEnter = runA({ [SLUG]: e1OnFbEnter });
const a1OnBurstCast = runA({ [SLUG]: e1OnBurstCast });
const a1Weak = runA({ [SLUG]: e1Weak });
const a1Triple = runA({ [SLUG]: e1TripleFold });
const a1Removed = runA({ [SLUG]: e1Removed });
const a3BossChannel = runA({ [SLUG]: e3BossChannel });
const a4BossChannel = runA({ [SLUG]: e4BossChannel });
const a2Removed = runA({ [SLUG]: e2Removed });

const baseB = runProbe(SLUGS_B);
const bFbEnter = runProbe(SLUGS_B, { [SLUG]: e2OnFbEnter });

const baseC = runProbe(SLUGS_C);
const cAllAllies = runProbe(SLUGS_C, { [SLUG]: e2AllAllies });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const damages = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
const fbCount = (evs: SimEvent[]) => fbStartFrames(evs).length;
const etherCasts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === SLUG);
/** the S2a rider's damage instances. */
const rider = (evs: SimEvent[]) =>
  damages(evs).filter((d) => d.slug === SLUG && d.srcSlot === 'skill2');
/** buffs originating from ether (any holder, including the boss = targetIdx null). */
const etherBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === ETHER_A);
/** asuka's shield-gate passes = her FB-enter elemAdvantageDamagePct-30.02 buff applications
 *  (snow-crane's M3 reader). */
const shieldGatePasses = (evs: SimEvent[], asuka: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === asuka &&
      b.stat === 'elemAdvantageDamagePct' &&
      b.value === 30.02
  ).length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride(SLUG) as any;

describe('ether — kit spec', () => {
  describe('E0 — fixture sanity: the B1 chain actually runs', () => {
    it('ether is the sole B1 and casts every Full Burst (>= 3 casts / 180s)', () => {
      expect(etherCasts(baseA.events).length).toBeGreaterThanOrEqual(3);
      expect(etherCasts(baseA.events).length).toBe(fbCount(baseA.events));
    });
    it('her SG weapon deals damage', () => {
      expect(baseA.totals.ether).toBeGreaterThan(0);
    });
  });

  describe('E1 — S2a: 56.32% final ATK skill hit on the 13s auto-cast (interval)', () => {
    it('fires on the 13s interval frames (t = 13k), once per activation', () => {
      const hits = rider(baseA.events);
      expect(hits.length).toBe(S2_FIRES_180S); // 13 fires in 180s
      const frames = [...new Set(hits.map((h) => h.frame))];
      expect(frames.length).toBe(hits.length); // one instance per activation, NOT a ×3 fold
      expect(frames).toEqual(
        Array.from({ length: S2_FIRES_180S }, (_, i) => (i + 1) * S2_CD_SEC * FPS)
      );
    });
    it('the cadence is the datamined CD, decoupled from the FB count and her shot count', () => {
      expect(rider(baseA.events).length).not.toBe(fbCount(baseA.events));
      // interval (13) vs FB cycle (~40s sole-B1): strictly more rider fires than FBs.
      expect(rider(baseA.events).length).toBeGreaterThan(fbCount(baseA.events));
    });
    it('carries the lvl-10 magnitude in the skill bucket (not the lvl-1 24.64)', () => {
      const hits = rider(baseA.events);
      expect([...new Set(hits.map((h) => h.atkPct))]).toEqual([56.32]);
      expect([...new Set(hits.map((h) => h.bucket))]).toEqual(['skill']);
      expect(
        [...new Set(rider(a1Weak.events).map((h) => h.atkPct))],
        'the lvl-1 counterfactual must change the magnitude'
      ).toEqual([24.64]);
    });
    it('FB-major by landing timing: in-FB instances take the +50%, out-of-FB do not', () => {
      // The 13s interval lands both inside and outside the ~10s FB windows — both states
      // must exist (a fullBurstEnter keying would have ZERO out-of-FB instances).
      const hits = rider(baseA.events);
      const inFb = hits.filter((h) => h.inFullBurst);
      const outFb = hits.filter((h) => !h.inFullBurst);
      expect(inFb.length).toBeGreaterThan(0);
      expect(outFb.length).toBeGreaterThan(0);
      expect([...new Set(inFb.map((h) => h.fbMajorApplied))]).toEqual([true]);
      expect([...new Set(outFb.map((h) => h.fbMajorApplied))]).toEqual([false]);
    });
    it('DISCRIMINATING: fullBurstEnter keying fires only on FB-start frames (~4×, not 13×)', () => {
      const hits = rider(a1OnFbEnter.events);
      const starts = new Set(fbStartFrames(a1OnFbEnter.events));
      expect(hits.length).toBe(fbCount(a1OnFbEnter.events));
      expect(hits.length).not.toBe(S2_FIRES_180S);
      expect(hits.every((h) => starts.has(h.frame))).toBe(true);
    });
    it('DISCRIMINATING: burstCast keying lands on the cast frames, not the interval frames', () => {
      const castFrames = new Set(etherCasts(a1OnBurstCast.events).map((c) => c.frame));
      const hits = rider(a1OnBurstCast.events);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.length).not.toBe(S2_FIRES_180S);
      for (const h of hits) {
        expect(castFrames.has(h.frame)).toBe(true);
      }
    });
    it('DISCRIMINATING: the ×3 fold moves her total by exactly the extra 2×56.32 instances', () => {
      // Same instance COUNT as shipped (the fold is a per-instance magnitude misread here),
      // so the totals differ while the rotation stays byte-identical.
      expect(rider(a1Triple.events).length).toBe(rider(baseA.events).length);
      expect(a1Triple.totals.ether).toBeGreaterThan(baseA.totals.ether);
    });
    it('is load-bearing: removing the rider drops ether\'s own damage', () => {
      expect(a1Removed.totals.ether).toBeLessThan(baseA.totals.ether);
    });
  });

  describe('E2 — burst: shield (96% caster final Max HP, 5s) on the 3 lowest-HP allies, own cast', () => {
    it('shape pin: burstCast → alliesLowestHp count:3 → shield maxHpPct 96 / durationSec 5', () => {
      const blocks = shipped.burst;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].trigger).toEqual({ kind: 'burstCast' });
      expect(blocks[0].target).toEqual({ kind: 'alliesLowestHp', count: 3 });
      expect(blocks[0].effects).toEqual([
        { kind: 'shield', maxHpPct: 96, durationSec: 5 },
      ]);
    });
    it('is damage-INERT in v1: removal leaves EVERY unit byte-identical', () => {
      for (const s of SLUGS_A) {
        expect(a2Removed.totals[s], `${s} total with the shield removed`).toEqual(
          baseA.totals[s]
        );
      }
    });
    it('TRIGGER identity (fixture B): shields only the FBs ether cast INTO, not every FB', () => {
      const casts = etherCasts(baseB).length;
      const fbs = fbCount(baseB);
      // The double-B1 comp makes strictly more Full Bursts than ether casts (liter takes the rest).
      expect(casts).toBeGreaterThanOrEqual(2);
      expect(casts).toBeLessThan(fbs);
      // burstCast keying: asuka (slot 2, inside the leftmost-3 scope) is shielded exactly at
      // the FBs ether cast into — the 5s window from her stage-1 cast still covers FB entry.
      expect(shieldGatePasses(baseB, ASUKA_B)).toBe(casts);
      // fullBurstEnter keying shields EVERY chain completion — over-credit by exactly liter's rotations.
      expect(shieldGatePasses(bFbEnter, ASUKA_B)).toBe(fbs);
    });
    it('SCOPE (fixture C): count:3 leaves a slot-4 ally unshielded; all-allies would shield her', () => {
      expect(etherCasts(baseC).length).toBeGreaterThanOrEqual(2);
      expect(shieldGatePasses(baseC, ASUKA_C)).toBe(0);
      expect(shieldGatePasses(cAllAllies, ASUKA_C)).toBe(
        etherCasts(baseC).length
      );
    });
  });

  describe('E3 — S1 (1 lowest-HP ally: Damage Taken ▼52.5%/5s) is genuinely unmodeled', () => {
    it('ether originates ZERO buffs at baseline — no phantom boss channel', () => {
      expect(etherBuffs(baseA.events)).toHaveLength(0);
      // Boss-held debuffs carry casterIdx null (the enemy-branch applyBuff passes no caster —
      // sakura-suzuhara precedent), so the channel read is stat-keyed: no damageTakenPct anywhere.
      expect(
        buffs(baseA.events).filter((b) => b.stat === 'damageTakenPct')
      ).toHaveLength(0);
    });
    it('the omission is a choice: the boss-channel misread applies the debuff and lifts team totals', () => {
      const applied = buffs(a3BossChannel.events).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct' && b.value === 52.5
      );
      expect(applied.length).toBeGreaterThan(0);
      expect(sum(a3BossChannel.totals, SLUGS_A)).toBeGreaterThan(
        sum(baseA.totals, SLUGS_A)
      );
    });
  });

  describe('E4 — S2b (DEF ▼9.38%/6s on the same enemies) is genuinely unmodeled', () => {
    it('no boss debuff is applied at baseline (casterIdx is null on the enemy branch)', () => {
      expect(
        buffs(baseA.events).filter(
          (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
        )
      ).toHaveLength(0);
    });
    it('the omission is a choice: the damageTakenPct misread applies per FB entry and lifts team totals', () => {
      const applied = buffs(a4BossChannel.events).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct' && b.value === 9.38
      );
      expect(applied.length).toBeGreaterThan(0);
      expect(sum(a4BossChannel.totals, SLUGS_A)).toBeGreaterThan(
        sum(baseA.totals, SLUGS_A)
      );
    });
  });

  describe('E5 — static pins: unmodeled lines verbatim, no silent drops', () => {
    it('skill1 is entirely unmodeled (the only S1 line is ally mitigation)', () => {
      expect(shipped.skill1).toEqual([]);
      expect(shipped.unmodeled.skill1).toEqual([
        '■ Affects 1 allies with the lowest remaining HP. \nDamage Taken ▼ 52.5% for 5 sec.',
      ]);
    });
    it('the S2b DEF▼ line sits verbatim in unmodeled.skill2', () => {
      expect(shipped.unmodeled.skill2).toEqual([
        '■ Affects the same enemy unit(s). Activates during Full Burst.\nDEF ▼ 9.38% for 6 sec.',
      ]);
      expect(shipped.unmodeled.burst).toEqual([]);
    });
    it('the shipped skill2 trigger is the interval:13 auto-cast (not fullBurstEnter)', () => {
      expect(shipped.skill2).toHaveLength(1);
      expect(shipped.skill2[0].trigger).toEqual({ kind: 'interval', sec: 13 });
      expect(shipped.skill2[0].effects).toEqual([
        { kind: 'flatDamage', atkPct: 56.32 },
      ]);
    });
    it('no ignored blocks anywhere', () => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        for (const b of shipped[slot] ?? []) {
          for (const e of b.effects ?? []) {
            expect(e.kind).not.toBe('ignored');
          }
        }
      }
    });
  });
});

```

### 7b. src/skills/overrides/ether.json

```json
{
  "note": "ether (Ether) — SG / Defender / Electric / Burst I, cd 40s, ammo 9, hitsPerShot 10, reloadFrames 141, normalAttackMultiplier 214.3, burstGaugePerShot 2, Missilis, original_rare SR (released 2022-11-04; BASE unit — no variant shares her name, lint clean). Kit-autonomy gauntlet 2026-08-05: FROM-SCRATCH build (no prior override / kit-status row; simSupported was false) — test-first re-derivation pinned by scripts/tests/units/ether.test.ts (groups E0-E5, three fixtures: A main sole-B1 [ether, crown, ada, helm]; B double-B1 shield-TRIGGER probe [ether, liter, asuka, admi, ada]; C shield-SCOPE probe [ether, liter, admi, ada, asuka]). Cross-family S2b (claude-fable-5) independently re-derived the kit and converged on all four lines; the ONE disputed line — the S2a trigger identity — was re-litigated against the prose convention + the datamined CD and landed on interval:13 (the driver's initial fullBurstEnter derivation was the outlier — see TRIGGER IDENTITY below). TIER 2: scoped buff (the burst's '3 lowest remaining HP allies' → leftmost-3 v1 stand-in) + burstCast-vs-fullBurstEnter identity on the shield + the CD-bearing auto-cast rider. ETHER IS A TANK/SHIELDER; HER KIT IS MOSTLY OUT-OF-DOMAIN FOR A DAMAGE SIM. MODELED: (S2a) '■ Affects 3 enemy unit(s) with the highest final DEF. Deals 56.32% of final ATK as damage.' → interval:13 → enemy → flatDamage atkPct 56.32. TRIGGER IDENTITY: the damage block's ■ header carries NO activation clause and the datamined skillCooldownsSec.skill2 = 13 — the CD-bearing auto-cast skill shape, whose house encoding is interval:13 (the schema's own interval guidance: 'kit lines that just happen on an internal cooldown with no visible activation clause'; novel precedent — her CD-bearing auto-cast S1 ships as interval:10; neve/snow-white CD-bearing auto-cast line). Two structural facts settle it against a fullBurstEnter (whole-slot) reading: (1) PROSE CONVENTION — an activation clause attaches to the ■ block whose header carries it: ada's S2 writes 'Activates during Full Burst' at the HEAD of the block it governs (shipped fullBurstEnter) and kurumi's likewise (shipped hitCount+FB), while ether's FB clause sits in the SECOND block's header ('■ Affects the same enemy unit(s). Activates during Full Burst.'), governing the DEF▼ line alone. (2) THE DATAMINED CD — ada/kurumi, whose skill2 IS purely FB-keyed, have CD null; ether's 13s CD is meaningful ONLY on a CD-driven activation path (an FB cycle is >=20s, so no CD could ever gate a purely FB-entry skill). The driver's initial fullBurstEnter derivation was OVERTURNED by the convergent cross-family re-derivations (S2b claude-fable-5, S5/S6 claude-opus-5 all independently read interval) plus these two structural facts — the pivot is documented in the judge packet. The 13s period is DATAMINED (skillCooldownsSec), not invented; the first-fire phase (t=13 vs t=0) is the engine interval convention (⚑ — caveat 1). Nearest-wrong encodings pinned RED: fullBurstEnter keying (fires only on FB-start frames — loses every out-of-FB CD activation and renders the 13s CD meaningless), burstCast keying (lands on her cast frames), a ×3 hit-multiplier misread of the '3 enemy unit(s)' header (it is a multi-target SPREAD which collapses to the single scope-lock boss — novel precedent — NOT a multiplier), and the lvl-1 24.64 magnitude. Bare flatDamage rider defaults (crit-eligible, no core, skill bucket, FB-major by landing timing — the interval activations land BOTH in and out of the FB window and both states are pinned; nothing stated in prose). (BURST) '■ Affects 3 ally unit(s) with the lowest remaining HP. Creates a Shield equal to 96% of the the skill user's final Max HP for 5 sec.' → burstCast → alliesLowestHp count:3 → shield maxHpPct 96 / durationSec 5. TRIGGER IDENTITY: her OWN Burst I cast (burstCast, NOT fullBurstEnter — FB-entry keying would over-cover rotations opened by ANOTHER Burst I; pinned in fixture B via asuka's requiresShielded probe: gate-passes == ether's cast count, strictly less than the FB count). SCOPE: the kit's 'lowest remaining HP' is indeterminate in v1 (no HP pool; nobody takes damage) → the engine's documented leftmost-3 stand-in (alliesLowestHp; pinned in fixture C: a slot-4 asuka is unshielded at baseline, shielded by the all-allies counterfactual). No shield HP AMOUNT is modeled (v1 boss deals no damage): the encoded substance is the SHIELDED event + each target's shield-state window (fires teammates' 'shielded' triggers / requiresShielded gates — snow-crane precedent; never skip a shield line for isolation). maxHpPct = % of CASTER final Max HP (the schema's documented reading of 'the skill user's final Max HP'; a flip to the TARGET's own Max HP basis is the nearest-wrong). Damage-INERT in v1 (removal leaves totals byte-identical — pinned). UNMODELED (both VERBATIM in unmodeled, never an ignored drop): (S1) '■ Affects 1 allies with the lowest remaining HP. Damage Taken ▼ 52.5% for 5 sec.' (CD 15s) — ally-side received-damage mitigation; v1 models no ally HP pool and no incoming boss damage, so it can never move anything (sakura-suzuhara's S2 is the identical kit line and the binding precedent — ⚑1). The boss-facing damageTakenPct channel is the WRONG direction AND target — encoding it (±52.5) would manufacture a phantom team damage change on S1's 15s cadence, so it is NOT used; the nearest-wrong +52.5 amp is pinned RED (E3). (S2b) '■ Affects the same enemy unit(s). Activates during Full Burst. DEF ▼ 9.38% for 6 sec.' — the engine has no dynamic enemy-DEF-reduction primitive (applyBuff ignores enemy ATK▼/DEF▼; cfg.bossDef is a fixed per-hit subtraction; damageTakenPct is a separate bucket — novel / mast Sea-Breeze precedent — ⚑2). Magnitude ~0.03% team damage (9.38% of the 140-DEF scope-lock boss = 13.13 flat DEF off a ~50k effective-ATK term) — minor, not load-bearing. The nearest-wrong (a damageTakenPct +9.38 misread) is pinned RED (E4). Cadence: no ⚑ — the cadence-tuple flag was RETIRED by owner ruling 2026-07-25 (datamine tuple reliable); no charFixes. Burst gauge: her kit carries no gauge line (burstGaugePerShot 2 is the datamine; the class-modal fallback applies). Element: Electric vs the scope-lock Fire boss = neutral. SR fixture note: run on the plain scope-lock basis (copies:10 ⇒ 3★/core 7), the sakura-suzuhara precedent for SR gauntlet builds — her assertions are event-structural, not magnitude ratios. NO `ignored` blocks. Faithful>fit; measured>fudge; every modeled magnitude is verbatim lvl-10 kit text (DATAMINED). ⚑ LIST: [⚑1] (OUT-OF-DOMAIN, ally-side mitigation — TIER engine-core) S1 'Damage Taken ▼52.5% for 5s' on the 1 lowest-remaining-HP ally, 15s CD. estimate = a real survivability window (~52.5% less damage taken on the designated ally for 5s every 15s — high uptime in real fights where the lowest-HP ally is stable), but damage-NEUTRAL in this sim by construction (the boss deals no damage); zero damage impact at scope. recipe = an engine ally-HP-pool + incoming-boss-damage model + an ally received-damage-reduction stat (distinct from the boss-facing damageTakenPct channel), then encode on interval:15 to alliesLowestHp count:1. tier = out-of-domain (the whole incoming-damage subsystem the sim deliberately lacks — sakura-suzuhara / jackal precedent). [⚑2] (ENGINE GAP — minor, TIER 2) S2b 'DEF ▼9.38% for 6s' on the 3 highest-final-DEF enemies during Full Burst. estimate = 13.13 flat boss DEF off every hit inside the 6s FB-entry window ≈ ~0.03% team damage (subtractive DEF term vs ~50k effective ATK) — comps read COLD by exactly that, honestly. recipe = a boss-DEF-reduction debuff primitive feeding the subtractive DEF term (9.38% for 6s, refreshed at every FB entry) — enact together with novel's DEF ▼7.05% line (same mechanic family). tier = engine gap, minor. Kit-autonomy gauntlet 2026-08-05.",
  "unmodeled": {
    "skill1": [
      "■ Affects 1 allies with the lowest remaining HP. \nDamage Taken ▼ 52.5% for 5 sec."
    ],
    "skill2": [
      "■ Affects the same enemy unit(s). Activates during Full Burst.\nDEF ▼ 9.38% for 6 sec."
    ],
    "burst": []
  },
  "caveats": [
    "skill2: the damage block has NO activation clause and a datamined 13s skill cooldown → interval:13 auto-cast (novel/neve/snow-white precedent; the schema's interval guidance for clause-less CD-bearing lines). 'Activates during Full Burst' sits in the SECOND ■ block's header and governs that block alone (the DEF▼ line, unmodeled below) — the house prose convention attaches an activation clause to the block whose header carries it (ada/kurumi both head their FB-keyed blocks with it). A purely FB-keyed reading also cannot explain the 13s CD: ada/kurumi's purely FB-keyed skill2s have CD null, and an FB cycle is >=20s, so no CD could gate them. ⚑ first-fire phase t=13 (vs t=0) is the engine interval CONVENTION (neve/snow-white/novel precedent) — pin from footage if a consumer's cadence is ever popup-read.",
    "skill2: the '3 enemy unit(s) with the highest final DEF' targeting collapses to the single scope-lock boss — v1 fields one immortal enemy ({kind:'enemy'} documented stand-in; novel precedent). It is a multi-target SPREAD, NOT a ×3 hit multiplier.",
    "skill2: the DEF ▼9.38%/6s enemy debuff is UNMODELED — no dynamic enemy-DEF-reduction primitive (cfg.bossDef is fixed; damageTakenPct is a different bucket; novel / mast Sea-Breeze precedent). At the 140-DEF scope-lock boss this is 13.13 flat DEF ≈ ~0.03% team damage — minor, not load-bearing (⚑2). Recipe if a primitive lands: a boss-DEF-reduction debuff (9.38% for 6s, refreshed at every FB entry) feeding the subtractive DEF term.",
    "skill1: 'Damage Taken ▼52.5% for 5s' on the 1 lowest-remaining-HP ally is UNMODELED — v1 models no ally HP pool and no incoming boss damage, so ally-side mitigation can never move anything (sakura-suzuhara S2 precedent). The boss-facing damageTakenPct channel is deliberately NOT used — wrong direction AND wrong target; encoding it would manufacture a phantom team damage change on the 15s skill cadence (⚑1).",
    "burst: the shield carries no modeled HP AMOUNT (v1 boss deals no damage) — the encoded substance is the SHIELDED event + the 5s shield-state window on the leftmost-3 targets (fires teammates' 'shielded' triggers / requiresShielded gates; snow-crane precedent). The 'lowest remaining HP' targeting resolves to the leftmost-3 documented stand-in (no HP pool in v1); shield amounts and true lowest-HP selection are measurement-gated on an HP-pool model.",
    "Ether's modeled kit is one skill-damage rider + one shield-event channel; her sim output is dominated by her bare SG weapon. Her real tank value (S1 mitigation + S2b DEF shred) lives in the two documented engine gaps (⚑1/⚑2)."
  ],
  "skill1": [],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "interval",
        "sec": 13
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 56.32
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
        "kind": "alliesLowestHp",
        "count": 3
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 96,
          "durationSec": 5
        }
      ]
    }
  ]
}

```



## 8. THE ONE LITIGATED LINE — S2a trigger identity (rule on it explicitly)

The kit: block 1 '■ Affects 3 enemy unit(s) with the highest final DEF. Deals 56.32% of final ATK as
damage.' — NO activation clause. Block 2 '■ Affects the same enemy unit(s). Activates during Full
Burst. DEF ▼ 9.38% for 6 sec.' Datamined skillCooldownsSec.skill2 = 13.

FINAL DRIVER ENCODING: interval:13 (CD-bearing auto-cast). History: the driver initially derived
fullBurstEnter (whole-slot FB reading), then OVERTURNED its own derivation because:
 (a) HOUSE PROSE CONVENTION: an activation clause attaches to the ■ block whose header carries it —
     ada's S2 heads its FB-keyed block with 'Activates during Full Burst' (shipped fullBurstEnter),
     kurumi's likewise; ether's FB clause sits in block 2's header, governing the DEF▼ line alone.
 (b) THE DATAMINED CD: ada/kurumi, whose skill2s ARE purely FB-keyed, have CD null. An FB cycle is
     >=20s, so ether's 13s CD is meaningful ONLY on a CD-driven activation path.
 (c) CONVERGENCE: S2b (claude-fable-5), S5 and S6 (claude-opus-5) — three independent blind
     derivations — ALL read interval/CD-auto-cast from the prose alone.
The nearest-wrong fullBurstEnter encoding is pinned RED in the driver test (fires ~4× on FB-start
frames only; loses every out-of-FB CD activation; renders the 13s CD meaningless).
RULE whether the interval:13 encoding is faithful (or name the defect).

Also rule on the S6-vs-driver S2b split: encode-as-defPct(-9.38) (blind S6) vs verbatim-unmodeled+⚑
(driver; the engine has no enemy-DEF-reduction primitive and defPct is inert/self-DEF — S5 refused
the encoding as a fudge).



## 9. RETURN — your binding verdict

Return ONLY the JSON your contract specifies (verdict / faithfulnessScore / lines / gotchas /
discriminationOk / flags …). verdict GO requires: every kit line accounted for (modeled or verbatim
unmodeled with ⚑ estimate+recipe+tier), no REAL-GOTCHA, the S5 blind tests green vs the driver
override (they are: 17 passed / 3 author-skips / 0 failed), and discrimination adequate.
Put `verdict` and `faithfulnessScore` as TOP-LEVEL keys.
