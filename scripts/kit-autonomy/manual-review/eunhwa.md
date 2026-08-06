# Manual review — eunhwa (Eunhwa)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (round-count `durationShots` windows; `burstCast`-vs-`fullBurstEnter` keying)

> Slug disambiguation: `eunhwa` is the BASE unit (Eunhwa, SR/Fire/Attacker/Burst II, Elysion,
> released 2022-11-04). It is NOT `eunhwa-tactical-upgrade` (aka "eunwhatu", a different kit —
> P0 base/variant separation enforced throughout; the lint's advisory bare-name flag is inherent
> to the shared base name, and the exact slug was confirmed before landing).

## Kit summary

Eunhwa is a Fire-element sniper Attacker on Burst II whose entire non-burst kit hangs off one
moment: the instant her six-round magazine runs dry. Each dry-fire grants HERSELF Charge Damage
▲37.28% and Charge Speed ▲15.53% for her next TWO rounds — round-count windows (`durationShots:2`,
no wall-clock expiry) that survive the 161-frame reload and then cover exactly the first two full
charges of the next magazine (~2-of-6 duty cycle). The trap is sharp: a 2-SECOND timed encoding
would expire mid-reload (161f ≈ 2.68s) and make both lines silently, totally inert. Her Skill 2
would DEF-shred the last-bullet target by 29% for 5s, and her burst carries a further DEF ▼2.43%
rider — but the engine has no enemy-DEF channel (enemy debuffs other than damageTakenPct/
distributedDamagePct are dropped at dispatch; boss DEF is the flat constant 140), so both lines
are recorded verbatim as documented engine gaps, pinned against damageTakenPct-laundering. Her
burst itself fires one 85.62%-of-final-ATK hit (the "10 highest-final-ATK enemies" fan-out
collapses to the single scope-lock boss; FB-exempt by cast timing, crits at caster rate) and
grants ALL allies — herself included — Critical Rate ▲4.65% for 15s, keyed to HER casts
(`burstCast`, never `fullBurstEnter`).

## Line-by-line

