# Faithfulness pass — ENACTMENT phase: start here (written 2026-08-10, for a fresh session)

> **The finding phase is over for the 45 board-graded units.** Batches 1–8 reviewed every one of
> them ([batch 1](2026-08-10-faithfulness-batch1-findings.md) ·
> [2](2026-08-10-faithfulness-batch2-findings.md) · [3](2026-08-10-faithfulness-batch3-findings.md) ·
> [4](2026-08-10-faithfulness-batch4-findings.md) · [5](2026-08-10-faithfulness-batch5-findings.md) ·
> [6](2026-08-10-faithfulness-batch6-findings.md) · [7](2026-08-10-faithfulness-batch7-findings.md) ·
> [8](2026-08-10-faithfulness-batch8-findings.md)). This doc turns that pile into an ordered
> enactment plan. Plan of record for the sweep itself:
> [2026-08-10-faithfulness-pass-audit.md](2026-08-10-faithfulness-pass-audit.md).

## 0. Read this before you plan anything

**Implementing everything below will improve the board by roughly one unit.** That is not
pessimism, it is the actual shape of the findings, and planning as if there are 45 fixes waiting
will waste the session:

- **The one finding that moved the board materially has LANDED: `jill`, 1.924 → 0.983**
  (`docs/DECISIONS.md`, 2026-08-10, IMPLEMENT entry). See §3 for the pointer — the plan that used to
  live there is done, not open.
- **One more is probably bigger and is BLOCKED on footage:** `guillotine-winter-slayer`'s normal
  fire reads ~26% hot against her datamined cadence. Nobody can fix that without a recording.
- **One is a live RISK rather than a gain:** the burst-amp channel is unvalidated and would send
  `cinderella` (RL/Electric) to 1.523 if the obvious next tag were applied. It blocks further tagging.
- **Everything else is consistency, hygiene, or measurement-gated.** Board-inert by construction.

So the highest-value remaining output of an enactment session is: get the batched owner decisions
made, and **hand the owner a recording list** — because the remaining accuracy is behind footage,
not behind code.

## 1. Tree state

- PRs #98 (batches 7+8) and #99 (`jill`) are both MERGED — branch fresh off `main`. Engine work
  gets its own worktree regardless (CLAUDE.md constraint 8).
