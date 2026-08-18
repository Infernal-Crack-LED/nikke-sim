# Engine modeling gaps — cross-unit thread inventory

> **AI-facing cross-unit triage map (CURRENT-STATE class — pruned as clusters resolve).** Derived by
> reading every unit's `unmodeled` + `caveats` in `data/kit-status.json` and grouping the recurring
> gaps, so a single engine fix can move a whole cluster instead of chasing per-unit residuals. NOT a
> decision log — the capability-build WHY lives in `docs/DECISIONS.md`, the live flag/primitive state
> in `docs/STATE.md` §1/§5, and the per-unit SSOT in `data/kit-status.json`. This doc = "these N units
> share one root cause" + which built primitives are still un-enacted per unit.
>
> **Ratio direction (see docs/CONVENTIONS.md):** board = `sim/real`. **HOT ▲ = sim over-credits**
> (ratio > 1); **COLD ▼ = sim under-credits** (ratio < 1).

## Primitive enactment census — GENERATED, do not hand-edit

> **This block is the single source of truth for "which units use primitive X".** Regenerate with
> `npx tsx scripts/doc-drift.ts --update`; `scripts/verify.sh` fails if it is stale. Derived by
> structural match against `src/skills/overrides/*.json` — **prose mentions in `note`/`caveats`/
> `unmodeled` deliberately do NOT count**, since a unit whose note merely _discusses_ a primitive is
> not a user. Do not restate these counts in prose elsewhere; link here instead. Primitive list is
> taken from `docs/STATE.md` §5, so adding a row there enrolls it automatically.
>
> **Sibling census, other axis:** [docs/data/damage-bucket-matrix.md](data/damage-bucket-matrix.md)
> censuses the `StatKey` union instead of the structural primitives, and adds the damage factor each
> stat feeds. Same script, same override scan, so the two can never disagree.

<!-- BEGIN GENERATED: primitive-census (npx tsx scripts/doc-drift.ts --update) -->

| Primitive | Users | Enacted on |
| --- | --- | --- |
| `advantageVs` | 2 | rapi-red-hood, sugar |
| `alliesLowestAtk` | 1 | liberalio |
| `alliesLowestHp` | 10 | blanc, ether, mary, misato, naga, pascal, pepper, poli, … |
| `alliesOfClass` | 3 | biscuit, d, quiry |
| `alliesOfElement` | 14 | alice-wonderland-bunny, anis-sparkling-summer, arcana, asuka, elegg-boom-and-shock, exia, flora, guillotine-winter-slayer, … |
| `alliesOfElementWeapon` | 3 | ark-ranger-black, sugar, trina |
| `alliesOfWeapon` | 11 | arcana-fortune-mate, d-killer-wife, drake, himeno, leona, miranda, neon, noir, … |
| `alliesTopAtk` | 19 | alice, anis, avistar, chime, claire, folkwang, himeno, jackal, … |
| `atkOfCasterMaxHpPct` | 1 | maxwell-ordinary-mechanic |
| `atkOfMaxHpPct` | 4 | 2b, cinderella, laplace-ultimate-hero, maiden-ice-rose |
| `bossElement` | 1 | eve |
| `bossElementGate` | 7 | brid-silent-track, eve, helm-aquamarine, marciana-marine-study, neon-blue-ocean, phantom, rosanna |
| `burstCasters` | 3 | ada, arcana, crown |
| `burstCdr` | 20 | anis-star, arcana, blanc, d-killer-wife, dolla, dorothy, helm-aquamarine, liter, … |
| `burstEligibility` | 1 | rapi-red-hood |
| `burstFirst` | 1 | prika |
| `burstSkillAoeDamagePct` | 1 | trina |
| `burstSkillSingleDamagePct` | 1 | jackal |
| `burstSnapshotsPreFb` | 1 | cinderella |
| `byFinalAtk` | 15 | alice, anis, claire, folkwang, himeno, jackal, liberalio, mast, … |
| `cast` | 6 | arcana, asuka-wille, avistar, cinderella-crystal-wave, diesel-winter-sweets, marciana-marine-study |
| `casterMaxHpPct` | 11 | ade, anis-star, avistar, cinderella, mary-bay-goddess, mast, maxwell-ordinary-mechanic, rouge, … |
| `charge` | 1 | snow-white |
| `chargeCounter` | 10 | bay, claire, frima, milk, noise, power, quiry, rumani, … |
| `chargeMultPct` | 10 | ada, cinderella-crystal-wave, e-h, eunhwa-tactical-upgrade, maxwell, maxwell-ordinary-mechanic, nayuta, red-hood, … |
| `consolidation` | 1 | dorothy-serendipity |
| `consumeAmmo` | 3 | asuka-wille, grave, jill |
| `convertExcess` | 1 | red-hood |
| `countInFb` | 7 | claire, frima, quiry, rapi-red-hood, scarlet-black-shadow, snow-crane, snow-white-innocent-days |
| `critRateNormalPct` | 3 | biscuit, helm, julia |
| `delaySec` | 8 | arcana-fortune-mate, asuka-wille, dorothy, flora, grave, neon-vision-eye, rapi-red-hood, snow-white |
| `durationShots` | 14 | asuka-wille, d-killer-wife, emilia, eunhwa, harran, helm, miranda, neon, … |
| `escalating` | 11 | 2b, anchor-innocent-maid, dolla, helm-aquamarine, isabel, liter, mary-bay-goddess, mihara, … |
| `everyN` | 8 | clay, harran, mast-romantic-maid, mint, neon-vision-eye, phantom, power, soda-twinkling-bunny |
| `everyNOffset` | 4 | mint, neon-vision-eye, phantom, power |
| `excludeSelf` | 20 | anis, arcana-fortune-mate, avistar, bay, blanc, brid-silent-track, chime, grave, … |
| `fbGate` | 11 | clay, ether, eunhwa-tactical-upgrade, kurumi, mihara-bonding-chain, modernia, privaty-unkind-maid, soda-twinkling-bunny, … |
| `flatDamage` | 97 | 2b, a2, anchor, anis, anis-sparkling-summer, anis-star, arcana, arcana-fortune-mate, … |
| `formation` | 2 | anis-star, rapi-red-hood |
| `fullBurstExtend` | 6 | d, isabel, mihara, modernia, soda-twinkling-bunny, vesti |
| `gainPierce` | 15 | ade-agent-bunny, asuka, d-killer-wife, dorothy, grave, harran, makima, mari, … |
| `gaugeHits` | 3 | eve, little-mermaid, snow-white-heavy-arms |
| `hasB1` | 2 | anis-star, rapi-red-hood |
| `hasPierce` | 7 | alice, laplace, laplace-ultimate-hero, maxwell, maxwell-ordinary-mechanic, red-hood, zwei |
| `hasTrueNormals` | 0 | _none_ |
| `highestAllyAtkPct` | 1 | guilty |
| `highestAllyMaxHpPct` | 2 | quency, sin |
| `hitCount` | 66 | 2b, ade, ade-agent-bunny, alice-wonderland-bunny, ark-ranger-black, asuka-wille, blanc, bready, … |
| `hitRatePct` | 20 | anchor-innocent-maid, aria, asuka, chisato, dorothy-serendipity, drake, jill, leona, … |
| `hitsPerShot` | 33 _(char-data)_ | anis-sparkling-summer, arcana-fortune-mate, brid-silent-track, crow, dorothy-serendipity, drake, ether, guilty, … |
| `inFb` | 11 | clay, ether, eunhwa-tactical-upgrade, kurumi, mihara-bonding-chain, modernia, privaty-unkind-maid, soda-twinkling-bunny, … |
| `instantInFb` | 1 | rapi-red-hood |
| `instantReload` | 13 | alice-wonderland-bunny, arcana-fortune-mate, asuka-wille, diesel, eve, guillotine-winter-slayer, little-mermaid, ludmilla-winter-owner, … |
| `interval` | 38 | ade, anis, brid, cinderella-crystal-wave, d, delta-ninja-thief, dolla, dorothy, … |
| `lastBullet` | 19 | anchor, anis-sparkling-summer, aria, cinderella-crystal-wave, crow, dorothy, epinel, eunhwa, … |
| `magDumpRof` | 1 | cinderella |
| `maxAmmoFlat` | 12 | emilia, grave, himeno, mica, n102, neon, nihilister, noir, … |
| `maxShots` | 5 | ada, e-h, laplace-ultimate-hero, maxwell, snow-white-heavy-arms |
| `mode` | 7 | bready, cinderella-crystal-wave, crust, delta-ninja-thief, emma-tactical-upgrade, mint, prika |
| `modes` | 7 | bready, cinderella-crystal-wave, crust, delta-ninja-thief, emma-tactical-upgrade, mint, prika |
| `noB1` | 2 | anis-star, rapi-red-hood |
| `noRetriggerWhileActive` | 1 | vesti-tactical-upgrade |
| `nonBurstCasters` | 1 | crown |
| `normalAttackPct` | 6 | arcana-fortune-mate, asuka-wille, chime, jill, mast-romantic-maid, rumani |
| `notCast` | 1 | diesel-winter-sweets |
| `outFb` | 1 | velvet |
| `ownBurstGate` | 6 | arcana, asuka-wille, avistar, cinderella-crystal-wave, diesel-winter-sweets, marciana-marine-study |
| `pelletCountFlat` | 3 | arcana-fortune-mate, dorothy-serendipity, leona |
| `perResource` | 8 | e-h, exia, guillotine, mana, marciana-marine-study, mihara-bonding-chain, phantom, soda-twinkling-bunny |
| `pierceModes` | 1 | cinderella-crystal-wave |
| `pullsPerSec` | 5 | jill, k, neon-blue-ocean, takina, velvet |
| `rampSec` | 4 | arcana-fortune-mate, cinderella, nayuta, scarlet |
| `recovery` | 2 | asuka, crown |
| `reenterStage` | 7 | alice-wonderland-bunny, anis-star, avistar, chime, rupee-winter-shopper, tia, viper |
| `removeOnReload` | 1 | vesti-tactical-upgrade |
| `requiresCore` | 3 | liberalio, ludmilla-winter-owner, mari |
| `requiresPulls` | 1 | rapi-red-hood |
| `requiresShielded` | 5 | asuka, kilo, mori, naga, rapunzel-pure-grace |
| `requiresTargetStatus` | 13 | asuka-wille, d-killer-wife, elegg, emma-tactical-upgrade, kurumi, marciana-marine-study, mast, phantom, … |
| `resourceGate` | 24 | d, e-h, elegg-boom-and-shock, exia, guillotine, guillotine-winter-slayer, julia, laplace, … |
| `sameWeapon` | 4 | chisato, clay, frima, jill |
| `selfAndAdjacent` | 2 | flora, rouge |
| `sequentialMultPct` | 1 | eve |
| `shielded` | 2 | flora, naga |
| `shotFired` | 42 | a2, ade-agent-bunny, anis-star, bready, cinderella, clay, delta, delta-ninja-thief, … |
| `stackedNuke` | 1 | maiden-ice-rose |
| `stageCast` | 1 | rupee-winter-shopper |
| `stageEnter` | 12 | cinderella, ein, flora, laplace-ultimate-hero, mast-romantic-maid, maxwell-ordinary-mechanic, mihara-bonding-chain, mint, … |
| `statImmunities` | 1 | liberalio |
| `storedHit` | 1 | rapi-red-hood |
| `stun` | 1 | mast-romantic-maid |
| `swapGate` | 9 | eunhwa-tactical-upgrade, frima, laplace, laplace-ultimate-hero, moran, snow-white-heavy-arms, takina, velvet, … |
| `swapped` | 8 | eunhwa-tactical-upgrade, frima, laplace, laplace-ultimate-hero, moran, snow-white-heavy-arms, takina, zwei |
| `targetMaxHpPct` | 17 | 2b, blanc, delta, diesel, folkwang, label, laplace-ultimate-hero, maiden-ice-rose, … |
| `targetStatus` | 12 | asuka-wille, d-killer-wife, elegg, emma-tactical-upgrade, kurumi, marciana-marine-study, mast, phantom, … |
| `teamAmmo` | 3 | cinderella-crystal-wave, elegg-boom-and-shock, little-mermaid |
| `teamHas` | 4 | anchor-innocent-maid, blanc, eunhwa-tactical-upgrade, noir |
| `trueNormals` | 7 | chisato, clay, eunhwa-tactical-upgrade, frima, jill, laplace, takina |
| `unlimitedAmmo` | 6 | grave, modernia, moran, nayuta, red-hood, snow-white-innocent-days |
| `unswapped` | 3 | laplace, laplace-ultimate-hero, velvet |
| `weapon` | 16 | arcana-fortune-mate, ark-ranger-black, d-killer-wife, drake, himeno, k, leona, miranda, … |
| `weaponSwap` | 21 | ada, chisato, cinderella-crystal-wave, clay, e-h, eunhwa-tactical-upgrade, frima, jill, … |
| `whileSwapped` | 0 | _none_ |

