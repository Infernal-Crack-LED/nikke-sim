// Best-OL calculator: greedy marginal-gain search. Starting from the unit's
// current loadout, repeatedly try adding one max-roll line of each type (cap 4
// per type = one per OL piece), re-run the full sim, and keep whichever line
// adds the most damage for that unit. Reports the marginal gain of every pick
// so diminishing returns are visible.
import type { CharacterData, LevelMultiplier, SimConfig } from './types.js';
import { runSim } from './engine/sim.js';
import type { OlLinesFile, PreparedUnit } from './prepare.js';

export interface BestOlPick {
  type: string;
  name: string;
  value: number;
  unitGainPct: number; // marginal unit damage gain vs previous step
  teamGainPct: number;
}

export interface BestOlResult {
  slug: string;
  baselineDamage: number;
  finalDamage: number;
  picks: BestOlPick[];
  rejected: Array<{ type: string; name: string; gainPct: number }>; // first-step gains of everything
}

export function bestOl(
  chars: (CharacterData & { baseStats: any })[],
  mult: LevelMultiplier,
  cfg: SimConfig,
  prepared: PreparedUnit[],
  unitIdx: number,
  olLines: OlLinesFile,
  maxLines = 8,
  // Pre-consumed line counts (per type, cap 4 each). Pass e.g. { elem: 4, atk: 4 }
  // when the unit already carries a fixed floor of lines (DPS-chart 12/12 tier),
  // so the greedy search only fills the *remaining* pieces and never exceeds 4/type.
  seedCounts: Record<string, number> = {}
): BestOlResult {
  const simWith = (extra: Array<{ stat: string; value: number }>) => {
    const p = prepared.map((u, i) =>
      i === unitIdx ? { ...u, extraStats: [...u.extraStats, ...extra] } : u
    );
    const r = runSim(chars, mult, cfg, p);
    return { unit: r.units[unitIdx].totalDamage, team: r.teamDamage };
  };

  const base = simWith([]);
  const counts: Record<string, number> = { ...seedCounts };
  const added: Array<{ stat: string; value: number }> = [];
  const picks: BestOlPick[] = [];
  const rejected: BestOlResult['rejected'] = [];
  let prev = base;

  for (let step = 0; step < maxLines; step++) {
    let best: { type: string; result: { unit: number; team: number } } | null = null;
    for (const [type, line] of Object.entries(olLines.lines)) {
      if ((counts[type] ?? 0) >= 4) continue;
      const result = simWith([...added, { stat: line.stat, value: line.max }]);
      if (!best || result.unit > best.result.unit) best = { type, result };
      if (step === 0) {
        rejected.push({
          type,
          name: line.name,
          gainPct: base.unit ? ((result.unit - base.unit) / base.unit) * 100 : 0,
        });
      }
    }
    if (!best) break;
    const gain = best.result.unit - prev.unit;
    if (gain <= prev.unit * 0.0005) break; // < 0.05% marginal gain — stop
    const line = olLines.lines[best.type];
    picks.push({
      type: best.type,
      name: line.name,
      value: line.max,
      unitGainPct: prev.unit ? (gain / prev.unit) * 100 : 0,
      teamGainPct: prev.team ? ((best.result.team - prev.team) / prev.team) * 100 : 0,
    });
    counts[best.type] = (counts[best.type] ?? 0) + 1;
    added.push({ stat: line.stat, value: line.max });
    prev = best.result;
  }

  rejected.sort((a, b) => b.gainPct - a.gainPct);
  return {
    slug: chars[unitIdx].slug,
    baselineDamage: base.unit,
    finalDamage: prev.unit,
    picks,
    rejected,
  };
}
