# Manual review — bay (Bay (Treasure))

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discrimination ok).
Kit-autonomy gauntlet 2026-08-03. Tier 1 (clean-weapon-like unit — zero damage lines and zero
weapon-state modifiers in the whole kit; the encoding is one recovery-event channel plus one inert
defPct buff).

RL / Defender / Fire / Burst II, 40s CD, ammo 6, Tetra. `treasure: true` variant — the ONLY Bay
entry in the data (no base-Bay entry exists; never conflated with `mary-bay-goddess`, the
SR/Water Bay-Goddess variant of Mary). Bay (Treasure) is a PURE TANK: her entire kit is
survivability — damage-taken sharing, cover HP (share / heal / rebuild / Max HP), a continuous DEF
grant, an ally damage-taken reduction, and two HP heals. The sim models no HP pool, no incoming
damage, and no cover, so her load-bearing in-domain surface is exactly TWO lines, both in S1: a
per-full-charge recovery-event channel (tandem value only) and an offensively-inert continuous DEF
buff. Her personal damage is weapon-only.

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                                                | Disposition            | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1a  | ■ using Burst Skill (self alive) → all allies: Proportionally shares damage taken continuously                 | UNMODELED (verbatim)   | No incoming-damage model and no redistribution primitive in v1 — defensive only, zero damage observable. Pinned: bay originates no damage-bucket buff; the line lives verbatim in `unmodeled.skill1` (never an `ignored` drop).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S1b  | ■ using Burst Skill (self alive) → all allies: DEF ▲10.13% of the skill user's DEF continuously                | FAITHFUL (inert in v1) | `burstCast` → `defPct 10.13` to all allies (incl. self), NO durationSec ("continuously" = never expires; re-casts refresh). SEMANTIC APPROXIMATION (marciana precedent): the kit scales off the CASTER's DEF; the schema has no `casterDefPct`, so `defPct` (target-own) stands in — DEF being offensively inert in v1, the distinction has zero observable consequence. "only if self is alive" is scope-trivial (nothing dies in v1). Pinned: applications == bay burstCasts × 3 allies, expiresFrame null; byte-identical totals with the line stripped; a defPct→attackDamagePct counterfactual provably moves totals.                                                                      |
| S1c  | ■ Full Charge attacks → all allies (except self): Recovers 4% of the skill user's final Max HP (TREASURE line) | FAITHFUL (event)       | `chargeCounter count:1` (fires on EVERY full charge — the phase counter resets each time) → `heal ticks:1` to `allies excludeSelf`. An RL unit's every shot IS a full charge (sim.ts `firePull`: "every dumped rocket is a full-charge shot"), so this emits ONE recovery event per bay shot to each of the other two allies. Heal magnitude is event-only (no HP pool); the line is modeled solely for its TANDEM value — it fires teammates' on-recovery consumers (Crown/Asuka "when recovery takes effect"). Pinned: asuka's consumer fires exactly `bayShots` times; a fullBurstEnter counterfactual collapses firings to the FB count; stripping zeroes the channel; own total unchanged. |
| S2a  | ■ using Burst Skill (self alive) → self's cover: Proportionally shares damage taken continuously               | UNMODELED (verbatim)   | Cover is not a sim entity; no incoming damage. Pinned: skill2 blocks EMPTY; no shield/heal effect attributable to this line.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S2b  | ■ Full Burst ends → self: recovers Cover's HP 2.88% of final Max HP every 1 sec for 5 sec                      | UNMODELED (verbatim)   | Cover-HP pool not modeled — and deliberately NOT encoded as a self `heal ticks:5`: cover repair is not a Nikke recovery, and the encoding would emit 5 recovery events to bay at every Full Burst end, falsely firing any teammate on-recovery consumer keyed to bay (S2b pre-registered this exact trap; marciana Storage≠shield precedent). Pinned: exactly ONE heal block in the whole override (the S1c line, slot skill1); 2.88 never appears as any buff value.                                                                                                                                                                                                                           |
| S2c  | ■ entering Burst Stage 1 + cover destroyed → self: Recovers 20% of final Max HP (TREASURE line)                | UNMODELED (verbatim)   | The cover-destroyed gate can never be satisfied at scope lock (boss deals no damage, cover never breaks) — modeling it ungated would invent a recovery event every B1 cast. Pinned: skill2 blocks EMPTY; line verbatim in `unmodeled.skill2`.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| BUa  | ■ self if cover destroyed: Rebuild Cover with 20% HP, once per battle (TREASURE line)                          | UNMODELED (verbatim)   | Same unreachable gate + no cover entity. NOT a `shield` (would falsely fire shielded-trigger gates). Pinned: burst blocks EMPTY; no shield effect anywhere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| BUb  | ■ self: Max HP of Cover ▲18% of the skill user's Max HP for 20 sec                                             | UNMODELED (verbatim)   | COVER Max HP is a different pool from unit Max HP — a `targetMaxHpPct`/`maxHpFlat` encoding would pollute the HP→ATK feed path (`atkOfMaxHpPct`). Pinned: no maxHp-family buff originates from bay; 18 never encoded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| BUc  | ■ all allies: Damage Taken ▼8.87% for 10 sec                                                                   | UNMODELED (verbatim)   | Defensive mitigation on ALLIES; v1 boss deals no damage, so ally mitigation is inert by construction. Deliberately NOT `damageTakenPct` — that stat is a boss-targeted AMPLIFIER (positive = boss takes MORE damage); encoding the ally-side ▼ there would inflate every unit's total each rotation (the largest available over-credit on this unit). Pinned: no `damageTakenPct` buffApply with value 8.87 anywhere in the event log; bay originates none.                                                                                                                                                                                                                                     |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5:** converged on the per-shot full-charge heal as
  the ONLY load-bearing line (tandem via recovery consumers), the seven UNMODELED lines,
  burstCast-not-fullBurstEnter for the DEF line, and the sole-B2 fixture requirement. Pre-registered
  the three traps that matter for this unit: (1) "Damage Taken ▼ 8.87%" reflex-mapped to the
  `damageTakenPct` boss debuff (would inflate the whole team ~9% per rotation); (2) the cover HoT
  mis-encoded as a 5-tick self heal pulsing recovery consumers at every FB end; (3) Bay seated
  beside crown at B2 in `controlComp` never casting. All three adopted as pins. One divergence:
  fable read the S1 DEF line as a pure schema GAP; the driver kept the marciana precedent
  (`defPct` + explicit approximation caveat) — judge ruled for the driver.
