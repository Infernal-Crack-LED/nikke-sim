# alice — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Alice (`alice`) — Fire · SR · Attacker · Burst III · 40s CD · ammo 6 · reloadFrames 141 ·
chargeFrames 90 · hitsPerShot 1 · normalMult 69.04 · chargeMult 350 · Tetra. (The SR/Fire Alice — NOT
`alice-wonderland-bunny`, the SMG/Water variant.)

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (5 load-bearing lines FAITHFUL, 1
DOCUMENTED_GAP) · **0 real gotchas** · S2b fable + S5/S6/S7 opus (cross-family) converged on every line.

---

## 1. Real kit (data/characters.json — ground truth)

- **S1** ■ Activates when entering Full Burst. Affects 2 ally unit(s) with the highest final ATK.
  - Charge Speed ▲ 11.67% of the skill user's Charge Speed for 10 sec · Charge Damage ▲ 7% for 10 sec.
- **S2** ■ Affects self. Activates when above 80% HP. Gain continuous Pierce.
  - ■ Affects self. Activates when HP falls below 80%. Continuously recover HP by 8.12% of attack damage.
- **Burst** ■ Affects self.
  - Charge Speed ▲ 80.15% for 10 sec · ATK ▲ 55.12% for 10 sec.

---

## 2. What the code does (override + blind re-derivations)

