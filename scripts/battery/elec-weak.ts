// Realistic electric-weak battery — boss Water (electric units advantaged).
//
// Anchor teams are REAL top-300 player teams from enikk.app solo raid 36
// ("Egovista", Water boss, 2026-05), fetched 2026-07-14; popularity = enikk's
// count of players fielding that exact composition. Slot order is the recorded
// player order (middle slot = default camera focus). Roster fill completes
// coverage of every supported unit.
//
//   npx tsx scripts/battery/elec-weak.ts
import { loadWorld, runRealisticBattery, type BatteryTeam } from './lib.js';

const ANCHORS: BatteryTeam[] = [
  {
    name: 'enikk 36-1 ein core',
    slugs: ['miranda', 'takina', 'ada', 'rouge', 'ein'],
    source: 'enikk raid 36, 320 players',
  },
  {
    name: 'enikk 36-2 rapi flex',
    slugs: ['rapi-red-hood', 'nayuta', 'snow-white-heavy-arms', 'jill', 'mihara-bonding-chain'],
    source: 'enikk raid 36, 108 players',
  },
  {
    name: 'enikk 36-3 neon-liberalio',
    slugs: ['neon-vision-eye', 'crown', 'moran', 'liberalio', 'mast-romantic-maid'],
    source: 'enikk raid 36, 13 players',
  },
];

runRealisticBattery(loadWorld(), ANCHORS, 'Water',
  'REALISTIC elec-weak battery (boss Water) — enikk raid 36 anchors + roster fill, core exposure 0/50/100');
