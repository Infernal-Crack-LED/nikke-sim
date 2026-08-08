# Manual review — ether (Ether, BASE)

**Verdict: GO — faithfulness 1.0** (binding judge kimi-code/k3, zero gotchas, discrimination ok).
Kit-autonomy gauntlet 2026-08-05. Tier 2 (scoped buff — the burst's "3 lowest remaining HP
allies" leftmost-3 stand-in + burstCast-vs-fullBurstEnter identity on the shield + the
CD-bearing auto-cast rider). FROM-SCRATCH build: no prior override, no kit-status row,
`simSupported false → true` (1-line characters.json diff); kit-status row seeded in the
`--refresh` shape then flipped via `--gauntlet` (`--check` OK at 162 units, no per-unit
`--refresh` — jackal/crow precedent).

SG / Defender / Electric / Burst I, 40s burst CD, ammo 9, hitsPerShot 10, Missilis, SR
(released 2022-11-04). **Base unit** — no variant shares her name (lint clean). ETHER IS A
TANK/SHIELDER: one small recurring skill hit, a boss DEF-shred she cannot actually apply in
this engine, an ally damage-reduction window the sim has no surface for, and a big shield.
Her sim damage is her bare SG weapon + one 56.32%-of-ATK rider; her real value is
survivability (out-of-domain) plus the shield's synergy events (shielded triggers /
requiresShielded gates).

## Kit summary & line-by-line dispositions

