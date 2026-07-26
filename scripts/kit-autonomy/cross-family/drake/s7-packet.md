# S7 RECONCILING JUDGE — drake (Drake, SG/Attacker/Fire/Burst III)

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

## MECHANICS SSOT

See docs/data/damage-calculation.md and docs/data/game-mechanics.md (included below).

### damage-calculation.md (excerpt — multiplicative buckets)

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

### game-mechanics.md (excerpt — burst rotation, hitCount, fullBurstEnter)

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


---

## GROUND TRUTH — drake kit prose + base stats

```json
{
  "name": "Drake",
  "weapon": "SG",
  "burst": "III",
  "class": "Attacker",
  "element": "Fire",
  "ammo": 9,
  "reloadFrames": 111,
  "hitsPerShot": 10,
  "normalAttackMultiplier": 214.3,
  "burstCooldownSec": 40,
  "treasure": true,
  "skills": {
    "skill1": "■ Activates when entering Full Burst. Affects all allies.\nHit Rate ▲ 20.09% for 10 sec.\nATK ▲ 11.85% for 10 sec.\n■ Activates when entering Full Burst. Affects all allies with a Shotgun.\nATK ▲ 63.88% for 10 sec.\nMax Ammunition Capacity ▲ 50.14% for 10 sec.",
    "skill2": "■ Activates after 10 normal attack(s). Affects 3 enemy unit(s) with the lowest remaining HP.\nDeals 98.55% of final ATK as damage.\n■ Activates after 5 normal attack(s). Affects 1 enemy unit(s) with the lowest remaining HP.\nDeals 201.6% of final ATK as damage.",
    "burst": "■ Affects enemies within attack range.\nDeals 3009.6% of final ATK as damage. \n■ Affects self.\nMax Ammunition Capacity ▲ 72.18% for 10 sec.\nAttack Damage ▲ 31.68% for 10 sec."
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
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
    "resourceId": 101
  }
}
```


---

## S2b REVIEW (claude-fable-5)

