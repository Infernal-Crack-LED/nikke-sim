# S7 RECONCILING JUDGE PACKET — unit `mint` (Mint)

You are the BINDING reconciling judge for the kit-autonomy gauntlet on unit `mint` (Mint — RL / Supporter /
Iron / Burst II). Read the contract below, then adjudicate whether the DRIVER's implementation is FAITHFUL
to the kit prose. Return the exact JSON shape the contract specifies.

=====================================================================
## (1) CONTRACT + RETURN JSON SHAPE
=====================================================================
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


=====================================================================
## (2) MECHANICS SSOT POINTERS (authoritative game mechanics)
=====================================================================
The single-source-of-truth mechanics documents (repo-relative paths; cited for authority — the relevant
rules are embedded in the contract and the kit prose below):
  - docs/data/damage-calculation.md  — the multiplicative damage-formula buckets (ATK x major x element x
    charge x dmgUp x taken x distributed); casterAtkPct resolves to a FLAT ATK add = (pct/100) x caster ATK.
  - docs/data/game-mechanics.md       — burst rotation (B1->B2->B3 -> Full Burst), buff duration semantics,
    Pierce (inert on a partless boss in v1), Max Ammo as a weapon-state (shot-count) modifier.

=====================================================================
## (3) GROUND TRUTH — kit prose + base stats (data/characters.json -> characters.mint)
=====================================================================
Level-10 values are the LAST entry in each skill's description_value_list. The prose below is the literal
in-game kit text. Base stats are the scope-lock basis.
```json
{
  "slug": "mint",
  "name": "Mint",
  "weapon": "RL",
  "burst": "II",
  "burstCooldownSec": 20,
  "class": "Supporter",
  "element": "Iron",
  "manufacturer": "Tetra",
  "ammo": 6,
  "reloadFrames": 141,
  "chargeFrames": 60,
  "chargeMultiplier": 250,
  "normalAttackMultiplier": 61.3,
  "coreAttackMultiplier": 200,
  "hitsPerShot": 1,
  "burstGaugePerShot": 1.4,
  "baseStats": {
    "hp": 15000,
    "atk": 500,
    "def": 98,
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
    "resourceId": 600
  },
  "skills": {
    "skill1": "■ Activates when attacking with Full Charge while in Assigned Part: Singing status. Affects all allies.\nSinging Effect: ATK ▲ 45.02% of the skill user's ATK for 3 sec.\n\n■ Activates when attacking with Full Charge while in Assigned Part: Dancing status. Affects all allies.\nDancing Effect: Constantly recovers 1.8% of the skill user's final Max HP every 1 sec for 3 sec.",
    "skill2": "■ Activates when entering Burst Stage 3 while not in Sing Along status. Affects self.\nCancels Assigned Part: Singing.\nCancels Assigned Part: Dancing.\n■ Activates when entering Burst Stage 3 while in Assigned Part: Singing status. Affects all allies.\nCritical Rate ▲ 19.94% for 10 sec.\nProjectile Explosion Damage ▲ 50% for 10 sec.\nPierce Damage ▲ 32.72% for 10 sec.",
    "burst": "■ Affects self.\nOnly one Assigned Part is applied according to Mint's current status.\nStatus 1: If in the Assigned Part: Dancing status, Mint gains Assigned Part: Singing. This effect is continuous and cannot be removed.\nStatus 2: If not in the Assigned Part: Dancing status, Mint gains Assigned Part: Dancing. This effect is continuous and cannot be removed.\n■ Affects all allies.\nSing Along: Attack Damage ▲ 30.02% for 10 sec.\nMax Ammunition Capacity ▲ 40% for 10 sec.\nCritical Damage ▲ 45.05% for 10 sec."
  }
}
```

