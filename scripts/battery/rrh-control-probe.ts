// One-off diagnostic: RRH control team (LM/Crown/Helm/RRH), neutral, core 100%.
// Measured (rrh control.MP4, neutral scope-lock partless boss, owner-confirmed):
//   LM 470,516,754 · Crown 213,881,837 · Helm 477,724,348 · RRH 899,555,690  (13 FB)
import { loadWorld, runOnce, type BatteryTeam } from './lib.js';

const w = loadWorld();
const REAL: Record<string, number> = {
  'little-mermaid': 470_516_754, crown: 213_881_837, helm: 477_724_348, 'rapi-red-hood': 899_555_690,
};
const team: BatteryTeam = { name: 'rrh control', slugs: ['little-mermaid', 'crown', 'helm', 'rapi-red-hood'] };

const N = 8;
const acc: Record<string, number[]> = {};
let fb = 0;
for (let i = 0; i < N; i++) {
  const r = runOnce(w, team, null, 1, 1000 + i);
  fb += r.fullBursts;
  for (const u of r.units) (acc[u.slug] ??= []).push(u.totalDamage);
}
console.log(`avg fullBursts=${(fb / N).toFixed(1)}  (real 13)`);
for (const slug of team.slugs) {
  const mean = acc[slug].reduce((a, b) => a + b, 0) / N;
  console.log(`${slug.padEnd(16)} sim=${(mean / 1e6).toFixed(1)}M  real=${(REAL[slug] / 1e6).toFixed(1)}M  ratio=${(mean / REAL[slug]).toFixed(3)}`);
}
