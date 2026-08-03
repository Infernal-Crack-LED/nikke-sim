// Score the GREEDY overload optimizer against the EXHAUSTIVE free-line ranking, on
// one basis, per unit — the instrument behind the "greedy local optimum" row of
// docs/handoffs/2026-08-02-character-landing-pages-plan.md's consistency table.
//
//   npx tsx scripts/ol-search-compare.ts [--tier <n>] [--only <slug>] [--json <path>]
//
// WHY IT EXISTS. Two searches pick a unit's four free overload lines (the lines
// beyond the 4× Elemental DMG + 4× ATK floor):
//
//   greedy      src/bestol.ts        — add the best single line, four times over
//   exhaustive  src/olconfigs.ts     — score every size-4 multiset of the pool
//
// `data/ol-optimal.json` ships the greedy pick; `data/unit-pages.json` ships the
// exhaustive table. They disagree on many units, and a bare label mismatch does not
// say whether the disagreement COSTS anything — greedy could be losing 0.01% or 5%.
// This script measures the cost: for every unit it reports the greedy pick's own
// gain, the exhaustive best's gain, and the gap between them.
//
// BASIS. `bestOl` has no tier parameter — it always tries lines at `line.max`, which
// is exactly tier 15 in data/ol-tiers.json. So `--tier 15` (the default here) holds
// tier constant and isolates the SEARCH; any disagreement it reports is a genuine
// greedy local optimum, not a basis artifact. `--tier 11` instead answers "what does
// ol-optimal.json's max-roll pick cost at the T11 the web actually applies it at",
// which folds the tier question back in.
//
// Both searches run in the same Solo isolation cell as scripts/build-ol-optimal.ts
// and scripts/build-unit-pages.ts, and every damage number here is produced by the
// exhaustive side's own evaluator (lines → prepareTeam → runSim), including the one
// for the greedy pick, so the two are compared on one scale.
//
// Findings-only: reads artifacts, writes nothing but its report.
import { readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import type {
  CharacterData,
  DataFile,
  LevelMultiplier,
  Element,
} from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { OverrideFile } from '../src/skills/index.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
  LineSelection,
} from '../src/prepare.js';
import { prepareTeam } from '../src/prepare.js';
import { runSim } from '../src/engine/sim.js';
import { bestOl } from '../src/bestol.js';
import { rankFreeLineConfigs, OL_FLOOR } from '../src/olconfigs.js';
import {
  assembleTeam,
  FLOOR_SEED_COUNTS,
  type Cell,
} from '../src/dpschart/matrix.js';
import { NOOP_CHARACTERS } from '../src/dpschart/noop.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
const olTiers = load<{ tiers: Array<Record<string, number>> }>(
  '../data/ol-tiers.json'
);
// the shipped greedy artifact, so the report can also say whether it is STALE —
// i.e. whether bestOl still produces today what data/ol-optimal.json holds.
const shipped = load<{
  units: Record<string, Array<{ type: string; count: number }>>;
}>('../data/ol-optimal.json');
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../data/skill-levels.json');
} catch {
  /* optional */
}

const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };

const arg = (flag: string): string | null => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};

// 15 = max roll = the tier bestOl implicitly optimizes at (see BASIS above).
const TIER = Number(arg('--tier') ?? 15);
const tierValues = olTiers.tiers.find((t) => t.tier === TIER);
if (!tierValues) {
  throw new Error(`data/ol-tiers.json has no tier ${TIER}`);
}
const only = arg('--only');
const jsonOut = arg('--json');

const SOLO_CELL: Cell = {
  framework: 'solo',
  eleadv: 'eleweak',
  core: 'c100',
  invest: '12of12',
};

const charFor = (slug: string) =>
  (data.characters as Record<string, unknown>)[slug] ??
  (NOOP_CHARACTERS as Record<string, unknown>)[slug];

const eligible = Object.entries(data.characters).filter(
  ([slug, c]) =>
    c.generatorSupported && c.simSupported && (only == null || slug === only)
);

// canonical label for a multiset of line types, so greedy and exhaustive picks
// compare as strings regardless of order
const LABEL: Record<string, string> = {
  ammo: 'Max Ammo',
  critrate: 'Crit Rate',
  critdmg: 'Crit DMG',
  chargespd: 'Charge Speed',
  chargedmg: 'Charge DMG',
  hitrate: 'Hit Rate',
  elem: 'Elem DMG',
  atk: 'ATK',
  def: 'DEF',
};
const comboLabel = (counts: Record<string, number>): string =>
  Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t, n]) => `${n}× ${LABEL[t] ?? t}`)
    .join(' + ') || '(none)';

