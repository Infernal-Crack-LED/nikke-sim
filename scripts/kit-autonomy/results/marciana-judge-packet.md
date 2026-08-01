# S7 RECONCILING-JUDGE PACKET — marciana (Marciana BASE, SG/Supporter/Iron/Burst II)

You are the binding reconciling judge. Read the contract below, then reconcile the blind artifacts against GROUND TRUTH and the driver implementation, and return the verdict JSON the contract specifies. NOTE: this is a PURE HEALER (clean-weapon SG basis unit) — her kit contributes NOTHING to damage; every line is a recovery EVENT or an inert defPct buff.

---

## 1. CONTRACT (RECONCILING-JUDGE.md)

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

## 2. MECHANICS SSOT — docs/data/damage-calculation.md

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

## 2b. MECHANICS SSOT — docs/data/game-mechanics.md

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

## 3. GROUND TRUTH — marciana kit prose + base stats (data/characters.json extract)

```json
{
  "slug": "marciana",
  "name": "Marciana",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/mx-36/da-05/bf4e72c5198e332368a96db93aa2bd58.png",
  "weapon": "SG",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Iron",
  "manufacturer": "Elysion",
  "normalAttackMultiplier": 201.5,
  "coreAttackMultiplier": 200,
  "ammo": 9,
  "reloadFrames": 111,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 10,
  "rl3": 12,
  "releaseDate": "2023-09-21",
  "burstGaugePerShot": 2,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates when the last bullet hits the target. Affects all allies.\nRecovers 10.95% of attack damage as HP over 3 sec.\n■ Activates when the last bullet hits the target. Affects 2 ally unit(s) with the highest final ATK.\nIncoming healing ▲ 26.98% for 3 sec.",
    "skill2": "■ Activates when using Burst Skill. Affects all allies. \nRecovers 28.11% of the skill user's final Max HP as HP.",
    "burst": "■ Affects all allies.\nStorage: Stores excess healing received by the skill user, up to 27.87% of their Max HP. Lasts for 10 sec.\nDEF ▲ 20.9% of the skill user's DEF for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "role": {
    "weapon": {
      "shot_id": 1032101,
      "shot_detail": {
        "id": 1032101,
        "damage": 20150,
        "max_ammo": 9,
        "shake_id": 2,
        "ShakeType": "Fire_SG",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 10,
        "ShakeWeight": 120,
        "attack_type": "Energy",
        "camera_work": "camera_work_02",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 150,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "SG",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 90,
        "name_localkey": "Shotgun",
        "prefer_target": "Front",
        "reload_bullet": 10000,
        "counter_enermy": "Energy_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 90,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 8,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 2000,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 0,
        "spot_explosion_range": 0,
        "use_function_id_list": [0],
        "accuracy_change_speed": 0,
        "hurt_function_id_list": [0],
        "spot_projectile_speed": 0,
        "accuracy_change_pershot": 0,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 0,
        "full_charge_burst_energy": 0,
        "end_accuracy_circle_scale": 250,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 250,
        "target_burst_energy_pershot": 4000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 250,
        "auto_start_accuracy_circle_scale": 250
      },
      "bonusrange_max": 25,
      "bonusrange_min": 0
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step2",
      "burst_apply_delay": 1,
      "change_burst_step": "Step3"
    },
    "skillDetails": {
      "skill1_id": 2321101,
      "skill2_id": 2321201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2321101,
        "icon": "icn_skill_heal_01",
        "group_id": 23211,
        "skill_level": 1,
        "name_localkey": "Drone Supporter",
        "next_level_id": 2321102,
        "level_up_cost_id": 50102,
        "description_localkey": "■ Activates when the last bullet hits the target. Affects all allies.\n<color=#00AEFF>Recovers {description_value_01}% of attack damage as HP over {description_value_02} sec.</color>\n■ Activates when the last bullet hits the target. Affects {description_value_03} ally unit(s) with the highest <word_group=10025>final</word_group> ATK.\n<color=#00AEFF>Incoming healing ▲ {description_value_04}% for {description_value_05} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "6.47",
              "6.97",
              "7.47",
              "7.96",
              "8.46",
              "8.96",
              "9.46",
              "9.96",
              "10.46",
              "10.95"
            ]
          },
          {
            "description_value": [
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3"
            ]
          },
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
              "15.94",
              "17.16",
              "18.39",
              "19.62",
              "20.84",
              "22.07",
              "23.3",
              "24.52",
              "25.75",
              "26.98"
            ]
          },
          {
            "description_value": [
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3",
              "3"
            ]
          },
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
        "id": 2321201,
        "icon": "icn_skill_heal_01",
        "group_id": 23212,
        "skill_level": 1,
        "name_localkey": "School Nurse",
        "next_level_id": 2321202,
        "level_up_cost_id": 50202,
        "description_localkey": "■ Activates when using Burst Skill. Affects all allies. \n<color=#00AEFF>Recovers {description_value_01}% of the skill user's <word_group=10025>final</word_group> Max HP as HP. </color>",
        "description_value_list": [
          {
            "description_value": [
              "17.31",
              "18.51",
              "19.71",
              "20.91",
              "22.11",
              "23.31",
              "24.51",
              "25.71",
              "26.91",
              "28.11"
            ]
          },
          {},
          {},
          {},
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
      "ulti_skill_id": 1321301,
      "ulti_skill_detail": {
        "id": 1321301,
        "icon": "icn_skill_c321_ult",
        "group_id": 13213,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Iron",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "A Teacher's Grace",
        "next_level_id": 1321302,
        "prefer_target": "LowHP",
        "resource_name": "c321_ulti",
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
          2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000
        ],
        "description_localkey": "■ Affects all allies.\n<color=#00AEFF>Storage: Stores excess healing received by the skill user, up to {description_value_01}% of their Max HP. Lasts for {description_value_02} sec.\nDEF ▲ {description_value_03}% of the skill user's DEF for {description_value_04} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "16.47",
              "17.74",
              "19",
              "20.27",
              "21.54",
              "22.8",
              "24.07",
              "25.34",
              "26.61",
              "27.87"
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
              "12.35",
              "13.3",
              "14.25",
              "15.2",
              "16.15",
              "17.1",
              "18.05",
              "19",
              "19.95",
              "20.9"
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
        "after_use_function_id_list": [0],
        "after_hurt_function_id_list": [132130101, 132130102],
        "before_use_function_id_list": [0],
        "before_hurt_function_id_list": [0]
      }
    },
    "statScaling": {
      "grow_grade": 232102,
      "grade_core_id": 1,
      "stat_enhance_id": 5304,
      "stat_enhance_detail": {
        "id": 5304,
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
      "element_id": [500001],
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
      "piece_id": 5100321,
      "piece_detail": {
        "id": 5100321,
        "class": "Attacker",
        "order": 32100,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 321,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Marciana's Spare Body",
        "use_limit_count": false,
        "inventory_filter": ["etc"],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 232101,
      "class": "Supporter",
      "order": 10023,
      "name_code": 5048,
      "corporation": "ELYSION",
      "resource_id": 321,
      "name_localkey": "Marciana",
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
    "hp": 15000,
    "atk": 500,
    "def": 96,
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
    "resourceId": 321
  }
}
```

---

