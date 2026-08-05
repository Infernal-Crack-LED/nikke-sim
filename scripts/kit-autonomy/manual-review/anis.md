# Manual review — anis (Anis, base)

**Gauntlet date:** 2026-08-04
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (scoped buff — `alliesTopAtk` `byFinalAtk` self+top-2 split; `burstCast` FB-exemption and the starvation lever; kit-silent interval trigger)

> Slug disambiguation: `anis` is the BASE Anis (RL/Iron Defender, Burst II, cd 20s, aka "base anis").
> She is NOT `anis-star` (RL/Electric Burst I, "as"/"star") nor `anis-sparkling-summer` (SG/Electric
> Supporter Burst III, "ass"/"sanis"). The slug-disambiguation lint's AMBIGUOUS-base guard fired on the
> bare name and was explicitly resolved on this slug (S0).

## Kit summary

Anis is an Iron rocket-launcher Burst-II Defender — an early SR-rarity tank whose kit is almost
entirely survivability. Skill 1 raises her own DEF by 120% for 10s after she has been attacked 40
times. Skill 2 (30s cooldown, no activation clause) raises DEF by 80% for 5s on herself and her two
highest-FINAL-ATK allies, and shares damage taken equally among the three of them for 10s. Her burst
fires a missile dealing 156.73% of final ATK to enemies in range — her ONLY damage line — and lowers
enemy DEF by 32% for 5s.

On the sim's immortal, non-attacking, partless boss the defensive lines have nothing to act on: the
attacked counter can never accrue (no incoming damage), the share has nothing to redistribute, ally
DEF buffs are offensively inert (`defPct` feeds no damage in v1), and the enemy DEF shred has no
engine channel (boss DEF is a fixed per-hit subtraction) — and would only be worth ~0.04%/hit if it
did. What the board sees is her RL weapon cadence plus one 156.73% nuke every ~20s Full Burst cycle.

## Line-by-line

| Line                                                     | Disposition      | Notes                                                                                                                                                                                                    |
| -------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: attacked 40 times → self DEF ▲120%/10s               | DOCUMENTED_GAP   | No incoming-damage model and no attacked-N trigger primitive (unrepresentable, not unmeasured); DEF payload inert regardless; skill1 ships empty, pinned by counterfactual                               |
| S2: self + 2 highest-FINAL-ATK allies → DEF ▲80%/5s      | FAITHFUL (inert) | `interval:30` (datamined `skillCooldownsSec.skill2`) + self block + `alliesTopAtk{2, excludeSelf, byFinalAtk:true}` block (mast/soda pattern); byte-identical totals under removal (defPct inert canary) |
| S2: (same targets) equally shares damage taken for 10s   | DOCUMENTED_GAP   | No redistribution primitive, no incoming damage to share; 10s duration differs from the DEF line's 5s; every shipped S2 effect pinned as a defPct buff                                                   |
| Burst: enemies in range — 156.73% of final ATK as damage | FAITHFUL         | `burstCast` → enemy `flatDamage 156.73`; FB-exempt (cast lands before the FB window — empty `fbMajorApplied` pin); SL1 datamine 68.57 counterfactual discriminates                                       |
| Burst: (same targets) DEF ▼32% for 5s                    | DOCUMENTED_GAP   | Unenactable: boss DEF is the fixed `cfg.bossDef` subtraction with no debuff channel; magnitude ~0.04%/hit; NOT `damageTakenPct` (inflation counterfactual proves the fold wrong)                         |

## Fixture design (spec: scripts/tests/units/anis.test.ts — 23 tests GREEN)

