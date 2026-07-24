# privaty — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-23). The owner's short-form review: what the
> sim actually implements (blind code-only reconstruction) alongside the real kit, plus the driver's executive
> summary, verdict, and the lines worth a human spot-check.

**Unit:** Privaty (`privaty`) — Water · AR · Attacker · Burst III · 40s CD · ammo 60 · reloadFrames 81 ·
chargeFrames 0 (autofire) · hitsPerShot 1 · treasure · Elysion.

**Verdict:** 🟢 **GO** · faithfulness **1.0** (11/11 lines FAITHFUL or DOCUMENTED_GAP) · **0 real gotchas** ·
**same-model only** (no cross-family review run — see spot-checks).

---

## 1. Real kit (data/characters.json — ground truth)
- **S1** ■ Activates when entering Full Burst. Affects all allies.
  - ATK ▲ 23.61% for 10 sec · Reload Speed ▲ 51.16% for 10 sec · Max Ammunition Capacity ▼ 50.66% for 10 sec · Attack Damage ▲ 20.16% for 10 sec.
- **S2** ■ Activates when the last bullet hits the target. Affects the target.
  - Damage Taken ▲ 10.01% for 10 sec · Deals 256.17% of final ATK as additional damage.
  - ■ Activates when the last bullet hits a target in Designated Target status. Affects the target.
  - Deals 1687% of final ATK as additional damage.
- **Burst** ■ Affects self: Elemental Advantage Attack Damage ▲ 130% for 10 sec.
  - ■ Affects all enemies: Deals 1407.64% of final ATK as Burst Skill damage · Stuns for 3 sec · Designated Target: ATK ▼ 5.02% for 10 sec.

---

## 2. What the code does — blind code-only reconstruction (independent)

> **⚠️ Provenance.** This blind reconstruction was generated **2026-07-20** (the most recent successful blind
> run; `scripts/blind-rebuild/reconstructions/privaty.json`). A fresh regeneration from the current code was
> attempted 2026-07-23 but hit `LOOP_DETECTED` repeatedly (the Qwen loop-detector kills subagents that read many
> engine files — a known environment limitation). **The 1687% rider was re-encoded 2026-07-23** — see the driver
> correction in §2.1. **The rest of this reconstruction matches the current code** (driver-verified against the
> current override + an event-log probe). Read the codeDrivenSurprises — they are still valid and are the point
> of the blind view.

**skill1.** ■ Entering Full Burst — trigger `fullBurstEnter` with NO own-burst gate, so it fires on ANY Full
Burst the team triggers (any Burst III completing the chain), not only when this unit herself bursts. Affects
all allies (target `allies`, no excludeSelf → includes the owner). ATK ▲ 23.61% / Reload Speed ▲ 51.16% /
Max Ammunition ▼ 50.66% (authored as a negative `maxAmmoPct`; on application the engine clips the live belt down
to the new max — `ammo = min(ammo, maxAmmo())` — so it is a magazine penalty, not a grant) / Attack Damage
▲ 20.16% (Damage-Up bucket), all for 10 sec.

**skill2.** ■ Two independent blocks. **(a)** On the owner's last bullet / reload start (trigger `lastBullet`).
Affects the enemy. Damage Taken ▲ 10.01% for 10 sec — applied to the boss via the enemyBuffs path (the `enemy`
target special-cases damageTakenPct even though `resolveTargets('enemy')` returns []); same stat+value from this
slot refreshes/overwrites rather than co-stacking. Plus a flatDamage hit of 256.17% of ATK, category 'skill',
noRange (all flatDamage is hard-forced noRange in the engine), crit on by default, no core. **(b)** ~~When the
owner casts her Burst (trigger `burstCast`): a DoT of 1687% of ATK every 3 sec for 10 sec, noFb~~ — **STALE, see
§2.1.**

**burst.** ■ When the owner casts her Burst (Burst III, 40s CD; trigger `burstCast`). Affects self: Element
Advantage Damage ▲ 130% for 10 sec — `elemAdvantageDamagePct` sits in the element bucket by default and is live
ONLY while the owner is elementally advantaged, so it is inert vs a neutral/non-weak boss. Affects the enemy:
deals 1407.64% of ATK as burst damage — flatDamage is hard-forced noRange and burstCast damage is excluded from
the +50% Full Burst major (resolves pre-FB at the cast instant); crit on by default, no core. Also applies
ATK ▼ 5.02% to the enemy for 10 sec — INERT in the sim: enemy debuffs other than damageTaken/distributed are
dropped in applyEffect (boss DEF=0, single partless boss), so this line is a no-op.

