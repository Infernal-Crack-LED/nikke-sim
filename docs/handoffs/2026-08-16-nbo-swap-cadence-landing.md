# 2026-08-16 — `neon-blue-ocean` swap cadence + the MG-path engine hole (REVIEWED, READY)

**Status:** code committed, cross-family `/code-review` COMPLETE (kimi-code/k3, verdict
FIX-BEFORE-MERGE → all 3 FIX findings addressed), `verify.sh` GREEN. **Nothing has been pushed.
No PR exists.** Push/PR is owner-gated (CLAUDE.md constraint 2).

## Where everything is

| Thing                  | Where                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| Worktree               | `/Users/maxwellsutton/nikke-sim-wt-nbo-swap`, branch `nbo-swap-cadence` (`npm install` already ran; hooks live) |
| The landing commit     | `dbe48531` — "engine+nbo: a weapon swap on an MG-base unit governs its own cadence"                             |
| Review-fixes commit    | this commit — handoff doc + code-review fixes                                                                   |
| Base                   | `d8a6c874` on `main` (rebased onto current main after anis-star-solo2 landed)                                   |
| Settled WHY            | `docs/DECISIONS.md`, newest entry (2026-08-16) — full evidence + tiers, do not re-derive                        |
| Open residual          | `docs/handoffs/QUEUE.md` item 8 (⚑3, rewritten on this branch to the post-landing form)                         |
| Review packet + result | `scratchpad/gates/2026-08-16-nbo-swap-cadence/` (result.json = kimi-code/k3 verdict)                            |

Two supporting commits are already on `main` (pushed nowhere): `4d296f4c`
(`scripts/battery/nbo-swap-cadence-ab.ts`) and `738f4ce5` (the pre-landing QUEUE item 8).

## What landed (one-paragraph version — DECISIONS has the full argument)

Two halves, together because the first blocks the second. **(1)** `src/engine/sim.ts`'s fire loop
branches `if (chargeFrames > 0) … else if (u.char.weapon === 'MG') {ladder} else {flat cadence,
the only branch that reads `u.swap.pullsPerSec`/`u.swap.weapon`}`. Keyed on the BASE weapon class,
so an MG-base unit ran the wind-up ladder for its SWAPPED gun and silently discarded those two
fields. New predicate `swapLeavesMgLadder` diverts an MG-base unit off the ladder when its live swap
declares a cadence or a non-MG class; declaring neither keeps the ladder. **(2)** `neon-blue-ocean`
(nbo) gets `pullsPerSec: 1.5` on her burst `weaponSwap`, from the datamined `skill_value_data[1] =
90` rpm ÷ 60. Owner-directed enactment; it skipped `/scientific-method` on purpose, so per the
standing 2026-08-11 ruling the gate moves to `/code-review` on the diff.

Movement: her 7s window ~301 shots → ~10; standard control comp vs a Fire boss 494.9M → 94.2M; B3
chart rank range 1–33 → 49–72 of 76; `docs/b3-dps-rank-audit.md` reclassifies her from a MAJOR
over-model flag (Δ −47 / −50 vs the community lists) to Δ +5 / +7.

## Code-review outcome (kimi-code/k3, 2026-08-16)

Verdict: **FIX-BEFORE-MERGE** → all 3 FIX findings addressed in this commit. `verify.sh` GREEN
with **no regression-snapshot edit** — that is the blast-radius evidence.

**FIX findings (all addressed):**

1. **Board-hash-parity failure.** The boards in `web/public/*.json` were stale (pre-landing
   artifacts). Regenerated via `npm run dpschart && npm run ranks:all`.
2. **Census `route()` unfaithful mirror.** `route()` only checked the swap's own `chargeTimeSec`,
   missing the engine's `u.swap?.chargeFrames ?? u.char.chargeFrames` fallback (sim.ts:3903). Units
   like `frima` and `snow-white-heavy-arms` (base chargeFrames > 0, no swap chargeTimeSec) were
   mis-labeled. Fixed: `route()` now mirrors the fallback. Also made the FAIL tripwire symmetric
   (catches both unexpected diversions AND missing expected ones).
3. **DECISIONS.md rank range.** Stated "52–75" but the regenerated audit artifact shows 49–72.
   Corrected. Also softened "across all 11 ChangeWeapon carriers" to name the spot-checked ones
   (k, modernia, velvet) and named `takina` (150→2.5/s vs her owner-ruled 1.2/s) as a second
   standing counterexample alongside `moran`.

**FOLLOW-UP (noted, not blocking):**

4. **mgIdleFrames freeze semantics.** While a diverted swap runs the flat path, `mgIdleFrames`
   accumulates without reset and `mgRampRound` freezes. At swap exit the MG branch's wind-down
   decay applies to ALL accumulated idle frames. Arguably more faithful but unmeasured. Noted in
   the `swapLeavesMgLadder` gate comment in sim.ts.

**NOTEs (acknowledged, no code change):**

5. **N3b gap pin assumes speedMult == 1** — true today (fixture grants no attack-speed buff),
   fragile if the comp changes.
6. **Latent fireAcc/ammo cross-branch semantics** — inert for nbo (hitsPerShot 1), would matter
   for a future diverted MG with hitsPerShot > 1.

## To land it

- Bring it back by **pushing the branch and opening a PR** — never by merging into local `main`
  (CLAUDE.md constraint 8). Owner asks first (constraint 2).
- `/patch-notes` before the PR (a hook nudges).
- Remove the worktree once the PR merges.

## Things a fresh session will otherwise re-derive (don't)

- **The datamine decode is settled enough to have been enacted, and its counterexample is recorded.**
  `skill_value_data[1]` is positionally the swap weapon's `rate_of_fire` across all 11 ChangeWeapon
  carriers; `k` corroborates it independently of the datamine (her kit TEXT says "Attack speed ▼90%"
  on an SMG = 2.4/s = her shipped `pullsPerSec` = her column's 144 ÷ 60). `moran`'s 1440 was
  board-refuted on video and that still stands. All of this is in DECISIONS + her override ⚑1.
- **The inertness claim is BY MECHANISM and is machine-checked.** `npx tsx
scripts/census-mg-swap-carriers.ts` classifies every swap carrier by the branch that actually
  routes it and exits non-zero if a second diverted carrier appears. Do not re-argue it by fixture.
  It caught a real hole in the driver's first draft (a second MG-base carrier the driver had missed,
  which turns out to be routed by the charge branch above the gate) — trust the script, not a grep.
- **⚑3 is the known-open weakness and is pinned on purpose.** At 1.5 shots/s her burst is a
  throughput LOSS against holding her MG, which is implausible; `scripts/tests/units/neon-blue-ocean.test.ts`
  (N3) asserts that direction deliberately so a ⚑3 landing must flip it rather than drift past it.
  The residual sign after this landing (sim now ~5–7 places BELOW the community lists, where it was
  ~50 ABOVE) is what an unmodeled multi-hit swap weapon predicts. One isolated nbo-solo scope-lock
  recording settles cadence, hits-per-pull and belt size at once. QUEUE item 8 owns it.
- **Fresh-worktree gotcha, already paid here:** `verify.sh` fails 3 `prerender-api-parity` tests
  until `npm run dpschart && npm run ranks:all` generate the gitignored `web/public/*.json`. The
  `docs/data/ranks/*.csv` the rank-audit regen needs are gitignored too and were copied in from the
  main tree.