- **COMP** `['liter','anis','helm','ada']`, boss Fire (neutral for Iron), focus anis. liter (B1 20s)
  opens the chain; anis is the SOLE B2; helm + ada (both B3 40s) alternate the stage-3 slot so Full
  Bursts open every ~20s and anis casts every cycle (~8 casts / 180s). The controlComp seats crown —
  a second B2 whose 20s cd wins every same-stage selection and would starve anis to ZERO casts (the
  B2 fixture trap this gauntlet's task note pre-registered; measured on rupee 2026-08-04).
- **STARVED** `['liter','crown','anis','helm']` is that trap run deliberately: crown casts ≥3, anis
  casts 0, FBs still open. Two-way lever: her burstCast nuke must be SILENT there while her
  interval-30 S2 keeps firing on the battle clock — and the S2 target set FLIPS with the comp
  (top-2 final ATK of {liter, crown, helm} = helm + liter, since Supporter ~98k > Defender ~78k),
  proving the `byFinalAtk` ranking is live, not a static slot list.

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. CONVERGED on all 5 lines:
  both FAITHFUL encodings independently re-derived (interval-at-skill-CD trigger, `byFinalAtk`
  REQUIRED by the literal "final ATK" wording, exclude-then-take-2 + self split, burstCast-keyed
  FB-exempt nuke) and all three UNMODELED mechanics with the same nearest-wrong set (hitCount-40 on
  hits she DEALS for S1; `damageTakenPct` folds for both the share and the DEF shred; static ranking;
  dropped self application). Pre-registered the co-B2 starvation trap on the control fixture.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently derived the full spec,
  including the empty-skill1 pin, the self+2 tally arithmetic, the 5-seconds-not-rounds duration pin,
  the whole-kit inertness-under-deletion, the exact 156.73 magnitude, the FB/range/core pins, and the
  two `damageTakenPct`-fold traps — with three honest `it.skip` GAPs matching the driver's unmodeled
  set. The pristine artifact used the controlComp fixture (its own sanity check anticipates the
  starvation); the ADAPTED copy (`blind/anis.adapted.test.ts`, banner documents 6 structural fixes —
  import path, onEvent-under-cfg, sole-B2 FIXTURE FIX, slug keying, comp-membership tally, event
  `durationShots` null-vs-undefined) runs **14 pass / 3 honest skips / 0 fail** vs the driver override.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Structurally IDENTICAL to the driver
  override: empty skill1, self + `alliesTopAtk{2, excludeSelf, byFinalAtk:true}` defPct 80/5s pair,
  burstCast enemy flatDamage 156.73, same three unmodeled lines verbatim. Two benign divergences:
  (a) `interval sec:20` — a KIT-SILENT estimate the blind itself flagged ("the only cadence number
  available" — the prose-only packet did not carry `skillCooldownsSec.skill2 = 30`, which the driver
  used; judge ruled this a recon-side artifact, not a finding); (b) explicit `noFb`/`noRange` flags
  that are behaviourally identical to the driver's unflagged burst-cast damage (engine FB-exempts
  burst casts; `rangeApplied:false` observed on every instance).
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas [].**
  Every line accounted for (2 FAITHFUL + 3 DOCUMENTED_GAP, all verbatim in `unmodeled`, nearest-wrong
  encodings pinned out). Judge verified the S2 buff fires on the exact 30s grid in both comps with
  comp-dependent target flips, the nuke fires once per cast and goes silent under starvation, and the
  DEF-shred arithmetic (0.32·bossDef/(finalATK−bossDef), ATK-dependent) rules out any
  `damageTakenPct` fold.

## Residual flags for owner

1. **⚑ Burst DEF▼32% — the kit's ONLY team-offensive line — is honestly unmodeled.** The engine has
   no boss-DEF-debuff channel (boss DEF is the fixed `cfg.bossDef` per-hit subtraction), and at 140
   boss DEF the true value is ~44.8 ATK ≈ +0.04%/hit inside the 5s post-cast windows. The override
   note discloses that her board reading reflects zero of it. If a boss-DEF-reduction primitive ever
   lands, the per-hit gain is `0.32·bossDef/(effectiveAtk−bossDef)` per attacker — NEVER a
   `damageTakenPct` fold (a uniform ×1.32-style multiplier; the spec's counterfactual proves it
   inflates every ally's total). This is the one line that would change her board reading.
2. **⚑ S2 cadence + phase convention.** The 30s interval is the datamined `skillCooldownsSec.skill2`
   (the kit prose carries no number — ⚑ cadence tuple), and "first fire at t=CD" is the
   no-activation-clause convention (unmeasured phase; maiden/milk precedent). A focus video showing
   when C.H. Formation first lands would pin the phase.
3. **⚑ RL cadence tuple (MANDATORY, datamine-unreliable).** rate_of_fire 60 / chargeFrames 60 /
   reloadFrames 142 / ammo 6 shipped as-is. Because the kit contributes almost nothing to her damage,
   a cadence error maps ~1:1 onto her total. Recipe: read rocket cadence + reload gap from any
   focused anis video.
4. **⚑ S1 attacked-cluster and S2 damage-share are out-of-domain**, not merely unmeasured: both need
   an incoming-damage subsystem the sim deliberately lacks (maiden/yulha and bay precedent). In-game
   Anis tanks regularly, so both lines are real in play — but with offensively inert payloads (DEF,
   redistribution) they move zero damage in a DPS sim under any encoding.
5. **No board row (generatorSupported:false).** board-read shows her neither before nor after the
   gauntlet — same as marciana/claire; her sim footprint is the unit spec + generator opt-in only.
