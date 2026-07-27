# S7 RECONCILING-JUDGE PACKET — `brid-silent-track` (Brid: Silent Track)

You are the BINDING reconciling judge for this unit's kit-autonomy gauntlet. Read the contract in
section 1, then adjudicate the driver's implementation against the kit ground truth and the two
independent cross-family blind re-derivations (S5 blind test, S6 blind override). Return the binding
verdict JSON described in section 1.

## DRIVER SUMMARY (Qwen)

- Unit: Brid: Silent Track — SG / Supporter / Fire / Burst II, cd 20s, ammo 9, hitsPerShot 10 pellets.
- 5 kit lines, ALL dispositioned FAITHFUL. Tier 2 (bossElementGate status-gate + hitCount round-count
  cadence + fullBurstEnter-vs-burstCast + meta-defining casterAtk party buff).
- Override is PROMOTED + SOLO-VALIDATED 2026-07-16 (measured solo read 74,592,500; S2 675% rider
  measured EXACTLY every 5th pull: 43 riders = floor(215 pulls/5)).
- Driver test: scripts/tests/units/brid-silent-track.test.ts — 18 assertions GREEN vs shipped override.
- S2b (claude-fable-5) independently re-derived all 5 lines FAITHFUL, no REAL-GOTCHA, dispositions converge.

## THE ONE CROSS-FAMILY DIVERGENCE (adjudicate this)

The S6 blind override matches the driver on ALL 5 lines (structure, magnitudes 636/675/15.12/12.12/66.52,
triggers fullBurstEnter/hitCount/burstCast, Wind gating, excludeSelf, casterAtkPct) EXCEPT the skill2
hitCount granularity: blind wrote count 5/10 (reading "normal attack" = ROUNDS); driver wrote count 50/100.
The blind author EXPLICITLY FLAGGED this: "If the engine counts PELLET hits, both blocks fire 10x too often
(huge over-credit). Must be confirmed against sim.ts hitCount accounting."

DECISIVE ENGINE FACT (sim.ts hitCount trigger, ~line 2898): the hit counter increments by `hitsPerShot`
PER SHOT, not by 1:

```ts
      else if (b.trigger.kind === 'hitCount') {
        const key = `hc:${bi}`;
        // RRH rocket meter fills 2× faster in her Full Burst: threshold 120 → countInFb (60)
        // while in FB. The counter carries over across the boundary (no reset) — the faster
        // threshold just consumes the accrued fill, so a near-full meter fires on FB entry.
        const threshold =
          fbEndFrame > frame && b.trigger.countInFb != null ? b.trigger.countInFb : b.trigger.count;
        let c = (u.hitCounters.get(key) ?? 0) + u.char.hitsPerShot;
        while (c >= threshold) {
          c -= threshold;
          applyBlock(u.idx, b, bi, frame);
        }
        u.hitCounters.set(key, c);
      }
      // chargeCounter: cycling per-full-charge phase counter (only full charges advance it).
```

For Brid hitsPerShot = 10, so one shot adds 10 to the counter. "Every 5 normal attacks (shots)" therefore
requires threshold 50 (= 5 × 10); "every 10 normal attacks" requires 100. The driver's 50/100 is correct
in-engine AND independently MEASURED (every 5th pull). The blind's 5/10 would fire every 0.5/1.0 shots
(~10× over-fire) — exactly the over-credit the blind author warned about. Resolution: driver is faithful;
the blind's flagged uncertainty resolves to the driver's value via the engine semantics + the measurement.

## S5 BLIND TEST — green/red vs the DRIVER override

The opus blind test (section 5) was authored from kit prose alone. Run literally it had 3 failures, ALL
traced to blind-test scaffolding/fragility (NOT driver faithfulness):
(a) harness import path (blind guessed ../lib; harness is at scripts/tests/lib) — mechanical fix;
(b) hitCount engine-convention: its "double the threshold" counterfactual set an ABSOLUTE count=10
assuming a count-5 baseline; vs the driver's measured count-50 that fires 5× MORE not half.
Adapted to DOUBLE the driver's actual count (50→100), preserving the stated intent;
(c) fixture: controlComp(SLUG,true)=liter/crown/SLUG/helm — crown (also B2) wins the cast slot so Brid
never bursts and the burst-buff assertions fail vacuously. Adapted to a sole-B2 comp (liter/SLUG/ada/helm);
(d) the 636:675 max-AMOUNT ratio assumed buff state cancels; the S2 rider's peak in-FB instance carries
more dmgUp than the S1 FB-enter nuke (read ~0.80). Adapted to compare the buff-state-free atkPct field.
ADAPTED blind test (scripts/kit-autonomy/blind/brid-silent-track.adapted.test.ts) vs driver override:
**13 passed, 1 skipped** (the skip is the Wind-boss ACTIVE case the blind author marked it.skip because
controlComp exposes no boss-element parameter; the DRIVER test covers it: B1/B3 "OPENS vs Wind boss").
Every kit-level discrimination the blind author wrote (magnitudes via halving, gate inert/ungated, trigger
identities, excludeSelf via totals, caster-scaled flat ATK) PASSES against the driver override.

## S6 BLIND OVERRIDE — diff vs DRIVER override

- skill1: IDENTICAL (Wind-gated damageTakenPct 15.12 on fullBurstEnter + 636% flatDamage on fullBurstEnter);
  block order swapped only (semantically identical).
- skill2: SAME structure/magnitudes/gating; ONLY hitCount count differs — blind 10/5 vs driver 100/50
  (the flagged round-vs-pellet granularity; resolved to driver per engine semantics + measurement above).
- burst: IDENTICAL (burstCast, allies excludeSelf:true, casterAtkPct 66.52, 10s).
- unmodeled: both empty. The blind's caveats independently note the lowest-HP selector collapses to the
  single boss (no line dropped) and the FB-by-timing/no-core rider conventions — matching the driver.

---

## 1. RECONCILING-JUDGE CONTRACT

````
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
````

Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.

```

## 2. MECHANICS SSOT — docs/data/damage-calculation.md
```

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

```

## 2b. MECHANICS SSOT — docs/data/game-mechanics.md
```

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

````

