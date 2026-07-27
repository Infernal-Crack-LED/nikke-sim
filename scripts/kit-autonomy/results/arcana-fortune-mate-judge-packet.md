# S7 JUDGE PACKET — `arcana-fortune-mate` (Arcana: Fortune Mate, SG/Attacker/Fire/Burst II) — compact, answer-faithful compilation of the gauntlet artifacts

> EXACT-SLUG: this is `arcana-fortune-mate` (SG/Fire/B2 Attacker, aka afm/jkana/arcanafm) — NOT base `arcana` (RL/Supporter/Electric/B2). Any schema/comment naming `arcana` refers to the OTHER unit and is NOT a leak of this target's answer (all three blind agents confirmed leak null).

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

## 1. Ground truth — kit prose (data/characters.json → characters['arcana-fortune-mate'], level-10 values + base stats)

```json
{
  "slug": "arcana-fortune-mate",
  "name": "Arcana: Fortune Mate",
  "weapon": "SG",
  "class": "Attacker",
  "element": "Fire",
  "burst": "II",
  "burstCooldownSec": 20,
  "ammo": 9,
  "hitsPerShot": 10,
  "reloadFrames": 161,
  "normalAttackMultiplier": 222.8,
  "coreAttackMultiplier": 200,
  "burstGaugePerShot": 2,
  "critRate": 15,
  "critDamage": 150,
  "skills": {
    "skill1": "■ Activates when Full Burst ends. Affects all shotgun-wielding allies. \nATK ▲ 13% of the skill user's ATK x stack count of Precious Moments for 15 sec.\n■ Activates when Happy Memories takes effect. Affects self.\nSnapshots of Youth: Normal Attack Damage Multiplier ▲ 10% continuously, stacks up to 3 time(s).\n■ Activates when Full Burst ends. Affects self.\nRemoves Making Memories.\nRemoves Snapshots of Youth.",
    "skill2": "■ Activates when performing normal attacks while in Making Memories status. Affects self.\nEffect varies according to the number of attacks. Only one effect is triggered at a time. Resets when Making Memories is removed.\nTwo times: Reloads 6 rounds.\nFour times: Happy Memories: Number of pellets ▲ 1 continuously. Stacks up to 3 times.\nSix times: Precious Moments: ATK ▲ 2.49% continuously. Stacks up to 3 times.\n■ Activates when using Burst Skill. Affects all shotgun-wielding allies (except self).\nAttack Damage ▲ 55% for 10 sec.",
    "burst": "■ Affects self.\nMaking Memories\nFunction: Enhances attack capabilities.\nEffect 1: Critical Rate ▲ 20.09% continuously.\nEffect 2: Reloads 2 round(s).\nEffect 3: Attack Damage ▲ 29.99% continuously.\n■ Affects all enemies.\nDeals 554.4% of final ATK as Burst Skill damage."
  }
}
```

## 2. Damage-formula SSOT (summary; docs/data/damage-calculation.md + game-mechanics.md)

```
Damage = ATK x (major) x (element) x (charge) x (dmgUp) x (taken) x (distributed), all multiplicative.
- major: Full Burst grants +50% major to FB-window damage; a burst CAST lands BEFORE the FB window opens => burst-cast damage is FB-exempt (noFb, fbMajorApplied=false) and range-bonus-OFF (universal rider rule).
- dmgUp bucket: attackDamagePct stacks ADDITIVELY within the bucket then multiplies once; casterAtkPct is stored as an ABSOLUTE ATK grant (caster ATK x pct/100), NOT a percentage on the recipient.
- crit/core: critRatePct lifts crit on EVERY eligible bucket; critRateNormalPct lifts crit on NORMAL attacks only. A nuke "without core strike" is core-ineligible. critRate stored 0..1 in events.
- normalAttackPct scales the NORMAL-attack multiplier ONLY (never burst/skill). pelletCountFlat adds effective SG pellets (hitsPerShot + stat), MULTIPLICATIVE with normalAttackPct (each pellet = 1/hitsPerShot of the shot); gauge is base-capped (extra pellets do not pump per-trigger burst energy).
- atkPct scales base ATK (feeds every bucket); distinct from attackDamagePct (dmgUp bucket).
- triggers: burstCast (owner casts their burst, pre-FB), fullBurstEnter (FB opens), fullBurstEnd (FB closes). ownBurstGate:"cast" composes with fullBurstEnd to fire iff the owner burst that rotation.
- targets: alliesOfWeapon {weapon} (weapon-typed), excludeSelf drops the caster, alliesOfClass {cls}, allies (all). buffApply events carry casterIdx + targetIdx (null = boss).
- buffRemove events fire ONLY for reload-caused removals; a durationSec lapse emits NO buffRemove event (expiry is by lapse-reset).
```

## 3. Driver's override (src/skills/overrides/arcana-fortune-mate.json — UNCHANGED by this gauntlet except the provenance note append)

```json
{
  "note": "[2026-07-21 A4 PELLET-COUNT] Happy Memories 'Number of pellets ▲1 ×3' (the skill2 self block, formerly normalAttackPct 30) is now the real pelletCountFlat 3 primitive (10→13 effective SG pellets, rampSec 11), threaded through the SG landing/gauge path (each pellet = 1/10 of the shot; gauge base-capped). This is DISTINCT from Snapshots of Youth (skill1 'Normal Attack Damage Multiplier ▲10% ×3'), which stays normalAttackPct 30. The two were both encoded as normalAttackPct 30 and thus SUMMED (×1.60); the pellet primitive correctly makes Happy Memories MULTIPLICATIVE with Snapshots (×1.30·×1.30=×1.69) — the faithful fix for the '~1.6× vs ~1.69×' undercount flagged below. OWNER-SIGNED-OFF board move (2026-07-21): +1.6% HOT (board 1.130→1.146). She remains over-modeled (root = stack magnitude, a separate measurement item, gotcha #1) so this makes her board reading slightly worse while more faithful; do NOT tune it to fit. See docs/handoffs/2026-07-21-a4-pellet-count-prereg.md. --- [2026-07-16 WEAPON-TARGET FIX] S1 39% casterAtk + S2 55% attackDamage now target alliesOfWeapon SG (kit: 'all shotgun-wielding allies', S2 'except self') — the engine gained a weapon-typed target, replacing the alliesOfClass Attacker approximation; excludeSelf now actually enforced (alliesOfClass silently ignored it, so she had been self-buffing the 55%). --- [2026-07-16 MECHANIC FIX] Making Memories self-buffs are NOT permanent — she gains them only during her OWN Full Burst and they are removed at FB EXIT (owner-confirmed). Now keyed to her OWN burstCast + durationSec 11 (spans her burst -> FB exit) — NOT fullBurstEnter, which would wrongly grant MM on any team FB even when a DIFFERENT B2 bursts and she did not — with the 2/4/6-hit phase stacks BAKED to max (Snapshots normalAttackPct 30, Happy-pellets normalAttackPct 30, Precious atkPct 7.47), since she maxes them within the window then they reset. S2 team +55% attackDamage now excludeSelf:true (kit 'except self'). This moved her 1.83 -> 1.74 HOT (sim/real); she remains OVER-modeled — RESIDUAL = compounding self-buff MAGNITUDE during FB (normal ~10x unbuffed), prime suspect the Happy-Memories '+3 pellets = +30% normal' approximation; needs a full hand-tune vs a recording. --- [ORIG] Whole-kit steady-state model of her Making Memories mode. Burst grants Making Memories (self Crit Rate 20.09% + Attack Damage 29.99%) plus the 554.4% nuke. While in Making Memories her normal attacks build phases (S2): at 2 hits a reload, at 4 hits Happy Memories (+1 pellet, x3), at 6 hits Precious Moments (ATK 2.49%, x3); reaching Happy Memories also grants Snapshots of Youth (Normal Atk Mult +10%, x3). Steady state assumes all mode buffs are maxed while she fights, so they are modeled as permanent self-buffs keyed to burstCast (origin of the mode): Precious Moments atkPct 2.49 x3, Snapshots normalAttackPct 10 x3, and Happy Memories's +3 pellets modeled as normalAttackPct 10 x3 (one extra pellet on a 10-pellet base = +10% normal damage; slight undercount vs the true multiplicative pellet x snapshot interaction, ~1.6x vs ~1.69x). S1 buffs 'all shotgun-wielding allies' by 13% of caster ATK per Precious Moments stack -> 39% at 3 stacks (fullBurstEnd); S2 buffs the same group +55% Attack Damage on burst. The sim has no weapon-typed target, so both use alliesOfClass Attacker: her real teams are built around shotgun DPS and SG wielders are overwhelmingly Attackers, making the Attacker class a closer match than all-5 (which would waste the buff on supporters/B1). Caveats: no except-self target exists, so the 55% (game text: except self) also over-buffs Arcana herself; and the mode buffs assume permanent max uptime rather than only-while-in-Making-Memories. Skipped: all reloads (Reload 6 / Reload 2 rounds, uptime QoL) and the Full-Burst-end removal of Making Memories/Snapshots (mode cleanup), both non-damage. --- Kit-autonomy gauntlet 2026-07-24: full S0–S9 audit confirmed ALL 7 damage lines FAITHFUL cross-family (driver Qwen + blind claude-fable-5 S2b converged on an identical load-bearing set; S5/S6/S7 opus blind corroboration pending at audit time). NO ENCODING CHANGE — the shipped model is faithful as-is (weapon-typed SG targeting + excludeSelf, burstCast keying of the Making-Memories self-buffs, the A4 pelletCountFlat-3 primitive multiplicative with Snapshots normalAttackPct 30, and the 554.4 pre-FB nuke all discriminate correctly against their nearest-wrong counterfactuals in scripts/tests/units/arcana-fortune-mate.test.ts). Residual stays the owner-accepted measurement item gotcha #1 (stack ramp magnitude/timing — rampSec 11 on the ~1.5 pulls/s SG cadence estimate; counter cycling past 6 within a window; cross-window persistence of the Happy Memories + Precious Moments stacks the FB-end removal does NOT name) — a COLD-direction refinement of an already-HOT over-model, NOT to be tuned to fit.",
  "unmodeled": {
    "skill1": [
      "Full Burst ends: self removes Making Memories + Snapshots of Youth."
    ],
    "skill2": [
      "Normal attacks in Making Memories (one at a time, resets on MM removal): 2 time(s): Reload 6 rounds."
    ],
    "burst": ["Making Memories: Reload 2 rounds."]
  },
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 39,
          "durationSec": 15
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
      "effects": [
        {
          "kind": "buff",
          "stat": "normalAttackPct",
          "value": 30,
          "durationSec": 11,
          "rampSec": 11
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SG",
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 55,
          "durationSec": 10
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 7.47,
          "durationSec": 11,
          "rampSec": 11
        },
        {
          "kind": "buff",
          "stat": "pelletCountFlat",
          "value": 3,
          "durationSec": 11,
          "rampSec": 11
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
          "stat": "critRatePct",
          "value": 20.09,
          "durationSec": 11
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 29.99,
          "durationSec": 11
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
          "atkPct": 554.4
        }
      ]
    }
  ],
  "caveats": [
    "skill1/skill2: Making Memories stack buffs (Snapshots +30 normal, Happy Memories +3 pellets via pelletCountFlat 3 — 2026-07-21 A4, was +30 normal, Precious Moments +7.47 ATK) now carry rampSec 11 (theme 3, 2026-07-17) — the real 2/4/6-shot phase counter reaches cap at ~16-18 shots (~10.7-12s at ⚑1.5 pulls/s) ≥ the 11s window, so each buff ramps 0→full across the window (time-avg ~half of cap) and RESETS per window via the engine lapse-reset (the ~9s inter-burst gap fully lapses the buff). Replaces the prior BAKED-to-max encoding. ⚑ rampSec 11 rests on the 1.5 pulls/s SG cadence estimate; a focus recording refines it.",
    "skill1: the 39% (=13% x 3 Precious Moments stacks) at Full Burst end assumes 3 stacks; the ramp arithmetic reaches ~2 by FB end (HOT direction), and the block fires on EVERY team FB end even on rotations she did not burst (0 stacks in reality — multi-B2 comps over-credit).",
    "skill2/burst: the kit's in-window reloads (Reload 6 rounds at the 2-hit phase; Reload 2 rounds at burst) are unmodeled — they add ~3-5 window shots (COLD direction, partially masks the ramp over-credit)."
  ]
}
```

