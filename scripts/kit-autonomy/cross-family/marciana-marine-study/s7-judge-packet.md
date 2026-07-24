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

## MECHANICS PACK (formula SSOT)

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


## Element wheel (game-mechanics.md §10)


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


---

## GROUND TRUTH: kit prose (data/characters.json → characters['marciana-marine-study'].skills)
```
{
  "slug": "marciana-marine-study",
  "weapon": "AR",
  "burst": "III",
  "class": "Attacker",
  "element": "Iron",
  "skills": {
    "skill1": "■ Activates when entering Full Burst after this unit uses her Burst Skill. Affects the 1 enemy unit(s) with the highest final Max HP.\nFlagged Target Designation\nEffect 1: Deals 3789.25% of final ATK as additional damage.\nEffect 2: Activates when the target is alive.\nFlagged Target: ATK ▼ 10.56% for 10 sec.\n■ Activates when an enemy is neutralized if the target is in the Flagged Target state. Affects 1 random enemy unit(s).\nFlagged Target Designation\nEffect 1: Deals 3789.25% of final ATK as additional damage.\nEffect 2: Activates when the target is alive.\nFlagged Target: ATK ▼ 10.56% for 10 sec.\n■ Activates when landing 20 normal attacks against a target in the High-Risk Target state. Affects the target.\nDeals 152.68% of final ATK as additional damage.",
    "skill2": "■ Activates at the start of battle. Affects self.\nWhistle: ATK ▲ 32.73% continuously. Stacks up to 5 times.\nWhistle stacks ▲ 4.\n■ Activates every time there are 3 or fewer Raptures present for a period of 5 sec. Affects self.\nWhistle: ATK ▲ 32.73% continuously. Stacks up to 5 times.\n■ Activates every time there are 6 or more Raptures present for a period of 1 sec.\nPenguin Emergency Dispatch\nFunction: Expends Whistle stacks to attack Raptures when there are 6 or more present.\nEffect 1: Affects all enemies. Deals 214.36% of final ATK as additional damage.\nEffect 2: Affects self. Whistle stacks ▼ 1.\n■ Only activates when a Rapture appears or is neutralized while there are 5 or fewer Raptures. Affects self.\nElemental Advantage Attack Damage ▲ 20.41% continuously.",
    "burst": "■ Affects self.\nElemental Advantage Attack Damage ▲ 30.97% for 10 sec.\nAttack Damage ▲ 27.45% for 10 sec.\n■ Affects all Electric Code enemies.\nHigh-Risk Target: DEF ▼ 10.56% for 20 sec."
  }
}
```


---

