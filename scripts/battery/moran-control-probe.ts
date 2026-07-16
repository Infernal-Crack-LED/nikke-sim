// One-off diagnostic: Moran control team (Helm/Crown/Moran/SnowWhite), neutral, core 100%.
// Measured (moran control.mov, neutral scope-lock partless boss):
//   Helm 482,322,739 · Crown 212,278,134 · Moran 287,972,631 · SnowWhite 399,610,717 (11 FB)
import { loadWorld, runOnce, type BatteryTeam } from './lib.js';

const w = loadWorld();
const REAL: Record<string, number> = {
  helm: 482_322_739, crown: 212_278_134, moran: 287_972_631, 'snow-white': 399_610_717,
};
const team: BatteryTeam = { name: 'moran control', slugs: ['helm', 'crown', 'moran', 'snow-white'] };

const N = 8;
const acc: Record<string, number[]> = {};
let fb = 0;
for (let i = 0; i < N; i++) {
  const r = runOnce(w, team, null, 1, 1000 + i);
  fb += r.fullBursts;
  for (const u of r.units) (acc[u.slug] ??= []).push(u.totalDamage);
}
console.log(`avg fullBursts=${(fb / N).toFixed(1)}  (real 11)`);
for (const slug of team.slugs) {
  const mean = acc[slug].reduce((a, b) => a + b, 0) / N;
  console.log(`${slug.padEnd(12)} sim=${(mean / 1e6).toFixed(1)}M  real=${(REAL[slug] / 1e6).toFixed(1)}M  ratio=${(mean / REAL[slug]).toFixed(3)}`);
}
