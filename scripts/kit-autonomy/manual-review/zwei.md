# zwei — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Zwei (`zwei`) — Electric · SG · Supporter · Burst I · 20s CD · ammo 9 · reloadFrames 111 ·
chargeFrames 0 · hitsPerShot 10 · normalMult 201.5 / coreMult 200 · treasure · Elysion.

**Verdict:** 🟢 **GO** · faithfulness **0.9** (8/8 lines FAITHFUL or documented UNMODELED; 0 real gotchas) ·
**cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen. Score docked
1.0→0.9 solely for the load-bearing `gainPierce` fork on which 2 of 4 agents split (adjudicated; footage-gated).

---

## 1. Real kit (data/characters.json — ground truth)

- **S1** ■ entering Full Burst → all allies: Pierce Damage ▲ 20.13% for 1 round(s) · Pierce Damage ▲ 10.06% for 10 sec.
  - ■ normal attack during Full Burst → all allies: Pierce Damage ▲ 24.99%, stacks up to 3, for 1 round(s).
- **S2** ■ after 5 normal attacks → all allies: Restores 7.52% of Cover HP.
  - ■ entering Full Burst → all allies: Critical Rate ▲ 18.63% for 10 sec.
  - ■ normal attack while in Pierce Attacks 101 status → all allies: Critical Rate ▲ 15% for 5 sec, stacks up to 3.
- **Burst** ■ self: Changes the weapon in use — Charge Time 1.2s · Damage 50.69% of final ATK · Full Charge Damage
  300% of damage · Max Ammunition Capacity 1 · Additional Effect: Pierce.
  - ■ all allies: Pierce Attacks 101: Pierce Damage ▲ 25.03% for 10 sec.

---

## 2. What the code does (the faithful override, line by line)

- **S1a** `fullBurstEnter → allies → pierceDamagePct 20.13, durationShots:1` — a ROUND count (holder-scoped, no
  wall-clock expiry), NOT the stale parser-baseline `durationSec:5`. **This was the primary FIX** (the `durationShots`
  primitive now exists; helm carrier). Coexists with the 10.06 line as a distinct buff (additive 30.19% early FB).
- **S1b** `fullBurstEnter → allies → pierceDamagePct 10.06, durationSec:10` — timed.
- **S1c** `shotFired + fbGate(inFb) → allies → pierceDamagePct 24.99, durationShots:1, maxStacks:3` — per-Zwei-normal-
  attack-in-FB; round-count per stack (so stacks rarely accrue to 3 in-fight — the CAP is 3, the accrual is cadence-
  limited; S2b predicted this exactly).
- **S2a (Cover HP)** **UNMODELED** (documented verbatim in `unmodeled.skill2` + caveats). No cover/HP pool in the
  partless-boss sim; whether cover repair fires ally 'recovery' triggers is an UNVERIFIED hypothesis. Modeling it as a
  `heal` would pump crown's on-recovery tandem (+20.99% AD) every 5 Zwei shots off an unmeasured mechanic (measured>
  fudge). 3 of 4 agents (driver, fable, opus-S5-skipped) converged on UNMODELED; opus-S6 modeled it as heal.
- **S2b** `fullBurstEnter → allies → critRatePct 18.63, durationSec:10` — GENERIC crit (plain "Critical Rate ▲"),
  correctly NOT the scoped `critRateNormalPct`; lifts crit on skill/burst buckets too.
- **S2c** `shotFired + swapGate(swapped) → allies → critRatePct 15, durationSec:5, maxStacks:3` — the "while in Pierce
  Attacks 101 status" gate is proxied by `swapGate(swapped)` (no ally-held-buff-state gate primitive exists). The swap
  and the PA101 status both originate at Zwei's burstCast and share the ⚑10s window; swapGate also correctly stays
  silent on rotations Zwei does NOT burst (superior to fbGate in multi-B1 comps). Ungated, this line is the single
  largest over-credit in the kit (+45% team crit permanently) — correctly avoided.
- **Burst-self** `burstCast → self → weaponSwap{damagePct:50.69, chargeTimeSec:1.2, chargeMultPct:300, maxAmmo:1,
hasPierce:true, durationSec:10⚑}` — charge cannon; `hasPierce` is SWAP-SCOPED ("Additional Effect: Pierce" on the
  changed weapon), NOT a unit-wide flag (her normal SG shots are not pierce-tagged). All three classic swap near-misses
  avoided (chargeMultPct present → ~152% full-charge not 50.69%; hasPierce present; windowed not permanent).
