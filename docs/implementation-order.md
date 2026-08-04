# Implementation Order — Missing Units by Bossing Tier

> Generated 2026-07-20 from `data/bossing-tiers.json` (2026-07-19) vs `data/enikk-supported.json` (2026-07-15).
> 117 units in bossing-tiers are not in the enikk-supported roster. Sorted by tier (SSS → F), batched in groups of 10.

## Summary

| Tier      | Missing | Supported | Total in tier |
| --------- | ------- | --------- | ------------- |
| SSS       | 0       | 3         | 3             |
| SS        | 0       | 10        | 10            |
| S         | 1       | 12        | 13            |
| A         | 6       | 14        | 20            |
| B         | 20      | 6         | 26            |
| C         | 18      | 1         | 19            |
| D         | 25      | 0         | 25            |
| E         | 19      | 0         | 19            |
| F         | 27      | 1         | 28            |
| ?         | 1       | 0         | 1             |
| **Total** | **117** | **47**    | **164**       |

---

## Batch 5 — C / D (10 units)

`centi`

`pepper`  
`power`  
`quency`  
`rapunzel-pure-grace`
`rumani`  
`rupee`  
`sakura-suzuhara`  
`snow-crane`  
`sora`  
`trony`

## Batch 8 — E (10 units)

| #   | Slug              | Tier |
| --- | ----------------- | ---- |
| 72  | `anis`            | E    |
| 73  | `crow`            | E    |
| 74  | `jackal`          | E    |
| 75  | `lily`            | E    |
| 76  | `ludmilla`        | E    |
| 77  | `makima`          | E    |
| 78  | `misato`          | E    |
| 79  | `mori`            | E    |
| 80  | `neon`            | E    |
| 81  | `neon-blue-ocean` | E    |

## Batch 9 — E / F (10 units)

| #   | Slug                   | Tier |
| --- | ---------------------- | ---- |
| 82  | `nero`                 | E    |
| 83  | `nihilister`           | E    |
| 84  | `quiry`                | E    |
| 85  | `ram`                  | E    |
| 86  | `rupee-winter-shopper` | E    |
| 87  | `sin`                  | E    |
| 88  | `soda`                 | E    |
| 89  | `vesti`                | E    |
| 90  | `yan`                  | E    |
| 91  | `anchor`               | F    |

## Batch 10 — F (10 units)

| #   | Slug      | Tier |
| --- | --------- | ---- |
| 92  | `belorta` | F    |
| 93  | `brid`    | F    |
| 94  | `delta`   | F    |
| 95  | `emma`    | F    |
| 96  | `ether`   | F    |
| 97  | `eunhwa`  | F    |
| 98  | `harran`  | F    |
| 99  | `himeno`  | F    |

## Batch 11 — F (10 units)

| #   | Slug     | Tier |
| --- | -------- | ---- |
| 103 | `kilo`   | F    |
| 104 | `mary`   | F    |
| 105 | `mica`   | F    |
| 106 | `mihara` | F    |
| 107 | `pascal` | F    |
| 111 | `rapi`   | F    |

## Batch 12 — F (6 units)

| #   | Slug      | Tier |
| --- | --------- | ---- |
| 112 | `rosanna` | F    |
| 113 | `signal`  | F    |
| 117 | `yuni`    | F    |

---

## Notes

- `水着マルチャーナ` in bossing-tiers is the JP name for `marciana-marine-study` — same unit, counted once under the English slug.
- `marciana-marine-study` has no prydwen bossing rating yet (tier `?`) — bumped to batch 1 by priority.
- `rei-ayanami` (A) already has an override at `src/skills/overrides/rei-ayanami.json` (untracked) — may only need roster inclusion, not a full kit build.
- All SSS/SS units are already supported — no gaps at the top of the meta.
