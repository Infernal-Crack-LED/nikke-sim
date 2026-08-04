# Manual review — epinel (Epinel)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (burstCast-vs-fullBurstEnter timing — the nuke must not take the +50% FB major and
must fire only on her own casts; status-gate disposition — the burst's Total-Noob-max-stacks
conditional; lastBullet cadence/uptime reasoning on a 120-round SMG magazine)

> FROM-SCRATCH build — no prior override existed, `simSupported:false` → flipped by this
> gauntlet; the unit was absent from kit-status.json and its row was seeded in the exact
> `--refresh` shape before the `--gauntlet` provenance flip (no global `--refresh` — concurrent
> batches share the file; counts reconcile at batch end). Slug lint clean: there is exactly one
> Epinel in the roster (no variant ambiguity).

## Kit summary

Epinel is a Wind SMG Attacker (Burst III, 40s cooldown, 120-round magazine, RoF 1440/min). Her
sustained damage rides a self crit package: every time she empties her magazine she gains
**Critical Rate ▲5.05% and Critical Damage ▲6.4% for 5 seconds**, so the window cycles on and
off with her reload rhythm (~65–80% uptime on the datamine cadence tuple). Her burst deals
**457.87% of final ATK** to all enemies (the single partless boss at scope). Two lines depend on
**killing enemies** — the sim's one immortal boss never dies and the engine has no kill event, so
both are provably zero at scope and sit verbatim in `unmodeled` with ⚑s: skill1's Total Noob
stacking ATK buff (+13.86% ×5 stacks, 15s) and the burst's conditional second 457.87% hit "when
Total Noob is at max stacks" (effectively always paid in real multi-add content — that is the ⚑'s
estimate, not something the sim can enact).

## Line-by-line

| Line                                                                                     | Disposition    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1: killing an enemy → self — Total Noob: ATK ▲13.86%, ×5 stacks, 15s                    | DOCUMENTED_GAP | The trigger is an enemy KILL; the engine has no kill primitive (grep-verified across src/engine) and the scope-lock boss is immortal with no adds, so the stacks can never accrue — zero contribution in ANY sim run. Deliberately NOT encoded as a passive max-stacks buff (69.3% ATK): that would fabricate damage the sim's world cannot produce (the counterfactual is pinned RED by test E2). Verbatim in `unmodeled.skill1`. ⚑1: estimate +69.3% ATK most of a real multi-add fight; recipe = kill-event primitive + `totalNoob` resource pool [0..5] (+1/kill, 15s per-stack window) read as perResource atkPct mult 13.86. Tier: out-of-domain (world model).                      |
| S2: last bullet hits → self — Critical Rate ▲5.05% for 5s + Critical Damage ▲6.4% for 5s | FAITHFUL       | `lastBullet → self → critRatePct 5.05 + critDamagePct 6.4 /5s` in one block (both effects co-apply on one frame, pinned). `lastBullet` (magazine-empty / reload start) IS the named last-bullet archetype (privaty/marciana/anis-sparkling-summer/exia precedent); generic critRatePct, NOT critRateNormalPct (the prose carries no "of normal attacks" qualifier — the S2b reviewer and S6 both independently flagged that trap). Uptime ~65–80% (120-round mag cycles ~6.3–7.4s vs the 5s window) asserted STRUCTURALLY — applications per reload cycle, bounded away from shot count and cast count — never a pinned percentage. Cadence tuple is ⚑3 (datamine).                        |
| Burst: all enemies — 457.87% of final ATK as Burst Skill damage                          | FAITHFUL       | `burstCast → enemy → flatDamage 457.87` — burst bucket, keyed to HER casts only (count == her burstCast count), cast lands pre-FB so it never takes the +50% FB major (pinned). fullBurstEnter counterfactual over-fires on helm-led FBs AND goes in-FB (pinned RED — the Tier-2 trigger discrimination; co-B3 helm in the control fixture makes the two keyings genuinely diverge). "All enemies" collapses to the single partless boss.                                                                                                                                                                                                                                                  |
| Burst: IF Total Noob at max stacks → same targets — 457.87% of final ATK extra           | DOCUMENTED_GAP | The gate reads S1's kill-fed pool, which can never fill at scope, so the rider deals zero all fight. Verbatim in `unmodeled.burst`; the nearest-wrong model — folding it into an unconditional second hit (915.74%/cast) — is pinned RED by test E4 (per-cast exactly-one-hit pin + totals counterfactual). ⚑2: in real content the gate is effectively always open by her first burst (kills accrue in the opening seconds vs a 40s CD), so the in-game burst is effectively 915.74% — the sim's 457.87 is a scope-lock necessity, not a value choice. Recipe: with ⚑1's pool modeled, a second burstCast block under resourceGate {totalNoob, min:5}. Tier: out-of-domain (world model). |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on all 5
  dispositions with ZERO divergences — the same 3 FAITHFUL encodings (lastBullet crit pair,
  burstCast nuke) and the same 2 UNMODELED lines, and independently named all three nearest-wrong
  counterfactuals the driver pins RED: passive 69.3% ATK for the kill stacks, shotFired/permanent
  uptime for the crit window, and the ungated 915.74% double-hit. Drove one refinement the driver
  adopted: assert the lastBullet uptime STRUCTURALLY, never as a pinned percentage (~65–70% was the
  reviewer's estimate against the driver's ~80% — reconciled to a ~65–80% cadence-tuple ⚑).
  Explicitly named the hardest trap: "dropping the [max-stacks] gate and dealing 915.74% per cast".
