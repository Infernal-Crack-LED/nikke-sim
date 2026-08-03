# Manual review — admi (Admi)

Kit-autonomy gauntlet 2026-08-03 · **GO, faithfulness 1.0** (binding judge kimi-code/k3, zero
REAL-GOTCHA, discriminationOk) · Tier 2 · FROM-SCRATCH build (no shipped override existed;
`simSupported` was false before this run).

SR / Supporter / Wind / Burst II, cd 20s. Ammo 6, chargeFrames 60, reloadFrames 125,
chargeMult 250%, gauge 2.7/shot. A pure enabler: her entire damage contribution to a team is
the burst's two 10s team buffs; S1/S2 are out-of-domain at the v1 scope lock (no incoming
boss damage to allies).

## Kit summary

- **S1 "Helping Hand"** — Activates when attacked 20 time(s). Affects all allies. Charge
  Damage Multiplier ▲ 9.59% for 20 sec. → **UNMODELED + ⚑1** (incoming-damage trigger; the
  counter can never accrue at scope lock — noise/yulha precedent).
- **S2 "Kitten's Breath"** (cd 20s) — Affects 2 allies with the highest final ATK. Damage
  Taken ▼ 28.65% for 10 sec. → **UNMODELED + ⚑2** (ally mitigation: no incoming damage, no
  HP pool; the only `damageTakenPct` primitive is a BOSS debuff — wrong direction; encoding it
  would manufacture a phantom team damage gain — noise precedent).
- **Burst "Love Returned"** (cd 20s) — Affects all allies. Reload Speed ▲ 50.91% for 10 sec.
  Critical Damage ▲ 28.34% for 10 sec. → **MODELED**: one `burstCast` block, target `allies`
  (includes self), `reloadSpeedPct 50.91/10s` + `critDamagePct 28.34/10s`.

## Line-by-line

| Kit line                                                      | Disposition  | Encoding / reason                                                                                                                                                        |
| ------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1 "Activates when attacked 20 time(s)"                       | UNMODELED ⚑1 | no incoming-damage channel, no attacked-count trigger primitive (v1 scope lock); never fires                                                                             |
| S1 "Charge Damage Multiplier ▲ 9.59% for 20 sec" (all allies) | UNMODELED ⚑1 | effect side representable as `chargeDamageMultPct` (helm-wording precedent; a2's additive ruling covers only bare 'Charge Damage ▲') but unreachable without the trigger |
| S2 "Affects 2 allies with the highest final ATK"              | UNMODELED ⚑2 | `alliesTopAtk{count:2, byFinalAtk:true}` exists but is moot with the inert effect                                                                                        |
| S2 "Damage Taken ▼ 28.65% for 10 sec"                         | UNMODELED ⚑2 | ally mitigation — nothing to mitigate; `damageTakenPct` boss-debuff primitive deliberately NOT used (sign/direction trap)                                                |
| Burst "Reload Speed ▲ 50.91% for 10 sec" (all allies)         | FAITHFUL     | `reloadSpeedPct 50.91`, `burstCast`, `allies`, 10s; feeds `reloadFramesNeeded` → more shots (live arm proves it)                                                         |
| Burst "Critical Damage ▲ 28.34% for 10 sec" (all allies)      | FAITHFUL     | `critDamagePct 28.34`, same block/window; major-bracket feed pinned at `critRate × 0.2834` on matched in-window hits                                                     |

Driver test: `scripts/tests/units/admi.test.ts` — 14/14 GREEN, deterministic, fixture
liter/admi/modernia/helm (sole-B2; the standard controlComp cannot be used — crown is also
Burst II and would take every stage-II cast, leaving admi zero casts; poli precedent).
Every line pinned GREEN vs the shipped override and RED vs its nearest-wrong counterfactual:
fullBurstEnter re-keying (windows shift off her cast frames — her stage-2 cast lands ~52f
BEFORE the FB window opens), excludeSelf ('all allies' minus the caster), per-line effect
strips, and phantom encodings of both unmodeled lines (a passive S1 charge buff; S2
mis-encoded as the boss-debuff — which measurably inflates team damage, proving the trap real).

## Cross-family corroboration

- **S2b test review — claude-fable-5** (`reviews/admi.test-review.json`): burst lines
  FAITHFUL with identical trigger/target/magnitude/duration; S2 UNMODELED with the same
  inversion-trap warning; S1 flagged MEASUREMENT-GATED. One ACCEPTED catch: the S1 effect
  flavor is `chargeDamageMultPct` (the 'Multiplier' wording), not additive `chargeDamagePct`
  — verified against helm (identical wording → chargeDamageMultPct) and a2 (bare 'Charge
  Damage ▲' → additive). One documented divergence: S2b preferred an interval-⚑ stand-in for
  the S1 trigger; the driver ships UNMODELED per noise/yulha landed precedent (measured >
  fudge — no invented cadence constants).
- **S5 blind tests — claude-opus-5** (`blind/admi.test.ts` raw, `blind/admi.adapted.test.ts`
  executed): 9 GREEN / 6 RED / 2 skipped vs the driver override. All six REDs are the SAME
  posture divergence (S5 encoded S1 as a modeled block; the driver ships it UNMODELED — no
  accrual channel at scope lock). The raw output needed four mechanical repairs (crown-B2
  fixture steal = the poli hazard, `.blocks` shape, team-wide reads confounded by
  fixture-mate buffs, `durationShots` null-vs-undefined); intent untouched.
- **S6 blind override — claude-opus-5** (`blind/admi.override.json`): the burst block is
  BYTE-IDENTICAL to the driver's; skill1 shipped as an interval:20 ⚑ stand-in (S6's own flag
  concedes it over-credits unless boss attack cadence is measured); skill2 shipped as an
  empty-effects targeting shell with the mitigation line SKIPPED for the same direction-trap
  reasoning. `chargeDamageMultPct` derived independently — three blind voices, no leakage.
- **S7 binding judge — kimi-code/k3** (`results/admi.json`): GO 1.0, zero gotchas,
  discriminationOk. Ruled the S5 RED a documented posture divergence, not a misread; all six
  kit lines FAITHFUL or DOCUMENTED_GAP with verbatim prose + ⚑ (estimate + recipe + tier).

## Residual flags for owner

1. **(judge spot-check)** 'Charge Damage Multiplier ▲' → `chargeDamageMultPct` rests on the
   helm-wording inference agreed by all four agents; never confirmed against an in-game
   popup. Worth one popup screenshot before a trigger primitive ever lands.
2. **(judge spot-check)** burstCast-over-fullBurstEnter keying is four-agent consensus backed
   by the kit's lack of a full-burst clause + pre-FB cast timing + discriminating test, but
   still single-family reasoning — not popup-confirmed.
3. **(judge note)** If boss attack cadence on the Admi slot is ever measured from footage,
   revisit encoding S1 as a MEASURED interval rather than leaving it dark — real-fight uptime
   is plausibly near-permanent (20s duration vs re-trigger every 20 hits taken), so the line
   is a real team contribution in game even though it is zero at scope lock.
4. ⚑3 cadence tuple (SR chargeFrames 60 / reloadFrames 125 / ammo 6) is unverified datamine
   (no charFixes) — read the charge time + reload gap from any focus video.
