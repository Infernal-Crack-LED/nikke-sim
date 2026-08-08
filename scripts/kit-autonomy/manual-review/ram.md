# Manual review — ram (Ram)

**Gauntlet date:** 2026-08-05
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped self-only burst CDR; `fullBurstEnd` trigger identity; `burstCast`-vs-`fullBurstEnter` keying; shield-event channel with cross-unit consumers)

> Slug disambiguation: `ram` is the BASE Re:ZERO collab unit (SR/Defender/Fire/Burst I, released
> 2024-03-21, `treasure:false`, slug lint clean — no AMBIGUOUS). She is the defensive counterpart of
> `rem` (MG/Supporter/Water/Burst II, gauntleted 2026-08-01) and a collab mate of `emilia`.

## Kit summary

Ram is a Fire-element sniper Defender on Burst I whose kit is almost entirely survivability. After
every five landed shots she weakens the target's ATK for 5s (damage-inert in v1 — the engine models
no enemy ATK). Each time a Full Burst ends she refunds 20.16s of her own 40s Burst-I cooldown — the
ONE rotation-load-bearing line: it collapses her effective CD to ≈19.8s, doubling the team's stage-1
fill cadence once the gauge cycle is below ~20s. Her 15s-cooldown second skill raises her OWN Max HP
by 40.72% for 10s without restoring HP (inert for her — no HP-scaling conversion — but encoded
natively as an own-kit maxHpFlat grant), and stiffens the DEF of the two lowest-HP allies by 11.34%
of her own DEF (unmodeled — no caster-basis DEF primitive exists, and DEF is inert in v1). Her burst
shields all allies for 10.08% of her final Max HP for 10s — event-only (no HP pool), but it opens
shield-state windows and fires teammates' `shielded` triggers, which is how her burst value enters
the sim at all (naga-class consumers read her shield cadence).

## Line-by-line

| Line                                                             | Disposition               | Notes                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: after 5 NA → target ATK ▼7.95%/5s                            | UNMODELED                 | Engine models no enemy ATK (v1 boss deals no damage); nearest-wrong `damageTakenPct` is a DIFFERENT mechanic — absence pinned + sensitivity counterfactual |
| S1: FB ends → self Burst CD ▼20.16s                              | FAITHFUL (⚑2 gate)        | `fullBurstEnd → self burstCdr 20.16`; rotation-load-bearing; same-squad clause modeled always-satisfied (see ⚑2); R1 pins gap <35s + no-CDR counterfactual |
| S2: self Max HP ▲40.72%/10s, no heal                             | FAITHFUL (inert)          | `interval:15 → self targetMaxHpPct 40.72/10s` (own-kit maxHpFlat; kit-silent CD-skill convention); inertness PROVEN byte-identical; no-heal holds by construction |
| S2: 2 lowest-HP allies DEF ▲11.34% of user DEF/5s                | UNMODELED                 | No caster-basis DEF primitive (`defPct` = target's own %, wrong basis, inert anyway); absence pinned + defPct/casterAtkPct sensitivity counterfactuals |
| Burst: all allies Shield 10.08% final Max HP/10s                 | FAITHFUL                  | `burstCast → allies → shield 10.08/10s`; event-only, observed via naga's shielded consumer frame-locked; two-B1 alternation probe proves OWN-cast keying |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All five dispositions
  corroborated. Contributions adopted: the `casterAtkPct`-template reflex as R4's second-nearest-wrong
  (absence-pinned), and the two-B1 alternation probe for `burstCast`-vs-`fullBurstEnter` identity
  (R5b). One proposal REJECTED with reason: enacting `teamHas.sameSquad` on the CDR — the primitive
  fails closed off `src/data/squads.ts` and ram's collab squad is UNCONFIRMED (QUEUE.md: "collab-unit
  squad unknown, confirm before authoring"; squad membership is owner-confirmed fact), so the
  anchor-innocent-maid precedent ships (always-satisfied + caveat + ⚑2).
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. 14 assertions; vs the driver override:
  **11 pass / 1 fail / 2 skip** (the mechanical harness import-path fix is the only driver edit).
  The SOLE failure is the structural `teamHas?.sameSquad === true` expectation on the CDR block —
  the documented ⚑2 divergence, anticipated and recipe-carrying. The 2 skips are the blind author's
  own observability concessions (the shield event is not in `cfg.onEvent`; the driver observes it
  through naga's shielded consumer instead).
- **S6 (claude-opus-5, blind override):** `leakDetected:null` (retry 1 after a prose-response parse
  failure). Burst shield block BYTE-IDENTICAL; skill1 CDR identical plus the same `teamHas.sameSquad`
  addition as S5. Two divergences, both ruled blind-side recon slips by the judge: trigger `passive`
  instead of `interval:15` on the Max-HP line (fires once at t=0 vs the kit's repeating 15s CD skill;
  contradicts the SSOT internal-cooldown convention), and `defPct 11.34` modeling of the DEF line
  (wrong basis — the kit is "% of the skill user's DEF"; formally wrong though damage-neutral).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, no
  REAL-GOTCHA.** All five lines FAITHFUL or DOCUMENTED_GAP. The one gotcha (squad-gate omission,
  severity med) is `documentedByDriver:true` with a recipe: owner confirms ram's in-game squad
  field → curate `src/data/squads.ts` → one-line `teamHas.sameSquad` swap (QUEUE.md migration item;
  the blind suite goes green as-is once curated). Judge: "the strongest line in the packet" = the
  burst shield (three-way encoding convergence + fixture isolating the channel through a real
  consumer, discriminating both nearest-wrong models).

## Residual flags (owner spot-check cluster, from the judge)

- **⚑2 (the one):** the same-squad gate on the FB-end CDR is modeled always-satisfied. Confirm ram's
  in-game squad field (Re:ZERO collab — likely rem/emilia, UNCONFIRMED); then curate
  `src/data/squads.ts` and add `teamHas:{sameSquad:true}` to the skill1 block. Until then the CDR
  over-fires in non-collab comps (impact limited to her burst/shield cadence — damage-inert except
  through shield consumers like naga).
- **⚑3:** the `interval:15` first-fire phase (t=15 vs t=0) is the documented convention, unpinned by
  footage — worth one 10s Max-HP grant window.
- **⚑1:** the SR cadence tuple (pullsPerSec / chargeFrames 60 / reloadFrames 141) is datamine-only.
  One ram focus video + one squad-field lookup settles all three.

## Artifacts

- Driver test: `scripts/tests/units/ram.test.ts` (12/12 GREEN; fixture [ram,naga,helm] boss Iron
  focus ram + two-B1 alternation probe [ram,liter,naga,helm])
- Override: `src/skills/overrides/ram.json` (FROM-SCRATCH; validate-overrides pass: 40.8M, 9 bursts)
- Results: `scripts/kit-autonomy/results/ram.json` (judge kimi-code/k3)
- Cross-family: `scripts/kit-autonomy/reviews/ram.test-review.json`, `blind/ram.test.ts`,
  `blind/ram.override.json`, `cross-family/ram/{s2b,s5,s6,s7}-result.json`
- Verify: `scripts/kit-autonomy/reviews/ram.verify.txt` (12/12); `bash scripts/verify.sh` green
