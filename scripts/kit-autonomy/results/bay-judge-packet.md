# S7 RECONCILING-JUDGE PACKET — unit `bay` (Bay (Treasure))

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

# MECHANICS SSOT (authoritative engine/formula docs)

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

# GROUND TRUTH — kit prose + base stats (data/characters.json → characters.bay, verbatim)

{
  "slug": "bay",
  "name": "Bay (Treasure)",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/nr-51/ih-98/dbf0f95b26f99563ebfeb3a95b1fb728.png",
  "weapon": "RL",
  "burst": "II",
  "burstCooldownSec": 40,
  "class": "Defender",
  "element": "Fire",
  "manufacturer": "Tetra",
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "rl3": 16.8,
  "releaseDate": "2024-04-11",
  "burstGaugePerShot": 1.4,
  "treasure": true,
  "skills": {
    "skill1": "■ Activates when using Burst Skill, only if self is alive. Affects all allies.\nProportionally shares damage taken continuously.\nDEF ▲ 10.13% of the skill user's DEF continuously.\n■ Activates when performing Full Charge attacks. Affects all allies (except self).\nRecovers 4% of the skill user's final Max HP.",
    "skill2": "■ Activates when using Burst Skill, only if self is alive. Affects self's cover. \nProportionally shares damage taken continuously.\n■ Activates when Full Burst ends. Affects self.\nContinuously recovers Cover's HP equal to 2.88% of the skill user's final Max HP every 1 sec for 5 sec.\n■ Activates when entering Burst Stage 1 and self's cover has been destroyed. Affects self.\nRecovers 20% of the skill user's final Max HP.",
    "burst": "■ Affects self if self's cover has been destroyed.\nRebuild Cover with 20% HP. Activates once per battle.\n■ Affects self.\nMax HP of Cover ▲ 18% of the skill user's Max HP for 20 sec.\n■ Affects all allies.\nDamage Taken ▼ 8.87% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1055001,
      "shot_detail": {
        "id": 1055001,
        "damage": 6130,
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
        "reload_time": 200,
        "shot_timing": "Concurrence",
        "spot_radius": 50,
        "weapon_type": "RL",
        "is_targeting": false,
        "muzzle_count": 1,
        "rate_of_fire": 60,
        "homing_script": "lv1",
        "name_localkey": "Rocket Launcher",
        "prefer_target": "TargetGL",
        "reload_bullet": 10000,
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
        "burst_energy_pershot": 14000,
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
        "target_burst_energy_pershot": 28000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 10,
        "auto_start_accuracy_circle_scale": 10
      },
      "bonusrange_max": 0,
      "bonusrange_min": 0
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step2",
      "burst_apply_delay": 1,
      "change_burst_step": "Step3"
    },
    "skillDetails": {
      "skill1_id": 2550101,
      "skill2_id": 2550201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2550101,
        "icon": "icn_skill_damageshare_01",
        "group_id": 25501,
        "skill_level": 1,
        "name_localkey": "You Can Do It",
        "next_level_id": 2550102,
        "level_up_cost_id": 10102,
        "description_localkey": "■ Activates when using Burst Skill, only if self is alive. Affects all allies. \n<color=#00AEFF><word_group=10044>Proportionally shares damage taken</word_group> continuously.\nDEF ▲ {description_value_01}% of the skill user's DEF continuously.</color>",
        "description_value_list": [
          {
            "description_value": [
              "5.57",
              "6.08",
              "6.58",
              "7.09",
              "7.6",
              "8.11",
              "8.61",
              "9.12",
              "9.63",
              "10.13"
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
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2550201,
        "icon": "icn_skill_healcover_01",
        "group_id": 25502,
        "skill_level": 1,
        "name_localkey": "Cheer Up Together",
        "next_level_id": 2550202,
        "level_up_cost_id": 10202,
        "description_localkey": "■ Activates when using Burst Skill, only if self is alive. Affects all allies. \n<color=#00AEFF><word_group=10044>Proportionally shares damage taken</word_group> continuously.</color>\n■ Activates when Full Burst ends. Affects self.\n<color=#00AEFF><word_group=10043>Constantly recovers Cover's HP</word_group> by {description_value_01}% of the skill user's <word_group=10025>final</word_group> Max HP every 1 sec for {description_value_02} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "1.58",
              "1.72",
              "1.87",
              "2.01",
              "2.16",
              "2.3",
              "2.44",
              "2.59",
              "2.73",
              "2.88"
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
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1550301,
      "ulti_skill_detail": {
        "id": 1550301,
        "icon": "icn_skill_c550_ult",
        "group_id": 15503,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Fire",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "First Winner",
        "next_level_id": 1550302,
        "prefer_target": "HighAttackFirstSelf",
        "resource_name": "c550_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 10302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "Integer"
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
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000,
          4000
        ],
        "description_localkey": "■ Affects self.\n<color=#00AEFF><word_group=10033>Max HP of Cover</word_group> ▲ {description_value_01}% of the skill user's Max HP for {description_value_02} sec.</color>\n■ Affects all allies.\n<color=#00AEFF>Damage Taken ▼ {description_value_03}% for {description_value_04} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "9.9",
              "10.8",
              "11.7",
              "12.6",
              "13.5",
              "14.4",
              "15.3",
              "16.2",
              "17.1",
              "18"
            ]
          },
          {
            "description_value": [
              "20",
              "20",
              "20",
              "20",
              "20",
              "20",
              "20",
              "20",
              "20",
              "20"
            ]
          },
          {
            "description_value": [
              "4.87",
              "5.32",
              "5.76",
              "6.2",
              "6.65",
              "7.09",
              "7.53",
              "7.98",
              "8.42",
              "8.87"
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
          155030103
        ],
        "after_hurt_function_id_list": [
          155030101
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
      "grow_grade": 355002,
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
        100001
      ],
      "element_details": [
        {
          "id": 100001,
          "element": "Fire",
          "group_id": 5000001,
          "element_icon": "icn_element_fire",
          "weak_element_id": 200001,
          "element_desc_localekey": "Injects Code: H.S.T.A. to all wind-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Fire",
          "element_code_name_localekey": "Code: H.S.T.A."
        }
      ]
    },
    "piece": {
      "piece_id": 5100550,
      "piece_detail": {
        "id": 5100550,
        "class": "Attacker",
        "order": 55000,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "TETRA",
        "resource_id": 550,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Bay's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 355001,
      "class": "Defender",
      "order": 10121,
      "name_code": 5111,
      "corporation": "TETRA",
      "resource_id": 550,
      "name_localkey": "Bay",
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
    "resourceId": 550
  }
}

NOTE: `bay` is the `treasure: true` variant and the ONLY Bay entry in the data (no base-Bay entry exists). Skill levels shown in description_value_list are SL1..SL10; the sim runs SL10 (last value in each list).

---

# S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, blind)

{
  "slug": "bay",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Proportionally shares damage taken",
      "disposition": "UNMODELED",
      "scope": "damage-taken redistribution across all allies; defensive only",
      "durationSemantics": "'continuously' = persistent while active, no timed window",
      "triggerIdentity": "burstCast (own Burst Skill use; Bay is B2) — NOT fullBurstEnter; 'only if self is alive' is scope-trivial (nobody dies at scope lock)",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "inventing an offensive proxy (e.g. a damage-share 'buff' with a stat key) or any block that emits damage-relevant buffApply events",
      "distinguishingAssertion": "run with vs without this line via withPatchedOverride: totals(res) identical per slug; no buffApply from bay's burst cast carrying any damage-bucket stat traceable to this line",
      "inertness": "must move ZERO damage for every unit; v1 has no incoming-damage model",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "DEF ▲ 10.13% of the skill user's DEF",
      "disposition": "GAP",
      "scope": "generic DEF stat grant, caster-DEF-scaled flat add",
      "durationSemantics": "'continuously' = no duration (persists after cast), not a 10s FB window",
      "triggerIdentity": "burstCast (fires only on rotations Bay herself bursts), stage-unqualified",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "pattern-matching the caster-scaled phrasing 'X% of the skill user's Y' into the casterAtkPct habit (an ATK-family flat add) — that WOULD move damage; or encoding as target-own defPct 10.13 keyed to fullBurstEnter",
      "distinguishingAssertion": "filter buffApply events with casterIdx === bay's slot: NONE carry stat 'casterAtkPct'/'atkPct'/'attackDamagePct'; totals identical with the line stripped via withPatchedOverride (DEF has no offensive consumer in v1)",
      "inertness": "offensively inert — no unit's totalDamage may change; schema has no caster-DEF-scaled key (defPct is target-own and inert), so this is a schema GAP recorded, not silently dropped",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Recovers 4% of user's final Max HP",
      "disposition": "FAITHFUL",
      "scope": "heal rider on Full Charge attacks; Bay is RL (chargeFrames 60) so effectively every fired shot is a full-charge attack",
      "durationSemantics": "instant per activation (ticks:1 default heal), one event per full-charge shot",
      "triggerIdentity": "per full-charge shot (shotFired-shaped for an always-full-charging RL) — NOT burstCast-gated, NOT fbGate'd, NOT interval",
      "targetSet": "allies excludeSelf ('all allies (except self)') — Bay herself must NOT receive the recovery event",
      "nearestWrongModel": "keying the heal to fullBurstEnter/burstCast (heals only once per rotation instead of per shot), or targeting all-including-self (fires Bay's own recovery triggers)",
      "distinguishingAssertion": "no heal/recovery kind exists in cfg.onEvent, so observe via a tandem consumer: comp Bay with crown (recovery-triggered kit); count crown's recovery-gated buffApply events — they must track Bay's shot-event cadence (one activation window per Bay shot, ammo 6 / reload 141f rhythm, throughout the fight, outside FB included), not cluster only at burst casts/FB entries; and no recovery-driven buffApply may target Bay's own slot",
      "inertness": "the heal amount (4% Max HP) is inert (heal effects carry no HP pool); what matters is event count, cadence, and target set",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "shares damage taken — self's cover",
      "disposition": "UNMODELED",
      "scope": "cover damage-share; defensive, cover entity not modeled",
      "durationSemantics": "'continuously' persistent",
      "triggerIdentity": "burstCast (own burst use)",
      "targetSet": "self's cover (not a unit)",
      "nearestWrongModel": "encoding as any self-buff or shield effect (a 'shield' effect would wrongly fire shielded-trigger consumers)",
      "distinguishingAssertion": "no shield effect / shielded-trigger activation attributable to bay anywhere in the run; totals unmoved",
      "inertness": "zero damage movement; zero shield events",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "recovers Cover's HP 2.88%/1s for 5s",
      "disposition": "UNMODELED",
      "scope": "COVER HP heal-over-time, not unit HP",
      "durationSemantics": "5 ticks, every 1 sec, at Full Burst end",
      "triggerIdentity": "fullBurstEnd",
      "targetSet": "self's cover — NOT self",
      "nearestWrongModel": "encoding as a self heal (heal ticks:5) — that emits 5 recovery events to Bay at every FB end and wrongly feeds any recovery-trigger consumer chain",
      "distinguishingAssertion": "at fullBurstEnd frames, NO recovery-driven consumer activation targeting or caused-by bay occurs (crown-style consumer's buffApply cadence shows no 5-tick burst clustered after fullBurstEnd events)",
      "inertness": "must emit zero recovery events; cover HP is not modeled",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Burst Stage 1 + cover destroyed: 20% HP",
      "disposition": "UNMODELED",
      "scope": "self heal gated on cover-destroyed state",
      "durationSemantics": "instant, per qualifying Stage-1 entry",
      "triggerIdentity": "stageEnter stage:1 AND cover-destroyed gate — the gate can never be satisfied at scope lock (boss deals no damage, cover never breaks)",
      "targetSet": "self",
      "nearestWrongModel": "modeling the heal UNGATED on stageEnter:1 — a self recovery event every rotation, feeding recovery-trigger consumers each B1 cast",
      "distinguishingAssertion": "no recovery event to bay coincident with stage-1 burstCast events across the full run",
      "inertness": "fires never at scope; zero recovery events from this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Rebuild Cover with 20% HP, once",
      "disposition": "UNMODELED",
      "scope": "cover rebuild, once per battle, cover-destroyed gated",
      "durationSemantics": "once per battle",
      "triggerIdentity": "burstCast + cover-destroyed condition (never satisfied at scope)",
      "targetSet": "self (cover)",
      "nearestWrongModel": "any modeled stand-in (shield/heal) emitting events",
      "distinguishingAssertion": "bay's burstCast emits no shield/heal event from this line",
      "inertness": "fully inert; verbatim-recorded only",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Max HP of Cover ▲ 18% for 20 sec",
      "disposition": "UNMODELED",
      "scope": "COVER Max HP, not unit Max HP",
      "durationSemantics": "20 sec timed window from burst cast",
      "triggerIdentity": "burstCast",
      "targetSet": "self's cover",
      "nearestWrongModel": "encoding as a self Max HP buff (maxHpFlat/targetMaxHpPct-shaped) — pollutes the event stream and, in principle, the HP→ATK conversion path (atkOfMaxHpPct feeds off self Max HP grants)",
      "distinguishingAssertion": "no buffApply with stat 'maxHpFlat' or 'maxHpPct' from bay's burst cast",
      "inertness": "must not touch unit Max HP; Bay has no atkOfMaxHpPct but the event must still be absent (kit-faithfulness, and her S1 heal scales off final Max HP)",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Damage Taken ▼ 8.87% for 10 sec",
      "disposition": "UNMODELED",
      "scope": "DEFENSIVE mitigation on ALLIES (allies take 8.87% less damage) — NOT an offensive boss debuff",
      "durationSemantics": "10 sec from burst cast",
      "triggerIdentity": "burstCast",
      "targetSet": "all allies — the direction (▼) plus ally target set makes this defensive; taxonomy item 4 covers the INVERSE ('Damage Taken ▲' on the ENEMY is the offensive debuff)",
      "nearestWrongModel": "THE key shared-prior misread: encoding as damageTakenPct on the boss (the 'Damage Taken is always the damageTakenPct stat' reflex) — an 8.87% boss debuff for 10s per Bay burst would inflate EVERY unit's damage each rotation",
      "distinguishingAssertion": "no buffApply with stat 'damageTakenPct' and value 8.87 anywhere in the run (boss-held debuffs have casterIdx===null — filter by stat+value); and totals(res) for all four teammates identical with Bay's burst block stripped via withPatchedOverride",
      "inertness": "must move ZERO damage; v1 boss deals no damage so ally mitigation is inert by construction",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:Recovers 4% of user's final Max HP on Full Charge attacks (allies except self)"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Activates when using Burst Skill, only if self is alive. Affects all allies. Proportionally shares damage taken continuously.",
      "DEF ▲ 10.13% of the skill user's DEF continuously."
    ],
    "skill2": [
      "Activates when using Burst Skill, only if self is alive. Affects self's cover. Proportionally shares damage taken continuously.",
      "Activates when Full Burst ends. Affects self. Continuously recovers Cover's HP equal to 2.88% of the skill user's final Max HP every 1 sec for 5 sec.",
      "Activates when entering Burst Stage 1 and self's cover has been destroyed. Affects self. Recovers 20% of the skill user's final Max HP."
    ],
    "burst": [
      "Affects self if self's cover has been destroyed. Rebuild Cover with 20% HP. Activates once per battle.",
      "Affects self. Max HP of Cover ▲ 18% of the skill user's Max HP for 20 sec.",
      "Affects all allies. Damage Taken ▼ 8.87% for 10 sec."
    ]
  },
  "notes": "Reconcile these with the driver: (1) HIGHEST-RISK shared misread — burst 'Damage Taken ▼ 8.87%' targets ALLIES and is defensive mitigation, NOT the boss damageTakenPct debuff; a debuff encoding inflates the whole team's totals every rotation and the test suite MUST carry the negative assertion (no damageTakenPct buffApply with value 8.87; teammate totals invariant under stripping Bay's burst). (2) The ONLY damage-relevant line is the skill1 full-charge heal, and it's load-bearing solely through tandem recovery-trigger consumers (crown's 'when recovery takes effect'); since cfg.onEvent has no heal/recovery kind, the distinguishing observable is a recovery-consumer teammate's buffApply cadence tracking Bay's shot events — per-shot, all fight, excludeSelf. (3) FIXTURE TRAP: Bay is Burst II, and controlComp(carry) seats the carry in the B3 slot with crown already at B2 — Bay in that fixture never casts her burst (and a comp without any B3 makes ZERO full bursts). Tests for the burstCast-gated skill1/skill2/burst blocks need a custom runComp comp where Bay is the resolving B2 (or must assert those blocks fire only on rotations Bay actually bursts — burstCast ≠ fullBurstEnter, which diverges precisely because crown competes at the same tier). (4) 'X% of the skill user's DEF' invites the casterAtkPct pattern-match; assert no ATK-family buffApply from Bay's burst. (5) All cover lines (share, HoT, rebuild, cover Max HP) are unmodelable at scope (no cover entity, boss deals no damage, cover never destroyed) and belong verbatim in unmodeled — the fullBurstEnd cover HoT especially must NOT become a 5-tick self heal, which would pulse recovery consumers at every FB end.",
  "model": "claude-fable-5"
}


---

# S5 BLIND TEST (claude-opus-5, written from kit prose alone)

RESULT vs the DRIVER override (adapted copy — only the harness import path fixed, assertion intent untouched): **17 PASS / 1 FAIL / 5 SKIP (23 total)**.

The SOLE FAILURE is structural, not behavioral:
  skill1 b) 'is encoded as a per-shot heal to allies EXCEPT self' — expected trigger.kind 'shotFired', received 'chargeCounter' (count:1). For an RL unit every shot dispatches charged=true (sim.ts firePull: 'every dumped rocket is a full-charge shot'), so `shotFired` and `chargeCounter count:1` fire on EXACTLY the same frames — behaviorally identical encodings of 'when performing Full Charge attacks'. Every BEHAVIORAL assertion in the blind suite (per-shot cadence vs burstCast/lastBullet/fullBurstEnter counterfactuals, recovery reaching the crown consumer, excludeSelf inertness, defPct kit-complete-yet-inert, no damageTakenPct anywhere, no ally Max-HP grant, no cover-state gates) PASSED against the driver's chargeCounter encoding.

