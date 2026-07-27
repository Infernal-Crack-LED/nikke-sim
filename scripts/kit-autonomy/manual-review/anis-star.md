# anis-star — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Anis: Star (`anis-star`) — Electric · RL · Defender · Burst I · 20s CD · ammo 6 · reloadFrames 141 ·
chargeFrames 60 · hitsPerShot 2 · normalAttackMultiplier 61.3 · chargeMultiplier 200 · autofire (DOWN_Charge).
⚠ The RL/Defender/Electric/Burst-I variant — NOT base `anis` (RL/Iron) and NOT `anis-sparkling-summer`
(SG/Supporter/Electric/Burst III). Approved nicknames: aniss / star / ttanis.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **1.0** (12 FAITHFUL, 4 DOCUMENTED_GAP) ·
**0 REAL-GOTCHA, 0 silent drops** · S2b claude-fable-5, S5/S6/S7 claude-opus-5 (all cross-family) converged on
every load-bearing line. The binding judge (opus) ran the adapted S5 blind test GREEN (24 passed / 5 documented
GAP skips / 0 failed) against the shipped override. Both blind models independently re-derived the formation
fork, the per-attack rider, the 40-tick star barrage, and the crown-recovery tandem concern the owner had
already documented.

---

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Starfall)**
  - ■ start of battle (self alive), all allies: Burst Gauge filling speed ▲ 6% continuously.
  - ■ start of battle AND when Full Burst ends — effects vary by squad formation, ONE set applies:
    - (no other Burst 1 allies) Effect 1: self, Cancels Everyone's Star; Effect 2: self, **My Own Star** ATK ▲ 40.01% continuous, cannot be removed; Effect 3: all allies, Cooldown of Burst Skill ▼ 7.48 sec.
    - (any other Burst 1 allies) Effect 1: self, Cancels My Own Star; Effect 2: self, **Everyone's Star** re-enters Burst and changes to Stage 1, continuous, cannot be removed.
  - ■ landing a Full Charge attack, the target: Deals 120.13% of final ATK as additional damage.
- **S2 (Stardust)**
  - ■ entering Full Burst while in My Own Star status, all allies: ATK ▲ 35.01% of the skill user's ATK for 10 sec.
  - ■ performing a Full Charge attack while in Everyone's Star status, all allies: Restores 1.26% of the skill user's final Max HP as HP.
  - ■ entering Full Burst, self + all allies with lower final DEF than self: Projectile Explosion Damage ▲ 92.03% for 10 sec.
  - ■ entering Full Burst, all allies: Attack Damage ▲ 34% for 10 sec.
- **Burst (Star Anis)**
  - ■ self: **Shooting Stars** — stars attack random targets automatically, Damage 40.01% of final ATK, Attack Interval 0.25 sec, Duration 10 sec; Additional Effects: Charge time fixed at 0.7 sec for 10 sec; Explosion Radius ▲ 100% for 10 sec; DEF ▲ 55.01% for 10 sec.
  - ■ while in My Own Star status, self: Attack Damage ▲ 35.2% for 10 sec.
  - ■ while in Everyone's Star status, all allies: Max HP ▲ 15.02% of the skill user's max HP for 10 sec.

---

## 2. What the code does (override + blind re-derivations)

