# red-hood — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check. EXACT SLUG: `red-hood` (Red Hood) — the Pilgrim SR/Iron Λ-burst Attacker (aka "rh"), **NOT**
> `rapi-red-hood` (Rapi: Red Hood — an entirely different unit, board rank 19).

**Unit:** Red Hood (`red-hood`) — Iron · SR · Attacker · **Λ (Lambda) burst** · 40s CD · ammo 6 ·
reloadFrames 141 · chargeFrames 60 · hitsPerShot 1 · normalAttackMultiplier 69.04 · coreAttackMultiplier 200 ·
chargeMultiplier 250 · burstGaugePerShot 2.8.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (9 FAITHFUL, 5 DOCUMENTED_GAP) ·
**0 silent drops, 0 real gotchas** · S2b claude-fable-5, S5/S6/S7 claude-opus-5 (all cross-family) converged on
every load-bearing line. The binding judge (opus) independently confirmed both pristine-blind-test REDs as
RECON_ERROR — verifying RED#1 against the repo's OWN SSOT (game-mechanics.md §4 names this exact kit line and
defines the excess as Charge Speed past the +100% **cap**, refuting the blind's 241.92/333.36 and ruling the
driver's zero-out-of-burst behaviour correct; the blind's always-on 36.6 passive limb is the over-credit).

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

Red Hood is the game's only **Λ burst** unit: she can fill any burst slot, and her burst does something
different depending on which STEP she casts (the generator force-pins her to B3; her internal step advances
1→2→3 across successive casts).

- **S1 (Glaring Eyes)**
  - ■ on normal attack → self: **Charge Speed ▲3.81%**, ×10 stacks, 5 sec.
  - ■ at battle start → self: **convert Charge Speed excess over 100% to Charge Damage, ▲240% of the excess
    continuously.**
- **S2 (Wild Tooth)**
  - ■ at battle start → self: **Gain Pierce continuously.**
  - ■ during Beast Cage → all allies: DEF ▲50.68% of caster DEF, 10 sec. *(defensive)*
  - ■ during The Last Howl → self: recover 23.04% of attack damage as HP over 10 sec. *(lifesteal)*
  - ■ on casting Red Wolf → self: **ATK ▲71.42% for 10 sec.**
- **Burst**
  - **Step 1 (Beast Cage)** → all allies: **ATK ▲77.55% of caster ATK, 10 sec** + self: **Burst CD ▼40 sec,
    once per battle.**
  - **Step 2 (The Last Howl)** → self: Attract (taunt) 10 sec + Incoming healing ▲74.88% 10 sec + **Burst CD
    ▼40 sec, once per battle.** *(defensive)*
  - **Step 3 (Red Wolf)** → self: **weapon swap — Damage 51.46% of final ATK, Full Charge 250%, 10 sec** +
    Expand Pierce range 100% 10 sec + **Charge Speed ▲100.8% 10 sec.**

## 2. What the sim implements (src/skills/overrides/red-hood.json)