## 4. S2b pre-op adversarial review (claude-fable-5, CROSS-FAMILY) + S2c driver reconciliation

```json
{
  "slug": "arcana-fortune-mate",
  "leakDetected": null,
  "leakNote": "Redacted methodology is clean. The effect schema's teamHas example names `arcana` — that is the BASE unit (RL/Electric), a different unit from this SG/Fire variant per the exact-slug rule; not a leak of this unit's answer.",
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "FB ends → SG allies: ATK ▲13% of user",
      "disposition": "FAITHFUL",
      "scope": "Generic ATK add, flat % of the CASTER's ATK (casterAtkPct path), multiplied by live Precious Moments stack count (0–3) at fire time",
      "durationSemantics": "15 s wall-clock (durationSec: 15) from each Full Burst end",
      "triggerIdentity": "fullBurstEnd (literal 'when Full Burst ends') — NOT fullBurstEnter, NOT burstCast; fires on every team FB end regardless of who burst",
      "targetSet": "All shotgun-wielding allies — weapon-typed, no '(except self)' clause, so self INCLUDED",
      "nearestWrongModel": "Encoded as fixed atkPct 13 on the target's own ATK (wrong base) and/or a static 13% ignoring the ×stack-count scaling, and/or keyed to fullBurstEnter (buff live DURING FB instead of the downtime after it)",
      "distinguishingAssertion": "cfg.onEvent: with 0 Precious Moments stacks at first FB end (counter never reached 6), assert NO casterAtkPct buffApply (or value 0); after stacks=N, assert a buffApply at the fullBurstEnd frame with value 13×N and stat casterAtkPct (flat add — value invariant when the recipient's own base ATK is changed), absent at fullBurstStart",
      "inertness": "Must NOT apply to non-SG allies (liter/crown in controlComp); must NOT be live inside the FB window it follows; recipient's own-ATK scaling must not change the add",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Happy Memories → self: NA mult ▲10%",
      "disposition": "FAITHFUL",
      "scope": "Normal-attack damage MULTIPLIER scale (normalAttackPct) — scoped to normal-attack hits only, never the burst nuke",
      "durationSemantics": "'continuously' with maxStacks 3 — persists until explicitly removed at FB end (skill1 block 3), not a timed window",
      "triggerIdentity": "Chained trigger: fires when Happy Memories (skill2 four-times pellet stack) takes effect — one Snapshots stack per Happy Memories application; ⚑ whether a refresh at Happy-Memories cap (3) still fires this",
      "targetSet": "Self only",
      "nearestWrongModel": "Encoded as attackDamagePct (generic Damage-Up, over-credits the 554.4% burst nuke) or as an independent passive/interval stack unlinked from Happy Memories applications",
      "distinguishingAssertion": "Normal-bucket damage events after k Happy Memories procs show mult scaled ×(1+0.10k) vs control; the burst-bucket 554.4% event mult is IDENTICAL with and without Snapshots stacks (red under the attackDamagePct misread); zero Snapshots buffApply before the 4th counted attack of the first Making Memories window",
      "inertness": "Burst-skill damage and any flatDamage bucket must not move; stacks must be gone after fullBurstEnd",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "FB ends → self: removes MM + Snapshots",
      "disposition": "FAITHFUL",
      "scope": "Status/stack removal only — no stat magnitude",
      "durationSemantics": "Defines the END of the Making Memories window (burst cast → FB end) and zeroes Snapshots of Youth; Happy Memories and Precious Moments are NOT named, so those stacks PERSIST across cycles",
      "triggerIdentity": "fullBurstEnd",
      "targetSet": "Self",
      "nearestWrongModel": "Making Memories modeled as a fixed 10 s durationSec (breaks under fullBurstExtend and misses the pre-FB cast→FB-start segment) OR removal also wiping Happy Memories / Precious Moments (kills the cross-cycle 3-stack ramp)",
      "distinguishingAssertion": "buffRemove for the burst's critRatePct 20.09 / attackDamagePct 29.99 and for Snapshots coincides with the fullBurstEnd event frame, not castFrame+10 s; pelletCountFlat and the 2.49% atkPct stacks survive past FB end (buff still present on the next window's first shot); skill2 counter events resume from 0 in window 2 (a reload-6 fires on the 2nd attack of window 2, not the counter continuing from window 1)",
      "inertness": "Happy Memories (pellets) and Precious Moments (ATK) must NOT be removed at FB end",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "normal attacks in MM: 2/4/6 counter",
      "disposition": "FAITHFUL",
      "scope": "Counts the owner's normal-attack trigger pulls (ROUNDS — 1 per pull for SG, spending the 9-round magazine), NOT the 10 pellets per shot",
      "durationSemantics": "Counter live only while Making Memories is up (her burst cast → FB end); 'Resets when Making Memories is removed' → counter re-starts at 0 each burst window; ⚑ whether the counter CYCLES past 6 within one window (8→reload, 10→pellet, 12→ATK) or arms once per window — kit-silent, flag with an estimate (cycling is the common pattern; her ~1.5 pulls/s SG × ~11 s window ≈ 14–16 pulls ≈ 2 cycles) and pin from footage",
      "triggerIdentity": "hitCount-family thresholds gated on the Making Memories self-status (requiresTargetStatus is boss-side; this needs a self-status/window gate — e.g. blocks live only during the burst-cast→fullBurstEnd span). Sub-effects: 2× → instantReload fraction 6/9 (Reloads 6 ROUNDS, not full); 4× → pelletCountFlat +1, maxStacks 3; 6× → atkPct 2.49 self, maxStacks 3, permanent",
      "targetSet": "Self for all three payloads",
      "nearestWrongModel": "Counter ungated (counts all fight-long normals → stacks capped in the opening seconds and reload-6 spam all fight) OR counting pellet hits (10× rate → everything caps in the first magazine) OR 'Reloads 6 rounds' as a full instantReload OR Happy Memories encoded as normalAttackPct instead of pelletCountFlat",
      "distinguishingAssertion": "Before her first burst cast, N shots produce ZERO counter payload events (no partial reload event, no pelletCountFlat/atkPct buffApply) — red under the ungated read; inside the first window, the partial reload event lands after exactly the 2nd PULL (not after pull 1 under a pellet-count read, which would trigger at 2 pellets ≪ 1 shot); the reload event refills ≤6 rounds (ammo goes 7→9, capped), not an unconditional 9; after the 4th pull, effectivePellets on subsequent shot events reads base+1 (queryable pellet count), while a normalAttackPct-proxy model shows no pellet change",
      "inertness": "Non-SG allies untouched; nothing fires outside Making Memories; the 2.49% ATK stacks are self-only and must not appear on teammates",
      "evidenceTier": "DATAMINED (magnitudes); CALIBRATED ⚑ (cycling-past-6 behavior and cap-refresh semantics)",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "using Burst → SG allies (except self)",
      "disposition": "FAITHFUL",
      "scope": "Attack Damage ▲55% — attackDamagePct (Damage-Up bucket), generic across the recipients' hit types",
      "durationSemantics": "10 s wall-clock from her burst CAST",
      "triggerIdentity": "burstCast (literal 'when using Burst Skill' — her OWN cast, pre-FB), NOT fullBurstEnter; fires only on rotations SHE bursts",
      "targetSet": "All shotgun-wielding allies EXCEPT SELF — the explicit exclusion is the sharp edge",
      "nearestWrongModel": "Self included in the target set (over-credits the carry herself by a 55-point Damage-Up dilution-bucket add — the single largest plausible over-credit in this kit) and/or keyed to fullBurstEnter (over-fires on FBs chained by another Burst-II unit in off-rotations)",
      "distinguishingAssertion": "On her burstCast event frame, buffApply attackDamagePct 55 targets every OTHER SG ally and there is NO self-targeted apply (filter buffApply by stat=attackDamagePct, value=55, targetIdx===casterIdx must be empty); her own damage events in the following 10 s carry a Damage-Up bucket identical to a run with this block deleted (withPatchedOverride)",
      "inertness": "Her own damage must not move; non-SG allies must not receive it; no application on an FB she did not personally burst into",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "self: Making Memories (crit/reload/AD)",
      "disposition": "FAITHFUL",
      "scope": "Effect 1: critRatePct 20.09 — UNSCOPED crit (text says 'Critical Rate', no normal-attack qualifier, so NOT critRateNormalPct); Effect 3: attackDamagePct 29.99 generic; Effect 2: instantReload of 2 rounds = fraction 2/9 of her 9-round magazine, one-shot at cast",
      "durationSemantics": "'continuously' = for the life of the Making Memories status: burst cast → removed at fullBurstEnd by skill1 block 3. NOT a fixed 10 s and NOT permanent",
      "triggerIdentity": "burstCast (self block inside her own burst), stage 2; also OPENS the Making Memories window the skill2 counter is gated on — pre-FB shots between cast and FB start already count",
      "targetSet": "Self",
      "nearestWrongModel": "durationSec: 10 hard-coded (diverges whenever fullBurstExtend is live, and silently drops the cast→FB-start head segment) or the crit line scoped to normal attacks only (under-credits the pre-FB portion of nothing else here, but mis-buckets crit on any flatDamage), or 'Reloads 2 round(s)' as a full magazine refill",
      "distinguishingAssertion": "damage events between her cast frame and fullBurstEnd carry crit rate = sheet+20.09 and a +29.99 Damage-Up component; the first damage event AFTER fullBurstEnd is back at sheet crit (buffRemove at the FB-end frame); the cast-frame reload event adds exactly 2 rounds (e.g. ammo 4→6), not →9",
      "inertness": "Teammates' crit/AD must not move; nothing applies on team FBs she did not burst into",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "all enemies: 554.4% Burst Skill damage",
      "disposition": "FAITHFUL",
      "scope": "flatDamage atkPct 554.4 of FINAL ATK, burst bucket; crits at caster sheet rate; NO core (text lacks 'core strike'); single boss so 'all enemies' = one hit",
      "durationSemantics": "Instant, once per cast",
      "triggerIdentity": "burstCast damage — lands PRE-FB, therefore FB-exempt (noFb per taxonomy: a burst cast lands before the FB window opens) and range-bonus-OFF per the universal rider rule",
      "targetSet": "Enemy",
      "nearestWrongModel": "fbMajorApplied=true on the nuke (letting the +50% FB major and FB auras credit a pre-FB hit) or core-eligible",
      "distinguishingAssertion": "The 554.4-mult damage event has inFullBurst=false / fbMajorApplied=false and rangeApplied=false, zero core component; deleting the block moves ONLY one burst-bucket event per rotation",
      "inertness": "Must not scale with Snapshots of Youth (normal-attack-scoped) nor with her own skill2 55% (self-excluded); must not receive FB +50%",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:fullBurstEnd-team-casterAtk-13xStacks",
    "skill1:happyMemories-chained-snapshots-normalAttackPct",
    "skill1:fullBurstEnd-removes-MM-and-snapshots",
    "skill2:MM-gated-2/4/6-counter (reload6 + pelletCountFlat + atkPct2.49)",
    "skill2:burstCast-SGallies-exceptSelf-AD55",
    "burst:MM-self-crit20.09/reload2/AD29.99-untilFbEnd",
    "burst:flatDamage-554.4-noFb-noCore"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [],
    "burst": []
  },
  "notes": "Expected shared-prior misreads, in descending damage-risk order: (1) skill2 team buff INCLUDING SELF — the '(except self)' clause is the kit's sharpest edge; a self-included 55-point Damage-Up on the carry is the biggest single over-credit available here. (2) The skill1 team ATK being fixed 13% of the RECIPIENT'S ATK instead of a caster-flat add × live Precious Moments stack count — with 0 stacks it must be zero/absent, and its magnitude ramps across the fight as the 6-count threshold accrues stacks (1st FB end likely 1 stack, not 3; assert the ramp, not just the cap). (3) 'Continuously' on the burst self-buffs given durationSec:10 instead of removal-at-fullBurstEnd — near-identical numerically on a plain 10 s FB, so the distinguishing assertion must use the removal FRAME (or a fullBurstExtend run) rather than totals. (4) The skill2 counter left ungated or counting the SG's 10 pellets instead of trigger pulls — either caps all three payloads absurdly early; the pre-first-burst inertness assertion (zero counter events while firing) kills both at once. (5) Happy Memories encoded as a normalAttackPct proxy instead of pelletCountFlat — near damage-neutral for a unit ALSO carrying a real normalAttackPct line (Snapshots of Youth), where the interaction is multiplicative under pelletCountFlat vs additive-in-the-same-stat under the proxy, so it IS distinguishable here: assert effectivePellets=base+stacks on shot events. (6) Removal scope: FB end strips ONLY Making Memories + Snapshots; Happy Memories and Precious Moments persist and cross-window ramp to their 3-caps — a model wiping all four statuses under-credits every window after the first. Flags: ⚑ counter cycling past 6 within one window and ⚑ whether a capped Happy Memories refresh still fires the Snapshots chain — both kit-silent, pin from footage; magnitudes themselves are all kit-literal. Comp note for the driver: she is Burst II, so controlComp's crown (B2) collides — the burstCast-vs-fullBurstEnter discrimination NEEDS a comp where the other B2 can chain an FB she doesn't burst into, which is exactly where the wrong trigger over-fires.",
  "model": "claude-fable-5",
  "driverReconciliation": {
    "driver": "qwen",
    "reviewer": "claude-fable-5",
    "stage": "S2c",
    "agreement": "CONVERGED — driver and blind reviewer independently disposition ALL 7 kit lines FAITHFUL with an identical load-bearing set (L1 S1 casterAtk 13%x3 SG allies; L2 Snapshots normalAttackPct 30; L3 S2 AD55 SG-except-self; L4 Precious atkPct 7.47; L5 Happy pelletCountFlat 3; L6 MM critRatePct 20.09 + attackDamagePct 29.99; L7 554.4 burst nuke).",
    "convergentDiscriminations": [
      "L3 excludeSelf — reviewer names self-inclusion \"the kit's sharpest edge / biggest single over-credit\"; driver test pins targets [drake,zwei] and the no-excludeSelf cf leaks afm.",
      "L5 pelletCountFlat vs normalAttackPct proxy — reviewer: \"distinguishable here… multiplicative under pelletCountFlat vs additive-in-the-same-stat\"; driver test asserts shipped normals > additive cf (x1.69 > x1.60).",
      "burstCast-vs-fullBurstEnter keying — reviewer explicitly notes the B2-collision comp need (\"the other B2 can chain an FB she doesn't burst into\"); driver fixture A (crown contests B2, afm 0 casts/12 team FBs) pins self-buffs inert + fullBurstEnter cf over-fires.",
      "L1/L3 weapon-typed targeting (alliesOfWeapon SG) — reviewer: must not apply to non-SG allies; driver fixture B fields zwei (SG non-Attacker) + liter (RL) to falsify both alliesOfClass-Attacker and all-allies."
    ],
    "measurementGatedFlags": [
      "Stack ramp magnitude/timing (rampSec 11 rests on the ~1.5 pulls/s SG cadence estimate) — override gotcha #1, owner-accepted measurement item.",
      "Counter cycling past 6 within one ~11s window (~14-16 pulls ≈ 2 cycles) — kit-silent, reviewer ⚑, pin from footage.",
      "Cross-window persistence of Happy Memories + Precious Moments stacks (S1 block 3 removes only MM + Snapshots, NOT Happy/Precious) — reviewer notes a per-window reset under-counts later windows; override documents this within the stack-magnitude residual. Direction note: this is a COLD-direction refinement of an already-HOT over-model; NOT a faithfulness failure."
    ],
    "leakCheck": "CLEAN — reviewer flagged the schema teamHas example naming base `arcana` (RL/Electric) as a different unit, NOT a leak of this variant's answer.",
    "realGotcha": "NONE",
    "verdict": "GO (test-faithfulness review corroborated cross-family; pending S5/S6/S7 post-op blind corroboration)"
  }
}
```

