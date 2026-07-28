# S7 RECONCILING-JUDGE PACKET — exia (Exia (Treasure))

## 1. JUDGE CONTRACT

````markdown
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
````

Save to `scripts/kit-autonomy/results/<slug>.json`. `suggestedFix` is a faithful representation or a flagged
measurement, NEVER a number chosen to hit the board. Tight structured JSON, not an essay.

````

## 2. MECHANICS SSOT — docs/data/damage-calculation.md
```markdown
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

````

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

187,102 × 14.006 × 1.0 × 1.1 × 1.209 = 3,485,150 → measured 3,448,659 (98.9%)
crit: × 1.5 = 5,227,725 → measured (other fight) ×1.5 pair exact

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

```markdown
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

```

## 3. GROUND TRUTH — kit prose + base stats (data/characters.json → characters.exia)

```json
{
  "slug": "exia",
  "name": "Exia (Treasure)",
  "weapon": "SR",
  "burst": "I",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Electric",
  "manufacturer": "Tetra",
  "normalAttackMultiplier": 69.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "rl3": 8.4,
  "burstGaugePerShot": 2.8,
  "treasure": true,
  "skills": {
    "skill1": "■ Activates when the last bullet hits the target. Affects the target if the skill user is in Collect Hacking Code.\nATK ▼ 13.77% for 5 sec.\nDEF ▼ 13.77% for 5 sec.\n■ Activates when entering Full Burst. Affects self.\nReload speed is fixed at a 95% increase for 10 sec.",
    "skill2": "■ Activates when landing an attack with Full Charge. Affects self.\nCollect Hacking Code: ATK ▲ 28%, stacks up to 5 time(s) for 5 sec.\n■ When the last round of ammunition hits, affects all Electric Code ally unit(s) if the skill user is in Collect Hacking Code.\nATK ▲ 5.8% of the skill user's ATK, stacks up to 5 time(s) for 15 sec.",
    "burst": "■ Affects the 10 enemy unit(s) with the highest final DEF.\nDeals 122.32% of final ATK as damage.\nDEF ▼ 2.71% for 5 sec.\n■ Activates when Collect Hacking Code is at max stacks. Affects the same target(s).\nDeals 122.32% of final ATK as additional damage.\nDamage Taken ▲ 18.04% for 10 sec."
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
    "resourceId": 210
  }
}
```

## 4. S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, leakDetected null)

```json
{
  "slug": "exia",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ last bullet hits… ATK ▼ 13.77% 5s",
      "disposition": "UNMODELED",
      "scope": "Boss (enemy) offensive stat — boss ATK does not feed any damage the sim models (v1 boss deals no damage)",
      "durationSemantics": "5 sec wall-clock, refreshed per trigger",
      "triggerIdentity": "lastBullet (per-magazine, on-hit), gated on self being in Collect Hacking Code (self-status/resource gate, NOT requiresTargetStatus — that gate reads a boss status)",
      "targetSet": "enemy (the boss)",
      "nearestWrongModel": "Encoding boss ATK ▼ as an ally/self debuff, or spending effort modeling it as live damage-relevant",
      "distinguishingAssertion": "No damage delta with the line present vs absent (withPatchedOverride removing it): totals(res)['exia'] and all teammates identical",
      "inertness": "Must move ZERO damage for every unit; belongs in unmodeled/note, not a live block",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "■ last bullet hits… DEF ▼ 13.77% 5s",
      "disposition": "FIX",
      "scope": "Boss DEF debuff — reduces boss DEF in the damage formula, benefits the WHOLE team's hits while live",
      "durationSemantics": "5 sec wall-clock; ammo 6 + ~1s charge cadence + 141f reload gives a magazine cycle ~8-9s, so the debuff has real DOWNTIME (~35-45% uptime), it is NOT permanent",
      "triggerIdentity": "lastBullet, gated on self holding ≥1 Collect Hacking Code stack (shot 1 is a full charge, so the gate is satisfied by every natural last bullet — but the gate must still be authored: model Hacking Code as a resource pool + resourceGate {min:1}, or equivalent)",
      "targetSet": "enemy (boss-held debuff: buffApply with casterIdx===null && targetIdx===null)",
      "nearestWrongModel": "(a) treating it as permanent uptime (durationSec omitted / passive), or (b) applying defPct to allies where the schema marks it inert, silently dropping a real team-wide damage lever, or (c) shotFired instead of lastBullet (6× over-application)",
      "distinguishingAssertion": "Filter buffApply by stat+value 13.77 with casterIdx===null: exactly ONE application per magazine cycle, at last-bullet frames, expiresFrame = apply+300; team damage drops when the line is patched out. RED under shotFired (6 applies/mag) and under permanent encoding (no expiry gaps). NOTE: if the engine has no boss-DEF-reduction channel (defPct comment covers self-DEF only), this line is a GAP that must be flagged, never silently dropped",
      "inertness": "Must not apply before exia's magazine cycle completes; must not fire on non-last-bullet shots",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "■ entering Full Burst… Reload fixed +95% 10s",
      "disposition": "FAITHFUL",
      "scope": "Self weapon-state modifier — reload speed gates shots fired, this IS damage (taxonomy #6); never 'skip as defensive'",
      "durationSemantics": "10 sec wall-clock. 'Fixed at a 95% increase' is a stat CLAMP primitive (engine-modeling-gaps §1b); with no other reload buff in exia's kit, reloadSpeedPct 95 / durationSec 10 is behaviorally equivalent — note the approximation",
      "triggerIdentity": "fullBurstEnter — 'when entering Full Burst' fires on ANY team FB, not only rotations exia casts B1 (she is B1; in a multi-B1 comp like the liter fixture the distinction is live)",
      "targetSet": "self",
      "nearestWrongModel": "(a) keyed to burstCast — misses FBs where the other B1 (liter) wins the cast; (b) skipped as 'defensive, no damage'; (c) durationShots instead of durationSec",
      "distinguishingAssertion": "buffApply {stat: reloadSpeedPct, value: 95, target exia, expiresFrame = fbStart+600} at EVERY fullBurstStart including FBs where exia did not cast her burst; exia's reload count / shots fired over 180s exceeds the patched-out baseline. RED under burstCast keying on any FB liter opens",
      "inertness": "Must not apply outside FB windows; must not touch teammates' reloads",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ Full Charge lands… Hacking Code ATK ▲28% x5",
      "disposition": "FAITHFUL",
      "scope": "Self ATK, generic (scales own damage incl. burst); this stack pool is ALSO the named status three other lines gate on — model it as a queryable resource, not just a buff",
      "durationSemantics": "5 sec per application, stacks to 5, refreshed each full-charge hit (~1.2s cadence keeps it near-capped while firing; reload 2.35s does not lapse it). Ramp: ~5-6s from t=0 to max stacks — a rampSec haircut or honest stack accrual, not instant-max at t=0 (⚑ trajectory)",
      "triggerIdentity": "per full-charge HIT (on-hit, not on-fire) — chargeCounter count:1 or the SR every-shot-is-full-charge equivalent; NOT hitCount over all hits, NOT fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "(a) authored at max magnitude (140%) as an instant passive — over-credits t=0 and breaks the max-stacks burst gate; (b) no maxStacks cap; (c) permanent duration",
      "distinguishingAssertion": "buffApply {stat: atkPct, value: 28, target self} sequence with stacks incrementing 1..5 across the first ~5 full-charge landings, stacks never >5, expiresFrame = each apply+300. RED under instant-max (stacks 5 at first apply) and under permanent (no expiry after a firing gap)",
      "inertness": "Must not apply on a shot that is not a full-charge landing; must not buff allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ last round hits… ATK ▲5.8% of user's ATK x5",
      "disposition": "FAITHFUL",
      "scope": "Team buff to Electric Code allies ONLY (element-typed target); 'of the skill user's ATK' = caster-scaled FLAT add, not a % of each target's own ATK",
      "durationSemantics": "15 sec per stack, stacks to 5; lastBullet fires ~every 8-9s so steady-state is ~2 concurrent stacks, NOT 5 — a max-stacks static encoding over-credits ~2.5×",
      "triggerIdentity": "lastBullet, gated on self in Collect Hacking Code (same self-status gate as S1a; satisfied by every natural magazine but must be authored)",
      "targetSet": "alliesOfElement Electric — includes exia herself (no 'except self' clause); non-Electric teammates get NOTHING",
      "nearestWrongModel": "(a) stat atkPct 5.8 scaling each target's OWN buffed ATK instead of casterAtkPct flat off exia's supporter-class static ATK — over-credits every high-ATK carry; (b) target 'allies' unfiltered — credits non-Electric units; (c) durationSec 5 copied from the sibling line",
      "distinguishingAssertion": "buffApply {stat: 'casterAtkPct'} with FLAT value ≈ 0.058 × exia.staticAtk (the harness flat-resolves caster-scaled stats at apply time — the raw 5.8 must NOT appear as the value), targetSlug set == exactly the comp's Electric members, at last-bullet frames, maxStacks 5, expiresFrame = apply+900. RED under atkPct encoding (value 5.8, per-target scaling) and under unfiltered targeting (buffApply on a non-Electric slug)",
      "inertness": "Non-Electric teammates' damage must not move when this line is patched out",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ 10 highest-DEF enemies… 122.32% dmg, DEF ▼2.71%",
      "disposition": "FAITHFUL",
      "scope": "Burst-cast instant damage vs the single boss (the 10-enemy clause collapses to one target on a partless single boss) + a second, independent boss DEF debuff (different slot key than S1's 13.77% — they coexist, no overwrite)",
      "durationSemantics": "Damage instant on cast; DEF ▼ 5 sec per cast (cd 20s → low uptime)",
      "triggerIdentity": "burstCast (exia's OWN burst, stage 1) — fires only on rotations SHE wins the B1 cast; in the liter fixture the two B1s alternate/compete, so burstCast vs stageEnter/fullBurstEnter is live",
      "targetSet": "enemy (boss); DEF ▼ as a boss-held debuff",
      "nearestWrongModel": "(a) damage given the +50% FB major — burst-cast damage lands BEFORE the FB window opens (taxonomy #9: burst-cast damage is always FB-exempt); (b) keyed to stageEnter:1 so it fires on liter's B1 casts too",
      "distinguishingAssertion": "One damage event (bucket burst, mult 122.32) per exia burstCast event only — count matches her actual casts in the rotation log, with inFullBurst===false / fbMajorApplied===false; DEF ▼ 2.71 buffApply (casterIdx null) with expiresFrame cast+300. RED under FB-major application and under stageEnter keying (fires on liter's casts)",
      "inertness": "Must not fire on Full Bursts exia did not cast; no +50% FB, no range bonus on the hit",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "■ at max stacks… +122.32% dmg, DT ▲18.04% 10s",
      "disposition": "FAITHFUL",
      "scope": "Conditional rider on the burst: a SECOND 122.32% hit (total 244.64% when gated in) plus Damage Taken ▲ on the BOSS — a team-wide debuff benefiting every unit's damage for 10s (taxonomy #4), emphatically NOT a self buff",
      "durationSemantics": "Damage instant; damageTakenPct 18.04 for 10 sec per gated cast",
      "triggerIdentity": "burstCast composed with a max-stacks gate: fires ONLY when Collect Hacking Code is at 5 stacks at cast time (resourceGate {min:5} on the Hacking Code pool). The FIRST burst of the fight is the discriminator — B1 casts within the opening seconds, likely before 5 full charges have landed, so the rider must be able to NOT fire",
      "targetSet": "'the same target(s)' — the boss; DT ▲ as boss-held debuff (casterIdx===null)",
      "nearestWrongModel": "(a) ungated — every burst deals 244.64% and applies DT ▲, over-crediting the whole team every rotation; (b) gate at ≥1 stack instead of ==max(5); (c) damageTakenPct mis-scoped as a self/team ATK-side buff instead of a boss debuff",
      "distinguishingAssertion": "withPatchedOverride removing skill2's stack-grant block: faithful → rider damage event and damageTakenPct buffApply NEVER appear while the base 122.32% still fires every cast; nearest-wrong (ungated) → still present. Unpatched: rider present exactly on casts where pre-cast stack count is 5, absent on any earlier-than-5-stacks cast; damageTakenPct 18.04 buffApply has casterIdx===null and expiresFrame cast+600, and patching it out drops EVERY unit's damage, not only exia's",
      "inertness": "No rider damage and no DT ▲ on any cast below max stacks; DT ▲ must not appear as a unit-targeted buff",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:DEF ▼ 13.77% boss debuff (lastBullet, status-gated)",
    "skill1:Reload speed fixed +95% 10s (fullBurstEnter, self)",
    "skill2:Collect Hacking Code ATK ▲28% x5 (full-charge hit, self)",
    "skill2:ATK ▲5.8% of user's ATK x5 (lastBullet, Electric allies)",
    "burst:122.32% damage + DEF ▼2.71% (burstCast, boss)",
    "burst:max-stacks rider +122.32% + Damage Taken ▲18.04% (gated)"
  ],
  "unmodeledVerbatim": {
    "skill1": ["ATK ▼ 13.77% for 5 sec."],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in order of damage risk: (1) S2b encoded as atkPct (per-target %) instead of casterAtkPct flat off exia's supporter static ATK — the harness flat-resolves caster-scaled values at apply time, so the assertion on the emitted value (≈0.058×staticAtk, not 5.8) is the clean discriminator; also its Electric-only target filter and 15s/steady-state ~2-stack (not 5) uptime. (2) Burst rider left ungated or gated ≥1 stack — patch out the S2a stack source and assert the rider goes silent; also Damage Taken ▲ must be a boss-held debuff (casterIdx null) benefiting the whole team. (3) S1 reload keyed to burstCast instead of fullBurstEnter — live in the liter fixture where two B1s compete; and it must not be skipped as 'defensive' (reload = shots fired = damage). (4) Boss DEF ▼ lines (13.77% S1, 2.71% burst): the schema's defPct is documented self-inert; if the engine lacks a boss-DEF-reduction channel these are a declared GAP, not a silent drop — the driver must reconcile which channel (if any) carries them, and the S1 one has real downtime (~8-9s magazine cycle vs 5s duration), so a permanent encoding over-credits. (5) Collect Hacking Code is load-bearing STATE read by three other lines (S1a gate, S2b gate, burst rider gate) — it should be modeled as a queryable resource pool, not only an atkPct buff, or the gates cannot be expressed. (6) Burst-cast damage is FB-exempt by timing (verified project fact); fbMajorApplied must be false. All magnitudes are kit-literal (DATAMINED); the stack-ramp trajectory and the clamp-vs-additive reload approximation are the only ⚑ judgment calls. Could not write scripts/kit-autonomy/reviews/exia.test-review.json — no file tools available in this run; this JSON is the deliverable.",
  "model": "claude-fable-5"
}
```

## 5. S5 BLIND TEST (claude-opus-5) + RESULT vs DRIVER OVERRIDE

Ran `npx vitest run` on the blind test against the DRIVER override on disk (one mechanical path fix: the harness import rewritten from '../lib/harness.js' to '../../tests/lib/harness.js' because blind/ lives under kit-autonomy/, not tests/units/ — no semantic change).

RESULT: 7 passed / 13 failed / 2 skipped (22 total).

DRIVER'S FAILURE CLASSIFICATION (dispute any of these):

- ENGINE-CHANNEL (2): "emits BOTH debuffs 13.77 boss-held" + "emits the DEF ▼2.71% boss debuff". The engine's enemy-buff path admits ONLY damageTakenPct/distributedDamagePct (sim.ts ~line 2087-2107: "other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0"); enemy ATK▼/DEF▼ emit NO buffApply event under ANY encoding — the blind author's own override would also emit 0 events. Driver carries these lines VERBATIM in `unmodeled`. The blind author's own two SKIPPED tests ("DEF ▼ magnitude is unobservable in v1", "10-enemy target count unobservable") corroborate.
- ENCODING-SHAPE (2): "grants atkPct 28 to SELF with maxStacks 5" + "count tracks her shots". Blind encodes Collect Hacking Code as an atkPct-28 maxStacks-5 durationSec-5 shotFired buff; driver encodes it as a declared resource pool + passive perResource atkPct (live stacks×28%, smooth ramp). Semantically both = "ATK ▲28% per stack to 5"; the event SHAPES differ, so the blind event-shape assertions find nothing. Driver test pins the ramp behaviourally (magazine-0 baseAtk rises for six pulls, 2.4× ratio, plateau after).
- BROKEN COUNTERFACTUAL SHAPE (3): "is DAMAGE-RELEVANT", "materially moves exia's own damage", "Damage Taken lifts TEAMMATES". The blind patches mutate `ov[slot].blocks` — but OverrideFile slots are FLAT ARRAYS (`ov.skill1` IS the block list), so `s.blocks = ...` writes a stray property the engine never reads; every such counterfactual is a NO-OP, cf ≡ base, strict-inequality assertions fail on equality. The driver's correctly-shaped patches prove the same discriminations GREEN (reload removed → fewer shots; damageTaken removed → team total falls; stacks removed → ramp/gates die).
- FIXTURE CONTAMINATION (4): "applies +95 to SELF only" (assertion hits LITER's own reloadSpeedPct line — no caster filter), "casterAtkPct FLAT-RESOLVED maxStacks 5" (hits CROWN's casterAtkPct 64.51 maxStacks-1 grant — expected 1 to be 5), "targets ELECTRIC allies only" (crown's recipients inflate the set to 4), "no ROUND-count duration" (266 events — HELM's burst chargeDamageMultPct durationShots 10; helm is in the blind fixture, no caster filter).
- FIXTURE DYNAMICS (2): blind fixture = controlComp('exia', true) = liter(B1)/crown/exia(B1)/helm — TWO Burst I units. "keys to fullBurstEnter not burstCast": got 12 FB-entry applications vs expected 5 (exia's casts — halved because liter contests the B1 slot); the test NAME endorses fullBurstEnter keying, which IS the driver's trigger; the expected count is inconsistent with the named trigger in a two-B1 comp. "rider is MAX-STACK gated": in the blind comp exia's first cast lands ~24s (liter casts first), AFTER stacks max at 6.58s — so every exia cast is post-max and the gate-closure the test hunts for cannot appear; in the driver fixture (exia sole B1) the opener casts at 4.37s PRE-max, and the driver test asserts exactly one single-hit cast (the opener) + two hits on every later cast.

```typescript
// S5 BLIND TEST SOURCE (path-fixed import only)

