// Self-contained matrix explorer: the 4-axis filter + one ranked chart for the
// selected cell, a compare-unit selector, and per-chart share. Reads the precomputed
// artifact. Used by the DPS Tester tab's "Matrix" mode (and shareable on its own).
import { useEffect, useState } from 'react';
import { DpsBarChart } from './DpsBarChart';
import { MatrixFilter } from './MatrixFilter';
import {
  loadDpsChart, chartBars, compareIn, allUnits,
  type DpsArtifact, type BarEntry,
} from '../dpschartData';
import { cellId, cellLabel, type Cell } from '../../../src/dpschart/matrix';
import { copyDpsChartImage } from '../shareImage';
import type { DpsChartData } from '../../../src/share/dpsChart';

const DEFAULT_CELL: Cell = { framework: 'standard', eleadv: 'neutral', core: 'c100', invest: 'scope' };

function toChartData(title: string, bars: BarEntry[], compare: (BarEntry & { total: number }) | null): DpsChartData {
  return {
    title,
    bars: bars.map((b) => ({ name: b.name, element: b.element, dps: b.dps })),
    compare: compare ? { name: compare.name, element: compare.element, dps: compare.dps, rank: compare.rank, total: compare.total } : null,
  };
}

export function MatrixChart({ initialCell }: { initialCell?: Cell }) {
  const [art, setArt] = useState<DpsArtifact | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cell, setCell] = useState<Cell>(initialCell ?? DEFAULT_CELL);
  const [compareSlug, setCompareSlug] = useState('');

  useEffect(() => { loadDpsChart().then(setArt).catch((e) => setErr(String(e?.message ?? e))); }, []);

  if (err) return <p className='muted'>Couldn’t load chart data ({err}). Regenerate with <code>npm run dpschart</code>.</p>;
  if (!art) return <p className='muted'>Loading chart data…</p>;

  const bars = chartBars(art, cell);
  const cmp = compareSlug ? compareIn(art, cell, compareSlug) : null;
  const shareLink = () => {
    const u = new URL(window.location.href);
    u.searchParams.set('chart', cellId(cell));
    if (compareSlug) u.searchParams.set('cmp', compareSlug); else u.searchParams.delete('cmp');
    void navigator.clipboard?.writeText(u.toString());
  };

  return (
    <div className='matrix-chart'>
      <MatrixFilter cell={cell} onChange={setCell} />
      <div className='dpschart-compare-pick'>
        <label>Compare a unit</label>
        <select value={compareSlug} onChange={(e) => setCompareSlug(e.target.value)}>
          <option value=''>— none —</option>
          {allUnits(art).map((u) => <option key={u.slug} value={u.slug}>{u.name} ({u.tier})</option>)}
        </select>
      </div>
      <div className='dpschart-grid one'>
        <DpsBarChart
          title={cellLabel(cell)}
          bars={bars}
          compare={cmp}
          onShareLink={shareLink}
          onShareImage={() => void copyDpsChartImage(toChartData(cellLabel(cell), bars, cmp))}
        />
      </div>
    </div>
  );
}