interface Row {
  slug: string;
  weapon: string;
  greedyLabel: string;
  greedyGainPct: number;
  greedyLineCount: number;
  bestLabel: string;
  shippedLabel: string; // what data/ol-optimal.json actually ships today
  bestGainPct: number;
  gapPct: number; // percentage points of gain left on the table
  gapRelPct: number; // gap as a % of the exhaustive winner's damage
  greedyRank: number | null; // 1-based rank in the exhaustive table (null = combo not in the pool)
}

const rows: Row[] = [];
let done = 0;

for (const [slug, c] of eligible) {
  const tested = { slug, element: c.element as Element };
  const team = assembleTeam(SOLO_CELL, tested);
  const chars = team.slugs.map(charFor) as (CharacterData & {
    baseStats: unknown;
  })[];

  // --- exhaustive: full ranking (topN large enough to hold the whole pool) ---
  const { baselineDamage, results } = rankFreeLineConfigs({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chars: chars as any,
    mult,
    cfg: team.cfg,
    deps,
    baseOpts: team.unitOpts,
    carryIdx: team.testedIndex,
    topN: 1000,
    tierValues,
  });

  // --- greedy: bestOl, exactly as build-ol-optimal.ts runs it (max roll) ---
  const prepared = prepareTeam(chars, team.unitOpts, deps);
  const greedy = bestOl(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chars as any,
    mult,
    team.cfg,
    prepared,
    team.testedIndex,
    olLines,
    4,
    FLOOR_SEED_COUNTS
  );
  const greedyCounts: Record<string, number> = {};
  for (const p of greedy.picks) {
    greedyCounts[p.type] = (greedyCounts[p.type] ?? 0) + 1;
  }

  // Re-evaluate the greedy pick through the EXHAUSTIVE evaluator so both gains sit
  // on one scale (bestOl injects extraStats directly; rankFreeLineConfigs goes
  // through prepareTeam's line path, and this basis may be a different tier).
  const greedyFree: LineSelection[] = Object.entries(greedyCounts).map(
    ([type, count]) => ({ type, count, value: tierValues[type] })
  );
  const floorAtTier: LineSelection[] = OL_FLOOR.map((l) => ({
    ...l,
    value: tierValues[l.type],
  }));
  const greedyOpts = team.unitOpts.map((o, i) =>
    i === team.testedIndex
      ? { ...o, lines: [...floorAtTier, ...greedyFree] }
      : o
  );
  const greedyDamage = runSim(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chars as any,
    mult,
    team.cfg,
    prepareTeam(chars, greedyOpts, deps)
  ).units[team.testedIndex].totalDamage;
  const greedyGainPct = baselineDamage
    ? ((greedyDamage - baselineDamage) / baselineDamage) * 100
    : 0;

  // Both sides are re-labelled through THIS file's comboLabel: src/olconfigs.ts's
  // own label sorts by count alone, so two spellings of the same multiset
  // ("1× Crit DMG + 1× Crit Rate" vs "1× Crit Rate + 1× Crit DMG") would read as a
  // disagreement when the pick is identical. Nine units hit exactly that.
  const labelOf = (lines: LineSelection[]): string => {
    const rc: Record<string, number> = {};
    for (const l of lines) {
      rc[l.type] = l.count;
    }
    return comboLabel(rc);
  };
  const greedyLabel = comboLabel(greedyCounts);
  const best = results[0];
  const bestLabel = labelOf(best.lines);
  const rankIdx = results.findIndex((r) => labelOf(r.lines) === greedyLabel);

  // --only <slug> also prints the DIAGNOSIS: the full exhaustive table plus greedy's
  // own first-step marginal gains. Where greedy loses badly the two disagree in a
  // characteristic way — every single line looks worthless on its own (threshold
  // stats like Charge Speed, which buys nothing until it crosses a frame boundary;
  // convex ones like Hit Rate, whose core-rate curve compounds) while a stack of
  // three or four of them wins outright. That is the shape greedy cannot see.
  if (only) {
    process.stdout.write(`\nexhaustive ranking — ${slug} @ tier ${TIER}\n`);
    for (const [i, r] of results.slice(0, 10).entries()) {
      process.stdout.write(
        `  ${String(i + 1).padStart(2)}. ${r.gainPct.toFixed(2).padStart(6)}%  ${labelOf(r.lines)}\n`
      );
    }
    process.stdout.write(`\ngreedy first-step marginal gain, per line type:\n`);
    for (const rj of greedy.rejected) {
      process.stdout.write(
        `  ${rj.gainPct.toFixed(2).padStart(6)}%  ${rj.name}\n`
      );
    }
    process.stdout.write('\n');
  }

  rows.push({
    slug,
    weapon: String((c as { weapon?: string }).weapon ?? '?'),
    greedyLabel,
    greedyGainPct,
    greedyLineCount: greedy.picks.length,
    bestLabel,
    shippedLabel: comboLabel(
      Object.fromEntries(
        (shipped.units[slug] ?? []).map((l) => [l.type, l.count])
      )
    ),
    bestGainPct: best.gainPct,
    gapPct: best.gainPct - greedyGainPct,
    gapRelPct: best.damage
      ? ((best.damage - greedyDamage) / best.damage) * 100
      : 0,
    greedyRank: rankIdx >= 0 ? rankIdx + 1 : null,
  });

  done++;
  if (done % 20 === 0) {
    process.stderr.write(`  …${done}/${eligible.length}\n`);
  }
}