<!-- END GENERATED: primitive-census -->

## Status dashboard — at a glance

> Every theme bucketed by implementation state (verified against the live tree 2026-08-03). Jump to the
> numbered theme below for detail. **Nearly every discrete engine-primitive gap has now been built** — what
> remains is per-unit _enactment_ of built primitives (board-moving → measurement-gated) plus inherent-v1
> limitations and measurement backlogs.

### ✅ A. Completely done — primitive wired AND fix enacted/board-verified

| Theme                             | Capability                                                 | Enacted on                                                                              |
| --------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 2b. Recovery-event emitter        | `heal.ticks`/`recoveryEmitters`                            | anchor-innocent-maid, blanc _(HoT backfill tail: prika/trina/mint/naga/mana/anis-star)_ |
| 6. Parts-branch HOT fix           | SKIPPED-CONDITIONAL                                        | d-killer-wife (1.055→0.998), takina                                                     |
| 6/10. `bossElementGate`           | block gate composes w/ any trigger                         | helm-aquamarine, brid-silent-track                                                      |
| 8. `hitRatePct` → core lift       | `HRCORE` (live default)                                    | roster-wide _(refinements: asuka bracket, quency)_                                      |
| 9. Own-burst-gated FB             | `ownBurstGate:'cast'/'notCast'`                            | cinderella-crystal-wave (T8 1.062→1.001)                                                |
| 11. `excludeSelf` on typed allies | resolveTargets honors it                                   | maiden-ice-rose (1.55→1.03), brid/miranda/soda                                          |
| 12. Per-DoT crit                  | `dot.crit` opt-in (global gate stays off — recal deferred) | isabel                                                                                  |
| 13. Max-HP grants                 | `targetMaxHpPct` + `alliesLowestHp`                        | maiden-ice-rose (self-fed, 0.76→0.85) + completeness                                    |
| 16. Treasure SSOT                 | sync favorite-item prose                                   | helm (0.591→1.014), laplace/moran/miranda/drake                                         |

### ⚙️ B. Wired but NOT enacted / disabled pending verification — capability exists, opt-in is board-moving

| Theme                    | Capability (inert until opt-in)        | State                                                                                     |
| ------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| 3. Stack-ramp            | `buff.rampSec`                         | ENACTED cinderella + arcana-fortune-mate + scarlet (HP-gate proxy); rest (chisato/leona/guilty/…) measurement-gated |
| 4. Team-composition gate | `teamHas:{element/class/weapon/burst/sameSquad}` | ENACTED blanc, eunhwa-tactical-upgrade, noir (sameSquad); arcana (mono-Electric predicate) deferred (no board data + WoF gate unmodeled) |
| 5. Timed pierce          | `gainPierce`/`pierceUntilFrame`        | ENACTED ade-agent-bunny, asuka, dorothy, grave (0.83→1.18, faithful>fit, U19), mari, naga, neve; milk deferred; prika ENACTED 2026-08-11 |
| 7. Weapon-swap spec      | `weaponSwap.weapon`/`pullsPerSec`      | nayuta FIXED; moran throughput + chisato/takina/velvet pending                            |
| 14. Flat Max-Ammo        | `maxAmmoFlat` StatKey                  | ENACTED (kit-literal) emilia, grave, n102, noir, rem, tove, trina                          |
| 15. Ammo-dump            | `consumeAmmo` effect                   | ENACTED asuka-wille, jill; grave's Prediction-end trigger remains open (U19)               |

### ❌ C. Unwired / inherent-v1 limitation / measurement-only — no discrete primitive to build