import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed 2026-07-27: blind/ sits under kit-autonomy/, not tests/units/

/**
 * exia — Exia (SR / Electric / Supporter / Burst I)
 * Base: cd 20s, ammo 6, reloadFrames 141, chargeFrames 60, hitsPerShot 1,
 *       normalAttackMultiplier 69.04, coreAttackMultiplier 200.
 *
 * BLIND spec test: written from the kit prose alone (S5 post-op), against the
 * shipped override. Every group states what the kit says, what the assertion
 * proves, and the NEAREST-WRONG model it must go RED under.
 *
 * KIT (verbatim structure, quoted short):
 *  skill1 block A — "Activates when the last bullet hits the target. Affects the
 *    target if the skill user is in Collect Hacking Code." → ATK ▼13.77% 5s,
 *    DEF ▼13.77% 5s.
 *  skill1 block B — "Activates when entering Full Burst. Affects self."
 *    → "Reload speed is fixed at a 95% increase for 10 sec."
 *  skill2 block A — "Activates when landing an attack with Full Charge. Affects
 *    self." → Collect Hacking Code: ATK ▲28%, up to 5 stacks, 5 sec.
 *  skill2 block B — "When the last round of ammunition hits, affects all Electric
 *    Code ally unit(s) if the skill user is in Collect Hacking Code."
 *    → ATK ▲5.8% of the skill user's ATK, up to 5 stacks, 15 sec.
 *  burst block A — "Affects the 10 enemy unit(s) with the highest final DEF."
 *    → 122.32% of final ATK as damage; DEF ▼2.71% 5s.
 *  burst block B — "Activates when Collect Hacking Code is at max stacks.
 *    Affects the same target(s)." → 122.32% of final ATK as ADDITIONAL damage;
 *    Damage Taken ▲18.04% 10s.
 *
 * FIXTURE: controlComp('exia', true) — liter B1 / crown B2 / exia / helm B3.
 *   Exia is Burst I, so she needs a B2+B3 chain for Full Bursts to happen at all;
 *   controlComp supplies them. The fixed B3 (helm) is KEPT because the two
 *   load-bearing team-facing effects here are an ENEMY debuff (damageTakenPct,
 *   casterIdx===null/targetIdx===null) and an ELECTRIC-only ally grant — neither
 *   is confounded by helm's ally buffs, and helm's presence gives a second
 *   non-Electric ally to prove the element filter EXCLUDES someone (non-vacuity).
 *
 * The 4 questions, answered from the prose:
 *  - Scope: every stat line here is unscoped (generic ATK/DEF/Damage Taken); no
 *    "normal attacks" qualifier anywhere → generic stats, NOT critRateNormalPct-
 *    style scoped variants.
 *  - Duration semantics: all wall-clock seconds (5 / 10 / 15 sec). NO "for N
 *    round(s)" line exists → durationShots must NOT appear anywhere in this kit.
 *  - Trigger identity: last-bullet (skill1 A, skill2 B), fullBurstEnter (skill1 B,
 *    literally "when entering Full Burst" — team-wide, NOT burstCast), full-charge
 *    (skill2 A), burstCast (both burst blocks).
 *  - Target set: enemy (skill1 A debuffs, burst debuffs), self (skill1 B, skill2 A),
 *    Electric allies (skill2 B).
 */

