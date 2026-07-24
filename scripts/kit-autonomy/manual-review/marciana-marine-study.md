# marciana-marine-study — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Marciana: Marine Study (`marciana-marine-study`) — Iron · AR · Attacker · Burst III · 40s CD ·
ammo 60 · reloadFrames 81 · chargeFrames 0 · hitsPerShot 1 · Elysion.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (8 FAITHFUL, 3 DOCUMENTED_GAP) ·
**0 real gotchas** · S2b fable, S5/S6/S7 opus converged on all load-bearing lines. 14 driver tests GREEN.

---

## 1. Real kit (data/characters.json — ground truth)

- **S1** ■ Entering Full Burst after this unit uses her Burst Skill → 1 enemy with highest final Max HP:
  3789.25% of final ATK as additional damage; Flagged Target: ATK ▼ 10.56% for 10 sec.
  - ■ When an enemy is neutralized if the target is in the Flagged Target state → 1 random enemy:
    3789.25% of final ATK as additional damage; Flagged Target: ATK ▼ 10.56% for 10 sec.
  - ■ Landing 20 normal attacks against a target in the High-Risk Target state → the target:
    152.68% of final ATK as additional damage.
- **S2** ■ Start of battle, self: Whistle ATK ▲ 32.73% continuously, stacks up to 5 times; Whistle stacks ▲ 4.
  - ■ Every time there are 3 or fewer Raptures present for 5 sec, self: Whistle ATK ▲ 32.73% continuously,
    stacks up to 5 times.
  - ■ Every time there are 6 or more Raptures present for 1 sec: Penguin Emergency Dispatch —
    all enemies 214.36% of final ATK as additional damage; self Whistle stacks ▼ 1.
  - ■ Only when a Rapture appears or is neutralized while there are 5 or fewer Raptures, self:
    Elemental Advantage Attack Damage ▲ 20.41% continuously.
- **Burst** ■ Self: Elemental Advantage Attack Damage ▲ 30.97% for 10 sec; Attack Damage ▲ 27.45% for 10 sec.
  - ■ All Electric Code enemies: High-Risk Target: DEF ▼ 10.56% for 20 sec.

---

## 2. What the code does (override + blind re-derivations)

**Central mechanic — Whistle resource pool:**

Whistle is a named resource pool (initial: 4, max: 5). A passive `perResource` buff reads it live:
ATK ▲ (whistle × 32.73)%. At t=0: 4 stacks = 130.92% ATK. The `interval:5` trigger adds +1 stack at t=5s
(the "≤3 Raptures for 5s" condition is statically true in the solo-raid sim with 1 enemy), reaching the
5-stack cap (163.65% ATK) for the rest of the fight. The "≥6 Raptures" Penguin Dispatch never fires
(never ≥6 enemies), so Whistle is monotone non-decreasing.

**skill1.**

- `fullBurstEnter + ownBurstGate:'cast'` → enemy → `flatDamage 3789.25` + `targetStatus 'Flagged Target' 10s`.
  Fires ONLY on Full Bursts where Marciana cast her own burst (not helm's alternating rotations in the
  two-B3 control comp). The nuke lands INSIDE the FB window → takes the +50% FB major. The Flagged Target
  status is modeled for kit completeness; its ATK▼ content is inert (boss ATK irrelevant in v1).
- `hitCount:20 + requiresTargetStatus:'High-Risk Target'` → enemy → `flatDamage 152.68`. Fires every 20
  cumulative hits while the boss carries High-Risk Target (applied by burst, Electric bosses only). INERT
  on the Fire control boss. ⚑ hitCount counts ALL hits (normal+skill+burst), not normal-only as the kit
  text implies; small over-count for an AR with rare procs; documented.

**skill2.**

- `passive` → self → `perResource whistle atkPct mult:32.73` — the Whistle ATK buff (4 stacks at t=0,
  5 stacks from t=5s).
- `interval:5` → self → `resource whistle delta:+1` — the ≤3-Raptures stack gain (statically true in sim).
- `passive` → self → `elemAdvantageDamagePct 20.41` — the "Rapture appears while ≤5" buff (boss appears at
  t=0, fires once, continuous). Advantage-gated: live only vs Electric boss, inert vs Fire.

