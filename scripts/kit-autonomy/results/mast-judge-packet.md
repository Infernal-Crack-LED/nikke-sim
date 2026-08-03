# S7 RECONCILING-JUDGE PACKET — `mast` (Mast, SMG/Supporter/Electric, Burst II)

You are the binding reconciling judge. Read the contract below, then the SSOT mechanics, the ground-truth kit, and the FOUR independent derivations (S2b reviewer, S5 blind test, S6 blind override, driver). Rule each kit line FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA and return the binding verdict JSON the contract specifies.

=== DRIVER RECONCILIATION SUMMARY (for context; rule independently) ===
Cross-family roles CONVERGED on: S2 Crit Rate 23.56%/30s fused-passive scoped self+2-byFinalAtk; burst Max HP 86.2% (casterMaxHpPct, inert) + Crit Damage 25.19%/7s scoped self+2; Sea Breeze DEF▼ UNMODELED (no enemy-DEF-reduction primitive, ~0.16% team dmg); Storm gated on requiresTargetStatus 'Sea Breeze'; no crit-count trigger primitive. TWO measurement-gated divergences: (1) S1 HP<70% Crit Damage 50.94% — driver=passive-always-on (real-game: a supporter sits <70% from boss damage whether or not she bursts; 'continuously'=no-expiry), S2b=burstCast-self-trigger-7s (burst Max-HP drops HP ratio to 53.7%), S5=passive (converged with driver), S6=unmodeled (conservative). (2) Storm stack count — driver=50 (shared-refresh cap-bind: 'stacks up to 50' implies reachable, standard NIKKE stacking-debuff refresh), S5≈14 (per-stack 3s expiry turnover), S6≈5 (rotation-weighted base-crit). All roles agree both are MEASUREMENT-GATED (no Mast recording). S5 blind test vs driver override: 14 passed / 1 failed / 3 skipped — the 1 fail is a FIXTURE ARTIFACT (assertion 'expiresFrame<10000' proving the 25.19 buff is a bounded 7s window; the blind test's burstEligibility:3 accommodation fires mast's burst late so the window ends ~10293>10000; driver gives expiresFrame-frame=420=7s exactly, sibling per-burst-cadence + 3-target + caster-scaled-MaxHP assertions PASS).

=== 1. RECONCILING-JUDGE CONTRACT ===
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

=== 2. MECHANICS SSOT — docs/data/damage-calculation.md ===
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

=== 2b. MECHANICS SSOT — docs/data/game-mechanics.md ===
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

