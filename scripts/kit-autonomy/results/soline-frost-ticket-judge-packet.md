# S7 JUDGE PACKET — `soline-frost-ticket` (compact, answer-faithful compilation of the gauntlet artifacts)
Unit: Soline: Frost Ticket (slug `soline-frost-ticket`) — SG / Water / Supporter / Burst I, cd 40s. Driver model family: Qwen.
Cross-family reviewers: S2b claude-fable-5 (pre-op), S5/S6/S7 claude-opus-4-8 (post-op). Gauntlet date 2026-07-24.

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

## 1. Ground truth — kit prose (data/characters.json → characters['soline-frost-ticket'].skills, structural; levels 10/10/10)
Base: SG/Water/Supporter/Burst I, cd 40s, ammo 9, reloadFrames 111, chargeFrames 0, chargeMultiplier 0, hitsPerShot 10,
normalAttackMultiplier 201.5, coreAttackMultiplier 200, burstGaugePerShot 2. baseStats hp 15000 / atk 500 / def 96,
critRate 15 / critDamage 150. Manufacturer Elysion. The normalized `skills` prose below is the SSOT the sim reads.

skill1:
■ Activates at the start of battle and when using Burst Skill. Affects all allies.
Issues 1 ticket, up to a maximum of 2. This effect is continuous.
Ticket effect: Max HP ▲ number of tickets * 10% of the skill user's Max HP.
■ Activates when entering Full Burst. Affects all allies.
Cooldown of Burst Skill ▼ 7.48 sec.
■ Activates when entering Full Burst. Affects all allies.
Removes First Train Discount.

skill2:
■ Activates when the HP of anyone in the squad is lower than 15%. Affects the target if the target has any tickets.
Recovers 12.27% of the skill user's final Max HP as HP.
Ticket count ▼ 1.
■ Activates at the start of battle. Affects all allies.
First Train Discount for 6 sec.
Function: The effects of I'll Help You Board the Train! will not consume tickets.

burst:
■ Affects all allies.
Recovers 32.26% of the skill user's final Max HP as HP.

NOTE: This is a ZERO direct-damage kit — no %ATK damage / DoT / rider anywhere. Her only damage is base SG spray under
the engine's per-unit SG landing model. The ticket is a stack/currency the engine has no primitive for.

## 2. Damage-formula + mechanics SSOT (the facts the verdict turns on)
Damage = ATK × major (FB +50% by timing; ×1.10 element if advantaged; +30% range) × charge × damageUp-bucket ×
taken × distributed. Soline is Water vs the Fire boss in the fixture (Water is weak to Fire — but she has ZERO
kit damage lines, so the element major is irrelevant to every kit-line assertion; her only damage is base SG spray).

**This is a ZERO direct-damage kit.** Nowhere in the prose does Soline deal %ATK damage / DoT / a rider. Every kit
line is a buff (Max HP), a cooldown-reduction, or a heal. Therefore EVERY load-bearing assertion is EVENT-LOG based
(buffApply / burstCast / fullBurstStart / recovery), never damage-total based. The three engine facts below are what
the verdict turns on.

**FACT 1 — casterMaxHpPct resolves to FLAT Max HP and is damage-INERT on allies (sim.ts:1772-1779).** A
`casterMaxHpPct` buff ("% of the SKILL USER's Max HP") is converted at apply time to flat Max HP
(`(e.value/100) × owner.maxHp`) and stored under statKey `maxHpFlat`; the buffApply event therefore carries
`stat:'maxHpFlat'` (NOT 'casterMaxHpPct') and its KEY carries the effect value (`<slot>:skill1:maxHpFlat:20`).
Ally-granted Max HP does NOT feed any damage consumer: `atkOfMaxHpPct` counts a unit's OWN Max HP only (the e3 rule
— effectiveAtk feeds it only when casterIdx === self). So a casterMaxHpPct grant to ALLIES moves ZERO damage in v1
— it is kept for kit completeness / a future consumer (hard rule 3: don't destroy a future scaler), and is observed
purely via the buffApply event. The prose says "10% of the SKILL USER's Max HP" → casterMaxHpPct family (caster-HP-
scaled, identical flat HP to every ally), NOT targetMaxHpPct ("% of each target's OWN HP").

**FACT 2 — `heal` emits a RECOVERY event, not a number (sim.ts:1950-1955).** A `heal` effect has NO modeled HP
amount; it fires a RECOVERY event to its targets, triggering their `recovery`-keyed blocks. The observable is a
recovery CONSUMER: Crown's "when recovery takes effect → team Attack Damage ▲20.99% for 7s" block (crown.json
skill2, trigger `recovery`) fires whenever Crown RECEIVES a heal. So Soline's burst heal (all allies) is observed
by Crown's attackDamagePct 20.99 buffApply firing on the heal's frame. With Crown's own Relax self-heal removed and
a heal-free B3 (ada), Soline's burst heal is the ONLY recovery source, so Crown's 20.99 fires precisely on Soline's
burstCast frames.

**FACT 3 — `burstCdr` mutates cooldowns directly with NO event (sim.ts:2047-2055).** A `burstCdr` effect subtracts
`seconds × FPS` from each target's `burstCdFrames`; it emits NO buffApply. Its ONLY observable is the team burst
cadence: with the block, the team completes more Full Bursts over 180s than without it (measured: 6 with vs 5 without
— the 7.48s off the 40s CDs pulls one extra chain inside the fight).

**TRIGGER IDENTITY (B1): fullBurstEnter vs burstCast.** "when entering Full Burst" = `fullBurstEnter` (ANY team
Full Burst); "when using Burst Skill" = `burstCast` (Soline's OWN cast). Soline is Burst I: in the fixture (sole B1,
focused) her burstCast frame strictly precedes each fullBurstStart frame (measured ~82-frame gap), so the burst heal
(burstCast) is frame-discriminable from a fullBurstEnter misread. RESIDUAL LIMIT: for the burstCdr line, fullBurstEnter
vs burstCast is NOT behaviorally discriminable for a B1 whose own cast opens every chain (both fire the same number of
times, ~82 frames apart → near-identical cadence effect); the faithful reading is fullBurstEnter (prose: "when
entering Full Burst"), corroborated by fable S2b. The burstCdr presence/firing IS discriminable (base FB count >
burstCdr-removed FB count).

**TICKET ECONOMY (no engine primitive).** The ticket is a stack/currency (issue 1 at battle start, +1 per her Burst
cast, cap 2; consumed only by the skill2 HP<15% heal). The engine has NO stack/currency primitive with a cap-2 +
consume-on-S2. The faithful AVAILABLE encoding of the Max-HP grant is the steady-state flat passive `casterMaxHpPct
20` (2 tickets × 10%): she reaches 2 tickets at her first burst and never consumes (the S2 heal cannot fire under
scope-lock — no incoming boss damage), so the pool sits at cap ~97% of the fight. The ramp (10% at frame 0 → 20%
after first burst) is a documented ⚑; because the grant is damage-inert (FACT 1), the ramp moves zero damage anyway.

**No battleStart trigger; passive-trigger buffs ignore durationSec (always-on permanent).** No HP-threshold
TriggerDef exists, and the sim models NO incoming boss damage, so the skill2 "HP < 15%" trigger is STRUCTURALLY
UNREACHABLE in v1 (not measurement-gated) — encoding the emergency heal to any available trigger would FABRICATE
recovery events (measured > fudge). Gates available: fbGate, swapGate, requiresTargetStatus (enemy only), requiresCore,
everyN, hitCount, resourceGate, formation/teamHas. There is NO battleStart trigger, NO HP-threshold trigger, and NO
ticket/stack-currency primitive in v1.