| Theme                                      | Why it's here                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1. Cadence tuple (~22 units)               | **SOLVED 2026-07-25** — datamine frame data reliable; SMG frame-data confound understood |
| 2. Defensive/heal/shield (~25 units)       | no HP pool in v1 (immortal boss) → inert by design                                       |
| 17. User-selected modes (7 units)          | config/owner-review, not a primitive                                                     |
| 18. Kill-gated effects (~4 units)          | inherent (immortal solo boss)                                                            |
| 19. SG pull-vs-pellet `hitCount` 10× lever | measurement/calibration; per-unit landing CLOSED (A31/U17), open tail = U27              |
| 12-tail. eve Mk2 crit-count proxy (U26)    | static proxy can't track external crit buffs; ungraded/no footage, not a primitive gap   |

---

## 2026-07-20 — blind-rebuild three-way audit cross-check (74 packets + rei-ayanami)

> The full roster was run through the blind-rebuild three-way audit (`scripts/blind-rebuild/`:
> blind rebuild → sighted full-context review → reconciling judge vs the formula SSOT). 76 result
> files, **avg faithfulness 0.95**, 106 gotchas (45 FIDELITY / 33 ENGINE / 24 ENCODING / 4 SILENT_DROP;
> 25 high). The audit found **no new engine primitive** beyond the 19 themes above — its value is
> independent confirmation that this inventory is complete, plus unit-level enactment detail and a
> handful of stale-caveat corrections. Per-kit detail: `docs/handoffs/2026-07-20-kit-audit-implementation-plan.md`.

**Independent confirmations of existing themes** (audit reached the same conclusion from code-only):

- **Theme 8 (hitRatePct live):** the audit re-derived `hitRatePct → acrForHR` core lift from code on
  every AR/SMG/SG unit and flagged the overrides that still carry a **stale "hitRatePct inert" caveat**
  predating the 2026-07-19 CONE_DELTA landing. **Stale-caveat corrections needed (7 overrides):**
  `miranda`, `modernia`, `nayuta`, `noir`, `quency-escape-queen`, `soda-twinkling-bunny`, `trina`
  (each review's "inert in the engine" note is now wrong; the stat is live for AR/SMG/SG; MG/SR/RL keep
  the flat base table). Documentation-only fix; no engine change.
- **Theme 12 / U13 (function-rider crit): CLOSED 2026-07-22 — `RIDERCRIT` default ON.** The
  `extraHitDamagePct` path now crits at caster rate per SSOT §2b (never cores; FB by landing time was
  already correct). Population was exactly three overrides — `modernia`, `nayuta`, `neon-vision-eye` —
  all kit-verbatim coefficients, none calibrated-absorbed, so no de-credit was applied. → A32 (U13),
  DECISIONS 2026-07-22. **Residual gap at the same call site (NOT crit) — the GAUGE half CLOSED
  2026-08-13:** `extraHitDamagePct` now emits `skillGauge` per impact exactly as an equivalent
  `flatDamage` proc does, so the two encodings are interchangeable in gauge terms and re-encoding a
  unit between them no longer silently changes its economy. Board movement zero, structurally: every
  carrier's rider is a `burstCast` buff of 7-15s, so its window sits inside the chain + Full-Burst
  lock and 100% of emissions are swallowed (`scripts/battery/u28-gauge-ab.ts --lock-census`).
  **Still open:** the stat is SUMMED, so a per-rider `flavor` cannot be represented (moot for crit now
  that true damage CAN crit, owner ruling 2026-07-25; it still can't distinguish flavor for other
  flavor-gated behavior) and two riders on one unit would emit gauge ONCE where two `flatDamage`
  riders emit twice. No unit carries two today. → U28.
- **Theme 13 (ally-granted Max HP inert, e3):** audit re-confirmed ally-granted `casterMaxHpPct`/
  `targetMaxHpPct` do not feed a teammate's `atkOfMaxHpPct` (rouge/noir/trina), neutralizing the
  Max-HP double-counts as damage-irrelevant.
- **Themes 3/4/5/7/11/14:** audit re-confirmed stack-ramp (3), conditional/team-gated buffs (4: naga
  shield-gate, mint mode-default), pierce gating (5: prika's missing Gains Pierce was the one SILENT_DROP-class
  pierce finding — ENACTED 2026-08-11), weapon-swap economy (7), excludeSelf (11), flat Max-Ammo (14: noir +5 self-only) on the
  relevant units.

**Genuinely-new unit-level findings surfaced by the audit** (not previously itemized):

- `prika` — continuous "Gains Pierce" (while in Performance) — **ENACTED 2026-08-11** (owner-ruled) as a
  self-targeted `gainPierce` on her burstCast in `skill1`, windowed per mode (25s solo / 9999 duet). Her own
  Pierce Damage ▲13.09% and partner Pierce buffs now land on her; board 0.890 → 1.065.
- `snow-white` — "Full Charge Damage: 1000% of damage" encoded as multiplicative ×10 (chargeMultPct 1000
  → 4995%/full shot) AND swap shot economy capped at exactly 1 cannon shot/burst (engine zeroes charge-speed
  during swap) — two high ENGINE/ENCODING items.
- `tove` — team-wide Critical Rate modeled at stale 3.32% vs current in-game 10.08% (~3× too low) + burst
  ATK-buff duration 10s vs 15s — two stale-datamine-value FIDELITY fixes (separate from hitRatePct).
- `asuka-wille` — "Anti A.T. Field status is removed after the effect is triggered" represented nowhere
  (SILENT_DROP). `rapi-red-hood` / `miranda` also carry a SILENT_DROP-class line each.

## 2026-07-24 — kit-autonomy bottom-up gauntlet batch cross-check (10 units)

> The autonomous kit-autonomy gauntlet (test-first independent re-derivation + cross-family blind roles +
> binding judge) ran bottom-up on 10 units: `zwei`, `volume`, `velvet`, `trina`, `tove`, `takina`,
> `soline-frost-ticket`, `soda-twinkling-bunny`, `snow-white-heavy-arms`, `snow-white`. All GO (faithfulness
> 0.9–1.0). Like the 2026-07-20 audit, the batch found **no new engine primitive** beyond the 19 themes — its
> value is independent re-confirmation plus the two owner-flagged engine questions below.

**Re-confirmed existing themes** (documented as the known theme, not re-derived):

- **Theme 1 (cadence tuple):** `soline-frost-ticket`, `volume`, `velvet`, `zwei` (kit-silent SG/swap cadence).
- **Theme 2 (defensive/heal, no HP pool in v1):** `zwei` cover-HP→recovery firing, `trina` S1 heal lines.
- **Theme 14 (flat Max-Ammo):** `tove` (`maxAmmoFlat 6`), `trina` (see FIX below).
- **Theme 5 (timed/swap pierce):** `snow-white` — pierce CORE+BODY double-hit unmodeled, inert on the partless
  boss (multipart-only; don't conflate with the Pierce Damage ▲ that does apply).
- **Theme 7 (weapon-swap economy):** `velvet`, `takina`, `snow-white-heavy-arms` (swap-shot cadence kit-silent).

**Genuinely-new owner-flagged ENGINE questions** (rulings needed, not primitives to build here):

- `takina` — **true swap normals CRIT — RESOLVED 2026-07-25 (owner ruling, in-game confirmed: true damage
  CAN crit).** `sim.ts` crits true swap normals (`crit: true`), which is CORRECT; the former §2c "true
  damage cannot crit" carve-out is reversed (and was never an engine guard). `chisato`/`laplace`
  `trueNormals` critting is faithful. No change needed.
- `snow-white-heavy-arms` — **`sequentialDamagePct` inert on flatDamage riders — RESOLVED 2026-07-26
  (owner ruling): misidentification, not a gap.** The engine DOES route `flavor: 'sequential'`
  `flatDamage` riders into the dmgUp bucket via `sequentialDamagePct` (`sim.ts` `dealDamage`
  `opts.sequential` gate); the gauntlet's original residual measured `seqMult` (eve's separate
  multiplicative `sequentialMultPct` bucket, theme 12-tail) and misidentified the consumption path —
  her W16 `sequentialDamagePct 158.4` feeds `dmgUp` and is LIVE on the 527.95/1055.9 riders.

**One faithfulness FIX landed (theme 14 enactment, not a new gap):** `trina` burst "Max Ammunition Capacity
▲20 round(s)" was encoded `maxAmmoPct 33.3` (a %-proxy exact only for 60-round magazines — a 20-round
Electric-AR ally got +6.66 rounds vs the kit-literal +20) → kit-literal `maxAmmoFlat 20`, independently
re-derived by all three blind reviewers and verified regression- and board-neutral.

