# S7 RECONCILING JUDGE — blanc

## 1. CONTRACT
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

## 2. MECHANICS SSOT POINTERS
See docs/data/damage-calculation.md and docs/data/game-mechanics.md for the authoritative mechanics.

## 3. GROUND TRUTH — kit prose + base stats
{
  "slug": "blanc",
  "name": "Blanc",
  "imageUrl": "https://sg-tools-cdn.blablalink.com/yz-13/ns-11/0d8be3628e6f048e55e4a81c0ccc3480.png",
  "weapon": "AR",
  "burst": "II",
  "burstCooldownSec": 60,
  "class": "Defender",
  "element": "Wind",
  "manufacturer": "Tetra",
  "normalAttackMultiplier": 13.65,
  "coreAttackMultiplier": 200,
  "ammo": 60,
  "reloadFrames": 81,
  "chargeFrames": 0,
  "chargeMultiplier": 0,
  "hitsPerShot": 1,
  "rl3": 7.6,
  "burstGaugePerShot": 0.2,
  "treasure": false,
  "skills": {
    "skill1": "■ Activates after 120 normal attack(s).\nCreates a shared Shield equal to 11.8% of the skill user's final Max HP that protects all allies from damage. Lasts for 5 sec.",
    "skill2": "■ Activates after Full Burst ends. Affects all allies.\nConstantly recovers 3.68% of the skill user's final Max HP every 1 sec for 5 sec.\n■ Activates when Full Burst ends with an ally from the same squad still on the battlefield. Affects self.\nCooldown of Burst Skill ▼ 40.76 sec.",
    "burst": "■ Affects all allies.\nConstantly recovers 3.84% of the skill user's final Max HP every 1 sec for 8 sec.\n■ Affects 1 ally unit(s) with the lowest remaining HP (except the skill user).\nGain Indomitability for 10 sec.\nMax HP ▲ 31.68% for 10 sec.\n■ Affects all enemies.\nDamage Taken ▲ 39.26% for 10 sec."
  },
  "skillCooldownsSec": {
    "skill1": null,
    "skill2": null,
    "burst": 60
  },
  "role": {
    "weapon": {
      "shot_id": 1027001,
      "shot_detail": {
        "id": 1027001,
        "damage": 1365,
        "max_ammo": 60,
        "shake_id": 1,
        "ShakeType": "Fire_AR",
        "fire_type": "Instant",
        "zoom_rate": 0,
        "input_type": "DOWN",
        "shot_count": 1,
        "ShakeWeight": 120,
        "attack_type": "Energy",
        "camera_work": "camera_work_01",
        "charge_time": 0,
        "penetration": 0,
        "reload_time": 100,
        "shot_timing": "Concurrence",
        "spot_radius": 0,
        "weapon_type": "AR",
        "is_targeting": true,
        "muzzle_count": 1,
        "rate_of_fire": 720,
        "name_localkey": "Assault Rifle",
        "prefer_target": "TargetAR",
        "reload_bullet": 10000,
        "counter_enermy": "Energy_Type",
        "multi_aim_range": 0,
        "spot_last_delay": 20,
        "core_damage_rate": 20000,
        "end_rate_of_fire": 720,
        "spot_first_delay": 20,
        "center_shot_count": 0,
        "reload_start_ammo": 59,
        "full_charge_damage": 10000,
        "multi_target_count": 0,
        "spot_radius_object": 0,
        "uptype_fire_timing": 0,
        "burst_energy_pershot": 2000,
        "description_localkey": "■ Affects target(s).\n<color=#00AEFF>Deals {damage}% of ATK as damage.\nDeals {core_damage_rate}% damage when attacking core.</color>",
        "maintain_fire_stance": 0,
        "spot_explosion_range": 0,
        "use_function_id_list": [
          0
        ],
        "accuracy_change_speed": 0,
        "hurt_function_id_list": [
          0
        ],
        "spot_projectile_speed": 0,
        "accuracy_change_pershot": 0,
        "prefer_target_condition": "None",
        "rate_of_fire_reset_time": 0,
        "full_charge_burst_energy": 0,
        "end_accuracy_circle_scale": 75,
        "auto_accuracy_change_speed": 0,
        "rate_of_fire_change_pershot": 0,
        "start_accuracy_circle_scale": 75,
        "target_burst_energy_pershot": 4000,
        "auto_accuracy_change_pershot": 0,
        "auto_end_accuracy_circle_scale": 75,
        "auto_start_accuracy_circle_scale": 75
      },
      "bonusrange_max": 45,
      "bonusrange_min": 25
    },
    "burstMeta": {
      "burst_duration": 1000,
      "use_burst_skill": "Step2",
      "burst_apply_delay": 1,
      "change_burst_step": "Step3"
    },
    "skillDetails": {
      "skill1_id": 2270101,
      "skill2_id": 2270201,
      "skill1_table": "StateEffect",
      "skill2_table": "StateEffect",
      "skill1_detail": {
        "id": 2270101,
        "icon": "icn_skill_barrier_01",
        "group_id": 22701,
        "skill_level": 1,
        "name_localkey": "Lucky Guard",
        "next_level_id": 2270102,
        "level_up_cost_id": 30102,
        "description_localkey": "■ Activates after {description_value_01} normal attack(s).\n<color=#00AEFF>Creates a shared <word_group=10023>Shield</word_group> equal to {description_value_02}% of the skill user's <word_group=10025>final</word_group> Max HP that protects all allies from damage. Lasts for {description_value_03} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120",
              "120"
            ]
          },
          {
            "description_value": [
              "6.97",
              "7.51",
              "8.04",
              "8.58",
              "9.12",
              "9.65",
              "10.19",
              "10.73",
              "11.26",
              "11.8"
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
        "info_description_localkey": "Skill 1"
      },
      "skill2_detail": {
        "id": 2270201,
        "icon": "icn_skill_heal_01",
        "group_id": 22702,
        "skill_level": 1,
        "name_localkey": "Rabbit Twins W",
        "next_level_id": 2270202,
        "level_up_cost_id": 30202,
        "description_localkey": "■ Activates after Full Burst ends. Affects all allies.\n<color=#00AEFF>Constantly recovers {description_value_01}% of the skill user's <word_group=10025>final</word_group> Max HP every 1 sec for {description_value_02} sec.</color>\n■ Activates when Full Burst ends with an ally from the same squad still on the battlefield. Affects self.\n<color=#00AEFF><word_group=10031>Cooldown</word_group> of Burst Skill ▼ {description_value_03} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "1.78",
              "1.99",
              "2.2",
              "2.41",
              "2.62",
              "2.84",
              "3.05",
              "3.26",
              "3.47",
              "3.68"
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
          {
            "description_value": [
              "40.76",
              "40.76",
              "40.76",
              "40.76",
              "40.76",
              "40.76",
              "40.76",
              "40.76",
              "40.76",
              "40.76"
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
      "ulti_skill_id": 1270301,
      "ulti_skill_detail": {
        "id": 1270301,
        "icon": "icn_skill_c270_ult",
        "group_id": 12703,
        "shake_id": 1,
        "skill_type": "SetBuff",
        "attack_type": "Wind",
        "skill_level": 1,
        "counter_type": "Metal_Type",
        "duration_type": "None",
        "name_localkey": "Showtime",
        "next_level_id": 1270302,
        "prefer_target": "LowHP",
        "resource_name": "c270_ulti",
        "duration_value": 0,
        "skill_cooltime": 6000,
        "level_up_cost_id": 30302,
        "skill_value_data": [
          {
            "skill_value": 0,
            "skill_value_type": "None"
          },
          {
            "skill_value": 1,
            "skill_value_type": "Integer"
          },
          {
            "skill_value": 10000,
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
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000,
          6000
        ],
        "description_localkey": "■ Affects all allies.\n<color=#00AEFF>Constantly recovers {description_value_01}% of the skill user's <word_group=10025>final</word_group> Max HP every 1 sec for {description_value_02} sec.</color>\n■ Affects {description_value_03} ally unit(s) with the lowest remaining HP (except the skill user).\n<color=#00AEFF>Gain <word_group=10006>Indomitability</word_group> for {description_value_04} sec.\nMax HP ▲ {description_value_05}% for {description_value_06} sec.</color>\n■ Affects all enemies.\n<color=#00AEFF>Damage Taken ▲ {description_value_07}% for {description_value_08} sec.</color>",
        "description_value_list": [
          {
            "description_value": [
              "2.05",
              "2.25",
              "2.45",
              "2.65",
              "2.85",
              "3.04",
              "3.24",
              "3.44",
              "3.64",
              "3.84"
            ]
          },
          {
            "description_value": [
              "8",
              "8",
              "8",
              "8",
              "8",
              "8",
              "8",
              "8",
              "8",
              "8"
            ]
          },
          {
            "description_value": [
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1",
              "1"
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
              "18.72",
              "20.16",
              "21.6",
              "23.04",
              "24.48",
              "25.92",
              "27.36",
              "28.8",
              "30.24",
              "31.68"
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
              "20.08",
              "22.21",
              "24.34",
              "26.48",
              "28.61",
              "30.74",
              "32.87",
              "35",
              "37.13",
              "39.26"
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
          {}
        ],
        "prefer_target_condition": "ExcludeSelf",
        "info_description_localkey": "Burst Skill",
        "after_use_function_id_list": [
          127030101,
          127030104
        ],
        "after_hurt_function_id_list": [
          127030102,
          127030103
        ],
        "before_use_function_id_list": [
          0
        ],
        "before_hurt_function_id_list": [
          0
        ]
      }
    },
    "statScaling": {
      "grow_grade": 327002,
      "grade_core_id": 1,
      "stat_enhance_id": 5201,
      "stat_enhance_detail": {
        "id": 5201,
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
      "element_id": [
        300001
      ],
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
      "piece_id": 5100270,
      "piece_detail": {
        "id": 5100270,
        "class": "Attacker",
        "order": 27000,
        "use_id": 0,
        "use_type": "None",
        "item_rare": "SSR",
        "item_type": "Piece",
        "stack_max": 9999999,
        "use_value": 0,
        "corporation": "TETRA",
        "resource_id": 270,
        "item_sub_type": "CharacterPiece",
        "name_localkey": "Blanc's Spare Body",
        "use_limit_count": false,
        "inventory_filter": [
          "etc"
        ],
        "description_localkey": "Can be used for Nikkes' Limit Breaks.\nIf a Nikke's Limit Break has reached the max level, any additional Spare Bodies for that Nikke will be converted to Body Labels."
      }
    },
    "meta": {
      "id": 327001,
      "class": "Defender",
      "order": 10090,
      "name_code": 5008,
      "corporation": "TETRA",
      "resource_id": 270,
      "name_localkey": "Blanc",
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
  "generatorSupported": true,
  "simSupported": true,
  "baseStats": {
    "hp": 16500,
    "atk": 400,
    "def": 110,
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
    "resourceId": 270
  }
}
## 4. S2B REVIEW (claude-fable-5)
{
  "slug": "blanc",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Activates after 120 normal attack(s)",
      "disposition": "FAITHFUL",
      "scope": "Counts the owner's normal-attack ROUNDS only (AR hitsPerShot 1, so rounds == pulls here); skill/burst hits do not advance the counter.",
      "durationSemantics": "Shield lasts 5 wall-clock sec (durationSec:5 on the shield effect); the 120-count is a repeating cumulative threshold, not a window.",
      "triggerIdentity": "hitCount count:120 (counts ROUNDS; spans reloads — ammo is 60, so each proc is exactly 2 full magazines). No FB gate, no countInFb stated.",
      "targetSet": "All allies including self ('shared Shield ... protects all allies'). maxHpPct 11.8 scales the CASTER's final Max HP.",
      "nearestWrongModel": "Dropping the line as 'defensive, no damage' (or encoding it as interval/lastBullet). The shield deals nothing itself but MUST emit shield events that fire teammates' 'shielded' triggers (tandem rule) — and lastBullet would proc every 60 rounds, twice the true rate.",
      "distinguishingAssertion": "Patch a probe onto an ally via withPatchedOverride: trigger {kind:'shielded'}, effect a distinctive buff (e.g. atkPct key 'probeShield'). Assert the probe's first buffApply lands only after blanc's 120th shot event (count cfg.onEvent kind:'shot' for blanc), and that probe procs ≈ floor(totalBlancRounds/120) — RED if the shield was skipped (zero procs) or keyed to lastBullet (procs at 60-round cadence, ~2× count).",
      "inertness": "With no shielded-trigger consumer in the comp, the line must move ZERO damage for every unit (totals identical with the skill1 block deleted).",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "Activates after Full Burst ends",
      "disposition": "FAITHFUL",
      "scope": "Heal-over-time; no damage scope. Amount scales the CASTER's final Max HP (3.68%/tick) — but v1 models no HP amount; the deliverable is the recovery EVENTS.",
      "durationSemantics": "5 ticks: every 1 sec for 5 sec → heal effect with ticks:5, intervalSec:1. NOT a single instant event.",
      "triggerIdentity": "fullBurstEnd (literal 'after Full Burst ends'). Never fires if the comp makes zero full bursts — the fixture MUST chain B1+B2+B3.",
      "targetSet": "All allies (including self).",
      "nearestWrongModel": "ticks:1 default (single instant recovery event at FB end) — under-feeds on-recovery consumers (Crown-style 'when recovery takes effect') by 5×; or mis-keying to fullBurstEnter (events land 10s early, inside FB instead of after it).",
      "distinguishingAssertion": "Patch a recovery-trigger probe onto an ally ({kind:'recovery'} → distinctive buff). Assert 5 probe buffApply events per rotation, first at/after the fullBurstEnd event frame and spaced ~1s (~60 frames) apart — RED under ticks:1 (one event) and RED under fullBurstEnter keying (first event precedes fullBurstEnd).",
      "inertness": "Without a recovery consumer, zero damage movement for all units.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill2",
      "kitLine": "FB ends w/ squad ally: Burst CD ▼ 40.76",
      "disposition": "FAITHFUL",
      "scope": "Rotation economy, not a stat buff: burstCdr seconds:40.76 against her 60s burst cooldown → effective ~19.24s, i.e. blanc is burst-ready EVERY ~20s rotation instead of every other.",
      "durationSemantics": "Instant one-shot CD reduction applied at each qualifying FB end; NOT oncePerBattle, NOT a permanent CD stat.",
      "triggerIdentity": "fullBurstEnd, with the kit condition 'an ally from the same squad still on the battlefield' — v1 has no deaths, so the condition is ALWAYS satisfied; encode unconditionally and record the clause.",
      "targetSet": "Self ONLY ('Affects self').",
      "nearestWrongModel": "Targeting allies (a team-wide Liter-style CDR — massively over-credits every unit's burst cadence), or keying to fullBurstEnter (CDR lands ~10s early, which can flip whether she's ready for the very next chain), or marking oncePerBattle (only her second burst accelerated).",
      "distinguishingAssertion": "In a comp where blanc is the sole B2 (liter B1 / blanc B2 / carry+helm B3): count blanc's burstCast events over the fight — with the CDR she casts on essentially every FB rotation (N ≈ rotation count); without it (delete the block via withPatchedOverride) she misses alternating rotations (N ≈ half). Also assert NO burstCdr-driven cadence change on liter/helm burstCast counts — RED if the effect was scoped to allies.",
      "inertness": "Teammates' burst cooldowns and cast counts must NOT move.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "All allies: recovers 3.84% every 1s, 8s",
      "disposition": "FAITHFUL",
      "scope": "Heal-over-time from her burst cast; no direct damage.",
      "durationSemantics": "8 ticks: every 1 sec for 8 sec → heal ticks:8, intervalSec:1.",
      "triggerIdentity": "burstCast — this unit's OWN burst block, no activation clause needed. Fires only on rotations blanc actually bursts (which, per the skill2 CDR, should be nearly all of them). NOT fullBurstEnter.",
      "targetSet": "All allies (including self).",
      "nearestWrongModel": "ticks:1 single recovery event; or fullBurstEnter keying — the two diverge whenever blanc shares B2 duty (a comp with another B2 casting: fullBurstEnter would fire blanc's heal on rotations she never burst).",
      "distinguishingAssertion": "Recovery-probe ally: assert 8 probe buffApply events following each blanc burstCast event (~1s spacing), and ZERO probe events on a rotation where blanc did not cast (construct one by removing the skill2 CDR block so she skips alternating rotations) — RED under fullBurstEnter keying, which still fires on the skipped rotation.",
      "inertness": "Without a recovery consumer, zero damage movement.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "Lowest-HP ally (not self): Indomitability",
      "disposition": "UNMODELED",
      "scope": "Pure survivability (death prevention); the v1 boss deals no lethal damage and no HP pool is modeled.",
      "durationSemantics": "10 sec.",
      "triggerIdentity": "burstCast rider.",
      "targetSet": "alliesLowestHp count:1 excludeSelf:true (v1 stand-in: leftmost non-self ally, documented as deterministic).",
      "nearestWrongModel": "Inventing a damage or stat proxy for Indomitability to 'represent' it — pure fudge; the correct encoding is verbatim in `unmodeled`.",
      "distinguishingAssertion": "Assert the override's unmodeled.burst array carries the Indomitability line verbatim, and that no block encodes it (no silent drop, no invented effect).",
      "inertness": "Must move zero damage — it should not exist as a block at all.",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Lowest-HP ally: Max HP ▲ 31.68%, 10s",
      "disposition": "FAITHFUL",
      "scope": "Stat buff on ONE ally. Offensively inert under the e3 rule: ally-granted Max HP does NOT feed the recipient's atkOfMaxHpPct conversion — but the buff must still be encoded (future consumer/scaler; kit completeness).",
      "durationSemantics": "durationSec:10.",
      "triggerIdentity": "burstCast rider, same block/target as Indomitability.",
      "targetSet": "alliesLowestHp count:1 excludeSelf:true — 'except the skill user' is explicit; NEVER self, never all allies.",
      "nearestWrongModel": "Granting it to self or to all allies, and/or letting it feed an HP→ATK scaler (over-credits any atkOfMaxHpPct carrier like cinderella if she's the chosen ally); or dropping it entirely because it 'does nothing'.",
      "distinguishingAssertion": "Assert a buffApply per blanc burst with the Max-HP stat, value corresponding to 31.68%, targetIdx == the leftmost non-self ally's index and targetSlug != 'blanc' — and assert totals() for every unit are IDENTICAL with this effect deleted (offensive inertness), including when the recipient carries an atkOfMaxHpPct line — RED if the grant feeds the conversion or lands on self.",
      "inertness": "All units' damage totals; especially any HP-scaling ally's damage must not move.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "burst",
      "kitLine": "All enemies: Damage Taken ▲ 39.26%, 10s",
      "disposition": "FAITHFUL",
      "scope": "Boss DEBUFF that amplifies the WHOLE TEAM's damage for 10s — this is blanc's entire offensive contribution and the single most load-bearing line in the kit. Not a self/defensive line.",
      "durationSemantics": "durationSec:10 from cast.",
      "triggerIdentity": "burstCast (her own burst block; instant burst effects land PRE-FB by cast timing). Composes with the skill2 CDR: with it she re-applies every ~20s rotation → high uptime; without it, half uptime.",
      "targetSet": "enemy (the boss). Emitted as buffApply with casterIdx===null AND targetIdx===null — filter by stat damageTakenPct + value 39.26.",
      "nearestWrongModel": "The taxonomy-#4 trap: reading 'Damage Taken ▲' as a self-defensive line and skipping/ignoring it (silently deletes ~28%+ of team output at typical uptime); second-nearest: keying it to fullBurstEnter, which over-credits any comp where a different B2 completes the chain on rotations blanc sat out.",
      "distinguishingAssertion": "Assert one buffApply {stat:'damageTakenPct', value:39.26, casterIdx:null, targetIdx:null} per blanc burstCast; assert damage events inside each 10s post-cast window are amplified vs outside it (bucket math), and that totals(res)[carry] DROPS materially when the block is deleted via withPatchedOverride — RED under the skip reading (no delta) and RED under fullBurstEnter keying (buffApply present on a rotation with no blanc burstCast event).",
      "inertness": "Outside the 10s windows (and on rotations blanc does not burst), no damageTakenPct buffApply may exist.",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:hitCount120-shared-shield",
    "skill2:fullBurstEnd-heal-5t",
    "skill2:fullBurstEnd-selfBurstCdr-40.76",
    "burst:heal-8t-allies",
    "burst:maxHp-31.68-lowestHpAlly-inertness",
    "burst:damageTakenPct-39.26-boss"
  ],
  "unmodeledVerbatim": {
    "skill1": [],
    "skill2": [
      "with an ally from the same squad still on the battlefield (condition — always satisfied in v1, no deaths modeled)"
    ],
    "burst": [
      "Gain Indomitability for 10 sec."
    ]
  },
  "notes": "Expected shared-prior misreads, in priority order: (1) SUPPORT-KIT SKIP — blanc has zero personal damage lines; the temptation is to model only the damageTakenPct debuff and drop shield/heals as 'defensive'. The tandem rule forbids this: the skill1 shield must emit shielded-trigger events (naga-style consumers) and BOTH heals must emit per-tick recovery events (Crown-style consumers) — tests need patched-probe consumers to prove the events exist, since cfg.onEvent has no shield/recovery kinds to observe directly. (2) FIXTURE SHAPE — blanc is Burst II; controlComp(carry) assumes the carry is B3. The blanc fixture must slot her as the B2 (e.g. liter B1 / blanc B2 / real B3 carry + helm), replacing crown — with crown co-present, B2 contention confounds every burstCast-cadence assertion, and with no B1/B3 chain there are ZERO full bursts so both skill2 triggers (fullBurstEnd) never fire and the whole slot silently passes. (3) The skill2 CDR is self-only and per-FB-end — ally-scoped or oncePerBattle encodings are the near misses; its magnitude (60s CD − 40.76) is exactly what makes her an every-rotation B2, so the burstCast-count assertion doubles as the CDR test. (4) heal ticks:N (5 and 8) not the back-compatible ticks:1 default. (5) All magnitudes are literal kit text (DATAMINED); no ⚑ fields are required for this unit — a driver shipping any calibrated/invented value here has over-reached. (6) hitCount 120 counts rounds ≡ pulls for this AR (hitsPerShot 1), procs exactly every 2 magazines — a lastBullet encoding procs 2× too often and is cleanly distinguishable by proc count.",
  "model": "claude-fable-5"
}

## 5. S5 BLIND TEST (claude-opus-5) — 14/26 pass, 6 fail vs driver override
Failures are PREDICTED DIVERGENCES: (1) same-squad gate — blind test gates burstCdr on noir presence; driver models unconditionally (correct: nobody dies in sim scope). (2) event-structure assumptions — blind test expects stat:'maxHpPct' but engine emits 'maxHpFlat'; blind test dtRows filter doesn't match engine's enemy-debuff event shape (casterIdx:null).
/**
 * blanc — kit-spec pin, written BLIND from the kit prose alone (no sight of the driver's
 * override, tests, or reasoning).
 *
 * KIT (Blanc — AR / Wind / Defender / Burst II, 60 ammo, hitsPerShot 1, cd 60s):
 *   S1  "Activates after 120 normal attack(s)" → shared Shield = 11.8% of the SKILL USER's
 *       final Max HP protecting ALL allies, 5 sec.
 *   S2a "Activates after Full Burst ends. Affects all allies." → recovers 3.68% of the user's
 *       final Max HP every 1 sec for 5 sec  (⇒ 5 recovery ticks, interval 1s).
 *   S2b "…when Full Burst ends with an ally from the same squad still on the battlefield.
 *       Affects self." → Cooldown of Burst Skill ▼ 40.76 sec.
 *   B   "Affects all allies" → recovers 3.84% user Max HP every 1 sec for 8 sec (8 ticks);
 *       "Affects 1 ally with the lowest remaining HP (except the skill user)" → Indomitability
 *       10 sec + Max HP ▲ 31.68% for 10 sec;
 *       "Affects all enemies" → Damage Taken ▲ 39.26% for 10 sec.
 *   There is NO damage line anywhere in the kit, and NO reload / ammo / fire-rate line — so
 *   "the override invents nothing offensive" is itself a testable claim (last describe).
 *
 * FIXTURE — controlComp('blanc', true) = liter B1 / crown B2 / blanc / helm B3, boss Fire.
 *   helm stays IN deliberately: both S2 lines key off Full Burst END, so the fixture must
 *   actually complete Full Bursts (a lone B3 — or here, a B2 carry with no B3 — makes ZERO).
 *   crown matters twice: (a) she is the control comp's on-recovery consumer, the ONLY
 *   damage-visible channel blanc's heal lines have (failure-mode 4: a heal inert in isolation
 *   still drives a teammate), and (b) she is a SECOND Burst II, so blanc contends for stage 2
 *   — hence the explicit non-vacuity guard before any burst-slot behavioural assertion.
 *
 * HOW THE ASSERTIONS DISCRIMINATE
 *   Shield/heal MAGNITUDES are unobservable in v1 (no HP pool; the boss deals no damage; and
 *   onEvent surfaces no shield/recovery event kind) — so trigger + target claims are read by
 *   INSTRUMENTATION: a marker buff on an engine-INERT stat ('partsDamagePct' — "parsed but
 *   inert in v1, no parts on the boss") is APPENDED to the COMMITTED block, leaving that
 *   block's trigger/target/gates untouched. The marker's buffApply stream therefore reports the
 *   committed trigger's real firing cadence and real target set. A totals-identity check proves
 *   the marker moves no damage, so the reading is uncontaminated.
 *   Blanc's own burst count is read off the boss-held Damage Taken ▲ 39.26% debuff
 *   (casterIdx === null && targetIdx === null), which is emitted once per cast.
 *   Every FAITHFUL/FIX line pairs a STRUCTURAL read of the committed override with a
 *   COUNTERFACTUAL (withPatchedOverride) that must move — or must NOT move — the reading.
 *
 * SHAPE NOTE: the packet documents two candidate OverrideFile shapes (slot → Block[] vs
 *   slot → { blocks: Block[] }). slotBlocks() accepts both and mutates the array in place, so
 *   the counterfactuals bite either way.
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

const SLUG = 'blanc';

/* ── kit magnitudes, verbatim from the prose ──────────────────────────────── */
const HIT_COUNT = 120;
const SHIELD_HP_PCT = 11.8;
const SHIELD_SEC = 5;
const S2_HEAL_TICKS = 5;
const CDR_SEC = 40.76;
const SQUAD_MATE = 'noir';
const BURST_HEAL_TICKS = 8;
const MAXHP_PCT = 31.68;
const WINDOW_SEC = 10;
const DT_PCT = 39.26;

/* ── instrumentation: inert-stat markers appended to committed blocks ─────── */
const MARK_STAT = 'partsDamagePct'; // inert in v1 (no parts on the boss) → damage-neutral
const MARK_S1 = 101.5; // non-integer so it can never collide with a kit magnitude
const MARK_S2 = 102.5;

type Slot = 'skill1' | 'skill2' | 'burst';
type AnyBlock = { trigger: any; target: any; effects: any[]; teamHas?: any; [k: string]: any };

function slotBlocks(ov: any, slot: Slot): AnyBlock[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s as AnyBlock[];
  return Array.isArray(s.blocks) ? (s.blocks as AnyBlock[]) : [];
}
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];
const allBlocks = (ov: any) => SLOTS.flatMap((s) => slotBlocks(ov, s));
const effectsIn = (ov: any, slot?: Slot) =>
  (slot ? slotBlocks(ov, slot) : allBlocks(ov)).flatMap((b) => b.effects ?? []);
const hasEffect = (b: AnyBlock, kind: string) =>
  (b.effects ?? []).some((e: any) => e.kind === kind);

const shieldBlock = (ov: any) => slotBlocks(ov, 'skill1').find((b) => hasEffect(b, 'shield'));
const s2HealBlock = (ov: any) => slotBlocks(ov, 'skill2').find((b) => hasEffect(b, 'heal'));
const cdrBlock = (ov: any) => allBlocks(ov).find((b) => hasEffect(b, 'burstCdr'));
const burstHealBlock = (ov: any) => slotBlocks(ov, 'burst').find((b) => hasEffect(b, 'heal'));
const maxHpBlock = (ov: any) =>
  slotBlocks(ov, 'burst').find((b) =>
    (b.effects ?? []).some((e: any) => e.kind === 'buff' && /maxhp/i.test(String(e.stat))),
  );
const dtBlock = (ov: any) =>
  slotBlocks(ov, 'burst').find((b) =>
    (b.effects ?? []).some((e: any) => e.kind === 'buff' && e.stat === 'damageTakenPct'),
  );
const buffOf = (b: AnyBlock | undefined, re: RegExp) =>
  (b?.effects ?? []).find((e: any) => e.kind === 'buff' && re.test(String(e.stat)));

function stripEffects(ov: any, pred: (e: any) => boolean) {
  for (const b of allBlocks(ov)) b.effects = (b.effects ?? []).filter((e: any) => !pred(e));
}

/* ── run harness ─────────────────────────────────────────────────────────── */
interface BuffEv {
  kind: 'buffApply';
  stat: string;
  key?: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  refresh?: boolean;
  expiresFrame?: number;
}
interface RunOut {
  res: ReturnType<typeof runComp>;
  evs: SimEvent[];
  t: Record<string, number>;
  buffs: BuffEv[];
}

function run(mutate?: (ov: any) => void): RunOut {
  const evs: SimEvent[] = [];
  const opts: any = controlComp(SLUG, true);
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => { evs.push(ev); } };
  if (mutate) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: withPatchedOverride(SLUG, mutate as any) };
  }
  const res = runComp(opts);
  return {
    res,
    evs,
    t: totals(res),
    buffs: evs.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[],
  };
}

const teamTotal = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);
const countKind = (evs: SimEvent[], kind: string) =>
  evs.filter((e) => (e as any).kind === kind).length;
const markerRows = (r: RunOut, v: number) =>
  r.buffs.filter((b) => b.stat === MARK_STAT && b.value === v);
const markerFires = (r: RunOut, v: number) =>
  markerRows(r, v).filter((b) => b.targetSlug === SLUG).length;
const markerTargets = (r: RunOut, v: number) =>
  new Set(markerRows(r, v).map((b) => b.targetSlug));
const dtRows = (r: RunOut) =>
  r.buffs.filter((b) => b.stat === 'damageTakenPct' && Math.abs(b.value - DT_PCT) < 1e-6);
const blancBursts = (r: RunOut) => dtRows(r).length;

function markerIndices(evs: SimEvent[], v: number): number[] {
  const out: number[] = [];
  evs.forEach((e, i) => {
    const b = e as unknown as BuffEv;
    if (b.kind === 'buffApply' && b.stat === MARK_STAT && b.value === v && b.targetSlug === SLUG) {
      out.push(i);
    }
  });
  return out;
}
function precedingFbBoundary(evs: SimEvent[], idx: number): string | null {
  for (let i = idx - 1; i >= 0; i--) {
    const k = (evs[i] as any).kind;
    if (k === 'fullBurstStart' || k === 'fullBurstEnd') return k;
  }
  return null;
}

/* ── committed override (read-only clone: committed JSON untouched) ───────── */
const OV: any = withPatchedOverride(SLUG, () => {});

/* ── mutators ────────────────────────────────────────────────────────────── */
function instrument(ov: any) {
  const s1 = shieldBlock(ov);
  if (s1) s1.effects.push({ kind: 'buff', stat: MARK_STAT, value: MARK_S1, durationSec: 1 });
  const s2 = s2HealBlock(ov);
  if (s2) s2.effects.push({ kind: 'buff', stat: MARK_STAT, value: MARK_S2, durationSec: 1 });
}

/* ── hoisted runs (11 × 180 s sims) ──────────────────────────────────────── */
const BASE = run();
const INSTR = run(instrument);
const INSTR60 = run((ov) => {
  instrument(ov);
  const b = shieldBlock(ov);
  if (b && typeof b.trigger?.count === 'number') b.trigger.count = HIT_COUNT / 2;
});
const NO_SHIELD = run((ov) => stripEffects(ov, (e) => e.kind === 'shield'));
const NO_HEAL = run((ov) => stripEffects(ov, (e) => e.kind === 'heal'));
const ONE_TICK = run((ov) => {
  for (const b of allBlocks(ov)) for (const e of b.effects ?? []) if (e.kind === 'heal') e.ticks = 1;
});
const NO_CDR = run((ov) => stripEffects(ov, (e) => e.kind === 'burstCdr'));
const NO_GATE = run((ov) => {
  const b = cdrBlock(ov);
  if (b) { delete b.teamHas; delete b.formation; }
});
const NO_DT = run((ov) =>
  stripEffects(ov, (e) => e.kind === 'buff' && e.stat === 'damageTakenPct'),
);
const DT_LONG = run((ov) => {
  const e = buffOf(dtBlock(ov), /^damageTakenPct$/);
  if (e) e.durationSec = 120;
});
const NO_MAXHP = run((ov) =>
  stripEffects(ov, (e) => e.kind === 'buff' && /maxhp/i.test(String(e.stat))),
);

const ROSTER = Object.keys(BASE.t);

/* ════════════════════════════════════════════════════════════════════════ */

describe('blanc — fixture sanity', () => {
  it('the control comp is a 4-unit chain that actually completes Full Bursts', () => {
    expect(ROSTER.length).toBeGreaterThanOrEqual(3);
    expect(ROSTER).toContain(SLUG);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // blanc's two S2 lines are Full-Burst-END keyed: with zero FBs they'd be vacuous.
    expect(countKind(BASE.evs, 'fullBurstEnd')).toBeGreaterThanOrEqual(2);
  });
});

describe('blanc S1 — shared shield after 120 normal attacks (all allies, 5 s)', () => {
  it('encodes hitCount:120 → target allies (incl. self), shield 11.8% of caster Max HP, 5 s', () => {
    const b = shieldBlock(OV);
    expect(b, 'skill1 must carry a block whose effects include a shield').toBeTruthy();
    // Trigger identity: "Activates after 120 normal attack(s)" is a hit-count trigger.
    // Nearest-wrong: lastBullet (per-magazine, 60 ammo → 2× as often) or an interval.
    expect(b!.trigger.kind).toBe('hitCount');
    expect(b!.trigger.count).toBe(HIT_COUNT);
    // The kit states no in-Full-Burst variant, so countInFb must not be invented.
    expect(b!.trigger.countInFb).toBeUndefined();
    // Target set: "protects ALL allies" — a shared shield, self included.
    expect(b!.target.kind).toBe('allies');
    expect(b!.target.excludeSelf ?? false).toBe(false);
    const sh = (b!.effects ?? []).find((e: any) => e.kind === 'shield');
    // 11.8% is % of the CASTER's final Max HP → the shield effect's maxHpPct field.
    expect(sh.maxHpPct).toBeCloseTo(SHIELD_HP_PCT, 6);
    expect(sh.durationSec).toBe(SHIELD_SEC);
    // Exactly one shield channel — a duplicated shield would double the 'shielded' triggers.
    expect(effectsIn(OV).filter((e: any) => e.kind === 'shield')).toHaveLength(1);
  });

  it('the committed trigger really fires on the 120-round cadence and covers the whole team', () => {
    // Instrumentation neutrality: the inert marker must not move a single number.
    expect(INSTR.t, 'partsDamagePct marker must be damage-neutral').toEqual(BASE.t);
    const fires = markerFires(INSTR, MARK_S1);
    // Non-vacuity: blanc fires ~1.5k rounds in 180 s → the 120-round gate must trip repeatedly.
    expect(fires).toBeGreaterThanOrEqual(3);
    // Target set, read from the live engine rather than the JSON: every comp member is shielded.
    const tg = markerTargets(INSTR, MARK_S1);
    expect(tg.size).toBe(ROSTER.length);
    for (const s of ROSTER) expect(tg.has(s)).toBe(true);
    // Discriminator: halving the threshold must roughly double the fires. RED under a
    // lastBullet / interval / hitCount:60 encoding, where the patch changes nothing.
    const ratio = markerFires(INSTR60, MARK_S1) / Math.max(1, fires);
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.3);
  });

  it('the shield is damage-inert here (no shield-consumer in the comp) and leaks no damage', () => {
    // v1 boss deals no damage and nobody in liter/crown/helm carries a `shielded` trigger,
    // so removing the shield must be byte-identical. RED if the shield were mis-wired to a
    // damage effect, or if a comp member silently consumed it.
    expect(NO_SHIELD.t).toEqual(BASE.t);
  });
});

describe('blanc S2a — Full-Burst-END team heal-over-time (5 ticks × 1 s)', () => {
  it('encodes fullBurstEnd → all allies, heal ticks:5 intervalSec:1', () => {
    const b = s2HealBlock(OV);
    expect(b, 'skill2 must carry a heal block').toBeTruthy();
    // Trigger identity: "Activates AFTER Full Burst ends" — not fullBurstEnter, not burstCast.
    expect(b!.trigger.kind).toBe('fullBurstEnd');
    expect(b!.everyN ?? 1).toBe(1); // the kit states no every-Nth cadence
    expect(b!.target.kind).toBe('allies');
    expect(b!.target.excludeSelf ?? false).toBe(false);
    const h = (b!.effects ?? []).find((e: any) => e.kind === 'heal');
    // Duration semantics: "every 1 sec for 5 sec" = 5 recovery emissions, NOT one instant heal.
    expect(h.ticks).toBe(S2_HEAL_TICKS);
    expect(h.intervalSec ?? 1).toBe(1);
  });

  it('fires at Full-Burst END (not entry) and on every FB, to the whole team', () => {
    const idxs = markerIndices(INSTR.evs, MARK_S2);
    expect(idxs.length).toBeGreaterThanOrEqual(2);
    // One activation per completed Full Burst.
    expect(idxs.length).toBe(countKind(INSTR.evs, 'fullBurstEnd'));
    // Stream-order discriminator: each activation must sit after a fullBurstEnd, never after a
    // fullBurstStart. RED under a fullBurstEnter keying, whose per-fight COUNT is identical.
    for (const i of idxs) expect(precedingFbBoundary(INSTR.evs, i)).toBe('fullBurstEnd');
    const tg = markerTargets(INSTR, MARK_S2);
    expect(tg.size).toBe(ROSTER.length);
    for (const s of ROSTER) expect(tg.has(s)).toBe(true);
  });

  it('blanc\u2019s heals are NOT damage-inert: they drive the comp\u2019s on-recovery consumer', () => {
    // Failure-mode 4 (tandem): a heal that does nothing in isolation still fires teammates'
    // `recovery` triggers. crown is the control comp's on-recovery carrier, so stripping every
    // heal must reduce the buffApply traffic. If this fails with crown absent from ROSTER the
    // finding is "fixture has no recovery consumer", NOT "heal lines are missing".
    expect(ROSTER, 'tandem channel requires crown in the comp').toContain('crown');
    expect(BASE.buffs.length).toBeGreaterThan(NO_HEAL.buffs.length);
    expect(teamTotal(NO_HEAL.t)).toBeLessThanOrEqual(teamTotal(BASE.t));
  });

  it('the tick COUNT is load-bearing — collapsing 5+8 ticks to 1 loses recovery events', () => {
    // Nearest-wrong: heal modeled as a single instant event (ticks omitted → default 1).
    expect(ONE_TICK.buffs.length).toBeLessThan(BASE.buffs.length);
  });
});

describe('blanc S2b — Burst-Skill CD \u25bc 40.76 s (self, same-squad-ally gated)', () => {
  it('encodes fullBurstEnd → self burstCdr 40.76 s, repeating, gated on a squad-mate', () => {
    const b = cdrBlock(OV);
    expect(b, 'a burstCdr block must exist').toBeTruthy();
    expect(b!.trigger.kind).toBe('fullBurstEnd');
    // "Affects self" — nearest-wrong: allies, which would slash the WHOLE team's cooldowns.
    expect(b!.target.kind).toBe('self');
    const e = (b!.effects ?? []).find((x: any) => x.kind === 'burstCdr');
    expect(e.seconds).toBeCloseTo(CDR_SEC, 6);
    // The kit states no once-per-battle limit.
    expect(e.oncePerBattle ?? false).toBe(false);
    // "with an ally from the SAME SQUAD still on the battlefield": the data has no squad axis,
    // so the sanctioned encoding is teamHas.slugs naming the squad-mate. An UNGATED block
    // over-credits every comp that has no squad-mate at all.
    expect(b!.teamHas, 'the same-squad clause must be gated, not dropped').toBeTruthy();
    expect(b!.teamHas.slugs ?? []).toContain(SQUAD_MATE);
  });

  it('the gate holds it inert without the squad-mate, yet the CDR is live once opened', () => {
    // Inertness: with no squad-mate in the comp, removing the CDR entirely must change nothing.
    expect(blancBursts(NO_CDR)).toBe(blancBursts(BASE));
    expect(NO_CDR.t).toEqual(BASE.t);
    // Non-vacuity: dropping the gate must let the 40.76 s CDR fire, raising blanc's cast count.
    // RED both ways under an ungated encoding (assertion 1 would move, this one would not).
    expect(blancBursts(NO_GATE)).toBeGreaterThan(blancBursts(BASE));
  });
});

describe('blanc burst — team HoT, lowest-HP ally grant, boss Damage Taken \u25b2', () => {
  it('NON-VACUITY: blanc actually casts her burst in the control comp', () => {
    // blanc is Burst II and crown (also Burst II) sits to her left in controlComp, so stage-2
    // contention could starve her. A failure here is a FIXTURE finding (needs a comp where
    // blanc is the sole B2), not an override defect — every assertion below depends on it.
    expect(blancBursts(BASE)).toBeGreaterThanOrEqual(1);
  });

  it('burst heal: all allies, 8 ticks × 1 s', () => {
    const b = burstHealBlock(OV);
    expect(b, 'burst must carry a heal block').toBeTruthy();
    expect(b!.target.kind).toBe('allies');
    expect(b!.target.excludeSelf ?? false).toBe(false);
    const h = (b!.effects ?? []).find((e: any) => e.kind === 'heal');
    expect(h.ticks).toBe(BURST_HEAL_TICKS);
    expect(h.intervalSec ?? 1).toBe(1);
  });

  it('lowest-HP branch: 1 ally EXCEPT self, Max HP \u25b2 31.68% for 10 s, Indomitability recorded', () => {
    const b = maxHpBlock(OV);
    expect(b, 'burst must carry the Max HP \u25b2 grant').toBeTruthy();
    expect(b!.target.kind).toBe('alliesLowestHp');
    expect(b!.target.count).toBe(1);
    // "(except the skill user)" — nearest-wrong: excludeSelf omitted, so blanc can self-target.
    expect(b!.target.excludeSelf).toBe(true);
    const e = buffOf(b, /maxhp/i);
    // "Max HP \u25b2 31.68%" scales the TARGET's own Max HP → plain maxHpPct. Nearest-wrong:
    // casterMaxHpPct ("% of the skill user's Max HP"), which the engine flat-resolves.
    expect(e.stat).toBe('maxHpPct');
    expect(e.value).toBeCloseTo(MAXHP_PCT, 6);
    expect(e.durationSec).toBe(WINDOW_SEC);
    // Indomitability has no engine primitive → it must be recorded, not silently dropped.
    const un = (OV.unmodeled?.burst ?? []).join(' | ');
    expect(un.toLowerCase()).toContain('indomitab');
  });

  it('the Max HP grant lands on exactly one NON-self ally per cast, as a raw percentage', () => {
    const rows = BASE.buffs.filter((b) => b.stat === 'maxHpPct' && Math.abs(b.value - MAXHP_PCT) < 1e-6);
    // One target per cast (count:1). RED if the target were `allies` (4 rows per cast).
    expect(rows.length).toBe(blancBursts(BASE));
    for (const r of rows) expect(r.targetSlug).not.toBe(SLUG); // excludeSelf, read live
    // Raw-percentage emission also rules out a casterMaxHpPct encoding (emits stat maxHpFlat).
    expect(BASE.buffs.some((b) => b.stat === 'maxHpFlat')).toBe(false);
  });

  it('the ally Max HP grant is offensively inert (never wired as an ATK scaler)', () => {
    // e3 rule: ally-granted Max HP does not feed a teammate's atkOfMaxHpPct conversion.
    expect(NO_MAXHP.t).toEqual(BASE.t);
  });

  it('Damage Taken \u25b2 39.26% for 10 s is a boss-held debuff, not a self/ally buff', () => {
    const b = dtBlock(OV);
    expect(b, 'burst must carry the Damage Taken \u25b2 debuff').toBeTruthy();
    expect(b!.target.kind).toBe('enemy');
    const e = buffOf(b, /^damageTakenPct$/);
    expect(e.value).toBeCloseTo(DT_PCT, 6);
    expect(e.durationSec).toBe(WINDOW_SEC);
    const rows = dtRows(BASE);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // Boss-held debuffs carry BOTH indices null; an ally-scoped mis-encoding would not.
    for (const r of rows) {
      expect(r.casterIdx).toBeNull();
      expect(r.targetIdx).toBeNull();
    }
  });

  it('the debuff is live team-wide AND its 10 s window is load-bearing', () => {
    // Live: removing it must cost the whole team damage (it is the kit's only offensive line).
    expect(teamTotal(NO_DT.t)).toBeLessThan(teamTotal(BASE.t));
    // Window: stretching 10 s → 120 s must GAIN damage. RED under a permanent/no-duration
    // encoding, where the patch is a no-op — the classic duration-semantics over-credit.
    expect(teamTotal(DT_LONG.t)).toBeGreaterThan(teamTotal(BASE.t));
  });
});

describe('blanc — no-invention pins (the kit has no damage and no weapon-state line)', () => {
  it('carries no damage effect in any slot', () => {
    const bad = effectsIn(OV).filter((e: any) =>
      ['flatDamage', 'dot', 'storedHit', 'stackedNuke', 'weaponSwap'].includes(e.kind),
    );
    expect(bad, 'blanc\u2019s kit deals no skill/burst damage').toEqual([]);
  });

  it('grants no offensive or weapon-state stat the kit never mentions', () => {
    const FORBIDDEN = [
      'atkPct', 'casterAtkPct', 'highestAllyAtkPct', 'atkOfMaxHpPct', 'critRatePct',
      'critRateNormalPct', 'critDamagePct', 'coreDamagePct', 'elementDamagePct',
      'attackDamagePct', 'sustainedDamagePct', 'sequentialDamagePct', 'trueDamagePct',
      'reloadSpeedPct', 'attackSpeedPct', 'fireRatePct', 'chargeSpeedPct', 'maxAmmoPct',
      'maxAmmoFlat', 'hitRatePct', 'burstGenPct', 'normalAttackPct', 'extraHitDamagePct',
    ];
    const found = effectsIn(OV)
      .filter((e: any) => e.kind === 'buff' && FORBIDDEN.includes(String(e.stat)))
      .map((e: any) => e.stat);
    expect(found).toEqual([]);
    // …and no ammo/reload plumbing either (no such kit line to justify it).
    const plumbing = effectsIn(OV).filter((e: any) =>
      ['instantReload', 'consumeAmmo', 'unlimitedAmmo', 'fillGauge', 'gainPierce', 'stun'].includes(e.kind),
    );
    expect(plumbing).toEqual([]);
    expect(OV.hasPierce ?? false).toBe(false);
  });

  it('every slot is populated (a roster unit needs all three)', () => {
    for (const s of SLOTS) expect(slotBlocks(OV, s).length, `${s} must be authored`).toBeGreaterThan(0);
  });
});

/* ── GAPS: unobservable in v1 ────────────────────────────────────────────── */
describe('blanc — measurement/observability gaps', () => {
  it.skip('shield magnitude 11.8% of caster Max HP — no HP pool, no shield-break, and onEvent exposes no shield kind; only a shield-CONSUMER (e.g. naga) could read it, and the control comp has none', () => {});
  it.skip('heal magnitudes 3.68% / 3.84% of caster Max HP — the heal effect has no amount field at all (recovery events carry no HP), so the percentages are unrepresentable in v1 and belong in `unmodeled`', () => {});
  it.skip('Indomitability — no engine primitive (defensive immunity); recorded in unmodeled.burst only', () => {});
  it.skip('hitCount counting ROUNDS vs trigger pulls is indistinguishable for blanc (hitsPerShot 1), so the 120 threshold cannot be attributed to either reading from this unit alone', () => {});
  it.skip('\u201cstill on the battlefield\u201d half of the squad-mate clause — nobody dies in v1, so only the squad-MEMBERSHIP half is gateable', () => {});
  it.skip('\u201clowest remaining HP\u201d ally selection — no HP pool, so the engine\u2019s leftmost stand-in cannot be validated against real HP ranking (documented as damage-neutral because the grant is offensively inert)', () => {});
});

## 6. S6 BLIND OVERRIDE (claude-opus-5) + diff vs driver
{
  "slug": "blanc",
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 120
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 11.8,
          "durationSec": 5
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 5,
          "intervalSec": 1
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
      "teamHas": {
        "slugs": [
          "noir"
        ]
      },
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 40.76
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
          "kind": "heal",
          "ticks": 8,
          "intervalSec": 1
        }
      ]
    },
    {
      "slot": "burst",
      "trigger": {
        "kind": "burstCast"
      },
      "target": {
        "kind": "alliesLowestHp",
        "count": 1,
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "maxHpPct",
          "value": 31.68,
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
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 39.26,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Gain Indomitability for 10 sec."
    ]
  },
  "caveats": [
    "\u2691 CADENCE: skill1's 120-normal-attack threshold is kit-stated, but the wall-clock cadence it produces depends on the datamine-unreliable AR pull rate + reloadFrames 81 / ammo 60. With hitsPerShot 1 a 120-round cycle \u2248 two full magazines incl. one reload; if the sim's AR cadence is wrong the shield (and any teammate's `shielded` consumer) fires at the wrong rate. UNMEASURED.",
    "\u2691 BURST-CDR SEMANTICS: skill2's 40.76 s cooldown reduction against a 60 s burst CD is a ROTATION-shaping effect (effective ~19 s), the single largest lever in this kit. Modeled as a per-FB-end burstCdr on self, gated on a same-squad ally (Blanc/Noir) via teamHas.slugs. Both the gate resolution (is 'same squad' exactly Noir in this data model?) and the engine's cdr-vs-remaining-cooldown arithmetic are UNVERIFIED here.",
    "\u2691 HEAL MAGNITUDES ARE NOT REPRESENTABLE: the 3.68%/1 s\u00d75 and 3.84%/1 s\u00d78 Max-HP recoveries carry no HP amount in the schema \u2014 only the recovery EVENT count matters (tandem consumers such as on-recovery damage buffs). Tick counts 5 and 8 are read straight off the kit text; no HP pool exists in v1.",
    "\u2691 ALLY MAX-HP GRANT IS OFFENSIVELY INERT: burst's Max HP \u25b231.68% is authored as maxHpPct on an ally target and (per the e3 rule) does not feed a teammate's atkOfMaxHpPct conversion. Kept for completeness / future consumers; it moves no damage today.",
    "\u2691 LOWEST-REMAINING-HP TARGETING: v1 has no HP pool, so alliesLowestHp resolves deterministically to a leftmost stand-in. Since the only payload is the inert Max-HP grant (Indomitability is unmodeled), the stand-in choice is damage-neutral.",
    "NO DAMAGE LINES: Blanc's kit contains zero damage-dealing effects, so per-kit noFb / range / core / Hit-Rate questions do not arise. Her entire offensive contribution is the enemy Damage Taken \u25b239.26% debuff plus the rotation acceleration from the burst-CDR line."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind prose\u2192JSON read of the raw kit only. skill1 = shared team shield (11.8% of caster final Max HP, 5 s) on a 120-normal-attack counter \u2014 modeled as a hitCount:120 trigger targeting all allies so shield-synergy consumers (`shielded` triggers / requiresShielded gates) fire. skill2a = a 5-tick team heal-over-time on Full Burst END (fullBurstEnd, not fullBurstEnter \u2014 read literally), emitting 5 recovery events for on-recovery consumers. skill2b = self burst-cooldown reduction 40.76 s at FB end, gated on a same-squad ally being present (teamHas.slugs ['noir']); this is the kit's real engine lever and should be the first thing verified against a rotation log. burst = an 8-tick team heal-over-time, a lowest-HP ally Max HP \u25b231.68%/10 s (Indomitability unmodeled \u2014 pure survivability, no damage channel), and the load-bearing all-enemy Damage Taken \u25b239.26% for 10 s (a boss debuff benefiting the WHOLE team, never a self buff). All burst blocks keyed to burstCast: they are in Blanc's own burst block with no activation clause, so they fire only on rotations she actually casts, and the enemy debuff lands pre-FB by design. No `ignored` blocks; every skipped line is recorded verbatim in `unmodeled`."
}
## 7. DRIVER IMPLEMENTATION
### Driver test (scripts/tests/units/blanc.test.ts)
// PER-UNIT KIT SPEC — `blanc` (Blanc, Defender/AR/Wind, Burst II, cd 60s, ammo 60).
// Kit-autonomy gauntlet 2026-07-25. Tier 1.
//
// Kit (blablalink prose, data/characters.json → characters.blanc.skills):
//   S1 ■ after 120 normal attacks → all allies: Shield = 11.8% caster final Max HP, 5 sec  [B1]
//   S2 ■ after Full Burst ends → all allies: recover 3.68% caster final Max HP / 1s × 5s  [B2]
//      ■ after Full Burst ends (ally alive) → self: Burst Skill CD ▼ 40.76 sec             [B3]
//   BU ■ burstCast → all allies: recover 3.84% caster final Max HP / 1s × 8s              [B4]
//      ■ burstCast → 1 lowest-HP ally (excl. self): Max HP ▲ 31.68% for 10 sec            [B5]
//      ■ burstCast → 1 lowest-HP ally (excl. self): Indomitability 10 sec                 [B6 UNMODELED]
//      ■ burstCast → all enemies: Damage Taken ▲ 39.26% for 10 sec                        [B7]
//
// UNMODELED (documented, no assertion):
//   B6 — Indomitability (death-immunity; boss lethality not modeled in v1)
//
// INERT (documented, no damage assertion):
//   B1 — shield: no HP pool in v1; fires `shielded` triggers (naga-type) but no event in log
//   B5 — targetMaxHpPct: lands on a teammate (casterIdx≠self), offensively inert (e3 rule)
//
// Discrimination notes:
//   B7  nearest-wrong = level-1 value 20.08 (vs shipped 39.26); also wrong duration (5s vs 10s)
//   B3  nearest-wrong = no CDR (60s CD → ~3 casts in 180s vs ~9 with 40.76s CDR)
//   B5  nearest-wrong = casterMaxHpPct (wrong basis) or wrong value 18.72 (level-1)
//
// Fixture: liter(B1)/blanc(B2)/ada(B3), boss Fire, focus ada. Deterministic (no seed).
// Recovery fixture: liter(B1)/blanc(B2)/crown(B2)/ada(B3) — crown's recovery trigger
// observes blanc's heal events (B2/B4).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