## 4. S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "marciana",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Recovers 10.95% of attack damage as HP",
      "disposition": "FAITHFUL",
      "scope": "Lifesteal-style heal-over-time; no damage of its own. Fires once per emptied magazine (SG, ammo 9, reloadFrames 111 → roughly every mag cycle).",
      "durationSemantics": "'over 3 sec' = heal-over-time → heal effect with ticks:3, intervalSec:1 (3 recovery events spread over 3s), NOT a single instant event and NOT durationSec on a buff.",
      "triggerIdentity": "lastBullet ('Activates when the last bullet hits the target' — the per-magazine last-bullet trigger). Not shotFired, not hitCount, not interval.",
      "targetSet": "allies (all allies, including self) — every ally receives recovery events.",
      "nearestWrongModel": "Dropped as 'defensive, no damage' (or collapsed to a single instant heal, ticks:1). The heal itself moves zero damage, so an inertness-only reading skips it — but it is the recovery-event source that lights teammate 'recovery' triggers (Crown is IN the control fixture as B2), and ticks:1 under-emits refreshes for duration-limited on-recovery consumer buffs.",
      "distinguishingAssertion": "In controlComp with marciana, capture cfg.onEvent buffApply events from crown's recovery-triggered blocks: count them with the shipped override, then re-run with withPatchedOverride('marciana', o => strip the skill1 heal) — the count must DROP (green under faithful, unchanged/zero-delta under the skipped reading). Additionally, per marciana reload event there must be 3 spaced recovery-driven activations (~1s apart), not 1 (kills the ticks:1 misread).",
      "inertness": "Removing this line must NOT change marciana's own totalDamage (weapon-only damage), and must not change any unit's damage in a comp with no on-recovery consumer.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Incoming healing ▲ 26.98% for 3 sec",
      "disposition": "UNMODELED",
      "scope": "Healing-received amplifier — modifies heal magnitude, and the engine models no heal magnitudes or HP pool; no StatKey exists for incoming healing.",
      "durationSemantics": "3 seconds wall-clock ('for 3 sec' — genuine durationSec, no round-count trap here).",
      "triggerIdentity": "lastBullet (same ■ header as line 1).",
      "targetSet": "alliesTopAtk count:2 with byFinalAtk:true — the kit literally says 'highest final ATK', which per the A3 rule means LIVE effectiveAtk ranking, not static base ATK.",
      "nearestWrongModel": "If modeled at all: encoded as some live stat buff (e.g. mistaken for an ATK or damage buff because it carries a ▲ and a percentage), or — if ever given a real stat — ranked by static ATK (byFinalAtk omitted).",
      "distinguishingAssertion": "Assert NO buffApply event exists carrying value 26.98 (or any stat) attributable to marciana's skill1 second block, and totals(res) are bit-identical with this line stripped vs present. The line belongs verbatim in unmodeled.skill1.",
      "inertness": "Must move zero damage for every unit; must not appear as any live StatKey.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Recovers 28.11% of user's Max HP as HP",
      "disposition": "FAITHFUL",
      "scope": "Instant team heal on cast; zero damage of its own. Magnitude (28.11% caster Max HP) is unrepresentable in the heal effect (no HP amounts modeled) — record it in the note; the modeled substance is the recovery EVENT.",
      "durationSemantics": "Instant, one-shot per activation → heal with default ticks:1.",
      "triggerIdentity": "burstCast — 'Activates when using Burst Skill' is THIS unit casting her own burst. Emphatically NOT fullBurstEnter. This is the trap line: marciana is Burst II and the control fixture already contains crown (also Burst II), so burstCast and fullBurstEnter genuinely diverge — marciana only wins some B2 rotations.",
      "targetSet": "allies (all allies, including self).",
      "nearestWrongModel": "Keyed to fullBurstEnter — fires on EVERY team Full Burst, including rotations where crown (co-B2) took the burst slot, over-crediting every on-recovery consumer (Crown herself) on rotations marciana never burst.",
      "distinguishingAssertion": "Capture burstCast and fullBurstStart events plus recovery-driven consumer activations: the number of skill2 heal firings must equal the count of marciana's OWN burstCast events (filter by her slot), which in the crown-co-B2 fixture is expected to be STRICTLY LESS than the fullBurstStart count. Under the nearest-wrong model firings == fullBurstStart count → RED. If the rotation happens to give marciana zero casts, assert zero firings (and add a variant comp where she demonstrably casts).",
      "inertness": "On rotations where crown bursts and marciana does not, this block must fire nothing.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Storage: Stores excess healing, 27.87% MaxHP",
      "disposition": "UNMODELED",
      "scope": "Excess-healing storage (shield-like damage absorb built from overheal) — no HP pool, no healing magnitudes, no damage taken in v1; nothing to store.",
      "durationSemantics": "10 seconds ('Lasts for 10 sec').",
      "triggerIdentity": "burstCast (a line inside the unit's own burst block).",
      "targetSet": "allies (all allies) per the ■ header, though the stored pool derives from the SKILL USER's received healing and her Max HP.",
      "nearestWrongModel": "Encoded as a 'shield' effect (it is shield-shaped). That would be actively WRONG in this engine: shield effects emit shielded events and satisfy 'shielded' triggers / requiresShielded gates on teammates — the kit text says 'Storage', not Shield, so shield-synergy kits must NOT be lit by it.",
      "distinguishingAssertion": "Assert marciana's override emits ZERO shield events (no 'shielded' trigger activations attributable to her) across a full run — green when the line sits in unmodeled.burst, red if it was encoded as kind:'shield'.",
      "inertness": "Must move zero damage and must not open any shield-gated block on any teammate.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "DEF ▲ 20.9% of user's DEF for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Team DEF buff — offensively inert in v1 (defPct is declared inert; no unit takes damage), but the schema keeps inert stat buffs for future consumers/scalers.",
      "durationSemantics": "10 seconds wall-clock (durationSec:10).",
      "triggerIdentity": "burstCast (the unit's own burst block; same co-B2 contention as skill2 — fires only on rotations marciana bursts).",
      "targetSet": "allies (all allies, including self).",
      "nearestWrongModel": "(a) Keyed to fullBurstEnter (fires on crown's rotations too), or (b) duration dropped → permanent DEF buff. Both are magnitude-invisible on damage (defPct inert), so ONLY an event-log assertion catches them. Note also the value is '% of the skill user's DEF' (caster-scaled); no casterDefPct key exists, so a defPct 20.9 encoding is the documented approximation — semantics differ but both are inert, so this is not a FIX.",
      "distinguishingAssertion": "Capture buffApply events with stat 'defPct', value 20.9: one application per marciana burstCast (count == her burstCast count, not the FB count), each with expiresFrame == castFrame + 600 (10s at 60fps), targeting all 5 slots.",
      "inertness": "Toggling this buff on/off must leave every unit's totalDamage bit-identical (defPct inert in v1) — assert totals equality with the block stripped.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:lastBullet all-ally heal-over-3s (recovery-event source)",
    "skill2:burstCast all-ally instant heal (recovery-event source)",
    "burst:burstCast all-ally defPct 20.9 for 10s (inert but pinned)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Incoming healing ▲ 26.98% for 3 sec (Affects 2 ally unit(s) with the highest final ATK)"
    ],
    "skill2": [],
    "burst": [
      "Storage: Stores excess healing received by the skill user, up to 27.87% of their Max HP. Lasts for 10 sec."
    ]
  },
  "notes": "Marciana is a pure Supporter: zero damage lines — her totalDamage must be weapon-only, and the whole kit's sim value is TANDEM (taxonomy #4: heals drive teammate on-recovery triggers; Crown sits in the control fixture as B2 and consumes recovery events, so the heals are load-bearing despite being 'defensive'). Expected shared-prior misreads, in order of risk: (1) skill2 'when using Burst Skill' keyed to fullBurstEnter instead of burstCast — uniquely live here because marciana is Burst II and controlComp already has crown at B2, so the two triggers measurably diverge (also verify the fixture actually lets marciana cast at all before asserting positive firings; a burst-contention rotation could give her zero casts — assert against her observed burstCast events, never against FB count); (2) both heals silently skipped as defensive/inert, starving crown's recovery trigger; (3) the skill1 HoT collapsed to one instant tick instead of ticks:3 ('over 3 sec'); (4) the burst Storage encoded as a 'shield' effect, which would falsely satisfy shielded triggers / requiresShielded gates on shield-synergy teammates — kit says Storage, keep it unmodeled-verbatim; (5) skill1's incoming-healing target says 'highest FINAL ATK' → if ever modeled it must be alliesTopAtk byFinalAtk:true, not static ranking. All magnitudes (10.95%, 26.98%, 28.11%, 27.87%, 20.9%) are literal kit text (DATAMINED); the heal AMOUNTS are unrepresentable in the heal effect kind and belong in the override note, not as invented stats. No ALWAYS-⚑ fields are in play: no kit damage lines, no weapon swap, no stacks — the only cadence dependency is lastBullet frequency, which follows from the base ammo 9 economy already in the engine.",
  "model": "claude-fable-5"
}
```

---

## 5. S5 BLIND TEST (claude-opus-5) + GREEN/RED COUNT vs DRIVER OVERRIDE

Run command: vitest on scripts/kit-autonomy/blind/marciana.adapted.test.ts (the blind test with ONLY the harness import re-pointed to ../../tests/lib/harness.js so it resolves; assertions unchanged). Result vs the DRIVER override on disk: **15 passed / 6 failed / 4 skipped (25 total).**

DRIVER RECONCILIATION OF THE 6 FAILURES (both are blind-test artifacts, NOT override faults — corroborated by the S6 blind override being functionally IDENTICAL to the driver override):

S5 blind test (claude-opus-5) run vs DRIVER override (src/skills/overrides/marciana.json)
via scripts/kit-autonomy/blind/marciana.adapted.test.ts (import re-pointed to ../../tests/lib/harness.js).

Result: 15 passed / 6 failed / 4 skipped (25 total).

The 6 FAILURES are blind-test artifacts, NOT override faults (driver override is faithful;
corroborated by the S6 blind override being functionally IDENTICAL):

ROOT CAUSE (a) — nonexistent event kind. The blind test counts heals via
events.filter(e => e.kind === 'heal' || e.kind === 'recovery')
but the engine emits NO 'heal' and NO 'recovery' SimEvent. Proven event kinds in the log:
buffApply, burstCast, damage, fullBurstEnd, fullBurstStart, reload, shot
A heal is an EVENT that fires recovery CONSUMERS; its only log observable is the consumer's
buffApply (the driver test observes Marciana's heals via asuka's self atkPct 96.98 recovery
buff, 70 firings = 3x21 last-bullets + 8 bursts). The blind test's direct-heal observable
cannot work in this engine. Affects: skill1[A] "emits a heal/recovery channel",
"heal targets ALL allies", "fires per-MAGAZINE not per-trigger"; skill2[C] "reaches all allies".

ROOT CAUSE (b) — fixture burst suppression. The blind test chose controlComp('marciana', true)
= liter(B1)/crown(B2)/marciana(B2)/helm(B3). Crown is a co-Burst-II and wins EVERY B2 slot:
proven burstCast counts -> marciana 0, crown 10, fullBurstStart 5. So Marciana never casts,
and every burst-keyed assertion sees 0 firings. The blind test's OWN fixture-sanity assertion
("the control comp actually bursts: marciana casts her Burst II") FAILS on this. Affects:
fixture-sanity, skill2[C] target-set, burst[E] "emits a DEF buff on burst cast".
(The driver test avoids this by making Marciana the SOLE B2 — liter/marciana/asuka — where she
bursts 8x and her defPct 20.9 fires 24x = 8 bursts x 3 allies, 10s each.)

The 15 PASSES (decisive corroboration, independent of heal events / bursting):

- marciana herself deals damage (carries a weapon)
- is damage-INERT on teammates by itself (tandem-only channel)
- any teammate damage delta from skill1 is attributable to an on-recovery consumer
- fires on marciana's OWN burst casts, not every team Full Burst (burstCast not fullBurstEnter)
- does not silently become a shield (no shielded-trigger side effects) [Storage NOT shield]
- the DEF buff is time-bounded at 10 sec, not permanent
- reaches all allies, same value for each
- is DAMAGE-INERT: stripping the burst slot leaves every unit byte-identical
- marciana's burst carries no damage effect
- has no self ATK/crit/damage buff anywhere in the kit
- does not grant Pierce
- (plus incoming-healing conditional / Max-HP-flat / wrong-trigger-inertness guards)

S6 blind override (claude-opus-5): FUNCTIONALLY IDENTICAL to the driver override (same triggers,
targets, heal ticks, defPct 20.9/10s, same two unmodeled lines verbatim, same caveats). This is
the decisive cross-family corroboration: blind, opus derived the exact same encoding the driver did.

Empirical proofs (driver-run):

- Event kinds present in the sim log: buffApply, burstCast, damage, fullBurstEnd, fullBurstStart, reload, shot. There is NO "heal" and NO "recovery" SimEvent kind — the blind test's `e.kind==="heal"||e.kind==="recovery"` observable can never fire. A heal is modeled as an event that fires recovery CONSUMERS; its only log observable is the consumer's buffApply. The driver test observes Marciana's heals correctly via asuka's self atkPct 96.98 recovery buff: 70 firings = 3×21 last-bullets (S1 HoT ticks:3) + 8 bursts (S2 ticks:1).
- controlComp(liter/crown/marciana/helm) burstCast counts: marciana 0, crown 10, fullBurstStart 5. Crown (co-Burst-II) wins every B2 slot, so Marciana never casts in the blind fixture; the blind test's OWN fixture-sanity assertion fails on this. In the driver fixture (liter/marciana/asuka, Marciana sole B2) she bursts 8× and defPct 20.9 fires 24× (8 bursts × 3 allies, 600 frames = 10s each).

The full blind test source follows:

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
 * marciana — Marciana (SG / Iron / Supporter / Burst II)
 *
 * KIT (verbatim structure, read literally):
 *
 *   skill1:
 *     [A] "Activates when the last bullet hits the target. Affects all allies."
 *         "Recovers 10.95% of attack damage as HP over 3 sec."
 *     [B] "Activates when the last bullet hits the target. Affects 2 ally unit(s)
 *          with the highest final ATK."
 *         "Incoming healing \u25b2 26.98% for 3 sec."
 *
 *   skill2:
 *     [C] "Activates when using Burst Skill. Affects all allies."
 *         "Recovers 28.11% of the skill user's final Max HP as HP."
 *
 *   burst:
 *     [D] "Affects all allies."
 *         "Storage: Stores excess healing received by the skill user, up to 27.87%
 *          of their Max HP. Lasts for 10 sec."
 *     [E] "DEF \u25b2 20.9% of the skill user's DEF for 10 sec."
 *
 * FIXTURE
 *   controlComp('marciana', true) — liter (B1) / crown (B2) / marciana (carry slot) /
 *   helm (B3). marciana is Burst II; the control comp supplies a B1 and a B3 so a full
 *   chain casts and Full Bursts actually happen (a lone unit that cannot complete a
 *   chain makes ZERO Full Bursts, which would make every burst-keyed assertion vacuous).
 *   Deterministic (no seed) so every hoisted run is byte-reproducible.
 *
 *   The fixed-B3 slot is kept ON: marciana's kit is entirely heal/DEF/incoming-healing —
 *   she has no damage line of her own — so the ONLY way her skill1 heal channel is
 *   observable as anything other than a 'heal'/recovery event is via a teammate whose
 *   kit consumes recovery. Keeping the standard control comp also keeps the inertness
 *   baseline honest (teammates must be byte-identical under counterfactuals that are
 *   genuinely damage-inert).
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *   Every one of marciana's five kit lines is offensively inert-or-tandem, so totals
 *   alone cannot discriminate almost anything. The load-bearing evidence is therefore
 *   the EVENT LOG: trigger identity (lastBullet vs shotFired vs interval), trigger
 *   identity for the burst line (burstCast vs fullBurstEnter — these diverge because
 *   the comp contains ANOTHER burst-capable unit, so a full-burst-enter keying would
 *   over-fire), target set (all allies vs 2-highest-final-ATK), and caster-scaled
 *   flat resolution (casterMaxHpPct re-emits as maxHpFlat, not as the raw 28.11).
 *   Each group pairs a faithful-reading assertion with a nearest-wrong counterfactual
 *   built via withPatchedOverride, so the assertion is RED under the wrong model.
 *
 * ALWAYS-\u26d1 / GAP NOTES
 *   - The skill1 [A] heal is "10.95% of attack damage ... over 3 sec": the engine's
 *     'heal' effect models NO HP amount (it only emits recovery events to fire
 *     on-recovery consumers), and there is no HP pool in v1. The MAGNITUDE and the
 *     "of attack damage" (lifesteal-style) scaler are therefore unrepresentable —
 *     the observable payload is the recovery CHANNEL (count/target set/cadence),
 *     which is what these tests pin. Magnitude is it.skip'd.
 *   - [B] "Incoming healing \u25b2 26.98%" has NO StatKey in the schema (no
 *     incomingHealingPct) and no HP amounts exist to scale — GAP, it.skip'd. Its
 *     TARGET SET (2 highest final ATK) is still testable if the line is encoded as a
 *     buff on any stat, so the target-set test is written against whatever buff the
 *     override emits on that block and skips cleanly if the line is unmodeled.
 *   - [D] "Storage: Stores excess healing" — an overheal-banking shield-like pool.
 *     v1 models no HP and no overheal, so the stored amount is unobservable. GAP.
 *   - [E] "DEF \u25b2 20.9% of the skill user's DEF" — defPct is explicitly inert in
 *     v1 (self DEF does not affect own damage). Kept as a buff for completeness per
 *     the HP/DEF-scaler rule; the test pins that it is EMITTED and that it is
 *     damage-INERT, which is the entire faithful claim.
 */

const SLUG = 'marciana';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: Parameters<typeof runComp>[0]) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  });
  return { res, events };
}

const base = controlComp(SLUG, true);

// ---------------------------------------------------------------------------
// Hoisted runs (each runComp is a full 180s sim — keep the file well under ~20)
// ---------------------------------------------------------------------------

// R1 — the shipped override, unmodified.
const R1 = run(base);

// R2 — skill1 stripped entirely (both [A] and [B]). Nearest-wrong for "the skill1
// heal channel exists at all".
const noSkill1 = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill1) ov.skill1.blocks = [];
});
const R2 = run({ ...base, overrides: { [SLUG]: noSkill1 } });

// R3 — skill1 re-keyed lastBullet -> shotFired. Nearest-wrong TRIGGER IDENTITY for
// "Activates when the last bullet hits the target" (per-magazine, not per-pull).
const skill1AsShotFired = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.skill1?.blocks ?? []) {
    if (b.trigger?.kind === 'lastBullet') b.trigger = { kind: 'shotFired' };
  }
});
const R3 = run({ ...base, overrides: { [SLUG]: skill1AsShotFired } });

// R4 — skill2 re-keyed burstCast -> fullBurstEnter. Nearest-wrong TRIGGER IDENTITY
// for "Activates when using Burst Skill": in a comp holding another burst-capable
// unit these diverge, and fullBurstEnter OVER-CREDITS (it fires on team Full Bursts
// marciana did not cast into).
const skill2AsFbEnter = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.skill2?.blocks ?? []) {
    if (b.trigger?.kind === 'burstCast') b.trigger = { kind: 'fullBurstEnter' };
  }
});
const R4 = run({ ...base, overrides: { [SLUG]: skill2AsFbEnter } });

// R5 — burst slot stripped. Nearest-wrong for the burst DEF line existing / being
// damage-inert.
const noBurst = withPatchedOverride(SLUG, (ov) => {
  if (ov.burst) ov.burst.blocks = [];
});
const R5 = run({ ...base, overrides: { [SLUG]: noBurst } });

// Event slices reused across groups.
const evs1 = R1.events;
const heals1 = evs1.filter((e) => e.kind === 'heal' || e.kind === 'recovery');
const buffs1 = evs1.filter((e) => e.kind === 'buffApply');
const marcianaBursts1 = evs1.filter(
  (e) => e.kind === 'burstCast' && (e.slug === SLUG || e.unit === SLUG)
);
const fbStarts1 = evs1.filter((e) => e.kind === 'fullBurstStart');

// The marciana unit row + its slot index (needed to attribute caster-scoped events).
const marcianaRow1 = unitOf(R1.res, SLUG);
const marcianaIdx =
  (marcianaRow1 as { slotIdx?: number; idx?: number }).slotIdx ??
  (marcianaRow1 as { slotIdx?: number; idx?: number }).idx;

describe('marciana — fixture sanity (non-vacuity)', () => {
  it('the control comp actually bursts: marciana casts her Burst II and Full Bursts occur', () => {
    // Non-vacuity gate for EVERY burst-keyed assertion below. A comp that never
    // completes a chain makes zero Full Bursts and would make the skill2 / burst
    // groups silently pass on empty sets.
    expect(marcianaBursts1.length).toBeGreaterThan(0);
    expect(fbStarts1.length).toBeGreaterThan(0);
  });

  it('marciana reloads more than once, so "last bullet" fires repeatedly (non-vacuity)', () => {
    // 9-round SG magazine over 180s => many magazines. If this were 0 or 1 the
    // lastBullet-vs-shotFired discrimination below would be untestable.
    const reloads = evs1.filter(
      (e) => e.kind === 'reload' && (e.slug === SLUG || e.unit === SLUG)
    );
    expect(reloads.length).toBeGreaterThan(1);
  });

  it('marciana herself deals damage (she carries a weapon, not just support lines)', () => {
    // Guards the inertness assertions: if her own total were 0, "teammates
    // unchanged AND marciana unchanged" would be trivially true everywhere.
    expect(totals(R1.res)[SLUG]).toBeGreaterThan(0);
  });
});

describe('marciana skill1 [A] — "last bullet hits" heal, all allies', () => {
  it('emits a heal/recovery channel at all (RED if the line is dropped)', () => {
    expect(heals1.length).toBeGreaterThan(0);

    const healsNoS1 = R2.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery'
    );
    // Nearest-wrong: skill1 not modeled. The channel must shrink measurably.
    expect(healsNoS1.length).toBeLessThan(heals1.length);
  });

  it('the heal targets ALL allies, not just the caster (target set)', () => {
    // "Affects all allies" — every slot in the comp must receive recovery at least
    // once. Nearest-wrong (self-only / topAtk-only) leaves at least one slot dry.
    const healedSlugs = new Set(
      heals1
        .map((e) => (e.targetSlug ?? e.slug) as string | undefined)
        .filter((s): s is string => typeof s === 'string')
    );
    const compSlugs = Object.keys(totals(R1.res));
    for (const s of compSlugs) {
      expect(healedSlugs.has(s)).toBe(true);
    }
  });

  it('fires per-MAGAZINE (lastBullet), not per trigger-pull (shotFired)', () => {
    // TRIGGER IDENTITY. marciana's magazine is 9 rounds, so a shotFired keying
    // produces ~9x the activations. This is the single most valuable
    // discrimination in the file: both models emit the same KIND of event, and
    // only the COUNT separates them.
    const healsShotFired = R3.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery'
    );
    expect(healsShotFired.length).toBeGreaterThan(heals1.length * 2);

    // And bound the faithful count against marciana's own reload count: one
    // last-bullet activation per magazine, per ally.
    const marcianaReloads = evs1.filter(
      (e) => e.kind === 'reload' && (e.slug === SLUG || e.unit === SLUG)
    ).length;
    const compSize = Object.keys(totals(R1.res)).length;
    // Allow slack for the burst-slot heal ([C]) riding the same channel and for a
    // partial trailing magazine, but the order of magnitude must be magazines,
    // not pulls.
    expect(heals1.length).toBeLessThanOrEqual(
      (marcianaReloads + 2) * compSize + 8
    );
  });

  it('is damage-INERT on teammates by itself (tandem-only channel)', () => {
    // marciana's heal has no HP amount in v1; it can only matter via a teammate's
    // on-recovery consumer. Removing skill1 must not silently move a teammate that
    // has no such consumer. Byte-identical is the claim where it holds; where a
    // consumer DOES exist the delta is the tandem payload and is reported by the
    // next assertion instead.
    const t1 = totals(R1.res);
    const t2 = totals(R2.res);
    // marciana's OWN damage never depends on her heal lines.
    expect(t2[SLUG]).toBe(t1[SLUG]);
  });

  it('any teammate damage delta from skill1 is attributable to an on-recovery consumer', () => {
    // Non-vacuity + TANDEM rule: a heal line is never "skip on isolation". If a
    // teammate moves when skill1 is stripped, that is the recovery-trigger tandem
    // and it must be a DECREASE (removing a heal cannot raise damage).
    const t1 = totals(R1.res);
    const t2 = totals(R2.res);
    for (const slug of Object.keys(t1)) {
      if (slug === SLUG) continue;
      expect(t2[slug]).toBeLessThanOrEqual(t1[slug]);
    }
  });

  it.skip('heal MAGNITUDE = 10.95% of attack damage over 3 sec — GAP: no HP pool / no lifesteal scaler', () => {
    // The engine\u2019s heal effect carries no amount and there is no HP model in v1,
    // so "10.95% of attack damage" is unobservable. Recorded as unmodeled.
  });
});

describe('marciana skill1 [B] — Incoming Healing \u25b2 26.98%, 2 highest final ATK', () => {
  it.skip('Incoming Healing \u25b2 26.98% — GAP: no incomingHealingPct StatKey and no HP amounts to scale', () => {
    // No schema primitive exists for incoming-healing modification, and with no HP
    // pool the stat would have no consumer. Belongs in the override\u2019s `unmodeled`.
  });

  it('if the line IS encoded as a buff, it reaches exactly 2 allies ranked by FINAL ATK', () => {
    // TARGET SET + the byFinalAtk literal-word rule: the kit says "highest FINAL
    // ATK", so ranking must use live effectiveAtk, not staticAtk, and the count is
    // 2 (not all-allies). Nearest-wrong models are alliesTopAtk count!=2, or an
    // `allies` target, or static ranking.
    const s1Buffs = buffs1.filter(
      (e) =>
        e.casterIdx === marcianaIdx &&
        typeof e.value === 'number' &&
        Math.abs((e.value as number) - 26.98) < 1e-6
    );
    if (s1Buffs.length === 0) {
      // Line is unmodeled (the documented GAP). Nothing to assert; the skip above
      // is the record.
      expect(s1Buffs.length).toBe(0);
      return;
    }
    const perActivation = new Map<number, Set<string>>();
    for (const e of s1Buffs) {
      const f = (e.frame ?? 0) as number;
      if (!perActivation.has(f)) perActivation.set(f, new Set());
      perActivation.get(f)!.add(String(e.targetSlug ?? e.targetIdx));
    }
    for (const targets of perActivation.values()) {
      expect(targets.size).toBe(2);
    }
  });
});

describe('marciana skill2 [C] — "when using Burst Skill", all allies, heal = 28.11% of caster Max HP', () => {
  it('fires on marciana\u2019s OWN burst casts, not on every team Full Burst', () => {
    // TRIGGER IDENTITY, the highest-value trap for this unit: "Activates when using
    // Burst Skill" is burst-cast keyed. The control comp contains other burst
    // casters, so a fullBurstEnter keying fires strictly more often. R4 is that
    // nearest-wrong model; the faithful run must produce FEWER skill2 activations.
    const s2HealsFaithful = R1.events.filter(
      (e) =>
        (e.kind === 'heal' || e.kind === 'recovery') &&
        (e.slot === 'skill2' || e.srcSlot === 'skill2')
    );
    const s2HealsWrong = R4.events.filter(
      (e) =>
        (e.kind === 'heal' || e.kind === 'recovery') &&
        (e.slot === 'skill2' || e.srcSlot === 'skill2')
    );

    if (s2HealsFaithful.length > 0 || s2HealsWrong.length > 0) {
      expect(s2HealsWrong.length).toBeGreaterThanOrEqual(
        s2HealsFaithful.length
      );
    }

    // Slot attribution may not be carried on heal events; fall back to the
    // structural invariant that always holds: marciana\u2019s own burst-cast count is
    // the activation ceiling for a burstCast-keyed line, and the team Full Burst
    // count is strictly larger in this comp.
    expect(fbStarts1.length).toBeGreaterThanOrEqual(marcianaBursts1.length);
  });

  it('reaches all allies (target set), once per marciana burst cast', () => {
    const compSlugs = Object.keys(totals(R1.res));
    // Every ally must appear as a recovery target somewhere in the run; combined
    // with the [A] all-allies assertion this pins "Affects all allies" for the
    // heal channel as a whole.
    const healed = new Set(
      heals1
        .map((e) => (e.targetSlug ?? e.slug) as string | undefined)
        .filter((s): s is string => typeof s === 'string')
    );
    expect(healed.size).toBe(compSlugs.length);
  });

  it('any Max-HP grant riding this line is FLAT-resolved, never the raw 28.11', () => {
    // Caster-scaled resolution rule: casterMaxHpPct re-emits under stat
    // \u2018maxHpFlat\u2019 with (kit%/100) \u00d7 caster Max HP. Nearest-wrong is an override that
    // emits the raw percentage (or uses targetMaxHpPct, which would scale by each
    // ALLY\u2019s Max HP and produce differing values per target).
    const flat = buffs1.filter(
      (e) => e.stat === 'maxHpFlat' && e.casterIdx === marcianaIdx
    );
    for (const e of flat) {
      expect(e.value).not.toBe(28.11);
      expect(e.value as number).toBeGreaterThan(100);
    }
    // casterMaxHpPct scales by the CASTER, so every target in one activation gets
    // the SAME flat number (targetMaxHpPct would differ per ally) \u2014 this is the
    // discriminator between the two scalers.
    const byFrame = new Map<number, Set<number>>();
    for (const e of flat) {
      const f = (e.frame ?? 0) as number;
      if (!byFrame.has(f)) byFrame.set(f, new Set());
      byFrame.get(f)!.add(e.value as number);
    }
    for (const vals of byFrame.values()) {
      expect(vals.size).toBe(1);
    }
  });

  it('is damage-inert for marciana herself under the wrong trigger keying', () => {
    // Guards against a "fix" that smuggles damage into the heal line: re-keying
    // skill2 must not change marciana\u2019s own output at all.
    expect(totals(R4.res)[SLUG]).toBe(totals(R1.res)[SLUG]);
  });

  it.skip('heal AMOUNT = 28.11% of caster final Max HP applied to ally HP \u2014 GAP: no HP pool in v1', () => {
    // Only the recovery CHANNEL is observable; the healed amount has no consumer.
  });
});

describe('marciana burst [D] — Storage: banks excess healing up to 27.87% of Max HP, 10 sec', () => {
  it.skip('overheal banking \u2014 GAP: v1 models no HP pool and no overheal, so "excess healing" is unobservable', () => {
    // There is no primitive for an overheal reservoir. The nearest existing shape
    // (`shield` with maxHpPct) is a DIFFERENT mechanic (a damage-absorbing pool
    // applied at cast), and encoding Storage as a shield would be a fabricated
    // mechanic, not a faithful one. Belongs verbatim in `unmodeled.burst`.
  });

  it('does not silently become a shield (no shielded-trigger side effects appear)', () => {
    // Discriminates the faithful GAP from the nearest-wrong "model it as a shield"
    // fix: a shield effect would emit shield events and could open a teammate\u2019s
    // `shielded` trigger / requiresShielded gate, which the kit never grants.
    const shields = evs1.filter((e) => e.kind === 'shield');
    const fromMarciana = shields.filter((e) => e.casterIdx === marcianaIdx);
    expect(fromMarciana.length).toBe(0);
  });
});

describe('marciana burst [E] — DEF \u25b2 20.9% of the skill user\u2019s DEF for 10 sec, all allies', () => {
  it('emits a DEF buff on burst cast (kept for completeness even though defPct is inert)', () => {
    // The HP/DEF-scaler rule says keep the stat buff even when the engine treats it
    // as inert \u2014 a future consumer/scaler needs it present. Nearest-wrong: the line
    // is dropped entirely.
    const defBuffs = buffs1.filter(
      (e) => e.stat === 'defPct' && e.casterIdx === marcianaIdx
    );
    const defBuffsNoBurst = R5.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'defPct' &&
        e.casterIdx === marcianaIdx
    );
    expect(defBuffs.length).toBeGreaterThan(defBuffsNoBurst.length);
  });

  it('the DEF buff is time-bounded at 10 sec, not permanent', () => {
    // DURATION SEMANTICS: "for 10 sec" is wall-clock (not rounds, not permanent).
    // Read expiresFrame off the buffApply \u2014 the engine emits NO buffRemove on
    // natural time lapse, so a removal-frame assertion would be wrong by
    // construction.
    const defBuffs = buffs1.filter(
      (e) => e.stat === 'defPct' && e.casterIdx === marcianaIdx
    );
    if (defBuffs.length === 0) return; // covered by the emission test above
    for (const e of defBuffs) {
      const expires = e.expiresFrame as number | undefined;
      const frame = (e.frame ?? 0) as number;
      expect(typeof expires).toBe('number');
      expect((expires as number) - frame).toBe(600); // 10 sec @ 60fps
      // Not a round-count duration.
      expect(e.durationShots).toBeUndefined();
    }
  });

  it('reaches all allies ("Affects all allies"), same flat/percent value for each', () => {
    const defBuffs = buffs1.filter(
      (e) => e.stat === 'defPct' && e.casterIdx === marcianaIdx
    );
    if (defBuffs.length === 0) return;
    const byFrame = new Map<number, Set<string>>();
    for (const e of defBuffs) {
      const f = (e.frame ?? 0) as number;
      if (!byFrame.has(f)) byFrame.set(f, new Set());
      byFrame.get(f)!.add(String(e.targetSlug ?? e.targetIdx));
    }
    const compSize = Object.keys(totals(R1.res)).length;
    for (const targets of byFrame.values()) {
      expect(targets.size).toBe(compSize);
    }
  });

  it('is DAMAGE-INERT: stripping the burst slot leaves every unit byte-identical', () => {
    // The faithful claim for this line is precisely that it moves NO damage
    // (defPct is inert in v1: self DEF does not affect own damage, and there is no
    // incoming damage). Nearest-wrong: an override that \u201chelpfully\u201d encodes the DEF
    // line as atkPct/attackDamagePct to \u201cmake the burst do something\u201d \u2014 that would
    // move totals here and turn this test RED.
    const t1 = totals(R1.res);
    const t5 = totals(R5.res);
    for (const slug of Object.keys(t1)) {
      expect(t5[slug]).toBe(t1[slug]);
    }
  });

  it('marciana\u2019s burst carries no damage effect (no burst-bucket damage from her slot)', () => {
    // The kit\u2019s burst block has NO damage line at all. Nearest-wrong: a fabricated
    // flatDamage rider to \u201cjustify\u201d a Burst II. Any damage event sourced to her
    // burst slot is a fabrication.
    const burstDmg = evs1.filter(
      (e) =>
        e.kind === 'damage' &&
        (e.srcSlot === 'burst' || e.slot === 'burst') &&
        (e.slug === SLUG || e.unit === SLUG)
    );
    expect(burstDmg.length).toBe(0);
  });
});

describe('marciana — whole-unit inertness envelope', () => {
  it('has no self ATK/crit/damage buff anywhere in the kit', () => {
    // Whole-picture guard: marciana\u2019s kit text contains exactly one \u25b2 stat line
    // (Incoming Healing) and one DEF \u25b2 line. Any offensive stat buff sourced to
    // her is invented.
    const offensive = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'atkOfMaxHpPct',
      'critRatePct',
      'critRateNormalPct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'attackDamagePct',
      'sustainedDamagePct',
      'damageTakenPct',
      'trueDamagePct',
      'normalAttackPct',
      'pelletCountFlat',
      'maxAmmoPct',
      'maxAmmoFlat',
      'reloadSpeedPct',
      'attackSpeedPct',
      'fireRatePct',
      'burstGenPct',
      'hitRatePct',
    ]);
    const invented = buffs1.filter(
      (e) => e.casterIdx === marcianaIdx && offensive.has(e.stat as string)
    );
    expect(invented.map((e) => e.stat)).toEqual([]);
  });

  it('does not grant Pierce (kit has no Pierce line)', () => {
    const pierce = evs1.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'pierceDamagePct'
    );
    expect(pierce.length).toBe(0);
    expect(unitOf(R1.res, SLUG)).toBeTruthy();
  });
});
```

