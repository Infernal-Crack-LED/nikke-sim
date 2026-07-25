# brid-silent-track — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check. EXACT SLUG: `brid-silent-track` (Brid: Silent Track) — the SG/Fire variant (aka "bst"/"xbrid"/
> "bridsl"), NOT `brid` (AR/Water).

**Unit:** Brid: Silent Track (`brid-silent-track`) — Fire · SG · Supporter · Burst II · 20s CD · ammo 9 ·
reloadFrames 111 · hitsPerShot 10 pellets · normalAttackMultiplier 201.5 · coreAttackMultiplier 200.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (5 FAITHFUL, 0 silent drops, 0 real
gotchas) · S2b claude-fable-5, S5/S6/S7 claude-opus-5 (all cross-family) converged on every load-bearing line.
The binding judge (opus) adjudicated the single encoding divergence (S2 hitCount granularity) **in the driver's
favour** by two independent routes and ruled all pristine-blind-test REDs as scaffolding/RECON_ERROR.

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Ignition Sequence)** ■ Activates when entering Full Burst.
  - Affects all Wind Code enemies: Damage Taken ▲ 15.12% for 10 sec.
  - Affects all enemies: Deals 636% of final ATK as damage.
- **S2 (Journey Ahead)**
  - ■ Activates after 10 normal attack(s). Affects 1 Wind Code enemy unit(s) with the lowest remaining HP:
    Damage Taken ▲ 12.12% for 10 sec.
  - ■ Activates after 5 normal attack(s). Affects 1 enemy unit(s) with the lowest remaining HP:
    Deals 675% of final ATK as damage.
- **Burst (Full Throttle)** ■ Affects all allies (except self).
  - ATK ▲ 66.52% of the skill user's ATK for 10 sec.

---

## 2. What the code does (override + blind re-derivations)

**skill1** — two independent `fullBurstEnter` blocks (the kit deliberately pairs a Wind-scoped debuff with an
ungated "all enemies" damage line inside the same skill):
- `fullBurstEnter` + `bossElementGate:'Wind'` → `enemy` → `damageTakenPct 15.12` (10s). Boss-side Taken bucket,
  team-wide amp; element scope composed WITH the event trigger, not replacing it. INERT vs the non-Wind scope-lock
  boss; live vs a Wind boss.
- `fullBurstEnter` → `enemy` → `flatDamage atkPct 636`. Function-type rider: crits at caster rate, no core (no
  "core strike" text), noRange, takes the +50% FB major BY LANDING TIME (lands at FB enter ⇒ `fbMajorApplied` true).

**skill2** — two independent `hitCount` blocks at DIFFERENT thresholds (deliberately NOT merged):
- `hitCount` count 100 + `bossElementGate:'Wind'` → `enemy` → `damageTakenPct 12.12` (10s). "10 normal attacks" =
  10 pulls; the engine increments the hit counter by `hitsPerShot` (10) per shot (sim.ts ~2898), so the threshold
  is 100, firing every 10 shots.
- `hitCount` count 50 → `enemy` → `flatDamage atkPct 675`. "5 normal attacks" = 5 pulls = threshold 50. MEASURED
  on the 2026-07-16 solo read: 43 riders = floor(215 pulls/5) EXACTLY, fired ~6 frames after the 5th pull, popup
  values 673,819 / 1,010,728 = exactly 675.00% of the measured effective ATK term. Crit yes, core no, FB by timing.