const SLUG = 'exia';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: ReturnType<typeof controlComp>) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  } as typeof opts);
  return { res, events };
}

function buffs(events: Ev[], stat: string) {
  return events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
}

// ── hoisted runs (each is a full 180s sim) ───────────────────────────────────

const base = run(controlComp(SLUG, true));
const baseTotals = totals(base.res);

describe('exia — skill1 block A: last-bullet enemy ATK▼/DEF▼ 13.77% for 5s', () => {
  it('emits BOTH debuffs at 13.77 with 5s duration, boss-held (caster/target null)', () => {
    const atkDown = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        Math.abs(Number(e.value) - -13.77) < 1e-6
    );
    const defDown = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        e.stat === 'defPct' &&
        Math.abs(Number(e.value) - -13.77) < 1e-6
    );
    // At least one of the pair must be present as a boss-held debuff. The DEF▼
    // half is v1-inert on damage (boss DEF handling), but it must still be
    // ENCODED — a model that silently drops it goes RED here.
    expect(atkDown.length + defDown.length).toBeGreaterThan(0);
  });

  it('fires on LAST-BULLET cadence, not per-shot (discriminates trigger identity)', () => {
    const shots = base.events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG
    ).length;
    const bossDebuffs = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        Math.abs(Number(e.value) - -13.77) < 1e-6
    ).length;
    // Magazine is 6. A lastBullet trigger fires ~once per 6 shots; a shotFired
    // model (the nearest-wrong) would fire ~once per shot. Assert the count is
    // strictly and substantially below the shot count.
    expect(shots).toBeGreaterThan(6);
    expect(bossDebuffs).toBeLessThan(shots / 2);
  });

  it('is GATED on Collect Hacking Code — removing the gate changes fire count', () => {
    // The kit conditions this block on "if the skill user is in Collect Hacking
    // Code". Nearest-wrong: an ungated lastBullet block. Counterfactual: strip
    // skill2's stack-granting block so the gate can never be satisfied; the
    // 13.77 debuff stream must then SHRINK (ideally to zero).
    const noStacks = withPatchedOverride(SLUG, (ov) => {
      ov.skill2!.blocks = [];
    });
    const cf = run({
      ...controlComp(SLUG, true),
      overrides: { [SLUG]: noStacks },
    });
    const count = (evs: Ev[]) =>
      evs.filter(
        (e) =>
          e.kind === 'buffApply' &&
          e.casterIdx === null &&
          e.targetIdx === null &&
          Math.abs(Number(e.value) - -13.77) < 1e-6
      ).length;
    expect(count(cf.events)).toBeLessThanOrEqual(count(base.events));
  });
});

