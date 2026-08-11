# 2026-08-10 — Faithfulness phase-4 batch 7 (6 units)

> Six graded-comp reviews against the audit checklist
> (`2026-08-10-faithfulness-pass-audit.md` §2 phase 4, 11 items), taking the batch-7 START-HERE
> doc's suggested six: `noir` (0.884 COLD, coldest in the slice, 2 comps), `privaty` (1.120 HOT,
> hottest, 3 comps), `snow-white-heavy-arms` (0.954 COLD, 4 comps — most in the slice), `chisato`
> (0.968 COLD, 3 comps), `rouge` (1.027, 3 comps), `prika` (0.890 COLD, 1 comp, highest
> history-phrase density).
>
> Slugs are exact: `noir` = SG/Wind, `privaty` = AR/Water Treasure (NOT `privaty-unkind-maid`,
> SG/Electric), `snow-white-heavy-arms` (NOT `snow-white`, a separate unit who also grades on 4
> comps at 0.939, nor `snow-white-innocent-days`), `chisato` = SMG/Iron, `rouge` = SR/Electric,
> `prika` = SR/Water. `jill` = AR/Electric appears below as the batch's main finding.
>
> Applied = prose only. Every block array in all six files is byte-identical to HEAD, the board is
> byte-identical to the batch-7 baseline (±3% 7 | ±5% 14 | ±8% 23 | worse 22, 142 datapoints /
> 45 units) and `verify.sh` is green. Everything else is findings-only.

## The batch's real result: the board's worst unit is an engine fallback, not a tuning residual

Checking checklist item 6 (swap-economy) on `chisato` meant verifying the START-HERE §4 claim that
the engine's swap branch reads `u.swap.pullsPerSec ?? PULLS_PER_SEC[...]` and never falls back to
`u.pullsPerSec`. The claim is true. Censusing who it actually reaches turned up **exactly one
carrier roster-wide — `jill`** — and she is the board's single worst unit.