- Board: **`±3% 7 | ±5% 15 | ±8% 24 | worse 21`, 142 datapoints / 45 units** (the one-unit gain over
  this doc's original figures is `jill` landing). Re-read it yourself
  (`npx tsx scripts/board-read.ts`) before touching anything; if it differs, find out why first.
- `verify.sh` green. `validate-overrides.ts` clean. Burst-amp census `--under` = 0.

## 2. Tier 0 — OWNER DECISIONS — ALL FIVE RULED AND ENACTED 2026-08-10

Nothing open here. All five were brought as one batch, ruled, and landed board-inert (board
identical before/after; 0 engine lines, 0 damage values). Full rationale for each:
`docs/DECISIONS.md`, the 2026-08-10 "FAITHFULNESS TIER 0" entry — that is the durable record, and
the table below is kept only so the shape of the batch stays legible.

What landed, in one line each: **D1** both tags DELETED rather than reworded (the 8 materialized
carriers are all board-graded, and all 19 banner carriers already classified `gauntlet` by
`kit-status` provenance, so the banner's own classifier branch had been dead code) · **D2** kept for
fidelity + a new `BOSS_ONLY_BUFF_STATS` validator warning (fires on exactly the 3 carriers) ·
**D3** self-scoped lifesteal stays recorded, no emit — inert by MECHANISM, prior in
`modeling-priors.md` §11 · **D4** direction ruled (the omission is a defect), enactment still
bundled with the gauge cluster · **D5** convention in `CONVENTIONS.md`, lint rejected with numbers.

**Two things this batch left open, both needing the owner:** (a) whether `inert`/`byte-identical`
join the pre-write hook's verdict-verb escalation — `.claude/**` is protected and untouched; (b)
`/kit-parse`'s SKILL.md still instructs writing the D1 banner (correct for a genuinely new untuned
unit, but nothing removes it once the unit gets tests, which is how it went stale the first time —
a `kit-status --check` rule would make D1 durable). Both are tracked in `QUEUE.md`.

<details><summary>The original decision table (historical — all five now ruled)</summary>

| #   | Decision                                             | Scope                                                                                               | Why it matters                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Wording for the stale provenance tags                | `PARSER BASELINE (HYPOTHESIS…)` on **19** overrides + `[materialized … NOT hand-verified]` on **8** | Both assert the opposite of the tree (all carriers are now pinned test-first) and both self-contradict elsewhere in their own files. One wording, then a mechanical sweep. Carriers listed in the batch-7 and batch-8 findings.                    |
| D2  | Ally-targeted `damageTakenPct`                       | `moran`, `rouge`, `rumani`                                                                          | Boss-side StatKey, so all three are applied-and-never-read. Move to `unmodeled`, or add a `validate-overrides.ts` warning on the target/stat mismatch.                                                                                             |
| D3  | Self-scoped lifesteal: emit a recovery event or not? | 5 non-emitters of 13 carriers — `d` (SMG/Wind), `moran`, `red-hood` (SR/Iron), `rem`, `tia`         | Proven board-inert for self scope (batch 4 probe on `moran` moved zero; `red-hood` confirmed self-scoped in batch 8). Pure consistency — but it only stays inert while no unit has a self-recovery consumer, and `asuka` (AR/Fire) is one.         |
| D4  | U28 rider gauge economy                              | `modernia`, `nayuta`, `neon-blue-ocean`, `neon-vision-eye`                                          | `extraHitDamagePct` riders emit no `skillGauge` where an equivalent `flatDamage` instance would. A gauge-economy choice, not cosmetic. Interacts with the `skillGauge`-fires-twice bug — see §5.                                                   |
| D5  | Inertness-claim convention                           | roster-wide                                                                                         | Batch 8: `alice` (SR/Fire) — an "inert, verified byte-identical" claim was wrong by 22.6% because it was measured in a pierce-free fixture. Require an inertness/A-B claim in override prose to NAME its roster. Enforce by lint or by convention? |

</details>

## 3. Tier 1 — the one board-moving fix: `jill` (AR/Electric) — LANDED 2026-08-10

Ran the full `/scientific-method` panel; blocked on LOG (a real, then-unexplained teammate
cast-timing ripple in one comp); investigated per owner challenge and traced the mechanism to
reload-cycle-phase carryover across the swap boundary (real, faithful, not a rotation-engine
defect); revised to IMPLEMENT. Board 1.924 HOT → 0.983 OK. Full trail: `docs/DECISIONS.md`
(2026-08-10 IMPLEMENT entry) and `docs/handoffs/scientific-method-harness.md` (2026-08-10
addendum) — nothing left open here.

## 4. Tier 2 — the blocker: validate the burst-amp channel before ANY further tagging

Batch 5's result, and it is a risk item rather than an opportunity.

`trina`'s Spread Roots amp is LIVE (`burstSkillAoeDamagePct` 435.6, all allies, 5s, on her
burstCast) and its kit gate is always true in solo raid. Today it bites in exactly one place
(`liberalio` in N3, moving her 0.917 → 0.929, toward her real fight). **That near-dormancy is not
evidence of safety — it is evidence that almost nothing has been paired with her yet.**

Tagging the obvious next candidate, `cinderella` (RL/Electric), sends her **0.893 → 1.523**, with
her three `trina` comps going 0.74/0.94/0.96 → 1.91/2.55/2.60. The real fights refute the
combination of (435.6 magnitude, additive Damage-Up placement, this scope) at that scale. At least
one of the three is wrong:

1. **Scope** — the kit names a literal string; `cinderella`'s clause says "Affects **random**
   enemies". The literal-only ruling may or may not reach it.
2. **Placement** — +435.6pp additive into Damage-Up roughly triples a nuke that already has
   Damage-Up. This ⚑ was flagged unmeasured when the amp landed and still is.
3. **Magnitude** — 435.6 is the SL10 datamine, so least likely, but never popup-checked.

**Until this is settled:** do not tag any unit whose burst damage would land inside a comp-mate's
amp window, and A/B every future tag for board movement before it lands. The 40 live tag instances
are safe only while unpaired.

**Cheapest validation** (also item M3 in §5): popup-read one qualifying all-enemies burst nuke cast
inside vs outside a `trina` Spread Roots window and compare the ratio against `1 + 4.356` additive
in Damage-Up. Any comp with `trina` plus a plural-clause B3 gives it.

## 5. Tier 3 — THE RECORDING LIST (hand this to the owner; it is where the remaining accuracy is)

Ordered by payoff. Several settle a question for MANY units at once — those first.