## 3. GROUND TRUTH — kit prose + base stats (data/characters.json extract)
```json
{
  "slug": "brid-silent-track",
  "name": "Brid: Silent Track",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/nh-42/jv-82/9f7c3c7e30a5a6448173d3d202bd3afd.png",
  "weapon": "SG",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Fire",
  "manufacturer": "Elysion",
  "normalAttackMultiplier": 201.5,
  "coreAttackMultiplier": 200,
  "ammo": 9,
  "reloadFrames": 111,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 10,
  "rl3": 12.2,
  "burstGaugePerShot": 2,
  "treasure": false,
  "nicknames": [
    "bst",
    "xbrid",
    "bridsl"
  ],
  "skills": {
    "skill1": "■ Activates when entering Full Burst. Affects all Wind Code enemies.\nDamage Taken ▲ 15.12% for 10 sec.\n■ Activates when entering Full Burst. Affects all enemies.\nDeals 636% of final ATK as damage.",
    "skill2": "■ Activates after 10 normal attack(s). Affects 1 Wind Code enemy unit(s) with the lowest remaining HP.\nDamage Taken ▲ 12.12% for 10 sec.\n■ Activates after 5 normal attack(s). Affects 1 enemy unit(s) with the lowest remaining HP.\nDeals 675% of final ATK as damage.",
    "burst": "■ Affects all allies (except self).\nATK ▲ 66.52% of the skill user's ATK for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 20
  },
  "role": {
    "weapon": {
      "shot_id": 1007301,
      "shot_detail": {
        "id": 1007301,
        "damage": 20150,
        "max_ammo": 9,
        "shake_id": 2,
        "ShakeType": "Fire_SG",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 10,
        "ShakeWeight": 120,
        "attack_type": "Metal",
        "camera_work": "camera_work_01",
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
        "counter_enermy": "Metal_Type",
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
      "skill1_id": 2073101,
      "skill2_id": 2073201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2073101,
        "icon": "icn_skill_damagereductionup_01",
        "group_id": 20731,
        "skill_level": 1,
        "name_localkey": "Ignition Sequence",
        "next_level_id": 2073102,
        "level_up_cost_id": 10102,
        "description_localkey": "■ Activates when entering Full Burst. Affects all Wind Code enemies.\n<color=#00AEFF>Damage Taken ▲ {description_value_01}% for {description_value_02} sec.</color>\n■ Activates when entering Full Burst. Affects all enemies.\n<color=#00AEFF>Deals {description_value_03}% of <word_group=10025>final</word_group> ATK as damage.</color>",
        "description_value_list": [
          {
            "description_value": [
              "8.93",
              "9.62",
              "10.31",
              "11",
              "11.69",
              "12.37",
              "13.06",
              "13.75",
              "14.44",
              "15.12"
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
              "375.82",
              "404.73",
              "433.64",
              "462.54",
              "491.45",
              "520.36",
              "549.27",
              "578.18",
              "607.09",
              "636"
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
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2073201,
        "icon": "icn_skill_damagereductionup_01",
        "group_id": 20732,
        "skill_level": 1,
        "name_localkey": "Journey Ahead",
        "next_level_id": 2073202,
        "level_up_cost_id": 10202,
        "description_localkey": "■ Activates after {description_value_01} normal attack(s). Affects {description_value_02} Wind Code enemy unit(s) with the lowest remaining HP.\n<color=#00AEFF>Damage Taken ▲ {description_value_03}% for {description_value_04} sec.</color>\n■ Activates after {description_value_05} normal attack(s). Affects {description_value_06} enemy unit(s) with the lowest remaining HP.\n<color=#00AEFF>Deals {description_value_07}% of <word_group=10025>final</word_group> ATK as damage.</color>",
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
              "7.16",
              "7.71",
              "8.27",
              "8.82",
              "9.37",
              "9.92",
              "10.47",
              "11.02",
              "11.57",
              "12.12"
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
              "398.86",
              "429.55",
              "460.23",
              "490.91",
              "521.59",
              "552.28",
              "582.96",
              "613.64",
              "644.32",
              "675"
            ]
          },
          {},
          {},
          {},
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1073301,
      "ulti_skill_detail": {
        "id": 1073301,
        "icon": "icn_skill_c073_ult",
        "group_id": 10733,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Fire",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Full Throttle",
        "next_level_id": 1073302,
        "prefer_target": "Random",
        "resource_name": "c073_ulti",
        "duration_value": 0,
        "skill_cooltime": 2000,
        "level_up_cost_id": 10302,
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
        "description_localkey": "■ Affects all allies (except self).\n<color=#00AEFF>ATK ▲ {description_value_01}% of the skill user's ATK for {description_value_02} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "39.3",
              "42.33",
              "45.35",
              "48.37",
              "51.4",
              "54.42",
              "57.44",
              "60.47",
              "63.49",
              "66.52"
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
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0",
              "0"
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
        "prefer_target_condition": "ExcludeSelf",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          0
        ],
        "after_hurt_function_id_list": [
          107330101
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
      "grow_grade": 207302,
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
      "piece_id": 5100073,
      "piece_detail": {
        "id": 5100073,
        "class": "Attacker",
        "order": 7300,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "ELYSION",
        "resource_id": 73,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Brid: Silent Track's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 207301,
      "class": "Supporter",
      "order": 10043,
      "name_code": 5160,
      "corporation": "ELYSION",
      "resource_id": 73,
      "name_localkey": "Brid: Silent Track",
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
    "resourceId": 73
  }
}```

