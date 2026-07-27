# Manual review — `scarlet-black-shadow` (Scarlet: Black Shadow, "sbs")

**Kit-autonomy gauntlet 2026-07-25 · VERDICT: GO · faithfulness 1.0 · Tier 2 · cross-family corroborated**

RL / Attacker / Wind / Burst III (Pilgrim, cd 40s, ammo 9, chargeFrames 18, chargeMultiplier 150).
**This is the RL/Wind OVERSPEC variant — an entirely different unit from the AR/Electric base (slug
`scarlet`). Never conflate them (P0).**

## What was verified

All 11 kit lines re-derived **FAITHFUL**; both `unmodeled` arrays empty (nothing silently dropped).
Driver test `scripts/tests/units/scarlet-black-shadow.test.ts` — **19 tests GREEN** vs the shipped
override, each with a nearest-wrong counterfactual.

| Line                               | Encoding                                                                             | Pin                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| S1 activates on Full Charge        | `chargeCounter` (advances only when `charged`)                                       | B1 consistency pin (see caveat below)                                                        |
| S1 "only one effect at a time"     | one block, `effects[phase]` cycling 0→1→2                                            | B2 — value sequence is the exact 283.03→565→848.03 cycle, no two procs/frame                 |
| S1 3× 283.03% single               | `flatDamage` 283.03, plain                                                           | B3 — post-patch value (not pre-patch 250.47)                                                 |
| S1 6× 565% Distributed             | `flatDamage` 565, `flavor:"distributed"`                                             | B3 value + B4 flavor (structural + board-inert)                                              |
| S1 9× 848.03% Distributed          | `flatDamage` 848.03, `flavor:"distributed"`                                          | B3 value + B4 flavor; wrap to phase 1 (B2)                                                   |
| S2 on Full Burst entry             | trigger `fullBurstEnter`                                                             | B5 — maxAmmo applies == fullBurstStart count (12) > own casts (6); helm opens the other 6    |
| S2 Max Ammo +60% / 10s             | `buff maxAmmoPct 60 / 10s / self`                                                    | B6 — value/600f/self                                                                         |
| S2 Reload 100%                     | `instantReload fraction 1`, ordered AFTER the cap                                    | B7 — structural + behavioural (peak magazine 17 > 12 baseline; FB-window shots > no-effects) |
| Burst count-requirement 1/2/3      | `chargeCounter.countInFb 1`, gated on OWN `lastBurstCastFrame`                       | B10 — own-cast windows out-proc every helm-opened FB window; no-lowering counterfactual      |
| Burst ATK +115.12% / 10s           | `buff atkPct 115.12 / 10s / self` on `burstCast`                                     | B8 — count == own casts (6) < FB (12)                                                        |
| Burst Charge Damage +169.63% / 10s | `buff chargeDamagePct 169.63 / 10s / self` (additive, **not** `chargeDamageMultPct`) | B9 — stat identity + value                                                                   |

## Cross-family corroboration

- **S2b (claude-fable-5, clean re-dispatch — `leakDetected:null`):** converged on all 11 load-bearing
  lines. **De-contamination note:** the first S2b dispatch was contaminated — `types-redacted.ts`
  retained `src/skills/types.ts:73` (a `chargeCounter` comment naming SBS + `[3,6,9]`/`[1,2,3]` +
  848% rarity) because the driver's token list lacked those strings. Fixed by re-running
  `prepare-cross-family-packet.ts` with comma-free tokens (`Black Shadow` / `848` / `barely
materialise`); the contaminated result was superseded. Crucially, the **clean** reviewer
  independently derived the **cumulative** cadence (3/6/9 outside, 1/1/1 in-burst) = the shipped
  scalar model (the contaminated review had pushed per-phase gaps).
- **S5 (claude-opus-5, blind test):** 25 tests. Vs the driver override: 19 pass / 4 skip / 2 fail —
  **both failures are a blind RECON_ERROR** (`durationShots` `toBeUndefined()` vs the engine's
  `null`); with only that nullity corrected the file is **fully green (21 pass / 4 skip)**. The 4
  skips are documented blind gaps (multi-enemy Distributed split, target-set collapse to the partless
  boss, maxAmmo rounding has no event, the redacted 1/2/3 count-change trigger). No REAL-GOTCHA.