## 5. S5 blind post-op test-writer (claude-opus-5, CROSS-FAMILY)

### convergence categorization (driver, sighted — blind/arcana-fortune-mate.convergence.txt)

```
S5 BLIND-TEST CONVERGENCE — arcana-fortune-mate (claude-opus-5 blind test vs driver override)
=============================================================================================
Raw blind test (blind/arcana-fortune-mate.test.ts) written from kit prose ALONE. Mechanically
adapted (adapted.test.ts) per the writer's own "shape assumptions, one-line fixes" invitation:
  (1) import path ../lib/harness -> ../lib/harness.js (run from scripts/tests/units/)
  (2) override shape o.blocks -> [].concat(skill1,skill2,burst) (real override has no `blocks`)
  (3) fixture controlComp(afm) -> [liter,afm,ada]: crown in controlComp contests the B2 slot so
      afm casts 0 (writer's flagged fixture-validity risk); [liter,afm,ada] makes afm SOLE B2
      (bursts) AND the ONLY SG (preserves the writer's S1-a-self / S2-b-empty inertness logic).
  (4) totalOf: totals() returns a per-slug Record, not a number -> totals(res)[SLUG].
  (5) idxOf: returned e.srcSlot (string 'normal') for damage -> unitIdx ?? casterIdx.

RESULT vs driver override: 11 passed / 7 failed / 2 skipped (20).

CONVERGENT PASSES (the load-bearing set, independently derived):
  + fixture validity: afm identifiable, casts her own burst, team reaches Full Burst
  + in-window AND out-of-window shots both exercised
  + S1-a granted on EVERY Full Burst end (no own-burst gate — line has no such clause)
  + S2-a whole family GATED ON HER burstCast — nothing fires before her first cast  [burstCast keying]
  + Snapshots normalAttackPct modeled, load-bearing, moves no teammate
  + Snapshots SCOPED to normal multiplier (generic attackDamagePct would lift the 554.4 nuke)  [normalAttackPct scoping]
  + Happy Memories pelletCountFlat +1×<=3, load-bearing, gauge/teammate-inert
  + pellet primitive NOT interchangeable with a normalAttackPct proxy (multiplicative vs additive)  [A4 fix]
  + Precious Moments self atkPct 2.49×<=3, load-bearing
  + S2-b 55% never lands on non-SG ally, never on self (excludeSelf + SG-only)  [excludeSelf]
  + 554.4% nuke modeled, once per cast, Full-Burst-exempt by timing  [pre-FB nuke]

RESIDUAL FAILURES — ALL blind-test artifacts (0 real gotchas), 3 classes:
  (A) casterAtkPct ABSOLUTE-ATK storage misconception (3): the engine stores casterAtkPct as an
      absolute ATK grant (afm ~46670 = 39% x caster ATK), not a percentage. Blind asserted value<=39
      and a flat-39-counterfactual comparison, and did not filter casterAtkPct by afm's casterIdx
      (so it picked up liter's/ada's casterAtkPct for the ordering + target-set checks). Identical
      to the 4 casterAtkPct-absolute artifacts the judge ruled non-real for base `arcana`.
      -> S1-a "FB-end ordering", "SG-only inertness (tgts.size 2 not 1)", "stack-cap 13/26/39".
  (B) buffRemove-for-duration-expiry misconception (3): the engine emits buffRemove ONLY for
      reload-caused removals (types.ts); a durationSec lapse emits no event. The driver models the
      FB-end removal of MM/Snapshots faithfully via durationSec 11 lapse-reset, so no buffRemove
      fires. Blind expected an explicit buffRemove. -> Snapshots "expires", burst crit "expires",
      burst AD "expires". (Driver test pins removal via fixture-A inertness + the 11s duration.)
  (C) reload modeling divergence (1): blind modeled the kit reloads (Reload 6 @2-hit, Reload 2 @burst)
      as damage-relevant (instantReload). The driver documents them as UNMODELED inert uptime QoL
      (override unmodeled.skill2/burst, note: "~3-5 window shots, COLD direction, partially masks the
      ramp over-credit") — an honest, owner-accepted skip, not a hidden faithfulness failure.

VERDICT: blind spec CONVERGES on the identical load-bearing set; all 7 residuals are API/event-model
misconceptions (A,B) plus one documented modeling skip (C). NO REAL-GOTCHA against the driver override.

```

### blind test source (scripts/kit-autonomy/blind/arcana-fortune-mate.test.ts — UNMODIFIED blind output)

