// DPS Chart tab — 3 named headliner groups (each the 3 core variants) + a filterable
// full-matrix section, over the precomputed artifact. A single compare-unit selector
// annotates every visible chart with that B3's rank. Per-chart share (link + image).
import { useEffect, useState } from 'react';
import { DpsBarChart } from './components/DpsBarChart';
import { MatrixFilter } from './components/MatrixFilter';
import { PillGrid } from './components/PillGrid';
import {
  loadDpsChart,
  chartBars,
  compareIn,
  allUnits,
  type DpsArtifact,
  type BarEntry,
} from './dpschartData';
import {
  HEADLINERS,
  SOLO_HEADLINERS,
  CORES,
  FRAMEWORKS,
  ELEADVS,
  INVESTS,
  FRAMEWORK_IDS,
  cellId,
  cellLabel,
  parseCellId,
  type Cell,
} from '../../src/dpschart/matrix';
import { copyDpsChartImage } from './shareImage';
import type { DpsChartData } from '../../src/infographics/core/dpsChart';

const DEFAULT_CELL: Cell = {
  framework: 'solo',
  eleadv: 'neutral',
  core: 'c100',
  invest: 'scope',
};

// top-level headliner set: the Solo isolation control (default) or the named-support Team comps
type FwMode = 'solo' | 'team';
const HEADLINERS_BY_MODE: Record<FwMode, typeof HEADLINERS> = {
  solo: SOLO_HEADLINERS,
  team: HEADLINERS,
};

// element filter for every bar chart on the page (null = All, the full population)
const ELEMENT_FILTERS = ['Fire', 'Water', 'Wind', 'Electric', 'Iron'] as const;
type EleFilter = (typeof ELEMENT_FILTERS)[number] | null;
const coerceEleFilter = (v: string | null): EleFilter =>
  (ELEMENT_FILTERS as readonly string[]).includes(v ?? '')
    ? (v as EleFilter)
    : null;

// Shared-image payload: the FULL ranked population (not the inline top-10) with
// an explicit §6.6 top-10 window request — shared images are windowed; the
// population #1's dps anchors every label (topDps), not the window max.
function toChartData(
  title: string,
  population: BarEntry[],
  compare: (BarEntry & { total: number }) | null
): DpsChartData {
  return {
    title,
    topDps: population[0]?.dps ?? 0,
    bars: population.map((b) => ({
      name: b.name,
      element: b.element,
      dps: b.dps,
      slug: b.slug,
      imageUrl: b.imageUrl,
    })),
    window: {},
    compare: compare
      ? {
          name: compare.name,
          element: compare.element,
          dps: compare.dps,
          rank: compare.rank,
          total: compare.total,
        }
      : null,
  };
}

// Multi-unit comparison card: exactly the picked units' bars in population
// rank order (the population is sorted desc), NO §6.6 window — the draw shows
// the subset as-is. topDps stays the FULL population #1 so relScore labels
// are comparable with every other image of the same cell (mirrors the API's
// ?units= variant; the subtitle states the comparison).
function toComparisonChartData(
  title: string,
  population: BarEntry[],
  picked: BarEntry[]
): DpsChartData {
  return {
    title,
    subtitle: `${picked.length}-unit comparison`,
    topDps: population[0]?.dps ?? 0,
    bars: picked.map((b) => ({
      name: b.name,
      element: b.element,
      dps: b.dps,
      slug: b.slug,
      imageUrl: b.imageUrl,
    })),
  };
}

