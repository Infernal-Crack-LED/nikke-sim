# S7 RECONCILING JUDGE PACKET (POST-FIX RE-JUDGMENT) — cinderella-crystal-wave

VARIANT slug `cinderella-crystal-wave` (MG/Attacker/Iron/Burst III, Pilgrim); base counterpart `cinderella` (RL/Electric) is a DIFFERENT unit.

## POST-FIX CONTEXT (read first)

Your PRIOR verdict on this unit (attached in SECTION 8) was **GO @ faithfulness 0.875**, with TWO low-severity board-inert gotchas and explicit suggested fixes. The driver applied BOTH fixes exactly as prescribed:

- **Gotcha 1 (ENCODING, skill2):** set the Snipe-mode 1189.66% FB rider `core: false` (was core:true). The MG 833.79% branch remains `core: true`. Text-faithful, board-inert (MG is modes[0]; graded comps never enter Snipe).
- **Gotcha 2 (FIDELITY, skill1):** re-encoded the every-5s 900% line from the `dot` primitive to the engine `interval` trigger (`trigger:{kind:"interval",sec:5}` + `{kind:"flatDamage",atkPct:900}`, target enemy) — the primitive matching the kit wording, giving function flavor (crit yes / core no / range no / FB by landing timing) and an exact 5s cadence with first fire at t=5s.
  Behavioral verification of the fixes (deterministic): the 900% line now fires 35×/180s, first at frame 300 (t=5.00s), bucket skill, rangeApplied false, coreEligible false, critEligible true, fbMajorApplied both states; MG total moved -0.08% (board-inert). The Snipe rider is now coreEligible false / coreRate 0; MG rider stays coreEligible true / coreRate 0.95. The driver spec grew to 27 assertions (added: first-fire-phase pin, function-flavor pin, mode-split core-flag pin) and is GREEN. The S5 blind test is now **10 passed / 6 skipped / 1 failed** — the interval re-encode flipped the prior flatDamage-vs-dot vocabulary RED to GREEN; the SOLE remaining RED is the documented maxAmmo ⚑ (blind asserts 15, driver ships 1 from the 40-round-expend clamp; the blind test own header flags this kit-internal contradiction; you classified it DOCUMENTED_GAP). Re-judge the FIXED artifacts (SECTIONS 5/6/7 carry the current fixed driver test + override) and return an updated binding verdict + faithfulness score.

============================================================

## SECTION 1 — RECONCILING-JUDGE CONTRACT (return JSON shape)

============================================================

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

============================================================

## SECTION 2 — MECHANICS SSOT