```typescript
/**
 * arcana-fortune-mate - Arcana: Fortune Mate (SG / Fire / Attacker / Burst II)
 * base: cd 20s, ammo 9, reloadFrames 161, chargeFrames 0, hitsPerShot 10,
 * normalAttackMultiplier 222.8, coreAttackMultiplier 200.
 *
 * BLIND per-kit-line spec test. Written from the kit prose ALONE - no sight of this unit's
 * override, the driver test, or any truth file. Every group states the kit line, what the
 * assertion proves, and the nearest-wrong model it must go RED under (built in-memory via
 * withPatchedOverride; the committed JSON is never touched).
 *
 * KIT (structural summary, short quotes only):
 *  S1-a  Activates when Full Burst ends -> all shotgun-wielding allies (SELF INCLUDED: the line
 *        has no 'except self'): ATK +13% 'of the skill user's ATK' x Precious Moments stacks,
 *        15 sec.  => casterAtkPct (flat add off the CASTER's ATK, NOT target-scaled atkPct),
 *        stack-scaled 13/26/39, trigger fullBurstEnd, 15 s.
 *  S1-b  Activates when Happy Memories takes effect -> self: Snapshots of Youth,
 *        'Normal Attack Damage Multiplier +10%', continuously, up to 3 stacks.
 *        => normalAttackPct 10 (SCOPED to the normal multiplier; generic attackDamagePct would
 *        also lift her 554.4% burst hit). The engine has no 'when another buff applies' trigger,
 *        so this must be CO-LOCATED on whatever block grants Happy Memories (the 4-attack
 *        threshold). Derived: only ONE Happy Memories application can occur per Making Memories
 *        window, and S1-c wipes Snapshots at FB end, so 1 stack (+10%) is the only REACHABLE
 *        level - the maxStacks 3 ceiling is unreachable in this fight shape.
 *  S1-c  Activates when Full Burst ends -> self: removes Making Memories, removes Snapshots of
 *        Youth. => the burst self-mode buffs AND the normalAttackPct stacks must EXPIRE at FB
 *        end (durationSec ~ the FB window); a permanent passive over-credits the whole fight.
 *  S2-a  Activates when performing normal attacks while in Making Memories status -> self.
 *        Thresholds 2 / 4 / 6; 'Only one effect is triggered at a time'; 'Resets when Making
 *        Memories is removed'.  2x: reloads 6 rounds. 4x: Happy Memories 'Number of pellets +1'
 *        continuously, <=3. 6x: Precious Moments 'ATK +2.49%' continuously, <=3.
 *        Making Memories comes ONLY from her own burst and dies at FB end, so this entire family
 *        is gated on HER burst cast: nothing here may fire before her first burstCast.
 *  S2-b  Activates when using Burst Skill -> all shotgun-wielding allies '(except self)':
 *        Attack Damage +55% for 10 sec. The fixture contains no second shotgun -> INERT here.
 *  B-1/2/3  self Making Memories: Critical Rate +20.09%, Reloads 2 rounds, Attack Damage
 *        +29.99% - all 'continuously', i.e. until S1-c removes them at FB end.
 *  B-4   'Deals 554.4% of final ATK as Burst Skill damage' -> one flatDamage per cast, exempt
 *        from the +50% Full-Burst major by timing (the cast lands before the FB window opens).
 *
 * FIXTURE: controlComp(SLUG, true) - liter B1 / crown B2 / carry / helm B3, Fire boss, focus =
 * carry, deterministic (no seed). helm is kept ON: her ally buff is critRateNormalPct-scoped and
 * she wields an SR, so she can confound neither the pellet path nor the shotgun-ally target set.
 * Two fixture limits this comp imposes on a Burst-II carry are ASSERTED rather than assumed:
 *   (1) crown is also Burst II. If the rotation never lets arcana-fortune-mate cast, every
 *       Making-Memories line is unreachable - the 'fixture' group asserts her burstCast >= 1.
 *   (2) liter (SMG) / crown (RL) / helm (SR) means she is the ONLY shotgun present, so S1-a
 *       resolves to self only and S2-b resolves to nobody. S2-b's inertness IS assertable and
 *       is asserted; its positive case is it.skip'd (non-vacuity unsatisfiable in this comp).
 *
 * SHAPE ASSUMPTIONS (mechanical, one-line fixes if the harness differs): CompOptions carries a
 * cfg object (cfg.onEvent) and an overrides map keyed by slug; event time fields are never used
 * (all ordering claims are made on stream position), and unit/total damage is read through
 * defensive accessors.
 */
import { describe, expect, it } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

const SLUG = 'arcana-fortune-mate';
const MATES = ['liter', 'crown', 'helm'];

/* ------------------------------- helpers -------------------------------------- */
const nearV = (a: any, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 0.005;
const idxOf = (e: any): number =>
  e.srcSlot ?? e.casterIdx ?? e.slot ?? e.unitIdx ?? e.idx ?? -1;
const isBuff = (e: any, stat: string) => e.kind === 'buff' && e.stat === stat;

let patchHits = 0;
const dropFx = (o: any, pred: (e: any) => boolean) => {
  for (const b of o.blocks ?? []) {
    b.effects = (b.effects ?? []).filter((e: any) => {
      const hit = pred(e);
      if (hit) patchHits++;
      return !hit;
    });
  }
};
const mapFx = (
  o: any,
  pred: (e: any) => boolean,
  fn: (e: any, b: any) => void
) => {
  for (const b of o.blocks ?? [])
    for (const e of b.effects ?? [])
      if (pred(e)) {
        patchHits++;
        fn(e, b);
      }
};

interface Run {
  res: any;
  events: any[];
  patched: number;
}

function run(mutate?: (o: any) => void): Run {
  patchHits = 0;
  const events: any[] = [];
  const base: any = controlComp(SLUG, true);
  const opts: any = {
    ...base,
    cfg: {
      ...(base.cfg ?? {}),
      onEvent: (e: any) => {
        events.push({ ...e, i: events.length });
      },
    },
  };
  if (mutate)
    opts.overrides = {
      ...(base.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate),
    };
  const res = runComp(opts);
  return { res, events, patched: patchHits };
}

const totalOf = (r: Run) => {
  const t: any = totals(r.res);
  return typeof t === 'number' ? t : (t.damage ?? t.total ?? t.totalDamage);
};
const unitDmg = (r: Run, slug: string) => {
  const u: any = unitOf(r.res, slug);
  return typeof u === 'number' ? u : (u?.damage ?? u?.total ?? u?.totalDamage);
};
const applies = (r: Run, stat: string, pred?: (e: any) => boolean) =>
  r.events.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && (!pred || pred(e))
  );
const removes = (r: Run, stat: string, pred?: (e: any) => boolean) =>
  r.events.filter(
    (e) => e.kind === 'buffRemove' && e.stat === stat && (!pred || pred(e))
  );
const firstOf = (r: Run, kind: string) => r.events.find((e) => e.kind === kind);

/* ------------------------------- hoisted runs (10 sims) ----------------------- */
const BASE = run();

// nearest-wrong: Happy Memories unmodeled (pellet grant deleted)
const NO_PELLET = run((o) => dropFx(o, (e) => isBuff(e, 'pelletCountFlat')));

// nearest-wrong: 'Normal Attack Damage Multiplier' read as generic Attack Damage
const SNAP_GENERIC = run((o) =>
  mapFx(
    o,
    (e) => isBuff(e, 'normalAttackPct'),
    (e) => {
      e.stat = 'attackDamagePct';
    }
  )
);

// nearest-wrong: the two reload lines dropped as 'defensive / no damage'
const NO_RELOAD = run((o) => dropFx(o, (e) => e.kind === 'instantReload'));

// nearest-wrong: S1-a authored at its 3-stack magnitude from the first FB end (no ramp/stacking)
const CASTER_FLAT_MAX = run((o) =>
  mapFx(
    o,
    (e) => isBuff(e, 'casterAtkPct'),
    (e) => {
      e.value = 39;
      e.maxStacks = 1;
      delete e.rampSec;
      delete e.perResource;
    }
  )
);

// nearest-wrong: Precious Moments unmodeled
const NO_PRECIOUS = run((o) =>
  dropFx(
    o,
    (e) =>
      isBuff(e, 'atkPct') &&
      (nearV(e.value, 2.49) || nearV(e.value, 4.98) || nearV(e.value, 7.47))
  )
);

// nearest-wrong: 'when Full Burst ends' read as 'when entering Full Burst'
const S1A_FB_ENTER = run((o) => {
  for (const b of o.blocks ?? []) {
    if ((b.effects ?? []).some((e: any) => isBuff(e, 'casterAtkPct'))) {
      patchHits++;
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});

// nearest-wrong: Snapshots of Youth unmodeled
const NO_SNAP = run((o) => dropFx(o, (e) => isBuff(e, 'normalAttackPct')));

// nearest-wrong: pellets modeled through the old normalAttackPct proxy instead of the pellet path
const PELLET_PROXY = run((o) =>
  mapFx(
    o,
    (e) => isBuff(e, 'pelletCountFlat'),
    (e) => {
      e.value = 10 * (e.value ?? 1);
      e.stat = 'normalAttackPct';
    }
  )
);

// nearest-wrong: the 554.4% burst hit unmodeled
const NO_NUKE = run((o) =>
  dropFx(o, (e) => e.kind === 'flatDamage' && nearV(e.atkPct, 554.4))
);

/* ---- identify her slot from arcana-fortune-mate-only magnitudes (blind-safe) --- */
const ARCANA_SIG = (e: any) =>
  e.kind === 'buffApply' &&
  e.casterIdx != null &&
  (e.stat === 'pelletCountFlat' ||
    (e.stat === 'critRatePct' && nearV(e.value, 20.09)) ||
    (e.stat === 'attackDamagePct' && nearV(e.value, 29.99)) ||
    (e.stat === 'atkPct' && nearV(e.value, 2.49)));
const arcanaIdx: number = BASE.events.find(ARCANA_SIG)?.casterIdx ?? -1;
const arcanaCasts = BASE.events.filter(
  (e) => e.kind === 'burstCast' && idxOf(e) === arcanaIdx
);
const shotsOf = (r: Run) =>
  r.events.filter((e) => e.kind === 'shot' && idxOf(e) === arcanaIdx).length;

describe('arcana-fortune-mate / fixture validity (non-vacuity)', () => {
  it('she is identifiable, casts her own burst, and the team reaches Full Burst', () => {
    // If any of these fail, EVERY Making-Memories-gated line below is untestable in this comp
    // (crown is the competing Burst II) - the failure IS the finding, not a flaky assertion.
    expect(arcanaIdx).toBeGreaterThanOrEqual(0);
    expect(arcanaCasts.length).toBeGreaterThan(0);
    expect(
      BASE.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
    expect(
      BASE.events.filter((e) => e.kind === 'fullBurstEnd').length
    ).toBeGreaterThan(0);
  });

  it('exercises BOTH sides of the Making-Memories gate (in-window and out-of-window shots)', () => {
    const firstCast = arcanaCasts[0];
    const inFb = BASE.events.filter(
      (e) =>
        e.kind === 'damage' && idxOf(e) === arcanaIdx && e.inFullBurst === true
    );
    const outFb = BASE.events.filter(
      (e) =>
        e.kind === 'damage' && idxOf(e) === arcanaIdx && e.inFullBurst === false
    );
    expect(firstCast).toBeDefined();
    expect(inFb.length).toBeGreaterThan(0);
    expect(outFb.length).toBeGreaterThan(0);
  });
});

describe('S1-a  FB end: ATK +13% of the skill user ATK x Precious Moments stacks, 15s, SG allies', () => {
  it('fires on Full Burst END, not on Full Burst ENTER', () => {
    const a = applies(BASE, 'casterAtkPct')[0];
    const end = firstOf(BASE, 'fullBurstEnd');
    const start = firstOf(BASE, 'fullBurstStart');
    expect(a).toBeDefined();
    expect(end).toBeDefined();
    // faithful: the first grant comes AFTER the first FB has ended
    expect(a.i).toBeGreaterThan(end.i);
    expect(a.i).toBeGreaterThan(start.i);
    // nearest-wrong (same block re-keyed to fullBurstEnter): grants BEFORE the first FB ends
    expect(S1A_FB_ENTER.patched).toBeGreaterThan(0);
    const wA = applies(S1A_FB_ENTER, 'casterAtkPct')[0];
    const wEnd = firstOf(S1A_FB_ENTER, 'fullBurstEnd');
    const wStart = firstOf(S1A_FB_ENTER, 'fullBurstStart');
    expect(wA).toBeDefined();
    expect(wA.i).toBeGreaterThan(wStart.i);
    expect(wA.i).toBeLessThan(wEnd.i);
  });

  it('is granted on EVERY Full Burst end (no own-burst gate - the line has no such clause)', () => {
    const fbEnds = BASE.events.filter((e) => e.kind === 'fullBurstEnd').length;
    expect(applies(BASE, 'casterAtkPct').length).toBeGreaterThanOrEqual(fbEnds);
  });

  it('reaches shotgun-wielding allies only - here that is her alone (inertness)', () => {
    const tgts = new Set(applies(BASE, 'casterAtkPct').map((e) => e.targetIdx));
    // nearest-wrong 'all allies' would show 4 distinct targets in this 4-unit comp
    expect(tgts.size).toBe(1);
    expect([...tgts][0]).toBe(arcanaIdx);
  });

  it('is stack-scaled and capped at 3 stacks (13/26/39), not flat at its maximum', () => {
    const vals = applies(BASE, 'casterAtkPct').map((e) => e.value);
    expect(vals.length).toBeGreaterThan(0);
    expect(vals.every((v: number) => v > 0 && v <= 39.001)).toBe(true);
    // nearest-wrong: 39 from the first FB end onward - strictly more damage than a real ramp,
    // because at the first FB end only ONE Precious Moments stack can exist.
    expect(CASTER_FLAT_MAX.patched).toBeGreaterThan(0);
    expect(totalOf(BASE)).toBeLessThan(totalOf(CASTER_FLAT_MAX));
  });
});

describe('S1-b / S1-c  Snapshots of Youth: Normal Attack Damage Multiplier +10%, wiped at FB end', () => {
  it('is modeled and load-bearing, and moves nobody else (inertness)', () => {
    expect(NO_SNAP.patched).toBeGreaterThan(0);
    expect(totalOf(BASE)).toBeGreaterThan(totalOf(NO_SNAP));
    for (const m of MATES)
      expect(unitDmg(NO_SNAP, m)).toEqual(unitDmg(BASE, m));
  });

  it('is SCOPED to the normal multiplier, not generic Attack Damage', () => {
    // generic attackDamagePct would also lift her 554.4% burst hit and dilute into the Damage-Up
    // bucket alongside the 29.99% burst buff - a different number either way.
    expect(SNAP_GENERIC.patched).toBeGreaterThan(0);
    expect(totalOf(SNAP_GENERIC)).not.toEqual(totalOf(BASE));
  });

  it('is granted inside her Making Memories window and EXPIRES at FB end (not a permanent passive)', () => {
    const ap = applies(BASE, 'normalAttackPct');
    expect(ap.length).toBeGreaterThan(0);
    // gated on Making Memories => cannot exist before her first burst cast
    expect(ap[0].i).toBeGreaterThan(arcanaCasts[0].i);
    // re-granted per window + actually removed => nearest-wrong (one permanent passive applied at
    // t=0 with no removal) fails both of these.
    expect(ap.length).toBeGreaterThanOrEqual(2);
    expect(removes(BASE, 'normalAttackPct').length).toBeGreaterThan(0);
  });
});

describe('S2-a  normal-attack thresholds while in Making Memories (2 / 4 / 6)', () => {
  it('the whole family is gated on HER burst - nothing fires before her first cast', () => {
    const pellets = applies(BASE, 'pelletCountFlat');
    const precious = applies(
      BASE,
      'atkPct',
      (e) =>
        nearV(e.value, 2.49) || nearV(e.value, 4.98) || nearV(e.value, 7.47)
    );
    expect(pellets.length).toBeGreaterThan(0);
    expect(precious.length).toBeGreaterThan(0);
    // nearest-wrong: an always-on passive (or a plain inFb gate that also fires on rotations where
    // crown/helm complete the chain) applies at stream start, before any burstCast of hers.
    expect(pellets[0].i).toBeGreaterThan(arcanaCasts[0].i);
    expect(precious[0].i).toBeGreaterThan(arcanaCasts[0].i);
  });

  it('4x: Happy Memories is +1 pellet per stack, <=3, load-bearing, and gauge/teammate-inert', () => {
    expect(NO_PELLET.patched).toBeGreaterThan(0);
    const vals = applies(BASE, 'pelletCountFlat').map((e) => e.value);
    expect(vals.every((v: number) => v >= 1 && v <= 3.001)).toBe(true);
    expect(totalOf(BASE)).toBeGreaterThan(totalOf(NO_PELLET));
    // pellets do not pump the gauge, so the rotation - and therefore every teammate - is untouched
    for (const m of MATES)
      expect(unitDmg(NO_PELLET, m)).toEqual(unitDmg(BASE, m));
  });

  it('4x: the pellet primitive is NOT interchangeable with a normalAttackPct proxy for this unit', () => {
    // she carries a SECOND normal-multiplier buff (Snapshots of Youth), so the proxy is additive
    // where the pellet path is multiplicative - the two models must diverge.
    expect(PELLET_PROXY.patched).toBeGreaterThan(0);
    expect(totalOf(PELLET_PROXY)).not.toEqual(totalOf(BASE));
  });

  it('6x: Precious Moments is a SELF ATK% stack of 2.49 (<=3), load-bearing', () => {
    expect(NO_PRECIOUS.patched).toBeGreaterThan(0);
    const ap = applies(
      BASE,
      'atkPct',
      (e) =>
        nearV(e.value, 2.49) || nearV(e.value, 4.98) || nearV(e.value, 7.47)
    );
    expect(new Set(ap.map((e) => e.targetIdx))).toEqual(new Set([arcanaIdx]));
    expect(ap.every((e) => e.value <= 7.471)).toBe(true);
    expect(totalOf(BASE)).toBeGreaterThan(totalOf(NO_PRECIOUS));
    for (const m of MATES)
      expect(unitDmg(NO_PRECIOUS, m)).toEqual(unitDmg(BASE, m));
  });

  it('2x reload 6 rounds + burst reload 2 rounds are damage: they add real shots', () => {
    // weapon-state modifiers gate shot count; dropping them must cost her shots on a 9-round SG
    // whose reload is 161 frames. Teammate inertness is NOT asserted here on purpose: her shot
    // count feeds the team burst gauge, so the rotation legitimately shifts.
    expect(NO_RELOAD.patched).toBeGreaterThan(0);
    expect(shotsOf(BASE)).toBeGreaterThan(shotsOf(NO_RELOAD));
  });

  it.skip('per-window attack counter with reset (Only one effect at a time / Resets when Making Memories is removed) - GAP: the engine has no per-status-window counter, so any hitCount proxy over-fires inside the window and the stack ramp becomes a per-unit estimate', () => {});
});

describe('S2-b  Burst use: all shotgun-wielding allies (except self) Attack Damage +55% / 10s', () => {
  it('never lands on a non-shotgun ally, and never on self (inertness in this comp)', () => {
    // liter SMG / crown RL / helm SR - the correct target set is EMPTY here. A mis-encoded
    // 'all allies' or a self-inclusive target set would emit at least one 55% apply.
    expect(
      applies(BASE, 'attackDamagePct', (e) => nearV(e.value, 55)).length
    ).toBe(0);
  });

  it.skip('positive case: a second shotgun ally receives Attack Damage +55% for 10s - controlComp supplies no second shotgun, so non-vacuity is unsatisfiable without a custom comp', () => {});
});

describe('burst  Making Memories self-mode + 554.4% burst hit', () => {
  it('Critical Rate +20.09% lands once per cast, on her only, and expires', () => {
    const ap = applies(BASE, 'critRatePct', (e) => nearV(e.value, 20.09));
    expect(ap.length).toBeGreaterThan(0);
    expect(ap.length).toBeLessThanOrEqual(arcanaCasts.length);
    expect(new Set(ap.map((e) => e.targetIdx))).toEqual(new Set([arcanaIdx]));
    // S1-c removes Making Memories at FB end => it must be removed, not permanent
    expect(
      removes(BASE, 'critRatePct', (e) => nearV(e.value, 20.09)).length
    ).toBeGreaterThan(0);
  });

  it('Attack Damage +29.99% lands once per cast, on her only, and expires', () => {
    const ap = applies(BASE, 'attackDamagePct', (e) => nearV(e.value, 29.99));
    expect(ap.length).toBeGreaterThan(0);
    expect(ap.length).toBeLessThanOrEqual(arcanaCasts.length);
    expect(new Set(ap.map((e) => e.targetIdx))).toEqual(new Set([arcanaIdx]));
    expect(
      removes(BASE, 'attackDamagePct', (e) => nearV(e.value, 29.99)).length
    ).toBeGreaterThan(0);
  });

  it('the 554.4% hit is modeled, lands once per cast, and is Full-Burst-exempt by timing', () => {
    expect(NO_NUKE.patched).toBeGreaterThan(0);
    expect(totalOf(BASE)).toBeGreaterThan(totalOf(NO_NUKE));
    const mine = BASE.events.filter(
      (e) => e.kind === 'damage' && idxOf(e) === arcanaIdx
    );
    const byBucket = new Map<string, any[]>();
    for (const d of mine)
      byBucket.set(d.bucket, [...(byBucket.get(d.bucket) ?? []), d]);
    // heuristic, bucket-name-agnostic: the burst hit is the bucket with exactly one event per cast
    const nuke = [...byBucket.values()].find(
      (list) => list.length === arcanaCasts.length
    );
    expect(nuke).toBeDefined();
    expect((nuke as any[]).every((d) => d.fbMajorApplied === false)).toBe(true);
  });
});
```

