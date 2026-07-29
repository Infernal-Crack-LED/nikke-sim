// Card Builder (/builder) — compose any of the site's infographic cards from
// the published data, see a live client-side preview (the same isomorphic core
// renderers + hosts the tabs' share buttons use), then either copy the PNG or
// mint a hosted, Discord-embeddable URL: pre-rendered cards come straight from
// the manifest, everything else POSTs a RenderSpec to /api/v1/img/render
// (builderSpec.ts owns the state → manifest-key / spec mapping).
import { useEffect, useRef, useState } from 'react';
import { MatrixFilter } from './components/MatrixFilter';
import { PillGrid } from './components/PillGrid';
import charactersJson from '../../data/characters.json';
import type { DataFile } from '../../src/types';
import { loadDpsChart, chartBars, type DpsArtifact } from './dpschartData';
import {
  cellId,
  cellLabel,
  parseCellId,
  type Cell,
} from '../../src/dpschart/matrix';
import {
  loadBurstGen,
  loadBurstCdr,
  loadSustain,
  loadBufferChart,
} from './rankBoardsData';
import {
  buildBurstGenTable,
  buildBurstCdrTable,
  buildSustainTable,
  buildBufferTable,
} from '../../src/infographics/core/rankTables';
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
} from '../../src/ranks/types';
import {
  buildAmmoTable,
  buildChargeTable,
  chargeLatencyFrames,
  GENERIC_BASE_FRAMES,
} from '../../src/infographics/core/tableData';
import {
  drawUnitCardVariant,
  unitCardSize,
  type UnitCardVariant,
} from '../../src/infographics/core/unitCard';
import { buildUnitCardShare } from './unitCardShare';
import type { DpsChartData } from '../../src/infographics/core/dpsChart';
import type { TableCardData } from '../../src/infographics/core/tableCard';
import type { Canvas2DLike } from '../../src/infographics/core/canvas2d';
import { ELEMENT_FILTERS } from '../../src/infographics/spec';
import { ensureRoboto, loadPortrait, copyOrDownloadPng } from './teamShare';
import { buildDpsChartCanvas } from './shareImage';
import { buildTableCardCanvas, loadOlDefaultTable } from './tableShare';
import {
  manifestKeyFor,
  renderSpecFor,
  type BuilderState,
  type BuilderCardType,
  type BuilderBoard,
  type BuilderDpsMode,
  type ImgManifest,
} from './builderSpec';

const data = charactersJson as unknown as DataFile;

const DEFAULT_CELL: Cell = {
  framework: 'solo',
  eleadv: 'neutral',
  core: 'c100',
  invest: 'scope',
};

const CARD_TYPES: { key: BuilderCardType; label: string }[] = [
  { key: 'dps', label: 'DPS chart' },
  { key: 'rank', label: 'Rank board' },
  { key: 'unit', label: 'Unit card' },
  { key: 'ol', label: 'OL table' },
  { key: 'charge', label: 'Charge speed' },
  { key: 'ammo', label: 'Max ammo' },
];

const BOARDS: { key: BuilderBoard; label: string }[] = [
  { key: 'burstgen', label: 'Burst Gen' },
  { key: 'burstcdr', label: 'Burst CDR' },
  { key: 'sustain', label: 'Sustain' },
  { key: 'buffer', label: 'Buffer' },
];

// Unit-card shapes. `discord` is the 2:1 landscape card the bot embeds and the
// site shares; `twitter` is the 3:4 portrait launch asset (measured to render
// UNCROPPED in the X timeline, where it gets ~2x the real estate of the
// landscape card at the same width).
const UNIT_VARIANTS: { key: UnitCardVariant; label: string }[] = [
  { key: 'discord', label: 'Landscape (Discord)' },
  { key: 'twitter', label: 'Portrait (X)' },
];

const DPS_MODES: { key: BuilderDpsMode; label: string }[] = [
  { key: 'top', label: 'Top 10' },
  { key: 'window', label: 'Unit window' },
  { key: 'compare', label: 'Compare units' },
];

const RANK_LOADERS = {
  burstgen: loadBurstGen,
  burstcdr: loadBurstCdr,
  sustain: loadSustain,
  buffer: loadBufferChart,
} as const;

const cap = (el: string) => el[0].toUpperCase() + el.slice(1);

