# S7 JUDGE PACKET — `emma-tactical-upgrade` (Emma: Tactical Upgrade) — answer-faithful compilation of the gauntlet artifacts

Read this file ONCE, then return the JSON verdict. Do NOT read any other file. You grade ARTIFACTS vs ground
truth; you do NOT trust the driver's self-report. The full grading methodology + output contract is in §0.

## 0. Grading methodology + output contract (RECONCILING-JUDGE.md)

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

## 1. Mechanics SSOT (excerpts — pointers: docs/data/damage-calculation.md, docs/data/game-mechanics.md)

### 1a. damage-calculation.md §1–1g (formula + every bucket, incl. Taken/DamageUp/Projectile)

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

FinalATK = max(0, effectiveAtk − bossDef) // bossDef = 0 at scope lock

effectiveAtk = staticAtk × (1 + Σ ATK ▲ % / 100) + Σ (caster-ATK grants, as flat values) + (Σ ATK-of-Max-HP % / 100) × ownMaxHp

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

finalATK = staticAtk × (1 + Σ ATK%) + Σ("% of caster's ATK" flat) + Σ(HP→ATK flat)
dmg = (max(0, finalATK − enemyDEF) × weaponOrSkillCoef) ← DEF subtracts INSIDE the base, pre-coef
× major [1 + crit + core + fullBurst(0.5) + range(0.3)] ← ADDITIVE within (core does NOT ×crit)
× element [1 + 0.1 advantage + elem-dmg buffs]
× charge [charged shots only]
× dmgUp [1 + attackDamage + sustained + pierce + parts + …] "Damage Up"
× taken [1 + damageTaken(enemy) + distributed]

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

FB = 0.5 if Full Burst is active AND the instance is not boundary-timed (see below); else 0
Range = 0.3 if the weapon is in its effective band vs the boss's current position; RL never;
skill/proc instances never (noRange)
Crit = critRate × critBonus (expected-value mode)
| critBonus or 0, Bernoulli(critRate) (Monte Carlo mode, cfg.seed set)
critRate = (base crit rate + Crit Rate ▲ % + normal-only Crit Rate ▲ %) / 100,
clamped 0..1 (base 15%)
the normal-only term (`critRateNormalPct`) joins ONLY on normal-attack
instances — kit lines reading "Critical Rate of normal attacks ▲x%"
(helm S1). Skill procs and burst damage see the unscoped term alone.
critBonus = (critDamage − 100)/100 + Crit Damage ▲ %/100 (base +50%)
Core = coreExposure × ACR × coreBonus (expected-value mode)
| coreBonus or 0, Bernoulli(coreExposure × ACR) (Monte Carlo mode)
coreExposure = cfg.coreHitRate (1.0 on the scope-lock boss)
ACR = acrForHR(weapon, band, hitRatePct) — the auto-aim core-hit fraction.
LIVE MODEL — UNIGEO uniform-in-circle (default 'all', 2026-07-22; DECISIONS 2026-07-22),
scope-lock (small) boss profile, accuracy-circle weapons (AR/SMG/SG):
R(hr) = (CIRCLE_PX_K · scale_w)/2 · (1 − hr/100) px (linear to ZERO at HR 100;
CIRCLE_PX_K 0.648 measured, scale_w = datamined start_accuracy_circle_scale
{AR 75, SMG 110, SG 250}; MEASURED at 79.3/48.2 px for SG @ HR 0/38.91)
SG: ACR = min(1, (r_core(band)/R(hr))²) ÷ coverage(band, R(hr)) (per landed pellet)
AR/SMG: ACR = lensOverlap(disc R_eff = f_bloom_w·R(hr), offset δ_w(hr), core r_core)
÷ disc area (per hit)
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
coreBonus = (coreAttackMultiplier − 100)/100 + Core Damage ▲ %/100 (base +100%)

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

Element = 1.1 + (Element Damage ▲ % + Superior-element Damage ▲ %)/100 with elemental advantage
= 1.0 without

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

Charge = chargeMult/100 + (chargeMult/100) × (doll charge % + Charge-Damage-multiplier buffs %) / 100 + Charge Damage ▲ %/100

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