## 6. S6 blind post-op override-writer (claude-opus-5, CROSS-FAMILY)

### blind override (scripts/kit-autonomy/blind/arcana-fortune-mate.override.json)

```json
{
  "slug": "arcana-fortune-mate",
  "resources": [
    {
      "name": "preciousMoments",
      "initial": 0,
      "min": 0,
      "max": 3
    },
    {
      "name": "happyMemories",
      "initial": 0,
      "min": 0,
      "max": 3
    }
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SG"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "casterAtkPct",
          "value": 13,
          "durationSec": 15,
          "perResource": {
            "name": "preciousMoments",
            "mult": 13
          }
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
      "effects": [
        {
          "kind": "buff",
          "stat": "normalAttackPct",
          "value": 10,
          "durationSec": 7,
          "maxStacks": 3
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "instantReload",
          "fraction": 0.667
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "happyMemories",
          "delta": 1
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "resource",
          "name": "preciousMoments",
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
          "stat": "pelletCountFlat",
          "value": 1,
          "perResource": {
            "name": "happyMemories",
            "mult": 1
          }
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
          "value": 2.49,
          "perResource": {
            "name": "preciousMoments",
            "mult": 2.49
          }
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesOfWeapon",
        "weapon": "SG",
        "exceptSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 55,
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
          "stat": "critRatePct",
          "value": 20.09,
          "durationSec": 10
        },
        {
          "kind": "instantReload",
          "fraction": 0.222
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 29.99,
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
          "atkPct": 554.4,
          "crit": true,
          "noFb": true
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [
      "Effect varies according to the number of attacks. Only one effect is triggered at a time. Resets when Making Memories is removed."
    ],
    "burst": ["Function: Enhances attack capabilities."]
  },
  "caveats": [
    "⚑ Making Memories window length (burst-cast → Full Burst end) estimated at 10s; the two burst self-buffs and the Snapshots buff are duration-proxies for the S1 'Removes Making Memories / Removes Snapshots of Youth' lines (engine has no remove-on-FB-end primitive).",
    "⚑ S2's per-status attack counter (2/4/6 attacks while in Making Memories) is NOT modeled as a counter — all three thresholds are keyed to the ONE burstCast that grants Making Memories, i.e. they fire at cast instead of ~1.5s/3s/4.5s into the window. Under-credits the mid-window 6-round reload (it lands on a near-full magazine) and over-credits the pellet/ATK stack by a few seconds per rotation.",
    "⚑ Snapshots of Youth is modeled at ONE stack per Making Memories window (Happy Memories 'takes effect' once per window at the 4th attack); the kit's 'stacks up to 3' is therefore unreachable in this model. If the 2/4/6 counter actually CYCLES within a window, the correct value is up to 30% normalAttackPct and up to 3 pellet/Precious-Moments stacks gained per burst — a materially different model.",
    "⚑ Happy Memories / Precious Moments are encoded as resource pools + perResource passives rather than repeated maxStacks applications, so their fight-long ramp (1 stack per rotation → cap 3) is engine-driven rather than an authored rampSec.",
    "⚑ SG cadence (pullsPerSec) + reloadFrames 161 are datamine-unreliable; the count of normal attacks available inside a 10s Making Memories window (and hence whether all three thresholds are reached) rests on them.",
    "Target kind 'alliesOfWeapon' (weapon-typed, class-blind, optional exceptSelf) is inferred from the schema comment for 'all shotgun-wielding allies [(except self)]'; the declaration line was redacted in the packet, so the exact kind/field names must be confirmed against types.ts before validating.",
    "noRange is engine-automatic and is not set anywhere; noFb is set ONLY on the burst-cast nuke (burst-cast damage is FB-exempt by rule), never on a rider."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of arcana-fortune-mate (SG/Fire/Attacker/B2, ammo 9, hitsPerShot 10). Structure: her burst grants the self status Making Memories (crit 20.09% + Attack Damage 29.99% + a 2-round reload), which is stripped at Full Burst end — so both burst self-buffs carry durationSec 10 as a proxy for S1's 'Removes Making Memories'. S2 is a counter inside that status: 2 attacks = a 6-round partial reload (instantReload 0.667 of the 9-round magazine — a weapon-state/shot-count effect, NOT skippable), 4 attacks = Happy Memories (pellets +1, permanent, cap 3 → modeled as the happyMemories resource feeding a perResource pelletCountFlat passive, so +3 pellets on a 10-pellet SG = +30% normal damage at cap), 6 attacks = Precious Moments (ATK +2.49%, permanent, cap 3 → preciousMoments resource feeding a perResource atkPct passive). All three are keyed to burstCast because the engine has no status-scoped attack counter; the counter text itself is recorded verbatim in unmodeled. Snapshots of Youth (S1) triggers off Happy Memories taking effect → normalAttackPct 10% self, duration-bounded to FB end (7s ⚑, applies ~4 shots into the window); it interacts multiplicatively with pelletCountFlat by design. S1's team line is a fullBurstEnd casterAtkPct grant to ALL shotgun allies INCLUDING self (no 'except self' clause), scaled live by the Precious Moments pool via perResource (13% of caster ATK per stack, 15s) — the only kit-stated stack-scaled magnitude, so it ramps 13→26→39% over the first three rotations. S2's second line is a burstCast (own-burst-gated, NOT fullBurstEnter — she is B2 and must herself cast) Attack Damage 55%/10s to shotgun allies EXCLUDING self. Burst damage 554.4% of final ATK as a burstCast flatDamage, crit-eligible, no core (no 'core strike' wording), FB-exempt. No hit-rate/core, DEF/HP, heal/shield, weapon-swap, DoT, pierce or element-advantage lines exist in this kit; nothing was silently dropped."
}
```

