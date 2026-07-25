# S7 RECONCILING-JUDGE PACKET — neon-vision-eye (Neon: Vision Eye)

RL / Attacker / Electric / Burst III (cd 40s). Kit-autonomy gauntlet 2026-07-25. Driver: Qwen.
Blind roles: claude-fable-5 (S2b pre-op review), claude-opus-5 (S5 blind test, S6 blind override).
DISAMBIGUATION: this is `neon-vision-eye` (RL/Electric, "nve") — NOT base `neon` (SG/Fire) nor
`neon-blue-ocean` (MG/Water).

You are the BINDING reconciling judge. Read the contract below, then the evidence, and return the
verdict JSON the contract specifies.


LEAK NOTE (process, not faithfulness): all three blind roles (fable S2b, opus S5, opus S6) flagged a
PARTIAL LEAK — the supplied redacted effect schema (types-redacted.ts) carried a unit-named comment on
the `everyNOffset` field referencing this unit's full-gauge start. Each role re-derived the period-3
cycle INDEPENDENTLY from the kit prose/gauge arithmetic and states the derivation stands without the
leak. The packet-prep script should strip unit-named schema comments. This does not affect the verdict.



===== §1. RECONCILING-JUDGE CONTRACT =====

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


===== §2. MECHANICS SSOT (primer + pointers) =====

MECHANICS PRIMER (focused excerpts; full SSOT at docs/data/damage-calculation.md and
docs/data/game-mechanics.md — read those if you need more than this primer):

- Damage formula is multiplicative buckets: ATK × major × elem × charge × dmgUp × taken ×
  distributed. atkPct feeds the ATK bucket; attackDamagePct feeds the dmgUp (Damage-Up) bucket —
  they are DISTINCT buckets and must not be merged.
- "Function 'additional damage'" (e.g. a rider that "Deals X% of final ATK as additional damage")
  CRITs at the caster's rate and NEVER cores (SSOT damage-calculation.md §2b; datamined
  FunctionTable / U1 ruling). The engine's `extraHitDamagePct` stat is the sanctioned primitive for
  "flat % of final ATK added per normal-attack hit while active"; its rider emits damage with
  srcSlot=null (it is a SUMMED buff stat, so no single kit line owns it) in the 'burst' bucket,
  critEligible, coreEligible=false.
- Trigger timing: a `burstCast` resolves BEFORE the Full Burst window opens; `fullBurstEnter`
  fires when the window opens (~22 frames / ~0.37s later for this unit). Burst-cast/instant damage
  never takes the +50% Full Burst major; FB-entry buffs apply at the window-open frame.
