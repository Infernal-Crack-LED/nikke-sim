# Manual review — tia (Tia)

**Gauntlet date:** 2026-07-28
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (meta-defining `reenterStage` rotation mechanic; burst-cadence `burstCdr`; trigger-proxy judgment — "when recovering Cover's HP" → `burstCast`)

> Slug disambiguation: `tia` is standalone (no base counterpart, `treasure:false`). Missilis
> RL/Defender/Iron, Burst I, 40s datamined CD. The reptile cover-tank (skill names "Reptile Lover",
> "Chameleon Invisibility", "Lizard's Protection").

## Kit summary

Tia is a Burst-I rocket-launcher Defender whose entire kit keys off Cover HP — a resource the
damage sim does not model (the v1 boss deals no damage; there is no cover pool). Her offensive
footprint is two lines: whenever her cover's HP is restored — in practice, each time she casts her
burst, whose skill2 restores cover HP — she shaves 13s off her own burst cooldown and grants the
WHOLE team (herself included) +32.11% Attack Damage (Damage-Up bucket) for 10s. Her burst raises a
10s shield on herself (35.07% of her final Max HP) and a separate smaller shield on her four allies
(10.21%, except self) — event-only at scope, but they fire `shielded` triggers for shield-synergy
teammates — and then re-enters Burst Stage 1, so a second Burst-I unit can also cast inside the same
chain (the Tia + Anis:Star pairing; the engine's rotation holds the stage). The remaining lines are
defensive and documented-inert: a hitCount-5 cover-Max-HP raise + taunt, the cover-restore AMOUNT,
and a 21.96% lifesteal-over-10s.

The load-bearing modeling judgment is the TRIGGER PROXY: both skill1 lines activate "when
recovering Cover's HP". The only deterministic cover-HP recovery in the sim is her own skill2
burst-cast line, so skill1 is keyed to `burstCast` (once per own burst). It is deliberately NOT the
engine's generic `recovery` trigger — `recovery` fires on ANY heal the unit receives (helm's
full-charge heal every ~1.5s, a healer teammate), and teammate Nikke-HP heals are NOT cover-HP
recovery; keying to `recovery` would hold the team-wide 32.11% Damage-Up at near-100% uptime and
permanently cap the CDR. This reasoning was independently derived by the S2b (claude-fable-5) and S6
(claude-opus-5) blind roles.

## Line-by-line

