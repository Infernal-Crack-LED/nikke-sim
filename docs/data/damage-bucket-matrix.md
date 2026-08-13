# Damage bucket matrix — every source, and the factor it feeds

Companion to [damage-calculation.md](damage-calculation.md). That doc walks the per-instance
formula in the order the engine applies it; this one inverts the index: **given a buff, a stat, a
gear line or a boss-side term, which factor of the damage product does it land in, how does it
compose inside that factor, and when does it count at all?**

CURRENT-STATE class (see [../CONVENTIONS.md](../CONVENTIONS.md)): rewritten freely, no history
kept. Live engine code wins on "what does the sim do" — if this doc disagrees with
`src/engine/sim.ts`, this doc is the bug. Evidence tiers (MEASURED / DATAMINED / COMMUNITY /
CALIBRATED ⚑) and the WHY behind each placement live in
[damage-calculation.md](damage-calculation.md) and [../DECISIONS.md](../DECISIONS.md); this doc
does not re-argue any of them.

**§2 is generated** by `npx tsx scripts/doc-drift.ts --update` and gated by `scripts/verify.sh`.
Its routing map is also linted against the engine: a StatKey with no bucket assignment, a bucket
assignment for a StatKey that no longer exists, a stat documented inert that gains a consumer, or a
routed stat the engine stops reading, all fail the gate.

---

## 1. The product, factor by factor

`dealDamage()` in `src/engine/sim.ts` is the **single choke point** — every damage-producing path
in the engine (normal shots, skill and burst riders, dot ticks, stored-hit releases, flighted
hits, the per-pull rider) composes its number there. The one exception is `dealRepeatDamage()`
("deals X% of the damage dealt by self"), which deliberately applies **no factors at all**: it
takes a fraction of the parent hit's already-composed number, so every bucket is inherited
implicitly and none can be double-counted.

The live product is **eight factors** plus the base:

```
damage = FinalATK × (rate%/100) × Major × Element × Charge × DamageUp × seqMult × Taken × Distributed
```

| Factor        | Expression in `dealDamage`                                    | What it is                                                                                                                   |
| ------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `FinalATK`    | `max(0, effectiveAtk(u) − cfg.bossDef)`                       | ATK ▲% scales static ATK inside the parens; caster-ATK and Max-HP conversions add flat, outside it. Boss DEF subtracts here. |
| `rate%`       | the instance's own coefficient                                | weapon multiplier (× `normalAttackPct`, × pellet fraction) or the kit line's "% of final ATK".                               |
| `Major`       | `1 + FullBurst + Range + Crit + Core`                         | ONE additive bracket — core does not multiply crit. Full Burst 0.5, range 0.3.                                               |
| `Element`     | `1.1 + (elementDamagePct + elemAdvantageDamagePct)/100`       | `1.0` flat without elemental advantage — the whole factor is advantage-gated.                                                |
| `Charge`      | `baseCharge + baseCharge × multPct/100 + chargeDamagePct/100` | `1` for non-charge instances. Two distinct entry points (see §5).                                                            |
| `DamageUp`    | `1 + (Σ flavored and unflavored Damage-Up terms)/100`         | one additive pool; each member is flavor-gated to the instances it applies to.                                               |
| `seqMult`     | `1 + sequentialMultPct/100`                                   | its own multiplicative bucket, sequential-flavored instances only. `1` for everyone else.                                    |
| `Taken`       | `1 + (Σ damageTakenPct + distributed debuff)/100`             | boss-side; read off the enemy buff list, not off the unit.                                                                   |
| `Distributed` | `1 + distributedDamagePct/100`                                | distributed-flavored instances only.                                                                                         |

`projFactor` is **not** a factor. Projectile Explosion ▲ / Projectile Attachment ▲ compose
additively inside `DamageUp`; the engine still reports `projFactor` on the event stream as a
flavor marker (1 = unflavored), and nothing multiplies by it.

---

## 2. StatKey → factor matrix

