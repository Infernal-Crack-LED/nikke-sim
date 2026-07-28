// Node render harness for the golden-image fixtures — renders each card type
// (team card, roster card, DPS chart, table card) to a PNG buffer with the same
// realistic data every run. Shared by the vitest golden test
// (infographics-golden.test.ts) and the regen script
// (scripts/update-infographic-fixtures.ts).
//
// Everything render-side comes through src/infographics/node/render.ts — THE
// single Node entry point, whose first statement registers the bundled Roboto
// faces (throwing on failure) before any canvas work can happen. This harness
// only adds the fixture DATA (real slugs + real portraits).
import {
  createCanvas,
  loadPortrait,
  decodeToCanvas,
  assertFontsLive,
  assertTitleInk,
  CARD_W,
  cardHeight,
  drawTeamCard,
  drawRosterCard,
  rosterCardHeight,
  CHART_W,
  chartHeight,
  chartWindow,
  drawDpsChart,
  TABLE_W,
  tableHeight,
  drawTableCard,
  visibleRows,
  UNIT_CARD_W,
  UNIT_CARD_H,
  drawUnitCard,
  TEAM_TITLE_INK_REGION,
  DPS_TITLE_INK_REGION,
  TABLE_TITLE_INK_REGION,
  UNIT_TITLE_INK_REGION,
  type Canvas,
  type Canvas2DLike,
  type TeamCardData,
  type TeamCardMeta,
  type RosterCardData,
  type DpsChartData,
  type TableCardData,
  type UnitCardData,
} from '../../../src/infographics/node/render.js';

const SITE_ICON_PATH = new URL(
  '../../../src/infographics/assets/nikkesim-icon.png',
  import.meta.url
);

type NapiCanvas = Canvas;

let siteIcon: Promise<NapiCanvas | null> | null = null;
function loadSiteIcon(): Promise<NapiCanvas | null> {
  siteIcon ??= decodeToCanvas(SITE_ICON_PATH);
  return siteIcon;
}

// ---- realistic fixture data (real slugs from data/characters.json, real ----
// ---- portraits from web/public/img/portraits) -------------------------------

// A real meta Solo-Raid team: Liter / Crown / Naga / Red Hood / Alice.
const TEAM: { slug: string; burst: string; share: number; dmg: number }[] = [
  { slug: 'liter', burst: '1', share: 0.062, dmg: 812_000_000 },
  { slug: 'crown', burst: '2', share: 0.158, dmg: 2_071_000_000 },
  { slug: 'naga', burst: '2', share: 0.094, dmg: 1_232_000_000 },
  { slug: 'red-hood', burst: '3', share: 0.371, dmg: 4_864_000_000 },
  { slug: 'alice', burst: '3', share: 0.315, dmg: 4_129_000_000 },
];
const CHARS: Record<string, { name: string; weapon: string; element: string }> =
  {
    liter: { name: 'Liter', weapon: 'SMG', element: 'Iron' },
    crown: { name: 'Crown', weapon: 'MG', element: 'Iron' },
    naga: { name: 'Naga', weapon: 'SG', element: 'Electric' },
    'red-hood': { name: 'Red Hood', weapon: 'SR', element: 'Iron' },
    alice: { name: 'Alice', weapon: 'SR', element: 'Fire' },
    helm: { name: 'Helm (Treasure)', weapon: 'SR', element: 'Water' },
    scarlet: { name: 'Scarlet', weapon: 'AR', element: 'Electric' },
    'little-mermaid': {
      name: 'Little Mermaid',
      weapon: 'SMG',
      element: 'Wind',
    },
    modernia: { name: 'Modernia', weapon: 'MG', element: 'Fire' },
    '2b': { name: '2B', weapon: 'AR', element: 'Fire' },
  };

export async function buildTeamMeta(): Promise<TeamCardMeta> {
  return {
    weakness: 'Iron',
    level: 801,
    coreLabel: '100% core',
    icon: (await loadSiteIcon()) ?? undefined,
  };
}

