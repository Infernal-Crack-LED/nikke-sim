// PURE data builder for the unit-card infographic — joins a character with the
// five ranking boards, its archetype tags, the sim-optimal overload, and the
// community Tsareena build sheet into ONE fixed-shape structure that both card
// variants (discord landscape, twitter portrait) render.
//
// Phase 3 of docs/handoffs/2026-07-28-unit-card-infographic-plan.md.
//
// ── Two contracts this module exists to enforce ──────────────────────────────
//
// 1. EVERY EXTERNAL FIELD IS NULLABLE, AND ABSENCE IS A DRAWN STATE (ruling 2).
//    Coverage is the dominant design problem, not an edge case: the DPS chart
//    ranks 40 units and the CDR board 15, against ~195 cards, and 55% of the
//    roster has no Tsareena entry. So a missing board produces a tile with
//    `rank: null` that the renderer draws AT FULL SIZE, greyed — never an
//    omitted tile and never a reflow. Fixed geometry is what lets the whole set
//    be posted as a consistent-looking series.
//
// 2. IT MIRRORS nikkesim.app, IT DOES NOT INVENT A SCALE (ruling 1). Every
//    number here is the one the site already displays for that board, formatted
//    the same way (fmtMagnitude and profileLabel are imported from
//    rankTables.ts rather than re-written, so a card can't drift from the board
//    it is quoting).
//
// Pure and DOM-free like the rest of core/: it takes already-parsed artifacts
// and returns plain data. The caller loads the JSON and attaches images.
import type {
  BurstGenArtifact,
  BurstCdrArtifact,
  SustainArtifact,
  BufferChartArtifact,
  BufferRow,
  RankUnitMeta,
} from '../../ranks/types.js';
import type { TsareenaBuild } from '../../types.js';
import { onBoardBufferRows } from '../../ranks/buffer-rows.js';
import { fmtMagnitude, profileLabel } from './rankTables.js';

// ---- tunables (owner polish pass — see docs/handoffs/QUEUE.md) --------------
//
// Values chosen by judgement rather than measurement, parked as named constants
// so the polish pass can tune them without hunting through layout code.

// Neighbour rows drawn each side of the unit in a bar chart. The mockup asks for
// one above and one below (3 rows total) — which fills the LANDSCAPE column but
// left ~300px of dead space on the taller portrait canvas, so portrait draws two
// each side (owner polish pass 2026-07-28). This is the one place the two
// variants' DATA differs; everything else is one model rendered two ways.
export const NEIGHBOUR_ROWS = 1;
export const NEIGHBOUR_ROWS_PORTRAIT = 2;

// Takes the variant as a bare string rather than UnitCardVariant: that type
// lives in unitCard.ts, which already imports this module, and both hosts must
// resolve the row count the same way or the two pictures diverge.
export const neighbourRowsFor = (variant: string): number =>
  variant === 'twitter' ? NEIGHBOUR_ROWS_PORTRAIT : NEIGHBOUR_ROWS;

// When a B1/B2 unit has no second bar chart (no sustain AND no burst CDR), the
// freed vertical space goes into MORE neighbour rows in the surviving chart —
// never into whitespace (plan §6c lever 1). This is what keeps the fixed-geometry
// guarantee from producing holes.
export const NEIGHBOUR_ROWS_SOLO_CHART = 3;

// Archetype tags are uncapped upstream (some units carry many); the card has one
// tag row. Extras are dropped, and `tagsOverflow` reports how many.
export const MAX_TAGS = 6;

// ---- inputs ------------------------------------------------------------------

// The character fields the card draws. A structural subset of CharacterData so
// this module doesn't drag the engine's type surface into the renderers.
export interface UnitCardCharacter {
  slug: string;
  name: string;
  element: string;
  weapon: string;
  burst: string; // 'I' | 'II' | 'III' | 'Λ'
  class: string;
  manufacturer: string | null;
  burstCooldownSec: number | null;
  releaseDate?: string | null;
}

// dpschart.json's shape (mirrored, not imported — web/src/dpschartData.ts uses
// import.meta.env and can't be imported by a script or a core renderer).
export interface DpsArtifactLike {
  units: Record<string, { name: string; element: string; elements?: string[] }>;
  profiles?: Record<string, string>; // profile id → player-facing note
  cells: Record<string, [string, number, string | null][]>;
}

