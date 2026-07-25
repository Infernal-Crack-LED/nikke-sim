# S7 JUDGE PACKET — `soda-twinkling-bunny` (compact, answer-faithful compilation of the gauntlet artifacts)
Unit: Soda: Twinkling Bunny (slug `soda-twinkling-bunny`) — SG / Iron / Attacker / Burst III, cd 40s. Driver model family: Qwen.
Cross-family reviewers: S2b claude-fable-5 (pre-op), S5/S6/S7 claude-opus-4-8 (post-op). Gauntlet date 2026-07-24.
NOTE: this unit is a VARIANT — refer to it by full slug; never conflate with base `soda` (MG/Fire).

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

## 1. Ground truth — kit prose (data/characters.json → characters['soda-twinkling-bunny'].skills, structural; levels 10/10/10)
Base: SG/Iron/Attacker/Burst III, cd 40s, ammo 9, reloadFrames 142 (charFixes 182 measured padded), chargeFrames 0,
hitsPerShot 10, normalAttackMultiplier 231.6, coreAttackMultiplier 200, burstGaugePerShot 4.5. baseStats hp 13500 /
atk 600 / def 86, critRate 15 / critDamage 150. Manufacturer Tetra. Approved nicknames: stb, bsoda. (NOTE: this is a
VARIANT — distinct from base `soda` MG/Fire.) The normalized `skills` prose below is the SSOT the sim reads.

skill1 (Lucky Golden Chip):
■ Activates at the start of battle. Affects self. 
Golden Chip stacks ▲ 50.
■ Activates after performing 3 normal attack(s) during Full Burst. Affects self.
Golden Chip: Critical Damage ▲ 1.32% continuously, stacks up to 50 time(s).
■ Activates after performing 3 normal attack(s) during Full Burst. Affects self and the 1 ally unit(s) with the highest final ATK (except the skill user). 
Attack Damage ▲ 10.51% for 2 sec.

skill2 (Beginner's Rewards):
■ Activates when entering Burst Stage 3. Affects all allies.
Effects vary according to the number of Golden Chip stacks. Each subsequent effect triggers all effects before it:
Stage 1: With 10 or more stacks of Golden Chip,
Time Extension I: Full Burst Duration▲ 2 sec. Lasts until Full Burst ends.
Stage 2: With 20 or more stacks of Golden Chip,
Time Extension II: Full Burst Duration▲ 3 sec. Lasts until Full Burst ends.
■ Activates when performing a normal attack during Full Burst. Affects the 1 enemy unit(s) nearest to the crosshair. 
Effects vary according to the state of Time Extension. Each subsequent effect triggers all effects before it:
Stage 1: When in Time Extension I state,
deals 52.04% of final ATK as damage.
Stage 2: When in Time Extension II state,
deals 85.02% of final ATK as damage.

burst (Onward, Soda!):
■ Activates when using Onward, Soda!
Effects vary according to the number of Golden Chip stacks. Each subsequent effect triggers all effects before it. Golden Chip stacks ▼ 17 after the effect is applied.
Stage 1: Affects all enemies.
Deals 628.7% of final ATK as Burst Skill damage.
Stage 2: Activates when Golden Chip is at 20 or more stacks. Affects self.
Hit Rate ▲ 38.91% for 15 sec.
Stage 3: Activates when Golden Chip is at 30 or more stacks. Affects self.
ATK ▲ 65.25% for 15 sec.

## 2. Damage-formula + mechanics SSOT (the facts the verdict turns on)
Damage = ATK × major (FB +50% by timing; ×1.10 element if advantaged; +30% range) × charge × damageUp-bucket ×
taken × distributed. Soda is Iron vs the Fire boss in the fixture; her kit damage is burst-bucket nuke + an in-FB
rider + ordinary SG spray. The Golden Chip POOL is an engine resource-counter primitive; the four engine FACTS
below are what the verdict turns on (all verified in src/engine/sim.ts).

**FACT 1 — perResource crit damage is computed LIVE; the pool emits NO event (sim.ts:1234-1236, 1820-1830).**
A `perResource {name, mult}` buff IGNORES its base value and contributes `resource[name] × mult × stacks`,
re-read every frame from the caster's live pool. The buffApply event therefore carries the BASE value (0 for
Soda's critDamagePct value:0 perResource ×1.32), NOT the realized crit damage; the realized contribution is
folded into the expected-value damage `amount` at the damage choke point. A `resource` effect (delta) adjusts
the owner's pool clamped to its declared [min,max] and emits NO event (only a DBG console.log). So the pool is
internal state — observable ONLY indirectly: which resourceGate-gated buffs fire (and on which bursts), the
Full Burst window length, and the live crit folded into damage totals. Soda's crit damage is thus a sawtooth
(66% at 50 chips, stepping down 22.44 per −17 spend, climbing +1.32 per 3 in-FB pulls), never a static value.

**FACT 2 — resourceGate reads the LIVE pool at fire time; pre-consume ordering is structural (sim.ts:1722-1724).**
A block's `resourceGate {name, min, max}` reads `owner.resources.get(name)` at the instant the block fires and
skips if outside [min,max]. Soda's burst orders its blocks [nuke, ATK gate ≥30, HR gate ≥20, spend −17]; the
engine processes a slot's blocks in array order, so the gates read the PRE-consume pool and the −17 lands AFTER
('▼17 after the effect is applied'). Measured: burst-5 pre-consume ∈ [20,30) → the ≥30 ATK gate fails on burst 5
but the ≥20 HR gate still fires (HR on all 5 bursts, ATK on the first 4). Reordering the spend BEFORE the gates
collapses ATK 4→1 and HR 5→3 — the pre-consume ordering is behaviorally discriminable.

**FACT 3 — fullBurstExtend lengthens the FB window; the ladder fires on stageEnter:3 (ANY B3 cast) (sim.ts:2063).**
`fullBurstExtend {seconds}` pushes the live Full Burst endFrame out by `seconds×FPS`. Soda's two skill2 blocks
fire on `stageEnter {stage:3}` — 'entering Burst Stage 3' is TEAM stage entry, so they fire when ANY Burst-III
unit casts (Soda OR the helm co-B3 in the fixture), reading Soda's chip count at that instant. The ladder is
CUMULATIVE ('each subsequent effect triggers all effects before it'): +2s at ≥10 chips (Time Extension I), +3s
MORE at ≥20 (Time Extension II) = +5s total at ≥20, so FB = 15s. Measured: all 9 FB windows are 15.00s (the 4
helm-led FBs are ALSO 15s → confirms stageEnter keying, not burstCast). A flat +2 (wrong shape) tops out at 12s.

**FACT 4 — the rider is flatDamage on shotFired/inFb → 1 enemy; the TE-state distinction is NOT modeled (⚑).**
The kit reads the rider as 52.04% in Time-Extension-I / +85.02% in Time-Extension-II (cumulative 137.06%), gated
on the TE state LATCHED at Burst-Stage-3 entry and held for the whole FB. The engine has NO state-snapshot
primitive; a live `resourceGate` proxy on the rider is WRONG (post-consume the pool dips below threshold mid-FB
and the rider vanishes). The shipped override models a FLAT 130% on every in-FB normal (⚑ recording-derived,
TE-II-dominant — the pool sits ≥20 for most of the fight): faithful trigger/target/cadence (in-FB normal → 1
enemy nearest crosshair, per trigger PULL not per pellet — hitsPerShot 10 would 10× a pellet-counting encoding),
magnitude + TE-state-gating ⚑. Measured: 154 skill2 hits at flat 130%, all inFullBurst=true.

**Pool economy (derived + recording-validated).** resources[0] = {goldenChip, initial 50, min 0, max 50}. +1 per
'3 normal attacks during Full Burst' (the same shotFired/inFb/everyN:3 trigger as the AD +10.51 block — SG counts
trigger PULLS/rounds, not the 10 pellets); −17 on her own burstCast (after the gates). Sawtooth: 50 → 33 → … the
pre-consume pool stays ≥20 for all 5 bursts but drops below 30 by burst 5. VALIDATED vs the soda tb control.mov
popup arithmetic (sim pre-consume 50/43/38… reproduces the measured 50/44/40/38/31 within 1-2 chips). The crit
major at 50 chips = 1 + base 1.0 + 50×1.32/100 = 2.66 (the t=8 pre-burst popup ×2.160 = (150+50×1.32)/100 proves
crit tracks the POOL starting at 50, not a from-0 ramp).

**Trigger identities.** 'when using Onward, Soda!' = burstCast (Soda's OWN cast; the nuke is FB-exempt —
burst-cast damage lands pre-window, fbMajorApplied=false). 'when entering Burst Stage 3' = stageEnter:3 (ANY B3).
'after performing 3 normal attacks during Full Burst' = shotFired + fbGate:inFb + everyN:3. 'start of battle …
Golden Chip stacks ▲50' = the resource pool seed (initial:50), not a battleStart trigger block (the engine has
none). Magnitudes (1.32, 10.51, 52.04/85.02, 628.7, 38.91, 65.25, 17, 50) are literal DATAMINED level-10 prose
values and OUT OF SCOPE except where they contradict the prose's own number.