## 3. Driver's override (src/skills/overrides/soline-frost-ticket.json — the encoding under test)
```json
{
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Remove this banner only when the unit has been measured/hand-tuned. || soline-frost-ticket (Soline: Frost Ticket) — Burst-I Water Supporter SG healer/enabler with ZERO direct-damage kit lines (no %ATK damage / DoT / rider anywhere in the kit). Her only damage is base SG spray (normalMult 201.5 / coreMult 200 / hitsPerShot 10 / ammo 9 / reloadFrames 111) under the engine's per-unit SG landing model (class SG_LANDING_BY_BAND table is the shipped default until her landing is measured — ⚑2). MODELED: (S1 blk1) ticket Max-HP grant — 'Issues 1 ticket, up to a maximum of 2 … Ticket effect: Max HP ▲ tickets×10% of the skill user's Max HP', continuous, to ALL allies → passive `casterMaxHpPct 20` = derived steady-state (prior 4 derivable-currency: starts at 1 ticket [10%] at battle start, +1 per HER burst cast → cap 2 after her first burst [B1 opener → within rotation 1]; the only consume is the S2 HP<15% emergency heal, which never fires under scope-lock [no incoming boss damage], so the pool sits at cap for ~97% of the fight — ramp haircut negligible, ⚑3). KEPT per hard rule 3 even though ally-granted Max HP is currently inert for HP-scaling consumers (atkOfMaxHpPct counts a unit's OWN Max HP only, prior 6) — deleting it would destroy a future consumer/scaler; NOT an HP-scaling kit herself (no atkOfMaxHpPct line). (S1 blk2) 'Activates when entering Full Burst … Cooldown of Burst Skill ▼ 7.48 sec' to all allies → `burstCdr seconds 7.48` on `fullBurstEnter` (trigger read literally per prior 10 — team-FB entry, regardless of who bursted). A real rotation lever the engine supports (40s burst CD → ~32.5s effective team cadence). (BURST) 'Recovers 32.26% of the skill user's final Max HP as HP' to all allies → `heal` event on `burstCast`/allies (hard rule 2 / prior 8): fires every rotation she bursts (B1 opener) and drives any teammate 'when recovery takes effect' consumer (Crown-style); HP amount is event-only by engine design. SKIPPED → `unmodeled` (verbatim; reasons here): (S1 blk3) 'Removes First Train Discount' — pure ticket-economy bookkeeping (toggles whether the S2 emergency heal consumes a ticket); no damage, no stat, no modeled consumer; inert under scope-lock because the consuming heal never fires anyway. (S2 blk1, whole block) squad-HP<15% emergency heal (12.27% caster Max HP, ticket ▼1) — a HEAL (hard-rule-2 class) parked in unmodeled DELIBERATELY: the schema has no HP-threshold TriggerDef and the sim models no incoming boss damage, so the trigger condition never exists in-sim; wiring it to any available trigger would FABRICATE recovery events (measured > fudge). The hard-rule-2 intent (recovery synergy works when a consumer is present) is served by the BURST heal, which fires reliably every rotation. (S2 blk2) 'First Train Discount for 6 sec' + Function text — the same ticket-consumption bookkeeping, gating a heal that never fires; no damage path. ⚑ FLAGS (all UNMEASURED): (⚑1) CADENCE TUPLE (mandatory): pullsPerSec (SG class rate) + reloadFrames 111 + rolling/partial-reload behavior — shipped datamine as-is (no charFixes); mag-empty sanity: 9 rounds at ~1 pull/s ≈ 9s, no fire-mode-flavor tell → no escalation; recipe = read rounds/min + the reload gap from any focus video. (⚑2) SG per-unit pellet landing — class SG_LANDING_BY_BAND is the shipped default (SG landing is per-unit; her own landing unmeasured); recipe = focused solo, per-magazine damage-counter deltas by range band. (⚑3) ticket steady-state = 2 (casterMaxHpPct 20) — DERIVED trajectory, not cap-tier guess; caveat: in a team that never Full Bursts she never casts Burst and stays at 1 ticket (10%); recipe = confirm 2 tickets held in a real fight (no HP<15% consumes expected under scope-lock). No noFb/noRange decisions (no rider damage exists); not a charge weapon (no autofire ⚑). BURST-ELIGIBILITY note: as a lone/enabler-less unit she makes ZERO full bursts — then S1 blk2 (burstCdr), the burst heal, and the 2nd ticket all never happen; solo damage is unchanged (no FB-gated damage lines).",
  "unmodeled": {
    "skill1": [
      "Removes First Train Discount."
    ],
    "skill2": [
      "■ Activates when the HP of anyone in the squad is lower than 15%. Affects the target if the target has any tickets.",
      "Recovers 12.27% of the skill user's final Max HP as HP.",
      "Ticket count ▼ 1.",
      "■ Activates at the start of battle. Affects all allies.",
      "First Train Discount for 6 sec.",
      "Function: The effects of I'll Help You Board the Train! will not consume tickets."
    ],
    "burst": []
  },
  "caveats": [
    "skill1: ticket Max-HP grant modeled at steady-state cap (2 tickets = 20% of caster Max HP, all allies); she starts at 1 ticket (10%) and reaches 2 only after her first Burst — in a team that never Full Bursts it stays 10% (⚑)",
    "skill1: cadence tuple (SG rate of fire, reloadFrames 111) is the unverified datamine — read rounds/min + the reload gap from a focus video (⚑)",
    "skill1: her only damage is base SG spray — per-unit SG pellet landing is unmeasured; the class SG landing table is the shipped default (⚑)",
    "skill2: the emergency heal (squad HP < 15%, consumes a ticket) is unmodeled — the sim models no incoming boss damage and the schema has no HP-threshold trigger; on-recovery consumers are still driven every rotation by her Burst heal"
  ],
  "skill1": [
    {
      "slot": "skill1",
      "trigger": { "kind": "passive" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "buff", "stat": "casterMaxHpPct", "value": 20 }
      ]
    },
    {
      "slot": "skill1",
      "trigger": { "kind": "fullBurstEnter" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "burstCdr", "seconds": 7.48 }
      ]
    }
  ],
  "skill2": [],
  "burst": [
    {
      "slot": "burst",
      "trigger": { "kind": "burstCast" },
      "target": { "kind": "allies" },
      "effects": [
        { "kind": "heal" }
      ]
    }
  ]
}

```

