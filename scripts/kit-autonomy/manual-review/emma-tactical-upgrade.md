# Manual review — emma-tactical-upgrade (Emma: Tactical Upgrade)

**Gauntlet date:** 2026-07-27
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0 (judge: kimi-code/k3; 0 REAL-GOTCHA, discrimination OK)
**Tier:** 2 (periodic 30s-recurring vulnerability windows; `targetStatus`-gated burst enhancement; caster-scaled flat ATK; mode-gated AS-Formation bonus; scoped same-squad buff)

> Slug disambiguation: `emma-tactical-upgrade` is the VARIANT (MG/Fire/Supporter/Burst I, Elysion,
> aka "emmatu"), NOT base `emma` (MG/Fire). Lint clean on the full name; the lint's one advisory
> fires on the slug's own "emma-" substring (a known false positive), never on the prose.

## Kit summary

Emma: Tactical Upgrade is a Fire MG Supporter on Burst I (20s CD) whose value is almost entirely
team-facing. At battle start — and recurring every 30 seconds — her Skill 1 "Environment Setup"
puts a 10-second Damage Taken ▲3.9% debuff on all enemies and a 10-tick heal-over-time (2.32% of
HER final Max HP per tick, every 1s) on all allies; she also permanently taunts all enemies
(Exposure). Skill 2 "LT Formation" passively grants same-squad allies +23.51% Critical Damage and
all allies +2.32% Projectile Explosion Damage, continuously. Her burst "Battlefield Formation"
grants all allies a FLAT ATK add equal to 40.07% of her own ATK for 10s, and — only if Environment
Setup is live when she casts — doubles the vulnerability (effective 7.8% taken) for 10s while
raising incoming healing. A second kit state ("Bonus effects when applying AS Formation to self":
+30.97% True Damage, +3.09% more Projectile Explosion, taunt off, Environment Setup every 10s
instead of 30s) is gated behind a user-selectable mode, DEFAULT OFF, because AS Formation is
applied by `eunhwa-tactical-upgrade`, who is not simSupported — no board team can have it.

## Line-by-line

| Line                                                                                   | Disposition           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 E1: Damage Taken ▲3.9% for 10s, all enemies, recurring 30s                          | FAITHFUL              | `damageTakenPct` boss debuff (Taken bucket §1g); passive@0 leading block + `interval:30` recurrence — the kit's "Activates at the start of battle" overrides the interval first-fire-at-t=sec convention; 6 windows/180s at frames 0,1800,…,9000, each with finite 600-frame expiry; coverage-map assertion pins mult.taken 1.0/1.039/1.078 by instance coverage; wrong-stat + duration-stripped counterfactuals discriminated                                                                                                                                             |
| S1 E2: HoT 2.32% of her final Max HP, every 1s for 10s, all allies                     | FAITHFUL (cadence)    | `heal {ticks:10, intervalSec:1}` — a recovery-EVENT cadence (10 events/window) that keeps Crown-type on-recovery consumers refreshed; the heal AMOUNT is genuinely unmodeled (no HP pool — blanc precedent). Fixture patches crown's own heal out so the channel is isolated; ticks-stripped counterfactual collapses to ≤2 firings/window                                                                                                                                                                                                                                 |
| S1 Exposure: taunt all enemies continuously                                            | DOCUMENTED_GAP        | Verbatim in `unmodeled`; single immortal boss, no targeting model — every unit already attacks it; zero damage consequence; unanimous across all four agents                                                                                                                                                                                                                                                                                                                                                                                                               |
| S2 E1: same-squad allies Critical Damage ▲23.51% continuously                          | FAITHFUL              | `critDamagePct` passive, frame 0, no expiry, all three fixture allies incl. herself; "same squad" ≡ the deployed team at single-squad scope (anchor-innocent-maid precedent); removal lowers every ally's total                                                                                                                                                                                                                                                                                                                                                            |
| S2 E2: all allies Projectile Explosion Damage ▲2.32% continuously                      | FAITHFUL              | `projectileExplosionPct` passive; LIVE on ada's RL normals (+0.0232 mult.dmgUp exactly, projExplOnRlNormals default ON, Q9 A/B) and byte-inert on MG normals — the fixture pins BOTH directions                                                                                                                                                                                                                                                                                                                                                                            |
| S2 bonus (AS Formation): True Damage ▲30.97%, all allies                               | FAITHFUL (mode-gated) | `trueDamagePct` passive under the second mode, default OFF; default run emits zero, AS mode emits 30.97 to all allies (T7); DamageUp bucket on true-flavored hits (§1e)                                                                                                                                                                                                                                                                                                                                                                                                    |
| S2 bonus (AS Formation): Projectile Explosion ▲3.09%, all allies                       | FAITHFUL (mode-gated) | Second `projectileExplosionPct` instance, additive over 2.32 (ada RL normals +0.0309 dmgUp in the isolated [0,7s) band); KR same-stat/different-value co-stacking                                                                                                                                                                                                                                                                                                                                                                                                          |
| S2 bonus (AS Formation): Exposure activation disabled                                  | DOCUMENTED_GAP        | Verbatim in `unmodeled`; a no-op on the already-unmodeled taunt, even under the AS mode; unanimous                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S2 bonus (AS Formation): Environment Setup interval ▼20s                               | FAITHFUL (mode-gated) | Mode-keyed skill1 variants: `interval:10` under AS vs `interval:30` default; 18 applications/180s and a contiguous duty cycle under AS (every steady-state damage instance carries mult.taken ≥1.039); recovery cadence triples (>2.5×)                                                                                                                                                                                                                                                                                                                                    |
| Burst E1: ATK ▲40.07% of the skill user's ATK, 10s, all allies                         | FAITHFUL              | `casterAtkPct` on her own `burstCast`, flat-resolves to (40.07/100)×her staticAtk per ally (§1a flat add outside the recipient's (1+ATK%)); aligned in-window baseAtk diffs equal the flat value to 4 decimals, exactly 0 outside; own-% (`atkPct`) counterfactual keys to the target's ATK and diverges. Blind S5's OWN expected magnitude (39963.4138 = 0.4007×99734) equals the driver's resolved value to the digit                                                                                                                                                    |
| Burst Enhanced E1: damage-taken multiplier scaled by 100% (while in Environment Setup) | FAITHFUL              | A second co-stacking `damageTakenPct` 3.9 boss instance (KR slot key `0:burst:…` distinct from `0:skill1:…` → overlap sums to 7.8% taken, mult.taken 1.078 — damage-identical to a single 7.8 encoding, which S6 independently chose), GATED on `requiresTargetStatus 'Environment Setup'`: fires only on in-window casts; ungated counterfactual provably fires on gap frames. ⚑ ruling: the enhanced instance runs its own full 10s ("Duration: 10 sec") rather than clipping at the base window's expiry — measurement-gated, <1% of fight damage, popup recipe on file |
| Burst Enhanced E2: Incoming healing ▲29.04%, all allies                                | DOCUMENTED_GAP        | Verbatim in `unmodeled`; no heal amounts / HP pool in v1; the recovery-event channel is untouched by healing-taken scaling; correctly NOT encoded as extra recovery events (which would over-fire on-recovery consumers); unanimous                                                                                                                                                                                                                                                                                                                                        |

