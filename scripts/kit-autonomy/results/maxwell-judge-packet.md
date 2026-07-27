# S7 RECONCILING-JUDGE PACKET — `maxwell` (Maxwell, SR / Iron / Attacker / Burst III)

You are the binding reconciling judge for ONE unit's kit-autonomy gauntlet. Read the contract below,
then the mechanics SSOT, then the ground truth (kit prose + base stats + the PROBE EVIDENCE that
governs the burst), then the cross-family evidence (S2b review, S5 blind test + its green/red record
vs the driver override, S6 blind override + diff), then the driver's implementation. Return the binding
verdict JSON the contract specifies.

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

**A. Convergence is MECHANICAL (do this first).** Run the S5 blind tests, UNMODIFIED, against the driver's
SHIPPED override (mentally trace, or note what a run would show): **GREEN = convergence; any RED = a
divergence to classify.** A divergence the blind caught is the REAL signal; mere same-model agreement is WEAK
evidence (every agent is the same model — convergence proves stability, not correctness).

**B. Per kit line, classify** the driver's encoding against prose + formula, using S2b/S6 to attribute:

- `FAITHFUL` — encoding matches prose AND the formula SSOT agrees the routing is correct (right bucket,
  trigger timing, stacking rule, scope, duration semantics, target set).
- `DOCUMENTED-GAP` — deliberately `unmodeled` (reason in `note`), a `GAP` (missing primitive, `it.skip`), or a
  `⚑` (estimate + recipe + tier). Acceptable; the decision is recorded.
- `REAL-GOTCHA` — a divergence NOT documented. Sub-kinds, ranked: `SILENT_DROP` (line nowhere — not block,
  config, or `unmodeled`) → `ENGINE`/`FIDELITY` (encoded but the engine routes/executes it so behavior differs
  from the kit wording, or the downstream effect is modeled rather than the named mechanic) → `ENCODING`
  (wrong value/stat/trigger/target/scope/duration vs the prose).
- `RECON_ERROR` — a blind agent misread clear code/prose (the driver + formula agree); note it, not a finding.