## 4. S2b pre-op adversarial review (claude-fable-5, cross-family)
```json
{
  "slug": "soline-frost-ticket",
  "leakDetected": null,
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Issues 1 ticket, up to a maximum of 2",
      "disposition": "FAITHFUL",
      "scope": "generic resource issuance, not attack-scoped",
      "durationSemantics": "continuous/permanent while held ('This effect is continuous') — no durationSec, no rounds; cap 2, consumed only by skill2's heal",
      "triggerIdentity": "DUAL trigger: passive (start of battle, issues 1) AND burstCast (her OWN Burst Skill, +1 up to cap). 'when using Burst Skill' is burstCast, NOT fullBurstEnter",
      "targetSet": "all allies (including self) — each ally holds a ticket count",
      "nearestWrongModel": "Ticket issuance keyed to fullBurstEnter (any team FB issues a ticket) instead of burstCast; and/or uncapped stacking beyond 2; and/or a durationSec expiry on the tickets",
      "distinguishingAssertion": "Ticket-count-driven buffApply appears at t=0 (1 ticket); the SECOND increment coincides with soline's own burstCast event (not merely fullBurstStart); after her 2nd+ burst casts NO third increment appears (cap 2); the grant never expires (no buffRemove) across the whole run",
      "inertness": "In a comp where soline never casts her burst, the count must stay at 1 for the entire fight",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Max HP ▲ tickets * 10% of user's Max HP",
      "disposition": "FAITHFUL",
      "scope": "generic Max HP stat grant, scales with live ticket count (10%/20%)",
      "durationSemantics": "continuous while tickets held — permanent in v1 (tickets are never consumed because skill2's consumer can't fire)",
      "triggerIdentity": "rides the ticket state (passive presence), value = ticketCount × 10%",
      "targetSet": "all allies including self",
      "nearestWrongModel": "targetMaxHpPct ('Max HP ▲ X%' of each target's OWN HP) instead of casterMaxHpPct — the text says '10% of the SKILL USER's Max HP', a caster-HP-scaled flat grant; second misread: letting the ally grant feed a teammate's atkOfMaxHpPct conversion",
      "distinguishingAssertion": "buffApply events carry the casterMaxHpPct-family stat at value 10 per ticket (20 at cap), identical absolute HP for every ally regardless of the target's own Max HP; toggling the line via withPatchedOverride changes ZERO damage totals for carry/helm/crown (ally-granted Max HP does not feed atkOfMaxHpPct per the e3 rule)",
      "inertness": "All damage totals of every unit — this line is offensively inert in the control comp; keep the stat anyway (future consumer rule)",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Cooldown of Burst Skill ▼ 7.48 sec",
      "disposition": "FAITHFUL",
      "scope": "burst-cooldown modifier — no damage stat",
      "durationSemantics": "instant one-shot CDR per activation (a subtraction, not a timed buff)",
      "triggerIdentity": "fullBurstEnter (text: 'when entering Full Burst') — fires on EVERY team Full Burst, not oncePerBattle, not on her own cast only",
      "targetSet": "all allies including self",
      "nearestWrongModel": "oncePerBattle: true on the burstCdr; OR reading 7.48 as a percent; OR keying to burstCast so it only fires on rotations soline bursts (with her 40s CD she may skip rotations, so burstCast under-fires vs fullBurstEnter)",
      "distinguishingAssertion": "burstCdr of 7.48s applies at EVERY fullBurstStart event: over a 180s run, count of each unit's burstCast events strictly exceeds the withPatchedOverride(no-CDR) baseline (40s-CD units pull toward every-rotation cadence); on the 3rd+ Full Burst the reduction still lands (kills oncePerBattle); per-shot damage event values are unchanged",
      "inertness": "Individual damage-event magnitudes (mult, crit/core rates) must NOT move — only burst/FB cadence and hence totals",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    },
    {
      "slot": "skill1",
      "kitLine": "Removes First Train Discount",
      "disposition": "UNMODELED",
      "scope": "buff-removal utility, no stat",
      "durationSemantics": "instant removal on each Full Burst entry",
      "triggerIdentity": "fullBurstEnter",
      "targetSet": "all allies",
      "nearestWrongModel": "Inventing a targetStatus/debuff on the boss, or any encoding that emits events — the engine has no buff-removal primitive, and the discount it removes is itself inert in v1 (tickets can never be consumed because skill2's HP<15% trigger cannot fire in a no-damage-intake sim)",
      "distinguishingAssertion": "No block in the override sources any event from this line; withPatchedOverride adding/removing it moves NOTHING on the board; the verbatim text appears in unmodeled.skill1",
      "inertness": "Everything — total board inertness, plus mandatory verbatim record (no silent drop)",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Recovers 12.27% of user's Max HP",
      "disposition": "UNMODELED",
      "scope": "conditional emergency heal, gated on target holding ≥1 ticket",
      "durationSemantics": "instant single heal per qualifying activation",
      "triggerIdentity": "HP-threshold trigger ('when HP of anyone in squad < 15%') — NO schema representation exists, and in v1 the boss deals no damage so no unit can ever drop below 15%; structurally unreachable, not measurement-gated",
      "targetSet": "the low-HP squad member, only if that target has tickets (NOT all allies)",
      "nearestWrongModel": "Encoding it as an interval or passive heal 'to approximate sustain' — this would spuriously emit recovery events every cycle and over-credit any on-recovery consumer (Crown's 'when recovery takes effect' buffs) massively",
      "distinguishingAssertion": "Zero heal/recovery events are ever sourced from soline's skill2 across a full run (filter cfg.onEvent recovery-driving heals by srcSlot); Crown's recovery-triggered buffApply events correlate ONLY with soline's burst casts and Crown's own kit, never with a skill2 block",
      "inertness": "Crown's on-recovery buff uptime — the single most dangerous over-credit channel on this kit if this line is mis-encoded as live",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "Ticket count ▼ 1",
      "disposition": "UNMODELED",
      "scope": "resource spend riding the same HP<15% activation",
      "durationSemantics": "instant decrement per qualifying heal",
      "triggerIdentity": "same unreachable HP-threshold trigger as the heal; also suppressed while First Train Discount is live",
      "targetSet": "the healed target's ticket pool",
      "nearestWrongModel": "Wiring a resource delta:-1 onto some reachable trigger (interval/burstCast) — tickets would decay, eroding the Max HP grant that the kit says is continuous",
      "distinguishingAssertion": "Ticket count is monotonically non-decreasing over the whole run (1 at t=0, 2 after her first burst, never lower); the Max-HP grant never steps down",
      "inertness": "The skill1 Max HP grant's permanence",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "skill2",
      "kitLine": "First Train Discount for 6 sec",
      "disposition": "UNMODELED",
      "scope": "named function buff (no stat): ticket-consumption immunity for the s2 heal",
      "durationSemantics": "durationSec 6 from battle start (also strippable early by skill1's FB-enter removal)",
      "triggerIdentity": "passive (start of battle)",
      "targetSet": "all allies",
      "nearestWrongModel": "Encoding as a targetStatus on the boss, or as some 6s stat buff — it is an ally-side rule modifier whose sole consumer (ticket consumption) is unreachable in v1",
      "distinguishingAssertion": "No buffApply with any StatKey is emitted for this line; verbatim text sits in unmodeled.skill2; toggling it moves nothing",
      "inertness": "Everything — fully inert in v1",
      "evidenceTier": "DATAMINED",
      "loadBearing": false
    },
    {
      "slot": "burst",
      "kitLine": "Recovers 32.26% of user's Max HP",
      "disposition": "FAITHFUL",
      "scope": "unconditional squad heal on burst cast — the kit's tandem channel",
      "durationSemantics": "instant single heal per cast (ticks:1); no HoT wording",
      "triggerIdentity": "burstCast (her own Burst I, 40s CD reduced by her own S1 CDR) — a burst-slot effect fires on HER cast, never on other rotations' FB entries",
      "targetSet": "all allies (including self)",
      "nearestWrongModel": "Skipping the heal as 'defensive, no damage' (taxonomy trap 4) — a heal effect emits recovery events that fire teammates' on-recovery triggers (Crown in the control comp); second misread: fullBurstEnter keying, which would emit heals on rotations soline sat out",
      "distinguishingAssertion": "Exactly one batch of heal→recovery events per soline burstCast event, targeting all five slots, and NONE on Full Bursts where she did not cast; with Crown in the comp, Crown's 'when recovery takes effect' buffApply count strictly increases vs withPatchedOverride removing this heal",
      "inertness": "No direct damage events from the burst itself (Supporter B1, no damage clause); only recovery-consumer uptime may move",
      "evidenceTier": "DATAMINED",
      "loadBearing": true
    }
  ],
  "loadBearingSet": [
    "skill1:ticket-issuance (passive + burstCast, cap 2)",
    "skill1:MaxHP-per-ticket casterMaxHpPct 10%/ticket (kept though offensively inert)",
    "skill1:burstCdr 7.48s on every fullBurstEnter, all allies",
    "burst:heal 32.26% caster Max HP on burstCast → recovery events to all allies"
  ],
  "unmodeledVerbatim": {
    "skill1": [
      "Removes First Train Discount."
    ],
    "skill2": [
      "Recovers 12.27% of the skill user's final Max HP as HP.",
      "Ticket count ▼ 1.",
      "First Train Discount for 6 sec. Function: The effects of I'll Help You Board the Train! will not consume tickets."
    ],
    "burst": []
  },
  "notes": "Expected shared-prior misreads to check the driver against: (1) the burst heal dropped as 'defensive' — it is the kit's main live tandem channel (recovery events → Crown's on-recovery consumers); its absence is a MISSING, not an UNMODELED. (2) Max HP grant encoded as targetMaxHpPct — prose says '10% of the SKILL USER's Max HP' → casterMaxHpPct family, identical flat HP to every ally; must also verify board inertness (ally Max HP grants never feed a teammate's atkOfMaxHpPct). (3) skill2's HP<15% heal resurrected as an interval/passive heal — the worst over-credit path on this kit, silently pumping Crown's recovery uptime; correct v1 disposition is unmodeled-with-verbatim because the sim has no HP intake, so the trigger is structurally unreachable (this is NOT measurement-gated). (4) burstCdr mis-encoded as oncePerBattle or as a percent — assert it lands on the 3rd+ FB and that only cadence (event counts/timing), never per-event damage values, moves. (5) Ticket issuance keyed to fullBurstEnter — diverges from burstCast exactly on rotations her 40s CD forces her to skip; the cap-at-2 assertion plus second-increment-coincides-with-her-cast distinguishes. Whole-picture: as an SG Burst-I Supporter her own fire contributes little; the two board-moving lines are the FB-enter burstCdr (rotation cadence for the whole team) and the burst heal (recovery tandem). All magnitudes (10%, 2-cap, 7.48s, 12.27%, 6s, 32.26%) are literal kit text → DATAMINED; no ALWAYS-⚑ field is exercised except her SG cadence tuple, which belongs to the base-stat layer, not these blocks.",
  "model": "claude-fable-5"
}

```