| Line                                                        | Disposition    | Notes                                                                                                                                        |
| ----------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: lastBullet → self chargeDamagePct 37.28, 2 shots        | FAITHFUL       | `durationShots:2`, no timed expiry; additive ppt inside the charge bucket (250→287.28, pinned to 9 dp); exactly the first 2 shots of the next mag, mag 0 untouched |
| S1: lastBullet → self chargeSpeedPct 15.53, 2 rounds        | FAITHFUL       | Same block/trigger; shortens the 60f charge to 51f (9f pin) for 2 rounds; a weapon-state modifier — buys shots, so it IS damage               |
| S2: lastBullet → target DEF ▼29% for 5s                     | DOCUMENTED_GAP | No enemy-DEF channel: sim.ts drops enemy ATK▼/DEF▼ at dispatch (only damageTakenPct/distributedDamagePct reach enemyBuffs); cfg.bossDef=140 flat. Verbatim in `unmodeled.skill2`; zero-boss-debuff pin + laundering counterfactual |
| Burst: burstCast → enemy flatDamage 85.62                   | FAITHFUL       | One hit per cast at kit magnitude; 10-target selection collapses to the partless boss; FB-exempt (cast precedes the window); crits at caster rate |
| Burst: DEF ▼2.43% for 15s                                   | DOCUMENTED_GAP | Same constant-bossDef basis as S2; verbatim in `unmodeled.burst`; covered by the shared zero-boss-debuff pin                                  |
| Burst: burstCast → all allies critRatePct 4.65/15s          | FAITHFUL       | UNSCOPED crit (never critRateNormalPct — inverse helm trap); all allies incl. self; keyed to HER casts — discriminated vs fullBurstEnter two independent ways |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 6 lines marked
  load-bearing. CONVERGED on 4 (S1a/S1b/B1/B3: identical trigger/duration/scope/target readings —
  round-count windows, burstCast keying, generic crit, additive charge bucket). The reviewer marked
  the two DEF▼ lines FAITHFUL **with an explicit engine-support caveat and contingency**: "confirm
  the engine actually consumes boss-held DEF ▼; if it does not, both DEF lines are honestly GAP
  (engine limitation), not silently-dropped, and belong in unmodeled/note." The driver ran that
  check (sim.ts dispatch + cfg.bossDef) and reconciled both lines to UNMODELED-verbatim per the
  contingency — the reviewer also independently named the durationSec:2 mid-reload trap and the
  crown-shared-B2 fixture hazard.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived every kit line,
  including both traps (round-count-not-seconds; burstCast-not-fullBurstEnter). Out-of-box vs the
  driver override: not runnable as-written — two documented driver adaptations
  (`blind/eunhwa.adapted.test.ts`, raw kept verbatim): (A1) the raw controlComp seats crown, a
  same-CD Burst II LEFT of eunhwa, who monopolizes stage 2 (probe: eunhwa 0 casts/180s) — adapted
  to the B2-free liter/eunhwa/ada comp the blind's own gap note prescribed; (A3) the raw spec's
  boss-held `defPct` buffApply assertions are unobservable under ANY honest encoding (the engine
  emits no events for dropped enemy debuffs) — adapted to pin the engine-honest treatment (verbatim
  unmodeled + zero boss debuffs + a laundering counterfactual with teeth). Adapted result:
  **15 pass / 2 skip (both pre-declared structural GAPs by the blind author: DEF-down payload and
  10-target fan-out unobservable at scope lock) / 0 fail.**
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. BYTE-EQUIVALENT on every modeled
  line: same skill1 block (lastBullet/self/37.28+15.53/durationShots 2), same burst flatDamage
  85.62, same all-inclusive crit buff. Diverges ONLY on the two DEF▼ lines — authored as
  enemy-targeted `defPct −29/−2.43` with a self-flag that the engine channel was unverified and a
  recipe ("grep the engine for the defPct consumer"); the driver executed exactly that recipe,
  found the blocks dispatch to nothing, and recorded the lines verbatim-unmodeled. Damage-identical
  in sim domain; the divergence is provenance hygiene, not behavior. Its open sub-question (does
  the triggering last bullet consume one of the two rounds?) is resolved behaviorally by the driver
  spec: exactly the first two shots of the NEXT magazine are boosted.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, gotchas [], discriminationOk:true.**
  All 6 lines accounted (4 FAITHFUL + 2 DOCUMENTED_GAP), zero silent drops. Judge verified the
  DEF-gap treatment against the SSOT's own DEF analysis (~0.03% of ATK at scope lock — negligible,
  not engine-core), confirmed the multi-family convergence is real (both traps identified
  independently by S2b and encoded identically by driver + both blind agents), and graded every
  discriminator as having teeth (passive-vs-lastBullet, per-shot trigger, strip A/Bs, nuke
  half/double linearity, fullBurstEnter counterfactual, laundering pin).

## Residual flags for owner

- ⚑ **durationShots consumption phase** — behaviorally pinned (triggering last bullet does NOT
  consume the budget; window = first two shots of the next magazine), shared by every agent, but
  unmeasured against real footage. Recipe: focus-record Eunhwa solo, count buffed charge popups
  after each dry-fire (expect exactly 2).
- ⚑ **Cadence tuple** (60f charge / 161f reload / 6 ammo) is datamined and drives both S1 uptime
  and the (unenactable) S2 cadence — S6's standing flag, shared by all encodings. Recipe: read
  rounds/magazine + reload-to-first-shot off a focus recording's ammo counter.
- ⚑ **10-target fan-out + DEF▼ payload** are structurally unobservable at scope lock — standing
  gaps if the engine ever gains multi-enemy encounters or an enemy-DEF channel. In game, the DEF
  lines would be a minor team lift (~57% uptime on S2's 5s/8.7s cycle; ~75% on the burst's 15s/20s).
- Board: no records yet (`board:null`) — unrecorded unit; simSupported flipped this gauntlet.
