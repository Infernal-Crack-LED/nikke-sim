// Draw-call-level tests for the table-share additions (no pixels — the golden
// suite covers those):
//   1. tableCard's rowColors branch (olsim before/after card, resources
//      selected-tier highlight): a row carrying a color draws EVERY cell in it;
//      absent rowColors must render exactly the default first/rest colors.
//   2. rowColors is population-indexed — it slices with the §6.6 window.
//   3. core/rankTables.ts builders (extracted from build-infographics.ts, now
//      shared with the web share cards): columns, absolute ranks, windowing
//      and footers per board, profile chip labels, typed-vs-generic buffer.
//   4. column fitting: flex-weighted widths + the ellipsize backstop, so a
//      wide header/cell can never overdraw its neighbour.
//   5. buildChargeTable's release latency — 0 for autofire units.
import { describe, expect, it } from 'vitest';
import {
  drawTableCard,
  type TableCardData,
} from '../../../src/infographics/core/tableCard.js';
import {
  buildChargeTable,
  chargeLatencyFrames,
  isAutofireCharge,
  RELEASE_LATENCY_FRAMES,
  FULL_BURST_FRAMES,
} from '../../../src/infographics/core/tableData.js';
import {
  buildBurstGenTable,
  buildBurstCdrTable,
  buildSustainTable,
  buildBufferTable,
} from '../../../src/infographics/core/rankTables.js';
import type { Canvas2DLike } from '../../../src/infographics/core/canvas2d.js';
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
} from '../../../src/ranks/types.js';

const ACCENT = '#5b9dff';

// Recording Canvas2DLike: captures (text, fillStyle) per fillText so row
// colors are assertable.
function mockCtx() {
  const texts: { t: string; style: string; x: number }[] = [];
  const ctx: Canvas2DLike = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    fillRect: () => {},
    fillText: (t, x) => {
      texts.push({ t, style: ctx.fillStyle, x });
    },
    measureText: (t) => ({ width: t.length * 8 }),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    closePath: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    clip: () => {},
    drawImage: (() => {}) as unknown as Canvas2DLike['drawImage'],
  };
  return { ctx, texts };
}

function tableData(
  rows: string[][],
  extra: Partial<TableCardData> = {}
): TableCardData {
  return {
    title: 'T',
    columns: [{ header: 'A' }, { header: 'B', align: 'right' }],
    rows,
    ...extra,
  };
}

describe('drawTableCard rowColors (changed-line / selected-row marking)', () => {
  it('a row with a color draws every cell in it; null rows keep the defaults', () => {
    const { ctx, texts } = mockCtx();
    drawTableCard(
      ctx,
      tableData(
        [
          ['r1', 'x'],
          ['r2', 'y'],
          ['r3', 'z'],
        ],
        { rowColors: [null, ACCENT, null] }
      )
    );
    const cell = (t: string) => texts.find((x) => x.t === t)!;
    // default: first column bright, data column dimmer
    expect(cell('r1').style).toBe('#e7eaf0');
    expect(cell('x').style).toBe('#c9cede');
    expect(cell('r3').style).toBe('#e7eaf0');
    expect(cell('z').style).toBe('#c9cede');
    // colored row: BOTH cells in the accent
    expect(cell('r2').style).toBe(ACCENT);
    expect(cell('y').style).toBe(ACCENT);
    // the mandatory watermark still renders (theme.ts final pass)
    expect(texts.some((x) => x.t.includes('nikkesim.app'))).toBe(true);
  });

  it('absent rowColors renders the default colors only', () => {
    const { ctx, texts } = mockCtx();
    drawTableCard(
      ctx,
      tableData([
        ['r1', 'x'],
        ['r2', 'y'],
      ])
    );
    const styles = new Set(
      texts
        .filter((x) => ['r1', 'r2', 'x', 'y'].includes(x.t))
        .map((x) => x.style)
    );
    expect(styles).toEqual(new Set(['#e7eaf0', '#c9cede']));
  });

  it('rowColors is population-indexed: it slices with the window', () => {
    const { ctx, texts } = mockCtx();
    const rows = Array.from({ length: 15 }, (_, i) => [`u${i + 1}`, `${i}`]);
    // color population index 11 ('u12'); window on it → rendered row, accent.
    // color population index 0 ('u1'); outside the window → never rendered.
    const rowColors = rows.map((_, i) => (i === 11 || i === 0 ? ACCENT : null));
    drawTableCard(
      ctx,
      tableData(rows, { rowColors, window: { targetIndex: 11 } })
    );
    const cell = (t: string) => texts.find((x) => x.t === t);
    expect(cell('u12')?.style).toBe(ACCENT);
    expect(cell('u1')).toBeUndefined(); // sliced out of the window
    // an uncolored rendered neighbor keeps the default
    expect(cell('u11')?.style).toBe('#e7eaf0');
  });
});