## 4. S2b REVIEW (claude-fable-5)
```json
{
  "slug": "brid-silent-track",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■FB enter → Wind: DmgTaken ▲15.12% 10s",
      "disposition": "FAITHFUL",
      "scope": "Boss debuff (Damage Taken ▲ benefits whole team, taxonomy #4) — not a self/ally buff; element-scoped to Wind Code enemies only",
      "durationSemantics": "durationSec:10 — genuine wall-clock ('for 10 sec'), NOT rounds",
      "triggerIdentity": "fullBurstEnter (ANY team FB — 'when entering Full Burst'), composed with bossElementGate:'Wind'",
      "targetSet": "enemy (boss); buffApply emits casterIdx===null AND targetIdx===null — filter by stat+value",
      "nearestWrongModel": "Dropping the element gate so damageTakenPct 15.12 applies to ANY boss — over-credits the entire team ~15% during FB windows on the Fire fixture boss",
      "distinguishingAssertion": "On the standard Fire-boss fixture, ZERO buffApply events with stat 'damageTakenPct' value 15.12 across the whole run (gate closed); nearest-wrong emits one per fullBurstStart",
      "inertness": "Must move NOTHING on a non-Wind boss: totals identical with this block deleted vs present on the Fire fixture",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■FB enter → all enemies: 636% ATK dmg",
      "disposition": "FAITHFUL",
      "scope": "Instant flatDamage rider, atkPct 636, NO element gate ('all enemies' — deliberately broader than the sibling line); crit at caster rate, no core, noRange (engine forces no-range on riders)",
      "durationSemantics": "Instant hit — none",
      "triggerIdentity": "fullBurstEnter — fires once per team Full Burst, NOT burstCast; lands at FB start so takes the +50% FB major by timing (default ON; per-kit noFb is measured-only)",
      "targetSet": "enemy",
      "nearestWrongModel": "Two plausible misreads: (a) bleeding the sibling line's Wind gate onto this damage line → zero rider damage on the Fire boss (under-credit); (b) keying to burstCast → fires pre-FB, silently losing the +50% FB major and any second-B2 divergence",
      "distinguishingAssertion": "Exactly ONE damage event with mult 636 and srcSlot 'skill1' per fullBurstStart on the Fire-boss fixture, with inFullBurst===true / fbMajorApplied===true; red under (a) [zero events] and under (b) [inFullBurst false]",
      "inertness": "Count must equal FB count exactly — no extra procs outside FB entries",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■10 normal atk → Wind: DmgTaken ▲12.12%",
      "disposition": "FAITHFUL",
      "scope": "Boss debuff, Wind-gated (same shape as skill1a); counts NORMAL attacks only — burst cast does not advance the counter",
      "durationSemantics": "durationSec:10 wall-clock",
      "triggerIdentity": "hitCount count:10 counting ROUNDS (1 round = 1 trigger pull for SG), composed with bossElementGate:'Wind'",
      "targetSet": "enemy (boss); buffApply casterIdx/targetIdx null",
      "nearestWrongModel": "hitCount counting PELLET hits — hitsPerShot is 10, so a pellet-counting model fires this every single pull (~10× over-frequency). The single biggest quantitative trap on this unit",
      "distinguishingAssertion": "On the Fire fixture: zero damageTakenPct 12.12 buffApply events (gate closed). Cadence half (needs a Wind-boss or gate-lifted patched run): first proc strictly AFTER the 10th pull — i.e. after the first reload, since magazine is 9 — never after pull 1",
      "inertness": "Inert on the Fire fixture; gate-lifted, proc count ≤ floor(totalPulls/10)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■5 normal atk → enemy: 675% ATK dmg",
      "disposition": "FAITHFUL",
      "scope": "Instant flatDamage rider, atkPct 675, ungated by element ('1 enemy unit(s) lowest HP' = the sole boss in v1); crit yes, core no, noRange forced; takes FB by landing timing",
      "durationSemantics": "Instant — none",
      "triggerIdentity": "hitCount count:5 counting ROUNDS (pulls, not pellets); its OWN counter, independent of the 10-count sibling",
      "targetSet": "enemy",
      "nearestWrongModel": "Pellet-counting: every pull crosses 10 pellet-hits → 2 procs per pull instead of 1 per 5 pulls, a ~10× damage over-credit on a 675% line — enormous. Secondary misread: sharing one counter with the 10-count line (procs collide/reset)",
      "distinguishingAssertion": "Total count of damage events with mult 675 === floor(shotsFired/5) for the run (count shot events to get shotsFired); pellet-counting yields ~2×shotsFired events — red by an order of magnitude",
      "inertness": "No procs before the 5th pull; counter unaffected by burst casts or FB entries",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■allies (except self): ATK ▲66.52% caster",
      "disposition": "FAITHFUL",
      "scope": "Caster-scaled flat ATK grant — '66.52% of the SKILL USER'S ATK', i.e. casterAtkPct, NOT the target's own ATK",
      "durationSemantics": "durationSec:10 wall-clock",
      "triggerIdentity": "burstCast (her own Burst II block; fires only on rotations Brid herself bursts — as sole B2 in the fixture this is every rotation, but the trigger identity is still burstCast, cd 20s)",
      "targetSet": "allies with excludeSelf:true — Brid herself must NOT receive it",
      "nearestWrongModel": "Encoding as atkPct 66.52 (scaling each TARGET'S own ATK) — over-credits every carry whose staticAtk exceeds Brid's (she is a Supporter; carries out-stat her, so the misread inflates the board). Second misread: dropping excludeSelf, moving Brid's own damage",
      "distinguishingAssertion": "buffApply events with stat 'casterAtkPct' (harness flat-resolves: value === 0.6652 × brid staticAtk, a FLAT number ≠ 66.52) on each burst cast, with NO event where targetIdx === casterIdx; atkPct misread emits stat 'atkPct' value 66.52 — red on both stat name and value shape",
      "inertness": "Brid's own totalDamage identical with the burst block present vs deleted (self-exclusion); allies' buff value tracks Brid's staticAtk, not their own",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:FB-enter Wind DamageTaken 15.12%",
    "skill1:FB-enter 636% damage rider",
    "skill2:hitCount-10 Wind DamageTaken 12.12%",
    "skill2:hitCount-5 675% damage rider",
    "burst:casterAtkPct 66.52% allies-except-self"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in order of damage-at-stake: (1) SG PELLET vs ROUND counting on both hitCount triggers — hitsPerShot 10 makes the wrong reading fire skill2's procs ~10× too often; the 675% rider misread alone would dwarf her weapon damage. The distinguishing assertions are count-based (floor(shots/5), first-proc-after-reload) precisely to catch this. (2) Element-gate bleed: the kit deliberately pairs a Wind-gated debuff with an UNGATED damage line inside each skill — a lazy per-slot gate either kills the riders on the Fire boss or lets the debuffs leak onto it; assert both directions (riders fire, debuffs silent). (3) casterAtkPct vs atkPct on burst — 'of the skill user's ATK' is the flat caster-scaled add; harness flat-resolves the buffApply value, so asserting the emitted value ≈ 0.6652×staticAtk (not the raw 66.52) distinguishes structurally. (4) Both Damage Taken lines are BOSS debuffs (buffApply casterIdx/targetIdx null) — a reviewer expecting ally-targeted applies will write a filter that matches nothing. (5) All 'for 10 sec' durations here are genuine seconds — no round-count trap on this unit. (6) Both damage riders should be crit-eligible/no-core/noRange per rider defaults; the 636% takes FB major at FB-entry timing (fullBurstEnter ≠ the burstCast pre-FB exemption). Fixture note: Brid is Burst II — she replaces the B2 slot beside a B1+B3, and burstCast vs fullBurstEnter on her burst only diverges with a second B2 present; a divergence test needs that comp if the driver claims the distinction matters.",
  "model": "claude-fable-5"
}
````

## 5. S5 BLIND TEST (claude-opus-5, authored from kit prose alone)

```ts
/**
 * brid-silent-track - Brid: Silent Track (SG / Fire / Supporter / Burst II).
 * BLIND spec test (S5): written from the kit prose alone, with no sight of the driver's
 * override, tests, or reasoning.
 *
 * KIT, read structurally (header + Affects clause + stat keyword before the arrow):
 *   skill1 a) fullBurstEnter | all WIND CODE enemies | Damage Taken UP 15.12% for 10 sec
 *             -> boss debuff (damageTakenPct) + a Wind bossElementGate. The control fixture's
 *                boss is FIRE, so this line must be INERT here; that inertness IS the assertion,
 *                and the ungated counterfactual proves the block is otherwise live (trap: an
 *                ungated encoding silently over-credits the whole team on every graded comp).
 *   skill1 b) fullBurstEnter | all enemies | 636% of final ATK
 *             -> flatDamage rider, one per FULL BURST ENTRY (any team FB), NOT per own burst cast.
 *   skill2 a) after 10 normal attack(s) | 1 WIND CODE enemy, lowest remaining HP |
 *             Damage Taken UP 12.12% for 10 sec -> hitCount(10) boss debuff, Wind-gated (inert here).
 *   skill2 b) after 5 normal attack(s) | 1 enemy, lowest remaining HP | 675% of final ATK
 *             -> hitCount(5) flatDamage rider; the only damage line that fires outside Full Burst.
 *             (Single-boss fight, so the lowest-remaining-HP selector is degenerate = the boss.)
 *   burst   ) all allies (EXCEPT SELF) | ATK UP 66.52% OF THE SKILL USER'S ATK for 10 sec
 *             -> burstCast, allies excludeSelf, casterAtkPct. Caster-scaled stats are FLAT-resolved
 *                at apply time, so the emitted buffApply value is an ATK number, not 66.52.
 *
 * FIXTURE: controlComp(SLUG, true) - liter B1 / crown B2 / carry / helm B3, so bursts actually
 * chain and Full Bursts happen (three of the five kit lines are full-burst-keyed; a comp without
 * a B3 makes ZERO Full Bursts and every one of them would read as vacuously absent).
 * Deterministic, no seed.
 *
 * METHOD (why the assertions discriminate): every damage/buff claim is read as a MULTISET DIFF of
 * the event stream between the base run and a counterfactual run with exactly that one effect
 * removed. The boss is immortal and the sim is deterministic, so every OTHER unit's events are
 * identical across runs - the diff isolates this unit's contribution without depending on an
 * event owner field. Each nearest-wrong model (ungated debuff / burst-cast-keyed rider /
 * hitCount 10 instead of 5 / halved magnitude / self-inclusive ATK grant) is built with
 * withPatchedOverride and asserted to produce an observably different stream.
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

const SLUG = 'brid-silent-track';

type Ev = Record<string, any>;

function run(opts: any): { res: any; events: Ev[] } {
  const events: Ev[] = [];
  const cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev as unknown as Ev);
    },
  };
  return { res: runComp({ ...opts, cfg } as any), events };
}

// ---- override-shape helpers -------------------------------------------------
// The override is SLOT-KEYED ({ skill1, skill2, burst }); a slot is either a Block[] or a
// CharacterSkills carrying its own blocks[]. Handle both; there is no top-level ov.blocks.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}
const eff = (b: any): any[] => b?.effects ?? [];
const isFlat = (e: any) => e?.kind === 'flatDamage';
const isDamageTaken = (e: any) =>
  e?.kind === 'buff' && e?.stat === 'damageTakenPct';
const isAtkGrant = (e: any) =>
  e?.kind === 'buff' &&
  (e?.stat === 'casterAtkPct' ||
    e?.stat === 'atkPct' ||
    e?.stat === 'highestAllyAtkPct');

function pickBlock(
  ov: any,
  slot: any,
  pred: (b: any) => boolean,
  label: string
): any {
  const b = slotBlocks(ov, slot).find(pred);
  if (!b)
    throw new Error('[' + SLUG + '] no ' + slot + ' block matching ' + label);
  return b;
}

function removeEffect(
  ov: any,
  slot: any,
  pred: (e: any) => boolean,
  label: string
): void {
  const arr = slotBlocks(ov, slot);
  let hit = false;
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i];
    if (!eff(b).some(pred)) continue;
    hit = true;
    const rest = eff(b).filter((e: any) => !pred(e));
    if (rest.length === 0) arr.splice(i, 1);
    else b.effects = rest;
  }
  if (!hit)
    throw new Error('[' + SLUG + '] no ' + slot + ' effect matching ' + label);
}

function ungateElement(
  ov: any,
  slot: any,
  pred: (b: any) => boolean,
  fallback: any
): void {
  const b = pickBlock(ov, slot, pred, 'element-gated Damage Taken block');
  delete b.bossElementGate;
  if (b.trigger?.kind === 'bossElement') b.trigger = fallback;
}

// ---- event helpers ----------------------------------------------------------
const KEY_FIELDS = [
  'kind',
  'srcSlot',
  'bucket',
  'mult',
  'inFullBurst',
  'fbMajorApplied',
  'rangeApplied',
  'crit',
  'core',
  'critRate',
  'coreRate',
  'amount',
  'damage',
  'dmg',
  'total',
  'stat',
  'key',
  'value',
  'targetSlug',
  'casterIdx',
  'targetIdx',
];
const sigOf = (e: Ev): string => KEY_FIELDS.map((f) => String(e[f])).join('|');

function multisetDiff(a: Ev[], b: Ev[]): Ev[] {
  const counts = new Map<string, number>();
  for (const e of b) {
    const k = sigOf(e);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out: Ev[] = [];
  for (const e of a) {
    const k = sigOf(e);
    const c = counts.get(k) ?? 0;
    if (c > 0) counts.set(k, c - 1);
    else out.push(e);
  }
  return out;
}

const ofKind = (evs: Ev[], kind: string) => evs.filter((e) => e.kind === kind);
const AMOUNT_FIELDS = ['amount', 'damage', 'dmg', 'total'];
function amountOf(e: Ev): number | undefined {
  for (const f of AMOUNT_FIELDS) {
    const v = e[f];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}
const near = (a: any, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 0.005;
const teamTotal = (res: any) =>
  Object.values(totals(res) as Record<string, number>).reduce(
    (s, v) => s + v,
    0
  );

// ---- runs (hoisted; each is a full 180s sim) --------------------------------
const OPTS: any = controlComp(SLUG, true);
const withOv = (ov: any) => ({
  ...OPTS,
  overrides: { ...(OPTS.overrides ?? {}), [SLUG]: ov },
});

const base = run(OPTS);

const s1RiderOff = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      removeEffect(ov, 'skill1', isFlat, 'skill1 flatDamage 636%')
    )
  )
);
const s1RiderHalf = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = pickBlock(
        ov,
        'skill1',
        (bl: any) => eff(bl).some(isFlat),
        'skill1 flatDamage'
      );
      for (const e of eff(b)) if (isFlat(e)) e.atkPct = e.atkPct / 2;
    })
  )
);
const s1RiderBurstCast = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = pickBlock(
        ov,
        'skill1',
        (bl: any) => eff(bl).some(isFlat),
        'skill1 flatDamage'
      );
      b.trigger = { kind: 'burstCast' };
    })
  )
);
const s2RiderOff = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      removeEffect(ov, 'skill2', isFlat, 'skill2 flatDamage 675%')
    )
  )
);
const s2RiderHalf = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = pickBlock(
        ov,
        'skill2',
        (bl: any) => eff(bl).some(isFlat),
        'skill2 flatDamage'
      );
      for (const e of eff(b)) if (isFlat(e)) e.atkPct = e.atkPct / 2;
    })
  )
);
const s2Count10 = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) => {
      const b = pickBlock(
        ov,
        'skill2',
        (bl: any) => eff(bl).some(isFlat),
        'skill2 flatDamage'
      );
      b.trigger = { kind: 'hitCount', count: 10 };
    })
  )
);
const s1DebuffUngated = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      ungateElement(ov, 'skill1', (b: any) => eff(b).some(isDamageTaken), {
        kind: 'fullBurstEnter',
      })
    )
  )
);
const s2DebuffUngated = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      ungateElement(ov, 'skill2', (b: any) => eff(b).some(isDamageTaken), {
        kind: 'hitCount',
        count: 10,
      })
    )
  )
);
const burstBuffOff = run(
  withOv(
    withPatchedOverride(SLUG, (ov: any) =>
      removeEffect(
        ov,
        'burst',
        isAtkGrant,
        'burst ATK grant 66.52% of caster ATK'
      )
    )
  )
);

// ---- derived event sets -----------------------------------------------------
const fbStarts = ofKind(base.events, 'fullBurstStart').length;
const dmg = (r: { events: Ev[] }) => ofKind(r.events, 'damage');
const buffs = (r: { events: Ev[] }) => ofKind(r.events, 'buffApply');

const bridS1Riders = multisetDiff(dmg(base), dmg(s1RiderOff));
const bridS1RidersBC = multisetDiff(dmg(s1RiderBurstCast), dmg(s1RiderOff));
const bridS2Riders = multisetDiff(dmg(base), dmg(s2RiderOff));
const bridS2Riders10 = multisetDiff(dmg(s2Count10), dmg(s2RiderOff));
const bridBurstBuffs = multisetDiff(buffs(base), buffs(burstBuffOff));
const otherSlugs = Object.keys(totals(base.res)).filter((s) => s !== SLUG);

describe(SLUG + ' - blind kit spec', () => {
  it('fixture is non-vacuous: full bursts chain and the unit deals damage', () => {
    // Without this, every full-burst-keyed line below would pass by being absent.
    expect(fbStarts).toBeGreaterThanOrEqual(2);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(otherSlugs.length).toBe(3);
  });

  // --- skill1 a) Damage Taken UP 15.12% / 10s, Wind Code enemies -------------
  it('skill1 Damage Taken 15.12% is element-gated: inert against the Fire control boss', () => {
    const dt = buffs(base).filter((e) => e.stat === 'damageTakenPct');
    expect(dt.filter((e) => near(e.value, 15.12))).toHaveLength(0);
    // Nearest-wrong = an ungated damageTakenPct block, which would fire on every FB entry here.
  });

  it('skill1 Damage Taken block is otherwise correct: ungating it applies 15.12% once per FB', () => {
    const dt = buffs(s1DebuffUngated).filter(
      (e) => e.stat === 'damageTakenPct' && near(e.value, 15.12)
    );
    expect(dt.length).toBe(fbStarts); // fullBurstEnter trigger, one application per FB entry
    for (const e of dt) {
      expect(e.casterIdx ?? null).toBeNull(); // boss-held debuff
      expect(e.targetIdx ?? null).toBeNull();
      expect(e.durationShots ?? null).toBeNull(); // 10 SECONDS, not 10 rounds
    }
    expect(teamTotal(s1DebuffUngated.res)).toBeGreaterThan(teamTotal(base.res));
    // Proves the gate is the ONLY thing suppressing the line - trigger/target/value are live.
  });

  // --- skill1 b) 636% of final ATK, all enemies -------------------------------
  it('skill1 636% rider fires once per FULL BURST ENTRY, inside the FB window', () => {
    expect(bridS1Riders.length).toBe(fbStarts);
    for (const e of bridS1Riders) {
      expect(e.srcSlot).toBe('skill1');
      expect(e.inFullBurst).toBe(true); // FB-enter timing: the rider takes the FB major
      const coreish = e.coreRate ?? e.core;
      if (typeof coreish === 'number') expect(coreish).toBe(0); // no core strike text in the kit
    }
  });

  it('skill1 636% rider is NOT keyed to this unit own burst cast', () => {
    // Nearest-wrong: burstCast keying. It fires pre-FB (inFullBurst false) and/or a different
    // number of times whenever another same-tier unit takes the burst slot in a rotation.
    const differs =
      bridS1RidersBC.length !== bridS1Riders.length ||
      bridS1RidersBC.some((e) => e.inFullBurst !== true);
    expect(differs).toBe(true);
  });

  it('skill1 rider magnitude is the authored 636% (halving it halves its contribution)', () => {
    const full = totals(base.res)[SLUG] - totals(s1RiderOff.res)[SLUG];
    const half = totals(s1RiderHalf.res)[SLUG] - totals(s1RiderOff.res)[SLUG];
    expect(full).toBeGreaterThan(0);
    expect(half / full).toBeCloseTo(0.5, 3);
  });

  // --- skill2 a) Damage Taken UP 12.12% / 10s after 10 normal attacks ---------
  it('skill2 Damage Taken 12.12% is element-gated (inert on Fire) but otherwise live at a 10-attack counter', () => {
    expect(
      buffs(base).filter(
        (e) => e.stat === 'damageTakenPct' && near(e.value, 12.12)
      )
    ).toHaveLength(0);

    const dt = buffs(s2DebuffUngated).filter(
      (e) => e.stat === 'damageTakenPct' && near(e.value, 12.12)
    );
    expect(dt.length).toBeGreaterThan(0);
    for (const e of dt) {
      expect(e.casterIdx ?? null).toBeNull();
      expect(e.durationShots ?? null).toBeNull(); // seconds, not rounds
    }
    // 10-attack counter must fire about HALF as often as the 5-attack damage counter.
    const ratio = dt.length / bridS2Riders.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
    expect(teamTotal(s2DebuffUngated.res)).toBeGreaterThan(teamTotal(base.res));
  });

  // --- skill2 b) 675% of final ATK after 5 normal attacks ---------------------
  it('skill2 675% rider runs off a 5-attack counter, not a full-burst or per-shot trigger', () => {
    expect(bridS2Riders.length).toBeGreaterThan(fbStarts); // not FB-keyed
    for (const e of bridS2Riders) expect(e.srcSlot).toBe('skill2');
    // Nearest-wrong: threshold 10 (or a per-shot trigger). Doubling the threshold must halve
    // the fire count; a shotFired encoding would land near 0.1 and fail this band.
    const ratio = bridS2Riders10.length / bridS2Riders.length;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.65);
  });

  it('skill2 rider magnitude is the authored 675% (halving it halves its contribution)', () => {
    const full = totals(base.res)[SLUG] - totals(s2RiderOff.res)[SLUG];
    const half = totals(s2RiderHalf.res)[SLUG] - totals(s2RiderOff.res)[SLUG];
    expect(full).toBeGreaterThan(0);
    expect(half / full).toBeCloseTo(0.5, 3);
  });

  it('the two riders sit at the kit 636 : 675 ratio', (ctx: any) => {
    // Compares the best-buffed in-FB instance of each rider, so buff state cancels. Skipped if
    // the damage event carries no numeric amount field under any of the probed names.
    const a1 = bridS1Riders
      .map(amountOf)
      .filter((v) => typeof v === 'number') as number[];
    const a2 = bridS2Riders
      .filter((e) => e.inFullBurst === true)
      .map(amountOf)
      .filter((v) => typeof v === 'number') as number[];
    if (!a1.length || !a2.length) {
      ctx.skip();
      return;
    }
    expect(Math.max(...a1) / Math.max(...a2)).toBeCloseTo(636 / 675, 1);
  });

  // --- burst) ATK UP 66.52% of the skill user ATK, allies except self ---------
  it('burst ATK grant is caster-scaled, allies-except-self, and time-bounded', () => {
    expect(bridBurstBuffs.length).toBeGreaterThanOrEqual(3); // non-vacuity: she casts at least once
    expect(bridBurstBuffs.length % 3).toBe(0); // 3 recipients per cast (4-unit comp minus self)
    for (const e of bridBurstBuffs) {
      expect(e.stat).toBe('casterAtkPct'); // not atkPct: it scales the CASTER ATK, not the target
      expect(e.value).toBeGreaterThan(500); // FLAT-resolved ATK at apply time, never the raw 66.52
      expect(near(e.value, 66.52)).toBe(false);
      expect(e.durationShots ?? null).toBeNull(); // 10 SECONDS, not 10 rounds
      expect(e.targetSlug).not.toBe(SLUG); // except self
    }
    expect(new Set(bridBurstBuffs.map((e) => e.targetSlug)).size).toBe(3);
  });

  it('burst ATK grant moves every ally and is inert on self', () => {
    expect(totals(burstBuffOff.res)[SLUG]).toBe(totals(base.res)[SLUG]); // except-self is real
    for (const s of otherSlugs) {
      expect(totals(base.res)[s]).toBeGreaterThan(totals(burstBuffOff.res)[s]);
    }
  });

  // --- cross-line inertness ---------------------------------------------------
  it('both damage riders are self-only: removing either moves no teammate', () => {
    for (const s of otherSlugs) {
      expect(totals(s1RiderOff.res)[s]).toBe(totals(base.res)[s]);
      expect(totals(s2RiderOff.res)[s]).toBe(totals(base.res)[s]);
    }
  });

  it.skip('ACTIVE case for both Wind Code Damage Taken lines needs a Wind-boss fixture', () => {
    // controlComp pins a Fire boss and exposes no boss-element parameter, so the gate can only be
    // shown INERT here plus live-when-ungated (above). A Wind-boss comp helper would close this.
  });
});
```

## 6. S6 BLIND OVERRIDE (claude-opus-5)

````json
{
  "slug": "brid-silent-track",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "enemy"
      },
      "bossElementGate": "Wind",
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 15.12,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 636
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 10
      },
      "target": {
        "kind": "enemy"
      },
      "bossElementGate": "Wind",
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 12.12,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 5
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 675
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
        "kind": "allies",
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 66.52,
          "durationSec": 10
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
    "⚑ hitCount granularity: both skill2 blocks say 'normal attack(s)'. Authored as ROUNDS (trigger pulls) — for a SG one pull = one round (hitsPerShot 10 = pellets, ammo spend 1/pull). If the engine counts PELLET hits, both blocks fire 10x too often (huge over-credit). Must be confirmed against sim.ts hitCount accounting / a popup count before this override is trusted.",
    "⚑ Both damage riders (636% FB-enter, 675% every-5) are authored WITHOUT noFb (FB-by-timing default ON) and WITHOUT core (no 'core strike damage' wording). Crit flag intentionally omitted so the engine's rider-crit convention governs.",
    "Both 'Damage Taken ▲' lines are boss DEBUFFS benefiting the whole team, not self buffs — modeled as target:enemy damageTakenPct; the Wind Code scope is a bossElementGate, so BOTH are INERT on the neutral scope-lock boss and on the Fire-boss control fixture. This unit's entire skill1-a/skill2-a support value is therefore unobservable on graded comps.",
    "'1 …enemy unit(s) with the lowest remaining HP' collapses to the single boss in v1 — no targeting model needed, no line dropped.",
    "Not applicable to this kit (no ⚑ needed): weapon-swap economy, stack/currency steady-state, Hit-Rate→core magnitude, DoT encoding, HP/DEF scalers, round-count durations. No kit line lacks an activation clause, so no invented trigger.",
    "noRange left unset on all riders (engine-automatic per methodology)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the raw kit prose only (S6 cross-family). Brid: Silent Track = SG/Fire/Supporter/Burst II. skill1 = two independent fullBurstEnter blocks: a Wind-Code-gated Damage Taken ▲15.12%/10s boss debuff and an all-enemy 636% instant hit. skill2 = two independent hitCount blocks at DIFFERENT thresholds (10 normals → Wind-gated Damage Taken ▲12.12%/10s; 5 normals → 675% hit) — deliberately NOT merged, the counts differ. burst = burstCast (own-burst keyed, NOT fullBurstEnter) casterAtkPct 66.52 to allies excluding self for 10s. ⚑ Open: hitCount round-vs-pellet granularity for a 10-pellet SG; SG cadence tuple (datamined ammo 9 / reloadFrames 111 / no fire rate in the prose) sets how often the every-5 and every-10 blocks fire; per-kit noFb unmeasured (defaulted OFF = riders take the +50% FB major by timing)."
}```

## 7a. DRIVER IMPLEMENTATION — scripts/tests/units/brid-silent-track.test.ts
```ts
// PER-UNIT KIT SPEC — `brid-silent-track` (Brid: Silent Track, Supporter/SG/Fire, Burst II,
// cd 20s, ammo 9, hitsPerShot 10 pellets, reloadFrames 111). Kit-autonomy gauntlet 2026-07-25.
//
// One assertion group per KIT LINE (B1..B5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['brid-silent-track'].skills):
//   S1 ■ entering Full Burst → all Wind Code enemies: Damage Taken ▲15.12% for 10 sec        [B1]
//      ■ entering Full Burst → all enemies: 636% of final ATK as damage                       [B2]
//   S2 ■ after 10 normal attacks → 1 Wind Code enemy (lowest HP): Damage Taken ▲12.12% / 10s  [B3]
//      ■ after 5 normal attacks → 1 enemy (lowest HP): 675% of final ATK as damage            [B4]
//   BU ■ all allies (except self): ATK ▲66.52% of the skill user's ATK for 10 sec              [B5]
//
// Disposition: ALL FIVE lines FAITHFUL. The override is PROMOTED + SOLO-VALIDATED 2026-07-16
// (measured solo read 74,592,500; S2 675% rider measured EXACTLY every 5th pull). This gauntlet
// re-validates the loaded encoding test-first and discriminates each line against its nearest
// wrong model.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   B1/B3  the two Damage-Taken debuffs are GATED on a Wind-Code boss (`bossElementGate:'Wind'`).
//          The scope-lock boss is neutral/Fire, so the faithful model is INERT there: shipped vs
//          debuff-removed must be byte-identical on a Fire boss, and no damageTakenPct event may
//          appear. The counterfactual that DROPS the gate fires the debuff vs the Fire boss (events
//          appear, totals move) — i.e. the shipped inertness is one the ungated model provably
//          fails. A Wind-boss run proves the gate OPENS correctly (events appear at the kit value).
//   B2     636% on fullBurstEnter: fires once per Full Burst window (count == fullBurstStart
//          count), in the skill bucket, and — FB by TIMING (no noFb) — takes the +50% FB major.
//          A burstCast trigger or a noFb model fails one of these.
//   B4     675% on hitCount 50 (5 shots × 10 pellets): the recurring rider. Count == floor(shots/5).
//          The SHOT-vs-PELLET reading (override FLAG b) is discriminated by a hitCount-5 counterfactual
//          (the "5 NA = 5 pellets" misreading) which fires ~10× more often.
//   B5     casterAtkPct (a grant of FLAT ATK = 66.52% of the CASTER's static ATK) on all allies
//          EXCEPT self. excludeSelf is discriminated by an includes-self counterfactual (brid joins
//          her own targets). The 66.52 magnitude is pinned against a 100% counterfactual whose flat
//          grant equals the caster's static ATK exactly (shipped/100% == 0.6652).
//
// UNMODELED (inert in the partless single-boss scope-lock, documented not asserted):
//   - B3/B4 "lowest remaining HP" single-target selection — the engine has no HP pool, so the
//     selector is indeterminate; vs the ONE scope-lock boss it is identical to a plain enemy target.
//     The override targets `enemy`; board-inert today.
//   - SG cadence tuple (pullsPerSec/reloadFrames) + SG spray/core bands (override FLAGS a, c): her
//     OWN SG damage is low-confidence, but every kit LINE is still modeled; these are magnitude
//     ⚑s on the weapon model, not missing kit lines. No assertion (inert stats per gauntlet rule).
//
// Fixture: liter (B1) / brid-silent-track (B2, sole B2 → casts every Full Burst) / ada (B3) /
// helm (B3), focus ada — the 720-kit-audit control core with crown swapped for brid so her burst
// cadence is clean. Deterministic (no seed). Wind-boss run shares the same rotation.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'brid-silent-track';
/** comp slot order: liter 0 / brid 1 / ada 2 / helm 3. */
const BRID = 1;
const COMP_SIZE = 4;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const bridComp = (bossElement: Element): CompOptions => ({
  slugs: ['liter', SLUG, 'ada', 'helm'],
  bossElement,
  focusSlug: 'ada',
});

