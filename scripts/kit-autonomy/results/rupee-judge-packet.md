# RECONCILING JUDGE — kit-autonomy gauntlet S7 (BINDING VERDICT)

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

# MECHANICS SSOT (formula + engine conventions)

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
  if ally grants fed it).

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


---

# GROUND TRUTH — rupee kit prose + datamine (data/characters.json extract)

{
  "slug": "rupee",
  "name": "Rupee",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/po-73/gg-62/ece355dbbfccbf08c001ccee1b5d7258.png",
  "weapon": "AR",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Attacker",
  "element": "Iron",
  "manufacturer": "Tetra",
  "normalAttackMultiplier": 13.65,
  "coreAttackMultiplier": 200,
  "ammo": 60,
  "reloadFrames": 81,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 7.6,
  "releaseDate": "2022-11-04",
  "burstGaugePerShot": 0.2,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates after landing 100 normal attack(s). Affects all Iron Code allies.\nIncreases stack count of buffs by 1.\nCritical Rate ▲ 2.24% for 10 sec.",
    "skill2": "■ Activates after 30 attacks. Affects self.\nMileage: ATK ▲ 13.8%. Stacks up to 5 times and lasts for 15 sec.",
    "burst": "■ Affects enemies within range.\nDeals 274.28% of final ATK as damage.\n■ Activates when Mileage is at max stacks. Affects all allies.\nATK ▲ 19.8% for 5 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "role": {
    "weapon": {
      "shot_id": 1020001,
      "shot_detail": {
        "id": 1020001,
        "damage": 1365,
        "max_ammo": 60,
        "shake_id": 1,
        "ShakeType": "Fire_AR",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Energy",
        "camera_work": "camera_work_02",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 100,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "AR",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 720,
        "name_localkey": "Assault Rifle",
        "prefer_target": "TargetAR",
        "reload_bullet": 10000,
        "counter_enermy": "Energy_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 720,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 59,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 2000,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 0,
        "spot_explosion_range": 0,
        "use_function_id_list": [
          0
        ],
        "accuracy_change_speed": 0,
        "hurt_function_id_list": [
          0
        ],
        "spot_projectile_speed": 0,
        "accuracy_change_pershot": 0,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 0,
        "full_charge_burst_energy": 0,
        "end_accuracy_circle_scale": 75,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 75,
        "target_burst_energy_pershot": 4000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 75,
        "auto_start_accuracy_circle_scale": 75
      },
      "bonusrange_max": 45,
      "bonusrange_min": 25
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step2",
      "burst_apply_delay": 1,
      "change_burst_step": "Step3"
    },
    "skillDetails": {
      "skill1_id": 2200101,
      "skill2_id": 2200201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2200101,
        "icon": "icn_skill_statcritical_01",
        "group_id": 22001,
        "skill_level": 1,
        "name_localkey": "Prize",
        "next_level_id": 2200102,
        "level_up_cost_id": 50102,
        "description_localkey": "■ Activates after landing {description_value_01} normal attack(s). Affects all Iron Code allies.\n<color=#00AEFF>Increases <word_group=10001>stack count of buffs</word_group> by {description_value_02}.\nCritical Rate ▲ {description_value_03}% for {description_value_04} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100",
              "100"
            ]
          },
          {
            "description_value": [
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1"
            ]
          },
          {
            "description_value": [
              "1.23",
              "1.34",
              "1.45",
              "1.56",
              "1.68",
              "1.79",
              "1.9",
              "2.01",
              "2.13",
              "2.24"
            ]
          },
          {
            "description_value": [
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10",
              "10"
            ]
          },
          {},
          {},
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2200201,
        "icon": "icn_skill_atkup_01",
        "group_id": 22002,
        "skill_level": 1,
        "name_localkey": "Mileage",
        "next_level_id": 2200202,
        "level_up_cost_id": 50202,
        "description_localkey": "■ Activates after {description_value_01} attacks. Affects self.\n<color=#00AEFF>Mileage: ATK ▲ {description_value_02}%. Stacks up to {description_value_03} times and lasts for {description_value_04} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "30",
              "30",
              "30",
              "30",
              "30",
              "30",
              "30",
              "30",
              "30",
              "30"
            ]
          },
          {
            "description_value": [
              "7.59",
              "8.28",
              "8.97",
              "9.66",
              "10.35",
              "11.04",
              "11.73",
              "12.42",
              "13.11",
              "13.8"
            ]
          },
          {
            "description_value": [
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5"
            ]
          },
          {
            "description_value": [
              "15",
              "15",
              "15",
              "15",
              "15",
              "15",
              "15",
              "15",
              "15",
              "15"
            ]
          },
          {},
          {},
          {},
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1200301,
      "ulti_skill_detail": {
        "id": 1200301,
        "icon": "icn_skill_c200_ult",
        "group_id": 12003,
        "shake_id": 1,
        "skill_type": "InstantArea",
        "attack_type": "Iron",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Single Payment",
        "next_level_id": 1200302,
        "prefer_target": "HighAttack",
        "resource_name": "c200_ulti",
        "duration_value": 0,
        "skill_cooltime": 2000,
        "level_up_cost_id": 50302,
        "skill_value_data": [
          {
            "skill_value": 15085,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 0,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 700,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 10000,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
            "skill_value_type": "Integer"
          }
        ],
        "skill_cooltime_list": [
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000,
          2000
        ],
        "description_localkey": "■ Affects <word_group=10020>enemies within range</word_group>.\nDeals <color=#00AEFF>{description_value_01}% of <word_group=10025>final</word_group> ATK as damage.</color>\n■ Activates when Mileage is at max stacks. Affects all allies.\n<color=#00AEFF>ATK ▲ {description_value_02}% for {description_value_03} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "150.85",
              "164.57",
              "178.28",
              "192",
              "205.71",
              "219.42",
              "233.14",
              "246.85",
              "260.57",
              "274.28"
            ]
          },
          {
            "description_value": [
              "10.89",
              "11.88",
              "12.87",
              "13.86",
              "14.85",
              "15.84",
              "16.83",
              "17.82",
              "18.81",
              "19.8"
            ]
          },
          {
            "description_value": [
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5",
              "5"
            ]
          },
          {},
          {},
          {},
          {},
          {},
          {},
          {},
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          120030101
        ],
        "after_hurt_function_id_list": [
          0
        ],
        "before_use_function_id_list": [
          0
        ],
        "before_hurt_function_id_list": [
          0
        ]
      }
    },
    "statScaling": {
      "grow_grade": 320002,
      "grade_core_id": 1,
      "stat_enhance_id": 5101,
      "stat_enhance_detail": {
        "id": 5101,
        "core_hp": 200,
        "grade_hp": 3000,
        "core_attack": 200,
        "grade_ratio": 200,
        "core_defence": 200,
        "grade_attack": 20,
        "grade_defence": 100,
        "core_bio_resist": 0,
        "grade_bio_resist": 0,
        "core_metal_resist": 0,
        "core_energy_resist": 0,
        "grade_metal_resist": 0,
        "grade_energy_resist": 0
      }
    },
    "element": {
      "element_id": [
        500001
      ],
      "element_details": [
        {
          "id": 500001,
          "element": "Iron",
          "group_id": 5000005,
          "element_icon": "icn_element_iron",
          "weak_element_id": 300001,
          "element_desc_localekey": "Injects Code: D.M.T.R. to all electric-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Iron",
          "element_code_name_localekey": "Code: D.M.T.R."
        }
      ]
    },
    "piece": {
      "piece_id": 5100200,
      "piece_detail": {
        "id": 5100200,
        "class": "Attacker",
        "order": 20000,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "TETRA",
        "resource_id": 200,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Rupee's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 320001,
      "class": "Attacker",
      "order": 10097,
      "name_code": 5034,
      "corporation": "TETRA",
      "resource_id": 200,
      "name_localkey": "Rupee",
      "original_rare": "SSR",
      "critical_ratio": 1500,
      "category_type_1": "None",
      "category_type_2": "None",
      "category_type_3": "None",
      "critical_damage": 15000,
      "eff_category_type": "Walk",
      "eff_category_value": 0
    }
  },
  "generatorSupported": false,
  "simSupported": false,
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 90,
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
    "resourceId": 200
  }
}

---

# S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, cross-family)

