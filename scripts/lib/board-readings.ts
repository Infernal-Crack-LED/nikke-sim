// Shared collector for board-wide accuracy readings: sims every recorded comp in
// scripts/experiment.ts COMPS (scope-lock basis, coreHitRate 1) and returns, per
// unit, the array of sim/real ratios with the comp each reading came from.
//
// RATIO = sim / real: >1 = HOT ▲ (sim OVER-models), <1 = COLD ▼ (sim UNDER-models).
// (NB: solo probe-data recons use the OPPOSITE field 'realOverSim' — >1 = COLD
// there. Do not conflate — docs/CONVENTIONS.md "Ratio direction".)
//
// Consumers: scripts/board-read.ts (the human dashboard) and scripts/kit-status.ts
// (the per-unit SSOT tracker's board records).
import { loadWorld, runOnce } from '../battery/lib.js';
import { COMPS } from '../experiment.js';

export interface BoardReading {
  comp: string; // COMPS entry name the reading came from
  ratio: number; // sim/real (>1 HOT)
}

export interface BoardStats {
  records: BoardReading[];
  n: number;
  mean: number;
  min: number;
  max: number;
  mad: number; // mean |ratio − 1| — the stability score
  band: string; // MAD bucket label
  temp: 'HOT ▲' | 'COLD ▼' | 'OK  ·';
}

export const bandLabel = (mad: number) =>
  mad <= 0.03 ? '±3% ✓' : mad <= 0.05 ? '±5%' : mad <= 0.08 ? '±8%' : mad <= 0.15 ? '±15%' : '>15%';
export const tempLabel = (mean: number): BoardStats['temp'] =>
  mean > 1.03 ? 'HOT ▲' : mean < 0.97 ? 'COLD ▼' : 'OK  ·';

// Sims all comps and collects per-unit readings. ~seconds of work — callers cache.
export function collectBoardReadings(): Record<string, BoardReading[]> {
  const w = loadWorld();
  const perUnit: Record<string, BoardReading[]> = {};
  for (const c of COMPS) {
    const r = runOnce(w, { name: c.name, slugs: c.slugs }, c.boss, 1);
    for (const u of r.units) {
      const real = c.real[u.slug];
      if (real === undefined || real <= 0) continue;
      (perUnit[u.slug] ??= []).push({ comp: c.name, ratio: u.totalDamage / real });
    }
  }
  return perUnit;
}

export function boardStats(records: BoardReading[]): BoardStats {
  const rs = records.map((r) => r.ratio);
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const mad = rs.reduce((a, b) => a + Math.abs(b - 1), 0) / rs.length;
  return {
    records,
    n: rs.length,
    mean,
    min: Math.min(...rs),
    max: Math.max(...rs),
    mad,
    band: bandLabel(mad),
    temp: tempLabel(mean),
  };
}

export { COMPS };