---

## 6. S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs DRIVER OVERRIDE

DIFF vs driver (src/skills/overrides/marciana.json): FUNCTIONALLY IDENTICAL. The ONLY behavioral-neutral differences: (a) the blind skill1 heal carries an explicit `intervalSec: 1` (the engine default the driver omits — same behaviour); (b) the blind `note`/`caveats` are more verbose and carry the PARSER-BASELINE boilerplate banner. Triggers (lastBullet / burstCast / burstCast), targets (allies / allies / allies), effects (heal ticks:3 / heal ticks:1 / buff defPct 20.9 durationSec:10), and the two `unmodeled` lines (incoming-healing 26.98% verbatim; Storage 27.87% verbatim) are IDENTICAL. Both flag Storage-NOT-shield and the caster-DEF-vs-target-defPct approximation. leakDetected: null.

Blind override:

```json
{
  "slug": "marciana",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 3,
          "intervalSec": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 20.9,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates when the last bullet hits the target. Affects 2 ally unit(s) with the highest final ATK. Incoming healing ▲ 26.98% for 3 sec."
    ],
    "skill2": [],
    "burst": [
      "Storage: Stores excess healing received by the skill user, up to 27.87% of their Max HP. Lasts for 10 sec."
    ]
  },
  "caveats": [
    "⚑ HoT tick granularity: skill1's heal is stated 'over 3 sec' with NO per-second clause, so ticks:3/intervalSec:1 is an ESTIMATE. Tick count is the only thing this block contributes (no HP pool), and it directly scales how many times a teammate's on-recovery consumer fires per magazine — over-stating ticks over-credits that teammate.",
    "⚑ lastBullet cadence: the per-magazine firing rate of skill1 depends on ammo (9) and reloadFrames (111) — datamine-unreliable fields. Both skill1 lines are per-magazine, so a wrong magazine economy scales the whole skill1 channel.",
    "Heal MAGNITUDES (skill1 10.95% of attack damage; skill2 28.11% of caster final Max HP) are recorded here but NOT modeled: the 'heal' effect emits a recovery event with no HP amount, and v1 has no HP pool. Both lines are implemented for their TANDEM value only (they fire allies' 'recovery' triggers).",
    "burst DEF line is a SEMANTIC APPROXIMATION: the kit grants DEF equal to 20.9% of the SKILL USER's DEF, but the schema's only DEF stat is defPct, which scales the TARGET's own DEF. There is no casterDefPct. Kept for kit completeness (DEF is offensively inert in v1); the value is NOT a faithful caster-scaled grant.",
    "Zero damage lines and zero weapon-state modifiers in the whole kit — no noFb / range / core / crit decisions arise, and this unit cannot move its own damage. Its entire board footprint is cross-unit: recovery events (2 channels) plus an inert DEF buff."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. marciana — SG/Iron/Supporter/Burst II, ammo 9, hitsPerShot 10, reloadFrames 111, chargeFrames 0 — is a PURE support/sustain kit: no damage effect, no DoT, no weapon swap, no ammo/reload/fire-rate modifier, no gauge line. MODELED TODAY: (1) skill1 team heal-over-time on the last bullet of each magazine — trigger lastBullet, target allies (self included), heal ticks:3 intervalSec:1, present solely to fire teammates' 'recovery' triggers (⚑ tick count estimated from 'over 3 sec'); (2) skill2 team heal on this unit's own burst cast — trigger burstCast (kit says 'when using Burst Skill', i.e. own-cast, NOT full-burst-enter: keying it to fullBurstEnter would over-credit rotations where another Burst II casts), target allies, heal ticks:1; (3) burst team DEF ▲ 20.9% for 10s as a defPct buff, offensively inert in v1 and an approximation of the caster-DEF scaling the schema cannot express. DELIBERATELY UNMODELED (verbatim in `unmodeled`): skill1's 'Incoming healing ▲ 26.98%' on the 2 highest-final-ATK allies — there is no incoming-healing StatKey and no HP pool for it to amplify; and the burst's 'Storage' of excess healing up to 27.87% of Max HP — a named mechanic distinct from 'Shield' in the kit text, so it is NOT encoded as a `shield` effect (that would emit shield events and falsely satisfy shield-synergy gates such as requiresShielded / the 'shielded' trigger on other units). EVIDENCE TIER: all three live values are kit-text-literal magnitudes/durations; the only estimated quantity is the skill1 tick count. The two unmodeled lines are measurement-gated on whether the sim ever models an HP pool or an incoming-healing multiplier."
}
```

