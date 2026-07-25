# sakura-bloom-in-summer — kit manual review

**Sakura: Bloom in Summer** (AR / Attacker / Wind / Burst III, cd 40s). Variant of base `sakura` — a
different unit; reasoned from the slug throughout. Kit-autonomy gauntlet **2026-07-25**.

**Verdict: GO · faithfulness 1.0** (5 FAITHFUL load-bearing lines + 3 DOCUMENTED_GAP part-destroy
lines). Cross-family corroborated: S2b `claude-fable-5`, S5/S6/S7 `claude-opus-5`, all converged.
Judge `gotchas: []`, `discriminationOk: true`. Tier **2** (scoped/duration-buff time-average +
stacking DoT + force-cast/interval timing). Driver test: `scripts/tests/units/sakura-bloom-in-summer.test.ts`
(19/19 GREEN). Board: **no row** — MODEL_ONLY, never fielded (not owned); the gauntlet certifies the
model's *structure*, not its magnitudes (no real fight to grade against).

## 1. Real kit (data/characters.json — ground truth, level-10 values)

- **S1 (Bloom):** ■ start of battle → self: *Forcefully uses Skill 2.* ■ on ally/self destroying an
  enemy part → self: Sustained Damage ▲5.1% / 30s. ■ part-destroy (if in Dancing Flower) → self:
  Dancing Flower Duration ▲10.02s. ■ part-destroy → enemies in Sakura Petals: Sakura Petals Duration ▲10.02s.
- **S2 (Full Glory):** ■ self: *Dancing Flower* — Attack Damage ▲15.64% / 15s. ■ highest-final-ATK
  enemy: *Sakura Petals* — 256% of final ATK sustained / 1s for 15s.
- **Burst (Ephemeral Splendor):** ■ random enemies: 457.14% of final ATK, *attacks sequentially 10
  times*. ■ same targets: 35.16% of final ATK sustained / 1s, *stacks up to 10 times*, lasts 10s.
- **Datamine:** `skillCooldownsSec.skill2 = 30` (owner-confirmed 2026-07-20 as a real re-activation
  CD), burst cd 40s, 720 rpm (= 12 pulls/s), reloadFrames 81, reload_start_ammo 59, ammo 60,
  normalAttackMultiplier 13.65. **Scope lock: partless single boss.**

## 2. What the code does (override + blind re-derivations)

`src/skills/overrides/sakura-bloom-in-summer.json` (parser baseline + owner-tuned 2026-07-20):

- **S1 force-cast** → the t=0 activation of both S2 blocks (a `passive`-trigger Sakura Petals dot +
  the Dancing Flower buff at frame 0). The three part-destroy lines are **UNMODELED-verbatim**
  (`unmodeled.skill1`): "destroys an enemy's part" can never fire on the partless scope-lock boss,
  and there is no `partDestroyed` TriggerDef nor any buff/DoT duration-extension primitive.
- **S2 Sakura Petals** → `dot atkPct 256, durationSec 15, intervalSec 1, flavor sustained, target
  enemy`, encoded as a t=0 passive dot + an `interval:30` dot (the 5 re-casts). Engine `interval`
  first-fires at t=sec, so this yields 6 windows [0-15],[30-45]…[150-165] = **90 ticks** (probe-verified).
- **S2 Dancing Flower** → `buff attackDamagePct 7.82`, passive (always-on). The engine cannot carry a
  wall-clock duration on a passive buff (sim.ts alwaysOn), so the 15.64%/15s-per-30s-CD buff is encoded
  as its **50%-duty time-average**: 15.64 × 90/180 = **7.82** (⚑3). It is `attackDamagePct` (the
  Damage-Up bucket), NOT `atkPct` — both blinds independently avoided that trap.
- **Burst nuke** → TEN `flatDamage atkPct 457.14, flavor sequential` in one `burstCast` block
  (4571.4% total per cast). This is the *fix* for the materialized-freeze ×10 loss (it had shipped
  457.14 once — the same misparse class as crown). The cast lands before the FB window → fbMajorApplied
  = false on all hits (probe-verified ×60).
- **Burst stacking DoT** → one `dot atkPct 351.6, durationSec 10, intervalSec 1, flavor sustained`
  per cast: all 10 sequential volley hits land on the single boss, so the DoT opens at **full 10
  stacks** = 351.6%/s from tick 1 (⚑4). dur 10 < burst cd 40 → no cross-cast overlap.

**Blind re-derivations:** the S2b reviewer (fable) and the S6 blind override (opus) both independently
re-derived the same structure — 256%/s sustained Sakura Petals DoT, ten-instance 457.14 sequential
FB-exempt burst, `attackDamagePct` Dancing Flower, three part-destroy GAP lines, no core/range. The S6
override diverged only where it lacked data: it assumed skill2 CD=15s (no datamine in its packet — its
own flag recipes "read skillCooldownsSec from the datamine," the field the driver holds at 30s), and it
under-credited the burst DoT as a single 35.16 instance (the driver's full-10-stack reading is the more
faithful one and is independently corroborated by the S2b reviewer).

## 3. Verdict & cross-family convergence