```json
{
  "slug": "drake",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "FB enter, all allies: Hit Rate ▲ 20.09%",
      "disposition": "FAITHFUL",
      "scope": "generic hit-rate buff, all attacks",
      "durationSemantics": "durationSec: 10 (literal 'for 10 sec')",
      "triggerIdentity": "fullBurstEnter (literal 'when entering Full Burst' — ANY team FB, incl. co-B3 helm's rotations), no gate",
      "targetSet": "allies (all, INCLUDING self)",
      "nearestWrongModel": "keyed to burstCast (drake's own bursts only) — in the control comp helm is a co-B3, so half the FBs would silently lose the buff; or hitRatePct dropped as 'defensive/no damage'",
      "distinguishingAssertion": "onEvent buffApply {stat:'hitRatePct', value:20.09} fires at EVERY fullBurstStart (count of these applies per unit === count of fullBurstStart events, including rotations where helm cast the B3), targeting all 4 slots; zeroing the line lowers drake's core-derived damage (hrCoreMult live)",
      "inertness": "must NOT apply outside FB windows; value emitted is the raw 20.09 pct, not a flat-resolved number",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter, all allies: ATK ▲ 11.85%",
      "disposition": "FAITHFUL",
      "scope": "generic ATK, all attack types",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "fullBurstEnter, no gate",
      "targetSet": "allies including self",
      "nearestWrongModel": "encoded as casterAtkPct (flat add of drake's ATK) instead of atkPct (scales each target's own ATK) — buffApply would emit a flat ATK number, over/under-crediting per target",
      "distinguishingAssertion": "buffApply {stat:'atkPct', value:11.85} (raw percentage, NOT a flat-resolved ATK figure) on every fullBurstStart, applied to liter, crown, helm, and drake alike",
      "inertness": "no application outside FB; does not stack-refresh into >11.85 effective",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter, SG allies: ATK ▲ 63.88%",
      "disposition": "FAITHFUL",
      "scope": "generic ATK, weapon-typed target filter",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "fullBurstEnter, no gate",
      "targetSet": "alliesOfWeapon SG, class-blind, INCLUDING self (no 'except self' clause)",
      "nearestWrongModel": "excludeSelf:true (drake loses her own biggest ATK buff), or target widened to all allies (over-credits liter/crown/helm)",
      "distinguishingAssertion": "in controlComp('drake') — where drake is the ONLY SG — buffApply {stat:'atkPct', value:63.88} has targetSlug 'drake' and NO applies to liter/crown/helm; it fires on every fullBurstStart",
      "inertness": "non-SG units must receive zero from this block; stacks additively with the 11.85 all-ally line on drake",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter, SG allies: Max Ammo ▲ 50.14%",
      "disposition": "FAITHFUL",
      "scope": "weapon-state modifier — gates shot count, IS damage (taxonomy #6)",
      "durationSemantics": "durationSec: 10; window expiry restores base cap",
      "triggerIdentity": "fullBurstEnter, no gate",
      "targetSet": "alliesOfWeapon SG including self",
      "nearestWrongModel": "dropped as 'QoL/no damage', or encoded maxAmmoFlat 50 instead of maxAmmoPct 50.14",
      "distinguishingAssertion": "buffApply {stat:'maxAmmoPct', value:50.14, targetSlug:'drake'} at each fullBurstStart; during a helm-cast FB (skill1 live, burst self-buff NOT live) drake's magazine is floor/round of 9×1.5014 ≈ 13, observable as longer shot runs between reload events inside the window vs outside; nulling the line increases drake's reload count and lowers her total",
      "inertness": "no ammo change for non-SG allies; no effect outside the 10s windows",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "after 10 normal attack(s): 98.55% dmg",
      "disposition": "FAITHFUL",
      "scope": "flat-damage rider off normal-attack counter; FB by timing (default noFb OFF), crit-eligible at sheet rate, NO core (text never says core)",
      "durationSemantics": "instant hit, no duration",
      "triggerIdentity": "hitCount count:10 — counts ROUNDS (trigger pulls; SG spends 1 round/pull), NOT pellets",
      "targetSet": "enemy ×3 lowest-HP — single-boss sim collapses to ONE hit on the boss",
      "nearestWrongModel": "counter fed by PELLETS: hitsPerShot=10 means the 10-count would fire EVERY trigger pull — a clean 10× over-credit; secondary misread: ×3 multiplication (295.65% or 3 events) against the lone boss",
      "distinguishingAssertion": "damage events with mult 98.55 number exactly floor(totalShots/10) — i.e. once per 10 shot events, ONE event per proc; RED if their count ≈ shot count (pellet misread) or if any proc emits 3 events / a 295.65 mult",
      "inertness": "proc count must not scale with hitsPerShot; no core bucket on these hits",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "after 5 normal attack(s): 201.6% dmg",
      "disposition": "FAITHFUL",
      "scope": "flat-damage rider; FB by timing; crit at sheet rate; no core",
      "durationSemantics": "instant hit",
      "triggerIdentity": "hitCount count:5, rounds not pellets; independent counter running alongside the 10-count",
      "targetSet": "enemy ×1 lowest-HP → the boss",
      "nearestWrongModel": "pellet-fed counter (fires 2× per trigger pull), or the two skill2 counters merged into one shared counter so the 10th round fires only one of them",
      "distinguishingAssertion": "201.6-mult events occur once per 5 shot events, and on every 10th shot BOTH a 201.6 and a 98.55 event land (10 is a multiple of 5 — co-fire is the faithful signature); RED if the 10th shot yields only one proc or if 201.6 events ≈ 2× shot count",
      "inertness": "cadence independent of maxAmmo buffs except through shots/sec; unaffected by FB entry (no countInFb in prose)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 3009.6% of final ATK, in range",
      "disposition": "FAITHFUL",
      "scope": "burst nuke, AoE over 'enemies within attack range' — one boss → one hit",
      "durationSemantics": "instant on cast; 40s burst CD",
      "triggerIdentity": "burstCast (damage line inside her own burst block) — always FB-exempt: the cast lands before the FB window opens (methodology #9)",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "+50% Full-Burst major applied to the nuke (fbMajorApplied true), or keyed to fullBurstEnter so it also fires on helm-cast rotations she never bursts in",
      "distinguishingAssertion": "exactly one damage event with mult 3009.6 per DRAKE burstCast event (none on helm-cast rotations), and that event has fbMajorApplied === false / lands pre-FB",
      "inertness": "no per-enemy multiplication; count of nukes === count of drake's own burstCast events, not fullBurstStart events",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "self: Max Ammo ▲ 72.18% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "weapon-state modifier, self only — gates shot count",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "burstCast (self mode in her OWN burst block) — fires ONLY on rotations drake casts, NOT on every team FB",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter keying — with helm co-B3 in controlComp this over-credits every helm rotation with drake's self ammo buff",
      "distinguishingAssertion": "buffApply {stat:'maxAmmoPct', value:72.18, targetSlug:'drake'} appears ONLY in rotations containing a drake burstCast; in those windows it stacks additively with skill1's 50.14 → cap ≈ 9×(1+0.5014+0.7218) = 20 rounds, vs ≈13 in helm-cast FBs — the two window shapes must differ",
      "inertness": "zero applies on helm-cast rotations; no ally receives it",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "self: Attack Damage ▲ 31.68% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "'Attack Damage' = Damage Up bucket (attackDamagePct), all her hits incl. the skill2 riders landing in-window",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "burstCast (own-burst self mode)",
      "targetSet": "self",
      "nearestWrongModel": "encoded as atkPct (wrong bucket — ATK scaling instead of additive Damage-Up, different dilution vs the big 63.88 ATK line), or fullBurstEnter keying",
      "distinguishingAssertion": "buffApply {stat:'attackDamagePct', value:31.68} (NOT 'atkPct'), target self, only on drake-cast rotations; RED if stat reads atkPct or if it appears on helm-cast FBs",
      "inertness": "no team-wide application; must not multiply into the ATK stat",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:FB-enter allies Hit Rate 20.09",
    "skill1:FB-enter allies ATK 11.85",
    "skill1:FB-enter SG-allies ATK 63.88",
    "skill1:FB-enter SG-allies MaxAmmo 50.14",
    "skill2:hitCount10 flat 98.55",
    "skill2:hitCount5 flat 201.6",
    "burst:nuke 3009.6",
    "burst:self MaxAmmo 72.18",
    "burst:self AttackDamage 31.68"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Every line is modelable; unmodeled arrays should be EMPTY — a driver parking any of these nine lines in `unmodeled` is itself a finding. Expected shared-prior misreads, in priority order: (1) SG pellet-vs-round counting on skill2 — hitsPerShot=10 makes the pellet misread fire the 10-count on EVERY trigger pull (10x over-credit) and the 5-count twice per pull; the proc-count-vs-shot-count assertion is the single most load-bearing check for this unit. (2) The trigger split INSIDE one kit: skill1 is fullBurstEnter (fires on helm-cast rotations too) while the burst self-buffs are burstCast-only — controlComp includes helm as co-B3 precisely so these diverge; a driver who keys both the same way is wrong on one of them, observable as identical vs differing ammo-cap window shapes (13-round vs 20-round magazines). (3) Ammo lines dropped as non-damage (taxonomy #6) — both maxAmmoPct lines gate shots fired and must move drake's total when nulled. (4) The 3-lowest-HP skill2 line multiplied x3 against the single boss — 'lowest remaining HP' target resolution is a documented single-boss stand-in, damage lands once. (5) Burst nuke given the +50% FB major — burst-cast damage is FB-exempt by timing. Magnitudes are all kit-literal (DATAMINED); the only CALIBRATED-adjacent element is the engine's HitRate->core conversion slope behind hitRatePct (measured-only engine constant, not a kit value) — tests should assert the 20.09 buffApply, not a specific core-rate delta. Base-stat sanity for whole-picture checks: 9-round magazine, reloadFrames 111 (~1.85s), so the 10-count proc lands roughly once per magazine-plus-one-shot outside buff windows.",
  "model": "claude-fable-5"
}
```


---

## S5 BLIND TEST (claude-opus-5) — 12/15 pass, 3 fail (null-vs-undefined durationShots API artifact)