DamageUp = 1 + ( Attack Damage ▲ % + Sustained Damage ▲ % [only on sustained-flavored instances (dots)] + Sequential Damage ▲ % [only on sequential-flavored instances] + True Damage ▲ % [only on true-flavored instances] + Pierce Damage ▲ % [only for Pierce-tagged shots: static hasPierce,
a live gainPierce window, or a swap-scoped
weaponSwap.hasPierce shot (snow-white cannon)] + Projectile Explosion ▲ % [RL NORMAL attacks — see 1f]
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

Taken = 1 + (Σ Damage Taken ▲ on the boss + Σ Distributed-damage Taken ▲ [distributed instances only, and only
while a Damage Taken ▲ is active]) / 100
Distributed = 1 + Distributed Damage ▲ %/100 [distributed instances only]

```

Distributed damage deals the same TOTAL against one target as against many (owner-verified) —
never model a split penalty.

---

```

### 1b. game-mechanics.md §8 burst rotation / §9 procs+flavors / §11 buff stacking & targeting

```
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

```

## 2. GROUND TRUTH — real kit prose + base stats (data/characters.json → characters['emma-tactical-upgrade'])

MG / Supporter / Fire / Burst I, burstCooldownSec 20, normalAttackMultiplier 5.57, coreAttackMultiplier 200,
ammo 300, reloadFrames 171, hitsPerShot 1, burstGaugePerShot 0.05. baseStats: hp 15000 / atk 500 / def 84,
critRate 15, critDamage 150. simSupported false before this gauntlet; NO prior override existed (from-scratch).

```json
{
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects self.\nEnvironment Setup\nFunction: Sprays a solution into the surroundings to create an advantageous battlefield.\nEffect 1: Damage Taken ▲ 3.9% for 10 sec.\nEffect 1 Target(s): All enemies (including those that appear during Environment Setup)\n\nEffect 2: Environment Setup: Continuously recovers 2.32% of the skill user's final Max HP every 1 sec for 10 sec.\nEffect 2 Target(s): All allies\n\nRecurring interval: 30 sec\n\n■ Activates when the enemy appears. Affects self.\nExposure (Cannot be removed)\nEffect: Attract: Taunt all enemies continuously.",
    "skill2": "■ Activates only if self is alive.\nLT Formation\nFunction: Issues a battle-advantageous tactic to target(s).\nEffect 1: Affects all allies from the same squad. Critical Damage ▲ 23.51% continuously.\nEffect 2: Affects all allies. Projectile Explosion Damage ▲ 2.32% continuously.\n\nBonus effects when applying AS Formation to self.\nEffect 1: Affects all allies. True Damage ▲ 30.97% continuously.\nEffect 2: Affects all allies. Projectile Explosion Damage ▲ 3.09% continuously.\nEffect 3: Affects self. Exposure activation disabled continuously.\nEffect 4: Affects self. Recurring interval of Environment Setup ▼ 20 sec continuously.",
    "burst": "■ Affects all allies.\nBattlefield Formation: ATK ▲ 40.07% of the skill user's ATK for 10 sec.\n■ Affects self while in Environment Setup status.\nEnhanced Environment Setup\nFunction: Enhances Environment Setup.\nDuration: 10 sec\nEffect 1: Damage taken multiplier of Environment Setup is scaled by 100%.\nEffect 1 Target(s): All enemies\n\nEffect 2: Incoming healing ▲ 29.04%.\nEffect 2 Target(s): All allies"
  },
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 84,
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
    "resourceId": 93
  }
}
```

## 3. S2b pre-op review (claude-fable-5, independent test-faithfulness spec)

```json
{
  "slug": "emma-tactical-upgrade",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Damage Taken ▲ 3.9% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Boss-held DEBUFF (damageTakenPct) — benefits ALL team damage, no bucket/weapon scoping. The '■ Affects self' header marks the STATUS holder (Environment Setup on Emma); the effect's own Target line says 'All enemies' and wins.",
      "durationSemantics": "10 s window per activation; recurs every 30 s (kit 'Recurring interval: 30 sec'), reduced to every 10 s by skill2's AS-Formation bonus Effect 4 → duty cycle 10/30 (≈33%) without AS, 100% uptime with AS. Never permanent.",
      "triggerIdentity": "interval trigger, sec=30 (10 with AS bonus), FIRST FIRE AT t=0 — the kit says 'Activates at the start of battle', overriding the schema's default first-fire-at-t=sec convention.",
      "targetSet": "enemy (boss debuff; buffApply with casterIdx===null && targetIdx===null). The '(including those that appear…)' parenthetical is irrelevant vs the single partless boss.",
      "nearestWrongModel": "Encoded as a permanent passive boss debuff (durationSec omitted → continuous), or first-fire at t=30 (missing the opening window), or misread as a SELF buff from the '■ Affects self' header.",
      "distinguishingAssertion": "Filter buffApply events with stat==='damageTakenPct' && value===3.9 && casterIdx===null: (a) first apply at frame ≈0, (b) each carries expiresFrame ≈ applyFrame+600 (10 s at 60fps) — never infinite, (c) apply COUNT over 180 s matches the live interval (18 at 10 s / 6 at 30 s), not 1.",
      "inertness": "Must not appear as a buff on any ally slot; with the AS bonus removed (patched), boss damage taken in t∈(10,30) of each cycle must show NO debuff.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "recovers 2.32% ... every 1 sec for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "Heal-over-time — zero direct damage, but a TANDEM driver: each tick emits a recovery event that fires allies' 'recovery' triggers (crown sits in the control fixture and consumes exactly this).",
      "durationSemantics": "10 ticks at 1 s intervals per activation (heal effect with ticks:10, intervalSec:1), re-fired every Env Setup recurrence (30 s / 10 s with AS).",
      "triggerIdentity": "Same block/trigger as Env Setup: interval with battle-start first fire — NOT a one-shot start-of-battle heal.",
      "targetSet": "All allies including self.",
      "nearestWrongModel": "Skipped as 'defensive, no damage' (taxonomy trap 4), or encoded as a single instant heal (ticks:1) — either starves teammates' on-recovery triggers of the 1 Hz refresh cadence.",
      "distinguishingAssertion": "Per Env Setup activation, exactly 10 recovery events reach each ally over ~10 s; in controlComp, crown's recovery-triggered buffApply refreshes track a ~1 Hz cadence inside each window (red if only 1 event per 30 s, or zero).",
      "inertness": "The heal itself must add no damage events; removing it must not change Emma's OWN damage (only recovery-consumer teammates').",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Attract: Taunt all enemies continuously",
      "disposition": "UNMODELED",
      "scope": "Defensive targeting (taunt) — no damage path in v1 (boss deals no damage, no aggro model).",
      "durationSemantics": "Continuous, cannot be removed.",
      "triggerIdentity": "'Activates when the enemy appears' ≈ battle start.",
      "targetSet": "All enemies taunted onto self.",
      "nearestWrongModel": "Inventing a damageTakenPct or self-survivability stat for it.",
      "distinguishingAssertion": "No buffApply/damage event attributable to Exposure; listed verbatim in unmodeled.",
      "inertness": "Zero effect on any damage total.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "same squad ... Critical Damage ▲ 23.51%",
      "disposition": "FAITHFUL",
      "scope": "Generic critDamagePct (no normal-attack scoping in the text) — but the TARGET is squad-scoped, which is the trap here, not the stat.",
      "durationSemantics": "'continuously' while self is alive → permanent passive (alive is always true in v1).",
      "triggerIdentity": "passive.",
      "targetSet": "'All allies from the same squad' — the roster data has no squad axis; in any comp without Emma's named squad-mates this resolves to SELF ONLY (self is trivially same-squad). A teamHas/slugs-style gate or self-target stand-in is required — NOT plain allies.",
      "nearestWrongModel": "target {kind:'allies'} — hands 23.51% crit damage to liter/crown/carry/helm, over-crediting the whole fixture team.",
      "distinguishingAssertion": "buffApply with stat==='critDamagePct' && value===23.51 lands ONLY on Emma's slot in controlComp; carry's totalDamage is IDENTICAL with this line present vs deleted (withPatchedOverride).",
      "inertness": "Must move no non-squad ally's damage in the fixture.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "all allies. Projectile Explosion ▲ 2.32%",
      "disposition": "FAITHFUL",
      "scope": "projectileExplosionPct — feeds ONLY projectile-explosion-flavored damage (RL kits); inert on every non-RL ally.",
      "durationSemantics": "Continuous permanent passive.",
      "triggerIdentity": "passive.",
      "targetSet": "All allies (unscoped — broader than Effect 1's squad clause; the two target sets DIFFER within one skill).",
      "nearestWrongModel": "Collapsed into generic attackDamagePct (Damage-Up on everything), or given Effect 1's same-squad scope by header-bleed.",
      "distinguishingAssertion": "buffApply stat==='projectileExplosionPct' value===2.32 on all five slots; total damage of every unit in the RL-free controlComp is UNCHANGED when the line is deleted (green faithful — red under attackDamagePct, which moves everyone).",
      "inertness": "Zero damage movement in any comp with no projectile-explosion source.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "AS to self: True Damage ▲ 30.97%",
      "disposition": "FAITHFUL",
      "scope": "trueDamagePct — Damage-Up bucket scoped to TRUE-flavored hits only (flavor:'true' riders/swaps), NOT a generic all-damage buff.",
      "durationSemantics": "Continuous while the AS-Formation-on-self condition holds.",
      "triggerIdentity": "passive, but GATED on 'applying AS Formation to self' — a formation state the kit gives no explicit player toggle for; needs a mode gate (override modes[]) with a declared, flagged default. The gate condition itself is the modeling decision.",
      "targetSet": "All allies.",
      "nearestWrongModel": "Bonus block applied UNCONDITIONALLY (no AS gate/mode), or trueDamagePct misapplied as a generic Damage-Up on all hits regardless of flavor.",
      "distinguishingAssertion": "With the AS mode toggled OFF (mode gate), NO buffApply stat==='trueDamagePct' appears; with it ON, value 30.97 lands on all slots; in a comp with zero true-flavored hits, deleting the line moves no totals (red if any normal-bucket damage shifts).",
      "inertness": "Must not lift non-true-flavored damage; must vanish entirely under the non-AS mode.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "AS to self: Projectile Explosion ▲ 3.09%",
      "disposition": "FAITHFUL",
      "scope": "projectileExplosionPct, additive on top of the base 2.32% (total 5.41 under AS).",
      "durationSemantics": "Continuous while AS-on-self holds.",
      "triggerIdentity": "passive under the same AS mode gate as the other bonus effects.",
      "targetSet": "All allies.",
      "nearestWrongModel": "Merged with/replacing the base 2.32 (only one of the two present), or generic attackDamagePct.",
      "distinguishingAssertion": "Under AS mode, TWO distinct projectileExplosionPct buffApply values (2.32 and 3.09) — or a summed 5.41 — reach each slot; under non-AS mode only 2.32 remains.",
      "inertness": "Zero movement in RL-free comps.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "AS to self: Exposure activation disabled",
      "disposition": "UNMODELED",
      "scope": "Toggles off the (already-unmodeled) taunt.",
      "durationSemantics": "Continuous.",
      "triggerIdentity": "AS mode gate.",
      "targetSet": "Self.",
      "nearestWrongModel": "Inventing any stat effect for it.",
      "distinguishingAssertion": "No event of any kind attributable to this line.",
      "inertness": "Total no-op.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "AS: Recurring interval of Env Setup ▼ 20s",
      "disposition": "FAITHFUL",
      "scope": "Cadence modifier on skill1's Environment Setup: interval 30 s → 10 s, which takes the boss damageTakenPct debuff from ~33% duty cycle to 100% uptime AND triples the heal-tick (recovery-event) cadence. This is the single biggest lever in the kit.",
      "durationSemantics": "Continuous while AS-on-self holds.",
      "triggerIdentity": "The engine has no 'modify another block's interval' primitive — the faithful encoding is mode-gated skill1 block variants (interval:10 under AS, interval:30 otherwise), both with t=0 first fire.",
      "targetSet": "Self (modifies Emma's own skill1 cadence).",
      "nearestWrongModel": "Dropped entirely (interval stays 30 s → boss debuff uptime and heal cadence under-credited 3×), or misapplied as +20 s duration instead of −20 s interval.",
      "distinguishingAssertion": "Count of damageTakenPct(3.9) buffApply events over 180 s: ≈18 (t=0,10,…,170) under AS — red at ≈6 if the line is dropped; correspondingly ≥170 ally recovery events vs ≈60.",
      "inertness": "Under the non-AS mode the count must return to the 30 s cadence.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "ATK ▲ 40.07% of the skill user's ATK",
      "disposition": "FAITHFUL",
      "scope": "casterAtkPct — a FLAT ATK add computed from EMMA's ATK, not a percentage of each target's own ATK. Emma is a Supporter (scope-lock static ATK 98,367), so the flat add ≈ 0.4007×98,367 ≈ 39,416 for everyone.",
      "durationSemantics": "10 s wall-clock.",
      "triggerIdentity": "burstCast (Emma's OWN Burst I cast, cd 20 s) — not fullBurstEnter; lands pre-FB per the burst-cast timing rule.",
      "targetSet": "All allies including self.",
      "nearestWrongModel": "stat atkPct value 40.07 — scales each TARGET's own ATK, over-crediting the Attacker carry (118,027 base) by ~20% relative to the faithful flat add.",
      "distinguishingAssertion": "buffApply stat==='casterAtkPct' with the SAME flat value ≈39,416 on every slot regardless of target class (red under atkPct: stat differs and the effective add varies with each target's base ATK).",
      "inertness": "Value must NOT track the carry's ATK; expires ~600 frames after apply.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Damage taken multiplier scaled by 100%",
      "disposition": "FAITHFUL",
      "scope": "Doubles the LIVE Environment Setup boss debuff (3.9% → effective 7.8%) for 10 s — 'scaled by 100%' is a +100% multiplier on the existing debuff (the eve-Mk2 'scaled by x%' idiom), NOT a no-op ×1.0.",
      "durationSemantics": "10 s from burst cast.",
      "triggerIdentity": "burstCast, GATED on Emma currently being in Environment Setup status ('Affects self WHILE IN Environment Setup') — under AS (10 s interval, 100% uptime) the gate always passes; without AS it can whiff.",
      "targetSet": "Enemy (boss debuff; casterIdx null).",
      "nearestWrongModel": "'scaled by 100%' read as ×1.0 → line silently dropped; second-nearest: ungated (fires even when Env Setup lapsed) or keyed to fullBurstEnter instead of her burstCast.",
      "distinguishingAssertion": "Within 10 s after each Emma burstCast event, boss-held damageTakenPct totals 7.8 (an ADDITIONAL 3.9 buffApply with casterIdx===null, or a 7.8 refresh) — red if the debuff stays flat 3.9 through her burst window; also red (over-credit) if it appears on FBs Emma did not cast.",
      "inertness": "No effect outside the 10 s window or when Env Setup is not live.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Incoming healing ▲ 29.04%",
      "disposition": "UNMODELED",
      "scope": "Heal-magnitude modifier — the engine's heal/recovery events carry no HP amount, so this cannot change anything; recovery TRIGGER counts are unaffected by healing-taken scaling.",
      "durationSemantics": "10 s.",
      "triggerIdentity": "burstCast.",
      "targetSet": "All allies.",
      "nearestWrongModel": "Encoding it as extra recovery events (which would over-fire crown's on-recovery consumers) or as any damage stat.",
      "distinguishingAssertion": "Recovery-event COUNT per Env Setup window is identical inside vs outside Emma's burst window.",
      "inertness": "Zero events, zero damage; verbatim in unmodeled.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    }
  ],
  "loadBearingSet": [
    "skill1:damageTaken-3.9-interval",
    "skill1:heal-10ticks-recovery-driver",
    "skill2:critDamage-23.51-same-squad",
    "skill2:projExplosion-2.32-allies",
    "skill2:AS-trueDamage-30.97",
    "skill2:AS-projExplosion-3.09",
    "skill2:AS-envSetup-interval-minus-20s",
    "burst:casterAtk-40.07-flat",
    "burst:enhanced-dmgTaken-x2-gated"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Exposure (Cannot be removed) — Attract: Taunt all enemies continuously."
    ],
    "skill2": [
      "Effect 3: Affects self. Exposure activation disabled continuously."
    ],
    "burst": ["Effect 2: Incoming healing ▲ 29.04% (All allies)."]
  },
  "notes": "Expected shared-prior misreads to reconcile: (1) The '■ Affects self' headers on skill1 and the burst enhancement mark the STATUS HOLDER, not the effect target — every effect's own Target(s) line wins (boss debuff + team heal, taxonomy trap 4). (2) Interval first-fire: 'Activates at the start of battle' pins t=0, overriding the schema interval convention of first-fire at t=sec — a t=30 first fire loses a whole opening window. (3) The AS-Formation-to-self condition has no explicit player toggle in the prose; the faithful encoding is an override modes[] gate with the chosen default DECLARED and flagged — and because there is no cross-block interval-modifier primitive, the −20 s line must be baked as mode-gated skill1 variants (interval 10 vs 30). The AS default choice is the one place the driver could legitimately diverge; the tests must pin whichever default ships. (4) 'scaled by 100%' means DOUBLED, not ×1.0 — the no-op reading silently deletes the burst's main offensive line. (5) FIXTURE HAZARD: Emma is Burst I and controlComp already fields liter (B1). Any burstCast-keyed assertion (the 40.07% casterAtkPct, the ×2 debuff) must first assert Emma actually CASTS her burst in the fixture (first-ready in-window selection may pick liter every rotation); if she never casts, those tests are vacuously green under any encoding. Patch the comp or assert on her burstCast events explicitly. (6) The 10-tick heal is the kit's tandem payload — crown in the fixture consumes on-recovery events, so ticks:10/intervalSec:1 (not a single instant heal) is observable through crown's refresh cadence and triples under AS. (7) Same-squad vs all-allies target sets differ WITHIN skill2 — header-bleed between Effect 1 and Effect 2 is an easy scope error in both directions.",
  "model": "claude-fable-5"
}
```

## 4. S5 blind post-op test (claude-opus-5, written from prose alone) — GREEN/RED vs the DRIVER override + driver triage

Run against the driver override: **5 passed / 14 failed / 3 skipped (22 total)**. Driver triage of the 14
(verified empirically, not self-reported):

- **AS-Formation-default divergence (5):** the blind baked the 'Bonus effects when applying AS Formation to
  self' lines in as ALWAYS-ON (projExpl summed to 5.41; trueDamagePct 30.97 present; interval collapsed to
  10s → expected ≥12 debuff activations). The driver ships them MODE-GATED, default OFF, because AS Formation
  is applied by `eunhwa-tactical-upgrade` (SR/Fire/B2), who is NOT simSupported (no override, off the board)
  — no legal sim team can have the formation, so default-ON would over-credit every board team 3× vulnerability
  uptime + free True Damage. The driver's T7 group proves the AS mode produces exactly the blind's expected
  behaviour when selected (18 activations, contiguous duty cycle, +0.0309 dmgUp, trueDamage on all allies).
  Failing tests: 'e2 Projectile Explosion…5.41', 'bonus b1 True Damage…ALL ALLIES', 'bonus b1 True Damage is
  load-bearing', 'bonus b4 shortens…>=12', 'b4 counterfactual…less than'.
