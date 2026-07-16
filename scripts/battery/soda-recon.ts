import { loadWorld, runOnce, type BatteryTeam } from './lib.js';
import type { Element } from '../../src/types.js';
const w = loadWorld();
const REAL: Record<string, number> = {
  'little-mermaid': 403_522_768, crown: 170_865_948, 'soda-twinkling-bunny': 416_375_537, helm: 385_716_037,
};
const team: BatteryTeam = { name: 'soda control', slugs: ['little-mermaid', 'crown', 'soda-twinkling-bunny', 'helm'] };
const N = 6;
for (const boss of [null, 'Electric', 'Iron', 'Fire', 'Wind', 'Water'] as (Element|null)[]) {
  const acc: Record<string, number[]> = {}; let fb = 0;
  for (let i = 0; i < N; i++) {
    const r = runOnce(w, team, boss, 1, 1000 + i); fb += r.fullBursts;
    for (const u of r.units) (acc[u.slug] ??= []).push(u.totalDamage);
  }
  const rat = (s:string)=>{const m=acc[s].reduce((a,b)=>a+b,0)/N; return (m/REAL[s]).toFixed(2);};
  console.log(`boss=${String(boss).padEnd(9)} FB=${(fb/N).toFixed(1)}  LM=${rat('little-mermaid')} Crown=${rat('crown')} Helm=${rat('helm')} | Soda=${rat('soda-twinkling-bunny')}`);
}