## S2b PRE-OP REVIEW (claude-fable-5)
```json
{
  "slug": "marciana-marine-study",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ entering Full Burst after own Burst",
      "disposition": "FAITHFUL",
      "scope": "skill flat-damage rider, 3789.25% final ATK; not normal-attack-scoped; single hit per activation",
      "durationSemantics": "instant hit at FB entry; the attached Flagged Target status/ATK▼ is 10 sec",
      "triggerIdentity": "fullBurstEnter + ownBurstGate:'cast' — 'entering Full Burst AFTER this unit uses her Burst Skill' is the canonical ownBurstGate carrier phrasing, NOT plain fullBurstEnter and NOT burstCast",
      "targetSet": "enemy, 1 highest final Max HP — resolves to the sole boss",
      "nearestWrongModel": "plain {kind:'fullBurstEnter'} with no ownBurstGate (fires on EVERY team FB — in a two-B3 comp the other B3's rotations double-fire it); second-nearest: burstCast keying (lands pre-FB, silently loses the +50% FB major)",
      "distinguishingAssertion": "in controlComp (two B3s alternate), count of damage events with mult 3789.25 && srcSlot===marciana === count of burstCast events by marciana (NOT the total FB count), and every such event has inFullBurst===true && fbMajorApplied===true",
      "inertness": "must NOT fire on Full Bursts chained by the other B3; no second copy per FB",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Flagged Target: ATK ▼ 10.56% for 10 sec",
      "disposition": "UNMODELED",
      "scope": "boss ATK debuff — defensively inert (boss deals no damage in v1)",
      "durationSemantics": "10 sec wall-clock status window",
      "triggerIdentity": "rides the FB-enter nuke; a targetStatus 'Flagged Target' (10s) is the faithful vehicle if encoded, since a later kit block gates on the named state",
      "targetSet": "enemy (boss)",
      "nearestWrongModel": "encoding ATK▼ as a damage-relevant boss debuff (e.g. damageTakenPct 10.56) — it is an ATK debuff, zero offense",
      "distinguishingAssertion": "toggling this line via withPatchedOverride moves totals by exactly 0; no damageTakenPct buffApply with value 10.56 exists",
      "inertness": "team damage totals",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "■ when an enemy is neutralized, Flagged",
      "disposition": "UNMODELED",
      "scope": "re-designation chain (second 3789.25% + re-flag) on enemy death",
      "durationSemantics": "event-driven, per neutralization",
      "triggerIdentity": "enemy-neutralized event — does not exist in v1 (single immortal partless boss); unreachable by construction",
      "targetSet": "1 random enemy",
      "nearestWrongModel": "smuggling the second 3789.25% in as an interval/repeating proc to 'represent' the chain — invents damage the scope-lock fight can never produce",
      "distinguishingAssertion": "total count of mult-3789.25 damage events per fight === number of marciana burst rotations, never more",
      "inertness": "zero extra nuke instances; Whistle/other pools untouched",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "■ landing 20 normal attacks vs High-Risk",
      "disposition": "FAITHFUL",
      "scope": "normal-attack hit counter only (skill/burst hits must not advance it); rider itself is skill flat damage 152.68%",
      "durationSemantics": "counter of ROUNDS landed (AR hitsPerShot 1 ⇒ 20 rounds = 20 pulls); only meaningful inside the 20s High-Risk windows",
      "triggerIdentity": "hitCount:20 composed with requiresTargetStatus:'High-Risk Target' — status-gated rider, the gate name must match the burst's status exactly",
      "targetSet": "enemy (the status holder)",
      "nearestWrongModel": "ungated hitCount:20 (fires against ANY boss forever — vs the Fire control boss the status never exists, so an ungated model manufactures a permanent 152.68%/20-round DoT-alike); second-nearest: counter accrues from battle start so a stale count fires instantly at window-open",
      "distinguishingAssertion": "on controlComp (boss Fire): zero damage events with mult 152.68 for the whole fight. With boss element patched to Electric: events appear ONLY within 20s of her burst casts, at ≥20-round spacing",
      "inertness": "vs any non-Electric boss this line contributes exactly 0",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ start of battle: Whistle stacks ▲ 4",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK (atkPct) — not scoped to normal attacks",
      "durationSemantics": "'continuously' = no expiry; STACKED buff, 32.73% per stack, cap 5, battle-start grant is 4 stacks (not 1, not 5)",
      "triggerIdentity": "passive (start of battle), self",
      "targetSet": "self",
      "nearestWrongModel": "authoring a flat 163.65% (5-stack value) live from t=0, or granting a single 32.73% stack at start — the kit-stated START is 4 stacks (130.92%)",
      "distinguishingAssertion": "buffApply stream shows 4 atkPct-32.73 applications (or stack count 4) at t=0; before ~5s the effective ATK lift is 130.92%, not 163.65%",
      "inertness": "never exceeds 5 stacks",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ every time ≤3 Raptures for 5 sec",
      "disposition": "FAITHFUL",
      "scope": "same Whistle stack pool (atkPct 32.73, cap 5)",
      "durationSemantics": "repeating 5-sec condition timer; in scope-lock (exactly 1 Rapture, always) the condition is statically TRUE, so it degenerates to +1 stack per 5s — cap reached at t≈5s and held",
      "triggerIdentity": "interval-shaped accrual (statically resolved; the engine has no live Rapture counter and must not pretend to)",
      "targetSet": "self",
      "nearestWrongModel": "declaring it unmodelable for lack of a Rapture-count primitive and leaving her stuck at 4 stacks forever (a permanent −32.73% under-credit); or instant-to-5 at t=0",
      "distinguishingAssertion": "a 5th-stack buffApply lands at t≈5s and steady-state stacks === 5 for the rest of the fight; before 5s stacks === 4",
      "inertness": "no accrual past cap; the 6+-Raptures spend branch never decrements it",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "■ 6 or more Raptures: Penguin Dispatch",
      "disposition": "UNMODELED",
      "scope": "AoE 214.36% + Whistle stack spend (▼1)",
      "durationSemantics": "repeating 1-sec condition timer",
      "triggerIdentity": "Rapture-count ≥6 condition — statically FALSE in scope-lock (1 boss, partless); unreachable",
      "targetSet": "all enemies / self (stack spend)",
      "nearestWrongModel": "modeling it as a live interval proc (invents 214.36% damage) or letting the ▼1 spend erode the Whistle pool it can never touch",
      "distinguishingAssertion": "zero damage events with mult 214.36 all fight; Whistle stack count is monotone non-decreasing (4→5, never down)",
      "inertness": "damage totals AND the Whistle pool",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "■ Rapture appears/neutralized while ≤5",
      "disposition": "FAITHFUL",
      "scope": "elemAdvantageDamagePct 20.41 — Damage-Up bucket, live ONLY under elemental advantage (Iron vs Electric); NOT generic Attack Damage",
      "durationSemantics": "'continuously' = permanent once triggered; ⚑ convention: the boss's initial spawn counts as 'a Rapture appears', so it is active from t=0 in scope-lock — flag this first-fire convention, don't silently assume",
      "triggerIdentity": "statically resolved to passive (one appearance event at battle start; no neutralizations ever)",
      "targetSet": "self",
      "nearestWrongModel": "encoding as generic attackDamagePct 20.41 (over-credits her vs every non-Electric boss, including the Fire control boss); second-nearest: dropping it as 'untriggerable'",
      "distinguishingAssertion": "vs boss Fire: removing this line via withPatchedOverride changes totals by exactly 0 (buff present but element-inert). Vs boss Electric: her Damage-Up bucket gains 20.41 from t=0",
      "inertness": "zero damage movement against any boss she has no advantage over",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Elem Adv Attack Damage ▲ 30.97% 10 sec",
      "disposition": "FAITHFUL",
      "scope": "elemAdvantageDamagePct — advantage-gated Damage-Up, distinct stat from the sibling generic line",
      "durationSemantics": "10 sec wall-clock from her cast",
      "triggerIdentity": "burstCast (her OWN burst block, self mode) — NOT fullBurstEnter; in the two-B3 control comp she bursts only every other rotation",
      "targetSet": "self",
      "nearestWrongModel": "merging both burst self-buffs into one generic attackDamagePct 58.42 (over-credits vs non-Electric bosses AND loses the stat split); or fullBurstEnter keying (applies on rotations the other B3 drives)",
      "distinguishingAssertion": "buffApply value 30.97 appears only on frames where a burstCast event with her srcSlot exists — never on the alternating B3's FBs; vs boss Fire its removal moves totals by 0",
      "inertness": "no application on non-cast rotations; element-inert vs Fire",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲ 27.45% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "generic attackDamagePct (Damage-Up bucket) — the element-UNgated half of the pair",
      "durationSemantics": "10 sec wall-clock from her cast (50% uptime at cd 40s if she bursts every rotation; less in the alternating comp)",
      "triggerIdentity": "burstCast, self",
      "targetSet": "self only — not allies",
      "nearestWrongModel": "target 'allies' (team-wide over-credit), or conflation with the 30.97 into a single value",
      "distinguishingAssertion": "buffApply value 27.45 has target === marciana only; it DOES move totals vs boss Fire (unlike the 30.97), pinning the two stats apart",
      "inertness": "no ally receives it",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "all Electric enemies: High-Risk, DEF ▼",
      "disposition": "GAP",
      "scope": "boss-held named status + DEF ▼ 10.56%, ELECTRIC BOSSES ONLY — the element gate is on the STATUS APPLICATION itself",
      "durationSemantics": "20 sec status window (spans two of her 10s self-buff windows; 50% uptime at best)",
      "triggerIdentity": "burstCast + bossElementGate:'Electric' → targetStatus{name:'High-Risk Target', durationSec:20}; the DEF ▼ rides the same gate",
      "targetSet": "enemy (validator requires target 'enemy' on the targetStatus block)",
      "nearestWrongModel": "applying High-Risk Target unconditionally (opens the skill1 rider vs EVERY boss — the single biggest over-credit available in this kit); second-nearest: silently encoding DEF ▼ 10.56% as damageTakenPct 10.56 — DEF subtraction and a damage-taken multiplier are NOT numerically equivalent, and the schema's defPct is documented self-inert, so the boss-DEF path is a genuine engine GAP the driver must reconcile openly (⚑), not paper over",
      "distinguishingAssertion": "on controlComp (boss Fire): zero boss-held buffApply events (casterIdx===null, filter by stat+value 10.56) and zero targetStatus windows, hence zero 152.68 rider events. Boss patched Electric: a 20s 'High-Risk Target' window opens per her cast",
      "inertness": "vs any non-Electric boss this entire block (status + DEF▼ + downstream rider) contributes exactly 0 — it must be dead on the graded Fire control comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:FB-enter-after-own-burst 3789.25% nuke (ownBurstGate)",
    "skill1:hitCount-20 152.68% rider gated on 'High-Risk Target'",
    "skill2:Whistle atkPct 32.73 ×stacks, start 4, cap 5",
    "skill2:≤3-Raptures 5s accrual → 5th stack at t≈5s",
    "skill2:elemAdvantageDamagePct 20.41 passive",
    "burst:elemAdvantageDamagePct 30.97 self 10s (burstCast)",
    "burst:attackDamagePct 27.45 self 10s (burstCast)",
    "burst:targetStatus 'High-Risk Target' 20s + DEF▼, Electric-gated"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Flagged Target: ATK ▼ 10.56% for 10 sec. (boss ATK debuff — defensively inert, boss deals no damage)",
      "■ Activates when an enemy is neutralized if the target is in the Flagged Target state. Affects 1 random enemy unit(s). Flagged Target Designation / Deals 3789.25% of final ATK as additional damage. (no neutralization events vs the partless immortal boss)"
    ],
    "skill2": [
      "■ Activates every time there are 6 or more Raptures present for a period of 1 sec. Penguin Emergency Dispatch: Deals 214.36% of final ATK as additional damage / Whistle stacks ▼ 1. (Rapture count is statically 1 in scope-lock — unreachable)"
    ],
    "burst": []
  },
  "notes": "Three places I expect a shared-prior misread, in leverage order. (1) OWN-BURST GATE: the skill1 nuke's 'entering Full Burst after this unit uses her Burst Skill' is exactly the ownBurstGate:'cast' phrasing; the control comp runs TWO alternating B3s, so a plain fullBurstEnter model roughly DOUBLES a 3789.25% hit — the single largest error available. The distinguishing count-assertion (nuke events === her burstCast events, each fbMajorApplied) must run on the two-B3 comp, not a solo-B3 comp where the gate is invisible. (2) THE ELECTRIC SPINE: High-Risk Target is applied only to Electric Code enemies, and it gates both the DEF ▼ and the skill1 152.68% rider. Against the Fire control boss the faithful model has skill1-block3 + burst-block2 + both elemAdvantageDamagePct lines ALL at exactly zero contribution — so the test file needs a boss-element-patched Electric arm to exercise them, and inertness assertions on the Fire arm to catch ungated encodings. (3) DEF ▼ ENCODING GAP: the schema has no boss-DEF StatKey (defPct is documented self-inert); a DEF ▼ 10.56% is not numerically a damageTakenPct 10.56 (depends on boss DEF/ATK ratio in the formula). If the engine lacks a boss-DEF primitive the driver must ⚑ it in unmodeled/notes, never silently substitute damage-taken. Minor items: Whistle must START at 4 stacks (not 1, not 5) with the 5th at t≈5s via the statically-true ≤3-Raptures timer — do not model live Rapture counting, and do not leave her capped at 4; skill2-block4's first-fire convention (boss spawn counts as 'a Rapture appears') is a ⚑ convention to state explicitly; hitCount counts ROUNDS (AR hitsPerShot 1 so 20 pulls) and whether the 20-counter accrues only inside High-Risk windows vs cumulatively is a semantics choice the test should pin (assert no instant fire at window-open from a pre-accrued counter). All magnitudes are DATAMINED kit-literal; no ALWAYS-⚑ cadence/noFb values are needed by this kit.",
  "model": "claude-fable-5"
}
```


