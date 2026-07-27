# moran — kit-autonomy gauntlet manual review (2026-07-25)

**Unit:** Moran (`moran`) — AR / Defender / Electric / Burst I, TREASURE, Tetra. cd 40s, ammo 60, AR mult 14.71.
**Verdict:** **GO** (cross-family corroborated) · faithfulness **1.0** · tier **2** · discriminationOk **true**.
**Cross-family:** S2b `claude-fable-5` (pre-op test review) · S5/S6/S7 `claude-opus-5` (blind test / blind override / binding judge).

## What changed (the one edit)

**S3 faithfulness fix (kit-status F2):** the Skill-1 47.18%-of-final-ATK per-5-hits rider gate changed
`fbGate:"inFb"` → `swapGate:"swapped"` (the exact, previously-unused primitive at `src/skills/types.ts:332`
/ `sim.ts:1684`).

- The kit text gates the rider to "while weapon is changed" = her **burst weapon-swap window**. As Burst I,
  her swap opens at her **own** cast, which lands **before** the Full Burst window opens (the B1→B2→B3 chain
  must finish first). The two 10s windows are OFFSET, so `inFb` both missed the pre-FB swap gap
  `[cast, fbOpen)` and over-ran the swap tail. `swapGate:"swapped"` fires the rider faithfully inside
  `[burstCast, +10s]`.
- **Probe:** 3 rider hits land pre-FB at 4.70 / 5.12 / 5.53s (FB opens 5.73s); under the old `inFb` gate that
  count is **zero**. Total rider count near-identical (270 inFb vs 273 swapped, ~1% total delta).
- This is a **timing / faithfulness fix, board-neutral** — explicitly **NOT** a fix for her 0.66 COLD (that is
  a throughput residual; see below). Board unchanged: 0.661 COLD before and after.

## Cross-family convergence (why this is high-confidence)

All three independent agents (driver + fable S2b + opus S6) derived the **identical load-bearing encoding**,
including the `swapGate:"swapped"` fix:

| Line                     | Encoding                                                   | Convergence                |
| ------------------------ | ---------------------------------------------------------- | -------------------------- |
| S1 47.18% / 5 hits rider | `hitCount:5` + `swapGate:"swapped"` + `flatDamage 47.18`   | driver = S2b = S6 (triple) |
| Burst weapon swap        | `weaponSwap 14.7% / 10s` (REPLACIVE) + `unlimitedAmmo 10s` | driver = S6                |
| Burst team ATK           | `casterAtkPct 42.57% / 10s` (flat caster add, all allies)  | driver = S2b = S6          |
| S2 team burst-CDR        | `fullBurstEnter` → allies `burstCdr 7.48`                  | driver = S2b = S6          |
| S1 Fervor                | `burstCdr 20` per cycle (effective ~15s CD; 12 casts/180s) | driver (measured)          |

**Both catastrophic traps on this kit were avoided AND proven avoided:**

- `Damage Taken ▼35.14%` is encoded as a **negative ally-held** buff (48 applies across the 4 ally slots, never
  the boss); removing it leaves every unit's total **byte-identical** under two independently written tests.
  The trap (mapping it to a positive boss debuff → ×1.35 team multiplier) did not happen.
- `ATK ▲42.57% of the skill user's ATK` resolves to a **flat `casterAtkPct`** off Moran's low Defender ATK, not
  a target-scaled `atkPct`.

## Line inventory (14/14 accounted: 6 FAITHFUL + 8 DOCUMENTED_GAP)

FAITHFUL: S1 47.18% rider (swap-gated) · S1 Fervor burstCdr 20 · S2 team burstCdr 7.48 · burst weaponSwap 14.7/10s
· burst unlimitedAmmo 10s · burst casterAtkPct 42.57/10s. (burst damageTakenPct −35.14 is modeled inert-for-fidelity,
proven zero-damage.)

