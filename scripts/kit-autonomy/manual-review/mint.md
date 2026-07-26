# Manual review — `mint` (Mint)

**Gauntlet:** kit-autonomy 2026-07-25 · driver Qwen · cross-family blinds claude-fable-5 (S2b) / claude-opus-5 (S5/S6/S7).
**Binding verdict (S7 opus reconciling judge):** **GO · faithfulness 1.0** · discriminationOk=true · 10/10 kit lines FAITHFUL or DOCUMENTED_GAP (4 FAITHFUL, 6 DOCUMENTED_GAP) · **0 REAL-GOTCHA, 0 RECON_ERROR**.
**Tier:** 2 (mode system / status-gate / meta-defining duet comp).
**Board:** 1.015 OK (±3% ✓, ±1.6%) — unchanged this pass (no value edits).

## What was verified (and how)

Driver test `scripts/tests/units/mint.test.ts` (10 tests, GREEN vs shipped + RED vs every named
counterfactual) pins, on the fixture `liter (B1) / mint (B2) / ada (B3) / helm (B3)`, boss Fire, focus ada:

- **S1 Singing** `casterAtkPct` = **22.51% of caster ATK** in solo (half of 45.02 — the 50%-uptime proxy),
  recovered as `value / staticAtk × 100`; 3s; all 4 allies; every full-charge pull. RED vs the raw parser's
  full-uptime 45.02.
- **S2 Singing trio** on stage-3 entry: `critRatePct` **9.97** / `projectileExplosionPct` **25** /
  `pierceDamagePct` **16.36** (halved); 10s; all 4 allies; once per burst. RED vs full 19.94/50/32.72.
- **Burst Sing Along trio** `attackDamagePct` **30.02** / `maxAmmoPct` **40** / `critDamagePct` **45.05**;
  10s; all 4 allies; **mode-INVARIANT** (identical in solo and duet = correctly UNCONDITIONAL, fires every
  Mint cast). RED vs a Singing-gated (halved) burst.
- **Mode system:** selecting `duet (w/ Prika)` DOUBLES the Singing-gated lines to full (45.02% / 19.94 / 50 /
  32.72) while leaving the burst trio untouched. (Harness `CompOptions.modes` was extended additively to
  select a mode behaviourally.)

Cross-family convergence: S2b (fable) re-derived all 9 damage-relevant lines FAITHFUL with matching
magnitudes; S6 (opus) reproduced the same magnitudes, triggers (shotFired / stageEnter:3 / burstCast),
target sets, durations, and the unconditional burst from prose alone. S5 (opus) blind test run unmodified
against the shipped override: **17/27 pass**, corroborating every magnitude + scoping claim (caster-scaled
FLAT ATK not atkPct; stage-3-entry trigger not Mint's own stage-2 cast; burst trio once-per-cast on burstCast
not fullBurstEnter; maxAmmo a live lever; pure supporter; no invented stat; crit unscoped; fixture guards).

## Owner spot-checks (ranked — the S7 judge's gotchas)

### 1. The 50%-uptime Singing-gate MECHANISM (med, CONFIRMED) — highest-value follow-up

The Singing gate ships as a **steady-state halving proxy** (half value every rotation) + a user-selectable
`solo`/`duet` mode. The proxy is **arithmetically exact in expectation** — all three gated channels enter
damage linearly (flat ATK add; additive Damage-Up; crit via `1 + rate×(critDmg−1)`), so 50%-at-full ==
100%-at-half — and it is **owner-validated** (graded comp 1.015, kit-status tier VALIDATED/tuned).

**Correction the owner should act on:** the dynamic encoding **IS available today** with shipped primitives.
Drive a part resource from two `burstCast` blocks (`everyN:2`, `everyNOffset 1 → Dancing`, `offset 0 →
Singing` — strict alternation from the no-part start, so burst 1 leaves her DANCING) and `resourceGate` the
skill1 Singing block + the skill2 trio on it. Engine code-verified: `sim.ts:1722` (`resourceGate` reads
`owner.resources`), `sim.ts:1731` (`everyN`/`everyNOffset`), schema `types.ts:373/391`; shipped precedent in
`soda-twinkling-bunny` / `scarlet` / `rouge`. (The earlier "no dynamic-status primitive" framing in the note
was inherited from the S6 blind and is **wrong** — S2b fable and S5 opus, blind to each other, both named this
exact path; the driver has corrected the override note.)

