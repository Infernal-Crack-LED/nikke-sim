# cinderella-crystal-wave — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Cinderella: Crystal Wave (`cinderella-crystal-wave`, aka "ccw"/"scindy") — Iron · MG · Attacker ·
Burst III · 40s CD · ammo 300 · reloadFrames 171 · chargeFrames 0 · hitsPerShot 1 · Pilgrim. **VARIANT** of the
base `cinderella` (RL/Defender/Electric, "cindy") — an entirely different unit.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (16/16 lines: 12 FAITHFUL + 4
DOCUMENTED_GAP) · **0 surviving gotchas** (2 low-severity gotchas found by the judge were FIXED on the text) ·
S2b fable + S5/S6/S7 opus (cross-family) converged on all load-bearing lines.

---

## 1. Real kit (data/characters.json — ground truth, lvl-10 values)

- **S1** ■ Snipe Mode (on reload-to-max while holding Preparation for Change): weapon swap — 62.13% of final
  ATK/shot, 1s charge, 250% full-charge damage, 15-round mag, +Pierce, each full charge expends 40 rounds.
  - ■ Beauty-Full (battle start): Attack Damage ▲ 24% continuously.
  - ■ Preparation for Change (reload-to-max): reload fixed 3 sec for 6 sec, removed on last bullet.
  - ■ Every 5 sec: nearest enemy, 900% of final ATK as damage.
  - ■ Each time total ally ammo consumed reaches 200: all allies fill Burst Gauge 12%.
- **S2** ■ Decoy (battle start / burst): avatar with 70.34% of final Max HP, continuous.
  - ■ ATK ▲ 29% continuously.
  - ■ Destroy (Snipe Mode): Damage to Parts ▲ 26.21% continuously; removes Pinpoint.
  - ■ Pinpoint (battle start / Snipe removed): Damage to core ▲ 26% continuously; removes Destroy.
  - ■ Entering Full Burst AFTER this unit uses her Burst — by current mode (one applies):
    - Snipe Mode → all enemies (incl. parts): 1189.66% of final ATK as damage.
    - Not Snipe → cored enemies: 833.79% of final ATK as **core strike** damage.
- **Burst** ■ Self: Attack Damage ▲ 92% + ATK ▲ 65% for 10 sec.
  - ■ Highest-final-ATK enemy: 6000% of final ATK as Burst Skill damage.

---

## 2. What the code does (override + blind re-derivations)

The override is **mode-selectable** (`modes: ["MG","Snipe"]`, MG default = the validated path). Modeless blocks
apply in both modes; `mode:"MG"`/`mode:"Snipe"` blocks apply only in that mode.

**skill1.**
- `passive` self `attackDamagePct 24` (Beauty-Full, continuous — Damage-Up bucket).
- `interval(sec:5)` enemy `flatDamage 900` (the every-5s hit — **function flavor**: crit at sheet rate, never
  core, no range, +50% FB by landing timing; first fire at t=5s). *[gauntlet gotcha-2 fix: re-encoded from the
  `dot` primitive to the engine `interval` trigger that matches the kit wording.]*
- `teamAmmo(count:200)` allies `fillGauge 12%` (team burst-gauge top-up — same primitive Little Mermaid uses).
- `mode:"Snipe"` `weaponSwap` (62.13%/shot, chargeTimeSec 1, chargeMultPct 250, maxAmmo 1) + `pierceModes:["Snipe"]`.

**skill2.**
- `passive` self `atkPct 29` (continuous — ATK bucket).
- `mode:"MG"` `passive` self `coreDamagePct 26` (Pinpoint).
- `mode:"Snipe"` `passive` self `partsDamagePct 26.21` (Destroy; inert vs the partless boss). The mode partition
  makes Pinpoint/Destroy provably non-simultaneous — the kit's "removes Pinpoint/Destroy" mutual exclusion.
- `fullBurstEnter` + `ownBurstGate:"cast"` enemy `flatDamage 833.79 core:true` (`mode:"MG"`, core strike) and
  `flatDamage 1189.66 core:false` (`mode:"Snipe"`, plain damage). *[gauntlet gotcha-1 fix: the Snipe branch was
  core:true; corrected to core:false to match its "as damage"/"including parts" text — only the MG branch says
  "as core strike damage". Both blind roles independently derived this split.]*

**burst.**
- `burstCast` self `attackDamagePct 92` + `atkPct 65` (10s — two distinct buckets, one per cast).
- `burstCast` enemy `flatDamage 6000` (FB-exempt: burst-cast damage lands before the FB window, never takes the
  +50% major; engine-forced, asserted from the event log).

**UNMODELED (inert; documented in override `unmodeled`):** Preparation-for-Change reload bookkeeping (reload
fixed 3s — a stat CLAMP with no primitive, and inert to damage); Decoy avatar (defensive; v1 boss deals no
damage). Pierce is modeled (`pierceModes`) but inert vs the partless boss.