{
  "slug": "rupee",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ after landing 100 normal attack(s)",
      "disposition": "GAP",
      "scope": "Buff-stack manipulation: adds +1 stack to stackable buffs held by Iron Code allies (including self — self is Iron, so it accelerates her own Mileage ramp; on teammates it boosts whatever stackable buffs they hold).",
      "durationSemantics": "Instant stack increment on proc; no duration of its own — inherits the boosted buff's remaining duration.",
      "triggerIdentity": "hitCount count:100 (counts ROUNDS; AR hitsPerShot 1, so 100 trigger pulls). 'after landing 100 normal attack(s)' = recurring every 100, not once. NOT interval, NOT shotFired.",
      "targetSet": "alliesOfElement Iron, including self ('all Iron Code allies' — no except-self clause).",
      "nearestWrongModel": "Dropping the line silently as 'unmodelable', OR encoding it as a generic buff to all allies regardless of element, OR treating it as once-per-battle. The self-relevant slice (extra Mileage stack per 100 rounds) is expressible by re-applying the same-keyed Mileage buff from a hitCount:100 self block; the cross-unit generic 'increment any stackable buff' has no engine primitive.",
      "distinguishingAssertion": "If the self-slice is modeled: buffApply events for the Mileage key show a stacks increment occurring at the ~100-round boundary in addition to the every-30 cadence (stack count reaches maxStacks ~1 proc earlier than the 30-attack cadence alone predicts). If declared GAP: the line MUST appear verbatim in unmodeled.skill1 and totals must be identical with/without any placeholder encoding.",
      "inertness": "Must not be encoded as a flat stat buff (no critRatePct/atkPct buffApply from this line); must not fire on non-Iron allies in a mixed comp.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Critical Rate ▲ 2.24% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "GENERIC Critical Rate (critRatePct) — the prose says plain 'Critical Rate', with NO 'of normal attacks' qualifier, so critRateNormalPct would be an over-narrowing misread here (inverse of the usual trap).",
      "durationSemantics": "durationSec 10 — wall-clock seconds, stated literally. Not rounds, not stacks.",
      "triggerIdentity": "Same hitCount count:100 block as the header (■ trigger governs both following sentences). Recurring every 100 landed rounds. At AR cadence (~12 rounds/s effective, 60-round magazine, 81-frame reload) 100 rounds ≈ 8.3s firing + one reload gap ≈ 9.7s per cycle, so the 10s buff is near-permanent with brief possible lapses — the test should tolerate high-but-not-100% uptime, not assert passive.",
      "targetSet": "alliesOfElement Iron including self. In the controlComp fixture, check which allies are Iron and assert buffApply targetSlug covers exactly those and no others.",
      "nearestWrongModel": "Target 'allies' (all five regardless of element) — over-credits non-Iron teammates' crit; OR trigger read as fullBurstEnter/interval; OR scoped critRateNormalPct (under-credits skill/burst crit).",
      "distinguishingAssertion": "buffApply events with stat critRatePct value 2.24 appear (i) only on Iron-element units in the comp — a non-Iron ally must receive ZERO such applies — and (ii) at a landed-round-count cadence (~every 100 rounds fired by rupee), not at FB entry and not at t=0.",
      "inertness": "A non-Iron teammate's crit rate must not move; the buff must lapse if rupee stops firing >10s past a proc (e.g. during a stun window) rather than persist as passive.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ Activates after 30 attacks. Affects self",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK on self (atkPct — plain 'ATK ▲', scales her own ATK; NOT casterAtkPct flat-add, NOT charge/normal-scoped).",
      "durationSemantics": "STACKING buff: maxStacks 5, each proc adds 1 stack and refreshes a 15-second wall-clock duration ('lasts for 15 sec'). Cap value 5 × 13.8% = 69% ATK. Critically NOT instant-at-max: stacks accrue one per 30 rounds (~2.9s of firing each incl. amortized reload), reaching cap around ~13–15s, then held permanently because the 30-round cadence (≈3s) is far inside the 15s window.",
      "triggerIdentity": "hitCount count:30 (rounds fired by rupee; AR hitsPerShot 1). Recurring — every 30 attacks adds/refreshes. Not interval, not lastBullet.",
      "targetSet": "self only. No teammate may receive Mileage.",
      "nearestWrongModel": "Authoring it as a passive self-buff at the full 69% from t=0 (skips the ~15s ramp and over-credits the opening — exactly the stack-ramp trap the taxonomy names), OR maxStacks omitted so procs refresh at 13.8% flat, OR each stack expiring independently instead of the whole buff refreshing.",
      "distinguishingAssertion": "The sequence of buffApply events for the Mileage key on rupee shows stacks climbing 1→2→3→4→5 across the opening ~15s of the fight (first apply at ~30 rounds, NOT at frame 0), then holding at stacks=5 with refresh=true thereafter. A passive-at-max encoding emits stacks=5 (or a single 69% value) at t=0 — RED.",
      "inertness": "No buffApply for this key on any other slot; no contribution before her 30th round fires.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 274.28% of final ATK as damage",
      "disposition": "FAITHFUL",
      "scope": "Instant burst-cast hit on the enemy: flatDamage atkPct 274.28, landing in the burst bucket.",
      "durationSemantics": "Instant, one hit per burst cast. Not a DoT, no duration.",
      "triggerIdentity": "burstCast (rupee's OWN burst, 20s CD, Burst II) — fires ONLY on rotations rupee herself casts. Burst-cast damage lands BEFORE the Full Burst window opens, so it is FB-exempt (no +50% major) and takes no FB-entry auras.",
      "targetSet": "enemy.",
      "nearestWrongModel": "Letting the hit take the +50% Full Burst major (fbMajorApplied true) — burst-cast/instant damage is always FB-exempt because the cast lands pre-window; secondarily, keying it to fullBurstEnter so it fires on rotations rupee did not burst.",
      "distinguishingAssertion": "Every damage event with srcSlot 'burst' from rupee has fbMajorApplied === false (and occurs at her burstCast frames only). Count of such events === count of rupee burstCast events, NOT count of fullBurstStart events.",
      "inertness": "Zero burst-bucket damage from rupee on rotations where another Burst II (e.g. crown in the control fixture) takes the stage-2 slot instead of her.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ Activates when Mileage is at max stacks",
      "disposition": "FIX",
      "scope": "Generic ATK (atkPct 19.8) — plain 'ATK ▲', scales each recipient's own ATK.",
      "durationSemantics": "durationSec 5 — short wall-clock window; expires mid-Full-Burst (FB window ≈10s), so it must NOT be modeled as lasting the whole FB.",
      "triggerIdentity": "burstCast GATED on Mileage at max stacks (5) at cast time. This is a conditional rider inside her OWN burst block — 'Activates when Mileage is at max stacks' composes with the burst cast, it is not a standalone passive that fires whenever stacks hit 5, and it is NOT fullBurstEnter. The gate reads the PRE-cast stack state: her first burst (~t=20s at CD 20) should already have 5 stacks if she fired continuously (cap ~15s), but a test variant that suppresses her ramp (e.g. patch skill2 out) must show the rider NOT firing while the 274.28% hit still lands. Encoding likely needs Mileage mirrored as a resource pool (resourceGate {name, min:5}) or an equivalent stack-state gate — a plain ungated burst block is the FIX target.",
      "targetSet": "all allies — team-wide including self ('all allies', no except-self clause).",
      "nearestWrongModel": "Two near-misses: (a) UNGATED — the 19.8% applies on every rupee burst regardless of Mileage state (over-credits any scenario where stacks are below cap at cast, and makes the gate untestable); (b) keyed to fullBurstEnter — fires on ANY team Full Burst including rotations rupee never burst, the classic burst-cast vs FB-enter over-credit whenever another Burst II is present (the control fixture HAS one: crown).",
      "distinguishingAssertion": "buffApply stat atkPct value 19.8 with casterIdx === rupee's index appears (i) only at rupee's burstCast frames, never at fullBurstStart frames of rotations she sat out, and (ii) NOT when her Mileage stack state is below 5 at cast (assert via a withPatchedOverride variant that removes/weakens skill2 so stacks can't cap → zero 19.8 applies, while the 274.28% burst damage event still occurs). All five units receive it when it does fire.",
      "inertness": "Must not fire on crown's stage-2 casts; must contribute nothing in the skill2-suppressed variant; must lapse after 5s (expiresFrame ≈ cast+300f), not persist through the FB window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Critical Rate ▲ 2.24% for 10 sec (Iron allies, every 100 rounds)",
    "skill2:Mileage ATK ▲ 13.8% ×5 stacks, 15 sec, every 30 rounds",
    "burst:274.28% final ATK instant hit (FB-exempt)",
    "burst:ATK ▲ 19.8% 5 sec, all allies, Mileage-max-gated"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Increases stack count of buffs by 1."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "FIXTURE TRAP FIRST: rupee is Burst II, but controlComp(carry) seats the carry in the B3 slot beside crown (B2) and helm (B3). She can never legally burst from a B3 slot expectation — the tests MUST confirm she actually emits burstCast events in whatever fixture is used (first-ready in-window selection between her and crown at stage 2), or build a comp where she is the sole B2; otherwise every burst-slot assertion (the 274.28% hit AND the Mileage-gated 19.8%) vacuously passes or silently never exercises. EXPECTED SHARED-PRIOR MISREADS to reconcile: (1) the burst rider keyed to fullBurstEnter instead of Mileage-gated burstCast — diverges on every rotation crown takes stage 2, an over-credit the control fixture will actively exercise; (2) Mileage authored passive-at-max (69% from t=0) skipping the ~15s ramp; (3) skill1's crit target widened from Iron-only to all allies (check the fixture's element mix — if all four teammates happen to be Iron the distinction is untestable there and needs a mixed-element variant); (4) skill1's stack-count line silently dropped without an unmodeled entry — it is a GAP (no generic cross-unit stack-increment primitive) but its self-slice marginally accelerates her own Mileage ramp (~1 proc earlier to cap), worth a note either way; (5) generic critRatePct vs critRateNormalPct — HERE the prose is unscoped, so the scoped encoding would be the error. Cadence context for assertions: AR, 60-round magazine, 81-frame reload, hitsPerShot 1 — hitCount thresholds 30 and 100 count rounds, and the 100-round cycle (~9.7s incl. reload) sits just inside the 10s crit duration, so assert high cyclic uptime, not permanence. All magnitudes (2.24, 13.8, ×5, 19.8, 274.28, durations) are literal kit text = DATAMINED; the only ⚑ is the fire-cadence tuple itself if restated.",
  "model": "claude-fable-5"
}


---

# S5 BLIND TEST (claude-opus-5)

GREEN/RED vs the DRIVER override: the blind test as written targets an imagined harness API and a fixture (controlComp with a same-CD competing B2, crown) on which rupee casts ZERO bursts — measured, not assumed. The driver mechanically ADAPTED the plumbing (onEvent into cfg, slot arrays, srcSlot names) and swapped in the sole-B2 fixture (liter/rupee/helm, boss Fire); every assertion and counterfactual is preserved verbatim. ADAPTED RESULT vs driver override: 20 PASSED, 1 SKIPPED (the documented GAP line), 0 FAILED.

## Original blind test source (as returned by the model)

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
 * rupee — AR/Iron/Attacker/Burst II. Blind kit spec (written from kit prose alone).
 *
 * KIT (structural read):
 *   skill1 — "Activates after landing 100 normal attack(s)." / "Affects all Iron Code allies."
 *            (a) "Increases stack count of buffs by 1"  -> no engine primitive (GAP, it.skip)
 *            (b) Critical Rate 2.24% for 10 sec         -> critRatePct, durationSec 10
 *   skill2 — "Activates after 30 attacks." / "Affects self."
 *            Mileage: ATK 13.8%, stacks to 5, lasts 15 sec -> atkPct, maxStacks 5, durationSec 15
 *   burst  — "Affects enemies within range." 274.28% of final ATK as damage -> burstCast flatDamage
 *          — "Activates when Mileage is at max stacks." / "Affects all allies."
 *            ATK 19.8% for 5 sec -> allies atkPct, GATED on Mileage == 5 stacks
 *
 * FIXTURE: controlComp('rupee', true) — rupee is Burst II, so the fixture's B1/B3 slots
 * complete the chain and bursts actually cast. Deterministic (no seed).
 *
 * WHY EACH ASSERTION DISCRIMINATES: each group pins the ONE reading the prose supports and
 * fails under the nearest-wrong model built with withPatchedOverride (wrong trigger threshold,
 * wrong target set, wrong duration semantics, wrong scope, missing gate).
 */

const base = controlComp('rupee', true);

function run(opts = base) {
  const events: SimEvent[] = [];
  const res = runComp({ ...opts, onEvent: (ev: SimEvent) => events.push(ev) });
  return { res, events };
}