---

## S5 BLIND TEST-WRITER (claude-opus-4-8)
```json
{
  "slug": "marciana-marine-study",
  "leakDetected": null,
  "testSource": "import { describe, it, expect } from 'vitest';\nimport { controlComp, runComp, unitOf, withPatchedOverride } from '../lib/harness';\n\n// ============================================================================\n// marciana-marine-study — BLIND post-op kit spec (S5). Written from kit prose\n// ALONE; blind to the driver's override/tests/reasoning.\n//\n// Kit (AR / Iron / Attacker / Burst III; ammo 60, reloadFrames 81):\n//  S1a  FB-enter AFTER this unit uses her OWN burst, on highest-Max-HP enemy:\n//         3789.25% ATK additional-damage rider (+ enemy ATK\\u25bc10.56%/10s = defensive\\u2192inert).\n//         Trigger = fullBurstEnter + ownBurstGate:'cast' (NOT plain burstCast, NOT plain FB-enter).\n//  S1b  on-enemy-neutralized while Flagged: another 3789.25% rider.\n//         \\u2192 GAP: solo raid has one immortal boss, no neutralize events.\n//  S1c  every 20 normal hits vs a High-Risk target: 152.68% rider.\n//         \\u2192 High-Risk is applied ONLY to Electric enemies (burst), so INERT on a Fire boss.\n//  S2a  battle start: Whistle ATK\\u25b232.73%/stack, +4 stacks (cap 5).\n//  S2b  \\u22643 Raptures / 5s: +1 Whistle stack \\u2192 caps at 5 (boss = 1 Rapture, always true).\n//         Steady state \\u2248 5 stacks = 163.65% ATK (first ~5s at 4 stacks; \\u26a1 minor ramp).\n//  S2c  \\u22656 Raptures / 1s: Penguin Dispatch 214.36% AoE, \\u22121 Whistle.\n//         \\u2192 GAP: solo raid never has 6+ Raptures; also means Whistle never drains \\u2192 stays 5.\n//  S2d  Rapture appears/neutralized while \\u22645 present: Elem-Adv Attack Damage\\u25b220.41%.\n//         \\u2192 INERT: Iron vs Fire boss = no elemental advantage.\n//  burst self: Elem-Adv Attack Damage\\u25b230.97%/10s [INERT, no advantage] + Attack Damage\\u25b227.45%/10s.\n//  burst all-Electric enemies: High-Risk DEF\\u25bc10.56%/20s [INERT, boss is Fire].\n//\n// Fixture: controlComp('marciana-marine-study', true) \\u2014 liter B1 / crown B2 /\n//   marciana B3 (focus, slot 3) / helm B3, boss Fire. Deterministic (no seed).\n//   The two-B3 shape (marciana + helm) is what could exercise the S1a ownBurstGate.\n//\n// Discriminators are built COUNTERFACTUALLY via withPatchedOverride so they do not\n// depend on internal event field names: remove/rekey the block, re-run, compare\n// marciana's total (removeRider < misKeyedAsBurstCast < faithful) \\u2014 this pins BOTH\n// that the rider fires AND that it fires INSIDE Full Burst (takes the +50% major).\n// ============================================================================\n\nconst SLUG = 'marciana-marine-study';\nconst near = (a, b, tol = 0.5) => Math.abs(a - b) < tol;\n\nfunction mTotal(res) { return unitOf(res, SLUG).total; }\nfunction slugTotal(res, slug) { return unitOf(res, slug).total; }\n\nfunction hasFlat(b, pct) {\n  return (b.effects || []).some(e => e.kind === 'flatDamage' && near(e.atkPct, pct));\n}\n\nfunction runWithEvents(opts) {\n  const events = [];\n  opts.cfg = { ...(opts.cfg || {}), onEvent: e => events.push(e) };\n  const res = runComp(opts);\n  return { res, events };\n}\n\n// ---- hoisted runs (each runComp is a full 180s sim) ------------------------\nconst { res: BASE, events: EV } = runWithEvents(controlComp(SLUG, true));\n\nconst NO_RIDER = runComp(withPatchedOverride(SLUG, ov => {\n  ov.blocks = ov.blocks.filter(b => !hasFlat(b, 3789.25));\n}) && controlCompPatched(SLUG));\n\n// withPatchedOverride returns an in-memory override clone the harness reads when\n// runComp is called for this slug; controlComp then builds the comp using it.\nfunction controlCompPatched(slug) { return controlComp(slug, true); }\n\nconst NO_RIDER_RES = runComp((withPatchedOverride(SLUG, ov => {\n  ov.blocks = ov.blocks.filter(b => !hasFlat(b, 3789.25));\n}), controlComp(SLUG, true)));\n\nconst MISKEY_RES = runComp((withPatchedOverride(SLUG, ov => {\n  for (const b of ov.blocks)\n    if (hasFlat(b, 3789.25) && b.trigger && b.trigger.kind === 'fullBurstEnter')\n      b.trigger = { kind: 'burstCast' };\n}), controlComp(SLUG, true)));\n\nconst NO_WHISTLE_RES = runComp((withPatchedOverride(SLUG, ov => {\n  for (const b of ov.blocks)\n    b.effects = (b.effects || []).filter(e => !(e.kind === 'buff' && e.stat === 'atkPct'));\n}), controlComp(SLUG, true)));\n\nconst NO_ELEMADV_RES = runComp((withPatchedOverride(SLUG, ov => {\n  for (const b of ov.blocks)\n    b.effects = (b.effects || []).filter(e => !(e.kind === 'buff' && e.stat === 'elemAdvantageDamagePct'));\n}), controlComp(SLUG, true)));\n\nconst NO_HIGHRISK_RIDER_RES = runComp((withPatchedOverride(SLUG, ov => {\n  ov.blocks = ov.blocks.filter(b => !hasFlat(b, 152.68));\n}), controlComp(SLUG, true)));\n\nconst UNGATED_RES = runComp((withPatchedOverride(SLUG, ov => {\n  for (const b of ov.blocks) if (b.ownBurstGate) delete b.ownBurstGate;\n}), controlComp(SLUG, true)));\n\nconst NO_BURST_ATKDMG_RES = runComp((withPatchedOverride(SLUG, ov => {\n  for (const b of ov.blocks)\n    b.effects = (b.effects || []).filter(e => !(e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 27.45)));\n}), controlComp(SLUG, true)));\n\ndescribe('marciana-marine-study — kit faithfulness', () => {\n\n  it('fixture non-vacuity: marciana bursts and the team reaches Full Burst', () => {\n    expect(EV.filter(e => e.kind === 'fullBurstStart').length).toBeGreaterThan(0);\n    expect(EV.filter(e => e.kind === 'burstCast').length).toBeGreaterThan(0);\n    expect(mTotal(BASE)).toBeGreaterThan(0);\n  });\n\n  // S1a — the 3789.25% FB-enter-after-own-burst rider ------------------------\n  it('S1a: the 3789.25% rider FIRES and adds substantial damage', () => {\n    const contribution = mTotal(BASE) - mTotal(NO_RIDER_RES);\n    expect(contribution).toBeGreaterThan(0);\n    // a 3789% rider firing at least once is a large fraction of her total\n    expect(contribution).toBeGreaterThan(mTotal(BASE) * 0.02);\n  });\n\n  it('S1a: the rider takes the +50% Full-Burst major (fullBurstEnter, NOT burstCast)', () => {\n    // removeRider < misKeyedAsBurstCast < faithful:\n    //  - misKey still deals the rider, so it beats removeRider\n    //  - but keyed to burstCast it lands PRE-FB (no +50% FB major, no FB auras),\n    //    so faithful fullBurstEnter must beat misKey.\n    expect(mTotal(MISKEY_RES)).toBeGreaterThan(mTotal(NO_RIDER_RES));\n    expect(mTotal(BASE)).toBeGreaterThan(mTotal(MISKEY_RES));\n  });\n\n  it('S1a: ownBurstGate never INCREASES fires vs an ungated rider (gate is faithful)', () => {\n    // Removing ownBurstGate can only ADD fires (rider then triggers on any team FB,\n    // incl. rotations helm completes). A faithful gated rider must be <= ungated.\n    expect(mTotal(UNGATED_RES)).toBeGreaterThanOrEqual(mTotal(BASE) - 1e-6);\n  });\n\n  // S2a/S2b — Whistle self ATK stacks ----------------------------------------\n  it('S2a/b: Whistle grants a large self ATK buff that scales all her damage', () => {\n    const drop = mTotal(BASE) - mTotal(NO_WHISTLE_RES);\n    expect(drop).toBeGreaterThan(0);\n    // ~5 stacks x 32.73% is a big ATK lift; removing it should move her total clearly\n    expect(drop).toBeGreaterThan(mTotal(BASE) * 0.05);\n  });\n\n  it('S2a/b: Whistle is a self ATK buff (a buffApply with stat atkPct is emitted)', () => {\n    const atkBuffs = EV.filter(e => e.kind === 'buffApply' && e.stat === 'atkPct' && e.value > 0);\n    expect(atkBuffs.length).toBeGreaterThan(0);\n    // per-stack authoring -> ~32.73; lumped authoring -> ~130.92/163.65. Accept either.\n    const ok = atkBuffs.some(e => near(e.value, 32.73) || near(e.value, 130.92, 2) || near(e.value, 163.65, 2));\n    expect(ok).toBe(true);\n  });\n\n  it('S2a/b: Whistle is SELF-scoped — teammates are byte-identical without it', () => {\n    for (const ally of ['liter', 'crown', 'helm']) {\n      expect(slugTotal(NO_WHISTLE_RES, ally)).toBeCloseTo(slugTotal(BASE, ally), 6);\n    }\n  });\n\n  // burst — Attack Damage +27.45% self ---------------------------------------\n  it('burst: Attack Damage +27.45% self-buff is applied and contributes', () => {\n    const buffs = EV.filter(e => e.kind === 'buffApply' && e.stat === 'attackDamagePct' && near(e.value, 27.45));\n    expect(buffs.length).toBeGreaterThan(0);\n    expect(mTotal(BASE)).toBeGreaterThan(mTotal(NO_BURST_ATKDMG_RES));\n  });\n\n  // ---- INERTNESS on the Fire-boss fixture ----------------------------------\n  it('INERT: Elemental-Advantage damage lines move NOTHING (Iron vs Fire = neutral)', () => {\n    // S2d 20.41% + burst 30.97% elemAdvantageDamagePct: no advantage on a Fire boss.\n    expect(mTotal(NO_ELEMADV_RES)).toBeCloseTo(mTotal(BASE), 6);\n  });\n\n  it('INERT: the 152.68% High-Risk rider (S1c) never fires on a non-Electric boss', () => {\n    // High-Risk is applied only to Electric enemies (burst), so the gate never opens.\n    expect(mTotal(NO_HIGHRISK_RIDER_RES)).toBeCloseTo(mTotal(BASE), 6);\n  });\n\n  // ---- GAP lines (untestable on this fixture / missing primitive) -----------\n  it.skip('S1b: on-enemy-neutralized 3789.25% rider — no neutralize events in solo raid', () => {});\n  it.skip('S1c ACTIVE case: 152.68% every-20-normals rider — needs an Electric boss to open High-Risk', () => {});\n  it.skip('S2c: Penguin Dispatch 214.36% AoE — needs 6+ Raptures present, impossible in solo raid', () => {});\n  it.skip('S2d/burst ACTIVE case: Elem-Adv Attack Damage — needs an advantaged boss the harness cannot build', () => {});\n});\n",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "FB-enter after OWN burst: 3789.25% rider",
      "disposition": "FAITHFUL",
      "assertion": "removeRider < misKey(burstCast) < base proves the rider fires AND lands inside FB with the +50% major; fails under a burstCast-keyed (pre-FB) model or a missing rider."
    },
    {
      "slot": "skill1",
      "kitLine": "ownBurstGate: after THIS unit's burst",
      "disposition": "FAITHFUL",
      "assertion": "removing ownBurstGate must not decrease her total (ungated >= base); a faithful gate can only reduce vs an over-firing plain fullBurstEnter. Strong discrimination is multi-rotation-gated (fixture may have marciana always bursting)."
    },
    {
      "slot": "skill1",
      "kitLine": "Flagged: enemy ATK ▼10.56%/10s",
      "disposition": "UNMODELED",
      "assertion": "defensive boss debuff — no damage effect; not asserted (inert by design)."
    },
    {
      "slot": "skill1",
      "kitLine": "on-neutralize 3789.25% rider",
      "disposition": "GAP",
      "assertion": "it.skip — solo raid has no enemy-neutralization events."
    },
    {
      "slot": "skill1",
      "kitLine": "every 20 normals vs High-Risk: 152.68%",
      "disposition": "GAP",
      "assertion": "INERT on Fire boss (High-Risk is Electric-only). removeHighRiskRider == base proves it does not fire here; active case it.skip'd (needs Electric boss)."
    },
    {
      "slot": "skill2",
      "kitLine": "battle start Whistle ATK▲32.73% +4",
      "disposition": "FAITHFUL",
      "assertion": "removeWhistle drops her total >5%; buffApply stat atkPct present; teammates byte-identical (self-scoped). Fails under generic-team scoping or a missing buff."
    },
    {
      "slot": "skill2",
      "kitLine": "≤3 Raptures/5s: +1 Whistle (cap 5)",
      "disposition": "FAITHFUL",
      "assertion": "folded into the Whistle ATK assertion — boss is 1 Rapture so ramps to and holds 5 stacks (⚡ first-~5s at 4 stacks; steady 163.65%)."
    },
    {
      "slot": "skill2",
      "kitLine": "≥6 Raptures/1s: 214.36% AoE",
      "disposition": "GAP",
      "assertion": "it.skip — never 6+ Raptures in solo raid; also means Whistle never drains."
    },
    {
      "slot": "skill2",
      "kitLine": "≤5 Raptures: Elem-Adv Atk Dmg▲20.41%",
      "disposition": "MEASUREMENT-GATED",
      "assertion": "INERT here (Iron vs Fire = no advantage). removeElemAdv == base proves inertness; active case it.skip'd."
    },
    {
      "slot": "burst",
      "kitLine": "self Elem-Adv Atk Dmg▲30.97%/10s",
      "disposition": "MEASUREMENT-GATED",
      "assertion": "covered by the elemAdvantageDamagePct inertness test (== base on Fire boss)."
    },
    {
      "slot": "burst",
      "kitLine": "self Attack Damage▲27.45%/10s",
      "disposition": "FAITHFUL",
      "assertion": "buffApply stat attackDamagePct ≈27.45 present AND base > removeBurstAtkDmg; fails if scoped wrong or missing."
    },
    {
      "slot": "burst",
      "kitLine": "all Electric enemies: High-Risk DEF▼10.56%/20s",
      "disposition": "MEASUREMENT-GATED",
      "assertion": "INERT (boss Fire, not Electric) — no assertion beyond the S1c-never-fires check that depends on it; active case (boss-DEF amp) it.skip'd."
    }
  ],
  "fixtures": "controlComp('marciana-marine-study', true) — liter B1 / crown B2 / marciana B3 (focus, slot 3) / helm B3, boss Fire, deterministic. Chosen because it supplies B1+B2 so her B3 casts and the team reaches Full Burst (a lone B3 makes ZERO FBs), and the second B3 (helm) is what could exercise the S1a ownBurstGate. helm kept ON — its buffs do not confound the counterfactual-delta assertions (each compares base vs a single-block patch). The Fire boss is load-bearing: marciana is Iron, so every Elemental-Advantage-Damage and High-Risk(Electric) line is inert here, which is exactly what the inertness assertions verify without needing an Electric-boss builder the harness does not expose.",
  "gaps": [
    "S1b on-enemy-neutralized 3789.25% rider — solo raid has one immortal boss, no neutralize events (it.skip).",
    "S1c ACTIVE case (152.68% every-20-normals) — High-Risk status is applied only to Electric enemies, so an Electric boss is required to open the gate; harness controlComp is Fire-only (it.skip). Its INERT case IS tested.",
    "S2c Penguin Dispatch 214.36% AoE + Whistle drain — requires 6+ Raptures simultaneously, impossible in solo raid (it.skip).",
    "S2d / burst Elemental-Advantage Attack Damage ACTIVE case — needs an elementally-advantaged boss the harness cannot build; only the INERT case is tested.",
    "burst High-Risk DEF▼10.56% boss-DEF amp ACTIVE case — needs an Electric boss (it.skip).",
    "⚡ Whistle 4→5 stack ramp over first ~5s is a minor unmeasured trajectory detail; the test accepts either per-stack (32.73) or lumped (130.92/163.65) authoring rather than pinning the ramp.",
    "NOTE: withPatchedOverride mutations target blocks by effect content (atkPct ≈ 3789.25 / 152.68, stat keys) rather than by index, since this writer is blind to the driver's block layout; if the driver authored the rider with a different magnitude or split it, the content-match helpers would need adjustment."
  ],
  "model": "claude-opus-4-8"
}
```