## 5. S5 blind post-op test-writer (claude-opus-4-8, cross-family) — test source + spec
```typescript
// scripts/tests/units/soline-frost-ticket.test.ts
// BLIND S5 kit-spec test — Soline: Frost Ticket (soline-frost-ticket). Authored from kit prose ALONE.
//
// KIT (SG / Water / Supporter / Burst I; ammo 9, hitsPerShot 10, normalMult 201.5):
//  skill1:
//   (A) Battle start + on OWN Burst cast -> all allies: issue 1 ticket (max 2);
//       ticket effect = Max HP up (tickets x 10% of the SKILL USER's Max HP).
//       => casterMaxHpPct grant. OFFENSIVELY INERT in v1 (ally-granted Max HP feeds no
//          atkOfMaxHpPct; Soline herself carries no HP->ATK scaler).
//   (B) Enter Full Burst -> all allies: Burst-Skill Cooldown down 7.48s.  => burstCdr (REAL rotation accel).
//   (C) Enter Full Burst -> all allies: Removes 'First Train Discount'.   => kit-internal status, GAP.
//  skill2:
//   (D) When any squad member HP < 15% (target must hold tickets): heal 12.27% caster Max HP; ticket -1.
//       => HP-gated. v1 boss deals no damage / no HP pool -> never fires. GAP.
//   (E) Battle start -> all allies: 'First Train Discount' for 6s (ticket effects don't consume tickets).
//       => kit-internal status bookkeeping, GAP.
//  burst (Burst I):
//   (F) All allies: heal 32.26% caster Max HP.  => heal event; fires recovery-consumers (Crown is in comp).
//
// FIXTURE: controlComp('soline-frost-ticket', true) — liter(B1)/crown(B2)/soline(focus)/helm(B3).
//   CAVEAT (dual-B1): Soline is Burst I and controlComp also seeds liter (B1); on rotations where liter
//   opens, Soline does NOT cast, so her 2nd ticket + burst heal may not fire. Assertions that need her
//   own cast are guarded/skip'd; the battle-start ticket (value 10) and the CDR/inertness claims do not
//   need her to burst and stay non-vacuous. Crown (B2) is the recovery-consumer for the heal tandem.
//
// WHY EACH ASSERTION DISCRIMINATES:
//  A  buffApply(casterMaxHpPct) must be EMITTED (value 10 at battle start) AND be offensively inert —
//     zeroing every Max-HP-grant leaves team totals byte-identical. Nearest-wrong (encode as ATK / as
//     targetMaxHpPct feeding self atkOfMaxHpPct) would move totals -> RED.
//  B  Full-Burst count must be MONOTONE in burstCdr.seconds across {0, faithful, 40}, strict at the ends.
//     Nearest-wrong (CDR omitted / inert) collapses all three to equal -> RED.
//  F  Team total is monotone under heal presence (base >= noHeal) — a heal can only ADD damage via a
//     recovery-consumer, never subtract. Nearest-wrong (heal mis-encoded as a damage bucket) shows up as
//     a NEW damage source and breaks the byte-equality expectation documented below.
//
// Runs are hoisted (each runComp is a full 180s sim); 5 runs total.

import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness';

const SLUG = 'soline-frost-ticket';

// ---- helpers ----------------------------------------------------------------
function eachEff(ov: any, fn: (e: any, b: any) => void) {
  for (const b of ov.blocks || []) for (const e of b.effects || []) fn(e, b);
}
const setCdr = (s: number) => (ov: any) =>
  eachEff(ov, (e) => { if (e.kind === 'burstCdr') e.seconds = s; });
const zeroMaxHp = (ov: any) =>
  eachEff(ov, (e) => {
    if (e.kind === 'buff' && ['casterMaxHpPct', 'targetMaxHpPct', 'maxHpPct'].includes(e.stat)) e.value = 0;
  });
const stripHeals = (ov: any) => {
  for (const b of ov.blocks || []) b.effects = (b.effects || []).filter((e: any) => e.kind !== 'heal');
};

// runWith(null) = committed faithful override; else an in-memory patched clone for SLUG.
function runWith(clone: any | null) {
  const opts: any = controlComp(SLUG, true);
  if (clone) opts.overrides = { ...(opts.overrides || {}), [SLUG]: clone };
  const events: any[] = [];
  opts.cfg = { ...(opts.cfg || {}), onEvent: (e: any) => events.push(e) };
  const res = runComp(opts);
  return { res, events };
}
const teamTotal = (r: any) => { const x: any = totals(r.res); return typeof x === 'number' ? x : x.total; };
const fbCount = (r: any) => r.events.filter((e: any) => e.kind === 'fullBurstStart').length;

// ---- hoisted runs -----------------------------------------------------------
const base = runWith(null);
const cdr0 = runWith(withPatchedOverride(SLUG, setCdr(0)));
const cdrBig = runWith(withPatchedOverride(SLUG, setCdr(40)));
const noTicket = runWith(withPatchedOverride(SLUG, zeroMaxHp));
const noHeal = runWith(withPatchedOverride(SLUG, stripHeals));

describe('soline-frost-ticket — blind kit spec', () => {
  it('fixture actually reaches Full Burst (non-vacuity)', () => {
    expect(fbCount(base)).toBeGreaterThanOrEqual(1);
    expect(fbCount(cdr0)).toBeGreaterThanOrEqual(1);
  });

  // (A) ticket: Max HP up (tickets x10% of caster Max HP), all allies, battle-start + own-burst
  it('A: grants casterMaxHpPct to allies (battle-start ticket = 10%)', () => {
    const grants = base.events.filter(
      (e: any) => e.kind === 'buffApply' && e.stat === 'casterMaxHpPct',
    );
    expect(grants.length).toBeGreaterThanOrEqual(1);
    // battle-start = 1 ticket = 10%; a 2nd ticket (20%) only if Soline casts her own burst.
    expect(grants.some((g: any) => g.value === 10 || g.value === 20)).toBe(true);
  });

  it('A: ticket Max HP is OFFENSIVELY INERT (zeroing it moves no damage)', () => {
    // ally-granted Max HP feeds no atkOfMaxHpPct; Soline has no HP->ATK scaler of her own.
    // Nearest-wrong encodings (ATK buff / self-feeding targetMaxHpPct) would break this equality.
    expect(teamTotal(noTicket)).toBe(teamTotal(base));
  });

  // (B) Burst Skill CD down 7.48s on Full-Burst enter, all allies
  it('B: burstCdr is live — Full-Burst count monotone in CDR seconds', () => {
    const n0 = fbCount(cdr0), nf = fbCount(base), nBig = fbCount(cdrBig);
    expect(nf).toBeGreaterThanOrEqual(n0);      // faithful CDR never yields FEWER FBs than none
    expect(nBig).toBeGreaterThanOrEqual(nf);    // a larger CDR never yields fewer
    expect(nBig).toBeGreaterThan(n0);           // discriminates: an omitted/inert burstCdr collapses these
  });

  // (F) burst heal 32.26% caster Max HP, all allies — tandem via Crown's recovery trigger
  it('F: heals are monotone (base >= noHeal); heal never SUBTRACTS team damage', () => {
    // Crown (B2) is in the comp: Soline's heal can only ADD damage via Crown's recovery buff, or be inert
    // (if Soline never opens / Crown already saturated). A strict difference confirms the recovery tandem.
    expect(teamTotal(base)).toBeGreaterThanOrEqual(teamTotal(noHeal));
    // If mis-encoded as a damage effect, stripping it would drop a damage bucket -> also caught here.
  });

  it.skip('F(strong): Soline burst heal drives Crown recovery — needs Soline as sole B1 opener', () => {
    // controlComp seeds liter as a 2nd B1, so Soline may never cast; a clean strict tandem read requires
    // a single-B1 fixture (or forcing Soline to open) which the harness cannot express here.
  });

  // (C) skill1: Removes 'First Train Discount' on FB enter
  it.skip('C: removes First Train Discount — kit-internal status, no damage primitive / GAP', () => {});

  // (D) skill2: HP<15% -> heal 12.27% + ticket -1
  it.skip('D: HP<15% heal+ticket-consume — v1 boss deals no damage, no HP pool, never fires / GAP', () => {});

  // (E) skill2: First Train Discount 6s (ticket effects don't consume tickets)
  it.skip('E: First Train Discount status — internal ticket-consumption bookkeeping, no damage / GAP', () => {});
});

```
S5 spec + fixtures + gaps:
```json
{
  "spec": [
    {
      "slot": "skill1",
      "kitLine": "Issue ticket; MaxHP up tickets*10% caster",
      "disposition": "FAITHFUL (offensively inert)",
      "assertion": "buffApply(casterMaxHpPct) emitted to allies (value 10 at battle start); zeroing every Max-HP grant leaves team totals byte-identical. Fails the inertness check if encoded as an ATK buff or as self-feeding targetMaxHpPct (would move damage)."
    },
    {
      "slot": "skill1",
      "kitLine": "Enter Full Burst: Burst CD down 7.48s",
      "disposition": "FAITHFUL",
      "assertion": "Full-Burst count over 180s is monotone in burstCdr.seconds {0,7.48,40} with strict big>none. Fails (all equal) under the nearest-wrong model where the CDR is omitted or modeled inert."
    },
    {
      "slot": "skill1",
      "kitLine": "Enter Full Burst: Remove First Train Disc.",
      "disposition": "GAP",
      "assertion": "it.skip — kit-internal status toggle with no damage-bearing primitive; only meaningful paired with the (E) ticket-consumption bookkeeping the engine does not model."
    },
    {
      "slot": "skill2",
      "kitLine": "HP<15%: heal 12.27% + ticket -1",
      "disposition": "GAP (MEASUREMENT/POOL-GATED)",
      "assertion": "it.skip — v1 boss deals no damage and there is no HP pool, so the <15% gate never opens; unobservable in the deterministic sim."
    },
    {
      "slot": "skill2",
      "kitLine": "Battle start: First Train Discount 6s",
      "disposition": "GAP",
      "assertion": "it.skip — internal 6s window that suppresses ticket consumption; no damage effect and no ticket-consumption engine to interact with."
    },
    {
      "slot": "burst",
      "kitLine": "Heal 32.26% caster MaxHP, all allies",
      "disposition": "FAITHFUL (tandem-relevant)",
      "assertion": "Team total monotone under heal presence (base>=noHeal): a heal can only ADD damage via Crown's recovery trigger, never subtract; a strict gap confirms the tandem. If mis-encoded as a damage bucket, stripping it drops damage and the monotone/inert expectation is disturbed."
    }
  ],
  "fixtures": "controlComp('soline-frost-ticket', true) — liter(B1)/crown(B2)/soline(focus)/helm(B3). helm=true (its buffs don't confound FB-count / inertness / monotone-total assertions and it supplies the B3 that closes Full Burst). Crown is deliberately retained as the recovery-consumer that makes the (F) heal potentially non-inert. Documented dual-B1 caveat: Soline is Burst I and controlComp seeds liter as a second B1, so on rotations liter opens Soline may not cast — assertions needing her own burst (2nd ticket=20%, burst-heal tandem) are guarded or it.skip'd; the battle-start ticket (value 10) and CDR/inertness claims do not require her cast and stay non-vacuous.",
  "gaps": [
    "skill1 (C) Removes First Train Discount — it.skip: kit-internal status, no damage primitive.",
    "skill2 (D) HP<15% heal + ticket consume — it.skip: v1 boss deals no damage / no HP pool, gate never opens.",
    "skill2 (E) First Train Discount 6s (no-consume) — it.skip: internal ticket-consumption bookkeeping, no damage effect.",
    "burst (F, strong-tandem variant) — it.skip: a clean strict Crown-recovery read needs Soline as the sole B1 opener; controlComp's second B1 (liter) can steal the open, which the harness cannot override."
  ],
  "flags": [
    "Base SG cadence (rate_of_fire / reloadFrames 111) is the datamine-unreliable ⚑ for her own normal-attack damage, but it is generic weapon fire, not a kit line — no kit magnitude is invented; all kit values (10%, 7.48s, 12.27%, 32.26%) are literal in the prose.",
    "Ticket steady-state is a two-step ramp (1 ticket=10% at t=0 -> 2 tickets=20% only after her own burst) with skill2 consumption suppressed by First Train Discount; since the whole Max-HP grant is offensively inert in v1, the exact trajectory moves zero damage and is not tuned — flagged for completeness, not modeled as a magnitude.",
    "TRIGGER IDENTITY note: (A)'s +1 ticket keys to 'when using Burst Skill' = burstCast (her own cast), NOT fullBurstEnter — keying it to team FB-enter would over-credit the 2nd ticket in multi-burster comps. (B) and (C) key to fullBurstEnter (any team FB). Verified against the taxonomy's burst-cast vs full-burst-enter distinction."
  ]
}
```

