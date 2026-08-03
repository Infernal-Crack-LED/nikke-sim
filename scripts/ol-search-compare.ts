// Score an overload PICK TABLE against the exhaustive optimum, per unit, on one basis.
//
//   npx tsx scripts/ol-search-compare.ts [--tier <n>] [--only <slug>] [--shipped <path>] [--json <path>]
//
// WHY IT EXISTS. `data/ol-optimal.json` ships one line multiset per unit. This answers the
// only question that matters about it — is it the BEST multiset, and if not, what does the
// difference cost? — by scoring the shipped pick and every candidate through the same
// evaluator (lines → prepareTeam → runSim), in the same Solo 12/12 cell as
// scripts/build-ol-optimal.ts and scripts/build-unit-pages.ts.
//
// `--shipped <path>` points at another copy of the artifact, which is how a regeneration is
// A/B'd against its predecessor: compare the "shipped picks APPLIED at tier N" summary
// across the two runs. `--only <slug>` prints the full ranking plus the per-line marginal
// gains, which is what shows WHY a pick is wrong rather than just that it is.
//
// HISTORY. This began as a greedy-vs-exhaustive comparison. It measured the greedy search
// (the former src/bestol.ts) leaving a mean 1.35% / max 31.19% of achievable gain unclaimed
// at T11 across 73 units — the evidence behind the owner's 2026-08-03 ruling to use the
// exhaustive ranking everywhere. Greedy no longer exists, so that arm went with it; its
// numbers live in docs/DECISIONS.md and in the commit that removed it.
//
// Findings-only: reads artifacts, writes nothing but its report.
import { readFileSync, writeFileSync } from 'node:fs';
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
import { rankFreeLineConfigs, OL_FLOOR } from '../src/olconfigs.js';
import { assembleTeam, OL_TIER, type Cell } from '../src/dpschart/matrix.js';
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

const arg = (flag: string): string | null => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};

// Defaults to the project tier (src/dpschart/matrix.ts OL_TIER) — the tier every consumer
// both optimizes and applies at. `--tier` is for basis A/Bs only.
const TIER = Number(arg('--tier') ?? OL_TIER);
const tierValues = olTiers.tiers.find((t) => t.tier === TIER);
if (!tierValues) {
  throw new Error(`data/ol-tiers.json has no tier ${TIER}`);
}
const only = arg('--only');
const jsonOut = arg('--json');

const shippedPath = arg('--shipped');
const shipped = JSON.parse(
  readFileSync(
    shippedPath ?? new URL('../data/ol-optimal.json', import.meta.url),
    'utf8'
  )
) as { units: Record<string, Array<{ type: string; count: number }>> };

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

// Canonical label for a multiset, so two spellings of the same pick compare equal.
// src/olconfigs.ts's own label sorts by count alone, which makes "1× Crit DMG + 1× Crit
// Rate" and "1× Crit Rate + 1× Crit DMG" read as a disagreement when the pick is identical.
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
  shippedLabel: string;
  shippedGainPct: number; // the shipped pick's gain when APPLIED at this tier
  shippedGapRelPct: number; // what it leaves on the table vs the exhaustive winner
  shippedRank: number | null; // 1-based rank in the exhaustive table
  bestLabel: string;
  bestGainPct: number;
}

const rows: Row[] = [];
let done = 0;

