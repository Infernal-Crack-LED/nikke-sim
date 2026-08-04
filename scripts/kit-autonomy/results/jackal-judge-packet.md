# S7 RECONCILING-JUDGE PACKET — `jackal` (Jackal)

Driver assembly (kit-autonomy gauntlet 2026-08-04). Sections in contract order. Return ONLY the binding verdict JSON described in section I — save-target: scripts/kit-autonomy/results/jackal.json.


---

# SECTION 1 — THE CONTRACT (RECONCILING-JUDGE.md)

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

# SECTION 2 — MECHANICS SSOT

## 2a. docs/data/damage-calculation.md

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


## 2b. docs/data/game-mechanics.md

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

# SECTION 3 — GROUND TRUTH: jackal kit prose + base stats (data/characters.json → characters.jackal)

{
  "slug": "jackal",
  "name": "Jackal",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/mn-18/vm-63/1b68deb545798efc729918302b829d67.png",
  "weapon": "RL",
  "burst": "I",
  "burstCooldownSec": 20,
  "class": "Defender",
  "element": "Iron",
  "manufacturer": "Missilis",
  "normalAttackMultiplier": 65.02,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 142,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "rl3": 42.6,
  "releaseDate": "2023-01-12",
  "burstGaugePerShot": 3.55,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates when attacked 10 time(s). Affects 1 enemy unit(s) with the highest final Max HP.\nDamage Taken ▲ 9.09% for 10 sec.\nATK ▼ 9.09% for 10 sec.",
    "skill2": "■ Activates at the start of battle. Affects self and 2 ally unit(s) with the highest final ATK.\nEqually shares damage taken  for 120 sec.\nDEF ▲ 8.27% for 120 sec.",
    "burst": "■ Affects all allies.\nBurst Skill damage of skills with \"Affects 1 enemy unit(s)\" in the description ▲ 38.91% for 15 sec.\nDEF ▲ 14.69% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "role": {
    "weapon": {
      "shot_id": 1011101,
      "shot_detail": {
        "id": 1011101,
        "damage": 6502,
        "max_ammo": 6,
        "shake_id": 2,
        "ShakeType": "Fire_RL",
        "fire_type": "HomingProjectile",
        "zoom_rate": 0,
        "input_type": "UP",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
        "charge_time": 100,
        "penetration": 0,
        "reload_time": 67,
        "shot_timing": "Concurrence",
        "spot_radius": 50,
        "weapon_type": "RL",
        "is_targeting": false,
        "muzzle_count": 1,
        "rate_of_fire": 60,
        "homing_script": "lv1",
        "name_localkey": "Rocket Launcher",
        "prefer_target": "TargetGL",
        "reload_bullet": 3300,
        "counter_enermy": "Metal_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 60,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 5,
        "full_charge_damage": 25000,
        "multi_target_count": 0,
        "spot_radius_object": 2,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 35500,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nCharge Time: {charge_time} sec.\nFull Charge Damage: {full_charge_damage}% of damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 0,
        "spot_explosion_range": 500,
        "use_function_id_list": [
          0
        ],
        "accuracy_change_speed": 0,
        "hurt_function_id_list": [
          0
        ],
        "spot_projectile_speed": 100,
        "accuracy_change_pershot": 0,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 0,
        "full_charge_burst_energy": 25000,
        "end_accuracy_circle_scale": 10,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 10,
        "target_burst_energy_pershot": 71000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 10,
        "auto_start_accuracy_circle_scale": 10
      },
      "bonusrange_max": 0,
      "bonusrange_min": 0
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step1",
      "burst_apply_delay": 1,
      "change_burst_step": "Step2"
    },
    "skillDetails": {
      "skill1_id": 2111101,
      "skill2_id": 2111201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2111101,
        "icon": "icn_skill_atkdown_01",
        "group_id": 21111,
        "skill_level": 1,
        "name_localkey": "Happy Jackal",
        "next_level_id": 2111102,
        "level_up_cost_id": 50102,
        "description_localkey": "■ Activates when attacked {description_value_01} time(s). Affects {description_value_02} enemy unit(s) with the highest <word_group=10025>final</word_group> Max HP.\n<color=#00AEFF>Damage Taken ▲ {description_value_03}% for {description_value_04} sec.\nATK ▼ {description_value_05}% for {description_value_06} sec.</color>",
        "description_value_list": [
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
              "5",
              "5.45",
              "5.9",
              "6.36",
              "6.81",
              "7.27",
              "7.72",
              "8.18",
              "8.63",
              "9.09"
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
          {
            "description_value": [
              "5",
              "5.45",
              "5.9",
              "6.36",
              "6.81",
              "7.27",
              "7.72",
              "8.18",
              "8.63",
              "9.09"
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
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2111201,
        "icon": "icn_skill_defup_01",
        "group_id": 21112,
        "skill_level": 1,
        "name_localkey": "Jumpin' Jackal Flash",
        "next_level_id": 2111202,
        "level_up_cost_id": 50202,
        "description_localkey": "■ Activates at the start of battle. Affects self and {description_value_01} ally unit(s) with the highest <word_group=10025>final</word_group> ATK.\n<color=#00AEFF><word_group=10044>Equally shares damage taken</word_group>  for {description_value_02} sec.\nDEF ▲ {description_value_03}% for {description_value_04} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "2",
              "2",
              "2",
              "2",
              "2",
              "2",
              "2",
              "2",
              "2",
              "2"
            ]
          },
          {
            "description_value": [
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120"
            ]
          },
          {
            "description_value": [
              "4.55",
              "4.96",
              "5.37",
              "5.79",
              "6.2",
              "6.61",
              "7.03",
              "7.44",
              "7.85",
              "8.27"
            ]
          },
          {
            "description_value": [
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120"
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
      "ulti_skill_id": 1111301,
      "ulti_skill_detail": {
        "id": 1111301,
        "icon": "icn_skill_c111_ult",
        "group_id": 11113,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Iron",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Crazy Jackal",
        "next_level_id": 1111302,
        "prefer_target": "LowHP",
        "resource_name": "c111_ulti",
        "duration_value": 0,
        "skill_cooltime": 2000,
        "level_up_cost_id": 50302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 5,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 10000,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 0,
            "skill_value_type": "None"
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
        "description_localkey": "■ Affects all allies.\n<color=#00AEFF><word_group=10069>Burst Skill damage of skills with \"Affects 1 enemy unit(s)\" in the description</word_group> ▲ {description_value_01}% for {description_value_02} sec.\nDEF ▲ {description_value_03}% for {description_value_04} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "21.4",
              "23.35",
              "25.29",
              "27.24",
              "29.18",
              "31.13",
              "33.08",
              "35.02",
              "36.97",
              "38.91"
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
          {
            "description_value": [
              "8.08",
              "8.81",
              "9.55",
              "10.28",
              "11.02",
              "11.75",
              "12.48",
              "13.22",
              "13.95",
              "14.69"
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
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          111130101,
          111130102
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
      "grow_grade": 111102,
      "grade_core_id": 1,
      "stat_enhance_id": 5205,
      "stat_enhance_detail": {
        "id": 5205,
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
      "piece_id": 5100111,
      "piece_detail": {
        "id": 5100111,
        "class": "Defender",
        "order": 11100,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "MISSILIS",
        "resource_id": 111,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Jackal's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 111101,
      "class": "Defender",
      "order": 10058,
      "name_code": 1020,
      "corporation": "MISSILIS",
      "resource_id": 111,
      "name_localkey": "Jackal",
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
    "hp": 16500,
    "atk": 400,
    "def": 107,
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
    "resourceId": 111
  }
}

---

# SECTION 4 — S2b PRE-OP REVIEW (claude-fable-5, independent spec; scripts/kit-autonomy/reviews/jackal.test-review.json)

{
  "slug": "jackal",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Damage Taken ▲ 9.09% for 10 sec.",
      "disposition": "MEASUREMENT-GATED",
      "scope": "Boss DEBUFF (damageTakenPct) — multiplies ALL team damage of every bucket while live; not scoped to any attack type. This is a team-damage lever, NOT a defensive line.",
      "durationSemantics": "Wall-clock durationSec:10 (expiresFrame = applyFrame + 600); refresh on re-proc.",
      "triggerIdentity": "'Activates when attacked 10 time(s)' = a counter of hits RECEIVED by jackal. No engine trigger exists for being-attacked (v1 boss deals no damage), so the faithful encoding is an ⚑ interval proxy whose cadence = 10 ÷ measured boss attacks-received rate (boss target-selection also unmeasured ⚑). Per ALWAYS-⚑ rule 2 the effect must ship with a flagged estimate + recipe, never be silently dropped.",
      "targetSet": "enemy — '1 enemy unit(s) with the highest final Max HP' resolves to the sole raid boss; emitted as a boss-held debuff (buffApply with casterIdx===null AND targetIdx===null, filter by stat+value).",
      "nearestWrongModel": "Trigger misread 'attacked' as 'attacking': hitCount:10 on jackal's OWN shots — her RL cadence then gives a fixed fast proc rate and near-permanent +9.09% team uptime, over-crediting the whole board. Second-nearest: dropped entirely as 'defensive' because it sits on a Defender's kit.",
      "distinguishingAssertion": "Event log contains buffApply {stat:'damageTakenPct', value:9.09, casterIdx:null, targetIdx:null} with expiresFrame−applyFrame=600, recurring at the ⚑ interval cadence; proc frames must NOT shift when jackal's own fire economy is patched via withPatchedOverride (e.g. changed ammo/cadence) — green under an interval/attacked proxy, red under hitCount(own-shots) keying.",
      "inertness": "Must never apply as a buff ON a unit (no buffApply with a non-null targetIdx for this stat/value); zeroing the block must change ONLY the global damage-taken multiplier window, no per-unit stat.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▼ 9.09% for 10 sec.",
      "disposition": "UNMODELED",
      "scope": "Boss outgoing-ATK debuff — purely defensive; boss outgoing damage is not simulated in v1.",
      "durationSemantics": "10 sec (moot).",
      "triggerIdentity": "Same when-attacked-10 header as the line above.",
      "targetSet": "enemy (the boss).",
      "nearestWrongModel": "Encoded as an atkPct ▼ on an ALLY (target misread) — would wrongly reduce a unit's damage; or encoded on the boss via some stat that leaks into team damage.",
      "distinguishingAssertion": "Total damage of every unit is byte-identical with and without this line present; no buffApply with stat 'atkPct' and value −9.09 targeting any unit index appears in the log.",
      "inertness": "Zero damage delta everywhere; recorded verbatim in unmodeled.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Equally shares damage taken  for 120 sec.",
      "disposition": "UNMODELED",
      "scope": "Incoming-damage redistribution among self + 2 highest-final-ATK allies — v1 has no incoming-damage pool.",
      "durationSemantics": "120 sec (moot).",
      "triggerIdentity": "'Activates at the start of battle' = passive/one-shot apply at t=0.",
      "targetSet": "self + 2 allies with highest FINAL ATK.",
      "nearestWrongModel": "Tandem-rule trap in reverse: inventing an interaction (e.g. treating the share as a heal/shield event that fires teammates' recovery/shielded triggers). It is neither — no 'heal' nor 'shield' effect, so no recovery/shielded consumer may fire from it.",
      "distinguishingAssertion": "No 'recovery' or 'shielded' events (and no heal/shield effect dispatch) originate from jackal's skill2; all units' totals identical with the line removed.",
      "inertness": "Zero damage delta; zero synthetic recovery/shielded events; recorded verbatim in unmodeled.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "DEF ▲ 8.27% for 120 sec.",
      "disposition": "FAITHFUL",
      "scope": "Generic DEF stat buff — engine-inert in v1 (defPct: self DEF does not affect own damage) but KEPT per the future-consumer rule (taxonomy 7).",
      "durationSemantics": "durationSec:120 — NOTE the fight is 180 s, so the buff genuinely LAPSES at t=120 (expiresFrame ≈ 7200). It is not permanent.",
      "triggerIdentity": "passive, applied at battle start (frame 0). 'At the start of battle' is not an interval and not fullBurstEnter.",
      "targetSet": "self PLUS alliesTopAtk {count:2, excludeSelf:true, byFinalAtk:true} — kit literally says 'highest final ATK', which per the schema's A3 rule sets byFinalAtk (live effectiveAtk ranking), and 'self and 2 ally unit(s)' means self is unconditional, excluded from the top-2 pick.",
      "nearestWrongModel": "alliesTopAtk {count:3} including self in the ranking — jackal is a Defender (lowest static-ATK class), so she'd drop out and a third ally wrongly gains the grant; or byFinalAtk omitted (static ranking) against the literal 'final ATK' wording; or durationSec omitted (permanent).",
      "distinguishingAssertion": "Exactly 3 buffApply {stat:'defPct', value:8.27} events at frame 0: targetIdx set = {jackal's slot} ∪ {the 2 allies with highest live effectiveAtk}, each with expiresFrame ≈ 7200 — red if jackal is absent from the recipient set, if a 3rd ally replaces her, or if no expiry is set.",
      "inertness": "Every unit's totalDamage identical with the block zeroed (defPct inert in v1) — the assertion is on the buffApply events, not damage.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Burst Skill damage ▲ 38.91% for 15 sec",
      "disposition": "GAP",
      "scope": "DOUBLY scoped: only damage instances in the BURST bucket, and only for allies whose Burst Skill description contains 'Affects 1 enemy unit(s)' (single-target bursts). NOT normals, NOT skill procs, NOT AoE-burst allies. The published StatKey list has NO burst-bucket-scoped damage stat at all (nothing like 'burstDamagePct'), let alone a description-gated one — engine primitive missing; needs a new primitive or a per-ally authoring-time qualification, which the driver must reconcile explicitly.",
      "durationSemantics": "durationSec:15 from jackal's own Burst I cast — covers the subsequent B2/B3 casts of that rotation (measured 30-frame chain gaps) and any delayed burst damage landing inside the window.",
      "triggerIdentity": "burstCast (jackal's OWN Burst I; she is B1, cd 20 s) — the buff must be LIVE BEFORE the rotation's B3 cast, because burst-cast damage resolves PRE-Full-Burst. Keying to fullBurstEnter applies it only after the B3's burst damage has already landed.",
      "targetSet": "allies (all, self included — self-effect inert since jackal's own burst deals no damage); effective recipients are only the description-qualifying allies.",
      "nearestWrongModel": "Three, in descending plausibility: (a) keyed to fullBurstEnter — the buff arrives AFTER the B3 burst-cast damage it exists to boost, silently zeroing the kit's signature effect while looking implemented; (b) encoded as generic attackDamagePct to all allies for 15 s — over-credits every bucket of every unit; (c) burst-scoped but UNFILTERED — AoE-burst allies wrongly buffed.",
      "distinguishingAssertion": "Comp: jackal as the SOLE Burst I (controlComp fixes liter at B1, so a custom runComp comp replacing liter is required, keeping a B2 + a qualifying single-target-burst B3 so full bursts actually chain). A/B vs withPatchedOverride(jackal, zero-this-block): (i) the qualifying carry's burst-bucket damage events landing between jackal's burstCast event and fullBurstStart are ×1.3891; (ii) the carry's normal and skill buckets are identical between runs; (iii) a non-qualifying (AoE-burst) ally's burst bucket is identical between runs. Green only under burstCast + burst-bucket + description-gate; red under (a) [no delta at all], (b) [normals move], and (c) [AoE ally moves].",
      "inertness": "All normal/skill-bucket damage of every ally, and the burst damage of every non-qualifying ally, must NOT move.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "DEF ▲ 14.69% for 10 sec.",
      "disposition": "FAITHFUL",
      "scope": "Generic DEF stat buff — inert in v1, kept per future-consumer rule.",
      "durationSemantics": "durationSec:10 from the burst cast.",
      "triggerIdentity": "burstCast (same cast as the line above; distinct 10 s duration vs the 15 s damage line — assert both durations independently, they are not one buff).",
      "targetSet": "allies (all, self included).",
      "nearestWrongModel": "Merged with the 38.91% line into one 15 s block (wrong duration), or keyed to fullBurstEnter (timing shift — damage-inert here but a wrong-trigger tell), or silently dropped.",
      "distinguishingAssertion": "buffApply {stat:'defPct', value:14.69} on all 5 unit indices at jackal's burstCast frame with expiresFrame = castFrame + 600 (≠ the 900-frame expiry of the damage line).",
      "inertness": "Every unit's totalDamage identical with the block zeroed.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Damage Taken ▲ 9.09% (boss debuff, ⚑ cadence)",
    "skill2:DEF ▲ 8.27% (inert stat — event-level assertions only)",
    "burst:Burst Skill damage ▲ 38.91% (GAP — included despite label; the unit's signature line, driver must reconcile the missing primitive, cannot wave it off)",
    "burst:DEF ▲ 14.69% (inert stat — event-level assertions only)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "ATK ▼ 9.09% for 10 sec."
    ],
    "skill2": [
      "Equally shares damage taken  for 120 sec."
    ],
    "burst": []
  },
  "notes": "Where I expect shared-prior misreads, in order of damage: (1) burst 38.91% keyed to fullBurstEnter instead of burstCast — because burst-cast damage lands PRE-FB, an FB-enter keying applies the buff after the B3 nuke it exists to boost, so the kit's signature line becomes silently inert while appearing implemented; the pre-FB landing rule makes this the single most consequential trigger-identity call in the kit. (2) The same line's scope: no StatKey expresses burst-bucket-only damage, so a driver under schema pressure will reach for attackDamagePct or a generic buff — both refuted by the bucket-isolation assertions; this is a genuine engine GAP the driver must name, not paper over. (3) skill1 'when attacked 10 time(s)' misread as jackal's own hitCount:10 — 'attacked' is hits RECEIVED; with no being-attacked event source in v1 the faithful route is an ⚑ interval proxy from measured boss attack cadence (ALWAYS-⚑: estimate + recipe, never silent), and the fire-economy-invariance assertion distinguishes the two. (4) skill1 Damage Taken ▲ dropped as 'defensive' because it sits on a Defender — it is a boss debuff and the kit's second team-damage lever. Reconciliation items: (a) test comp must make jackal the SOLE B1 (controlComp pins liter at B1 — a custom comp is required, retaining B2 + a qualifying single-target-burst B3, since a broken chain makes zero full bursts); (b) the 'Affects 1 enemy unit(s)' description-gate needs a decidable qualification source (ally burst target-kind or per-ally authoring flag) and a comp containing BOTH a qualifying and a non-qualifying burst ally to assert the gate both ways; (c) skill2's 120 s duration is SHORTER than the 180 s fight — assert the lapse, don't model it permanent; (d) the two burst effects carry different durations (15 s vs 10 s) and must be separate buffs with separate expiries.",
  "model": "claude-fable-5"
}


---

# SECTION 5 — S5 BLIND TEST (claude-opus-5, written from prose alone; scripts/kit-autonomy/blind/jackal.test.ts)

## RUN RESULT vs the driver's SHIPPED override (section 7) — driver-run, deterministic (no seed):

- UNMODIFIED blind test: **13 passed | 2 FAILED | 3 skipped (GAP `it.skip`s)**. The 3 skips are the blind author's own GAP dispositions (S1 incoming-attack trigger; damage-share HP pool; single-target-burst-skill scope) — convergence with the driver's DOCUMENTED-GAP treatment.
- The 2 FAILURES are BOTH the blind author's comp-size arithmetic, NOT kit divergences: the test assumes a FIVE-unit team ('all five allies', `jackalBursts * 5`), but `controlComp` fields FOUR units (liter/crown/carry/helm). Actuals: defPct-14.69 holder set = {liter, crown, jackal, helm} (4, not 5); applications = 6 casts × 4 allies = 24 (not 30). The fixture-validity gate PASSED (jackal casts her own burst 6× despite liter co-holding stage I — the engine rotates the two 20s B1s).
- ADAPTED test (driver changed ONLY the two comp-size constants 5→4, assertions otherwise untouched; saved as scripts/kit-autonomy/blind/jackal.adapted.test.ts): **15 passed | 3 skipped | 0 failed — GREEN**.

Classify per contract section I: the two unmodified-RED assertions are RECON_ERROR-class fixture arithmetic (blind miscounted the team size), not driver divergences — every kit-line assertion the blind test encodes is GREEN vs the shipped override.

import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed by driver (gauntlet S5): blind/ sits under kit-autonomy/, not tests/units/

/**
 * jackal (RL/Iron/Defender/Burst I, cd 20s, ammo 6) — BLIND kit spec test.
 * Written from the kit prose alone; the shipped override was not consulted.
 *
 * KIT, structurally:
 *   S1  gate "when attacked 10 time(s)" -> 1 enemy, highest final Max HP
 *         Damage Taken ▲ 9.09% / 10s      ATK ▼ 9.09% / 10s
 *   S2  gate "start of battle" -> self + 2 allies, highest final ATK
 *         equally shares damage taken / 120s     DEF ▲ 8.27% / 120s
 *   BRS -> all allies
 *         Burst Skill damage of skills scoped "Affects 1 enemy unit(s)" ▲ 38.91% / 15s
 *         DEF ▲ 14.69% / 10s
 *
 * DISPOSITIONS (blind read):
 *   S1 both lines  -> GAP. The trigger counts incoming boss attacks; at scope lock the
 *                     boss deals no damage and the sim models no HP pool, so the
 *                     activation condition is unobservable. Damage Taken ▲ is a REAL
 *                     team-wide damage lever, so how it is gated is load-bearing: a
 *                     `passive` encoding buys permanent uptime for free.
 *   S2 share       -> UNMODELED (no HP pool; purely defensive).
 *   S2 DEF         -> FAITHFUL as a defPct buff (inert in v1 by design, but kept per the
 *                     "keep the stat buff even if the engine treats it inert" rule).
 *   BRS 38.91%     -> GAP. The scope is "burst skills whose description says
 *                     'Affects 1 enemy unit(s)'" and no StatKey expresses it. The
 *                     nearest-wrong model is a generic attackDamagePct, which would
 *                     over-credit EVERY ally's every hit for 15s.
 *   BRS DEF        -> FAITHFUL as a defPct buff on all allies.
 *
 * FIXTURE: controlComp('jackal', true) — liter(I) / crown(II) / jackal / helm(III).
 *   Jackal is Burst I and liter already holds stage 1, so jackal may never cast her own
 *   burst in this comp. `burst line casts at all` is therefore a HARD fixture-validity
 *   gate using an override-independent marker block; if it is RED, every burst-line
 *   assertion below is vacuous and the fixture needs a liter-free comp.
 *
 * WHY THE COUNTERFACTUALS DISCRIMINATE:
 *   Every jackal kit line is either defensively inert or lacks a primitive, so stripping
 *   S2+burst must leave the board byte-identical. That claim is only meaningful if the
 *   fixture COULD see an over-credit — so two nearest-wrong overrides (generic 38.91%
 *   attackDamagePct; permanent 9.09% damageTakenPct) are run and asserted to MOVE the
 *   board. Without those, the inertness assertions would pass vacuously.
 */

const SLUG = 'jackal';

type BuffApply = {
  kind: 'buffApply';
  stat: string;
  key: string;
  value: number;
  stacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  refresh?: boolean;
  expiresFrame?: number;
  durationShots?: number;
};

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const buffApplies = (events: SimEvent[]) =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffApply[];

/* The packet ships two contradictory override shapes: slot -> Block[] (OVERRIDE FILE
 * SHAPE) and slot -> { blocks: Block[] } (harness cheat-sheet). Handle both rather than
 * guess, so a shape mismatch cannot masquerade as a kit-faithfulness failure. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Slot = 'skill1' | 'skill2' | 'burst';

function clearSlot(ov: any, slot: Slot): void {
  const s = ov[slot];
  if (!s) return;
  if (Array.isArray(s)) ov[slot] = [];
  else s.blocks = [];
}

function pushBlock(ov: any, slot: Slot, block: any): void {
  const s = ov[slot];
  if (!s) {
    ov[slot] = [block];
    return;
  }
  if (Array.isArray(s)) s.push(block);
  else if (Array.isArray(s.blocks)) s.blocks.push(block);
  else s.blocks = [block];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function run(overrides?: Record<string, unknown>) {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true);
  if (overrides) {
    opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  }
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  const res = runComp(opts);
  return { res, events, tot: totals(res) };
}

// ---- hoisted runs (each is a full 180s sim) ----------------------------------

const base = run();

// S2 + burst stripped: both slots must be offensively inert.
const noS2Burst = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    clearSlot(ov, 'skill2');
    clearSlot(ov, 'burst');
  }),
});

// S1 stripped: isolates whatever (if anything) the damage-taken debuff contributes.
const noS1 = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    clearSlot(ov, 'skill1');
  }),
});

// NEAREST-WRONG A: the 38.91% scoped burst-skill buff encoded as generic Attack Damage.
const wrongGenericBurst = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    pushBlock(ov, 'burst', {
      slot: 'burst',
      trigger: { kind: 'fullBurstEnter' },
      target: { kind: 'allies' },
      effects: [
        {
          kind: 'buff',
          stat: 'attackDamagePct',
          value: 38.91,
          durationSec: 15,
        },
      ],
    });
  }),
});

// NEAREST-WRONG B: the S1 boss debuff encoded as a permanent passive (free uptime).
const wrongPermanentDt = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    pushBlock(ov, 'skill1', {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'buff', stat: 'damageTakenPct', value: 9.09 }],
    });
  }),
});

// FIXTURE PROBE: an inert marker on jackal's own burstCast — does she ever burst here?
const MARKER = 0.001;
const markerRun = run({
  [SLUG]: withPatchedOverride(SLUG, (ov) => {
    pushBlock(ov, 'burst', {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'defPct', value: MARKER }],
    });
  }),
});

const jackalBursts = buffApplies(markerRun.events).filter((b) =>
  near(b.value, MARKER, 1e-6),
).length;

describe('jackal — fixture validity', () => {
  it('jackal is in the comp', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  // Non-vacuity gate for every burst-line assertion. Jackal is Burst I and liter also
  // holds stage 1, so stage-1 selection may never pick her. An inert defPct marker on
  // her own burstCast answers this WITHOUT reading her committed override.
  it('jackal actually casts her own burst in this fixture', () => {
    expect(jackalBursts).toBeGreaterThan(0);
  });
});

describe('jackal skill1 — "when attacked 10 time(s)" -> 1 enemy', () => {
  // The activation counts incoming boss attacks. The scope-lock boss deals no damage and
  // the sim models no HP pool, so there is no primitive that can observe the trigger.
  it.skip('GAP: no incoming-attack counter exists to gate the 10-hit trigger', () => {
    // Requires an incoming-damage / attacked-count channel the engine does not have.
  });

  // Damage Taken ▲ is a genuine team-wide damage lever, so the FAILURE MODE that matters
  // is granting it permanently. Faithful readings: either the line is a GAP (zero
  // applications) or it rides an honest proxy trigger that re-fires (many applications).
  // A SINGLE application is the permanent-passive over-credit. Nearest-wrong B is asserted
  // separately to prove this fixture can actually see the difference.
  it('damage-taken debuff is never a single permanent grant', () => {
    const dt = buffApplies(base.events).filter(
      (b) => b.stat === 'damageTakenPct',
    );
    expect(dt.length === 0 || dt.length > 1).toBe(true);
    for (const b of dt) expect(near(b.value, 9.09)).toBe(true);
  });

  // "Modeled but silently inert" is a real failure mode (debuff authored onto a trigger
  // that never fires, or mis-targeted at an ally instead of the boss). Tie the two
  // observables together: the debuff moves the board IF AND ONLY IF it is applied.
  it('S1 moves the board exactly when the debuff is applied', () => {
    const dt = buffApplies(base.events).filter(
      (b) => b.stat === 'damageTakenPct',
    );
    const identical =
      JSON.stringify(base.tot) === JSON.stringify(noS1.tot);
    expect(identical).toBe(dt.length === 0);
  });

  // The ATK ▼ rides the SAME "Affects 1 enemy unit(s)" target clause as the Damage Taken
  // ▲ — it debuffs the BOSS, and the boss has no ATK the sim reads. The nearest-wrong is
  // a sign/target slip that lands -9.09% atkPct on an ALLY, which would cut team damage.
  it('the enemy ATK debuff never lands on an ally', () => {
    const allyAtkDown = buffApplies(base.events).filter(
      (b) =>
        (b.stat === 'atkPct' || b.stat === 'casterAtkPct') && b.value < 0,
    );
    expect(allyAtkDown).toEqual([]);
  });
});

describe('jackal skill2 — start of battle -> self + 2 highest final ATK', () => {
  const defBuffs = buffApplies(base.events).filter(
    (b) => b.stat === 'defPct' && near(b.value, 8.27),
  );

  // Discriminates against dropping the line as "DEF is inert in v1, skip it": the
  // taxonomy requires keeping the stat buff for future consumers/scalers.
  it('grants DEF 8.27% at battle start', () => {
    expect(defBuffs.length).toBeGreaterThan(0);
  });

  // Target set: self + 2 allies = exactly 3 recipients. Nearest-wrong is `allies`
  // (all 5) or self-only (1).
  it('covers exactly 3 units, including jackal', () => {
    const slugs = new Set(defBuffs.map((b) => b.targetSlug));
    expect(slugs.size).toBe(3);
    expect(slugs.has(SLUG)).toBe(true);
  });

  // Duration semantics: 120s is SHORTER than the 180s fight, so it genuinely lapses.
  // Applied by a start-of-battle (frame 0) trigger => expiresFrame ~ 120*60 = 7200.
  // Nearest-wrong: authored permanent (no durationSec) or stretched to fight length.
  it('the DEF window is 120s, not permanent', () => {
    for (const b of defBuffs) {
      expect(b.expiresFrame).toBeDefined();
      expect(Number.isFinite(b.expiresFrame as number)).toBe(true);
      expect(b.expiresFrame as number).toBeGreaterThan(7140);
      expect(b.expiresFrame as number).toBeLessThan(7260);
    }
  });

  // "Equally shares damage taken" — no HP pool, no boss damage: purely defensive.
  it.skip('GAP: damage-sharing needs an HP pool the v1 sim does not model', () => {
    // Requires incoming-damage routing between allies.
  });
});

describe('jackal burst — all allies', () => {
  const defBuffs = buffApplies(base.events).filter(
    (b) => b.stat === 'defPct' && near(b.value, 14.69),
  );

  it('grants DEF 14.69% to all five allies', () => {
    expect(jackalBursts).toBeGreaterThan(0); // non-vacuity
    expect(defBuffs.length).toBeGreaterThan(0);
    expect(new Set(defBuffs.map((b) => b.targetSlug)).size).toBe(5);
  });

  // Applications should scale with the number of casts (5 allies per cast), not be a
  // one-shot grant. Discriminates a burstCast trigger from a passive.
  it('DEF 14.69% is re-granted per burst cast, not once', () => {
    expect(defBuffs.length).toBe(jackalBursts * 5);
  });

  // The 38.91% line is scoped to burst skills whose description reads
  // "Affects 1 enemy unit(s)". No StatKey expresses that scope, so the faithful
  // disposition is GAP; the enactable failure is encoding it generically.
  it.skip('GAP: no StatKey scopes a buff to single-target burst skills', () => {
    // Needs a burst-skill-damage bucket keyed on the target-clause scope.
  });

  // The over-credit guard. A generic encoding boosts every ally hit for 15s per rotation.
  it('38.91% never appears as a generic damage buff', () => {
    const generic = new Set([
      'attackDamagePct',
      'atkPct',
      'casterAtkPct',
      'trueDamagePct',
      'elementDamagePct',
      'critDamagePct',
      'sustainedDamagePct',
    ]);
    const bad = buffApplies(base.events).filter(
      (b) => generic.has(b.stat) && near(b.value, 38.91),
    );
    expect(bad).toEqual([]);
  });
});

describe('jackal — inertness of the modeled kit', () => {
  // Every S2/burst line is defensive (DEF, damage-share) or unscoped-GAP, so removing
  // both slots must not shift a single unit's damage.
  it('stripping skill2 + burst leaves the board byte-identical', () => {
    expect(noS2Burst.tot).toEqual(base.tot);
  });

  // Proves the assertion above is NOT vacuous: the fixture demonstrably detects the
  // generic-encoding over-credit it is guarding against.
  it('the generic 38.91% mis-encoding WOULD move the board', () => {
    expect(wrongGenericBurst.tot).not.toEqual(base.tot);
  });

  // Same non-vacuity proof for the permanent damage-taken debuff.
  it('a permanent 9.09% damage-taken debuff WOULD move the board', () => {
    expect(wrongPermanentDt.tot).not.toEqual(base.tot);
  });

  // Teammates must be untouched by jackal's own damage output changing: her kit grants
  // no offensive buff at all, so her slot's presence in the buff graph is DEF-only.
  it('jackal contributes no offensive buff to any teammate', () => {
    const offensive = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'attackDamagePct',
      'critRatePct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'chargeDamagePct',
      'fireRatePct',
      'reloadSpeedPct',
      'maxAmmoPct',
      'maxAmmoFlat',
      'burstGenPct',
    ]);
    const jackalIdx = base.res.units?.findIndex?.(
      (u: { slug: string }) => u.slug === SLUG,
    );
    const bad = buffApplies(base.events).filter(
      (b) =>
        offensive.has(b.stat) &&
        jackalIdx !== undefined &&
        jackalIdx >= 0 &&
        b.casterIdx === jackalIdx,
    );
    expect(bad).toEqual([]);
  });
});


---

# SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5, written from prose alone; scripts/kit-autonomy/blind/jackal.override.json)

## DIFF vs the driver's shipped override (section 7) — driver-authored summary for convenience; judge the artifacts:

CONVERGED: skill2 DEF 8.27/120s (passive, self + alliesTopAtk{count:2, excludeSelf:true}) — identical structure (block order swapped, no damage consequence); burst DEF 14.69/10s (burstCast → allies → defPct) — IDENTICAL; burst 38.91% line — BOTH unmodeled with the SAME reasoning (no burst-skill-damage StatKey/bucket; unscoped attackDamagePct would be an over-credit — S6: 'deliberately unmodeled rather than approximated'); S1 ATK▼9.09% + S2 damage-share — BOTH unmodeled.

DIVERGENCE 1 (skill1 Damage Taken ▲9.09%): S6 MODELS it as hitCount:10 (jackal's OWN shots) → enemy damageTakenPct 9.09/10s, explicitly flagged in its own caveats as a stand-in: "'Activates when attacked 10 time(s)' is an INCOMING-hit counter (boss attacks on the squad), not an owner hit/shot counter … modeled as hitCount:10 (owner rounds) as a stand-in cadence. UNMEASURED — the uptime this produces is a guess." The driver leaves it UNMODELED (⚑1): the kit's trigger counts hits RECEIVED; the sim has no incoming-damage model and no boss attack cadence to anchor any proxy (skillCooldownsSec.skill1 = null — no CD either), so ANY encoding fires on fabricated uptime (theme-4b class). Binding precedent: maiden's identical 'attacked 20 times' Revenge cluster is UNMODELED + ⚑ (gauntlet 2026-08-03, cross-family certified GO); yulha/noise/admi same class. The driver's unit test J1 pins both directions: zero damageTakenPct applications at baseline, and the hitCount:10 stand-in (the S6 encoding) lifts team totals — i.e. it is observationally an over-credit on this basis.

DIVERGENCE 2 (skill2 byFinalAtk): S6 omits byFinalAtk:true on alliesTopAtk, reasoning the DEF buff is inert so ranking moves zero damage; the driver sets byFinalAtk:true per the repo's A3 literal-word rule (kit says 'highest FINAL ATK' — milk/maxwell/miranda precedent; S2b derived it independently). Zero damage consequence either way (defPct inert); the split is encoding-rule adherence, flagged for the judge.

{
  "slug": "jackal",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 10
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 9.09,
          "durationSec": 10
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
        "kind": "alliesTopAtk",
        "count": 2,
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 8.27,
          "durationSec": 120
        }
      ]
    },
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
          "stat": "defPct",
          "value": 8.27,
          "durationSec": 120
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
          "kind": "buff",
          "stat": "defPct",
          "value": 14.69,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "ATK \u25bc 9.09% for 10 sec."
    ],
    "skill2": [
      "Equally shares damage taken  for 120 sec."
    ],
    "burst": [
      "Burst Skill damage of skills with \"Affects 1 enemy unit(s)\" in the description \u25b2 38.91% for 15 sec."
    ]
  },
  "caveats": [
    "\u2691 skill1 trigger: \"Activates when attacked 10 time(s)\" is an INCOMING-hit counter (boss attacks on the squad), not an owner hit/shot counter. v1 models no boss damage, so the real cadence is unobservable in-sim; modeled as hitCount:10 (owner rounds) as a stand-in cadence. UNMEASURED \u2014 the Damage Taken \u25b2 uptime this produces is a guess, not a reading.",
    "\u2691 skill1 target: \"1 enemy unit(s) with the highest final Max HP\" = the sole boss at scope lock; modeled as {kind:'enemy'}. The paired ATK \u25bc 9.09% is a boss-offense debuff with no sim consumer (boss ATK is unmodeled) \u2014 recorded in unmodeled, not as a block.",
    "\u2691 skill2 target split: the kit line covers \"self and 2 ally unit(s) with the highest final ATK\". alliesTopAtk has no self-inclusive form, so it is authored as TWO blocks (alliesTopAtk count:2 excludeSelf:true + self). If the game instead ranks self INTO the top-2 pool (i.e. self may occupy one of the two slots), this over-covers by one ally. Kit says \"self AND 2 ally\", which reads as exclude-then-take-2 \u2014 the encoding follows the literal wording.",
    "\u2691 skill2 \"highest final ATK\" is a FINAL-ATK ranking per the literal-word rule, but byFinalAtk is NOT set here: the buff is DEF only and offensively inert, so live-vs-static ranking moves zero damage. Set byFinalAtk:true if a future consumer makes the target set matter.",
    "defPct is inert in v1 (self DEF does not affect own damage). All three DEF lines are kept for kit completeness / future consumers, per the do-not-skip-DEF rule.",
    "\u2691 burst conditional-damage buff: \"Burst Skill damage of skills with 'Affects 1 enemy unit(s)' in the description \u25b2 38.91%\" is a SCOPED buff on a per-ally kit-text predicate. The schema has no StatKey for 'burst-skill damage of single-target-flagged skills' \u2014 attackDamagePct/atkPct would be an unscoped over-credit across the entire team's whole damage. Left unmodeled rather than fudged. Recipe: add a scoped StatKey (e.g. burstSingleTargetDamagePct) gated on a per-override boolean marking which units' burst blocks carry an 'Affects 1 enemy unit(s)' clause, then A/B the carriers.",
    "\u2691 burst trigger identity: modeled as burstCast (this unit is Burst I; the line sits in her OWN burst block with no 'entering Full Burst' clause). Burst-cast damage/auras land pre-Full-Burst, so the DEF aura carries no FB major \u2014 correct for a stat buff.",
    "\u2691 cadence tuple (ammo 6 / reloadFrames 142 / chargeFrames 60 / RL) is datamined and known-unreliable; unverified for this unit.",
    "\"Equally shares damage taken\" is a survivability redistribution with no v1 consumer (the boss deals no modeled damage and nobody dies at scope lock) \u2014 recorded verbatim in unmodeled."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Jackal (RL/Iron/Defender/Burst I) is a defensive/utility kit: her only team-damage-relevant live line is the S1 Damage Taken \u25b2 9.09% boss debuff (10 s), keyed to an incoming-hit counter the v1 sim cannot observe \u2014 its uptime is a stand-in cadence, not a measurement. The burst's headline 38.91% is a SCOPED buff on allies' single-target burst skills with no matching StatKey; it is deliberately unmodeled rather than approximated by an unscoped damage stat, which would over-credit the whole team. Three DEF grants (S2 8.27%/120 s to self + top-2-ATK allies, burst 14.69%/10 s to all allies) are modeled for kit completeness and are inert in v1. Damage-shared / ATK\u25bc lines have no v1 consumer."
}

---

# SECTION 7 — DRIVER IMPLEMENTATION

## 7a. Driver unit spec — scripts/tests/units/jackal.test.ts (17 tests; 17/17 GREEN vs shipped; every FAITHFUL line pinned GREEN vs shipped AND RED vs its named nearest-wrong counterfactual via withPatchedOverride; independent verification: scripts/kit-autonomy/reviews/jackal.verify.txt)

// PER-UNIT KIT SPEC — `jackal` (Jackal — RL / Defender / Iron / Burst I, cd 20s, ammo 6,
// reloadFrames 142, chargeFrames 60, chargeMult 250, normalMult 65.02). Kit-autonomy
// gauntlet 2026-08-04 (test-first re-derivation). ⚠ EXACT SLUG: `jackal` — the base
// Missilis RL Defender; no variant exists, but the slug-disambiguation lint passes clean
// on the disambiguated full form.
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/jackal.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates exactly
// as a verification gauntlet would (maiden/milk precedent).
//
// Kit (blablalink prose, data/characters.json → characters.jackal.skills, lvl 10):
//   S1 ■ attacked 10× → 1 enemy, highest final Max HP:
//        Damage Taken ▲9.09% for 10 sec + ATK ▼9.09% for 10 sec            [UNMODELED — J1]
//   S2 ■ start of battle → self + 2 allies highest final ATK:
//        Equally shares damage taken for 120 sec                            [UNMODELED — J2]
//        DEF ▲8.27% for 120 sec                                             [FAITHFUL — J3]
//   BU ■ all allies:
//        Burst Skill damage of skills with "Affects 1 enemy unit(s)" in the
//        description ▲38.91% for 15 sec                                     [UNMODELED — J4]
//        DEF ▲14.69% for 10 sec                                             [FAITHFUL — J5]
//
// JACKAL IS A TANK; HER KIT IS ALMOST ENTIRELY OUT-OF-DOMAIN FOR A DAMAGE SIM. Two of the
// five kit lines are modeled, and BOTH are damage-INERT in v1 (defPct — self/team DEF never
// feeds damage dealt; the boss never attacks). The other three are documented omissions:
//
//   • J1 (the whole S1 cluster) is gated on "attacked 10 times" — the sim has NO
//     incoming-damage model and NO attacked-count trigger (v1 boss is immortal and never
//     acts), so the line can never fire. Its Damage-Taken half IS damage-relevant (a 9.09%
//     team amp on the boss while active), but granting it without a fireable trigger would
//     fabricate uptime the sim cannot produce — maiden's Revenge cluster is the identical
//     kit archetype and the binding precedent (faithful omission + ⚑, not a fudge). The
//     ATK▼ half is separately out-of-domain: the engine drops enemy ATK▼ debuffs at
//     dispatch (boss deals no damage).
//   • J2 (damage share) has no redistribution primitive and nothing to redistribute
//     (no incoming damage) — bay/marciana/poli precedent.
//   • J4 (the burst's headline buff) has NO engine vocabulary: the formula SSOT
//     (docs/data/nikke-damage-formula.md) has no Burst-Skill-Damage bucket/stat
//     (StatKey has no burstSkillDamagePct; dealDamage's dmgUp bucket carries no
//     burst-category term), AND the scope is a per-skill DESCRIPTION-TEXT condition
//     ("skills with 'Affects 1 enemy unit(s)' in the description") for which no gate
//     exists. trina carries the SAME mechanic family ("Burst Skill damage of skills with
//     'Affects all enemies'") and her 2026-07-24 gauntlet (GO, cross-family corroborated)
//     ruled it UNMODELED + caveat — teammates' scoped burst nukes read COLD in trina/jackal
//     comps. This spec adopts the binding precedent rather than fake the amp through an
//     unscoped Damage-Up stat (the nearest-wrong counterfactual below, J4c).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   J3  DEF ▲8.27% is defPct (inert) — an atkPct misread would move every holder's damage;
//       a self-only/all-allies mis-scope moves the holder set; a wrong duration (60s) moves
//       the window; removal must leave totals BYTE-IDENTICAL (the inertia proof).
//   J5  DEF ▲14.69% is defPct on burstCast — magnitude pin (lvl-1 8.08 is wrong), all-allies
//       scope (4 holders per cast), 10s window, and TIMING: the buff lands on jackal's OWN
//       cast frame (burstCast), not at Full Burst entry (fullBurstEnter lands later, at the
//       stage-3 completion); removal leaves totals byte-identical.
//   J1  the omission is a CHOICE: zero damageTakenPct applications at baseline, while the
//       'always-up' and 'attacks-misread' counterfactuals both apply the debuff and lift
//       team totals — proving the shipped zero is deliberate, not a stale fixture.
//   J4  the omission is a CHOICE: zero attackDamagePct (or any damage stat) granted by
//       jackal at baseline, while the unscoped-38.91% counterfactual lifts team totals —
//       proving the amp is not implicitly shipped. (The TRUE mechanic would lift only
//       single-target burst damage; even that weaker amp changes totals, so the totals
//       discrimination holds against any encoding of the line.)
//
// Fixture: jackal/crown/ada/helm, boss Fire, focus jackal (milk's B1 fixture mirrored —
// the standard controlComp cannot be used: liter is also Burst I and would take/alternate
// the stage-I slot, halving jackal's casts). jackal is the SOLE B1 (20s CD covers stage I
// alone; crown B2 20s; ada + helm B3 40s alternate), so she casts every Full Burst and the
// focus keeps her RL gauge ahead of the 20s CD (RL = charge weapon, focus ×2.5 gauge).
// Iron vs the Fire boss is elementally neutral. Deterministic (no seed); event-log over
// totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['jackal', 'crown', 'ada', 'helm'] as const;
/** slot order: jackal 0 / crown 1 / ada 2 / helm 3. */
const JACKAL = 0;
const CROWN = 1;
const ADA = 2;
const HELM = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'jackal',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

const sum = (t: Record<string, number>) =>
  SLUGS.reduce((acc, s) => acc + (t[s] ?? 0), 0);

// ---- counterfactual patches -------------------------------------------------------------------
/** J5 wrong magnitude: the lvl-1 value 8.08 instead of the lvl-10 14.69. */
const j5Weak = withPatchedOverride('jackal', (ov) => {
  ov.burst[0].effects[0].value = 8.08;
});
/** J5 wrong trigger: fullBurstEnter (lands at the stage-3 completion) instead of burstCast
 *  (lands on jackal's OWN cast frame, before the FB window opens). */
const j5OnFbEnter = withPatchedOverride('jackal', (ov) => {
  ov.burst[0].trigger = { kind: 'fullBurstEnter' };
});
/** J5 nearest-wrong misread: DEF▲ as an OFFENSIVE atkPct buff (would move every holder's
 *  damage — defPct is the inert-by-construction stat). */
const j5AtkMisread = withPatchedOverride('jackal', (ov) => {
  ov.burst[0].effects[0].stat = 'atkPct';
});
/** J5 wrong duration: 15 sec instead of the kit's 10. */
const j5Long = withPatchedOverride('jackal', (ov) => {
  ov.burst[0].effects[0].durationSec = 15;
});
/** J5 reference: the burst DEF block removed entirely (proves it is inert, not live). */
const j5Removed = withPatchedOverride('jackal', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.burst.length === before) {
    throw new Error('jackal burst defPct block missing — fixture is stale');
  }
});
/** J3 nearest-wrong misread: both S2 DEF grants as OFFENSIVE atkPct buffs. */
const j3AtkMisread = withPatchedOverride('jackal', (ov) => {
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'defPct') e.stat = 'atkPct';
    }
  }
});
/** J3 wrong scope: the DEF grant hits all allies instead of self + the 2 highest-final-ATK. */
const j3AllAllies = withPatchedOverride('jackal', (ov) => {
  ov.skill2 = ov.skill2.filter((b: any) => b.target.kind !== 'alliesTopAtk');
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'passive' },
    target: { kind: 'allies' },
    effects: [{ kind: 'buff', stat: 'defPct', value: 8.27, durationSec: 120 }],
  });
});
/** J3 wrong duration: 60 sec instead of the kit's 120. */
const j3Short = withPatchedOverride('jackal', (ov) => {
  for (const b of ov.skill2) {
    for (const e of b.effects) e.durationSec = 60;
  }
});
/** J3 wrong rank direction: the 2 LOWEST-final-ATK allies instead of the 2 highest. */
const j3Lowest = withPatchedOverride('jackal', (ov) => {
  for (const b of ov.skill2) {
    if (b.target.kind === 'alliesTopAtk') b.target.kind = 'alliesLowestAtk';
  }
});
/** J3 reference: both S2 DEF blocks removed entirely (proves them inert, not live). */
const j3Removed = withPatchedOverride('jackal', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill2.length === before) {
    throw new Error('jackal skill2 defPct blocks missing — fixture is stale');
  }
});
/** J1 the 'always-up' mis-model: the S1 Damage-Taken debuff granted passively on the boss,
 *  i.e. the uptime fabricated without a fireable attacked-10x trigger. */
