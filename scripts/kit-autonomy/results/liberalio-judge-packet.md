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

---

---

## MECHANICS SSOT (pointers + load-bearing excerpts)

Full docs: docs/data/damage-calculation.md, docs/data/game-mechanics.md (authoritative; excerpts below).

### Damage formula bracket (docs/data/damage-calculation.md:44-56)

against the OL0 numbers are flagged for re-check at the Base 5 basis. See DECISIONS.)

### Damage formula — buckets & per-type applicability (sourced 2026-07-14)

Triple-validated across ENG/JP/KR (nikke.gg; JP empirical tests ginmy.net; KR arca.live) — full
source list in `docs/handoffs/2026-07-14-damage-buckets-and-ginmy.md`. Damage is a **product of
independent multiplicative buckets**; same-type buffs **add within** a bucket, different buckets
**multiply**. THE ENGINE (`dealDamage`) ALREADY MATCHES THIS:

````
finalATK = staticAtk × (1 + Σ ATK%)  +  Σ("% of caster's ATK" flat)  +  Σ(HP→ATK flat)
dmg = (max(0, finalATK − enemyDEF) × weaponOrSkillCoef)   ← DEF subtracts INSIDE the base, pre-coef
    × major   [1 + crit + core + fullBurst(0.5) + range(0.3)]  ← ADDITIVE within (core does NOT ×crit)
    × element [1 + 0.1 advantage + elem-dmg buffs]
    × charge  [charged shots only]