- **Enhanced-debuff encoding divergence (3):** the blind emits ONE 7.8 damageTakenPct instance; the driver
  emits a SECOND slot-keyed 3.9 instance (KR stacking key ownerIdx:slot:stat:value — the burst slot key
  0:burst:… is distinct from 0:skill1:…, so they co-stack; dmgTakenSum sums to 7.8% → mult.taken 1.078,
  damage-IDENTICAL to the 7.8 encoding). The blind's removal patch filters value≥7, which misses the driver's
  3.9 instance, so its 'removing lowers team damage' assertion sees equal totals. Failing: 'DOUBLES…include
  7.8', 'doubled debuff is a 10s…', 'removing the burst debuff-doubling…'.
- **Blind-test API bugs (6, verified against src/types.ts + src/engine/sim.ts):**
  (a) 'e2 emits a 10-tick heal-over-time' filters events of kind 'heal'/'recovery' — NO such kinds exist in
  the SimEvent union (shot/damage/buffApply/buffRemove/reload/burstCast/fullBurstStart/fullBurstEnd);
  recovery is observable ONLY through a consumer's buffApply (the driver's T2 uses crown's consumer).
  (b) 'CASTER-scaled ATK' compares caster[0].value=51780.2417 to 0.4007×emma.staticAtk=39963.4138 — but its
  fromEmma filter is casterIdx!==null (ANY unit-caster), so caster[0] is CROWN's S1 casterAtkPct 64.51
  grant: 0.6451×crown.staticAtk(80267)=51780.2417 exactly. The driver's flat resolution EQUALS the blind's
  own expected value 39963.4138 (driver T5 passes on it) — independent convergence on the magnitude.
  (c) 'keyed to Emma's OWN burst cast': firstApply(344) < firstFb(344) fails on EQUALITY — the chain casts
  land on one frame; the assertion needs <=. (Also fromEmma-contaminated: crown's FB-enter grant lands
  exactly at firstFb.)
  (d,e) the two inertness loops ('no crit-rate/core/charge', 'no weapon-state modifiers') again use the broad
  fromEmma filter and catch HELM's critRateNormalPct (×60) and CROWN's reloadSpeedPct 44.35 (×36) — Emma's
  override emits neither stat (validator + driver suite confirm her stat set: damageTakenPct,
  critDamagePct, projectileExplosionPct, trueDamagePct, casterAtkPct, heal, targetStatus only).
  (f) 'no direct damage' compares damage.srcSlot (string union 'normal'|'skill1'|…) to unitOf().slot —
  UnitResult has 'position', not 'slot' → always undefined → zero matches.
- **The 3 skips are the blind's OWN UNMODELED** (taunt, Exposure-off, incoming healing) — exactly the driver's
  unmodeled set.
- **Fixture note:** the blind used controlComp (liter B1 + emma-tu B1 share stage I): emma casts 6 / liter 9.
  The driver fixture fields emma-tu as SOLE B1 (9 casts) — the S2b reviewer flagged this hazard explicitly.

