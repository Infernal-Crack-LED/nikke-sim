# Miranda — kit-autonomy gauntlet manual-review (2026-07-25)

**Slug:** `miranda` (Miranda (Treasure), nickname `tmiranda`) · SMG / Supporter / Fire / Burst I · cd 20s · Elysion
**Verdict:** **GO** (cross-family corroborated) · **faithfulness 1.0** · **Tier 2** · judge `claude-opus-5`
**Basis:** TREASURE kit (owner screenshot 2026-07-13; DB favorite-item prose matches line-for-line since 2026-07-17).

## What this gauntlet changed (two FIXES, both independently re-derived by the blind roles)

The override was previously "reconciled / hand-authored" (2026-07-17) with two S1 Hit Rate lines
dropped to `unmodeled` and the S2 "1 round" crit snapshot shipped as a wall-clock `durationSec 1.5`.
This gauntlet made two minimum-faithful edits:

- **FIX-A — un-dropped the two S1 Hit Rate lines.** They were dropped under "hard rule 4" _pending
  CONE_DELTA_ (the 2026-07-17 note literally says "re-evaluation queued (kit-audit plan 2026-07-20)").
  CONE_DELTA landed 2026-07-19 and `hitRatePct` is now live-wired for accuracy-circle weapons
  (AR/SMG/SG); the modernia gauntlet (2026-07-25) ships the identical stat. Hard rule 4 gates the
  _magnitude_ of the HR→core lift (measured-only), not the existence of the stat. Now encoded:
  `hitCount 30 → allies hitRatePct 5.44 / 5s` and `hitCount 30 → alliesOfWeapon SMG hitRatePct 3.79 / 5s`.
  Load-bearing on miranda herself (the only accuracy-circle unit in the audit fixture — crown MG /
  ada RL / helm SR keep the flat base core rate), so +9.23% lifts her own core fraction.
- **FIX-B — "for 1 round(s)" → `durationShots 1`.** The S2 "1 highest-final-ATK ally Crit Rate
  85.42% for 1 round" line was shipped as `durationSec 1.5` ("one SR carry shot"). "1 round" is
  round-count language, identical to helm's "10 round(s)" (`durationShots 10`, helm H9); the engine
  decrements `shotsLeft` on the HOLDER's shots (sim.ts:2955). Re-encoded `durationShots 1` / no
  wall-clock expiry = the buffed ally's next ONE shot at +85.42 crit for ANY carry cadence. The old
  1.5s was ~1 shot on an SR (where it was authored and looked right) but ~30–36 shots on an SMG — a
  cadence-dependent over-credit. The judge ranked this "the substantive win."

`unmodeled` is now empty for all three slots (this is a pure stat-buff support kit — no damage
riders, DoTs, weapon swaps, heals, shields, gauge or ammo lines, so nothing is silently dropped).

## Line-by-line (all 9 FAITHFUL)

| Line                                                   | Encoding                                                                                             | Disposition      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------- |
| S1 30 hits → allies HR 5.44% / 5s                      | `hitCount 30 / allies / hitRatePct 5.44`                                                             | FAITHFUL (FIX-A) |
| S1 30 hits → SMG allies HR 3.79% / 5s                  | `hitCount 30 / alliesOfWeapon SMG / hitRatePct 3.79`                                                 | FAITHFUL (FIX-A) |
| S1 30 hits → self ATK 50.06% / 5s                      | `hitCount 30 / self / atkPct 50.06`                                                                  | FAITHFUL         |
| S2 FB enter → allies Crit Dmg 32.99% / 10s             | `fullBurstEnter / allies / critDamagePct 32.99`                                                      | FAITHFUL         |
| S2 FB enter → self Crit Rate 30.1% / 10s               | `fullBurstEnter / self / critRatePct 30.1`                                                           | FAITHFUL         |
| S2 FB enter → self Attack Dmg 23.7% / 10s              | `fullBurstEnter / self / attackDamagePct 23.7`                                                       | FAITHFUL         |
| S2 FB enter → top-1 final-ATK ally CR 85.42% / 1 round | `fullBurstEnter / alliesTopAtk count 1 excludeSelf byFinalAtk / critRatePct 85.42 / durationShots 1` | FAITHFUL (FIX-B) |
| Burst → top-2 final-ATK allies ATK 40.4% / 10s         | `burstCast / alliesTopAtk count 2 excludeSelf byFinalAtk / atkPct 40.4`                              | FAITHFUL         |
| Burst → top-2 final-ATK allies Crit Dmg 56.23% / 10s   | same block / `critDamagePct 56.23`                                                                   | FAITHFUL         |

