# Manual review — maxwell-ordinary-mechanic (Maxwell: Ordinary Mechanic)

**Gauntlet date:** 2026-07-31
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (weapon-swap + Overcurrent stack resource + HP-scaling ATK + `stageEnter:3` gate + per-shot gauge fill; the Overcurrent charge-time ladder is a stack-indexed cadence)

> Slug disambiguation: `maxwell-ordinary-mechanic` (aka "mom") is the Missilis SR/Wind **Supporter**
> (Burst II, cd 20s, datamine `resource_id 105`, `original_rare SSR`) — a VARIANT whose base counterpart
> is the SR/Iron Attacker `maxwell` (Burst III). lint-slug-disambiguation passed clean on the full
> colon-form name (the raw slug token false-positives the lint; the colon-form is unambiguous). She had
> NO prior override (`simSupported: false`) — she could not sim at all before this gauntlet. This is a
> from-scratch MODEL_ONLY build (no recording).

## Kit summary

Maxwell: Ordinary Mechanic is a Wind sniper Supporter (Burst II) whose kit wraps a self-ATK-stacking
burst DPS around a team buff package. Every Full Charge attack (an SR full-charges every trigger pull)
grants ALL allies Max HP ▲1% of _her own_ max HP, stacking up to 30× permanently, and fills the team burst
gauge by 7.15%. Whenever any ally enters Burst Stage 3 she gives the team +10% Attack Damage for 5s. When
she casts her own Burst II she grants all allies ATK ▲1% of _her final_ max HP for 15s and gains a
permanent +30% ATK "Overcurrent" stack on herself (up to 5 stages = +150%). The burst also swaps her weapon
to the Matis UberBuster — a 1-round piercing cannon hitting at 350% of final ATK with a 300% full-charge
multiplier — whose **fixed charge time shortens with her Overcurrent stage** (Stage ≤1 → 3s, 2 → 2.5s,
3 → 2s, 4 → 1.5s, ≥5 → 0.4s), and the same cast buffs the team's Attack Damage by +25% for 10s. The sim
models all eight lines; the Overcurrent stage is a live resource pool the swap's charge-time ladder reads
via five `resourceGate`-banded weapon-swap blocks (the laplace-ultimate-hero `oeStage` exemplar).

## Line-by-line