=== 3. GROUND TRUTH — mast kit prose + base stats (data/characters.json) ===
{
  "slug": "mast",
  "name": "Mast",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/eg-68/qq-62/bd52b93a392a1d4b035f858a5ce1abbf.png",
  "weapon": "SMG",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Electric",
  "manufacturer": "Elysion",
  "normalAttackMultiplier": 8.73,
  "coreAttackMultiplier": 200,
  "ammo": 120,
  "reloadFrames": 111,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 5.7,
  "releaseDate": "2023-07-20",
  "burstGaugePerShot": 0.1,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates after landing 2 critical hit(s) with normal attacks. Affects the target(s).\nSea Breeze: DEF ▼ 1.9% of the skill user's DEF, stacks up to 50 time(s) and lasts for 3 sec.\n■ Activates when HP falls below 70%. Affects self and 2 other ally unit(s) with the highest final ATK (except the skill user).\nCritical Damage ▲ 50.94% continuously.",
    "skill2": "■ Activates at the start of battle. Affects self and 2 ally unit(s) with the highest final ATK (except the skill user).\nCritical Rate ▲ 23.56% for 30 sec.",
    "burst": "■ Affects self and 2 ally unit(s) with the highest final ATK (except the skill user).\nMax HP ▲ 86.2% of the skill user's Max HP without restoring HP, lasts for 7 sec.\nCritical Damage ▲ 25.19% for 7 sec.\n■ Affects the target(s) afflicted with Sea Breeze.\nStorm: Deals 4.52% of final ATK as damage. Mirrors the stack count of Sea Breeze every 1 sec for 7 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "role": {
    "weapon": {
      "shot_id": 1035001,
      "shot_detail": {
        "id": 1035001,
        "damage": 873,
        "max_ammo": 120,
        "shake_id": 2,
        "ShakeType": "Fire_SMG",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 150,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "SMG",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 1440,
        "name_localkey": "Submachine Gun",
        "prefer_target": "TargetAR",
        "reload_bullet": 10000,
        "counter_enermy": "Metal_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 1440,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 119,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 1000,
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
        "end_accuracy_circle_scale": 110,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 110,
        "target_burst_energy_pershot": 2000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 110,
        "auto_start_accuracy_circle_scale": 110
      },
      "bonusrange_max": 35,
      "bonusrange_min": 15
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step2",
      "burst_apply_delay": 1,
      "change_burst_step": "Step3"
    },
    "skillDetails": {
      "skill1_id": 2350101,
      "skill2_id": 2350201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2350101,
        "icon": "icn_skill_criticaldamage_01",
        "group_id": 23501,
        "skill_level": 1,
        "name_localkey": "Pirate's Grit",
        "next_level_id": 2350102,
        "level_up_cost_id": 40102,
        "description_localkey": "■ Activates after landing {description_value_01} critical hit(s) with normal attacks. Affects the target(s).\n<color=#00AEFF>Sea Breeze: DEF ▼ {description_value_02}% of the skill user's DEF, stacks up to {description_value_03} time(s) and lasts for {description_value_04} sec.</color>\n■ Activates when HP falls below {description_value_05}%. Affects self and {description_value_06} other ally unit(s) with the highest <word_group=10025>final</word_group> ATK (except the skill user).\n<color=#00AEFF>Critical Damage ▲ {description_value_07}% continuously.</color>",
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
              "1.12",
              "1.2",
              "1.29",
              "1.38",
              "1.46",
              "1.55",
              "1.64",
              "1.72",
              "1.81",
              "1.9"
            ]
          },
          {
            "description_value": [
              "50",
              "50",
              "50",
              "50",
              "50",
              "50",
              "50",
              "50",
              "50",
              "50"
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
              "70",
              "70",
              "70",
              "70",
              "70",
              "70",
              "70",
              "70",
              "70",
              "70"
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
              "30.1",
              "32.42",
              "34.73",
              "37.05",
              "39.36",
              "41.68",
              "43.99",
              "46.31",
              "48.63",
              "50.94"
            ]
          },
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2350201,
        "icon": "icn_skill_statcritical_01",
        "group_id": 23502,
        "skill_level": 1,
        "name_localkey": "Pirate's Sight",
        "next_level_id": 2350202,
        "level_up_cost_id": 40202,
        "description_localkey": "■ Activates at the start of battle. Affects self and {description_value_01} ally unit(s) with the highest <word_group=10025>final</word_group> ATK (except the skill user).\n<color=#00AEFF>Critical Rate ▲ {description_value_02}% for {description_value_03} sec.</color>",
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
              "13.92",
              "14.99",
              "16.06",
              "17.14",
              "18.21",
              "19.28",
              "20.35",
              "21.42",
              "22.49",
              "23.56"
            ]
          },
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
      "ulti_skill_id": 1350301,
      "ulti_skill_detail": {
        "id": 1350301,
        "icon": "icn_skill_c350_ult",
        "group_id": 13503,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Electronic",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Sail Through the Tempest!",
        "next_level_id": 1350302,
        "prefer_target": "HighAttackFirstSelf",
        "resource_name": "c350_ulti",
        "duration_value": 0,
        "skill_cooltime": 2000,
        "level_up_cost_id": 40302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 3,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 10000,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
            "skill_value_type": "Integer"
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
        "description_localkey": "■ Affects self and {description_value_01} ally unit(s) with the highest <word_group=10025>final</word_group> ATK (except the skill user).\n<color=#00AEFF>Max HP ▲ {description_value_02}% of the skill user's Max HP without restoring HP, lasts for {description_value_03} sec.\nCritical Damage ▲ {description_value_04}% for {description_value_05} sec.</color>\n■ Affects the target(s) afflicted with Sea Breeze.\n<color=#00AEFF>Storm: Deals {description_value_06}% of <word_group=10025>final</word_group> ATK as damage. <word_group=10026>Mirrors the stack count</word_group> of Sea Breeze every 1 sec for {description_value_07} sec.</color>",
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
              "50.93",
              "54.85",
              "58.77",
              "62.69",
              "66.61",
              "70.53",
              "74.44",
              "78.36",
              "82.28",
              "86.2"
            ]
          },
          {
            "description_value": [
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7"
            ]
          },
          {
            "description_value": [
              "14.88",
              "16.03",
              "17.17",
              "18.32",
              "19.46",
              "20.61",
              "21.75",
              "22.9",
              "24.04",
              "25.19"
            ]
          },
          {
            "description_value": [
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7"
            ]
          },
          {
            "description_value": [
              "2.67",
              "2.88",
              "3.08",
              "3.29",
              "3.49",
              "3.7",
              "3.9",
              "4.11",
              "4.32",
              "4.52"
            ]
          },
          {
            "description_value": [
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7",
              "7"
            ]
          },
          {},
          {},
          {},
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          135030103
        ],
        "after_hurt_function_id_list": [
          0
        ],
        "before_use_function_id_list": [
          0
        ],
        "before_hurt_function_id_list": [
          135030101,
          135030102
        ]
      }
    },
    "statScaling": {
      "grow_grade": 235002,
      "grade_core_id": 1,
      "stat_enhance_id": 5303,
      "stat_enhance_detail": {
        "id": 5303,
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
        400001
      ],
      "element_details": [
        {
          "id": 400001,
          "element": "Electronic",
          "group_id": 5000004,
          "element_icon": "icn_element_elect",
          "weak_element_id": 500001,
          "element_desc_localekey": "Injects Code: Z.E.U.S. to all water-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Electric",
          "element_code_name_localekey": "Code: Z.E.U.S."
        }
      ]
    },
    "piece": {
      "piece_id": 5100350,
      "piece_detail": {
        "id": 5100350,
        "class": "Attacker",
        "order": 35000,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 350,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Mast's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 235001,
      "class": "Supporter",
      "order": 10019,
      "name_code": 5079,
      "corporation": "ELYSION",
      "resource_id": 350,
      "name_localkey": "Mast",
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
    "def": 86,
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
    "resourceId": 350
  }
}
=== 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5) ===
{
  "slug": "mast",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Sea Breeze: DEF ▼ 1.9%, 50 stacks, 3s",
      "disposition": "FIX",
      "scope": "Boss DEBUFF (taxonomy #4 — benefits whole team), stacked per PAIR of critical normal-attack hits. Two payloads: (a) the DEF-shred value — the schema has NO enemy-DEF StatKey (defPct is self-inert), so the magnitude is a GAP to record/approximate, never silently dropped; (b) the Sea Breeze STATUS + live STACK COUNT — load-bearing input to the burst's Storm line, must be tracked (targetStatus name 'Sea Breeze' + a resource pool for the count) even if the DEF value stays unmodeled.",
      "durationSemantics": "Stacks up to 50; window 'lasts for 3 sec' — refresh-on-reapply. Sustained only while crits keep landing <3s apart; the 111-frame (~1.85s) reload does NOT break the window, so near-cap steady state is reachable but ramp-limited: cap needs 100 crits (~100/critRate rounds), NOT 100 rounds. Ramp/steady-state derivation is CALIBRATED ⚑.",
      "triggerIdentity": "'after landing 2 critical hit(s) with normal attacks' — a CRIT-GATED hit counter. The engine's hitCount counts ROUNDS, not crits; a faithful encoding needs an expected-value threshold ≈ 2/critRate (⚑, crit-rate-dependent, incl. her own S2's +23.56% for the first 30s) or an explicit crit-gated mechanism.",
      "targetSet": "enemy (the boss). Boss-held debuffs emit buffApply with casterIdx===null AND targetIdx===null.",
      "nearestWrongModel": "Plain {kind:'hitCount', count:2} ungated by crit — stacks hit cap in 100 rounds (~5s) regardless of crit rate, over-crediting the ramp and handing Storm a full 50-stack mirror far too early; and/or omitting the targetStatus/stack pool entirely so the burst's Storm gate can never open.",
      "distinguishingAssertion": "Count Sea Breeze stack applications vs mast's shot events: applications/shots ≈ critRate/2, NOT 1/2. Sharper: withPatchedOverride to zero mast's crit-rate sources → Sea Breeze must apply at (base-crit)/2 rate only; a crit-blind hitCount:2 model is invariant to that patch (RED).",
      "inertness": "With no crit-eligible normal attacks landing (or crit forced to 0 and base crit hypothetically 0), Sea Breeze must never apply and Storm must deal 0.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "HP < 70%: Crit Damage ▲ 50.94% cont.",
      "disposition": "FIX",
      "scope": "Generic critDamagePct (no normal-attack scoping in the text) to self + 2 allies.",
      "durationSemantics": "'continuously' = held WHILE the condition holds, not a timed buff and not permanent-once-triggered. Faithful window: the condition is opened by mast's OWN burst — 'Max HP ▲ 86.2% without restoring HP' lifts her max HP while current HP stays, so her HP ratio drops to 1/1.862 ≈ 53.7% < 70% for the 7s the Max-HP grant lives, then max HP lapses and the ratio returns to ~100%, closing the condition. Net: a 7s critDamagePct 50.94 window per mast burst cast. Whether the game instead latches it permanently on first trip is a MEASUREMENT-GATED nuance; condition-held (7s) is the literal reading.",
      "triggerIdentity": "HP-threshold condition. v1 has no HP pool from boss damage, but the condition is NOT inert — it is self-tripped by the burst's un-restoring Max-HP grant. Natural encoding: keyed to mast's burstCast with durationSec 7 (NOT passive, NOT fullBurstEnter).",
      "targetSet": "self + 2 OTHER allies with highest FINAL ATK (except skill user) → alliesTopAtk count:2 excludeSelf:true byFinalAtk:true, plus self.",
      "nearestWrongModel": "Marked UNMODELED with note 'boss deals no damage, HP never falls below 70%' — the classic shared-prior misread that misses the burst self-trigger. Runner-up wrongs: passive-from-t=0 (over-credits pre-first-burst), or permanent-once-triggered (over-credits between bursts).",
      "distinguishingAssertion": "No buffApply with stat critDamagePct value 50.94 exists before mast's first burstCast event; after each mast burstCast there IS one targeting self + the 2 top-final-ATK allies with expiresFrame ≈ castFrame + 420 (7s×60). An 'unmodeled' encoding emits zero such events (RED); a passive encoding emits one at frame 0 (RED).",
      "inertness": "Zero critDamagePct-50.94 contribution at t=0 and on any rotation before mast's first own burst; must not fire on Full Bursts where a different B2 (crown) cast instead of mast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Crit Rate ▲ 23.56% for 30 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic critRatePct (text has no 'of normal attacks' scoping — NOT critRateNormalPct).",
      "durationSemantics": "Wall-clock 30 seconds, applied once at battle start, then gone for the remaining ~150s. NOT permanent, NOT rounds.",
      "triggerIdentity": "'Activates at the start of battle' — one-shot at t=0 (passive-style application at frame 0 with durationSec:30), NOT an interval repeat.",
      "targetSet": "self + 2 allies with highest FINAL ATK (except skill user) — byFinalAtk:true; 3 units total, never all 5.",
      "nearestWrongModel": "Permanent passive critRatePct 23.56 (dropping the 30s expiry) — over-credits ~150s of team crit; second wrong: static-ATK ranking instead of byFinalAtk.",
      "distinguishingAssertion": "buffApply stat critRatePct value 23.56 at frame ~0 with expiresFrame ≈ 1800, exactly 3 targets; damage events after t=30s show crit rates reverted (compare a mid-fight window's crit fraction under the shipped override vs withPatchedOverride removing the buff — must be identical after t=30s, RED for a permanent encoding). Note it also feeds the Sea Breeze crit-counter cadence for the first 30s.",
      "inertness": "No critRatePct contribution after frame 1800; the 2 non-selected units never receive it.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Max HP ▲ 86.2% of user's Max HP, 7s",
      "disposition": "FAITHFUL",
      "scope": "casterMaxHpPct (86.2% of MAST's Max HP, a flat grant — emitted under stat 'maxHpFlat' at apply time), 'without restoring HP'. Offensively inert for allies (ally-granted Max HP never feeds a teammate's atkOfMaxHpPct — e3 rule) but MUST be kept: (a) taxonomy #7 keep-the-stat rule, (b) it is the mechanism that trips skill1's HP<70% condition on mast herself.",
      "durationSemantics": "7 seconds wall-clock.",
      "triggerIdentity": "burstCast (mast's own Burst II cast) — NOT fullBurstEnter. Mast is B2; in any comp with another B2 (the control fixture fixes crown at B2) burstCast vs fullBurstEnter diverge every rotation crown takes.",
      "targetSet": "self + 2 highest-final-ATK allies (except skill user), byFinalAtk:true.",
      "nearestWrongModel": "Dropped as 'defensive Max HP, no damage relevance' — which silently severs the skill1 crit-damage chain; or keyed to fullBurstEnter (fires on crown's rotations too).",
      "distinguishingAssertion": "buffApply stat maxHpFlat with value ≈ 0.862 × mast's final Max HP (a FLAT HP number, not 86.2) appears only paired with mast burstCast events, 3 targets, expiresFrame ≈ cast + 420. A dropped line emits nothing (RED); fullBurstEnter emits on every FB including crown's (RED).",
      "inertness": "Must move NO ally damage in the control comp (no atkOfMaxHpPct consumer among liter/crown/helm); absent on rotations mast does not burst.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Critical Damage ▲ 25.19% for 7 sec",
      "disposition": "FAITHFUL",
      "scope": "Generic critDamagePct, stacking additively alongside the skill1 50.94% during the same 7s window (both live post-cast → combined +76.13 crit-damage points on the 3 targets).",
      "durationSemantics": "7 seconds wall-clock.",
      "triggerIdentity": "burstCast (own burst), same divergence-vs-fullBurstEnter argument as the Max HP line.",
      "targetSet": "self + 2 highest-final-ATK allies (except skill user), byFinalAtk:true.",
      "nearestWrongModel": "fullBurstEnter keying — over-credits every crown-led Full Burst with 25.19% team crit damage mast never cast.",
      "distinguishingAssertion": "Every buffApply critDamagePct 25.19 is preceded (same rotation) by a mast burstCast event; count(buffApply 25.19) === count(mast burstCast), NOT count(fullBurstStart).",
      "inertness": "Zero on Full Bursts whose B2 cast was crown's.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Storm: 4.52% ATK, mirrors stacks, 1s/7s",
      "disposition": "FIX",
      "scope": "Mast's only kit damage line. Per-tick damage = 4.52% of final ATK × CURRENT Sea Breeze stack count, read LIVE each tick ('mirrors the stack count … every 1 sec') — perResource DoT encoding (mihara-bonding-chain precedent: perResource {name:<seaBreeze pool>, mult:4.52}), NOT a static atkPct. Gated on the target being afflicted: requiresTargetStatus 'Sea Breeze'. DoT ticks never core-boosted; crit default OFF (opt-in measured-only); FB +50% by tick-landing timing (default ON) — the 7s of ticks straddle the FB window her cast opens.",
      "durationSemantics": "Ticks every 1 sec for 7 sec (7 ticks per cast), intervalSec 1, durationSec 7 — a per-cast instance, NOT a maintained whole-fight DoT.",
      "triggerIdentity": "burstCast (rider of mast's own burst) + requiresTargetStatus 'Sea Breeze' — no Sea Breeze on the boss at cast ⇒ no Storm.",
      "targetSet": "enemy (the boss, the Sea-Breeze-afflicted target).",
      "nearestWrongModel": "A flat dot {atkPct: 4.52, durationSec: 7} ignoring the stack mirror — under-credits by up to ×50; or the opposite over-credit, a static 4.52×50=226%/tick assuming instant cap; or snapshotting the stack count at cast instead of reading it live per tick.",
      "distinguishingAssertion": "Storm tick damage events (mast srcSlot, dot-path, 7 per cast at ~60-frame spacing) scale with the live stack pool: on a first burst cast before stacks cap, successive tick magnitudes are non-decreasing toward cap×4.52%, and withPatchedOverride zeroing mast's crit rate (no crits → no Sea Breeze) yields ZERO Storm damage events — a flat-4.52% or snapshot-50 model still deals damage under that patch (RED).",
      "inertness": "Zero Storm damage when Sea Breeze has never been applied; no Storm on crown-cast rotations; ticks must not receive core.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Sea Breeze DEF▼ stack/status tracking",
    "skill1:HP<70% Crit Damage ▲50.94 (burst-self-tripped)",
    "skill2:Crit Rate ▲23.56 for 30s",
    "burst:Max HP ▲86.2% 7s (S1-condition driver)",
    "burst:Crit Damage ▲25.19 7s",
    "burst:Storm stack-mirroring DoT"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "DEF ▼ 1.9% of the skill user's DEF (enemy DEF-shred magnitude — no enemy-DEF StatKey in the effect schema; record verbatim as a GAP if not approximated, but the Sea Breeze status + stack count MUST still be tracked)"
    ],
    "skill2": [],
    "burst": [
      "without restoring HP (no heal modeled — consistent with no-HP-pool v1; noted so the 'no restore' clause isn't mistaken for a dropped heal)"
    ]
  },
  "notes": "Expected shared-prior misreads, in order of damage: (1) skill1's HP<70% line dismissed as UNMODELED 'boss deals no damage' — the burst's un-restoring Max-HP grant self-trips it (HP ratio → ≈53.7% < 70%) for 7s per mast burst; this is the kit's central synergy and any test set must assert the 50.94% window exists post-cast and does NOT exist at t=0. (2) Sea Breeze counted as plain hitCount:2 (rounds) instead of crit-gated pairs — assert stack-accrual rate tracks crit rate, incl. the S2-boosted first 30s; the expected-value threshold conversion is CALIBRATED ⚑. (3) Storm without the live stack mirror (flat 4.52% or static ×50) — assert tick magnitude follows the live pool and collapses to zero under a crit-zeroing patch. (4) burstCast vs fullBurstEnter: mast is Burst II and the control fixture pins crown at B2, so the two triggers diverge every rotation — all three burst lines and the S1 window must key to mast's own casts; note the test fixture must guarantee mast actually casts B2 at least once (verify via burstCast events, per the burst-eligibility rule). (5) All four target clauses say highest FINAL ATK → byFinalAtk:true (A3 literal-word rule); static ranking is the near-miss. (6) skill2's 30s expiry dropped → permanent team crit. Assertion hygiene: no buffRemove on natural lapse — reason from expiresFrame/durationShots on buffApply; caster-scaled values arrive FLAT (maxHpFlat = 0.862×mast Max HP, not 86.2); Sea-Breeze/boss-held buffApply events carry casterIdx===null — filter by stat+value. MEASUREMENT-GATED nuances: whether the 50.94% latches permanently vs condition-held 7s, and Sea Breeze refresh-all-stacks vs per-stack expiry (3s window vs reload gaps decides steady-state).",
  "model": "claude-fable-5"
}