| Line                                                          | Disposition    | Notes                                                                                                                                               |
| ------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: on cover-heal → self Burst CD ▼13s (2 stacks, 12s)        | FAITHFUL       | `burstCast` → self `burstCdr 13` (per-proc −13s; effective CD 27s). T4 pins 20<gap<35 in the no-B3 isolation; no-CDR counterfactual >35s            |
| S1: on cover-heal → all allies attackDamagePct 32.11/10s      | FAITHFUL       | `burstCast` → `allies` (self included); Damage-Up bucket; T1 pins the 4-target set per cast, T2 the frame-exact timing, T3 the damage delta         |
| S2: hitCount 5 → Cover Max HP ▲32.75% 5s + taunt 5s           | DOCUMENTED_GAP | Verbatim unmodeled — no cover entity, no aggro model; v1 boss deals no damage, one target to taunt                                                  |
| S2: on burst → Restores Cover HP 21.41% of final Max HP       | DOCUMENTED_GAP | Restore AMOUNT unmodeled (no pool); the line's trigger-anchor ROLE for skill1 is enacted by the burstCast proxy                                     |
| S2: on burst → Recovers 21.96% of attack damage as HP/10s     | DOCUMENTED_GAP | Verbatim unmodeled — lifesteal, no HP-loss channel, damage-inert; NOT a cover-HP recovery (must not satisfy S1's trigger)                           |
| Burst: self Shield 35.07% of final Max HP, 10s                | FAITHFUL       | Event-only (no HP pool); fires `shielded` triggers; T5 probe pins one application per cast on tia                                                   |
| Burst: allies (except self) Shield 10.21% of final Max HP     | FAITHFUL       | Event-only; `excludeSelf:true` pinned by T5 (the includes-self counterfactual double-shields tia: 2× probe fires)                                   |
| Burst: all allies — Re-enters Burst Stage 1                   | FAITHFUL       | `reenterStage stage 1` — rotation holds stage 1 so a second B1 casts; T6 frame-pins the chain (liter casts stage 1 exactly 30f after tia)           |
| S1: second CDR stack + 12s window + passive cover-regen procs | DOCUMENTED_GAP | Environmental (needs boss damage on cover + cover regen); COLD: sim effective CD 27s vs observed in-game ~20s; ~nil damage impact in standard comps |

## Cross-family corroboration

- **S2b (claude-fable-5, adversarial test-faithfulness review):** `leakDetected:null`. All 9 lines
  re-derived; 6 load-bearing FAITHFUL + 3 UNMODELED-verbatim — identical dispositions to the driver.
  Independently derived the `burstCast` proxy and named the generic-`recovery` trigger as the
  SHARED-PRIOR TRAP first ("a healer teammate's heals and her own S2 lifesteal-HoT each spuriously
  proc the CDR + team 32.11%"); warned the same fixture trap (explicit B1 comp + dual-B1 variant);
  recommended per-proc −13s, NOT a 2-stack hardcode. Its sole "GAP" (reenterStage) was a redaction
  artifact — the declaring types.ts line was stripped because its comment literally names Tia.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. 20-test suite. Out-of-box vs the driver
  override (after two structural adaptations only — import path + the slot-keyed override FILE
  shape): **13 pass / 4 fail / 3 skip**. The 4 reds, all adjudicated RECON_ERROR by the judge:
  R1+R2 = the mechanism divergence (S5 alone keyed skill1 to `recovery` chained off an emitted
  heal; its heal-cut discriminators are RED against the blind family's OWN S6 override too, which
  also uses `burstCast`); R3 = `durationShots: null` vs `undefined` test artifact (the seconds-based
  expiry the test wants holds); R4 = over-tight byte-equality on teammate cast counts that ignores
  the legitimate rotation coupling through `reenterStage` + first-ready pick in a double-B1 comp
  (10 vs 9 liter casts over 180s; the CD reduction itself targets tia alone). The 3 skips are the
  blind's own gaps (reenterStage — redaction artifact; taunt; HP-pool amounts — all agreed inert).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Byte-identical to the driver on every
  load-bearing block: `burstCast` → self `burstCdr 13`; `burstCast` → allies `attackDamagePct
32.11/10s`; self shield 35.07/10s; allies-`excludeSelf` shield 10.21/10s; the SAME trigger-proxy
  reasoning (its ⚑ text rejects `recovery` for the identical over-fire reason); the SAME CDR ⚑
  (13s one-stack floor, footage recipe 27s-vs-14s). Two diffs: D1 leaves reenterStage unmodeled
  (redaction artifact — the primitive exists, sim.ts:2424/2950, driver models it, T6 pins it); D2 a
  ceremonial `heal ticks:1` block documenting the cover-restore anchor (damage-inert — nothing
  consumes its recovery event since skill1 is `burstCast`-keyed in BOTH encodings).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].**
  6 FAITHFUL + 3 DOCUMENTED_GAP, zero silent drops. Ruled all 4 S5 reds RECON_ERROR (R1/R2 refuted
  intra-family — S6's override fails them identically; R3 null-vs-undefined; R4 over-tight rotation
  coupling), and the blind "missing primitive" a redaction artifact. Judge's own residual note:
  all four agents are same-family on the PROXY question (the cross-family split is fable+opus vs
  opus-test-writer, not a second model family disputing it), so the convergence proves stability,
  not in-game correctness — the one unconfirmable fact is the real cover-regen proc cadence behind
  the ~20s effective-CD claim.

## Residual flags (owner spot-check cluster)

1. **Cover-regen proc cadence (COLD, the only measurement worth queuing):** passive environmental
   cover regeneration procs skill1 between bursts in-game; the sim grants exactly one proc per own
   burst (effective CD 27s = 40−13; team-buff uptime 10s per ~27-40s). The anis-star probe note
   (2026-07-13) observed Tia's real cadence at ~20s, implying ~1.5 average stacks. Recipe: time
   Tia's burst-banner-to-burst-banner interval in any live recording (27s ⇒ one stack confirmed;
   ~14s ⇒ two stacks; ~20s ⇒ the environmental-regen middle). Damage impact is ~nil in standard
   comps regardless (team FB cadence is gated by the B2/B3 40s CDs); it matters only for double-B1
   reentry comps and for her own shield uptime (defensive).
2. **reenterStage fallback:** when no second B1 is eligible, the engine advances the stage instead
   of holding — the real-kit no-op case (re-entering stage 1 with no caster available), faithful at
   scope; would diverge only if "stage stays 1 indefinitely" has an observable the sim lacks.
3. **Shield magnitudes (35.07/10.21) are unvalidated:** recorded for kit completeness; no HP pool
   exists to exercise them. They matter only through `shielded`-trigger / `requiresShielded`
   consumers (e.g. naga), where the EVENT (not the magnitude) is the observable.