```typescript
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * Emma: Tactical Upgrade (emma-tactical-upgrade) — MG/Fire/Supporter/Burst I.
 * Blind kit-spec test written from the kit prose alone.
 *
 * KIT (structural read):
 *  S1 blockA — "Activates at the start of battle. Affects self." Environment Setup.
 *      e1: enemy Damage Taken UP 3.9% for 10 sec  (boss debuff -> damageTakenPct)
 *      e2: all allies, recovers 2.32% of user's final Max HP every 1 sec for 10 sec
 *          (heal-over-time -> heal with ticks:10, intervalSec:1; fires allies' `recovery` triggers)
 *      Recurring interval: 30 sec  -> trigger interval{sec:30}. NOTE the header says
 *      "Activates at the START of battle", so first fire is t=0 with a 30s recurrence.
 *      The engine's interval trigger first-fires at t=sec, so a faithful model needs a
 *      t=0 fire as well (see the FIRST-FIRE test below).
 *  S1 blockB — "Activates when the enemy appears." Exposure / Attract: taunt.
 *      GAP: taunt/aggro is not a modeled primitive (boss deals no damage in v1). BUT it is
 *      the gate referenced by S2 bonus e3, so it is NOT free-standing flavor.
 *  S2 — "Activates only if self is alive." LT Formation (passive, continuous):
 *      e1: allies from the same squad, Critical Damage UP 23.51%  -> squad-scoped. The data
 *          has no squad axis; the nearest-wrong models are (a) allies (over-credits) and
 *          (b) self-only (under-credits). Scope is asserted, not guessed.
 *      e2: all allies, Projectile Explosion Damage UP 2.32%  -> projectileExplosionPct
 *      Bonus "when applying AS Formation to self" — a kit-FORMATION mode, not a burst/FB
 *      trigger. Modeled as a `modes` selection or an always-on branch; either way the four
 *      bonus effects move together (they are one gated group):
 *      b1: all allies True Damage UP 30.97%   -> trueDamagePct
 *      b2: all allies Projectile Explosion UP 3.09%  -> stacks additively with e2 (total 5.41)
 *      b3: self, Exposure activation disabled  -> disables S1 blockB (inert while taunt is a GAP)
 *      b4: self, Recurring interval of Environment Setup DOWN 20 sec -> 30s becomes 10s.
 *          This is a CADENCE change and is therefore damage-visible through e1 (the boss
 *          Damage Taken debuff goes from 10s-on/20s-off to effectively continuous).
 *  BURST — "Affects all allies." Battlefield Formation: ATK UP 40.07% OF THE SKILL USER'S ATK
 *      for 10 sec -> casterAtkPct (flat-resolved at apply time), NOT atkPct.
 *      "Affects self while in Environment Setup status." Enhanced Environment Setup, 10 sec:
 *      e1: "Damage taken multiplier of Environment Setup is scaled by 100%" -> DOUBLES the
 *          3.9% debuff to 7.8% for 10s (all enemies). Nearest-wrong: adding a flat +100%
 *          damageTaken, or a separate 3.9% instance.
 *      e2: all allies Incoming Healing UP 29.04% -> no HP pool in v1; heal amounts are not
 *          modeled, so this is a GAP (it must not be encoded as a damage stat).
 *
 * FIXTURE: controlComp('emma-tactical-upgrade', true) — she is Burst I, so the control comp
 * supplies the B2/B3 chain and she casts her own burst each rotation. Deterministic (no seed).
 * Every assertion below discriminates the faithful reading from a NAMED nearest-wrong model
 * built with withPatchedOverride; inertness assertions pin what each line must NOT move.
 */

const SLUG = 'emma-tactical-upgrade';

type Ev = SimEvent & Record<string, unknown>;

function run(overrides?: Record<string, unknown>) {
  const events: Ev[] = [];
  const opts = controlComp(SLUG, true) as Record<string, unknown>;
  if (overrides) opts.overrides = overrides;
  const cfg = (opts.cfg ?? {}) as Record<string, unknown>;
  opts.cfg = { ...cfg, onEvent: (ev: SimEvent) => events.push(ev as Ev) };
  const res = runComp(opts as never);
  return { res, events };
}

const buffs = (events: Ev[], stat: string) =>
  events.filter((e) => e.kind === 'buffApply' && e.stat === stat);

const bossDebuffs = (events: Ev[], stat: string) =>
  buffs(events, stat).filter(
    (e) => e.casterIdx === null && e.targetIdx === null
  );

const fromEmma = (events: Ev[], stat: string) =>
  buffs(events, stat).filter((e) => e.casterIdx !== null);

// ---- hoisted runs (each runComp is a full 180s sim) -------------------------
const BASE = run();
const BASE_TOTALS = totals(BASE.res);
const ALLY_SLUGS = Object.keys(BASE_TOTALS).filter((s) => s !== SLUG);

describe('emma-tactical-upgrade — S1 Environment Setup', () => {
  it('e1 applies an enemy Damage Taken debuff of 3.9%, not a self/ally buff', () => {
    const debuffs = bossDebuffs(BASE.events, 'damageTakenPct');
    expect(debuffs.length).toBeGreaterThan(0);
    // The base magnitude must appear. (The burst doubles it to 7.8% for 10s — asserted
    // separately — so 3.9 must be present among the emitted values.)
    const values = new Set(debuffs.map((e) => e.value as number));
    expect([...values]).toContain(3.9);
    // Discriminator vs the "self buff" nearest-wrong: a Damage Taken line is a BOSS debuff,
    // so it must NOT be emitted as a unit-targeted buff on Emma or an ally.
    expect(
      buffs(BASE.events, 'damageTakenPct').filter((e) => e.targetIdx !== null)
    ).toHaveLength(0);
  });

  it('e1 is a 10s WINDOW on a recurrence, not a permanent passive', () => {
    const debuffs = bossDebuffs(BASE.events, 'damageTakenPct');
    // A permanent passive would emit exactly once at frame 0 and never again.
    // The recurring interval means repeated applications across the 180s fight.
    expect(debuffs.length).toBeGreaterThan(1);
    // Each application carries a finite expiry (the 10 sec window).
    for (const ev of debuffs) {
      expect(ev.expiresFrame == null).toBe(false);
    }
  });

  it('e1 first-fires at battle START (t=0), not one full interval in', () => {
    // "Activates at the start of battle" + "Recurring interval: 30 sec". The engine's bare
    // interval trigger first-fires at t=sec, which would leave the opening window empty.
    // Nearest-wrong: a lone interval{sec:30} with no t=0 fire.
    const first = bossDebuffs(BASE.events, 'damageTakenPct')[0];
    expect(first).toBeDefined();
    expect(first.frame as number).toBeLessThanOrEqual(1);
  });

  it('e2 emits a 10-tick heal-over-time to ALL ALLIES (drives on-recovery kits)', () => {
    const heals = BASE.events.filter((e) => e.kind === 'buffApply' && false);
    void heals;
    // Recovery is observable through the recovery-consumer path; assert the tick COUNT and
    // the target breadth via the emitted heal/recovery events.
    const recov = BASE.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery'
    );
    expect(recov.length).toBeGreaterThan(0);
    // Nearest-wrong A: ticks:1 (a single instant heal) — that yields 1 event per activation,
    // not 10, so a HoT window must emit strictly more events than activations.
    const activations = bossDebuffs(BASE.events, 'damageTakenPct').length;
    expect(recov.length).toBeGreaterThan(activations);
    // Nearest-wrong B: self-only. Every ally must receive the recovery, not just Emma.
    const healedSlugs = new Set(recov.map((e) => e.targetSlug as string));
    for (const s of ALLY_SLUGS) expect(healedSlugs.has(s)).toBe(true);
  });

  it.skip('Exposure / Attract taunt — GAP: no aggro primitive (boss deals no damage in v1)', () => {
    // Unmodellable payload: taunt only matters for incoming damage, which v1 does not simulate.
    // It is NOT free-standing flavor though — S2 bonus e3 disables it, so the two lines must be
    // documented together in the override `unmodeled` field.
  });
});

describe('emma-tactical-upgrade — S2 LT Formation', () => {
  it('e1 Critical Damage 23.51% is SQUAD-scoped, not a self-only buff', () => {
    const crit = fromEmma(BASE.events, 'critDamagePct').filter(
      (e) => (e.value as number) === 23.51
    );
    expect(crit.length).toBeGreaterThan(0);
    // Discriminator vs the self-only nearest-wrong: at least one NON-Emma target receives it.
    const targets = new Set(crit.map((e) => e.targetSlug as string));
    expect([...targets].some((s) => s !== SLUG)).toBe(true);
  });

  it('e2 Projectile Explosion 2.32% + bonus 3.09% = 5.41% total to all allies', () => {
    const pe = fromEmma(BASE.events, 'projectileExplosionPct');
    expect(pe.length).toBeGreaterThan(0);
    const sumPerTarget = new Map<string, number>();
    for (const e of pe) {
      const t = e.targetSlug as string;
      sumPerTarget.set(t, (sumPerTarget.get(t) ?? 0) + (e.value as number));
    }
    // Nearest-wrong: modeling only the base 2.32 (dropping the AS-Formation bonus), or only
    // the 3.09 bonus. The two lines are separate kit effects and must ADD.
    for (const [, v] of sumPerTarget) expect(v).toBeCloseTo(5.41, 5);
    // Breadth: "Affects all allies" — every unit in the comp, including Emma.
    expect(sumPerTarget.size).toBe(Object.keys(BASE_TOTALS).length);
  });

  it('bonus b1 True Damage 30.97% goes to ALL ALLIES (Damage Up bucket)', () => {
    const td = fromEmma(BASE.events, 'trueDamagePct').filter(
      (e) => (e.value as number) === 30.97
    );
    expect(td.length).toBeGreaterThan(0);
    const targets = new Set(td.map((e) => e.targetSlug as string));
    // Nearest-wrong: self-scoped (the bonus block's HEADER says "to self" — that is the
    // CONDITION, the per-effect target line says "Affects all allies").
    for (const s of ALLY_SLUGS) expect(targets.has(s)).toBe(true);
  });

  it('bonus b1 True Damage is load-bearing: removing it lowers ALLY damage', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const blk of ov.skill2 ?? []) {
        blk.effects = blk.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              e.stat === 'trueDamagePct' &&
              e.value === 30.97
            )
        );
      }
    });
    const { res } = run({ [SLUG]: patched });
    const t = totals(res);
    // Discriminates a real Damage-Up contribution from a stat the engine ignores.
    let moved = 0;
    for (const s of ALLY_SLUGS) if (t[s] !== BASE_TOTALS[s]) moved++;
    expect(moved).toBeGreaterThan(0);
    for (const s of ALLY_SLUGS) {
      if (t[s] !== BASE_TOTALS[s]) expect(t[s]).toBeLessThan(BASE_TOTALS[s]);
    }
  });

  it('bonus b4 shortens the Environment Setup interval 30s -> 10s (cadence is damage-visible)', () => {
    // The faithful model fires the S1 debuff every 10s. The nearest-wrong keeps 30s (i.e. the
    // -20s line dropped as "not damage"). Over 180s that is ~18 vs ~6 activations.
    const activations = bossDebuffs(BASE.events, 'damageTakenPct').length;
    expect(activations).toBeGreaterThanOrEqual(12);
  });

  it('b4 counterfactual: forcing the 30s interval REDUCES team damage', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const blk of ov.skill1 ?? []) {
        const trig = blk.trigger as { kind: string; sec?: number };
        if (trig.kind === 'interval') trig.sec = 30;
      }
    });
    const { res, events } = run({ [SLUG]: patched });
    const slow = bossDebuffs(events, 'damageTakenPct').length;
    // Non-vacuity: the counterfactual really is a different cadence.
    expect(slow).toBeLessThan(
      bossDebuffs(BASE.events, 'damageTakenPct').length
    );
    const t = totals(res);
    const slowTeam = Object.values(t).reduce((a, b) => a + b, 0);
    const baseTeam = Object.values(BASE_TOTALS).reduce((a, b) => a + b, 0);
    expect(slowTeam).toBeLessThan(baseTeam);
  });

  it.skip('bonus b3 "Exposure activation disabled" — GAP: gates an unmodeled taunt', () => {
    // Inert by construction: it disables the S1 Exposure line, which is itself a GAP.
    // Must be recorded in `unmodeled`, never encoded as a stat.
  });
});

describe('emma-tactical-upgrade — Burst', () => {
  it('Battlefield Formation is CASTER-scaled ATK (flat-resolved), not target atkPct', () => {
    const caster = fromEmma(BASE.events, 'casterAtkPct');
    expect(caster.length).toBeGreaterThan(0);
    // Caster-scaled values are flat-resolved at apply time: 40.07% of Emma's static ATK.
    // A raw 40.07 in the value field means the line was mis-encoded as plain atkPct.
    for (const e of caster) expect(e.value as number).toBeGreaterThan(100);
    const emmaAtk = unitOf(BASE.res, SLUG) as unknown as {
      staticAtk?: number;
    };
    if (typeof emmaAtk.staticAtk === 'number') {
      expect(caster[0].value as number).toBeCloseTo(
        (40.07 / 100) * emmaAtk.staticAtk,
        0
      );
    }
    // Nearest-wrong discriminator: no plain atkPct 40.07 anywhere.
    expect(
      fromEmma(BASE.events, 'atkPct').filter((e) => e.value === 40.07)
    ).toHaveLength(0);
  });

  it('Battlefield Formation targets ALL ALLIES for 10 sec (finite window)', () => {
    const caster = fromEmma(BASE.events, 'casterAtkPct');
    const targets = new Set(caster.map((e) => e.targetSlug as string));
    for (const s of ALLY_SLUGS) expect(targets.has(s)).toBe(true);
    expect(targets.has(SLUG)).toBe(true);
    // 10s window -> a finite expiry, not a continuous passive.
    for (const e of caster) expect(e.expiresFrame == null).toBe(false);
  });

  it('Battlefield Formation is keyed to Emma\u2019s OWN burst cast, not team full-burst entry', () => {
    // Trigger identity: the line sits in her BURST block -> burstCast. In this comp she is the
    // sole B1 and casts every rotation, so the counts coincide; the discriminator is that the
    // apply frame precedes the corresponding fullBurstStart (a burst cast lands before FB opens).
    const applies = fromEmma(BASE.events, 'casterAtkPct').map(
      (e) => e.frame as number
    );
    const fbStarts = BASE.events
      .filter((e) => e.kind === 'fullBurstStart')
      .map((e) => e.frame as number);
    expect(applies.length).toBeGreaterThan(0);
    expect(fbStarts.length).toBeGreaterThan(0);
    const firstApply = Math.min(...applies);
    const firstFb = Math.min(...fbStarts);
    expect(firstApply).toBeLessThan(firstFb);
  });

  it('Enhanced Environment Setup DOUBLES the Damage Taken debuff to 7.8% (scaled by 100%)', () => {
    const values = new Set(
      bossDebuffs(BASE.events, 'damageTakenPct').map((e) => e.value as number)
    );
    // Faithful: the multiplier is scaled by 100% -> 3.9 * 2 = 7.8.
    expect([...values]).toContain(7.8);
    // Nearest-wrong A: a flat +100 percentage-point debuff.
    expect(values.has(103.9)).toBe(false);
    expect(values.has(100)).toBe(false);
    // Nearest-wrong B: a second independent 3.9% instance stacking to 7.8 by addition would
    // show TWO concurrent 3.9 applies rather than one 7.8 apply — covered by the containment
    // check above plus the count assertion below.
  });

  it('the doubled debuff is a 10s burst-window effect, not permanent', () => {
    const strong = bossDebuffs(BASE.events, 'damageTakenPct').filter(
      (e) => (e.value as number) === 7.8
    );
    expect(strong.length).toBeGreaterThan(0);
    for (const e of strong) expect(e.expiresFrame == null).toBe(false);
    // Non-vacuity: the fixture must exercise BOTH the enhanced and un-enhanced case.
    const weak = bossDebuffs(BASE.events, 'damageTakenPct').filter(
      (e) => (e.value as number) === 3.9
    );
    expect(weak.length).toBeGreaterThan(0);
  });

  it('removing the burst debuff-doubling lowers TEAM damage (whole-team benefit, not self)', () => {
    const patched = withPatchedOverride(SLUG, (ov) => {
      for (const blk of ov.burst ?? []) {
        blk.effects = blk.effects.filter(
          (e) =>
            !(
              e.kind === 'buff' &&
              e.stat === 'damageTakenPct' &&
              (e.value as number) >= 7
            )
        );
      }
    });
    const { res } = run({ [SLUG]: patched });
    const t = totals(res);
    // A boss Damage Taken debuff benefits EVERY unit — inertness discriminator against
    // mis-scoping it as a self buff.
    for (const s of ALLY_SLUGS) expect(t[s]).toBeLessThan(BASE_TOTALS[s]);
  });

  it.skip('Incoming Healing \u25b2 29.04% — GAP: no HP pool / heal magnitudes in v1', () => {
    // The engine emits recovery EVENTS without amounts, so a heal-amplification percentage has
    // no consumer. Must live in `unmodeled`, never as a damage stat.
  });
});

describe('emma-tactical-upgrade — inertness', () => {
  it('Emma carries no crit-rate, core, or charge buffs (nothing in her kit grants them)', () => {
    for (const stat of [
      'critRatePct',
      'critRateNormalPct',
      'coreDamagePct',
      'chargeDamagePct',
      'chargeSpeedPct',
      'elementDamagePct',
    ]) {
      expect(fromEmma(BASE.events, stat)).toHaveLength(0);
    }
  });

  it('no weapon-state modifiers: her kit changes no ammo, reload, or fire rate', () => {
    for (const stat of [
      'maxAmmoPct',
      'maxAmmoFlat',
      'reloadSpeedPct',
      'attackSpeedPct',
      'fireRatePct',
    ]) {
      expect(fromEmma(BASE.events, stat)).toHaveLength(0);
    }
  });

  it('her kit deals no direct damage: every damage event from her slot is a normal attack', () => {
    const emmaIdx = (unitOf(BASE.res, SLUG) as unknown as { slot?: number })
      .slot;
    const dmg = BASE.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === emmaIdx
    );
    expect(dmg.length).toBeGreaterThan(0);
    // Nearest-wrong: inventing a flatDamage rider for a support kit that states none.
    for (const e of dmg) {
      expect(['normal', 'core']).toContain(e.bucket as string);
    }
  });
});
```