| Kit line | Encoding | Status |
| --- | --- | --- |
| S1 Charge Speed ▲3.81% ×10 / 5s | `skill1` hitCount{1} → self buff `chargeSpeedPct` 3.81, dur 5, maxStacks 10 | FAITHFUL (R1) |
| S1 excess-CS→Charge-Damage 240% | static `chargeDamagePct` 90, gated on burstCast stage 3, self, 10s | **DOCUMENTED_GAP ⚑** (R2) |
| S2 Gain Pierce continuously | top-level `hasPierce: true` (whole-fight, no duration) | FAITHFUL (R3, damage-inert vs single boss) |
| S2 DEF ▲50.68% (Beast Cage, allies) | — | UNMODELED (inert; no casterDefPct, defPct v1-inert) |
| S2 lifesteal 23.04% (Last Howl) | — | UNMODELED (inert; no HP pool — see spot-check #2) |
| S2 Red Wolf ATK ▲71.42% 10s | burst stage-3 → self buff `atkPct` 71.42, dur 10 | FAITHFUL (R4) |
| B1 Beast Cage team ATK ▲77.55% of caster | burst stage-1 → allies buff `casterAtkPct` 77.55 (flat-resolved), dur 10 | FAITHFUL (R5) |
| B1 Burst CD ▼40s once/battle | burst stage-1 → self `burstCdr` 40 oncePerBattle | FAITHFUL (R7) |
| B2 Taunt / Incoming healing ▲74.88% | — | UNMODELED (inert; no aggro/HP primitives) |
| B2 Burst CD ▼40s once/battle | burst stage-2 → self `burstCdr` 40 oncePerBattle | FAITHFUL (R7) |
| B3 Red Wolf weapon swap 51.46% / 250% / 10s | burst stage-3 → self `weaponSwap` {damagePct 51.46, chargeMultPct 250, durationSec 10, chargeTimeSec 0.3} + `unlimitedAmmo` 10s | FAITHFUL (R6) |
| B3 Expand Pierce range 100% | — | UNMODELED (inert; pierce is a boolean tag, single partless boss) |
| B3 Charge Speed ▲100.8% 10s | folded into the swap's `chargeTimeSec` 0.3 (instant charge → fire-rate-gated 18f cadence) + arms the conversion | FAITHFUL (R6/R2; equivalent encoding) |

**Deep-dive (owner-confirmed 2026-07-20):** Red Wolf swap economy decoded from game data (skill 1470610 +
weapon 1047002): rate_of_fire 200 rpm → exactly **1 shot/18 frames (0.3s)** regardless of charge speed (the
+100.8% CS makes charge instant; cadence is fire-rate-gated), **infinite ammo** (max_ammo 99), **~33
shots/window**. Her base SR OUTSIDE Red Wolf is bolt-action (the engine's +22f SR default stands).

## 3. Cross-family convergence

- **S2b (claude-fable-5, pre-op test review):** 10 load-bearing lines, 9 FAITHFUL + the conversion flagged
  (mechanism converged; fable independently re-derived the warm **93.36 = (138.9−100)×2.4** the driver note
  already documents). Lifesteal flagged for a tandem recovery channel (recorded as a residual, see #2).
- **S5 (claude-opus-5, blind test):** pristine blind test vs driver override = **28 passed / 2 failed / 6
  skipped**. Both REDs adjudicated **RECON_ERROR** (not REAL-GOTCHA): (1) the blind mis-read the excess-over-100
  threshold (expected a separate ~241.92/333.36 tier; faithful excess is the single warm value 93.36, driver
  ships 90; the blind's sibling assertion band [40,110]~91.44 PASSED with 90); (2) the blind expected an
  explicit `chargeSpeedPct` 100.8 buff where the driver folds it into the swap cadence (equivalent encoding).
  Adapted copy (2 intent-preserving corrections) = **30 passed / 6 skipped / 0 failed = convergence GREEN**.
- **S6 (claude-opus-5, blind override):** reproduced every load-bearing encoding (CS-stacks, hasPierce,
  atkPct 71.42 stage-3, casterAtkPct 77.55 all-allies flat-resolved, weaponSwap 51.46/250, the two per-step
  burstCdr refunds, all UNMODELED inert lines). Its only divergence is the conversion encoding (two limbs:
  passive 36.6 + Red Wolf rider 241.92) — the same threshold-reading ambiguity, both limbs self-flagged ⚑.
- **S7 (claude-opus-5, binding judge):** **GO, faithfulness 1.0.** Confirmed both REDs as RECON_ERROR
  independently (RED#1 vs the repo SSOT). Flagged two items, **both addressed before landing**: (a) a LOW
  bookkeeping defect — the conversion was double-entered as both modeled AND unmodeled — fixed by moving it out
  of `unmodeled.skill1` into a clarifying caveat (no number change); (b) a discrimination gap — the burstCdr
  refunds had no removal counterfactual — fixed by adding **R7** (removing both refunds lowers her total and
  collapses the early 1→2→3 chain). Driver test now **20 passed**; adapted blind re-verified **30/6/0** green.

## 4. Lines worth a human spot-check (the ⚑ flags + residuals)

1. **⚑ S1 excess-CS→Charge-Damage conversion (the one measurement-gated line).** Modeled as a static
   `chargeDamagePct` 90 in the Red Wolf window. Mechanism exact (excess over the +100% cap × 2.4); the magnitude
   is an unmeasured point estimate — warm value **93.36 = (138.9−100)×2.4** (driver + fable converged), shipped
   as the conservative stack-ramp average 90. Out of burst her total CS (38.1) is below the 100 cap, so the
   faithful excess there is **zero** (the driver's zero-out-of-burst is correct; the blind's always-on 36.6 limb
   is the over-credit). **This is the most plausible home of the unit's known COLD ~0.867 residual.**
   **Recipe:** full-charge popup pair INSIDE vs OUTSIDE Red Wolf, holding ATK constant and backing out
   damagePct 51.46 / chargeMultPct 250 / atkPct 71.42; the residual isolates the charge-damage delta → solve for
   the implied conversion. NOT fudged to 93.36 (MEASURED>FUDGE).
2. **Lifesteal tandem recovery channel (S2/The Last Howl, 23.04%).** UNMODELED — no HP pool, moves zero of her
   own damage. **Both blind agents independently asked for it to emit recovery events** feeding an on-recovery
   consumer (Crown-style). Harmless today (no such consumer is fielded alongside a step-2 Red Hood), but it is
   the one deliberate omission two independent re-derivations both flagged. Worth wiring if an on-recovery
   teammate is ever fielded with a step-2 Red Hood.
3. **burstCdr once-per-battle sharing (Steps 1 & 2).** Declared reading: two **independent** per-step
   once-per-battle refunds (the prose prints "Activates once per battle" separately under each step). The
   shared-flag alternative is prose-ambiguous; the engine emits no burstCdr event, so the reading is proven by
   its rotation effect (R7), not directly.
4. **Same-model caveat.** Every agent in this chain is Claude (S2b is fable, but S5/S6/S7 are opus). All
   converged on treating the S1 conversion as a static Red-Wolf-gated stand-in; the 90/93.36 split is the only
   open quantity and it is measurement-gated, not a modelling disagreement.

**Board:** rank 10, score **0.968** (COLD ▼, range 0.93–1.01, ±5%/±1.1%). Unchanged by this gauntlet (no number
change — bookkeeping + test additions only).