### Burst-chain timing — MEASURED (docs/data/game-mechanics.md:44-48, 211-218)
Major bucket = `1 + 0.5·FB + 0.3·range + critRate·(critDmg−1) + coreRate·(coreMult−1)` —
crit, core (+100% base), Full Burst (+50%), and effective range (+30%) all share ONE
additive bracket. The +50% applies by TIMING: burst-cast damage lands before the window
opens and never gets it (§8). Full structure, per-bucket membership, and the skill-proc
("additional damage") rules: **[nikke-damage-formula.md](nikke-damage-formula.md)**.
- **Burst-chain timing** (frame-perfect MEASURED 2026-07-21, chisato.mov; DECISIONS 2026-07-21
  coherent rotation model): the chain runs **`gauge-full → 30f → B1 → 30f → B2 → 30f → B3 → 22f →
FB countdown (10s)`**. So gauge-full → FB-start ≈ 112f (~1.87s), not the old ~0.9s. Constants:
  a **30f delay before B1** (`PRE_B1_GAP_FRAMES`), **30f between stages** (`STAGE_CAST_GAP_FRAMES`,
  0.5s), and a **22f delay between the B3 cast and the FB countdown** (`FB_PRE_DELAY_FRAMES`) — that
  gap is why instant burst-cast attacks land before Full Burst begins (no +50%). After FB ends, the
  next chain can't open for **~2.5s** (`POST_FB_CHAIN_DELAY_FRAMES` = **150f**; the earlier 180f/~3s
  double-counted the now-separately-modeled 30f-pre-B1). **Fight start:** ~8f (`FIGHT_DELAY_FRAMES`

### ENGINE: hitCount trigger semantics (src/engine/sim.ts:2899-2912) — the counter adds hitsPerShot PER PULL
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

### ENGINE: effective SG pellet count (src/engine/sim.ts:1147-1157) — pelletCountFlat is summed into hitsPerShot
  // Effective SG pellet count — the char-static base (`hitsPerShot`) plus any live `pelletCountFlat`
  // buff ("Number of pellets ▲ N"). SG-only & swap-off (a swap fires the swap weapon, not the SG
  // spread). Threaded through the SG landing/gauge path (firePull) so a "+N pellets" buff is a real,
  // queryable pellet-count change — each pellet carries 1/base of the shot — instead of a
  // normalAttackPct proxy. `stat()` sums pelletCountFlat buffs (0 for every non-carrier ⇒ eff = base
  // ⇒ byte-identical). May be fractional while a pelletCountFlat buff ramps (rampSec).
  const effectivePellets = (u: UnitState, frame: number): number =>
    u.char.weapon === 'SG' && !u.swap
      ? u.char.hitsPerShot + stat(u, 'pelletCountFlat', frame)
      : u.char.hitsPerShot;
  // one skill-damage impact (flatDamage proc, dot tick) = one target-base hit of gen

### ENGINE: FB-entry emission (src/engine/sim.ts:2184-2194) — fullBurstStart marker, THEN fullBurstEnter triggers, SAME frame
  // must already be set when this runs (the log reads it).
  const emitFbEnter = (atFrame: number) => {
    // LEADING marker, symmetric with 'fullBurstEnd': emitted BEFORE the fullBurstEnter triggers and
    // the stored-hit releases below, so a consumer partitioning the stream on [start, end) captures
    // the FB-entry damage (stored projectile releases) that belongs to this window. fbEndFrame is
    // already set by both callers (see the note above).
    if (onEvent) {
      onEvent({ kind: 'fullBurstStart', frame: atFrame, sec: atFrame / FPS, endFrame: fbEndFrame });
    }
    units.forEach((u) => fireTriggered(u, 'fullBurstEnter', atFrame));
    // release stored hits (e.g. Rapi:RH's attached projectiles exploding) AFTER enter-buffs so FB

### SCHEMA: target kinds (src/skills/types.ts:90-106)
  | { kind: 'allies'; excludeSelf?: boolean }
  | { kind: 'enemy' }
  | { kind: 'burstCasters'; stage?: number; element?: string }                // allies who cast a burst this rotation
  | { kind: 'nonBurstCasters' }
  // excludeSelf: "N highest-ATK ally (except the skill user)" — miranda, soda-twinkling-bunny.
  // Applied to the candidate pool BEFORE the count-slice (exclude-then-take-N).
  // byFinalAtk: rank by LIVE effectiveAtk (buffed) instead of staticAtk (base) — set ONLY when the
  // kit text literally says "highest/lowest FINAL ATK" (A3, 2026-07-20). Absent = static ranking
  // (kits that say plain "highest ATK", e.g. naga, keep base-ATK ranking per the owner literal-word rule).
  | { kind: 'alliesTopAtk'; count: number; excludeSelf?: boolean; byFinalAtk?: boolean }
  | {
      kind: 'alliesLowestAtk'; // "N [Burst X] ally unit(s) with the lowest final ATK"
      count: number;
      burst?: 'I' | 'II' | 'III';
      excludeSelf?: boolean; // e.g. Liberalio is immune to charge-speed buffs
      byFinalAtk?: boolean;  // rank by live effectiveAtk when the kit says "lowest FINAL ATK" (A3)
    }

---


---

## GROUND TRUTH — Liberalio (slug `liberalio`), from data/characters.json

### Kit prose (verbatim, lvl-10 magnitudes)
**Skill 1 (Calm Depths):**
■ Activates when entering Full Burst. Affects self.
ATK ▲ 160% for 3 sec.
■ Activates when landing a Full Charge attack on a target's core. Affects self.
Attack Damage ▲ 20.83% for 60 sec.
■ Activates when landing a Full Charge attack. Affects the target.
Deals 40.5% of final ATK as additional damage. Activates 5 times.
■ Activates when entering Full Burst. Affects the 1 Burst 3 ally unit(s) with the lowest final ATK.
Charge Speed ▲ 12.74% of the skill user's Charge Speed for 10 sec.

**Skill 2 (Strange Currents):**
■ Activates when landing a Full Charge attack against the stage target. Affects self.
Raging Current: Attack Damage ▲ 231% continuously.
Removes Gentle Current.
■ Activates when landing a Full Charge attack against a Rapture that is not the stage target. Affects self.
Gentle Current: Fixes charge time at 1 sec continuously.
Removes Raging Current.
■ Activates at the start of battle. Affects self.
Gains immunity to Increase Charge Speed effects. This effect is continuous and cannot be removed.
Gains immunity to Decrease Charge Speed effects. This effect is continuous and cannot be removed.

**Burst (Submerged World):**
■ Affects self.
Attack Damage ▲ 50% for 10 sec.
■ Affects all enemies.
Deals 925% of final ATK as additional damage.

### Base stats + datamine
- weapon SR, class Attacker, element Wind, manufacturer Pilgrim, burst III, burstCooldownSec 40
- normalAttackMultiplier 69.04, coreAttackMultiplier 200, chargeMultiplier 250
- ammo 6, reloadFrames 141, chargeFrames 90, hitsPerShot 1
- baseStats: {"hp":13500,"atk":600,"def":76,"core":{"hp":200,"atk":200,"def":200},"grade":{"hp":3000,"atk":20,"def":100,"ratio":200},"critRate":15,"maxLevel":1200,"critDamage":150,"resourceId":262}
- MEASURED provenance (kit-status): focus recording — four in-FB proc crit-step pairs read x1.3333 exactly; T1/T5 ~1.0. Board ratios include T1 wind-weak (boss Iron) 0.9334.

### Driver's line inventory (S0)
L1 S1 FB-enter self ATK +160%/3s — FAITHFUL. L2 S1 core-hit self Attack Damage +20.83%/60s (requiresCore) — FAITHFUL.
L3 S1 per-full-charge rider 40.5% x5 activations = 202.5% flatDamage, noRange, FB-by-timing — FAITHFUL/MEASURED (user-confirmed 5-hit read; single-hit read left her 0.70 cold).
L4 S1 FB-enter Charge Speed +12.74%/10s to the 1 lowest-final-ATK Burst-3 ally, excludeSelf — FAITHFUL.
L5 S2 Raging Current Attack Damage +231% continuous (solo-raid boss = stage target always) — FAITHFUL; trigger shotFired (earned on first landed charge; fixed from passive during this gauntlet, S5-driven).
L6 S2 Gentle Current (charge fixed 1s vs non-stage Rapture) — UNMODELED-inert (unreachable: solo raid has only the stage target).
L7 S2 charge-speed immunity — UNMODELED-defensive GAP (no schema primitive; partially honored via L4 excludeSelf; external sources documented caveat, dormant in the control comp).
L8 Burst self Attack Damage +50%/10s (burstCast) — FAITHFUL. L9 Burst 925% nuke to all enemies (burstCast, cast-before-FB) — FAITHFUL.
Tier 2: scoped lowest-final-ATK B3 selector + fullBurstEnter-vs-burstCast split + Q1-calibrated range/FB exemptions.

---

## S2b TEST-FAITHFULNESS REVIEW (claude-fable-5, leak-clean)
{
  "slug": "liberalio",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "FB enter: ATK ▲ 160% for 3 sec",
      "disposition": "FAITHFUL",
      "scope": "generic ATK stat (atkPct), all of her damage while live",
      "durationSemantics": "wall-clock 3 sec (durationSec 3 = 180 frames) — unusually short; NOT the 10s FB window",
      "triggerIdentity": "fullBurstEnter — 'entering Full Burst' fires on ANY team FB, not only rotations she bursts",
      "targetSet": "self",
      "nearestWrongModel": "durationSec 10 (or 'whole FB window') — the modeler pattern-matches an FB-entry self buff to the FB length; with her 1.5s charge (90f) + 22f release latency only ~1–2 shots land inside 3s, so a 10s window roughly triples the buffed shot count",
      "distinguishingAssertion": "buffApply {stat:'atkPct', value:160, targetSlug:'liberalio'} at each fullBurstStart has expiresFrame === applyFrame + 180; a liberalio charge shot landing >3s after FB start shows NO 160 atkPct contribution (compare damage event mult vs an early-window shot). Also apply count === fullBurstStart count (fires on helm-led FBs too)",
      "inertness": "no atkPct 160 applies outside FB entries; never applied to allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge on core: AtkDmg ▲ 20.83% 60s",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket, additive/diluted) — NOT atkPct, NOT chargeDamagePct",
      "durationSemantics": "durationSec 60, refresh on re-proc, maxStacks 1 (no stack language) — effectively near-permanent once core hits land",
      "triggerIdentity": "on LANDING a full-charge shot WITH core — shotFired/full-charge trigger + requiresCore gate; first apply strictly after first landing (≥ chargeFrames 90 + release latency), never t=0",
      "targetSet": "self",
      "nearestWrongModel": "requiresCore omitted (applies on every full charge) and/or stacking per proc; the ungated read is damage-close for a high-core SR but is a different mechanic and diverges whenever core rate < 1",
      "distinguishingAssertion": "buffApply {stat:'attackDamagePct', value:20.83} events: first one lands at frame ≥ ~112 (charge+latency), all subsequent carry refresh/stacks===1 (never stacks>1); the carrying block must gate on core (apply cadence tracks core-landing full charges, not raw full-charge count when core<1)",
      "inertness": "must NOT stack (value contribution capped at one 20.83 instance); must not move allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge: 40.5% add'l dmg ×5",
      "disposition": "FAITHFUL",
      "scope": "flatDamage rider, % of final ATK; crit at caster rate, NO core (text lacks 'core strike'), noRange (universal rider rule), FB bonus by landing timing (noFb default OFF)",
      "durationSemantics": "instant; 'Activates 5 times' = FIVE hits per full-charge landing (5 × 40.5% = 202.5% per shot), NOT a per-battle cap",
      "triggerIdentity": "on landing every full-charge attack — per-shot, ungated, whole fight",
      "targetSet": "enemy (the hit target)",
      "nearestWrongModel": "'Activates 5 times' read as a 5-per-battle cap (rider stops after the 5th full charge) — massively under-credits her ~40+ full charges per fight; secondary misread: a single 40.5% hit (÷5 total)",
      "distinguishingAssertion": "count of rider damage events (mult≈40.5, srcSlot skill1) === 5 × number of liberalio full-charge landings, and rider events still occur after her 6th+ full charge (e.g. events exist past t=15s); per-event rangeApplied===false, core rate 0",
      "inertness": "no core bucket on rider hits; no +30% range on rider hits",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter: ChgSpd ▲12.74% → lowest-ATK B3",
      "disposition": "FAITHFUL",
      "scope": "chargeSpeedPct — a weapon-state modifier, IS damage (gates the recipient's shot count); '12.74% of the skill user's Charge Speed' is caster-scaled, but her own charge-speed immunity (skill2) pins her charge speed at base, so it resolves to a CONSTANT 12.74%",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "fullBurstEnter (any team FB)",
      "targetSet": "alliesLowestAtk {count:1, burst:'III', byFinalAtk:true} — kit literally says 'lowest FINAL ATK' → live-ATK ranking per the A3 rule; pool is Burst-3 units only; if she is herself the lowest B3 the buff is inert on her (immunity)",
      "nearestWrongModel": "dropping the Burst-III restriction — 'lowest final ATK ally' overall lands the buff on the B1/B2 supporter (Supporter static 98,367 < Attacker 118,027), i.e. liter/crown instead of a B3 (helm/carry); secondary misread: static-ATK ranking (byFinalAtk omitted)",
      "distinguishingAssertion": "buffApply {stat:'chargeSpeedPct', value:12.74} targetSlug is a Burst-III unit (helm or the carry in controlComp) and is NEVER liter/crown; apply occurs at each fullBurstStart with expiresFrame = apply + 600",
      "inertness": "must not change liberalio's own charge cadence even if she is the selected target (immunity); inert on a non-charge-weapon recipient",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Raging Current: AtkDmg ▲ 231% cont.",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct 231 (Damage Up bucket, additive with her 20.83 + burst 50 + team AD buffs — dilution matters, do NOT encode as atkPct or a multiplier)",
      "durationSemantics": "'continuously' = no time expiry (permanent until removed); mode-exclusive with Gentle Current, which never activates in v1 (single stage target) → once up, up for the fight",
      "triggerIdentity": "on landing a full-charge attack against the STAGE TARGET — in this sim every shot hits the stage boss, so it goes live at her FIRST full-charge landing (~frame 112), not at t=0",
      "targetSet": "self",
      "nearestWrongModel": "stacking per full-charge landing (each proc adds another 231 instance — 'continuously' + repeating trigger without maxStacks 1 multiplies to absurdity); secondary misread: passive-from-t0 shortcut (over-credits only the pre-first-landing ~1.9s, minor but unfaithful trigger identity)",
      "distinguishingAssertion": "buffApply {stat:'attackDamagePct', value:231} — first apply at frame ≥ ~112 (after first full-charge landing), and stacks===1 on every apply (re-procs are refreshes); her total damage consistent with exactly ONE live 231 instance for ~the whole fight",
      "inertness": "must NOT stack; Gentle Current must never appear (no non-stage rapture exists); 'Removes Gentle Current' is inert",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Gentle Current: charge fixed 1 sec",
      "disposition": "UNMODELED",
      "scope": "charge-time CLAMP (a fix-at-value primitive, not chargeSpeedPct) — vs non-stage raptures only",
      "durationSemantics": "'continuously', mode-exclusive with Raging Current",
      "triggerIdentity": "on landing a full charge against a Rapture that is NOT the stage target — unreachable in v1 (partless single boss, no adds)",
      "targetSet": "self",
      "nearestWrongModel": "modeling it as live anyway (or as a chargeSpeedPct buff) — any Gentle Current activity in this sim is a bug, since the trigger condition cannot occur",
      "distinguishingAssertion": "NO charge-time-clamp / Gentle-Current buffApply ever appears in a full run; her charge time is 90 frames on every shot (outside the S1-line-4 recipient case, which anyway never targets her effectively)",
      "inertness": "entire block inert; must appear verbatim in unmodeled",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Immunity to Charge Speed ▲/▼, permanent",
      "disposition": "GAP",
      "scope": "weapon-state protection: NO chargeSpeedPct effect (buff OR debuff, any source incl. her own S1 line 4) may change her charge time — this IS damage-relevant (charge speed gates her shots/fight)",
      "durationSemantics": "start of battle, continuous, cannot be removed",
      "triggerIdentity": "passive from t=0",
      "targetSet": "self",
      "nearestWrongModel": "omitting the immunity (schema has no immunity primitive, so the path of least resistance is silence) — then any team charge-speed buff, or her own S1 line-4 self-application when she is the lowest-ATK B3, speeds her up and over-credits her shot count",
      "distinguishingAssertion": "with withPatchedOverride injecting an allies-targeted chargeSpeedPct buff on a teammate (or forcing S1 line 4 to select her), liberalio's shot count / totals(res)['liberalio'] is UNCHANGED vs baseline; her inter-shot cadence stays 90-frame-charge-derived all fight",
      "inertness": "her charge cadence is invariant under every chargeSpeedPct source; this also pins S1 line 4's caster-scaled value at a constant 12.74",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "self: Attack Damage ▲ 50% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct 50 (additive Damage Up, dilutes with 231 + 20.83)",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast — a self line in her OWN burst block with no activation clause fires only on rotations SHE casts B3; NOT fullBurstEnter",
      "targetSet": "self",
      "nearestWrongModel": "fullBurstEnter — fires on every team FB including rotations the other B3 (helm in controlComp) bursts; in a dual-B3 comp this roughly doubles the buff's uptime credit",
      "distinguishingAssertion": "count of buffApply {stat:'attackDamagePct', value:50} === count of burstCast events by liberalio, and is strictly LESS than fullBurstStart count in the dual-B3 controlComp; no apply on a rotation where helm bursts",
      "inertness": "no apply on FBs she did not cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "all enemies: 925% final ATK add'l dmg",
      "disposition": "FAITHFUL",
      "scope": "flatDamage atkPct 925 on burst cast; crit at her sheet rate, no core, noRange",
      "durationSemantics": "instant, once per burst cast",
      "triggerIdentity": "burstCast — and per the measured cast-timing rule, burst-cast damage lands BEFORE the Full Burst window opens: FB-exempt (no +50%), no FB-entry auras (her own S1 160 ATK is not yet applied to this hit)",
      "targetSet": "enemy",
      "nearestWrongModel": "applying the +50% Full Burst major (and/or the FB-entry 160 ATK buff) to the nuke — keying the damage to fullBurstEnter or letting it land inside the window over-credits every cast by ~50%+",
      "distinguishingAssertion": "the 925% damage event (mult≈925, bucket flat/burst) has fbMajorApplied===false, rangeApplied===false, and its damage reflects pre-FB buff state (no 160 atkPct in its mult); one such event per liberalio burstCast",
      "inertness": "never fires on helm's rotations; exactly one hit per cast (single boss — 'all enemies' = the one target)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:FB-enter ATK 160%/3s",
    "skill1:core-gated AttackDamage 20.83%/60s",
    "skill1:full-charge rider 40.5%×5",
    "skill1:FB-enter ChargeSpeed 12.74% lowest-final-ATK B3",
    "skill2:Raging Current AttackDamage 231% continuous",
    "skill2:charge-speed immunity (both directions)",
    "burst:self AttackDamage 50%/10s (burst-cast)",
    "burst:925% nuke (FB-exempt)"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "Gentle Current: Fixes charge time at 1 sec continuously.",
      "Removes Raging Current.",
      "Removes Gentle Current."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to reconcile: (1) 'Activates 5 times' on the S1 rider — the trap is reading it as a per-battle cap; it is 5 hits per full-charge landing, all fight (event-count assertion, not totals — a single 202.5% hit is totals-identical). (2) S1 line 4's target — the pool is Burst-III allies ranked by FINAL (live) ATK; dropping the B3 restriction retargets the buff to the B1/B2 supporter (lowest static ATK in controlComp), a completely different recipient; also note the elegant consistency: her own charge-speed immunity makes '12.74% of the skill user's Charge Speed' a guaranteed constant, and makes the buff inert if she self-selects. (3) The burst pair splits trigger identity: the kit's S1 lines say 'entering Full Burst' (team-wide) while the burst block's self line is burst-cast-only — the dual-B3 controlComp (helm) is exactly the fixture that separates them; a model keying both the same way is wrong on one of them. (4) The 925% nuke is FB-exempt by cast timing (measured project-wide rule) — fbMajorApplied must be false. (5) Raging Current: the whole Raging/Gentle mode machinery collapses in v1 to 'permanently on after the first full-charge landing' — acceptable, but it must be a landing-gated single non-stacking instance in the Damage-Up bucket (231 additive, diluted), never stacked per proc and never atkPct. (6) The charge-speed immunity has no schema primitive (GAP) — the test must assert it behaviorally (shot-count invariance under an injected chargeSpeedPct buff); omitting it silently is the likely failure. (7) The S1 FB-entry ATK buff is only 3s — with 90-frame charge + release latency only ~1–2 shots benefit per FB; a 10s/whole-window read materially over-credits. Magnitudes are all kit-literal (DATAMINED); the ⚑ fields here are the base cadence tuple and the rider's landing-timing FB share, both engine-level, not override choices.",
  "model": "claude-fable-5"
}


---

## S5 BLIND TEST (claude-opus-5, written from kit prose ALONE; harness import path mechanically fixed for the blind/ location — semantics untouched)
/**
 * liberalio - SR / Wind / Attacker / Burst III (cd 40s, ammo 6, reload 141f, charge 90f,
 * hitsPerShot 1, normal 69.04, core 200). BLIND kit spec test: written from the kit prose
 * alone, with no sight of the driver's override, tests, or reasoning.
 *
 * KIT (paraphrased; magnitudes verbatim)
 *  s1a  FB-enter, self: ATK +160% for 3s.
 *  s1b  landing a full charge ON CORE, self: Attack Damage +20.83% for 60s.
 *  s1c  landing a full charge, the target: 40.5% of final ATK as additional damage,
 *       "Activates 5 times" (multiplicity ambiguous -> flagged; see the skipped probe).
 *  s1d  FB-enter, the 1 Burst-III ally with the LOWEST FINAL ATK:
 *       Charge Speed +12.74% "of the skill user's Charge Speed" for 10s.
 *  s2a  landing a full charge vs the STAGE TARGET, self: Raging Current -
 *       Attack Damage +231% continuously; removes Gentle Current.
 *  s2b  landing a full charge vs a NON-stage-target Rapture, self: Gentle Current -
 *       charge time FIXED at 1s continuously; removes Raging Current.
 *  s2c  battle start, self: immunity to Increase AND Decrease Charge Speed, permanent.
 *  bA   burst, self: Attack Damage +50% for 10s.
 *  bB   burst, all enemies: 925% of final ATK as additional damage.
 *
 * FIXTURE: controlComp('liberalio', true) = liter B1 / crown B2 / liberalio B3 / helm B3,
 * Fire boss, focus liberalio. B1+B2 are mandatory - a lone Burst III casts nothing and makes
 * ZERO full bursts, which would silently vacuum every FB-enter and burst assertion. helm (the
 * fixed second B3) is kept ON deliberately: s1d's target-set ("the 1 Burst-III ally with the
 * lowest final ATK") is only a real CHOICE when a second Burst III exists, and a second B3 is
 * also what separates burst-cast from full-burst-enter.
 *
 * DISCRIMINATION NOTES
 *  - Duration counterfactuals patch to a SHORT window (0.5s), never a merely-shorter one.
 *    Her charge cadence is ~2s (90f charge + 22f release latency, 6-round mag, 141f reload),
 *    so ANY window >= ~4s refreshes into permanence: a "60s -> 5s" patch would move nothing
 *    and would be a fake discriminator. 0.5s lapses before the next charge, so the faithful
 *    window is provably load-bearing. Corollary (stated, not asserted - it is untestable in a
 *    180s fight): "for 60 sec" refreshed by every core charge and "continuously" are
 *    observationally IDENTICAL here; only the trigger identity is separable, which is what the
 *    passive-vs-triggered patch tests.
 *  - Structural assertions read the COMMITTED override via withPatchedOverride(slug, () => {})
 *    (a clone - disk untouched) so magnitudes, durations, triggers, gates and target-sets are
 *    pinned EXACTLY, not merely in aggregate. Aggregate-only tests cannot tell 20.83% generic
 *    from 20.83% core-gated.
 *  - slotBlocks() tolerates BOTH override shapes documented to me (slot -> Block[] and
 *    slot -> {blocks: Block[]}); the contract states them inconsistently and a blind test must
 *    not go red on that ambiguity.
 *  - Every counterfactual is built with withPatchedOverride, so no committed JSON is touched.
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

const SLUG = 'liberalio';
const ALLY_SLUGS = ['liter', 'crown', 'helm'];
const SLOTS: Array<'skill1' | 'skill2' | 'burst'> = ['skill1', 'skill2', 'burst'];

/* ------------------------------------------------------------------ helpers */

function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}

