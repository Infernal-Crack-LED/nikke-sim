# S7 RECONCILING JUDGE PACKET — chisato (Chisato)

## DRIVER PREAMBLE (context for the judge — grade the artifacts, not this prose)

**Unit:** Chisato — SMG / Attacker / Iron / Burst III, cd 40s, ammo 120, reloadFrames 81, hitsPerShot 1, normalMult 10.12, coreMult 250, critRate 15 / critDamage 150. NOT a variant.

**Convergence summary (driver claim — verify against artifacts below):**
- S2b (claude-fable-5) independently re-derived the SAME model: Extrasensory decay (battle-start 100%, -1%/2s = 0.5%/s, burst recharge to 100%; >70% ATK 53.69 lapses ~60s, >55% True Damage 48.62 ~90s, >25% Hit Rate 22.37 ~150s), skill2 trueNormals flavor conversion (burstCast, takina precedent), hitCount-48 -> 472.18% true rider, burst ATK 73.16/10s, invuln UNMODELED.
- S5 (claude-opus-5) blind test authored from prose alone (leakDetected null). Run against the driver SHIPPED override: **35 passed / 1 skipped (the invuln GAP)** = GREEN convergence. The blind test needed FOUR schema-only adaptations to run at all (the blind writer assumed a slightly different event/override shape); none changes an assertion intent: (1) override slots are arrays directly, not {blocks:[...]} (.blocks removed, 20 sites); (2) an absent durationShots is null on the event, not undefined (toBeUndefined->toBeNull); (3) there is NO "core" damage bucket — core-ness is the per-hit coreRate field, so the HR->core direction test reads max coreRate on normals instead of summing a non-existent core bucket; (4) the weapon-state over-modeling guard filters by chisato as CASTER (casterIdx) not HOLDER (targetSlug) — controlComp teammates legitimately buff chisato with weapon-state stats. All four are documented inline in blind/chisato.adapted.test.ts.
- S6 (claude-opus-5) blind override (leakDetected null) independently chose the SAME mechanics with a MORE LITERAL encoding: a real extrasensory resource pool (initial 100) + interval-2s resourceGated tier buffs (durationSec 2, self-refreshing) + interval decay (resource delta -1) + burst resource recharge (delta +100). Critically it INDEPENDENTLY chose the same trueNormals weaponSwap (damagePct 10.12, 10s, burstCast) and the same hitCount-48 472.18 true rider (it set crit:true explicitly; no core). The driver instead encodes the gauge trajectory as FUSED PASSIVES (durationSec 60/90/150 + burstCast refresh) — trajectory-equivalent, same observable lapse ladder, using existing primitives without a resource-pool config. Both are faithful; the encoding MECHANISM differs (see diff in section 6).

**ENGINE GROUND TRUTH the judge must use (verified by driver via code read + probe + git archaeology):**
- There is NO `crit && !trueFlavor` guard in src/engine/sim.ts on this branch (git log -S "!opts.trueFlavor" is EMPTY). Swap normals hardcode crit:true (sim.ts:2843); the flatDamage path uses crit:e.crit!==false (sim.ts:1844). Therefore chisato’s true swap normals AND her skill2 true rider are crit+core ELIGIBLE in the current engine (probe-confirmed: critEligible/coreEligible true on window normals; rider critEligible true, coreEligible false because the rider sets no core:true). This matches open-questions.md:481 ("true-damage-window normals RETAIN core+crit — MEASURED, faithful"). DECISIONS.md:554 claims a guard LANDED but it is not in the code on this branch — a doc/code inconsistency. Whether true damage SHOULD crit/core is an ENGINE-fidelity question OUT-OF-DOMAIN for the override (the override faithfully encodes trueNormals / flavor:true; the crit/core routing is the engine’s). The driver documented this as a ⚑ and corrected the override note’s stale "crit OFF / crit&&!trueFlavor guard" claim.
- A trueNormals same-weapon flavor swap does NOT refill the magazine (sim.ts:1944 `if (!e.trueNormals) owner.ammo = maxAmmo` + sim.ts:2487 "same-weapon flavor swap -> no free reload on exit either"). So the trueNormals encoding carries NO shot-count optimism. The driver corrected the override note’s stale "swap mag-refill optimism" claim. The S6 blind override flagged this as a ⚑ to verify ("if the engine grants a fresh magazine on swap entry, verify shot-count parity") — RESOLVED: no refill.
- trueDamagePct is flavor-gated into the Damage-Up bucket (sim.ts:1414 `(opts.trueFlavor ? stat(u,"trueDamagePct",frame) : 0)`): it applies ONLY to true-flavored hits (the swap-window normals + the true rider), never to non-true normals. hitRatePct feeds the SMG core rate via acrForHR (sim.ts:1356-1358).

**Driver disposition of kit lines:** FAITHFUL: S1 ATK 53.69 / True Damage 48.62 / Hit Rate 22.37 (fused passives 60/90/150s + burstCast refresh); S2 trueNormals swap (burstCast, 10s, damagePct 10.12); S2 hitCount-48 -> 472.18 true rider; burst ATK 73.16/10s. UNMODELED (inert/bookkeeping): S1 battle-start charge + 1%/2s drain (folded into the fused-passive trajectory); S1 invuln 2s (boss-inert); burst recharge (folded into the skill1 burstCast refresh). No JSON effect block was changed in S3 — only the note addendum (gauntlet date + corrected the two stale engine claims) + verbatim unmodeled entries + a corrected caveat.

---

## 1. JUDGE CONTRACT (RECONCILING-JUDGE.md)

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


---

## 3. GROUND TRUTH — kit prose + base stats (data/characters.json -> characters.chisato)

```json
{
  "slug": "chisato",
  "name": "Chisato",
  "weapon": "SMG",
  "burst": "III",
  "class": "Attacker",
  "element": "Iron",
  "burstCooldownSec": 40,
  "normalAttackMultiplier": 10.12,
  "coreAttackMultiplier": 250,
  "ammo": 120,
  "reloadFrames": 81,
  "chargeFrames": 0,
  "hitsPerShot": 1,
  "rl3": 5.7,
  "burstGaugePerShot": 0.1,
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 78,
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
    "resourceId": 860
  },
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects self.\nCharges Extrasensory to 100%, up to 100%. This effect is continuous and cannot be removed.\n■ Activates while in Extrasensory status. Affects self.\nEffects vary according to the charge level of Extrasensory. Each subsequent effect triggers all effects before it:\nOnly when at 100%: Dodging Bullets: Invulnerable for 2 sec.\nOnly when above 70%: ATK ▲ 53.69%. This effect is continuous and cannot be removed.\nOnly when above 55%: True Damage ▲ 48.62%. This effect is continuous and cannot be removed.\nOnly when above 25%: Hit Rate ▲ 22.37%. This effect is continuous and cannot be removed.\n■ Affects self every 2 sec.\nExtrasensory ▼ 1%.",
    "skill2": "■ Activates when using Burst Skill. Affects self.\nNormal attacks deal true damage for 10 sec.\n■ Activates after landing 48 normal attack(s). Affects the target.\nDeals 472.18% of final ATK as true damage.",
    "burst": "■ Affects self.\nCharges Extrasensory to 100%.\nATK ▲ 73.16% for 10 sec."
  }
}
```

---

## 4. S2b PRE-OP REVIEW (claude-fable-5) — reviews/chisato.test-review.json

