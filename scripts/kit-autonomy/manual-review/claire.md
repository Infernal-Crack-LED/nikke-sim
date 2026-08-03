# Manual review — claire (Claire)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discriminationOk true).
Kit-autonomy gauntlet 2026-08-03. Tier 1 (clean-weapon-like unit — zero damage lines and zero
weapon-state modifiers in the whole kit; the encoding is event channels only: one 3rd-full-charge
recovery channel, one burst-keyed shield channel, one burst-keyed recovery channel).

RL / Supporter / Electric / Burst I, 40s CD, ammo 6, chargeFrames 60, reloadFrames 141, Abnormal.
claire is one of the six CLEAN-WEAPON BASIS units (the RL cell, `CLEAN_WEAPON_TEAMS.b` — heals /
shield only; not SSR, fixture rarity ceiling 2★/core 0). Her kit is pure sustain: a charge-counted
heal, a burst-keyed shield, a burst heal, and a debuff cleanse. The sim models no HP pool and no
debuff list, so her load-bearing in-domain surface is THREE event channels; her personal damage is
weapon-only and her board value is tandem (recovery consumers such as asuka/crown, shield consumers
such as naga). Landing her required the CW1 invariant (owner ruling 2026-08-01, option 2): her
committed override sims **byte-identical** to the bare empty kit — proven through the engine in
clean-weapons.test.ts (27/27 green with her override on disk).

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                                                                                  | Disposition          | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | ■ landing 3 Full Charge attack(s) → 2 ally unit(s) with the highest final ATK: Green Herb: Recovers 2.86% of the skill user's final Max HP as HP | FAITHFUL (event)     | `chargeCounter {count:3, countInFb:3}` → `alliesTopAtk {count:2, byFinalAtk:true}` → `heal ticks:1`. An RL unit's every shot IS a full charge (sim.ts dispatches all dumped rockets charged=true), so the proc is every 3rd RL shot; "landing" == firing (no miss model). `byFinalAtk:true` is the A3 literal-word reading of "highest FINAL ATK". `countInFb:3` is EXPLICIT and load-bearing: the engine defaults the chargeCounter threshold to `countInFb ?? 1` during the 10s after the owner's OWN burst cast (scarlet-black-shadow's lowered-thresholds mechanic) — omitting it would silently accelerate claire's channel to per-shot after every one of her own casts; her kit has no such threshold-change line, so the faithful encoding pins the same threshold in-window. Heal magnitude is event-only (no HP pool); the line is modeled solely for its TANDEM value — it fires the recipients' 'recovery' triggers. Pinned: recovery firings == floor(claireShots/3) + claireBursts; a count:1 counterfactual collapses to per-shot; stripping S1 collapses to the burst heal alone; own total unchanged. |
| S2   | ■ using Burst Skill → all allies: Blue Herb: Creates a Shield equal to 10.13% of the skill user's final Max HP for 10 sec                        | FAITHFUL             | `burstCast` (OWN cast, NOT fullBurstEnter) → `allies` → `shield {maxHpPct:10.13, durationSec:10}`. The kit text literally says SHIELD — the marciana-reverse: where marciana's Storage was deliberately NOT encoded as a shield, claire's Blue Herb MUST emit the shield event (it fires teammates' 'shielded' triggers and opens their 10s requiresShielded windows). Pinned: naga's shielded-trigger S1 fires exactly once per claire cast; naga's requiresShielded burst line rides every naga cast; a shield-as-heal counterfactual silences BOTH shield-gated channels AND over-fires the recovery channel by one landing per cast; a competing-B1 (liter) DIV fixture behaviorally separates burstCast from fullBurstEnter (the sole-B1 main fixture is count-equivalent for the two — S2b pre-registered this trap; adopted at S2c).                                                                                                                                                                                                                                                                            |
| BU-a | ■ all allies: Restores 34.35% of the skill user's final Max HP as HP                                                                             | FAITHFUL (event)     | `burstCast` → `allies` → `heal ticks:1`. One recovery landing on every ally per own cast (instant — no "over N sec" clause in the prose). Magnitude event-only. Pinned: with S1 stripped, recovery firings == claireBursts exactly; 34.35/2.86 never surface as buff values.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| BU-b | ■ all allies: Removes 1 debuff(s).                                                                                                               | UNMODELED (verbatim) | v1 models no debuff list (the partless boss applies nothing to allies), so no cleanse can be enacted and nothing is fabricated in its place. Measurement-gated on the sim ever modeling ally debuffs. Pinned: the line lives verbatim in `unmodeled.burst`; claire originates ZERO buffs of any kind (any buffApply attributed to her would be a fabrication).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5.** Converged on all six spec lines
  (chargeCounter:3, alliesTopAtk byFinalAtk mandatory per the A3 literal-word rule,
  burstCast-not-fullBurstEnter as "the single most likely shared-prior misread in the kit",
  shield effect with maxHpPct 10.13 / durationSec 10, all-allies burst heal, cleanse verbatim
  UNMODELED) and the loadBearingSet. Pre-registered THE fixture trap: claire is Burst I, so any
  fixture where she is the sole B1 makes burstCast/fullBurstEnter count-equivalent — an existence
  check cannot separate them; demanded a divergence comp with a competing B1. Adopted at S2c as
  the DIV fixture (liter 20s B1), which behaviorally discriminates (fullBurstEnter over-fires on
  liter-opened chains). Also adopted: target-set asymmetry pins (S1 top-2 slice vs S2/burst
  all-allies — conflating the two is the named misread in the other direction).