=== 5. S5 BLIND TEST (claude-opus-5) — green/red vs DRIVER override: 14 passed / 1 failed (fixture artifact) / 3 skipped ===
/**
 * mast (SMG / Electric / Supporter / Burst II) — BLIND kit spec test.
 * Written from the kit prose ALONE (no sight of the shipped override, the driver's tests, or any
 * reasoning). Every assertion below is derived from the kit text + the documented harness surface.
 *
 * KIT (level-10 magnitudes, structure preserved):
 *   skill1 A  "Activates after landing 2 critical hit(s) with normal attacks. Affects the target(s)."
 *             Sea Breeze: DEF -1.9% OF THE SKILL USER'S DEF, stacks up to 50, lasts 3 sec.
 *   skill1 B  "Activates when HP falls below 70%. Affects self and 2 other ally unit(s) with the
 *             highest FINAL ATK (except the skill user)."  Critical Damage +50.94% CONTINUOUSLY.
 *   skill2    "Activates at the start of battle. Affects self and 2 ally unit(s) with the highest
 *             FINAL ATK (except the skill user)."  Critical Rate +23.56% for 30 sec.
 *   burst A   same 3-unit target set: Max HP +86.2% OF THE SKILL USER'S Max HP ("without restoring
 *             HP"), 7 sec; Critical Damage +25.19%, 7 sec.
 *   burst B   "Affects the target(s) afflicted with Sea Breeze."  Storm: 4.52% of final ATK,
 *             MIRRORS the Sea Breeze stack count, every 1 sec for 7 sec.
 *
 * FIXTURE — and the one real hazard here:
 *   controlComp('mast', true) seats liter(B1) / crown(B2) / mast(carry slot) / helm(B3). mast is a
 *   BURST II unit and crown already occupies the B2 slot ahead of her, so the rotation may never
 *   select mast's own burst — which would make every burst-block assertion vacuous rather than
 *   discriminating. Burst assertions therefore read a FIXTURE variant that appends a
 *   `burstEligibility: 3` block to mast's burst slot. That accommodation changes only WHEN she may
 *   cast, never WHAT her burst does, so it cannot manufacture any value the assertions read. The
 *   first test records whether she bursts WITHOUT the accommodation.
 *
 * DISCRIMINATION NOTES are inline per test (what the faithful reading gives vs the nearest-wrong).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed by driver (gauntlet S5): blind/ sits under kit-autonomy/, not tests/units/


const SLUG = 'mast';

type Ev = SimEvent & Record<string, any>;

/** Run a comp while collecting the full event log. */
function record(opts: any): { res: any; evs: Ev[] } {
  const evs: Ev[] = [];
  const on = (e: SimEvent) => {
    evs.push(e as Ev);
  };
  const o: any = { ...opts, onEvent: on, cfg: { ...(opts?.cfg ?? {}), onEvent: on } };
  return { res: runComp(o), evs };
}

/**
 * The override FILE is slot-keyed, but the two documented descriptions of the in-memory clone
 * disagree on whether a slot is a bare Block[] or a CharacterSkills carrying `.blocks`. Both shapes
 * are handled so a shape guess can never turn into a false RED.
 */