function run(bossElement: Element, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...bridComp(bossElement),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasFlat = (b: any, atkPct: number) =>
  b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === atkPct);
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** B2 reference: her S1 636% nuke removed entirely. */
const noS1Nuke = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasFlat(b, 636));
  if (ov.skill1.length === before)
    throw new Error('brid S1 636% block missing — fixture is stale');
});
/** B4 reference: her S2 675% rider removed entirely. */
const noS2Nuke = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasFlat(b, 675));
  if (ov.skill2.length === before)
    throw new Error('brid S2 675% block missing — fixture is stale');
});
/** B1 counterfactual: the S1 Wind debuff with its element gate DROPPED (fires vs any boss). */
const ungateS1 = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'damageTakenPct'));
  if (!b || !b.bossElementGate)
    throw new Error(
      'brid S1 gated damageTakenPct block missing — fixture is stale',
    );
  delete b.bossElementGate;
});
/** B3 counterfactual: the S2 Wind debuff with its element gate DROPPED. */
const ungateS2 = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'damageTakenPct'));
  if (!b || !b.bossElementGate)
    throw new Error(
      'brid S2 gated damageTakenPct block missing — fixture is stale',
    );
  delete b.bossElementGate;
});
/** B4 counterfactual: the SHOT-vs-PELLET misreading — hitCount 5 instead of 50 (≈10× the riders). */
const s2PelletMisread = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => hasFlat(x, 675));
  if (!b || b.trigger.count !== 50)
    throw new Error('brid S2 hitCount-50 rider missing — fixture is stale');
  b.trigger.count = 5;
});
/** B5 counterfactual: the burst buff INCLUDES self (excludeSelf dropped). */
const burstInclSelf = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b || b.target.excludeSelf !== true)
    throw new Error(
      'brid burst excludeSelf casterAtkPct block missing — fixture is stale',
    );
  delete b.target.excludeSelf;
});
/** B5 magnitude reference: 100% of caster ATK → the flat grant equals the caster's static ATK. */
const burst100 = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error(
      'brid burst casterAtkPct effect missing — fixture is stale',
    );
  e.value = 100;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run('Fire');