The dynamic gate would (a) restore the **kit-literal** magnitudes 45.02/19.94/50/32.72 on ~50% of rotations,
(b) reproduce **rotation-1 absence + even/odd parity** (which the proxy structurally cannot), and (c) fix a
second-order error the judge found independently: with an ODD number of Mint casts over 180s the true Singing
share is `floor(n/2)/n` (≈44% at 9 casts), so the flat 0.5 factor **over-credits the four gated lines ~13%
relative**.

**Why not done autonomously:** replacing the proxy shifts the graded comp (tuned against the proxy) and needs
the even/odd parity confirmed against a recording — an owner decision, not a gauntlet edit.
**Recipe:** enact the `resourceGate` above → restore kit-literal values → re-grade the mint comp and treat any
ratio movement as fit-exposure (re-tune exposed units separately, never re-fudge) → confirm parity on a
Mint-focus recording. **Estimate:** a few % board-level from teammate-damage/Singing-window covariance + ~13%
relative on the four gated lines from 0.5-vs-floor(n/2)/n. **Tier 2.**

### 2. The Dancing heal (low, CONFIRMED)

`S1 Dancing Effect: recover 1.8% caster Max HP / 1s × 3` stays **UNMODELED** — the engine has no HP pool, so
the magnitude is genuinely unmodelable; its only damage channel is a Crown-style on-recovery consumer (known
repo-wide cold bias, owner finding F1: "crown recovery consumer never procs", hard rule 2). S6 wired it as
`heal ticks:3 intervalSec:1` but mode-gated to `dancing`, so S6's own default mode is just as silent as the
driver's — net practical divergence in default configuration: zero. **Recipe:** once a Dancing state is
expressible (shares spot-check 1's gate), wire the heal event Dancing-gated (NOT ungated — that would feed a
consumer 2×) and measure a crown-carrying comp's on-recovery uplift via the S5 HEAL fixture
(`liter / mint / crown / helm` with every other heal stripped). **Estimate:** zero without a recovery consumer;
small-but-nonzero in a crown comp. **Tier 2.**

### 3. Full-Charge → `shotFired` reduction (low, PLAUSIBLE)

"Activates when attacking with Full Charge" is encoded as bare `shotFired` on the premise that an RL
(chargeFrames 60) fires only fully-charged shots. All three blinds share this premise (convergent but therefore
WEAK evidence — same-model agreement, not independent verification). Now on the record in the override note.
**Recipe:** verify the engine's RL path emits `shotFired` only on completed charges; if it can emit on a
partial/cancelled charge, gate the block on the charged-shot event. Documentation fix unless the premise is
false. **Tier 3.**

## Documented UNMODELED (inert / out-of-domain — no assertion by design)

- S1 Dancing heal (above).
- S2 "Cancels Singing/Dancing" on stage-3 entry while not Sing Along — an expressibility GAP (no
  self-buff-active/absent gate; `resourceGate` reads a resource POOL, not a buff state). Correctly OMITTED:
  when Mint casts every rotation (20s CD) her 10s Sing Along is live at every stage-3 entry, so the cancel
  never fires. The dangerous misread (unconditional cancel stripping parts every rotation) is what the omit
  avoids. Only matters in multi-Burst-II comps where Mint sits out a rotation.
- Burst Assigned Part toggle (Status 1/2, "cannot be removed") — mode bookkeeping, no damage/buff payload;
  folded into the mode system.
- `pierceDamagePct` is faithfully encoded as a buff VALUE but damage-INERT in engine v1 on the partless boss
  (no Pierce tag consumer); the test pins the magnitude, not downstream damage.

## Artifacts

- Driver test: `scripts/tests/units/mint.test.ts` (+ `reviews/mint.verify.txt`)
- Override: `src/skills/overrides/mint.json`
- S2b review: `reviews/mint.test-review.json` · S5 blind: `blind/mint.test.ts` (+ `blind/mint.test.verify.txt`)
- S6 blind: `blind/mint.override.json` · Binding verdict: `results/mint.json` (+ `results/mint-judge-packet.md`)
- Cross-family packets/results: `cross-family/mint/`