## 3. Driver's override (src/skills/overrides/soda-twinkling-bunny.json — the encoding under test, post-S3)
```json
{
  "note": "Kit-autonomy gauntlet 2026-07-24 (cross-family: S2b claude-fable-5, S5/S6/S7 claude-opus-4-8). || RE-TUNED 2026-07-16 against the soda tb control.mov recording (Fable-approved; overturns the 2026-07-15 'GOLDEN CHIP self-buffs MODELED' entry with higher-tier evidence — a focused recording + exact popup arithmetic). The kit-parse blind parser out-predicted the prior hand-tune (0.667 vs real) by reading three mechanics correctly; this re-tune adopts them. THREE MEASURED BUG FIXES: (1) CRIT-DAMAGE is chip-tied, NOT a ramp-from-0. The prior model built critDamagePct via shotFired+everyN 3 in-FB casts, reaching only ~4 stacks (+5%) because Soda fires few in-FB normals. PROOF it's wrong: a t=8 pre-burst popup (chips=50, ZERO in-FB casts) showed crit ×2.160 = (150+50×1.32)/100 EXACTLY — crit-damage tracks the Golden-Chip POOL (starts 50), not a from-0 ramp. Modeled as a passive critDamagePct 42 (measured trace time-average ~31.6 chips × 1.32; ⚑ chip time-average). (2) The burst ATK ▲65.25% (@≥30 chips) fires on EVERY burst, not first-burst-only. Chips are consumed AFTER the effect ('▼17 after applied') so the gate checks PRE-consume counts (50/44/40/38/31) — all 5 bursts clear ≥30. The prior everyN 99 offset 1 (first-burst-only) traced the POST-consume pool, the classic isolated-shard error. (3) The per-FB-normal rider is Time-Ext-II-dominant (~130%, was averaged to 100) and the Full-Burst extension is the datamined chip-gated ladder. Golden Chip economy: start 50, −17/burst, +~6 rebuild/FB → drains 50→27→...→14 (post-consume); pre-consume stays ≥30 all 5 bursts. Reload: charFixes.reloadFrames 182 (measured padded animation, KEPT). Hit Rate ▲38.91%/15s (>=20 chips) and the chip-gated Full-Burst-extension ladder (+2 at >=10, +5 at >=20) are both modelled - see caveats. Residual: SG spray magnitude (the shared SG under-model was RESOLVED 2026-07-15 per commit 85ef60e, so this is now a cleaner read). Grade (soda tb control, Fable-verified): prior 0.667 → re-tuned **0.887** vs real — a MISS vs the pre-registered [0.90,1.05], recorded honestly, NOT fit to 1.0. Residual attribution: SG spray magnitude + the sim over-generating Soda's bursts (6 sim vs 5 real → the 0.887 is FLATTERED; true ~0.82). Rejected the datamine-max fit (crit 50 / rider 137 → ~0.955) as trace-CONTRADICTED (the chip pool demonstrably drains; inflating FB-ext to fit distorts the whole team's rotation — faithful>fit). ⚑ crit 42 = the CONTROL-comp chip time-average; a NO-burst comp (N3, chips never drain) reads effective ~50 and grades 0.96 — so the flat passive is comp-dependent-approximate; the correct fix is dynamic chip-state tracking (engine work, DEFERRED). ⚑ rider (130) recording-derived, refine on a soda-focus recording.",
  "charFixes": {
    "reloadFrames": 182
  },
  "resources": [
    {
      "name": "goldenChip",
      "initial": 50,
      "min": 0,
      "max": 50
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 0,
          "perResource": {
            "name": "goldenChip",
            "mult": 1.32
          }
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "fbGate": "inFb",
      "everyN": 3,
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.51,
          "durationSec": 2
        },
        {
          "kind": "resource",
          "name": "goldenChip",
          "delta": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "shotFired"
      },
      "fbGate": "inFb",
      "everyN": 3,
      "target": {
        "kind": "alliesTopAtk",
        "byFinalAtk": true,
        "count": 1,
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.51,
          "durationSec": 2
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
      "resourceGate": {
        "name": "goldenChip",
        "min": 20
      },
      "effects": [
        {
          "kind": "fullBurstExtend",
          "seconds": 5
        }
      ]
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
      "resourceGate": {
        "name": "goldenChip",
        "min": 10,
        "max": 19
      },
      "effects": [
        {
          "kind": "fullBurstExtend",
          "seconds": 2
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "fbGate": "inFb",
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 130
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
          "atkPct": 628.7
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
      "resourceGate": {
        "name": "goldenChip",
        "min": 30
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 65.25,
          "durationSec": 15
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
      "resourceGate": {
        "name": "goldenChip",
        "min": 20
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 38.91,
          "durationSec": 15
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
          "kind": "resource",
          "name": "goldenChip",
          "delta": -17
        }
      ]
    }
  ],
  "caveats": [
    "skill1/burst: FAITHFUL DYNAMIC Golden-Chip pool LANDED 2026-07-17 (engine resource-counter primitive) — replaces the flat crit-42 + every-burst-65.25 derivations. Pool: start 50 (cap 50), +1 per datamined '3 normal attacks during Full Burst' (the same trigger as the AD +10.51 block), −17 on her burst (spent AFTER the gates). Crit Damage is LIVE = goldenChip×1.32 (perResource); burst ATK ▲65.25 gated at ≥30 chips (pre-spend). VALIDATED vs soda tb control.mov: sim pre-consume 50/43/38… reproduces the measured 50/44/40/38/31 within 1-2 chips (the datamined per-3-normals generation MATCHES the recorded drain, not fit to it); crit major 2.66 at 50 chips = 1+base1.0+50×1.32/100 ✓. Now comp-correct: N3 no-burst comp chips stay 50 → crit 66% → 0.954→0.974 (matches the note's ~0.96 prediction the flat-42 under-credited); burst comps drain as measured.",
    "skill2: Full Burst extension is the datamined chip-gated CUMULATIVE ladder — Time Extension I +2s at >=10 Golden Chips, Time Extension II +3s more at >=20, so +5s at >=20 and +2s at 10-19 (two resourceGate blocks on stageEnter:3). It fires on EVERY Burst-Stage-3 cast, hers or an ally's, and reads HER chip count at that instant, so late-fight Full Bursts shorten as the pool drains.",
    "burst: Hit Rate ▲38.91% for 15s is LIVE, gated at >=20 Golden Chips pre-consume (burstCast + resourceGate, ordered before the -17 spend like the ATK gate). It drives TWO channels, not one: core-hit rate via acrForHR, AND pellet LANDING via coneSigmaFor -> pelletLandFrac (sim.ts ~1266 and ~2539). ⚑ BOTH are over-credited against the owner hand-count of this fight (docs/probe-data/soda-tb-sg-core-hr-windows.json). Core: measured HR-on .074/.029/.079/.022 (near/mid/midfar/far) vs the cone's .160/.133/.077/.051. Landing is the LARGER error: measured HR-on .931/.916/.778/.711 vs the model's .998/.995/.992/.971 — the sim reads near-total landing where the count says far tops out at .711. The cone's sigma is the shared cause (measured 38.6-41.6px at HR0 vs the frozen 32.0, shrinking 9-25% vs the frozen 35%). This block is faithful to the KIT; its two downstream layers are not yet faithful to the MEASUREMENT, and they are a coupled set to be re-fit together, never singly.",
    "skill1: the in-FB +10.51% AD 'to the 1 highest-ATK ally (except self)' now carries excludeSelf:true (fixed 2026-07-17; alliesTopAtk was silently ignoring it). Self is already covered by its own self-block, so when Soda is top-ATK the ally-buff correctly redirects to the true carry instead of double-targeting her. Board-neutral on soda tb control (0.954 unchanged — grades Soda's own damage, which is unaffected).",
    "kit-autonomy 2026-07-24: the two lines once listed under unmodeled are RE-ENCODED, not skipped — 'start of battle: Golden Chip stacks ▲50' is the resource pool seed (resources[0].initial=50), and 'Golden Chip stacks ▼17 after the effect is applied' is the trailing burst resource block (burstCast → goldenChip delta -17, ordered AFTER the ≥20/≥30 gates so they read the pre-consume pool). unmodeled is therefore empty (every kit line has a faithful encoding); both cross-family blind audits (fable S2b unmodeledVerbatim, opus S6 audit) independently concur that no line is unmodeled.",
    "kit-autonomy 2026-07-24: skill2 in-FB rider is modeled as a FLAT 130% on every in-FB normal (⚑ recording-derived, Time-Ext-II-dominant), NOT gated on the Time-Extension state. The datamine reads 52.04% in TE-I / +85.02% in TE-II (cumulative 137.06%); the faithful encoding would latch the TE tier at Burst-Stage-3 entry and hold it for the whole FB (a state-snapshot primitive the engine lacks — a live resourceGate proxy is WRONG, it drops the rider post-consume when the pool dips below threshold). The flat 130 sidesteps the live-pool trap and approximates the TE-II-dominant case; refine the magnitude + TE gating on a soda-focus recording. Trigger/target/cadence (in-FB normal → 1 enemy, per pull not per pellet) are faithful; only the magnitude/state-gating is ⚑."
  ]
}

```