---

## S6 BLIND OVERRIDE-WRITER (claude-opus-4-8)
```json
{
  "slug": "marciana-marine-study",
  "leakDetected": null,
  "override": {
    "slug": "marciana-marine-study",
    "skill1": [
      {
        "trigger": {
          "kind": "fullBurstEnter"
        },
        "ownBurstGate": "cast",
        "target": {
          "kind": "self"
        },
        "effects": [
          {
            "kind": "flatDamage",
            "atkPct": 3789.25,
            "crit": true
          }
        ]
      },
      {
        "trigger": {
          "kind": "hitCount",
          "count": 20
        },
        "requiresTargetStatus": "High-Risk Target",
        "target": {
          "kind": "self"
        },
        "effects": [
          {
            "kind": "flatDamage",
            "atkPct": 152.68,
            "crit": true
          }
        ]
      }
    ],
    "skill2": [
      {
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
            "value": 163.65,
            "maxStacks": 5
          }
        ]
      },
      {
        "trigger": {
          "kind": "passive"
        },
        "target": {
          "kind": "self"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "elemAdvantageDamagePct",
            "value": 20.41
          }
        ]
      }
    ],
    "burst": [
      {
        "trigger": {
          "kind": "burstCast"
        },
        "target": {
          "kind": "self"
        },
        "effects": [
          {
            "kind": "buff",
            "stat": "elemAdvantageDamagePct",
            "value": 30.97,
            "durationSec": 10
          },
          {
            "kind": "buff",
            "stat": "attackDamagePct",
            "value": 27.45,
            "durationSec": 10
          }
        ]
      },
      {
        "trigger": {
          "kind": "burstCast"
        },
        "target": {
          "kind": "enemy"
        },
        "bossElementGate": "Electric",
        "effects": [
          {
            "kind": "targetStatus",
            "name": "High-Risk Target",
            "durationSec": 20
          }
        ]
      }
    ],
    "unmodeled": {
      "skill1": [
        "S1 branch 2: 'Activates when an enemy is neutralized if the target is in the Flagged Target state. Affects 1 random enemy — Deals 3789.25% of final ATK as additional damage.' — on-neutralize spread to a random enemy; INERT vs a single immortal raid boss (no neutralizations, no second target).",
        "'Flagged Target: ATK ▼ 10.56% for 10 sec' (both Flagged Target Designation branches) — enemy ATK debuff; does not affect our damage.",
        "S1 branch 3 'Effect 2: Activates when the target is alive' — trivially true vs the boss."
      ],
      "skill2": [
        "S2 branch 2: 'Activates every time there are 3 or fewer Raptures present for 5 sec — Whistle +1 stack.' — the stack-accrual path; FOLDED into the skill2[0] steady-state (≤3 Raptures is always true vs a single boss, so she reaches the 5-stack cap; not emitted separately to avoid double-counting).",
        "S2 branch 3: 'Penguin Emergency Dispatch — every time there are 6 or more Raptures present for 1 sec: Deals 214.36% of final ATK to all enemies; Whistle stacks ▼ 1.' — add-clear mechanic; requires 6+ Raptures, INERT vs a single boss (never fires, so no Whistle is ever spent)."
      ],
      "burst": [
        "'High-Risk Target: DEF ▼ 10.56% for 20 sec' — the DEF-debuff magnitude of the burst status is not modeled (enemy DEF debuff, element-gated to Electric). The STATUS itself IS modeled (targetStatus 'High-Risk Target') solely to open the skill1[1] rider gate; its damage effect on the boss is unmodeled."
      ]
    },
    "caveats": [
      "⚑ skill2[0] Whistle ATK is authored at the 5-stack CAP (32.73% × 5 = 163.65%). She opens at 4 stacks (130.92%, 80% of cap) and reaches 5 within ~5 s (≤3 Raptures always true vs a single boss). The early-game over-credit is ~20% of this buff for ~5 s — small and brief; a rampSec was NOT used because it would ramp from 0 (under-crediting) rather than from 4/5. Pin the opening trajectory from footage if the first FB timing matters.",
      "⚑ skill1[0]/skill1[1] flatDamage crit:true assumes RIDERCRIT (riders crit at the caster's sheet rate). No core (text says only 'additional damage', not 'core strike'). noFb left unset (FB-enter timing places the 3789.25% nuke inside FB → takes the +50% major).",
      "⚑ skill1[1] (152.68% every 20 normal attacks) is gated on 'High-Risk Target', which the burst applies ONLY to Electric-Code enemies. INERT on the control/scope-lock boss (non-Electric); only live vs an Electric boss. Cadence of the hitCount:20 trigger inherits the datamine-unreliable AR fire rate.",
      "⚑ elemAdvantageDamagePct buffs (skill2[1] 20.41%, burst[0] 30.97%) are engine-gated to elemental advantage. Marciana is Iron: DISADVANTAGED vs a Fire boss, NEUTRAL vs Iron — so both are inert on the control/scope-lock bosses and only live vs an Electric boss."
    ],
    "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Marciana: Marine Study (AR/Iron/B3 Attacker) is an add-clear/spread-flavored kit whose two biggest lines are boss-scoped-inert: the S1 'enemy neutralized' 3789.25% spread and the S2 'Penguin Emergency Dispatch' 214.36% both require multiple/6+ Raptures and NEVER fire vs a single immortal boss. Modeled damage: (1) S1 branch-1 3789.25%-of-ATK nuke on Full-Burst entry AFTER her own burst (fullBurstEnter + ownBurstGate 'cast'); (2) S1 branch-3 152.68% rider every 20 normal attacks, gated on the Electric-only 'High-Risk Target' status → inert on non-Electric bosses. Buffs: Whistle self-ATK at the 5-stack cap (163.65%, opens at 4 stacks), a passive elemAdvantage-damage buff (20.41%) and burst self-buffs (elemAdvantage 30.97% + Attack Damage 27.45%, 10 s), all elemental-advantage-gated. The burst also flags Electric enemies as 'High-Risk Target' (status modeled to open the S1 rider gate; its DEF ▼10.56% magnitude unmodeled). Net: on a NEUTRAL/non-Electric board her modeled damage collapses to base AR fire + the single FB-entry 3789.25% nuke + Whistle ATK; the elemental and status-gated lines only wake up vs an Electric boss."
  },
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "FB-enter after own Burst → 3789.25%",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage 3789.25% atkPct, trigger fullBurstEnter + ownBurstGate 'cast', crit (RIDERCRIT), target self (caster emits hit at boss)."
    },
    {
      "slot": "skill1",
      "kitLine": "Flagged Target: ATK ▼10.56% 10s",
      "status": "SKIPPED",
      "effectOrReason": "Enemy ATK debuff — does not affect our outgoing damage."
    },
    {
      "slot": "skill1",
      "kitLine": "enemy neutralized → 3789.25% random",
      "status": "SKIPPED",
      "effectOrReason": "On-neutralize spread; no neutralizations vs a single immortal boss → inert."
    },
    {
      "slot": "skill1",
      "kitLine": "20 normals vs High-Risk → 152.68%",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage 152.68%, hitCount:20 + requiresTargetStatus 'High-Risk Target' (Electric-only) + crit."
    },
    {
      "slot": "skill2",
      "kitLine": "Start: Whistle ATK+32.73% x5, +4 stk",
      "status": "IMPLEMENTED",
      "effectOrReason": "passive self buff atkPct 163.65 (5-stack cap), maxStacks 5; opens at 4 stacks (⚑ ramp)."
    },
    {
      "slot": "skill2",
      "kitLine": "≤3 Raptures 5s → +1 Whistle",
      "status": "IMPLEMENTED",
      "effectOrReason": "Folded into skill2[0]: ≤3 always true vs single boss → reaches 5-stack cap; not a separate buff (avoids double-count)."
    },
    {
      "slot": "skill2",
      "kitLine": "6+ Raptures → Dispatch 214.36%",
      "status": "SKIPPED",
      "effectOrReason": "Add-clear; requires 6+ Raptures, never true vs a single boss → inert (and no Whistle ▼1 spend)."
    },
    {
      "slot": "skill2",
      "kitLine": "Rapture appears ≤5 → ElemAdv Dmg+20.41%",
      "status": "IMPLEMENTED",
      "effectOrReason": "passive self elemAdvantageDamagePct 20.41 (boss appears at t0, 'continuously'); engine gates to elemental advantage."
    },
    {
      "slot": "burst",
      "kitLine": "Self: ElemAdv Dmg+30.97% 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast self buff elemAdvantageDamagePct 30.97 durationSec 10."
    },
    {
      "slot": "burst",
      "kitLine": "Self: Attack Damage+27.45% 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCast self buff attackDamagePct 27.45 durationSec 10."
    },
    {
      "slot": "burst",
      "kitLine": "Electric enemies: High-Risk DEF▼10.56% 20s",
      "status": "IMPLEMENTED",
      "effectOrReason": "targetStatus 'High-Risk Target' durationSec 20, target enemy, bossElementGate 'Electric' (opens S1 rider gate); DEF ▼ magnitude unmodeled."
    }
  ],
  "flags": [
    {
      "field": "skill2[0].effects[0].value",
      "estimate": "163.65 (5 stacks × 32.73%); opens at 4 stacks = 130.92%",
      "reasoning": "Whistle starts at +4 stacks and gains +1 whenever ≤3 Raptures present for 5s — always true vs one boss — so she caps at 5 within ~5s. Steady state is 5 stacks; only the opening ~5s is at 80% of cap.",
      "recipe": "Confirm ATK at battle start vs cap from an early-frame ATK popup or a solo total; verify she reaches 5 stacks (not stalling at 4) by the first FB."
    },
    {
      "field": "skill1[0].effects[0].crit / .noFb",
      "estimate": "crit:true, noFb unset (takes +50% FB major)",
      "reasoning": "Hard rule 9 + RIDERCRIT: flat-damage riders crit at the caster's sheet rate; no core (text says 'additional damage', not core strike). FB-enter timing lands the nuke inside FB → +50% major by timing.",
      "recipe": "Read the FB-entry popup colour (orange = crit) and magnitude vs 3789.25% × ATK × (crit?) × 1.5; toggle noFb to confirm the +50% is present."
    },
    {
      "field": "skill1[1] / burst[1] (High-Risk Target gate)",
      "estimate": "rider + status both inert on non-Electric bosses",
      "reasoning": "The 152.68% every-20-normals rider requires 'High-Risk Target', applied only to Electric-Code enemies by the burst. On control (Fire) / scope-lock (Iron) bosses the status never applies → rider never fires. Also the elemAdvantage buffs are inert unless Marciana (Iron) is advantaged (vs Electric).",
      "recipe": "Only measurable on an Electric boss; on a neutral board expect base AR + the FB nuke + Whistle ATK only."
    },
    {
      "field": "AR fire cadence (skill1[1] hitCount:20 clock, base fire)",
      "estimate": "datamined reloadFrames 81 / rate inherited",
      "reasoning": "Fire-rate/reload datamines are the known-unreliable fields; the hitCount:20 rider clock and base shot economy depend on effective (frame-quantized) cadence, not the nominal datamine.",
      "recipe": "Verify shots/sec off an ammo-counter read in a solo recording; frame-quantize the nominal rate before trusting the rider trigger cadence."
    }
  ],
  "model": "claude-opus-4-8"
}
```


