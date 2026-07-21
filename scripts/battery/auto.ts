// Auto-generated full-roster battery: deterministic teams over every supported
// unit (as few repeats as the B1/B2 pools allow), each run through the
// 2x3 matrix {forced neutral, elemental advantage} x {core 0%, 50%, 100%}
// as seeded Monte Carlo (SEEDS, default 15).
//
// The advantage cell picks its boss per team: a neutral probe run finds the
// first B3 (slot order) that actually casts bursts, and the boss element is
// set so THAT unit is advantaged (the "one of the bursting B3s" rule).
//
//   npx tsx scripts/battery/auto.ts
//   SEEDS=25 ONLY="auto 3" OUT=/tmp/auto.json npx tsx scripts/battery/auto.ts
import { loadWorld, fillRoster, pickAdvantageBoss, runBattery, type Cell } from './lib.js';

const w = loadWorld();

// fillRoster with no anchors partitions the entire roster deterministically
// (element-grouped B3 cores, sticky pairs, B1/B2 round-robin on scarcity).
const teams = fillRoster(w, []).map((t, i) => ({
  ...t,
  name: `auto ${i + 1}`,
  source: (t.source ?? 'roster fill').replace('roster fill', 'auto-generated'),
}));

runBattery(w, teams, (team) => {
  const adv = pickAdvantageBoss(w, team);
  const cells: Cell[] = [
    { label: 'neutral c0', boss: null, coreHitRate: 0 },
    { label: 'neutral c50', boss: null, coreHitRate: 0.5 },
    { label: 'neutral c100', boss: null, coreHitRate: 1 },
    { label: `adv(${adv.boss}) c0`, boss: adv.boss, coreHitRate: 0 },
    { label: `adv(${adv.boss}) c50`, boss: adv.boss, coreHitRate: 0.5 },
    { label: `adv(${adv.boss}) c100`, boss: adv.boss, coreHitRate: 1 },
  ];
  console.log(`    advantage boss ${adv.boss} (via bursting B3 ${adv.via})`);
  return cells;
}, {
  title: 'AUTO battery — scope lock, generated teams, neutral vs advantage x core exposure',
  derived: [
    { label: 'core c1/c0', num: 2, den: 0 },  // core-exposure sensitivity (neutral)
    { label: 'adv/neut', num: 5, den: 2 },    // elemental-advantage lift (at core 100)
  ],
});