function findEffect(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pred: (e: any) => boolean,
): { block: any; eff: any } | undefined {
  for (const block of slotBlocks(ov, slot)) {
    for (const eff of block?.effects ?? []) if (pred(eff)) return { block, eff };
  }
  return undefined;
}

function dropEffects(ov: any, slot: 'skill1' | 'skill2' | 'burst', pred: (e: any) => boolean): number {
  let n = 0;
  for (const block of slotBlocks(ov, slot)) {
    const effs: any[] = block?.effects ?? [];
    for (let i = effs.length - 1; i >= 0; i--) {
      if (pred(effs[i])) {
        effs.splice(i, 1);
        n++;
      }
    }
  }
  return n;
}

function scaleFlat(ov: any, slot: 'skill1' | 'skill2' | 'burst', factor: number): void {
  for (const block of slotBlocks(ov, slot)) {
    for (const eff of block?.effects ?? []) {
      if (eff?.kind === 'flatDamage') eff.atkPct = eff.atkPct * factor;
    }
  }
}

const near = (a: any, b: number) => typeof a === 'number' && Math.abs(a - b) < 1e-6;
const isBuff = (e: any, stat: string, value: number) =>
  e?.kind === 'buff' && e.stat === stat && near(e.value, value);
const isFlat = (e: any) => e?.kind === 'flatDamage';

/** The committed override, as an untouched in-memory clone. */
const OV: any = withPatchedOverride(SLUG, () => {});

function comp(mutate?: (ov: any) => void): any {
  const base: any = controlComp(SLUG, true);
  if (!mutate) return base;
  return {
    ...base,
    overrides: { ...(base.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, mutate) },
  };
}

function run(opts: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (e: SimEvent) => {
        events.push(e);
      },
    },
  } as any);
  return { res, events, dmg: totals(res) as Record<string, number> };
}

const ofKind = (evs: SimEvent[], kind: string) => evs.filter((e: any) => e.kind === kind);
const applied = (evs: SimEvent[], stat: string, value: number) =>
  ofKind(evs, 'buffApply').filter((e: any) => e.stat === stat && near(e.value, value));
