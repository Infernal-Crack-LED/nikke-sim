// Buffer board: does any tested unit cost its team Full Bursts?
//
// The board runs the standard team with the tested unit in the spare slot and
// compares it against the same team with a no-op of the tested unit's own
// stage in that slot (src/ranks/buffer.ts assemble). Both sides therefore
// field the same stage distribution, and a long burst cooldown no longer holds
// up the chain — the spare no-op covers the stage while the tested unit is
// down. This prints every unit whose Full Burst count differs from its
// baseline's, so the two kinds of difference stay separable:
//
//   ABOVE baseline  the unit's own CDR or gauge speeds the team up — real,
//                   unit-attributable value, and the board should credit it
//   BELOW baseline  the unit is slower than the no-op it replaced (a heavy
//                   weapon generating less gauge over the fight, say). Also
//                   real — but a unit landing below for its COOLDOWN would be
//                   the framework bug this shape removed, so anything here
//                   with a >20s cooldown wants investigating.
//
// A clean run prints no long-cooldown unit below its baseline; that property is
// also pinned in scripts/tests/ranks/buffer.test.ts.
//
//   npx tsx scripts/probe/buffer-rotation-audit.ts
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier } from '../../src/types.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import type { OverrideFile } from '../../src/skills/index.js';
import type {
  CubesFile,
  OlLinesFile,
  PrepareDeps,
  SkillLevelData,
} from '../../src/prepare.js';
import {
  bufferValueFor,
  EXCLUDED_BUFFER_SLUGS,
} from '../../src/ranks/buffer.js';
import type { RanksCtx } from '../../src/ranks/burstgen.js';

const load = <T>(rel: string): T =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const data = load<DataFile>('../../data/characters.json');
const mult = load<LevelMultiplier>('../../data/level-multiplier.json');
const cubes = load<CubesFile>('../../data/cubes.json');
const olLines = load<OlLinesFile>('../../data/ol-lines.json');
const tags = load<{ tags: Record<string, string[]> }>(
  '../../data/archetype-tags.json'
).tags;
let skillLevels: SkillLevelData = {};
try {
  skillLevels = load<SkillLevelData>('../../data/skill-levels.json');
} catch {
  /* optional */
}
const overrides: Record<string, OverrideFile | undefined> = {};
for (const slug of Object.keys(data.characters)) {
  overrides[slug] = loadOverride(slug);
}
const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

const cdOf = (slug: string): number =>
  overrides[slug]?.charFixes?.burstCooldownSec ??
  (data.characters as any)[slug]?.burstCooldownSec ??
  40;

// the board's own population filter (scripts/build-bufferchart.ts)
const population = Object.entries(data.characters as any)
  .filter(
    ([slug, c]: [string, any]) =>
      !EXCLUDED_BUFFER_SLUGS.has(slug) &&
      c.simSupported &&
      (c.burst === 'I' ||
        c.burst === 'II' ||
        (c.burst === 'III' && (tags[slug] ?? []).includes('buffer')))
  )
  .map(([slug]) => slug)
  .sort();

// --noop-cdr: what the no-op B1's 7s team burst-cooldown reduction is worth.
//
// scripts/build-bufferchart.ts loads overrides for roster slugs only, and the
// synthetic controls are not roster entries, so THIS BOARD HAS NEVER APPLIED
// that CDR — `src/skills/overrides/noop-b1-ar.json` is simply never read. Its
// siblings do load it (build-burstgen.ts:48, build-b1b2dps.ts:56, and
// build-sustain.ts:46 for the B3), added 2026-07-27, the day after the buffer
// board was written and never backported here. This mode reports each unit's
// value as shipped versus with the control loaded, so the cost of closing that
// gap is visible before anyone closes it.
if (process.argv.includes('--noop-cdr')) {
  const withCdr = { ...overrides, 'noop-b1-ar': loadOverride('noop-b1-ar') };
  const ctxWith: RanksCtx = {
    ...ctx,
    deps: { ...deps, overrides: withCdr },
  };
  const hasOwnCdr = (slug: string): boolean =>
    JSON.stringify(overrides[slug] ?? {}).includes('"burstCdr"');
  process.stdout.write(
    'the no-op B1 team CDR is NOT loaded by build-bufferchart.ts; ' +
      'this is what loading it would cost\n\n' +
      `${'unit'.padEnd(26)} ownCDR   ${'shipped'.padStart(8)}      ${'with 7s'.padStart(8)}       change\n`
  );
  for (const slug of population) {
    const a = bufferValueFor(slug, 'generic', ctx, new Map(), null);
    const b = bufferValueFor(slug, 'generic', ctxWith, new Map(), null);
    if (Math.abs(a.valuePct - b.valuePct) < 0.05) {
      continue;
    }
    process.stdout.write(
      `${slug.padEnd(26)} ${hasOwnCdr(slug) ? 'yes' : ' - '}     ` +
        `${a.valuePct.toFixed(2).padStart(7)}% (FB ${a.fullBursts}v${a.baselineFullBursts})  ` +
        `${b.valuePct.toFixed(2).padStart(7)}% (FB ${b.fullBursts}v${b.baselineFullBursts})  ` +
        `${(b.valuePct - a.valuePct >= 0 ? '+' : '') + (b.valuePct - a.valuePct).toFixed(2)}\n`
    );
  }
  process.exit(0);
}

