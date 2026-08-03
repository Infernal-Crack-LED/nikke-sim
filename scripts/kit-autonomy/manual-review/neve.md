# Manual review — neve (Neve)

**Gauntlet date:** 2026-08-02
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (round-count `durationShots` on the S2 ATK window; `fullBurstEnter`-vs-`burstCast` trigger
discrimination between S2 and the burst; scoped self-buffs)

> Slug disambiguation: `neve` IS the base SG/Water Attacker (resource_id 193, Tetra, Burst III,
> "Bear Power"/"Hibernation"/"Roar"). The slug-disambiguation lint returned clean (no AMBIGUOUS) for
> the full variant line. There is no other Neve variant in the data.

## Kit summary

Neve is a Water shotgun Burst-III attacker (cd 40s, ammo 9, 10 pellets/shot, no charge) whose kit is
entirely self-contained — one timed enemy damage proc and two self-buff windows:

- **Skill 1 "Bear Power"** — on a 10s internal cooldown she automatically fires a bonus hit at the
  enemy with the lowest remaining HP for **145.45% of her final ATK**. (v1 fields a single immortal
  boss, so the "lowest remaining HP" clause is moot — there is exactly one enemy to hit.)
- **Skill 2 "Hibernation"** — every time the team enters Full Burst she gains **Pierce** and
  **+124.8% ATK**, each for her next **2 shots** (a round count, not wall-clock seconds).