```json
{
  "slug": "chisato",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start of battle: Extrasensory to 100%",
      "disposition": "FAITHFUL",
      "scope": "resource-pool initialization, not a damage/gauge effect",
      "durationSemantics": "permanent ('continuous and cannot be removed') — pool persists, only moved by decay/recharge",
      "triggerIdentity": "battle-start passive; encode as CharacterSkills.resources initial:100 (min 0, max 100), NOT a fired block",
      "targetSet": "self",
      "nearestWrongModel": "misread 'Charges … to 100%' as fillGauge (BURST gauge) at t=0, accelerating the team's first Full Burst",
      "distinguishingAssertion": "first fullBurstStart frame in controlComp('chisato') is identical with skill1 stripped via withPatchedOverride vs committed override (green: no gauge effect); a fillGauge encoding shifts the first FB earlier (red). Also green: atkPct 53.69 buffApply present at/near frame 0 because the pool starts full",
      "inertness": "burst-gauge economy and FB rotation cadence must NOT move",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Only when at 100%: Invulnerable 2 sec",
      "disposition": "UNMODELED",
      "scope": "defensive only; v1 boss deals no damage",
      "durationSemantics": "2 s window, only at exactly 100% (instantaneous at start and each burst recharge)",
      "triggerIdentity": "resource-threshold ==100 gate",
      "targetSet": "self",
      "nearestWrongModel": "inventing a damage/uptime effect for it, or listing it as a block instead of unmodeled",
      "distinguishingAssertion": "no block/effect keyed to the 100% tier exists; totals identical with the line present vs absent",
      "inertness": "must move ZERO damage; must appear verbatim in override.unmodeled.skill1",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "above 70%: ATK ▲ 53.69% continuous",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK (atkPct), not normal-scoped",
      "durationSemantics": "permanent WHILE pool >70 — no durationSec, no durationShots; lapses only if the pool decays through the threshold",
      "triggerIdentity": "passive block with resourceGate {name:'extrasensory', min>70}; strict 'above' (70 exactly = off)",
      "targetSet": "self",
      "nearestWrongModel": "unconditional permanent passive with the resource machinery dropped entirely — calibration hides this because bursting every ~40s keeps the pool ≳80% so the buff never lapses on graded comps",
      "distinguishingAssertion": "withPatchedOverride removing the burst's recharge effect (or setting decay delta to -100): faithful model shows chisato's totals DROP and no active atkPct-53.69 contribution after t≈60s (100→70 at 30×2s ticks); the hardcoded-passive misread shows totals unchanged (red)",
      "inertness": "teammates' ATK must not move (self-only)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "above 55%: True Damage ▲ 48.62%",
      "disposition": "FAITHFUL",
      "scope": "trueDamagePct — Damage-Up bucket feeding TRUE-FLAVORED hits only (skill2's 472.18% proc always; her normals only inside the 10s post-burst true windows)",
      "durationSemantics": "permanent while pool >55 (lapse at t≈90s without recharge)",
      "triggerIdentity": "passive block, resourceGate min>55",
      "targetSet": "self",
      "nearestWrongModel": "generic attackDamagePct applied to ALL her damage at all times — over-credits every non-true normal outside the 10s windows",
      "distinguishingAssertion": "zeroing this line via withPatchedOverride changes the skill2 proc's per-hit damage and the in-window normal damage, but normal-attack damage events OUTSIDE the 10s windows are byte-identical (green); the generic encoding moves out-of-window normals too (red)",
      "inertness": "out-of-window, non-true normal-attack damage must NOT move",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "above 25%: Hit Rate ▲ 22.37%",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct — core-hit-rate lift via the engine's hrCoreMult path (SMG); NOT a damage-up stat",
      "durationSemantics": "permanent while pool >25 (would lapse only at t≈150s with no recharge)",
      "triggerIdentity": "passive block, resourceGate min>25",
      "targetSet": "self",
      "nearestWrongModel": "skipping it as 'accuracy = defensive/no damage', or encoding as a generic damage buff — hitRatePct is live by default (HRCORE) and moves core exposure",
      "distinguishingAssertion": "damage events' core rates with the line active exceed those with it zeroed, and the total delta is confined to the core bucket (mult/core fields on damage events); a skipped or damage-bucket encoding shows either no core movement or a non-core bucket shift (red)",
      "inertness": "crit rate and Damage-Up bucket must NOT move; only core does. Note the HR→core CONVERSION magnitude is the engine-global ⚑ (always-⚑ field 7), not per-unit",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "every 2 sec: Extrasensory ▼ 1%",
      "disposition": "FAITHFUL",
      "scope": "resource decay, not damage",
      "durationSemantics": "repeats forever; -1 per tick, clamped ≥0",
      "triggerIdentity": "interval sec:2 (no activation clause = interval; first fire t=2 per convention, ⚑ phase), effect kind:'resource' delta:-1",
      "targetSet": "self (owner pool)",
      "nearestWrongModel": "omitting the decay (pool pinned at 100 → thresholds never testable, invuln-tier 'always on'), or -1% of current (multiplicative) instead of -1 point per 2s",
      "distinguishingAssertion": "with the burst recharge stripped, the faithful linear decay produces the exact lapse ladder: atkPct-53.69 inactive after ~60s, trueDamage-48.62 after ~90s, hitRate-22.37 after ~150s (assert late-window damage events lack each contribution in that order); no-decay or multiplicative decay breaks the ladder timing (red)",
      "inertness": "no damage/gauge event may be emitted by the decay tick itself",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "on Burst: normals deal true dmg 10 sec",
      "disposition": "FAITHFUL",
      "scope": "FLAVOR conversion of her own normal attacks — same cadence/multiplier/ammo, hits become true-flavored (schema route: weaponSwap mirroring her SMG with trueNormals:true, the Takina-precedent encoding), so skill1's trueDamagePct feeds them for 10s",
      "durationSemantics": "10 s wall-clock (durationSec 10 — genuinely seconds here, not rounds)",
      "triggerIdentity": "burstCast (own-burst: 'Activates when using Burst Skill'), NOT fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "two-headed: (a) keyed to fullBurstEnter — over-credits every rotation in a two-B3 comp (controlComp includes helm as co-B3); (b) encoded as a trueDamagePct/attackDamagePct self-buff instead of a flavor conversion — double-dips with skill1's 48.62% and buffs the wrong bucket",
      "distinguishingAssertion": "in controlComp('chisato', true) count 10s windows in which normal-attack damage is true-flavored (boosted by the 48.62% bucket): green = exactly one per CHISATO burstCast event and none on FBs she didn't cast; fullBurstEnter keying yields window count == fullBurstStart count (red); trueDamagePct-buff encoding changes normals' mult without any flavor change and stacks to ~97% (red)",
      "inertness": "shots-fired count, ammo economy, and normal multiplier must NOT change — only the flavor tag / bucket eligibility",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "after landing 48 normal attacks: 472.18%",
      "disposition": "FAITHFUL",
      "scope": "instant flatDamage rider, 472.18% final ATK, flavor 'true' (kit-stated 'as true damage') — so skill1's 48.62% trueDamagePct must feed it",
      "durationSemantics": "instant per proc; counter resets and re-accrues",
      "triggerIdentity": "hitCount count:48 (counts ROUNDS; SMG hitsPerShot 1 so 48 pulls, ~one proc per ~2.4s of firing at ~20/s effective), UNGATED — runs in and out of FB; rider takes FB by landing timing (noFb default off), noRange per rider rule, no core (text lacks 'core strike')",
      "targetSet": "enemy (the target)",
      "nearestWrongModel": "flavor omitted (plain flatDamage) so skill1's True Damage ▲ never feeds it and the proc under-credits ~48.62 Damage-Up points; second-nearest: fbGate/burst-window gating (procs only during the 10s true window or in FB)",
      "distinguishingAssertion": "green: (1) proc count over the fight ≈ floor(total landed rounds / 48) including long out-of-FB stretches; (2) zeroing skill1's trueDamagePct line via withPatchedOverride changes the proc's per-hit damage. Red under flavor-less encoding: assertion (2) shows no change. Red under window-gating: assertion (1) collapses to procs only inside 10s/FB windows",
      "inertness": "proc cadence must NOT depend on burst/FB state; it must not receive core",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Charges Extrasensory to 100%",
      "disposition": "FAITHFUL",
      "scope": "resource refill (set-to-100 == delta +100 clamped to max), sustaining all three skill1 threshold tiers",
      "durationSemantics": "instant on cast; pool then resumes -1%/2s decay",
      "triggerIdentity": "burstCast (her own burst block), effect kind:'resource'",
      "targetSet": "self",
      "nearestWrongModel": "fillGauge (burst-gauge) misread — same trap as skill1's charge line, here it would pump the team gauge every rotation and distort FB cadence",
      "distinguishingAssertion": "green: FB rotation cadence (fullBurstStart frames) identical with this effect stripped; AND with it present the atkPct-53.69 contribution stays active for the whole fight (pool sawtooths ~100→80), while stripping it produces the t≈60s lapse — distinguishes refill from both fillGauge (cadence shifts, red) and no-op (no late-fight sustain, red)",
      "inertness": "burst gauge and FB timing must NOT move",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 73.16% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "generic self atkPct, additive with skill1's 53.69 in the ATK bucket",
      "durationSemantics": "10 s wall-clock (genuinely seconds; not rounds, not permanent)",
      "triggerIdentity": "burstCast self",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter keying (applies on helm's rotations too in the two-B3 control comp) or permanent/refresh-forever encoding",
      "distinguishingAssertion": "green: buffApply events with stat 'atkPct', value 73.16 (plain percentage stat keeps raw kit %) occur ONLY at chisato burstCast frames, each with expiresFrame − applyFrame == 10s of frames; fullBurstEnter keying emits one per fullBurstStart including non-chisato rotations (red); permanent encoding has no/∞ expiresFrame (red)",
      "inertness": "must not apply to allies; must not persist past 10s",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:start-charge-extrasensory-100",
    "skill1:atk-53.69-above-70",
    "skill1:true-damage-48.62-above-55",
    "skill1:hit-rate-22.37-above-25",
    "skill1:decay-1pct-per-2s",
    "skill2:true-normals-10s-on-burstcast",
    "skill2:hitcount-48-flat-472.18-true",
    "burst:recharge-extrasensory-100",
    "burst:atk-73.16-10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Only when at 100%: Dodging Bullets: Invulnerable for 2 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads the driver must reconcile: (1) BIGGEST: hardcoding the three Extrasensory threshold buffs as unconditional permanent passives and dropping the pool machinery — this is CALIBRATION-INVISIBLE on graded comps (bursting every ~40s holds the pool ≳80%, so no tier ever lapses; the pool math: -1%/2s ⇒ ATK lapses at ~60s, TrueDmg ~90s, HitRate ~150s without recharge). The only test that catches it perturbs the recharge/decay via withPatchedOverride; a test suite lacking such a perturbation cannot distinguish faithful from hardcoded. (2) 'Charges Extrasensory to 100%' appears TWICE (skill1 start, burst) and both are prone to a fillGauge (burst-gauge) misread — assert FB cadence inertness. (3) skill2's 'normal attacks deal true damage' is a FLAVOR conversion (weaponSwap trueNormals per the schema's Takina precedent), not a damage-up; encoding it as trueDamagePct double-counts with skill1's 48.62% and its trigger is burstCast, which diverges from fullBurstEnter precisely because controlComp ships helm as a co-B3 — the control fixture itself exercises the divergence. (4) The trueDamagePct(48.62) line is load-bearing almost entirely THROUGH skill2 (the always-true 472.18% proc + the 10s windows); a coupling test zeroing skill1's line and reading skill2's proc damage kills two nearest-wrongs at once. (5) hitCount counts ROUNDS; SMG hitsPerShot 1 makes pulls==rounds here, but effective fire rate is frame-quantized (60/ceil(60/nominal)) — don't assert proc cadence off the nominal rate. (6) 'above X%' is strict; boundary behavior (pool == 70) is a minor ⚑ convention, and the interval decay's first-fire phase (t=2 vs t=0) is the standard interval ⚑. (7) The invulnerability tier is the sole unmodeled line and must sit verbatim in unmodeled.skill1, never as an ignored-effect block.",
  "model": "claude-fable-5"
}

```

