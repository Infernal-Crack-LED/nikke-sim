// Realistic forced-neutral battery — boss element null (no unit advantaged).
//
// Anchor teams are the most popular roster-covered teams ACROSS all five
// enikk.app solo raids (31/34/35/36/37, fetched 2026-07-14), deduplicated and
// selected without unit repeats — the strongest realistic compositions,
// scored here with the elemental term removed. Popularity = enikk's count of
// players fielding that exact composition in its source raid. Roster fill
// completes coverage of every supported unit.
//
//   npx tsx scripts/battery/neutral.ts
import { loadWorld, runRealisticBattery, type BatteryTeam } from './lib.js';

const ANCHORS: BatteryTeam[] = [
  {
    name: 'enikk N-1 soda shotguns',
    slugs: ['tove', 'nayuta', 'soda-twinkling-bunny', 'dorothy-serendipity', 'drake'],
    source: 'enikk raid 34, 1180 players',
  },
  {
    name: 'enikk N-2 crown eve',
    slugs: ['crown', 'rapi-red-hood', 'little-mermaid', 'eve', 'mast-romantic-maid'],
    source: 'enikk raid 34, 910 players',
  },
  {
    name: 'enikk N-3 ein core',
    slugs: ['miranda', 'takina', 'ada', 'rouge', 'ein'],
    source: 'enikk raid 36, 320 players',
  },
  {
    name: 'enikk N-4 mint duet neon',
    slugs: ['anis-star', 'neon-vision-eye', 'alice', 'mint', 'prika'],
    source: 'enikk raid 37, 68 players',
  },
  {
    name: 'enikk N-5 moran red-hood',
    slugs: ['moran', 'grave', 'red-hood', 'milk-blooming-bunny', 'privaty'],
    source: 'enikk raid 34, 65 players',
  },
];

runRealisticBattery(loadWorld(), ANCHORS, null,
  'REALISTIC neutral battery (boss element none) — cross-raid enikk anchors + roster fill, core exposure 0/50/100');
