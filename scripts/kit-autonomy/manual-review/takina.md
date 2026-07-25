# takina — kit manual review

> **Per-unit manual-review doc** (kit-autonomy gauntlet, 2026-07-24). Owner's short-form review: what the sim
> implements alongside the real kit, the verdict, and the lines worth a human spot-check.

**Unit:** Takina (`takina`) — Iron · SR · Supporter · Burst II · 20s CD · ammo 6 · reloadFrames 141 ·
chargeFrames 60 · chargeMultiplier 250 · hitsPerShot 1 · normalMult 69.04 / coreMult 200 · critRate 15 /
critDamage 150 · Abnormal.

**Verdict:** 🟢 **GO** · faithfulness **1.0** (all 9 kit lines FAITHFUL or documented UNMODELED/GAP; 0 real
gotchas in the override encoding surviving grading — the 2 judge gotchas are documented, measurement/engine-gated,
and non-blocking) · **cross-family corroborated** — S2b `claude-fable-5`, S5/S6/S7 `claude-opus-4-8`; driver Qwen.
Both blind re-derivations independently reproduced the driver's structure AND the one encoding fix. NOTE: Takina is
`MEASURED` / `tuned: true` (fight-validated; recording date 2026-07-13, board mean 0.916 COLD); the gauntlet
certifies STRUCTURE only and deliberately leaves `tier: MEASURED` / `tuned: true` untouched (there is no GAUNTLET
tier). **The gauntlet made ONE encoding change** — the burst "targets hit: Damage Taken 6.04%" gate
`fbGate:'inFb'` → `swapGate:'swapped'` (a prior-audit residual, F5; cross-family corroborated and board-neutral).

---

## 1. Real kit (data/characters.json — ground truth, levels 10/10/10)

The normalized `skills` prose is the SSOT the sim reads.

- **S1 (Combat Support)** ■ Activates at the start of battle AND when Full Burst ends → self: ATK ▲ 80.04% for 5 sec.
  - ■ Activates when entering Full Burst → self: True Damage ▲ 35.05% for 15 sec.
- **S2 (Battlefield Control)** ■ Affects all enemies: Damage Taken ▲ 10.09% for 5 sec. Stuns for 2 sec.
  - ■ Affects all allies: True Damage ▲ 140.49% for 10 sec.
  - (NOTE: skill2 carries NO activation clause and the datamine skill2 table is a passive `CharacterSkill` with NO
    `skill_cooltime` — the prose gives the durations but no trigger/cooldown. Prydwen lists a 15s pulse, ⚑.)
- **Burst (Suppression Initiated)** ■ Affects self: Changes the weapon in use. Damage: 200.64% of final ATK.
  Duration: 10 sec.
  - Additional Effects — Affects self: Normal attacks deal true damage for 10 sec.
  - Additional Effects — Affects targets hit: Damage Taken ▲ 6.04% for 5 sec.

---

## 2. What the code does (the faithful override, line by line)

Takina's value is almost entirely **true-damage-scoped**. The engine gates `trueDamagePct` by flavor
(sim.ts:1414 — it applies ONLY to true-flavored hits), so her True-Damage buffs are inert on allies dealing no true
damage and live on her own swap shots (which her burst converts to true damage). This defuses the "+140% unscoped
Damage-Up" trap both blind agents warned about.

- **S1 battle-start ATK ▲80.04%/5s** **UNMODELED** (documented verbatim in `unmodeled.skill1`). The line has TWO
  activations (battle-start + Full-Burst-end); the engine has NO `battleStart` trigger and a passive-trigger buff
  ignores `durationSec` (sim.ts:983-993), so encoding the battle-start instance would over-credit a permanent 80.04%
  ATK. Only the Full-Burst-end activation is override-expressible. (opus S6 encoded a battle-start passive+durationSec
  and itself flagged the over-credit risk — confirming the skip is the faithful choice.) **T1 PINS** the absence: NO
  atkPct 80.04 at frame 0; the first lands at the first FB-END.
- **S1 FB-end ATK ▲80.04%/5s (self)** `fullBurstEnd → self → atkPct 80.04 (5s)`. **T2** discriminates trigger
  (`fullBurstEnter` lands on FB-START frames, not FB-END) and target (`allies` → all 3 slots).