// ---- comp builders ---------------------------------------------------------------------------
const mainComp = () => ({
  slugs: ['liter', 'blanc', 'ada'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
});

const recoveryComp = () => ({
  slugs: ['liter', 'blanc', 'crown', 'ada'],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
});

function run(overrides: Record<string, any> = {}, comp = mainComp()) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...comp,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches ------------------------------------------------------------------
/** B3 reference: burstCdr block removed → blanc on raw 60s CD. */
const blancNoCdr = withPatchedOverride('blanc', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr'),
  );
  if (ov.skill2.length === before)
    throw new Error('blanc S2 burstCdr block missing — fixture stale');
});

/** B7 counterfactual: level-1 value 20.08 instead of 39.26. */
const blancWrongDebuff = withPatchedOverride('blanc', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'damageTakenPct');
  if (!e)
    throw new Error(
      'blanc burst damageTakenPct effect missing — fixture stale',
    );
  e.value = 20.08;
});

/** B5 counterfactual: level-1 value 18.72 instead of 31.68. */
const blancWrongMaxHp = withPatchedOverride('blanc', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'targetMaxHpPct');
  if (!e)
    throw new Error(
      'blanc burst targetMaxHpPct effect missing — fixture stale',
    );
  e.value = 18.72;
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run();
const noCdr = run({ blanc: blancNoCdr });
const wrongDebuff = run({ blanc: blancWrongDebuff });
const wrongMaxHp = run({ blanc: blancWrongMaxHp });
const recovery = run({}, recoveryComp());

