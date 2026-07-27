// Compare the simulated burst-generation ranking board with a naive ranking built
// only from the synergy API `rl3` column in characters.json (% gauge generated in
// the first ~3s, base/unfocused). Writes the comparison to an md file for
// investigation.
//
//   npx tsx scripts/rl3-burstgen-compare.ts [--out <path>]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DataFile, LevelMultiplier, Element } from '../src/types.js';
import { loadOverride } from '../src/skills/overrides-node.js';
import type { OverrideFile } from '../src/skills/index.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
} from '../src/prepare.js';
import {
  rankBurstGen,
  BURSTGEN_PROFILES,
  type RanksCtx,
} from '../src/ranks/burstgen.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../data/characters.json');
const mult = load<LevelMultiplier>('../data/level-multiplier.json');
const cubes = load<CubesFile>('../data/cubes.json');
const olLines = load<OlLinesFile>('../data/ol-lines.json');
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
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

const population: string[] = [];
for (const [slug, c] of Object.entries(data.characters)) {
  if (!c.simSupported) {
    continue;
  }
  population.push(slug);
}

const simRanked = rankBurstGen(population, ctx);
const simRankBySlug = new Map(simRanked.map((r) => [r.slug, r.rank]));
const simGaugeBySlug = new Map(simRanked.map((r) => [r.slug, r.gaugeTotal]));

const rl3Ranked = [...population]
  .map((slug) => {
    const c = data.characters[slug];
    return {
      slug,
      rl3: c.rl3 ?? 0,
      name: c.name,
      weapon: c.weapon,
      burst: c.burst,
      element: c.element as Element,
    };
  })
  .sort((a, b) => b.rl3 - a.rl3);

const rl3RankBySlug = new Map(rl3Ranked.map((r, i) => [r.slug, i + 1]));

const divergences = population
  .map((slug) => {
    const simRank = simRankBySlug.get(slug)!;
    const rl3Rank = rl3RankBySlug.get(slug)!;
    const simGauge = simGaugeBySlug.get(slug)!;
    const c = data.characters[slug];
    return {
      slug,
      name: c.name,
      weapon: c.weapon,
      burst: c.burst,
      rl3: c.rl3 ?? 0,
      rl3Rank,
      simRank,
      rankDelta: rl3Rank - simRank, // positive = rl3 ranks them lower than sim
      simGauge,
    };
  })
  .filter((r) => Math.abs(r.rankDelta) >= 10)
  .sort((a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta));

const topSim = simRanked.slice(0, 30);
const topRl3 = rl3Ranked.slice(0, 30);

const outArg = process.argv.indexOf('--out');
const out =
  outArg >= 0
    ? process.argv[outArg + 1]
    : new URL('../docs/rl3-burstgen-rank-comparison.md', import.meta.url)
        .pathname;
mkdirSync(dirname(out), { recursive: true });

const lines: string[] = [];
lines.push(`# Burst-gen ranking: simulated vs. raw \`rl3\` column`);
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push(
  'The simulated board (`src/ranks/burstgen.ts`) runs each sim-supported unit solo ' +
    'for 180s with bursts disabled and the camera focused on the unit (charge weapons ×2.5). ' +
    'Kit gauge effects, skill-generation procs, and team-ammo-scaling profiles are included.'
);
lines.push('');
lines.push(
  'The `rl3` column in `data/characters.json` is the synergy API gauge generated in the ' +
    'first ~3 seconds of an arena opener, at **base** (non-boss) values and **unfocused**. ' +
    'It is a raw, short-window, no-kit snapshot of weapon generation.'
);
lines.push('');
lines.push(
  'This file ranks sim-supported units by `rl3` alone and lists the largest rank ' +
    'divergences against the simulated board. Big jumps usually mean kit gauge effects, ' +
    'focus/charge scaling, or the 180s window matter more than the raw 3s opener.'
);
lines.push('');