describe('exia — skill1 block B: FULL-BURST-ENTER self reload speed +95% for 10s', () => {
  it('keys to fullBurstEnter (team-wide), not burstCast (own-burst only)', () => {
    const fbStarts = base.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const reloadBuffs = buffs(base.events, 'reloadSpeedPct').filter(
      (e) => e.targetSlug === SLUG
    );
    // "Activates when entering Full Burst" is literal: one application per Full
    // Burst the TEAM enters. Nearest-wrong: keying it to exia's own burstCast —
    // she is Burst I and casts every rotation here, so the discriminator is the
    // 1:1 tie to fullBurstStart specifically.
    expect(fbStarts).toBeGreaterThan(0);
    expect(reloadBuffs.length).toBe(fbStarts);
  });

  it('applies +95 for 10s to SELF only (no ally leakage)', () => {
    const reloadBuffs = buffs(base.events, 'reloadSpeedPct');
    expect(reloadBuffs.length).toBeGreaterThan(0);
    for (const e of reloadBuffs) {
      expect(e.targetSlug).toBe(SLUG);
      expect(Number(e.value)).toBeCloseTo(95, 6);
      expect(e.durationShots).toBeUndefined(); // seconds, never rounds
    }
  });

  it('is DAMAGE-RELEVANT — reload speed gates shots fired (not a defensive skip)', () => {
    // Weapon-state modifiers are damage. Nearest-wrong: "reload speed is
    // defensive, skip it". Counterfactual: delete the reload buff → exia fires
    // strictly fewer shots over 180s, so her own total must fall.
    const noReload = withPatchedOverride(SLUG, (ov) => {
      for (const slot of ['skill1', 'skill2', 'burst'] as const) {
        const s = ov[slot];
        if (!s) continue;
        s.blocks = s.blocks.map((b) => ({
          ...b,
          effects: b.effects.filter(
            (fx) => !(fx.kind === 'buff' && fx.stat === 'reloadSpeedPct')
          ),
        }));
      }
    });
    const cf = run({
      ...controlComp(SLUG, true),
      overrides: { [SLUG]: noReload },
    });
    const cfShots = cf.events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG
    ).length;
    const baseShots = base.events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG
    ).length;
    expect(baseShots).toBeGreaterThan(cfShots);
    expect(baseTotals[SLUG]).toBeGreaterThan(totals(cf.res)[SLUG]);
  });
});

describe('exia — skill2 block A: Collect Hacking Code, ATK ▲28% ×5 for 5s on FULL CHARGE', () => {
  it('grants atkPct 28 to SELF with maxStacks 5, seconds-duration', () => {
    const s = buffs(base.events, 'atkPct').filter((e) => e.targetSlug === SLUG);
    expect(s.length).toBeGreaterThan(0);
    const hit = s.filter((e) => Math.abs(Number(e.value) - 28) < 1e-6);
    expect(hit.length).toBeGreaterThan(0);
    for (const e of hit) {
      expect(Number(e.maxStacks)).toBe(5);
      expect(e.durationShots).toBeUndefined(); // 5 SEC, not 5 rounds
    }
  });

  it("fires on exia's own charge shots — count tracks her shots, not team bursts", () => {
    const stackApplies = buffs(base.events, 'atkPct').filter(
      (e) => e.targetSlug === SLUG && Math.abs(Number(e.value) - 28) < 1e-6
    ).length;
    const fbStarts = base.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    // Nearest-wrong: keying "landing an attack with Full Charge" to a burst/FB
    // trigger. Exia is a charge SR firing all fight; her stack applications must
    // vastly outnumber Full Bursts.
    expect(stackApplies).toBeGreaterThan(fbStarts * 2);
  });

  it("materially moves exia's own damage (non-vacuous gate)", () => {
    const noCode = withPatchedOverride(SLUG, (ov) => {
      const s = ov.skill2;
      if (!s) return;
      s.blocks = s.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter(
          (fx) =>
            !(
              fx.kind === 'buff' &&
              fx.stat === 'atkPct' &&
              Math.abs(fx.value - 28) < 1e-6
            )
        ),
      }));
    });
    const cf = run({
      ...controlComp(SLUG, true),
      overrides: { [SLUG]: noCode },
    });
    expect(baseTotals[SLUG]).toBeGreaterThan(totals(cf.res)[SLUG]);
  });
});

describe('exia — skill2 block B: last-round ATK ▲5.8% of caster ATK to ELECTRIC allies, ×5, 15s', () => {
  it('emits casterAtkPct FLAT-RESOLVED (not the raw 5.8) with maxStacks 5', () => {
    const grants = buffs(base.events, 'casterAtkPct');
    expect(grants.length).toBeGreaterThan(0);
    for (const e of grants) {
      expect(Number(e.maxStacks)).toBe(5);
      // caster-scaled values re-emit as a flat ATK number — a model that emits
      // the literal 5.8 percentage is the nearest-wrong and goes RED here.
      expect(Number(e.value)).toBeGreaterThan(100);
      expect(e.durationShots).toBeUndefined(); // 15 SEC
    }
  });

  it('targets ELECTRIC allies only — a non-Electric teammate is NOT a recipient (non-vacuity both ways)', () => {
    const recipients = new Set(
      buffs(base.events, 'casterAtkPct').map((e) => String(e.targetSlug))
    );
    // At least one recipient exists (exia is Electric and "all Electric Code ally
    // unit(s)" includes self), and the recipient set is a STRICT subset of the
    // comp — proving the element filter excludes somebody. Nearest-wrong: an
    // untyped {kind:'allies'} target, which would list every slot.
    expect(recipients.size).toBeGreaterThan(0);
    const compSlugs = new Set(Object.keys(baseTotals));
    expect(recipients.size).toBeLessThan(compSlugs.size);
  });

  it('fires on LAST-ROUND cadence, gated on Collect Hacking Code', () => {
    const shots = base.events.filter(
      (e) => e.kind === 'shot' && e.slug === SLUG
    ).length;
    const grants = buffs(base.events, 'casterAtkPct').length;
    // Magazine 6 → last-round frequency is a small fraction of shots even after
    // multiplying by the recipient count. Nearest-wrong shotFired would explode.
    expect(grants).toBeLessThan(shots * 2);
  });
});

describe('exia — burst block A: 122.32% of final ATK + DEF ▼2.71% for 5s', () => {
  it('casts a burst and books burst-bucket damage for exia', () => {
    const casts = base.events.filter(
      (e) => e.kind === 'burstCast' && e.slug === SLUG
    ).length;
    expect(casts).toBeGreaterThan(0);
    const row = unitOf(base.res, SLUG);
    expect(row.totalDamage).toBeGreaterThan(0);
  });

  it('burst damage is FB-EXEMPT (a burst cast lands before the FB window opens)', () => {
    const burstHits = base.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst' && e.slug === SLUG
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const e of burstHits) {
      expect(e.fbMajorApplied).toBeFalsy();
    }
  });

  it('emits the DEF ▼2.71% boss debuff', () => {
    const defDown = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === null &&
        e.targetIdx === null &&
        Math.abs(Number(e.value) - -2.71) < 1e-6
    );
    expect(defDown.length).toBeGreaterThan(0);
  });
});

describe('exia — burst block B: max-stack rider — extra 122.32% + Damage Taken ▲18.04% for 10s', () => {
  it('Damage Taken ▲18.04 is a BOSS debuff (team-wide), not a self buff', () => {
    const dt = buffs(base.events, 'damageTakenPct');
    expect(dt.length).toBeGreaterThan(0);
    for (const e of dt) {
      expect(Number(e.value)).toBeCloseTo(18.04, 6);
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it('the Damage Taken debuff lifts TEAMMATES too (proves it is not self-scoped)', () => {
    const noDt = withPatchedOverride(SLUG, (ov) => {
      const s = ov.burst;
      if (!s) return;
      s.blocks = s.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter(
          (fx) => !(fx.kind === 'buff' && fx.stat === 'damageTakenPct')
        ),
      }));
    });
    const cf = run({ ...controlComp(SLUG, true), overrides: { [SLUG]: noDt } });
    const cfTotals = totals(cf.res);
    const allies = Object.keys(baseTotals).filter((s) => s !== SLUG);
    // Nearest-wrong: modeling "Damage Taken ▲" as a self buff. Under that model
    // removing it would leave allies byte-identical; here at least one ally must
    // strictly drop.
    expect(allies.some((s) => baseTotals[s] > cfTotals[s])).toBe(true);
  });

  it('the rider is MAX-STACK gated — it must not fire on every burst unconditionally', () => {
    const casts = base.events.filter(
      (e) => e.kind === 'burstCast' && e.slug === SLUG
    ).length;
    const dt = buffs(base.events, 'damageTakenPct').length;
    // Gated: applications ≤ casts. Nearest-wrong (ungated rider) also satisfies
    // ≤, so the discriminating half is the counterfactual below: with the stack
    // source removed the rider must go SILENT.
    expect(dt).toBeLessThanOrEqual(casts);

    const noStacks = withPatchedOverride(SLUG, (ov) => {
      const s = ov.skill2;
      if (!s) return;
      s.blocks = s.blocks.map((b) => ({
        ...b,
        effects: b.effects.filter(
          (fx) =>
            !(
              fx.kind === 'buff' &&
              fx.stat === 'atkPct' &&
              Math.abs(fx.value - 28) < 1e-6
            )
        ),
      }));
    });
    const cf = run({
      ...controlComp(SLUG, true),
      overrides: { [SLUG]: noStacks },
    });
    expect(buffs(cf.events, 'damageTakenPct').length).toBeLessThan(dt);
  });
});

