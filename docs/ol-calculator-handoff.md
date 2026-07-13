# OL line support + best-OL calculator — backend handoff

Status: **frontend built, feature-flagged off.** Flip `OL_UI_ENABLED` in
`web/src/App.tsx` to `true` to expose it. This doc covers what the frontend does
today, what already works in the engine, and the one backend piece still to
build (the damage-ranked "best 4 lines" recommendation).

## What already works (no backend change needed)

OL lines are a solved path in the engine:

- `UnitOptions.lines: LineSelection[]` (`{ type, count, value }`) →
  `prepareUnit` looks `type` up in `data/ol-lines.json`, adds `value * count` to
  the mapped stat bucket, and records a loadout string. See `src/prepare.ts`.
- The web app now imports `data/ol-lines.json` and passes it as
  `deps.olLines` (previously it passed an empty `{ lines: {} }`), and converts
  each card's manual OL entries into `LineSelection[]` via `buildOlLines()`.
- Verified end-to-end: adding `{type:'atk',value:44}` to a unit raised its
  damage 177M → 224M; `elem` correctly stays inert without elemental advantage.

So **manual OL line entry is fully functional** once the flag is on. No backend
work required for it.

### Manual OL entry UI (per card, behind the flag)
- `ELE` textbox + `ATK` textbox — the total % for the assumed 4×ATK / 4×ELE core
  (stored as `slot.olElem` / `slot.olAtk`; passed as a single `count:1` line each
  with `value` = the entered total).
- `+ OL line` appends rows; each row = stat dropdown (`OL_LINE_TYPES`) + `%`
  textbox + remove. Stored in `slot.olExtra: {type,value}[]`.

## Reference data

- `data/ol-lines.json` — line key → `{ name, stat, min (tier1), max (tier15) }`.
- `data/ol-tiers.json` — **new**, generated from `docs/ol-lines.csv`: per-tier
  (1–15) value for every substat, keyed the same as `ol-lines.json`
  (`elem, atk, ammo, chargedmg, chargespd, critrate, critdmg, hitrate, def`).
  Tier 11 is the assumed default.

## Best-OL calculator

### Frontend (done, behind the flag)
A "best-OL calculator" section with a `tier` input (default 11) that, for each
filled slot, reports the **pure-math breakpoints** — these need no sim and are
computed client-side in `web/src/App.tsx`:

- **Max-ammo breakpoints** (`ammoLineRows`, `ammoBreakpoints`): NIKKE max ammo =
  `floor(base * (1 + totalAmmoPct/100))`. Reports ammo reached with 1–4 ammo
  lines, and the minimum % (and line count at the chosen tier) for each next
  integer. Matches the known case: a 6-ammo unit needs ≥66.7% to reach 10 ammo.
- **Charge-speed breakpoints** for RL/SR only (`chargeSpeedRows`,
  `CHARGE_SPEED_BREAKPOINTS = [5,8,11,15,18,21]`): lines needed at the chosen
  tier to clear each target, or ">4 lines" if unreachable.
- **Weapon-aware candidate list** for the free 4 lines:
  `Max Ammo, Crit Rate, Crit DMG` always; `Charge Speed, Charge DMG` only for
  RL/SR. `Hit Rate` and `DEF` are excluded.

### Backend to build: damage-ranked "best 4 lines"
The frontend intentionally does **not** decide which 4 free lines are best —
that requires the sim. Implement a calculator that, per unit:

1. **Fixes the 8 core lines**: 4× ATK + 4× ELE at the chosen tier
   (`olTierValues(tier).atk` and `.elem`, `count:4` each). These are always
   assumed present.
2. **Optimizes the remaining 4 lines** among the weapon-aware candidate pool
   above (exclude hit/def; exclude charge speed/damage for non-RL/SR). This is
   an allocation of 4 lines across the candidate stats (a stat may take multiple
   lines), maximizing the unit's `totalDamage`.
   - Reuse the existing greedy approach in `src/bestol.ts` (`bestOl()` already
     does marginal-gain line search via repeated `runSim`), but constrain the
     candidate set and the "8 fixed + 4 free" framing, and use **tier values**
     from `data/ol-tiers.json` instead of only the `max` roll.
   - Greedy is a good default; a full 4-line brute force over ~3–5 candidate
     stats is also cheap (small combinatorial space) if exactness is wanted.
3. **Respects breakpoints as constraints/annotations**, not just raw damage:
   - For RL/SR, evaluate at the charge-speed breakpoints `5/8/11/15/18/21%`
     (charge speed is a threshold stat — value between breakpoints is wasted), so
     the optimizer should snap charge-speed allocations to whichever breakpoint
     the lines actually reach and compare damage there.
   - For max ammo, surface the ammo breakpoint a given allocation lands on (e.g.
     "1 ammo line → 10 ammo") so the user can choose the minimum roll that hits a
     useful integer rather than over-investing.
4. **Allow tier override**: the calc takes a `tier` (default 11); the user can
   recalc at any tier 1–15 using `data/ol-tiers.json`. The frontend already has
   the tier input wired (`olTier` state).

### Suggested surface
- Add to `src/bestol.ts` (or a sibling) a function like
  `bestOlAtTier(chars, mult, cfg, prepared, unitIdx, { tier, candidates })` that
  returns the recommended 4-line allocation + resulting damage + the breakpoints
  each allocation lands on.
- Expose it to the web app the same way the sim is (client-side import), and
  replace the "pending" note in the calculator section with the result. A CLI
  flag (extend the existing `--best-ol`) can share the same function.

## Related (separate) handoff: high-res portraits

Character images come from `nikke-synergy.com` (`data/characters.json` →
`imageUrl`, e.g. `.../images/0087.jpg`), populated by **bakery-bot's**
`sync:nikke` into `nikke_characters.image_url`. blablalink's `roledata` and
`nikke_list_en_v2.json` do **not** carry portrait URLs — only asset key names
(`icn_skill_*`, costume ids, `name_code`, `resource_id`). Fetching high-res
portraits from blablalink would require reverse-engineering its image-CDN path
convention for character art (analogous to the stat-path obfuscation already
solved in `scripts/blablalink-stats.mjs` / `apps/bot/src/lib/nikke/blablalink.ts`).
That change belongs in bakery-bot's sync, not here.