---

## 5. S5 BLIND TEST (claude-opus-5) — spec + result vs driver override

**RESULT vs driver SHIPPED override: 35 passed / 1 skipped (invuln GAP) = GREEN.** (Adapted test: blind/chisato.adapted.test.ts; 4 schema-only adaptations documented in the preamble above.)

Blind test per-line spec (the assertions it makes):
```json
[
  {
    "slot": "skill1",
    "kitLine": "Charges Extrasensory to 100%, up to 100%",
    "disposition": "FAITHFUL",
    "assertion": "Proves the Extrasensory pool STARTS FULL: the >70% ATK tier's first buffApply lands within the first second (frame ≤ 60) and is self-scoped. Fails under the nearest-wrong 'pool starts at 0 and charges up' model, which would delay or never emit the tier buffs, and under an allies-scoped mis-target (teammates carrying 53.69/48.62/22.37)."
  },
  {
    "slot": "skill1",
    "kitLine": "Only when at 100%: Invulnerable 2 sec",
    "disposition": "GAP",
    "assertion": "it.skip — purely defensive; the v1 boss deals no damage so invulnerability has no observable damage payload. Belongs in the override's `unmodeled` list. No assertion possible."
  },
  {
    "slot": "skill1",
    "kitLine": "Only above 70%: ATK ▲ 53.69%",
    "disposition": "FAITHFUL",
    "assertion": "Proves a SELF atkPct buff is emitted at exactly 53.69 (raw percentage, not flat-resolved — atkPct is a plain-percentage stat, unlike casterAtkPct) and is load-bearing: stripping it strictly lowers chisato's total while leaving liter/crown/helm byte-identical. Fails under (a) an inert tier the drain starved to death, (b) a casterAtkPct encoding (which would emit a flat ATK number, not 53.69), (c) an allies-scoped target."
  },
  {
    "slot": "skill1",
    "kitLine": "Only above 55%: True Damage ▲ 48.62%",
    "disposition": "FAITHFUL",
    "assertion": "SCOPE discrimination: proves the stat is `trueDamagePct` at 48.62 and that NO attackDamagePct buff carries that magnitude. Fails under the nearest-wrong generic-damage-up encoding, which would credit every bucket instead of only true-flavored damage. Also proves non-vacuity — the tier actually bites, because chisato has true-flavored damage (skill2-A normals + the 472.18% rider) for it to scale."
  },
  {
    "slot": "skill1",
    "kitLine": "Only above 25%: Hit Rate ▲ 22.37%",
    "disposition": "MEASUREMENT-GATED",
    "assertion": "Proves a SELF hitRatePct buff at 22.37 exists and that removing it strictly REDUCES chisato's core-bucket damage (direction only). ⚑ The Hit-Rate→core magnitude is measured-only (hrCoreMult), so no core rate is pinned. Fails under the nearest-wrong coreDamagePct encoding (a damage multiplier rather than a core-RATE lift) — separately asserted absent."
  },
  {
    "slot": "skill1",
    "kitLine": "every 2 sec: Extrasensory ▼ 1%",
    "disposition": "FIX",
    "assertion": "The structural claim of the unit. Kit-derived trajectory with no recharge: >70% dies at 60s, >55% at 90s, >25% at 150s of a 180s fight — so the tiers are TIME-GATED, not permanent, and only the burst's 'Charges to 100%' keeps them alive. Asserted two ways: (1) stripping the burst's resource recharge must not IMPROVE chisato (a zero delta flags that the drain is unmodeled and the recharge decorative); (2) tier liveness is a monotone PREFIX — the ATK-tier apply count can never exceed the Hit-Rate-tier count, since 100>70>55>25 nest and the pool only decreases between recharges. Fails under a 'three permanent passive buffs, drain ignored' model."
  },
  {
    "slot": "skill2",
    "kitLine": "Burst → normals true damage 10 sec",
    "disposition": "FAITHFUL",
    "assertion": "TRIGGER IDENTITY: 'Activates when using Burst Skill' → burstCast (own cast), NOT fullBurstEnter. helm is a second B3 in the fixture so the two genuinely diverge; asserts fullBurstStart count ≥ chisato's own burstCast count (making the divergence visible rather than assumed) and that removing the block strictly lowers chisato while leaving liter/crown untouched. Fails under an fullBurstEnter mis-keying, which fires on rotations chisato does not burst."
  },
  {
    "slot": "skill2",
    "kitLine": "after 48 normals: 472.18% true dmg",
    "disposition": "FAITHFUL",
    "assertion": "Proves a REPEATING hitCount:48 rider (fires >1 time over 180s — an SMG with ammo 120 crosses 48 rounds ~2.5×/magazine, so a once-per-battle encoding is refuted), that the threshold is 48 and not 24 (halving it strictly RAISES total — discriminates the pulls-vs-rounds misread), that the rider is load-bearing, that it is true-flavored (the trueDamagePct tier delta is non-zero), that it takes NO core bucket (kit never says 'core strike'), and that it targets the enemy (no ally damage attributed). Fails under: once-only, wrong count, plain flavor, core-enabled, or ally-targeted models."
  },
  {
    "slot": "burst",
    "kitLine": "Charges Extrasensory to 100%",
    "disposition": "FAITHFUL",
    "assertion": "Proves the recharge is real and keeps the >70% tier alive past t=60s (which the pure-drain trajectory could not reach). Paired with the skill1-drain counterfactual: stripping the burst's resource effect must not improve chisato. Fails under a model with no recharge (tiers go dark mid-fight) or one where the drain is unmodeled (recharge inert)."
  },
  {
    "slot": "burst",
    "kitLine": "ATK ▲ 73.16% for 10 sec",
    "disposition": "FAITHFUL",
    "assertion": "Four discriminations on one line. (1) MAGNITUDE + target: a SELF atkPct of 73.16, no ally carrying it. (2) DURATION SEMANTICS: wall-clock seconds — durationShots must be undefined and expiresFrame−frame ≈ 600 (10s @ 60fps); fails under a durationShots encoding (the nearest-wrong for a 120-round SMG). (3) EXPIRY: dropping durationSec (permanent) strictly RAISES damage, proving the window really closes — proven by counterfactual delta because the engine emits NO buffRemove on natural lapse. (4) TRIGGER: apply count === chisato's own burstCast count, and the fullBurstEnter counterfactual is ≥ baseline (over-credit direction)."
  },
  {
    "slot": "all",
    "kitLine": "(inertness / no-over-model guards)",
    "disposition": "FAITHFUL",
    "assertion": "Negative space. Proves: no ally-facing buffApply carries any chisato magnitude (the whole kit is self/enemy-scoped — 'Affects self' on every block but the rider); no boss-held debuff (casterIdx===null && targetIdx===null) carries a chisato magnitude (the kit inflicts no Damage Taken ▲ / targetStatus); no maxAmmo/reloadSpeed/fireRate/attackSpeed buff exists (theme-6 guard — the prose has no weapon-state line, so any such buff is invention); no swapped shots (no weaponSwap in the kit)."
  }
]
```

