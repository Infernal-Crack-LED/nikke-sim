// DPS Chart tab — 3 named headliner groups (each the 3 core variants) + a filterable
// full-matrix section, over the precomputed artifact. A single compare-unit selector
// annotates every visible chart with that B3's rank. Per-chart share (link + image).
import { useEffect, useState } from 'react';
import { DpsBarChart } from './components/DpsBarChart';
import { MatrixFilter } from './components/MatrixFilter';
import {
  loadDpsChart, chartBars, compareIn, allUnits,
  type DpsArtifact, type BarEntry,
} from './dpschartData';
import {
  HEADLINERS, CORES, FRAMEWORKS, ELEADVS, INVESTS, FRAMEWORK_IDS,
  cellId, cellLabel, parseCellId, type Cell,
} from '../../src/dpschart/matrix';
import { copyDpsChartImage } from './shareImage';
import type { DpsChartData } from '../../src/share/dpsChart';

const DEFAULT_CELL: Cell = { framework: 'standard', eleadv: 'neutral', core: 'c100', invest: 'scope' };

function toChartData(title: string, bars: BarEntry[], compare: (BarEntry & { total: number }) | null): DpsChartData {
  return {
    title,
    bars: bars.map((b) => ({ name: b.name, element: b.element, dps: b.dps })),
    compare: compare
      ? { name: compare.name, element: compare.element, dps: compare.dps, rank: compare.rank, total: compare.total }
      : null,
  };
}

export function DpsChartTab() {
  const [art, setArt] = useState<DpsArtifact | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const params = new URLSearchParams(window.location.search);
  const [compareSlug, setCompareSlug] = useState<string>(params.get('cmp') ?? '');
  const [cell, setCell] = useState<Cell>(parseCellId(params.get('chart') ?? '') ?? DEFAULT_CELL);

  useEffect(() => {
    loadDpsChart().then(setArt).catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  if (err) {
    return (
      <section className='calc-tab'>
        <h2>DPS Chart</h2>
        <p className='muted'>Couldn’t load chart data ({err}). Regenerate it with <code>npm run dpschart</code>.</p>
      </section>
    );
  }
  if (!art) {
    return (
      <section className='calc-tab'>
        <h2>DPS Chart</h2>
        <p className='muted'>Loading chart data…</p>
      </section>
    );
  }

  const units = allUnits(art);

  const shareLink = (c: Cell) => {
    const u = new URL(window.location.href);
    u.searchParams.set('chart', cellId(c));
    if (compareSlug) u.searchParams.set('cmp', compareSlug);
    else u.searchParams.delete('cmp');
    void navigator.clipboard?.writeText(u.toString());
  };

  const renderChart = (c: Cell, pageTitle: string, pageSubtitle?: string) => {
    const bars = chartBars(art, c);
    const cmp = compareSlug ? compareIn(art, c, compareSlug) : null;
    return (
      <DpsBarChart
        key={cellId(c)}
        title={pageTitle}
        subtitle={pageSubtitle}
        bars={bars}
        compare={cmp}
        onShareLink={() => shareLink(c)}
        onShareImage={() => void copyDpsChartImage(toChartData(cellLabel(c), bars, cmp))}
      />
    );
  };

  return (
    <section className='calc-tab dpschart-tab'>
      <h2>DPS Chart</h2>
      <p className='muted'>
        Top-10 B3 carries (SSS/SS bossing tier) under standardized control frameworks, 180s.
        Pick any B3 below to append its rank to every chart.
      </p>

      <details className='dpschart-frameworks'>
        <summary>Control frameworks</summary>
        <dl>
          {FRAMEWORK_IDS.map((id) => (
            <div key={id}>
              <dt>{FRAMEWORKS[id].label}</dt>
              <dd>{FRAMEWORKS[id].blurb}</dd>
            </div>
          ))}
        </dl>
        <p className='muted'>
          Elements: <b>Neutral</b> = no advantage; <b>Ele Weak</b> = the boss is weak to the
          tested unit only. Core = boss-core exposure (0/50/100%, with the ~85% auto-aim floor).
          Investment: <b>Scope Lock</b> (no cube/doll, OL0) · <b>8/12</b> (Other cube L10, OL5,
          doll, 4 elem + 4 ATK) · <b>12/12</b> (Other cube L15, + 4 per-unit-optimal lines).
        </p>
      </details>

      <div className='dpschart-compare-pick'>
        <label>Compare a unit</label>
        <select value={compareSlug} onChange={(e) => setCompareSlug(e.target.value)}>
          <option value=''>— none —</option>
          {units.map((u) => (
            <option key={u.slug} value={u.slug}>{u.name} ({u.tier})</option>
          ))}
        </select>
      </div>

      {HEADLINERS.map((h) => (
        <div className='dpschart-headliner' key={h.slug}>
          <h3>{h.name}</h3>
          <div className='dpschart-grid'>
            {h.cells.map((c) =>
              renderChart(
                c,
                CORES[c.core].label,
                `${FRAMEWORKS[h.framework].label} · ${ELEADVS[h.eleadv].label} · ${INVESTS[h.invest].label}`,
              ),
            )}
          </div>
        </div>
      ))}

      <div className='dpschart-matrix'>
        <h3>Full matrix</h3>
        <MatrixFilter cell={cell} onChange={setCell} />
        <div className='dpschart-grid one'>{renderChart(cell, cellLabel(cell))}</div>
      </div>
    </section>
  );
}
