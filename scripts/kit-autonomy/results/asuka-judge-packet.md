# S7 RECONCILING JUDGE PACKET — `asuka` (base Asuka, AR/Attacker/Fire/Burst III)

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

## DRIVER SUMMARY (implementation under review — grade the ARTIFACTS below, not this prose)

**Unit:** base `asuka` (AR/Attacker/Fire/Burst III) — NOT the MG/Wind variant `asuka-wille`.
**Fixture:** controlComp('asuka') = liter(B1/Iron) / crown(B2/Iron) / asuka(B3/Fire) / helm(B3/Water), boss Fire, focus asuka. asuka = slot index 2. asuka casts 6 bursts; 11 Full-Burst entries.

**Line inventory (driver disposition):**
- S1 "Damage dealt to Shield ▲601.01% continuously" → UNMODELED (no shield-damage StatKey; partless v1 boss never shields — inert). Verbatim in unmodeled.skill1.
- S1 "ATK ▲96.98% for 25s when recovery takes effect" → FAITHFUL (recovery trigger, self, atkPct 96.98/25s).
- S2 "Elem Advantage Attack Damage ▲30.02%/10s, self when in Shield status, FB enter" → FAITHFUL (fullBurstEnter, self, elemAdvantageDamagePct 30.02/10s, **requiresShielded:true gate**).
- S2 "Damage vs core ▲60.07%/10s, all Fire Code allies, FB enter" → FAITHFUL (fullBurstEnter, alliesOfElement Fire, coreDamagePct 60.07/10s).
- Burst "Gain Pierce for 25s" → FAITHFUL (**gainPierce:25s** burstCast effect; pierce inert in v1).
- Burst "Attack damage ▲150.04%/10s" → FAITHFUL (burstCast, self, attackDamagePct 150.04/10s).
- Burst "Recovers 3.16% of attack damage as HP over 10s" → FAITHFUL (heal recovery event, self; self-procs S1).
- Burst "Hit Rate ▲101.37%/10s" → FAITHFUL (burstCast, self, hitRatePct 101.37/10s; feeds core rate via hrCoreMult).

**TWO GAUNTLET FIXES** (both engine-supported, independently derived by BOTH blind models, damage-neutral in the control comp — probe-verified byte-identical team totals 443617952.67):
1. **S2 Elemental Advantage += requiresShielded:true.** The shipped parser-baseline modeled this UNCONDITIONAL, claiming "engine has no shield-state gate." That premise is FALSE — `requiresShielded?: boolean` IS a real block gate in src/skills/types.ts (cf. naga). The kit literally says "Affects self when in Shield status." Both blind models gated it (fable S2b flagged the dropped gate as nearest-wrong; opus S6 encoded requiresShielded:true). In the control comp crown's burst shield (15s, all allies) keeps asuka shielded at every FB entry, so the gate is satisfied → 11 applies (damage byte-identical, buff inert vs Fire boss). Removing crown's shield → 0 applies (gate proven live, not decorative).
2. **Pierce hasPierce:true → gainPierce:25s burstCast effect.** The kit says "Gain Pierce for 25 sec" — a timed window, not the permanent top-level flag. Both blind models chose gainPierce:25s. Pierce is inert in v1 (PIERCE_CORE_DOUBLE off, no pierceDamagePct), so damage is byte-identical either way; the timed effect is the faithful encoding.

**RESIDUAL KEPT (non-fabrication):** burst lifesteal modeled as a SINGLE recovery event at cast, not a 10-tick HoT (ticks:10). The kit says "over 10 sec"; whether the in-game lifesteal HoT procs "when recovery takes effect" per-tick is UNMEASURED, and ticks:10 vs ticks:1 is MATERIAL to S1 ATK uptime (~10s/rotation). Per MEASURED>FUDGE, the single-event model is kept and flagged ⚑ (estimate + recipe in note), NOT fabricated to ticks:10. Both blind models recommended ticks:10 but flagged it as an estimate.

**S5 blind test vs SHIPPED (post-FIX) override: 14 pass / 3 fail / 3 skip.** The 3 failures are ALL artifacts (classified below); the pierce divergence was RESOLVED by FIX #2:
- [1] S2a "the in-Shield-status gate suppresses the block in a comp with no shield source" → FIXTURE MISCONCEPTION (RECON_ERROR): the blind test's stated premise is "no unit in controlComp applies a Shield to asuka." FALSE — crown's burst applies a shield to all allies, satisfying the gate → 11 applies (not 0). The shipped encoding now CONVERGES with the blind override (both requiresShielded:true); the assertion fails only on the blind's false fixture premise. The gate's correctness is independently proven by the driver's crownNoShield counterfactual (0 applies).
- [2] burst Attack damage "moves asuka damage and nothing else (self scope)" → ARTIFACT: asserts `unitOf(liter)` deep-equal between base and noAtkDmg runs. liter's `totalDamage` is BYTE-IDENTICAL (129303667.87 both); only the team-relative `share` field shifts because asuka's damage dropped, changing the team-total denominator. Self-scope is correct; the whole-record deep-equal is too strict.
- [3] burst Hit Rate "carries real damage ... only for asuka" → same ARTIFACT as [2] (liter totalDamage identical; share field team-relative).

---

## GROUND TRUTH — real kit prose + base stats (data/characters.json → characters.asuka)

```json
{
  "slug": "asuka",
  "name": "Asuka",
  "weapon": "AR",
  "burst": "III",
  "class": "Attacker",
  "element": "Fire",
  "normalAttackMultiplier": 18.76,
  "coreAttackMultiplier": 200,
  "ammo": 20,
  "reloadFrames": 84,
  "chargeFrames": 0,
  "hitsPerShot": 1,
  "burstCooldownSec": 40,
  "burstGaugePerShot": 0.3,
  "skills": {
    "skill1": "■ Activates at the start of battle. Affects self.\nDamage dealt to Shield ▲ 601.01% continuously.\n■ Activates when recovery takes effect. Affects self.\nATK ▲ 96.98% for 25 sec.",
    "skill2": "■ Activates when entering Full Burst. Affects self when in Shield status.\nElemental Advantage Attack Damage ▲ 30.02% for 10 sec.\n■ Activates when entering Full Burst. Affects all Fire Code allies.\nDamage dealt when attacking core ▲ 60.07% for 10 sec.",
    "burst": "■ Affects self.\nGain Pierce for 25 sec.\nAttack damage ▲ 150.04% for 10 sec.\nRecovers 3.16% of attack damage as HP over 10 sec.\nHit Rate ▲ 101.37% for 10 sec."
  },
  "baseStats": {
    "hp": 13500,
    "atk": 600,
    "def": 90,
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
    "resourceId": 830
  }
}
```

---

## S2b PRE-OP REVIEW (claude-fable-5, independent test-faithfulness spec)