## 5. S6 blind post-op override (claude-opus-5, from prose alone) + diff vs driver

CONVERGENCES: damageTakenPct 3.9/10s boss debuff; t=0 first fire (passive leading block); heal ticks:10/1s;
critDamagePct 23.51 passive allies; projectileExplosionPct 2.32 passive allies; casterAtkPct 40.07 burstCast
10s allies (flat-resolved); enhanced ×2 vulnerability on burstCast; unmodeled taunt + incoming-healing +
Exposure-off. DIVERGENCES: (1) the blind BAKES the AS-Formation bonus in unconditionally (interval:10 always,
trueDamagePct 30.97 + projectileExplosionPct 3.09 ungated) — its own flags[] admit 'authoring the reduced
value assumes AS Formation is applied to self… the assumption is baked in rather than gated' (the schema's
formation gate is noB1/hasB1 only — but the engine HAS modes[] + teamHas.slugs, which the driver uses);
(2) the enhanced debuff is one 7.8 instance vs the driver's slot-keyed 3.9 co-stack (damage-identical).

````json
{
  "slug": "emma-tactical-upgrade",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 3.9,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 10
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 3.9,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "interval",
        "sec": 10
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 23.51
        },
        {
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 2.32
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "trueDamagePct",
          "value": 30.97
        },
        {
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 3.09
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
          "stat": "casterAtkPct",
          "value": 40.07,
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
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 3.9,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Effect 2: Environment Setup: Continuously recovers 2.32% of the skill user's final Max HP every 1 sec for 10 sec. — HP amount not modeled (no HP pool in v1); the recovery EVENTS are modeled via the heal effect so on-recovery consumers fire.",
      "■ Activates when the enemy appears. Affects self. Exposure (Cannot be removed) Effect: Attract: Taunt all enemies continuously. — taunt/aggro is defensive; the v1 boss deals no damage and aggro does not change any damage value."
    ],
    "skill2": [
      "Effect 1: Affects all allies from the same squad. Critical Damage ▲ 23.51% continuously. — the 'same squad' restriction is not modeled (no squad axis in the data); modeled as all allies.",
      "Effect 3: Affects self. Exposure activation disabled continuously. — disables an unmodeled defensive taunt; damage-inert either way.",
      "Effect 4: Affects self. Recurring interval of Environment Setup ▼ 20 sec continuously. — MODELED as the 10s interval on the skill1 blocks (30s − 20s = 10s), NOT as a separate effect; the schema has no cooldown-reduction primitive for a recurring interval, so the reduced value is baked in under the AS-Formation assumption. ⚑ If AS Formation is not applied to self, the true interval is 30 sec."
    ],
    "burst": [
      "Effect 1: Damage taken multiplier of Environment Setup is scaled by 100%. — MODELED as a second 3.9pp damageTaken debuff block on burst cast (a 100% scale of the 3.9% base = +3.9pp), for 10 sec. ⚑ 'scaled by 100%' read as doubling the multiplier; an alternative reading is that the enhanced value replaces rather than adds.",
      "Effect 2: Incoming healing ▲ 29.04%. — heal magnitudes are not modeled (no HP pool); no damage consequence."
    ],
    "note": ""
  },
  "caveats": [
    "⚑ ALL values are UNMEASURED kit-text reads. Nothing here is validated against a fight.",
    "⚑ skill1 Environment Setup recurring interval is authored at 10 sec (kit 30 sec, reduced 20 sec by skill2's AS-Formation self-bonus). This ASSUMES AS Formation is applied to self — which the kit presents as a conditional ('Bonus effects when applying AS Formation to self'). If the sim's formation is not AS, the interval is 30 sec AND the whole skill2 second block (True Damage 30.97%, Projectile Explosion 3.09%) is INACTIVE. Both are authored ON; there is no `formation` gate value in the schema for AS/LT, so this is an assumption, not a gate.",
    "⚑ The Environment Setup 10s Damage-Taken debuff + 10s heal are authored as a t=0 passive PLUS a 10s interval trigger, i.e. effectively ~100% uptime under the AS assumption (10s effect on a 10s cycle). If the real interval is 30s, uptime is 1/3 and this over-credits the whole team by ~2.6pp of boss damage-taken for 2/3 of the fight.",
    "⚑ Burst Effect 1 ('Damage taken multiplier … scaled by 100%') is authored as an ADDITIVE second 3.9pp debuff on burst cast. Keyed to burstCast (not fullBurstEnter) because it is this unit's OWN burst block; it is FB-timing-exempt as a burst-cast effect by convention.",
    "⚑ Burst Effect 1 is gated in the kit on 'while in Environment Setup status'. With the interval authored at 10s the status is ~always live, so no gate is authored; under a 30s interval the enhancement would only land on bursts that fall inside a 10s window.",
    "⚑ Damage Taken ▲ is authored as a boss debuff (damageTakenPct) benefiting the WHOLE team, not a self buff.",
    "⚑ 'Battlefield Formation: ATK ▲ 40.07% of the skill user's ATK' is caster-scaled (casterAtkPct → flat ATK add), not the target's own ATK.",
    "⚑ Projectile Explosion Damage ▲ is authored on all allies; it is only consumed by RL kits, so it is inert on non-RL teammates.",
    "⚑ Cadence tuple (MG, 300 ammo, 171 reloadFrames, hitsPerShot 1) is datamined and UNRELIABLE — not authored here (engine-side), flagged for the record.",
    "⚑ noFb is NOT set anywhere (default OFF/FB-by-timing). Measured-only."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Emma: Tactical Upgrade is a Fire/MG/Supporter Burst I whose damage contribution is almost entirely TEAM-FACING: a recurring boss Damage-Taken debuff (Environment Setup), continuous Critical Damage + True Damage + Projectile Explosion team buffs, and a burst-window caster-scaled ATK grant. Self-damage is a plain MG normal attack with no self-scaling lines. Two structural reads drive everything: (1) skill2's 'AS Formation to self' bonus block is authored ACTIVE, which both enables the True Damage 30.97% / Projectile Explosion 3.09% grants and cuts the Environment Setup recurring interval 30s → 10s; (2) with a 10s interval and a 10s effect duration, the Damage-Taken debuff and the heal-over-time run at ~100% uptime, authored as a t=0 passive plus a 10s interval re-trigger. If AS Formation is NOT the sim's assumption, BOTH the second skill2 block and the 10s interval are wrong — that single premise is the largest lever in this file. The heal lines emit recovery EVENTS (ticks:10, 1s interval) with no HP amount, so on-recovery consumers on teammates fire correctly; incoming-healing ▲ and the Exposure taunt are damage-inert and unmodeled. The burst's 'Environment Setup damage taken multiplier scaled by 100%' is authored as an additive second 3.9pp boss debuff for 10s on burst cast."
}```

## 6. Driver implementation

### 6a. Driver test — scripts/tests/units/emma-tactical-upgrade.test.ts (22/22 GREEN; RED phase = whole suite
###     failing at load pre-S3, 'no override on disk')

```typescript
// PER-UNIT KIT SPEC — `emma-tactical-upgrade` (Emma: Tactical Upgrade, Supporter/MG/Fire, Burst I,
// cd 20s, ammo 300, MG 60→4200rpm windup). Kit-autonomy gauntlet 2026-07-27; test-first (TDD
// transition step 3). FROM-SCRATCH build: no override existed before this gauntlet, so the RED
// phase is the whole file failing at load (no override on disk) and GREEN lands with the S3
// override. Variant of base `emma` — never refer to her by the bare base name (P0 disambiguation).
//
// One assertion group per KIT LINE (T1..T7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE the recovery channel (crown's own heal
// removed) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['emma-tactical-upgrade'].skills):
//   S1 ■ start of battle / Affects self:
//        Environment Setup (recurring interval 30 sec):
//        E1 all enemies (incl. those appearing during): Damage Taken ▲3.9% for 10 sec          [T1]
//        E2 all allies: recovers 2.32% of the skill user's final Max HP every 1 sec for 10 sec [T2]
//        Exposure (Cannot be removed): Attract: Taunt all enemies continuously                 [—]
//   S2 ■ only if self is alive (no death in v1 → unconditional):
//        LT Formation:
//        E1 all allies from the same squad: Critical Damage ▲23.51% continuously               [T3]
//        E2 all allies: Projectile Explosion Damage ▲2.32% continuously                        [T4]
//        Bonus effects when applying AS Formation to self (MODE-GATED, default OFF — the       [T7]
//        formation is applied by eunhwa-tactical-upgrade, who is NOT simSupported, so no board
//        team can ever have it; the mode exists for kit-SSOT completeness, mint-duet precedent):
//        E1 all allies: True Damage ▲30.97% continuously
//        E2 all allies: Projectile Explosion Damage ▲3.09% continuously
//        E3 self: Exposure activation disabled continuously                                    [—]
//        E4 self: Recurring interval of Environment Setup ▼20 sec continuously
//   BU ■ all allies: Battlefield Formation: ATK ▲40.07% OF THE SKILL USER'S ATK for 10 sec      [T5]
//      ■ self while in Environment Setup status: Enhanced Environment Setup (10 sec):
//        E1 all enemies: Damage taken multiplier of Environment Setup scaled by 100%           [T6]
//        E2 all allies: Incoming healing ▲29.04%                                               [—]
//
// UNMODELED lines (documented, no assertion — nothing observable or nothing to represent):
//   [—] Exposure taunt: v1 has a single immortal boss and no targeting model; every unit already
//       attacks the boss, so a taunt moves no damage. Verbatim in the override's unmodeled.
//   [—] AS Formation bonus E3 (Exposure activation disabled): toggles off the already-unmodeled
//       taunt — a no-op on a no-op. Verbatim in unmodeled (even under the AS mode).
//   [—] Incoming healing ▲29.04%: no healing AMOUNTS are modeled (no HP pool, boss deals no
//       damage); the only healing observable is the recovery-event channel, which this line does
//       not touch. Verbatim in unmodeled.
//
// S2b RECONCILIATION (driver vs claude-fable-5, 2026-07-27):
//   (1) Enemy-debuff events carry casterIdx===null AND targetIdx===null (fable was right; the
//       owner is encoded in the buff KEY '0:skill1:…'/'0:burst:…') — the T1/T6 filters are
//       key-based, not casterIdx-based.
//   (2) Same-squad target (T3): driver holds `allies` (the sim IS one deployed squad; AIM
//       precedent encodes her "same squad" lines as plain allies). Fable's "self only" reading
//       would drop her main team contribution; noir's teamHas.slugs ruling is a GATE on named
//       lore-mates, a different construct from a target set. Documented in the override note.
//   (3) T4 fixture: fable assumed an RL-free comp; ada IS RL, and the engine's projExplOnRlNormals
//       default (Q9 A/B, Prydwen-confirmed) feeds the stat into RL NORMALS' Damage Up — so T4
//       asserts LIVE on ada (+0.0232 dmgUp) and INERT on MG normals. Stronger than byte-inert.
//   (4) AS Formation bonus lines: driver ADOPTS fable's modes[] encoding (default = no AS, since
//       the applier eunhwa-tactical-upgrade is off the board) over its original UNMODELED+⚑ plan —
//       converged. T7 pins the mode behaviour (interval 30→10 collapse, trueDamage 30.97,
//       additive projExpl 3.09) and the default-OFF absence.
//   (5) Fixture hazard (fable note 5 — liter outranking Emma for B1 casts): avoided by design —
//       the fixture fields NO liter; Emma is the sole Burst I and T5/T6 assert casts > 0.
//   Converged outright: T1 windows/first-fire-t=0, T2 ticks:10 recovery cadence, T5 flat
//   casterAtkPct on burstCast, T6 gated ×2 co-stacking debuff, taunt + incoming-heal UNMODELED.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   T1  the vulnerability is a BOSS DEBUFF (damageTakenPct, targetIdx null → mult.taken on every
//       ally's damage), NOT an ally ATK buff: the wrong-stat counterfactual (atkPct on the enemy
//       target, which resolves to nobody) never moves mult.taken at all. And it is WINDOWED
//       (10s on / 30s cycle from t=0: applications at frames 0,1800,…,9000), NOT continuous: the
//       duration-stripped counterfactual leaves mult.taken > 1 in the 15–29s gap where shipped
//       reads exactly 1.0.
//   T2  the heal is an event cadence, not a number (no HP pool): with crown's own heal patched
//       out, crown's recovery consumer (team Attack Damage 20.99% / 7s) fires exactly on Emma's
//       HoT ticks — 10 ticks spanning ~9s per window, every firing attributable to a window. The
//       ticks-stripped counterfactual (single instant event) collapses each window to 1 firing.
//       The 2.32%-of-HER-Max-HP magnitude is genuinely unmodeled (heal carries no amount) — the
//       cadence + target coverage is the faithful observable (blanc HoT precedent).
//   T3  the exact kit magnitude 23.51 (not the level-1 13.89), continuous (frame 0, no expiry),
//       on all three allies incl. herself ("same squad" ≡ whole team at single-squad scope), and
//       LIVE: removing it moves every ally's total (expected-value pass is deterministic).
//   T4  Projectile Explosion Damage is its OWN multiplicative bucket on explosion-flavored hits
//       AND (Q9 A/B, Prydwen-confirmed default ON) a Damage-Up addition on RL NORMAL attacks.
//       ada is RL → the line is LIVE on ada's normals: her mult.dmgUp drops by exactly 0.0232
//       when the line is removed. Emma/crown are MG → their normals are byte-identical across the
//       removal (flavored-hits-only rule: MG normals never read the stat). The two assertions
//       together pin the SCOPE, not just the presence.
//   T5  casterAtkPct resolves to a FLAT add of (40.07/100)×HER staticAtk on every ally (crown
//       precedent): the aligned in-window baseAtk diff vs the removed counterfactual is exactly
//       that flat value, and exactly 0 outside the 10s window. The own-% counterfactual (atkPct)
//       would key the diff to each target's OWN ATK — a different magnitude (staticAtks differ).
//   T6  the enhancement is GATED on Environment Setup being live at cast time (targetStatus
//       channel: S1 opens a name-keyed 'Environment Setup' boss window alongside the debuff; the
//       burst block carries requiresTargetStatus). Burst cadence 20s vs windows [0,10)/[30,40)/…
//       means some casts land IN windows (enhancement fires, mult.taken reaches 1.078 in the
//       overlap) and some land in the GAP (no enhancement). The ungated counterfactual fires on
//       EVERY cast — provably more applications, including gap-frame ones shipped never emits.
//       MODELING RULING (driver): the enhanced window carries the doubled multiplier for its OWN
//       full 10s (modeled as a second co-stacking damageTakenPct 3.9 instance, distinct
//       slot-keyed buff per the KR stacking rule), rather than clipping when the base window
//       expires — the kit gives Enhanced Environment Setup its own "Duration: 10 sec". The
//       strict-scale-only reading (bonus ends with the base window) differs by +3.9% taken over
//       ~7s per in-window burst; ⚑ measurement-gated in the override note.
//   T7  the AS Formation mode (default OFF) collapses the Environment Setup interval 30s→10s —
//       18 applications / 180s and a CONTIGUOUS window chain (every steady-state damage instance
//       carries mult.taken ≥ 1.039, vs 1/3 duty in the default mode) — and adds trueDamagePct
//       30.97 + a second projectileExplosionPct 3.09 (additive: ada's RL normals gain a further
//       +0.0309 dmgUp over the default-mode run). The default-OFF absence is pinned too: the
//       default run has zero trueDamagePct applications from Emma and the 30s cadence (T1).
//
// Fixture: emma-tactical-upgrade (B1, 20s) / crown (B2, 20s) / ada (B3, 40s), boss Fire, focus
// ada. Emma is the SOLE Burst I so she casts every Full Burst (~20s cycle → ~9 casts / 180s) —
// required to exercise T5/T6 at all. Crown is the recovery CONSUMER that makes T2 observable; her
// own hitCount self-heal is patched out in EVERY run so the recovery channel is attributable to
// Emma's HoT alone (helm H8 isolation idiom). Boss Fire: nobody is advantaged (ada/emma Fire,
// crown Iron), keeping the element bucket out of every diff. Deterministic (no seed) — event logs
// align index-for-index across counterfactual runs (ATK changes move no cadence: the boss is
// immortal and gauge is per-shot, not per-damage).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const WINDOW_FRAMES = 10 * FPS; // Environment Setup window length
const CYCLE_FRAMES = 30 * FPS; // recurring interval
/** Fixture slot order: emma-tactical-upgrade 0 / crown 1 / ada 2. */
const EMMA = 0;
const CROWN = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