## 6. S6 blind post-op override-writer (claude-opus-4-8, cross-family) — override + audit
```json
{
  "slug": "soline-frost-ticket",
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
          "stat": "casterMaxHpPct",
          "value": 20,
          "maxStacks": 2
        }
      ]
    },
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
          "kind": "burstCdr",
          "seconds": 7.48
        }
      ]
    }
  ],
  "skill2": [],
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
          "ticks": 1
        }
      ]
    }
  ],
  "unmodeled": {
    "skill1": [
      "Activates when entering Full Burst. Affects all allies. Removes First Train Discount. — internal ticket-consumption bookkeeping status (see skill2); offensively inert in v1"
    ],
    "skill2": [
      "Activates when HP of anyone in squad < 15%, target if it has tickets: Recovers 12.27% of skill user's final Max HP; Ticket count ▼1. — survival trigger never fires (boss deals no damage / no HP pool in v1)",
      "Activates at start of battle, all allies: First Train Discount for 6 sec. Function: effects of 'I'll Help You Board the Train!' will not consume tickets. — internal ticket-consumption bookkeeping; no offensive effect"
    ],
    "burst": []
  },
  "caveats": [
    "casterMaxHpPct ticket grant is authored at its 2-ticket CAP (20%); it ramps from 10% (1 ticket at battle start) to 20% after the first Burst cast. Ally-granted Max HP does NOT feed a teammate's atkOfMaxHpPct conversion (e3 rule), so this buff is offensively INERT — magnitude/ramp moves no damage; kept for kit completeness / future consumer.",
    "Burst + skill2 heal lines emit recovery events (tandem: they can fire a teammate's 'recovery'-keyed on-heal damage buff, e.g. Crown-style). No HP amount is modeled; skill2's heal cannot fire in v1 (no incoming damage)."
  ],
  "note": "PARSER BASELINE (HYPOTHESIS — NOT a validated model). Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a real fight before trusting any number. Support/heal kit: no damage lines, no DoT, no weapon-swap, no Hit-Rate. skill1 = ticket-based casterMaxHpPct grant (all allies, cap 2 tickets = 20% of caster Max HP, offensively inert) + FB-enter team burst-CDR 7.48s + FB-enter removal of the internal 'First Train Discount' status. skill2 = a <15%-HP emergency heal (12.27% Max HP, consumes 1 ticket — inert v1) + the First Train Discount setup status. Burst = flat 32.26% Max-HP heal to all allies (modeled as a recovery-event emitter for heal-synergy tandems; no HP amount modeled). The ticket 'First Train Discount' consume-suppression machinery is internal bookkeeping with no damage consequence in v1 and is left in unmodeled verbatim."
}
```
S6 audit + flags:
```json
{
  "audit": [
    {
      "slot": "skill1",
      "kitLine": "Start of battle + on Burst: Issue 1 ticket (max 2)",
      "status": "IMPLEMENTED",
      "effectOrReason": "passive buff casterMaxHpPct value 20 (2 tickets x 10% of caster Max HP), maxStacks 2, target allies — modeled at steady-state cap; ramp flagged"
    },
    {
      "slot": "skill1",
      "kitLine": "Ticket effect: Max HP up tickets*10% caster Max HP",
      "status": "IMPLEMENTED",
      "effectOrReason": "folded into the casterMaxHpPct value above (2*10=20)"
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter: Cooldown of Burst Skill down 7.48 sec",
      "status": "IMPLEMENTED",
      "effectOrReason": "burstCdr seconds 7.48, trigger fullBurstEnter, target allies"
    },
    {
      "slot": "skill1",
      "kitLine": "FB enter: Removes First Train Discount",
      "status": "SKIPPED",
      "effectOrReason": "internal ticket-consume-suppression status toggle; no damage/stat consequence in v1 -> unmodeled"
    },
    {
      "slot": "skill2",
      "kitLine": "Squad HP <15% & has ticket: heal 12.27% Max HP; ticket -1",
      "status": "SKIPPED",
      "effectOrReason": "trigger 'HP < 15%' cannot fire (immortal boss, no HP pool); heal has no modeled amount -> unmodeled"
    },
    {
      "slot": "skill2",
      "kitLine": "Start of battle: First Train Discount 6 sec (no ticket consume)",
      "status": "SKIPPED",
      "effectOrReason": "internal bookkeeping status enabling ticket-free heals; no offensive effect -> unmodeled"
    },
    {
      "slot": "burst",
      "kitLine": "All allies: Recovers 32.26% caster final Max HP as HP",
      "status": "IMPLEMENTED",
      "effectOrReason": "heal ticks 1, trigger burstCast, target allies — recovery-event emitter for heal-synergy; no HP amount modeled"
    }
  ],
  "flags": [
    {
      "field": "override.skill1[0].effects[0].value",
      "estimate": "20 (2-ticket cap; ramps 10 -> 20 after first burst)",
      "reasoning": "Ticket currency: 1 ticket issued at battle start, +1 on each Burst cast, capped at 2. Steady-state = 2 tickets = 20% of caster Max HP. Early fight sits at 1 ticket (10%) until the first burst. ALWAYS-flag stack/currency steady-state + ramp haircut.",
      "recipe": "Confirm accrual (1 at t=0, +1 per burst, cap 2) and whether any consumer scales off this ally-granted Max HP. If a rampSec haircut is wanted, set rampSec to the time-to-first-burst; but note ally-granted Max HP is offensively inert (e3), so this never moves board damage — verify no downstream atkOfMaxHpPct consumer before spending tuning effort."
    },
    {
      "field": "override.skill1[0].trigger",
      "estimate": "passive (steady-state stand-in for 'start of battle AND on Burst cast')",
      "reasoning": "The kit accrues tickets on two events (battle start + own burst). Modeled as a single always-on passive at cap because the grant is continuous and offensively inert. A faithful accrual would need battle-start seed + burstCast increment.",
      "recipe": "If a consumer ever reads live ticket count, replace with an initial-1 resource pool + burstCast delta +1 (clamp max 2) instead of a flat passive."
    },
    {
      "field": "override.burst[0].effects[0] (heal amount)",
      "estimate": "32.26% caster final Max HP — amount NOT modeled (engine emits event only)",
      "reasoning": "Engine heal effect carries no HP magnitude; it only fires teammates' 'recovery' triggers (tandem heal-synergy). The 32.26% figure is recorded for completeness but unused by damage math in v1.",
      "recipe": "Only matters if a teammate has an on-recovery damage buff in the comp; verify tandem interaction there. Otherwise inert."
    }
  ]
}
```