## Cross-family corroboration

- **S2b test-faithfulness review (claude-fable-5):** 12-line spec, 9 load-bearing. Converged on
  every disposition; its two prescriptions were ADOPTED by the driver: (1) enemy-debuff events
  carry casterIdx===null (filters switched to the buff KEY); (2) the AS-Formation bonus belongs
  behind a declared mode gate with a flagged default. Driver held `allies` for the same-squad
  target (repo precedent) against its self-only stand-in, and noted its "RL-free comp" assumption
  was wrong (ada is RL) — the shipped fixture pins the stat live AND inert.
- **S5 blind test (claude-opus-5):** 5P/14F/3S vs the driver override. The 3 skips are the blind's
  OWN unmodeled (byte-identical set). The 14 reds decompose (empirically verified): 5 = the
  AS-Formation default premise (blind baked it always-on; driver gates default-OFF because the
  applier is off-board — the judge ruled the driver the more faithful read); 3 = a damage-identical
  encoding difference (single 7.8 instance vs slot-keyed 3.9+3.9 co-stack; both yield taken 1.078);
  6 = blind-test API bugs (nonexistent 'heal'/'recovery' SimEvent kinds; a `casterIdx!==null`
  filter that catches crown's 64.51 casterAtkPct grant — 0.6451×80267 = 51780.2417 exactly matches
  the contaminated value — plus helm's critRateNormalPct and crown's reloadSpeedPct in the
  inertness loops; a strict-< on same-frame burst timing; `srcSlot`-vs-`position` field error).
- **S6 blind override (claude-opus-5):** converged on every base magnitude and routing (3.9/10s
  boss debuff with t=0 first fire, ticks:10 heal, 23.51 critDamage, 2.32 projExpl, 40.07
  caster-scaled flat ATK, ×2 gated enhancement, same unmodeled set). Diverged exactly where S5
  did: AS bonus baked unconditional (its own flags concede "the assumption is baked in rather than
  gated") and the 7.8 single-instance encoding — the latter matching the DRIVER's co-stack choice.
- **S7 binding judge (kimi-code/k3):** GO 1.0, zero REAL-GOTCHA, discrimination OK. All 12 lines
  FAITHFUL or DOCUMENTED_GAP; accepted the full red-triage with independent arithmetic checks.

## Judgment calls (owner spot-checks)

1. **AS-Formation default OFF.** The mode exists for kit-SSOT completeness (mint-duet precedent),
   but ships OFF because `eunhwa-tactical-upgrade` (the AS Formation applier) is not simSupported —
   default-ON would over-credit every board team with 3× vulnerability uptime plus free True
   Damage from a formation no sim-legal team can field. **If the applier assumption is wrong (or
   she lands later), revisit the default — prefer a `teamHas.slugs` auto-gate over the manual mode.**
2. **Same-squad → all allies.** Encoded as plain `allies` (anchor-innocent-maid precedent; the sim
   fields exactly one deployed squad). S2b wanted a self-only stand-in; the judge flagged this as a
   low residual, not a gotcha. **Re-check if named-squadmate gating ever matters on the board.**
3. **Enhanced-window duration semantics.** The enhanced instance runs its own full 10s rather than
   clipping when the base window expires mid-enhancement (the strict-scale reading differs by
   +3.9% taken for ~7s per in-window burst, <1% of fight damage). ⚑ measurement-gated; recipe:
   popup-read the vulnerability icon duration/stacks right after her burst in any recording.
4. **Heal amounts unmodeled.** The 2.32%-of-HER-Max-HP payload and the 29.04% incoming-healing
   modifier have no consumer in v1 (no HP pool); only the recovery-event CADENCE is modeled
   (blanc precedent). Inert until an HP pool exists.

## Residual flags

- Spot-check cluster (on file in kit-status.json): (a) eunhwa-tactical-upgrade applier
  verification; (b) same-squad→allies precedent; (c) T6 window semantics popup-read.
- No engine changes (S4 untouched); `scripts/verify.sh` green; validate-overrides 0 warnings
  (dmg 97.9M / 15.6% share / 9 bursts on the driver fixture).
