# guillotine-winter-slayer — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check. EXACT SLUG: `guillotine-winter-slayer` (Guillotine: Winter Slayer, aka "gws") — the AR/Water
> VARIANT, NOT `guillotine` (Guillotine, MG/Electric). (The slug-disambiguation lint flags the base token
> "guillotine" inside the hyphenated slug itself — a known false positive; the variant is unambiguous.)

**Unit:** Guillotine: Winter Slayer (`guillotine-winter-slayer`) — Water · AR · Attacker · Burst III · 40s CD ·
ammo 60 · reloadFrames 81 · hitsPerShot 1 · normalAttackMultiplier 13.65 · rate_of_fire 720 (datamined).

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (judge claude-opus-5, re-judge after one
NO-GO→fix retry) · **0 silent drops, 0 real gotchas remaining** · S2b claude-fable-5, S5/S6/S7 claude-opus-5 (all
cross-family). The first judge pass ruled NO-GO on a REAL-GOTCHA the blind pass surfaced (uncapped level-up
rewards); the driver fixed it (the exact encoding both blind agents specified) and the re-judge flipped to GO 1.0
with discriminationOk true.

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Hero's Fate)** ■ Activates every time EXP stacks 10. Affects self.
  - Hero Level Up: reaches a maximum of Level 11.
  - Hero Level Up Reward: Reloads 10.26%.
  - Hero Level Up Reward: Recovers 2.44% of the skill user's final Max HP.
  - ■ Activates when Hero levels up. Affects all Water Code allies.
  - Elemental Advantage Attack Damage ▲ 1.16% × Hero Level continuously.
  - ATK ▲ 0.91% of the skill user's ATK × Hero Level continuously.