## 7. Driver's test (scripts/tests/units/soline-frost-ticket.test.ts)
```typescript
// PER-UNIT KIT SPEC — `soline-frost-ticket` (Soline: Frost Ticket, Supporter/SG/Water, Burst I, cd 40s, ammo 9,
// reloadFrames 111, chargeFrames 0, hitsPerShot 10, normalMult 201.5 / coreMult 200). Kit-autonomy gauntlet
// 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5 / S5-S7 claude-opus-4-8).
//
// ZERO direct-damage kit: nowhere in her kit does Soline deal %ATK damage / DoT / a rider. Her only damage is base
// SG spray (engine per-unit SG landing model). Every kit line is a buff / cooldown-reduction / heal, so EVERY
// assertion here is EVENT-LOG based (cfg.onEvent buffApply / burstCast / fullBurstStart), never damage-total based.
//
// One assertion group per KIT LINE (F1..F6), asserted against the override loaded from disk. `withPatchedOverride`
// builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must discriminate against) — never the
// encoding under test.
//
// Kit (data/characters.json → characters['soline-frost-ticket'].skills, levels 10/10/10 — the normalized `skills`
// prose is the SSOT):
//   S1 ■ at battle start AND when using Burst Skill → all allies: issue 1 ticket (max 2), continuous;
//         Ticket effect: Max HP ▲ (tickets × 10%) of the skill user's Max HP                       [F1]
//      ■ when entering Full Burst → all allies: Cooldown of Burst Skill ▼ 7.48 sec                  [F2]
//      ■ when entering Full Burst → all allies: Removes First Train Discount  (UNMODELED — ticket bookkeeping) [F3]
//   S2 ■ squad HP < 15% (target with tickets): Recover 12.27% caster final Max HP, ticket ▼1  (UNMODELED, whole block) [F4]
//      ■ at battle start → all allies: First Train Discount 6 sec + Function  (UNMODELED — ticket bookkeeping)        [F4]
//   BU → all allies: Recovers 32.26% of the skill user's final Max HP as HP  (heal event)          [F6]
//
// STEADY-STATE MODELING (why F1 is a flat passive 20%, not a ramping 10%→20%): the ticket is a stack/currency the
// engine has no primitive for (no cap-2/consume-on-S2 stack). She starts at 1 ticket (10% Max HP) at battle start
// and gains the 2nd (+10% → 20%, capped) on her first Burst cast; the ONLY consume is the S2 HP<15% emergency heal,
// which never fires under scope-lock (no incoming boss damage). So the pool sits at the cap (2 tickets = 20%) for
// ~97% of the fight — the faithful steady-state is the flat passive `casterMaxHpPct 20` (a DERIVED trajectory, not
// a cap-tier guess; documented ⚑). casterMaxHpPct resolves to flat Max HP at apply time (sim.ts:1772) and emits a
// buffApply under stat `maxHpFlat` whose KEY carries the effect value (`<slot>:skill1:maxHpFlat:20`) — so the 20%
// effect value is read off the key, and the flat HP amount off the value. Ally-granted Max HP is currently INERT
// for damage (atkOfMaxHpPct counts a unit's OWN Max HP only), so F1 is observed purely via the buffApply event.
//
// EVENT-LOG CONVENTIONS (measured for this fixture): the F1 casterMaxHpPct buff emits buffApply with stat
// `maxHpFlat`, casterIdx === SOLINE, one per ally target (targets [0,1,2]), frame 0, expiresFrame null (passive
// permanent). The F2 burstCdr emits NO buffApply (it mutates burstCdFrames directly, sim.ts:2047) — its only
// observable is the team burst cadence (more Full Bursts over 180s with it than without). The F6 heal emits NO
// buffApply either — it fires a RECOVERY event to its targets (sim.ts:1950), so its observable is a recovery
// CONSUMER: crown's "when recovery takes effect → team Attack Damage ▲20.99% 7s" block fires whenever crown
// RECEIVES a heal.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   F1  "tickets × 10% of the skill user's Max HP", max 2 tickets, all allies, continuous (passive). Encoded as
//       casterMaxHpPct 20 → buffApply maxHpFlat, key ':maxHpFlat:20', all 3 slots, frame 0, permanent.
//       Nearest-wrong (a): value 10 (1 ticket only — the battle-start state, ignoring the steady-state 2nd ticket
//       she holds from her first burst onward) → key ':maxHpFlat:10', no ':20'. (b): target self → only slot 0,
//       not all 3 allies. Both RED vs shipped.
//   F2  "when entering Full Burst → all allies: Cooldown of Burst Skill ▼ 7.48 sec" = burstCdr 7.48 on
//       fullBurstEnter, all allies. burstCdr emits no event; the observable is the team cadence — with the block
//       the team completes 6 Full Bursts over 180s, without it 5 (the 7.48s off the 40s CDs pulls one extra chain
//       inside the fight). PIN: base FB count > burstCdr-removed FB count (the block is live + fires), and soline's
//       own cast count tracks it. RESIDUAL (documented, owner spot-check): the trigger identity fullBurstEnter vs
//       burstCast is NOT behaviorally discriminable for a Burst-I unit whose own cast opens every chain (her
//       burstCast and the team fullBurstEnter fire the same number of times, ~82 frames apart, so the cadence
//       effect is near-identical); the faithful reading is fullBurstEnter (prose: "when entering Full Burst"). The
//       7.48s magnitude is the prose's own (DATAMINED level-10 value).
//   F3  PIN (documented skip): "Removes First Train Discount" is UNMODELED — pure ticket-economy bookkeeping
//       (toggles whether the S2 heal consumes a ticket); no damage, no stat, no modeled consumer, inert under
//       scope-lock. The S1 SLOT is active (it emits the F1 maxHpFlat grant; the F2 burstCdr emits no buffApply).
//       Assert: soline's skill1-keyed buffApply events emit EXACTLY {maxHpFlat} and NO third (discount-removal)
//       effect — the documented skip is distinguished from a silent drop or a mis-encoding as a damage stat.
//   F4  PIN (documented skip, whole S2 block): the squad-HP<15% emergency heal (12.27% caster Max HP, ticket ▼1)
//       AND the battle-start "First Train Discount 6 sec" + Function are UNMODELED. The heal is a HEAL class with
//       an HP-threshold trigger the schema lacks and the sim cannot produce (no incoming boss damage); wiring it to
//       any available trigger would FABRICATE recovery events (measured > fudge). The discount is the same ticket
//       bookkeeping, gating a heal that never fires. skill2 is [] — Assert: soline's skill2-keyed buffApply events
//       are EMPTY (no fabricated heal, no fabricated discount buff) — the whole-block skip distinguished from a
//       silent drop. (The hard-rule-2 recovery-synergy intent is served by the F6 burst heal, which fires reliably
//       every rotation.)
//   F6  "all allies: Recovers 32.26% of the skill user's final Max HP as HP" = heal on burstCast, all allies. The
//       heal emits a RECOVERY event; with crown's own Relax self-heal removed (crownNoHeal) and ada (a non-healer
//       B3) the ONLY recovery source in the fight is soline's burst heal, so crown's recovery consumer (team
//       attackDamagePct 20.99) fires precisely on soline's burstCast frames. Nearest-wrong (a): trigger
//       fullBurstEnter → the recovery fires on fullBurstStart frames (strictly AFTER soline's burstCast frames —
//       measured 82-frame gap), not the cast frames. (b): heal removed → crown's recovery never fires (no recovery
//       source). Both RED vs shipped. The heal HP AMOUNT is event-only by engine design (no HP pool modeled).
//
// Fixture: Soline is Burst I, so a custom sole-B1 comp [soline-frost-ticket(B1,SG Water) / crown(B2) / ada(B3)] is
// used (NOT controlComp, which fields liter as a second B1). Soline is the SOLE Burst I and is camera-focused; she
// fills her gauge off SG spray and casts her burst ~6× over 180s, each cast opening a Full Burst chain (her
// burstCast frame strictly precedes each fullBurstStart). Crown is the recovery CONSUMER that makes the F6 heal
// observable; ada is a heal-free B3 (her only recovery-adjacent line is an UNMODELED lifesteal) so she never drives
// crown's recovery. Boss Fire. Deterministic (no seed). Slot order: soline 0 / crown 1 / ada 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const SFT = 'soline-frost-ticket';
const SOLINE = 0; // slot index in the fixture
const CROWN = 1;
const ALL_SLOTS = [0, 1, 2];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIXTURE = {
  slugs: [SFT, 'crown', 'ada'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: SFT,
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...FIXTURE, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** soline-caster buffApply events (ally/self buffs carry casterIdx === SOLINE). */
const sftBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === SOLINE && b.stat === stat);
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1),
  );
/** soline's skill1-keyed buffApply events (key prefix `<SOLINE>:skill1:`). */
const s1Keyed = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.key.startsWith(`${SOLINE}:skill1:`));
/** soline's skill2-keyed buffApply events (key prefix `<SOLINE>:skill2:`). */
const s2Keyed = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.key.startsWith(`${SOLINE}:skill2:`));
const sftBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SFT);
const castFrames = (evs: SimEvent[]) => sftBursts(evs).map((e) => e.frame);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
/** crown's recovery consumer firings (team Attack Damage ▲20.99%), deduped to distinct frames. */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [...new Set(
    buffs(evs)
      .filter(
        (b) =>
          b.casterIdx === CROWN &&
          b.stat === 'attackDamagePct' &&
          b.value === 20.99,
      )
      .map((b) => b.frame),
  )].sort((a, b) => a - b);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
// F1 nearest-wrong (value): the ticket grant at 1 ticket (10%) instead of the steady-state 2 tickets (20%).
const cfMaxHp10 = withPatchedOverride(SFT, (ov: any) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterMaxHpPct');
  if (!e)
    throw new Error('soline S1 casterMaxHpPct effect missing — fixture is stale');
  e.value = 10;
});
// F1 nearest-wrong (target): all allies → self only.
const cfMaxHpSelf = withPatchedOverride(SFT, (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterMaxHpPct'),
  );
  if (!b)
    throw new Error('soline S1 casterMaxHpPct block missing — fixture is stale');
  b.target = { kind: 'self' };
});
// F2 nearest-wrong (presence): the burstCdr block removed → no team CDR → fewer Full Bursts.
const cfNoCdr = withPatchedOverride(SFT, (ov: any) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr'),
  );
  if (ov.skill1.length === before)
    throw new Error('soline S1 burstCdr block missing — fixture is stale');
});
// F6 nearest-wrong (trigger): the burst heal keyed to fullBurstEnter (FB-start frames) instead of burstCast.
const cfHealFbEnter = withPatchedOverride(SFT, (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'heal'),
  );
  if (!b) throw new Error('soline burst heal block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});
// F6 nearest-wrong (presence): the burst heal block removed → no recovery source → crown's recovery never fires.
const cfNoHeal = withPatchedOverride(SFT, (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal'),
  );
  if (ov.burst.length === before)
    throw new Error('soline burst heal block missing — fixture is stale');
});
// Isolation: remove crown's own Relax self-heal so soline's burst heal is the ONLY recovery source in the fight.
const crownNoHeal = withPatchedOverride('crown', (ov: any) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal'),
  );
  if (ov.skill2.length === before)
    throw new Error('crown S2 heal block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const maxHp10 = run({ [SFT]: cfMaxHp10 });
const maxHpSelf = run({ [SFT]: cfMaxHpSelf });
const noCdr = run({ [SFT]: cfNoCdr });
const isolated = run({ crown: crownNoHeal });
const healFbEnter = run({ [SFT]: cfHealFbEnter, crown: crownNoHeal });
const noHeal = run({ [SFT]: cfNoHeal, crown: crownNoHeal });

describe('soline-frost-ticket — kit spec', () => {
  describe('fixture sanity — Soline casts her burst and opens Full Burst chains', () => {
    it('Soline casts >0 bursts and the team completes >0 Full Bursts; burstCast strictly precedes fullBurstStart', () => {
      expect(sftBursts(base.events).length).toBeGreaterThan(0);
      expect(fbStartFrames(base.events).length).toBeGreaterThan(0);
      const cf = castFrames(base.events);
      const fs = fbStartFrames(base.events);
      // trigger identity is frame-discriminable: every cast frame strictly precedes its FB-start frame
      expect(cf.every((f) => !fs.includes(f))).toBe(true);
      expect(Math.min(...cf)).toBeLessThan(Math.min(...fs));
    });
  });

  describe('F1 — S1 ticket Max-HP grant: casterMaxHpPct 20 (2 tickets × 10%), all allies, passive permanent', () => {
    const mh = sftBuff(base.events, 'maxHpFlat');
    it('grants flat Max HP to ALL allies at frame 0, permanent, keyed to the 20% effect value', () => {
      expect(mh.length).toBeGreaterThan(0);
      expect(targetsOf(mh)).toEqual(ALL_SLOTS);
      expect([...new Set(mh.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(mh.map((b) => b.expiresFrame))]).toEqual([null]);
      // the buff KEY carries the effect value (20% = 2 tickets × 10%); the flat HP amount is the value
      expect([...new Set(mh.map((b) => b.key))]).toEqual([
        `${SOLINE}:skill1:maxHpFlat:20`,
      ]);
      expect(mh.every((b) => b.value > 0)).toBe(true);
    });
    it('DISCRIMINATING (value): 1 ticket (10%, nearest-wrong) keys the buff :10, not :20', () => {
      expect(
        sftBuff(maxHp10.events, 'maxHpFlat').filter((b) =>
          b.key.endsWith(':maxHpFlat:20'),
        ).length,
      ).toBe(0);
      expect(
        sftBuff(maxHp10.events, 'maxHpFlat').filter((b) =>
          b.key.endsWith(':maxHpFlat:10'),
        ).length,
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (target): self (nearest-wrong) reaches only soline, not all 3 allies', () => {
      expect(targetsOf(sftBuff(maxHpSelf.events, 'maxHpFlat'))).toEqual([
        SOLINE,
      ]);
    });
  });

  describe('F2 — S1 FB-enter burst CDR ▼7.48s to all allies (burstCdr; no event — observed via team cadence)', () => {
    it('PIN: the block is live — removing it reduces the Full Burst count over 180s', () => {
      const withCdr = fbStartFrames(base.events).length;
      const without = fbStartFrames(noCdr.events).length;
      expect(withCdr).toBeGreaterThan(without);
      // soline's own cast count tracks the team cadence
      expect(castFrames(base.events).length).toBeGreaterThanOrEqual(
        castFrames(noCdr.events).length,
      );
    });
    // RESIDUAL (documented): fullBurstEnter vs burstCast trigger identity is NOT behaviorally discriminable for a
    // Burst-I unit whose own cast opens every chain (same firing count, ~82 frames apart → near-identical cadence
    // effect). The faithful reading is fullBurstEnter (prose: "when entering Full Burst"); flagged for owner
    // spot-check, not asserted here. The 7.48s magnitude is the prose's own DATAMINED level-10 value.
  });

  describe('F3 — S1 "Removes First Train Discount" is UNMODELED (ticket-economy bookkeeping)', () => {
    it("PIN: soline's skill1-keyed buffs emit EXACTLY {maxHpFlat} and NO discount-removal effect", () => {
      const s1Stats = new Set(s1Keyed(base.events).map((b) => b.stat));
      expect([...s1Stats].sort()).toEqual(['maxHpFlat']);
    });
  });

  describe('F4 — S2 whole block UNMODELED (HP<15% emergency heal + First Train Discount bookkeeping)', () => {
    it('PIN: soline emits NO skill2-keyed buffApply events (skill2 is [] — no fabricated heal or discount buff)', () => {
      expect(s2Keyed(base.events).length).toBe(0);
    });
  });

  describe('F6 — Burst heal (32.26% caster final Max HP) to all allies on burstCast, observed via crown recovery', () => {
    it("drives crown's recovery consumer (team AD ▲20.99%) precisely on soline's burstCast frames", () => {
      const casts = castFrames(isolated.events);
      const recovery = crownRecoveryFrames(isolated.events);
      expect(casts.length).toBeGreaterThan(0);
      // every soline burst cast produces a crown recovery firing on the same frame (the heal is instant on cast)
      expect(recovery).toEqual(casts);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) fires the recovery on FB-START frames, not cast frames', () => {
      const casts = castFrames(healFbEnter.events);
      const recovery = crownRecoveryFrames(healFbEnter.events);
      const starts = fbStartFrames(healFbEnter.events);
      expect(recovery.length).toBeGreaterThan(0);
      // recovery lands on FB-start frames, which are NOT soline's cast frames
      expect(recovery.every((f) => starts.includes(f))).toBe(true);
      expect(recovery.every((f) => !casts.includes(f))).toBe(true);
    });
    it('DISCRIMINATING (presence): heal removed (nearest-wrong) leaves NO recovery source — crown recovery never fires', () => {
      expect(crownRecoveryFrames(noHeal.events).length).toBe(0);
    });
  });
});

```