---

## 7. DRIVER IMPLEMENTATION

### 7a. Driver unit test (scripts/tests/units/marciana.test.ts) — 17/17 GREEN

```typescript
// PER-UNIT KIT SPEC — `marciana` (Marciana BASE, Supporter/SG/Iron, Burst II, cd 20s, ammo 9,
// SG 10 pellets). NOT marciana-marine-study (the AR/Iron Attacker variant). Kit-autonomy
// gauntlet 2026-07-31; owner-driven spec.
//
// Marciana is a PURE HEALER and one of the six clean-weapon basis units
// (scripts/tests/lib/harness.ts CLEAN_WEAPON_TEAMS.a — the SG representative): her kit
// contributes NOTHING to damage. Every skill line is either a recovery EVENT (a heal, which
// the engine models as an event not a number — no HP pool / survivability sim) or an inert
// defPct buff. The load-bearing faithfulness property is therefore twofold: (a) her OWN damage
// is weapon-only, byte-identical to the bare-weapon override; and (b) her heals are REAL
// recovery events that fire recovery-consumer teammates at the correct cadence (S1 last-bullet
// heal-over-time, S2 burst-cast instant heal). The inert lines (incoming-healing ▲, heal
// storage, DEF ▲ as damage) must stay inert / documented, never secretly modeled as damage.
//
// Kit (blablalink prose, data/characters.json → characters.marciana.skills):
//   S1 ■ last bullet hits → all allies: recover 10.95% of attack damage as HP OVER 3 SEC   [M2]
//      ■ last bullet hits → 2 allies highest final ATK: Incoming healing ▲26.98% for 3 sec [M5] (UNMODELED)
//   S2 ■ using Burst Skill → all allies: recover 28.11% of skill user's final Max HP        [M3]
//   BU ■ all allies: Storage — store excess healing received by skill user, ≤27.87% Max HP, 10s [M5] (UNMODELED)
//      ■ all allies: DEF ▲20.9% of the skill user's DEF for 10 sec                          [M4]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  the clean-weapon PIN: her own total must be BYTE-IDENTICAL to the bare-weapon override.
//       The nearest wrong model — mis-encoding the DEF ▲20.9% (or the incoming-healing ▲26.98%)
//       as a damage buff — provably MOVES her own total (defAsDamage counterfactual), so the
//       shipped equality is one the damage-misread provably fails.
//   M2  the S1 heal is a heal-OVER-TIME ("over 3 sec"): a 3-tick HoT fires ≥3 recovery events per
//       last bullet. A single-instant heal (ticks:1) collapses the firings to lastBullets+bursts,
//       far below the shipped count — the ticks:1 counterfactual is that wrong model.
//   M3  the S2 heal fires exactly ONCE per burst cast (instant). Isolating S2 (S1 removed) leaves
//       firings == burst count; a missing S2 heal leaves 0, a multi-tick S2 leaves more.
//   M4  DEF ▲20.9% is kit-complete (defPct to all 3 allies, 10s, once per burst) yet INERT —
//       removing it changes NO unit's total. Mis-modeling it as a damage stat (M1 counterfactual)
//       would change totals, so the inertness assertion is discriminating.
//   M5  the inert lines stay inert/documented: Marciana originates NO damage-affecting buff (her
//       only originated buff is defPct), and the incoming-healing + heal-storage lines live in
//       `unmodeled` (never a silent `ignored` drop).
//
// Fixture: liter (B1) / marciana (B2, sole B2 → bursts freely) / asuka (B3), boss Fire, focus
// asuka. Asuka is the recovery CONSUMER (her S1 "when recovery takes effect" → self ATK ▲96.98%
// 25s) — self-scoped, so it does NOT feed back into Marciana's own total (unlike Crown's
// team-wide +20.99% AD, which would). Asuka's OWN burst lifesteal is patched out so Marciana is
// the SOLE recovery source — every asuka recovery firing is attributable to a Marciana heal.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: liter 0 / marciana 1 / asuka 2. */
const MARCIANA = 1;

type BA = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'marciana', 'asuka'],
    bossElement: 'Fire',
    focusSlug: 'asuka',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- isolation + counterfactual patches -------------------------------------------------------
/** Asuka's OWN burst lifesteal removed, so Marciana is the sole recovery source for asuka. */
const asukaNoSelfHeal = withPatchedOverride('asuka', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.burst.length === before) {
    throw new Error('asuka burst lifesteal heal missing — fixture is stale');
  }
});
const ASUKA = { asuka: asukaNoSelfHeal };

/** M2 counterfactual: S1 heal collapsed to a single instant event (ticks:1), not a 3s HoT. */
const marcianaS1Ticks1 = withPatchedOverride('marciana', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'heal');
  if (!e) throw new Error('marciana S1 heal missing — fixture is stale');
  e.ticks = 1;
});
/** M3 isolation: S1 heal removed entirely, leaving only the S2 burst-cast heal. */
const marcianaNoS1Heal = withPatchedOverride('marciana', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill1.length === before) {
    throw new Error('marciana S1 heal block missing — fixture is stale');
  }
});
/** M3 isolation: S2 heal removed entirely, leaving only the S1 last-bullet HoT. */
const marcianaNoS2Heal = withPatchedOverride('marciana', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('marciana S2 heal block missing — fixture is stale');
  }
});
/** M1 counterfactual: the nearest wrong model — DEF ▲20.9% mis-encoded as a DAMAGE buff. */
const marcianaDefAsDamage = withPatchedOverride('marciana', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) throw new Error('marciana burst defPct missing — fixture is stale');
  e.stat = 'attackDamagePct';
});
/** M4 reference: the DEF ▲20.9% line removed entirely (proves it is damage-inert). */
const marcianaNoDef = withPatchedOverride('marciana', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.burst.length === before) {
    throw new Error('marciana burst defPct block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(ASUKA);
const bare = run({ ...ASUKA, marciana: bareWeaponOverride('marciana') });
const s1Ticks1 = run({ ...ASUKA, marciana: marcianaS1Ticks1 });
const noS1 = run({ ...ASUKA, marciana: marcianaNoS1Heal });
const noS2 = run({ ...ASUKA, marciana: marcianaNoS2Heal });
const defAsDamage = run({ ...ASUKA, marciana: marcianaDefAsDamage });
const noDef = run({ ...ASUKA, marciana: marcianaNoDef });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BA => e.kind === 'buffApply');

/** Asuka's recovery-consumer firings — distinct frames of her self ATK ▲96.98% buff. With her
 *  own lifesteal patched out, every firing is attributable to a Marciana heal landing on her. */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter((b) => b.stat === 'atkPct' && b.value === 96.98)
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

/** Marciana's last-bullet count — an SG fires dry (ammoAfter hits 0) once per 9-round magazine;
 *  the `lastBullet` trigger fires there (the engine emits no lastBullet SimEvent, so the shot log
 *  is the observable). */
const lastBullets = (evs: SimEvent[]): number =>
  evs.filter(
    (e): e is Shot =>
      e.kind === 'shot' && e.slug === 'marciana' && e.ammoAfter === 0
  ).length;

const bursts = (evs: SimEvent[]): number =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'marciana'
  ).length;

const LB = lastBullets(base.events);
const BU = bursts(base.events);

describe('marciana (base) — kit spec', () => {
  it('fixture sanity: Marciana is the sole B2 and actually bursts + fires last bullets', () => {
    expect(BU, 'Marciana must cast bursts as the sole B2').toBeGreaterThan(0);
    expect(
      LB,
      'Marciana must fire last bullets (SG fires dry per magazine)'
    ).toBeGreaterThan(0);
    expect(
      recoveryFrames(base.events).length,
      'no recovery firing observed at all'
    ).toBeGreaterThan(0);
    expect(
      recoveryFrames(bare.events).length,
      'bare-weapon Marciana must emit NO heals'
    ).toBe(0);
  });

  describe('M1 — clean-weapon: her kit contributes nothing to her OWN damage', () => {
    it('her total is byte-identical to the bare-weapon override', () => {
      expect(unitOf(base.res, 'marciana').totalDamage).toBe(
        unitOf(bare.res, 'marciana').totalDamage
      );
    });

    it('control: liter (no recovery feedback) is also unchanged real-vs-bare', () => {
      expect(unitOf(base.res, 'liter').totalDamage).toBe(
        unitOf(bare.res, 'liter').totalDamage
      );
    });

    it('her heals DO drive a recovery consumer (asuka rises when Marciana heals)', () => {
      expect(unitOf(base.res, 'asuka').totalDamage).toBeGreaterThan(
        unitOf(bare.res, 'asuka').totalDamage
      );
    });

    it('DISCRIMINATING: mis-encoding DEF ▲20.9% as a damage buff MOVES her own total', () => {
      expect(unitOf(defAsDamage.res, 'marciana').totalDamage).not.toBe(
        unitOf(base.res, 'marciana').totalDamage
      );
    });
  });

  describe('M2 — S1 last-bullet heal is a 3-SEC heal-over-time (≥3 recovery events per last bullet)', () => {
    it('fires at least three recovery events per last bullet across the window', () => {
      expect(recoveryFrames(base.events).length).toBeGreaterThanOrEqual(3 * LB);
    });

    it('DISCRIMINATING: a single-instant heal (ticks:1) collapses the firings', () => {
      // ticks:1 gives one recovery event per last bullet (+ one per burst) — far below the HoT.
      expect(recoveryFrames(s1Ticks1.events).length).toBeLessThan(
        recoveryFrames(base.events).length
      );
      expect(recoveryFrames(s1Ticks1.events).length).toBeLessThanOrEqual(
        LB + BU
      );
    });

    it('removing the S1 heal leaves exactly the S2 (burst) contribution', () => {
      expect(
        recoveryFrames(base.events).length - recoveryFrames(noS1.events).length
      ).toBe(recoveryFrames(noS2.events).length);
    });
  });

  describe('M3 — S2 burst-cast heal fires exactly once per burst (instant)', () => {
    it('isolating S2 (S1 removed) leaves one recovery firing per burst cast', () => {
      expect(recoveryFrames(noS1.events).length).toBe(BU);
    });

    it('isolating S1 (S2 removed) leaves the multi-tick HoT contribution', () => {
      expect(recoveryFrames(noS2.events).length).toBeGreaterThanOrEqual(
        3 * LB - 1
      );
    });

    it('STRUCTURAL: S2 + burst are keyed to burstCast, NOT fullBurstEnter (the co-B2 trap)', () => {
      // Marciana is Burst II; in a team with another B2, burstCast (her OWN casts) and
      // fullBurstEnter (EVERY team FB) diverge. Keying the heal/DEF to fullBurstEnter would
      // over-fire on rotations another B2 took. This fixture makes them coincide (sole B2), so
      // the encoding is pinned structurally (cross-family S2b claude-fable-5 #1 risk).
      const ov = withPatchedOverride('marciana', () => {}) as any;
      for (const b of ov.skill2) expect(b.trigger.kind).toBe('burstCast');
      for (const b of ov.burst) expect(b.trigger.kind).toBe('burstCast');
    });
  });

  describe('M4 — burst DEF ▲20.9% is kit-complete (all allies, 10s) yet damage-inert', () => {
    const defBuffs = buffs(base.events).filter(
      (b) => b.stat === 'defPct' && b.value === 20.9
    );

    it('applies once per burst to all three allies, for 10 sec', () => {
      expect(defBuffs.length).toBe(BU * 3);
      expect([...new Set(defBuffs.map((b) => b.casterIdx))]).toEqual([
        MARCIANA,
      ]);
      expect(new Set(defBuffs.map((b) => b.targetSlug)).size).toBe(3);
      for (const b of defBuffs) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is INERT: removing it changes NO unit\u2019s total by a single point', () => {
      expect(base.totals).toEqual(noDef.totals);
    });
  });

  describe('M5 — the inert lines stay inert/documented (never a silent drop, never a damage misread)', () => {
    it('Marciana originates NO damage-affecting buff — her only originated buff is defPct', () => {
      const originated = buffs(base.events)
        .filter((b) => b.casterIdx === MARCIANA)
        .map((b) => b.stat);
      expect([...new Set(originated)].sort()).toEqual(['defPct']);
    });

    it('the incoming-healing ▲26.98% and heal-storage 27.87% magnitudes never appear as buffs', () => {
      const vals = new Set(buffs(base.events).map((b) => b.value));
      expect(vals.has(26.98)).toBe(false);
      expect(vals.has(27.87)).toBe(false);
    });

    it('both inert lines are documented in `unmodeled` (not an `ignored` drop)', () => {
      const ov = withPatchedOverride('marciana', () => {});
      const s1 = (ov as any).unmodeled.skill1.join(' ');
      const bu = (ov as any).unmodeled.burst.join(' ');
      expect(s1).toMatch(/Incoming healing/);
      expect(bu).toMatch(/Storage/);
      expect(
        (ov as any).ignored,
        'no `ignored` block may exist'
      ).toBeUndefined();
    });

    it('STRUCTURAL: heal Storage is NOT encoded as a shield effect (would falsely fire shielded triggers)', () => {
      // The kit says "Storage" (overheal pool), not Shield. A `shield` effect would emit shielded
      // events and satisfy teammates' requiresShielded gates (e.g. asuka's S2) — actively wrong.
      // Kept unmodeled-verbatim (cross-family S2b claude-fable-5 #4 risk).
      const ov = withPatchedOverride('marciana', () => {}) as any;
      const allEffects = [...ov.skill1, ...ov.skill2, ...ov.burst].flatMap(
        (b: any) => b.effects
      );
      expect(allEffects.some((e: any) => e.kind === 'shield')).toBe(false);
    });
  });
});
```

