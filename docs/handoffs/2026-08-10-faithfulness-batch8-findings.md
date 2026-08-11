# 2026-08-10 — Faithfulness phase-4 batch 8 (9 units — the graded-comp slice is now complete)

> The whole remaining graded-comp list, reviewed against the audit checklist
> (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4, 11 items): `red-hood` (0.970 COLD, 2 comps),
> `quency-escape-queen` (1.041 HOT, 2), `alice` (1.101 HOT, 1), `mihara-bonding-chain` (1.034 HOT,
> 2), `ada` (0.995, 2), `ade-agent-bunny` (0.964 COLD, 1), `mast-romantic-maid` (0.951 COLD, 2),
> `guillotine-winter-slayer` (1.024, 1), `mint` (1.015, 1).
>
> Slugs are exact: `red-hood` = SR/Iron (**NOT `rapi-red-hood`, MG/Fire — a different unit**),
> `quency-escape-queen` = SMG/Water (not `quency`, SMG/Electric), `alice` = SR/Fire (not
> `alice-wonderland-bunny`, SMG/Water), `mihara-bonding-chain` = MG/Fire (not `mihara`, AR/Water),
> `ada` = RL/Electric (not `ade`/`ade-agent-bunny`), `ade-agent-bunny` = SR/Iron (not `ade`,
> AR/Wind), `mast-romantic-maid` = MG/Water (not `mast`, SMG/Electric),
> `guillotine-winter-slayer` = AR/Water (not `guillotine`, MG/Electric), `mint` = RL/Iron.
>
> Applied = prose only. Every block array in all nine files is byte-identical to HEAD, the board is
> byte-identical to baseline (±3% 7 | ±5% 14 | ±8% 23 | worse 22, 142 datapoints / 45 units),
> `verify.sh` is green, `validate-overrides.ts` passes on all nine, and the burst-amp census
> `--under` reports 0.

## The batch's real result: an inertness claim that was true in the fixture and false on the board

`alice`'s override said, in both her note and a caveat, that her `hasPierce` flag is
"damage-INERT at scope lock (no pierceDamagePct source in her kit, partless boss) — **verified
byte-identical totals with/without hasPierce**".

The verification was real. Its scope was not. `hasPierce` is a hit TAG — it makes a unit ELIGIBLE
for `pierceDamagePct`, and `PIERCE_CORE_DOUBLE` is false so it does no double-hit — which means its
value depends entirely on whether anything in the comp GRANTS pierce damage. Nothing in alice's own
kit does, and nothing in the control fixture does either: `controlComp()` seats `liter` (SMG/Iron),
`crown`, the carry, and `helm` (SR/Water — the base slug, not `helm-aquamarine`), and **none of the
three grants `pierceDamagePct`** (checked). So a control-style fixture reads byte-identical, exactly
as recorded. But **her only graded comp, PA MiKa, seats `mint`, whose S2 grants all allies
`pierceDamagePct` 32.72 for 10s.**

Measured A/B on that comp:

|                             | total | ratio          |
| --------------------------- | ----- | -------------- |
| `hasPierce: true` (shipped) | 444M  | **1.100 HOT**  |
| `hasPierce: false`          | 362M  | **0.897 COLD** |

**+22.6%, and every other unit in the comp is unchanged** (anis-star 0.899, mint 1.015, prika
0.889, red-hood 0.926 in both runs). So the tag is not inert, it is the bulk of her HOT read, and
the prose invited a future reviewer to delete it as dead weight.

Nothing needed fixing in the model — the kit says "Gain continuous Pierce", so the encoding is
faithful and stays. What was wrong was the claim, and the claim is the dangerous part.

**This is the inverse of the START-HERE doc's rule 2.** That rule warns that board-inert is not
inert, because a change can be byte-identical on the board and still break a fixture. Batch 8 found
the mirror: **fixture-inert is not board-inert.** An inertness result is only as broad as the roster
it was measured on, and a cross-unit-dependent property like a pierce tag is precisely the kind that
a single-comp check cannot generalize. When recording an inertness verification, record WHERE it was
run.

## Cross-cutting — STOP AND SURFACE (batched proposals, none enacted)

- **Bare parser warnings persist as caveats, sitting next to their own resolutions.**
  `mihara-bonding-chain` shipped 9 caveats of which several were literal duplicates — the same
  "unsupported trigger … incapacitated" line appeared twice, once as a naked parser warning and once
  with its disposition; "unparsed effect" entries sat beside note prose explaining that those exact
  lines are deliberately folded into her steady-state average. `mint` shipped 3 caveats that were
  purely the parser's bookkeeping complaints about the Assigned-Part status lines, which her note
  explains at length ARE expressed (as the `singing` resource) and which are also recorded in
  `unmodeled.burst`. This is the recurring defect class in caveat form, and it is worse than in a
  note: `validate-overrides.ts` echoes caveats, so these read as live unresolved failures on every
  run. Cleaned for both units here (9 → 6 and 3 → 5). **3 instances remain roster-wide, in 2 units:
  `maiden-ice-rose` (1) and `milk-blooming-bunny` (2).**
