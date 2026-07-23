// W3 - M3 engine-reproduction check: the ENGINE's UNIGEO=sg landing / core-per-landed
// values at the 9 measured window states, scored as total binomial deviance across the
// 18 cells (vs the analysis fit's 25.4 on 16 dof; PASS = within +6).
// Calls the engine's own functions directly (src/engine/unigeo.ts) - no full sim.
import { unigeoSgLanding, unigeoSgCorePerLanded } from '../../src/engine/unigeo.js';

const STATES: [string, string, number, number, number, number][] = [
  // label, band, hr, shots, landed, cores
  ['near_ON', 'near', 38.91, 16, 149, 11],
  ['near_OFF', 'near', 0, 5, 39, 0],
  ['mid_ON', 'mid', 38.91, 19, 174, 5],
  ['mid_OFF', 'mid', 0, 4, 31, 1],
  ['midfar_ON', 'midfar', 38.91, 18, 140, 11],
  ['midfar_OFF', 'midfar', 0, 4, 28, 0],
  ['far_ON', 'far', 38.91, 19, 135, 3],
  ['far_OFF', 'far', 0, 5, 32, 0],
  ['midfarREP_ON', 'midfar', 38.91, 18, 135, 4],
];

function bll(k: number, n: number, p: number): number {
  const q = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  return k * Math.log(q) + (n - k) * Math.log(1 - q);
}

let sat = 0;
let ll = 0;
console.log('cell            pL_engine  pL_obs   zL    pC_engine  pC_obs   zC');
for (const [label, band, hr, shots, landed, cores] of STATES) {
  const n = 10 * shots;
  const pL = unigeoSgLanding(band, hr);
  const pC = unigeoSgCorePerLanded(band, hr);
  sat += bll(landed, n, landed / n) + bll(cores, landed, cores / landed);
  ll += bll(landed, n, pL) + bll(cores, landed, pC);
  const zL = (landed / n - pL) / Math.sqrt(Math.max(pL * (1 - pL), 1e-12) / n);
  const zC = (cores / landed - pC) / Math.sqrt(Math.max(pC * (1 - pC), 1e-12) / landed);
  console.log(
    `${label.padEnd(14)} ${pL.toFixed(4).padStart(8)} ${(landed / n).toFixed(4).padStart(8)} ${zL.toFixed(2).padStart(6)} ${pC.toFixed(4).padStart(9)} ${(cores / landed).toFixed(4).padStart(8)} ${zC.toFixed(2).padStart(6)}`,
  );
}
const dev = 2 * (sat - ll);
console.log(`\nengine total deviance (18 cells): ${dev.toFixed(2)}`);
console.log(`analysis-fit reference: 25.4 (16 dof); PASS criterion dev <= 31.4: ${dev <= 31.4 ? 'PASS' : 'FAIL'}`);