| Line                                                               | Disposition    | Notes                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1-A: Full Charge → allies Max HP ▲1% of user, ×30, continuous     | FAITHFUL       | `shotFired` → allies `casterMaxHpPct 1` maxStacks 30 (re-emits flat `maxHpFlat` keyed to caster); ally grants offensively inert (e3 rule) — only mom's OWN stacks feed her own S2-A; M1 pins per-shot/cap-30/all-ally/no-expiry |
| S1-B: entering Burst Stage 3 → allies Attack Damage ▲10%/5s        | FAITHFUL       | `stageEnter:3` → allies `attackDamagePct 10`/5s (fires on ANY B3 cast, not mom's own B2); M2 pins frame-set equality with the B3 caster vs the burstCast counterfactual                                                         |
| S2-A: Burst → allies ATK ▲1% of user's FINAL max HP/15s            | DOCUMENTED_GAP | `burstCast` → allies `atkOfMaxHpPct 1`/15s; primitive resolves vs each TARGET's OWN max HP, not the caster's — exact for mom (self===caster), approximate for allies (flag-1); no caster-HP-as-ATK primitive exists             |
| S2-B: Burst → self Overcurrent ATK ▲30% continuous, ×5 stages      | FAITHFUL       | `burstCast` → self `atkPct 30` maxStacks 5 (continuous) + parallel `overcurrent` resource pool (cap 5) the ladder reads; M4 pins self-only/cap-5/no-expiry + ally-re-scope counterfactual                                       |
| S2-C: Full Charge → fills Burst Gauge 7.15%                        | FAITHFUL       | datamined gauge gen in `data/gauge-per-shot.json` `flatPerTrigger 715` (helm convention — the gauge pipeline emits no event, pinned by data-file read); M5 pins 715                                                             |
| Burst-A: swap Matis UberBuster 350%/FC 300%/ammo 1/Pierce          | FAITHFUL       | `burstCast` → self `weaponSwap` damagePct 350 / chargeMultPct 300 / maxAmmo 1 / hasPierce (swap-scoped) / durationSec 10 (⚑ flag-2); M6 pins 350/×3.0/normal-bucket + 175%/charge-100% counterfactuals                          |
| Burst-A: charge time fixed by Overcurrent stage (3/2.5/2/1.5/0.4s) | FAITHFUL       | FIVE `resourceGate`-banded `weaponSwap` blocks on the `overcurrent` pool (max:1→3s, 2→2.5s, 3→2.5s… min:5→0.4s); slot order makes cast N's stack count for cast N; M8 pins acceleration vs a fixed-3s counterfactual            |
| Burst-B: Burst → allies Attack Damage ▲25%/10s                     | FAITHFUL       | `burstCast` → allies `attackDamagePct 25`/10s; M7 pins value 25 (≠10) / 600f (≠300f) / mom's cast frames + removal counterfactual                                                                                               |

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. Independently derived all eight
  lines as FAITHFUL with the same three couplings the driver documented: (1) S1-A's SELF Max-HP stacks feed
  S2-A's "final max HP" conversion (caster===target self-grant feeds even though ally grants don't); (2) the
  Overcurrent stack count is a live resource read by the burst charge-time ladder; (3) UberBuster swap shots
  ARE Full Charge attacks so they keep proccing S1-A stacks + the 7.15% gauge fill. It also flagged the
  fixture trap (a B2 unit must actually be in the B2 rotation slot). On the charge-time ladder the reviewer
  marked it FAITHFUL + load-bearing and "encodable as resourceGate-banded weaponSwap blocks over an
  'overcurrent' pool" — expecting an EMPTY unmodeled set. CONVERGED on all 8 lines.
- **S5 (claude-opus-5, blind test):** `leakDetected:null`. Independently wrote a counterfactual spec from the
  prose. Run vs the DRIVER override (via `blind/maxwell-ordinary-mechanic.adapted.test.ts`, adapted only to
  re-point the harness import — no assertion changed): **21 passed / 17 failed / 4 skipped (42 total).** The
  17 reds are ALL the blind's OWN pre-declared fixture trap: it chose `controlComp(SLUG, true)` =
  liter/crown/mom/helm, and crown is ALSO Burst II, so crown holds the single stage-2 slot and mom casts her
  burst 0 times — every burst-keyed group is VOID, not refuted (the blind stated this verbatim in its header).
  Every group that CAN fire is GREEN: S1-A (per-shot trigger, cap 30, all-ally scope, continuous, 1% base HP),
  S1-B (stage-3 entry, pre-FB, all allies, binding 5s window), and the B1 STATIC structure checks — including
  "the Overcurrent charge-time LADDER is modeled: 3/2.5/2/1.5/0.4s" and "stage-gated on an Overcurrent
  counter, not on time or mode" — so the blind INDEPENDENTLY derived the resourceGate ladder the driver shipped.
- **S6 (claude-opus-5, blind override):** `leakDetected:null`. Converged with the driver on 7 of 8 lines
  (S1-A `casterMaxHpPct 1`/×30; S1-B `stageEnter:3` AD 10%/5s; S2-B `atkPct 30`/×5 self; S2-C gauge 7.15%;
  burst swap 350/FC300/ammo-1/Pierce-swap-scoped; burst-B AD 25%/10s). On S2-A it hit the SAME schema wall as
  the driver (parked a `casterAtkPct` placeholder flagged magnitude-wrong; the driver's `atkOfMaxHpPct` is the
  strictly better available primitive). On the charge-time ladder it SKIPPED it as a single-value 2s
  approximation, flagged it as "the single largest modeling error in the override," and prescribed EXACTLY the
  recipe the driver implemented: "a resourceGate on an Overcurrent resource pool with one swap block per rung."
  The blind did not know the laplace multi-band pattern; the driver enacted the blind's own prescribed fix.
