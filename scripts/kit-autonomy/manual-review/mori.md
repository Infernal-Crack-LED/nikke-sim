# Manual review — mori (Mori)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status gate — `requiresShielded` selects the burst's in-Struggle branch; team-wide ally buff)

> FROM-SCRATCH build: no override existed before this gauntlet (`simSupported` was false). The
> override was authored test-first; the spec test was RED until the override landed, then 14/14 GREEN.

## Kit summary

Mori is a Wind-element AR Supporter on Burst II whose whole kit hangs on one named state: at battle
start she raises **Struggle**, a Shield sized at 40.12% of her final Max HP, held continuously. While
Struggle stands, her burst tops the shield up by 15.04% of her final Max HP and — unconditionally —
grants **all allies Sustained damage ▲10.16% for 10s**, her one live damage contribution in the sim.
The rest of the kit is scoped out by the sim basis: when Struggle ENDS she would stack Max HP ▲5.06%
(up to 5), after 60 normals in Struggle she would taunt, and when any part of an enemy is destroyed
she would stack a team Sustained buff and hang a 23.23%-ATK/s sustained DoT on the strongest enemy —
but the scope-lock boss deals no damage (so Struggle never breaks) and has no parts (so nothing is
ever destroyed), and the engine has no taunt primitive. The encoding models exactly the reachable
surface and records the rest verbatim.

## Line-by-line

| Line                                                       | Disposition    | Notes                                                                                                                                       |
| ---------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: battle start → Struggle shield 40.12% final Max HP     | FAITHFUL       | passive/self/`shield` maxHpPct 40.12, no durationSec ("continuously" = permanent at scope — label precedent); opens the shield-state window |
| S1: burst while NOT in Struggle → re-shield                | DOCUMENTED_GAP | Unreachable at scope AND inexpressible (no inverse `requiresShielded`); verbatim in unmodeled, not guessed                                  |
| S1: Struggle ends → Max HP ▲5.06% ×5                       | DOCUMENTED_GAP | No shield-end trigger; Struggle never ends at scope (correct stack count 0, not 5 — an always-on passive would model the opposite)          |
| S2: 60 normals in Struggle → taunt 4s                      | DOCUMENTED_GAP | No taunt/targeting primitive; damage-inert                                                                                                  |
| S2: part destroyed → allies Sustained ▲2.03% ×5/15s        | DOCUMENTED_GAP | No part-destruction trigger + partless boss (d-killer-wife parts precedent); a guessed-in cadence would be fabrication                      |
| S2: part destroyed → enemy DoT 23.23%/1s ×15s              | DOCUMENTED_GAP | Same trigger gap; recipe recorded (ONE appended dot instance per break — a repeating trigger would multiply)                                |
| Burst: in Struggle → recover Shield HP 15.04% final Max HP | FAITHFUL       | burstCast/self/`shield` maxHpPct 15.04 gated `requiresShielded:true`; event- and damage-inert in v1 (M4 byte-identical strip)               |
| Burst: NOT in Struggle → Max HP ▲10.09%/10s                | DOCUMENTED_GAP | Mirror of the S1-b branch: unreachable + inexpressible; verbatim in unmodeled                                                               |
| Burst: all allies → Sustained damage ▲10.16%/10s           | FAITHFUL       | burstCast/`allies` incl. self; `sustainedDamagePct` (NOT generic attackDamagePct) — M2 proves it feeds only sustained-flavor hits           |
| Gauge: 0.2/shot                                            | FAITHFUL       | Datamined row in `data/gauge-per-shot.json` (base 20 / target 40 = energy 2000/4000 ÷100), helm-H3 convention                               |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. CONVERGED: identical
  load-bearing set (burst `sustainedDamagePct` 10.16/10s on burstCast to allies-incl-self; the
  battle-start Struggle shield as the status topology), identical 6-line UNMODELED set, and it
  pre-named the exact traps the tests kill (generic-bucket misread, fullBurstEnter keying, phantom
  part-DoT, inverted Struggle topology). One divergence: reviewer would leave the burst shield
  top-up UNMODELED (no observable); driver models it for kit completeness (`shield` effect docstring
  "recorded for kit completeness") with M4 proving it exactly inert.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived all 9 lines with the
  same dispositions (incl. "correct stack count is 0 all fight" for the Struggle-end stacks and the
  ⚑ that nothing in the prose says what ENDS Struggle). Pristine artifact does not run unmodified:
  module-load crash on a guessed override shape + two assertions reading a `shield` event kind the
  SimEvent union does not emit. Adapted (`blind/mori.adapted.test.ts`, RE1–RE8 documented in header,
  each citing prior-unit precedent; assertion INTENT preserved): **12 pass / 0 fail / 2 pre-registered
  GAP skips** vs the driver override. All adaptations are blind-side RECON_ERRORs (fixture starvation
  rebuild per the owner's sole-B2 note, event-contract nulls, non-event-carrier structural pins).
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. **Block-for-block identical** to the
  driver override (same 3 blocks, same gates/targets/magnitudes, same block order) and the same 6
  SKIP lines with matching reasons; its ⚑ list independently derives the Struggle-proxy semantics,
  the burstCast-vs-fullBurstEnter call, and the part-destruction fabrication hazard.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas: [].**
  All 9 lines accounted (3 FAITHFUL + 6 DOCUMENTED_GAP), zero silent drops, S5 ruled GREEN (0 red),
  every S2b-named trap confirmed killed with discriminating evidence. Residual flagged for the owner:
  Struggle-as-`requiresShielded` and "recover Shield HP" as a shield set-effect are agreed by
  construction, not measurement (see below).

## Residual flags for owner

1. **Struggle ≡ shield-presence proxy (MEASUREMENT-GATED).** All three roles agreed Struggle is the
   state of holding the shield (the kit names it only via the shield lines), but nothing in the prose
   says what ENDS it. In game it is presumably shield depletion by boss damage — the sim models no
   incoming damage, so the proxy is permanent at scope. Recipe: record a fight where mori takes damage
   and watch whether the Struggle icon drops when the shield depletes; if so, the Struggle-end Max-HP
   stacks and both not-in-Struggle branches become live and need a self-status primitive.
2. **Struggle-end Max HP stacks (out-of-domain until shield-break exists).** 5.06% ×5 = 25.3% self
   Max HP at cap; offensively inert in this kit (no HP→damage scaler) but load-bearing for any
   teammate scaling off her HP. Expect a sawtooth trajectory (cap/2 time-average), not instant cap.
3. **Part-destruction payload is mori's real kit weight.** Her entire S2 (team Sustained stack +
   23.23%/s enemy DoT) is dead on the partless scope-lock boss. On any future destructible-part boss
   content: add a `partDestroyed` trigger, then measure part-break frequency for the real stack count
   and DoT re-arm cadence (ONE appended 15s/1s instance per break — a repeating trigger multiplies).
4. **Cadence tuple datamined, unmeasured (S6 ⚑).** ammo 60 / reloadFrames 81 / AR 720rpm as shipped;
   her normal-attack share and gauge generation ride on it. Bounded error (no ATK/crit buffs, no
   riders). Recipe: mori focus recording — ammo-counter decrements per window + empty-to-full frames.
