# STATE.md — what the sim does RIGHT NOW (the landed-state registry)

> **Read this first.** This is the current-state index: the live value of every engine flag, timing
> constant, rotation rule, geometry model, and opt-in kit primitive, each with a one-line meaning and
> a `→ DECISIONS <date>` pointer to the entry that explains *why*. It answers "what is landed today?"
> so you don't have to reconstruct the answer from a 1,600-line changelog.
>
> **Class: CURRENT-STATE (see [CONVENTIONS.md](CONVENTIONS.md) → Doc hygiene).** This doc is a
> *derived index*, freely rewritten and pruned — stale content is deleted here, not marked. It holds
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

| Flag | Live default | What it does | Revert with | Provenance |
| --- | --- | --- | --- | --- |
| `DOTCRIT` | **ON** | DoT ticks + stored-hit releases roll crit universally (per-dot `crit` field still overrides; core stays OFF) | `DOTCRIT=off` | → DECISIONS 2026-07-21 |
| `RIDERCRIT` | **ON** | `extraHitDamagePct` function-rider hits roll crit at caster rate (core stays OFF; FB by landing time). Carriers: `modernia`, `nayuta`, `neon-vision-eye` | `RIDERCRIT=off` | → DECISIONS 2026-07-22 |
| `CONE_DELTA` | **ON** | δ-offset ("Rician") core-hit cone for AR/SMG/SG; pre-empts the older tables | `CONE_DELTA=0` | → DECISIONS 2026-07-19 |
| `HRCORE` | **ON** | Live Hit Rate shrinks the reticle → higher core fraction (AR/SMG/SG) | `HRCORE=0` | → DECISIONS 2026-07-17 |
| `PELLET_GAUSS` | **ON** | Center-weighted Gaussian pellet cone (core-hit + SG landing); the `CONE_DELTA=0` fallback layer | `PELLET_GAUSS=0` | → DECISIONS 2026-07-15/19 |
| `STAGE_WINDOW` | **120** frames (2s) | Stage-2/3 chain grace window (was mis-set to 600 = the FB-state duration) | `STAGE_WINDOW=600` | → DECISIONS 2026-07-21 |
| `B3_LEFTMOST` | **OFF** (first-ready) | Stage filler = earliest-ready unit (tie → leftmost); `=1` restores strict-leftmost | `B3_LEFTMOST=1` | → DECISIONS 2026-07-21 |
| `ROTMODEL` | **`floor`** | Fixed post-FB chain block active; `=refill` opens the chain on gauge-full instead | `ROTMODEL=refill` | → DECISIONS 2026-07-13 |
| `SGLANDING` | **bonded table** | SG pellet-landing table selector (`legacy`/`popupcount`/`prebond`/`geo`) | `SGLANDING=<arm>` | → DECISIONS 2026-07-15/16 |
| `CORERATE` / `CORERATEBAND` / `ACR` | measured band table | Core-rate A/B knobs (`CORERATE=flat` → old 0.85; `CORERATEBAND=off` → flat per-weapon; `ACR=<n>` → hard override) | (as noted) | → DECISIONS 2026-07-15 |
| `FBRULE` | **`perkit`** | Which skill/rider/DoT damage gets the +50% FB major (arms: `timing`/`dotfb`/`seqoff`/`noskillfb`) | `FBRULE=<arm>` | → DECISIONS 2026-07-13/14 |
| `XCRIT` / `XCORE` / `XINSTEXPL` | empty | Per-slug opt-in lists (dot-crit / dot-core / in-FB stored-hit release) for experiments | (slug list) | — |
| `DBG_UNIT` / `DBG_GAUGE` / `DBG_CD` (+`DBG_N`/`DBG_BUFFS`) | OFF | Debug taps (per-instance buckets / gauge / burst-CD decisions) | (as set) | — |

Seeding: `cfg.seed` (config, not env) switches the sim from expected-value to a mulberry32 Monte-Carlo
run; `SEEDS=N` runs the MC wrapper (`DEFAULT_MC_SEEDS=25`, base 1000). Seeded-only scatter (SG landing
jitter, range-transition ±2s, stage-cast-gap ±9f) is inert in the unseeded gate.

## 2. Named timing / cadence / stat constants

