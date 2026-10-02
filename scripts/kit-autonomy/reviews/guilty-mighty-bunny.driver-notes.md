# Driver notes — guilty-mighty-bunny (Guilty: Mighty Bunny), kit-autonomy gauntlet 2026-10-02

Driver: Claude Opus 5.5. Routing (Claude-only, owner 2026-10-02): S2b `claude-fable-5` + `claude-fable-5-1`
(tier 2), S5/S6 `claude-opus-5`, S7 `claude-fable-5-1` + `claude-fable-5`. All blind roles were dispatched
from an empty temp dir after the 2026-10-02 bridge fix (the first batch, dispatched from the repo cwd,
saw the driver's recent commit subjects and was discarded — see DECISIONS 2026-10-02).

## Tier

Tier 2: a self-mode system with mode-gated true damage, a round-count burst buff (`durationShots: 1`), a
uses-bounded burst weapon swap (`maxShots: 1`).

## Engine facts the blind roles could not see (verified by run)

1. **`trueNormalsModes` also flavors swap shots.** The normal-fire path reads
   `swap.trueNormals || hasTrueNormals`, and `trueNormalsModes` sets `hasTrueNormals` from the selected
   mode at setup. So in Engage the Mighty Stomp shot is already True — the mode-gated swap copy with
   `trueNormals` that both S2b reviewers proposed is behaviour-identical and was collapsed to ONE swap
   block. Pinned: G5 "the Engage Stomp is true … without the field it is not".
2. **Stomp timing.** The Stomp fires 89–103 frames after each cast (the 90-frame fixed charge counts the
   cast frame), inside Full Burst, taking the +50% major. Pinned G6.
3. **Charge bucket.** `chargeDamagePct` is additive points on the charge multiplier: Stomp = 2.5 + 14.0
   (+0.4 in Stance); the next base shot is back to 2.5 (+0.4). Pinned G7.
4. **Stomp ammo.** A real-weapon swap's entry refills to her current max magazine (9 in the control comp,
   ammo buffs included); the uses-based end (maxShots) hands the base weapon back with that magazine
   less the Stomp round — not the full magazine the 2026-08-12 ruling describes for a timed exit. ⚑
   caveat with a footage recipe.

## S2c reconciliation (driver spec vs both S2b reviews)

Converged on every line: Stance default (battle-start branch), static `modes` with the toggle + ally
sync UNMODELED, `trueNormalsModes` for Engage normals, both riders on `fullCharge` incl. the Stomp,
Stance AD 20.45 / CD 40 as `attackDamagePct` / `chargeDamagePct`, `maxShots: 1` and `durationShots: 1`
as round counts beside the genuine 10 s Attack Damage. Divergences, resolved toward the prose:

- Stomp true-flavor carrier (reviewers: mode-gated swap `trueNormals`; driver: `trueNormalsModes`) —
  behaviour-identical, see engine fact 1.
- `durationSec` bound on the swap: reviewers 10, driver 180 — never binds (maxShots ends it first);
  recorded as a bound, not a kit value.
  Adopted from the reviews: the Stomp-inside-FB pin, the 1400-not-on-next-shot pin, mutual exclusion.

## S5 convergence run (blind test vs the driver's shipped override)

The verbatim blind file (`scripts/kit-autonomy/blind/guilty-mighty-bunny.test.ts`, claude-opus-5, leakDetected null)
sets `onEvent` on the CompOptions top level, where `runComp` never reads it (the harness takes it under
`cfg`), so verbatim it captures no events and every event-reading assertion sees 0 — a harness
RECON error, not a model divergence. With ONLY that wiring routed through `cfg`
(`scripts/kit-autonomy/blind/guilty-mighty-bunny.adapted.test.ts`, one line, marked ADAPTED) it runs against the driver's
override: **11 passed / 0 failed / 3 skipped (its own declared GAPs: the mode toggle, the ally sync, the Engage true flavor it judged unobservable without a True Damage ▲ consumer)**.
The S6 blind override (claude-opus-5, leakDetected null) is block-equivalent to the driver's; the
differences are cosmetic (passive vs battleStart for the frame-0 ATK, stage:3 on a Burst III burstCast,
mode label text) or non-binding (swap durationSec bound).
