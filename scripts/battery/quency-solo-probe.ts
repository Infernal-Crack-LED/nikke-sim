// One-off diagnostic: Quency SOLO, neutral boss, core exposure 100%.
// Solo B3 => zero Full Bursts (verify fbCount===0). Reconcile against the
// measured solo total 136,918,771 (quency smg.MP4, neutral, no burst).
import { loadWorld, runOnce, type BatteryTeam } from './lib.js';

const w = loadWorld();
// Measured solo totals (neutral, 0 FB — lone B-unit cannot burst):
const SOLO: { slug: string; real: number }[] = [
  { slug: 'quency-escape-queen', real: 136_918_771 }, // quency smg.MP4  (SMG)
  { slug: 'nayuta', real: 62_729_336 },               // nayuta solo.MP4  (SMG)
  { slug: 'grave', real: 34_943_846 },                // grave solo.MP4   (AR, rider-free)
];

const N = 8;
for (const { slug, real } of SOLO) {
  const acc: number[] = [];
  let fb = 0, pulls = 0;
  const bk = { normal: 0, skill: 0, burst: 0 };
  for (let i = 0; i < N; i++) {
    const r = runOnce(w, { name: `${slug} solo`, slugs: [slug] }, null, 1, 1000 + i);
    fb += r.fullBursts;
    const u = r.units.find((x) => x.slug === slug)!;
    acc.push(u.totalDamage); pulls = u.pulls;
    bk.normal += u.breakdown.normal; bk.skill += u.breakdown.skill; bk.burst += u.breakdown.burst;
  }
  const mean = acc.reduce((a, b) => a + b, 0) / N;
  console.log(`${slug.padEnd(20)} fb=${(fb/N).toFixed(1)} sim=${(mean/1e6).toFixed(1)}M real=${(real/1e6).toFixed(1)}M ratio=${(mean/real).toFixed(3)}  n=${(bk.normal/N/1e6).toFixed(1)}M s=${(bk.skill/N/1e6).toFixed(1)}M b=${(bk.burst/N/1e6).toFixed(1)}M pulls=${pulls}`);
}