// Unit pickers' option lists (characters.json is a static import — computed once).
const ALL_UNITS = Object.values(data.characters)
  .map((c) => ({ slug: c.slug, name: c.name, element: c.element }))
  .sort((a, b) => a.name.localeCompare(b.name));
const CHARGE_UNITS = Object.values(data.characters)
  .filter((c) => (c.weapon === 'SR' || c.weapon === 'RL') && c.chargeFrames > 0)
  .map((c) => ({ slug: c.slug, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));
const AMMO_UNITS = Object.values(data.characters)
  .filter((c) => c.ammo > 0)
  .map((c) => ({ slug: c.slug, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Fill in the state's implicit picks (a select's value when the user hasn't
// chosen yet, compare picks pruned to the live population) so the preview,
// the copy button and the hosted-URL button all act on ONE state.
function effectiveState(
  s: BuilderState,
  population: { slug: string }[]
): BuilderState {
  if (s.card === 'dps') {
    const pop = new Set(population.map((p) => p.slug));
    const units = s.units.filter((u) => pop.has(u));
    const unit =
      s.unit && pop.has(s.unit) ? s.unit : (population[0]?.slug ?? '');
    return { ...s, unit, units };
  }
  if (s.card === 'unit') {
    return { ...s, unit: s.unit || (ALL_UNITS[0]?.slug ?? '') };
  }
  if (s.card === 'ammo') {
    return { ...s, unit: s.unit || (AMMO_UNITS[0]?.slug ?? '') };
  }
  return s;
}

// The img API's manifest.json (pre-rendered set), fetched once. Same-origin —
// a deployment predating the img API 404s here and the page falls back to a
// graceful error + Copy image.
let manifestPromise: Promise<ImgManifest> | null = null;
function loadImgManifest(): Promise<ImgManifest> {
  manifestPromise ??= fetch('/api/v1/img/manifest.json').then((r) => {
    if (!r.ok) {
      throw new Error(`manifest ${r.status}`);
    }
    return r.json() as Promise<ImgManifest>;
  });
  return manifestPromise;
}

export function BuilderPage() {
  const [s, setS] = useState<BuilderState>({
    card: 'dps',
    cell: 'solo.eleweak.c100.8of12',
    element: null,
    dpsMode: 'top',
    unit: '',
    units: [],
    board: 'burstgen',
    unitVariant: 'discord',
  });
  const [dpsArt, setDpsArt] = useState<DpsArtifact | null>(null);
  const [rankArts, setRankArts] = useState<
    Partial<Record<BuilderBoard, unknown>>
  >({});
  const [olTable, setOlTable] = useState<TableCardData | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const cellObj = parseCellId(s.cell) ?? DEFAULT_CELL;
  const ele = s.element ? cap(s.element) : null;
  const population =
    s.card === 'dps' && dpsArt ? chartBars(dpsArt, cellObj, ele, Infinity) : [];
  const eff = effectiveState(s, population);
  const effKey = JSON.stringify(eff);

  // Lazy data loads — only what the active card type reads.
  useEffect(() => {
    if (s.card !== 'dps' || dpsArt) {
      return;
    }
    let alive = true;
    loadDpsChart()
      .then((a) => alive && setDpsArt(a))
      .catch((e) => alive && setLoadErr(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [s.card, dpsArt]);
  useEffect(() => {
    if (s.card !== 'rank' || rankArts[s.board]) {
      return;
    }
    let alive = true;
    RANK_LOADERS[s.board]()
      .then((a) => alive && setRankArts((prev) => ({ ...prev, [s.board]: a })))
      .catch((e) => alive && setLoadErr(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [s.card, s.board, rankArts]);
  useEffect(() => {
    if (s.card !== 'ol' || olTable) {
      return;
    }
    let alive = true;
    loadOlDefaultTable()
      .then((t) => alive && setOlTable(t))
      .catch((e) => alive && setLoadErr(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [s.card, olTable]);

  // Draw the card for the given state to an offscreen canvas (scale 2) — ONE
  // path shared by the live preview and the Copy-image button.
  async function renderCard(
    state: BuilderState
  ): Promise<HTMLCanvasElement | null> {
    switch (state.card) {
      case 'dps': {
        if (!dpsArt) {
          return null;
        }
        const pop = population;
        const picked = pop.filter((b) => state.units.includes(b.slug));
        const chartData: DpsChartData = {
          title: cellLabel(cellObj) + (ele ? ` · ${ele} only` : ''),
          subtitle:
            state.dpsMode === 'window'
              ? `windowed on ${pop.find((b) => b.slug === state.unit)?.name ?? state.unit}`
              : state.dpsMode === 'compare'
                ? `${picked.length}-unit comparison`
                : undefined,
          topDps: pop[0]?.dps ?? 0,
          bars: (state.dpsMode === 'compare' ? picked : pop).map((b) => ({
            name: b.name,
            element: b.element,
            dps: b.dps,
            slug: b.slug,
            imageUrl: b.imageUrl,
          })),
          window:
            state.dpsMode === 'compare'
              ? undefined
              : state.dpsMode === 'window'
                ? { targetSlug: state.unit }
                : {}, // §6.6 top-10
          footer: 'nikkesim.app/dpschart',
        };
        return buildDpsChartCanvas(chartData);
      }
      case 'rank': {
        const art = rankArts[state.board];
        if (!art) {
          return null;
        }
        const table: TableCardData =
          state.board === 'burstgen'
            ? buildBurstGenTable(art as BurstGenArtifact)
            : state.board === 'burstcdr'
              ? buildBurstCdrTable(art as BurstCdrArtifact)
              : state.board === 'sustain'
                ? buildSustainTable(art as SustainArtifact)
                : buildBufferTable(art as BufferChartArtifact, 'generic');
        return buildTableCardCanvas(table);
      }
      case 'unit': {
        const c = data.characters[state.unit];
        if (!c) {
          return null;
        }
        // The unit card now joins the five rank boards, so the preview loads
        // whatever the page has and passes the rest as null — every field is
        // nullable and the card draws an absent-state, so a board that hasn't
        // been fetched thins the card rather than breaking it.
        const [img] = await Promise.all([
          c.imageUrl ? loadPortrait(c.imageUrl) : null,
          ensureRoboto(),
        ]);
        const card = await buildUnitCardShare(
          state.unit,
          {
            dpschart: dpsArt,
            burstgen: rankArts.burstgen as BurstGenArtifact | undefined,
            burstcdr: rankArts.burstcdr as BurstCdrArtifact | undefined,
            sustain: rankArts.sustain as SustainArtifact | undefined,
            bufferchart: rankArts.buffer as BufferChartArtifact | undefined,
          },
          img,
          undefined,
          state.unitVariant
        );
        if (!card) {
          return null;
        }
        const { w, h, dpr } = unitCardSize(state.unitVariant);
        const cv = document.createElement('canvas');
        cv.width = w * dpr;
        cv.height = h * dpr;
        const ctx = cv.getContext('2d');
        if (!ctx) {
          return null;
        }
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        drawUnitCardVariant(ctx as unknown as Canvas2DLike, card, state.unitVariant);
        return cv;
      }
      case 'ol': {
        return olTable ? buildTableCardCanvas(olTable) : null;
      }
      case 'charge':
      case 'ammo': {
        const c = state.unit ? data.characters[state.unit] : null;
        const table: TableCardData =
          state.card === 'charge'
            ? c
              ? // autofire units take no release latency (datamined input_type)
                buildChargeTable(c.chargeFrames, c.name, chargeLatencyFrames(c))
              : buildChargeTable(GENERIC_BASE_FRAMES, 'Generic (1.0s)')
            : c
              ? buildAmmoTable(c.ammo, c.name)
              : buildAmmoTable(1, '—');
        if (c?.imageUrl) {
          table.portrait = (await loadPortrait(c.imageUrl)) ?? undefined;
        }
        return buildTableCardCanvas(table);
      }
    }
  }

  // Live preview — repaint the visible canvas whenever the card (or its data)
  // changes. effKey is the serialized effective state; parsing it back inside
  // keeps the effect's dependency list honest.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const state = JSON.parse(effKey) as BuilderState;
    setPreviewBusy(true);
    renderCard(state)
      .then((cv) => {
        if (!alive) {
          return;
        }
        setPreviewBusy(false);
        const target = canvasRef.current;
        if (!cv || !target) {
          return;
        }
        target.width = cv.width;
        target.height = cv.height;
        target.getContext('2d')?.drawImage(cv, 0, 0);
      })
      .catch(() => alive && setPreviewBusy(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effKey, dpsArt, rankArts, olTable]);

  // Narrow layouts stack controls above the preview (ResizeObserver, not a
  // window resize listener — the PillGrid pattern).
  const gridRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 780));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Copy image + hosted URL ---------------------------------------------
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [hostErr, setHostErr] = useState<string | null>(null);
  const [hosting, setHosting] = useState(false);
  // a parameter change invalidates a previously minted URL
  useEffect(() => {
    setHostedUrl(null);
    setHostErr(null);
  }, [effKey]);

  const onCopyImage = () => {
    void renderCard(eff).then((cv) => {
      if (!cv) {
        return;
      }
      cv.toBlob((b) => {
        if (b) {
          void copyOrDownloadPng(b, 'nikke-card.png');
        }
      }, 'image/png');
    });
  };

  const onGetUrl = async () => {
    setHosting(true);
    setHostErr(null);
    setHostedUrl(null);
    try {
      const key = manifestKeyFor(eff);
      if (key) {
        const man = await loadImgManifest();
        const img = man.images?.[key];
        if (!img) {
          throw new Error(`no pre-rendered image for '${key}'`);
        }
        setHostedUrl(`${window.location.origin}/api/v1/img/${img.file}`);
        return;
      }
      const spec = renderSpecFor(eff);
      if (!spec) {
        setHostErr(
          'Pick at least one unit first — then the card can be hosted.'
        );
        return;
      }
      const res = await fetch('/api/v1/img/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(spec),
      });
      const body = await res.text();
      if (!res.ok) {
        let msg = body;
        try {
          msg = (JSON.parse(body) as { error?: string }).error ?? body;
        } catch {
          /* plain-text error body */
        }
        throw new Error(msg || `render failed (${res.status})`);
      }
      const { url } = JSON.parse(body) as { url: string };
      setHostedUrl(`${window.location.origin}${url}`);
    } catch (e) {
      setHostErr(
        `Couldn't get a hosted URL (${e instanceof Error ? e.message : String(e)}). ` +
          'The image API may be unreachable from this deployment — use Copy image instead.'
      );
    } finally {
      setHosting(false);
    }
  };

  const toggleCmpUnit = (slug: string) =>
    setS((cur) => ({
      ...cur,
      units: cur.units.includes(slug)
        ? cur.units.filter((u) => u !== slug)
        : cur.units.length < 10
          ? [...cur.units, slug]
          : cur.units,
    }));

  return (
    <div className="app builder-page">
      <header>
        <h1>Card Builder</h1>
        <p className="muted">
          Compose a share card from the site’s data — a DPS chart, rank board,
          unit card, or overload table — then copy the image or mint a hosted
          URL you can paste into Discord.
        </p>
      </header>
      {loadErr && (
        <p className="muted">Some card data failed to load ({loadErr}).</p>
      )}
      <div className={`builder-grid${narrow ? ' narrow' : ''}`} ref={gridRef}>
        <div className="builder-controls card">
          <div className="field">
            <label>Card type</label>
            <PillGrid>
              {CARD_TYPES.map((t) => (
                <button
                  key={t.key}
                  className={s.card === t.key ? 'on' : ''}
                  onClick={() => setS((cur) => ({ ...cur, card: t.key }))}
                >
                  {t.label}
                </button>
              ))}
            </PillGrid>
          </div>

          {s.card === 'dps' && (
            <>
              <div className="field">
                <label>Chart cell</label>
                <MatrixFilter
                  cell={cellObj}
                  onChange={(c) =>
                    setS((cur) => ({ ...cur, cell: cellId(c), units: [] }))
                  }
                />
              </div>
              <div className="field">
                <label>Element</label>
                <PillGrid>
                  {([null, ...ELEMENT_FILTERS] as (string | null)[]).map(
                    (e) => (
                      <button
                        key={e ?? 'all'}
                        className={s.element === e ? 'on' : ''}
                        onClick={() =>
                          setS((cur) => ({ ...cur, element: e, units: [] }))
                        }
                      >
                        {e ? cap(e) : 'All'}
                      </button>
                    )
                  )}
                </PillGrid>
              </div>
              <div className="field">
                <label>Rows</label>
                <PillGrid>
                  {DPS_MODES.map((m) => (
                    <button
                      key={m.key}
                      className={s.dpsMode === m.key ? 'on' : ''}
                      onClick={() =>
                        setS((cur) => ({ ...cur, dpsMode: m.key }))
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </PillGrid>
              </div>
              {s.dpsMode === 'window' && (
                <div className="field">
                  <label>Windowed unit</label>
                  <select
                    value={eff.unit}
                    onChange={(e) =>
                      setS((cur) => ({ ...cur, unit: e.target.value }))
                    }
                  >
                    {population.map((b) => (
                      <option key={b.slug} value={b.slug}>
                        #{b.rank} {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {s.dpsMode === 'compare' && (
                <div className="field">
                  <label>
                    Compared units ({eff.units.length}/10 — rank order is kept)
                  </label>
                  <div className="pills">
                    {population.map((b) => (
                      <button
                        key={b.slug}
                        className={eff.units.includes(b.slug) ? 'on' : ''}
                        onClick={() => toggleCmpUnit(b.slug)}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {s.card === 'rank' && (
            <div className="field">
              <label>Board</label>
              <PillGrid>
                {BOARDS.map((b) => (
                  <button
                    key={b.key}
                    className={s.board === b.key ? 'on' : ''}
                    onClick={() => setS((cur) => ({ ...cur, board: b.key }))}
                  >
                    {b.label}
                  </button>
                ))}
              </PillGrid>
            </div>
          )}

          {s.card === 'unit' && (
            <div className="field">
              <label>Unit</label>
              <select
                value={eff.unit}
                onChange={(e) =>
                  setS((cur) => ({ ...cur, unit: e.target.value }))
                }
              >
                {ELEMENT_FILTERS.map((el) => {
                  const group = ALL_UNITS.filter((u) => u.element === cap(el));
                  return group.length ? (
                    <optgroup key={el} label={cap(el)}>
                      {group.map((u) => (
                        <option key={u.slug} value={u.slug}>
                          {u.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
            </div>
          )}

          {s.card === 'unit' && (
            <div className="field">
              <label>Shape</label>
              <PillGrid>
                {UNIT_VARIANTS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className={s.unitVariant === v.key ? 'pill on' : 'pill'}
                    onClick={() =>
                      setS((cur) => ({ ...cur, unitVariant: v.key }))
                    }
                  >
                    {v.label}
                  </button>
                ))}
              </PillGrid>
            </div>
          )}

          {s.card === 'charge' && (
            <div className="field">
              <label>Unit</label>
              <select
                value={s.unit}
                onChange={(e) =>
                  setS((cur) => ({ ...cur, unit: e.target.value }))
                }
              >
                <option value="">Generic (1.0s)</option>
                {CHARGE_UNITS.map((u) => (
                  <option key={u.slug} value={u.slug}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {s.card === 'ammo' && (
            <div className="field">
              <label>Unit</label>
              <select
                value={eff.unit}
                onChange={(e) =>
                  setS((cur) => ({ ...cur, unit: e.target.value }))
                }
              >
                {AMMO_UNITS.map((u) => (
                  <option key={u.slug} value={u.slug}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {s.card === 'ol' && (
            <p className="muted">
              The default overload-lines table (no options).
            </p>
          )}
        </div>

        <div className="builder-preview card">
          <canvas ref={canvasRef} aria-label="Card preview" />
          {previewBusy && <p className="muted">Rendering…</p>}
          <div className="builder-actions">
            <button className="chip" onClick={onCopyImage}>
              📋 Copy image
            </button>
            <button
              className="chip"
              disabled={hosting}
              onClick={() => void onGetUrl()}
            >
              {hosting ? 'Rendering…' : '🔗 Get hosted URL'}
            </button>
          </div>
          {hostedUrl && (
            <div className="builder-url">
              <input
                readOnly
                value={hostedUrl}
                onFocus={(e) => e.target.select()}
              />
              <button
                className="chip"
                onClick={() => void navigator.clipboard?.writeText(hostedUrl)}
              >
                Copy link
              </button>
            </div>
          )}
          {hostErr && <p className="muted">{hostErr}</p>}
        </div>
      </div>
    </div>
  );
}
