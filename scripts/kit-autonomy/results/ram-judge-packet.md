# CROSS-FAMILY RECONCILING-JUDGE PACKET — unit ram (slug `ram`)
# Built by the driver 2026-08-05 for the kimi-code/k3 binding judge. Sections in contract order.

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

# SECTION: MECHANICS SSOT — docs/data/damage-calculation.md

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
  if ally grants fed it). "Live Max HP" here and below is the single engine reader `liveMaxHp`
  (base + own-kit maxHpFlat buffs, honoring expiry/stacks/ramp).
- **"ATK ▲ X% of the skill user's final Max HP"** granted to OTHERS (maxwell-ordinary-mechanic
  S2, `atkOfCasterMaxHpPct`) converts at application time to a FLAT add of the caster's live
  Max HP × X — uniform across all targets, one snapshot per application; the caster's own-kit
  Max HP stacks feed the basis (the e3 scope above), ally-granted Max HP on the caster does not
  (owner ruling 2026-08-04: the kit line is caster-scaled; the earlier target-own resolution was
  a misread).
- **"% of Max HP" damage terms** (stackedNuke hpPct — maiden-ice-rose's burst "10% of the skill
  user's FINAL Max HP") read live Max HP at cast, same e3 scope (2026-08-04; the base-Max-HP
  read was a documented residual, kit text says "final").

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


---

# SECTION: MECHANICS SSOT — docs/data/game-mechanics.md

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

# SECTION: GROUND TRUTH — ram kit prose + base stats (data/characters.json, curated top-level)

```json
{
  "slug": "ram",
  "name": "Ram",
  "weapon": "SR",
  "class": "Defender",
  "element": "Fire",
  "burst": "I",
  "burstCooldownSec": 40,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "normalAttackMultiplier": 69.04,
  "hitsPerShot": 1,
  "skills": {
    "skill1": "■ Activates after landing 5 normal attack(s). Affects the target(s).\nATK ▼ 7.95% for 5 sec.\n■ Activates when Full Burst ends with an ally from the same squad still on the battlefield. Affects self.\nCooldown of Burst Skill ▼ 20.16 sec.",
    "skill2": "■ Affects self.\nMax HP ▲ 40.72% without restoring HP for 10 sec.\n■ Affects 2 ally unit(s) with the lowest remaining HP.\nDEF ▲ 11.34% of the skill user's DEF for 5 sec.",
    "burst": "■ Affects all allies.\nGenerates a Shield with 10.08% of the skill user's final Max HP for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": 15,
    "burst": 40
  },
  "baseStats": {
    "hp": 12650,
    "atk": 360,
    "def": 83,
    "core": {
      "hp": 200,
      "atk": 200,
      "def": 200
    },
    "grade": {
      "hp": 2300,
      "atk": 18,
      "def": 90,
      "ratio": 200
    },
    "critRate": 15,
    "maxLevel": 1200,
    "critDamage": 150,
    "resourceId": 822
  }
}
```

---

# SECTION: S2b TEST-FAITHFULNESS REVIEW (claude-fable-5)

```json
{
  "slug": "ram",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "ATK ▼ 7.95% for 5 sec (after 5 hits)",
      "disposition": "UNMODELED",
      "scope": "Enemy ATK stat debuff only — reduces boss outgoing damage; no scope on any ally damage stat. Boss deals no damage in v1, so the line is defensively inert.",
      "durationSemantics": "5 sec wall-clock (durationSec), not rounds.",
      "triggerIdentity": "hitCount count:5 (counts ROUNDS; SR hitsPerShot=1 so 5 rounds = 5 trigger pulls of the ~1s-charge SR — no pull/round divergence for this unit). No FB gate.",
      "targetSet": "enemy (the target(s)) — never allies, never self.",
      "nearestWrongModel": "Mis-encoding the enemy ATK ▼ as an offensive boss debuff (damageTakenPct — the 'boss debuff benefits the team' prior over-applied), or applying negative atkPct to allies/self. Either moves team damage; the faithful model moves nothing.",
      "distinguishingAssertion": "Run the comp and collect all buffApply events: assert ZERO events with stat 'damageTakenPct' and ZERO events with a negative atkPct value sourced from ram. Then A/B via withPatchedOverride stripping the skill1 hitCount block: totals(res) for every slug must be bit-identical with the block present vs absent.",
      "inertness": "Every unit's totalDamage; the boss damageTakenPct channel; ram's own damage buckets.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "FB ends + same-squad ally: Burst CD ▼",
      "disposition": "FAITHFUL",
      "scope": "Burst-skill cooldown only — no damage stat, no other CDs.",
      "durationSemantics": "Instant one-shot cooldown reduction of 20.16 sec per qualifying activation (burstCdr effect), not a timed buff; kit states no once-per-battle limit → repeats on every qualifying Full Burst end.",
      "triggerIdentity": "fullBurstEnd — NOT fullBurstEnter and NOT burstCast — gated by teamHas.sameSquad:true (the 'an ally from the same squad still on the battlefield' primitive; the on-battlefield clause is scope-trivial, composition-only). Gate FAILS CLOSED if ram's squad is not curated in src/data/squads.ts — a silent-dead-CDR hazard the test must expose.",
      "targetSet": "self only.",
      "nearestWrongModel": "Dropping the sameSquad gate so the CDR fires in ANY comp (the gate is easy to wave off as flavor); second-nearest: keying to fullBurstEnter (CDR lands ~10s early every rotation, shifting when the burst re-readies) or targeting allies with the CDR.",
      "distinguishingAssertion": "Ram base CD is 40s, so faithful CDR (~19.84s effective after each FB end) lets her burst essentially every rotation. (a) Comp WITH a curated same-squad ally: assert ram's burstCast event count over 180s ≈ every-rotation cadence (materially above the 40s-CD baseline count). (b) Same comp WITHOUT any same-squad ally: assert ram's burstCast count exactly equals the 40s-CD baseline — GREEN faithful, RED for the ungated model. (c) Assert liter's (any other ally's) burst cadence is unchanged in both comps — kills the allies-target misread. (d) Assert the first CDR applies only after the first fullBurstEnd event frame, not at fullBurstStart.",
      "inertness": "Other units' burst cooldowns; ram's cadence in any comp lacking a same-squad ally; nothing before the first Full Burst ends.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Max HP ▲ 40.72% no-restore, self, 10s",
      "disposition": "FAITHFUL",
      "scope": "Self Max HP stat only. 'without restoring HP' is load-bearing negative scope: the grant must NOT be accompanied by any heal/recovery emission.",
      "durationSemantics": "10 sec wall-clock (durationSec:10), then lapses (read expiresFrame off buffApply — no buffRemove on natural lapse).",
      "triggerIdentity": "No activation clause in the ■ header → interval trigger on the datamined skill cooldown (first-fire phase t=CD per convention, ⚑ — pin from footage only if a consumer's cadence ever becomes popup-read). NOT a permanent passive: the 10s duration against a CD implies a duty cycle, not 100% uptime.",
      "targetSet": "self.",
      "nearestWrongModel": "Two: (1) emitting a heal effect alongside the Max HP grant — falsely fires teammates' 'recovery' triggers (a crown-style consumer would over-credit); (2) encoding as an always-on passive (permanent uptime) instead of a CD-windowed 10s buff.",
      "distinguishingAssertion": "Filter buffApply for stat 'maxHpFlat' (targetMaxHpPct flat-resolves at apply) with targetSlug ram: assert value = 40.72% of ram's static Max HP and expiresFrame = applyFrame + 600; assert re-application at the interval cadence, with lapse gaps between windows (red under the permanent-passive misread). Separately, put a recovery-triggered consumer (e.g. crown, or a synthetic via withPatchedOverride) in the comp: assert it shows ZERO recovery-trigger activations attributable to ram's skill2 (red under the heal-emitting misread).",
      "inertness": "All damage totals (ram has no atkOfMaxHpPct conversion, and ally-granted HP never feeds a teammate's conversion); teammates' recovery-trigger consumers.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "DEF ▲ 11.34% of user's DEF, 2 lowest-HP",
      "disposition": "UNMODELED",
      "scope": "Caster-DEF-scaled DEF grant — a defensive stat with no offensive consumer; the schema has no caster-DEF-scaled StatKey (defPct is own-DEF and inert in v1), so there is no faithful primitive and the line belongs verbatim in `unmodeled`.",
      "durationSemantics": "5 sec wall-clock.",
      "triggerIdentity": "No activation clause → same interval/CD trigger as the skill2 self-HP line.",
      "targetSet": "alliesLowestHp count:2 (v1 has no HP pool — deterministic leftmost-2 stand-in per the documented convention; the stand-in choice moves no damage).",
      "nearestWrongModel": "Misreading the caster-scaled DEF grant as a caster-scaled ATK grant (casterAtkPct 11.34 — the 'X% of the skill user's <stat>' template pattern-matches the ATK version), silently adding flat ATK to two allies.",
      "distinguishingAssertion": "Assert ZERO buffApply events with stat 'casterAtkPct' sourced from ram; A/B with the line present vs absent (withPatchedOverride): the leftmost two allies' totals and all other totals bit-identical.",
      "inertness": "Every unit's totalDamage; all ATK-channel buffApply events.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Shield 10.08% user's final Max HP, 10s",
      "disposition": "FAITHFUL",
      "scope": "Shield emission to the whole team; no damage of its own. Scales off the CASTER'S final Max HP (magnitude recorded for completeness — no HP pool at scope), so it composes with skill2's self Max HP window at cast time.",
      "durationSemantics": "10 sec wall-clock shield window (drives requiresShielded gates for its duration).",
      "triggerIdentity": "burstCast (ram's OWN Burst I cast) — NOT fullBurstEnter. Diverges whenever another Burst I unit is in the team (e.g. liter): on rotations where the other B1 casts, the faithful model emits NO shield.",
      "targetSet": "allies including self (all allies).",
      "nearestWrongModel": "Skipping the line as 'defensive, no damage' (taxonomy trap 4 — a shield inert alone still drives teammates' 'shielded' triggers and requiresShielded gates); second-nearest: keying to fullBurstEnter so it fires on every team Full Burst including rotations ram sat out.",
      "distinguishingAssertion": "Comp with ram + liter (two B1s) and a teammate given a synthetic shielded-triggered buff via withPatchedOverride: assert that consumer's buffApply events appear exactly once per ram burstCast event (matching frames), and NEVER on Full Bursts whose rotation liter cast B1 for — GREEN faithful, RED under both the skipped-entirely and the fullBurstEnter misreads. Also assert 5 shield applications reach 5 distinct targets per cast (all-allies incl. self).",
      "inertness": "In a comp with no shield-consuming kit, the shield must move zero damage for every unit; no shield emission on rotations where ram's burst was not cast.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:fullBurstEnd-sameSquad-burstCdr-20.16",
    "skill2:self-maxHp-40.72-10s-no-heal",
    "burst:shield-all-allies-10.08-castersHp-10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "ATK ▼ 7.95% for 5 sec."
    ],
    "skill2": [
      "DEF ▲ 11.34% of the skill user's DEF for 5 sec."
    ],
    "burst": []
  },
  "notes": "FIXTURE SHAPE IS THE FIRST TRAP: ram is Burst I — controlComp(carry) seats the carry in the B3 slot, so a naive controlComp(ram) fixture is malformed for her. Tests must build a custom comp (runComp) with ram as a B1 alongside a B2 + B3 so bursts actually cast; for the burstCast-vs-fullBurstEnter shield assertion the comp additionally needs a SECOND B1 (liter) to create diverging rotations. SECOND: the sameSquad CDR gate fails closed — if src/data/squads.ts has no curated squad for ram (she is a collab unit; squad-mates would be her collab partners), the CDR is silently dead and her burst cadence halves; a test must pin the WITH-squad-ally cadence so an uncurated squads.ts turns the suite red rather than passing vacuously. Expected shared-prior misreads to reconcile against the driver: (1) all four support lines waved off as 'defensive, skip' — the shield and the self-HP line are load-bearing (shielded-trigger tandem; burst-shield scaler + no-heal negative scope) even though they move zero damage alone; (2) the 'without restoring HP' clause ignored, emitting a heal that would fire recovery-triggered teammates (crown); (3) CDR keyed to fullBurstEnter or left ungated; (4) the enemy ATK ▼ upgraded into damageTakenPct 'because boss debuffs help the team'. Every magnitude in this kit is literally kit-stated (DATAMINED); the only ⚑ is the skill2 interval first-fire phase convention. No tools were available in this run, so the JSON could not be written to scripts/kit-autonomy/reviews/ram.test-review.json — the orchestrator must save this output there.",
  "model": "claude-fable-5"
}

```

