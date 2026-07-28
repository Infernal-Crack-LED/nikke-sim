// TableCardData builders for the four rank boards (burstgen / burstcdr /
// sustain / buffer) — the DATA half of the pre-rendered rank/* manifest images
// and the Support Rankings tab's share cards, extracted from
// scripts/build-infographics.ts so the server pre-render and the browser
// canvas build the SAME table (one source, both hosts). Pure and DOM-free
// like the rest of core/: callers attach the icon and render via
// drawTableCard. Every board is §6.6-windowed (top 10 by default) with
// ABSOLUTE population ranks written into the rows here.
import type { TableCardData } from './tableCard.js';
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
} from '../../ranks/types.js';

export type BufferBoardId = 'generic' | 'typed';

// K/M/B magnitude formatting, same shape as SupportRankings.tsx's fmt.
const fmt = (n: number): string =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

// Comp-profile chip labels — ported from SupportRankings.tsx PROFILE_LABELS
// (keep in sync; tooltip text stays on the site, the card needs the short tag).
const PROFILE_LABELS: Record<string, string> = {
  'with-2mg': 'w/ 2 MG',
  'with-1mg': 'w/ 1 MG',
  'with-mg': 'w/ MG',
  'with-mint': 'w/ Mint',
  'with-healer': 'w/ Healer',
  'with-mast-rm': 'w/ Mast RM',
  'with-shielder': 'w/ Shielder',
};
function profileLabel(id: string): string {
  if (PROFILE_LABELS[id]) {
    return PROFILE_LABELS[id];
  }
  if (id.startsWith('w/ ')) {
    return id;
  }
  const rest = id.startsWith('with-') ? id.slice(5) : id;
  return `w/ ${rest.replace(/-/g, ' ')}`;
}
const unitName = (
  units: Record<string, { name: string }>,
  slug: string,
  profile: string | null
): string => {
  const name = units[slug]?.name ?? slug;
  return profile ? `${name} (${profileLabel(profile)})` : name;
};

export function buildBurstGenTable(art: BurstGenArtifact): TableCardData {
  return {
    title: 'Burst Generation Ranking',
    subtitle: 'no-op team · 180s · unfocused · scope-lock loadout',
    columns: [
      { header: '#', flex: 0.5 },
      { header: 'Unit', flex: 2 },
      { header: 'Gauge %/s', align: 'right' },
      { header: 'Bars (180s)', align: 'right' },
    ],
    rows: art.entries.map(([slug, gps, gtotal, , profile], i) => [
      `#${i + 1}`,
      unitName(art.units, slug, profile),
      `${gps.toFixed(2)}%/s`,
      (gtotal / 100).toFixed(1),
    ]),
    window: {},
    footer: 'nikkesim.app/ranks',
  };
}

export function buildBurstCdrTable(art: BurstCdrArtifact): TableCardData {
  return {
    title: 'Burst CDR Ranking',
    subtitle: 'team CDR seconds per 20s Full Burst · 180s average',
    columns: [
      { header: '#', flex: 0.5 },
      { header: 'Unit', flex: 2 },
      { header: 'CDR s/20s', align: 'right' },
    ],
    rows: art.entries.map(([slug, cdr, , , , profile], i) => [
      `#${i + 1}`,
      unitName(art.units, slug, profile),
      `${cdr.toFixed(1)}s`,
    ]),
    window: {},
    footer: 'nikkesim.app/ranks',
  };
}

export function buildSustainTable(art: SustainArtifact): TableCardData {
  return {
    title: 'Sustain Ranking',
    subtitle: 'effective HP restored + shielded · 180s team total',
    columns: [
      { header: '#', flex: 0.5 },
      { header: 'Unit', flex: 2 },
      { header: 'Sustain', align: 'right' },
      { header: '% max HP', align: 'right' },
    ],
    rows: art.entries.map(([slug, totalHp, totalPct, , , , p], i) => [
      `#${i + 1}`,
      unitName(art.units, slug, p),
      fmt(totalHp),
      `${totalPct.toFixed(0)}%`,
    ]),
    window: {},
    footer: 'nikkesim.app/ranks',
  };
}

// The site's default view is the generic board (SupportRankings.tsx
// useState('generic')); the typed board is the share button's second variant.
export function buildBufferTable(
  art: BufferChartArtifact,
  board: BufferBoardId = 'generic'
): TableCardData {
  return {
    title: `Buffer Ranking — ${board === 'generic' ? 'Generic' : 'Typed'}`,
    subtitle: 'team damage increase vs the no-op baseline',
    columns: [
      { header: '#', flex: 0.5 },
      { header: 'Unit', flex: 2 },
      { header: 'Added DMG', align: 'right' },
    ],
    rows: art.cells[board].map(([slug, addedPct, , profile], i) => [
      `#${i + 1}`,
      unitName(art.units, slug, profile),
      `${addedPct >= 0 ? '+' : '-'}${Math.abs(addedPct).toFixed(1)}%`,
    ]),
    window: {},
    footer: 'nikkesim.app/ranks',
  };
}
