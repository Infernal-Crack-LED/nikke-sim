// Realistic wind-weak battery — boss Iron (wind units advantaged).
//
// Anchor teams are REAL top-300 player teams from enikk.app solo raid 31
// ("Queen 001", Iron boss, 2025-12 — the most recent wind-weak raid; the meta
// is older than the other batteries). Fetched 2026-07-14; popularity = enikk's
// count of players fielding that exact composition. Slot order is the recorded
// player order (middle slot = default camera focus). Roster fill completes
// coverage of every supported unit.
//
//   npx tsx scripts/battery/wind-weak.ts
import { loadWorld, runRealisticBattery, type BatteryTeam } from './lib.js';

const ANCHORS: BatteryTeam[] = [
  {
    name: 'enikk 31-1 maxwell battery',
    slugs: ['miranda', 'nayuta', 'maxwell', 'helm', 'd-killer-wife'],
    source: 'enikk raid 31, 307 players',
  },
  {
    name: 'enikk 31-2 crown ludmilla',
    slugs: ['crown', 'rapi-red-hood', 'little-mermaid', 'ludmilla-winter-owner', 'naga'],
    source: 'enikk raid 31, 225 players',
  },
  {
    name: 'enikk 31-3 cinderella sakura',
    slugs: ['cinderella', 'rouge', 'sakura-bloom-in-summer', 'ade-agent-bunny', 'mihara-bonding-chain'],
    source: 'enikk raid 31, 96 players',
  },
];

runRealisticBattery(loadWorld(), ANCHORS, 'Iron',
  'REALISTIC wind-weak battery (boss Iron) — enikk raid 31 anchors + roster fill, core exposure 0/50/100');