| #   | Recording                                                                                             | Unblocks                                                | Payoff                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1  | `guillotine-winter-slayer` focus video — rounds/min + reload gap                                      | her ⚑1 cadence tuple (pullsPerSec 12 + reloadFrames 81) | **Largest single measurement-gated error known.** Her normal fire reads ~26% hot; 12 / 1.26 ≈ 9.5/s is the arithmetic suspect. Owner ruling stands: pin it, do not refit by fudge.                     |
| M2  | Any `trina` comp + a plural-clause B3 — popup-read the nuke inside vs outside her Spread Roots window | the burst-amp channel (§4)                              | Unblocks ALL remaining `burstDesc` tagging and retires a live board risk. Engine-global.                                                                                                               |
| M3  | Focus recording of a distributed-damage burst — read popup colour/icon across several casts           | distributed-damage crit eligibility                     | Engine-global: settles it for EVERY distributed carrier at once (`quency-escape-queen`'s 1736.31% nuke, `modernia`'s Paradise Lost, …). A crit/non-crit popup PAIR at ×1.5 settles it outright.        |
| M4  | `chisato` focus — core popups during her true-damage window                                           | core-on-true-damage                                     | Engine-global, and with SMG `coreMult 250` it is a large lever. Crit is already settled (true damage CAN crit, in-game confirmed).                                                                     |
| M5  | `ada` focus — count special-charged shots per burst window                                            | her Special Modification `maxShots`                     | Resolves a clean faithful-vs-fit conflict worth ~45% of her damage. **Note: the kit-literal answer makes the board WORSE** (0.995 → ~0.95), so this is a faithfulness decision, not a tuning one.      |
| M6  | `ade-agent-bunny` focus — do Spy Lens stacks REFRESH or expire individually?                          | her `hitCount:10` gate                                  | Binary and cheap. If stacks expire per-application, they plateau at ~3–5 and the gate NEVER opens — her ATK ▲16% and her whole Pierce tag would be wrong. Rule this out first.                         |
| M7  | `noir` focus — reload gap                                                                             | her ⚑1 cadence tension                                  | Recon reads reload ~0.6–0.9s against the datamined 62f ≈ 1.03s. She is the **SG-landing-table calibration anchor**, so a cadence change on her touches the band table's basis — treat as its own pass. |
| M8  | `red-hood` focus — full-charge popup inside vs outside Red Wolf                                       | her `chargeDamagePct` 90 (ramp average vs warm 93.36)   | Her one calibrated value. Do not fudge it to 93.36 without this.                                                                                                                                       |
| M9  | `prika` focus — is she Pierce-tagged during Performance?                                              | the standing OWNER HOLD                                 | Est. ~+8% personal SR damage; she is a buffer so small at board level. The encoding when discharged is `gainPierce durationSec 25` on burstCast, NOT top-level `hasPierce`.                            |
| M10 | `rouge` focus — does the 6.65% Attack Damage persist on adjacent allies after Shield Coin activates?  | her coin-exclusivity ⚑                                  | If Shield REPLACES Sword, the team loses it mid-fight (uptime ≈ first quarter) instead of the modeled full uptime.                                                                                     |
| M11 | `mihara-bonding-chain` focus — Ensnaring stack count between bursts                                   | her 12-stack rebuild average                            | The single fitted number in her file. Baseline 301.0 and burst delta 700.0 must move TOGETHER or the burst window stops summing to 1001%/s.                                                            |
| M12 | `mint` solo-mode recording — Singing-window vs Dancing-window team damage                             | her alternating-gate model                              | Solo mode has **zero real-fight anchor** (her only graded comp forces duet), so this is unanchored, not merely unmeasured.                                                                             |

`/hand-tune-batches` builds the teams; `/testing-requests` publishes asks for units the owner does
not own; `/probe-processing` scores what comes back.

## 6. Tier 4 — safe consistency enactments (board-inert, do after Tier 0 answers)

Cheap and mechanical. The three that were gated on a Tier-0 decision (the D1 tag sweep across 19 + 8
carriers, D2 on `moran`/`rouge`/`rumani`, D3 across the 5 lifesteal non-emitters) LANDED with Tier 0
— see §2. What remains needs no decision:

- **Clean the last 3 bare parser-warning caveats** — `maiden-ice-rose` (1), `milk-blooming-bunny`
  (2). They ship raw `unparsed effect` / `unsupported trigger` strings that `validate-overrides.ts`
  echoes as live failures, while both units record the same lines' real dispositions in `unmodeled`.
  No decision needed; just do it.