// The two headline DPS cells, matching the pre-rendered chart set
// (build-infographics.ts HEADLINE_CELL_IDS).
export const NEUTRAL_CELL = 'solo.neutral.c100.8of12';
export const ELEWEAK_CELL = 'solo.eleweak.c100.8of12';

export interface UnitCardSources {
  character: UnitCardCharacter;
  dpschart?: DpsArtifactLike | null;
  burstgen?: BurstGenArtifact | null;
  bufferchart?: BufferChartArtifact | null;
  sustain?: SustainArtifact | null;
  burstcdr?: BurstCdrArtifact | null;
  tags?: string[] | null;
  tagLabels?: Record<string, { label: string }> | null; // archetype vocabulary
  olOptimal?: { type: string; count: number }[] | null;
  tsareena?: TsareenaBuild | null;
  prerelease?: boolean;
  // Neighbour rows each side of the unit in a bar chart. Defaults to
  // NEIGHBOUR_ROWS (landscape); the portrait host passes NEIGHBOUR_ROWS_PORTRAIT
  // because the taller canvas has room for a wider neighbourhood.
  neighbourRows?: number;
}

// ---- outputs -----------------------------------------------------------------

export interface RankTile {
  title: string; // 'Neutral DPS'
  rank: number | null; // null = this board does not rank the unit
  population: number | null; // board size, for a '#3 of 40' reading
  value: string | null; // the board's own displayed number, formatted
  sub: string | null; // sub-label under the value
  // Profile chip for the HEADLINE row (plan §8a) — null when the headline is the
  // unit's plain no-profile row. `altRank`/`altChip` are its OTHER row on the
  // same board (see leadRow for which of the two leads), rendered as a muted
  // sub-line: '#12 default' on a comp-profiled board, '#15 SR' on the DPS chart.
  profileChip: string | null;
  altRank: number | null;
  altChip: string | null;
}

export interface BarRow {
  slug: string;
  name: string;
  element: string;
  value: number; // raw, for bar geometry
  label: string; // the board's formatted value
  rank: number | null;
  isUnit: boolean; // this card's unit — drawn highlighted
  // The unit's appended SECOND row (plan §8a) — its no-profile row on a
  // comp-profiled board, its variant row on the DPS chart: out of rank order BY
  // CONSTRUCTION, drawn below the last neighbour and visually separated.
  isAppendix: boolean;
  profileChip: string | null;
  qualified: boolean; // burst CDR: '*' marker, detail goes to the notes panel
  // Sustain only — the heal/shield/lifesteal split the site draws as three
  // segments inside one track. A single-colour sustain bar loses the
  // composition that makes the board useful.
  segments?: { heal: number; shield: number; lifesteal: number };
}

export interface BarChart {
  title: string;
  rows: BarRow[];
  // Axis bounds over the DRAWN rows. `min < 0` puts a zero axis in the middle
  // and bars span value↔0 on either side — bufferchart's addedPct is
  // negative-capable (soline-frost-ticket is the precedent) and the site already
  // solves it this way (RankBarChart.tsx:80-87); the card mirrors that geometry
  // rather than reinventing it.
  min: number;
  max: number;
  // The unit isn't on this board: the chart still draws its header at full
  // height with a muted 'Unranked' line, preserving fixed geometry.
  unranked: boolean;
}

export interface UnitCardModel {
  slug: string;
  name: string;
  element: string;
  weapon: string;
  burst: string;
  burstIsLambda: boolean; // Λ — no icon asset of its own (see node/icons.ts)
  class: string;
  manufacturer: string | null;
  manufacturerBase: string | null; // ' Overspec' stripped
  overspec: boolean;
  burstCooldownSec: number | null;
  releaseDate: string | null;
  tiles: [RankTile, RankTile, RankTile]; // always exactly three
  charts: BarChart[]; // 0-2; a closed set per ruling 13
  tags: string[]; // display labels, capped at MAX_TAGS
  tagsOverflow: number;
  olOptimal: string | null; // 'Sim-optimal 12/12' line, null when uncomputed
  tsareena: TsareenaBuild | null;
  // Burst-CDR qualifiers ('*' rows) plus any other footnote the panel must
  // carry, since a card has no hover to put them in.
  footnotes: string[];
  prerelease: boolean;
}

// ---- board lookup helpers ----------------------------------------------------