Binding judge verdict (`scripts/kit-autonomy/results/sakura-bloom-in-summer.json`): **GO, faithfulness
1.0, gotchas [], discriminationOk true.** Per-line: skill1 [FAITHFUL force-cast; DOCUMENTED_GAP ×3
part-destroy], skill2 [FAITHFUL Dancing Flower; FAITHFUL Sakura Petals], burst [FAITHFUL ×10 nuke;
FAITHFUL stacking DoT].

The S5 blind *test* ran **RED** vs the driver override (10 failed / 6 passed / 3 skipped), but the judge
ruled — and the driver verifies — that **every RED is RECON_ERROR or a documented driver-favorable
divergence, zero REAL-GOTCHA**:

- **8 RECON_ERROR (three blind helper bugs):** (1) `nearPct(ev,pct)` reads `ev.mult ?? ev.atkPct`, but
  `ev.mult` is the multiplier-decomposition *object*, so `Math.abs(object−pct)=NaN` and `nearPct` is
  false for every event — the correct field is `ev.atkPct`; (2) the `sustained` selector filters
  `bucket==='sustained' || flavor==='sustained'`, but damage events have neither (bucket ∈
  normal/skill/burst, no `flavor` field) — always empty; (3) the counterfactuals mutate
  `ov.skill2?.blocks` / `ov.burst?.blocks`, but the override file is slot-keyed (`override.skill2` IS
  the block array; no `.blocks`), so the patches are no-ops. The driver test proves each intent green by
  an independent method (first Sakura Petals tick at sec=1.00; 90 ticks in six 30s bands; 60 nuke hits
  at 457.14 with fbMajorApplied=false; zeroing Dancing Flower lowers her normal-damage total).
- **2 documented divergences (driver-favorable):** ⚑3 Dancing Flower 7.82 time-average vs the blind's
  15.64 (the blind lacked the datamined 30s CD; given it, the SSOT passive-buff rule mandates the 50%
  time-average and 15.64 would over-credit 2×); ⚑4 burst DoT 351.6%/s full-stacks vs the blind's 35.16
  single-instance (the S2b reviewer independently derived the same 10-stack opening; the blind's model
  under-credits 10× and flags the cap as unresolved).

## 4. Lines worth a human spot-check (the ⚑ flags)

- **⚑4 — burst stacking DoT application (highest value, ~0.55× on that block if wrong).** The
  full-10-stacks-from-tick-1 reading (351.6%/s) is a *derivation* from "stacks up to 10 times" + "the
  same targets" + the 10 sequential hits on a lone boss, not literal prose. **Recipe:** read the
  sustained tick popups immediately after her burst — flat ~351.6%-scale ticks from the first second =
  hit-applied (shipped); growing ticks (35.16 → 351.6) = a per-second ramp (×0.55 of shipped).
- **⚑3 — Dancing Flower time-average.** 7.82 = 15.64 × 90/180 smeared uniformly across a bursty damage
  profile. Faithful for her normal-heavy output; a second-order effect on the burst (which happens to
  land inside Dancing Flower windows in the control rotation). If the engine ever gains duration-carrying
  passives, **re-window** the buff (15.64 for [0-15],[30-45]…) rather than re-tune the 7.82.
- **⚑2 — skill2 re-cast cadence (owner-resolved 2026-07-20).** The datamined 30s CD is ruled a real
  re-activation → 6×15s windows (90s uptime). Residual: confirm the CD keeps re-casting uninterrupted
  for the whole fight (assumed yes) and the t=0 force-cast phase (the "Forcefully uses Skill 2" clause).
- **⚑1 — cadence tuple (data-file, not override).** 12 pulls/s (720 rpm datamine) + 81-frame reload +
  reload_start_ammo 59 are unverified estimates. **Recipe:** rounds/min + reload gap from any focus video.
- **⚑5 (low) — sequential flavor tag** on the nuke means teammates' Sequential Damage ▲ buffs scale it
  (text-derived).

## 5. Residual risk

- **Unmeasured magnitudes (MODEL_ONLY).** The gauntlet certifies structure, not numbers — sbis has never
  been fielded (not owned, no probe data, no board row). Every ⚑ magnitude is an estimate pending a real
  fight; the unit stays `tier: MODEL_ONLY, tuned: false` until fight data validates it.
- **Judge's same-model spot-check cluster:** (a) the volley's `rangeApplied` was never event-asserted
  (the blind's check was voided by its `nearPct` bug; the driver pins fbMajorApplied but not range; S6
  defensively wrote `noRange:true` where the driver relies on the engine default). The SSOT says burst
  damage takes no range bucket, so a mismatch would be an engine bug, not an encoding one — a 5-minute
  event-field check closes it. (b) Same shape for `crit` on the flatDamage effects (S6 wrote `crit:true`
  explicitly, the driver omits it; confirm the schema default is crit-eligible for burst-bucket
  flatDamage). (c) ⚑4 (above) is the only genuinely open modeling question worth a popup read.
- **Part-destroy lines are a real-kit gap, not a bug.** On a partless boss they are inert by
  construction; on a multi-part boss they would matter (Sustained Damage ▲5.1%/30s + two duration
  extends). They sit verbatim in `unmodeled.skill1` and would need a `partDestroyed` trigger primitive +
  a buff/DoT duration-extension primitive to ever model.