```typescript
/**
 * drake -- blind per-unit kit spec test. Written from the kit prose ALONE
 * (driver override / driver test / truth file NOT consulted).
 *
 * KIT AS READ
 *   skill1 [a] entering Full Burst, all allies:     Hit Rate 20.09%, ATK 11.85%, 10 sec
 *          [b] entering Full Burst, Shotgun allies:  ATK 63.88%, Max Ammo 50.14%, 10 sec
 *   skill2 [a] after 10 normal attacks -> enemy:     98.55% of final ATK
 *          [b] after 5 normal attacks  -> enemy:     201.6% of final ATK
 *   burst  [a] enemies in attack range:              3009.6% of final ATK
 *          [b] self:                                 Max Ammo 72.18%, Attack Damage 31.68%, 10 sec
 *
 * FIXTURE
 *   controlComp(drake, true) -- liter B1 + crown B2 carry the burst chain to stage 3; a lone B3
 *   makes ZERO Full Bursts, which would make every fullBurstEnter assertion vacuous. helm stays
 *   so the fixture also holds a SECOND B3 (drake must still take bursts of her own). helm/liter/
 *   crown are non-SG, which is what makes the Shotgun-scope branch observable at all.
 *   Deterministic, no seed, 180 s.
 *
 * DISCRIMINATION METHOD
 *   Each counterfactual changes exactly ONE authored fact via withPatchedOverride, so the delta
 *   between two otherwise identical deterministic runs is attributable to that fact alone -- no
 *   per-unit event attribution is needed for the damage counts.
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

const SLUG = 'drake';

interface Run {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
}

function run(opts: any): Run {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

// A slot on the override is either a bare Block[] or a CharacterSkills carrying its own
// blocks[]. Both shapes are handled so a counterfactual can never silently become a no-op.
const slotBlocks = (ov: any, slot: string): any[] => {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
};

const setSlotBlocks = (ov: any, slot: string, blocks: any[]): void => {
  if (Array.isArray(ov?.[slot])) ov[slot] = blocks;
  else if (ov?.[slot]) ov[slot].blocks = blocks;
};

const hasEffect = (b: any, pred: (e: any) => boolean) => (b.effects ?? []).some(pred);

const isBuff = (stat: string, value: number) => (e: any) =>
  e.kind === 'buff' && e.stat === stat && near(e.value, value);

const isFlat = (value: number) => (e: any) =>
  e.kind === 'flatDamage' && near(e.atkPct, value);

// --- counterfactual builders (one authored fact each) ---

const retarget = (slot: string, pred: (e: any) => boolean, target: any) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const b of slotBlocks(ov, slot)) if (hasEffect(b, pred)) b.target = target;
  });

const dropEffects = (specs: { slot: string; pred: (e: any) => boolean }[]) =>
  withPatchedOverride(SLUG, (ov: any) => {
    for (const s of specs) {
      for (const b of slotBlocks(ov, s.slot)) {
        b.effects = (b.effects ?? []).filter((e: any) => !s.pred(e));
      }
      setSlotBlocks(
        ov,
        s.slot,
        slotBlocks(ov, s.slot).filter((b: any) => (b.effects ?? []).length > 0),
      );
    }
  });

const withOv = (ov: any) => ({ ...controlComp(SLUG, true), overrides: { [SLUG]: ov } });

// --- event readers ---

const T = (r: Run) => totals(r.res);

const buffApplies = (r: Run, stat: string, value: number) =>
  (r.events as any[]).filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value),
  );

const recipients = (evs: any[]) => new Set(evs.map((e) => e.targetSlug));

const dmgFrom = (r: Run, slot: string) =>
  (r.events as any[]).filter((e) => e.kind === 'damage' && e.srcSlot === slot);

const shots = (r: Run) => (r.events as any[]).filter((e) => e.kind === 'shot');

const fbStarts = (r: Run) => (r.events as any[]).filter((e) => e.kind === 'fullBurstStart');

// --- hoisted runs (each is a full 180 s sim) ---

const base = run(controlComp(SLUG, true));
const s1SelfScope = run(withOv(retarget('skill1', isBuff('atkPct', 11.85), { kind: 'self' })));
const s1SgToAll = run(withOv(retarget('skill1', isBuff('atkPct', 63.88), { kind: 'allies' })));
const s1NoTeamAtk = run(withOv(dropEffects([{ slot: 'skill1', pred: isBuff('atkPct', 11.85) }])));
const s1NoHitRate = run(
  withOv(dropEffects([{ slot: 'skill1', pred: isBuff('hitRatePct', 20.09) }])),
);
const noAmmoBuffs = run(
  withOv(
    dropEffects([
      { slot: 'skill1', pred: isBuff('maxAmmoPct', 50.14) },
      { slot: 'burst', pred: isBuff('maxAmmoPct', 72.18) },
    ]),
  ),
);
const s2OnlyTen = run(withOv(dropEffects([{ slot: 'skill2', pred: isFlat(201.6) }])));
const s2None = run(
  withOv(
    dropEffects([
      { slot: 'skill2', pred: isFlat(201.6) },
      { slot: 'skill2', pred: isFlat(98.55) },
    ]),
  ),
);
const noNuke = run(withOv(dropEffects([{ slot: 'burst', pred: isFlat(3009.6) }])));
const burstSelfToAllies = run(
  withOv(retarget('burst', isBuff('attackDamagePct', 31.68), { kind: 'allies' })),
);
const noAtkDmg = run(
  withOv(dropEffects([{ slot: 'burst', pred: isBuff('attackDamagePct', 31.68) }])),
);

const roster = Object.keys(T(base));
const teammates = roster.filter((s) => s !== SLUG);

describe('drake -- fixture non-vacuity', () => {
  it('actually reaches Full Burst and drake actually casts her own burst', () => {
    // Without this, every fullBurstEnter / burstCast assertion below would pass vacuously.
    expect(fbStarts(base).length).toBeGreaterThanOrEqual(2);
    expect(buffApplies(base, 'attackDamagePct', 31.68).length).toBeGreaterThanOrEqual(2);
    expect(unitOf(base.res, SLUG).totalDamage).toBe(T(base)[SLUG]);
    expect(teammates.length).toBe(3);
  });
});

describe('drake skill1 -- Full Burst team branch (all allies)', () => {
  it('applies Hit Rate 20.09% and ATK 11.85% to EVERY ally on each Full Burst entry', () => {
    const hr = buffApplies(base, 'hitRatePct', 20.09);
    const atk = buffApplies(base, 'atkPct', 11.85);
    // Scope: all allies. Nearest-wrong (self-only, or Shotgun-only) shrinks the recipient set.
    expect(recipients(hr)).toEqual(new Set(roster));
    expect(recipients(atk)).toEqual(new Set(roster));
    // Trigger identity: full-burst-ENTER fires once per FB for every ally. A burstCast keying
    // would fire only on rotations drake herself bursts (helm is a second B3), giving fewer.
    expect(hr.length).toBe(fbStarts(base).length * roster.length);
    expect(atk.length).toBe(fbStarts(base).length * roster.length);
  });

  it('the 10 sec window is wall-clock, not a round count', () => {
    // Nearest-wrong: durationShots (for N rounds) encoding, which would stretch across reloads.
    for (const ev of buffApplies(base, 'atkPct', 11.85) as any[]) {
      expect(ev.durationShots).toBeUndefined();
      expect(ev.expiresFrame).toBeGreaterThan(0);
      expect(ev.maxStacks ?? 1).toBe(1);
    }
  });

  it('ATK 11.85% is load-bearing on TEAMMATES, not just on drake', () => {
    // Functional (not merely event-level) proof of the ally scope: strip the effect and every
    // teammate loses damage. Under a self-scoped nearest-wrong the same loss appears.
    for (const s of teammates) {
      expect(T(base)[s]).toBeGreaterThan(T(s1NoTeamAtk)[s]);
      expect(T(base)[s]).toBeGreaterThan(T(s1SelfScope)[s]);
    }
    expect(recipients(buffApplies(s1SelfScope, 'atkPct', 11.85))).toEqual(new Set([SLUG]));
  });

  it('Hit Rate 20.09% lifts damage through the core-hit path', () => {
    // Presence/direction only -- the hit-rate to core-rate magnitude is a derived model.
    expect(T(base)[SLUG]).toBeGreaterThan(T(s1NoHitRate)[SLUG]);
  });
});

describe('drake skill1 -- Shotgun-only branch', () => {
  it('ATK 63.88% and Max Ammo 50.14% reach shotgun allies ONLY', () => {
    const sgAtk = recipients(buffApplies(base, 'atkPct', 63.88));
    const sgAmmo = recipients(buffApplies(base, 'maxAmmoPct', 50.14));
    const all = recipients(buffApplies(base, 'atkPct', 11.85));
    expect(sgAtk.has(SLUG)).toBe(true);
    expect(sgAmmo.has(SLUG)).toBe(true);
    // Strict subset of the all-allies branch: the nearest-wrong (weapon filter dropped, encoded
    // as plain allies) makes these two sets equal.
    expect(sgAtk.size).toBeLessThan(all.size);
    expect(sgAmmo.size).toBeLessThan(all.size);
    for (const s of sgAtk) expect(all.has(s as string)).toBe(true);
  });

  it('the Shotgun restriction is real, not an engine no-op', () => {
    // Non-vacuity: retargeted to plain allies the SAME effect DOES reach everyone, so the base
    // run withholding it from liter/crown/helm is an authored scope decision.
    expect(recipients(buffApplies(s1SgToAll, 'atkPct', 63.88))).toEqual(new Set(roster));
  });

  it('Max Ammunition is damage: the ammo buffs buy drake more shots', () => {
    // Weapon-state modifier, not a defensive stat: 9-round magazine plus ~50%/~72% raises the
    // magazine and cuts reload count over the 180 s fight.
    expect(shots(base).length).toBeGreaterThan(shots(noAmmoBuffs).length);
    expect(T(base)[SLUG]).toBeGreaterThan(T(noAmmoBuffs)[SLUG]);
  });
});

describe('drake skill2 -- normal-attack counters', () => {
  const s2Base = dmgFrom(base, 'skill2').length;
  const s2Ten = dmgFrom(s2OnlyTen, 'skill2').length;
  const s2Zero = dmgFrom(s2None, 'skill2').length;
  const procsFive = s2Base - s2Ten;
  const procsTen = s2Ten - s2Zero;

  it('the 5-attack rider fires about twice as often as the 10-attack rider', () => {
    expect(procsTen).toBeGreaterThan(0);
    expect(procsFive).toBeGreaterThan(0);
    // Thresholds 5 and 10 over the same shot stream give a 2:1 proc ratio regardless of whether
    // the engine counts rounds or pellets. Nearest-wrong (both keyed to the same threshold, or
    // the thresholds swapped) lands at 1.0 or 0.5.
    expect(procsFive / procsTen).toBeGreaterThan(1.6);
    expect(procsFive / procsTen).toBeLessThan(2.4);
  });

  it('the LARGER 201.6% payload sits on the MORE frequent 5-attack counter', () => {
    const dmgFive = T(base)[SLUG] - T(s2OnlyTen)[SLUG];
    const dmgTen = T(s2OnlyTen)[SLUG] - T(s2None)[SLUG];
    expect(dmgTen).toBeGreaterThan(0);
    // Expected ~ (2 procs x 201.6) / (1 proc x 98.55) = ~4.1. The swapped-magnitude
    // nearest-wrong (98.55 on the 5-counter, 201.6 on the 10-counter) lands at ~0.98.
    expect(dmgFive / dmgTen).toBeGreaterThan(2.8);
    expect(dmgFive / dmgTen).toBeLessThan(5.8);
  });

  it('the riders are gated on normal attacks, not on wall clock', () => {
    // Cutting drake shot count (ammo buffs removed) must cut the proc count. An interval trigger
    // would emit the same number of procs in a fixed 180 s fight.
    expect(dmgFrom(noAmmoBuffs, 'skill2').length).toBeLessThan(s2Base);
  });

  it.skip('fans to the 3 enemies with the lowest remaining HP -- unobservable on a single boss', () => {
    // GAP: v1 has one partless boss, so the 3-target spread and the HP ordering cannot be read.
  });
});

describe('drake burst', () => {
  const nBursts = buffApplies(base, 'attackDamagePct', 31.68).length;
  const burstDmgDelta = dmgFrom(base, 'burst').length - dmgFrom(noNuke, 'burst').length;

  it('the 3009.6% hit lands exactly once per drake burst cast', () => {
    expect(nBursts).toBeGreaterThanOrEqual(2);
    // Trigger identity: burst-cast, not full-burst-enter. helm is a second B3, so an FB-enter
    // keying would over-fire (one hit per team Full Burst rather than per drake cast).
    expect(burstDmgDelta).toBe(nBursts);
  });

  it('the burst hit resolves OUTSIDE the Full Burst window', () => {
    const outFb = (r: Run) => dmgFrom(r, 'burst').filter((e: any) => e.inFullBurst === false).length;
    // A burst cast lands before the FB window opens, so every added hit must be FB-exempt by
    // timing. Nearest-wrong: a hit re-keyed into the FB window collects the +50% major.
    expect(outFb(base) - outFb(noNuke)).toBe(burstDmgDelta);
  });

  it('Max Ammo 72.18% and Attack Damage 31.68% stay on drake (self scope)', () => {
    const ad = buffApplies(base, 'attackDamagePct', 31.68) as any[];
    const ammo = buffApplies(base, 'maxAmmoPct', 72.18) as any[];
    expect(recipients(ad)).toEqual(new Set([SLUG]));
    expect(recipients(ammo)).toEqual(new Set([SLUG]));
    expect(ammo.length).toBe(nBursts);
    for (const ev of ad) {
      expect(ev.casterIdx).toBe(ev.targetIdx);
      expect(ev.durationShots).toBeUndefined();
    }
    // Non-vacuity: retargeted to allies the same buff DOES reach the team, so the base run
    // keeping it on drake is an authored scope decision, not an inert stat.
    expect(recipients(buffApplies(burstSelfToAllies, 'attackDamagePct', 31.68)).size).toBeGreaterThan(1);
  });

  it('Attack Damage 31.68% moves drake and NOTHING else', () => {
    expect(T(base)[SLUG]).toBeGreaterThan(T(noAtkDmg)[SLUG]);
    // Inertness: a self buff must leave every teammate byte-identical.
    for (const s of teammates) expect(T(noAtkDmg)[s]).toBe(T(base)[s]);
  });

  it.skip('hits all enemies within attack range -- AoE spread unobservable on a single boss', () => {
    // GAP: one enemy in the fixture, so range-scoped multi-target fan-out cannot be discriminated.
  });

  it.skip('Hit Rate 20.09% to core-rate magnitude -- measurement-gated', () => {
    // GAP: the hit-rate to core-hit conversion is a derived model; only presence and direction
    // are asserted above, never the magnitude.
  });
});
```


