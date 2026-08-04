# Manual review — d (D)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate — the stun-immunity-conditional Full Burst extension; scoped buffs —
self-only elem-advantage windows and an Attacker-class-only parts buff; meta-defining — the
battle-start 98.56% burst-gauge fill shapes the whole team's rotation)

> Slug disambiguation: the display name "D" is an inherently ambiguous lint base — it is shared
> with "D: Killer Wife" (slug `d-killer-wife`, SR/Fire, aka "dkw"), an entirely different unit.
> This review, the override, and the test key the exact slug `d` (SMG/Wind/Attacker/Burst III,
> Elysion, released 2023-04-13) throughout; the ambiguity is unresolvable by phrasing (the base
> unit's own name is the bare letter, no approved nickname exists), so the confirmation IS the
> slug. FROM-SCRATCH build — no prior override existed, `simSupported:false` → flipped by this
> gauntlet; the unit was absent from kit-status.json and its row was seeded in the exact
> `--refresh` shape before the `--gauntlet` provenance flip (no global `--refresh` — concurrent
> batches share the file; counts reconcile at batch end).

## Kit summary

D is a Wind SMG Attacker whose damage profile is built on two **Elemental Advantage Attack
Damage** self-buffs (they pay out ONLY against an Iron boss — BEATS[Wind]=Iron): a 91.09%
battle-start window for 15s and a 46.93% window refreshed on every team Full Burst entry. At
battle start she fills 98.56% of the team burst gauge (once per battle — the kit's single biggest
lever: it drags the first Full Burst to ~2.2s) and grants stun immunity for 36.95s — defensively
inert in the sim (the boss never stuns), but load-bearing as the gate feed for her burst's
conditional. Her burst (40s CD) deals 426.24% of final ATK to all enemies, buffs Damage to Parts
▲42.38% for all Attacker allies (inert on the partless boss, kept for fidelity), and — **if she
still holds her own stun immunity at cast** — extends that Full Burst by 5.04s. Since her burst CD
(40s) exceeds the immunity window (36.95s), at most her FIRST cast of the fight can ever qualify;
with the opener fill that cast lands at ~1.8s, so exactly one Full Burst per fight runs 15.04s
instead of 10s. Two self-lifesteal lines (3.52% window + 16.5% first-activation extra) are
offensively inert and sit verbatim in `unmodeled`.

## Line-by-line

| Line                                                                             | Disposition          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: FB entry → self — Elemental Advantage Attack Damage ▲46.93%, 15s             | FAITHFUL             | `fullBurstEnter → self → elemAdvantageDamagePct 46.93/15s`. Advantage-gated ELEMENT bucket (MEASURED placement 2026-07-14 battery 5), not generic Damage Up: byte-identical totals when removed vs the Fire control boss, live vs an Iron boss; fires on EVERY team FB (helm co-B3 makes burstCast-vs-fullBurstEnter genuinely diverge) and refreshes per entry. Counterfactuals: generic stat (moves Fire-boss damage), all-ally scope (4 holders instead of 1).                                                                                                                                                   |
| S1: FB entry → self — recovers 3.52% of attack damage as HP, 15s                 | DOCUMENTED_GAP       | Self-targeted lifesteal: no HP pool in v1, and a `recovery` trigger fires only when its OWNER receives a heal — a self-heal is unobservable in any comp and feeds no consumer. Deliberately NOT a `heal` effect (would assert nothing; the S2b reviewer's crown mis-scope trap is moot with nothing encoded). Verbatim in `unmodeled.skill1`, pinned by test.                                                                                                                                                                                                                                                       |
| S1: first activation — additionally recovers 16.5% of ATK damage as HP, 15s      | DOCUMENTED_GAP       | Same lifesteal rationale; the once-only clause dies with the amount (no engine observable). Verbatim in `unmodeled.skill1`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S2: stage target appears → all allies — Fills Burst Gauge by 98.56%, 1×/battle   | FAITHFUL             | `passive → allies → fillGauge 98.56` — the engine applies a passive exactly once at frame 0, which IS the kit's once-per-battle battle-start fill at single-boss scope (elegg precedent). An instant fill, not a burstGenPct rate buff. Measured: first FB at frame 132 (~2.2s) vs ~5.7s with the fill removed; removal shifts every downstream rotation. ⚑ if multi-boss scopes arrive, "stage target appears" could re-fire (⚑4).                                                                                                                                                                                 |
| S2: stage target appears → all allies — immunity to Stun, 36.95s                 | FAITHFUL (gate feed) | Defensively inert (no CC model; the boss never stuns), but the load-bearing feed of the burst's FB-extension gate: encoded as the `stunImmune` resource window — passive +1 seed at frame 0, `interval:36.95` −1 decrement — reproducing [0, 36.95s] for the gate to read. The all-ally scope of the immunity itself contributes nothing at scope (caveat). S2b demanded it not be dropped ("GAP is not an acceptable disposition") and sketched this encoding; S6 wrongly declared it inexpressible; the judge ruled for the driver.                                                                               |
| S2: stage target appears → self — Elemental Advantage Attack Damage ▲91.09%, 15s | FAITHFUL             | `passive → self → elemAdvantageDamagePct 91.09/15s` — fused frame-0 timed passive (e-h precedent): exactly ONE application, expires at 15s, never re-applied (permanent-window counterfactual discriminates). The two same-stat self-buffs STACK additively — the engine keys buff instances by caster slot + skill slot + stat + value and sums them; measured mult.elem 2.4802 = 1 + 0.10 (advantage major) + 0.4693 + 0.9109 inside FB#1 vs Iron — matching in-game separate-group stacking (refutes S6's overwrite caveat).                                                                                     |
| Burst: all enemies — 426.24% of final ATK as Burst Skill damage                  | FAITHFUL             | `burstCast → enemy → flatDamage 426.24` — burst bucket, cast lands pre-FB (never takes the +50% major, pinned), keyed to HER casts only (count == her burstCast count; helm's rotations produce no nuke).                                                                                                                                                                                                                                                                                                                                                                                                           |
| Burst: all Attacker allies — Damage to Parts ▲42.38%, 15s                        | FAITHFUL             | `burstCast → alliesOfClass Attacker → partsDamagePct 42.38/15s` — parsed-but-inert in v1 (partless boss): byte-identical totals when removed (helm-H4-style exactness pin); holders pinned to exactly {d, helm} per cast (liter/crown excluded); never laundered into a live bucket.                                                                                                                                                                                                                                                                                                                                |
| Burst: if skill user stun-immune → all allies — Full Burst Duration ▲5.04s       | FAITHFUL             | `burstCast → allies → fullBurstExtend 5.04` gated by `resourceGate stunImmune ≥ 1` — THE crux line. Gate evaluated at cast time, exactly as the prose's "if the skill user has immunity" reads. Measured: cast at frame 110 (inside the window) leads the sole extended window — 902 frames = 600 + round(5.04×60); casts at 2362/4404/6314/8194/10105 (all past 36.95s) lead base 600-frame windows. Counterfactuals: ungated (every d-led FB extended), no-seed (none extended). Residual ⚑2: the modeled condition is the WINDOW (not a cast counter) — indistinguishable at scope since CD 40s > window 36.95s. |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Converged on all 9
  dispositions — 7 load-bearing FAITHFUL encodings matching the driver block-for-block, and the two
  self-lifesteal lines UNMODELED (the reviewer's own refinement: a self-heal has no consumer, and
  an ally mis-scope would pump crown's recovery trigger). Drove both refinements the driver
  adopted: UNMODELED lifesteal, and a time-bounded immunity window ("a resource initialized at 1
  with a one-shot decrement, or an equivalent timed-status encoding"). Named the stun gate the trap
  to reconcile hardest: "dropping it forces the burst FB-extension to be either permanently ungated
  (over-credit) or permanently dead (under-credit)".
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently re-derived every line from
  prose; named the stun gate "PRIMARY divergence candidate" and derived from prose alone that "only
  her FIRST cast should extend Full Burst; an unconditional model over-credits every later cast".
  Adapted run vs the driver override (adaptations logged, mechanics only: import path, onEvent
  wiring through `cfg`, `durationShots:null` event contract): **15 pass / 1 RED / 5 skip** (the
  author's own GAPs). The 1 RED is the author's sumDmg monotonicity proxy ("extending FB must raise
  team totals"), false at the fixed 180s horizon: the +5.04s FB#1 holds the gauge lock longer,
  delays every later chain, and clips the final cycle — measured 1.0347B extended < 1.0780B
  unextended. The extension's liveness is separately proven green (inFbHits strictly rises; driver
  pins the exact 902-frame window). Judge classification: RECON_ERROR (blind proxy), no encoding
  change.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Five of seven blocks IDENTICAL to
  the driver (S1 elemAdv, fillGauge, S2 elemAdv, nuke — with explicit `noFb:true` which is the
  engine default, parts buff). Two divergences, both adjudicated: (1) shipped the FB extension
  UNGATED after declaring the gate inexpressible, while self-flagging it as "the single largest
  faithfulness risk in the override" — the judge ruled the driver's resource-window gate the
  faithful model (it is exactly the mechanism S2b sketched); (2) overwrite-vs-stack caveat on the
  two elemAdv self-buffs — measured away (additive stacking, mult.elem 2.4802, matching in-game
  separate-group behaviour). Flag 1 (passive as the battle-start trigger) is the established repo
  precedent (elegg), exact at single-boss scope.
- **S7 (kimi-code/k3, reconciling judge):** binding verdict **GO**, faithfulness **1.0**,
  `gotchas: []`, `discriminationOk: true`. All 9 lines: 7 FAITHFUL + 2 DOCUMENTED_GAP. On the
  crux: "The kit's crux — the stun-immunity-gated Full Burst extension — is where the driver beat
  the blind … the driver's resource-window gate reproduces exactly that, with measured cast frames
  (110 inside, 2362+ outside) and window lengths (one 902-frame FB, all others 600) corroborating."
  The single S5 RED classified RECON_ERROR. "Nothing must change for GO."

## Residual flags (owner spot-check cluster)

All UNMEASURED estimates; none block GO (judge-confirmed).

1. **⚑2 — stun-gate window-vs-first-cast semantics (top residual):** verify in-game that d's SECOND
   burst (t > 36.95s) does NOT extend Full Burst while her first does (FB-duration popup / banner
   length on a d focus recording). The modeled condition is the timed WINDOW; at scope (CD 40s >
   window 36.95s) the window-reading and the first-cast reading coincide.
2. **⚑1 — SMG cadence tuple (mandatory):** pullsPerSec / reloadFrames 111 / rolling-reload are
   datamine-unverified; they drive her normal damage + gauge contribution. Recipe: rounds/min +
   reload gap from any d focus video.
3. **⚑3 — advantage-gating at grading:** both elemAdv lines pay out ONLY vs an Iron boss
   (byte-identical with them removed elsewhere). Confirm boss element before reading her board
   number.
4. **⚑4 — passive-as-stage-appear:** exact at single-boss scope; a multi-boss scope with boss
   transitions could re-fire "stage target appears" (the kit's "1 time per battle" clause would then
   need an explicit once-latch).
