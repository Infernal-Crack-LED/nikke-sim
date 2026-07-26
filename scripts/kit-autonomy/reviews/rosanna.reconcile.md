# rosanna — S2c driver↔reviewer reconciliation (2026-07-26)

Reviewer: kimi-code/k3 (S2b, cross-family; owner routing override — Claude quota exhausted).
Driver: Qwen. Reviewer input: scripts/kit-autonomy/reviews/rosanna.test-review.json.

## CONVERGED (reviewer independently re-derived, agrees with driver)
- **S1 Critical Rate ▲19.34% / 3s** → FAITHFUL. Reviewer: GENERIC `critRatePct` (text says "Critical Rate", NOT "of normal attacks"), hitCount:120 recurring, self, durationSec 3. Independently flags the two traps the driver's R2 discriminates: the scoped `critRateNormalPct` misread and inheriting the concealment line's 10s/permanent duration. ✓ exact match.
- **S1 Concealment 10s / S2 Concealment 5s** → UNMODELED (defensive anti-single-target; v1 boss deals no damage). ✓ match.
- **S1 Removes 5 buffs (once/battle)** → UNMODELED (enemy buff-strip; boss carries no buffs). Reviewer independently warns NOT to misread it as clearing boss-held team debuffs (damageTakenPct). ✓ match.
- **S2 ally-incapacitation Frenzy (ATK ▲22.61% ×10/30s) + Burst Gauge 36.54%** → UNMODELED (no incapacitation TriggerDef; immortal-boss fixture → nobody is ever incapacitated → faithful behavior is ZERO stacks). Reviewer independently flags the catastrophic nearest-wrong model: a passive-at-stacks encoding ≈ +226% ATK over-credit. The driver's model only encodes the DISTINCT 500-normal Frenzy (R3), never the ally-death one. ✓ match.
- **Burst Assalto 1310.4%** → FAITHFUL. Reviewer: burstCast stage-1, single boss, crit-eligible / NO core / noRange / FB-major-exempt (cast precedes the FB window). Independently flags the fullBurstEnter trap (would take +50% FB major). ✓ match with driver R4.
- **Fixture trap (liter B1 contention)** → reviewer warns that controlComp(carry=rosanna) slots liter at B1, which would consume every stage-1 cast and silently zero rosanna's burstCast blocks. The driver ALREADY avoided this: the fixture is `rosanna / crown / helm` (NO liter), rosanna is the SOLE B1, the test asserts `BURSTS > 0` (fixture sanity), and 5 bursts / 5991 normals were observed over 180s. ✓ trap sidestepped.

## DIVERGENCE 1 — burst 561.6% concealment-gated additional damage (the one substantive call)
- Reviewer: disposition GAP, loadBearing **true**. Recommends encoding it UNGATED (no self-status gate primitive exists) + emitting an inert concealment marker-buff + ASSERTING the marker is active at every burstCast frame (≈100% in-fixture uptime) + ⚑. Warns that dropping it "as defensive fluff" is the shared-prior trap (−~30% burst).
- Driver: disposition DOCUMENTED_GAP (⚑1), NOT modeled. Reasoning: the ≈100% in-fixture uptime the reviewer cites is correct BUT is a SIM ARTIFACT — the v1 boss deals no damage, so "removed upon taking a direct hit" never fires and concealment is continuous after the ~3.6s first proc. In a REAL fight concealment breaks on every direct hit, so real uptime is strictly lower and is a timing read the sim cannot reproduce. Encoding ungated bakes that unmeasured artifact into the damage total (fudge); the reviewer's marker workaround also needs an inert-stat hack (no concealment/self-status stat in the schema). The honest ⚑ (estimate +43% burst, recipe = concealment self-status primitive + burst-cast-timing read, tier = out-of-domain + measurement-gated) preserves "measured > fudge" and is explicitly NOT a silent drop.
- Resolution: driver keeps the honest gap; documents the reviewer's coherent alternative + the exact reason for the conservative choice in the override note ⚑1. Both positions are defensible; the S7 judge adjudicates. (Protocol: "a blind honest ⚑ is correct"; a documented gap is accounted-for, not a faithfulness deduction.)

## DIVERGENCE 2 — reviewer spec is INCOMPLETE (driver covers four lines the reviewer omitted)
The reviewer's `spec` lists 8 lines but the kit has 11. OMITTED by the reviewer:
- **S1 "Elemental Advantage Attack Damage ▲20% continuously"** → driver R1, FAITHFUL (`elemAdvantageDamagePct` 20 passive self; engine ELEMENT bucket, applied only while `advantaged()`; live vs Water mult.elem 1.30, inert vs Iron 1.00). LOAD-BEARING.
- **S2 "after landing 500 normal attacks → Frenzy ATK ▲22.61% ×10/30s"** → driver R3, FAITHFUL (`atkPct` 22.61 hitCount:500 maxStacks10/30s; the DISTINCT 500-normal source, not the ally-death one). The reviewer listed only the ally-death Frenzy.
- **Burst "if Assalto target is a Water Code stage target → Damage Taken ▲29% / 30s"** → driver R5, FAITHFUL (`damageTakenPct` 29 burstCast + bossElementGate Water; boss-held null/null, team-wide mult.taken 1.29, inert vs Iron). LOAD-BEARING.
- **S2 "when a Nikke is incapacitated → 400% of final ATK to 1 enemy"** → driver R7, UNMODELED (ally-death; asserted never fires).
These four are independently re-derived by the S5/S6/S7 blind roles (the reviewer's omission means its corroboration, where it speaks, is concordant but partial).

## Disposition
GO-track. 5 modeled lines (R1–R5) each pinned GREEN vs shipped + RED vs counterfactual; 6 lines UNMODELED verbatim with reason; 2 gap-honesty assertions (R6 no 561.6% proxy, R7 no 400% ally-death hit). One substantive ⚑ (561.6% concealment-gated) reconciled above. No REAL-GOTCHA in the reviewer's findings; its fixture trap was pre-empted.