## Highest-leverage engine fixes (ranked by blast radius)

Systematic limitations, not per-unit fudge — each corrects many units at once. Capability-build detail

- board deltas are in DECISIONS (dates below); live flag/primitive state in `docs/STATE.md`. Compact:

1. **Per-tick recovery-event emitter** (theme 2b) — ✅ CAPABILITY LANDED 2026-07-17 (`heal.ticks`/
   `intervalSec` + `recoveryEmitters` queue; opted in anchor-innocent-maid, blanc, prika [cadence only,
   2026-07-25 — HP magnitude still unmodeled]). Open HoT backfill: trina/mint (no `heal` block at all);
   naga/mana instant; anis-star dropped.
2. **`excludeSelf` on typed-ally targets** (theme 11) — ✅ LANDED 2026-07-17 (maiden-ice-rose 1.55→1.03;
   brid-silent-track/miranda/soda-twinkling-bunny faithful, board-neutral).
3. **`hitRatePct` → core-hit lift** (theme 8) — ✅ LIVE BY DEFAULT 2026-07-17 (`HRCORE`). Open refinements:
   asuka saturation bracket; quency-escape-queen cadence + the +1.04 overshoot; slope validation.
4. **Own-burst-gated FB** (theme 9) — ✅ LANDED 2026-07-17 (`ownBurstGate:'cast'/'notCast'`; opted in
   cinderella-crystal-wave T8 1.062→1.001, T5 1.009→0.978). diesel-winter-sweets `'notCast'` Highlight
   sustained ENACTED 2026-07-25 (both Intro/Highlight tiers modeled).
5. **Swap weapon datamine spec** (theme 7) — ✅ CAPABILITY LANDED 2026-07-17 (`weaponSwap.weapon`/
   `pullsPerSec`; nayuta 0.637→0.894). moran throughput footage-blocked; chisato/takina/velvet HOT-unaddressed.
6. **`bossElementGate` block gate** (theme 10) — ✅ LANDED 2026-07-17 (helm-aquamarine Electric rider,
   brid-silent-track Wind debuffs; inert vs the neutral scope-lock boss). Advantage BUFFS never needed it
   (`elemAdvantageDamagePct` is already advantage-gated in the damage math).