- **The `[materialized … NOT hand-verified]` provenance tag is stale as a class — 8 units left.**
  `cinderella-crystal-wave`, `d-killer-wife`, `liberalio`, `maiden-ice-rose`,
  `milk-blooming-bunny`, `naga`, `scarlet-black-shadow`, `velvet`. Every one of them has since been
  pinned test-first, so the tag asserts the opposite of the tree. Batches 7–8 removed it from the
  five units in their own slices (`privaty`, `mihara-bonding-chain`, `alice`, `red-hood`, `mint`).
  Same shape as the `PARSER BASELINE` banner surfaced in batch 7, which this batch took from 21 to
  **19** by clearing `ade-agent-bunny` and `guillotine-winter-slayer` — worth settling both in one
  pass.
- **The audit doc's F7 ramp-bake list is wrong on all three names checked so far.** Batch 7 found
  `chisato` and `rouge` carry no stack-ramp line at all. `mast-romantic-maid`, the third, DOES have a
  ramp (Drunken 1 → 2 → 3), but she is baked at the cycle AVERAGE of 2, not "at cap from t=0" as F7
  describes — a different approximation with a different sign. Nought for three. The remaining ~7
  names are unchecked and should not be forwarded as per-unit priors without checking.
- **`red-hood` closes as a consistency item, and the 5-unit lifesteal ruling stays open.** Her
  "Recovers 23.04% of attack damage as HP" is scoped **Affects self**, so it could never reach an
  ally-side on-recovery consumer even if emitted — matching batch 4's proof for `moran`. It is
  correctly recorded in `unmodeled.skill2`. The roster-wide question (8 of 13 lifesteal carriers
  emit a recovery event, 5 do not) is unchanged by this and still wants one ruling.

## Applied (prose only — every block array byte-identical, board byte-identical)

- **`alice`** — the falsified inertness claim above, replaced with the measured result and an
  explicit do-not-delete-the-tag warning. Also removed a self-contradiction the file already
  half-corrected: its opening sentence justified `hasPierce` by a "pierce double-hit (core + body
  per shot)" that a later paragraph flagged as stale. Two rotted line citations (`sim.ts:1091`,
  `sim.ts:1400`) replaced with symbol-level references.
- **`mihara-bonding-chain` — the note stated model values that are not what ships.** Its MODEL
  paragraph described "~10.8 stacks = 270.9%/s permanent DoT" and "the burst adds the DELTA 730.1%/s
  (1001 - 270.9)"; the file ships **301.0 and 700.0**, per a REFIT sentence 1,500 characters further
  down. A grep-reader takes the first. Rewritten to the shipped numbers, with the load-bearing part
  made explicit: the baseline and the burst delta are ONE calibration — move either and the burst
  window stops summing to the correct 1001%/s.
- **`mast-romantic-maid` — `caveats` was `null`.** She carries four approximations that are
  owner-ruled or data-validated rather than kit-literal (the 2-stack cycle average on every
  x-stacks magnitude; the permanently-on Drunken-gated team buffs; `normalAttackPct -40` as the
  Hit-Rate model; the Hangover stun re-gated to her own casts) and **not one of them surfaced in any
  lint output**, because there was no caveats array to echo. Four caveats written. Her note also
  carried the superseded-value trail from that re-gating ("never-bursting Mast was being stunned 5x
  for 0.84 cold"); deleted, the current rule kept.
- **`mint` — a residual that proposed work the file already does.** Its documented residual (2) said
  the Dancing heal "stays UNMODELED" with the recipe "wire as a heal event (ticks:3 intervalSec:1,
  Dancing-gated) and measure the consumer's uplift" — which is exactly the block the file ships
  (`heal` ticks 3, intervalSec 1, `resourceGate {singing max 0}`, solo mode). Only the HP MAGNITUDE
  is unmodeled. Rewritten; 6,794 → 5,766 chars, with the mode-selection warning and both genuine
  residuals kept.
- **`guillotine-winter-slayer`** — banner replaced with a status line; the retracted-claim narration
  and judge-verdict history removed. The load-bearing facts were kept and sharpened: the level-up
  reward cap is kit arithmetic (EXP cap 100 ÷ 10 per level = 10 level-ups = Level 1 → 11, so no 11th
  reward), and uncapped the hitCount-30 trigger fires ~56 times a fight. Her structural
  amp-ineligibility (burst damage is a `dot` carrying a qualifying literal) is now stated in a
  caveat as well as the note, so the census's mismatch line has a matching in-file explanation.
