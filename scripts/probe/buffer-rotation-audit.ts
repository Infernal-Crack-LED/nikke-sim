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
//                   weapon generating less gauge over the fight), or it is an
//                   ENABLER being measured against the control enabler it
//                   displaces and is simply the weaker of the two. Both are
//                   real and both are expected — long-cooldown units appear
//                   here routinely and are not alarms.
//
// The criterion is the ISOLATION property, not the sign of the gap: forcing a
// unit's cooldown down to the no-op's 20s must not change its Full Burst count.
// That is what the closing check tests, and what
// scripts/tests/ranks/buffer.test.ts pins.
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
  bufferPopulation,
  suppliesTeamCdr,
  EXCLUDED_BUFFER_SLUGS,
} from '../../src/ranks/buffer.js';
import { OFF_BOARD_BUFFER_SLUGS } from '../../src/ranks/buffer-rows.js';
import { NOOP_CHARACTERS } from '../../src/dpschart/noop.js';
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
// mirror build-bufferchart.ts: the synthetic controls carry framework effects
for (const slug of Object.keys(NOOP_CHARACTERS)) {
  overrides[slug] = loadOverride(slug);
}
const deps: PrepareDeps = { overrides, skillLevels, cubes, olLines };
const ctx: RanksCtx = { characters: data.characters as any, mult, deps };

const cdOf = (slug: string): number =>
  overrides[slug]?.charFixes?.burstCooldownSec ??
  (data.characters as any)[slug]?.burstCooldownSec ??
  40;

// the board's own population — the same function the builder calls, not a copy
// of it, so this audit can never describe a board that does not ship
const population = bufferPopulation(data.characters as any, tags);

// --cdr: who is the team's burst-cooldown enabler, and is there exactly one?
//
// Every team fields exactly one (owner ruling 2026-08-03): the tested unit when
// it is an ally-facing CDR carrier, the no-op B1 otherwise. Self-only reduction
// does not qualify — of the units this board actually ranks, mint, prika and
// tia carry `burstCdr` for themselves only. This mode lists the classification
// so a mis-scan is visible; the four ladder enablers (liter, volume, dolla,
// helm-aquamarine) bury theirs inside an `escalating` effect's `steps`, which
// is exactly the shape a shallow scan drops, and a `formation: 'noB1'` block is
// inert on a board whose every row seats a B1.
if (process.argv.includes('--cdr')) {
  // mirror the board: a tested B3's burst slot is suppressed, so CDR living
  // there cannot make it the enabler
  const isB3 = (slug: string) =>
    (data.characters as any)[slug]?.burst !== 'I' &&
    (data.characters as any)[slug]?.burst !== 'II';
  const enablers = population.filter((slug) =>
    suppliesTeamCdr(overrides[slug], isB3(slug))
  );
  const selfOnly = population.filter(
    (slug) =>
      !suppliesTeamCdr(overrides[slug], isB3(slug)) &&
      JSON.stringify(overrides[slug] ?? {}).includes('burstCdr')
  );
  process.stdout.write(
    `TESTED UNIT IS THE ENABLER (no-op B1 stands down) — ${enablers.length}\n  ` +
      enablers.join(', ') +
      `\n\nCARRIES burstCdr BUT DOES NOT QUALIFY — self-only, or gated on a formation\nthis board never fields (no-op B1 keeps the role) — ${selfOnly.length}\n  ` +
      selfOnly.join(', ') +
      `\n\nevery other unit on the board runs with the no-op B1 as its enabler\n`
  );
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
  if (EXCLUDED_BUFFER_SLUGS.size === 0) {
    process.stdout.write(
      'no units are currently excluded on the negative-value criterion — ' +
        'EXCLUDED_BUFFER_SLUGS is empty, so every simSupported buffer enters ' +
        'the board population except the by-name OFF_BOARD_BUFFER_SLUGS ' +
        `(${[...OFF_BOARD_BUFFER_SLUGS].sort().join(', ')}), which are held off ` +
        'by owner direction and not by any number this mode could check ' +
        '(src/ranks/buffer.ts, src/ranks/buffer-rows.ts). Nothing to check.\n'
    );
    process.exit(0);
  }
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

// Which shortfalls actually matter? Not "landed below baseline with a long
// cooldown" — that fires on cases the design intends. An ENABLER is measured
// against the control enabler it displaces, so reading below it just means the
// unit is the weaker enabler (sakura, soline-frost-ticket), and a unit can land
// below for gauge reasons at ANY cooldown (rosanna reads the same 40s or 20s).
// The real signal is the property the shape guarantees and the test pins:
// forcing the cooldown down to the no-op's 20s must not change the count.
const shortfalls = rows.filter((r) => {
  if (r.stage === 'B3' || r.cd <= 20) {
    return false;
  }
  // prepare.ts prefers charFixes.burstCooldownSec over the character field, so
  // rewriting the character alone would leave such a unit at its real cooldown
  // and quietly compare a run against itself. No override uses charFixes today.
  const short = { ...(data.characters as any) };
  short[r.slug] = { ...short[r.slug], burstCooldownSec: 20 };
  const own = overrides[r.slug];
  const forcedOverrides = own?.charFixes?.burstCooldownSec
    ? {
        ...overrides,
        [r.slug]: {
          ...own,
          charFixes: { ...own.charFixes, burstCooldownSec: 20 },
        },
      }
    : overrides;
  const forced = bufferValueFor(
    r.slug,
    'generic',
    {
      ...ctx,
      characters: short,
      deps: { ...deps, overrides: forcedOverrides },
    },
    new Map(),
    null
  );
  return forced.fullBursts !== r.fb;
});
process.stdout.write(
  shortfalls.length
    ? `\n✗ ${shortfalls.length} unit(s) gain Full Bursts when their cooldown is forced to 20s — the spare no-op is not covering the stage: ${shortfalls.map((r) => r.slug).join(', ')}\n`
    : "\n✓ no unit's Full Burst count depends on its own burst cooldown\n"
);
