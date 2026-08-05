# Manual review — rapunzel-pure-grace (Rapunzel: Pure Grace)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate: self-supplied `requiresShielded` + unmodelable charge-hold half; `burstCast`-vs-`fullBurstEnter` keying on two lines)

> Slug disambiguation: `rapunzel-pure-grace` (aka "rpg") is the SR/Iron/Defender/Burst-I OVERSPEC
> variant. It is a DIFFERENT unit from the base `rapunzel` (RL/Iron/Supporter/Burst-I, aka "rapu"),
> which carries a pure-sustain heal/resurrect kit and landed its own gauntlet 2026-08-01.

## Kit summary

Rapunzel: Pure Grace is a shield-archetype tank/buffer whose whole kit hangs off a shared shield she
supplies herself. At battle start — and again every time she casts her own Burst — she creates a
shared Shield (20.59% of her final Max HP) that protects all allies; in the sim the shield is
event/state only (no shield-HP pool: the v1 boss deals no damage). While a shield is set in front of
her AND she maintains a full charge for more than 1 second, all allies gain Attack Damage ▲10.41%
continuously — her shield self-supplies the shield half of the gate, and the charge-hold half has no
engine primitive (⚑, see residuals). Each of her full-charge shots heals herself for 2% of her final
Max HP (event-only: no HP pool, and her own kit has no recovery consumer, so the self-recovery events
are a downstream no-op). One gated skill2 line — Current HP ▼2%/s while restoring Shield HP 3.16%/s —
is unmodelable at scope (no HP pool, no shield-HP pool) and sits verbatim in `unmodeled`. Her Burst
raises her own Max HP ▲10.13% for 10s (offensively inert — she has no HP→ATK conversion) and gives
all allies Attack Damage ▲15.24% for 10s. Her damage footprint is exactly those two Attack Damage
lines; everything else is proven byte-neutral against the bare weapon.

## Line-by-line

| Line                                                                                   | Disposition      | Notes                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| S1: start of battle → allies shared Shield 20.59% of caster final Max HP, continuous   | FAITHFUL         | `passive` → allies → `shield` (permanent). Proven a REAL event through naga's `shielded` consumer (frame-0 firing, SH1)              |
| S1: on Burst Skill use → the same shared Shield                                        | FAITHFUL         | skill1-slot block, trigger `burstCast` (HER cast, never `fullBurstEnter`); re-fires the consumer exactly on her cast frames (SH2)    |
| S1: charge-held>1s + shield set → all allies Attack Damage ▲10.41%, continuous         | DOCUMENTED_GAP   | `passive` + `requiresShielded`, permanent. Gate proven live + self-supplied (strip shields → buff dies, G2). Charge-hold half ⚑ below |
| S2: full-charge attack → self recover 2% of final Max HP                               | FAITHFUL         | `shotFired` → self → `heal` (event-only, SR = one full charge per pull). Self-target pinned via crown's recovery consumer (L4 group) |
| S2: gated — Current HP ▼2%/s + Shield HP restore 3.16%/s                               | DOCUMENTED_GAP   | UNMODELED verbatim: needs an HP pool + shield-HP pool. Deliberately NOT a 1 Hz repeating shield effect (would spam ally triggers)    |
| Burst: self Max HP ▲10.13% for 10s                                                     | FAITHFUL         | `burstCast` → self → `targetMaxHpPct` (engine emits maxHpFlat = 0.1013×her maxHp, 600 frames). Inert: totals-equality with it out (B4) |
| Burst: all allies Attack Damage ▲15.24% for 10s                                        | FAITHFUL         | `burstCast` → allies, 5 holders × 600 frames per cast; two-B1 liter-decoy pins the keying; removing it drops the carry (B3)          |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently derived all
  7 lines; 4 load-bearing. THE BIG ONE flagged up-front: the 10.41 line's "Full Charge maintained for
  MORE THAN 1 sec" half — her SR hits full charge at exactly 1s and the sim fires there, so literal
  in-engine uptime is ~0% while real play is ~100%; shipping it ungated/no-⚑ would be the silent
  over-credit branch (driver ships gated + permanent WITH the ⚑). Also predicted the "Affects self"
  header-echo trap on the shared shield (body text: protects ALL allies) and warned the shield-HP
  restore must NOT become a 1 Hz repeating shield effect. All three enacted.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same 7 lines from
  kit prose alone. Adapted with TWO mechanical fixes only (harness import path; damage-event
  `srcSlot` is a slot-name string in this repo → filter by event slug). Vs the driver override:
  **16 passed / 2 skipped (honest unobservables: heal AMOUNT, shield-HP restore) / 0 failed**,
  including the shield-strip gate counterfactual, the battle-start + on-burst dual shield activation
  pins, and the burst-b coverage/expiry/load-bearing trio on a `burstFirst` fixture.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. 4 of 6 blocks byte-identical (S2 heal,
  burst Max HP, burst team Attack Damage, both shield activations with skill1-slot placement). Two
  flagged divergences, both spurious: (a) shield target `self` (literal header read — the conservative
  branch S2b ruled against; driver's naga-consumer tests are red under it); (b) L3 trigger
  `interval{sec:1}` vs the driver's `passive` — behaviorally identical at scope (gate self-supplied and
  always true; both carry the same uptime ⚑, estimates ~99–100%). Same verbatim unmodeled line.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].**
  All 7 lines accounted (5 FAITHFUL + 2 DOCUMENTED_GAP), convergence GREEN (0 red), and both blind
  divergences independently ruled non-findings. Judge's ranked same-model residuals: (1) the S1-c
  ~100%-uptime ⚑ rests on a play-behavior argument, not a measurement; (2) the allies-target shared
  shield is a structural inference corroborated by two agents + the naga mechanics.

## Residual flags for owner

1. **⚑ S1-c hold-gate uptime (CALIBRATED, upper-bound encoding).** "Full Charge maintained for more
   than 1 sec" has no engine primitive — her SR reaches full charge at exactly 1s and the sim fires at
   full charge, so the literal in-engine read is ~0% uptime while real hold-to-aim play is ~100%. The
   always-on-behind-the-shield-gate encoding is the UPPER BOUND and matches play; the over-credit risk
   is up to the diluted 10.41% Damage-Up share for the whole team. **Recipe:** a Rapunzel: Pure Grace
   focus recording — compare the buff-icon uptime of the 10.41% Attack Damage grant against her shield
   icon. **Tier:** Tier-2 state gate.
2. **Allies-target shared shield (structural inference).** The "Affects self" header vs
   "protects all allies" body conflict was resolved to ALLIES by two independent agents (S2b, driver)
   and is behaviorally proven to fire an ally `shielded` consumer in-sim, but whether the real in-game
   shared shield fires ally shield-synergy triggers is verifiable with one naga + Rapunzel: Pure Grace
   recording.
3. **Unmodeled gated self-drain/shield-restore line.** Verbatim in `unmodeled.skill2`; zero damage
   impact (defensive HP economy). Enacting it needs an HP pool + shield-HP pool model. Watch item: if
   ever enacted, the shield-HP restore must NOT emit shield events (a 1 Hz emit would over-feed every
   ally `shielded` consumer on the board).
4. **MODEL_ONLY — no recorded comp yet.** All magnitudes are datamine-literal; nothing here is
   fight-validated. First recording priority: any shield-tank team comp (she is a Pilgrim OVERSPEC —
   expect squad-constraint friction finding a legal recording team).