- **S5 (claude-opus-5, blind test-writer):** `leakDetected:null`. Independently re-derived every
  line from the prose; the kill trigger and the max-stacks rider were both classified GAP from
  prose alone. Adapted run vs the driver override (adaptations logged, mechanics only: harness
  import path; `durationShots:null` event contract): **12 pass / 0 RED / 2 skip** (the skips are
  the author's own GAP records — exactly the driver's two UNMODELED lines). Discriminations
  included a 15s-duration over-earn check, a sole-B3 burst-contribution ratio separating 1× from
  2× (0.6–1.5 band), and a no-FB-major pin on every burst-slot damage event.
- **S6 (claude-opus-5, blind override-writer):** `leakDetected:null`. Block-for-block IDENTICAL to
  the driver on every live and unmodeled line (same trigger/target/stats/values/durations; empty
  skill1; verbatim rider in unmodeled; no resourceGate authored because nothing can increment the
  pool — S6's audit: "no invented trigger or partial-uptime credit is substituted"). TWO
  presentational deltas: unmodeled text split at the period (2 entries vs 1 merged — same text),
  and `crit:true` on the nuke where the driver follows the repo's text-silent default (d/helm
  prior-2; impact ≈ +1.6% of her total — not load-bearing; judge ruled it a documented judgment
  call, not a gotcha).
- **S7 (kimi-code/k3, BINDING judge):** GO, faithfulness 1.0, discriminationOk true, gotchas [].
  Convergence GREEN (0 RED assertions). Judge's residual spot-checks for the owner: (a) the nuke's
  crit flag (popup-colour read over ≥5 casts settles it if ever needed); (b) the cadence tuple —
  "the one cheap measurement that would firm up the single load-bearing live line"; (c) the
  same-model lastBullet-archetype prior — convergence proves stability, the whole-picture checks
  (per-magazine count bounds, lapse-window proof, pre-FB cast timing) carry correctness, and they
  all pass.

## Residual flags (owner spot-check cluster)

1. **Burst nuke crit flag** — driver follows the text-silent default (no `crit` flag; d/helm
   prior-2); S6 opted in. ≈1.6% of her total either way. Recipe: popup-colour read over ≥5 casts.
2. **Cadence tuple** (ammo 120 / reloadFrames 81 / RoF 1440 — datamine, ⚑3) sets the S2
   crit-window uptime (~65–80%); asserted structurally only. Recipe: fire-cadence + reload-gap
   read from any focus video.
3. **Kill-dependent package** (⚑1 + ⚑2) — the kit's in-game power package (≈+69.3% ATK sustained
   and a 915.74% burst) is zero at scope by world-model necessity. Any future adds/kill-event
   scope must enact both lines together (recipes on file in the override note); until then the
   board number reflects a Total-Noob-less Epinel by construction.