## Cross-family convergence

- **S2b (claude-fable-5, pre-op test review):** all 9 lines FAITHFUL, zero UNMODELED; independently
  named both fixes (HR as `hitRatePct` allies + `alliesOfWeapon SMG`, "Miranda holds 5.44+3.79=9.23";
  "for 1 round" = `durationShots 1` "the single highest-risk line"). 0 driver/reviewer divergences.
- **S5 (claude-opus-5, blind test):** written from kit prose alone, run against the driver override —
  **15 passed / 2 skipped / 0 failed**. The 2 skips are the blind agent's own declared gaps (exact
  5s/10s window length; byFinalAtk-vs-static ranking, neither constructible blind). Critically, the
  blind test ran a DIFFERENT, two-Burst-I fixture (liter/crown/miranda/helm) than the driver
  (miranda/crown/ada/helm, sole B1) — that two-B1 fixture is exactly what separates `fullBurstEnter`
  from `burstCast` on skill2, so the trigger split is cross-fixture corroborated.
- **S6 (claude-opus-5, blind override):** **semantically identical** to the shipped override
  (note/caveats prose stripped, key-order normalized), including both fixes, `byFinalAtk`×3,
  `burstCast`-vs-`fullBurstEnter`, and empty `unmodeled`.
- **S7 (claude-opus-5, reconciling judge):** binding verdict GO / 1.0 / no gotchas / discrimination OK.

## Residuals for the owner to spot-check (none verdict-changing)

1. **HR→core magnitude is derived, not measured.** The additive-in-pp composition of 5.44 + 3.79
   into one R(hr) is UNVALIDATED (R8); every agent inherited the same assumption. Recipe (in the
   override note): CORE HIT popup fraction inside vs outside the ~5s post-30-hit window in a Miranda
   focus video, on an AR/SMG/SG ally. The buff VALUES are kit-literal; only the damage consequence is
   derived. HRCORE-gated (live by default).
2. **`hitCount 30` is keyed to LANDED rounds** (prose "after landing 30"). If in-game SMG landing
   fraction < 1 the true proc interval is longer than the sim's. Note the live SMG rate is the
   frame-quantized 20/s (1440 rpm does not divide 60fps evenly), not the nominal 24/s, so the ~1.5s
   cadence figure is the correct one. With a 5s duration on a ~1.5s interval the buffs saturate, which
   makes the model insensitive to moderate cadence error — but a large landing shortfall would break
   that saturation. Unmeasured.
3. **`byFinalAtk` (live effectiveAtk ranking)** on all three highest-final-ATK targets is the
   literal-prose reading and all three agents agreed, but both blinds declared the static-vs-live
   ranking NOT discriminable in their fixtures — convergent-by-reading, not proven by test. Coverage
   gap, not a defect.

## Board impact

None. Miranda is MODEL_ONLY (never fielded, not owned, `board: null`). `board-read | grep miranda`
returns no rows before or after; no graded comp is perturbed. `simSupported` was already `true`.

## Artifacts

- Driver test: `scripts/tests/units/miranda.test.ts` (22 assertions; pre-S3 RED = the 7 FIX-line
  assertions, post-S3 all green).
- Override: `src/skills/overrides/miranda.json`.
- Cross-family: `scripts/kit-autonomy/cross-family/miranda/{s2b,s5,s6,s7}-packet.md` + `*-result.json`.
- Blind: `scripts/kit-autonomy/blind/miranda.{test.ts,adapted.test.ts,override.json}`.
- Verdict: `scripts/kit-autonomy/results/miranda.json` (+ `miranda-judge-packet.md`).
- S2b review: `scripts/kit-autonomy/reviews/miranda.{test-review.json,verify.txt}`.