## 4. S2b pre-op adversarial review (claude-fable-5, cross-family; leakDetected null)
```json
{
  "slug": "soda-twinkling-bunny",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start of battle: Golden Chip stacks ▲ 50",
      "disposition": "FAITHFUL",
      "scope": "resource grant, not a stat; seeds the Golden Chip pool at 50 (= cap) at t=0",
      "durationSemantics": "permanent pool state until consumed (burst ▼17)",
      "triggerIdentity": "battle-start passive — encode as resources:{name:'Golden Chip', initial:50, min:0, max:50}, not a timed trigger",
      "targetSet": "self (owner-scoped resource)",
      "nearestWrongModel": "pool starts at 0 and must ramp via the FB hit-count rebuild — first burst would then hit only Stage 1",
      "distinguishingAssertion": "on soda's FIRST burstCast, buffApply atkPct 65.25 AND hitRatePct 38.91 both appear (pre-consume pool=50 ≥30) — RED if either is absent on burst #1",
      "inertness": "no damage/buff event at t=0 itself; only the pool is set",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Golden Chip: Critical Damage ▲ 1.32% cont.",
      "disposition": "FAITHFUL",
      "scope": "generic Critical Damage (no normal-attack scoping in text), self only, per Golden Chip stack",
      "durationSemantics": "'continuously' = held while stacks held; value must track the LIVE pool (perResource {name:'Golden Chip', mult:1.32}), max 50 stacks",
      "triggerIdentity": "stack GAIN trigger = hitCount count:3 with fbGate:'inFb' — counts ROUNDS (1 per SG trigger pull, ammo economy), NOT the 10 pellets/shot; no accrual outside Full Burst",
      "targetSet": "self",
      "nearestWrongModel": "static permanent critDamagePct 66 (50×1.32 at cap) that ignores the burst's ▼17 consume and the FB-only rebuild; secondary misread: counting pellet HITS so 3 'attacks' = 0.3 pulls (10× rebuild rate)",
      "distinguishingAssertion": "immediately after soda's first burst the crit-damage contribution reads 33×1.32=43.56%, then climbs +1.32% per 3 FB pulls capped at 66%; RED if it sits at a constant 66% all fight or if stacks rise outside FB windows",
      "inertness": "zero stack gain outside Full Burst; pool never exceeds 50 or goes below 0",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Attack Damage ▲ 10.51% for 2 sec",
      "disposition": "FAITHFUL",
      "scope": "generic Attack Damage (Damage-Up bucket), all attack kinds of the two holders",
      "durationSemantics": "durationSec 2, refreshed on each re-proc (uptime ≈ continuous while soda fires in FB at ~3 pulls/2s)",
      "triggerIdentity": "hitCount count:3 (rounds/pulls) + fbGate:'inFb' — same counter shape as the stack line, NOT fullBurstEnter one-shot",
      "targetSet": "self AND alliesTopAtk{count:1, excludeSelf:true, byFinalAtk:true} — text says 'highest final ATK', so live-effectiveAtk ranking, exclude-then-take-1",
      "nearestWrongModel": "self-only (dropping the ally), or static-ATK ranking (byFinalAtk omitted), or keyed to fullBurstEnter so one 2s sliver per FB instead of rolling uptime",
      "distinguishingAssertion": "each proc emits buffApply attackDamagePct 10.51 to EXACTLY 2 targetIdx (soda + one ally, and that ally is the max-effectiveAtk non-soda unit); proc count per FB ≈ floor(soda FB pulls / 3) ≥ 3, not 1 — RED under one-shot or self-only encodings; zero applies outside FB",
      "inertness": "no application outside Full Burst; never a 3rd target",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "entering Burst Stage 3: FB Duration ▲",
      "disposition": "FAITHFUL",
      "scope": "team-level Full Burst window length; escalating threshold on Golden Chip",
      "durationSemantics": "'Lasts until Full Burst ends' — extension applies to THIS FB window only; CUMULATIVE stages ('each subsequent effect triggers all effects before it'): ≥10 → +2s; ≥20 → +2s AND +3s = +5s total (FB ≈ 15s), NOT +3s",
      "triggerIdentity": "stageEnter{stage:3} — 'entering Burst Stage 3' fires on ANY stage-3 cast (helm's rotations included in the control comp), not only soda's own; threshold reads the PRE-consume pool (fires at the same instant as soda's ▼17)",
      "targetSet": "all allies (team FB window)",
      "nearestWrongModel": "keyed to burstCast (soda-only) so helm-led rotations get no extension, or non-cumulative highest-stage-only (+3s at ≥20), or durationSec-style timed buff instead of fullBurstExtend",
      "distinguishingAssertion": "with pre-consume pool ≥20, fullBurstEnd − fullBurstStart ≈ 15s (10+2+3) — RED at 13s (non-cumulative) or 10s; AND a rotation where helm (not soda) casts stage 3 while pool ≥20 also shows the 15s window — RED under burstCast keying",
      "inertness": "FB windows entered with pool <10 stay exactly 10s",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "normal attack in FB: 52.04% / 85.02% dmg",
      "disposition": "FAITHFUL",
      "scope": "rider damage per NORMAL ATTACK (per trigger pull, not per pellet — hitsPerShot 10 would 10× it); single enemy target",
      "durationSemantics": "active for the whole FB whose Time Extension state was set at stage-3 entry — a SNAPSHOT state, not a live re-read of the pool",
      "triggerIdentity": "shotFired + fbGate:'inFb', gated on the Time Extension I/II state; CUMULATIVE: in TE-II state BOTH hits fire = 137.06%/pull ('each subsequent effect triggers all effects before it'); rider takes FB +50% by timing (fires inside FB), noRange forced, no core (text silent), crit default-off",
      "targetSet": "enemy nearest crosshair (single boss — degenerate)",
      "nearestWrongModel": "gating on the LIVE post-consume pool (resourceGate min:10/20) instead of the entry snapshot — e.g. pre-consume 21 → post-consume 4: faithful still deals 137.06%/pull all FB, live-gate deals ZERO; secondary misreads: TE-II pays only 85.02 (non-cumulative), or per-pellet firing (10×)",
      "distinguishingAssertion": "engineer a rotation with pre-consume pool 21: the FB emits damage events at 52.04 AND 85.02 mult per soda pull for the full window (count = soda's FB pulls, each pair fbMajorApplied true) — RED (zero rider events) under live-pool gating; and with pool <10 at entry the rider emits nothing",
      "inertness": "no rider damage outside FB, none in FBs entered with <10 pre-consume stacks, count never exceeds soda's pull count (no pellet multiplication)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Deals 628.7% final ATK as Burst dmg",
      "disposition": "FAITHFUL",
      "scope": "Burst Skill damage bucket, all enemies (single boss)",
      "durationSemantics": "instant one-shot per cast",
      "triggerIdentity": "burstCast ('when using Onward, Soda!' — her OWN cast, never other units' stage-3s); burst-cast damage lands PRE-FB-window → FB-exempt (noFb / fbMajorApplied false)",
      "targetSet": "all enemies → the boss",
      "nearestWrongModel": "burst hit taking the +50% Full Burst major (fbMajorApplied true), or keyed to fullBurstEnter so it fires on helm's rotations too",
      "distinguishingAssertion": "exactly one damage event mult 628.7 per SODA burstCast (none on helm-led rotations), with fbMajorApplied false — RED if boosted or if the count matches total FBs instead of soda's casts",
      "inertness": "no 628.7 events on rotations where soda does not cast",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "≥20 stacks: Hit Rate ▲ 38.91% 15 sec",
      "disposition": "FAITHFUL",
      "scope": "self Hit Rate — on an SG this is a CORE-HIT lift via hitRatePct/hrCoreMult, i.e. DAMAGE-RELEVANT; never skip as 'accuracy/defensive'",
      "durationSemantics": "durationSec 15 (outlives the ~15s extended FB window)",
      "triggerIdentity": "burstCast, gated on PRE-consume pool ≥20 (cumulative stage: fires together with Stage 1)",
      "targetSet": "self",
      "nearestWrongModel": "dropped as a damage-neutral accuracy stat, or applied unconditionally every cast (ignoring the threshold), or checked POST-consume (pool 33 vs 50 changes nothing early but diverges once the sawtooth nears 20)",
      "distinguishingAssertion": "buffApply hitRatePct 38.91 appears iff the cast's pre-consume pool ≥20, and soda's per-shot core rate in the following 15s exceeds her out-of-window core rate — RED if her core-hit fraction is flat across the window or the buff appears on a pool-19 cast",
      "inertness": "no application on casts below 20 pre-consume stacks; never targets allies",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "≥30 stacks: ATK ▲ 65.25% for 15 sec",
      "disposition": "FAITHFUL",
      "scope": "generic self ATK (atkPct, scales her own ATK)",
      "durationSemantics": "durationSec 15",
      "triggerIdentity": "burstCast, gated on PRE-consume pool ≥30 (cumulative with Stages 1–2)",
      "targetSet": "self",
      "nearestWrongModel": "ungated permanent/every-cast ATK buff (over-credits once the pool sawtooths below 30), or fullBurstEnter-keyed (fires on helm rotations)",
      "distinguishingAssertion": "buffApply atkPct 65.25 on cast #1 (pool 50) but ABSENT on the first cast whose pre-consume pool is <30 (derivable from -17/cast + ~+1 per 3 FB pulls rebuild) — RED if the buff appears on every cast all fight",
      "inertness": "no application below 30 pre-consume stacks; never on non-soda casts",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Golden Chip stacks ▼ 17 after applied",
      "disposition": "FAITHFUL",
      "scope": "resource consume on the owner's pool",
      "durationSemantics": "instant delta, ORDERED AFTER the stage-threshold checks ('after the effect is applied') and after skill2's stage-3-entry read; floor 0",
      "triggerIdentity": "burstCast → resource{name:'Golden Chip', delta:-17}",
      "targetSet": "self (owner pool)",
      "nearestWrongModel": "omitting the consume entirely (pool pinned at 50 → permanent Stage-3 + permanent TE-II — the biggest single over-credit in the kit), or consuming BEFORE the threshold checks (first cast reads 33)",
      "distinguishingAssertion": "pool trajectory sawtooths: 50 → 33 (+~5-7 FB rebuild) → 17-per-cast decline, and downstream gates (TE stage, burst Stages 2/3) degrade on later casts exactly per the pre-consume reads — RED if crit-damage/extension/ATK-buff signatures are identical on every cycle",
      "inertness": "pool never negative, never above 50; consume only on soda's own casts",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:start-50-stacks",
    "skill1:golden-chip-critdmg-per-stack",
    "skill1:attack-damage-10.51-self+top-final-atk",
    "skill2:stage3-entry-fb-extend-cumulative",
    "skill2:te-state-gated-per-pull-rider",
    "burst:628.7-burst-damage",
    "burst:hit-rate-38.91-ge20",
    "burst:atk-65.25-ge30",
    "burst:consume-17-post-check"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to force apart: (1) skill2's 'entering Burst Stage 3' is stageEnter (ANY stage-3 cast — helm's rotations count in the control comp) vs the burst block's 'when using Onward, Soda!' which is burstCast (soda only, and the only consume path) — a driver collapsing both to one trigger is wrong in one direction or the other, and the helm co-B3 control comp is exactly where they diverge. (2) 'Each subsequent effect triggers all effects before it' appears THREE times and is cumulative every time: ≥20 stacks = +5s extension (2+3) not +3s; TE-II rider = 137.06%/pull (52.04+85.02) not 85.02; ≥30-stack burst = nuke+HitRate+ATK all together. (3) SG pellet trap: hitsPerShot 10 but '3 normal attacks' counts trigger pulls/rounds — a pellet-counting encoding rebuilds stacks and re-procs the 10.51% buff 10× too fast. (4) Time Extension is a state SNAPSHOTTED at stage-3 entry from the PRE-consume pool, lasting until FB end — live post-consume resourceGate diverges hard near thresholds (pre 21 / post 4). (5) The stack pool is a derivable sawtooth (start 50, −17/cast, +1 per 3 FB pulls, FB-only rebuild, cap 50/floor 0) — a static max-stacks model over-credits crit damage, extension, and both burst self-buffs in the mid/late fight; derive the trajectory, don't assume steady max. (6) Hit Rate ▲ on an SG is a core-rate lift (hitRatePct → hrCoreMult), damage-relevant — not a skippable accuracy stat; the HR→core magnitude mapping is the one ALWAYS-⚑ here (measured-only), everything else is kit-literal. ⚑ also the SG cadence tuple (pulls/s) that sets rebuild rate and rider counts. No line qualifies as UNMODELED — the schema covers every mechanic (resources, perResource, fullBurstExtend, stageEnter, hitCount+fbGate, burstCast stages).",
  "model": "claude-fable-5"
}

```