**burst** — `burstCast` → `allies` `excludeSelf:true` → `casterAtkPct 66.52` (10s). "X% of the skill user's ATK"
is a caster-scaled FLAT add (0.6652 × Brid's staticAtk) outside the recipients' ATK% sum — NOT target-scaled
`atkPct`. `excludeSelf` (datamine `prefer_target_condition: ExcludeSelf` corroborates) keeps Brid off her own
target set. This is her meta-defining line: her VALUE is the team casterAtk buff, not her own SG-capped damage.

**Cross-family re-derivations:** S6 blind (opus, leakDetected:null) reproduced ALL 5 blocks from prose alone —
skill1 (Wind-gated 15.12 + ungated 636, block order swapped only), skill2 (12.12 Wind-gated + 675 rider), and burst
(burstCast/allies-excludeSelf/casterAtkPct 66.52/10s) — IDENTICAL to the driver except the skill2 hitCount counts
(blind 10/5 reading "normal attack" as ROUNDS; driver 100/50). The blind author EXPLICITLY FLAGGED this: "If the
engine counts PELLET hits, both blocks fire 10× too often (huge over-credit). Must be confirmed against sim.ts
hitCount accounting." It resolves to the driver: sim.ts advances the counter by hitsPerShot per shot, so 5/10 pulls
NECESSARILY mean threshold 50/100 — AND the solo read measured every-5th-pull independently. The blind's 5/10 would
fire ~10× too often, the largest quantitative trap on this unit.

---

## 3. Verdict & cross-family convergence

🟢 **GO**, faithfulness **1.0** = 5 FAITHFUL / 5 total. Binding judge (claude-opus-5): 0 silent drops, 0 real
gotchas, fire-rate check PASS, discrimination check PASS (every FAITHFUL line is GREEN vs shipped AND RED vs its
nearest-wrong counterfactual: ungated Wind-debuff leak, removed 636%/675% riders, pellet-misread hitCount,
includes-self burst, 100%-caster magnitude reference). S2b (fable) converged on all 5 lines and named the same
discriminations (pellet-vs-round counting as the biggest trap, element-gate bleed both directions, casterAtkPct
flat-resolve, excludeSelf, fullBurstEnter-vs-burstCast).

**The pristine blind test (S5) was RED only at the file level + 3 scaffolding respects**, none touching driver
faithfulness: (1) harness import path (blind guessed `../lib`; harness is at `scripts/tests/lib`); (2) its "double
the threshold" counterfactual set an ABSOLUTE hitCount 10 assuming a count-5 baseline — vs the driver's measured
count-50 that fires 5× MORE not half (adapted to double the driver's actual count, 50→100, preserving intent);
(3) `controlComp(SLUG,true)` = liter/crown/brid/helm — crown (also B2) wins the cast slot so Brid never bursts and
the burst-buff assertions fail vacuously (adapted to a sole-B2 comp liter/brid/ada/helm); plus (4) a 636:675
max-AMOUNT ratio that wrongly assumed buff state cancels between the two riders (adapted to the buff-state-free
`atkPct` field). With those corrected and assertion INTENT unchanged (pristine preserved at
`blind/brid-silent-track.test.ts`, adapted copy at `blind/brid-silent-track.adapted.test.ts`), the blind test goes
**13 passed / 1 skipped / 0 failed** vs the shipped override (the skip = the Wind-boss ACTIVE case the blind author
`it.skip`'d for lack of a boss-element fixture knob; the DRIVER test covers it directly with a Wind-boss run).

---

## 4. Lines worth a human spot-check (the ⚑ flags)

All UNMEASURED estimates with a measurement recipe; none is load-bearing for the GO (her kit lines are all modeled
and the 675% rider is independently measured).

- **⚑a (MEDIUM) — SG cadence tuple.** pullsPerSec datamine not supplied + reloadFrames 111 datamine; SG default
  rate, ammo 9 empties in >1s so no fire-mode escalation. Sets HOW OFTEN the every-5 / every-10 blocks fire.
  **Recipe:** read rounds/min + reload gap from a focus video.
- **⚑b (RESOLVED-by-measurement, residual convention) — SG "normal attack" = SHOT vs PELLET.** Shipped the standard
  SHOT reading (5 NA = 5 shots = hitCount 50; 10 NA = hitCount 100); confirmed by the engine's hitsPerShot counter
  AND the measured every-5th-pull cadence. If a future popup count disagreed, divide by 10. **Recipe:** count shots
  between 675% popups in a focus video.
- **⚑c (HIGH, magnitude-only) — SG spray under-model.** Her OWN SG spray/core damage is low-confidence (~1.5× under
  per noir/dorothy anchors); a magnitude debt on the weapon model, NOT a missing kit line, and out of this gate's
  scope. **Recipe:** SG-clean-anchor re-derivation (open fix #2).
- **⚑d (CONDITIONAL) — Wind-Code debuffs off by default.** Both Damage-Taken debuffs are inert vs a non-Wind
  (incl. scope-lock) boss; vs a Wind boss they become active team-wide damageTaken amps (a big lever). **Recipe:**
  confirm boss element; if Wind, both fire (15.12% FB-enter + 12.12% per-10-NA) — already modeled via bossElementGate.
- **⚑e (LOW) — noFb on the 636%/675% riders.** Default OFF (FB by timing); set noFb:true ONLY with measured FB-OFF
  popups. **Recipe:** focus popup value FB-on vs FB-off.

---

## 5. Residual risk

The "lowest remaining HP" single-target selector on both skill2 lines is indeterminate (no HP pool in v1) and
collapses to the sole partless boss — documented in the override caveats, no line dropped. The two Wind-gated
Damage-Taken debuffs are inert on every graded (non-Wind) comp today; they awaken as a team-wide amp vs a Wind boss
(modeled, ungraded). ⚑c (SG spray magnitude) is the standing magnitude debt — it caps confidence in her OWN damage
total but not in her kit STRUCTURE or her team-facing buff, which is her real value. The override certifies
STRUCTURE (faithfulness 1.0); it stays tier MODEL_ONLY (not board-measured) until a real fight validates magnitudes.