## 7b. S2d independent verification matrix
```
S2d INDEPENDENT VERIFICATION GATE — soline-frost-ticket (2026-07-24)
Method: `npx vitest run scripts/tests/units/soline-frost-ticket.test.ts` against (i) the unmodified SHIPPED
override and (ii) each named counterfactual (withPatchedOverride, in-memory — committed JSON untouched).
10 tests, all 10 PASS vs shipped (the DISCRIMINATING assertions exercise each counterfactual inline).

Fixture: soline-frost-ticket(B1,SG Water) / crown(B2) / ada(B3), boss Fire, focus soline. Soline is the SOLE
Burst I (controlComp's liter would be a 2nd B1, so a custom comp is used). Crown is the recovery CONSUMER that
makes the burst heal observable; ada is a heal-free B3. Measured cadence: soline casts 6x, team completes 6
Full Bursts; each burstCast frame (799,2750,4701,6652,8603,10554) strictly precedes its fullBurstStart frame
(881,2832,4783,6734,8722,10673) by ~82 frames — trigger identity is frame-discriminable.

ZERO direct-damage kit: every assertion is EVENT-LOG based (buffApply / burstCast / fullBurstStart), never
damage-total based.

--- (i) vs SHIPPED override (casterMaxHpPct 20 passive; burstCdr 7.48 fullBurstEnter; heal burstCast) ---
FAITHFUL pins (expect GREEN):
  fixture sanity: soline casts >0 bursts, >0 FBs, burstCast < fullBurstStart ........ GREEN
  F1 casterMaxHpPct 20 -> maxHpFlat, all 3 allies, frame 0, permanent, key ':20' .... GREEN
  F2 burstCdr live: base FB count (6) > burstCdr-removed FB count (5) ............... GREEN
  F3 skill1-keyed buffs emit EXACTLY {maxHpFlat} (discount-removal UNMODELED) ....... GREEN
  F4 skill2-keyed buffs EMPTY (whole S2 block UNMODELED — no fabricated heal) ....... GREEN
  F6 burst heal -> crown recovery 20.99 fires precisely on soline's burstCast frames  GREEN
NO FIX lines: the shipped override is faithful; every kit line is FAITHFUL or documented UNMODELED.

--- (ii) each named counterfactual (expect RED = the assertion discriminates) ---
  F1 value 10 (1 ticket, nearest-wrong) -> key ':10' not ':20' ...................... RED (discriminated)
  F1 target self (nearest-wrong) -> reaches only slot 0, not all 3 allies ........... RED (discriminated)
  F2 burstCdr removed (nearest-wrong) -> FB count drops 6->5 (the F2 PIN fails) ..... RED (discriminated)
  F6 trigger fullBurstEnter (nearest-wrong) -> recovery fires on FB-START not cast .. RED (discriminated)
  F6 heal removed (nearest-wrong) -> no recovery source, crown recovery never fires . RED (discriminated)

DOCUMENTED RESIDUAL (not a vacuous test — a genuine B1 discriminability limit, flagged for owner spot-check):
  F2 trigger identity fullBurstEnter vs burstCast is NOT behaviorally discriminable for a Burst-I unit whose own
  cast opens every chain (her burstCast and the team fullBurstEnter fire the same number of times, ~82 frames
  apart, so the cadence effect is near-identical). The F2 PIN discriminates block-PRESENT/fires (base > noCdr)
  and implicitly kills oncePerBattle (the block fires on all 6 FBs, not just the first); the fullBurstEnter-vs-
  burstCast choice rests on the prose ("when entering Full Burst") + fable S2b convergence, not a behavioral RED.

VERDICT: no test is GREEN under both shipped and its counterfactual (none vacuous). Every FAITHFUL pin is GREEN
vs shipped; every named counterfactual is RED. The shipped override is faithful — S3 is a note-marker update only
(no encoding change).

```