---

## DRIVER'S TESTS (scripts/tests/units/marciana-marine-study.test.ts)
```typescript
// PER-UNIT KIT SPEC — `marciana-marine-study` (Marciana: Marine Study, Attacker/AR/Iron, Burst III,
// cd 40s, ammo 60, Elysion). Kit-autonomy gauntlet 2026-07-24.
//
// Kit (data/characters.json → characters['marciana-marine-study'].skills):
//   S1 ■ entering Full Burst after own burst → boss (highest Max HP):                  [M1]
//        3789.25% ATK additional damage + Flagged Target (ATK▼10.56%/10s, inert in v1)
//      ■ enemy neutralized if Flagged Target → 1 random enemy:                         [UNMODELED]
//        (no enemyNeutralized trigger; boss never dies)
//      ■ 20 hits vs High-Risk-Target boss → boss: 152.68% ATK additional damage        [M2]
//   S2 ■ start of battle → self: Whistle ATK▲32.73%/stack continuously, max 5; +4 stk  [M3]
//      ■ ≤3 Raptures for 5s → self: Whistle +1 stack (interval:5 in sim, always 1 mob) [M3]
//      ■ ≥6 Raptures for 1s → all enemies 214.36% ATK + Whistle−1                     [UNMODELED]
//        (never ≥6 enemies in solo raid)
//      ■ Rapture appears/neutralized while ≤5 → self: elemAdvantageDamagePct 20.41     [M4]
//        (passive in sim — boss appears at t=0, 1 enemy ≤5)
//   BU ■ burstCast → self: elemAdvantageDamagePct 30.97%/10s + attackDamagePct 27.45%/10s [M5]
//      ■ burstCast + bossElementGate:Electric → boss: High-Risk Target 20s             [M6]
//        (DEF▼10.56% inert at bossDef:0; status gates M2's rider)
//
// Fixture: liter B1 / crown B2 / marciana-marine-study B3 / helm B3, boss Electric
// (Iron > Electric = elemental advantage, exercises elemAdvantageDamagePct + High-Risk Target).
// Deterministic (no seed).
//
// Why each assertion discriminates:
//   M1  fullBurstEnter+ownBurstGate:'cast' fires INSIDE the FB window (inFullBurst=true, takes
//       +50% major). Nearest-wrong: burstCast trigger fires BEFORE FB (inFullBurst=false).
//   M2  requiresTargetStatus:'High-Risk Target' gates the rider to post-burst (High-Risk Target
//       applied by burst). Nearest-wrong: ungated hitCount:20 fires from t=0 (before any burst).
//   M3  perResource whistle ramps 4→5 stacks at t=5s (baseAtk step). Nearest-wrong: flat
//       atkPct:163.65 from t=0 — no ramp, baseAtk constant before t=5s.
//   M4  passive elemAdvantageDamagePct 20.41 active from frame 0. Nearest-wrong: interval:5
//       first fires at frame 300 (t=5s).
//   M5  burstCast applies both self-buffs at the burst frame. Nearest-wrong: wrong values/duration.
//   M6  bossElementGate:'Electric' — rider fires vs Electric boss, NOT vs Fire boss.
//       Nearest-wrong: ungated targetStatus fires vs any boss element.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const MARCIANA = 2; // liter 0 / crown 1 / marciana-marine-study 2 / helm 3

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  overrides: Record<string, any> = {},
  bossElement: Element = 'Electric',
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('marciana-marine-study'),
    bossElement,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------

/** M1 counterfactual: S1 nuke trigger changed from fullBurstEnter to burstCast (fires pre-FB). */
const marcianaBurstCastTrigger = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill1.find(
      (b: any) => b.trigger?.kind === 'fullBurstEnter',
    );
    if (!blk)
      throw new Error('S1 fullBurstEnter block missing — fixture is stale');
    blk.trigger = { kind: 'burstCast' };
    delete blk.ownBurstGate;
  },
);

/** M2 counterfactual: S1 20-hit rider with requiresTargetStatus removed (fires from t=0). */
const marcianaNoStatusGate = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill1.find(
      (b: any) => b.requiresTargetStatus === 'High-Risk Target',
    );
    if (!blk)
      throw new Error('S1 High-Risk Target rider missing — fixture is stale');
    delete blk.requiresTargetStatus;
  },
);

/** M3 counterfactual: Whistle perResource replaced with flat atkPct:163.65 (5 stacks from t=0). */
const marcianaFlatWhistle = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill2.find((b: any) =>
      b.effects?.some((e: any) => e.perResource?.name === 'whistle'),
    );
    if (!blk)
      throw new Error(
        'S2 whistle perResource block missing — fixture is stale',
      );
    blk.effects = [{ kind: 'buff', stat: 'atkPct', value: 163.65 }];
  },
);

/** M1 counterfactual 2: ownBurstGate removed — nuke fires on EVERY team FB (incl. helm's rotations). */
const marcianaNoOwnBurstGate = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill1.find(
      (b: any) => b.trigger?.kind === 'fullBurstEnter',
    );
    if (!blk)
      throw new Error('S1 fullBurstEnter block missing — fixture is stale');
    delete blk.ownBurstGate;
  },
);

/** M4 counterfactual: S2 elemAdvantageDamagePct 20.41 changed from passive to interval:5. */
const marcianaIntervalElemAdv = withPatchedOverride(
  'marciana-marine-study',
  (ov) => {
    const blk = ov.skill2.find((b: any) =>
      b.effects?.some(
        (e: any) => e.stat === 'elemAdvantageDamagePct' && e.value === 20.41,
      ),
    );
    if (!blk)
      throw new Error(
        'S2 elemAdvantageDamagePct 20.41 block missing — fixture is stale',
      );
    blk.trigger = { kind: 'interval', sec: 5 };
  },
);

// ---- runs (hoisted: each is a full 180s sim) ---------------------------------------------------
const base = run();
const burstCastTrigger = run({
  'marciana-marine-study': marcianaBurstCastTrigger,
});
const noOwnBurstGate = run({
  'marciana-marine-study': marcianaNoOwnBurstGate,
});
const noStatusGate = run({ 'marciana-marine-study': marcianaNoStatusGate });
const flatWhistle = run({ 'marciana-marine-study': marcianaFlatWhistle });
const intervalElemAdv = run({
  'marciana-marine-study': marcianaIntervalElemAdv,
});
const fireBoss = run({}, 'Fire');

// ---- readers -----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mmsDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot'], atkPct: number) =>
  dmg(evs).filter(
    (d) =>
      d.slug === 'marciana-marine-study' &&
      d.srcSlot === srcSlot &&
      d.atkPct === atkPct,
  );
const mmsBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'marciana-marine-study',
  );

describe('marciana-marine-study — kit spec', () => {
  describe('M1 — S1 FB-enter nuke (3789.25% ATK) fires inside Full Burst, not at burstCast', () => {
    it('shipped: every 3789.25% S1 hit lands inFullBurst=true', () => {
      const hits = mmsDmg(base.events, 'skill1', 3789.25);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((h) => h.inFullBurst)).toBe(true);
    });

    it('DISCRIMINATING: burstCast trigger fires at least one hit with inFullBurst=false', () => {
      const hits = mmsDmg(burstCastTrigger.events, 'skill1', 3789.25);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => !h.inFullBurst)).toBe(true);
    });

    it('ownBurstGate: nuke count === marciana burstCast count (not total FB count)', () => {
      const nukeCount = mmsDmg(base.events, 'skill1', 3789.25).length;
      const marcianaBurstCount = mmsBursts(base.events).length;
      const totalFBCount = base.events.filter(
        (e) => e.kind === 'fullBurstStart',
      ).length;
      expect(nukeCount).toBe(marcianaBurstCount);
      // two-B3 comp: marciana bursts on ~half the FBs
      expect(marcianaBurstCount).toBeLessThan(totalFBCount);
    });

    it('DISCRIMINATING: without ownBurstGate, nuke fires on EVERY FB (count === totalFBCount)', () => {
      const nukeCount = mmsDmg(noOwnBurstGate.events, 'skill1', 3789.25).length;
      const totalFBCount = noOwnBurstGate.events.filter(
        (e) => e.kind === 'fullBurstStart',
      ).length;
      expect(nukeCount).toBe(totalFBCount);
    });
  });

  describe('M2 — S1 20-hit rider (152.68% ATK) gated on High-Risk Target (post-burst only)', () => {
    it("shipped: every 152.68% S1 hit fires after marciana's first burstCast", () => {
      const firstBurst = mmsBursts(base.events)[0];
      expect(firstBurst).toBeDefined();
      const hits = mmsDmg(base.events, 'skill1', 152.68);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((h) => h.frame > firstBurst.frame)).toBe(true);
    });

    it('DISCRIMINATING: without requiresTargetStatus, at least one 152.68% hit fires before first burst', () => {
      const firstBurst = mmsBursts(noStatusGate.events)[0];
      const hits = mmsDmg(noStatusGate.events, 'skill1', 152.68);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => !firstBurst || h.frame < firstBurst.frame)).toBe(
        true,
      );
    });
  });

  describe('M3 — Whistle stacks ramp 4→5 at t=5s (perResource, not flat)', () => {
    it('shipped baseAtk before t=5s < flatWhistle baseAtk before t=5s (4 vs 5 stacks)', () => {
      const shippedBefore = dmg(base.events).filter(
        (d) =>
          d.slug === 'marciana-marine-study' &&
          d.bucket === 'normal' &&
          d.sec < 5,
      );
      const flatBefore = dmg(flatWhistle.events).filter(
        (d) =>
          d.slug === 'marciana-marine-study' &&
          d.bucket === 'normal' &&
          d.sec < 5,
      );
      expect(shippedBefore.length).toBeGreaterThan(0);
      expect(flatBefore.length).toBeGreaterThan(0);
      const avg = (ds: Damage[]) =>
        ds.reduce((s, d) => s + d.baseAtk, 0) / ds.length;
      expect(avg(shippedBefore)).toBeLessThan(avg(flatBefore));
    });

    it('shipped baseAtk after t=5s ≈ flatWhistle baseAtk after t=5s (both at 5 stacks)', () => {
      const shippedAfter = dmg(base.events).filter(
        (d) =>
          d.slug === 'marciana-marine-study' &&
          d.bucket === 'normal' &&
          d.sec >= 6 &&
          d.sec < 10,
      );
      const flatAfter = dmg(flatWhistle.events).filter(
        (d) =>
          d.slug === 'marciana-marine-study' &&
          d.bucket === 'normal' &&
          d.sec >= 6 &&
          d.sec < 10,
      );
      expect(shippedAfter.length).toBeGreaterThan(0);
      expect(flatAfter.length).toBeGreaterThan(0);
      const avg = (ds: Damage[]) =>
        ds.reduce((s, d) => s + d.baseAtk, 0) / ds.length;
      // Both at 5 stacks after t=5s — within 1% (other buffs may differ slightly by frame)
      expect(
        Math.abs(avg(shippedAfter) - avg(flatAfter)) / avg(flatAfter),
      ).toBeLessThan(0.01);
    });
  });

  describe('M4 — S2 elemAdvantageDamagePct 20.41 is passive (active from frame 0)', () => {
    it('shipped: buffApply for 20.41 fires before frame 300 (t=5s)', () => {
      const buff = buffs(base.events).find(
        (b) =>
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 20.41 &&
          b.casterIdx === MARCIANA,
      );
      expect(buff).toBeDefined();
      expect(buff!.frame).toBeLessThan(300);
    });

    it('DISCRIMINATING: interval:5 first fires at frame ≥300', () => {
      const buff = buffs(intervalElemAdv.events).find(
        (b) =>
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 20.41 &&
          b.casterIdx === MARCIANA,
      );
      expect(buff).toBeDefined();
      expect(buff!.frame).toBeGreaterThanOrEqual(300);
    });
  });

  describe('M5 — burst applies elemAdvantageDamagePct 30.97% + attackDamagePct 27.45% for 10s', () => {
    it("both buffs fire at marciana's burstCast frame", () => {
      const burstFrame = mmsBursts(base.events)[0]?.frame;
      expect(burstFrame).toBeDefined();
      const elemBuff = buffs(base.events).find(
        (b) =>
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 30.97 &&
          b.casterIdx === MARCIANA,
      );
      const atkBuff = buffs(base.events).find(
        (b) =>
          b.stat === 'attackDamagePct' &&
          b.value === 27.45 &&
          b.casterIdx === MARCIANA,
      );
      expect(elemBuff).toBeDefined();
      expect(atkBuff).toBeDefined();
      expect(elemBuff!.frame).toBe(burstFrame);
      expect(atkBuff!.frame).toBe(burstFrame);
    });

    it('both buffs expire after 10s (durationSec=10 → expiresFrame = burstFrame+600)', () => {
      const burstFrame = mmsBursts(base.events)[0]?.frame;
      const elemBuff = buffs(base.events).find(
        (b) =>
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 30.97 &&
          b.casterIdx === MARCIANA,
      );
      const atkBuff = buffs(base.events).find(
        (b) =>
          b.stat === 'attackDamagePct' &&
          b.value === 27.45 &&
          b.casterIdx === MARCIANA,
      );
      expect(elemBuff!.expiresFrame).toBe(burstFrame! + 600);
      expect(atkBuff!.expiresFrame).toBe(burstFrame! + 600);
    });
  });

  describe('M6 — High-Risk Target (and thus S1 rider) is Electric-boss-only', () => {
    it('S1 152.68% rider fires vs Electric boss', () => {
      expect(mmsDmg(base.events, 'skill1', 152.68).length).toBeGreaterThan(0);
    });

    it('S1 152.68% rider does NOT fire vs Fire boss (no High-Risk Target)', () => {
      expect(mmsDmg(fireBoss.events, 'skill1', 152.68).length).toBe(0);
    });
  });
});
```


