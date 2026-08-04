# STATE.md — what the sim does RIGHT NOW (the landed-state registry)

> **Read this first.** This is the current-state index: the live value of every engine flag, timing
> constant, rotation rule, geometry model, and opt-in kit primitive, each with a one-line meaning and
> a `→ DECISIONS <date>` pointer to the entry that explains _why_. It answers "what is landed today?"
> so you don't have to reconstruct the answer from a 1,600-line changelog.
>
> **Class: CURRENT-STATE (see [CONVENTIONS.md](CONVENTIONS.md) → Doc hygiene).** This doc is a
> _derived index_, freely rewritten and pruned — stale content is deleted here, not marked. It holds
> no history; the history lives in [DECISIONS.md](DECISIONS.md) (the append-only why-log).
>
> **Conflict rule.** On any disagreement: **live engine code** (`src/engine/sim.ts`, verified by
> file:line below) wins on "what does the sim do"; the **latest dated DECISIONS entry** wins on "what
> was decided." If STATE.md disagrees with either, STATE.md is the bug — fix it here.
>
> Authority order, doc taxonomy, and the update discipline that keeps this current: CONVENTIONS.md.
> Last swept from DECISIONS + `sim.ts` on 2026-07-21.

---

## 1. Engine feature flags (live defaults)

All engine env reads go through `ENV` (`sim.ts:37`), which is empty in the browser bundle — so **the
browser always runs these defaults**. Env overrides are for A/B testing only.