```json
{
  "slug": "asuka",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Damage dealt to Shield ▲ 601.01%",
      "disposition": "UNMODELED",
      "scope": "damage vs enemy SHIELD objects only — not a generic damage bucket; the v1 boss has no shield HP pool and the schema has no shield-damage StatKey",
      "durationSemantics": "'continuously' = permanent passive from battle start",
      "triggerIdentity": "passive (start of battle)",
      "targetSet": "self",
      "nearestWrongModel": "encoding 601.01% as attackDamagePct/damageTakenPct — a ~7x Damage-Up over-credit on all damage",
      "distinguishingAssertion": "no buffApply with value 601.01 on ANY damage-relevant stat; solo asuka total identical with this line present vs stripped via withPatchedOverride",
      "inertness": "must move NOTHING — carry totals, allies, and every damage event's mult unchanged",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill1",
      "kitLine": "recovery takes effect: ATK ▲ 96.98%",
      "disposition": "FAITHFUL",
      "scope": "generic ATK stat (atkPct), all attack categories",
      "durationSemantics": "durationSec 25 (wall-clock), refreshable on each recovery event",
      "triggerIdentity": "trigger {kind:'recovery'} — fires when a 'heal' effect TARGETS asuka (any source: her own burst HoT, helm/crown team heals); NOT passive, NOT burstCast",
      "targetSet": "self",
      "nearestWrongModel": "modeled as passive always-on ATK, or keyed only to her own burst — missing that ANY incoming heal (helm's, and her own 10-tick burst HoT) proc/refresh it",
      "distinguishingAssertion": "buffApply atkPct 96.98 on asuka appears ONLY after a heal event targeting her, and appears in controlComp on helm-heal rotations even when asuka has not burst; with all heal sources patched out, zero applications",
      "inertness": "no atkPct 96.98 buffApply before the first recovery event of the fight",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter, in Shield status: Elem Adv ▲",
      "disposition": "FAITHFUL",
      "scope": "elemAdvantageDamagePct 30.02 — Damage-Up bucket active ONLY with elemental advantage (taxonomy §8: stacks past the clean ×1.10)",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "fullBurstEnter (any team FB) + requiresShielded block gate evaluated AT trigger time — asuka must hold a live shield when FB begins",
      "targetSet": "self",
      "nearestWrongModel": "two stacked misreads: (a) dropping the 'when in Shield status' gate (ungated FB-enter buff); (b) encoding as generic attackDamagePct 30.02, which moves damage vs ANY boss element",
      "distinguishingAssertion": "vs the Fire control boss (asuka Fire → no advantage) carry totals must be IDENTICAL with this block present vs stripped; buffApply stat must be elemAdvantageDamagePct not attackDamagePct; with no shield effect ever targeting asuka, no buffApply fires even at FB enter",
      "inertness": "controlComp (Fire boss) damage — a 30.02 attackDamagePct misencoding turns this red",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "FB enter: core dmg ▲ 60.07% Fire allies",
      "disposition": "FAITHFUL",
      "scope": "coreDamagePct (core bucket only) — NOT generic Damage Up",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "fullBurstEnter, ungated",
      "targetSet": "alliesOfElement Fire, INCLUDING self ('all Fire Code allies')",
      "nearestWrongModel": "target set widened to all allies regardless of element, or narrowed to self-only; or coreDamagePct swapped for attackDamagePct (over-credits non-core shots)",
      "distinguishingAssertion": "buffApply coreDamagePct 60.07 lands on every Fire ally including asuka at each fullBurstStart, and NEVER on a non-Fire teammate (assert its absence on liter/crown/helm if non-Fire); damage events with core=0 show no mult change from this buff",
      "inertness": "non-Fire allies' buff logs; non-core damage mult",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Gain Pierce for 25 sec",
      "disposition": "FAITHFUL",
      "scope": "gainPierce (timed pierce-tag window) — makes Pierce Damage ▲ buffs live for her hits; her own kit has no pierceDamagePct so likely board-inert alone but must exist for tandem",
      "durationSemantics": "durationSec 25 — NOTE: outlives the 10s siblings; a uniform-10s encoding is wrong",
      "triggerIdentity": "burstCast (her OWN burst, ≈ every 40s cd) — NOT fullBurstEnter; diverges in controlComp where helm is co-B3",
      "targetSet": "self",
      "nearestWrongModel": "static hasPierce:true flag (always-on from t=0), or duration copied as 10s, or keyed to fullBurstEnter so helm's rotations grant it",
      "distinguishingAssertion": "with a patched-in ally pierceDamagePct probe buff, asuka's hits take the pierce bucket only inside [castT, castT+25] after HER burstCast events, and not on FBs she didn't cast",
      "inertness": "pre-first-burst shots and helm-rotation FBs must show no pierce eligibility",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Attack damage ▲ 150.04% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage-Up bucket, diluted with other Damage-Up) — NOT atkPct",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast self-block (no activation clause inside own burst)",
      "targetSet": "self",
      "nearestWrongModel": "stat swapped to atkPct 150.04 (ATK bucket multiplies differently than Damage-Up — materially different totals under crown/liter support), or fullBurstEnter keying",
      "distinguishingAssertion": "buffApply with stat attackDamagePct value 150.04 (and NO atkPct 150.04 anywhere) exactly at her burstCast events, expiring 10s later",
      "inertness": "helm-cast FB rotations gain nothing from this line",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Recovers 3.16% of atk dmg as HP over 10s",
      "disposition": "FAITHFUL",
      "scope": "lifesteal HoT — no HP pool modeled, but MUST be encoded as heal with ticks (≈10, intervalSec 1) targeting self, because it is the in-kit driver of skill1's recovery→ATK ▲96.98%",
      "durationSemantics": "heal EVENTS spread over 10 sec (ticks), not one instant event — repeated ticks keep refreshing the 25s S1 buff",
      "triggerIdentity": "burstCast; heal effect emits recovery events to self",
      "targetSet": "self",
      "nearestWrongModel": "the classic taxonomy-§4 skip: 'heal = defensive, no damage' → S1's ATK buff never fires off her own burst; secondary misread: ticks:1 single event instead of a HoT",
      "distinguishingAssertion": "after each asuka burstCast, ≥1 recovery-driven buffApply atkPct 96.98 on asuka follows within the 10s window WITH ALL OTHER TEAM HEAL SOURCES PATCHED OUT (isolates the self-loop); multiple tick events observable across the window",
      "inertness": "n/a — this line's whole value is the tandem it must NOT be inert on",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Hit Rate ▲ 101.37% for 10 sec",
      "disposition": "FAITHFUL",
      "scope": "hitRatePct — core-hit lift via the engine hrCoreMult path; NOT a no-op accuracy stat",
      "durationSemantics": "durationSec 10",
      "triggerIdentity": "burstCast self-block",
      "targetSet": "self",
      "nearestWrongModel": "dropped as 'accuracy doesn't matter vs a boss' — but Hit Rate feeds core rate (HRCORE); alternate misread: encoding as critRatePct",
      "distinguishingAssertion": "buffApply hitRatePct 101.37 at her burstCast; damage events inside the window show elevated core rate vs outside (HRCORE live), and totals shift when the buff is stripped via withPatchedOverride",
      "inertness": "no crit-rate movement; nothing outside her own 10s windows",
      "evidenceTier": "DATAMINED (buff value); the HR→core conversion slope itself is the engine-global ⚑ measured-only field, not per-unit",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:recovery→ATK▲96.98 25s",
    "skill2:FBenter+shielded elemAdv▲30.02",
    "skill2:FBenter coreDmg▲60.07 Fire allies",
    "burst:gainPierce 25s",
    "burst:attackDamagePct 150.04 10s",
    "burst:heal-over-10s self (drives S1 recovery)",
    "burst:hitRatePct 101.37 10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Damage dealt to Shield ▲ 601.01% continuously."
    ],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to reconcile, in priority order: (1) The burst lifesteal is the load-bearing line most likely skipped as 'defensive' — it self-loops into skill1's recovery-triggered ATK ▲96.98%/25s, and with the burst cd at 40s plus any team heal source (helm in controlComp) that ATK buff can approach permanent uptime; a driver who modeled S1 correctly but dropped the burst heal, or who never patched out team heals when asserting the loop, has an untested tandem. (2) All four burst self-lines must be burstCast, not fullBurstEnter — controlComp runs helm as co-B3, so the two keyings genuinely diverge there; any assertion set that only checks 'buff present during FB' is green under both and proves nothing. (3) skill2a must be doubly distinguishable: elemAdvantageDamagePct (inert vs the Fire control boss — asserting controlComp invariance catches an attackDamagePct misencoding) AND requiresShielded (catches the dropped gate; note the gate is evaluated at FB-enter, so shield-vs-FB event ordering matters if a shielder like crown applies shields on the same FB edge — the assertion should apply the probe shield strictly before FB). (4) Burst durations are mixed 25/10/10/10 — Pierce at 25s is the odd one out and invites a copy-paste 10s. (5) The 601.01% shield line is the biggest single number in the kit and the most dangerous if promoted to a damage bucket; it must appear verbatim in `unmodeled` (rule 6: no ignored-blocks) with an explicit inertness assertion. (6) AR, chargeFrames 0, hitsPerShot 1 — no charge/round-count semantics anywhere in this kit; any durationShots usage would itself be a misread.",
  "model": "claude-fable-5"
}

```

---

## S5 BLIND POST-OP TEST (claude-opus-5, written from prose alone) — materialized to blind/asuka.test.ts