| Constant | Value | Meaning | `sim.ts` |
| --- | --- | --- | --- |
| `FPS` | 60 | Tick rate (all sec→frame conversions) | :41 |
| `FIGHT_DELAY_FRAMES` | ~8 (0.133s) | Fight-start deploy delay — no firing/charging/reloading/gauge until then (`FIGHTDELAY` seconds overrides) | :48 |
| `STAGE_CAST_GAP_FRAMES` | 30 (0.5s) | Gap between chain stage casts (B1→B2→B3); measured-correct | :98 |
| `PRE_B1_GAP_FRAMES` | 30 (0.5s) | Gap between gauge-full and the B1 cast (default ON; `PREB1GAP=off` reverts) | :105 |
| `FB_PRE_DELAY_FRAMES` | 22 | Gap between the B3 cast and the FB countdown starting (default ON; `PREFB=off` reverts) | :110 |
| `FULL_BURST_FRAMES` | 600 (10s) | Full Burst duration | :111 |
| `SR_BOLT_RECOVERY_FRAMES` | 22 | Release latency for release-fired charge weapons (SR + RL); autofire exempt | :123 |
| `STAGE_WINDOW_FRAMES` | 120 (2s) | Stage-2/3 chain window deadline (stage 1 never expires) | :1125 |
| `POST_FB_CHAIN_DELAY_FRAMES` | **150 (~2.5s)** | Next chain can't open until FB-end + 150f (`POSTFB` overrides; the earlier 180f double-counted the now-separate 30f-pre-B1) | :1114 |
| `PULLS_PER_SEC` | AR 12 · SMG 24 · SG 1.5 · MG 60 · Pistol 4 | Class fire cadence (MG uses the ladder) | :127 |
| `MG_RAMP_INTERVALS` | 35-step ladder → 1/frame | MG wind-up frame gaps; first 18 rounds don't core; wind-down grace 16f | :134 |
| `RELOAD_TAIL_FRAMES` | 13 (0.21s) | Additive reload tail: `round(base·0.975·(1−buff)) + 13` | :163 |
| `UNHITTABLE_FRAMES` | 60 (1s) | Boss off-screen at each range transition (blocks burst casts) | :195 |
| `BOSS_RANGE_SCRIPT` | 0/33/70/106/144/176s → mid/near/far/midfar/near/midfar | Test-boss range timeline | :171 |
| `FOCUS_CHARGE_GEN` / `UNFOCUSED_CHARGE_GEN` | 2.5 / 1.0 | Camera-focus charge-gauge multiplier vs unfocused flat | :987 |
| Base-5 `staticAtk` | Attacker 118,027 · Supporter 98,367 · Defender 78,707 | Combat-ATK basis (NOT battle-records ATK, NOT OL0) + a modeled relationship/bond bonus | — |

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

Standing rotation facts: focus-unit charge weapons make ×2.5 gauge (focus-only; middle slot by
default). Burst-cast damage lands **before** Full Burst — it misses the +50% FB major and FB-entry
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
| Primitive | Meaning | Users |
| --- | --- | --- |
| `interval` | Fires every `sec` seconds (internal-cooldown skill) | helm-aquamarine, isabel, rosanna-chic-ocean, sakura-bloom-in-summer, snow-white |
| `hitCount` / `countInFb` | Every N cumulative owner hits; `countInFb` swaps the threshold in FB | ~30 units (hitCount); rapi-red-hood, scarlet-black-shadow (countInFb) |
| `chargeCounter` | Cycling per-full-charge phase counter | scarlet-black-shadow |
| `teamAmmo` | Fires when total ally ammo consumed crosses N | cinderella-crystal-wave, little-mermaid |
| `shotFired` | Every owner trigger pull | ~21 units (cinderella, soda-twinkling-bunny, prika, milk-blooming-bunny, …) |
| `lastBullet` | On owner's last bullet / reload start | anis-sparkling-summer, helm, privaty |
| `recovery` / `shielded` | When owner receives a heal / shield event | asuka, crown / naga |
| `stageEnter` | When a stage-N burst is cast by anyone | cinderella, ein, mast-romantic-maid, mint, mihara-bonding-chain, rei-ayanami, snow-white-heavy-arms, soda-twinkling-bunny |
| `bossElement` | Permanent passive, active only if boss has this element | eve, helm-aquamarine |

