# laplace — Laplace (Treasure) · kit-autonomy gauntlet 2026-07-26

**Verdict: GO (cross-family corroborated) · faithfulness 0.9 · Tier 2**
RL / Attacker / Iron / Burst III. `treasure:true` — ground truth is the favorite-item prose in
`data/characters.json → characters.laplace.skills` (the raw `skillDetails` tables carry the
untreasured base kit: S2a 81.66 last-bullet; burst First 897.6 / Normal 14.52 / 5s).

## Why this has a manual-review doc

The binding S7 judge (kimi-code/k3) first returned **NO-GO(faithfulness), 0.9** on one
high-severity REAL-GOTCHA. The gauntlet resolved it on retry 1 per the judge's own prescription
and re-ran both test suites green, flipping NO-GO → GO. This doc records that round-trip.

## The REAL-GOTCHA (resolved)

**S2a 132.45% full-charge rider fired on the swap-beam ticks** (driver encoded `shotFired` with no
`swapGate`). The judge ruled this a faithfulness bug because:

- BOTH independent blind derivations (S2b claude-fable-5 reviewer AND S6 claude-opus-5 override
  writer) read **swap-EXCLUSION** (`swapGate:'unswapped'`);
- the burst text labels the beam "**Normal Damage**: 22.2%", contrasting with the base weapon's
  "Full Charge" attacks that S2a keys on;
- the driver's inclusion rationale was **circular** — it cited its own kit-silent `chargeTimeSec
0.25` ⚑ as proof the beam "full-charges";
- the scope is load-bearing: probe shows **-38.1%** of laplace's total (466.8M → 289.1M) if flipped.

**Fix applied:** added `swapGate:"unswapped"` to the skill2 block. The 132.45% rider now fires only
on the base RL's full-charge pulls (85 in the control fixture), silent during the 224 swap-beam
shots. Driver test re-written to pin the swap-excluded count + discriminate the ruled-out
every-shot reading; **17/17 green**. Blind test re-run: substantive s2a assertions green.

## What converged (no action needed)

- Treasure magnitudes 132.45 / 1455.72 / 22.2 / 10s / 11.9 all discriminate RED against the
  untreasured base kit (81.66 / 897.6 / 14.52).
- Burst First Damage 1455.72% is `burstCast`, pre-FB (`fbMajorApplied` false), once per own cast.
- **Pierce** — genuine blind catch: the override's "no swap-gated pierce mechanism" rationale was
  STALE (`weaponSwap.hasPierce` exists since snow-white 2026-07-20). Now modeled swap-scoped,
  byte-identical inert at scope lock (PIERCE_CORE_DOUBLE off, no pierceDamagePct carrier). S6
  independently encoded the identical swap-scoped `hasPierce`.
- 11.9% true rider: `shotFired + swapGate:'swapped'`, count == swap-beam shots (224) < total (309).

## Residual ⚑s (owner spot-check)

1. **S2a swap-exclusion × swap beam economy interact multiplicatively** (judge). The beam economy
   (`chargeTimeSec 0.25` + `maxAmmo 999`, ~40 ticks/10s) is kit-SILENT and is the single largest
   unmeasured lever on her board number. In the now-faithful model the swap is a NET COST (the
   132.45% rider goes silent in-window while the beam pays only 22.2%+11.9%/tick) — confirm both the
   S2a scope (132.45%-class popups should STOP inside the 10s window) and the beam tick count from
   one laplace focus video.
2. **S1 Hero Vision stack gate assumed maxed** for the burst window (documented inert ⚑). No
   `requiresOwnBuffMaxStacks` engine primitive exists to model it literally (the blind writers' own
   gaps confirm this); stacks cap at ~6-8s vs a 40s-CD first burst with a 15s stack duration, so the
   gate is always satisfied in practice — modeling-vs-assuming contributes exactly 0 damage.
3. **trueNormals** is a semantic flavor tag, numerically inert in the control comp (no trueDamagePct
   buff); pinned structurally.

## Cross-unit blast radius (landed in this commit)

- `docs/engine-modeling-gaps.md` primitive census regenerated — 2-line laplace-only diff (`hasPierce`
  4→5 +laplace; new `unswapped | 1 | laplace` row).
- `scripts/tests/generators/cross-team-polish.test.ts` heuristic floor 1.1 → 1.09: laplace is in
  that fixture's pool (Burst-III index 19); her faithful -38% shifted the fixture's polish recovery
  from ~13% to 9.53% (measured 1.0953). The test's intent (polish recovers the stranded 4th team;
  greedy 3 → polished 4; strands nobody) is intact — only the magnitude floor moved.

`verify.sh`: all checks passed. Board unchanged (laplace is MODEL_ONLY — no recording, so no board
reading; the gauntlet validates kit-faithfulness, board accuracy needs a recording laplace lacks).