| Flag                                                       | Live default                           | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Revert with                                                                                  | Provenance                            |
| ---------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| `DOTCRIT`                                                  | **ON**                                 | DoT ticks + stored-hit releases roll crit universally (per-dot `crit` field still overrides; core stays OFF)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `DOTCRIT=off`                                                                                | → DECISIONS 2026-07-21                |
| `RIDERCRIT`                                                | **ON**                                 | `extraHitDamagePct` function-rider hits roll crit at caster rate (core stays OFF; FB by landing time). Carriers: `modernia`, `nayuta`, `neon-vision-eye`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `RIDERCRIT=off`                                                                              | → DECISIONS 2026-07-22                |
| `CONE_DELTA`                                               | **ON**                                 | δ-offset ("Rician") core-hit cone for AR/SMG/SG; pre-empts the older tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `CONE_DELTA=0`                                                                               | → DECISIONS 2026-07-19                |
| `HRCORE`                                                   | **ON**                                 | Live Hit Rate shrinks the reticle → higher core fraction (AR/SMG/SG)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `HRCORE=0`                                                                                   | → DECISIONS 2026-07-17                |
| `PELLET_GAUSS`                                             | **ON**                                 | Center-weighted Gaussian pellet cone (core-hit + SG landing); the `CONE_DELTA=0` fallback layer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `PELLET_GAUSS=0`                                                                             | → DECISIONS 2026-07-15/19             |
| `STAGE_WINDOW`                                             | **120** frames (2s)                    | Stage-2/3 chain grace window (was mis-set to 600 = the FB-state duration)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `STAGE_WINDOW=600`                                                                           | → DECISIONS 2026-07-21                |
| `B3_LEFTMOST`                                              | **OFF** (first-ready)                  | Stage filler = earliest-ready unit (tie → leftmost); `=1` restores strict-leftmost                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `B3_LEFTMOST=1`                                                                              | → DECISIONS 2026-07-21                |
| `ROTMODEL`                                                 | **`floor`**                            | Fixed post-FB chain block active; `=refill` opens the chain on gauge-full instead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `ROTMODEL=refill`                                                                            | → DECISIONS 2026-07-13                |
| `SGLANDING`                                                | **bonded table**                       | SG pellet-landing table selector (`legacy`/`popupcount`/`prebond`/`geo`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `SGLANDING=<arm>`                                                                            | → DECISIONS 2026-07-15/16             |
| `CORERATE` / `CORERATEBAND` / `ACR`                        | measured band table                    | Core-rate A/B knobs (`CORERATE=flat` → old 0.85; `CORERATEBAND=off` → flat per-weapon; `ACR=<n>` → hard override)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (as noted)                                                                                   | → DECISIONS 2026-07-15                |
| `FBRULE`                                                   | **`timing`**                           | Which skill/rider/DoT damage gets the +50% FB major. Default flipped `perkit`→`timing` 2026-07-23 as a VERIFIED NO-OP (zero `noFb` carriers remain, so both arms were already identical); the validator now REJECTS `noFb` so it can't come back as a silently-dead flag. Burst-cast damage stays FB-exempt under every arm. Arms: `perkit` (revert, vestigial)/`dotfb`/`seqoff`/`noskillfb`                                                                                                                                                                                                                                            | `FBRULE=<arm>`                                                                               | → DECISIONS 2026-07-13/14, 2026-07-23 |
| `SMGRATE`                                                  | **default = 20.0/s** (frame-quantized) | SMG fire interval is quantized to whole frames → **20.0 rounds/s**, the MEASURED cadence (ammo counter, `idoll-ocean` focused, 2 range bands). 1440 rpm = 2.5 frames at 60 fps → `ceil`=3 frames = 20.0/s; SMG is the only roster weapon whose datamined rate isn't a whole frame count, so quantization is a no-op for every other class. Fixed the whole SMG class (control-suite liter 1.208→1.031, chisato 1.154→0.975, quency-escape-queen 1.174→1.046, little-mermaid 1.042→0.967, idoll-ocean 1.166→1.017); board ±5% 10→13; all 11 measured FB assertions preserved. Flipped default-ON 2026-07-23 (`SMGQUANT` opt-in retired). | `SMGRATE=24` = revert to the pre-quantization nominal (A-B arm); `SMGRATE=<n>` pins any rate | → DECISIONS 2026-07-23                |
| `XCRIT` / `XCORE` / `XINSTEXPL`                            | empty                                  | Per-slug opt-in lists (dot-crit / dot-core / in-FB stored-hit release) for experiments                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | (slug list)                                                                                  | —                                     |
| `DBG_UNIT` / `DBG_GAUGE` / `DBG_CD` (+`DBG_N`/`DBG_BUFFS`) | OFF                                    | Debug taps (per-instance buckets / gauge / burst-CD decisions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | (as set)                                                                                     | —                                     |

Seeding: `cfg.seed` (config, not env) switches the sim from expected-value to a mulberry32 Monte-Carlo
run; `SEEDS=N` runs the MC wrapper (`DEFAULT_MC_SEEDS=25`, base 1000). Seeded-only scatter (SG landing
jitter, range-transition ±2s, stage-cast-gap ±9f) is inert in the unseeded gate.

Event log: `cfg.onEvent` (config, not env — landed 2026-07-23) is the engine's structured timeline for
tests and tooling: `shot` / `damage` / `buffApply` / `buffRemove` / `reload` / `burstCast` /
`fullBurstStart` / `fullBurstEnd`. PURE OBSERVATION — every emit is guarded, so an unset hook emits
nothing and output is byte-identical (proven by a whole-board `experiment.ts` A/B, not just the
snapshots). `damage` comes from `dealDamage`, the one choke point every source funnels through, and
carries bucket + source slot + resolved crit/core rates + the full multiplier decomposition, which is
what makes a SCOPING claim (e.g. `critRateNormalPct` on normal attacks only) assertable at all. Full
contract + the deliberate gaps (no `buffExpire` — lapse is lazy; no per-hit event — MG/SG pulls
aggregate) on `SimEvent` in `src/types.ts`; pinned by `scripts/tests/engine/event-log.test.ts`.

Bursting off: `cfg.disableBursts` (config, not env — landed 2026-07-23) plays the fight with
bursting turned OFF, as the owner can in game. It guards the CHAIN OPENER, so stage never leaves 0
and cast selection / stage advance / Full Burst are all unreachable by construction; the gauge still
fills and clamps at 100, pinned as it is in a real fight where the player never presses. Default-off
and byte-identical unset (proven by a whole-board `board-read.ts` A/B). Built for the BASE-WEAPON
faithfulness basis ([data/clean-weapons.md](data/clean-weapons.md)); pinned by
`scripts/tests/units/clean-weapons.test.ts`. → DECISIONS 2026-07-23.

## 2. Named timing / cadence / stat constants

| Constant                                    | Value                                                  | Meaning                                                                                                                     | `sim.ts` |
| ------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| `FPS`                                       | 60                                                     | Tick rate (all sec→frame conversions)                                                                                       | :41      |
| `FIGHT_DELAY_FRAMES`                        | ~8 (0.133s)                                            | Fight-start deploy delay — no firing/charging/reloading/gauge until then (`FIGHTDELAY` seconds overrides)                   | :48      |
| `STAGE_CAST_GAP_FRAMES`                     | 30 (0.5s)                                              | Gap between chain stage casts (B1→B2→B3); measured-correct                                                                  | :98      |
| `PRE_B1_GAP_FRAMES`                         | 30 (0.5s)                                              | Gap between gauge-full and the B1 cast (default ON; `PREB1GAP=off` reverts)                                                 | :105     |
| `FB_PRE_DELAY_FRAMES`                       | 22                                                     | Gap between the B3 cast and the FB countdown starting (default ON; `PREFB=off` reverts)                                     | :110     |
| `FULL_BURST_FRAMES`                         | 600 (10s)                                              | Full Burst duration                                                                                                         | :111     |
| `SR_BOLT_RECOVERY_FRAMES`                   | 22                                                     | Release latency for release-fired charge weapons (SR + RL); autofire exempt                                                 | :123     |
| `STAGE_WINDOW_FRAMES`                       | 120 (2s)                                               | Stage-2/3 chain window deadline (stage 1 never expires)                                                                     | :1125    |
| `POST_FB_CHAIN_DELAY_FRAMES`                | **150 (~2.5s)**                                        | Next chain can't open until FB-end + 150f (`POSTFB` overrides; the earlier 180f double-counted the now-separate 30f-pre-B1) | :1114    |
| `PULLS_PER_SEC`                             | AR 12 · SMG 24 · SG 1.5 · MG 60 · Pistol 4             | Class fire cadence (MG uses the ladder)                                                                                     | :127     |
| `MG_RAMP_INTERVALS`                         | 35-step ladder → 1/frame                               | MG wind-up frame gaps; first 18 rounds don't core; wind-down grace 16f                                                      | :134     |
| `RELOAD_TAIL_FRAMES`                        | 13 (0.21s)                                             | Additive reload tail: `round(base·0.975·(1−buff)) + 13`                                                                     | :163     |
| `UNHITTABLE_FRAMES`                         | 60 (1s)                                                | Boss off-screen at each range transition (blocks burst casts)                                                               | :195     |
| `BOSS_RANGE_SCRIPT`                         | 0/33/70/106/144/176s → mid/near/far/midfar/near/midfar | Test-boss range timeline                                                                                                    | :171     |
| `FOCUS_CHARGE_GEN` / `UNFOCUSED_CHARGE_GEN` | 2.5 / 1.0                                              | Camera-focus charge-gauge multiplier fallback vs unfocused flat — per-unit `fullChargeBonus/100` is the real multiplier (see below) | :987     |
| Base-5 `staticAtk`                          | Attacker 118,027 · Supporter 98,367 · Defender 78,707  | Combat-ATK basis (NOT battle-records ATK, NOT OL0) + a modeled relationship/bond bonus                                      | —        |

## 3. Burst rotation model (the live chain)

The **coherent first-burst rotation model** (frame-measured from chisato.mov, LANDED 2026-07-21). The
fight opens with a **~8f deploy delay** (`FIGHT_DELAY_FRAMES`) during which no unit fires, charges,
reloads, or generates gauge; mags start full. On auto the chain is:

**`fight-start (~8f) → gauge-full → 30f → B1 → 30f → B2 → 30f → B3 → 22f → FB countdown (10s)`**

- The inter-cast gaps: **30f before B1** (`PRE_B1_GAP_FRAMES`, default ON), **30f between stages**
  (`STAGE_CAST_GAP_FRAMES`), and **22f between the B3 cast and the FB countdown** (`FB_PRE_DELAY_FRAMES`,
  default ON — instant burst-cast attacks land in this gap, before FB begins, which is why they miss the
  +50%). So gauge-full → FB-start ≈ **112f (~1.87s)**.
- Full Burst runs 600f; burst-gauge generation is LOCKED during it; then the chain is blocked a further
  **150f** (`POST_FB_CHAIN_DELAY_FRAMES`, ~2.5s — the earlier 180f double-counted the now-separate 30f-pre-B1).
- A stage-2/3 filler is the **earliest-ready unit (tie → leftmost)**; the chain waits for a not-yet-ready
  filler only within the 120f `STAGE_WINDOW_FRAMES` grace, else it collapses to refill. A 3rd same-cooldown
  B3 that can't fit the short window never casts (bench-B3 exclusion, by design).
- SR/RL release-fired charge weapons carry the 22f bolt/release latency (autofire exempt; +11f start
  recovery at fight-start).

Standing rotation facts: focus-unit charge weapons make gauge at their per-unit `fullChargeBonus/100`
multiplier (focus-only; middle slot by default) — ×2.5 for the 250-family (the roster majority);
alice 3.5×, cinderella 2.0× (owner override, `charFixes.focusChargeMult`), scarlet-black-shadow
1.5×; vesti-tactical-upgrade pinned to the flat 2.5× (`PENDING_TEAM_ISOLATION`, not yet
sim-supported). Burst-cast damage lands **before** Full Burst — it misses the +50% FB major and FB-entry
auras, but buffs live at cast (incl. allies' same-rotation burst-granted buffs) still apply. Full-burst
counts are cooldown/chain arithmetic — deterministic run-to-run except at boss-transition/chain
collisions. → DECISIONS 2026-07-13 (chain/POST_FB/22f/focus/burst-cast), 2026-07-21 (window 600→120,
first-ready selection, coherent first-burst model). Detail: [data/game-mechanics.md](data/game-mechanics.md).

## 4. Core-hit & SG-landing geometry (live model)

**UNIGEO (default `'all'`, shipped 2026-07-22)** — accuracy-circle weapons (AR/SMG/SG) on the
scope-lock boss profile use the **uniform-in-circle** model (`src/engine/unigeo.ts` +
`unigeo-coverage.ts`, wired in `sim.ts`): shots/pellets land uniform per area inside the aim circle,
whose radius is **R(hr) = (0.648 × datamined `start_accuracy_circle_scale` / 2) · (1 − hr/100) px**
— linear to zero at Hit Rate 100 (measured: owner tracings 79.3 px @ HR 0 / 48.2 px @ HR 38.91,
weapon-matched SG pair, three-way cross-validated).

- **SG landing** = **0.96 × coverage(band, R(hr))** — the circle's coverage by the owner-traced boss
  silhouette, range-scaled px ∝ 1/d (band distances 20.7/30.7/40.7/50.7). Landing is now
  **Hit-Rate-dependent** (the old table had no HR term). ε = 0.96 is the measured tracking-wander
  loss (owner-ruled real). Seeded runs draw whole pellet counts as before.
- **SG core-per-landed** = (r_core(band)/R(hr))² ÷ coverage, clamped.
- **AR/SMG core-per-hit** = uniform-disc ∩ core lens overlap with per-class centering offset
  **δ(hr) = δ0·(1−hr/120)** (⚑ δ0 = AR 15.9 / SMG 17.9 px) and effective-circle fraction
  **f_bloom** (⚑ AR 0.578 / SMG 0.728 — the SMG pair is a SATURATED 2-cell calibration, active
  red flag on little-mermaid long bands).
- **⚑ Core diameters mid/midfar/far = fit-selected series C (31/20.9/15.8/12.7 px)** — near 31 is
  measured; the long bands are contested (pro-B range-data argument vs anti-B counted cells,
  unresolved) and an owner re-trace supersedes them.
- **MG/SR/RL**: flat 0.95 core rate, untouched. **Medium/large `bossPelletProfile`** fights fall
  through to the δ-cone path (coverage tables are the scope-lock silhouette only).
- **Revert arm:** `UNIGEO=off` restores the pre-UNIGEO cone engine byte-identically (cone params
  frozen in `sg-geometry.ts`; the old `SG_LANDING_BY_BAND` bonded table lives on that path only).
  → DECISIONS 2026-07-22 (UNIGEO SHIPPED — evidence stack, fit-exposure note, ⚑ inventory); full
  gated record `handoffs/scientific-method-harness.md` 2026-07-22 + `handoffs/2026-07-22-sg-geometry-handoff.md`.

**KNOWN INTERIM STATE — SG override calibration debt:** the old landing sat 12–24% above the
measured landing, so SG-unit board readings regressed (mean |ratio−1| 0.084 → 0.131) until the
**SG override re-tune** follow-up pass lands. The N5 fire comp's Full-Burst shortfall (real 12 vs
sim 10) is **open-questions U29** (pre-existing burst-generation question, not a UNIGEO regression).
The isabel mid/midfar clock-drift re-derive stays open (**U27**).

## 5. Opt-in kit primitives inventory

Capabilities an override (`src/skills/overrides/<slug>.json`) can invoke. Each is **inert until an
override opts in** (regression byte-identical for non-users). Schema: `src/skills/types.ts`; handling
in `src/engine/sim.ts`. Authoritative per-unit usage: grep the overrides — the slug lists below are
current but not a contract.

### Special triggers (`block.trigger.kind`)

| Primitive                | Meaning                                                              | Users                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `interval`               | Fires every `sec` seconds (internal-cooldown skill)                  | helm-aquamarine, isabel, rosanna-chic-ocean, sakura-bloom-in-summer, snow-white                                           |
| `hitCount` / `countInFb` | Every N cumulative owner hits; `countInFb` swaps the threshold in FB | ~30 units (hitCount); rapi-red-hood, scarlet-black-shadow (countInFb)                                                     |
| `chargeCounter`          | Cycling per-full-charge phase counter                                | scarlet-black-shadow                                                                                                      |
| `teamAmmo`               | Fires when total ally ammo consumed crosses N                        | cinderella-crystal-wave, little-mermaid                                                                                   |
| `shotFired`              | Every owner trigger pull                                             | ~21 units (cinderella, soda-twinkling-bunny, prika, milk-blooming-bunny, …)                                               |
| `lastBullet`             | On owner's last bullet / reload start                                | anis-sparkling-summer, helm, privaty                                                                                      |
| `recovery` / `shielded`  | When owner receives a heal / shield event                            | asuka, crown / flora, naga                                                                                                |
| `stageEnter`             | When a stage-N burst is cast by anyone                               | cinderella, ein, flora, mast-romantic-maid, mint, mihara-bonding-chain, rei-ayanami, snow-white-heavy-arms, soda-twinkling-bunny |
| `bossElement`            | Permanent passive, active only if boss has this element              | eve                                                                                                                       |

### Block-level gates

| Primitive                          | Meaning                                                                                                                                                               | Users                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `requiresCore`                     | Inert when the fight has no core exposure                                                                                                                             | liberalio, ludmilla-winter-owner, mari                                               |
| `fbGate` (`inFb`/`outFb`)          | Only inside / outside Full Burst                                                                                                                                      | modernia, soda-twinkling-bunny, zwei, velvet                                         |
| `swapGate` (`swapped`/`unswapped`) | Only while owner's weaponSwap is live / not                                                                                                                           | laplace, snow-white-heavy-arms                                                       |
| `requiresShielded`                 | Only while owner carries a shield                                                                                                                                     | naga                                                                                 |
| `requiresTargetStatus`             | Only while the boss carries the NAMED status opened by a `targetStatus` effect. Name-keyed, so an unrelated kit's status never opens it; composes with `requiresCore` | d-killer-wife (`'Wipe Out'`), privaty (`'Designated Target'`)                        |
| `bossElementGate`                  | Only when boss element matches (composes with any trigger)                                                                                                            | brid-silent-track, eve, helm-aquamarine                                              |
| `ownBurstGate` (`cast`/`notCast`)  | Gated on whether owner cast own burst into this FB                                                                                                                    | arcana, cinderella-crystal-wave                                                      |
| `resourceGate`                     | Fires only when a named resource pool is within [min,max]                                                                                                             | soda-twinkling-bunny                                                                 |
| `everyN` / `everyNOffset`          | Effects land on every Nth activation (offset phases it)                                                                                                               | mast-romantic-maid, neon-vision-eye, soda-twinkling-bunny                            |
| `formation` (`noB1`/`hasB1`)       | Static squad-formation gate                                                                                                                                           | anis-star, rapi-red-hood                                                             |
| `teamHas` (+`.slugs`/`.sameSquad`) | Static team-composition gate (element/class/weapon/burst/named slugs/same-squad). `.sameSquad` resolves membership from the curated squad map `src/data/squads.ts` and fails closed on unmapped owners | blanc (`.sameSquad`), eunhwa-tactical-upgrade, noir (`.slugs` — migration pending)   |
| `mode` / `modes`                   | Block active only in the unit's selected kit mode                                                                                                                     | bready, cinderella-crystal-wave, delta-ninja-thief, mint, milk-blooming-bunny, prika |
| `delaySec` (block-level)           | The block's EFFECTS apply `delaySec` seconds after its TRIGGER fires. Gates + the `everyN` counter evaluate at TRIGGER time; targets and values resolve at LANDING; a landing past the end of the fight never applies. Absent/0 = inline (strict no-op). NOT `flatDamage.delaySec`, which is flight time on one damage effect | flora (S2 True Damage, Burst Stage 2 entry + 2 s)                                    |

### Targeting selectors (`block.target`)

| Primitive                                                                        | Meaning                                                                               | Users                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `burstCasters` / `nonBurstCasters`                                               | Allies who did / didn't burst this rotation                                           | ada, arcana, crown / crown                                                                                           |
| `alliesTopAtk` / `alliesLowestAtk` / `alliesLowestHp`                            | N highest / lowest ATK / lowest HP allies                                             | alice, maxwell, miranda, naga, soda-twinkling-bunny / liberalio / blanc                                              |
| `alliesOfElement` / `alliesOfClass` / `alliesOfWeapon` / `alliesOfElementWeapon` | All allies of an element / class / weapon / element+weapon                            | (element) 9 units; arcana-fortune-mate; (weapon) arcana-fortune-mate, d-killer-wife, drake, leona, noir, rem, tove; trina |
| `selfAndAdjacent`                                                                | Self + N allies each side (positional). Whether `sides` counts per-side or in total is open — U38  | flora, rouge                                                                                                         |
| `excludeSelf`                                                                    | Drops owner from the pool before slicing                                              | arcana-fortune-mate, blanc, brid-silent-track, grave, liberalio, maiden-ice-rose, miranda, soda-twinkling-bunny      |
| `byFinalAtk`                                                                     | Rank by live buffed ATK instead of base staticAtk (keyed on the literal word "final") | alice, liberalio, miranda, soda-twinkling-bunny                                                                      |

### Effect kinds & flags

| Primitive                                                                   | Meaning                                                                                                                                                                                                                                                                                                                                                                                       | Users                                                                                                                         |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `weaponSwap` (+`pullsPerSec`/`weapon`/`trueNormals`/`hasPierce`/`maxShots`) | Temporary weapon override (cadence/class/flavor/pierce/uses-based end)                                                                                                                                                                                                                                                                                                                        | ada, chisato, cinderella-crystal-wave, laplace, maxwell, nayuta, moran, red-hood, snow-white-heavy-arms, takina, velvet, zwei |
| `storedHit` (+`instantInFb`)                                                | Charges that release at FB start; `instantInFb` detonates in-FB                                                                                                                                                                                                                                                                                                                               | rapi-red-hood                                                                                                                 |
| `stackedNuke`                                                               | Hits once per FB the unit sat out since its last burst                                                                                                                                                                                                                                                                                                                                        | maiden-ice-rose                                                                                                               |
| `gainPierce`                                                                | Timed "Gain Pierce" window                                                                                                                                                                                                                                                                                                                                                                    | ade-agent-bunny, asuka, grave, milk-blooming-bunny                                                                            |
| `targetStatus`                                                              | Inflicts a kit-NAMED status on the boss for `durationSec` (name → expiry window, max-extends per name). The SOLE enemy-status channel — replaced the hardcoded `wipeOut`/`requiresWipeOut` pair 2026-07-23. Target is implicitly the enemy: the engine ignores `block.target`, though the validator requires the block to be authored `target: enemy`                                         | d-killer-wife (`'Wipe Out'`, 10s), privaty (`'Designated Target'`, 10s)                                                       |
| `burstEligibility` / `burstFirst` / `reenterStage`                          | Unit may also burst at a stage / takes first eligible / holds stage for another                                                                                                                                                                                                                                                                                                               | anis-star, rapi-red-hood / prika / anis-star                                                                                  |
| `advantageVs`                                                               | Counts as elementally advantaged vs a boss element (also derived into `countsAsElements` for the UI — see below)                                                                                                                                                                                                                                                                              | rapi-red-hood                                                                                                                 |
| `burstCdr`                                                                  | Reduces targets' burst cooldowns                                                                                                                                                                                                                                                                                                                                                              | ~14 units (anis-star, arcana, blanc, liter, red-hood, rouge, …)                                                               |
| `escalating`                                                                | Liter-style Once/Twice: Nth activation applies steps 1..N                                                                                                                                                                                                                                                                                                                                     | anchor-innocent-maid, isabel, helm-aquamarine, liter, volume                                                                  |
| `fullBurstExtend`                                                           | Extends Full Burst duration                                                                                                                                                                                                                                                                                                                                                                   | isabel, modernia, soda-twinkling-bunny                                                                                        |
| `unlimitedAmmo`                                                             | Infinite-ammo window                                                                                                                                                                                                                                                                                                                                                                          | grave, modernia, moran, nayuta, red-hood                                                                                      |
| `instantReload` / `consumeAmmo`                                             | Refill magazine / empty it (forces reload)                                                                                                                                                                                                                                                                                                                                                    | ~9 units (asuka-wille, eve, noir, …) / (none)                                                                                 |
| `stun`                                                                      | Target can't fire/charge/reload                                                                                                                                                                                                                                                                                                                                                               | mast-romantic-maid                                                                                                            |
| `flatDamage` (+`delaySec`/`charge`/`chargeMultPct`/`requiresPulls`)         | Flat hit (flighted-and-snapshotted / charge-bucket / pull-gated)                                                                                                                                                                                                                                                                                                                              | asuka-wille, rapi-red-hood, snow-white, cinderella-crystal-wave, nayuta, red-hood, ada, zwei                                  |
| `rampSec`                                                                   | Linearly ramps a buff/flatDamage contribution 0→full over rampSec                                                                                                                                                                                                                                                                                                                             | arcana-fortune-mate, cinderella                                                                                               |
| `whileSwapped`                                                              | Buff counts only while owner's weaponSwap is live                                                                                                                                                                                                                                                                                                                                             |                                                                                                                               |
| `removeOnReload`                                                            | Buff stripped on reload-to-max                                                                                                                                                                                                                                                                                                                                                                | vesti-tactical-upgrade                                                                                                        |
| `durationShots`                                                             | ROUND-COUNT buff expiry: the buff ends after the HOLDER fires N rounds, not after a wall-clock window, so it stretches across reloads. A round = one bullet (`hitsPerShot` for an MG), decremented in `firePull` after block dispatch so the Nth shot still benefits — the `weaponSwap.maxShots` shape. Combine with `durationSec` for "N rounds OR t sec, whichever first"; omit = time-only. Paired with `noRetriggerWhileActive` (below), the GRANTING shot is exempt from its own decrement | helm (burst Charge Damage Multiplier, 10 rounds), vesti-tactical-upgrade (Missile Guide, 3 rounds)                            |
| `noRetriggerWhileActive`                                                    | SELF-STATUS GATE for "Activates ... while NOT in [own status]" kit lines: skips re-applying a buff (no refresh/re-stack) while a same-key instance is already active on the target, and its granting shot is exempt from `durationShots`'s own round-count decrement (2026-08-03; fixes a self-consuming trigger — one that both grants a round-count buff and fires again while it's live — from re-arming its own window every shot instead of lapsing after N rounds) | vesti-tactical-upgrade (Missile Guide: 1 slow charge + 3 near-instant follow-ups per cycle)                                   |
| `perResource` / `resource(s)`                                               | Buff/DoT value = live resource pool × mult / declare-adjust a pool                                                                                                                                                                                                                                                                                                                            | soda-twinkling-bunny                                                                                                          |

### Special StatKeys (opt-in buckets)

| Primitive                                             | Meaning                                                                                                                                                                                                                                | Users                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `sequentialMultPct`                                   | True multiplier on sequential-flavored damage (own bucket)                                                                                                                                                                             | eve                                                            |
| `highestAllyAtkPct`                                   | Flat ATK = % of the highest ally's (static) ATK                                                                                                                                                                                        | guilty                                                         |
| `normalAttackPct`                                     | Scales the normal-attack multiplier                                                                                                                                                                                                    | arcana-fortune-mate, asuka-wille, jill, mast-romantic-maid     |
| `pelletCountFlat`                                     | Flat effective SG pellet-count add for a window                                                                                                                                                                                        | arcana-fortune-mate, dorothy-serendipity                       |
| `critRateNormalPct`                                   | Critical Rate that applies ONLY to normal-attack hits ("Critical Rate of normal attacks ▲x%") — never to skill procs or burst damage. Distinct from the unscoped `critRatePct`; `dealDamage` adds it only when `category === 'normal'` | helm (S1, allies)                                              |
| `maxAmmoFlat`                                         | Flat round-count added on top of `maxAmmoPct`                                                                                                                                                                                          | grave, noir, tove                                              |
| `hitRatePct`                                          | Core-hit lift via `hrCoreMult` (HRCORE-gated; AR/SMG/SG only)                                                                                                                                                                          | ~14 units (jill, noir, modernia, …)                            |
| `atkOfMaxHpPct` / `atkOfCasterMaxHpPct` / `casterMaxHpPct` / `targetMaxHpPct` / `highestAllyMaxHpPct` | Flat ATK = % own live Max HP (per-frame re-read) / flat ATK = % the CASTER's live Max HP snapshotted at apply time (granted to others) / grant Max HP = % caster's / target's / the HIGHEST-Max-HP unit's Max HP | anis-star, blanc, cinderella, rouge, trina, maiden-ice-rose, maxwell-ordinary-mechanic, quency, laplace-ultimate-hero, … |

### Unit-level / char-static flags (`charFixes` etc.)

| Primitive                   | Meaning                                                | Users                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hasPierce` / `pierceModes` | Permanently Pierce-tagged / Pierce only in named modes | alice, red-hood, zwei / cinderella-crystal-wave, zwei                                                                                                                                                                  |
| `hasTrueNormals`             | Permanently True-flavored normal attacks (STATIC, unlike the swap-scoped `weaponSwap.trueNormals` window chisato/takina/base laplace — slug `laplace`, RL/Iron, not laplace-ultimate-hero — use) | none on the roster today — the buffer board's typed-adaptation carries only (`src/ranks/buffer.ts` `deriveCarrySpec`, 2026-08-03) |
| `burstSnapshotsPreFb`       | Burst damage resolves pre-FB/pre-stage                 | cinderella                                                                                                                                                                                                             |
| `consolidation`             | Pellet-consolidation single-bullet mode                | dorothy-serendipity                                                                                                                                                                                                    |
| `magDumpRof`                | Whole-magazine dump after a priming charge             | cinderella                                                                                                                                                                                                             |
| `hitsPerShot`               | Base SG/MG pellet/belt-round count per pull            | **34 units** — char-static from `data/characters.json` (sync: `shot_count × muzzle_count`, with `modernia`/`anis-star` carve-outs): 26 × 10 (every SG), 8 × 2. **No override sets it**; it is not a `charFixes` field. |
| `pullsPerSec`               | Per-unit measured fire-cadence override                | **1 unit** — `jill` (2.5/s, video-measured). `weaponSwap.pullsPerSec` is a live capability (`sim.ts:2426`) with **zero** current users.                                                                                |

**Counts-as elements (`countsAsElements`).** A unit counts as EVERY element it can be elementally
advantaged as: its own code plus one per `advantageVs` effect in its override, mapped back through the
element wheel (advantage vs an Electric-code boss = counting as Iron). Today the only such unit is
`rapi-red-hood` — Fire + Iron. The engine never reads the field (it resolves advantage from the effect
directly, which is why sim damage was always right); it exists so the UI/tooling agree with the engine
about which elements a unit belongs to (roster element filter, DPS-chart element view + compare
grouping, share-card ▲ marker). DERIVED, never hand-tagged: `src/elements.ts` owns the wheel +
derivation, `src/data/sync.ts` recomputes it into `data/characters.json` on every sync, and it is
omitted for the ordinary single-code unit. → DECISIONS 2026-07-22.

Recognized but **not set by any override** (boss/env config): `coreband` (boss-band core table),
`bossPelletProfile` (boss-size SG spread). Baseline triggers `passive` / `burstCast` /
`fullBurstEnter` / `fullBurstEnd` are the default (non-opt-in) firing paths used by nearly every unit.

## 6. Standing rulings (non-mechanics)

Settled process/interpretation rules agents keep needing. One-liners; the full statement lives where
noted.

- **Ratio direction — DO NOT CONFLATE.** Board/harness tools (`board-read.ts`, `experiment.ts`) report
  `ratio = sim/real` (>1 = HOT ▲, remove damage; <1 = COLD ▼, add damage). Solo probe-data recons
  report the inverse `realOverSim = real/sim` (>1 = COLD). Read the tag/field, never the bare number.
  → CONVENTIONS.md.
- **⚔ crossed-swords = Combat Power, NOT ATK.** The per-unit crossed-swords number on Battle Records
  damage screenshots is Combat Power — never a sim ATK input. Community footage carries no usable
  per-unit ATK → magnitude is confounded; weight rotation/FB counts + mechanical faithfulness.
- **Scope-lock validation basis.** No cube, no doll, Base 5 gear (not OL0), core 7, sync 400, 10/10/10,
  treasure on, partless boss, full auto, 180s. Single-run repeatability 0.5–3.5%/unit → <5% is noise;
  ±3% is judged on multi-run averages with a declared focus unit. → CONVENTIONS.md.
- **Measurement ≠ enactment (evidence-proportionality).** An action's tier can't exceed its evidence's
  tier. n=1 / one recording / a MEDIUM read is hypothesis-strength: it records an observation, and never
  in the same motion flips a default, rewrites a plan's direction, stamps a verdict, or overturns a
  DECISIONS entry — those need ≥ same-tier evidence at n≥5 (or independent-method confirmation) + a
  separate gated enactment pass. → CLAUDE.md discipline forcing-functions.
- **Faithful > fit; measured > fudge; COUNTER > visual.** Model real observed mechanics; a faithful fix
  that overshoots (kept on purpose) isolates a compensating error — don't fudge it back.
- **Prose-free runtime.** The engine never parses kit text at runtime; each override fully describes the
  kit (all 3 slots + `unmodeled`). Blablalink/DB prose is the objective SSOT. → DECISIONS 2026-07-16.
- **Kit work is test-first.** A unit's kit lines are pinned as assertion groups in
  `scripts/tests/units/<slug>.test.ts`, written RED against the shipped override before the override or
  engine change lands; the board A/B is the outer accuracy loop. The tests gate FAITHFULNESS
  (stat- and footage-independent), the board gates FIT. Engine primitives are pinned in
  `scripts/tests/engine/`; everything under `scripts/tests/` runs as the one `npx vitest run` step in
  `verify.sh`. Per-unit path: `/kit-tdd` (owner-driven spec) or `/kit-autonomy` (authorized autonomous
  branch work); `/audit-kit` samples, `/kit-parse` seeds untuned units. → CONVENTIONS.md.
- **Per-unit tier SSOT = `data/kit-status.json`** (via `scripts/kit-status.ts`). Every tuning change
  updates it. Evidence tiers (MEASURED > DATAMINED > COMMUNITY > CALIBRATED ⚑): → CONVENTIONS.md.
- **Supported roster** = enikk top-100 audit list + all hand-tuned overrides; never remove a
  hand-tuned-override unit. Two independent flags gate the web tools: `generatorSupported` (enikk-proven)
  and `simSupported` (has an override).
- **Commit freely, never push.** Local commits are encouraged; `git push` / PRs are owner-gated (both
  repos). `bash scripts/verify.sh` green before anything leaves the machine. → CLAUDE.md hard constraints.
- **The render server NEVER sims.** A card's damage/DPS is either absent (the composition card) or a
  browser-computed SNAPSHOT the request carried, stamped with its `at` date and footed "simmed
  &lt;date&gt;". `src/engine/**` stays out of `dist-server`. A shared config id is a HANDLE only: it is
  expanded to `{build, results}` BEFORE the cache key, so every image URL stays content-addressed.
  → DECISIONS 2026-07-28.

## 7. Probe reader instruments (what measures what, and how far it is trusted)

The measurement toolchain in `scripts/probe/`. Tier matters: a deterministic-CV reader is repeatable
and cannot hallucinate; a VLM reader is a survey until something independent confirms it. Procedure:
`/probe-processing`. Validation record: `docs/probe-runs.md` (2026-07-24).

Division of labor (owner ruling 2026-07-26): THIS section registers **what instruments exist** and how
far each is trusted. Where their labeled ground truth lives → `docs/VALIDATION-INDEX.md`; the
chronological measurement log → `docs/probe-runs.md`.

| instrument                                        | measures                                                                 | method                                                                                                                     | trust                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scan.ts` + `scan-frames.py`                      | **Full-Burst counts + timings**, burst chain anatomy, nuke signatures    | deterministic CV, **no model**; 3 detectors merged (FB drain window / whole-frame golden splash / stage-3 hexagon)         | ✅ EXACT on 8 recordings with independently measured FB counts; every burst corroborated by a 2nd detector                                         |
| `read-ammo.ts` + `count-pellets.py --ammo-digits` | **shots/second**, reloads, magazine state — every weapon class           | digit atlas + `cv2.matchTemplate` in the existing ammo-box track; abstains on weak matches; monotonicity discards misreads | ✅ SMG 20.3/s in two range bands (r²=1.00), reproducing the hand read behind DECISIONS 2026-07-23. ⚠ small-magazine SG unreadable (~29% of frames) |
| `read-battle-records.ts`                          | per-unit **totals / damage taken / healing / Combat Power** + slot order | VLM on the static end-of-fight screen + an arithmetic checksum vs the cumulative team total                                | ✅ 37/37 numbers exact on 2 screenshots — but only trusted when the **checksum closes**                                                            |
| `read-total-damage.ts`                            | cumulative team total over the fight (the SG-lattice source)             | VLM @1 fps + monotonicity warnings                                                                                         | survey; individual totals need confirmation before a lattice fit rests on them                                                                     |
| `read-burst-gauge.ts`                             | burst-state timeline + transitions, optional sim compare                 | `--classifier cv` (default) delegates to `scan.ts`; `--classifier vlm` is the old per-frame read                           | cv as above. ⚠ **vlm must not be used for FB counts** — 6 `full` transitions in a 30 s window where the truth is ≤2                                |
| `read-pellets.ts` + `count-pellets.py`            | SG **per-shot pellet landing**                                           | CV pellet detection + crosshair tracking                                                                                   | ⚑ CANDIDATE — tuned on `marciana-solo.MP4` only; 70 of ~90 shots, avgTotal 7.6 vs the lattice's ≈8.45. Not a landing measurement (U35)             |
| `read-popups-vlm.ts`                              | per-hit **damage popups** (value, crit/core, position)                   | VLM per frame + dedup + confidence scoring + hit-value band membership                                                     | PROVISIONAL. Its useful output is the ranked `needsConfirmation[]`; the **auto-accept path is UNEXERCISED** and unproven                           |
| `hit-values.ts` / `hit-bands.ts`                  | the per-unit **hit-value band table** (the attribution key)              | sim debug tap, no video                                                                                                    | deterministic. Overlapping bands CANNOT be attributed — that rule is upstream of every popup read                                                  |

Two structural facts that keep getting re-derived:

- **The burst-indicator crop (`crop=188:82:2428:448`) shows a DRAINING Full-Burst window bar, not a
  filling gauge.** It resets at the burst and drains to zero over ~8.5 s of rendered width, and the
  widget is absent entirely between cycles. The burst gauge CHARGING is not in that crop. Rendered
  window widths (~8.2 s for a nominal 10 s window) are comparable to each other, never absolute.
- **The "team burst bar" and "solo BURST meter" crops are SUB-STRIPS of that same gauge crop**, so
  they are not an independent instrument — they are diagnostics only.

## 8. Ranking boards beyond DPS (landed 2026-07-26; frontend landed 2026-07-27; B1/B2 DPS added 2026-08-01)

Five ranked lists. Sources `src/ranks/`, builders
`scripts/build-{burstgen,burstcdr,sustain,bufferchart,b1b2dps}.ts` (`npm run ranks:all`), artifacts
`web/public/{burstgen,burstcdr,sustain,bufferchart,b1b2dps}.json` (gitignored build outputs, not in
verify.sh), tests `scripts/tests/ranks/*.test.ts`. Methodology of record: `docs/data/rank-boards.md`.
Planned follow-up: `docs/handoffs/2026-07-26-support-rank-composite.md`.

- **burstgen** — all sim-supported units, standard no-op team, bursting enabled, unit focused and
  leftmost in its burst category. Ranked by `gaugePerSec` = `gaugeGenerated` / `gaugeBuildTimeSec`
  (the engine's new active-gauge-building-time counter). The no-op B1 is a synthetic AR with a
  7 s team burst-cooldown reduction on its burst cast, so control teams are normalized for the CDR
  a real B1 enabler would provide even though the placeholder has no other skills. Artifact also
  reports `fullBursts`. Profiles: little-mermaid `with-2mg`, cinderella-crystal-wave `with-mg` (B3
  slots swapped to MG for the two team-ammo-scaling kits).
- **burstcdr** — the 15 burst-cdr-tagged units, nominal team CDR sec per 40s (static table in
  `src/ranks/burstcdr.ts`; shot-triggered rows use solo sim cadence).
- **sustain** — 50 candidates (healer/shield tags + nayuta), team-total HP restored+shielded: thin
  analytic layer over one sim run (maxHp + `cfg.onEvent` timeline), curated lines in
  `src/ranks/sustain-table.ts`. Profiles: prika+mint duet, anchor-innocent-maid+mast-romantic-maid.
  **Stage-covered comp (landed 2026-08-03, `src/ranks/sustain.ts` `sustainTeam()`):** ports the
  buffer board's shape — a stage-matched spare (a same-stage profile partner stands in when one is
  seated) covers the tested unit's own burst stage, with the tested unit leading it in slot order, so
  a 40s/60s healer no longer holds up its own team's rotation. B3-tested comps already had this shape
  (the alternating no-op B3). `scripts/build-sustain.ts` also loads every synthetic control override
  (previously `noop-b3-mg` only), so the no-op B1's 7s team burst-cooldown reduction now applies here
  too.
- **buffer** — 74 B1/B2 + B3-buffer units, added carry DPS vs a no-op baseline over two synthetic
  standard carries (`src/ranks/synthetics.ts`, class-modal MG+RL). Two arms: generic and typed
  (carries auto-adapt to the kit: weapon swap / pierce / projectile-explosion / element / True
  Damage / Distributed+Sustained Damage — `CarrySpec` in `src/ranks/buffer.ts`).
  **Flavor-gated typed adaptation (landed 2026-08-03):** an ally-facing `trueDamagePct` buff
  (flora, frima, takina, ada — a general rule, not a Flora-only patch; verified via a full roster
  walk after a cross-family review caught the initial landing under-claiming its own scope)
  grants both carries `hasTrueNormals` (a new static kit primitive, §5) so its True
  Damage ▲ has a real True-flavored hit to multiply — until this, the buff read exactly 0 on
  both boards (the carries have no skill/burst kit and normal fire is never True-flavored on its
  own). `emma-tactical-upgrade`/`eunhwa-tactical-upgrade` also carry ally-facing `trueDamagePct`
  lines but are unaffected — both are gated behind a duo `mode`/`teamHas` condition the standalone
  comp never satisfies, an unrelated pre-existing gap. An ally-facing `sustainedDamagePct`/
  `distributedDamagePct` buff (crust,
  rosanna-chic-ocean, delta-ninja-thief, elegg, mast-romantic-maid) grants each carry a synthetic
  `MOCK_TICK` rider instead — one instant `flatDamage` hit every 10s tagged the needed flavor,
  sized off the carry's own weapon modal (`MODAL_WEAPON`). No engine primitive exists for a
  STATIC sustained/distributed normal-attack tag (unlike True Damage/Pierce), and sustained (dot)
  /distributed (flatDamage) instances are otherwise only ever produced by a caster's own
  skill/burst line targeting the enemy — so this is a deliberately-labeled POLICY MOCK, not a
  measured value, picked (owner-chosen Option 3 of the 2026-08-03 typed-board flavor audit) to be
  a minority contributor (checked via `--explain <slug> --typed`) and independent of Full Burst
  count/rotation. `sustained`/`distributed` are folded into the baseline-run memo key (unlike
  `pierce`/`trueFlavor`, which are pure tags with no damage of their own) because the rider fires
  regardless of any buff, changing the baseline's raw DPS by itself.
  **STANDARD TEAM (owner spec, landed 2026-08-03):** no-op B1 (20s, 7s CDR) + two no-op B2 (20s) +
  the two carries; the tested unit takes the second B2's slot and leads its own stage (behind the
  same-stage no-op it would lose every contest and stop bursting), and the baseline puts a
  stage-matched no-op back in that slot. The spare keeps every stage covered, so a 40s/60s cooldown
  no longer costs the team Full Bursts — pinned by ISOLATION (forcing a unit's cooldown to 20s must
  not change its FB count) in `scripts/tests/ranks/buffer.test.ts`, audited by
  `scripts/probe/buffer-rotation-audit.ts`. **Camera focus is the spare no-op B2 (SR)**, never the
  tested unit, so burst generation is identical in every run (it used to follow the second carry,
  whose weapon the typed board rewrites per unit); on a duo row the partner holds it, symmetrically.
  A tested B3's burst slot is suppressed outright (`burstOffSlug`) rather than relying on rightmost
  placement to lose the stage-3 cast. **Exactly one burst-cooldown enabler per team** — the tested
  unit when its kit reduces ALLY cooldowns (`suppliesTeamCdr`, 12 units; self-only carriers do not
  qualify), else the no-op B1, which the baseline always keeps. The control's 7s fires on
  `fullBurstEnter`, NOT its own cast, so it cannot be suppressed by a tested B1 sharing its stage;
  `build-bufferchart.ts` now loads the synthetic control overrides at all, which it never did. The leaderboard shows rows ≥ 0 only, minus
  `HIDDEN_BUFFER_SLUGS` (chime, avistar) — `rankedBufferRows` (`src/ranks/buffer-rows.ts`) filters
  both the chart bars and the share/pre-render table card, so ranks are numbered over one set; the
  artifact itself keeps every row for the unit card. `EXCLUDED_BUFFER_SLUGS` is a second, harder
  screen at the population filter — a kit that outright REDUCES team damage in the standard comp
  would report a misleadingly negative % and never enters the board — and it is currently **empty**;
  `scripts/probe/buffer-rotation-audit.ts --excluded` checks each entry against that criterion.
- **b1b2dps** — every sim-supported B1/B2 unit, ranked by own DPS in a Solo-style no-op control team.
  Four cells: Core 0 / Core 100 × neutral / elemental advantage. 40s-B1 and B2 templates include a
  no-op B1 with the standard 7 s team burst CDR; 20s-B1 rows rely on the tested unit's own CDR.
  Forced rows: red-hood as B1 and B2 (via `lambdaStage`), rapi-red-hood as B1 (via `forceStage`).
  Partner profiles:
  crown `with-chime`, anis-star `with-avistar` (real `avistar` as a MG B1 partner) and `with-other-b1`.

**Comp profiles (all boards, 2026-07-26):** profiled units are ranked BOTH plain and profiled, each
entry flagged `profile: null | <id>` (the frontend differentiator). burstgen: little-mermaid
`with-2mg`, cinderella-crystal-wave `with-mg`. sustain: prika `with-mint`, anchor-innocent-maid
`with-mast-rm`. buffer: crown `with-healer` (recovery-triggered AD buff at ~100% uptime vs ~27% off
her own Relax self-heal), naga `with-shielder` (shield-gated core/ATK lines live vs inert) — both
via a synthetic heal/shield kit on the no-op fillers (`COMP_PROFILES` in `src/ranks/buffer.ts`).
Frontend: `/ranks` (Rankings section home, `/ranks/support` boards + `/ranks/compare` comparator,
pill-switched, profile badges — `web/src/App.tsx`, PR #31).

---

## 9. No-JS / crawler surface (what a client that runs no JavaScript receives)

The site is a client-rendered SPA, so the served `dist/index.html` carries meta tags but an EMPTY
`<div id="root">`. Routes that need indexable text get a body injected **at request time** by both
servers — `src/server/static.ts` (the TypeScript port, which is what production runs via
`npm run start:server` → `dist-server/index.js`) and its hand-mirror `scripts/serve.mjs`. React
replaces the markup wholesale on load (`createRoot`, not hydration), so it must be valid and
crawlable, not identical to React's output.

| Route        | Body source                                                   | Emits                                                      |
| ------------ | ------------------------------------------------------------- | ---------------------------------------------------------- |
| `/unit/*`    | `unitStaticHtml` ← `data/characters.json` + `data/unit-pages.json` | identity row, tags, kit, ranked overload table, sim-status badge |
| `/characters`| `charactersStaticHtml` ← `data/characters.json`                | an `<a>` to every character — the crawl hub                 |
| `/mechanics` | `web/public/content-pages.json` ← `web/src/mechanics-data.ts`  | intro, tier legend, every section heading + bullets         |
| `/howto`     | `web/public/content-pages.json` ← `web/src/howto-data.ts`      | intro, every section heading, bullets, glossary `<dl>`      |

Every other route serves the empty-`#root` shell. **`/doll`'s FAQ is deliberately excluded** — its
web copy is JSX in `App.tsx` while `web/src/doll-faq-data.ts` is the Discord bot's separate copy, so
injecting from the data module would show crawlers text the page does not render.

**Two standing rules.** (1) A no-JS body is generated from the SAME artifact the React page reads, so
the two cannot recommend different things — serving text the page does not show is worse than serving
none. (2) **No prerender pass**: build-time prerendering is rejected for every route
(→ DECISIONS 2026-08-03, `docs/seo-followups.md`). A route that needs a body gets request-time
injection. `web/public/content-pages.json` is committed AND regenerated by
`scripts/build-content-pages.ts` in verify.sh's `artifacts` tier — the tier `railway.json` builds
with; `content-pages-drift.test.ts` fails on drift, and both serve test suites assert the served
bytes.
