# Manual review — vesti (Vesti)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (two `burstCast`-keyed escalating usage counters; `fullBurstExtend` sign; dot cadence; `burstCast`-vs-`fullBurstEnter` keying)

> Slug disambiguation: this is BASE `vesti` (Elysion RL/Water Attacker, Burst III, cd 40s,
> resource_id 91, released 2022-11-04, `treasure:false`) — **not** `vesti-tactical-upgrade`
> (RL/Fire, aka vtu/vestitu). The slug-disambiguation lint flags the shared base name AMBIGUOUS
> (advisory, exit 0) — unavoidable, since the unit's own display name is "Vesti"; every artifact
> keys `characters['vesti']` and the lint's candidate list confirms the target (vesti RL/Water).
> GREENFIELD build: no shipped override existed (`simSupported:false` — before this gauntlet the
> unit could not sim at all, since `resolveSkills` throws for prose-without-override).

## Kit summary

Vesti is a Water RL Burst-III attacker whose damage lives in a burst-usage ladder called Survival
Instinct. Each time she casts her OWN burst she climbs one rung of 45s self-buffs — ATK ▲5.35%,
then Critical Damage ▲22.34%, then Critical Rate ▲15.51%, each rung replaying all prior ones
(one `escalating` block on `burstCast`; 45s > 40s CD, so once SI3 is reached the full stack is
permanent in a sustained fight). Her burst deploys TWO Missile Containers that each deal 15.56%
of final ATK to the (single) boss every second for 18 seconds (36 ticks = 560.16% ATK-equivalent
per deployment; the per-container reading is the prose-literal one and carries the datamine's
explicit container-count value 2 — the one-container alternative is exactly half and is the
spec's named counterfactual, ⚑3). The burst also deals instant additional damage scaled by her
Survival Instinct stage — cumulative and same-cast-inclusive: cast 1 deals 210.62%, cast 2 deals
210.62+247.25, cast 3+ deals all three = 760.06% (one `escalating` flatDamage block; the S2
rungs grant in the skill2 slot BEFORE the burst-slot riders resolve, so the stage a cast grants
is the stage its damage reads). The tradeoff line — Full Burst Duration ▼ 5 sec for all allies —
is modeled as `fullBurstExtend:-5` on her own casts (isabel's exact precedent for this wording):
windows she opens run 5s, windows a co-B3 opens stay 10s. Her S1 (Explosion Radius ▲15.01% on
full charge) is UNMODELED verbatim: radius is AoE geometry, not a damage stat — no radius stat
exists and it is damage-inert vs the single partless boss (vesti-tactical-upgrade carries the
identical residual for its burst radius line); the nearest-wrong laundering (projectile
ExplosionPct 15.01, a real Damage-Up stat) is pinned absent by the spec.

## Line-by-line

| Line                                                                          | Disposition      | Notes                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1: full charge → self Explosion Radius ▲15.01%/10s                            | UNMODELED        | No explosion-radius stat exists; radius moves no damage vs the single partless boss (VTU precedent for the identical line shape); carried verbatim; absence canaries pin no `projectileExplosionPct` laundering (the nearest-wrong stat) |
| S2: burst use → SI1 ATK ▲5.35%/45s                                             | FAITHFUL         | ONE `escalating` block on `burstCast → self` (steps 5.35/22.34/15.51, 45s each); Nth own cast applies steps 1..N; per-cast frame pins (counts casts / casts−1 / casts−2) discriminate fullBurstEnter keying (a co-B3's rotation would over-advance the stage — helm fixture makes the test non-vacuous) and instant-max |
| S2: burst use → SI2 Critical Damage ▲22.34%/45s                                | FAITHFUL         | Escalation step 2 — from the 2nd own cast, cumulative (all three stats coexist on the cast-3 frame; distinct buff keys, no overwrite loss)                               |
| S2: burst use → SI3 Critical Rate ▲15.51%/45s                                  | FAITHFUL         | Escalation step 3 — from the 3rd own cast; damage-relevant (removal strictly lowers her total); unscoped prose → generic `critRatePct`, not a normal-attack-scoped stat |
| Burst: two Missile Containers 15.56% final ATK / 1s / 18s                      | FAITHFUL (⚑3)    | TWO `dot` blocks (one per container): 18 lattice frames per deployment, 2 hits per frame, cast+60f spacing, 36 hits complete-window; burst bucket; never cores, noRange (dot path), FB-by-landing-timing, crit per engine DoT default (DOT_CRIT ON since 2026-07-21); one-container counterfactual (18 hits/deployment) discriminated; ⚑3 = the count has no footage discrimination yet (recipe: 36 vs 18 popups per window) |
| Burst: SI-staged additional damage 210.62 / 247.25 / 302.19%                   | FAITHFUL         | ONE `escalating` flatDamage block on `burstCast → enemy`; per-cast multiset pins: cast 1 = [210.62] (same-cast-inclusive — a pre-cast stage read would deal nothing on cast 1), cast 3+ = all three (stage-only reading fails); burst-cast lands pre-FB → `fbMajorApplied` pinned false; instant riders noRange + no core; level-1 magnitude 124.45 counterfactual discriminated |
| Burst: all allies Full Burst Duration ▼ 5 sec                                  | FAITHFUL (⚑4)    | `burstCast → allies → fullBurstExtend seconds:-5` (isabel precedent, identical kit wording); every vesti-opened FB window runs 5s, every co-B3-opened window stays 10s (PREFB cast+22f opener pairing); +5 sign-flip counterfactual (15s windows) discriminated; ⚑4 = net rotation blast-radius sign unverified (carried from isabel) |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. CONVERGED on all five
  lines with zero divergences: the escalating burstCast SI buffs (explicitly NOT fullBurstEnter —
  named the control comp's co-B3 as the over-advance trap), the two-container missile DoT (named
  the one-container halving the nearest-wrong model), the cumulative 210.62/457.87/760.06 riders
  (FB-exempt), the fullBurstExtend −5 (explicitly load-bearing — "the kit's biggest rotation
  lever", must not be dropped as utility), and S1 UNMODELED with projectileExplosionPct named as
  the laundering trap. Its shared-prior trap list is exactly what the spec's counterfactuals
  discriminate.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. The raw file needed ONE mechanical
  adaptation class (import path — blind/ sits one level deeper than the unit tests); the adapted
  copy (`blind/vesti.adapted.test.ts`) scores **23 pass / 1 skip** vs the driver override. The
  skip is S5's own GAP annotation (S1 radius has no engine primitive — independently derived).
  Independently derived and pinned: per-container missile payload (2 × 15.56 = 31.12% per volley
  frame), the 18-frame lattice, no container stacking across casts, per-cast rider multisets with
  same-cast-inclusive stage, pre-FB rider landing (no +50% major), no core/no range on riders,
  5s-on-her-casts / 10s-otherwise FB windows, self-only ladder inertness, and the two-B3
  trigger-identity gap (non-vacuity asserted first).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged on ALL structures except
  ONE substantive divergence: authored ONE missile-container dot at 15.56 (the combined-reading,
  exactly half the driver's 2× encoding). The judge ruled this a blind-side RECON_ERROR: the
  prose's plural subject, the datamine's explicit container-count Integer 2, the S2b review, and
  S5's own test all corroborate the driver's two-container reading (carried as ⚑3 with a
  popup-count recipe, not asserted as measured). Otherwise byte-equivalent choices: identical
  escalating SI block, identical escalating rider block (explicit `crit:true` = the flatDamage
  crit-on default the driver relies on), identical fullBurstExtend −5, identical S1 unmodeled
  callout.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true,
  gotchas:[].** All five kit lines FAITHFUL or DOCUMENTED_GAP; the S5 suite GREEN unmodified
  against the shipped override; every load-bearing assertion discriminates a named nearest-wrong
  model. Two non-blocking residuals recorded: (1) the container count is the kit's largest
  unmeasured number (560.16% vs 280.08% per cast) — ⚑3 with the popup-count recipe; (2) the
  driver's note/caveat wording described DoT crit as default-OFF while the SSOT has DOT_CRIT ON
  since 2026-07-21 — the ENCODING is agnostic (no explicit crit field, engine default governs =
  crit-ON), so only the note wording was corrected on landing. Result:
  `scripts/kit-autonomy/results/vesti.json`.

## Residual flags (owner spot-checks)

- **⚑1 CADENCE TUPLE (mandatory):** RL charge cadence (chargeFrames 60 / reloadFrames 142 /
  ammo 6) shipped at datamine-synced values; drives her pull count, gauge contribution, and
  full-charge count. Recipe: rounds/min + reload gap from any focused vesti video. Tier: low.
- **⚑2 MISSILE CRIT (engine-default-governed):** the container ticks carry no explicit crit
  field, so the engine's DoT-crit default governs — DOT_CRIT has been ON since 2026-07-21
  (game-mechanics.md U13: DoT ticks roll crit universally), so the missiles roll crit at her
  sheet rate (~15–30% with SI3). The encoding is SSOT-aligned; the residual is a carrier-specific
  spot-check only (no vesti popup read exists). Recipe: popup-read a missile volley for the
  crit-body fraction. Tier: low.
- **⚑3 MISSILE CONTAINER COUNT (prose-literal ruling):** the two-container reading (2 ×
  15.56%/s = 560.16% per deployment) rests on the prose's plural subject + the datamine
  container-count value 2 + S2b + S5; the combined-volley alternative (280.08%) is exactly half
  and is the spec's `oneContainer` counterfactual. Recipe: count missile popups in one 18s window
  on a vesti focus video (36 vs 18). Tier: 2 — the kit's largest unmeasured magnitude.
- **⚑4 FB-DURATION BLAST RADIUS (carried from isabel):** the net rotation sign of
  `fullBurstExtend:-5` in the engine's rotation model (per-cycle FB shortening vs faster
  next-cycle) is UNVERIFIED — needs a /sim-battery diff; pull if it spuriously net-harms the
  board. Tier: 2.
- **Dispatch note (provenance):** the canonical blind dispatch (`--max-turns 3`) failed twice for
  S5 (denied tool attempts burning turns; one wall-clock overrun); the labeled scratchpad copy
  with `--max-turns 6` (tools still DISABLED — blindness boundary unchanged) converged on the
  third attempt (scratchpad/gates/2026-08-05-vesti-s5/RUN-NOTES.md).