=====================================================================
## (4) S2b PRE-OP TEST-FAITHFULNESS REVIEW (claude-fable-5, independent blind re-derivation)
=====================================================================
{
  "slug": "mint",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Full Charge in Singing → ATK ▲ 45.02%",
      "disposition": "FAITHFUL",
      "scope": "Procs on Mint's full-charge attacks only (RL: every fired shot is a full-charge shot, chargeFrames 60) — encoded as trigger shotFired, gated on the Singing part state; buff itself is unscoped ATK for recipients",
      "durationSemantics": "durationSec: 3 (wall-clock), refreshed per qualifying shot — with ~1s+ shot cycle and 2.35s reload (141f) uptime is near-continuous while Singing is held, surviving reloads by a hair",
      "triggerIdentity": "shotFired + part-state gate (Singing). Part state must be tracked dynamically (resourceGate on a burst-toggled resource, or equivalent) — NOT a user-selectable `mode`, since the part flips mid-fight via burst casts. Inert before Mint's first burst (no part exists) and inert during Dancing periods",
      "targetSet": "allies (all allies, includes self)",
      "nearestWrongModel": "stat atkPct 45.02 (scales each recipient's own ATK) instead of casterAtkPct (45.02% of MINT's ATK, flat-resolved); secondarily: ungated passive active from t=0 before any part exists",
      "distinguishingAssertion": "buffApply events carry stat 'casterAtkPct' with value ≈ 0.4502 × unitOf(res,'mint').staticAtk (a FLAT ATK number), applied to every team slot; zero such events exist before Mint's 2nd burst (first burst grants Dancing, not Singing) — RED if stat is 'atkPct'/value 45.02, RED if events appear in rotation 1 or pre-burst",
      "inertness": "No casterAtkPct buffApply from this block during Dancing periods (rotation-1 window) or before Mint ever bursts",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Full Charge in Dancing → heal 1.8%/1s 3s",
      "disposition": "FAITHFUL",
      "scope": "Procs on Mint's full-charge shots while in Dancing part; heal amount = 1.8% of CASTER final Max HP per tick (no HP pool in v1 — the recovery EVENT is the modeled payload)",
      "durationSemantics": "heal-over-time: ticks:3, intervalSec:1 (3 recovery events over 3s per proc), per taxonomy a per-second HoT must emit repeated recovery events, not one instant event",
      "triggerIdentity": "shotFired + part-state gate (Dancing). Same dynamic-state gating as the Singing block; the two blocks are mutually exclusive by part",
      "targetSet": "allies (all allies, includes self)",
      "nearestWrongModel": "Dropped entirely as 'defensive, no damage' — misses the tandem channel: a heal effect fires recipients' 'recovery' triggers (e.g. crown's on-recovery buffs). Second misread: ticks:1 instant instead of 3 ticks over 3s (starves refresh-dependent recovery consumers)",
      "distinguishingAssertion": "With a recovery-triggered consumer in the comp, that consumer's on-recovery buffApply events appear ONLY during Mint's Dancing windows (rotation 1, 3, …), recurring ~every second while Mint fires — RED if the heal line is absent (no recovery-driven buffApplys at all) or if consumers fire during Singing windows",
      "inertness": "No direct damage/dot events from this line; no recovery events during Singing periods or pre-first-burst",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Enter BS3, not Sing Along → cancel parts",
      "disposition": "GAP",
      "scope": "Fires at any stage-3 burst cast, only when Mint's own Sing Along buff (burst ally package, 10s) is NOT currently active on her",
      "durationSemantics": "Instant state cancellation (removes both parts permanently until re-granted)",
      "triggerIdentity": "stageEnter stage:3, gated on absence of a live self-buff — the engine has no 'buff-active/buff-absent' block gate (requiresShielded is the only buff-state gate, wrong channel), and resources can't express the 10s expiry of Sing Along. Genuine expressibility gap",
      "targetSet": "self",
      "nearestWrongModel": "Modeling it as an UNCONDITIONAL cancel on every BS3 entry — that guts skill1 and the skill2 crit package every single rotation. The faithful approximation is the OPPOSITE: when Mint casts every rotation (20s CD ≤ rotation length), BS3 entry lands seconds after her cast, inside the 10s Sing Along window, so the cancel NEVER fires — omit with a documented note",
      "distinguishingAssertion": "In a comp where Mint bursts every rotation, skill1 part-gated procs (casterAtkPct buffApplys / recovery events) PERSIST across every fullBurstStart — RED under the unconditional-cancel misread (parts die at each BS3, skill1 goes silent between bursts)",
      "inertness": "Must not strip parts on any rotation where Mint's own burst preceded BS3 by <10s; boss and damage buckets untouched",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Enter BS3 in Singing → Crit Rate ▲ 19.94%",
      "disposition": "FAITHFUL",
      "scope": "Generic (unscoped) Critical Rate — prose says plain 'Critical Rate', so critRatePct, NOT critRateNormalPct",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "stageEnter stage:3 (ANY unit's stage-3 cast — Mint is Burst II, so her own burstCast can never be the trigger), gated on Mint currently holding the Singing part. Because the burst part-swap resolves at Mint's stage-2 cast BEFORE the B3 unit casts, the gate reads the NEW part: rotation 1 → Dancing (no fire), rotation 2 → Singing (fires), alternating thereafter — active on even-numbered rotations only, ~50% of rotations",
      "targetSet": "allies (all allies, includes self)",
      "nearestWrongModel": "Ungated stageEnter/fullBurstEnter firing EVERY rotation (~2× over-credit of the whole crit package); secondarily keying to fullBurstEnter vs stageEnter(3) (near-co-timed here, but wrong identity)",
      "distinguishingAssertion": "buffApply stat 'critRatePct' value 19.94 is ABSENT in the rotation-1 FB window and PRESENT in the rotation-2 window (expiresFrame − applyFrame ≈ 600 frames) — RED under the every-rotation misread (present in rotation 1)",
      "inertness": "No application on Dancing-part rotations (1st, 3rd, …); nothing pre-first-Mint-burst",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Projectile Explosion Damage ▲ 50%",
      "disposition": "FAITHFUL",
      "scope": "projectileExplosionPct — Damage Up bucket, only lifts RL-kit explosion damage (in the standard fixture, Mint herself is the only RL)",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "Same block as the crit line: stageEnter(3) + Singing gate, alternate rotations",
      "targetSet": "allies (all allies, includes self)",
      "nearestWrongModel": "Encoded as generic attackDamagePct (over-credits every ally) or dropped as inert because no other RL is present (must still be applied — a future RL teammate consumes it)",
      "distinguishingAssertion": "buffApply stat 'projectileExplosionPct' value 50 co-applied with the crit line on even rotations, targeting all slots; non-RL allies' damage unmoved by toggling this one effect — RED if it appears as attackDamagePct or moves an AR carry's total",
      "inertness": "Must not lift non-RL allies' damage; must not fire on Dancing rotations",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Pierce Damage ▲ 32.72%",
      "disposition": "FAITHFUL",
      "scope": "pierceDamagePct — feeds only Pierce-tagged hits of recipients; inert on a comp with no pierce carrier, but must be encoded (buffApply still emitted)",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "Same block: stageEnter(3) + Singing gate, alternate rotations",
      "targetSet": "allies (all allies, includes self)",
      "nearestWrongModel": "Encoded as generic damage-up (moves non-pierce attackers), or silently dropped as 'parsed but inert'",
      "distinguishingAssertion": "buffApply stat 'pierceDamagePct' value 32.72 emitted in the same even-rotation windows; totals of a pierce-less control comp are IDENTICAL with the effect present vs deleted — RED if any non-pierce unit's total moves",
      "inertness": "Zero damage movement in a comp with no Pierce-tagged attacker",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Part assignment: Dancing↔Singing, permanent",
      "disposition": "FAITHFUL",
      "scope": "Self state machine: first burst (not in Dancing) → gains Dancing; a burst cast while in Dancing → gains Singing; while in Singing (not Dancing) → back to Dancing. Strict alternation Dancing, Singing, Dancing, … with 'only one Part applied' (grant replaces the other part)",
      "durationSemantics": "'continuous and cannot be removed' = PERMANENT until the next burst swaps it (or the skill2 cancel, which is inert when Mint casts every rotation) — NOT a 10s buff",
      "triggerIdentity": "burstCast (Mint's own stage-2 cast). Expressible as burstCast + everyN:2 with offsets driving a part resource: odd casts (everyNOffset 1) → Dancing, even casts (everyNOffset 0) → Singing",
      "targetSet": "self",
      "nearestWrongModel": "(a) Parts as durationSec:10 buffs — skill1 goes dead between FB windows; (b) non-alternating (always grants Dancing, or grants Singing FIRST) — the skill2 crit package then fires never / on the wrong rotations",
      "distinguishingAssertion": "skill1 part-gated output persists MID-ROTATION (e.g. casterAtkPct buffApplys still refreshing ~15s after Mint's 2nd burst, well outside any 10s window), and the part TYPE alternates per rotation (rotation 1 = recovery events only, rotation 2 = casterAtkPct only) — RED if procs stop 10s after cast, or if rotation 1 shows Singing output",
      "inertness": "First burst must NOT produce Singing-side effects (no casterAtkPct from skill1, no skill2 crit package in rotation 1)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Sing Along: Attack Damage ▲ 30.02%",
      "disposition": "FAITHFUL",
      "scope": "attackDamagePct (Damage Up bucket, additive with other support Damage-Up)",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "burstCast (Mint's OWN stage-2 cast) — NOT fullBurstEnter. Coincident in a fixture where Mint is the sole Burst II, but diverges the moment another Burst II shares the team (Mint skipping a rotation must skip the package)",
      "targetSet": "allies (all allies, includes self)",
      "nearestWrongModel": "fullBurstEnter keying — over-credits in multi-B2 comps by firing on rotations Mint sat out",
      "distinguishingAssertion": "buffApply stat 'attackDamagePct' value 30.02 lands at Mint's burstCast frame (pre-FB), every rotation she casts, 10s expiry — RED if, in a two-B2 comp where Mint skips a rotation, the buff still applies that rotation",
      "inertness": "No application on rotations where Mint did not cast her burst",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Max Ammunition Capacity ▲ 40%",
      "disposition": "FAITHFUL",
      "scope": "maxAmmoPct — a WEAPON-STATE modifier that IS damage (bigger magazines → fewer reloads → more shots inside the window; also shifts lastBullet cadence for consumers)",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "Same block: burstCast, Mint's own cast",
      "targetSet": "allies (all allies, includes self)",
      "nearestWrongModel": "Dropped as 'defensive/QoL, no damage' (taxonomy trap 6) — silently removes real shot-count uplift and perturbs teammates' lastBullet/reload-keyed kits",
      "distinguishingAssertion": "buffApply stat 'maxAmmoPct' value 40 targets every slot at Mint's cast; deleting just this effect reduces the carry's shots fired (shot events) inside the 10s window / delays its next reload event — RED if totals and reload timing are identical with the effect removed",
      "inertness": "No effect outside the 10s window; ammo counts revert after expiry",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Critical Damage ▲ 45.05%",
      "disposition": "FAITHFUL",
      "scope": "critDamagePct, generic (unscoped in prose)",
      "durationSemantics": "durationSec: 10",
      "triggerIdentity": "Same block: burstCast, Mint's own cast",
      "targetSet": "allies (all allies, includes self)",
      "nearestWrongModel": "Confused with the skill2 Critical RATE line (rate vs damage swap), or given the skill2 line's Singing gate — this one is UNGATED and fires every Mint cast regardless of part",
      "distinguishingAssertion": "buffApply stat 'critDamagePct' value 45.05 appears EVERY rotation Mint casts (including rotation 1 / Dancing), while critRatePct 19.94 appears only on even rotations — RED if crit-damage skips rotation 1 or the two stats share a gate",
      "inertness": "Expires at 10s; no persistence into the next rotation",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:Singing casterAtkPct 45.02% 3s (shot-gated, part-gated)",
    "skill1:Dancing heal 1.8%/1s×3 (recovery-event emitter, part-gated)",
    "skill2:BS3+Singing critRatePct 19.94% 10s",
    "skill2:BS3+Singing projectileExplosionPct 50% 10s",
    "skill2:BS3+Singing pierceDamagePct 32.72% 10s",
    "burst:part state machine (permanent, alternating, Dancing first)",
    "burst:Sing Along attackDamagePct 30.02% 10s",
    "burst:Sing Along maxAmmoPct 40% 10s",
    "burst:Sing Along critDamagePct 45.05% 10s"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "■ Activates when entering Burst Stage 3 while not in Sing Along status. Affects self.",
      "Cancels Assigned Part: Singing.",
      "Cancels Assigned Part: Dancing."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to hunt: (1) skill1 Singing as atkPct instead of casterAtkPct — the event-log value must be FLAT (0.4502×mint.staticAtk), not 45.02. (2) The whole-kit alternation: FIRST burst grants DANCING (Status 2 branch — she starts in neither part), so Singing-side output (skill1 ATK buff, the entire skill2 crit/explosion/pierce package) is absent in rotation 1 and live only on even rotations (~50% uptime); an ungated or every-rotation encoding over-credits ~2×. (3) Parts encoded as 10s buffs instead of permanent-until-swapped — kills skill1 uptime between FB windows. (4) skill2 crit package keyed to Mint's burstCast — impossible (she is Burst II; the trigger is stage-3 ENTRY by any ally, stageEnter:3) — or to fullBurstEnter (wrong identity, near-co-timed here). (5) maxAmmoPct 40% dropped as defensive. (6) The skill2 cancel block is an expressibility GAP (no 'self-buff-active' gate; resources can't carry Sing Along's 10s expiry); the faithful approximation is OMIT-with-note because Mint casting every rotation (20s CD) keeps Sing Along live at every BS3 entry — the dangerous misread is an UNCONDITIONAL cancel, which would strip parts every rotation. Assert part persistence across fullBurstStart to catch it. (7) Fixture hazard: Mint is Burst II — controlComp's default crown (B2) contends for the cast; if Mint never casts her burst, she never gains a part and BOTH skills are silent, so the test comp must guarantee Mint actually bursts (and a two-B2 variant is exactly the probe that separates burstCast from fullBurstEnter on the Sing Along package). (8) Ordering premise: the part swap resolves at Mint's stage-2 cast, BEFORE stage-3 entry, so the skill2 gate reads the NEW part — if the driver assumed the OLD part, their rotation parity will be inverted (package firing on odd rotations); the rotation-1-absence assertion catches both wrong parities. (9) pierceDamagePct must be encoded yet demonstrably inert in a pierce-less comp; projectileExplosionPct must not move non-RL allies. All magnitudes/durations are kit-literal (DATAMINED); no ALWAYS-⚑ fields apply — cadence comes from given base stats (chargeFrames 60, ammo 6, reloadFrames 141), no invented triggers, no stack/currency math.",
  "model": "claude-fable-5"
}