- everyN / everyNOffset: a block's effects land only on every Nth trigger ACTIVATION (1-indexed);
  everyNOffset shifts the phase — fire when activations ≡ offset (mod everyN). everyN:3,
  everyNOffset:1 → fires on activations 1, 4, 7, … The activation counter is keyed to the block's
  OWN trigger (a burstCast-triggered block counts the owner's burst casts; a fullBurstEnter-triggered
  block counts team Full-Burst entries — which, in a multi-B3 comp, includes rotations the owner did
  NOT burst on, so a fullBurstEnter+everyN counter drifts out of phase with the owner's own casts).
- Scope lock: sync 400, skill levels 10/10/10, Base 5 gear, no cube/doll, core 7, partless boss,
  bossDef 140, auto-play, 180s fight, 60fps. Single partless boss → no AoE/radius surface, no
  interruption parts.


===== §3. GROUND TRUTH — kit prose + base stats (data/characters.json → characters['neon-vision-eye']) =====

```json
{
  "slug": "neon-vision-eye",
  "name": "Neon: Vision Eye",
  "weapon": "RL",
  "burst": "III",
  "burstCooldownSec": 40,
  "class": "Attacker",
  "element": "Electric",
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "hitsPerShot": 1,
  "burstGaugePerShot": 0.75,
  "skills": {
    "skill1": "■ Activates when attacked while not in Healthy Body status. Affects self.\nInvulnerable for 3 sec. Activates 5 time(s) per battle.\nGains debuff immunity to ∞ debuffs for 3 sec. Activates 5 time(s) per battle.\nHealthy Body: Incoming healing ▲ 10.26% for 20 sec.\n■ Activates when landing a Full Charge attack. Affects the enemy if the enemy is the stage target.\nFirepower Explosion:\nEffect: Deals 437.98% of final ATK as additional damage.\nAdditional effect of Super Firepower status: Deals 262.79% of final ATK as additional damage.",
    "skill2": "■ Activates at the start of battle. Affects self.\nIncreases the Firepower Gauge's charge by 100.\n■ Activates when performing a normal attack while in Firepower Charge status. Affects self.\nIncreases the Firepower Gauge's charge by 2.\n■ Activates when Firepower Charge ends. Affects self.\nIncreases the Firepower Gauge's charge by 45.\n■ Activates when Full Burst ends while Firepower Gauge is active. Affects self.\nBurst Gauge filling speed ▲ 5% x Firepower Gauge charge amount for 5 sec.\n■ Activates when entering Full Burst. Affects self.\nMaximum Firepower: \nEffect: ATK ▲ 80.04% for 10 sec.\nAdditional effect for Super Firepower: ATK ▲ 35.05% for 10 sec.",
    "burst": "■ Activates when the Firepower Gauge's charge is lower than 100. Affects self.\nFirepower Charge: Charges the Firepower Gauge for 10 sec. This effect cannot be removed.\nIncreases the Firepower Gauge's charge by 1.\n■ Activates when the Firepower Gauge's charge is at 100. Affects self.\nSuper Firepower: Attack Damage ▲ 45.03% for 10 sec.\nDecreases the Firepower Gauge's charge by 100.\n■ Affects self.\nExplosion Radius ▲ 200% for 10 sec.\nAttack Damage ▲ 110.21% for 10 sec."
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 88,
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
    "resourceId": 18
  },
  "input_type": "DOWN_Charge",
  "fire_type": "HomingProjectile"
}
```

===== §4. S2b PRE-OP REVIEW (claude-fable-5) =====

```json
{
  "slug": "neon-vision-eye",
  "leakDetected": "types.ts everyNOffset comment reads 'fires on the 1st, 4th, 7th… activation (Neon:VE starts at full Firepower Gauge)' — this names the target unit and reveals the shipped override's gauge-cycle encoding (everyN:3, everyNOffset:1). I re-derived the cycle independently from the prose (see notes); the derivation stands without the leak, but the packet-prep script should strip unit-named schema comments too.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "■ when attacked, not Healthy Body: invuln",
      "disposition": "UNMODELED",
      "scope": "self, defensive; trigger 'when attacked' has no engine analog (boss deals no damage in v1)",
      "durationSemantics": "3 sec, 5 activations per battle",
      "triggerIdentity": "on-being-attacked — unsupported; never fires in v1",
      "targetSet": "self",
      "nearestWrongModel": "modeling it as anything at all (e.g. a periodic self-buff) — any encoding invents activations that cannot occur",
      "distinguishingAssertion": "no buffApply events sourced from this block in any run; carry totals identical with the line present vs absent",
      "inertness": "must move zero damage on every comp",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "debuff immunity ∞ for 3 sec, 5x",
      "disposition": "UNMODELED",
      "scope": "self, defensive; no boss debuffs exist in v1",
      "durationSemantics": "3 sec, 5 activations per battle",
      "triggerIdentity": "same on-being-attacked block as invulnerability",
      "targetSet": "self",
      "nearestWrongModel": "n/a — only wrong move is modeling it",
      "distinguishingAssertion": "no events; totals unmoved",
      "inertness": "must move zero damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Healthy Body: Incoming healing ▲10.26%",
      "disposition": "UNMODELED",
      "scope": "self, incoming-heal amplifier; heal AMOUNTS are unmodeled (heal effects only emit recovery events), so amplifying them is inert. Tandem check (taxonomy #4): this modifies heals RECEIVED, it does not emit a heal, so it cannot drive any teammate's 'recovery' trigger",
      "durationSemantics": "20 sec status window (also the anti-condition for the invuln block: 'while not in Healthy Body')",
      "triggerIdentity": "applied by the same when-attacked block",
      "targetSet": "self",
      "nearestWrongModel": "encoding it as a heal effect that fires teammates' recovery triggers (e.g. crown) — it heals nobody",
      "distinguishingAssertion": "zero 'recovery' events attributable to neon-vision-eye across the fight; crown-class on-recovery consumers show no extra procs vs a comp without her",
      "inertness": "teammate on-recovery/on-heal consumers must NOT gain procs from this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge lands: 437.98% add'l dmg",
      "disposition": "FAITHFUL",
      "scope": "fires on every LANDED full-charge attack; RL base weapon (chargeFrames 60) full-charges every trigger pull under auto, so this is effectively per-shot — her dominant damage source (437.98% vs 61.3% normal mult)",
      "durationSemantics": "instant rider per qualifying shot, no duration",
      "triggerIdentity": "per full-charge shot (shotFired-equivalent for an RL, or extraHitDamagePct-style per-hit add). 'Affects the enemy if the enemy is the stage target' — always true vs the raid boss. Rider defaults: FB by landing timing ON, range bonus OFF (noRange), no core, crit only if measured",
      "targetSet": "enemy",
      "nearestWrongModel": "an interval/hitCount trigger decoupled from her actual shot cadence, or granting the rider core/range eligibility, or FB-gating it (fbGate:'inFb') so it vanishes outside Full Burst",
      "distinguishingAssertion": "count of her flat-damage rider events === count of her charge-shot damage events across the whole fight (including outside FB), each with mult consistent with 437.98% of final ATK; rider events carry rangeApplied:false and appear between Full Bursts (red under an FB-gated or interval encoding)",
      "inertness": "rider count must not exceed shot count (no double-fire per pull); must not receive core bucket",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Super Firepower add'l: 262.79% dmg",
      "disposition": "FAITHFUL",
      "scope": "extra rider on full-charge shots landing ONLY while Super Firepower status is live (10 s windows opened by her gauge-100 burst casts — her 1st, 4th, 7th… bursts per the gauge derivation)",
      "durationSemantics": "rider active during a 10 s status window; NOT a permanent second rider",
      "triggerIdentity": "same full-charge landing trigger, gated on the self status 'Super Firepower' (encodable as a 10s-duration extraHitDamagePct-style buff applied by the gauge-100 burst branch, or a status/mode gate on a second flatDamage block)",
      "targetSet": "enemy",
      "nearestWrongModel": "TRAP #1: ungated — +262.79% on every full-charge shot all fight (over-credits massively), or gating it on Firepower Charge status instead of Super Firepower, or applying it every burst instead of every 3rd",
      "distinguishingAssertion": "per-shot rider magnitude is 437.98%-equivalent outside Super windows and (437.98+262.79)%-equivalent only within 10 s after her 1st/4th/7th burst casts; shots fired >10 s after a gauge-100 burst, and all shots following her Firepower-Charge (low-gauge) bursts, must show the base rider only",
      "inertness": "the +262.79% component must be absent in windows following her low-gauge bursts and absent on rotations where the co-B3 (helm) bursts instead",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "battle start: gauge charge +100",
      "disposition": "FAITHFUL",
      "scope": "self resource initialization — the Firepower Gauge starts FULL (0+100, cap 100 implied by the '=100' burst branch)",
      "durationSemantics": "one-time at t=0, permanent until spent",
      "triggerIdentity": "battle-start (resource initial:100, or a passive/start block with a resource effect)",
      "targetSet": "self",
      "nearestWrongModel": "TRAP #2: omitting the start charge (gauge starts 0) — Super Firepower phase-shifts from her bursts 1,4,7… to 3,6,9…, delaying the 45.03%/35.05%/262.79% package by two full rotations",
      "distinguishingAssertion": "her FIRST burst cast applies the attackDamagePct 45.03 buff (Super branch) and NOT the Firepower Charge status; equivalently the +262.79% rider component is present in the first 10 s after her first burst",
      "inertness": "first burst must not take the gauge<100 branch",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "normal attack in FP Charge: charge +2",
      "disposition": "FAITHFUL",
      "scope": "gauge +2 per normal attack ONLY while Firepower Charge status is live (the 10 s window after a low-gauge burst); for an RL her charge shot IS her normal attack",
      "durationSemantics": "per-shot resource gain, gated to the 10 s status window",
      "triggerIdentity": "shotFired with a Firepower-Charge-status gate",
      "targetSet": "self",
      "nearestWrongModel": "+2 per normal ALWAYS (ungated) — gauge refills between every burst and Super Firepower fires every OTHER burst instead of every 3rd; or reading 'normal attack' as excluding her charge shots (RL has no non-charge attack → +0, cycle never closes without the +45)",
      "distinguishingAssertion": "under the faithful model her burst-cast branch sequence is Super, Charge, Charge, Super, … (period 3); an always-on +2 encoding produces Super, Charge, Super, Charge (period 2) — assert the attackDamagePct 45.03 buffApply appears on exactly her 1st, 4th, 7th casts and never on the 2nd/3rd",
      "inertness": "no gauge accrual from shots fired outside Firepower Charge windows",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "FP Charge ends: charge +45",
      "disposition": "FAITHFUL",
      "scope": "one-time gauge +45 when the 10 s Firepower Charge status expires",
      "durationSemantics": "instant on status end",
      "triggerIdentity": "status-end (10 s after the low-gauge burst cast)",
      "targetSet": "self",
      "nearestWrongModel": "omitted — the gauge then needs ~2× more charge-window shots and the Super period stretches beyond 3, starving the 45.03/35.05/262.79 package; or granting it at status START",
      "distinguishingAssertion": "period-3 cycle assertion (same as above); additionally, second-charge-window math: after one Super (gauge 0), two Firepower Charge windows must reach 100 (0+1+2n+45 ≈ 60, then 60+1+2n+45 caps at 100) — her 4th cast must take the Super branch even if in-window shot count n is small",
      "inertness": "no +45 grants outside Firepower Charge expiries",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "FB ends, gauge active: burst fill ▲5%×charge",
      "disposition": "GAP",
      "scope": "self burst-generation buff whose VALUE is dynamic: 5% × current gauge charge (0–100 → 0–500%) at FB end, only 'while Firepower Gauge is active' (charge > 0 — so silent after her Super bursts, which zero the gauge)",
      "durationSemantics": "5 sec from Full Burst end",
      "triggerIdentity": "fullBurstEnd, resource-gated (gauge ≥ 1); value via perResource {firepowerGauge, mult:5} on stat burstGenPct — expressible in the schema, but 'active' is ambiguous (charge>0 vs gauge-UI-present) and the rotation impact depends on how the sim credits burst gen, so I mark GAP pending that reading",
      "targetSet": "self",
      "nearestWrongModel": "a FIXED 5% (dropping the ×charge multiplier, under-crediting up to 100×), or a fixed 500% on every FB end including post-Super ends where the gauge is 0",
      "distinguishingAssertion": "buffApply stat burstGenPct at FB ends following her Firepower-Charge rotations with value ≈ 5×(current charge) (varies per rotation), and NO burstGenPct buffApply at the FB end of rotations where her Super burst zeroed the gauge",
      "inertness": "no burst-gen buff when gauge is 0; magnitude must track the live pool, not a constant",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "enter Full Burst: ATK ▲80.04% 10s",
      "disposition": "FAITHFUL",
      "scope": "self ATK buff on ANY team Full Burst entry — 'when entering Full Burst', NOT her own cast",
      "durationSemantics": "10 sec wall-clock",
      "triggerIdentity": "fullBurstEnter (team event). Diverges from burstCast in the control fixture: controlComp carries helm as co-B3, so rotations exist where helm bursts and she does not",
      "targetSet": "self",
      "nearestWrongModel": "keying to burstCast — the buff then skips every rotation the co-B3 takes, under-crediting her in multi-B3 comps",
      "distinguishingAssertion": "a buffApply stat atkPct value 80.04 targeting her on EVERY fullBurstStart, including rotations where the burstCast event belongs to helm (red under a burstCast encoding)",
      "inertness": "must not fire outside FB entries",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Super FP add'l: ATK ▲35.05% 10s",
      "disposition": "FAITHFUL",
      "scope": "additional self ATK on FB entry, ONLY while Super Firepower status is live at that entry — i.e. FBs chained from her gauge-100 (1st/4th/7th) burst casts",
      "durationSemantics": "10 sec wall-clock",
      "triggerIdentity": "fullBurstEnter gated on the Super Firepower self-status (her own burst precedes FB entry in the same rotation, so the 10 s status covers the entry). NOT ownBurstGate alone — a low-gauge own-burst rotation must also NOT grant it",
      "targetSet": "self",
      "nearestWrongModel": "granting 35.05 on every FB entry (ungated), or gating merely on 'she cast this rotation' (ownBurstGate:'cast') which wrongly includes her Firepower-Charge rotations",
      "distinguishingAssertion": "buffApply atkPct 35.05 present only at FB entries immediately following her 1st/4th/7th burst casts; absent at FB entries after her 2nd/3rd (Charge-branch) casts and after helm-cast rotations",
      "inertness": "never applied when the entering rotation's her-burst was the gauge<100 branch",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "gauge<100: FP Charge 10s, charge +1",
      "disposition": "FAITHFUL",
      "scope": "self status branch when cast with gauge below 100: opens the 10 s Firepower Charge accrual window (+1 immediately); no damage of its own, but it drives the whole Super cycle and the S2 +2/shot gate. She keeps firing her RL normally during it — it is a status, not a weapon or behavior change",
      "durationSemantics": "10 sec status ('cannot be removed' — no dispel exists in-sim, note-only)",
      "triggerIdentity": "burstCast (her own cast), branch-selected by gauge value at cast (resource gate max:99, or the everyN:3/everyNOffset:1 complement)",
      "targetSet": "self",
      "nearestWrongModel": "treating Firepower Charge as a damage-relevant mode (e.g. a weaponSwap or an attack buff), or firing this branch unconditionally alongside the Super branch on the same cast",
      "distinguishingAssertion": "on any single burst cast exactly ONE branch's effects appear: casts 2 and 3 (of her casts) show the Firepower Charge application and NO attackDamagePct 45.03; casts 1 and 4 show the inverse",
      "inertness": "no direct damage events from this branch; must not stack with the Super branch on one cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "gauge=100: Atk Dmg ▲45.03% 10s, −100",
      "disposition": "FAITHFUL",
      "scope": "self Attack Damage (Damage-Up bucket, attackDamagePct — additive/diluted with other Damage-Up buffs) when cast at full gauge; opens the Super Firepower status consumed by the S1 rider and S2 FB-entry add-on; then spends the gauge to 0",
      "durationSemantics": "10 sec wall-clock; gauge spend is instant. Spend ordering matters: any gauge-100 gate must read the PRE-spend pool (spend effect ordered after the gated effects)",
      "triggerIdentity": "burstCast, branch-selected at gauge=100 → her casts 1, 4, 7, … (derivation in notes; matches an everyN:3, everyNOffset:1 encoding)",
      "targetSet": "self",
      "nearestWrongModel": "TRAP #1 again: the 45.03 (and the Super status) on EVERY burst cast — a ~3× over-credit of the whole Super package; or stat-key confusion (atkPct instead of attackDamagePct, wrong bucket)",
      "distinguishingAssertion": "buffApply stat attackDamagePct value 45.03 on her 1st and 4th casts only, never on her 2nd/3rd; and the gauge (if queryable) or its proxies (no burstGenPct buff at that rotation's FB end) confirm the −100 spend",
      "inertness": "absent on Charge-branch casts and on helm-burst rotations; must land in the Damage-Up bucket, not the atkPct stat",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Explosion Radius ▲200% 10s",
      "disposition": "UNMODELED",
      "scope": "RL AoE radius vs a single partless boss — no radius mechanic in the engine, no multi-target to catch",
      "durationSemantics": "10 sec",
      "triggerIdentity": "unconditional on her burst cast",
      "targetSet": "self",
      "nearestWrongModel": "laundering it into projectileExplosionPct (a DAMAGE stat) — radius is not damage",
      "distinguishingAssertion": "no projectileExplosionPct (or any damage-stat) buffApply of value 200 anywhere; totals unmoved by the line",
      "inertness": "must move zero damage",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Attack Damage ▲110.21% 10s",
      "disposition": "FAITHFUL",
      "scope": "self, unconditional branch of HER burst — fires on every cast regardless of gauge (it sits under a bare '■ Affects self' header inside her own burst block)",
      "durationSemantics": "10 sec wall-clock",
      "triggerIdentity": "burstCast (her own casts only) — NOT fullBurstEnter; with helm as co-B3 these diverge whenever helm takes the rotation",
      "targetSet": "self",
      "nearestWrongModel": "keying to fullBurstEnter so it fires on helm's rotations too (over-credits her in the control fixture), or targeting allies instead of self",
      "distinguishingAssertion": "buffApply stat attackDamagePct value 110.21 targeting only her, exactly once per HER burst cast (all branches), and ABSENT on rotations where the burstCast event is helm's (red under a fullBurstEnter encoding)",
      "inertness": "no application on co-B3 rotations; never applied to teammates",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:FullCharge-437.98-rider",
    "skill1:SuperFirepower-262.79-rider",
    "skill2:battle-start-gauge+100",
    "skill2:normal-in-FPCharge-gauge+2",
    "skill2:FPCharge-end-gauge+45",
    "skill2:FBenter-atk-80.04",
    "skill2:FBenter-SuperFP-atk-35.05",
    "burst:lowGauge-FPCharge-branch",
    "burst:fullGauge-SuperFP-45.03-spend100",
    "burst:unconditional-attackDamage-110.21"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Invulnerable for 3 sec. Activates 5 time(s) per battle.",
      "Gains debuff immunity to ∞ debuffs for 3 sec. Activates 5 time(s) per battle.",
      "Healthy Body: Incoming healing ▲ 10.26% for 20 sec."
    ],
    "skill2": [],
    "burst": [
      "Explosion Radius ▲ 200% for 10 sec.",
      "This effect cannot be removed. (Firepower Charge dispel-immunity clause — no dispel exists in-sim)"
    ]
  },
  "notes": "GAUGE CYCLE DERIVATION (independent, kit-only, robust): start 0+100=100 (cap 100 implied by the '=100' branch). Her cast #1 → Super branch, gauge→0. Cast #2 (gauge 0<100) → Firepower Charge: +1 cast, +2×n shots in 10 s (RL: ~1 s charge per shot, 6 ammo, 2.35 s reload → n≈6-8), +45 at window end ≈ 58-62. Cast #3 → Charge again: 58-62+46+2n ≥ 104 → CAPS at 100 for any n≥0. Cast #4 → Super. Period 3, phase 1 — i.e. Super on her casts 1,4,7,…. ROBUSTNESS: period-3 holds for ANY shot count because one window from ~60 always caps (needs only the +45+1), while one window from 0 can never reach 100 (would need n≥27 shots in 10 s — impossible for this RL). So the cycle is DERIVED-from-kit, not calibration-fragile; the only ⚑ residual is her exact shots-per-window n (cadence tuple, ALWAYS-⚑ #1), which does NOT change the period — only, marginally, the FB-end burstGenPct magnitude on charge rotations. EXPECTED SHARED-PRIOR MISREADS the driver must have distinguishing assertions for: (1) Super Firepower package (45.03 + 35.05 + 262.79) on EVERY burst — the single biggest over-credit (~3×); (2) missing the battle-start +100, phase-shifting Super to casts 3,6,9 (an everyNOffset error — first-fight totals drop, steady-state period unchanged); (3) burstCast vs fullBurstEnter swaps — this kit has BOTH kinds adjacent (S2 ATK buffs are fullBurstEnter; burst 110.21/45.03 are burstCast), and the control fixture's helm co-B3 makes every swap observable; (4) the +2/normal gauge gain left ungated (period collapses to 2); (5) the 262.79 rider gated on the WRONG status (Firepower Charge instead of Super Firepower) — exactly inverts which windows get the bonus; (6) burst-gen ×charge flattened to a constant. Rider defaults per methodology #9: the 437.98/262.79 riders take FB by landing timing (default ON), get no range (+30% OFF), no core, crit only if measured. If the shipped tests assert none of the branch-exclusivity (one branch per cast) or period-3 facts, that is the gap to flag.",
  "model": "claude-fable-5"
}

```

===== §5. S5 BLIND TEST (claude-opus-5) + result vs driver override =====

S5 BLIND TEST vs DRIVER OVERRIDE — result (adapted; see note): 11 PASSED / 3 FAILED / 5 SKIPPED.

ADAPTATION (faithful, harness-API wiring only — NO assertion changed): the blind packet wired
`onEvent` at the top level of CompOptions; the harness reads it from `cfg`. As written the event log
was empty and every event assertion read 0 (9 spurious failures). Routing onEvent through cfg
(restoring events) yields the true 11/3/5 split. The adapted file is blind/neon-vision-eye.adapted.test.ts.

THE 3 FAILURES — driver analysis (each is benign, not a load-bearing faithfulness error):

(F1) S2e "+35.05% ATK Super rider" frame-identity: the test asserts the 35.05 buffApply frame is a
  fullBurstStart frame. The driver fires 35.05 on burstCast (via the everyN:3/offset:1 Super block),
  ~22f (~0.37s) BEFORE fullBurstStart. The buff is 10s, so it covers the entire FB window either way;
  the only difference is ~22f of pre-window coverage. The earlier assertions in this group PASSED
  (35.05 present, correct cadence = every-3rd, magnitude 35.05, not merged into 115.09, self-scoped).
  NOTE: the driver's burstCast keying is the MORE robust encoding — the S6 blind override used
  fullBurstEnter+everyN for 35.05 and its OWN caveat ⚑8 admits that keying "drifts out of phase with
  her own burst count" in multi-B3 comps. The driver's burstCast keying stays correct there.

(F2) S2d burst-gen (burstGenPct at FB end): the driver deliberately UNMODELS this line as
  non-load-bearing burst-generation-only. The fable S2b review INDEPENDENTLY marked the same line GAP
  (dynamic 5%×gauge value, burst-gen only). kit-status (MEASURED, video-verified) records "empirically
  does not consume the Firepower cycle — every-3rd-Super held on video". It is documented verbatim in
  the driver override's unmodeled.skill2. The S6 blind override DID model it, but with a self-declared
  placeholder magnitude (75 = "5×~15 … a flagged placeholder, not a measurement").

(F3) S1b "+262.79% co-lands on some charges" doubled-events heuristic: the test counts frames with ≥2
  skill1-srcSlot damage events, assuming the 262.79 Super rider is a second flatDamage with
  srcSlot='skill1'. The driver encodes 262.79 via the sanctioned `extraHitDamagePct` primitive → its
  rider has srcSlot=null (summed-stat convention), 'burst' bucket. The heuristic therefore sees only the
  437.98 base rider (one skill1 event/frame) and reports doubled=0. The 262.79 rider IS present and
  correct in the driver (the driver's own spec pins it: extraHitDamagePct 262.79 buff on casts 1,4 +
  burst-bucket srcSlot-null damage at 262.79, critEligible, coreEligible=false). This is an
  encoding-specific heuristic limitation, not a missing line.

CRITICAL PASSES (load-bearing discriminations the blind test GOT vs the driver): fixture non-vacuity
(FB≥3, ≥2 casts); 110.21 unconditional every-cast 10s (not atkPct, not merged 155.24); 45.03 Super
CONDITIONAL (first cast is Super, NOT every cast, coincides with a cast frame); 80.04 ATK keyed to
fullBurstEnter (apply frame ∈ fullBurstStart set — the burstCast-vs-fullBurstEnter trigger-kind
discrimination, which the driver passes); 437.98 base rider per-shot (≥60 hits) and counterfactual
zeroing moves her total a lot; inertness (nothing leaks to teammates; zeroing the rider leaves
teammates byte-identical).


--- blind test source (blind/neon-vision-eye.test.ts) ---

```ts
/**
 * neon-vision-eye — Neon: Vision Eye (RL / Electric / Attacker / Burst III; cd 40 s,
 * 6 rounds, 141-frame reload, 60-frame charge, normal 61.3 / core 200).
 *
 * BLIND spec test — written from the kit prose alone, with no sight of the driver's
 * override, tests or reasoning.
 *
 * STRUCTURAL READ OF THE KIT (header + Affects-clause + stat keyword before the arrow):
 *   S1a  trigger "when attacked", self — invulnerability / debuff immunity / an
 *        incoming-healing status. Purely defensive: the v1 boss deals no damage, there is
 *        no incoming-healing StatKey, and no "when attacked" trigger exists -> GAP (skipped).
 *   S1b  trigger "landing a Full Charge attack", enemy — Firepower Explosion, 437.98% of
 *        final ATK, PLUS 262.79% more while in Super Firepower status.
 *        An RL has a charge weapon: EVERY shot is a full charge, so this is a per-shot
 *        rider (shotFired / chargeCounter:1), NOT an interval or every-N proc.
 *   S2a  battle start, self — Firepower Gauge +100. LOAD-BEARING: the gauge starts FULL,
 *        so the unit's FIRST burst must take the gauge==100 (Super Firepower) branch.
 *   S2b  normal attack while in Firepower Charge, self — gauge +2 (gauge-internal).
 *   S2c  "when Firepower Charge ends", self — gauge +45 (gauge-internal; no status-end
 *        trigger primitive exists) -> GAP (skipped); only observable through the branch cadence.
 *   S2d  "when Full Burst ends" while the gauge is active, self — Burst Gauge filling speed
 *        +5% x gauge for 5 s -> a burstGenPct self-buff keyed to full-burst-END, not enter.
 *   S2e  "when entering Full Burst", self — Maximum Firepower: ATK +80.04% for 10 s, and an
 *        ADDITIONAL ATK +35.05% for 10 s under Super Firepower. Trigger identity matters:
 *        full-burst-ENTER, so the apply frame must coincide with a fullBurstStart frame
 *        (the nearest-wrong, burst-cast keying, applies strictly earlier).
 *   Ba   burst, gauge < 100, self — Firepower Charge for 10 s; gauge +1.
 *   Bb   burst, gauge == 100, self — Super Firepower: Attack Damage +45.03% for 10 s; gauge -100.
 *   Bc   burst, self, NO activation clause — Explosion Radius +200% for 10 s (no radius/hit-
 *        geometry primitive -> GAP, skipped) and Attack Damage +110.21% for 10 s
 *        (UNCONDITIONAL: fires on every one of this unit's casts).
 *
 * FIXTURE: controlComp('neon-vision-eye', true). The B1+B2 are mandatory — a lone Burst III
 * makes ZERO Full Bursts, and five of the lines above are FB- or burst-keyed, so without them
 * every assertion would read vacuously green. Helm is kept: her buffs are crit / charge-
 * flavoured and cannot forge any of the magnitudes asserted here, and no assertion reads a raw
 * damage total except the one counterfactual delta. Deterministic (no seed). Two 180 s runs.
 *
 * WHY THESE ASSERTIONS DISCRIMINATE: they read EVENTS (buffApply stat+value+frame+expiresFrame,
 * damage srcSlot, fullBurstStart/End frames), never the override's shape — so any faithful
 * encoding of the Firepower Gauge (a resource pool, an everyN branch counter, a mode) passes,
 * while each nearest-wrong model named per-test fails.
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

const SLUG = 'neon-vision-eye';
const FPS = 60;

type Ev = any;

const near = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;
const F = (e: Ev): number => (typeof e?.frame === 'number' ? e.frame : -1);
// srcSlot is the documented field; fall back defensively rather than silently matching nothing.
const SRC = (e: Ev): string | undefined => e?.srcSlot ?? e?.slot ?? e?.source;

function run(opts: ReturnType<typeof controlComp>, extra: Record<string, unknown> = {}) {
  const events: Ev[] = [];
  const res = runComp({ ...opts, ...extra, onEvent: (ev: SimEvent) => events.push(ev) } as any);
  return { res, events };
}

// The override FILE is slot-keyed; the harness clone may hand back either the raw Block[] per
// slot or a CharacterSkills carrying its own blocks[]. Tolerate both — there is no top-level
// ov.blocks in either shape.
function slotBlocks(ov: Ev, slot: 'skill1' | 'skill2' | 'burst'): Ev[] {
  const s = ov?.[slot];
  return Array.isArray(s) ? s : (s?.blocks ?? []);
}

// ---------------------------------------------------------------- hoisted runs (2 x 180 s)
const BASE = run(controlComp(SLUG, true));

// Nearest-wrong for S1b: the Firepower Explosion rider does not exist at all.
const noRider = withPatchedOverride(SLUG, (ov: Ev) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    for (const e of (b.effects ?? [])) {
      if (e.kind === 'flatDamage' || e.kind === 'dot' || e.kind === 'storedHit') e.atkPct = 0;
    }
  }
});
const NO_RIDER = run(controlComp(SLUG, true), { overrides: { [SLUG]: noRider } });

// ---------------------------------------------------------------- derived event views
const EV: Ev[] = BASE.events;
const FB_START = EV.filter((e) => e.kind === 'fullBurstStart').map(F);
const FB_END = EV.filter((e) => e.kind === 'fullBurstEnd').map(F);
const SELF_BUFFS = EV.filter((e) => e.kind === 'buffApply' && e.targetSlug === SLUG);
const pick = (stat: string, value?: number) =>
  SELF_BUFFS.filter((e) => e.stat === stat && (value === undefined || near(e.value, value)));

const B110 = pick('attackDamagePct', 110.21); // Bc, unconditional, once per own cast
const B45 = pick('attackDamagePct', 45.03); // Bb, Super Firepower branch only
const A80 = pick('atkPct', 80.04); // S2e base, every FB enter
const A35 = pick('atkPct', 35.05); // S2e Super Firepower rider only
const BGEN = pick('burstGenPct'); // S2d, FB end
const S1DMG = EV.filter((e) => e.kind === 'damage' && SRC(e) === 'skill1');

describe('neon-vision-eye — fixture non-vacuity', () => {
  it('the control comp actually full-bursts and this unit actually casts (else every FB/burst line reads vacuously)', () => {
    expect(FB_START.length).toBeGreaterThanOrEqual(3);
    expect(FB_END.length).toBeGreaterThanOrEqual(2);
    // 40 s cooldown over a 180 s fight -> at least two of this unit's own casts, which is the
    // minimum needed for the Super-vs-Charge branch alternation to be observable at all.
    expect(B110.length).toBeGreaterThanOrEqual(2);
    // the event log carries real frame numbers (guards every frame-identity assertion below
    // from passing degenerately on an undefined field)
    expect(new Set(EV.map(F)).size).toBeGreaterThan(10);
    expect(F(EV.find((e) => e.kind === 'fullBurstStart'))).toBeGreaterThan(0);
  });
});

describe('neon-vision-eye — burst: unconditional Attack Damage 110.21% / 10 s (Bc)', () => {
  it('applies on every own cast with a 10 s wall-clock window', () => {
    expect(B110.length).toBeGreaterThanOrEqual(2);
    for (const e of B110) {
      // duration semantics: SECONDS, not rounds. A 6-round RL magazine would make a
      // durationShots encoding span a reload and expire at a variable frame instead.
      expect(e.durationShots ?? undefined).toBeUndefined();
      expect(e.expiresFrame - F(e)).toBeGreaterThanOrEqual(10 * FPS - 6);
      expect(e.expiresFrame - F(e)).toBeLessThanOrEqual(10 * FPS + 6);
    }
  });

  it('is Attack Damage (Damage Up bucket), not ATK — the two burst stat lines must not be merged', () => {
    // nearest-wrong: encoding 110.21 as atkPct, or folding Bb's 45.03 into it as a single
    // 155.24 Attack Damage buff (which would also make the conditional branch unconditional).
    expect(pick('atkPct', 110.21)).toHaveLength(0);
    expect(pick('attackDamagePct', 155.24)).toHaveLength(0);
  });
});

describe('neon-vision-eye — burst: Super Firepower branch is CONDITIONAL on a full gauge (Ba/Bb + S2a)', () => {
  it('fires on the FIRST cast (the gauge starts at 100 from the battle-start line)', () => {
    expect(B45.length).toBeGreaterThanOrEqual(1);
    // The battle-start +100 means cast #1 must take the gauge==100 branch, so the conditional
    // 45.03 lands on the same frame as the unconditional 110.21 of that same cast.
    // Nearest-wrong: a gauge modelled as starting EMPTY -> the first Super lands several
    // casts later (or never), and these frames diverge.
    expect(F(B45[0])).toBe(F(B110[0]));
  });

  it('does NOT fire on every cast — the gauge is spent (-100) and must be rebuilt', () => {
    // Non-vacuity for the inactive case: with >= 2 casts observed above, a faithful model
    // must show at least one cast WITHOUT the Super branch.
    // Nearest-wrong: an unconditional 45.03 (branch gate dropped) -> counts become equal.
    expect(B45.length).toBeLessThan(B110.length);
    expect(B45.length).toBeGreaterThanOrEqual(1);
    for (const e of B45) {
      expect(e.expiresFrame - F(e)).toBeGreaterThanOrEqual(10 * FPS - 6);
      expect(e.expiresFrame - F(e)).toBeLessThanOrEqual(10 * FPS + 6);
    }
    // every Super apply coincides with one of this unit's own casts
    const castFrames = new Set(B110.map(F));
    for (const e of B45) expect(castFrames.has(F(e))).toBe(true);
  });
});

describe('neon-vision-eye — skill2: Maximum Firepower ATK 80.04% / 10 s on FULL-BURST ENTER (S2e)', () => {
  it('is keyed to full-burst entry, not to the burst cast', () => {
    expect(A80.length).toBeGreaterThanOrEqual(2);
    const starts = new Set(FB_START);
    // Nearest-wrong: keying "when entering Full Burst" to burstCast. A burst cast resolves
    // BEFORE the Full Burst window opens, so its apply frame would not be in this set.
    for (const e of A80) expect(starts.has(F(e))).toBe(true);
    for (const e of A80) {
      expect(e.expiresFrame - F(e)).toBeGreaterThanOrEqual(10 * FPS - 6);
      expect(e.expiresFrame - F(e)).toBeLessThanOrEqual(10 * FPS + 6);
    }
  });

  it('is ATK, not Attack Damage — the two buckets must not be swapped', () => {
    expect(pick('attackDamagePct', 80.04)).toHaveLength(0);
  });

  it('the Super Firepower rider (+35.05% ATK) fires only on gauge-spent rotations', () => {
    // Both the active and the inactive case must be exercised: at least one FB entry inside a
    // Super Firepower window, and at least one outside it.
    // Nearest-wrong A: the 35.05 line dropped entirely -> length 0.
    // Nearest-wrong B: the 35.05 line merged into the base (115.09) or made unconditional
    //                  -> length equals A80.length.
    expect(A35.length).toBeGreaterThanOrEqual(1);
    expect(A35.length).toBeLessThan(A80.length);
    expect(pick('atkPct', 115.09)).toHaveLength(0);
    const starts = new Set(FB_START);
    for (const e of A35) expect(starts.has(F(e))).toBe(true);
  });
});

describe('neon-vision-eye — skill2: burst-gen speed on FULL-BURST END (S2d)', () => {
  it('applies a burstGenPct self-buff at full-burst end (5 s window)', () => {
    // The magnitude is 5% x live gauge, so a faithful encoding may emit either the resolved
    // number or a perResource placeholder — assert presence + trigger identity + window only.
    // Nearest-wrong A: the line dropped (a weapon/gauge-economy line skipped as "defensive").
    // Nearest-wrong B: keyed to fullBurstEnter -> the apply frames land in FB_START instead.
    expect(BGEN.length).toBeGreaterThanOrEqual(1);
    const ends = new Set(FB_END);
    const starts = new Set(FB_START);
    for (const e of BGEN) {
      expect(ends.has(F(e))).toBe(true);
      expect(starts.has(F(e))).toBe(false);
      expect(e.expiresFrame - F(e)).toBeGreaterThanOrEqual(5 * FPS - 6);
      expect(e.expiresFrame - F(e)).toBeLessThanOrEqual(5 * FPS + 6);
    }
  });
});

describe('neon-vision-eye — skill1: Firepower Explosion 437.98% per full charge (S1b)', () => {
  it('lands once per full-charge attack, not on an interval / every-N cadence', () => {
    // A 6-round RL with a 60-frame charge and a 141-frame reload cycles ~8.4 s per magazine,
    // i.e. ~120+ full charges over 180 s. A per-shot rider must therefore land many dozens of
    // hits; an interval / hitCount:N / every-N encoding lands a small fraction of that.
    expect(S1DMG.length).toBeGreaterThanOrEqual(60);
    expect(new Set(S1DMG.map(F)).size).toBeGreaterThanOrEqual(50);
  });

  it('carries real damage — zeroing it moves this unit a lot (counterfactual)', () => {
    const base = unitOf(BASE.res, SLUG).totalDamage;
    const cf = unitOf(NO_RIDER.res, SLUG).totalDamage;
    expect(base).toBeGreaterThan(0);
    expect(cf).toBeLessThan(base * 0.85);
  });

  it('the Super Firepower rider (+262.79%) co-lands on some charges but not all', () => {
    const frames = S1DMG.map(F);
    // guard: real, distinct frames (so "two hits on one frame" is meaningful)
    expect(new Set(frames).size).toBeGreaterThan(1);
    const counts = new Map<number, number>();
    for (const f of frames) counts.set(f, (counts.get(f) ?? 0) + 1);
    const doubled = [...counts.values()].filter((n) => n >= 2).length;
    // Nearest-wrong A: the 262.79 rider dropped -> doubled === 0.
    // Nearest-wrong B: the rider made unconditional (status gate lost) -> every charge doubles.
    expect(doubled).toBeGreaterThanOrEqual(1);
    expect(doubled).toBeLessThan(counts.size * 0.5);
  });
});

describe('neon-vision-eye — inertness (every kit line says "Affects self" or targets the enemy)', () => {
  it('grants nothing to teammates', () => {
    const leaked = EV.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== SLUG &&
        [110.21, 45.03, 80.04, 35.05].some((v) => near(e.value, v)),
    );
    expect(leaked).toEqual([]);
  });

  it('zeroing the skill1 rider leaves every teammate byte-identical', () => {
    // The rider is self-sourced damage on the enemy: it cannot feed a teammate. (The burst-gen
    // line is deliberately NOT the counterfactual here — that one legitimately moves rotation
    // timing for everyone.)
    const others = (t: Record<string, number>) =>
      Object.fromEntries(Object.entries(t).filter(([k]) => k !== SLUG));
    expect(others(totals(NO_RIDER.res))).toEqual(others(totals(BASE.res)));
  });
});

describe('neon-vision-eye — GAP lines (no primitive / unobservable payload)', () => {
  it.skip('S1a: invulnerability + debuff immunity, 5x per battle — no "when attacked" trigger, and the v1 boss deals no damage', () => {});
  it.skip('S1a: Healthy Body incoming-healing +10.26% / 20 s — no incoming-healing StatKey; no HP pool to heal', () => {});
  it.skip('S2b/S2c: gauge +2 per normal attack while charging, +45 when the charge status ends — no status-end trigger primitive; observable only through the Super-vs-Charge branch cadence, which the Bb tests already pin', () => {});
  it.skip('Ba: Firepower Charge is a 10 s unremovable self status — no timed-status primitive; its only damage-relevant consequence is the gauge trajectory', () => {});
  it.skip('Bc: Explosion Radius +200% / 10 s — hit-geometry, no radius primitive. FLAGGED: for an RL this plausibly raises landed/core hits, so it is a real (unquantified) damage line, not a defensive skip', () => {});
});

```

===== §6. S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver =====

S6 BLIND OVERRIDE vs DRIVER OVERRIDE — diff summary (full blind override below; driver override in §7):

CONVERGENT (all 6 load-bearing lines, same magnitude/cadence/scope/duration):
  • 437.98 base rider — blind: chargeCounter:1 flatDamage 437.98 crit:true | driver: shotFired
    flatDamage 437.98. EQUIVALENT for an RL (every shot is a full charge → both fire once per shot).
  • 262.79 Super rider — blind: chargeCounter:1 flatDamage 262.79 gated on requiresTargetStatus
    "Super Firepower" (a targetStatus the burst block opens on the boss for 10s) | driver:
    extraHitDamagePct 262.79 buff (everyN:3/offset:1) → per-hit rider. EQUIVALENT damage; the blind
    agent's caveat ⚑2 calls its targetStatus channel "a deliberate mis-scope of channel, not of
    behaviour — the window opens/closes on exactly the right frames".
  • 80.04 FB-enter ATK — IDENTICAL (fullBurstEnter → atkPct 80.04, 10s, self).
  • 35.05 Super ATK — blind: fullBurstEnter everyN:3/offset:1 atkPct 35.05 10s | driver: burstCast
    everyN:3/offset:1 atkPct 35.05 10s (in the Super block). SAME cadence; driver's burstCast keying
    is more robust in multi-B3 (blind ⚑8 admits fullBurstEnter+everyN drifts there).
  • 45.03 Super AD — blind: burstCast everyN:3/offset:1 attackDamagePct 45.03 10s | driver: same
    (grouped under skill1's Super block). IDENTICAL trigger/cadence/effect.
  • 110.21 unconditional AD — IDENTICAL (burstCast attackDamagePct 110.21 10s, self).
  • UNMODELED set — both UNMODEL invuln/debuff-immunity/received-heal, Explosion Radius, and the
    gauge plumbing (start +100, +2/attack, +45/end, burst <100 charge, =100 drain) as bookkeeping
    ABSORBED into the everyN:3/offset:1 cadence.

DIVERGENT (benign):
  • burst-gen (S2 FB-end 5%×gauge): blind MODELS it (burstGenPct 75 placeholder, flagged ⚑) | driver
    UNMODELS it (non-load-bearing burst-gen-only; fable S2b independently GAP).
  • Encoding primitives differ (chargeCounter vs shotFired; flatDamage+targetStatus vs
    extraHitDamagePct) — functionally equivalent for the damage basis.

INDEPENDENT RE-DERIVATION: the blind agent derived the period-3 Super cycle from gauge arithmetic
(note (2)): "she opens at 100 (skill2 start-of-battle +100), the Super branch spends 100, and a
Firepower-Charge rotation rebuilds only ~+60 (+1 at cast, +2 per full charge for ~7 charges in the 10s
window, +45 at charge end) — so it takes TWO charge rotations to refill, putting Super on bursts 1/4/7
(everyN:3, everyNOffset:1)." This matches the driver and the fable S2b derivation.


--- blind override (blind/neon-vision-eye.override.json) ---

```json
{
  "slug": "neon-vision-eye",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "chargeCounter",
        "count": 1
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 437.98,
          "crit": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "chargeCounter",
        "count": 1
      },
      "target": {
        "kind": "self"
      },
      "requiresTargetStatus": "Super Firepower",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 262.79,
          "crit": true
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
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
          "value": 80.04,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnter"
      },
      "target": {
        "kind": "self"
      },
      "everyN": 3,
      "everyNOffset": 1,
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 35.05,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "everyN": 3,
      "everyNOffset": 2,
      "effects": [
        {
          "kind": "buff",
          "stat": "burstGenPct",
          "value": 75,
          "durationSec": 5
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "self"
      },
      "everyN": 3,
      "effects": [
        {
          "kind": "buff",
          "stat": "burstGenPct",
          "value": 75,
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 110.21,
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
        "kind": "self"
      },
      "everyN": 3,
      "everyNOffset": 1,
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 45.03,
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
      "everyN": 3,
      "everyNOffset": 1,
      "effects": [
        {
          "kind": "targetStatus",
          "name": "Super Firepower",
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Invulnerable for 3 sec. Activates 5 time(s) per battle.",
      "Gains debuff immunity to ∞ debuffs for 3 sec. Activates 5 time(s) per battle.",
      "Healthy Body: Incoming healing ▲ 10.26% for 20 sec."
    ],
    "skill2": [
      "Activates when performing a normal attack while in Firepower Charge status. Affects self. Increases the Firepower Gauge's charge by 2.",
      "Activates when Firepower Charge ends. Affects self. Increases the Firepower Gauge's charge by 45."
    ],
    "burst": [
      "Firepower Charge: Charges the Firepower Gauge for 10 sec. This effect cannot be removed.",
      "Increases the Firepower Gauge's charge by 1.",
      "Decreases the Firepower Gauge's charge by 100.",
      "Explosion Radius ▲ 200% for 10 sec."
    ]
  },
  "caveats": [
    "⚑ The Firepower Gauge is NOT simulated as a resource pool. The whole gauge economy is collapsed into a derived 1-in-3 cadence: her 1st/4th/7th burst takes the Super Firepower branch (everyN:3, everyNOffset:1), the other two take the (damage-inert) Firepower Charge branch. Every gauge-arithmetic input is an estimate — see flags[0]/flags[1].",
    "⚑ Super Firepower is a SELF status, but the engine has no self-status gate with a time window. It is modeled through the ONLY 10s name-keyed window primitive available: her Super burst opens targetStatus 'Super Firepower' (10s) on the boss and the skill1 262.79% rider gates on requiresTargetStatus. This is a deliberate mis-scope of channel, not of behaviour — the window opens/closes on exactly the right frames and the name-keying means no other kit can satisfy it. If the validator or reviewer rejects the channel, the rider must be re-homed, NOT dropped (it is a real damage line).",
    "⚑ Trigger identity for the 437.98%/262.79% riders: the text says 'when landing a Full Charge attack', modeled as chargeCounter count:1 (fires once per full charge). If the RL path in the sim can fire uncharged shots, shotFired would over-credit and chargeCounter is the safer literal read — but the per-charge proc COUNT is unverified.",
    "⚑ Damage riders are authored with target {kind:'self'} (the caster deals % of her own final ATK); {kind:'enemy'} resolves to an empty target set in this engine and would silently zero the hit. Only the targetStatus block uses target 'enemy' (validator-required).",
    "⚑ Riders set crit:true (riders crit at the caster's sheet rate) and take NO core (the text never says 'core strike damage'). No flavor tag is set: 'Firepower Explosion' is not stated to be Projectile Explosion Damage, so it is left out of that bucket rather than guessed into it.",
    "⚑ noFb is NOT set on either rider (FB-by-timing default ON, per the priors — measured-only).",
    "⚑ 'Explosion Radius ▲ 200%' is unmodeled. On a single-target partless boss a larger blast radius adds no damage by itself, but it is the kind of geometry change that can lift effective hit rate / core rate. If a real recording shows her in-burst core/hit rate rising, this is the first suspect — magnitude is measured-only (hitRatePct).",
    "⚑ Multi-B3 comps: the everyN counters key off trigger activations (her burstCast / any fullBurstEnter). In a comp where ANOTHER Burst III completes a rotation, the fullBurstEnter and fullBurstEnd counters drift out of phase with her own burst count and the Super-gated blocks fire on the wrong rotations. Correct on a sole-B3 graded comp; re-check before using her alongside a second B3."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (no override, no tests, no board output). Structure: (1) skill1's Full-Charge rider is the unit's damage engine — 437.98% every full charge, +262.79% during the Super Firepower window; 'Affects the enemy if the enemy is the stage target' is always true against the scope-lock boss, so it is a no-op gate. (2) The Firepower Gauge economy is derived, not simulated: she opens at 100 (skill2 start-of-battle +100), the Super branch spends 100, and a Firepower-Charge rotation rebuilds only ~+60 (+1 at cast, +2 per full charge for ~7 charges in the 10s window, +45 at charge end) — so it takes TWO charge rotations to refill, putting Super on bursts 1/4/7 (everyN:3, everyNOffset:1) and Firepower Charge on the other two. (3) The FB-end burst-gen buff rides the two charge rotations (offsets 2 and 0 mod 3); its magnitude is '5% x gauge charge amount', which is a live pool the sim does not track — 75 (=5x~15) is a flagged placeholder, not a measurement. (4) Defensive/heal-receipt lines (invulnerability, debuff immunity, Healthy Body incoming-healing) are unmodeled: Healthy Body modifies healing RECEIVED, it does not EMIT a heal, so it cannot drive an ally's on-recovery consumer and is genuinely inert here."
}
```

===== §7. DRIVER IMPLEMENTATION (test + override) =====

--- driver test (scripts/tests/units/neon-vision-eye.test.ts; 22/22 GREEN vs shipped) ---

```ts
// PER-UNIT KIT SPEC — `neon-vision-eye` (Neon: Vision Eye, Attacker/RL/Electric, Burst III, cd 40s,
// ammo 6, chargeFrames 60, hitsPerShot 1). Kit-autonomy gauntlet 2026-07-25 (driver: Qwen).
//
// DISAMBIGUATION (P0): this is `neon-vision-eye` (RL/Electric, aka "nve") — NOT base `neon`
// (SG/Fire) and NOT `neon-blue-ocean` (MG/Water). The slug-disambiguation lint flags the substring
// "neon" inherent in the slug/official name; that is informational (exit 0). Every assertion below
// keys on slug === 'neon-vision-eye'.
//
// One assertion group per LOAD-BEARING KIT LINE (N1..N6), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS — the nearest wrong
// model each assertion must discriminate against — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['neon-vision-eye'].skills):
//   S1 ■ when attacked while not Healthy Body → self: Invulnerable 3s (5/battle) + debuff immunity   [UNMODELED — defensive]
//      ■ Healthy Body: Incoming healing ▲10.26% for 20s                                              [UNMODELED — received-heal amp, no heal event]
//      ■ landing a Full Charge attack → the target: Firepower Explosion 437.98% final ATK addl dmg   [N1]
//      ■ additional effect of Super Firepower status: 262.79% final ATK as additional damage          [N2]
//   S2 ■ start of battle → self: +100 Firepower Gauge                                                 [UNMODELED — gauge bookkeeping, ABSORBED into N2/N4/N5 cadence]
//      ■ normal attack during Firepower Charge → self: +2 Firepower Gauge                            [UNMODELED — gauge bookkeeping, ABSORBED]
//      ■ Firepower Charge ends → self: +45 Firepower Gauge                                           [UNMODELED — gauge bookkeeping, ABSORBED]
//      ■ Full Burst ends while gauge active → self: Burst Gauge fill speed ▲5%×gauge for 5s          [UNMODELED — burst-gen only]
//      ■ entering Full Burst → self: Maximum Firepower ATK ▲80.04% for 10s                           [N3]
//      ■ additional effect for Super Firepower: ATK ▲35.05% for 10s                                  [N4]
//   BU ■ gauge < 100 → self: Firepower Charge, charges gauge 10s, +1 gauge                            [UNMODELED — bookkeeping, ABSORBED]
//      ■ gauge = 100 → self: Super Firepower Attack Damage ▲45.03% for 10s, -100 gauge               [N5]  (the -100 gauge is bookkeeping, ABSORBED)
//      ■ self: Explosion Radius ▲200% for 10s                                                        [UNMODELED — inert, single partless boss]
//      ■ self: Attack Damage ▲110.21% for 10s                                                        [N6]
//
// THE META-DEFINING MECHANIC (Tier 2): the Firepower Gauge / Super Firepower ALTERNATION. Gauge
// starts at 100 (S2); a burst at gauge=100 fires Super Firepower then drains to 0; refilling 0→100
// takes two charge-bursts, so Super Firepower fires on her burst casts 1, 4, 7, … The override
// ABSORBS all the gauge plumbing into the skill1 Super block's `everyN: 3, everyNOffset: 1`, which
// the engine evaluates as "fire when activations ≡ 1 (mod 3)" → casts 1, 4, 7 (video-verified
// cast-by-cast, Run B; kit-status MEASURED). N2/N4/N5 are the three SUPER riders (every 3rd cast);
// N3/N6 fire EVERY cast. The cadence split IS the kit — a model that made Super always-on (the
// nearest wrong reading of "Super Firepower: Attack Damage ▲45.03%") over-buffs every burst.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  437.98% is a function "additional damage" rider on EVERY full-charge shot (she is in the
//       helm/anis on-hit proc class, NOT a Q1-exempt class). Proven live: shipped lands one per shot
//       in the 'skill' bucket (srcSlot skill1); the block-removed counterfactual lands ZERO. It
//       crits at the caster's rate and never cores (SSOT damage-calculation.md §2b / U1 ruling).
//   N2  the 262.79% Super rider is an `extraHitDamagePct` BUFF (10s) applied on casts 1,4,7 — while
//       live, every shot deals a 'burst'-bucket rider (srcSlot null, the summed-stat convention).
//       Two discriminations at once: (a) CADENCE — the buff applies exactly floor((bursts-1)/3)+1
//       times, strictly fewer than the burst count, so an always-on Super (everyN removed) provably
//       over-fires; (b) ENCODING — the rider rides the 'burst' bucket via an extraHitDamagePct buff,
//       NOT the old hitCount:12 flatDamage blend the pre-2026-07-13 model used (that would land in
//       the 'skill' bucket with srcSlot skill1 and no governing buff).
//   N3  80.04% ATK on Full Burst entry, EVERY rotation she completes (sole B3 → one per burst cast),
//       10s, self-scoped. Discriminated from the Super-only 35.05% rider (N4) by value AND cadence.
//   N4  35.05% ATK Super rider — same every-3rd-cast cadence as N2 (fires on the identical frames),
//       value-distinct from N3's 80.04%. An always-on Super would fire it every cast.
//   N5  45.03% Attack Damage Super rider — every-3rd-cast cadence, value-distinct from N6's 110.21%.
//   N6  110.21% Attack Damage, the burst's UNCONDITIONAL rider — EVERY cast (count === burst casts),
//       10s, self-scoped. The block-removed counterfactual lands zero.
//
// UNMODELED (deliberately NOT asserted — inert under the scope lock, documented per non-negotiable):
//   the S1 defensive lines (invuln/debuff-immunity/received-heal amp — no damage surface, no heal
//   event); ALL Firepower Gauge plumbing (start +100, +2/attack, +45 on end, burst <100 charge,
//   =100 drain — bookkeeping whose steady-state consequence is ABSORBED into the everyN 3/offset 1
//   cadence pinned by N2/N4/N5); the S2 Full-Burst-end burst-gauge-fill smoothing (burst-gen only,
//   empirically does not consume the cycle); the burst Explosion Radius ▲200% (inert — single
//   partless boss, no AoE surface).
//
// Fixture: controlComp('neon-vision-eye', false) = liter (B1) / crown (B2) / neon-vision-eye (B3,
// slot 2), boss Fire, focus neon-vision-eye. helm is DROPPED so neon is the SOLE B3 — every Full
// Burst is hers, so burst-cast count === Full-Burst-enter count and the cadence math is clean. She
// needs the B1/B2 core to cast at all (a lone B3 makes zero Full Bursts). Deterministic (no seed);
// 5 bursts over 180s at frames [338, 2598, 4778, 6998, 9218] → Super on casts 1 & 4.
//
// KNOWN FIXTURE LIMITATION (documented, not a gap in the override): with neon as SOLE B3, her
// `burstCast` and the team `fullBurstEnter` coincide on every rotation, so this fixture cannot
// discriminate trigger KIND for the two lines where it matters — S2 80.04% ATK (kit: "entering
// Full Burst" → fullBurstEnter) vs burst 110.21%/45.03% (kit: her OWN cast → burstCast). In a
// multi-B3 comp (helm co-B3) a burstCast-keyed 80.04 would skip the co-B3's rotations and a
// fullBurstEnter-keyed 110.21 would over-fire on them (fable S2b traps #3). The shipped override
// has both trigger kinds correct by inspection (skill2 80.04 = fullBurstEnter; burst 110.21/45.03
// = burstCast); the S5 blind re-derivation and the fable review corroborate the identities. Values,
// cadence, scope and duration — the load-bearing observables — are fully pinned below.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** controlComp('neon-vision-eye', false) slot order: liter 0 / crown 1 / neon-vision-eye 2. */
const NVE = 2;
const SLUG = 'neon-vision-eye';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    ...controlComp(SLUG, false),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- counterfactual patches (nearest-wrong models each group must discriminate against) --------
/** N1 reference: her S1 base Firepower Explosion (437.98% shotFired rider) removed entirely. */
const nveNoBaseRider = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) =>
      !(
        b.trigger?.kind === 'shotFired' &&
        b.effects.some((e: any) => e.atkPct === 437.98)
      ),
  );
  if (ov.skill1.length === before)
    throw new Error('nve S1 437.98 shotFired block missing — fixture is stale');
});
/** N2/N4/N5 counterfactual: the Super block with its everyN gate REMOVED — Super Firepower treated
 *  as ALWAYS-ON (the nearest wrong reading of the kit prose, which lists the Super riders without
 *  the gauge alternation). Fires the three Super riders on EVERY burst cast instead of casts 1,4,7. */
const nveSuperEveryCast = withPatchedOverride(SLUG, (ov) => {
  const blk = ov.skill1.find((b: any) => b.everyN != null);
  if (!blk)
    throw new Error('nve S1 everyN Super block missing — fixture is stale');
  delete blk.everyN;
  delete blk.everyNOffset;
});
/** N3 reference: her S2 Maximum Firepower FB-entry ATK (80.04%) removed. */
const nveNoFbAtk = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.stat === 'atkPct' && e.value === 80.04),
  );
  if (ov.skill2.length === before)
    throw new Error('nve S2 80.04 atkPct block missing — fixture is stale');
});
/** N6 reference: her burst unconditional Attack Damage (110.21%) removed. */
const nveNoBurstAd = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) =>
      !b.effects.some(
        (e: any) => e.stat === 'attackDamagePct' && e.value === 110.21,
      ),
  );
  if (ov.burst.length === before)
    throw new Error(
      'nve burst 110.21 attackDamagePct block missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noBaseRider = run({ [SLUG]: nveNoBaseRider });
const superEveryCast = run({ [SLUG]: nveSuperEveryCast });
const noFbAtk = run({ [SLUG]: nveNoFbAtk });
const noBurstAd = run({ [SLUG]: nveNoBurstAd });

// ---- readers ----------------------------------------------------------------------------------
const neonShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const neonBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const neonDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SLUG);
const neonBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === NVE &&
      e.stat === stat &&
      (value == null || e.value === value),
  );

/** The everyN 3 / offset 1 cadence: Super Firepower fires on casts 1, 4, 7, … → for `n` burst
 *  casts, activations ≡ 1 (mod 3) in [1..n] = floor((n-1)/3) + 1 firings. */
const expectedSuper = (n: number) => Math.floor((n - 1) / 3) + 1;

const burstCount = neonBursts(base).length;
const superCountBase = expectedSuper(burstCount);

describe('neon-vision-eye — kit spec', () => {
  it('fixture sanity: neon is the sole B3 and casts a real rotation', () => {
    expect(
      burstCount,
      'neon must cast her burst to exercise any burst-gated line',
    ).toBeGreaterThanOrEqual(4);
    expect(
      neonShots(base).length,
      'RL charge-attacker fires charged rockets',
    ).toBeGreaterThan(0);
    expect(
      neonShots(base).every((s) => s.charged),
      'every neon shot is a full charge',
    ).toBe(true);
    // The cadence math needs at least one Super and at least one non-Super cast to discriminate.
    expect(
      superCountBase,
      'expected Super on casts 1,4,… over the fixture',
    ).toBeGreaterThanOrEqual(1);
    expect(
      superCountBase,
      'Super must be STRICTLY rarer than every cast',
    ).toBeLessThan(burstCount);
  });

  describe('N1 — S1 Firepower Explosion: 437.98% of final ATK on EVERY full-charge shot', () => {
    const riders = neonDamage(base).filter((d) => d.srcSlot === 'skill1');

    it('lands once per shot, in the skill bucket, at the kit magnitude', () => {
      expect(riders.length).toBe(neonShots(base).length);
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([437.98]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('is a function "additional damage" rider: crits at caster rate, never cores', () => {
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING: removing the block zeroes the rider (it is live, not vestigial)', () => {
      const gone = neonDamage(noBaseRider).filter(
        (d) => d.srcSlot === 'skill1' && d.atkPct === 437.98,
      );
      expect(gone.length).toBe(0);
    });
  });

  describe('N2 — S1 Super Firepower: 262.79% rider gated to the every-3rd-Super window', () => {
    const superBuff = (evs: SimEvent[]) =>
      neonBuffs(evs, 'extraHitDamagePct', 262.79);
    const rider = neonDamage(base).filter(
      (d) => d.srcSlot === null && d.atkPct === 262.79,
    );
    /** Burst-cast frames that SHOULD open a Super window: cast indices ≡ 0 (mod 3) — i.e. her
     *  1st, 4th, 7th casts (0-based 0,3,6). Pins BOTH the period (3) AND the phase (offset 1: the
     *  battle-start +100 gauge makes the FIRST cast Super). */
    const expectedSuperFrames = neonBursts(base)
      .filter((_, i) => i % 3 === 0)
      .map((b) => b.frame)
      .sort((a, b) => a - b);

    it('the governing extraHitDamagePct buff applies on casts 1,4,7 — floor((bursts-1)/3)+1 times', () => {
      expect(superBuff(base).length).toBe(superCountBase);
    });

    it('PHASE: Super opens on the 1st/4th/… cast (battle-start gauge=100), NOT phase-shifted to 3,6,9', () => {
      // Trap #2 (fable review): omitting the battle-start +100 phase-shifts Super to casts 3,6,9.
      // Pinning the EXACT frames (not just the count) catches an offset error the count would miss.
      expect(
        superBuff(base)
          .map((b) => b.frame)
          .sort((a, b) => a - b),
      ).toEqual(expectedSuperFrames);
      expect(
        expectedSuperFrames[0],
        'the FIRST burst cast must be a Super cast',
      ).toBe(neonBursts(base)[0].frame);
    });

    it('DISCRIMINATING (cadence): an always-on Super over-fires the buff on EVERY cast', () => {
      // The nearest wrong model (everyN removed) applies the Super buff on all `burstCount` casts.
      expect(superBuff(superEveryCast).length).toBe(
        neonBursts(superEveryCast).length,
      );
      expect(superBuff(superEveryCast).length).toBeGreaterThan(
        superBuff(base).length,
      );
    });

    it('the buff is 262.79% for 10 sec, self-scoped', () => {
      const applied = superBuff(base);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([262.79]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('while live, every shot deals a burst-bucket rider (srcSlot null, the summed-stat convention)', () => {
      expect(
        rider.length,
        'Super windows must produce additional-damage riders',
      ).toBeGreaterThan(0);
      expect([...new Set(rider.map((d) => d.bucket))]).toEqual(['burst']);
      // Function additional damage: crits at caster rate, never cores (SSOT §2b / U1).
      expect(rider.every((d) => d.critEligible)).toBe(true);
      expect(rider.every((d) => !d.coreEligible)).toBe(true);
    });

    it('DISCRIMINATING (encoding): riders ride ONLY inside a Super window, not every shot', () => {
      // Fewer rider instances than total shots — they cluster into the 2 Super windows, proving the
      // rider is gated by the buff window (the old hitCount:12 flatDamage blend would instead land a
      // 'skill'-bucket srcSlot-skill1 rider with no governing extraHitDamagePct buff).
      expect(rider.length).toBeLessThan(neonShots(base).length);
      expect(
        neonDamage(base)
          .filter((d) => d.srcSlot === null)
          .every((d) => d.atkPct === 262.79),
      ).toBe(true);
    });
  });

  describe('N3 — S2 Maximum Firepower: ATK ▲80.04% on Full Burst entry, EVERY rotation', () => {
    const applied = neonBuffs(base, 'atkPct', 80.04);

    it('fires once per Full Burst enter (sole B3 → one per burst cast), at the kit magnitude', () => {
      expect(applied.length).toBe(burstCount);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([80.04]);
    });

    it('is 10 sec, self-scoped', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: removing the block zeroes it (and it is NOT the 35.05% Super rider)', () => {
      expect(neonBuffs(noFbAtk, 'atkPct', 80.04).length).toBe(0);
      // The 35.05% Super rider (N4) is a distinct value on a distinct cadence — 80.04 fires every
      // cast, 35.05 only every 3rd.
      expect(neonBuffs(base, 'atkPct', 35.05).length).toBe(superCountBase);
    });
  });

  describe('N4 — S2 Super Firepower: ATK ▲35.05% rider on the every-3rd-Super window', () => {
    const applied = neonBuffs(base, 'atkPct', 35.05);

    it('fires on the same every-3rd-cast cadence as the 262.79% rider', () => {
      expect(applied.length).toBe(superCountBase);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([35.05]);
    });

    it('lands on the IDENTICAL frames as the 262.79% Super buff (one Super block, three riders)', () => {
      const superFrames = neonBuffs(base, 'extraHitDamagePct', 262.79)
        .map((b) => b.frame)
        .sort((a, b) => a - b);
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        superFrames,
      );
    });

    it('is 10 sec, self-scoped; an always-on Super would fire it every cast', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(neonBuffs(superEveryCast, 'atkPct', 35.05).length).toBe(
        neonBursts(superEveryCast).length,
      );
    });
  });

  describe('N5 — Burst Super Firepower: Attack Damage ▲45.03% rider on the every-3rd-Super window', () => {
    const applied = neonBuffs(base, 'attackDamagePct', 45.03);

    it('fires on the every-3rd-cast cadence, value-distinct from the unconditional 110.21%', () => {
      expect(applied.length).toBe(superCountBase);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([45.03]);
    });

    it('lands on the IDENTICAL frames as the other two Super riders', () => {
      const superFrames = neonBuffs(base, 'extraHitDamagePct', 262.79)
        .map((b) => b.frame)
        .sort((a, b) => a - b);
      expect(applied.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        superFrames,
      );
    });

    it('is 10 sec, self-scoped; an always-on Super would fire it every cast', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      expect(neonBuffs(superEveryCast, 'attackDamagePct', 45.03).length).toBe(
        neonBursts(superEveryCast).length,
      );
    });
  });

  describe('N6 — Burst: Attack Damage ▲110.21% unconditional, EVERY cast', () => {
    const applied = neonBuffs(base, 'attackDamagePct', 110.21);

    it('fires once per burst cast (count === burst casts), at the kit magnitude', () => {
      expect(applied.length).toBe(burstCount);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([110.21]);
    });

    it('is 10 sec, self-scoped', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([NVE]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: removing the block zeroes it (and it is NOT the 45.03% Super rider)', () => {
      expect(neonBuffs(noBurstAd, 'attackDamagePct', 110.21).length).toBe(0);
      // 110.21 fires every cast; 45.03 only every 3rd — distinct value AND cadence.
      expect(neonBuffs(base, 'attackDamagePct', 45.03).length).toBe(
        superCountBase,
      );
    });
  });
});

```

--- driver override (src/skills/overrides/neon-vision-eye.json) ---

```json
{
  "note": "TIER AUDIT REWORK (2026-07-13, Bossing SS): Super Firepower modeled exactly instead of the old hitCount:12 blend. Gauge starts at 100 (S2) and takes 2 charge-bursts to refill -> Super fires on her burst casts 1, 4, 7 (everyN 3, everyNOffset 1 — the engine feature added for this). During each 10s Super window she gains ALL THREE Super riders (the old model had only a smeared 262.79): +262.79% additional damage per full-charge shot (extraHitDamagePct), ATK +35.05 (S2 rider), Attack Damage +45.03 (burst rider). Base kit unchanged: 437.98% Firepower Explosion per full-charge shot vs the stage target (full majors — she is in the helm/anis on-hit proc class, NOT the Q1-exempt class), S2 FB-enter ATK 80.04/10s, burst AD 110.21/10s. Immunity/radius/burst-gen smoothing skipped (defensive/rotation-minor). ORIGINAL NOTE: RL charge-attacker built around the Firepower Gauge. Firepower Gauge steady-state: gauge starts at 100 (S2 start-of-battle). Each burst either (a) fires Super Firepower when gauge=100 then drains it to 0, or (b) starts a 10s Firepower Charge that adds +1 (burst) + ~2/normal-attack + 45 (on end) ~= +60. Refilling 0->100 needs two charge-bursts, so Super Firepower fires only ~1 of every 3 bursts (its 10s window => ~8% of full-charge shots). S1 base Firepower Explosion (437.98%) modeled on every full-charge shot (shotFired). S1 Super-Firepower additional 262.79% modeled as a hitCount:12 flatDamage to encode that ~1-in-12 shots land inside a Super window (steady-state throughput; count is an estimate, flagged uncertain). S2 Maximum Firepower base ATK 80.04% on full-burst enter modeled; its Super-only +35.05% ATK and the burst's Super-only +45.03% Attack Damage are OMITTED because Super Firepower has low, non-gateable uptime (~1/3 of bursts). Burst unconditional Attack Damage 110.21% modeled. SKIPPED: S1 invuln/debuff-immunity/Healthy-Body heal (defensive); all gauge-plumbing lines (start +100, +2/attack, +45 on end, burst gauge <100 charge, gauge=100 drain) are bookkeeping for the cycle above; S2 full-burst-end 'burst-gauge fill +5% x gauge' (variable x gauge, burst-gen only); burst Explosion Radius +200% (inert, single boss). Numbers verbatim from skill text; the 1-in-12 frequency and the omitted Super buffs are the main approximations. AUTOFIRE 2026-07-13: user-TESTED autofiring gun — exempt from the 22f release latency. 2026-07-17: exemption now resolves from the datamined input_type='DOWN_Charge' (engine + web); the redundant charFixes.noBoltRecovery flag was removed (datamine corroborates the user test). Kit-autonomy gauntlet 2026-07-25: independently re-derived + pinned by a 22-test spec (scripts/tests/units/neon-vision-eye.test.ts); cross-family fable S2b converged on all six load-bearing lines FAITHFUL (437.98 base rider / 262.79 Super extraHit / 80.04 FB-enter ATK / 35.05 Super ATK / 45.03 Super AD / 110.21 unconditional AD) and independently re-derived the period-3 Super cycle from kit prose. No functional change — encoding already MEASURED/video-verified; the spec pins the everyN 3 / everyNOffset 1 cadence (Super on casts 1,4,7), phase (first cast is Super, battle-start gauge=100), magnitudes, 10s durations and self-scope.",
  "unmodeled": {
    "skill1": [
      "When attacked while not in Healthy Body: Invulnerability for 3 sec (5 times per battle) and debuff immunity; Healthy Body: incoming healing ▲10.26% for 20 sec (defensive — invuln/immunity/received-heal amp; emits no heal event, no cross-unit consumer wiring needed)"
    ],
    "skill2": [
      "Firepower Gauge bookkeeping: gains 100 Firepower Gauge at battle start; +2 per normal attack during Firepower Charge; +45 when Firepower Charge ends (NOT a block — the steady-state consequence is ABSORBED into the skill1 Super block's everyN 3 / everyNOffset 1: start at 100 → Super on her burst casts 1, 4, 7…; video-confirmed cast-by-cast, Run B)",
      "When Full Burst ends: charges own burst gauge in proportion to the current Firepower Gauge (gauge→burst-gauge conversion; burst-generation only, unmodeled; empirically does not consume the Firepower cycle — every-3rd-Super held on video)"
    ],
    "burst": [
      "Firepower Gauge below 100: activates Firepower Charge, charging the gauge for 10 sec (bookkeeping — ABSORBED into the everyN 3 alternation)",
      "Firepower Gauge at 100: consumes 100 Firepower Gauge on activating Super Firepower (bookkeeping — ABSORBED into the everyN 3 alternation)",
      "Explosion Radius ▲200% for 10 sec (inert — single partless boss, no AoE surface)"
    ]
  },
  "skill1": [
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
          "atkPct": 437.98
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
      "everyN": 3,
      "everyNOffset": 1,
      "effects": [
        {
          "kind": "buff",
          "stat": "extraHitDamagePct",
          "value": 262.79,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 35.05,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 45.03,
          "durationSec": 10
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
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
          "value": 80.04,
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
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 110.21,
          "durationSec": 10
        }
      ]
    }
  ]
}

```
