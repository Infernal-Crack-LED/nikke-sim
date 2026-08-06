# Manual review — emma (Emma, BASE)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discrimination ok).
Kit-autonomy gauntlet 2026-08-05. Tier 2 (burstCast-vs-fullBurstEnter lever on the burst lines +
the out-of-domain attacked-trigger cluster). Clean-weapon unit — the landing rides the CW1
damage-neutrality proof (owner ruling 2026-08-01, "option 2"), which passes with the override on
disk.

MG / Supporter / Fire / Burst I, 40s CD, ammo 300, Elysion. **Base unit** — NOT
`emma-tactical-upgrade` (the environment-setup Burst I variant; a different kit, already
gauntleted 2026-07-27). Emma is a PURE HEALER and one of the six clean-weapon basis units
(`scripts/tests/lib/harness.ts` `CLEAN_WEAPON_TEAMS.b`, the MG representative): her kit
contributes NOTHING to damage. Every skill line is either a recovery EVENT (a heal — the engine
models it as an event that fires teammates' on-recovery consumers, NOT a number; there is no HP
pool / survivability sim) or an out-of-domain sustain line with no engine primitive. Her personal
damage is weapon-only; her board value is tandem (she refreshes recovery-consumer teammates such
as Asuka/Crown).

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                                             | Disposition          | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1   | ■ 5% chance to activate when attacked → all allies: Recovers 10.77% of the skill user's final Max HP as HP | UNMODELED (verbatim) | The sim has NO incoming-damage model and NO attacked trigger primitive (`TriggerDef` has no on-damaged kind), and the v1 boss never acts — the proc can never fire at scope lock. An interval-cadence proxy would fabricate a proc rate from nothing (jackal/maiden/admi attacked-cluster precedent). Pinned: the line lives verbatim in `unmodeled.skill1` (never an `ignored` drop); emma originates ZERO buffs; 10.77 never appears as any buff value. ⚑1 out-of-domain with estimate + recipe (needs an attacked trigger + a boss attack cadence model).                                                                                            |
| S2   | ■ Activates when above 90% HP → all allies: Incoming healing ▲13.33% continuously                          | UNMODELED (verbatim) | No incoming-healing StatKey exists and heal effects carry no HP quantity to amplify; no HP pool. The >90% HP gate is trivially OPEN in v1 (nobody takes damage), so the omission reason is the missing stat primitive, NOT a dead gate (S2b pre-registered exactly this trap). The nearest-wrong encoding — `kind:'heal'` misread from "continuously" — would emit a permanent recovery stream and over-credit every on-recovery consumer; it is pinned structurally (heal appears only in the burst blocks, keyed burstCast). Pinned: 13.33 never appears as any buff value; emma emits zero buffApply events. ⚑2 out-of-domain with estimate + recipe. |
| BUa  | ■ all allies: Recover HP equal to 39.6% of the skill user's final Max HP                                    | FAITHFUL (event)     | `burstCast` → `heal` ticks:1 to all allies. Keyed to her OWN cast, NOT fullBurstEnter — and the fixture makes the two keyings diverge in BOTH directions (calibrated 180s anatomy: 5 emma casts — 1 opens a Full Burst, 4 stall before the chain completes on asuka's 40s B3 CD; 4 Full Bursts — 1 emma-led, 3 opened by liter). Pinned: isolating the instant line (HoT stripped) leaves recovery firings == emma's burstCast count; the fullBurstEnter counterfactual produces a strictly different volley set (6×4=24 landings vs 6×5=30); structural pin asserts burstCast on every burst block. Magnitude out-of-domain (no HP pool).                   |
| BUb  | ■ all allies: Recover 39.6% of attack damage as HP over 5 sec                                               | FAITHFUL (event)     | `burstCast` → `heal` ticks:5 intervalSec:1 to all allies — a 5-second recovery cadence across the lifesteal window. Tick count is a flagged ⚑3 CONVENTION ("over 5 sec" has no per-second clause; marciana's "over 3 sec" → ticks:3 precedent); it directly scales on-recovery consumer refresh and is the only number in the kit that moves anything measurable. Pinned: base == 6 recovery landings per cast (1 instant + 5 HoT) through asuka's consumer; a ticks:1 counterfactual collapses to 2 per cast. Magnitude out-of-domain (no HP pool).                                                                                                                                                 |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5:** converged on all 6 line-readings (S1/S2
  UNMODELED for the right reasons; burst L1 burstCast/allies/heal ticks:1; burst L2
  burstCast/allies/heal ticks:5 intervalSec:1). Pre-registered every trap that matters for this
  unit: (1) fullBurstEnter keying diverges because a co-B1 (liter) sits in the fixture; (2) the
  5s lifesteal window must be multi-tick, neither collapsed to 1 nor a permanent HoT; (3) the
  worst available over-credit is reading S2's "Incoming healing ▲ … continuously" as `kind:'heal'`
  (a permanent recovery stream); (4) S1 must never get an invented interval-proc cadence; (5) the
  >90% HP gate is trivially OPEN, not dead. All five adopted in the driver test; the driver-held
  deltas (with precedent): full verbatim prose including ■ markers in `unmodeled`, and heal
  magnitudes documented in caveats rather than `unmodeled.burst` (marciana precedent). The
  review's cast-vacuity concern (emma might never cast beside liter) is pre-addressed by the
  custom fixture + non-vacuity gates (emma casts 5× in the fixture).
- **S5 blind test writer — claude-opus-5:** 17 tests (14 live + 3 GAP skips). vs the driver
  override: **9 PASS / 5 FAIL / 3 SKIP**. The binding judge ruled all 5 failures recon artifacts,
  NOT override faults: (a) four assertions observe `'heal'`/`'recovery'` SimEvent kinds the
  engine provably never emits (the log's only kinds are shot/damage/buffApply/buffRemove/reload/
  burstCast/fullBurstStart/fullBurstEnd — heals are observable only via a recovery consumer's
  buffApply, which the driver test does correctly via asuka's self atkPct 96.98); one of those
  also patched `ov.skill1.blocks` on an array-shaped slot (silent no-op); (b) the
  "burst is damage-inert" assertion filters damage events by a nonexistent `srcSlug` field (the
  engine field is `slug`), so it matched EVERY unit's burst damage — the 5 instances it caught
  are helm's. The 9 passes independently confirm: fixture non-vacuity (emma casts ≥2, ≥2 Full
  Bursts, weapon damage > 0), S1/S2 stripped totals-equality (both inert), no offensive
  buffApply from emma, no boss debuff, no weapon-state modifier, whole-kit inertness.
- **S6 blind override writer — claude-opus-5:** FUNCTIONALLY IDENTICAL to the driver override —
  same empty skill1/skill2, same two burst blocks (burstCast → allies → heal ticks:1; burstCast
  → allies → heal ticks:5 intervalSec:1), same unmodeled sets. Only behavioral-neutral diffs:
  the blind splits each unmodeled slot into two entries and drops the ■ marker; caveat wording
  differs. Its independent audit derives the same per-line dispositions, and its ⚑ list names the
  same single knob (ticks:5/intervalSec:1) with the same recipe (count an on-recovery consumer's
  refresh popups across the 5s window). This is the decisive corroboration: blind, opus derived
  the exact same encoding the driver did.
- **S7 binding judge — kimi-code/k3:** GO, faithfulness 1.0, zero gotchas, discriminationOk true.
  All 6 kit lines FAITHFUL (2) or DOCUMENTED_GAP with sound no-primitive reasoning (4); every
  trap S2b pre-registered was avoided by both driver and blind override-writer; the S5 RED ruled
  recon artifacts in full; the driver's 15/15 suite discriminates against each named
  nearest-wrong model (fullBurstEnter volley-set, ticks:1 collapse, heal-as-damage-buff).

## Residual flags (owner spot-check cluster — judge-named, ⚑ with recipe)

1. **⚑3 — the lifesteal cadence ticks:5/intervalSec:1** ("over 5 sec", no per-second clause). A
   shared convention (marciana precedent), NOT a measured tick cadence. It directly scales how
   often on-recovery consumers refresh: a real lifesteal that ticks differently would over- or
   under-credit those consumers (5× either way). Recipe: field emma with a recovery consumer
   whose on-recovery buff has a short, readable duration; cast emma's burst and count the
   consumer's refresh popups across the 5s window. It moves no damage of emma's own.
2. **⚑1 — S1 attacked-5% cluster** (out-of-domain, incoming-damage subsystem). Zero impact at
   scope lock (never fires); intermittently live in real fights. Recipe: needs an attacked
   trigger primitive + a boss attack cadence/targeting model; a focus video reading emma's
   heal-popup cadence under fire would anchor the proc rate before any encoding.
3. **⚑2 — S2 incoming-healing 13.33% + all heal magnitudes** (out-of-domain, heal-magnitude
   subsystem). Zero damage impact (no heal is quantified, so nothing is amplified). Recipe: not
   measurable from damage popups — needs an HP/incoming-healing model first.

None is a fudge; none blocks GO. No board reading exists yet (unit has no real recordings — not
on the accuracy board before or after the flip; `board: null`, tier MODEL_ONLY, tuned false,
generatorSupported stays false).

## Artifacts

- Driver test: `scripts/tests/units/emma.test.ts` (15/15 green)
- Override: `src/skills/overrides/emma.json`
- Results: `scripts/kit-autonomy/results/emma.json` (+ `results/emma-judge-packet.md`)
- Blind: `scripts/kit-autonomy/blind/emma.{test.ts,adapted.test.ts,override.json,blind-run.txt}`
- Cross-family evidence: `scripts/kit-autonomy/cross-family/emma/{s2b,s5,s6,s7}-result.json`
- S2b review: `scripts/kit-autonomy/reviews/emma.test-review.json`
- Verify: `scripts/kit-autonomy/reviews/emma.verify.txt`
- Clean-weapon guard: `scripts/tests/units/clean-weapons.test.ts` 27/27 green with the override
  on disk (CW1 damage-neutrality, bursts-off solo basis); DECISIONS 2026-08-05 entry.
