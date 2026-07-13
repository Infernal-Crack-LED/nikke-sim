# Tab system + team / roster / character calculators — backend handoff

Status: **frontend scaffolds built, feature-flagged off.** Flip
`CALC_TABS_ENABLED` in `web/src/App.tsx` to `true` to expose the tab bar and the
three calculator tabs. All search/optimization is **not** implemented — this doc
specs it. The existing single-team simulator (`Sim` tab) is unchanged.

## What the frontend provides today

- **Tab bar**: `Sim | Team Calc | Roster Calc | Character Calc` (`CALC_TABS`).
- **Shared teamwide options** render on every tab: boss weakness, boss DEF, core
  visibility, synchro level, and the "Apply to all" loadout row (cube / cube
  level / gear / doll / stars / cores / skills). These are the **assumptions**
  the calculators must run under.
- **Team Calc / Roster Calc**: a "Blocked characters" panel (`CharSearch` +
  removable chips, shared `blocked: string[]` state) so the user can exclude
  nikkes they don't own, plus a disabled "Calculate…" button and a pending note.
- **Character Calc**: a single-nikke picker (`calcChar` state) + disabled
  "Generate team & analyze" button.
- Each tab shows a `pendingNote` pointing here. The buttons are `disabled` until
  the backend is wired.

State already in `App`: `tab`, `blocked`, `calcChar`. Assumptions come from the
existing `weakness / bossDef / core / level / slots[0-style loadout]` state.

## Engine building blocks to reuse (no new sim needed)

- `runSim(chars, mult, cfg, prepared)` → `SimResult` (has `teamDamage`, per-unit
  `share`, `fullBurstUptime`, etc.). This is the scoring function.
- `prepareTeam(chars, unitOpts, deps)` → `PreparedUnit[]` — apply the loadout
  assumptions (cube/OL/doll/stars/core/skills) uniformly to candidates.
- `SimConfig` — build from the teamwide options exactly as the Sim tab's `useMemo`
  does (`bossElement = WEAKNESS_TO_BOSS[weakness]`, `bossDef`, `level`,
  `coreHitRate`, etc.).
- Team legality (already encoded in the Sim tab's `compOk`): **1× Burst I, 1×
  Burst II, 2× Burst III, + 1 flex**; a Λ unit counts as any stage. Slot order
  matters (leftmost eligible bursts first), so the optimizer must also decide
  ordering, or use a fixed canonical order per composition.

## Team Calc — best team for the chosen weakness

Input: boss weakness (→ element advantage), loadout assumptions, `blocked[]`.
Output: the single highest-`teamDamage` legal 5-nikke team.

1. Candidate pool = all characters minus `blocked`.
2. Enumerate legal compositions (burst-slot rules above). The full space is huge
   (~190 choose 5 with ordering), so **do not brute-force**. Suggested approach:
   - Pre-score each unit solo (or in a fixed generic support shell) to prune to a
     top-N pool per burst slot (e.g. top 30 B3s, top 15 B1/B2s, top flex).
   - Beam search / greedy seed: start from the strongest advantaged DPS unit,
     then fill remaining burst slots by marginal `teamDamage` gain, re-simming at
     each add. This mirrors the greedy logic already in `src/bestol.ts`.
   - Optionally refine the top few candidate teams with a local swap search
     (swap one member for a pool alternative, keep if better).
3. Score = `runSim(...).teamDamage` under the assumptions. Return the team +
   per-unit shares + uptime so the UI can show a breakdown like the Sim tab.

Perf: cache `prepareUnit` per (slug, assumptions) since assumptions are uniform;
the sim is the cost. Budget the search (top-N pruning + beam width) to stay
interactive (<~1–2s) since it runs client-side.

## Roster Calc — top 5 teams, no character reuse

Same scoring as Team Calc, but produce **5 teams that share no characters**.
- Greedy-sequential is the pragmatic default: find best team → remove its 5
  members from the pool → find best of the rest → repeat 5×. Fast, and matches
  how players think ("my 5 raid teams").
- Note this is not guaranteed globally optimal (a stronger team-1 can weaken the
  set); if desired, follow with a swap-refinement across the 5 teams. Document
  whichever guarantee you ship in the UI.
- Respects `blocked[]` the same way.

## Character Calc — single-nikke workhorse

Input: one `calcChar`, loadout assumptions, weakness. This is the tab for
best-OL calcs and testing new characters.
1. **Generate a support team** around the chosen unit: fix `calcChar` in its
   burst slot, then fill the other 4 slots with the best generic supports for it
   (reuse the Team Calc search with `calcChar` pinned). Blocked list can apply
   here too if wanted.
2. **Analyze the unit**: report its damage, share, and breakdown in that team.
3. **Best-OL**: run the best-OL calculator from `docs/ol-calculator-handoff.md`
   for `calcChar` inside the generated team (this is why Character Calc is the
   natural home for it) — the OL frontend + breakpoint math already exist behind
   `OL_UI_ENABLED`.
4. **New-character testing**: since the sim reads `data/characters.json`, a newly
   added character flows in automatically; this tab lets you drop them into a
   generated team and read their numbers without hand-building a team.

## Integration surface

- Put the search in a new module (e.g. `src/teamcalc.ts`) exporting
  `bestTeam(pool, deps, cfg, opts)`, `topTeams(pool, deps, cfg, n, opts)`, and a
  `characterAnalysis(slug, ...)` that composes `bestTeam` + best-OL. Keep it
  filesystem-free (takes data objects) so the web app imports it client-side like
  `runSim` — see how `web/src/App.tsx` already imports `prepareTeam`/`runSim`.
- Replace each tab's `disabled` button + `pendingNote` with a call into these
  functions and a results panel (reuse the Sim tab's results table markup).
- A CLI entry point can share the same functions for offline batch runs.