function slotBlocks(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function setSlotBlocks(ov: any, slot: string, blocks: any[]): void {
  if (!ov?.[slot]) return;
  if (Array.isArray(ov[slot])) ov[slot] = blocks;
  else ov[slot].blocks = blocks;
}

const DAMAGE_KINDS = new Set(['dot', 'flatDamage', 'storedHit']);

/** Fixture accommodation only — lets a Burst II carry actually cast in the control comp. */
function addEligibility(ov: any): void {
  slotBlocks(ov, 'burst').push({
    slot: 'burst',
    trigger: { kind: 'passive' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstEligibility', stage: 3 }],
  });
}
/** mast's burst carries exactly one damage line (Storm), so stripping burst damage == no Storm. */
function stripBurstDamage(ov: any): void {
  for (const b of slotBlocks(ov, 'burst')) {
    if (Array.isArray(b.effects)) b.effects = b.effects.filter((e: any) => !DAMAGE_KINDS.has(e?.kind));
  }
}
/** Removes the sole Sea Breeze source (and, unavoidably, the skill1 crit-damage line). */
function dropSkill1(ov: any): void {
  setSlotBlocks(ov, 'skill1', []);
}

let SLOWED = false;
/** Quarter the Sea Breeze application rate => fewer live stacks for Storm to mirror. */
function slowSeaBreeze(ov: any): void {
  for (const b of slotBlocks(ov, 'skill1')) {
    const t = b?.trigger;
    if (t?.kind === 'hitCount' && typeof t.count === 'number') {
      t.count *= 4;
      if (typeof t.countInFb === 'number') t.countInFb *= 4;
      SLOWED = true;
    } else if (t?.kind === 'interval' && typeof t.sec === 'number') {
      t.sec *= 4;
      SLOWED = true;
    } else if (t?.kind === 'shotFired') {
      b.everyN = (b.everyN ?? 1) * 4;
      SLOWED = true;
    }
  }
}

const BASE = controlComp(SLUG, true) as any;
const withOv = (ov: any) => ({ ...BASE, overrides: { ...(BASE?.overrides ?? {}), [SLUG]: ov } });

const OV_FX = withPatchedOverride(SLUG, (ov: any) => addEligibility(ov));
const OV_FX_NO_STORM = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  stripBurstDamage(ov);
});
const OV_FX_NO_SB = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  dropSkill1(ov);
});
const OV_FX_NO_BOTH = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  dropSkill1(ov);
  stripBurstDamage(ov);
});
const OV_FX_SLOW = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  slowSeaBreeze(ov);
});
const OV_FX_SLOW_NO_STORM = withPatchedOverride(SLUG, (ov: any) => {
  addEligibility(ov);
  slowSeaBreeze(ov);
  stripBurstDamage(ov);
});

// ---- hoisted runs (7 full 180s sims) --------------------------------------------------------
const R_BASE = record(BASE);
const R_FX = record(withOv(OV_FX));
const R_FX_NO_STORM = record(withOv(OV_FX_NO_STORM));
const R_FX_NO_SB = record(withOv(OV_FX_NO_SB));
const R_FX_NO_BOTH = record(withOv(OV_FX_NO_BOTH));
const R_FX_SLOW = record(withOv(OV_FX_SLOW));
const R_FX_SLOW_NO_STORM = record(withOv(OV_FX_SLOW_NO_STORM));

const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;
const buffsOf = (evs: Ev[], stat: string, value: number) =>
  evs.filter((e) => e.kind === 'buffApply' && e.stat === stat && typeof e.value === 'number' && near(e.value, value));
const targetsOf = (evs: Ev[]) => new Set(evs.map((e) => e.targetSlug));
const mastIdxOf = (evs: Ev[]): unknown => {
  const seed =
    buffsOf(evs, 'critRatePct', 23.56)[0] ??
    buffsOf(evs, 'critDamagePct', 25.19)[0] ??
    buffsOf(evs, 'critDamagePct', 50.94)[0];
  return seed ? seed.casterIdx : undefined;
};
const continuous = (ef: unknown) => ef === undefined || ef === null || (typeof ef === 'number' && ef >= 10_000);

describe('mast — fixture viability', () => {
  it('mast is a Burst II carry: records whether the control comp lets her burst unaided', () => {
    const natural = buffsOf(R_BASE.evs, 'critDamagePct', 25.19).length;
    const accommodated = buffsOf(R_FX.evs, 'critDamagePct', 25.19).length;
    // Non-vacuity gate for the whole burst section: at least one fixture must actually cast her
    // burst, otherwise every burst assertion below would be trivially satisfiable.
    expect(natural + accommodated).toBeGreaterThan(0);
  });
});

describe('mast skill2 — Critical Rate +23.56% for 30 sec, start of battle', () => {
  const cr = buffsOf(R_BASE.evs, 'critRatePct', 23.56);

  it('applies to exactly 3 units — self PLUS the 2 highest-final-ATK OTHER allies', () => {
    expect(cr.length).toBeGreaterThan(0);
    const t = targetsOf(cr);
    // Nearest-wrong #1: alliesTopAtk{count:2, excludeSelf:true} alone (exclude-then-take-N) buffs
    // only 2 allies and DROPS mast herself -> size 2, no 'mast'.
    // Nearest-wrong #2: a plain `allies` target -> size 4 (whole team).
    expect(t.size).toBe(3);
    expect(t.has(SLUG)).toBe(true);
  });

  it('is a one-shot 30 sec window, not a permanent or refreshing buff', () => {
    expect(cr.length).toBe(3); // exactly one apply per target for the whole fight
    for (const e of cr) {
      // Applied at battle start => expiry at ~30s * 60fps = 1800.
      // Nearest-wrong #1: modeled permanent (no durationSec) -> undefined / >= 10800.
      // Nearest-wrong #2: keyed to fullBurstEnter / interval -> many applies, cr.length > 3.
      expect(typeof e.expiresFrame).toBe('number');
      expect(e.expiresFrame).toBeGreaterThan(1750);
      expect(e.expiresFrame).toBeLessThan(1850);
    }
  });
});

describe('mast skill1 — Critical Damage +50.94% continuously', () => {
  const cd = buffsOf(R_BASE.evs, 'critDamagePct', 50.94);

  it('is present and continuous (no time expiry)', () => {
    // The kit gates this on "HP falls below 70%". The sim has no HP pool, so the faithful reading of
    // a real raid fight (a supporter drops under 70% early) is an always-live buff; the ONSET delay
    // is the flagged unknown, not the buff's existence. A model that omits the line entirely
    // under-credits mast's support value for the whole fight.
    expect(cd.length).toBeGreaterThan(0);
    for (const e of cd) expect(continuous(e.expiresFrame)).toBe(true);
  });

  it('hits the same 3-unit set as her other target clauses (self + 2 highest-final-ATK others)', () => {
    const t = targetsOf(cd);
    expect(t.size).toBe(3);
    expect(t.has(SLUG)).toBe(true);
    // All three of mast's target clauses are worded identically, so the sets must coincide.
    expect([...t].sort()).toEqual([...targetsOf(buffsOf(R_BASE.evs, 'critRatePct', 23.56))].sort());
  });
});

describe('mast skill1 — Sea Breeze (DEF -1.9% of the SKILL USER\'s DEF, 50 stacks, 3 sec)', () => {
  it('is not fudged into a Damage Taken debuff on the boss', () => {
    // Sea Breeze reduces the BOSS's DEF by a share of MAST's DEF — flat-subtraction math. Mapping it
    // onto damageTakenPct (a multiplier on damage dealt) is a different mechanic with different
    // magnitude behaviour; nearest-wrong is a 1.9-per-stack or 95-total damageTakenPct debuff.
    const dt = R_BASE.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'damageTakenPct' &&
        typeof e.value === 'number' &&
        (near(e.value, 1.9) || near(e.value, 95)),
    );
    expect(dt).toHaveLength(0);
  });

  it.skip('GAP: the DEF-reduction payload itself has no engine channel', () => {
    // There is no boss-DEF-reduction StatKey (defPct is documented inert in v1, and damageTakenPct is
    // a different mechanic). Up to 50 stacks x 1.9% = 95% of mast's DEF subtracted from boss DEF is a
    // real, team-wide damage gain that the sim cannot represent. It belongs in `unmodeled`; the only
    // load-bearing consequence that IS modelable is the status window that gates Storm (tested below).
  });

  it.skip('GAP: the trigger is CRIT-gated ("2 critical hits with normal attacks"), engine has no crit counter', () => {
    // The nearest available primitive is hitCount:2, which fires every 2 hits regardless of crit and
    // therefore over-applies stacks by ~1/critRate. A faithful approximation is
    // hitCount = round(2 / effective crit rate) — a flagged estimate, not a kit value. Its magnitude
    // is unverifiable blind because Storm's damage is the only observable and it has no ground truth.
  });
});

