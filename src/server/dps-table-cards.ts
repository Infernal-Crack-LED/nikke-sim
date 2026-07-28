// DPS-chart + table card rendering for the dynamic render routes
// (/api/v1/img/dps.png, /api/v1/img/table/*.png). Data selection mirrors
// build-infographics.ts's dpsJobs (which mirrors web/src/dpschartData.ts
// chartBars): unfiltered = the chartPop (SSS/SS) population; an element filter
// ranks ALL of the cell's units carrying that element. §6.6 windowing is
// always on for these routes (top 10, or 4-above/target/5-below with `unit`),
// with relScore labels normalized to the FULL filtered population's #1 —
// computed before windowing, so labels mean the same thing in every image.
import {
  createCanvas,
  chartWindow,
  chartHeight,
  drawDpsChart,
  loadPortrait,
  CHART_W,
  tableHeight,
  drawTableCard,
  TABLE_W,
  type Canvas,
  type Canvas2DLike,
  type DpsChartData,
  type TableCardData,
} from '../infographics/node/render.js';
import { cellLabel, parseCellId } from '../dpschart/matrix.js';
import { MAX_CANVAS_PIXELS } from './card-from-build.js';

const SCALE = 2; // retina, same as build-infographics.ts and card-from-build.ts

// dpschart.json shape (mirror of web/src/dpschartData.ts — the server can't
// import the web module, which uses import.meta.env). Same interface as
// build-infographics.ts's DpsArtifact.
export interface DpsUnitMeta {
  name: string;
  element: string;
  elements?: string[];
  weapon: string;
  tier: string;
  chartPop: boolean;
  imageUrl: string | null;
}
export interface DpsArtifact {
  generatedAt: string;
  units: Record<string, DpsUnitMeta>;
  cells: Record<string, [string, number][]>;
}

// The element filter set both link surfaces expose (web DpsChartTab
// ELEMENT_FILTERS pills, bot /dps choices) — query params are lowercase.
export const ELEMENT_FILTERS = ['fire', 'water', 'wind', 'electric', 'iron'];
const canonicalElement = (el: string): string =>
  el[0].toUpperCase() + el.slice(1);

export interface DpsChartParams {
  cell: string; // cell id, e.g. 'solo.eleweak.c100.8of12'
  element: string | null; // lowercase element filter
  unit: string | null; // §6.6 window target slug
}

// Validate params against the artifact and build the card data. Returns an
// error string for the 400 response, or the DpsChartData ready to render.
export function dpsChartData(
  art: DpsArtifact,
  params: DpsChartParams,
  icon: Canvas | null
): { error: string } | { data: DpsChartData } {
  const cell = parseCellId(params.cell);
  const ranked = art.cells[params.cell];
  if (!cell || !ranked?.length) {
    return { error: `unknown cell '${params.cell}'` };
  }
  if (params.element !== null && !ELEMENT_FILTERS.includes(params.element)) {
    return { error: `unknown element '${params.element}'` };
  }
  const ele = params.element ? canonicalElement(params.element) : null;
  // Population semantics (chartBars): element filter = ALL units carrying the
  // element; unfiltered = the SSS/SS chart population only.
  const population = ranked
    .filter(([slug]) => {
      const u = art.units[slug];
      if (!u) {
        return false;
      }
      return ele ? (u.elements ?? [u.element]).includes(ele) : u.chartPop;
    })
    .map(([slug, dps]) => ({ slug, dps, meta: art.units[slug] }));
  if (population.length === 0) {
    return { error: `no units in cell '${params.cell}' for that element` };
  }
  if (params.unit !== null && !population.some((p) => p.slug === params.unit)) {
    return {
      error:
        `unit '${params.unit}' is not in this chart` +
        (ele ? ` (element filter: ${ele})` : ''),
    };
  }
  // Labels normalize to the FULL filtered population's #1 (§6.6), computed
  // BEFORE windowing — population is sorted desc in the artifact, but take the
  // max explicitly rather than trusting the order.
  const topDps = Math.max(...population.map((p) => p.dps));
  const data: DpsChartData = {
    title: cellLabel(cell) + (ele ? ` · ${ele} only` : ''),
    subtitle: params.unit
      ? `windowed on ${art.units[params.unit]?.name ?? params.unit}`
      : undefined,
    topDps,
    bars: population.map((p) => ({
      name: p.meta.name,
      element: p.meta.element,
      dps: p.dps,
      slug: p.slug,
    })),
    window: params.unit ? { targetSlug: params.unit } : {}, // §6.6 top-10
    footer: 'nikkesim.app/dpschart',
    icon: icon ?? undefined,
  };
  return { data };
}

// Render a DpsChartData to a scale-2 PNG, loading portraits for the windowed
// rows only (same path as build-infographics.ts's dps jobs).
export async function renderDpsChartPng(data: DpsChartData): Promise<Buffer> {
  const win = chartWindow(data);
  for (const bar of data.bars.slice(win.start, win.end)) {
    bar.img = (await loadPortrait(bar.slug!)) ?? undefined;
  }
  const w = CHART_W * SCALE;
  const h = chartHeight(win.end - win.start, false) * SCALE;
  if (w * h > MAX_CANVAS_PIXELS) {
    throw new Error(`dps chart ${w}×${h} exceeds the pixel budget`);
  }
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  drawDpsChart(ctx as unknown as Canvas2DLike, data);
  return canvas.toBuffer('image/png');
}

// Render a TableCardData (from core/tableData.ts builders) to a scale-2 PNG.
export function renderTableCardPng(data: TableCardData): Buffer {
  const w = TABLE_W * SCALE;
  const h = tableHeight(data.rows.length) * SCALE;
  if (w * h > MAX_CANVAS_PIXELS) {
    throw new Error(`table card ${w}×${h} exceeds the pixel budget`);
  }
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  drawTableCard(ctx as unknown as Canvas2DLike, data);
  return canvas.toBuffer('image/png');
}