Blind test fixtures note:
```
controlComp('chisato', true) for every run — liter B1 / crown B2 / chisato B3 / helm B3, boss Fire, focus chisato. helm=true is REQUIRED here rather than merely convenient: chisato is Burst III, and a lone B3 makes ZERO Full Bursts, so B1+B2 are mandatory for her burst (and hence skill2-A's 10s true-normals window and the burst's Extrasensory recharge) to fire at all. Keeping helm as a SECOND Burst III is deliberate — it is the only way burstCast and fullBurstEnter can diverge, which is what makes the trigger-identity assertions on skill2-A and the burst ATK buff non-vacuous; a fixture with a single B3 would let a mis-keyed fullBurstEnter pass silently. helm's own buffs inflate absolute magnitudes, so every damage claim is made as a DELTA against a withPatchedOverride counterfactual (same fixture, one line mutated) rather than against an absolute number — helm's contribution cancels. 11 hoisted runs total (1 baseline + 9 module-level counterfactuals + 1 built inside the drain test), each a full 180s deterministic sim (no seed), under the ~20-run budget.
```

Blind test gaps (⚑/skips):
```json
[
  "skill1 'Only when at 100%: Dodging Bullets: Invulnerable for 2 sec' — it.skip. Purely defensive; the v1 boss deals no damage and there is no HP pool, so invulnerability has no observable payload of any kind. No primitive exists for it and none should be added. Belongs verbatim in the override's `unmodeled.skill1` list.",
  "⚑ NOT a skipped test but a flagged limit: the Hit Rate ▲ 22.37% → core-rate magnitude is measurement-gated (engine hrCoreMult path). The test asserts DIRECTION only (removing hitRatePct lowers core-bucket damage) and never pins a core rate. Pinning it would require a popup-read probe.",
  "⚑ Cadence: PULLS_PER_SEC and reloadFrames 81 are datamine-unreliable fields, so no assertion pins an absolute shot count, magazine boundary, or rider-fire count — only orderings (>1 fire), ratios, and counterfactual deltas.",
  "⚑ Extrasensory duty cycle: the exact frames at which each tier crosses its threshold depend on the realized burst rotation (drain 0.5%/s vs a ~40s-CD recharge to 100%). Tests assert tier LIVENESS, monotone tier ORDERING (ATK applies ≤ Hit-Rate applies, since 100>70>55>25 nest), and recharge directionality — never a specific expiry frame. The drain counterfactual is written as ≤ rather than < precisely so that an override which documents the drain as board-inert over 180s reports a DIVERGENCE to the judge instead of a silent pass.",
  "skill2-A 'Normal attacks deal true damage for 10 sec' — the flavor CHANGE (normals routed into the true bucket) is asserted only by load-bearing delta and by the burstCast-vs-fullBurstEnter count identity, not by reading a per-shot flavor field off the damage event; the harness cheat-sheet documents bucket/srcSlot/crit/core/mult on damage events but not a flavor field, so a direct flavor assertion would be guessing the event shape."
]
```

---

## 6. S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs driver override

### 6a. Blind override (blind/chisato.override.json)
```json
{
  "slug": "chisato",
  "resources": [
    {
      "name": "extrasensory",
      "initial": 100,
      "min": 0,
      "max": 100
    }
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 2
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "extrasensory",
        "min": 71
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 53.69,
          "durationSec": 2
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 2
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "extrasensory",
        "min": 56
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 48.62,
          "durationSec": 2
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 2
      },
      "target": {
        "kind": "self"
      },
      "resourceGate": {
        "name": "extrasensory",
        "min": 26
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 22.37,
          "durationSec": 2
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 2
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "extrasensory",
          "delta": -1
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
          "kind": "weaponSwap",
          "damagePct": 10.12,
          "weapon": "SMG",
          "maxAmmo": 120,
          "durationSec": 10,
          "trueNormals": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 48
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 472.18,
          "flavor": "true",
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "extrasensory",
          "delta": 100
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 73.16,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Only when at 100%: Dodging Bullets: Invulnerable for 2 sec."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ Extrasensory is modeled as a resource pool (initial 100, max 100) decaying 1 point per 2 sec (= 0.5%/s) and re-filled to 100 by her own burst. The three continuous tier buffs are re-evaluated on a 2-sec interval with durationSec 2 (self-refreshing) instead of as true always-on passives, because a `passive` trigger's resourceGate would be evaluated ONCE at frame 0 and could never lapse. Consequences: (a) the tiers are COLD for the first 2 sec of the fight (interval first-fires at t=sec, not t=0) — ~1.1% of a 180 s fight; (b) a threshold crossing is honored with up to 2 sec of latency.",
    "⚑ Threshold arithmetic: kit says 'above 70/55/25%' (strict). Decay is integer points, so strict-above == resourceGate min 71/56/26. Blocks are ordered gates-then-decay so each tick reads the PRE-decay pool, matching kit reading order.",
    "⚑ 'Normal attacks deal true damage for 10 sec' has NO non-weaponSwap channel in the schema — `trueNormals` exists only on weaponSwap. It is modeled as a mirror-swap (same class SMG, same ammo 120, damagePct = her datamined normalAttackMultiplier 10.12, base cadence inherited) whose ONLY intended effect is the true flavor. If the engine grants a fresh magazine or alters cadence on swap entry, this block adds damage the kit does not — verify shot-count parity before trusting it (recipe in flags).",
    "⚑ The 48-hit 472.18% rider is true-flavored, so it is amplified by her own True Damage ▲ 48.62% (S1) — the two lines interact; a mis-scoped trueDamagePct would double-count into this rider.",
    "Hit Rate ▲ 22.37% is carried as hitRatePct (the ⚑ HR→core lift path, sim.ts hrCoreMult). The kit percentage is literal; the core-rate CONVERSION is unmeasured for this unit.",
    "Invulnerability (100% tier) is unmodeled: the v1 boss deals no damage and no roster consumer reads a 'Dodging Bullets' status. It costs zero damage but IS a real kit line — re-check if a defensive/HP model or a status consumer ever lands."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Chisato (SMG/Iron/Attacker/B3) is a self-contained self-buff attacker built on the Extrasensory gauge: S1 fills it to 100% at battle start, it decays 1 point per 2 sec (0.5%/s), and her burst re-fills it to 100%. Three nested charge tiers (>70% ATK ▲53.69%, >55% True Damage ▲48.62%, >25% Hit Rate ▲22.37%) are modeled as interval-2s resourceGated self-buffs (durationSec 2, self-refreshing) so they can genuinely LAPSE as the gauge drains — a passive would latch at frame 0 forever. Derived trajectory from a refill: >70 tier drops at t≈60 s, >55 at t≈90 s, >25 at t≈150 s; in a comp where she bursts every rotation (~20 s) the pool stays in [80,100] and all three tiers hold all fight. S2 gives a 10 s true-damage window on her own burst cast (modeled via a mirror weaponSwap with trueNormals — the only schema channel; ⚑ ammo/cadence parity unverified) plus a per-48-normal-hit 472.18% true-damage rider (crit-eligible per RIDERCRIT, no core — the text does not say core strike, FB by timing left ON). Burst re-fills Extrasensory and grants ATK ▲73.16% for 10 s. Only the 100%-tier invulnerability is unmodeled."
}
```

### 6b. Driver override (src/skills/overrides/chisato.json) — effect blocks (note trimmed; full note in section 7)
```json
{
  "skill1": [
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
          "stat": "atkPct",
          "value": 53.69,
          "durationSec": 60
        },
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 48.62,
          "durationSec": 90
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
          "stat": "hitRatePct",
          "value": 22.37,
          "durationSec": 150
        }
      ]
    },
    {
      "slot": "skill1",
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
          "value": 53.69,
          "durationSec": 60
        },
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 48.62,
          "durationSec": 90
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 22.37,
          "durationSec": 150
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
          "kind": "weaponSwap",
          "damagePct": 10.12,
          "durationSec": 10,
          "trueNormals": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 48
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 472.18,
          "flavor": "true"
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
          "stat": "atkPct",
          "value": 73.16,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates at the start of battle. Affects self. Charges Extrasensory to 100%, up to 100%. This effect is continuous and cannot be removed.",
      "Only when at 100%: Dodging Bullets: Invulnerable for 2 sec.",
      "Affects self every 2 sec. Extrasensory ▼ 1%."
    ],
    "skill2": [],
    "burst": [
      "Charges Extrasensory to 100%."
    ]
  }
}
```

