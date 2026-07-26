# S7 RECONCILING-JUDGE PACKET (FINAL) — elegg-boom-and-shock (Elegg: Boom and Shock)

You are the BINDING reconciling judge. This is the FINAL packet; the driver implementation is now a
HYBRID that supersedes both the interval:6 model (your first pass, GO 0.89) and the pure-teamAmmo
model (your second pass, GO 1.0). FINAL ENCODING: ghost accrual is interval:6 -> resource +1 (the
faithful 'Recurring interval: 6 sec' capture CAP you preferred — pool peaks ~7 while bursting, nuke
0x bursting, burst always the 6-hit branch, ramp 0->13 by t~78 never-burst; board damage a realistic
~209M, NOT the 1.7x HOT over-credit the pure-teamAmmo accrual produced). The pool-THRESHOLD buffs and
the at-cap nuke are gated on the live pool via teamAmmo:100 pool-CHECK triggers (event-driven) +
resourceGate + durationSec:6 — the teamAmmo trigger is a FREQUENT POOL-CHECK, not the accrual cadence.
WHY HYBRID: threshold-gated `interval` blocks perturb the team-generator beam-search invariant
(scripts/tests/generators/burst-cooldown-coverage.ts topTeams(5)) even at BYTE-IDENTICAL damage —
proven structural (a single interval:6 accrual block is tolerated; a second interval block
re-perturbs). So the accrual stays interval:6 (the faithful cap) and only the pool-checks are
event-driven (teamAmmo), which lands the generator invariant (11/11 pass). S5 BLIND TEST vs this
override: 22 pass / 1 fail / 3 skip — the sole fail is the nuke 'actually fires in a 180s fight'
assertion, which encodes the S5 author's unverified premise that accrual outruns the burst spend;
under the faithful 6s cap the nuke fires 0x while bursting (the driver proves reachability instead via
the engineered pool=13 13-hit-branch test and the never-burst nuke-from-t78 test), exactly the
two-sided treatment the S2b spec demanded and you ruled a RECON_ERROR on your first pass.

### S5 BLIND TEST vs DRIVER OVERRIDE — empirical result (final)
**22 passed / 1 failed / 3 skipped (26 total).** The 1 fail is the nuke-reachability assertion
(RECON_ERROR — nuke 0x bursting under the 6s cap). The 3 skips are the S5 author's own ⚑ GAPs.

### DRIVER DIFF: S6 blind override vs driver override (final)
S6 used teamAmmo:100 for BOTH accrual and tier refresh (interval:1/dur:2). Driver uses interval:6
accrual (the 6s cap) + teamAmmo:100 pool-checks for the tiers/nuke (dur:6). Both share: ghost pool
{0,0..13}, resourceGate min:1/4/13, burstCast self atkPct 40/10s, at-cap 1100% nuke, two
mutually-exclusive discrete-800% burst branches (spend -6/-9 after the gate, !=13 block first). The
accrual cadence (interval:6 cap vs teamAmmo:100) is the ⚑1 residual; the driver chose the 6s cap
(faithful to 'Recurring interval: 6 sec', realistic board damage) and documents teamAmmo:100 as the
blind-convergent alternative. Remaining ⚑-level diffs: rider crit (driver default-unset vs S6
crit:true) and the shared nuke post-add off-by-one.