/** The override's declared AS-Formation mode (second mode; the first/default is no-AS). */
const AS_MODE = 'AS Formation (w/ eunhwa-tactical-upgrade)';

function run(
  overrides: Record<string, any> = {},
  modes?: Record<string, string>
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['emma-tactical-upgrade', 'crown', 'ada'],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    modes,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const emmaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'emma-tactical-upgrade'
  );

/** Crown's recovery-consumer firings (one per distinct frame) — the T2 HoT observable. */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** Isolation: crown's own hitCount self-heal removed so the recovery channel is Emma's HoT only. */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

/** T1 counterfactual: the vulnerability with NO duration (continuous, not 10s windows). */
const emmaVulnAlways = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.stat === 'damageTakenPct') {
        delete e.durationSec;
        n++;
      }
    }
  }
  if (!n) {
    throw new Error(
      'emma-tu S1 damageTakenPct effect missing — fixture is stale'
    );
  }
});

/** T1 counterfactual: the same line as an ally-style ATK buff on the enemy target (inert — the
 *  enemy target resolves to no entity). mult.taken must never move under it. */
const emmaVulnWrongStat = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.stat === 'damageTakenPct') {
        e.stat = 'atkPct';
        n++;
      }
    }
  }
  if (!n) {
    throw new Error(
      'emma-tu S1 damageTakenPct effect missing — fixture is stale'
    );
  }
});

/** T2 counterfactual: the HoT as a single instant heal event (ticks stripped). */
const emmaHotNoTicks = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.kind === 'heal') {
        delete e.ticks;
        n++;
      }
    }
  }
  if (!n) {
    throw new Error('emma-tu S1 heal effect missing — fixture is stale');
  }
});

/** T3 reference: the crit-damage line removed entirely. */
const emmaNoCritDmg = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error(
      'emma-tu S2 critDamagePct block missing — fixture is stale'
    );
  }
});

/** T4 reference: the projectile-explosion line removed entirely. */
const emmaNoProjExpl = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !hasStat(b, 'projectileExplosionPct')
  );
  if (ov.skill2.length === before) {
    throw new Error(
      'emma-tu S2 projectileExplosionPct block missing — fixture is stale'
    );
  }
});

/** T5 reference: the burst ATK line removed entirely. */
const emmaNoCasterAtk = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.burst.length === before) {
    throw new Error(
      'emma-tu burst casterAtkPct block missing — fixture is stale'
    );
  }
});

/** T5 counterfactual: the same line as % of each target's OWN ATK (atkPct), not the caster's. */
const emmaOwnAtkPct = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error(
      'emma-tu burst casterAtkPct effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});

/** T6 counterfactual: the enhancement UNGATED (fires on every burst, Environment Setup or not). */
const emmaEnhUngated = withPatchedOverride('emma-tactical-upgrade', (ov) => {
  const b = ov.burst.find((x: any) => x.requiresTargetStatus);
  if (!b) {
    throw new Error(
      'emma-tu burst requiresTargetStatus block missing — fixture is stale'
    );
  }
  delete b.requiresTargetStatus;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run({ crown: crownNoHeal });
const rVulnAlways = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaVulnAlways,
});
const rWrongStat = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaVulnWrongStat,
});
const rNoTicks = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaHotNoTicks,
});
const rNoCrit = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaNoCritDmg,
});
const rNoProj = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaNoProjExpl,
});
const rNoCaster = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaNoCasterAtk,
});
const rOwnAtk = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaOwnAtkPct,
});
const rUngated = run({
  crown: crownNoHeal,
  'emma-tactical-upgrade': emmaEnhUngated,
});
const rAS = run({ crown: crownNoHeal }, { 'emma-tactical-upgrade': AS_MODE });

// ---- derived constants ------------------------------------------------------------------------
const emmaStaticAtk = unitOf(base.res, 'emma-tactical-upgrade').staticAtk;
const adaStaticAtk = unitOf(base.res, 'ada').staticAtk;
const FLAT_ATK_GRANT = (40.07 / 100) * emmaStaticAtk;

/** Boss-debuff buff keys: ownerIdx (Emma = slot 0) + slot + stat + value — the KR stacking key.
 *  Enemy debuffs carry casterIdx===null AND targetIdx===null, so the owner is read off the KEY. */
const VULN_BASE_KEY = `${EMMA}:skill1:damageTakenPct:3.9`;
const VULN_ENH_KEY = `${EMMA}:burst:damageTakenPct:3.9`;

/** Base Environment Setup vulnerability applications (skill1-keyed boss debuffs). */
const baseVulnApps = buffs(base.events).filter((b) => b.key === VULN_BASE_KEY);
/** Enhanced (burst-keyed) vulnerability applications. */
const enhVulnApps = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.key === VULN_ENH_KEY);
const baseWindows = baseVulnApps.map((b) => b.frame);
const inSomeWindow = (frame: number) =>
  baseWindows.some((w) => frame >= w && frame < w + WINDOW_FRAMES);