// A unit occupies TWO rows in a profiled board (one `profile: <id>`, one null),
// so every lookup returns both; `leadRow` decides which of them leads.
interface Hit<R> {
  row: R;
  index: number;
  profile: string | null;
}
interface BoardHits<R> {
  profiled: Hit<R> | null;
  plain: Hit<R> | null;
  entries: R[];
}

function findHits<R extends unknown[]>(
  entries: R[] | undefined,
  slug: string,
  profileIdx: number
): BoardHits<R> {
  const out: BoardHits<R> = { profiled: null, plain: null, entries: [] };
  if (!entries) {
    return out;
  }
  out.entries = entries;
  entries.forEach((row, index) => {
    if (row[0] !== slug) {
      return;
    }
    const profile = (row[profileIdx] as string | null) ?? null;
    const hit: Hit<R> = { row, index, profile };
    if (profile) {
      out.profiled ??= hit;
    } else {
      out.plain ??= hit;
    }
  });
  return out;
}

// WHICH of a unit's two rows is the headline depends on what the profile MEANS:
//
//   • A COMP profile (bufferchart / sustain / burst CDR / burst gen — 'w/ Healer',
//     'w/ 2 MG') is the same build of the unit measured in the comp it is played
//     in, so the profiled row is the one worth leading with (plan §8a).
//   • A DPS-CHART VARIANT (src/dpschart/matrix.ts CHART_VARIANTS — Cinderella:
//     Crystal Wave's Snipe/SR, Bready's Distributed, Diesel: Winter Sweets'
//     bursts-second) is an ALTERNATE build/rotation of the unit, and its own note
//     names the plain row as the default. The card leads with that DEFAULT row
//     (owner, 2026-08-18: her card headlined the SR rank when MG is her default).
//
// Either way the other row stays on the card as the muted secondary, so nothing
// is lost — only which number is the big one.
type Lead<R> = { lead: Hit<R>; alt: Hit<R> | null };

function leadRow<R>(
  h: BoardHits<R>,
  prefer: 'profiled' | 'plain' = 'profiled'
): Lead<R> | null {
  const lead =
    prefer === 'plain' ? (h.plain ?? h.profiled) : (h.profiled ?? h.plain);
  if (!lead) {
    return null;
  }
  return { lead, alt: lead === h.profiled ? h.plain : h.profiled };
}

// Chip text for one row: its profile label, or 'default' for the no-profile row.
const chipFor = <R>(hit: Hit<R>): string =>
  hit.profile ? profileLabel(hit.profile) : DEFAULT_CHIP;

// The generic buffer board as the card ranks over it. Off-board units are gone
// from the artifact at the source (scripts/build-bufferchart.ts), so this is a
// backstop for an artifact built before that landed — the published-board fetch
// path can serve one, and a stale row ahead of the unit silently shifts every
// rank below it (Crown read #2 behind an off-board Chime until 2026-08-13).
// NOT rankedBufferRows: negative rows keep their rank here, because the card
// quotes a unit's own value whatever its sign rather than declaring it unranked.
const bufferBoardRows = (
  art: BufferChartArtifact | null | undefined
): BufferRow[] => onBoardBufferRows(art?.cells?.generic);

// ---- tile builders -----------------------------------------------------------

const unrankedTile = (title: string): RankTile => ({
  title,
  rank: null,
  population: null,
  value: null,
  sub: null,
  profileChip: null,
  altRank: null,
  altChip: null,
});

// The rank/chip half of every tile — identical on all five boards, so the
// headline/secondary rule lives in ONE place and a board can't drift from it.
const tileRanks = <R>(
  l: Lead<R>,
  hits: BoardHits<R>
): Pick<
  RankTile,
  'rank' | 'population' | 'profileChip' | 'altRank' | 'altChip'
> => ({
  rank: l.lead.index + 1,
  population: hits.entries.length,
  // Both rows are chipped whenever the unit HAS two — the tile quotes two ranks,
  // and an unlabelled headline beside '#15 SR' doesn't say which build it is. A
  // unit with a single row keeps a bare tile.
  profileChip: l.lead.profile
    ? profileLabel(l.lead.profile)
    : l.alt
      ? DEFAULT_CHIP
      : null,
  altRank: l.alt ? l.alt.index + 1 : null,
  altChip: l.alt ? chipFor(l.alt) : null,
});

