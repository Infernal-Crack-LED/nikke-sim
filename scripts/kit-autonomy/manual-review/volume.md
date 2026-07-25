# volume — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Volume (`volume`) — Wind · SMG · Attacker · Burst I · 20s CD · ammo 120 · reloadFrames 111 ·
chargeFrames 0 · hitsPerShot 1 · normalMult 8.73 / coreMult 200 · critRate 15 / critDamage 150 · Tetra.

**Verdict:** 🟢 **GO** · faithfulness **0.95** (4/4 kit lines FAITHFUL or documented UNMODELED; 0 real gotchas) ·
**cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen. Score docked
1.0→0.95 for the measurement-gated escalating cumulative-vs-tier-replacement hypothesis + the cadence ⚑ (both
owner/footage-gated; structure is certified, magnitudes are not).

---

## 1. Real kit (data/characters.json — ground truth)

- **S1** ■ Affects self when killing an enemy: ATK ▲ 12.6% for 5 sec.
- **S2** ■ Activates when entering Full Burst → all allies (effects vary by number of times entered; _each
  subsequent effect triggers all effects before it_): Cooldown of Burst Skill ▼ 2.34 / 2.7 / 3.17 sec.
  - ■ Activates when using Burst Skill → all allies (effects vary by number of uses; _each subsequent effect
    triggers all effects before it_): Critical Damage ▲ 10.77 / 12.46 / 14.42% for 5 sec.
- **Burst** ■ Affects all allies: Critical Rate ▲ 31.9% for 5 sec.

---

## 2. What the code does (the faithful override, line by line)

- **S1 (kill-gated ATK)** **UNMODELED** (documented verbatim in `unmodeled.skill1` + caveats). "When killing an
  enemy" has NO on-kill trigger primitive in `TriggerDef`, and the scope-lock partless raid boss never dies
  mid-fight (no adds), so the trigger can NEVER fire. Recorded verbatim, NOT approximated as a passive/shotFired
  ATK proxy — that would grant a permanent +12.6% ATK the kit never gives vs an immortal boss (measured>fudge).
  All four agents (driver, S2b fable, S5 opus `it.skip`, S6 opus) converged on UNMODELED. **V1 actively PINS the
  absence** (zero atkPct buffApply from Volume) and is RED under the passive-permanent nearest-wrong — a
  non-vacuous absence claim, not a silent drop and not a bare `it.skip`.
- **S2 block A** `fullBurstEnter → allies → escalating burstCdr [2.34, 2.7, 3.17]` — "entering Full Burst" =
  `fullBurstEnter` (fires on ANY team Full Burst entry, 5× in the driver fixture), the deliberate split from
  block B's `burstCast`. "Each subsequent effect triggers all effects before it" = the engine's `escalating`
  primitive (sim.ts:2056: Nth activation applies steps 1..N, clamped) → CUMULATIVE: from the 3rd FB every entry
  refunds 2.34+2.7+3.17 = **8.21s** off every ally's burst cooldown. "All allies" INCLUDES Volume herself —
  shaving her own 20s B1 cooldown is the mechanism that accelerates the whole rotation. `burstCdr` emits NO buff
  event (sim.ts:2047 refunds `burstCdFrames` directly), so V2 verifies it by EFFECT: a fire-rate / modeled≠working
  check (Volume casts 10× with the block vs 9× without) + a trigger check (re-keying to `burstCast` over-applies
  the 5-activation refund → 13 casts, provably distinct from 10).
- **S2 block B** `burstCast → allies → escalating critDamagePct [10.77, 12.46, 14.42] durationSec 5` — "using
  Burst Skill" = `burstCast` (fires ONLY on rotations Volume herself casts, 10×/target), correctly distinct from
  block A's `fullBurstEnter` — the intra-slot trigger split is the kit's defining trap. Cumulative escalating with
  DISTINCT buff keys (sim.ts:2056 `${key}:sN`) so the three steps COEXIST and SUM = **+37.65%** team crit damage
  for 5s per cast from her 3rd cast (no overwrite). V3 discriminates the escalating ladder exactly (per-target
  counts 10.77=10 / 12.46=9 / 14.42=8 = casts / casts-1 / casts-2; step _i_ applies from cast _i_+1) and the
  trigger (fullBurstEnter counterfactual → 5/target).
- **Burst** `burstCast → allies → generic critRatePct 31.9 durationSec 5` — plain "Critical Rate ▲" = GENERIC
  `critRatePct` (lifts crit on skill/burst buckets too), correctly NOT the scoped `critRateNormalPct`. Constant
  (non-escalating), reaches all 3 allies, never lands on the boss. V4 discriminates the trigger (fullBurstEnter
  counterfactual → 5/target) and the scope (scoped counterfactual leaves skill/burst bucket crit unchanged).

All three modeled blocks are burst/FB-gated — in a team that cannot chain B1→B2→B3 Volume's entire kit is inert
and she contributes plain SMG fire only. Her personal damage is plain SMG fire (hitsPerShot 1; no riders/DoT/
swap/charge/HP-scaler/multi-projectile/Hit-Rate line).

---

## 3. Handled forks (the judge's two gotchas — neither is a REAL-GOTCHA)