```typescript
/**
 * bay — BLIND kit spec test (cross-family S5). Written from the kit prose ALONE; the driver's
 * override, tests and reasoning were not consulted.
 *
 * KIT (RL/Fire/Defender/Burst II, ammo 6, chargeFrames 60 → every trigger pull is a full charge):
 *   skill1 a) on own Burst Skill cast, all allies: share damage taken (defensive, unmodelable)
 *             + DEF ▲10.13% of the caster's DEF, "continuously" (no duration)
 *   skill1 b) on Full Charge attacks, all allies EXCEPT self: recover 4% of caster's Max HP
 *   skill2 a) on own Burst Skill cast, own COVER: share damage taken (defensive)
 *   skill2 b) on Full Burst END, self: COVER HoT 2.88%/sec for 5 sec
 *   skill2 c) on Burst Stage 1 enter AND own cover destroyed, self: recover 20%
 *   burst  a) if own cover destroyed: rebuild cover 20% HP, once per battle
 *   burst  b) self: Max HP of COVER ▲18% of caster's Max HP for 20 sec
 *   burst  c) all allies: Damage Taken ▼8.87% for 10 sec
 *
 * Bay's kit carries NO offensive line at all. The faithfulness question is therefore exactly two
 * things:
 *   (1) The ONE cross-unit channel — the per-full-charge ally heal — must exist, fire PER SHOT
 *       (not per burst, not per magazine) and reach the team's on-recovery consumer (crown).
 *       Rule 4 (tandem): a heal that looks inert in isolation drives a teammate's on-recovery kit.
 *   (2) Every defensive line must stay damage-INERT. The dangerous one is "Damage Taken ▼ 8.87%
 *       — Affects all allies": that is ALLY survivability, NOT the engine's `damageTakenPct`
 *       (which is a BOSS debuff, positive = boss takes more). Mis-keying it there hands the whole
 *       team ~9% extra damage — the largest available over-credit on this unit. Same trap on the
 *       COVER lines: "Max HP of Cover" and "Cover's HP" are a different pool from the nikke's own
 *       Max HP / own healing, so they must not become ally heals or ally Max-HP grants.
 *
 * FIXTURES
 *   FX_CTL  = controlComp('bay') → liter(B1)/crown(B2)/bay(B2)/helm(B3), boss Fire, focus bay.
 *             crown is the on-recovery consumer, so the COUNT of crown-cast buffApply events is
 *             the observable for bay's heal cadence. A count (not an uptime) is used deliberately:
 *             helm also heals crown, so a duty-cycle read could saturate and go blind, while every
 *             additional recovery still re-emits a buffApply.
 *   FX_SOLE = liter(B1)/bay(B2)/helm(B3) → bay is the ONLY Burst II, so her own burst is guaranteed
 *             to cast; in FX_CTL crown's 20s cooldown can monopolise stage 2 and bay might never
 *             burst, which would make every burst-slot assertion silently vacuous. All burst-slot
 *             and burstCast-triggered assertions run here, and a marker probe PROVES she casts.
 *
 * Runs are hoisted (11 × 180s sims). Deterministic: no seed anywhere.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

// ---- local structural views over the override file (slot-keyed, no top-level `blocks`) ------
type Eff = {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  ticks?: number;
};
type Blk = {
  slot?: string;
  trigger: { kind: string; [k: string]: unknown };
  target: { kind: string; excludeSelf?: boolean; [k: string]: unknown };
  effects: Eff[];
  [k: string]: unknown;
};
type Ov = {
  skill1: Blk[];
  skill2: Blk[];
  burst: Blk[];
  unmodeled?: Record<string, string[]>;
};
type BuffEv = {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug: string;
  durationShots?: number;
};

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

// The committed override, read through the clone helper (disk untouched).
const OV = withPatchedOverride('bay', () => {}) as unknown as Ov;

const blocksOf = (ov: Ov) =>
  SLOTS.flatMap((s) => (ov[s] ?? []).map((b) => ({ slot: s, b })));
const effectsOf = (ov: Ov) =>
  blocksOf(ov).flatMap(({ slot, b }) =>
    (b.effects ?? []).map((e) => ({ slot, b, e }))
  );
const isHeal = (b: Blk) => (b.effects ?? []).some((e) => e.kind === 'heal');

const buffs = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];
const teamTotal = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- fixtures --------------------------------------------------------------------------------
const FX_CTL = controlComp('bay');
const FX_SOLE: CompOptions = {
  slugs: ['liter', 'bay', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'bay',
};
const IDX_CROWN = FX_CTL.slugs.indexOf('crown');

const run = (opts: CompOptions) => {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (e: SimEvent) => events.push(e) },
  });
  return { events, t: totals(res) };
};
const withBay = (opts: CompOptions, ov: ReturnType<typeof withPatchedOverride>): CompOptions => ({
  ...opts,
  overrides: { ...opts.overrides, bay: ov },
});

// ---- counterfactual overrides ----------------------------------------------------------------
/** skill1b deleted entirely — the heal channel goes dark. */
const OV_NO_HEAL = withPatchedOverride('bay', (ov) => {
  ov.skill1 = (ov.skill1 as Blk[]).filter((b) => !isHeal(b));
});
/** NEAREST-WRONG trigger identity: "full charge attack" mis-read as the burst cast. */
const OV_HEAL_BURSTCAST = withPatchedOverride('bay', (ov) => {
  for (const b of ov.skill1 as Blk[]) {
    if (isHeal(b)) {
      b.trigger = { kind: 'burstCast' };
    }
  }
});
/** NEAREST-WRONG trigger identity: per-magazine instead of per-shot (ammo 6). */
const OV_HEAL_LASTBULLET = withPatchedOverride('bay', (ov) => {
  for (const b of ov.skill1 as Blk[]) {
    if (isHeal(b)) {
      b.trigger = { kind: 'lastBullet' };
    }
  }
});
/** NEAREST-WRONG target set: "(except self)" dropped. */
const OV_HEAL_INCL_SELF = withPatchedOverride('bay', (ov) => {
  for (const b of ov.skill1 as Blk[]) {
    if (isHeal(b)) {
      b.target = { kind: 'allies' };
    }
  }
});
/** NEAREST-WRONG for skill2b: the COVER HoT mis-modelled as an ALLY heal at Full Burst end. */
const OV_COVER_HOT_TO_ALLIES = withPatchedOverride('bay', (ov) => {
  (ov.skill2 as Blk[]).push({
    slot: 'skill2',
    trigger: { kind: 'fullBurstEnd' },
    target: { kind: 'allies' },
    effects: [{ kind: 'heal', ticks: 5, intervalSec: 1 } as Eff],
  });
});
/** Castability marker — an unmistakable self ATK buff on bay's own burst cast. */
const OV_BURST_MARKER = withPatchedOverride('bay', (ov) => {
  (ov.burst as Blk[]).push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'atkPct', value: 200, durationSec: 10 }],
  });
});
/** NEAREST-WRONG for burst c): ally "Damage Taken ▼" keyed to the boss damageTaken debuff. */
const OV_DAMAGE_TAKEN = withPatchedOverride('bay', (ov) => {
  (ov.burst as Blk[]).push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 8.87, durationSec: 10 },
    ],
  });
});
/** skill1a's DEF grant stripped — isolates its damage footprint. */
const OV_NO_DEF = withPatchedOverride('bay', (ov) => {
  ov.skill1 = (ov.skill1 as Blk[]).map((b) => ({
    ...b,
    effects: (b.effects ?? []).filter(
      (e) => !(e.kind === 'buff' && e.stat === 'defPct')
    ),
  }));
});
/** burst b) mis-modelled as a real self Max-HP grant instead of a COVER Max-HP grant. */
const OV_COVER_MAXHP_AS_SELF = withPatchedOverride('bay', (ov) => {
  (ov.burst as Blk[]).push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'self' },
    effects: [
      { kind: 'buff', stat: 'targetMaxHpPct', value: 18, durationSec: 20 },
    ],
  });
});

// ---- hoisted runs (11) ------------------------------------------------------------------------
const R_CTL_BASE = run(FX_CTL);
const R_CTL_NO_HEAL = run(withBay(FX_CTL, OV_NO_HEAL));
const R_CTL_HEAL_BURSTCAST = run(withBay(FX_CTL, OV_HEAL_BURSTCAST));
const R_CTL_HEAL_LASTBULLET = run(withBay(FX_CTL, OV_HEAL_LASTBULLET));
const R_CTL_HEAL_INCL_SELF = run(withBay(FX_CTL, OV_HEAL_INCL_SELF));
const R_CTL_COVER_HOT_ALLIES = run(withBay(FX_CTL, OV_COVER_HOT_TO_ALLIES));

const R_SOLE_BASE = run(FX_SOLE);
const R_SOLE_MARKER = run(withBay(FX_SOLE, OV_BURST_MARKER));
const R_SOLE_DAMAGE_TAKEN = run(withBay(FX_SOLE, OV_DAMAGE_TAKEN));
const R_SOLE_NO_DEF = run(withBay(FX_SOLE, OV_NO_DEF));
const R_SOLE_COVER_MAXHP = run(withBay(FX_SOLE, OV_COVER_MAXHP_AS_SELF));

const crownApplies = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === IDX_CROWN).length;

// ================================================================================================
describe('bay — fixture non-vacuity', () => {
  it('FX_CTL reaches Full Burst and bay actually fires', () => {
    expect(
      R_CTL_BASE.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
    expect(
      R_CTL_BASE.events.filter((e) => e.kind === 'fullBurstEnd').length
    ).toBeGreaterThan(0);
    expect(
      R_CTL_BASE.events.filter((e) => e.kind === 'shot').length
    ).toBeGreaterThan(0);
    expect(R_CTL_BASE.t['crown']).toBeGreaterThan(0);
  });

  it('FX_SOLE actually casts bay\'s burst (marker probe)', () => {
    // Without this, every burst-slot assertion below would be vacuously green.
    expect(R_SOLE_MARKER.t['bay']).toBeGreaterThan(R_SOLE_BASE.t['bay']);
    expect(
      R_SOLE_BASE.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });
});

describe('bay skill1 b) — full-charge ally heal (the only cross-unit channel)', () => {
  it('is encoded as a per-shot heal to allies EXCEPT self', () => {
    const heals = effectsOf(OV).filter((x) => x.e.kind === 'heal');
    const s1 = heals.filter((x) => x.slot === 'skill1');
    // MISSING here is the single most damaging omission on this unit (rule 4, tandem).
    expect(s1.length).toBeGreaterThan(0);
    const blk = s1[0].b;
    // bay is an RL with chargeFrames 60 — every trigger pull IS a Full Charge attack, so the
    // faithful key is per-shot. burstCast / lastBullet / fullBurstEnter all under-fire it.
    expect(blk.trigger.kind).toBe('shotFired');
    expect(blk.target.kind).toBe('allies');
    expect(blk.target.excludeSelf).toBe(true);
  });

  it('reaches the on-recovery consumer (crown) — removing it drops crown\'s buff applications', () => {
    // Discriminates against: heal absent, heal scoped to self, or heal emitting no recovery event.
    expect(crownApplies(R_CTL_BASE.events)).toBeGreaterThan(
      crownApplies(R_CTL_NO_HEAL.events)
    );
  });

  it('fires per full charge, not per burst cast', () => {
    // Re-keying to burstCast collapses ~1 heal/shot to ~1 heal/rotation.
    expect(crownApplies(R_CTL_BASE.events)).toBeGreaterThan(
      crownApplies(R_CTL_HEAL_BURSTCAST.events)
    );
  });

  it('fires per full charge, not once per magazine', () => {
    // ammo 6 → lastBullet is ~1/6 the cadence. Discriminates the per-magazine mis-read.
    expect(crownApplies(R_CTL_BASE.events)).toBeGreaterThan(
      crownApplies(R_CTL_HEAL_LASTBULLET.events)
    );
  });

  it('the "(except self)" clause is damage-inert in this fixture (documented, not proven)', () => {
    // bay has no on-recovery consumer of her own, so including her changes nothing observable.
    // Asserted as INERTNESS so the structural assertion above is the only thing carrying the claim.
    expect(crownApplies(R_CTL_HEAL_INCL_SELF.events)).toBe(
      crownApplies(R_CTL_BASE.events)
    );
    expect(R_CTL_HEAL_INCL_SELF.t).toStrictEqual(R_CTL_BASE.t);
  });
});

describe('bay skill1 a) — DEF ▲10.13% of caster DEF, on own burst cast, all allies', () => {
  it('is encoded burst-cast-keyed, all-allies, continuous (no duration)', () => {
    const def = effectsOf(OV).filter(
      (x) => x.e.kind === 'buff' && x.e.stat === 'defPct'
    );
    expect(def.length).toBe(1);
    expect(def[0].slot).toBe('skill1');
    expect(def[0].e.value).toBeCloseTo(10.13, 2);
    // "Activates when using Burst Skill" = the OWNER's cast, not full-burst entry (rule 3).
    expect(def[0].b.trigger.kind).toBe('burstCast');
    expect(def[0].b.target.kind).toBe('allies');
    expect(def[0].b.target.excludeSelf).toBeFalsy();
    // "continuously" — no wall-clock window.
    expect(def[0].e.durationSec).toBeUndefined();
  });

  it('applies to every ally when bay bursts, and is damage-inert', () => {
    const defEvs = buffs(R_SOLE_BASE.events).filter((b) => b.stat === 'defPct');
    expect(defEvs.length).toBeGreaterThan(0);
    expect(new Set(defEvs.map((b) => b.targetSlug))).toEqual(
      new Set(['liter', 'bay', 'helm'])
    );
    // INERTNESS: self DEF does not feed any damage path — nothing may be calibrated onto it.
    expect(R_SOLE_NO_DEF.t).toStrictEqual(R_SOLE_BASE.t);
  });
});

describe('bay skill2 b) — Full-Burst-end COVER heal is NOT an ally heal', () => {
  it('does not feed crown at Full Burst end', () => {
    // "Recovers Cover's HP … Affects self" — a different pool AND a self target. Encoding it as
    // an ally heal would silently drive crown's on-recovery kit once per Full Burst.
    expect(crownApplies(R_CTL_BASE.events)).toBeLessThan(
      crownApplies(R_CTL_COVER_HOT_ALLIES.events)
    );
  });

  it('no heal in bay\'s kit targets allies at Full Burst end', () => {
    const fbEndAllyHeals = effectsOf(OV).filter(
      (x) =>
        x.e.kind === 'heal' &&
        x.b.trigger.kind === 'fullBurstEnd' &&
        x.b.target.kind === 'allies'
    );
    expect(fbEndAllyHeals).toHaveLength(0);
  });
});

describe('bay burst c) — "Damage Taken ▼ 8.87%, all allies" is ALLY MITIGATION, not a boss debuff', () => {
  it('bay carries no damageTakenPct effect anywhere', () => {
    // damageTakenPct is the BOSS debuff (positive = boss takes more). The kit line is a ▼ on
    // ALLIES — pure survivability, zero damage. This is the largest over-credit available here.
    const dt = effectsOf(OV).filter(
      (x) => x.e.kind === 'buff' && x.e.stat === 'damageTakenPct'
    );
    expect(dt).toHaveLength(0);
    expect(
      buffs(R_CTL_BASE.events).filter((b) => b.stat === 'damageTakenPct')
    ).toHaveLength(0);
    expect(
      buffs(R_SOLE_BASE.events).filter((b) => b.stat === 'damageTakenPct')
    ).toHaveLength(0);
  });

  it('NON-VACUITY: the mis-encoding would be visible — it moves team damage', () => {
    expect(
      buffs(R_SOLE_DAMAGE_TAKEN.events).filter(
        (b) => b.stat === 'damageTakenPct'
      ).length
    ).toBeGreaterThan(0);
    expect(teamTotal(R_SOLE_DAMAGE_TAKEN.t)).not.toBe(
      teamTotal(R_SOLE_BASE.t)
    );
  });
});

describe('bay burst b) — "Max HP of COVER ▲18%" is not a nikke Max-HP grant', () => {
  it('grants no Max HP to any ally', () => {
    const hp = effectsOf(OV).filter(
      (x) =>
        x.e.kind === 'buff' &&
        ['maxHpPct', 'casterMaxHpPct', 'targetMaxHpPct'].includes(
          x.e.stat ?? ''
        ) &&
        x.b.target.kind !== 'self'
    );
    expect(hp).toHaveLength(0);
    expect(
      buffs(R_SOLE_BASE.events).filter(
        (b) => b.stat === 'maxHpFlat' && b.targetSlug !== 'bay'
      )
    ).toHaveLength(0);
  });

  it('INERTNESS: even a self Max-HP reading cannot move bay\'s damage', () => {
    // bay has no atkOfMaxHpPct conversion, so the cover-HP line is damage-inert either way —
    // recorded so no future calibration is hung on it.
    expect(R_SOLE_COVER_MAXHP.t['bay']).toBe(R_SOLE_BASE.t['bay']);
  });
});

describe('bay — whole-kit invariants', () => {
  it('carries NO offensive effect of any kind', () => {
    const ALLOWED_KINDS = ['buff', 'heal', 'shield'];
    const ALLOWED_STATS = [
      'defPct',
      'maxHpPct',
      'casterMaxHpPct',
      'targetMaxHpPct',
    ];
    const offenders = effectsOf(OV).filter(
      (x) =>
        !ALLOWED_KINDS.includes(x.e.kind) ||
        (x.e.kind === 'buff' && !ALLOWED_STATS.includes(x.e.stat ?? ''))
    );
    expect(
      offenders.map((x) => `${x.slot}:${x.e.kind}:${x.e.stat ?? ''}`)
    ).toEqual([]);
  });

  it('all three slots are present and record their unmodelled defensive text', () => {
    for (const s of SLOTS) {
      expect(Array.isArray(OV[s])).toBe(true);
    }
    // Every slot carries at least one unmodelable line (damage-sharing / cover pool), so a silent
    // drop is detectable: an empty unmodeled list means the text vanished without an audit record.
    expect(OV.unmodeled).toBeDefined();
    for (const s of SLOTS) {
      expect((OV.unmodeled?.[s] ?? []).length).toBeGreaterThan(0);
    }
  });

  it('bay never gates a block on cover state (no such primitive exists)', () => {
    // If a driver invented a gate for "cover has been destroyed", it would be unreachable at scope
    // lock (the boss deals no damage) — assert nothing silently depends on it.
    const gated = blocksOf(OV).filter(
      ({ b }) =>
        'requiresShielded' in b ||
        'requiresTargetStatus' in b ||
        'resourceGate' in b
    );
    expect(gated.map(({ slot }) => slot)).toEqual([]);
  });
});

describe('bay — GAPS (no engine primitive)', () => {
  it.skip('skill1 a) / skill2 a) "Proportionally shares damage taken" — the boss deals no damage at scope lock; no damage-to-allies model exists', () => {});
  it.skip('skill1 b) heal MAGNITUDE (4% of caster final Max HP) — the `heal` effect carries no amount; only the recovery EVENT is modelled', () => {});
  it.skip('skill2 b) COVER HoT 2.88%/sec ×5 — cover has no HP pool in the sim; the amount is unobservable', () => {});
  it.skip('skill2 c) Burst-Stage-1 20% heal gated on cover destroyed — cover destruction is unreachable (boss deals no damage)', () => {});
  it.skip('burst a) rebuild cover 20%, once per battle — same unreachable gate, plus no cover entity', () => {});
});

```