for (const [slug, c] of eligible) {
  const tested = { slug, element: c.element as Element };
  const team = assembleTeam(SOLO_CELL, tested);
  const chars = team.slugs.map(charFor) as (CharacterData & {
    baseStats: unknown;
  })[];

  // the full ranking (topN large enough to hold the whole pool: 15, 35 or 70 combos)
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

  const floorAtTier: LineSelection[] = OL_FLOOR.map((l) => ({
    ...l,
    value: tierValues[l.type],
  }));
  /** Score an arbitrary pick on this basis, so it sits on the ranking's own scale. */
  const scorePick = (
    counts: Record<string, number>
  ): { damage: number; gainPct: number } => {
    const free: LineSelection[] = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count, value: tierValues[type] }));
    const opts = team.unitOpts.map((o, i) =>
      i === team.testedIndex ? { ...o, lines: [...floorAtTier, ...free] } : o
    );
    const damage = runSim(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chars as any,
      mult,
      team.cfg,
      prepareTeam(chars, opts, deps)
    ).units[team.testedIndex].totalDamage;
    return {
      damage,
      gainPct: baselineDamage
        ? ((damage - baselineDamage) / baselineDamage) * 100
        : 0,
    };
  };

  const labelOf = (lines: LineSelection[]): string => {
    const rc: Record<string, number> = {};
    for (const l of lines) {
      rc[l.type] = l.count;
    }
    return comboLabel(rc);
  };

  const shippedCounts: Record<string, number> = Object.fromEntries(
    (shipped.units[slug] ?? []).map((l) => [l.type, l.count])
  );
  const shippedScore = scorePick(shippedCounts);
  const shippedLabel = comboLabel(shippedCounts);
  const best = results[0];
  const rankIdx = results.findIndex((r) => labelOf(r.lines) === shippedLabel);

  if (only) {
    process.stdout.write(`\nexhaustive ranking — ${slug} @ tier ${TIER}\n`);
    for (const [i, r] of results.slice(0, 10).entries()) {
      process.stdout.write(
        `  ${String(i + 1).padStart(2)}. ${r.gainPct.toFixed(2).padStart(6)}%  ${labelOf(r.lines)}\n`
      );
    }
    // The per-line marginal gains are what make a bad pick legible: where a stat is a
    // THRESHOLD (Charge Speed, which buys nothing until it crosses a frame boundary) or
    // CONVEX (Hit Rate's core-rate curve), one line looks worthless while three or four
    // win outright — the shape any one-line-at-a-time search is blind to.
    process.stdout.write(`\nsingle-line gain, per candidate type:\n`);
    for (const type of Object.keys(tierValues).filter((k) => k !== 'tier')) {
      const one = scorePick({ [type]: 1 });
      process.stdout.write(
        `  ${one.gainPct.toFixed(2).padStart(6)}%  ${LABEL[type] ?? type}\n`
      );
    }
    process.stdout.write('\n');
  }

  rows.push({
    slug,
    weapon: String((c as { weapon?: string }).weapon ?? '?'),
    shippedLabel,
    shippedGainPct: shippedScore.gainPct,
    shippedGapRelPct: best.damage
      ? ((best.damage - shippedScore.damage) / best.damage) * 100
      : 0,
    shippedRank: rankIdx >= 0 ? rankIdx + 1 : null,
    bestLabel: labelOf(best.lines),
    bestGainPct: best.gainPct,
  });

  done++;
  if (done % 20 === 0) {
    process.stderr.write(`  …${done}/${eligible.length}\n`);
  }
}

const suboptimal = rows.filter((r) => r.shippedGapRelPct >= 0.005);
suboptimal.sort((a, b) => b.shippedGapRelPct - a.shippedGapRelPct);

const f = (n: number, d = 2) => n.toFixed(d).padStart(6);
process.stdout.write(
  `\nOL pick table vs the exhaustive optimum (src/olconfigs.ts)\n` +
    `artifact: ${shippedPath ?? 'data/ol-optimal.json'}\n` +
    `basis: Solo cell, 12/12, tier ${TIER}\n` +
    `units: ${rows.length}   optimal: ${rows.length - suboptimal.length}   suboptimal: ${suboptimal.length}\n\n`
);
if (suboptimal.length) {
  process.stdout.write(
    `${'slug'.padEnd(28)} ${'wpn'.padEnd(4)} ${'gap%'.padStart(6)} ${'ship%'.padStart(7)} ${'best%'.padStart(7)} rank  shipped pick  →  exhaustive best\n`
  );
  for (const r of suboptimal) {
    process.stdout.write(
      `${r.slug.padEnd(28)} ${r.weapon.padEnd(4)} ${f(r.shippedGapRelPct)} ${f(r.shippedGainPct)}  ${f(r.bestGainPct)}  ${String(r.shippedRank ?? '—').padStart(3)}  ${r.shippedLabel}  →  ${r.bestLabel}\n`
    );
  }
}

const gaps = rows.map((r) => r.shippedGapRelPct).sort((a, b) => a - b);
process.stdout.write(
  `\ndamage left on the table (% of the exhaustive winner):\n` +
    `  mean ${(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2)}%   ` +
    `median ${gaps[Math.floor(gaps.length / 2)].toFixed(2)}%   ` +
    `max ${gaps[gaps.length - 1].toFixed(2)}%\n`
);

if (jsonOut) {
  writeFileSync(jsonOut, `${JSON.stringify({ tier: TIER, rows }, null, 2)}\n`);
  process.stderr.write(`\nwrote ${jsonOut}\n`);
}