// ---- core/rankTables.ts builders ---------------------------------------------

const UNITS = {
  'unit-a': {
    name: 'Unit A',
    element: 'Fire',
    weapon: 'RL',
    burst: 'III',
    imageUrl: null,
  },
  'unit-b': {
    name: 'Unit B',
    element: 'Water',
    weapon: 'MG',
    burst: 'I',
    imageUrl: null,
  },
};
const ART_BASE = {
  generatedAt: '2026-07-28T00:00:00Z',
  methodology: 'm',
  units: UNITS,
  profiles: { 'with-2mg': 'two MGs on the team' },
};

describe('core/rankTables builders (shared server pre-render + web share)', () => {
  it('burstgen: columns, absolute ranks, profile label, top-10 window', () => {
    const art = {
      ...ART_BASE,
      entries: [
        ['unit-a', 12.34, 2500, 9, null],
        ['unit-b', 10.5, 2100, 8, 'with-2mg'],
      ],
    } as unknown as BurstGenArtifact;
    const t = buildBurstGenTable(art);
    expect(t.title).toBe('Burst Generation Ranking');
    expect(t.columns.map((c) => c.header)).toEqual([
      '#',
      'Unit',
      'Gauge %/s',
      'Bars (180s)',
    ]);
    expect(t.rows).toEqual([
      ['#1', 'Unit A', '12.34%/s', '25.0'],
      ['#2', 'Unit B (w/ 2 MG)', '10.50%/s', '21.0'],
    ]);
    expect(t.window).toEqual({}); // §6.6 top-10
    expect(t.footer).toBe('nikkesim.app/ranks');
  });

  it('burstcdr: CDR s/20s column', () => {
    const art = {
      ...ART_BASE,
      entries: [['unit-a', 8.23, null, null, null, null]],
    } as unknown as BurstCdrArtifact;
    const t = buildBurstCdrTable(art);
    expect(t.title).toBe('Burst CDR Ranking');
    expect(t.rows).toEqual([['#1', 'Unit A', '8.2s']]);
  });

  it('sustain: K/M/B magnitude fmt + % max HP', () => {
    const art = {
      ...ART_BASE,
      entries: [['unit-a', 12_300_000, 145.6, 100, 40, 5.6, null]],
    } as unknown as SustainArtifact;
    const t = buildSustainTable(art);
    expect(t.title).toBe('Sustain Ranking');
    expect(t.rows).toEqual([['#1', 'Unit A', '12.30M', '146%']]);
  });

  it('buffer: generic default, typed variant, negative values keep their sign', () => {
    const art = {
      ...ART_BASE,
      cells: {
        generic: [
          ['unit-a', 12.34, null, null],
          ['unit-b', -3.21, null, null],
        ],
        typed: [['unit-b', 20.5, null, null]],
      },
    } as unknown as BufferChartArtifact;
    const g = buildBufferTable(art);
    expect(g.title).toBe('Team Buffs Ranking — Generic');
    expect(g.rows).toEqual([
      ['#1', 'Unit A', '+12.3%'],
      ['#2', 'Unit B', '-3.2%'],
    ]);
    const t = buildBufferTable(art, 'typed');
    expect(t.title).toBe('Team Buffs Ranking — Typed');
    expect(t.rows).toEqual([['#1', 'Unit B', '+20.5%']]);
  });
});