The whole kit forks on **squad formation**, encoded with the engine's `formation: "noB1" | "hasB1"` gate (the
unit never counts itself). The reference-grade validated basis is the **noB1 ("My Own Star")** side — the sim
"cannot move sole-B1 comps", so every graded Anis: Star comp runs her as the only Burst I. The hasB1 ("Everyone's
Star") branch is the dropped/defensive side.

**skill1**

- `passive → allies → burstGenPct 6` (continuous) — formation-independent team burst-gauge fill.
- `passive → self → atkPct 40.01` (continuous, no expiry), `formation noB1` — My Own Star self ATK. Pinned self-only + continuous; proven ABSENT in a hasB1 comp.
- `fullBurstEnd → allies → burstCdr 7.48s`, `formation noB1` — the recurring team CDR (re-fires at EVERY Full Burst end, not once-per-battle; the battle-start instance is inert because all cooldowns are 0 at t=0). Pinned: removing it strictly reduces her cast count.
- `passive → self → reenterStage {stage:1}`, `formation hasB1` — the real Everyone's-Star re-entry primitive (supersedes an earlier burstEligibility approximation; both blinds approximated it with burstEligibility while suspecting exactly this mechanic).
- `shotFired → enemy → flatDamage atkPct 120.13` — the full-charge rider, once per pull (RL always full-charges). Pinned: rider count === shot count, never 2× (the hitsPerShot=2 per-hit trap), rangeApplied false, no core, self-damage only.

**skill2**

- `fullBurstEnter → allies → casterAtkPct 35.01` (10s), `formation noB1` — a FLAT add of 35.01% of ANIS's ATK (not target-scaled atkPct). buffApply.value is the resolved flat grant (≈28101); pinned by linear scaling (double the pct → double the value).
- `fullBurstEnter → allies → projectileExplosionPct 92.03 + attackDamagePct 34` (10s) — formation-independent FB-enter Damage-Up. The 92.03% lands in projectileExplosionPct (RL/explosion-flavor bucket), NOT laundered into attackDamagePct; the "lower-DEF allies" target is the documented all-allies ⚑ stand-in (she is the top-DEF Defender, and the stat is inert on the comp's non-RL teammates).
- The hasB1 full-charge **heal (1.26% Max HP)** is UNMODELED (see §4 gotcha 1).

**burst**

- `burstCast → self → dot atkPct 40.01, intervalSec 0.25, durationSec 10, flavor projectileExplosion` — Shooting Stars, 40 ticks/cast, one instance (no DoT multiplication), no core. The projectileExplosion flavor means the stars pick up her own S2 92.03% aura. Pinned: 40 ticks/window; halfDot (0.25→0.5) → 20.
- `burstCast → self → chargeSpeedPct 30` (10s) — the "charge time fixed at 0.7s" clamp. The engine charge formula is **SUBTRACTIVE** (sim.ts:2560 `needed = round(chargeFrames × (1 − cs/100))`), so 30 → 60×0.70 = 42f = 0.7s EXACTLY. Both blinds derived 42.86 assuming a multiplicative formula — a RECON_ERROR (they could not read sim.ts); 30 is the only value that yields 0.7s in this engine (corroborated by probe + owner 2026-07-13 ruling).
- `burstCast → self → attackDamagePct 35.2` (10s), `formation noB1` — My Own Star self Damage-Up (additive with the team 34%). Pinned self-only; absent in hasB1.
- `burstCast → allies → casterMaxHpPct 15.02` (10s), `formation hasB1` — Everyone's-Star Max HP grant (resolves to a maxHpFlat buffApply). Offensively inert (ally-granted Max HP never feeds a teammate's atkOfMaxHpPct), kept for kit-SSOT completeness. Pinned: maxHpFlat present iff hasB1.
- **Explosion Radius ▲100%** and **DEF ▲55.01%** are UNMODELED (see §4 gotcha 2 for DEF).

Cross-family: S6 opus produced a near-identical independent OverrideFile (same magnitudes, triggers, formation
gates, unmodeled set); S2b fable + S5 opus re-derived the same per-line dispositions. The only blind-vs-driver
value divergences (chargeSpeedPct 30 vs 42.86; reenterStage vs burstEligibility) both resolved in the driver's
favour on evidence the blinds could not see.

---

## 3. Convergence & discrimination

- **S5 blind tests vs shipped override:** GREEN — adapted blind test 24 passed / 5 documented-GAP skips / 0 failed.
- **Driver test (scripts/tests/units/anis-star.test.ts):** 18 assertions GREEN; S2d verify clean; validate-overrides 0 warnings (dmg 365.9M).
- **Discrimination:** every load-bearing line fails under its named nearest-wrong model (noMyOwnStar drops her ATK → damage falls; doubleCaster doubles the resolved casterAtkPct; halfDot halves the star ticks; noCdr reduces casts; the formation flip proves noB1/hasB1 exclusivity).
- **Board:** ratio 0.961 (±8% band, 12 teams) — unchanged by this gauntlet (only the note text was edited; no damage-affecting encoding change).

---

## 4. Lines worth a human spot-check (judge gotchas + residuals)

**Gotcha 1 — FIDELITY / low (DOCUMENTED):** the hasB1 Everyone's-Star full-charge **heal (1.26% of final Max HP)**
is UNMODELED. Both blind agents independently implemented it and named "dropped as defensive" as the nearest-wrong:
it emits recovery events at full-charge cadence that an on-recovery consumer (crown) would consume. The driver did
NOT silently drop it — it is recorded in `unmodeled.skill2` under an explicit owner ruling with the crown-recovery
tandem documented, and it is unreachable in the reference-grade sole-B1 fixture (the hasB1 branch never fires
there). **Spot-check:** if a graded hasB1 comp ever pairs her with an on-recovery consumer, add a `heal` block
(`shotFired`/`chargeCounter count:1`, allies, `formation hasB1`, 1.26% of caster final Max HP) — inert in every
sole-B1 comp, so it cannot move the current basis. No magnitude invention needed (1.26% is the prose's own number).

**Gotcha 2 — ENCODING / low (DOCUMENTED):** burst **DEF ▲55.01%** is in `unmodeled` rather than shipped as an inert
`defPct` buff. Both blinds shipped it for kit-completeness; S2b noted it is the input to skill2's "lower final DEF
than self" comparison if that target set is ever modeled. DEF is damage-inert (zero damage either way; validate
total unaffected). **Spot-check:** optionally add `{burstCast → self → defPct 55.01, 10s}` and drop the line from
unmodeled — purely additive bookkeeping that restores the future DEF-ranking input.

**Measurement-gated residuals (⚑, out of scope):** cadence tuple (pullsPerSec / reloadFrames / hitsPerShot
split-vs-merge — RL datamine-unreliable); charge-clamp composition under a stacked charge-speed team (the
clamp-vs-percent under-clamp); the lower-DEF target coverage (all-allies stand-in); Shooting Stars crit
(left OFF pending a popup-colour read). reenterStage re-entry cadence in a hasB1 comp is approximated (the status
flag + stage-1 re-entry are modeled; the exact re-burst cadence is measurement-gated).
