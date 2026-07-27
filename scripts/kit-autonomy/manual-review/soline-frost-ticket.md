# soline-frost-ticket — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Soline: Frost Ticket (`soline-frost-ticket`) — Water · SG · Supporter · Burst I · 40s CD · ammo 9 ·
reloadFrames 111 · chargeFrames 0 · hitsPerShot 10 · normalMult 201.5 / coreMult 200 · burstGaugePerShot 2 ·
critRate 15 / critDamage 150 · Elysion. **VARIANT** of base Soline (`soline`, SMG/Iron) — NOT the same unit.

**Verdict:** 🟢 **GO** · faithfulness **1.0** (all 7 kit lines FAITHFUL or documented UNMODELED; 0 real gotchas) ·
**cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen. Both blind
re-derivations converge with the driver; the opus S6 blind override reproduces the driver's encoding **line-for-line**.
NOTE: Soline: Frost Ticket is `MODEL_ONLY` / `tuned: false` (NOT fight-validated; `board: null`); the gauntlet
certifies STRUCTURE only and deliberately leaves `tier: MODEL_ONLY` / `tuned: false` untouched (there is no GAUNTLET
tier). **The gauntlet made NO encoding change** — the shipped parser-baseline encoding is faithful; only the override
`note` was rewritten to carry the gauntlet marker + current-state description.

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

The normalized `skills` prose is the SSOT the sim reads. **This is a ZERO direct-damage kit** — nowhere does Soline
deal %ATK damage / DoT / a rider; her only damage is base SG spray under the engine's per-unit SG landing model.

