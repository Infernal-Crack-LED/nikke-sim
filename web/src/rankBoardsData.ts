// Loaders + row mappers for the four precomputed rank-board artifacts
// (web/public/{burstgen,burstcdr,sustain,bufferchart}.json — build outputs of
// `npm run ranks:all`, served at root and copied into dist like dpschart.json).
// Same module-level-cache fetch pattern as dpschartData.ts. ALL tuple index
// access lives here (artifact rows are fixed-arity tuples, profile always
// last); consumers get typed row objects with rank = index+1.
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
  B1B2DpsArtifact,
  RankUnitMeta,
} from '../../src/ranks/types';
import { resolveB1B2Cell, type B1B2DpsCell } from '../../src/ranks/b1b2-cells';
import { rankedBufferRows } from '../../src/ranks/buffer-rows';

export type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
  B1B2DpsArtifact,
} from '../../src/ranks/types';

export type BoardId =
  'burstgen' | 'burstcdr' | 'sustain' | 'buffer' | 'b1b2dps';

const FILES: Record<BoardId, string> = {
  burstgen: 'burstgen.json',
  burstcdr: 'burstcdr.json',
  sustain: 'sustain.json',
  buffer: 'bufferchart.json',
  b1b2dps: 'b1b2dps.json',
};

// Lazy per-board fetch: only the active board's artifact downloads, and a
// repeat visit to a board reuses the cached promise.
const caches = new Map<BoardId, Promise<unknown>>();
function load<T>(board: BoardId): Promise<T> {
  let p = caches.get(board) as Promise<T> | undefined;
  if (!p) {
    const file = FILES[board];
    p = fetch(`${import.meta.env.BASE_URL}${file}`).then((r) => {
      if (!r.ok) {
        throw new Error(`${file} ${r.status}`);
      }
      return r.json() as Promise<T>;
    });
    caches.set(board, p);
  }
  return p;
}

export const loadBurstGen = () => load<BurstGenArtifact>('burstgen');
export const loadBurstCdr = () => load<BurstCdrArtifact>('burstcdr');
export const loadSustain = () => load<SustainArtifact>('sustain');
export const loadBufferChart = () => load<BufferChartArtifact>('buffer');
export const loadB1B2Dps = () => load<B1B2DpsArtifact>('b1b2dps');

// ---- shared row base --------------------------------------------------------
interface RowBase {
  slug: string;
  name: string;
  element: string;
  elements: string[];
  weapon: string;
  burst: string;
  imageUrl: string | null;
  rank: number; // 1-based over the full entry list (profiles included)
  profile: string | null; // profile id when this is the comp-profile variant
}

function base(
  units: Record<string, RankUnitMeta>,
  slug: string,
  rank: number,
  profile: string | null
): RowBase {
  const m = units[slug];
  return {
    slug,
    name: m?.name ?? slug,
    element: m?.element ?? '',
    elements: m?.elements ?? (m?.element ? [m.element] : []),
    weapon: m?.weapon ?? '',
    burst: m?.burst ?? '',
    imageUrl: m?.imageUrl ?? null,
    rank,
    profile,
  };
}

// ---- per-board rows ---------------------------------------------------------
export interface BurstGenBar extends RowBase {
  gaugePerSec: number; // gauge-percent per second while the bar is building
  gaugeTotal: number; // uncapped 180s gauge (100 = one full bar)
  fullBursts: number; // full bursts completed by the team
}
export type BurstGenBoard = 'unfocused' | 'focused';
export function burstGenBars(
  art: BurstGenArtifact,
  board: BurstGenBoard = 'unfocused'
): BurstGenBar[] {
  const rows = board === 'focused' ? art.focusedEntries : art.entries;
  return rows.map(
    ([slug, gaugePerSec, gaugeTotal, fullBursts, profile], i) => ({
      ...base(art.units, slug, i + 1, profile),
      gaugePerSec,
      gaugeTotal,
      fullBursts,
    })
  );
}

export interface BurstCdrBar extends RowBase {
  cdrPer20s: number; // nominal team CDR seconds per 20s Full Burst, averaged over 180s
  ramp: number[] | null; // per-FB cumulative values on escalating ladders (1st, 2nd, 3rd+)
  condition: string | null; // conditional-CDR caveat (asterisk tooltip)
  selfCdr: number | null; // self-only CDR seconds (muted note)
}
export function burstCdrBars(art: BurstCdrArtifact): BurstCdrBar[] {
  return art.entries.map(
    ([slug, cdrPer20s, ramp, condition, selfCdr, profile], i) => ({
      ...base(art.units, slug, i + 1, profile),
      cdrPer20s,
      ramp,
      condition,
      selfCdr,
    })
  );
}

export interface SustainBar extends RowBase {
  totalHp: number; // absolute effective HP restored + shielded (bar value)
  totalPct: number; // % of caster max HP (muted secondary)
  healPct: number;
  shieldPct: number;
  lifestealPct: number;
}
export function sustainBars(art: SustainArtifact): SustainBar[] {
  return art.entries.map(
    (
      [slug, totalHp, totalPct, healPct, shieldPct, lifestealPct, profile],
      i
    ) => ({
      ...base(art.units, slug, i + 1, profile),
      totalHp,
      totalPct,
      healPct,
      shieldPct,
      lifestealPct,
    })
  );
}

export interface BufferBar extends RowBase {
  addedPct: number; // total % team damage increase vs the no-op baseline
  rules: string[] | null; // typed board: derivation audit ("why did the carries change?")
}
export type BufferBoard = 'generic' | 'typed';
// Rows the leaderboard shows, and their ranks, come from rankedBufferRows —
// the shared filter the table-card builder uses too, so the chart and its
// share image never disagree about who is #4.
export function bufferBars(
  art: BufferChartArtifact,
  board: BufferBoard
): BufferBar[] {
  return rankedBufferRows(art.cells[board]).map(
    ([slug, addedPct, rules, profile], i) => ({
      ...base(art.units, slug, i + 1, profile),
      addedPct,
      rules,
    })
  );
}

export interface B1B2DpsBar extends RowBase {
  dps: number;
  template: 'b1-20s' | 'b1-40s' | 'b2';
}
export function b1b2DpsBars(
  art: B1B2DpsArtifact,
  board: B1B2DpsCell
): B1B2DpsBar[] {
  const b = resolveB1B2Cell(art.cells, board);
  return art.cells[b].map(([slug, dps, profile, template], i) => {
    const row = base(art.units, slug, i + 1, profile);
    // For forced off-stage rows, the profile badge carries the effective burst;
    // prefer it over the native burst chip so the row doesn't show Λ/III beside
    // an as-B1/as-B2 badge.
    if (profile === 'as-b1') {
      row.burst = 'I';
    }
    if (profile === 'as-b2') {
      row.burst = 'II';
    }
    return { ...row, dps, template };
  });
}
