# neon-vision-eye — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-25). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check. EXACT SLUG: `neon-vision-eye` (Neon: Vision Eye) — the RL/Electric Burst III variant (aka
> "nve"/"neo neon"/"veon"/"nneon"), NOT base `neon` (SG/Fire) and NOT `neon-blue-ocean` (MG/Water). The
> slug-disambiguation lint flags the substring "neon" inherent in the slug/official name; that is informational
> (exit 0) — every assertion keys on `slug === 'neon-vision-eye'`.

**Unit:** Neon: Vision Eye (`neon-vision-eye`) — Electric · RL · Attacker · Burst III · 40s CD · ammo 6 ·
reloadFrames 141 · chargeFrames 60 · hitsPerShot 1 · normalAttackMultiplier 61.3 · chargeMultiplier 250 ·
input_type `DOWN_Charge` (autofire-exempt). baseStats ATK 600 / critRate 15 / critDamage 150.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **0.93** (6 load-bearing FAITHFUL, 8
DOCUMENTED_GAP, **1 low-severity FIDELITY note**) · discriminationOk **true** · S2b claude-fable-5, S5/S6/S7
claude-opus-5 (all cross-family) converged on every load-bearing line and **independently re-derived the
period-3 / phase-1 Super Firepower cycle three ways** (driver test, fable review, opus blind override) — also
video-verified cast-by-cast in kit-status (Run B). The binding judge (opus) adjudicated the 3 blind-test REDs as
**1 real low finding + 1 DOCUMENTED_GAP + 1 RECON_ERROR** and ruled GO.

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Healthy Body / Firepower Explosion)**
  - ■ when attacked while not in Healthy Body, self: Invulnerable 3s (5×/battle) + debuff immunity ∞ 3s (5×).  *[defensive]*
  - Healthy Body: Incoming healing ▲ 10.26% for 20s.  *[received-heal amp]*
  - ■ landing a Full Charge attack → the stage target: **Firepower Explosion 437.98% of final ATK** as additional damage.
  - Additional effect of Super Firepower status: **262.79% of final ATK** as additional damage.
- **S2 (Firepower Charge / Maximum Firepower)**
  - ■ battle start, self: Firepower Gauge +100.
  - ■ normal attack during Firepower Charge, self: Firepower Gauge +2.
  - ■ Firepower Charge ends, self: Firepower Gauge +45.
  - ■ Full Burst ends while gauge active, self: Burst Gauge filling speed ▲ 5% × gauge charge for 5s.  *[burst-gen]*
  - ■ entering Full Burst, self: **Maximum Firepower ATK ▲ 80.04% for 10s**; additional effect for Super Firepower: **ATK ▲ 35.05% for 10s**.
- **Burst (Super Firepower)**
  - ■ gauge < 100, self: Firepower Charge — charges the gauge 10s (unremovable), +1 gauge.
  - ■ gauge = 100, self: **Super Firepower Attack Damage ▲ 45.03% for 10s**, −100 gauge.
  - ■ self: Explosion Radius ▲ 200% for 10s.  *[inert vs partless boss]*
  - ■ self: **Attack Damage ▲ 110.21% for 10s** (unconditional).

---

## 2. What the code does (override + blind re-derivations)

**The meta-defining mechanic — Firepower Gauge / Super Firepower alternation (Tier 2).** Gauge starts at 100
(S2 battle-start). A burst at gauge=100 fires **Super Firepower** then drains to 0; a burst below 100 opens a 10s
**Firepower Charge** that refills only ~+60 (+1 cast, +2/shot for ~7 charges, +45 on end), so it takes **two**
charge rotations to top back up. Super Firepower therefore lands on her **1st, 4th, 7th…** burst. The override
**ABSORBS** all the gauge plumbing into the skill1 Super block's `everyN: 3, everyNOffset: 1`, which the engine
evaluates as "fire when activations ≡ 1 (mod 3)" → casts 1, 4, 7. This was re-derived independently from gauge
arithmetic by fable (S2b) and opus (S6) and is video-verified (kit-status Run B). The period is **derivation-stable**,
not calibration-fragile: one window from ~60 always caps (needs only +45+1), one window from 0 can never reach 100
(would need ≥27 shots in 10s — impossible for this RL), so the exact shots-per-window cannot move the period.

**skill1** — two blocks:
- `shotFired` → `enemy` → `flatDamage atkPct 437.98` (the base Firepower Explosion). Fires once per full-charge
  shot (an RL charges every pull). Function "additional damage": crits at caster rate, never cores, noRange, FB by
  landing timing (SSOT §2b / U1). Driver test N1 pins riders === shots, bucket 'skill', critEligible, ¬coreEligible,
  and the removal counterfactual zeroes it.
- `burstCast` → `self`, `everyN: 3, everyNOffset: 1` → the **three Super riders** for 10s: `extraHitDamagePct
  262.79` (per-shot additional damage while live → burst-bucket rider, srcSlot null), `atkPct 35.05`, `attackDamagePct
  45.03`. Driver test N2/N4/N5 pin the exact Super frames (burst indices ≡ 0 mod 3 → casts 1 & 4 over the 5-burst
  fixture), the first-cast-is-Super phase, magnitudes, 10s durations, self-scope, and the always-on counterfactual
  (everyN removed) over-firing.

**skill2** — `fullBurstEnter` → `self` → `atkPct 80.04` (10s), every Full Burst entry. Driver test N3 pins value,
per-FB-enter cadence, 10s, self-scope. **The S5 blind test (helm co-B3 fixture) confirmed the trigger KIND**: the
apply frame ∈ fullBurstStart set — the burstCast-vs-fullBurstEnter discrimination the driver's sole-B3 fixture
cannot make (there they coincide). The judge called this "the strongest single piece of evidence in this packet."