- **Intra-slot trigger split (HANDLED).** The two S2 blocks carry DELIBERATELY different triggers —
  `fullBurstEnter` (CDR block) vs `burstCast` (crit-damage block). Collapsing both onto one trigger is the single
  most likely shared misread, and it only diverges with a second Burst-I unit / uncompleted chains. The driver
  keyed them correctly, and its sole-B1 fixture [volume/crown/helm] (Volume casts 10× ≠ team FB 5×) discriminates
  the split BY COUNT — strictly more discriminating than the S5 blind's `controlComp` (which adds liter as a
  second B1, making the two triggers coincide; the blind documented it could not discriminate trigger identity
  there). All four agents keyed the split correctly.
- **Escalating cumulative-vs-tier-replacement (HANDLED-HYPOTHESIS).** "Each subsequent effect triggers all
  effects before it" read as CUMULATIVE (engine `escalating`: Nth activation applies steps 1..N) → 8.21s CDR /
  +37.65% crit DMG at cap, rather than top-tier-alone (3.17s / 14.42%). This is the literal-clause reading and
  matches the engine primitive 1:1; the driver's test PINS the cumulative ladder empirically (the 10/9/8
  per-target counts). Both blinds independently flagged the cumulative-vs-replacement ambiguity with a measurement
  recipe. Correctly labeled a HYPOTHESIS to confirm on a graded ≥3-FB fight; not fabricated.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **Escalating cumulative-vs-tier-replacement (§3)** — the load-bearing semantic; confirm on a graded fight where
   Volume enters FB ≥3 times: total Burst-CD shaved per FB (cumulative → ~8.21s on the 3rd; replacement → 3.17s)
   and Crit DMG on her 3rd burst cast (cumulative → 37.65%; replacement → 14.42%). (duration/trigger semantics)
2. **Cadence tuple (fire rate / reload / rolling-reload)** — the sole ALWAYS-⚑ field, CALIBRATED. Engine SMG
   class default shipped; datamine rate_of_fire 1440rpm = 24/s (game-source authoritative); datamine reload_time
   150 (~90f) vs synced reloadFrames 111 and reload_start_ammo 119 (possible rolling/partial-reload tell) open on
   video. Recipe: focused solo scope-lock video — count rounds per 10s window + the mag-empty→first-shot gap;
   watch whether the ammo counter refills partially while firing. (cadence)
3. **burstCast-vs-fullBurstEnter trigger split (§3)** — confirmed structurally + by count in the sole-B1 fixture;
   a multi-B1 team is the real-world divergence case if a future comp pairs Volume with another Burst-I unit.
   (trigger-identity)

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): converged on all 4 lines — skill1 UNMODELED (no on-kill primitive,
  immortal boss), skill2a fullBurstEnter escalating burstCdr (cumulative 8.21s, self-inclusion load-bearing),
  skill2b burstCast escalating critDamage (cumulative 37.65pp), burst generic critRate 31.9/5s. Same load-bearing
  set + nearest-wrong models as the driver; `leakDetected: null`.
- **S5** (opus, blind test): 4/7 green vs the driver override on the load-bearing assertions (fixture sanity,
  critDamage escalation ≥2 magnitudes incl. 10.77, critRate ≈31.9 constant on ≥2 allies, CDR directional
  invariant); skill1 `it.skip` converges on UNMODELED. 2 RED classified RECON_ERROR (the blind's `zeroStat` sets
  value=0 but asserts the buff is ABSENT — a 0-value buff still emits buffApply; its own team-total-drop companion
  holds). Blind documented it could not discriminate trigger identity in `controlComp`; the driver's sole-B1
  fixture does. The blind's verbatim test source is preserved in `cross-family/volume/s5-result.json`
  (`testSource`) and `blind/volume.test.ts`; it carries additional mechanical defects (the harness import path,
  and `totals()` returns a per-slug `Record` the blind used as a scalar), so — like the other blind re-derivation
  artifacts — `scripts/kit-autonomy/blind/**` is excluded from the production typecheck (tsconfig.json, following
  the existing `scripts/blind-rebuild/code-bundle/**` precedent). It is evidence trail, not run by vitest.
- **S6** (opus, blind override): **EXACT structural match** to the driver — `skill1: []` (kill-gated → unmodeled),
  `skill2: [fullBurstEnter escalating burstCdr (2.34/2.7/3.17), burstCast escalating critDamagePct
(10.77/12.46/14.42) 5s]`, `burst: [burstCast critRatePct 31.9 5s]`; same deliberate trigger split + cumulative
  escalating; audit 1:1 with unmodeled; `leakDetected: null`.
- **S7** (opus, judge): **GO 0.95**, discrimination OK, fire-rate check passes, no REAL-GOTCHA; the two gotchas
  both HANDLED (trigger split; escalating cumulative-vs-replacement hypothesis).

## 6. Board / fit note (non-gating)

Volume is MODEL_ONLY (no recording) — no board score, and the gauntlet left the ENCODING unchanged (only the
override `note`/`caveats` were rewritten to current-state + the gauntlet provenance marker; the skill1/skill2/
burst blocks are byte-identical to the pre-gauntlet merged parser-baseline). So there is NO board movement to
classify — the unit tests pin faithful; a future recording pins accurate.