### Block-level gates
| Primitive | Meaning | Users |
| --- | --- | --- |
| `requiresCore` | Inert when the fight has no core exposure | d-killer-wife, liberalio, ludmilla-winter-owner, mari |
| `fbGate` (`inFb`/`outFb`) | Only inside / outside Full Burst | moran, modernia, takina, soda-twinkling-bunny, zwei, velvet |
| `swapGate` (`swapped`/`unswapped`) | Only while owner's weaponSwap is live / not | laplace, snow-white-heavy-arms |
| `requiresShielded` | Only while owner carries a shield | naga |
| `requiresWipeOut` | Only while boss carries the Wipe-Out status | d-killer-wife |
| `bossElementGate` | Only when boss element matches (composes with any trigger) | brid-silent-track, eve, helm-aquamarine |
| `ownBurstGate` (`cast`/`notCast`) | Gated on whether owner cast own burst into this FB | cinderella-crystal-wave |
| `resourceGate` | Fires only when a named resource pool is within [min,max] | soda-twinkling-bunny |
| `everyN` / `everyNOffset` | Effects land on every Nth activation (offset phases it) | arcana, mast-romantic-maid, neon-vision-eye, soda-twinkling-bunny, zwei |
| `formation` (`noB1`/`hasB1`) | Static squad-formation gate | anis-star, rapi-red-hood |
| `teamHas` (+`.slugs`) | Static team-composition gate (element/class/weapon/burst/named slugs) | noir |
| `mode` / `modes` | Block active only in the unit's selected kit mode | bready, cinderella-crystal-wave, delta-ninja-thief, elegg-boom-and-shock, mint, milk-blooming-bunny, prika |

### Targeting selectors (`block.target`)
| Primitive | Meaning | Users |
| --- | --- | --- |
| `burstCasters` / `nonBurstCasters` | Allies who did / didn't burst this rotation | ada, arcana, crown / crown |
| `alliesTopAtk` / `alliesLowestAtk` / `alliesLowestHp` | N highest / lowest ATK / lowest HP allies | alice, maxwell, miranda, naga, soda-twinkling-bunny / liberalio / blanc |
| `alliesOfElement` / `alliesOfClass` / `alliesOfWeapon` / `alliesOfElementWeapon` | All allies of an element / class / weapon / element+weapon | (element) 8 units; arcana-fortune-mate; (weapon) arcana-fortune-mate, d-killer-wife, drake, leona, noir, tove; trina |
| `selfAndAdjacent` | Self + N allies each side (positional) | rouge |
| `excludeSelf` | Drops owner from the pool before slicing | arcana-fortune-mate, blanc, brid-silent-track, grave, liberalio, maiden-ice-rose, miranda, soda-twinkling-bunny |
| `byFinalAtk` | Rank by live buffed ATK instead of base staticAtk (keyed on the literal word "final") | alice, liberalio, miranda, soda-twinkling-bunny |

