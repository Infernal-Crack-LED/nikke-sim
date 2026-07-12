# Handoff: Nikke base stats are now in the DB

**For:** the agent building the DPS sim.
**TL;DR:** Every Nikke's base ATK/HP/DEF + dupe/level scaling now lives in **Bakery Bot's Postgres** (the same DB the sim already reads via `DATABASE_PUBLIC_URL`). You no longer need user-supplied ATK, and you should **not** call blablalink from the sim — read the DB. ATK reconstructs to the exact in-game value; HP/DEF are within ~0.5% (see caveats).

---

## Status

- Code: PR **[Infernal-Crack-LED/bakery-bot#4](https://github.com/Infernal-Crack-LED/bakery-bot/pull/4)** (branch `sim-db-updates`), open, not yet merged.
- **Data is already live in the DB** — the migration was applied and the sync run against the DB, so all **191** characters have base stats right now, regardless of when the PR merges. You can build against it immediately.

## Where the data lives

### 1. `nikke_characters.base_stats` — jsonb, one per Nikke

```ts
interface BaseStats {
  resourceId: number;   // blablalink resource_id (provenance / re-fetch key)
  atk: number;          // level-1 base ATK
  hp: number;           // level-1 base HP
  def: number;          // level-1 base DEF
  critRate: number;     // percent, e.g. 15
  critDamage: number;   // percent, e.g. 150  (this is the multiplier %, i.e. crit hit = ×1.50)
  maxLevel: number;     // highest synchro level in the curve (currently 1200)
  grade: { ratio: number; atk: number; hp: number; def: number };  // per Limit Break
  core:  { atk: number; hp: number; def: number };                 // per Core level
}
```

`base_stats` is `null` only if a character couldn't be matched to blablalink (currently 0 such — all 191 populated).

### 2. `bot_meta` row `nikke_level_multiplier` — the shared synchro-level curve

`value` is JSON (stored as text):

```ts
interface NikkeLevelMultiplier {
  attack: number[];  // ratio to level 1, index = level-1  (attack[0] === 1)
  hp: number[];
  def: number[];
}
```

The synchro-level growth curve is (nearly) identical for every Nikke, so it's stored once here rather than per-character. Fetch it once at sim startup.

## Reconstructing a stat

For synchro level `L` (1-indexed, so level 1 → index 0), `g` Limit Breaks (0–3), `c` Core levels (0–7):

```ts
function stat(bs: BaseStats, mult: NikkeLevelMultiplier,
              type: 'atk' | 'hp' | 'def', L: number, g: number, c: number): number {
  const curve = type === 'atk' ? mult.attack : type === 'hp' ? mult.hp : mult.def;
  const base = Math.floor(bs[type] * curve[L - 1] * (1 + g * bs.grade.ratio / 1e4) + g * bs.grade[type]);
  return Math.round(base * (1 + c * bs.core[type] / 1e4));
}
```

This is a direct port of ShiftyPad's own formula. `grade.ratio` is basis points (200 → +2% per Limit Break); `core` increments are basis points too (200 → +2% per Core level).

## Dupe slider → (grade, core)

blablalink's "dupe" slider is really two independent knobs. A copy count maps to them like this (standard NIKKE progression):

- copies 0–3 raise **grade** (Limit Break rank): 3 copies = MLB (grade 3).
- copies 4–10 raise **core** (Core enhancement): grade stays 3, core goes 0→7.

So `grade = min(copies, 3)` and `core = clamp(copies - 3, 0, 7)`. Fully-invested from pulls = **grade 3, core 7**. (Core can exceed 7 via spare bodies/mold; the same `core` term applies, just with a larger `c`.)

## Accuracy caveats — read this

- **ATK is exact.** Reconstruction matches the in-game value bit-for-bit in practice (ATK bases are large, so the shared-curve rounding is nil). This is the stat the DPS sim cares about — trust it.
- **HP is within ~1–2 points.** Negligible.
- **DEF can drift up to ~0.5%** (e.g. Emma Lv200: formula gives 2952 vs the game's 2940). DEF bases are small integers, so the shared curve rounds slightly differently per character. Irrelevant for v1 (enemy DEF = 0, ally DEF doesn't feed the damage formula), but don't treat reconstructed DEF as authoritative.
  - If you ever need exact DEF/HP at a level: re-fetch that character's own `character_level_defence_list` / `character_level_hp_list` from blablalink (see provenance below). The per-character arrays are the ground truth; we chose not to store all 1200×3 per character to keep the column small.
- **Gear, cube, favorite item, doll, and Overload rolls are NOT included.** `base_stats` is the intrinsic character stat only. Those bonuses stack on top in-game (see `gear_doll.md`).
- `critRate` / `critDamage` are the character's innate values before any buffs.

## Worked example — Emma (`resource_id` 90), for your test fixtures

Exact in-game values (ground truth from blablalink):

| Config | ATK | HP | DEF |
| --- | --- | --- | --- |
| Lv1, LB0, Core0 | 500 | 15,000 | 84 |
| Lv200, LB0, Core0 | 17,576 | 527,303 | 2,940 |
| Lv200, LB3, Core7 | 21,307 | 647,453 | 3,894 |
| Lv1000, LB3, Core7 | 1,012,491 | 30,383,034 | 169,736 |

What the DB-reconstruction formula above yields (note ATK identical, DEF slightly high):

| Config | ATK | HP | DEF |
| --- | --- | --- | --- |
| Lv200, LB0, Core0 | 17,576 ✓ | 527,302 | 2,952 |
| Lv200, LB3, Core7 | 21,307 ✓ | 647,453 ✓ | 3,909 |

Use the **ATK** column as a hard assertion in your tests; allow tolerance on DEF.

## Provenance / re-fetch

- Standalone explorer (this repo): `scripts/blablalink-stats.mjs` — `node scripts/blablalink-stats.mjs stats 90` prints a character's table; `list` dumps `resource_id → name` for all 194 roster entries; `raw <id>` dumps the full roledata (also contains skill/burst/shot data — fire rate, reload, ammo, crit, multipliers — if the sim wants it later).
- Canonical fetch/parse (bakery-bot): `apps/bot/src/lib/nikke/blablalink.ts`. The sync only fetches a character once (rows missing `base_stats`), so steady-state = zero blablalink traffic.
- Two collab units are name-ambiguous on blablalink and are pinned by id in `apps/bot/src/lib/nikke/overrides.ts` (`BLABLALINK_RESOURCE_OVERRIDES`): Rei Ayanami → 831, Sakura Suzuhara → 836. If a future unit lands `base_stats = null`, add an entry there.

## Matching a sim Nikke to its row

`nikke_characters.id` is the canonical slug (e.g. `anis-star`, `emma`); `name` is the English display name; `aliases` holds nicknames. Keep using whatever lookup the sim already uses against this table — `base_stats` is just a new column on the same rows.