**C. Fire-rate / "modeled≠working" check:** each FAITHFUL block must FIRE at the prose-implied cadence over
the 180s fight (the DBG side-effect check), not merely be present. A modeled line that doesn't activate is a
REAL-GOTCHA. (A block whose only observable is a consumer's reaction needs a fixture that strips the unit's
other sources of that signal — note if the driver's fixture fails to isolate.)

**D. Discrimination check:** each load-bearing test must FAIL under its named nearest-wrong model (per the
S2d matrix / S2b). A test green under both shipped and counterfactual asserts nothing → REAL-GOTCHA.

**E. Cross-check the blind agents:** for each S5/S6 divergence from the driver, is it corroborated by the
prose + formula (a fresh find) or spurious? Undocumented + formula-confirmed = the most valuable output.

**F. Magnitude scope:** magnitudes are owner/measurement-gated and OUT OF SCOPE — do NOT flag a magnitude as
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

# MECHANICS SOURCE OF TRUTH (docs/data/damage-calculation.md)

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
  (owner-confirmed the gate is real).

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

---

# MECHANICS SOURCE OF TRUTH (docs/data/game-mechanics.md)

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
inert. Same-squad gates ("with an ally from the same squad on the battlefield" — Noir
`noir`, satisfied by Blanc `blanc` / Rouge `rouge`, owner-confirmed) are static team-
composition checks (`teamHas.slugs`), exact at scope lock where no ally ever dies.

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

# GROUND TRUTH + PROBE EVIDENCE

## GROUND TRUTH — Maxwell (`maxwell`) kit prose + base stats (data/characters.json)

```json
{
  "slug": "maxwell",
  "name": "Maxwell",
  "weapon": "SR",
  "burst": "III",
  "class": "Attacker",
  "element": "Iron",
  "burstCooldownSec": 40,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 250,
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
    "resourceId": 102
  },
  "skills": {
    "skill1": "■ Activates when entering Full Burst. Affects 2 allies with the highest final ATK.\nCharge Speed ▲ 4.48% for 10 sec. \nATK ▲ 43.1% for 10 sec.",
    "skill2": "■ Activates when there are above 5 enemy unit(s), excluding Nikkes. Affects self.\nCritical Rate ▲ 4.83%.\nCritical Damage ▲ 13.91%.",
    "burst": "■ Affects self. \nChange the weapon in use: \nCharge Time: 2 sec\nDamage: 813.42% of final ATK \nFull Charge Damage: 300% of damage \nMax Ammunition Capacity: 1 round(s) \nAdditional Effect: Pierce"
  }
}
```

### PROBE EVIDENCE (data/kit-status.json → maxwell) — THIS IS THE LOAD-BEARING GROUND TRUTH FOR THE BURST

The burst magnitude/model is **MEASUREMENT-GATED**, settled by a popup-read of real fight footage
(probe "run G"). The relevant kit-status entries, verbatim:

- kitParse.findings[0]: "0.938 COLD: **F1 burst hit modeled 813.42% (uncharged) vs kit-literal full-charge 2440% (x3 lever); F2 flatDamage strips crit+core the Pierce railgun rolls.** Recipe: popup-read burst hit in run-G footage"
- tier: "CALIBRATED"; tuned: true; evidence: "**Railgun single-shot fix from run G (1.93->0.81)**"
- residual: "**Over-corrected; reads 0.80 (G) but 1.17 (N6) — unstable, audit candidate**"

What the measurement established: her burst is **ONE railgun shot**, not a sustained weapon swap.
The OLD kit-literal weaponSwap model (the one a blind text-only reader derives: ~2s charge, 1-round
mag, 300% full-charge ⇒ ~2-3 full-charge shots per window at 2440.26% each) **read 1.93 HOT**
(sim over-credited her damage by ~93%). Collapsing the burst to a single uncharged 813.42% flatDamage
shot brought the sim to **0.81** of real (run G). That is the evidence that selects the single-shot
model over the kit-literal weaponSwap. The N6 read (1.17) is an honest residual — the magnitude is
measurement-gated and the unit is flagged "audit candidate" — but the _single-shot topology_ (one
shot per cast, not a multi-shot swap) is what the probe established and what the sim ships.

Project principle that governs this reconciliation: **measured > fudge** and **faithful > fit**.
"Faithful" means faithful to _what actually happens in game_ (the probe is the ground truth), not
faithful to a literal reading of the kit text that the measurement falsified. A blind kit-text-only
re-derivation is _expected_ to produce the weaponSwap (that is the unfalsified text hypothesis); it
corroborates the driver everywhere the text is not measurement-overridden, and the single burst
divergence is resolved by the probe, not by majority vote of blind readers.

---

# DRIVER ↔ CROSS-FAMILY RECONCILIATION

## DRIVER RECONCILIATION (S2c) — what converged, and the ONE open axis

**CONVERGED (driver == S2b fable == S5 opus test == S6 opus override), all four independent:**

- skill1: `fullBurstEnter` trigger (NOT burstCast) → `alliesTopAtk { count: 2, byFinalAtk: true }`,
  self-eligible (no "except self" clause) → buff chargeSpeedPct 4.48 + buff atkPct 43.1, durationSec 10.
  The blind roles independently derived `byFinalAtk:true` from the literal "highest FINAL ATK" wording
  (the driver's one encoding FIX this gauntlet — it was absent in the shipped parser output).
- skill2: UNMODELED / inert. The ">5 enemy units, excluding Nikkes" gate is permanently FALSE vs the
  single partless solo-raid boss and the schema has no enemy-count primitive; the faithful model is
  INERT (skill2 === []), verbatim in unmodeled. The nearest-wrong (an always-on crit passive) is
  discriminated by both the driver and blind tests.

**THE ONE OPEN AXIS — burst topology (MEASUREMENT-GATED):**

- Driver (shipped + probe-calibrated): `burstCast → enemy → flatDamage atkPct 813.42` — ONE shot per
  cast, critEligible (flatDamage default), coreEligible false (F2), FB-exempt (burstCast lands before
  the window). The weapon-swap scaffolding (charge 2s / full-charge 300% / maxAmmo 1 / Pierce) is
  collapsed into that single measured shot and recorded verbatim in unmodeled.burst with a ⚑
  (estimate = single uncharged 813.42% shot, MEASURED; recipe = popup-read run-G/N6; tier = MEASUREMENT-GATED).
- Blind S2b/S5/S6 (kit-text-only): a self `weaponSwap` (damagePct 813.42, chargeTimeSec 2, chargeMultPct
  300 ⇒ 2440.26% full charge, maxAmmo 1, hasPierce scoped to the swap, durationSec ~10) — i.e. the kit-LITERAL
  model. This is exactly the OLD model the probe falsified at 1.93 hot.

**S5 blind test vs the DRIVER override: 9 passed / 5 failed / 2 skipped.**

- The 9 passes are EVERY non-burst assertion: skill1 6/6 (fullBurstEnter, alliesTopAtk:2, byFinalAtk:true,
  self-eligible, 43.1+4.48, 10s wall-clock, fires every team FB reaching exactly 2 allies, top-2 slice
  load-bearing, moves damage, ≠ burstCast keying) + skill2 2/2 (crit buffs never apply in solo; the
  inertness is non-vacuous) + fixture sanity 1/1.
- The 5 failures are ALL the burst block, and each fails _because_ the blind test asserts the kit-literal
  weaponSwap that the driver's measured single-shot model deliberately does not ship. Most diagnostic:
  the blind test asserts "the swap is the bulk of her damage" (removing the burst should drop her total
  > 90%); under the driver's single-shot model removing the burst moves her total 169.2M → 168.3M (~0.5%),
  > because one 813.42% railgun shot is minor next to her charged SR normals — which is precisely the
  > probe's one-shot reality, and the negation of the weaponSwap model's sustained-fire premise.

**Question for the judge:** is the driver's probe-measured single-shot burst a FAITHFUL encoding (GO,
with the magnitude correctly flagged measurement-gated / audit-candidate), or should the kit-literal
weaponSwap be restored (which the probe evidence says over-credits her damage by ~93%)? The driver's
position: measured > fudge — the single shot is faithful to reality; the weaponSwap is the falsified
text hypothesis; the residual (0.80 G vs 1.17 N6) is an honest magnitude uncertainty already flagged in
kit-status, not a topology error.

---

# S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "maxwell",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ entering Full Burst → 2 allies highest final ATK",
      "disposition": "FAITHFUL",
      "scope": "Generic stat buffs (Charge Speed / ATK), no normal-attack or crit scoping in the text.",
      "durationSemantics": "durationSec: 10 for both effect lines — wall-clock seconds, explicitly stated 'for 10 sec'. NOT rounds, NOT permanent.",
      "triggerIdentity": "fullBurstEnter — 'Activates when entering Full Burst' fires on ANY team Full Burst, not only rotations Maxwell casts. No everyN/fbGate/status gate.",
      "targetSet": "alliesTopAtk count:2, byFinalAtk:true (text literally says 'highest final ATK' → live effectiveAtk ranking per the A3 literal-word rule). NO excludeSelf — the text has no '(except self)' clause, so Maxwell herself is in the candidate pool and, as the Attacker with class-static 118,027 ATK, will usually occupy one of the two slots.",
      "nearestWrongModel": "Keying the block to burstCast (fires only on rotations Maxwell casts her own burst) instead of fullBurstEnter — plausible because the buffs feed her own burst-swap shots so a modeler may couple them to her cast.",
      "distinguishingAssertion": "In controlComp('maxwell') (helm is a co-B3, so some Full Bursts are entered off helm's cast), collect buffApply events with stat 'chargeSpeedPct' value 4.48: their count must equal 2 × (number of fullBurstStart events), i.e. the buff applies on EVERY Full Burst including ones Maxwell did not cast. RED under burstCast (applies only on Maxwell's rotations).",
      "inertness": "Must never apply to more than 2 targets per Full Burst; expiresFrame on each buffApply must be applyFrame + 600 (10 s), never permanent.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 43.1% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic atkPct on the two targets (scales each target's own ATK). Plain percentage stat — buffApply value stays the raw 43.1, not flat-resolved (that path is casterAtkPct only).",
      "durationSemantics": "durationSec: 10 — explicit seconds.",
      "triggerIdentity": "Same block as the Charge Speed line: fullBurstEnter.",
      "targetSet": "alliesTopAtk count:2, byFinalAtk:true, self included.",
      "nearestWrongModel": "Static-ATK ranking (omitting byFinalAtk) — the schema default; kits saying plain 'highest ATK' keep static ranking, so the FINAL-ATK wording is easy to gloss over. Secondary misread: excludeSelf:true.",
      "distinguishingAssertion": "Patch a low-static-ATK ally (e.g. liter, Supporter static 98,367) via withPatchedOverride with a large passive self atkPct so her live effectiveAtk exceeds a higher-static ally at FB entry; assert the buffApply {stat:'atkPct', value:43.1} events at that FB carry targetSlug of the LIVE-ranked top-2 (the buffed liter selected). RED under static ranking (selection unchanged by live buffs). Self-inclusion check: with no patches, one of the two targetSlug values per FB is 'maxwell'.",
      "inertness": "Exactly 2 buffApply of atkPct 43.1 per Full Burst; the three non-selected units' effectiveAtk must not move.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ above 5 enemy unit(s) → self",
      "disposition": "UNMODELED",
      "scope": "Self crit-stat buffs (Critical Rate ▲ 4.83%, Critical Damage ▲ 13.91%), gated on enemy COUNT.",
      "durationSemantics": "No duration stated — would be continuous WHILE the condition holds; but the condition ('above 5 enemy units, excluding Nikkes') is structurally unsatisfiable in this sim: the scope-lock fight is one partless boss, and the engine has no enemy-count primitive at all.",
      "triggerIdentity": "Conditional passive on enemy count — no schema gate expresses it, and against the single-boss target the gate is permanently FALSE. The faithful model is INERT (recorded verbatim in `unmodeled`), not a passive.",
      "targetSet": "Self only.",
      "nearestWrongModel": "Dropping the enemy-count clause and shipping an always-on passive self buff (critRatePct 4.83 + critDamagePct 13.91) — a classic 'gate I can't express → ignore the gate' over-credit that permanently inflates Maxwell's crit and every crit-eligible hit including the burst-swap shots.",
      "distinguishingAssertion": "Run controlComp('maxwell'); assert ZERO buffApply events with stat 'critRatePct' value 4.83 and ZERO with stat 'critDamagePct' value 13.91 across the whole fight, and that damage events' crit rate for maxwell reflects the base sheet rate only. RED under the ungated-passive misread.",
      "inertness": "Stripping skill2 blocks entirely via withPatchedOverride must produce identical totals(res)['maxwell'] — the slot must be damage-inert as shipped.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Change the weapon in use (813.42%, 2s charge)",
      "disposition": "FAITHFUL",
      "scope": "Self weaponSwap: damagePct 813.42, chargeTimeSec 2, chargeMultPct 300 ('Full Charge Damage: 300% of damage' — a ×3 multiplier ON the 813.42% swap damage, so a full-charge swap shot resolves at 2440.26% of final ATK through the charge bucket, before FB/range/buffs), maxAmmo 1.",
      "durationSemantics": "durationSec is KIT-SILENT here — the prose states no window. ⚑ CALIBRATED: the conventional 10 s Full-Burst window is the estimate; also ⚑ the whole swap shot economy (charge 2 s at base + reload of a 1-round magazine ⇒ roughly 2–3 full-charge shots per window, more if her own S1 Charge Speed lands on her). ALWAYS-⚑ field #3, must not ship silently.",
      "triggerIdentity": "burstCast (self mode in Maxwell's OWN burst block) — fires ONLY on rotations Maxwell casts her burst, never on a teammate's B3 rotation. NOT fullBurstEnter. The swap's SHOTS land during the FB window and take the +50% FB major by timing (the swap itself is not an instant burst-damage line).",
      "targetSet": "Self.",
      "nearestWrongModel": "TWO stacked misreads to distinguish: (1) 'Max Ammunition Capacity: 1 round(s)' encoded as maxShots:1 — swap terminates after ONE shot — when it is the swap weapon's MAGAZINE size (fire 1 → reload ~141f → fire again, cycling for the whole window); (2) keying the swap to fullBurstEnter so helm's rotations also trigger it.",
      "distinguishingAssertion": "(1) Within a single Full Burst window that Maxwell opened, count damage/shot events carrying the swap multiplier (mult reflecting 813.42×3 on full charge): must be ≥2, with at least one reload event for maxwell INSIDE the swap window. RED under maxShots:1 (exactly one swapped shot, no in-window reload). (2) Filter burstCast events: swap-multiplier shots must appear ONLY in FB windows preceded by a burstCast with srcSlot === maxwell's slot; in helm-cast rotations Maxwell's shots keep the base SR mult 69.04. RED under fullBurstEnter keying.",
      "inertness": "Outside Maxwell's own burst windows her cadence/mult must be the base SR (69.04 normal / 200 core, 6-round magazine); the swap must not leak past its window end.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Additional Effect: Pierce",
      "disposition": "FAITHFUL",
      "scope": "Pierce scoped to the SWAPPED weapon only — encode as weaponSwap.hasPierce:true (per-shot pierce tag on swap shots), NOT the top-level override hasPierce flag.",
      "durationSemantics": "Coextensive with the swap window.",
      "triggerIdentity": "Rides the burstCast weaponSwap; no independent trigger.",
      "targetSet": "Self (her swap shots).",
      "nearestWrongModel": "Top-level hasPierce:true on the override — tags her base SR shots as Pierce for the WHOLE fight, making any teammate's or own Pierce Damage ▲ buff feed all of her damage instead of only the swap window.",
      "distinguishingAssertion": "Add a Pierce Damage ▲ buff to the comp via withPatchedOverride (pierceDamagePct on maxwell); assert damage events OUTSIDE her swap windows are unchanged versus the unpatched run while swap-window shots move. Simpler structural check: the shipped override must not set top-level hasPierce while the burst weaponSwap carries the pierce tag. RED under whole-fight hasPierce (out-of-window damage moves / crossFight pierce tagging).",
      "inertness": "pierceDamagePct is parsed-but-inert in v1, so the tag itself must be damage-neutral on the graded board; only the TAGGING SCOPE is asserted.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Charge Speed ▲4.48% ×10s (fullBurstEnter, top-2 final ATK)",
    "skill1:ATK ▲43.1% ×10s (fullBurstEnter, top-2 final ATK, byFinalAtk)",
    "burst:weaponSwap 813.42%/2s charge/300% full-charge/maxAmmo 1 (burstCast, self)",
    "burst:Pierce (swap-scoped tag)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Activates when there are above 5 enemy unit(s), excluding Nikkes. Affects self.",
      "Critical Rate ▲ 4.83%.",
      "Critical Damage ▲ 13.91%."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to reconcile against the driver: (1) 'Max Ammunition Capacity: 1 round(s)' is the swap MAGAZINE size (reload-and-refire cycling), not maxShots:1 — the single-big-shot reading roughly halves-to-thirds her burst-window output; (2) skill1 says 'highest FINAL ATK' → byFinalAtk:true live ranking, and self IS in the pool (no except-self clause) — static ranking or excludeSelf both mis-target; (3) skill1 is fullBurstEnter (every team FB, including helm-cast rotations in the control fixture) while the burst swap is burstCast (Maxwell's rotations only) — collapsing the two either over-credits the swap or under-credits the team buff; (4) skill2's >5-enemy gate is permanently false vs the partless solo boss — the only wrong move is shipping it as an ungated crit passive; it must be verbatim-unmodeled and provably inert; (5) the swap durationSec is kit-silent — a ⚑ CALIBRATED 10 s FB-window estimate with the shot-economy (charge 2 s + 141-frame reload per 1-round mag, accelerated by her own S1 Charge Speed when she self-selects) stated as the recipe, never a silent constant; (6) Pierce must be swap-scoped (weaponSwap.hasPierce), not the whole-fight top-level flag. Interaction worth one composed assertion: her S1 lands at FB entry AFTER her burstCast swap begins, so swap shots fired inside the window should snapshot the +43.1% ATK and the faster charge — a model that resolves swap shots pre-FB (burstSnapshotsPreFb-style) would miss both.",
  "model": "claude-fable-5"
}
```

---

# S5 BLIND TEST (claude-opus-5, authored from kit prose alone) — blind/maxwell.test.ts

Record vs the DRIVER override: **9 passed / 5 failed / 2 skipped** (all 9 non-burst assertions green;
all 5 failures are the burst weaponSwap block — see the reconciliation above).

```ts
/**
 * maxwell — BLIND kit spec test (S5 post-op; authored from kit prose alone,
 * with no sight of the driver's override, tests or reasoning).
 *
 * KIT (Maxwell, `maxwell`, SR / Iron / Attacker / Burst III; cd 40s, ammo 6,
 * reload 141f, charge 60f, normalAttackMultiplier 69.04, coreAttackMultiplier 200):
 *
 * skill1  "Activates when entering Full Burst. Affects 2 allies with the highest final ATK."
 *         Charge Speed ▲ 4.48% for 10 sec ; ATK ▲ 43.1% for 10 sec.
 *   READ: trigger = fullBurstEnter (ANY team Full Burst — NOT maxwell's own burst cast;
 *         the fixture carries a second Burst III so the two counts genuinely differ).
 *         target  = alliesTopAtk { count: 2, byFinalAtk: true } — the kit says "highest
 *         FINAL ATK" literally, and carries NO "(except the skill user)" clause, so self
 *         is eligible. effects = buff atkPct 43.1 + buff chargeSpeedPct 4.48, durationSec 10.
 *         atkPct scales the TARGET's own ATK, so buffApply emits the RAW 43.1; a
 *         casterAtkPct mis-encoding would emit a flat caster-scaled ATK number instead.
 *
 * skill2  "Activates when there are above 5 enemy unit(s), excluding Nikkes. Affects self."
 *         Critical Rate ▲ 4.83% ; Critical Damage ▲ 13.91%.
 *   READ: the v1 scope is a single solo-raid boss, so the >5-enemy condition is
 *         UNREACHABLE and the line is permanently INERT. Nearest-wrong = an always-on
 *         passive self-buff, which silently hands maxwell crit rate + crit damage for the
 *         whole fight; the inertness assertion below goes RED under exactly that model.
 *
 * burst   "Affects self. Change the weapon in use: Charge Time 2 sec / Damage 813.42% of
 *          final ATK / Full Charge Damage 300% of damage / Max Ammunition Capacity 1
 *          round(s) / Additional Effect: Pierce"
 *   READ: ONE weaponSwap effect on a burstCast + self block — damagePct 813.42,
 *         chargeTimeSec 2, chargeMultPct 300, maxAmmo 1, hasPierce true SCOPED TO THE SWAP
 *         (the effect-level flag), NOT the file-level whole-fight hasPierce (which would
 *         Pierce-tag her base SR for all 180s).
 *         ⚑ durationSec is KIT-SILENT — the ~10s Full-Burst window is the convention;
 *         asserted only as a sanity band, never as a measured pin.
 *         maxAmmo 1 is a WEAPON-STATE modifier and therefore damage: it forces a 141-frame
 *         reload between every swapped shot, capping the window's shot count.
 *
 * FIXTURE: controlComp('maxwell', true) — liter B1 / crown B2 / maxwell B3 / helm B3,
 * deterministic (no seed). B1+B2 are mandatory (a lone Burst III casts zero bursts); the
 * co-Burst-III is what makes the fullBurstEnter-vs-burstCast distinction non-vacuous,
 * since maxwell does not cast her own burst on every rotation.
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

const SLUG = 'maxwell';
type Ev = SimEvent & Record<string, any>;

// ---- shape-tolerant slot accessors -------------------------------------------------
// The override FILE is slot-keyed; a slot is either a bare Block[] or an object carrying
// its own blocks[]. Handling both keeps every counterfactual from silently no-opping —
// a no-op patch would make the discriminating assertions vacuously green.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s;
  if (s && Array.isArray(s.blocks)) return s.blocks;
  return [];
}
function setSlotBlocks(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  blocks: any[]
): void {
  const s = ov?.[slot];
  if (s && !Array.isArray(s) && Array.isArray(s.blocks)) s.blocks = blocks;
  else ov[slot] = blocks;
}
function findSwap(ov: any): { block: any; eff: any } | null {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? [])
      if (e.kind === 'weaponSwap') return { block: b, eff: e };
  }
  return null;
}
function findS1Block(ov: any): any {
  for (const b of slotBlocks(ov, 'skill1')) {
    for (const e of b.effects ?? []) {
      if (
        e.kind === 'buff' &&
        e.stat === 'atkPct' &&
        Math.abs(e.value - 43.1) < 1e-6
      )
        return b;
    }
  }
  return null;
}
function effOf(block: any, stat: string): any {
  return (block?.effects ?? []).find(
    (e: any) => e.kind === 'buff' && e.stat === stat
  );
}

// ---- run helpers -------------------------------------------------------------------
function run(opts: any): { res: any; ev: Ev[] } {
  const ev: Ev[] = [];
  const sink = (e: SimEvent) => {
    ev.push(e as Ev);
  };
  const o: any = { ...opts, cfg: { ...(opts.cfg ?? {}), onEvent: sink } };
  o.onEvent = sink;
  return { res: runComp(o), ev };
}
function compWith(patched: any): any {
  const o: any = controlComp(SLUG, true);
  o.overrides = { ...(o.overrides ?? {}), [SLUG]: patched };
  return o;
}
const applies = (ev: Ev[], stat: string, value: number) =>
  ev.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      Math.abs(e.value - value) < 1e-6
  );
const fbStarts = (ev: Ev[]) =>
  ev.filter((e) => e.kind === 'fullBurstStart').length;
const mx = (r: { res: any }) => totals(r.res)[SLUG];
const team = (r: { res: any }) =>
  Object.values(totals(r.res)).reduce(
    (a: number, b: any) => a + (b as number),
    0
  );

// ---- hoisted runs (10 full 180s sims) ----------------------------------------------
const OV: any = withPatchedOverride(SLUG, () => {});

const BASE = run(controlComp(SLUG, true));

const S1_OFF = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => setSlotBlocks(ov, 'skill1', []))
  )
);
const S1_LONG = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = findS1Block(ov);
      for (const e of b?.effects ?? [])
        if (e.kind === 'buff') e.durationSec = 30;
    })
  )
);
const S1_ALL = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = findS1Block(ov);
      if (b) b.target = { kind: 'allies' };
    })
  )
);
const S1_ONCAST = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = findS1Block(ov);
      if (b) b.trigger = { kind: 'burstCast' };
    })
  )
);

const S2_PASSIVE = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      setSlotBlocks(ov, 'skill2', [
        {
          slot: 'skill2',
          trigger: { kind: 'passive' },
          target: { kind: 'self' },
          effects: [
            { kind: 'buff', stat: 'critRatePct', value: 4.83 },
            { kind: 'buff', stat: 'critDamagePct', value: 13.91 },
          ],
        },
      ]);
    })
  )
);

const B_OFF = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => setSlotBlocks(ov, 'burst', []))
  )
);
const B_AMMO6 = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const s = findSwap(ov);
      if (s) s.eff.maxAmmo = 6;
    })
  )
);
const B_FASTCHG = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const s = findSwap(ov);
      if (s) s.eff.chargeTimeSec = 0.5;
    })
  )
);
const B_NOFC = run(
  compWith(
    withPatchedOverride(SLUG, (ov: any) => {
      const s = findSwap(ov);
      if (s) s.eff.chargeMultPct = 100;
    })
  )
);

// ------------------------------------------------------------------------------------
describe('maxwell — fixture sanity', () => {
  it('captures events and casts multiple full bursts', () => {
    expect(BASE.ev.length).toBeGreaterThan(0);
    expect(fbStarts(BASE.ev)).toBeGreaterThan(1);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });
});

describe('maxwell skill1 — FB entry, 2 highest-final-ATK allies, 10s', () => {
  it('is keyed to full-burst ENTRY on the top-2 FINAL-ATK allies, self-eligible', () => {
    const b = findS1Block(OV);
    expect(b, 'no skill1 block granting ATK 43.1%').not.toBeNull();
    expect(b.trigger.kind).toBe('fullBurstEnter'); // nearest-wrong: burstCast (under-fires, loses FB auras)
    expect(b.target.kind).toBe('alliesTopAtk'); // nearest-wrong: allies / self
    expect(b.target.count).toBe(2);
    expect(b.target.byFinalAtk).toBe(true); // kit says "highest FINAL ATK" literally
    expect(b.target.excludeSelf ?? false).toBe(false); // no "(except the skill user)" clause
  });

  it('grants ATK 43.1% and Charge Speed 4.48%, each for 10s, as plain percentage stats', () => {
    const b = findS1Block(OV);
    const atk = effOf(b, 'atkPct');
    const chg = effOf(b, 'chargeSpeedPct');
    expect(atk?.value).toBeCloseTo(43.1, 5);
    expect(atk?.durationSec).toBe(10);
    expect(atk?.durationShots).toBeUndefined(); // "for 10 sec" is wall-clock, not a round count
    expect(chg?.value).toBeCloseTo(4.48, 5);
    expect(chg?.durationSec).toBe(10);
    // scope: the ATK grant scales the TARGET's own ATK, not the caster's
    expect(effOf(b, 'casterAtkPct')).toBeUndefined();
    expect(effOf(b, 'highestAllyAtkPct')).toBeUndefined();
  });

  it('fires on EVERY team full burst and reaches exactly 2 allies each time', () => {
    const fb = fbStarts(BASE.ev);
    const atk = applies(BASE.ev, 'atkPct', 43.1);
    const chg = applies(BASE.ev, 'chargeSpeedPct', 4.48);
    expect(fb).toBeGreaterThan(1);
    expect(atk.length).toBe(2 * fb); // burstCast-keying gives 2 x (maxwell's own casts), which is fewer
    expect(chg.length).toBe(2 * fb);
    expect(atk.every((e) => typeof e.expiresFrame === 'number')).toBe(true);
  });

  it('does NOT reach the whole team — the top-2 slice is load-bearing', () => {
    const recips = new Set(
      applies(BASE.ev, 'atkPct', 43.1).map((e) => e.targetSlug)
    );
    expect(recips.size).toBeLessThan(4); // 4-unit comp: two allies stay untouched each FB
    expect(recips.has(SLUG)).toBe(true); // no except-self clause; maxwell is an Attacker, so top-2
    const all = applies(S1_ALL.ev, 'atkPct', 43.1);
    expect(all.length).toBeGreaterThan(2 * fbStarts(S1_ALL.ev)); // counterfactual is genuinely different
    expect(team(S1_ALL)).toBeGreaterThan(team(BASE));
  });

  it('moves damage, and its 10s window is load-bearing', () => {
    expect(team(S1_OFF)).toBeLessThan(team(BASE)); // non-vacuity: the line is not inert
    expect(team(S1_LONG)).toBeGreaterThan(team(BASE)); // 30s > 10s: bounded, not permanent
  });

  it('is NOT interchangeable with a burst-cast keying', () => {
    expect(team(S1_ONCAST)).not.toBe(team(BASE));
  });
});

describe('maxwell skill2 — "above 5 enemy unit(s)" (unreachable in a solo raid)', () => {
  it('never applies its crit buffs in a single-boss fight', () => {
    expect(applies(BASE.ev, 'critRatePct', 4.83).length).toBe(0);
    expect(applies(BASE.ev, 'critDamagePct', 13.91).length).toBe(0);
  });

  it('the inertness assertion is not vacuous — the same buffs, if always-on, DO move damage', () => {
    expect(applies(S2_PASSIVE.ev, 'critRatePct', 4.83).length).toBeGreaterThan(
      0
    );
    expect(mx(S2_PASSIVE)).toBeGreaterThan(mx(BASE));
  });

  it.skip('ACTIVE branch (>5 enemies) is unexercisable — v1 models a single boss, no multi-enemy fixture exists', () => {});
});

describe('maxwell burst — swapped charge weapon (813.42% / x3 / 1 round / Pierce)', () => {
  it('is ONE weaponSwap on a burstCast + self block', () => {
    const s = findSwap(OV);
    expect(s, 'burst is not modelled as a weaponSwap').not.toBeNull();
    expect(s!.block.trigger.kind).toBe('burstCast'); // nearest-wrong: fullBurstEnter
    expect(s!.block.target.kind).toBe('self');
  });

  it('carries the exact swap numbers from the kit', () => {
    const e = findSwap(OV)!.eff;
    expect(e.damagePct).toBeCloseTo(813.42, 5);
    expect(e.chargeTimeSec).toBeCloseTo(2, 5);
    expect(e.chargeMultPct).toBeCloseTo(300, 5);
    expect(e.maxAmmo).toBe(1);
    // ⚑ kit-silent duration: the ~10s Full-Burst window is the convention, not a measurement.
    expect(e.durationSec).toBeGreaterThanOrEqual(5);
    expect(e.durationSec).toBeLessThanOrEqual(15);
  });

  it('scopes Pierce to the swapped weapon, not to the whole fight', () => {
    expect(findSwap(OV)!.eff.hasPierce).toBe(true);
    expect(OV.hasPierce ?? false).toBe(false); // a file-level flag would Pierce-tag her base SR for 180s
  });

  it('the swap is the bulk of her damage', () => {
    expect(mx(B_OFF)).toBeLessThan(mx(BASE) * 0.9);
  });

  it('every swap parameter that gates shot count / per-shot size is load-bearing', () => {
    expect(mx(B_AMMO6)).toBeGreaterThan(mx(BASE)); // maxAmmo 1 forces a 141f reload per swapped shot
    expect(mx(B_FASTCHG)).toBeGreaterThan(mx(BASE)); // the 2s charge time caps shots in the window
    expect(mx(B_NOFC)).toBeLessThan(mx(BASE)); // Full Charge Damage 300% is actually applied
  });

  it.skip('Pierce PAYLOAD is unobservable in this fixture — the control comp has no Pierce Damage ▲ source', () => {});
});
```

---

# S6 BLIND OVERRIDE (claude-opus-5, authored from kit prose alone) — blind/maxwell.override.json

### S6 blind override — diff vs the DRIVER override

- skill1: **IDENTICAL** (fullBurstEnter / alliesTopAtk count 2 byFinalAtk:true / chargeSpeedPct 4.48 +
  atkPct 43.1 / durationSec 10; no excludeSelf). Byte-for-byte the same encoding the driver ships.
- skill2: **IDENTICAL** (empty []; the >5-enemy line verbatim in unmodeled.skill2).
- burst: **DIVERGES** — blind = self weaponSwap {damagePct 813.42, chargeTimeSec 2, chargeMultPct 300,
  maxAmmo 1, hasPierce true, durationSec 10}; driver = enemy flatDamage {atkPct 813.42}. Same measurement
  -gated axis as S2b and S5. The blind caveats themselves flag the swap duration + shot economy as
  UNMEASURED ("⚑ burst weaponSwap.durationSec = 10 is UNMEASURED … If the swap instead uses-bound (ends
  after its single shot) … the shot economy changes materially") — i.e. the blind writer names the
  single-shot possibility the probe confirmed.

```json
{
  "slug": "maxwell",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "byFinalAtk": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 4.48,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 43.1,
          "durationSec": 10
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 813.42,
          "chargeTimeSec": 2,
          "chargeMultPct": 300,
          "maxAmmo": 1,
          "hasPierce": true,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "■ Activates when there are above 5 enemy unit(s), excluding Nikkes. Affects self.",
      "Critical Rate ▲ 4.83%.",
      "Critical Damage ▲ 13.91%."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ burst weaponSwap.durationSec = 10 is UNMEASURED. The kit text states no duration for the weapon change; 10s is the standard Full Burst window assumed as the swap's bound. If the swap is instead uses-bound (ends after its single shot) or ends at Full Burst end regardless, the shot economy changes materially.",
    "⚑ burst weapon-swap SHOT ECONOMY is kit-silent and unmodeled beyond the time bound: maxAmmo 1 forces a reload after every swapped shot, so shots fired = f(2s charge time, SR reload, swap start phase). No maxShots is set (the kit gives no uses limit); the engine's cadence + reload model decides the count. Estimate ~2 full-charge shots in a 10s window (2s charge + ~2.35s reload from reloadFrames 141).",
    "⚑ Cadence tuple (chargeFrames 60 / reloadFrames 141 / rate-of-fire) is datamine-sourced and known-unreliable; the burst swap overrides charge time to 2s but inherits the base reload cadence.",
    "Pierce is scoped to the SWAPPED weapon only (weaponSwap.hasPierce), NOT the unit-level hasPierce flag — the 'Additional Effect: Pierce' line sits inside the burst's weapon-change block, so her base SR shots are not Pierce-tagged.",
    "skill1 target is authored WITHOUT excludeSelf: 'Affects 2 allies with the highest final ATK' is read as a self-inclusive candidate pool (no 'except the skill user' clause). If self is excluded in game, maxwell loses her own 43.1% ATK / 4.48% Charge Speed and her burst damage drops materially — this is the single highest-leverage open question in this baseline.",
    "byFinalAtk:true is set because the kit says 'highest FINAL ATK' literally (live buffed ranking), not plain 'highest ATK'.",
    "skill2 is entirely INERT in solo-raid scope: its gate is '>5 enemy units, excluding Nikkes' and the scope-lock boss is a single partless enemy. The schema has no enemy-count gate, so the block is omitted rather than modeled as a passive — modeling it passively would silently grant permanent +4.83% Crit Rate / +13.91% Crit Damage that the fight never earns."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Maxwell (SR/Iron/Attacker/Burst III) is modeled as: S1 = a team buff on Full Burst entry (charge speed + ATK, 10s, to the 2 highest-final-ATK allies, self-inclusive); S2 = inert in this scope (>5-enemy gate, unsatisfiable vs a single boss — see unmodeled); burst = a self weapon swap to a 2s-charge, 1-round, Pierce-tagged cannon at 813.42% with a 300% full-charge multiplier. The swap's duration and shot economy are kit-silent and flagged."
}
```

---

# DRIVER IMPLEMENTATION

## Driver per-unit spec test — scripts/tests/units/maxwell.test.ts (16/16 green vs shipped)

```ts
// PER-UNIT KIT SPEC — `maxwell` (Maxwell, Attacker/SR/Iron, Burst III, cd 40s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-07-26 (resumed from a crashed S0).
//
// One assertion group per KIT LINE (M1..M9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.maxwell.skills):
//   S1 ■ entering Full Burst → 2 allies with the highest FINAL ATK:                  [M1 trigger]
//        Charge Speed ▲4.48% for 10 sec                                              [M3]
//        ATK ▲43.1% for 10 sec                                                       [M4]
//      (target = the 2 highest-final-ATK allies, self-eligible)                      [M2 target]
//   S2 ■ when there are above 5 enemy units (excl. Nikkes) → self:                  [M5 UNMODELED]
//        Critical Rate ▲4.83% / Critical Damage ▲13.91%
//   BU ■ self — Change the weapon in use: a single railgun shot                     [M6 single shot]
//        Damage 813.42% of final ATK                                                 [M7 magnitude]
//        (the hit crits, never cores)                                                [M8 eligibility]
//        (the cast lands before the Full Burst window → no +50% major)               [M9 FB-exempt]
//      Full Charge Damage 300% / Charge Time 2s / Max Ammo 1 / Pierce = the weapon-swap
//      scaffolding the single-shot model collapses (probe run-G; verbatim in unmodeled).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  fullBurstEnter fires on EVERY Full Burst window the team opens (liter+crown enable one
//       roughly every 20s), but maxwell only CASTS her B3 every 40s — so her S1 buff applies on
//       strictly MORE frames than she casts. A burstCast trigger (own-casts-only) would tie the
//       buff count to her cast count. The fixture (helm is the co-B3) is what opens windows
//       maxwell does NOT cast, exposing the difference.
//   M2  the buff reaches exactly 2 holders per apply-frame (self-eligible top-2), never all 4.
//       An `allies` target would reach all four. The ranking BASIS is pinned structurally
//       (byFinalAtk:true — the prose literally says "highest FINAL ATK", A3 rule): in THIS fixture
//       the top-2 by static and by final ATK are the same pair (maxwell+helm), so the basis is
//       behaviorally inert here and locked on the loaded encoding instead.
//   M3/M4 the kit magnitudes 4.48 / 43.1 (max-level), not a lower level-table value, for 10s.
//   M5  skill2 is gated on ">5 enemy units, excluding Nikkes" — never met in a single-boss solo
//       raid, so the parser correctly drops it (skill2 === []). Documented, not asserted: it is
//       out-of-domain inert here (⚑ in the override note). The assertion is structural: skill2
//       contributes no damage and no buff (it is empty), and the line is verbatim in unmodeled.
//   M6  her burst is ONE railgun shot per cast (probe run-G 1.93→0.81): exactly one burst-bucket
//       hit per burstCast. The old weaponSwap model fired ~4 shots over 10s; a multi-shot encoding
//       would multiply the hit count.
//   M7  the measured UNCHARGED single-shot magnitude 813.42%, not the kit-literal full-charge
//       2440.26% (the 300% × 3 lever). Measurement-gated: run-G read the burst hit at 813.42.
//   M8  flatDamage crits by engine default (critEligible) and never cores (coreEligible false) —
//       F2: the Pierce railgun roll keeps crit, strips core.
//   M9  a burst CAST lands BEFORE the Full Burst window opens, so it never takes the +50% major
//       (verified fact, 2026-07-13; burstCast flatDamage is also auto noFb).
//
// Fixture: controlComp('maxwell') = liter (B1) / crown (B2) / maxwell (B3) / helm (B3), boss Fire,
// focus maxwell — maxwell needs a real rotation (and a co-B3) to cast her burst AND to open Full
// Burst windows she does not cast. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp('maxwell') slot order: liter 0 / crown 1 / maxwell 2 / helm 3. */
const MAXWELL = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('maxwell'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** M1 counterfactual: her S1 keyed to her OWN burst casts, not Full Burst entry. */
const maxwellBurstCastTrigger = withPatchedOverride('maxwell', (ov) => {
  const b = ov.skill1[0];
  if (!b || b.trigger?.kind !== 'fullBurstEnter')
    throw new Error(
      'maxwell S1 fullBurstEnter block missing — fixture is stale'
    );
  b.trigger.kind = 'burstCast';
});
/** M2 counterfactual: the same buffs to ALL allies instead of the top-2. */
const maxwellAllAllies = withPatchedOverride('maxwell', (ov) => {
  const b = ov.skill1[0];
  if (!b || b.target?.kind !== 'alliesTopAtk')
    throw new Error(
      'maxwell S1 alliesTopAtk target missing — fixture is stale'
    );
  b.target = { kind: 'allies' };
});
/** M7 counterfactual: the kit-literal FULL-CHARGE magnitude (813.42 × 3 = 2440.26). */
const maxwellFullCharge = withPatchedOverride('maxwell', (ov) => {
  const e = ov.burst[0]?.effects?.find((x: any) => x.kind === 'flatDamage');
  if (!e)
    throw new Error('maxwell burst flatDamage missing — fixture is stale');
  e.atkPct = 2440.26;
});
/** M6 counterfactual: a second shot in the burst window (the old multi-shot weaponSwap shape). */
const maxwellMultiShot = withPatchedOverride('maxwell', (ov) => {
  const b = ov.burst[0];
  const e = b?.effects?.find((x: any) => x.kind === 'flatDamage');
  if (!e)
    throw new Error('maxwell burst flatDamage missing — fixture is stale');
  b.effects.push({ kind: 'flatDamage', atkPct: 813.42 });
});
/** M8 counterfactual: flip the eligibility — strip crit, add core. */
const maxwellCritCoreFlip = withPatchedOverride('maxwell', (ov) => {
  const e = ov.burst[0]?.effects?.find((x: any) => x.kind === 'flatDamage');
  if (!e)
    throw new Error('maxwell burst flatDamage missing — fixture is stale');
  e.crit = false;
  e.core = true;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const burstCastTrigger = run({ maxwell: maxwellBurstCastTrigger });
const allAllies = run({ maxwell: maxwellAllAllies });
const fullCharge = run({ maxwell: maxwellFullCharge });
const multiShot = run({ maxwell: maxwellMultiShot });
const critCoreFlip = run({ maxwell: maxwellCritCoreFlip });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const maxwellBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'maxwell'
  );
/** maxwell's burst-bucket damage (her single railgun shot per cast). */
const maxwellNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'maxwell' && d.srcSlot === 'burst');
/** maxwell's S1 ATK buff applications (casterIdx = maxwell, the 43.1% line). */
const s1Atk = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === MAXWELL && b.stat === 'atkPct');
const s1Charge = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MAXWELL && b.stat === 'chargeSpeedPct'
  );
