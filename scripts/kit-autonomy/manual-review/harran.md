# Manual review — harran (Harran)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (round-count `for 1 round(s)` lines; `burstCast`-vs-`fullBurstEnter`; chance→periodic proxy; kill-subsystem out of domain)

> Slug disambiguation: `harran` is the BASE Pilgrim SR (Electric / Attacker / Burst III, cd 40s,
> ammo 6, chargeFrames 60, reloadFrames 159) — not a variant. S0 lint clean (no AMBIGUOUS).
> FROM-SCRATCH build: no prior override, no prior kit-status row; `simSupported` was false.

## Kit summary

Harran is an Electric SR sniper Attacker on Burst III. Her attacks have a 25% chance to infect the
target with Virus Transfer, a damage-over-time that ticks for 17.28% of her final ATK every second
for 5 seconds; when an infected enemy is neutralized the virus spreads to the 2 nearest other
enemies. Every full-charge shot — which for an SR sniper is effectively every shot — grants HERSELF
Pierce for 1 round and +2.95% Critical Rate for 1 round, and each kill she scores stacks +3.02% ATK
(up to 15 stacks, 10s). Her burst is a single 999%-of-final-ATK hit to all enemies. Against the
single immortal partless scope-lock boss the two kill-triggered lines can never fire, so her live
kit at scope lock is: the DoT proc, the per-shot self-buffs, and the nuke.

## Line-by-line