function dpsTile(
  title: string,
  art: DpsArtifactLike | null | undefined,
  cellId: string,
  slug: string
): RankTile {
  const cell = art?.cells?.[cellId];
  const hits = findHits(cell, slug, 2);
  // 'plain': a DPS-chart profile is a build variant, so the DEFAULT row leads.
  const l = leadRow(hits, 'plain');
  if (!l || !cell?.length) {
    return unrankedTile(title);
  }
  const top = cell[0][1];
  const dps = l.lead.row[1] as number;
  return {
    title,
    ...tileRanks(l, hits),
    // rel-score vs the population #1 — the site's own DPS label (dpsChart.ts
    // relScore). NOT a raw DPS number: the boards are normalized, and a raw
    // number would imply a precision the card can't stand behind.
    value: (top > 0 ? dps / top : 0).toFixed(3),
    sub: 'rel. to #1',
  };
}

function burstGenTile(
  art: BurstGenArtifact | null | undefined,
  slug: string
): RankTile {
  const hits = findHits(art?.entries, slug, 4);
  const l = leadRow(hits);
  if (!l) {
    return unrankedTile('Burst Gen');
  }
  const [, gaugePerSec, gaugeTotal, fullBursts] = l.lead.row;
  return {
    title: 'Burst Gen',
    ...tileRanks(l, hits),
    value: `${gaugePerSec.toFixed(2)}%/s`,
    sub: `${(gaugeTotal / 100).toFixed(1)} bars · ${fullBursts.toFixed(1)} FB`,
  };
}

function bufferTile(
  art: BufferChartArtifact | null | undefined,
  slug: string
): RankTile {
  // The site's default view is the generic board (SupportRankings.tsx
  // useState('generic')); the card mirrors that default.
  const hits = findHits(bufferBoardRows(art), slug, 3);
  const l = leadRow(hits);
  if (!l) {
    return unrankedTile('Team Buffs');
  }
  const added = l.lead.row[1];
  return {
    title: 'Team Buffs',
    ...tileRanks(l, hits),
    value: `${added >= 0 ? '+' : '−'}${Math.abs(added).toFixed(1)}%`,
    sub: 'team DMG',
  };
}

function sustainTile(
  art: SustainArtifact | null | undefined,
  slug: string
): RankTile {
  const hits = findHits(art?.entries, slug, 6);
  const l = leadRow(hits);
  if (!l) {
    return unrankedTile('Sustain');
  }
  const [, totalHp, totalPct] = l.lead.row;
  return {
    title: 'Sustain',
    ...tileRanks(l, hits),
    value: fmtMagnitude(totalHp),
    sub: `${totalPct.toFixed(0)}% of max HP`,
  };
}

function burstCdrTile(
  art: BurstCdrArtifact | null | undefined,
  slug: string
): RankTile {
  const hits = findHits(art?.entries, slug, 5);
  const l = leadRow(hits);
  if (!l) {
    return unrankedTile('Burst CDR');
  }
  const [, cdr, ramp, condition, selfCdr] = l.lead.row;
  const qualified = !!(ramp || condition || selfCdr != null);
  return {
    title: 'Burst CDR',
    ...tileRanks(l, hits),
    value: `${cdr.toFixed(1)}s`,
    sub: `per 20s FB${qualified ? ' *' : ''}`,
  };
}

// ---- bar-chart builders ------------------------------------------------------

// Slice `rows` to the unit's neighbourhood. The window is CLAMPED to the board
// edges and then re-expanded, so a #1 unit still gets a full-height chart
// (window [0..2] rather than [-1..1] collapsed to 2 rows) — fixed geometry
// again: a chart that shrinks at the top of a board would make the #1 card, the
// most likely thing to be posted, the one that looks broken.
function neighbourhood<T>(rows: T[], index: number, each: number): T[] {
  const span = each * 2 + 1;
  if (rows.length <= span) {
    return rows;
  }
  let start = index - each;
  if (start < 0) {
    start = 0;
  }
  if (start + span > rows.length) {
    start = rows.length - span;
  }
  return rows.slice(start, start + span);
}

const axis = (values: number[]): { min: number; max: number } => {
  const min = Math.min(0, ...values); // never a floating baseline
  const max = Math.max(0, ...values);
  return { min, max };
};

const emptyChart = (title: string): BarChart => ({
  title,
  rows: [],
  min: 0,
  max: 1,
  unranked: true,
});