---

## S6 BLIND OVERRIDE (claude-opus-5)

```json
{
  "slug": "drake",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 20.09,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 11.85,
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
        "kind": "alliesOfWeapon",
        "weapon": "SG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 63.88,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": 50.14,
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
        "count": 10
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 98.55,
          "crit": true
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
          "atkPct": 201.6,
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
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 3009.6,
          "crit": true,
          "noFb": true
        }
      ]
    },
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
          "stat": "maxAmmoPct",
          "value": 72.18,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 31.68,
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
    "⚑ skill2 trigger unit: kit says \"after N normal attack(s)\". Drake is SG with hitsPerShot 10, so a hitCount trigger that counts PELLET HITS instead of ROUNDS would fire these riders ~10x too often. Authored as rounds/trigger-pulls (count 10 / count 5); MUST be verified against the engine's hitCount accounting for multi-pellet weapons before trusting any total.",
    "⚑ skill2 first line reads \"Affects 3 enemy unit(s) with the lowest remaining HP\" — the v1 sim has a single boss, so the 98.55% lands ONCE per activation, not 3x. If the engine ever models multiple enemies this line must fan out to 3 targets.",
    "⚑ Both damage riders default to Full-Burst-by-timing (noFb NOT set) per the standing prior; only the burst nuke is FB-exempt (burst cast resolves before the FB window opens).",
    "⚑ maxAmmoPct stacks on Drake herself during her own Full Burst: skill1's SG-ally +50.14% and burst's self +72.18% co-apply on a 9-round magazine. Whether the engine adds them additively and how it rounds the resulting capacity (9 -> ~20 rounds) is unverified; it directly gates shots fired and therefore damage.",
    "⚑ hitRatePct 20.09 is routed through the engine's Hit-Rate->core lift (hrCoreMult). The kit gives a Hit Rate percentage, NOT a core rate; the conversion magnitude is a measured-only quantity and is the single largest uncertainty in this unit's team contribution.",
    "⚑ crit:true on all three flatDamage riders follows the standing rider-crit prior, not kit text. If the engine's global RIDERCRIT gate already governs rider crit eligibility, these explicit flags are redundant (not additive) — confirm before reading any crit-rate assertion off these hits."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of drake (SG/Fire/Attacker/B3) from kit prose only. Structure: skill1 is a pure FB-enter team aura split into a universal leg (Hit Rate + ATK, all allies) and a shotgun-scoped leg (ATK + Max Ammo, alliesOfWeapon SG — Drake is SG so she receives her own second leg). skill2 is two independent normal-attack-count riders (10-attack 98.55% AoE-flavored, 5-attack 201.6% single-target) — both authored as hitCount triggers counting ROUNDS, which is the load-bearing assumption for a 10-pellet shotgun (see caveats). Burst is a single 3009.6% instant nuke on cast (FB-exempt per the burst-cast timing prior) plus a self Max Ammo + Attack Damage window. Weapon-state lines (Max Ammunition Capacity ▲, both legs) are modeled as damage-relevant per the HARD RULES — they gate shots fired on a 9-round magazine with a 111-frame reload, where ammo capacity is unusually leveraged. No kit line is dropped; unmodeled is empty for all three slots. Nothing here has been checked against a board, a probe, or the regression snapshot."
}```