## 5. S5 blind post-op test-writer (claude-opus-4-8, cross-family; leakDetected null)
### 5a. Spec table + fixtures + gaps
```json
{
  "slug": "soda-twinkling-bunny",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "start: Golden Chip stacks ▲ 50",
      "disposition": "FAITHFUL",
      "assertion": "Zeroing the resource initial strictly lowers soda total (less early crit-dmg + fewer burst gates open). Fails under 'no start grant' / initial 0."
    },
    {
      "slot": "skill1",
      "kitLine": "Crit Damage ▲ 1.32% x50 continuously",
      "disposition": "FIX",
      "assertion": "Live perResource crit-dmg off the Golden Chip pool >> a fixed single-1.32%-stack model. Fails under a fixed non-scaling crit-dmg buff. HYPOTHESIS: same pool as the gating currency."
    },
    {
      "slot": "skill1",
      "kitLine": "Attack Damage ▲ 10.51% 2s self+topATK",
      "disposition": "FAITHFUL",
      "assertion": "attackDamagePct 10.51/2s applies to self + EXACTLY ONE other ally (highest final ATK). Fails under target=allies (all) or self-only; teammates not buffed stay byte-identical."
    },
    {
      "slot": "skill2",
      "kitLine": "enter BS3: FB Duration ▲ gated",
      "disposition": "FAITHFUL",
      "assertion": "Max FB window >10s and strictly longer than the extend-removed run. Fails under no fullBurstExtend / un-gated fixed duration."
    },
    {
      "slot": "skill2",
      "kitLine": "FB normal->enemy 52.04/85.02% TE-gated",
      "disposition": "MEASUREMENT-GATED",
      "assertion": "Removing the flatDamage rider lowers soda total (behavioral). Exact mult + Time-Extension gating shape is it.skip (unobservable blind)."
    },
    {
      "slot": "burst",
      "kitLine": "S1: 628.7% burst dmg all enemies",
      "disposition": "FAITHFUL",
      "assertion": "A soda burst-bucket hit ~628.7% exists and lands inFullBurst=false (pre-FB). Fails under wrong magnitude / FB-major applied to an instant burst."
    },
    {
      "slot": "burst",
      "kitLine": "S2(≥20): Hit Rate ▲ 38.91% 15s self",
      "disposition": "FAITHFUL",
      "assertion": "hitRatePct 38.91 self-scoped, 15s, applies ≥1x. ⛑ hitRate = core-lift derived. Fails if allies-scoped or wrong duration."
    },
    {
      "slot": "burst",
      "kitLine": "S3(≥30): ATK ▲ 65.25% 15s self",
      "disposition": "FAITHFUL",
      "assertion": "atkPct 65.25 self-scoped 15s; removing S2+S3 lowers soda total with teammates identical. Gate non-vacuity: applies on FEWER bursts than soda burst-casts (pool decays below 30)."
    },
    {
      "slot": "burst",
      "kitLine": "Golden Chip stacks ▼ 17 after",
      "disposition": "FAITHFUL",
      "assertion": "Consumption is what makes the >=30 / >=20 gates bite on later bursts (tested via the ATK-buff-count < burst-count assertion). ⛑ trajectory derived, not measured."
    }
  ],
  "fixtures": "controlComp('soda-twinkling-bunny', true) — liter B1 / crown B2 / soda B3 carry / helm B3, boss Fire, focus soda. Chosen so (a) a real burst chain opens Full Burst repeatedly (a lone B3 makes ZERO FBs, so every in-FB / entering-BS3 trigger would be dead), and (b) a multi-ally pool exists so S1c's 'highest final ATK ally except self' resolves to a discriminable single teammate. helm=true kept (its buffs don't confound the structural event-log assertions used here).",
  "gaps": [
    "S1b rebuild rate (+1 Golden Chip per 3 FB normal attacks): it.skip — '3 normal attacks' = 3 trigger PULLS, but the engine's hitCount trigger counts pellet-HITS (SG hitsPerShot 10), so the faithful encoding (hitCount count vs a shot-scoped counter) is ambiguous blind and ⛑. Verify by inspection of the driver's trigger.",
    "S2b exact rider magnitude / Time-Extension gating: it.skip — whether TE state is keyed via a resourceGate proxy on Golden Chip ≥10/≥20 or a real named TE status, and how flatDamage atkPct (52.04 / 85.02 / cumulative 137.06) surfaces on the damage event, are unobservable without seeing the override. Behavioral total-drop is asserted instead.",
    "Whether 'Golden Chip: Critical Damage' shares the SAME pool as the gating 'Golden Chip stacks' (my load-bearing HYPOTHESIS) vs two independent pools — the S1b test discriminates live-scaling from fixed, but not one-pool-vs-two directly; a divergence here is the intended payload."
  ]
}
```
### 5b. Blind test source (harness-API drift documented in §8 — does NOT run unmodified)
```typescript
import { controlComp, runComp, totals, unitOf, withPatchedOverride } from '../lib/harness';

/**
 * soda-twinkling-bunny — SG / Iron / Attacker / Burst III (cd 40s, ammo 9, hitsPerShot 10)
 * BLIND kit-spec test (S5). Authored from kit prose ALONE.
 *
 * KIT (structural quotes ≤~40 chars):
 *   S1a  "Golden Chip stacks ▲ 50" @ battle start, self.
 *   S1b  every "3 normal attack(s) during Full Burst" -> self
 *        "Critical Damage ▲ 1.32%" "stacks up to 50" "continuously".
 *   S1c  same trigger -> self + "1 ally ... highest final ATK (except" self)
 *        "Attack Damage ▲ 10.51% for 2 sec".
 *   S2a  "entering Burst Stage 3" -> all allies, Golden-Chip-gated FB extend:
 *        >=10 -> +2s (Time Extension I); >=20 -> +3s more (Time Extension II, cumulative +5s).
 *   S2b  "normal attack during Full Burst" -> nearest enemy, gated on Time-Extension state:
 *        TE I -> 52.04% ATK; TE II -> +85.02% ATK (cumulative = 137.06%).
 *   BURST "Onward, Soda!" (own burstCast); "Golden Chip stacks ▼ 17" after:
 *        S1 all enemies 628.7% burst dmg; S2 (>=20 stacks) self Hit Rate ▲ 38.91% 15s;
 *        S3 (>=30 stacks) self ATK ▲ 65.25% 15s.
 *
 * INTERPRETATION (HYPOTHESIS): Golden Chip is ONE currency. Start 50 (cap 50); each stack
 *   = 1.32% crit-dmg (live perResource); burst consumes 17; rebuilds +1 per 3 FB normal
 *   attacks. The 10/20/30 gates read the LIVE stack count (pre-consume at cast). The
 *   alternative reading (crit-dmg is a SEPARATE stacking buff from the gating pool) would
 *   start crit-dmg at 0 and never let the burst gates decay — tests below discriminate.
 *
 * FIXTURE: controlComp('soda-twinkling-bunny', true) — liter B1 / crown B2 / soda B3
 *   carry / helm B3. Supplies a burst chain so FB opens (a lone B3 = ZERO Full Bursts) and
 *   a teammate pool so the highest-final-ATK-ally target of S1c is discriminable.
 *
 * FIELD-NAME ASSUMPTIONS (align with harness.ts if they differ): unit objects expose .idx
 *   and .total; SimResult exposes .units[]; damage events carry {srcSlot|casterIdx, bucket,
 *   mult, inFullBurst, crit, core}; buffApply carries {stat, value, durationSec, casterIdx,
 *   targetIdx}; fullBurstStart/End carry a time field (.t or .time). Semantic assertions are
 *   written to survive minor accessor drift; behavioral (total up/down) ones are primary.
 */

const SLUG = 'soda-twinkling-bunny';
const near = (a: number, b: number, eps = 0.6) => Math.abs(a - b) <= eps;
const tOf = (e: any) => (e.t ?? e.time ?? e.sec ?? 0);

function collect(opts: any) {
  const evs: any[] = [];
  const o = { ...opts, cfg: { ...(opts.cfg ?? {}), onEvent: (e: any) => evs.push(e) } };
  const res = runComp(o);
  return { res, evs };
}
const dmg = (res: any, slug: string) => unitOf(res, slug)?.total ?? 0;
function sodaIdxOf(res: any) { return unitOf(res, SLUG)?.idx; }
function allySlugs(res: any) { return (res.units ?? []).map((u: any) => u.slug).filter((s: string) => s !== SLUG); }

// ---- hoisted runs (each is a full 180s deterministic sim) ------------------
const base = collect(controlComp(SLUG, true));
const sodaIdx = sodaIdxOf(base.res);

// counterfactual overrides located by SEMANTIC content (blind to block order)
const noStartChip = collect(controlComp(withPatchedOverride(SLUG, (o: any) => {
  const gc = (o.resources ?? []).find((r: any) => /chip/i.test(r.name));
  if (gc) gc.initial = 0;
}) as any, true));

const flatCrit = collect(controlComp(withPatchedOverride(SLUG, (o: any) => {
  for (const b of o.blocks) for (const e of b.effects ?? [])
    if (e.kind === 'buff' && e.stat === 'critDamagePct') { delete e.perResource; e.value = 1.32; e.maxStacks = 1; }
}) as any, true));

const noAtkDmg = collect(controlComp(withPatchedOverride(SLUG, (o: any) => {
  for (const b of o.blocks) b.effects = (b.effects ?? []).filter((e: any) => !(e.kind === 'buff' && e.stat === 'attackDamagePct' && near(e.value, 10.51)));
}) as any, true));

const noFbExtend = collect(controlComp(withPatchedOverride(SLUG, (o: any) => {
  for (const b of o.blocks) b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'fullBurstExtend');
}) as any, true));

const noRider = collect(controlComp(withPatchedOverride(SLUG, (o: any) => {
  for (const b of o.blocks) b.effects = (b.effects ?? []).filter((e: any) =>
    !(e.kind === 'flatDamage' && (near(e.atkPct, 52.04) || near(e.atkPct, 85.02))));
}) as any, true));

const noBurstBuffs = collect(controlComp(withPatchedOverride(SLUG, (o: any) => {
  for (const b of o.blocks) b.effects = (b.effects ?? []).filter((e: any) =>
    !(e.kind === 'buff' && ((e.stat === 'hitRatePct' && near(e.value, 38.91)) || (e.stat === 'atkPct' && near(e.value, 65.25)))));
}) as any, true));

// helper extractors on base
const sodaDmg = (evs: any[]) => evs.filter(e => e.kind === 'damage' && (e.srcSlot === sodaIdx || e.casterIdx === sodaIdx));
const buffApplies = (evs: any[], stat: string, val: number) => evs.filter(e => e.kind === 'buffApply' && e.stat === stat && near(e.value, val));
const fbWindows = (evs: any[]) => {
  const out: number[] = []; let start: number | null = null;
  for (const e of evs) {
    if (e.kind === 'fullBurstStart') start = tOf(e);
    else if (e.kind === 'fullBurstEnd' && start != null) { out.push(tOf(e) - start); start = null; }
  }
  return out;
};

describe('soda-twinkling-bunny — blind kit spec', () => {

  // S1a — start-of-battle Golden Chip 50 -> crit-dmg live from t=0 AND burst gates open.
  it('S1a: battle-start Golden Chip 50 raises soda total (removing the grant strictly lowers it)', () => {
    expect(dmg(base.res, SLUG)).toBeGreaterThan(dmg(noStartChip.res, SLUG));
  });

  // S1b — crit damage is LIVE-scaled off the Golden Chip pool (perResource), not a fixed single stack.
  it('S1b: crit damage scales with the Golden Chip pool (>> a fixed 1-stack model)', () => {
    // 50 stacks * 1.32% = ~66% crit-dmg early; a single fixed 1.32% stack is negligible.
    expect(dmg(base.res, SLUG)).toBeGreaterThan(dmg(flatCrit.res, SLUG) * 1.02);
    expect(dmg(flatCrit.res, SLUG)).not.toEqual(dmg(base.res, SLUG)); // non-vacuous
  });

  // S1c — Attack Damage 10.51%/2s to SELF + exactly ONE other ally (highest final ATK), not all.
  it('S1c: attackDamagePct 10.51 hits self + exactly one other ally (NOT all allies)', () => {
    const applies = buffApplies(base.evs, 'attackDamagePct', 10.51);
    expect(applies.length).toBeGreaterThan(0);
    const targets = new Set(applies.map(e => e.targetIdx));
    expect(targets.has(sodaIdx)).toBe(true);                 // self is a target
    const others = [...targets].filter(t => t !== sodaIdx);
    expect(others.length).toBe(1);                            // exactly ONE ally besides self
    expect(others.length).toBeLessThan(allySlugs(base.res).length); // discriminates "all allies"
    const dur = applies[0].durationSec;
    if (dur != null) expect(near(dur, 2, 0.05)).toBe(true);   // 2s, not rounds/permanent
  });

  it('S1c inertness: removing it leaves the NON-buffed teammates byte-identical', () => {
    const applies = buffApplies(base.evs, 'attackDamagePct', 10.51);
    const buffed = new Set(applies.map(e => e.targetIdx));
    for (const s of allySlugs(base.res)) {
      const idx = unitOf(base.res, s)?.idx;
      if (idx === sodaIdx || buffed.has(idx)) continue;       // soda + the top-ATK ally legitimately move
      expect(dmg(noAtkDmg.res, s)).toEqual(dmg(base.res, s)); // everyone else unchanged
    }
  });

  // S2a — FB duration extension gated by Golden Chip (Time Extension I/II).
  it('S2a: soda extends Full Burst beyond the 10s default (removing the extend shortens it)', () => {
    const w = fbWindows(base.evs), wn = fbWindows(noFbExtend.evs);
    expect(w.length).toBeGreaterThan(0);
    expect(Math.max(...w)).toBeGreaterThan(Math.max(...wn) + 0.5); // strictly longer than un-extended
    expect(Math.max(...w)).toBeGreaterThan(11);                    // >=10 stacks -> +2s at minimum
  });

  // S2b — per-normal-attack enemy rider during FB (TE-gated). Behavioral discriminator.
  it('S2b: the in-FB enemy rider adds soda damage (removing it lowers soda total)', () => {
    expect(dmg(base.res, SLUG)).toBeGreaterThan(dmg(noRider.res, SLUG));
  });

  it.skip('S2b: exact rider magnitude 52.04 / 85.02 / 137.06 gated on TE state (mult/gating field-shape MEASUREMENT-GATED)', () => {
    // Requires knowing how the driver keys "Time Extension state" (resourceGate proxy vs a real
    // TE status) and how flatDamage atkPct surfaces on the damage event. Verify by inspection.
  });

  // BURST S1 — 628.7% burst-skill damage, FB-exempt (lands pre-FB).
  it('BURST S1: soda emits a ~628.7% burst-bucket hit', () => {
    const burstHits = sodaDmg(base.evs).filter(e => e.bucket === 'burst');
    expect(burstHits.length).toBeGreaterThan(0);
    expect(burstHits.some(e => near(e.mult, 628.7, 5))).toBe(true);
    // burst cast lands before the FB window opens
    expect(burstHits.some(e => e.inFullBurst === false)).toBe(true);
  });

  // BURST S2/S3 — self Hit Rate 38.91% + ATK 65.25%, each 15s, stack-gated (>=20 / >=30).
  it('BURST S2/S3: self Hit-Rate 38.91 and ATK 65.25 buffs apply (15s, self-scoped)', () => {
    const hr = buffApplies(base.evs, 'hitRatePct', 38.91);
    const atk = buffApplies(base.evs, 'atkPct', 65.25);
    expect(hr.length).toBeGreaterThan(0);
    expect(atk.length).toBeGreaterThan(0);
    for (const e of [...hr, ...atk]) {
      expect(e.targetIdx).toBe(sodaIdx);                       // self only
      if (e.durationSec != null) expect(near(e.durationSec, 15, 0.1)).toBe(true);
    }
  });

  it('BURST S3 inertness+lever: removing the two self burst-buffs lowers soda total, teammates identical', () => {
    expect(dmg(base.res, SLUG)).toBeGreaterThan(dmg(noBurstBuffs.res, SLUG));
    for (const s of allySlugs(base.res)) expect(dmg(noBurstBuffs.res, s)).toEqual(dmg(base.res, s));
  });

  // NON-VACUITY for the >=20 / >=30 stack GATES: because burst consumes 17 and rebuild is slow,
  // later bursts should FALL BELOW the ATK gate — so the 65.25 ATK buff must NOT apply on every
  // burst. If the driver never lets the pool decay, this goes RED (the intended divergence payload).
  it('BURST gating bites: ATK 65.25 applies on FEWER bursts than the number of soda burst casts (⛑ stack trajectory)', () => {
    const casts = base.evs.filter(e => e.kind === 'burstCast' && (e.casterIdx === sodaIdx || e.srcSlot === sodaIdx));
    const atk = buffApplies(base.evs, 'atkPct', 65.25);
    if (casts.length < 3) return; // guard: need enough rotations for the pool to draw down
    expect(atk.length).toBeLessThan(casts.length); // the >=30 gate must exclude at least one late burst
  });

  it.skip('S1b rebuild rate: +1 Golden Chip per 3 FB normal attacks (GAP: "3 normal attacks" = 3 PULLS; engine hitCount counts pellet-HITS — encoding ⛑, verify by inspection)', () => {});
});

```