export async function buildTeamCard(): Promise<{
  data: TeamCardData;
  meta: TeamCardMeta;
}> {
  const meta = await buildTeamMeta();
  const total = TEAM.reduce((s, u) => s + u.dmg, 0);
  return {
    data: {
      teamDamage: total,
      teamDps: total / 180,
      fullBursts: 8,
      fullBurstUptime: 0.222,
      units: await Promise.all(
        TEAM.map(async (u) => ({
          name: CHARS[u.slug].name,
          burst: u.burst,
          weapon: CHARS[u.slug].weapon,
          element: CHARS[u.slug].element,
          advantaged: CHARS[u.slug].element === meta.weakness,
          share: u.share,
          totalDamage: u.dmg,
          img: (await loadPortrait(u.slug)) ?? undefined,
        }))
      ),
    },
    meta,
  };
}

export async function buildRosterCard(): Promise<{
  data: RosterCardData;
  meta: TeamCardMeta;
}> {
  const meta = await buildTeamMeta();
  const teams = [
    {
      slugs: ['liter', 'crown', 'naga', 'red-hood', 'alice'],
      dmg: 13_108_000_000,
    },
    {
      slugs: ['little-mermaid', 'helm', 'scarlet', 'modernia', '2b'],
      dmg: 9_442_000_000,
    },
    {
      slugs: ['crown', 'helm', 'alice', 'scarlet', 'modernia'],
      dmg: 7_015_000_000,
    },
  ];
  return {
    data: {
      totalDamage: teams.reduce((s, t) => s + t.dmg, 0),
      teams: await Promise.all(
        teams.map(async (t) => ({
          teamDamage: t.dmg,
          units: await Promise.all(
            t.slugs.map(async (slug) => ({
              name: CHARS[slug].name,
              element: CHARS[slug].element,
              img: (await loadPortrait(slug)) ?? undefined,
            }))
          ),
        }))
      ),
    },
    meta,
  };
}

export async function buildDpsChart(): Promise<DpsChartData> {
  const rows: { slug: string; dps: number }[] = [
    { slug: 'red-hood', dps: 46_120_000 },
    { slug: 'alice', dps: 41_980_000 },
    { slug: 'scarlet', dps: 38_450_000 },
    { slug: 'modernia', dps: 35_870_000 },
    { slug: '2b', dps: 33_610_000 },
    { slug: 'helm', dps: 29_940_000 },
    { slug: 'crown', dps: 24_780_000 },
    { slug: 'naga', dps: 15_320_000 },
    { slug: 'little-mermaid', dps: 14_050_000 },
    { slug: 'liter', dps: 8_910_000 },
  ];
  return {
    title: 'DPS Ranking — Solo Raid',
    subtitle: 'element-weak boss · 100% core · lvl 801 synchro',
    topDps: rows[0].dps,
    bars: await Promise.all(
      rows.map(async (r) => ({
        name: CHARS[r.slug].name,
        element: CHARS[r.slug].element,
        dps: r.dps,
        slug: r.slug,
        advantaged: CHARS[r.slug].element === 'Iron',
        img: (await loadPortrait(r.slug)) ?? undefined,
      }))
    ),
    compare: {
      name: CHARS.scarlet.name,
      element: CHARS.scarlet.element,
      dps: 38_450_000,
      rank: 3,
      total: 21,
    },
    icon: (await loadSiteIcon()) ?? undefined,
  };
}

