# Manual Review — quency-escape-queen (Quency: Escape Queen, "qeq")

**Date:** 2026-07-25
**Verdict:** GO (cross-family corroborated) ✓
**Faithfulness:** 1.0
**Tier:** 2 (scoped stack-gated self-buffs, staged cascade, burstCast self-window + distributed nuke)
**Gauntlet driver:** Qwen
**Cross-family:** S2b claude-fable-5 ✓ | S5/S6/S7 claude-opus-5 ✓
**Binding judge (S7, claude-opus-5):** GO · faithfulness 1.0 · convergence GREEN · discriminationOk · 0 silent-drops · 2 low-severity gotchas (both documentation-only, both applied)

> **Disambiguation:** this is `quency-escape-queen` (SMG/Water, "qeq"), NOT the base `quency` (SMG/Electric) — a different unit. The slug-form trips the disambiguation lint (hyphen = word boundary reads bare base "Quency"); the full name "Quency: Escape Queen" + nickname "qeq" passes clean.

---

## Kit Summary

SMG / Attacker / Water / Burst III, cd 40s, ammo 120, reloadFrames 81, hitsPerShot 2, rate_of_fire 1440rpm (live effective cadence 20 pulls/s — SMG frame quantization DEFAULT-ON since 2026-07-23).

A self-ramping SMG carry. Skill 2 "Explore Route" fires every 2 normal attacks and builds three CUMULATIVE tiers of self stacks (ATK + Hit Rate together); each higher tier only builds once the tier below is at max, so a sustained magazine takes her to ~+110.3% ATK and ~+61.1 Hit Rate. The higher tiers use short windows (1s, 0.5s) so they collapse across every reload and rebuild on resume; stage 1 (2s) survives the 1.35s reload. Skill 1 "Secure Route" pays out three permanent self bonuses, each unlocked only while the matching Explore Route tier sits at max stacks: Distributed Damage ▲49.58%, core damage ▲25.25%, Critical Rate ▲16.73%. Her burst "The Great Thief" gives herself +57.08% Attack Damage and +25.87% Reload Speed for 10s (the reload buff is a real damage lever on a 120-round magazine) and hits all enemies for 1736.31% of final ATK as Distributed Damage. The S1 Distributed Damage bonus exists purely to amplify that nuke — her only distributed-flavored hit — so the two lines are one mechanic split across two skills (mult.distributed 1.4958 on the nuke).

---

## Line Dispositions

### FAITHFUL (9 lines)

| Line                                          | Encoding                                              | Trigger          | Notes                                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| S2 stage 1: Hit Rate ▲ 1.36% ×10 / 2s         | `hitRatePct 1.36, maxStacks 10, durationSec 2`        | hitCount 2 (self)| Per-stack accrual; cap 10, 120-frame window pinned structurally. LIVE: feeds core rate (acrForHR) — removing HR shifts core-rate distribution + drops total 672→544M. |
| S2 stage 1: ATK ▲ 2.45% ×10 / 2s              | `atkPct 2.45, maxStacks 10, durationSec 2`            | hitCount 2 (self)| +24.5% at cap.                                                                                                               |
| S2 stage 2: Hit Rate ▲ 2.71% ×10 / 1s         | `hitRatePct 2.71, maxStacks 10, durationSec 1`        | hitCount 2 (self)| 1s < 1.35s reload → collapses + rebuilds each reload (load-bearing).                                                         |
| S2 stage 2: ATK ▲ 4.9% ×10 / 1s               | `atkPct 4.9, maxStacks 10, durationSec 1`             | hitCount 2 (self)| +49% at cap.                                                                                                                 |
| S2 stage 3: Hit Rate ▲ 4.08% ×5 / 0.5s        | `hitRatePct 4.08, maxStacks 5, durationSec 0.5`       | hitCount 2 (self)| Cap drops to 5 (pinned vs the flat-×10 trap).                                                                                |
| S2 stage 3: ATK ▲ 7.36% ×5 / 0.5s             | `atkPct 7.36, maxStacks 5, durationSec 0.5`           | hitCount 2 (self)| +36.8% at cap; three concurrent atkPct keys (caps 10/10/5) = the cascade reading. Removing S2 halves her total (672→321M).   |
| Burst: Attack Damage ▲ 57.08% / 10s           | `attackDamagePct 57.08, durationSec 10`               | burstCast (self) | Once per HER cast (== her burstCast count, not team FB count — helm is co-B3). 600-frame window; 1s worse / 30s better ⇒ bounded, not permanent. |
| Burst: Reload Speed ▲ 25.87% / 10s            | `reloadSpeedPct 25.87, durationSec 10`                | burstCast (self) | Damage line (shot-count gate), not skippable. Blind proved zeroing it drops her total.                                       |
| Burst: 1736.31% final ATK as Distributed Dmg  | `flatDamage atkPct 1736.31, flavor distributed`       | burstCast (enemy)| One hit per cast, burst bucket, FB-exempt (fbMajorApplied:false — cast lands pre-FB). Takes mult.distributed 1.4958 from S1; stripping the flavor collapses it to 1.0 (== removing S1). |