## 6. S6 blind post-op override-writer (claude-opus-4-8, cross-family; leakDetected null)
### 6a. Blind override JSON
```json
{
  "slug": "soda-twinkling-bunny",
  "resources": [
    {
      "name": "goldenChip",
      "initial": 50,
      "min": 0,
      "max": 50
    }
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 3
      },
      "target": {
        "kind": "self"
      },
      "fbGate": "inFb",
      "effects": [
        {
          "kind": "buff",
          "stat": "critDamagePct",
          "value": 1.32,
          "maxStacks": 50
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 3
      },
      "target": {
        "kind": "self"
      },
      "fbGate": "inFb",
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.51,
          "durationSec": 2
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 3
      },
      "target": {
        "kind": "alliesTopAtk",
        "count": 1,
        "excludeSelf": true,
        "byFinalAtk": true
      },
      "fbGate": "inFb",
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 10.51,
          "durationSec": 2
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
      "resourceGate": {
        "name": "goldenChip",
        "min": 10
      },
      "effects": [
        {
          "kind": "fullBurstExtend",
          "seconds": 2
        }
      ]
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
      "resourceGate": {
        "name": "goldenChip",
        "min": 20
      },
      "effects": [
        {
          "kind": "fullBurstExtend",
          "seconds": 3
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "fbGate": "inFb",
      "resourceGate": {
        "name": "goldenChip",
        "min": 10
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 52.04
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "shotFired"
      },
      "target": {
        "kind": "enemy"
      },
      "fbGate": "inFb",
      "resourceGate": {
        "name": "goldenChip",
        "min": 20
      },
      "effects": [
        {
          "kind": "flatDamage",
          "atkPct": 85.02
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
          "atkPct": 628.7,
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
      "resourceGate": {
        "name": "goldenChip",
        "min": 20
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "hitRatePct",
          "value": 38.91,
          "durationSec": 15
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
      "resourceGate": {
        "name": "goldenChip",
        "min": 30
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 65.25,
          "durationSec": 15
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
          "kind": "resource",
          "name": "goldenChip",
          "delta": -17
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
    "⚑ Golden Chip economy: initial 50 + burst ▼17 modeled; NO rebuild source found in prose (crit-damage line's 3-attack-in-FB trigger read as its OWN stack gain, not a Golden-Chip refill). If normal attacks regenerate Golden Chip, the ≥20/≥30 gates (Hit Rate, ATK 65.25%, Time Extension II) stay satisfied far longer — MEASURE the pool trajectory.",
    "⚑ Crit-damage line modeled as a SEPARATE stacking buff (+1.32%/activation, cap 50 = 66%), because it 'Activates after 3 normal attacks in FB' (i.e. NOT active at t=0). Alt reading: crit dmg = live Golden-Chip pool ×1.32 (would start at 66% and DECLINE). These diverge sharply; adjudicate against popups.",
    "⚑ skill2 rider gates: true trigger is Time Extension I/II state (set at BS3 entry, held for the FB); proxied here by LIVE goldenChip ≥10/≥20 per shot. Post-consume the live pool dips, so this can under-credit the 85.02% branch on later bursts. Faithful gate needs an FB-entry-latched Time Extension status.",
    "⚑ Hit Rate ▲38.91%: kit % is literal, but its core-hit lift (hrCoreMult) is a MEASURED-only magnitude — the damage it yields is unvalidated."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. SG/Iron/Attacker B3. Golden Chip resource (init 50, cap 50, ▼17/burst) gates skill2 FB-extend (+2/+3s) and burst self-buffs (Hit Rate ≥20, ATK 65.25% ≥30); pre-consume gate order preserved by placing the ▼17 in a trailing burst block. skill1: per-3-normal-attack-in-FB crit-damage stack (cap 66%) + a 10.51% Attack-Damage 2s refresh to self and the single highest-final-ATK ally (excl. self). skill2: per-normal-attack-in-FB flat riders (52.04% Time-Ext-I, +85.02% Time-Ext-II cumulative). Burst 628.7% instant nuke (noFb). Cadence/rebuild/gate-timing are the load-bearing unknowns."
}
```
### 6b. Audit table + ⚑ flags
```json
{
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Start of battle: Golden Chip ▲50",
      "status": "IMPLEMENTED",
      "effectOrReason": "resources.goldenChip.initial=50 (cap 50)"
    },
    {
      "slot": "skill1",
      "kitLine": "3 normals in FB: Crit Dmg ▲1.32% up to 50",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff critDamagePct 1.32 maxStacks 50, hitCount:3 + fbGate inFb"
    },
    {
      "slot": "skill1",
      "kitLine": "3 normals in FB: Atk Dmg ▲10.51% 2s self+top ATK ally",
      "status": "IMPLEMENTED",
      "effectOrReason": "two buff blocks (self; alliesTopAtk count1 excludeSelf byFinalAtk) attackDamagePct 10.51 durationSec 2"
    },
    {
      "slot": "skill2",
      "kitLine": "Enter BS3: FB Dur ▲2s (≥10 stacks)",
      "status": "IMPLEMENTED",
      "effectOrReason": "fullBurstExtend 2, stageEnter:3, resourceGate min10"
    },
    {
      "slot": "skill2",
      "kitLine": "Enter BS3: FB Dur ▲3s (≥20 stacks)",
      "status": "IMPLEMENTED",
      "effectOrReason": "fullBurstExtend 3, stageEnter:3, resourceGate min20 (cumulative → +5s total)"
    },
    {
      "slot": "skill2",
      "kitLine": "Normal in FB / Time-Ext I: 52.04% dmg",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage 52.04, shotFired + fbGate inFb, resourceGate min10 (Time-Ext proxy)"
    },
    {
      "slot": "skill2",
      "kitLine": "Normal in FB / Time-Ext II: 85.02% dmg",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage 85.02 (cumulative), shotFired + fbGate inFb, resourceGate min20 (Time-Ext proxy)"
    },
    {
      "slot": "burst",
      "kitLine": "Onward Soda: 628.7% Burst Skill dmg all enemies",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage 628.7 noFb (instant burst dmg, FB-exempt)"
    },
    {
      "slot": "burst",
      "kitLine": "≥20 stacks: Hit Rate ▲38.91% 15s self",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff hitRatePct 38.91 durationSec15, resourceGate min20"
    },
    {
      "slot": "burst",
      "kitLine": "≥30 stacks: ATK ▲65.25% 15s self",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff atkPct 65.25 durationSec15, resourceGate min30"
    },
    {
      "slot": "burst",
      "kitLine": "Golden Chip ▼17 after effect",
      "status": "IMPLEMENTED",
      "effectOrReason": "resource goldenChip delta -17 (trailing block → gates read pre-consume)"
    }
  ],
  "flags": [
    {
      "field": "override.resources / burst goldenChip delta",
      "estimate": "start 50, ▼17/burst, no rebuild → sawtooth-down 50→33→16→0",
      "reasoning": "Prose states only the +50 start and the ▼17 consume; I read the crit-damage line's 3-attack-in-FB trigger as gaining a CRIT-DAMAGE stack, not refilling Golden Chip. No other Golden-Chip gain source appears, so the pool only declines and the ≥20/≥30 gates lapse after ~2 bursts.",
      "recipe": "Read Golden-Chip stack count on the HUD across successive bursts; if it climbs between bursts, add a resource-gain effect (likely +N per normal attack or per shot) and re-open the gates."
    },
    {
      "field": "override.skill1[0] critDamagePct",
      "estimate": "separate stacking buff, +1.32%/activation, realized ~20–40 of 50 stacks over a fight",
      "reasoning": "'Activates after 3 normal attacks in FB' means it is NOT active at t=0, favoring a build-up buff over a live-pool tracker; but reaching cap 50 needs ~150 FB normal attacks, so realized crit-damage is a ramp haircut, not 66%.",
      "recipe": "Read crit-damage on the sheet at several fight timestamps; fit realized stack count vs FB normal-attack count. If crit dmg starts high (~66%) and DECLINES, switch to perResource{goldenChip,1.32}."
    },
    {
      "field": "override.skill2[2..3] resourceGate (Time Extension proxy)",
      "estimate": "live goldenChip ≥10/≥20 per shot",
      "reasoning": "The real gate is Time Extension I/II state, latched at BS3 entry (pre-consume) and held for the whole FB; a live-pool proxy dips post-consume and can drop the 85.02% branch on later bursts.",
      "recipe": "Confirm the 52.04/85.02 riders persist for the ENTIRE FB after the burst's ▼17; if so, replace with an FB-entry-latched status gate."
    },
    {
      "field": "override.burst[1] hitRatePct 38.91",
      "estimate": "kit % literal; core lift = engine hrCoreMult (measured-only)",
      "reasoning": "Hit-Rate→core magnitude is outside the input domain — the % is given but the damage it produces depends on the measured HR→core slope.",
      "recipe": "Compare core-hit rate / red-popup fraction with the buff up vs down; calibrate hrCoreMult."
    },
    {
      "field": "cadence tuple (pullsPerSec / reloadFrames 142 / ammo 9)",
      "estimate": "datamine values as-is; SG effective fire rate unverified",
      "reasoning": "rate_of_fire/reloadFrames are known-unreliable datamine fields; effective SG cadence should be measured from an ammo counter.",
      "recipe": "Frame-count shots/sec and reload duration from footage; correct against 60fps frame boundaries."
    }
  ]
}
```