const ownerIdx = (e: any) => e.srcSlot ?? e.slot ?? e.casterIdx ?? e.unitIdx;

function alliesIdentical(a: ReturnType<typeof run>, b: ReturnType<typeof run>): void {
  for (const s of ALLY_SLUGS) {
    if (s in a.dmg) expect(b.dmg[s]).toBe(a.dmg[s]);
  }
}

/* --------------------------------------------------------------- the 14 runs */

const BASE = run(comp());

const NO_S1A = run(
  comp((ov) => {
    dropEffects(ov, 'skill1', (e) => isBuff(e, 'atkPct', 160));
  }),
);
const S1A_LONG = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill1', (e) => isBuff(e, 'atkPct', 160));
    if (h) h.eff.durationSec = 9;
  }),
);
const S1B_SHORT = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill1', (e) => isBuff(e, 'attackDamagePct', 20.83));
    if (h) h.eff.durationSec = 0.5;
  }),
);
const S1B_NOCORE = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill1', (e) => isBuff(e, 'attackDamagePct', 20.83));
    if (h) h.block.requiresCore = false;
  }),
);
const NO_S1C = run(
  comp((ov) => {
    dropEffects(ov, 'skill1', isFlat);
  }),
);
const S1C_X10 = run(
  comp((ov) => {
    scaleFlat(ov, 'skill1', 10);
  }),
);
const S1D_ALL = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill1', (e) => isBuff(e, 'chargeSpeedPct', 12.74));
    if (h) h.block.target = { kind: 'allies' };
  }),
);
const S2_PASSIVE = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill2', (e) => isBuff(e, 'attackDamagePct', 231));
    if (h) h.block.trigger = { kind: 'passive' };
  }),
);
const S2_SHORT = run(
  comp((ov) => {
    const h = findEffect(ov, 'skill2', (e) => isBuff(e, 'attackDamagePct', 231));
    if (h) h.eff.durationSec = 0.5;
  }),
);
const NO_S2 = run(
  comp((ov) => {
    dropEffects(ov, 'skill2', (e) => isBuff(e, 'attackDamagePct', 231));
  }),
);
const BURST_SHORT = run(
  comp((ov) => {
    const h = findEffect(ov, 'burst', (e) => isBuff(e, 'attackDamagePct', 50));
    if (h) h.eff.durationSec = 0.5;
  }),
);
const NO_BURST_NUKE = run(
  comp((ov) => {
    dropEffects(ov, 'burst', isFlat);
  }),
);
const BURST_NUKE_X2 = run(
  comp((ov) => {
    scaleFlat(ov, 'burst', 2);
  }),
);

/** liberalio's slot index, resolved from any self-targeted buffApply. */
const SELF_BUFF: any = ofKind(BASE.events, 'buffApply').find((e: any) => e.targetSlug === SLUG);
const LSLOT: number | undefined = SELF_BUFF ? SELF_BUFF.targetIdx : undefined;
const LIB_SHOTS = ofKind(BASE.events, 'shot').filter((e: any) => LSLOT !== undefined && ownerIdx(e) === LSLOT);
const LIB_BURSTS = ofKind(BASE.events, 'burstCast').filter(
  (e: any) => LSLOT !== undefined && ownerIdx(e) === LSLOT,
);
const FB_STARTS = ofKind(BASE.events, 'fullBurstStart');

/* ------------------------------------------------------------------- fixture */

describe('liberalio — fixture is non-vacuous', () => {
  it('deals damage, fires charges, and the team actually full-bursts', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // A lone B3 would make ZERO full bursts; liter+crown are what make these assertions real.
    expect(FB_STARTS.length).toBeGreaterThan(0);
    expect(LIB_BURSTS.length).toBeGreaterThan(0);
    expect(LIB_SHOTS.length).toBeGreaterThan(0);
  });

  it('the second Burst III (helm) is present, so B3-scoped target-sets are a real choice', () => {
    expect('helm' in BASE.dmg).toBe(true);
  });
});

/* ----------------------------------------------------- s1a  ATK +160% / 3s FB */

describe('liberalio s1a — FB-enter self ATK +160% for 3 sec', () => {
  it('is authored as a self buff on a fullBurstEnter trigger with the exact magnitude+window', () => {
    const h = findEffect(OV, 'skill1', (e) => isBuff(e, 'atkPct', 160));
    expect(Boolean(h)).toBe(true);
    // atkPct (scales the holder's own ATK), NOT casterAtkPct: the kit says plain "ATK ▲".
    expect(h!.eff.stat).toBe('atkPct');
    expect(near(h!.eff.durationSec, 3)).toBe(true);
    expect(h!.block.trigger?.kind).toBe('fullBurstEnter');
    expect(h!.block.target?.kind).toBe('self');
  });

  it('fires once per full burst, on liberalio only', () => {
    const evs = applied(BASE.events, 'atkPct', 160);
    expect(evs.length).toBe(FB_STARTS.length);
    for (const e of evs as any[]) expect(e.targetSlug).toBe(SLUG);
  });

  it('is load-bearing, and its 3s window is not a 10s window', () => {
    // GREEN under the faithful reading; RED if the buff is absent (dropped line) or if the
    // window were the FB length (a 9s patch must ADD damage, proving 3s truncates real shots).
    expect(NO_S1A.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
    expect(S1A_LONG.dmg[SLUG]).toBeGreaterThan(BASE.dmg[SLUG]);
  });

  it('is inert on teammates (self-scoped)', () => {
    alliesIdentical(BASE, NO_S1A);
  });
});

/* -------------------------------------- s1b  core-gated Attack Damage +20.83% */

describe('liberalio s1b — full charge ON CORE: self Attack Damage +20.83% for 60 sec', () => {
  it('is authored core-gated, self, in the Damage-Up bucket, on the unit\'s own charge', () => {
    const h = findEffect(OV, 'skill1', (e) => isBuff(e, 'attackDamagePct', 20.83));
    expect(Boolean(h)).toBe(true);
    // attackDamagePct, not atkPct: "Attack Damage ▲" is the Damage-Up bucket.
    expect(h!.eff.stat).toBe('attackDamagePct');
    expect(near(h!.eff.durationSec, 60)).toBe(true);
    expect(h!.block.target?.kind).toBe('self');
    // The core requirement is the whole point of the line - a generic charge trigger
    // over-credits every non-core charge.
    expect(h!.block.requiresCore).toBe(true);
    // Every trigger pull of an SR is one full charge, so the faithful primitive is the
    // owner's own shot (hitCount:1 is the acceptable equivalent).
    const t = h!.block.trigger ?? {};
    const perShot = t.kind === 'shotFired' || (t.kind === 'hitCount' && t.count === 1);
    expect(perShot).toBe(true);
  });

  it('applies only to liberalio, at 20.83 percentage points', () => {
    const evs = applied(BASE.events, 'attackDamagePct', 20.83);
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs as any[]) expect(e.targetSlug).toBe(SLUG);
  });

  it('the core gate is real and non-vacuous in this fixture', () => {
    // Non-vacuity + discrimination in one: dropping requiresCore must make the block fire MORE
    // often. If it does not, the shipped model is either ungated (over-credit) or the gate never
    // bites here - both are findings, not passes.
    const baseN = applied(BASE.events, 'attackDamagePct', 20.83).length;
    const openN = applied(S1B_NOCORE.events, 'attackDamagePct', 20.83).length;
    expect(openN).toBeGreaterThan(baseN);
    expect(S1B_NOCORE.dmg[SLUG]).toBeGreaterThan(BASE.dmg[SLUG]);
  });

  it('its window survives between charges (0.5s counterfactual loses damage)', () => {
    // NOT a "60s -> 5s" patch: her ~2s charge cadence refreshes any window >= ~4s into
    // permanence, so only a sub-cadence window discriminates.
    expect(S1B_SHORT.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
  });

  it('is inert on teammates (self-scoped)', () => {
    alliesIdentical(BASE, S1B_SHORT);
  });
});

/* ----------------------------------------- s1c  40.5% per-full-charge rider(s) */

describe('liberalio s1c — full charge: 40.5% of final ATK additional damage', () => {
  it('is authored as an enemy-targeted flatDamage rider on the owner\'s charge', () => {
    const flats: any[] = [];
    for (const b of slotBlocks(OV, 'skill1')) for (const e of b?.effects ?? []) if (isFlat(e)) flats.push({ b, e });
    expect(flats.length).toBeGreaterThan(0);
    for (const { b, e } of flats) {
      // 40.5 per instance, or 202.5 if the "Activates 5 times" multiplicity was folded into one
      // instance. Any OTHER magnitude is a divergence.
      expect(near(e.atkPct, 40.5) || near(e.atkPct, 202.5)).toBe(true);
      expect(b.target?.kind).toBe('enemy');
      const t = b.trigger ?? {};
      expect(t.kind === 'shotFired' || (t.kind === 'hitCount' && t.count === 1)).toBe(true);
      // "Affects the target" - no core clause, so the rider must not be authored as a core strike.
      expect(e.core === true).toBe(false);
    }
  });

  it('fires per full charge, not a handful of times per battle', () => {
    // "Activates 5 times" could be read as a 5-per-BATTLE cap. Under that reading the rider
    // contributes ~5 hits of 40.5% while the burst nuke contributes ~925% per cast, i.e. a
    // contribution ratio near 0.06. Under the per-charge reading (~40-90 charges in 180s) the
    // ratio is ~1 or more. A 0.4 floor separates them with a wide margin.
    const riderDelta = BASE.dmg[SLUG] - NO_S1C.dmg[SLUG];
    const nukeDelta = BASE.dmg[SLUG] - NO_BURST_NUKE.dmg[SLUG];
    expect(riderDelta).toBeGreaterThan(0);
    expect(nukeDelta).toBeGreaterThan(0);
    expect(riderDelta / nukeDelta).toBeGreaterThan(0.4);
  });

  it('scales linearly with atkPct (it is a percent-of-final-ATK rider)', () => {
    const base = BASE.dmg[SLUG] - NO_S1C.dmg[SLUG];
    const x10 = S1C_X10.dmg[SLUG] - NO_S1C.dmg[SLUG];
    expect(x10 / base).toBeGreaterThan(9);
    expect(x10 / base).toBeLessThan(11);
  });

  it('credits liberalio only (teammates unmoved)', () => {
    alliesIdentical(BASE, NO_S1C);
  });

  it.skip('⚑ "Activates 5 times" multiplicity: 5 instances per charge vs 1 (ambiguous prose)', () => {
    // The prose gives a count with no per-trigger/per-battle qualifier. The standard reading of
    // "Deals X% ... Activates N times" in these dumps is N popups per trigger (202.5%/charge),
    // but a 5-per-battle cap is grammatically available and the engine has NO per-battle
    // activation-cap primitive either way. Deciding it needs a measurement, not a guess:
    // RECIPE - count the additional-damage popups landing per single full charge in footage
    // (expect 5 small popups of the same value if multiplicity is per-trigger, 1 if not);
    // secondary check: rider contribution / (925% x her burst casts) ~= 4-5 for the 5x reading,
    // ~= 1 for the 1x reading, using the charge count read off the event log.
  });
});

/* ---------------------------------- s1d  Charge Speed to lowest-final-ATK B3 */

describe('liberalio s1d — FB-enter: Charge Speed +12.74% to the 1 lowest-final-ATK Burst III ally for 10s', () => {
  it('is authored with the exact B3 / lowest-FINAL-ATK target set', () => {
    const h = findEffect(OV, 'skill1', (e) => isBuff(e, 'chargeSpeedPct', 12.74));
    expect(Boolean(h)).toBe(true);
    expect(near(h!.eff.durationSec, 10)).toBe(true);
    expect(h!.block.trigger?.kind).toBe('fullBurstEnter');
    const tgt = h!.block.target ?? {};
    expect(tgt.kind).toBe('alliesLowestAtk');
    expect(tgt.count).toBe(1);
    expect(tgt.burst).toBe('III');
    // The kit says "lowest FINAL ATK" literally -> live-ATK ranking, not static ranking.
    expect(tgt.byFinalAtk).toBe(true);
  });

  it('never lands on the Burst I / Burst II allies', () => {
    const evs = applied(BASE.events, 'chargeSpeedPct', 12.74) as any[];
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect(e.targetSlug === 'liter' || e.targetSlug === 'crown').toBe(false);
      // Only a Burst III unit is eligible: liberalio herself or the fixed B3 (helm).
      expect([SLUG, 'helm']).toContain(e.targetSlug);
    }
    expect(evs.length).toBeLessThanOrEqual(FB_STARTS.length);
  });

  it('the B3/lowest-ATK scoping is discriminating (an all-allies model over-applies)', () => {
    const baseEvs = applied(BASE.events, 'chargeSpeedPct', 12.74) as any[];
    const allEvs = applied(S1D_ALL.events, 'chargeSpeedPct', 12.74) as any[];
    expect(allEvs.length).toBeGreaterThan(baseEvs.length);
    expect(allEvs.some((e) => e.targetSlug === 'liter' || e.targetSlug === 'crown')).toBe(true);
  });

  it.skip('⚑ "12.74% OF THE SKILL USER\'S Charge Speed" is caster-scaled; the schema has no primitive', () => {
    // chargeSpeedPct is a plain percentage stat scaling the HOLDER's charge speed. There is no
    // casterChargeSpeedPct analogue to casterAtkPct, so a caster-relative grant can only be
    // approximated by the flat 12.74. Inputs are equal-ish here (both B3s are SR charge units),
    // so the approximation is small - but it is an approximation, and unobservable from totals.
    // RECIPE: needs a caster-scaled charge-speed primitive plus a measured charge-time read on
    // the recipient before it can be pinned.
  });

  it.skip('⚑ self-grant vs s2c immunity: if this line resolves onto liberalio it must be inert', () => {
    // s2c gives her permanent immunity to Increase Charge Speed effects, and she is herself an
    // eligible "Burst III ally". If the lowest-final-ATK resolution picks her, the faithful
    // outcome is a NO-OP on her charge time - the engine has no immunity primitive, so a
    // self-resolution would silently over-credit. Untestable without that primitive.
  });
});

