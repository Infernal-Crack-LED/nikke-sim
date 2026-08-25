# Skill-level scaling — root cause, fix, and the remaining per-unit backlog

**Status:** engine-side fix LANDED on `skill-level-scaling`. Per-unit override backlog OPEN —
needs one batched owner decision (§4).

## 1. The report

A live Shooting Range comparison put `nayuta` at skill levels 1/1/1 at **~158M simulated vs ~77M
measured** (sim/real ≈ 2.05), while other units in the same session compared far closer. Isolating
in Team Sim, only `nayuta`'s levels were varied:

| levels     | reported damage | Modeling Notes                            |
| ---------- | --------------- | ----------------------------------------- |
| `10/10/10` | 241.20M         | —                                         |
| `4/10/10`  | 224.89M         | `no level table match for 530.46`         |
| `10/4/10`  | **241.20M**     | no match for `14.4`, `16.8`, `10.5`, `42` |
| `10/10/4`  | 224.55M         | **no warning at all**                     |

The reporter's hypothesis — that these are _derived_ values with no corresponding lower-level entry
— is **correct**, and is one of two distinct bugs. It does not explain the silent burst case, which
turned out to be the larger of the two.

## 2. Root cause

`src/skills/scale.ts` scales an authored value by matching `|v|` against index 9 (max level) of
that slot's blablalink level arrays (`data/skill-levels.json`) and substituting index `L-1`. Two
independent ways that fails:

**(A) SILENT — the effect kind had no case in `scaleEffect`'s switch.** The value fell through
`default: return e` untouched, emitting **no warning**. `weaponSwap.damagePct` was the worst
instance: a burst weapon mode's per-shot multiplier is often the carrier's single largest damage
term, and **11 units carry one**. This is exactly the reporter's unexplained `10/10/4` case —
`nayuta`'s Memory Incineration swap (`275.18`) _is_ in her burst level table (`163.62 … 275.18`),
but nothing read it, so lowering her burst level only moved the `645.33` nuke and the `35.45` team
buff. Also affected: `shield.maxHpPct` (21 values / 16 units), `fillGauge.pct` (3 units — this one
can shift full-burst counts, not just damage), `stackedNuke.atkPct`, `storedHit.atkPct`.

**(B) WARNED — the authored number is DERIVED, so it matches no table entry.** Three recurring
shapes, all visible in `nayuta`'s own override note:

- a **fold** of two kit lines into one rider — `530.46 = 150 + 380.46`
- a **time-averaged** stack ramp — `14.4` from `15.2`, `16.8` from `20.27`, `10.5` from `21.05`
- a **stack-cap product** — `42 = 1.4 × 30`

All four of `nayuta`'s skill-2 values are derived, which is why `10/4/10` moved her damage by
**exactly 0.0%**.

## 3. What landed

- **`src/skills/scale.ts`** — added the missing cases: `weaponSwap.damagePct`, `fillGauge.pct`,
  `shield.maxHpPct`, `stackedNuke.atkPct`/`hpPct`, `storedHit.atkPct`.
  - `damagePct` is deliberately **not** scaled on a `sameWeapon` swap: there the gun is not
    replaced, so the value is by construction the base weapon's own `normalAttackMultiplier` — a
    weapon stat, level-invariant. No unit ships that combination today; the guard is pre-emptive.
  - `chargeMultPct` is deliberately **not** scaled: all 8 carriers author a round kit constant
    ("Full Charge Damage: 250% of damage" — 250/300/1750) and none resolves to a table entry, so
    scaling it would only produce warnings nobody can act on.
- **`src/skills/types.ts`** — new optional `levelScale: Record<field, number[]>` naming the table
  anchor(s) a derived value came from. Scaled as `authored × (Σ anchors@L) / (Σ anchors@10)` —
  exact for a fold, proportional for a time-average or stack-cap product.
- **`src/skills/validate-structural.ts`** — an anchor that is not a real max-level entry in that
  slot's table is now a **structural error**, not a silent fallback. (Verified by deliberately
  corrupting one: the validator rejects it.)
- **`src/skills/overrides/nayuta.json`** — annotated from the derivations documented verbatim in
  her own note. No magnitude changed; only their level behaviour.
