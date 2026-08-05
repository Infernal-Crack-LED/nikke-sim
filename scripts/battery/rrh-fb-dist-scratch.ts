// Scratch diagnostic (2026-08-04): seeded FB distributions for the disabled / unpinned
// measured-FB comps under the new refill default (no post-FB chain-open block).
// Mirrors scripts/regression.ts's run() exactly (scopeLockCfg + same prepare). Read-only.
import { readFileSync } from 'node:fs';
import type { DataFile, LevelMultiplier, Element } from '../../src/types.js';
import {
  runSim,
  MC_SEED_BASE,
  DEFAULT_MC_SEEDS,
} from '../../src/engine/sim.js';
import { loadOverride } from '../../src/skills/overrides-node.js';
import { scopeLockCfg } from '../lib/scope-lock.js';
import {
  prepareTeam,
  type CubesFile,
  type OlLinesFile,
  type SkillLevelData,
  type UnitOptions,
} from '../../src/prepare.js';

const data: DataFile = JSON.parse(
  readFileSync(new URL('../../data/characters.json', import.meta.url), 'utf8')
);
const mult: LevelMultiplier = JSON.parse(
  readFileSync(
    new URL('../../data/level-multiplier.json', import.meta.url),
    'utf8'
  )
);
const cubes: CubesFile = JSON.parse(
  readFileSync(new URL('../../data/cubes.json', import.meta.url), 'utf8')
);
const olLines: OlLinesFile = JSON.parse(
  readFileSync(new URL('../../data/ol-lines.json', import.meta.url), 'utf8')
);
let skillLevels: SkillLevelData = {};
try {
  skillLevels = JSON.parse(
    readFileSync(
      new URL('../../data/skill-levels.json', import.meta.url),
      'utf8'
    )
  );
} catch {
  /* optional */
}

interface Comp {
  name: string;
  slugs: string[];
  boss: Element | null;
  focus?: string;
  modes?: Record<string, string>;
  real?: string;
}

const COMPS: Comp[] = [
  {
    name: 'PH water B3s [FB unpinned]',
    slugs: [
      'little-mermaid',
      'crown',
      'quency-escape-queen',
      'dorothy-serendipity',
      'guillotine-winter-slayer',
    ],
    boss: 'Fire',
    real: '12 (was sim 13 — over-count)',
  },
  {
    name: 'iron sweep (run G) [disabled]',
    slugs: [
      'd-killer-wife',
      'takina',
      'milk-blooming-bunny',
      'maxwell',
      'liberalio',
    ],
    boss: 'Electric',
    real: '13-14 (was sim 11)',
  },
  {
    name: 'T5 wind-weak [disabled]',
    slugs: [
      'nayuta',
      'cinderella-crystal-wave',
      'anis-star',
      'liberalio',
      'velvet',
    ],
    boss: 'Iron',
    real: '13 (was sim 11-12)',
  },
  {
    name: 'T1 wind-weak [disabled]',
    slugs: [
      'mast-romantic-maid',
      'scarlet-black-shadow',
      'anis-star',
      'liberalio',
      'crown',
    ],
    boss: 'Iron',
    real: '13 (was sim 11-12)',
  },
  {
    name: 'N3 scarlet/liberalio iron [disabled]',
    slugs: [
      'rouge',
      'trina',
      'scarlet-black-shadow',
      'liberalio',
      'soda-twinkling-bunny',
    ],
    boss: 'Iron',
    focus: 'scarlet-black-shadow',
    real: '10 (was sim 9)',
  },
  {
    name: 'T4 [unpinned]',
    slugs: ['anis-star', 'privaty', 'snow-white-heavy-arms', 'helm', 'crown'],
    boss: 'Fire',
    real: '14 (was sim 13)',
  },
  {
    name: 'PH water B3s [FB unpinned]',
    slugs: [
      'little-mermaid',
      'crown',
      'quency-escape-queen',
      'dorothy-serendipity',
      'guillotine-winter-slayer',
    ],
    boss: 'Fire',
    real: '12 (was sim 13 — OVER-count)',
  },
  {
    name: 'N1 rapi/quency wind [unpinned]',
    slugs: [
      'd-killer-wife',
      'grave',
      'rapi-red-hood',
      'quency-escape-queen',
      'jill',
    ],
    boss: 'Wind',
    focus: 'rapi-red-hood',
    real: '13 (was sim 12)',
  },
  {
    name: 'soda-tb control [unpinned]',
    slugs: ['little-mermaid', 'crown', 'soda-twinkling-bunny', 'helm'],
    boss: null,
    focus: 'soda-twinkling-bunny',
    real: '10 (was sim 9)',
  },
];

function run(comp: Comp, seed?: number) {
  const chars = comp.slugs.map((s) => data.characters[s]);
  const unitOpts: UnitOptions[] = comp.slugs.map((slug) => ({
    doll: false,
    ol: 'base5',
    mode: comp.modes?.[slug],
  }));
  const overrides: Record<string, ReturnType<typeof loadOverride>> = {};
  for (const s of comp.slugs) {
    overrides[s] = loadOverride(s);
  }
  const cfg = scopeLockCfg(comp.slugs, comp.boss, {
    focusSlug: comp.focus,
    seed,
  });
  const prepared = prepareTeam(chars, unitOpts, {
    overrides,
    skillLevels,
    cubes,
    olLines,
  });
  return runSim(chars, mult, cfg, prepared);
}

for (const comp of COMPS) {
  const counts = new Map<number, number>();
  for (let i = 0; i < DEFAULT_MC_SEEDS; i++) {
    const fb = run(comp, MC_SEED_BASE + i).fullBursts;
    counts.set(fb, (counts.get(fb) ?? 0) + 1);
  }
  const dist = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([v, n]) => `${v}x${n}`)
    .join(' ');
  console.log(`${comp.name}: ${dist}   real=${comp.real}`);
}
