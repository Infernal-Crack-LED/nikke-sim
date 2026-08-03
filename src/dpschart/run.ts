// DPS-chart runner — turns a matrix Cell + tested population into ranked per-unit
// DPS, reusing prepareTeam/runSim. Isomorphic: the caller supplies the data context
// (characters map, level multiplier, prepare deps), so this runs in the precompute
// script (fs-loaded data) or the browser (imported data) unchanged.
import type { CharacterData, LevelMultiplier } from '../types.js';
import {
  prepareTeam,
  type LineSelection,
  type PrepareDeps,
} from '../prepare.js';
import { runSim } from '../engine/sim.js';
import { rankFreeLineConfigs } from '../olconfigs.js';
import {
  assembleTeam,
  OL_TIER_VALUES,
  type Cell,
  type TestedUnit,
} from './matrix.js';
import { NOOP_CHARACTERS } from './noop.js';

export interface RunCtx {
  characters: Record<string, CharacterData & { baseStats: any }>;
  mult: LevelMultiplier;
  deps: PrepareDeps; // includes olLines, cubes, overrides, skillLevels
}

// slug → character, falling back to the Solo framework's synthetic no-op controls
// (they live outside characters.json — no data sync should ever touch them)
const charFor = (ctx: RunCtx, slug: string) =>
  ctx.characters[slug] ?? NOOP_CHARACTERS[slug];

// memo of the tested unit's optimal 12/12 remainder lines, keyed by slug+profile. The
// user's spec is a PER-UNIT optimizer: a unit's best remaining lines (crit / ammo /
// charge …) are governed by its own kit, not by which supports are present or the
// boss element (the elemental lines are already floored), so we optimize once per
// (unit, profile) in a fixed canonical context and reuse everywhere. Also keeps the
// precompute fast. Profile is part of the key because a variant build (e.g.
// cinderella-crystal-wave's Snipe mode) can legitimately want different OL lines
// than the plain row — reusing the plain row's picks for the profiled row would
// silently understate/overstate whichever mode the memo happened to cache first.
export type OptMemo = Map<string, LineSelection[]>;
const memoKey = (tested: TestedUnit): string =>
  `${tested.slug}::${tested.profile ?? ''}`;

// canonical context for the per-unit optimization pass (representative 5-unit team)
const PROBE_CELL: Cell = {
  framework: 'standard-hc',
  eleadv: 'eleweak',
  core: 'c100',
  invest: '12of12',
};

// Optimize the tested unit's last 4 OL lines (12/12 tier) once per unit, memoized.
// Returns the extra lines beyond the 4 elem + 4 atk floor.
//
// EXHAUSTIVE, at the project tier (owner ruling 2026-08-03). The greedy marginal-gain
// search this replaced could not see a stat whose FIRST line is worthless and whose third
// or fourth wins outright — Charge Speed buys nothing until it crosses a frame boundary,
// Hit Rate's core-rate curve is convex — and it was measured leaving up to 31% of a unit's
// achievable gain unclaimed. The pool is 3 candidate types (5 on RL/SR), so the exhaustive
// pass is 15 or 70 sims per unit against greedy's ~28: strictly better AND cheaper.
//
// The tier is OL_TIER_VALUES, the same values tierLoadout stamps on the lines when they
// are applied, so this cannot optimize on a basis the chart does not then use.
function optimizedLines(
  tested: TestedUnit,
  ctx: RunCtx,
  memo: OptMemo
): LineSelection[] {
  const key = memoKey(tested);
  const cached = memo.get(key);
  if (cached) {
    return cached;
  }

  // provisional team: tested carries only the 8-line floor.
  const team = assembleTeam(PROBE_CELL, tested); // no optimizedTestedLines → floor only
  const chars = team.slugs.map((s) => charFor(ctx, s));
  const { results } = rankFreeLineConfigs({
    chars,
    mult: ctx.mult,
    cfg: team.cfg,
    deps: ctx.deps,
    baseOpts: team.unitOpts,
    carryIdx: team.testedIndex,
    topN: 1,
    tierValues: OL_TIER_VALUES,
  });
  // counts only — tierLoadout stamps the value when these are applied
  const lines: LineSelection[] = results[0].lines.map(({ type, count }) => ({
    type,
    count,
  }));
  memo.set(key, lines);
  return lines;
}

// The tested unit's DPS in one cell (slot 0 in named-control frameworks, slot 2 in Solo).
export function dpsFor(
  cell: Cell,
  tested: TestedUnit,
  ctx: RunCtx,
  memo: OptMemo
): number {
  const extra =
    cell.invest === '12of12' ? optimizedLines(tested, ctx, memo) : undefined;
  const team = assembleTeam(cell, tested, extra);
  const chars = team.slugs.map((s) => charFor(ctx, s));
  const prepared = prepareTeam(chars, team.unitOpts, ctx.deps);
  const r = runSim(chars, ctx.mult, team.cfg, prepared);
  return r.units[team.testedIndex].dps;
}

export interface RankedEntry {
  slug: string;
  dps: number;
  profile: string | null; // variant-profile id (CHART_VARIANTS), null = plain row
  rank: number; // 1-based, by descending dps
}

// Rank the whole tested population for one cell. A profiled slug appears TWICE
// in `tested` (plain + variant) and both rows compete in the SAME ranking, same
// convention as the buffer/sustain/burstgen boards (src/ranks/*.ts).
//
// This is the BROWSER's live custom-mode path and sorts on RAW dps, rounding
// afterwards. scripts/build-dpschart.ts deliberately does NOT call this — it
// rounds BEFORE sorting, with a stable tiebreak on the name-sorted tested order,
// because a row carried over from a prior artifact only has that artifact's
// already-rounded value and must rank identically to a freshly simulated one.
// So on an EXACT integer tie the precomputed board and this live view can order
// two units differently. That divergence is intended — don't "fix" either side
// to match the other without reading the 2026-08-01 DECISIONS entry.
export function runCell(
  cell: Cell,
  tested: TestedUnit[],
  ctx: RunCtx,
  memo: OptMemo = new Map()
): RankedEntry[] {
  const scored = tested.map((t) => ({
    slug: t.slug,
    dps: dpsFor(cell, t, ctx, memo),
    profile: t.profile ?? null,
  }));
  scored.sort((a, b) => b.dps - a.dps);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