- **Burst "Roar"** — when she casts her own burst, for **20 seconds** she gains **+31.95% Critical
  Rate** (unscoped — lifts every hit, including the S1 rider's crit roll) and **+22.04% Hit Rate**
  (sharpens her SG pellet grouping onto the boss core via the engine's Hit-Rate→core lift).

She deals no burst-cast damage of her own. The discriminations that matter: the S1 proc is a
wall-clock `interval` (the datamined 10s skill CD), NOT a one-shot passive; the S2 ATK buff is a
ROUND count (`durationShots:2`, no wall-clock expiry) keyed to `fullBurstEnter` (fires on EVERY team
Full Burst), NOT `burstCast`; the burst self-buffs are keyed to `burstCast` (fire ONLY on neve's own
casts), NOT `fullBurstEnter`; the burst crit rate is the UNSCOPED `critRatePct` (not the normal-only
`critRateNormalPct`); and the Pierce line is a `gainPierce` effect on the FB-enter block, NEVER a
whole-fight top-level `hasPierce` flag. The dual-B3 `controlComp('neve')` (co-B3 helm) is what makes
the `fullBurstEnter`-vs-`burstCast` triggers separable — the Full Burst count exceeds neve's own cast
count.

## Line-by-line

| Line                                                              | Disposition      | Notes                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: 10s CD → 1 enemy lowest HP, 145.45% of final ATK              | FAITHFUL         | `interval sec:10` (the DATAMINED `skillCooldownsSec.skill1=10`; first fire t=10 is the engine interval convention ⚑), target `enemy`, bare `flatDamage atkPct:145.45` (engine rider defaults: crit-eligible, no core, skill bucket, FB-by-landing). "lowest remaining HP" moot on the single partless boss. N1 pins the level-10 magnitude vs the 63.63 counterfactual + crit-eligibility; N2 pins the wall-clock 10s grid (~18 fires, first at frame 600) — kills the parser's `passive` mis-key (one t=0 fire). |
| S2: entering Full Burst → self, ATK ▲124.8% for 2 round(s)        | FAITHFUL         | `atkPct 124.8` (scales own ATK — plain "ATK ▲", not `casterAtkPct`), `durationShots:2` with NO wall-clock expiry (round count; a round = one SG trigger pull, hitsPerShot 10 pellets ≠ 10 rounds), `fullBurstEnter`/self. N3 pins value + `durationShots:2` + `expiresFrame:null` + self-scope + count === FB count; discriminates BOTH the timed-seconds counterfactual (carries an expiry) and the `burstCast` re-key (count collapses to neve's own casts < FB count). |
| S2: entering Full Burst → self, Gain Pierce for 2 round(s)        | DOCUMENTED_GAP   | `gainPierce durationSec:2` on the FB-enter block — the schema exposes NO round-count primitive for `gainPierce`, so the 2-round window is a flagged ⚑ rounds→seconds estimate (recipe: read Neve's SG pull cadence from footage). Damage-INERT at scope lock — `pierceDamagePct` is inert in v1 and no Pierce Damage ▲ carrier lands on a Water SG; proven byte-identical totals with the effect removed (N4). NEVER a top-level `hasPierce` (the boolean cannot time-gate a 2-round FB window — the ade-agent-bunny failure shape). |
| Burst: burstCast → self, Critical Rate ▲31.95% for 20 sec         | FAITHFUL         | `critRatePct 31.95` UNSCOPED (no "of normal attacks" qualifier → lifts every neve hit incl. the S1 rider), `durationSec:20`, `burstCast`/self (fires only on neve's own casts). N5 pins value + 20s + self + count === burstCast count (< FB count); discriminates the `fullBurstEnter` re-key (over-credits to the FB count) and the scoped `critRateNormalPct` (emits no `critRatePct`). |
| Burst: burstCast → self, Hit Rate ▲22.04% for 20 sec              | FAITHFUL         | `hitRatePct 22.04` — a real primitive feeding the engine's live Hit-Rate→core lift (`hrCoreMult`/UNIGEO; for an SG it tightens pellet landing/core exposure — NOT defensive, NOT skippable), `durationSec:20`, `burstCast`/self. The conversion MAGNITUDE is measured-only ⚑, so N6 pins the stat application (value/self/20s/count), not a specific core-rate delta. Zeroing it lowers neve's total (probe: 219.3M → 202.7M). |

No kit line is silently dropped. The single DOCUMENTED_GAP (the Pierce round-count window) is a
missing schema primitive (`gainPierce` has no `durationShots`), recorded with an estimate + recipe and
proven damage-inert — not a fudge and not a silent drop. `unmodeled` is empty for all three slots.

## Cross-family corroboration

- **S2b (claude-fable-5, test-faithfulness review):** `leakDetected:null`. All 5 load-bearing lines
  FAITHFUL (the Pierce line flagged GAP). Independently derived the identical encoding — `interval`
  S1 enemy rider at 145.45, `fullBurstEnter` S2 `atkPct 124.8 durationShots:2` self (explicitly "NOT
  burstCast"), `gainPierce` with a ⚑ `durationSec` (no round primitive; never top-level `hasPierce`),
  `burstCast` burst `critRatePct 31.95`/`hitRatePct 22.04` 20s self. **Originated the fixture insight
  the driver adopted:** the triggers diverge ONLY because the fixture has a co-B3, so `controlComp`'s
  helm slot must stay in — the driver switched from a sole-B3 to the dual-B3 `controlComp('neve')` and
  added explicit trigger re-key counterfactuals both directions. CONVERGED.
- **S5 (claude-opus-5, blind test, prose-only):** `leakDetected:null`. Independently derived every
  discrimination. **Ran GREEN unmodified against the driver override: 12 passed / 5 skipped / 1
  false-RED.** The 5 skips are the blind author's honest ALWAYS-⚑ flags, matching the driver's
  dispositions 1:1 (S1 cadence not in the kit text; lowest-HP enemy unobservable on a single boss;
  `gainPierce` has no round-count primitive; no Pierce Damage ▲ carrier in the comp; Hit-Rate→core
  magnitude measured-only). The 1 RED is a **classified false-RED** — blind line 353 asserts perfect
  teammate-total isolation when neve's SELF `hitRatePct` is zeroed; the engine's deterministic EV pass
  couples the SG Hit-Rate→core geometry into teammate totals by <0.5% (neve 219.3M base / 202.7M
  zeroed; `critZero`'s isolation check PASSES, isolating the coupling to the SG-core path). The buff's
  self-only scope is independently proven by two passing pins (blind "both buffs are self-only"; driver
  N6 `targetIdx===NEVE`). This is an engine EV artifact / blind over-assertion, NOT a driver divergence.
- **S6 (claude-opus-5, blind override, prose-only):** `leakDetected:null`. Independently converged on
  the identical structure — `interval sec:10` S1 (the blind guessed 10 as a mid-range CD; the driver
  used the datamined `skillCooldownsSec.skill1=10` — same value, independent routes), `fullBurstEnter`
  S2 `atkPct 124.8 durationShots:2` + `gainPierce durationSec:2.4` (driver: 2 — both flagged ⚑
  rounds→seconds, damage-inert), `burstCast` burst `critRatePct 31.95`/`hitRatePct 22.04` 20s self,
  `noFb` unset, no top-level `hasPierce`. **Byte-identical to the driver on the S2 `atkPct` block and
  the entire burst block.** The one substantive blind divergence: S1 `target:self` (a mis-scope — the
  kit says "1 enemy"; damage-neutral because `flatDamage` always resolves to the single boss), which
  the driver correctly encodes as `target:enemy`. 6 ⚑ flags, each with estimate + recipe + tier.
- **S7 (kimi-code/k3, binding reconciling judge):** `verdict: GO`, `faithfulnessScore: 1.0`,
  `gotchas: []`, `discriminationOk: true`. Graded all 5 lines: 4 FAITHFUL + 1 DOCUMENTED_GAP. Rated
  the driver "the most faithful of the three derivations" (correct `enemy` target where S6 mis-scoped
  self). Independently confirmed the driver's false-RED classification (the <0.5% EV teammate-coupling
  artifact; "RECON_ERROR on the blind side, not a driver gotcha"). Confirmed discrimination holds on
  every named nearest-wrong model.

## Residual flags (owner spot-check cluster)

- **S1 interval first-fire phase (t=10)** — the engine interval convention; never popup-verified for
  this unit. The cadence itself is the datamined skill CD (10s); the phase (t=10 vs t=0) is convention ⚑.
- **`gainPierce` 2s rounds→seconds estimate** — unmeasured (no round-count primitive); recipe recorded
  (read Neve's SG pull cadence from footage). Damage-inert at scope lock regardless.
- **Hit-Rate→core conversion magnitude** — measured-only ⚑ (engine `hrCoreMult`/UNIGEO); the test pins
  the stat application, not a core-rate delta. A/B `HRCORE=0` vs default against a recording to verify.
- **<0.5% deterministic-EV teammate-coupling artifact** — engine-side; the SG Hit-Rate→core geometry
  slightly couples teammate totals in the EV pass. Out of scope for this unit's GO, but worth an owner
  note as a known test-design trap for future SG hitRate kits (do not assert perfect teammate isolation
  when zeroing an SG unit's hitRatePct).
- **Tuning tier stays MODEL_ONLY** — the gauntlet certifies STRUCTURE (faithfulness), not magnitudes;
  neve keeps `tier:MODEL_ONLY` / `tuned:false` until a real fight validates her numbers.