const disagree = rows.filter((r) => r.greedyLabel !== r.bestLabel);
disagree.sort((a, b) => b.gapRelPct - a.gapRelPct);

const f = (n: number, d = 2) => n.toFixed(d).padStart(6);
process.stdout.write(
  `\nOL search comparison — greedy (src/bestol.ts) vs exhaustive (src/olconfigs.ts)\n` +
    `basis: Solo cell, 12/12, tier ${TIER}${TIER === 15 ? ' (max roll — bestOl’s own basis, so this isolates the SEARCH)' : ''}\n` +
    `units: ${rows.length}   agree: ${rows.length - disagree.length}   disagree: ${disagree.length}\n\n`
);
process.stdout.write(
  `${'slug'.padEnd(28)} ${'wpn'.padEnd(4)} ${'gap%'.padStart(6)} ${'greedy%'.padStart(7)} ${'best%'.padStart(7)} rank  greedy pick  →  exhaustive best\n`
);
for (const r of disagree) {
  process.stdout.write(
    `${r.slug.padEnd(28)} ${r.weapon.padEnd(4)} ${f(r.gapRelPct)} ${f(r.greedyGainPct)}  ${f(r.bestGainPct)}  ${String(r.greedyRank ?? '—').padStart(3)}  ${r.greedyLabel}  →  ${r.bestLabel}\n`
  );
}

const gaps = disagree.map((r) => r.gapRelPct);
if (gaps.length) {
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  process.stdout.write(
    `\ndamage left on the table by greedy (% of the exhaustive winner):\n` +
      `  max ${sorted[sorted.length - 1].toFixed(2)}%   median ${median.toFixed(2)}%   min ${sorted[0].toFixed(2)}%\n` +
      `  ≥1%: ${gaps.filter((g) => g >= 1).length}   ≥0.1%: ${gaps.filter((g) => g >= 0.1).length}   <0.1%: ${gaps.filter((g) => g < 0.1).length}\n`
  );
}
const stale = rows.filter((r) => r.shippedLabel !== r.greedyLabel);
process.stdout.write(
  `\ndata/ol-optimal.json vs a live bestOl run: ${rows.length - stale.length}/${rows.length} match` +
    (stale.length
      ? ` — ${stale.length} STALE (artifact predates a kit/override/engine change):\n` +
        stale
          .map(
            (r) =>
              `  ${r.slug.padEnd(28)} shipped ${r.shippedLabel}  |  live ${r.greedyLabel}\n`
          )
          .join('')
      : '\n')
);

const shortGreedy = rows.filter((r) => r.greedyLineCount < 4);
if (shortGreedy.length) {
  process.stdout.write(
    `\ngreedy stopped early (<4 lines — the 0.05% marginal-gain break in bestOl):\n  ` +
      shortGreedy.map((r) => `${r.slug} (${r.greedyLineCount})`).join(', ') +
      `\n`
  );
}

if (jsonOut) {
  writeFileSync(jsonOut, `${JSON.stringify({ tier: TIER, rows }, null, 2)}\n`);
  process.stderr.write(`\nwrote ${jsonOut}\n`);
}
