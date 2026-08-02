# Manual review — yulha (Yulha)

Kit-autonomy gauntlet 2026-08-01 — **GO, faithfulness 1.0** (binding judge kimi-code/k3; gotchas [];
discriminationOk true). First modeling: no prior override, no prior kit-status row (row seeded this
run). SR / Attacker / Fire / Burst III, cd 40s, ammo 6, chargeFrames 60, reloadFrames 133, hitsPerShot 1.
Artifacts: results/yulha.json (verdict), results/yulha-judge-packet.md (full S7 packet),
reviews/yulha.test-review.json (S2b), reviews/yulha.verify.txt (driver 11/11 GREEN), blind/yulha.test.ts

- blind/yulha.override.json (S5/S6), cross-family/yulha/*.json (dispatch evidence).

## Kit summary

Yulha is a Fire SR Burst-III attacker whose entire identity is a **"Calm" self-status earned by being
attacked 30 times**. While Calm is active her own Critical Rate rises by 24.53% for 20s (S1) and her
burst fires a SECOND identical 457.87% hit — effectively doubling it. Skill 2 periodically grants ALL
allies (including herself) ATK ▲90.75% for 5s and lets the squad equally share incoming damage for 10s.

**The sim has no incoming-damage model** (the v1 boss is immortal and never acts), **no "attacked N
times" trigger primitive, and no self-status gate** — so Calm can never be earned or read on the
scope-lock basis. The faithful encoding models the two UNCONDITIONAL lines (the S2 team ATK buff and
the burst's base 457.87% nuke) and documents the whole Calm cluster + the defensive damage-share as
out-of-domain (the helm-aquamarine precedent for a gate that cannot fire on the basis — faithful
omission, not a fudge). Her board reading therefore reflects HALF her theoretical Calm-active burst and
no Calm crit — honestly.

## Line-by-line

| kit line                                                    | disposition      | encoding                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 "attacked 30× → Calm: Critical Rate ▲24.53% / 20s, self" | DOCUMENTED_GAP ⚑ | UNMODELED verbatim — no incoming-attack trigger (hitCount counts the OWNER's outgoing rounds), no self-status; boss never acts. Zero critRatePct buff (Y3 pins the absence; calmAlways counterfactual proves it is a choice)                             |
| S2 "all allies: ATK ▲90.75% for 5s" (CD 30s)                | FAITHFUL         | interval:30 (DATAMINED skillCooldownsSec.skill2) → allies → atkPct 90.75 / durationSec 5; fires t=30/60/90/120/150, all 4 holders, 300-frame windows (Y1)                                                                                                |
| S2 "all allies: equally shares damage taken for 10s"        | DOCUMENTED_GAP   | UNMODELED verbatim — defensive redistribution; no HP pool, boss deals no damage, zero damage impact; NOT a boss damageTakenPct debuff (ally-side mechanic)                                                                                               |
| Burst "all enemies: 457.87% of final ATK as Burst damage"   | FAITHFUL         | burstCast → enemy → flatDamage 457.87; one hit per cast; fbMajorApplied false (cast lands pre-FB); crit-eligible at sheet rate; bucket 'burst' (Y2)                                                                                                      |
| Burst "when in Calm status: 457.87% additional damage"      | DOCUMENTED_GAP ⚑ | UNMODELED verbatim — gated on the untriggerable Calm SELF status (no requiresSelfStatus; requiresTargetStatus is the wrong, boss-side channel). Rider fires ZERO times; Y2c pins exactly one burst hit per cast vs the doubled calmAlways counterfactual |

## Cross-family corroboration

- **S2b (claude-fable-5)** — independently re-derived every line from prose and CONVERGED with the
  driver: S2 ATK 90.75/5s (interval at the datamined CD, all allies incl. self, durationSec 5 NOT 10
  — the 10s belongs to the separate share sentence) and burst 457.87 (burstCast, pre-FB, own-cast) as
  the two FAITHFUL lines; S1 Calm-crit, S2 damage-share, and the burst Calm-rider as out-of-domain/
  gated omissions. Named the SAME nearest-wrong counterfactuals the driver's spec pins (hitCount:30
  own-rounds misread, ungated burst doubling = "the largest single error available in this kit",
  5-vs-10s duration conflation, fullBurstEnter taking the +50% major). No REAL-GOTCHA; leak-clean.
- **S5 (claude-opus-5, blind test)** — authored from prose only; its counterfactuals (passive-Calm,
  unconditional-doubled-burst, self-scoped-ATK, permanent-ATK) match the driver's. After driver
  reconciliation of its harness API (top-level onEvent → cfg.onEvent; ov.X.blocks → direct Block[]
  arrays; 5-unit → 4-unit controlComp fixture counts; durationShots null-vs-undefined — ALL
  API-translation, NO assertion intent changed), it runs vs the driver override as **21 passed / 1
  legit GAP skip (damage-share) / 0 failed**.
- **S6 (claude-opus-5, blind override)** — the sole outlier, on THREE gated-line judgment calls; on
  each the driver is corroborated by S2b + S5 and by measured>fudge:
  - S2 ATK period: driver interval:**30** (DATAMINED) vs blind interval:**20** (invented — "burst
    cooldown used as a plausible stand-in"; not even her 40s burst CD). Driver wins on measured>fudge.
  - S1 Calm crit: driver UNMODELED (zero buff, no fabricated cadence) vs blind interval:12 ⚑ proxy
    (the blind writer labels it "NOT a kit number"). Driver = the faithful default S2b named.
  - Burst Calm-additional: driver OMITS (single 457.87; Calm untriggerable) vs blind INCLUDES ungated
    (two 457.87 = doubled). The blind writer's OWN caveat admits it "OVER-CREDITS whenever the burst is
    cast outside a Calm window" — and S2b named ungated-doubling the nearest-WRONG model. Driver wins
    on faithful>fit.
  - Agreement everywhere else: S2 value/scope/duration (90.75, allies, 5s), S2 damage-share UNMODELED,
    burst base 457.87 magnitude + routing (its explicit crit/noRange flags are functionally redundant
    with engine defaults).
- **S7 (kimi-code/k3, binding judge)** — GO 1.0, gotchas [], discriminationOk true. Ruled the driver's
  conservative position faithful on all six lines; S5 GREEN unmodified vs shipped; S6 the self-admitted
  outlier.

## Residual flags for owner

1. **The Calm cluster is the meta-defining lever and is OUT-OF-DOMAIN.** The board reflects HALF
   Yulha's theoretical Calm-active burst and no Calm crit. Calm needs an incoming-damage /
   "attacked 30×" trigger primitive + a self-status gate, neither of which the immortal-boss sim has.
   Recipe: measure Calm UPTIME from a real fight — read the Calm icon on/off frames from the squad HUD
   and the boss's effective 30-attack accrual rate. NOTE: S2's damage-share raises her incoming-hit
   share in-game, so a solo-derived cadence UNDER-counts. Tier 2 (meta-defining).
2. **Burst Calm-additional rider** (the second 457.87%): if a Calm model is ever added, encode it as a
   `calm` resource set to 1 by S1 and 0 at window end, with resourceGate{calm, min:1} on a SECOND burst
   block (the only existing primitive that expresses a caster-held condition). Confirm vs footage: two
   457.87% popups in Calm vs one outside it. Tier 2.
3. **S2 interval:30 is datamined** (skillCooldownsSec.skill2 = 30) but the kit text gives no activation
   clause, so the CD itself is measurement-gated. Popup-read the ATK-up icon flicker across a 180s
   recording to confirm the period. Tier 3.
4. **SR cadence tuple** (chargeFrames 60 / reloadFrames 133 / bolt gap) is datamine-unreliable
   (standing ALWAYS-⚑); ~15-20% shot-count swing. Recipe: focused recording, frame-by-frame shot period
   - reload gap + autofire-vs-bolt-gap. Tier 3.
5. **True cross-family corroboration rests on S2b (claude-fable-5)** — S5 and S6 share the opus family,
   so the owner's independent-family sanity check is the fable review (which converged fully).
6. Still **MODEL_ONLY / untuned** — the gauntlet certifies structure (faithfulness), not magnitudes; no
   focused Yulha recording exists.