function dpsChartRows(
  title: string,
  art: DpsArtifactLike | null | undefined,
  cellId: string,
  slug: string,
  each: number
): BarChart {
  const cell = art?.cells?.[cellId];
  if (!cell?.length) {
    return emptyChart(title);
  }
  const hits = findHits(cell, slug, 2);
  const top = cell[0][1];
  return boardChart(
    title,
    hits,
    each,
    (row, i, isUnit) => {
      const [s, dps, profile] = row as [string, number, string | null];
      const meta = art?.units?.[s];
      const rel = top > 0 ? dps / top : 0;
      return {
        slug: s,
        name: meta?.name ?? s,
        element: meta?.element ?? '',
        value: rel,
        label: rel.toFixed(3),
        rank: i + 1,
        isUnit: isUnit && s === slug,
        isAppendix: false,
        profileChip: profile ? profileLabel(profile) : null,
        qualified: false,
      };
    },
    // The DEFAULT build leads on this board; the variant is the appendix.
    'plain'
  );
}

// Chip text for the unit's own no-profile row (see chipFor / boardChart).
const DEFAULT_CHIP = 'default';

// Shared shape for every profiled board: build the neighbourhood around the
// HEADLINE row (leadRow — profiled on the comp boards, default on the DPS
// chart), then append the unit's OTHER row below the last neighbour if it exists
// and isn't already in the window (plan §8a — it is out of rank order by
// construction, and that is intended).
function boardChart<R extends unknown[]>(
  title: string,
  hits: BoardHits<R>,
  each: number,
  toRow: (row: R, index: number, isUnit: boolean) => BarRow,
  prefer: 'profiled' | 'plain' = 'profiled'
): BarChart {
  const l = leadRow(hits, prefer);
  if (!l) {
    return emptyChart(title);
  }
  const indexed = hits.entries.map((row, i) => ({ row, i }));
  const window = neighbourhood(indexed, l.lead.index, each);
  const rows = window.map((w) => toRow(w.row, w.i, w.i === l.lead.index));
  if (l.alt) {
    // BOTH of the unit's rows are chipped — the same unit appearing twice with
    // one row unlabelled reads as a duplicate. toRow already chips a profiled
    // row; this adds 'default' to the no-profile one, whichever of the two leads.
    rows[window.findIndex((w) => w.i === l.lead.index)].profileChip = chipFor(
      l.lead
    );
    // The second standing is chipped WHEREVER it lands. A wide enough
    // neighbourhood pulls it into the window in rank order (the portrait variant
    // does exactly this), and there it is neither appended nor out of order.
    // Only the APPENDED copy gets isAppendix, which is what dims it; an in-window
    // one is an ordinary row.
    const inWindow = window.findIndex((w) => w.i === l.alt!.index);
    if (inWindow >= 0) {
      rows[inWindow].profileChip = chipFor(l.alt);
    } else {
      const appendix = toRow(l.alt.row, l.alt.index, false);
      appendix.isAppendix = true;
      appendix.profileChip = chipFor(l.alt);
      rows.push(appendix);
    }
  }
  return { title, rows, ...axis(rows.map((r) => r.value)), unranked: false };
}

const nameOf = (
  units: Record<string, RankUnitMeta> | undefined,
  slug: string
): { name: string; element: string } => ({
  name: units?.[slug]?.name ?? slug,
  element: units?.[slug]?.element ?? '',
});

function bufferChart(
  art: BufferChartArtifact | null | undefined,
  slug: string,
  each: number
): BarChart {
  const hits = findHits(bufferBoardRows(art), slug, 3);
  return boardChart('Team Buffs — team DMG', hits, each, (row, i, isUnit) => {
    const [s, added, , profile] = row as [
      string,
      number,
      string[] | null,
      string | null,
    ];
    return {
      slug: s,
      ...nameOf(art?.units, s),
      value: added,
      label: `${added >= 0 ? '+' : '−'}${Math.abs(added).toFixed(1)}%`,
      rank: i + 1,
      isUnit: isUnit && s === slug,
      isAppendix: false,
      profileChip: profile ? profileLabel(profile) : null,
      qualified: false,
    };
  });
}