### S6 audit + ⚑ flags

```json
{
  "slug": "arcana-fortune-mate",
  "leakDetected": null,
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Activates when Full Burst ends. Affects…",
      "status": "IMPLEMENTED",
      "effectOrReason": "Block trigger fullBurstEnd, target alliesOfWeapon SG (includes self — no 'except self')."
    },
    {
      "slot": "skill1",
      "kitLine": "ATK ▲ 13% of the skill user's ATK x s…",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff casterAtkPct 13, durationSec 15, perResource {preciousMoments × 13} — live stack-count scaling (13/26/39%)."
    },
    {
      "slot": "skill1",
      "kitLine": "Activates when Happy Memories takes e…",
      "status": "IMPLEMENTED",
      "effectOrReason": "Proxied to burstCast (the single instant Happy Memories can take effect per Making Memories window)."
    },
    {
      "slot": "skill1",
      "kitLine": "Snapshots of Youth: Normal Attack Dam…",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff normalAttackPct 10, maxStacks 3, durationSec 7 (⚑ FB-end removal proxy; only 1 stack reachable in this model)."
    },
    {
      "slot": "skill1",
      "kitLine": "Activates when Full Burst ends. Affec…",
      "status": "IMPLEMENTED",
      "effectOrReason": "Removal clause encoded as the durationSec bounds on the Making Memories / Snapshots buffs (no remove-at-FB-end primitive)."
    },
    {
      "slot": "skill1",
      "kitLine": "Removes Making Memories.",
      "status": "IMPLEMENTED",
      "effectOrReason": "durationSec 10 on the burst self-buff bundle (⚑ cast→FB-end window estimate)."
    },
    {
      "slot": "skill1",
      "kitLine": "Removes Snapshots of Youth.",
      "status": "IMPLEMENTED",
      "effectOrReason": "durationSec 7 on the normalAttackPct buff (⚑ applies ~4 shots into the window)."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when performing normal atta…",
      "status": "IMPLEMENTED",
      "effectOrReason": "Status-gated normal-attack counter proxied to the burstCast that grants Making Memories."
    },
    {
      "slot": "skill2",
      "kitLine": "Effect varies according to the number…",
      "status": "SKIPPED",
      "effectOrReason": "No engine primitive for a status-scoped attack counter with once-per-threshold semantics + reset-on-removal; verbatim in unmodeled.skill2."
    },
    {
      "slot": "skill2",
      "kitLine": "Two times: Reloads 6 rounds.",
      "status": "IMPLEMENTED",
      "effectOrReason": "instantReload fraction 0.667 (6 of 9 max rounds) — weapon-state/shot-count effect, timing-shifted to cast (⚑)."
    },
    {
      "slot": "skill2",
      "kitLine": "Four times: Happy Memories: pellets ▲…",
      "status": "IMPLEMENTED",
      "effectOrReason": "resource happyMemories +1 (max 3) + passive buff pelletCountFlat perResource {×1} — permanent, not FB-end-removed."
    },
    {
      "slot": "skill2",
      "kitLine": "Six times: Precious Moments: ATK ▲ 2.…",
      "status": "IMPLEMENTED",
      "effectOrReason": "resource preciousMoments +1 (max 3) + passive buff atkPct perResource {×2.49}; also feeds S1's ally grant."
    },
    {
      "slot": "skill2",
      "kitLine": "Activates when using Burst Skill. Aff…",
      "status": "IMPLEMENTED",
      "effectOrReason": "trigger burstCast (own-burst literal, NOT fullBurstEnter), target alliesOfWeapon SG exceptSelf true."
    },
    {
      "slot": "skill2",
      "kitLine": "Attack Damage ▲ 55% for 10 sec.",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 55, durationSec 10 (Damage Up bucket)."
    },
    {
      "slot": "burst",
      "kitLine": "Affects self. / Making Memories",
      "status": "IMPLEMENTED",
      "effectOrReason": "Self status bundle on burstCast; the status is the gate S2's counter reads."
    },
    {
      "slot": "burst",
      "kitLine": "Function: Enhances attack capabilitie…",
      "status": "SKIPPED",
      "effectOrReason": "Flavor/summary line with no mechanic; verbatim in unmodeled.burst."
    },
    {
      "slot": "burst",
      "kitLine": "Effect 1: Critical Rate ▲ 20.09% cont…",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff critRatePct 20.09 durationSec 10 — UNSCOPED crit (no 'of normal attacks' wording), so not critRateNormalPct."
    },
    {
      "slot": "burst",
      "kitLine": "Effect 2: Reloads 2 round(s).",
      "status": "IMPLEMENTED",
      "effectOrReason": "instantReload fraction 0.222 (2 of 9 max rounds)."
    },
    {
      "slot": "burst",
      "kitLine": "Effect 3: Attack Damage ▲ 29.99% cont…",
      "status": "IMPLEMENTED",
      "effectOrReason": "buff attackDamagePct 29.99 durationSec 10 (Damage Up bucket)."
    },
    {
      "slot": "burst",
      "kitLine": "Affects all enemies. / Deals 554.4% o…",
      "status": "IMPLEMENTED",
      "effectOrReason": "flatDamage atkPct 554.4, crit true, noFb true (burst-cast damage lands pre-FB), no core (kit says no 'core strike')."
    }
  ],
  "flags": [
    {
      "field": "burst[0].effects[*].durationSec (10) and skill1[1].effects[0].durationSec (7)",
      "estimate": "Making Memories 10s from cast; Snapshots 7s from apply",
      "reasoning": "Both statuses are 'continuously' but explicitly removed at Full Burst end; the engine has no remove-on-FB-end primitive, so the window must be a duration. Cast→FB-open offset plus a 10s FB gives ~10s; Snapshots starts ~4 SG shots (~3s) into the window.",
      "recipe": "In a graded comp, log fullBurstStart/fullBurstEnd + burstCast frames for her rotation and set durationSec = (fbEnd − burstCast) exactly; for Snapshots use (fbEnd − 4th shot frame). Cross-check with a popup read: her normal-attack damage should step down at the FB-end frame."
    },
    {
      "field": "skill2[0..2].trigger (burstCast proxy for the 2/4/6 attack thresholds)",
      "estimate": "all three thresholds fire at burst cast",
      "reasoning": "Kit-silent in engine terms: no status-scoped attack counter exists, and hitCount is fight-cumulative with no reset. Keying to the once-per-window burstCast preserves 'once per Making Memories cycle' but loses the intra-window delay; the 6-round reload in particular lands on a near-full magazine, under-crediting fire uptime.",
      "recipe": "Count her SG trigger pulls between burst cast and FB end on footage; confirm the mid-window reload happens after exactly 2 shots (ammo counter jumping +6) and whether the pellet/ATK stacks appear on shots 4 and 6. If the reload matters, re-key it to a hitCount block gated fbGate:'inFb' with everyN thinned to one activation per window."
    },
    {
      "field": "skill1[1].effects[0] (Snapshots of Youth stack count)",
      "estimate": "1 stack (10% normalAttackPct) per window; cap 3 unreachable",
      "reasoning": "Under a monotone in-window counter with fixed 2/4/6 thresholds, Happy Memories takes effect exactly once per Making Memories cycle, so Snapshots can only reach 1 stack before FB end strips it. The kit's 'stacks up to 3' hints the counter may CYCLE (2/4/6 repeating), which would also give up to 3 pellet + 3 Precious Moments stacks in a single window.",
      "recipe": "Read the buff-icon stack pip on Snapshots of Youth during one Full Burst on footage; if it reaches 2–3 within one window the counter cycles and every S2 threshold must be re-keyed to a repeating in-FB trigger."
    },
    {
      "field": "resources[*] + perResource encoding (happyMemories, preciousMoments)",
      "estimate": "+1 stack per own-burst rotation, cap 3 (≈2–3 rotations to cap)",
      "reasoning": "Stack/currency steady-state is an ALWAYS-⚑ field. Start (0), gain (1/cycle) and cap (3) are kit-stated, so the trajectory is DERIVED rather than guessed — no ramp haircut needed; but it assumes the stacks are never removed (only Making Memories and Snapshots are named in the S1 removal lines) and that she casts her own burst every rotation.",
      "recipe": "Verify on footage that the Happy Memories / Precious Moments pips persist across Full Burst end and across rotations, and that they cap at 3; if they wipe on FB end, convert both to duration-bounded buffs."
    },
    {
      "field": "base cadence (pullsPerSec / reloadFrames 161)",
      "estimate": "SG datamined cadence as-is; ~6+ pulls available per 10s window",
      "reasoning": "Cadence tuple is datamine-unreliable by standing rule; every threshold in this kit is attack-count-gated, so whether the 4th and 6th attacks land before FB end depends on it. Effective rate is also frame-quantised (60/ceil(60/nominal)).",
      "recipe": "Ammo-counter read on a solo recording: count trigger pulls per second and reload completion frames; feed the effective (frame-quantised) value, not the nominal datamine field."
    },
    {
      "field": "skill2[0].effects[0].fraction / burst[0].effects[1].fraction (instantReload)",
      "estimate": "0.667 (6/9) and 0.222 (2/9)",
      "reasoning": "The kit gives ROUND counts, but instantReload takes a fraction of max ammo; 9-round magazine → 6/9 and 2/9. Assumes the fraction is ADDED to the current belt (partial top-up) rather than setting the belt to that fraction.",
      "recipe": "Confirm instantReload semantics in sim.ts (add vs set) and re-derive; if maxAmmoFlat-style round counts become expressible, use them instead so the value survives any max-ammo buff."
    },
    {
      "field": "target kind 'alliesOfWeapon' (skill1[0], skill2[5])",
      "estimate": "{ kind: 'alliesOfWeapon', weapon: 'SG', exceptSelf?: true }",
      "reasoning": "The packet's types.ts excerpt retains the descriptive comment for 'all shotgun-wielding allies [(except self)]' but its declaration line was redacted, so the kind/field spelling is inferred, not read.",
      "recipe": "Read the real src/skills/types.ts TargetDef union and rename to the actual kind before running validate-overrides; both target sets are weapon-typed and class-blind (an SG Supporter counts)."
    },
    {
      "field": "perResource on casterAtkPct / pelletCountFlat",
      "estimate": "supported generically (value ignored, pool × mult each frame)",
      "reasoning": "The schema documents perResource on a crit-damage buff and says the buff's value is replaced by pool × mult; applying it to a flat-ATK stat and to the SG pellet path is an extrapolation, and the doc suggests applying perResource buffs as PASSIVE self-buffs (S1's grant is instead a 15s ally buff).",
      "recipe": "Grep the perResource branch in sim.ts for stat-kind restrictions; if flat-ATK or pellet stats are excluded, fall back to authoring the max magnitude (39% / +3 pellets) with rampSec ≈ time to the 3rd own-burst rotation."
    },
    {
      "field": "burst[1].effects[0].noFb (true)",
      "estimate": "true",
      "reasoning": "Per the standing rule, burst-cast/instant damage is Full-Burst-exempt because the cast resolves before the FB window opens; this is the burst nuke, not a function-damage rider (riders keep noFb default OFF).",
      "recipe": "Log the damage event for her 554.4% hit and check inFullBurst / fbMajorApplied at the cast frame; if the engine already resolves her B2 cast pre-FB, drop noFb and let timing decide (or set burstSnapshotsPreFb instead)."
    }
  ],
  "model": "claude-opus-5"
}
```