// §6.6 windowed chart: a 21-row population (6 synthetic leaders + the 10 real
// units + 5 synthetic trailers) with the window centred on Liter (population
// index 15 → renders ranks 12–21, Liter on the 5th row). The window covers real
// units so portraits render, and its top row (Helm, 0.499) proves labels are
// normalized to the population #1 — not the window max.
export async function buildDpsChartWindow(): Promise<DpsChartData> {
  const syn = (n: number, dps: number) => ({
    slug: `synthetic-${n}`,
    name: `Synthetic ${String(n).padStart(2, '0')}`,
    element: 'Fire',
    dps,
  });
  const population = [
    syn(1, 60_000_000),
    syn(2, 58_000_000),
    syn(3, 56_000_000),
    syn(4, 54_000_000),
    syn(5, 52_000_000),
    syn(6, 50_000_000),
    { slug: 'red-hood', dps: 46_120_000 },
    { slug: 'alice', dps: 41_980_000 },
    { slug: 'scarlet', dps: 38_450_000 },
    { slug: 'modernia', dps: 35_870_000 },
    { slug: '2b', dps: 33_610_000 },
    { slug: 'helm', dps: 29_940_000 },
    { slug: 'crown', dps: 24_780_000 },
    { slug: 'naga', dps: 15_320_000 },
    { slug: 'little-mermaid', dps: 14_050_000 },
    { slug: 'liter', dps: 8_910_000 },
    syn(7, 8_000_000),
    syn(8, 7_000_000),
    syn(9, 6_000_000),
    syn(10, 5_000_000),
    syn(11, 4_000_000),
  ];
  return {
    title: 'DPS Ranking — Solo Raid',
    subtitle: 'element-weak boss · 100% core · lvl 801 synchro',
    topDps: population[0].dps,
    bars: await Promise.all(
      population.map(async (r) => ({
        name: 'name' in r ? r.name : CHARS[r.slug].name,
        element: 'element' in r ? r.element : CHARS[r.slug].element,
        dps: r.dps,
        slug: r.slug,
        advantaged: !('name' in r) && CHARS[r.slug].element === 'Iron',
        img: (await loadPortrait(r.slug)) ?? undefined,
      }))
    ),
    window: { targetSlug: 'liter' },
    icon: (await loadSiteIcon()) ?? undefined,
  };
}

export async function buildTableCard(): Promise<TableCardData> {
  const base = 90; // 2B's real base ammo (AR)
  const AMMO_PER_LINE_T11 = 68.93;
  const rows: string[][] = [];
  for (let lines = 1; lines <= 5; lines++) {
    const pct = lines * AMMO_PER_LINE_T11;
    const ammo = Math.floor(base * (1 + pct / 100));
    rows.push([`${lines}`, `${pct.toFixed(1)}%`, `${ammo}`, `+${ammo - base}`]);
  }
  return {
    title: 'Max Ammo — 2B',
    subtitle: `Base ${base} rounds · T11 = ${AMMO_PER_LINE_T11}% ammo/line`,
    columns: [
      { header: 'OL Lines' },
      { header: 'Ammo %', align: 'right' },
      { header: 'Rounds', align: 'right' },
      { header: 'Gain', align: 'right' },
    ],
    rows,
    footer: 'nikkesim.app/charge',
    icon: (await loadSiteIcon()) ?? undefined,
    portrait: (await loadPortrait('2b')) ?? undefined,
  };
}

// §6.6 windowed rank board: a 30-row burstgen-style table with an ABSOLUTE rank
// column written by the caller, windowed on row index 20 (rank 21 → renders
// rows 17–26, target on the 5th row). Exercises the slice + footer window note.
export async function buildTableCardWindow(): Promise<TableCardData> {
  const rows: string[][] = [];
  for (let rank = 1; rank <= 30; rank++) {
    rows.push([
      `#${rank}`,
      `Unit ${String(rank).padStart(2, '0')}`,
      `${(120 - rank * 2.5).toFixed(1)}%`,
    ]);
  }
  return {
    title: 'Burst Gen Ranking',
    subtitle: '180s · full burst count basis',
    columns: [
      { header: 'Rank' },
      { header: 'Unit' },
      { header: 'Gauge', align: 'right' },
    ],
    rows,
    window: { targetIndex: 20 },
    footer: 'nikkesim.app',
    icon: (await loadSiteIcon()) ?? undefined,
    portrait: (await loadPortrait('crown')) ?? undefined,
  };
}

// ---- renders ----------------------------------------------------------------

// A real unit identity card (Liter — B1 Supporter, real portrait, real
// characters.json field values).
export async function buildUnitCard(): Promise<UnitCardData> {
  return {
    name: 'Liter',
    element: 'Iron',
    weapon: 'SMG',
    burst: 'I',
    class: 'Supporter',
    manufacturer: 'Missilis',
    burstCooldownSec: 20,
    img: (await loadPortrait('liter')) ?? undefined,
    footer: 'nikkesim.app',
  };
}