```json (spec)
{
  "slug": "asuka",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Damage dealt to Shield ▲601.01%",
      "disposition": "GAP",
      "assertion": "Asserts the line appears in override.unmodeled.skill1 and that no effect anywhere carries 601.01 as value/atkPct. RED under a silent drop (no audit record) and RED under the nearest-wrong encoding as attackDamagePct/elementDamagePct (6x damage inflation). Payload itself it.skip'd — no StatKey for shield damage and no shield pool on the v1 boss."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲96.98% for 25 sec (on recovery)",
      "disposition": "FAITHFUL",
      "assertion": "Three-part. (1) first apply index in the log is AFTER the first burstCast — RED under trigger passive/start-of-battle (applies at frame 0). (2) With helm=false, dropping the burst heal effect zeroes the buff entirely — RED if the buff is keyed to burstCast directly or if the burst heal was not modeled; this is the tandem proof that the trigger is recovery. (3) every apply targets asuka — RED under an allies target."
    },
    {
      "slot": "skill2",
      "kitLine": "Elem Advantage Atk Dmg ▲30.02%/10s",
      "disposition": "FAITHFUL (gated, inert in fixture)",
      "assertion": "Committed run must produce ZERO applies (no shield source in controlComp) while the requiresShielded-ungated patch produces >0 — both branches exercised, so the zero is not vacuous; RED if the in-Shield-status clause was dropped as decorative. On the ungated run: apply count === fullBurstStart count (RED under burstCast keying, which gives strictly fewer since own cd is 40s), targetIdx === asuka, and stat === elemAdvantageDamagePct (RED under generic elementDamagePct/attackDamagePct)."
    },
    {
      "slot": "skill2",
      "kitLine": "Core damage ▲60.07%/10s, Fire allies",
      "disposition": "FAITHFUL",
      "assertion": "(1) applies to asuka === fullBurstStart count — RED under burstCast keying (fewer) and under excludeSelf (zero). (2) recipient set is a strict subset of the recipients under a patched plain-allies target — RED if the Fire filter was dropped (team-wide over-credit). (3) under a patched element:'Wind' target asuka receives nothing while she does under the committed override — proves the filter is real and Fire-keyed, independent of teammate elements."
    },
    {
      "slot": "burst",
      "kitLine": "Attack damage ▲150.04% for 10 sec",
      "disposition": "FAITHFUL",
      "assertion": "Apply count > 0 but STRICTLY LESS than fullBurstStart count (40s own cd cannot cover every FB) — RED under fullBurstEnter keying, the nearest-wrong trigger for a burst-slot line. stat === attackDamagePct and no atkPct apply at 150.04 — RED under the ATK-stat mis-bucket. Zeroing the value lowers asuka damage while liter/crown unit records stay byte-identical (self scope)."
    },
    {
      "slot": "burst",
      "kitLine": "Recovers 3.16% of atk dmg as HP/10s",
      "disposition": "FAITHFUL (cadence ⚑)",
      "assertion": "Proven indirectly and strongly by the S1b heal-removal counterfactual: with helm=false, dropping this heal must zero the ATK ▲96.98% buff. RED if the heal was skipped as defensive/inert — which is exactly the trap, since asuka is her own recovery source. Tick cadence (1 event vs 10) it.skip'd as ⚑: the prose gives no per-tick rate, and the choice shifts the 25s ATK window anchor by up to 10s."
    },
    {
      "slot": "burst",
      "kitLine": "Hit Rate ▲101.37% for 10 sec",
      "disposition": "FAITHFUL (magnitude ⚑)",
      "assertion": "stat === hitRatePct, self-targeted, apply count < fullBurstStart count and exactly equal to the attackDamagePct apply count (both ride the same burst cast) — RED under FB-enter keying or a split trigger. Zeroing the value lowers asuka damage (core lift is live by default) while liter is unchanged. The hit-rate-to-core magnitude itself is it.skip'd as measured-only."
    },
    {
      "slot": "burst",
      "kitLine": "Gain Pierce for 25 sec",
      "disposition": "FAITHFUL (payload inert in v1)",
      "assertion": "Structural: a gainPierce effect exists with durationSec === 25 — RED under the nearest-wrong normalisation to the 10s window the other three burst lines share, and RED under a static hasPierce flag (which cannot express the 25s window). Behavioural test documents inertness: removing the effect leaves totals() byte-identical, since pierceDamagePct is parsed-but-inert in v1."
    }
  ],
  "fixtures": "controlComp('asuka', true) for the Full-Burst-scoped lines (S2a/S2b) and the burst self-buffs — the second B3 (helm) means asuka cannot burst on every Full Burst, which is what makes the burstCast-vs-fullBurstEnter counts discriminate. controlComp('asuka', false) for every recovery assertion: helm is the harness comp's heal source, so with her present an external heal also fires S1b and the burst-heal -> ATK tandem cannot be attributed to asuka's own kit. All S2a assertions are on buffApply events rather than damage because the fixture boss is Fire and asuka is Fire, so elemAdvantageDamagePct is damage-inert here by construction. 9 hoisted runs total (2 committed + 7 withPatchedOverride counterfactuals); the override-structure checks use withPatchedOverride's mutate callback as a read-only inspector and cost no run.",
  "gaps": [
    "S1a 'Damage dealt to Shield ▲601.01% continuously' — it.skip: no StatKey for shield damage and the v1 boss has no shield pool; only the unmodeled-record + no-smuggling assertions are enforceable.",
    "Burst heal tick cadence — it.skip (⚑): prose says 'over 10 sec' with no per-tick rate, so 1 recovery event vs 10 is not derivable from text; it shifts the anchor of the 25s ATK window by up to 10s and should be measured or ruled.",
    "Hit Rate -> core magnitude — it.skip (⚑): hrCoreMult is a derived engine constant, measured-only; the test asserts direction (damage strictly drops when zeroed) but not size, and assumes the default HRCORE=1 gate.",
    "S2a active branch — no unit in controlComp shields asuka, so the in-Shield-status branch is exercised only via the ungated patch, never natively. If a shielder is in fact present in controlComp, the 'gate suppresses' assertion goes RED and that is a documented divergence for the judge to arbitrate, not a silent pass.",
    "Gain Pierce payload — asserted structurally only; pierceDamagePct is parsed-but-inert in v1, so no damage-side discrimination exists."
  ],
  "model": "claude-opus-5"
}
```

