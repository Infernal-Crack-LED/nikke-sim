// Shared harness for the sim-only accuracy batteries (scripts/battery/*).
//
// A "battery" is a set of teams covering the whole supported roster, each run
// through a matrix of conditions (boss element x core exposure) as seeded
// Monte Carlo (mean over SEEDS runs, default 15, seeds 1000+i — the same seed
// convention as scripts/experiment.ts so paired comparisons cancel variance).
// All runs use the scope-lock basis: sync 400, 10/10/10, no cube, OL0, core 7
// equivalent via coreHitRate, treasure units, partless boss, 180s.
//
// Not part of the product; consumed by the battery entry scripts.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier, SimConfig, Element } from '../../src/types.js';
import { runSim, type SimResult } from '../../src/engine/sim.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from '../../src/prepare.js';

// element → the element it beats (mirror of the engine's BEATS map): to give a
// unit of element E advantage, set the boss element to BEATS[E].
export const BEATS: Record<Element, Element> = {
  Electric: 'Water', Iron: 'Electric', Wind: 'Iron', Fire: 'Wind', Water: 'Fire',
};

export interface BatteryTeam {
  name: string;
  slugs: string[]; // slot order; index 2 = default camera focus (middle)
  source?: string; // provenance: enikk raid + popularity, or 'roster fill' (label-only; not consumed by the sim)
  focus?: string;  // camera-focus slug → SimConfig.focusSlug (honored by the shared runOnce path).
                   // undefined ⇒ engine default (middle slot).
  modes?: Record<string, string>;
  lambda?: Record<string, 1 | 2 | 3>;
}

export interface Cell {
  label: string;
  boss: Element | null; // null = forced neutral
  coreHitRate: number;  // core exposure 0 / 0.5 / 1
}

interface World {
  data: DataFile;
  mult: LevelMultiplier;
  cubes: CubesFile;
  olLines: OlLinesFile;
  skillLevels: SkillLevelData;
  roster: string[]; // every override-backed slug (the supported roster)
}