---

# S6 BLIND OVERRIDE (claude-opus-5, written from kit prose alone)

DIFF vs the driver override (src/skills/overrides/bay.json):
1. skill1 heal TRIGGER: S6 uses `shotFired`; driver uses `chargeCounter count:1`. Behaviorally identical on an always-charged RL (see S5 sole-fail note). S6's own caveat claims 'the schema has no full-charge trigger' — but `chargeCounter` (a cycling per-FULL-CHARGE phase counter; sim.ts: 'only full charges advance it') exists and with count:1 fires exactly once per full charge; it is the more literal encoding of 'when performing Full Charge attacks'.
2. skill2 COVER HoT (2.88%/1s × 5s at Full Burst end): S6 MODELS it as fullBurstEnd → self heal ticks:5 intervalSec:1 (with an explicit ⚑ caveat: 'cover-HP recovery may not count as recovery in game — do NOT widen its target without a measurement'). Driver leaves it VERBATIM UNMODELED: cover repair is not a Nikke recovery; a heal encoding emits 5 recovery events to bay at EVERY Full Burst end, which would falsely fire any future teammate on-recovery consumer keyed to bay (marciana Storage≠shield precedent: an unmodelable mechanic must not emit events it does not have). S2b (claude-fable-5) PRE-REGISTERED this exact trap: 'the fullBurstEnd cover HoT especially must NOT become a 5-tick self heal, which would pulse recovery consumers at every FB end'. RULE THIS DIVERGENCE.
3. Everything else is FUNCTIONALLY IDENTICAL: skill1 defPct 10.13 / burstCast / allies (incl. self) / no durationSec, with the SAME casterDefPct-approximation caveat (schema has no caster-DEF stat; DEF is offensively inert in v1); EMPTY burst slot; the same unmodeled set (damage-share ×2, cover-destroyed heal, cover rebuild, Cover Max HP ▲ 18%, ally Damage Taken ▼ 8.87% — both sides explicitly NOT damageTakenPct, which is a boss-targeted amplifier); heal ticks:1 to allies excludeSelf.