function sustainChart(
  art: SustainArtifact | null | undefined,
  slug: string,
  each: number
): BarChart {
  const hits = findHits(art?.entries, slug, 6);
  return boardChart('Sustain', hits, each, (row, i, isUnit) => {
    const [s, totalHp, totalPct, healPct, shieldPct, lifestealPct, profile] =
      row as [string, number, number, number, number, number, string | null];
    return {
      slug: s,
      ...nameOf(art?.units, s),
      value: totalHp,
      label: fmtMagnitude(totalHp),
      rank: i + 1,
      isUnit: isUnit && s === slug,
      isAppendix: false,
      profileChip: profile ? profileLabel(profile) : null,
      qualified: false,
      // Split as FRACTIONS of the row's own total, so the renderer can lay the
      // three segments out inside one track without re-deriving proportions.
      segments:
        totalPct > 0
          ? {
              heal: healPct / totalPct,
              shield: shieldPct / totalPct,
              lifesteal: lifestealPct / totalPct,
            }
          : { heal: 1, shield: 0, lifesteal: 0 },
    };
  });
}

function burstCdrChart(
  art: BurstCdrArtifact | null | undefined,
  slug: string,
  each: number
): BarChart {
  const hits = findHits(art?.entries, slug, 5);
  return boardChart('Burst CDR', hits, each, (row, i, isUnit) => {
    const [s, cdr, ramp, condition, selfCdr, profile] = row as [
      string,
      number,
      number[] | null,
      string | null,
      number | null,
      string | null,
    ];
    return {
      slug: s,
      ...nameOf(art?.units, s),
      value: cdr,
      label: `${cdr.toFixed(1)}s`,
      rank: i + 1,
      isUnit: isUnit && s === slug,
      isAppendix: false,
      profileChip: profile ? profileLabel(profile) : null,
      qualified: !!(ramp || condition || selfCdr != null),
    };
  });
}

// ---- overload ----------------------------------------------------------------

// Line-type labels (kept local rather than imported: the overload modules pull in the
// engine, and core/ renderers must stay
// dependency-light enough for the web bundle).
const OL_LABEL: Record<string, string> = {
  elem: 'Elemental DMG',
  atk: 'ATK',
  ammo: 'Max Ammo',
  chargedmg: 'Charge DMG',
  chargespd: 'Charge Speed',
  critrate: 'Crit Rate',
  critdmg: 'Crit DMG',
};

// data/ol-optimal.json holds the 12/12 REMAINDER — the 4 rolls the sim chooses
// beyond a floor of 4 Elemental DMG + 4 ATK that every build takes. The card
// states the whole 12, floor included: shown alone the remainder reads as the
// entire recommendation, which is a 4-roll build.
const OL_FLOOR: { type: string; count: number }[] = [
  { type: 'elem', count: 4 },
  { type: 'atk', count: 4 },
];

const olLine = (
  lines: { type: string; count: number }[] | null | undefined
): string | null =>
  lines?.length
    ? [...OL_FLOOR, ...lines]
        .map((l) => `${l.count}× ${OL_LABEL[l.type] ?? l.type}`)
        .join(' · ')
    : null;

// ---- tags --------------------------------------------------------------------

// The archetype vocabulary spells "buffs this stat" as a trailing ▲ (U+25B2) —
// e.g. 'ATK ▲'. Roboto HAS NO U+25B2, and the Node renderer registers only the
// bundled Roboto faces, so that character renders as a TOFU BOX (□) on every
// pre-rendered card while a browser silently falls back to a system face: two
// hosts, two pictures, which is exactly what these renderers exist to prevent.
// (canvas2d.ts's drawAdvantageMark documents the same trap and solves it with a
// drawn path — but a path can't sit inside a measured pill label, so the tag
// text is normalized to ASCII instead.)
const tagLabel = (label: string): string =>
  label.replace(/\s*▲/g, '+').replace(/\s*▼/g, '−');

// ---- main builder ------------------------------------------------------------

// Burst stage → the tile/bar SET (§7). `Λ` is treated as B3 per ruling 10:
// red-hood (Red Hood, SR/Iron Attacker) is the only Λ unit, and NOT
// rapi-red-hood (Rapi: Red Hood, MG/Fire), which is a different unit already
// typed 'III'.
export const isDpsSet = (burst: string): boolean =>
  burst === 'III' || burst === 'Λ';