// The mock ruler is 8px/char, so column geometry is exact arithmetic here:
// TABLE_W 720 − 2×PAD_X 32 = 656 usable; CELL_PAD is 8 on each side.
describe('drawTableCard column widths + ellipsize backstop', () => {
  it('ellipsizes a cell that would overdraw its neighbour', () => {
    const { ctx, texts } = mockCtx();
    // 2 even columns → 328 each → 312 of text room → 39 chars at 8px.
    const long = 'x'.repeat(60);
    drawTableCard(ctx, tableData([[long, 'ok']]));
    const drawn = texts.find((t) => t.t.startsWith('xxx'))!.t;
    expect(drawn.endsWith('…')).toBe(true);
    expect(drawn.length * 8).toBeLessThanOrEqual(312);
    // a cell that FITS is drawn verbatim — no gratuitous truncation
    expect(texts.some((t) => t.t === 'ok')).toBe(true);
  });

  it('flex weights the column widths (and the text anchors with them)', () => {
    const { ctx, texts } = mockCtx();
    const data = tableData([['label', 'v']], {
      columns: [
        { header: 'A', flex: 3 },
        { header: 'B', align: 'right' },
      ],
    });
    drawTableCard(ctx, data);
    // weights 3+1 → 492 / 164. Column 0 starts at padX + CELL_PAD; the
    // right-aligned column 1 ends at padX + 656 − CELL_PAD.
    expect(texts.find((t) => t.t === 'label')!.x).toBe(32 + 8);
    expect(texts.find((t) => t.t === 'v')!.x).toBe(32 + 656 - 8);
    // …and the wide column now fits what the even split would have cut: 55
    // chars = 440px, over the even split's 312 but inside this column's 476.
    const { ctx: ctx2, texts: t2 } = mockCtx();
    drawTableCard(
      ctx2,
      tableData([['y'.repeat(55), 'v']], { columns: data.columns })
    );
    expect(t2.find((t) => t.t.startsWith('yyy'))!.t).toBe('y'.repeat(55));
  });
});

describe('buildChargeTable release latency (autofire units)', () => {
  const shotsFbCell = (t: ReturnType<typeof buildChargeTable>, row: number) =>
    Number(t.rows[row][4]);
  const framesCell = (t: ReturnType<typeof buildChargeTable>, row: number) =>
    Number(t.rows[row][2].replace('f', ''));

  it('defaults to the 22f release latency (old-style charge weapons)', () => {
    const t = buildChargeTable(60, 'Generic (1.0s)');
    expect(shotsFbCell(t, 0)).toBeCloseTo(
      FULL_BURST_FRAMES / (framesCell(t, 0) + RELEASE_LATENCY_FRAMES),
      2
    );
    expect(t.subtitle).toContain('+22f release');
  });

  it('an autofire unit fires with NO release latency', () => {
    // liberalio's real base: 90 frames, input_type DOWN_Charge.
    const auto = buildChargeTable(90, 'Liberalio', 0);
    const latent = buildChargeTable(90, 'Liberalio');
    expect(shotsFbCell(auto, 0)).toBeCloseTo(
      FULL_BURST_FRAMES / framesCell(auto, 0),
      2
    );
    // the bug this pins: the latent number is ~25-30% lower on every row
    expect(shotsFbCell(auto, 0)).toBeGreaterThan(shotsFbCell(latent, 0));
    expect(auto.subtitle).toContain('autofire');
  });

  it('chargeLatencyFrames reads the datamined input_type', () => {
    const autofire = {
      role: { weapon: { shot_detail: { input_type: 'DOWN_Charge' } } },
    };
    const released = {
      role: { weapon: { shot_detail: { input_type: 'UP' } } },
    };
    expect(isAutofireCharge(autofire)).toBe(true);
    expect(chargeLatencyFrames(autofire)).toBe(0);
    expect(chargeLatencyFrames(released)).toBe(RELEASE_LATENCY_FRAMES);
    // an absent//unknown role is release-fired — the safe SR/RL default
    expect(chargeLatencyFrames({})).toBe(RELEASE_LATENCY_FRAMES);
    expect(chargeLatencyFrames(null)).toBe(RELEASE_LATENCY_FRAMES);
  });
});
