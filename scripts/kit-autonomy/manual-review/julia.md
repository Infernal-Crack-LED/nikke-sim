# Manual review — julia (Julia (Treasure))

Kit-autonomy gauntlet 2026-07-31 — **GO, faithfulness 1.0** (binding judge kimi-code/k3; gotchas [];
discriminationOk true). First modeling: no prior override, no prior kit-status row (row seeded this
run). AR / Attacker / Iron / Burst III, cd 40s, ammo 60, 720 RPM, treasure:true. The datamined
roster carries ONLY this Treasure variant under slug `julia`; the untreasured base kit is not in
the sim. Artifacts: results/julia.json (verdict), results/julia-judge-packet.md (full S7 packet),
reviews/julia.test-review.json (S2b), reviews/julia.verify.txt (RED→GREEN), blind/julia.test.ts +
blind/julia.override.json (S5/S6), cross-family/julia/*.json (dispatch evidence).

## Kit summary

A sustained crit-stacking AR attacker. S1 "Decrescendo" is a 10s self window (Critical Rate
▲26.04%, ATK ▲20%, Normal-Attack-only Critical Rate ▲36.16%) force-cast at battle start and re-fired
every 40s (datamined skill CD). S2 "Crescendo/Marcato": every 6 NA crits → +24.79% Critical Damage
(max 5 stacks, 15s); every 8 NA crits → Marcato, an 88%-of-final-ATK bonus hit; when Marcato itself
crits, a further 100%-of-ATK hit follows. Burst "Climax": five sequential 544.5%-of-final-ATK hits,
plus one more 544.5% hit when Crescendo is at max stacks at cast time.

## Line-by-line

| kit line                                                            | disposition      | encoding                                                                                                                                                                  |
| ------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 Critical Rate ▲26.04% / ATK ▲20% / NA Critical Rate ▲36.16%, 10s | FAITHFUL         | fused passive (t=0 force-cast, chisato precedent) + interval:40; critRateNormalPct NA-scoped (helm precedent) — skill/burst buckets pinned at {0.15, 0.4104}, never 0.772 |
| S2 Crescendo: after 6 NA crits, CritDmg ▲24.79% ×5 / 15s            | DOCUMENTED_GAP ⚑ | buff exact; trigger = hitCount:19 crit-proxy (ceil(6 ÷ 0.323), fight-averaged NA crit; eve precedent) + shadow `crescendo` resource                                       |
| S2 Marcato: after 8 NA crits, 88% additional damage                 | DOCUMENTED_GAP ⚑ | hitCount:25 crit-proxy (ceil(8 ÷ 0.323)) → flatDamage 88, crit-eligible (kit confirms: next line triggers on its crit)                                                    |
| S2 Marcato-crit rider: 100% additional damage                       | DOCUMENTED_GAP ⚑ | EV companion flatDamage 22.23 crit:false = 100% × P(Marcato crits), P = 50/180×41.04% + 130/180×15% (takina uptime-average precedent; no on-crit trigger, sim.ts:1606)    |
| S2 battle start: Forcefully uses Skill 1                            | FAITHFUL         | enacted by S1's fused-passive block (frame-0 buffApply pinned; supersedes takina's 2026-07-24 "inexpressible" note — the passive+durationSec pattern now exists)          |
| Burst: 544.5% ×5 sequential, random enemies                         | FAITHFUL         | one consolidated flatDamage 2722.5 on burstCast (eve/2b precedent; EV-identical; single boss takes all 5), pre-FB (no +50% major), unflavored                             |
| Burst: +544.5% at max Crescendo stacks                              | FAITHFUL         | flatDamage 544.5 + resourceGate{crescendo, min:5} (soda precedent) — empirically withholds the bonus from the t=5.4s opening cast (stacks max at t=9.1s)                  |

## Cross-family corroboration

- **S2b (claude-fable-5)** — independently re-derived every line from prose: crit-rate-scaled
  hitCount proxy ("pin proc RATE, not existence"), critRateNormalPct scoping with Marcato/burst at
  15+26.04 only, fused interval + t=0 force-cast, resourceGate max-stacks mirror, and PROPOSED the
  EV Marcato-crit rider the driver adopted. No REAL-GOTCHA; leak-clean.
- **S5 (claude-opus-5, blind test)** — 17 passed / 4 failed / 4 skipped vs the driver override.
  The 4 skips are the blind author's own primitive-gap skips (the driver resolves two: EV rider +
  resourceGate). The judge classified all 4 reds as blind-test defects: F1 attribution filter
  catching Crown's casterAtkPct grant (driver override has none), F2 ±5e-7 absolute tolerance on
  129M totals (0.05% delta is emergent skillGauge→rotation feedback), F3 missing slug filter + the
  documented burst consolidation, F4 a no-op counterfactual patch (driver's own J4 supplies the
  discrimination). Two driver adaptations, documented inline: import depth + onEvent→cfg plumbing
  (assertion logic untouched).
- **S6 (claude-opus-5, blind override)** — convergent structure; the judge ruled the driver
  "matches or beats both blind agents on every contested line": it ENACTS the battle-start
  force-cast the blind override left inert (its interval:40 first-fires at t=40 despite its note
  claiming t=0), GATES the max-stack bonus the blind fired unconditionally (blind's own flag:
  "nearly correct IF stacks at cap by first burst"), and encodes the Marcato-crit rider as the
  calibrated EV (22.23) rather than the blind's ~4.5×-optimistic unconditional 100 (blind's own
  flag). Residual divergences: crit-proxy thresholds 19/25 (driver, uptime-weighted) vs 12/16
  (blind, ~0.50 rough estimate); consolidated 2722.5 vs 5×544.5 (blind's own flag: "affects nothing
  in aggregate damage"); unflavored vs 'sequential' flavor (kit names no sequential consumer).
- **S7 (kimi-code/k3, binding judge)** — GO 1.0, gotchas [], discriminationOk true.

## Residual flags for owner

1. **Crit-count proxy is static** (hitCount 19/25 at the 32.3% fight-averaged NA crit rate): cannot
   track the S1 window PHASE (real procs cluster inside the 77.2% windows) nor external team
   crit-rate buffs. Popup-read cluster: Crescendo icon 5-stack accrual time + Marcato popup
   cadence. Tier 2.
2. **EV Marcato-crit rider (22.23)**: right TOTAL, no per-proc correlation; 180s-uptime-weighted.
   Replace with a real crit branch if the engine gains an on-crit trigger. Tier 2.
3. **Gate resource does not decay** (diverges only if she stops landing NA crits for 15s+ — never
   in continuous fire). Tier 3.
4. **Burst consolidation** (1 instance vs 5): damage-identical in the EV pass; a future
   per-hit/sequential consumer or parts model would see 1 hit where the kit deals 5. Tier 3.
5. **Targeting collapse** ("random enemies" / highest-DEF → single boss). Tier 3.
6. Still **MODEL_ONLY / untuned** — the gauntlet certifies structure, not magnitudes; no focused
   julia recording exists.