describe('exia — cross-cutting invariants', () => {
  it('no kit line uses ROUND-count duration (all durations are wall-clock seconds)', () => {
    const withShots = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug === SLUG &&
        e.durationShots !== undefined
    );
    expect(withShots.length).toBe(0);
  });

  it('exia carries no Pierce (kit text has no Pierce line)', () => {
    const pierceEvents = base.events.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'pierceDamagePct'
    );
    expect(pierceEvents.length).toBe(0);
  });

  it.skip('DEF ▼ magnitude is unobservable in v1 — boss DEF handling makes the 13.77/2.71 DEF halves damage-inert (GAP: encoded but unassertable end-to-end)', () => {});

  it.skip('"10 enemy unit(s) with the highest final DEF" target-count is unobservable — the scope-lock boss is a single partless target (GAP: no multi-enemy primitive)', () => {});
});
```

## 6. S6 BLIND OVERRIDE (claude-opus-5) + DIFF vs DRIVER

```json
{
  "slug": "exia",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": 95,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 28,
          "durationSec": 5,
          "maxStacks": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Electric"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 5.8,
          "durationSec": 15,
          "maxStacks": 5
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
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 122.32
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
          "atkPct": 122.32
        },
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 18.04,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates when the last bullet hits the target. Affects the target if the skill user is in Collect Hacking Code.",
      "ATK ▼ 13.77% for 5 sec.",
      "DEF ▼ 13.77% for 5 sec."
    ],
    "skill2": [],
    "burst": ["DEF ▼ 2.71% for 5 sec."]
  },
  "caveats": [
    "⚑ Enemy DEF ▼ (skill1 13.77%, burst 2.71%) has NO StatKey — the schema's defPct is self-DEF (inert in v1) and there is no boss-DEF-reduction channel. Both are REAL damage levers against the boss-DEF subtraction and are currently dropped, so the model is BIASED LOW on every comp she is in. Enemy ATK ▼ 13.77% is genuinely inert (boss deals no modeled damage).",
    "⚑ skill1 reload line is a stat CLAMP (\"fixed at a 95% increase\"), modeled as an additive reloadSpeedPct buff. Identical while Exia is the only reload source; DIVERGES (over-credits) the moment a teammate also buffs her reload, because a clamp would pin the total at +95% rather than stack.",
    "⚑ burst block 2 (the 122.32% additional hit + Damage Taken ▲ 18.04%) is authored UNGATED. Its kit gate is \"Collect Hacking Code at max stacks\" (5), and the engine has no per-buff-stack gate primitive; a monotonic resourceGate would be permanently true after 5 shots and merely hide the assumption. Whether she is at 5/5 at the cast frame is genuinely uncertain — see flags. If she is not, this over-credits a 122.32% nuke AND a team-wide 18.04% Damage Taken debuff.",
    "burst flatDamage leaves crit unset (rider crit-eligibility is engine-global, RIDERCRIT) and noFb unset (per-kit noFb is measured-only; burst-cast damage is engine-handled FB-exempt — it lands before the Full Burst window opens).",
    "noRange is engine-automatic and deliberately not set anywhere."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Exia (exia) SR/Electric/Supporter/Burst I, ammo 6, chargeFrames 60, reloadFrames 141. Modeled: (skill1) FB-enter self reload-speed window; (skill2) self stacking ATK ▲28%×5 off full-charge shots, and a last-bullet caster-ATK-scaled ATK grant to all Electric allies (self included — Exia is Electric); (burst) a burst-cast 122.32% hit plus the max-stack branch's second 122.32% hit and the team-wide Damage Taken ▲18.04% boss debuff. Her offensive value is almost entirely SUPPORT — the casterAtkPct grant and the Damage Taken debuff — so her own damage total is a poor validation signal; grade her on the Electric allies' deltas and on the 10s Damage-Taken window. Deliberately unmodeled: both enemy DEF ▼ lines (no schema channel) and the enemy ATK ▼ (inert). The \"if the skill user is in Collect Hacking Code\" gate on the skill2 last-bullet grant is treated as always satisfied (a charge weapon full-charges every shot, so 1+ stack is live by the 6th round); the burst's max-stack gate is NOT safely assumable and is flagged."
}
```

```
BLIND (s6, opus) blocks:
  skill1 | trig={"kind": "fullBurstEnter"} tgt={"kind": "self"} gate=null | buff:reloadSpeedPct=95/10s
  skill2 | trig={"kind": "shotFired"} tgt={"kind": "self"} gate=null | buff:atkPct=28/5s/maxStacks5
  skill2 | trig={"kind": "lastBullet"} tgt={"kind": "alliesOfElement", "element": "Electric"} gate=null | buff:casterAtkPct=5.8/15s/maxStacks5
  burst | trig={"kind": "burstCast"} tgt={"kind": "enemy"} gate=null | flatDamage:=122.32
  burst | trig={"kind": "burstCast"} tgt={"kind": "enemy"} gate=null | flatDamage:=122.32;buff:damageTakenPct=18.04/10s

DRIVER blocks:
  skill1 | trig={"kind": "fullBurstEnter"} tgt={"kind": "self"} gate=null | buff:reloadSpeedPct=95/10s
  skill2 | trig={"kind": "shotFired"} tgt={"kind": "self"} gate=null | resource:hackingCode=1
  skill2 | trig={"kind": "passive"} tgt={"kind": "self"} gate=null | buff:atkPct=0/perResource{'name': 'hackingCode', 'mult': 28}
  skill2 | trig={"kind": "lastBullet"} tgt={"kind": "alliesOfElement", "element": "Electric"} gate={"name": "hackingCode", "min": 1} | buff:casterAtkPct=5.8/15s/maxStacks5
  burst | trig={"kind": "burstCast"} tgt={"kind": "enemy"} gate=null | flatDamage:=122.32
  burst | trig={"kind": "burstCast"} tgt={"kind": "enemy"} gate={"name": "hackingCode", "min": 5} | flatDamage:=122.32
  burst | trig={"kind": "burstCast"} tgt={"kind": "enemy"} gate={"name": "hackingCode", "min": 5} | buff:damageTakenPct=18.04/10s

BLIND resources: null
DRIVER resources: [{"name": "hackingCode", "initial": 0, "min": 0, "max": 5}]
BLIND unmodeled: {"skill1": ["Activates when the last bullet hits the target. Affects the target if the skill user is in Collect Hacking Code.", "ATK \u25bc 13.77% for 5 sec.", "DEF \u25bc 13.77% for 5 sec."], "skill2": [], "burst": ["DEF \u25bc 2.71% for 5 sec."]}
DRIVER unmodeled: {"skill1": ["\u25a0 Activates when the last bullet hits the target. Affects the target if the skill user is in Collect Hacking Code. ATK \u25bc 13.77% for 5 sec. \u2014 no sim channel: the enemy-buff path admits only damageTakenPct/distributedDamagePct and the boss deals no damage, so an enemy ATK\u25bc moves nothing (sim.ts, DEF=0 basis)", "DEF \u25bc 13.77% for 5 sec. \u2014 no sim channel: enemy DEF\u25bc is dropped at dispatch on the DEF=0 basis (sim.ts 'other enemy debuffs (ATK\u25bc, DEF\u25bc) don't affect our damage with DEF=0')"], "skill2": [], "burst": ["DEF \u25bc 2.71% for 5 sec. \u2014 no sim channel: enemy DEF\u25bc is dropped at dispatch on the DEF=0 basis (same as the skill1 DEF\u25bc line)"]}
```

## 7. DRIVER IMPLEMENTATION

```typescript
// scripts/tests/units/exia.test.ts (17/17 GREEN vs driver override)