/** Distinct frames on which maxwell's S1 ATK buff applied. */
const s1Frames = (evs: SimEvent[]) => [
  ...new Set(s1Atk(evs).map((b) => b.frame)),
];
/** Distinct holder slots reached, per apply-frame. */
const holdersPerFrame = (evs: SimEvent[]): Set<number | null>[] => {
  const m = new Map<number, Set<number | null>>();
  for (const b of s1Atk(evs))
    (m.get(b.frame) ?? m.set(b.frame, new Set()).get(b.frame)!).add(
      b.targetIdx
    );
  return [...m.values()];
};

describe('maxwell — kit spec', () => {
  describe('M1 — S1 triggers on FULL BURST ENTRY, not on her own burst casts', () => {
    it('applies the S1 buff on strictly more frames than maxwell casts her burst', () => {
      const buffFrames = s1Frames(base.events).length;
      const casts = maxwellBursts(base.events).length;
      expect(casts).toBeGreaterThan(0);
      expect(
        buffFrames,
        `${buffFrames} S1 apply-frames vs ${casts} maxwell casts — fullBurstEnter fires every FB ` +
          'window (incl. ones helm casts); a burstCast trigger would tie the two together'
      ).toBeGreaterThan(casts);
    });

    it('DISCRIMINATING: a burstCast trigger collapses the buff onto her casts only', () => {
      expect(s1Frames(burstCastTrigger.events).length).toBe(
        maxwellBursts(burstCastTrigger.events).length
      );
    });
  });

  describe('M2 — S1 reaches the top-2 highest-final-ATK allies (self-eligible), not all four', () => {
    it('reaches exactly 2 holders on every apply-frame', () => {
      const perFrame = holdersPerFrame(base.events);
      expect(perFrame.length).toBeGreaterThan(0);
      for (const holders of perFrame) {
        expect(
          holders.size,
          `an apply-frame reached ${holders.size} holders, expected 2`
        ).toBe(2);
      }
    });

    it('DISCRIMINATING: an `allies` target would reach all four', () => {
      const sizes = holdersPerFrame(allAllies.events).map((s) => s.size);
      expect(sizes.length).toBeGreaterThan(0);
      expect(Math.max(...sizes)).toBe(4);
    });

    it('is ranked by FINAL ATK (byFinalAtk:true — prose "highest final ATK", A3 rule)', () => {
      // Structural pin: in this fixture the top-2 by static and by final ATK coincide (maxwell+helm),
      // so the ranking BASIS is behaviorally inert here and locked on the loaded encoding instead.
      const ov = loadOverride('maxwell') as any;
      expect(ov.skill1[0].target).toMatchObject({
        kind: 'alliesTopAtk',
        count: 2,
        byFinalAtk: true,
      });
    });
  });

  describe('M3/M4 — S1 magnitudes and duration', () => {
    it('is Charge Speed 4.48% and ATK 43.1% (max level), not a lower level-table value', () => {
      expect([...new Set(s1Charge(base.events).map((b) => b.value))]).toEqual([
        4.48,
      ]);
      expect([...new Set(s1Atk(base.events).map((b) => b.value))]).toEqual([
        43.1,
      ]);
    });

    it('both last exactly 10 sec', () => {
      for (const b of [...s1Atk(base.events), ...s1Charge(base.events)]) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('M5 — S2 enemy-count gate is UNMODELED (out-of-domain inert in a solo raid)', () => {
    it('skill2 is empty: it contributes no damage and no buff', () => {
      const ov = loadOverride('maxwell') as any;
      expect(ov.skill2).toEqual([]);
      expect(
        dmg(base.events).filter(
          (d) => d.slug === 'maxwell' && d.srcSlot === 'skill2'
        )
      ).toEqual([]);
      expect(
        buffs(base.events).filter(
          (b) =>
            b.casterIdx === MAXWELL &&
            (b.stat === 'critRatePct' || b.stat === 'critDamagePct')
        )
      ).toEqual([]);
    });

    it('the gated line is preserved VERBATIM in unmodeled (not silently dropped)', () => {
      const ov = loadOverride('maxwell') as any;
      expect(ov.unmodeled.skill2.join(' ')).toContain('above 5 enemy units');
      expect(ov.unmodeled.skill2.join(' ')).toContain(
        'Critical Damage ▲ 13.91%'
      );
    });
  });

  describe('M6 — burst is ONE railgun shot per cast (probe run-G)', () => {
    it('fires exactly one burst-bucket hit per burst cast', () => {
      const nukes = maxwellNukes(base.events).length;
      const casts = maxwellBursts(base.events).length;
      expect(casts).toBeGreaterThan(0);
      expect(
        nukes,
        `${nukes} burst hits vs ${casts} casts — a multi-shot model multiplies this`
      ).toBe(casts);
    });

    it('DISCRIMINATING: a second shot in the window doubles the hit count', () => {
      expect(maxwellNukes(multiShot.events).length).toBe(
        maxwellBursts(multiShot.events).length * 2
      );
    });
  });

  describe('M7 — burst magnitude is the measured UNCHARGED 813.42%, not the 3× full-charge lever', () => {
    it('lands at 813.42% of final ATK in the burst bucket', () => {
      const nukes = maxwellNukes(base.events);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([813.42]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('DISCRIMINATING: the full-charge counterfactual lands at 2440.26%', () => {
      expect([
        ...new Set(maxwellNukes(fullCharge.events).map((d) => d.atkPct)),
      ]).toEqual([2440.26]);
    });
  });

  describe('M8 — the railgun hit crits (default) and never cores', () => {
    it('is crit-eligible and core-ineligible on every burst hit', () => {
      const nukes = maxwellNukes(base.events);
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
      expect(nukes.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: flipping crit:false/core:true inverts both eligibilities', () => {
      const flipped = maxwellNukes(critCoreFlip.events);
      expect(flipped.every((d) => !d.critEligible)).toBe(true);
      expect(flipped.every((d) => d.coreEligible)).toBe(true);
    });
  });

  describe('M9 — the burst cast is Full-Burst-exempt (lands before the window opens)', () => {
    it('never takes the +50% Full Burst major', () => {
      const nukes = maxwellNukes(base.events);
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });
  });
});
```

## Driver override — src/skills/overrides/maxwell.json (shipped + the byFinalAtk FIX)

```json
{
  "note": "Reviewed whole kit; parser output is faithful for all three slots, so no slot is overridden. Skill1 (entering Full Burst -> top-2 ATK allies get Charge Speed 4.48% + ATK 43.1% for 10s) is parsed correctly as fullBurstEnter. Skill2 (Crit Rate 4.83% + Crit Damage 13.91%) is gated on 'above 5 enemy units, excluding Nikkes'; in a single-boss solo raid that condition is never met, so the parser correctly drops it (deliberately left inactive). Burst is the signature weapon swap and the parser already models it as weaponSwap (813.42%/shot, 300% full-charge, 2s charge time, 1 ammo, 10s); charge cadence is specified directly so no attackSpeedPct rider is needed. Nothing to add. PROBE FIX (run G, 1.93 hot): her burst is ONE railgun shot — the old weaponSwap model fired ~4 shots over 10s at 2s charge. Now a single 813.42% flatDamage per cast. [materialized 2026-07-16: skill1 auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] GAUNTLET FIX 2026-07-26: skill1 target now carries byFinalAtk:true — the prose literally says '2 allies with the highest FINAL ATK', so per the A3 literal-word rule (miranda/soda-twinkling-bunny/alice precedent) the top-2 is ranked by LIVE effectiveAtk, not static ATK; self-eligible (no 'except self' clause, so Maxwell — the Attacker — usually occupies one slot). Behaviorally inert on the control comp (top-2 = maxwell+helm under either basis) but locks the faithful encoding. ⚑ skill2 '>5 enemy units, excluding Nikkes' gate = OUT-OF-DOMAIN inert in a single-boss solo raid: the engine has no enemy-count primitive and the gate is permanently FALSE vs the partless boss, so the faithful model is INERT (skill2 empty), NOT an ungated crit passive. estimate = inert (0 effect solo). recipe = multi-target / mob-content footage where >5 enemies are present (expect the self critRate 4.83 + critDmg 13.91 to come online). tier = out-of-domain (solo raid). Verbatim in unmodeled.skill2. ⚑ burst weapon-swap scaffolding (Charge Time 2s / Full Charge Damage 300% / Max Ammo 1 / Pierce) = COLLAPSED into the measured single 813.42% flatDamage railgun shot (probe run-G): the kit-LITERAL weapon swap (300% full-charge => 2440.26%, ~2-3 full-charge shots per window) is exactly the OLD model the probe FALSIFIED (it read 1.93 hot/over-credit; the single uncharged shot corrected the sim to 0.81). estimate = single uncharged 813.42% shot per cast (MEASURED). recipe = popup-read the burst hit in run-G / N6 footage. tier = MEASUREMENT-GATED. Residual (honest): kit-status 'Over-corrected; reads 0.80 (G) but 1.17 (N6) — unstable, audit candidate' — the magnitude is measurement-gated and the single-shot is the current calibrated encoding. Pierce tagging is inert in solo single-target (no Pierce Damage Up source in the graded comp, one target). Verbatim in unmodeled.burst. Kit-autonomy gauntlet 2026-07-26: cross-family audit — driver Qwen + blind claude-fable-5 (S2b) CONVERGED on skill1 (fullBurstEnter / alliesTopAtk:2 / byFinalAtk / chargeSpeed 4.48 + atkPct 43.1 /10s) and skill2 (unmodeled-inert); the burst single-shot model is measurement-gated vs the reviewer's kit-literal weaponSwap (measured>fudge — probe run-G is the ground truth); S5/S6 (opus) + S7 (kimi-k3) blind corroboration in scripts/kit-autonomy/results/maxwell.json. New per-unit spec scripts/tests/units/maxwell.test.ts pins every line GREEN vs shipped + RED vs its nearest-wrong counterfactual (fullBurstEnter vs burstCast apply-frame count; top-2 vs all-4 scope; single-shot vs multi-shot; 813.42 vs 2440.26 full-charge; crit/core eligibility flip; FB-exempt).",
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Activates when there are above 5 enemy units, excluding Nikkes. Affects self. Critical Rate ▲ 4.83%. Critical Damage ▲ 13.91%."
    ],
    "burst": [
      "Change the weapon in use: Charge Time 2 sec",
      "Full Charge Damage 300% of damage",
      "Max Ammunition Capacity 1 round",
      "Additional Effect: Pierce"
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "byFinalAtk": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 4.48,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 43.1,
          "durationSec": 10
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
          "atkPct": 813.42
        }
      ]
    }
  ]
}
```