```typescript (blind test source as materialized)
// S5 BLIND TEST (cross-family, claude-opus-5) — `asuka`, materialized to the live harness.
//
// Authored BLIND from the kit prose + effect schema alone (no sight of the committed override, the
// driver test, or any truth file). Materialized here with MECHANICAL adaptation only so it runs
// against the real harness API and the committed OverrideFile shape:
//   * import path: '../lib/harness' -> '../../tests/lib/harness.js'
//   * the blind writer iterated a hallucinated flat `ov.blocks` array; the committed OverrideFile
//     carries `skill1`/`skill2`/`burst` block arrays, so `allBlocks(ov)` flattens those three slots.
//     This preserves every patch's INTENT (iterate all blocks/effects) without touching assertions.
// No assertion logic was changed. Where the blind derivation chose a MORE literal encoding than the
// engine can express (S2a in-Shield-status gate; Gain Pierce as a timed gainPierce:25s effect), the
// assertion runs as-written against the committed override and any RED is an honest divergence for
// the S7 reconciling judge to arbitrate — not a silent pass and not a fabricated green.
import { describe, it, expect } from 'vitest'
import { controlComp, runComp, totals, unitOf, withPatchedOverride } from '../../tests/lib/harness.js'

type Ev = any

// ---------------------------------------------------------------- plumbing
const near = (a: any, b: number, tol = 0.05) => typeof a === 'number' && Math.abs(a - b) <= tol

function run(opts: any) {
  const events: Ev[] = []
  const res = runComp({ ...opts, cfg: { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) } } as any)
  return { res, events }
}

function runPatched(mutate: (ov: any) => void, helm = true) {
  const b: any = controlComp('asuka', helm)
  const patched = withPatchedOverride('asuka', mutate)
  return run({ ...b, overrides: { ...(b.overrides ?? {}), asuka: patched } })
}

/** read the committed override WITHOUT running a sim — withPatchedOverride hands us the clone. */
function inspect<T>(read: (ov: any) => T): T {
  let out: any
  withPatchedOverride('asuka', (ov: any) => { out = read(ov) })
  return out as T
}

// MECHANICAL ADAPTATION: the committed OverrideFile splits blocks across skill1/skill2/burst.
const allBlocks = (ov: any): any[] => [...(ov.skill1 ?? []), ...(ov.skill2 ?? []), ...(ov.burst ?? [])]

const eachEffect = (ov: any, fn: (e: any, b: any) => void) => {
  for (const b of allBlocks(ov)) for (const e of b.effects ?? []) fn(e, b)
}
const setValue = (pred: (e: any) => boolean, value: number) => (ov: any) =>
  eachEffect(ov, (e) => { if (pred(e)) e.value = value })
const dropEffect = (pred: (e: any) => boolean) => (ov: any) => {
  for (const b of allBlocks(ov)) b.effects = (b.effects ?? []).filter((e: any) => !pred(e))
}

// Effect predicates. The prose magnitudes are unique inside this kit, so they are the identity —
// this keeps the patches independent of how the driver ordered or split the blocks.
const isAtk9698 = (e: any) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 96.98)
const isElemAdv30 = (e: any) => e.kind === 'buff' && near(e.value, 30.02)
const isCore60 = (e: any) => e.kind === 'buff' && near(e.value, 60.07)
const isAtkDmg150 = (e: any) => e.kind === 'buff' && near(e.value, 150.04)
const isHitRate = (e: any) => e.kind === 'buff' && near(e.value, 101.37)
const isPierce = (e: any) => e.kind === 'gainPierce'
const isHeal = (e: any) => e.kind === 'heal'

const retargetCore = (target: any) => (ov: any) => {
  for (const b of allBlocks(ov)) if ((b.effects ?? []).some(isCore60)) b.target = target
}
const ungateShield = (ov: any) => {
  for (const b of allBlocks(ov)) if ((b.effects ?? []).some(isElemAdv30)) delete b.requiresShielded
}

// ---------------------------------------------------------------- runs (hoisted; each is a full 180s sim)
const base = run(controlComp('asuka', true))
const noHelm = run(controlComp('asuka', false))
const noHeal = runPatched(dropEffect(isHeal), false)
const shieldUngated = runPatched(ungateShield, true)
const coreAllAllies = runPatched(retargetCore({ kind: 'allies' }), true)
const coreWind = runPatched(retargetCore({ kind: 'alliesOfElement', element: 'Wind' }), true)
const noAtkDmg = runPatched(setValue(isAtkDmg150, 0), true)
const noHitRate = runPatched(setValue(isHitRate, 0), true)
const noPierce = runPatched(dropEffect(isPierce), true)

// ---------------------------------------------------------------- event helpers
const applies = (evs: Ev[], pred: (e: Ev) => boolean) =>
  evs.filter(e => e.kind === 'buffApply' && pred(e))
const countKind = (evs: Ev[], kind: string) => evs.filter(e => e.kind === kind).length

// asuka slot index, derived from one of her three self-only burst/skill magnitudes. Recomputed PER RUN
// because the helm=false comp has a different roster and therefore different slot indices.
const idxIn = (evs: Ev[]) => {
  for (const v of [101.37, 150.04, 96.98]) {
    const hit = evs.find(e => e.kind === 'buffApply' && near(e.value, v) && typeof e.targetIdx === 'number')
    if (hit) return hit.targetIdx as number
  }
  return -1
}
const aiBase = idxIn(base.events)
const aiNoHelm = idxIn(noHelm.events)
const fbBase = countKind(base.events, 'fullBurstStart')

const asukaDamage = (res: any) => {
  const u: any = unitOf(res, 'asuka')
  const v = u?.damage ?? u?.total ?? u?.totalDamage ?? u?.dmg
  expect(typeof v).toBe('number')
  return v as number
}

describe('asuka — fixture sanity (non-vacuity for everything below)', () => {
  it('the carry is resolvable and the comp actually reaches Full Burst repeatedly', () => {
    expect(aiBase).toBeGreaterThanOrEqual(0)
    expect(aiNoHelm).toBeGreaterThanOrEqual(0)
    expect(fbBase).toBeGreaterThan(1)
    expect(unitOf(base.res, 'liter')).toBeTruthy()
    expect(asukaDamage(base.res)).toBeGreaterThan(0)
  })
})

describe('asuka S1a — Damage dealt to Shield ▲601.01% (no primitive)', () => {
  it('is recorded as unmodeled text and is NOT smuggled into some other stat', () => {
    const um: any = inspect((ov: any) => ov.unmodeled ?? {})
    const s1: string[] = um.skill1 ?? []
    expect(s1.some(l => /Shield/i.test(String(l)))).toBe(true)
    const smuggled = inspect((ov: any) => {
      let f = false
      eachEffect(ov, (e) => { if (near(e.value, 601.01, 0.5) || near(e.atkPct, 601.01, 0.5)) f = true })
      return f
    })
    expect(smuggled).toBe(false)
  })

  it.skip('shield-damage payload — GAP: no StatKey for damage-to-shield and the v1 boss has no shield pool', () => {})
})

describe('asuka S1b — ATK ▲96.98% for 25s when recovery takes effect', () => {
  it('fires from a recovery event, not from battle start (nearest-wrong: passive)', () => {
    const hits = applies(noHelm.events, isAtk9698Ev)
    expect(hits.length).toBeGreaterThan(0)
    const firstApply = noHelm.events.findIndex(e => e.kind === 'buffApply' && near(e.value, 96.98))
    const firstBurstCast = noHelm.events.findIndex(e => e.kind === 'burstCast')
    expect(firstBurstCast).toBeGreaterThanOrEqual(0)
    expect(firstApply).toBeGreaterThan(firstBurstCast)
  })

  it('is driven by her OWN burst heal — removing the heal removes the ATK buff entirely', () => {
    expect(applies(noHelm.events, isAtk9698Ev).length).toBeGreaterThan(0)
    expect(applies(noHeal.events, isAtk9698Ev).length).toBe(0)
  })

  it('is self-only (Affects self) — no ally ever receives it', () => {
    const hits = applies(noHelm.events, isAtk9698Ev)
    expect(hits.every(e => e.targetIdx === aiNoHelm)).toBe(true)
  })

  it.skip('heal tick cadence — ⚑ MEASUREMENT-GATED: prose says over 10 sec without a per-tick rate, so refresh count (1 vs 10 recovery events) is not derivable from text', () => {})
})

describe('asuka S2a — Elemental Advantage Attack Damage ▲30.02%, shield-gated, on FB enter', () => {
  it('the in-Shield-status gate suppresses the block in a comp with no shield source', () => {
    expect(applies(base.events, isElemAdvEv).length).toBe(0)
    expect(applies(shieldUngated.events, isElemAdvEv).length).toBeGreaterThan(0)
  })

  it('is full-burst-enter keyed and self-targeted (nearest-wrong: burstCast / whole team)', () => {
    const hits = applies(shieldUngated.events, isElemAdvEv)
    const fb = countKind(shieldUngated.events, 'fullBurstStart')
    const ai = idxIn(shieldUngated.events)
    expect(hits.length).toBe(fb)
    expect(hits.every(e => e.targetIdx === ai)).toBe(true)
  })

  it('uses the elemental-advantage stat, not generic element/attack damage', () => {
    const hits = applies(shieldUngated.events, isElemAdvEv)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(e => e.stat === 'elemAdvantageDamagePct')).toBe(true)
  })
})

describe('asuka S2b — core damage ▲60.07% to all Fire Code allies on FB enter', () => {
  it('applies once per Full Burst, to asuka included (nearest-wrong: burstCast keying, or excludeSelf)', () => {
    const hits = applies(base.events, isCore60Ev)
    const toAsuka = hits.filter(e => e.targetIdx === aiBase)
    expect(toAsuka.length).toBe(fbBase)
    expect(hits.every(e => e.stat === 'coreDamagePct')).toBe(true)
  })

  it('is Fire-Code scoped, not team-wide', () => {
    const recip = (evs: Ev[]) => new Set(applies(evs, isCore60Ev).map(e => e.targetIdx))
    const committed = recip(base.events)
    const allAllies = recip(coreAllAllies.events)
    expect(committed.size).toBeGreaterThan(0)
    expect([...committed].every(i => allAllies.has(i))).toBe(true)
    expect(committed.size).toBeLessThan(allAllies.size)
  })

  it('the element key is Fire — asuka drops out of the target set when it is changed', () => {
    const ai = idxIn(coreWind.events)
    const toAsuka = applies(coreWind.events, isCore60Ev).filter(e => e.targetIdx === ai)
    expect(toAsuka.length).toBe(0)
    expect(applies(base.events, isCore60Ev).filter(e => e.targetIdx === aiBase).length).toBeGreaterThan(0)
  })
})

describe('asuka burst — Attack damage ▲150.04% for 10s (self)', () => {
  it('is burst-cast keyed, self-targeted, and lands in the Damage-Up bucket not the ATK stat', () => {
    const hits = applies(base.events, isAtkDmgEv)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.length).toBeLessThan(fbBase)
    expect(hits.every(e => e.targetIdx === aiBase)).toBe(true)
    expect(hits.every(e => e.stat === 'attackDamagePct')).toBe(true)
    expect(applies(base.events, e => e.stat === 'atkPct' && near(e.value, 150.04)).length).toBe(0)
  })

  it('moves asuka damage and nothing else (self scope)', () => {
    expect(asukaDamage(noAtkDmg.res)).toBeLessThan(asukaDamage(base.res))
    expect(unitOf(noAtkDmg.res, 'liter')).toEqual(unitOf(base.res, 'liter'))
    expect(unitOf(noAtkDmg.res, 'crown')).toEqual(unitOf(base.res, 'crown'))
  })
})

describe('asuka burst — Hit Rate ▲101.37% for 10s (self)', () => {
  it('applies once per own burst, to self only', () => {
    const hits = applies(base.events, isHitRateEv)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.length).toBeLessThan(fbBase)
    expect(hits.every(e => e.targetIdx === aiBase && e.stat === 'hitRatePct')).toBe(true)
    expect(hits.length).toBe(applies(base.events, isAtkDmgEv).length)
  })

  it('carries real damage through the hit-rate core lift, and only for asuka', () => {
    expect(asukaDamage(noHitRate.res)).toBeLessThan(asukaDamage(base.res))
    expect(unitOf(noHitRate.res, 'liter')).toEqual(unitOf(base.res, 'liter'))
  })

  it.skip('hit-rate -> core MAGNITUDE — ⚑ measured-only (hrCoreMult is a derived engine constant, not a kit value)', () => {})
})

describe('asuka burst — Gain Pierce for 25 sec (self)', () => {
  it('carries the 25s window, not the 10s window the other three burst lines use', () => {
    const p: any = inspect((ov: any) => {
      let hit: any = null
      eachEffect(ov, (e) => { if (!hit && e.kind === 'gainPierce') hit = e })
      return hit
    })
    expect(p).toBeTruthy()
    expect(p.durationSec).toBe(25)
  })

  it('is damage-inert in v1 (pierceDamagePct is parsed but inert) — documents, not asserts, a payload', () => {
    expect(totals(noPierce.res)).toEqual(totals(base.res))
  })
})

// isXEv wrappers keep the event predicates separate from the override-effect predicates above:
// buffApply events carry stat+value, override effects carry kind+stat+value.
function isAtk9698Ev(e: Ev) { return e.stat === 'atkPct' && near(e.value, 96.98) }
function isElemAdvEv(e: Ev) { return near(e.value, 30.02) }
function isCore60Ev(e: Ev) { return near(e.value, 60.07) }
function isAtkDmgEv(e: Ev) { return near(e.value, 150.04) }
function isHitRateEv(e: Ev) { return near(e.value, 101.37) }

```

