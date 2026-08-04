# Manual review — clay (Clay)

**Gauntlet date:** 2026-08-03
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (status-gate co-extensive construction for S2's "while in Victorious Battle Cry"; FB-gated 60-hit counter; burstCast-vs-fullBurstEnter on both burst lines)

> Slug disambiguation: `clay` is the only Clay (SMG/Electric/Supporter/Burst II, Tetra, released
> 2026-06-20). Lint clean (no AMBIGUOUS). FROM-SCRATCH build — no prior override existed; baseline
> was bare weapon, `simSupported:false`.

## Kit summary

Clay is an Electric SMG Supporter whose whole kit amplifies TRUE damage. During Full Burst, every
60 of her normal attacks lands a stack of **Victorious Battle Cry** on all allies (True Damage
▲6.45%, up to 3 stacks, each application lasting 6s). While that status is up, she also feeds every
ally flat ATK worth 20.07% of her OWN attack. Her Burst II (40s CD) gives the whole team True
Damage ▲12.56% for 10s and turns her OWN normal attacks into true damage for 10s — making her the
first consumer of the stack she builds. Two lines have no target in the sim's world: damage vs
enemy projectiles (the boss launches none) and a one-debuff immunity on Burst Stage 1 entry (the
boss applies no debuffs). Her personal SMG spray is minor; her board value is the true-damage
amplification channel she opens for herself and any true-dealing teammate.

## Line-by-line

| Line                                                          | Disposition    | Notes                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 trigger: 60 normal attacks DURING Full Burst → all allies  | FAITHFUL       | `shotFired` + `fbGate:'inFb'` + `everyN:60` (soda construction: abort-gates run BEFORE the everyN counter, so out-of-FB shots never accrue). NOT `hitCount` — its counter is consumed by out-of-FB shots (sim.ts firePull while-loop).                                                                   |
| S1: Victorious Battle Cry — True Damage ▲6.45%, ×3 stacks, 6s | FAITHFUL       | `trueDamagePct 6.45 / maxStacks:3 / durationSec:6` to allies; flavor-gated — byte-exact no-true controls (liter/helm) prove the gate routes correctly. C1 pins first proc on the 60th in-FB shot, recurrence across ≥3 windows.                                                                          |
| S1: projectile damage ▲45.05%/6s                              | DOCUMENTED_GAP | No enemy projectiles / interception channel at scope lock; inert by world-model; verbatim in `unmodeled.skill1` + ⚑ out-of-domain (estimate/recipe/tier).                                                                                                                                                |
| S2: Burst Stage 1 entry → debuff immunity (1 debuff, 10s)     | DOCUMENTED_GAP | No ally debuff list in v1 (claire precedent); verbatim in `unmodeled.skill2`; the stageEnter trigger is dropped WITH the unenactable effect (nothing rides it).                                                                                                                                          |
| S2: while in Battle Cry → all allies ATK ▲20.07% of CLAY ATK  | FAITHFUL       | Co-extensive construction: same trigger re-declared on skill2 → `casterAtkPct 20.07 / 6s` (no self-status channel exists; frima/eunhwa-tu precedent). C2 pins first-apply == first Cry frame, frame-set equality, flat value == 0.2007×staticAtk, and the always-on-passive counterfactual over-credits. |
| Burst: all allies True Damage ▲12.56%/10s                     | FAITHFUL       | `burstCast` (NOT fullBurstEnter) → allies; C3 pins application frame set == cast frame set, 4 allies per cast, 600-frame expiry; self-only counterfactual leaves ada at the removed-line level.                                                                                                          |
| Burst: self — normal attacks deal true damage for 10s         | FAITHFUL       | `weaponSwap {damagePct:10.12, trueNormals:true, 10s}` — frima/takina flavor swap (damagePct = her own multiplier → per-shot damage UNCHANGED, only flavor flips). C4 pins every normal instance at atkPct 10.12 in AND out of the window; true-bucket payoff occurs exactly inside [cast, cast+10s].     |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 5 load-bearing lines
  FAITHFUL + 2 UNMODELED verbatim — full convergence with the driver. Pre-registered the two
  shared-prior traps: the flat-vs-percent ATK read (adopted: the test asserts the emitted flat value
  == 0.2007 × clay staticAtk) and the burstCast-vs-fullBurstEnter divergence. Also flagged the
  counter carryover ambiguity (adopted as caveat ⚑2). Proposed `hitCount`+fbGate for the trigger;
  driver held `shotFired`+`everyN` because the hitCount counter accrues AND is consumed by out-of-FB
  shots (engine fact, sim.ts firePull) — reconciliation recorded in S2c.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Raw file vs driver override: 1 pass / 11
  fail / 3 skip — ALL 11 failures mechanical, zero encoding findings: (a) `onEvent` placed on the
  top-level runComp opts (the harness reads it from `cfg` — the known ada precedent mis-write; empty
  event log), (b) controlComp fixture whose crown wins EVERY stage-2 cast so clay never bursts (the
  blind author PRE-REGISTERED this risk and named the remedy: "re-cut the fixture, not the
  assertion"), (c) gate-strip patch keyed on a hitCount trigger, (d) passive counterfactual that
  left `everyN` gating the frame-0 application. Four labeled DRIVER ADAPTATIONS fixed exactly those
  (`blind/clay.adapted.test.ts`), zero weakened assertions: **12 pass / 0 fail / 3 skip** — the skips
  are the blind author's own documented GAPs (projectile line, immunity line, absolute window
  lengths), all matching the driver's unmodeled/⚑ dispositions.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converges on ALL five modeled lines'
  stat/value/duration/maxStacks/target/gate and both verbatim unmodeled lines. Three divergences:
  (1) `hitCount`+fbGate trigger (driver-held `everyN` on the burn argument above); (2) an
  empty-effects `stageEnter` audit-anchor block for the immunity line (driver drops trigger with
  effect — validator-clean, line verbatim in unmodeled); (3) **genuine blind miss:** swap
  `damagePct:100` (≈10× her normal multiplier — a massive damage change) vs the driver's flavor-only
  `damagePct:10.12`; the driver test pins every normal instance at 10.12 in and out of the window.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, gotchas [], discriminationOk:true,
  S5-vs-driver GREEN.** All 7 lines accounted (5 FAITHFUL + 2 DOCUMENTED_GAP), zero silent drops.
  Both divergences resolved in the driver's favor on engine mechanics (the hitCount burn; S6's
  damagePct:100 ruled a RECON_ERROR-grade blind miss, not a driver finding). One cosmetic spot-check
  adopted: cadence phrasing corrected from "24 pulls/s" to the frame-quantized MEASURED 20.0 rounds/s
  effective SMG cadence (DECISIONS 2026-07-23) in the override note/caveat + test header.