- **`scripts/audit-skill-scaling.ts`** — the committed census. Reports SILENT/WARNED per unit and
  `--sim <slug>` sizes a unit's per-slot damage sensitivity. It **calls the real scaler** and
  observes what changed rather than mirroring its switch, so it cannot drift out of date.
- **`scripts/tests/skill-level-scale.test.ts`** — 13 assertions pinning both classes.

### Measured effect on `nayuta`

`npx tsx scripts/audit-skill-scaling.ts nayuta --sim` (liter/crown/nayuta/noise/red-hood, seed 1000):

| levels    | before   | after      |
| --------- | -------- | ---------- |
| `1/10/10` | -8.7%    | -15.9%     |
| `10/1/10` | **0.0%** | -9.6%      |
| `10/10/1` | -7.3%    | -24.7%     |
| `1/1/1`   | -15.3%   | **-44.3%** |

**Board blast radius is ZERO.** Every graded comp runs at 10/10/10, where `scaleBlocks` early-
returns, so `verify.sh` is green with the regression snapshot **unchanged** (no `--update`). Only
the board artifacts were rebuilt, because they hash their inputs and `nayuta.json` changed.

## 4. Derived-value annotations — progress

`levelScale` anchors are being applied per unit from each override's OWN documented derivation,
driven by the declarative table in `scripts/apply-level-scale.ts` (`--check` to dry-run). A second
primitive, **`levelConst`**, marks fields VERIFIED level-invariant so they stop warning — a
structural constant (`eve`'s Mk2 "doubles S1" as `sequentialMultPct +100`), a sentinel
(`prika`'s `burstCdr -9999` lockout), or a non-skill quantity (`red-hood`'s `burstCdr 40`, her own
burst cooldown).

Backlog: **124 → 84 values, 47 → 30 units, and 0 SILENT.** Measured level sensitivity at 1/1/1 vs 10/10/10:

| unit                       | before | after      |
| -------------------------- | ------ | ---------- |
| `mast-romantic-maid`       | —      | **-59.0%** |
| `snow-white-heavy-arms`    | -34.4% | **-53.0%** |
| `neon-vision-eye`          | -49.3% | -48.7%     |
| `eve`                      | —      | -37.3%     |
| `guillotine-winter-slayer` | —      | -34.3%     |
| `sakura-bloom-in-summer`   | —      | -30.6%     |
| `ein`                      | —      | -29.9%     |
| `mihara-bonding-chain`     | —      | -35.2%     |
| `little-mermaid`           | -5.4%  | **-22.8%** |

**Read the note, not the hint.** `audit-skill-scaling.ts` prints a `← 60 × 12` style decomposition,
but it is a brute-force search over the level table and it finds coincidences. Two caught here:
`eve`'s 720% (hint `60 × 12`; her note says "240% x3 sequential = 720%") and
`snow-white-heavy-arms`'s 1055.9 (hint `42.24 × 25` = 1056.0, off by 0.1 — the note's own 105.59%
volley shot divides it exactly ×10). Every row in the apply table carries the quote it rests on.

### Two findings from doing the work

