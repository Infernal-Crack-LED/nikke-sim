# tove — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Tove (`tove`) — Water · AR · Supporter · Burst I · 20s CD · ammo 60 · reloadFrames 81 · chargeFrames 0 ·
hitsPerShot 1 · normalMult 14.2 / coreMult 200 · 720 rate-of-fire (~12 shots/s) · critRate 15 / critDamage 150 ·
Missilis.

**Verdict:** 🟢 **GO** · faithfulness **0.95** (every kit line FAITHFUL or documented UNMODELED/GAP; 0 real
gotchas surviving grading — the 3 judge gotchas are all low-severity, engine-forced, and documented) ·
**cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen. Score docked
1.0→0.95 for the three steady-state/engine-primitive ⚑ items (unmodeled self-reload; "at max stacks" gate
approximated as an always-on passive; static ×3 burst mirror) — STRUCTURE is certified, magnitudes are not.
NOTE: Tove is `MODEL_ONLY` / `tuned: false` (pure model, never fight-validated, in no graded comp); the gauntlet
certifies STRUCTURE only and deliberately leaves `tier: MODEL_ONLY` / `tuned: false` untouched. **The gauntlet
made NO encoding change** — the override was already faithful (hand-authored with a prior fable pre-op approval)
and the gauntlet certified it via two independent cross-family re-derivations.

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

The normalized `skills` prose is the SSOT the sim reads. The raw datamine is STALE on two values (S2 crit-rate
3.32 → prose **10.08**; burst duration 10s → prose **15s**), both already refreshed in the prose. The datamine
also renders S1 as a "2% chance when attacking" while the prose says "after 10 normal attacks" — the prose
governs (residual ⚑, §4).

- **S1 (Emergency-Crafted Bullets / Temporary Modification)** ■ After 10 normal attacks → self: Reload 5.31% of
  the magazine.
  - ■ During Emergency-Crafted Bullets → all allies: **Temporary Modification** — Max Ammunition Capacity ▲ 2,
    stacks up to 3×, lasts 5 sec.
  - ■ (same trigger) → all allies: Critical Damage ▲ 5.24% for 5 sec.
- **S2 (Modification Successful)** ■ Only when Temporary Modification is at max stacks → all allies: Critical
  Rate ▲ 10.08% continuously.
  - ■ Only when Temporary Modification is at max stacks → all shotgun-wielding allies: Attack Speed ▲ 42.24%
    continuously.
- **Burst (Miracle of Makeshifts)** ■ All allies: ATK ▲ 2.32% of the skill user's ATK; mirrors the stack count of
  Temporary Modification for 15 sec.
  - ■ All shotgun-wielding allies: ATK ▲ 24.21% of the skill user's ATK; mirrors the stack count of Temporary
    Modification for 15 sec.

---

## 2. What the code does (the faithful override, line by line)

The whole kit is built on the **Temporary Modification** stack (max 3). Tove's Emergency-Crafted Bullets procs on
her OWN 10 normal attacks; at ~12 shots/s that is a ~0.83s cadence, and each proc applies/refreshes the 5s buff,
so it reaches 3 stacks within ~2.5s and stays maxed for the rest of the 180s fight. The S1/S2 max-stack RESULTS
are therefore modeled as **frame-0 passives** (always-on), and the burst "mirrors the stack count" is baked as a
**static ×3**. This steady-state modeling is the project's standard simplification (the engine has no
"named-buff-at-max-stacks" gate primitive and no live stack-mirror); the ~2.5s opening ramp is ~1.4% of the fight
(residual ⚑, §4).

- **S1 self-reload (Reload 5.31% of the magazine, self)** **UNMODELED** (documented verbatim in
  `unmodeled.skill1`). The engine has NO ammo-refill primitive — its EffectDef kinds are
  buff/resource/flatDamage/dot/weaponSwap/fillGauge/heal/shield/targetStatus/storedHit; there is no
  `instantReload`/`refillAmmo` (`maxAmmoFlat`/`maxAmmoPct` change magazine CAPACITY, not a refill). Both blind
  agents (fable S2b, opus S6) attempted an `instantReload` encoding — that primitive does not exist, so it would
  not validate/execute; the documented skip is correct. Self-only and negligible on a Supporter whose personal
  damage is irrelevant. **T1 PINS** the absence within an ACTIVE slot: skill1 emits EXACTLY the two modeled effect
  families `{critDamagePct, maxAmmoFlat}` and no reload/ammo-refill effect (distinguishing a documented skip from
  a silent drop), plus zero skill1-sourced damage.