## Residual flags for owner

1. **⚑ 60-hit counter carryover (MEASUREMENT-GATED).** The kit says "60 normal attacks during Full
   Burst" — it specifies WHICH hits count but is silent on whether the accrued count resets when Full
   Burst ends. Encoded CARRYOVER (the everyN activation counter is cumulative across windows — the
   literal reading restricts the counting, not the counter's lifetime). Estimate: ≤1 marginal proc
   per fight (a full 10s FB window accrues ~3 procs on its own at the 20/s effective cadence).
   Recipe: popup-read the Victorious Battle Cry stack icon across an FB boundary in a clay focus
   recording. Tier: override-only. Both blind reviewers (fable S2b, opus S6) independently flagged
   this as the one open semantic.
2. **⚑ Cadence tuple (ALWAYS-⚑, datamine-derived).** Nominal 24 pulls/s (rate_of_fire 1440÷60),
   frame-quantized by the engine to the MEASURED 20.0 rounds/s effective cadence (DECISIONS
   2026-07-23); reloadFrames 81 datamine, single-chunk reload, ammo 120 → 5s mag. Drives her own SMG
   damage and the ~3.0s-per-proc Battle Cry cadence — her own shots only, so the uncertainty does
   not propagate into teammates' damage.
3. **⚑ Projectile line out-of-domain.** "When attacking an enemy projectile, damage to that
   projectile ▲45.05% for 6 sec." — zero damage impact in any comp the sim can field (partless boss,
   no interception model). Enactment needs an enemy-projectile entity + interception-damage channel;
   carried verbatim in unmodeled.skill1, nothing fabricated in its place.
4. **Debuff immunity out-of-domain.** The stage-1 one-debuff immunity has no observable payload in
   v1 (no debuff list). If the sim ever models ally debuffs, re-enact as stageEnter stage:1 →
   immunity grant (the blind S6 audit recorded the trigger identity for exactly this reason).
5. **Engine artifact note (counterfactual-only).** A `weaponSwap` WITHOUT trueNormals loads a fresh
   magazine (real-swap semantics) and a swap cast mid-reload cancels the reload progress — both are
   why the tests' removal reference deletes the swap effect rather than flipping the flag. The
   SHIPPED encoding is unaffected (the flavor swap grants no reload, faithful to the kit).