- **Repair 4 rotted citations to `experiment-harness-ai.md`** (CLOSED 2026-07-21, archived out of
  the tree): `scripts/regression.ts:196`,
  `scripts/blind-rebuild/code-bundle/code-sim-setup.ts:45`, `code-sim-effects.ts:125`,
  `sim-core-c.ts:58`. Successor is `docs/handoffs/scientific-method-harness.md`.
- **Re-file `snow-white-heavy-arms`'s Fully-Active "uses vs time" residual.** It lost its tracker
  when its host doc closed and now lives only in her override prose.
- **Verify the audit doc's F7 ramp-bake membership.** It is **nought for three** on the names
  checked (`chisato` and `rouge` have no ramp at all; `mast-romantic-maid` is baked at the cycle
  AVERAGE of 2, not "at cap from t=0"). Check the remaining ~7 before anyone plans on them.

## 7. Tier 5 — engine primitives (HOLD; do not start these opportunistically)

Ranked in `QUEUE.md`'s standing ENGINE-WORK ORDER; listed here only so nobody re-derives them:

- **`quency-escape-queen`'s stage-unlock ordering** — stages 2/3 build in parallel with stage 1,
  over-crediting ~0.4–0.8s per ramp and per post-reload rebuild (~0.5–1% of fight total). Leading
  candidate for her 1.041 HOT. Needs a stack-count-gate / cascade-order primitive. **Do not shave
  her datamined magnitudes to close it.**
- **The 5e state machines** — three separate builds (`mint` timerless memoryful XOR; `prika`
  cross-unit status event bus + in-flight duration mutation; `milk-blooming-bunny` reload-count-
  scoped stat CLAMP). The "one registry solves all four" rationale was REFUTED by a premise gate.
- **`alice`'s caster-relative charge speed** — no caster-relative charge-speed StatKey exists.
- **The `skillGauge`-fires-twice bug** on `shotFired`-triggered `flatDamage` riders, and the
  charge-B3 gauge-fill-tempo gap behind the 4 disabled regression comps. These interact with D4 and
  with each other — the compensating-errors rule says gather the full timeline and land them
  together, each ENV-gated default-OFF until then.
- **`chargeCounter`-triggered blocks bypass every block gate** (`requiresCore` / `fbGate` /
  `bossElementGate` / `resourceGate` / `requiresTargetStatus`) with no diagnostic. No current
  carrier combines both; the first future one gets an un-gated block silently.

## 8. Rules that bind an enactment session

1. **Every engine change: isolated worktree + `/scientific-method` + owner, ONE at a time.** Never
   merge a worktree branch into local `main` — push it and open a PR (CLAUDE.md constraint 8; a
   2026-08-03 push rejection is why).
2. **Judge a cadence/rotation-adjacent change by MEASURED FB-COUNT preservation**, not by the
   aggregate board ratio. A ratio regression from a correct fix is usually fit-exposure in units
   calibrated against the bug — re-tune those separately, never re-fudge.
3. **Snapshot regeneration only in the same commit as the change it reflects.** Never to silence a
   failure you do not understand.
4. **Measured constants are never refit.** Calibrated ⚑ values are the refit candidates. When a
   measurement is missing, the answer is "record it", not "pick a rounder number".
5. **Faithful > fit.** M5 (`ada`) is the live example: the kit-literal answer makes the board worse
   and is still probably the right answer.
6. **State the roster of any inertness or A/B claim you record** (D5, and batch 8's lesson).

## 9. What NOT to do

- **Do not tag any further `burstDesc` instances** until §4 is settled.
- **Do not "finish the chore" on `cinderella`** — her untagged state is deliberate and her caveats
  say why.
- **Do not re-fit `grave`** by disabling her timed pierce (owner ruling, faithful > fit), or
  `privaty` (AR/Water Treasure) by adding `noFb` / shaving her datamined coefficients.
- **Do not touch `noir`'s cadence** as a side effect of anything — she is the SG-landing table's
  calibration anchor.
- **Do not treat the audit doc's F-pattern lists as per-unit facts.** They are grep-assembled and
  F7 is nought for three so far. Verify membership before spending a review on it.
- **Do not start the phase-4 TAIL** (overrides with no graded comp) as part of this. 185 override
  files against 45 graded units, no ratio to explain and no comp to check inertness against — it
  wants a generated-census approach and its own entry doc.
