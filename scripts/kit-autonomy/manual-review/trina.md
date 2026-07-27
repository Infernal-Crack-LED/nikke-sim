# trina — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Trina (`trina`) — Electric · RL · Supporter · Burst II · 20s CD · ammo 6 · reloadFrames 170 ·
chargeFrames 60 · chargeMultiplier 250 · hitsPerShot 1 · normalMult 68.59 / coreMult 200 · critRate 15 /
critDamage 150 · Missilis.

**Verdict:** 🟢 **GO** · faithfulness **0.95** (every kit line FAITHFUL or documented UNMODELED/GAP; 0 real
gotchas) · **cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen. Score
docked 1.0→0.95 for the measurement-gated ⚑ (burst Hit Rate 45.3 → core-lift magnitude) and the engine GAPs
(S1 heal/recovery primitive; Spread Roots burst-skill-damage-amp primitive) — STRUCTURE is certified, magnitudes
are not. NOTE: Trina is CALIBRATED + tuned (board HOT, mean 1.155, n=4); the gauntlet certifies STRUCTURE only
and deliberately leaves `tier: CALIBRATED` / `tuned: true` untouched. **The gauntlet made ONE encoding change**
(the burst Max-Ammo line, below) — cross-family corroborated ×3 and verified regression- AND board-neutral.

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