## 7. Driver's tests (scripts/tests/units/arcana-fortune-mate.test.ts — 19 tests, ALL GREEN vs the shipped override)

```typescript
// PER-UNIT KIT SPEC — `arcana-fortune-mate` (Arcana: Fortune Mate, SG / Attacker / Fire, Burst II,
// cd 20s, ammo 9, 10 pellets/shot, burstGauge 2/shot). Kit-autonomy gauntlet 2026-07-24 (test-first).
//
// ⚠ EXACT-SLUG: this is `arcana-fortune-mate` (SG/Fire/B2 Attacker, aka afm/jkana/arcanafm) — NOT
//   base `arcana` (RL/Supporter/Electric/B2). They share a base name and NOTHING else.
//
// One assertion group per KIT LINE (L1..L7 + U1..U3), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each line
// must discriminate against) — never the encoding under test.
//
// Kit (blablalink prose @ lvl10, data/characters.json → characters['arcana-fortune-mate'].skills):
//   S1 ■ on Full Burst END, all shotgun-wielding allies: ATK ▲13% of caster ATK × Precious Moments
//        stacks (3 max ⇒ 39%) for 15s                                              [L1]
//      ■ when Happy Memories takes effect, self: Snapshots of Youth — Normal Attack Damage
//        Multiplier ▲10% continuously, ×3 (⇒ 30%)                                  [L2]
//      ■ on Full Burst END, self: removes Making Memories + Snapshots of Youth      [U3] (mode cleanup)
//   S2 ■ normal attacks while in Making Memories (one effect at a time, resets on MM removal):
//        2 hits: Reload 6 rounds                                                    [U1] (uptime QoL)
//        4 hits: Happy Memories — Number of pellets ▲1 continuously, ×3 (⇒ +3)      [L5]
//        6 hits: Precious Moments — ATK ▲2.49% continuously, ×3 (⇒ 7.47%)           [L4]
//      ■ on Burst Skill, all shotgun-wielding allies (EXCEPT self): Attack Damage ▲55% for 10s [L3]
//   BU ■ self: Making Memories — Crit Rate ▲20.09% + Attack Damage ▲29.99% continuously [L6]
//        Reload 2 rounds                                                            [U2] (uptime QoL)
//      ■ all enemies: 554.4% of final ATK as Burst Skill damage                     [L7]
//
// THE TWO FAITHFULNESS SPINES this spec pins (both are documented owner fixes the override carries):
//
//   (a) WEAPON-TYPED TARGETING (2026-07-16 fix). L1/L3 target `alliesOfWeapon SG` (kit: "all
//       shotgun-wielding allies"; L3 "except self"), NOT the old `alliesOfClass Attacker`
//       approximation. Fixture B fields zwei (SG/Supporter — an SG non-Attacker) and liter
//       (RL/Supporter — a non-SG ally) so the scoping is falsifiable BOTH ways: an all-allies
//       retarget leaks onto liter; an Attacker retarget drops zwei. L3 additionally carries
//       excludeSelf — dropping it leaks the 55% onto afm herself (kit: "except self").
//
//   (b) burstCast KEYING of the Making-Memories self-buffs (2026-07-16 mechanic fix). L2/L4/L5/L6
//       are keyed to afm's OWN `burstCast` + durationSec 11 (her burst → FB exit), NOT
//       `fullBurstEnter` — which would wrongly grant Making Memories on ANY team Full Burst even
//       when a DIFFERENT B2 burst and she did not. Fixture A (crown contests the B2 slot ⇒ afm
//       casts 0 bursts while the team still Full-Bursts 12×) proves it: every self-buff is
//       perfectly INERT there, while a fullBurstEnter counterfactual fires on all 12 team FBs.
//
//   (c) THE A4 PELLET PRIMITIVE (2026-07-21 fix). Happy Memories "+1 pellet ×3" is the real
//       `pelletCountFlat 3` (10→13 effective SG pellets), which is MULTIPLICATIVE with Snapshots'
//       `normalAttackPct 30` (×1.30·×1.30 = ×1.69). The pre-A4 encoding proxied it as a second
//       `normalAttackPct 30`, which SUMMED (30+30 = 60 ⇒ ×1.60) and under-counted normals ~5%.
//       L5 asserts the shipped normal-bucket total EXCEEDS the additive counterfactual.
//
// casterAtkPct is stored by the engine as an ABSOLUTE ATK grant (caster ATK × pct), so L1 pins the
// kit's "13% × 3 stacks = 39%" as a 3:1 ratio against a value-13 (1-stack) counterfactual.
//
// Fixture: B = [liter, afm, drake, zwei] — afm sole B2 (bursts every rotation), drake (SG/Attacker
// B3) + zwei (SG/Supporter B1) are the SG allies, liter (RL) the non-SG foil. A = [liter, crown,
// afm, drake, helm] — crown (B2 cd20) contests the slot so afm never bursts. Deterministic (no seed).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture B — afm sole B2 (bursts every rotation); SG allies = afm/drake/zwei; liter = non-SG foil. */
const B_SLUGS = ['liter', 'arcana-fortune-mate', 'drake', 'zwei'] as const;
const B_AFM = 1;
const B_SG = [1, 2, 3]; // afm, drake, zwei (liter=RL excluded)
/** Fixture A — crown (B2 cd20) contests the slot so afm never bursts; team still Full-Bursts. */
const A_SLUGS = [
  'liter',
  'crown',
  'arcana-fortune-mate',
  'drake',
  'helm',
] as const;
const A_AFM = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(
  slugs: readonly string[],
  focus: string,
  overrides: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [...slugs],
    bossElement: 'Fire',
    focusSlug: focus,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const afmBuffs = (evs: SimEvent[], slot: number) =>
  buffs(evs).filter((b) => b.casterIdx === slot);
const afmCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'arcana-fortune-mate'
  );
const fbEnds = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstEnd');
const afmDmg = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage => e.kind === 'damage' && e.slug === 'arcana-fortune-mate'
  );
/** Sum of afm's NORMAL-bucket damage — the L5 pellet×snapshot multiplicativity observable. */
const afmNormalTotal = (evs: SimEvent[]) =>
  afmDmg(evs)
    .filter((d) => d.bucket === 'normal')
    .reduce((s, d) => s + d.amount, 0);
/** distinct firing frames of a buffApply stream (one firing = one frame, even multi-holder). */
const firings = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const targets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? 99) - (b ?? 99)
  );

// ---- counterfactual patches (nearest wrong model each line must beat) -------------------------
const patch = (mutate: (ov: any) => void) =>
  withPatchedOverride('arcana-fortune-mate', mutate);

/** L1 magnitude: 1 Precious Moments stack (13%) instead of 3 (39%). */
const l1OneStack = patch((ov) => {
  const e = ov.skill1[0]?.effects?.find((x: any) => x.stat === 'casterAtkPct');
  if (!e) throw new Error('afm S1 casterAtkPct missing — stale fixture');
  e.value = 13;
});
/** L1/L3 targeting: the documented prior approximation — alliesOfClass Attacker (drops SG non-Attackers). */
const targetClass = patch((ov) => {
  let n = 0;
  for (const b of [...ov.skill1, ...ov.skill2])
    if (b.target?.kind === 'alliesOfWeapon') {
      b.target = { kind: 'alliesOfClass', cls: 'Attacker' };
      n++;
    }
  if (n !== 2)
    throw new Error('afm: expected 2 alliesOfWeapon blocks, found ' + n);
});
/** L1/L3 targeting: all allies (leaks the buff onto the non-SG ally). */
const targetAll = patch((ov) => {
  for (const b of [...ov.skill1, ...ov.skill2])
    if (b.target?.kind === 'alliesOfWeapon') b.target = { kind: 'allies' };
});
/** L3: drop excludeSelf — the 55% then leaks onto afm herself (kit: "except self"). */
const l3NoExclude = patch((ov) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b?.target?.excludeSelf)
    throw new Error('afm S2 55% excludeSelf missing — stale fixture');
  delete b.target.excludeSelf;
});
/** L5: the pre-A4 encoding — Happy Memories as a SECOND normalAttackPct 30 (additive ×1.60, not
 *  the multiplicative pelletCountFlat 3 ⇒ ×1.69). */
const l5AdditiveProxy = patch((ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'pelletCountFlat');
  if (!e) throw new Error('afm pelletCountFlat missing — stale fixture');
  e.stat = 'normalAttackPct'; // now Snapshots 30 + Happy 30 = 60 additive
});
/** L2/L4/L5/L6 keying: re-key the Making-Memories SELF buffs from own burstCast to fullBurstEnter —
 *  the over-credit the shipped encoding avoids (grants MM on ANY team FB even when afm did not burst). */
const selfBuffsOnFbEnter = patch((ov) => {
  const selfBlocks = [
    ov.skill1.find((b: any) => b.target?.kind === 'self'),
    ov.skill2.find((b: any) => b.target?.kind === 'self'),
    ov.burst.find((b: any) => b.target?.kind === 'self'),
  ];
  for (const b of selfBlocks) {
    if (b?.trigger?.kind !== 'burstCast')
      throw new Error('afm self-buff not burstCast-keyed — stale fixture');
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
/** L7: burst nuke halved (554.4% → 277.2%). */
const l7Half = patch((ov) => {
  const fd = ov.burst
    .flatMap((b: any) => b.effects)
    .find((e: any) => e.kind === 'flatDamage');
  if (!fd) throw new Error('afm burst flatDamage missing — stale fixture');
  fd.atkPct = 277.2;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const B = run(B_SLUGS, 'drake'); // afm bursts every rotation
const A = run(A_SLUGS, 'drake'); // afm never bursts (crown contests B2)
const rL1OneStack = run(B_SLUGS, 'drake', {
  'arcana-fortune-mate': l1OneStack,
});
const rTargetClass = run(B_SLUGS, 'drake', {
  'arcana-fortune-mate': targetClass,
});
const rTargetAll = run(B_SLUGS, 'drake', { 'arcana-fortune-mate': targetAll });
const rL3NoExclude = run(B_SLUGS, 'drake', {
  'arcana-fortune-mate': l3NoExclude,
});
const rL5Additive = run(B_SLUGS, 'drake', {
  'arcana-fortune-mate': l5AdditiveProxy,
});
const rSelfFbEnterA = run(A_SLUGS, 'drake', {
  'arcana-fortune-mate': selfBuffsOnFbEnter,
});
const rL7Half = run(B_SLUGS, 'drake', { 'arcana-fortune-mate': l7Half });

// ---- derived constants (from the SHIPPED runs, not hardcoded) ---------------------------------
const B_CASTS = afmCasts(B).length;
const B_FB = fbEnds(B).length;
const A_CASTS = afmCasts(A).length;
const A_FB = fbEnds(A).length;

describe('arcana-fortune-mate (SG/Fire/B2 Attacker) — kit spec', () => {
  it('fixture sanity: B afm bursts every rotation; A afm never bursts but the team still Full-Bursts', () => {
    expect(B_CASTS, 'fixture B: afm should burst').toBeGreaterThan(0);
    expect(
      A_FB,
      'fixture A: Full Bursts still happen (crown closes the chain)'
    ).toBeGreaterThan(1);
    expect(
      A_CASTS,
      'fixture A: crown must contest the B2 slot so afm never bursts'
    ).toBe(0);
  });

  describe('L1 — S1: 39% casterATK (13% × 3 Precious stacks) to all SG allies on Full Burst END, 15s', () => {
    const line = afmBuffs(B, B_AFM).filter((b) => b.stat === 'casterAtkPct');
    it('reaches exactly the SG allies (afm/drake/zwei), never the RL ally (liter), for 15s, per FB-end', () => {
      expect(targets(line)).toEqual(B_SG);
      expect(firings(line).length).toBe(B_FB);
      for (const b of line) expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
    });
    it('is 39% of caster ATK = 3× the 1-stack (13%) magnitude', () => {
      const cf = afmBuffs(rL1OneStack, B_AFM).filter(
        (b) => b.stat === 'casterAtkPct'
      );
      expect(line[0].value / cf[0].value).toBeCloseTo(3, 6); // 39 / 13
    });
    it('DISCRIMINATING: an alliesOfClass-Attacker retarget drops the SG Supporter (zwei)', () => {
      const cf = afmBuffs(rTargetClass, B_AFM).filter(
        (b) => b.stat === 'casterAtkPct'
      );
      expect(targets(cf)).toEqual([B_AFM, 2]); // zwei (slot 3, Supporter) lost
    });
    it('DISCRIMINATING: an all-allies retarget leaks onto the RL ally (liter)', () => {
      const cf = afmBuffs(rTargetAll, B_AFM).filter(
        (b) => b.stat === 'casterAtkPct'
      );
      expect(targets(cf)).toEqual([0, 1, 2, 3]);
    });
  });

  describe('L3 — S2: 55% Attack Damage to SG allies EXCEPT self on burst, 10s', () => {
    const line = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 55
    );
    it('reaches the OTHER SG allies (drake/zwei) but never afm herself, for 10s, per cast', () => {
      expect(targets(line), 'excludeSelf must keep afm (slot 1) out').toEqual([
        2, 3,
      ]);
      expect(firings(line).length).toBe(B_CASTS);
      for (const b of line) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });
    it('DISCRIMINATING: dropping excludeSelf leaks the 55% onto afm herself', () => {
      const cf = afmBuffs(rL3NoExclude, B_AFM).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 55
      );
      expect(targets(cf)).toEqual([1, 2, 3]);
    });
    it('DISCRIMINATING: an alliesOfClass-Attacker retarget drops zwei AND (no excludeSelf) keeps afm', () => {
      const cf = afmBuffs(rTargetClass, B_AFM).filter(
        (b) => b.stat === 'attackDamagePct' && b.value === 55
      );
      expect(targets(cf)).toEqual([1, 2]);
    });
  });

  describe("L2/L4/L5/L6 — Making-Memories SELF buffs are keyed to afm's OWN burstCast (inert when she does not burst)", () => {
    const selfStats = [
      'normalAttackPct',
      'atkPct',
      'pelletCountFlat',
      'critRatePct',
      'attackDamagePct',
    ];
    const selfBuffsA = afmBuffs(A, A_AFM).filter(
      (b) =>
        b.targetIdx === A_AFM && selfStats.includes(b.stat) && b.value !== 55
    );
    it('fixture A (afm never bursts): every self-buff is perfectly INERT across 12 team Full Bursts', () => {
      expect(
        selfBuffsA.length,
        'burstCast keying must hold ALL Making-Memories self-buffs when afm did not cast'
      ).toBe(0);
    });
    it('DISCRIMINATING: fullBurstEnter keying would fire them on every team FB in fixture A', () => {
      const cf = afmBuffs(rSelfFbEnterA, A_AFM).filter(
        (b) =>
          b.targetIdx === A_AFM && selfStats.includes(b.stat) && b.value !== 55
      );
      expect(
        cf.length,
        'fullBurstEnter over-credits MM on a team afm did not burst in'
      ).toBeGreaterThan(0);
    });
  });

  describe('L2 — Snapshots of Youth: self Normal Attack Damage Multiplier +30% (10% × 3), 11s', () => {
    const line = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'normalAttackPct' && b.targetIdx === B_AFM
    );
    it('is 30% on herself, one firing per cast, 11s window', () => {
      expect([...new Set(line.map((b) => b.value))]).toEqual([30]);
      expect(firings(line).length).toBe(B_CASTS);
      for (const b of line) expect(b.expiresFrame! - b.frame).toBe(11 * FPS);
    });
  });

  describe('L4 — Precious Moments: self ATK +7.47% (2.49% × 3), 11s', () => {
    const line = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'atkPct' && b.targetIdx === B_AFM
    );
    it('is 7.47% on herself, one firing per cast, 11s window', () => {
      expect([...new Set(line.map((b) => b.value))]).toEqual([7.47]);
      expect(firings(line).length).toBe(B_CASTS);
      for (const b of line) expect(b.expiresFrame! - b.frame).toBe(11 * FPS);
    });
  });

  describe('L5 — Happy Memories: self pelletCountFlat 3 (+1 pellet × 3), MULTIPLICATIVE with Snapshots (A4 fix)', () => {
    const line = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'pelletCountFlat' && b.targetIdx === B_AFM
    );
    it('is the real pellet-count primitive (+3) on herself, one firing per cast, 11s window', () => {
      expect([...new Set(line.map((b) => b.value))]).toEqual([3]);
      expect(firings(line).length).toBe(B_CASTS);
      for (const b of line) expect(b.expiresFrame! - b.frame).toBe(11 * FPS);
    });
    it('DISCRIMINATING: shipped normals EXCEED the pre-A4 additive normalAttackPct-30 proxy (×1.69 > ×1.60)', () => {
      const shipped = afmNormalTotal(B);
      const additive = afmNormalTotal(rL5Additive);
      expect(
        shipped,
        `pelletCountFlat 3 × normalAttackPct 30 must beat the additive normalAttackPct 60 proxy ` +
          `(shipped ${shipped.toFixed(0)} vs additive ${additive.toFixed(0)})`
      ).toBeGreaterThan(additive * 1.03);
    });
  });

  describe('L6 — Making Memories: self Crit Rate +20.09% AND Attack Damage +29.99%, 11s', () => {
    const crit = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'critRatePct' && b.targetIdx === B_AFM
    );
    const ad = afmBuffs(B, B_AFM).filter(
      (b) => b.stat === 'attackDamagePct' && b.value === 29.99
    );
    it('grants both self-buffs per cast, 11s window', () => {
      expect([...new Set(crit.map((b) => b.value))]).toEqual([20.09]);
      expect([...new Set(ad.map((b) => b.value))]).toEqual([29.99]);
      expect(firings(crit).length).toBe(B_CASTS);
      expect(firings(ad).length).toBe(B_CASTS);
      for (const b of [...crit, ...ad])
        expect(b.expiresFrame! - b.frame).toBe(11 * FPS);
    });
  });

  describe('L7 — burst nuke: 554.4% of final ATK to all enemies, cast BEFORE the Full Burst window', () => {
    const nukes = afmDmg(B).filter((d) => d.bucket === 'burst');
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(B_CASTS);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([554.4]);
      expect([...new Set(nukes.map((d) => d.srcSlot))]).toEqual(['burst']);
    });
    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual(
        []
      );
    });
    it('DISCRIMINATING: the halved magnitude (277.2%) is a different number', () => {
      const cf = afmDmg(rL7Half).filter((d) => d.bucket === 'burst');
      expect([...new Set(cf.map((d) => d.atkPct))]).toEqual([277.2]);
    });
  });

  describe('U1/U2/U3 — honest UNMODELED skips (non-damage reloads + mode cleanup)', () => {
    it('documents the reloads + FB-end removal verbatim in unmodeled, with NO ignored-effect blocks', () => {
      const ov = JSON.parse(
        readFileSync(
          new URL(
            '../../../src/skills/overrides/arcana-fortune-mate.json',
            import.meta.url
          ),
          'utf8'
        )
      );
      expect(ov.unmodeled.skill2.join(' ')).toMatch(/Reload 6 rounds/);
      expect(ov.unmodeled.burst.join(' ')).toMatch(/Reload 2 rounds/);
      expect(ov.unmodeled.skill1.join(' ')).toMatch(/removes Making Memories/i);
      expect(
        JSON.stringify(ov),
        'validator forbids ignored-effect blocks'
      ).not.toMatch(/"ignored"/);
    });
  });
});
```