```json
{
  "slug": "bay",
  "skill1": [
    {
      "slot": "skill1",
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
          "value": 10.13
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "allies",
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 5,
          "intervalSec": 1
        }
      ]
    }
  ],
  "burst": [],
  "unmodeled": {
    "skill1": [
      "Proportionally shares damage taken continuously."
    ],
    "skill2": [
      "Proportionally shares damage taken continuously. (Affects self's cover.)",
      "Activates when entering Burst Stage 1 and self's cover has been destroyed. Affects self. Recovers 20% of the skill user's final Max HP."
    ],
    "burst": [
      "Affects self if self's cover has been destroyed. Rebuild Cover with 20% HP. Activates once per battle.",
      "Max HP of Cover \u25b2 18% of the skill user's Max HP for 20 sec.",
      "Affects all allies. Damage Taken \u25bc 8.87% for 10 sec."
    ]
  },
  "caveats": [
    "\u26d1 skill1 full-charge heal is keyed to `shotFired` \u2014 the schema has no full-charge trigger. bay is RL (chargeFrames 60), so every trigger pull is treated as a full-charge attack; any partial-charge firing would over-fire this heal.",
    "\u26d1 `defPct` scales the TARGET's own DEF, but the kit line grants '10.13% of the SKILL USER's DEF'. There is no casterDefPct StatKey; the value is encoded verbatim. defPct is inert for damage in v1, so this mis-scaling moves no number today \u2014 it must be revisited if DEF ever feeds an offensive conversion.",
    "\u26d1 The skill2 heal recovers COVER HP, not unit HP. It is modeled as a self-targeted `heal` (5 ticks / 1s) so the recovery channel exists; whether cover-HP recovery satisfies an on-recovery consumer in game is unverified. bay has no `recovery` trigger and the effect is self-scoped, so it is currently inert either way \u2014 do NOT widen its target without a measurement.",
    "\u26d1 Cadence tuple unverified (datamine-unreliable): ammo 6 / reloadFrames 141 / chargeFrames 60 / hitsPerShot 1. These drive the `shotFired` heal frequency \u2014 the only cadence-sensitive block here.",
    "burst is authored as a genuinely effect-free slot: all three burst lines are cover-HP or ally damage-mitigation, neither of which has an offensive channel. 'Damage Taken \u25bc 8.87%' targets ALL ALLIES (mitigation), NOT the boss \u2014 it is deliberately NOT encoded as `damageTakenPct`, which the schema defines as a boss debuff where positive = boss takes more; encoding an ally-side \u25bc there would be a wrong-target model.",
    "'only if self is alive' / 'cover has been destroyed' conditions are scope-trivial or never satisfied at scope lock (immortal allies, boss deals no modeled damage)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u26d1 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. bay is RL/Fire/Defender/Burst II \u2014 a pure sustain kit with ZERO damage lines in any slot: no flatDamage, no dot, no ATK/crit/core/damage-up buff, no weapon-state modifier, no gauge effect. Modeled: (S1a) own-burst-cast ally DEF buff, continuous/no duration; (S1b) per-full-charge heal to allies except self, kept because heal lines are never skippable on isolation \u2014 they fire teammates' `recovery` triggers (e.g. crown-style on-recovery consumers); (S2b) full-burst-end self cover regen as a 5-tick heal. Unmodeled: both damage-share lines (no HP pool at scope lock), the cover-destroyed heal and cover rebuild (cover destruction is never reached \u2014 the boss deals no modeled damage), Cover Max HP \u25b2 (a separate pool from unit Max HP; encoding it as maxHpPct/casterMaxHpPct would falsely feed atkOfMaxHpPct conversions), and the ally Damage Taken \u25bc (mitigation, not a boss debuff). Expected sim footprint: bay contributes no self damage and no team damage buff; her only cross-unit channel is the S1b recovery event stream."
}
```