const j1AlwaysUp = withPatchedOverride('jackal', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'passive' },
    target: { kind: 'enemy' },
    effects: [{ kind: 'buff', stat: 'damageTakenPct', value: 9.09 }],
  });
});
/** J1 the 'attacks-misread' mis-model: "attacked 10 times" read as "attacks 10 times"
 *  (hitCount on jackal's OWN shots) — the nearest-wrong trigger encoding. */
const j1AttacksMisread = withPatchedOverride('jackal', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 10 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 9.09, durationSec: 10 },
    ],
  });
});
/** J4 the unscoped-amp mis-model: the burst's 38.91% encoded as an all-allies Attack
 *  Damage buff — wrong bucket (Damage Up, not a Burst-Skill-Damage bucket) AND wrong scope
 *  (all damage, not single-target burst skills). The optimistic encoding the shipped
 *  override deliberately DOES NOT adopt (trina precedent). */
const j4UnscopedAmp = withPatchedOverride('jackal', (ov) => {
  ov.burst.push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'allies' },
    effects: [
      { kind: 'buff', stat: 'attackDamagePct', value: 38.91, durationSec: 15 },
    ],
  });
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const weak = run({ jackal: j5Weak });
const onFbEnter = run({ jackal: j5OnFbEnter });
const j5atk = run({ jackal: j5AtkMisread });
const long = run({ jackal: j5Long });
const j5removed = run({ jackal: j5Removed });
const j3atk = run({ jackal: j3AtkMisread });
const j3allies = run({ jackal: j3AllAllies });
const j3short = run({ jackal: j3Short });
const j3lowest = run({ jackal: j3Lowest });
const j3removed = run({ jackal: j3Removed });
const alwaysUp = run({ jackal: j1AlwaysUp });
const attacksMisread = run({ jackal: j1AttacksMisread });
const unscopedAmp = run({ jackal: j4UnscopedAmp });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const jackalBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === JACKAL && b.stat === stat);
const jackalBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'jackal'
  );