- **S1 (I'll Check Your Ticket!)**
  - ■ Activates at the start of battle AND when using Burst Skill → all allies: Issues 1 ticket, up to a maximum of 2.
    This effect is continuous. Ticket effect: Max HP ▲ (number of tickets × 10%) of the skill user's Max HP.
  - ■ Activates when entering Full Burst → all allies: Cooldown of Burst Skill ▼ 7.48 sec.
  - ■ Activates when entering Full Burst → all allies: Removes First Train Discount.
- **S2 (I'll Help You Board the Train!)**
  - ■ Activates when the HP of anyone in the squad is lower than 15% → the target if it has any tickets: Recovers
    12.27% of the skill user's final Max HP as HP. Ticket count ▼ 1.
  - ■ Activates at the start of battle → all allies: First Train Discount for 6 sec. Function: the effects of
    "I'll Help You Board the Train!" will not consume tickets.
- **Burst (I'll Get You There Safely!)** ■ Affects all allies: Recovers 32.26% of the skill user's final Max HP as HP.

The **ticket** is a stack/currency: issue 1 at battle start, +1 per her own Burst cast (cap 2); the ONLY consume is
the S2 HP<15% emergency heal. The engine has no stack/currency primitive with a cap-2 + consume-on-S2.

---

## 2. What the code does (the faithful override, line by line)

Every kit line is a buff / cooldown-reduction / heal, so every load-bearing assertion is **event-log based**
(buffApply / burstCast / fullBurstStart / recovery), never damage-total based.

- **S1 ticket Max-HP grant ⇒ `casterMaxHpPct 20` (passive, all allies, permanent)** `passive → allies →
casterMaxHpPct 20`. The prose says "10% of the SKILL USER's Max HP" → `casterMaxHpPct` family (caster-HP-scaled,
  identical flat HP to every ally), NOT `targetMaxHpPct` ("% of each target's OWN HP") — both blind agents explicitly
  rule out targetMaxHpPct. The engine resolves casterMaxHpPct to flat Max HP at apply time (sim.ts:1772), emitting
  buffApply under stat `maxHpFlat` whose KEY carries the effect value (`0:skill1:maxHpFlat:20`). The value 20 = the
  derived steady-state cap (2 tickets × 10%): she starts at 1 ticket (10%) at battle start, reaches the cap (20%) at
  her first Burst cast, and never consumes under scope-lock (the only consume is the unreachable S2 heal), so the pool
  sits at cap ~97% of the fight. **Ally-granted Max HP is offensively INERT** (atkOfMaxHpPct counts a unit's OWN Max
  HP only, e3 rule) — kept per hard rule 3 for a future consumer/scaler, NOT a silent drop. **F1** discriminates value
  (1 ticket = 10% → key `:10`, not `:20`) and target (`self` → only slot 0, not all 3 allies).
- **S1 FB-enter burst CDR ▼7.48s ⇒ `burstCdr 7.48` (fullBurstEnter, all allies)** `fullBurstEnter → allies →
burstCdr seconds 7.48`. Prose "when entering Full Burst" = team-FB entry (regardless of who bursted); both blind
  agents land fullBurstEnter (NOT oncePerBattle, NOT burstCast, NOT a percent). `burstCdr` emits NO event
  (sim.ts:2047 — it mutates `burstCdFrames` directly); its only observable is the team cadence. **F2 PINS** the block
  is live: removing it drops the Full Burst count over 180s (6 → 5; the 7.48s off the 40s CDs pulls one extra chain
  inside the fight), and it fires on all 6 FBs (kills oncePerBattle).
- **S1 "Removes First Train Discount"** **UNMODELED** (documented verbatim in `unmodeled.skill1`). Pure ticket-economy
  bookkeeping (toggles whether the S2 heal consumes a ticket); no damage, no stat, no modeled consumer; inert under
  scope-lock because the consuming heal never fires. **F3 PINS** that soline's skill1-keyed buffs emit EXACTLY
  `{maxHpFlat}` and no third (discount-removal) effect — distinguishing a documented skip from a silent drop.
- **S2 HP<15% emergency heal (12.27% caster Max HP, ticket ▼1)** **UNMODELED** (whole block; `skill2: []`). A HEAL
  (hard-rule-2 class) parked in unmodeled DELIBERATELY: the schema has no HP-threshold TriggerDef and the sim models
  no incoming boss damage, so the trigger is **STRUCTURALLY UNREACHABLE in v1 (NOT measurement-gated)**; wiring it to
  any available trigger would FABRICATE recovery events and over-credit any on-recovery consumer (measured > fudge).
  Both blind agents agree (fable: "structurally unreachable, NOT measurement-gated"; opus: "immortal boss, no HP
  pool"). **F4 PINS** that soline emits NO skill2-keyed buffApply events (no fabricated heal/discount). The hard-rule-2
  recovery-synergy intent is served by the BURST heal, which fires reliably every rotation.
- **S2 "First Train Discount for 6 sec" + Function** **UNMODELED** (documented verbatim in `unmodeled.skill2`). The
  same ticket-consumption bookkeeping, gating a heal that never fires; no damage path. (Covered by the F4 pin — skill2
  is empty.)
- **Burst heal 32.26% caster final Max HP ⇒ `heal` (burstCast, all allies)** `burstCast → allies → heal`. The heal
  emits a RECOVERY event, no HP amount (sim.ts:1950 — no HP pool modeled); its observable is a recovery CONSUMER:
  Crown's "when recovery takes effect → team Attack Damage ▲20.99% 7s" block fires whenever Crown receives a heal.
  Prose burst heal = `burstCast` (her OWN B1 cast), NOT fullBurstEnter — fable flags "drop as defensive" as the trap
  (this is the kit's live tandem channel, a MISSING not an UNMODELED if absent). **F6** discriminates trigger
  (fullBurstEnter → Crown recovery fires on FB-START frames, strictly after soline's burstCast frames — measured
  ~82-frame gap) and presence (heal removed → no recovery source, Crown recovery never fires). Fixture isolates
  soline's heal as the only recovery source (crown's own Relax self-heal removed; ada is a heal-free B3).

---

## 3. Handled forks (the divergences — none is a REAL-GOTCHA)

The judge found **0 gotchas**. The cross-family divergences all resolved toward the driver:

- **Ticket steady-state — flat passive `casterMaxHpPct 20` (driver) vs dual-trigger ramp (fable: passive battle-start
  - burstCast, cap 2).** The engine has NO cap-2/consume-on-S2 stack primitive, so the faithful AVAILABLE encoding is
    the derived steady-state flat passive (she reaches cap at her first burst and never consumes under scope-lock). The
    10%→20% ramp is a documented ⚑3 that moves **zero damage** because the grant is offensively inert (e3 rule). opus S6
    independently chose the same flat passive 20 (with a cosmetic `maxStacks:2`). Resolves toward the driver.
- **Blind S5 harness artifacts (HANDLED — NOT a faithfulness signal).** The opus S5 blind test gave a SUITE ERROR
  (0 tests run): it omits `import {describe,it,expect} from 'vitest'` and vitest globals are not enabled
  (`describe is not defined`). Two further artifacts would confound it even if loaded: its counterfactual helpers
  iterate `ov.blocks || []` but the override shape is `{skill1,skill2,burst}` (no `blocks` field → setCdr/zeroMaxHp/
  stripHeals are NO-OPS), and it filters `e.stat === 'casterMaxHpPct'` but the engine emits `stat:'maxHpFlat'`
  (FACT 1). Identical class to the takina/tove `o.blocks` no-op. The blind SPEC table (fixture-independent signal)
  converges with the driver on all six lines; convergence is carried by the spec table + the S6 override.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **burstCdr trigger identity fullBurstEnter-vs-burstCast (same-model residual — NOT behaviorally discriminable for a
   B1 opener).** For a Burst-I unit whose own cast opens every chain, soline's `burstCast` and the team
   `fullBurstEnter` fire the SAME number of times (~82 frames apart), so the cadence effect is near-identical — the
   F2 pin discriminates block-PRESENT/fires (base 6 FBs > 5 without) and kills oncePerBattle, but cannot behaviorally
   separate fullBurstEnter from burstCast. The driver chose `fullBurstEnter` on the prose wording ("when entering Full
   Burst"), corroborated by fable S2b. Spot-check against a focused recording if a multi-B1 comp ever makes the
   distinction material.
2. **Ticket steady-state ramp (⚑3 — DERIVED, damage-inert).** The flat passive 20 collapses the 10%→20% ramp (1 ticket
   at battle start → 2 after her first burst). In a team that never Full Bursts she never casts and stays at 1 ticket
   (10%). The grant is offensively inert (e3), so this moves zero board damage; recipe = confirm 2 tickets held in a
   real fight (no HP<15% consumes expected under scope-lock). If a consumer ever reads live ticket count, replace the
   flat passive with an initial-1 resource pool + burstCast delta +1 (clamp max 2).
3. **SG cadence tuple (⚑1 — mandatory ALWAYS-⚑).** SG rate of fire + reloadFrames 111 + rolling/partial-reload
   behavior — shipped datamine as-is (no charFixes). Recipe: read rounds/min + the reload gap from a focus video.
4. **SG per-unit pellet landing (⚑2).** Class `SG_LANDING_BY_BAND` is the shipped default (SG landing is per-unit; her
   own landing unmeasured). Recipe: focused solo, per-magazine damage-counter deltas by range band.
5. **S2 HP<15% emergency heal (engine primitive gap).** If an HP-threshold trigger + an HP pool ever land (and incoming
   boss damage is modeled), enact the emergency heal (12.27% caster Max HP, ticket ▼1, target = the low-HP ticketed
   ally). Until then it is correctly UNMODELED (structurally unreachable, not measurement-gated).

Magnitudes (10% per ticket, cap 2, 7.48s, 12.27%, 6s, 32.26%) are all kit-literal (DATAMINED level-10 prose values);
the only derived value is the steady-state 20 (= 2 × 10%), a damage-inert ⚑3. The gauntlet certified the STRUCTURE
around them, not the numbers. Soline: Frost Ticket is `MODEL_ONLY` / `tuned: false` — the gauntlet does NOT touch
tuning.

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): converges with the driver on ALL FOUR load-bearing lines — casterMaxHpPct
  (all allies, permanent, 10%/ticket → 20% at cap; explicitly NOT targetMaxHpPct; notes the grant is offensively
  inert), burstCdr 7.48 on fullBurstEnter (NOT oncePerBattle / burstCast / a percent), burst heal 32.26 on burstCast
  (NOT fullBurstEnter; flags "drop as defensive" as the trap), and the three UNMODELED lines (S1 discount-removal; S2
  HP<15% heal "structurally unreachable, NOT measurement-gated"; S2 First Train Discount). Only modeling note: the
  ticket ISSUANCE described as a dual trigger (passive + burstCast, cap 2) — the driver collapses this to the
  steady-state flat passive (no engine stack primitive; grant inert). `leakDetected: null`.
- **S5** (opus, blind test): SPEC converges with the driver on all six lines (A casterMaxHpPct FAITHFUL/inert; B
  burstCdr FAITHFUL; C discount-removal GAP; D HP<15% heal GAP; E First Train Discount GAP; F burst heal FAITHFUL/
  tandem-relevant). Run vs the driver's override: SUITE ERROR (0 tests — missing vitest import + `ov.blocks` no-op
  helpers + a `casterMaxHpPct` filter that never matches the engine's emitted `maxHpFlat`), NOT an override divergence.
  Verbatim source preserved in `cross-family/soline-frost-ticket/s5-result.json` (`testSource`) and
  `blind/soline-frost-ticket.test.ts`; `scripts/kit-autonomy/blind/**` is excluded from the production typecheck
  (evidence trail). `leakDetected: null`.
- **S6** (opus, blind override): **independently reproduces the driver's encoding line-for-line** — skill1[0] passive
  casterMaxHpPct 20 to allies; skill1[1] burstCdr 7.48 fullBurstEnter to allies; skill2 []; burst[0] heal burstCast to
  allies; the SAME three unmodeled lines with the SAME reasoning; and the SAME ⚑ flags (ticket steady-state 20 with
  10→20 ramp; passive trigger as steady-state stand-in; heal amount event-only). Only cosmetic diffs: `maxStacks:2`
  on the passive (no-op for a once-applied passive) and `ticks:1` on the heal (the default). audit SKIPPED ↔ unmodeled
  1:1. `leakDetected: null`.
- **S7** (opus, judge): **GO 1.0**, discrimination OK (10 tests, no vacuous test; S2d matrix all 6 FAITHFUL pins GREEN
  vs shipped + all 5 named counterfactuals RED), fire-rate check passes (the casterMaxHpPct passive applies at frame 0
  and persists; the burstCdr fires on all 6 Full Bursts; the burst heal fires on soline's 6 casts and drives Crown's
  recovery on each), **0 gotchas**, full cross-family convergence. Verdict BINDING.

## 6. Board / fit note (non-gating)

Soline: Frost Ticket is `MODEL_ONLY` / `tuned: false` (NOT fight-validated; `board: null`). `board-read | grep
soline-frost-ticket` returns nothing — she is on no graded board, so there is no before/after number to report. The
gauntlet made **NO encoding change** (the shipped parser-baseline encoding is faithful), so any future board reading is
unaffected by this run. `tier: MODEL_ONLY` / `tuned: false` are deliberately preserved (the gauntlet certifies
STRUCTURE, not tuning; there is no GAUNTLET tier). Her only damage is base SG spray (the ⚑1/⚑2 cadence + landing
flags dominate any future fit); her kit value is the team burst-CDR lever + the burst-heal recovery tandem.