---

## S6 BLIND POST-OP OVERRIDE (claude-opus-5, written from prose alone)

```json (blind override)
{
  "slug": "asuka",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "recovery"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 96.98,
          "durationSec": 25
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
      "requiresShielded": true,
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 30.02,
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
        "kind": "alliesOfElement",
        "element": "Fire"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 60.07,
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
          "kind": "gainPierce",
          "durationSec": 25
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 150.04,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 101.37,
          "durationSec": 10
        },
        {
          "kind": "heal",
          "ticks": 10,
          "intervalSec": 1
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates at the start of battle. Affects self. Damage dealt to Shield ▲ 601.01% continuously. — the v1 boss carries no shield HP layer, so a shield-damage multiplier has no channel to feed (no StatKey exists for it); recorded here rather than approximated as a generic damage buff, which would badly over-credit."
    ],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "⚑ hitRatePct 101.37 routes through the engine's derived hrCoreMult core-lift; the Hit-Rate→core slope is measured-only and is NOT part of this parse. Treat the resulting core-rate lift as unvalidated.",
    "⚑ The burst lifesteal line is encoded as a 10× 1s `heal` to self purely so it fires her own skill1 `recovery` trigger; the tick count/cadence is an estimate, not kit-stated. It is the ONLY in-kit source of her ATK ▲96.98%, so solo she gets that buff only from her own burst window onward — an external healer changes her uptime completely.",
    "⚑ skill2's Elemental-Advantage block is gated `requiresShielded` per 'Affects self when in Shield status'; with no shielder on the team it is inert by construction. Whether the real gate reads shield-at-FB-entry (modeled) or shield-at-any-point is unverified.",
    "elemAdvantageDamagePct is live only when Asuka (Fire) actually holds elemental advantage over the boss — inert on a neutral/advantaged-against matchup.",
    "'all Fire Code allies' is read as INCLUDING self (Asuka is Fire); alliesOfElement without excludeSelf encodes that.",
    "⚑ Cadence tuple (ammo 20 / reloadFrames 84 / rate_of_fire) comes from the known-unreliable datamine fields and is not re-derived here."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read from kit prose only. Structure: skill1 = one dead line (shield damage, no v1 channel) + a big on-recovery self ATK buff whose only in-kit feeder is her own burst's lifesteal — the heal effect exists to close that loop, not to model HP. skill2 = two independent fullBurstEnter blocks, one self-only behind a shield-status gate, one Fire-element team core buff. burst = pure self-buff block on burstCast (25s Pierce, 10s Attack Damage / Hit Rate / lifesteal). No noFb set (FB-by-timing default ON); no noRange set (engine-automatic)."
}
```

