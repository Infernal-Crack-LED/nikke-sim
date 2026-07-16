# kit-parse baselines — staging (HYPOTHESES, not validated models)

Generated 2026-07-16 by the `/kit-parse` skill (the "real run" after the skill was hardened + gated
GO-WITH-GUARDRAILS across 8 regression units). These are **starting-position baselines for currently-
unmodeled units** — a ~80% head start for hand-tuning, NOT accurate models. Every file's `note` opens
with the hypothesis banner and carries its full per-line audit + ⚑ list.

**This dir is NOT loaded by the engine** (only `src/skills/overrides/` is). To use a baseline: review it
against the guardrails below, then promote it to `src/skills/overrides/` and hand-tune against a recording.

## Guardrails before promoting ANY baseline (from the confidence gate)
- **G1** every ⚑ stays OPEN until measured; a baseline is a shopping-list of what to record, not a number to trust.
- **G2** run the mechanism-capture review (skill Step 6) per unit — there is NO automated accuracy grade for these units.
- **G3** buffers/enablers: run a `/sim-battery` blast-radius diff before any board-level use (own-total is meaningless).
- **G4** SG units are **magnitude-capped** (engine SG core bands are HR-contaminated) — tagged in-note; exclude from meta-weighting until the HR=0 band re-derive lands.
- **G6** HP-scaling units gate on one retrospective HP-scaling test first. **None of these 18 are HP-scaling** (every "Max HP" reference was defensive / heal-magnitude / ally-Max-HP-grant — verified per unit), so G6 does not trigger here.

## The 18 baselines

| unit | weapon/burst | archetype / key mechanic | dominant ⚑ | flags |
|------|-----|------|------|------|
| scarlet | AR B3 | self-buff stacks + HP-threshold crit gates | cadence; HP-gate uptime | self-only, no blast radius |
| blanc | AR B2 | heals + shield + burst-CDR + boss damage-taken | heal cadence | NOT HP-scaling; shield unrepresentable |
| guilty | SG B2 | ally-ATK duplication + boss DEF-down (inert) | stack steady-state | **SG-capped** |
| leona | SG B2 | team crit + pellets+5 + Hit-Rate (inert) | Hit-Rate→core mag | **SG-capped**, buffer |
| liter | SMG B1 | escalating team burst-CDR + crit/ammo/ATK | cadence; heal trigger | buffer (blast radius) |
| helm-aquamarine | AR B2 | self-DPS + escalating CDR; kit-silent proc | invented S2a trigger (TOP) | Electric-gate lines inert |
| mari | SR B2 | pierce/ATK buffs + burst nuke | kit-silent S2 trigger (TOP); autofire | supporter |
| mana | AR B3 | permanent ATK + σ gauge + burst sustained DoT | cadence (DoT ~59% of dmg) | NOT HP-scaling |
| anchor-innocent-maid | RL B2 | escalating team buffs + heals | autofire; heal cadence | NOT HP-scaling; healer |
| zwei | SG B1 | pierce team buffs + weaponSwap + heal | swap economy; pierce-status gate | **SG-capped**, buffer |
| noir | SG B3 | team ATK + ammo/reload + Hit-Rate (inert) | Hit-Rate→core; SG landing | **SG-capped** |
| anis-sparkling-summer | SG B3 | last-bullet proc + maxAmmo-floor + elem-adv | burst-window proc count | **SG-capped** |
| isabel | SG B3 | escalating Marked-Target riders (no-core, text-faithful); S2 rider MEASURED time-based ~14.7s (passive dot, 2026-07-16) | S2 coef 174.49-vs-170.58 tension; team-fight period unverified | HR-clean; landing-at-range pending |
| bready | SR B3 | mode system (tastes) + Aftertaste DoT + charge debuff | mode default; autofire; DoT cadence | negative charge-speed via charFixes |
| delta-ninja-thief | MG B2 | mode-gated; IFAK heal (Crown synergy +14%); 2× damage-taken | IFAK cadence; def-mode uptime | NOT HP-scaling; Defender |
| soline-frost-ticket | SG B1 | ticket→ally Max-HP grant + burst-CDR + heal | cadence | **SG-capped**; NOT HP-scaling |
| brid-silent-track | SG B2 | FB riders + element-gated damage-taken | shot-vs-pellet count | **SG-capped** |
| volume | SMG B1 | escalating team crit + burst-CDR | cadence | buffer |

## Notes
- Every SG baseline (8) carries the G4 magnitude-cap tag in its note.
- Buffers/supporters (liter, leona, mari, zwei, noir, anchor, delta, soline, volume, helm-aqua, blanc)
  need `/sim-battery` blast-radius diffs, not own-total grading (G3).
- Kit-silent invented triggers (helm-aquamarine S2a, mari S2) are the top per-unit uncertainty
  and the #1 recording priority for those units. (isabel S2 RESOLVED 2026-07-16: measured time-based
  ~14.7s via the solo counter read — docs/probe-data/isabel-sg-band.json riderFinding.)
- All 18 pass `validate-overrides` (structural). `anchor` had escalating tier-order placeholders converted
  to inert 0-buffs (the schema's `ignored` effect is rejected by the validator — a real types.ts↔validator
  drift several authors flagged; worth reconciling separately).
