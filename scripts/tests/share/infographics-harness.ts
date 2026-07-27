// Node render harness for the golden-image fixtures — renders each card type
// (team card, roster card, DPS chart, table card) to a PNG buffer with the same
// realistic data every run. Shared by the vitest golden test
// (infographics-golden.test.ts) and the regen script
// (scripts/update-infographic-fixtures.ts). This is the seed Phase 1 will
// formalize into src/infographics/node/ (fonts + portraits + render entry).
//
// FONTS FIRST: fonts.ts registers the bundled Roboto faces with @napi-rs/canvas
// and throws if any face fails — importing it before any canvas work is the
// load-bearing ordering guarantee (a fontless host renders blank text silently).
import '../../../src/share/fonts.js';
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import {
  CARD_W,
  cardHeight,
  drawTeamCard,
  drawRosterCard,
  rosterCardHeight,
  type Canvas2DLike,
  type TeamCardData,
  type TeamCardMeta,
  type RosterCardData,
} from '../../../src/share/teamCard.js';
import {
  CHART_W,
  chartHeight,
  drawDpsChart,
  type DpsChartData,
} from '../../../src/share/dpsChart.js';
import {
  TABLE_W,
  tableHeight,
  drawTableCard,
  type TableCardData,
} from '../../../src/share/tableCard.js';

const REPO_ROOT = new URL('../../../', import.meta.url);
const PORTRAIT_DIR = new URL('web/public/img/portraits/', REPO_ROOT);
const SITE_ICON_PATH = new URL('web/public/og.png', REPO_ROOT);

type NapiCanvas = Canvas;

// ⚠ WHY NOT `new Image()`: @napi-rs/canvas's Image rasterization is BROKEN on
// the owner's Mac (macOS 26 arm64, node 22) in both 1.0.2 and 0.1.x — src
// assignment decodes dimensions but every drawImage(image) silently no-ops
// (verified 2026-07-27 on PNG and WebP; the same code works on Railway Linux).
// So images are decoded with sharp (dev dep) and painted onto a canvas via
// putImageData — canvas→canvas drawImage works everywhere. Phase 1's
// node/portraits.ts must keep this decode path, not skia's Image.
async function decodeToCanvas(file: URL): Promise<NapiCanvas | null> {
  try {
    const { data, info } = await sharp(readFileSync(file))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const canvas = createCanvas(info.width, info.height);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(info.width, info.height);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } catch {
    return null;
  }
}

// slug → portrait canvas, from the committed 128px webp thumbs (single copy —
// the bot's mirrored assets/portraits/ set is what this replaces). Returns null
// on a missing/undecodable file so a card degrades to its placeholder box.
const portraitCache = new Map<string, Promise<NapiCanvas | null>>();
export function loadPortraitSlug(slug: string): Promise<NapiCanvas | null> {
  let hit = portraitCache.get(slug);
  if (!hit) {
    hit = decodeToCanvas(new URL(`${slug}-128.webp`, PORTRAIT_DIR));
    portraitCache.set(slug, hit);
  }
  return hit;
}

let siteIcon: Promise<NapiCanvas | null> | null = null;
function loadSiteIcon(): Promise<NapiCanvas | null> {
  siteIcon ??= decodeToCanvas(SITE_ICON_PATH);
  return siteIcon;
}

// Loud blank-text guard: after registration Roboto MUST measure and ink. An
// unregistered family fails silently (valid PNG, zero glyphs), so check both
// the metric and real pixels and name the font problem in the failure.
export function assertFontsLive(): void {
  const ctx = createCanvas(64, 64).getContext('2d');
  ctx.font = '40px Roboto';
  if (!(ctx.measureText('X').width > 0)) {
    throw new Error(
      'infographics fonts: Roboto registered but measureText("X") is 0 — ' +
        'text would render blank. Check src/share/fonts.ts registration.'
    );
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText('X', 4, 44);
  const px = ctx.getImageData(0, 0, 64, 64).data;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] > 0) {
      return; // some glyph ink landed
    }
  }
  throw new Error(
    'infographics fonts: Roboto drew zero pixels — text renders blank. ' +
      'Check src/share/fonts.ts registration and the bundled TTFs.'
  );
}

// Ink coverage in a region of a finished render — the per-card blank-text guard.
// Fails loudly (naming fonts) instead of surfacing as an opaque fixture diff.
export function assertTitleInk(
  pngCtx: ReturnType<NapiCanvas['getContext']>,
  cardName: string,
  region: { x: number; y: number; w: number; h: number }
): void {
  const { x, y, w, h } = region;
  const px = pngCtx.getImageData(x, y, w, h).data;
  // background is #101216 (16,18,22); count pixels clearly off-background
  let ink = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (
      Math.abs(px[i] - 16) > 12 ||
      Math.abs(px[i + 1] - 18) > 12 ||
      Math.abs(px[i + 2] - 22) > 12
    ) {
      ink++;
    }
  }
  if (ink === 0) {
    throw new Error(
      `${cardName}: title region has ZERO non-background pixels — text ` +
        'rendered blank (font registration problem). ' +
        'Check src/share/fonts.ts and the bundled Roboto TTFs.'
    );
  }
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
          img: (await loadPortraitSlug(u.slug)) ?? undefined,
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
              img: (await loadPortraitSlug(slug)) ?? undefined,
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
    bars: await Promise.all(
      rows.map(async (r) => ({
        name: CHARS[r.slug].name,
        element: CHARS[r.slug].element,
        dps: r.dps,
        slug: r.slug,
        advantaged: CHARS[r.slug].element === 'Iron',
        img: (await loadPortraitSlug(r.slug)) ?? undefined,
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
    portrait: (await loadPortraitSlug('2b')) ?? undefined,
  };
}

// ---- renders ----------------------------------------------------------------

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

  const team = await buildTeamCard();
  const teamCanvas = createCanvas(CARD_W, cardHeight(team.data.units.length));
  drawTeamCard(
    teamCanvas.getContext('2d') as unknown as Canvas2DLike,
    team.data,
    team.meta
  );
  finish('team-card.png', teamCanvas, { x: 40, y: 26, w: 460, h: 40 });

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
  finish('roster-card.png', rosterCanvas, { x: 40, y: 26, w: 560, h: 40 });

  const chart = await buildDpsChart();
  const chartCanvas = createCanvas(
    CHART_W,
    chartHeight(chart.bars.length, !!chart.compare)
  );
  drawDpsChart(chartCanvas.getContext('2d') as unknown as Canvas2DLike, chart);
  finish('dps-chart.png', chartCanvas, { x: 36, y: 24, w: 500, h: 36 });

  const table = await buildTableCard();
  const tableCanvas = createCanvas(TABLE_W, tableHeight(table.rows.length));
  drawTableCard(tableCanvas.getContext('2d') as unknown as Canvas2DLike, table);
  finish('table-card.png', tableCanvas, { x: 32, y: 16, w: 400, h: 34 });

  return out;
}