- **S1 (Nature's Grace)** ■ After Full Burst ends → all allies: recover 4.06% of caster final Max HP / 1s for 5s.
  - ■ Attacking with Full Charge, if the 2 lowest-HP% allies < 30% → target(s): recover 2.03% caster final Max HP.
  - ■ Attacking with Full Charge, if the 2 lowest-HP% allies < 50% → target(s): recover 1.57% caster final Max HP.
- **S2 (Peaceful Tree)** ■ Start of battle, only if self alive → all Electric Code allies with assault rifles:
  Max HP ▲ 44.98% of the skill user's Max HP, without restoring HP, constantly.
  - ■ Start of battle → 1 leftmost Electric Code ally with assault rifles: Invulnerable for 2s.
  - ■ When using Burst Skill → 1 leftmost Electric Code ally with assault rifles: Attack Damage ▲ 94.15% / 10s;
    Reload Speed ▲ 50.82% / 10s.
- **Burst (Mother Forest)** ■ All allies: Max HP ▲ 20.14% of the skill user's Max HP without restoring HP / 10s;
  Attack Damage ▲ 20.9% / 10s.
  - ■ When enemy count (excl. Nikkes) == 1 → all allies: **Spread Roots** — Burst Skill damage of skills with
    "Affects all enemies" ▲ 435.6% / 5s.
  - ■ When enemy count (excl. Nikkes) > 2 → all allies: changes Spread Roots to **Wilted Roots** — same amp
    ▲ 64.46% / 5s.
  - ■ All Electric Code allies with assault rifles: Hit Rate ▲ 45.3% / 10s; Max Ammunition Capacity ▲ 20 round(s) / 10s.

---

## 2. What the code does (the faithful override, line by line)

- **S1 three heal lines** **UNMODELED** (documented verbatim in `unmodeled.skill1` + caveats). v1 has NO HP pool
  and NO heal/recovery-event primitive (immortal boss, nobody takes damage), so healing is unmodelable;
  recovery-trigger consumers (e.g. Crown's "when recovery takes effect") get no events from Trina. The two
  Full-Charge heals are _doubly_ inert — additionally gated on an ally-HP-percentage threshold (<30% / <50%) that
  v1 cannot evaluate (all allies pinned at 100%). **T1 actively PINS the absence** (Trina emits ZERO skill1-keyed
  buff events and ZERO skill1-sourced damage) and discriminates the empty slot from a harness blind spot via a
  fabricated-skill1 counterfactual (which WOULD emit skill1 events). NOT a silent drop, NOT a bare `it.skip`.
- **S2 start-of-battle Max HP grant** `passive → alliesOfElementWeapon(Electric, AR, count 99) → casterMaxHpPct
44.98 (no duration)` — "Max HP ▲44.98% of the skill USER'S Max HP … constantly". `casterMaxHpPct` resolves to a
  FLAT add of (44.98/100)×Trina.maxHp (≈1.35M), re-keyed to `maxHpFlat`, CONSTANT across all targets (caster-keyed),
  applied at frame 0, no expiry ("constantly"). Correctly `casterMaxHpPct` (NOT `targetMaxHpPct`, which would be a
  per-target % of each ally's OWN Max HP — the blind S6 used targetMaxHpPct and itself flagged the mismatch).
  Offensively INERT (ally-granted Max HP does not feed a teammate's atkOfMaxHpPct — e3 rule) but encoded for
  kit-SSOT completeness. **T2** discriminates scope (`allies` → all 5 slots), stat (`targetMaxHpPct` → per-target
  value), and duration (10s expiry vs the faithful constant). The "only if self is alive" gate is scope-trivial
  (nothing dies at scope lock).
- **S2 Invulnerable 2s** **UNMODELED** (documented in `unmodeled.skill2`). No invulnerability primitive / no
  damage-to-allies model in v1; defensive and inert. **T3 PINS** that S2 emits exactly its two modeled effect
  families (`attackDamagePct`, `maxHpFlat`, `reloadSpeedPct`) and NO invulnerability effect.
- **S2 burst-cast ally buff** `burstCast → alliesOfElementWeapon(Electric, AR, count 1) → attackDamagePct 94.15 +
reloadSpeedPct 50.82 (10s)` — "when using Burst Skill → 1 leftmost Electric Code ally with assault rifles".
  `count 1` selects the LEFTMOST Electric-AR ally (slot order). "Attack Damage ▲94.15%" = `attackDamagePct`
  (Damage-Up bucket, NOT `atkPct`); "Reload Speed ▲50.82%" = `reloadSpeedPct` (a weapon-state modifier that IS
  damage — shortens AR reload dead-time → more shots, NOT dropped as defensive). Keyed to Trina's OWN `burstCast`
  (the B2 chain step, pre-FB), NOT `fullBurstEnter`. The override note records this as the U8 run-B fix: the old
  `alliesOfElement` approximation leaked +94% Attack Damage to the RL carries (cindy/neon) AND Trina herself.
  **T4** discriminates count (99 → both Electric-AR allies), trigger (`fullBurstEnter` — frame-discriminated:
  Trina's cast frame strictly precedes the FB-start frame, the two frame sets never coincide), and duration (3s).
- **Burst all-ally buff** `burstCast → allies → attackDamagePct 20.9 + casterMaxHpPct 20.14 (10s)` — "all allies:
  Max HP ▲20.14% of caster Max HP / Attack Damage ▲20.9% / 10s". Reaches all 5 slots; `attackDamagePct` 20.9
  (Damage-Up bucket), `casterMaxHpPct` 20.14 (caster-keyed flat Max HP, inert). **T5** discriminates trigger
  (`fullBurstEnter`, frame-discriminated) and scope (`alliesOfElementWeapon` → only the 2 Electric-AR allies).
  This is the one fixture-independent full GREEN/RED discriminator (both blind reviewers converge FAITHFUL).
- **Burst Spread Roots / Wilted Roots** **UNMODELED — documented GAP** (verbatim in `unmodeled.burst` + caveats).
  NO StatKey expresses "Burst Skill damage of skills with 'Affects all enemies'". The enemy-count==1 gate IS
  satisfied on the solo boss — **this is THE trap**: routing 435.6% through `attackDamagePct`/`atkPct` would
  catastrophically over-credit ALL damage, not just qualifying AoE-burst skills. It is a TEAMMATE-COLD lever
  (Trina has no all-enemies burst skill; it amps teammates' all-enemies B3 nukes cast within 5s of her burst),
  inert on Trina's own damage. The Wilted Roots branch (>2 enemies) never fires on the solo boss AND is mutually
  exclusive with Spread Roots. **T6 PINS** that Trina's burst emits exactly the three modeled effect families
  (Attack Damage / Max HP / Max Ammo) and NO burst-skill-damage-amp stat; an `it.skip` formally marks the missing
  primitive. **Feature request** — needs a scoped AoE-burst-skill-damage bucket (candidate for
  `docs/engine-modeling-gaps.md` theme catalog). All three blind reviewers converged on this as the dominant trap.
- **Burst Hit Rate 45.3%** **UNMODELED — measurement-gated ⚑** (verbatim in `unmodeled.burst` + caveats).
  `hitRatePct` lifts AR/SMG/SG core-hit rate via acrForHR; the HR→core MAGNITUDE is unmeasured (ALWAYS-⚑). This
  line targets Electric-AR allies, so modeling it WOULD move the board — queued per the kit-audit plan
  (2026-07-20) pending a measurement. **T7 PINS** ZERO `hitRatePct` buffs from Trina. The only ⚑ both reviewers
  acknowledge. Recipe: toggle HRCORE on/off on a graded Electric-AR comp with Trina bursting; compare core-hit
  popup fraction on the AR carrier vs the kit's stated hit-rate delta.
- **Burst Max Ammo +20 rounds** `burstCast → alliesOfElementWeapon(Electric, AR, count 99) → maxAmmoFlat 20 (10s)`
  — **GAUNTLET FIX**. "Max Ammunition Capacity ▲20 round(s)" = `maxAmmoFlat 20` (kit-literal FLAT rounds; the
  engine's flat-rounds path is live — theme 14, cf. tove/grave/noir, enacted 2026-07-20). The shipped override
  encoded this as `maxAmmoPct 33.3` ("+33.3% on a 60-round AR magazine"), an approximation exact ONLY for a 60-round
  magazine: moran (60-round) gets `round(60×1.333)=80 == 60+20` (identical), but a 20-round Electric-AR ally (e.g.
  scarlet) gets `round(20×1.333)=27` vs the kit-literal `40` — a +6.66 vs +20 round shortfall. `maxAmmoFlat 20` is
  exact for every Electric-AR ally regardless of magazine size. **Cross-family corroborated ×3** — fable S2b, opus
  S5, and opus S6 ALL independently derived `maxAmmoFlat 20` from the prose + schema (S2b: nearest-wrong
  "maxAmmoPct … differ wildly"). **T8** discriminates stat/value (`maxAmmoPct 33.3` — a percentage, not flat
  rounds) and scope (`allies` → all 5 slots). **Regression- AND board-neutral** on Trina's graded comps (see §6).

Trina's personal damage is negligible RL charge fire (pure supporter); her value is the team buffs — the burst
all-ally Attack Damage 20.9% and the Electric-AR-scoped S2 burst-cast 94.15%/50.82% + burst Hit Rate/Max Ammo. In
a team with no Electric-AR ally, every Electric-AR-scoped line targets the empty set and only the all-ally 20.9%
Attack Damage + the (inert) Max-HP grants remain.

---

## 3. Handled forks (the judge's divergences — none is a REAL-GOTCHA)

The judge found **0 gotchas**. The three blind divergences all resolved toward the driver being MORE faithful:

- **Max-HP grants — casterMaxHpPct (driver) vs targetMaxHpPct (blind S6).** The kit says "of the skill USER'S Max
  HP" (caster-scaled); the driver uses `casterMaxHpPct` (correct). The blind used `targetMaxHpPct` and itself
  flagged the mismatch ("if a casterMaxHpPct stat exists, prefer it"). `casterMaxHpPct` exists (types.ts); the
  driver's encoding is the faithful one. Both are offensively inert (e3 rule) → no damage difference either way.
- **S1 fullBurstEnd HoT — UNMODELED (driver) vs `kind:'heal'` block (blind S6).** The v1 engine has NO `heal`
  effect kind and NO recovery-event primitive (no HP pool); the blind's heal block would not validate/execute.
  The driver's UNMODELED (documented verbatim) is correct for the current engine. (Fable S2b also marked this
  FAITHFUL-as-recovery-emitter — presupposing a primitive that does not exist; reconciled to documented GAP.)
- **Burst Hit Rate 45.3% — UNMODELED measurement-gated (driver) vs hitRatePct-with-⚑ (blind S6 + fable S2b).** The
  project queued this line as measurement-gated (modeling it WOULD move the board; the HR→core magnitude is
  unmeasured). The driver's documented UNMODELED ⚑ follows that decision; both blind reviewers' ⚑ flags agree the
  magnitude is measurement-only. A documented-disposition difference, NOT a silent drop (both record it).
- **Blind S5 harness artifacts (HANDLED — NOT a faithfulness signal).** The opus S5 blind test had two mechanical
  bugs: `goPatched` discards `withPatchedOverride`'s returned clone (so its counterfactual patches were never
  applied) and `num(totals(res))` misreads the harness `totals()` Record<slug,number> (so `base.tot` was always 0).
  Its 2 failing assertions both compare 0>0 and fail regardless of the override; its 3 runnable load-bearing
  assertions (20.9 reaches all 4 allies; 94.15 inert on non-Electric-AR; 45.3/maxAmmoFlat-20 inert on
  non-Electric-AR) PASS against the driver's override. Its SPEC table (the real signal) is fixture-independent and
  converges fully.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **Burst Hit Rate ▲45.3% (§2, measurement-gated ⚑)** — the load-bearing magnitude question: measure the HR→core
   lift on a graded Electric-AR comp (e.g. moran or scarlet carry) with Trina bursting. Toggle HRCORE on/off;
   compare the AR carrier's core-hit popup fraction vs the kit's 45.3% hit-rate delta. If material, enact
   `hitRatePct 45.3` on the burst Electric-AR block (it WOULD move the board — re-grade after). (magnitude ⚑)
2. **S1 heal / recovery-event primitive (§2 GAP)** — if a recovery-event primitive lands, the fullBurstEnd
   4.06%/s×5s HoT becomes a recovery emitter that drives Crown-style "when recovery takes effect" consumers; the
   two Full-Charge HP-threshold heals additionally need an ally-HP-percentage gate (unevaluable in v1). Inert on
   Trina's own damage either way. (engine primitive gap)
3. **Spread Roots / Wilted Roots burst-skill-damage amp (§2 GAP)** — the dominant trap. If a scoped
   AoE-burst-skill-damage bucket lands, the 435.6% (enemy count==1, fires on the solo boss) amps teammates'
   all-enemies B3 nukes cast within 5s of Trina's burst — a teammate-COLD lever (Trina comps read COLD today).
   Needs measurement of which teammates' burst damage qualifies. Candidate for `docs/engine-modeling-gaps.md`.
   (engine primitive gap)
4. **burstCast-vs-fullBurstEnter trigger identity (§2 S2/burst)** — discriminated by FRAME in the sole-B2 fixture
   (Trina's cast frame precedes the FB-start frame); becomes a COUNT divergence in a multi-B2 comp. Confirm on a
   multi-B2 recording that the 94.15%/50.82% ally buff applies only on Trina's OWN casts (not every team FB).
   (trigger-identity)

Magnitudes (44.98 / 94.15 / 50.82 / 20.14 / 20.9 / 435.6 / 64.46 / 45.3 / 4.06 / 2.03 / 1.57 / 20) are all
kit-literal (DATAMINED); the gauntlet certified the STRUCTURE around them, not the numbers. Trina's board is HOT
(mean 1.155) — the gauntlet does NOT touch tuning.

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): converged on every load-bearing line — S2 casterMaxHpPct 44.98 (caster-keyed,
  Electric-AR, permanent), S2 burstCast 94.15/50.82 (leftmost Electric-AR, `burstCast` NOT `fullBurstEnter`,
  `attackDamagePct` NOT `atkPct`), burst 20.9/20.14 (all allies), Spread Roots/Wilted Roots GAP ("THE dominant
  trap … NO 435.6-valued buffApply may exist"), and **independently derived `maxAmmoFlat 20`** (nearest-wrong
  "maxAmmoPct 20 … differ wildly") — corroborating the driver's S3 FIX. Two dispositions differed (S1 HoT
  FAITHFUL-as-recovery-emitter; Hit Rate FAITHFUL-with-⚑), both reconciled to documented engine/measurement gaps.
  `leakDetected: null`.
- **S5** (opus, blind test): SPEC converges fully (burst 20.9 all-allies FAITHFUL; S2 94.15/50.82 Electric-AR
  count:1 burstCast FAITHFUL; **maxAmmoFlat 20 independently derived**; S1 heals + invuln + Spread/Wilted Roots
  GAP; hitRate 45.3 ⚑). Run against the driver's override: 3 passed / 2 failed / 6 skipped — the 2 failures are
  blind HARNESS artifacts (unapplied counterfactual + a Record-shape misread), classified by the judge, NOT
  override divergences; the 3 runnable load-bearing assertions pass. The verbatim blind source is preserved in
  `cross-family/trina/s5-result.json` (`testSource`) and `blind/trina.test.ts`; like the other blind re-derivation
  artifacts, `scripts/kit-autonomy/blind/**` is excluded from the production typecheck (evidence trail, not run by
  vitest). `leakDetected: null`.
- **S6** (opus, blind override): **independently reproduced the identical load-bearing encoding from prose alone**
  — S2 burstCast Electric-AR count:1 attackDamagePct 94.15 + reloadSpeedPct 50.82/10s; burst all-allies
  attackDamagePct 20.9/10s; burst Electric-AR **maxAmmoFlat 20**/10s (a THIRD independent derivation of the FIX);
  Spread/Wilted Roots UNMODELED (no StatKey; routing via attackDamagePct would over-credit ALL damage); S1
  conditional heals + invuln UNMODELED. audit SKIPPED ↔ unmodeled 1:1. Its three structural differences
  (targetMaxHpPct vs casterMaxHpPct; a `heal` block; hitRatePct implemented) are all adjudicated as the driver
  being MORE faithful / following the project's documented decision. `leakDetected: null`.
- **S7** (opus, judge): **GO 0.95**, discrimination OK, fire-rate check passes (T4=13=casts, T5=65=casts×5,
  T8=26=casts×2), **0 gotchas**, full cross-family convergence; the maxAmmoFlat 20 fix corroborated ×3 and
  regression-neutral. Verdict BINDING.

## 6. Board / fit note (non-gating)

Trina is CALIBRATED + tuned (board HOT, mean 1.155, n=4: PB elec battery 1.14 / PB2 1.13 / TB2T2 1.14 / N3
scarlet-liberalio iron 1.21). The gauntlet made ONE encoding change — the burst Max-Ammo line `maxAmmoPct 33.3 →
maxAmmoFlat 20` — and verified it is **board-NEUTRAL** (before = after = 1.155, measured via board-read A/B) and
**regression-NEUTRAL** (`trina snapshot stable` on both snapshot comps): the graded comps' Electric-AR allies are
either 60-round (moran → `round(60×1.333)=80 == 60+20`, identical magazine) or absent (N3 has no Electric-AR ally
→ the buff lands on nobody). The change only affects non-60-round Electric-AR allies, which appear in none of
Trina's graded comps. The fix moves the encoding toward kit-literal faithfulness (a 20-round Electric-AR ally now
gets the correct +20 rounds instead of +6.66); any future board movement there is fit-exposure for a separate
localization thread, never a reason to revert. `tier: CALIBRATED` / `tuned: true` are deliberately preserved (the
gauntlet certifies STRUCTURE, not tuning; there is no GAUNTLET tier).