- **S1 Temporary Modification — Max Ammo +2 ×3 = maxAmmoFlat 6 (all allies)** `passive → allies → maxAmmoFlat 6`
  (frame 0, no expiry). **FLAT rounds** (theme-14 flat-rounds path is live, cf. trina/grave/noir), +2×3 = 6 at
  steady state. `maxAmmoPct` would be a ~30× scoping error on a 9-round SG magazine (round(9×1.02)−9 ≈ +0 vs the
  kit-literal +6) — exactly the SG allies this kit exists for. Video-confirmed +6 on all allies (community
  submission 2026-07-15-1754-req1-tove: tove 60→66, nayuta 120→126, SG allies 9→15). **T2** discriminates stat
  (`maxAmmoPct 6`), scope (`alliesOfWeapon SG` → [3,4] only), and duration (5s expiry vs the faithful permanent).
- **S1 Critical Damage ▲5.24% (all allies)** `passive → allies → critDamagePct 5.24` (frame 0, no expiry). NOT
  stacked ×3 — the line shares the Temporary Modification trigger block but carries NO stack clause, so it is
  5.24, not 15.72 (fable's flagged nearest-wrong, correctly avoided). **T3** discriminates scope + duration.
- **S2 Critical Rate ▲10.08% (all allies)** `passive → allies → critRatePct 10.08` (frame 0, no expiry,
  generic/unscoped). The "only activates when Temporary Modification is at max stacks" gate is permanently
  satisfied at steady state → always-on passive (refreshed from the stale 3.32% datamine to the current prose
  10.08%). **T4** discriminates scope (`alliesOfWeapon SG` → [3,4]).
- **S2 Attack Speed ▲42.24% (SG allies)** `passive → alliesOfWeapon(SG) → attackSpeedPct 42.24` (frame 0, no
  expiry). Weapon-typed, class-blind; Tove (AR) is excluded by weapon. This is the kit's signature SG-scoped line
  — the classic scope-collapse trap is mis-encoding it as generic `allies` (a massive team-wide shot-count
  over-credit). **T5** discriminates SG-scope vs all-allies; inert on SG-free comps.
- **Burst all-ally ATK ▲2.32% ×3 = 6.96% of caster ATK (all allies, 15s)** `burstCast → allies → casterAtkPct
6.96 (15s)`. `casterAtkPct` = a FLAT add of (6.96/100)×Tove.staticATK (caster-keyed; the buffApply `value` is the
  resolved flat ATK ≈6941, the original 6.96 rides the event KEY `:6.96`), NOT `atkPct` (a percentage of each
  target's OWN ATK). Keyed to Tove's OWN `burstCast` (B1 step), NOT `fullBurstEnter` — frame-discriminated: her
  cast frame (180, 1380, …) strictly precedes each fullBurstStart frame (262, 1462, …, ~82f later). 15s (the prose
  value, not the stale datamine 10s). **T6** discriminates five ways: trigger (`fullBurstEnter`), scope
  (`alliesOfWeapon SG`), stat (`atkPct`), duration (10s), and mirror (un-mirrored 2.32).
- **Burst SG ATK ▲24.21% ×3 = 72.63% of caster ATK (SG allies, 15s)** `burstCast → alliesOfWeapon(SG) →
casterAtkPct 72.63 (15s)`. A SECOND, distinct block. **Co-stacks ADDITIVELY** with the all-ally 6.96 line: the
  two blocks carry distinct buff-key values (6.96 vs 72.63) → no same-slot overwrite → an SG ally is targeted by
  BOTH ■ lines and nets 6.96 + 72.63 = **79.59%** of Tove's ATK (probe-confirmed: SG allies noir/isabel each carry
  both a `:6.96` and a `:72.63` buffApply per cast; matches the prior owner-queued reconciliation in
  data/kit-status.json). **T7** discriminates scope (`allies` → all 5) + stat (`atkPct`) and PINS the co-stack
  (an SG ally carries both keys).

Tove is a pure **SG-team enabler**: her personal AR damage is irrelevant; her value is the team-wide max-ammo /
crit buffs and the SG attack-speed + burst-ATK grants. In a team with no SG ally, the two SG-scoped lines
(attack-speed 42.24, burst 72.63) target the empty set and only the all-ally buffs (maxAmmoFlat 6, critDamagePct
5.24, critRatePct 10.08, burst casterAtkPct 6.96) remain.

---

## 3. Handled forks (the judge's divergences — none is a REAL-GOTCHA)

The judge found **0 gotchas surviving grading** (the 3 it logged are all low-severity, engine-forced, and
DOCUMENTED — see §4). The cross-family divergences all resolved toward the driver:

- **Burst SG total — 79.59 co-stack (driver + opus S6) vs 72.63 supersede (fable S2b).** This is the dominant
  trap, and fable flagged it ("the likeliest shared-prior misread on the whole kit") then fell into it. The kit
  has TWO distinct ■ lines ("all allies: 2.32×3" AND "shotgun allies: 24.21×3"); an SG ally is an ally AND
  shotgun-wielding, so it is targeted by BOTH and gets 6.96 + 72.63 = 79.59% caster ATK. Fable assumed "same buff
  name from one cast resolves to one value per target" (supersede) — a misread of the two-line structure. Opus S6
  independently reproduced the driver's two-block co-stack from prose alone, and the prior owner reconciliation
  (kit-status.json) states "SG allies should get 2.32+24.21 = 79.59% caster ATK". Fable's supersede is the
  RECON_ERROR; the driver's encoding is faithful.
- **S1 self-reload — UNMODELED (driver) vs `instantReload` (fable S2b + opus S6).** The v1 engine has NO
  ammo-refill primitive (no `instantReload`/`refillAmmo` EffectDef kind); both blind agents' `instantReload`
  encoding would not validate/execute. The driver's documented UNMODELED is correct for the current engine (same
  shape as trina's blind `heal` block). Self-only and negligible on a Supporter.
- **S2 max-stack gate / burst ×3 mirror — steady-state passive (driver) vs fable's "ungated t=0 over-credits the
  ramp" flag.** Fable conceded the gate has no schema primitive and the driver has encoding freedom; the ~2.5s
  ramp is ~1.4% of the fight. The engine has `rampSec` to model the ramp, but it is an UNMEASURED per-unit ⚑, so
  the clean steady-state passive is the faithful choice. A documented approximation, not a gotcha (residual ⚑, §4).
- **Blind S5 harness artifacts (HANDLED — NOT a faithfulness signal).** The opus S5 blind test ran 5 failed / 1
  passed / 6 skipped vs the driver's override; all 5 failures are mechanical blind-harness bugs: the patch helpers
  iterate `o.blocks` but the override shape is `{skill1:[],skill2:[],burst:[]}` (so every counterfactual is a
  silent no-op → `expected N > N`), and `nUnit` reads `u.total ?? u.damage` but the harness row exposes
  `totalDamage` (so `othersDamage` is always 0 → `expected 0 > 0`). The 1 pass ("no boss debuff") is independent
  of both bugs. The blind SPEC table (the real, fixture-independent signal) converges fully with the driver; the
  driver's own T1–T7 (25/25 GREEN) verify every load-bearing line the blind harness could not reach.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **Steady-state stack assumption (§2, CALIBRATED ⚑ — the highest-value residual).** Confirm from a focused Tove
   video that Temporary Modification actually reaches and **holds at 3 stacks continuously** across the fight
   (validates the always-on S2 auras and the maxAmmoFlat 6 / critDamagePct 5.24 passives). If it dips (a >5s
   firing gap, a stall), apply a `rampSec ≈ 2.5` / uptime haircut to critRatePct 10.08 + attackSpeedPct 42.24.
   Governs the whole S2 aura + the biggest burst line. (stack/currency steady-state ⚑)
2. **Burst ×3 mirror is static (§2, CALIBRATED ⚑).** Read the live Temporary Modification stack count on Tove's
   burst frame from footage; rescale base × observed stacks. The static ×3 (casterAtkPct 6.96 / 72.63) over-credits
   an early burst before the ~2.5s ramp (stacks < 3) and does not re-track if stacks drop mid-window (moot at
   sustained max stacks; matters only if Tove is stunned/stalled). (stack-mirror ⚑)
3. **S1 trigger cadence (§1, DATAMINED ⚑ — trigger-identity).** The normalized prose says "after 10 normal
   attacks" (deterministic ~0.83s); the raw datamine renders S1 as a "2% chance when attacking". The prose governs
   the sim, and both cadences keep the buff stacked at this fire rate, so the steady-state encoding is robust —
   but confirm the proc cadence (does the Temporary Modification icon stay at 3 stacks continuously?) to close the
   discrepancy. (trigger-cadence ⚑)
4. **Unmodeled self 5.31% reload (§2, engine primitive gap).** If an ammo-refill primitive ever lands, enact
   `instantReload fraction 0.0531` on `hitCount:10` self. Self-only and negligible on a Supporter; no board action.
   (engine primitive gap)

Magnitudes (5.24 / 10.08 / 42.24 / 2.32 / 24.21 / 6 / 6.96 / 72.63 / 79.59 / 5.31) are all kit-literal
(DATAMINED; the max-ammo line is video-confirmed COMMUNITY); the gauntlet certified the STRUCTURE around them, not
the numbers. Tove is `MODEL_ONLY` / unvalidated — the gauntlet does NOT touch tuning.

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): all 7 lines FAITHFUL; independently derived the correct
  casterAtkPct/maxAmmoFlat/alliesOfWeapon-SG/burstCast reads and pre-flagged all four shared-prior traps
  (SG double-dip, ungated t=0 gate, fullBurstEnter, maxAmmoPct). Two divergences vs the driver, both resolved for
  the driver: the burst-SG supersede (72.63) was fable's own flagged-then-adopted RECON_ERROR (co-stack 79.59 is
  correct), and the `instantReload` nearest-wrong presupposes a primitive absent from v1 (driver's UNMODELED is
  faithful). `leakDetected: null`.
