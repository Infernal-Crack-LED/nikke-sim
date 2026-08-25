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

## 4. OPEN — the per-unit backlog (needs one batched owner decision)

`npx tsx scripts/audit-skill-scaling.ts` now reports **3 SILENT + 124 WARNED across 48 units**.
Every remaining item is a _derived authored value_ that needs a per-unit `levelScale` annotation —
i.e. `src/skills/overrides/**` edits, a protected path, and per-unit work that should not be swept
blind. Sized worst-first with `--sim` (damage at 1/1/1 vs 10/10/10; a number near 0% means skill
levels are effectively inert for that unit):

| unit                    | 1/1/1     | note                                                                                                                                                                                                                          |
| ----------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drake`                 | **+0.7%** | 6 derived values covering essentially the whole kit — levels are inert, and burst@1 reads _higher_ (+3.6%, a rotation shift)                                                                                                  |
| `little-mermaid`        | **-5.4%** | `253.44 = 63.36 × 4`, `850 = 85 × 10`                                                                                                                                                                                         |
| `snow-white-heavy-arms` | -34.4%    | `527.95 = 105.59 × 5`, `1055.9 = 42.24 × 25`; **plus** a `weaponSwap.damagePct` of `69.04` that equals the generic AR `normalAttackMultiplier` — possibly a missing `sameWeapon: true`, worth checking rather than annotating |
| `neon-vision-eye`       | -49.3%    | `330 = 5 × 66`, `500 = 5 × 100`                                                                                                                                                                                               |
| `maiden-ice-rose`       | -36.3%    | `stackedNuke.hpPct 137.28`                                                                                                                                                                                                    |

Highest-count units overall: `julia` (7), `sugar` (7), `drake` (6), `privaty` (6), `viper` (5).

Three residual SILENT values (`crust` burst `10`, `prika` burst `25` ×2) are `buff.value`s on
`escalating` steps — worth a look but small.

Also noted, not fixed: **8 overrides have no level data at all**
(`anne-miracle-fairy`, `laplace-ultimate-hero`, `maxwell-ordinary-mechanic`, `queen`,
`rei-ayanami-tentative-name`, `yukiko`, plus the two `noop-*` controls). Those units keep max-level
values at every skill level and already warn wholesale. And **3 ambiguous level tables** exist
where two varying arrays share a max but have different curves (`mari` skill2 `30.78`, `prika`
skill1 `20`, `snow-crane` skill1 `10`) — `.find()` picks the first arbitrarily.

**Recommended decision:** annotate the units by measured impact rather than by warning count —
`drake` and `little-mermaid` first, since their levels are near-inert today. Each unit is small
work (read the override's own note for the derivation, add the anchors, validator confirms) but
needs the note read per unit, so it is not a mechanical sweep.