// PER-UNIT KIT SPEC — `exia` (Exia (Treasure), Supporter/SR/Electric, Burst I, cd 20s, ammo 6,
// chargeFrames 60). Kit-autonomy gauntlet 2026-07-27; test-first (TDD transition step 3).
//
// FROM-SCRATCH UNIT: exia had NO override on disk before this gauntlet (simSupported:false), so
// there is no "shipped" encoding to go RED against — every kit line is NEW. The suite asserts
// GREEN against the new encoding (src/skills/overrides/exia.json, landed at S3) and RED against
// the nearest-wrong COUNTERFACTUALS built with `withPatchedOverride` — a test that still passes
// under the nearest wrong model gates nothing.
//
// Kit (blablalink prose, data/characters.json → characters.exia.skills — the TREASURE text; the
// datamined skill1/skill2 detail templates in role.skillDetails are the untreasured base kit and
// DISAGREE with the treasure prose on trigger/value/duration, exactly like helm's favorite-item
// sync. Ground truth = the top-level prose):
//   S1 ■ last bullet hits the target, IF the skill user is in Collect Hacking Code → the target:
//        ATK ▼ 13.77% for 5 sec                                                    [X1 UNMODELED]
//        DEF ▼ 13.77% for 5 sec                                                    [X2 UNMODELED]
//      ■ entering Full Burst → self: Reload speed FIXED at 95% increase for 10 sec [X3]
//   S2 ■ landing a Full Charge attack → self: Collect Hacking Code:
//        ATK ▲ 28%, stacks up to 5 times, 5 sec                                    [X4]
//      ■ last round hits, IF the skill user is in Collect Hacking Code →
//        all Electric Code ally units: ATK ▲ 5.8% of the skill user's ATK,
//        stacks up to 5 times, 15 sec                                              [X5]
//   BU ■ the 10 enemies with the highest final DEF: 122.32% of final ATK as damage [X6]
//        DEF ▼ 2.71% for 5 sec                                                     [X7 UNMODELED]
//      ■ Collect Hacking Code at MAX stacks → same targets:
//        122.32% of final ATK as additional damage                                 [X8]
//        Damage Taken ▲ 18.04% for 10 sec                                          [X9]
//
// X1/X2/X7 are UNMODELED by design, not dropped: the sim runs on a DEF=0 enemy basis and the
// engine's enemy-buff channel admits ONLY damageTakenPct/distributedDamagePct — enemy ATK▼/DEF▼
// are dropped at dispatch (sim.ts "other enemy debuffs (ATK▼, DEF▼) don't affect our damage with
// DEF=0"). They live VERBATIM in the override's `unmodeled` field (the no-silent-drops record)
// and carry no assertion here.
//
// Encoding under test (src/skills/overrides/exia.json):
//   - Collect Hacking Code is a declared RESOURCE POOL `hackingCode` [0..5]: +1 per shotFired
//     (SR = one full charge per pull — helm/liberalio precedent), clamped at 5.
//   - X4 = passive self atkPct buff with perResource {hackingCode, mult:28} — LIVE stacks×28%,
//     so the ramp is observable shot-by-shot (magazine 0 rises for 6 pulls, then plateaus).
//   - X5 = lastBullet → alliesOfElement Electric (self-inclusive: the kit says "ally unit(s)",
//     never "except self"), resourceGate {min:1} ("in Collect Hacking Code"), casterAtkPct 5.8
//     maxStacks 5 / 15s.
//   - X8/X9 = burstCast blocks under resourceGate {min:5} ("at max stacks").
//
// Why each assertion discriminates:
//   X3  a removed-block run must leave her reload gaps untouched — proven behaviourally by the
//       shot COUNT (faster reloads → more pulls in 180s). "Fixed at" clamp semantics are NOT
//       encoded (additive buff); inert here — no other reload buffer in the fixture (⚑).
//   X4  the ramp is the discriminator: an INSTANT-MAX counterfactual (+140% from shot 1) and a
//       NO-STACKS counterfactual (+0% forever) both produce a FLAT magazine-0 baseAtk sequence;
//       only the live perResource pool rises for six pulls and then holds. baseAtk (ATK after
//       the flat boss-DEF subtraction) is read, not amount, so the FB +50% major / Damage Taken
//       windows (Damage-Up / Taken buckets) cannot contaminate the ramp. The 2.4× shot-6/shot-1
//       ratio pins the 28%×5 magnitude. The pool's missing 5-sec per-stack DECAY is ⚑: at her
//       1.37s fire cadence a stack never lapses before the next refresh, so the steady state
//       (permanent max after 6 pulls) is identical to duration-refresh semantics; diverges only
//       if she stops firing >5s, which never occurs in continuous combat.
//   X5  the scope is the discriminator: an all-allies counterfactual must reach crown (Iron) and
//       helm (Water); shipped reaches ONLY exia + ada (the two Electric allies). The gate is the
//       other: NO-STACKS never opens resourceGate{min:1} → zero applications. The asserted VALUE
//       is the flat-resolved grant (0.058×exia staticAtk per stack): casterAtkPct resolves
//       against the caster's static ATK at apply time, so the raw 5.8 never appears in the log.
//   X6  both burst hits share the 122.32 magnitude; the cast lands BEFORE the FB window opens,
//       so neither takes the +50% major (verified fact, 2026-07-13; helm H7 precedent).
//   X8  the gate is the discriminator, and the fixture's opener makes it VISIBLE: pulls 1-5 land
//       at 1.12/2.48/3.85/5.22/6.58s (stacks max at 6.58s) but the focused-SR opener casts at
//       4.37s — so shipped lands ONE hit on the opener (gate closed) and TWO on every later cast
//       (gate open), and NO-STACKS lands ONE on all. A gate keyed to ≥1 stack — or an ungated
//       rider — would double the opener too and fail the first assertion.
//   X9  gated like X8 (same ■ block): one boss debuff per POST-max cast (casts−1 in the fixture),
//       10s window; enemy buffs log with null caster/target indices, so ownership is read off the
//       event key's caster-slot prefix. Proven load-bearing by the team TOTAL delta vs the
//       block-removed run (~18% × ~50% uptime is not small).
//
// Fixture: exia (B1) / crown (B2) / ada (B3) / helm (B3), boss Fire, focus exia (focused SR
// sustains her 20s burst CD). liter is ABSENT — she is also Burst I and would contest the chain
// opener. ada + helm are the Electric/Water B3 pair; only ada is Electric, which is what makes
// the X5 scope check non-trivial (two receivers, two non-Electric non-receivers). Crown's own
// S1 casterAtkPct ATK share is ISOLATED OUT of every run (crownNoShare): it lands on exia
// mid-magazine-0 and would mask the X4 ramp (helm H8 isolation precedent). Deterministic
// (no seed → expected-value pass; per-shot baseAtk is smooth, no crit noise).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Slot order: exia 0 / crown 1 / ada 2 / helm 3. */
const EXIA = 0;
const CROWN = 1;
const ADA = 2;
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['exia', 'crown', 'ada', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'exia',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** NO-STACKS: the resource pool never accrues. Kills X4's ramp (perResource reads 0 forever),
 *  and the min:1 / min:5 gates (X5, X8, X9) never open. The nearest wrong model for every
 *  gate/ramp assertion: a Collect Hacking Code that never collects. */
const exiaNoStacks = withPatchedOverride('exia', (ov) => {
  let removed = 0;
  for (const k of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[k]) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.kind !== 'resource');
      removed += before - b.effects.length;
    }
    ov[k] = ov[k].filter((b: any) => b.effects.length > 0);
  }
  if (!removed) {
    throw new Error(
      'exia hackingCode resource effect missing — fixture is stale'
    );
  }
});

/** INSTANT-MAX: X4 as a flat always-on +140% (no ramp). The nearest wrong model for the
 *  stack-ramp assertion — the steady state is right, the opening seconds are not. */
const exiaInstantMax = withPatchedOverride('exia', (ov) => {
  const block = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.perResource)
  );
  if (!block) {
    throw new Error('exia perResource ATK block missing — fixture is stale');
  }
  block.effects = [{ kind: 'buff', stat: 'atkPct', value: 140 }];
});

/** ALL-ALLIES: X5 un-scoped. The nearest wrong model for the Electric-only scope assertion. */
const exiaAllAllies = withPatchedOverride('exia', (ov) => {
  const block = ov.skill2.find((b: any) => hasStat(b, 'casterAtkPct'));
  if (!block) {
    throw new Error('exia casterAtkPct block missing — fixture is stale');
  }
  block.target = { kind: 'allies' };
});

/** X3 removed: no FB-entry reload buff. */
const exiaNoReload = withPatchedOverride('exia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'reloadSpeedPct'));
  if (ov.skill1.length === before) {
    throw new Error('exia reloadSpeedPct block missing — fixture is stale');
  }
});