**codeDrivenSurprises (blind, still valid):**
- skill1's `fullBurstEnter` has no own-burst gate → fires on EVERY team Full Burst, not just this unit's own — it would over-fire in a multi-B3 comp relative to a "when this unit bursts" reading.
- skill1's `maxAmmoPct` is NEGATIVE (−50.66): a Max Ammunition ▼ penalty; the engine clips the live belt down to the new max the moment it lands.
- The burst's enemy ATK ▼ 5.02% debuff is completely INERT (applyEffect only routes damageTaken/distributed to enemyBuffs; all other enemy debuffs are dropped).
- ALL flatDamage hits (256.17% and 1407.64%) are hard-coded noRange regardless of the override — never receive the +30% range bonus.
- burstCast-sourced damage (1407.64% nuke) is excluded from the +50% Full Burst major (resolves at the cast instant before FB begins).
- skill2's `lastBullet` block uses target `enemy` (resolveTargets → []); the damageTakenPct reaches the boss only because applyEffect special-cases enemy damageTaken into enemyBuffs, while the flatDamage simply deals owner damage to the single boss.
- elemAdvantageDamagePct (+130%) lives in the ELEMENT bucket and only contributes while advantaged — inert vs a non-advantaged boss.
- skill2 damageTakenPct (10.01%) refreshes/overwrites on re-trigger (same stat+value+slot+caster) rather than co-stacking.

### 2.1 Driver correction — the 2026-07-23 re-encode (the one stale part)
The 1687% rider is **NOT** a burstCast DoT. In the current code it is a **`lastBullet`-triggered `flatDamage`
1687% GATED on `requiresTargetStatus:"Designated Target"`**: the burst applies the **Designated Target
`targetStatus`** to the boss for 10s (new in the re-encode), and the 1687% rider fires **only on last bullets
inside that window**. Driver probe confirms: **12/12** of the 1687% riders land inside a privaty burst+10s
window, and there are last bullets out-of-window where it correctly does NOT fire. Like the 256.17% rider it is
noRange, crit at caster rate, no core. (The Jul-20 blind view predates this re-encode; everything else in §2
matches the current code.)

---

## 3. Driver's executive summary
Privaty is **faithfully modeled** (gauntlet verdict GO, faithfulness 1.0, 0 real gotchas). The override encodes:
- **S1** — `fullBurstEnter` team buffs to all 4 allies for 10s: `atkPct 23.61`, `reloadSpeedPct 51.16`,
  `maxAmmoPct −50.66`, `attackDamagePct 20.16`. The Max-Ammo cut is the load-bearing tandem: halving the magazine
  during Full Burst roughly doubles her last-bullet frequency, which gates all of S2.
- **S2** — two `lastBullet` riders on the boss: `damageTakenPct 10.01` (10s team-wide debuff) + `flatDamage 256.17`
  (ungated, every last bullet); and `flatDamage 1687` **gated on the Designated Target status** her burst applies
  (fires only in the post-burst 10s window).
- **Burst** — `burstCast` self `elemAdvantageDamagePct 130` (10s, live only when advantaged); `flatDamage 1407.64`
  nuke (FB-exempt by cast timing); applies the Designated Target `targetStatus` (10s) that opens the S2 1687 gate.
- **Unmodeled (inert):** the 3s stun and the boss ATK ▼5.02% (boss never acts; ATK feeds no player-damage path).

**How it was validated:** driver test (17 assertions, GREEN vs the shipped override, with counterfactuals that
provably diverge) → adversarial blind test-faithfulness reviewer (converged 9/11 lines) → blind test-writer +
blind override-writer (both re-derived the kit from the prose **leak-free** and converged with the driver,
including the load-bearing 1687 gate) → reconciling judge (GO). The single mechanical RED was a test artifact
(boss debuffs emit `casterIdx=null`/`targetIdx=null`), not an encoding divergence.

**Engine findings surfaced:** `noFb` is INERT under the default FB-by-timing rule and is rejected by
`validate-overrides` (so the faithful FB-by-timing model is forced); boss debuffs emit `casterIdx=null` AND
`targetIdx=null` (filter them by stat+value); the `types.ts` schema leaked the unit's answer via a stale comment
(now stripped by the redaction step).

---

## 4. Owner spot-checks (the honest residual)
This GO is **same-model only** — every reviewer was the same Qwen model, so it rules out idiosyncratic error but
NOT systematic shared-prior misreads (the same-model limit, `docs/kit-autonomy-decisions.md` §14.1). Please eyeball:
1. **The 1687 Designated-Target gate** — the highest-value structural read; both blind re-derivations converged on
   it from the prose, but it is exactly the kind of trigger/gate subtlety a shared prior could miss.
2. **The Max-Ammo ▼ tandem** (S1 halves magazines → doubles S2 last-bullet procs) — the highest-risk "looks
   defensive but is damage" line.
3. **Measurement-gated magnitudes** — 256.17 / 1687 / 1407.64 / 130 match the prose exactly but are not
   independently re-measured here; the gauntlet certifies STRUCTURE, not numbers.
4. **Board:** privaty reads **HOT (mean 1.099, N=3, ±15% band)** — this is **fit-exposure, not encoding** (the
   over-model the removed `noFb` calibration had been hiding). Faithful>fit ⇒ the encoding is NOT reverted; the
   residual is a separate per-unit localization thread.