export function loadWorld(): World {
  const data: DataFile = JSON.parse(readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8'));
  const mult: LevelMultiplier = JSON.parse(readFileSync(new URL('../../data/level-multiplier.json', import.meta.url), 'utf8'));
  const cubes: CubesFile = JSON.parse(readFileSync(new URL('../../data/cubes.json', import.meta.url), 'utf8'));
  const olLines: OlLinesFile = JSON.parse(readFileSync(new URL('../../data/ol-lines.json', import.meta.url), 'utf8'));
  let skillLevels: SkillLevelData = {};
  try {
    skillLevels = JSON.parse(readFileSync(new URL('../../data/skill-levels.json', import.meta.url), 'utf8'));
  } catch { /* optional */ }
  const roster = readdirSync(new URL('../../src/skills/overrides', import.meta.url))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  return { data, mult, cubes, olLines, skillLevels, roster };
}

const burstOf = (w: World, slug: string) => w.data.characters[slug].burst;
const elementOf = (w: World, slug: string) => w.data.characters[slug].element as Element;

// Kit-mode + lambda wiring the lab comps established:
//  - mint/prika duet when both are fielded (owner convention: manual first
//    burst, mint leftmost — the duet mode strings encode the kit side);
//  - emma:TU defaults to her duo parse, so force 'solo' when eunhwa:TU is
//    absent; eunhwa:TU has ONLY a duo parse — flag her if fielded alone;
//  - red-hood (Λ) is pinned to B3 (owner ruling 2026-07-14: players do field
//    her as a solo B1, but her 40s burst cooldown binds the whole rotation —
//    an outlier shape we exclude so it can't poison battery data; a team
//    without another B1 gets the rotation-outlier warning instead).
export function autoWire(w: World, team: BatteryTeam): string[] {
  const warnings: string[] = [];
  const has = (s: string) => team.slugs.includes(s);
  team.modes = { ...team.modes };
  const lambda = (team.lambda = { ...team.lambda });
  if (has('mint') && has('prika')) {
    team.modes.mint ??= 'duet (w/ Prika)';
    team.modes.prika ??= 'duet (w/ Mint)';
  }
  if (has('emma-tactical-upgrade') && !has('eunhwa-tactical-upgrade')) {
    team.modes['emma-tactical-upgrade'] ??= 'solo';
  }
  if (has('eunhwa-tactical-upgrade') && !has('emma-tactical-upgrade')) {
    warnings.push('eunhwa-tactical-upgrade has only a duo kit parse but emma-tactical-upgrade is absent');
  }
  if (has('red-hood') && lambda['red-hood'] === undefined) {
    lambda['red-hood'] = 3;
  }
  // rotation-viability check (owner ruling: a real team always has at least
  // B1 + B2 + 2x B3)
  const eff = team.slugs.map((s) =>
    s === 'red-hood' ? `${['', 'I', 'II', 'III'][lambda['red-hood'] ?? 3]}` : burstOf(w, s));
  const n = (b: string) => eff.filter((x) => x === b).length;
  if (n('I') < 1 || n('II') < 1 || n('III') < 2) {
    warnings.push(`rotation-outlier shape (B1 x${n('I')}, B2 x${n('II')}, B3 x${n('III')})`);
  }
  return warnings;
}

export function runOnce(w: World, team: BatteryTeam, boss: Element | null, coreHitRate: number, seed?: number): SimResult {
  const chars = team.slugs.map((s) => w.data.characters[s]);
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of team.slugs) overrides[s] = loadOverride(s);
  const unitOpts: UnitOptions[] = team.slugs.map((slug) => ({
    doll: false, ol: 'base5', mode: team.modes?.[slug], lambdaStage: team.lambda?.[slug],
  }));
  const cfg: SimConfig = {
    slugs: team.slugs, bossElement: boss, bossDef: 0, level: 400, copies: 10,
    doll: false, ol: 'base5', coreHitRate, rangeBonus: true, durationSec: 180, seed,
    focusSlug: team.focus, // undefined ⇒ engine default (middle slot)
  };
  const prepared = prepareTeam(chars, unitOpts, { overrides, skillLevels: w.skillLevels, cubes: w.cubes, olLines: w.olLines });
  return runSim(chars, w.mult, cfg, prepared);
}

// "pick one of the b3s that is bursting": probe run (neutral, full core), take
// the first unit in slot order that is a B3 (or Λ) AND actually cast bursts,
// and return the boss element that gives IT elemental advantage.
export function pickAdvantageBoss(w: World, team: BatteryTeam): { boss: Element; via: string } {
  const probe = runOnce(w, team, null, 1, 1000);
  const isB3 = (u: { burst: string }) => u.burst === 'III' || u.burst === 'Λ';
  const pick = probe.units.find((u) => isB3(u) && u.burstCasts > 0)
    ?? probe.units.find((u) => isB3(u))
    ?? probe.units[0];
  return { boss: BEATS[pick.element as Element], via: pick.slug };
}

export interface CellStats {
  fbDist: Record<number, number>; // full-burst count → n seeds
  teamMean: number;
  units: Record<string, { mean: number; sd: number; pulls: number }>;
}

export function runCellMC(w: World, team: BatteryTeam, cell: Cell, nSeeds: number): CellStats {
  const totals = new Map<string, number[]>();
  const pulls = new Map<string, number>();
  const fbDist: Record<number, number> = {};
  for (let i = 0; i < nSeeds; i++) {
    const res = runOnce(w, team, cell.boss, cell.coreHitRate, 1000 + i);
    fbDist[res.fullBursts] = (fbDist[res.fullBursts] ?? 0) + 1;
    for (const u of res.units) {
      if (!totals.has(u.slug)) totals.set(u.slug, []);
      totals.get(u.slug)!.push(u.totalDamage);
      pulls.set(u.slug, u.pulls);
    }
  }
  const units: CellStats['units'] = {};
  let teamMean = 0;
  for (const [slug, arr] of totals) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
    units[slug] = { mean, sd, pulls: pulls.get(slug)! };
    teamMean += mean;
  }
  return { fbDist, teamMean, units };
}

