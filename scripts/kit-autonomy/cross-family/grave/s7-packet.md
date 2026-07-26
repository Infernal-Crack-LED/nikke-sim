# S7 JUDGE PACKET — `grave` (Grave) — compact, answer-faithful compilation of the gauntlet artifacts

> Model routing: S2b = claude-fable-5 (pre-op); S5/S6/S7 = claude-opus-5 (post-op). All blind roles cross-family.

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


## 1. Ground truth — kit prose (data/characters.json → characters.grave.skills, level-10 values)

skill1:
■ Activates when Prediction status ends. Affects self.
Removes 100% of ammo.
Heat Emission: Reload Ratio ▼ 50%. Removes Heat Emission under certain conditions.
■ Activates only when in Heat Emission status. Affects self.
Recovers 2% of the skill user's final Max HP every 1 sec continuously.
■ Activates only when in Heat Emission status. Affects all allies.
Burst Gauge filling speed ▲ 38.96% continuously.
Pierce Damage ▲ 48.4% continuously.

skill2:
■ Activates after landing 15 normal attacks. Affects self.
Overheat I: ATK ▲ 15.48%. Removed upon reloading to max ammunition.
■ Activates when landing a normal attack after Prediction takes effect. Affects self.
Effects vary according to the number of attacks landed. Each subsequent effect triggers all effects before it:
30 attacks landed: While in Prediction and Overheat I status,
Overheat II: ATK ▲ 20.66% continuously.
60 attacks landed: While in Prediction and Overheat II status,
Overheat III: Attack Damage ▲ 30.8% continuously.

burst:
■ Affects self.
Prediction:
Current HP ▼ 1% every 1 sec, lasts for 10 sec.
Grants unlimited ammunition for 10 sec.
Gain Pierce for 10 sec.
Pierce Damage ▲ 52.8% for 10 sec.
Critical Rate ▲ 85.19% for 10 sec.
■ Affects all allies.
Attack Damage ▲ 48.2% for 10 sec.
Pierce Damage ▲ 39.98% for 10 sec.
Max Ammunition Capacity ▲ 3 round(s) for 10 sec.

### Base stats / weapon datamine

{
 "weapon": "AR",
 "burst": "II",
 "class": "Supporter",
 "element": "Fire",
 "manufacturer": "Pilgrim",
 "burstCooldownSec": 20,
 "normalAttackMultiplier": 17.91,
 "coreAttackMultiplier": 200,
 "ammo": 60,
 "reloadFrames": 81,
 "chargeFrames": 0,
 "hitsPerShot": 1,
 "burstGaugePerShot": 0.45,
 "baseStats": {
  "hp": 15000,
  "atk": 500,
  "def": 100,
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
  "resourceId": 514
 }
}

## 2. Damage-formula + mechanics SSOT (summary; full text in docs/data/damage-calculation.md + docs/data/game-mechanics.md)