/** X9 removed: no Damage Taken window. */
const exiaNoTaken = withPatchedOverride('exia', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'damageTakenPct'));
  if (ov.burst.length === before) {
    throw new Error('exia damageTakenPct block missing — fixture is stale');
  }
});

/** ISOLATION (runs in EVERY run, like helm's crownNoHeal): crown's S1 grants a
 *  casterAtkPct ATK share (64.51% of crown's ATK) that lands on exia mid-magazine-0 and would
 *  mask the X4 ramp — a flat +51.8k step between pulls 4 and 5 dwarfs the 28%-of-~99.7k ramp
 *  increments. Removing crown's casterAtkPct effect leaves exia's OWN ATK movement (the
 *  hackingCode ramp + her Electric-ally share) as the only thing moving her baseAtk. Damage-only
 *  — gauge is per-shot, so cast/FB timing is untouched. */
const crownNoShare = withPatchedOverride('crown', (ov) => {
  let removed = 0;
  for (const k of ['skill1', 'skill2', 'burst'] as const) {
    for (const b of ov[k]) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.stat !== 'casterAtkPct');
      removed += before - b.effects.length;
    }
    ov[k] = ov[k].filter((b: any) => b.effects.length > 0);
  }
  if (!removed) {
    throw new Error('crown casterAtkPct block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s EV sim; crown's ATK share isolated out of all) --------
const base = run({ crown: crownNoShare });
const noStacks = run({ exia: exiaNoStacks, crown: crownNoShare });
const instantMax = run({ exia: exiaInstantMax, crown: crownNoShare });
const allAllies = run({ exia: exiaAllAllies, crown: crownNoShare });
const noReload = run({ exia: exiaNoReload, crown: crownNoShare });
const noTaken = run({ exia: exiaNoTaken, crown: crownNoShare });

/** exia's static ATK on the scope-lock basis — casterAtkPct buffs flat-resolve against it at
 *  apply time (sim.ts `(e.value/100)×owner.staticAtk`), so the emitted buffApply value is
 *  0.058×staticAtk per stack, NOT the kit percentage. Same float expression ⇒ bit-identical. */
const EXIA_STATIC_ATK = (() => {
  const u = base.res.units.find((x) => x.slug === 'exia');
  if (!u) {
    throw new Error('exia missing from her own fixture');
  }
  return u.staticAtk;
})();
const SHARE_PER_STACK = (5.8 / 100) * EXIA_STATIC_ATK;

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const exiaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'exia');
const exiaNormalDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'exia' && d.bucket === 'normal');
const exiaBurstDmg = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'exia' && d.bucket === 'burst');
const exiaCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'exia'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');