DOCUMENTED GAP (inert at scope lock, recorded verbatim in `unmodeled`): S1 DEF-per-HP-lost (HP-gate, boss deals no
damage → 0; defPct inert) · S2 final-bullet taunt · S2 Perseverance Max-HP tiers (HP-gate, no atkOfMaxHp consumer) ·
burst lifesteal 36.14% (self-only, no recovery consumer, doesn't reach allies) · burst Attract taunt · burst no-cover
· burst DEF▲14.85% of caster DEF (no casterDefPct stat; defPct inert).

## Blind-test reconciliation (S5: 17 GREEN / 3 RED / 6 SKIP vs driver override)

The 3 REDs are **non-findings**, adjudicated by the judge:

- **(2 cadence reds) fixture-induced.** The blind test used `controlComp('moran')` = liter/crown/moran/helm, which
  fields liter AND moran as **two Burst-I casters**. Proven (`.moran-probe3.ts`): moran is the secondary B1 there —
  she casts only 5× **whether Fervor is present or not** (liter wins the slot at 10×), so the cadence-delta
  assertions cannot fire. In the driver's **sole-B1** fixture (moran/crown/ada/helm) the same lines read cleanly:
  Fervor 12→6 casts, team CDR crown 12→9.
- **(1 structural red) encoding-style.** The blind test asserts Fervor is a battle-start passive; the driver models
  it as `burstCdr`-20 on her own `burstCast` (re-applied every cycle). The driver encoding is the **measured-correct**
  reading (override note: Run-B video, "she bursts every rotation"); a continuous cooldown _floor_ has no engine
  primitive — which the blind writer itself conceded in its skip note. (The blind _override_ even fell into the
  exact nearest-wrong S2b named — a `oncePerBattle` passive — while the blind _test_ asserts against it.)

## Residual ⚑ (owner spot-check cluster)

1. **Swap shot-economy / `pullsPerSec` (kit-silent, the big one).** Estimate: **base AR 12/s** (MEASURED from
   `moran control.mov` 60fps frame read). The 24/s datamine (`shot_id 1028102`, `rate_of_fire 1440`) was
   **board-REFUTED** (0.712 COLD → 1.325 HOT) and backed out rather than fudged. Recipe: an **isolated moran-solo
   recording**, OR the datamined `shot_count`/`muzzle_count` for swap weapon `1028102`, to pin the throughput
   multiplier behind her 0.66 COLD. Tier: MEASURED-throughput (footage-blocked; per-shot reconciles to the formula
   to 0.3%, so this is hits-landed, not per-shot).
2. **Rider crit-eligibility (S7 low gotcha — resolved).** Driver leaves `crit` blank; blind set `crit:true`.
   Resolved by engine default (`sim.ts:1844` `crit: e.crit !== false` → flatDamage crits by default) + dominant repo
   convention (most flatDamage riders leave `crit` unset). Blank = `crit:true`, behaviorally identical. Documented in
   the override note; no encoding change, no board movement.
3. **`hitCount:5` counter semantics under `swapGate`.** The 270/1369 ratio (≈1 per 5.07) and the 4.70s first proc are
   consistent with the counter accruing swapped hits only; a global counter with output-gating would produce nearly the
   same count, so this is inferred rather than isolated. Low impact.
4. **Fervor as a named STATUS is not modeled** — Skill-2's "while in Fervor" gate is treated as permanently satisfied
   (correct on a solo boss where Raptures are always present). Would silently over-credit only if Fervor ever became
   consumable/windowed.

## Artifacts

- Driver test: `scripts/tests/units/moran.test.ts` (14/14 green post-S3).
- Override: `src/skills/overrides/moran.json` (the F2 fix + gauntlet provenance in `note`).
- Verdict: `scripts/kit-autonomy/results/moran.json` (binding judge GO / 1.0).
- Cross-family: `scripts/kit-autonomy/cross-family/moran/` (s2b/s5/s6/s7 packets + results), `reviews/moran.test-review.json`,
  `reviews/moran.verify.txt`, `blind/moran.test.ts`, `blind/moran.override.json`.