Multiplicative buckets: amount = baseAtk × (atkPct/100) × major × elem × charge × dmgUp × seqMult × projFactor × taken × distributed.
- ATK bucket (atkPct / casterAtkPct): multiplies the sheet ATK; boss DEF subtracted per hit first (baseAtk).
- Damage-Up bucket (attackDamagePct, pierceDamagePct, partsDamagePct, ...): ADDITIVE with each other, then ×(1+sum/100); only lands on damage of the matching tag (pierceDamagePct only on pierce-tagged attacks).
- major: +50% Full Burst major applies only to damage INSIDE the FB window; a burst CAST lands BEFORE the window opens (no major).
- elem: ×1.1 elemental major vs the weak element.
- crit/core: critRate/critDamage; critRate caps at 1.0. 'Critical Rate' (unscoped) = generic critRatePct; 'Critical Rate of normal attacks' = critRateNormalPct (normal bucket only).
- Pierce: a unit is pierce-tagged whole-fight via hasPierce:true OR for a window via a gainPierce{durationSec} effect; pierceDamagePct only feeds Damage-Up while pierce-tagged.
- unlimitedAmmo{durationSec}: no reloads in window. maxAmmoFlat N: +N rounds to magazine for the duration (flat, not %).
- Triggers: passive (setup), hitCount:N (after N landed hits), burstCast (the unit's OWN burst cast), fullBurstEnter/fullBurstEnd (any team FB). 'for N sec' = durationSec (wall-clock); 'for N round(s)' on a buff = durationShots; 'X round(s)' as a MAGNITUDE (max ammo) = flat value, not a duration.
- reloadFrames: wall-clock reload; effective = round(base×0.975)+13 at 0 reload-speed buff; reloadSpeedPct shortens it. A measured charFixes.reloadFrames overrides the datamined value.

## 3. Driver's override (src/skills/overrides/grave.json — the artifact under judgment; note documents the measurement + ⚑s)

```json
{
  "note": "Whole-kit Overheat model. S1: while in Heat Emission (her default, non-Prediction state, held most of the fight) she grants the team Burst Gauge filling speed +38.96% and Pierce Damage +48.4% (inert) continuously -> modeled as passive; slightly overcounts during the ~10s Prediction windows when Heat Emission is off. RELOAD (MEASURED 2026-07-15, grave solo.MP4, Shooting-Range = scope-lock per owner): her S1 'Heat Emission: Reload Ratio v50%' was PREVIOUSLY dropped as 'defensive, no damage' -- that was an ERROR (reload time gates shot count gates damage). Her real reload gap is 3.35s / 201 frames (last-shot-landing -> first-shot-landing, n=19 clean reloads, tight 2.85-3.52s; counter frame-diff method), vs the datamined 81f (~92f/1.53s effective) the sim used. Direct count: 20 reloads -> ~1230 shots (sim was 1620). Modeled via charFixes.reloadFrames=193 -> reloadFramesNeeded(193,0)=round(193*0.975)+13=201f, reproducing the measured gap AND composing correctly with any real reload-speed buff (unlike a fake reloadSpeedPct). She is always Heat-Emission-or-unlimited-ammo (Prediction burst = unlimited ammo, no reload), so this effective reload applies whenever she reloads at all. MECHANISM CAVEAT: attribution to 'Heat Emission v50%' is inferred, not isolated -- she only ever reloads in Heat Emission, so 'v50%+overhead' and 'datamined reloadFrames simply wrong' are observationally identical; the operative value (201f) is measured, the narrative is best-candidate. Refuted literal readings: reloadSpeedPct-50->131f (too fast); speed-halved->~184f (17f short); reload-AMOUNT-halved (partial mag) refuted by 61.5 shots/gap = full 60-round mags. Impact: solo 1.277->1.005 (shots 1620->1267 ~= measured 1230); comps 0.85/0.84/0.83 -> ~0.82 (small, since bursts use unlimited ammo) -- removes a compensating over-fire error, exposing the separate AR-carry burst-window residual (its own open item). DEFERRED (R2, follow-up): the same S1 clause's Prediction-END 'remove 100% of bullets' would force one extra ~201f reload per burst cycle in comps (~9-11 forced reloads/fight, small further reduction) -- not yet modeled; no longer 'defensive'. Heat-Emission self-heal still dropped (heal only, no damage). S2 Overheat ramp: Overheat I (+15.48% ATK after 15 normal hits, cleared on full reload) modeled as a hitCount-15 self buff, approximated as sustained (ignores the per-reload reset). Overheat II (+20.66% ATK) at 30 hits and Overheat III (+30.8% Attack Damage) at 60 hits only exist while in Prediction (her burst window), so both are tied to her burst cast for the 10s Prediction duration; the 30/60-hit build-up is approximated as full-window uptime (slight overcount early in the window). Burst slot omitted: parser output is faithful (unlimited ammo, self crit rate 85.19% + pierce, team Attack Damage 48.2% + pierce + max ammo); the HP-drain self-cost is skipped as defensive. [materialized 2026-07-16: burst auto-filled from the offline parser (blablalink prose) — behavior-identical to the prior runtime parse; NOT hand-verified] [kit-parse AUTHOR pass 2026-07-16: burst slot audited line-by-line vs the official prose — all modeled burst values are LITERAL kit text (unlimitedAmmo 10s; self pierceDamagePct 52.8 + critRatePct 85.19, 10s; allies attackDamagePct 48.2 + pierceDamagePct 39.98 + maxAmmoPct 3, 10s); ALL BLOCKS UNCHANGED from the live override (sim-identical; solo-validated 1.005 stands). unmodeled backfilled: skill1 Prediction-end 'Removes 100% of ammo' (deferred R2 — no engine effect can EMPTY a magazine; instantReload only ADDS, fraction 0 is a no-op; also no Prediction-end trigger exists — fullBurstEnd would over-fire on FBs she did not produce, prior 10), 'Removes Heat Emission under certain conditions' (condition unspecified in kit), Heat-Emission self-heal 2% Max HP/1s (SELF-target: the recovery event fires on the RECEIVER = grave, who has no on-recovery trigger, so unlike Helm->Crown it can never feed a teammate — hard-rule-2 reviewed, genuinely inert cross-unit; no periodic trigger kind exists to encode it anyway); skill2 Overheat I 'Removed upon reloading to max ammunition' (absorbed by the sustained hitCount-15 approximation, hand decision). ⚑ open: (1) burst 'Gain Pierce for 10 sec' — MODELED FAITHFULLY (engine `gainPierce` effect + `pierceUntilFrame` window, 2026-07-17): burst → self `gainPierce` durationSec 10, so during her 10s Prediction window her attacks are Pierce-tagged and her Pierce Damage ▲ Damage-Up lands (self pierceDamagePct 52.8 + team 39.98 = +92.78 Damage Up; S1's 48.4 is excludeSelf'd — see below — so it does NOT stack in, matching that Heat Emission is OFF during Prediction). Pierce Damage ▲ is a real Damage-Up-bucket entry that applies to any pierce-damage-type unit incl. on the partless boss (owner-confirmed 2026-07-17; only the separate pierce CORE+BODY DOUBLE-HIT is multipart-only, PIERCE_CORE_DOUBLE=false — do NOT conflate). KNOWN RESIDUAL (owner-directed 2026-07-17, faithful>fit): enabling the real pierce moves her three comps 0.836/0.831/0.800 COLD → ~1.178/1.171/1.219 HOT. This is DELIBERATE — the pierce is a real mechanic, so it is modeled; the remaining HOT is a SEPARATE, now-cleanly-isolated over-model in her burst window (the 'AR-carry burst-window residual' the missing pierce had been masking as net-COLD). Tracked as the live fix in open-questions U19 (candidates: Overheat II/III full-window uptime vs the real ~2.5s/5s ramp per ⚑3, and the unmodeled Prediction-end forced reload per ⚑2). We model the mechanic and fix the residual with a measurement, rather than leave pierce off (a fit-fudge) and a forgettable TODO. Solo 1.005 unaffected (a lone B2 never bursts → no pierce window). (2) S1 pierceDamagePct 48.4 uses `allies` excludeSelf: Heat Emission grants it to allies, but grave-self can never benefit (she has pierce only in Prediction, when Heat Emission is OFF), so excludeSelf gives her the faithful zero-from-48.4 AND prevents a burst-window double-count; allies still receive it (inert unless they are pierce-tagged). (2) Prediction-end forced reload ~9-11/fight in comps (needs an empty-magazine effect + a Prediction-end trigger). (3) Overheat II/III derived ramp haircut: 30/60 hits at the measured 12.0 rounds/s under unlimited ammo = ~2.5s/~5s ramp-in, so durationSec 7.5/5.0 would equal the real in-window uptime -- FINDING on the hand slot, not edited. Cadence tuple MEASURED (12.0 rounds/s steady + 201f effective reload, grave-solo-recon.json n=19) -- no cadence ⚑. HYPOTHESIS banner intentionally omitted: measured/hand-tuned unit (solo 1.005), authored burst values are literal kit text with zero invented numbers.] [Kit-autonomy gauntlet 2026-07-25: GO faithfulness 1.0, cross-family corroborated (claude-fable-5 S2b independently re-derived all 16 load-bearing lines and converged on every burst mechanic + exact magnitude — burstCast not fullBurstEnter, maxAmmoFlat 3 not maxAmmoPct, critRatePct 85.19 unscoped, attackDamagePct 48.2 not atkPct, both pierceDamagePct lines live only on pierce-tagged attackers, Reload Ratio is a damage line not defensive). Reviewer-flagged gaps were all already documented here (Heat Emission passive-vs-windowed timing = primitive-blocked no status-end trigger; removal condition unspecified; Overheat I removeOnReload absorbed), refuted by measurement (reload refill-fraction reading vs the observed full 60-round mags), or minority over-credit (Overheat II/III 'permanent once earned' vs the shipped 'While in Prediction' 10s gate, which the prose supports). No functional change; provenance stamp only. scripts/tests/units/grave.test.ts 23/23 green.]",
  "charFixes": {
    "reloadFrames": 193
  },
  "unmodeled": {
    "skill1": [
      "Activates when Prediction status ends. Affects self. Removes 100% of ammo.",
      "Removes Heat Emission under certain conditions.",
      "Activates only when in Heat Emission status. Affects self. Recovers 2% Max HP/1s continuously."
    ],
    "skill2": ["Removed upon reloading to max ammunition."],
    "burst": ["Prediction:", "Current HP ▼ 1% every 1 sec, lasts for 10 sec."]
  },
  "caveats": [
    "skill1: Heat Emission team buffs (Burst Gauge filling speed +38.96%, Pierce Damage +48.4%) modeled as always-on passive — real uptime excludes the ~10s Prediction windows after her burst",
    "skill1: Prediction-end 'Removes 100% of ammo' (one forced ~3.35s reload per burst cycle in comps) is not modeled — no engine effect can empty a magazine",
    "skill2: Overheat II/III 30/60-hit build-up approximated as full 10s burst-window uptime (real ramp-in ~2.5s/~5s at the measured 12 rounds/s)",
    "burst: 'Gain Pierce' (10s) is MODELED FAITHFULLY (gainPierce → self, 10s) — its Pierce Damage ▲ +92.78 Damage Up lands during her Prediction window (S1's 48.4 excludeSelf'd, no double-count). This moves her comps ~0.83→1.18 HOT ON PURPOSE (model the real mechanic > fit): the residual HOT is a SEPARATE burst-window over-model, now cleanly isolated and tracked in open-questions U19 (fix with a measurement). Solo unaffected (a lone Burst II never bursts).",
    "burst: team 'Max Ammunition Capacity ▲ 3 round(s)' modeled as maxAmmoFlat 3 to ALL allies, 10s (kit-literal flat rounds; enacted 2026-07-20 per the kit-audit ENACT-NOW item — the prior maxAmmoPct 3 percent proxy was near-inert, and the flat-rounds path was already live in maxAmmo(). Materially larger relative buff to small-mag SG/SR teammates in her 10s burst window than the +3% was — faithful>fit; A/B recorded in DECISIONS)"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "burstGenPct",
          "value": 38.96
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "passive"
      },
      "target": {
        "kind": "allies",
        "excludeSelf": true
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 48.4
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 15
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 15.48
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
          "value": 20.66,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 30.8,
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
          "kind": "unlimitedAmmo",
          "durationSec": 10
        },
        {
          "kind": "gainPierce",
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 52.8,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 85.19,
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 48.2,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 39.98,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "maxAmmoFlat",
          "value": 3,
          "durationSec": 10
        }
      ]
    }
  ]
}

```

## 4. S2b pre-op adversarial test-faithfulness review (claude-fable-5, CROSS-FAMILY) — reconciled

```json
{
  "slug": "grave",
  "stage": "S2c-reconciliation",
  "date": "2026-07-25",
  "reviewerModel": "claude-fable-5",
  "driverModel": "qwen",
  "reviewerVerdict": "independent re-derivation; 16 load-bearing lines spec'd",
  "convergence": [
    "burstCast trigger (her OWN B2 cast), NOT fullBurstEnter — reviewer + driver agree",
    "unlimitedAmmo / gainPierce / pierceDamagePct 52.8 / critRatePct 85.19 = self, 10s, keyed to the burst",
    "attackDamagePct 48.2 (NOT atkPct) to all allies INCLUDING self, 10s",
    "pierceDamagePct 39.98 to all allies, live ONLY on pierce-tagged attackers (inert on non-pierce teammates)",
    "critRatePct 85.19 is UNSCOPED (generic critRatePct, not critRateNormalPct)",
    "maxAmmoFlat 3 is kit-literal FLAT ROUNDS, durationSec 10 — NOT durationShots:3, NOT the old maxAmmoPct proxy",
    "Overheat III is attackDamagePct (Damage-Up bucket), NOT atkPct",
    "Reload Ratio ▼50% is a weapon-state DAMAGE line (gates shot count), NOT defensive QoL to be dropped",
    "self-heal (2% Max HP) and Prediction HP-drain are genuinely inert (self-target, no own recovery scaler) — safe UNMODELED",
    "gainPierce is what makes the Pierce Damage ▲ a real Damage-Up entry (windowed, not whole-fight hasPierce)"
  ],
  "divergences": [
    {
      "line": "skill1 Heat Emission TIMING (team 38.96/48.4 + reload + ammo-dump key to Prediction END = cast+10s)",
      "reviewerDisposition": "FIX (load-bearing); a fight-long passive over-credits the pre-first-burst ramp and the Prediction windows",
      "driverRuling": "KNOWN, OWNER-DOCUMENTED, DELIBERATE approximation. The override note states the team buffs are 'modeled as passive; slightly overcounts during the ~10s Prediction windows when Heat Emission is off.' The reviewer independently found the SAME gap the owner already ⚑'d — corroboration that the documentation is honest and complete. The faithful windowed model is BLOCKED by a missing engine primitive (no status-end / Prediction-end trigger; reviewer concurs: 'engine has no status-end trigger'). Per S4: a missing primitive on a bounded, documented, non-anchor line is a ⚑/residual, NOT NO-GO(engine-core). The solo anchor (1.005) is measured and unaffected. Test G1 pins the SHIPPED passive encoding (the encoding under test); the idealized-window refinement stays a documented ⚑.",
      "outcome": "no functional change; corroborated ⚑ (primitive-blocked, bounded, documented)"
    },
    {
      "line": "skill1 Reload Ratio ▼50% — reviewer's refill-fraction reading (reload refills only 50% of max, protecting Overheat I from removeOnReload)",
      "reviewerDisposition": "GAP / CALIBRATED; flags a refill-fraction primitive the schema lacks",
      "driverRuling": "REFUTED BY MEASUREMENT. The override note already adjudicated this exact reading: 'reload-AMOUNT-halved (partial mag) refuted by 61.5 shots/gap = full 60-round mags.' The owner measured full-magazine reloads (grave solo.MP4, n=19), so the operative model is the MEASURED slow reload charFixes.reloadFrames=193 (effective 201f), not a refill fraction. Test G3 pins the measured value + the behavioural direction (fewer shots than the datamined 81f). Reviewer's hypothesis is independently reasonable but empirically superseded.",
      "outcome": "no change; measured value stands, reviewer hypothesis refuted by full-mag observation"
    },
    {
      "line": "skill2 Overheat II/III duration — reviewer reads 'continuously' + no removal clause as PERMANENT once earned (survives Prediction end)",
      "reviewerDisposition": "FAITHFUL but 'permanently once earned'; nearest-wrong is 'dying with the 10s Prediction'",
      "driverRuling": "DRIVER/SHIPPED READING IS MORE FAITHFUL. The prose explicitly GATES both tiers: 'While in Prediction and Overheat I status, Overheat II ...' / 'While in Prediction and Overheat II status, Overheat III ...'. 'While in Prediction' is an active gate, not merely an acquisition condition — when Prediction ends the gate fails and the buff deactivates. The shipped burstCast + durationSec 10 (= the Prediction window) captures that deactivation; the reviewer's 'permanent once earned' would OVER-credit ATK/Attack-Damage outside the Prediction window. The 30/60-hit ramp-in is approximated as full-window uptime (documented slight early-window overcount). Test G5 pins the 10s window (first fires on the first burst frame, once per burst, expiresFrame-frame == 600).",
      "outcome": "no change; shipped 'While in Prediction' 10s gate is the faithful reading, reviewer permanent-reading over-credits"
    },
    {
      "line": "skill1 Heat Emission removal condition ('under certain conditions')",
      "reviewerDisposition": "MEASUREMENT-GATED, load-bearing (sets team-block uptime AND whether 48.4 ever stacks on grave's own Prediction)",
      "driverRuling": "HONEST ⚑, condition unspecified in kit → correctly UNMODELED (verbatim). The reviewer's ⚑ hypothesis (removed at next burst cast → 48.4 never buffs grave herself) is exactly the outcome the shipped override achieves via excludeSelf on the 48.4 (note: 'grave-self can never benefit ... excludeSelf gives her the faithful zero-from-48.4 AND prevents a burst-window double-count'). Test G2 pins that grave receives zero 48.4 buffs and that dropping excludeSelf lifts her in-window Damage-Up. Reviewer hypothesis corroborates the shipped excludeSelf encoding.",
      "outcome": "no change; removal-condition stays ⚑/unmodeled, excludeSelf encoding corroborated by reviewer hypothesis"
    },
    {
      "line": "skill2 Overheat I removeOnReload ('Removed upon reloading to max ammunition')",
      "reviewerDisposition": "FAITHFUL with removeOnReload:true (persists until a reload reaches max)",
      "driverRuling": "OWNER HAND-DECISION, documented: the override lists it verbatim in unmodeled.skill2 ('absorbed by the sustained hitCount-15 approximation, hand decision'). The sustained approximation (no expiry) is a deliberate simplification; the reviewer's refill-fraction protection argument is moot (refill reading refuted, see above). Test G4 pins the shipped sustained behaviour (expiresFrame null) + the structural hitCount-15 self block.",
      "outcome": "no change; documented hand approximation"
    }
  ],
  "realGotcha": false,
  "testDiscrimination": "all 7 driver groups (G1-G7) carry a GREEN-vs-shipped pin + a RED-vs-counterfactual discrimination; 6 hoisted counterfactual runs (noExcludeSelf, dataminedReload, noGainPierce, noUnlimitedAmmo, noBurstCrit) all separate cleanly from shipped (probe-verified: window dmgUp 2.72/3.00 -> 1.79/2.07 no-pierce; window shots 120 unlimited -> 80 non-unlimited; shots 1857 -> 1972 on datamined reload; grave 48.4 count 0 -> 1; window crit 1.0 -> 0.15/0.30)",
  "verdict": "GO (cross-family corroborated). Reviewer's independent re-derivation matches the shipped model on every load-bearing burst mechanic and exact magnitude; its flagged gaps are all already documented in the override (Heat Emission timing, reload primitive, removal condition, Overheat I removeOnReload), refuted by measurement (reload refill-fraction), or minority readings that over-credit (Overheat II/III permanent-vs-window). No REAL-GOTCHA. No functional override change required — the override is mature, measured (solo 1.005), and faithful; S3 stamps provenance only.",
  "residualsForManualReview": [
    "Heat Emission team buffs modeled as fight-long passive vs the idealized Prediction-end-windowed model (primitive-blocked: no status-end trigger; bounded, owner-documented, solo anchor unaffected)",
    "Prediction-end 'Removes 100% of ammo' forced reload (~9-11/fight in comps) unmodeled — needs an empty-magazine effect + a Prediction-end trigger (no engine primitive)",
    "Overheat II/III 30/60-hit ramp-in approximated as full 10s-window uptime (real ramp ~2.5s/~5s at 12 rounds/s)",
    "comps run ~1.18 HOT on purpose after enabling the real pierce — the residual is a SEPARATE, now-isolated burst-window over-model tracked in open-questions U19 (fix with a measurement), not a pierce error"
  ]
}

```

## 5. S5 blind post-op test-writer (claude-opus-5, CROSS-FAMILY) — run UNMODIFIED vs driver override

S5 blind test run UNMODIFIED vs the driver override: 24 failed / 5 passed / 5 skipped (34 total) => RED.
DIAGNOSIS — the RED is NOT a faithfulness defect in the driver override; it decomposes into:
(a) FIXTURE RECON_ERROR: the blind test used controlComp('grave', true) = liter/crown/grave/helm. crown is Burst II AND grave is Burst II; crown wins the B2 slot every chain, so grave casts 0 bursts (MEASURED: 0 bursts in this fixture vs 12 in the driver's liter/grave/ada/helm fixture). Every burst-gated assertion (unlimitedAmmo, gainPierce, the burst buffs, Overheat II/III) therefore sees 0 applications and vacuously fails.
(b) SCHEMA RECON_ERROR: the blind counterfactuals patch ov.skill1.blocks / ov.skill2.blocks / ov.burst.blocks, but the live override schema is a FLAT ARRAY of blocks (ov.skill1 IS the array; cf. the driver test and crown.test.ts using ov.skill1.filter / ov.burst.flatMap). Those .blocks accesses are undefined, so the counterfactual patches throw or no-op.
(c) TWO GENUINE ENCODING DIVERGENCES that would persist in ANY working fixture, both DOCUMENTED owner decisions where the driver is the more-faithful or a deliberate approximation:
   1. Reload Ratio ▼50%: blind encodes reloadSpeedPct -50 (literal). Driver encodes the MEASURED charFixes.reloadFrames 193 (effective 201f, from grave solo.MP4 n=19). The override note explicitly REFUTES the literal reading: reloadSpeedPct-50 -> 131f is too fast vs the measured 201f. Driver = measured > literal.
   2. Overheat I 'Removed upon reloading to max ammunition': blind encodes removeOnReload:true (literal). Driver models Overheat I as a SUSTAINED hitCount-15 buff and lists the removal VERBATIM in unmodeled.skill2 as a documented hand approximation ('absorbed by the sustained hitCount-15 approximation, hand decision'). Small effect; documented; owner may enact removeOnReload later.
CONVERGENCE (blind spec + its it.skip gaps independently match the driver): burstCast-not-fullBurstEnter; unlimitedAmmo 10s; gainPierce timed EFFECT not hasPierce flag; critRatePct 85.19 UNSCOPED not critRateNormalPct; pierceDamagePct 52.8 self; attackDamagePct 48.2 all-allies-INCL-self not atkPct; maxAmmoFlat 3 not maxAmmoPct; pierceDamagePct 39.98 allies; burstGenPct 38.96 all allies; pierceDamagePct 48.4 all allies; Overheat I hitCount15 atkPct15.48; Overheat II atkPct20.66; Overheat III attackDamagePct30.8 NOT atkPct; Overheat self-only; inertness (no core/crit-damage/charge/fire-rate buffs). Blind it.skip gaps == driver ⚑s: Prediction-end trigger (no primitive), Heat-Emission removal condition (unstated), self-status gate (no primitive -> passive approx), HP-drain (no HP pool).

### S5 blind test source (scripts/kit-autonomy/blind/grave.test.ts)

```ts
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * grave — Grave (AR / Fire / Supporter / Burst II), blind kit spec test.
 *
 * KIT (structural read, quoted minimally):
 *  skill1 [Activates when Prediction status ends. Affects self.]
 *    - "Removes 100% of ammo"            -> consumeAmmo fraction 1
 *    - Heat Emission: "Reload Ratio \u25bc 50%" -> reloadSpeedPct -50 (weapon-state = damage:
 *      slower reload => fewer shots fired). Removed "under certain conditions" (unstated).
 *  skill1 [only in Heat Emission. Affects self.]  -> heal, 2%/1s continuously
 *  skill1 [only in Heat Emission. Affects all allies.]
 *    - Burst Gauge filling speed \u25b2 38.96%  -> burstGenPct 38.96 (allies)
 *    - Pierce Damage \u25b2 48.4%              -> pierceDamagePct 48.4 (allies)
 *  skill2 [after landing 15 normal attacks. self]
 *    - Overheat I: ATK \u25b2 15.48%, "Removed upon reloading to max ammunition"
 *      -> hitCount:15 + buff atkPct 15.48 removeOnReload:true, NO durationSec
 *  skill2 [landing a normal attack after Prediction takes effect. self] escalating tiers
 *    - 30 landed: Overheat II ATK \u25b2 20.66% continuously  -> atkPct
 *    - 60 landed: Overheat III "Attack Damage \u25b2 30.8%"    -> attackDamagePct (Damage-Up bucket,
 *      a DIFFERENT bucket from atkPct — the nearest-wrong model conflates the two)
 *  burst [self] Prediction, 10 s:
 *    - Current HP \u25bc 1%/s  (defensive, no HP pool in v1 -> unmodeled)
 *    - unlimited ammunition 10 s   -> unlimitedAmmo durationSec 10
 *    - Gain Pierce 10 s            -> gainPierce durationSec 10 (EFFECT, not hasPierce flag)
 *    - Pierce Damage \u25b2 52.8% 10 s -> pierceDamagePct (self)
 *    - Critical Rate \u25b2 85.19% 10 s -> critRatePct (UNSCOPED: the kit says plain
 *      "Critical Rate", not "Critical Rate of normal attacks" -> NOT critRateNormalPct)
 *  burst [all allies] 10 s:
 *    - Attack Damage \u25b2 48.2%    -> attackDamagePct
 *    - Pierce Damage \u25b2 39.98%   -> pierceDamagePct
 *    - Max Ammunition \u25b2 3 round(s) -> maxAmmoFlat 3 (FLAT rounds; maxAmmoPct is the
 *      nearest-wrong encoding and would scale magazines instead of adding 3)
 *
 * FIXTURE: controlComp('grave', true) — liter B1 / crown B2 / grave B3-slot carry / helm.
 * grave is Burst II; the control comp supplies the other tiers so a Full Burst chain actually
 * completes and her burst casts (a lone unit makes ZERO Full Bursts). helm=true throughout
 * except where helm's own crit line could confound a crit-scope reading; helm carries
 * critRateNormalPct, so the crit-SCOPE test reads grave's OWN buffApply events by
 * targetSlug+stat rather than by team totals, which is immune to helm.
 *
 * WHY THE ASSERTIONS DISCRIMINATE: every damage-moving line is paired with a
 * withPatchedOverride counterfactual encoding the NEAREST-WRONG reading (wrong bucket, wrong
 * duration semantics, wrong trigger, wrong target set, wrong sign), and asserted to move the
 * number. Inertness assertions pin what each line must NOT touch.
 */

type Ev = SimEvent & Record<string, any>;

function run(opts: Parameters<typeof runComp>[0]) {
  const events: Ev[] = [];
  const res = runComp({ ...opts, onEvent: (ev: SimEvent) => events.push(ev as Ev) } as any);
  return { res, events };
}

const buffs = (events: Ev[], stat: string) => events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
const onGrave = (events: Ev[], stat: string) =>
  buffs(events, stat).filter((e) => e.targetSlug === 'grave');

// ---------------------------------------------------------------- hoisted runs
const base = run(controlComp('grave', true));
const baseTotals = totals(base.res);
const graveTotal = baseTotals['grave'];

describe('grave — baseline sanity', () => {
  it('the fixture actually fires grave and completes Full Bursts (non-vacuity)', () => {
    expect(graveTotal).toBeGreaterThan(0);
    expect(base.events.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    expect(base.events.some((e) => e.kind === 'burstCast')).toBe(true);
    expect(base.events.filter((e) => e.kind === 'shot').length).toBeGreaterThan(0);
  });

  it('grave is present as a damage dealer, not a pure inert support', () => {
    const row = unitOf(base.res, 'grave');
    expect(row.totalDamage).toBeGreaterThan(0);
  });
});

// ============================================================ BURST — self lines
describe('grave burst / Prediction (self, 10 s)', () => {
  it('grants unlimited ammunition for 10 s — removing it costs damage', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks = ov.burst!.blocks.map((b: any) => ({
        ...b,
        effects: b.effects.filter((e: any) => e.kind !== 'unlimitedAmmo'),
      }));
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    // Unlimited ammo removes reload downtime inside her window => strictly more shots.
    expect(totals(res)['grave']).toBeLessThan(graveTotal);
  });

  it('unlimited ammo is 10 s, not the whole fight (duration semantics)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'unlimitedAmmo') e.durationSec = 180;
        }),
      );
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    // nearest-wrong: a whole-fight unlimited-ammo window. Must be strictly stronger.
    expect(totals(res)['grave']).toBeGreaterThan(graveTotal);
  });

  it('"Gain Pierce for 10 sec" is a timed gainPierce EFFECT, not the static hasPierce flag', () => {
    // Structural: the committed override must NOT tag grave as whole-fight Pierce, because the
    // kit scopes Pierce to the 10 s Prediction window only.
    const patchedFlag = withPatchedOverride('grave', (ov) => {
      (ov as any).hasPierce = true;
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patchedFlag } });
    // Nearest-wrong (whole-fight pierce) lets her 48.4% + 52.8% + 39.98% Pierce Damage buffs feed
    // EVERY shot, not just the burst window => strictly more damage. If this is equal, the
    // committed file already has hasPierce:true, i.e. the timed scope was lost.
    expect(totals(res)['grave']).toBeGreaterThan(graveTotal);
  });

  it('gainPierce carries a 10 s duration (not continuous)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'gainPierce') delete e.durationSec;
        }),
      );
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    // nearest-wrong: durationSec absent => permanent pierce.
    expect(totals(res)['grave']).toBeGreaterThan(graveTotal);
  });

  it('self Critical Rate 85.19% is UNSCOPED critRatePct, not critRateNormalPct', () => {
    const applied = onGrave(base.events, 'critRatePct');
    expect(applied.some((e) => Math.abs(e.value - 85.19) < 1e-6)).toBe(true);
    // nearest-wrong: the normal-attack-scoped stat. The kit line has no "of normal attacks"
    // qualifier, so a scoped encoding under-credits her burst/skill hits.
    const scoped = onGrave(base.events, 'critRateNormalPct');
    expect(scoped.some((e) => Math.abs(e.value - 85.19) < 1e-6)).toBe(false);
  });

  it('self crit buff is 10 s and self-targeted only (target set)', () => {
    const applied = buffs(base.events, 'critRatePct').filter(
      (e) => Math.abs(e.value - 85.19) < 1e-6,
    );
    expect(applied.length).toBeGreaterThan(0);
    for (const e of applied) expect(e.targetSlug).toBe('grave');
    // 10 s window at 60 fps = 600 frames from application.
    for (const e of applied) {
      expect(e.expiresFrame).toBeGreaterThan(0);
      expect(e.durationShots).toBeUndefined();
    }
  });

  it('self Pierce Damage 52.8% lands on grave only', () => {
    const applied = buffs(base.events, 'pierceDamagePct').filter(
      (e) => Math.abs(e.value - 52.8) < 1e-6,
    );
    expect(applied.length).toBeGreaterThan(0);
    for (const e of applied) expect(e.targetSlug).toBe('grave');
  });
});

// ============================================================ BURST — ally lines
describe('grave burst — all-allies lines (10 s)', () => {
  it('Attack Damage 48.2% reaches every ally, in the Damage-Up bucket', () => {
    const applied = buffs(base.events, 'attackDamagePct').filter(
      (e) => Math.abs(e.value - 48.2) < 1e-6,
    );
    expect(applied.length).toBeGreaterThan(0);
    const hit = new Set(applied.map((e) => e.targetSlug));
    // "Affects all allies" INCLUDES self — no excludeSelf.
    expect(hit.has('grave')).toBe(true);
    expect(hit.size).toBeGreaterThan(1);
  });

  it('Attack Damage 48.2% is attackDamagePct, not atkPct (bucket discrimination)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'buff' && e.stat === 'attackDamagePct' && Math.abs(e.value - 48.2) < 1e-6) {
            e.stat = 'atkPct';
          }
        }),
      );
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    // ATK is multiplicative with the sheet; Damage-Up is additive with other supports.
    // The two buckets cannot coincide across a full comp of differently-buffed units.
    expect(totals(res)['grave']).not.toBe(graveTotal);
  });

  it('Max Ammunition +3 is maxAmmoFlat (rounds), not maxAmmoPct', () => {
    const applied = buffs(base.events, 'maxAmmoFlat').filter((e) => Math.abs(e.value - 3) < 1e-6);
    expect(applied.length).toBeGreaterThan(0);
    for (const e of applied) expect(e.targetSlug).toBeTruthy();
    // nearest-wrong: reading "3 round(s)" as 3 PERCENT.
    const pct = buffs(base.events, 'maxAmmoPct').filter((e) => Math.abs(e.value - 3) < 1e-6);
    expect(pct.length).toBe(0);
  });

  it('Max Ammunition +3 actually moves shot economy (non-vacuity)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks.forEach((b: any) => {
        b.effects = b.effects.filter(
          (e: any) => !(e.kind === 'buff' && e.stat === 'maxAmmoFlat'),
        );
      });
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    const t = totals(res);
    // +3 rounds raises magazine size for the whole team for 10 s -> at least one ally must move.
    const moved = Object.keys(baseTotals).some((s) => t[s] !== baseTotals[s]);
    expect(moved).toBe(true);
  });

  it('ally Pierce Damage 39.98% is distinct from the self 52.8% line', () => {
    const ally = buffs(base.events, 'pierceDamagePct').filter(
      (e) => Math.abs(e.value - 39.98) < 1e-6,
    );
    expect(ally.length).toBeGreaterThan(0);
    expect(new Set(ally.map((e) => e.targetSlug)).size).toBeGreaterThan(1);
  });
});

// ============================================================ SKILL 1
describe('grave skill1 — Heat Emission', () => {
  it('"Reload Ratio 50% DOWN" is a NEGATIVE reloadSpeedPct (a penalty, not a buff)', () => {
    const applied = onGrave(base.events, 'reloadSpeedPct');
    expect(applied.length).toBeGreaterThan(0);
    for (const e of applied) expect(e.value).toBeLessThan(0);
    expect(applied.some((e) => Math.abs(e.value + 50) < 1e-6)).toBe(true);
  });

  it('the reload penalty costs damage — sign-flipping it (nearest-wrong) gains damage', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill1!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'buff' && e.stat === 'reloadSpeedPct') e.value = Math.abs(e.value);
        }),
      );
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    // Reload speed gates shots fired -> it IS damage (never "defensive, skip").
    expect(totals(res)['grave']).toBeGreaterThan(graveTotal);
  });

  it('Burst Gauge filling speed 38.96% is burstGenPct on ALL allies (incl. self)', () => {
    const applied = buffs(base.events, 'burstGenPct').filter(
      (e) => Math.abs(e.value - 38.96) < 1e-6,
    );
    expect(applied.length).toBeGreaterThan(0);
    const hit = new Set(applied.map((e) => e.targetSlug));
    expect(hit.has('grave')).toBe(true);
    expect(hit.size).toBeGreaterThan(1);
  });

  it('the gauge buff changes rotation cadence, not just a stat row (non-vacuity)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill1!.blocks.forEach((b: any) => {
        b.effects = b.effects.filter(
          (e: any) => !(e.kind === 'buff' && e.stat === 'burstGenPct'),
        );
      });
    });
    const { events } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    const fbBase = base.events.filter((e) => e.kind === 'fullBurstStart').length;
    const fbNo = events.filter((e) => e.kind === 'fullBurstStart').length;
    // +38.96% gauge for the whole team must not be Full-Burst-count-neutral over 180 s.
    expect(fbNo).toBeLessThanOrEqual(fbBase);
    expect(fbBase).toBeGreaterThan(0);
  });

  it('Pierce Damage 48.4% is an ALL-ALLIES continuous line (not self-only)', () => {
    const applied = buffs(base.events, 'pierceDamagePct').filter(
      (e) => Math.abs(e.value - 48.4) < 1e-6,
    );
    expect(applied.length).toBeGreaterThan(0);
    expect(new Set(applied.map((e) => e.targetSlug)).size).toBeGreaterThan(1);
  });

  it('the Heat-Emission heal emits recovery events (tandem / cross-unit channel)', () => {
    // "Recovers 2% of Max HP every 1 sec continuously" is offensively inert alone, but it is the
    // driver for any teammate "when recovery takes effect" trigger — it must NOT be dropped.
    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill1!.blocks.forEach((b: any) => {
        b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      });
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    const t = totals(res);
    // crown (B2 in controlComp) consumes recovery; removing grave's heal must move SOMETHING,
    // proving the heal is wired rather than decorative.
    const moved = Object.keys(baseTotals).some((s) => t[s] !== baseTotals[s]);
    expect(moved).toBe(true);
  });
});

// ============================================================ SKILL 2 — Overheat
describe('grave skill2 — Overheat I/II/III', () => {
  it('Overheat I ATK 15.48% fires on a hit COUNT of 15, not on a timer', () => {
    const applied = onGrave(base.events, 'atkPct').filter((e) => Math.abs(e.value - 15.48) < 1e-6);
    expect(applied.length).toBeGreaterThan(0);
    const first = applied[0];
    // A hitCount:15 trigger cannot land at t=0; an interval/passive mis-encoding would.
    expect(first.frame ?? (first as any).f ?? 1).toBeGreaterThan(0);
  });

  it('Overheat I is removeOnReload, NOT a wall-clock buff (duration semantics)', () => {
    // The engine emits buffRemove ONLY for removeOnReload buffs at reload-to-max.
    const removes = base.events.filter(
      (e) => e.kind === 'buffRemove' && e.targetSlug === 'grave',
    );
    expect(removes.length).toBeGreaterThan(0);
    expect(removes.some((e) => (e as any).cause === 'reload')).toBe(true);

    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill2!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'buff' && Math.abs(e.value - 15.48) < 1e-6) {
            delete e.removeOnReload;
            e.durationSec = 999;
          }
        }),
      );
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    // nearest-wrong: a permanent buff never stripped by reloads => strictly more damage.
    expect(totals(res)['grave']).toBeGreaterThan(graveTotal);
  });

  it('Overheat II ATK 20.66% is atkPct (ATK line)', () => {
    const applied = onGrave(base.events, 'atkPct').filter((e) => Math.abs(e.value - 20.66) < 1e-6);
    expect(applied.length).toBeGreaterThan(0);
  });

  it('Overheat III 30.8% is attackDamagePct (Damage-Up), NOT atkPct — bucket discrimination', () => {
    const asDamageUp = onGrave(base.events, 'attackDamagePct').filter(
      (e) => Math.abs(e.value - 30.8) < 1e-6,
    );
    expect(asDamageUp.length).toBeGreaterThan(0);
    const asAtk = onGrave(base.events, 'atkPct').filter((e) => Math.abs(e.value - 30.8) < 1e-6);
    expect(asAtk.length).toBe(0);

    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill2!.blocks.forEach((b: any) => {
        const walk = (effs: any[]) =>
          effs.forEach((e: any) => {
            if (e.kind === 'escalating') walk(e.steps);
            if (e.kind === 'buff' && e.stat === 'attackDamagePct' && Math.abs(e.value - 30.8) < 1e-6) {
              e.stat = 'atkPct';
            }
          });
        walk(b.effects);
      });
    });
    const { res } = run({ ...controlComp('grave', true), overrides: { grave: patched } });
    // "Attack Damage" is the additive Damage-Up bucket (diluted by liter/crown/helm buffs);
    // atkPct multiplies the sheet. With other supports present these cannot be equal.
    expect(totals(res)['grave']).not.toBe(graveTotal);
  });

  it('Overheat II/III are gated behind Prediction — they are NOT live from t=0 (non-vacuity, both cases)', () => {
    const oh2 = onGrave(base.events, 'atkPct').filter((e) => Math.abs(e.value - 20.66) < 1e-6);
    const oh3 = onGrave(base.events, 'attackDamagePct').filter(
      (e) => Math.abs(e.value - 30.8) < 1e-6,
    );
    // ACTIVE case exercised...
    expect(oh2.length).toBeGreaterThan(0);
    expect(oh3.length).toBeGreaterThan(0);
    // ...and the INACTIVE case: the first Overheat III application must come strictly after the
    // first Overheat II application (60 attacks > 30 attacks), never simultaneously at t=0.
    const f2 = (oh2[0] as any).frame ?? 0;
    const f3 = (oh3[0] as any).frame ?? 0;
    expect(f3).toBeGreaterThanOrEqual(f2);
    expect(f2).toBeGreaterThan(0);
  });

  it('Overheat tiers are SELF-only (target set) — no ally receives them', () => {
    const vals = [15.48, 20.66, 30.8];
    const leaked = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== 'grave' &&
        e.targetSlug != null &&
        vals.some((v) => Math.abs((e as any).value - v) < 1e-6),
    );
    expect(leaked).toEqual([]);
  });
});

// ============================================================ INERTNESS
describe('grave — inertness', () => {
  it('grave carries no core/crit-damage/charge buffs the kit never grants', () => {
    for (const stat of ['coreDamagePct', 'critDamagePct', 'chargeDamagePct', 'chargeSpeedPct']) {
      expect(onGrave(base.events, stat)).toEqual([]);
    }
  });

  it('grave inflicts no boss debuff (no Damage Taken line in the kit)', () => {
    const bossDebuffs = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as any).casterIdx === null &&
        (e as any).targetIdx === null &&
        (e as any).stat === 'damageTakenPct',
    );
    expect(bossDebuffs).toEqual([]);
  });

  it('grave grants no fireRate / attackSpeed / chargeSpeed the kit never mentions', () => {
    for (const stat of ['fireRatePct', 'attackSpeedPct']) {
      expect(buffs(base.events, stat).filter((e) => e.targetSlug === 'grave')).toEqual([]);
    }
  });
});

// ============================================================ GAPS
describe('grave — modeling gaps', () => {
  it.skip('skill1 fires on "Prediction status ends" (+10 s after her own burst cast) — no such trigger primitive exists; the nearest expressible key (burstCast) fires 10 s EARLY, so the ammo dump + Heat Emission onset are mistimed', () => {});

  it.skip('"Removes Heat Emission under certain conditions" — the conditions are unstated in the kit prose, so Heat Emission uptime is unbounded in any faithful reading (UNMODELED / measurement-gated)', () => {});

  it.skip('Heat-Emission-gated blocks need a SELF-status gate; the schema has requiresTargetStatus (boss-only) and no self-status equivalent, so the gauge/pierce/heal lines can only be approximated as passives (over-credits early fight)', () => {});

  it.skip('burst "Current HP DOWN 1% every 1 sec" — v1 has no HP pool (immortal boss, nobody takes damage), so self-drain is unobservable', () => {});

  it.skip('skill2 counts "attacks LANDED", but hitCount counts rounds fired-and-hit; with no miss model the two coincide here, and the 30/60 thresholds are additionally gated on Prediction being active — the Prediction gate itself is not expressible', () => {});
});

```

## 6. S6 blind post-op override-writer (claude-opus-5, CROSS-FAMILY) — independent rebuild + diff vs driver

S6 blind override (independent rebuild) vs driver override — encoding decisions:
CONVERGED (identical intent): burst trigger burstCast; self unlimitedAmmo 10s; self gainPierce durationSec 10 (blind: 'timed, so NOT the whole-fight hasPierce'); hasPierce false; self pierceDamagePct 52.8 10s; self critRatePct 85.19 10s UNSCOPED; allies attackDamagePct 48.2 10s (incl self); allies pierceDamagePct 39.98 10s; allies maxAmmoFlat 3 10s (blind: 'FLAT rounds, not maxAmmoPct'); Overheat I hitCount15 atkPct15.48 self; Overheat II hitCount30 atkPct20.66 self; Overheat III hitCount60 attackDamagePct30.8 self (Damage-Up not atkPct); HP-drain SKIPPED (no HP pool); 'Affects all allies' includes self.
DIVERGED (all on documented-approximation lines; driver position measured or soundly-reasoned):
  - Heat Emission trigger/timing: blind = fullBurstEnd + ownBurstGate:'cast' (synthesizes Prediction-end = cast+10s) with a DERIVED ally window durationSec 2.7; driver = passive (always-on), documented over-credit during Prediction windows. Both acknowledge the missing status-end primitive; the driver note explains fullBurstEnd would over-fire on FBs she did not produce.
  - Reload Ratio ▼50%: blind = reloadSpeedPct -50 + removeOnReload (literal, datamined reloadFrames 81, flagged 'known-unreliable datamine'); driver = MEASURED charFixes.reloadFrames 193 (201f). Driver measured-superior.
  - Overheat I/II/III removeOnReload: blind = removeOnReload:true on all tiers (literal + tier dependency); driver = Overheat I sustained (documented), Overheat II/III burstCast 10s window ('While in Prediction' gate).
  - 'Removes 100% of ammo': blind = consumeAmmo fraction 1 (implements the dump); driver = UNMODELED (note: no engine effect can EMPTY a magazine; instantReload only ADDS). This is the Prediction-end forced-reload residual (⚑, ~9-11/fight in comps, small, tracked).
  - self-heal 2%/1s: blind = heal ticks:3 intervalSec:1 (emits recovery events); driver = UNMODELED (self-target; grave has no on-recovery trigger and a self-heal cannot feed a teammate's recovery consumer — genuinely inert cross-unit).

### S6 blind override (scripts/kit-autonomy/blind/grave.override.json)

```json
{
  "slug": "grave",
  "hasPierce": false,
  "skill1": [
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "ownBurstGate": "cast",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "consumeAmmo",
          "fraction": 1
        },
        {
          "kind": "buff",
          "stat": "reloadSpeedPct",
          "value": -50,
          "removeOnReload": true
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "ownBurstGate": "cast",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "heal",
          "ticks": 3,
          "intervalSec": 1
        }
      ]
    },
    {
      "slot": "skill1",
      "trigger": {
        "kind": "fullBurstEnd"
      },
      "ownBurstGate": "cast",
      "target": {
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "burstGenPct",
          "value": 38.96,
          "durationSec": 2.7
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 48.4,
          "durationSec": 2.7
        }
      ]
    }
  ],
  "skill2": [
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 15
      },
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 15.48,
          "removeOnReload": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 30
      },
      "fbGate": "inFb",
      "ownBurstGate": "cast",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "atkPct",
          "value": 20.66,
          "removeOnReload": true
        }
      ]
    },
    {
      "slot": "skill2",
      "trigger": {
        "kind": "hitCount",
        "count": 60
      },
      "fbGate": "inFb",
      "ownBurstGate": "cast",
      "target": {
        "kind": "self"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 30.8,
          "removeOnReload": true
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
          "kind": "unlimitedAmmo",
          "durationSec": 10
        },
        {
          "kind": "gainPierce",
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 52.8,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "critRatePct",
          "value": 85.19,
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
        "kind": "allies"
      },
      "effects": [
        {
          "kind": "buff",
          "stat": "attackDamagePct",
          "value": 48.2,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "pierceDamagePct",
          "value": 39.98,
          "durationSec": 10
        },
        {
          "kind": "buff",
          "stat": "maxAmmoFlat",
          "value": 3,
          "durationSec": 10
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [],
    "skill2": [],
    "burst": [
      "Current HP ▼ 1% every 1 sec, lasts for 10 sec."
    ]
  },
  "caveats": [
    "⚑ S1 trigger 'Activates when Prediction status ends' has no engine primitive. Prediction is a 10s self status opened by her OWN burst cast; the team Full Burst window is also 10s and opens moments after that cast, so Prediction end ≈ Full Burst end. Modeled as fullBurstEnd + ownBurstGate:'cast' (so it never fires on rotations where another Burst II casts). Real Prediction end is slightly EARLIER than FB end (by the cast→FB-open gap) — pin from footage.",
    "⚑ 'Removes Heat Emission under certain conditions' is deliberately vague in the prose. HYPOTHESIS: the condition is reloading to max ammunition — S1 dumps 100% of ammo at Prediction end, forcing an immediate (half-speed) reload, and the sibling Overheat I line uses that exact removal wording. Self-side modeled with removeOnReload:true; ally-side cannot use removeOnReload (it would strip on each ALLY's own reload, not on Grave's), so the ally buffs carry a ⚑ durationSec instead.",
    "⚑ Heat Emission window length = Grave's slowed reload. Derived, not measured: reloadFrames 81 (1.35s) ÷ 0.5 reload ratio ≈ 2.7s. Both the ally burstGen/pierce buffs (durationSec 2.7) and the 2%/sec self heal (ticks 3) ride this derivation.",
    "⚑ Overheat II/III are counted 'after Prediction takes effect' — a burst-scoped attack counter the engine does not have. hitCount is cumulative from battle start, so counts 30/60 are a PROXY; the fbGate:'inFb' + ownBurstGate:'cast' pair restricts application to her own Prediction window but the exact in-window arrival frame will not match the real 30th/60th landed attack.",
    "⚑ Overheat chain dependency ('While in Prediction and Overheat I/II status') is modeled implicitly: all three Overheat buffs carry removeOnReload:true, and the S1 forced reload at Prediction end strips the whole chain together. The engine does not enforce II-requires-I; if a future change lets II/III apply without I the model over-credits.",
    "⚑ Cadence tuple (AR pulls/sec, reloadFrames 81) is datamine-sourced and unreliable; it drives BOTH the hit-threshold arrival times (15/30/60) and the Heat Emission window length, so two ⚑ estimates share one unverified input.",
    "hasPierce is deliberately FALSE: Pierce is a 10s burst-window grant, encoded as a gainPierce effect. A whole-fight boolean would over-credit both her own 52.8% and the team's 39.98%/48.4% Pierce Damage buffs.",
    "'Current HP ▼ 1% every 1 sec' is skipped, not ignored: v1 models no HP pool and the boss deals no damage, so self-drain has no offensive or survival consequence. It is NOT a heal/shield/DEF tandem line."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Blind second read of the kit prose only (S6 cross-family). Structure: burst opens Prediction (10s unlimited ammo + Pierce + self Pierce Dmg/Crit Rate) plus a 10s team Attack Damage / Pierce Damage / +3 Max Ammo aura. S2 is a three-tier Overheat ramp (15 landed attacks → ATK 15.48%; 30 in-Prediction → ATK 20.66%; 60 in-Prediction → Attack Damage 30.8%), all removed on reload-to-max. S1 fires at Prediction end: it dumps the whole magazine and halves reload ratio (a WEAPON-STATE damage line — it costs real shots, do not skip it), and during the resulting Heat Emission window grants the team Burst Gauge speed 38.96% + Pierce Damage 48.4% and self-heals 2% Max HP/sec. The Prediction-end trigger, the Heat Emission removal condition, and its window length are all proxies — see caveats.",
  "unmodeledNote": null
}
```

## 7. Driver's tests (scripts/tests/units/grave.test.ts — 23 tests, ALL GREEN vs shipped override; 6 counterfactual runs discriminate)

```ts
// PER-UNIT KIT SPEC — `grave` (Grave, Supporter/AR/Fire, Burst II, cd 20s, ammo 60,
// Pilgrim OVERSPEC). kit-autonomy gauntlet S2a (driver tests), 2026-07-25.
//
// One assertion group per KIT LINE (G1..G7 below), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest
// wrong model each assertion must discriminate against) — never to supply the encoding under
// test. grave is a MATURE, MEASURED override (solo anchor 1.005, reload measured from
// grave solo.MP4 n=19); every kit line is FAITHFUL or documented-UNMODELED, so every
// behavioural assertion here is a GREEN pin vs shipped + a RED discrimination vs the
// nearest-wrong counterfactual. There is no FIX/MISSING line.
//
// Kit (blablalink prose, data/characters.json → characters.grave.skills):
//   S1 (Heat Emission, her default non-Prediction state, held most of the fight)
//      ■ passive → all allies: Burst Gauge filling speed ▲38.96% continuously.            [G1]
//      ■ passive → all allies (excludeSelf): Pierce Damage ▲48.4% continuously.           [G2]
//      ■ Heat Emission: Reload Ratio ▼50%  →  charFixes.reloadFrames 193 (MEASURED).       [G3]
//      (Prediction-end 'Removes 100% of ammo', 'Removes Heat Emission under certain
//       conditions', and the 2% Max HP/1s self-heal → UNMODELED: missing engine primitive
//       / unspecified condition / genuinely inert self-heal — documented in override.)
//   S2 (Overheat)
//      ■ hitCount 15 → self: Overheat I ATK ▲15.48% (sustained approximation).            [G4]
//      (Overheat I 'Removed upon reloading to max ammunition' → UNMODELED, absorbed by the
//       sustained approximation.)
//      ■ burstCast → self (Prediction window): Overheat II ATK ▲20.66% (10s) +
//        Overheat III Attack Damage ▲30.8% (10s). 30/60-hit ramp approximated as full
//        window uptime (documented slight early-window overcount).                        [G5]
//   BU (Plot Spoiler → Prediction)
//      ■ burstCast → self: unlimited ammunition (10s) + Gain Pierce (10s) +
//        Pierce Damage ▲52.8% (10s) + Critical Rate ▲85.19% (10s).                        [G6]
//      ■ burstCast → all allies: Attack Damage ▲48.2% (10s) + Pierce Damage ▲39.98% (10s)
//        + Max Ammunition Capacity ▲3 round(s) (10s, kit-literal flat rounds).            [G7]
//      (Prediction 'Current HP ▼1%/1s for 10s' → UNMODELED, defensive self-cost.)
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model
// gates nothing):
//   G1  passive/permanent (applied at frame 0, no expiry, one application per ally) vs a
//       burst-triggered or timed buff. Reaches all four allies INCLUDING herself.
//   G2  the excludeSelf is the whole point: grave-self can never benefit from Pierce Damage
//       (she is pierce-tagged only in Prediction, when Heat Emission is OFF), so the shipped
//       48.4 must NOT land on her. Counterfactual drops excludeSelf → she receives 48.4 AND
//       her in-window Damage-Up rises (a burst-window double-count the shipped model avoids).
//   G3  the MEASURED slow reload (charFixes.reloadFrames 193 → effective 201f) gates shot
//       count gates damage. Counterfactual restores the datamined 81f → strictly MORE shots.
//   G4  hitCount-triggered: first fires at ~15 hits (frame >0, well before her first burst at
//       ~210f), self-scoped, sustained (no expiry) — neither a frame-0 passive nor a burstCast.
//   G5  burstCast-triggered: first fires exactly on her first burst frame, once per burst,
//       self-scoped, 10s — tied to the Prediction window, not to hit count or setup.
//   G6  four self buffs keyed to the burst. unlimitedAmmo keeps every in-window shot unlimited
//       (remove it → she burns the 60-round mag and reloads mid-window). gainPierce is what
//       makes her Pierce Damage ▲ Damage-Up LAND (remove it → in-window dmgUp collapses). The
//       85.19 crit caps her in-window crit rate at 1.0 (remove it → 0.15/0.30).
//   G7  three ally buffs, all four allies, 10s, once per burst. maxAmmoFlat 3 is the
//       kit-literal FLAT rounds (enacted 2026-07-20), not the old near-inert maxAmmoPct proxy.
//
// Fixture: liter (B1) / grave (B2) / ada (B3) / helm (B3), boss Fire, focus ada — grave needs
// a real B1→B2→B3 rotation to cast her burst at all (a lone B2 makes zero Full Bursts). She
// casts 12 bursts over the 180s fight. Deterministic (no seed). Slot order: liter 0 / grave 1
// / ada 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

const FPS = 60;
const WINDOW_FRAMES = 10 * FPS; // every grave burst buff is "for 10 sec"
/** Fixture slot order: liter 0 / grave 1 / ada 2 / helm 3. */
const GRAVE = 1;
const ALL_ALLIES = [0, 1, 2, 3];

const graveComp = (): CompOptions => ({
  slugs: ['liter', 'grave', 'ada', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'ada',
});

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({ ...graveComp(), overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events, t: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const graveBuffs = (evs: SimEvent[]) => buffs(evs).filter((b) => b.casterIdx === GRAVE);
const graveShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.unitIdx === GRAVE);
const graveBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.unitIdx === GRAVE);
const graveDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.unitIdx === GRAVE);
const firstBurstFrame = (evs: SimEvent[]) => graveBursts(evs)[0]?.frame ?? NaN;

/** grave's normal-attack Damage-Up bucket values inside her first burst (Prediction) window. */
function windowDmgUp(evs: SimEvent[]): number[] {
  const bf = firstBurstFrame(evs);
  const win = graveDamage(evs).filter(
    (d) => d.bucket === 'normal' && d.frame >= bf && d.frame <= bf + WINDOW_FRAMES,
  );
  return [...new Set(win.map((d) => +d.mult.dmgUp.toFixed(4)))].sort((a, b) => a - b);
}
/** grave's normal-attack resolved crit rate inside her first burst window. */
function windowCritRate(evs: SimEvent[]): number[] {
  const bf = firstBurstFrame(evs);
  const win = graveDamage(evs).filter(
    (d) => d.bucket === 'normal' && d.frame >= bf && d.frame <= bf + WINDOW_FRAMES,
  );
  return [...new Set(win.map((d) => +d.critRate.toFixed(4)))].sort((a, b) => a - b);
}
/** grave's shots inside her first burst window. */
function windowShots(evs: SimEvent[]): Shot[] {
  const bf = firstBurstFrame(evs);
  return graveShots(evs).filter((s) => s.frame >= bf && s.frame <= bf + WINDOW_FRAMES);
}

// ---- counterfactual patches (nearest-wrong model each group must discriminate against) --------
/** G2: drop excludeSelf so grave-self also receives Heat Emission's Pierce Damage 48.4. */
const graveNoExcludeSelf = withPatchedOverride('grave', (ov) => {
  let touched = false;
  for (const b of ov.skill1) if (b.target?.excludeSelf) { delete b.target.excludeSelf; touched = true; }
  if (!touched) throw new Error('grave S1 excludeSelf block missing — fixture is stale');
});
/** G3: restore the datamined 81f reload the MEASURED 193f replaced. */
const graveDataminedReload = withPatchedOverride('grave', (ov) => {
  if (ov.charFixes?.reloadFrames !== 193) throw new Error('grave charFixes.reloadFrames!=193 — fixture is stale');
  ov.charFixes.reloadFrames = 81;
});
/** G6: strip gainPierce from the burst — her Pierce Damage ▲ Damage-Up can no longer land. */
const graveNoGainPierce = withPatchedOverride('grave', (ov) => {
  let n = 0;
  for (const b of ov.burst) { const before = b.effects.length; b.effects = b.effects.filter((e: any) => e.kind !== 'gainPierce'); n += before - b.effects.length; }
  if (!n) throw new Error('grave burst gainPierce missing — fixture is stale');
});
/** G6: strip unlimitedAmmo — she burns the 60-round mag and must reload mid-window. */
const graveNoUnlimitedAmmo = withPatchedOverride('grave', (ov) => {
  let n = 0;
  for (const b of ov.burst) { const before = b.effects.length; b.effects = b.effects.filter((e: any) => e.kind !== 'unlimitedAmmo'); n += before - b.effects.length; }
  if (!n) throw new Error('grave burst unlimitedAmmo missing — fixture is stale');
});
/** G6: strip the self Critical Rate ▲85.19 burst buff. */
const graveNoBurstCrit = withPatchedOverride('grave', (ov) => {
  let n = 0;
  for (const b of ov.burst) { const before = b.effects.length; b.effects = b.effects.filter((e: any) => !(e.kind === 'buff' && e.stat === 'critRatePct')); n += before - b.effects.length; }
  if (!n) throw new Error('grave burst critRatePct missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noExcludeSelf = run({ grave: graveNoExcludeSelf });
const dataminedReload = run({ grave: graveDataminedReload });
const noGainPierce = run({ grave: graveNoGainPierce });
const noUnlimitedAmmo = run({ grave: graveNoUnlimitedAmmo });
const noBurstCrit = run({ grave: graveNoBurstCrit });

const N_BURSTS = graveBursts(base.events).length;

describe('grave — kit spec', () => {
  it('fixture sanity: grave casts a real rotation of bursts', () => {
    expect(N_BURSTS, 'grave must burst repeatedly for the burst-gated lines to be observable').toBeGreaterThanOrEqual(8);
  });

  describe('G1 — S1 Heat Emission: team Burst Gauge filling speed ▲38.96% (passive, all allies)', () => {
    const applied = graveBuffs(base.events).filter((b) => b.stat === 'burstGenPct');

    it('is 38.96%, reaches all four allies including herself, applied at setup', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([38.96]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(ALL_ALLIES);
      for (const b of applied) expect(b.frame, 'a passive applies at setup, not mid-fight').toBe(0);
    });

    it('is permanent (no wall-clock expiry, no round budget) — a sustained state, not a timed buff', () => {
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([null]);
    });
  });

  describe('G2 — S1 Heat Emission: team Pierce Damage ▲48.4% (passive, allies EXCLUDESELF)', () => {
    const applied = graveBuffs(base.events).filter(
      (b) => b.stat === 'pierceDamagePct' && Math.abs(b.value - 48.4) < 0.01,
    );

    it('reaches the three allies but NOT grave herself (excludeSelf)', () => {
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([0, 2, 3]);
      expect(applied.filter((b) => b.targetIdx === GRAVE)).toEqual([]);
    });

    it('DISCRIMINATING: dropping excludeSelf puts 48.4 on grave AND lifts her in-window Damage-Up', () => {
      const cfApplied = graveBuffs(noExcludeSelf.events).filter(
        (b) => b.stat === 'pierceDamagePct' && Math.abs(b.value - 48.4) < 0.01 && b.targetIdx === GRAVE,
      );
      expect(cfApplied.length, 'the counterfactual must land 48.4 on grave').toBeGreaterThan(0);
      // The shipped in-window Damage-Up is strictly LOWER — the 48.4 would double-count in the
      // Prediction window (she is pierce-tagged there), which excludeSelf correctly prevents.
      expect(Math.max(...windowDmgUp(base.events))).toBeLessThan(
        Math.min(...windowDmgUp(noExcludeSelf.events)),
      );
    });
  });

  describe('G3 — S1 Heat Emission: Reload Ratio ▼50% → charFixes.reloadFrames 193 (MEASURED)', () => {
    it('is encoded as the measured charFixes.reloadFrames 193 (effective 201f), not a reloadSpeedPct fudge', () => {
      const ov = withPatchedOverride('grave', () => {});
      expect((ov as any).charFixes?.reloadFrames).toBe(193);
    });

    it('DISCRIMINATING: the measured slow reload gates shot count — datamined 81f fires strictly more', () => {
      const shippedShots = graveShots(base.events).length;
      const dataminedShots = graveShots(dataminedReload.events).length;
      expect(
        shippedShots,
        `${shippedShots} shipped shots vs ${dataminedShots} on the datamined 81f reload — the ` +
          'measured 193f must reduce shot count (reload time gates shots gate damage)',
      ).toBeLessThan(dataminedShots);
    });
  });

  describe('G4 — S2 Overheat I: ATK ▲15.48% after 15 normal hits (self, sustained)', () => {
    const applied = graveBuffs(base.events).filter(
      (b) => b.stat === 'atkPct' && Math.abs(b.value - 15.48) < 0.01,
    );

    it('is 15.48%, self-scoped, sustained (no expiry)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([GRAVE]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('is hitCount-triggered: first fires after setup and well before her first burst', () => {
      const first = Math.min(...applied.map((b) => b.frame));
      expect(first, 'a hitCount buff cannot apply at frame 0 (that would be a passive)').toBeGreaterThan(0);
      expect(first, 'Overheat I builds from normal hits, so it precedes the first burst cast').toBeLessThan(
        firstBurstFrame(base.events),
      );
    });

    it('is encoded as a hitCount-15 self block (structural pin)', () => {
      const ov = withPatchedOverride('grave', () => {}) as any;
      const block = ov.skill2.find((b: any) => b.trigger?.kind === 'hitCount');
      expect(block?.trigger?.count).toBe(15);
      expect(block?.target?.kind).toBe('self');
      expect(block.effects.some((e: any) => e.stat === 'atkPct' && Math.abs(e.value - 15.48) < 0.01)).toBe(true);
    });
  });

  describe('G5 — S2 Overheat II/III: ATK ▲20.66% + Attack Damage ▲30.8% on burstCast (self, 10s)', () => {
    const atk = graveBuffs(base.events).filter((b) => b.stat === 'atkPct' && Math.abs(b.value - 20.66) < 0.01);
    const atkDmg = graveBuffs(base.events).filter((b) => b.stat === 'attackDamagePct' && Math.abs(b.value - 30.8) < 0.01);

    it('both fire, self-scoped, for exactly 10s', () => {
      for (const applied of [atk, atkDmg]) {
        expect(applied.length).toBeGreaterThan(0);
        expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([GRAVE]);
        for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
      }
    });

    it('is burstCast-triggered: first fires on the first burst frame, once per burst', () => {
      expect(Math.min(...atk.map((b) => b.frame))).toBe(firstBurstFrame(base.events));
      expect(atk.length, 'Overheat II refreshes once per burst cast').toBe(N_BURSTS);
      expect(atkDmg.length, 'Overheat III refreshes once per burst cast').toBe(N_BURSTS);
    });
  });

  describe('G6 — Burst (self, Prediction window): unlimitedAmmo + Gain Pierce + Pierce Dmg 52.8 + Crit 85.19, 10s', () => {
    it('unlimitedAmmo: every in-window shot is unlimited (remove it → she reloads mid-window)', () => {
      const shipped = windowShots(base.events);
      expect(shipped.length, 'she should fire the whole 10s window without reloading').toBeGreaterThanOrEqual(100);
      expect([...new Set(shipped.map((s) => s.unlimitedAmmo))]).toEqual([true]);

      const cf = windowShots(noUnlimitedAmmo.events);
      expect(
        cf.length < shipped.length || cf.some((s) => !s.unlimitedAmmo),
        'without unlimitedAmmo she burns the 60-round mag and cannot sustain the full window',
      ).toBe(true);
    });

    it('Gain Pierce: her Pierce Damage ▲ Damage-Up LANDS in-window (remove gainPierce → dmgUp collapses)', () => {
      const shipped = windowDmgUp(base.events);
      const cf = windowDmgUp(noGainPierce.events);
      expect(
        Math.min(...shipped),
        `shipped in-window dmgUp ${shipped} vs no-pierce ${cf} — Gain Pierce is what makes the ` +
          'Pierce Damage ▲ a real Damage-Up entry',
      ).toBeGreaterThan(Math.max(...cf));
    });

    it('Pierce Damage ▲52.8% (self) and Critical Rate ▲85.19% (self) apply once per burst for 10s', () => {
      const pierce = graveBuffs(base.events).filter((b) => b.stat === 'pierceDamagePct' && Math.abs(b.value - 52.8) < 0.01);
      const crit = graveBuffs(base.events).filter((b) => b.stat === 'critRatePct' && Math.abs(b.value - 85.19) < 0.01);
      for (const applied of [pierce, crit]) {
        expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([GRAVE]);
        expect(applied.length).toBe(N_BURSTS);
        for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
      }
    });

    it('DISCRIMINATING: the 85.19 crit caps her in-window crit rate at 1.0 (remove it → 0.15/0.30)', () => {
      expect(windowCritRate(base.events)).toEqual([1]);
      expect(Math.max(...windowCritRate(noBurstCrit.events))).toBeLessThan(1);
    });
  });

  describe('G7 — Burst (all allies): Attack Dmg 48.2 + Pierce Dmg 39.98 + Max Ammo +3 rounds, 10s', () => {
    const specs: Array<[string, number]> = [
      ['attackDamagePct', 48.2],
      ['pierceDamagePct', 39.98],
      ['maxAmmoFlat', 3],
    ];

    it.each(specs)('%s %i reaches all four allies for 10s, once per burst', (stat, value) => {
      const applied = graveBuffs(base.events).filter(
        (b) => b.stat === stat && Math.abs(b.value - value) < 0.01,
      );
      expect(applied.length, `${stat} ${value} must be applied`).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual(ALL_ALLIES);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(WINDOW_FRAMES);
      // Once per burst per ally → N_BURSTS applications per target.
      expect(applied.length).toBe(N_BURSTS * ALL_ALLIES.length);
    });

    it('max ammo is the kit-literal FLAT rounds (maxAmmoFlat 3), not the old maxAmmoPct proxy', () => {
      const ov = withPatchedOverride('grave', () => {}) as any;
      const eff = ov.burst.flatMap((b: any) => b.effects);
      expect(eff.some((e: any) => e.stat === 'maxAmmoFlat' && e.value === 3)).toBe(true);
      expect(eff.some((e: any) => e.stat === 'maxAmmoPct')).toBe(false);
    });
  });

  describe('unmodeled lines (structural pins — documented, inert or missing-primitive)', () => {
    const ov = withPatchedOverride('grave', () => {}) as any;

    it('skill1: Prediction-end ammo removal, Heat-Emission removal, and self-heal are documented verbatim', () => {
      const u: string[] = ov.unmodeled?.skill1 ?? [];
      expect(u.length).toBe(3);
      const joined = u.join(' ');
      expect(joined).toContain('Removes 100% of ammo');
      expect(joined).toContain('Removes Heat Emission under certain conditions');
      expect(joined).toContain('Recovers 2%');
    });

    it('skill2: Overheat I "removed upon reloading to max ammunition" is documented (absorbed by sustained approx)', () => {
      const u: string[] = ov.unmodeled?.skill2 ?? [];
      expect(u.join(' ')).toContain('Removed upon reloading to max ammunition');
    });

    it('burst: Prediction HP-drain self-cost is documented (defensive)', () => {
      const u: string[] = ov.unmodeled?.burst ?? [];
      expect(u.join(' ')).toContain('Current HP ▼ 1% every 1 sec');
    });
  });
});

```

## 8. S2c reconciliation (driver)

S2c reconciliation (driver): the fable S2b review independently re-derived all 16 load-bearing lines and converged on every burst mechanic + exact magnitude. Its flagged gaps were all already documented in the override (Heat Emission passive-vs-windowed timing = primitive-blocked; removal condition unspecified; Overheat I removeOnReload absorbed), refuted by measurement (reload refill-fraction reading vs the observed full 60-round mags, 61.5 shots/gap), or minority over-credit (Overheat II/III 'permanent once earned' vs the shipped 'While in Prediction' 10s gate, which the prose supports). realGotcha=false. No functional override change; provenance stamp only.

## 9. Board reading (non-gating context)

S8 board-read (grave): rank 29 | 3 comps | ratio 1.104 HOT ▲ (range 1.09-1.11) | error 0.104 | tolerance ±15% | spread ±1.1%.
This HOT is the DOCUMENTED burst-window residual tracked in open-questions U19: enabling the real (faithful) pierce moves her comps HOT on purpose (model the real mechanic > fit); the remaining HOT is a SEPARATE, now-cleanly-isolated over-model in her burst window (candidates: Overheat II/III full-window uptime vs the real ~2.5s/5s ramp; the unmodeled Prediction-end forced reload). It is NOT a faithfulness error in the encoding — the pierce is a real mechanic and is modeled faithfully. The gauntlet makes NO functional change, so the board reading is unchanged (before == after == 1.104 HOT). Solo anchor 1.005 (measured) is unaffected (a lone B2 never bursts).

## 10. Verdict instructions

Grade per §0. Classify every kit line FAITHFUL / DOCUMENTED_GAP / REAL-GOTCHA / RECON_ERROR. The S5 RED must be attributed: is it RECON_ERROR (fixture burst-starvation + schema .blocks mismatch + the two documented encoding divergences where the driver is measured/sound) or a REAL-GOTCHA in the driver override? Weigh whether the driver's documented approximations (Heat Emission passive timing; Overheat I sustained; Overheat II/III full-window uptime; Prediction-end forced reload unmodeled) are honest DOCUMENTED_GAPs bounded away from the solo anchor, or faithfulness defects. Return ONLY the JSON specified in §0.
