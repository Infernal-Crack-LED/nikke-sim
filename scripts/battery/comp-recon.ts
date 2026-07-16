// Consolidated control-team reconciliations from the 2026-07-15 recording batch.
// Each measured on a scope-lock partless boss (owner-confirmed). Boss element per team.
import { loadWorld, runOnce, type BatteryTeam } from './lib.js';
import type { Element } from '../../src/types.js';

const w = loadWorld();

type Case = { team: BatteryTeam; boss: Element | null; realFb: number; real: Record<string, number> };
const CASES: Case[] = [
  {
    team: { name: 'rrh control (neutral)', slugs: ['little-mermaid', 'crown', 'helm', 'rapi-red-hood'] },
    boss: null, realFb: 13,
    real: { 'little-mermaid': 470_516_754, crown: 213_881_837, helm: 477_724_348, 'rapi-red-hood': 899_555_690 },
  },
  {
    team: { name: 'moran control (neutral)', slugs: ['helm', 'crown', 'moran', 'snow-white'] },
    boss: null, realFb: 11,
    real: { helm: 482_322_739, crown: 212_278_134, moran: 287_972_631, 'snow-white': 399_610_717 },
  },
  {
    team: { name: 'nayuta control (boss Water)', slugs: ['little-mermaid', 'helm', 'nayuta', 'snow-white'] },
    boss: 'Water', realFb: 12,
    real: { 'little-mermaid': 283_576_237, helm: 435_678_970, nayuta: 544_176_905, 'snow-white': 348_982_871 },
  },
];

const N = 8;
for (const c of CASES) {
  const acc: Record<string, number[]> = {};
  let fb = 0;
  for (let i = 0; i < N; i++) {
    const r = runOnce(w, c.team, c.boss, 1, 1000 + i);
    fb += r.fullBursts;
    for (const u of r.units) (acc[u.slug] ??= []).push(u.totalDamage);
  }
  console.log(`\n=== ${c.team.name} ===  FB sim=${(fb / N).toFixed(1)} real=${c.realFb}`);
  for (const slug of c.team.slugs) {
    const mean = acc[slug].reduce((a, b) => a + b, 0) / N;
    const rr = c.real[slug];
    console.log(`  ${slug.padEnd(16)} sim=${(mean / 1e6).toFixed(1).padStart(6)}M  real=${(rr / 1e6).toFixed(1).padStart(6)}M  ratio=${(mean / rr).toFixed(3)}`);
  }
}