=====================================================================
## (5) S5 BLIND TEST (claude-opus-5) + its green/red count vs the DRIVER override
=====================================================================
S5 BLIND TEST vs DRIVER OVERRIDE: 17 PASS / 9 FAIL / 1 SKIP (27 total).
  The 17 PASSES corroborate the driver on every magnitude + scoping claim: caster-scaled FLAT ATK
  (value = 0.4502 x mint.staticAtk, NOT a raw atkPct 45.02); reaches all 4 allies for 3s; fires at
  full-charge cadence; keyed to STAGE-3 ENTRY (not mint's own stage-2 burst cast); the 19.94% crit is a
  LIVE damage lever; burst trio 30.02/40/45.05 once per mint burst on burst CAST (not Full Burst entry);
  maxAmmo 40 is a real percentage capacity lever; mint deals no skill/burst damage of her own (pure
  supporter); grants no invented core/element/sustained/true-damage stat; crit rate UNSCOPED; fixture
  guards (mint casts several times, wins the stage-2 slot vs crown).
  The 9 FAILS map EXACTLY to the two divergences above (no new gotcha):
    Cluster A (6 fails) = DIVERGENCE 1 (mechanism): blind asserts a dynamic Singing gate — full values on
      ~50% of rotations / rotation-1 absence / "does NOT fire on every shot or every stage-3 entry" /
      isolated Singing-vs-Dancing windows. The driver's halving proxy fires every rotation at half value,
      so it fails these per-rotation assertions while matching the time-average.
    Cluster B (3 fails) = DIVERGENCE 2 (heal): blind asserts the Dancing heal drives crown's recovery
      consumer (3-tick HoT). The driver drops the heal, so those assertions are red.

--- S5 blind test source (scripts/kit-autonomy/blind/mint.test.ts) ---
```ts
// PER-UNIT KIT SPEC — `mint` (Mint, Supporter / RL / Iron, Burst II, cd 20s, ammo 6,
// reloadFrames 141, chargeFrames 60, hitsPerShot 1). BLIND spec: written from the kit prose
// ALONE, without sight of the shipped override, the driver's tests, or any truth file.
//
// One assertion group per KIT LINE (M1..M10), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` appears ONLY to build counterfactuals (the nearest-wrong model each
// assertion must discriminate against) and to ISOLATE the heal channel — never to supply the
// encoding under test.
//
// Kit (blablalink prose):
//   S1 ■ full-charge attack WHILE IN Assigned Part: Singing → all allies:
//        ATK ▲45.02% OF THE SKILL USER'S ATK for 3 sec                                    [M1]
//      ■ full-charge attack WHILE IN Assigned Part: Dancing → all allies:
//        recovers 1.8% of the skill user's final Max HP every 1 sec for 3 sec             [M2]
//   S2 ■ entering Burst Stage 3 while NOT in Sing Along → self: cancels both Assigned Parts [M3]
//      ■ entering Burst Stage 3 WHILE IN Singing → all allies:
//        Critical Rate ▲19.94% for 10 sec                                                 [M4]
//        Projectile Explosion Damage ▲50% for 10 sec                                      [M5]
//        Pierce Damage ▲32.72% for 10 sec                                                 [M6]
//   BU ■ self: Assigned Part TOGGLE — in Dancing → gain Singing; else → gain Dancing.
//        Continuous, cannot be removed.                                                   [M7]
//      ■ all allies ("Sing Along"): Attack Damage ▲30.02% for 10 sec                      [M8]
//                                    Max Ammunition Capacity ▲40% for 10 sec              [M9]
//                                    Critical Damage ▲45.05% for 10 sec                   [M10]
//
// THE CENTRAL READING (drives most of the discriminations below). The burst toggle starts from
// "no Assigned Part", so it is a deterministic alternation:
//     burst 1 → not Dancing → DANCING;  burst 2 → in Dancing → SINGING;  burst 3 → DANCING; …
// i.e. ODD casts leave her Dancing, EVEN casts leave her Singing. Therefore:
//   * S1's two branches are MUTUALLY EXCLUSIVE and alternate in ~20s windows (M1/M2/M7);
//   * S2's Singing-gated trio fires on roughly EVERY OTHER Burst-Stage-3 entry, not all of them
//     (M4/M5/M6) — a model that drops the status gate over-credits the whole team's crit rate,
//     projectile-explosion and pierce buckets by ~2x exposure.
// This alternation IS expressible with shipped primitives (a `resource` pool driven by two
// burstCast blocks with everyN:2 / everyNOffset 0|1, read back by `resourceGate` on the S1 and S2
// blocks), so a static/always-on encoding of either branch is a real divergence, not a GAP.
//
// WHY NOT `controlComp` — mint is BURST II and so is controlComp's `crown`. Two stage-2 casters
// contend for one slot per rotation, and if the rotation picks crown, mint never bursts, she never
// gains an Assigned Part, and EVERY assertion in this file passes vacuously. Fixture A therefore
// keeps liter (B1) / ada (B3) / helm (B3) and makes mint the SOLE Burst II. Guard assertions below
// fail loudly if a fixture ever goes vacuous anyway.
//
// Deterministic (no seed). Four full 180s sims.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../../tests/lib/harness.js';

const FPS = 60;

/**
 * FIXTURE A — liter (B1) / mint (B2) / ada (B3) / helm (B3), boss Fire, focus mint.
 * mint is the only stage-2 caster, so her burst — and therefore every Assigned Part in her kit —
 * is guaranteed to be exercised. Focus is mint because she is a charge weapon (RL, chargeFrames
 * 60), which maximises rotations and so the number of alternation windows the file can measure.
 */
const MAIN: CompOptions = {
  slugs: ['liter', 'mint', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'mint',
};

/**
 * FIXTURE B — ada swapped for crown. The `heal` effect models NO HP amount and emits no event of
 * its own; its ONLY observable is a recovery CONSUMER, and crown's "when recovery takes effect"
 * team buff is that consumer. crown is also Burst II, so this fixture reintroduces stage-2
 * contention on purpose (mint sits in the earlier slot); the guard test asserts mint still casts.
 * Every OTHER heal in the comp is patched out so that each recovery firing is attributable to
 * mint's Dancing heal alone — helm alone heals on every charged pull and would otherwise saturate
 * the consumer completely.
 */
const HEAL: CompOptions = {
  slugs: ['liter', 'mint', 'crown', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'mint',
};

/** Slot indices — mint is index 1 in BOTH fixtures. */
const MINT = 1;
const CROWN = 2;

/** crown's recovery-triggered team buff (the exemplar helm.test.ts pins the same magnitude). */
const CROWN_RECOVERY_VALUE = 20.99;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Damage = Extract<SimEvent, { kind: 'damage' }>;

function run(comp: CompOptions, overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...comp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

/**
 * Remove every effect carrying `stat`, across all three slots. Encoding-agnostic on purpose: a
 * blind test must not assume WHICH slot array the driver put a line in. Reports how many effects
 * it removed so a MISSING line fails as its own assertion instead of silently no-op'ing the
 * counterfactual into a false pass.
 */
function stripStat(slug: string, stat: string): { ov: any; removed: number } {
  let removed = 0;
  const ov = withPatchedOverride(slug, (o: any) => {
    for (const s of SLOTS) {
      const blocks: any[] = o[s] ?? [];
      for (const b of blocks) {
        const before = b.effects.length;
        b.effects = b.effects.filter((e: any) => e.stat !== stat);
        removed += before - b.effects.length;
      }
      o[s] = blocks.filter((b: any) => b.effects.length > 0);
    }
  });
  return { ov, removed };
}

/** Strip every `heal` effect from a unit (isolation for M2 — see FIXTURE B). */
function stripHeals(slug: string): any {
  return withPatchedOverride(slug, (o: any) => {
    for (const s of SLOTS) {
      const blocks: any[] = o[s] ?? [];
      for (const b of blocks)
        b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      o[s] = blocks.filter((b: any) => b.effects.length > 0);
    }
  });
}

const noAmmo = stripStat('mint', 'maxAmmoPct');
const noCrit = stripStat('mint', 'critRatePct');

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(MAIN);
const baseNoAmmo = run(MAIN, { mint: noAmmo.ov });
const baseNoCrit = run(MAIN, { mint: noCrit.ov });
const healRun = run(HEAL, {
  liter: stripHeals('liter'),
  crown: stripHeals('crown'),
  helm: stripHeals('helm'),
});

// ---- readers ----------------------------------------------------------------------------------
/** Every event kind carries a frame; typed loosely so the file compiles against any variant. */
const frameOf = (e: SimEvent): number => (e as any).frame as number;

const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** buffApply events CAST BY mint carrying `stat`. Boss debuffs (casterIdx null) drop out here. */
const mintBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MINT && b.stat === stat);

const castsBy = (evs: SimEvent[], slug: string) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && (e as any).slug === slug,
  );

const shotFramesOf = (evs: SimEvent[], slug: string) =>
  evs.filter((e) => e.kind === 'shot' && (e as any).slug === slug).map(frameOf);

const framesOf = (bs: BuffApply[]) =>
  [...new Set(bs.map(frameOf))].sort((a, b) => a - b);

/** Frame equality with a small tolerance — a trigger may dispatch a frame off the cast frame. */
const near = (f: number, set: number[], tol = 2) =>
  set.some((g) => Math.abs(f - g) <= tol);
const farFrom = (f: number, set: number[], tol: number) =>
  set.every((g) => Math.abs(f - g) > tol);

const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

const mintCastFrames = castsBy(base.events, 'mint').map(frameOf);
/** "Entering Burst Stage 3" = a stage-3 burst cast by ANYONE — here ada and helm. */
const stage3Frames = [
  ...new Set(
    [...castsBy(base.events, 'ada'), ...castsBy(base.events, 'helm')].map(
      frameOf,
    ),
  ),
].sort((a, b) => a - b);

/** Distinct frames at which crown's recovery consumer fired in the isolated heal run. */
const recoveryFrames = [
  ...new Set(
    buffs(healRun.events)
      .filter(
        (b) =>
          b.casterIdx === CROWN &&
          b.stat === 'attackDamagePct' &&
          b.value === CROWN_RECOVERY_VALUE,
      )
      .map(frameOf),
  ),
].sort((a, b) => a - b);

describe('mint — kit spec (blind)', () => {
  describe('F — fixture guards (a vacuous fixture must fail loudly, not pass silently)', () => {
    it('A: mint casts her Burst II several times, so her Assigned Parts are exercised', () => {
      expect(
        mintCastFrames.length,
        'mint never bursts in fixture A — she gains no Assigned Part and every gated ' +
          'assertion in this file would be vacuous',
      ).toBeGreaterThanOrEqual(3);
    });

    it("A: Burst Stage 3 is entered several times, on frames distinct from mint's own cast", () => {
      expect(stage3Frames.length).toBeGreaterThanOrEqual(3);
      for (const f of stage3Frames) {
        expect(
          near(f, mintCastFrames),
          `stage-3 entry at frame ${f} coincides with mint's own stage-2 cast — the ` +
            'burstCast-vs-stageEnter discrimination in M4/M5/M6 would be void',
        ).toBe(false);
      }
    });

    it('B: mint still wins the stage-2 slot with crown in the comp', () => {
      expect(
        castsBy(healRun.events, 'mint').length,
        'crown took every stage-2 cast in fixture B, so mint never gained Dancing — ' +
          'M2/M7 are measuring nothing',
      ).toBeGreaterThanOrEqual(3);
    });

    it("B: crown's recovery consumer is still identifiable at the pinned magnitude", () => {
      const anyCrownAtk = buffs(healRun.events).filter(
        (b) => b.casterIdx === CROWN && b.stat === 'attackDamagePct',
      );
      expect(
        anyCrownAtk.length,
        'crown emits no attackDamagePct at all — fixture is stale',
      ).toBeGreaterThan(0);
      expect(
        anyCrownAtk.some((b) => b.value === CROWN_RECOVERY_VALUE),
        `crown's recovery buff is no longer ${CROWN_RECOVERY_VALUE}% — re-pin the reader`,
      ).toBe(true);
    });
  });

  describe('M1 — S1 Singing: ATK ▲45.02% OF THE SKILL USER, all allies, 3 sec, per full charge', () => {
    const applied = mintBuffs(base.events, 'casterAtkPct');

    it('is caster-scaled (flat ATK add), NOT a raw 45.02% self-scaling atkPct', () => {
      // Nearest wrong: `atkPct` 45.02, which scales each HOLDER's own ATK — it would hand the
      // 4-unit team four different, mostly larger, ATK adds off a supporter's buff. A caster-
      // scaled grant resolves to ONE flat number (mint's staticAtk x 0.4502) shared by everyone.
      expect(
        applied.length,
        'mint emits no casterAtkPct — the Singing branch is missing',
      ).toBeGreaterThan(0);
      expect(
        mintBuffs(base.events, 'atkPct').length,
        '"ATK ▲x% of the skill user\'s ATK" must never be encoded as atkPct',
      ).toBe(0);
      const values = [...new Set(applied.map((b) => b.value))];
      expect(
        values,
        'a caster-scaled grant resolves to a single flat ATK figure',
      ).toHaveLength(1);
      expect(values[0]).not.toBe(45.02);
      expect(
        values[0],
        'a flat ATK add is tens of thousands, not a percentage',
      ).toBeGreaterThan(1000);
    });

    it('reaches all 4 allies (including mint) for exactly 3 sec', () => {
      for (const f of framesOf(applied)) {
        const holders = new Set(
          applied.filter((b) => frameOf(b) === f).map((b) => b.targetIdx),
        );
        expect(
          holders.size,
          `frame ${f} reached ${holders.size} allies, expected 4`,
        ).toBe(4);
      }
      for (const b of applied)
        expect(b.expiresFrame! - frameOf(b)).toBe(3 * FPS);
    });

    it('fires at her FULL-CHARGE cadence, not once per burst', () => {
      // Nearest wrong: re-keying "when attacking with Full Charge" to burstCast. mint's burst
      // cooldown is 20s, so a burst-keyed trigger can NEVER put two firings inside 3 seconds.
      const frames = framesOf(applied);
      const dense = frames.some(
        (f, i) => i > 0 && f - frames[i - 1] <= 3 * FPS,
      );
      expect(
        dense,
        'no two Singing applications within 3s — this is a burst-cadence trigger, not a ' +
          'per-full-charge one',
      ).toBe(true);
    });

    it('is GATED on Assigned Part: Singing — it does NOT fire on every shot of the fight', () => {
      // DIVERGENCE PROBE. The burst toggle leaves her Singing only after EVEN casts, so roughly
      // half her charged shots are Singing shots. An ungated (always-on) encoding fires on all of
      // them and roughly doubles the team ATK uptime this line is worth.
      const shots = shotFramesOf(base.events, 'mint').length;
      expect(shots, 'mint fired no shots — fixture is broken').toBeGreaterThan(
        0,
      );
      expect(
        framesOf(applied).length,
        "the Singing ATK buff fired on every one of mint's charged shots — the Assigned " +
          'Part gate is missing (the burst toggles Singing on only every OTHER cast)',
      ).toBeLessThan(shots);
    });
  });

  describe('M2 — S1 Dancing: 1.8% of caster Max HP every 1 sec FOR 3 SEC, all allies', () => {
    // No HP pool is modeled, so a heal's only observable is a recovery CONSUMER. Fixture B strips
    // every other heal in the comp, making mint's Dancing heal the sole driver of crown's
    // "when recovery takes effect" buff.
    it('reaches a recovery consumer at all (the Dancing branch is live, not dropped)', () => {
      expect(
        recoveryFrames.length,
        "no recovery reached crown — mint's Dancing heal is missing, or the whole Dancing " +
          'branch never activates',
      ).toBeGreaterThan(0);
    });

    it('is a 3-TICK heal-over-time, not a single instant heal', () => {
      // Nearest wrong: `heal` with the default ticks:1, which emits exactly one recovery per
      // trigger and therefore lands ONLY on mint's shot frames. A ticks:3 / intervalSec:1 HoT
      // keeps firing +1s and +2s later — visibly so across her 141-frame (2.35s) reload, when she
      // fires no shots at all.
      const shots = shotFramesOf(healRun.events, 'mint');
      expect(shots.length).toBeGreaterThan(0);
      let maxLag = 0;
      for (const f of recoveryFrames) {
        const prev = shots.filter((s) => s <= f).pop();
        if (prev === undefined) continue;
        maxLag = Math.max(maxLag, f - prev);
      }
      expect(
        maxLag,
        `every recovery landed within ${maxLag} frames of a mint shot — a one-shot heal ` +
          '(ticks:1), not "every 1 sec for 3 sec"',
      ).toBeGreaterThanOrEqual(90);
    });
  });

  describe('M3 — S2 Assigned-Part cancellation on Burst Stage 3 entry without Sing Along', () => {
    it.skip('cancels both Assigned Parts when Sing Along is not active', () => {
      // GAP — two reasons, both structural:
      //  (a) no primitive: nothing in the effect schema REMOVES a self status/resource conditional
      //      on another of the unit's own buffs being absent. `removeOnReload` is reload-keyed;
      //      buffRemove is emitted only for that path, never on natural lapse.
      //  (b) unobservable in ANY fixture where the line would matter: Sing Along lasts 10 sec and
      //      mint's burst cooldown is 20 sec, so on a comp where she bursts every rotation the
      //      stage-3 entry follows her own cast by ~1s and Sing Along is ALWAYS up — this block is
      //      inert by construction. It only bites on a rotation mint sits out, which fixture A
      //      (sole Burst II) deliberately never produces.
      // Recipe to enact: add a second stage-2 caster and assert the Assigned Part resets after a
      // rotation mint skipped.
    });
  });

  describe('M4/M5/M6 — S2 Singing trio on BURST STAGE 3 ENTRY, all allies, 10 sec', () => {
    const TRIO = [
      ['critRatePct', 19.94],
      ['projectileExplosionPct', 50],
      ['pierceDamagePct', 32.72],
    ] as const;

    for (const [stat, value] of TRIO) {
      it(`${stat} = ${value} to all 4 allies for 10 sec`, () => {
        const applied = mintBuffs(base.events, stat);
        expect(applied.length, `mint emits no ${stat}`).toBeGreaterThan(0);
        expect([...new Set(applied.map((b) => b.value))]).toEqual([value]);
        for (const f of framesOf(applied)) {
          const holders = new Set(
            applied.filter((b) => frameOf(b) === f).map((b) => b.targetIdx),
          );
          expect(
            holders.size,
            `frame ${f} reached ${holders.size} allies, expected 4`,
          ).toBe(4);
        }
        for (const b of applied)
          expect(b.expiresFrame! - frameOf(b)).toBe(10 * FPS);
      });
    }

    it("is keyed to STAGE-3 ENTRY, never to mint's own (stage-2) burst cast", () => {
      // mint is Burst II: "entering Burst Stage 3" is somebody ELSE's cast. Keying this to her own
      // burstCast (the reflex reading for a self-flavored kit) would fire it a beat early, at her
      // cast frame, and — in a comp where a different unit completes the chain — on rotations where
      // stage 3 is never reached at all.
      const frames = framesOf(mintBuffs(base.events, 'critRatePct'));
      expect(frames.length).toBeGreaterThan(0);
      for (const f of frames) {
        expect(
          near(f, mintCastFrames),
          `Singing trio applied at frame ${f}, which is mint's OWN burst cast — the trigger is ` +
            'burstCast, not stage-3 entry',
        ).toBe(false);
        expect(
          near(f, stage3Frames),
          `Singing trio applied at frame ${f}, which is no Burst Stage 3 entry`,
        ).toBe(true);
      }
    });

    it('is GATED on Assigned Part: Singing — it does NOT fire on every stage-3 entry', () => {
      // DIVERGENCE PROBE, and the most expensive line in the kit to get wrong: this trio is a
      // whole-team crit-rate + damage-bucket grant. The burst toggle only leaves her Singing after
      // EVEN casts, so ~half of stage-3 entries qualify. An ungated encoding roughly doubles the
      // uptime of 19.94% team crit rate.
      const frames = framesOf(mintBuffs(base.events, 'critRatePct'));
      expect(frames.length, 'the Singing branch never fired').toBeGreaterThan(
        0,
      );
      expect(
        frames.length,
        'the Singing trio fired on EVERY Burst Stage 3 entry — the Assigned Part gate is ' +
          'missing (the burst toggles Singing on only every OTHER cast)',
      ).toBeLessThan(stage3Frames.length);
    });

    it('M4 — the 19.94% Critical Rate is a live damage lever, not an inert stat', () => {
      expect(
        noCrit.removed,
        'mint carries no critRatePct effect at all',
      ).toBeGreaterThan(0);
      expect(sum(base.totals)).toBeGreaterThan(sum(baseNoCrit.totals));
    });
  });

  describe('M7 — burst Assigned Part TOGGLE: Singing and Dancing alternate and never coexist', () => {
    it('produces isolated windows of each branch, not both at once', () => {
      // "Only one Assigned Part is applied according to Mint's current status." Measured in the
      // isolated heal run, where the Singing branch (casterAtkPct) and the Dancing branch
      // (recoveries reaching crown) are BOTH separately observable.
      // Nearest wrong: both S1 branches ungated, so every charged shot fires the ATK buff AND the
      // heal — no firing of either would ever be isolated from the other.
      const singFrames = framesOf(mintBuffs(healRun.events, 'casterAtkPct'));
      expect(
        singFrames.length,
        'the Singing branch never fired in fixture B',
      ).toBeGreaterThan(0);
      expect(
        recoveryFrames.length,
        'the Dancing branch never fired in fixture B',
      ).toBeGreaterThan(0);
      expect(
        singFrames.some((f) => farFrom(f, recoveryFrames, 5 * FPS)),
        'no Singing application is isolated from the Dancing heal — both Assigned Parts are ' +
          'active simultaneously',
      ).toBe(true);
      expect(
        recoveryFrames.some((f) => farFrom(f, singFrames, 5 * FPS)),
        'no Dancing heal is isolated from the Singing buff — both Assigned Parts are active ' +
          'simultaneously',
      ).toBe(true);
    });
  });

  describe('M8/M9/M10 — burst "Sing Along": three 10-sec team buffs on her OWN cast', () => {
    const SING_ALONG = [
      ['attackDamagePct', 30.02],
      ['maxAmmoPct', 40],
      ['critDamagePct', 45.05],
    ] as const;

    for (const [stat, value] of SING_ALONG) {
      it(`${stat} = ${value} to all 4 allies for 10 sec, once per mint burst`, () => {
        const applied = mintBuffs(base.events, stat);
        expect(applied.length, `mint emits no ${stat}`).toBeGreaterThan(0);
        expect([...new Set(applied.map((b) => b.value))]).toEqual([value]);
        const frames = framesOf(applied);
        expect(
          frames.length,
          `${frames.length} applications vs ${mintCastFrames.length} mint burst casts`,
        ).toBe(mintCastFrames.length);
        for (const f of frames) {
          const holders = new Set(
            applied.filter((b) => frameOf(b) === f).map((b) => b.targetIdx),
          );
          expect(
            holders.size,
            `frame ${f} reached ${holders.size} allies, expected 4`,
          ).toBe(4);
        }
        for (const b of applied)
          expect(b.expiresFrame! - frameOf(b)).toBe(10 * FPS);
      });
    }

    it("fires on mint's burst CAST, not on Full Burst entry", () => {
      // This is her own burst block with no activation clause, so it lands at the cast — a beat
      // BEFORE the Full Burst window opens. Re-keying it to fullBurstEnter would also fire it on
      // rotations mint sat out.
      for (const stat of ['attackDamagePct', 'maxAmmoPct', 'critDamagePct']) {
        for (const f of framesOf(mintBuffs(base.events, stat))) {
          expect(
            near(f, mintCastFrames),
            `${stat} applied at frame ${f}, no mint cast there`,
          ).toBe(true);
        }
      }
    });

    it('M9 — Max Ammunition ▲40% is a REAL damage lever (ammo gates shots fired)', () => {
      // Taxonomy #6: a weapon-state modifier is damage. A bigger magazine means fewer reloads
      // inside the window, so removing the line must LOWER team damage — not leave it byte-equal,
      // which is what an "ammo is defensive/cosmetic" reading would predict.
      expect(
        noAmmo.removed,
        'mint carries no maxAmmoPct effect at all',
      ).toBeGreaterThan(0);
      expect(sum(base.totals)).toBeGreaterThan(sum(baseNoAmmo.totals));
    });

    it('M9 — it is a PERCENTAGE capacity buff, not a flat round count', () => {
      expect(
        mintBuffs(base.events, 'maxAmmoFlat').length,
        '"Capacity ▲40%" is maxAmmoPct',
      ).toBe(0);
    });
  });

  describe('INERTNESS — mint invents no damage and no unlisted stat', () => {
    it('deals no skill or burst damage of her own (a pure supporter kit)', () => {
      // Her kit text carries no "% of final ATK" line anywhere. Every point she deals must come
      // from her own weapon.
      const mintDmg = base.events.filter(
        (e): e is Damage => e.kind === 'damage' && (e as any).slug === 'mint',
      );
      const skillSourced = mintDmg.filter((d) =>
        ['skill1', 'skill2', 'burst'].includes((d as any).srcSlot),
      );
      expect(
        skillSourced.length,
        'mint dealt skill/burst-sourced damage — her kit has no damage line',
      ).toBe(0);
    });

    it('grants no core / element / sustained / true-damage stat she never mentions', () => {
      for (const stat of [
        'coreDamagePct',
        'elementDamagePct',
        'sustainedDamagePct',
        'trueDamagePct',
        'damageTakenPct',
        'critRateNormalPct',
      ]) {
        expect(
          mintBuffs(base.events, stat).length,
          `mint emits ${stat}, which is not in her kit`,
        ).toBe(0);
      }
    });

    it('grants Critical Rate UNSCOPED, as the kit writes it', () => {
      // The inverse trap of helm's S1: mint's line is a bare "Critical Rate ▲19.94%", with no
      // "of normal attacks" qualifier, so scoping it to normals would UNDER-credit the team's
      // skill and burst crit. Asserted alongside the previous group so the pair pins both
      // directions of the scope error.
      expect(mintBuffs(base.events, 'critRatePct').length).toBeGreaterThan(0);
    });
  });
});

```

=====================================================================
## (6) S6 BLIND OVERRIDE (claude-opus-5) + diff vs the DRIVER override
=====================================================================

BLIND (S6, opus) override  vs  DRIVER override — concise diff
=============================================================
IDENTICAL (converged):
  - skill1 Singing: casterAtkPct 45.02 / durationSec 3 / trigger shotFired / target allies.
  - skill2 Singing trio: trigger stageEnter stage 3 / critRatePct 19.94, projectileExplosionPct 50,
    pierceDamagePct 32.72 / durationSec 10 / target allies.
  - burst Sing Along trio (status-INDEPENDENT in BOTH): trigger burstCast / attackDamagePct 30.02,
    maxAmmoPct 40, critDamagePct 45.05 / durationSec 10 / target allies.
  - skill2 "not in Sing Along -> Cancels Singing/Dancing": UNMODELED in both (omit-with-note; inert when
    Mint casts every rotation because her own 10s Sing Along is live at every stage-3 entry).
  - burst Assigned Part toggle (Status 1/2): UNMODELED in both (mode bookkeeping, no damage/buff).
  - pierceDamagePct inert in engine v1 on the partless boss (both note it; value kept for completeness).
  - "Full Charge" modeled as shotFired (RL charge weapon => every trigger pull is a full charge) in both.
  - stageEnter:3 trigger identity (NOT fullBurstEnter) in both.
  - maxAmmoPct 40 treated as a REAL weapon-state (shot-count) buff, not skipped, in both.

DIVERGENCE 1 — the 50%-uptime MECHANISM (the central, mutually-acknowledged ⚑):
  - DRIVER: modes ["solo","duet (w/ Prika)"]. solo = Singing-gated lines HALVED (casterAtkPct 22.51,
    crit 9.97, projExpl 25, pierce 16.36) firing EVERY rotation => a steady-state proxy whose time-AVERAGE
    equals the true 50%-duty-cycle value. duet = FULL values (Prika locks permanent Singing; owner-confirmed
    rotation). Owner-validated: graded comp reads 1.015 OK; kit-status tier VALIDATED, tuned:true.
  - BLIND: modes ["singing","dancing"]. singing = FULL values at 100% uptime, which the blind ITSELF flags
    in its caveats: "OVER-CREDITS the singing branch ~2x in uptime ... Do NOT read either mode as a
    fight-average." dancing = the heal only (zeroes the damage buffs).
  - ADJUDICATION INPUT: the driver's halving proxy yields the CORRECT fight-average; the blind's static
    singing mode over-credits ~2x by its own admission. Both agree (and the S5 blind agrees) that NO engine
    primitive (mode/everyN/resource) expresses a state that flips on the owner's own burst AND gates another
    slot's trigger — the dynamic per-rotation model (S5 blind: full value on ~50% of rotations, rotation-1
    absence, even/odd parity) is the unattainable ideal all three approximate.

DIVERGENCE 2 — the Dancing HEAL (1.8% caster Max HP / 1s x 3):
  - DRIVER: UNMODELED (defensive; engine has no HP pool; only damage channel is a Crown-style on-recovery
    consumer — a known cold bias, owner finding F1 "crown recovery consumer never procs", hard rule 2).
  - BLIND: wired as a heal event (ticks:3, intervalSec:1) BUT mode-gated to "dancing", so it is INACTIVE in
    the default singing mode; the blind also notes "heal has no HP amount in the schema."
  - ADJUDICATION INPUT: small practical gap (in the default mode neither drives a recovery consumer); both
    acknowledge the heal magnitude is unmodeled. Driver keeps it UNMODELED + ⚑ (estimate+recipe+tier).


--- S6 blind override (scripts/kit-autonomy/blind/mint.override.json) ---
```json
{
  "slug": "mint",
  "modes": [
    "singing",
    "dancing"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "mode": "singing",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 45.02,
          "durationSec": 3
        }
      ]
    },
    {
      "slot": "skill1",
      "mode": "dancing",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 3,
          "intervalSec": 1
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "mode": "singing",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 19.94,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 50,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 32.72,
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 30.02,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": 40,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 45.05,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Activates when entering Burst Stage 3 while not in Sing Along status. Affects self.",
      "Cancels Assigned Part: Singing.",
      "Cancels Assigned Part: Dancing."
    ],
    "burst": [
      "Only one Assigned Part is applied according to Mint's current status.",
      "Status 1: If in the Assigned Part: Dancing status, Mint gains Assigned Part: Singing. This effect is continuous and cannot be removed.",
      "Status 2: If not in the Assigned Part: Dancing status, Mint gains Assigned Part: Dancing. This effect is continuous and cannot be removed."
    ]
  },
  "caveats": [
    "⚑ STATUS TOGGLE IS THE WHOLE KIT AND THE ENGINE HAS NO DYNAMIC-STATUS PRIMITIVE. Her burst flips Assigned Part each cast (no status -> Dancing on the FIRST burst, then Singing, then Dancing...), so in a real fight each branch is live only ~50% of rotations. This override freezes one branch for the whole fight via the top-level `modes` gate (default 'singing'), which OVER-CREDITS the singing branch ~2x in uptime and zeroes the dancing branch (and vice versa). Do NOT read either mode as a fight-average.",
    "⚑ skill2's 'not in Sing Along' cancel branch is unmodeled: on any rotation where Mint does NOT cast her own burst, the real unit loses BOTH Assigned Parts (skill1 and the skill2 stage-3 buffs both go dead). The model keeps the selected branch live unconditionally, so it over-credits comps where another Burst II unit takes the rotation.",
    "⚑ 'attacking with Full Charge' is modeled as `shotFired` (RL is a charge weapon, so every trigger pull is assumed a full charge). Any partial-charge shots in the engine's RL path would over-fire this block.",
    "⚑ 'Affects all allies' is read as INCLUDING self (standard NIKKE reading); no `excludeSelf`.",
    "pierceDamagePct is inert in v1 (documented) — the 32.72% line is kept for kit completeness / future consumers, not for current damage.",
    "heal has no HP amount in the schema; the 1.8%-of-caster-Max-HP-per-second magnitude is recorded here only. It fires 3 recovery events (ticks:3, intervalSec:1) so teammate 'on recovery' consumers stay driven."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (no committed override, no board, no probe data). Mint (mint), RL/Iron/Supporter/Burst II. Structure: burst grants a 10s team aura (Attack Damage 30.02 / Max Ammo 40 / Crit Damage 45.05, all `burstCast`+allies) that is status-INDEPENDENT, plus a self status toggle; skill1 and skill2 are the two status branches. Branch selection is exposed as `modes: ['singing','dancing']` (default 'singing'); this is an APPROXIMATION of an alternating per-rotation status — see caveats. skill1 singing = casterAtkPct 45.02 for 3s to all allies on each full charge (shotFired); skill1 dancing = a 3-tick HoT (heal, ticks:3, intervalSec:1) to all allies on each full charge. skill2 singing = stageEnter stage 3 -> allies crit rate 19.94 / projectile explosion 50 / pierce damage 32.72 for 10s. Max Ammunition 40% is modeled as a real weapon-state (shot-count) buff per the hard rule, not skipped. No noFb / hasPierce set (nothing in the prose licenses either); cadence tuple left at datamine values and flagged."
}
```

=====================================================================
## (7) DRIVER IMPLEMENTATION UNDER REVIEW
=====================================================================
--- driver test (scripts/tests/units/mint.test.ts) ---
```ts
// PER-UNIT KIT SPEC — `mint` (Mint, Supporter/RL/Iron, Burst II, cd 20s, ammo 6, chargeFrames 60).
// Kit-autonomy gauntlet 2026-07-25 (driver: Qwen). Test-FIRST: every FAITHFUL line is pinned GREEN
// vs the shipped override on disk and RED vs its nearest-wrong counterfactual.
//
// Kit (blablalink prose, data/characters.json → characters.mint.skills; level-10 values):
//   S1 ■ Full Charge while Assigned Part: Singing → all allies: ATK ▲45.02% of caster ATK / 3s   [M1]
//      ■ Full Charge while Assigned Part: Dancing → all allies: recover 1.8% caster Max HP/1s/3s  [UNMODELED — defensive heal, no HP pool]
//   S2 ■ entering Burst Stage 3 while NOT Sing Along → self: Cancels Singing / Cancels Dancing    [UNMODELED — mode bookkeeping, no dmg/buff]
//      ■ entering Burst Stage 3 while Singing → all allies: Crit Rate ▲19.94% / 10s               [M2]
//                                                              Projectile Explosion Dmg ▲50% / 10s [M2]
//                                                              Pierce Damage ▲32.72% / 10s         [M2]
//   BU ■ self: Assigned Part toggle (Singing<->Dancing, Status 1/2, "cannot be removed")          [UNMODELED — mode bookkeeping]
//      ■ all allies (Sing Along, UNCONDITIONAL): Attack Damage ▲30.02% / 10s                       [M3]
//                                                 Max Ammo Capacity ▲40% / 10s                     [M3]
//                                                 Critical Damage ▲45.05% / 10s                    [M3]
//
// THE MODE SYSTEM (Tier 2 — the meta-defining mechanic). Mint toggles an Assigned Part between
// Singing and Dancing on every burst (start -> Dancing, then Singing, Dancing, ...), so at steady
// state she is Singing ~50% of the time. Dancing's ONLY effect is the S1 heal (defensive, skipped),
// so the Dancing half contributes nothing to damage. The Singing-gated lines (M1 casterAtkPct, M2
// crit/projExpl/pierce) are therefore modeled at ~50% uptime by HALVING their values in the default
// `solo` mode (a steady-state reduction, NOT the full-uptime the raw parser would assume). The burst
// Sing Along buffs (M3) are UNCONDITIONAL — not Singing-gated — so they keep full value in every mode.
// The `duet (w/ Prika)` mode (Prydwen-confirmed: Prika's S2 locks Mint into permanent Singing) uses
// the FULL Singing values. M4 pins that mode split behaviourally: solo = half, duet = full, and the
// burst Sing Along is mode-INVARIANT (proving it is correctly NOT folded into the Singing gate).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   M1  nearest-wrong = the raw parser's full-uptime 45.02% in solo. Shipped solo must read exactly
//       HALF (22.51% of caster ATK); the full-value counterfactual must read 45.02% and so differ.
//       casterAtkPct is carried as a resolved FLAT ATK amount, so the percentage is recovered as
//       value / staticAtk × 100 (staticAtk is the caster's final ATK; the recovery is exact).
//   M2  nearest-wrong = full Singing values (19.94/50/32.72) in solo. Shipped solo must read the
//       halved 9.97/25/16.36; the full-value counterfactual must differ on all three stats.
//   M3  nearest-wrong = "everything is Singing-gated, so halve the burst too." Shipped must read the
//       FULL unconditional 30.02/40/45.05; a halved-burst counterfactual (15.01/20/22.525) must differ.
//       And these values must be IDENTICAL across solo and duet (mode-invariant) — the positive proof
//       that the burst is correctly outside the Singing gate.
//   M4  selecting `duet (w/ Prika)` must DOUBLE every Singing-gated line (M1 -> 45.02%, M2 -> full
//       19.94/50/32.72) while leaving M3 untouched. solo != duet on the gated lines, solo == duet on
//       the burst — the mode mechanic is live, not cosmetic.
//
// UNMODELED (inert / out-of-domain — documented, NOT asserted; see override.unmodeled + note):
//   - S1 Dancing heal (1.8% Max HP/1s/3s): defensive; the engine models no HP pool, so it is inert
//     for damage. (It would drive a Crown-style on-recovery consumer if one were present; none is in
//     this fixture.)
//   - S2 "Cancels Singing / Dancing" + burst Assigned Part toggle (Status 1/2): pure mode
//     bookkeeping with no damage or buff payload — folded into the mode system, not encodable as a
//     stat, and inert on the partless scope-lock boss.
//   - Pierce Damage (M2d) is faithfully encoded as a buff VALUE but is damage-INERT in engine v1 on
//     the partless boss (no Pierce tag consumer); M2 pins the buff magnitude, not downstream damage.
//
// RESIDUAL (⚑ estimate + recipe + tier, full in the override note): the 50%-uptime halving proxy
// assumes teammates' damage is spread evenly across Mint's Singing/Dancing cycles; if their damage
// clusters in windows that align (or misalign) with Singing, the true value differs (estimate: a few
// % at board level; recipe: a Mint-focus recording comparing Singing-window vs Dancing-window team
// damage; tier 2). The duet ROTATION (Prika takes burst 1, Mint every burst after) is driven from
// Prika's side and needs the comp to SELECT both duet modes; M4 isolates Mint's mode-block encoding
// alone (full values under duet selection) without depending on Prika's rotation plumbing.
//
// Fixture: liter (B1) / mint (B2) / ada (B3) / helm (B3), boss Fire, focus ada — the control-comp
// shape with mint swapped for crown so she is the sole B2 and casts every Full Burst cycle (a lone
// B2 unit makes zero Full Bursts, so a solo fixture could never exercise her burst- or stage-3-gated
// lines). Deterministic (no seed) → totals and buff values are byte-stable. MINT slot index = 1.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const MINT = 1;
const DUET = 'duet (w/ Prika)';
const COMP = {
  slugs: ['liter', 'mint', 'ada', 'helm'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
};

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}, modes?: Record<string, string>) {
  const events: SimEvent[] = [];
  const res = runComp({ ...COMP, overrides, modes, cfg: { onEvent: (e) => events.push(e) } });
  return { events, res };
}

