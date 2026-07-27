# Manual review — flora (Flora)

**Gauntlet date:** 2026-07-26
**Verdict:** GO (cross-family corroborated)
**Faithfulness:** 1.0
**Tier:** 2 (`burstCast`-vs-`fullBurstEnter` on the burst buffs; flavor-gated `trueDamagePct`; HP-status-gated S2; meta-defining caster-scaled burst ATK)

> Slug/role: `flora` IS Flora — MG / Supporter / Electric / Burst II (Missilis, burst cd 40s,
> ammo 300, `treasure:true`). A healer-buffer whose OWN MG damage is minor and whose value is
> TEAM-WIDE. No disambiguation against a second Flora variant.

## Kit summary

Flora is an Electric MG Supporter whose contribution is almost entirely team-wide. Her Skill 1
passively places a "Peace of Mind" aura on herself and her two adjacent allies that trickle-heals
1% of her max HP every second continuously (event-only in the sim — there is no HP pool), grants
stacking incoming-healing, and after 100 of her normal attacks bumps the stack count of stackable
buffs on all Electric allies; it also briefly raises Peace-of-Mind allies' max HP when she enters
Burst Stage 2. Her Skill 2 is a defensive reactive layer: it shields the team when an adjacent ally
falls below 90% HP, grants team True Damage when an adjacent ally returns to full HP, and grants a
large caster-scaled ATK buff when a shield is placed in front of her. Every S2 line is gated on HP
dynamics the v1 sim does not model (no HP pool; the boss deals no damage, so no ally ever drops
below 100% HP and the triggers never fire), so the whole slot is dropped to unmodeled with an
engine-core flag and the loss is priced in caveats rather than fudged. Her Burst II is her defining
contribution: a team heal plus 10 seconds of True Damage ▲42.39% and a very large ATK buff equal to
85.86% of her OWN ATK (a caster-scaled flat add, not a percentage of each target's ATK) for the
whole squad. The four modelable lines — the three burst effects and the S1 HoT cadence — are pinned
end-to-end by `scripts/tests/units/flora.test.ts` (11 assertions, GREEN 11/11).

## Line-by-line

| Line | Disposition | Notes |
|------|-------------|-------|
| S1: Peace of Mind — 1% Max HP every 1s, self + 2 adjacent | FAITHFUL | `interval:1` heal → `selfAndAdjacent(sides:2)`; models the 1s recovery CADENCE (per-tick HP magnitude unmodeled — no HP pool). F4: crown's recovery consumer fires ~every second (~180 distinct frames), collapsing to the burst-heal-only count when the HoT is stripped. Driver strictly more faithful than S5 (`it.skip`) and S6 (`passive`+`ticks:1`, fires once). |
| S1: Incoming Healing ▲4%, stacks 5x | DOCUMENTED_GAP | Inert — no `incomingHealingPct` stat + no HP pool ⇒ doubly inert (damage-neutral). Verbatim in `unmodeled.skill1`. Four-way convergence. |
| S1: after 100 normal attacks → Electric allies +1 stack | DOCUMENTED_GAP | ⚑ engine-core — trigger (`hitCount:100`) + target (`alliesOfElement` Electric) are expressible, but the stack-increment EFFECT has no engine primitive. Verbatim in `unmodeled.skill1` with estimate+recipe+tier; no uptime invented (measured>fudge). |
| S1: entering Burst 2 → Peace-of-Mind allies Max HP ▲15.01% 2s | DOCUMENTED_GAP | Inert — ally-granted Max HP does NOT feed a teammate's `atkOfMaxHpPct` (e3/cinderella video rule); "without restoring HP" ⇒ no recovery event; the "Peace of Mind state" target gate is unexpressible. |
| S2: adjacent ally HP ≤ 90% → shield 10.22% caster Max HP 10s | DOCUMENTED_GAP | ⚑ engine-core — no HP pool; boss deals no damage ⇒ no ally drops below 100% HP, trigger never fires. `skill2 = []` emits ZERO shield events all fight (the only faithful behavior). Same precedent as liter cover-HP NO-OP and the `alliesLowestHp` stand-in. |
| S2: adjacent ally reaches max HP → True Damage ▲30.97% | DOCUMENTED_GAP | ⚑ engine-core — "reaches max HP" is an HP-transition trigger needing an HP pool. Driver took S2b's conservative option (a): unmodeled + loss priced ("sim under-represents Flora"), no invented uptime. Prose "10 sec" vs datamine `description_value_05 = 5` is immaterial while unmodeled (surfaced by S2b). |
| S2: shield placed in front of self → Peace-of-Mind allies ATK ▲45.12% 10s | DOCUMENTED_GAP | ⚑ engine-core — the `shielded` trigger EXISTS, but its only shield source is the HP-gated S2-1 ⇒ the chain is dead in the no-damage sim; the "Peace of Mind state" target gate is also unexpressible. |
| Burst: heal 10.45% caster Max HP, all allies | FAITHFUL | `burstCast` heal → allies (recovery event; HP magnitude unmodeled). F3: crown's consumer fires exactly once per Flora burst, aligned to the cast frames. `burstCast` NOT `fullBurstEnter` (S2b load-bearing). S5 skipped it ("no heal primitive" — a blind miss; the heal kind exists). |
| Burst: True Damage ▲42.39% 10s, all allies | FAITHFUL | `burstCast` `trueDamagePct` 42.39/10s/allies. F2: value 42.39, 10s, count === bursts×4, FLAVOR-GATED (`sim.ts:1430`) — moves ada's true-flavored grenades, byte-identical on liter/crown/flora. Full four-way convergence. |
| Burst: ATK ▲85.86% of skill user's ATK 10s, all allies | FAITHFUL | `burstCast` `casterAtkPct` 85.86/10s/allies — Flora's PRIMARY contribution. F1: flat resolution 0.8586×Flora.staticAtk identical across all 4 targets; a generic `atkPct` counterfactual moves the carry; removal drops the carry. Caster-scaled flat add per SSOT §1a/§11 (crown S1 precedent). OMITTED by all three blind roles — the driver is the only role to model it (owner spot-check recommended). |

## Cross-family corroboration

> **Routing deviation this run:** Claude quota was exhausted, so all four blind roles ran on Kimi
> (a separate model family from the Qwen driver — cross-family is preserved; it is NOT same-model).
> Per each result JSON's `model` field: S2b = `kimi-code/k3`, S5 = `kimi-code/kimi-for-coding`,
> S6 = `kimi-code/kimi-for-coding`, S7 (binding judge) = `kimi-code/k3`. The canonical Claude names
> (fable / opus) were NOT used this run.

- **S2b (`kimi-code/k3`, test-faithfulness review):** `leakDetected:null`. Verdict CONVERGED — no
  REAL-GOTCHA; reviewer judged the driver implementation faithful and MORE complete than its own
  enumeration. Converged on the S1 HoT (reviewer labeled the trigger `passive`, but its OWN
  "refreshing continuously" assertion requires the per-second cadence only `interval:1` produces —
  driver encoding is the faithful one), the inert Incoming Healing line, the 100-hit stack GAP
  ("recorded not dropped"), the zero-shield-event S2 inertness, and both burst heals/buffs
  (`burstCast` not `fullBurstEnter`). Reviewer OMITTED the burst ATK ▲85.86% line entirely
  (`loadBearingSet` lacks `burst:atk`) — driver-more-complete, not a driver defect. Reviewer also
  surfaced the S2 True Damage prose-vs-datamine duration discrepancy (10s vs 5).
- **S5 (`kimi-code/kimi-for-coding`, blind test):** `leakDetected:null`. Independently derived the
  kit lines and wrote a vitest suite. **RED at COMPILE LEVEL ONLY:** its counterfactual helper reads
  `ov.burst.blocks.forEach`, but the override schema stores `burst` as a bare array — a blind-writer
  harness artifact (no harness source was available to it), NOT a faithfulness divergence. All
  substantive assertions are GREEN in substance vs the driver override: `trueDamagePct` 42.39 /
  all allies / 10s / flora-`burstCast` / damage-moving; the S2 30.97 inertness guard (no such event
  fires); and no-B3-chain ⇒ no Full Burst ⇒ no true-damage buff. Six lines `it.skip`-ed as unmodeled.
  OMITTED the burst ATK ▲85.86% line (no assertion) and skipped the burst heal ("no heal primitive"
  — a blind miss; the heal kind exists).
- **S6 (`kimi-code/kimi-for-coding`, blind override):** `leakDetected:null`. Converges on the core
  structure: `skill2 = []`, a burst `heal` + `trueDamagePct` 42.39/10s on `burstCast` to allies, and
  an S1 `selfAndAdjacent(sides:2)` heal. Diverges on the S1 HoT cadence — S6 used `passive` +
  `ticks:1` (ONE recovery event total, self-flagged in its caveats as undefined duration/cadence)
  where the driver's `interval:1` models "every 1 sec continuously" — and OMITTED the burst ATK
  ▲85.86% line (no burst ATK effect). Same UNMODELED set otherwise.
- **S7 (`kimi-code/k3`, binding judge):** **GO, faithfulness 1.0, discriminationOk:true,
  gotchas:[].** All 10 kit lines accounted for (4 FAITHFUL + 6 DOCUMENTED_GAP), zero silent drops,
  zero REAL-GOTCHA. The judge independently ruled the driver STRICTLY better than the blinds on the
  two contested points — the `interval:1` HoT cadence (vs S6's single-fire passive and S5's skip,
  proven by F4) and the burst ATK ▲85.86%-of-caster line (Flora's defining contribution, routed
  exactly per the SSOT caster-flat-ATK rule, omitted by all three blinds). It classified the S5 RED
  as RECON_ERROR-adjacent (compile-level harness artifact, substantive assertions green) and flagged
  the same-model residual for the owner (below). Discrimination holds on all four pins (F1 scaling
  contrast, F2 flavor byte-identity, F3/F4 cadence collapse).

## Residual flags for owner

1. **Same-model + unanimous blind omission of the burst ATK line — spot-check F1/F2.** Every agent
   this run is Kimi-family vs the Qwen driver, and all three blind roles independently OMITTED the
   burst ATK ▲85.86%-of-caster line that ONLY the driver models. The binding judge adjudged it
   FAITHFUL against the prose ("% of the skill user's ATK") + the SSOT caster-flat-ATK rule
   (§1a/§11, crown S1 precedent), so this is read as a blind-side gap, not a driver defect — but it
   means the strongest evidence is the driver's OWN discrimination tests. Owner glance recommended
   at F1 (`casterAtkPct` flat resolution 0.8586×Flora.staticAtk identical across all targets;
   generic `atkPct` counterfactual moves the carry; removal drops it) and F2 (flavor-gate
   byte-identity on liter/crown/flora) as the load-bearing artifacts.
2. **Whole-S2 HP-gated cluster UNMODELED ⚑ engine-core.** All three S2 lines (shield 10.22% /
   True Damage ▲30.97% / ATK ▲45.12% of caster ATK) are gated on HP dynamics v1 does not model — no
   HP pool, and the boss deals no damage, so the triggers genuinely never fire. DOCUMENTED_GAP per
   the liter cover-HP NO-OP (owner 2026-07-21) and `alliesLowestHp` "no HP pool" precedents, NOT
   NO-GO(engine-core); the loss is priced in caveats ("the sim under-represents Flora until an HP
   pool exists") rather than fudged. **Durable follow-up:** an engine HP-pool + HP-threshold-trigger
   primitive would unlock Flora's S2 (and every other HP-gated kit) — recipe is in the override
   `caveats` (model ally HP + boss damage taken, then encode S2-1 `shield` maxHpPct:10.22 on the
   HP-threshold trigger, S2-3 `casterAtkPct`:45.12 on `shielded`, S2-2 `trueDamagePct`:30.97 on a
   max-HP-reached trigger).
3. **S1 100-hit stack-bump UNMODELED ⚑ engine-core.** The trigger (`hitCount:100`) and target
   (`alliesOfElement` Electric) are expressible, but the stack-increment EFFECT has no engine
   primitive (`addStack`); magnitude depends entirely on which stack-ramp buffs are active, so it is
   correctly NOT estimated into the model. The S1 Incoming Healing ▲4% and the entering-Burst-2
   Max HP ▲15.01% grant are inert (no `incomingHealingPct` stat / no HP pool; ally-granted Max HP is
   offensively inert and emits no recovery) — recorded, damage-neutral.
4. **S5 suite is RED at compile level only.** The blind harness-API bug (`ov.burst.blocks` vs the
   bare-array `burst` schema) prevents the file from compiling as written; all substantive S5
   assertions are green in substance vs the driver override. Confirm the compile fix (treat
   `ov.burst` as an array) at harness-run time before treating the S5 suite as executable
   corroboration.
5. **S2 True Damage 30.97 prose-vs-datamine duration.** Kit prose says "for 10 sec" but the datamine
   `description_value_05 = 5`. Immaterial while the line is unmodeled; resolve prose-vs-datamine
   first if the HP-pool primitive ever lands and this line is enacted (surfaced by S2b).
