// Maps each Support Rankings board's typed rows (rankBoardsData.ts) into the
// uniform RankChartBar shape both the on-page RankBarChart (DOM) and the Card
// Builder's canvas rankChart.ts renderer draw. Extracted from
// SupportRankings.tsx so both hosts build the SAME bars from the SAME
// mapping — the tab and the Builder card must never silently drift apart.
import type { RankChartBar } from '../../src/infographics/core/rankChart';
import {
  burstGenBars,
  burstCdrBars,
  sustainBars,
  bufferBars,
  type BoardId,
  type BufferBoard,
  type BurstGenBoard,
  type BurstGenArtifact,
  type BurstCdrArtifact,
  type SustainArtifact,
  type BufferChartArtifact,
} from './rankBoardsData';

// Short chip label for a comp-profile variant. Explicit map for the known
// ids; fallback humanizes `with-<x>` → `w/ <X>` so a new profile still
// renders sensibly.
const PROFILE_LABELS: Record<string, string> = {
  'with-2mg': 'w/ 2 MG',
  'with-1mg': 'w/ 1 MG',
  'with-mg': 'w/ MG',
  'with-mint': 'w/ Mint',
  'with-healer': 'w/ Healer',
  'with-mast-rm': 'w/ Mast RM',
  'with-shielder': 'w/ Shielder',
  'w/ Prika': 'w/ Prika',
  'w/ Mint': 'w/ Mint',
  'w/ Anchor': 'w/ Anchor',
  'w/ Rouge': 'w/ Rouge',
  // DPS-chart-only variant profiles (src/dpschart/matrix.ts CHART_VARIANTS) —
  // this page never reads dpschart.json, but rankTables.ts's copy is kept in
  // sync per the shared comment on both maps.
  snipe: 'Snipe',
  distributed: 'Distributed',
  'bursts-second': 'Bursts Second',
};
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

// burstcdr ramp ladder → "1st FB 2.3 · 2nd 5.0 · 3rd+ 8.2" (last value is the
// capped steady-state, hence the "+")
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];
export function rampText(ramp: number[]): string {
  return ramp
    .map((v, i) => {
      const ord = ORDINALS[i] ?? `${i + 1}th`;
      return `${i === 0 ? `${ord} FB` : i === ramp.length - 1 ? `${ord}+` : ord} ${v.toFixed(1)}`;
    })
    .join(' · ');
}

// K/M/B magnitude formatting, same shape as DpsBarChart's fmt.
export const fmtMagnitude = (n: number): string =>
  n >= 1e9
    ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
      ? `${(n / 1e6).toFixed(2)}M`
      : n >= 1e3
        ? `${(n / 1e3).toFixed(1)}K`
        : n.toFixed(0);

export type AnyRankArtifact =
  BurstGenArtifact | BurstCdrArtifact | SustainArtifact | BufferChartArtifact;

// Map the active board's typed rows into the chart's uniform bar shape.
// `art.profiles` resolves each row's profile id into its badge tooltip. Feeds
// BOTH hosts (the on-page RankBarChart's DOM tooltips AND the Card Builder's
// canvas card, which simply ignores the tooltip-only fields) from one shape.
export function barsForBoard(
  board: BoardId,
  art: AnyRankArtifact,
  opts: { bufferBoard: BufferBoard; burstGenBoard: BurstGenBoard }
): RankChartBar[] {
  const profiles = art.profiles;
  const badge = (b: { profile: string | null }) =>
    b.profile
      ? { badge: profileLabel(b.profile), badgeTitle: profiles[b.profile] }
      : {};
  if (board === 'burstgen') {
    return burstGenBars(art as BurstGenArtifact, opts.burstGenBoard).map(
      (b) => ({
        ...b,
        key: `${b.slug}:${b.profile ?? ''}`,
        value: b.gaugePerSec,
        valueText: `${b.gaugePerSec.toFixed(2)}%/s`,
        valueSub: `${(b.gaugeTotal / 100).toFixed(1)} bars · ${b.fullBursts.toFixed(1)} FB`,
        valueTitle:
          'gauge-percent per second contributed while the team bar is building (100 = one bar)',
        ...badge(b),
      })
    );
  }
  if (board === 'burstcdr') {
    return burstCdrBars(art as BurstCdrArtifact).map((b) => ({
      ...b,
      key: `${b.slug}:${b.profile ?? ''}`,
      value: b.cdrPer20s,
      valueText: `${b.cdrPer20s.toFixed(1)}s/20s`,
      valueTitle:
        'nominal team CDR seconds per 20s Full Burst, averaged over 180s',
      condition: b.condition,
      sub:
        [
          b.ramp ? rampText(b.ramp) : null,
          b.selfCdr != null ? `self-only ${b.selfCdr.toFixed(1)}s` : null,
        ]
          .filter(Boolean)
          .join(' · ') || null,
      ...badge(b),
    }));
  }
  if (board === 'sustain') {
    return sustainBars(art as SustainArtifact).map((b) => ({
      ...b,
      key: `${b.slug}:${b.profile ?? ''}`,
      value: b.totalHp,
      valueText: fmtMagnitude(b.totalHp),
      valueSub: `${b.totalPct.toFixed(0)}% of max HP`,
      valueTitle: 'effective HP restored + shielded over 180s (team total)',
      split:
        b.totalPct > 0
          ? [
              Math.min(1, b.healPct / b.totalPct),
              Math.min(1, b.shieldPct / b.totalPct),
              Math.min(1, b.lifestealPct / b.totalPct),
            ]
          : null,
      splitTitle: `heal ${b.healPct.toFixed(1)}% · shield ${b.shieldPct.toFixed(1)}% · lifesteal ${b.lifestealPct.toFixed(1)}% of max HP`,
      ...badge(b),
    }));
  }
  return bufferBars(art as BufferChartArtifact, opts.bufferBoard).map((b) => ({
    ...b,
    key: `${b.slug}:${b.profile ?? ''}`,
    value: b.addedPct,
    valueText: `${b.addedPct >= 0 ? '+' : '−'}${Math.abs(b.addedPct).toFixed(1)}%`,
    valueTitle: 'total % team damage increase vs the no-op baseline',
    info: null,
    ...badge(b),
  }));
}