7. **Timed / swap-scoped pierce** (theme 5) — ✅ CAPABILITY LANDED 2026-07-17 (`gainPierce` +
   `pierceUntilFrame`; grave enabled 0.83→1.18 HOT kept on purpose, faithful>fit, residual → U19).
   milk-blooming-bunny/prika deferred. (Pierce Damage ▲ applies on the partless boss; only the pierce
   CORE+BODY double-hit is multipart-only — don't conflate.)
8. **Cadence-tuple measurement** (theme 1) — **SOLVED 2026-07-25**: the SMG `read-ammo` test traced the
   perceived discrepancies to an SMG-specific frame-data confound; datamine cadence is reliable, no per-unit testing needed.

## Full theme catalog (ranked by unit count)

### 1. Cadence-tuple datamine estimates — ~22 units — **SOLVED 2026-07-25**

> **SOLVED 2026-07-25 (owner):** the SMG `read-ammo` test showed the perceived cadence discrepancies traced to an
> SMG-specific frame-data confound (now understood), not per-unit cadence errors. The datamine cadence tuple is
> reliable; per-unit cadence measurement is no longer required and the `⚑ cadence tuple` flag is retired. The
> historical context below is retained.

Class-default fire rate / `reloadFrames` / charge frames / SR-RL 22-frame bolt-gap shipped
unverified on every non-focus-recorded unit ("⚑ cadence tuple"). Direction unknown per unit but
empirically large: guillotine-winter-slayer ~26% HOT on normal fire; jill 1.67→1.02 was pure
cadence. Sub-flags: SR/SMG autofire-vs-bolt-gap unknown (ade-agent-bunny, mari, red-hood, velvet);
chunked (multi-part) reloads are **already modelled** for 14 of their 15 carriers, as of the
2026-07-22 re-derive: `reload_bullet` = `1/chunks`, `reload_time` is per-chunk, and shipped
`reloadFrames` = `reload_time × chunks × 0.6 + 21` for 190 of 192 units. `grave` is the sole
carrier shipped un-multiplied (×1 where `5000` implies ×2) — board-inert today behind her measured
`charFixes`. `modernia` and `volume` were never carriers (`reload_bullet 10000`); the field that
named them, `reload_start_ammo`, is `max_ammo − 1` on all 192 rows and identifies nobody →
open-questions **U30**.
Units: ade-agent-bunny, anchor-innocent-maid, anis-sparkling-summer, arcana, asuka, asuka-wille,
bready, elegg-boom-and-shock, guillotine-winter-slayer, helm-aquamarine, laplace, liter,
ludmilla-winter-owner, mana, mari, modernia, quency-escape-queen, raven, sakura-bloom-in-summer,
scarlet, soline-frost-ticket, volume.

### 1a. Named target-status registry — the SOLE enemy-status channel — 1 carrier

`targetStatus` effect + `requiresTargetStatus` gate (DECISIONS 2026-07-23, `docs/STATE.md` §5). It
**replaced** the hardcoded `wipeOut`/`requiresWipeOut` pair, which was deleted outright rather than kept
alongside: that pair could express exactly ONE status name for the whole roster, so any second carrier
would have silently satisfied `d-killer-wife`'s gate and vice versa. Owner ruling 2026-07-23 —
faithful > fit; an incorrect model is not made correct by passing a regression test.

`d-killer-wife` is migrated (`'Wipe Out'`, 10 s) and the migration is **behaviour-preserving** — the
regression snapshot did not move, because the new path has identical semantics (max-extend window,
same gate position, expiry checked at read). So the registry now IS exercised by a graded comp, but only
in its single-status, same-unit, same-frame form. Everything below is what that carrier does NOT reach:

- **`chargeCounter` gate routing — ✅ FULLY CLOSED 2026-08-11.** The dispatch routes through
  `applyBlock` like every other trigger, so the runtime gates (2026-08-10, `blockGatesPass`) AND
  `everyN` / `everyNOffset` / block `delaySec` all bind. What made it possible is `applyBlock`'s
  optional `phase` argument: this trigger fires ONE effect per activation (`block.effects` is an
  ordered phase list, not a set), which is why it could not route before. The old
  `validate-overrides.ts` error on `everyN`/`delaySec` + `chargeCounter` is REMOVED — authoring
  them is now legal. Phase advances only when the activation LANDED, so a suppressed activation
  re-offers the same phase instead of skipping it. Behaviour-neutral (all 12 carriers ungated,
  regression byte-identical); pinned by `scripts/tests/engine/charge-counter-gates.test.ts`, whose
  4 new-behaviour assertions were mutation-checked to fail on the pre-change engine.
- **A typo'd status name fails SILENTLY** — matching is exact and case/whitespace-sensitive, and the
  failure mode is a block that never fires (a silent under-model, the exact bug class this primitive
  exists to prevent). Note `d-killer-wife` now depends on two string literals agreeing across two
  blocks. A producer/consumer census across all overrides would catch a mismatch, but
  `validate-overrides.ts` is invoked per-slug, so a cross-slug census needs a design decision about
  single-slug runs (warn, not error, so a deliberately-future-gated consumer stays authorable).
- **The validator's `target: enemy` rule has no test.** Closing it needs the validator's structural
  checks extracted into an importable pure function — today `validate()` loads from disk and runs a sim,
  and a test must never write to `src/skills/overrides/`. The engine half IS tested (P7).
- **Same-frame ordering is load-bearing and unspecified beyond array order.** The gate reads at trigger
  time, the effect writes at apply time. `d-killer-wife` relies on this INTRA-unit: her status-inflicting
  block precedes her gated block in the burst array and both fire on the same `burstCast` frame, so
  reordering that array would silently disable her buff for one window. CROSS-unit (unit A applies, unit
  B consumes, same frame) additionally depends on team-slot iteration order and has no carrier yet — the
  first `prika`-style cross-unit case will hit it.
- **The `privaty` enactment is NOT rotation-neutral under seeded runs (recorded so it is not
  rediscovered as unexplained drift).** `flatDamage` and `dot` ticks both emit `skillGauge`, so
  converting her block changed both the COUNT (18 dot ticks → 19 procs in T4) and the TIMING
  (cast+3/6/9 s → last-bullet-aligned) of her skill-gauge grants. The unseeded EV run is byte-identical
  for all four teammates — which is why the snapshot shows exactly one moved entry — but seeded means
  shift ≤0.4% and one seed flips T4's full-burst count 13→12 (distribution 12×32%/13×68% → 12×36%/13×64%).
  T4 is deliberately unpinned (known real = 14 vs sim 13) so nothing is gated, and she appears in no
  other snapshot comp. Note it moves T4 marginally FURTHER from the measured 14.
- **Multi-producer refresh is untested.** Two units applying the SAME status name exercise a `Math.max`
  extend path that only self-refresh reaches today. (Multi-status concurrency IS now tested — two
  differently-named statuses held live simultaneously, gated three ways: `target-status-gate.test.ts`
  P4a/P4b/P4c.)

### 1b. "is fixed at" stat LOCKS — ✅ CLAMP VOCABULARY LANDED — 7 carriers

Kit lines of the form _"X is **fixed at** V"_ CLAMP a stat (owner ruling 2026-07-22): the value is
the locked level and it cannot be modified further — not a delta applied on top. Sign varies
(`jill` reads _"a 99.96% **increase**"_; `milk-blooming-bunny`'s kit line is _"fixed at a 50%
**reduction**"_, though she no longer carries a clamp — see the open remainder).
Expressed by three StatKeys — `reloadSpeedClamp` / `reloadTimeClamp` / `chargeTimeClamp`
(`src/skills/types.ts`; a clamp OVERRIDES the additive stat, most recent active clamp wins) plus the
`weaponSwap.chargeTimeClamp` field for swap-scoped charge locks. Live carriers:

| locked stat  | carriers                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------- |
| reload speed | `jill`, `exia`, `asuka-wille` (`reloadSpeedClamp`)                                            |
| charge time  | `anis-star`, `nayuta`, `snow-white-heavy-arms` (incl. the swap field), `cinderella-crystal-wave` |
| reload time  | `cinderella-crystal-wave` (`reloadTimeClamp`, _"reload time is fixed at 3 sec"_)              |
| pellet count | `dorothy-serendipity` — bespoke `consolidation` block, not a clamp StatKey                    |

Open remainder: the **reload-count-scoped** clamp variant now has ZERO carriers.
`milk-blooming-bunny`'s kit line is the count-scoped shape, but her whole Embarrassment package —
that clamp included — was ruled UNMODELED on 2026-08-12 and is filed under `unmodeled`, so the gap
survives only as a primitive with no live carrier (QUEUE 5e builds; deprioritized 2026-08-10, owner
call). Open-questions **U31** still carries the `jill`
`reloadFrames: 0` consequence.

### 2. Defensive / heal / shield with no engine vocabulary — ~25 units

No HP pool → lifesteal, shields, overheal buffers, taunt, invuln, Indomitability are inert/dropped.
Mostly neutral for the unit itself (v1 boss deals no damage).
Units: ada, alice, anchor-innocent-maid, asuka, asuka-wille, blanc, crown, delta-ninja-thief, grave,
little-mermaid, maiden-ice-rose, mana, moran, naga, nayuta, neon-vision-eye, prika, red-hood, rouge,
soline-frost-ticket, trina, zwei, mihara-bonding-chain, mint, anis-star.

#### 2b. Per-tick heals collapsed to one event → breaks on-recovery consumers (COLD uptime)

A repeated "hard rule 2" violation: dropping/collapsing a heal breaks the recovery-trigger synergy
chain (Crown's "when recovery takes effect"). **Single-fix candidate #1 — ✅ CAPABILITY LANDED
2026-07-17** (`heal.ticks`/`intervalSec` + `recoveryEmitters` queue; see ranked fix #1 above). Opted
in: anchor-innocent-maid (ticks:8), blanc (ticks:5 / ticks:8), **prika** (burst Performance heal,
ticks:25/intervalSec:1 — cadence modeled per judge gotcha 3, 2026-07-25; only the heal's HP MAGNITUDE
remains unmodeled, the engine's heal effect carries no HP amount). Remaining units carry their HoT heals
as no heal block at all (trina/mint) or instant heals (naga/mana) or dropped (anis-star) — convert
per-unit when touched.
Units: anchor-innocent-maid ✅, blanc ✅, prika ✅ (cadence only), mint, naga, trina, anis-star, mana.

### 3. Stack-ramp buffs baked to max, not time-averaged — ~13 units (HOT) — ⚙️ ENGINE CAPABILITY LANDED 2026-07-17

Per-shot/per-charge stacking frozen at cap from t=0 → over-credits opening seconds.
Units: ade-agent-bunny, arcana-fortune-mate (~+8–10%), chisato, cinderella, guilty, leona,
mast-romantic-maid, mihara-bonding-chain, laplace, soda-twinkling-bunny, red-hood, rouge,
sakura-bloom-in-summer.

**Capability:** the `buff` effect now carries optional `rampSec` (types.ts). When a buff's value is
authored at its MAX-stacks magnitude but the real stacks accrue over the opening seconds, `rampSec`
linearly ramps its contribution `0 → full` over `rampSec` from the buff's FIRST application, then holds
at cap (sim.ts `sum()` chokepoint scales `value*stacks` by `min(1, (frame-startFrame)/rampFrames)`).
The ramp clock is the first-apply frame (frame 0 for a `passive`, the cast frame for a burstCast-keyed
self-buff) and is NOT reset by refreshes. Omit → instant-to-max (back-compatible). **NOW ENACTED on 2
units (2026-07-17) — no longer inert/byte-identical:** **cinderella** (`casterMaxHpPct 19.2, rampSec 36`
for her battle-start Beautiful Max-HP + the `flatDamage 346.8, rampSec 36` Beautiful-mirror split; steady
state t≥36s byte-identical to the old bake, pre-36s bursts now credit partial Beautiful — this is the
source of the current cinderella regression-snapshot drift, understood/documented in her caveats) and
**arcana-fortune-mate** (3× `rampSec 11` on her Making-Memories stack buffs — the 2/4/6-shot phase counter
caps at ~11s ≥ the window, so each ramps 0→full and resets per window). Verified end-to-end earlier:
injecting a temporary `rampSec:8` on red-hood's 10s burst ATK ▲71.42% moved her PA-MiKa total 799M→786M
(0.936→0.921), the expected opening-seconds de-credit.
**NOT auto-enacted:** each unit's `rampSec` is a ⚑ per-unit estimate — enacting moves the board (these are
HOT), so it is measurement/Fable-gated per unit (scientific-method harness). **Do NOT double-correct the
units that already hand-average their ramp in the override note** — cinderella (Beautiful baked `2.71×1.192`
steady-state), soda-twinkling-bunny (Golden-Chip time-average, measured against `soda tb control.mov`), and
arcana-fortune-mate (Making-Memories phases baked to max within her FB window, which resets per window — a
plain continuous ramp is the WRONG shape for her). The clean first candidates are the battle-long monotonic
ramps (chisato/leona/guilty/mast-romantic-maid/red-hood charge-stack/sakura-bloom-in-summer). The faithful
alternative for any unit whose accrual is cleanly one-stack-per-shot stays re-authoring the buff with its
real incremental trigger (`shotFired`/`hitCount`/`chargeCounter` + `maxStacks`) — the engine already ramps
stacks for those; `rampSec` is the time-average approximation for when per-shot authoring is impractical.

### 4. Conditional / team-gated buffs modeled as always-satisfied — ~11 units (HOT) — ⚙️ TEAM-COMP GATE CAPABILITY LANDED 2026-07-17

Gate ("at max stacks", "while shielder present", "same-squad ally", "Wheel of Fortune") not encoded,
defaults to always-on.
Units: arcana, arcana-fortune-mate, asuka, naga (shield-gate fires unconditionally, 1.175 HOT),
guilty, leona, noir, anchor-innocent-maid.

#### 4b. Kit-silent trigger → invented 100%-uptime (HOT)

No "Activates when…" clause → author invented a proxy.
Units: helm-aquamarine, liter, mari, rosanna-chic-ocean (TOP flag; also removed a fabricated
permanent casterAtkPct), snow-white, isabel.

**PREMISE CORRECTION (2026-07-17) — this theme is a RECONCILIATION backlog, not one missing primitive.**
Reading every unit's `kit-status.json` finding + override showed the gates here are MOSTLY ALREADY
EXPRESSIBLE, and several units are already fixed: **asuka** (fires-only-with-a-healer → already the
`recovery` trigger), **snow-white** (already `shotFired`+`swapGate`), **rosanna-chic-ocean** (fabricated
permanent `casterAtkPct` already removed; residual = 1 invented-uptime S2 trigger), **naga**
("while shielder present" → the `{kind:shielded}` trigger + 3 live emitters blanc/crown/delta-ninja-thief
already exist; her over-credit is currently neutralized by the `auto` mode default, theme 17). **guilty's**
"at max stacks" rider is expressible via `resourceGate` once her stacks are modeled as a resource.
The residual work is per-unit override reconciliation that is BOARD-MOVING (HOT) with an open magnitude
question, so it is measurement/Fable-gated — NOT an autonomous inert-landing like themes 3/5/6/7. Routed
to the kit-parse owner-reconciliation backlog.

**The one genuinely-inexpressible gate WAS the team-composition predicate** ("dead without a Burst-III
Electric caster present" — the `arcana` RL/Electric override; NOT arcana-fortune-mate). ✅ **CAPABILITY
LANDED 2026-07-17:** a static block gate `teamHas:{element?/class?/weapon?/burst?}` (types.ts Block;
evaluated at sim setup in the sim.ts block filter alongside `formation`/`mode`). Facets AND together;
the block is active only when SOME OTHER ally matches ALL of them (owner never counts, same rule as
`formation`; burst matches literally so a Λ unit ≠ 'III'). Omit = always active → **inert until an
override opts in** (regression byte-identical, verified by a stash A/B of the two touched files against
the pre-existing working-tree snapshot). Verified end-to-end by injecting a `teamHas`-gated +100% ATK
self-buff on a focus unit: fires with a matching present ally (Water/Electric/B3 → +57%), correctly
inert when absent (Wind → 0%), correctly inert when only self would match (owner excluded → 0%).
**No `teamHas` override opts in on `arcana` (RL/Electric, base — NOT arcana-fortune-mate) yet** —
enacting the mono-Electric predicate is deferred (MODEL_ONLY, no board data; owner currently grades
her "mono-Electric comp only"). Her separate Wheel-of-Fortune status gate is a DIFFERENT mechanic and
is no longer unmodeled: `ownBurstGate:'cast'` now covers it (kit-autonomy gauntlet, 2026-07-24).
**2026-08-02: the `sameSquad` facet landed** — "an ally from the same squad … on the battlefield"
gates resolve squad membership from the curated map `src/data/squads.ts` (fail-closed; validator-
guarded); blanc's S2 burst-CDR is the first enactment (see DECISIONS.md 2026-08-02). `noir` migrated
from `.slugs` to `.sameSquad` 2026-08-03; the remaining same-squad kit text (anchor-innocent-maid,
ram) is tracked in QUEUE.md. `teamHas` now has 3 enactments total (blanc, eunhwa-tactical-upgrade,
noir) — see the primitive census above.

### 5. Pierce gating — static `hasPierce` only — ~14 units (usually COLD)

Timed / swap-scoped / HP-gated pierce was inexpressible → dead blocks ("modeled ≠ working"). **✅ TIMED
pierce now expressible (`gainPierce`, 2026-07-17 — see ranked fix #7).** Pierce Damage ▲ is a real
Damage-Up-bucket entry that applies to any pierce-damage-type unit, on the partless boss too (only the
pierce CORE+BODY DOUBLE-HIT is multipart-only — `PIERCE_CORE_DOUBLE=false`; don't conflate). grave is
ENABLED with faithful pierce (0.83→1.18 HOT kept on purpose, faithful>fit); the residual HOT is a separate
burst-window over-model, now cleanly isolated as open-questions U19. **8 units now carry a live
`gainPierce` enactment** (kit-autonomy gauntlet passes 2026-07-20 → 2026-08-02, per the primitive census
above): ade-agent-bunny, asuka, dorothy, grave (ENABLED; residual = burst-window over-model, U19), mari,
milk-blooming-bunny (ENACTED 2026-07-20, 0.653 COLD→1.301 HOT — the residual HOT is now isolated to her
SEPARATE auto-basis over-model — the burst atkPct 220 / S2 DoT magnitudes — not the pierce; U23), naga, neve. Units: alice, d-killer-wife,
prika (held — owner popup measurement pending, probe-runs 2026-07-14 inconclusive), red-hood, snow-white,
snow-white-heavy-arms, zwei, laplace, maxwell, mana.

### 6. Parts / core branches inert on the partless v1 boss — ~11 units

Mostly correctly inert; the one **live HOT bug** — d-killer-wife's parts branch `coreDamagePct 16.26`
staying LIVE in-sim (core hits exist on a partless boss) → over-crediting every ally's core bucket —
✅ **FIXED 2026-07-17**: removed as SKIPPED-CONDITIONAL (kit "Allies that hit parts…", parts-gated,
unearnable on the partless boss); body branch `casterAtkPct 12.19` kept. d-killer-wife 1.055 HOT → 0.998,
takina 1.047 → 0.988; board within-±3% 5→6 (DECISIONS 2026-07-17).
Units: d-killer-wife (HOT bug — FIXED), diesel-winter-sweets, laplace, raven, rosanna-chic-ocean,
sakura-bloom-in-summer, red-hood, snow-white-heavy-arms, mari, asuka, diesel.

### 7. Weapon-swap burst-window economy — ~12 units (mixed) — ⚙️ ENGINE CAPABILITY LANDED 2026-07-17

The `weaponSwap` effect now carries per-swap `pullsPerSec` (fire cadence) + `weapon` (class) overrides
so a swap can load its OWN datamine spec (fix #5). `effWeapon = swap.weapon ?? char.weapon` drives
range-band + auto-core; a swap `pullsPerSec` governs the non-charge fire cadence. Both inert until an
override opts in.

- **nayuta ✅ FIXED (0.637 → 0.894):** swap shots were range/core-banded as base **SMG**; set
  `weapon:'SR'` (Memory Incineration is an SR mode) → +30% range in midfar/far + HI core, the bands
  the finding flagged. MAD 0.342→0.106 (DECISIONS 2026-07-17).
- **moran ⛔ REFUTED then MEASURED — stays base 12/s; coldness is a THROUGHPUT follow-up (footage-blocked):**
  the datamined swap ROF 1440 = 24 pulls/s was applied but the board REFUTED it (0.712 → 1.325 HOT). Backed
  out, then MEASURED (`moran control.mov`, 60fps): swap fires base ~12/s. The "1440" was an unlabeled
  `skill_value`. Coldness DIAGNOSED as throughput, not per-shot: her measured popup reconciles EXACTLY to
  14.7% × Crown/Helm-buffed final ATK (recon 30,478 = 14.71% × 131,441 × 1.5723, 0.3%) — per-shot faithful,
  buffs modeled. But sim 217M vs real 288M ⇒ ~1.3× more HITS than modeled (~1.5× throughput in the swap
  window) — faster swap fire-rate OR >1 bullet/pull, NOT isolable from the comp footage. ⇒ FOLLOW-UP: needs
  an isolated moran-solo recording or the swap weapon's `shot_count` datamine (DECISIONS 2026-07-17).
  Others still optimistic/HOT (unaddressed): chisato, takina (~1.044), velvet (~1.068), red-hood,
  snow-white, laplace, maxwell, zwei, volume.

### 8. `hitRatePct` → core-hit-rate lift — ✅ LIVE BY DEFAULT 2026-07-17

Was engine-inert; now a live core-hit-rate lift (`HRCORE`, sim.ts — a live Hit Rate shrinks the
reticle → higher core fraction; `ENV.HRCORE=0/off` disables for A/B). jill measured core 0.20→0.90.
OPEN refinements only (not a capability gap): asuka (base, AR/Fire — not asuka-wille)'s saturation
bracket, quency-escape-queen's cadence + the +1.04 overshoot, slope validation via a measurement (e.g.
`soda-tb-control`). Related, was tracked here but is now RESOLVED: tove's crit-rate (stale 3.32→10.08%,
a separate crit-rate fix, not hitRatePct) landed 2026-07-20.
Units affected: anchor-innocent-maid, drake, leona, modernia, noir, quency-escape-queen,
soda-twinkling-bunny, jill, nayuta.

### 9. Own-burst-gated vs team-FB trigger (schema gap) — ~7 units (HOT in multi-B3) — ✅ CAPABILITY LANDED 2026-07-17

"Entering Full Burst after this unit uses her own Burst" was modeled as plain team `fullBurstEnter`.
**RESOLVED** via the `ownBurstGate: 'cast' | 'notCast'` block gate (see ranked fix #4). Opted in:
cinderella-crystal-wave (both FB-enter core-strike riders → `'cast'`; T8 1.062→1.001, T5 1.009→0.978,
NOT the sole-B3-inert the finding assumed — she alternates stage-3 with a co-B3 in both graded comps,
so the gate is board-moving and IMPROVES fit). arcana-fortune-mate / mana / asuka-wille (the reference)
already correctly use `burstCast` for their duration self-buffs (no FB-entry instant to preserve);
mihara-bonding-chain is a benign sole-B3; chisato has no FB-enter own-burst line. The inverse COLD case
diesel-winter-sweets (0.831, `'notCast'` Highlight sustained) is now EXPRESSIBLE but owner-deferred
(document-only; her full Highlight state machine + no-op-B3-drives-FB path is the larger unmodeled piece).

### 10. Boss-element-gated debuffs/buffs inert vs neutral scope-lock boss — ~8 units

`bossElement` couldn't compose with `fullBurstEnter`/`hitCount`/`burstCast`. Big team-wide lever on
matched bosses. **✅ RESOLVED for the element-CODED triggered lines 2026-07-17** (`bossElementGate`
block gate — see ranked fix #6): helm-aquamarine (Electric burst rider) + brid-silent-track (two Wind
team debuffs) opted in. The element-ADVANTAGE buffs (anis-sparkling-summer, guillotine-winter-slayer,
elegg-boom-and-shock, asuka) never needed it — `elemAdvantageDamagePct` is already advantage-gated in
the damage math. eve keeps the permanent `bossElement` trigger.
Units: anis-sparkling-summer, asuka, brid-silent-track ✅, eve, guillotine-winter-slayer,
helm-aquamarine ✅, elegg-boom-and-shock.

### 11. `excludeSelf` not honored on typed-ally targets — ✅ LANDED 2026-07-17

"arcana-fortune-mate bug family". **Single-fix candidate #2 — DONE.** Engine now honors `excludeSelf`
on `allies`/`alliesTopAtk`/`alliesOfElement`/`alliesOfClass` (sim.ts:resolveTargets; the pool is
filtered BEFORE any top-N slice). Overrides opted in against verified `data/characters.json` prose:
maiden-ice-rose (alliesOfElement Electric "except for self" → 1.55 HOT collapsed to 1.03, MAD 0.253→0.098),
brid-silent-track (burst `allies` "except self"), miranda (2× alliesTopAtk "except the skill user"),
soda-twinkling-bunny (alliesTopAtk "except the skill user"; self covered by its own self-block).
arcana-fortune-mate was already fixed for `alliesOfWeapon`. False positives ruled out: blanc/mana carry
"except self" on lowest-HP / incapacitated targets (unmodeled theme-13/18 lines, not these kinds).
Verify: full gate green; regression snapshot updated (2 maiden comps, both understood).

### 12. DoT / periodic damage crit — PER-DoT, evidence-gated (isabel ✅ LANDED 2026-07-17)

Ties to open-question U13. **Resolution: NOT a global flip.** A universal DOT*CRIT default-on was
MEASURED-REFUTED — a board sweep (DOTCRIT off→on) is a wash (±3%: 8→8) and breaks units whose DoTs
are \_validated non-crit*: jill's acid tick is video-confirmed 99.7% NON-crit, mihara-bonding-chain's
Ensnaring is validated at 1.03 non-crit, little-mermaid's FB dot/barrage carry no crit evidence. So
DoT crit is now a **per-DoT `crit:true` opt-in** (types.ts dot effect + `Dot.crit`; the tick site
falls back to the still-OFF global DOT_CRIT gate when unset) — enabled ONLY where measured.

- **isabel ✅ LANDED** — her ~14.7s periodic rider crits in-game (MEASURED: 3 crits / 11 resolved
  fires; crit 308,564 = non-crit 205,709 ×1.5 exactly, `docs/probe-data/isabel-sg-band.json`
  riderFinding). `crit:true` on her skill2 dot; rider now rolls at her sheet rate (solo recon warms
  the right direction, ~50.9M→53.1M vs real 55.3M). Zero board blast radius (solo-only unit; per-DoT
  field leaves every other unit byte-identical). DECISIONS 2026-07-17.
- **neon-vision-eye** — the "~7% cold" claim is STALE: she reads +8% HOT on the current board and is
  UNAFFECTED by DOT_CRIT (no critting DoT in her kit). NOT a theme-12 unit; her heat belongs elsewhere.
- **modernia** — her cold is NOT DoT-crit: both her S1 `flatDamage` rider and her burst Destroy-Mode
  `extraHitDamagePct` rider crit (the latter since `RIDERCRIT`, 2026-07-22 — worth ~+12% on that term
  via her Critical Damage ▲ 14.25%×5 stacks, which moved her 0.83→0.84). She remains COLD; the residual
  is elsewhere and is not a DoT tick.
- **eve Mk2 sequential-doubling — RESOLVED 2026-07-20.** New engine primitive `sequentialMultPct`
  (its own multiplicative bucket, `sim.ts` `seqMult`) gives Mk2's Unstable Energy doubling a TRUE ×2
  that no longer dilutes against other Damage-Up buffs (superseded the old "undercounts ~20%" ⚑;
  DECISIONS 2026-07-20). A DIFFERENT residual survives on eve, not this one: U26's static
  crit-count-proxy carve-out (her `hitCount 59` proxy can't track external team crit buffs) — no
  primitive gap, ungraded/no footage.

### 13. Max-HP-scaling grants with no stat key / no lowest-HP targeting — ~6 units ✅ LANDED 2026-07-17

"Max HP ▲ X% of user's Max HP" and "affects lowest-remaining-HP ally" have no primitive. Matters only
on HP-scaling teammates. Units: anis-star, blanc, rouge (double-counted 44.5 vs 30.02, HOT), trina,
maiden-ice-rose, moran.

**LANDED (kit-completeness sweep):** two primitives added — `targetMaxHpPct` StatKey ("Max HP ▲ X%",
target's OWN %, distinct from the existing `casterMaxHpPct` = "% of the skill user's Max HP") and the
`alliesLowestHp` TargetDef (count/excludeSelf; no HP pool in v1 → resolves to the leftmost `count` allies
as a documented deterministic stand-in). Both honor the e3 rule (ally-granted Max HP feeds a consumer's
`atkOfMaxHpPct` ONLY when caster === target, i.e. self). Per-unit: **maiden-ice-rose** self "Max HP ▲6.34%
×10, every 6 full charges" now modeled (targetMaxHpPct on self, hitCount 6, maxStacks 10, 15s) — the ONE
offensively-live grant (self-fed): her N6 Wind comp 0.76→0.85 (board-verified, +11.6% her total; snapshot
updated maiden-N6 only). anis-star (burst 15.02% all-allies, hasB1), trina (S2 44.98% Electric-AR allies +
burst 20.14% all-allies), blanc (burst 31.68% lowest-HP ally) — all ally-facing, **offensively INERT**
(e3), modeled for kit-SSOT completeness (proven 0.000% board delta on all teammates incl. cinderella).
rouge already had casterMaxHpPct grants. moran's Max-HP lines are HP<20%-gated (theme 18, never fire) —
intentionally left as skips. See DECISIONS 2026-07-17.

**2026-08-04 follow-ups (branch `worktree-max-hp-scaling`, PR #84):** the THIRD grant basis
landed as `highestAllyMaxHpPct` ("% of the highest-Max-HP unit's Max HP" — quency S1, the
highestAllyAtkPct HP analog; next expected carrier sin); laplace-ultimate-hero's stage Max-HP
lines (2/3/7/10.5% cumulative) enacted as resourceGate-gated riders on her modeled oeStage
advance, feeding her own atkOfMaxHpPct conversion; rouge's coin-state machine tracked
(resources coin/shieldBursts) and her coin-tier burst riders (10.15/20.1/30.02) modeled +
coin-gated (still e3-inert). DECISIONS 2026-08-04 carries the rulings.

### 14. Flat-rounds Max-Ammo inexpressible (percent-only schema) — ~5 units — ✅ CAPABILITY LANDED 2026-07-17

A new `maxAmmoFlat` StatKey (types.ts) expresses "Max Ammunition ▲ N round(s)" as a flat round count,
added on top of the `maxAmmoPct` scaling in `maxAmmo()` (`round(base*(1+pct/100)) + flat`). Applied as
a plain `buff` (usually `passive` → self, or an all-allies target for the team grants), so it composes
with triggers/targets like any other stat. **Inert until an override opts in** (no unit sets it →
`stat(u,'maxAmmoFlat')` sums 0 → byte-identical `maxAmmo()`; verified by an isolated A/B of the
`maxAmmo()` edit against the working tree: regression totals identical). Functional check: injecting a
temporary `maxAmmoFlat 200` passive on a low-mag AR lifted pulls 1099→1908 (fewer reloads → more shots,
+65% total), the expected direction. **ENACTED (kit-literal `maxAmmoFlat`), 2026-07-20 → 2026-08-03:**
emilia, grave (+3), n102, noir (+5 all-allies), rem, tove (+2), trina (+20) — 7 units, see the primitive
census above; each converted off its earlier percent-approximation and the conversions verified
regression/board-neutral or board-A/B'd per unit. **`drake` is NOT a gap here (checked 2026-08-03):**
her two Max-Ammo lines are genuinely percent in kit text (`data/characters.json`: "Max Ammunition
Capacity ▲50.14%/10s" and "▲72.18%/10s") — unlike the 7 flat-converted units above, she was never a
flat-round line mis-encoded as percent; the shipped `maxAmmoPct` is already the faithful, kit-literal
encoding. Nothing to convert.

### 15. Ammo-dump / forced-reload "Removes 100% of ammo" inexpressible — 3 units — ✅ CAPABILITY LANDED 2026-07-17

A new `consumeAmmo` effect (types.ts; the inverse of `instantReload`) drains the target's belt by
`fraction` of MAX capacity (default 1 = the whole magazine) and, if it empties, forces an immediate reload
— firing the target's `lastBullet` triggers exactly as if it had fired dry (sim.ts `applyEffect`).
**Inert until an override opts in** (no unit references it → regression byte-identical). Functional check:
injecting a temporary per-shot `consumeAmmo` collapsed pulls 1099→96 (constant forced reloads eat fire time,
−89% total), the expected direction. **2 of 3 ENACTED** (kit-autonomy gauntlet, 2026-07-24 → 2026-07-26):
jill (burst trigger) and asuka-wille (`fullBurstEnd` forced reload) both carry a live `consumeAmmo`
block on their own kit triggers. **Still open:** grave's Prediction/burst-window END forced reload — the
documented comp-COLD cause — remains unauthored, tracked as open-questions U19.

### 16. TREASURE-phase prose SSOT gap — 5 units (RESOLVED 2026-07-17)

Sync carried no favorite-item prose → materialize froze untreasured base kit. helm anchor
0.591→1.014. Units: helm, laplace, moran, miranda, drake. Watch on any newly-synced treasure unit.

### 17. User-selected modes vs auto-detection — 7 units (config-driven board misreads)

Team-comp branches via a manual `modes` field (first entry = default) → board misreads that look like
model bugs but are config bugs (mint 0.768 was a config default, not a model error). The 7 `modes`
overrides, per the generated census above: bready, cinderella-crystal-wave, crust, delta-ninja-thief,
emma-tactical-upgrade, mint, prika. (`milk-blooming-bunny` was an eighth until 2026-08-12, when the
owner ruled her manual Embarrassment branch out of the model entirely — she now has no `modes` at all
and her Embarrassment lines are filed under `unmodeled`. The `elegg-boom-and-shock` and `naga`
anecdotes below are DATED history: neither carries `modes` today — naga's toggle was replaced by real
shield machinery on 2026-07-20.) **Triage note: check the selected mode against the recorded comp before counting one
of these as a modeling defect.**

**2026-07-17 — `auto` no-op default added to 4 units** (bready, delta-ninja-thief, elegg-boom-and-shock,
naga): a new first-entry `auto` mode that no block is tagged to, so it applies NO mode-custom kit config
(only untagged blocks fire). This makes the default a neutral baseline instead of silently applying an
unverified branch — e.g. naga's default was `with shielder` (fires `coreDamagePct 85.17` + burst
`casterAtkPct`); `auto` drops both (72.1M → 63.3M unpinned, neutralizing the 1.175 HOT over-credit).
verify.sh stayed green (board/regression comps pin their mode explicitly). Still branch-default (owner
review pending): cinderella-crystal-wave (`MG`_/`Snipe`, pierce only in Snipe) and the mint↔prika duet
pair (`solo`_/`duet` — mutually referencing, flip both together). Full action item + per-unit mode inventory: `docs/handoffs/QUEUE.md`
backlog (new item 6).

### 18. Kill-gated / revive / boss-death effects that never fire — ~4 units

Immortal solo boss. Units: volume (kill-gated ATK ▲12.6% can never trigger), mana, mihara-bonding-chain,
moran.

### 19. SG pull-vs-pellet `hitCount` 10× lever + per-unit SG landing — SG cluster

"After N attacks" ambiguous between pulls and pellets (10× proc-cadence swing); per-unit pellet
landing not captured by the class table. Units: drake (explicit 10× lever), soline-frost-ticket, noir,
arcana-fortune-mate, isabel (per-unit SG landing residuals). Per-unit landing is CLOSED by owner override
(open-questions **A31 (U17)** — the class table stands, class-wide far 0.66 rejected); the open tail is
isabel's mid/midfar clock-drift re-derive (**U27**). The pull-vs-pellet 10× lever stays open.

### 20. `gauge-per-shot.json` `fullChargeBonus` — ✅ CLOSED 2026-08-18 (sourcing 2026-08-08; default retired 2026-08-18)

`gaugePerShot` sources the SR/RL full-charge focus multiplier from `characters.json`
`chargeMultiplier`; `data/gauge-per-shot.json`'s `fullChargeBonus` is the explicit override
only when `characters.json` reports 0 (the non-charge marker — `raven` is the one live case).
That retires the 6 synthesized `class-modal-SR`/`class-modal-RL` rows as a live source and stops
the four no-row 3.5x units (`belorta`, `n102`, `yan`, `yuni`) from silently running at a fallback.

**There is now NO roster default at all** (owner ruling 2026-08-12, re-affirmed 2026-08-18): the
focus gauge bonus IS the unit's full-charge bonus, for every unit, and a unit with no bonus in
either datamined column takes `UNFOCUSED_CHARGE_GEN` (×1.0) because it does not full-charge.
`pascal` (RL/Iron) is the only such unit and the only one the old `?? 250` arm ever caught — she
has `chargeFrames: 0`, so the default was handing her ×2.5 for a charge she never performs
(7.00 → 2.80 per focused shot). `u.focusChargeMult` (`charFixes.focusChargeMult`) and the
`PENDING_TEAM_ISOLATION` hold still take priority over both sources; the `magDumpRof` arm is gone
as unreachable (its sole carrier, `cinderella` (RL/Electric), sets `focusChargeMult`).

The lint asked for here exists: `scripts/tests/data/gauge-per-shot-source.test.ts` fails if any
SR/RL unit's two sources disagree, or if a `chargeMultiplier: 0` unit gains a gauge row outside the
known exceptions, and pins the four no-row units so a future resync cannot reintroduce a silent
fallback. Since the default was retired it also fails if any **charge-capable** unit
(`chargeFrames > 0`) resolves no bonus from either column — the guard that replaced the magic
number, and what separates "does not charge" from "data went missing". Sourcing landed in
`ccee21f7` (retroactive record: DECISIONS 2026-08-13); the default retirement in `8d92c8fe`
(DECISIONS 2026-08-18).

### 21. "Buff my NEXT round" per-pull `durationShots` budget — ✅ FIXED 2026-08-08

`firePull` now skips the round-budget decrement for any round-scoped buff whose `startFrame`
equals the current frame, and a refresh of a round-scoped buff resets `startFrame` to the
refresh frame. This makes "for 1 round(s)" on a `shotFired`/`hitCount`/`chargeCounter` trigger
reach the next pull instead of eating its own budget. Carriers corrected to the literal kit
round count: `emilia` (S1 Charge Speed / Charge Damage), `zwei` (S1 Pierce Damage), `phantom`
(S1 Attack Damage); `vesti-tactical-upgrade` was already fixed via `noRetriggerWhileActive`.
Evidence and regression coverage lives in `scripts/tests/units/emilia.test.ts` and
`scripts/tests/engine/duration-shots.test.ts`.