---

# DRIVER IMPLEMENTATION UNDER JUDGEMENT

## Driver override — src/skills/overrides/bay.json

```json
{
  "slug": "bay",
  "skill1": [
    {
      "slot": "skill1",
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
          "value": 10.13
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "chargeCounter",
        "count": 1
      },
      "target": {
        "kind": "allies",
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 1
        }
      ]
    }
  ],
  "skill2": [],
  "burst": [],
  "unmodeled": {
    "skill1": [
      "Activates when using Burst Skill, only if self is alive. Affects all allies. Proportionally shares damage taken continuously."
    ],
    "skill2": [
      "Activates when using Burst Skill, only if self is alive. Affects self's cover. Proportionally shares damage taken continuously.",
      "Activates when Full Burst ends. Affects self. Continuously recovers Cover's HP equal to 2.88% of the skill user's final Max HP every 1 sec for 5 sec.",
      "Activates when entering Burst Stage 1 and self's cover has been destroyed. Affects self. Recovers 20% of the skill user's final Max HP."
    ],
    "burst": [
      "Affects self if self's cover has been destroyed. Rebuild Cover with 20% HP. Activates once per battle.",
      "Affects self. Max HP of Cover ▲ 18% of the skill user's Max HP for 20 sec.",
      "Affects all allies. Damage Taken ▼ 8.87% for 10 sec."
    ]
  },
  "caveats": [
    "skill1 DEF line is a SEMANTIC APPROXIMATION (marciana precedent): the kit grants DEF equal to 10.13% of the SKILL USER's DEF, but the schema's only DEF stat is defPct, which scales the TARGET's own DEF. There is no casterDefPct. Kept for kit completeness (DEF is offensively inert in v1); the value is NOT a faithful caster-scaled grant — the distinction has zero observable consequence in the DPS sim.",
    "skill1 Treasure heal magnitude (4% of the skill user's final Max HP) is event-only — the 'heal' effect emits ONE recovery event per full charge with no HP amount (v1 has no HP pool). The line is modeled solely for its TANDEM value: it fires allies' 'recovery' triggers every bay shot.",
    "skill2/burst are EMPTY by construction, not by omission: every line there is out-of-domain for the DPS sim — cover is not an entity the sim models (damage-share onto cover, cover-HP HoT, cover rebuild, cover Max HP), the boss deals no damage (ally Damage Taken ▼ 8.87% has nothing to reduce), and the cover-destroyed gates can never be satisfied at scope. All seven lines live VERBATIM in unmodeled.",
    "The S2 cover-HP HoT (2.88%/1s x5s at Full Burst end) is deliberately NOT encoded as a self 'heal' ticks:5 — cover repair is not a Nikke recovery, and the encoding would falsely pulse teammates' on-recovery consumers at every FB end. The burst's ally Damage-Taken-▼ is deliberately NOT encoded as damageTakenPct — that stat is a boss-targeted AMPLIFIER (positive = boss takes MORE damage); the kit line is defensive mitigation on ALL ALLIES (wrong direction and wrong target). The cover share/rebuild lines are NOT 'shield' effects (would falsely fire shielded-trigger gates).",
    "⚑ CADENCE TUPLE (ALWAYS-⚑): pullsPerSec / reloadFrames 141 / chargeFrames 60 shipped from datamine (ammo 6); RL charge cycle ≈ 1 shot/s + 141f reload gap every 6 rounds — plausible, NOT escalated. Affects her OWN shots (and therefore the per-shot recovery channel's cadence) only; recipe: rounds/min + reload gap from any focus video.",
    "⚑ AUTOFIRE vs CHARGE-GAP (ALWAYS-⚑, charge weapon): engine default shipped; ~affects her OWN shots/burst-gauge only (pure tank — small board impact); recipe: focus video, does she re-charge immediately with no dead gap."
  ],
  "note": "bay (Bay (Treasure)) — RL / Defender / Fire / Burst II, cd 40s, ammo 6, chargeFrames 60, reloadFrames 141, Tetra. treasure:true variant — the ONLY Bay entry in the data (no base-Bay entry exists; never conflated with mary-bay-goddess, the SR/Water BAY GODDESS variant of Mary). A PURE TANK whose kit is 100% survivability: damage-taken sharing, cover HP (share / heal / rebuild / Max HP), a continuous DEF grant, an ally damage-taken reduction, and two HP heals. ZERO damage lines and ZERO weapon-state modifiers in the whole kit — this unit cannot move her own damage or anyone else's; her board footprint is tandem (one per-shot recovery channel + one inert DEF buff). || MODELED TODAY (both lines in S1 'You Can Do It'): (1) 'DEF ▲ 10.13% of the skill user's DEF continuously' on 'using Burst Skill' → burstCast-keyed defPct 10.13 with NO duration ('continuously' = never expires; re-casts refresh), target all allies (self included). 'only if self is alive' is scope-trivial in v1 (nothing dies). SEMANTIC APPROXIMATION: the kit scales off the CASTER's DEF; the schema has no casterDefPct, so defPct (target-own) stands in — DEF being offensively inert in v1, the distinction has zero observable consequence (marciana precedent). (2) TREASURE line 'Activates when performing Full Charge attacks. Affects all allies (except self). Recovers 4% of the skill user's final Max HP' → chargeCounter count:1 (fires EVERY full charge; the phase counter resets each time) → heal ticks:1 to allies excludeSelf. An RL unit's every shot IS a full charge (sim.ts: all dumped rockets dispatch charged=true), so this emits ONE recovery event per bay shot to each of the other two allies — the load-bearing line, solely through teammates' on-recovery consumers (Crown/Asuka 'when recovery takes effect'). Heal MAGNITUDE is event-only (no HP pool in v1). || DELIBERATELY UNMODELED (all seven VERBATIM in `unmodeled`, never an `ignored` drop): S1 'Proportionally shares damage taken continuously' (allies — no incoming-damage model, no redistribution primitive); S2 'shares damage taken' onto SELF'S COVER (cover is not a sim entity); S2 cover-HP HoT 2.88%/1s x5s at Full Burst END (cover repair is NOT a Nikke recovery — a heal ticks:5 self-encoding would falsely pulse on-recovery consumers at every FB end); S2 Treasure 'entering Burst Stage 1 + cover destroyed → self 20% Max HP' (the cover-destroyed gate can never be satisfied at scope — boss deals no damage); burst Treasure 'Rebuild Cover with 20% HP once per battle' (cover + destroyed gate); burst 'Max HP of Cover ▲ 18% for 20s' (COVER Max HP, not unit Max HP — a targetMaxHpPct/maxHpFlat encoding would pollute the HP→ATK feed path); burst 'Damage Taken ▼ 8.87% for 10s' on ALL ALLIES (defensive mitigation — NOT the damageTakenPct stat, which is a boss-targeted amplifier with the wrong direction and target; v1 boss deals no damage so ally mitigation is inert by construction). || EVIDENCE TIER: both live values (10.13 DEF, per-full-charge recovery) are kit-text-literal; the only estimated quantities are the cadence tuple (her own shots only). || TIER 1 (clean-weapon-like: zero damage lines, zero weapon-state modifiers; the encoding is one recovery-event channel + one inert defPct; no scoped buffs, no round counts, no status gates among the modeled lines). Faithful>fit; measured>fudge. || Kit-autonomy gauntlet 2026-08-03."
}

```