lines.push('## Top 30 by simulated burst-gen board');
lines.push('');
lines.push('| rank | slug | name | weapon | burst | profile | bars/180s |');
lines.push('|---:|---|---|---|---|---:|---|');
for (const r of topSim) {
  const c = data.characters[r.slug];
  lines.push(
    `| ${r.rank} | ${r.slug} | ${c.name} | ${c.weapon} | ${c.burst} | ${
      r.profile ?? ''
    } | ${r.barsPerFight.toFixed(1)} |`
  );
}
lines.push('');

lines.push('## Top 30 by raw `rl3` (3-second opener, base/unfocused)');
lines.push('');
lines.push(
  '| rank | slug | name | weapon | burst | rl3 | sim rank | sim bars/180s |'
);
lines.push('|---:|---|---|---|---:|---:|---:|---:|');
for (let i = 0; i < topRl3.length; i++) {
  const r = topRl3[i];
  const simRank = simRankBySlug.get(r.slug)!;
  const simGauge = simGaugeBySlug.get(r.slug)!;
  lines.push(
    `| ${i + 1} | ${r.slug} | ${r.name} | ${r.weapon} | ${r.burst} | ${
      r.rl3
    } | ${simRank} | ${(simGauge / 100).toFixed(1)} |`
  );
}
lines.push('');

lines.push('## Full raw `rl3` ranking (all sim-supported units)');
lines.push('');
lines.push(
  '| rank | slug | name | weapon | burst | rl3 | sim rank | sim bars/180s |'
);
lines.push('|---:|---|---|---|---:|---:|---:|---:|');
for (let i = 0; i < rl3Ranked.length; i++) {
  const r = rl3Ranked[i];
  const simRank = simRankBySlug.get(r.slug)!;
  const simGauge = simGaugeBySlug.get(r.slug)!;
  lines.push(
    `| ${i + 1} | ${r.slug} | ${r.name} | ${r.weapon} | ${r.burst} | ${
      r.rl3
    } | ${simRank} | ${(simGauge / 100).toFixed(1)} |`
  );
}
lines.push('');
lines.push('## Largest rank divergences (|Δrank| ≥ 10)');
lines.push('');
lines.push(
  '| rl3 rank | slug | name | weapon | burst | sim rank | Δrank | rl3 | sim bars/180s | notes |'
);
lines.push('|---:|---|---|---|---:|---:|---:|---:|---:|---|');
for (const r of divergences) {
  const notes: string[] = [];
  if (BURSTGEN_PROFILES[r.slug]) {
    notes.push(
      `profiled: ${BURSTGEN_PROFILES[r.slug].partners.length} MG partner(s)`
    );
  }
  if (r.rl3 === 0) {
    notes.push('rl3 null/zero');
  }
  const noteStr = notes.join('; ') || '';
  lines.push(
    `| ${r.rl3Rank} | ${r.slug} | ${r.name} | ${r.weapon} | ${r.burst} | ${
      r.rl3Rank
    } | ${r.simRank} | ${r.rankDelta > 0 ? '+' : ''}${r.rankDelta} | ${
      r.rl3
    } | ${(r.simGauge / 100).toFixed(1)} | ${noteStr} |`
  );
}
lines.push('');

lines.push('## Summary stats');
lines.push('');
lines.push(`- Sim-supported units: ${population.length}`);
lines.push(`- Units with |Δrank| ≥ 10: ${divergences.length}`);
lines.push(
  `- rl3-over-performers (rl3 rank much better than sim rank, Δ ≤ -10): ${
    divergences.filter((d) => d.rankDelta < -10).length
  } units`
);
lines.push(
  `- sim-over-performers (sim rank much better than rl3 rank, Δ ≥ +10): ${
    divergences.filter((d) => d.rankDelta > 10).length
  } units`
);
lines.push('');

writeFileSync(out, lines.join('\n'));
process.stderr.write(
  `rl3-burstgen-compare: ${population.length} units → ${divergences.length} divergences → ${out}\n`
);
