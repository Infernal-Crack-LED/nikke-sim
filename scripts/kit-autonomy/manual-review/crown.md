# crown — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-23). The owner's short-form review: what the
> sim implements alongside the real kit, the driver's executive summary, verdict, and the lines worth a human
> spot-check.

**Unit:** Crown (`crown`) — Iron · MG · Defender · Burst II · 20s CD · ammo 300 · reloadFrames 171 ·
chargeFrames 0 · hitsPerShot 1 · Pilgrim.

**Verdict:** 🟢 **GO (cross-family corroborated)** · faithfulness **0.9** (8/9 lines FAITHFUL, 1 DOCUMENTED_GAP) ·
**0 real gotchas** · S2b fable + S5/S6/S7 opus (cross-family) converged on all load-bearing lines.

---

## 1. Real kit (data/characters.json — ground truth)

- **S1** ■ Activates at the start of Full Burst. Affects all allies who previously used their Burst Skills.
  - ATK ▲ 64.51% of the skill user's ATK for 15 sec · Reload Speed ▲ 44.35% for 15 sec.
  - ■ Affects all allies who did not previously use their Burst Skills.
  - DEF ▲ 37.44% of the skill user's DEF for 15 sec · Reload Speed ▲ 44.35% for 15 sec.
- **S2** ■ Activates after 43 normal attacks. Affects self.
  - Relax: Incoming healing ▲ 4.06% continuously. Stacks up to 20 times.
  - ■ Activates when Relax is at max stacks. Removes stacks and affects self.
  - Invulnerable for 5 sec · Attract: Taunts all enemies for 5 sec · Restores HP equal to 5.23% of final Max HP.
  - ■ Activates when recovery takes effect. Affects all allies.
  - Attack Damage ▲ 20.99% for 7 sec.
- **Burst** ■ Affects all allies.
  - Attack Damage ▲ 36.24% for 15 sec · Creates a Shield equal to 10.45% of final Max HP for 15 sec.

---

## 2. What the code does (override + blind re-derivations)