describe('mast burst — buff block (self + 2 highest-final-ATK others, 7 sec)', () => {
  const evs = R_FX.evs;
  const bcd = buffsOf(evs, 'critDamagePct', 25.19);
  const mastIdx = mastIdxOf(evs);
  const mhp = evs.filter((e) => e.kind === 'buffApply' && e.stat === 'maxHpFlat' && e.casterIdx === mastIdx);

  it('Critical Damage +25.19% goes to exactly 3 units, on a bounded 7 sec window', () => {
    expect(bcd.length).toBeGreaterThan(0);
    const t = targetsOf(bcd);
    expect(t.size).toBe(3);
    expect(t.has(SLUG)).toBe(true);
    expect(bcd.length % 3).toBe(0); // 3 applies per cast
    for (const e of bcd) {
      // Nearest-wrong: modeled continuous (the kit says "for 7 sec") -> undefined / >= 10800.
      expect(typeof e.expiresFrame).toBe('number');
      expect(e.expiresFrame).toBeLessThan(10_000);
    }
  });

  it('re-applies once per burst cast, not once per Full Burst entry', () => {
    const stamps = [...new Set(bcd.map((e) => e.expiresFrame as number))].sort((a, b) => a - b);
    expect(stamps.length).toBe(bcd.length / 3);
    // Her burst cooldown is 20s (1200 frames); two applications inside one rotation window would
    // mean the block is keyed to a team-wide trigger rather than her own cast.
    for (let i = 1; i < stamps.length; i++) expect(stamps[i] - stamps[i - 1]).toBeGreaterThan(600);
  });

  it('Max HP grant is CASTER-scaled (86.2% of MAST\'s Max HP), identical flat value for every target', () => {
    expect(mhp.length).toBeGreaterThan(0);
    const t = targetsOf(mhp);
    expect(t.size).toBe(3);
    expect(t.has(SLUG)).toBe(true);
    // casterMaxHpPct resolves to ONE flat HP number shared by all targets. Nearest-wrong is
    // targetMaxHpPct ("Max HP +86.2%"), which resolves per-target and would emit differing values
    // whenever the three targets differ in Max HP.
    const vals = new Set(mhp.map((e) => Math.round(e.value as number)));
    expect(vals.size).toBe(1);
    expect([...vals][0]).toBeGreaterThan(0);
    // Same 7 sec window as the crit-damage line (same kit block).
    expect([...new Set(mhp.map((e) => e.expiresFrame))].sort()).toEqual(
      [...new Set(bcd.map((e) => e.expiresFrame))].sort(),
    );
  });
});

describe('mast burst — Storm (4.52% of final ATK, mirrors Sea Breeze stacks, 1s x 7s)', () => {
  const stormDamage = totals(R_FX.res)[SLUG] - totals(R_FX_NO_STORM.res)[SLUG];
  const stormDamageWithoutSeaBreeze = totals(R_FX_NO_SB.res)[SLUG] - totals(R_FX_NO_BOTH.res)[SLUG];

  it('deals real damage (the block is not inert)', () => {
    expect(stormDamage).toBeGreaterThan(0);
  });

  it('is GATED on Sea Breeze: with no Sea Breeze source, Storm contributes exactly zero', () => {
    // Both sides of this delta lack skill1, so every non-Storm damage path is identical between them
    // and the delta isolates Storm alone.
    // Nearest-wrong: an UNGATED Storm (no requiresTargetStatus / no stack scaling) still ticks its
    // 4.52% seven times per cast and this delta comes out positive.
    expect(stormDamageWithoutSeaBreeze).toBe(0);
  });

  it('MIRRORS the stack count: slowing Sea Breeze application strictly reduces Storm damage', () => {
    const slowedStorm = totals(R_FX_SLOW.res)[SLUG] - totals(R_FX_SLOW_NO_STORM.res)[SLUG];
    if (!SLOWED) {
      // The generic trigger mutation found no hitCount/interval/shotFired trigger on skill1, so the
      // "slow" run is identical to baseline and this comparison cannot discriminate. Recorded rather
      // than silently passing.
      expect(slowedStorm).toBe(stormDamage);
      return;
    }
    // Faithful (perResource stack mirroring): fewer live stacks -> strictly less Storm damage.
    // Nearest-wrong (flat 4.52% per tick, stack count ignored): unchanged.
    expect(slowedStorm).toBeGreaterThan(0);
    expect(slowedStorm).toBeLessThan(stormDamage);
  });

  it('is enemy-only — removing Storm leaves every teammate byte-identical', () => {
    const before = totals(R_FX.res);
    const after = totals(R_FX_NO_STORM.res);
    for (const slug of Object.keys(before)) {
      if (slug === SLUG) continue;
      expect(after[slug]).toBe(before[slug]);
    }
  });

  it.skip('tick cadence (<= 7 ticks at 1 sec per cast) needs per-source damage-event attribution', () => {
    // damage events are documented to carry bucket/srcSlot but no guaranteed source-slug field, and
    // unitOf(res, slug) row-level event exposure is not part of the documented contract:
    //   const row: any = unitOf(R_FX.res, SLUG);
    // Asserting a tick count on a guessed field name would risk a false RED on harness shape rather
    // than on model faithfulness. The load-bearing Storm claims (non-inert, Sea-Breeze-gated,
    // stack-mirroring) are all covered by the totals-based deltas above.
    expect(unitOf(R_FX.res, SLUG)).toBeTruthy();
  });
});

describe('mast — inertness / no-invention checks', () => {
  it('grants nothing to the 4th teammate on any of her three target clauses', () => {
    const mastIdx = mastIdxOf(R_FX.evs);
    const mine = R_FX.evs.filter((e) => e.kind === 'buffApply' && e.casterIdx === mastIdx && e.targetIdx !== null);
    const t = targetsOf(mine);
    expect(t.size).toBeLessThanOrEqual(3);
  });

  it('carries no ATK / attack-damage grant — her kit has no such line', () => {
    const mastIdx = mastIdxOf(R_BASE.evs);
    const invented = R_BASE.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === mastIdx &&
        ['atkPct', 'casterAtkPct', 'highestAllyAtkPct', 'attackDamagePct', 'coreDamagePct'].includes(e.stat as string),
    );
    expect(invented).toHaveLength(0);
  });
});

