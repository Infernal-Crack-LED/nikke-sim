// Card Builder (/builder) — compose any of the site's infographic cards from
// the published data, see a live client-side preview (the same isomorphic core
// renderers + hosts the tabs' share buttons use), then either copy the PNG or
// mint a hosted, Discord-embeddable URL: pre-rendered cards come straight from
// the manifest, everything else POSTs a RenderSpec to /api/v1/img/render
// (builderSpec.ts owns the state → manifest-key / spec mapping). Hosted as a
// tool tab inside App (addressable at /builder); App provides the .app chrome
// and the "Card Builder" h1, this supplies the picker + preview.
import { useEffect, useRef, useState } from 'react';
import { MatrixFilter } from './components/MatrixFilter';
import { PillGrid } from './components/PillGrid';
import { CharPicker, CharSearch } from './components/CharSearch';
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
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
} from '../../src/ranks/types';
import { barsForBoard } from './rankChartBars';
import { buildRankChartCanvas } from './rankChartShare';
import type { RankChartData } from '../../src/infographics/core/rankChart';
import {
  buildAmmoTable,
  buildChargeTable,
  chargeLatencyFrames,
  GENERIC_BASE_FRAMES,
  buildOlRollTable,
  olTargetFor,
  OL_LINES_PRESETS,
  OL_LINES_LABEL,
  OL_PIECES,
  type OlLinesPreset,
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
import { buildTableCardCanvas } from './tableShare';
import { monteCarloBuild, type McSummary } from '../../src/overload/policy';
import type { OlProbModel } from '../../src/overload/model';
import olProbJson from '../../data/ol-probabilities.json';
import {
  manifestKeyFor,
  renderSpecFor,
  OL_DEFAULT_LINES,
  OL_DEFAULT_TIER,
  type BuilderState,
  type BuilderCardType,
  type BuilderBoard,
  type BuilderDpsMode,
  type ImgManifest,
} from './builderSpec';

const olProbModel = olProbJson as unknown as OlProbModel;
const OL_TRIALS = 20_000; // matches scripts/build-ol-default.ts's default-combo recipe exactly

const data = charactersJson as unknown as DataFile;

const DEFAULT_CELL: Cell = {
  framework: 'solo',
  eleadv: 'neutral',
  core: 'c100',
  invest: 'scope',
};

// Nikke Card leads (and is the default open tab) — it's the single card that
// draws on every other data source here, so it's the natural first stop.
const CARD_TYPES: { key: BuilderCardType; label: string }[] = [
  { key: 'unit', label: 'Nikke Card' },
  { key: 'dps', label: 'DPS Ranks' },
  { key: 'rank', label: 'Support Ranks' },
  { key: 'ol', label: 'Overload Calculator' },
  { key: 'charge', label: 'Charge Speed' },
  { key: 'ammo', label: 'Max Ammo' },
];

const BOARDS: { key: BuilderBoard; label: string; title: string }[] = [
  { key: 'burstgen', label: 'Burst Gen', title: 'Burst Generation' },
  { key: 'burstcdr', label: 'Burst CDR', title: 'Burst Cooldown Reduction' },
  { key: 'sustain', label: 'Sustain', title: 'Sustain' },
  { key: 'buffer', label: 'Team Buffs', title: 'Team Buffs' },
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

// Unit pickers' option lists (characters.json is a static import — computed
// once). Each list is scoped to that card type's real population, and carries
// enough fields (imageUrl/weapon/burst/nicknames) for the CharPicker search UI.
const pickerFields = (c: DataFile['characters'][string]) => ({
  slug: c.slug,
  name: c.name,
  nicknames: c.nicknames,
  imageUrl: c.imageUrl,
  weapon: c.weapon,
  element: c.element,
  burst: c.burst,
});
// Nikke Card content is only meaningful for units that actually have DPS-chart
// / rank-board data behind them — the same support tag that gates the DPS
// chart + generator tools elsewhere on the site (App.tsx's `generatorChars`).
const ALL_UNITS = Object.values(data.characters)
  .filter((c) => c.generatorSupported)
  .map(pickerFields)
  .sort((a, b) => a.name.localeCompare(b.name));
const CHARGE_UNITS = Object.values(data.characters)
  .filter((c) => (c.weapon === 'SR' || c.weapon === 'RL') && c.chargeFrames > 0)
  .map(pickerFields)
  .sort((a, b) => a.name.localeCompare(b.name));
// The charge-speed picker's "no unit picked" state is itself a meaningful
// choice (the generic 1.0s baseline), so it gets a synthetic pool entry
// instead of an empty CharPicker input.
const GENERIC_CHARGE_OPTION = { slug: '__generic__', name: 'Generic (1.0s)' };
const CHARGE_PICKER_POOL = [GENERIC_CHARGE_OPTION, ...CHARGE_UNITS];
const AMMO_UNITS = Object.values(data.characters)
  .filter((c) => c.ammo > 0)
  .map(pickerFields)
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
    card: 'unit',
    cell: 'solo.eleweak.c100.8of12',
    element: null,
    dpsMode: 'top',
    unit: '',
    units: [],
    board: 'burstgen',
    bufferBoard: 'generic',
    burstGenBoard: 'unfocused',
    olLines: OL_DEFAULT_LINES,
    olTier: OL_DEFAULT_TIER,
    unitVariant: 'discord',
  });
  const [dpsArt, setDpsArt] = useState<DpsArtifact | null>(null);
  const [rankArts, setRankArts] = useState<
    Partial<Record<BuilderBoard, unknown>>
  >({});
  const [olMc, setOlMc] = useState<{
    perPiece: McSummary[];
    total: McSummary;
    lines: OlLinesPreset;
    tier: number;
  } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const cellObj = parseCellId(s.cell) ?? DEFAULT_CELL;
  const ele = s.element ? cap(s.element) : null;
  const population =
    s.card === 'dps' && dpsArt ? chartBars(dpsArt, cellObj, ele, Infinity) : [];
  // A profiled unit (e.g. Cinderella: Crystal Wave's MG mode) appears TWICE in
  // `population`, same slug — fine for the ranked bars, but the picker only
  // needs one row per unit; keep the plain (non-profiled) row when there's a
  // choice. BarEntry also lacks nicknames/burst (not part of the dps-chart
  // artifact) — pull those from characters.json.
  const dpsPickerBySlug = new Map<string, (typeof population)[number]>();
  for (const b of population) {
    if (!dpsPickerBySlug.has(b.slug) || b.profile === null) {
      dpsPickerBySlug.set(b.slug, b);
    }
  }
  const dpsPickerPool = Array.from(dpsPickerBySlug.values()).map((b) => ({
    ...b,
    nicknames: data.characters[b.slug]?.nicknames,
    burst: data.characters[b.slug]?.burst,
  }));
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
  // Overload roll cost is a live Monte Carlo (not a fetch) — same trial count
  // + seed as scripts/build-ol-default.ts, so the default 8/12 · T11 combo is
  // numerically identical to the pre-rendered manifest card. Runs off the main
  // render pass (setTimeout 0) so the "computing…" state gets a chance to
  // paint before the ~0.5-1s synchronous roll sim blocks the thread.
  useEffect(() => {
    if (
      s.card !== 'ol' ||
      (olMc?.lines === s.olLines && olMc?.tier === s.olTier)
    ) {
      return;
    }
    let alive = true;
    const lines = s.olLines;
    const tier = s.olTier;
    const id = setTimeout(() => {
      if (!alive) {
        return;
      }
      const target = olTargetFor(lines, tier);
      const targets = Array.from({ length: OL_PIECES }, () => target);
      const result = monteCarloBuild(olProbModel, targets, {
        trials: OL_TRIALS,
      });
      setOlMc({ ...result, lines, tier });
    }, 0);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [s.card, s.olLines, s.olTier, olMc]);
  // The Nikke Card draws on the DPS chart PLUS all four rank boards (every
  // field nullable, see renderCard's 'unit' case) — it's the default tab, so
  // kick off every load it can use instead of waiting on the user to have
  // separately visited the DPS/Rank tabs first.
  useEffect(() => {
    if (s.card !== 'unit') {
      return;
    }
    let alive = true;
    if (!dpsArt) {
      loadDpsChart()
        .then((a) => alive && setDpsArt(a))
        .catch((e) => alive && setLoadErr(String(e?.message ?? e)));
    }
    (Object.keys(RANK_LOADERS) as BuilderBoard[]).forEach((b) => {
      if (rankArts[b]) {
        return;
      }
      RANK_LOADERS[b]()
        .then((a) => alive && setRankArts((prev) => ({ ...prev, [b]: a })))
        .catch((e) => alive && setLoadErr(String(e?.message ?? e)));
    });
    return () => {
      alive = false;
    };
  }, [s.card, dpsArt, rankArts]);

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
        const rawArt = rankArts[state.board];
        if (!rawArt) {
          return null;
        }
        const art = rawArt as
          | BurstGenArtifact
          | BurstCdrArtifact
          | SustainArtifact
          | BufferChartArtifact;
        const allBars = barsForBoard(state.board, art, {
          bufferBoard: state.bufferBoard,
          burstGenBoard: state.burstGenBoard,
        });
        const boardMeta = BOARDS.find((b) => b.key === state.board)!;
        const subMode =
          state.board === 'buffer'
            ? state.bufferBoard
            : state.board === 'burstgen'
              ? state.burstGenBoard
              : null;
        const chartData: RankChartData = {
          title: subMode
            ? `${boardMeta.title} · ${cap(subMode)}`
            : boardMeta.title,
          subtitle: `top 10 of ${allBars.length} · generated ${new Date(art.generatedAt).toLocaleDateString()}`,
          bars: allBars.slice(0, 10),
          footer: 'nikkesim.app/ranks',
        };
        return buildRankChartCanvas(chartData);
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
        drawUnitCardVariant(
          ctx as unknown as Canvas2DLike,
          card,
          state.unitVariant
        );
        return cv;
      }
      case 'ol': {
        if (
          !olMc ||
          olMc.lines !== state.olLines ||
          olMc.tier !== state.olTier
        ) {
          return null;
        }
        const table = buildOlRollTable(
          state.olLines,
          state.olTier,
          olMc,
          OL_TRIALS
        );
        return buildTableCardCanvas(table);
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
  }, [effKey, dpsArt, rankArts, olMc]);

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
          eff.card === 'rank' || eff.card === 'ol'
            ? "This exact card isn't hosted yet — use Copy image instead."
            : 'Pick at least one unit first — then the card can be hosted.'
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
    <section className="calc-tab builder-page">
      <p className="muted">
        Compose a share card from the site’s data — a DPS chart, rank board,
        unit card, or overload table — then copy the image or mint a hosted URL
        you can paste into Discord.
      </p>
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
                  <CharPicker
                    selectedSlug={eff.unit || null}
                    pool={dpsPickerPool}
                    onPick={(slug) => setS((cur) => ({ ...cur, unit: slug }))}
                  />
                </div>
              )}
              {s.dpsMode === 'compare' && (
                <div className="field">
                  <label>
                    Compared units ({eff.units.length}/10 — rank order is kept)
                  </label>
                  <CharSearch
                    placeholder="add a nikke on the chart…"
                    exclude={eff.units}
                    pool={dpsPickerPool}
                    onPick={(slug) => toggleCmpUnit(slug)}
                  />
                  <div className="pills">
                    {population
                      .filter((b) => eff.units.includes(b.slug))
                      .map((b) => (
                        <button
                          key={b.slug}
                          className="on"
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
            <>
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
              {s.board === 'buffer' && (
                <div className="field">
                  <label>Type</label>
                  <PillGrid>
                    {(['generic', 'typed'] as const).map((bb) => (
                      <button
                        key={bb}
                        className={s.bufferBoard === bb ? 'on' : ''}
                        onClick={() =>
                          setS((cur) => ({ ...cur, bufferBoard: bb }))
                        }
                      >
                        {bb === 'generic' ? 'Generic' : 'Typed'}
                      </button>
                    ))}
                  </PillGrid>
                </div>
              )}
              {s.board === 'burstgen' && (
                <div className="field">
                  <label>Type</label>
                  <PillGrid>
                    {(['unfocused', 'focused'] as const).map((bg) => (
                      <button
                        key={bg}
                        className={s.burstGenBoard === bg ? 'on' : ''}
                        onClick={() =>
                          setS((cur) => ({ ...cur, burstGenBoard: bg }))
                        }
                      >
                        {bg === 'unfocused' ? 'Unfocused' : 'Focused'}
                      </button>
                    ))}
                  </PillGrid>
                </div>
              )}
            </>
          )}

          {s.card === 'unit' && (
            <div className="field">
              <label>Unit</label>
              <CharPicker
                selectedSlug={eff.unit || null}
                pool={ALL_UNITS}
                onPick={(slug) => setS((cur) => ({ ...cur, unit: slug }))}
              />
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
              <CharPicker
                selectedSlug={s.unit || GENERIC_CHARGE_OPTION.slug}
                pool={CHARGE_PICKER_POOL}
                onPick={(slug) =>
                  setS((cur) => ({
                    ...cur,
                    unit: slug === GENERIC_CHARGE_OPTION.slug ? '' : slug,
                  }))
                }
              />
            </div>
          )}

          {s.card === 'ammo' && (
            <div className="field">
              <label>Unit</label>
              <CharPicker
                selectedSlug={eff.unit || null}
                pool={AMMO_UNITS}
                onPick={(slug) => setS((cur) => ({ ...cur, unit: slug }))}
              />
            </div>
          )}

          {s.card === 'ol' && (
            <>
              <div className="field">
                <label>Lines</label>
                <PillGrid>
                  {OL_LINES_PRESETS.map((l) => (
                    <button
                      key={l}
                      className={s.olLines === l ? 'on' : ''}
                      onClick={() => setS((cur) => ({ ...cur, olLines: l }))}
                    >
                      {OL_LINES_LABEL[l]}
                    </button>
                  ))}
                </PillGrid>
              </div>
              <div className="field">
                <label>Tier</label>
                <select
                  value={s.olTier}
                  onChange={(e) =>
                    setS((cur) => ({ ...cur, olTier: +e.target.value }))
                  }
                >
                  {Array.from({ length: 15 }, (_, t) => t + 1).map((t) => (
                    <option key={t} value={t}>
                      T{t}
                    </option>
                  ))}
                </select>
              </div>
              <p className="muted">
                {OL_PIECES} pieces, {OL_TRIALS / 1000}k-trial Monte Carlo —
                states the line COUNT and tier only, never which stats were
                simulated.
              </p>
            </>
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
    </section>
  );
}