- **Burst-allies** `burstCast → allies → pierceDamagePct 25.03, durationSec:10` — the "Pierce Attacks 101" status;
  burstCast timing (pre-FB, only on rotations Zwei bursts); this is the window the S2c gate reads. **No `gainPierce`**
  (see §3 — the adjudicated fork).

All `pierceDamagePct` feeds the Damage-Up bucket ONLY on pierce-tagged hits (engine sim.ts:1400-1401): pierce carries

- Zwei's own swapped cannon shots. Inert on non-pierce allies by design. (The schema's "parsed but inert in v1" comment
  on `pierceDamagePct` is STALE — the plumbing is live; the judge confirmed.)

---

## 3. The adjudicated fork — `gainPierce` on "Pierce Attacks 101" (OWNER FOOTAGE ACTION)

- **Driver + S2b(fable):** `pierceDamagePct 25.03` only, **no grant**. **S5 + S6 (both opus):** `gainPierce(allies,10s)`
  - `pierceDamagePct 25.03` (the status NAME "Pierce Attacks 101" denotes granting pierce; whole-picture — without a
    grant the pierce package is inert on non-pierce allies).
- **Judge (opus) UPHELD the no-grant reading.** Decisive evidence: the SAME burst block uses the explicit pierce-grant
  vocabulary "Additional Effect: Pierce" for Zwei's swapped weapon, but "Pierce Damage ▲ 25.03%" for the ally line — the
  designers had the grant wording in hand and chose a damage-bucket stat. Inferring a team-wide pierce grant from a
  status name is a measured>fudge violation. Whole-picture holds: Zwei still buffs real pierce carries + her own swap
  shots, AND provides UNCONDITIONAL team crit (18.63% + 15%×3) — she is not useless.
- **⚑ FOOTAGE ACTION:** confirm whether allies' shots visibly pierce after Zwei's burst. If YES, add
  `gainPierce(allies, swap-window)` to the burst ally block — the whole pierce package lights up on any team (a large
  upward re-model). Documented as a footage-gated hypothesis, not dropped.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **`gainPierce` (§3)** — the load-bearing fork; 2/4 agents split; footage-confirm the pierce grant. (trigger-identity / scope)
2. **Burst swap duration + shot economy** — kit-silent; authored 10s to match the PA101 window, ~3 full-charge
   shots/window (1.2s charge + 1-ammo reload at 111f). Datamine `duration_value: "1 Shot"` is ambiguous (a 1-shot swap
   vs a 10s window) — footage-gated. (duration-semantics)
3. **Cover-HP → recovery hypothesis (S2a)** — if cover repair fires ally 'recovery' triggers in-game, re-model S2a as a
   `heal` (shotFired everyN 5); currently UNMODELED to avoid an unmeasured crown tandem. (tandem / scope)
4. **S2c gate proxy** — `swapGate(swapped)` is exact only when the swap window == the 10s PA101 status window; pin the
   real active window from footage. (trigger-identity)
5. **Swap weapon range-band/core eligibility** (charge cannon on an SG base) is an SR-like guess; base SG cadence tuple
   is datamine-unreliable.

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): converged on 7/8 load-bearing lines; surfaced the `swapGate` proxy (adopted) and
  the cover-HP UNMODELED call (adopted); did NOT infer gainPierce (agreed with driver).
- **S5** (opus, blind test): 15/19 green vs driver override; 3 RED classified — Z6 RECON_ERROR (over-tight 2% tolerance
  vs a documented ~2.87% cadence residual), Z7×2 the gainPierce fork (adjudicated). Converged on cover-HP skip.
- **S6** (opus, blind override): converged EXACTLY on skill1 (both blocks, durationShots:1), S2 FB-enter crit, and the
  burst swap (swap-scoped hasPierce, chargeMultPct 300, maxAmmo 1); diverged on gainPierce (added), cover-HP (heal), gate (fbGate).
- **S7** (opus, judge): GO 0.9, gainPierce adjudicated no-grant, discrimination OK, fire-rate check passes, no REAL-GOTCHA.

## 6. Board / fit note (non-gating)

Zwei is MODEL_ONLY (no recording) — no board score. The faithful encoding moved her modeled damage 93.2M → 61.2M vs the
parser-baseline: removing the unit-wide `hasPierce` over-credit (pierce now swap-scoped), removing the cover-HP→crown
tandem pump, and tightening the "1 round" lines from `durationSec:5` to `durationShots:1`. This is faithful<over-credited
movement (the baseline over-credited), NOT a reason to revert — unit tests pin faithful; a future recording pins accurate.