describe('jackal — kit spec', () => {
  describe('fixture sanity — the B1 chain actually runs', () => {
    it('jackal is the sole B1 and casts every Full Burst (>= 6 casts / 180s)', () => {
      const casts = jackalBursts(base.events).length;
      expect(casts).toBeGreaterThanOrEqual(6);
    });
    it('her RL weapon deals damage (bare-weapon baseline; her kit grants herself nothing)', () => {
      expect(base.totals.jackal).toBeGreaterThan(0);
    });
  });

  describe('J3 — S2 battle-start DEF ▲8.27% for 120s to self + 2 highest-final-ATK allies', () => {
    const applied = jackalBuff(base.events, 'defPct').filter(
      (b) => b.frame === 0
    );

    it('fires once at battle start (passive, frame 0) with the lvl-10 magnitude', () => {
      expect(applied.length).toBe(3); // self + 2 allies, excludeSelf on the top-2 block
      expect([...new Set(applied.map((b) => b.value))]).toEqual([8.27]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
    });

    it('reaches jackal herself + exactly 2 allies (self + top-2 final ATK, not all allies)', () => {
      const holders = new Set(applied.map((b) => b.targetIdx));
      expect(holders.size).toBe(3);
      expect(holders.has(JACKAL)).toBe(true);
      // The all-allies counterfactual widens the holder set to all four units.
      const widened = new Set(
        jackalBuff(j3allies.events, 'defPct')
          .filter((b) => b.frame === 0)
          .map((b) => b.targetIdx)
      );
      expect(widened.size, 'all-allies scope must widen the holder set').toBe(
        4
      );
    });

    it('ranks by HIGHEST final ATK — the lowest-2 counterfactual swaps a holder', () => {
      const holders = new Set(
        applied.filter((b) => b.targetIdx !== JACKAL).map((b) => b.targetIdx)
      );
      const lowestHolders = new Set(
        jackalBuff(j3lowest.events, 'defPct')
          .filter((b) => b.frame === 0 && b.targetIdx !== JACKAL)
          .map((b) => b.targetIdx)
      );
      expect(
        lowestHolders,
        'lowest-2 ranking must select a different ally pair than highest-2'
      ).not.toEqual(holders);
    });

    it('lasts exactly 120 sec (7200 frames), not 60', () => {
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([120 * FPS]);
      expect(
        [
          ...new Set(
            jackalBuff(j3short.events, 'defPct')
              .filter((b) => b.frame === 0)
              .map((b) => b.expiresFrame! - b.frame)
          ),
        ],
        'the 60s counterfactual must shrink the window'
      ).toEqual([60 * FPS]);
    });

    it('is INERT in v1: an atkPct misread would move damage, defPct removal changes nothing', () => {
      // The offensive misread changes team totals (DEF is not ATK).
      expect(sum(j3atk.totals)).not.toEqual(sum(base.totals));
      // defPct itself is damage-neutral: removal leaves EVERY unit byte-identical.
      for (const s of SLUGS) {
        expect(j3removed.totals[s], `${s} total with J3 removed`).toEqual(
          base.totals[s]
        );
      }
    });
  });

  describe('J5 — burst DEF ▲14.69% for 10s to all allies on her OWN cast', () => {
    const casts = jackalBursts(base.events);
    const castFrames = new Set(casts.map((c) => c.frame));
    const applied = jackalBuff(base.events, 'defPct').filter(
      (b) => b.frame !== 0
    );

    it('fires once per burst cast at the lvl-10 magnitude (not the lvl-1 8.08)', () => {
      expect(casts.length).toBeGreaterThan(0);
      expect(applied.length).toBe(casts.length * 4); // all allies incl. jackal
      expect([...new Set(applied.map((b) => b.value))]).toEqual([14.69]);
      expect([
        ...new Set(
          jackalBuff(weak.events, 'defPct')
            .filter((b) => b.frame !== 0)
            .map((b) => b.value)
        ),
      ]).toEqual([8.08]);
    });

    it('reaches ALL four allies on every cast', () => {
      for (const cf of castFrames) {
        const holders = new Set(
          applied.filter((b) => b.frame === cf).map((b) => b.targetIdx)
        );
        expect(holders).toEqual(new Set([JACKAL, CROWN, ADA, HELM]));
      }
    });

    it('lands on her own burstCast frames (burstCast, not fullBurstEnter)', () => {
      for (const b of applied) {
        expect(castFrames.has(b.frame), 'buff frame must be a cast frame').toBe(
          true
        );
      }
      // The fullBurstEnter counterfactual lands at the stage-3 completion, NOT the cast frame.
      const fbEnterApplied = jackalBuff(onFbEnter.events, 'defPct').filter(
        (b) => b.frame !== 0
      );
      expect(fbEnterApplied.length).toBeGreaterThan(0);
      expect(
        fbEnterApplied.every((b) => !castFrames.has(b.frame)),
        'fullBurstEnter applications must land off the cast frames'
      ).toBe(true);
    });

    it('lasts exactly 10 sec (600 frames), not 15', () => {
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
      expect(
        [
          ...new Set(
            jackalBuff(long.events, 'defPct')
              .filter((b) => b.frame !== 0)
              .map((b) => b.expiresFrame! - b.frame)
          ),
        ],
        'the 15s counterfactual must widen the window'
      ).toEqual([15 * FPS]);
    });

    it('is INERT in v1: an atkPct misread would move damage, defPct removal changes nothing', () => {
      expect(sum(j5atk.totals)).not.toEqual(sum(base.totals));
      for (const s of SLUGS) {
        expect(j5removed.totals[s], `${s} total with J5 removed`).toEqual(
          base.totals[s]
        );
      }
    });
  });

  describe('J1 — S1 (attacked-10× → Damage Taken ▲9.09% + ATK ▼9.09%) is genuinely unmodeled', () => {
    it('applies NO damageTakenPct debuff — the attacked-10x trigger cannot fire in-sim', () => {
      expect(buffs(base.events).filter((b) => b.stat === 'damageTakenPct'))
        .toHaveLength(0);
    });

    it("the omission is a choice: both fireable-counterpart counterfactuals apply the debuff and lift team totals", () => {
      const alwaysUpDt = buffs(alwaysUp.events).filter(
        (b) => b.stat === 'damageTakenPct'
      );
      const misreadDt = buffs(attacksMisread.events).filter(
        (b) => b.stat === 'damageTakenPct'
      );
      expect(alwaysUpDt.length).toBeGreaterThan(0);
      expect(misreadDt.length).toBeGreaterThan(0);
      expect(sum(alwaysUp.totals)).toBeGreaterThan(sum(base.totals));
      expect(sum(attacksMisread.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('J4 — the burst Burst-Skill-damage amp is genuinely unmodeled (trina precedent)', () => {
    it('jackal grants NO damage stat — her only buffs are the two inert defPct lines', () => {
      const granted = new Set(
        buffs(base.events)
          .filter((b) => b.casterIdx === JACKAL)
          .map((b) => b.stat)
      );
      expect(granted).toEqual(new Set(['defPct']));
    });

    it('the omission is a choice: the unscoped-38.91% counterfactual lifts team totals', () => {
      expect(
        buffs(unscopedAmp.events).filter(
          (b) => b.stat === 'attackDamagePct' && b.casterIdx === JACKAL
        ).length
      ).toBeGreaterThan(0);
      expect(sum(unscopedAmp.totals)).toBeGreaterThan(sum(base.totals));
    });
  });

  describe('J2 — S2 damage-share is out-of-domain (documented, no damage assertion)', () => {
    it('the sim models no incoming damage and no redistribution — recorded verbatim in unmodeled', () => {
      // Nothing to assert behaviorally: v1 boss deals no damage, so there is nothing to
      // share. The line sits verbatim in unmodeled.skill2 (bay/marciana/poli precedent);
      // this test documents that the omission is load-bearing-neutral.
      expect(base.totals.jackal).toBeGreaterThan(0);
    });
  });
});


## 7b. Driver override — src/skills/overrides/jackal.json (validate-overrides PASS; no `ignored` blocks; unmodeled verbatim; ⚑1/⚑2 with estimate+recipe+tier in note)

{
  "note": "jackal (Jackal — RL / Defender / Iron / Burst I, cd 20s, ammo 6, reloadFrames 142, chargeFrames 60, chargeMult 250, normalMult 65.02, Missilis). Kit-autonomy gauntlet 2026-08-04: FROM-SCRATCH build (no prior override / kit-status row; simSupported was false) — test-first re-derivation pinned by scripts/tests/units/jackal.test.ts (groups J1-J5). Cross-family S2b (claude-fable-5) independently re-derived every encodable line and converged on the exact encodings below (leakDetected null). TIER 2: scoped buff (the burst's description-text scope is meta-defining) + an out-of-domain attacked-counter cluster. JACKAL IS A TANK; HER KIT IS ALMOST ENTIRELY OUT-OF-DOMAIN FOR A DAMAGE SIM. Her only two modeled lines are BOTH damage-INERT defPct grants (self/team DEF never feeds damage dealt in v1 — the boss never attacks); everything else is documented UNMODELED. She contributes her bare RL weapon damage and zero offensive kit support on this basis — her board/comps read COLD by exactly the amount of the two documented engine gaps below (honest omission, not fudge — maiden precedent). SKILL1 ('Happy Jackal', 'Activates when attacked 10 time(s). Affects 1 enemy unit(s) with the highest final Max HP. Damage Taken ▲ 9.09% for 10 sec. ATK ▼ 9.09% for 10 sec.') is UNMODELED IN FULL (all three verbatim lines in unmodeled.skill1): the trigger is a counter of hits RECEIVED — the sim has NO incoming-damage model, NO attacked-count trigger primitive, and the v1 boss is immortal and never acts, so the line can never fire. Its Damage-Taken half IS damage-relevant (a 9.09% boss debuff = team-wide amp while active), but granting it without a fireable trigger would fabricate uptime the sim cannot produce — maiden's Revenge cluster ('attacked 20 times') is the identical kit archetype and the binding precedent (faithful omission + ⚑1, cross-family certified). The nearest-wrong encodings are pinned RED in the unit test: a passive always-up damageTakenPct and an 'attacks-misread' hitCount:10 (own shots) both apply the debuff and lift team totals — the shipped zero is a choice. The ATK▼ half is separately out-of-domain: the engine drops enemy ATK▼ debuffs at dispatch (crow precedent — the immortal DEF=0 boss deals no damage). SKILL2 ('Jumpin' Jackal Flash', 'Activates at the start of battle. Affects self and 2 ally unit(s) with the highest final ATK.'): line 1 'Equally shares damage taken for 120 sec.' is UNMODELED (verbatim) — no damage-redistribution primitive and no incoming damage to redistribute; defensive (bay/marciana/poli precedent). Line 2 'DEF ▲ 8.27% for 120 sec.' is MODELED as two passive (frame-0) defPct 8.27/120s blocks: self + alliesTopAtk{count:2, excludeSelf:true, byFinalAtk:true}. byFinalAtk per the A3 literal-word rule (the kit says 'highest FINAL ATK' — milk/maxwell/miranda precedent); excludeSelf because 'self AND 2 allies' = three distinct units. The 120s duration LAPSES at t=120 in the 180s fight (asserted, not permanent). defPct is damage-INERT in v1 (novel/poli/crust/sakura/diesel precedent; the unit test proves byte-identical totals with the blocks removed). BURST ('Crazy Jackal', B1, cd 20s, 'Affects all allies.'): line 1 'Burst Skill damage of skills with \"Affects 1 enemy unit(s)\" in the description ▲ 38.91% for 15 sec.' is UNMODELED (verbatim) — ENGINE GAP, trina precedent (her burst carries the SAME mechanic family, 'Burst Skill damage of skills with \"Affects all enemies\"', and her 2026-07-24 gauntlet certified GO with it documented exactly this way): (a) the formula SSOT (docs/data/nikke-damage-formula.md) has NO Burst-Skill-Damage bucket — StatKey has no burstSkillDamagePct and dealDamage's dmgUp bracket carries no burst-category term; (b) the scope is a per-skill DESCRIPTION-TEXT condition for which no gate primitive exists (see ⚑2). The nearest-wrong encoding — unscoped all-allies attackDamagePct 38.91 — over-credits every bucket of every unit (wrong bucket AND wrong scope) and is pinned RED in the unit test. Line 2 'DEF ▲ 14.69% for 10 sec.' is MODELED as burstCast -> allies -> defPct 14.69/10s (her OWN cast — burstCast, not fullBurstEnter; lands on the cast frame before the FB window opens; inert in v1, byte-identical-totals pinned). Cadence: no ⚑ — the cadence-tuple flag was RETIRED by owner ruling 2026-07-25 (datamine tuple reliable; SMG confound resolved); no charFixes. Burst gauge: no row in data/gauge-per-shot.json — the class-modal fallback applies; her kit carries no gauge line (flatPerTrigger 0 is faithful). NO `ignored` blocks. Faithful>fit; measured>fudge; every modeled magnitude is verbatim lvl-10 kit text (DATAMINED). ⚑ LIST: [⚑1] (OUT-OF-DOMAIN, incoming-damage subsystem — TIER 2) the entire S1 attacked-10x cluster: Damage Taken ▲9.09% + ATK ▼9.09% on the 1 highest-final-Max-HP enemy, 10s. estimate = if fireable, near-permanent uptime after the first 10 hits taken (her Defender/tank role feeds the counter in real fights), i.e. a ~+9.09% team-wide amp for ~the whole fight; the ATK▼ half is zero damage impact by construction (the engine drops enemy ATK▼ debuffs — the immortal boss deals no damage). recipe = needs an incoming-damage / attacked-count trigger primitive (neither exists; the v1 boss never acts) + a measured boss attack cadence/targeting before any encoding — an unanchored interval proxy would be theme-4b fabrication (there is no datamined skill cooldown for S1: skillCooldownsSec.skill1 = null). tier = out-of-domain (the whole subsystem the sim deliberately lacks — maiden/yulha/noise/admi precedent). [⚑2] (ENGINE GAP — TIER 2) burst line 1: Burst Skill damage ▲38.91% for 15s scoped to skills with 'Affects 1 enemy unit(s)' in the description. estimate = teammates' qualifying single-target burst damage instances landing inside the 15s window are missing ×1.3891; with jackal casting every 20s FB (B1, cd 20s) the window covers the whole rotation, so qualifying burst nukes in her comps read ~28% cold (1 − 1/1.3891) — the COLD is exactly the amp, honestly. recipe = needs a burstSkillDamagePct StatKey + a burst-category term in dealDamage (formula SSOT has no such bucket today) + a decidable description-text scope (per-ally authoring-time qualification or an ally-burst target-kind gate); verify bucket membership against popup reads of a qualifying burst inside vs outside her window before enacting. tier = engine gap — trina carries the same mechanic family ('Affects all enemies' variant) and her 2026-07-24 gauntlet certified GO with it documented identically; enact for both carriers together. No cadence ⚑ (flag retired by owner ruling 2026-07-25 — datamine tuple reliable). Kit-autonomy gauntlet 2026-08-04.",
  "unmodeled": {
    "skill1": [
      "■ Activates when attacked 10 time(s). Affects 1 enemy unit(s) with the highest final Max HP.",
      "Damage Taken ▲ 9.09% for 10 sec.",
      "ATK ▼ 9.09% for 10 sec."
    ],
    "skill2": ["Equally shares damage taken  for 120 sec."],
    "burst": [
      "Burst Skill damage of skills with \"Affects 1 enemy unit(s)\" in the description ▲ 38.91% for 15 sec."
    ]
  },
  "caveats": [
    "burst: the 38.91% Burst-Skill-Damage amp (scoped to skills whose description says 'Affects 1 enemy unit(s)', 15s per cast) is NOT modeled — the engine has no Burst-Skill-Damage bucket/stat and no description-text scope gate (trina precedent, same mechanic family). Teammates' single-target burst nukes cast within 15s of jackal's cast are missing the amp, so jackal comps read COLD by exactly that amount — a documented engine gap (⚑2), not a tuning residual.",
    "skill1: the whole attacked-10x cluster (Damage Taken ▲9.09% + ATK ▼9.09% on the boss, 10s) is unmodeled — the sim has no incoming-damage model and no attacked-count trigger (maiden Revenge-cluster precedent). If it were fireable it would be a ~+9.09% team amp after the first 10 hits taken; her in-game tanking role feeds the counter, so real uptime is high — honestly absent here (⚑1).",
    "skill2: 'Equally shares damage taken' (self + 2 highest-final-ATK allies, 120s) is unmodeled — no redistribution primitive and no incoming damage at scope; defensive.",
    "Both modeled lines are defPct (damage-INERT in v1): jackal's modeled kit contributes ZERO damage — her sim output is her bare RL weapon. Her real value (the burst amp + the S1 boss debuff) lives entirely in the two documented engine gaps."
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
          "stat": "defPct",
          "value": 8.27,
          "durationSec": 120
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 8.27,
          "durationSec": 120
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
          "kind": "buff",
          "stat": "defPct",
          "value": 14.69,
          "durationSec": 10
        }
      ]
    }
  ]
}


## 7c. Engine changes: NONE (S4). The two missing primitives (a Burst-Skill-Damage bucket/stat + description-text scope gate; an incoming-attack counter) block only lines already classified DOCUMENTED-GAP under binding precedents (trina 2026-07-24 GO carries the same burst mechanic family; maiden 2026-08-03 GO carries the same attacked-N-times cluster).