---

# SECTION: S5 BLIND TEST (claude-opus-5) — scripts/kit-autonomy/blind/ram.test.ts

Driver-run status vs the driver override: 11 passed / 1 FAILED / 2 skipped (14 total). The mechanical harness import-path fix is the ONLY driver edit. SOLE FAILURE: the blind test expects teamHas.sameSquad === true on the skill1 CDR block; the driver override omits the gate (documented ⚑2: ram's collab squad is UNCONFIRMED — QUEUE.md same-squad migrations says "collab-unit squad unknown, confirm before authoring"; squad membership is owner-confirmed fact; the fail-closed gate would kill the CDR in every comp). The 2 skips are the blind author's own: the shield application is not directly observable in the event log (the driver observes it through naga's shielded-trigger consumer instead).

```ts
/**
 * ram (Ram) — SR / Fire / Defender / Burst I — BLIND cross-family kit spec test.
 * Written from the kit prose alone; the driver's override, tests and reasoning were not consulted.
 *
 * KIT LINES (structure only)
 *   S1-a  trigger 'after landing 5 normal attack(s)' -> the target(s): ATK down 7.95%, 5 sec
 *   S1-b  trigger 'when Full Burst ends' + a same-squad ally present -> self: Burst CD down 20.16 sec
 *   S2-a  no activation clause -> self: Max HP up 40.72% (explicitly without restoring HP), 10 sec
 *   S2-b  no activation clause -> the 2 allies with the lowest remaining HP:
 *         DEF up 11.34% of the skill user's DEF, 5 sec
 *   B     on burst -> all allies: Shield = 10.08% of the skill user's final Max HP, 10 sec
 *
 * FIXTURE — controlComp('ram', true): liter (B1) / crown (B2) / ram / helm (B3).
 *   The fixed B3 is MANDATORY here: S1-b keys off Full Burst END, which only ever happens if the
 *   team completes a I -> II -> III chain. Ram is herself Burst I, so she SHARES stage 1 with liter
 *   and is not guaranteed to be the selected caster in any rotation. Every rotation assertion is
 *   therefore written DIRECTIONALLY (a burst-cooldown reduction can only make full bursts come
 *   sooner or leave them unchanged, never later), and S1-b's trigger identity / squad gate /
 *   magnitude are pinned STRUCTURALLY off the override clone, which is deterministic regardless of
 *   who wins stage 1. A purely behavioural pin on S1-b would be vacuous if liter always casts.
 *
 * WHY EACH GROUP DISCRIMINATES
 *   S1-a  the debuff is on the BOSS. The engine has no enemy entity, so the faithful model is
 *         damage-inert. The nearest-wrong models are (i) re-badging it as damageTakenPct, which
 *         WOULD raise the whole team's damage, and (ii) flipping the sign or the scope onto allies.
 *         Both are asserted absent, structurally and in the event log.
 *   S1-b  the only line in this kit that can move damage at all — it accelerates the rotation.
 *         Nearest-wrong: fullBurstEnter / burstCast keying (fires at the wrong edge, and on any
 *         team burst), target allies (team-wide CDR), a dropped sameSquad gate (fires with no
 *         squadmate present), oncePerBattle, or a wrong seconds value.
 *   S2-a  Max HP is offensively inert for ram — she has no HP-to-ATK conversion — but it is kept
 *         for kit completeness and because her own burst shield scales off her final Max HP.
 *         Nearest-wrong: routing it into ATK (atkOfMaxHpPct), caught by the byte-identical totals
 *         assertion; or granting it to allies, caught by the maxHpFlat target counts.
 *   S2-b  'of the skill user's DEF' has no StatKey in the schema and defPct is inert in v1, so
 *         either encoding must be damage-neutral and must never surface as an ATK grant.
 *   B     no shield event is exposed on cfg.onEvent and no unit in the control comp carries a
 *         shielded trigger, so the payload is pinned structurally and shown damage-inert here.
 *
 * RUNS: 7 (base + 6 counterfactuals), all hoisted at module scope.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- the override JSON and the SimEvent union are
   read structurally in this blind spec test; it must not assume field names it cannot see. */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-08-05 (driver, mechanical): blind/ sits under kit-autonomy/, not tests/units/ — no assertion changed

const SLUG = 'ram';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type AnyRec = Record<string, any>;
type AnyEv = SimEvent & AnyRec;

const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

/** The override file is slot-keyed; tolerate both `slot: Block[]` and `slot: { blocks: Block[] }`. */
function blocksOf(ov: AnyRec, slot: string): AnyRec[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s as AnyRec[];
  if (s && Array.isArray(s.blocks)) return s.blocks as AnyRec[];
  return [];
}
const effectsOf = (b: AnyRec): AnyRec[] => (Array.isArray(b?.effects) ? b.effects : []);
const allBlocks = (ov: AnyRec): AnyRec[] => SLOTS.flatMap((s) => blocksOf(ov, s));
const allEffects = (ov: AnyRec): AnyRec[] => allBlocks(ov).flatMap(effectsOf);

function unmodeledOf(ov: AnyRec, slot: string): string[] {
  const top = ov?.unmodeled?.[slot];
  const nested = ov?.[slot]?.unmodeled?.[slot];
  return [
    ...(Array.isArray(top) ? (top as string[]) : []),
    ...(Array.isArray(nested) ? (nested as string[]) : []),
  ];
}

const isMaxHpBuff = (e: AnyRec) =>
  e.kind === 'buff' && /maxhp/i.test(String(e.stat)) && near(Number(e.value), 40.72, 0.2);
const isDefBuff = (e: AnyRec) => e.kind === 'buff' && /def/i.test(String(e.stat));
const isAtkStat = (e: AnyRec) => e.kind === 'buff' && /atk/i.test(String(e.stat));
const isDamageEffect = (e: AnyRec) =>
  ['flatDamage', 'dot', 'hitRepeat', 'storedHit', 'stackedNuke'].includes(String(e.kind));

const pristine = () => withPatchedOverride(SLUG, () => {}) as unknown as AnyRec;
const patched = (mutate: (ov: AnyRec) => void) =>
  withPatchedOverride(SLUG, mutate as any);

function dropEffects(ov: AnyRec, slot: string, pred: (e: AnyRec) => boolean) {
  for (const b of blocksOf(ov, slot)) b.effects = effectsOf(b).filter((e) => !pred(e));
}

function run(override?: unknown) {
  const events: SimEvent[] = [];
  const opts = controlComp(SLUG, true) as unknown as AnyRec;
  const onEvent = (e: SimEvent) => events.push(e);
  opts.cfg = { ...(opts.cfg ?? {}), onEvent };
  if (override !== undefined) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: override };
  }
  const res = runComp(opts as any);
  return { res, events, tot: totals(res) };
}
type Run = ReturnType<typeof run>;

const buffApplies = (r: Run) => r.events.filter((e) => e.kind === 'buffApply') as AnyEv[];
const countKind = (r: Run, kind: string) => r.events.filter((e) => e.kind === kind).length;
const maxHpFlatTo = (r: Run, want: (slug: string) => boolean) =>
  buffApplies(r).filter(
    (e) => String(e.stat) === 'maxHpFlat' && want(String(e.targetSlug ?? '')),
  ).length;

// ---- hoisted runs (7 full 180s sims) ------------------------------------------------------
const OV = pristine();
const base = run();
const noCdr = run(patched((ov) => dropEffects(ov, 'skill1', (e) => e.kind === 'burstCdr')));
const cdrUngated = run(
  patched((ov) => {
    for (const b of blocksOf(ov, 'skill1')) {
      if (effectsOf(b).some((e) => e.kind === 'burstCdr')) delete b.teamHas;
    }
  }),
);
const noMaxHp = run(patched((ov) => dropEffects(ov, 'skill2', isMaxHpBuff)));
const maxHpToAllies = run(
  patched((ov) => {
    for (const b of blocksOf(ov, 'skill2')) {
      if (effectsOf(b).some(isMaxHpBuff)) b.target = { kind: 'allies' };
    }
  }),
);
const noDef = run(patched((ov) => dropEffects(ov, 'skill2', isDefBuff)));
const noShield = run(patched((ov) => dropEffects(ov, 'burst', (e) => e.kind === 'shield')));

describe('ram — fixture sanity', () => {
  it('ram fires and the comp actually reaches Full Burst (non-vacuity for every gated line)', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // S1-b keys off Full Burst END; if the fixture never entered/left a Full Burst the whole
    // rotation group below would be testing nothing.
    expect(countKind(base, 'fullBurstStart')).toBeGreaterThan(0);
    expect(countKind(base, 'fullBurstEnd')).toBeGreaterThan(0);
  });
});

describe('ram — skill1-a: ATK down 7.95% on the target after 5 landed normals', () => {
  it('is enemy-scoped with a negative value on a 5-hit counter, or is explicitly unmodeled', () => {
    const atkDownBlocks = allBlocks(OV).filter((b) =>
      effectsOf(b).some(
        (e) => isAtkStat(e) && near(Math.abs(Number(e.value)), 7.95, 0.1),
      ),
    );
    if (atkDownBlocks.length > 0) {
      // Faithful: a debuff on the boss, fired every 5 ROUNDS (ram is 1 hit/shot), 5 sec window.
      // Nearest-wrong it fails under: ally/self scope, positive sign, a shotFired/interval trigger.
      for (const b of atkDownBlocks) {
        expect(b.target?.kind).toBe('enemy');
        expect(b.trigger?.kind).toBe('hitCount');
        expect(Number(b.trigger?.count)).toBe(5);
        for (const e of effectsOf(b).filter(isAtkStat)) {
          expect(Number(e.value)).toBeLessThan(0);
          expect(Number(e.durationSec)).toBeCloseTo(5, 3);
        }
      }
    } else {
      // The engine resolves an enemy target to nobody, so skipping is defensible — but only if
      // the drop is recorded verbatim rather than silent.
      expect(unmodeledOf(OV, 'skill1').join(' ').includes('7.95')).toBe(true);
    }
  });

  it('never becomes team damage: no Damage Taken debuff and no ally-facing ATK grant anywhere', () => {
    // Ram's kit contains ZERO ATK grants and ZERO Damage Taken lines. Re-badging her boss ATK
    // debuff as damageTakenPct is the one mis-model that would silently inflate the whole team.
    expect(
      allEffects(OV).filter((e) => e.kind === 'buff' && String(e.stat) === 'damageTakenPct'),
    ).toHaveLength(0);
    const allyAtkBlocks = allBlocks(OV).filter(
      (b) => b.target?.kind !== 'enemy' && effectsOf(b).some(isAtkStat),
    );
    expect(allyAtkBlocks).toHaveLength(0);
    // Boss-held debuffs emit with casterIdx === null AND targetIdx === null, so filter by stat+value.
    const badBoss = buffApplies(base).filter(
      (e) => String(e.stat) === 'damageTakenPct' && near(Number(e.value), 7.95, 0.2),
    );
    expect(badBoss).toHaveLength(0);
  });

  it.skip('the boss-side ATK reduction itself is unobservable — v1 models no enemy entity and no incoming damage', () => {
    // GAP: resolveTargets({kind:enemy}) returns []; there is no boss ATK, HP pool or player damage
    // taken in the sim, so the payload has no observable channel. Only its ABSENCE from the ally
    // side (asserted above) is testable.
  });
});

describe('ram — skill1-b: Burst CD down 20.16 sec at Full Burst end, same-squad gated', () => {
  it('is keyed to fullBurstEnd, self-targeted, squad-gated, repeatable, at 20.16 sec', () => {
    const cdrBlocks = allBlocks(OV).filter((b) =>
      effectsOf(b).some((e) => e.kind === 'burstCdr'),
    );
    expect(cdrBlocks).toHaveLength(1);
    const b = cdrBlocks[0];
    expect(b.slot === undefined || b.slot === 'skill1').toBe(true);
    // Trigger identity — 'when Full Burst ends' is neither fullBurstEnter nor burstCast.
    expect(b.trigger?.kind).toBe('fullBurstEnd');
    // Target set — 'Affects self'; an allies target would CDR the entire team.
    expect(b.target?.kind).toBe('self');
    // 'with an ally from the same squad still on the battlefield' is the composition gate; the
    // schema's own primitive for that wording is teamHas.sameSquad (never an enumerated slug list).
    expect(b.teamHas?.sameSquad).toBe(true);
    const cdr = effectsOf(b).find((e) => e.kind === 'burstCdr') as AnyRec;
    expect(Number(cdr.seconds)).toBeCloseTo(20.16, 2);
    // The kit puts no once-per-battle or every-Nth limiter on the line.
    expect(cdr.oncePerBattle).toBeFalsy();
    expect(Number(b.everyN ?? 1)).toBe(1);
  });

  it('a cooldown reduction can only pull full bursts forward, never delay them', () => {
    // Directional by construction: ram is Burst I sharing stage 1 with liter, so she is not
    // guaranteed to be the selected caster. Removing the CDR must never INCREASE the full-burst
    // count; removing the squad gate (which the control comp cannot satisfy — liter/crown/helm are
    // not ram's squad) must never DECREASE it. A model that keys the CDR to the wrong edge or
    // hands it to the team breaks the second inequality.
    expect(countKind(base, 'fullBurstStart')).toBeGreaterThanOrEqual(
      countKind(noCdr, 'fullBurstStart'),
    );
    expect(countKind(cdrUngated, 'fullBurstStart')).toBeGreaterThanOrEqual(
      countKind(base, 'fullBurstStart'),
    );
  });
});

describe('ram — skill2-a: self Max HP up 40.72% for 10 sec', () => {
  it('is a self-scoped Max HP buff at 40.72% with a 10 sec window', () => {
    const hpBlocks = blocksOf(OV, 'skill2').filter((b) => effectsOf(b).some(isMaxHpBuff));
    expect(hpBlocks).toHaveLength(1);
    const b = hpBlocks[0];
    expect(b.target?.kind).toBe('self');
    const e = effectsOf(b).filter(isMaxHpBuff)[0];
    // targetMaxHpPct (own Max HP) or the maxHpPct self path — never casterMaxHpPct handed outward.
    expect(['targetMaxHpPct', 'maxHpPct']).toContain(String(e.stat));
    expect(Number(e.durationSec)).toBeCloseTo(10, 3);
    // 'for 10 sec' is wall-clock, not a round count.
    expect(e.durationShots).toBeUndefined();
  });

  it('grants Max HP to ram and to nobody else', () => {
    // caster/target-scaled Max HP is flat-resolved on buffApply under stat maxHpFlat.
    const toRam = maxHpFlatTo(base, (s) => s === SLUG);
    const toRamWithout = maxHpFlatTo(noMaxHp, (s) => s === SLUG);
    expect(toRam).toBeGreaterThan(0);
    expect(toRam).toBeGreaterThan(toRamWithout); // proves these events are ram's own line
    // Scope: re-targeting the same block to allies must reach units it does not reach today.
    expect(maxHpFlatTo(maxHpToAllies, (s) => s !== SLUG)).toBeGreaterThan(
      maxHpFlatTo(base, (s) => s !== SLUG),
    );
  });

  it('moves zero damage — ram has no HP-to-ATK conversion', () => {
    // RED under the nearest-wrong model that routes Max HP into ATK (atkOfMaxHpPct /
    // atkOfCasterMaxHpPct), which would change ram's own total.
    expect(noMaxHp.tot).toEqual(base.tot);
  });
});

describe('ram — skill2-b: DEF up 11.34% of the user DEF to the 2 lowest-HP allies', () => {
  it('is either an alliesLowestHp DEF grant or explicitly unmodeled, and never an ATK grant', () => {
    const defBlocks = blocksOf(OV, 'skill2').filter((b) => effectsOf(b).some(isDefBuff));
    if (defBlocks.length > 0) {
      for (const b of defBlocks) {
        expect(b.target?.kind).toBe('alliesLowestHp');
        expect(Number(b.target?.count)).toBe(2);
        for (const e of effectsOf(b).filter(isDefBuff)) {
          expect(Number(e.durationSec)).toBeCloseTo(5, 3);
        }
      }
    } else {
      // The schema has no 'percent of the caster DEF' stat and defPct is inert in v1, so recording
      // the line verbatim is acceptable — going silent is not.
      expect(unmodeledOf(OV, 'skill2').join(' ').includes('11.34')).toBe(true);
    }
    // Whatever the encoding, a DEF line must never surface as offence.
    const atk1134 = allEffects(OV).filter(
      (e) => isAtkStat(e) && near(Math.abs(Number(e.value)), 11.34, 0.1),
    );
    expect(atk1134).toHaveLength(0);
  });

  it('moves zero damage — DEF is inert in v1', () => {
    expect(noDef.tot).toEqual(base.tot);
  });
});

describe('ram — burst: shield for all allies at 10.08% of her final Max HP, 10 sec', () => {
  it('is a shield effect on all allies at 10.08% for 10 sec, with no damage rider', () => {
    const shieldBlocks = blocksOf(OV, 'burst').filter((b) =>
      effectsOf(b).some((e) => e.kind === 'shield'),
    );
    expect(shieldBlocks).toHaveLength(1);
    const b = shieldBlocks[0];
    expect(b.trigger?.kind).toBe('burstCast');
    // 'all allies' includes ram herself — excludeSelf would drop her own shield.
    expect(b.target?.kind).toBe('allies');
    expect(b.target?.excludeSelf).toBeFalsy();
    const e = effectsOf(b).find((x) => x.kind === 'shield') as AnyRec;
    expect(Number(e.maxHpPct)).toBeCloseTo(10.08, 2);
    expect(Number(e.durationSec)).toBeCloseTo(10, 3);
    // Her burst has no damage line at all; any damage effect in this slot is invented.
    expect(blocksOf(OV, 'burst').flatMap(effectsOf).filter(isDamageEffect)).toHaveLength(0);
  });

  it('is damage-inert in the control comp — its value is tandem-only', () => {
    // liter / crown / helm carry no shielded-trigger or requiresShielded block, so the shield must
    // not move any total here. A difference means a shield consumer exists in this fixture and the
    // inertness claim has to be re-scoped, not that the shield is wrong.
    expect(unitOf(noShield.res, SLUG).totalDamage).toBe(unitOf(base.res, SLUG).totalDamage);
    expect(noShield.tot).toEqual(base.tot);
  });

  it.skip('the shield application itself is not directly observable — cfg.onEvent exposes no shield event', () => {
    // GAP: the event kinds are shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/
    // fullBurstEnd. Proving the shield reaches all four allies needs a shielded-trigger consumer
    // (e.g. a naga-style requiresShielded block) in the comp, which controlComp cannot supply.
  });
});

```

---

# SECTION: S6 BLIND OVERRIDE (claude-opus-5) — scripts/kit-autonomy/blind/ram.override.json

Driver-side diff vs the driver override (3 divergences, all principled):
1. skill1 CDR: IDENTICAL encoding; blind ADDS teamHas.sameSquad (same divergence as the S5 blind test — both blind agents independently derive the squad gate from the kit wording).
2. skill2 Max-HP line: blind uses trigger passive (fires once at t=0, lapses at t=10, never re-fires); driver uses interval:15 (the documented 2026-07-20 convention for kit-silent CD skills — pepper/helm-aquamarine precedent; S2 has a datamined 15s cooldown and re-fires every 15s in game).
3. skill2 DEF line: blind MODELS defPct 11.34 → alliesLowestHp 2 (wrong basis — the kit says "11.34% of the skill user's DEF" = a caster-basis flat DEF add; defPct scales the TARGET's own DEF; no caster-DEF primitive exists and DEF is inert in v1 anyway); driver carries it UNMODELED verbatim.
Convergences: burst shield block IDENTICAL (burstCast → allies → shield maxHpPct 10.08 / 10s); both agree the enemy ATK▼ line is unmodeled-by-construction; both agree the Max-HP grant is an own-% targetMaxHpPct self-buff.

```json
{
  "slug": "ram",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "teamHas": {
        "sameSquad": true
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 20.16
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
          "stat": "targetMaxHpPct",
          "value": 40.72,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "alliesLowestHp",
        "count": 2
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "defPct",
          "value": 11.34,
          "durationSec": 5
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
          "kind": "shield",
          "maxHpPct": 10.08,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates after landing 5 normal attack(s). Affects the target(s). ATK ▼ 7.95% for 5 sec. — enemy ATK debuff: the v1 boss deals no damage and enemy ATK is not an input to the damage formula, so the line has no consumer (it is NOT a Damage Taken ▲ debuff, which would benefit the team)."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ Kit-silent triggers: both skill2 lines state a duration but carry NO activation clause. Modeled as `passive`, so each applies once at t=0 and lapses after its stated window (10 s / 5 s) instead of refreshing. Damage-inert for this kit either way, but the trigger identity is unverified.",
    "⚑ teamHas.sameSquad FAILS CLOSED — if src/data/squads.ts carries no squad entry for ram, the 20.16 s burst-CDR never fires and her Burst I cadence stays at the flat 40 s cooldown. This is the ONE damage-relevant lever in the kit (faster Burst I → more full bursts), so the squad curation is load-bearing.",
    "DEF ▲ 11.34% \"of the skill user's DEF\" has no caster-scaled DEF StatKey (no `casterDefPct` exists); authored as plain `defPct`, which is inert in v1 (self DEF does not affect own damage). Kept for kit completeness and as a future consumer hook; the caster-scaling is not represented.",
    "Max HP ▲ 40.72% is offensively inert here — ram carries no `atkOfMaxHpPct`, and ally-granted Max HP never feeds a teammate's HP→ATK conversion. It does set the basis of the burst shield (10.08% of final Max HP); the sim models no HP pool, so the shield amount is recorded, not simulated.",
    "\"without restoring HP\" — the Max HP grant emits NO recovery event. It is deliberately NOT paired with a `heal`, which would falsely fire teammates' `recovery` triggers (e.g. crown).",
    "The burst shield targets ALL allies (self included) and fires their `shielded` triggers / satisfies `requiresShielded` gates — the only cross-unit damage channel in this kit. Do not skip it on isolation grounds."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. ram (SR/Fire/Defender/Burst I) is a pure support/defensive kit — no damage effect of any kind. Modeled: (skill1) a full-burst-end self burst-CDR of 20.16 s gated on a same-squad ally; (skill2) a self Max HP ▲ 40.72% and a 2-lowest-HP-ally DEF ▲ 11.34%; (burst) an all-ally shield worth 10.08% of her final Max HP for 10 s. The burst-CDR is the only line that moves damage — it shortens her 40 s Burst I cooldown and therefore the team's full-burst cadence. Her skill1 target ATK ▼ is unmodeled (see `unmodeled`). No `noFb` is set (no damage riders exist to exempt) and `noRange` is engine-automatic."
}
```

---

# SECTION: DRIVER IMPLEMENTATION — scripts/tests/units/ram.test.ts (12/12 green) + src/skills/overrides/ram.json

## driver test file

```ts
// PER-UNIT KIT SPEC — `ram` (Ram, SR/Defender/Fire, Burst I, cd 40s, ammo 6,
// chargeFrames 60, reloadFrames 141, skill2 CD 15s, normalMult 69.04 / chargeMult 250 /
// coreMult 200, critRate 15 / critDamage 150). Kit-autonomy gauntlet 2026-08-05.
//
// Ram is the DEFENSIVE base counterpart of the Re:ZERO collab pair (rem is the Burst-II
// offensive sister) — this is the BASE unit, distinct from any variant. Her kit is almost
// entirely survivability (an enemy ATK debuff, a self Max-HP grant, an ally DEF grant, a
// team shield) plus ONE rotation line: the Full-Burst-end refund of her own burst cooldown.
// In the v1 DPS scope (no HP pool, boss deals no damage, no enemy ATK modeled) only two
// surfaces are observable: (1) the burst CDR moves her cast cadence — she is the fixture's
// stage-1 filler, so her CD gates the whole chain (sim.ts first-ready-with-waiting); and
// (2) the burst shield emits a shield EVENT that fires 'shielded'-trigger consumers.
//
// Kit (blablalink prose, data/characters.json → characters.ram.skills):
//   S1 "Fura" (StateEffect, no CD):
//      ■ after landing 5 normal attacks → the target: ATK ▼7.95% for 5 sec          [R2]
//      ■ when Full Burst ends (ally on battlefield) → self: Burst Skill cooldown
//        ▼20.16 sec                                                                  [R1]
//   S2 "Sister's Authority" (CD 15s — trigger KIT-SILENT, pure internal timer):
//      ■ self: Max HP ▲40.72% WITHOUT restoring HP for 10 sec                       [R3]
//      ■ 2 allies with the lowest remaining HP: DEF ▲11.34% of the skill user's DEF
//        for 5 sec                                                                   [R4]
//   BU "Don't Bother Ram" (Burst I, cd 40s):
//      ■ all allies: Shield with 10.08% of the skill user's final Max HP for 10 sec [R5]
//
// Dispositions + why each assertion discriminates:
//   R1 FAITHFUL (rotation-load-bearing) — fullBurstEnd → self burstCdr 20.16. Her raw CD is
//      40s; the refund lands at each Full Burst END (trigger identity — the kit says "when
//      Full Burst ends", not "enters"), pulling her next-ready to ≈ cast+20s so the team's
//      stage-1 fill cadence doubles once the gauge cycle is below ~20s. Pinned by the
//      cast-1→cast-2 GAP (well inside the raw 40s cooldown) and the 180s CAST COUNT against
//      the no-CDR counterfactual, whose second cast sits at the full ~40s CD. All her casts
//      are stage 1. SAME-SQUAD GATE: the "an ally from the same squad still on the
//      battlefield" clause is modeled ALWAYS-SATISFIED — the engine HAS the primitive
//      (teamHas.sameSquad, fails closed off src/data/squads.ts) but ram's collab squad is
//      UNCONFIRMED (QUEUE.md "same-squad primitive migrations": "collab-unit squad unknown,
//      confirm before authoring"; squad membership is owner-confirmed fact, never derived),
//      so the anchor-innocent-maid precedent ships: gate omitted, caveat + ⚑ carried in the
//      override. "Still on the battlefield" is scope-trivial regardless (nobody dies in v1).
//   R2 UNMODELED — enemy ATK▼: the engine models NO enemy ATK (v1 boss deals no damage; the
//      enemy-buff branch accepts only damageTakenPct/distributedDamagePct > 0 — "other enemy
//      debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0", sim.ts). Offensively inert by
//      construction; the nearest-wrong mapping (damageTakenPct — "boss takes more damage") is a
//      DIFFERENT mechanic that would silently credit the whole team. Pinned by ABSENCE (zero
//      boss debuffs from ram) + a sensitivity counterfactual proving the pin catches the
//      damageTakenPct reflex. Verbatim in override.unmodeled.
//   R3 FAITHFUL (inert-native) — interval:15 (the datamined skillCooldownsSec.skill2; kit-silent
//      trigger = pure internal timer, pepper/helm-aquamarine convention; first fire t=15) → self
//      targetMaxHpPct 40.72, durationSec 10. 'Max HP ▲ X%' with no 'of the skill user' clause =
//      the TARGET's OWN % (targetMaxHpPct — blanc/maiden/2b precedent; the plain maxHpPct StatKey
//      is cube-only and the validator rejects it in overrides); self-targeted so caster===target
//      and the grant arrives as an OWN-kit maxHpFlat (casterIdx===self). Damage-INERT for ram:
//      the only consumer of own-kit maxHpFlat is atkOfMaxHpPct HP-scaling ATK and she has none —
//      the inertness proof (totals byte-identical with the block removed) is asserted. 'WITHOUT
//      restoring HP' is honored by construction: the engine never emits a recovery event from a
//      Max-HP grant (no HP pool; the nearest-wrong 'Max-HP-up-with-heal' reflex would fire
//      on-recovery consumers, none of which exist in this fixture). 10s expiry pinned off the
//      event's expiresFrame; 15s cadence off the first-fire at t=15.
//   R4 UNMODELED — DEF ▲11.34% OF THE SKILL USER'S DEF: a caster-basis flat DEF add — no such
//      primitive exists (defPct scales the TARGET's own DEF, the wrong basis, and is inert in v1
//      regardless — "self DEF doesn't affect own damage"). The target clause ('2 allies with the
//      lowest remaining HP') HAS a primitive (alliesLowestHp, leftmost stand-in) — the blocker is
//      purely the payload. Second-nearest wrong (S2b): the '% of the skill user's <stat>' template
//      pattern-matching to casterAtkPct — silently flat-ATK-ing two allies. Pinned by ABSENCE
//      (zero defPct AND zero casterAtkPct events sourced from ram) + sensitivity counterfactual.
//      Verbatim in override.unmodeled.
//   R5 FAITHFUL — burstCast → allies → shield maxHpPct 10.08, durationSec 10. No shield HP pool
//      is modeled (v1); the shield primitive emits the shield EVENT channel, opening each
//      target's shield-state window and firing their 'shielded' triggers — observable ONLY
//      through a real consumer: the fixture seats naga, whose S1 is 'shielded → all allies:
//      coreDamagePct 85.17'. Ram is the fixture's SOLE shield source (helm/naga overrides emit
//      zero shield effects), so every naga coreDamagePct application is attributable to a ram
//      burst cast — pinned FRAME-LOCKED (same frame as each ram burstCast). The 10.08% magnitude
//      rides in the effect for kit completeness (engine records it; no HP pool to act on).
//      Counterfactuals: shield removed → zero naga coreDamagePct; shield mis-encoded as heal →
//      recovery channel, not shielded → also zero (wrong-synergy-channel discriminator).
//      R5b (trigger identity, S2b-requested): in a TWO-B1 comp (liter alongside ram), the
//      burstCast keying must emit the shield ONLY on ram-cast chains — never on Full Bursts
//      liter opened while ram sat out. The probe equalizes CDs (CDR removed in-memory) so the
//      engine's earliest-ready pick alternates ram/liter cleanly; the fullBurstEnter-keyed
//      counterfactual lands the shield when the FB window OPENS (after the chain completes —
//      not on the B1 caster's frame), so the consumer fires on frames with no ram cast.
//
// Inert UNMODELED magnitudes with no assertions: the 7.95% ATK▼ and 11.34% DEF payloads
// (damage-inert in v1) and the 10.08% shield HP amount (no HP pool — recorded on the effect).
//
// Fixture: sole-B1 comp ram(B1) / naga(B2) / helm(B3), boss Iron (neutral for Fire ram),
// focus ram — ram OWNS the B1 slot (controlComp seats liter at B1, where ram would cast ZERO
// bursts and every R1/R5 assertion would pass vacuously); naga supplies the B2 + the shielded
// consumer, helm the B3 so the chain completes and fullBurstEnd fires. Deterministic (no seed);
// assertions read the event log, not totals (except R3's inertness proof).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: ram 0 / naga 1 / helm 2. */
const RAM = 0;
const NAGA = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['ram', 'naga', 'helm'],
    bossElement: 'Iron',
    focusSlug: 'ram',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

const casts = (events: SimEvent[]): BurstCast[] =>
  events.filter((e): e is BurstCast => e.kind === 'burstCast');
const buffs = (events: SimEvent[]): BuffApply[] =>
  events.filter((e): e is BuffApply => e.kind === 'buffApply');
const ramCastsOf = (events: SimEvent[]): BurstCast[] =>
  casts(events).filter((e) => e.slug === 'ram');

/** naga's SHIELDED-TRIGGER line only (coreDamagePct 85.17) — her skill2 carries a SECOND,
 *  non-shield coreDamagePct 40.07 line (hitCount 5 → top-ATK allies) that must be excluded. */
const nagaShieldCore = (events: SimEvent[], nagaIdx: number): BuffApply[] =>
  buffs(events).filter(
    (e) =>
      e.stat === 'coreDamagePct' && e.casterIdx === nagaIdx && e.value === 85.17
  );

// ---- counterfactual / sensitivity patches ------------------------------------------------------

const hasCdr = (b: any) => b.effects.some((e: any) => e.kind === 'burstCdr');
const hasShield = (b: any) => b.effects.some((e: any) => e.kind === 'shield');
const hasMaxHp = (b: any) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === 'targetMaxHpPct');

/** R1 counterfactual: the no-CDR kit — second cast sits at the full 40s cooldown. */
const ramNoCdr = withPatchedOverride('ram', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasCdr(b));
  if (ov.skill1.length === before) {
    throw new Error('ram S1 burstCdr block missing — fixture is stale');
  }
});

/** R2 sensitivity: the damageTakenPct REFLEX mis-encoding of the enemy ATK▼ line. */
const ramAtkDownReflex = withPatchedOverride('ram', (ov) => {
  ov.skill1.push({
    slot: 'skill1',
    trigger: { kind: 'hitCount', count: 5 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 7.95, durationSec: 5 },
    ],
  });
});

/** R3 counterfactual: the S2L1 grant removed (also the inertness probe). */
const ramNoMaxHp = withPatchedOverride('ram', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasMaxHp(b));
  if (ov.skill2.length === before) {
    throw new Error('ram S2 targetMaxHpPct block missing — fixture is stale');
  }
});

/** R4 sensitivity: the defPct REFLEX mis-encoding of the caster-basis DEF grant. */
const ramDefReflex = withPatchedOverride('ram', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'interval', sec: 15 },
    target: { kind: 'alliesLowestHp', count: 2 },
    effects: [{ kind: 'buff', stat: 'defPct', value: 11.34, durationSec: 5 }],
  });
});

/** R5 counterfactual: the shield block removed — naga's consumer goes silent. */
const ramNoShield = withPatchedOverride('ram', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasShield(b));
  if (ov.burst.length === before) {
    throw new Error('ram burst shield block missing — fixture is stale');
  }
});

/** R5 counterfactual: shield mis-encoded as heal (recovery channel, not shielded). */
const ramShieldAsHeal = withPatchedOverride('ram', (ov) => {
  for (const b of ov.burst) {
    b.effects = b.effects.map((e: any) =>
      e.kind === 'shield' ? { kind: 'heal' } : e
    );
  }
});

/** R5b counterfactual: shield re-keyed burstCast → fullBurstEnter (fires every FB, including
 *  chains ram sat out). Combined with the no-CDR patch so the probe comp alternates B1s. */
const ramNoCdrShieldFbEnter = withPatchedOverride('ram', (ov) => {
  ov.skill1 = ov.skill1.filter((b: any) => !hasCdr(b));
  for (const b of ov.burst) {
    if (hasShield(b)) {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});

// ---- R1: S1L2 — Full-Burst-end self burst CDR (rotation-load-bearing) --------------------------
describe('ram R1 — S1 "when Full Burst ends → own Burst Skill cooldown ▼20.16s"', () => {
  it('casts are stage 1, and the CDR pulls the second cast well inside the raw 40s CD', () => {
    const { events } = run();
    const ramCasts = ramCastsOf(events);
    expect(ramCasts.length).toBeGreaterThanOrEqual(2);
    expect(ramCasts.every((e) => e.stage === 1)).toBe(true);
    const gapSec = (ramCasts[1].frame - ramCasts[0].frame) / FPS;
    // cast sets a 40s CD; the FB-end refund (20.16s) lands ≈10s later at FB end,
    // so the second cast must land well before the raw-CD 40s mark.
    expect(gapSec).toBeLessThan(35);
  });

  it('discriminates the no-CDR counterfactual: later second cast, fewer 180s casts', () => {
    const shipped = run();
    const noCdr = run({ ram: ramNoCdr });
    const sCasts = ramCastsOf(shipped.events);
    const nCasts = ramCastsOf(noCdr.events);
    expect(nCasts.length).toBeGreaterThanOrEqual(2);
    const sGap = (sCasts[1].frame - sCasts[0].frame) / FPS;
    const nGap = (nCasts[1].frame - nCasts[0].frame) / FPS;
    expect(nGap).toBeGreaterThan(sGap + 5); // ≈40s raw CD vs ≈20s refunded
    // 180s count is secondary (the team gauge cycle co-limits cadence) but must
    // still favor the refunded CD.
    expect(sCasts.length).toBeGreaterThan(nCasts.length);
  });
});

// ---- R2: S1L1 — enemy ATK▼7.95% (UNMODELED: no enemy-ATK primitive) -----------------------------
describe('ram R2 — S1 "after 5 normal attacks → target ATK ▼7.95%" (UNMODELED)', () => {
  // Boss-debuff events carry casterIdx null (the enemy branch passes no owner), so
  // attribution rides stat+value directly; neither naga nor helm carries a
  // damageTakenPct line, so any such application in these runs is ram's.
  it('shipped emits ZERO boss debuffs from ram', () => {
    const { events } = run();
    expect(
      buffs(events).filter(
        (e) => e.stat === 'damageTakenPct' && e.value === 7.95
      )
    ).toHaveLength(0);
  });

  it('sensitivity: the damageTakenPct reflex WOULD register (and inflate team damage)', () => {
    const shipped = run();
    const reflex = run({ ram: ramAtkDownReflex });
    expect(
      buffs(reflex.events).filter(
        (e) => e.stat === 'damageTakenPct' && e.value === 7.95
      ).length
    ).toBeGreaterThanOrEqual(1);
    expect(totals(reflex.res).helm).toBeGreaterThan(totals(shipped.res).helm);
  });
});

// ---- R3: S2L1 — self Max HP ▲40.72% / 10s, no heal (inert-native grant) -------------------------
describe('ram R3 — S2 "self Max HP ▲40.72% without restoring HP for 10s"', () => {
  it('grants an OWN-kit maxHpFlat at the 15s internal cadence, 10s expiry', () => {
    const { events, res } = run();
    const grants = buffs(events).filter(
      (e) => e.stat === 'maxHpFlat' && e.targetIdx === RAM && e.casterIdx === RAM
    );
    // interval:15 — fires at t=15,30,…,165 ⇒ 11 applications in a 180s fight.
    expect(grants.length).toBe(11);
    expect(grants[0].sec).toBeCloseTo(15, 1);
    const expected = (40.72 / 100) * unitOf(res, 'ram').maxHp;
    for (const g of grants) {
      expect(g.value).toBeCloseTo(expected, 6);
      expect(g.expiresFrame! - g.frame).toBe(10 * FPS);
    }
  });

  it('is damage-inert: removing the block moves NO total (no HP-scaling consumer)', () => {
    const shipped = run();
    const removed = run({ ram: ramNoMaxHp });
    expect(totals(removed.res)).toEqual(totals(shipped.res));
  });
});

// ---- R4: S2L2 — DEF ▲11.34% of caster DEF to 2 lowest-HP allies (UNMODELED) ---------------------
describe('ram R4 — S2 "DEF ▲11.34% of user DEF to 2 lowest-HP allies" (UNMODELED)', () => {
  it('shipped emits ZERO defPct events and ZERO casterAtkPct from ram', () => {
    const { events } = run();
    expect(buffs(events).filter((e) => e.stat === 'defPct')).toHaveLength(0);
    expect(
      buffs(events).filter(
        (e) => e.stat === 'casterAtkPct' && e.casterIdx === RAM
      )
    ).toHaveLength(0);
  });

  it('sensitivity: the defPct reflex WOULD register', () => {
    const reflex = run({ ram: ramDefReflex });
    expect(
      buffs(reflex.events).filter((e) => e.stat === 'defPct').length
    ).toBeGreaterThanOrEqual(1);
  });
});

// ---- R5: Burst — all-ally shield, 10.08% of final Max HP / 10s ----------------------------------
describe('ram R5 — burst "Shield = 10.08% of final Max HP, all allies, 10s"', () => {
  it('every ram burst cast fires naga shielded consumer, FRAME-LOCKED', () => {
    const { events } = run();
    const ramCasts = ramCastsOf(events);
    expect(ramCasts.length).toBeGreaterThanOrEqual(1);
    const nagaCore = nagaShieldCore(events, NAGA);
    expect(nagaCore.length).toBeGreaterThanOrEqual(1);
    for (const c of ramCasts) {
      expect(
        nagaCore.some((e) => e.frame === c.frame),
        `no naga coreDamagePct application at ram cast frame ${c.frame}`
      ).toBe(true);
    }
  });

  it('counterfactuals: shield removed OR shield-as-heal both silence the consumer', () => {
    const removed = run({ ram: ramNoShield });
    expect(nagaShieldCore(removed.events, NAGA)).toHaveLength(0);
    const asHeal = run({ ram: ramShieldAsHeal });
    expect(nagaShieldCore(asHeal.events, NAGA)).toHaveLength(0);
  });
});

// ---- R5b: trigger identity under two-B1 alternation (burstCast, NOT fullBurstEnter) ------------
describe('ram R5b — shield keyed to ram OWN burstCast (two-B1 alternation probe)', () => {
  const NAGA_IDX = 2; // probe comp: ram 0 / liter 1 / naga 2 / helm 3
  function runAlt(overrides: Record<string, any> = {}) {
    const events: SimEvent[] = [];
    const res = runComp({
      slugs: ['ram', 'liter', 'naga', 'helm'],
      bossElement: 'Iron',
      focusSlug: 'ram',
      overrides,
      cfg: { onEvent: (e) => events.push(e) },
    });
    return { events, res };
  }

  it('shipped: consumer fires on EVERY ram-cast chain and NO liter-cast chain', () => {
    // CDR removed in-memory: equal 40s CDs make the earliest-ready pick alternate
    // ram/liter cleanly (round-robin property) — the probe isolates KEYING, not cadence.
    const { events } = runAlt({ ram: ramNoCdr });
    const ramCasts = ramCastsOf(events);
    const literCasts = casts(events).filter((e) => e.slug === 'liter');
    expect(ramCasts.length).toBeGreaterThanOrEqual(2);
    expect(literCasts.length).toBeGreaterThanOrEqual(1); // alternation really happened
    const nagaCore = nagaShieldCore(events, NAGA_IDX);
    for (const rc of ramCasts) {
      expect(
        nagaCore.some((e) => e.frame === rc.frame),
        `consumer silent on ram cast frame ${rc.frame}`
      ).toBe(true);
    }
    for (const lc of literCasts) {
      expect(
        nagaCore.some((e) => e.frame === lc.frame),
        `consumer fired on liter-cast frame ${lc.frame} (ram sat out)`
      ).toBe(false);
    }
  });

  it('counterfactual: fullBurstEnter keying fires the consumer OUTSIDE ram casts', () => {
    // fullBurstEnter lands when the FB window opens (after the chain completes), not on
    // the B1 caster's frame — so the mis-keyed shield reaches Full Bursts liter opened
    // while ram sat out: consumer events appear on frames with NO ram cast.
    const { events } = runAlt({ ram: ramNoCdrShieldFbEnter });
    expect(
      casts(events).filter((e) => e.slug === 'liter').length
    ).toBeGreaterThanOrEqual(1);
    const nagaCore = nagaShieldCore(events, NAGA_IDX);
    const ramFrames = new Set(ramCastsOf(events).map((e) => e.frame));
    expect(nagaCore.some((e) => !ramFrames.has(e.frame))).toBe(true);
  });
});

```

## driver override

```json
{
  "note": "Kit-autonomy gauntlet 2026-08-05 (driver-authored; cross-family S2b claude-fable-5 / S5-S6 claude-opus-5 / S7 kimi-k3). ram (Ram) — SR / Defender / Fire / Burst I (cd 40s, ammo 6, chargeFrames 60, reloadFrames 141, hitsPerShot 1, normalMult 69.04 / chargeMult 250 / coreMult 200, critRate 15 / critDamage 150). Re:ZERO collab BASE counterpart of rem (the MG/Burst-II offensive sister); FROM-SCRATCH build — no prior override existed, simSupported was false. A pure Defender: her whole kit is survivability (an enemy ATK debuff, a self Max-HP grant, an ally DEF grant, a team shield) plus ONE rotation line — the Full-Burst-end refund of her own burst cooldown. In the v1 DPS scope (no HP pool, boss deals no damage, no enemy ATK modeled) only two surfaces are observable: the burst CDR (moves her cast cadence — she gates the stage-1 fill) and the burst shield (emits the shield EVENT that fires 'shielded' consumers / opens requiresShielded windows). MODELED: (S1b) 'when Full Burst ends with an ally from the same squad still on the battlefield → self: Cooldown of Burst Skill ▼ 20.16 sec' = fullBurstEnd → self burstCdr 20.16 — TRIGGER IDENTITY is FB END (the kit says 'when Full Burst ends', not enters); rotation-LOAD-BEARING: the refund collapses her 40s CD to ≈19.8s effective, so the team's stage-1 fill cadence doubles once the gauge cycle is below ~20s. SAME-SQUAD GATE modeled ALWAYS-SATISFIED (the anchor-innocent-maid precedent): the engine HAS the primitive (teamHas.sameSquad, fails closed off src/data/squads.ts) but ram's collab squad is UNCONFIRMED — QUEUE.md 'same-squad primitive migrations' says 'collab-unit squad unknown, confirm before authoring', and squad membership is owner-confirmed fact, never derived; the 'still on the battlefield' clause is scope-trivial regardless (nobody dies at scope lock). (S2a) 'self: Max HP ▲ 40.72% without restoring HP for 10 sec' = interval:15 → self targetMaxHpPct 40.72, durationSec 10 — kit-silent trigger on a CD skill = pure internal timer at the datamined skillCooldownsSec.skill2 = 15s (pepper / helm-aquamarine convention, first fire t=15); 'Max HP ▲ X%' with no 'of the skill user' clause = the TARGET's OWN % (targetMaxHpPct — blanc/maiden/2b precedent; plain maxHpPct is cube-only and validator-rejected in overrides); self-targeted so caster===target → an OWN-kit maxHpFlat grant (e3-eligible). Damage-INERT for ram (her kit has no atkOfMaxHpPct consumer — pinned: removing the block moves no total). 'WITHOUT restoring HP' is honored by construction: a Max-HP grant never emits a recovery event in this engine. (BU) 'all allies: Generates a Shield with 10.08% of the skill user's final Max HP for 10 sec' = burstCast → allies → shield maxHpPct 10.08 durationSec 10 — event-only shield (no HP pool in v1): opens each target's shield-state window (requiresShielded gate) and fires their 'shielded' triggers (naga-class consumers read her shield cadence). KEYED burstCast (her OWN Burst-I cast), NOT fullBurstEnter — pinned in a two-B1 alternation probe (liter opens chains ram sits out: no shield there). The 10.08% magnitude rides on the effect for kit completeness (engine records it; no HP pool to act on; 'final Max HP' caster basis noted). UNMODELED (both damage-inert by construction in v1, verbatim below): S1a the enemy ATK▼ debuff (the engine models NO enemy ATK — the enemy-buff branch accepts only damageTakenPct/distributedDamagePct > 0, 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0'; the nearest-wrong damageTakenPct is a DIFFERENT mechanic — boss-takes-more — that would over-credit the whole team; query/pepper/cocoa precedent) and S2b the caster-basis DEF grant (no caster-DEF-scaled StatKey — defPct scales the TARGET's own DEF, wrong basis, and is inert in v1 regardless; the target clause '2 lowest remaining HP' HAS a primitive, the blocker is purely the payload). RESIDUAL ⚑ FLAGS: ⚑1 CADENCE TUPLE (mandatory, datamine-unreliable): pullsPerSec / chargeFrames 60 / reloadFrames 141 shipped at datamine-synced base values; drives her shot count and gauge contribution. Estimate = datamine. Recipe: rounds/min + reload gap from any ram focus video. Tier: low. ⚑2 SAME-SQUAD GATE: modeled always-satisfied; if her in-game squad requires a collab partner (rem/emilia), the CDR over-fires in non-collab teams (impact = her burst/shield cadence only — damage-inert except through shield consumers like naga). Recipe: owner confirms the in-game squad field → curate src/data/squads.ts → swap in teamHas.sameSquad (QUEUE.md migration item). Tier 2. ⚑3 S2 first-fire phase (t=15 vs t=0) — the interval convention, unpinned by footage; worth one 10s grant window. Tier: low. EVIDENCE TIER: every magnitude/duration/trigger is kit-text-literal (DATAMINED L10); the only estimates are the three ⚑s. TIER 2 (scoped self-only CDR, fullBurstEnd trigger identity, burstCast-vs-fullBurstEnter keying, shield-event channel with cross-unit consumers). Faithful>fit; measured>fudge.",
  "unmodeled": {
    "skill1": [
      "■ Activates after landing 5 normal attack(s). Affects the target(s).\nATK ▼ 7.95% for 5 sec. — enemy ATK debuff: the engine models no enemy ATK (v1 boss deals no damage; the enemy-buff branch accepts only damageTakenPct/distributedDamagePct > 0), offensively inert by construction; the nearest-wrong mapping (damageTakenPct) is a different mechanic (boss-takes-more) that would over-credit the whole team."
    ],
    "skill2": [
      "■ Affects 2 ally unit(s) with the lowest remaining HP.\nDEF ▲ 11.34% of the skill user's DEF for 5 sec. — caster-basis flat DEF add: no such primitive (defPct scales the TARGET's own DEF — wrong basis — and is inert in v1 regardless); the target clause has a primitive (alliesLowestHp count 2, leftmost stand-in) — the blocker is purely the payload."
    ],
    "burst": []
  },
  "caveats": [
    "skill1: the burst-CDR's 'an ally from the same squad still on the battlefield' clause is modeled ALWAYS-SATISFIED — ram's collab squad is uncurated (squad membership is owner-confirmed fact; QUEUE.md 'same-squad primitive migrations' says confirm before authoring). If her in-game squad requires rem/emilia, the CDR over-fires in non-collab teams (⚑2: swap in teamHas.sameSquad once curated)",
    "skill1: the 'after landing 5 normal attacks → target ATK ▼ 7.95%' line is UNMODELED — the engine drops enemy ATK debuffs (they cannot affect damage dealt at DEF=0); NOT damageTakenPct (that is 'boss takes more damage' — a different mechanic)",
    "skill2: the Max-HP grant fires on the interval:15 convention for kit-silent CD skills (first fire t=15; ⚑3 phase unpinned by footage); it is damage-INERT for ram (no atkOfMaxHpPct consumer) and 'without restoring HP' is honored by construction (a Max-HP grant never emits recovery events)",
    "skill2: the DEF grant (11.34% of the skill user's DEF → 2 lowest-HP allies) is UNMODELED — no caster-basis DEF stat; defPct would be the wrong basis (target's own %) and is inert in v1 anyway",
    "burst: the shield is EVENT-ONLY (no HP pool in v1) — it opens shield-state windows and fires 'shielded' triggers (naga-class consumers), keyed to ram's OWN burstCast (never on Full Bursts she sat out); the 10.08%-of-final-Max-HP magnitude is recorded for kit completeness only"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "fullBurstEnd" },
      "target": { "kind": "self" },
      "effects": [{ "kind": "burstCdr", "seconds": 20.16 }]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 15 },
      "target": { "kind": "self" },
      "effects": [
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 40.72,
          "durationSec": 10
        }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "shield", "maxHpPct": 10.08, "durationSec": 10 }
      ]
    }
  ]
}

```