- **S2 (Hero's Gift)** ■ Activates after landing 6 normal attack(s) without hitting the core. Affects self.
  - EXP: ATK ▲ 1.81%, stacks up to 100 time(s) continuously.
  - ■ Activates when hitting the Core for 3 time(s). Affects self.
  - EXP: ATK ▲ 1.81%, stacks up to 100 time(s) continuously.
  - ■ Activates when Hero Level is 2 or above. Affects self.
  - Elemental Advantage Attack Damage ▲ 7.46% continuously.
- **Burst (Extermination)** ■ Affects all Water Code allies.
  - Attack Damage ▲ 10.14% for 10 sec.
  - Elemental Advantage Attack Damage ▲ 18.75% for 10 sec.
  - ■ Affects 1 enemy unit with the highest final Max HP.
  - Deals continuous damage equal to 20.87% of the final ATK × Hero Level every sec for 10 sec.

---

## 2. What the code does (override + blind re-derivations)

**The modeling abstraction (read first).** gws builds a "Hero Level" currency: EXP +1 per 3 core hits, 10 EXP =
+1 level, cap 11. The override COLLAPSES the level ramp to its **level-11 steady state** — every "× Hero Level"
magnitude is pinned at ×11 (auras 1.16×11 = 12.76 / 0.91×11 = 10.01% → flat casterAtkPct; burst DoT 20.87×11 =
229.57%/tick). This is a deliberate, owner-validated, **measured-accurate** model (kit-status residual: "burst DoT

- Hero-Level auras measured accurate"); the ramp TRAJECTORY is carried as ⚑3 with a refit recipe.

**skill1** — three blocks:

- `passive` → `alliesOfElement Water` → `elemAdvantageDamagePct 12.76` + `casterAtkPct 10.01` (the latter resolves
  to a FLAT add of 10.01% of GWS's staticAtk, ≈12048.74 in the fixture — NOT target-scaled `atkPct`). Scope is
  Water-Code allies INCLUDING self (gws + helm in the control comp; liter/crown excluded — proven two-sided).
- `hitCount 30` → `self` → `instantReload 0.1026`, **gated `resourceGate{heroLevel max 10}`**.
- `hitCount 30` → `self` → `heal` (event-only, no HP pool), **gated `resourceGate{heroLevel max 10}`**.
- `hitCount 30` → `self` → `resource heroLevel +1` (the increment; ordered AFTER the two reward blocks).

**The level-cap (the gotcha the judge caught, now fixed).** The kit bounds the level-up rewards: S2 caps EXP at
100, S1 levels per 10 EXP → 100/10 = **10 level-ups = Level 1→11 = the stated cap**, so there is no 11th reward.
The original parser-baseline shipped the rewards as UNCAPPED `hitCount 30` blocks (~56 firings over 180s = 5.6×
too often; the note even claimed "rewards KEEP TRIGGERING at max level (review-confirmed)" — unsupported). The fix
declares `resources: [{name:'heroLevel', initial:1, min:1, max:11}]`, increments it once per level-up, and gates
both reward blocks at `heroLevel ≤ 10`. Because the engine fires blocks in array order and applies each block's
effects before the next, the gated rewards read the PRE-increment value → they fire while heroLevel ∈ {1..10} =
**exactly 10 firings** (verified: DBG resource log shows 10 increases, 1→2 @2.62s … 10→11 @27.97s, clamped
thereafter). This is the exact encoding BOTH blind agents independently specified (S6 `resourceGate{max 10}`, S2b
"rewards stop firing at cap"). Carry impact: 1881→1846 shots, 269.7M→266.2M (−1.30%).

**skill2** — two blocks:

- `hitCount 3` → `self` → `atkPct 1.81 maxStacks 100` (permanent; the engine ramps the stack natively to +181% at
  cap). This is the EXP ATK stack — the core-hit branch (3 core hits → +1 EXP). The 6-non-core-hit branch is folded
  into this blended cadence (⚑2): the engine resolves core as a per-shot RATE, not discrete core/non-core hit
  events, so a hitCount trigger cannot be routed to exactly one of two branches (authoring both would double-count
  EXP). All three blind agents hit this same engine wall and flagged it rather than silently picking a branch.
- `passive` → `self` → `elemAdvantageDamagePct 7.46` (the "Hero Level 2+" line, modeled passive — level 2 is reached
  ~3s in, so the opening over-credit is ~0.07% of carry; self-only, helm never holds it).

**burst** — two blocks:

- `burstCast` → `alliesOfElement Water` → `attackDamagePct 10.14` + `elemAdvantageDamagePct 18.75` (10s). Keyed
  `burstCast` (fires only on rotations gws casts), NOT `fullBurstEnter` — the canonical trap the S2b reviewer named
  as its top misread candidate, live in this fixture because helm is a SECOND Burst III (fullBurstEnter would
  over-fire on helm's rotations).
- `burstCast` → `enemy` → `dot atkPct 229.57` (= 20.87×11), durationSec 10, intervalSec 1 (10 ticks per cast, burst
  bucket, FB by tick timing, crit at the DOT_CRIT default off). The first burst lands early (~5s, at ~Hero Level
  2-3), so its DoT is over-credited at the level-11 magnitude; later ~40s-CD bursts genuinely reach level 11 (⚑3).

**Cross-family re-derivations.** All three blind models (fable S2b, opus S5, opus S6) independently re-derived the
kit from prose alone and converged on EVERY faithfulness judgment: casterAtkPct-as-flat (not atkPct), Water-scope
including self (excludeSelf false), burstCast-not-fullBurstEnter, DoT 20.87×Level / 10 ticks / FB-by-timing /
crit-off, heal as event-only, instantReload as weapon-state/damage-relevant, EXP atkPct 1.81 cap-100 self permanent,
and the EXP-cadence-merge ⚑. The S6 blind override (opus) reproduced all 12 lines and even specified the level-cap
the driver had missed. The ONE place all three blind models diverged from the driver — encoding the level ramp as a
live resource pool vs the driver's level-11 steady-state collapse — the judge ruled FAITHFUL-as-calibrated (the
magnitudes are the kit's own per-level values × the kit's own cap, contradicting no prose number; the divergence is
the ramp trajectory, a documented ⚑ with a measured-accurate residual).

---

## 3. Verdict & cross-family convergence

🟢 **GO**, faithfulness **1.0** (all 12 kit lines FAITHFUL or DOCUMENTED_GAP). Binding judge (claude-opus-5):
0 silent drops, 0 real gotchas remaining (the one REAL-GOTCHA — uncapped level-up rewards — was found on the first
pass and fixed), fire-rate check PASS, discrimination check PASS.

**First pass: NO-GO(faithfulness) 0.75.** The judge ruled FOR the driver on the steady-state-collapse crux but
NO-GO'd the uncapped level-up rewards (REAL-GOTCHA, med): the rewards fired ~56× instead of the kit-permitted 10×,
the note asserted the opposite as "review-confirmed," and no assertion in either suite bounded the cadence
(discriminationOk false). **Fix (retry 1):** the heroLevel resource pool + resourceGate{max 10} cap (the exact
encoding both blind agents specified) + a discriminating uncapped-counterfactual assertion (G2: `gwsNoGate` strips
the gates → shipped shots AND damage must be strictly less) + note corrections. **Re-judge: GO 1.0, discriminationOk
true** — three independent evidence lines agree the cap is live at exactly 10 (block-order argument, DBG resource
log, carry movement).

**The pristine blind test (S5)** went **14 passed / 2 failed / 2 skipped** vs the fixed override (was 13/3/2 before
the cap fix — the new heroLevel pool flipped blind T9 green). The 2 remaining REDs are both documented
engine/approximation divergences the judge already ruled FAITHFUL/DOCUMENTED_GAP, NOT faithfulness breaks:

- **T10** ("EXP accrues on BOTH the 6-non-core and 3-core paths" + `requiresCore`): the engine cannot partition
  core from non-core per hit — three agents converged on this wall and all flagged it; the driver models the
  scope-lock core branch (⚑2).
- **T12** ("7.46% line is not a t=0 passive"): the BEHAVIOURAL self-only half PASSES (helm never holds 7.46); only
  the structural "not passive" check fails — the driver models it as a passive with level 2 reached ~3s in (~0.07%
  of carry, documented in caveats).

The driver test (`scripts/tests/units/guillotine-winter-slayer.test.ts`) is **18/18 GREEN** with built-in
counterfactual discrimination on every line (noAuras / noReload / noHeal / noGate).

---

## 4. Lines worth a human spot-check (the ⚑ flags)

All are UNMEASURED estimates with a measurement recipe; none blocks the GO (the gauntlet certifies STRUCTURE, not
magnitudes — the unit stays tier MODEL_ONLY until a real fight validates its numbers).

- **⚑1 (TOP, ESCALATED) — normal-fire cadence tuple.** pullsPerSec 12 (datamined rate_of_fire 720) + reloadFrames
  81: the measured residual already reads normal-fire ~26% HOT with these values (12/1.26 ≈ 9.5/s is the arithmetic
  suspect). Owner ruling: do NOT refit by fudge; pin via focus video rounds/min + reload gap, then fix via
  charFixes. NOTE the level-up cadence (and thus the cap timing) now depends on this same shot rate.
- **⚑2 (MEDIUM) — EXP build blend.** Shipped 3 hits/stack (the pure-core branch). The realised core-hit fraction is
  coreExposure × ACR, and ACR < 1 for an AR without hit-rate support, so non-core hits DO occur and the true cadence
  is slower: effective = 1/(c/3 + (1−c)/6) ∈ [3,6] hits/EXP. Consequence: the EXP-stack cap time AND Level-11
  arrival are LATER than the ~28s pure-core estimate, lengthening the ⚑3 over-credit window. **Recipe:** focus
  video, count hits between level-up procs (30 hits/level = pure core branch).
- **⚑3 (LOW) — level-11 steady-state collapse.** The auras are passive full-value from t=0 (no ~25s ramp haircut)
  AND the burst DoT snapshots level 11 on EVERY cast including the first (~5s, at ~Hero Level 2-3 — a ~4×
  over-credit on that one cast's ten ticks; later ~40s-CD bursts genuinely reach level 11). Both are deliberate
  steady-state approximations, measured-accurate per residual. **Recipe (if ever refit):** ramp the auras
  1.16×L / 0.91×L over the level trajectory and snapshot the DoT at cast-time level. **This is the first thing a
  solo footage read should settle** (the first burst's DoT is the single largest quantitative approximation on the
  file).

---

## 5. Residual risk

The first-burst DoT over-credit (⚑3) is the largest single approximation — the judge ranked it #1 on the spot-check
list, noting the fix's own DBG trajectory tightens rather than resolves it (a ~5s first cast is at ~Level 2-3, so
that cast's ten ticks are a ~4× over-credit). The ⚑1 hot normal-fire cadence and the ⚑3 early-peaked ATK ramp may
partially COMPENSATE each other (a hot fire rate and an early-peaked ramp both push damage up early), and both are
unmeasured — a solo focus A/B should settle them together. The two Min-Eff-Range-style unmodelable lines: none here
— every kit line is represented (the non-core EXP branch jointly via the blended hitCount-3 block, ⚑2). The override
certifies STRUCTURE (faithfulness), not magnitudes; it stays tier MODEL_ONLY until a real fight validates its numbers.