**skill1.** ■ One block at `fullBurstEnter` (fires on ANY team Full Burst entry — 11× over the fight in the
control comp, NOT only on Alice's own 6 burst casts):

- Target `alliesTopAtk {byFinalAtk:true, count:2}` — the **2 allies with the highest FINAL ATK**, self-eligible.
  "final ATK" is re-ranked at apply time, so Alice's own +55.12% burst ATK can pull her into the top-2 and stack
  her S1 onto her burst; the top-2 set therefore ROTATES across firings (union {liter, alice, helm} = 3) while
  each firing hits exactly 2.
- Effects: `chargeSpeedPct 11.67` (10s) + `chargeDamagePct 7` (10s).
  - `chargeSpeedPct` shortens charge time (`needed = round(chargeFrames × (1 − cs/100))`, sim.ts:2557) — the
    correct charge-time path, NOT `attackSpeedPct` (which scales fire rate, sim.ts:2600).
  - `chargeDamagePct` is the **additive percentage points in the charge bucket** (sim.ts:1385) — the correct
    reading of "Charge Damage ▲7%", NOT `chargeDamageMultPct` (which scales BASE charge damage; Helm-treasure /
    collection-item mechanic).

**skill2.** ■ `skill2: []` — both lines are out-of-domain at scope lock:

- **Pierce (>80% HP)** is modeled as top-level `hasPierce: true` — a HIT TAG that enables `pierceDamagePct`
  eligibility (sim.ts:1400), NOT a damage stat. `PIERCE_CORE_DOUBLE=false` (sim.ts:1091) so there is NO core+body
  double-hit. With no `pierceDamagePct` source in her kit and a partless boss, **hasPierce is damage-INERT at
  scope lock** (verified byte-identical totals with/without). The >80% HP gate is always satisfied in v1 (the
  boss deals no damage), so leaving it ungated changes nothing.
- **Lifesteal (<80% HP, recover 8.12% of attack damage)** is UNMODELED (verbatim in `unmodeled.skill2`): the boss
  deals no damage and there is no HP pool, so the <80% branch is never entered and the heal moves no damage.
  Flagged ⚑ out-of-domain (needs an HP-pool + incoming-damage primitive).

**burst.** ■ `burstCast` (Alice's OWN burst cast — resolves on her 6 cast frames, NOT on every team FB) → self:
`chargeSpeedPct 80.15` (10s, the kit-defining cadence line — ~90/1.8015 ≈ 50f charge in-window → many more
charged shots) + `atkPct 55.12` (10s, scales her own ATK across all her buckets).

**codeDrivenSurprises (from the blind re-derivations):**

- The two charge stats are a trap: "Charge Damage ▲7%" is `chargeDamagePct` (additive bucket), NOT
  `chargeDamageMultPct` (base-scaler). The driver picked the correct one; the blind override-writer guessed
  `chargeDamageMultPct` (flagged ⚑) and the blind test-writer self-corrected to `chargeDamagePct`.
- "Charge Speed ▲" is `chargeSpeedPct` (charge-time shortening → shot count → damage), NOT `attackSpeedPct`
  (fire rate). Both blind writers proxied to `attackSpeedPct` because the StatKey was redacted as an answer
  token; both flagged it ⚑; the driver's `chargeSpeedPct` is engine-verified and load-bearing.
- S1's "highest final ATK" is DYNAMIC (re-ranked at apply time), so the top-2 rotates — assert per-firing
  count == 2, not a fight-wide union of 2.
- S1 is `fullBurstEnter` (every team FB) while the burst self-buffs are `burstCast` (Alice's casts only); in the
  co-B3 control comp (helm is the other B3) the two keyings diverge on every alternating rotation.
- Pierce is a tag, not a stat: a total-damage delta from the pierce line is itself a failure signal.

---

## 3. Driver's executive summary

Alice is **faithfully modeled** (gauntlet verdict GO, faithfulness 1.0, 0 real gotchas, cross-family
corroborated). The override encodes:

- **S1** — `fullBurstEnter` → 2 highest-final-ATK allies → `chargeSpeedPct 11.67` + `chargeDamagePct 7` (10s).
- **S2** — Pierce via `hasPierce` (inert hit tag at scope lock); lifesteal UNMODELED (out-of-domain, ⚑).
- **Burst** — `burstCast` → self → `chargeSpeedPct 80.15` + `atkPct 55.12` (10s).

The S3 edit was documentation-only (no behavioral change): the gauntlet note stamp, a correction of the stale
"pierce double-hit" claim in the prior note (PIERCE_CORE_DOUBLE=false), and ⚑+estimate+recipe+tier caveats for
the two out-of-domain lines (A1 caster-relative charge-speed qualifier; B2 lifesteal).

**How it was validated:** driver tests (12 assertions, 11 GREEN + 1 skip vs shipped override, counterfactuals
that provably diverge: fullBurstEnter↔burstCast, top-2↔all-allies, pierce-tag inertness) → cross-family
adversarial reviewer (fable, 6 spec lines, 5 load-bearing, converged) → cross-family blind test-writer +
override-writer (opus, both leak-free, converged on structure) → S5 blind test materialized GREEN vs the driver
override (6 pass + 4 skip) → cross-family reconciling judge (opus, GO, faithfulness 1.0). All blind roles ran on
a DIFFERENT model family than the driver (Qwen→Claude), so this GO rules out both idiosyncratic AND systematic
shared-prior error on the load-bearing lines.

---

## 4. Owner spot-checks (the honest residual)

This GO is **cross-family corroborated** — S2b (fable) + S5/S6/S7 (opus) ran on a different model family than the
Qwen driver. The judge's measurement-gated residual (out of gauntlet scope — the gauntlet certifies STRUCTURE,
not magnitudes):

1. **Caster-relative charge speed (S1)** — "11.67% of the skill user's Charge Speed" is modeled as a flat
   +11.67% (no caster-relative charge-speed StatKey exists). At scope lock the caster is at base charge speed
   unless she ranks top-2 AND has her own +80.15% burst buff live at FB entry, in which case the flat grant
   understates by up to ~~80% of 11.67 (~~+9pp) on those rotations only — a low-single-digit-% cadence effect on
   the 2 targeted allies. Recipe: read the targeted allies' charged-shot cadence in a focus video vs sim.
2. **Effective charge cadence (burst)** — the 80.15% Charge Speed against datamined chargeFrames 90 /
   reloadFrames 141 / ammo 6 produces the shot count that drives her damage; datamine cadence fields are
   known-unreliable. Pin the effective chargeFrames from footage before trusting the charge-driven number.
3. **Stacking convention** — when Alice self-includes in her own S1, the 80.15% + 11.67% charge-speed stacking
   (additive-in-stat vs multiplicative on charge time) is unverified; pin from footage if a cadence read
   disagrees.
4. **Board:** alice reads **1.101 HOT** (1 record, PA MiKa boss Iron), range 1.10–1.10, residual 0.101 —
   unchanged before/after (S3 was documentation-only). kit-status attributes the ~0.91–1.10 residual to
   basis/comp-side (read 1.10–1.12 HOT with the same model 07-13/14), NOT a kit-encoding defect.