**burst** — `burstCast` → `self` → `attackDamagePct 110.21` (10s), unconditional, every cast. Driver test N6 pins
count === burst casts, value, 10s, self-scope, and the removal counterfactual. (The 45.03 Super rider is filed under
skill1's Super block above — a filing detail only; buff events carry no srcSlot-dependent damage attribution.)

---

## 3. The one finding (low-severity FIDELITY — documented, not a behavioural error)

**The +35.05% Super ATK rider is keyed to her `burstCast` rather than `fullBurstEnter`.** The kit reads "when
entering Full Burst … additional effect for Super Firepower: ATK ▲ 35.05%". A burstCast resolves ~22f (~0.37s)
before the Full Burst window opens, so the driver's 10s 35.05 window starts/ends ~22f early — a **marginal
UNDER-credit** (she is mid-burst-animation and fires nothing in that gap). Cadence, magnitude, duration and
self-scope are all correct and pinned. The engine has **no time-windowed self-status gate**, so a fully faithful
"fullBurstEnter gated on Super Firepower live" encoding is not currently expressible. Of the two available
approximations the driver's is the **more robust in multi-B3 comps**: the S6 blind used `fullBurstEnter + everyN`
and its own caveat ⚑8 concedes that keying "drifts out of phase with her own burst count whenever another Burst III
takes a rotation." **Now documented in the override note.** Durable fix if the owner wants the literal encoding:
add a `fullBurstEnter` trigger with a self-status / `requiresOwnBuff` gate on the Super window (which would also let
the 262.79 rider gate on the status rather than the cast counter).

---

## 4. DOCUMENTED_GAP lines (deliberate, verbatim in `unmodeled`)

- **S1 defensive package** (invuln / debuff immunity / Healthy Body received-heal ▲10.26%): no "when attacked"
  trigger, the v1 boss deals no damage, no incoming-healing StatKey/HP pool. The received-heal amp modifies heals
  RECEIVED and emits none → cannot drive a teammate's on-recovery consumer (tandem check corroborated by fable).
- **Gauge plumbing** (start +100, +2/shot, +45/end, burst <100 charge, =100 drain): bookkeeping ABSORBED into the
  everyN 3 / offset 1 cadence (above). No gauge-resource primitive exists; the only observable consequence — the
  branch phase — is pinned by exact frames.
- **FB-end burst-gen (▲5% × gauge for 5s)**: burst-generation only, feeds rotation speed not a damage bucket; its
  value is 5% × a live pool the sim doesn't track, so any modeled number is invented. Fable independently graded it
  GAP; the S6 blind modeled it only with a self-declared placeholder (75 = "5×~15, not a measurement"). Per
  MEASURED>FUDGE the documented skip is the correct call. **Honest residual:** under-credits her burst generation on
  charge rotations. *Recipe to close:* read her burst-gauge fill rate for 5s after a Full Burst end on a charge
  rotation vs a Super rotation (gauge 0 → no buff).
- **Explosion Radius ▲200%**: inert vs a single partless boss (no AoE/radius primitive). Correctly skipped rather
  than laundered into a damage stat. *Measurement note (S6 ⚑7):* a larger blast could lift effective hit/core rate —
  the first suspect if a recording ever shows her in-burst hit or core rate rising.

---

## 5. Spot-check cluster for the owner (same-model residuals named by the judge)

1. **262.79 rider bucket routing** — the `extraHitDamagePct` rider lands in the 'burst' bucket (srcSlot null); both
   blinds and the driver are the same model family and all leaned on the SSOT sanction that function "additional
   damage" crits / never cores / takes FB by timing. Confirm the majors/flavors match the kit's Firepower-Explosion
   wording against a recording.
2. **~7-shots-per-charge-window estimate** — an ⚑ that does NOT move the period but sets the size of the skipped
   burst-gen buff.
3. **Explosion Radius skip** — inert by construction vs a partless boss; revisit if in-burst hit/core rate rises on
   footage.

---

## 6. Process note (not faithfulness)

All three blind roles (fable S2b, opus S5, opus S6) independently reported that the supplied redacted effect schema
(`types-redacted.ts`) **leaked a unit-named comment on the `everyNOffset` field** referencing this unit's full-gauge
start. Each re-derived the period-3 cycle from the kit prose / gauge arithmetic without it and states the derivation
stands. **Action:** the packet-prep script (`prepare-cross-family-packet.ts`) should strip unit-named schema comments
from the redacted types bundle.

---

## 7. Evidence trail

- Driver spec: `scripts/tests/units/neon-vision-eye.test.ts` (22 tests, 6 groups N1–N6 + fixture sanity; 22/22 GREEN).
- Override: `src/skills/overrides/neon-vision-eye.json` (note-only change this gauntlet; no functional change).
- S2b review (fable): `scripts/kit-autonomy/reviews/neon-vision-eye.test-review.json`.
- S5 blind test (opus): `scripts/kit-autonomy/blind/neon-vision-eye.test.ts` (+ `.adapted.test.ts` — onEvent routed
  through `cfg`; adapted run vs driver = 11 pass / 3 fail / 5 skip, the 3 fails adjudicated below).
- S6 blind override (opus): `scripts/kit-autonomy/blind/neon-vision-eye.override.json` (+ `.audit.json`).
- Binding judge verdict (opus): `scripts/kit-autonomy/results/neon-vision-eye.json` — **GO, 0.93, discriminationOk**.
- Cross-family packets/results: `scripts/kit-autonomy/cross-family/neon-vision-eye/`.