Every member of the `StatKey` union in `src/skills/types.ts`, the factor it feeds, and how many
override files carry it. "Carriers" counts structural occurrences only — a unit whose `note` or
`caveats` merely discusses a stat is not a carrier. Sorted by factor, in product order.

<!-- BEGIN GENERATED: stat-bucket-matrix (npx tsx scripts/doc-drift.ts --update) -->

| StatKey | Factor | Composition | Applies to | Carriers | Enacted on |
| --- | --- | --- | --- | --- | --- |
| `atkOfCasterMaxHpPct` | FinalATK | flat ATK add of `% × caster's liveMaxHp` snapshotted at apply; stored as `casterAtkPct` | always | 1 | maxwell-ordinary-mechanic |
| `atkOfMaxHpPct` | FinalATK | flat ATK add of `% × liveMaxHp`, **re-read every frame** | always | 4 | 2b, cinderella, laplace-ultimate-hero, maiden-ice-rose |
| `atkPct` | FinalATK | `staticAtk × (1 + Σ/100)` — dilutes against other ATK ▲% | always | 76 | a2, ada, ade-agent-bunny, alice, anis-star, arcana-fortune-mate, ark-ranger-black, asuka, … |
| `casterAtkPct` | FinalATK | flat ATK add, resolved at apply to `caster.staticAtk × %` — does NOT dilute | always | 49 | ada, ade, ade-agent-bunny, anchor-innocent-maid, anis-sparkling-summer, anis-star, arcana, arcana-fortune-mate, … |
| `defPct` | FinalATK | ENEMY-targeted at a nonzero value: scales cfg.bossDef by (1 + Σ/100), floor 0 (the DEF ▼ channel, 2026-08-10); SELF/ally-targeted stays read by nothing — own DEF does not enter own damage | enemy-targeted buffs only; sub-0.1% at the graded surfaces (scope-lock bossDef 140), live at the web raid DEF defaults | 32 | anchor, anis, bay, crow, crown, crust, delta, diesel, … |
| `highestAllyAtkPct` | FinalATK | flat ATK add of `max(all staticAtk) × %` at apply; stored as `casterAtkPct` | always | 1 | guilty |
| `critDamagePct` | Major (crit) | additive pp into `critBonus` (base `(critDamage−100)/100`) | crit-eligible instances | 28 | admi, aria, diesel-winter-sweets, dolla, emma-tactical-upgrade, epinel, guillotine, isabel, … |
| `critRateNormalPct` | Major (crit) | additive pp into `critRate`, alongside `critRatePct` | `category === 'normal'` only | 3 | biscuit, helm, julia |
| `critRatePct` | Major (crit) | additive pp into `critRate`, clamped 0..1 | crit-eligible instances | 38 | arcana-fortune-mate, aria, dolla, epinel, eunhwa, eunhwa-tactical-upgrade, eve, grave, … |
| `coreDamagePct` | Major (core) | additive pp into `coreBonus`, together with the doll core line | core-eligible instances × `coreExposure × ACR` | 5 | asuka, cinderella-crystal-wave, naga, nayuta, quency-escape-queen |
| `elemAdvantageDamagePct` | Element | additive pp on the 1.1 base (`ELEMADV=damageup` reroutes it to DamageUp — A/B arm only) | elemental advantage only | 14 | anis-sparkling-summer, asuka, d, e-h, elegg-boom-and-shock, guillotine-winter-slayer, maiden-ice-rose, marciana-marine-study, … |
| `elementDamagePct` | Element | additive pp on the 1.1 advantage base | elemental advantage only | 0 | _none_ |
| `chargeDamageMultPct` | Charge | scales the BASE charge term (`baseCharge × %`), like the doll/collection lines | charge instances only | 2 | admi, helm |
| `chargeDamagePct` | Charge | flat percentage points added AFTER the base term | charge instances only | 14 | a2, alice, ein, emilia, eunhwa, eunhwa-tactical-upgrade, himeno, n102, … |
| `attackDamagePct` | DamageUp | additive pp — the unflavored member every instance reads | always | 50 | ade-agent-bunny, anchor-innocent-maid, anis-star, arcana, arcana-fortune-mate, asuka, asuka-wille, avistar, … |
| `burstSkillAoeDamagePct` | DamageUp | additive pp (⚑ placement per the "○○ Damage ▲" family rule, unmeasured) | burst-slot hits tagged burstDesc:'allEnemies' | 1 | trina |
| `burstSkillSingleDamagePct` | DamageUp | additive pp (⚑ placement per the "○○ Damage ▲" family rule, unmeasured) | burst-slot hits tagged burstDesc:'singleEnemy' | 1 | jackal |
| `pierceDamagePct` | DamageUp | additive pp | Pierce-tagged shots (`hasPierce` / live `gainPierce` / per-shot tag) | 10 | ade-agent-bunny, d-killer-wife, diesel, dorothy-serendipity, grave, mari, milk-blooming-bunny, mint, … |
| `projectileAttachmentPct` | DamageUp | additive pp, flavor-scoped | attachment-flavored hits only | 1 | rapi-red-hood |
| `projectileExplosionPct` | DamageUp | additive pp, flavor-scoped | explosion-flavored hits **plus RL normal attacks** (`projExplOnRlNormals`, default on) | 8 | anis-star, avistar, emma-tactical-upgrade, eunhwa-tactical-upgrade, mint, prika, rapi-red-hood, vesti-tactical-upgrade |
| `sequentialDamagePct` | DamageUp | additive pp (dilutes — distinct mechanic from `sequentialMultPct`) | sequential-flavored instances | 1 | snow-white-heavy-arms |
| `sustainedDamagePct` | DamageUp | additive pp | sustained-flavored instances | 10 | ark-ranger-black, bready, crust, diesel-winter-sweets, mana, mihara-bonding-chain, mori, raven, … |
| `trueDamagePct` | DamageUp | additive pp | true-flavored instances | 11 | ada, chisato, clay, ein, emma-tactical-upgrade, eunhwa-tactical-upgrade, flora, frima, … |
| `sequentialMultPct` | seqMult | its OWN multiplicative bucket `1 + Σ/100` — never dilutes | sequential-flavored instances | 1 | eve |
| `damageTakenPct` | Taken | additive pp; lives on the ENEMY buff list, not on a unit | requires an `enemy`-targeted buff (any other target silently drops) | 28 | arcana, asuka-wille, blanc, bready, brid-silent-track, delta-ninja-thief, diesel-winter-sweets, emma-tactical-upgrade, … |
| `distributedDamagePct` | Distributed | TWO consumers by buff target: on a unit → `Distributed = 1 + Σ/100`; on the ENEMY → joins `Taken`, and only while a Damage-Taken ▲ is live | distributed-flavored instances | 7 | anchor-innocent-maid, crust, delta-ninja-thief, elegg, mast-romantic-maid, phantom, quency-escape-queen |
| `normalAttackPct` | rate% | scales the normal-attack multiplier (with the doll SMG/SG line); bypassed while consolidating | normal attacks only | 6 | arcana-fortune-mate, asuka-wille, chime, jill, mast-romantic-maid, rumani |
| `pelletCountFlat` | rate% | flat add to the SG effective pellet count (damage only — per-trigger gauge is NOT pumped) | SG, swap-off | 3 | arcana-fortune-mate, dorothy-serendipity, leona |
| `casterMaxHpPct` | Max HP | flat Max HP grant of `caster.maxHp × %`, stored as `maxHpFlat` | feeds an ATK conversion only when self-granted (e3 rule) | 11 | ade, anis-star, avistar, cinderella, mary-bay-goddess, mast, maxwell-ordinary-mechanic, rouge, … |
| `highestAllyMaxHpPct` | Max HP | flat Max HP grant of `max(all maxHp) × %` at apply, stored as `maxHpFlat` | feeds an ATK conversion only when self-granted (e3 rule) | 2 | quency, sin |
| `maxHpPct` | Max HP | converted at build time to a `maxHpFlat` SELF-grant (Vigor cube path); no kit carrier | feeds the holder’s own ATK conversion | 0 | _none_ |
| `targetMaxHpPct` | Max HP | flat Max HP grant of the TARGET's own `maxHp × %`, stored as `maxHpFlat` | feeds an ATK conversion only when self-granted (e3 rule) | 17 | 2b, blanc, delta, diesel, folkwang, label, laplace-ultimate-hero, maiden-ice-rose, … |
| `maxAmmoFlat` | Ammo | flat rounds added on top of the percentage scaling | always | 12 | emilia, grave, himeno, mica, n102, neon, nihilister, noir, … |
| `maxAmmoPct` | Ammo | additive pp with the doll ammo line in `maxAmmo()` | always | 16 | alice-wonderland-bunny, anis-sparkling-summer, chime, diesel, drake, eve, k, liter, … |
| `reloadSpeedClamp` | Reload | OVERRIDES additive `reloadSpeedPct`; most recent active clamp wins | when a clamp buff is active | 3 | asuka-wille, exia, jill |
| `reloadSpeedPct` | Reload | SUBTRACTIVE on reload frames (`× (1 − Σ/100)`, +13-frame tail) | always | 12 | admi, anchor-innocent-maid, anis-sparkling-summer, crown, ludmilla-winter-owner, makima, mast-romantic-maid, privaty, … |
| `reloadTimeClamp` | Reload | OVERRIDES both base reload frames and `reloadSpeedPct`; fixed seconds | when a clamp buff is active | 1 | cinderella-crystal-wave |
| `attackSpeedPct` | Fire cadence | ADDS with `fireRatePct` into one `speedMult` (MG ladder + ordinary cadence) | always | 4 | dorothy-serendipity, soline, sugar, tove |
| `fireRatePct` | Fire cadence | same consumer as `attackSpeedPct` — two names, one sum | always | 0 | _none_ |
| `chargeSpeedPct` | Charge time | SUBTRACTIVE on charge frames, capped at 100%, floor 1 frame | charge weapons | 11 | a2, alice, belorta, emilia, eunhwa, liberalio, mana, maxwell, … |
| `chargeTimeClamp` | Charge time | OVERRIDES additive `chargeSpeedPct`; fixed seconds, also accepted as a `weaponSwap` field | charge weapons | 2 | anis-star, snow-white-heavy-arms |
| `hitRatePct` | Core geometry | shrinks the accuracy circle → raises ACR (`acrForHR`); no damage bucket of its own | AR/SMG/SG core rolls (`HRCORE`/UNIGEO) | 20 | anchor-innocent-maid, aria, asuka, chisato, dorothy-serendipity, drake, jill, leona, … |
| `burstGenPct` | Burst gauge | kit buffs multiply as `(1 + Σ/100)`; cube/OL-sourced burst-gen is a SEPARATE `burstGenMult` factor, so the two multiply rather than add | always | 9 | alice-wonderland-bunny, anis-star, grave, label, mana, mica-snow-buddy, neon-vision-eye, rupee-winter-shopper, … |
| `skillCooldownReductionSec` | Skill cooldown | shortens the effective period of `interval`-trigger blocks while the buff is live | interval-trigger skills on the buff holder | 1 | dorothy |
| `extraHitDamagePct` | New instance | spawns a per-pull rider hit of `value × hitsPerShot` %ATK — `category:'burst'`, crits (`RIDERCRIT`), never cores/ranges | per trigger pull | 4 | modernia, nayuta, neon-blue-ocean, neon-vision-eye |
| `partsDamagePct` | — | parsed and stored, read by NOTHING — the scope-lock boss is partless | never | 14 | a2, alice-wonderland-bunny, anis-sparkling-summer, ark-ranger-black, cinderella-crystal-wave, d, dorothy, helm, … |