| Line                                                        | Disposition                   | Notes                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: 25% chance on attack → Virus Transfer DoT 17.28%/1s/5s  | FAITHFUL (proxy)              | `shotFired → enemy` dot (5 ticks/application) with `everyN:4` — expectation-exact periodic thinning of the chance (⚑1 calibration; engine has no RNG primitive). Ungated-every-shot 4x-over-credit counterfactual pinned RED; S2b and S5/S6 all converged on the same shape.                                         |
| S1: infected enemy neutralized → spread to 2 nearest        | DOCUMENTED_GAP                | Verbatim in `unmodeled.skill1` — no kill/neutralize trigger primitive, no add/multi-enemy model, and the v1 boss is immortal and alone (⚑3 out-of-domain). Zero-delta pin asserts the line contributes nothing; never folded into live damage.                                                                       |
| S2: full charge → Gain Pierce for 1 round(s)                | FAITHFUL (inert)              | Duration-less `gainPierce` re-arm on `shotFired` — every SR shot re-arms before the next round, so shots stay Pierce-tagged while she fires (S2b's preferred shape). `gainPierce` carries no `durationShots` field (⚑2 primitive gap, recipe logged). Damage-inert at scope lock: byte-identical with block removed. |
| S2: full charge → self Critical Rate ▲ 2.95% for 1 round(s) | FAITHFUL (steady-state proxy) | Passive self `critRatePct 2.95` with `rampSec 2.2`: the literal `shotFired durationShots:1` self-buff self-consumes on its granting frame (MEASURED probe 2026-08-05 — executed vitest pin: literal ≡ line-absent per-frame), so the proxy encodes the re-trigger steady state (permanent uptime from shot 2; ⚑2).   |
| S2: on kill → ATK ▲ 3.02% ×15 / 10s                         | DOCUMENTED_GAP                | Verbatim in `unmodeled.skill2` (⚑3). Anti-fabrication pin: NO `atkPct` buff anywhere in her blocks — the nearest-wrong (passive ATK ramp to +45.3%) is the highest-magnitude possible error on this kit and is explicitly excluded.                                                                                  |
| Burst: 999% of final ATK to all enemies                     | FAITHFUL                      | `burstCast → enemy` flatDamage 999, keyed to her OWN cast, NOT `fullBurstEnter` (fixture fields helm as co-B3, where the two keyings genuinely diverge). Cast lands before the FB window ⇒ no +50% major (pinned: zero `fbMajorApplied`); no core (no core-strike wording); 'all enemies' = the single boss.         |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on the
  load-bearing set (DoT proc, pierce, crit, 999 burst) and pre-registered all three trap clusters:
  the rounds-vs-seconds trap on both skill2 lines, the 4x-over-credit risk of an ungated DoT, and
  the burstCast-vs-fullBurstEnter divergence with helm as co-B3. Two divergences adjudicated at
  S2c: **D1 ADOPTED** (reviewer's gainPierce re-arm shape added as R5 — pierce was unmodeled in the
  driver's first draft) and **D2 REJECTED with evidence** (reviewer's literal `durationShots:1`
  crit re-arm is measured net-inert — same-shot self-consume, zero lift).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Written from the kit prose alone.
  Out-of-box vs the driver override (adapted copy, structural fixes only): **14 green / 1 red /
  3 skipped**. The single red is mechanism over-specification: it pins `durationShots === 1` on the
  crit buffApply, which the driver deliberately does not emit (the literal encoding is
  measured-inert; the driver encodes its steady state instead). The 3 skips are the blind's own GAP
  rulings: spread-on-neutralize, on-kill ATK stacks, and the pierce round-count primitive gap.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged on every load-bearing
  encoding: byte-identical `everyN:4` dot (trigger, cadence, 17.28/5/1 magnitudes), identical
  `burstCast` 999 nuke, identical verbatim-unmodeled kill lines. Three divergences, all
  non-behavioral or strictly worse: `crit:true` on the dot (redundant — the encoding carries no
  crit field, so the engine DOT_CRIT default governs either way), a `durationSec:1.3` wall-clock
  pierce proxy that LAPSES between SR shots (strictly worse than the driver's re-arm), and the
  literal `durationShots:1` crit encoding (measured inert in this engine).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, 0
  REAL-GOTCHAs.** Every divergence from literal prose is a documented ⚑ with estimate + recipe +
  tier; both out-of-domain kill lines are verbatim-unmodeled with anti-fabrication pins. The S5 red
  was ruled mechanism over-specification, not a driver error — the executed inert-pin (literal ≡
  line-absent per-frame) meets the prove-it-differently bar as an independent method. The driver's
  pierce re-arm was ruled strictly more faithful than the blind's lapsing wall-clock proxy.

## Residual flags for owner

1. **Probe-claim spot-check (⚑2, the one behavioral dependency).** The steady-state crit proxy and
   the pierce re-arm rest on the 2026-08-05 probe finding that a `shotFired`-granted
   `durationShots:1` buff self-consumes on its granting frame (the granting firePull decrements it
   same-frame — zero crit lift surfaces). The judge flagged this as the same-model residual to
   spot-check: if that engine reading were ever overturned, the literal encoding becomes preferable
   to the proxy, and the tracked fix is the ⚑2 recipe (noRetriggerWhileActive exemption shape
   generalized + a `durationShots` field on `gainPierce`).
2. **DOT_CRIT doc nit (documentation only).** The override note's "DoT non-crit (engine default)"
   phrasing is stale against the SSOT's DOT_CRIT default-ON; the encoding carries no crit field, so
   behavior follows the engine default either way. Not a behavioral finding.
3. **⚑1 chance proxy (calibration).** The 25% proc is thinned to a deterministic every-4th-shot
   periodic — expectation-exact at the simulated cadence (~14.4% of final ATK per second in steady
   state). Real geometric proc gaps would lower true uptime only if re-application refreshes a
   single named debuff (bounded ~10.6–14.4%/s); in-engine instances never overlap. Recipe: Harran
   focus video — Virus Transfer debuff-icon uptime + tick popup cadence.
4. **⚑3 kill subsystem (out of domain).** The neutralize/spread line and the on-kill ATK stacks are
   zero-impact at scope lock (nothing dies, nothing adds). In real add-wave / multi-target content
   the stack line alone could reach +45.3% ATK and the spread could double her DoT coverage.
   Recipe: kill/add-model primitives (neither exists in v1) + a Harran focus recording on add
   content.