## 8. S2c/S5/S6 reconciliation (driver, sighted)

S2c (driver Qwen vs blind claude-fable-5 S2b): CONVERGED on all 7 lines FAITHFUL, identical load-bearing set, leak CLEAN. Convergent discriminations: excludeSelf (fable: 'the kit's sharpest edge / biggest single over-credit'), pelletCountFlat-vs-normalAttackPct multiplicative (fable: 'distinguishable here'), burstCast-vs-fullBurstEnter keying (fable noted the B2-collision comp need = driver fixture A), weapon-typed SG targeting. Measurement-gated flags (both agree): stack ramp magnitude/timing (rampSec 11 on ~1.5 pulls/s SG cadence = override gotcha #1), counter cycling past 6 within a window, cross-window persistence of Happy Memories + Precious stacks (FB-end removal names only MM + Snapshots). NO REAL-GOTCHA.

S5 (blind opus test vs driver override, adapted per writer invitation): 11 pass / 7 fail / 2 skip. The 11 passes ARE the load-bearing convergence. The 7 fails are ALL artifacts: (A) 3x casterAtkPct absolute-ATK misconception + no caster filter (identical to base arcana judge-ruled artifacts); (B) 3x buffRemove-for-duration-expiry misconception (engine emits buffRemove only for reload cause; driver models FB-end removal via durationSec 11 lapse); (C) 1x reload modeling divergence (driver documents reloads as unmodeled inert QoL). 0 REAL-GOTCHA. See convergence.txt.

S6 (blind opus override vs driver): STRUCTURAL CONVERGENCE — independently chose pelletCountFlat (NOT the normalAttackPct proxy: A4 corroborated), casterAtkPct, normalAttackPct-scoped Snapshots, alliesOfWeapon SG, excludeSelf intent, burstCast-keyed Making Memories, 554.4 pre-FB nuke. Divergences (all non-faithfulness): (a) stack-magnitude baking blind x1 vs driver x3 = the measurement-gated gotcha #1 (both honest flags; truth ramps ~2 by FB end); (b) pellet/atkPct trigger blind=passive vs driver=burstCast — blind OVERRIDE wrong, blind TEST independently ruled burstCast-gating correct (corroborates driver); (c) blind used invalid field 'exceptSelf' (schema 'excludeSelf') — encoding typo; (d) reloads modeled vs documented-skip; (e) durations 10s/7s vs 11s.

Driver made NO encoding change: the shipped override was already faithful (validated by 19/19 driver tests green + cross-family convergence). Only the gauntlet provenance note was appended. Magnitudes are owner/measurement-gated (out of scope per method F).

## 9. Board reading (non-gating context)

board-read.ts: arcana-fortune-mate ratio 0.898 (1 team: N5 snowwhite-HA fire, boss Fire; COLD; spread 0.90-0.90; +/-15% unfocused). Unchanged by this gauntlet (no encoding change). kit-status evidence "N5 unfocused: 1.88" is the older solo HOT reading; the override note documents the over-model root = stack magnitude (gotcha #1, measurement item). Non-gating.

## 10. Verdict instructions

Return ONLY the JSON specified in section 0 (output contract) to stdout. Save it to scripts/kit-autonomy/results/arcana-fortune-mate.json.
Fields: {slug, kitDescription, convergence, lineFindings, gotchas, discriminationOk, faithfulnessScore, verdict, verdictRationale, model}.
