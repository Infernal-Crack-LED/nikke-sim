# Manual review — folkwang (Folkwang)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discriminationOk true).
Kit-autonomy gauntlet 2026-08-03. Tier 1 (clean-weapon-like unit — zero damage lines and zero
weapon-state modifiers in the whole kit; the encoding is event channels + one offensively-inert
self-stat: two shield channels, one burst-keyed recovery stream, one self Max HP grant).

AR / Defender / Water / Burst II, 40s CD, ammo 60, reloadFrames 99, chargeFrames 0, hitsPerShot 1.
folkwang is one of the six CLEAN-WEAPON BASIS units (the AR cell, `CLEAN_WEAPON_TEAMS.a`) and the
owner-confirmed "only AR with zero damage-touching lines including her burst" (clean-weapons.test.ts
P1 note, owner ruling 2026-07-23 — kurumi was rejected for a normal-attack-counter rider). Her kit
is pure tank/sustain: two activation-clause-less timer passives (S1 30s, S2 20s) and a burst, all
shields / Max HP / taunt / recovery. The sim models no HP pool, no incoming-healing multiplier and
no enemy targeting, so her load-bearing in-domain surface is FOUR event/stat channels; her personal
damage is weapon-only and her board value is tandem (shield consumers such as naga, recovery
consumers such as asuka). Landing her required the CW1 invariant (owner ruling 2026-08-01,
option 2): her committed override sims **byte-identical** to the bare empty kit — proven through
the engine in clean-weapons.test.ts (27/27 green with her override on disk).

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                                                     | Disposition          | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1-a | ■ 2 allies with the highest final ATK: Creates a Shield equal to 13.71% of the skill user's final Max HP for 10 sec | FAITHFUL (event)     | `interval 30` (no activation clause = internal-cooldown passive; first fire t=30 per the engine phase convention ⚑) → `alliesTopAtk {count:2, byFinalAtk:true}` (the A3 literal-word reading of "highest FINAL ATK") → `shield {maxHpPct:13.71, durationSec:10}`. The kit text literally says SHIELD — the event + 10s shieldedUntilFrame window fire the recipients' 'shielded' triggers / requiresShielded gates; the HP magnitude is recorded, not consumed (no shield pool). Pinned: naga's shielded-trigger S1 fires 5 interval + folkwangBursts times; an interval-20 counterfactual (S2's CD misread) fires 8; shield-as-heal silences the S1 contribution AND over-fires the recovery channel by exactly 5; stripping S1 collapses to the burst shields alone.                                                                                                                                                                                                                                                          |
| S1-b | Incoming healing ▲ 45.7% for 10 sec                                                                                 | UNMODELED (verbatim) | No incoming-healing StatKey and no HP pool for it to amplify — and 'recovery' triggers fire per heal EVENT regardless of amount, so the amplifier cannot change any consumer in v1 (S2b observation, three-way converged). Pinned: the line lives verbatim in `unmodeled.skill1`; 45.7 never surfaces as a buff value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| S2-a | ■ the enemy with the highest final ATK: Taunt for 5 sec                                                             | UNMODELED (verbatim) | v1 models no aggro/targeting — resolveTargets({kind:'enemy'}) returns [] (the boss deals no damage to anyone). NOT fabricated as a targetStatus (that channel exists for kit-NAMED gateable statuses such as d-killer-wife's Wipe Out) and NOT as a damageTakenPct debuff (taunt is not a damage-taken modifier — encoding it as one would over-credit the whole team). Pinned: verbatim in `unmodeled.skill2`; folkwang originates no boss-side effects.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| S2-b | ■ self: Max HP ▲ 44.96% for 10 sec                                                                                  | FAITHFUL (inert)     | `interval 20` → `self` → `buff targetMaxHpPct 44.96 durationSec:10` — the schema's stat for "Max HP ▲ X%" kit lines (blanc/maiden convention), which flat-resolves to maxHpFlat at apply. NOT the raw `maxHpPct` key: only the cube/OL-extra path converts that one (sim.ts:887); an override buff authored with it is applied as a stat nothing reads and would silently do nothing — the raw-key counterfactual is proven RED (zero maxHpFlat events). Self-targeted so the e3 rule permits the feed into her OWN atkOfMaxHpPct, which she does not carry → offensively inert in v1; kept for kit completeness (marciana's inert-defPct convention) with real 10s-uptime/20s-cadence downtime. Pinned: exactly 8 self maxHpFlat buffApply events (t=20..160); stripping S2 silences the channel and leaves her own total unchanged.                                                                                                                                                                                           |
| BU-a | ■ 2 allies with the highest final ATK: Creates a Shield equal to 32.9% of the skill user's final Max HP for 10 sec  | FAITHFUL (event)     | `burstCast` (OWN cast — she is Burst II; fullBurstEnter would over-fire every shielded trigger on the chains a competing B2 carries) → `alliesTopAtk {count:2, byFinalAtk:true}` → `shield {maxHpPct:32.9, durationSec:10}`. Pinned: stripping the burst collapses the shield channel to the 5 interval firings; the DIV falls out of the fixture — the competing B2 (naga, 20s CD) opens 3 chains folkwang does not cast, and a fullBurstEnter counterfactual over-fires the naga channel by exactly those 3 chains (fullBursts 7 > folkwangBursts 4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| BU-b | Recovers 65.81% of attack damage as HP over 10 sec                                                                  | FAITHFUL (event, ⚑)  | `heal {ticks:10, intervalSec:1}` on the SAME top-2 byFinalAtk target, in the same burstCast block — the marciana convention for the IDENTICAL construction ("Recovers 10.95% of attack damage as HP over 3 sec" → her owner-landed override models it as ticks:3): event-only TANDEM value (fires the recipients' 'recovery' triggers), magnitude unmodeled (no HP pool), tick count the ⚑ estimate — in game the recovery is damage-linked and continuous, not clock-ticked. THE gauntlet's one substantive dispute: the driver initially ruled UNMODELED on the ada/tia lifesteal-skip precedent; S2b, S5 and S6 ALL independently converged on the HoT encoding, and the marciana analog (owner-landed, same batch line) settled it — the driver revised to MODEL at S3-rev. Pinned: asuka's recovery consumer fires asukaBursts + 10×folkwangBursts exactly; a ticks:1 counterfactual collapses to one landing per cast; dropping the rider collapses to asuka's own lifesteal alone; 65.81 never surfaces as a buff value. |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5.** Converged on five of six lines: interval
  triggers on the datamined passive CDs (first fire t=CD), alliesTopAtk{2, byFinalAtk:true}
  mandatory on every "highest FINAL ATK" header, burstCast-not-fullBurstEnter on the burst block
  ("she is a B2; in any comp with another B2 the wrong key over-fires"), targetMaxHpPct-not-
  maxHpPct independently derived ("the Vigor-cube authoring key"), and the incoming-healing +
  taunt lines UNMODELED on identical reasoning. The ONE divergence: the burst lifesteal — fable
  argued for a heal ticks:10 tandem stream ("taxonomy rule 4: never skip a heal line on
  isolation grounds"). Referred to S7; resolved in the blinds' favor at S3-rev (marciana
  precedent). Also flagged the fixture trap that sank S5: controlComp seats the audited unit in
  the B3 slot — a B2 unit there needs a bespoke fixture to cast at all.
- **S5 blind test writer — claude-opus-5.** 19 tests (17 live + 2 GAP skips) on a
  controlComp('folkwang') fixture. vs the driver override: **4 PASS / 13 FAIL / 2 SKIP**, and
  the binding judge ruled ALL 13 failures blind-side artifacts, not encoding faults:
  (1) fixture vacuity — controlComp puts the B2 audited unit in the B3 slot; folkwang casts ZERO
  bursts there (her own sanity guard caught it — the exact trap S2b pre-warned); (5) assertions
  reading a `kind:'shield'` SimEvent that does not exist in this engine (shield landings are
  observable only through a consumer's shielded-trigger block — the driver's naga fixture);
  (3) assertions reading a `kind:'recovery'` SimEvent that does not exist (recovery surfaces
  through recovery-trigger consumers — the driver's asuka-control fixture; the HoT encoding the
  blind test DEMANDS was adopted at S3-rev and is green there); (1) an `incomingHealingPct` buff
  demanded for the line every other reviewer ruled unmodelable (S5's own gap note flagged it);
  (2) `.blocks`-shaped override mutations (slots are arrays — TypeError); (1) `durationShots`
  toBeUndefined failing on an explicit null. Genuine greens: the maxHpFlat self-grant target-set
  pin and the zero-damage-stats check.
- **S6 blind override writer — claude-opus-5.** Convergent block structure on every line:
  interval S1/S2 triggers, alliesTopAtk{2, byFinalAtk:true} on both shields, burstCast burst
  block, shield {13.71/32.9, durationSec:10}, burst rider heal ticks:10 intervalSec:1,
  unmodeled incoming-healing + taunt. TWO divergences, both blind errors the driver is
  verifiably correct on: (1) both passive intervals written `sec:40` (ground truth:
  skillCooldownsSec 30/20 datamined); (2) the Max HP stat written as the raw `maxHpPct` cube
  key, which an override buff cannot convert (the driver's targetMaxHpPct flat-resolves to
  maxHpFlat — engine-verified, and S2b/S5 independently warned about exactly this trap).
- **S7 binding judge — kimi-code/k3.** GO, faithfulness 1.0, zero gotchas, discriminationOk
  true. All six kit lines FAITHFUL (4) or three-way-converged DOCUMENTED_GAP (2); the
  lifesteal-rider dispute explicitly resolved in the blinds' favor with the marciana precedent
  named; S5 reds ruled 13/13 mechanical/recon; S6 divergences ruled blind errors; CW1
  byte-identity + non-vacuous per-unit inertness (team totals move through the tandem channels
  while folkwang's own never does) credited as the load-bearing discrimination.

## Residual flags (owner spot-check cluster — judge-named, ⚑ with recipe)

1. **Interval first-fire phase (t=CD vs t=0)** — both passives use the engine-wide interval
   convention (first fire at t=sec); the in-game first-fire phase of folkwang's cooldown
   passives is unmeasured. Recipe: any focus video — does Starting Whistle's shield appear in
   the opening seconds or only after ~30s? A wrong phase shifts every shielded-trigger
   consumer's cadence by up to one period. Moves no damage of folkwang's own.
2. **Burst HoT ticks:10 count** — the marciana-convention reading of "over 10 sec" (one tick
   per second), not a measured cadence — in game the recovery is damage-linked and continuous,
   so the real event rhythm follows the recipients' attack cadence. Recipe: a recovery-consumer
   frame-read (crown-type buff-icon windows) on a folkwang-bursting comp. Scales only how often
   teammates' on-recovery consumers fire; moves no damage of folkwang's own.
3. **Cadence tuple (always-⚑)** — AR rate_of_fire 720 / reloadFrames 99 / ammo 60 shipped from
   datamine; affects folkwang's OWN shots only (weapon damage + burst-gauge feed). No kit line
   keys off her shots, so a wrong cadence rescales nothing kit-side — not escalated.