**burst** (all `burstCast` — fires only on rotations Marciana bursts, ~every 40s in the control comp):

- `burstCast` → self → `elemAdvantageDamagePct 30.97 10s` + `attackDamagePct 27.45 10s`. The two stats are
  kept distinct (not merged): elemAdvantageDamagePct is advantage-gated (inert vs Fire), attackDamagePct is
  always live.
- `burstCast + bossElementGate:'Electric'` → enemy → `targetStatus 'High-Risk Target' 20s`. Opens the gate
  for S1's 20-hit rider. DEF▼10.56% content is inert at bossDef:0 (scope lock); NOT mis-encoded as
  damageTakenPct (the S2b-warned trap).

---

## 3. Lines worth a human spot-check

**Priority 1 — systematic-prior-prone (scope / duration / trigger-identity):**

1. **S1 nuke trigger identity (ownBurstGate):** the "entering Full Burst AFTER this unit uses her Burst
   Skill" phrasing is the canonical ownBurstGate:'cast' carrier. The two-B3 control comp (marciana + helm)
   is the discrimination: nuke count === marciana's burstCast count, NOT total FB count. Spot-check: does
   the nuke fire on helm's FB rotations? (It should NOT.)

2. **Whistle 4→5 stack ramp timing:** the perResource ramp opens at 130.92% (4 stacks) and reaches 163.65%
   (5 stacks) at t=5s via interval:5. Spot-check: does the real kit reach 5 stacks at t≈5s, or is the
   "≤3 Raptures for 5s" timer measured differently (e.g., from battle start vs from condition-met)?

3. **S2 elemAdvantageDamagePct 20.41 first-fire convention:** modeled as passive (boss spawn = "a Rapture
   appears" at t=0). ⚑ This is a convention, not measured. Spot-check: does the real kit apply this buff
   at t=0 (boss spawn) or only on subsequent Rapture appearances/neutralizations?

**Priority 2 — magnitude / fidelity (measurement-gated):**

4. **hitCount:20 all-hits vs normal-only:** the engine's hitCount counts all hits; the kit says "20 normal
   attacks". For an AR at 720 RPM with rare skill procs the over-count is small. Spot-check: does the real
   152.68% rider fire at ~20 normal attacks or ~20 total hits?

5. **RIDERCRIT default on flatDamage riders:** the override relies on the engine's RIDERCRIT default
   (confirmed ON in sim.ts) for the 3789.25% and 152.68% riders to crit. Spot-check: do the real riders
   show orange (crit) popups?

6. **All magnitudes are DATAMINED kit-literal, unmeasured.** The gauntlet certifies STRUCTURE, not numbers.
   Board validation requires a real fight recording.

---

## 4. Documented gaps (UNMODELED / inert in v1)

- **S1 block 2 (enemy neutralized + Flagged Target):** no enemyNeutralized trigger in the engine; inert
  (boss never dies). Verbatim in `unmodeled.skill1`.
- **S2 Penguin Emergency Dispatch (≥6 Raptures):** no enemy-count trigger; inert (never ≥6 enemies in solo
  raid). Verbatim in `unmodeled.skill2`.
- **DEF▼10.56% on High-Risk Target:** inert at bossDef:0 (scope lock). The targetStatus IS modeled (gates
  S1 rider); the DEF▼ magnitude is not. Documented in caveats.
- **Flagged Target ATK▼10.56%:** boss ATK debuff, inert in damage sim. targetStatus window modeled for
  kit completeness.

---

## 5. Cross-family provenance

| Role | Model | Converged? |
|------|-------|-----------|
| S2b (pre-op reviewer) | claude-fable-5 | ✓ all load-bearing lines |
| S5 (blind test-writer) | claude-opus-4-8 | ✓ (harness-API recon error only, not model disagreement) |
| S6 (blind override-writer) | claude-opus-4-8 | ✓ (Whistle flat-cap vs driver's perResource ramp — driver more faithful) |
| S7 (reconciling judge) | claude-opus-4-8 | GO faithfulness 1.0, 0 REAL-GOTCHAs |

**Same-model residual:** all reviewing agents are Claude (cross-family from the Qwen driver). The shared
blind spot is Claude's systematic-prior-prone lines (scope / duration / trigger-identity). The owner
spot-check items in §3 address these.