const wind = run('Wind');
const noS1 = run('Fire', { [SLUG]: noS1Nuke });
const noS2 = run('Fire', { [SLUG]: noS2Nuke });
const ungS1 = run('Fire', { [SLUG]: ungateS1 });
const ungS2 = run('Fire', { [SLUG]: ungateS2 });
const pelletMisread = run('Fire', { [SLUG]: s2PelletMisread });
const inclSelf = run('Fire', { [SLUG]: burstInclSelf });
const b100 = run('Fire', { [SLUG]: burst100 });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const bridDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const bridShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** boss debuff events at an exact kit value (brid-specific magnitudes isolate her lines). */
const takenDebuff = (evs: SimEvent[], value: number) =>
  buffs(evs).filter((b) => b.stat === 'damageTakenPct' && b.value === value);
/** brid's casterAtkPct grants (the burst support line). */
const casterAtkGrants = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.stat === 'casterAtkPct' && b.casterIdx === BRID);

describe('brid-silent-track — kit spec', () => {
  describe('B1 — S1 Wind-Code Damage Taken ▲15.12% (Full Burst entry, 10s) is element-GATED', () => {
    it('is INERT vs the non-Wind (Fire) scope-lock boss — no debuff event appears', () => {
      expect(takenDebuff(base.events, 15.12).length).toBe(0);
    });

    it("removing it changes NO unit's total vs the Fire boss (it contributes nothing there)", () => {
      // The ungated counterfactual fires the debuff vs Fire and MOVES totals; shipped does not.
      expect(ungS1.totals).not.toEqual(base.totals);
    });

    it('DISCRIMINATING: dropping the gate fires the 15.12% debuff vs the Fire boss', () => {
      expect(takenDebuff(ungS1.events, 15.12).length).toBeGreaterThan(0);
    });

    it('OPENS vs a Wind boss at the kit value, on the boss, for 10 sec', () => {
      const applied = takenDebuff(wind.events, 15.12);
      expect(
        applied.length,
        'no 15.12% debuff vs a Wind boss — the gate never opened',
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(
          b.targetIdx,
          'the debuff must land on the boss (targetIdx null)',
        ).toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });
  });

  describe('B2 — S1 636% final-ATK nuke on Full Burst entry, FB by timing', () => {
    const nukes = bridDamage(base.events, 'skill1');

    it('fires once per Full Burst window at the kit magnitude, in the skill bucket', () => {
      expect(nukes.length, 'no S1 nuke fired').toBeGreaterThan(0);
      expect(nukes.length).toBe(fbStarts(base.events).length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([636]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('takes the +50% Full Burst major (FB by TIMING — no noFb on this rider)', () => {
      expect(
        nukes.every((d) => d.fbMajorApplied),
        'a noFb model would drop the FB major',
      ).toBe(true);
    });

    it('DISCRIMINATING: removing it deletes the skill1 nuke entirely', () => {
      expect(bridDamage(noS1.events, 'skill1').length).toBe(0);
    });
  });

  describe('B3 — S2 Wind-Code Damage Taken ▲12.12% (every 10 NA = hitCount 100, 10s) is element-GATED', () => {
    it('is INERT vs the non-Wind (Fire) scope-lock boss — no debuff event appears', () => {
      expect(takenDebuff(base.events, 12.12).length).toBe(0);
    });

    it('DISCRIMINATING: dropping the gate fires the 12.12% debuff vs the Fire boss', () => {
      expect(takenDebuff(ungS2.events, 12.12).length).toBeGreaterThan(0);
      expect(ungS2.totals).not.toEqual(base.totals);
    });

    it('OPENS vs a Wind boss at the kit value, on the boss, for 10 sec', () => {
      const applied = takenDebuff(wind.events, 12.12);
      expect(
        applied.length,
        'no 12.12% debuff vs a Wind boss — the gate never opened',
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.targetIdx).toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('counts ROUNDS not pellets: one proc per 10 shots (hitCount 100 at 10 pellets/shot)', () => {
      // The reviewer's biggest quantitative trap: a pellet-counting model crosses hitCount 100
      // every SINGLE pull (10 pellet-hits), firing ~10× too often. Round counting fires floor(shots/10).
      const shots = bridShots(wind.events).length;
      const procs = takenDebuff(wind.events, 12.12).length;
      expect(procs).toBe(Math.floor(shots / 10));
    });
  });

  describe('B4 — S2 675% final-ATK rider every 5 normal attacks (hitCount 50 at 10 pellets/shot)', () => {
    const riders = bridDamage(base.events, 'skill2');
    const shots = bridShots(base.events).length;

    it('fires at the measured every-5th-pull cadence (floor(shots/5)) at the kit magnitude', () => {
      expect(riders.length, 'no S2 rider fired').toBeGreaterThan(0);
      expect(riders.length).toBe(Math.floor(shots / 5));
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([675]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: the pellet misreading (hitCount 5) fires ~10× more riders', () => {
      const misread = bridDamage(pelletMisread.events, 'skill2').length;
      expect(misread).toBeGreaterThan(riders.length * 2);
    });

    it('DISCRIMINATING: removing it deletes the skill2 rider entirely', () => {
      expect(bridDamage(noS2.events, 'skill2').length).toBe(0);
    });
  });

  describe('B5 — burst ATK ▲66.52% of caster ATK on all allies EXCEPT self, 10s', () => {
    const grants = casterAtkGrants(base.events);

    it('reaches every ally except brid herself', () => {
      expect(grants.length, 'no casterAtkPct grant fired').toBeGreaterThan(0);
      const targets = new Set(grants.map((b) => b.targetIdx));
      expect(
        targets.has(BRID),
        'excludeSelf violated — brid is among her own targets',
      ).toBe(false);
      expect(targets.size, 'must reach the other 3 allies').toBe(COMP_SIZE - 1);
    });

    it('DISCRIMINATING: dropping excludeSelf adds brid to her own targets', () => {
      const targets = new Set(
        casterAtkGrants(inclSelf.events).map((b) => b.targetIdx),
      );
      expect(targets.has(BRID)).toBe(true);
      expect(targets.size).toBe(COMP_SIZE);
    });

    it("is 66.52% of the caster's static ATK (a flat-ATK grant, not a raw percentage)", () => {
      const shipped = [...new Set(grants.map((b) => b.value))];
      const ref = [
        ...new Set(casterAtkGrants(b100.events).map((b) => b.value)),
      ];
      expect(
        shipped.length,
        'the flat grant must be a single constant value',
      ).toBe(1);
      expect(ref.length).toBe(1);
      // 100% counterfactual grant == caster static ATK; shipped == 0.6652 × that.
      expect(shipped[0] / ref[0]).toBeCloseTo(0.6652, 6);
    });

    it('lasts 10 sec', () => {
      for (const b of grants) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
  });
});
````

## 7b. DRIVER IMPLEMENTATION — src/skills/overrides/brid-silent-track.json

```json
{
  "note": "PROMOTED + SOLO-VALIDATED 2026-07-16 (loaded override). Solo real/sim 1.058 (real 74,592,500). || SG NOTE 2026-07-16: the old 'core bands HR-contaminated' cap is DEAD (isabel solo read confirmed SG core bands HR-clean). She now has her OWN measured solo read — docs/probe-data/brid-silent-track-sg-band.json (end screen 74,592,500; per-band M mid 0.984 / near1 1.224 / far 0.709 / midfar 0.866 / near2 1.374; ATK term measured +1.63% above scope-lock nominal, rider-confirmed) — SG landing at range remains the open lever (LOG 2026-07-16: no engine change; per-unit facts recorded). || Brid: Silent Track — Fire SG Burst II Supporter (ammo 9, reloadFrames 111, hitsPerShot 10 pellets). Her VALUE is the team casterAtk buff, not her own (SG-capped) damage. MODEL: (burst) ATK ▲ 66.52% of caster's ATK to allies 10s on burstCast — main support line; kit 'Affects all allies (except self)' now modeled on `allies` excludeSelf:true [2026-07-17 EXCLUDE-SELF FIX — the `allies` target gained excludeSelf; removes the prior minor self-inflation of her own SG-capped damage; brid is not board-measured so this is faithful-but-board-inert today]. (S1) 636% flatDamage on fullBurstEnter (fires each rotation FB); function rider → crits at sheet rate, no core (no 'core strike' text), FB by TIMING (default noFb OFF — lands at FB enter so gets +50%, prior 2). (S2) 675% flatDamage every 5 normal attacks → hitCount 50 (5 shots × hitsPerShot 10 = 50 pellet-hits; engine hitCounter increments by hitsPerShot/shot, sim.ts:1677) — recurring rider, big cumulative (41.6% of her solo total), crit/no-core/FB-by-timing. MEASURED 2026-07-16 (solo read): trigger CONFIRMED = every 5th PULL (43 riders = floor(215 pulls/5) EXACT, fires as a separate event ~6 frames after the 5th pull, zero fusions); fixed values 673,819 non-crit / 1,010,728 crit = EXACTLY 675.00% at the measured effective term 99,825.6. That term ≈ base 98,227 (static 98,367 − bossDef 140) + her Elysion-Supporter max bond ATK 1367 = 99,594, i.e. the ~+1.63% elevation was the RELATIONSHIP bonus, now modeled globally [DECISIONS/open-questions U18] (the remaining ~0.23% is measurement-basis slack). Coefficient stays the FAITHFUL kit 675% — with the term now correct the rider lands on the measured value; no per-unit fudge. (Historical: before relationship was modeled the sim's term read ~1.6% under, which this note previously flagged as unresolved.) resolved). WIND-CODE DEBUFFS NOW MODELED (bossElementGate, 2026-07-17): the two Wind-Code-gated boss debuffs (S1 Damage Taken ▲15.12%/10s on FB enter; S2 Damage Taken ▲12.12%/10s after 10 NA = hitCount 100) use the new `bossElementGate: 'Wind'` block gate — element-gated composed with their real triggers (fullBurstEnter / hitCount). INERT vs a non-Wind (incl. the neutral scope-lock) boss; vs a Wind boss they become active team-wide damageTaken amps (a big lever) — see FLAG d. (Previously parked as SKIPPED-CONDITIONAL in this note because the schema had no way to compose element-gating with an event trigger.) No heal/shield/DEF/HP/lifesteal/gauge/reload/ammo lines in this kit; nothing else parked in ignored. ⚑ FLAGS: (a) CADENCE TUPLE — pullsPerSec datamine not supplied + reloadFrames 111 datamine; SG default rate, ammo 9 empties in >1s so no fire-mode escalation; est = class-default SG cadence + reloadFrames 111; recipe = read rounds/min + reload gap from a focus video. (b) SG 'normal attack' = SHOT vs PELLET — 10× lever on both S2 counters; shipped the standard SHOT reading (5 NA = 5 shots = hitCount 50; 10 NA = 10 shots = hitCount 100); if pellets were meant divide by 10; recipe = count shots between 675% popups in a focus video. (c) SG SPRAY UNDER-MODEL + HR-contaminated core bands (G4) — her own SG spray/core damage is low-confidence (~1.5× under per noir/dorothy anchors); est = engine default bands; recipe = SG-clean-anchor re-derivation (open fix #2). (d) WIND-CODE CONDITIONAL DEBUFFS off by default (non-Wind boss); est = OFF; recipe = confirm boss element, if Wind enable both as damageTakenPct enemy buffs (15.12% team-wide FB-enter + 12.12% per-10-NA). (e) noFb on the 636%/675% riders = default OFF (FB by timing, prior 2); set noFb:true ONLY with measured FB-OFF popups; recipe = focus popup value FB-on vs FB-off. (f) burst target 'allies except self' now expressible → `allies` excludeSelf:true (fixed 2026-07-17); self-inflation gone. || Kit-autonomy gauntlet 2026-07-25: re-validated test-first — scripts/tests/units/brid-silent-track.test.ts (18 assertions GREEN vs this override; each line pinned GREEN vs shipped and RED vs its nearest-wrong counterfactual: ungated Wind-debuff leak, removed 636%/675% riders, pellet-misread hitCount, includes-self burst, 100%-caster magnitude reference). Cross-family S2b (claude-fable-5) independently re-derived all 5 lines FAITHFUL with matching discriminations, no REAL-GOTCHA; dispositions converge. TIER 2 (bossElementGate status-gate + hitCount round-count cadence + fullBurstEnter-vs-burstCast + meta-defining casterAtk party buff). The two kit-status findings (Wind-deboss composition, excludeSelf) were already fixed 2026-07-17 and are re-confirmed here.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 636
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "bossElementGate": "Wind",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 15.12,
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
        "count": 50
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 675
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 100
      },
      "bossElementGate": "Wind",
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 12.12,
          "durationSec": 10
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
        "kind": "allies",
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 66.52,
          "durationSec": 10
        }
      ]
    }
  ],
  "caveats": [
    "skill1: Wind Code Damage Taken ▲ 15.12% (Full Burst entry, 10s) now modeled via bossElementGate 'Wind' — inert vs a non-Wind (incl. scope-lock) boss; a big team-wide lever if the boss is Wind.",
    "skill2: Wind Code Damage Taken ▲ 12.12% (every 10 normal attacks = hitCount 100 at 10 pellets/shot, 10s) now modeled via bossElementGate 'Wind' — inert vs a non-Wind boss; stacks with the skill1 debuff vs a Wind boss.",
    "burst: ATK ▲ 66.52% of caster's ATK on all allies EXCEPT self (kit 'except self') — excludeSelf:true enforced on the `allies` target since 2026-07-17; no longer self-inflates her own SG-capped damage.",
    "skill2: kit targets '1 enemy with the lowest remaining HP' (both the 675% rider and the 12.12% Wind debuff); the engine has no HP pool, so the selector is indeterminate and resolves to the plain enemy target — identical to the sole partless scope-lock boss, board-inert today (gauntlet 2026-07-25)."
  ]
}
```
