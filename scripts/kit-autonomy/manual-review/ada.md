# ada — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Ada (`ada`) — Electric · RL · Attacker · Burst III · 40s CD · ammo 6 · reloadFrames 141 ·
chargeFrames 60 · hitsPerShot 1 · normalAttackMultiplier 61.3 · chargeMultiplier 250 · Abnormal.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (7 FAITHFUL, 2 DOCUMENTED_GAP) ·
**0 silent drops, 1 documented FIDELITY ⚑ (F3, measurement-gated)** · S2b claude-fable-5, S5/S6 claude-opus-4-8,
S7 claude-opus-4-8 (all cross-family) converged on every load-bearing line. Both blind models independently
re-derived the one residual (Special Modification "1 round"), corroborating the kit-status F3 finding.

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Covert Support)** ■ Activates when entering Full Burst. Affects all Burst-3 allies who previously used
  their Burst Skill.
  - ATK ▲ 60% of the skill user's ATK for 10 sec.
  - True Damage ▲ 50% for 10 sec.
  - Recovers 10% of damage as HP for 10 sec.
- **S2 (Flash Grenade)** ■ Activates during Full Burst. Affects enemies within attack range nearest to the
  crosshair every 2 sec.
  - Flash Grenade Toss: Deals 420% of final ATK as True Damage.
  - ■ Activates when using Burst Skill. Affects self.
  - Flash Grenade Toss activation time condition ▼ 1 sec for 10 sec.
- **Burst (Secret Agent)** ■ Affects self.
  - ATK ▲ 40% for 10 sec.
  - True Damage ▲ 42% for 10 sec.
  - Special Modification — Function: Decreases Charge Speed but increases Charge Damage for 1 round(s).
    Effect 1: Charge Speed ▼ 300%. Effect 2: Charge Damage ▲ 1500%.

---

## 2. What the code does (override + blind re-derivations)

**skill1** — `fullBurstEnter` → `burstCasters {stage:3}` → `casterAtkPct 60` (10s) + `trueDamagePct 50` (10s).
The U8 run-E scope fix: the grant lands ONLY on the Burst-3 allies who already cast this rotation (ada + helm in
the control comp), never on the B1/B2 casters (liter/crown) — the unfiltered target was the source of crown/rouge's
old ~1.44 heat. `casterAtkPct` is a FLAT add of 60% of ADA's ATK (not target-scaled `atkPct`). `trueDamagePct` is
flavor-gated, so it feeds only Ada's true-flavored grenades (inert on a unit with no true source). The 10%
lifesteal is UNMODELED (no HP pool; offensively inert; crown the B2 on-recovery consumer can never be a target).
Cross-family: S2b fable + S6 opus both re-derived casterAtkPct/stage-3/trueDamagePct exactly.

**skill2** — two interleaved every-2s streams of `dot atkPct 420, flavor true, 10s`:

- block 1 keyed `fullBurstEnter` → enemy (the baseline grenade, re-applied every FB enter);
- block 2 keyed `burstCast` → enemy (the "▼1s activation" rider). The schema has no interval-modifier primitive,
  so the rider is encoded as a SECOND identical every-2s stream on Ada's own burstCast → combined rate exactly 1/s
  during her burst windows (helm rotations correctly stay 2s). Pinned live: 85 grenades with the rider vs 55
  without (≈+30). Both blind models had to skip this line (no primitive); the driver models it faithfully.

**burst** — `burstCast` → self → `atkPct 40` (10s) + `trueDamagePct 42` (10s) + `weaponSwap {damagePct 61.3,
chargeTimeSec 4, chargeMultPct 1750, durationSec 10}`. Special Modification: Charge Speed ▼300% → charge time
×4 (chargeFrames 60→240f ≈ 4s; the faithful ×(1+3) arithmetic, avoiding the negative 1+pct/100 trap); Charge
Damage ▲1500% → chargeMultPct 1750 (base 250 + 1500 additive → mult.charge 17.50). The swapped charge shot lands
in the 'normal' bucket at ×17.50. Pinned: removing the swap zeroes every ×17.50 shot and drops Ada to ~0.825×.

---

## 3. Owner spot-check cluster (the same-model / measurement-gated residual)

**⚑ F3 — Special Modification "for 1 round(s)" (burst, FIDELITY, MEASUREMENT-GATED).** This is the ONE residual,
and it was independently surfaced by BOTH blind cross-family models (S2b fable: FIX→durationShots:1; S5+S6 opus:
chargeSpeedPct−300/chargeDamagePct1500 durationShots:1) — strong corroboration of the existing kit-status F3 finding.

- **Kit-literal reading:** "for 1 round(s)" = `durationShots:1` → exactly ONE boosted charged rocket per burst window.
- **Shipped encoding:** `weaponSwap durationSec:10` with no `maxShots` cap → ~2 boosted charge shots per window
  (~45% of her total damage).
- **Board leverage:** the board (mean 0.993, range 0.99–1.00) leans on the 2nd shot; capping to kit-literal drops
  it to ~0.95. So the over-fire is currently FIT-validated, not kit-literal-validated.
- **Recipe to resolve:** record Ada's boosted charged-rocket popup count per burst window from fight footage. If
  exactly 1 (kit-literal), add `maxShots:1` to the burst weaponSwap block (or migrate the charge buffs to
  `durationShots:1`). Do NOT pick a count to hit the board.
- **Why this does not block GO:** the STRUCTURE (weaponSwap, burstCast self, charge ×17.50, charge time ×4) is
  faithful and pinned (A7); only the COUNT/duration is measurement-gated, and it is documented as a ⚑ caveat in
  the override (not a silent drop, not a fudge). The gauntlet certifies structure, not magnitudes.

**Secondary same-model caveat:** the S2 ▼1s rider rests on the two-stream encoding being behaviorally identical
to a true interval-halving (it is, for cadence: 1/s in-window). If a future engine adds a first-class
interval-modifier primitive, prefer it over the two-stream workaround.

---

## 4. Provenance / artifacts

- Driver test: `scripts/tests/units/ada.test.ts` (16 tests, GREEN vs shipped; A1–A8 each GREEN-under-shipped /
  RED-under-nearest-wrong). Independent gate: `scripts/kit-autonomy/reviews/ada.verify.txt`.
- S2b adversarial review (claude-fable-5): `scripts/kit-autonomy/reviews/ada.test-review.json` (leakDetected null).
- S5 blind test (claude-opus-4-8): `scripts/kit-autonomy/blind/ada.test.ts` + `ada.test-spec.json` (leakDetected null).
- S6 blind override (claude-opus-4-8): `scripts/kit-autonomy/blind/ada.override.json` + `ada.audit.json` (leakDetected null).
- S7 judge (claude-opus-4-8): `scripts/kit-autonomy/results/ada.json` — GO, faithfulness 1.0, discriminationOk true.
- Override note carries `Kit-autonomy gauntlet 2026-07-24`; F3 documented in `caveats`.
- Board: ada rank 1, mean 0.993 (0.99–1.00, σ=0.007), within ±3% — encoding unchanged by the gauntlet (S3 was
  documentation-only), so before == after.