### 6c. SHORT DIFF (driver vs blind encoding)
- **Extrasensory gauge:** DRIVER = fused passives (atkPct 53.69 dur 60 / trueDamagePct 48.62 dur 90 / hitRatePct 22.37 dur 150, all live from frame 0) + a burstCast skill1 block that re-applies all three (refresh on each own cast). BLIND = a literal `resources:[extrasensory initial 100]` pool + three interval-2s resourceGated(min 71/56/26) tier buffs (durationSec 2, self-refreshing) + an interval-2s resource delta -1 (decay) + a burst resource delta +100 (recharge). SAME observable trajectory (60/90/150s lapse ladder + burst recharge); DIFFERENT mechanism. Blind’s interval encoding has a ~2s cold-start at battle start (interval first-fires at t=2s); driver’s fused passive is live from frame 0 (matches kit "activates at start of battle").
- **skill2 true-damage window:** IDENTICAL encoding — both use burstCast -> self weaponSwap damagePct 10.12, durationSec 10, trueNormals:true. (Blind adds explicit weapon:"SMG"/maxAmmo:120 on the swap; driver omits them — same-weapon swap inherits the base weapon, so equivalent.)
- **skill2 48-hit rider:** IDENTICAL — both hitCount count 48 -> enemy flatDamage atkPct 472.18 flavor:true. Blind sets crit:true explicitly; driver omits crit (defaults to crit-eligible via e.crit!==false). Both => rider crits (engine reality). Neither sets core => rider does not core.
- **burst ATK:** IDENTICAL — both burstCast -> self atkPct 73.16 durationSec 10. Blind ALSO puts the resource recharge (delta +100) in the burst block; driver folds the recharge into the skill1 burstCast refresh.
- **unmodeled:** IDENTICAL set — both list only the invuln line (blind verbatim; driver made verbatim in S3). Driver ADDITIONALLY documents the battle-start charge + 1%/2s drain + burst recharge as folded bookkeeping in unmodeled (the blind models those literally as resource effects).
- **magnitudes:** IDENTICAL across the board (53.69 / 48.62 / 22.37 / 73.16 / 472.18 / 10.12 / hitCount 48 / decay 1 per 2s / thresholds 70/55/25).

---

## 7. DRIVER IMPLEMENTATION