export interface FixtureRender {
  name: string; // fixture filename, e.g. team-card.png
  png: Buffer;
}

export async function renderAll(): Promise<FixtureRender[]> {
  assertFontsLive();

  const out: FixtureRender[] = [];
  const finish = (
    name: string,
    canvas: NapiCanvas,
    inkRegion: { x: number; y: number; w: number; h: number }
  ): void => {
    assertTitleInk(canvas.getContext('2d'), name, inkRegion);
    out.push({ name, png: canvas.toBuffer('image/png') });
  };

  // Ink regions come from the card modules' TEAM/DPS/TABLE/UNIT_TITLE_INK_REGION
  // exports — they start at the title's textX (padX + ICON + 12) — NEVER at
  // padX, or the site icon alone satisfies the guard with zero glyphs
  // (render.ts). A core layout change moves the guard with it.
  const team = await buildTeamCard();
  const teamCanvas = createCanvas(CARD_W, cardHeight(team.data.units.length));
  drawTeamCard(
    teamCanvas.getContext('2d') as unknown as Canvas2DLike,
    team.data,
    team.meta
  );
  finish('team-card.png', teamCanvas, TEAM_TITLE_INK_REGION);

  const roster = await buildRosterCard();
  const rosterCanvas = createCanvas(
    CARD_W,
    rosterCardHeight(roster.data.teams.length)
  );
  drawRosterCard(
    rosterCanvas.getContext('2d') as unknown as Canvas2DLike,
    roster.data,
    roster.meta
  );
  // the roster card shares the team card's title geometry (teamCard.ts)
  finish('roster-card.png', rosterCanvas, TEAM_TITLE_INK_REGION);

  const chart = await buildDpsChart();
  const chartWin = chartWindow(chart);
  const chartCanvas = createCanvas(
    CHART_W,
    chartHeight(chartWin.end - chartWin.start, !!chart.compare)
  );
  drawDpsChart(chartCanvas.getContext('2d') as unknown as Canvas2DLike, chart);
  finish('dps-chart.png', chartCanvas, DPS_TITLE_INK_REGION);

  const chartWindowed = await buildDpsChartWindow();
  const chartWindowedWin = chartWindow(chartWindowed);
  const chartWindowedCanvas = createCanvas(
    CHART_W,
    chartHeight(
      chartWindowedWin.end - chartWindowedWin.start,
      !!chartWindowed.compare
    )
  );
  drawDpsChart(
    chartWindowedCanvas.getContext('2d') as unknown as Canvas2DLike,
    chartWindowed
  );
  finish('dps-chart-window.png', chartWindowedCanvas, DPS_TITLE_INK_REGION);

  const table = await buildTableCard();
  const tableCanvas = createCanvas(
    TABLE_W,
    tableHeight(visibleRows(table.rows, table.window).rows.length)
  );
  drawTableCard(tableCanvas.getContext('2d') as unknown as Canvas2DLike, table);
  finish('table-card.png', tableCanvas, TABLE_TITLE_INK_REGION);

  const tableWindowed = await buildTableCardWindow();
  const tableWindowedCanvas = createCanvas(
    TABLE_W,
    tableHeight(
      visibleRows(tableWindowed.rows, tableWindowed.window).rows.length
    )
  );
  drawTableCard(
    tableWindowedCanvas.getContext('2d') as unknown as Canvas2DLike,
    tableWindowed
  );
  finish('table-card-window.png', tableWindowedCanvas, TABLE_TITLE_INK_REGION);

  const unit = await buildUnitCard();
  const unitCanvas = createCanvas(UNIT_CARD_W, UNIT_CARD_H);
  drawUnitCard(unitCanvas.getContext('2d') as unknown as Canvas2DLike, unit);
  finish('unit-card.png', unitCanvas, UNIT_TITLE_INK_REGION);

  return out;
}