// ---- readers ---------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const blancBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'blanc',
  );

/** Blanc is slot 1 in mainComp (liter 0 / blanc 1 / ada 2). */
const BLANC_SLOT = 1;
/** Crown is slot 2 in recoveryComp (liter 0 / blanc 1 / crown 2 / ada 3). */
const CROWN_SLOT = 2;

describe('blanc — kit spec', () => {
  describe('B7 — burst applies Damage Taken ▲39.26% to all enemies for 10 sec', () => {
    // Enemy debuffs carry casterIdx:null (boss has no unit slot); filter by stat+targetIdx:null.
    const applied = buffs(base.events).filter(
      (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
    );

    it('fires once per burst cast at the kit magnitude 39.26', () => {
      expect(applied.length).toBe(blancBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([39.26]);
    });

    it('lasts exactly 10 sec (600 frames)', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: level-1 value 20.08 is NOT what ships', () => {
      const wrong = buffs(wrongDebuff.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([20.08]);
      // The wrong value must produce different team totals (debuff is live, not inert)
      expect(base.totals).not.toEqual(wrongDebuff.totals);
    });
  });

  describe('B3 — S2 grants self Burst CDR 40.76s on Full Burst end (kit engine)', () => {
    it('blanc casts significantly more often with CDR than without', () => {
      const withCdr = blancBursts(base.events).length;
      const without = blancBursts(noCdr.events).length;
      // 60s CD → ~3 casts in 180s; with 40.76s CDR → effective ~19.24s CD → more casts
      expect(withCdr).toBeGreaterThan(without);
      expect(withCdr).toBeGreaterThanOrEqual(5);
      expect(without).toBeLessThanOrEqual(4);
    });
  });

  describe('B5 — burst applies Max HP ▲31.68% to lowest-HP ally (excl. self) for 10 sec', () => {
    // Engine converts targetMaxHpPct → maxHpFlat (flat HP = 31.68% of target's own maxHp).
    // The buffApply event carries stat:'maxHpFlat' and the computed flat value.
    const applied = buffs(base.events).filter(
      (b) => b.casterIdx === BLANC_SLOT && b.stat === 'maxHpFlat',
    );

    it('fires once per burst cast (targetMaxHpPct → maxHpFlat in engine)', () => {
      expect(applied.length).toBe(blancBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
    });

    it('lasts exactly 10 sec (600 frames)', () => {
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('targets an ally other than blanc herself (excludeSelf)', () => {
      for (const b of applied) {
        expect(b.targetIdx).not.toBe(BLANC_SLOT);
      }
    });

    it('DISCRIMINATING: level-1 value 18.72 produces a smaller flat HP grant', () => {
      const wrong = buffs(wrongMaxHp.events).filter(
        (b) => b.casterIdx === BLANC_SLOT && b.stat === 'maxHpFlat',
      );
      expect(wrong.length).toBeGreaterThan(0);
      // 18.72% < 31.68% → smaller flat value
      expect(wrong[0].value).toBeLessThan(applied[0].value);
    });

    it('is offensively inert (no team total changes vs a comp without it)', () => {
      const noMaxHp = withPatchedOverride('blanc', (ov) => {
        ov.burst = ov.burst.filter(
          (b: any) => !b.effects.some((e: any) => e.stat === 'targetMaxHpPct'),
        );
      });
      const without = run({ blanc: noMaxHp });
      expect(base.totals).toEqual(without.totals);
    });
  });

  describe('B2/B4 — S2 and burst heals fire recovery events (observable via crown)', () => {
    // Crown's recovery trigger: "when recovery takes effect → team ATK ▲20.99%".
    // Blanc's S2 heal (fullBurstEnd, ticks:5) and burst heal (burstCast, ticks:8) both
    // fire crown's recovery trigger. We check that crown's attackDamagePct buff fires
    // at least once per blanc burst cast (burst heal) and at least once per FB end (S2 heal).
    const crownRecoveryBuffs = buffs(recovery.events).filter(
      (b) =>
        b.casterIdx === CROWN_SLOT &&
        b.stat === 'attackDamagePct' &&
        b.value === 20.99,
    );

    it("crown's recovery trigger fires (blanc's heals are live, not inert)", () => {
      expect(crownRecoveryBuffs.length).toBeGreaterThan(0);
    });

    it("fires at least as many times as blanc's burst casts (burst heal drives it)", () => {
      const blancCasts = blancBursts(recovery.events).length;
      // Each burst cast fires a heal → at least one recovery event → crown buff
      expect(crownRecoveryBuffs.length).toBeGreaterThanOrEqual(blancCasts);
    });
  });

  describe('B1 — S1 shield fires every 120 normal attacks (not directly observable in event log)', () => {
    // Shield effects produce no event in the v1 log (no HP pool). The shield block is
    // FAITHFUL per the override; its observable is the `shielded` trigger on naga-type
    // consumers (tested in naga's own spec). Here we verify the block fires by checking
    // that blanc's shot count reaches 120+ (so the trigger condition is met).
    it('blanc fires enough shots to trigger the shield (120+ hits in 180s)', () => {
      const shots = base.events.filter(
        (e) => e.kind === 'shot' && e.slug === 'blanc',
      ).length;
      // 60-ammo AR at 720rpm = 12 rounds/sec; 180s → ~2160 rounds (well over 120)
      expect(shots).toBeGreaterThanOrEqual(120);
    });
  });
});

### Driver override (src/skills/overrides/blanc.json)
{
  "note": "PARSER BASELINE (HYPOTHESIS \u2014 NOT a validated model). Every \u2691 below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. --- Blanc (slug `blanc`): Wind AR DEFENDER (extract-confirmed; the wave prompt said Supporter \u2014 extract wins), Burst II, 60s burst CD. A defensive enabler whose ONLY direct offensive line vs a partless boss is her burst's boss debuff Damage Taken \u25b239.26% (10s) \u2192 `damageTakenPct` on `burstCast`. Her S2 burst-CDR is the kit's engine: FB-end w/ a squad ally alive \u2192 self Burst CD \u25bc40.76s, collapsing the 60s CD to ~19.2s residual = much higher debuff/heal uptime; the 'ally still on the battlefield' condition is ALWAYS true on the partless boss (nobody dies) \u2192 modeled unconditional (`burstCdr` 40.76 on fullBurstEnd). HP-SCALING DETERMINATION: NOT an HP-scaling kit \u2014 every Max-HP reference is a defensive/heal BASIS (S1 shield = 11.8% caster Max HP; S2/burst heals = 3.68%/3.84% caster Max HP per sec; burst Max HP \u25b231.68% is a survival buff on one ally), never an HP\u2192ATK conversion, so no atkOfMaxHpPct/casterMaxHpPct scaler is modeled (confirms the 2026-07-16 baseline determination). MERGE from overrides-baselines/blanc.json: kept its S2/burst heal-event blocks (hard rule 2 \u2014 they fire teammates' `recovery` triggers, Crown-type) + burstCdr + damageTakenPct verbatim in substance; UPGRADED its S1 from `ignored`-gap to a REAL block \u2014 the engine now has the `shield` effect (event-only, fires `shielded` triggers): hitCount 120 \u2192 allies \u2192 shield{maxHpPct:11.8, durationSec:5}, so shield-gated consumers (naga-type 'when a Shield is set') now wire correctly; dropped its `ignored` blocks per the current contract (validator-rejected) \u2014 skips live in `unmodeled`. SKIPS (burst line 2, target = 1 lowest-remaining-HP ally except self): 'Gain Indomitability for 10 sec.' \u2014 genuinely-skippable survival (revive/death-immunity class; boss lethality unmodeled); 'Max HP \u25b2 31.68% for 10 sec.' \u2014 UNREPRESENTABLE, not defensive-noise: the buff is the TARGET's own-% Max HP (no such StatKey; `casterMaxHpPct` has the WRONG basis = % of CASTER Max HP) on a target the engine cannot resolve (no remaining-HP tracking, no lowest-HP TargetDef) \u2014 encoding it wrong-basis on a nondeterministic target would be fudge>measured; it matters only if it lands on an HP-scaling teammate (atkOfMaxHpPct consumer) \u2192 guardrail caveat, revisit if such a comp is graded. \u2691 LIST: (1) CADENCE TUPLE (MANDATORY, datamine-unreliable) \u2014 pullsPerSec at the AR class default / reloadFrames 81 / rolling-reload; NOT escalated (60-ammo AR at class rate doesn't empty <1s; no revolver/per-N-round/charge flavor). Recipe: rounds/min + reload gap from any Blanc focus video. NOTE: the S1 shield cadence (every 120 hits) and thus `shielded`-consumer proc rate scales directly with this tuple. (2) HEAL TICK CADENCE (dominant \u2691 per the baseline MANIFEST; kit-silent consumer semantics) \u2014 the real heals tick EVERY 1s for 5s (S2) / 8s (burst), but the engine `heal` emits ONE recovery event per activation \u2192 on-recovery consumers (Crown) see 1 proc per FB cycle instead of 5\u20138 tick-refreshes, undercounting their buff uptime by up to ~4s (S2) / ~7s (burst) per cycle. Estimate shipped: 1 event/activation (inert in a team with no recovery-consumer). Recipe: in a consumer team (e.g. Crown), measure the consumer buff's real uptime across an FB cycle; if tick-refreshed, split each heal into per-second timed events (engine support needed) or approximate with extra heal blocks. Self-validated by INSPECTION against types.ts only (production staging rule \u2014 no writes to overrides/, no validate-overrides, no sim; the driver runs Step 5). Kit-autonomy gauntlet 2026-07-25.",
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Gain Indomitability for 10 sec."
    ]
  },
  "caveats": [
    "skill2/burst: heals now emit their real per-second ticks (heal ticks:5 for the 5s S2 HoT, ticks:8 for the 8s burst HoT) \u2014 on-recovery consumers (Crown-type) stay refreshed across each window (engine gap #1 fix, 2026-07-17)",
    "burst: Max HP \u25b231.68% on the lowest-remaining-HP ally is now modeled (theme-13, 2026-07-17) via the new targetMaxHpPct stat (own-% basis) + alliesLowestHp TargetDef (count 1, excludeSelf). Offensively INERT: it lands on a teammate (casterIdx\u2260self) so it does not feed their atkOfMaxHpPct conversion (e3 rule); and v1 has no HP pool so 'lowest remaining HP' resolves to the leftmost non-self ally as a deterministic stand-in. Kit-SSOT completeness only \u2014 no board damage moves.",
    "skill1: shield cadence (every 120 normal attacks) scales with the unverified datamine cadence tuple (\u2691)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "hitCount",
        "count": 120
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "shield",
          "maxHpPct": 11.8,
          "durationSec": 5
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 5,
          "intervalSec": 1
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
      "effects": [
        {
          "kind": "burstCdr",
          "seconds": 40.76
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
          "kind": "heal",
          "ticks": 8,
          "intervalSec": 1
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
          "kind": "buff",
          "stat": "damageTakenPct",
          "value": 39.26,
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
        "kind": "alliesLowestHp",
        "count": 1,
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "targetMaxHpPct",
          "value": 31.68,
          "durationSec": 10
        }
      ]
    }
  ]
}