### 7a. Driver test (scripts/tests/units/chisato.test.ts) — 20 tests, all GREEN vs shipped
```ts
// PER-UNIT KIT SPEC — `chisato` (Chisato, Attacker/SMG/Iron, Burst III, cd 40s, ammo 120, reloadFrames 81,
// hitsPerShot 1, normalMult 10.12 / coreMult 250, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-07-25 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (C1..C6), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.chisato.skills, levels 10/10/10 — the normalized `skills` prose is the SSOT):
//   S1 ■ battle start → self: Charges Extrasensory to 100% (continuous, unremovable)                      [C1 bookkeeping]
//      ■ while in Extrasensory, by charge level (each gate triggers all below it):
//          at 100%: Dodging Bullets: Invulnerable 2 sec                                                   [C2 UNMODELED]
//          >70%: ATK ▲ 53.69% (continuous)                                                                [C1]
//          >55%: True Damage ▲ 48.62% (continuous)                                                        [C1]
//          >25%: Hit Rate ▲ 22.37% (continuous)                                                           [C1]
//      ■ every 2 sec → self: Extrasensory ▼ 1%                                                            [C1 bookkeeping]
//   S2 ■ on Burst Skill → self: Normal attacks deal true damage for 10 sec                                 [C3]
//      ■ after 48 normal attacks → the target: 472.18% of final ATK as true damage                        [C4]
//   BU ■ self: Charges Extrasensory to 100%                                                               [C6 fold]
//      ■ self: ATK ▲ 73.16% for 10 sec                                                                    [C5]
//
// EXTRASENSORY CURRENCY MODEL (why C1 is a fused-passive decay, not a modeled resource): the gauge is a
// battle-start-charged resource that DECAYS at 1%/2s (0.5%/s) and her OWN burst recharges it to 100%. From
// 100% the >70%/>55%/>25% gates cross their thresholds at t≈60s/90s/150s. The engine has no Extrasensory
// resource primitive, so the trajectory is encoded as FUSED PASSIVES (sim.ts:1786 — a passive buff honoring an
// explicit durationSec: live from frame 0, expires after durationSec) at 60/90/150s, PLUS a burstCast skill1
// block that re-applies all three (same buff keys → refresh) on each of her own casts (the recharge-to-100%).
// In a bursting comp (casts ~every 34s < the 60s ATK fuse) every gate stays permanently refreshed; in a
// never-burst comp the gates fall off at 60/90/150s. The literal charge/drain lines (battle-start charge,
// 1%/2s drain) are currency bookkeeping folded into this derivation → UNMODELED (inert: no damage observable).
//
// TRUE-DAMAGE ENGINE NOTE (⚑ engine-fidelity, NOT an override-encoding gotcha): the owner ruling "true damage
// cannot crit" (DECISIONS 2026-07-21) is documented as an engine `crit && !trueFlavor` guard, but NO such guard
// exists in sim.ts on this branch (git log -S '!opts.trueFlavor' is empty; the swap-normal path hardcodes
// crit:true at sim.ts:2843 and the flatDamage path uses crit:e.crit!==false at sim.ts:1844). Measured reality
// (open-questions.md:481 — "her true-damage-window normals RETAIN core+crit — MEASURED, faithful") and our probe
// agree: chisato's true swap normals AND her skill2 true rider are crit+core ELIGIBLE in the current engine.
// The override encodes the kit faithfully (trueNormals on the swap, flavor:'true' on the rider); whether true
// damage crits/cores is the ENGINE's domain. C3 pins the actual engine behaviour (crit/core ON) so a future
// engine guard is detected; the override note's "CRIT now OFF / engine crit&&!trueFlavor guard" and "swap mag
// refill" claims are STALE (sim.ts:1944/2487 — a trueNormals flavor swap does NOT refill the mag) and are
// corrected in the S3 note addendum. Core-on-true-damage remains ⚑ unverified in-game (SMG coreMult 250 lever).
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   C1  the three gates are FUSED PASSIVES: live from frame 0, FINITE durations 60/90/150s, self-scoped, and
//       REFRESHED on her own burstCast. Nearest-wrong (a): a PERMANENT passive (strip durationSec → dur null) —
//       the prior encoding that OVER-credited never-burst comps. (b): NO refresh (drop the burstCast block) —
//       each gate fires once at frame 0 and expires at 60/90/150s; in this bursting comp her total DROPS because
//       the ATK 53.69 gate is up only the first 60s instead of ~100%. Frame-discriminated (frame-0 passive app
//       plus one app per cast frame).
//   C2  PIN (documented skip): "Invulnerable 2 sec" is boss-inert (the partless boss does nothing to her). The
//       S1 SLOT is active (it emits the C1 gates), so this is a specific within-slot skip. Assert: chisato's
//       self-buffs emit EXACTLY the three modeled stat families {atkPct, trueDamagePct, hitRatePct} and NO
//       shield/invuln/status effect — the documented skip is distinguished from a silent drop or a mis-encoding
//       of invulnerability as a damage stat.
//   C3  "Normal attacks deal true damage for 10 sec" on burstCast = same-weapon weaponSwap damagePct 10.12 (her
//       own normal mult, unchanged) + trueNormals:true for 10s (the takina precedent). trueNormals makes the
//       swap-window normals TRUE-flavored, which routes the permanent self trueDamagePct 48.62 (flavor-gated —
//       sim.ts:1414) into their Damage-Up bucket ONLY inside the [cast, +10s] window. Nearest-wrong (a): strip
//       the trueDamagePct buff (timing-stable — removes a stat, not the swap) → window normals lose the +0.4862
//       dmgUp while OUTSIDE-window normals are byte-identical (proves the gate is flavor-scoped, not global).
//       (b): trueNormals:false → window normals lose the true flavor → her total drops. Frame-paired: a normal is
//       elevated (true-flavored) IFF its frame falls in a [cast, +10s] window — proves the window is timed to
//       burstCast AND that trueNormals is the mechanism. [ENGINE ⚑ PIN: window normals stay crit+core-eligible.]
//   C4  "after 48 normal attacks → 472.18% of final ATK as true damage" = hitCount 48 → flatDamage atkPct 472.18,
//       flavor:'true'. Fires floor(normals/48)× over the fight; the true flavor routes trueDamagePct 48.62 into
//       its Damage-Up bucket. Nearest-wrong (a): hitCount 24 → ~2× riders. (b): plain flavor (delete flavor) →
//       rider loses trueDamagePct → strictly lower dmgUp.
//   C5  "ATK ▲ 73.16% for 10 sec" on burstCast (her OWN cast) = atkPct 73.16, dur 10s, self-scoped, once per cast
//       (NOT at frame 0 — that is the S1 53.69 gate, a distinct magnitude). Nearest-wrong (trigger):
//       fullBurstEnter → fires on FB-START frames (once per team Full Burst, ≠ her cast count, different frames).
//   C6  PIN (documented fold): the burst's "Charges Extrasensory to 100%" is folded into the C1 burstCast refresh
//       (the recharge-to-100% re-applies the three gates); the literal currency line is UNMODELED. Assert: the
//       burst SLOT emits EXACTLY {atkPct} (the 73.16) and NO resource/gauge effect — the fold is distinguished
//       from a silent drop or a mis-encoding of the recharge as a damage stat.
//
// Fixture: controlComp('chisato') = liter(B1) / crown(B2) / chisato(B3) / helm(B3), boss Fire (chisato Iron is
// neutral vs Fire — clean: no element major confounds the true-damage assertions), focus chisato. The control
// core makes the team complete Full Bursts so chisato actually CASTS (a lone B3 makes zero Full Bursts). Chisato
// is one of two B3s (with helm), so she casts ~6× over 180s while the team completes ~11 Full Bursts. Slot order:
// liter 0 / crown 1 / chisato 2 / helm 3. Deterministic (no seed → EV pass, byte-stable totals).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const CHI = 2; // controlComp slot order: liter 0 / crown 1 / chisato 2 / helm 3

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('chisato'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const chiBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === CHI &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1),
  );
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame)),
  ),
];
const chiDamage = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'chisato');
const chiNormals = (evs: SimEvent[]) =>
  chiDamage(evs).filter((d) => d.bucket === 'normal');
const chiRiders = (evs: SimEvent[]) =>
  chiDamage(evs).filter((d) => d.srcSlot === 'skill2');
const chiCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'chisato',
  );
const castFrames = (evs: SimEvent[]) =>
  chiCasts(evs)
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
/** [castFrame, +10s) true-damage swap windows — half-open: the swap expires AT cast+10s, so a
 *  normal landing exactly on the +10s frame is already a regular (non-true) normal. */
const castWindows = (evs: SimEvent[]): [number, number][] =>
  chiCasts(evs).map((c) => [c.frame, c.frame + 10 * FPS]);
const inWindow = (frame: number, wins: [number, number][]) =>
  wins.some(([s, e]) => frame >= s && frame < e);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** C1 nearest-wrong (decay): strip durationSec from the S1 gates → permanent (dur null). */
const cfPermanent = withPatchedOverride('chisato', (ov: any) => {
  let n = 0;
  for (const b of ov.skill1)
    for (const e of b.effects)
      if (e.stat && e.durationSec != null) {
        delete e.durationSec;
        n++;
      }
  if (n === 0)
    throw new Error('chisato S1 durationSec missing — fixture is stale');
});
/** C1 nearest-wrong (refresh): drop the S1 burstCast refresh block → gates fire once at frame 0 only. */
const cfNoRefresh = withPatchedOverride('chisato', (ov: any) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'burstCast');
  if (ov.skill1.length === before)
    throw new Error(
      'chisato S1 burstCast refresh block missing — fixture is stale',
    );
});
/** C3 isolation (flavor gate): strip the self trueDamagePct buff entirely (timing-stable — a stat, not the swap). */
const cfNoTrueDmg = withPatchedOverride('chisato', (ov: any) => {
  let removed = 0;
  for (const b of ov.skill1) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'trueDamagePct');
    removed += before - b.effects.length;
  }
  ov.skill1 = ov.skill1.filter((b: any) => b.effects.length > 0);
  if (removed === 0)
    throw new Error('chisato S1 trueDamagePct missing — fixture is stale');
});
/** C3 nearest-wrong (mechanism): trueNormals:true → false (window normals lose the true flavor). */
const cfNoTrueNormals = withPatchedOverride('chisato', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'weaponSwap'),
  );
  if (!b)
    throw new Error('chisato S2 weaponSwap block missing — fixture is stale');
  b.effects.find((e: any) => e.kind === 'weaponSwap').trueNormals = false;
});
/** C4 nearest-wrong (count): hitCount 48 → 24 (~2× riders). */
const cfCount24 = withPatchedOverride('chisato', (ov: any) => {
  const b = ov.skill2.find((x: any) => x.trigger?.kind === 'hitCount');
  if (!b)
    throw new Error('chisato S2 hitCount block missing — fixture is stale');
  b.trigger.count = 24;
});
/** C4 nearest-wrong (flavor): the rider's flavor:'true' removed → loses trueDamagePct. */
const cfPlainRider = withPatchedOverride('chisato', (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  if (!b)
    throw new Error('chisato S2 flatDamage block missing — fixture is stale');
  delete b.effects.find((e: any) => e.kind === 'flatDamage').flavor;
});
/** C5 nearest-wrong (trigger): the burst ATK line keyed to fullBurstEnter (FB-START frames). */
const cfBurstFbEnter = withPatchedOverride('chisato', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkPct'),
  );
  if (!b)
    throw new Error('chisato burst atkPct block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const permanent = run({ chisato: cfPermanent });
const noRefresh = run({ chisato: cfNoRefresh });
const noTrueDmg = run({ chisato: cfNoTrueDmg });
const noTrueNormals = run({ chisato: cfNoTrueNormals });
const count24 = run({ chisato: cfCount24 });
const plainRider = run({ chisato: cfPlainRider });
const burstFbEnter = run({ chisato: cfBurstFbEnter });

const casts = chiCasts(base.events).length;
const fbs = fbStartFrames(base.events).length;
const wins = castWindows(base.events);

// Frame-paired normal dmgUp comparison (base vs the timing-stable no-trueDamage run). A normal is
// TRUE-flavored (elevated by the trueDamagePct 48.62 contribution) IFF its frame is in a swap window.
const baseNormalFrames = chiNormals(base.events).map((d) => d.frame);
const noTdNormalFrames = chiNormals(noTrueDmg.events).map((d) => d.frame);
const baseDuByFrame = new Map<number, number>();
for (const d of chiNormals(base.events))
  baseDuByFrame.set(d.frame, d.mult.dmgUp);
const noTdDuByFrame = new Map<number, number>();
for (const d of chiNormals(noTrueDmg.events))
  noTdDuByFrame.set(d.frame, d.mult.dmgUp);

describe('chisato — kit spec', () => {
  describe('fixture sanity — chisato casts her burst and the team reaches Full Burst', () => {
    it('chisato casts >0 bursts and the team completes >0 Full Bursts', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
    });
    it('chisato cast frames are distinct from Full-Burst-start frames (a cast precedes the FB it opens)', () => {
      const cf = castFrames(base.events);
      const fs = fbStartFrames(base.events);
      expect(cf.every((f) => !fs.includes(f))).toBe(true);
    });
  });

  describe('C1 — S1 Extrasensory threshold gates are fused passives (frame-0 + finite dur + burstCast refresh)', () => {
    it('ATK 53.69 / True Damage 48.62 / Hit Rate 22.37 fire at frame 0, self-scoped, durations 60/90/150s', () => {
      const atk = chiBuffs(base.events, 'atkPct', 53.69);
      const td = chiBuffs(base.events, 'trueDamagePct', 48.62);
      const hr = chiBuffs(base.events, 'hitRatePct', 22.37);
      for (const bs of [atk, td, hr]) {
        expect(bs.length).toBeGreaterThan(0);
        expect(targetsOf(bs)).toEqual([CHI]); // self only
        expect(Math.min(...bs.map((b) => b.frame))).toBe(0); // live from battle start
      }
      expect(dursOf(atk)).toEqual([60 * FPS]);
      expect(dursOf(td)).toEqual([90 * FPS]);
      expect(dursOf(hr)).toEqual([150 * FPS]);
    });
    it('each gate REFRESHES on her own burstCast: count = 1 + #casts, non-frame-0 apps land on cast frames', () => {
      const cf = castFrames(base.events);
      for (const [stat, val] of [
        ['atkPct', 53.69],
        ['trueDamagePct', 48.62],
        ['hitRatePct', 22.37],
      ] as const) {
        const bs = chiBuffs(base.events, stat, val);
        expect(bs.length).toBe(1 + casts);
        expect(
          bs
            .filter((b) => b.frame !== 0)
            .map((b) => b.frame)
            .sort((a, b) => a - b),
        ).toEqual(cf);
      }
    });
    it('DISCRIMINATING (decay vs permanent): stripping durationSec makes the gates permanent (dur null)', () => {
      expect(dursOf(chiBuffs(permanent.events, 'atkPct', 53.69))).toEqual([
        null,
      ]);
      expect(dursOf(chiBuffs(base.events, 'atkPct', 53.69))).toEqual([
        60 * FPS,
      ]);
    });
    it('DISCRIMINATING (refresh is load-bearing): without the burstCast refresh the gates fire once and her total drops', () => {
      expect(chiBuffs(noRefresh.events, 'atkPct', 53.69).length).toBe(1); // frame 0 only
      expect(noRefresh.totals.chisato).toBeLessThan(base.totals.chisato);
    });
  });

  describe('C2 — S1 "Invulnerable 2 sec" (at 100%) is UNMODELED (boss-inert)', () => {
    it("PIN: chisato's self-buffs emit EXACTLY {atkPct, trueDamagePct, hitRatePct} and NO shield/invuln/status effect", () => {
      const stats = new Set(
        buffs(base.events)
          .filter((b) => b.casterIdx === CHI)
          .map((b) => b.stat),
      );
      expect([...stats].sort()).toEqual([
        'atkPct',
        'hitRatePct',
        'trueDamagePct',
      ]);
    });
  });

  describe('C3 — S2 "Normal attacks deal true damage for 10 sec" = burstCast same-weapon swap (trueNormals)', () => {
    it('swap-window normals exist, keep her normal multiplier (same-weapon swap, atkPct 10.12)', () => {
      const windowNormals = chiNormals(base.events).filter((d) =>
        inWindow(d.frame, wins),
      );
      expect(windowNormals.length).toBeGreaterThan(0);
      expect([...new Set(windowNormals.map((d) => d.atkPct))]).toEqual([10.12]);
    });
    it('timing-stable isolation: removing the trueDamagePct buff does not change which frames she shoots', () => {
      expect(noTdNormalFrames).toEqual(baseNormalFrames);
    });
    it('FLAVOR GATE: trueDamagePct rides ONLY the true-flavored window normals (outside-window normals byte-identical)', () => {
      // a normal is elevated (true-flavored) IFF its frame is in a swap window
      const elevated: number[] = [];
      const notElevated: number[] = [];
      for (const frame of baseNormalFrames) {
        const du = baseDuByFrame.get(frame)!;
        const duNoTd = noTdDuByFrame.get(frame)!;
        (du > duNoTd + 0.01 ? elevated : notElevated).push(frame);
      }
      expect(
        elevated.length,
        'no window normal carried the trueDamagePct contribution',
      ).toBeGreaterThan(0);
      // leak-proof: every elevated normal is inside a swap window; every window normal is elevated
      expect(elevated.every((f) => inWindow(f, wins))).toBe(true);
      expect(notElevated.every((f) => !inWindow(f, wins))).toBe(true);
      // positive coverage: every cast opens a true-damage window
      for (const [s, e] of wins)
        expect(elevated.some((f) => f >= s && f < e)).toBe(true);
      // cleanest proof of flavor-scoping: OUTSIDE-window normals are byte-identical with the
      // trueDamagePct buff removed (never true-flavored, so the buff never touched them)
      const outside = (m: Map<number, number>) =>
        [...m.entries()]
          .filter(([f]) => !inWindow(f, wins))
          .map(([, du]) => +du.toFixed(6))
          .sort((a, b) => a - b);
      expect(outside(baseDuByFrame)).toEqual(outside(noTdDuByFrame));
    });
    it('ENGINE ⚑ PIN: true swap normals remain crit+core-eligible (no true-damage-crit guard in the engine)', () => {
      const windowNormals = chiNormals(base.events).filter((d) =>
        inWindow(d.frame, wins),
      );
      expect([...new Set(windowNormals.map((d) => d.critEligible))]).toEqual([
        true,
      ]);
      expect([...new Set(windowNormals.map((d) => d.coreEligible))]).toEqual([
        true,
      ]);
    });
    it('DISCRIMINATING (mechanism): trueNormals:false strips the true flavor → her total drops', () => {
      expect(noTrueNormals.totals.chisato).toBeLessThan(base.totals.chisato);
    });
  });

  describe('C4 — S2 "after 48 normals → 472.18% final ATK true damage" = hitCount 48 flatDamage (flavor true)', () => {
    const riders = chiRiders(base.events);
    it('fires floor(normals/48)× at the kit magnitude, in the skill bucket', () => {
      const normals = chiNormals(base.events).length;
      expect(riders.length).toBeGreaterThan(0);
      expect(riders.length).toBe(Math.floor(normals / 48));
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([472.18]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
    });
    it('is NOT core-eligible (kit lacks any core-strike language; flatDamage core defaults off)', () => {
      expect([...new Set(riders.map((d) => d.coreEligible))]).toEqual([false]);
    });
    it('is true-flavored: trueDamagePct 48.62 rides its Damage-Up bucket', () => {
      // frame-pair (timing-stable: removing the trueDamagePct buff does not move the hitCount procs);
      // each shipped rider outruns its no-trueDamage counterpart by the +0.4862 trueDamagePct term
      const noTdRiders = chiRiders(noTrueDmg.events);
      expect(noTdRiders.map((d) => d.frame)).toEqual(
        riders.map((d) => d.frame),
      );
      const noTdByFrame = new Map(
        noTdRiders.map((d) => [d.frame, d.mult.dmgUp]),
      );
      for (const d of riders)
        expect(d.mult.dmgUp).toBeGreaterThan(noTdByFrame.get(d.frame)! + 0.01);
    });
    it('DISCRIMINATING (count): hitCount 24 (nearest-wrong) produces ~2× riders', () => {
      expect(chiRiders(count24.events).length).toBeGreaterThan(riders.length);
    });
    it('DISCRIMINATING (flavor): plain flavor (nearest-wrong) loses trueDamagePct → strictly lower rider dmgUp', () => {
      const plain = chiRiders(plainRider.events);
      expect(plain.map((d) => d.frame)).toEqual(riders.map((d) => d.frame));
      const plainByFrame = new Map(plain.map((d) => [d.frame, d.mult.dmgUp]));
      for (const d of riders)
        expect(d.mult.dmgUp).toBeGreaterThan(plainByFrame.get(d.frame)! + 0.01);
    });
  });

  describe('C5 — Burst "ATK ▲ 73.16% for 10 sec" on her own burstCast', () => {
    const atk = chiBuffs(base.events, 'atkPct', 73.16);
    it('fires once per cast (NOT at frame 0), target self, 10s duration', () => {
      expect(atk.length).toBe(casts);
      expect(atk.length).toBeGreaterThan(0);
      expect(targetsOf(atk)).toEqual([CHI]);
      expect(dursOf(atk)).toEqual([10 * FPS]);
      expect(atk.every((b) => b.frame !== 0)).toBe(true);
      expect(atk.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        castFrames(base.events),
      );
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) fires on FB-start frames, ≠ her cast count', () => {
      const cf = chiBuffs(burstFbEnter.events, 'atkPct', 73.16);
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.length).not.toBe(casts); // once per team FB, not per chisato cast
      const fs = fbStartFrames(burstFbEnter.events);
      expect(cf.every((b) => fs.includes(b.frame))).toBe(true);
    });
  });

  describe('C6 — Burst "Charges Extrasensory to 100%" is folded into the C1 refresh (no resource effect)', () => {
    it('PIN: the burst slot emits EXACTLY {atkPct} (the 73.16) and NO resource/gauge effect', () => {
      const burstStats = new Set(
        buffs(base.events)
          .filter((b) => b.key.startsWith(`${CHI}:burst:`))
          .map((b) => b.stat),
      );
      expect([...burstStats].sort()).toEqual(['atkPct']);
    });
  });
});

```