- `jill` carries `charFixes.pullsPerSec: 2.5`, a MEASURED per-unit cadence that the engine's own
  comment names in the table header ("Per-unit measured cadences override via
  `charFixes.pullsPerSec` (jill 2.5)").
- Her burst is a **same-weapon `trueNormals` swap** (`damagePct: 71.09`, exactly her own
  `normalAttackMultiplier`; no `weapon` field), 10s.
- While `u.swap` is set, the cadence branch evaluates
  `u.swap.pullsPerSec ?? PULLS_PER_SEC[u.swap.weapon ?? u.char.weapon]` — `undefined ??
PULLS_PER_SEC['AR']` = **12 pulls/s**. Her measured 2.5 is never consulted.
- So for 10s of every burst she fires at **4.8× her measured cadence**, in the window where her
  normals are also true damage.

**Probe A/B** (temporary engine patch: fall back to `u.pullsPerSec` when `u.swap.weapon` is
undefined, i.e. same-weapon swaps only — reverted, engine diff is empty):

|        | before                                                   | after                                                   |
| ------ | -------------------------------------------------------- | ------------------------------------------------------- |
| `jill` | **1.924 HOT**, 0.92 / 2.39 / 2.46, MAD 0.978, rank 45/45 | **0.983 OK**, 0.92 / 1.00 / 1.03, MAD 0.038, rank 10/45 |
| board  | ±3% 7 \| ±5% 14 \| ±8% 23 \| worse 22                    | ±3% 7 \| ±5% **15** \| ±8% **24** \| worse **21**       |

Three things make this more than a fit improvement:

1. **Every measured full-burst count is preserved** — all rotation asserts pass, including the
   comps `jill` is in. It is not a rotation change.
2. **The `0.92` datapoint is unchanged.** It comes from the N1 comp, where she never bursts, so the
   swap never fires and the bug never triggers. That is an independent discriminator for the
   mechanism, not just a better number.
3. **The blast radius is hers.** The only other movement is sub-1% ripple through her comp-mates
   (`chisato` 0.968 → 0.965, `noir` 0.884 → 0.885, `anis-star` 0.867 → 0.868, `grave` unchanged) —
   the 5 snapshot drifts are her comps and nothing else.

This is a **faithfulness defect, not a calibration one**: a measured constant silently discarded by
a `??` chain. **STOP-AND-SURFACE — not enacted.** It is an engine change, so it needs
`/scientific-method` + owner on its own pass. Two things that pass must settle:

- The correct fallback shape. Falling back to `u.pullsPerSec` unconditionally is wrong for a swap
  into a _different_ weapon class (`k` → SG, `nayuta` → SR), where the unit's own cadence should
  not apply. Gating on `u.swap.weapon === undefined` is what the probe used and is the narrower
  claim.
- Whether `jill`'s overrides were fitted against the buggy cadence. Her coefficients are datamined
  kit literals, and the ratio lands at 0.98 rather than overshooting, which argues they were not —
  but that is the standard fit-exposure check for a rotation-adjacent fix and it should be made
  explicitly, not assumed from one number.

## Cross-cutting — STOP AND SURFACE (batched proposals, none enacted)

- **The `PARSER BASELINE (HYPOTHESIS — NOT a validated model)` banner is stale as a class — 23
  overrides.** It asserts "Every ⚑ below is an UNMEASURED estimate; hand-tune + record against a
  real fight before trusting any number." All 23 carrying units now have a spec test in
  `scripts/tests/units/` and a gauntlet pass, and **all 23 also contain 1–10 mentions of
  RESOLVED / MEASURED / CLOSED in their own prose** — the banner contradicts the file it heads.
  Carriers include `liter`, who is seated in `controlComp()` and is among the most-exercised units
  on the board. Two of the six units in this batch (`noir`, `chisato`) had the banner; both had it
  replaced with an accurate per-unit status line (what is datamined-literal, what is pinned, what
  is genuinely unmeasured). **The other 21 want one wording decision, not 21 judgement calls** —
  the banner conflates "kit-faithfulness unvalidated" (false for all of them) with "magnitude not
  hand-tuned against a graded fight" (true for most). Full list — **four are BASE slugs, not
  variants**: `arcana` (RL/Electric, NOT `arcana-fortune-mate`), `asuka` (AR/Fire, NOT
  `asuka-wille`, which is separately on the list), `laplace` (RL/Iron, NOT
  `laplace-ultimate-hero`), `marciana` (SG/Iron, NOT `marciana-marine-study`):
  `ade-agent-bunny anchor-innocent-maid arcana asuka asuka-wille blanc bready drake
guillotine-winter-slayer helm-aquamarine laplace leona liter ludmilla-winter-owner mana marciana
misato modernia rei-ayanami-tentative-name sakura-bloom-in-summer snow-crane`.
- **Ally-targeted `damageTakenPct` is off-contract and silently inert — 3 carriers.** `moran`
  (burst, allies, −35.14), `rouge` (skill2, selfAndAdjacent, −15.2), `rumani` (burst, self,
  −20.06). `damageTakenPct` is documented in `types.ts` as "debuff on the boss (positive = boss
  takes more)" and the engine sums it from the **enemy** buff list only, so an ally-targeted one is
  applied and never read. The outcome is correct — these are defensive lines with no HP pool behind
  them, and F10 says record-don't-encode — but they read as live buffs to anyone scanning the file
  and would become real bugs the day an ally-side damage-taken channel exists. Proposal: one
  ruling, either move all three to `unmodeled` or have `validate-overrides.ts` warn on the
  target/stat mismatch.
- **`experiment-harness-ai.md` was CLOSED 2026-07-21 and 5 live citations still point at it** —
  `scripts/regression.ts:196`, `scripts/blind-rebuild/code-bundle/code-sim-setup.ts:45`,
  `code-sim-effects.ts:125`, `sim-core-c.ts:58`, plus (before this batch)
  `snow-white-heavy-arms`'s note. The successor is `docs/handoffs/scientific-method-harness.md`.
  Not fixed here: `scripts/regression.ts` is the gate script and out of a findings-only sweep's
  scope.