- **S5 blind test writer — claude-opus-5.** 14 tests (10 live-behavioural/structural + GAP skip)
  on a controlComp('claire') fixture; independently re-noted the competing-B1 hazard ("the
  rotation may never select claire — if the non-vacuity probe is the only red, the finding is
  about the fixture"). vs the driver override: **10 PASS / 3 FAIL / 1 SKIP**. The binding judge
  ruled all three FAILs blind-side artifacts, not kit-reading divergences: (1) expected
  `countInFb` undefined — the driver's explicit `countInFb:3` is the MORE faithful realization of
  the blind's own stated intent ("no in-FB threshold change") given the engine's `countInFb ?? 1`
  post-own-cast default the blind could not see (the `count === 3` half of the same test passes);
  (2+3) `hasMagnitude(2.86/34.35)` in-block — the engine heal EffectDef carries NO magnitude
  field (event-only; marciana/bay precedent; S5's own gap notes anticipated this; magnitudes
  recorded verbatim in caveats/note; the tandem consequence is asserted green in both suites).
- **S6 blind override writer — claude-opus-5.** FUNCTIONALLY IDENTICAL block structure: same
  triggers (chargeCounter count:3; burstCast ×2), same targets (alliesTopAtk{2, byFinalAtk:true};
  allies ×2), same shield effect ({kind:'shield', maxHpPct:10.13, durationSec:10}), same
  unmodeled set (burst cleanse verbatim). Two divergences, both schema-knowledge artifacts:
  (1) `maxHpPct: 2.86/34.35` attached to the heal effects — S6's redacted schema excerpt
  contained no heal variant, and S6 itself flagged the field as inference by analogy to shield;
  the real engine heal kind has no such field (driver keeps magnitudes in caveats per the
  marciana/bay precedent); (2) no `countInFb` — the same engine-default blind spot as S5.
- **S7 binding judge — kimi-code/k3.** GO, faithfulness 1.0, zero gotchas, discriminationOk true.
  All six kit lines FAITHFUL (5) or a unanimously-agreed DOCUMENTED_GAP (the cleanse); full
  three-way convergence on every load-bearing structural choice; the driver's suite discriminates
  each line against its nearest-wrong model behaviorally (count:1 / strip-S1 / shield-as-heal /
  no-S2 / bare-kit / competing-B1 fullBurstEnter), and CW1 pins the committed override
  byte-identical to the bare kit.

## Residual flags (owner spot-check cluster — judge-named, ⚑ with recipe)

1. **RL dump charged=true** — the S1 cadence identity (shot-count/3 == full-charge procs) rests on
   the sim.ts dispatch of every dumped rocket as charged=true. One-line grep
   (judge-named same-model residual); a focus-video rounds/min read would close it empirically.
2. **chargeCounter `countInFb ?? 1` default** — claire pins `countInFb:3` against the engine's
   scarlet-black-shadow-inspired in-window default (10s post-own-cast). One-line grep in sim.ts
   (judge-named same-model residual); if that default ever changes, re-read every chargeCounter
   carrier without an explicit countInFb.
3. **Cadence tuple (always-⚑, charge weapon)** — pullsPerSec / reloadFrames 141 / chargeFrames 60
   shipped from datamine; affects the cadence of claire's OWN shots and therefore her S1 recovery
   feed into teammates' on-recovery consumers. Recipe: rounds/min + reload gap from any claire
   focus video.