// ---- hoisted runs (each is a full 180s sim) ----
const baseline = run();

const buffApplies = baseline.events.filter((e) => e.kind === 'buffApply') as Extract<
  SimEvent,
  { kind: 'buffApply' }
>[];
const damages = baseline.events.filter((e) => e.kind === 'damage') as Extract<
  SimEvent,
  { kind: 'damage' }
>[];
const rupeeIdx = base.units.findIndex((u) => u.slug === 'rupee');

const critApplies = buffApplies.filter(
  (e) => e.stat === 'critRatePct' && Math.abs(e.value - 2.24) < 1e-6,
);
const mileageApplies = buffApplies.filter(
  (e) => e.stat === 'atkPct' && Math.abs(e.value - 13.8) < 1e-6,
);
const burstAtkApplies = buffApplies.filter(
  (e) => e.stat === 'atkPct' && Math.abs(e.value - 19.8) < 1e-6,
);

describe('rupee — skill1: Critical Rate 2.24% / 10 sec to all Iron Code allies, per 100 normal attacks', () => {
  it('fires at all (non-vacuity: the 100-hit threshold is reached in a 180s fight)', () => {
    expect(critApplies.length).toBeGreaterThan(0);
  });

  it('is scoped to IRON allies only — never lands on a non-Iron ally', () => {
    // Discriminates target set. Nearest-wrong: target {kind:'allies'} (whole team).
    // The control comp is deliberately mixed-element, so a whole-team model paints
    // non-Iron slugs that the faithful alliesOfElement:'Iron' model never touches.
    const ironSlugs = new Set(
      base.units.filter((u) => u.element === 'Iron').map((u) => u.slug),
    );
    const painted = new Set(critApplies.map((e) => e.targetSlug));
    expect(painted.size).toBeGreaterThan(0);
    for (const slug of painted) {
      expect(ironSlugs.has(slug)).toBe(true);
    }
  });

  it('is UNSCOPED crit (critRatePct), not normal-attack-scoped critRateNormalPct', () => {
    // The prose says plain "Critical Rate", with no "of normal attacks" qualifier.
    // Nearest-wrong: critRateNormalPct (would under-credit skill/burst crit).
    expect(critApplies.length).toBeGreaterThan(0);
    const wrongScope = buffApplies.filter((e) => e.stat === 'critRateNormalPct');
    expect(wrongScope.length).toBe(0);
  });

  it('carries a 10-second window (expiresFrame ~= applyFrame + 600 @60fps)', () => {
    // Discriminates duration semantics: seconds, not rounds (no durationShots) and
    // not permanent. Nearest-wrong: durationShots / no duration.
    for (const e of critApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('trigger is a 100-HIT count, not 30 and not 100 trigger-pulls-by-another-name', () => {
    // Nearest-wrong: hitCount 30 (skill2's threshold accidentally reused) fires ~3.3x more often.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.skill1!.blocks) {
        if (b.trigger.kind === 'hitCount') b.trigger.count = 30;
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const wrongCrit = (
      wrong.events.filter((e) => e.kind === 'buffApply') as Extract<
        SimEvent,
        { kind: 'buffApply' }
      >[]
    ).filter((e) => e.stat === 'critRatePct' && Math.abs(e.value - 2.24) < 1e-6);
    expect(wrongCrit.length).toBeGreaterThan(critApplies.length);
  });

  it.skip('"Increases stack count of buffs by 1" — GAP: no engine primitive for a cross-buff stack-count bump', () => {
    // There is no EffectDef that raises another buff\'s maxStacks/current stacks.
    // Unmodelable today; must be recorded in the override\'s `unmodeled.skill1`.
  });
});

describe('rupee — skill2: Mileage ATK 13.8%, up to 5 stacks, 15 sec, self only', () => {
  it('applies to SELF only (never a teammate)', () => {
    // Discriminates target set. Nearest-wrong: {kind:'allies'}.
    expect(mileageApplies.length).toBeGreaterThan(0);
    for (const e of mileageApplies) {
      expect(e.targetSlug).toBe('rupee');
      expect(e.targetIdx).toBe(rupeeIdx);
    }
  });

  it('declares maxStacks 5 and actually reaches the cap (non-vacuity both sides)', () => {
    // Nearest-wrong: uncapped stacking (would exceed 5) or maxStacks 1 (never ramps).
    for (const e of mileageApplies) expect(e.maxStacks).toBe(5);
    const observed = mileageApplies.map((e) => e.stacks ?? 1);
    expect(Math.max(...observed)).toBe(5); // active case: cap reached
    expect(Math.min(...observed)).toBeLessThan(5); // inactive case: ramp exists
  });

  it('the stack cap is load-bearing: raising it above 5 increases rupee damage', () => {
    // Proves the assertion above is not decorative — a 10-stack model out-damages the
    // faithful 5-stack model, so the cap is a real constraint on the fixture.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.skill2!.blocks) {
        for (const eff of b.effects) {
          if (eff.kind === 'buff' && eff.stat === 'atkPct') eff.maxStacks = 10;
        }
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    expect(totals(wrong.res)['rupee']).toBeGreaterThan(totals(baseline.res)['rupee']);
  });

  it('is time-bounded at 15 sec, not round-bounded and not permanent', () => {
    // Discriminates duration semantics. Nearest-wrong: durationShots ("for N rounds").
    for (const e of mileageApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('fires on a 30-ATTACK counter — more often than skill1\'s 100-hit counter', () => {
    // Discriminates trigger identity/threshold: 30 < 100, so within one run the Mileage
    // applications must outnumber the crit applications. Nearest-wrong: both keyed to 100.
    expect(mileageApplies.length).toBeGreaterThan(critApplies.length);
  });

  it('moves ONLY rupee — teammates are byte-identical when Mileage is removed (inertness)', () => {
    const patched = withPatchedOverride('rupee', (ov) => {
      ov.skill2!.blocks = [];
    });
    const noMileage = run({ ...base, overrides: { rupee: patched } });
    const a = totals(baseline.res);
    const b = totals(noMileage.res);
    expect(b['rupee']).toBeLessThan(a['rupee']); // self-buff is live
    for (const slug of Object.keys(a)) {
      if (slug === 'rupee') continue;
      // NOTE: allowed to move ONLY via the burst gate (see burst group); with the burst
      // ATK buff present, removing Mileage can close its gate — so compare with the
      // burst-gate group, not here. Teammates must not move from the self-buff itself.
      expect(b[slug]).toBeLessThanOrEqual(a[slug] + 1e-6);
    }
  });
});

describe('rupee — burst: 274.28% of final ATK to enemies within range', () => {
  it('lands burst-bucket damage on rupee\'s own burst cast', () => {
    const burstHits = damages.filter(
      (d) => d.bucket === 'burst' && d.srcSlot === rupeeIdx,
    );
    expect(burstHits.length).toBeGreaterThan(0);
  });

  it('the 274.28% figure is load-bearing (halving it lowers rupee\'s burst damage)', () => {
    // Nearest-wrong: a mis-transcribed multiplier. Proves the number reaches the engine.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst!.blocks) {
        for (const eff of b.effects) {
          if (eff.kind === 'flatDamage') eff.atkPct = eff.atkPct / 2;
        }
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    expect(totals(wrong.res)['rupee']).toBeLessThan(totals(baseline.res)['rupee']);
  });

  it('burst-cast damage is FULL-BURST EXEMPT (a burst cast lands before the FB window opens)', () => {
    // Taxonomy item 9: burst-cast/instant damage never takes the +50% FB major.
    const burstHits = damages.filter(
      (d) => d.bucket === 'burst' && d.srcSlot === rupeeIdx,
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const d of burstHits) {
      expect(d.fbMajorApplied).toBeFalsy();
    }
  });
});

describe('rupee — burst rider: ATK 19.8% / 5 sec to ALL allies, GATED on Mileage at max stacks', () => {
  it('reaches all allies including self when it fires (non-vacuity, active case)', () => {
    // "Affects all allies" — no excludeSelf. Nearest-wrong: allies excludeSelf / self-only.
    expect(burstAtkApplies.length).toBeGreaterThan(0);
    const painted = new Set(burstAtkApplies.map((e) => e.targetSlug));
    expect(painted.has('rupee')).toBe(true);
    expect(painted.size).toBe(base.units.length);
  });

  it('carries a 5-second window, distinct from skill1\'s 10-sec crit window', () => {
    for (const e of burstAtkApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('is GATED on Mileage at max stacks — it does NOT fire on every burst cast', () => {
    // THE discriminating assertion for this line. Nearest-wrong: an ungated burstCast
    // rider (fires on every one of rupee\'s casts, over-crediting the whole team).
    // Removing the gate must strictly increase the number of applications; if the counts
    // are equal, the shipped model is effectively ungated.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst!.blocks) {
        delete b.resourceGate;
        delete b.requiresTargetStatus;
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const wrongAtk = (
      wrong.events.filter((e) => e.kind === 'buffApply') as Extract<
        SimEvent,
        { kind: 'buffApply' }
      >[]
    ).filter((e) => e.stat === 'atkPct' && Math.abs(e.value - 19.8) < 1e-6);
    const casts = baseline.events.filter(
      (e) => e.kind === 'burstCast' && e.unitIdx === rupeeIdx,
    ).length;
    expect(casts).toBeGreaterThan(0);
    // faithful: at most one application-set per cast, and strictly fewer than ungated
    expect(burstAtkApplies.length).toBeLessThan(wrongAtk.length);
  });

  it('the gate is not permanently closed either (both cases exercised in the fixture)', () => {
    // Non-vacuity for the gate: an early burst (pre-max Mileage) must NOT carry the buff,
    // a later burst (Mileage capped) MUST. Assert both halves exist in one run.
    const casts = baseline.events
      .filter((e) => e.kind === 'burstCast' && e.unitIdx === rupeeIdx)
      .map((e) => e.frame);
    expect(casts.length).toBeGreaterThan(1);
    expect(burstAtkApplies.length).toBeGreaterThan(0);
    const firstApplyFrame = Math.min(...burstAtkApplies.map((e) => e.frame));
    // the first cast happens before the first grant => the opening cast was gated OUT
    expect(casts[0]).toBeLessThan(firstApplyFrame);
  });

  it('teammates gain damage from the rider — removing it lowers every ally (inertness/carrier check)', () => {
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst!.blocks) {
        b.effects = b.effects.filter(
          (eff) => !(eff.kind === 'buff' && eff.stat === 'atkPct'),
        );
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const a = totals(baseline.res);
    const b = totals(wrong.res);
    for (const slug of Object.keys(a)) {
      expect(b[slug]).toBeLessThanOrEqual(a[slug] + 1e-6);
    }
    const movedAllies = Object.keys(a).filter(
      (s) => s !== 'rupee' && b[s] < a[s] - 1e-6,
    );
    expect(movedAllies.length).toBeGreaterThan(0);
  });

  it('does not touch buckets it has no claim on: no DoT and no charge damage anywhere', () => {
    // Inertness: rupee is an AR with chargeFrames 0 and no DoT line in the kit.
    const charge = damages.filter(
      (d) => d.bucket === 'charge' && d.srcSlot === rupeeIdx,
    );
    expect(charge.length).toBe(0);
  });
});

```

## Adapted form that runs in this repo

```ts
// ADAPTED blind spec for `rupee` — the S5 blind test (claude-opus-5) verbatim in ASSERTIONS,
// mechanically translated to the real harness API (the blind role has no repo access, so it
// wrote against an imagined plumbing). Every `it()` block, threshold, and counterfactual is
// preserved; only the plumbing changed:
//   * onEvent lives in `cfg`, not at the CompOptions top level
//   * `base.units` (CompOptions has none) → slot indices from controlComp order + harness `data`
//   * `ov.skill1.blocks` → `ov.skill1` (the slot IS the block array)
//   * `d.srcSlot === rupeeIdx` → `d.slug === 'rupee' && d.srcSlot === 'burst'` (srcSlot is a slot name)
//   * the imagined 'charge' damage bucket → charged-shot count (rupee: chargeFrames 0)
//   * FIXTURE FIX (the one semantic change, S2b-reviewer-predicted): the blind chose
//     controlComp('rupee', true), which seats crown — a SAME-CD Burst II — beside rupee. Measured:
//     crown takes the stage-2 slot on ALL 10 rotations and rupee casts ZERO bursts there, so every
//     burst assertion is vacuous in that fixture regardless of the override. The adaptation seats
//     rupee as the SOLE B2 (liter B1 / rupee B2 / helm B3, boss Fire, focus rupee — the rest of
//     the control character kept) where she casts 10× and the gate transition spans the fight.
//     The mixed-element property the blind relied on is kept (helm is Water, non-Iron).
//   * FIXTURE-CONTAMINATION FIX: "no critRateNormalPct anywhere" → "none FROM RUPEE" — helm's own
//     S1 legitimately grants critRateNormalPct to the team; the blind's intent is rupee's scope.
// Run against the DRIVER override (src/skills/overrides/rupee.json) — S5's green requirement.
//
// ---- original blind header (preserved) ----
// rupee — AR/Iron/Attacker/Burst II. Blind kit spec (written from kit prose alone).
//
// KIT (structural read):
//   skill1 — "Activates after landing 100 normal attack(s)." / "Affects all Iron Code allies."
//            (a) "Increases stack count of buffs by 1"  -> no engine primitive (GAP, it.skip)
//            (b) Critical Rate 2.24% for 10 sec         -> critRatePct, durationSec 10
//   skill2 — "Activates after 30 attacks." / "Affects self."
//            Mileage: ATK 13.8%, stacks to 5, lasts 15 sec -> atkPct, maxStacks 5, durationSec 15
//   burst  — "Affects enemies within range." 274.28% of final ATK as damage -> burstCast flatDamage
//          — "Activates when Mileage is at max stacks." / "Affects all allies."
//            ATK 19.8% for 5 sec -> allies atkPct, GATED on Mileage == 5 stacks
//
// FIXTURE: controlComp('rupee', true) — rupee is Burst II, so the fixture's B1/B3 slots
// complete the chain and bursts actually cast. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  data,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

// Sole-B2 fixture (see FIXTURE FIX in the header): everything controlComp provided, minus the
// competing Burst II that starves rupee of every cast.
const base = {
  slugs: ['liter', 'rupee', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'rupee',
};
/** Fixture slot order: liter 0 / rupee 1 / helm 2. */
const RUPEE_IDX = base.slugs.indexOf('rupee');

function run(opts = base) {
  const events: SimEvent[] = [];
  const res = runComp({ ...opts, cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) } });
  return { res, events };
}

// ---- hoisted runs (each is a full 180s sim) ----
const baseline = run();

const buffApplies = baseline.events.filter((e) => e.kind === 'buffApply') as Extract<
  SimEvent,
  { kind: 'buffApply' }
>[];
const damages = baseline.events.filter((e) => e.kind === 'damage') as Extract<
  SimEvent,
  { kind: 'damage' }
>[];
const rupeeIdx = RUPEE_IDX;

const critApplies = buffApplies.filter(
  (e) => e.stat === 'critRatePct' && Math.abs(e.value - 2.24) < 1e-6,
);
const mileageApplies = buffApplies.filter(
  (e) => e.stat === 'atkPct' && Math.abs(e.value - 13.8) < 1e-6,
);
const burstAtkApplies = buffApplies.filter(
  (e) => e.stat === 'atkPct' && Math.abs(e.value - 19.8) < 1e-6,
);

describe('rupee — skill1: Critical Rate 2.24% / 10 sec to all Iron Code allies, per 100 normal attacks', () => {
  it('fires at all (non-vacuity: the 100-hit threshold is reached in a 180s fight)', () => {
    expect(critApplies.length).toBeGreaterThan(0);
  });

  it('is scoped to IRON allies only — never lands on a non-Iron ally', () => {
    // Discriminates target set. Nearest-wrong: target {kind:'allies'} (whole team).
    // The control comp is deliberately mixed-element, so a whole-team model paints
    // non-Iron slugs that the faithful alliesOfElement:'Iron' model never touches.
    const ironSlugs = new Set(
      base.slugs.filter((s) => data.characters[s].element === 'Iron'),
    );
    const painted = new Set(critApplies.map((e) => e.targetSlug));
    expect(painted.size).toBeGreaterThan(0);
    for (const slug of painted) {
      expect(ironSlugs.has(slug)).toBe(true);
    }
  });

  it('is UNSCOPED crit (critRatePct), not normal-attack-scoped critRateNormalPct', () => {
    // The prose says plain "Critical Rate", with no "of normal attacks" qualifier.
    // Nearest-wrong: critRateNormalPct (would under-credit skill/burst crit).
    expect(critApplies.length).toBeGreaterThan(0);
    // (Contamination fix: helm's own S1 grants critRateNormalPct to the team — the intent is
    // that RUPEE's line is unscoped, so filter to her casts.)
    const wrongScope = buffApplies.filter(
      (e) => e.stat === 'critRateNormalPct' && e.casterIdx === rupeeIdx
    );
    expect(wrongScope.length).toBe(0);
  });

  it('carries a 10-second window (expiresFrame ~= applyFrame + 600 @60fps)', () => {
    // Discriminates duration semantics: seconds, not rounds (no durationShots) and
    // not permanent. Nearest-wrong: durationShots / no duration.
    for (const e of critApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('trigger is a 100-HIT count, not 30 and not 100 trigger-pulls-by-another-name', () => {
    // Nearest-wrong: hitCount 30 (skill2's threshold accidentally reused) fires ~3.3x more often.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.skill1) {
        if (b.trigger.kind === 'hitCount') b.trigger.count = 30;
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const wrongCrit = (
      wrong.events.filter((e) => e.kind === 'buffApply') as Extract<
        SimEvent,
        { kind: 'buffApply' }
      >[]
    ).filter((e) => e.stat === 'critRatePct' && Math.abs(e.value - 2.24) < 1e-6);
    expect(wrongCrit.length).toBeGreaterThan(critApplies.length);
  });

  it.skip('"Increases stack count of buffs by 1" — GAP: no engine primitive for a cross-buff stack-count bump', () => {
    // There is no EffectDef that raises another buff's maxStacks/current stacks.
    // Unmodelable today; must be recorded in the override's `unmodeled.skill1`.
  });
});

describe('rupee — skill2: Mileage ATK 13.8%, up to 5 stacks, 15 sec, self only', () => {
  it('applies to SELF only (never a teammate)', () => {
    // Discriminates target set. Nearest-wrong: {kind:'allies'}.
    expect(mileageApplies.length).toBeGreaterThan(0);
    for (const e of mileageApplies) {
      expect(e.targetSlug).toBe('rupee');
      expect(e.targetIdx).toBe(rupeeIdx);
    }
  });

  it('declares maxStacks 5 and actually reaches the cap (non-vacuity both sides)', () => {
    // Nearest-wrong: uncapped stacking (would exceed 5) or maxStacks 1 (never ramps).
    for (const e of mileageApplies) expect(e.maxStacks).toBe(5);
    const observed = mileageApplies.map((e) => e.stacks ?? 1);
    expect(Math.max(...observed)).toBe(5); // active case: cap reached
    expect(Math.min(...observed)).toBeLessThan(5); // inactive case: ramp exists
  });

  it('the stack cap is load-bearing: raising it above 5 increases rupee damage', () => {
    // Proves the assertion above is not decorative — a 10-stack model out-damages the
    // faithful 5-stack model, so the cap is a real constraint on the fixture.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.skill2) {
        for (const eff of b.effects) {
          if (eff.kind === 'buff' && eff.stat === 'atkPct') eff.maxStacks = 10;
        }
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    expect(totals(wrong.res)['rupee']).toBeGreaterThan(totals(baseline.res)['rupee']);
  });

  it('is time-bounded at 15 sec, not round-bounded and not permanent', () => {
    // Discriminates duration semantics. Nearest-wrong: durationShots ("for N rounds").
    for (const e of mileageApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('fires on a 30-ATTACK counter — more often than skill1\'s 100-hit counter', () => {
    // Discriminates trigger identity/threshold: 30 < 100, so within one run the Mileage
    // applications must outnumber the crit applications. Nearest-wrong: both keyed to 100.
    expect(mileageApplies.length).toBeGreaterThan(critApplies.length);
  });

  it('moves ONLY rupee — teammates are byte-identical when Mileage is removed (inertness)', () => {
    const patched = withPatchedOverride('rupee', (ov) => {
      ov.skill2 = [];
    });
    const noMileage = run({ ...base, overrides: { rupee: patched } });
    const a = totals(baseline.res);
    const b = totals(noMileage.res);
    expect(b['rupee']).toBeLessThan(a['rupee']); // self-buff is live
    for (const slug of Object.keys(a)) {
      if (slug === 'rupee') continue;
      // NOTE: allowed to move ONLY via the burst gate (see burst group); with the burst
      // ATK buff present, removing Mileage can close its gate — so compare with the
      // burst-gate group, not here. Teammates must not move from the self-buff itself.
      expect(b[slug]).toBeLessThanOrEqual(a[slug] + 1e-6);
    }
  });
});

describe('rupee — burst: 274.28% of final ATK to enemies within range', () => {
  it('lands burst-bucket damage on rupee\'s own burst cast', () => {
    const burstHits = damages.filter(
      (d) => d.bucket === 'burst' && d.slug === 'rupee' && d.srcSlot === 'burst',
    );
    expect(burstHits.length).toBeGreaterThan(0);
  });

  it('the 274.28% figure is load-bearing (halving it lowers rupee\'s burst damage)', () => {
    // Nearest-wrong: a mis-transcribed multiplier. Proves the number reaches the engine.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst) {
        for (const eff of b.effects) {
          if (eff.kind === 'flatDamage') eff.atkPct = eff.atkPct / 2;
        }
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    expect(totals(wrong.res)['rupee']).toBeLessThan(totals(baseline.res)['rupee']);
  });

  it('burst-cast damage is FULL-BURST EXEMPT (a burst cast lands before the FB window opens)', () => {
    // Taxonomy item 9: burst-cast/instant damage never takes the +50% FB major.
    const burstHits = damages.filter(
      (d) => d.bucket === 'burst' && d.slug === 'rupee' && d.srcSlot === 'burst',
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const d of burstHits) {
      expect(d.fbMajorApplied).toBeFalsy();
    }
  });
});

describe('rupee — burst rider: ATK 19.8% / 5 sec to ALL allies, GATED on Mileage at max stacks', () => {
  it('reaches all allies including self when it fires (non-vacuity, active case)', () => {
    // "Affects all allies" — no excludeSelf. Nearest-wrong: allies excludeSelf / self-only.
    expect(burstAtkApplies.length).toBeGreaterThan(0);
    const painted = new Set(burstAtkApplies.map((e) => e.targetSlug));
    expect(painted.has('rupee')).toBe(true);
    expect(painted.size).toBe(base.slugs.length);
  });

  it('carries a 5-second window, distinct from skill1\'s 10-sec crit window', () => {
    for (const e of burstAtkApplies) {
      expect(e.durationShots ?? null).toBeNull();
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
  });

  it('is GATED on Mileage at max stacks — it does NOT fire on every burst cast', () => {
    // THE discriminating assertion for this line. Nearest-wrong: an ungated burstCast
    // rider (fires on every one of rupee's casts, over-crediting the whole team).
    // Removing the gate must strictly increase the number of applications; if the counts
    // are equal, the shipped model is effectively ungated.
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst) {
        delete b.resourceGate;
        delete b.requiresTargetStatus;
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const wrongAtk = (
      wrong.events.filter((e) => e.kind === 'buffApply') as Extract<
        SimEvent,
        { kind: 'buffApply' }
      >[]
    ).filter((e) => e.stat === 'atkPct' && Math.abs(e.value - 19.8) < 1e-6);
    const casts = baseline.events.filter(
      (e) => e.kind === 'burstCast' && e.unitIdx === rupeeIdx,
    ).length;
    expect(casts).toBeGreaterThan(0);
    // faithful: at most one application-set per cast, and strictly fewer than ungated
    expect(burstAtkApplies.length).toBeLessThan(wrongAtk.length);
  });

  it('the gate is not permanently closed either (both cases exercised in the fixture)', () => {
    // Non-vacuity for the gate: an early burst (pre-max Mileage) must NOT carry the buff,
    // a later burst (Mileage capped) MUST. Assert both halves exist in one run.
    const casts = baseline.events
      .filter((e) => e.kind === 'burstCast' && e.unitIdx === rupeeIdx)
      .map((e) => e.frame);
    expect(casts.length).toBeGreaterThan(1);
    expect(burstAtkApplies.length).toBeGreaterThan(0);
    const firstApplyFrame = Math.min(...burstAtkApplies.map((e) => e.frame));
    // the first cast happens before the first grant => the opening cast was gated OUT
    expect(casts[0]).toBeLessThan(firstApplyFrame);
  });

  it('teammates gain damage from the rider — removing it lowers every ally (inertness/carrier check)', () => {
    const patched = withPatchedOverride('rupee', (ov) => {
      for (const b of ov.burst) {
        b.effects = b.effects.filter(
          (eff: any) => !(eff.kind === 'buff' && eff.stat === 'atkPct'),
        );
      }
    });
    const wrong = run({ ...base, overrides: { rupee: patched } });
    const a = totals(baseline.res);
    const b = totals(wrong.res);
    for (const slug of Object.keys(a)) {
      expect(b[slug]).toBeLessThanOrEqual(a[slug] + 1e-6);
    }
    const movedAllies = Object.keys(a).filter(
      (s) => s !== 'rupee' && b[s] < a[s] - 1e-6,
    );
    expect(movedAllies.length).toBeGreaterThan(0);
  });

  it('does not touch buckets it has no claim on: no DoT and no charge damage anywhere', () => {
    // Inertness: rupee is an AR with chargeFrames 0 and no DoT line in the kit.
    // (Adapted: the engine has no 'charge' damage bucket — charge state lives on the SHOT
    // event; chargeFrames 0 ⇒ zero charged shots.)
    const chargedShots = baseline.events.filter(
      (e) => e.kind === 'shot' && e.slug === 'rupee' && e.charged,
    );
    expect(chargedShots.length).toBe(0);
  });
});

```

---

# S6 BLIND OVERRIDE (claude-opus-5)

DIFF vs DRIVER override (measured): the architectures CONVERGE — same mileage resource pool 0-5, same hitCount:100 alliesOfElement-Iron critRatePct 2.24/10s, same hitCount:30 self atkPct 13.8 maxStacks 5/15s, same burstCast flatDamage 274.28, same burstCast+resourceGate{mileage>=5} all-ally atkPct 19.8/5s. THE ONE STRUCTURAL DIVERGENCE: the blind did NOT feed the pool from skill1 — it reads "Increases stack count of buffs by 1" as unmodelable and leaves the line out of unmodeled entirely; the driver folds the SELF slice as +1 pool on the S1 trigger (the mica-snow-buddy/pepper majority precedent) and carries the line verbatim in unmodeled with the PARTIALLY-MODELED audit trail. Behavioral consequence of the divergence ONLY: the gate opens at shot 120 (driver) vs shot 150 (blind) — no fixture cast falls inside that window, so both encodings produce byte-identical sim output today. Secondary shape difference: S6 merges the buff+resource effects into one skill2 block; the driver splits them (equivalent).

{
  "slug": "rupee",
  "resources": [
    {
      "name": "mileage",
      "initial": 0,
      "min": 0,
      "max": 5
    }
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 100
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Iron"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 2.24,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 13.8,
          "durationSec": 15,
          "maxStacks": 5
        },
        {
          "kind": "resource",
          "name": "mileage",
          "delta": 1
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
          "atkPct": 274.28
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
      "resourceGate": {
        "name": "mileage",
        "min": 5
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 19.8,
          "durationSec": 5
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
    "⚑ skill1 stack cap is kit-silent ('Increases stack count of buffs by 1' with no 'Stacks up to N'). Modeled as a single refreshing instance (no maxStacks): at the datamined AR cadence one activation costs ~9.7s (100 rounds incl. one 81f reload out of a 60 belt) against a 10s duration, so 2 stacks could only ever co-exist for ~0.3s. Any cap choice is damage-inert at this cadence.",
    "⚑ The burst's 'when Mileage is at max stacks' gate is modeled with a monotonic named resource pool ('mileage', cap 5) incremented by the same 30-hit trigger that grants the Mileage ATK buff. The real stack lapses 15s after the last gain; the trigger recurs every ~2.6s while firing, so the pool only diverges from the buff if the unit stops firing for 15s (does not happen at scope lock). The gate is NOT vacuous: max Mileage needs 150 landed rounds ≈ 15s incl. two reloads, so an early first burst can legitimately miss it.",
    "⚑ Every hit-count trigger here (100 / 30) converts to wall-clock through the datamine-unreliable cadence tuple (pullsPerSec, ammo 60, reloadFrames 81). The buff-uptime and the burst gate's satisfaction time move directly with that tuple; a cadence error is a model error even though the thresholds themselves are kit-exact.",
    "noFb is NOT set on the 274.28% burst hit — the engine's FB-by-timing default is left ON and a burst cast resolves before the Full Burst window opens, so the exemption should fall out of timing rather than a per-kit flag. Unmeasured for this unit.",
    "crit is left unset on the burst hit (engine-global rider-crit policy governs); noRange is deliberately not set (engine-automatic).",
    "Alternate parse of skill1 line 2 not taken: 'Increases stack count of buffs by 1' could conceivably mean it raises the stack CAP of other buffs rather than describing its own stacking. Nothing else in this kit consumes such a mechanic, so the self-referential reading is used."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Rupee (AR/Iron/Attacker/Burst II) is a two-lever unit: a team-wide Iron-Code crit trickle on a 100-hit counter (skill1) and a self ATK stack ladder 'Mileage' on a 30-hit counter capping at 5x13.8% (skill2), with the burst paying a 274.28%-of-final-ATK instant hit plus a 5s team ATK 19.8% aura that only fires while Mileage sits at max. Every magnitude, duration, stack cap and threshold in skill2/burst is verbatim kit-stated; the only authored (non-kit) structure is the 'mileage' resource pool used to express the burst's max-stack gate, since a stack COUNT is not otherwise readable by a block gate. All three slots are fully modeled — no line is dropped, so `unmodeled` is empty by construction, not by omission."
}

---

# DRIVER IMPLEMENTATION

## scripts/tests/units/rupee.test.ts (21 tests, all GREEN vs shipped)

```ts
// PER-UNIT KIT SPEC — `rupee` (Rupee, Attacker/AR/Iron, Burst II, cd 20s, ammo 60,
// reloadFrames 81, rate_of_fire 720). Kit-autonomy gauntlet 2026-08-04.
//
// One assertion group per KIT LINE (R1..R6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.rupee.skills):
//   S1 "Prize" ■ after landing 100 normal attacks → all Iron Code allies:
//        Critical Rate ▲2.24% for 10 sec                                                        [R1]
//      ■ after landing 100 normal attacks → all Iron Code allies:
//        Increases stack count of buffs by 1                                                    [R3/partial]
//   S2 "Mileage" ■ after 30 attacks → self:
//        Mileage: ATK ▲13.8%, stacks up to 5 times, lasts 15 sec                               [R2]
//   BU "Single Payment" ■ enemies within range: 274.28% of final ATK as damage                 [R4]
//      ■ Activates when Mileage is at max stacks → all allies: ATK ▲19.8% for 5 sec            [R5]
//
// Dispositions + why each assertion discriminates:
//   R1 FAITHFUL — hitCount:100 → alliesOfElement Iron → critRatePct 2.24 / 10s. Plain
//      "Critical Rate ▲" with NO "of normal attacks" clause ⇒ unscopec critRatePct (lifts every
//      crit-eligible hit of the Iron allies), NOT critRateNormalPct (the helm-H1 near-miss).
//      The fixture fields TWO Iron allies (liter + rupee) and one non-Iron (ada): the per-firing
//      holder set pins the element scope both ways — liter included (not self-only), ada excluded
//      (not all-allies). "landing" == firing (v1 has no miss model, clay precedent).
//   R2 FAITHFUL — hitCount:30 → self → atkPct 13.8, maxStacks 5, 15s. At sustained AR cadence a
//      proc lands every 30 shots (~2.6s including reload), ~5× faster than the 15s expiry, so the
//      engine's refresh-on-reapply semantics climb to 5 and keep refreshing — asserted directly
//      (post-cap applies carry stacks 5 + refresh). Nearest-wrong: the flat-passive +69% misread
//      (one apply at t=0) — strictly over-damages the ramp.
//   R3 PARTIAL (documented, ⚑ in override) — "Increases stack count of buffs by 1" (word_group
//      10001; the soda/mica-snow-buddy/pepper sentence). SELF slice: rupee's only stackable buff
//      is Mileage, folded as +1 to the `mileage` resource pool on the same hitCount:100 trigger.
//      The pool has NO event channel — it is observable ONLY through R5's gate, and no cast in any
//      legal fixture falls inside the (shot 120, shot 150) window where the S1 +1 changes gate
//      timing (casts are ≥20s apart; the window is ~4s), so the block is behaviorally inert here
//      and carries NO assertion (power-P3 pattern; the acceleration claim lives in the override
//      caveat, measurement-gated ⚑). The CROSS-ALLY slice (+1 to teammates' own stackable buffs)
//      is out-of-domain (no engine primitive, ⚑) and the stack's ATK-buff component is
//      unrepresentable without double-counting (buff instances key on caster+slot+stat+value, ⚑) —
//      both stay verbatim in the override's unmodeled. What IS pinned here: the pool currency stays
//      a RESOURCE — rupee emits buffApply events for exactly her three encoded lines and nothing
//      else, and the Mileage buff is a single keyed instance (a parallel skill1-slot Mileage buff
//      would surface as a second key — the double-count the encoding deliberately avoids).
//   R4 FAITHFUL — burstCast → enemy → flatDamage 274.28. "% of final ATK" is exactly
//      flatDamage's caster-final-ATK scaling; the partless v1 boss is the only enemy, so the AoE
//      "enemies within range" collapses to the boss taking the full value. A burst CAST lands
//      BEFORE the Full Burst window opens (and several of her casts in this fixture fall OUTSIDE
//      any FB window entirely), so no nuke may take the +50% FB major. Nearest-wrong: the stale
//      lv1 magnitude 150.85.
//   R5 FAITHFUL — burstCast + resourceGate{mileage ≥ 5} → allies → atkPct 19.8 / 5s. The engine
//      has no buff-stack gate primitive; the pool mirror is the power/pepper construction. GATE IS
//      LOAD-BEARING: the fixture's FIRST cast lands at frame 570, before the pool can possibly
//      reach 5 (shot 120 = frame 699 even WITH the S1 +1 — provable from the shot log alone), so
//      it must be silent while every later cast fires. Plain "ATK ▲" = each holder's OWN ATK
//      (atkPct), not casterAtkPct. "Affects all allies" = all five… here all three — NOT
//      Iron-scoped (ada gets it).
//   R6 FAITHFUL — the gate keys on burstCast (her OWN casts), not fullBurstEnter. This fixture
//      discriminates it WITHOUT a competing B2: the engine schedules 9 rupee casts but only 5
//      Full Burst windows (ada's 40s B3 cd throttles the chain), so a fullBurstEnter-keyed block
//      fires 4 times and the shipped burstCast-keyed block fires 8. The clay own-cast convention.
//
// Inert UNMODELED magnitudes with no assertions: none beyond the R3 partial (all kit values are
// modeled; the unmodeled quantities are the cross-ally buff-stack slice and the pool's ATK-buff
// component — both documented in the override caveats with estimate/recipe/tier).
//
// Fixture: liter(B1, Iron) / rupee(B2, Iron) / ada(B3, Water), boss Fire (Iron neutral), focus
// ada — rupee OWNS the B2 slot (controlComp seats crown at B2, where a competing B2 would muddy
// the R5/R6 gate pins), and two Iron allies make R1's element scope observable. Deterministic
// (no seed); measured in-fight values: 1644 shots, shot 120 at frame 699, 9 casts at frames
// 570/1816/3016/4328/5528/6835/8035/9240/10440, FB windows opening at 622/3068/5580/8087/10492.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: liter 0 / rupee 1 / ada 2. */
const LITER = 0;
const RUPEE = 1;
const ADA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'rupee', 'ada'],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === stat);

/** R1 reference: her S1 crit line removed entirely. */
const rupeeNoS1Crit = withPatchedOverride('rupee', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before) {
    throw new Error('rupee S1 critRatePct block missing — fixture is stale');
  }
});
/** R1 counterfactual: the same crit line unscoped — "all allies" instead of Iron Code allies. */
const rupeeAllAlliesCrit = withPatchedOverride('rupee', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b) {
    throw new Error('rupee S1 critRatePct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** R1 counterfactual: the same crit line read as SELF-only (the "affects allies" under-read). */
const rupeeSelfOnlyCrit = withPatchedOverride('rupee', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b) {
    throw new Error('rupee S1 critRatePct block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** R2 counterfactual: Mileage misread as a flat instant +69% (13.8×5, passive, no stacks, no
 *  expiry). The pool block is untouched, so the gate stays intact — this isolates the BUFF SHAPE. */
const rupeeFlatAtk = withPatchedOverride('rupee', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'atkPct'));
  if (!b) {
    throw new Error('rupee S2 atkPct stack block missing — fixture is stale');
  }
  b.trigger = { kind: 'passive' };
  const buff = b.effects.find(
    (e: any) => e.kind === 'buff' && e.stat === 'atkPct'
  );
  buff.value = 69;
  buff.maxStacks = 1;
  delete buff.durationSec;
});
/** R4 counterfactual: the lv1 magnitude 150.85 instead of the lv10 kit value 274.28 (the
 *  stale-low-level parse regression). */
const rupeeNukeLv1 = withPatchedOverride('rupee', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('rupee burst flatDamage missing — fixture is stale');
  }
  e.atkPct = 150.85;
});
/** R5 counterfactual: the nearest wrong model of the max-stacks condition — the SAME block with
 *  its resourceGate dropped, granting the team ATK window on EVERY cast from the first. */
const rupeeUngatedBuff = withPatchedOverride('rupee', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'atkPct'));
  if (!b || !b.resourceGate) {
    throw new Error('rupee gated burst ATK block missing — fixture is stale');
  }
  delete b.resourceGate;
});
/** R5 reference: the gated burst ATK line removed entirely. */
const rupeeNoBurstBuff = withPatchedOverride('rupee', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.burst.length === before) {
    throw new Error('rupee burst atkPct block missing — fixture is stale');
  }
});
/** R5 counterfactual (gate SOURCE): both pool blocks removed — the `mileage` resource never
 *  fills, so the gate can never open. The 13.8% Mileage BUFF still stacks, isolating the gate
 *  from the damage line (the power-P5 pattern). */
const rupeeNoPool = withPatchedOverride('rupee', (ov) => {
  for (const slot of ['skill1', 'skill2'] as const) {
    const before = ov[slot].length;
    ov[slot] = ov[slot].filter(
      (b: any) => !b.effects.some((e: any) => e.kind === 'resource')
    );
    if (ov[slot].length === before) {
      throw new Error(`rupee ${slot} resource block missing — fixture is stale`);
    }
  }
});
/** R6 counterfactual: the gated block re-keyed from burstCast to fullBurstEnter — fires on FB
 *  windows the team completes, not on HER casts. */
const rupeeFbeKeyed = withPatchedOverride('rupee', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'atkPct'));
  if (!b || b.trigger.kind !== 'burstCast') {
    throw new Error('rupee burstCast-keyed ATK block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1Crit = run({ rupee: rupeeNoS1Crit });
const allAllies = run({ rupee: rupeeAllAlliesCrit });
const selfOnly = run({ rupee: rupeeSelfOnlyCrit });
const flatAtk = run({ rupee: rupeeFlatAtk });
const nukeLv1 = run({ rupee: rupeeNukeLv1 });
const ungated = run({ rupee: rupeeUngatedBuff });
const noBurstBuff = run({ rupee: rupeeNoBurstBuff });
const noPool = run({ rupee: rupeeNoPool });
const fbeKeyed = run({ rupee: rupeeFbeKeyed });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rupeeShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'rupee');
const rupeeCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'rupee'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is Extract<SimEvent, { kind: 'fullBurstStart' }> =>
    e.kind === 'fullBurstStart'
  );
/** rupee's OWN S1 crit applies — one buffApply per holder per firing. */
const critApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === RUPEE && b.stat === 'critRatePct' && b.value === 2.24
  );
/** Distinct frames the S1 crit line fired on (one firing emits one event per holder). */
const critFirings = (evs: SimEvent[]): number[] =>
  [...new Set(critApplies(evs).map((b) => b.frame))].sort((a, b) => a - b);
/** rupee's S2 Mileage applies. */
const mileageApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === RUPEE && b.stat === 'atkPct' && b.value === 13.8
  );
/** rupee's burst ATK-window applies (one per holder per firing). */
const burstAtkApplies = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === RUPEE && b.stat === 'atkPct' && b.value === 19.8
  );