### S6-vs-driver diff summary

Key divergence: S6 blind uses hitCount 10/5 (counting ROUNDS directly) while the driver uses hitCount 100/50 (counting PELLET HITS — the engine increments hitCount by hitsPerShot=10 per pull). The driver reading is ANCHORED by a same-chassis measurement: brid-silent-track's 'every 5 normal attacks' rider was solo-confirmed as every 5th PULL (43 riders = floor(215 pulls/5) EXACT, 2026-07-16). S6 also adds explicit crit:true and noFb:true flags to flatDamage effects (redundant with engine defaults). Structure is otherwise identical.


---

## DRIVER IMPLEMENTATION

### scripts/tests/units/drake.test.ts

```typescript
// PER-UNIT KIT SPEC — `drake` (Drake, Attacker/SG/Fire, Burst III, cd 40s, ammo 9,
// hitsPerShot 10 pellets, reloadFrames 111). Kit-autonomy gauntlet 2026-07-25.
//
// One assertion group per KIT LINE (D1..D9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against).
//
// Kit (blablalink prose, data/characters.json → characters.drake.skills):
//   S1 ■ entering Full Burst → all allies: Hit Rate ▲20.09% for 10 sec                      [D1]
//      ■ entering Full Burst → all allies: ATK ▲11.85% for 10 sec                           [D2]
//      ■ entering Full Burst → all SG allies: ATK ▲63.88% for 10 sec                        [D3]
//      ■ entering Full Burst → all SG allies: Max Ammo Capacity ▲50.14% for 10 sec           [D4]
//   S2 ■ after 10 attacks → 3 lowest-HP enemies: 98.55% of final ATK as damage              [D5]
//      ■ after 5 attacks → 1 lowest-HP enemy: 201.6% of final ATK as damage                 [D6]
//   BU ■ enemies in range: 3009.6% of final ATK as damage                                   [D7]
//      ■ self: Max Ammo Capacity ▲72.18% for 10 sec                                         [D8]
//      ■ self: Attack Damage ▲31.68% for 10 sec                                             [D9]
//
// Why each assertion discriminates:
//   D1  hitRatePct feeds acrForHR core rate — a buff-removed counterfactual produces zero
//       hitRatePct buffApply events; the shipped model produces them every FB enter.
//   D2  atkPct 11.85 hits all 4 allies — removing it drops every unit's total damage.
//   D3  alliesOfWeapon SG scopes the 63.88 ATK buff to SG wielders only. In the control comp
//       (liter SMG / crown MG / drake SG / helm SR) only drake is SG, so the buff targets
//       exactly 1 unit per FB enter. Counterfactual: target "allies" → 4 targets.
//   D4  Same scoping as D3 for maxAmmoPct 50.14.
//   D5  hitCount 100 = 10 trigger PULLS (engine increments by hitsPerShot=10 per pull).
//       Counterfactual: hitCount 10 (= 1 pull) → 10× more nuke events.
//   D6  hitCount 50 = 5 pulls. Counterfactual: hitCount 5 → 10× more events.
//   D7  burst nuke atkPct 3009.6 (treasure). Counterfactual: 1254 (untreasured base).
//   D8  self-scoped maxAmmoPct 72.18 — targetIdx must be drake's slot only.
//   D9  self-scoped attackDamagePct 31.68 — targetIdx must be drake's slot only.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / drake B3 / helm B3, boss Fire,
// focus drake). Deterministic (no seed). Drake is slot index 2.
//
// UNMODELED (inert in scope-lock, documented per protocol):
//   - S1 hitRatePct in-game core-hit-rate magnitude is unmeasured (⚑3 in override note);
//     the buff IS modeled and fires, but its damage contribution via acrForHR is unmeasured.
//   - S2 "3 lowest-HP enemies" targeting collapses to 1 instance on the partless boss.
//   - Burst maxAmmo window economy: the cap raise only pays out when a reload lands inside
//     the 10s window (⚑4); no instant ammo grant is assumed.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const DRAKE = 2; // slot index in controlComp('drake'): liter 0 / crown 1 / drake 2 / helm 3

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('drake'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------

/** D3/D4 counterfactual: S1 SG-scoped blocks target ALL allies instead of SG-only. */
const drakeS1AllAllies = withPatchedOverride('drake', (ov) => {
  const sgBlock = ov.skill1.find((b: any) => b.target?.kind === 'alliesOfWeapon');
  if (!sgBlock) throw new Error('drake S1 alliesOfWeapon block missing — fixture is stale');
  sgBlock.target = { kind: 'allies' };
});

/** D5/D6 counterfactual: hitCount reads PELLET hits (10/5) instead of PULL hits (100/50). */
const drakeS2Pellets = withPatchedOverride('drake', (ov) => {
  for (const b of ov.skill2) {
    if (b.trigger?.kind !== 'hitCount') continue;
    if (b.trigger.count === 100) b.trigger.count = 10;
    else if (b.trigger.count === 50) b.trigger.count = 5;
  }
});

/** D7 counterfactual: burst nuke at the UNTREASURED base magnitude 1254. */
const drakeBurstOld = withPatchedOverride('drake', (ov) => {
  const nuke = ov.burst.find((b: any) =>
    b.effects?.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 3009.6),
  );
  if (!nuke) throw new Error('drake burst 3009.6 nuke missing — fixture is stale');
  nuke.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 1254;
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const s1All = run({ drake: drakeS1AllAllies });
const s2Pellets = run({ drake: drakeS2Pellets });
const burstOld = run({ drake: drakeBurstOld });

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const drakeDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'drake' && d.srcSlot === srcSlot);
const drakeShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'drake');
const drakeBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'drake');

describe('drake — kit spec', () => {
  describe('D1 — S1 Hit Rate ▲20.09% on FB enter, all allies', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === DRAKE && b.stat === 'hitRatePct' && b.value === 20.09,
    );

    it('fires on every Full Burst enter, targeting all 4 allies for 10s', () => {
      expect(applied.length, 'no hitRatePct 20.09 buff applied').toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(holders.size, `frame ${frame} reached ${holders.size} allies, expected 4`).toBe(4);
      }
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
  });

  describe('D2 — S1 ATK ▲11.85% on FB enter, all allies', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === DRAKE && b.stat === 'atkPct' && b.value === 11.85,
    );

    it('fires on every FB enter, targeting all 4 allies for 10s', () => {
      expect(applied.length, 'no atkPct 11.85 buff applied').toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(holders.size, `frame ${frame} reached ${holders.size} allies, expected 4`).toBe(4);
      }
    });
  });

  describe('D3 — S1 ATK ▲63.88% on FB enter, SG allies ONLY', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === DRAKE && b.stat === 'atkPct' && b.value === 63.88,
    );

    it('targets ONLY drake (the sole SG in the comp), not all 4 allies', () => {
      expect(applied.length, 'no atkPct 63.88 buff applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DRAKE]);
    });

    it('DISCRIMINATING: an unscoped "allies" target would hit all 4', () => {
      const allAllies = buffs(s1All.events).filter(
        (b) => b.casterIdx === DRAKE && b.stat === 'atkPct' && b.value === 63.88,
      );
      const targets = new Set(allAllies.map((b) => b.targetIdx));
      expect(targets.size, 'counterfactual must hit 4 allies to prove discrimination').toBe(4);
    });
  });

  describe('D4 — S1 Max Ammo ▲50.14% on FB enter, SG allies ONLY', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === DRAKE && b.stat === 'maxAmmoPct' && b.value === 50.14,
    );

    it('targets ONLY drake (the sole SG in the comp)', () => {
      expect(applied.length, 'no maxAmmoPct 50.14 buff applied').toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DRAKE]);
    });
  });

  describe('D5 — S2 "after 10 attacks" nuke: 98.55% final ATK (hitCount 100 = 10 pulls)', () => {
    const nukes = drakeDamage(base.events, 'skill2').filter((d) => d.atkPct === 98.55);
    const pulls = drakeShots(base.events).length;

    it('fires approximately once per 10 pulls (hitCount 100 in pellet-counter semantics)', () => {
      expect(nukes.length, 'no 98.55% nukes landed').toBeGreaterThan(0);
      const expected = Math.floor(pulls / 10);
      // Allow ±1 for boundary alignment at fight start/end.
      expect(nukes.length).toBeGreaterThanOrEqual(expected - 1);
      expect(nukes.length).toBeLessThanOrEqual(expected + 1);
    });

    it('DISCRIMINATING: hitCount 10 (pellet reading) would produce ~10× more nukes', () => {
      const pelletNukes = drakeDamage(s2Pellets.events, 'skill2').filter((d) => d.atkPct === 98.55);
      expect(pelletNukes.length).toBeGreaterThan(nukes.length * 5);
    });
  });

  describe('D6 — S2 "after 5 attacks" nuke: 201.6% final ATK (hitCount 50 = 5 pulls)', () => {
    const nukes = drakeDamage(base.events, 'skill2').filter((d) => d.atkPct === 201.6);
    const pulls = drakeShots(base.events).length;

    it('fires approximately once per 5 pulls (hitCount 50 in pellet-counter semantics)', () => {
      expect(nukes.length, 'no 201.6% nukes landed').toBeGreaterThan(0);
      const expected = Math.floor(pulls / 5);
      expect(nukes.length).toBeGreaterThanOrEqual(expected - 1);
      expect(nukes.length).toBeLessThanOrEqual(expected + 1);
    });

    it('DISCRIMINATING: hitCount 5 (pellet reading) would produce ~10× more nukes', () => {
      const pelletNukes = drakeDamage(s2Pellets.events, 'skill2').filter((d) => d.atkPct === 201.6);
      expect(pelletNukes.length).toBeGreaterThan(nukes.length * 5);
    });
  });

  describe('D7 — burst nuke: 3009.6% final ATK (treasure), one per cast', () => {
    const nukes = drakeDamage(base.events, 'burst');
    const casts = drakeBursts(base.events).length;

    it('fires once per burst cast at the treasure magnitude', () => {
      expect(nukes.length).toBe(casts);
      expect(casts).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([3009.6]);
    });

    it('DISCRIMINATING: the untreasured base 1254 is a different magnitude', () => {
      const oldNukes = drakeDamage(burstOld.events, 'burst');
      expect([...new Set(oldNukes.map((d) => d.atkPct))]).toEqual([1254]);
    });
  });

  describe('D8 — burst self-buff: Max Ammo ▲72.18% for 10s', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === DRAKE && b.stat === 'maxAmmoPct' && b.value === 72.18,
    );

    it('fires once per burst cast, self-scoped, 10s duration', () => {
      expect(applied.length).toBe(drakeBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DRAKE]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
  });

  describe('D9 — burst self-buff: Attack Damage ▲31.68% for 10s', () => {
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === DRAKE && b.stat === 'attackDamagePct' && b.value === 31.68,
    );

    it('fires once per burst cast, self-scoped, 10s duration', () => {
      expect(applied.length).toBe(drakeBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([DRAKE]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
  });
});
```

