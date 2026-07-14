// Realistic iron-weak battery — boss Electric (iron units advantaged).
//
// Anchor teams are REAL top-300 player teams from enikk.app solo raid 34
// ("Altruia", Electric boss, 2026-03), fetched 2026-07-14; popularity =
// enikk's count of players fielding that exact composition. Slot order is the
// recorded player order (middle slot = default camera focus). Roster fill
// completes coverage of every supported unit.
//
//   npx tsx scripts/battery/iron-weak.ts
import { loadWorld, runRealisticBattery, type BatteryTeam } from './lib.js';

const ANCHORS: BatteryTeam[] = [
  {
    name: 'enikk 34-1 soda shotguns',
    slugs: ['tove', 'nayuta', 'soda-twinkling-bunny', 'dorothy-serendipity', 'drake'],
    source: 'enikk raid 34, 1180 players',
  },
  {
    name: 'enikk 34-2 crown eve',
    slugs: ['crown', 'rapi-red-hood', 'little-mermaid', 'eve', 'mast-romantic-maid'],
    source: 'enikk raid 34, 910 players',
  },
  {
    name: 'enikk 34-3 moran snipers',
    slugs: ['moran', 'snow-white-heavy-arms', 'takina', 'chisato', 'privaty'],
    source: 'enikk raid 34, 70 players',
  },
  {
    name: 'enikk 34-4 cinderella red-hood',
    slugs: ['cinderella', 'rouge', 'red-hood', 'ade-agent-bunny', 'mihara-bonding-chain'],
    source: 'enikk raid 34, 21 players',
  },
];

runRealisticBattery(loadWorld(), ANCHORS, 'Electric',
  'REALISTIC iron-weak battery (boss Electric) — enikk raid 34 anchors + roster fill, core exposure 0/50/100');