## Driver test — scripts/tests/units/bay.test.ts (19/19 GREEN vs the driver override; RED pre-override)

```typescript
// PER-UNIT KIT SPEC — `bay` (Bay (Treasure), RL/Fire/Defender/Burst II, Tetra, ammo 6,
// chargeFrames 60, reloadFrames 141, burst CD 40s). Kit-autonomy gauntlet 2026-08-03.
// `treasure: true` variant — the ONLY Bay in the data (no base-bay entry exists).
//
// Bay (Treasure) is a PURE TANK: her entire kit is survivability — damage-taken sharing,
// cover HP (share / heal / rebuild / Max HP), a continuous DEF grant, an ally damage-taken
// reduction, and two HP heals. NONE of her nine kit lines deals damage, buffs damage, or
// touches weapon state. The sim models no HP pool, no incoming damage, and no cover, so her
// load-bearing in-domain surface is exactly TWO lines:
//   (a) S1's continuous DEF grant — an offensively-inert `defPct` buff (kit completeness), and
//   (b) S1's Treasure full-charge ally heal — a RECOVERY EVENT channel (the engine models a heal
//       as an event that fires teammates' on-recovery consumers, NOT a number) that emits one
//       recovery event per full charge, and every RL shot IS a full charge (sim.ts: all dumped
//       rockets dispatch charged=true).
// Her personal damage is weapon-only; her board value is tandem (she refreshes recovery-consumer
// teammates such as Asuka/Crown with every shot).
//
// Kit (data/characters.json → characters.bay.skills, SL10):
//   S1 ■ using Burst Skill (self alive) → all allies: Proportionally shares damage taken, cont. [U1 gap]
//      ■ using Burst Skill (self alive) → all allies: DEF ▲10.13% of user's DEF continuously     [B3]
//      ■ Full Charge attacks → all allies (except self): Recovers 4% of user's final Max HP      [B2]
//   S2 ■ using Burst Skill (self alive) → self's cover: shares damage taken continuously         [U2 gap]
//      ■ Full Burst ends → self: recovers Cover HP 2.88% of final Max HP /1s for 5 sec           [U3 gap]
//      ■ entering Burst Stage 1 + cover destroyed → self: Recovers 20% of final Max HP           [U4 gap]
//   BU ■ self if cover destroyed: Rebuild Cover with 20% HP, once per battle                     [U5 gap]
//      ■ self: Max HP of Cover ▲18% of user's Max HP for 20 sec                                  [U6 gap]
//      ■ all allies: Damage Taken ▼8.87% for 10 sec                                              [U7 gap]
//
// One assertion group per kit line, asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (almost all of bay's kit is offensively inert, so TOTALS
// alone cannot discriminate; the load-bearing evidence is the EVENT LOG, read through a recovery
// CONSUMER):
//   B1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME comp), and
//       a defPct→attackDamagePct counterfactual MOVES the team — so the inertness is live, not a
//       vacuous "nothing happens".
//   B2  the Treasure full-charge heal fires ONE recovery event per full charge == per RL shot:
//       asuka's recovery consumer fires exactly bayShots times. The two nearest-wrong triggers are
//       fullBurstEnter (misreading "Full Charge attacks" as the Full Burst window — collapses the
//       firings to the FB count) and stripping the line entirely (firings 0). excludeSelf is
//       structural (bay has no self recovery-consumer to observe it behaviourally).
//   B3  the DEF line is kit-complete (1 application per own burst × 3 allies) and CONTINUOUS
//       (expiresFrame null — "continuously", no expiry), yet damage-INERT (byte-identical totals
//       with the line stripped).
//   B4/U the seven unmodelable lines (damage-share ×2, cover ×4, damage-taken-down ×1) live
//       VERBATIM in `unmodeled`, never an `ignored` drop; skill2/burst blocks are EMPTY (nothing
//       in those slots is in-domain); the cover heal is NOT encoded as a `heal` effect (cover
//       repair is not a Nikke recovery — it would falsely fire teammates' on-recovery consumers),
//       and the ally Damage-Taken-▼ line is NOT encoded as `damageTakenPct` (that stat is a
//       boss-targeted amplifier — wrong direction and wrong target).
//
// FIXTURE. liter (B1) / bay (B2, the SOLE Burst II, 40s CD) / asuka (B3 recovery consumer), boss
// Fire, focus asuka. asuka's own burst lifesteal is patched OUT so bay's full-charge heal is the
// SOLE recovery source — every landing on asuka fires asuka's S1 ("when recovery takes effect" →
// self atkPct 96.98), so counting asuka's self atkPct-96.98 buffApply events counts bay's
// recovery landings on her. liter emits no recovery (her S2 is a cover-HP NO-OP). Deterministic
// (no seed). Slot order: liter 0 / bay 1 / asuka 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUGS = ['liter', 'bay', 'asuka'];
/** Slot order: liter 0 / bay 1 / asuka 2. */
const BAY = 1;
const ASUKA = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

/** asuka's burst lifesteal removed → bay is the only recovery source in the fight. */
const asukaSoleConsumer = withPatchedOverride('asuka', (ov) => {
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length === before) {
      throw new Error('asuka burst heal missing — fixture is stale');
    }
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'asuka',
    overrides: { asuka: asukaSoleConsumer, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
/** B2 counterfactual: the full-charge heal keyed to fullBurstEnter ("Full Charge" misread as the
 *  Full Burst window) — the nearest wrong trigger; collapses per-shot firings to per-FB firings. */
const bayHealPerFB = withPatchedOverride('bay', (ov) => {
  const b = (ov.skill1 ?? []).find((x: any) =>
    x.effects.some((e: any) => e.kind === 'heal')
  );
  if (!b) {
    throw new Error('bay skill1 heal block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** B2 isolation: the full-charge heal stripped entirely (firings must collapse to 0). */
const bayNoHeal = withPatchedOverride('bay', (ov) => {
  const before = ov.skill1?.length ?? 0;
  ov.skill1 = (ov.skill1 ?? []).filter(
    (x: any) => !x.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('bay skill1 heal block missing — fixture is stale');
  }
});
/** B3 isolation: the DEF line stripped (inertness baseline). */
const bayNoDef = withPatchedOverride('bay', (ov) => {
  const before = ov.skill1?.length ?? 0;
  ov.skill1 = (ov.skill1 ?? []).filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'defPct')
  );
  if (ov.skill1.length !== before - 1) {
    throw new Error('bay skill1 defPct block missing — fixture is stale');
  }
});
/** B1 counterfactual: the inert defPct re-encoded as a damage stat (must MOVE totals). */
const bayDefAsDamage = withPatchedOverride('bay', (ov) => {
  const e = ov.skill1
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('bay skill1 defPct effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const healPerFB = run({ bay: bayHealPerFB });
const noHeal = run({ bay: bayNoHeal });
const noDef = run({ bay: bayNoDef });
const defAsDamage = run({ bay: bayDefAsDamage });
const bareInTeam = run({ bay: bareWeaponOverride('bay') });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** asuka's recovery consumer firings = her self atkPct-96.98 buff (one per recovery landing). */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
  ).length;
const bayBuffs = (evs: SimEvent[]) => buffs(evs).filter((b) => b.casterIdx === BAY);
/** Every RL shot is a full charge (sim.ts: all dumped rockets dispatch charged=true). */
const bayShots = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'shot' && e.slug === 'bay').length;
const bayBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'bay').length;
const fullBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('bay') as any;
if (!shipped) {
  throw new Error('bay has no override on disk — fixture is stale');
}
const allBlocks = [
  ...(shipped.skill1 ?? []),
  ...(shipped.skill2 ?? []),
  ...(shipped.burst ?? []),
];

describe('bay — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: bay casts her Burst II and Full Bursts occur', () => {
    // Non-vacuity gate for every burst-keyed assertion below: a comp that never completes a chain
    // makes zero Full Bursts and would let the burstCast groups pass silently on empty sets.
    expect(bayBursts(base.events)).toBeGreaterThan(0);
    expect(fullBursts(base.events)).toBeGreaterThan(0);
  });

  it('bay fires many full-charge RL shots and deals weapon damage', () => {
    // RL 6-round magazine over 180s ⇒ many shots; the B2 recovery-channel discrimination needs
    // shot count >> FB count. Her own total > 0 guards the inertness assertions (else "unchanged"
    // would be trivially true on a zero).
    expect(bayShots(base.events)).toBeGreaterThan(10);
    expect(bayShots(base.events)).toBeGreaterThan(fullBursts(base.events));
    expect(unitOf(base.res, 'bay').totalDamage).toBeGreaterThan(0);
  });
});

describe('B1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // With bay's kit swapped for the empty kit, her own total must not move a point (the in-team
    // bare run keeps liter/asuka identical, so this isolates bay's own contribution rather than
    // comparing solo vs team). Zero damage lines and zero weapon-state modifiers in the whole kit.
    expect(unitOf(base.res, 'bay').totalDamage).toBe(
      unitOf(bareInTeam.res, 'bay').totalDamage
    );
  });

  it('DISCRIMINATING: re-encoding the inert defPct as a damage stat MOVES the team', () => {
    // Proves the B3 inertness claim is live, not a vacuous "nothing happens": a defPct→
    // attackDamagePct swap is the nearest wrong "make the kit do something" model, and it must
    // change totals — i.e. the shipped inertness is one that model provably fails.
    expect(totals(defAsDamage.res)).not.toEqual(totals(base.res));
  });
});

describe('B2 — S1 Treasure full-charge heal: one recovery event per full charge, allies except self', () => {
  it('drives the recovery consumer exactly once per bay full charge (== per RL shot)', () => {
    // "Activates when performing Full Charge attacks" — every RL shot is a full charge, so the
    // heal lands on each ally-except-self once per shot; asuka (a target) fires her on-recovery
    // consumer once per landing. bay is the SOLE recovery source in this fixture.
    expect(recoveryFirings(base.events)).toBe(bayShots(base.events));
  });

  it('DISCRIMINATING: a fullBurstEnter trigger collapses the firings to the FB count', () => {
    // The nearest wrong reading of "Full Charge attacks" is the Full Burst window. It must produce
    // strictly fewer firings — exactly one per Full Burst entry — proving the shipped per-shot
    // chargeCounter encoding is the one that fits the prose cadence.
    const collapsed = recoveryFirings(healPerFB.events);
    expect(collapsed).toBeLessThan(recoveryFirings(base.events));
    expect(collapsed).toBe(fullBursts(healPerFB.events));
  });

  it('DISCRIMINATING: stripping the line zeroes the recovery channel', () => {
    // bay has no other recovery source (S2/burst are empty; liter emits none), so removing the
    // line must leave asuka's consumer silent.
    expect(recoveryFirings(noHeal.events)).toBe(0);
  });

  it('stripping the heal leaves bay\u2019s OWN total unchanged (tandem-only channel)', () => {
    // The heal has no HP amount in v1 and no self-buff; it can only matter via a teammate's
    // on-recovery consumer. Removing it cannot move her own weapon output.
    expect(totals(noHeal.res).bay).toBe(totals(base.res).bay);
  });
});

describe('B3 — S1 DEF ▲10.13% of the skill user\u2019s DEF, continuously: kit-complete yet damage-inert', () => {
  const defBuffs = bayBuffs(base.events).filter(
    (b) => b.stat === 'defPct' && b.value === 10.13
  );

  it('applies once per own burst cast to all three allies (bursts × 3)', () => {
    expect(defBuffs.length).toBe(bayBursts(base.events) * SLUGS.length);
    const perFrame = new Map<number, Set<number | null>>();
    for (const b of defBuffs) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetIdx);
    }
    for (const [frame, holders] of perFrame) {
      expect(
        holders.size,
        `frame ${frame} reached ${holders.size} allies`
      ).toBe(SLUGS.length);
    }
  });

  it('is CONTINUOUS (no expiry), not time-bounded or round-counted', () => {
    // "DEF ▲ … continuously" — the grant never expires; re-casts refresh an already-live buff.
    expect(defBuffs.length).toBeGreaterThan(0);
    for (const b of defBuffs) {
      expect(b.expiresFrame).toBeNull();
      expect(b.durationShots).toBeNull();
    }
  });

  it('is damage-INERT: stripping the line leaves every unit byte-identical', () => {
    // defPct is inert in v1 (self DEF never enters damage dealt; there is no incoming damage).
    // The faithful claim for this line is precisely that it moves NO unit's total.
    expect(totals(noDef.res)).toEqual(totals(base.res));
  });
});

describe('B4/U — the seven unmodelable lines are documented, not dropped or fabricated', () => {
  it('skill2 and burst blocks are EMPTY — every line there is out-of-domain', () => {
    // S2: damage-share (cover), cover-HP heal on FB end, cover-destroyed-gated self heal.
    // Burst: cover rebuild once/battle, cover Max HP grant, ally Damage-Taken-▼.
    // The sim models no cover, no HP pool, no incoming damage — nothing in these slots can have
    // an in-domain effect, so the faithful encoding is empty blocks + verbatim `unmodeled`.
    expect(shipped.skill2 ?? []).toEqual([]);
    expect(shipped.burst ?? []).toEqual([]);
  });

  it('the only buff stat bay originates is defPct (no offensive buff is invented)', () => {
    expect([...new Set(bayBuffs(base.events).map((b) => b.stat))]).toEqual([
      'defPct',
    ]);
  });

  it('cover/damage-taken magnitudes never appear as any buff value', () => {
    // 2.88 (cover HoT), 8.87 (Damage Taken ▼) — the two unambiguous unmodeled magnitudes must not
    // surface as buffs anywhere in the event log.
    expect(buffs(base.events).some((b) => b.value === 2.88)).toBe(false);
    expect(buffs(base.events).some((b) => b.value === 8.87)).toBe(false);
  });

  it('the ally Damage-Taken-▼ line is NOT a damageTakenPct boss debuff (S2b pre-registered trap)', () => {
    // The highest-risk shared-prior misread: "Damage Taken" reflex-mapped to the damageTakenPct
    // stat — but that stat is a boss-targeted AMPLIFIER (positive = boss takes MORE damage). The
    // kit line targets ALL ALLIES with ▼ (defensive mitigation). An 8.87% boss debuff per bay
    // burst would inflate every unit's total each rotation; no such buffApply may exist anywhere.
    expect(
      buffs(base.events).some(
        (b) => b.stat === 'damageTakenPct' && b.value === 8.87
      )
    ).toBe(false);
    expect(bayBuffs(base.events).some((b) => b.stat === 'damageTakenPct')).toBe(
      false
    );
  });

  it('all seven gap lines live verbatim in `unmodeled` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.skill1?.length).toBe(1);
    expect(shipped.unmodeled?.skill2?.length).toBe(3);
    expect(shipped.unmodeled?.burst?.length).toBe(3);
    expect(shipped.unmodeled.skill1.join(' ')).toContain(
      'Proportionally shares damage taken continuously'
    );
    const s2 = shipped.unmodeled.skill2.join(' ');
    expect(s2).toContain('shares damage taken continuously');
    expect(s2).toContain('2.88%');
    expect(s2).toContain("cover has been destroyed");
    const bu = shipped.unmodeled.burst.join(' ');
    expect(bu).toContain('Rebuild Cover');
    expect(bu).toContain('18%');
    expect(bu).toContain('8.87%');
    expect(shipped.ignored).toBeUndefined();
  });

  it('no `heal`/`shield` effect anywhere — cover repair is NOT a Nikke recovery', () => {
    // Encoding the S2 cover-HP heal or the cover rebuild as a `heal`/`shield` would emit
    // recovery/shielded events and falsely satisfy teammates' on-recovery/requiresShielded gates.
    // bay's ONLY legitimate heal is the S1 Treasure line targeting allies — one block, skill1.
    const heals = allBlocks.filter((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(heals.length).toBe(1);
    expect(heals[0].slot).toBe('skill1');
    const kinds = allBlocks.flatMap((b: any) => b.effects.map((e: any) => e.kind));
    expect(kinds).not.toContain('shield');
  });
});

describe('structural pins (S2b-pre-registered traps, adopted at S2c)', () => {
  it('the DEF line is keyed to burstCast (own cast), never fullBurstEnter', () => {
    // "Activates when using Burst Skill, only if self is alive" — own-cast keyed. fullBurstEnter
    // would re-apply on every team FB regardless of who cast; asserted statically so it holds
    // regardless of fixture.
    const defBlock = (shipped.skill1 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.stat === 'defPct')
    );
    expect(defBlock?.trigger?.kind).toBe('burstCast');
  });

  it('the heal line is keyed to the full-charge counter with allies-except-self targeting', () => {
    const healBlock = (shipped.skill1 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(healBlock?.trigger?.kind).toBe('chargeCounter');
    expect(healBlock?.target).toEqual({ kind: 'allies', excludeSelf: true });
  });
});

```

---

# OPEN ITEMS FOR THE JUDGE

1. TRIGGER EQUIVALENCE (S5 sole fail; S6 diff #1): `shotFired` vs `chargeCounter count:1` for the per-full-charge heal on an always-charged RL. Rule whether the driver's chargeCounter encoding is FAITHFUL (behaviorally identical, more literal to 'Full Charge attacks') or a REAL-GOTCHA.
2. COVER-HoT ENCODING (S6 diff #2): driver leaves the S2 cover-HP HoT verbatim UNMODELED (S2b pre-registered trap; marciana Storage≠shield precedent); S6 models it as a self heal ticks:5 with a ⚑. Rule which disposition is more faithful.
3. DEF-LINE DISPOSITION (S2b vs driver): S2b read 'DEF ▲ 10.13% of the skill user's DEF' as a pure schema GAP (no casterDefPct key); driver models it as defPct 10.13 + explicit SEMANTIC-APPROXIMATION caveat (marciana precedent — GO faithfulness 1.0 on the identical line shape), since DEF is offensively inert in v1 and the distinction has zero observable consequence. Rule.
