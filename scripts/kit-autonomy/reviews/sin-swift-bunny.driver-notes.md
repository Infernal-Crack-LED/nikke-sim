# Driver notes — sin-swift-bunny (Sin: Swift Bunny), kit-autonomy gauntlet 2026-10-02

Driver: Claude Opus 5.5. Routing (Claude-only, owner 2026-10-02): S2b `claude-fable-5` + `claude-fable-5-1`
(tier 2), S5/S6 `claude-opus-5`, S7 `claude-fable-5-1` + `claude-fable-5`. All blind roles were dispatched
from an empty temp dir after the 2026-10-02 bridge fix (the first batch, dispatched from the repo cwd,
saw the driver's recent commit subjects and was discarded — see DECISIONS 2026-10-02).

## Tier

Tier 2: a self-mode system with mode-gated true damage, round-count per-shot buffs gated off a burst
weapon swap (`swapGate: 'unswapped'` + `durationShots: 1`), a mode-branched burst rider.

## Engine facts the blind roles could not see (verified by run)

1. **`trueNormalsModes` also flavors swap shots** (`swap.trueNormals || hasTrueNormals`), so the Engage
   Swift Piercing shots are True with ONE unflagged swap block. Pinned S4.
2. **Per-pull round convention (theme 21).** A `fullCharge`-granted `durationShots: 1` buff rides the NEXT
   round. Steady state: every base shot fires at 69.04 × 2 with charge 2.5 + 0.5212. Boundaries: the
   first Swift Piercing shot of each window inherits the last base grant (146.44 = 73.22 × 2, charge
   3.5212) and the first base shot after the window has none (69.04). Pinned S2 as documented residue;
   ⚑ caveat with a footage recipe. No same-shot primitive was built (the kit's 'during Full Charge'
   wording is the only signal and theme 21 is the settled convention).
3. **Swift Piercing cadence.** 30 frames between pulls (0.5 s fixed); one window in the control comp
   (cast 4138) holds a single 90-frame pause from the boss script. 9 shots fit a 5 s window from a
   9-round magazine (ammo buffs included). Pinned S5.
4. **Burst ordering.** The ATK ▲ 110% block precedes the damage blocks, so all burst hits snapshot it;
   reordered, their ATK basis drops > 30%. Pinned S6.

## S2c reconciliation (driver spec vs both S2b reviews)

Converged on every line: Stance default, static `modes` with the toggle + ally sync UNMODELED,
`normalAttackPct` + `chargeDamagePct` at `durationShots: 1` behind `swapGate: 'unswapped'`, generic
`critRatePct` / `critDamagePct` in Stance, `burstCast` (not `fullBurstEnter`) for the swap, 0.5 s
chargeTimeSec + clamp, 300% full charge, 5 s, no Pierce despite the name, the mode-branched burst rider.
Divergences, resolved toward the prose:

- Swift Piercing true-flavor carrier (a reviewer: mode-gated swap `trueNormals`, "the base-weapon flag does
  not cover swap shots"; driver: `trueNormalsModes`) — in this engine it does cover them, see fact 1.
- `burstDesc` on the 958.9% / 854.6% riders: the driver first left them untagged ("additional damage",
  not "Burst Skill damage"); one S2b reviewer and the blind S6 tagged them `allEnemies`. Resolved FOR the
  tag by the settled owner ruling (2026-08-10, `scripts/census-burst-amp-scope.ts`): "Affects the same
  targets" inherits the preceding block's "Affects all enemies" clause. Census `--check` clean.
  Adopted from the reviews: the burstCast-vs-fullBurstEnter discriminator (helm completes the other
  rotations), the burst-hits-snapshot-ATK pin, mutual exclusion.

## S5 convergence run (blind test vs the driver's shipped override)

The verbatim blind file (`scripts/kit-autonomy/blind/sin-swift-bunny.test.ts`, claude-opus-5, leakDetected null)
sets `onEvent` on the CompOptions top level, where `runComp` never reads it (the harness takes it under
`cfg`), so verbatim it captures no events and every event-reading assertion sees 0 — a harness
RECON error, not a model divergence. With ONLY that wiring routed through `cfg`
(`scripts/kit-autonomy/blind/sin-swift-bunny.adapted.test.ts`, one line, marked ADAPTED) it runs against the driver's
override: **20 passed / 0 failed / 5 skipped (its own declared GAPs: the mode toggle, the ally sync, both Engage true-flavor clauses, the Swift Piercing shot economy)**.
The S6 blind override (claude-opus-5, leakDetected null) is block-equivalent to the driver's; the
differences are cosmetic (passive vs battleStart for the frame-0 ATK, stage:3 on a Burst III burstCast,
mode label text) or non-binding (swap durationSec bound); it also set Swift Piercing maxAmmo 10 (kit-silent — the driver's ⚑ caveat) and tagged the burst riders allEnemies, which the driver adopted per the 2026-08-10 ruling.