export function buildUnitCardData(src: UnitCardSources): UnitCardModel {
  const c = src.character;
  const slug = c.slug;
  const dpsSet = isDpsSet(c.burst);
  const nb = src.neighbourRows ?? NEIGHBOUR_ROWS;
  // The solo-chart bonus is a DELTA, not an absolute, so the "spend freed height
  // on neighbours" lever survives a variant that already draws more of them.
  const nbSolo = NEIGHBOUR_ROWS_SOLO_CHART + (nb - NEIGHBOUR_ROWS);

  // --- tiles: always exactly three (§7) ---
  let tiles: [RankTile, RankTile, RankTile];
  if (dpsSet) {
    tiles = [
      dpsTile('Neutral DPS', src.dpschart, NEUTRAL_CELL, slug),
      dpsTile('Ele. Adv. DPS', src.dpschart, ELEWEAK_CELL, slug),
      burstGenTile(src.burstgen, slug),
    ];
  } else {
    // B1/B2: buffer, then sustain → else burst CDR → else an unranked tile
    // (never an omitted one).
    const sus = sustainTile(src.sustain, slug);
    const cdr = burstCdrTile(src.burstcdr, slug);
    const second = sus.rank != null ? sus : cdr.rank != null ? cdr : sus;
    tiles = [
      bufferTile(src.bufferchart, slug),
      second,
      burstGenTile(src.burstgen, slug),
    ];
  }

  // --- bar charts: a strict SUBSET of the tiles (ruling 13) ---
  // Burst gen is a tile only — it never gets a chart.
  const charts: BarChart[] = [];
  if (dpsSet) {
    // The B3 DPS bars can never carry a profile: dpschart has no profile
    // concept at all. Worth knowing — the headline cards need none of §8a.
    charts.push(
      dpsChartRows('Neutral DPS', src.dpschart, NEUTRAL_CELL, slug, nb),
      dpsChartRows('Ele. Adv. DPS', src.dpschart, ELEWEAK_CELL, slug, nb)
    );
  } else {
    // Ruling 13 as written: "sustain if present, else burst CDR if present".
    // Presence is a plain board lookup again — the sustain board no longer lists
    // units at 0 (scripts/build-sustain.ts filters them), so being ON it is the
    // same statement as having sustain, and burst CDR has never carried a zero.
    const hasSustain = !!leadRow(findHits(src.sustain?.entries, slug, 6));
    const hasCdr = !!leadRow(findHits(src.burstcdr?.entries, slug, 5));
    // No second chart → spend the freed height on more neighbours in the
    // surviving one, never on whitespace (§6c lever 1).
    const each = hasSustain || hasCdr ? nb : nbSolo;
    charts.push(bufferChart(src.bufferchart, slug, each));
    if (hasSustain) {
      charts.push(sustainChart(src.sustain, slug, nb));
    } else if (hasCdr) {
      charts.push(burstCdrChart(src.burstcdr, slug, nb));
    }
  }

  // --- footnotes: qualifier detail, since a card has no hover (§8) ---
  const footnotes: string[] = [];
  const cdrHit = leadRow(findHits(src.burstcdr?.entries, slug, 5));
  if (cdrHit) {
    const [, , ramp, condition, selfCdr] = cdrHit.lead.row;
    if (condition) {
      footnotes.push(`* ${condition}`);
    }
    if (selfCdr != null) {
      footnotes.push(`* self-only CDR: ${selfCdr}s`);
    }
    if (ramp?.length) {
      // ASCII '->' , not '→' (U+2192): Roboto has no arrow glyph, so it renders
      // as a tofu box on the Node host. Verified by the font-glyph test rather
      // than assumed — U+2212 MINUS and U+039B LAMBDA, which the card also uses,
      // ARE present, so "non-ASCII" alone is not the rule.
      footnotes.push(`* ramps per FB: ${ramp.join(' -> ')}`);
    }
  }

  // --- tags ---
  const allTags = src.tags ?? [];
  const tags = allTags
    .slice(0, MAX_TAGS)
    .map((t) => tagLabel(src.tagLabels?.[t]?.label ?? t));

  const mfr = c.manufacturer;
  return {
    slug,
    name: c.name,
    element: c.element,
    weapon: c.weapon,
    burst: c.burst,
    burstIsLambda: c.burst === 'Λ',
    class: c.class,
    manufacturer: mfr,
    manufacturerBase: mfr ? mfr.replace(/ Overspec$/, '') : null,
    overspec: !!mfr && / Overspec$/.test(mfr),
    burstCooldownSec: c.burstCooldownSec,
    releaseDate: c.releaseDate ?? null,
    tiles,
    charts,
    tags,
    tagsOverflow: Math.max(0, allTags.length - tags.length),
    olOptimal: olLine(src.olOptimal),
    tsareena: src.tsareena ?? null,
    footnotes,
    prerelease: !!src.prerelease,
  };
}