| Line | Kit text (SL10)                                                                                     | Disposition          | Encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1   | ■ 1 ally, lowest remaining HP: Damage Taken ▼52.5% for 5 sec (CD 15s)                               | UNMODELED (verbatim) | Ally-side received-damage mitigation: v1 models no ally HP pool and no incoming boss damage, so it can never move anything (sakura-suzuhara's S2 is the identical line and the binding precedent). The boss-facing `damageTakenPct` channel is the WRONG direction AND target — encoding ±52.5 there would manufacture a phantom team damage change on the 15s cadence. Pinned: zero buffs originate from ether, zero `damageTakenPct` anywhere at baseline; the +52.5 boss-channel counterfactual applies the debuff and lifts team totals (the omission is a choice). ⚑1 out-of-domain with estimate + recipe + tier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| S2a  | ■ 3 enemies with the highest final DEF: Deals 56.32% of final ATK as damage (no activation clause)  | FAITHFUL             | `interval:13` → enemy → `flatDamage atkPct 56.32`, bare rider defaults (crit-eligible, no core, skill bucket, FB-major by landing timing). TRIGGER IDENTITY — the litigated line, ruled FOR interval:13 by the judge on three grounds: (a) house prose convention — an activation clause attaches to the ■ block whose header carries it (ada/kurumi head their FB-keyed blocks with "Activates during Full Burst"; ether's FB clause sits in block 2's header, governing the DEF▼ line alone); (b) the datamined 13s CD — ada/kurumi's purely FB-keyed skill2s have CD null, and an FB cycle ≥20s makes a CD meaningless on a purely FB-entry skill; (c) three independent blind derivations (S2b fable-5, S5/S6 opus-5) all read interval. First-fire phase t=13 is the engine interval convention (⚑, neve/snow-white/novel precedent). "3 enemies" collapses to the single boss — a multi-target SPREAD, NOT a ×3 multiplier. Pinned: 13 fires at t=13k frames, magnitude 56.32 (not 24.64), in-FB/out-of-FB FB-major split, fullBurstEnter/burstCast keyings + ×3 fold all RED. |
| S2b  | ■ same enemies. Activates during Full Burst: DEF ▼9.38% for 6 sec                                   | UNMODELED (verbatim) | The engine has no dynamic enemy-DEF-reduction primitive (`applyBuff` drops enemy DEF▼ at dispatch; `cfg.bossDef` is fixed; `damageTakenPct` is a different bucket — novel / mast Sea-Breeze precedent). Magnitude ~0.03% team damage (13.13 flat DEF off the 140-DEF scope-lock boss) — minor, not load-bearing. The S6 blind writer encoded it as `defPct −9.38` on the enemy — the judge ruled it a RECON_ERROR (an inert-at-dispatch block masquerading as a modeled line, plus defPct is self-DEF semantics); the S5 blind author independently refused the same encoding as a fudge. Pinned: the `damageTakenPct +9.38` misread applies per FB entry and lifts totals; baseline has zero boss debuffs. ⚑2 engine gap with estimate + recipe + tier.                                                                                                                                                                                                                                                                                                   |
| BU   | ■ 3 allies, lowest remaining HP: Shield = 96% of the skill user's final Max HP for 5 sec            | FAITHFUL             | `burstCast` → `alliesLowestHp count:3` → `shield maxHpPct 96 / durationSec 5`. No shield HP amount modeled (v1 boss deals no damage) — the encoded substance is the SHIELDED event + 5s shield-state window (fires teammates' `shielded` triggers / `requiresShielded` gates; snow-crane precedent — never skip a shield line for isolation). Trigger identity = her OWN Burst I cast: fixture B (double-B1 w/ liter + asuka's requiresShielded probe) proves gate-passes == ether's cast count < FB count; a fullBurstEnter keying shields every FB. Scope: fixture C proves a slot-4 asuka unshielded at baseline, shielded by the all-allies counterfactual. "Lowest remaining HP" → leftmost-3 documented v1 stand-in (no HP pool). Damage-INERT: removal leaves totals byte-identical.                                                                                                                                                                                                                                                           |

## Cross-family corroboration

- **S2b test-faithfulness review — claude-fable-5:** converged on S1 UNMODELED (boss-channel
  inversion pre-registered as the nearest-wrong), S2a FAITHFUL single-instance 56.32 (×3 fold
  pre-registered), S2b GAP (⚑ CALIBRATED or verbatim-unmodeled), burst shield FAITHFUL
  (burstCast / alliesLowestHp:3 / shield 96/5 — "never skip shield lines on isolation"). Its
  ONE divergence: the S2a trigger read as interval-vs-fbGate-on-interval rather than the
  driver's then-current fullBurstEnter — the first signal of the trigger dispute; reconciliation
  initially favored the driver, then the S5/S6 evidence + the prose/CD structure reopened it
  (below).
- **S5 blind test writer — claude-opus-5:** 20 tests (17 live + 3 GAP skips: enemy-DEF
  primitive absent; shield tandem/target-set unobservable in ITS fixture — the driver's
  fixtures B/C cover both via asuka's requiresShielded probe). vs the driver override:
  **17 PASS / 0 FAIL / 3 SKIP** after TWO executability-only adaptations (zero assertion
  changes): (1) its `casterOf()` helper read `srcSlot`-as-number/`casterIdx` on damage events,
  which never match (damage events carry the owner in `unitIdx`) — every rider assertion would
  have silently read 0; (2) its `run()` wired `onEvent` onto `opts.onEvent`/`opts.cfg?`, but
  `controlComp()` exposes no `cfg` key — the adaptation threads it via `opts.cfg`. The suite
  independently recovers the 56.32 magnitude by two-point extrapolation (refuting the ×3 fold),
  pins noRange/core-ineligibility/FB-major-by-landing, whole-kit anti-fudge (zero offensive
  buffs from ether), and board-inertness of both defensive lines.
- **S6 blind override writer — claude-opus-5:** converged on skill1-unmodeled, S2a
  interval-rider 56.32, and the burst shield block (byte-identical shape to the driver:
  burstCast → alliesLowestHp:3 → shield 96/5). Two divergences, both resolved for the driver:
  (a) interval **sec:10** — the blind author invented the period (its own ⚑ admits "trigger
  identity AND cadence both invented"); the datamined skillCooldownsSec.skill2 is 13.
  (b) S2b encoded as `defPct −9.38` on the enemy — inert at dispatch (the engine drops enemy
  DEF debuffs; defPct is self-DEF semantics), i.e. a silent drop with extra steps; the judge
  ruled RECON_ERROR.
- **THE TRIGGER PIVOT (driver transparency):** the driver initially encoded S2a as
  fullBurstEnter (whole-slot FB reading) and reconciled S2b's interval objection away. The
  S5/S6 packets then independently re-derived interval, and two structural facts overturned the
  driver's own reading: the clause-position convention (ada/kurumi) and the datamined 13s CD
  (meaningless on a purely FB-keyed skill — FB cycles are ≥20s; ada/kurumi's FB-keyed skill2s
  have CD null). The override, tests, and all pins were rebuilt around interval:13 BEFORE the
  judge ran; the fullBurstEnter reading is pinned RED in the shipped suite.
- **S7 binding judge — kimi-code/k3:** GO, faithfulness 1.0, zero gotchas, discriminationOk
  true. Ruled the litigated S2a trigger FOR interval:13 on all three grounds; ruled the S2b
  split FOR verbatim-unmodeled+⚑ over S6's defPct encoding; certified the S5 GREEN and the
  fixture-B/C behavioral shield pins.

## Residual flags (owner spot-check cluster — judge-named, ⚑ with recipe)

1. **⚑ S2a interval identity + first-fire phase.** The interval:13 encoding rests on the
   datamined CD + prose-structure inference + three-way blind convergence, not footage; the
   t=13 first-fire phase is the engine's interval convention. Recipe: one popup-cadence read of
   ether's S2 hits in a real fight settles both (expected: a 56.32%-of-ATK skill popup every
   ~13s, in and out of Full Burst).
2. **⚑1 — S1 ally mitigation (out-of-domain).** Real survivability window (~52.5% less damage
   on the designated ally, 5s per 15s) that the v1 sim cannot surface. Recipe: an ally-HP-pool
   + incoming-boss-damage model + an ally received-damage-reduction stat (distinct from the
   boss-facing damageTakenPct channel), then interval:15 → alliesLowestHp count:1.
3. **⚑2 — S2b enemy DEF▼ (engine gap, minor).** ~0.03% team damage cold at the 140-DEF boss.
   Recipe: a boss-DEF-reduction debuff primitive feeding the subtractive DEF term (9.38%/6s,
   refreshed at FB entry) — enact together with novel's DEF ▼7.05% line (same family).
4. **⚑ lowest-HP stand-in.** "3 allies with the lowest remaining HP" resolves to the leftmost
   3 at scope (no HP pool). Only an HP-pool model can make the selection true; the shield
   window itself is behaviorally pinned.

None is a fudge; none blocks GO. No board reading exists yet (unit has no real recordings —
not on the accuracy board before or after the flip; tier MODEL_ONLY, tuned false,
generatorSupported stays false).

## Artifacts

- Driver test: `scripts/tests/units/ether.test.ts` (22/22 green)
- Override: `src/skills/overrides/ether.json`
- Results: `scripts/kit-autonomy/results/ether.json` (+ `results/ether-judge-packet.md`)
- Blind: `scripts/kit-autonomy/blind/ether.{test.ts,adapted.test.ts,override.json,blind-run.txt}`
- Cross-family evidence: `scripts/kit-autonomy/cross-family/ether/{s2b,s5,s6,s7}-result.json`
- S2b review: `scripts/kit-autonomy/reviews/ether.test-review.json`
- Verify: `scripts/kit-autonomy/reviews/ether.verify.txt`