describe('emma-tactical-upgrade (Emma: Tactical Upgrade) — kit spec', () => {
  describe('T1 — S1 Environment Setup: Damage Taken ▲3.9% on the boss, 10s windows every 30s from t=0', () => {
    it('applies at frame 0 and recurs on the 30s interval (6 windows / 180s), each 10s long', () => {
      expect(baseVulnApps.map((b) => b.frame)).toEqual([
        0,
        CYCLE_FRAMES,
        2 * CYCLE_FRAMES,
        3 * CYCLE_FRAMES,
        4 * CYCLE_FRAMES,
        5 * CYCLE_FRAMES,
      ]);
      for (const b of baseVulnApps) {
        expect(b.value).toBe(3.9);
        expect(b.targetIdx, 'a boss debuff has no unit holder').toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
      }
    });

    it('mult.taken tracks the coverage map: 1.0 uncovered, 1.039 one instance, 1.078 overlap', () => {
      // The burst enhancement (T6) co-stacks a second instance from some cast frames, so the
      // taken value at any frame is a pure function of which instances cover it — assert the
      // full map, not a hand-picked band (an enhanced window legitimately extends past the base
      // window it was cast inside, so e.g. t=15s correctly still reads 1.039).
      const enhFrames = enhVulnApps(base.events).map((b) => b.frame);
      const inEnh = (f: number) =>
        enhFrames.some((h) => f >= h && f < h + WINDOW_FRAMES);
      let sawUncovered = 0;
      let sawSingle = 0;
      let sawOverlap = 0;
      for (const d of dmg(base.events)) {
        const b = inSomeWindow(d.frame);
        const e = inEnh(d.frame);
        if (!b && !e) {
          sawUncovered++;
          expect(d.mult.taken, `uncovered damage at ${d.sec}s`).toBe(1);
        } else if (b && e) {
          sawOverlap++;
          expect(d.mult.taken, `overlap damage at ${d.sec}s`).toBeCloseTo(
            1.078,
            9
          );
        } else {
          sawSingle++;
          expect(
            d.mult.taken,
            `single-instance damage at ${d.sec}s`
          ).toBeCloseTo(1.039, 9);
        }
      }
      expect(
        sawUncovered,
        'no uncovered damage — 10/30 windows cannot tile the timeline'
      ).toBeGreaterThan(0);
      expect(sawSingle, 'no single-instance damage').toBeGreaterThan(0);
      expect(
        sawOverlap,
        'no overlap damage — the enhancement never co-stacked'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: the duration-stripped counterfactual stays live in the 15–29s gap', () => {
      const gapLifted = dmg(rVulnAlways.events).filter(
        (d) => d.frame >= 15 * FPS && d.frame < 29 * FPS && d.mult.taken > 1
      );
      expect(gapLifted.length).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: boss DEBUFF channel — under the wrong-stat counterfactual the base windows contribute nothing', () => {
      // The counterfactual still opens the targetStatus window (only the buff stat flipped), so
      // the burst enhancement can still fire — the discriminator is the BASE windows alone:
      // frames inside a base window but outside every enhanced window.
      const enhFrames = enhVulnApps(base.events).map((b) => b.frame);
      const baseOnly = (f: number) =>
        inSomeWindow(f) &&
        !enhFrames.some((h) => f >= h && f < h + WINDOW_FRAMES);
      expect(
        dmg(base.events).some((d) => baseOnly(d.frame) && d.mult.taken > 1.03),
        'shipped base windows must lift mult.taken on their own'
      ).toBe(true);
      expect(
        dmg(rWrongStat.events).some(
          (d) => baseOnly(d.frame) && d.mult.taken > 1.0001
        ),
        'atkPct on the enemy target resolves to nobody — base windows must stay at 1.0'
      ).toBe(false);
    });
  });

  describe('T2 — S1 Environment Setup: ally HoT as a 10-tick recovery cadence per window', () => {
    const frames = recoveryFrames(base.events);

    it('every recovery firing is attributable to an Environment Setup window', () => {
      expect(frames.length, 'no recovery firings at all').toBeGreaterThan(40);
      const stray = frames.filter((f) => !inSomeWindow(f));
      expect(
        stray,
        `recovery firings outside every window: ${stray.map((f) => (f / FPS).toFixed(1)).join(',')}`
      ).toEqual([]);
    });

    it('ticks every ~1s across the whole window (>=9 ticks spanning >=8s), not one instant event', () => {
      const w = CYCLE_FRAMES; // the t=30s window, fully inside the fight
      const inWin = frames.filter((f) => f >= w && f < w + WINDOW_FRAMES);
      expect(inWin.length).toBeGreaterThanOrEqual(9);
      expect(inWin[inWin.length - 1] - inWin[0]).toBeGreaterThanOrEqual(
        8 * FPS
      );
    });

    it('DISCRIMINATING: the ticks-stripped counterfactual collapses each window to a single firing', () => {
      const w = CYCLE_FRAMES;
      const inWin = recoveryFrames(rNoTicks.events).filter(
        (f) => f >= w && f < w + WINDOW_FRAMES
      );
      expect(inWin.length).toBeLessThanOrEqual(2);
    });
  });

  describe('T3 — S2 LT Formation: Critical Damage ▲23.51% continuously, all allies (same squad)', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EMMA && b.stat === 'critDamagePct'
    );

    it('is the kit magnitude, from frame 0, with no expiry, on all three allies incl. herself', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([23.51]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        EMMA,
        CROWN,
        2,
      ]);
    });

    it("is LIVE: removing it lowers every ally's total", () => {
      for (const slug of ['ada', 'crown', 'emma-tactical-upgrade']) {
        expect(
          base.totals[slug],
          `${slug} total must exceed the crit-damage-removed world`
        ).toBeGreaterThan(rNoCrit.totals[slug]);
      }
    });
  });

  describe('T4 — S2 LT Formation: Projectile Explosion Damage ▲2.32% continuously, all allies', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EMMA && b.stat === 'projectileExplosionPct'
    );

    it('is 2.32% from frame 0, no expiry, on all three allies', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2.32]);
      expect([...new Set(applied.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        EMMA,
        CROWN,
        2,
      ]);
    });

    it("is LIVE on ada's RL normals: her mult.dmgUp drops by exactly 0.0232 when the line is removed", () => {
      const adaNormalsBase = dmg(base.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      const adaNormalsNoProj = dmg(rNoProj.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      expect(adaNormalsBase.length).toBeGreaterThan(0);
      expect(adaNormalsNoProj.length).toBe(adaNormalsBase.length);
      for (let i = 0; i < adaNormalsBase.length; i++) {
        expect(
          adaNormalsBase[i].mult.dmgUp - adaNormalsNoProj[i].mult.dmgUp,
          `event ${i} at ${adaNormalsBase[i].sec}s`
        ).toBeCloseTo(0.0232, 9);
      }
    });

    it('is INERT on MG normals (flavored-hits-only rule): emma and crown are byte-identical across the removal', () => {
      for (const slug of ['emma-tactical-upgrade', 'crown']) {
        const baseNormals = dmg(base.events).filter(
          (d) => d.slug === slug && d.bucket === 'normal'
        );
        const noProjNormals = dmg(rNoProj.events).filter(
          (d) => d.slug === slug && d.bucket === 'normal'
        );
        expect(noProjNormals.length).toBe(baseNormals.length);
        for (let i = 0; i < baseNormals.length; i++) {
          expect(noProjNormals[i].mult.dmgUp).toBe(baseNormals[i].mult.dmgUp);
        }
      }
    });
  });

  describe('T5 — Burst Battlefield Formation: ATK ▲40.07% of HER ATK, 10s, all allies', () => {
    const casts = emmaBursts(base.events);
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EMMA && b.stat === 'casterAtkPct'
    );

    it('fires once per burst cast at the flat resolution of 40.07% of her staticAtk, for 10s, on all allies', () => {
      expect(casts.length).toBeGreaterThan(0);
      // One buffApply event per HOLDER (3 allies) per cast.
      expect(applied.length).toBe(casts.length * 3);
      for (const b of applied) {
        expect(b.value).toBeCloseTo(FLAT_ATK_GRANT, 6);
        expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
      }
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [, holders] of perFrame) {
        expect([...holders].sort()).toEqual([EMMA, CROWN, 2]);
      }
    });

    it('the flat add is keyed to HER ATK and confined to the 10s window (aligned baseAtk diffs)', () => {
      const castFrames = casts.map((c) => c.frame);
      const inWindow = (f: number) =>
        castFrames.some((c) => f >= c && f < c + WINDOW_FRAMES);
      const adaBase = dmg(base.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      const adaNoCaster = dmg(rNoCaster.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      expect(adaNoCaster.length).toBe(adaBase.length);
      let sawInWindow = false;
      for (let i = 0; i < adaBase.length; i++) {
        const diff = adaBase[i].baseAtk - adaNoCaster[i].baseAtk;
        if (inWindow(adaBase[i].frame)) {
          sawInWindow = true;
          expect(diff, `in-window event at ${adaBase[i].sec}s`).toBeCloseTo(
            FLAT_ATK_GRANT,
            4
          );
        } else {
          expect(diff, `out-of-window event at ${adaBase[i].sec}s`).toBe(0);
        }
      }
      expect(sawInWindow, 'no ada normals landed inside a burst window').toBe(
        true
      );
    });

    it("DISCRIMINATING: the own-% counterfactual keys the diff to the TARGET'S ATK, not hers", () => {
      expect(emmaStaticAtk).not.toBe(adaStaticAtk);
      const adaBase = dmg(base.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      const adaOwn = dmg(rOwnAtk.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal'
      );
      expect(adaOwn.length).toBe(adaBase.length);
      // Under atkPct, removing it shrinks ada's baseAtk by ada's OWN 40.07% — a different
      // magnitude than the shipped caster-scaled flat add.
      let checked = 0;
      for (let i = 0; i < adaBase.length; i++) {
        if (adaBase[i].baseAtk === adaOwn[i].baseAtk) {
          continue; // out-of-window events coincide
        }
        checked++;
        expect(
          Math.abs(adaBase[i].baseAtk - adaOwn[i].baseAtk),
          `in-window event at ${adaBase[i].sec}s`
        ).not.toBeCloseTo(0, 4);
      }
      expect(
        checked,
        'the own-% model must diverge somewhere in-window'
      ).toBeGreaterThan(0);
    });
  });

  describe('T6 — Burst Enhanced Environment Setup: vulnerability ×2, gated on Environment Setup live at cast', () => {
    const casts = emmaBursts(base.events);
    const enh = enhVulnApps(base.events);

    it('fires ONLY on burst casts that land inside an Environment Setup window (and at least one does)', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      expect(enh.length).toBeGreaterThan(0);
      expect(
        enh.length,
        'the gate must exclude at least one gap-frame cast'
      ).toBeLessThan(casts.length);
      for (const b of enh) {
        expect(
          castFrames.has(b.frame),
          `enh app at ${b.frame} is not a cast frame`
        ).toBe(true);
        expect(b.value).toBe(3.9);
        expect(b.targetIdx).toBeNull();
        expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
        expect(
          inSomeWindow(b.frame),
          `enh app at ${(b.frame / FPS).toFixed(1)}s is outside every window`
        ).toBe(true);
      }
    });

    it('the overlap stacks the boss debuff to mult.taken 1.078', () => {
      const doubled = dmg(base.events).filter(
        (d) => Math.abs(d.mult.taken - 1.078) < 1e-9
      );
      expect(
        doubled.length,
        'no damage instance saw both vulnerability instances co-active'
      ).toBeGreaterThan(0);
      const maxTaken = dmg(base.events).reduce(
        (m, d) => Math.max(m, d.mult.taken),
        0
      );
      expect(maxTaken).toBeCloseTo(1.078, 9);
    });

    it('DISCRIMINATING: the ungated counterfactual fires on EVERY cast, including gap frames', () => {
      const enhU = enhVulnApps(rUngated.events);
      expect(enhU.length).toBe(casts.length);
      expect(
        enhU.some((b) => !inSomeWindow(b.frame)),
        'with ~9 casts vs 10/30 windows, some gap-frame casts are guaranteed'
      ).toBe(true);
    });
  });

  describe('T7 — AS Formation mode (default OFF): interval collapse + True Damage + additive Projectile Explosion', () => {
    it('collapses the Environment Setup interval 30s→10s: 18 applications, contiguous duty cycle', () => {
      const asApps = buffs(rAS.events).filter((b) => b.key === VULN_BASE_KEY);
      expect(asApps.length).toBe(18);
      expect(asApps.map((b) => b.frame)).toEqual(
        Array.from({ length: 18 }, (_, i) => i * 10 * FPS)
      );
      // Windows [0,10),[10,20),… tile the fight: every damage instance is in-window.
      const uncovered = dmg(rAS.events).filter((d) => d.mult.taken < 1.039);
      expect(
        uncovered.length,
        'the AS cadence must leave no gap in the vulnerability duty cycle'
      ).toBe(0);
    });

    it('grants True Damage ▲30.97% to all allies under AS — and NOTHING under the default mode', () => {
      const asTD = buffs(rAS.events).filter(
        (b) => b.casterIdx === EMMA && b.stat === 'trueDamagePct'
      );
      expect(asTD.length).toBeGreaterThan(0);
      expect([...new Set(asTD.map((b) => b.value))]).toEqual([30.97]);
      expect([...new Set(asTD.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(asTD.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(asTD.map((b) => b.targetIdx))].sort()).toEqual([
        EMMA,
        CROWN,
        2,
      ]);
      const baseTD = buffs(base.events).filter(
        (b) => b.casterIdx === EMMA && b.stat === 'trueDamagePct'
      );
      expect(
        baseTD.length,
        'the default (no-AS) mode must emit no trueDamagePct at all'
      ).toBe(0);
    });

    it('Projectile Explosion ▲3.09% is ADDITIVE on top of the base 2.32% (ada RL normals: +0.0309 dmgUp vs default)', () => {
      // Compare only inside the first HoT window band [0,7s): crown's recovery consumer is
      // continuously active in BOTH runs there (identical opening cadence — the AS interval
      // collapse first diverges at t=10s), so the dmgUp diff isolates exactly the extra 3.09.
      // Later frames diverge in consumer UPTIME (the tripled cadence refreshes it to ~100%),
      // which is T7d's territory, not this assertion's.
      const BAND = 7 * FPS;
      const adaAs = dmg(rAS.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal' && d.frame < BAND
      );
      const adaBase = dmg(base.events).filter(
        (d) => d.slug === 'ada' && d.bucket === 'normal' && d.frame < BAND
      );
      expect(adaAs.length).toBe(adaBase.length);
      expect(adaAs.length).toBeGreaterThan(0);
      for (let i = 0; i < adaAs.length; i++) {
        expect(
          adaAs[i].mult.dmgUp - adaBase[i].mult.dmgUp,
          `event ${i} at ${adaAs[i].sec}s`
        ).toBeCloseTo(0.0309, 9);
      }
      // Buff-level pin: the 3.09 instance reaches all three allies under AS and never ships
      // under the default mode.
      const as309 = buffs(rAS.events).filter(
        (b) =>
          b.casterIdx === EMMA &&
          b.stat === 'projectileExplosionPct' &&
          b.value === 3.09
      );
      expect([...new Set(as309.map((b) => b.targetIdx))].sort()).toEqual([
        EMMA,
        CROWN,
        2,
      ]);
      expect(
        buffs(base.events).filter(
          (b) =>
            b.casterIdx === EMMA &&
            b.stat === 'projectileExplosionPct' &&
            b.value === 3.09
        ).length
      ).toBe(0);
    });

    it('triples the HoT recovery cadence (one tick-set per 10s instead of per 30s)', () => {
      const asCount = recoveryFrames(rAS.events).length;
      const baseCount = recoveryFrames(base.events).length;
      expect(asCount).toBeGreaterThanOrEqual(150);
      expect(asCount).toBeGreaterThan(2.5 * baseCount);
    });
  });
});
````

