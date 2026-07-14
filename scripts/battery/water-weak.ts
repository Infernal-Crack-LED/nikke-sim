// Realistic water-weak battery — boss Fire (water-element units advantaged).
//
// Anchor teams are REAL top-300 player teams from enikk.app solo raid 37
// ("Ultra", Fire boss, 2026-06), fetched 2026-07-14; the popularity figure is
// enikk's count of players fielding that exact composition. Slot order is the
// recorded player order (middle slot = default camera focus). The roster fill
// then completes coverage of every supported unit with methodology-built
// teams (advantaged-element B3 cores first, logical pairs kept).
//
//   npx tsx scripts/battery/water-weak.ts
//   SEEDS=25 NOFILL=1 ONLY=enikk npx tsx scripts/battery/water-weak.ts
import { loadWorld, runRealisticBattery, type BatteryTeam } from './lib.js';

// NOTE (owner ruling 2026-07-14): the raid's #1 covered comp (245 players:
// mint/quency/rapi-RH/red-hood/prika) fields red-hood as the SOLO B1 — an
// outlier shape excluded from the batteries (her 40s burst cooldown binds the
// rotation). Anchors below are the most popular comps with a real B1.
const ANCHORS: BatteryTeam[] = [
  {
    name: 'enikk 37-1 crown water core',
    slugs: ['miranda', 'crown', 'snow-white-heavy-arms', 'privaty', 'little-mermaid'],
    source: 'enikk raid 37, 215 players',
  },
  {
    name: 'enikk 37-2 mint duet neon',
    slugs: ['anis-star', 'neon-vision-eye', 'alice', 'mint', 'prika'],
    source: 'enikk raid 37, 68 players',
  },
  {
    name: 'enikk 37-3 electric splash',
    slugs: ['moran', 'nayuta', 'helm', 'ludmilla-winter-owner', 'elegg-boom-and-shock'],
    source: 'enikk raid 37, 41 players',
  },
];

runRealisticBattery(loadWorld(), ANCHORS, 'Fire',
  'REALISTIC water-weak battery (boss Fire) — enikk raid 37 anchors + roster fill, core exposure 0/50/100');