export function DpsChartTab() {
  const [art, setArt] = useState<DpsArtifact | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const params = new URLSearchParams(window.location.search);
  const [compareSlug, setCompareSlug] = useState<string>(
    params.get('cmp') ?? ''
  );
  const [cell, setCell] = useState<Cell>(
    parseCellId(params.get('chart') ?? '') ?? DEFAULT_CELL
  );
  const [eleFilter, setEleFilter] = useState<EleFilter>(
    coerceEleFilter(params.get('ele'))
  );
  const [fwMode, setFwMode] = useState<FwMode>(
    params.get('fw') === 'team' ? 'team' : 'solo'
  );
  // Multi-unit comparison selection (slugs) for the full-matrix chart — the
  // same picks drive the "Share comparison" card (subset of the population,
  // no §6.6 window; mirrors the API's ?units= dps.png variant).
  const [cmpUnits, setCmpUnits] = useState<string[]>([]);

  useEffect(() => {
    loadDpsChart()
      .then(setArt)
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  // A cell/element change swaps the population — drop picks that are no
  // longer charted so the selection count and the share card stay honest.
  useEffect(() => {
    if (!art || cmpUnits.length === 0) {
      return;
    }
    const pop = new Set(
      chartBars(art, cell, eleFilter, Infinity).map((b) => b.slug)
    );
    const kept = cmpUnits.filter((s) => pop.has(s));
    if (kept.length !== cmpUnits.length) {
      setCmpUnits(kept);
    }
  }, [art, cell, eleFilter, cmpUnits]);

  if (err) {
    // dev note: if this persists locally, regenerate the artifact with `npm run dpschart`
    return (
      <section className="calc-tab">
        <h2>DPS Rankings</h2>
        <p className="muted">
          The rankings data failed to load ({err}). Try refreshing the page — if
          it keeps failing, report it in the Discord (link in the footer).
        </p>
      </section>
    );
  }
  if (!art) {
    return (
      <section className="calc-tab">
        <h2>DPS Rankings</h2>
        <p className="muted">Loading chart data…</p>
      </section>
    );
  }

  const units = allUnits(art);

  const shareLink = (c: Cell) => {
    const u = new URL(window.location.href);
    u.searchParams.set('chart', cellId(c));
    if (compareSlug) {
      u.searchParams.set('cmp', compareSlug);
    } else {
      u.searchParams.delete('cmp');
    }
    if (eleFilter) {
      u.searchParams.set('ele', eleFilter);
    } else {
      u.searchParams.delete('ele');
    }
    if (fwMode === 'team') {
      u.searchParams.set('fw', 'team');
    } else {
      u.searchParams.delete('fw');
    }
    void navigator.clipboard?.writeText(u.toString());
  };

  const renderChart = (c: Cell, pageTitle: string, pageSubtitle?: string) => {
    const bars = chartBars(art, c, eleFilter);
    // full ranked population for the shared image (the inline chart keeps top-10)
    const population = chartBars(art, c, eleFilter, Infinity);
    const cmp = compareSlug ? compareIn(art, c, compareSlug, eleFilter) : null;
    const shareTitle = eleFilter
      ? `${cellLabel(c)} · ${eleFilter} only`
      : cellLabel(c);
    return (
      <DpsBarChart
        key={cellId(c)}
        title={pageTitle}
        subtitle={pageSubtitle}
        bars={bars}
        compare={cmp}
        onShareLink={() => shareLink(c)}
        onShareImage={() =>
          void copyDpsChartImage(toChartData(shareTitle, population, cmp))
        }
      />
    );
  };

  return (
    <section className="calc-tab dpschart-tab">
      <h2>DPS Rankings</h2>
      <p className="muted">
        Top-10 B3 carries by DPS under standardized control frameworks, 180s
        fight length. Scores are normalized to the chart’s #1 (rank 1 = 1.00;
        each row = its DPS ÷ the #1’s DPS, so 0.95 ≈ 95% of the top unit’s
        damage; hover a score for the raw DPS). Pick any B3 below to append its
        score and rank to every chart.
      </p>

      <details className="dpschart-frameworks">
        <summary>Control frameworks</summary>
        <dl>
          {FRAMEWORK_IDS.map((id) => (
            <div key={id}>
              <dt>{FRAMEWORKS[id].label}</dt>
              <dd>{FRAMEWORKS[id].blurb}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">
          Elements: <b>Neutral</b> = no advantage; <b>Ele Weak</b> = the boss is
          weak to the tested unit only. Core = boss-core exposure (0/50/100%,
          with the ~85% auto-aim floor). Investment: <b>Scope Lock</b> (no
          cube/doll, OL0) · <b>8/12</b> (Other cube L10, OL5, doll, 4 elem + 4
          ATK) · <b>12/12</b> (Other cube L15, + 4 per-unit-optimal lines).
        </p>
      </details>

      <details className="dpschart-frameworks">
        <summary>Custom profiles</summary>
        <dl>
          <div>
            <dt>Bready</dt>
            <dd>
              Modeled in her <b>Distributed</b> taste (Recommended Taste — the
              distributed-damage-buff branch).
            </dd>
          </div>
          <div>
            <dt>Diesel: Winter Sweets</dt>
            <dd>
              Modeled as bursting <b>second</b> (her Highlight state deals more
              sustained damage than bursting first) — but burst-order modeling
              isn’t implemented yet, so her chart score still uses the Intro
              (bursts-first) numbers.
            </dd>
          </div>
          <div>
            <dt>Red Hood &amp; Rapi: Red Hood</dt>
            <dd>
              Operate as <b>Burst III</b> (B3).
            </dd>
          </div>
          <div>
            <dt>Favorite items</dt>
            <dd>
              Every favorite-item unit is assumed to have its favorite item{' '}
              <b>fully unlocked</b>.
            </dd>
          </div>
        </dl>
      </details>

      <div className="dpschart-compare-pick">
        <label>Compare a unit</label>
        <select
          value={compareSlug}
          onChange={(e) => setCompareSlug(e.target.value)}
        >
          <option value="">— none —</option>
          {(['Fire', 'Water', 'Wind', 'Electric', 'Iron'] as const).map(
            (ele) => {
              // a unit whose kit grants a second code's advantage (Rapi: Red Hood is
              // Fire + Iron) is listed under both of its elements
              const group = units.filter((u) => u.elements.includes(ele));
              if (!group.length) {
                return null;
              }
              return (
                <optgroup key={ele} label={ele}>
                  {group.map((u) => (
                    <option key={u.slug} value={u.slug}>
                      {u.name} ({u.tier})
                    </option>
                  ))}
                </optgroup>
              );
            }
          )}
        </select>
      </div>

      <div className="field">
        <label title="which control framework the headliner infographics use">
          Framework
        </label>
        <PillGrid>
          <button
            className={fwMode === 'solo' ? 'on' : ''}
            onClick={() => setFwMode('solo')}
          >
            Solo Framework
          </button>
          <button
            className={fwMode === 'team' ? 'on' : ''}
            onClick={() => setFwMode('team')}
          >
            Team Framework
          </button>
        </PillGrid>
      </div>

      <div className="field">
        <label title="restrict every chart to B3s of one element">
          Element
        </label>
        <PillGrid>
          {([null, ...ELEMENT_FILTERS] as EleFilter[]).map((e) => (
            <button
              key={e ?? 'all'}
              className={eleFilter === e ? 'on' : ''}
              onClick={() => setEleFilter(e)}
            >
              {e ?? 'All'}
            </button>
          ))}
        </PillGrid>
      </div>

      {HEADLINERS_BY_MODE[fwMode].map((h) => (
        <div className="dpschart-headliner" key={h.slug}>
          <h3>{h.name}</h3>
          <div className="dpschart-grid">
            {h.cells.map((c) =>
              renderChart(
                c,
                CORES[c.core].label,
                `${FRAMEWORKS[h.framework].label} · ${ELEADVS[h.eleadv].label} · ${INVESTS[h.invest].label}`
              )
            )}
          </div>
        </div>
      ))}

      <div className="dpschart-matrix">
        <h3>Full matrix</h3>
        <MatrixFilter cell={cell} onChange={setCell} />
        <details className="dpschart-compare-units">
          <summary>Compare units…</summary>
          {(() => {
            const population = chartBars(art, cell, eleFilter, Infinity);
            const picked = population.filter((b) => cmpUnits.includes(b.slug));
            const toggle = (slug: string) =>
              setCmpUnits((cur) =>
                cur.includes(slug)
                  ? cur.filter((s) => s !== slug)
                  : cur.length < 10
                    ? [...cur, slug]
                    : cur
              );
            return (
              <>
                <p className="muted">
                  Pick up to 10 units from this chart to share as a head-to-head
                  card ({cmpUnits.length}/10 selected).
                </p>
                <div className="pills">
                  {population.map((b) => (
                    <button
                      key={b.slug}
                      className={cmpUnits.includes(b.slug) ? 'on' : ''}
                      onClick={() => toggle(b.slug)}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
                <div className="dpschart-compare-actions">
                  <button
                    className="chip"
                    disabled={picked.length === 0}
                    title="Copy the comparison card as a PNG"
                    onClick={() =>
                      void copyDpsChartImage(
                        toComparisonChartData(
                          eleFilter
                            ? `${cellLabel(cell)} · ${eleFilter} only`
                            : cellLabel(cell),
                          population,
                          picked
                        )
                      )
                    }
                  >
                    🖼 Share comparison
                  </button>
                  {cmpUnits.length > 0 && (
                    <button className="chip" onClick={() => setCmpUnits([])}>
                      Clear
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </details>
        <div className="dpschart-grid one">
          {renderChart(cell, cellLabel(cell))}
        </div>
      </div>
    </section>
  );
}