describe('exia (Treasure) — kit spec', () => {
  describe('fixture health — she bursts, and Full Bursts happen', () => {
    it('exia casts her burst and chains complete, repeatedly', () => {
      expect(exiaCasts(base.events).length).toBeGreaterThanOrEqual(4);
      expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(4);
      expect(exiaShots(base.events).length).toBeGreaterThan(60);
    });

    it('one normal-bucket damage instance per SR pull (the zip basis)', () => {
      expect(exiaNormalDmg(base.events).length).toBe(
        exiaShots(base.events).length
      );
    });
  });

  describe('X3 — S1 FB-entry reload speed is 95% for 10s, self-only', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EXIA && b.stat === 'reloadSpeedPct'
    );

    it('fires once per Full Burst, at the kit magnitude, on herself, for 10s', () => {
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([95]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([EXIA]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is load-bearing: removing it costs her shots across the fight', () => {
      expect(exiaShots(base.events).length).toBeGreaterThan(
        exiaShots(noReload.events).length
      );
    });
  });

  describe('X4 — S2 Collect Hacking Code ramps self ATK +28% per stack to 5', () => {
    // baseAtk (ATK after the flat boss-DEF subtraction), NOT amount: the FB major and the
    // Damage Taken window live in other buckets and must not contaminate the ramp read.
    const mag0Base = exiaNormalDmg(base.events)
      .slice(0, 6)
      .map((d) => d.baseAtk);

    it('rises for six pulls (stacks 0→5), then plateaus within the next magazine', () => {
      for (let k = 1; k < 6; k++) {
        expect(
          mag0Base[k],
          `pull ${k + 1} baseAtk ${mag0Base[k]} did not exceed pull ${k} baseAtk ${mag0Base[k - 1]}`
        ).toBeGreaterThan(mag0Base[k - 1]);
      }
      const shots = exiaShots(base.events);
      const normals = exiaNormalDmg(base.events);
      const mag1 = shots
        .map((s, i) => (s.magIndex === 1 ? normals[i].baseAtk : null))
        .filter((v): v is number => v != null);
      expect(mag1.length).toBeGreaterThanOrEqual(6);
      expect(
        new Set(mag1.map((v) => v.toFixed(6))).size,
        'magazine-1 pulls must all sit at the capped stack value'
      ).toBe(1);
    });

    it('the shot-6/shot-1 ratio is 2.4 (28% × 5 stacks)', () => {
      const ratio = mag0Base[5] / mag0Base[0];
      expect(ratio).toBeGreaterThan(2.35);
      expect(ratio).toBeLessThan(2.45);
    });

    it('DISCRIMINATING: instant-max and no-stacks models produce a FLAT magazine 0', () => {
      const flat = (evs: SimEvent[]) =>
        new Set(
          exiaNormalDmg(evs)
            .slice(0, 6)
            .map((d) => d.baseAtk.toFixed(6))
        ).size;
      expect(flat(instantMax.events)).toBe(1);
      expect(flat(noStacks.events)).toBe(1);
      expect(flat(base.events)).toBe(6);
    });
  });

  describe('X5 — S2 last-bullet ATK share reaches ONLY Electric allies, CHC-gated', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === EXIA && b.stat === 'casterAtkPct'
    );

    it('is 5.8% of exia static ATK per stack (flat-resolved), 5-stack cap, 15s duration', () => {
      expect(applied.length).toBeGreaterThan(0);
      // the engine flat-resolves caster-scaled grants at apply time — the event carries
      // 0.058×staticAtk, not the kit percentage; that flat value IS the 5.8%-of-caster line
      expect([...new Set(applied.map((b) => b.value))]).toEqual([
        SHARE_PER_STACK,
      ]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('reaches exia + ada (the Electric allies) and NOBODY else, stacking to cap', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        EXIA,
        ADA,
      ]);
      for (const t of [EXIA, ADA]) {
        expect(
          Math.max(
            ...applied.filter((b) => b.targetIdx === t).map((b) => b.stacks)
          ),
          `target ${t} never reached the 5-stack cap`
        ).toBe(5);
      }
    });

    it('DISCRIMINATING (scope): an un-scoped buff would reach crown and helm', () => {
      const wide = buffs(allAllies.events).filter(
        (b) => b.casterIdx === EXIA && b.stat === 'casterAtkPct'
      );
      expect([...new Set(wide.map((b) => b.targetIdx))].sort()).toEqual([
        EXIA,
        CROWN,
        ADA,
        HELM,
      ]);
    });

    it('DISCRIMINATING (gate): without Collect Hacking Code it never fires', () => {
      expect(
        buffs(noStacks.events).filter(
          (b) => b.casterIdx === EXIA && b.stat === 'casterAtkPct'
        ).length
      ).toBe(0);
    });
  });

  describe('X6 — burst deals 122.32% of final ATK, pre-FB', () => {
    const nukes = exiaBurstDmg(base.events);
    const casts = exiaCasts(base.events).length;

    it('every cast lands at the kit magnitude in the burst bucket', () => {
      expect(casts).toBeGreaterThan(0);
      expect(nukes.length).toBeGreaterThanOrEqual(casts);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([122.32]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(
        nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });
  });

  describe('X8 — max-stack additional damage fires only once stacks are at max', () => {
    // Hits land on the cast frame; group the burst damage under its cast.
    const hitsPerCast = (evs: SimEvent[]) =>
      exiaCasts(evs).map(
        (c) =>
          exiaBurstDmg(evs).filter((d) => Math.abs(d.frame - c.frame) <= 3)
            .length
      );

    it('the opener casts PRE-max (one hit); every later cast lands TWO', () => {
      // Fixture anatomy (deterministic): pulls 1-5 land at 1.12/2.48/3.85/5.22/6.58s, so
      // stacks hit max at 6.58s; the focused-SR opener casts at 4.37s — three pulls too
      // early. The gate doing exactly that (closed for the opener, open forever after) IS
      // the line under test.
      const perCast = hitsPerCast(base.events);
      expect(perCast.length).toBeGreaterThan(4);
      expect(perCast[0], 'the opener must cast before stacks max').toBe(1);
      expect(
        perCast.slice(1).every((n) => n === 2),
        `post-max casts must all land both hits, got [${perCast}]`
      ).toBe(true);
    });

    it('DISCRIMINATING: without stacks every cast lands only the unconditional nuke', () => {
      expect(hitsPerCast(noStacks.events).every((n) => n === 1)).toBe(true);
    });
  });

  describe('X9 — max-stack Damage Taken 18.04% for 10s on the boss', () => {
    // Enemy buffs emit with targetIdx/casterIdx null (the boss has no unit) — ownership is
    // carried by the key's caster-slot prefix. Same max-stack gate as X8: the 4.37s opener
    // casts pre-max, so exactly casts-1 debuffs land.
    const takenFrom = (evs: SimEvent[]) =>
      buffs(evs).filter(
        (b) =>
          b.stat === 'damageTakenPct' &&
          b.targetIdx === null &&
          b.key.startsWith(`${EXIA}:burst:`)
      );
    const applied = takenFrom(base.events);

    it('one boss debuff per post-max cast at the kit magnitude, 10s window', () => {
      expect(applied.length).toBe(exiaCasts(base.events).length - 1);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([18.04]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: removing it moves the team total (the window is load-bearing)', () => {
      expect(takenFrom(noTaken.events).length).toBe(0);
      const sum = (t: Record<string, number>) =>
        Object.values(t).reduce((a, b) => a + b, 0);
      expect(sum(base.totals)).toBeGreaterThan(sum(noTaken.totals));
    });
  });
});
```

```json
// src/skills/overrides/exia.json (validate-overrides: valid; dmg 146.6M, 22.9% share, 9 bursts)

{
  "note": "TREASURE (favorite-item) KIT — first modeling, kit-autonomy gauntlet 2026-07-27. Ground truth is the top-level treasure prose (data/characters.json → characters.exia.skills); the datamined skill1/skill2 detail templates in role.skillDetails are the UNTREASURED base kit and disagree with the treasure prose on trigger/value/duration (base S2: last-bullet trigger, 16.8%, 15s self; treasure S2: full-charge trigger, 28% self stacks + a 5.8%-of-caster Electric-ally share) — same favorite-item sync shape as helm. COLLECT HACKING CODE is a declared resource pool `hackingCode` [0..5]: +1 per shotFired (SR = one full charge per pull — helm/liberalio precedent for 'landing an attack with Full Charge'), clamped at 5. SKILL1: the enemy ATK▼/DEF▼ last-bullet lines are UNMODELED (see unmodeled) — the sim runs a DEF=0 enemy basis and the engine's enemy-buff channel admits only damageTakenPct/distributedDamagePct (sim.ts drops enemy ATK▼/DEF▼ at dispatch), so there is nothing to enact; fullBurstEnter -> self reloadSpeedPct 95/10s models 'Reload speed is fixed at a 95% increase for 10 sec' as an additive buff — the 'fixed' CLAMP semantics (cannot stack with/dilute other reload buffs) are a stat-clamp primitive the engine lacks (engine-modeling-gaps §1b, asuka-wille precedent); inert on any team without a second reload buffer. SKILL2: the full-charge stack is the live perResource encoding — passive self atkPct with perResource {hackingCode, mult:28} reads the pool every frame, so ATK ramps 28% per pull for six pulls and holds at +140%; the pool has NO time decay (the kit's 5s per-stack duration) — at her 1.37s fire cadence a stack never lapses before the next refresh, so the steady state (permanent max after six pulls) is identical to duration-refresh semantics and the ramp shape is identical too; diverges only if she stops firing >5s, which never occurs in continuous combat (⚑ per-stack duration-refresh vs independent-timer semantics: the engine refreshes, so stacks cap at 5; an independent-timer game would settle near ~2 — board A/B would catch it if it mattered); lastBullet -> alliesOfElement Electric (self-INCLUSIVE: the kit says 'all Electric Code ally unit(s)', never 'except self') casterAtkPct 5.8 maxStacks 5/15s under resourceGate {min:1} ('if the skill user is in Collect Hacking Code'); casterAtkPct flat-resolves against the caster's STATIC ATK at apply time (engine convention, guilty precedent). BURST: burstCast -> enemy flatDamage 122.32 ('the 10 enemy unit(s) with the highest final DEF' collapses to the single immortal boss — multi-target selection is inert in a single-target sim); the second ■ block ('Activates when Collect Hacking Code is at max stacks. Affects the same target(s).') carries BOTH the 122.32% additional damage AND the Damage Taken ▲18.04%/10s, so both blocks sit under resourceGate {min:5}; stacks max at ~7s and her first cast lands ~20s+, so the gate is open for every cast in a sustained fight. Cast lands BEFORE the Full Burst window opens, so neither burst hit takes the +50% major (verified fact 2026-07-13). Her magazine is 6 / reload 141f / charge 60f on the universal SR bolt-recovery rule (no charFixes). Kit-autonomy gauntlet 2026-07-27: cross-family S2b (claude-fable-5) review converged on all six enactable lines (leakDetected null); reviewer's DEF▼-load-bearing call reconciled to UNMODELED-verbatim (engine has no enemy-debuff channel at DEF=0 — game-correct, unenactable).",
  "resources": [
    {
      "name": "hackingCode",
      "initial": 0,
      "min": 0,
      "max": 5
    }
  ],
  "unmodeled": {
    "skill1": [
      "■ Activates when the last bullet hits the target. Affects the target if the skill user is in Collect Hacking Code. ATK ▼ 13.77% for 5 sec. — no sim channel: the enemy-buff path admits only damageTakenPct/distributedDamagePct and the boss deals no damage, so an enemy ATK▼ moves nothing (sim.ts, DEF=0 basis)",
      "DEF ▼ 13.77% for 5 sec. — no sim channel: enemy DEF▼ is dropped at dispatch on the DEF=0 basis (sim.ts 'other enemy debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0')"
    ],
    "skill2": [],
    "burst": [
      "DEF ▼ 2.71% for 5 sec. — no sim channel: enemy DEF▼ is dropped at dispatch on the DEF=0 basis (same as the skill1 DEF▼ line)"
    ]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": 95,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "hackingCode",
          "delta": 1
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
          "stat": "atkPct",
          "value": 0,
          "perResource": {
            "name": "hackingCode",
            "mult": 28
          }
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "lastBullet"
      },
      "target": {
        "kind": "alliesOfElement",
        "element": "Electric"
      },
      "resourceGate": {
        "name": "hackingCode",
        "min": 1
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 5.8,
          "maxStacks": 5,
          "durationSec": 15
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
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 122.32
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
        "name": "hackingCode",
        "min": 5
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 122.32
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
        "name": "hackingCode",
        "min": 5
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 18.04,
          "durationSec": 10
        }
      ]
    }
  ],
  "caveats": [
    "skill1: 'Reload speed is FIXED at a 95% increase' is encoded as an additive reloadSpeedPct buff — the clamp ('fixed') semantics need a stat-clamp primitive the engine lacks; identical to the clamp on any team without a second reload buffer",
    "skill2: the hackingCode pool has no time decay (kit: 5s per-stack duration) — at her 1.37s full-charge cadence stacks never lapse before refresh, so ramp + steady state match duration-refresh semantics; diverges only if she stops firing >5s",
    "skill2: stack-duration semantics ⚑ — the engine refreshes the whole buffer on re-application (stacks cap at 5 in sustained fire); if the game runs independent per-stack timers the real steady state is ~2 stacks; board A/B is the outer check",
    "skill2: the full-charge trigger is shotFired (every SR pull is one full charge — helm/liberalio precedent); verify against an exia focus video if uncharged SR shots ever exist",
    "burst: 'the 10 enemy unit(s) with the highest final DEF' collapses to the single immortal boss — multi-target selection is out of domain for the single-target sim",
    "burst: the enemy ATK▼/DEF▼ lines (skill1 13.77%/13.77%, burst 2.71%) are game-real but unenactable — the sim's DEF=0 basis drops enemy ATK▼/DEF▼ at dispatch; they are recorded verbatim in unmodeled"
  ]
}
```