const M = (n: number) => (n / 1e6).toFixed(0);
const fbStr = (d: Record<number, number>, n: number) =>
  Object.entries(d).sort((a, b) => +a[0] - +b[0]).map(([c, k]) => `${c}x${Math.round((100 * k) / n)}%`).join(' ');

// Run every team through every cell and print the comparison matrix.
// Cells are printed as columns per unit; the last cell is treated as the
// reference for the ±sd% column. Returns the raw stats (also dumped to
// OUT=<path> as JSON when set).
export function runBattery(
  w: World,
  teams: BatteryTeam[],
  cellsFor: (team: BatteryTeam) => Cell[],
  opts?: {
    title?: string;
    // derived ratio columns, by cell INDEX (num/den), e.g. core sensitivity
    // {label: 'c100/c0', num: 2, den: 0} or advantage lift {num: 5, den: 2}
    derived?: { label: string; num: number; den: number }[];
  },
) {
  const nSeeds = Number(process.env.SEEDS ?? 15);
  const only = process.env.ONLY?.toLowerCase();
  const out: Record<string, { team: BatteryTeam; warnings: string[]; cells: Record<string, CellStats> }> = {};

  // battery-wide repeat report
  const seen = new Map<string, number>();
  for (const t of teams) for (const s of t.slugs) seen.set(s, (seen.get(s) ?? 0) + 1);
  const repeats = [...seen.entries()].filter(([, n]) => n > 1);
  const missing = w.roster.filter((s) => !seen.has(s));
  if (opts?.title) console.log(`===== ${opts.title} =====`);
  console.log(`${teams.length} teams, ${seen.size}/${w.roster.length} roster units, MC n=${nSeeds} per cell`);
  if (repeats.length) console.log(`repeated units (scarcity fills): ${repeats.map(([s, n]) => `${s} x${n}`).join(', ')}`);
  if (missing.length) console.log(`NOT COVERED: ${missing.join(', ')}`);

  for (const team of teams) {
    if (only && !team.name.toLowerCase().includes(only)) continue;
    const warnings = autoWire(w, team);
    console.log(`\n=== ${team.name} — ${team.source}`);
    console.log(`    ${team.slugs.join(', ')}`);
    const wired = [
      ...Object.entries(team.modes ?? {}).map(([s, m]) => `${s}: ${m}`),
      ...Object.entries(team.lambda ?? {}).map(([s, l]) => `${s}: bursts as B${l}`),
    ];
    if (wired.length) console.log(`    wiring: ${wired.join(' | ')}`);
    for (const wmsg of warnings) console.log(`    ⚠ ${wmsg}`);
    const cells = cellsFor(team);
    const stats: Record<string, CellStats> = {};
    for (const cell of cells) stats[cell.label] = runCellMC(w, team, cell, nSeeds);
    out[team.name] = { team, warnings, cells: stats };
    for (const cell of cells) {
      const st = stats[cell.label];
      console.log(`    ${cell.label.padEnd(22)} FBs ${fbStr(st.fbDist, nSeeds).padEnd(18)} team ${M(st.teamMean).padStart(6)}M`);
    }
    // per-unit matrix: one column per cell + derived sensitivity ratios
    const ref = cells[cells.length - 1].label;
    const derived = opts?.derived ?? [{ label: `${ref}/${cells[0].label}`, num: cells.length - 1, den: 0 }];
    const header = [
      'unit'.padEnd(26),
      ...cells.map((c) => c.label.padStart(10)),
      '±sd%'.padStart(6),
      ...derived.map((d) => d.label.padStart(10)),
    ];
    console.log('    ' + header.join(' '));
    for (const slug of team.slugs) {
      const cols = cells.map((c) => M(stats[c.label].units[slug].mean).padStart(10));
      const refU = stats[ref].units[slug];
      const sdPct = refU.mean ? ((100 * refU.sd) / refU.mean).toFixed(1) : '0.0';
      const ratios = derived.map((d) => {
        const num = stats[cells[d.num].label].units[slug].mean;
        const den = stats[cells[d.den].label].units[slug].mean;
        return (den ? (num / den).toFixed(3) : '-').padStart(10);
      });
      console.log('    ' + [slug.padEnd(26), ...cols, sdPct.padStart(6), ...ratios].join(' '));
    }
  }
  if (process.env.OUT) {
    writeFileSync(process.env.OUT, JSON.stringify({ nSeeds, batteries: out }, null, 1));
    console.log(`\nJSON dumped to ${process.env.OUT}`);
  }
  return out;
}