=== 6. S6 BLIND OVERRIDE (claude-opus-5) ===
{
  "slug": "mast",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 13
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "targetStatus",
          "name": "Sea Breeze",
          "durationSec": 3
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
          "stat": "critRatePct",
          "value": 23.56,
          "durationSec": 30
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
          "stat": "critRatePct",
          "value": 23.56,
          "durationSec": 30
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterMaxHpPct",
          "value": 86.2,
          "durationSec": 7
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 25.19,
          "durationSec": 7
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
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
          "stat": "casterMaxHpPct",
          "value": 86.2,
          "durationSec": 7
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 25.19,
          "durationSec": 7
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
      "requiresTargetStatus": "Sea Breeze",
      "effects": [
        {
          "kind": "dot",
          "atkPct": 22.6,
          "durationSec": 7,
          "intervalSec": 1
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Sea Breeze: DEF ▼ 1.9% of the skill user's DEF, stacks up to 50 time(s) and lasts for 3 sec. (magnitude only — the named status window IS modeled)",
      "Activates when HP falls below 70%. Affects self and 2 other ally unit(s) with the highest final ATK (except the skill user).",
      "Critical Damage ▲ 50.94% continuously."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⛑ Storm magnitude is an UNMEASURED estimate. The kit deals 4.52% of final ATK per Sea Breeze stack, once per second for 7 sec; the shipped atkPct 22.6 assumes a ~5-stack steady state (see flags). The stack pool is dynamic and 3-sec-decaying, so it cannot be encoded as a `resource`/`perResource` pool (resources do not decay and would ratchet toward the 50 cap).",
    "⛑ Sea Breeze's DEF ▼ is a FLAT reduction scaled by the CASTER's DEF applied to the boss. The schema has no enemy-DEF-reduction channel (`defPct` is self-scoped and documented inert; `enemy` targets resolve to an empty set for buff effects), so the debuff's damage contribution — which is a TEAM-WIDE lift, not a self buff — is currently uncredited. This UNDER-models mast.",
    "⛑ The skill1 HP<70% branch (Critical Damage ▲ 50.94% to self + 2 highest-final-ATK allies, continuous) is NOT modeled: the sim has no HP pool and no HP-threshold trigger primitive. If a real fight shows it firing, the whole crit-damage buff is missing from every mast comp — this is the single largest known gap in this baseline.",
    "⛑ skill1's trigger is 2 CRITICAL hits with normal attacks; the schema's `hitCount` cannot filter for crits, so count is a crit-rate-derived round count (see flags). It affects only whether the Sea Breeze window is open, not any magnitude.",
    "⛑ skill2 is encoded as a `passive` trigger carrying durationSec 30 to express \"at the start of battle … for 30 sec\". If the engine re-applies passive blocks continuously rather than once at setup, this would become a whole-fight crit-rate buff and OVER-credit the team — verify against a buffApply/expiresFrame read before trusting it.",
    "Storm ticks are left DoT-default non-crit and Full-Burst-by-timing (no `noFb`), per the standing conventions — both are unmeasured for this unit.",
    "The burst Max HP grant is recorded for kit completeness; ally-granted Max HP does not feed a teammate's HP→ATK conversion, so only the self block can ever be offensively live."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⛑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. mast is an SMG/Electric/Supporter/Burst II crit enabler with an enemy-DEF-shred status. skill1 stamps the named status Sea Breeze on the boss off normal-attack crits (status window modeled; the caster-DEF-scaled flat DEF ▼ has no schema channel and is unmodeled), plus an HP-threshold crit-damage branch that the sim cannot express. skill2 is a battle-start 30-sec Critical Rate ▲ 23.56% to self + the 2 highest-final-ATK other allies (split into a self block and an alliesTopAtk/excludeSelf/byFinalAtk block — the schema has no single \"self and N others\" target). The burst repeats that target split for a 7-sec Max HP + Critical Damage grant and adds Storm, a 1-sec-interval 7-tick DoT gated on the Sea Breeze status whose per-tick magnitude scales with the live stack count — shipped as a static stack-count estimate.",
  "hasPierce": false
}
=== 6b. S6-vs-DRIVER OVERRIDE DIFF (key deltas) ===
IDENTICAL: skill2 (critRate 23.56/30s passive self + alliesTopAtk{2,excludeSelf,byFinalAtk}); burst Max HP 86.2% + Crit Damage 25.19% /7s burstCast self + alliesTopAtk; Storm dot durationSec 7 intervalSec 1 requiresTargetStatus 'Sea Breeze'; Sea Breeze DEF▼ unmodeled.
DELTA 1 (S1 HP<70% critDmg 50.94): DRIVER models it (passive always-on, self+2, no expiry). S6 leaves it UNMODELED (flags 'passive=fudge, largest gap'). S5 blind test EXPECTS it present (passive). S2b wanted burstCast-7s.
DELTA 2 (Sea Breeze status trigger): DRIVER=passive always-present targetStatus durationSec 999 (steady-state always-afflicted). S6=hitCount:13 targetStatus durationSec 3 (crit-rate-derived round count). Both open the Storm gate; driver's is always-open (steady state), S6's is hitCount-refreshed.
DELTA 3 (Storm magnitude): DRIVER dot atkPct 226 (=4.52%×50 cap-bind). S6 dot atkPct 22.6 (=4.52%×~5 rotation-weighted). S5 blind reasoned ~14 (=63%/tick). Spread ~10×; all measurement-gated.

=== 7. DRIVER IMPLEMENTATION ===
--- 7a. scripts/tests/units/mast.test.ts ---
// PER-UNIT KIT SPEC — `mast` (Mast, Supporter/SMG/Electric, Burst II, cd 20s). Kit-autonomy
// gauntlet 2026-08-02 (test-first re-derivation). NOTE: this is a FROM-SCRATCH unit — there was
// no shipped override before this gauntlet (simSupported was false), so the harness cannot even
// load her until src/skills/overrides/mast.json exists. The override was authored first (the
// faithful encoding under test); every assertion below PINS a kit line GREEN vs that override and
// RED vs the nearest-wrong counterfactual (withPatchedOverride), so the file still discriminates
// exactly as a verification gauntlet would.
//
// Kit (blablalink prose, data/characters.json → characters.mast.skills), max level:
//   S1 ■ after 2 normal crits → the target: "Sea Breeze" DEF ▼ 1.9% of user DEF, ≤50 stacks, 3s. [M6/unmodeled]
//      ■ HP < 70% → self + 2 highest-final-ATK allies: Critical Damage ▲50.94% continuously.      [M2]
//   S2 ■ start of battle → self + 2 highest-final-ATK allies: Critical Rate ▲23.56% for 30s.      [M1]
//   BU ■ self + 2 highest-final-ATK allies: Max HP ▲86.2% of user Max HP (no heal) for 7s.        [M4]
//      ■ self + 2 highest-final-ATK allies: Critical Damage ▲25.19% for 7s.                       [M3]
//      ■ Sea-Breeze-afflicted target: "Storm" 4.52% of final ATK, mirrors Sea Breeze stacks,
//        every 1s for 7s.                                                                         [M5/M6]
//
// Modeling posture (see the override note + caveats for the full story):
//   * Her identity is the Sea Breeze → Storm STACK-MIRROR loop. There is no crit-count trigger and
//     no enemy-DEF-reduction primitive, so Sea Breeze is modeled at its steady-state 50-stack CAP
//     (mihara-bonding-chain throughput precedent): a passive always-present targetStatus 'Sea
//     Breeze' gates Storm, and Storm is a burstCast DoT at the mirrored magnitude 4.52% × 50 =
//     226% of final ATK per tick (7 ticks/burst). The Sea Breeze DEF▼ EFFECT itself is UNMODELED
//     (~0.16% team damage; no primitive) — documented in unmodeled, NOT asserted here.
//   * "self and 2 ally unit(s) with the highest final ATK (except the skill user)" = a self block +
//     an alliesTopAtk{count:2, excludeSelf, byFinalAtk} block (the soda-twinkling-bunny pattern),
//     so each scoped buff reaches exactly 3 of the 4 units (self + 2 allies), never all 4.
//   * HP<70% is modeled as a passive always-on grant (v1 has no HP pool; a squishy supporter sits
//     below 70% for essentially the whole sustained fight) — ⚑, documented in caveats.
//
// Fixture: a custom B1/B2/B3 chain — liter(B1) / mast(B2) / modernia(B3) / helm(B3), boss Fire,
// focus mast. The standard controlComp ([liter, crown, carry, helm]) CANNOT be used: crown is also
// Burst II and sits earlier in slot order, so she takes the stage-II slot every rotation and mast
// casts ZERO bursts (verified). Here mast is the SOLE Burst II, so she casts every Full Burst
// (10 casts / 180s) and Storm fires. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const FIGHT_FRAMES = 180 * FPS;
const SLUGS = ['liter', 'mast', 'modernia', 'helm'] as const;
/** slot order: liter 0 / mast 1 / modernia 2 / helm 3. */
const MAST = 1;
const N_UNITS = SLUGS.length;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'mast',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mastBuffs = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MAST && b.stat === stat && b.value === value
  );
const stormTicks = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'mast' && e.srcSlot === 'burst'
  );
const mastBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'mast'
  );

/** Distinct targets a buff reached, and the per-application-frame target count. */
function targeting(bs: BuffApply[]): { distinct: number[]; perFrame: number[] } {
  const perFrame = new Map<number, Set<number>>();
  for (const b of bs) {
    (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(
      b.targetIdx
    );
  }
  return {
    distinct: [...new Set(bs.map((b) => b.targetIdx))].sort((a, b) => a - b),
    perFrame: [...perFrame.values()].map((s) => s.size),
  };
}

// ---- counterfactuals (nearest-wrong model each assertion must discriminate against) -----------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** M6 reference: the passive 'Sea Breeze' status removed → Storm's gate never opens. */
const mastNoSeaBreeze = withPatchedOverride('mast', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.kind === 'targetStatus' && e.name === 'Sea Breeze'
      )
  );
  if (ov.skill1.length === before) {
    throw new Error('mast S1 Sea Breeze status missing — fixture is stale');
  }
});
/** M5 counterfactual: Storm at the RAW per-stack value (4.52%), NOT mirrored ×50 (= 226%). */
const mastStormUnmirrored = withPatchedOverride('mast', (ov) => {
  const dot = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'dot');
  if (!dot || dot.atkPct !== 226) {
    throw new Error('mast burst Storm dot (226) missing — fixture is stale');
  }
  dot.atkPct = 4.52;
});
/** M4 reference: the burst Max HP grants removed (proves they move no damage). */
const mastNoMaxHp = withPatchedOverride('mast', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterMaxHpPct'));
  if (ov.burst.length === before) {
    throw new Error('mast burst casterMaxHpPct missing — fixture is stale');
  }
});
/** M2 counterfactual: the S1 Crit Damage scoped to ALL allies (4 targets) instead of self + 2. */
const mastCritDmgAll = withPatchedOverride('mast', (ov) => {
  const blk = ov.skill1.find(
    (b: any) =>
      b.target?.kind === 'alliesTopAtk' && hasStat(b, 'critDamagePct')
  );
  if (!blk) {
    throw new Error('mast S1 scoped critDamage block missing — fixture is stale');
  }
  blk.target = { kind: 'allies' };
});
/** M2 counterfactual: the S1 Crit Damage as a burstCast-gated grant (the S2b reviewer's
 *  self-trigger alternative) — it is ABSENT at frame 0 (before any burst), which the shipped
 *  passive/always-on model forbids. Discriminates the real-game-faithful passive encoding from
 *  the comp-dependent burst-gated one. */
