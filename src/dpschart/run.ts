// DPS-chart runner — turns a matrix Cell + tested population into ranked per-unit
// DPS, reusing prepareTeam/runSim. Isomorphic: the caller supplies the data context
// (characters map, level multiplier, prepare deps), so this runs in the precompute
// script (fs-loaded data) or the browser (imported data) unchanged.
import type { CharacterData, LevelMultiplier } from '../types.js';
import { prepareTeam, type LineSelection, type PrepareDeps } from '../prepare.js';
import { runSim } from '../engine/sim.js';
import { bestOl } from '../bestol.js';
import {
  assembleTeam,
  FLOOR_SEED_COUNTS,
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
const charFor = (ctx: RunCtx, slug: string) => ctx.characters[slug] ?? NOOP_CHARACTERS[slug];

// memo of the tested unit's optimal 12/12 remainder lines, keyed by slug only. The
// user's spec is a PER-UNIT optimizer: a unit's best remaining lines (crit / ammo /
// charge …) are governed by its own kit, not by which supports are present or the
// boss element (the elemental lines are already floored), so we optimize once per unit
// in a fixed canonical context and reuse everywhere. Also keeps the precompute fast.
export type OptMemo = Map<string, LineSelection[]>;

// canonical context for the per-unit optimization pass (representative 5-unit team)
const PROBE_CELL: Cell = { framework: 'standard-hc', eleadv: 'eleweak', core: 'c100', invest: '12of12' };

// Greedy-optimize the tested unit's last 4 OL lines (12/12 tier) once per unit,
// memoized. Returns the extra lines beyond the 4 elem + 4 atk floor.
function optimizedLines(tested: TestedUnit, ctx: RunCtx, memo: OptMemo): LineSelection[] {
  const cached = memo.get(tested.slug);
  if (cached) return cached;

  // provisional team: tested carries only the 8-line floor.
  const team = assembleTeam(PROBE_CELL, tested); // no optimizedTestedLines → floor only
  const chars = team.slugs.map((s) => charFor(ctx, s));
  const prepared = prepareTeam(chars, team.unitOpts, ctx.deps);
  const res = bestOl(chars, ctx.mult, team.cfg, prepared, team.testedIndex, ctx.deps.olLines, 4, FLOOR_SEED_COUNTS);

  const counts = new Map<string, number>();
  for (const p of res.picks) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  const lines: LineSelection[] = [...counts].map(([type, count]) => ({ type, count }));
  memo.set(tested.slug, lines);
  return lines;
}

// The tested unit's DPS in one cell (slot 0 in named-control frameworks, slot 2 in Solo).
export function dpsFor(cell: Cell, tested: TestedUnit, ctx: RunCtx, memo: OptMemo): number {
  const extra = cell.invest === '12of12' ? optimizedLines(tested, ctx, memo) : undefined;
  const team = assembleTeam(cell, tested, extra);
  const chars = team.slugs.map((s) => charFor(ctx, s));
  const prepared = prepareTeam(chars, team.unitOpts, ctx.deps);
  const r = runSim(chars, ctx.mult, team.cfg, prepared);
  return r.units[team.testedIndex].dps;
}

export interface RankedEntry {
  slug: string;
  dps: number;
  rank: number; // 1-based, by descending dps
}

// Rank the whole tested population for one cell.
export function runCell(cell: Cell, tested: TestedUnit[], ctx: RunCtx, memo: OptMemo = new Map()): RankedEntry[] {
  const scored = tested.map((t) => ({ slug: t.slug, dps: dpsFor(cell, t, ctx, memo) }));
  scored.sort((a, b) => b.dps - a.dps);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