- **`quency-escape-queen`** — the first full checklist run on her (she was tag-only reviewed before).
  Nothing to fix in the model: all 12 kit lines are modeled, magnitudes are datamined-exact, and the
  empty `unmodeled` arrays are empty by audit. Gauntlet/process narration removed and the leading
  explanation for her HOT read promoted out of a parenthetical — the stage-unlock ordering is not
  encoded, so stages 2 and 3 build in parallel with stage 1, over-crediting ~0.4–0.8s per ramp and
  per post-reload rebuild. That is an engine-primitive gap, not a magnitude to shave.
- **`red-hood`** — the stale `0.867` board figure removed (she reads 0.970), provenance history
  removed, and the caveat's "Supersedes the stale 2026-07-16 note" narration replaced by the current
  statement. Her one calibrated value (`chargeDamagePct` 90, the stack-ramp average against a warm
  93.36) is stated with its do-not-fudge instruction intact.
- **`ada`** and **`ade-agent-bunny`** — clean beyond prose; gauntlet narration and superseded
  encodings removed, the measurement-gated ⚑s kept verbatim in substance.
- Mirrors regenerated (`data/kit-status.json`, `docs/unmodeled-entries-review.md`).

## Recorded, not applied (per unit)

- **`ada` (0.995, best on the board)** — her one open item is the Special Modification shot count.
  Kit-literal "for 1 round(s)" = 1 boosted charged round per burst; the shipped `weaponSwap` has no
  `maxShots` cap and fires ~2, worth ~45% of her total. The board leans on the second shot — capping
  to kit-literal drops her to ~0.95. A clean faithful-vs-fit conflict, measurement-gated, unchanged.
- **`mihara-bonding-chain` (1.034 HOT)** — her 12-stack rebuild average is the single fitted number
  in her file and the obvious lever, which is exactly why it should not be turned without a
  measurement. Her multi-B3 `fullBurstEnd` over-fire is benign on the graded comps.
- **`mast-romantic-maid` (0.951 COLD)** — the permanent Drunken-gated team buffs are the known
  over-credit direction, i.e. the wrong sign for her COLD read, which makes the cold residual more
  interesting, not less. Not localized.
- **`guillotine-winter-slayer` (1.024)** — ⚑1 is escalated and unchanged: her normal fire reads ~26%
  hot against the datamined 12/s + 81f, and 12 / 1.26 ≈ 9.5/s is the arithmetic suspect. Owner ruling
  stands — pin it with a focus video, do not refit by fudge.
- **`mint` (1.015)** — solo mode has ZERO real-fight anchor, since her only graded comp forces
  `duet (w/ Prika)`. Her alternating-gate model is therefore unanchored rather than merely
  unmeasured, which is a stronger statement than "⚑ tier 2" and is now said plainly in the file.
- **`ade-agent-bunny` (0.964 COLD)** — the Spy-Lens gate rests on stacks REFRESHING rather than
  expiring individually. If each stack expires 5s after its own application, stacks plateau at ~3–5
  and the `hitCount:10` gate never opens at all, taking her ATK ▲16% and her Pierce tag with it.
  That is the counterfactual to rule out first, and it is cheap: one focus video.

## Batch stats

- 9 units, 9 prose rewrites, **0 block changes**, 0 engine changes.
- Note + caveat prose: 37,967 → 39,076 chars (**+2.9%**). This batch is the first to grow rather than
  shrink, and the growth is the point: `mast-romantic-maid` went from 0 caveats to 4, `alice` gained
  a measured result where she had a false one. Deleting history and adding substance pull in opposite
  directions on the character count; the character count is not the metric.
- Caveat arrays: 30 → 38 entries, with duplicates and bare parser warnings removed from 2 units.
- 1 falsified inertness claim disproved by measurement, 2 self-contradictions and 1
  proposes-what-it-already-does residual deleted, 2 rotted line citations repaired.
- **The graded-comp slice of phase 4 is COMPLETE**: 45 units carry board data, and batches 1–8 have
  now reviewed all of them. What remains of phase 4 is item (c), the tail — overrides with no graded
  comp. 185 override files exist against 45 board-graded units, so the tail is large and its per-unit
  value is much lower (no ratio to explain, no comp to check inertness against). The batch-7
  START-HERE doc is closed with this batch; a tail sweep wants a different entry doc and probably a
  generated-census approach rather than per-unit reads.

## The method note worth carrying forward

Batch 6: an instrument reports coverage for units it cannot see. Batch 7: the audit's own pattern
lists are premises too. Batch 8 completes the set — **a recorded verification is a premise, and its
SCOPE is the part that rots.** "Verified byte-identical" was true when written and false where it
mattered, and nothing about the sentence revealed which fixture it came from. The cheap fix is a
convention: an inertness or A/B claim in override prose names the roster it was measured on, so the
next reader can see immediately whether their comp is inside it.
