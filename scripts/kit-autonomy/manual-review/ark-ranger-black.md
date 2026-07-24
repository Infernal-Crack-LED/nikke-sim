# ark-ranger-black — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Ark Ranger Black (`ark-ranger-black`) — Wind · AR · Attacker · Burst III · 40s CD · ammo 60 ·
reloadFrames 81 · chargeFrames 0 · hitsPerShot 1 · Tetra.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (7 FAITHFUL, 3 DOCUMENTED_GAP) ·
**0 real gotchas** · S2b fable+opus, S5/S6 opus, S7 opus+fable (cross-family ×2) converged on all
load-bearing lines. S5 blind tests GREEN unmodified vs driver's override.

---

## 1. Real kit (data/characters.json — ground truth)

- **S1** ■ Start of battle, self: Damage to Parts ▲ 20% continuously.
  - ■ Ally/self destroys enemy part, self: Charges battery by 50% continuously, up to 100%.
  - ■ Battery reaches 100%, self: **Transformation** — ATK ▲ 156.19% continuously; Battery ▼ 1% every 0.2s;
    deactivates when battery = 0%.
  - ■ After 30 normal attacks, self: Sustained Damage ▲ 59.6% for 5 sec.
- **S2** ■ Transformation takes effect / enemy appears while transformed, all enemies: **Ark Black Collider** —
  45.87% of final ATK as sustained damage every 1s until Transformation is canceled.
  - ■ Entering Full Burst, all Wind Code allies with ARs: Sustained Damage ▲ 77.5% for 10 sec.
- **Burst** ■ While in Transformation, self: Battery ▲ 50%.
  - ■ While NOT in Transformation, self: **Emergency Charge Protocol** — Battery ▲ 100%, then Battery ▼ 50%
    after transforming.
  - ■ 1 enemy with highest final max HP: 266.69% of final ATK as sustained damage every 1s for 10 sec.
  - ■ Self: Sustained Damage ▲ 135.83% for 10 sec.

---

## 2. What the code does (override + blind re-derivations)

**Central mechanic — battery/Transformation state machine:**

The kit's battery resource has NO part-destruction source on the partless scope-lock boss (S1 L2 never fires).
The ONLY battery input is the burst's Emergency Charge Protocol: Battery ▲100% → Transformation activates →
Battery ▼50% → net 50% remaining → drains at 1%/0.2s = 5%/s → Transformation lasts **10s** (50% ÷ 5%/s).
Burst CD 40s ≫ Transformation 10s, so the "while in Transformation: Battery ▲50%" burst branch NEVER fires
in the scope-lock. The effective model: **every burst triggers a 10s Transformation window.**

The 10s duration is DATAMINED from the kit's own arithmetic (not measured). ⚑ If the real window differs,
her whole-fight damage scales with it.

**skill1.**

- `passive` → self → `partsDamagePct 20` — inert vs partless boss (no damage channel).
- `hitCount:30` → self → `sustainedDamagePct 59.6` for 5s — fires every 30 normal attacks (~2.5s at 720 RPM);
  5s duration → effectively permanent after first proc at t≈2.5s. Boosts sustained-flavor DoTs ONLY, not
  normal AR fire.

**skill2.**

- `fullBurstEnter` → `alliesOfElementWeapon(Wind, AR)` → `sustainedDamagePct 77.5` for 10s — fires on EVERY
  team Full Burst (every ~20s in the control comp), not just ark-ranger-black's bursts. In the control comp
  (liter/crown/arb/helm), only ark-ranger-black is Wind+AR, so she is the sole recipient.

**burst** (all `burstCast` — fires only on rotations ark-ranger-black bursts, ~every 40s in the control comp):

- self → `atkPct 156.19` for 10s — the Transformation ATK buff. **burstCast NOT fullBurstEnter**: keyed to
  her own burst, so it does NOT fire on helm's bursts. This is the load-bearing trigger-identity distinction.
- enemy → `dot 45.87%/s` for 10s, `flavor:'sustained'` — Ark Black Collider. Ticks every 1s for 10s
  (the Transformation window). Boosted by sustainedDamagePct buffs.
- enemy → `dot 266.69%/s` for 10s, `flavor:'sustained'` — burst DoT on highest-HP enemy (the boss).
  Independent of Transformation.
- self → `sustainedDamagePct 135.83` for 10s — boosts her sustained DoTs (Collider + burst DoT).

**UNMODELED:**

- S1: battery charge from part-destroy (part-destroy trigger unsupported; inert in scope-lock).
- Burst: "while in Transformation: Battery ▲50%" (never fires in scope-lock — burst CD 40s > Transformation 10s).
- The battery resource itself is not modeled (no sim observable; the 10s Transformation window is the faithful
  encoding of its effect).

---

## 3. Lines worth a human spot-check

These rest on same-model agreement + cross-family convergence but have systematic-prior-prone semantics:

1. **Transformation ATK 156.19% — burstCast trigger, 10s window.** The 10s is derived from kit arithmetic
   (50% battery ÷ 5%/s drain). If the real Transformation window differs (e.g., the battery drains differently
   in game, or the Emergency Charge Protocol has a different net battery), her damage scales with it.
   **Recipe:** count Ark Black Collider ticks per burst on footage (≈ window length in seconds).

2. **Sustained Damage scope (59.6 / 77.5 / 135.83).** All three are `sustainedDamagePct` — they boost ONLY
   sustained-flavor damage (her DoTs), NOT her normal AR fire. If any is mis-scoped as generic `attackDamagePct`,
   it would over-credit her normal fire. The engine guarantees the scope (sustainedDamagePct only affects
   sustained-flavor hits), but the encoding choice is load-bearing.

3. **Ark Black Collider — 10s DoT bound to Transformation window.** The DoT lasts exactly as long as the
   Transformation (10s). If the Transformation window is wrong, the Collider duration is wrong too.

4. **burstCast vs fullBurstEnter for the Transformation ATK buff.** In the control comp (two B3 units),
   burstCast fires ~4 times in 180s; fullBurstEnter would fire ~8 times. The test discriminates this, but
   the trigger-identity reading is a systematic-prior-prone line.

---

## 4. Cross-family provenance

| Role                       | Model           | Result                                         |
| -------------------------- | --------------- | ---------------------------------------------- |
| S2b (pre-op reviewer)      | claude-fable-5  | Converged on all load-bearing lines            |
| S2b (pre-op reviewer ×2)   | claude-opus-4-8 | Converged on all load-bearing lines            |
| S5 (blind test-writer)     | claude-opus-4-8 | Tests trace GREEN vs driver's override         |
| S6 (blind override-writer) | claude-opus-4-8 | Converged (same triggers/magnitudes/durations) |
| S7 (judge)                 | claude-opus-4-8 | **GO**, faithfulness 1.0, 0 gotchas            |
| S7 (judge ×2)              | claude-fable-5  | **GO**, faithfulness 1.0, 0 gotchas            |

**Same-model residual:** the systematic-prior-prone lines (scope / duration / trigger-identity) have
cross-family corroboration (fable + opus converged), but no model count eliminates measurement-gated
magnitudes — the 10s Transformation window and the sustained-flavor routing need the owner/footage.

---

## 5. Board

No prior board reading (new unit). Override validates at **429.0M** (53.7% sustained fraction, 5 bursts).