**skill1.** ■ Two DISJOINT blocks at `fullBurstEnter` (fires on ANY team Full Burst, not just Crown's own):

- **Burst casters** (allies who cast their burst this chain): `casterAtkPct 64.51` (64.51% of CROWN's ATK,
  not the target's own — a flat caster-scaled add) + `reloadSpeedPct 44.35`, both 15s.
- **Non-burst casters** (allies who did NOT cast): `defPct 37.44` (damage-inert in the sim — DEF feeds no
  player-damage path) + `reloadSpeedPct 44.35`, both 15s.
- The engine's `burstCasters`/`nonBurstCasters` target kinds reset at FB end, so membership is per-chain.
  In a standard comp with two alternating B3s, exactly one B3 casts per chain (burstCaster) and the other
  sits out (nonBurstCaster) — so nonBurstCasters always has at least one member.

**skill2.** ■ Two blocks modeling the Relax→heal→recovery chain:

- **hitCount 860** (43 attacks × 20 stacks = 860 total hits) → self → `heal`. The Relax stacking mechanic
  itself is UNMODELED (incoming healing ▲ 4.06% is defensive); only the net firing cadence is captured.
- **recovery** trigger (fires when Crown RECEIVES a heal — from her own S2 heal OR from a teammate healer
  like Helm's frequent full-charge heals) → all allies → `attackDamagePct 20.99` for 7s. In a healer-less
  team this fires ~once off her own Relax cycle; with a frequent healer it refreshes to near-permanent.
- **UNMODELED (defensive):** Relax healing boost (4.06% × 20 stacks), Invulnerable 5s, Taunt 5s.

**burst.** ■ `burstCast` (Crown's own burst, resolves BEFORE the FB window opens) → all allies:
`attackDamagePct 36.24` (15s, Damage-Up bucket) + `shield maxHpPct 10.45` (15s, fires 'shielded' triggers
for shield-synergy kits; no HP pool modeled).

**codeDrivenSurprises (from the blind re-derivations):**

- S1's `casterAtkPct` is caster-scaled: 64.51% of CROWN's ATK added flat to each burst caster. A generic
  `atkPct` would scale off each target's OWN ATK — a different (and wrong) number.
- S1's disjoint targeting means no unit ever gets BOTH the casterAtkPct AND the defPct in the same chain.
- S2's `recovery` trigger is HEAL-DRIVEN, not cadence-driven: it fires whenever Crown receives a heal,
  making her team AD uptime dependent on the healer's frequency.
- The shield event is a placeholder (no HP pool) but fires 'shielded' triggers — don't strip it as defensive.
- DEF is damage-inert: the nonBurstCasters' `defPct 37.44` has zero effect on damage output.

---

## 3. Driver's executive summary

Crown is **faithfully modeled** (gauntlet verdict GO, faithfulness 0.9, 0 real gotchas, cross-family
corroborated). The override encodes:

- **S1** — `fullBurstEnter` disjoint team buffs: burst casters get `casterAtkPct 64.51` + `reloadSpeedPct 44.35`
  (15s); non-casters get `defPct 37.44` + `reloadSpeedPct 44.35` (15s). Owner-rebuilt 2026-07-16 after the
  materialize freeze inherited a blablalink mis-parse.
- **S2** — Relax cycle collapsed to `hitCount 860` → self-heal → `recovery` trigger → team `attackDamagePct 20.99`
  (7s). The heal-triggered cadence is the load-bearing approximation: uptime depends on healer frequency.
- **Burst** — `burstCast` team `attackDamagePct 36.24` (15s) + `shield 10.45%` Max HP (15s).
- **Unmodeled (defensive):** Relax healing boost, Invulnerable, Taunt.

**How it was validated:** driver tests (12 assertions, GREEN vs shipped override, 5 counterfactuals that
provably diverge) → cross-family adversarial reviewer (fable, 9 spec lines, 8 load-bearing, converged) →
cross-family blind test-writer + override-writer (opus, both leak-free, converged) → cross-family reconciling
judge (opus, GO). All blind roles ran on a DIFFERENT model family than the driver (Qwen→Claude), so this GO
rules out both idiosyncratic AND systematic shared-prior error on the load-bearing lines.

---

## 4. Owner spot-checks (the honest residual)

This GO is **cross-family corroborated** — S2b (fable) + S5/S6/S7 (opus) ran on a different model family than
the Qwen driver, substantially stronger than same-model only. Residual:

1. **S2 recovery cadence** — the `hitCount 860` → heal → recovery chain is a DERIVED model of the Relax cycle.
   The 43×20 = 860 total is from the prose, but the actual in-game stacking cadence (MG fire rate, reload
   interruptions) is unmeasured. Effective team-AD uptime is unknown until probed in a real fight.
2. **S1 burst-scoping** — `burstCasters`/`nonBurstCasters` membership depends on the rotation. In a standard
   comp with two alternating B3s, exactly one B3 casts per chain (burstCaster → casterAtkPct) and the other
   sits out (nonBurstCaster → defPct). The control comp confirmed this: 11 defPct events on slots 2/3 (ada
   and helm alternating). The disjoint split is working as designed; the open question is whether the
   casterAtkPct magnitude is correctly measured against real recordings of this alternating pattern.
3. **Measurement-gated magnitudes** — 64.51 / 44.35 / 37.44 / 20.99 / 36.24 / 10.45 match the prose exactly
   but are not independently re-measured; the gauntlet certifies STRUCTURE, not numbers.
4. **Board:** crown reads **1.000 (OK, σ=0.046)** — perfect fit. But Crown has ZERO self-damage kit lines,
   so the board reflects buff MAGNITUDES landing on graded carries, not the scoping/cadence approximations.