// ---- counterfactual patches (nearest-wrong model each assertion must discriminate) ------------
/** M1 nearest-wrong: the raw parser's FULL-uptime Singing value in solo (45.02%, not halved). */
const mintFullS1 = withPatchedOverride('mint', (ov) => {
  const solo = ov.skill1.find((b: any) => b.mode === 'solo');
  const e = solo?.effects.find((x: any) => x.stat === 'casterAtkPct');
  if (!e) throw new Error('mint solo S1 casterAtkPct effect missing — fixture is stale');
  e.value = 45.02;
});
/** M2 nearest-wrong: FULL Singing values on the solo stage-3 trio (19.94 / 50 / 32.72). */
const mintFullS2 = withPatchedOverride('mint', (ov) => {
  const solo = ov.skill2.find((b: any) => b.mode === 'solo');
  if (!solo) throw new Error('mint solo S2 block missing — fixture is stale');
  const full: Record<string, number> = { critRatePct: 19.94, projectileExplosionPct: 50, pierceDamagePct: 32.72 };
  for (const e of solo.effects) if (e.stat in full) e.value = full[e.stat];
});
/** M3 nearest-wrong: "the burst is Singing-gated too" → halve the Sing Along trio. */
const mintHalvedBurst = withPatchedOverride('mint', (ov) => {
  const b = ov.burst[0];
  if (!b) throw new Error('mint burst block missing — fixture is stale');
  const half: Record<string, number> = { attackDamagePct: 15.01, maxAmmoPct: 20, critDamagePct: 22.525 };
  for (const e of b.effects) if (e.stat in half) e.value = half[e.stat];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(); // solo (default mode)
const fullS1 = run({ mint: mintFullS1 });
const fullS2 = run({ mint: mintFullS2 });
const halvedBurst = run({ mint: mintHalvedBurst });
const duet = run({}, { mint: DUET });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mintBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MINT && b.stat === stat);
const mintShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'mint');
const distinct = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.value))];
/** casterAtkPct is carried as a resolved flat ATK amount → recover the kit percentage. */
const pctOfCasterAtk = (bs: BuffApply[], atk: number) =>
  [...new Set(bs.map((b) => +(b.value / atk * 100).toFixed(6)))];