### DOCUMENTED-GAP (3 lines — all the same missing engine primitive)

| Line                                          | Encoding (proxy)                                      | Reason                                                                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 stage-1 max: Distributed Damage ▲ 49.58%   | `distributedDamagePct 49.58` passive (self)           | The "Explore Route Stage N at max stacks" gate has no engine trigger. Passive is faithful-IN-EFFECT: the only consumer (the nuke) first fires ~5.4s ≫ the ~1s stage-1 build, and the 2s window outlasts the 1.35s reload, so the gate holds for every nuke. ⚑ engine-primitive. |
| S1 stage-2 max: core damage ▲ 25.25%          | `coreDamagePct 25.25`, hitCount 20 / 1s (self)        | Firing-tracking proxy for the stage-2-max gate (continuous while firing, lapses ~1s into a reload). Magnitude/duration/self-target pinned; gate timing approximate. ⚑ engine-primitive. |
| S1 stage-3 max: Critical Rate ▲ 16.73%        | `critRatePct 16.73`, hitCount 10 / 0.5s (self)        | Same proxy construction. UNSCOPED crit (critRatePct, NOT critRateNormalPct — the prose has no "of normal attacks" qualifier; blind pinned no critRateNormalPct apply). ⚑ engine-primitive. |

**Not pinned (documented ⚑2):** the S2 stage-UNLOCK ORDERING (stage 2 gated on stage-1 max, stage 3 on stage-2 max) is not encoded — all six stacks build in parallel from the first pull. Over-credits stage 2/3 by ~0.4–0.8s per ramp/post-reload rebuild (~0.5–1% of fight-total at 20 pulls/s); steady state is unaffected. Needs an engine cascade-order / stack-count-gate primitive (out-of-domain).

---

## Cross-Family Corroboration