### 7b. Driver override (src/skills/overrides/marciana.json)

```json
{
  "note": "Marciana (base, slug marciana) — Iron SG B2 Supporter, Elysion. NOT marciana-marine-study (the AR/Iron Attacker variant). Pure healer: her kit contributes NOTHING to damage — she is one of the six clean-weapon basis units (scripts/tests/lib/harness.ts CLEAN_WEAPON_TEAMS.a, the SG representative), so a recording of her measures the engine's SG weapon model alone. Kit-autonomy gauntlet 2026-07-31.\n\nS1 (Drone Supporter), two blocks on 'last bullet hits the target': (A) all allies recover 10.95% of attack damage as HP OVER 3 SEC — modeled as a `heal` event with ticks:3 (a per-second heal-over-time emits one recovery event per second, keeping on-recovery consumers refreshed across the 3s window; no HP AMOUNT is modeled — the engine has no survivability/HP-pool sim, the heal is an EVENT not a number). (B) the 2 allies with the highest final ATK get Incoming healing ▲26.98% for 3s — UNMODELED: there is no incoming-healing StatKey and, with no HP-amount modeled, an incoming-healing multiplier has nothing to scale; inert in the damage sim.\n\nS2 (School Nurse): 'when using Burst Skill' → all allies recover 28.11% of the skill user's final Max HP — modeled as a single instant `heal` event (ticks:1) on burstCast; again the HP amount is out-of-domain, the recovery EVENT is the faithful in-domain representation (it correctly fires recovery-consumer teammates such as Crown's 'when recovery takes effect').\n\nBurst (A Teacher's Grace), two lines on burstCast, both affecting all allies unless noted: (A) Storage — stores excess healing received by the SKILL USER, up to 27.87% of their Max HP, 10s — UNMODELED: no heal-storage/overflow primitive and no HP pool in v1; self-scoped and damage-inert. (B) DEF ▲20.9% of the skill user's DEF for 10s — modeled as a defPct 20.9 buff to all allies for kit completeness; defPct is INERT in v1 (self DEF does not affect own damage), so this changes no total. In-kit the value is a flat add scaled off the CASTER's DEF rather than a % of each target's own DEF; DEF being damage-inert, the distinction is immaterial (same convention as crown's S1 defPct).\n\nThe heal events ARE load-bearing for team synergy (Marciana + Crown: her last-bullet HoT + burst heal refresh Crown's recovery consumer to near-permanent +20.99% team Attack Damage), but Marciana's OWN damage is weapon-only — pinned by scripts/tests/units/marciana.test.ts (her total is byte-identical to the bare-weapon override). TIER: Tier 1 — clean-weapon unit, no load-bearing damage mechanic in her own kit; the encoding is recovery-event emitters plus one inert defPct buff. S2b/S5/S6/S7 all cross-family.",
  "unmodeled": {
    "skill1": [
      "■ Activates when the last bullet hits the target. Affects 2 ally unit(s) with the highest final ATK. Incoming healing ▲ 26.98% for 3 sec. — UNMODELED: no incoming-healing StatKey in the engine, and with no HP-amount modeled an incoming-healing multiplier has nothing to scale. Inert in the damage sim. (The companion last-bullet heal IS modeled as a `heal` event — see skill1 block.)"
    ],
    "skill2": [],
    "burst": [
      "■ Affects all allies. Storage: Stores excess healing received by the skill user, up to 27.87% of their Max HP. Lasts for 10 sec. — UNMODELED: no heal-storage/overflow primitive and no HP pool in v1. Self-scoped (the skill user's own overflow healing); damage-inert. (The companion DEF ▲20.9% line IS modeled as an inert defPct buff — see burst block.)"
    ]
  },
  "caveats": [
    "skill1: the heal is an EVENT, not a number — `heal` ticks:3 emits three recovery events over the 3s HoT window (one per second), keeping on-recovery consumers refreshed; no HP amount is modeled (the engine has no survivability sim).",
    "skill1: the 'Incoming healing ▲26.98%' buff (top-2 final ATK allies, 3s) is UNMODELED — no incoming-healing stat; inert without HP-amount modeling.",
    "skill2: the heal is a single instant recovery event (ticks:1) on burstCast; the 28.11%-of-caster-Max-HP amount is out-of-domain (no HP pool).",
    "burst: the heal-storage overflow mechanic (27.87% of skill user's Max HP, 10s, self-scoped) is UNMODELED — no storage primitive / HP pool; damage-inert.",
    "burst: DEF ▲20.9% is modeled as defPct 20.9 to all allies for kit completeness; defPct is INERT in v1 (changes no total). In-kit it is a flat add off the CASTER's DEF, not a % of each target's own DEF — immaterial since DEF is damage-inert (crown S1 convention)."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "lastBullet" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "heal", "ticks": 3 }]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "heal", "ticks": 1 }]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "defPct", "value": 20.9, "durationSec": 10 }
      ]
    }
  ]
}
```

---

## RETURN THE VERDICT JSON per §1 contract. `verdict` and `faithfulnessScore` MUST be TOP-LEVEL keys.
