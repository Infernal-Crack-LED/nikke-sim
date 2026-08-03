# Manual review — soline (Soline)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate kit — two "at Max HP"-gated lines, both always-true under the v1 scope lock)

> ⚠ Slug disambiguation: this is BASE `soline` (SMG/Iron/Attacker, Burst III, cd 40s) — **not**
> `soline-frost-ticket` (SG/Water/Supporter, Burst I). The two share a base name; the
> slug-disambiguation lint flags bare "Soline" as AMBIGUOUS (advisory, expected per the
> arcana/asuka precedent). Everything here reasons from `characters['soline']`.
>
> This was a FROM-SCRATCH baseline authoring gauntlet — no shipped override existed
> (`simSupported:false`); the override was authored test-first and every assertion pins GREEN
> vs it and RED vs its nearest-wrong counterfactual.

## Kit summary

Soline is an Iron-element SMG Attacker who closes the burst chain at stage 3. Her kit is entirely
selfish — no line touches an ally. Skill 1 ("On the Ball!") gives herself +7.26% attack speed for
3 seconds after every 40 normal attacks; at SMG cadence (1440 RoF, 120-round mag) the counter
re-fires constantly and the window is up for most of the time she is firing. Skill 2 ("Grow up!")
permanently raises her own critical rate by 21.62% and critical damage by 62.27% while she is at
Max HP — a condition that never breaks in the scope-lock fight because the sim models no incoming
damage. Her burst ("My Word, My Bond!") deals 396% of final ATK to enemies in attack range, plus a
further 924% of final ATK to the same targets when she is at Max HP — both as instant
crit-eligible burst-bucket hits that land on her cast frame, before the Full Burst window opens
(no +50% FB major, no core, no range bonus).

## Line-by-line

| Line                                                              | Disposition | Notes                                                                                                                                  |
| ----------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| S1: after 40 normal attacks (trigger)                             | FAITHFUL    | `hitCount:80` = 40 trigger PULLS × hitsPerShot 2 — the repo SHOT convention; ⚑1 carries the 2× shot-vs-hit lever with a popup recipe    |
| S1: Attack Speed ▲7.26% for 3 sec (self)                          | FAITHFUL    | `attackSpeedPct 7.26 / durationSec 3`; kth application rides the 40k-th pull; recurring (no once qualifier); removing it lowers totals |
| S2: "Only affects self at Max HP" (gate)                          | FAITHFUL    | Always-true under scope lock (no incoming damage modeled); documented in caveats, never enacted as a blocker                            |
| S2: Critical Rate ▲21.62% permanently (self)                      | FAITHFUL    | UNSCOPED `critRatePct` (prose has no "of normal attacks" qualifier — feeds burst/skill rolls too); frame-0 passive, no expiry          |
| S2: Critical Damage ▲62.27% permanently (self)                    | FAITHFUL    | `critDamagePct 62.27`, additive pp in the crit term (SSOT §1b); major-bucket delta pinned at exactly critRate × 0.6227 on matched hits |
| Burst: 396% of final ATK to enemies within attack range           | FAITHFUL    | `burstCast` → enemy `flatDamage 396`; crit at sheet rate (SSOT burst-nuke row), never core, no range, FB-exempt by cast timing          |
| Burst: +924% of final ATK to the same targets when at Max HP      | FAITHFUL    | Second `burstCast` block, same target; gate read as the CASTER's HP (kit-internal consistency with S2), always-true in scope            |
| (none)                                                            | —           | `unmodeled` is EMPTY for all three slots — the whole kit is engine-expressible; no `ignored` blocks                                     |

Multi-target clauses ("enemies within attack range" / "the same target(s)") collapse to the single
scope-lock boss (`{kind:'enemy'}` documented stand-in; v1 fields one immortal enemy).

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 5 lines FAITHFUL,
  zero unmodeled expected, no REAL-GOTCHA. Converged exactly on the S2 crit pair (both families
  independently rejected the scoped `critRateNormalPct` reading), the always-true Max-HP gates,
  and the 396+924 pair on `burstCast`. One convention divergence: the reviewer chose hitCount 40
  (per-HIT reading) — reconciled to the driver's 80 on the brid-silent-track MEASURED pull anchor
  + five uniform multi-hit precedents; reviewer itself conceded the tuple is "effectively a ⚑
  convention until popup-read". The reviewer's "flatDamage crit is opt-in (default off)" claim was
  STALE — engine default is crit-ON (sim.ts + SSOT table "burst nuke crit ✅").
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the same 5 lines.
  The pristine file guessed five harness/event shapes wrong (import path, onEvent routing, slot
  field — `UnitResult.position` is a battle position, not the slot —, event ownership, override
  slot shape); the driver applied structural corrections ONLY (`blind/soline.adapted.test.ts`,
  banner lists each fix, intent untouched). **18 GREEN / 1 RED** vs the driver override: the lone
  RED is exactly the contested convention (the blind counterfactual patches count→80 expecting the
  proc count to halve, but 80 IS the shipped value). Every other blind-derived assertion —
  magnitudes, targets, durations, permanency, the unscoped-crit feed into the burst riders, the
  396+924 pair shape, FB/range/core exemption, self/enemy scoping — passed unchanged.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. skill2 IDENTICAL to the driver
  (passive self crit pair, no duration, always-true gate). Burst observationally identical: the
  blind fused 396+924 into one block/two effects with explicit `crit:true/noRange:true/noFb:true`
  vs the driver's two blocks + bare defaults (same event stream; `noFb:true` diverges only if her
  cast could land inside a live FB window — impossible for a B3 chain-closer under scope lock;
  driver's timing-based FB exemption matches the novel precedent on the identical shape). skill1
  carries the same contested count:40.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, zero
  gotchas.** All 5 lines FAITHFUL. The judge adjudicated the contested convention in the driver's
  favor: the brid-silent-track measurement is an existing labeled fixture = the independent method
  under prove-it-differently, so the bar is met and the blind count:40 is recorded as a
  RECON_ERROR (a schema-literal inference about the engine counter mistaken for the in-game
  counter, made without repo precedent by design). Judge's same-model residuals for the owner:
  (1) all agents share the CASTER-HP reading of both Max-HP gates (kit-internal consistency
  supports it; no independent source consulted); (2) the brid pull-anchor is an SG measurement
  extrapolated to an SMG — ⚑1's recipe closes this at unit level.

## Residual flags (owner spot-check cluster)

- **⚑1 (UNMEASURED):** S1 NA-counter shot-vs-hit convention. Shipped the pull reading (hitCount
  80 = 40 pulls) per the brid-silent-track measured anchor + drake/leona/poli/guilty precedents +
  the prose distinction ("normal attacks" = pulls; "hits"/"pellets" = raw hits, modernia/privaty).
  The per-hit reading would be count 40 (2× proc cadence); damage impact minor either way (the 3s
  window's uptime is high under both). Recipe: count pulls between "On the Ball!" activations in a
  focus video (or DBG_BUFFS=1 buffApply-frame cadence).
- **⚑2 (UNMEASURED, mandatory cadence tuple):** SMG RoF 1440 + reloadFrames 141 + hitsPerShot 2
  shipped datamine as-is (no charFixes). Recipe: read rounds/min + the reload gap from any focus
  video.
- **Scope-lock caveat:** both Max-HP gates are modeled always-true because the sim has no incoming
  damage; if an HP pool is ever modeled, both lines need a status-gate primitive.
- **Board:** no board row yet (first landing; `board:null`) — sim/real calibration is a future
  hand-tune item, as for every from-scratch unit.