- **S1 FB-enter True Damage ▲35.05%/15s (self)** `fullBurstEnter → self → trueDamagePct 35.05 (15s)` — deliberately
  outlasts the 10s FB window by 5s. Both blind agents land `fullBurstEnter` NOT `burstCast`. **T3** discriminates
  trigger (`burstCast` lands on takina's cast frames, before FB-start) and duration (5s vs 15s).
- **S2 enemy Damage Taken ▲10.09%/5s ⇒ damageTakenPct 3.36 (boss, permanent ⚑)** `passive → enemy → damageTakenPct
  3.36` (frame 0, no expiry). The prose gives no trigger/cooldown; Prydwen (COMMUNITY ⚑) lists a 15s pulse. The
  engine cannot pulse a passive trigger (passive ignores durationSec → a passive+5s encoding would be a 100%-uptime
  permanent, over-crediting), so the faithful steady-state is the UPTIME-AVERAGE: 10.09 × 5/15 = 3.36 (33% uptime).
  Boss debuff (casterIdx/targetIdx null), team-wide benefit. **T4** discriminates value (raw 10.09, no uptime-average)
  and target (`allies` → buffs the team). See §4 — the interval-pulse encoding is engine-expressible and arguably more
  faithful (owner spot-check).
- **S2 stun 2s** **UNMODELED** (boss-inert: the partless v1 boss does not fire/charge/reload, so a stun moves zero
  damage). **T6 PINS** that takina's skill2-keyed buffs emit EXACTLY `{damageTakenPct, trueDamagePct}` and no stun/CC
  stat (distinguishing a documented skip from a silent drop). Both blind agents agree.
- **S2 ally True Damage ▲140.49%/10s ⇒ trueDamagePct 93.66 (all allies incl. self, permanent ⚑)** `passive → allies →
  trueDamagePct 93.66` (frame 0, no expiry). Same uptime-average mechanism: 140.49 × 10/15 = 93.66 (67% uptime).
  Flavor-gated → inert on non-true allies, live on takina's swap shots. **T5** discriminates value (raw 140.49) and
  target (`enemy` → strips the ally buff).
- **Burst weaponSwap 200.64%/10s (self)** `burstCast → self → weaponSwap damagePct 200.64 (10s, trueNormals:true)`.
  A per-shot multiplier over the 10s window (not a one-time nuke); fires on takina's ~10 casts. **T7** discriminates
  the swap (removed → no 200.64 shots) and the true flavor (see next). Swap-shot economy (cadence/ammo/charge) is
  kit-silent (ALWAYS-⚑ #3, §4).
- **Burst "normal attacks deal true damage 10s" = `trueNormals:true`** on the weaponSwap — a same-weapon flavor swap
  (the gun never changes; normals become true-flavored at 200.64% for 10s). This is the LOAD-BEARING line that routes
  her 35.05 + the team 93.66 True-Damage buffs onto her swap output. **T7** proves the flavor: the swap shots'
  Damage-Up bucket carries the trueDamagePct contribution (faithful swap dmgUp strictly outruns the `trueNormals:false`
  counterfactual, which strips it). **Both blind agents flagged this as a GAP/no-primitive — a RECON_ERROR forced by
  the mandatory redaction**: the schema line `trueNormals?: boolean; // … (Takina: …)` NAMES Takina, so de-contamination
  stripped it from their packets. The primitive EXISTS (types.ts:225; sim.ts:2848/2874); the driver's encoding resolves
  it. opus S6's override drops the flavor and consequently UNDER-models takina.
- **Burst "targets hit: Damage Taken ▲6.04%/5s" = shotFired boss debuff, `swapGate:'swapped'` (THE FIX)** `shotFired →
  enemy → swapGate:'swapped' → damageTakenPct 6.04 (5s)`. This Additional Effect is carried by the SWAP weapon's hits,
  so it fires only while the swap is live — `swapGate:'swapped'` (sim.ts:1684-1686), NOT `fbGate:'inFb'` (the shipped
  encoding, which conflated the swap window with the FB window). For a bursting B2 the two windows overlap but are NOT
  identical. **Independently derived by BOTH fable S2b and opus S6** — cross-family corroborated. **T8** discriminates
  it: the fixture (focused sole-B2: takina casts 10× but the team completes only 5 Full Bursts) exposes 5 non-FB swap
  windows where swapGate fires the debuff and fbGate fires nothing; T8 is RED vs the shipped fbGate and GREEN vs
  swapGate, and also discriminates ungated (fires outside the swap windows + far more often).

---

## 3. Handled forks (the judge's divergences — none is a REAL-GOTCHA)

The judge found **0 gotchas in the override encoding surviving grading** (the 2 it logged are documented,
measurement/engine-gated, and non-blocking — see §4). The cross-family divergences all resolved toward the driver:

- **Burst 6.04 gate — swapGate:'swapped' (driver FIX) vs fbGate:'inFb' (shipped).** Both blind agents independently
  derived `swapGate:'swapped'` from the prose alone (fable: "shotFired-shaped with swapGate:'swapped', inheriting the
  burstCast gate via the swap's existence; NOT fullBurstEnter"; opus S6 encoded shotFired + swapGate:'swapped'). The
  debuff is carried by the swap weapon's hits, so swapGate is the faithful gate. Cross-family corroborated FIX.
- **trueNormals — driver encodes it; both blind agents flagged GAP/no-primitive (RECON_ERROR).** The trueNormals schema
  line names Takina and was (correctly, mandatorily) redacted from the blind packets, so neither blind agent could see
  the primitive. It exists; the driver's encoding is faithful and is the load-bearing line wiring the True-Damage buffs
  onto her swap output. opus S6's override under-models takina by dropping it.
- **skill2 mechanism — uptime-average permanents (driver, 3.36/93.66 on a Prydwen 15s CD) vs interval-pulse (fable
  15s / opus 20s, raw 10.09/140.49 + 5s/10s durations).** Behavior-equivalent steady-states (the same average buff over
  the fight); the driver's is better-sourced (Prydwen 15s) and fight-validated. The judge ruled this a documented
  CALIBRATED ⚑, acceptable for GO, but noted the interval-pulse is engine-expressible, uses the prose magnitudes, and is
  arguably more faithful given takina's burst-concentrated true damage (see §4 — owner spot-check).
- **battle-start ATK — UNMODELED (driver) vs passive+durationSec (opus S6).** The engine has no battleStart trigger and
  a passive ignores durationSec → the driver's UNMODELED is faithful; opus itself flagged the over-credit risk.
- **Blind S5 harness artifacts (HANDLED — NOT a faithfulness signal).** The opus S5 blind test gave a SUITE ERROR (16
  tests, all 16 SKIPPED): `beforeAll` threw `TypeError: o.blocks is not iterable` (the counterfactual helpers assume a
  `blocks` array; the override shape is `{skill1,skill2,burst}`). Two further artifacts would confound it even if it
  loaded: the `controlComp('takina')` fixture (crown holds B2 — the B2-contention trap fable warned about) and a
  `u.total`/`totalDamage` misread. The blind SPEC table (the fixture-independent signal) converges with the driver on
  every line's disposition; the driver's own T1–T8 (22/22 GREEN) verify every load-bearing line.

---

## 4. Owner spot-check cluster (the residual — systematic-prior-prone lines)

1. **skill2 cooldown + pulse shape (COMMUNITY/CALIBRATED ⚑ — the highest-value residual).** The skill2 prose gives NO
   trigger/cooldown; the uptime-average (damageTakenPct 3.36 = 10.09×5/15; trueDamagePct 93.66 = 140.49×10/15) depends
   on Prydwen's 15s pulse. **The judge recommends measuring the real skill2 cooldown + first-fire phase + pulse shape
   from a focused Takina recording and considering a switch to the engine-expressible interval-pulse** (`interval` trigger
   honors durationSec, unlike passive): `interval(sec=measured)` with 10.09/140.49 at 5s/10s durations. The two are only
   steady-state-equivalent for uniformly-distributed damage; takina's true damage is burst-concentrated in a 10s swap
   window, where a pulse's alignment vs a flat 93.66 can differ materially. Verify the pulse-vs-swap alignment doesn't
   over/under-credit her swap-window true damage. (trigger-cadence + steady-state ⚑)
2. **True swap normals CRIT in the engine (ENGINE-fidelity ⚑ — broad blast radius).** sim.ts:2842 hardcodes `crit:true`
   for swap normals; the §2c "true damage cannot crit" carve-out (owner ruling 2026-07-21) is plumbed only for riders
   (RIDER_CRIT, sim.ts:84/2891), NOT swap normals. Measured: takina's 200.64% swap shots are critEligible. **This is an
   ENGINE question, not an override encoding** — chisato/laplace share the swap-normal path, so a fix is broad-blast-radius
   and needs an owner ruling. Recipe: if §2c should apply to swap normals, extend the RIDER_CRIT crit-suppression to
   `weaponSwap.trueNormals` shots, then re-measure the affected units' boards. Board impact currently unmeasured.
3. **Swap-shot economy (kit-silent ⚑, ALWAYS-⚑ #3).** Cadence/charge/ammo of the swapped 200.64% weapon are kit-silent;
   estimated optimistically by the engine's swap model (no Full Charge line → no chargeMultPct). Recipe: count normal-attack
   popups inside the 10s burst window → derive shots/sec + magazine; set weaponSwap pullsPerSec/maxAmmo/maxShots if material.
4. **Battle-start ATK 80.04%/5s (engine primitive gap).** If a `battleStart` trigger ever lands, enact the battle-start
   activation (self atkPct 80.04, 5s). Until then it is correctly UNMODELED (the FB-end activation IS modeled).

Magnitudes (80.04 / 35.05 / 10.09 / 140.49 / 200.64 / 6.04) are kit-literal (DATAMINED); the derived uptime-average
values (3.36 / 93.66) are CALIBRATED ⚑ on the community 15s cooldown. The gauntlet certified the STRUCTURE around them,
not the numbers. Takina is `MEASURED` / `tuned: true` — the gauntlet does NOT touch tuning.

---

## 5. Cross-family provenance + convergence

- **S2b** (fable, pre-op adversarial): 7/8 lines converge on disposition + trigger identity; independently derived
  skill1 ATK on fullBurstEnd (not fullBurstEnter), skill1 TrueDmg 35.05 on fullBurstEnter (not burstCast), weaponSwap
  200.64 on burstCast, and — critically — the burst 6.04 debuff as shotFired + **swapGate:'swapped'** (matching the
  driver's FIX). Divergences: proposed an interval-pulse for skill2 (real 10.09/140.49 + durations) and flagged the
  true-damage conversion as a schema GAP (trueNormals line redacted). `leakDetected: null`.
- **S5** (opus, blind test): SPEC converges with the driver on every line's disposition; only spec-level divergence is
  the skill2 VALUE (raw 10.09/140.49 interval-pulse vs the driver's uptime-average 3.36/93.66 — the documented ⚑) and
  the trueNormals line flagged as no-primitive (redaction artifact). Run vs the driver's override: SUITE ERROR (16
  skipped — `o.blocks is not iterable` harness artifact + controlComp B2-contention + u.total misread), NOT an override
  divergence. Verbatim source preserved in `cross-family/takina/s5-result.json` (`testSource`) and `blind/takina.test.ts`;
  `scripts/kit-autonomy/blind/**` is excluded from the production typecheck (evidence trail). `leakDetected: null`.
- **S6** (opus, blind override): independently reproduced the skill1/skill2/burst structure AND the **swapGate:'swapped'**
  gate on the burst 6.04 debuff — cross-family corroboration of the FIX. Divergences adjudicated: skill2 as interval(sec=20)
  pulse (behavior-equivalent steady-state; driver better-sourced + fight-validated); trueNormals dropped as "no primitive"
  (RECON_ERROR forced by redaction → S6 UNDER-models takina); battle-start ATK as passive+durationSec (S6 self-flagged the
  over-credit). audit SKIPPED ↔ unmodeled 1:1. `leakDetected: null`.
- **S7** (opus, judge): **GO 1.0**, discrimination OK (22 tests, no vacuous test; §8 matrix GREEN-vs-shipped + RED-under-
  every-counterfactual; the T8 FIX line RED vs shipped fbGate / GREEN vs swapGate), fire-rate check passes (burst blocks
  fire on takina's ~10 casts; skill1 FB-end/FB-enter blocks fire per Full Burst; skill2 passives fire at frame 0 and
  persist), **0 gotchas in the override encoding surviving grading** (2 documented measurement/engine items), full
  cross-family convergence. Verdict BINDING.

## 6. Board / fit note (non-gating)

Takina is `MEASURED` / `tuned: true` (fight-validated; recording 2026-07-13). The gauntlet's ONE encoding change
(fbGate→swapGate on the burst 6.04 debuff) is **board-neutral**: `board-read | grep takina` → 0.916 COLD ▼ (n=1),
essentially unchanged from the pre-gauntlet kit-status record (mean 0.9158). The ~8% under-prediction (COLD) is a
separate fitting/localization concern (the kit-status notes the swap-window shot economy is unmeasured, ~1.044 HOT in
other comps); the gauntlet certifies STRUCTURE and any future board movement is fit-exposure for a separate thread, never
a reason to revert the faithful swapGate fix. `tier: MEASURED` / `tuned: true` are deliberately preserved (the gauntlet
certifies STRUCTURE, not tuning; there is no GAUNTLET tier).