## 8. Driver's convergence summary (Qwen driver; cross-family S2b fable / S5-S7 opus)
**S2b (claude-fable-5, pre-op adversarial):** converges with the driver on ALL FOUR load-bearing lines —
casterMaxHpPct (all allies, permanent, 10%/ticket → 20% at cap; fable explicitly rules out targetMaxHpPct and notes
the grant is offensively inert), burstCdr 7.48 on fullBurstEnter (NOT oncePerBattle, NOT burstCast), burst heal 32.26
on burstCast (NOT fullBurstEnter; fable flags "drop as defensive" as the trap → it is a MISSING not UNMODELED), and the
three UNMODELED lines (S1 discount-removal; S2 HP<15% heal "structurally unreachable, NOT measurement-gated"; S2 First
Train Discount). leakDetected null. Only modeling note: fable describes the ticket ISSUANCE as a dual trigger (passive
battle-start + burstCast, cap 2); the driver collapses this to the steady-state flat passive 20 because the engine has
no stack primitive and the grant is damage-inert — a documented ⚑, resolves toward the driver.

**S5 (claude-opus-4-8, blind test-writer):** spec table converges on all six lines (A casterMaxHpPct FAITHFUL/inert;
B burstCdr FAITHFUL; C discount-removal GAP; D HP<15% heal GAP; E First Train Discount GAP; F burst heal FAITHFUL/
tandem-relevant). leakDetected null. **RUN UNMODIFIED vs the driver's override: SUITE ERROR — 0 tests run
(`describe is not defined`: the blind test omits `import {describe,it,expect} from 'vitest'` and vitest globals are
NOT enabled). Even if loaded, two further blind-harness artifacts would confound it: (a) its counterfactual helpers
iterate `ov.blocks || []` but the override shape is {skill1,skill2,burst} (no `blocks` field) → setCdr/zeroMaxHp/
stripHeals are NO-OPS; (b) it filters `e.stat === 'casterMaxHpPct'` but the engine emits `stat:'maxHpFlat'` (FACT 1)
→ the A-grants filter matches nothing. Classified DOCUMENTED BLIND HARNESS ARTIFACT (identical class to the takina/tove
`o.blocks` no-op), NOT an override divergence. Convergence is established by the fixture-independent spec table + the
S6 override, not this run.** The blind agent also documented the dual-B1 caveat (it used controlComp, which seeds liter
as a 2nd B1, so it had to skip the assertions needing Soline's own cast; the driver's custom sole-B1 fixture
[soline/crown/ada] avoids this and asserts the burst-heal tandem strictly).

**S6 (claude-opus-4-8, blind override-writer):** independently reproduces the driver's EXACT encoding —
skill1[0] passive casterMaxHpPct 20 to allies; skill1[1] burstCdr 7.48 fullBurstEnter to allies; skill2 []; burst[0]
heal burstCast to allies; the SAME three unmodeled lines (S1 discount-removal, S2 HP<15% heal + ticket▼1, S2 First
Train Discount) with the SAME reasoning (HP<15% trigger cannot fire — immortal boss / no HP pool); and the SAME ⚑
flags (ticket steady-state 20 with 10→20 ramp; passive trigger as steady-state stand-in for the dual issuance; heal
amount event-only). leakDetected null. Only cosmetic diffs: `maxStacks:2` on the passive casterMaxHpPct (a no-op for
a once-applied passive) and `ticks:1` on the heal (the default). STRONG cross-family corroboration of the driver's
structure.

**Overall: CONVERGENT.** Both cross-family re-derivations (fable pre-op spec; opus blind override) agree with the
driver on every disposition and trigger identity; the opus blind override reproduces the driver's encoding line-for-
line. The S5 blind test is a documented harness artifact (suite error), with convergence carried by its spec table + S6.

---

Grade the driver's implementation against ground truth + the two blind re-derivations per the method above and return
ONLY the verdict JSON (the RECONCILING-JUDGE.md contract). Magnitudes are owner/measurement-gated and OUT OF SCOPE
(tag each with its tier; do not flag a magnitude unless it contradicts the prose's own number). Save to
`scripts/kit-autonomy/results/soline-frost-ticket.json`.