**(a) 19 of the 47 backlog units are TREASURE units, and they are a different bug — blocked on
data.** `data/skill-levels.json` holds the **base (untreasured)** kit arrays, while those overrides
model the treasure kit. `drake` is the clean demonstration: her table has `11.85` / `1254` /
`98.55`, her override authors `20.09` / `3009.6` / `201.6`. The boosts are **non-uniform**
(×1.70, ×2.40, and `maxAmmoPct 72.18` not boosted at all), so no proportional `levelScale` recovers
them, and ×2.40 is far too large to be extrapolated skill levels. Blablalink roledata carries **no
favorite-item fields at all** (checked `drake`'s live `roledata` — no `favor`/`treasure`/`item` key),
so the per-level treasure arrays are simply not in this source. **Annotating these with a base-kit
anchor would be a guess about how favorite items scale — deliberately not done.** Affected:
`diesel`, `drake`, `exia`, `flora`, `frima`, `helm`, `julia`, `laplace`, `milk`, `miranda`,
`moran`, `phantom`, `poli`, `privaty`, `rosanna`, `sugar`, `tove`, `viper`, `zwei`. Needs a source
for treasure per-level values (or an owner ruling on how they scale) before any of it is actionable.

**(b) A value's anchor can live in a DIFFERENT slot's table.** `ein`'s skill1 `363.24` is
`4 × 90.81`, but `90.81` is in her **skill2** table — skill1's only varying entry is `70.12`, which
does not divide it. `levelScale` cannot express a cross-slot anchor, and scaling it off skill1's
level would be wrong anyway if the magnitude really comes from a skill2 line. Left deliberately
WARNING rather than annotated; it may indicate the block is filed under the wrong slot. The
structural validator caught this — the anchor did not resolve — which is the guard working.

### Cross-family code review (kimi-code/k3, 2026-08-25) — findings fixed

`scratchpad/gates/2026-08-25-skill-level-scaling/` holds the packet + verdict (FIX-BEFORE-MERGE,
1 BLOCKER / 3 FIX / 3 NOTE). All seven were confirmed and fixed:

- **BLOCKER — `perResource.mult` was still SILENT, and the census could not see it.** A
  `perResource` buff/DoT ignores its static value at runtime and recomputes the magnitude as
  `resources[name] × mult`, so `mult` is the real level-scaled number. Eight carriers'
  primary magnitudes were pinned at max level with no warning
  (`mihara-bonding-chain` 25.08 — her Ensnaring DoT driver, `mana` 70.4, `phantom` 25.75/12.86,
  `marciana-marine-study` 32.73, `e-h` 7.5, `guillotine` 0.96, `soda-twinkling-bunny` 1.32). The
  census was structurally blind to it (nested under `perResource`, and `mult` sat in `TIME_FIELDS`),
  so its own completeness summary was wrong — **and the level-sensitivity figure this doc published
  for `mihara-bonding-chain` was materially understated: -23.4% → -35.2%.**
- **FIX — `findArr` took the first max-level match, constant or not.** A slot's table holds
  constant arrays (a "for 10 sec" duration) alongside real magnitudes sharing the same max. It now
  prefers a VARYING array. Live cases the reviewer confirmed against kit text: `crust`'s burst
  "Sustained Damage ▲10%" and `prika`'s burst "Charge Damage ▲25%" (×2). This closed the last
  3 SILENT values — the census now reports **0 SILENT**.
- **FIX — `scripts/apply-level-scale.ts` documented text insertion but still re-serialized.** The
  landed overrides had been normalized out-of-band, so the committed tool did not do what its own
  header and commit message claimed. The byte-span insertion is now actually implemented in it.
- **FIX — `levelScale: null` crashed the validator** (`typeof null === 'object'` reached
  `Object.entries(null)`), taking the whole gate down with a stack trace. Guarded + pinned.
- **NOTE ×3 — fixed:** the type union under-declared the annotations (they are now on every kind
  `scaleEffect` reads); the validator did not check that an annotated field is on a scaling path or
  that `levelConst` names a real field (both now error); the `chargeMultPct` comment's counts were
  wrong (~14 instances / ~10 units, including one `flatDamage` carrier — the substance held, and
  the reviewer independently re-verified that none resolves to a table entry).

## 5. OPEN — what is left

Backlog **124 → 83 values**, 47 → 30 units. Two QUEUE items carry the remainder:

- **70 values / 19 units — treasure, blocked on data.** See §4(a). Needs a source for treasure
  per-level values, or an owner ruling on how favorite items scale.
- **13 values / 11 units — cross-slot or unavailable.** `levelScale` resolves anchors within ONE
  slot's table; six of these have their anchor in a different slot (`ein`, `eve`,
  `neon-vision-eye` ×2, `emma-tactical-upgrade`, `red-hood`), which may mean those blocks are filed
  under the wrong slot. The other seven are datamined or kit-literal values that appear in no level
  array at all (`ark-ranger-black` ×2, `cinderella`, `cinderella-crystal-wave`, `sin`, `soda`,
  `soda-twinkling-bunny`).

Also unchanged from the first pass: 8 overrides have no level data at all
(`anne-miracle-fairy`, `laplace-ultimate-hero`, `maxwell-ordinary-mechanic`, `queen`,
`rei-ayanami-tentative-name`, `yukiko`, + the two `noop-*` controls), and 3 slots have ambiguous
level tables where two varying arrays share a max (`mari` skill2, `prika` skill1, `snow-crane`
skill1) so `.find()` picks arbitrarily.