const mastCritDmgBurstGated = withPatchedOverride('mast', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    if (hasStat(b, 'critDamagePct')) {
      b.trigger = { kind: 'burstCast' };
      n++;
    }
  }
  if (!n) {
    throw new Error('mast S1 critDamage blocks missing — fixture is stale');
  }
});
/** M1 counterfactual: the S2 Crit Rate made permanent (no 30s expiry). */
const mastCritRatePermanent = withPatchedOverride('mast', (ov) => {
  let n = 0;
  for (const b of ov.skill2) {
    for (const e of b.effects) {
      if (e.stat === 'critRatePct') {
        delete e.durationSec;
        n++;
      }
    }
  }
  if (!n) {
    throw new Error('mast S2 critRatePct missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noSeaBreeze = run({ mast: mastNoSeaBreeze });
const stormUnmirrored = run({ mast: mastStormUnmirrored });
const noMaxHp = run({ mast: mastNoMaxHp });
const critDmgAll = run({ mast: mastCritDmgAll });
const critDmgBurstGated = run({ mast: mastCritDmgBurstGated });
const critRatePermanent = run({ mast: mastCritRatePermanent });

describe('mast — kit spec', () => {
  it('fixture sanity: mast is the sole Burst II and casts every Full Burst', () => {
    expect(mastBursts(base.events).length).toBeGreaterThanOrEqual(8);
  });

  describe('M1 — S2 Critical Rate ▲23.56% is a 30s fused passive, scoped self + 2 allies', () => {
    const applied = mastBuffs(base.events, 'critRatePct', 23.56);

    it('is 23.56% and reaches exactly 3 of 4 units (self + 2 allies, not the whole team)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const { distinct, perFrame } = targeting(applied);
      expect(distinct).toContain(MAST); // self always included
      expect(distinct.length, 'self + 2 allies, not all 4').toBe(3);
      expect([...new Set(perFrame)]).toEqual([3]);
    });

    it('expires at 30s (a fused passive live from t=0, not permanent)', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(30 * FPS);
      }
      // applied at battle start (frame 0)
      expect(Math.min(...applied.map((b) => b.frame))).toBe(0);
    });

    it('DISCRIMINATING: a permanent (un-expiring) crit rate fails the 30s assertion', () => {
      const perm = mastBuffs(critRatePermanent.events, 'critRatePct', 23.56);
      expect(
        [...new Set(perm.map((b) => b.expiresFrame))],
        'the permanent counterfactual must drop the timed expiry'
      ).toEqual([null]);
    });
  });

  describe('M2 — S1 Critical Damage ▲50.94% (HP<70%) is a passive always-on scoped grant', () => {
    const applied = mastBuffs(base.events, 'critDamagePct', 50.94);

    it('is 50.94% and reaches exactly 3 of 4 units (self + 2 highest-final-ATK allies)', () => {
      expect(applied.length).toBeGreaterThan(0);
      const { distinct, perFrame } = targeting(applied);
      expect(distinct).toContain(MAST);
      expect(distinct.length, 'self + 2 allies, not all 4').toBe(3);
      expect([...new Set(perFrame)]).toEqual([3]);
    });

    it('is live from battle start and continuous (no expiry — "continuously"; HP<70% assumed satisfied)', () => {
      // v1 has no HP pool; a squishy Supporter sits below 70% HP from boss damage essentially the
      // whole fight whether or not she bursts, so the grant is modeled always-on (passive, frame 0).
      expect(Math.min(...applied.map((b) => b.frame))).toBe(0);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: a burstCast-gated grant (the rejected self-trigger alternative) is absent at t=0', () => {
      const gated = mastBuffs(critDmgBurstGated.events, 'critDamagePct', 50.94);
      expect(
        gated.every((b) => b.frame > 0),
        'the burst-gated counterfactual must NOT apply at frame 0'
      ).toBe(true);
    });

    it('DISCRIMINATING: an all-allies grant reaches 4 units, not 3', () => {
      const all = mastBuffs(critDmgAll.events, 'critDamagePct', 50.94);
      const { distinct } = targeting(all);
      expect(distinct.length).toBe(N_UNITS);
    });
  });

  describe('M3 — burst Critical Damage ▲25.19% for 7s, scoped self + 2, once per cast', () => {
    const applied = mastBuffs(base.events, 'critDamagePct', 25.19);
    const bursts = mastBursts(base.events).length;

    it('fires once per burst cast, to exactly 3 units each time', () => {
      expect(applied.length).toBe(bursts * 3);
      const { perFrame } = targeting(applied);
      expect([...new Set(perFrame)]).toEqual([3]);
    });

    it('is 25.19% for 7s (distinct from the S1 50.94% continuous grant)', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([25.19]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(7 * FPS);
      }
    });
  });

  describe('M4 — burst Max HP ▲86.2% (no heal) is faithfully encoded but damage-neutral', () => {
    it('removing the Max HP grants changes NO unit total by a single point', () => {
      // "without restoring HP" + the e3 rule (ally-granted Max HP does not feed a teammate's
      // atkOfMaxHpPct; Mast has no self HP-scaling ATK) ⇒ the grant is offensively inert in v1.
      expect(base.totals).toEqual(noMaxHp.totals);
    });

    it('is still applied as a maxHpFlat grant to self + 2 allies for 7s', () => {
      const applied = buffs(base.events).filter(
        (b) => b.casterIdx === MAST && b.stat === 'maxHpFlat'
      );
      expect(applied.length).toBeGreaterThan(0);
      const { distinct, perFrame } = targeting(applied);
      expect(distinct).toContain(MAST);
      expect(distinct.length).toBe(3);
      expect([...new Set(perFrame)]).toEqual([3]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(7 * FPS);
        expect(b.value).toBeGreaterThan(0); // 86.2% of Mast's Max HP, resolved to flat HP
      }
    });
  });

  describe('M5 — Storm mirrors the Sea Breeze stack count: 4.52% × 50 = 226% per tick, 7 ticks/burst', () => {
    const ticks = stormTicks(base.events);

    it('ticks at the MIRRORED magnitude 226%, in the burst bucket, not the raw 4.52%', () => {
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([226]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('is crit-eligible (DoT damage crits, DOT_CRIT default ON) and never cores', () => {
      expect([...new Set(ticks.map((d) => d.critEligible))]).toEqual([true]);
    });

    it('lands 7 ticks for every burst whose full 7s window fits inside the fight', () => {
      const casts = mastBursts(base.events).filter(
        (c) => c.frame + 7 * FPS <= FIGHT_FRAMES
      );
      expect(casts.length).toBeGreaterThan(0);
      for (const cast of casts) {
        const inWindow = ticks.filter(
          (d) => d.frame > cast.frame && d.frame <= cast.frame + 7 * FPS
        );
        expect(
          inWindow.length,
          `burst at ${(cast.frame / FPS).toFixed(1)}s produced ${inWindow.length} ticks, expected 7`
        ).toBe(7);
      }
    });

    it('DISCRIMINATING: an un-mirrored Storm (raw 4.52%) fails the 226% assertion', () => {
      const raw = stormTicks(stormUnmirrored.events);
      expect(raw.length).toBeGreaterThan(0);
      expect([...new Set(raw.map((d) => d.atkPct))]).toEqual([4.52]);
    });
  });

  describe('M6 — Storm is gated on the Sea Breeze status ("affects Sea-Breeze-afflicted targets")', () => {
    it('fires in the shipped override (Sea Breeze is always present at steady state)', () => {
      expect(stormTicks(base.events).length).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: removing the Sea Breeze status silences Storm entirely', () => {
      // The gate is structurally faithful: it WOULD block Storm if Sea Breeze were down. In steady
      // state the passive status is always up, so this counterfactual (not the shipped model) is
      // what a fight WITHOUT Sea Breeze would look like — zero Storm damage.
      expect(stormTicks(noSeaBreeze.events).length).toBe(0);
    });
  });
});
--- 7b. src/skills/overrides/mast.json ---
{
  "note": "Mast (SMG/Supporter/Electric, Burst II, cd 20s). Kit-autonomy gauntlet 2026-08-02: test-first re-derivation (scripts/tests/units/mast.test.ts, groups M1-M6). Her damage identity is the Sea Breeze -> Storm stack-mirror loop: S1 'Sea Breeze' builds a DEF-reduction stack on the boss (after 2 normal crits, up to 50 stacks, 3s refresh) and her burst 'Storm' mirrors that stack count as damage (4.52% of final ATK per stack, every 1s for 7s). MODELED via the mihara-bonding-chain steady-state-throughput precedent (NOT literal stack tracking — there is no crit-count trigger and no enemy-DEF-reduction primitive): Sea Breeze is assumed at/near its 50-stack cap for the whole sustained fight (SMG fire rate ~24/s with a buffed crit rate refreshes the 3s window continuously; the ~12s opening ramp is folded into the 180s average), so (a) a passive always-present targetStatus 'Sea Breeze' represents the affliction that gates Storm, and (b) Storm is a burstCast DoT at the mirrored cap magnitude 4.52% x 50 = 226% of final ATK per tick, 7 ticks/burst. The Sea Breeze DEF-reduction EFFECT itself (1.9% of Mast's DEF per stack = ~81.7 flat DEF off the 140-DEF scope-lock boss at 50 stacks) is UNMODELED — the engine has no dynamic enemy-DEF-reduction primitive (cfg.bossDef is a fixed per-hit subtraction; damageTakenPct is a separate Damage-Taken bucket); magnitude ~0.16% team damage (81.7 / ~50k effective ATK), a minor secondary effect, not load-bearing. S1 'HP < 70% -> Critical Damage ▲50.94% continuously' is modeled as a passive always-on scoped buff (self + 2 highest-final-ATK allies; no durationSec — 'continuously' = no expiry, the repo convention). v1 has no HP pool, so the HP<70% gate cannot be literally evaluated; a squishy Supporter sits below 70% HP for essentially the entire sustained fight from boss damage REGARDLESS of whether she bursts, so the grant is assumed up for the whole fight. RECONCILED across cross-family roles: the S5 blind test writer (claude-opus-5, prose-only) independently derived passive/always-on; the S2b reviewer (claude-fable-5) proposed a burstCast self-trigger (the burst's un-restoring Max-HP grant drops her HP ratio to 1/1.862 ≈ 53.7% < 70% for 7s) — a clever in-sim mechanism, but REJECTED as the primary encoding because it makes the grant comp-dependent (absent in any comp where mast does not burst, contradicting the real game where boss damage keeps her below 70% whether or not she casts). The burstCast self-trigger is recorded as a measurement-gated ⚑ alternative (see caveats); a Mast-focus recording settles the real uptime. S2 'start of battle -> Critical Rate ▲23.56% for 30s' is a fused passive (live from t=0, expires at 30s — the chisato pattern), scoped self + 2 highest-final-ATK allies. Burst 'Max HP ▲86.2% of the skill user's Max HP without restoring HP, 7s' is casterMaxHpPct (the 'without restoring HP' is naturally satisfied — no heal effect); offensively INERT in v1 (ally-granted Max HP does not feed a teammate's atkOfMaxHpPct conversion, e3 rule; Mast has no self atkOfMaxHpPct line) but faithfully encoded. Burst 'Critical Damage ▲25.19% for 7s' scoped self + 2. 'self and 2 ally unit(s) with the highest final ATK (except the skill user)' is encoded as a self block + an alliesTopAtk{count:2, excludeSelf, byFinalAtk} block per buff (the soda-twinkling-bunny pattern).",
  "unmodeled": {
    "skill1": [
      "Sea Breeze: DEF ▼ 1.9% of the skill user's DEF, stacks up to 50 time(s) and lasts for 3 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: the Sea Breeze DEF-reduction EFFECT is unmodeled — there is no dynamic enemy-DEF-reduction primitive (cfg.bossDef is a fixed per-hit subtraction; damageTakenPct is a separate bucket). At the 50-stack cap it is ~81.7 flat DEF off the 140-DEF scope-lock boss = ~0.16% team damage — a minor secondary effect, not load-bearing. The stack COUNT is captured indirectly: it sets Storm's steady-state mirror magnitude (burst) and the always-present 'Sea Breeze' status gates Storm. Recipe if a primitive lands: a stacking boss-DEF-reduction debuff (1.9% of caster DEF per stack, cap 50, 3s refresh driven by a 2-normal-crit trigger) feeding baseAtk = effectiveAtk - (bossDef - reduction).",
    "skill1: Sea Breeze is modeled as a passive always-present targetStatus (frame 0, 999s) — the kit's 'after 2 normal crits, up to 50 stacks, 3s refresh' accrual/decay is folded into a steady-state always-afflicted assumption (⚑; there is no crit-count trigger to drive discrete accrual). In a sustained fight the boss is afflicted for essentially the whole fight after the ~12s ramp, so Storm's requiresTargetStatus gate is always satisfied (structurally faithful — it WOULD block Storm if Sea Breeze were down — but never blocks in steady state).",
    "skill1: 'Activates when HP falls below 70% -> Critical Damage ▲50.94% continuously' is modeled as a passive always-on grant (no durationSec — 'continuously' = no expiry). v1 has no HP pool, so the gate cannot be literally evaluated; a squishy Supporter sits below 70% HP for essentially the whole sustained fight from boss damage WHETHER OR NOT she bursts, so the grant is assumed up for the whole fight (the pre-first-burst transient of a few seconds above 70% is neglected). CROSS-FAMILY: the S5 blind test writer (claude-opus-5) independently derived this passive/always-on encoding. The S2b reviewer (claude-fable-5) proposed a burstCast SELF-TRIGGER — the burst's un-restoring Max-HP grant (Max HP ▲86.2%, current HP unchanged) drops her HP ratio to 1/1.862 ≈ 53.7% < 70% for the 7s window — which is a real in-sim mechanism; it was REJECTED as primary because it makes the grant comp-dependent (zero uptime in any comp where mast does not burst, contradicting the real game where boss damage keeps her below 70% regardless). ⚑ MEASUREMENT-GATED: the real uptime, and whether the buff latches permanently vs condition-held, settle on a Mast-focus recording; the burstCast-7s window is the literal in-sim reading, passive-always-on is the real-game-faithful reading (this encoding).",
    "burst: Storm is modeled at the 50-stack CAP mirror (4.52% x 50 = 226%/tick, 7 ticks/burst) — the steady-state stack count (⚑ near-cap; the ~12s opening ramp where stacks accrue 0->50 is folded into the 180s average). Refine the stack count on a Mast-focus recording if the sim reads hot/cold. The DoT crits at Mast's sheet rate (DOT_CRIT default ON, U13 2026-07-21 — DoT/function damage crits in NIKKE, confirmed ginmy/maiden footage; the kit need not say so explicitly) and never cores (DoTs are core-ineligible). It is unflavored (plain damage — not sustained/distributed/sequential), so it rides the normal Damage-Up bucket. ENCODING CHOICE: a FIXED steady-state DoT (the mihara-bonding-chain precedent — mihara's Ensnaring/Dragons DoTs are fixed atkPct, NOT perResource). The S2b reviewer proposed a LIVE perResource seaBreeze pool read per tick; that is theoretically sharper (an early burst would mirror fewer stacks) but is NOT faithfully drivable here: the pool would accrue on a 2-normal-CRIT trigger, and the engine's hitCount counts ROUNDS not crits (no crit-count primitive), so any accrual threshold is a crit-rate-dependent ⚑ estimate. The fixed cap-mirror trades that unmodeled ramp for a single documented ⚑ (near-cap steady state), consistent with mihara; the first-burst over-credit is ~1/10 of Storm damage and partially bounded (stacks reach near-cap within the ~12s ramp). STACK-COUNT ⚑ (cross-family): the 50 cap assumes the 3s window REFRESHES on each application (shared timer — applications land every ~0.2s at the SMG fire rate × buffed crit rate, far faster than the 3s expiry, so stacks pile to the cap and bind there; 'stacks up to 50' implies the cap is reachable in normal play, and stack-building is Mast's design identity). The S5 blind writer (claude-opus-5) read 'lasts for 3 sec' as a PER-STACK expiry (each stack dies 3s after it lands), giving a turnover steady state of critRate×fireRate/2×3s ≈ 14 stacks where the cap never binds (Storm ≈ 63%/tick). The two differ ~3.6×; the shared-refresh/cap-bind reading is encoded here as the more standard NIKKE stacking-debuff behaviour, but the magnitude is measurement-gated — a Mast-focus popup read of a Storm tick settles stacks = tick% / 4.52%.",
    "burst: 'Max HP ▲86.2% of the skill user's Max HP without restoring HP' is casterMaxHpPct, offensively inert in v1 (no HP pool; ally-granted Max HP does not feed atkOfMaxHpPct per the e3 rule, and Mast has no self HP-scaling ATK). Encoded for kit completeness; it moves no damage."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "targetStatus", "name": "Sea Breeze", "durationSec": 999 }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "critDamagePct", "value": 50.94 }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "effects": [
        { "kind": "buff", "stat": "critDamagePct", "value": 50.94 }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "critRatePct", "value": 23.56, "durationSec": 30 }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "effects": [
        { "kind": "buff", "stat": "critRatePct", "value": 23.56, "durationSec": 30 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "casterMaxHpPct", "value": 86.2, "durationSec": 7 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "effects": [
        { "kind": "buff", "stat": "casterMaxHpPct", "value": 86.2, "durationSec": 7 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "critDamagePct", "value": 25.19, "durationSec": 7 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": {
        "kind": "alliesTopAtk",
        "count": 2,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "effects": [
        { "kind": "buff", "stat": "critDamagePct", "value": 25.19, "durationSec": 7 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "requiresTargetStatus": "Sea Breeze",
      "effects": [
        { "kind": "dot", "atkPct": 226, "durationSec": 7, "intervalSec": 1 }
      ]
    }
  ]
}
