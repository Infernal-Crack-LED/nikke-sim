---
name: sim-battery
description: Full-roster, sim-only test batteries + blast-radius diffing (scripts/battery/). Use to run the whole roster through a sim config change and diff the per-unit damage impact before/after.
---

# Sim battery — full-roster, sim-only test batteries

## What this is for

Sim-only accuracy instrumentation: run the WHOLE supported roster (every
override-backed unit) through realistic teams under a controlled condition
matrix, as seeded Monte Carlo. No real-fight data is involved — the batteries
measure the sim against itself across conditions, which gives three things:

1. **Blast-radius diffing** — before/after an engine or override change, dump
   both batteries to JSON and diff per-unit cells. The 21 real lab comps cover
   ~40 units in fixed conditions; the batteries cover all 67 in 3-6 conditions
   each, so unintended interactions surface even when the lab comps are quiet.
2. **Sensitivity fingerprints** — per-unit core-exposure sensitivity
   (`core c1/c0`) and elemental-advantage lift (`adv/neut`). Units whose
   fingerprint deviates from their bucket math expectation are model-bug
   candidates (e.g. a charge unit whose advantage lift isn't ~1.10x the
   Element-bucket prediction).
3. **Recording targets** — a battery row with high variance (±sd%), a
   knife-edge FB distribution, or a rotation-outlier warning is a cheap,
   pre-scoped candidate for the owner's next recording batch.

## The scripts (scripts/battery/)

All share `lib.ts` (scope-lock config: sync 400, 10/10/10, no cube, OL0,
treasure, partless boss, 180s; seeds 1000+i matching scripts/experiment.ts).

- `auto.ts` — deterministic generated teams partitioning the whole roster
  (element-grouped B3 cores, logical pairs, B1/B2 round-robin only on
  scarcity), each through the 2x3 matrix **{forced neutral, elemental
  advantage} x {core 0/50/100}**. The advantage boss is picked per team: a
  neutral probe finds the first bursting B3 in slot order and the boss is set
  so that unit is advantaged.
- `neutral.ts`, `water-weak.ts`, `elec-weak.ts`, `fire-weak.ts`,
  `iron-weak.ts`, `wind-weak.ts` — realistic batteries: hardcoded **anchor
  teams that real top-300 players ran** (enikk.app solo raids 37/36/35/34/31,
  fetched 2026-07-14, popularity counts in each file) + a deterministic roster
  fill completing all 67 units, at the raid's boss element x core 0/50/100.
  `neutral.ts` anchors are the cross-raid most popular teams, boss element
  null.

```sh
npx tsx scripts/battery/auto.ts                 # ~1-2 min at default SEEDS=15
npx tsx scripts/battery/water-weak.ts
SEEDS=25 ONLY=enikk NOFILL=1 npx tsx scripts/battery/elec-weak.ts
OUT=/tmp/before.json npx tsx scripts/battery/auto.ts   # JSON dump for diffing
```

Env knobs: `SEEDS` (default 15) · `ONLY=<team-name substring>` ·
`NOFILL=1` (anchor teams only) · `OUT=<path>` (JSON dump).

## Harness rules the lib enforces (don't re-derive)

- **Unit lock**: no repeated units within a battery except forced B1/B2
  scarcity reuse (11 B1s / 16 B2s over 67 units); repeats are listed in the
  battery header — check it after roster growth.
- **Team viability** (owner ruling): at least B1 + B2 + 2x B3; violations get
  a ⚠ rotation-outlier warning, keep them out of rotation conclusions.
- **Kit wiring** is automatic: mint+prika duet modes when co-fielded; emma:TU
  forced 'solo' without eunhwa:TU; eunhwa:TU alone is flagged (duo-only kit);
  red-hood Λ is PINNED to B3 (owner ruling 2026-07-14: her solo-B1 shape is a
  real but rotation-poisoning outlier — her 40s burst cooldown binds the
  cycle; enikk anchors that field her as the only B1 are excluded).
- Slot order: middle slot = default camera focus. Enikk anchors keep the
  recorded player order; fill teams put a B3 in the middle.

## Blast-radius diff recipe

```sh
OUT=/tmp/before.json npx tsx scripts/battery/auto.ts
# ...apply the engine/override change...
OUT=/tmp/after.json npx tsx scripts/battery/auto.ts
node -e "
const a=require('/tmp/before.json'), b=require('/tmp/after.json');
for (const [t, av] of Object.entries(a.batteries)) {
  const bv=b.batteries[t]; if(!bv) continue;
  for (const [cell, cs] of Object.entries(av.cells))
    for (const [slug, u] of Object.entries(cs.units)) {
      const nu=bv.cells[cell]?.units[slug]; if(!nu) continue;
      const d=nu.mean/u.mean-1;
      if (Math.abs(d)>0.005) console.log(t, cell, slug, (100*d).toFixed(2)+'%');
    }
}"
```

Interpret against intent: a landing predicted to move ONE unit that shifts
twenty battery cells has leaked (compare the SWHA whileSwapped +21% leak,
caught by exactly this kind of drift check).

## Refreshing the enikk anchors (next solo raid)

enikk.app is a Next.js app over GraphQL at `https://enikk.app/api/webapp`:

```sh
curl -s 'https://enikk.app/api/webapp' -H 'content-type: application/json' --data \
 '{"query":"query SRRankings($raid: Float!, $all: Boolean) { SRRankings(raid: $raid, all: $all){ rank damage teams } }","variables":{"raid":38,"all":false}}'
```

Each of the top-300 rows carries 5 teams (`characters` = display names in slot
order, `count` = players fielding that exact comp). Map names to slugs via
`data/characters.json` (strip " (Treasure)"), filter to override-backed teams,
pick greedily by popularity without unit repeats, and hardcode into the
matching battery script with the raid number + popularity in the comment.
Raid element: `soloraids { raid_number monster_obj }` → `weak_element_id`.

## Verify

```sh
bash scripts/verify.sh
```