### src/skills/overrides/drake.json

```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. TREASURE (favorite-item) RECONCILE 2026-07-17: the DB sync gained drake's favorite-item prose (was untreasured base kit). Enacted: S1 Hit Rate 11.85->20.09 + NEW 'all Shotgun-wielding allies' block (alliesOfWeapon SG, includes self) ATK 63.88 + Max Ammo 50.14 /10s on FB enter; S2 NEW second nuke 'after 5 normal attacks -> 1 lowest-HP enemy -> 201.6%' (hitCount 50 = 5 pulls in the same pull-vs-pellet convention as the 98.55% rider, single boss = 1 target); burst nuke 1254->3009.6 + NEW self Attack Damage 31.68 /10s. --- drake (Drake) — Fire SG Attacker, Burst III (burstCd 40), ammo 9 / reloadFrames 111 / hitsPerShot 10 pellets / normalMult 214.3 — the SAME SG chassis as brid-silent-track (ammo 9 / reloadFrames 111 / 10 pellets), whose measured facts anchor two of this kit's ⚑ estimates. Kit-parse AUTHOR pass 2026-07-16 (wave 5), merging the prior partial-hand override (its two parser fixes are preserved in substance: S1 fullBurstEnter recognition; S2 hitCount 100). ALL FIVE kit lines modeled — unmodeled arrays are genuinely empty. SKILL1 'Activates at the beginning of Full Burst. Affects all allies.' → fullBurstEnter → allies (hard rule 6: worded as FB entry, so it fires on EVERY team Full Burst regardless of who bursted — correct as-is, NOT burstCast): hitRatePct 11.85 /10s (hard rule 4: Hit Rate ▲ PROVEN to raise the core-hit rate — LIVE since CONE_DELTA 2026-07-19 via acrForHR for AR/SMG/SG recipients, in-game magnitude unknown; never deleted; ⚑3) + atkPct 11.85 /10s. SKILL2 'Activates after 10 attacks … 3 enemy unit(s) with the lowest remaining HP … 98.55% of final ATK' → hitCount 100 → enemy → flatDamage 98.55: the engine hit counter increments by hitsPerShot (=10) per pull (sim.ts:1727), so '10 attacks' read as 10 TRIGGER PULLS = 100 pellet-hits. This reading is ANCHORED by a same-chassis MEASUREMENT: brid-silent-track's 'every 5 normal attacks' rider was solo-confirmed as every 5th PULL (43 riders = floor(215 pulls/5) EXACT, 2026-07-16) — still ⚑2 for drake per-unit (10× cadence lever either way). Single partless boss ⇒ the '3 lowest-remaining-HP enemies' targeting collapses to ONE instance on the boss (multi-enemy content would triple it — fidelity note, nothing droppable). Rider defaults per prior 2: crits at sheet rate (engine default crit ON), NO core (no 'core strike' text), FB by TIMING (noFb NOT set — ⚑5 records the default). BURST line 1 'Affects enemies within attack range. Deals 1254% of final ATK' → burstCast → enemy → flatDamage 1254 (single boss = the one target in range); burst-cast instant damage is auto-FB-exempt (engine cast-instant rule; never set noFb). BURST line 2 'Affects self. Max Ammunition Capacity ▲ 72.18% for 10 sec.' → burstCast → self → maxAmmoPct 72.18 /10s (hard rule 1: ammo cap gates shots/mag = damage; never skipped). Engine semantics: the cap raise is dynamic — current ammo is NOT instantly granted; a reload landing inside the 10s window fills to round(9×1.7218)=15, so the line's whole value rides on reload alignment with her burst cast (⚑4). No heal/shield/DEF/HP/lifesteal/gauge/reload-speed lines in this kit; no weapon-swap; no stack/currency; no DoT; no charFixes needed. Element: Fire, clean ×1.10 advantage engine-handled (no elemental-advantage buff — prior 7). SG landing: class SG_LANDING_BY_BAND table is the shipped default; landing is PER-UNIT (⚑6). Blast radius: S1 buffs ALL allies (atkPct 11.85 every FB) — /sim-battery diff before any board-level claim. ⚑ NEEDS-MEASUREMENT: (1) CADENCE TUPLE [MANDATORY, datamine-unreliable] — pullsPerSec at the SG class default 1.5 + reloadFrames 111 (datamine) + rolling-reload behavior; NOT escalated (9-round mag at 1.5 pulls/s empties in ~6s — no <1s tell, no Magnum/per-N-round flavor); recipe = rounds/min + reload gap from any drake focus video. (2) S2 'attack' = PULL vs PELLET — estimate hitCount 100 (10 pulls), anchored by the brid-silent-track same-chassis pull measurement; if pellets were meant, hitCount 10 (10× hotter); recipe = count trigger pulls between 98.55% popups in a focus video. (3) Hit-Rate → core-rate magnitude [measured-only, hard rule 4] — hitRatePct as modeled is LIVE via the δ-cone (CONE_DELTA 2026-07-19), in-game magnitude unmeasured; recipe = FB-window core-hit fraction with S1 up vs a no-drake control. (4) burst maxAmmo window economy — estimate = engine-native (next in-window reload fills to 15); verify the game does NOT instantly grant the extra rounds at cast; recipe = watch her ammo counter at burst cast in a focus video. (5) noFb on the S2 98.55% rider — default OFF (FB by timing, prior 2); set noFb:true ONLY with measured FB-OFF popup evidence; recipe = compare the rider popup value landing in-FB vs out-FB. (6) SG per-unit landing — estimate = class SG_LANDING_BY_BAND; recipe = solo per-band read (per-magazine damage-counter deltas → landing fraction per range band). Self-validated by INSPECTION against types.ts only (production staging rule — no writes to overrides/, no validate-overrides, no sim; the driver runs Step 5). Kit-autonomy gauntlet 2026-07-25.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: Hit Rate ▲ 20.09% (TREASURE) is modeled as hitRatePct — LIVE since CONE_DELTA (2026-07-19): feeds acrForHR core rate for AR/SMG/SG recipients; the in-game magnitude of the core-hit-rate lift is unmeasured",
    "skill1: the TREASURE 'all Shotgun-wielding allies' ATK 63.88 + Max Ammo 50.14 buff hits every SG ally incl. self on FB enter — run /sim-battery before any board claim on SG teams",
    "skill2: both nukes read '10/5 attacks' as trigger PULLS (hitCount 100/50 in pellet-counter semantics), anchored by a same-chassis brid-silent-track measurement but unmeasured for drake — pull-vs-pellet is a 10x cadence lever on each",
    "burst: Max Ammunition Capacity ▲ 72.18%/10s only pays out when a reload lands inside the window (cap raise fills on the next reload; no instant ammo grant assumed)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 20.09,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 11.85,
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
        "kind": "alliesOfWeapon",
        "weapon": "SG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 63.88,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": 50.14,
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
        "count": 100
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 98.55
        }
      ]
    },
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
          "atkPct": 201.6
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
          "atkPct": 3009.6
        }
      ]
    },
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
          "stat": "maxAmmoPct",
          "value": 72.18,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 31.68,
          "durationSec": 10
        }
      ]
    }
  ]
}
```