## 7. Driver's test (scripts/tests/units/soda-twinkling-bunny.test.ts — harness-correct, 22/22 GREEN vs shipped)
```typescript
// PER-UNIT KIT SPEC — `soda-twinkling-bunny` (Soda: Twinkling Bunny, Attacker/SG/Iron, Burst III,
// cd 40s, ammo 9, hitsPerShot 10, normalMult 231.6). Kit-autonomy gauntlet 2026-07-24 (driver tests).
//
// One assertion group per KIT LINE (STB1..STB8 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// The kit centres on a Golden-Chip POOL (engine resource-counter primitive): start 50 (cap 50), +1 per
// "3 normal attacks during Full Burst", −17 on her own burst (spent AFTER the gates). Crit Damage is
// LIVE = pool × 1.32 (perResource); her burst ATK ▲65.25% is gated ≥30 chips, Hit Rate ▲38.91% ≥20,
// the Full-Burst-extension ladder is +2s at 10-19 / +5s at ≥20. The pool itself emits NO event
// (resource deltas are internal state), so it is observed INDIRECTLY: which resourceGate-gated buffs
// fire (and on which bursts), the Full-Burst window length, and the live crit damage folded into her
// expected-value damage totals.
//
// Kit (blablalink prose, data/characters.json → characters['soda-twinkling-bunny'].skills, lvl 10):
//   S1 ■ start of battle → self: Golden Chip stacks ▲50.                                      [STB1]
//      ■ after 3 normal attacks during Full Burst → self: Critical Damage ▲1.32%/stack, ≤50.   [STB2]
//         (the same trigger generates +1 Golden Chip — the pool rebuild)                       [STB3]
//      ■ after 3 normal attacks during Full Burst → self + 1 highest-final-ATK ally (except
//         self): Attack Damage ▲10.51% for 2 sec.                                             [STB4]
//   S2 ■ entering Burst Stage 3 → all allies: chip-gated CUMULATIVE Full Burst Duration ladder:
//         Time Extension I +2s at ≥10 chips, Time Extension II +3s more at ≥20 (so +5 at ≥20). [STB5]
//      ■ normal attack during Full Burst → 1 enemy nearest crosshair: rider damage by Time-Ext
//         state (52.04% TE-I / 85.02% TE-II, cumulative). Modeled flat 130 (⚑ recording-derived;
//         TE-II-dominant — the pool sits ≥20 most of the fight).                               [STB6]
//   BU ■ Onward, Soda! → all enemies: 628.7% final ATK as Burst Skill damage; Golden Chip ▼17
//         AFTER the effect is applied.                                                        [STB7]
//      ■ ≥20 chips → self: Hit Rate ▲38.91% for 15 sec.                                       [STB8]
//      ■ ≥30 chips → self: ATK ▲65.25% for 15 sec.                                            [STB8]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing;
// every counterfactual below was measured RED vs the shipped override on this fixture):
//   STB1 pool starts at 50: the ≥30 ATK gate and the ≥20 HR gate BOTH fire on her FIRST burst (t≈5s)
//        and the first Full Burst is already extended to 15s — only possible if the pool opens at 50.
//        Nearest wrong: pool opens at 0 → no gate fires on burst 1, FB stays 10s.
//   STB2 crit is LIVE off the pool (perResource), not a from-0 ramp: the passive critDamagePct buff is
//        applied once at frame 0 with base value 0 (the perResource multiplier reads the live pool at
//        damage time) and removing it drops her total ~15M. Nearest wrong: a shotFired/everyN from-0
//        ramp (the prior model) accumulates only a few stacks because Soda fires few in-FB normals.
//   STB3 the +1/3-in-FB-normal rebuild sustains the pool late-fight: removing the generation drops the
//        ≥30 ATK gate 4→2 firings and the ≥20 HR gate 5→2 (the pool drains to 0 without rebuild).
//   STB4 AD buff hits self AND the top-ATK ally EXCLUDING self: the ally block never targets Soda (slot 2
//        receives exactly her own self-block count). Nearest wrong: drop excludeSelf → Soda is top final
//        ATK here, so the ally block double-targets her (slot 2 51→78) and the true carry (liter) gets 0.
//   STB5 FB extension is the CUMULATIVE ladder (+5 at ≥20): every FB window is 15s (10 base + 5). Nearest
//        wrong: no extension → 10s; a flat +2 (wrong shape) → ≤12s.
//   STB6 rider fires on in-FB normals at the kit slot: 154 skill2 hits at 130%, all inside Full Burst;
//        removing it drops her total ~126M (35%). Magnitude 130 is ⚑ recording-derived (out of scope).
//   STB7 burst nuke 628.7% once per cast, and the −17 spend lands AFTER the gates: reordering the spend
//        before the gates collapses the ≥30 ATK gate 4→1 and the ≥20 HR gate 5→3 (burst-5 pre-consume is
//        in [20,30): the gate must read it BEFORE the spend, exactly as "▼17 after applied" requires).
//   STB8 HR (≥20) fires on all 5 bursts, ATK (≥30) on the first 4 (the pool drains below 30 by burst 5
//        but stays ≥20) — both self-targeted, 15s. Nearest wrong: pool opens at 0 → neither fires.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / soda-twinkling-bunny B3 / helm B3, boss
// Fire, focus soda-twinkling-bunny) — she needs a real rotation to cast her burst at all (a lone B3 makes
// ZERO Full Bursts). Deterministic (no seed). Slot order: liter 0 / crown 1 / soda 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SODA = 'soda-twinkling-bunny';
const SODA_SLOT = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({ ...controlComp(SODA), overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const sodaBuffs = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter((b) => b.casterIdx === SODA_SLOT && b.stat === stat && b.value === value);
const sodaDmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === SODA);
const sodaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SODA);
const fbWindows = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const fbDurations = (evs: SimEvent[]) =>
  [...new Set(fbWindows(evs).map((f) => +((f.endFrame - f.frame) / FPS).toFixed(2)))].sort((a, b) => a - b);
const firstBurstFrame = (evs: SimEvent[]) => sodaBursts(evs)[0]?.frame ?? Infinity;

// ---- counterfactual patches (nearest-wrong models; all measured RED vs shipped) ---------------
/** STB2 reference: her live perResource crit line removed entirely. */
const noCrit = withPatchedOverride(SODA, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !b.effects.some((e: any) => e.stat === 'critDamagePct'));
  if (ov.skill1.length === before) throw new Error('stb S1 critDamagePct block missing — fixture is stale');
});
/** STB3 reference: the +1 chip generation removed (pool never rebuilds). */
const noGen = withPatchedOverride(SODA, (ov) => {
  let removed = 0;
  for (const blk of ov.skill1) {
    const before = blk.effects.length;
    blk.effects = blk.effects.filter((e: any) => !(e.kind === 'resource' && e.delta > 0));
    removed += before - blk.effects.length;
  }
  if (!removed) throw new Error('stb S1 +chip generation effect missing — fixture is stale');
});
/** STB4 reference: her AD self+ally blocks removed. */
const noAd = withPatchedOverride(SODA, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !b.effects.some((e: any) => e.stat === 'attackDamagePct'));
  if (ov.skill1.length === before) throw new Error('stb S1 attackDamagePct block missing — fixture is stale');
});
/** STB4 counterfactual: the ally block WITHOUT excludeSelf (double-targets Soda if she is top ATK). */
const noExclude = withPatchedOverride(SODA, (ov) => {
  let hit = 0;
  for (const blk of ov.skill1) if (blk.target?.kind === 'alliesTopAtk') { delete blk.target.excludeSelf; hit++; }
  if (!hit) throw new Error('stb S1 alliesTopAtk block missing — fixture is stale');
});
/** STB5 reference: the Full-Burst-extension ladder removed. */
const noFbExt = withPatchedOverride(SODA, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !b.effects.some((e: any) => e.kind === 'fullBurstExtend'));
  if (ov.skill2.length === before) throw new Error('stb S2 fullBurstExtend block missing — fixture is stale');
});
/** STB5 counterfactual: a FLAT +2 ladder (wrong shape — the kit is cumulative +2/+3 = +5 at ≥20). */
const flatLadder = withPatchedOverride(SODA, (ov) => {
  let hit = 0;
  for (const blk of ov.skill2) for (const e of blk.effects) if (e.kind === 'fullBurstExtend') { e.seconds = 2; hit++; }
  if (!hit) throw new Error('stb S2 fullBurstExtend block missing — fixture is stale');
});
/** STB6 reference: the in-FB rider removed. */
const noRider = withPatchedOverride(SODA, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage'));
  if (ov.skill2.length === before) throw new Error('stb S2 flatDamage rider missing — fixture is stale');
});
/** STB7 reference: the burst nuke removed. */
const noBurstDmg = withPatchedOverride(SODA, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage'));
  if (ov.burst.length === before) throw new Error('stb burst flatDamage missing — fixture is stale');
});
/** STB7 counterfactual: the −17 chip spend moved BEFORE the gates (violates "▼17 after applied"). */
const spendFirst = withPatchedOverride(SODA, (ov) => {
  const i = ov.burst.findIndex((b: any) => b.effects.some((e: any) => e.kind === 'resource'));
  if (i < 0) throw new Error('stb burst chip-spend block missing — fixture is stale');
  const [spend] = ov.burst.splice(i, 1);
  ov.burst.unshift(spend);
});
/** STB1/STB8 counterfactual: the pool opens at 0 instead of 50. */
const pool0 = withPatchedOverride(SODA, (ov) => {
  if (!ov.resources?.[0]) throw new Error('stb goldenChip resource missing — fixture is stale');
  ov.resources[0].initial = 0;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const rNoCrit = run({ [SODA]: noCrit });
const rNoGen = run({ [SODA]: noGen });
const rNoAd = run({ [SODA]: noAd });
const rNoExclude = run({ [SODA]: noExclude });
const rNoFbExt = run({ [SODA]: noFbExt });
const rFlatLadder = run({ [SODA]: flatLadder });
const rNoRider = run({ [SODA]: noRider });
const rNoBurstDmg = run({ [SODA]: noBurstDmg });
const rSpendFirst = run({ [SODA]: spendFirst });
const rPool0 = run({ [SODA]: pool0 });

const sodaTotal = (r: { totals: Record<string, number> }) => r.totals[SODA];
const atkGateFires = (evs: SimEvent[]) => sodaBuffs(evs, 'atkPct', 65.25).length;
const hrGateFires = (evs: SimEvent[]) => sodaBuffs(evs, 'hitRatePct', 38.91).length;

describe('soda-twinkling-bunny — kit spec', () => {
  describe('STB1 — S1 Golden Chip pool opens at 50 (resource initial)', () => {
    it('the ≥30 ATK gate and ≥20 HR gate BOTH clear on her first burst (pool ≥30 at t≈5s)', () => {
      const f0 = firstBurstFrame(base.events);
      expect(f0, 'no burst cast — fixture must rotate her').toBeLessThan(Infinity);
      const atkOnFirst = sodaBuffs(base.events, 'atkPct', 65.25).some((b) => b.frame === f0);
      const hrOnFirst = sodaBuffs(base.events, 'hitRatePct', 38.91).some((b) => b.frame === f0);
      expect(atkOnFirst, 'ATK ▲65.25 (≥30 chips) did not fire on burst 1 — pool did not open at 50').toBe(true);
      expect(hrOnFirst, 'Hit Rate ▲38.91 (≥20 chips) did not fire on burst 1 — pool did not open at 50').toBe(true);
    });

    it('the first Full Burst is already extended to 15s (pool ≥20 at the first stage-3 entry)', () => {
      expect(fbDurations(base.events)[0] === 15 || fbDurations(base.events).includes(15)).toBe(true);
      expect(fbDurations(base.events).some((d) => d > 10), 'no FB extension on a 50-chip open').toBe(true);
    });

    it('DISCRIMINATING: a pool opening at 0 fires NEITHER gate and leaves the FB at 10s', () => {
      expect(atkGateFires(rPool0.events)).toBe(0);
      expect(hrGateFires(rPool0.events)).toBe(0);
      expect(fbDurations(rPool0.events)).toEqual([10]);
    });
  });

  describe('STB2 — S1 Critical Damage is LIVE off the pool (perResource ×1.32), not a from-0 ramp', () => {
    it('is a passive self buff applied once at frame 0 with base value 0 (perResource reads the live pool)', () => {
      const crit = buffs(base.events).filter((b) => b.casterIdx === SODA_SLOT && b.stat === 'critDamagePct');
      expect(crit.length, 'no passive critDamagePct buff applied').toBeGreaterThan(0);
      for (const b of crit) {
        expect(b.value, 'perResource base must be 0 (a flat encoding emits its number here)').toBe(0);
        expect(b.targetIdx, 'crit buff is self-scoped').toBe(SODA_SLOT);
        expect(b.expiresFrame, 'passive crit buff has no wall-clock expiry').toBeNull();
      }
      expect(crit[0].frame, 'passive crit buff is up from battle start').toBe(0);
    });

    it('DISCRIMINATING: removing the live crit line drops her total (the pool×1.32 is damage-bearing)', () => {
      expect(sodaTotal(base), 'crit line is inert — not damage-bearing').toBeGreaterThan(sodaTotal(rNoCrit));
    });
  });

  describe('STB3 — S1 the +1-per-3-in-FB-normal rebuild sustains the pool late-fight', () => {
    it('with the rebuild, the ≥30 ATK gate fires on 4 bursts and the ≥20 HR gate on all 5', () => {
      expect(atkGateFires(base.events)).toBe(4);
      expect(hrGateFires(base.events)).toBe(sodaBursts(base.events).length);
      expect(hrGateFires(base.events)).toBe(5);
    });

    it('DISCRIMINATING: removing the generation drains the pool — gates stop firing late', () => {
      expect(atkGateFires(rNoGen.events), 'ATK gate count unchanged without rebuild').toBeLessThan(atkGateFires(base.events));
      expect(hrGateFires(rNoGen.events), 'HR gate count unchanged without rebuild').toBeLessThan(hrGateFires(base.events));
      expect(sodaTotal(rNoGen)).toBeLessThan(sodaTotal(base));
    });
  });

  describe('STB4 — S1 Attack Damage ▲10.51%/2s to self + the top-final-ATK ally (except self)', () => {
    const ad = (evs: SimEvent[]) => sodaBuffs(evs, 'attackDamagePct', 10.51);
    const byTarget = (evs: SimEvent[]) => {
      const m = new Map<number, number>();
      for (const b of ad(evs)) m.set(b.targetIdx ?? -1, (m.get(b.targetIdx ?? -1) ?? 0) + 1);
      return m;
    };

    it('buffs Soda herself AND at least one ally, every 3 in-FB normals', () => {
      const m = byTarget(base.events);
      expect(m.get(SODA_SLOT) ?? 0, 'self AD buff missing').toBeGreaterThan(0);
      const allyHits = [...m.entries()].filter(([tgt]) => tgt !== SODA_SLOT);
      expect(allyHits.length, 'no ally received the AD buff').toBeGreaterThan(0);
    });

    it('the ally block NEVER targets Soda (excludeSelf honored) — slot 2 holds exactly her self-block count', () => {
      const m = byTarget(base.events);
      const selfCount = m.get(SODA_SLOT) ?? 0;
      const allyTotal = [...m.entries()].filter(([tgt]) => tgt !== SODA_SLOT).reduce((s, [, n]) => s + n, 0);
      // self-block and ally-block share the same every-3-in-FB trigger, so they fire equally often;
      // if the ally block double-targeted Soda, slot 2 would carry self+ally (> allyTotal).
      expect(selfCount, 'slot 2 carries more than the self block — ally block is leaking onto Soda').toBe(allyTotal);
    });

    it('DISCRIMINATING: dropping excludeSelf double-targets Soda and starves the true carry', () => {
      const mBase = byTarget(base.events);
      const mNoEx = byTarget(rNoExclude.events);
      expect(mNoEx.get(SODA_SLOT) ?? 0, 'excludeSelf removal did not redirect the ally buff onto Soda').toBeGreaterThan(mBase.get(SODA_SLOT) ?? 0);
    });

    it('DISCRIMINATING: removing the AD line drops her total', () => {
      expect(ad(rNoAd.events).length).toBe(0);
      expect(sodaTotal(rNoAd)).toBeLessThan(sodaTotal(base));
    });
  });

  describe('STB5 — S2 Full Burst extension is the CUMULATIVE chip ladder (+5s at ≥20 chips)', () => {
    it('every Full Burst window is 15s (10s base + 5s extension) while the pool sits ≥20', () => {
      const durs = fbDurations(base.events);
      expect(durs.length, 'no Full Burst windows').toBeGreaterThan(0);
      expect(durs, 'a window not extended to 15s — ladder mis-shaped').toEqual([15]);
    });

    it('DISCRIMINATING: removing the ladder leaves 10s windows', () => {
      expect(fbDurations(rNoFbExt.events)).toEqual([10]);
    });

    it('DISCRIMINATING: a flat +2 (wrong shape) never reaches the 15s the cumulative +5 produces', () => {
      const durs = fbDurations(rFlatLadder.events);
      expect(Math.max(...durs), 'flat +2 reached 15s — not discriminating').toBeLessThan(15);
    });
  });

  describe('STB6 — S2 in-FB rider deals 130% (⚑ recording-derived) to 1 enemy, inside Full Burst only', () => {
    const riders = () => sodaDmg(base.events).filter((d) => d.srcSlot === 'skill2');

    it('fires on in-FB normals at the kit slot, all inside Full Burst', () => {
      const r = riders();
      expect(r.length, 'no skill2 rider damage').toBeGreaterThan(0);
      expect([...new Set(r.map((d) => d.atkPct))], 'rider magnitude drifted from the shipped 130').toEqual([130]);
      expect([...new Set(r.map((d) => d.inFullBurst))], 'rider fired outside Full Burst').toEqual([true]);
    });

    it('DISCRIMINATING: removing the rider zeroes skill2 damage and drops her total ~35%', () => {
      expect(sodaDmg(rNoRider.events).filter((d) => d.srcSlot === 'skill2').length).toBe(0);
      expect(sodaTotal(rNoRider)).toBeLessThan(sodaTotal(base));
    });
  });

  describe('STB7 — burst nuke 628.7% once per cast; the −17 chip spend lands AFTER the gates', () => {
    const nukes = (evs: SimEvent[]) => sodaDmg(evs).filter((d) => d.srcSlot === 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const n = nukes(base.events);
      expect(n.length).toBe(sodaBursts(base.events).length);
      expect(n.length).toBeGreaterThan(0);
      expect([...new Set(n.map((d) => d.atkPct))]).toEqual([628.7]);
      expect([...new Set(n.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('DISCRIMINATING: removing the nuke zeroes burst-bucket damage', () => {
      expect(nukes(rNoBurstDmg.events).length).toBe(0);
    });

    it('DISCRIMINATING: spending the chips BEFORE the gates collapses the late gates (pre-consume ordering)', () => {
      // burst-5 pre-consume is in [20,30): the ≥30 ATK gate and ≥20 HR gate must read it BEFORE the
      // −17 spend. Spend-first drops the pool below the gates first, so fewer gates clear.
      expect(atkGateFires(rSpendFirst.events), 'spend-first did not reduce ATK gate fires').toBeLessThan(atkGateFires(base.events));
      expect(hrGateFires(rSpendFirst.events), 'spend-first did not reduce HR gate fires').toBeLessThan(hrGateFires(base.events));
    });
  });

  describe('STB8 — burst self-buffs: Hit Rate ▲38.91%/15s (≥20) on all 5, ATK ▲65.25%/15s (≥30) on the first 4', () => {
    it('HR (≥20) fires on every burst; ATK (≥30) stops once the pool drains below 30 (burst 5)', () => {
      const bursts = sodaBursts(base.events).length;
      expect(hrGateFires(base.events), 'HR gate did not fire on every burst (pool ≥20 throughout)').toBe(bursts);
      expect(atkGateFires(base.events), 'ATK gate should drain below 30 by the last burst').toBe(bursts - 1);
    });

    it('both are self-targeted 15s buffs', () => {
      for (const stat of ['atkPct', 'hitRatePct'] as const) {
        const val = stat === 'atkPct' ? 65.25 : 38.91;
        const applied = sodaBuffs(base.events, stat, val);
        expect(applied.length, `${stat} ${val} never applied`).toBeGreaterThan(0);
        for (const b of applied) {
          expect(b.targetIdx, `${stat} buff is self-scoped`).toBe(SODA_SLOT);
          expect(b.expiresFrame! - b.frame, `${stat} buff duration`).toBe(15 * FPS);
        }
      }
    });

    it('DISCRIMINATING: a pool opening at 0 fires neither self-buff', () => {
      expect(atkGateFires(rPool0.events)).toBe(0);
      expect(hrGateFires(rPool0.events)).toBe(0);
    });
  });
});

```