const reachesAllAllies = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort((a, b) => a - b);
const durations = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => (b.expiresFrame! - b.frame) / FPS))];

const mintAtk = unitOf(base.res, 'mint').staticAtk;
const mintAtkDuet = unitOf(duet.res, 'mint').staticAtk;

describe('mint — kit spec', () => {
  describe('M1 — S1 Singing Effect: ATK ▲45.02% of caster ATK, ~50% uptime in solo', () => {
    const applied = mintBuff(base.events, 'casterAtkPct');

    it('reads exactly HALF (22.51%) in the default solo mode, for 3s, on every ally', () => {
      expect(applied.length, 'no S1 casterAtkPct buff fired').toBeGreaterThan(0);
      expect(pctOfCasterAtk(applied, mintAtk)).toEqual([22.51]);
      expect(durations(applied)).toEqual([3]);
      expect(reachesAllAllies(applied)).toEqual([0, 1, 2, 3]);
    });

    it('fires on every full-charge pull (one application per ally per shot)', () => {
      expect(applied.length).toBe(mintShots(base.events).length * 4);
    });

    it('DISCRIMINATING: the raw parser\'s full-uptime 45.02% is NOT what ships', () => {
      const cf = pctOfCasterAtk(mintBuff(fullS1.events, 'casterAtkPct'), mintAtk);
      expect(cf).toEqual([45.02]);
      expect(cf).not.toEqual(pctOfCasterAtk(applied, mintAtk));
    });
  });

  describe('M2 — S2 Singing-gated stage-3 trio, ~50% uptime in solo (10s, all allies)', () => {
    it('reads the HALVED 9.97 / 25 / 16.36 in solo, once per burst, on every ally', () => {
      const crit = mintBuff(base.events, 'critRatePct');
      const proj = mintBuff(base.events, 'projectileExplosionPct');
      const pierce = mintBuff(base.events, 'pierceDamagePct');
      expect(distinct(crit)).toEqual([9.97]);
      expect(distinct(proj)).toEqual([25]);
      expect(distinct(pierce)).toEqual([16.36]);
      for (const bs of [crit, proj, pierce]) {
        expect(bs.length, 'a stage-3 trio buff did not fire').toBeGreaterThan(0);
        expect(durations(bs)).toEqual([10]);
        expect(reachesAllAllies(bs)).toEqual([0, 1, 2, 3]);
      }
      // one application per ally per burst cast
      const bursts = buffs(base.events).filter((b) => b.casterIdx === MINT && b.stat === 'attackDamagePct').length / 4;
      expect(crit.length).toBe(bursts * 4);
    });

    it('DISCRIMINATING: full Singing values (19.94 / 50 / 32.72) are NOT what ships in solo', () => {
      expect(distinct(mintBuff(fullS2.events, 'critRatePct'))).toEqual([19.94]);
      expect(distinct(mintBuff(fullS2.events, 'projectileExplosionPct'))).toEqual([50]);
      expect(distinct(mintBuff(fullS2.events, 'pierceDamagePct'))).toEqual([32.72]);
      expect(distinct(mintBuff(fullS2.events, 'critRatePct'))).not.toEqual(distinct(mintBuff(base.events, 'critRatePct')));
    });
  });

  describe('M3 — burst Sing Along trio is UNCONDITIONAL (full value, mode-invariant)', () => {
    const atk = mintBuff(base.events, 'attackDamagePct');
    const ammo = mintBuff(base.events, 'maxAmmoPct');
    const cd = mintBuff(base.events, 'critDamagePct');

    it('reads the FULL 30.02 / 40 / 45.05 in solo, for 10s, on every ally', () => {
      expect(distinct(atk)).toEqual([30.02]);
      expect(distinct(ammo)).toEqual([40]);
      expect(distinct(cd)).toEqual([45.05]);
      for (const bs of [atk, ammo, cd]) {
        expect(bs.length, 'a Sing Along buff did not fire').toBeGreaterThan(0);
        expect(durations(bs)).toEqual([10]);
        expect(reachesAllAllies(bs)).toEqual([0, 1, 2, 3]);
      }
    });

    it('is mode-INVARIANT: identical values under duet selection (NOT Singing-gated)', () => {
      expect(distinct(mintBuff(duet.events, 'attackDamagePct'))).toEqual([30.02]);
      expect(distinct(mintBuff(duet.events, 'maxAmmoPct'))).toEqual([40]);
      expect(distinct(mintBuff(duet.events, 'critDamagePct'))).toEqual([45.05]);
    });

    it('DISCRIMINATING: a Singing-gated (halved) burst 15.01 / 20 / 22.525 is NOT what ships', () => {
      expect(distinct(mintBuff(halvedBurst.events, 'attackDamagePct'))).toEqual([15.01]);
      expect(distinct(mintBuff(halvedBurst.events, 'attackDamagePct'))).not.toEqual(distinct(atk));
    });
  });

  describe('M4 — the mode system: duet (w/ Prika) uses FULL Singing values, solo halves', () => {
    it('DOUBLES the S1 Singing buff under duet (45.02% of caster ATK)', () => {
      const soloPct = pctOfCasterAtk(mintBuff(base.events, 'casterAtkPct'), mintAtk);
      const duetPct = pctOfCasterAtk(mintBuff(duet.events, 'casterAtkPct'), mintAtkDuet);
      expect(duetPct).toEqual([45.02]);
      expect(soloPct).toEqual([22.51]);
      expect(duetPct).not.toEqual(soloPct);
    });

    it('DOUBLES the S2 stage-3 trio under duet (full 19.94 / 50 / 32.72)', () => {
      expect(distinct(mintBuff(duet.events, 'critRatePct'))).toEqual([19.94]);
      expect(distinct(mintBuff(duet.events, 'projectileExplosionPct'))).toEqual([50]);
      expect(distinct(mintBuff(duet.events, 'pierceDamagePct'))).toEqual([32.72]);
      expect(distinct(mintBuff(duet.events, 'critRatePct'))).not.toEqual(
        distinct(mintBuff(base.events, 'critRatePct')),
      );
    });
  });
});