/* ------------------------------------------------- s2a  Raging Current +231% */

describe('liberalio s2a — full charge vs the stage target: Raging Current, Attack Damage +231% continuously', () => {
  it('is authored self, continuous (no durationSec), triggered by her own charge', () => {
    const h = findEffect(OV, 'skill2', (e) => isBuff(e, 'attackDamagePct', 231));
    expect(Boolean(h)).toBe(true);
    expect(h!.eff.stat).toBe('attackDamagePct');
    // "continuously" -> no time expiry at all, not a long window.
    expect(h!.eff.durationSec).toBeUndefined();
    expect(h!.block.target?.kind).toBe('self');
    const t = h!.block.trigger ?? {};
    expect(t.kind === 'shotFired' || (t.kind === 'hitCount' && t.count === 1)).toBe(true);
    // It is NOT a passive: it only exists after she lands a full charge on the stage target.
    expect(t.kind).not.toBe('passive');
  });

  it('applies to liberalio only', () => {
    const evs = applied(BASE.events, 'attackDamagePct', 231) as any[];
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) expect(e.targetSlug).toBe(SLUG);
  });

  it('is earned on her first landed charge, not granted from t=0', () => {
    // Trigger-identity discriminator: a passive model has +231% live before her first charge
    // lands, so it must out-damage the faithful triggered model. GREEN faithful, RED if the
    // driver keyed it passive.
    expect(S2_PASSIVE.dmg[SLUG]).toBeGreaterThan(BASE.dmg[SLUG]);
  });

  it('is the dominant self buff and persists between charges', () => {
    expect(NO_S2.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
    // A sub-cadence window (0.5s) must lose damage; "continuously" vs any window >= her ~2s
    // cadence is observationally identical in a 180s fight and is deliberately NOT asserted.
    expect(S2_SHORT.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
  });

  it('is inert on teammates (self-scoped)', () => {
    alliesIdentical(BASE, NO_S2);
  });
});

/* ------------------------------- s2b / s2c  Gentle Current + charge immunity */

describe('liberalio s2b/s2c — Gentle Current and the charge-speed immunities', () => {
  it('records the unmodellable skill2 lines in `unmodeled` instead of dropping them silently', () => {
    const lines: string[] = (OV?.unmodeled?.skill2 ?? []) as string[];
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    expect(/charge|immun/i.test(lines.join(' '))).toBe(true);
  });

  it('does not model Gentle Current as a live charge-speed effect on liberalio', () => {
    // Gentle Current requires landing a full charge on a Rapture that is NOT the stage target.
    // The v1 fight has a single stage target and no other Rapture, so the branch is UNREACHABLE
    // and must never fire; a charge-time model that fires here would be pure invention.
    const noGentle = !slotBlocks(OV, 'skill2').some((b: any) =>
      (b?.effects ?? []).some((e: any) => e?.kind === 'buff' && e.stat === 'chargeSpeedPct'),
    );
    expect(noGentle).toBe(true);
  });

  it.skip('GAP — "Fixes charge time at 1 sec" is a stat CLAMP; no engine primitive exists', () => {
    // A clamp is not expressible as a percentage buff (chargeSpeedPct scales, it does not pin),
    // and the branch is unreachable on a single-target boss anyway. Doubly inert here: nothing
    // to assert until a clamp primitive exists AND a second Rapture is modeled.
  });

  it.skip('GAP — permanent immunity to Increase/Decrease Charge Speed has no primitive, and is untestable in this fixture', () => {
    // No immunity/ward primitive exists in the effect schema. It is also non-vacuously
    // untestable here: liter, crown and helm grant no charge-speed effects in the control comp,
    // so even a correct implementation would be observationally silent. Would need a
    // charge-speed-granting ally in the fixture plus an immunity primitive.
  });
});

/* --------------------------------------------------- burst  self +50% for 10s */

describe('liberalio burst A — self Attack Damage +50% for 10 sec', () => {
  it('is authored as a burst-cast self buff in the Damage-Up bucket', () => {
    const h = findEffect(OV, 'burst', (e) => isBuff(e, 'attackDamagePct', 50));
    expect(Boolean(h)).toBe(true);
    expect(near(h!.eff.durationSec, 10)).toBe(true);
    expect(h!.block.target?.kind).toBe('self');
    // A self line in the unit's OWN burst block is burst-cast, never full-burst-enter: keying it
    // to FB-enter over-credits every rotation the OTHER Burst III (helm) completes.
    expect(h!.block.trigger?.kind).toBe('burstCast');
  });

  it('fires exactly once per liberalio burst cast — not once per team full burst', () => {
    // If the fixture ever has an FB liberalio did not cast, this is a hard burstCast-vs-
    // fullBurstEnter discriminator; when they coincide it still pins the count exactly.
    const evs = applied(BASE.events, 'attackDamagePct', 50) as any[];
    expect(evs.length).toBe(LIB_BURSTS.length);
    for (const e of evs) expect(e.targetSlug).toBe(SLUG);
  });

  it('its 10s window is load-bearing', () => {
    expect(BURST_SHORT.dmg[SLUG]).toBeLessThan(BASE.dmg[SLUG]);
  });

  it('is inert on teammates (self-scoped)', () => {
    alliesIdentical(BASE, BURST_SHORT);
  });
});

/* ----------------------------------------------- burst  925% to all enemies */

describe('liberalio burst B — 925% of final ATK to all enemies', () => {
  it('is authored as an enemy-targeted burst-cast flatDamage of 925%', () => {
    const h = findEffect(OV, 'burst', isFlat);
    expect(Boolean(h)).toBe(true);
    expect(near(h!.eff.atkPct, 925)).toBe(true);
    expect(h!.block.target?.kind).toBe('enemy');
    expect(h!.block.trigger?.kind).toBe('burstCast');
    // No core clause in the text -> not a core strike.
    expect(h!.eff.core === true).toBe(false);
  });

  it('is present and scales linearly', () => {
    const base = BASE.dmg[SLUG] - NO_BURST_NUKE.dmg[SLUG];
    const x2 = BURST_NUKE_X2.dmg[SLUG] - NO_BURST_NUKE.dmg[SLUG];
    expect(base).toBeGreaterThan(0);
    expect(x2 / base).toBeGreaterThan(1.9);
    expect(x2 / base).toBeLessThan(2.1);
  });

  it('is credited to liberalio and moves no teammate', () => {
    alliesIdentical(BASE, NO_BURST_NUKE);
    alliesIdentical(BASE, BURST_NUKE_X2);
  });
});


## S5 BLIND TEST vs DRIVER OVERRIDE — result
Adapted run (blind/liberalio.adapted.test.ts): **32 passed / 5 skipped** (the skips are the blind author's OWN ⚑/GAP markers) — GREEN vs the driver override.
TWO reconciliations, both documented inline in the adapted file:
1. s2a 'is earned on her first landed charge, not granted from t=0' was RED vs the driver's ORIGINAL passive encoding — answered by FIXING THE OVERRIDE (skill2 trigger passive -> shotFired; passive over-credited exactly the first charge, +0.208% of her total, allies byte-identical). The assertion then passes UNMODIFIED.
2. s1b 'the core gate is real and non-vacuous' assumed a per-shot core roll; the engine's requiresCore is a BINARY gate on cfg.coreHitRate<=0 (sim.ts:1676), so at scope-lock coreHitRate 1 the blind comparison was vacuous through no fault of the override. ADAPTED to run the gate at coreHitRate 0 (gated: fully dark; ungated: fires) — same intent, engine-correct mechanism.
The 5 skipped ⚑s (all author-flagged, none a driver divergence): 'Activates 5 times' multiplicity (resolved MEASURED in the driver: 5 hits/charge = 202.5%), caster-scaled charge speed (no primitive; flat 12.74 approximation), self-grant-vs-immunity (driver encodes excludeSelf), Gentle Current clamp (doubly inert), charge-speed immunity (no primitive; dormant in fixture).

---

## S6 BLIND OVERRIDE (claude-opus-5, re-derived from kit prose ALONE)
{
  "slug": "liberalio",
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
          "stat": "atkPct",
          "value": 160,
          "durationSec": 3
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "requiresCore": true,
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 20.83,
          "durationSec": 60
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 40.5,
          "crit": true,
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesLowestAtk",
        "count": 1,
        "burst": "III",
        "byFinalAtk": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 12.74,
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
          "stat": "attackDamagePct",
          "value": 231
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
          "value": 50,
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
          "atkPct": 925,
          "crit": true,
          "noRange": true,
          "noFb": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Deals 40.5% of final ATK as additional damage. Activates 5 times. — the \"Activates 5 times\" per-battle/per-trigger use cap is NOT modeled (the engine has no per-battle activation counter); the rider fires on every full-charge shot, which OVER-CREDITS if the cap is per battle."
    ],
    "skill2": [
      "Gentle Current: Fixes charge time at 1 sec continuously. Removes Raging Current. — requires a Rapture that is NOT the stage target; the solo-raid boss is the only enemy, so this branch can never activate and Raging Current is never removed.",
      "Gains immunity to Increase Charge Speed effects. This effect is continuous and cannot be removed.",
      "Gains immunity to Decrease Charge Speed effects. This effect is continuous and cannot be removed."
    ],
    "burst": []
  },
  "caveats": [
    "⚑ CHARGE-SPEED IMMUNITY IS UNMODELED AND IS THE LARGEST KNOWN ERROR SOURCE. Skill 2 grants permanent immunity to BOTH Increase and Decrease Charge Speed effects, so every ally charge-speed buff (Liter/Crown/most B1-B2 support, cube, and her own S1 charge-speed grant if she were ever its target) must be BLOCKED on this unit. The engine has no per-unit stat-immunity primitive, so any comp containing a charge-speed buffer will over-credit her shots/sec. Recipe: add a stat-immunity gate (per-unit StatKey denylist) in the buff engine, or run her only in charge-speed-free comps until then.",
    "⚑ Her own S1 charge-speed grant targets 'the 1 Burst III ally with the lowest final ATK' — she is Burst III herself, so she can be her own target. If she is, the immunity above voids it. As authored, the engine will apply it to whichever B3 ranks lowest (possibly her); treat the self-target case as a known over-credit.",
    "⚑ 'Raging Current' Attack Damage ▲231% is authored as PERMANENT-once-triggered (no durationSec) with first application on her first full charge landing on the boss. Steady state for the whole fight is therefore ~231% Damage-Up minus the pre-first-charge window (~chargeFrames/60 + latency ≈ 1.5-2s). Same-caster-slot overwrite means repeat applications are idempotent.",
    "⚑ The 'Activates 5 times' cap on the 40.5% rider is unrepresentable; over a 180s fight she lands far more than 5 full charges, so this rider is a substantial over-credit if the cap is per battle rather than per trigger/stack.",
    "⚑ 'Full Charge attack' triggers are modeled as `shotFired` because she is a charge weapon (chargeFrames 90) and every shot she fires is assumed to be a FULL charge. If she fires uncharged shots in practice, all three full-charge-gated blocks over-fire.",
    "⚑ Charge cadence (chargeFrames 90, reloadFrames 141, ammo 6) is datamine-sourced and unverified against footage."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. SR/Wind/Attacker/Burst III charge unit. S1: FB-enter self ATK ▲160%/3s; a core-gated full-charge Attack Damage ▲20.83%/60s (self, effectively permanent after the first core landing given the 60s window and repeated refresh); a 40.5%-of-final-ATK full-charge rider on the target (capped at 5 activations in kit — cap NOT modeled); and an FB-enter Charge Speed ▲12.74% to the lowest-final-ATK Burst III ally. S2: the 'Raging Current' branch (full charge vs the STAGE TARGET) grants Attack Damage ▲231% continuously — in a solo raid the boss IS the stage target, so this branch is the only reachable one and Gentle Current can never fire; the two charge-speed immunity lines are documented-unmodeled (no engine primitive) and are the dominant known divergence in any charge-speed-buffed comp. Burst: self Attack Damage ▲50%/10s plus a 925%-of-final-ATK instant hit to all enemies (FB-exempt — a burst cast lands before the Full Burst window opens). Riders are authored crit-eligible at her sheet rate, no-range, and no-core (the text says 'additional damage', not 'core strike damage')."
}

## DRIVER vs S6-BLIND OVERRIDE — diff summary (driver = src/skills/overrides/liberalio.json below)
Structurally IDENTICAL on all seven blocks (triggers, targets, effects, gates) — including shotFired on Raging Current (the driver moved passive -> shotFired during this gauntlet, the same encoding the blind writer derived independently). Remaining diffs:
1. S1 rider multiplicity: DRIVER flatDamage atkPct 202.5 (5 x 40.5 folded; user-confirmed reading, MEASURED vs scope-lock runs — the single-hit 40.5 read left her 0.70 cold). BLIND atkPct 40.5 + 'Activates 5 times' parked in unmodeled as an unresolved per-battle/per-trigger ambiguity. Same totals-encoding question; the driver carries higher-tier evidence (MEASURED resolves the blind's flagged ambiguity).
2. excludeSelf on the S1 chargeSpeed block: DRIVER true (encodes her S2 immunity vs her OWN grant — documented); BLIND omits it and flags the self-grant risk instead. Driver is strictly more faithful.
3. BLIND adds explicit crit:true on both flatDamage blocks and noFb:true on the 925 nuke; DRIVER relies on engine defaults (riders crit-eligible by convention; burst-cast damage lands before the FB window, so fbMajorApplied is false by timing). Behaviorally IDENTICAL — verified in the event log (nuke: fbMajorApplied false, critEligible true, rangeApplied false; rider: critEligible true, coreEligible false).
4. unmodeled: DRIVER carries Gentle Current + the charge-speed immunity (one combined line, verbatim); BLIND carries Gentle Current + two immunity lines + the skill1 '5 times' entry (which the driver treats as RESOLVED by measurement, not unmodeled).

---

## DRIVER IMPLEMENTATION UNDER JUDGMENT
### scripts/tests/units/liberalio.test.ts
```ts
// PER-UNIT KIT SPEC — `liberalio` (Liberalio, Attacker/SR/Wind, Burst III, cd 40s, ammo 6,
// chargeFrames 90, Pilgrim). Kit-autonomy gauntlet 2026-07-26, test-first (S2a).
//
// One assertion group per KIT LINE (L1..L9 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.liberalio.skills):
//   S1 ■ entering Full Burst → self: ATK ▲160% for 3 sec                                    [L1]
//      ■ Full Charge on a target's core → self: Attack Damage ▲20.83% for 60 sec            [L2]
//      ■ Full Charge → the target: 40.5% of final ATK as additional damage, ×5 activations  [L3]
//      ■ entering Full Burst → the 1 lowest-final-ATK Burst-3 ally: Charge Speed ▲12.74%
//        of the skill user's Charge Speed for 10 sec                                        [L4]
//   S2 ■ Full Charge vs the STAGE TARGET → self: Raging Current, Attack Damage ▲231%
//        continuously; removes Gentle Current                                               [L5]
//      ■ Full Charge vs a non-stage-target Rapture → self: Gentle Current, fixes charge
//        time at 1 sec continuously; removes Raging Current                                 [L6]
//      ■ battle start → self: immunity to Increase/Decrease Charge Speed, continuous        [L7]
//   BU ■ self: Attack Damage ▲50% for 10 sec                                                [L8]
//      ■ all enemies: 925% of final ATK as additional damage                                [L9]
//
// Dispositions:
//   L1..L5, L8, L9  FAITHFUL — pinned GREEN vs shipped, RED vs the nearest-wrong counterfactual.
//   L3  MEASURED reading: "Activates 5 times" = 5 hits per full charge = 5×40.5% = 202.5% per
//       pull (user-confirmed; validated vs a real scope-lock run — the single-hit 40.5% read
//       left her 0.70 cold). Its Q1 calibration is also pinned: the proc is RANGE-exempt
//       (noRange) yet takes the +50% FB major when it lands in Full Burst (noFb REMOVED,
//       panel-accepted 2026-07-14 — the cast-instant rule is burst-slot-scoped).
//   L5  domain-scoped FAITHFUL: in a solo raid the single boss IS the stage target, so every
//       full charge maintains Raging Current — modeled as a permanent passive.
//   L6  UNMODELED-inert: Gentle Current can never fire in a solo raid (no non-stage-target
//       Rapture exists), so there is nothing to assert — documented, not dropped.
//   L7  UNMODELED-defensive: the charge-speed immunity is inert to her own damage. Its ONE
//       sim-visible consequence — her own S1 Charge Speed grant must not self-target — IS
//       pinned by L4 (excludeSelf). The residual gap (an EXTERNAL charge-speed buff from a
//       teammate would wrongly reach her; sim.ts sums all sources) is a documented caveat,
//       not a kit line left silently unmodeled.
//
// S2c reconciliation (driver vs claude-fable-5 S2b): CONVERGED on all nine lines. The reviewer
// independently re-derived every disposition, including the 5-hits-per-landing rider read, the
// lowest-FINAL-ATK Burst-3 selector, the burstCast-vs-fullBurstEnter split, and the FB-exempt
// nuke. Two reviewer nuances reconciled: (i) their L7 GAP framing asks for a behavioral shot-count
// invariance test under an INJECTED external chargeSpeedPct — that assertion is RED vs shipped
// (the gap is real but DORMANT: no charge-speed source exists in the control comp, and the schema
// has no immunity primitive), so it is carried as a ⚑ caveat, not a failing test; (ii) their L5
// trigger-identity preference (landing-gated, not passive-from-t0) was ADOPTED — the S5 blind
// test (claude-opus-5) asserted it RED-vs-passive, so the override's Raging Current trigger moved
// passive → shotFired (the passive shortcut over-credited exactly her first charge, ~0.2% of her
// total; allies byte-identical). The reviewer's two extra inertness claims (rider core-ineligible;
// nuke range-exempt + core-ineligible) were verified empirically and added as pins below.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L1  the skill-level-9 magnitude 152.73 is the nearest authoring error (wrong level row).
//   L2  two independent discriminations: the skill-level-9 value 19.89, AND requiresCore — at
//       coreHitRate 0 the line must go fully dark while her other Attack Damage lines persist.
//   L3  the single-hit 40.5% misread is the documented near-wrong (0.70-cold regression).
//   L4  the OLD misparse targeted the top-3-ATK allies — it spreads the buff across ≥2 holders
//       (and onto herself); shipped reaches helm ALONE (the only other Burst-3 ally).
//   L5  the skill-level-9 magnitude 220.5, and the continuous (null-expiry) encoding.
//   L8  the skill-level-9 magnitude 47.73.
//   L9  the skill-level-9 magnitude 882.95, and cast-before-FB (never takes the +50% major).
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / liberalio B3 / helm B3, boss
// Fire — Wind is neutral vs Fire so no element major interferes; focus liberalio). She needs a
// real rotation to cast her burst at all. Deterministic (no seed). Slot order: liter 0 / crown 1
// / liberalio 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimConfig, SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / liberalio 2 / helm 3. */
const LIB = 2;
const HELM = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(
  overrides: Record<string, any> = {},
  cfg: Partial<SimConfig> = {},
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('liberalio'),
    overrides,
    cfg: { onEvent: (e) => events.push(e), ...cfg },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (one combined run: every observable is stat/slot-disjoint) --------
const libAllCf = withPatchedOverride('liberalio', (ov) => {
  // L1 cf: FB-entry ATK 160 → 152.73 (skill-level-9 row).
  const l1 = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'atkPct'),
  );
  if (!l1)
    throw new Error('liberalio S1 atkPct block missing — fixture is stale');
  l1.effects.find((e: any) => e.stat === 'atkPct').value = 152.73;
  // L2 cf: core-hit Attack Damage 20.83 → 19.89 (skill-level-9 row).
  const l2 = ov.skill1.find((b: any) =>
    b.effects.some(
      (e: any) => e.stat === 'attackDamagePct' && e.value === 20.83,
    ),
  );
  if (!l2)
    throw new Error('liberalio S1 20.83 block missing — fixture is stale');
  l2.effects.find((e: any) => e.stat === 'attackDamagePct').value = 19.89;
  // L3 cf: rider 202.5 → 40.5 (the single-hit misread; 0.70-cold regression).
  const l3 = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  if (!l3) throw new Error('liberalio S1 rider missing — fixture is stale');
  l3.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 40.5;
  // L4 cf: lowest-final-ATK Burst-3 ally → top-3-ATK allies (the OLD misparse).
  const l4 = ov.skill1.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'chargeSpeedPct'),
  );
  if (!l4)
    throw new Error(
      'liberalio S1 chargeSpeedPct block missing — fixture is stale',
    );
  l4.target = { kind: 'alliesTopAtk', count: 3 };
  // L5 cf: Raging Current 231 → 220.5 (skill-level-9 row).
  const l5 = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct'),
  );
  if (!l5)
    throw new Error('liberalio S2 Raging Current missing — fixture is stale');
  l5.effects.find((e: any) => e.stat === 'attackDamagePct').value = 220.5;
  // L8 cf: burst self Attack Damage 50 → 47.73 (skill-level-9 row).
  const l8 = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct'),
  );
  if (!l8)
    throw new Error(
      'liberalio burst Attack Damage block missing — fixture is stale',
    );
  l8.effects.find((e: any) => e.stat === 'attackDamagePct').value = 47.73;
  // L9 cf: nuke 925 → 882.95 (skill-level-9 row).
  const l9 = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.kind === 'flatDamage'),
  );
  if (!l9) throw new Error('liberalio burst nuke missing — fixture is stale');
  l9.effects.find((e: any) => e.kind === 'flatDamage').atkPct = 882.95;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const cf = run({ liberalio: libAllCf });
/** requiresCore discrimination: identical basis but the boss core is never exposed. */
const noCore = run({}, { coreHitRate: 0 });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const libDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'liberalio' && d.srcSlot === srcSlot);
const libShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'liberalio');
const libBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'liberalio',
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const libBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === LIB && b.stat === stat);

describe('liberalio — kit spec', () => {
  describe('L1 — S1 grants self ATK ▲160% for 3 sec on Full Burst entry', () => {
    const applied = libBuffs(base.events, 'atkPct');

    it('is 160%, self-scoped, 3 sec, once per Full Burst entry', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([160]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LIB]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 152.73 is not the shipped value', () => {
      const vals = [
        ...new Set(libBuffs(cf.events, 'atkPct').map((b) => b.value)),
      ];
      expect(vals).toContain(152.73);
      expect(vals).not.toContain(160);
    });
  });

  describe('L2 — S1 core full-charges grant self Attack Damage ▲20.83% for 60 sec', () => {
    const applied = libBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 20.83,
    );

    it('fires on core exposure and the 60s duration keeps it up permanently', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LIB]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(60 * FPS);
    });

    it('DISCRIMINATING (requiresCore): at coreHitRate 0 the line is fully dark', () => {
      const dark = libBuffs(noCore.events, 'attackDamagePct').filter(
        (b) => b.value === 20.83,
      );
      expect(dark).toEqual([]);
      // ...while her un-gated Attack Damage lines persist (Raging Current still applies).
      expect(
        libBuffs(noCore.events, 'attackDamagePct').filter(
          (b) => b.value === 231,
        ).length,
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 19.89 is not the shipped value', () => {
      const vals = [
        ...new Set(libBuffs(cf.events, 'attackDamagePct').map((b) => b.value)),
      ];
      expect(vals).toContain(19.89);
      expect(vals).not.toContain(20.83);
    });
  });

  describe('L3 — S1 rider: 5 × 40.5% = 202.5% of final ATK per full charge (MEASURED 5-hit read)', () => {
    const riders = libDamage(base.events, 'skill1');

    it('lands once per full charge at 202.5%, in the skill bucket', () => {
      expect(riders.length).toBeGreaterThan(0);
      expect(riders.length).toBe(libShots(base.events).length);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([202.5]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('is range-exempt (noRange) while her normals take the range major', () => {
      expect(riders.every((d) => !d.rangeApplied)).toBe(true);
      expect(libDamage(base.events, 'normal').some((d) => d.rangeApplied)).toBe(
        true,
      );
    });

    it('is crit-eligible but NOT core-eligible (the kit grants no core strike on the rider)', () => {
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.coreEligible)).toBe(true);
    });

    it('takes the +50% FB major when it lands in Full Burst (noFb REMOVED, panel-accepted)', () => {
      const inFb = riders.filter((d) => d.inFullBurst);
      expect(inFb.length).toBeGreaterThan(0);
      expect(inFb.every((d) => d.fbMajorApplied)).toBe(true);
      expect(
        riders.filter((d) => !d.inFullBurst).every((d) => !d.fbMajorApplied),
      ).toBe(true);
    });

    it('DISCRIMINATING: the single-hit 40.5% misread is not the shipped magnitude', () => {
      expect([
        ...new Set(libDamage(cf.events, 'skill1').map((d) => d.atkPct)),
      ]).toEqual([40.5]);
    });
  });

  describe('L4 — S1 grants the lowest-final-ATK Burst-3 ally Charge Speed ▲12.74% for 10 sec', () => {
    const applied = libBuffs(base.events, 'chargeSpeedPct');

    it('reaches helm ALONE (the only other B3; excludeSelf bars self-targeting)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([12.74]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([HELM]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: the old top-3-ATK-allies misparse spreads the buff across ≥2 holders', () => {
      const targets = new Set(
        libBuffs(cf.events, 'chargeSpeedPct').map((b) => b.targetIdx),
      );
      expect(targets.size).toBeGreaterThan(1);
    });
  });

  describe('L5 — S2 Raging Current: continuous self Attack Damage ▲231% (solo-raid stage target)', () => {
    const applied = libBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 231,
    );

    it('is self-scoped with NO wall-clock expiry, earned on her first landed charge', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LIB]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      // Trigger identity (fixed 2026-07-26, S5-driven): 'Activates when LANDING a Full Charge
      // attack against the stage target' — NOT a t=0 passive. First apply lands after her first
      // shot resolves (chargeFrames 90 ⇒ frame ≥ 90), never at frame 0.
      expect(applied[0].frame).toBeGreaterThanOrEqual(90);
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 220.5 is not the shipped value', () => {
      const vals = [
        ...new Set(libBuffs(cf.events, 'attackDamagePct').map((b) => b.value)),
      ];
      expect(vals).toContain(220.5);
      expect(vals).not.toContain(231);
    });
  });

  describe('L8 — burst grants self Attack Damage ▲50% for 10 sec', () => {
    const applied = libBuffs(base.events, 'attackDamagePct').filter(
      (b) => b.value === 50,
    );

    it('fires once per burst cast, self-scoped, 10 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(libBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([LIB]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 47.73 is not the shipped value', () => {
      const vals = [
        ...new Set(libBuffs(cf.events, 'attackDamagePct').map((b) => b.value)),
      ];
      expect(vals).toContain(47.73);
      expect(vals).not.toContain(50);
    });
  });

  describe('L9 — burst nuke: 925% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = libDamage(base.events, 'burst');

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.length).toBe(libBursts(base.events).length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([925]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('is range-exempt and core-ineligible (a burst skill, not a ranged weapon hit)', () => {
      expect(nukes.every((d) => !d.rangeApplied)).toBe(true);
      expect(nukes.every((d) => !d.coreEligible)).toBe(true);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: the skill-level-9 magnitude 882.95 is not the shipped value', () => {
      expect([
        ...new Set(libDamage(cf.events, 'burst').map((d) => d.atkPct)),
      ]).toEqual([882.95]);
    });
  });
});

````

### src/skills/overrides/liberalio.json

```json
{
  "note": "Raging/Gentle Current mode: Raging Current (Attack Damage +231% continuously) triggers on a full charge against the STAGE TARGET; Gentle Current (fixes charge at 1s) triggers on a full charge against a non-stage-target Rapture. In a solo raid there is a single boss = the stage target, so every full charge maintains Raging Current and Gentle Current never fires — S2 is modeled as a no-expiry self Attack Damage 231% buff on shotFired (earned on her first landed full charge, then refreshed permanent; 2026-07-26 gauntlet moved it off the t=0 passive shortcut, which over-credited the first charge by ~0.2%) and the Gentle Current branch is dropped. The charge-speed increase/decrease immunity is inert/defensive and skipped. S1: ATK 160%/3s on Full Burst entry (self); Attack Damage 20.83%/60s from core full-charges, modeled as always-up via shotFired (assumes she lands core hits, an SR steady-state); charge-speed 12.74% to the lowest-ATK B3 ally, approximated by the engine as top-3-ATK allies; and 40.5% additional damage per full charge that 'Activates 5 times' = 5 hits per full charge -> 202.5% flatDamage per shot (user-confirmed reading; validated vs a real scope-lock run, single-hit read left her 0.70 cold). Burst (self Attack Damage 50%/10s + 925% nuke) is faithful in the parser, so the burst slot is omitted. FIXED (review): the S1 charge-speed buff targets the 1 Burst-3 ally with the LOWEST final ATK (was mis-parsed as top-3-ATK allies); excludeSelf reflects her S2 immunity to charge-speed effects. Remaining known gaps: her charge-speed immunity vs OTHER sources is not enforced (rarely relevant), the S1 20.83% Attack Damage rider is core-hit-gated via requiresCore (inert at core-rate 0; at any core exposure its 60s duration keeps it up, matching in-game). Q8: autofire (no 22f release latency) — her chargeFrames already reflect the full validated cycle (kit-fixed 1.2s / DB 90f). 2026-07-17: this now resolves from the datamined input_type='DOWN_Charge' (engine + web); the redundant charFixes.noBoltRecovery flag was removed. Q1 CALIBRATED (flag for manual review): her 202.5% core-hit procs are exempt from the +30% range and +50% full-burst majors — calibrated vs two real scope-lock runs (T1 1.16->1.00, T5 1.25->1.10); mechanism unconfirmed (user researching). | 2026-07-14 noFb REMOVED from the 202.5 proc (panel-accepted): the flag was a Q1 calibration-era relic contradicting the DATAMINED U1 rule (function damage takes FB by actual landing timing; the cast-instant rule is burst-slot-scoped). noRange stays (datamine-confirmed). Post-landing MEASURED verification queued: liberalio-focus recording, proc popup in-FB vs out-FB. [materialized 2026-07-16: burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] || Kit-autonomy gauntlet 2026-07-26: re-validated test-first — scripts/tests/units/liberalio.test.ts (20 assertions GREEN vs this override; every line pinned GREEN vs shipped and RED vs its nearest-wrong counterfactual: skill-level-9 magnitudes, the single-hit 40.5 rider misread, the top-3-ATK charge-speed misparse, the requiresCore gate, cast-before-FB nuke). Cross-family S2b (claude-fable-5) independently re-derived all nine lines with matching dispositions, no REAL-GOTCHA; two reviewer nuances reconciled in the test header (L7 charge-speed-immunity GAP is real but DORMANT — no charge-speed source in the control comp, no schema primitive — carried as the caveat below, not a failing test). ONE ENCODING FIX, driven by the S5 blind test (claude-opus-5) and independently flagged by S2b: Raging Current's trigger moved passive -> shotFired, so the 231% is EARNED on her first landed full charge instead of live from t=0 (the kit says 'Activates when landing a Full Charge attack against the stage target'); the passive shortcut over-credited exactly one charge (~0.2% of her total, allies byte-identical). TIER 2 (scoped lowest-final-ATK Burst-3 selector + fullBurstEnter-vs-burstCast split + Q1-calibrated range/FB exemptions).",
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Activates when landing a Full Charge attack against a Rapture that is not the stage target. Affects self. Gentle Current: Fixes charge time at 1 sec continuously. Removes Raging Current.",
      "Activates at battle start. Affects self. Immunity to Increase/Decrease Charge Speed effects, continuous."
    ],
    "burst": []
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
          "stat": "atkPct",
          "value": 160,
          "durationSec": 3
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 20.83,
          "durationSec": 60
        }
      ],
      "requiresCore": true
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 202.5,
          "noRange": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "alliesLowestAtk",
        "byFinalAtk": true,
        "count": 1,
        "burst": "III",
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "chargeSpeedPct",
          "value": 12.74,
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
          "stat": "attackDamagePct",
          "value": 231
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
          "value": 50,
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
          "atkPct": 925
        }
      ]
    }
  ],
  "caveats": [
    "skill2: Gentle Current (charge time fixed at 1 sec vs non-stage-target Raptures) is not modeled — the solo-raid boss is always the stage target, so Raging Current is permanently active and Gentle Current can never fire.",
    "skill2: her charge-speed immunity is only enforced against her OWN Skill 1 buff (excludeSelf); an EXTERNAL Charge Speed buff from a teammate (e.g. Maxwell, Alice) would wrongly speed her up in the sim."
  ]
}
```

### S2d independent verification

[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/Users/maxwellsutton/nikke-sim/.qwen/worktrees/kit-autonomy-batch-2026-07-26[39m

[32m✓[39m scripts/tests/units/liberalio.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 10[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m Tests [22m [1m[32m20 passed[39m[22m[90m (20)[39m
[2m Start at [22m 05:50:54
[2m Duration [22m 324ms[2m (transform 84ms, setup 0ms, import 225ms, tests 10ms, environment 0ms)[22m
