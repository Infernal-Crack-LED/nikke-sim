// Realistic fire-weak battery — boss Wind (fire units advantaged).
//
// Anchor teams are REAL top-300 player teams from enikk.app solo raid 35
// ("Crystal Chamber", Wind boss, 2026-04), fetched 2026-07-14; popularity =
// enikk's count of players fielding that exact composition. Slot order is the
// recorded player order (middle slot = default camera focus). Roster fill
// completes coverage of every supported unit.
//
//   npx tsx scripts/battery/fire-weak.ts
import { loadWorld, runRealisticBattery, type BatteryTeam } from './lib.js';

const ANCHORS: BatteryTeam[] = [
  {
    name: 'enikk 35-1 mihara core',
    slugs: ['miranda', 'nayuta', 'ada', 'rouge', 'mihara-bonding-chain'],
    source: 'enikk raid 35, 765 players',
  },
  {
    name: 'enikk 35-2 crown rapi',
    slugs: ['crown', 'little-mermaid', 'helm', 'privaty', 'rapi-red-hood'],
    source: 'enikk raid 35, 541 players',
  },
  {
    name: 'enikk 35-3 tove shotguns',
    slugs: ['tove', 'arcana-fortune-mate', 'dorothy-serendipity', 'drake', 'd-killer-wife'],
    source: 'enikk raid 35, 8 players',
  },
];

runRealisticBattery(loadWorld(), ANCHORS, 'Wind',
  'REALISTIC fire-weak battery (boss Wind) — enikk raid 35 anchors + roster fill, core exposure 0/50/100');