// Entry point shared by the realistic per-element scripts: hardcoded enikk
// anchor teams + deterministic roster fill, run at ONE boss element (or null =
// forced neutral) across core exposure 0/50/100.
// NOFILL=1 runs only the hardcoded anchor teams.
export function runRealisticBattery(w: World, anchors: BatteryTeam[], boss: Element | null, title: string) {
  const teams = process.env.NOFILL
    ? anchors
    : [...anchors, ...fillRoster(w, anchors, boss ?? undefined)];
  const cells: Cell[] = [
    { label: `${boss ?? 'neutral'} c0`, boss, coreHitRate: 0 },
    { label: `${boss ?? 'neutral'} c50`, boss, coreHitRate: 0.5 },
    { label: `${boss ?? 'neutral'} c100`, boss, coreHitRate: 1 },
  ];
  return runBattery(w, teams, () => cells, {
    title,
    derived: [{ label: 'core c1/c0', num: 2, den: 0 }],
  });
}

// ---------------------------------------------------------------------------
// Roster completion — deterministic team construction over the unused roster.
//
// Methodology (owner 2026-07-14): realistic shapes only — every team at least
// B1 + B2 + 2x B3; keep the logical pairs together (mint+prika, emma+eunhwa
// duo, nayuta+velvet); B3 cores grouped by element (advantaged element first
// when the battery has a boss); B1/B2 reused round-robin ONLY once their pools
// run dry (11 B1s / 16 B2s cannot stretch over a 67-unit roster without
// repeats).
// ---------------------------------------------------------------------------
const STICKY_B2_PAIRS: [string, string][] = [
  ['mint', 'prika'],
  ['nayuta', 'velvet'],
];

// strongest-first pick order (owner methodology); everything else follows
// alphabetically after these.
const B1_PRIORITY = ['little-mermaid', 'anis-star', 'moran', 'miranda', 'tove', 'rouge'];
const B2_PRIORITY = ['mast-romantic-maid', 'mint', 'prika', 'crown', 'nayuta', 'velvet', 'naga', 'grave', 'takina'];

function orderPool(pool: string[], priority: string[]): string[] {
  return [...pool].sort((a, b) => {
    const pa = priority.indexOf(a), pb = priority.indexOf(b);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    return a.localeCompare(b);
  });
}

