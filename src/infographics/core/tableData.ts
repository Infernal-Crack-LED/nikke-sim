// TableCardData builders for the breakpoint/economy tables (max-ammo,
// charge-speed, OL roll costs) — the DATA half of bakery-bot's /max-ammo,
// /charge-speed and /ol commands, mirrored formula-for-formula so the site's
// API renders the same rows the bot used to (constants and rounding are
// load-bearing). Pure and DOM-free like the rest of core/: callers attach the
// icon/portrait and render via drawTableCard.
import type { TableCardData } from './tableCard.js';

// ---- max ammo ---------------------------------------------------------------

// T11 Max Ammunition Capacity ▲ per OL line (datamined tier-11 value).
export const AMMO_PER_LINE_T11 = 68.93;

// Per-OL-line ammo breakpoints for a weapon with `base` rounds. Mirrors
// bakery-bot apps/bot/src/commands/utility/max-ammo.ts buildAmmoTable: a line
// count that doesn't cross a whole round is omitted (Math.floor), matching the
// bot's rows exactly.
export function buildAmmoTable(base: number, name: string): TableCardData {
  const rows: string[][] = [];
  for (let lines = 1; lines <= 5; lines++) {
    const pct = lines * AMMO_PER_LINE_T11;
    const ammo = Math.floor(base * (1 + pct / 100));
    if (ammo <= base) {
      continue;
    }
    rows.push([`${lines}`, `${pct.toFixed(1)}%`, `${ammo}`, `+${ammo - base}`]);
  }
  return {
    title: `Max Ammo — ${name}`,
    subtitle: `Base ${base} rounds · T11 = ${AMMO_PER_LINE_T11}% ammo/line`,
    columns: [
      { header: 'OL Lines' },
      { header: 'Ammo %', align: 'right' },
      { header: 'Rounds', align: 'right' },
      { header: 'Gain', align: 'right' },
    ],
    rows,
    footer: 'nikkesim.app/charge',
  };
}

// ---- charge speed -----------------------------------------------------------

// T11 Charge Speed ▲ per OL line; frame math mirrors the bot's charge-speed.ts.
export const CS_PER_LINE_T11 = 4.92;
export const RELEASE_LATENCY_FRAMES = 22;
export const FULL_BURST_FRAMES = 600;
// The no-unit generic table's basis (1.0s charge = 60 frames).
export const GENERIC_BASE_FRAMES = 60;
const FRAME_MS = 1000 / 60;

// Every reachable charge-frame count below base, with the infimum CS% that
// reaches it (charge is continuous; frames quantize). Mirrors the bot's
// chargeFrameBreakpoints, including the 1e-9 epsilon + ceil-to-cent rounding.
function chargeFrameBreakpoints(
  baseFrames: number
): { frames: number; csNeeded: number }[] {
  const rows: { frames: number; csNeeded: number }[] = [];
  for (let n = baseFrames - 1; n >= 1; n--) {
    const infimum = 100 * (1 - (n + 0.5) / baseFrames);
    const csNeeded = Math.ceil((infimum + 1e-9) * 100) / 100;
    rows.push({ frames: n, csNeeded });
  }
  return rows;
}

// The best (lowest-frame) breakpoint `lines` OL lines of T11 CS reach.
function bestPerLine(
  baseFrames: number,
  lines: number
): { frames: number; csNeeded: number } | null {
  const totalCs = lines * CS_PER_LINE_T11;
  const bps = chargeFrameBreakpoints(baseFrames);
  let best: { frames: number; csNeeded: number } | null = null;
  for (const bp of bps) {
    if (bp.csNeeded <= totalCs) {
      best = bp;
    }
  }
  return best;
}

// Mirrors the bot's buildChargeTable: rows are the best breakpoint per OL line
// count (skipped when 1–5 lines reach nothing — only degenerate tiny bases).
export function buildChargeTable(
  baseFrames: number,
  label: string
): TableCardData {
  const rows: string[][] = [];
  for (let lines = 1; lines <= 5; lines++) {
    const bp = bestPerLine(baseFrames, lines);
    if (!bp) {
      continue;
    }
    const ms = bp.frames * FRAME_MS;
    const shotsFb = FULL_BURST_FRAMES / (bp.frames + RELEASE_LATENCY_FRAMES);
    rows.push([
      `${lines}`,
      `≥ ${bp.csNeeded.toFixed(2)}%`,
      `${bp.frames}f`,
      `${ms.toFixed(0)} ms`,
      shotsFb.toFixed(2),
    ]);
  }
  return {
    title: `Charge Speed — ${label}`,
    subtitle: `Base ${baseFrames}f (${(baseFrames / 60).toFixed(2)}s) · T11 = ${CS_PER_LINE_T11}% CS/line · shots per Full Burst (10s)`,
    columns: [
      { header: 'OL Lines' },
      { header: 'CS Needed', align: 'right' },
      { header: 'Charge', align: 'right' },
      { header: 'Time', align: 'right' },
      { header: 'Shots/FB', align: 'right' },
    ],
    rows,
    footer: 'nikkesim.app/charge',
  };
}

// ---- OL roll costs ----------------------------------------------------------

// web/public/ol-default.json (committed; built by scripts/build-ol-default.ts).
export interface OlPieceResult {
  expRolls: number;
  p50: number;
  p95: number;
  phase1: number;
  phase2: number;
  modules: number;
  modulesP95: number;
}
export interface OlDefaultArtifact {
  generatedAt: string;
  config: { lines: string[]; pieces: number; trials: number };
  perPiece: OlPieceResult[];
  total: OlPieceResult;
}

// The /ol table: 4 pieces + Full Build. Mirrors the bot's ol.ts buildTable;
// the subtitle is composed from the artifact's config (lines, piece count,
// trial count) instead of the bot's hardcoded string.
export function buildOlTable(art: OlDefaultArtifact): TableCardData {
  const row = (label: string, p: OlPieceResult) => [
    label,
    `${p.expRolls}`,
    `${p.p95}`,
    `${p.phase1} / ${p.phase2}`,
    `${p.modules}`,
    `${p.modulesP95}`,
  ];
  const rows = art.perPiece.map((p, i) => row(`Piece ${i + 1}`, p));
  rows.push(row('Full Build', art.total));
  const trialsK =
    art.config.trials >= 1000
      ? `${art.config.trials / 1000}k`
      : `${art.config.trials}`;
  return {
    title: 'Overload Roll Calculator — Default 8/12',
    subtitle: `${art.config.lines.join(' + ')} · ${art.config.pieces} pieces · ${trialsK}-trial Monte Carlo`,
    columns: [
      { header: '' },
      { header: 'Exp Rolls', align: 'right' },
      { header: 'P95', align: 'right' },
      { header: 'Ph1 / Ph2', align: 'right' },
      { header: 'Modules', align: 'right' },
      { header: 'Mod P95', align: 'right' },
    ],
    rows,
    footer: 'nikkesim.app/olsim',
  };
}