// --excluded: is each EXCLUDED_BUFFER_SLUGS entry still earning its exclusion?
//
// The exclusion exists for kits whose net effect is to REDUCE team damage in
// the standard comp, since those produce a misleadingly negative % increase
// (src/ranks/buffer.ts, scripts/build-bufferchart.ts). That rationale is a
// claim about a number, and the number moves whenever the board's comp shape
// changes — so print it. A positive value here means the stated rationale no
// longer describes the unit and the exclusion wants an owner call; it is NOT
// on its own a reason to lift the exclusion.
if (process.argv.includes('--excluded')) {
  process.stdout.write(
    `${'unit'.padEnd(26)} ${'value'.padStart(8)}   FB v base   rationale still holds?\n`
  );
  for (const slug of [...EXCLUDED_BUFFER_SLUGS].sort()) {
    const r = bufferValueFor(slug, 'generic', ctx, new Map(), null);
    process.stdout.write(
      `${slug.padEnd(26)} ${r.valuePct.toFixed(2).padStart(7)}%   ` +
        `${r.fullBursts} v ${r.baselineFullBursts}       ` +
        `${r.valuePct < 0 ? 'yes (negative)' : 'NO — value is positive'}\n`
    );
  }
  process.exit(0);
}

const rows = population.map((slug) => {
  const r = bufferValueFor(slug, 'generic', ctx, new Map(), null);
  const c = (data.characters as any)[slug];
  return {
    slug,
    stage: c.burst === 'I' ? 'B1' : c.burst === 'II' ? 'B2' : 'B3',
    cd: cdOf(slug),
    fb: r.fullBursts,
    base: r.baselineFullBursts,
    value: r.valuePct,
  };
});

const off = rows
  .filter((r) => r.fb !== r.base)
  .sort((a, b) => a.fb - a.base - (b.fb - b.base));
process.stdout.write(
  `${rows.length} units on the generic board; ${rows.length - off.length} match their baseline's Full Burst count exactly\n\n`
);
for (const r of off) {
  const delta = r.fb - r.base;
  process.stdout.write(
    `  ${r.slug.padEnd(26)} ${r.stage} cd=${String(r.cd).padEnd(3)} ` +
      `FB ${r.fb} vs ${r.base}  ${delta > 0 ? `+${delta} ABOVE` : `${delta} BELOW`}   ${r.value.toFixed(1)}%\n`
  );
}

// A tested B3 never bursts (it sits rightmost so the carries win stage 3), so
// its cooldown cannot hold anything up and it is not what this shape protects —
// the check is on the B1/B2 units whose stage the spare no-op covers.
const shortfalls = off.filter(
  (r) => r.fb < r.base && r.cd > 20 && r.stage !== 'B3'
);
process.stdout.write(
  shortfalls.length
    ? `\n✗ ${shortfalls.length} unit(s) with a >20s cooldown land BELOW their baseline — the spare no-op is not covering the stage: ${shortfalls.map((r) => r.slug).join(', ')}\n`
    : '\n✓ no unit with a cooldown longer than 20s lands below its baseline\n'
);