**codeDrivenSurprises (from the blind re-derivations):**
- The FB-enter rider is **own-burst-gated**: it fires only on Full Bursts THIS unit's burst opened (6× in the
  control comp), not on the co-B3 helm's Full Bursts (which would make 12×). This is the single highest-leverage
  line — all three blind roles independently derived `fullBurstEnter + ownBurstGate:'cast'`.
- The MG (833.79) and Snipe (1189.66) FB riders have **different core eligibility**: MG is a core strike
  (core:true), Snipe is plain damage (core:false). The prose distinguishes them ("as core strike damage" vs "as
  damage"/"including parts").
- The mode partition is MORE faithful than a naive encoding: a blind role that modeled Pinpoint as unconditional
  self-flagged the resulting Snipe-window over-credit; the driver's mode-gating avoids it.

---

## 3. Driver's executive summary

Cinderella: Crystal Wave is **faithfully modeled** (gauntlet verdict GO, faithfulness 1.0, 0 surviving gotchas,
cross-family corroborated). The validated **MG path** (the graded comps, boss core 100% exposed) is fully
faithful and behaviorally verified: Beauty-Full 24% (Damage-Up), ATK 29%, Pinpoint coreDamagePct 26, the
900%/5s interval hit (function flavor, first fire t=5s), the teamAmmo-200 → 12% gauge fill (measurably advances
a teammate's burst cadence), the burst self-buffs 92/65 for 10s (one per own cast), the 6000% FB-exempt nuke,
and the centerpiece FB-enter rider 833.79% core-strike with `ownBurstGate:'cast'` + `fullBurstEnter` (keeps the
+50% FB major) + `core:true`.

The gauntlet found **2 low-severity board-inert gotchas** (both on the non-validated Snipe alternate path) and
**fixed both on the text**: (1) the Snipe 1189.66% FB rider's `core:true` → `core:false` (its prose reads plain
"as damage", not "core strike"); (2) the every-5s 900% line re-encoded from the `dot` primitive to the engine
`interval` trigger (function flavor, exact 5s cadence). The judge re-graded the fixed artifacts at **1.0**.

**How it was validated:** driver tests (27 assertions, GREEN vs shipped override, counterfactuals that provably
diverge — ungated rider 12× vs gated 6×, burstCast loses the FB major, core:false loses the core bucket,
removals drop the total, mode-flip swaps Pinpoint/Destroy + rider + weapon) → cross-family adversarial reviewer
(fable, 14 load-bearing lines, converged) → cross-family blind test-writer + override-writer (opus, both
leak-aware, converged) → cross-family reconciling judge (opus, GO @ 0.875 → re-graded GO @ 1.0 after the fixes).
All blind roles ran on a DIFFERENT model family than the Qwen driver, ruling out both idiosyncratic and
systematic shared-prior error on the load-bearing lines.

---

## 4. Owner spot-checks (the honest residual)

This GO is **cross-family corroborated** (S2b fable + S5/S6/S7 opus vs the Qwen driver). The strongest
independent signal is the fable S2b agreement (a different model family than the opus blind roles). Residual,
**all confined to the non-validated Snipe alternate path** (graded sample is MG, core 100%):

1. **Snipe maxAmmo (FLAG 3)** — modeled as 1 (Additional Effect 2 expends 40 rounds per full-charge shot vs the
   listed 15-round mag → clamp-to-empty → one shot per reload cycle). If the 40-round expend draws from a
   separate pool, maxAmmo should be 15. A genuine kit-internal contradiction; both readings + a measurement
   recipe are recorded. This is the SOLE remaining blind-test RED (classified DOCUMENTED_GAP, not a defect).
2. **Snipe entry/exit state machine (FLAG 2)** — the kit enters/exits Snipe via a double-reload-to-max inside
   the 6s Preparation window; the override approximates this as a static user-selectable mode with 100% uptime
   for the chosen mode. Real Snipe has MG ramp-in/out segments, so 100% uptime slightly over-credits the Snipe
   path; the graded MG path is exact (she stays in MG).
3. **Preparation-for-Change reload clamp** — "reload fixed 3s for 6s" is a stat CLAMP with no engine primitive
   (and is a slight SLOWDOWN: base reload is 171f ≈ 2.85s). Inert to damage; documented as UNMODELED. The status
   is also the Snipe-entry gate (carried under FLAG 2).
4. **Measurement-gated magnitudes** — 24 / 29 / 26 / 26.21 / 900 / 833.79 / 1189.66 / 92 / 65 / 6000 / 62.13 /
   250 match the prose exactly but are not independently re-measured; the gauntlet certifies STRUCTURE, not
   numbers.
5. **Board:** ccw reads **0.970 (OK, MAD 0.030, ±3% ✓)** across 2 graded comps (T5 wind-weak 0.96 / T8 iron-weak
   0.98). The MG-path fixes were board-inert (<0.1% total delta), so the board is unchanged.