export function fillRoster(w: World, anchors: BatteryTeam[], prefElement?: Element): BatteryTeam[] {
  const used = new Set(anchors.flatMap((t) => t.slugs));
  const pool = w.roster.filter((s) => !used.has(s));
  const b1s = orderPool(pool.filter((s) => burstOf(w, s) === 'I'), B1_PRIORITY);
  const b2s = orderPool(pool.filter((s) => burstOf(w, s) === 'II'), B2_PRIORITY);
  const b3s = pool.filter((s) => burstOf(w, s) === 'III' || burstOf(w, s) === 'Λ');

  // element-grouped B3 queue: advantaged element first, then largest groups
  const groups = new Map<Element, string[]>();
  for (const s of b3s) {
    const e = elementOf(w, s);
    if (!groups.has(e)) groups.set(e, []);
    groups.get(e)!.push(s);
  }
  for (const g of groups.values()) g.sort();
  // prefElement is the battery's BOSS element: a B3 of element E is advantaged
  // when BEATS[E] === boss, so those groups lead.
  const groupOrder = [...groups.keys()].sort((a, b) => {
    const aAdv = prefElement !== undefined && BEATS[a] === prefElement ? 0 : 1;
    const bAdv = prefElement !== undefined && BEATS[b] === prefElement ? 0 : 1;
    if (aAdv !== bAdv) return aAdv - bAdv;
    const diff = groups.get(b)!.length - groups.get(a)!.length;
    return diff !== 0 ? diff : a.localeCompare(b);
  });
  const b3Queue = groupOrder.flatMap((e) => groups.get(e)!);

  // round-robin reuse queues over the FULL roster (used only when pools dry)
  const allB1 = orderPool(w.roster.filter((s) => burstOf(w, s) === 'I'), B1_PRIORITY);
  const allB2 = orderPool(w.roster.filter((s) => burstOf(w, s) === 'II'), B2_PRIORITY);
  let reuse1 = 0, reuse2 = 0;
  const takeB1 = () => b1s.length ? b1s.shift()! : allB1[reuse1++ % allB1.length];
  const takeB2 = () => b2s.length ? b2s.shift()! : allB2[reuse2++ % allB2.length];

  const teams: BatteryTeam[] = [];
  let n = 0;

  // emma+eunhwa duo is a B1+B2 pair — build their team first if both unused
  const hasEmma = b1s.includes('emma-tactical-upgrade');
  const hasEunhwa = b2s.includes('eunhwa-tactical-upgrade');
  const takePair = (arr: string[], s: string) => arr.splice(arr.indexOf(s), 1)[0];

  while (b3Queue.length || b1s.length || b2s.length) {
    let b1: string, b2a: string, b2b: string | undefined;
    if (hasEmma && hasEunhwa && b1s.includes('emma-tactical-upgrade')) {
      b1 = takePair(b1s, 'emma-tactical-upgrade');
      b2a = takePair(b2s, 'eunhwa-tactical-upgrade');
    } else {
      b1 = takeB1();
      // sticky B2 pairs ride together as a 2-B2 team when both remain
      const pair = STICKY_B2_PAIRS.find(([x, y]) => b2s.includes(x) && b2s.includes(y));
      if (pair && b3Queue.length >= 2) {
        b2a = takePair(b2s, pair[0]);
        b2b = takePair(b2s, pair[1]);
      } else {
        b2a = takeB2();
      }
    }
    const nB3 = b2b ? 2 : 3;
    const core = b3Queue.splice(0, nB3);
    while (core.length < 2) core.push(b3Queue.shift() ?? takeB2()); // degenerate tail; autoWire will flag
    // slot order: B1, B2, B3 core... (middle slot = a B3, the default camera)
    const slugs = b2b ? [b1, b2a, core[0], core[1], b2b] : [b1, b2a, ...core];
    // drain: if only 1-2 B2s remain with no B3s left, append them to the last team? no — keep 5-unit teams
    n++;
    teams.push({ name: `fill ${n}`, slugs: slugs.slice(0, 5), source: 'roster fill (methodology-built)' });
    if (!b3Queue.length && !b1s.length && !b2s.length) break;
    // leftover B2/B1-only tail: build a final support team padded with reused B3s?
    if (!b3Queue.length && (b1s.length || b2s.length)) {
      const rest = [...b1s.splice(0), ...b2s.splice(0)];
      // pad to 5 with the strongest already-used B3s (repeats, flagged in the report)
      const padB3 = w.roster.filter((s) => (burstOf(w, s) === 'III')).slice(0, 5);
      while (rest.length < 5) rest.push(padB3[rest.length % padB3.length]);
      // order: B1 first if present, keep a B3 in the middle when we have one
      n++;
      teams.push({ name: `fill ${n}`, slugs: rest.slice(0, 5), source: 'roster fill (support drain, padded with repeats)' });
      break;
    }
  }
  return teams;
}