- **S5** (opus, blind test): SPEC converges fully (same stats/scopes/triggers/durations; both burst lines flagged
  as the highest-value untested GAP — the Burst-I fixture cannot make Tove cast and has no SG ally; same ⚑ set).
  Run vs the driver's override: 5 failed / 1 passed / 6 skipped — all 5 failures documented blind harness
  artifacts (`o.blocks` patch-shape no-op + `u.total` row misread), NOT override divergences. The verbatim blind
  source is preserved in `cross-family/tove/s5-result.json` (`testSource`) and `blind/tove.test.ts`;
  `scripts/kit-autonomy/blind/**` is excluded from the production typecheck (evidence trail, not run by vitest).
  `leakDetected: null`.
- **S6** (opus, blind override): **independently reproduced the driver byte-for-behavior on all six modeled lines**
  from prose alone — maxAmmoFlat 6 all-allies, critDamagePct 5.24 all-allies (NOT stacked ×3), critRatePct 10.08
  all-allies passive, attackSpeedPct 42.24 alliesOfWeapon-SG passive, burst casterAtkPct 6.96 all-allies burstCast,
  and — critically — casterAtkPct 72.63 as a SECOND alliesOfWeapon-SG block co-stacking additively (S6 landed the
  driver's two-block 79.59, refuting fable's supersede). Its only structural divergence (an `instantReload` block
  for the self-reload) presupposes a nonexistent primitive → driver's UNMODELED is correct; it also independently
  modeled the max-stacks gate as an always-on passive with the same steady-state rationale + ⚑. audit
  SKIPPED ↔ unmodeled 1:1. `leakDetected: null`.
- **S7** (opus, judge): **GO 0.95**, discrimination OK (no vacuous test; §8 matrix GREEN-vs-shipped + RED-under-
  every-counterfactual), fire-rate check passes (T6 = 9 casts × 5 = 45 events; T7 = 9 casts × 2 = 18; S1/S2
  passives fire at frame 0 and persist), **0 gotchas surviving grading** (3 low-severity documented engine/
  fidelity items), full cross-family convergence. Verdict BINDING.

## 6. Board / fit note (non-gating)

Tove is `MODEL_ONLY` / `tuned: false` and appears in **no graded comp** (board: null) — the gauntlet made **no
encoding change**, so the run is board- AND regression-neutral by construction (`board-read | grep tove` → no
entry; `validate-overrides tove` → valid, 0 warnings). The gauntlet certified the existing faithful encoding via
two independent cross-family re-derivations; any future board movement (once Tove is fight-validated and graded)
is fit-exposure for a separate localization thread, never a reason to revert. `tier: MODEL_ONLY` / `tuned: false`
are deliberately preserved (the gauntlet certifies STRUCTURE, not tuning; there is no GAUNTLET tier).