- **S5 blind test writer — claude-opus-5:** 23 tests (18 live + 5 GAP skips) with a two-fixture
  design that independently re-derived the B2-contention trap: FX_CTL = controlComp with crown as
  the recovery consumer; FX_SOLE = liter/bay/helm with a self-atkPct-200 marker probe proving bay
  casts before any burst assertion is trusted. vs the driver override: **17 PASS / 1 FAIL / 5 SKIP**.
  The binding judge ruled the sole failure a structural-strictness artifact: expected trigger kind
  `shotFired`, received `chargeCounter count:1` — behaviorally IDENTICAL on an always-charged RL
  (every blind BEHAVIORAL cadence assertion passed against the driver encoding), and chargeCounter
  is the more literal reading of "Full Charge attacks" (it only advances on full charges; shotFired
  would over-fire on any hypothetical partial-charge release).
- **S6 blind override writer — claude-opus-5:** FUNCTIONALLY IDENTICAL except two divergences:
  (1) `shotFired` vs `chargeCounter count:1` for the S1c heal (same equivalence class as S5);
  (2) the S2b cover HoT modeled as `fullBurstEnd → self heal ticks:5 intervalSec:1` under an
  explicit ⚑ ("cover-HP recovery may not count as recovery in game — do NOT widen its target
  without a measurement") where the driver leaves it verbatim UNMODELED. The judge ruled the
  divergence spurious and AGAINST S6: driver + S2b pre-registration + the marciana Storage≠shield
  precedent agree an unmodelable cover mechanic must not emit recovery events it does not have.
  Everything else matched: the defPct line with the identical casterDefPct caveat, the empty burst
  slot, the same unmodeled set, the explicit damageTakenPct rejection.
- **S7 binding judge — kimi-code/k3:** GO, faithfulness 1.0, zero gotchas, discriminationOk true.
  All nine kit lines FAITHFUL (2) or DOCUMENTED_GAP with sound no-primitive reasoning (7); all
  three pre-registered traps avoided by the driver and both blind suites; discrimination live
  (per-shot cadence vs fullBurstEnter/stripped counterfactuals, defPct inertness vs a defAsDamage
  counterfactual that moves totals, damageTakenPct negative pin, S5's non-vacuity probe that the
  mis-encoded 8.87% boss debuff would move team damage).

## Residual flags (owner spot-check cluster — judge-named, ⚑ with recipe)

1. **defPct caster-vs-target approximation** — inert ONLY because v1 has no DEF→damage path; if a
   defensive or conversion consumer ever lands, this line must be revisited first (a true
   `casterDefPct` stat would be needed).
2. **chargeCounter/shotFired equivalence** — rests on the sim.ts claim that every RL dump dispatches
   charged=true. One focus-video cadence read (rounds/min + reload gap — the always-⚑ cadence tuple
   already flagged in the override caveats) would close it; it moves no damage of bay's own.
3. **Fixture reuse** — Bay never bursting in crown-shared-B2 fixtures was handled correctly by both
   blind suites via sole-B2 comps; any future Bay fixture reuse should re-verify the burst-cast
   non-vacuity marker.
