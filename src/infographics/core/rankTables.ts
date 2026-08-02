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
  B1B2DpsArtifact,
} from '../../ranks/types.js';

export type BufferBoardId = 'generic' | 'typed';

// K/M/B magnitude formatting, same shape as SupportRankings.tsx's fmt.
// Exported so the unit card formats sustain magnitudes identically to the board
// it is quoting — a card that disagrees with the site it advertises is worse
// than one with no number at all.
export const fmtMagnitude = (n: number): string =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

// Comp-profile chip labels — ported from SupportRankings.tsx PROFILE_LABELS
// (keep in sync; tooltip text stays on the site, the card needs the short tag).
// The "with-*" entries are team-composition tags (the fallback below reads them
// as "w/ X"); the DPS chart's variant profiles (src/dpschart/matrix.ts
// CHART_VARIANTS) are a per-unit BUILD/rotation choice, not a teammate, so they
// need an explicit short label here rather than falling through to "w/ <id>".
const PROFILE_LABELS: Record<string, string> = {
  'with-2mg': 'w/ 2 MG',
  'with-1mg': 'w/ 1 MG',
  'with-mg': 'w/ MG',
  'with-mint': 'w/ Mint',
  'with-healer': 'w/ Healer',
  'with-mast-rm': 'w/ Mast RM',
  'with-shielder': 'w/ Shielder',
  'with-avistar': 'w/ MG B1',
  'with-other-b1': 'w/ Other B1',
  'with-chime': 'w/ Chime',
  'as-b1': 'B1',
  'as-b2': 'B2',
  snipe: 'SR',
  distributed: 'Distributed',
  'bursts-second': 'Bursts Second',
};
// Exported for the unit card's profile chips (plan §8a: reuse this rather than
// re-deriving the chip text — two spellings of "w/ Healer" on one page is the
// failure mode).
export function profileLabel(id: string): string {
  if (PROFILE_LABELS[id]) {
    return PROFILE_LABELS[id];
  }
  if (id.startsWith('w/ ')) {
    return id;
  }
  const rest = id.startsWith('with-') ? id.slice(5) : id;
  return `w/ ${rest.replace(/-/g, ' ')}`;
}
// Exported for the DPS chart's bar-chart renderer (dpsChart.ts DpsBar.name has
// no separate chip field — unlike the table cards, the tag has to be baked into
// the drawn name string itself), so it can't drift from this same template.
export const unitName = (
  units: Record<string, { name: string }>,
  slug: string,
  profile: string | null
): string => {
  const name = units[slug]?.name ?? slug;
  return profile ? `${name} (${profileLabel(profile)})` : name;
};

export type BurstGenBoardId = 'unfocused' | 'focused';

// The site's default view is the unfocused board (SupportRankings.tsx
// useState('unfocused')) — the fair, nobody-favored cross-class baseline; the
// focused board (the unit as its team's designated carry) is the share
// button's second variant, mirroring buildBufferTable's generic/typed pattern.
export function buildBurstGenTable(
  art: BurstGenArtifact,
  board: BurstGenBoardId = 'unfocused'
): TableCardData {
  const rows = board === 'focused' ? art.focusedEntries : art.entries;
  return {
    title: `Burst Generation Ranking${board === 'focused' ? ' — Focused' : ''}`,
    subtitle:
      board === 'focused'
        ? 'no-op team · 180s · unit itself focused · scope-lock loadout'
        : 'no-op team · 180s · unfocused · scope-lock loadout',
    columns: [
      { header: '#', flex: 0.5 },
      { header: 'Unit', flex: 2 },
      { header: 'Gauge %/s', align: 'right' },
      { header: 'Bars (180s)', align: 'right' },
    ],
    rows: rows.map(([slug, gps, gtotal, , profile], i) => [
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
      fmtMagnitude(totalHp),
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
    title: `Team Buffs Ranking — ${board === 'generic' ? 'Generic' : 'Typed'}`,
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

export type B1B2DpsBoardId =
  'c0-neutral' | 'c0-eleadv' | 'c100-neutral' | 'c100-eleadv';

export const B1B2_DPS_BOARDS: B1B2DpsBoardId[] = [
  'c0-neutral',
  'c0-eleadv',
  'c100-neutral',
  'c100-eleadv',
];

export const B1B2_CELL_LABEL: Record<B1B2DpsBoardId, string> = {
  'c0-neutral': 'No Core · Neutral',
  'c0-eleadv': 'No Core · Ele Adv',
  'c100-neutral': 'Core 100 · Neutral',
  'c100-eleadv': 'Core 100 · Ele Adv',
};

export function buildB1B2DpsTable(
  art: B1B2DpsArtifact,
  board: B1B2DpsBoardId
): TableCardData {
  return {
    title: `B1/B2 DPS Ranking — ${B1B2_CELL_LABEL[board]}`,
    subtitle: 'own DPS in a Solo-style no-op control team · scope-lock loadout',
    columns: [
      { header: '#', flex: 0.5 },
      { header: 'Unit', flex: 2 },
      { header: 'DPS', align: 'right' },
    ],
    rows: art.cells[board].map(([slug, dps, profile], i) => [
      `#${i + 1}`,
      unitName(art.units, slug, profile),
      fmtMagnitude(dps),
    ]),
    window: {},
    footer: 'nikkesim.app/ranks',
  };
}
