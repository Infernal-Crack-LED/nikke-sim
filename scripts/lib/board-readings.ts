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
import { DEFAULT_MC_SEEDS, MC_SEED_BASE, meanSimResults } from '../../src/engine/sim.js';
import { COMPS } from '../experiment.js';

export interface BoardReading {
  comp: string; // COMPS entry name the reading came from
  ratio: number; // sim/real (>1 HOT) — mean over DEFAULT_MC_SEEDS seeded runs
  seedCv: number; // seed coefficient of variation (sd/mean of the unit's per-seed totalDamage) —
  // the single-run spread this comp exhibits; high = FB-bimodal / boss-timing-sensitive
}

export interface BoardStats {
  records: BoardReading[];
  n: number;
  mean: number;
  min: number;
  max: number;
  mad: number; // mean |ratio − 1| — the stability score
  meanCv: number; // mean seed CV across the unit's comps — the typical ± a single real run sits within
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
    // Monte-Carlo mean (2026-07-17): board ratios are the mean of DEFAULT_MC_SEEDS seeded
    // runs, matching the real-fight variance sources. runOnce sets cfg.seed → the SG pellet jitter +
    // crit/core/boss-timing jitter all sample. meanSimResults averages them. (dpschart + regression
    // stay EV — they call runSim directly.)
    // Pass the comp's FULL config, not just name+slugs. Dropping `focus` / `modes` / `lambda` made
    // the board dashboard disagree with scripts/experiment.ts (the grading harness) on the same
    // comps: 13 of 31 comps declare `focus` (the ×2.5 charge-weapon gauge bonus → burst counts →
    // every unit's total), and PA MiKa declares `modes` + `lambda`. With modes dropped, `prika` and
    // `mint` ran SOLO there, so prika's duet-only `burstFirst` + `burstCdr −9999` never fired and the
    // measured duet order (prika takes burst 1, mint every burst after) was absent — reading them
    // artificially COLD (prika 0.676 / mint 0.755 here vs 0.889 / 1.015 in experiment.ts).
    const runs = Array.from({ length: DEFAULT_MC_SEEDS }, (_, i) =>
      runOnce(
        w,
        { name: c.name, slugs: c.slugs, focus: c.focus, modes: c.modes, lambda: c.lambda },
        c.boss, 1, MC_SEED_BASE + i
      )
    );
    const r = meanSimResults(runs);
    for (const u of r.units) {
      const real = c.real[u.slug];
      if (real === undefined || real <= 0) continue;
      // seed spread for THIS unit in THIS comp: sd/mean of its per-seed totalDamage (population sd,
      // matching experiment.ts). u.totalDamage is already that mean, so ratio = mean/real is consistent.
      const dmgs = runs.map((run) => run.units.find((x) => x.slug === u.slug)!.totalDamage);
      const m = dmgs.reduce((a, b) => a + b, 0) / dmgs.length;
      const sd = Math.sqrt(dmgs.reduce((a, b) => a + (b - m) ** 2, 0) / dmgs.length);
      (perUnit[u.slug] ??= []).push({ comp: c.name, ratio: u.totalDamage / real, seedCv: m > 0 ? sd / m : 0 });
    }
  }
  return perUnit;
}

export function boardStats(records: BoardReading[]): BoardStats {
  const rs = records.map((r) => r.ratio);
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const mad = rs.reduce((a, b) => a + Math.abs(b - 1), 0) / rs.length;
  const meanCv = records.reduce((a, r) => a + (r.seedCv ?? 0), 0) / records.length;
  return {
    records,
    n: rs.length,
    mean,
    min: Math.min(...rs),
    max: Math.max(...rs),
    mad,
    meanCv,
    band: bandLabel(mad),
    temp: tempLabel(mean),
  };
}

export { COMPS };