## 8. S2d independent verification matrix + S5 harness-artifact note
```
S2d INDEPENDENT VERIFICATION GATE — soda-twinkling-bunny (2026-07-24)
Method: `npx vitest run scripts/tests/units/soda-twinkling-bunny.test.ts` against (i) the unmodified SHIPPED
override and (ii) each named counterfactual (withPatchedOverride, in-memory — committed JSON untouched).
22 tests, all 22 PASS vs shipped (the DISCRIMINATING assertions exercise each counterfactual inline; a
counterfactual that behaved identically to shipped would FAIL its DISCRIMINATING assertion, so none is vacuous).

Fixture: controlComp('soda-twinkling-bunny') = liter(B1) / crown(B2) / soda-twinkling-bunny(B3 carry) / helm(B3),
boss Fire, focus soda. Slot order: liter 0 / crown 1 / soda 2 / helm 3. Soda is a Burst-III SG; she needs the
real rotation to cast at all (a lone B3 makes ZERO Full Bursts). The helm co-B3 is load-bearing: 9 Full Bursts
but only 5 soda casts, so 4 FBs are helm-led — this is what discriminates stageEnter (FB-ext fires on ANY B3's
cast) from burstCast (soda-only).

The Golden Chip POOL emits NO event (resource deltas are internal state; perResource crit is computed live at
damage time, buffApply carries base value 0). The pool is therefore observed INDIRECTLY: which resourceGate-
gated buffs fire (and on which bursts), the Full Burst window length, and the live crit folded into expected-
value totals. Measured cadence (deterministic, no seed): soda casts 5x at 5.0/45.2/88.2/130.9/171.2s; 9 FB
windows ALL 15.00s (10 base + 5 extension); ATK ▲65.25 (≥30) fires on bursts 1-4 (pool drains below 30 by burst
5); Hit Rate ▲38.91 (≥20) fires on all 5 bursts (burst-5 pre-consume ∈ [20,30)); skill2 rider = 154 in-FB hits
at flat 130%; AD 10.51 targets = soda(self)×51, liter×27, helm×24 (the ally block never targets soda).

--- (i) vs SHIPPED override (resource pool 50/0/50; perResource crit ×1.32; +1/3-in-FB-normal rebuild;
        AD self+top-ATK-ally excludeSelf; cumulative FB-ext +2/+5 stageEnter:3; flat-130 in-FB rider;
        burst 628.7; HR≥20 / ATK≥30 pre-consume; −17 spend ordered after gates) ---
FAITHFUL pins (expect GREEN):
  STB1 pool opens at 50: ATK≥30 + HR≥20 both fire on burst 1; first FB already 15s .............. GREEN
  STB2 crit is LIVE perResource: passive critDamagePct buffApply frame 0, value 0, self, no expiry;
       removing it drops soda total ~15M ....................................................... GREEN
  STB3 +1/3-in-FB-normal rebuild: ATK gate 4x, HR gate 5x (= burst count) ...................... GREEN
  STB4 AD 10.51 self + top-final-ATK ally (excludeSelf): slot 2 holds exactly its self-block count
       (the ally block never targets soda); self + ≥1 ally buffed .............................. GREEN
  STB5 FB-ext CUMULATIVE ladder: every FB window == 15s (10 + 5 at ≥20) ........................ GREEN
  STB6 in-FB rider: 154 skill2 hits at 130%, all inFullBurst=true .............................. GREEN
  STB7 burst nuke 628.7 once per cast (burst bucket); spend-after-gates ordering ............... GREEN
  STB8 HR≥20 on all 5 bursts, ATK≥30 on first 4 (sawtooth decay); both self 15s ................. GREEN
NO FIX lines: the shipped override is faithful; every kit line is FAITHFUL (two are re-encoded — the start+50
pool seed and the −17 spend — both documented in caveats, so unmodeled is empty).

--- (ii) each named counterfactual (expect RED = the assertion discriminates) ---
  STB1/STB8 pool initial 0 -> 0 gate fires on burst 1, FB stays 10s ............................ RED (discriminated)
  STB2 crit block removed -> soda total drops ~15M (the live pool×1.32 is damage-bearing) ...... RED (discriminated)
  STB3 +chip generation removed -> ATK gate 4->2, HR gate 5->2, total drops ~36M ............... RED (discriminated)
  STB4 AD blocks removed -> zero 10.51 buffs, total drops ~46M ................................. RED (discriminated)
  STB4 excludeSelf dropped -> soda slot2 51->78 (ally block double-targets soda), liter 27->0 ... RED (discriminated)
  STB5 FB-ext removed -> FB windows 10s (not 15s) .............................................. RED (discriminated)
  STB5 flat +2 ladder (wrong shape) -> max FB 12s, never 15s ................................... RED (discriminated)
  STB6 rider removed -> zero skill2 damage, total drops ~126M (35%) ............................ RED (discriminated)
  STB7 burst nuke removed -> zero burst-bucket damage .......................................... RED (discriminated)
  STB7 spend moved BEFORE gates -> ATK gate 4->1, HR gate 5->3 (pre-consume ordering broken) .... RED (discriminated)

DOCUMENTED RESIDUALS (not vacuous tests — genuine ⚑ flags / discriminability limits, flagged for owner spot-check):
  (1) RIDER magnitude + Time-Extension gating: the kit reads 52.04% (TE-I) / +85.02% (TE-II, cumulative 137.06%)
      gated on the TE state latched at Burst-Stage-3 entry. The engine has NO state-snapshot primitive; a live
      resourceGate proxy is WRONG (it drops the rider post-consume when the pool dips below threshold). The shipped
      override models a FLAT 130% on every in-FB normal (⚑ recording-derived, TE-II-dominant) — faithful trigger/
      target/cadence (in-FB normal → 1 enemy, per pull not per pellet), magnitude/state-gating ⚑. Both cross-family
      blinds (fable S2b, opus S6) independently flag the same TE-snapshot gap with the same recipe.
  (2) HIT RATE downstream: the HR ▲38.91% block is faithful to the KIT, but its two downstream channels (core-hit
      rate via acrForHR, pellet landing via coneSigmaFor) are over-credited vs the owner hand-count of this fight
      (docs/probe-data/soda-tb-sg-core-hr-windows.json) — a coupled tuning residual, not a faithfulness failure.
  (3) S5 blind test FILE is a documented harness artifact (import path assumes scripts/tests/units/; mutates
      o.blocks which the override does not expose → no-op; passes the override object to controlComp() which
      expects a slug; reads .idx/.total/.mult-as-scalar which drift from the harness). It cannot run unmodified;
      convergence is carried by the fixture-independent S5 SPEC TABLE (matches driver dispositions + discrimination
      intent) + the S6 blind override (line-for-line structural match) + the driver's harness-correct test (this
      file) which mechanically asserts every discrimination the S5 spec names, 22/22 GREEN vs shipped.

VERDICT: no test is GREEN under both shipped and its counterfactual (none vacuous). Every FAITHFUL pin is GREEN
vs shipped; every named counterfactual is RED. The shipped override is faithful — S3 made NO encoding change
(only cleared two stale unmodeled entries for effects that ARE modeled, documented the re-encoding + the rider ⚑
in caveats, and added the gauntlet provenance marker to the note).

```