- **The audit doc's F7 ramp-bake list has at least two false positives.** F7 names ~10 units that
  "still bake ramp buffs at cap from t=0", including `chisato` and `rouge`. Neither has a stack-ramp
  line at all. `chisato`'s S1 gates are at full value from t=0 because the KIT charges Extrasensory
  to 100% at the start of battle — that is kit-exact, not an approximation. `rouge`'s coin tiers are
  discrete resource states, not a ramp. The remaining 8 names on that list were not checked; the
  START-HERE doc forwards F7 membership as a per-unit prior, so it is worth verifying the rest
  before the next batch leans on it.

## Applied (prose only — every block array byte-identical, board byte-identical)

- **`chisato` — the worst per-unit self-contradiction this batch.** Her note asserted, as a live
  claim, "CRIT now OFF on true normals (owner ruling 2026-07-21: TRUE DAMAGE CANNOT CRIT — enforced
  at the engine `crit && !trueFlavor` guard, board-confirmed chisato 1.154→1.119)" — and then
  ~2,000 characters later corrected itself. It is **doubly false**: no such guard has ever existed
  (`sim.ts` says so in its own header comment), and the 2026-07-21 ruling was itself reversed on
  2026-07-25, in-game confirmed — true damage CAN crit. A second claim, that the swap "start+end
  each instant-refill the mag (~2 free reloads/cycle, mild optimism)", was likewise contradicted
  later and likewise false: a `trueNormals` same-weapon flavor swap refills at neither end.
  Rewritten to the shipped model only, with the Extrasensory proxy classified (F6:
  bounded-approximation, exact under her graded cadence) and her burst cadence verified rather than
  asserted — she casts at t≈3.6 / 33.7 / 63.3 / 93.7 / 124.5 / 155.0s, inside the 60s ATK fuse, so
  the decay model is genuinely inert on her graded comps.
- **`prika` — a self-contradiction and a falsified opening.** Her note opened "Only the S2 'Encore'
  block needs overriding. S1 is left to the parser… Burst is left to the parser" — the file carries
  explicit `skill1` and `burst` blocks. It also said "DUET SLOT ORDER: place Prika LEFT of Mint" and,
  later, "the old 'place Prika left of Mint' requirement is gone" (correct: `burstFirst` makes it
  slot-order-independent). Rewritten current-state; the five live ⚑ threads (Encore proxy, duet
  Encore window vs the printed 10s, the Pierce hold and its ~+8% estimate, the unextendable
  Performance duration, heal-magnitude) are all preserved, since they are open questions rather than
  history.
- **`snow-white-heavy-arms` — rotted pointer, and an orphaned open question.** Her note logged the
  Fully-Active "uses vs time" residual as "H2 in `experiment-harness-ai.md`", a doc closed
  2026-07-21 and archived out of the tree; the question is tracked nowhere else. Restated in-place
  without the dead pointer and queued for re-filing. Her note also omitted the S1 `damageTakenPct`
  4.2 block entirely — an implemented line with no prose coverage — now described. Arithmetic
  re-verified rather than trusted: the swapped block adds 1055.9, not the full Fully-Active volley,
  because the ungated block already deals 527.95 in every state (41.9 + 527.95 + 1055.9 = 41.9 +
  105.59 × 15 ✓).
- **`noir`** — banner replaced with an accurate status line; the "⚑2/⚑4 RESOLVED" trails, the
  "prior N"/"supersedes the old proxy" narration and the dated enactment history removed. Her
  load-bearing inertness claim was verified, not copied: both graded comps are
  grave + anis-star + jill + chisato + noir, neither seats blanc or rouge, so the `teamHas.sameSquad`
  block is genuinely inert.
- **`privaty`** — the `[materialized 2026-07-16 … NOT hand-verified]` tag deleted (she has 14 spec
  pins), board figures refreshed, and the "the removed noFb calibration had been hiding (that knob
  had pulled her 1.29 → 0.97)" superseded-value trail dropped while keeping its live instruction —
  do not close her HOT residual by adding `noFb` or shaving datamined coefficients. The WHY is in
  DECISIONS (the noFb-relic entry), so capture-first is satisfied.