### Effect kinds & flags
| Primitive | Meaning | Users |
| --- | --- | --- |
| `weaponSwap` (+`pullsPerSec`/`weapon`/`trueNormals`/`hasPierce`/`maxShots`) | Temporary weapon override (cadence/class/flavor/pierce/uses-based end) | ada, chisato, cinderella-crystal-wave, laplace, maxwell, nayuta, moran, red-hood, snow-white-heavy-arms, takina, velvet, zwei |
| `storedHit` (+`instantInFb`) | Charges that release at FB start; `instantInFb` detonates in-FB | rapi-red-hood |
| `stackedNuke` | Hits once per FB the unit sat out since its last burst | maiden-ice-rose |
| `wipeOut` / `gainPierce` | Inflicts Wipe-Out status / timed "Gain Pierce" window | d-killer-wife / ade-agent-bunny, grave, milk-blooming-bunny |
| `burstEligibility` / `burstFirst` / `reenterStage` | Unit may also burst at a stage / takes first eligible / holds stage for another | anis-star, rapi-red-hood / prika / anis-star |
| `advantageVs` | Counts as elementally advantaged vs a boss element (also derived into `countsAsElements` for the UI — see below) | rapi-red-hood |
| `burstCdr` | Reduces targets' burst cooldowns | ~14 units (anis-star, arcana, blanc, liter, red-hood, rouge, …) |
| `escalating` | Liter-style Once/Twice: Nth activation applies steps 1..N | anchor-innocent-maid, isabel, helm-aquamarine, liter, volume |
| `fullBurstExtend` | Extends Full Burst duration | isabel, modernia, soda-twinkling-bunny |
| `unlimitedAmmo` | Infinite-ammo window | grave, modernia, moran, nayuta, red-hood |
| `instantReload` / `consumeAmmo` | Refill magazine / empty it (forces reload) | 7 units (asuka-wille, eve, noir, …) / (none) |
| `stun` | Target can't fire/charge/reload | mast-romantic-maid |
| `flatDamage` (+`delaySec`/`charge`/`chargeMultPct`/`requiresPulls`) | Flat hit (flighted-and-snapshotted / charge-bucket / pull-gated) | asuka-wille, rapi-red-hood, snow-white, cinderella-crystal-wave, nayuta, red-hood, ada, zwei |
| `rampSec` | Linearly ramps a buff/flatDamage contribution 0→full over rampSec | arcana-fortune-mate, cinderella |
| `whileSwapped` | Buff counts only while owner's weaponSwap is live | snow-white-heavy-arms |
| `removeOnReload` | Buff stripped on reload-to-max (filter is inert today — no user) | (none) |
| `perResource` / `resource(s)` | Buff/DoT value = live resource pool × mult / declare-adjust a pool | soda-twinkling-bunny |

### Special StatKeys (opt-in buckets)
| Primitive | Meaning | Users |
| --- | --- | --- |
| `sequentialMultPct` | True multiplier on sequential-flavored damage (own bucket) | eve |
| `highestAllyAtkPct` | Flat ATK = % of the highest ally's (static) ATK | guilty |
| `normalAttackPct` | Scales the normal-attack multiplier | arcana-fortune-mate, asuka-wille, jill, leona, mast-romantic-maid |
| `pelletCountFlat` | Flat effective SG pellet-count add for a window | arcana-fortune-mate, dorothy-serendipity |
| `maxAmmoFlat` | Flat round-count added on top of `maxAmmoPct` | grave, noir, tove |
| `hitRatePct` | Core-hit lift via `hrCoreMult` (HRCORE-gated; AR/SMG/SG only) | ~14 units (jill, noir, modernia, …) |
| `atkOfMaxHpPct` / `casterMaxHpPct` / `targetMaxHpPct` | Flat ATK = % own Max HP / grant Max HP = % caster's / target's Max HP | anis-star, blanc, cinderella, rouge, trina, maiden-ice-rose, … |

### Unit-level / char-static flags (`charFixes` etc.)
| Primitive | Meaning | Users |
| --- | --- | --- |
| `hasPierce` / `pierceModes` | Permanently Pierce-tagged / Pierce only in named modes | alice, asuka, mari, red-hood, zwei / cinderella-crystal-wave, zwei |
| `burstSnapshotsPreFb` | Burst damage resolves pre-FB/pre-stage | cinderella |
| `consolidation` | Pellet-consolidation single-bullet mode | dorothy-serendipity |
| `magDumpRof` | Whole-magazine dump after a priming charge | cinderella |
| `hitsPerShot` | Base SG/MG pellet/belt-round count per pull | ~20 units |
| `pullsPerSec` | Per-unit measured fire-cadence override | ~26 units |

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
- **Per-unit tier SSOT = `data/kit-status.json`** (via `scripts/kit-status.ts`). Every tuning change
  updates it. Evidence tiers (MEASURED > DATAMINED > COMMUNITY > CALIBRATED ⚑): → CONVENTIONS.md.
- **Supported roster** = enikk top-100 audit list + all hand-tuned overrides; never remove a
  hand-tuned-override unit. Two independent flags gate the web tools: `generatorSupported` (enikk-proven)
  and `simSupported` (has an override).
- **Commit freely, never push.** Local commits are encouraged; `git push` / PRs are owner-gated (both
  repos). `bash scripts/verify.sh` green before anything leaves the machine. → CLAUDE.md hard constraints.