- **S2b pre-op review (claude-fable-5):** independent per-line spec — all 12 lines FAITHFUL + load-bearing, identical load-bearing set, empty unmodeled. Converged on the distributed coupling (L1↔L12), burstCast-not-fullBurstEnter (helm co-B3 divergence), FB-exempt nuke, reload-speed-as-damage, hitRate→core, and the ×10/×10/×5 caps + 2s/1s/0.5s durations. Flagged the S1 stage-gate timing as a proxy (reconciled faithful-in-effect) and stage-3 marginal uptime (resolved in the driver's favour: with hitsPerShot 2 the trigger fires once per PULL, so 5 stacks accrue in ~0.25s inside the 0.5s window — comfortable, not borderline).
- **S5 blind test (claude-opus-5):** independent kit-spec test from prose alone (leakDetected null), same fixture (liter/crown/qeq/helm, Fire, focus qeq) + same counterfactual method. Mechanical adaptation = the import path ONLY (`../lib/harness.js` → `../../tests/lib/harness.js`); the blind used the live 2-arg harness API + real event fields, so no other correction. Run vs the driver SHIPPED override: **16 passed / 5 skipped / 0 failed = GREEN**. The 5 skips are the blind's honest gaps (stage-gate primitive, cascade ordering, stack-window duration, nuke core/FB/range flags, pulls-vs-rounds) — all match the driver's ⚑s.
- **S6 blind override (claude-opus-5):** independent prose→override (leakDetected null) — all 12 lines IMPLEMENTED with identical magnitudes and the same 6 ⚑ concerns. Differs from the driver only in proxy MECHANISM: S1 gates as passive + `rampSec 6/10/14` (an invented staircase the blind itself flags) vs the driver's passive/hitCount proxies; S2 stacks as PRE-SUMMED values (13.6/27.1/20.4, 24.5/49.0/36.8) + rampSec vs the driver's per-stack value + maxStacks + durationSec. The driver's per-stack encoding is strictly more faithful (models real accrual/lapse/rebuild — probe: 3169 applies, stacks climb 1→cap); the blind labelled its own pre-summed values an upper-bound over-credit.
- **S7 binding judge (claude-opus-5):** GO, faithfulness 1.0, convergence GREEN, discriminationOk, 0 silent-drops. 9 FAITHFUL + 3 DOCUMENTED_GAP. Fire-rate check passes on every block. The driver's proxies are strictly better than the blind's rampSec staircase and pre-summed values. Error direction of every gap is a small over-credit confined to the opening ramp + post-reload rebuilds.

---

## Gotchas (2, both low-severity, both documentation-only — APPLIED)

1. **ENGINE (burst, low):** the 1736.31% distributed nuke carries no explicit crit field, so it inherits the engine crit-ON default for function damage; damage-calculation §1 marks distributed-damage crit as disputed. **Fix applied:** added a caveat documenting the reliance (number unchanged). Resolution is engine-global — settle once for all distributed carriers via a focus-recording popup read (orange+icon = crit-eligible; white-only across many casts = crit-exempt; a ×1.5 crit/non-crit pair settles it).
2. **FIDELITY (note, low):** the note's cadence premise (24 pulls/s) was stale vs the live engine default of 20 effective pulls/s (SMG frame quantization DEFAULT-ON since 2026-07-23; 24/s is the SMGRATE=24 revert arm). **Fix applied:** corrected the note + caveat + gauntlet stamp to 20 effective pulls/s (40 rounds/s) and restated the proxy arithmetic (hitCount 2 → ~20 applies/s; hitCount 20 → per 0.5s vs 1s window; hitCount 10 → per 0.25s vs 0.5s window). The S7 judge re-derived every proxy + stack window at 20/s — all still saturate, so NO override value or assertion changes (dmg 283.0M identical pre/post).

---

## Residual spot-check cluster (owner)

- **The one same-model residual the judge flagged:** the driver's claim that the passive-encoded 49.58% has ZERO observable error is CONDITIONAL, not proven — it requires the stage-1 pool to be at max at every cast instant. Stage-1's 2s window clears the 1.35s reload by only ~0.65s, a margin a reload landing inside the ~1.5s burst chain could erase. Direction of any error is a small over-credit on the nuke, never an under-credit. Unobservable from the shipped event stream (no per-frame buff state); pin from footage if it matters.
- **Distributed-crit on the nuke** (gotcha 1) — engine-global convention question; resolve once for all distributed carriers.
- **Cadence** is now documented at the live 20/s; the SMGRATE=24 revert arm would change apply cadence but the encoding is cadence-robust (every tier still saturates).
- **Stage-unlock ordering** (⚑2) and **S1 gate timing** (⚑3) need an engine stack-count-gate / cascade-order primitive to encode faithfully; both are small transient over-credits today.

**Board:** ratio 1.046 (HOT ▲, 2 teams, band 1.04–1.05) — stable across the gauntlet (encoding unchanged; only note/caveats edited).