### 6b. Driver override — src/skills/overrides/emma-tactical-upgrade.json (validate-overrides: valid,

### dmg 97.9M / 15.6% share / 9 bursts, 0 warnings)

```json
{
  "note": "Emma: Tactical Upgrade (slug emma-tactical-upgrade, aka emmatu — variant of base emma; never the bare base name) — Elysion Fire MG Supporter, Burst I, 20s CD. FROM-SCRATCH kit-autonomy build 2026-07-27 (no prior override; baseline was bare weapon). S1 ENVIRONMENT SETUP: boss damageTakenPct 3.9 for 10s windows recurring every 30s FROM t=0 — the kit's 'Activates at the start of battle' overrides the interval first-fire-at-t=sec convention, encoded as a passive@0 leading block + interval:30 recurrence (same KR slot key, refresh semantics). Each activation also opens a name-keyed 'Environment Setup' boss status window (targetStatus, same 10s) that the burst enhancement gate reads — the kit's 'Affects self WHILE IN Environment Setup status' condition, expressed through the engine's sole name-keyed status channel (d-killer-wife precedent; the status is keyed per NAME so no unrelated kit status can open the gate). S1 HoT (2.32% of HER final Max HP every 1s for 10s, all allies): modeled as heal ticks:10 — a recovery-EVENT cadence (10 events/window) that keeps Crown-type on-recovery consumers refreshed across the window; the heal AMOUNT is genuinely unmodeled (no HP pool; blanc HoT precedent). S2 LT FORMATION: critDamagePct 23.51 + projectileExplosionPct 2.32, continuous passives. 'All allies from the same squad' (E1) is encoded as plain allies: the sim fields exactly ONE deployed squad, so same-squad ≡ the whole team (anchor-innocent-maid precedent for same-squad lines; distinct from noir's teamHas.slugs gate on NAMED lore-mates, owner-ruled 2026-07-20 — that is a gate on specific units, not a target set). projectileExplosionPct feeds only explosion-flavored hits and (Q9 A/B projExplOnRlNormals default ON, Prydwen-confirmed) RL NORMAL attacks — inert on MG normals; the unit test pins both directions. BURST: casterAtkPct 40.07 — a FLAT add of (40.07/100)×HER staticAtk to every ally for 10s (crown precedent), on her OWN burstCast. ENHANCED ENVIRONMENT SETUP (burst, gated on Environment Setup live at cast via requiresTargetStatus): a SECOND co-stacking damageTakenPct 3.9 boss instance — distinct KR slot key (0:burst:… vs 0:skill1:…) so the overlap sums to 7.8% taken. ⚑ RULING (measurement-gated): the enhanced instance runs its OWN full 10s (the kit gives Enhanced Environment Setup 'Duration: 10 sec') rather than clipping when the base window expires mid-enhancement. Estimate: the strict-scale reading differs by +3.9% damage-taken for ~7s per in-window burst (<1% of fight damage). Recipe: popup-read the vulnerability icon's duration/stack count right after her burst in any recording. Tier 2. MODES: the 'Bonus effects when applying AS Formation to self' lines (True Damage ▲30.97%, Projectile Explosion ▲3.09% additive, Environment Setup recurring interval ▼20s = interval:10 mode-keyed skill1 variants) sit behind the second mode, DEFAULT OFF — AS Formation is applied by eunhwa-tactical-upgrade (SR/Fire/B2), who is NOT simSupported, so no board team can ever have the formation; the mode is kit-SSOT completeness (mint-duet precedent), not board behavior. When eunhwa-tactical-upgrade is modeled, prefer a teamHas.slugs auto-gate over the manual mode (her AS Formation is an unconditional passive in-game, so presence ≡ formation applied). Bonus E3 (Exposure activation disabled) is a no-op on the unmodeled taunt, unmodeled even under the mode. UNMODELED: Exposure taunt (single immortal boss, no targeting model — every unit already attacks it); Incoming healing ▲29.04% (no heal amounts / no HP pool; the recovery-event channel is untouched by healing-taken scaling). 'Activates only if self is alive' (S2) = unconditional (no death in v1). Cross-family: S2b claude-fable-5 converged (casterIdx-null filter fix + modes[] encoding adopted from the review; same-squad allies + RL-fixture projExpl held by driver, concurred). Kit-autonomy gauntlet 2026-07-27.",
  "modes": ["no AS Formation", "AS Formation (w/ eunhwa-tactical-upgrade)"],
  "unmodeled": {
    "skill1": [
      "Exposure (Cannot be removed) — Effect: Attract: Taunt all enemies continuously."
    ],
    "skill2": [
      "Bonus effects when applying AS Formation to self — Effect 3: Affects self. Exposure activation disabled continuously."
    ],
    "burst": [
      "Enhanced Environment Setup — Effect 2: Incoming healing ▲ 29.04%. Effect 2 Target(s): All allies"
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 3.9,
          "durationSec": 10
        },
        {
          "kind": "targetStatus",
          "name": "Environment Setup",
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "interval", "sec": 30 },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 3.9,
          "durationSec": 10
        },
        {
          "kind": "targetStatus",
          "name": "Environment Setup",
          "durationSec": 10
        }
      ],
      "mode": "no AS Formation"
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "interval", "sec": 10 },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 3.9,
          "durationSec": 10
        },
        {
          "kind": "targetStatus",
          "name": "Environment Setup",
          "durationSec": 10
        }
      ],
      "mode": "AS Formation (w/ eunhwa-tactical-upgrade)"
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "heal", "ticks": 10, "intervalSec": 1 }]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "interval", "sec": 30 },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "heal", "ticks": 10, "intervalSec": 1 }],
      "mode": "no AS Formation"
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "interval", "sec": 10 },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "heal", "ticks": 10, "intervalSec": 1 }],
      "mode": "AS Formation (w/ eunhwa-tactical-upgrade)"
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "buff", "stat": "critDamagePct", "value": 23.51 }]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "projectileExplosionPct", "value": 2.32 }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "allies" },
      "effects": [{ "kind": "buff", "stat": "trueDamagePct", "value": 30.97 }],
      "mode": "AS Formation (w/ eunhwa-tactical-upgrade)"
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "projectileExplosionPct", "value": 3.09 }
      ],
      "mode": "AS Formation (w/ eunhwa-tactical-upgrade)"
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 40.07,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "enemy" },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 3.9,
          "durationSec": 10
        }
      ],
      "requiresTargetStatus": "Environment Setup"
    }
  ]
}
```