- **S6 (claude-opus-5, blind override):** all 16 lines IMPLEMENTED; converges on the full-charge
  phase counter, `fullBurstEnter`/`burstCast` split, additive `chargeDamagePct`, distributed
  full-value, reload-after-cap. Its only "divergence" (per-phase `[3,6,9]`/`[1,2,3]` + a 3-block
  split) dissolves: printed-cumulative IS the shipped scalar model, and the 3-block split is an
  artifact of the redacted `chargeCounter` identifier.
- **S7 (claude-opus-5, binding judge):** **GO, faithfulness 1.0.** `discriminationOk:false` for one
  narrow, non-gating reason (B1's every-shot discriminator is vacuous — see below).

## Flags for the owner

1. **MEASUREMENT-GATED — the "proc-count knot" (the one real open item).** The EXACT per-phase
   cadence: shipped **scalar** (`count 3` cumulative outside = 3rd/6th/9th charge; `countInFb 1` = a
   proc every charge in-burst) vs the **kit-literal per-phase** reading (3/6/9 outside, 1/2/3
   in-burst). The per-phase `[1,2,3]`/`[3,6,9]` model was tested and overshoots cold (~0.78 vs the
   ~1.13/1.18 N3 baseline); own-probe evidence is split (sbs-control: procs ~every charge in burst;
   N3 focus re-read: the 848% phase ABSENT from one confirmed window). The test pins the faithful
   STRUCTURE that holds under both readings and does **not** re-fudge the cadence.
   - **Recipe:** record an ISOLATED single-burst SBS clip (camera-focused, no entangling team damage);
     count her S1 proc popups — especially the distinct ~3.2M 848% phase — in one clean window.
     **Phase 3 is the discriminator: 9 total charges to phase 3 ⇒ cumulative; 6 ⇒ per-phase
     increments.** Resolve the ATK/rotation confound first (sim charge-normal 1.64M vs real 1.03M).
   - **Same-model residual:** every agent in this gauntlet except S2b is Opus, so the shared prior
     most likely jointly wrong is the **cumulative** reading — convergence proves stability, not
     correctness, here. The isolated-burst clip is the single measurement that settles it.
2. **Distributed-phase crit / Full-Burst / element are DISPUTED** (damage SSOT §1 per-type table).
   The 565% / 848.03% riders are encoded at the default (crit at caster rate, FB +50% by landing
   timing, element applied). Settle from the same isolated-burst clip: read popup COLOUR on those
   procs (crit = orange + icon) and their in-FB vs out-of-FB ratio. Board impact if crit is wrong is
   bounded (~base 15% × +50% on those instances). Now recorded in `caveats[2]`.
3. **B1 is a consistency pin, not a discriminator** (binding-judge note). SBS is an RL with
   `hitsPerShot 1` and auto-play always full-charges, so she has no non-charged pulls — an
   every-shot/`hitCount` mis-trigger would be extensionally identical and unobservable in v1. The
   `chargeCounter` encoding is still correct; the test comment now says so honestly.
4. **Kit-silent conventions (documented, not asserted):** the phase counter CARRIES its partial
   progress across the burst-window boundary (engine persists `phase`); `chargeFrames 18` cadence is
   an ALWAYS-⚑ field (datamine-unreliable) — video-settled 2026-07-15 per the override note
   (overcharge-to-150% firing vindicates 18f charge + 22f recovery = 40f cycle).

## Housekeeping applied (binding-judge, non-blocking; documentation/comment only — no value change)

- Relabeled test B1 as a consistency pin.
- Deleted the stale `caveats[0]` ("burst: unparsed effect …") — the count-requirement line IS modeled
  (`chargeCounter.countInFb`); trimmed the now-redundant clause in the old `caveats[2]`.
- Added the distributed-crit/FB caveat (`caveats[2]`).
- Appended the gauntlet note marker + summary to the override `note`.

**Board:** unchanged by this gauntlet (documentation-only edits; sim total 500.8M identical).
`scarlet-black-shadow` rank 34, n=2, mean 0.950 COLD (T1 wind-weak 0.82 / N3 1.08) — the COLD mean is
exactly what the proc-count knot must resolve.