- **S7 (kimi-code/k3, binding judge):** **GO, faithfulness 1.0, discriminationOk:true, gotchas:[].** All eight
  lines accounted (7 FAITHFUL + 1 DOCUMENTED_GAP = the S2-A caster-HP basis), zero silent drops, `unmodeled`
  empty. The judge independently confirmed the S5 17 reds are "the fixture collision it pre-declared … a
  blind-fixture RECON_ERROR, not a driver divergence," and called the double-blind convergence on the
  resourceGate ladder "the strongest evidence this gauntlet produces." Discrimination confirmed on every
  load-bearing axis (stageEnter vs burstCast frame sets; fixed-3s ladder counterfactual; 175%/charge-100%
  swaps; ally-re-scoped Overcurrent), fire-rate checks pass (per-shot HP stacking to cap 30, per-cast
  Overcurrent to cap 5, swap cadence accelerating across bursts).

## Residual flags for owner

1. **⚑ flag-1 — S2-A caster-vs-own Max HP basis (MODEL_ONLY schema gap).** The kit reads "ATK ▲1% of the SKILL
   USER'S final max HP" (caster-scaled, equal flat ATK on every ally), but the only ATK-from-HP primitive
   (`atkOfMaxHpPct`) resolves against each TARGET'S OWN final max HP. Exact for Maxwell herself (self===caster,
   the load-bearing self-feed off her S1-A stacks); for allies it substitutes their own Max HP for the caster's.
   ESTIMATE: per-ally ATK error = 1% × (allyMaxHp − casterMaxHp), second-order (Max HP is broadly gear-correlated
   across a tuned team); does NOT change Maxwell's own damage. RECIPE: focus popup-read an ally's ATK-buff
   magnitude next to Maxwell's Max HP in a recorded comp to confirm caster- vs own-scaling; a faithful encoding
   needs a `casterMaxHpAsAtkPct` StatKey (or extending `atkOfMaxHpPct` to accept a caster-scoped ally grant).
   TIER: MODEL_ONLY (no measurement). Both blinds converged on this gap.
2. **⚑ flag-2 — swap duration (MODEL_ONLY).** The prose gives no explicit weapon-change duration; modeled at
   `durationSec 10` = the Full Burst window (datamined `burst_duration 1000`, the standard burst-mode weapon
   length). ESTIMATE: 10s. RECIPE: focus recording of how long the UberBuster stays equipped after the B2 cast.
   TIER: MODEL_ONLY.
3. **Overcurrent order-of-operations (kit-ambiguous, documented).** The engine's slot order (skill2 before
   burst) makes the Overcurrent stack gained on cast N count for cast N's charge-time ladder (cast 1 → stage 1
   → 3s … cast 5 → stage 5 → 0.4s). The inverse (pre-increment) reading would lag the ladder one cast; the kit
   is ambiguous and the kit-natural reading is enacted. Spot-check the per-burst charge time in a recording to
   confirm whether the stage gained on a cast applies to that cast's swap.
4. **ammo-1 reload shot economy.** With `maxAmmo 1` the UberBuster reloads between every swap shot
   (reloadFrames 141 ≈ 2.35s); at stage 5's 0.4s charge the reload dominates the per-shot cycle, so the late-fight
   swap-shot count (and thus the ladder's damage value) rides the datamined reload time. The ladder's STRUCTURE
   is kit-exact and pinned; the absolute shot count per window inherits the standard reload-cadence ⚑.
5. **Pierce inert at scope lock.** `hasPierce` is swap-scoped (not a whole-fight tag) and is bucket-eligibility
   only — with no Pierce Damage ▲ carrier in a single-target comp it moves zero damage (PIERCE_CORE_DOUBLE off).
   Tagged for kit completeness.
6. **Cadence tuple unverified.** SR fire cadence (chargeFrames 60 / reloadFrames 141 / ammo 6) is datamine;
   rate_of_fire/reloadFrames are known-unreliable fields. Affects mom's baseline weapon DPS + the swap-shot
   economy, not the kit-line structure.