============================================================

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
confirmed) — **EXCEPT `flavor:"true"` (true-damage) dots, which never crit** (owner ruling 2026-07-21:
true damage cannot crit; engine `crit && !trueFlavor` guard; ada's grenade DoT is the case). A dot's
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
ON by default (`DOT_CRIT`, U13 2026-07-21) — but **TRUE DAMAGE NEVER CRITS** (owner ruling 2026-07-21;
engine `crit && !trueFlavor` guard), so `flavor:"true"` dots/flatDamage + `trueNormals` windows are
crit-exempt. Sustained/True/Sequential Damage ▲ buffs gate on hit flavor.
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

============================================================

## SECTION 3 — GROUND TRUTH: kit prose + base stats

============================================================

```json
{
  "name": "Cinderella: Crystal Wave",
  "slug": "cinderella-crystal-wave",
  "weapon": "MG",
  "burst": "III",
  "class": "Attacker",
  "element": "Iron",
  "manufacturer": "Pilgrim",
  "burstCooldownSec": 40,
  "normalAttackMultiplier": 5.57,
  "coreAttackMultiplier": 200,
  "ammo": 300,
  "reloadFrames": 171,
  "chargeFrames": 0,
  "hitsPerShot": 1,
  "skills": {
    "skill1": "■ Activates upon reloading to max ammunition while in the Preparation for Change state. Affects self.\nChanges the weapon in use: Snipe Mode\nCharge Time: 1 sec\nDamage: 62.13% of final ATK\nFull Charge Damage: 250% of damage\nMax Ammunition Capacity: 15 rounds (max ammunition effect refreshes after reloading)\nAdditional Effect 1: Gains Pierce.\nAdditional Effect 2: Activates when performing a Full Charge attack. Expends ammo. Amount: 40 round(s).\nAdditional Effect 3: Charge time is fixed at 1 sec.\nRemoval Condition: Reloading to max ammunition while in the Preparation for Change state.\n■ Activates at the start of battle. Affects self.\nBeauty-Full: Attack Damage ▲ 24% continuously.\n■ Activates upon reloading to max ammunition. Affects self.\nPreparation for Change: Reload time is fixed at 3 sec for 6 sec. Removed upon firing the last bullet.\n■ Activates every 5 sec. Affects the enemy unit nearest to the crosshair.\nDeals 900% of final ATK as damage.\n■ Activates each time total ammo consumed by allies reaches 200. Affects all allies.\nFills Burst Gauge by 12%.",
    "skill2": "■ Activates at the start of battle and when using Burst Skill. Affects self.\nDecoy: Creates an avatar with 70.34% of the skill user's final Max HP. This effect is continuous.\n■ Activates at the start of battle. Affects self.\nATK ▲ 29% continuously.\n■ Activates when Snipe Mode takes effect. Affects self.\nDestroy: Damage to Parts ▲ 26.21% continuously.\nRemoves Pinpoint.\n■ Activates at the start of battle and when Snipe Mode is removed. Affects self.\nPinpoint: Damage dealt when attacking core ▲ 26% continuously.\nRemoves Destroy.\n■ Activates when entering Full Burst after this unit uses her Burst Skill.\nEffect varies according to this unit's current mode. Only one effect is applied.\nActivates while in Snipe Mode. Affects all enemies (including parts).\nEffect 1: Deals 1189.66% of final ATK as damage.\nActivates while not in Snipe Mode. Affects all enemies with activated cores.\nEffect 1: Deals 833.79% of final ATK as core strike damage.",
    "burst": "■ Affects self.\nAttack Damage ▲ 92% for 10 sec.\nATK ▲ 65% for 10 sec.\n■ Affects the enemy with the highest final ATK.\nDeals 6000% of final ATK as Burst Skill damage."
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 75,
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
    "resourceId": 515
  }
}
```

============================================================

## SECTION 4 — S2b CROSS-FAMILY REVIEW (claude-fable-5)

============================================================

```json
{
  "slug": "cinderella-crystal-wave",
  "leakDetected": "Redacted methodology itself is clean, but the appended effect schema leaks this unit's encoding: `pierceModes` comment says \"(CCW: SR only)\", naming this unit's pierce scoping choice. (The `removeOnReload`/`rampSec`/`atkOfMaxHpPct` comments name base `cinderella` — a DIFFERENT unit per slug discipline, not a leak.) I reasoned from the prose anyway; the prose independently supports snipe-scoped pierce.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Changes the weapon in use: Snipe Mode",
      "disposition": "FAITHFUL",
      "scope": "All her shots while the mode is live; swap shot = 62.13% base, SR-style charge weapon, maxAmmo 15",
      "durationSemantics": "Mode-persistent until removal condition (reload-to-max while Preparation held) — NOT durationSec, NOT a timed burst window; magazine refreshes on reload without ending the mode",
      "triggerIdentity": "Reload-to-max GATED on holding 'Preparation for Change' status — i.e. two reload-to-max events inside the 6s status window toggle the mode. Same condition is the Removal Condition, so it is a symmetric toggle, not one-way entry",
      "targetSet": "self",
      "nearestWrongModel": "Snipe Mode active from t=0 (static mode with no entry cost), or entered on ANY single reload-to-max (ungated) — both over-credit snipe uptime and skip the MG ramp-in",
      "distinguishingAssertion": "No damage event with snipe-derived mult (62.13-based) before the first double-reload sequence completes; onEvent shows MG shots (mult from 5.57) in the opening seconds. If the override instead declares a static `modes` selection, assert the mode-entry cost is represented somewhere (⚑) rather than snipe from frame 0",
      "inertness": "Base-MG comps/teammates unmoved; the swap must not alter her buffApply emissions",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge Damage: 250% of damage",
      "disposition": "FAITHFUL",
      "scope": "Snipe-mode full-charge shots only; 'Charge time is fixed at 1 sec' is a CLAMP — charge-speed buffs must not shorten it",
      "durationSemantics": "Permanent property of the mode",
      "triggerIdentity": "Property of the weaponSwap (chargeTimeSec 1, chargeMultPct 250), not a separate trigger",
      "targetSet": "self",
      "nearestWrongModel": "Encoding 250% as additive chargeDamagePct instead of the swap's chargeMultPct ('% of damage' = multiplier on the 62.13% shot); or letting chargeSpeedPct buffs stack onto the fixed 1s",
      "distinguishingAssertion": "Full-charge damage events carry mult ≈ 0.6213×2.5 through the charge bucket; injecting a chargeSpeedPct ally buff via withPatchedOverride does NOT raise snipe shots/sec",
      "inertness": "Charge-speed team buffs are inert on her while the fixed-1s clamp holds",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Additional Effect 1: Gains Pierce.",
      "disposition": "FAITHFUL",
      "scope": "Snipe Mode shots ONLY — it is an additional effect of the swap block",
      "durationSemantics": "While swapped",
      "triggerIdentity": "Rides the weaponSwap (swap-level hasPierce / pierceModes), not a standalone gainPierce",
      "targetSet": "self",
      "nearestWrongModel": "Top-level whole-fight `hasPierce: true` — tags her MG normals as Pierce and feeds Pierce Damage ▲ buckets full-time",
      "distinguishingAssertion": "A patched-in pierceDamagePct buff moves only snipe-window damage, never MG-window damage; MG shots carry no pierce tag",
      "inertness": "MG-mode damage buckets unchanged by any Pierce Damage ▲ source",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Expends ammo. Amount: 40 round(s).",
      "disposition": "FIX",
      "scope": "Fires on each Full Charge attack in Snipe Mode",
      "durationSemantics": "Instant ammo dump per full charge",
      "triggerIdentity": "On full-charge attack, swap-gated; 40 > the 15-round snipe magazine, so whole-picture it clamps to EMPTY → last-bullet fires → forced reload after every full-charge shot. Snipe cadence ≈ 1s charge + reload per shot, not 15 shots per magazine",
      "targetSet": "self",
      "nearestWrongModel": "Ignoring the expend (15 full-charge shots per snipe magazine — ~15× over-credit on snipe throughput), or debiting 40 from the 300-round MG belt",
      "distinguishingAssertion": "In snipe windows, every full-charge damage event is followed by a reload event before the next full-charge event; at most ONE full-charge shot per snipe magazine",
      "inertness": "MG-mode 300-round belt economy untouched",
      "evidenceTier": "CALIBRATED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Beauty-Full: Attack Damage ▲ 24%",
      "disposition": "FAITHFUL",
      "scope": "Generic Damage-Up bucket, all her damage",
      "durationSemantics": "'continuously' = permanent from battle start",
      "triggerIdentity": "passive (start of battle)",
      "targetSet": "self",
      "nearestWrongModel": "Encoded as atkPct 24 (ATK bucket) instead of attackDamagePct (Damage-Up bucket) — dilution/stacking behave differently against her other buffs",
      "distinguishingAssertion": "buffApply {stat:'attackDamagePct', value:24, targetSlug:self} at frame 0 with no expiresFrame; no atkPct:24 self-apply exists",
      "inertness": "Teammates receive nothing from this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Reload time is fixed at 3 sec for 6 sec",
      "disposition": "GAP",
      "scope": "Her own reloads while the status holds; base MG reload is 171f ≈ 2.85s so the clamp is a slight SLOWDOWN, not a speedup",
      "durationSemantics": "6 sec, OR removed early on firing the last bullet — a remove-on-last-bullet condition the buff schema has no flag for (removeOnReload is the opposite edge). Stat CLAMPS are a known missing primitive (asuka-wille precedent in the schema notes)",
      "triggerIdentity": "On reload-to-max (any). The status is ALSO the snipe-entry gate — its 6s window is what makes the double-reload toggle reachable",
      "targetSet": "self",
      "nearestWrongModel": "Modeling it as reloadSpeedPct ▲ (a reload BUFF — it is not), or dropping the status entirely, which silently deletes the snipe-mode entry mechanism",
      "distinguishingAssertion": "A reload starting inside the 6s post-reload window spans ~180 frames regardless of reloadSpeedPct buffs; a reload after the window (or after last-bullet removal) uses 171f",
      "inertness": "Reload-speed team buffs must still apply outside the status window",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Deals 900% of final ATK as damage",
      "disposition": "FAITHFUL",
      "scope": "Skill proc: crits at her sheet rate, NO core (text lacks 'core strike'), takes FB +50% by landing timing (default ON), no range bonus on riders",
      "durationSemantics": "Repeating every 5 sec for the whole fight",
      "triggerIdentity": "interval 5s ('Activates every 5 sec' — a stated interval, not hit-count and not an on-hit rider). Per the first-fire convention an interval trigger first fires at t=CD (5s), not t=0",
      "targetSet": "enemy (nearest crosshair — single-boss moot)",
      "nearestWrongModel": "First proc at t=0 (one extra proc per fight), or core:true, or keying it to shotFired/hitCount so fire-rate changes scale it",
      "distinguishingAssertion": "Damage events with mult 9.0 in her flat-damage bucket at ~t=5s,10s,… (≈35 in 180s, none at t=0); fbMajorApplied true only for procs landing inside FB windows; core contribution zero on these events",
      "inertness": "Proc count invariant to her ammo/fire-rate state (MG vs snipe)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "each time total ammo consumed by allies reaches 200",
      "disposition": "FAITHFUL",
      "scope": "Counts ROUNDS consumed by the whole TEAM (her MG belt dominates); infinite-ammo shots don't consume",
      "durationSemantics": "Repeating threshold — fires on each 200-round crossing of the cumulative team counter",
      "triggerIdentity": "teamAmmo {count:200} → fillGauge 12%. This is a TANDEM/gauge line — never skip as 'utility'",
      "targetSet": "all allies (gauge is team-level: one 12% fill per crossing, not 12% × 5 targets)",
      "nearestWrongModel": "Counting only HER OWN ammo (under-fires when teammates consume), or a per-ally-multiplied fill (5×12% = wildly early FBs), or an interval-based stand-in",
      "distinguishingAssertion": "withPatchedOverride deleting this block delays the first fullBurstStart and reduces total FB count; with the block, fill cadence tracks team rounds consumed, and pausing consumption (reload gaps) pauses procs",
      "inertness": "During any unlimitedAmmo window the counter must NOT advance",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Decoy: Creates an avatar with 70.34%",
      "disposition": "UNMODELED",
      "scope": "Defensive avatar of her own final Max HP; v1 boss deals no damage and there is no decoy HP pool",
      "durationSemantics": "Continuous; refreshed at battle start and on her burst cast",
      "triggerIdentity": "passive + burstCast",
      "targetSet": "self",
      "nearestWrongModel": "Encoding it as a 'shield' effect — that would fire teammate/self 'shielded' triggers and requiresShielded gates that the decoy does not legitimately satisfy",
      "distinguishingAssertion": "No shield events and no shielded-trigger activations attributable to this line anywhere in the event log",
      "inertness": "Zero damage, zero buffApply, zero shield/recovery events; whole board unmoved",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "ATK ▲ 29% continuously",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK bucket (her own ATK)",
      "durationSemantics": "Permanent from battle start",
      "triggerIdentity": "passive",
      "targetSet": "self",
      "nearestWrongModel": "attackDamagePct 29 (bucket swap), or casterAtkPct flat-resolution semantics",
      "distinguishingAssertion": "buffApply {stat:'atkPct', value:29} at frame 0, raw percentage value (not flat-resolved), no expiry",
      "inertness": "Allies receive nothing",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Destroy: Damage to Parts ▲ 26.21%",
      "disposition": "FAITHFUL",
      "scope": "partsDamagePct — direct effect INERT in v1 (partless scope-lock boss). The load-bearing payload of this line is 'Removes Pinpoint'",
      "durationSemantics": "Continuous while Snipe Mode holds",
      "triggerIdentity": "'when Snipe Mode takes effect' — keyed to mode entry, and it strips the Pinpoint buff",
      "targetSet": "self",
      "nearestWrongModel": "Applying Destroy WITHOUT removing Pinpoint — both co-active, so snipe-mode shots keep +26% core damage they should have lost",
      "distinguishingAssertion": "During snipe windows the coreDamagePct:26 buff is ABSENT (core-bucket contribution on snipe core hits excludes it); Destroy and Pinpoint are never simultaneously live",
      "inertness": "partsDamagePct itself must move zero damage on the partless boss",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Pinpoint: core ▲ 26% continuously",
      "disposition": "FAITHFUL",
      "scope": "coreDamagePct — core-hit damage only, never generic",
      "durationSemantics": "Continuous while NOT in Snipe Mode",
      "triggerIdentity": "passive at battle start + re-applies when Snipe Mode is removed; stripped by Destroy on snipe entry",
      "targetSet": "self",
      "nearestWrongModel": "A permanent unconditional passive (never removed) — over-credits every snipe-window core hit; or coreDamagePct misread as critDamagePct",
      "distinguishingAssertion": "buffApply {stat:'coreDamagePct', value:26} at frame 0; core-bucket math on MG-window core hits includes 26, snipe-window core hits exclude it",
      "inertness": "Non-core damage unmoved by this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "entering Full Burst after this unit uses her",
      "disposition": "FAITHFUL",
      "scope": "One flat hit per qualifying FB; branch by CURRENT mode, exactly ONE branch applies. SR branch 1189.66% plain ('including parts' — partless boss ⇒ one hit, no core flag). Non-snipe branch 833.79% with core:true ('core strike damage' — the explicit-core exception)",
      "durationSemantics": "Instant per activation",
      "triggerIdentity": "fullBurstEnter + ownBurstGate:'cast' — the schema's exact primitive for 'entering Full Burst AFTER this unit uses her Burst'. Fires at FB entry (keeps the +50% FB major by timing), but ONLY on rotations she herself burst",
      "targetSet": "all enemies / all enemies with activated cores (single boss ⇒ one target either way)",
      "nearestWrongModel": "Plain ungated fullBurstEnter — fires on EVERY team FB, over-crediting in any comp with a co-Burst-III unit; second-nearest: keying to burstCast, which lands pre-FB and wrongly drops the +50% FB major",
      "distinguishingAssertion": "In a comp with a second Burst III alternating casts, this damage event appears ONLY on FBs her own burstCast opened (match srcSlot + preceding burstCast event) and never on the co-B3's FBs; per activation exactly one of {mult 11.8966 non-core, mult 8.3379 core-bucket} appears, with fbMajorApplied true",
      "inertness": "FBs opened by another Burst III must produce zero events from this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 92% / ATK ▲ 65% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Two distinct buckets: attackDamagePct 92 AND atkPct 65 — keep both, don't merge",
      "durationSemantics": "10 sec each (wall-clock; 'sec' is literal here, no round-count language)",
      "triggerIdentity": "burstCast (her own burst block, self-scoped) — NOT fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter keying — self-buffs fire on teammates' FBs too in a co-B3 comp; or collapsing both lines into one stat",
      "distinguishingAssertion": "Two buffApply events (attackDamagePct:92, atkPct:65) with expiresFrame = castFrame+600, emitted only on rotations where her burstCast event precedes them; none on the co-B3's rotations",
      "inertness": "Allies receive neither buff",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 6000% of final ATK as Burst Skill",
      "disposition": "FAITHFUL",
      "scope": "Burst-bucket flat hit; crits at her sheet rate, NO core; burst-cast damage is FB-EXEMPT (lands before the FB window opens — noFb per the calibrated proc-exemption rule) and gets no range bonus",
      "durationSemantics": "Instant, once per burst cast",
      "triggerIdentity": "burstCast",
      "targetSet": "enemy with highest final ATK (single boss ⇒ moot)",
      "nearestWrongModel": "Applying the +50% Full Burst major to it (fires pre-FB, so that over-credits every cast by 50%); or making it core-eligible",
      "distinguishingAssertion": "Damage event with mult 60.0 at each of her burst casts with fbMajorApplied false and zero core contribution; snapshots her post-cast self-buffs per the unit's cast-timing convention (⚑ verify snapshot order vs the 92/65 self-buffs)",
      "inertness": "Cast count = her burst rotations only, never per-FB",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:snipe-mode-weaponSwap",
    "skill1:full-charge-250-fixed-1s",
    "skill1:pierce-snipe-scoped",
    "skill1:full-charge-expends-40",
    "skill1:beauty-full-attackDamage-24",
    "skill1:preparation-status-machinery",
    "skill1:interval-5s-900pct",
    "skill1:teamAmmo-200-fillGauge-12",
    "skill2:atk-29-passive",
    "skill2:destroy-removes-pinpoint",
    "skill2:pinpoint-core-26-mode-gated",
    "skill2:fb-enter-ownburst-mode-branch-nuke",
    "burst:self-92-65-10s",
    "burst:6000pct-burst-hit"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Preparation for Change: Reload time is fixed at 3 sec for 6 sec. Removed upon firing the last bullet. (if the clamp primitive is absent — the STATUS gate itself must still exist for snipe entry)"
    ],
    "skill2": [
      "Decoy: Creates an avatar with 70.34% of the skill user's final Max HP. This effect is continuous."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in leverage order: (1) The s2 FB-enter mode-branched nuke keyed to plain fullBurstEnter without ownBurstGate:'cast' — the prose says 'after this unit uses her Burst Skill', and in any co-B3 comp the ungated version over-fires; conversely re-keying to burstCast drops the legitimate +50% FB major. This is the single highest-leverage assertion. (2) Whole-fight hasPierce instead of snipe-scoped pierce. (3) Pinpoint (coreDamagePct 26) left permanently on instead of stripped during Snipe Mode by Destroy. (4) The full-charge 'Expends 40 rounds' vs the 15-round snipe magazine — arithmetic contradiction the driver must resolve; the whole-picture reading is clamp-to-empty ⇒ one full-charge shot per snipe magazine with a forced reload, and the resulting snipe shot economy is an ALWAYS-⚑ (weapon-swap shot economy + cadence tuple): flag, don't silently pick. (5) teamAmmo-200 gauge line skipped as 'utility' or counted on own ammo only — it drives FB rotation count. (6) The 900%/5s interval first-firing at t=0 instead of t=5s. (7) The snipe entry/exit state machine (double-reload toggle inside the 6s Preparation window): if the override approximates it with a static `modes` declaration, the approximation and its uptime assumption must be an explicit ⚑, not an implicit snipe-from-t0. Also declare: the effect-schema comment '(CCW: SR only)' on pierceModes leaked this unit's pierce-encoding choice into my packet; my pierce conclusion is independently forced by the prose (Pierce is an Additional Effect of the Snipe Mode swap block), so the review stands, but the packet builder should strip that comment for future runs.",
  "model": "claude-fable-5"
}
```

============================================================

## SECTION 5 — S5 BLIND TEST (claude-opus-5) + result vs FIXED DRIVER override

============================================================

Result of running this blind test against the FIXED driver override: **10 passed / 6 skipped (GAP/UNMODELED it.skip) / 1 failed** (was 9/2 before the fixes — the interval re-encode flipped the flatDamage-vocabulary RED to GREEN).

The SOLE remaining failure: `Snipe Mode maxAmmo` — blind asserts `e.maxAmmo === 15` (literal listed magazine); driver ships `maxAmmo: 1` (Additional Effect 2 expends 40 rounds/full-charge vs the 15-round mag => clamp-to-empty => one shot per reload cycle). The blind test HEADER independently raises this exact kit-internal contradiction as a whole-picture flag; you classified it DOCUMENTED_GAP on the non-validated Snipe path.

The blind test independently CONFIRMS (GREEN vs fixed driver): the ownBurstGate FB-enter rider discrimination (centerpiece), Pinpoint core-26 / Destroy parts-26.21 mode-toggle, Beauty-Full 24 Damage-Up, ATK 29, the every-5s 900% rider (now matched via the interval->flatDamage re-encode: nInterval>0, ~35 procs, no range, FB-by-timing both states), burst self-buffs 92/65 10s per own cast, 6000% nuke FB-exempt, and the teamAmmo gauge channel (live + directional).

```typescript
/**
 * cinderella-crystal-wave — Cinderella: Crystal Wave
 * MG / Iron / Attacker / Burst III, cd 40s, ammo 300, reloadFrames 171 (=2.85s),
 * hitsPerShot 1, normalAttackMultiplier 5.57, coreAttackMultiplier 200.
 *
 * BLIND kit-spec test: written from the kit prose ALONE (no sight of the driver's
 * override, tests or reasoning). One assertion group per kit line.
 *
 * FIXTURE — controlComp(SLUG, true): liter (B1) / crown (B2) / cinderella-crystal-wave (B3)
 * / helm (B3), Fire boss, focus = carry, 180s, deterministic (no seed).
 * helm is kept ON *deliberately*: she is a SECOND Burst III, so some Full Bursts are
 * completed by HER burst rather than CCW's. That is the ONLY way to discriminate the
 * skill2 rider's literal activation text — "when entering Full Burst AFTER THIS UNIT
 * uses her Burst Skill" (ownBurstGate:'cast') — from the nearest-wrong plain
 * fullBurstEnter model, which over-credits every team Full Burst.
 *
 * ATTRIBUTION NOTE. `damage` events are not documented to carry a unit slug, so every
 * cadence/existence claim about a CCW damage line is measured as a COUNT DELTA against a
 * counterfactual run in which ONLY that effect is spliced out. The sim is deterministic and
 * a pure damage removal perturbs nobody else — each such test additionally asserts teammate
 * totals are byte-identical, which validates that premise in-line rather than assuming it.
 *
 * WHOLE-PICTURE FLAGS raised while reading the kit (see the it.skip blocks):
 *   • S1 Snipe Mode sets Max Ammunition to 15 rounds, yet "Additional Effect 2" expends 40
 *     rounds per Full Charge. 40 >= 15, so read literally EVERY full charge empties the
 *     Snipe magazine and forces a reload. Kit-internal contradiction ⚑.
 *   • S1 "Preparation for Change" fixes reload at 3 sec; base reloadFrames 171 = 2.85 sec,
 *     so the "fix" is a slight SLOWDOWN, not a buff. It is also a stat CLAMP — no primitive.
 *   • The Snipe Mode swap has NO time bound in the kit (removal is a CONDITION: reloading to
 *     max ammunition while in Preparation for Change), but weaponSwap.durationSec is
 *     required — so the swap's duty cycle is a ⚑ estimate, not a derivable value.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'cinderella-crystal-wave';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type Ev = Record<string, any>;

// ---------------------------------------------------------------- harness glue

function run(patched?: unknown) {
  const evs: Ev[] = [];
  const opts = controlComp(SLUG, true) as Record<string, any>;
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => evs.push(ev as unknown as Ev),
  };
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  const res = runComp(opts as any);
  return {
    evs,
    tot: totals(res) as Record<string, number>,
    self: (unitOf(res, SLUG) as any).totalDamage as number,
  };
}

/** Read-only view of the committed override (a clone; disk untouched). */
function readOverride(): any {
  return withPatchedOverride(SLUG, () => {}) as any;
}

function findEffects(ov: any, pred: (e: any, b: any) => boolean) {
  const out: { e: any; b: any }[] = [];
  for (const slot of SLOTS) {
    for (const b of ov?.[slot] ?? []) {
      for (const e of b?.effects ?? []) if (pred(e, b)) out.push({ e, b });
    }
  }
  return out;
}

/** Splice matching EFFECTS out of their blocks (surgical — leaves sibling effects alive). */
function dropEffects(ov: any, pred: (e: any, b: any) => boolean): number {
  let n = 0;
  for (const slot of SLOTS) {
    for (const b of ov?.[slot] ?? []) {
      if (!Array.isArray(b?.effects)) continue;
      for (let i = b.effects.length - 1; i >= 0; i--) {
        if (pred(b.effects[i], b)) {
          b.effects.splice(i, 1);
          n++;
        }
      }
    }
  }
  return n;
}

function setBuff(ov: any, stat: string, from: number, to: number): number {
  let n = 0;
  for (const { e } of findEffects(
    ov,
    (e) =>
      e.kind === 'buff' && e.stat === stat && Math.abs(e.value - from) < 1e-6
  )) {
    e.value = to;
    n++;
  }
  return n;
}

// ------------------------------------------------------------ event selectors

const damages = (evs: Ev[]) => evs.filter((e) => e.kind === 'damage');
const slotDamages = (evs: Ev[], slot: string) =>
  damages(evs).filter((e) => e.srcSlot === slot);
const fullBursts = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;
const buffs = (evs: Ev[], stat: string, value?: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(e.value - value) < 1e-6)
  );
const onSelf = (list: Ev[]) => list.filter((e) => e.targetSlug === SLUG);
const others = (t: Record<string, number>) => {
  const o = { ...t };
  delete o[SLUG];
  return o;
};

// ------------------------------------------------------- hoisted runs (11 sims)

const ov = readOverride();
const base = run();

let nBeauty = 0;
const noBeautyFull = run(
  withPatchedOverride(SLUG, (o) => {
    nBeauty = setBuff(o as any, 'attackDamagePct', 24, 0);
  })
);

let nAtk29 = 0;
const noAtk29 = run(
  withPatchedOverride(SLUG, (o) => {
    nAtk29 = setBuff(o as any, 'atkPct', 29, 0);
  })
);

let nPinpoint = 0;
const noPinpoint = run(
  withPatchedOverride(SLUG, (o) => {
    nPinpoint = setBuff(o as any, 'coreDamagePct', 26, 0);
  })
);

let nParts = 0;
const noParts = run(
  withPatchedOverride(SLUG, (o) => {
    nParts = setBuff(o as any, 'partsDamagePct', 26.21, 0);
  })
);

let nInterval = 0;
const noInterval = run(
  withPatchedOverride(SLUG, (o) => {
    nInterval = dropEffects(
      o as any,
      (e) => e.kind === 'flatDamage' && e.atkPct === 900
    );
  })
);

let nNuke = 0;
const noNuke = run(
  withPatchedOverride(SLUG, (o) => {
    nNuke = dropEffects(
      o as any,
      (e) => e.kind === 'flatDamage' && e.atkPct === 6000
    );
  })
);

let nGauge = 0;
const noGauge = run(
  withPatchedOverride(SLUG, (o) => {
    nGauge = dropEffects(o as any, (e) => e.kind === 'fillGauge');
  })
);

let nHyper = 0;
const hyperGauge = run(
  withPatchedOverride(SLUG, (o) => {
    for (const { e, b } of findEffects(
      o as any,
      (x) => x.kind === 'fillGauge'
    )) {
      e.pct = 40;
      if (b.trigger && typeof b.trigger.count === 'number')
        b.trigger.count = 20;
      nHyper++;
    }
  })
);

const isRider = (e: any) =>
  e.kind === 'flatDamage' && (e.atkPct === 1189.66 || e.atkPct === 833.79);

let nRider = 0;
const noRider = run(
  withPatchedOverride(SLUG, (o) => {
    nRider = dropEffects(o as any, isRider);
  })
);

let nUngate = 0;
const ungatedRider = run(
  withPatchedOverride(SLUG, (o) => {
    for (const { b } of findEffects(o as any, isRider)) {
      if (b.ownBurstGate) {
        delete b.ownBurstGate;
        nUngate++;
      }
    }
  })
);

const FB = fullBursts(base.evs);
const riderProcs = damages(base.evs).length - damages(noRider.evs).length;
const ungatedProcs =
  damages(ungatedRider.evs).length - damages(noRider.evs).length;
const nukeProcs = damages(base.evs).length - damages(noNuke.evs).length;
const intervalProcs = damages(base.evs).length - damages(noInterval.evs).length;

// =============================================================================

describe('cinderella-crystal-wave — fixture sanity', () => {
  it('the control comp actually chains Full Bursts (a lone B3 makes ZERO)', () => {
    expect(FB).toBeGreaterThanOrEqual(4);
    expect(base.self).toBeGreaterThan(0);
  });
});

describe('cinderella-crystal-wave — skill1', () => {
  // KIT: "Activates at the start of battle. Affects self. Beauty-Full: Attack Damage ▲ 24%
  // continuously."  Damage-Up bucket, self-scoped, no duration.
  // DISCRIMINATES: RED under the nearest-wrong "ATK ▲24%" (atkPct — a different, larger
  // bucket) and RED under a team-scoped or MISSING encoding.
  it('Beauty-Full: Attack Damage ▲24% is continuous, self-only, Damage-Up (not ATK)', () => {
    expect(nBeauty).toBeGreaterThan(0); // modeled at all
    expect(
      onSelf(buffs(base.evs, 'attackDamagePct', 24)).length
    ).toBeGreaterThanOrEqual(1);
    expect(buffs(base.evs, 'atkPct', 24)).toHaveLength(0); // nearest-wrong: ATK, not Attack Damage
    expect(noBeautyFull.self).toBeLessThan(base.self); // live, not inert
    expect(others(noBeautyFull.tot)).toEqual(others(base.tot)); // self-scope inertness
  });

  // KIT: "Activates every 5 sec. Affects the enemy unit nearest to the crosshair.
  // Deals 900% of final ATK as damage."  Interval trigger, enemy target, function-damage rider.
  // DISCRIMINATES: an interval of 5s over a 180s fight is ~36 procs. RED under a 10s cadence
  // (~18), RED under a fullBurstEnter/burstCast keying (~5-8), RED if MISSING (0).
  // Rider conventions (methodology §9): riders are force-set no-range, and take the Full Burst
  // major by TIMING (default ON) — so RED under a wrong noFb:true or a range-eligible encoding.
  it('every-5-sec 900% rider: ~36 procs / 180s, no +30% range, FB major by timing', () => {
    expect(nInterval).toBeGreaterThan(0);
    expect(intervalProcs).toBeGreaterThanOrEqual(30);
    expect(intervalProcs).toBeLessThanOrEqual(38);

    const s1 = slotDamages(base.evs, 'skill1'); // liter/crown/helm skill1s are pure buffs
    expect(s1.length).toBeGreaterThanOrEqual(30);
    expect(s1.every((e) => e.rangeApplied === false)).toBe(true);
    expect(s1.some((e) => e.fbMajorApplied === true)).toBe(true); // not wrongly noFb'd
    expect(s1.some((e) => e.fbMajorApplied === false)).toBe(true); // non-vacuity: both states hit

    expect(noInterval.self).toBeLessThan(base.self);
    expect(others(noInterval.tot)).toEqual(others(base.tot));
  });

  // KIT: "Activates each time total ammo consumed by allies reaches 200. Affects all allies.
  // Fills Burst Gauge by 12%."  teamAmmo trigger (TEAM ammo, not the owner's), allies target.
  // DISCRIMINATES: the gauge channel must be present AND directional. The hyper variant
  // (threshold 20, 40%) must produce strictly MORE Full Bursts than the removed variant —
  // that is the non-vacuity proof that the fixture is gauge-sensitive at all, so the
  // `noGauge <= base` comparison is a real constraint rather than a tautology.
  it('team-ammo 200 → Burst Gauge +12%: a live, directional gauge channel', () => {
    expect(nGauge).toBeGreaterThan(0);
    expect(nHyper).toBeGreaterThan(0);
    expect(fullBursts(noGauge.evs)).toBeLessThanOrEqual(FB);
    expect(fullBursts(hyperGauge.evs)).toBeGreaterThan(fullBursts(noGauge.evs));
  });

  // KIT: Snipe Mode — "Changes the weapon in use", 62.13% of final ATK, Charge Time 1 sec,
  // Full Charge Damage 250% of damage, Max Ammunition 15, "Additional Effect 1: Gains Pierce."
  // Presence is NOT asserted (the swap's trigger + duration are measurement-gated, see below),
  // but IF a weaponSwap is encoded its magnitudes are pure kit text and must match exactly.
  // The Pierce clause is asserted UNCONDITIONALLY: the kit grants Pierce only INSIDE the Snipe
  // Mode block, so an unconditional whole-fight `hasPierce: true` is the nearest-wrong model —
  // it would tag her MG rounds as Pierce for the entire fight.
  it('Snipe Mode: kit magnitudes exact if encoded; Pierce is never whole-fight', () => {
    const swaps = findEffects(ov, (e) => e.kind === 'weaponSwap');
    for (const { e } of swaps) {
      expect(e.damagePct).toBeCloseTo(62.13, 4);
      expect(e.chargeTimeSec).toBeCloseTo(1, 6);
      expect(e.chargeMultPct).toBeCloseTo(250, 4);
      expect(e.maxAmmo).toBe(15);
    }
    // Pierce must be mode/swap-scoped, never an unconditional whole-fight flag.
    if (ov.hasPierce === true) {
      expect(Array.isArray(ov.pierceModes) && ov.pierceModes.length > 0).toBe(
        true
      );
    }
  });

  it.skip('⚑ GAP: Snipe Mode toggle trigger + duration are not derivable from the kit', () => {
    // Activation is "reloading to max ammunition WHILE IN the Preparation for Change state" and
    // removal is the SAME event — a condition-toggle. No TriggerDef expresses reload-to-max, and
    // weaponSwap.durationSec demands a wall-clock bound the kit never states. The swap's duty
    // cycle (and therefore how much of the fight runs at 62.13%/250% SR damage vs the MG) is a
    // per-unit ⚑ estimate. RECIPE: count Snipe-Mode seconds per 180s from a focus recording.
  });

  it.skip('⚑ CONTRADICTION: Full Charge "Expends ammo. Amount: 40 round(s)" vs a 15-round mag', () => {
    // Snipe Mode caps Max Ammunition at 15, yet each Full Charge expends 40 rounds. Read
    // literally, 40 >= 15 ⇒ every Full Charge empties the belt and forces a reload (consumeAmmo
    // fraction 1). The alternative reading — that the 40 is spent against the base 300-round MG
    // belt (40/300 = 0.1333) — is equally consistent with the text. Not resolvable blind.
  });

  it.skip('GAP: "Preparation for Change: Reload time is fixed at 3 sec for 6 sec"', () => {
    // A stat CLAMP, not a reloadSpeedPct buff — no primitive (engine-modeling-gaps §1b).
    // Whole-picture: base reloadFrames 171 = 2.85s, so "fixed at 3 sec" is a slight SLOWDOWN.
    // "Removed upon firing the last bullet" also has no representation.
  });
});

describe('cinderella-crystal-wave — skill2', () => {
  // KIT: "Activates at the start of battle. Affects self. ATK ▲ 29% continuously."
  // DISCRIMINATES: RED under an attackDamagePct (Damage-Up) mis-bucketing and RED if MISSING.
  it('ATK ▲29% is continuous, self-only, in the ATK bucket (not Damage Up)', () => {
    expect(nAtk29).toBeGreaterThan(0);
    expect(onSelf(buffs(base.evs, 'atkPct', 29)).length).toBeGreaterThanOrEqual(
      1
    );
    expect(buffs(base.evs, 'attackDamagePct', 29)).toHaveLength(0);
    expect(noAtk29.self).toBeLessThan(base.self);
    expect(others(noAtk29.tot)).toEqual(others(base.tot));
  });

  // KIT: "Activates at the start of battle and when Snipe Mode is removed. Affects self.
  // Pinpoint: Damage dealt when attacking core ▲ 26% continuously."
  // SCOPE trap (taxonomy §1): this is CORE-scoped, not generic. A generic attackDamagePct 26
  // would credit every normal hit, not just core hits.
  // NON-VACUITY: the assertion only bites if core hits occur — proven by noPinpoint < base.
  it('Pinpoint: core-scoped ▲26%, live from battle start, self-only', () => {
    expect(nPinpoint).toBeGreaterThan(0);
    expect(
      onSelf(buffs(base.evs, 'coreDamagePct', 26)).length
    ).toBeGreaterThanOrEqual(1);
    expect(buffs(base.evs, 'attackDamagePct', 26)).toHaveLength(0); // nearest-wrong: generic
    expect(noPinpoint.self).toBeLessThan(base.self);
    expect(others(noPinpoint.tot)).toEqual(others(base.tot));
  });

  // KIT: "Destroy: Damage to Parts ▲ 26.21% continuously."
  // The v1 boss is PARTLESS, so partsDamagePct is offensively inert — the whole point of the
  // test is that this line must not leak into a live bucket.
  // DISCRIMINATES: RED if 26.21 shows up as attackDamagePct / coreDamagePct / pierceDamagePct
  // (the nearest-wrong "parts ≈ generic damage" mis-encoding), and RED if a modeled
  // partsDamagePct moves ANY unit's total.
  it('Destroy: parts-scoped ▲26.21% and offensively inert on the partless boss', () => {
    for (const stat of [
      'attackDamagePct',
      'coreDamagePct',
      'pierceDamagePct',
    ]) {
      expect(buffs(base.evs, stat, 26.21)).toHaveLength(0);
    }
    if (nParts > 0) {
      expect(noParts.tot).toEqual(base.tot); // byte-identical, INCLUDING self
    }
  });

  it.skip('GAP: Destroy and Pinpoint mutually remove each other', () => {
    // "Removes Pinpoint" / "Removes Destroy" is a state machine driven entirely by Snipe Mode
    // entry/exit. With the Snipe swap measurement-gated (above), the fixture never enters Snipe,
    // so the ACTIVE and INACTIVE cases of the pair cannot both be exercised — any assertion here
    // would be vacuous. Blind expectation: Pinpoint is live for the whole graded run.
  });

  // KIT: "Activates when entering Full Burst AFTER THIS UNIT uses her Burst Skill. Effect varies
  // according to this unit's current mode. ONLY ONE EFFECT IS APPLIED."
  //   in Snipe Mode      → 1189.66% of final ATK
  //   not in Snipe Mode  →  833.79% as CORE STRIKE damage
  // TRIGGER-IDENTITY trap (taxonomy §3): "entering Full Burst" keeps the block at FB entry (it
  // keeps the +50% FB major and the FB auras, unlike re-keying to burstCast), but the
  // "after THIS UNIT uses her Burst Skill" clause gates it to rotations CCW herself bursts —
  // ownBurstGate:'cast'.
  // DISCRIMINATES: the fixture has TWO Burst III units (CCW + helm), so plain fullBurstEnter
  // over-fires on every helm-completed rotation. `ungatedProcs > riderProcs` is RED under the
  // ungated model and simultaneously proves the gate is non-vacuous here (helm really does
  // complete Full Bursts CCW did not burst into). `riderProcs <= FB` enforces "only one effect
  // is applied" — a both-branches-fire encoding would double up.
  it('FB-enter rider fires ONLY on Full Bursts this unit burst into, one branch only', () => {
    expect(nRider).toBeGreaterThan(0); // the rider is modeled at all
    expect(riderProcs).toBeGreaterThanOrEqual(1); // and it actually fires
    expect(riderProcs).toBeLessThanOrEqual(FB); // "only one effect is applied"
    expect(riderProcs).toBeLessThan(FB); // gated: helm completes >=1 FB without CCW
    expect(nUngate).toBeGreaterThan(0); // an ownBurstGate exists to remove
    expect(ungatedProcs).toBeGreaterThan(riderProcs); // RED under plain fullBurstEnter
    expect(others(noRider.tot)).toEqual(others(base.tot)); // enemy-targeted, teammate-inert
  });

  it.skip('GAP: the 1189.66% Snipe-Mode branch of the FB-enter rider', () => {
    // Unreachable while the Snipe Mode swap is measurement-gated — the fixture never enters
    // Snipe, so only the 833.79% core-strike branch can be exercised. Blind expectation: the
    // 833.79% branch carries core:true ("as core strike damage", the only rider in this kit
    // that earns the core bucket) and the 1189.66% branch does NOT.
  });
});

describe('cinderella-crystal-wave — burst', () => {
  // KIT: "Affects self. Attack Damage ▲ 92% for 10 sec. ATK ▲ 65% for 10 sec."
  // DISCRIMINATES: the two buffs are one block on one cast, so they must be equinumerous and
  // share an expiry frame (both 10s). RED if one is encoded permanent/continuous, RED if the
  // durations diverge, RED if either leaks onto a teammate (the line says "Affects self"),
  // and RED if the cast count is wrong (cd 40s over 180s ⇒ a handful of casts, not one).
  it('burst self-buffs: Attack Damage ▲92% + ATK ▲65%, both 10s, self-only, per own cast', () => {
    const ad = onSelf(buffs(base.evs, 'attackDamagePct', 92));
    const at = onSelf(buffs(base.evs, 'atkPct', 65));

    expect(ad.length).toBeGreaterThanOrEqual(3);
    expect(ad.length).toBeLessThanOrEqual(7);
    expect(at.length).toBe(ad.length); // same block, same cast

    // self-only: nobody else receives either value
    expect(buffs(base.evs, 'attackDamagePct', 92).length).toBe(ad.length);
    expect(buffs(base.evs, 'atkPct', 65).length).toBe(at.length);

    // temporary (10s), not continuous — and the SAME 10s for both
    expect(Number.isFinite(ad[0].expiresFrame)).toBe(true);
    for (let i = 0; i < ad.length; i++)
      expect(at[i].expiresFrame).toBe(ad[i].expiresFrame);
  });

  // KIT: "Affects the enemy with the highest final ATK. Deals 6000% of final ATK as Burst
  // Skill damage."
  // DISCRIMINATES: exactly one proc per own burst cast — cross-checked against the burst
  // self-buff apply count above, so a wrong trigger (e.g. fullBurstEnter, which fires on
  // helm's rotations too) desynchronises the two and goes RED.
  // FB-exemption (methodology §9): burst-cast damage lands BEFORE the Full Burst window opens,
  // so no burst-slot damage event may carry inFullBurst === true.
  it('6000% burst nuke: once per own burst cast, and FB-exempt', () => {
    expect(nNuke).toBeGreaterThan(0);
    const casts = onSelf(buffs(base.evs, 'attackDamagePct', 92)).length;
    expect(nukeProcs).toBe(casts);

    const burstSlot = slotDamages(base.evs, 'burst');
    expect(burstSlot.length).toBeGreaterThanOrEqual(casts);
    expect(burstSlot.every((e) => e.inFullBurst === false)).toBe(true);

    expect(noNuke.self).toBeLessThan(base.self);
    expect(others(noNuke.tot)).toEqual(others(base.tot));
  });
});

describe('cinderella-crystal-wave — unmodeled', () => {
  it.skip('UNMODELED: Decoy — avatar with 70.34% of the skill user\u2019s final Max HP', () => {
    // Defensive/aggro primitive with no engine representation (v1 has no HP pool and the boss
    // deals no damage). No damage channel and no tandem consumer in the kit. Belongs in the
    // override\u2019s `unmodeled.skill2`, never as an `ignored` effect block (validator rejects).
  });
});
```

============================================================

## SECTION 6 — S6 BLIND OVERRIDE (claude-opus-5) + diff vs FIXED DRIVER override

============================================================

After the post-fix corrections, the driver override now AGREES with the blind S6 override on BOTH previously-divergent load-bearing points: (1) the Snipe 1189.66% FB branch is now core:false (blind S6 + fable S2b both derived non-core; driver corrected to match); (2) the every-5s 900% line is now an `interval`-trigger flatDamage (blind S6 used a hitCount proxy and self-flagged it as inferior, asking the judge to adjudicate; driver adopted the named `interval` primitive). Remaining benign divergences: Snipe maxAmmo (driver 1 clamp vs blind 15 literal — the documented contradiction), and the Snipe entry/exit state machine (driver static user-selectable modes vs blind lastBullet+whileSwapped — both approximations flagged; inert on the graded MG path). Convergent load-bearing lines: Beauty-Full attackDamagePct 24; ATK atkPct 29; Pinpoint coreDamagePct 26 (driver mode-gated to MG — MORE faithful than blind unconditional, which blind self-flagged as an over-credit); Destroy partsDamagePct 26.21; FB-enter rider fullBurstEnter + ownBurstGate:cast; MG 833.79 core:true; burst 92/65 10s; 6000% nuke FB-exempt; teamAmmo 200 -> fillGauge 12.

```json
{
  "slug": "cinderella-crystal-wave",
  "hasPierce": false,
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 62.13,
          "chargeTimeSec": 1,
          "chargeMultPct": 250,
          "maxAmmo": 15,
          "weapon": "SR",
          "hasPierce": true,
          "durationSec": 5,
          "maxShots": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 24
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 60
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 900
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "teamAmmo",
        "count": 200
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "fillGauge",
          "pct": 12
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
          "stat": "atkPct",
          "value": 29
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 26.21,
          "whileSwapped": true
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
          "stat": "coreDamagePct",
          "value": 26
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "ownBurstGate": "cast",
      "swapGate": "swapped",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1189.66
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "ownBurstGate": "cast",
      "swapGate": "unswapped",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 833.79,
          "core": true
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
          "stat": "attackDamagePct",
          "value": 92,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 65,
          "durationSec": 10
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
          "kind": "flatDamage",
          "atkPct": 6000,
          "noFb": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Additional Effect 2: Activates when performing a Full Charge attack. Expends ammo. Amount: 40 round(s).",
      "Removal Condition: Reloading to max ammunition while in the Preparation for Change state.",
      "Preparation for Change: Reload time is fixed at 3 sec for 6 sec. Removed upon firing the last bullet."
    ],
    "skill2": [
      "Decoy: Creates an avatar with 70.34% of the skill user's final Max HP. This effect is continuous.",
      "Removes Pinpoint.",
      "Removes Destroy."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ WHOLE-PICTURE CONTRADICTION IN THE KIT TEXT (surfaced, not silently resolved): Snipe Mode's stated Max Ammunition Capacity is 15 rounds, yet a Full Charge attack 'Expends ammo. Amount: 40 round(s)'. 40 > 15, so a single full charge cannot be paid for out of the stated magazine. Two readings: (a) one full charge empties the Snipe magazine and forces the 3 sec fixed reload — i.e. exactly ONE snipe shot per activation (the reading modeled here, via maxShots:1); (b) the 40-round figure is a counter feed for the ammo-consumption economy (the S1 teamAmmo 200 trigger) rather than a magazine debit. Reading (b) would make Snipe Mode multi-shot and would materially raise her share. MUST be settled by watching the ammo counter in Snipe Mode on a recording before any tuning.",
    "⚑ The engine has no reload-time CLAMP primitive (types.ts explicitly excludes 'reload speed is FIXED at x' from durationShots/reloadSpeedPct), so 'Preparation for Change' is unmodeled. Direction of the error is known and small on the base weapon: reloadFrames 171 = 2.85 s, so a 3 s clamp is ~-5% reload speed (a slight LOSS), while it is presumably a large GAIN on the Snipe weapon's own reload. Net sign unknown.",
    "⚑ Pinpoint (coreDamagePct 26) and Destroy (partsDamagePct 26.21) are MUTUALLY EXCLUSIVE in the kit ('Removes Pinpoint' / 'Removes Destroy'). The schema has whileSwapped for Destroy but no 'whileUnswapped' complement, so Pinpoint is authored as an unconditional passive and OVER-CREDITS core damage during the (short) Snipe windows. Partly self-cancelling: partsDamagePct is inert on the partless v1 boss, so this override currently carries Pinpoint's 26% core for 100% of the fight instead of ~90-95%.",
    "⚑ Which skill2 Full-Burst branch fires (1189.66% all-enemies vs 833.79% core-strike) depends entirely on whether she is in Snipe Mode at the FB-entry frame — the kit gives NO timing. Under the model here (one snipe shot per MG magazine, ~1-2 s of a ~15+ s cycle) she is USUALLY NOT swapped, so the 833.79% core branch dominates. If reading (b) above is right, or if the rotation happens to align the swap with FB entry, the 1189.66% branch fires instead — a large swing that is NOT a tuning knob but a timing fact to be read off footage.",
    "⚑ The skill1 900%/5 sec line is encoded as a hitCount proxy, not a true wall-clock timer: the schema exposes no interval/periodic TriggerDef (the block-gate docs enumerate 'fullBurstEnter/hitCount/burstCast/…' with no periodic kind). Consequence: the proxy STALLS while she is in Snipe Mode (charge shots, not MG rounds) and speeds up/slows down with any fire-rate buff, neither of which the real 'every 5 sec' clause would do. A dot{atkPct:900, intervalSec:5, durationSec:fightLength} encoding would reproduce the cadence exactly but would lose RIDERCRIT eligibility (DoT ticks are non-crit by default and DOT_CRIT is gated OFF). Judge should adjudicate which proxy the engine prefers.",
    "hasPierce is deliberately FALSE at the top level — Pierce is granted only inside the Snipe Mode weapon-change block ('Additional Effect 1: Gains Pierce'), so it is carried as weaponSwap.hasPierce (per-shot tag), not as a whole-fight flag."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (S6 cross-family packet); the driver's override, tests, DECISIONS, probe data and board output were NOT consulted. Structure: S1 = a reload-keyed Snipe Mode weapon swap (SR, 1 s fixed charge, 62.13% base × 250% full charge, Pierce) + the always-on Beauty-Full 24% Attack Damage + a 900% periodic hit (hitCount PROXY — no interval trigger exists in the schema) + the teamAmmo-200 → 12% gauge fill for the whole team. S2 = flat 29% ATK, the Destroy/Pinpoint parts-vs-core toggle pair, and the two mutually exclusive FB-entry nukes, both gated ownBurstGate:'cast' because the kit says 'entering Full Burst AFTER this unit uses her Burst Skill' — a bare fullBurstEnter would over-fire in any multi-B3 comp. Burst = 92% Attack Damage + 65% ATK for 10 s on herself plus a 6000% burst-cast nuke marked noFb (burst-cast damage lands before the FB window opens). Three things are load-bearing and unresolved: the 15-round-capacity-vs-40-round-cost contradiction (see caveats), the swap trigger/economy (the schema has no reload-to-max trigger; lastBullet is the proxy), and her MG cadence (which sets the hitCount threshold). Do not read any of the three as calibrated. Unmodeled: the reload-time clamp (no clamp primitive), the Decoy avatar (no HP pool on the v1 boss and it is NOT a shield — encoding it as one would falsely satisfy other kits' requiresShielded gates), and the Destroy/Pinpoint removal clauses."
}
```

============================================================

## SECTION 7 — DRIVER IMPLEMENTATION (FIXED test + override under judgment)

============================================================

### scripts/tests/units/cinderella-crystal-wave.test.ts (27 assertions, GREEN)

```typescript
// PER-UNIT KIT SPEC — `cinderella-crystal-wave` (Cinderella: Crystal Wave, the VARIANT
// MG/Attacker/Iron unit, aka "ccw"/"scindy"; NOT the base RL/Defender/Electric `cinderella`
// "cindy"), Burst III, cd 40s, ammo 300, MG (chargeFrames 0). Kit-autonomy gauntlet
// 2026-07-25 — test-first faithful re-derivation.
//
// One assertion group per KIT LINE (W1..W8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to flip her user-selectable MODE — never to supply
// the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['cinderella-crystal-wave'].skills,
// lvl-10 values):
//   S1 ■ Beauty-Full (battle start) → self: Attack Damage ▲ 24% continuously                 [W1]
//      ■ every 5s → nearest enemy: 900% of final ATK as damage                               [W4]
//      ■ each time total ally ammo consumed reaches 200 → all allies: fill Burst Gauge 12%    [W8]
//      ■ Preparation for Change: reload fixed 3s for 6s, removed on last bullet  (UNMODELED)
//      ■ (Snipe mode) weapon swap: 62.13%/shot, 1s charge, 250% full charge, +Pierce (alt path)
//   S2 ■ (battle start) → self: ATK ▲ 29% continuously                                       [W2]
//      ■ Pinpoint (MG mode) → self: Damage to core ▲ 26% continuously  \  mode toggle        [W3]
//      ■ Destroy (Snipe mode) → self: Damage to Parts ▲ 26.21% continuously  /               [W3]
//      ■ Decoy avatar 70.34% final Max HP, continuous  (UNMODELED — defensive)
//      ■ entering Full Burst AFTER own burst, Snipe mode → all enemies: 1189.66% (alt path)
//      ■ entering Full Burst AFTER own burst, MG mode → cored enemies: 833.79% core strike    [W5]
//   BU ■ self: Attack Damage ▲ 92% + ATK ▲ 65% for 10 sec                                    [W6]
//      ■ highest-final-ATK enemy: 6000% of final ATK as Burst Skill damage                   [W7]
//
// Encoding under test (src/skills/overrides/cinderella-crystal-wave.json):
//   W1 → skill1 passive self buff attackDamagePct 24 (continuous)
//   W2 → skill2 passive self buff atkPct 29 (continuous)
//   W3 → skill2 passive self buff coreDamagePct 26 (mode MG) / partsDamagePct 26.21 (mode Snipe)
//   W4 → skill1 interval(sec 5) enemy flatDamage atkPct 900 (function flavor: crit yes / core no /
//        range no / FB by landing timing; first fire at t=5s). [gauntlet gotcha-2 fix: re-encoded
//        from the `dot` primitive to the engine `interval` trigger that matches the kit wording]
//   W5 → skill2 fullBurstEnter (ownBurstGate:'cast') enemy flatDamage 833.79 core:true (mode MG) /
//        1189.66 core:false (mode Snipe — plain "as damage", not a core strike). [gauntlet gotcha-1
//        fix: Snipe branch core flag corrected to match its text; MG branch stays core strike]
//   W6 → burst burstCast self buff attackDamagePct 92 + atkPct 65 (10s)
//   W7 → burst burstCast enemy flatDamage 6000
//   W8 → skill1 teamAmmo(count 200) allies fillGauge 12%
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   W1  the 24% is a CONTINUOUS passive (null expiry), distinct from her OWN 10s burst Attack
//       Damage 92% (600-frame expiry). Removing it drops her total ~9% — it is live, not inert.
//   W2  same shape as W1 for the 29% ATK passive; removing it drops her total ~13%.
//   W3  the core-vs-parts toggle is MODE-SCOPED: MG runs Pinpoint (coreDamagePct 26, no parts buff)
//       and Snipe runs Destroy (partsDamagePct 26.21, no core buff). The nearest wrong model is an
//       unscoped buff that lands in BOTH modes; proven by flipping the mode (modes reorder) and
//       reading which stat appears. Destroy is inert vs the partless scope-lock boss (removing it in
//       Snipe changes no total), exactly as a Damage-to-Parts stat must be.
//   W4  the 900% hit fires on a 5s TIMER (~35 times/180s), not per burst (6) and not per shot
//       (thousands). Removing it zeroes the skill1 line and drops her total ~20% (it is her single
//       largest skill contributor).
//   W5  the centerpiece. The MG rider is (a) gated to FB entries THIS unit triggered
//       (ownBurstGate:'cast') — it fires 6× (her own casts), where an ungated fullBurstEnter fires
//       12× (every team FB, incl. helm's); (b) a fullBurstEnter trigger, so it takes the +50% FB
//       major (fbMajorApplied true), where a burstCast trigger loses it; (c) core:true, so it is
//       core-eligible (coreRate>0), where core:false is not. Each is a distinct counterfactual the
//       shipped encoding provably beats. (The 2026-07-17 ownBurstGate fix is board-MOVING: she
//       alternates stage-3 with a co-B3, so the gate halves the rider firings.)
//   W6  the burst self-buffs are TIMED (10s = 600 frames, one per cast), distinct from the
//       continuous 24%/29% passives. Count == her burst casts.
//   W7  the 6000% nuke is a burstCast, so it lands BEFORE the FB window and never takes the +50%
//       major (verified fact, 2026-07-13) — the nearest wrong model is a fullBurstEnter nuke.
//   W8  the per-200-ally-ammo 12% gauge fill feeds TEAM burst cadence: removing it drops helm's
//       burst count over the fight (the same teamAmmo mechanism Little Mermaid uses). The gauge
//       primitive emits no damage event, so the observable is the teammate's cast count, plus a
//       structural pin of the block itself.
//
// UNMODELED (inert; documented here + override unmodeled, deliberately no assertion):
//   - Preparation for Change reload bookkeeping (reload fixed 3s for 6s) — reload timing only.
//   - Decoy avatar (70.34% final Max HP) — defensive/aggro; the v1 boss deals no damage.
//   - Pierce (Snipe mode) — inert vs the partless boss.
//   ⚑ Snipe weapon-swap magazine is modeled as 1 round (Additional Effect 2 expends 40 rounds per
//   full-charge shot vs the listed 15-round mag → one shot per reload cycle); if the 40-round expend
//   draws from a separate pool, maxAmmo should be 15. Flagged in the override note; the Snipe path is
//   the non-validated alternate (graded sample is MG, core 100%).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ccw B3 [focus] / helm B3, boss
// Fire, boss core 100% exposed). ccw needs a real rotation to cast her burst (a lone B3 makes zero
// Full Bursts); two B3s (ccw + helm) alternate, giving her six casts over 180s and — critically for
// W5 — six FB entries she triggered AND six helm triggered, so the ownBurstGate has something to
// gate against. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'cinderella-crystal-wave';
/** controlComp slot order: liter 0 / crown 1 / ccw 2 / helm 3. */
const CCW = 2;
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / nearest-wrong patches ---------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
/** The MG-mode FB rider block (fullBurstEnter + flatDamage 833.79). */
const mgRiderBlock = (ov: any) => {
  const blk = ov.skill2.find(
    (b: any) =>
      b.mode === 'MG' && b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!blk) throw new Error('ccw MG FB rider block missing — fixture is stale');
  return blk;
};

/** W1 reference: Beauty-Full (Attack Damage 24%) removed. */
const noBeauty = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'attackDamagePct'));
  if (ov.skill1.length === before)
    throw new Error('ccw Beauty-Full block missing — fixture is stale');
});
/** W2 reference: ATK 29% passive removed. */
const noAtk29 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill2.length === before)
    throw new Error('ccw ATK 29% block missing — fixture is stale');
});
/** W3 reference: Pinpoint (coreDamagePct 26) removed. */
const noPinpoint = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'coreDamagePct'));
  if (ov.skill2.length === before)
    throw new Error('ccw Pinpoint block missing — fixture is stale');
});
/** W3 mode flip: Snipe becomes the default mode (modes[0]). */
const snipeMode = withPatchedOverride(SLUG, (ov) => {
  if (!Array.isArray(ov.modes) || !ov.modes.includes('Snipe'))
    throw new Error('ccw modes list missing Snipe — fixture is stale');
  ov.modes = ['Snipe', 'MG'];
});
/** W3 Snipe + Destroy removed (to prove Destroy is inert vs the partless boss). */
const snipeNoParts = withPatchedOverride(SLUG, (ov) => {
  ov.modes = ['Snipe', 'MG'];
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'partsDamagePct'));
  if (ov.skill2.length === before)
    throw new Error('ccw Destroy block missing — fixture is stale');
});
/** W4 reference: the every-5s 900% interval line removed (engine `interval` trigger + flatDamage). */
const noInterval = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'interval');
  if (ov.skill1.length === before)
    throw new Error('ccw 900% interval block missing — fixture is stale');
});
/** W5 reference: the MG FB rider removed entirely. */
const noRider = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !(b.mode === 'MG' && b.effects.some((e: any) => e.kind === 'flatDamage'))
  );
  if (ov.skill2.length === before)
    throw new Error('ccw MG FB rider block missing — fixture is stale');
});
/** W5b counterfactual: rider present but UNGATED (ownBurstGate removed → fires on every team FB). */
const ungatedRider = withPatchedOverride(SLUG, (ov) => {
  const blk = mgRiderBlock(ov);
  if (!blk.ownBurstGate)
    throw new Error('ccw MG rider ownBurstGate missing — fixture is stale');
  delete blk.ownBurstGate;
});
/** W5c counterfactual: rider re-triggered to burstCast (lands before FB → loses the +50% major). */
const burstCastRider = withPatchedOverride(SLUG, (ov) => {
  const blk = mgRiderBlock(ov);
  if (blk.trigger?.kind !== 'fullBurstEnter')
    throw new Error(
      'ccw MG rider trigger is not fullBurstEnter — fixture is stale'
    );
  blk.trigger.kind = 'burstCast';
});
/** W5d counterfactual: rider core flag cleared (loses the core bucket). */
const noCoreRider = withPatchedOverride(SLUG, (ov) => {
  const blk = mgRiderBlock(ov);
  const e = blk.effects.find((x: any) => x.kind === 'flatDamage');
  if (e.core !== true)
    throw new Error('ccw MG rider core flag is not true — fixture is stale');
  e.core = false;
});
/** W8 reference: the teamAmmo gauge-fill block removed. */
const noTeamAmmo = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'teamAmmo');
  if (ov.skill1.length === before)
    throw new Error('ccw teamAmmo block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const beauty = run({ [SLUG]: noBeauty });
const atk29 = run({ [SLUG]: noAtk29 });
const pinpoint = run({ [SLUG]: noPinpoint });
const snipe = run({ [SLUG]: snipeMode });
const snipeParts = run({ [SLUG]: snipeNoParts });
const intervalRun = run({ [SLUG]: noInterval });
const rider = run({ [SLUG]: noRider });
const ungated = run({ [SLUG]: ungatedRider });
const burstCast = run({ [SLUG]: burstCastRider });
const noCore = run({ [SLUG]: noCoreRider });
const teamAmmo = run({ [SLUG]: noTeamAmmo });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const ccwDamage = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === SLUG);
const ccwBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const helmBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'helm'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ccwBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === CCW && b.stat === stat);

/** The MG FB core-strike rider (skill2 flatDamage 833.79), in frame order. */
const mgRider = (evs: SimEvent[]) =>
  ccwDamage(evs)
    .filter((d) => d.srcSlot === 'skill2' && d.atkPct === 833.79)
    .sort((a, b) => a.frame - b.frame);
/** The Snipe FB rider (skill2 flatDamage 1189.66). */
const snipeRider = (evs: SimEvent[]) =>
  ccwDamage(evs).filter((d) => d.srcSlot === 'skill2' && d.atkPct === 1189.66);
/** The 6000% burst nuke. */
const nukes = (evs: SimEvent[]) =>
  ccwDamage(evs).filter((d) => d.srcSlot === 'burst' && d.atkPct === 6000);
/** The every-5s 900% crosshair interval hit (engine `interval` trigger + flatDamage). */
const intervalHits = (evs: SimEvent[]) =>
  ccwDamage(evs)
    .filter((d) => d.srcSlot === 'skill1' && d.atkPct === 900)
    .sort((a, b) => a.frame - b.frame);

describe('cinderella-crystal-wave — kit spec', () => {
  describe('W1 — S1 Beauty-Full: Attack Damage ▲ 24% continuous, self', () => {
    const applied = ccwBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 24
    );

    it('is a self-scoped, always-on (continuous) 24% buff', () => {
      expect(
        applied.length,
        'no Beauty-Full 24% buff was applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([24]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'must be self-scoped'
      ).toEqual([CCW]);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        'Beauty-Full is continuous — no wall-clock expiry'
      ).toEqual([null]);
    });

    it('DISCRIMINATING: removing it drops her total (live, not inert)', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(beauty.totals[SLUG]);
    });
  });

  describe('W2 — S2 ATK ▲ 29% continuous, self', () => {
    const applied = ccwBuffs(base.events, 'atkPct').filter(
      (b) => b.value === 29
    );

    it('is a self-scoped, always-on (continuous) 29% buff', () => {
      expect(applied.length, 'no ATK 29% buff was applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([29]);
      expect(
        [...new Set(applied.map((b) => b.targetIdx))],
        'must be self-scoped'
      ).toEqual([CCW]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('DISCRIMINATING: removing it drops her total (live, not inert)', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(atk29.totals[SLUG]);
    });
  });

  describe('W3 — S2 core-vs-parts toggle is MODE-SCOPED (Pinpoint MG / Destroy Snipe)', () => {
    it('MG mode: Pinpoint coreDamagePct 26 active, Destroy partsDamagePct absent', () => {
      const core = ccwBuffs(base.events, 'coreDamagePct');
      expect([...new Set(core.map((b) => b.value))]).toEqual([26]);
      expect([...new Set(core.map((b) => b.targetIdx))]).toEqual([CCW]);
      expect([...new Set(core.map((b) => b.expiresFrame))]).toEqual([null]);
      expect(
        ccwBuffs(base.events, 'partsDamagePct'),
        'Destroy must NOT apply in MG mode'
      ).toEqual([]);
    });

    it('Snipe mode: Destroy partsDamagePct 26.21 active, Pinpoint coreDamagePct absent', () => {
      const parts = ccwBuffs(snipe.events, 'partsDamagePct');
      expect([...new Set(parts.map((b) => b.value))]).toEqual([26.21]);
      expect([...new Set(parts.map((b) => b.targetIdx))]).toEqual([CCW]);
      expect(
        ccwBuffs(snipe.events, 'coreDamagePct'),
        'Pinpoint must NOT apply in Snipe mode'
      ).toEqual([]);
    });

    it('the mode flip swaps the FB rider too (MG 833.79 → Snipe 1189.66)', () => {
      expect(mgRider(base.events).length).toBeGreaterThan(0);
      expect(snipeRider(base.events)).toEqual([]);
      expect(snipeRider(snipe.events).length).toBeGreaterThan(0);
      expect(mgRider(snipe.events)).toEqual([]);
    });

    it('the FB rider core flag is mode-split: MG core strike (core) vs Snipe plain damage (non-core)', () => {
      // Kit text: the MG branch deals "833.79% ... as CORE STRIKE damage" (core-eligible); the Snipe
      // branch deals "1189.66% ... as damage" to "all enemies (including parts)" — plain, NOT core
      // strike. Function/skill damage is core-ineligible unless the text explicitly labels it core
      // (damage-calculation §1b/§2b). Gauntlet gotcha-1 fix pinned here (two blind roles + formula).
      expect(
        mgRider(base.events).every((d) => d.coreEligible),
        'MG branch is a core strike'
      ).toBe(true);
      expect(
        snipeRider(snipe.events).every((d) => !d.coreEligible),
        'Snipe branch is plain damage — never core'
      ).toBe(true);
    });

    it('Snipe mode swaps the weapon to 62.13%/shot (the alt weapon-swap path)', () => {
      const norm = ccwDamage(snipe.events).filter(
        (d) => d.srcSlot === 'normal'
      );
      expect([...new Set(norm.map((d) => d.atkPct))]).toEqual([62.13]);
      // MG normal shots are the datamined 5.57% MG round, NOT the snipe round.
      const mgNorm = ccwDamage(base.events).filter(
        (d) => d.srcSlot === 'normal'
      );
      expect([...new Set(mgNorm.map((d) => d.atkPct))]).toEqual([5.57]);
    });

    it('DISCRIMINATING: removing Pinpoint (MG) drops her core-hit total', () => {
      expect(base.totals[SLUG]).toBeGreaterThan(pinpoint.totals[SLUG]);
    });

    it('Destroy is INERT vs the partless boss (removing it in Snipe changes no total)', () => {
      expect(snipe.totals).toEqual(snipeParts.totals);
    });
  });

  describe('W4 — S1 every-5s 900% crosshair hit (interval trigger; function flavor)', () => {
    it('fires on a ~5s cadence (~35×/180s) at the kit magnitude, in the skill bucket', () => {
      const ds = intervalHits(base.events);
      expect([...new Set(ds.map((d) => d.atkPct))]).toEqual([900]);
      expect([...new Set(ds.map((d) => d.bucket))]).toEqual(['skill']);
      expect(
        ds.length,
        `${ds.length} firings — a 5s timer lands ~35×/180s; per-burst would be ~6, per-shot thousands`
      ).toBeGreaterThanOrEqual(30);
      expect(ds.length).toBeLessThanOrEqual(40);
    });

    it('first fires at t=5s (the interval first-fire convention), NOT t=0', () => {
      // Discriminates the nearest-wrong "one extra proc at t=0": the engine `interval` trigger
      // fires first at t=sec. Pinning the first firing frame to 5s (not 0) gates that phase.
      const ds = intervalHits(base.events);
      expect(
        ds[0].frame,
        'first firing must be at t=5s (frame 300), not t=0'
      ).toBe(5 * FPS);
    });

    it('is FUNCTION-type damage: crit-eligible, never core, no range, FB major by timing only', () => {
      const ds = intervalHits(base.events);
      expect(
        ds.every((d) => d.critEligible),
        'function damage crits at her sheet rate'
      ).toBe(true);
      expect(
        ds.every((d) => !d.coreEligible),
        'function damage is never core'
      ).toBe(true);
      expect(
        ds.every((d) => !d.rangeApplied),
        'riders carry no range bonus'
      ).toBe(true);
      // FB by landing timing: procs inside an FB window take the +50%, those outside do not —
      // both states appear over a 180s fight (it is NOT wrongly noFb'd, nor always-on).
      expect(ds.some((d) => d.fbMajorApplied)).toBe(true);
      expect(ds.some((d) => !d.fbMajorApplied)).toBe(true);
    });

    it('DISCRIMINATING: removing it zeroes the skill1 line and drops her total', () => {
      expect(intervalHits(intervalRun.events)).toEqual([]);
      expect(base.totals[SLUG]).toBeGreaterThan(intervalRun.totals[SLUG]);
    });
  });

  describe('W5 — S2 MG FB rider: 833.79% core strike, own-burst-gated, fullBurstEnter, core:true', () => {
    it('lands at the kit magnitude in the skill bucket (srcSlot skill2)', () => {
      const rs = mgRider(base.events);
      expect(rs.length).toBeGreaterThan(0);
      expect([...new Set(rs.map((d) => d.atkPct))]).toEqual([833.79]);
      expect([...new Set(rs.map((d) => d.bucket))]).toEqual(['skill']);
      expect([...new Set(rs.map((d) => d.srcSlot))]).toEqual(['skill2']);
    });

    it('OWN-BURST-GATED: fires once per FB entry THIS unit triggered (== her casts, not all FBs)', () => {
      const own = ccwBursts(base.events).length;
      const teamFb = own + helmBursts(base.events).length;
      const rs = mgRider(base.events).length;
      expect(rs, 'rider must fire exactly on her own FB entries').toBe(own);
      expect(
        teamFb,
        'fixture must have co-B3 FB entries to gate against'
      ).toBeGreaterThan(own);
    });

    it('DISCRIMINATING (gate): an ungated fullBurstEnter over-fires on every team FB', () => {
      const gated = mgRider(base.events).length;
      const ungatedCount = mgRider(ungated.events).length;
      expect(
        ungatedCount,
        `${ungatedCount} ungated vs ${gated} gated — ungated fires on helm's FB entries too`
      ).toBeGreaterThan(gated);
      expect(ungatedCount).toBe(
        ccwBursts(ungated.events).length + helmBursts(ungated.events).length
      );
    });

    it('DISCRIMINATING (trigger): fullBurstEnter takes the +50% FB major; burstCast loses it', () => {
      expect(mgRider(base.events).every((d) => d.fbMajorApplied)).toBe(true);
      expect(mgRider(burstCast.events).every((d) => !d.fbMajorApplied)).toBe(
        true
      );
    });

    it('DISCRIMINATING (core): core:true is core-eligible (coreRate>0); core:false is not', () => {
      const rs = mgRider(base.events);
      expect(rs.every((d) => d.coreEligible)).toBe(true);
      expect(rs.every((d) => d.coreRate > 0)).toBe(true);
      expect(mgRider(noCore.events).every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING (reference): removing the rider zeroes the line and drops her total', () => {
      expect(mgRider(rider.events)).toEqual([]);
      expect(base.totals[SLUG]).toBeGreaterThan(rider.totals[SLUG]);
    });
  });

  describe('W6 — burst self-buffs: Attack Damage ▲ 92% + ATK ▲ 65% for 10s, one per cast', () => {
    const ad = ccwBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 92
    );
    const atk = ccwBuffs(base.events, 'atkPct').filter((b) => b.value === 65);

    it('fire once per burst cast, self-scoped, for exactly 10 sec (timed, not continuous)', () => {
      const casts = ccwBursts(base.events).length;
      expect(ad.length, 'one 92% Attack Damage buff per cast').toBe(casts);
      expect(atk.length, 'one 65% ATK buff per cast').toBe(casts);
      for (const b of [...ad, ...atk]) {
        expect(b.targetIdx).toBe(CCW);
        expect(b.expiresFrame! - b.frame, 'must be a 10s timed buff').toBe(
          10 * FPS
        );
      }
    });

    it('DISCRIMINATING: the 92/65 buffs are TIMED, distinct from the continuous 24/29 passives', () => {
      // The continuous passives carry null expiry; the burst buffs carry a 600-frame expiry. A
      // continuous encoding of the burst buff would show null here.
      expect([...new Set(ad.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        10 * FPS,
      ]);
    });
  });

  describe('W7 — burst nuke: 6000% of final ATK, cast BEFORE the Full Burst window', () => {
    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const nk = nukes(base.events);
      expect(nk.length).toBe(ccwBursts(base.events).length);
      expect(nk.length).toBeGreaterThan(0);
      expect([...new Set(nk.map((d) => d.atkPct))]).toEqual([6000]);
      expect([...new Set(nk.map((d) => d.bucket))]).toEqual(['burst']);
      expect([...new Set(nk.map((d) => d.srcSlot))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes(base.events).filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });
  });

  describe('W8 — S1 teamAmmo: per-200 ally ammo → all allies fill Burst Gauge 12%', () => {
    it("feeds TEAM burst cadence: removing it drops a teammate's burst count", () => {
      // The gauge primitive emits no damage event, so the observable is the teammate's cast count:
      // ccw's per-200-ally-ammo 12% fill advances helm's bursts over the fight.
      expect(
        helmBursts(base.events).length,
        "ccw's teamAmmo fill must advance helm's burst cadence"
      ).toBeGreaterThan(helmBursts(teamAmmo.events).length);
    });

    it('is encoded as a teamAmmo(count 200) → fillGauge 12% block targeting allies', () => {
      const ov: any = withPatchedOverride(SLUG, () => {});
      const blk = ov.skill1.find((b: any) => b.trigger?.kind === 'teamAmmo');
      expect(blk, 'teamAmmo block must exist').toBeTruthy();
      expect(blk.trigger.count).toBe(200);
      expect(blk.target.kind).toBe('allies');
      const fill = blk.effects.find((e: any) => e.kind === 'fillGauge');
      expect(fill?.pct).toBe(12);
    });
  });
});
```

### src/skills/overrides/cinderella-crystal-wave.json (FIXED shipped override)

```json
{
  "note": "RE-TUNED 2026-07-16 (Fable-approved, kit-parse blind parser out-predicted the prior HT ~13% cold): her FB-enter proc text says \"as CORE STRIKE damage\" and activates ON entering Full Burst — the prior model wrongly set trigger=burstCast (fires PRE-FB, loses the +50%) AND dropped core:true. Restored to text-faithful (fullBurstEnter trigger + core:true, both modes). Single-variable test: T5 0.877->0.99, T8 0.868->1.02 vs real. Overturns the 2026-07-13 U1 over-broad no-core ruling for THIS rider (text explicitly labels core strike). --- User-selectable mode (100% uptime for the chosen mode): MG (default - matches the user's validated real solo-raid sample at core 100%) or Snipe. SNIPE: permanent weapon swap (62.13%/shot, 1s charge, 250% full charge). Magazine modeled as 1 round because Additional Effect 2 expends 40 rounds per full-charge shot vs the listed 15-round mag -> one shot per reload cycle (~3.9s/shot); if the 40-round expend actually draws from a separate pool, maxAmmo should be 15 instead (flagged ambiguity). Snipe also carries Destroy (Damage to Parts +26.21%, inert in v1) and the 1189.66% Full-Burst rider. MG: Pinpoint (core damage +26%, matters when core-rate > 0) and the 833.79% core-strike rider (direct core hit -> receives the core bucket, scaled by core-rate; vs a coreless boss it contributes nothing extra). Mode-independent: Beauty-Full (Attack Damage +24% always), ATK +29% always, and the every-5s 900% crosshair hit. Preparation for Change: the per-200-ally-ammo 12% burst-gauge fill is NOW MODELED (2026-07-15) via a teamAmmo trigger (count 200 -> fillGauge 12%, target allies) -- the exact same team-ammo mechanism Little Mermaid uses (count 400 -> 37%); it was wrongly skipped before as 'team ammo not trackable', but teamAmmo IS trackable. This feeds team burst cadence in her comps. Skipped: Preparation for Change reload bookkeeping (reload uses her normal reload time), Decoy (defensive), Pierce (inert). Burst slot left to the parser (Attack Damage 92% + ATK 65% for 10s + 6000% nuke). U1 RULE FIX 2026-07-13: the 833.79% core-strike rider procs ON core hits but, as function-type additional damage, does NOT receive the core damage bucket (datamined rule: procs crit, never core, never range) — core flag removed; was contributing to her 1.16-1.30 heat. [materialized 2026-07-16: burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified]. --- [2026-07-17 OWN-BURST-GATED FB RIDER] Both FB-enter riders (Snipe 1189.66% / MG 833.79% core-strike) now carry `ownBurstGate: 'cast'` — her kit text is explicit: \"Activates when entering Full Burst AFTER this unit uses her Burst Skill.\" The prior plain `fullBurstEnter` over-fired the rider on EVERY team full burst, including ones a DIFFERENT B3 completed (theme 9 / engine ranked fix #4). The kit-status finding assumed 'sole-B3 → graded movement ZERO' — that premise was WRONG (she alternates stage-3 with a co-B3 in BOTH graded comps: Liberalio in T5, Rapi:RH in T8), so the gate is board-MOVING and it IMPROVES the fit: T8 iron-weak 1.062 HOT → 1.001 (the over-fire was masking a multi-B3 over-credit), T5 wind-weak 1.009 → 0.978 (both now within ±3%; board MAD 0.036 → ~0.012). Kept at FB-entry (NOT re-keyed to burstCast) so the MG core-strike rider still receives the +50% FB major. Engine gate: sim.ts applyBlock `block.ownBurstGate` vs rotationCasters; capability is inert until an override opts in. --- [KIT-AUTONOMY GAUNTLET 2026-07-25] Cross-family corroborated (S2b claude-fable-5 converged on all 14 load-bearing lines; S5/S6/S7 claude-opus-5). The validated MG path (graded comps, core 100%) is fully faithful: Beauty-Full attackDamagePct 24, ATK atkPct 29, Pinpoint coreDamagePct 26 (MG) / Destroy partsDamagePct 26.21 (Snipe) mode-toggle with Destroy-removes-Pinpoint, 900%/5s interval dot, teamAmmo-200 -> fillGauge-12% team cadence, burst self-buffs 92/65 for 10s (burstCast self), 6000% burstCast nuke (FB-exempt, no core), and the MG FB-enter rider 833.79% core-strike with ownBurstGate:cast + fullBurstEnter (keeps the +50% FB major) + core:true -- the highest-leverage line, pinned at 6 firings (her own casts) vs 12 for an ungated fullBurstEnter (every team FB incl. the co-B3). Three flags, ALL confined to the NON-validated Snipe alternate path (graded sample is MG; board impact ~0): [FLAG 1] (Snipe FB rider core flag, tier 2): the Snipe-mode 1189.66% FB rider carries core:true, but its kit text (Deals 1189.66% of final ATK as damage; Affects all enemies including parts) reads as PLAIN damage -- only the MG 833.79% branch explicitly says as core strike damage. Estimate: if the Snipe branch is non-core it loses the core bucket on ~95%-core-rate hits (its core contribution ~ current core mult - 1). Recipe: set the Snipe skill2 rider core:false to match the as-damage text (MG branch stays core:true). Needs owner/e3 confirmation of whether the Snipe FB nuke cores. [FLAG 2] (Snipe entry/exit state machine, tier 2): the kit enters/exits Snipe Mode via a double-reload-to-max inside the 6s Preparation-for-Change window (a state machine), approximated here as a static user-selectable modes declaration with 100% uptime for the chosen mode. Estimate: real Snipe has MG ramp-in/out segments, so 100% Snipe uptime slightly over-credits the Snipe path; the graded MG path is exact (she stays in MG). Recipe: model the Preparation-status reload-toggle if a reload-clamp/status primitive lands. [FLAG 3] (Snipe magazine, tier 2, pre-existing): maxAmmo modeled as 1 (Additional Effect 2 expends 40 rounds per full-charge shot vs the listed 15-round mag -> clamp-to-empty -> one shot per reload cycle); if the 40-round expend draws from a separate pool, maxAmmo should be 15. Kit-autonomy gauntlet 2026-07-25.",
  "modes": ["MG", "Snipe"],
  "pierceModes": ["Snipe"],
  "unmodeled": {
    "skill1": [
      "Activates when reloading to max ammunition capacity. Affects self. Preparation for Change: Reloading Time changes to fixed 3 sec for 6 sec. (Removed when the last bullet is fired.)"
    ],
    "skill2": [
      "Activates at the start of battle and when using Burst Skill. Affects self. Creates a Decoy avatar with 70.34% of the caster's Max HP, continuously."
    ],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "mode": "Snipe",
      "effects": [
        {
          "kind": "weaponSwap",
          "damagePct": 62.13,
          "chargeTimeSec": 1,
          "chargeMultPct": 250,
          "maxAmmo": 1,
          "durationSec": 100000
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 24
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 5
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 900
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "teamAmmo",
        "count": 200
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "fillGauge",
          "pct": 12
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
          "stat": "atkPct",
          "value": 29
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
      "mode": "Snipe",
      "effects": [
        {
          "kind": "buff",
          "stat": "partsDamagePct",
          "value": 26.21
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
      "mode": "MG",
      "effects": [
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 26
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "ownBurstGate": "cast",
      "target": {
        "kind": "enemy"
      },
      "mode": "Snipe",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1189.66,
          "core": false
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "ownBurstGate": "cast",
      "target": {
        "kind": "enemy"
      },
      "mode": "MG",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 833.79,
          "core": true
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
          "stat": "attackDamagePct",
          "value": 92,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 65,
          "durationSec": 10
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
          "kind": "flatDamage",
          "atkPct": 6000
        }
      ]
    }
  ]
}
```

============================================================

## SECTION 8 — YOUR PRIOR VERDICT (for continuity)

============================================================

```json
{
  "slug": "cinderella-crystal-wave",
  "kitDescription": "Cinderella: Crystal Wave is an Iron-element Burst III machine-gun attacker who fights in one of two weapon states. By default she empties a 300-round MG into the boss while carrying permanent self-buffs — +24% Attack Damage, +29% ATK, and +26% core damage from her Pinpoint stance — plus a 900%-of-final-ATK hit on the nearest target every five seconds and a team burst-gauge top-up (+12%) every 200 rounds the squad consumes. Reloading to a full magazine while she is in her short-lived 'Preparation for Change' state swaps her into Snipe Mode: a piercing 1-second-charge sniper shot (62.13% per shot, ×250% on a full charge, 15-round magazine, and each full charge burns 40 rounds), which trades Pinpoint's core bonus for Destroy's +26.21% part damage. Her burst hits the highest-ATK enemy for 6000% of final ATK and gives herself +92% Attack Damage and +65% ATK for ten seconds. If she is the unit that burst, entering Full Burst fires a second nuke sized by her current stance — 1189.66% to all enemies in Snipe Mode, or 833.79% as a core strike while on the MG — and only one of the two ever applies. She also maintains a decoy avatar worth 70.34% of her final Max HP to absorb enemy attention.",
  "convergence": {
    "s5TestsVsDriverOverride": "RED",
    "redAssertions": [
      "skill1 'every-5-sec 900% rider': the blind counterfactual predicate `e.kind === 'flatDamage' && e.atkPct === 900` matches 0 effects because the driver encodes the line as `{kind:'dot', atkPct:900, intervalSec:5}`. Effect-kind VOCABULARY mismatch in the splice predicate, not a missing line — the blind's own downstream assertions on slotDamages(skill1) (>=30 events, rangeApplied false, fbMajorApplied both states) PASS against the driver. Classified RECON_ERROR, but it incidentally exposes a genuine primitive-substitution (see gotcha 1).",
      "skill1 'Snipe Mode maxAmmo': blind asserts `e.maxAmmo === 15` (literal kit magazine); driver ships `maxAmmo: 1` from the 40-rounds-per-full-charge clamp-to-empty reading. The blind test's OWN header raises this exact kit-internal contradiction as a whole-picture flag, and the driver documents it as FLAG 3 with both readings and a recipe. Classified DOCUMENTED_GAP on the non-validated Snipe path, not a gotcha."
    ]
  },
  "lineFindings": {
    "skill1": [
      {
        "kitLine": "Changes the weapon in use: Snipe Mode",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "Static user-selectable `modes:['MG','Snipe']`; the weaponSwap sits in a passive block gated `mode:'Snipe'` with durationSec 100000 (100% uptime for the chosen mode). Documented as FLAG 2 with estimate + recipe.",
        "blindSaid": "S6 approximated with `trigger:{kind:'lastBullet'}` + weaponSwap durationSec 5 / maxShots 1 and flagged the duty cycle as ⚑; S2b called the double-reload-toggle the load-bearing state machine and demanded an explicit ⚑ rather than an implicit snipe-from-t0.",
        "formulaCheck": "No engine primitive expresses 'reload-to-max while a status is held' as a symmetric toggle; weaponSwap requires a wall-clock bound. All three agents independently converge on 'not derivable, must be flagged'.",
        "fireRateOk": true,
        "explanation": "Both approximations are wrong in the same direction (uptime unknowable from prose); the driver's is explicitly labelled and, critically, INERT on the graded board — MG is modes[0] so the Snipe block never applies in the validated sample. Verified by the driver's W3 test: normal-attack atkPct is 5.57 in the default run and 62.13 only after flipping modes."
      },
      {
        "kitLine": "Full Charge Damage: 250% of damage",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "chargeMultPct 250 + chargeTimeSec 1 on the swap (the charge BUCKET multiplier, not an additive chargeDamagePct).",
        "blindSaid": "S6 identical (62.13 / 1 / 250); S2b named the nearest-wrong as encoding 250 as additive chargeDamagePct.",
        "formulaCheck": "§1d — 'X% of damage' is the chargeMult term, and the driver routes it there rather than into the additive Charge Damage ▲ points. Correct bucket.",
        "fireRateOk": true,
        "explanation": "Magnitudes are pure kit text and match exactly. Residual (low, Snipe-only): 'Additional Effect 3: Charge time is fixed at 1 sec' is a stat CLAMP, and nothing in the artifacts proves a Charge Speed ▲ ally buff cannot shorten the 1s — untested because no comp supplies one and the Snipe path is unvalidated."
      },
      {
        "kitLine": "Additional Effect 1: Gains Pierce.",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "`pierceModes:['Snipe']` at top level, no unconditional `hasPierce:true`; note records Pierce as inert on the v1 boss.",
        "blindSaid": "S6 hasPierce:false + weaponSwap.hasPierce:true; S2b's nearest-wrong was exactly a whole-fight hasPierce that would tag her MG rounds all fight.",
        "formulaCheck": "§11 — Pierce core+body doubling is a multi-part-boss mechanic (PIERCE_CORE_DOUBLE false) and Pierce Damage ▲ is a DamageUp entry with no source in these comps, so the line is offensively inert here either way. The scoping (Snipe only) is what the prose demands and what both encodings deliver.",
        "fireRateOk": true,
        "explanation": "Driver and blind pick different but equally mode-scoped carriers; neither commits the named nearest-wrong error. Whether `pierceModes` alone activates the tag without a top-level flag is not decidable from the artifacts, but it is unobservable on the partless boss with no Pierce Damage ▲ source — zero board consequence."
      },
      {
        "kitLine": "Expends ammo. Amount: 40 round(s).",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "maxAmmo 1 (40 >= the 15-round Snipe mag ⇒ clamp-to-empty ⇒ one full-charge shot per reload cycle), with the alternative reading and a measurement recipe recorded as FLAG 3.",
        "blindSaid": "S6 reached the SAME clamp reading (maxShots 1) and raised the identical caveat; S2b flagged the 40-vs-15 arithmetic as a contradiction the driver must resolve openly, never silently.",
        "formulaCheck": "Whole-picture: 40 rounds cannot be paid from a 15-round magazine, so the literal reading forces a reload after every full charge. The competing reading (40 feeds the teamAmmo-200 consumption counter) is equally consistent with the text.",
        "fireRateOk": true,
        "explanation": "Three independent reads converge on the contradiction and none resolves it by fiat. This is the correct handling of an unresolvable kit-internal conflict; it is also the sole cause of the S5 maxAmmo RED, and it lives entirely on the non-validated Snipe path."
      },
      {
        "kitLine": "Beauty-Full: Attack Damage ▲ 24%",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "skill1 passive → self buff attackDamagePct 24, no duration.",
        "blindSaid": "S6 and S2b identical; S2b's nearest-wrong was atkPct 24 (bucket swap).",
        "formulaCheck": "§1e — Attack Damage ▲ belongs in the DamageUp bucket, multiplicative against her ATK-bucket 29%/65%. Driver routes it there; no atkPct:24 apply exists.",
        "fireRateOk": true,
        "explanation": "Test W1 pins self-scope (targetIdx == her slot), continuity (expiresFrame null, distinguishing it from her 600-frame burst 92%), and liveness (removal drops her total)."
      },
      {
        "kitLine": "Reload time is fixed at 3 sec for 6 sec",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "Listed in `unmodeled.skill1`; reloads use her normal 171f.",
        "blindSaid": "S6 unmodeled with a signed-error caveat (171f = 2.85s, so a 3s clamp is a slight LOSS on the MG); S2b classed it GAP and warned that dropping the STATUS also deletes the snipe-entry gate.",
        "formulaCheck": "Stat CLAMPS ('fixed at x') are an acknowledged missing primitive — §11 explicitly separates a clamp from reloadSpeedPct/durationShots. No faithful encoding exists today.",
        "fireRateOk": true,
        "explanation": "Correctly declared rather than approximated as a reload BUFF (the named nearest-wrong). The consequential half of S2b's warning — that the status is also the Snipe entry gate — is separately carried as FLAG 2. Minor bookkeeping nit: the `unmodeled` string is an older prose paraphrase, not the current blablalink wording, so it will not match a verbatim grep."
      },
      {
        "kitLine": "Activates every 5 sec … 900% of final ATK",
        "category": "REAL-GOTCHA",
        "subkind": "FIDELITY",
        "driverSaid": "`{kind:'dot', atkPct:900, intervalSec:5, durationSec:100000}` on a passive enemy-targeted block — an exact 5s timer, ~35 firings/180s, bucket 'skill', rangeApplied false.",
        "blindSaid": "S6 used a `hitCount:60` proxy and flagged it as inferior (stalls in Snipe, scales with fire rate), explicitly asking the judge to adjudicate the primitive; S2b specified `interval` 5s with first fire at t=CD.",
        "formulaCheck": "§2b/§9 — the engine HAS the named primitive: the `interval` trigger (2026-07-20, snow-white S2a), 'fires every N sec, first at t=N'. A 'deals X% of final ATK as damage' line is FUNCTION-type damage (crit yes, core no, range no, FB by timing); the `dot` primitive instead tags the instance SUSTAINED-flavored, which additionally opens it to Sustained Damage ▲ (§1e flavor gate) and subordinates its crit eligibility to the DOT_CRIT switch rather than the caster's plain proc rate.",
        "fireRateOk": true,
        "explanation": "Cadence and bucket are right and the line is her largest skill contributor (~20% of her total), so this is a flavor/plumbing divergence, not a magnitude one. Board-inert TODAY (no Sustained Damage ▲ source in the graded comps; DOT_CRIT defaults ON since 2026-07-21, so crit currently matches the function-proc rule), but it diverges under the documented `DOTCRIT=off` arm and under any future sustained-damage buffer. The driver documents the line as modeled but never records the primitive substitution. Secondary: the test's 30–40 band does not pin the first-tick phase (t=0 vs t=5), so S2b's named nearest-wrong 'one extra proc' is not discriminated."
      },
      {
        "kitLine": "total ammo consumed by allies reaches 200",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "`trigger:{kind:'teamAmmo', count:200}` → allies `fillGauge` 12%.",
        "blindSaid": "S6 byte-identical; S2b called it a TANDEM/gauge line that must never be skipped as 'utility' and warned against own-ammo-only or per-ally-multiplied fills.",
        "formulaCheck": "§6 — a gauge channel, team-level; the same primitive Little Mermaid uses (count 400 → 37%). The threshold and pct are pure kit text.",
        "fireRateOk": true,
        "explanation": "Verified to FIRE, not merely be present: test W8 shows removing the block strictly reduces helm's burst count over 180s (a teammate-side observable no other ccw line supplies, since only this block is spliced), and the blind's independent hyper-variant (count 20 / 40%) proves the fixture is gauge-sensitive rather than the comparison being tautological."
      }
    ],
    "skill2": [
      {
        "kitLine": "Decoy: avatar with 70.34% of final Max HP",
        "category": "DOCUMENTED_GAP",
        "subkind": null,
        "driverSaid": "`unmodeled.skill2`.",
        "blindSaid": "S6 and S2b both unmodeled, both warning specifically against encoding it as a `shield` (which would falsely satisfy other kits' `shielded`/`requiresShielded` gates).",
        "formulaCheck": "Purely defensive; the v1 boss deals no damage and there is no decoy HP pool. No damage channel, no tandem consumer.",
        "fireRateOk": true,
        "explanation": "Unanimous and correct — and the driver avoided the shield mis-encoding all three roles named as the dangerous alternative."
      },
      {
        "kitLine": "ATK ▲ 29% continuously",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "skill2 passive → self buff atkPct 29, no duration.",
        "blindSaid": "S6 and S2b identical; nearest-wrong is attackDamagePct 29.",
        "formulaCheck": "§1a — plain ATK ▲ sums into (1 + ΣATK%) on staticAtk, a different bucket from her 24%/92% Attack Damage. Correct placement.",
        "fireRateOk": true,
        "explanation": "Test W2 pins self-scope, null expiry, and liveness (~13% of her total)."
      },
      {
        "kitLine": "Destroy: Damage to Parts ▲ 26.21% … Removes Pinpoint",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "skill2 passive self buff partsDamagePct 26.21 gated `mode:'Snipe'`.",
        "blindSaid": "S6 used `whileSwapped:true` and CONCEDED it had no complement for Pinpoint, so it left Pinpoint unconditional and flagged the resulting over-credit; S2b named 'applying Destroy without removing Pinpoint' as the nearest-wrong.",
        "formulaCheck": "partsDamagePct is offensively inert on the partless scope-lock boss; the load-bearing payload of the line is the mutual removal, which the driver's mode partition enforces structurally.",
        "fireRateOk": true,
        "explanation": "The driver is MORE faithful than the blind here — the mode partition makes Destroy and Pinpoint provably non-simultaneous, which is exactly the property S6 could not express and flagged as a known over-credit. Test W3 pins both directions (parts present / core absent in Snipe, and vice versa) and proves partsDamagePct moves zero damage."
      },
      {
        "kitLine": "Pinpoint: core ▲ 26% continuously",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "skill2 passive self buff coreDamagePct 26 gated `mode:'MG'`.",
        "blindSaid": "S6 unconditional (self-flagged as over-crediting Snipe windows); S2b required core-scoping and mode-gating, nearest-wrong being a permanent unconditional passive or a critDamagePct misread.",
        "formulaCheck": "§1b — coreBonus = (coreAttackMultiplier−100)/100 + Core Damage ▲/100, so 26 joins the core term only, never the generic DamageUp bucket. Correct.",
        "fireRateOk": true,
        "explanation": "Live from frame 0 with null expiry and mode-exclusive against Destroy; removing it drops her total on the 100%-core-exposure graded boss, so the assertion is non-vacuous."
      },
      {
        "kitLine": "entering Full Burst after this unit uses her",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "`trigger:{kind:'fullBurstEnter'}` + `ownBurstGate:'cast'` on BOTH branches, one branch selected by mode so exactly one can fire.",
        "blindSaid": "S6 derived the identical fullBurstEnter + ownBurstGate:'cast' pairing blind; S2b called this the single highest-leverage assertion in the kit and named both failure directions (plain fullBurstEnter over-fires in a co-B3 comp; re-keying to burstCast wrongly drops the +50%).",
        "formulaCheck": "§8 scope clarification — a skill-slot block triggering at FB ENTRY resolves after fbEndFrame is set and legitimately receives the +50% FB major, unlike burst-cast direct damage. The 'after this unit uses her Burst Skill' clause is a caster gate, which is precisely what ownBurstGate:'cast' expresses.",
        "fireRateOk": true,
        "explanation": "The centerpiece, and it is triply discriminated in the driver's W5: 6 firings (== her own casts) vs 12 under the ungated counterfactual, fbMajorApplied true vs false under a burstCast re-key, coreEligible true vs false under core:false. The blind test reached GREEN on the same property from the opposite direction (riderProcs < FB, ungatedProcs > riderProcs) using a two-B3 fixture chosen for exactly this purpose — independent corroboration of the highest-leverage line in the kit."
      },
      {
        "kitLine": "Snipe branch: 1189.66% … as damage",
        "category": "REAL-GOTCHA",
        "subkind": "ENCODING",
        "driverSaid": "`flatDamage atkPct 1189.66, core:true` — same core flag as the MG branch; recorded as FLAG 1 (tier 2) with estimate + recipe and a request for owner/e3 confirmation.",
        "blindSaid": "S6 set this branch NON-core and the 833.79 branch core:true; S2b independently reached the same split ('including parts' + 'as damage' = plain; only the MG branch says 'as core strike damage'). Two blind roles agree against the driver.",
        "formulaCheck": "§1b/§2b and the per-type table — skill/function damage is core-INELIGIBLE unless the text explicitly says 'as core damage/core strike'. The MG line earns the exception by its wording; the Snipe line does not. The prose also targets 'all enemies (including parts)', which is the opposite of a core-strike scope.",
        "fireRateOk": true,
        "explanation": "Prose + formula + both blind re-derivations agree the flag is wrong, and the correct value is trivially available — so this is an encoding divergence, not a missing primitive. Severity is held to LOW only because the branch is unreachable on the graded board (MG is modes[0]; the Snipe path is a non-default user-selectable alternate with no validated sample), and the driver did surface it with a recipe rather than burying it. It should be corrected on the text, not parked pending confirmation: the prose IS the ground truth being graded, and 'a green regression proves a defect is UNREACHED, not absent'."
      }
    ],
    "burst": [
      {
        "kitLine": "Attack Damage ▲ 92% / ATK ▲ 65% for 10 sec",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "One burstCast self block carrying both buffs with durationSec 10.",
        "blindSaid": "S6 identical; S2b required both buckets kept distinct, one block, burstCast (not fullBurstEnter) keying.",
        "formulaCheck": "attackDamagePct → DamageUp (§1e), atkPct → the (1+ΣATK%) term (§1a): different buckets, multiplicative, correctly not merged.",
        "fireRateOk": true,
        "explanation": "Test W6 pins count == her burst casts (so they never leak onto helm's rotations), self-target, and expiresFrame − frame == 600 for BOTH — the equinumerous/equal-expiry property the blind test asserted independently and passed."
      },
      {
        "kitLine": "Deals 6000% of final ATK as Burst Skill",
        "category": "FAITHFUL",
        "subkind": null,
        "driverSaid": "burstCast → enemy flatDamage 6000, no explicit noFb (the engine forces noFb on burst-cast direct damage).",
        "blindSaid": "S6 wrote it with an explicit `noFb:true`; S2b required FB-exemption and core-ineligibility.",
        "formulaCheck": "§8 / damage-calculation §1b — burst-cast damage lands 22f before the FB countdown starts, so it takes neither the +50% nor entry auras. This is the popup-verified Cinderella-family measurement itself (5b), and the engine forces it rather than relying on the override flag.",
        "fireRateOk": true,
        "explanation": "'Modeled ≠ working' is discharged behaviorally, not structurally: W7 asserts every burst-slot damage event has fbMajorApplied false, and the blind test independently asserts inFullBurst === false on the same events. Count == her casts, so a fullBurstEnter mis-key would desynchronise it from the 92/65 applies. No core flag, correct for a burst nuke lacking 'as core damage'."
      }
    ]
  },
  "gotchas": [
    {
      "subkind": "ENCODING",
      "slot": "skill2",
      "summary": "The Snipe-Mode Full-Burst rider (1189.66%) carries core:true, but its kit text reads as plain damage — only the MG branch (833.79%) says 'as core strike damage'.",
      "evidence": "Kit: 'Activates while in Snipe Mode. Affects all enemies (including parts). Effect 1: Deals 1189.66% of final ATK as damage.' vs the MG branch's '833.79% of final ATK as core strike damage'. damage-calculation.md §1b/§2b + the per-type table: function/skill damage is core-INELIGIBLE unless the text explicitly labels it core damage. Driver sets core:true on both branches; blind S6 (opus) set the Snipe branch non-core, and the S2b cross-family reviewer (fable) independently reached the same split — two blind roles plus the formula against the driver.",
      "documentedByDriver": true,
      "severity": "low",
      "suggestedFix": "Set `core: false` on the skill2 Snipe (mode:'Snipe') 1189.66% flatDamage effect; leave the MG 833.79% branch at core:true. This is a text-faithful correction requiring no measurement — the prose supplies the discriminator. Board impact is zero (MG is modes[0] and the graded comps never enter Snipe), so it can land as a pure faithfulness fix. If the owner wants in-game confirmation, the recipe is a Snipe-Mode focus recording: read whether the FB-entry popup renders red 'CORE HIT'."
    },
    {
      "subkind": "FIDELITY",
      "slot": "skill1",
      "summary": "The 'every 5 sec, 900% of final ATK' line is encoded with the `dot` primitive (sustained flavor) although the engine's named `interval` trigger for exactly this kit shape exists.",
      "evidence": "Kit: 'Activates every 5 sec. Affects the enemy unit nearest to the crosshair. Deals 900% of final ATK as damage.' game-mechanics.md §9 + damage-calculation.md §2b: the `interval` trigger (landed 2026-07-20, snow-white S2a) fires every N sec, first at t=N; a 'deals X% of final ATK as damage' line is FUNCTION-type damage (crit at the caster's rate, never core, never range, FB by timing), whereas `dot` tags the instance SUSTAINED-flavored, which admits Sustained Damage ▲ (§1e flavor gate) and routes its crit through the DOT_CRIT switch instead of the plain proc rate. Blind S6 used a hitCount proxy, self-flagged it as inferior, and explicitly asked the judge to adjudicate the primitive; S2b specified `interval` 5s. The driver's cadence (~35/180s), bucket ('skill'), and no-range routing are all correct — this is plumbing, not magnitude.",
      "documentedByDriver": false,
      "severity": "low",
      "suggestedFix": "Re-encode as `trigger:{kind:'interval', sec:5}` + `{kind:'flatDamage', atkPct:900}` targeting enemy — the primitive that matches the kit wording, giving function flavor and an exact 5s cadence with the documented first-fire-at-t=N convention. If the interval trigger cannot express an enemy-targeted damage block, keep the dot and RECORD the substitution plus its two consequences (sustained-flavor exposure; DOTCRIT=off arm silently de-critting a line that should crit) in the override note. Separately, tighten the test: the 30–40 band admits both first-fire phases, so pin the first firing frame to discriminate t=5 from t=0."
    }
  ],
  "discriminationOk": true,
  "faithfulnessScore": "0.875",
  "verdict": "GO",
  "verdictRationale": "The validated MG path — the only path the graded comps exercise — is fully faithful and behaviorally verified, not merely present: every continuous buff (24% Attack Damage in DamageUp, 29% ATK in the ATK bucket, 26% Pinpoint in the core term) applies at frame 0 with null expiry and self-scope; the 900%/5s hit fires ~35× over 180s in the skill bucket with no range; the teamAmmo-200 → 12% fill measurably advances a teammate's burst cadence; the burst self-buffs land once per own cast with a 600-frame expiry; the 6000% nuke never takes the +50% (engine-forced, asserted from the event log by both the driver and the blind); and the centerpiece FB-enter rider is triply discriminated (6 gated firings vs 12 ungated, fbMajorApplied true vs a burstCast re-key, coreEligible true vs core:false). Convergence is RED only twice, and both REDs are benign under classification: one is a blind splice-predicate vocabulary mismatch (flatDamage vs dot) whose own downstream assertions pass, and one is the driver's documented FLAG 3 maxAmmo clamp that the blind test's header independently flags as a kit-internal contradiction. Two real gotchas survive, both low-severity and both board-inert: ranked first, the Snipe-branch core:true, which prose + formula + BOTH blind roles independently agree should be core:false — it is documented with a recipe but it is a known-wrong encoding with a free, text-faithful fix, and it should be corrected rather than parked; second, the substitution of the `dot` primitive for the `interval` trigger on the 900%/5s line, which is undocumented and diverges under the DOTCRIT=off arm or against any future Sustained Damage ▲ source, though it is exactly right on cadence, bucket and range today. Neither is engine-core and neither moves the graded board, so the unit ships. Same-model residual for the owner to spot-check: S5, S6 and S7 are all claude-opus-5, so the strongest independent signal in this packet is the cross-family S2b (claude-fable-5) agreement — worth noting that fable arrived at the Snipe-branch non-core conclusion and the ownBurstGate requirement without seeing the driver, which is why I weight those two findings highest; conversely, the Snipe uptime model (FLAG 2) has NO independent corroboration from any role and rests entirely on an unmeasurable prose reading.",
  "model": "claude-opus-5"
}
```