<!-- END GENERATED: stat-bucket-matrix -->

Two engine-internal pseudo-stats share the same buff list but are not `StatKey`s and never appear
in an override:

| Pseudo-stat     | Factor | Composition                                                                                                                                                                |
| --------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxHpFlat`     | Max HP | the resolved landing place of every Max-HP grant. `liveMaxHp()` counts only **own-kit** grants (`casterIdx === self`) — ally-granted Max HP never feeds an ATK conversion. |
| `unlimitedAmmo` | Ammo   | presence-only flag consumed by the fire loop; carries no magnitude.                                                                                                        |

---

## 3. Sources other than kit buffs

Not every input arrives as an override buff. These are the other producers, and where each lands.

| Source                     | Produces                                                                        | Lands in                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Level / class base table   | base ATK, base Max HP                                                           | `staticAtk` (inside the ATK ▲% parens), `maxHp`                                                                                                   |
| Limit break + core enhance | grade/core multipliers on the base stat                                         | `staticAtk`                                                                                                                                       |
| Gear (`base5` / OL0 / OL5) | flat ATK, flat HP                                                               | `staticAtk`, `maxHp`                                                                                                                              |
| Relationship (bond) bonus  | flat ATK, flat HP by class × manufacturer                                       | `staticAtk`, `maxHp` — present in every recording, defaults to the manufacturer's max                                                             |
| Doll (rarity × level)      | flat ATK/HP, plus one weapon-class line                                         | `staticAtk`/`maxHp`; the weapon line reads `u.doll.*` **directly at the consumption site**, not as a buff — so `stat()` never sees it             |
| Harmony cube               | flat ATK (every cube), "damage as strong element" from level 5, one effect stat | flat ATK → `staticAtk`; the rest become permanent buffs, except `ammoRefundPer10` / `burstGenPct` / `flatAtk`, which are hoisted onto unit fields |
| Overload gear lines        | one of nine stats per line, × line count                                        | permanent buffs, same path as cube effect stats                                                                                                   |
| `cfg.bossDef`              | flat subtraction                                                                | inside `FinalATK`, before the coefficient. `0` at scope lock (measured ≈140 → ≤0.12% board shift)                                                 |
| `cfg.bossElement`          | advantage or not                                                                | gates the whole `Element` factor, and the two element StatKeys with it                                                                            |
| `cfg.coreHitRate`          | core **exposure** 0..1                                                          | multiplies the geometry-derived ACR in `Major (core)` — it is not "fraction of shots that hit core"                                               |
| `cfg.rangeBonus`           | the +0.3 term                                                                   | `Major`, band-gated per weapon class; rocket launchers and every `noRange` rider are excluded                                                     |
| `cfg.projExplOnRlNormals`  | routing switch                                                                  | lets rocket-launcher NORMAL attacks read Projectile Explosion ▲ in `DamageUp`. Default on                                                         |

Cube effect stats in play: `reloadSpeedPct`, `ammoRefundPer10`, `maxAmmoPct`, `chargeDamagePct`,
`chargeSpeedPct`, `hitRatePct`, `pierceDamagePct`, `maxHpPct`, `defPct` (four cubes carry no effect
stat at all). Overload lines: `elementDamagePct`, `atkPct`, `maxAmmoPct`, `chargeDamagePct`,
`chargeSpeedPct`, `critRatePct`, `critDamagePct`, `hitRatePct`, `defPct`.

---

## 4. Which factors each instance type takes

Read off the `dealDamage` call sites. "—" means the factor is forced to its identity value for
that instance type, not that no buff exists for it.

| Instance type                              | Crit                              | Core                              | Range               | Full Burst                                              | Charge             | Flavored Damage-Up                          |
| ------------------------------------------ | --------------------------------- | --------------------------------- | ------------------- | ------------------------------------------------------- | ------------------ | ------------------------------------------- |
| Normal attack                              | ✅                                | ✅ (except the MG's no-core ramp) | ✅                  | ✅                                                      | charge only        | true-flavor if the unit/swap is true-tagged |
| Skill or burst rider (`flatDamage`)        | ✅ default, `crit:false` opts out | only with an explicit `core:true` | —                   | by landing time; a **burst-slot cast** is always exempt | —                  | by the effect's `flavor`                    |
| Flighted rider (`flatDamage` + `delaySec`) | as authored                       | as authored                       | only with `rangeOk` | by **landing** time                                     | with `charge:true` | by the effect's `flavor`                    |
| Dot tick                                   | ✅ (`DOTCRIT`, on)                | only for a listed exception slug  | —                   | by tick time                                            | —                  | sustained/true/etc. as authored             |
| Stored-hit release                         | ✅ (`DOTCRIT` or per-entry)       | only with an entry core rate      | —                   | inside the window ⇒ yes                                 | —                  | as banked                                   |
| Per-pull rider (`extraHitDamagePct`)       | ✅ (`RIDERCRIT`)                  | —                                 | —                   | by landing time                                         | —                  | unflavored (the stat is a sum)              |
| `stackedNuke`                              | —                                 | —                                 | —                   | by cast time                                            | —                  | unflavored                                  |
| `hitRepeat`                                | inherited                         | inherited                         | inherited           | inherited                                               | inherited          | inherited                                   |

---

## 5. Composition traps

Places where the same name behaves differently depending on where the value came from. Each is
deliberate; each has bitten at least once.

1. **`chargeDamagePct` has two entry points.** A kit/cube/Overload buff adds **flat percentage
   points** after the base charge term. The doll's weapon line — also spelled `chargeDamagePct` in
   `DollBonus` — is read into the **base-scaling** slot instead, alongside `chargeDamageMultPct`.
   Same name, different arithmetic, decided by which struct the value arrived in.
2. **Burst generation has two entry points that multiply.** Cube- and Overload-sourced
   `burstGenPct` is hoisted at build time into `burstGenMult`; kit-sourced `burstGenPct` stays a
   buff. Generation is `energy × burstGenMult × (1 + Σ kit burstGenPct/100)` — the two sources
   multiply rather than pooling.
3. **`distributedDamagePct` picks its factor by buff target.** On a unit it is the `Distributed`
   bucket. On the enemy it joins `Taken`, and only while a Damage Taken ▲ is also live.
4. **Enemy-targeted _buffs_ are a three-item allowlist — enemy-targeted _effects_ are not.**
   `damageTakenPct` / `distributedDamagePct` at a positive value, plus `defPct` at any nonzero
   value (the DEF channel, 2026-08-10), are the only stats an `enemy`-targeted `buff` can
   deliver; everything else aimed at the enemy (enemy ATK ▼ — genuinely inert, no incoming
   damage is modeled) falls out of the switch and is discarded, with a non-fatal
   `validate-overrides.ts` warning at authoring time. This is the `buff` channel only. The other
   boss-facing kinds — `flatDamage`, `dot`, `targetStatus`, `hitRepeat`, `stackedNuke`,
   `storedHit`, `escalating` — never consult `block.target` at all and are unaffected. Note
   `resolveTargets({kind:'enemy'})` returns `[]`, so routing any of them through it would delete
   them — `sim.ts` carries an explicit warning against "fixing" that.

   **The DEF ▼ channel (`bossDefNow`):** an enemy `defPct` scales `cfg.bossDef` by
   `(1 + Σ/100)`, floor 0, at damage time. On the graded surfaces — which run `bossDef = 140`
   (scope-lock.ts, owner 2026-07-15; several docs stale-claim 0, a recorded drift finding) —
   the channel is live at ~0.02%-scale per carrier (`scripts/battery/boss-def.ts` bounds full
   DEF-zeroing at ≤0.12% board-wide), and live at the web app's raid defaults
   (`SR_DEFAULT_DEF = 30930` / `UR_DEFAULT_DEF = 12200`, `web/src/App.tsx`), where the battery
   sweep shows 6–17% per-unit swing at `bossDef = 20000`. `guilty` (`burst` → `defPct: -20.25`)
   was the first live carrier; every REVIEWED kit-carrying override encodes its line (batch 1:
   `exia`, `novel`, `phantom`, `viper`; batch 2: `anis`, `elegg`, `frima`, `ludmilla`,
   `marciana-marine-study`; batch 3, 2026-08-10: `signal` ×2, `himeno`, `ether`, `eunhwa` ×2,
   `mica`; `cocoa` was a prose-grep false positive — her only enemy-targeted line is ATK ▼,
   which stays dropped). The kit-text census (batch 3) found ONE unreviewed override-carrying
   unit still to encode at its own review: `belorta` (S2 −3.52/5s). `mast` stays
   unmodeled: Sea Breeze is a **flat** shave scaled off her own DEF (no caster-DEF stat exists),
   not a percentage of boss DEF. Equivalence proof:
   `scripts/tests/engine/enemy-def-debuff.test.ts` (−50% at DEF 20,000 ≡ DEF 10,000 exactly).
5. **`attackSpeedPct` and `fireRatePct` are one consumer under two names.** They are summed into a
   single cadence multiplier; nothing distinguishes them downstream.
6. **`critRateNormalPct` is not a scoped variant of `critRatePct` — it is a separate pool.** Both
   are summed for a normal attack; a skill proc or burst hit sees only the unscoped one.
7. **Max-HP grants only reach ATK when self-granted.** `casterMaxHpPct` / `targetMaxHpPct` /
   `highestAllyMaxHpPct` all resolve to `maxHpFlat`, but `liveMaxHp()` counts only grants whose
   caster is the holder, so an ally's Max HP buff raises Max HP without raising a Max-HP-scaled
   ATK conversion.

---

## 6. Findings from this audit (2026-08-06)

Recorded, not enacted — none of these changes a value.

- **The headline formula in `damage-calculation.md` §1 disagrees with its own §1f and with the
  engine.** It lists `Projectile` as a multiplicative bucket (retired on 2026-08-04 — it is now an
  additive Damage-Up term, which §1f states correctly) and omits `seqMult` entirely, though that
  factor is live with one carrier. **Fixed in this pass**; flagged here because the top-line
  formula is what most readers copy.
- **`partsDamagePct` and `defPct` are carried by more override files than several live stats and
  are read by nothing.** `partsDamagePct` is an unambiguous v1 no-op (the scope-lock boss is
  partless), and `defPct` is one wherever it is **self**-targeted (own DEF does not enter own
  damage). But the carrier counts mean _a kit line's presence in an override is not evidence it is
  modeled_. The generated matrix now makes that visible per stat instead of requiring a grep.
  **One `defPct` carrier is not self-targeted** — see the enemy-debuff finding below.
- **The enemy `defPct` drop is CLOSED — the DEF ▼ channel landed 2026-08-10** (owner-ruled;
  faithfulness pass phase 2c). Trap 4 above has the live behavior. `guilty`'s `defPct: -20.25`
  is the first live carrier; the remaining prose-recorded DEF ▼ lines encode as each unit passes
  its faithfulness review. The `validate-overrides.ts` warning now covers only genuinely-dropped
  shapes (enemy ATK ▼, zero-valued defPct, non-positive damageTakenPct/distributedDamagePct).
- **`elementDamagePct` has zero override carriers.** It exists for the cube's strong-element line
  and the Overload `elem` line only; no kit feeds it today.
- **`fireRatePct` has zero override carriers** while `attackSpeedPct` carries the same consumer.
  Either the duplicate is load-bearing for kit wording or it can be collapsed — undecided, no
  action taken.
- **One stale clause in the `FBRULE` comment.** Its third line still reads "The default `'perkit'`
  uses the calibrated per-unit `noFb` flags", four lines above the same block's "DEFAULT =
  `'timing'` (2026-07-23)", which is what actually runs. Left in place deliberately:
  `src/engine/**` is a protected path, and an audit pass does not edit one.
- **No parallel composition path exists.** Every damage source routes through `dealDamage`, and
  the one bypass (`dealRepeatDamage`) applies no factors by construction. There is no second place
  for bucket logic to drift out of sync.