================================================================================
## (1) RECONCILING-JUDGE CONTRACT
================================================================================
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
  "convergence": { "s5TestsVsDriverOverride": "GREEN|RED", "redAssertions": [ "<which S5 assertions fail vs the driver's override>" ] },
  "lineFindings": {
    "skill1": [ { "kitLine": "<≤40 chars>", "category": "FAITHFUL|DOCUMENTED_GAP|REAL-GOTCHA|RECON_ERROR", "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING|null", "driverSaid": "...", "blindSaid": "...", "formulaCheck": "...", "fireRateOk": true, "explanation": "..." } ],
    "skill2": [ ], "burst": [ ]
  },
  "gotchas": [ { "subkind": "SILENT_DROP|ENGINE|FIDELITY|ENCODING", "slot": "...", "summary": "...", "evidence": "<real kit line + formula citation + driver vs blind>", "documentedByDriver": true, "severity": "high|med|low", "suggestedFix": "<faithful representation, or 'needs measurement' + recipe — NEVER a fudge>" } ],
  "discriminationOk": true,
  "faithfulnessScore": "<0..1 fraction of kit lines FAITHFUL or DOCUMENTED_GAP>",
  "verdict": "GO|NO-GO(faithfulness)|NO-GO(engine-core)",
  "verdictRationale": "<one paragraph: which gotchas are real + ranked; whether the blind re-derivations converged; what must change for GO; the same-model residual the owner should spot-check>"
}
```
Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.


================================================================================
## (2) MECHANICS SSOT POINTERS
================================================================================
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

Buffs *inside* a bucket add; buckets *multiply*. `rate%` is the instance's skill/attack
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

- **Enemy DEF is a small FLAT, subtractive term inside the base** (min-1 floor). +ATK% sits *inside*
  the paren (applies before DEF); the skill coefficient, charge, and every other bucket apply
  *after* (ginmy atkbuff/atkdamagebuff/def tests). Engine: `baseAtk = max(0, effectiveAtk − bossDef)`
  then `× atkPct × …` ✓. Measured boss-type DEF ≈140 (mobs 100) → **negligible** at scope-lock ATK
  (≤0.12% board shift); we run `bossDef:0`. See DECISIONS + `scripts/battery/boss-def.ts`.
- **Defense-Ignore ("true damage")** drops the `− enemyDEF` term entirely (`ATK × coef × …`). A
  separate **"Defense-Ignore Damage Increase"** bucket multiplies ONLY def-ignore hits and is
  *additive with Attack Damage* (ginmy /nikke_truedamage_test). Negligible on our board since DEF≈140
  is already near-zero; only the def-ignore-damage *multiplier* would matter (units: Jill, Ada) — not
  yet modeled, low priority.
- **+ATK% and +Attack Damage% are DIFFERENT buckets → multiply** (×1.5×1.3 = ×1.95, not +80%).
- **"X% of caster's ATK" = caster's BASE (static) ATK**, added FLAT *outside* the recipient's
  `(1+ATK%)` (NOT buffed; the "final" keyword toggles buffs in — KR 기준/JP 基準 = base). Engine uses
  `owner.staticAtk` ✓. "% of **final** ATK" skill damage uses the actor's LIVE buffed ATK ✓.
- **Distributed groups with Damage-Taken, NOT Attack Damage** (naming trap). Engine ✓.

| damage type | crit | core | range | Attack-Dmg | full-burst | element | charge |
|---|---|---|---|---|---|---|---|
| normal / charged | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | charged-only |
| skill / function "% of final ATK" | ✅ | ❌ (unless "as core dmg") | ❌ | ✅ | ✅ | ✅ | ❌ |
| DoT / sustained | ✅ | ❌* | ❌ | ✅ | ✅ (JP: not on 1st tick) | ✅ | ❌ |
| distributed | ⚠️ disputed | ❌ | ❌ | own calc (Taken) | ⚠️ | ⚠️ | ❌ |
| burst nuke | ✅ | only if "as core dmg" | ❌ | ✅ | ✅ | ✅ | ❌ |

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
burst skill at its cast lands *before* Full Burst begins — it gets neither the +0.5 nor any
"when entering Full Burst" aura. Buffs granted by earlier casts in the same rotation do apply to
it. Burst-originated damage that lands *during* the window (dot ticks, stored-hit releases,
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
crit/core *outcomes* (0 or the full bonus), not the expectations. A crit popup is ×1.5 of its
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

Applies to explosion/attachment-*flavored* hits (Rapi: Red Hood's projectiles, Anis: Star's
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

| popup class | Major | formula result | measured popup |
|---|---|---|---|
| non-crit body | 1 + 0.3 = 1.3 | 181,131 | 180,633 |
| non-crit core | 1.3 + 1.0 = 2.3 | 320,464 | 319,582 |
| crit body | 1.3 + 0.5 = 1.8 | 250,796 | 250,107 |
| acid tick (192%, no core/range/crit) | 1.0 | 289,469 | 288,662 |

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

| Weapon | Cadence                 | Notes                     |
| ------ | ----------------------- | ------------------------- |
| AR     | 12/s                    | 5 frames exactly          |
| SMG    | 24/s ⚠ **measured 20/s** | see the frame-quantization note below |
| SG     | 1.5/s                   | 10 pellets/shot; 40 frames exactly |
| MG     | 60 rounds/s cap         | after wind-up ladder — §3 |
| Pistol | 4/s                     |                           |
| SR     | charge cycle + 22f bolt | §4                        |
| RL     | charge cycle            | no bolt recovery          |

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


================================================================================
## (3) GROUND TRUTH — kit prose + base stats
================================================================================
```json
{
  "slug": "elegg-boom-and-shock",
  "name": "Elegg: Boom and Shock",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/ti-90/ho-66/effadcebf8450bb502d77927573d63c2.png",
  "weapon": "MG",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Water",
  "manufacturer": "Missilis",
  "normalAttackMultiplier": 5.57,
  "coreAttackMultiplier": 200,
  "ammo": 300,
  "reloadFrames": 171,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 3.55,
  "burstGaugePerShot": 0.05,
  "treasure": false,
  "nicknames": [
    "ebas",
    "selegg",
    "segg"
  ],
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects 1 random enemy.\nPossession lasts for 6 sec.\nAbility: Find and capture ghosts possessing the enemy.\nRequired hit count: 100 time(s) in total, cumulative across all allies.\nEffect: Captures 1 ghost when the required hit count reaches 100%. A maximum of 13 ghost(s) can be captured.\nRecurring interval: 6 sec\n■ Affects all Water Code allies.\nEffects vary according to the number of ghosts. Each subsequent effect triggers all effects before it:\n1 or more ghosts:\nATK ▲ 16.2% of the skill user's ATK continuously.\n4 or more ghosts:\nElemental Advantage Attack Damage ▲ 35% continuously.",
    "skill2": "■ Activates when using Burst Skill. Affects self.\nATK ▲ 40% for 10 sec.\n■ Activates when a ghost is captured while at maximum ghost capacity. Affects all enemies.\nDeals 1100% of final ATK as damage.",
    "burst": "■ Affects random enemy units if the number of ghosts is not 13.\nDeals 800% of final ATK as damage. Attacks sequentially for 6 time(s).\nNumber of ghosts ▼ 6. Maintains at least 1 ghost.\n■ Affects random enemy units if the number of ghosts is 13.\nDeals 800% of final ATK as damage. Attacks sequentially for 13 time(s).\nNumber of ghosts ▼ 9."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1050201,
      "shot_detail": {
        "id": 1050201,
        "damage": 557,
        "max_ammo": 300,
        "shake_id": 2,
        "ShakeType": "Fire_MG",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 250,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "MG",
        "is_targeting": false,
        "muzzle_count": 1,
        "rate_of_fire": 60,
        "name_localkey": "Machine Gun",
        "prefer_target": "TargetPS",
        "reload_bullet": 10000,
        "counter_enermy": "Metal_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 4200,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 299,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 500,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 0,
        "spot_explosion_range": 0,
        "use_function_id_list": [
          0
        ],
        "accuracy_change_speed": 150,
        "hurt_function_id_list": [
          0
        ],
        "spot_projectile_speed": 0,
        "accuracy_change_pershot": 7,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 100,
        "full_charge_burst_energy": 0,
        "end_accuracy_circle_scale": 10,
        "auto_accuracy_change_speed": 150,
        "rate_of_fire_change_pershot": 100,
        "start_accuracy_circle_scale": 250,
        "target_burst_energy_pershot": 1000,
        "auto_accuracy_change_pershot": 7,
        "auto_end_accuracy_circle_scale": 10,
        "auto_start_accuracy_circle_scale": 250
      },
      "bonusrange_max": 55,
      "bonusrange_min": 35
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step3",
      "burst_apply_delay": 1,
      "change_burst_step": "StepFull"
    },
    "skillDetails": {
      "skill1_id": 2502101,
      "skill2_id": 2502201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2502101,
        "icon": "icn_skill_atkup_01",
        "group_id": 25021,
        "skill_level": 1,
        "name_localkey": "Hello Ghost",
        "next_level_id": 2502102,
        "level_up_cost_id": 20102,
        "description_localkey": "■ Activates at the start of battle. Affects 1 random enemy.\n<color=#00AEFF>Possession lasts for {description_value_03} sec.\nAbility: Find and capture ghosts possessing the enemy.\nRequired hit count: {description_value_02} time(s) in total, cumulative across all allies.\nEffect: Captures 1 ghost when the required hit count reaches 100%. A maximum of {description_value_04} ghost(s) can be captured.\n<word_group=10085>Recurring interval</word_group>: {description_value_01} sec</color>\n■ Affects all Water Code allies.\n<color=#00AEFF>Effects vary according to the number of ghosts. <word_group=10028>Each subsequent effect triggers all effects before it</word_group>:</color>\n1 or more ghosts:\n<color=#00AEFF>ATK ▲ {description_value_05}% of the skill user's ATK continuously.</color>\n{description_value_06} or more ghosts:\n<color=#00AEFF><word_group=10009>Elemental Advantage Attack Damage</word_group> ▲ {description_value_07}% continuously.</color>",
        "description_value_list": [
          {
            "description_value": [
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6"
            ]
          },
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
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6"
            ]
          },
          {
            "description_value": [
              "13",
              "13",
              "13",
              "13",
              "13",
              "13",
              "13",
              "13",
              "13",
              "13"
            ]
          },
          {
            "description_value": [
              "9.57",
              "10.3",
              "11.04",
              "11.78",
              "12.51",
              "13.25",
              "13.99",
              "14.72",
              "15.46",
              "16.2"
            ]
          },
          {
            "description_value": [
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4",
              "4"
            ]
          },
          {
            "description_value": [
              "20.68",
              "22.27",
              "23.86",
              "25.45",
              "27.04",
              "28.64",
              "30.23",
              "31.82",
              "33.41",
              "35"
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
        "id": 2502201,
        "icon": "icn_skill_damage_01",
        "group_id": 25022,
        "skill_level": 1,
        "name_localkey": "Ghostbuster",
        "next_level_id": 2502202,
        "level_up_cost_id": 20202,
        "description_localkey": "■ Activates when using Burst Skill. Affects self.\n<color=#00AEFF>ATK ▲ {description_value_01}% for {description_value_02} sec.</color>\n■ Activates when a ghost is captured while at maximum ghost capacity. Affects all enemies.\n<color=#00AEFF>Deals {description_value_03}% of <word_group=10025>final</word_group> ATK as damage.</color>",
        "description_value_list": [
          {
            "description_value": [
              "23.63",
              "25.45",
              "27.27",
              "29.09",
              "30.91",
              "32.72",
              "34.54",
              "36.36",
              "38.18",
              "40"
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
              "650",
              "700",
              "750",
              "800",
              "850",
              "900",
              "950",
              "1000",
              "1050",
              "1100"
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
      "ulti_skill_id": 1502301,
      "ulti_skill_detail": {
        "id": 1502301,
        "icon": "icn_skill_c502_ult",
        "group_id": 15023,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Water",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "13 Ghosts",
        "next_level_id": 1502302,
        "prefer_target": "Random",
        "resource_name": "c502_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 20302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 1,
            "skill_value_type": "None"
          },
          {
            "skill_value": 1,
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
        "description_localkey": "■ Affects random enemy units if the number of ghosts is not 13.\n<color=#00AEFF>Deals {description_value_01}% of <word_group=10025>final</word_group> ATK as damage. <word_group=10050>Attacks sequentially</word_group> for {description_value_02} time(s).\nNumber of ghosts ▼ {description_value_03}. Maintains at least 1 ghost.</color>\n■ Affects random enemy units if the number of ghosts is 13.\n<color=#00AEFF>Deals {description_value_04}% of <word_group=10025>final</word_group> ATK as damage. <word_group=10050>Attacks sequentially</word_group> for {description_value_05} time(s).\nNumber of ghosts ▼ {description_value_06}.</color>",
        "description_value_list": [
          {
            "description_value": [
              "472.72",
              "509.09",
              "545.45",
              "581.81",
              "618.18",
              "654.54",
              "690.9",
              "727.27",
              "763.63",
              "800"
            ]
          },
          {
            "description_value": [
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6"
            ]
          },
          {
            "description_value": [
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6",
              "6"
            ]
          },
          {
            "description_value": [
              "472.72",
              "509.09",
              "545.45",
              "581.81",
              "618.18",
              "654.54",
              "690.9",
              "727.27",
              "763.63",
              "800"
            ]
          },
          {
            "description_value": [
              "13",
              "13",
              "13",
              "13",
              "13",
              "13",
              "13",
              "13",
              "13",
              "13"
            ]
          },
          {
            "description_value": [
              "9",
              "9",
              "9",
              "9",
              "9",
              "9",
              "9",
              "9",
              "9",
              "9"
            ]
          },
          {},
          {},
          {},
          {},
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          150230101,
          150230102,
          150230103,
          150230104
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
      "grow_grade": 150202,
      "grade_core_id": 1,
      "stat_enhance_id": 5106,
      "stat_enhance_detail": {
        "id": 5106,
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
        200001
      ],
      "element_details": [
        {
          "id": 200001,
          "element": "Water",
          "group_id": 5000002,
          "element_icon": "icn_element_water",
          "weak_element_id": 400001,
          "element_desc_localekey": "Injects Code: P.S.I.D. to all fire-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Water",
          "element_code_name_localekey": "Code: P.S.I.D."
        }
      ]
    },
    "piece": {
      "piece_id": 5100502,
      "piece_detail": {
        "id": 5100502,
        "class": "Attacker",
        "order": 50200,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "MISSILIS",
        "resource_id": 502,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Elegg: Boom and Shock's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 150201,
      "class": "Attacker",
      "order": 10084,
      "name_code": 5146,
      "corporation": "MISSILIS",
      "resource_id": 502,
      "name_localkey": "Elegg: Boom and Shock",
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
  "generatorSupported": true,
  "simSupported": true,
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
    "resourceId": 502
  }
}
```

================================================================================
## (4) S2b CROSS-FAMILY TEST-FAITHFULNESS REVIEW (claude-fable-5)
================================================================================
```json
{
  "slug": "elegg-boom-and-shock",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Required hit count: 100 / max 13 ghost",
      "disposition": "FAITHFUL",
      "scope": "Team-wide hit accrual — 'cumulative across all allies' counts every ally's rounds, not Elegg's own MG hits only.",
      "durationSemantics": "Permanent resource pool (0..13, persists across the fight); the 6 sec possession + 'Recurring interval: 6 sec' reads as a capture CYCLE — at most 1 ghost per 6 s cycle even when 100 team hits accrue faster.",
      "triggerIdentity": "teamAmmo count:100 (team-cumulative rounds) feeding a `resource` +1 delta into a 'ghost' pool {initial 0, min 0, max 13}. ⚑ whether the 6 s recurrence additionally caps capture rate at 1/6s — a 5-wide team lands 100 rounds in only a few seconds, so this choice dominates the ramp. Caveat: teamAmmo ignores infinite-ammo shots; a teammate's unlimitedAmmo window would stall accrual under that primitive.",
      "targetSet": "Owner-scoped resource; the 'Affects 1 random enemy' possession target is moot against the single boss.",
      "nearestWrongModel": "Counting only Elegg's own hits (hitCount on self), or a pure per-100-hits capture with no 6 s cycle cap — either shifts the ghost ramp by a large factor (13 ghosts at ~78 s under 1/6s pacing vs far earlier uncapped).",
      "distinguishingAssertion": "Read buffApply frames off the event log: the tier-2 gate (elemAdvantageDamagePct 35) must first appear no earlier than ~4 capture cycles (~24 s) under the 6 s-paced faithful reading; a pure-hit-count model applies it within the opening seconds and an own-hits-only model shifts it to a different, Elegg-cadence-derived frame.",
      "inertness": "No ghost-gated buffApply of any tier before the first completed capture (first 100 team hits AND first cycle).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "1+ ghosts: ATK ▲ 16.2% of user's ATK",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK, flat add scaled by the CASTER'S ATK ('of the skill user's ATK'), not the holder's.",
      "durationSemantics": "'continuously' = permanent while the gate holds; no durationSec, no capture-tied 6 s expiry.",
      "triggerIdentity": "passive block with resourceGate {name:'ghost', min:1}.",
      "targetSet": "alliesOfElement Water, including self — in the control fixture (liter/crown/elegg/helm) Elegg is the only Water unit, so it is effectively self-only there; that is a fixture fact, not the model.",
      "nearestWrongModel": "atkPct 16.2 (scales each holder's own ATK) instead of casterAtkPct; or target 'allies' unscoped by element.",
      "distinguishingAssertion": "buffApply carries stat 'casterAtkPct' with value ≈ 0.162 × elegg.staticAtk (a FLAT ATK number — the harness flat-resolves caster-scaled stats at apply time), and targetSlug ∈ Water allies only. RED if stat is 'atkPct'/value 16.2, or if liter/crown/helm receive an apply.",
      "inertness": "Non-Water allies get no apply; no apply while the ghost pool is 0; the buff must survive burst spends because of the min-1 ghost clamp (see burst line).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "4+ ghosts: Elem Adv Atk Dmg ▲ 35%",
      "disposition": "FAITHFUL",
      "scope": "elemAdvantageDamagePct — Damage-Up bucket credited ONLY under elemental advantage (live vs the Fire control boss for Water units; this is the taxonomy-8 case where advantage must exceed the clean ×1.10).",
      "durationSemantics": "'continuously' = permanent while gated; additive with tier 1 ('each subsequent effect triggers all effects before it' — both tiers co-active at ≥4).",
      "triggerIdentity": "passive block with resourceGate {name:'ghost', min:4}.",
      "targetSet": "alliesOfElement Water including self.",
      "nearestWrongModel": "Generic attackDamagePct 35 (credits without advantage / against any boss element), or replacing tier 1 instead of stacking with it at ≥4.",
      "distinguishingAssertion": "buffApply stat 'elemAdvantageDamagePct' value 35 present iff pool ≥4, with the tier-1 casterAtkPct apply simultaneously live; against a hypothetical non-advantaged boss element the 35% moves zero damage while the 16.2% still moves it.",
      "inertness": "At 1–3 ghosts only tier 1 is live; the 35% contributes nothing below 4 ghosts and nothing to non-Water teammates.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "When using Burst Skill: ATK ▲40% 10s",
      "disposition": "FAITHFUL",
      "scope": "Generic self ATK.",
      "durationSemantics": "durationSec 10 — genuine wall-clock seconds (kit says 'sec', not rounds).",
      "triggerIdentity": "burstCast (Elegg's OWN burst only) — 'Activates when using Burst Skill' is the literal burst-cast form, NOT fullBurstEnter.",
      "targetSet": "self.",
      "nearestWrongModel": "fullBurstEnter — the control fixture carries helm as co-B3, so any rotation helm bursts would wrongly re-apply Elegg's 40%; this is exactly the burst-cast/FB-enter over-credit divergence.",
      "distinguishingAssertion": "Count buffApply {stat:'atkPct', value:40, targetSlug:'elegg-boom-and-shock'} events == count of Elegg burstCast events, and strictly < count of fullBurstStart events whenever helm takes a rotation.",
      "inertness": "Rotations where the co-B3 (helm) bursts must produce zero applies of this buff.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Capture at max capacity: 1100% dmg",
      "disposition": "FAITHFUL",
      "scope": "Instant flatDamage rider, 1100% of final ATK, single boss target; no core (text silent); crits at caster rate per rider convention; takes FB by landing timing (default ON — this is NOT burst-cast damage).",
      "durationSemantics": "Instant, once per qualifying capture event.",
      "triggerIdentity": "The SAME capture trigger as skill1's accrual, gated resourceGate {name:'ghost', min:13} read on the PRE-clamp pool — fires when a capture completes while already at cap (the capture itself is absorbed by the cap).",
      "targetSet": "enemy (validator requires target 'enemy'; engine resolves the boss implicitly).",
      "nearestWrongModel": "Firing on EVERY capture ungated (massive over-credit), firing once on first reaching 13, or being silently unreachable and shipped untested — with Elegg bursting on a 40 s cd and spending 6–9 ghosts per cast against ~1 ghost/6 s accrual, the pool plausibly NEVER sustains 13 in the standard rotation.",
      "distinguishingAssertion": "Two-sided: (a) in the standard control rotation assert ZERO damage events with mult 1100; (b) in a patched variant that suppresses/delays Elegg's burst so the pool climbs to 13 by ~78 s, assert one 1100% event per subsequent capture cycle while the pool holds at 13.",
      "inertness": "No 1100% event while pool <13; the line must not add a fixed per-fight nuke independent of the resource trajectory.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ghosts ≠13: 800% ×6; ghosts ▼6 min 1",
      "disposition": "FAITHFUL",
      "scope": "Burst-cast sequential damage: 6 flatDamage hits of 800% with flavor 'sequential' (flavor is cross-unit load-bearing — a teammate's sequentialDamagePct/sequentialMultPct must scale these hits); burst-cast damage is FB-exempt (noFb) since it lands before the FB window opens.",
      "durationSemantics": "Instant at cast; the resource spend is permanent state (delta −6, clamped so the pool never drops below 1).",
      "triggerIdentity": "burstCast with resourceGate {name:'ghost', max:12} for the branch; a resource effect delta:−6 ordered AFTER the gated damage so the gate reads the pre-spend pool.",
      "targetSet": "enemy (random-target flavor moot vs single boss — all 6 hits land on it).",
      "nearestWrongModel": "One lump 4800% hit without sequential flavor; or the +50% FB major applied; or spending −6 without the min-1 floor, which would zero the pool and drop the tier-1 casterAtkPct buff after every burst.",
      "distinguishingAssertion": "On an Elegg burstCast with pool <13: exactly 6 damage events of mult 800 with fbMajorApplied=false and sequential flavor; immediately post-cast the pool equals max(1, pre−6) and the tier-1 buff remains live (no gap in casterAtkPct).",
      "inertness": "The 13-hit branch must not also fire; the tier-1 ATK buff must never fully lapse due to a burst spend.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ghosts =13: 800% ×13; ghosts ▼9",
      "disposition": "FAITHFUL",
      "scope": "Same shape as the other branch but 13 sequential 800% hits and a −9 spend — note 13−9=4 lands the pool exactly on the tier-2 threshold, so the 35% elemAdvantage buff survives a max-pool burst.",
      "durationSemantics": "Instant at cast; permanent −9 pool change.",
      "triggerIdentity": "burstCast with resourceGate {name:'ghost', min:13}; branches must be mutually exclusive and evaluated on the pre-spend pool (a spend ordered before the branch gates makes this branch unreachable — a real ordering bug class the schema warns about).",
      "targetSet": "enemy.",
      "nearestWrongModel": "Both branches firing on one cast (6+13 hits); the branch keyed to fullBurstEnter; or spend-before-gate ordering silently forcing the ≠13 branch forever.",
      "distinguishingAssertion": "In a scenario engineered to have pool==13 at cast: exactly 13 damage events of mult 800 (and NOT 6 additional ones), post-cast pool ==4 with the elemAdvantageDamagePct 35 buffApply still in force.",
      "inertness": "In the standard control rotation where the pool never reaches 13, this branch contributes zero events — but that must be asserted, not assumed (pair with the engineered-13 scenario so the branch is provably reachable).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ghost-capture-accrual-100-hits",
    "skill1:tier1-casterAtkPct-16.2-water",
    "skill1:tier2-elemAdvantageDamagePct-35",
    "skill2:burstCast-self-atk-40-10s",
    "skill2:capture-at-cap-1100pct-nuke",
    "burst:branch-not13-800x6-spend6-min1",
    "burst:branch-13-800x13-spend9"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Ability: Find and capture ghosts possessing the enemy.",
      "Affects 1 random enemy."
    ],
    "skill2": [],
    "burst": [
      "Affects random enemy units"
    ]
  },
  "notes": "Expected shared-prior misreads to reconcile, in priority order. (1) CAPTURE PACING is the biggest magnitude lever: 100 team-cumulative rounds accrue in a few seconds for a 5-wide comp, so whether the 6 s possession/'Recurring interval: 6 sec' caps captures at 1 per 6 s cycle decides the whole ghost ramp (tier-2 at ~24 s and cap-13 at ~78 s vs almost immediately). ⚑ this is a convention until pinned from footage; if the driver filed 'Possession lasts 6 sec' as pure flavor, that IS the divergence to surface. (2) skill2's 40% is burstCast, not fullBurstEnter — the control fixture's co-B3 helm makes this assertable (applies == Elegg burstCasts < fullBurstStarts). (3) The 16.2% is casterAtkPct — the harness flat-resolves it, so assert on the flat value ≈0.162×staticAtk, never the raw 16.2. (4) Resource ORDERING: burst spends (−6/−9) must sit after the branch gates and skill2's min-13 gate must read the pre-clamp/pre-spend pool; a mis-ordered spend silently kills the 13-branch and the 1100% nuke while everything still 'passes'. (5) The 1100% nuke and the 13-hit branch are plausibly UNREACHED in the standard rotation (spend 6–9/burst vs ~1 ghost/6 s accrual) — per the passing-tests-don't-justify-unreached-code rule, the test set needs an engineered pool==13 scenario, not just standard-rotation inertness. (6) Keep flavor 'sequential' on the burst hits — inert solo but load-bearing under any teammate's sequential-scoped buff. (7) teamAmmo as the accrual primitive ignores infinite-ammo shots; note the caveat if any fixture teammate carries unlimitedAmmo.",
  "model": "claude-fable-5"
}

```

================================================================================
## (5) S5 BLIND TEST (claude-opus-5)
================================================================================
```typescript
/**
 * elegg-boom-and-shock — BLIND per-unit kit-spec test (authored from the kit prose ALONE;
 * the driver's override / tests / reasoning were NOT consulted).
 *
 * KIT (ground truth, read literally):
 *  S1a  "Activates at the start of battle. Affects 1 random enemy." — 6 sec possession, recurring
 *       every 6 sec; 100 hits CUMULATIVE ACROSS ALL ALLIES captures 1 ghost; cap 13 ghosts.
 *       => a currency/resource pool with a ramp. The exact accrual cadence is OUTSIDE the input
 *          domain (⚑): the engine has no "team cumulative HIT count inside a 6s possession window"
 *          trigger (teamAmmo counts ROUNDS consumed; hitCount counts the OWNER's hits only).
 *  S1b  "Affects all Water Code allies", cumulative tiers keyed to the ghost count:
 *         >=1 ghost  : ATK ▲16.2% OF THE SKILL USER'S ATK, continuously  => casterAtkPct 16.2
 *         >=4 ghosts : Elemental Advantage Attack Damage ▲35%, continuously
 *                      => elemAdvantageDamagePct 35 (NOT elementDamagePct / attackDamagePct)
 *  S2a  "Activates when using Burst Skill. Affects self. ATK ▲40% for 10 sec."
 *       => trigger burstCast (NOT fullBurstEnter), target self, atkPct 40, durationSec 10
 *  S2b  "when a ghost is captured while at maximum ghost capacity. Affects all enemies.
 *       Deals 1100% of final ATK" => flatDamage 1100, gated on the pool being AT CAP (13)
 *  Ba   ghosts != 13: 800% of final ATK, sequential x6; ghosts ▼6 (floor 1)
 *  Bb   ghosts == 13: 800% of final ATK, sequential x13; ghosts ▼9
 *
 * FIXTURE — controlComp(SLUG, true) = liter(B1) / crown(B2) / elegg(B3) / helm(B3), Fire boss, 180s.
 *  - TWO Burst-III units + elegg's own 40s burst CD => elegg does NOT cast on every Full Burst, so a
 *    burstCast-keyed self buff and a fullBurstEnter-keyed one have DIFFERENT counts here. That is the
 *    S2a discriminator (keying to FB-enter OVER-CREDITS).
 *  - Fire boss + Water carry => elemental advantage is LIVE, so the S1b tier-2 buff is non-vacuous.
 *  - Mixed-element team => a Water-scoped ally buff must land on a PROPER SUBSET of the comp; the
 *    nearest-wrong model (target {kind:'allies'}) lands on all four. Asserted set-theoretically so the
 *    test never hardcodes which teammate happens to be Water Code.
 *
 * SHAPE NOTES: the override FILE is slot-keyed; a slot is either a Block[] or a CharacterSkills
 * carrying blocks[] — blocksOf() tolerates both so the test measures the KIT, not the wrapper.
 * withPatchedOverride(SLUG, () => {}) is used to read the committed override as an in-memory clone
 * (the JSON on disk is never touched) and to build every counterfactual.
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

const SLUG = 'elegg-boom-and-shock';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

const near = (a: unknown, b: number, tol = 1e-6) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

const blocksOf = (ov: any, slot: Slot): any[] => {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
};
const allBlocks = (ov: any): Array<{ b: any; slot: Slot }> =>
  SLOTS.flatMap((s) => blocksOf(ov, s).map((b: any) => ({ b, slot: (b.slot ?? s) as Slot })));
const allEffects = (ov: any): Array<{ e: any; b: any; slot: Slot }> =>
  allBlocks(ov).flatMap(({ b, slot }) => (b.effects ?? []).map((e: any) => ({ e, b, slot })));

const OV: any = withPatchedOverride(SLUG, () => {});
const BLOCKS = allBlocks(OV);
const EFFECTS = allEffects(OV);
const fx = (pred: (e: any) => boolean) => EFFECTS.filter(({ e }) => pred(e));
const blocksWith = (pred: (e: any) => boolean) =>
  BLOCKS.filter(({ b }) => (b.effects ?? []).some((e: any) => pred(e)));

const patchEffects = (pred: (e: any) => boolean, mutate: (e: any) => void) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const slot of SLOTS)
      for (const b of blocksOf(ov, slot))
        for (const e of b.effects ?? []) if (pred(e)) mutate(e);
  });
const patchBlocks = (pred: (b: any) => boolean, mutate: (b: any) => void) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const slot of SLOTS) for (const b of blocksOf(ov, slot)) if (pred(b)) mutate(b);
  });

function run(patched?: any, sink?: SimEvent[]) {
  const opts: any = controlComp(SLUG, true);
  const cfg: any = { ...(opts.cfg ?? {}) };
  const o: any = { ...opts, cfg };
  if (sink) {
    const onEvent = (ev: SimEvent) => sink.push(ev);
    cfg.onEvent = onEvent;
    o.onEvent = onEvent; // belt-and-braces: onEvent lives on cfg, mirrored top-level
  }
  if (patched) o.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  return runComp(o);
}

// ---- hoisted runs (each is a full 180s sim) -------------------------------------------------
const EV: SimEvent[] = [];
const BASE = run(undefined, EV);
const BASE_T = totals(BASE);
const COMP_SLUGS = Object.keys(BASE_T);

const NO_T1 = totals(
  run(patchEffects((e) => e.stat === 'casterAtkPct' && near(e.value, 16.2), (e) => { e.value = 0; })),
);
const T1_ALL_EV: SimEvent[] = [];
const T1_ALL = totals(
  run(
    patchBlocks(
      (b) => (b.effects ?? []).some((e: any) => e.stat === 'casterAtkPct'),
      (b) => { b.target = { kind: 'allies' }; },
    ),
    T1_ALL_EV,
  ),
);
const NO_T2 = totals(
  run(patchEffects((e) => e.stat === 'elemAdvantageDamagePct', (e) => { e.value = 0; })),
);
const NO_B40 = totals(
  run(patchEffects((e) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 40), (e) => { e.value = 0; })),
);
const NO_NUKE = totals(
  run(patchEffects((e) => e.kind === 'flatDamage' && near(e.atkPct, 1100), (e) => { e.atkPct = 0; })),
);
const NO_B800 = totals(
  run(patchEffects((e) => e.kind === 'flatDamage' && near(e.atkPct, 800), (e) => { e.atkPct = 0; })),
);

const changed = (t: Record<string, number>) => COMP_SLUGS.filter((s) => t[s] !== BASE_T[s]);
const unchangedExcept = (t: Record<string, number>, keep: string[]) =>
  COMP_SLUGS.filter((s) => !keep.includes(s)).every((s) => t[s] === BASE_T[s]);

// elegg's unit index, resolved from any self-targeted buffApply she emits (casterIdx === targetIdx).
const ELEGG_IDX: number | undefined = (() => {
  const ev: any = EV.find(
    (x: any) =>
      x.kind === 'buffApply' && x.targetSlug === SLUG && x.casterIdx != null && x.casterIdx === x.targetIdx,
  );
  return ev?.casterIdx;
})();
const actorOf = (ev: any): string | undefined =>
  ev.slug ?? ev.unit ?? ev.unitSlug ?? ev.casterSlug ?? ev.srcSlug;
const byElegg = (ev: any) =>
  actorOf(ev) === SLUG ||
  (ELEGG_IDX != null && (ev.idx === ELEGG_IDX || ev.unitIdx === ELEGG_IDX || ev.casterIdx === ELEGG_IDX));
const kind = (k: string, src: SimEvent[] = EV) => src.filter((e: any) => e.kind === k);

describe('elegg-boom-and-shock — harness sanity (guards every event-level claim below)', () => {
  it('the fixture runs, emits events, and elegg is identifiable in them', () => {
    expect(COMP_SLUGS).toContain(SLUG);
    expect(unitOf(BASE, SLUG).totalDamage).toBeGreaterThan(0);
    expect(EV.length).toBeGreaterThan(0);
    // If this is undefined the slug/index accessors below are wrong, not the override.
    expect(typeof ELEGG_IDX).toBe('number');
    expect(kind('fullBurstStart').length).toBeGreaterThan(0);
  });
});

describe('S1b tier-1 — "ATK ▲16.2% of the skill user\'s ATK" to all Water Code allies', () => {
  it('is CASTER-scaled (casterAtkPct 16.2), not a target-scaling atkPct', () => {
    // Nearest-wrong: atkPct 16.2 (scales each ally\'s OWN ATK) or highestAllyAtkPct — different
    // magnitude on every teammate whose base ATK differs from elegg\'s.
    expect(fx((e) => e.kind === 'buff' && e.stat === 'casterAtkPct' && near(e.value, 16.2)).length).toBeGreaterThan(0);
    expect(fx((e) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 16.2))).toHaveLength(0);
    expect(fx((e) => e.kind === 'buff' && e.stat === 'highestAllyAtkPct' && near(e.value, 16.2))).toHaveLength(0);
  });

  it('is ELEMENT-scoped: lands on a proper subset of the comp, including elegg herself', () => {
    const applies = EV.filter(
      (e: any) => e.kind === 'buffApply' && e.stat === 'casterAtkPct' && e.casterIdx === ELEGG_IDX,
    );
    expect(applies.length).toBeGreaterThan(0);
    const targets = new Set(applies.map((e: any) => e.targetSlug));
    expect(targets.has(SLUG)).toBe(true); // elegg is Water Code — "all Water Code allies" includes self
    // RED under target {kind:'allies'} (the nearest-wrong): that set covers the whole comp.
    expect(targets.size).toBeLessThan(COMP_SLUGS.length);
  });

  it('the element scope is load-bearing: widening it to {kind:allies} adds targets and moves damage', () => {
    const wideApplies = T1_ALL_EV.filter(
      (e: any) => e.kind === 'buffApply' && e.stat === 'casterAtkPct' && e.casterIdx === ELEGG_IDX,
    );
    const wide = new Set(wideApplies.map((e: any) => e.targetSlug));
    const baseTargets = new Set(
      EV.filter((e: any) => e.kind === 'buffApply' && e.stat === 'casterAtkPct' && e.casterIdx === ELEGG_IDX).map(
        (e: any) => e.targetSlug,
      ),
    );
    expect(wide.size).toBeGreaterThan(baseTargets.size);
    expect(changed(T1_ALL).length).toBeGreaterThan(0);
  });

  it('is live (zeroing it lowers elegg) and never reaches the non-Water part of the comp', () => {
    expect(NO_T1[SLUG]).toBeLessThan(BASE_T[SLUG]);
    // Element-agnostic inertness: SOME teammate must be untouched — a team-wide buff would move all.
    expect(changed(NO_T1).length).toBeLessThan(COMP_SLUGS.length);
    expect(changed(NO_T1)).toContain(SLUG);
  });
});

describe('S1b tier-2 — "Elemental Advantage Attack Damage ▲35%" at >=4 ghosts', () => {
  it('uses the advantage-gated stat, not a generic element/attack damage stat', () => {
    expect(fx((e) => e.kind === 'buff' && e.stat === 'elemAdvantageDamagePct' && near(e.value, 35)).length).toBeGreaterThan(0);
    // Nearest-wrong: elementDamagePct/attackDamagePct 35 pays out with NO advantage requirement.
    expect(fx((e) => e.kind === 'buff' && e.stat === 'elementDamagePct' && near(e.value, 35))).toHaveLength(0);
    expect(fx((e) => e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 35))).toHaveLength(0);
  });

  it('is non-vacuous on this fixture (Water carry vs Fire boss) and is live', () => {
    expect(NO_T2[SLUG]).toBeLessThan(BASE_T[SLUG]);
  });

  it('carries the same Water-ally scope as tier-1 (one "Affects all Water Code allies" header)', () => {
    const t1 = blocksWith((e) => e.stat === 'casterAtkPct' && near(e.value, 16.2));
    const t2 = blocksWith((e) => e.stat === 'elemAdvantageDamagePct');
    expect(t1.length).toBeGreaterThan(0);
    expect(t2.length).toBeGreaterThan(0);
    const tk = (x: any) => JSON.stringify(x.b.target);
    expect(new Set(t2.map(tk))).toEqual(new Set(t1.map(tk)));
  });

  it('the 4-ghost tier is gated or ramped — NOT an ungated passive live from t=0', () => {
    // 4 ghosts cannot exist at battle start (>=4 captures required); a bare passive over-credits the
    // opening window. Accepted encodings: a resourceGate, a non-passive accrual trigger, or rampSec.
    const t2 = blocksWith((e) => e.stat === 'elemAdvantageDamagePct');
    const ok = t2.every(
      ({ b }: any) =>
        b.resourceGate != null ||
        b.everyN != null ||
        b.trigger?.kind !== 'passive' ||
        (b.effects ?? []).some((e: any) => e.rampSec != null),
    );
    expect(ok).toBe(true);
  });
});

describe('S2a — "Activates when using Burst Skill. Affects self. ATK ▲40% for 10 sec."', () => {
  it('is authored as a 10-SECOND self atkPct 40 (seconds, not rounds)', () => {
    const hit = fx((e) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 40));
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.some(({ e }) => near(e.durationSec, 10))).toBe(true);
    expect(hit.every(({ e }) => e.durationShots == null)).toBe(true);
    expect(hit.every(({ b }) => b.target?.kind === 'self')).toBe(true);
  });

  it('fires on elegg\'s OWN burst cast, not on every team Full Burst', () => {
    const eleggBursts = kind('burstCast').filter(byElegg);
    const fbStarts = kind('fullBurstStart');
    const applied = EV.filter(
      (e: any) => e.kind === 'buffApply' && e.stat === 'atkPct' && near(e.value, 40) && e.targetSlug === SLUG,
    );
    expect(eleggBursts.length).toBeGreaterThan(1);
    // Fixture non-vacuity: with two B3s + a 40s CD there MUST be Full Bursts elegg did not cast,
    // otherwise burstCast and fullBurstEnter are indistinguishable here and the check below is moot.
    expect(fbStarts.length).toBeGreaterThan(eleggBursts.length);
    expect(applied.length).toBe(eleggBursts.length); // RED if keyed to fullBurstEnter (over-credits)
    expect(applied.length).toBeLessThan(fbStarts.length);
    expect(applied.every((e: any) => e.casterIdx === e.targetIdx)).toBe(true); // self, not an ally grant
  });

  it('is live on elegg and byte-inert on every teammate (target: self)', () => {
    expect(NO_B40[SLUG]).toBeLessThan(BASE_T[SLUG]);
    expect(unchangedExcept(NO_B40, [SLUG])).toBe(true);
  });
});

describe('S2b — "when a ghost is captured while at maximum ghost capacity": 1100% of final ATK', () => {
  it('is modeled as a 1100% flat hit', () => {
    expect(fx((e) => e.kind === 'flatDamage' && near(e.atkPct, 1100)).length).toBeGreaterThan(0);
  });

  it('actually fires in a 180s fight (the at-cap condition is reachable) and is elegg-only', () => {
    // RED if the block exists but its gate never opens (modeled-but-inert) or if it was dropped.
    expect(NO_NUKE[SLUG]).toBeLessThan(BASE_T[SLUG]);
    expect(unchangedExcept(NO_NUKE, [SLUG])).toBe(true);
  });

  it('is gated on being AT capacity, not on every capture', () => {
    const nuke = blocksWith((e) => e.kind === 'flatDamage' && near(e.atkPct, 1100));
    expect(nuke.length).toBeGreaterThan(0);
    // Faithful gate: a resource floor at the 13 cap (or an explicit trigger that can only fire at cap).
    const gated = nuke.every(
      ({ b }: any) => (b.resourceGate?.min ?? 0) >= 13 || b.mode != null || b.everyN != null,
    );
    expect(gated).toBe(true);
  });
});

describe('burst — two ghost-count branches of 800% sequential hits', () => {
  const burstRiders = EFFECTS.filter(({ e, slot }) => slot === 'burst' && e.kind === 'flatDamage');

  it('each hit is 800% and sequential-flavored — hits are NOT merged into one big number', () => {
    const eight = burstRiders.filter(({ e }) => near(e.atkPct, 800));
    expect(eight.length).toBeGreaterThanOrEqual(6);
    expect(eight.every(({ e }) => e.flavor === 'sequential')).toBe(true);
    // Nearest-wrong: one 4800%/10400% lump (loses per-hit crit rolls).
    expect(burstRiders.filter(({ e }) => near(e.atkPct, 4800) || near(e.atkPct, 10400))).toHaveLength(0);
  });

  it('BOTH branches exist: a 6-hit block (ghosts != 13) and a 13-hit block (ghosts == 13)', () => {
    const counts = BLOCKS.filter(({ slot }) => slot === 'burst')
      .map(({ b }) => (b.effects ?? []).filter((e: any) => e.kind === 'flatDamage' && near(e.atkPct, 800)).length)
      .filter((n) => n > 0);
    expect(counts).toContain(6);
    expect(counts).toContain(13);
  });

  it('the branches are mutually exclusive on the ghost count (no double-pay)', () => {
    const six = BLOCKS.find(
      ({ b, slot }: any) =>
        slot === 'burst' &&
        (b.effects ?? []).filter((e: any) => e.kind === 'flatDamage' && near(e.atkPct, 800)).length === 6,
    );
    const thirteen = BLOCKS.find(
      ({ b, slot }: any) =>
        slot === 'burst' &&
        (b.effects ?? []).filter((e: any) => e.kind === 'flatDamage' && near(e.atkPct, 800)).length === 13,
    );
    expect(six && thirteen).toBeTruthy();
    expect((six as any).b.resourceGate?.max).toBeLessThanOrEqual(12);
    expect((thirteen as any).b.resourceGate?.min).toBeGreaterThanOrEqual(13);
  });

  it('spends ghosts (▼6 / ▼9) so the branch condition can actually change between bursts', () => {
    const pools = [OV.resources, ...SLOTS.map((s) => (OV as any)[s]?.resources)]
      .filter(Boolean)
      .flat();
    expect(pools.length).toBeGreaterThan(0);
    expect(pools.some((p: any) => p.max === 13)).toBe(true); // "A maximum of 13 ghost(s)"
    const spends = EFFECTS.filter(({ e, slot }) => slot === 'burst' && e.kind === 'resource' && e.delta < 0).map(
      ({ e }) => e.delta,
    );
    expect(spends).toContain(-6);
    expect(spends).toContain(-9);
  });

  it('the burst riders are live on elegg and byte-inert on teammates', () => {
    expect(NO_B800[SLUG]).toBeLessThan(BASE_T[SLUG]);
    expect(unchangedExcept(NO_B800, [SLUG])).toBe(true);
  });
});

describe('kit-wide hygiene — nothing invented that the prose does not state', () => {
  it('no rider claims a core strike (no "core" wording anywhere in the kit)', () => {
    expect(EFFECTS.filter(({ e }) => e.kind === 'flatDamage' && e.core).length).toBe(0);
    expect(BLOCKS.filter(({ b }) => b.requiresCore).length).toBe(0);
  });

  it('no measurement-gated ⚑ knobs are silently switched on (noFb, pierce)', () => {
    expect(EFFECTS.filter(({ e }) => e.kind === 'flatDamage' && e.noFb === true).length).toBe(0);
    expect(OV.hasPierce).toBeFalsy(); // the kit carries no Pierce line
    expect(EFFECTS.filter(({ e }) => e.kind === 'gainPierce').length).toBe(0);
  });

  it('carries no `ignored` effect blocks (validator rule) and declares all three slots', () => {
    expect(EFFECTS.filter(({ e }) => e.kind === 'ignored' || e.kind === 'unsupported').length).toBe(0);
    for (const s of SLOTS) expect(Array.isArray(blocksOf(OV, s))).toBe(true);
  });
});

describe('GAPS — ⚑ outside the input domain', () => {
  it.skip('ghost accrual cadence: "100 hits cumulative across ALL allies" per 6s possession window', () => {
    // No engine primitive counts TEAM hits: hitCount is owner-only, teamAmmo counts ROUNDS consumed
    // (an MG round != a landed hit, and infinite-ammo shots do not consume). Any capture cadence is a
    // ⚑ estimate. Recipe: pin the first-13-ghost time from footage (count the burst that fires 13
    // sequential popups) and back-solve captures/sec, then re-key this to a measured cadence.
  });
  it.skip('"Maintains at least 1 ghost" floor on the non-max burst branch', () => {
    // A resource min-clamp expresses the floor, but it is only observable once the pool can drop below
    // 6 — unreachable here if accrual outpaces the spend. Unobservable payload in this fixture.
  });
  it.skip('"Affects 1 random enemy" possession target + 6 sec possession window', () => {
    // Single-boss fixture: enemy selection and the possession window carry no damage payload the sim
    // can observe (resolveTargets({kind:'enemy'}) is empty).
  });
});

```

================================================================================
## (6) S6 BLIND OVERRIDE (claude-opus-5)
================================================================================
```json
{
  "slug": "elegg-boom-and-shock",
  "resources": [
    {
      "name": "ghost",
      "initial": 0,
      "min": 0,
      "max": 13
    }
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "teamAmmo",
        "count": 100
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "ghost",
          "delta": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 1
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Water"
      },
      "resourceGate": {
        "name": "ghost",
        "min": 1
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 16.2,
          "durationSec": 2,
          "maxStacks": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 1
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Water"
      },
      "resourceGate": {
        "name": "ghost",
        "min": 4
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 35,
          "durationSec": 2,
          "maxStacks": 1
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 40,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "teamAmmo",
        "count": 100
      },
      "target": {
        "kind": "enemy"
      },
      "resourceGate": {
        "name": "ghost",
        "min": 13
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 1100,
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
      "resourceGate": {
        "name": "ghost",
        "max": 12
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "resource",
          "name": "ghost",
          "delta": -6
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
      "resourceGate": {
        "name": "ghost",
        "min": 13
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "flatDamage",
          "atkPct": 800,
          "flavor": "sequential",
          "crit": true
        },
        {
          "kind": "resource",
          "name": "ghost",
          "delta": -9
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Ability: Find and capture ghosts possessing the enemy."
    ],
    "skill2": [],
    "burst": [
      "Maintains at least 1 ghost."
    ]
  },
  "caveats": [
    "⚑ BLOCK ORDER IS LOAD-BEARING in `burst`: the ghosts≤12 branch MUST precede the ghosts=13 branch. resourceGate reads the live pool, so if the 13-branch ran first it would spend 9 (13→4) and the ≤12 branch would then ALSO fire — double burst. Do not reorder.",
    "⚑ The ghost counter is mapped to the `teamAmmo` trigger (total ally AMMO CONSUMED crossing 100), not literal landed hits. Shots ≠ hits for SG pellets / misses, so ghost accrual is an upper bound on teams with shotguns or low hit rate.",
    "⚑ The 1+ / 4+ threshold buffs are re-applied on a 1s interval with a 2s duration + maxStacks 1 (never a gap, never stacks) because a `passive` trigger evaluates its resourceGate once and could never turn ON as ghosts accrue, nor OFF when the burst spends them. This is an engine-idiom encoding of \"continuously\", not a kit-stated cadence.",
    "⚑ \"Maintains at least 1 ghost\" is NOT expressible: the resource clamps at min 0, so a burst cast with 1–6 ghosts leaves 0 instead of 1. Only matters for the 1+ ATK threshold in the window right after an early burst.",
    "⚑ The skill2 max-capacity nuke gate (min:13) reads the POST-add pool, because the skill1 +1 block dispatches first. The capture that takes 12→13 will therefore fire one 1100% proc that the kit text (\"captured WHILE AT maximum capacity\") does not grant — a one-per-battle over-credit.",
    "⚑ Both the burst hits and the 1100% AoE are authored crit:true (RIDERCRIT: riders crit at the caster's sheet rate) and core-less (no \"core strike\" wording). Neither is measured.",
    "⚑ `noFb` is deliberately unset everywhere (default OFF, measured-only). Burst-cast damage is FB-exempt by TIMING, not by flag."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Elegg: Boom and Shock is a team-hit-count currency unit: 100 cumulative ally hits = 1 ghost (cap 13), modeled as a `ghost` resource driven by the `teamAmmo` trigger. Ghosts gate two continuous Water-ally auras (≥1: casterAtkPct 16.2; ≥4: elemAdvantageDamagePct 35) and switch the burst between a 6×800% branch (spend 6) and a 13×800% branch (spend 9). At cap, every further capture fires a 1100% AoE (skill2). The whole damage profile is therefore a function of TEAM fire rate, not Elegg's own — validate the ghost trajectory (time to 4, time to 13, nuke count per fight) before touching any magnitude."
}
```

================================================================================
## (7) DRIVER IMPLEMENTATION UNDER REVIEW (FINAL — hybrid: interval:6 accrual + teamAmmo pool-checks)
================================================================================
### scripts/tests/units/elegg-boom-and-shock.test.ts
```typescript
// PER-UNIT KIT SPEC — `elegg-boom-and-shock` (Elegg: Boom and Shock, Attacker/MG/Water, Burst III,
// cd 40s, ammo 300). Kit-autonomy gauntlet 2026-07-25. The Water MG VARIANT — NOT the base Electric
// `elegg` (P0 slug discipline).
//
// One assertion group per damage-relevant KIT LINE (H1..H5), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` is used ONLY to build COUNTERFACTUALS / ENGINEERED states
// (the nearest wrong model each assertion must discriminate against) — never to supply the encoding
// under test.
//
// GHOST-CURRENCY MODEL. The ghost count is a LIVE RESOURCE POOL `ghost` {0..13} (the engine
// resource-counter primitive — soda-twinkling-bunny / marciana). Accrual is +1 ghost / 6s
// (interval:6 → resource +1; the kit's "Recurring interval: 6 sec" capture CAP — ⚑1). The pool is
// then EMERGENT: it peaks ~7 while bursting on cooldown (so the burst is the 6-hit branch and the cap
// nuke fires 0×) and ramps 0→13 by t≈78 in a never-burst context. The pool-threshold buffs/nuke are
// gated on the live pool via a teamAmmo:100 pool-CHECK trigger (event-driven — see the override note:
// threshold-gated `interval` blocks perturb the team-generator beam search even at byte-identical
// damage, so only the accrual is interval and the pool-checks are event-driven):
//   S1 ≥1 ghost:  ATK ▲ 16.2% of the skill user's ATK to Water allies (≈permanent from t≈6)          [H1]
//   S1 ≥4 ghosts: Elemental Advantage Attack Damage ▲ 35% to Water allies (live while pool≥4)         [H4]
//   S2 on burst:  self ATK ▲ 40% for 10 sec                                                           [H2]
//   S2 at cap:    a ghost captured at max capacity → 1100% of final ATK to all enemies                [H5]
//   BU ≠13:       800% × 6 sequential hits, ghosts ▼6                                                 [H3]
//   BU =13:       800% × 13 sequential hits, ghosts ▼9                                                [H3]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   H1  casterAtkPct is "% of the SKILL USER's ATK" to WATER allies only, gated on pool≥1 (first apply
//       after the first capture, not frame 0). Scope (exactly the two Water allies {ebs,helm}),
//       liveness, the kit magnitude 16.2, and the gated first-apply frame each fail under the nearest
//       wrong model (unscoped all-ally / permanent-from-t=0 / wrong value).
//   H2  +40% is SELF-only, lands once per burst CAST (not Full-Burst-entry — the co-B3 helm makes a
//       fullBurstEnter model over-apply), and is a 10-SECOND window.
//   H3  the burst is resource-BRANCHED on the pre-spend pool: while bursting (pool<13) every cast is
//       the 6-hit branch, and the 13-hit branch is provably reachable when the pool is engineered to
//       13 (first cast 13 hits, then the −9 spend drops later casts to 6). A single-branch model fails
//       one side or the other.
//   H4  the ≥4 tier is gated on pool≥4: present in the default sim at 35% on Water allies, first apply
//       after the pool reaches 4 (t≈24, not frame 0), and inert against a neutral (Iron) boss (it is
//       the Elemental-Advantage bucket, not a generic Damage-Up). A permanent-passive model fails the
//       first-apply-frame assertion.
//   H5  the 1100% nuke is gated on pool≥13: ZERO events while bursting (the pool peaks ~7) and fires
//       from t≈78 in a never-burst context. An ungated model fires it while bursting too.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / ebs B3 / helm B3, boss Fire, focus
// ebs). Boss Fire ⇒ Water holds elemental advantage ⇒ H4 is live. Slot order: liter 0 / crown 1 /
// ebs 2 / helm 3; the Water allies are {2,3}. ebs needs a real rotation to burst (a lone B3 makes
// zero Full Bursts). Deterministic (no seed); event-log over totals.
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
/** controlComp slot order: liter 0 / crown 1 / ebs 2 / helm 3. */
const EBS = 2;
const HELM = 3;
const WATER_ALLIES = [EBS, HELM];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  overrides: Record<string, any> = {},
  bossElement: 'Fire' | 'Iron' = 'Fire',
  disableBursts = false,
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('elegg-boom-and-shock'),
    bossElement,
    overrides,
    cfg: {
      onEvent: (e) => events.push(e),
      ...(disableBursts ? { disableBursts: true } : {}),
    },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / engineered patches ------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const blockWith = (ov: any, slot: string, pred: (b: any) => boolean) => {
  const b = ov[slot].find(pred);
  if (!b) throw new Error(`ebs ${slot} block missing — fixture is stale`);
  return b;
};

/** H1 reference: ≥1-ghost caster-ATK tier removed. */
const ebsNoS1Atk = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.skill1.length === before)
    throw new Error('ebs S1 casterAtkPct block missing — fixture is stale');
});
/** H1 counterfactual: the ≥1 tier as an UNSCOPED all-ally ATK buff. */
const ebsUnscopedS1Atk = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  blockWith(ov, 'skill1', (b) => hasStat(b, 'casterAtkPct')).target = {
    kind: 'allies',
  };
});
/** H2 reference: on-burst self ATK removed. */
const ebsNoS2Atk = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill2.length === before)
    throw new Error('ebs S2 atkPct block missing — fixture is stale');
});
/** H4 reference: ≥4-ghost Elemental Advantage tier removed. */
const ebsNoElemAdv = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  ov.skill1 = ov.skill1.filter(
    (b: any) => !hasStat(b, 'elemAdvantageDamagePct'),
  );
});
/** H5 counterfactual: the nuke with its pool gate removed (fires on EVERY pool-check, ungated). */
const ebsUngatedNuke = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  const b = blockWith(ov, 'skill2', (x) =>
    x.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  delete b.resourceGate;
});
/** H3 engineered: pre-charge the ghost pool to 13 so the =13 burst branch is exercised. */
const ebsEng13 = withPatchedOverride('elegg-boom-and-shock', (ov) => {
  ov.resources[0].initial = 13;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1Atk = run({ 'elegg-boom-and-shock': ebsNoS1Atk });
const unscopedS1Atk = run({ 'elegg-boom-and-shock': ebsUnscopedS1Atk });
const noS2Atk = run({ 'elegg-boom-and-shock': ebsNoS2Atk });
const noElemAdvFire = run({ 'elegg-boom-and-shock': ebsNoElemAdv });
const ironBase = run({}, 'Iron');
const ironNoElemAdv = run({ 'elegg-boom-and-shock': ebsNoElemAdv }, 'Iron');
const ungatedNuke = run({ 'elegg-boom-and-shock': ebsUngatedNuke });
const eng13 = run({ 'elegg-boom-and-shock': ebsEng13 });
const noBurst = run({}, 'Fire', true);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const ebsBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === EBS && b.stat === stat);
const ebsDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' &&
      e.slug === 'elegg-boom-and-shock' &&
      e.srcSlot === srcSlot,
  );
const ebsBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'elegg-boom-and-shock',
  );
const targetSet = (bs: BuffApply[]) =>
  [
    ...new Set(
      bs.map((b) => b.targetIdx).filter((x): x is number => x != null),
    ),
  ].sort((a, b) => a - b);
const firstFrame = (bs: BuffApply[]) => Math.min(...bs.map((b) => b.frame));
/** Burst hits land instant on the cast frame, so hits-per-cast = burst damage grouped by frame. */
const hitsByFrame = (evs: SimEvent[]) => {
  const m = new Map<number, number>();
  for (const d of ebsDamage(evs, 'burst'))
    m.set(d.frame, (m.get(d.frame) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
};

describe('elegg-boom-and-shock (Elegg: Boom and Shock) — kit spec', () => {
  describe('H1 — S1 ≥1-ghost ATK buff: 16.2% of HER ATK, Water allies, gated on the pool', () => {
    const applied = ebsBuffs(base.events, 'casterAtkPct');

    it('reaches exactly the two Water allies (ebs + helm), not the whole team', () => {
      expect(
        applied.length,
        'no S1 casterAtkPct buff was applied',
      ).toBeGreaterThan(0);
      expect(targetSet(applied)).toEqual(WATER_ALLIES);
    });

    it('DISCRIMINATING: an unscoped all-ally model would also reach the non-Water allies', () => {
      expect(
        targetSet(ebsBuffs(unscopedS1Atk.events, 'casterAtkPct')).length,
      ).toBeGreaterThan(WATER_ALLIES.length);
    });

    it('encodes the kit magnitude 16.2, applied as flat ATK', () => {
      const ov: any = loadOverride('elegg-boom-and-shock');
      const e = ov.skill1
        .flatMap((b: any) => b.effects)
        .find((x: any) => x.stat === 'casterAtkPct');
      expect(e.value, 'shipped kit value').toBe(16.2);
      expect(
        applied[0].value,
        'casterAtkPct resolves to flat ATK (>0)',
      ).toBeGreaterThan(0);
    });

    it('is gated on the pool: first apply after the first capture, not frame 0', () => {
      // A permanent-from-t=0 passive fails this — the pool is 0 until the first capture (~t6).
      expect(firstFrame(applied)).toBeGreaterThanOrEqual(1 * FPS);
    });

    it("is live: removing it changes the Water allies' damage", () => {
      expect(base.totals['elegg-boom-and-shock']).not.toEqual(
        noS1Atk.totals['elegg-boom-and-shock'],
      );
      expect(base.totals.helm).not.toEqual(noS1Atk.totals.helm);
    });
  });

  describe('H2 — S2 grants SELF +40% ATK on burst cast, a 10-second window, once per cast', () => {
    const applied = ebsBuffs(base.events, 'atkPct');
    const bursts = ebsBursts(base.events);

    it('fires once per burst cast at the kit magnitude', () => {
      expect(bursts.length, 'fixture must let ebs burst').toBeGreaterThan(0);
      expect(applied.length).toBe(bursts.length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40]);
    });

    it('is self-scoped (no ally shares it)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EBS]);
    });

    it('is a 10-second window', () => {
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('is live: removing it changes her damage', () => {
      expect(base.totals['elegg-boom-and-shock']).not.toEqual(
        noS2Atk.totals['elegg-boom-and-shock'],
      );
    });
  });

  describe('H3 — burst is resource-BRANCHED on the pre-spend pool (six 800% hits ≠13 / thirteen 800% hits =13)', () => {
    const nukes = ebsDamage(base.events, 'burst');
    const bursts = ebsBursts(base.events);

    it('takes the 6-hit branch for every bursting cast (the pool never reaches 13 on cooldown)', () => {
      expect(bursts.length).toBeGreaterThan(0);
      expect(
        [...new Set(nukes.map((d) => d.atkPct))],
        'each sequential hit is 800%',
      ).toEqual([800]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst cast lands before FB',
      ).toEqual([]);
      const perCast = hitsByFrame(base.events).map(([, n]) => n);
      expect(perCast.length, 'one cast frame per burst').toBe(bursts.length);
      expect(
        [...new Set(perCast)],
        'every bursting cast is the 6-hit branch',
      ).toEqual([6]);
    });

    it('DISCRIMINATING: the =13 branch (13 hits) is reachable when the pool is engineered to 13', () => {
      const counts = hitsByFrame(eng13.events).map(([, n]) => n);
      expect(counts[0], 'first cast at pool=13 is the 13-hit branch').toBe(13);
      expect(
        counts.slice(1).every((n) => n === 6),
        'the −9 spend drops every later cast to the 6-hit branch',
      ).toBe(true);
    });
  });

  describe('H4 — S1 ≥4-ghost Elemental Advantage tier: gated on pool≥4, live in the default sim', () => {
    const applied = ebsBuffs(base.events, 'elemAdvantageDamagePct');

    it('is present in the DEFAULT sim at 35% on the Water allies', () => {
      expect(
        applied.length,
        'the ≥4 tier must be live in the default context',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([35]);
      expect(targetSet(applied)).toEqual(WATER_ALLIES);
    });

    it('is gated on the pool: first apply after the pool reaches 4 (t≈24), not frame 0', () => {
      expect(firstFrame(applied)).toBeGreaterThanOrEqual(20 * FPS);
    });

    it('is the Elemental-Advantage bucket: inert against a neutral (Iron) boss', () => {
      expect(ironBase.totals).toEqual(ironNoElemAdv.totals);
    });

    it('is live under elemental advantage: removing it changes Water damage vs Fire', () => {
      expect(base.totals['elegg-boom-and-shock']).not.toEqual(
        noElemAdvFire.totals['elegg-boom-and-shock'],
      );
    });
  });

  describe('H5 — S2 1100% capture-at-max-capacity nuke: gated on pool≥13', () => {
    it('fires ZERO times while bursting on cooldown (the pool peaks ~7, never 13)', () => {
      expect(ebsDamage(base.events, 'skill2').length).toBe(0);
    });

    it('fires from t≈78 in a never-burst context (the pool ramps 0→13)', () => {
      const nukes = ebsDamage(noBurst.events, 'skill2');
      expect(
        nukes.length,
        'never-burst nuke fires once the pool reaches 13',
      ).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1100]);
      expect(
        Math.min(...nukes.map((d) => d.frame)),
        'first nuke at the t≈78 ramp-to-13',
      ).toBeGreaterThanOrEqual(77 * FPS);
    });

    it('DISCRIMINATING: an ungated nuke would fire while bursting too', () => {
      expect(ebsDamage(ungatedNuke.events, 'skill2').length).toBeGreaterThan(0);
    });
  });
});

```

### src/skills/overrides/elegg-boom-and-shock.json
```json
{
  "note": "Kit-autonomy gauntlet 2026-07-25 (cross-family: S2b claude-fable-5; S5/S6/S7 claude-opus-5). GHOST-CURRENCY UNIT — Water MG Attacker B3, slug elegg-boom-and-shock (the Water VARIANT; NOT the base Electric `elegg`). MODEL: the ghost count is a LIVE RESOURCE POOL 'ghost' {initial 0, min 0, max 13} (engine resource-counter primitive — same family as soda-twinkling-bunny's Golden Chip / marciana's Whistle). ACCRUAL = +1 ghost every 6s (interval:6 -> resource +1): this honors the kit's 'Recurring interval: 6 sec' as a capture CAP (<=1 ghost/6s; the 100-cumulative-team-hit gate is folded as clearing inside 6s for a full team — ⚑1). The whole ghost trajectory is EMERGENT: pool peaks ~7 while bursting on cooldown (so the burst is the 6-hit branch and the cap nuke fires 0x), and ramps 0->13 by t~78 in a never-burst context. S1 >=1 ghost -> Water allies casterAtkPct 16.2 (~permanent from t~6). S1 >=4 ghosts -> Water allies elemAdvantageDamagePct 35 (live while pool>=4; partial-uptime bursting, ~permanent from t~24 never-burst). S2 on burst -> self atkPct 40 /10s (burstCast). S2 nuke -> 1100% flatDamage to the enemy while AT cap (resourceGate ghost>=13). Burst !=13 branch -> burstCast + resourceGate ghost<=12 -> SIX discrete 800% flatDamage sequential hits + resource -6. Burst =13 branch -> burstCast + resourceGate ghost>=13 -> THIRTEEN discrete 800% flatDamage sequential hits + resource -9 (provably reachable: engineered pool=13 -> first burst fires 13 hits then -9->4). Branch gates read the PRE-spend pool; the !=13 block is ordered FIRST so the =13 spend cannot also open it. Burst hits are DISCRETE (not consolidated to 4800/10400) per the literal 'Attacks sequentially for N time(s)' + the cross-family blind convergence (S5 test + S6 override both author discrete 800s). THRESHOLD-GATED BUFF ENCODING: the engine applies a `passive` once at frame 0 and never re-evaluates its resourceGate (sim.ts:2169), so the >=1/>=4 tier buffs and the at-cap nuke are gated on the live pool via a teamAmmo count:100 trigger + resourceGate + durationSec:6 — the teamAmmo trigger is a FREQUENT POOL-CHECK (fires each time the team consumes 100 rounds), NOT the accrual cadence; it re-reads the interval-accrued pool and applies the gated buff/nuke while the pool qualifies (the dur bridges checks and lapses ~6s after the pool drops below threshold — a ⚑ lag). WHY EVENT-DRIVEN POOL-CHECKS: threshold-gated `interval` blocks perturb the team-generator beam-search invariant (scripts/tests/generators/burst-cooldown-coverage.ts topTeams(5)) even at BYTE-IDENTICAL damage — proven structural, not a damage regression (a single interval:6 accrual block is tolerated; a second interval block re-perturbs). So the accrual stays interval:6 (the faithful 6s cap) and only the pool-CHECKS are event-driven (teamAmmo), which lands cleanly. ⚑1 CAPTURE CADENCE (TOP residual): accrual is interval:6 (the 'Recurring interval: 6 sec' cap reading; pool peaks ~7 bursting, nuke 0x bursting, ~17 nuke procs from t~78 never-burst at the accrual cadence). The ALTERNATIVE teamAmmo:100 ACCRUAL reading (treat the 100-hit gate as binding, no 6s cap -> pool pins near 13, burst mostly 13-hit, nuke frequent — a 1.7x HOT over-credit on the board) is rejected here as the less-faithful cadence but is the blind-convergent (fable+opus S6) reading; resolve from footage (ghost-counter UI delta: time-to-13 never-burst ~78s => the 6s cap binds). The no-burst NUKE cadence here is teamAmmo-triggered (fires per 100 rounds at cap, more often than the per-capture accrual) — a ⚑ over-fire vs strict per-capture; the FIRST nuke at t~78 is correct, the count is cadence-dependent. teamAmmo counts ROUNDS consumed not landed hits (SG pellets/misses diverge) and ignores infinite-ammo shots. ⚑2 MG CADENCE TUPLE (mandatory): pullsPerSec / reloadFrames 171 datamine-unverified. ⚑3 ELEM-ADVANTAGE magnitude is live ONLY under elemental advantage (Water vs a Fire boss = live; inert vs a non-disadvantaged/neutral boss — verify boss element when grading). NUKE OFF-BY-ONE (low, 0 board impact): the min:13 gate reads the POST-add pool, so the capture that takes the pool 12->13 may fire one nuke the strict 'captured WHILE AT maximum capacity' wording does not grant. 'Maintains at least 1 ghost' is inexpressible (pool min:0; a min:1 would clamp the start to 1 and wrongly light the >=1 tier at frame 0). Rider crit ships at the engine flatDamage default (unset); the SSOT states function-type damage crits at the caster's rate by default — verify/align repo-wide before changing.",
  "resources": [{ "name": "ghost", "initial": 0, "min": 0, "max": 13 }],
  "unmodeled": {
    "skill1": [
      "Activates at the start of battle. Affects 1 random enemy.",
      "Possession lasts for 6 sec.",
      "Ability: Find and capture ghosts possessing the enemy.",
      "Required hit count: 100 time(s) in total, cumulative across all allies."
    ],
    "skill2": [],
    "burst": ["Affects random enemy units", "Maintains at least 1 ghost."]
  },
  "caveats": [
    "skill1: ghost accrual is interval:6 (the 'Recurring interval: 6 sec' capture CAP; <=1 ghost/6s, pool peaks ~7 while bursting); the 100-cumulative-team-hit gate is folded as clearing inside 6s for a full team (⚑1). The ALTERNATIVE teamAmmo:100 accrual (no cap) over-credits ~1.7x HOT and is rejected here",
    "skill1: the >=1/>=4 tier buffs are gated on the live pool via a teamAmmo:100 pool-CHECK trigger (event-driven, to avoid perturbing the team-generator beam search) + durationSec:6; the >=4 tier (35%) is live only under elemental advantage (⚑3) and lapses ~6s after the pool drops below 4 (⚑ lag)",
    "skill2: the 1100% at-cap nuke is gated on pool>=13; it fires 0x while bursting on cooldown (pool peaks ~7) and from t~78 in a never-burst context (teamAmmo-triggered cadence — fires per 100 rounds at cap, a ⚑ over-fire vs strict per-capture). Known 1-proc post-add off-by-one (low, 0 board impact)",
    "burst: the 6-hit and 13-hit branches (six / thirteen discrete 800% sequential hits) are resource-gated on the pre-spend pool; while bursting on cooldown the burst is always the 6-hit branch (pool<13); the 13-hit branch is provably reachable at pool=13. 'Maintains at least 1 ghost' is inexpressible (pool min:0)",
    "burst/skill2 riders ship crit at the engine flatDamage default (unset); SSOT says function-type damage crits at the caster's rate by default — verify/align repo-wide before changing",
    "cadence: datamined MG fire rate + reloadFrames 171 are unverified (mandatory cadence flag, ⚑2)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "interval", "sec": 6 },
      "target": { "kind": "self" },
      "effects": [{ "kind": "resource", "name": "ghost", "delta": 1 }]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "teamAmmo", "count": 100 },
      "target": { "kind": "alliesOfElement", "element": "Water" },
      "resourceGate": { "name": "ghost", "min": 1 },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 16.2,
          "durationSec": 6,
          "maxStacks": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "teamAmmo", "count": 100 },
      "target": { "kind": "alliesOfElement", "element": "Water" },
      "resourceGate": { "name": "ghost", "min": 4 },
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 35,
          "durationSec": 6,
          "maxStacks": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 40, "durationSec": 10 }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "teamAmmo", "count": 100 },
      "target": { "kind": "enemy" },
      "resourceGate": { "name": "ghost", "min": 13 },
      "effects": [{ "kind": "flatDamage", "atkPct": 1100 }]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "resourceGate": { "name": "ghost", "max": 12 },
      "effects": [
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "resource", "name": "ghost", "delta": -6 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "resourceGate": { "name": "ghost", "min": 13 },
      "effects": [
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "flatDamage", "atkPct": 800, "flavor": "sequential" },
        { "kind": "resource", "name": "ghost", "delta": -9 }
      ]
    }
  ]
}

```