const burstAtkFirings = (evs: SimEvent[]): number[] =>
  [...new Set(burstAtkApplies(evs).map((b) => b.frame))].sort((a, b) => a - b);
const rupeeNukes = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'rupee' && e.bucket === 'burst'
  );
/** Normal-bucket crit rates seen per unit, as fixed-precision strings (the R1 live-effect read). */
const normalCritRates = (evs: SimEvent[], slug: string): string[] =>
  [
    ...new Set(
      evs
        .filter(
          (e): e is Damage =>
            e.kind === 'damage' && e.slug === slug && e.bucket === 'normal'
        )
        .map((d) => d.critRate.toFixed(9))
    ),
  ].sort();

describe('rupee — kit spec', () => {
  describe('R1 — S1 Prize: crit rate to ALL IRON CODE allies every 100 hits', () => {
    it('fires once per 100 landed shots', () => {
      const shots = rupeeShots(base.events).length;
      expect(shots, 'fixture sanity: sustained AR fire in 180s').toBeGreaterThan(
        1500
      );
      expect(critFirings(base.events).length).toBe(Math.floor(shots / 100));
    });

    it('reaches exactly the Iron Code allies (liter + herself), never the non-Iron ally', () => {
      const applies = critApplies(base.events);
      expect(applies.length).toBeGreaterThan(0);
      for (const frame of critFirings(base.events)) {
        const holders = applies
          .filter((b) => b.frame === frame)
          .map((b) => b.targetIdx)
          .sort();
        expect(holders, `firing at frame ${frame}`).toEqual([LITER, RUPEE]);
      }
      expect(
        applies.some((b) => b.targetIdx === ADA),
        'ada is Water — an unscoped encoding would reach her'
      ).toBe(false);
    });

    it('is 2.24% for 10 sec', () => {
      for (const b of critApplies(base.events)) {
        expect(b.value).toBe(2.24);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is LIVE: it lifts the normal crit rate, and removing it collapses the rate to base', () => {
      const lifted = normalCritRates(base.events, 'rupee');
      const baseline = normalCritRates(noS1Crit.events, 'rupee');
      expect(lifted.length, 'base run must show both the bare and the lifted rate').toBe(2);
      expect(baseline.length, 'removed-crit run must be flat').toBe(1);
      expect(baseline[0]).toBe(lifted[0]);
      expect(Number(lifted[1]) - Number(lifted[0])).toBeCloseTo(0.0224, 6);
      // liter is Iron, so HER normal crit rate lifts too:
      expect(normalCritRates(base.events, 'liter').length).toBe(2);
    });

    it('DISCRIMINATING: an all-allies reading reaches ada; a self-only reading drops liter', () => {
      for (const frame of critFirings(allAllies.events)) {
        const holders = critApplies(allAllies.events)
          .filter((b) => b.frame === frame)
          .map((b) => b.targetIdx)
          .sort();
        expect(holders, 'unscoped: every firing reaches all three').toEqual([
          LITER,
          RUPEE,
          ADA,
        ]);
      }
      const selfHolders = new Set(
        critApplies(selfOnly.events).map((b) => b.targetIdx)
      );
      expect(selfHolders, 'self-only: liter never receives the buff').toEqual(
        new Set([RUPEE])
      );
      expect(
        normalCritRates(selfOnly.events, 'liter'),
        'self-only: liter keeps her bare crit rate'
      ).toEqual(normalCritRates(noS1Crit.events, 'liter'));
    });
  });

  describe('R2 — S2 Mileage: self ATK stacks, every 30 hits, to 5, with a 15s refresh', () => {
    it('applies once per 30 landed shots, self-scoped', () => {
      const shots = rupeeShots(base.events).length;
      const applies = mileageApplies(base.events);
      expect(applies.length).toBe(Math.floor(shots / 30));
      expect([...new Set(applies.map((b) => b.targetIdx))]).toEqual([RUPEE]);
    });

    it('is 13.8% per stack, max 5 stacks, reaching max, with a 15 sec expiry', () => {
      const applies = mileageApplies(base.events);
      expect([...new Set(applies.map((b) => b.value))]).toEqual([13.8]);
      expect([...new Set(applies.map((b) => b.maxStacks))]).toEqual([5]);
      expect(
        Math.max(...applies.map((b) => b.stacks)),
        'stacks must actually climb to the 5-stack cap mid-fight'
      ).toBe(5);
      for (const b of applies) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('keeps refreshing at the cap — stacks never lapse while she keeps firing', () => {
      const applies = mileageApplies(base.events);
      expect(applies.length).toBeGreaterThan(5);
      const atCap = applies.filter((b) => b.stacks === 5);
      expect(atCap.length, 'post-cap procs must re-apply').toBeGreaterThan(10);
      expect(
        atCap.every((b) => b.refresh),
        'every post-cap apply refreshes the shared instance (refresh-on-reapply)'
      ).toBe(true);
    });

    it('DISCRIMINATING: a flat instant +69% would apply once and over-credit the ramp', () => {
      const selfAtk = buffs(flatAtk.events).filter(
        (b) => b.casterIdx === RUPEE && b.stat === 'atkPct' && b.targetIdx === RUPEE
      );
      // The 19.8 burst-window buff (rupee holds her own) is untouched by this patch — filter
      // by value: exactly ONE passive 69% apply, and the 13.8% stack buff is gone.
      expect(selfAtk.filter((b) => b.value === 69).length).toBe(1);
      expect(selfAtk.filter((b) => b.value === 13.8).length).toBe(0);
      expect(
        flatAtk.totals.rupee,
        'flat +69% from t=0 must strictly out-damage the faithful 5x13.8% ramp'
      ).toBeGreaterThan(base.totals.rupee);
    });
  });

  describe('R3 — the Mileage stack is a resource pool, not a buff (gate currency for R5)', () => {
    it("rupee emits buffApply events for EXACTLY her three encoded lines — no stray stack-buff", () => {
      const fromRupee = buffs(base.events).filter((b) => b.casterIdx === RUPEE);
      expect(fromRupee.length, 'fixture sanity: rupee buffs exist').toBeGreaterThan(0);
      expect(
        [...new Set(fromRupee.map((b) => `${b.stat}:${b.value}`))].sort()
      ).toEqual(['atkPct:13.8', 'atkPct:19.8', 'critRatePct:2.24']);
    });

    it('the Mileage buff is ONE keyed instance — no parallel skill1-slot copy (double-count)', () => {
      const keys = new Set(mileageApplies(base.events).map((b) => b.key));
      expect(
        keys.size,
        'a second Mileage instance would key separately and double the stacks'
      ).toBe(1);
    });
  });

  describe('R4 — burst Single Payment: 274.28% of final ATK, once per cast, pre-FB', () => {
    const nukes = rupeeNukes(base.events);

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = rupeeCasts(base.events);
      expect(casts.length, 'fixture sanity: rupee casts in 180s').toBeGreaterThan(5);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([274.28]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(nukes.map((d) => d.srcSlot))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('never takes the +50% Full Burst major (casts precede — or fall outside — FB windows)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must never carry the FB major'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the lv1 magnitude 150.85 is not the shipped value', () => {
      expect(
        [...new Set(rupeeNukes(nukeLv1.events).map((d) => d.atkPct))]
      ).toEqual([150.85]);
    });
  });

  describe('R5 — burst team ATK is GATED on Mileage at max stacks (the pool mirror)', () => {
    it('fixture sanity: cast 1 precedes the earliest possible pool-max, later casts follow it', () => {
      const casts = rupeeCasts(base.events);
      const shots = rupeeShots(base.events);
      // Pool cannot reach 5 before shot 120 even WITH the S1 +1 (S2 at 30/60/90 = 3, S1 at 100
      // = 1 → 4; the fifth unit lands at shot 120). First cast before it ⇒ gate closed; every
      // later cast after it ⇒ pool 5 (no decay) ⇒ gate open.
      expect(casts[0].frame).toBeLessThan(shots[119].frame);
      expect(casts[1].frame).toBeGreaterThan(shots[119].frame);
    });

    it('is silent on the gate-closed first cast and fires on every later cast', () => {
      const casts = rupeeCasts(base.events);
      const firings = burstAtkFirings(base.events);
      expect(firings).toEqual(casts.slice(1).map((c) => c.frame));
    });

    it('reaches ALL allies with 19.8% for 5 sec when it fires', () => {
      const applies = burstAtkApplies(base.events);
      expect(applies.length).toBeGreaterThan(0);
      for (const frame of burstAtkFirings(base.events)) {
        const holders = applies
          .filter((b) => b.frame === frame)
          .map((b) => b.targetIdx)
          .sort();
        expect(holders, `firing at frame ${frame} must reach all three allies`).toEqual(
          [LITER, RUPEE, ADA]
        );
      }
      for (const b of applies) {
        expect(b.value).toBe(19.8);
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('DISCRIMINATING: gate REMOVED fires every cast; line REMOVED fires none', () => {
      const casts = rupeeCasts(ungated.events);
      expect(
        burstAtkFirings(ungated.events),
        'ungated: the window fires on EVERY cast, including the first'
      ).toEqual(casts.map((c) => c.frame));
      expect(burstAtkApplies(noBurstBuff.events)).toEqual([]);
    });

    it('DISCRIMINATING (gate SOURCE): zeroing the pool never fires the window, nukes intact', () => {
      const casts = rupeeCasts(noPool.events);
      expect(casts.length, 'fixture sanity: rupee still casts without the pool').toBe(
        rupeeCasts(base.events).length
      );
      expect(
        burstAtkApplies(noPool.events),
        'with the pool at 0 the Mileage gate must never open'
      ).toEqual([]);
      expect(
        rupeeNukes(noPool.events).length,
        'the 274.28% hit is unconditional — the gate isolates from the damage line'
      ).toBe(casts.length);
      expect(
        Math.max(...mileageApplies(noPool.events).map((b) => b.stacks)),
        'the Mileage BUFF still stacks without the pool (gate isolated from the ramp)'
      ).toBe(5);
    });
  });

  describe('R6 — the gate keys on HER OWN burstCast, not on Full Burst entry', () => {
    it('fires on her casts OUTSIDE FB windows too — windows alone cannot explain the cadence', () => {
      const windows = fbStarts(base.events).map((f) => [f.frame, f.endFrame]);
      const outside = burstAtkFirings(base.events).filter(
        (frame) => !windows.some(([s, e]) => frame >= s && frame <= e)
      );
      expect(
        outside.length,
        'the engine schedules more rupee casts than FB windows; a window-keyed block cannot fire there'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: fullBurstEnter keying fires on the windows, not on her casts', () => {
      const shots = rupeeShots(fbeKeyed.events);
      const windows = fbStarts(fbeKeyed.events);
      const expectFirings = windows
        .filter((w) => w.frame > shots[119].frame) // pool 5 before the window ⇒ gate open
        .map((w) => w.frame);
      expect(burstAtkFirings(fbeKeyed.events)).toEqual(expectFirings);
      expect(
        burstAtkFirings(fbeKeyed.events).length,
        'fewer windows than casts in this fixture — the keying is observable'
      ).toBeLessThan(burstAtkFirings(base.events).length);
    });
  });
});

```

## src/skills/overrides/rupee.json (shipped)

```json
{
  "note": "Rupee (slug rupee) — AR / Attacker / Iron / Burst II (cd 20s), Tetra; ammo 60, reloadFrames 81, normalMult 13.65, rate_of_fire 720 (12 rounds/s nominal), hitsPerShot 1, critRate 15 / critDamage 150. FROM-SCRATCH kit-autonomy build 2026-08-04 (no prior override / kit-status row; simSupported was false). EXACT SLUG: `rupee` — the base AR/Iron unit, NOT `rupee-winter-shopper` (AR/Electric B1 Defender, aka rws — an entirely different kit). A travel-rewards-themed Iron attacker: her OWN damage is her AR spray + a modest burst nuke; her team value is (a) a periodic crit-rate feed to Iron Code allies (S1) and (b) an all-ally ATK window on her burst that unlocks ONLY once her self Mileage stack is maxed. || FULL-KIT AUDIT (every line accounted for): S1 'Prize' — 'Activates after landing 100 normal attack(s). Affects all Iron Code allies.' (L1) 'Critical Rate ▲ 2.24% for 10 sec' = IMPLEMENTED hitCount:100 → alliesOfElement Iron → critRatePct 2.24 / durationSec 10. UNSCOPED critRatePct per the helm rule: the text says plain 'Critical Rate ▲' with NO 'of normal attacks' clause, so it lifts every crit-eligible hit of the Iron allies (normals AND skill/burst instances) — NOT critRateNormalPct. 'Affects all Iron Code allies' = TargetDef alliesOfElement 'Iron' (INCLUDES self — she is Iron, no except-self clause; the mica-snow-buddy all-allies self-inclusion convention). 'landing' == firing: v1 has no miss model (clay precedent). (L2) 'Increases stack count of buffs by 1.' = SPLIT — the roster-wide buff-stack-amplifier line (word_group 10001; the same sentence carried by soda/mica-snow-buddy/diesel/alice-wonderland-bunny). SELF slice: the only stackable buff rupee herself holds is Mileage (her S2), so the self-directed portion is MODELED as +1 to the `mileage` resource pool on the same hitCount:100 trigger — the mica-snow-buddy/pepper construction for exactly this line (self stackable resource folded, acceleration of the max-stacks gate included: pool reaches 5 at shot 120 instead of shot 150). TWO documented divergences from the full in-game mechanic, both ⚑ (caveats 2/3): the CROSS-ALLY slice (+1 stack to teammates' own stackable buffs) has no engine primitive (out-of-domain), and the mileage ATK-buff COMPONENT of the self stack is NOT granted — buff instances key on caster+slot+stat+value (sim.ts KR stacking rule), so a skill1-slot mileage buff would co-exist as a SECOND instance (up to 2×5 stacks = double-counted ATK), not merge into S2's Mileage; the pool-only encoding keeps the gate timing right and under-credits her own ATK by ≤1 stack (13.8%) during the opening ramp. The line stays verbatim in unmodeled.skill1 (partial-modeling audit trail). S2 'Mileage' — 'Activates after 30 attacks. Affects self. Mileage: ATK ▲ 13.8%. Stacks up to 5 times and lasts for 15 sec.' = IMPLEMENTED as TWO blocks on hitCount:30 → self: (a) the real buff atkPct 13.8 / maxStacks 5 / durationSec 15, and (b) +1 to the `mileage` resource pool — the power (Blood Fiend) stack-gate mirror: the engine has no buff-stack gate primitive, so the burst's 'Mileage at max stacks' condition reads the pool via resourceGate {min:5}. Stack semantics = the engine's refresh-on-reapply (each proc +1 stack, shared instance, expiry refreshed): at her sustained AR cadence (a proc every 30 shots ≈ 3.2s including the 81f reload) applications beat the 15s expiry by ~5×, so stacks climb monotonically to 5 and never lapse while she keeps firing — the pool and the buff never disagree inside a sim fight (⚑4 no-lapse, power/pepper precedent). BURST 'Single Payment' (InstantArea, Iron code, prefer HighAttack) — (B1) 'Affects enemies within range. Deals 274.28% of final ATK as damage.' = IMPLEMENTED burstCast → enemy → flatDamage 274.28: '% of final ATK' is exactly flatDamage's caster-final-ATK scaling; the single partless v1 boss is the only enemy, so the AoE 'enemies within range' collapses to the boss taking the full value (diesel/pepper multi-target-burst convention); burst CAST lands BEFORE the Full Burst window opens, so it never takes the +50% FB major (verified fact 2026-07-13) and snapshots pre-FB; crit-eligible at her sheet rate (flatDamage default, U1); Iron-flavored via her element (neutral on the Fire scope-lock boss). (B2) 'Activates when Mileage is at max stacks. Affects all allies. ATK ▲ 19.8% for 5 sec.' = IMPLEMENTED burstCast + resourceGate {mileage ≥ 5} → allies → atkPct 19.8 / durationSec 5. atkPct = % of each holder's OWN ATK (the text says plain 'ATK ▲', no 'of the skill user's ATK' — not casterAtkPct). 'Activates when...' is a TRIGGER CONDITION on the whole ■ bullet, so the gate keys on burstCast (her own casts only — she is the sole caster of her burst), NOT fullBurstEnter (which would over-fire on rotations completed by a competing B2 — the clay own-cast convention; in the fixture she is the only B2 regardless). Gate is LOAD-BEARING: an ungated model over-fires the team ATK window on every early cast before Mileage completes. || EVIDENCE TIER: all live values are kit-text-literal (2.24/10s, 13.8/5/15s, 274.28, 19.8/5s); the estimated quantities are the cadence tuple and the ⚑ cluster below. TIER 2 (status-gate via resource mirror + element-scoped buff + stack mechanics). Faithful>fit; measured>fudge. Kit-autonomy gauntlet 2026-08-04.",
  "caveats": [
    "⚑ CADENCE TUPLE (ALWAYS-⚑): AR rate_of_fire 720 = 12 rounds/s nominal + reloadFrames 81 + ammo 60, all datamine (single-chunk reload, reload_bullet 10000) — drives the S1/S2 proc cadence (every 100 / 30 shots), the Mileage ramp timing and hence the burst-gate opening. Recipe: rounds/min + reload gap from any rupee-focus video.",
    "⚑ MEASUREMENT-GATED (interpretation): the S1 'Increases stack count of buffs by 1' SELF slice is encoded as +1 to the mileage POOL ONLY — the stack's ATK-buff component (13.8%) is NOT granted because buff instances key on caster+slot+stat+value (sim.ts KR stacking rule), so a skill1-slot Mileage buff would be a parallel second instance (double-counted stacks), not a merge into S2's Mileage. ESTIMATE: ≤13.8% of rupee's OWN ATK under-credited during the opening ramp only (the pool reaches 5 at shot ~120; from then on S2 procs alone keep the real buff at 5 stacks, so the missing component exists only while stacks accrue, ≈ first 11s). RECIPE: popup-read rupee's ATK buff icon after an S1 proc in a rupee focus recording — does Mileage show +1 stack carrying the 13.8% value? TIER: override-only (an engine cross-slot stack-merge primitive would remove the divergence).",
    "⚑ OUT-OF-DOMAIN (engine-core): the CROSS-ALLY slice of S1 'Increases stack count of buffs by 1' — +1 stack to each Iron ally's OWN stackable buffs (the soda-type team amplifier). ESTIMATE: zero in any encoding the sim can field today (purely a function of which stacking Iron comps are fielded; in the scope-lock fixture the only stackable buff any Iron ally holds is rupee's own Mileage, already folded as the self slice). RECIPE: an engine primitive 'bump each target's stackable buffs by N' reading each holder's live maxStacks buffs (does not exist; mica-snow-buddy ⚑M5 / pepper ⚑4 precedent). TIER: out-of-domain (engine-core); the self-slice is the honest in-scope model.",
    "⚑ MEASUREMENT-GATED (no-lapse approximation, power/pepper precedent): the mileage POOL never decays (no timer-decay primitive) while the Mileage BUFF lapses 15s after its last refresh. At her sustained scope-lock cadence (S2 procs ≈ every 3.2s; S1 adds one ≈ every 10.6s) applications beat the 15s expiry by ~5×, so stacks never lapse while she keeps firing and the pool and the buff never disagree inside a sim fight — diverges only if she stops firing for >15s. RECIPE: read the Mileage stack icon across a long fire-pause in a rupee focus recording. TIER: override-only.",
    "⚑ INTERPRETATION (awb/diesel dissent on record): alice-wonderland-bunny's gauntlet read the identical sentence as a stack-CAP raise and left it fully unmodeled, warning that a +1-grant reading 'spuriously accelerates the max-stacks gate'; diesel left it unmodeled as ambiguous. This encoding follows the NEWER mica-snow-buddy + pepper majority (self stackable resource folded as +1, cross-ally out-of-domain) because rupee's own stackable buff IS the gate read by her burst, exactly the mica/pepper shape. If a rupee focus recording shows S1 NOT feeding Mileage, drop skill1[1] (the pool block) and the gate simply opens one S2 proc later (shot 150 instead of 120) — the encoding is one block away from the conservative reading."
  ],
  "resources": [{ "name": "mileage", "initial": 0, "min": 0, "max": 5 }],
  "unmodeled": {
    "skill1": [
      "Increases stack count of buffs by 1. (PARTIALLY MODELED — the SELF slice is folded as +1 to the mileage pool on the same hitCount:100 trigger (skill1[1]); the CROSS-ALLY slice (teammates' stackable buffs) is out-of-domain ⚑3 and the mileage ATK-buff component of the self stack is unrepresentable ⚑2 — the line stays here verbatim as the audit trail)"
    ],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 100 },
      "target": { "kind": "alliesOfElement", "element": "Iron" },
      "effects": [
        { "kind": "buff", "stat": "critRatePct", "value": 2.24, "durationSec": 10 }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 100 },
      "target": { "kind": "self" },
      "effects": [{ "kind": "resource", "name": "mileage", "delta": 1 }]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "hitCount", "count": 30 },
      "target": { "kind": "self" },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 13.8,
          "durationSec": 15,
          "maxStacks": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "hitCount", "count": 30 },
      "target": { "kind": "self" },
      "effects": [{ "kind": "resource", "name": "mileage", "delta": 1 }]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [{ "kind": "flatDamage", "atkPct": 274.28 }]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 19.8, "durationSec": 5 }
      ],
      "resourceGate": { "name": "mileage", "min": 5 }
    }
  ]
}

```