---

## DRIVER'S OVERRIDE (src/skills/overrides/marciana-marine-study.json)
```json
{
  "note": "Marciana: Marine Study — Iron AR B3 Attacker, Elysion. Kit-autonomy gauntlet 2026-07-24.\n\nS1 (Emergency Whistle): two modelable blocks. (1) FB-enter (ownBurstGate:'cast') → boss: 3789.25% flatDamage + targetStatus 'Flagged Target' 10s (the ATK ▼10.56% content is inert in v1 — boss ATK irrelevant; the named window is modeled for kit completeness). (2) hitCount:20 + requiresTargetStatus:'High-Risk Target' → boss: 152.68% flatDamage — the 20-hit rider against a High-Risk-Target-afflicted boss; hitCount counts all hits (not normal-only), a small over-count for an AR with frequent normals; noted in caveats.\n\nS2 (Penguin Emergency Dispatch): Whistle resource pool (initial:4, max:5). Passive perResource atkPct (whistle×32.73%) — 4 stacks at t=0 (130.92%), 5 at t=5s (163.65%) via interval:5 resource+1 (the '≤3 Raptures for 5s' trigger is always true in the solo-raid sim with 1 enemy, so interval:5 is exact). Passive elemAdvantageDamagePct 20.41 (the 'Rapture appears/neutralized while ≤5' trigger fires once at t=0 in the sim; modeled as passive). The '≥6 Raptures for 1s' Penguin Emergency Dispatch (214.36% AoE + whistle−1) is UNMODELED — never ≥6 enemies in the sim.\n\nBurst: burstCast → self elemAdvantageDamagePct 30.97%/10s + attackDamagePct 27.45%/10s; burstCast + bossElementGate:'Electric' → boss targetStatus 'High-Risk Target' 20s (DEF ▼10.56% content inert at bossDef:0; the named window gates S1's 20-hit rider).\n\nTIER: Tier 2 (elevated) — scoped-buff (Whistle perResource), burstCast-vs-fullBurstEnter (S1 vs burst), status-gate (requiresTargetStatus). S2b/S5/S6/S7 all cross-family.",
  "resources": [
    { "name": "whistle", "initial": 4, "min": 0, "max": 5 }
  ],
  "unmodeled": {
    "skill1": [
      "■ Activates when an enemy is neutralized if the target is in the Flagged Target state. Affects 1 random enemy unit(s). Flagged Target Designation Effect 1: Deals 3789.25% of final ATK as additional damage. Effect 2: Activates when the target is alive. Flagged Target: ATK ▼ 10.56% for 10 sec. — UNMODELED: no enemyNeutralized trigger in the engine; inert in the sim (the boss never dies). The Flagged Target status IS modeled (targetStatus) as the gate for this block, but the block itself never fires."
    ],
    "skill2": [
      "■ Activates every time there are 6 or more Raptures present for a period of 1 sec. Penguin Emergency Dispatch Function: Expends Whistle stacks to attack Raptures when there are 6 or more present. Effect 1: Affects all enemies. Deals 214.36% of final ATK as additional damage. Effect 2: Affects self. Whistle stacks ▼ 1. — UNMODELED: no enemy-count trigger in the engine; inert in the sim (never ≥6 enemies in solo raid)."
    ],
    "burst": []
  },
  "caveats": [
    "skill1: the 'enemy neutralized if Flagged Target' block is UNMODELED — no enemyNeutralized trigger; inert in sim (boss never dies). Flagged Target targetStatus IS modeled for kit completeness.",
    "skill1: hitCount:20 counts ALL hits (normal + skill + burst), not normal-only as the kit text implies ('landing 20 normal attacks'). For an AR at 720 RPM with infrequent skill procs the over-count is small; noted, not fitted.",
    "skill2: the '≤3 Raptures for 5 sec' Whistle-stack gain is modeled as interval:5 — exact for the solo-raid sim (always 1 enemy, always ≤3). The real trigger is enemy-count-gated.",
    "skill2: the 'Rapture appears/neutralized while ≤5' Elemental Advantage buff is modeled as passive — in the sim the boss appears at t=0 (1 enemy, ≤5), so it fires once and is continuous. The real trigger is enemy-appear/neutralize-gated.",
    "burst: DEF ▼10.56% on High-Risk Target is inert at bossDef:0 (scope lock). The targetStatus 'High-Risk Target' IS modeled as the gate for S1's 20-hit rider.",
    "skill1: ATK ▼10.56% debuff content of Flagged Target is inert in the damage sim (boss ATK is irrelevant). The targetStatus window is modeled for kit completeness."
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "fullBurstEnter" },
      "ownBurstGate": "cast",
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "flatDamage", "atkPct": 3789.25 },
        { "kind": "targetStatus", "name": "Flagged Target", "durationSec": 10 }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "hitCount", "count": 20 },
      "requiresTargetStatus": "High-Risk Target",
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "flatDamage", "atkPct": 152.68 }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "atkPct", "value": 0, "perResource": { "name": "whistle", "mult": 32.73 } }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "interval", "sec": 5 },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "resource", "name": "whistle", "delta": 1 }
      ]
    },
    {
      "slot": "skill2",
      "trigger": { "kind": "passive" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "elemAdvantageDamagePct", "value": 20.41 }
      ]
    }
  ],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "self" },
      "effects": [
        { "kind": "buff", "stat": "elemAdvantageDamagePct", "value": 30.97, "durationSec": 10 },
        { "kind": "buff", "stat": "attackDamagePct", "value": 27.45, "durationSec": 10 }
      ]
    },
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "bossElementGate": "Electric",
      "target": { "kind": "enemy" },
      "effects": [
        { "kind": "targetStatus", "name": "High-Risk Target", "durationSec": 20 }
      ]
    }
  ]
}
```


---

## S2d VERIFICATION: all 14 driver tests GREEN vs shipped override (npx vitest run, 2026-07-24).