```

--- driver override (src/skills/overrides/mint.json) ---
```json
{
  "note": "Mode system: each burst toggles Mint's Assigned Part between Singing and Dancing (start -> Dancing on burst 1, then Singing, Dancing, Singing...), so at steady-state she is in Singing ~50% of the time. Dancing's only effect is a heal (Dancing Effect), which is defensive and skipped, so the Dancing half contributes nothing. Her Singing-gated buffs are therefore modeled at ~50% uptime by halving their values (a steady-state reduction, not the ignored full-uptime the raw parser assumes): S1 Singing Effect 45.02% of caster's ATK -> 22.51%; S2 (enter Burst Stage 3 while Singing) Crit Rate 19.94 -> 9.97, Projectile Explosion 50 -> 25, Pierce 32.72 -> 16.36. The burst's Sing Along buffs (Attack Damage 30.02%, Max Ammo 40%, Crit Damage 45.05%) are UNCONDITIONAL (not Singing-gated) so they keep full value — burst slot omitted, parser is faithful. The S2 'Cancels Assigned Part' and burst 'gains Assigned Part' lines are mode bookkeeping with no damage/buff and are dropped. APPROXIMATION: uptime-averaging a buff assumes teammates' damage is spread evenly across Mint's Singing/Dancing cycles; if their damage clusters in windows that align (or misalign) with Singing, the true value differs. Pierce is inert in v1 regardless. MODES ADDED (tier audit, Prydwen-confirmed): 'Prika's skill 2 now enforces Mint into a permanent Singing State' -> mode 'duet (w/ Prika)' uses FULL Singing values (45.02 casterAtk per full charge, crit 19.94 / projExpl 50 / pierce 32.72 on stage-3); mode 'solo' keeps the 50%-uptime halved values (she alternates Singing/Dancing every burst without Prika). [materialized 2026-07-16: burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] DUET ROTATION (owner-confirmed 2026-07-23): in graded comps containing BOTH mint and prika, prika takes the FIRST burst and MINT TAKES EVERY BURST AFTER — driven from prika's side by her duet-mode burstFirst + burstCdr -9999. It requires the comp to SELECT the duet modes; a harness that does not ran both units solo and reported mint artificially COLD (dashboard 0.755 vs the grading harness's 1.015) until scripts/lib/board-readings.ts was fixed on 2026-07-23. She currently reads 1.015 OK, so the ~50%-uptime halving proxy below is NOT visibly hurting her graded comp. Kit-autonomy gauntlet 2026-07-25: blind cross-family re-derivation (S2b claude-fable-5; S5/S6/S7 claude-opus-5) CONVERGED on all 9 damage-relevant lines — S1 Singing casterAtkPct 45.02% of CASTER ATK (flat = 0.4502 x staticAtk), S2 stage-3+Singing critRatePct 19.94 / projectileExplosionPct 50 / pierceDamagePct 32.72 (10s), and the burst Sing Along trio attackDamagePct 30.02 / maxAmmoPct 40 / critDamagePct 45.05 (10s, UNCONDITIONAL = mode-invariant, fires every Mint cast) — all FAITHFUL as shipped, pinned by scripts/tests/units/mint.test.ts (GREEN vs shipped + RED vs every named counterfactual: full-uptime S1, full-value S2, halved-burst). No value changes this pass (the encoding is faithful); the edit is this note + the provenance flip. TWO documented residuals (⚑ estimate+recipe+tier): (1) 50%-UPTIME MECHANISM — the Singing gate is a steady-state HALVING proxy (half value every rotation) + user-selectable solo/duet mode, NOT a dynamic burst-toggled part-state resource (which would also reproduce rotation-1 absence + even/odd parity); the cross-family blind derived the dynamic model and flagged the mode as nearest-wrong, but every magnitude agrees exactly and the proxy is owner-validated (graded comp 1.015 OK), so this is a disclosed approximation, not a fudge; estimate a few % at board level IF teammate damage clusters in/out of Singing windows; recipe = Mint-focus recording comparing Singing-window vs Dancing-window team damage; tier 2. (2) DANCING HEAL (1.8% Max HP/1s x3) stays UNMODELED — defensive, engine has no HP pool; its only damage channel is a Crown-style on-recovery consumer, a known cold bias (owner finding F1: 'crown recovery consumer never procs', hard rule 2); estimate small (heal-window recovery uptime on a consumer if one is graded); recipe = wire as a heal event (ticks:3 intervalSec:1, Dancing-gated) and measure the consumer's uplift; tier 2. The S2 'Cancels Assigned Part' block is an expressibility GAP (no self-buff-active gate) correctly OMITTED — when Mint casts every rotation (20s CD) her Sing Along is live at every stage-3 entry, so the cancel never fires; the dangerous misread (unconditional cancel stripping parts every rotation) is what the omit avoids.",
  "modes": ["solo", "duet (w/ Prika)"],
  "unmodeled": {
    "skill1": [
      "Full Charge in Assigned Part: Dancing: all allies recover 1.8% of caster's Max HP every 1 sec, lasts 3 sec."
    ],
    "skill2": [
      "Activates when entering Burst Stage 3 while not in Sing Along status: Cancels Singing and Dancing."
    ],
    "burst": [
      "Only one Assigned Part is applied according to Mint's current status.",
      "Status 1: If in the Assigned Part: Dancing status, Mint gains Assigned Part: Singing. This effect is continuous and cannot be removed.",
      "Status 2: If not in the Assigned Part: Dancing status, Mint gains Assigned Part: Dancing. This effect is continuous and cannot be removed."
    ]
  },
  "caveats": [
    "burst: unparsed effect \"Only one Assigned Part is applied according to Mint's current status.\"",
    "burst: unparsed effect \"Status 1: If in the Assigned Part: Dancing status, Mint gains Assigned Part: Singing. This effect is continuous and cannot be removed.\"",
    "burst: unparsed effect \"Status 2: If not in the Assigned Part: Dancing status, Mint gains Assigned Part: Dancing. This effect is continuous and cannot be removed.\""
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 22.51,
          "durationSec": 3
        }
      ],
      "mode": "solo"
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "allies"
      },
      "mode": "duet (w/ Prika)",
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 45.02,
          "durationSec": 3
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 9.97,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 25,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 16.36,
          "durationSec": 10
        }
      ],
      "mode": "solo"
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "stageEnter",
        "stage": 3
      },
      "target": {
        "kind": "allies"
      },
      "mode": "duet (w/ Prika)",
      "effects": [
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 19.94,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "projectileExplosionPct",
          "value": 50,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 32.72,
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 30.02,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "maxAmmoPct",
          "value": 40,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 45.05,
          "durationSec": 10
        }
      ]
    }
  ]
}

```

=====================================================================
## JUDGE: return the binding verdict JSON now.
=====================================================================
Adjudicate the two divergences explicitly. Key questions: (a) Are all damage-relevant kit lines accounted
for at faithful magnitudes? (b) Is the driver's steady-state HALVING proxy a legitimate disclosed
approximation of the 50%-duty-cycle Singing gate (given all three models agree no engine primitive expresses
the dynamic flip, the driver's proxy yields the correct fight-average, the blind's own static-singing mode
over-credits ~2x by its own admission, and the owner has validated the proxy at 1.015), or a faithfulness
failure requiring a fix? (c) Is the Dancing heal's UNMODELED disposition acceptable (defensive, no HP pool,
hard-rule-2, owner finding F1)? Flag any REAL-GOTCHA (fabricated/wrong magnitude, mis-scoped stat, invented
mechanic) — distinct from a modeling-depth residual. Every ⚑ must carry estimate+recipe+tier.
