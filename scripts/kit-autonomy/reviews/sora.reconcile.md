# S2c reconciliation — sora (driver vs claude-fable-5 S2b review)

CONVERGENCE (6/6 lines):
- skill1 outgoing-healing 35.2%: UNMODELED (both) — heal amounts unmodeled; fable adds the
  useful refinement that heal MAGNITUDE is irrelevant to recovery triggers (events, not amounts).
- skill2 part-destroy trigger + storage + ATK 23.74: UNMODELED (both) — no part-destroyed
  event primitive, partless scope boss; fable independently names the SAME nearest-wrong
  (substitute trigger materializing a passive casterAtkPct grant) and the shape note
  (casterAtkPct not atkPct, if ever live). Driver's materialized-Atk counterfactual uses
  casterAtkPct per this shape.
- burst heal 52.27% final Max HP: FAITHFUL (both) — burstCast (NOT fullBurstEnter), allies,
  instant ticks:1 heal; the kit's only load-bearing line; fable flags the taxonomy-#4 trap
  (skipping it as 'defensive') which the driver's live-consumer assertions close.
- burst cleanse: UNMODELED (both) — no ally debuffs exist in v1.

DIVERGENCES (ruled driver-side, documented):
1. FIXTURE — fable proposes sora/crown/carry; driver uses sora(B1)/folkwang-bare(B2)/asuka(B3).
   Rationale: asuka's S1 recovery consumer is SELF-targeted (exactly one buffApply per recovery
   landing — no per-holder multiplicity), and bare-folkwang + lifesteal-stripped asuka make sora
   the SOLE recovery source. crown is itself a recovery consumer AND carries a hitCount-860
   self-heal (needs patching out; snow-crane precedent chose the same isolation path). The
   driver fixture subsumes fable's design with stricter source isolation.
2. UNMODELED SPLIT — fable splits skill2 into 3 verbatim entries (trigger header / storage /
   ATK line), skill1 as the value line only. Driver adopts fable's granular skill2 split but
   keeps skill1 as the FULL prose line (the activation clause is part of the same kit line).
   Both forms are verbatim substrings; the test asserts containment dynamically.

VERDICT: GO (cross-family) — no REAL-GOTCHA; both families agree the faithful override is one
burstCast/allies/heal block plus a complete verbatim unmodeled record.