```json (audit + flags)
{
  "slug": "asuka",
  "leakDetected": null,
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates at start of battle. Self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "Activation header for the shield-damage line; carries no effect of its own. Its payload line is SKIPPED (see next row)."
    },
    {
      "slot": "skill1",
      "kitLine": "Damage dealt to Shield ▲ 601.01% cont.",
      "status": "SKIPPED",
      "effectOrReason": "No shield layer on the v1 boss and no StatKey for shield-damage scaling. Verbatim in unmodeled.skill1. Deliberately NOT approximated as attackDamagePct — that would credit ~601% of a bucket it never touches."
    },
    {
      "slot": "skill1",
      "kitLine": "Activates when recovery takes effect.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger {kind:'recovery'} — fires when Asuka RECEIVES a heal (own burst lifesteal, or any ally healer). Not passive: uptime is entirely gated on heal events."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 96.98% for 25 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkPct 96.98, durationSec 25, target self. Seconds (not rounds); refreshes on each recovery event."
    },
    {
      "slot": "skill2",
      "kitLine": "Entering FB. Self when in Shield status.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter (team-wide FB entry, NOT burstCast — text says 'entering Full Burst') + block gate requiresShielded:true for the shield-status condition."
    },
    {
      "slot": "skill2",
      "kitLine": "Elemental Adv Atk Damage ▲ 30.02% 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff elemAdvantageDamagePct 30.02, durationSec 10 — the exception to the flat ×1.10 element rule (prior 8), so it must be modeled explicitly."
    },
    {
      "slot": "skill2",
      "kitLine": "Entering FB. All Fire Code allies.",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger fullBurstEnter, target {kind:'alliesOfElement', element:'Fire'} (self included — Asuka is Fire)."
    },
    {
      "slot": "skill2",
      "kitLine": "Dmg when attacking core ▲ 60.07% 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff coreDamagePct 60.07, durationSec 10. Team-scoped core bucket, not a generic damage buff."
    },
    {
      "slot": "burst",
      "kitLine": "Affects self.",
      "status": "IMPLEMENTED",
      "effectOrReason": "Single self-targeted block on trigger burstCast (self mode in the unit's OWN burst slot → burst-cast, not fullBurstEnter — prevents over-firing in multi-B3 comps)."
    },
    {
      "slot": "burst",
      "kitLine": "Gain Pierce for 25 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "effect gainPierce durationSec 25 (timed window, so NOT the static hasPierce flag). Makes her hits Pierce-tagged so any Pierce Damage ▲ source goes live; outlasts the 10s buffs by design."
    },
    {
      "slot": "burst",
      "kitLine": "Attack damage ▲ 150.04% for 10 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 150.04, durationSec 10 (Damage Up bucket, unscoped — kit gives no normal-attack/charge scoping)."
    },
    {
      "slot": "burst",
      "kitLine": "Recovers 3.16% of atk damage as HP 10s",
      "status": "IMPLEMENTED",
      "effectOrReason": "effect heal {ticks:10, intervalSec:1} to self. No HP amount modeled (v1 has no HP pool), but per the tandem/cross-unit HARD RULE it is NOT skippable: it is the sole in-kit driver of her own skill1 'recovery' ATK ▲96.98%, and it also feeds any teammate's on-recovery consumer."
    },
    {
      "slot": "burst",
      "kitLine": "Hit Rate ▲ 101.37% for 10 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff hitRatePct 101.37, durationSec 10 — routed to the engine's hrCoreMult core-lift path. ⚑ magnitude of the HR→core conversion is measured-only."
    }
  ],
  "flags": [
    {
      "field": "override.burst[0].effects[3] (heal ticks/intervalSec)",
      "estimate": "ticks: 10, intervalSec: 1 (10 recovery events over the 10s window)",
      "reasoning": "'Recovers 3.16% of attack damage as HP over 10 sec' is lifesteal — in game it emits recovery continuously on every landed hit, not once. The engine's heal effect models event emission only, so tick count is a free parameter the kit never states. ticks:1 would emit one recovery at cast (ATK buff live cast→cast+25s); ticks:10 keeps it refreshing to cast+10+25s. With a 40s burst CD the two differ by ~10s of ~97% ATK uptime per rotation — material, and it also changes refresh timing for any teammate on-recovery consumer.",
      "recipe": "Record a solo/control fight and read the ATK-buff apply/remove timeline via cfg.onEvent buffApply/buffRemove filtered to stat atkPct value 96.98 on her slot; the gap between the last recovery-driven refresh and burst cast pins the real emission cadence. Cross-check against popup damage stepping down 25s after the LAST recovery event, not 25s after cast."
    },
    {
      "field": "override.burst[0].effects[2] (hitRatePct 101.37 → core rate)",
      "estimate": "value taken verbatim from kit (101.37); resulting core-rate lift = whatever hrCoreMult yields — UNVALIDATED for this unit",
      "reasoning": "ALWAYS-⚑ #7: the Hit-Rate→core magnitude is measured-only. The kit states the Hit Rate percentage but not what it does to core-hit frequency; that slope is an engine-level derived model. An AR with coreAttackMultiplier 200 has a large core lever, so an error in the slope moves her burst-window damage substantially.",
      "recipe": "Footage core-rate count inside vs outside her 10s burst window (count red 'CORE HIT' popups / total popups over the same number of rounds), at fixed range band, then compare to the sim's realized core rate with HRCORE=1 vs HRCORE=0 (per-PROCESS env toggle — never in-loop)."
    },
    {
      "field": "override.skill2[0].requiresShielded",
      "estimate": "true — gate modeled as shield-present at FB entry; effectively inert with no shielder on the team",
      "reasoning": "'Affects self when in Shield status' is a condition, and the schema's requiresShielded gate is evaluated when the trigger fires. Whether the real game checks the shield at the FB-entry instant (modeled) or grants the buff if a shield exists at any point in the window is not determinable from the prose. Precedent (naga's cast-time shield check) is owner-ruled default-off, which this follows. On a shieldless comp the whole 30.02% elemental-advantage buff is dead — a large swing if the gate is wrong or if the intended comp always shields her.",
      "recipe": "Run the control comp with and without a shield source and diff her damage; separately confirm in footage that the buff icon appears at FB entry only while shielded. If a shield applied mid-FB also grants it, the gate needs to become a `shielded` trigger instead."
    },
    {
      "field": "base stats — cadence tuple (ammo 20 / reloadFrames 84 / rate_of_fire)",
      "estimate": "as datamined; no override-level correction applied",
      "reasoning": "ALWAYS-⚑ #1: datamined rate_of_fire is NOMINAL and reloadFrames is a known-unreliable field. Effective fire rate is 60/ceil(60/nominal) on frame boundaries, so the nominal value is not directly usable. Nothing in this override compensates for it, and her kit has no reload/ammo/fire-rate modifier to interact with it.",
      "recipe": "Read shots/sec directly off the ammo counter in footage (the instrument that measures the disputed quantity), not off FB counts; time a full 20→0 magazine plus reload cycle."
    },
    {
      "field": "override.skill2[1].target (alliesOfElement Fire, self included)",
      "estimate": "self included (no excludeSelf)",
      "reasoning": "'Affects all Fire Code allies' with Asuka herself being Fire Code — the kit gives no 'except self' clause, so the literal read includes her. If wrong, her own 60.07% coreDamagePct is double-counted against nothing else (she has no second core source), which would over-credit her personal core bucket by the full 60pp during every FB.",
      "recipe": "Compare her core-bucket popup magnitudes inside FB against a Fire teammate's under identical core hits; equal proportional lift confirms self-inclusion."
    }
  ],
  "model": "claude-opus-5"
}
```

---

## DRIVER IMPLEMENTATION UNDER REVIEW

```json (src/skills/overrides/asuka.json — SHIPPED, post-FIX)
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. — asuka (BASE Asuka, AR/Fire/Attacker/B3 — NOT asuka-wille MG/Wind). Kit-parse AUTHOR 2026-07-16 (wave 5). S1: shield-damage 601.01% → unmodeled (no shield-damage StatKey in types.ts; scope-lock partless boss never shields — inert). S1 ATK 96.98%/25s RE-ENCODED passive→`recovery`-triggered self buff (driver-directed; the prior hand slot's passive encoding was a healer-team uptime PROXY predating the recovery trigger — that team assumption now lives with the healer, not the unit). ⚑ BIG LEVER: with a recurring healer (Rei aura/Crown S2/Mast) uptime is ~permanent; healer-less it fires ONLY via her own burst lifesteal (modeled — see burst). S2: FB-enter self elemAdvantageDamagePct 30.02/10s — kit gates it on SHIELD STATUS → requiresShielded:true block gate (gauntlet FIX 2026-07-24; the requiresShielded primitive DOES exist — the prior 'no shield-state gate' note was wrong; crown's burst shield keeps her shielded at every FB entry in the control comp so the gate is satisfied there; inert without elemental advantage regardless); FB-enter alliesOfElement Fire coreDamagePct 60.07/10s (includes self — she is Fire). Burst (burstCast self): attackDamagePct 150.04/10s; 'Gain Pierce 25s' → gainPierce effect durationSec:25 on burstCast (gauntlet FIX 2026-07-24; was the top-level hasPierce permanent flag; pierce inert in v1 — PIERCE_CORE_DOUBLE off, pierceDamagePct unbuffed); lifesteal 3.16%/10s → `heal` event at cast (hard rule 2: fires her OWN S1 recovery trigger → self-sustaining ATK 96.98/25s per burst — ⚑ verify self-lifesteal procs 'when recovery takes effect'; single event at cast vs real 10s HoT ticks); hitRatePct 101.37/10s modeled (hard rule 4 — LIVE since CONE_DELTA 2026-07-19: feeds her AR core rate via acrForHR, saturating at this magnitude; ⚑ in-game core-rate lift unmeasured). ⚑ MANDATORY cadence tuple ESCALATED: 20-ammo AR with 18.76 normalMult = non-class fire-mode tell (collab positron rifle); pullsPerSec/reloadFrames 84/rolling-reload all unverified datamine. Kit-autonomy gauntlet 2026-07-24: audited FAITHFUL, cross-family corroborated (S2b claude-fable-5 converged on all 7 load-bearing lines + UNMODELED shield verbatim; unit test scripts/tests/units/asuka.test.ts pins each line vs its nearest-wrong counterfactual). Gauntlet FIXES (both engine-supported, independently derived by the cross-family blind models S2b/S5/S6, damage-neutral in the control comp): (a) S2 Elemental Advantage now carries requiresShielded:true — the kit's 'when in Shield status' gate, correctly modeled (the prior note wrongly claimed no shield-state primitive exists; requiresShielded IS a block gate, cf. naga); (b) 'Gain Pierce 25s' now a timed gainPierce:25s burstCast effect instead of the permanent top-level hasPierce flag (pierce inert in v1 either way). Remaining residual, encoding KEPT (non-fabrication): lifesteal single recovery event vs a 10-tick HoT — MEASUREMENT-GATED (in-game per-tick self-recovery is unmeasured AND material to S1 ATK uptime; ticks:10 not fabricated).",
  "unmodeled": {
    "skill1": ["Damage dealt to Shield ▲ 601.01% continuously."],
    "skill2": [],
    "burst": []
  },
  "caveats": [
    "skill1: ATK ▲96.98% is recovery-triggered — needs a heal landing on her (teammate healer, or her own burst lifesteal); a healer-less team that never Full-Bursts gains it never",
    "skill2: Elemental Advantage buff requires Shield status in-game — modeled with the requiresShielded block gate (gauntlet FIX 2026-07-24; the primitive exists, cf. naga — the prior 'no shield-state gate' note was wrong). Inert without a shielder AND without elemental advantage; in the control comp crown's burst shield keeps her shielded at every FB entry, so the gate is satisfied there",
    "burst: 'Gain Pierce for 25 sec' modeled as a timed gainPierce:25s burstCast effect (gauntlet FIX 2026-07-24; was the permanent top-level hasPierce flag — pierce currently inert vs the v1 boss either way); lifesteal modeled as one recovery event at cast, real effect ticks over 10s (tick cadence measurement-gated)",
    "burst: fire cadence is an unmeasured datamine estimate — 20-ammo AR with an 18.76% normal multiplier is unlikely to fire at the AR class default"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "recovery"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 96.98,
          "durationSec": 25
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
      "requiresShielded": true,
      "effects": [
        {
          "kind": "buff",
          "stat": "elemAdvantageDamagePct",
          "value": 30.02,
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
        "kind": "alliesOfElement",
        "element": "Fire"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "coreDamagePct",
          "value": 60.07,
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
          "kind": "gainPierce",
          "durationSec": 25
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 150.04,
          "durationSec": 10
        },
        {
          "kind": "heal"
        },
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 101.37,
          "durationSec": 10
        }
      ]
    }
  ]
}

```

