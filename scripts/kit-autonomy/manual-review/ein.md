# Kit-autonomy gauntlet — `ein` (Ein, SR / Attacker / Electric / Burst III) — manual review

**Date:** 2026-07-25 · **Verdict:** GO (cross-family corroborated) · **Faithfulness:** 1.0 · **Tier:** 2

Ein is an Electric sniper who fights largely through summoned **Near Feathers**: she enters battle with
4 feathers already summoned, each feather strikes for true damage on summon, her Burst III summons 6
more and raises her own True Damage + Charge Damage for 10s while nuking the highest-DEF enemy, and she
gains a 10s ATK buff whenever the team's burst chain reaches Stage 3 (her own cast **or** a co-B3's).

## Cross-family corroboration

| Role | Model | Outcome |
| ---- | ----- | ------- |
| S2b test-faithfulness review | claude-fable-5 | all 8 kit lines FAITHFUL; converged with driver |
| S5 blind test writer | claude-opus-5 | 18/24 green vs driver override; 6 red = documented divergences; 4 skip (blind's own unobservables) |
| S6 blind override writer | claude-opus-5 | independently re-derived the driver's encoding from prose alone |
| S7 reconciling judge (binding) | claude-opus-5 | **GO**, faithfulness 1.0 |

**Triple-corroborated reads** (the high-risk ones, all gotten right blind):
- `stageEnter:3` for the ATK 70.12% buff — **not** `burstCast` (which would halve uptime against a co-B3).
  Both blinds independently named `burstCast` as the nearest-wrong. Driver test E1 now discriminates this
  with a strict `>` (12 applies > 6 ein casts) **and** a frame check (≥1 apply lands on a rotation ein did
  not cast).
- `burstCast` (not `fullBurstEnter`) for the burst self-lines — both blinds named `fullBurstEnter` as nearest-wrong.
- The 10-target nuke clause collapses to **one** instance vs the single partless boss (never ×10).
- Summon-folding: the engine has no summon primitive, so each feather's 90.81% true payload is authored at
  its summon site (all three agents did this independently).

## What changed in the override (this gauntlet)

1. **Battle-start 4 Near Feathers now modeled** (was `unmodeled.skill1`, "skipped as minor"). A `passive`
   flatDamage fires **exactly once at frame 0** (verified), so the 4 feathers fold into one
   `4×90.81 = 363.24%` true noRange hit at t=0. Test E8 pins frame 0, magnitude 4×90.81, true-rider flags.
2. `note` += gauntlet date + the S2-charge justification; `caveats` rewritten into ⚑ estimate/recipe/tier form.

## Driver-vs-blind divergences (all documented, none a silent drop)

1. **Feather cadence (⚑2, measurement-gated, high leverage).** Driver ships 34 feathers per her burst
   (`burstCast` lump 3087.54) + 6 per full-burst-end trickle (544.86), sourced to **Prydwen** (community),
   not kit-derivable — the kit only states 4 at battle start + 6 summoned at burst. Both blinds independently
   derived the kit-literal 6/burst; S6 itself flagged "if feathers persist and attack repeatedly, this model
   UNDERSTATES her." **Internal-consistency note (judge gotcha 2):** the model is not self-consistent about
   whether feathers repeat — 4 battle-start summons yield 4 hits while 6 burst summons yield 34. **Recipe:**
   ein-focus recording (U8) counting true-damage popups per burst window + per inter-burst window settles
   34 / 6 / the battle-start 4 in one pass. Do not tune the count against the board.
2. **F1 ordering (⚑3, med).** The 3087.54 `burstCast` feather lump resolves at cast-instant in the skill2
   slot, **before** her own True Damage ▲55.3% burst buff registers — removing that buff costs only ~0.7% of
   her total, i.e. the lump is under-credited ×1.553. **Judge note:** damage-calculation §5b (cinderella worked
   example) makes this SSOT-derivable today (a caster's OWN cast-granted buff DOES apply to its own burst
   damage) — but it must land **together with** the cadence measurement, because both errors push the same
   direction and may currently be cancelling. Fix: move the lump below the burst buff block (or ≥1-frame
   delaySec), ENV-gated default-OFF, after U8.
3. **S2 Charge Damage 80% "for 1 shot" (low).** Driver ships a permanent passive; both blinds authored
   `shotFired` + `durationShots:1`. Driver **verified** `durationShots:1` on a per-shot trigger is mechanically
   infeasible (shotFired applies the buff AFTER the shot's damage is computed → zero benefit, identical to
   removing it). For an SR that always full-charges the permanent passive is the faithful steady-state (differs
   only on the fight's first shot, ~1 of ~120 pulls). **Judge note:** if the driver's observation holds, that is
   an ENGINE ordering defect in the `shotFired`+`durationShots` interaction (would silently zero every future
   "for N shot(s)" per-shot buff) — file it against the durationShots primitive, not ein.
4. **Orb burst-gauge dot (datamined, non-kit).** Zero-damage permanent dot (interval 2.83s) driving team burst
   gauge — datamined arena data (`special_burst_gauge` 5.6 / 170f), not kit prose, so the prose-only blinds
   could not derive it. Excluded from the kit-faithfulness fraction. E7 now asserts the gauge side-effect
   (removing the dot shifts ein's total through its only channel, gauge — burst count is saturated in the
   control comp but the timing shift is observable).

## OWNER RESIDUALS (spot-check cluster)

- **⚠ crit-on-true-damage scope (judge gotcha 1, ENGINE, high).** Ein's true-flavored flatDamage riders
  (feathers + nuke) are crit-eligible, and tests E4/E5 **pin** `critEligible === true`. game-mechanics.md §9
  states "TRUE DAMAGE NEVER CRITS (owner ruling 2026-07-21; engine `crit && !trueFlavor` guard) … flavor:'true'
  dots/flatDamage … are crit-exempt." **Driver verification: the engine has NO such guard** — `grep 'crit &&
  !trueFlavor' src/engine/sim.ts` returns zero matches; the flatDamage path is `crit: e.crit !== false`
  (defaults true) with no trueFlavor gate, and the probe confirms ein's feathers/nuke roll crit. damage-calculation.md
  §2c states the same ruling but names **dots only** (ada's grenade DoT). So the two SSOT docs disagree (§9
  dots/flatDamage vs §2c dots) and §9's claimed guard is absent from the code. The override note rests on
  "Prydwen-confirmed feathers crit" — a community claim sitting above the 2026-07-21 owner ruling. **Owner to
  rule:** do Near Feathers crit in game? If §9 stands as written, the engine must apply `crit && !trueFlavor`
  to flatDamage too and the E4/E5 pins invert (−7–15% on the bulk of ein's output, cross-cutting to every
  true-flavor unit, ada et al.); if the carve-out is truly dot-only, amend §9 so the docs stop contradicting
  the code. S4 forbids the driver from touching `src/engine/**`, so this is left as a documented residual.
- **Feather cadence + F1 ordering** (⚑2/⚑3 above) — one ein-focus recording (U8) settles both; land together.
- **durationShots primitive ordering** — file the `shotFired`+`durationShots:1` zero-benefit repro against the
  primitive (engine), independent of ein.

## Verification

- `npx tsx scripts/validate-overrides.ts ein` → valid (3 ⚑ warnings = the measurement-gated caveats).
- `npx vitest run scripts/tests/units/ein.test.ts` → 23/23 green (E1–E8, each FAITHFUL line pinned green vs
  shipped **and** red vs counterfactual; discrimination strengthened per judge: E1 strict-`>` + frame check,
  E7 gauge side-effect).
- Board: ein mean 0.725 COLD (unchanged from 0.7228; battle-start feathers negligible on board comps).