- **`rouge`** — gauntlet/process narration and the REFUTED-hypothesis value trail
  (`2.3/7.5/22/22.5/8.7`) removed; two rotted line citations (`sim.ts:377`,
  `damage-calculation.md:106-107` — the anchors have moved to 425/1617/2435 and line 55) replaced
  with symbol-level references. Added: the inert ally-side `damageTakenPct` (above) and the
  load-bearing same-frame block order on her `burstCast` chain (the `shieldBursts` increment must
  stay listed before the coin flip that reads it — F2.5, unguarded by anything).
- Mirrors regenerated (`data/kit-status.json`, `docs/unmodeled-entries-review.md`).

## Recorded, not applied (per unit)

- **`privaty` (1.120 HOT, 3 comps)** — clean beyond prose. Her residual is NOT a proc-rate error:
  the trigger fires on 38.8% of last bullets in T4 (19 of 49) and 36.6% in N5 (15 of 41) against
  ~38.6% predicted. It is not the burst-amp tag either (board-inert, no amp shares her comps). It
  stays an unlocalized per-unit over-model and the hottest unit in the graded slice.
- **`noir` (0.884 COLD)** — the reload tension is the only substantive open item: the solo recon
  reads reload at ~0.6–0.9s against the datamined 62f ≈ 1.03s, and the recon-measured cadence is
  the trustworthy read. Not enacted; she is the SG-landing calibration anchor, so a cadence change
  on her touches the band table's basis and belongs in its own pass.
- **`snow-white-heavy-arms` (0.954 COLD, 4 comps)** — no faithfulness gap found; the model is
  arithmetically exact against the kit.
- **`chisato` (0.968 COLD)** — the live lever is core-on-true-damage, an ENGINE-fidelity question
  out of the override's domain. With SMG `coreMult 250` it is a large one.
- **`rouge` (1.027)** — two measurement-gated ⚑ carried honestly (coin exclusivity; the Shield-Coin
  burst rider's missing "without restoring HP" clause, which read literally would emit a recovery
  event arming Crown-type consumers). Her back-row S2 gate is an assumption, documented not encoded,
  and holds at scope lock since an SR is always back row.
- **`prika` (0.890 COLD)** — the Pierce hold is the leading explanation and remains owner-held. She
  is a `pierceDamagePct` source with no Pierce tag, so her own 13.09% is damage-inert on her own SR
  fire (byte-identical totals with the effect removed). Checklist item 9 verified: her single graded
  comp explicitly selects `duet (w/ Mint)`, matching the recorded rotation.

## Batch stats

- 6 units, 6 prose rewrites, **0 block changes**, 0 engine changes landed.
- Note + caveat prose: 34,233 → 28,101 chars (**−17.9%**), with 2 self-contradictions and 4
  falsified live claims deleted.
- Rotted citations repaired: 3 (`sim.ts:377`, `damage-calculation.md:106-107`,
  `experiment-harness-ai.md`); 4 more surfaced, unfixed, in shared scripts.
- `validate-overrides.ts` clean on all six; burst-amp census `--under` reports **0** new gaps;
  `verify.sh` green; board byte-identical to baseline.
- 9 graded-comp units remain: `ada`, `ade-agent-bunny`, `alice`, `guillotine-winter-slayer`,
  `mast-romantic-maid`, `mihara-bonding-chain`, `mint`, `quency-escape-queen`, `red-hood`.
  `quency-escape-queen` is still only tag-reviewed (checklist never run). `red-hood` still carries
  the 5-unit lifesteal non-emitter question, which wants one roster-wide ruling.

## The method note worth carrying forward

Batch 6's lesson was that an instrument reports coverage for units it cannot see. Batch 7's is
adjacent: **the audit's own findings docs are premises too.** Three START-HERE / audit-doc claims
were forwarded into this batch as per-unit priors, and checking them was where the value was — the
F8 swap-cadence claim was true and led to the `jill` finding, while the F7 ramp-bake membership was
wrong for both of the batch's units on that list. A pattern list assembled by grep inherits every
false positive of the grep, and by the time it reaches a per-unit reviewer it reads as an
established property of the unit.