```typescript (scripts/tests/units/asuka.test.ts — driver kit spec, 15 tests GREEN vs shipped)
// PER-UNIT KIT SPEC — base `asuka` (Asuka, AR/Attacker/Fire, Burst III, cd 40s, ammo 20).
// NOT the MG/Wind variant `asuka-wille` — reason from the exact slug `asuka`.
// Kit-autonomy gauntlet 2026-07-24 (test-first; owner-driven spec audit).
//
// One assertion group per KIT LINE (H1..H7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a recovery source — never to supply the
// encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.asuka.skills):
//   S1 ■ start of battle → self: Damage dealt to Shield ▲601.01% continuously              [H1 UNMODELED]
//      ■ when recovery takes effect → self: ATK ▲96.98% for 25 sec                          [H2]
//   S2 ■ entering Full Burst, self in Shield status: Elem. Advantage Attack Dmg ▲30.02%/10s [H3]
//      ■ entering Full Burst → all Fire Code allies: Damage vs core ▲60.07% for 10 sec      [H4]
//   BU ■ self: Gain Pierce for 25 sec                                                      [PIERCE — modeled-inert]
//      ■ self: Attack damage ▲150.04% for 10 sec                                            [H5]
//      ■ self: Recovers 3.16% of attack damage as HP over 10 sec                            [H6]
//      ■ self: Hit Rate ▲101.37% for 10 sec                                                 [H7]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   H1  no shield-damage StatKey exists and the partless scope-lock boss never shields, so the line
//       is honestly UNMODELED — pinned as a VERBATIM `unmodeled.skill1` entry (a documented skip,
//       not a silent drop). No damage assertion is possible (nothing encodes it).
//   H2  the ATK buff is RECOVERY-triggered, not passive and not burstCast. Proven two ways: remove
//       every heal that reaches her and it fires ZERO times (a passive/burstCast model still fires);
//       and the nearest-wrong encoding — the pre-gauntlet PASSIVE proxy — fires exactly ONCE at
//       frame 0, whereas the recovery model refreshes repeatedly across the fight.
//   H3  self-scoped at FB entry, gated on Shield status via the requiresShielded block gate
//       (gauntlet FIX 2026-07-24 — the primitive DOES exist; the shipped note wrongly claimed
//       otherwise). crown's burst shield keeps her shielded at every FB entry here, so the gate is
//       satisfied and the buff lands on all 11 entries; remove crown's shield and it falls silent.
//       Inert without elemental advantage regardless (boss Fire, she Fire) — asserted on buffApply.
//   H4  scoped to FIRE-CODE allies — she is the only Fire unit in the comp, so it must reach her
//       slot ALONE and must NOT reach liter/crown (Iron) or helm (Water). The all-allies
//       counterfactual hits all four slots, proving the scoping assertion is one the generic model
//       provably fails.
//   H5/H7  burstCast self-buffs: fire once per asuka burst, at the cast frame, self-scoped, 10s.
//   H6  the lifesteal is a RECOVERY EVENT, not a number: with helm's heals removed it becomes the
//       SOLE recovery source reaching her, and her own S1 then fires exactly once per burst AT the
//       burst frame — the self-sustaining ATK chain the override note posits, here measured in-sim.
//   PIERCE  "Gain Pierce 25s" is a timed gainPierce:25s burstCast effect (gauntlet FIX 2026-07-24 —
//       was the permanent top-level hasPierce flag; both blind models chose the timed effect). Pierce
//       is inert in v1 (PIERCE_CORE_DOUBLE off, pierceDamagePct unbuffed), so the 25s window is pinned
//       statically + a removing-it-changes-nothing totals check, not a damage discrimination.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / asuka B3 / helm B3, boss Fire,
// focus asuka). asuka is slot index 2. Two Burst-III units alternate the chain, so asuka casts 6
// bursts over 180s and there are 11 Full-Burst entries (each fires her S2). Crown heals ONLY
// herself (hitCount:860 self-heal), so the recovery sources reaching asuka are helm's all-ally
// heals + asuka's own burst lifesteal. Deterministic (no seed); event-log over totals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / asuka 2 / helm 3. */
const ASUKA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('asuka'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');

/** ISOLATION: remove EVERY heal that reaches asuka — helm's all-ally S1 + burst heals AND asuka's
 *  own burst lifesteal. Leaves asuka with NO recovery source, so her recovery-triggered S1 must
 *  fall silent if (and only if) it is genuinely recovery-gated. */
const noRecoverySource = (() => {
  const helmNoHeal = withPatchedOverride('helm', (ov) => {
    const s1 = ov.skill1.length;
    const bu = ov.burst.length;
    ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
    ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
    if (ov.skill1.length === s1 || ov.burst.length === bu)
      throw new Error('helm heal blocks missing — fixture is stale');
  });
  const asukaNoLifesteal = withPatchedOverride('asuka', (ov) => {
    let removed = 0;
    for (const b of ov.burst) {
      const before = b.effects.length;
      b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      removed += before - b.effects.length;
    }
    if (!removed)
      throw new Error('asuka burst lifesteal missing — fixture is stale');
  });
  return { helm: helmNoHeal, asuka: asukaNoLifesteal };
})();

/** LIFESTEAL-ONLY: remove helm's all-ally heals but KEEP asuka's own burst lifesteal, making it the
 *  sole recovery source reaching her — isolates the self-proc chain (H6). */
const lifestealOnly = withPatchedOverride('helm', (ov) => {
  const s1 = ov.skill1.length;
  const bu = ov.burst.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === s1 || ov.burst.length === bu)
    throw new Error('helm heal blocks missing — fixture is stale');
});

/** H2 counterfactual: the pre-gauntlet encoding — S1 ATK as an always-on PASSIVE (healer-team
 *  uptime proxy), instead of the kit-faithful recovery trigger. */
const asukaPassiveS1 = withPatchedOverride('asuka', (ov) => {
  let patched = 0;
  for (const b of ov.skill1)
    if (b.trigger?.kind === 'recovery') {
      b.trigger = { kind: 'passive' };
      patched++;
    }
  if (!patched)
    throw new Error('asuka S1 recovery block missing — fixture is stale');
});

/** H3/H4 counterfactual: both S2 buffs un-scoped to ALL allies (drops the self-only and
 *  Fire-code-only targeting). */
const asukaS2All = withPatchedOverride('asuka', (ov) => {
  let patched = 0;
  for (const b of ov.skill2) {
    if (
      b.effects.some(
        (e: any) =>
          e.stat === 'elemAdvantageDamagePct' || e.stat === 'coreDamagePct',
      )
    ) {
      b.target = { kind: 'allies' };
      patched++;
    }
  }
  if (patched < 2)
    throw new Error('asuka S2 buff blocks missing — fixture is stale');
});

/** H3 gate-discrimination: remove crown's burst SHIELD (the comp's only shield source). With the
 *  kit-faithful requiresShielded gate now on S2, her Elemental Advantage buff must fall silent —
 *  proving the gate is live, not decorative. */
const crownNoShield = withPatchedOverride('crown', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'shield');
    removed += before - b.effects.length;
  }
  if (!removed)
    throw new Error('crown burst shield missing — fixture is stale');
});

/** PIERCE inertness: drop the timed gainPierce effect. Pierce moves no damage vs the v1 boss
 *  (PIERCE_CORE_DOUBLE off, no pierceDamagePct), so totals must be byte-identical. */
const asukaNoPierce = withPatchedOverride('asuka', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce');
    removed += before - b.effects.length;
  }
  if (!removed)
    throw new Error('asuka burst gainPierce missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noRecovery = run(noRecoverySource);
const selfProc = run({ helm: lifestealOnly });
const passive = run({ asuka: asukaPassiveS1 });
const s2All = run({ asuka: asukaS2All });
const noShield = run({ crown: crownNoShield });
const noPierce = run({ asuka: asukaNoPierce });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const asukaBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === ASUKA &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
const asukaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'asuka',
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const frames = (bs: BuffApply[]) => bs.map((b) => b.frame);
const targets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort();
const dur = (bs: BuffApply[]) => [
  ...new Set(bs.map((b) => b.expiresFrame! - b.frame)),
];

const SHIPPED = JSON.parse(
  readFileSync(
    new URL('../../../src/skills/overrides/asuka.json', import.meta.url),
    'utf8',
  ),
);

describe('asuka (base, AR/Fire/Attacker) — kit spec', () => {
  describe('H1 — S1 shield-damage 601.01% is honestly UNMODELED (inert: no StatKey, partless boss)', () => {
    it('is documented verbatim in unmodeled.skill1, not silently dropped', () => {
      expect(SHIPPED.unmodeled.skill1).toContain(
        'Damage dealt to Shield ▲ 601.01% continuously.',
      );
    });
  });

  describe('H2 — S1 ATK ▲96.98%/25s is RECOVERY-triggered, self-scoped', () => {
    const applied = asukaBuffs(base.events, 'atkPct', 96.98);

    it('is the kit magnitude, self-scoped, for 25 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(targets(applied)).toEqual([ASUKA]);
      expect(dur(applied)).toEqual([25 * FPS]);
    });

    it('is GATED on receiving a recovery — zero firings when no heal reaches her', () => {
      // A passive or burstCast encoding would still fire here; only a recovery gate falls silent.
      expect(asukaBuffs(noRecovery.events, 'atkPct', 96.98).length).toBe(0);
    });

    it('DISCRIMINATING: the passive proxy fires once at battle start; recovery refreshes across the fight', () => {
      const passiveApplied = asukaBuffs(passive.events, 'atkPct', 96.98);
      expect(
        frames(passiveApplied),
        'passive applies a single always-on buff at t=0',
      ).toEqual([0]);
      expect(
        applied.length,
        'recovery re-fires as heals land — far more than the single passive grant',
      ).toBeGreaterThan(passiveApplied.length);
      expect(
        Math.max(...frames(applied)),
        'recovery firings span the whole fight, not just t=0',
      ).toBeGreaterThan(1000);
    });
  });

  describe('H3 — S2 Elemental Advantage ▲30.02%/10s on Full Burst entry, self-scoped, SHIELD-GATED', () => {
    const applied = asukaBuffs(base.events, 'elemAdvantageDamagePct', 30.02);

    it('fires once per Full Burst entry at the kit magnitude, for 10 sec, on herself only', () => {
      // crown's burst shield keeps asuka shielded at every FB entry in this comp, so the
      // requiresShielded gate is satisfied throughout and the buff lands on all 11 entries.
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect(targets(applied)).toEqual([ASUKA]);
      expect(dur(applied)).toEqual([10 * FPS]);
    });

    it('is GATED on Shield status — suppressed entirely when no shield source exists', () => {
      // The kit reads "Affects self when in Shield status"; remove crown's shield (the comp's only
      // shield source) and the gate must zero the block. Proves the gate is live, not decorative —
      // the nearest-wrong model (gate dropped) keeps firing here.
      expect(
        asukaBuffs(noShield.events, 'elemAdvantageDamagePct', 30.02).length,
      ).toBe(0);
    });

    it('DISCRIMINATING: un-scoping to all allies would reach every slot', () => {
      expect(
        targets(asukaBuffs(s2All.events, 'elemAdvantageDamagePct', 30.02)),
      ).toEqual([0, 1, 2, 3]);
    });
  });

  describe('H4 — S2 core-damage ▲60.07%/10s on Full Burst entry, scoped to FIRE-CODE allies', () => {
    const applied = asukaBuffs(base.events, 'coreDamagePct', 60.07);

    it('fires once per Full Burst entry at the kit magnitude, for 10 sec', () => {
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect(dur(applied)).toEqual([10 * FPS]);
    });

    it('reaches ONLY the Fire-code ally (herself) — not the Iron or Water allies', () => {
      // asuka is the sole Fire unit in the comp; liter/crown are Iron, helm is Water.
      expect(targets(applied)).toEqual([ASUKA]);
    });

    it('DISCRIMINATING: an all-allies encoding would reach all four slots', () => {
      expect(targets(asukaBuffs(s2All.events, 'coreDamagePct', 60.07))).toEqual(
        [0, 1, 2, 3],
      );
    });
  });

  describe('H5 — burst Attack damage ▲150.04%/10s, self-scoped, on cast', () => {
    const applied = asukaBuffs(base.events, 'attackDamagePct', 150.04);
    const burstFrames = asukaBursts(base.events).map((b) => b.frame);

    it('fires once per asuka burst, at the cast frame, on herself, for 10 sec', () => {
      expect(applied.length).toBe(burstFrames.length);
      expect(applied.length).toBeGreaterThan(0);
      expect(frames(applied)).toEqual(burstFrames);
      expect(targets(applied)).toEqual([ASUKA]);
      expect(dur(applied)).toEqual([10 * FPS]);
    });
  });

  describe('H6 — burst lifesteal is a RECOVERY EVENT that self-procs her own S1', () => {
    it("with helm's heals gone, her lifesteal fires S1 exactly once per burst, at the cast frame", () => {
      const burstFrames = asukaBursts(selfProc.events).map((b) => b.frame);
      const s1 = asukaBuffs(selfProc.events, 'atkPct', 96.98);
      expect(burstFrames.length).toBeGreaterThan(0);
      expect(
        frames(s1),
        'each burst lifesteal procs exactly one S1 recovery, at the cast frame',
      ).toEqual(burstFrames);
    });
  });

  describe('H7 — burst Hit Rate ▲101.37%/10s, self-scoped, on cast', () => {
    const applied = asukaBuffs(base.events, 'hitRatePct', 101.37);
    const burstFrames = asukaBursts(base.events).map((b) => b.frame);

    it('fires once per asuka burst, at the cast frame, on herself, for 10 sec', () => {
      expect(applied.length).toBe(burstFrames.length);
      expect(applied.length).toBeGreaterThan(0);
      expect(frames(applied)).toEqual(burstFrames);
      expect(targets(applied)).toEqual([ASUKA]);
      expect(dur(applied)).toEqual([10 * FPS]);
    });
  });

  describe('PIERCE — burst "Gain Pierce 25s" is a timed gainPierce effect (inert in v1)', () => {
    const pierceEffect = SHIPPED.burst[0].effects.find(
      (e: any) => e.kind === 'gainPierce',
    );

    it('is encoded as a timed gainPierce:25s burstCast effect, not the permanent hasPierce flag', () => {
      // Gauntlet FIX 2026-07-24: the kit says "for 25 sec", so it is a 25s window keyed to her burst
      // cast — not the always-on top-level hasPierce flag (which both cross-family blind models
      // independently rejected in favour of the timed gainPierce effect).
      expect(pierceEffect).toBeTruthy();
      expect(pierceEffect.durationSec).toBe(25);
      expect(SHIPPED.hasPierce).toBeUndefined();
    });

    it('is damage-inert in v1 (pierceDamagePct unbuffed, PIERCE_CORE_DOUBLE off) — removing it changes no total', () => {
      expect(noPierce.totals).toEqual(base.totals);
    });
  });
});

```

---

## S2d INDEPENDENT VERIFICATION

``` (driver test vs shipped override)

[1m[30m[46m RUN [49m[39m[22m [36mv4.1.10 [39m[90m/Users/maxwellsutton/nikke-sim/.qwen/worktrees/kit-autonomy-batch-2026-07-24[39m

 [32m✓[39m scripts/tests/units/asuka.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 8[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m13 passed[39m[22m[90m (13)[39m
[2m   Start at [22m 22:14:53
[2m   Duration [22m 405ms[2m (transform 82ms, setup 0ms, import 304ms, tests 8ms, environment 0ms)[22m


```

Blind S5 test vs SHIPPED (post-FIX) override: **14 pass / 3 fail / 3 skip** — the 3 fails are the artifacts classified in the DRIVER SUMMARY above (1 fixture-misconception on S2a where the encoding now converges; 2 liter team-relative `share` deep-equals). No REAL-GOTCHA surfaced by the blind test.

---

Return ONLY the verdict JSON per the schema above. Save nothing — the driver persists it.
