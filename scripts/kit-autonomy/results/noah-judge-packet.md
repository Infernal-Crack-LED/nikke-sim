# S7 RECONCILING-JUDGE PACKET — noah (Noah, RL/Wind/Defender/Burst II)

You are the BINDING reconciling judge for the kit-autonomy gauntlet on slug `noah`. Read the contract below, then every section, and return ONLY the verdict JSON the contract specifies. Driver (Qwen) and three blind cross-family reviews (S2b claude-fable-5; S5 + S6 claude-opus-5) are all before you. noah is a PURE TANK kit — taunt / damage-taken reduction / invulnerability / DEF — with ZERO damage lines and ZERO weapon-state modifiers; the sim models no HP pool, no incoming damage and no enemy targeting, so seven of her eight kit lines are out-of-domain. Her one in-domain line is the burst all-ally DEF +133.48%/10s grant (defPct, engine-inert in v1). She is damage-neutral by the same proof as the six clean-weapon basis units, though NOT one of the six (owner-fixed list).

### KEY RECONCILIATION FACTS THE JUDGE MUST WEIGH

1. FULL CONVERGENCE on the one load-bearing line: driver, S2b (fable), S5 (opus) and S6 (opus) ALL encode the burst "DEF +133.48% for 10 sec" identically — trigger burstCast (own cast), target allies, buff defPct 133.48, durationSec 10. S6's blind override block is byte-equivalent to the driver's. All four also agree the other seven lines are unmodelable at scope (no attacked-trigger/RNG gate, no ally damage-taken stat, no enemy stats, no aggro, no HP pool) and must never be fabricated as damageTakenPct/atkPct/shield/targetStatus.
2. THE ONE SUBSTANTIVE DIVERGENCE — S6 placeholder blocks vs driver unmodeled-verbatim: S6 adds two damage-inert PLACEHOLDER blocks alongside the identical unmodeled records — skill1 `interval:10 -> allies, buff defPct value 0` (self-flagged "INVENTED" trigger; the kit says 10%-chance-when-attacked, not every-10s) and skill2 `shotFired -> enemy, effects: []` ("effect-free block recording the real trigger for future consumers"). The driver leaves both lines VERBATIM in `unmodeled` with no blocks, per the repo convention for out-of-domain lines (marciana/folkwang precedent: no zero-value/zero-effect placeholders). Empirical hazard demonstrated in THIS run: an unrelated defPct channel (crown's 37.44 non-caster grant in the control comp) broke the S5 blind test's provenance premise exactly the way S6's zero-value defPct channel would for future consumers/tests. Judge: rule whether placeholders or unmodeled-verbatim is the faithful encoding for lines with no primitives.
3. S5 blind-test reds — ALL classified fixture-premise, none encoding: pristine adapted copy scored 6 failed / 6 passed vs the driver override. Root cause (verified empirically, see section 5): the blind author assumed defPct events originate ONLY from noah, but crown (CONTROL_CORE) emits her own documented defPct 37.44 at every Full Burst — so the author's data-driven fixture selection picked candidate 1 (where noah casts ZERO bursts; controlComp's fixed B2 crown wins every stage 2) and every channel assertion read crown's events. Three ADAPTED-COPY premise fixes, each documented in the file banner and each preserving assertion intent: (a) harness import path; (b) fixture-selection predicate keyed to HER buff value (author comment: "the first that actually shows her burst buff"); (c) defApplies reader scoped to noah's casterIdx. Result: 12 passed / 0 failed / 6 skipped (skips are the author's own documented GAP lines). With the enabler candidate selected, noah casts 6x and her channel lands exactly as the driver override encodes (24 = 6 casts x 4 allies, value 133.48, 600-frame expiry, before fullBurstStart).
4. DRIVER EVIDENCE: scripts/tests/units/noah.test.ts passes 22/22 (neutrality solo+in-team, defPct channel shape/cadence/expiry, burstCast-vs-fullBurstEnter BEHAVIORAL discrimination against a competing CD-20 B2, unmodeled-verbatim pins, no-fabrication pins incl. global no-atkPct-133.48 adopted from S2b). validate-overrides.ts: VALID (smoke sim dmg 18.5M, bursts 4). Tier 1.

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

## 3. GROUND TRUTH — noah datamine extract (kit prose SL10 + base stats + cooldowns)

```json
{
  "slug": "noah",
  "name": "Noah",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/hg-49/sg-06/84ca5fae870cfd84e2b4b448a4803f43.png",
  "weapon": "RL",
  "burst": "II",
  "burstCooldownSec": 40,
  "class": "Defender",
  "element": "Wind",
  "manufacturer": "Pilgrim",
  "normalAttackMultiplier": 64.04,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 171,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 2,
  "rl3": 36,
  "releaseDate": "2022-11-04",
  "burstGaugePerShot": 1.5,
  "treasure": false,
  "skills": {
    "skill1": "■ There is a 10% chance of activating when attacked. Affects all allies.\nDamage Taken ▼ 8% for 10 sec.",
    "skill2": "■ Activates when hitting a target with a Full Charge attack. Affects the target.\nTaunt for 2 sec.\nATK ▼ 13.25% for 5 sec.",
    "burst": "■ Affects self.\nAttract: Taunt all enemies for 10 sec.\n■ Affects all allies.\nInvulnerable for 3 sec.\nDEF ▲ 133.48% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 40
  },
  "role": {
    "weapon": {
      "shot_id": 1023201,
      "shot_detail": {
        "id": 1023201,
        "damage": 3202,
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
        "reload_time": 250,
        "shot_timing": "Concurrence",
        "spot_radius": 50,
        "weapon_type": "RL",
        "is_targeting": false,
        "muzzle_count": 2,
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
        "burst_energy_pershot": 15000,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nCharge Time: {charge_time} sec.\nFull Charge Damage: {full_charge_damage}% of damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 0,
        "spot_explosion_range": 500,
        "use_function_id_list": [0],
        "accuracy_change_speed": 0,
        "hurt_function_id_list": [0],
        "spot_projectile_speed": 100,
        "accuracy_change_pershot": 0,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 0,
        "full_charge_burst_energy": 25000,
        "end_accuracy_circle_scale": 10,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 10,
        "target_burst_energy_pershot": 30000,
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
      "skill1_id": 2232101,
      "skill2_id": 2232201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2232101,
        "icon": "icn_skill_defup_01",
        "group_id": 22321,
        "skill_level": 1,
        "name_localkey": "This is Gonna Hurt",
        "next_level_id": 2232102,
        "level_up_cost_id": 30102,
        "description_localkey": "■ There is a {description_value_03}% chance of activating when attacked. Affects all allies.\n<color=#00AEFF>Damage Taken ▼ {description_value_01}% for {description_value_02} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "4.4",
              "4.8",
              "5.2",
              "5.6",
              "6",
              "6.4",
              "6.8",
              "7.2",
              "7.6",
              "8"
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
          {},
          {}
        ],
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2232201,
        "icon": "icn_skill_attention_01",
        "group_id": 22322,
        "skill_level": 1,
        "name_localkey": "Cruisin' for a Bruisin'",
        "next_level_id": 2232202,
        "level_up_cost_id": 30202,
        "description_localkey": "■ Activates when hitting a target with a Full Charge attack. Affects the target.\n<color=#00AEFF>Taunt for {description_value_01} sec.\nATK ▼ {description_value_02}% for {description_value_03} sec.</color>",
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
              "9.35",
              "9.78",
              "10.22",
              "10.65",
              "11.09",
              "11.52",
              "11.95",
              "12.39",
              "12.82",
              "13.25"
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
          {}
        ],
        "info_description_localkey": "Skill 2"
      },
      "ulti_skill_id": 1232301,
      "ulti_skill_detail": {
        "id": 1232301,
        "icon": "icn_skill_c232_ult",
        "group_id": 12323,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Wind",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "TimeSec",
        "name_localkey": "U Mad Bro?",
        "next_level_id": 1232302,
        "prefer_target": "HighAttack",
        "resource_name": "c232_ulti",
        "duration_value": 0,
        "skill_cooltime": 4000,
        "level_up_cost_id": 30302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "Percent"
          },
          {
            "skill_value": 5,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 0,
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
          4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000
        ],
        "description_localkey": "■ Affects self.\n<color=#00AEFF>Attract: Taunt all enemies for {description_value_02} sec.</color>\n■ Affects all allies.\n<color=#00AEFF>Invulnerable for {description_value_03} sec.\nDEF ▲ {description_value_04}% for {description_value_05} sec.</color>",
        "description_value_list": [
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
              "88.93",
              "93.88",
              "98.83",
              "103.78",
              "108.73",
              "113.68",
              "118.63",
              "123.58",
              "128.53",
              "133.48"
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
          {}
        ],
        "prefer_target_condition": "None",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [123230101, 123230102],
        "after_hurt_function_id_list": [0],
        "before_use_function_id_list": [0],
        "before_hurt_function_id_list": [0]
      }
    },
    "statScaling": {
      "grow_grade": 423202,
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
      "element_id": [300001],
      "element_details": [
        {
          "id": 300001,
          "element": "Wind",
          "group_id": 5000003,
          "element_icon": "icn_element_wind",
          "weak_element_id": 100001,
          "element_desc_localekey": "Injects Code: A.N.M.I. to all iron-type enemies, dealing 10% additional damage.",
          "element_name_localekey": "Wind",
          "element_code_name_localekey": "Code: A.N.M.I."
        }
      ]
    },
    "piece": {
      "piece_id": 5100232,
      "piece_detail": {
        "id": 5100232,
        "class": "Defender",
        "order": 23200,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "PILGRIM",
        "resource_id": 232,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Noah's Spare Body",
        "use_limit_count": false,
        "inventory_filter": ["etc"],
        "corporation_sub_type": "OVERSPEC",
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 423201,
      "class": "Defender",
      "order": 10143,
      "name_code": 5043,
      "corporation": "PILGRIM",
      "resource_id": 232,
      "name_localkey": "Noah",
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
    "resourceId": 232
  }
}
```

---

## 4. S2b BLIND TEST REVIEW (claude-fable-5)

```json
{
  "slug": "noah",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "10% chance when attacked \u2192 Damage Taken \u25bc 8%",
      "disposition": "UNMODELED",
      "scope": "Defensive damage-taken reduction on ALLIES (incoming damage), not any offensive bucket; RNG-gated (10% proc).",
      "durationSemantics": "10 sec wall-clock (durationSec) \u2014 but moot, line is unmodeled.",
      "triggerIdentity": "On-attacked proc \u2014 NO such trigger exists in TriggerDef, and the v1 boss deals no damage so 'when attacked' never occurs. Not interval, not shotFired.",
      "targetSet": "All allies (including self).",
      "nearestWrongModel": "Pattern-matching the 'Damage Taken' keyword to the boss-debuff stat damageTakenPct and encoding it as a boss-held -8% debuff (the taxonomy primes 'Damage Taken \u25b2 = boss debuff'; here the \u25bc direction + ally target invert that). That misread makes the boss take 8% LESS damage and drags the whole team's totals down 8%.",
      "distinguishingAssertion": "Collect cfg.onEvent buffApply events for a full run: expect ZERO events with stat==='damageTakenPct' sourced from noah's kit (including the boss-held casterIdx===null/targetIdx===null form). And totals(runComp(comp)) per-slug must be IDENTICAL between the shipped override and withPatchedOverride('noah', o => { o.skill1 = [] }).",
      "inertness": "The entire skill1 must move zero damage for every unit in the comp.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Full Charge hit \u2192 Taunt for 2 sec",
      "disposition": "UNMODELED",
      "scope": "Aggro control on the enemy; no taunt/aggro primitive exists in EffectDef and boss targeting is not simulated.",
      "durationSemantics": "2 sec wall-clock \u2014 moot.",
      "triggerIdentity": "On-HIT with a Full Charge attack \u2014 noah is RL (chargeFrames 60), so every full-charge shot would fire this; if it were modeled the trigger is shotFired (per pull), NOT lastBullet and NOT chargeCounter. No fbGate.",
      "targetSet": "The target (enemy).",
      "nearestWrongModel": "Inventing a targetStatus effect (e.g. name:'Taunt') on the boss \u2014 harmless alone but creates a phantom status window that could someday satisfy an unrelated requiresTargetStatus gate; or worse, treating 'Taunt' as a damage rider.",
      "distinguishingAssertion": "No buffApply and no damage events attributable to skill2; a run with withPatchedOverride('noah', o => { o.skill2 = [] }) yields identical totals for every slug. The line must appear verbatim in unmodeled.skill2, not as a block.",
      "inertness": "Zero damage movement; no boss-status window opened.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "ATK \u25bc 13.25% for 5 sec (the target)",
      "disposition": "UNMODELED",
      "scope": "Debuff on the BOSS's ATK stat. Boss ATK is not an input to any team-damage formula (boss deals no damage in v1); the only live enemy channels are damageTakenPct and targetStatus, neither of which expresses enemy ATK.",
      "durationSemantics": "5 sec wall-clock \u2014 moot.",
      "triggerIdentity": "Same on-full-charge-hit trigger as the taunt line (shotFired if modeled).",
      "targetSet": "Enemy (the hit target). NOT self, NOT allies.",
      "nearestWrongModel": "Target-set misread: applying atkPct -13.25 to SELF or ALLIES (reading 'Affects the target' as the buff-recipient ally in some parser path) \u2014 that would cut the carry's ATK by 13.25% for 5s per shot, a large spurious damage LOSS refreshed continuously by RL fire.",
      "distinguishingAssertion": "Filter buffApply events: expect ZERO events with stat==='atkPct' && value < 0 on ANY targetIdx (ally-side or boss-held). Totals identical with skill2 stripped.",
      "inertness": "Zero damage movement for the whole comp.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Attract: Taunt all enemies for 10 sec (self)",
      "disposition": "UNMODELED",
      "scope": "Aggro control; no primitive.",
      "durationSemantics": "10 sec \u2014 moot.",
      "triggerIdentity": "burstCast (noah's OWN Burst II cast) \u2014 NOT fullBurstEnter. Moot for a taunt, but the header's trigger identity matters for the sibling DEF line below.",
      "targetSet": "Self (the '\u25a0 Affects self' header; the taunt lands on all enemies).",
      "nearestWrongModel": "Encoding a targetStatus('Attract'/'Taunt') boss window \u2014 phantom status risk as with skill2's taunt.",
      "distinguishingAssertion": "No boss-status buffApply, no damage events from this line; verbatim entry in unmodeled.burst; totals unchanged when stripped.",
      "inertness": "Zero damage movement; no status window.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Invulnerable for 3 sec (all allies)",
      "disposition": "UNMODELED",
      "scope": "Defensive; no HP/damage-intake model at scope lock, no invulnerability primitive. NOT a 'shield' effect \u2014 encoding it as kind:'shield' would spuriously fire teammates' 'shielded' triggers and requiresShielded gates (e.g. a naga-style shield-gated rider would go live off it).",
      "durationSemantics": "3 sec \u2014 moot.",
      "triggerIdentity": "burstCast (own burst).",
      "targetSet": "All allies.",
      "nearestWrongModel": "kind:'shield' with durationSec:3 \u2014 the plausible 'closest primitive' substitution. It is WRONG: invulnerability is not a Shield in kit vocabulary, and the shield event channel is load-bearing for shield-synergy teammates.",
      "distinguishingAssertion": "Collect events: expect ZERO shield-effect emissions from noah (no teammate 'shielded' trigger fires attributable to her burst). In a comp containing a shield-gated consumer, that consumer's gated blocks must not activate off noah's burst.",
      "inertness": "Zero damage movement; zero shielded-trigger emissions.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "DEF \u25b2 133.48% for 10 sec (all allies)",
      "disposition": "FAITHFUL",
      "scope": "Generic DEF stat buff \u2014 defPct exists as a StatKey and is deliberately engine-inert in v1 (self DEF never feeds own damage). Per the keep-the-stat-buff rule (future consumer/scaler), it should be ENCODED, not dropped to unmodeled.",
      "durationSemantics": "10 sec wall-clock \u2192 durationSec: 10 (a plain seconds line, no round-count wording).",
      "triggerIdentity": "burstCast \u2014 this is noah's OWN burst block ('Affects all allies' under her burst), so it fires ONLY on rotations noah herself casts Burst II. NOT fullBurstEnter. With another B2 in the comp (controlComp fixes crown at B2), the two triggers diverge every rotation crown takes.",
      "targetSet": "All allies including self (target kind 'allies', no excludeSelf), same-caster-slot overwrite semantics on refresh.",
      "nearestWrongModel": "Two-headed: (a) stat confusion \u2014 emitting atkPct 133.48 instead of defPct (a catastrophic +133% team ATK over-credit); (b) trigger confusion \u2014 fullBurstEnter, which would emit the buffApply on EVERY full burst including crown-led ones instead of only noah-cast rotations.",
      "distinguishingAssertion": "In a comp where noah demonstrably casts (assert \u22651 burstCast event from noah's slot first): every full burst PRECEDED by a noah burstCast has a buffApply with stat==='defPct' && value===133.48 on all 5 targetIdx, expiresFrame \u2248 castFrame + 600; full bursts where crown cast instead have NO such buffApply. Assert ZERO buffApply with stat==='atkPct' && value===133.48 anywhere. Inertness leg: totals per-slug identical when the defPct effect is deleted via withPatchedOverride.",
      "inertness": "defPct must move ZERO damage in v1 \u2014 its assertion is existence + shape, plus a totals-identical check with it removed.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": ["burst:DEF \u25b2 133.48% for 10 sec"],
  "unmodeledVerbatim": {
    "skill1": [
      "There is a 10% chance of activating when attacked. Affects all allies. Damage Taken \u25bc 8% for 10 sec."
    ],
    "skill2": ["Taunt for 2 sec.", "ATK \u25bc 13.25% for 5 sec."],
    "burst": [
      "Attract: Taunt all enemies for 10 sec.",
      "Invulnerable for 3 sec."
    ]
  },
  "notes": "noah is a PURE DEFENSIVE Burst II \u2014 the primary payload of her test file is whole-kit inertness: her override must move ZERO damage for herself and every teammate versus a fully stripped override; her only sim contributions are her RL fire cycle (chargeFrames 60, ammo 6, hitsPerShot 2, mult 64.04/core 200 \u2014 cadence tuple is ALWAYS-\u2691), burst-gauge generation, and B2 rotation enablement. Expected shared-prior misreads to check hardest: (1) skill1's 'Damage Taken \u25bc' keyword being routed to the boss-debuff damageTakenPct channel \u2014 the methodology explicitly primes 'Damage Taken = boss debuff', but here the \u25bc direction and ALLY target make it a defensive ally buff, and the misread costs the whole board -8%; (2) skill2's 'Affects the target' ATK \u25bc landing on self/allies as a negative atkPct; (3) 'Invulnerable' being substituted with the nearest primitive kind:'shield', which spuriously feeds shielded-trigger/requiresShielded consumers; (4) the burst DEF buff keyed to fullBurstEnter instead of burstCast. FIXTURE WARNING the driver must reconcile: controlComp fixes crown at Burst II and puts the carry in the B3 slot \u2014 noah is B2, so a controlComp(noah) fixture is mis-slotted and she may NEVER cast (voiding every burstCast assertion). The test must either build a custom CompOptions where noah is the sole/first-ready B2, or gate every burst assertion on an observed burstCast event from her slot; her 40s burst cd (vs a standard 20s B2) also means she may cast only on alternating rotations even when selected \u2014 assert from the event log, never from an assumed once-per-rotation cadence. Also assert noah emits NO damage events beyond her weapon buckets (no flatDamage/dot riders \u2014 the kit gives none).",
  "model": "claude-fable-5"
}
```

---

## 5. S5 BLIND TEST (claude-opus-5) — scored vs the DRIVER override

PRISTINE adapted copy (import-path fix only): 6 failed / 6 passed / 6 skipped — ALL 6 failures traced to ONE fixture premise bug (crown's defPct 37.44 pollution; noah never cast in the selected candidate). After the 3 documented premise fixes (see banner below): 12 passed / 0 failed / 6 skipped (skips = the author's own GAP lines, it.skip by design).

### ADAPTED COPY AS RUN (banner documents the 3 premise fixes)

```typescript
// ADAPTED-COPY of blind/noah.test.ts (the pristine S5 artifact, claude-opus-5) for execution
// against the DRIVER override. Structural fixes ONLY (ade-agent-bunny precedent):
//   1. harness import path '../lib/harness.js' -> '../../tests/lib/harness.js'
//   2. fixture-selection predicate keyed to HER buff value (author intent: 'the first that
//      actually shows her burst buff'): crown (CONTROL_CORE) emits her own defPct 37.44 at
//      every Full Burst, so the pristine defApplies.length>0 predicate selected candidate 1
//      even though noah never cast there. Fix: .some(e => e.value === DEF_PCT).
//   3. defApplies reader scoped to noah's casterIdx (author premise 'defPct events originate
//      only from noah' is false: crown's documented non-caster grant fires at every Full Burst).
//      Caster attribution preserves every assertion's intent (all are about HER channel).
// Assertion intent untouched.
/**
 * noah - blind kit spec (S5 cross-family post-op). Written from the kit prose ALONE.
 *
 * KIT PROSE (ground truth):
 *   skill1  '10% chance of activating when attacked' / all allies / 'Damage Taken -8% for 10 sec'
 *   skill2  'when hitting a target with a Full Charge attack' / the target / 'Taunt for 2 sec'
 *           + 'ATK -13.25% for 5 sec'
 *   burst   self:       'Attract: Taunt all enemies for 10 sec'
 *           all allies: 'Invulnerable for 3 sec' + 'DEF +133.48% for 10 sec'
 *   Base: RL / Wind / Defender / Burst II, cd 40s, ammo 6, chargeFrames 60, hitsPerShot 2.
 *
 * noah is a pure-defensive Defender. The ONLY kit line the v1 engine can carry is the burst
 * DEF +133.48% / 10 sec ally buff, and defPct is DAMAGE-INERT in v1 - it is kept for kit
 * completeness / a future HP-or-DEF scaler consumer (failure-mode taxonomy item 7). Every other
 * line is unobservable at scope lock: no incoming boss damage (so 'when attacked' never fires and
 * an ALLY-scoped 'Damage Taken -8%' has no consumer), no enemy entity (so an enemy ATK debuff is
 * inert), no aggro model (Taunt/Attract), no HP pool (Invulnerable).
 *
 * WHAT THIS FILE PROVES
 *  1. EVENT level: the burst emits a defPct buff, value exactly 133.48, to the WHOLE ally set
 *     (incl. self), for a 10 sec window that genuinely lapses - discriminated against the three
 *     nearest-wrong models (self-only target, 3 sec window borrowed from Invulnerable,
 *     full-burst-enter keying instead of own-burst-cast).
 *  2. TOTALS level: noah's kit is damage-inert - stripping every one of her blocks leaves every
 *     unit's total byte-identical, and her buff-event profile is defPct AND NOTHING ELSE.
 *  3. NON-VACUITY: injected damageTakenPct / atkPct blocks on the same fixture DO raise totals, so
 *     'byte-identical' means the channels are silent, not that the fixture is dead. This is the
 *     assertion that catches the two catastrophic mis-encodings available here - reading an ally
 *     'Damage Taken -8%' as a boss 'Damage Taken +' debuff (free team damage), or mis-scoping the
 *     enemy ATK debuff onto allies.
 *
 * FIXTURE: controlComp('noah', true). noah is Burst II while the control comp already carries a
 * fixed Burst II AHEAD of the carry slot, so the carry may never win stage 2 and a burst-cast
 * block would never fire. Three candidate fixtures are therefore run and the first one that
 * actually shows her burst buff becomes BASE; the second candidate appends a burstEligibility:3
 * block purely as a FIXTURE ENABLER (it changes WHICH stage she casts at, never what her burst
 * block does). Provenance is proved independently: strip her blocks and the defPct events vanish.
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

const SLUG = 'noah';
const DEF_PCT = 133.48;
const DEF_SEC = 10;
const CF_DEF_SEC = 3; // the Invulnerable duration - the nearest-wrong window
const FIGHT_FRAMES = 180 * 60;

// ---------------------------------------------------------------------------
// override-shape helpers (a slot is either a bare Block[] or a { blocks: [] })
// ---------------------------------------------------------------------------
type SlotName = 'skill1' | 'skill2' | 'burst';
type BlockLike = Record<string, unknown>;
type SlotVal = BlockLike[] | { blocks?: BlockLike[] } | undefined;
type OvLike = Record<SlotName, SlotVal> & {
  unmodeled?: Record<string, string[]>;
};

const asOv = (ov: unknown): OvLike => ov as OvLike;
const effectsOf = (b: BlockLike): BlockLike[] =>
  (b.effects as BlockLike[] | undefined) ?? [];

function readSlot(ov: unknown, slot: SlotName): BlockLike[] {
  const s = asOv(ov)[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function writeSlot(ov: unknown, slot: SlotName, blocks: BlockLike[]): void {
  const rec = asOv(ov);
  const s = rec[slot];
  if (s && !Array.isArray(s)) s.blocks = blocks;
  else rec[slot] = blocks;
}

// FIXTURE ENABLER only - lets a Burst II carry actually cast in the control comp.
function addEnabler(ov: unknown): void {
  writeSlot(ov, 'skill1', [
    ...readSlot(ov, 'skill1'),
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'burstEligibility', stage: 3 }],
    },
  ]);
}

// ---------------------------------------------------------------------------
// event helpers
// ---------------------------------------------------------------------------
interface BuffApplyLike {
  kind: 'buffApply';
  stat: string;
  value: number;
  targetSlug?: string;
  casterIdx: number | null;
  targetIdx: number | null;
  expiresFrame?: number;
}

const buffApplies = (log: SimEvent[]): BuffApplyLike[] =>
  log.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyLike[];
const NOAH_SLOT = 2; // controlComp slugs: liter / crown / noah / helm
const defApplies = (log: SimEvent[]): BuffApplyLike[] =>
  buffApplies(log).filter(
    (e) => e.stat === 'defPct' && e.casterIdx === NOAH_SLOT
  );

function statCounts(log: SimEvent[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const e of buffApplies(log)) m[e.stat] = (m[e.stat] ?? 0) + 1;
  return m;
}

const firstIdx = (log: SimEvent[], pred: (e: SimEvent) => boolean): number =>
  log.findIndex(pred);
const isDefApply = (e: SimEvent): boolean =>
  e.kind === 'buffApply' && (e as unknown as BuffApplyLike).stat === 'defPct';
const sum = (m: Record<string, number>): number =>
  Object.values(m).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// run helpers (each runComp is a full 180s sim - all runs are hoisted)
// ---------------------------------------------------------------------------
type Opts = Parameters<typeof runComp>[0];
interface Run {
  res: ReturnType<typeof runComp>;
  log: SimEvent[];
}

function run(opts: Opts): Run {
  const log: SimEvent[] = [];
  const cfg = {
    ...(opts as { cfg?: Record<string, unknown> }).cfg,
    onEvent: (ev: SimEvent) => log.push(ev),
  };
  const res = runComp({ ...opts, cfg } as unknown as Opts);
  return { res, log };
}

function withNoahOverride(opts: Opts, ov: unknown): Opts {
  const prev =
    (opts as { overrides?: Record<string, unknown> }).overrides ?? {};
  return {
    ...opts,
    overrides: { ...prev, [SLUG]: ov },
  } as unknown as Opts;
}

const CANDIDATES: { name: string; opts: Opts }[] = [
  { name: 'control+helm', opts: controlComp(SLUG, true) },
  {
    name: 'control+helm+b3enabler',
    opts: withNoahOverride(
      controlComp(SLUG, true),
      withPatchedOverride(SLUG, (ov) => addEnabler(ov))
    ),
  },
  { name: 'control-helm', opts: controlComp(SLUG, false) },
];

const RUNS = CANDIDATES.map((c) => ({ ...c, run: run(c.opts) }));
// data-driven fixture selection (deterministic - no conditional skipping)
const BASE =
  RUNS.find((r) => defApplies(r.run.log).some((e) => e.value === DEF_PCT)) ??
  RUNS[0];
const USE_ENABLER = BASE.name.includes('enabler');

function patchedNoah(mutate: (ov: unknown) => void): unknown {
  return withPatchedOverride(SLUG, (ov) => {
    mutate(ov);
    if (USE_ENABLER) addEnabler(ov); // re-added AFTER mutate so a strip cannot remove it
  });
}
const cfRun = (mutate: (ov: unknown) => void): Run =>
  run(withNoahOverride(BASE.opts, patchedNoah(mutate)));

// nearest-wrong: 'Affects all allies' read as 'Affects self'
const SELF_RUN = cfRun((ov) => {
  for (const b of readSlot(ov, 'burst')) {
    if (effectsOf(b).some((e) => e.stat === 'defPct'))
      b.target = { kind: 'self' };
  }
});
// nearest-wrong: keyed to full-burst entry instead of her own burst cast
const FBENTER_RUN = cfRun((ov) => {
  for (const b of readSlot(ov, 'burst')) {
    if (effectsOf(b).some((e) => e.stat === 'defPct'))
      b.trigger = { kind: 'fullBurstEnter' };
  }
});
// nearest-wrong: the 3 sec Invulnerable window applied to the DEF line
const DUR3_RUN = cfRun((ov) => {
  for (const b of readSlot(ov, 'burst')) {
    for (const e of effectsOf(b)) {
      if (e.stat === 'defPct') e.durationSec = CF_DEF_SEC;
    }
  }
});
// whole kit removed - the inertness / provenance baseline
const STRIP_RUN = cfRun((ov) => {
  writeSlot(ov, 'skill1', []);
  writeSlot(ov, 'skill2', []);
  writeSlot(ov, 'burst', []);
});
// non-vacuity probes: these channels DO move totals on this exact fixture
const DT_RUN = cfRun((ov) => {
  writeSlot(ov, 'skill1', [
    ...readSlot(ov, 'skill1'),
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'buff', stat: 'damageTakenPct', value: 8 }],
    },
  ]);
});
const ATK_RUN = cfRun((ov) => {
  writeSlot(ov, 'skill2', [
    ...readSlot(ov, 'skill2'),
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [{ kind: 'buff', stat: 'atkPct', value: 13.25 }],
    },
  ]);
});

const BASE_TOTALS = totals(BASE.run.res);
const ROSTER = Object.keys(BASE_TOTALS);
const COMMITTED = withPatchedOverride(SLUG, () => {});

describe('noah burst: DEF +133.48% for 10 sec, all allies', () => {
  it('fires at all (fixture non-vacuity: she casts and she shoots)', () => {
    expect(defApplies(BASE.run.log).length).toBeGreaterThan(0);
    expect(unitOf(BASE.run.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  it('emits exactly 133.48 - not the 13.25 / 8 magnitudes elsewhere in the kit', () => {
    const applies = defApplies(BASE.run.log);
    expect(applies.map((e) => e.value)).toEqual(applies.map(() => DEF_PCT));
  });

  it('covers the WHOLE ally set including self (RED under a self-only read)', () => {
    const applies = defApplies(BASE.run.log);
    expect(new Set(applies.map((e) => e.targetIdx)).size).toBe(ROSTER.length);
    expect(applies.map((e) => e.targetSlug)).toContain(SLUG);
    // nearest-wrong: target self -> one distinct target instead of the roster
    expect(new Set(defApplies(SELF_RUN.log).map((e) => e.targetIdx)).size).toBe(
      1
    );
  });

  it('is a 10 sec window, not the 3 sec Invulnerable window', () => {
    const long = defApplies(BASE.run.log)[0];
    const short = defApplies(DUR3_RUN.log)[0];
    expect(long.expiresFrame).toBeGreaterThanOrEqual(DEF_SEC * 60);
    // same cast frame (defPct is damage-inert, so the rotation is unchanged)
    expect((long.expiresFrame ?? 0) - (short.expiresFrame ?? 0)).toBe(
      (DEF_SEC - CF_DEF_SEC) * 60
    );
  });

  it('re-applies once per ally per cast and is NOT permanent (inactive case exists)', () => {
    const applies = defApplies(BASE.run.log);
    expect(applies.length % ROSTER.length).toBe(0);
    const buffedFrames = (applies.length / ROSTER.length) * DEF_SEC * 60;
    expect(buffedFrames).toBeLessThan(FIGHT_FRAMES);
  });
});

describe('noah burst: trigger identity is her OWN burst cast', () => {
  it('applies BEFORE full burst opens (RED under a fullBurstEnter read)', () => {
    const iDef = firstIdx(BASE.run.log, isDefApply);
    const iFb = firstIdx(BASE.run.log, (e) => e.kind === 'fullBurstStart');
    expect(iFb).toBeGreaterThanOrEqual(0); // the fixture really full-bursts
    expect(iDef).toBeGreaterThanOrEqual(0);
    expect(iDef).toBeLessThan(iFb);

    const jDef = firstIdx(FBENTER_RUN.log, isDefApply);
    const jFb = firstIdx(FBENTER_RUN.log, (e) => e.kind === 'fullBurstStart');
    expect(jDef).toBeGreaterThan(jFb); // the nearest-wrong model inverts the order
  });
});

describe('noah: the kit is damage-inert (defensive Defender at scope lock)', () => {
  it('stripping every noah block leaves all totals byte-identical', () => {
    expect(totals(STRIP_RUN.res)).toEqual(BASE_TOTALS);
  });

  it('...and that inertness is not vacuous: injected channels DO move totals', () => {
    // a boss Damage Taken + debuff (the mis-read of an ALLY 'Damage Taken -8%')
    expect(sum(totals(DT_RUN.res))).toBeGreaterThan(sum(BASE_TOTALS));
    // an ally ATK buff (the mis-scope of the enemy-targeted ATK -13.25%)
    expect(sum(totals(ATK_RUN.res))).toBeGreaterThan(sum(BASE_TOTALS));
  });

  it('contributes defPct events and NOTHING else (no damageTakenPct, no atkPct)', () => {
    const withNoah = statCounts(BASE.run.log);
    const without = statCounts(STRIP_RUN.log);
    expect(withNoah.defPct ?? 0).toBeGreaterThan(without.defPct ?? 0);
    delete withNoah.defPct;
    delete without.defPct;
    expect(withNoah).toEqual(without); // every other stat channel is untouched by her
  });
});

describe('noah: override shape + the no-silent-drops record', () => {
  it('burst carries one burst-cast, all-allies defPct 133.48 / 10s block', () => {
    const blocks = readSlot(COMMITTED, 'burst');
    const carriers = blocks.filter((b) =>
      effectsOf(b).some((e) => e.kind === 'buff' && e.stat === 'defPct')
    );
    expect(carriers.length).toBe(1);
    const b = carriers[0];
    expect((b.trigger as BlockLike).kind).toBe('burstCast');
    const target = b.target as BlockLike;
    expect(target.kind).toBe('allies');
    expect(target.excludeSelf ?? false).toBe(false);
    const eff = effectsOf(b).find((e) => e.stat === 'defPct') as BlockLike;
    expect(eff.value).toBe(DEF_PCT);
    expect(eff.durationSec).toBe(DEF_SEC);
  });

  it('skill1 / skill2 carry no damage-moving effect (both lines are scope-inert)', () => {
    const MOVERS = new Set([
      'buff',
      'flatDamage',
      'dot',
      'storedHit',
      'weaponSwap',
      'unlimitedAmmo',
      'instantReload',
      'consumeAmmo',
      'fillGauge',
      'burstCdr',
    ]);
    for (const slot of ['skill1', 'skill2'] as SlotName[]) {
      const kinds = readSlot(COMMITTED, slot).flatMap((b) =>
        effectsOf(b).map((e) => String(e.kind))
      );
      expect(kinds.filter((k) => MOVERS.has(k))).toEqual([]);
    }
  });

  it('records the dropped lines in unmodeled for all three slots', () => {
    const um = asOv(COMMITTED).unmodeled ?? {};
    expect((um.skill1 ?? []).length).toBeGreaterThan(0);
    expect((um.skill2 ?? []).length).toBeGreaterThan(0);
    expect((um.burst ?? []).length).toBeGreaterThanOrEqual(2);
    expect((um.burst ?? []).join(' ')).toMatch(/invulnerab/i);
    expect((um.skill1 ?? []).join(' ')).toMatch(/damage taken/i);
  });
});

describe('noah: GAPs (no engine primitive - nothing to assert)', () => {
  it.skip('skill1 10% chance on being attacked: no incoming-damage model and no probabilistic on-attacked trigger', () => {});
  it.skip('skill1 ally Damage Taken -8%: damageTakenPct is a BOSS debuff channel; an ally-scoped damage reduction has no consumer at scope lock', () => {});
  it.skip('skill2 Full Charge trigger identity: chargeCounter count 1 would express it, but both payloads are unobservable so nothing discriminates', () => {});
  it.skip('skill2 / burst Taunt + Attract: no aggro or threat model in the sim', () => {});
  it.skip('burst Invulnerable 3 sec: no HP pool - the boss deals no damage', () => {});
  it.skip('burst DEF +133.48% damage consequence: defPct is inert in v1 (kept for a future DEF/HP scaler consumer)', () => {});
});
```

---

## 6. S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver

### DIFF (driver vs blind)

- `skill1`: driver 0 block(s) vs blind 1 block(s).
  - BLIND-ONLY: {"slot": "skill1", "trigger": {"kind": "interval", "sec": 10}, "target": {"kind": "allies"}, "effects": [{"kind": "buff", "stat": "defPct", "value": 0, "durationSec": 10}]}
- `skill2`: driver 0 block(s) vs blind 1 block(s).
  - BLIND-ONLY: {"slot": "skill2", "trigger": {"kind": "shotFired"}, "target": {"kind": "enemy"}, "effects": []}
- `burst`: IDENTICAL (1 block(s)).
- `unmodeled.skill1`: same prose (entry-splitting differs only) | driver There is a 10% chance of activating when attacked. Affects all allies. Damage Taken ▼ 8% for 10 sec.
- `unmodeled.skill2`: same prose (entry-splitting differs only) | driver Activates when hitting a target with a Full Charge attack. Affects the target. Taunt for 2 sec. ATK ▼ 13.25% for 5 sec.
- `unmodeled.burst`: DIFFERS | driver Affects self. Attract: Taunt all enemies for 10 sec. | Affects all allies. Invulnerable for 3 sec.

### BLIND OVERRIDE (full)

```json
{
  "slug": "noah",
  "skill1": [
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
          "kind": "buff",
          "stat": "defPct",
          "value": 0,
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
        "kind": "enemy"
      },
      "effects": []
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
          "value": 133.48,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "There is a 10% chance of activating when attacked. Affects all allies.",
      "Damage Taken \u25bc 8% for 10 sec."
    ],
    "skill2": [
      "Activates when hitting a target with a Full Charge attack. Affects the target.",
      "Taunt for 2 sec.",
      "ATK \u25bc 13.25% for 5 sec."
    ],
    "burst": [
      "Attract: Taunt all enemies for 10 sec.",
      "Invulnerable for 3 sec."
    ]
  },
  "caveats": [
    "\u2691 Every value below is UNMEASURED. Noah is a pure-defensive Defender: her entire kit is damage-taken reduction, taunt, invulnerability and DEF. At scope lock (immortal boss, nobody takes damage) NONE of it moves damage \u2014 the modeled blocks exist for kit completeness and for a future DEF/HP consumer, not because they contribute output.",
    "\u2691 skill1 trigger is INVENTED: the kit says '10% chance of activating when attacked' \u2014 the sim has no incoming-damage channel, so there is no 'attacked' trigger in the schema. Encoded as a placeholder interval:10s with a ZERO-valued defPct so it can never move a number; the real gating (10% \u00d7 boss attack cadence) is unmodelable at scope. Recipe: if an incoming-attack trigger is ever added, re-key this block and set the real rate.",
    "\u2691 skill1 'Damage Taken \u25bc 8%' is a SELF/ALLY mitigation, NOT the offensive damageTakenPct debuff (which is a BOSS debuff where positive = boss takes more). Do NOT encode it as damageTakenPct on the enemy \u2014 that would be a large fabricated team-wide damage buff. Left unmodeled; the block carries a zero-valued stat only as a marker.",
    "\u2691 skill2 'ATK \u25bc 13.25%' is an ENEMY ATK debuff. The sim has no enemy ATK (the boss's damage output is unmodeled), so it is inert. Kept as an effect-free enemy-targeted block recording the real trigger (full-charge hit) for future consumers.",
    "\u2691 skill2 trigger fidelity: 'when hitting a target with a Full Charge attack' is a per-full-charge-shot trigger. The schema has no full-charge-hit trigger kind; shotFired is the nearest (Noah is RL/charge, so every shot is a charge shot at scope). Recipe: confirm from footage whether uncharged taps exist; if so the trigger over-fires \u2014 but with zero effects it is damage-neutral either way.",
    "\u2691 burst 'Invulnerable 3 sec' and both Taunt lines have no schema representation and no damage consequence at scope lock (boss is immortal, allies take no modeled damage, and taunt cannot redirect what is never dealt). Recorded verbatim in unmodeled.",
    "\u2691 cadence tuple (ammo 6 / reloadFrames 171 / chargeFrames 60 / hitsPerShot 2) is datamined and known-unreliable; it drives her own shot economy. Recipe: count rounds + reload gaps in a real fight recording.",
    "\u2691 noFb not set (default FB-by-timing ON) \u2014 Noah has no function-damage riders at all, so the field is moot here."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Noah (RL/Wind/Defender/Burst II) is an entirely defensive kit \u2014 there is not one offensive line in any of the three slots. S1: 10%-on-being-attacked team Damage Taken \u25bc8%/10s. S2: on a Full Charge hit, Taunt 2s + enemy ATK \u25bc13.25%/5s. Burst: self Taunt-all 10s, team Invulnerable 3s, team DEF \u25b2133.48%/10s. Only the burst DEF line maps to a real StatKey (defPct \u2014 documented inert in v1: self DEF does not affect own damage), and it is modeled for completeness/future consumers. Damage Taken \u25bc is ALLY MITIGATION and is deliberately NOT encoded as damageTakenPct (that stat is a boss debuff where positive = boss takes MORE \u2014 encoding it would fabricate a team-wide +8% damage buff out of a defensive line). Taunt and Invulnerable have no schema primitive and no damage consequence against an immortal, non-damaging scope-lock boss. Enemy ATK \u25bc is inert (no enemy ATK modeled). Expected sim contribution: her own weapon damage only.",
  "hasPierce": false
}
```

### S6 AUDIT + FLAGS

```json
{
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "10% chance of activating when attacked",
      "status": "SKIPPED",
      "effectOrReason": "No incoming-damage/attacked trigger exists in TriggerDef and the scope-lock boss deals no modeled damage. Placeholder interval block carries a ZERO value so it cannot move damage. \u2691 invented trigger."
    },
    {
      "slot": "skill1",
      "kitLine": "Affects all allies.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'allies'} (includes self)."
    },
    {
      "slot": "skill1",
      "kitLine": "Damage Taken \u25bc 8% for 10 sec",
      "status": "SKIPPED",
      "effectOrReason": "ALLY-side mitigation. The only near stat, damageTakenPct, is a BOSS debuff (positive = boss takes more) \u2014 using it would fabricate a team damage buff from a defensive line. No ally-mitigation StatKey exists; no damage consequence at scope (boss deals no modeled damage)."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates on Full Charge hit",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger shotFired (nearest available; Noah is a charge RL so every shot is a full charge at scope). \u2691 trigger-shape approximation, damage-neutral (block has no effects)."
    },
    {
      "slot": "skill2",
      "kitLine": "Affects the target.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'enemy'}."
    },
    {
      "slot": "skill2",
      "kitLine": "Taunt for 2 sec",
      "status": "SKIPPED",
      "effectOrReason": "No taunt/aggro primitive in EffectDef; boss targeting is unmodeled and the boss deals no damage \u2014 zero damage consequence."
    },
    {
      "slot": "skill2",
      "kitLine": "ATK \u25bc 13.25% for 5 sec",
      "status": "SKIPPED",
      "effectOrReason": "ENEMY ATK debuff. The sim models no enemy ATK (boss damage output unmodeled), so it is inert. Not encoded as atkPct \u2014 that stat scales an ALLY's ATK and a negative value on the enemy target would resolve to no units (resolveTargets({kind:'enemy'}) returns [])."
    },
    {
      "slot": "burst",
      "kitLine": "Affects self.",
      "status": "SKIPPED",
      "effectOrReason": "Scope header for the Taunt line only; the taunt itself is unmodelable (see next row)."
    },
    {
      "slot": "burst",
      "kitLine": "Attract: Taunt all enemies 10 sec",
      "status": "SKIPPED",
      "effectOrReason": "No taunt/aggro primitive; boss aggro is unmodeled and the boss deals no damage. No damage consequence."
    },
    {
      "slot": "burst",
      "kitLine": "Affects all allies.",
      "status": "IMPLEMENTED",
      "effectOrReason": "target {kind:'allies'} on the DEF block."
    },
    {
      "slot": "burst",
      "kitLine": "Invulnerable for 3 sec",
      "status": "SKIPPED",
      "effectOrReason": "No invulnerability primitive; nobody takes damage at scope lock so it is doubly inert."
    },
    {
      "slot": "burst",
      "kitLine": "DEF \u25b2 133.48% for 10 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff defPct 133.48, durationSec 10, trigger burstCast, target allies. defPct is documented inert in v1 (self DEF does not affect own damage) but is kept per the 'keep the stat buff even if the engine treats it inert' prior."
    }
  ],
  "flags": [
    {
      "field": "skill1[0].trigger",
      "estimate": "interval 10s placeholder with a ZERO-valued effect (no damage impact)",
      "reasoning": "Kit says '10% chance of activating when attacked' \u2014 TriggerDef has no incoming-attack kind, and the scope-lock boss's attack cadence against allies is unmodeled, so neither the trigger nor its 10% rate is derivable. Guessing a real cadence would be fabrication; the block exists only to record the ally target set.",
      "recipe": "If an incoming-attack channel is ever modeled, re-key to that trigger and set proc rate 0.10 \u00d7 boss attacks-per-window. Until then the line stays in `unmodeled`."
    },
    {
      "field": "skill1 'Damage Taken \u25bc 8%'",
      "estimate": "unmodeled (0 damage impact)",
      "reasoning": "Ally-side mitigation, not the offensive boss damageTakenPct. The taxonomy warns 'Damage Taken \u25b2 is a boss DEBUFF that benefits the team' \u2014 the CONVERSE (\u25bc on allies) is purely defensive and must not be routed through the same stat, which would invent a team-wide +8% Damage-Up.",
      "recipe": "Only becomes live if an ally-HP/mitigation model is added. No measurement can make it offensive."
    },
    {
      "field": "skill2 'ATK \u25bc 13.25%'",
      "estimate": "unmodeled (0 damage impact)",
      "reasoning": "Debuffs the ENEMY's ATK. The sim has no enemy ATK stat and resolveTargets({kind:'enemy'}) returns no entities, so any encoding is a no-op; recording it as an effect would be misleading.",
      "recipe": "N/A at scope lock \u2014 revisit only if boss offense is ever modeled."
    },
    {
      "field": "skill2[0].trigger (full-charge-hit fidelity)",
      "estimate": "shotFired",
      "reasoning": "'when hitting a target with a Full Charge attack' is an on-hit, per-full-charge trigger. No full-charge-hit TriggerDef kind exists; shotFired is nearest and Noah is a charge RL (chargeFrames 60), so at scope every shot should be a full charge. Damage-neutral because the block carries no effects.",
      "recipe": "Read a Noah recording for uncharged taps; if present, the trigger over-fires and would need a charge gate before any effect is ever attached to this block."
    },
    {
      "field": "burst DEF 133.48% (defPct)",
      "estimate": "133.48% for 10s to all allies on burst cast",
      "reasoning": "Value + duration are literal kit text (not a flag on magnitude). Flagged because defPct is documented INERT in v1 \u2014 the block moves zero damage today and its only purpose is completeness/a future consumer. Trigger is burstCast (Noah's OWN burst block, self-mode framing) rather than fullBurstEnter, per trigger-identity fidelity.",
      "recipe": "No measurement needed for the value; if DEF ever gains an offensive consumer, verify the buff lands on all 5 allies at cast time via a buffApply assertion (stat defPct, value 133.48)."
    },
    {
      "field": "cadence tuple (ammo 6 / reloadFrames 171 / chargeFrames 60 / hitsPerShot 2)",
      "estimate": "as datamined",
      "reasoning": "ALWAYS-\u2691 field 1: rate_of_fire / reloadFrames are known-unreliable datamine fields, and they set Noah's entire personal output since she has no offensive kit lines. hitsPerShot 2 on an RL also raises the split-vs-merge question (\u2691 field 5) \u2014 whether the 2 hits are one merged popup or two.",
      "recipe": "Count rounds fired + reload gaps across one 180s recording; read popup pairs per shot to settle the 2-hit split-vs-merge."
    },
    {
      "field": "taunt / invulnerable primitives",
      "estimate": "unmodeled",
      "reasoning": "EffectDef has no taunt/aggro or invulnerability kind, and both are damage-irrelevant against an immortal boss that deals no modeled damage to allies. Recorded verbatim in `unmodeled` rather than approximated.",
      "recipe": "N/A \u2014 these require a defensive/aggro model that is explicitly out of v1 scope."
    }
  ]
}
```

---

## 7. DRIVER IMPLEMENTATION

### scripts/tests/units/noah.test.ts

```typescript
// PER-UNIT KIT SPEC — `noah` (Noah, RL/Wind/Defender/Burst II, Pilgrim, cd 40s, ammo 6,
// reloadFrames 171, chargeFrames 60, hitsPerShot 2, burstGaugePerShot 1.5 (column dropped —
// gauge from data/gauge-per-shot.json RL modal)). Kit-autonomy gauntlet 2026-08-03.
//
// Noah is a PURE TANK kit — taunt / damage-taken / invulnerability / DEF, and NOTHING else:
// zero damage lines and zero weapon-state modifiers in the whole kit. The sim models no HP
// pool, no incoming damage and no enemy targeting, so seven of her eight kit lines are
// out-of-domain (UNMODELED, verbatim); her single in-domain line is the burst all-ally
// DEF ▲ 133.48% for 10 sec, encoded as the inert `defPct` buff (marciana convention —
// marciana's burst DEF line is the same construction; noah's is the LITERAL form, a plain
// self-DEF percentage, so no caster-scaling approximation caveat applies). Unlike marciana's
// fixture (sole B2 → burstCast vs fullBurstEnter only structurally pinnable), this fixture
// fields a COMPETING B2 (naga), so the own-cast pin is discriminated BEHAVIORALLY.
//
// Kit (data/characters.json → characters.noah.skills, SL10):
//   S1 ■ 10% chance when attacked → all allies:
//        Damage Taken ▼ 8% for 10 sec                                                   [U1 gap]
//   S2 ■ Full Charge attack hits the target → the target:
//        Taunt for 2 sec                                                                [U2 gap]
//        ATK ▼ 13.25% for 5 sec                                                         [U2 gap]
//   BU ■ self:
//        Attract: Taunt all enemies for 10 sec                                          [U3 gap]
//      ■ all allies:
//        Invulnerable for 3 sec                                                         [U4 gap]
//        DEF ▲ 133.48% for 10 sec                                                       [D1]
//
// One assertion group per kit line (N1..N4 + structural pins), asserted against the SHIPPED
// override loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS
// (the nearest-wrong model each assertion must discriminate against) — never to supply the
// encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (noah's one modeled line is offensively inert, so TOTALS
// alone cannot discriminate; the load-bearing evidence is the EVENT LOG — the defPct buffApply
// channel — plus the two neutrality proofs that the rest of the kit moves nothing):
//   N1  damage neutrality: her own total (and the WHOLE team's) is byte-identical with her kit
//       zeroed, in the same comp AND solo on the bare-weapon basis — while a defPct→
//       attackDamagePct counterfactual MOVES the team, so the inertness is live, not a vacuous
//       "nothing happens".
//   N2  the burst DEF channel is kit-complete: one defPct-133.48 buffApply landing per own cast
//       per ALLY (noahBursts × 5), all five slots per cast frame, 600-frame/10s expiry — yet
//       damage-INERT (stripping the line leaves every unit byte-identical).
//   N3  own-cast keying (burstCast, not fullBurstEnter) — the #1 trap for a Burst-II unit —
//       discriminated BEHAVIORALLY: naga (CD-20 B2) opens chains noah does not cast, so
//       fullBursts > noahBursts; a fullBurstEnter encoding fires defPct on every Full Burst and
//       over-fires the channel by exactly those chains. Nearest-wrong also includes target
//       self (1 landing per cast instead of 5).
//   N4  the seven out-of-domain lines live VERBATIM in `unmodeled` (never an `ignored` drop)
//       and are never fabricated: the ONLY buff stat noah originates is defPct — no shield
//       encoding of Invulnerable (that would open shieldedUntilFrame windows and falsely
//       satisfy teammates' requiresShielded gates), no targetStatus for the taunts, no boss
//       debuff for the Damage-Taken / ATK ▼ lines; their magnitudes (8 / 13.25) never surface
//       as buff values from her.
//
// FIXTURE. Slot order: tia 0 / noah 1 / naga 2 / asuka 3 / 2b 4. Boss Fire. 180s,
// deterministic (no seed). tia (B1, 40s CD, self-burstCdr → opens every chain) / noah (B2,
// 40s — the unit under test) / naga (B2, 20s — the COMPETING B2: her chains complete Full
// Bursts noah did not cast, which is what makes N3 behavioral) / asuka (B3, 40s) / 2b (B3,
// 40s — the second B3 so the same-CD pair alternates and every chain completes). NO isolation
// patches are needed: every assertion is either noah-scoped (casterIdx filter) or a totals
// equality across runs in which ONLY noah's override varies — and defPct is provably unread
// by the engine (no consumer exists in v1), so teammates' kits cannot confound either claim.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponComp,
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['tia', 'noah', 'naga', 'asuka', '2b'];
/** Slot order: tia 0 / noah 1 / naga 2 / asuka 3 / 2b 4. */
const NOAH = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'noah',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactual patches (nearest-wrong models) -------------------------------------------
/** N2 inertness baseline: the burst DEF line stripped entirely. */
const noahNoDef = withPatchedOverride('noah', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('noah burst missing — fixture is stale');
  }
  ov.burst = [];
});
/** N1 counterfactual: the inert defPct re-encoded as a damage stat (must MOVE totals). */
const noahDefAsDamage = withPatchedOverride('noah', (ov) => {
  const e = ov.burst
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('noah burst defPct effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});
/** N3 counterfactual: the burst block keyed to fullBurstEnter (the Burst-II trap — fires on
 *  every Full Burst regardless of who cast stage 2; naga's chains must over-fire it). */
const noahFbEnter = withPatchedOverride('noah', (ov) => {
  const b = (ov.burst ?? []).find((x: any) =>
    x.effects.some((e: any) => e.stat === 'defPct')
  );
  if (!b) {
    throw new Error('noah burst defPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** N3 counterfactual: the all-ally grant narrowed to SELF (1 landing per cast instead of 5). */
const noahSelfOnly = withPatchedOverride('noah', (ov) => {
  const b = (ov.burst ?? []).find((x: any) =>
    x.effects.some((e: any) => e.stat === 'defPct')
  );
  if (!b) {
    throw new Error('noah burst defPct block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDef = run({ noah: noahNoDef });
const defAsDamage = run({ noah: noahDefAsDamage });
const fbEnter = run({ noah: noahFbEnter });
const selfOnly = run({ noah: noahSelfOnly });
const bareInTeam = run({ noah: bareWeaponOverride('noah') });

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('noah') as any;
if (!shipped) {
  throw new Error('noah has no override on disk — fixture is stale');
}
const allBlocks = [
  ...(shipped.skill1 ?? []),
  ...(shipped.skill2 ?? []),
  ...(shipped.burst ?? []),
];

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const noahBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === NOAH);
/** The D1 channel: noah's defPct 133.48 landings (one per own cast per ally). */
const defLandings = (evs: SimEvent[]) =>
  noahBuffs(evs).filter((b) => b.stat === 'defPct' && b.value === 133.48);
const noahBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'noah').length;
const nagaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'naga').length;
const fullBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

describe('noah — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: both B2s cast, and every chain completes', () => {
    // Non-vacuity gate for every channel below. The dual same-CD B3 pair (asuka/2b) alternates
    // the stage-3 slot, so fullBursts tracks the chain count, and the B2 competition (naga
    // CD 20 vs noah CD 40) splits the chains between them.
    expect(noahBursts(base.events)).toBeGreaterThan(0);
    expect(nagaBursts(base.events)).toBeGreaterThan(0);
    expect(fullBursts(base.events)).toBe(
      noahBursts(base.events) + nagaBursts(base.events)
    );
  });

  it('DIV non-vacuity: at least one Full Burst opens on a chain noah did NOT cast', () => {
    // The burstCast-vs-fullBurstEnter discrimination below needs fullBursts to strictly exceed
    // noah's own casts — naga's chains must complete.
    expect(fullBursts(base.events)).toBeGreaterThan(noahBursts(base.events));
  });

  it('noah charges her RL and deals weapon damage', () => {
    // Her own total > 0 guards the inertness assertions (else "unchanged" would be trivially
    // true on a zero). RL: 6-round charge magazine, hitsPerShot 2 (impact + splash).
    expect(unitOf(base.res, 'noah').totalDamage).toBeGreaterThan(0);
  });
});

describe('N1 — damage neutrality: her kit contributes nothing to any unit\u2019s damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // Zero damage lines and zero weapon-state modifiers in the whole kit: with noah's kit
    // swapped for the empty kit, her own total must not move a point (the in-team bare run
    // keeps tia/naga/asuka/2b identical, so this isolates noah's own contribution).
    expect(unitOf(base.res, 'noah').totalDamage).toBe(
      unitOf(bareInTeam.res, 'noah').totalDamage
    );
  });

  it('the WHOLE TEAM is byte-identical with her kit zeroed (defPct has no consumer in v1)', () => {
    // Stronger than the own-total claim: her only modeled effect is defPct, which the engine
    // reads nowhere (no incoming damage, no DEF-scaling stat), so not even her tandem surface
    // can move a teammate. The faithful claim for this kit is total damage-neutrality.
    expect(totals(bareInTeam.res)).toEqual(totals(base.res));
  });

  it('own total is byte-identical on the solo bare-weapon basis (file-level neutrality)', () => {
    // noah is NOT one of the six clean-weapon basis cells (harness CLEAN_WEAPON_SLUGS), so this
    // is a per-unit mirror of that pin rather than a CW1 membership claim: the committed
    // override sims byte-identical to the empty kit solo on the neutral-Iron basis.
    const bare = unitOf(runComp(bareWeaponComp(['noah'])), 'noah').totalDamage;
    const withKit = unitOf(
      runComp(bareWeaponComp(['noah'], { overrides: { noah: shipped } })),
      'noah'
    ).totalDamage;
    expect(withKit).toBe(bare);
  });

  it('DISCRIMINATING: re-encoding the inert defPct as a damage stat MOVES the team', () => {
    // Proves the neutrality above is live, not a vacuous "nothing happens": a defPct→
    // attackDamagePct swap is the nearest wrong "make the burst do something" model, and it
    // must change totals — i.e. the shipped inertness is one that model provably fails.
    expect(totals(defAsDamage.res)).not.toEqual(totals(base.res));
  });
});

describe('N2 — D1 burst DEF \u25b2 133.48% for 10s, all allies: kit-complete yet damage-inert', () => {
  it('lands once per own cast per ALLY (noahBursts \u00d7 5), all five slots per cast frame', () => {
    const defBuffs = defLandings(base.events);
    expect(defBuffs.length).toBe(noahBursts(base.events) * SLUGS.length);
    const perFrame = new Map<number, Set<number | null>>();
    for (const b of defBuffs) {
      (
        perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
      ).add(b.targetIdx);
    }
    expect(perFrame.size).toBe(noahBursts(base.events));
    for (const [frame, holders] of perFrame) {
      expect(
        holders.size,
        `frame ${frame} reached ${holders.size} allies`
      ).toBe(SLUGS.length);
    }
  });

  it('is time-bounded at 10 sec (600 frames), not permanent or round-counted', () => {
    const defBuffs = defLandings(base.events);
    expect(defBuffs.length).toBeGreaterThan(0);
    for (const b of defBuffs) {
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(b.durationShots).toBeNull();
    }
  });

  it('is damage-INERT: stripping the burst line leaves every unit byte-identical', () => {
    // defPct is inert in v1 (self DEF never enters damage dealt; there is no incoming damage).
    expect(totals(noDef.res)).toEqual(totals(base.res));
  });
});

describe('N3 — own-cast keying: burstCast, not fullBurstEnter (the Burst-II trap)', () => {
  it('fires on noah\u2019s OWN casts only (landings track noahBursts, not fullBursts)', () => {
    expect(defLandings(base.events)).toHaveLength(
      noahBursts(base.events) * SLUGS.length
    );
  });

  it('DISCRIMINATING: a fullBurstEnter encoding over-fires by exactly naga\u2019s chains', () => {
    // naga opens chains noah did not cast (fixture sanity above proves at least one), so the
    // trap encoding grants defPct on EVERY Full Burst: landings jump to fullBursts × 5.
    expect(defLandings(fbEnter.events)).toHaveLength(
      fullBursts(fbEnter.events) * SLUGS.length
    );
    expect(defLandings(fbEnter.events).length).toBeGreaterThan(
      defLandings(base.events).length
    );
  });

  it('DISCRIMINATING: a self-only target narrows the channel to 1 landing per cast', () => {
    expect(defLandings(selfOnly.events)).toHaveLength(
      noahBursts(selfOnly.events)
    );
  });
});

describe('N4 — the seven out-of-domain lines are documented, not dropped or fabricated', () => {
  it('S1 lives VERBATIM in `unmodeled` (10% attacked clause + Damage Taken \u25bc 8%)', () => {
    const s1 = shipped.unmodeled?.skill1?.join(' ') ?? '';
    expect(s1).toContain('10% chance of activating when attacked');
    expect(s1).toContain('Damage Taken ▼ 8% for 10 sec');
  });

  it('S2 lives VERBATIM in `unmodeled` (Taunt 2s + ATK \u25bc 13.25% for 5s)', () => {
    const s2 = shipped.unmodeled?.skill2?.join(' ') ?? '';
    expect(s2).toContain('Taunt for 2 sec');
    expect(s2).toContain('ATK ▼ 13.25% for 5 sec');
  });

  it('the burst Attract + Invulnerable lines live VERBATIM in `unmodeled`', () => {
    const bu = shipped.unmodeled?.burst?.join(' ') ?? '';
    expect(bu).toContain('Attract: Taunt all enemies for 10 sec');
    expect(bu).toContain('Invulnerable for 3 sec');
  });

  it('never an `ignored` drop, and nothing fabricated in place of the gaps', () => {
    expect((shipped as any).ignored).toBeUndefined();
    // The ONLY buff stat noah originates is defPct: no shield encoding of Invulnerable (that
    // would open shieldedUntilFrame windows and falsely satisfy requiresShielded gates), no
    // targetStatus for the taunts, no boss debuff for Damage Taken ▼ / ATK ▼.
    expect([...new Set(noahBuffs(base.events).map((b) => b.stat))]).toEqual([
      'defPct',
    ]);
  });

  it('the gap magnitudes never surface as buff values from noah', () => {
    expect(noahBuffs(base.events).some((b) => b.value === 8)).toBe(false);
    expect(noahBuffs(base.events).some((b) => b.value === 13.25)).toBe(false);
  });

  it('133.48 never surfaces as an atkPct buff from ANY caster (S2b stat-confusion head)', () => {
    // The nearest-wrong twin of the defPct line is emitting it as atkPct — a catastrophic
    // +133% team-ATK over-credit. 133.48 is distinctive enough to pin globally.
    expect(
      buffs(base.events).some((b) => b.stat === 'atkPct' && b.value === 133.48)
    ).toBe(false);
  });
});

describe('structural pins (kit-shape invariants)', () => {
  it('exactly ONE block in the whole override — the burst DEF grant', () => {
    expect(allBlocks.length).toBe(1);
    expect(allBlocks[0].slot).toBe('burst');
    expect(allBlocks[0].effects.length).toBe(1);
    expect(allBlocks[0].trigger).toEqual({ kind: 'burstCast' });
    expect(allBlocks[0].target).toEqual({ kind: 'allies' });
    expect(allBlocks[0].effects[0]).toEqual({
      kind: 'buff',
      stat: 'defPct',
      value: 133.48,
      durationSec: 10,
    });
  });

  it('skill1 and skill2 are empty (every line in them is out-of-domain in v1)', () => {
    expect(shipped.skill1 ?? []).toEqual([]);
    expect(shipped.skill2 ?? []).toEqual([]);
  });

  it('no damage or weapon-state effect kind exists anywhere in the override', () => {
    for (const b of allBlocks) {
      for (const e of b.effects) {
        expect(e.kind).toBe('buff');
        expect(e.stat).toBe('defPct');
      }
    }
  });
});
```

### src/skills/overrides/noah.json

```json
{
  "slug": "noah",
  "skill1": [],
  "skill2": [],
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
          "value": 133.48,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "There is a 10% chance of activating when attacked. Affects all allies. Damage Taken ▼ 8% for 10 sec."
    ],
    "skill2": [
      "Activates when hitting a target with a Full Charge attack. Affects the target. Taunt for 2 sec. ATK ▼ 13.25% for 5 sec."
    ],
    "burst": [
      "Affects self. Attract: Taunt all enemies for 10 sec.",
      "Affects all allies. Invulnerable for 3 sec."
    ]
  },
  "caveats": [
    "⚑ CADENCE TUPLE (ALWAYS-⚑): RL charge cycle — chargeFrames 60 / ammo 6 / reloadFrames 171 / hitsPerShot 2 / rate_of_fire 60 — shipped from datamine; affects her OWN shots only (weapon damage + burst-gauge feed). She has NO datamined row in data/gauge-per-shot.json, so her gauge accrual uses the RL modal fallback (280/trigger × the RL-charge focus multiplier) — the cadence of her burstCast keying (and therefore of the defPct channel below) inherits that estimate. No kit line keys off her shots (S2's full-charge-hit clause is UNMODELED), so a wrong cadence rescales nothing kit-side — only the channel's firing count.",
    "Burst DEF line ('DEF ▲ 133.48% for 10 sec', all allies) is encoded as defPct — the LITERAL form this time: the kit grants each ally a percentage of their OWN DEF, which is exactly what defPct scales (contrast marciana's burst DEF line, which is caster-DEF-scaled and therefore only a semantic approximation). defPct is deliberately INERT in v1: self DEF never enters damage dealt and there is no incoming damage, so the grant moves no unit's total — kept for kit completeness (marciana's inert-defPct convention) and for any future DEF consumer/scaler.",
    "burstCast keying (own-cast prior, marciana/folkwang convention): the DEF grant is noah's OWN Burst II block — keying it to fullBurstEnter would over-fire the channel on every Full Burst a competing Burst II opens (noah.test.ts N3 discriminates this behaviorally against the fixture's CD-20 B2 naga, whose chains complete without noah casting).",
    "S1 'Damage Taken ▼ 8%' UNMODELED: the clause is a DEFENSIVE ally-side damage-taken reduction (▼ direction, all-ally target) — the schema's only damage-taken stat is damageTakenPct, a BOSS debuff where positive = boss takes MORE, so it cannot express this line without inverting both target and direction (the nearest-wrong model the S2b reviewer independently flagged: a boss-held -8% would drag the whole board down 8%). The 10%-when-attacked activation also has no trigger primitive (no attacked-trigger, no RNG gate) and the v1 boss attacks nobody.",
    "S2 'Taunt for 2 sec' + 'ATK ▼ 13.25% for 5 sec' UNMODELED: v1 models no aggro/targeting and no enemy stats (the boss deals no damage, so an enemy ATK ▼ has no consumer). NOT encoded as a targetStatus (that channel is for kit-NAMED gateable statuses such as d-killer-wife's Wipe Out; fabricating a 'Taunt' status would invent a gate no kit line asks for — folkwang precedent), NOT as a negative atkPct on self/allies (the ▼ is on THE TARGET — the enemy). The full-charge-hit activation clause has no trigger primitive either.",
    "Burst 'Attract: Taunt all enemies for 10 sec' UNMODELED: same no-aggro ruling as S2's taunt.",
    "Burst 'Invulnerable for 3 sec' UNMODELED: v1 models no HP pool / death / incoming damage. Deliberately NOT encoded as a `shield` effect (the nearest-primitive trap, S2b-flagged): a shield encoding would open the targets' shieldedUntilFrame windows and fire teammates' 'shielded' triggers / requiresShielded gates — fabricating a synergy surface the kit never grants. Invulnerability is a distinct named mechanic from Shield in kit vocabulary (marciana's Storage precedent).",
    "Zero damage lines and zero weapon-state modifiers in the whole kit: noah's entire board footprint is ONE inert defPct channel on her own burst casts. Her personal damage is weapon-only (RL charge, hitsPerShot 2). She is damage-neutral by the same proof as the six clean-weapon basis units (noah.test.ts N1: own AND team totals byte-identical vs the empty kit, solo and in-comp), though she is NOT one of the six basis cells (the harness list is owner-fixed)."
  ],
  "note": "noah (Noah) — RL / Defender / Wind / Burst II, Pilgrim, cd 40s, ammo 6, reloadFrames 171, chargeFrames 60, hitsPerShot 2, normalMult 64.04 / core 200 / charge 250. A PURE TANK kit — taunt / damage-taken reduction / invulnerability / DEF, and nothing else. ZERO damage lines and ZERO weapon-state modifiers in the whole kit: this unit cannot move her own damage or any teammate's. Her only board footprint is the burst all-ally DEF grant; her in-game value (threat control + team survivability) is entirely outside the damage sim's scope. || MODELED TODAY: (1) Burst 'U Mad Bro?' line 'Affects all allies. DEF ▲ 133.48% for 10 sec.' → burstCast-keyed (her OWN cast — she is Burst II; fullBurstEnter would over-fire on the chains a competing B2 opens, pinned BEHAVIORALLY in noah.test.ts N3 against naga's CD-20 chains), target allies, buff defPct 133.48 durationSec:10. The LITERAL form of the marciana convention: a plain self-DEF percentage (no caster-scaling approximation), deliberately inert in v1 — kept for kit completeness and any future DEF consumer. || DELIBERATELY UNMODELED (verbatim in `unmodeled`, never an `ignored` drop): S1 'There is a 10% chance of activating when attacked. Affects all allies. Damage Taken ▼ 8% for 10 sec.' (no attacked-trigger / RNG gate; no ally damage-taken stat — damageTakenPct is the boss debuff with inverted target+direction; measurement-gated on v1 ever modeling incoming damage); S2 'Activates when hitting a target with a Full Charge attack. Affects the target. Taunt for 2 sec. ATK ▼ 13.25% for 5 sec.' (no full-charge-hit trigger, no aggro model, no enemy stats); burst 'Affects self. Attract: Taunt all enemies for 10 sec.' (no aggro model) and 'Affects all allies. Invulnerable for 3 sec.' (no HP/death model; NOT shield-encoded — that would fabricate shieldedUntilFrame windows and fire teammates' shield-gated consumers). || EVIDENCE TIER: all live values are kit-text-literal (133.48 DEF, 10s window; 8 / 13.25 / 10% magnitudes recorded verbatim in unmodeled); the 40s burst CD is datamine-literal; the estimated quantities are the RL cadence tuple (datamine-shipped, ALWAYS-⚑) and her gauge accrual (no datamined gauge-per-shot row — RL modal fallback). || TIER 1 (zero damage lines, zero weapon-state modifiers; the single modeled line is an inert stat buff with no scoped buffs, no round counts, no status gates; the burstCast-vs-fullBurstEnter pin is behaviorally discriminated, not just structural). Faithful>fit; measured>fudge. || Kit-autonomy gauntlet 2026-08-03."
}
```