### 7b. Driver override (src/skills/overrides/chisato.json) — FULL (incl. note)
```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. [Banner scope: skill1's two original blocks are the PRESERVED hand slot (Tier audit, board ~0.95) — kept byte-verbatim; the banner covers the newly authored skill2 swap window + the appended hitRatePct block.] EXTRASENSORY currency (prior 4, derivable): starts 100%, drains 1%/2s (0.5%/s), her OWN burst recharges to 100%. [2026-07-17 FAITHFUL DECAY MODEL — theme 3 / engine-modeling-gaps.md] The gauge is a battle-start-charged resource that DECAYS at 0.5%/s and her OWN burst recharges it to 100%. From 100% the >70% ATK 53.69 / >55% True Damage 48.62 / >25% Hit Rate 22.37 gates cross their thresholds at t≈60s / 90s / 150s. Encoded as FUSED PASSIVES (engine 2026-07-17: a passive buff now honors an explicit durationSec — live from frame 0, expires after durationSec) at durations 60/90/150, PLUS a burstCast skill1 block that re-applies all three (same keys → refresh) each time she casts her own burst (the recharge-to-100%). This reproduces BOTH regimes with one model: burst-each-~40s-rotation → the 40s refresh < the 60s ATK fuse → all gates stay permanently cleared (matches the derived ~79% floor, no haircut); never-burst comps → gates correctly fall off at 60/90/150s. VERIFIED 2026-07-17 (remove-refresh A/B): in the PI/PI2 misc-B3 comps she BURSTS every rotation (anis-star reenterStage lets multiple B3s cast) → gates stay permanently refreshed → those comps are UNCHANGED at ~1.19, so her dominant hotness there is NOT Extrasensory decay but a SEPARATE over-model (swap mag-refill optimism / true-normal core retention on SMG coreMult 250 / ⚑ cadence). The decay model only moves under-burst comps (N2 modernia-wind 1.124→1.090, where modernia takes the B3 slot). ⚑ The 0.5%/s drain + gate thresholds are DERIVED from her kit text, not measured — the crossing times are exact given the drain rate; the drain rate itself is the kit's stated 1%/2s. 100%-only 'Dodging Bullets: Invulnerable 2 sec' = genuinely skippable (invulnerability) → unmodeled. Battle-start charge + the 1%/2s drain lines = currency bookkeeping folded into the derivation → unmodeled. Hit Rate ▲ 22.37 modeled as hitRatePct (LIVE since CONE_DELTA 2026-07-19 — feeds her SMG core rate via acrForHR; hard rule 4 — in-game magnitude ⚑). S2 line 1 'Normal attacks deal true damage for 10 sec' on burstCast = same-weapon weaponSwap damagePct 10.12 (her own normal mult, unchanged) + trueNormals:true for 10s — the takina-precedent encoding; the flavor gate makes her permanent S1 trueDamagePct 48.62 apply to normals ONLY inside the window (≈+48.62% dmgUp on ~10s/40s of normals). Engine artifact: swap start+end each instant-refill the mag (~2 free reloads/cycle, mild optimism — caveat). CRIT now OFF on true normals (owner ruling 2026-07-21: TRUE DAMAGE CANNOT CRIT — enforced at the engine `crit && !trueFlavor` guard, board-confirmed chisato 1.154→1.119); CORE still KEPT on true normals, real-game core interaction of true damage unverified ⚑ (SMG coreMult 250 = big lever if true damage actually forfeits core). S2 line 2: hitCount-48 → 472.18% true flatDamage (hard rule 5), FB-by-timing default (no noFb), permanently boosted by the flavor-gated 48.62. Burst ATK 73.16/10s on burstCast (her own cast — hard rule 6); 'Charges Extrasensory to 100%' folded into the trajectory derivation → unmodeled. ⚑ cadence tuple (mandatory): SMG class pullsPerSec + reloadFrames 81 + rolling-reload unverified (datamine); 120-round mag at class rate ≈ 9–10s, plausible, no escalation tells. [KIT-AUTONOMY GAUNTLET 2026-07-25 — GO faithfulness 1.0, cross-family corroborated (S2b claude-fable-5 independently re-derived the SAME Extrasensory decay model + trueNormals flavor conversion + hitCount-48 true rider; converged). TWO EARLIER NOTE CLAIMS SUPERSEDED BY THE CURRENT ENGINE: (1) 'CRIT now OFF on true normals ... engine crit && !trueFlavor guard' is STALE — no such guard exists in sim.ts on this branch (git log -S '!opts.trueFlavor' is empty; swap normals hardcode crit:true at sim.ts:2843; flatDamage uses crit:e.crit!==false at sim.ts:1844). True swap normals AND the skill2 true rider RETAIN crit+core in the engine (open-questions.md:481 'true-damage-window normals RETAIN core+crit — MEASURED, faithful'; gauntlet probe confirmed critEligible/coreEligible true). The trueNormals / flavor:'true' ENCODING is faithful; whether true damage crits/cores is the ENGINE's domain (engine-fidelity ⚑, out-of-domain for this override; core-on-true-damage remains ⚑ unverified in-game, SMG coreMult 250 lever). (2) 'swap start+end each instant-refill the mag (~2 free reloads/cycle, mild optimism)' is STALE — a trueNormals same-weapon flavor swap does NOT refill the mag (sim.ts:1944 'if (!e.trueNormals) owner.ammo = maxAmmo' + sim.ts:2487 'same-weapon flavor swap → no free reload on exit either'); the takina-precedent encoding removes that optimism. The fused-passive decay (60/90/150s lapse + burstCast refresh) is trajectory-equivalent to a literal Extrasensory resource pool (the reviewer's encoding) — same observable lapse ladder; the C1 no-refresh / permanent counterfactuals discriminate the calibration-invisible permanent-passive hardcode the reviewer flagged as the biggest shared-prior trap. unmodeled entries made verbatim kit prose. JSON effect blocks UNCHANGED (all six load-bearing lines exact: 53.69/48.62/22.37 fused passives + burstCast refresh; trueNormals swap damagePct 10.12/10s; hitCount-48 flatDamage 472.18 flavor true; burst atkPct 73.16/10s).]",
  "unmodeled": {
    "skill1": [
      "Activates at the start of battle. Affects self. Charges Extrasensory to 100%, up to 100%. This effect is continuous and cannot be removed.",
      "Only when at 100%: Dodging Bullets: Invulnerable for 2 sec.",
      "Affects self every 2 sec. Extrasensory ▼ 1%."
    ],
    "skill2": [],
    "burst": ["Charges Extrasensory to 100%."]
  },
  "caveats": [
    "skill1: Extrasensory threshold buffs (ATK 53.69 / True Damage 48.62 / Hit Rate 22.37) are modeled as FUSED PASSIVES (live from t=0, expire at 60/90/150s — the derived >70%/>55%/>25% crossing times of the 0.5%/s drain — and REFRESH on her own burstCast, which recharges Extrasensory to 100%). Reproduces both regimes: permanent while she bursts each ~40s rotation, decaying off when she never bursts. Replaces the prior permanent encoding that OVER-CREDITED never-burst comps (her ~1.19 board-hotness).",
    "skill2: 'Normal attacks deal true damage for 10 sec' is encoded as a same-weapon swap (trueNormals) so the S1 True Damage ▲ 48.62% applies to normals only inside the window. A trueNormals same-weapon flavor swap does NOT refill the mag (sim.ts:1944/2487 — no free reload at swap start or exit), so there is no shot-count optimism. True swap normals RETAIN crit+core in the engine (no true-damage-crit guard exists on this branch — sim.ts:2843 hardcodes crit:true; open-questions.md:481 'true-damage-window normals RETAIN core+crit — MEASURED, faithful'); whether true damage should crit/core is an engine-fidelity ⚑ out-of-domain for this override (core-on-true-damage unverified in-game, SMG coreMult 250 lever)."
  ],
  "skill1": [
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
          "stat": "atkPct",
          "value": 53.69,
          "durationSec": 60
        },
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 48.62,
          "durationSec": 90
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
          "stat": "hitRatePct",
          "value": 22.37,
          "durationSec": 150
        }
      ]
    },
    {
      "slot": "skill1",
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
          "value": 53.69,
          "durationSec": 60
        },
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 48.62,
          "durationSec": 90
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 22.37,
          "durationSec": 150
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
          "kind": "weaponSwap",
          "damagePct": 10.12,
          "durationSec": 10,
          "trueNormals": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 48
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 472.18,
          "flavor": "true"
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
          "stat": "atkPct",
          "value": 73.16,
          "durationSec": 10
        }
      ]
    }
  ]
}

```

---

## BINDING VERDICT

Per the contract in section 1, return ONLY the verdict JSON (save to scripts/kit-autonomy/results/chisato.json). Grade the driver’s implementation against ground truth + the two independent blind re-derivations. The S5 blind tests are GREEN vs the driver override (35/1skip). Classify each line, flag any REAL-GOTCHA (undocumented divergence), confirm discrimination, and render GO / NO-GO.
